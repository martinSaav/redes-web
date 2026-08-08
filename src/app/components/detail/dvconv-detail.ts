import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Convergencia de Distance-Vector (Bellman-Ford) — ejemplo clásico de Kurose (Fig. 5.6):
   3 nodos x, y, z. Costos: c(x,y)=2, c(y,z)=1, c(x,z)=7.
   Cada nodo arranca sabiendo solo a sus vecinos y converge intercambiando vectores. */

const NODES = ['x', 'y', 'z'] as const;
type NodeId = (typeof NODES)[number];

const COST: Record<NodeId, Record<NodeId, number>> = {
  x: { x: 0, y: 2, z: 7 },
  y: { x: 2, y: 0, z: 1 },
  z: { x: 7, y: 1, z: 0 },
};

const INF = Infinity;

// tabla de distancias de cada nodo por ronda: Dtable[round][node][dest] = costo
interface RoundState {
  D: Record<NodeId, Record<NodeId, number>>; // estimación de cada nodo hacia cada destino
  changed: Record<NodeId, NodeId[]>; // celdas que cambiaron en esta ronda (para resaltar)
  msg: string;
  send?: NodeId[]; // nodos que "mandan" su vector al terminar la ronda (flechas)
  converged?: boolean;
}

/** calcula la evolución de DV hasta converger */
function computeRounds(): RoundState[] {
  // ronda 0: cada nodo conoce solo el costo directo a sus vecinos
  const init: Record<NodeId, Record<NodeId, number>> = {
    x: { x: 0, y: COST.x.y, z: COST.x.z },
    y: { x: COST.y.x, y: 0, z: COST.y.z },
    z: { x: COST.z.x, y: COST.z.y, z: 0 },
  };
  const rounds: RoundState[] = [
    {
      D: clone(init),
      changed: { x: [], y: [], z: [] },
      msg: 'Ronda 0 — inicialización: cada nodo conoce SOLO el costo directo a sus vecinos. Todo lo demás lo estima con esa info. Ahora cada uno le manda su vector de distancias a sus vecinos.',
      send: ['x', 'y', 'z'],
    },
  ];

  let cur = clone(init);
  let round = 1;
  while (round < 10) {
    const next = clone(cur);
    const changed: Record<NodeId, NodeId[]> = { x: [], y: [], z: [] };
    // Bellman-Ford: Dv(dest) = min sobre vecinos w de [ c(v,w) + Dw(dest) ]
    for (const v of NODES) {
      for (const dest of NODES) {
        if (v === dest) continue;
        let best = INF;
        for (const w of NODES) {
          if (w === v) continue;
          const via = COST[v][w] + cur[w][dest];
          if (via < best) best = via;
        }
        if (best !== cur[v][dest]) {
          next[v][dest] = best;
          changed[v].push(dest);
        }
      }
    }
    const anyChange = NODES.some((v) => changed[v].length > 0);
    if (!anyChange) {
      rounds.push({
        D: clone(cur),
        changed: { x: [], y: [], z: [] },
        send: [],
        converged: true,
        msg:
          '¡CONVERGIÓ! Esta ronda <strong>no cambió NINGUNA celda</strong> → las tablas son estables. Cada D<sub>v</sub>(dest) es ya el <strong>costo de camino mínimo</strong>. Le tomó ' +
          (round - 1) +
          ' ronda(s) de intercambio productiva(s).',
      });
      break;
    }
    const chParts: string[] = [];
    for (const v of NODES) {
      for (const d of changed[v]) {
        chParts.push('D<sub>' + v + '</sub>(' + d + ')=' + fmt(next[v][d]));
      }
    }
    rounds.push({
      D: clone(next),
      changed,
      send: ['x', 'y', 'z'],
      msg:
        'Ronda ' + round + ' — cada nodo aplica <strong>Bellman-Ford</strong> con los vectores que recibió: ' +
        '<code>D<sub>v</sub>(dest) = min<sub>w</sub> [ c(v,w) + D<sub>w</sub>(dest) ]</code>. ' +
        'Cambió: <strong>' + chParts.join(', ') + '</strong>. Vuelven a mandar sus vectores.',
    });
    cur = next;
    round++;
  }
  return rounds;
}

function clone(d: Record<NodeId, Record<NodeId, number>>): Record<NodeId, Record<NodeId, number>> {
  return { x: { ...d.x }, y: { ...d.y }, z: { ...d.z } };
}
function fmt(v: number): string {
  return v === INF ? '∞' : String(v);
}

const ROUNDS = computeRounds();

const POS: Record<NodeId, { x: number; y: number }> = {
  x: { x: 22, y: 30 },
  y: { x: 78, y: 30 },
  z: { x: 50, y: 82 },
};

@Component({
  selector: 'app-dvconv-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🧮 Distance-Vector convergiendo (Bellman-Ford, Fig. 5.6 del Kurose)</div>
          <div class="caption">Cada nodo arranca sabiendo solo a sus vecinos. Mirá las 3 tablas converger ronda a ronda.</div>
        </div>
        <div class="controls">
          <button class="ctl" (click)="prev()" [disabled]="index() < 0">⏮</button>
          <button class="ctl play" (click)="toggle()">
            {{ playing() ? '⏸ Pausa' : finished() ? '↺ Repetir' : '▶ Play' }}
          </button>
          <button class="ctl" (click)="next()" [disabled]="finished()">⏭</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="setSpeed(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </div>

      <div class="board">
        <div class="graph">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <line [attr.x1]="pos.x.x" [attr.y1]="pos.x.y" [attr.x2]="pos.y.x" [attr.y2]="pos.y.y" class="edge" />
            <line [attr.x1]="pos.y.x" [attr.y1]="pos.y.y" [attr.x2]="pos.z.x" [attr.y2]="pos.z.y" class="edge" />
            <line [attr.x1]="pos.x.x" [attr.y1]="pos.x.y" [attr.x2]="pos.z.x" [attr.y2]="pos.z.y" class="edge" />
            <!-- vectores viajando (envío) -->
            @for (b of beams(); track $index) {
              <line [attr.x1]="b.x1" [attr.y1]="b.y1" [attr.x2]="b.dx" [attr.y2]="b.dy" class="beam" />
            }
          </svg>
          <div class="elabel" [style.left.%]="(pos.x.x + pos.y.x)/2" [style.top.%]="(pos.x.y + pos.y.y)/2 - 4">c(x,y)=2</div>
          <div class="elabel" [style.left.%]="(pos.y.x + pos.z.x)/2 + 4" [style.top.%]="(pos.y.y + pos.z.y)/2">c(y,z)=1</div>
          <div class="elabel" [style.left.%]="(pos.x.x + pos.z.x)/2 - 4" [style.top.%]="(pos.x.y + pos.z.y)/2">c(x,z)=7</div>
          @for (n of nodes; track n) {
            <div class="gnode" [class]="'n-' + n" [class.sending]="isSending(n)" [style.left.%]="pos[n].x" [style.top.%]="pos[n].y">{{ n }}</div>
          }
          @for (b of beams(); track 'd' + $index) {
            <div class="vdot" [style.left.%]="b.dx" [style.top.%]="b.dy"></div>
          }
        </div>

        <div class="tables">
          @for (n of nodes; track n) {
            <div class="dtable" [class]="'t-' + n">
              <div class="dthead">tabla de <b>{{ n }}</b> · D<sub>{{ n }}</sub>(·)</div>
              <div class="dtrow th">
                <span class="dest">a →</span>
                @for (d of nodes; track d) { <span class="cell">{{ d }}</span> }
              </div>
              <div class="dtrow">
                <span class="dest">costo</span>
                @for (d of nodes; track d) {
                  <span class="cell" [class.self]="d === n" [class.chg]="isChanged(n, d)">{{ cellVal(n, d) }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div class="legend">
        <span class="lg"><b>1 tabla = 1 router</b> (lo que ese router cree saber)</span>
        <span class="lg"><span class="sw dest-sw">a →</span> destinos · <span class="sw cost-sw">costo</span> costo mínimo estimado</span>
        <span class="lg"><span class="sw zero-sw">0</span> a sí mismo · <span class="sw inf-sw">∞</span> aún no sabe</span>
        <span class="lg"><span class="sw chg-sw">7→3</span> cambió esta ronda · <span class="dot-sw"></span> vector viajando</span>
      </div>

      <div class="status" [class.done]="finished() || cur()?.converged" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ rounds.length }}</span>
        }
        @if (finished() || cur()?.converged) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="dots">
        @for (st of rounds; track $index; let i = $index) {
          <button class="dot" [class.past]="i < index() || finished()" [class.now]="i === index() && !finished()" (click)="jump(i)"></button>
        }
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .graph { position: relative; width: 260px; flex-shrink: 0; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; min-height: 240px; }
    .graph svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .edge { stroke: #4a5878; stroke-width: 0.7; vector-effect: non-scaling-stroke; }
    .beam { stroke: #ffd54f; stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.5; }
    .elabel { position: absolute; transform: translate(-50%,-50%); font-family: Consolas, monospace; font-size: 0.66rem; color: #9aa4bf; background: #171e2e; padding: 0 5px; border-radius: 5px; border: 1px solid #2d3750; white-space: nowrap; }
    .gnode { position: absolute; transform: translate(-50%,-50%); z-index: 3; width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', system-ui, Arial, sans-serif; font-size: 1.4rem; font-style: italic; font-weight: 800; color: #fff; border: 2px solid rgba(255,255,255,0.25); box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: box-shadow 0.3s, border-color 0.3s; }
    .gnode.n-x { background: #2e7d32; } .gnode.n-y { background: #1565c0; } .gnode.n-z { background: #7b1fa2; }
    .gnode.sending { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); }
    .vdot { position: absolute; transform: translate(-50%,-50%); z-index: 4; width: 11px; height: 11px; border-radius: 50%; background: #ffd54f; border: 1.5px solid #171e2e; box-shadow: 0 0 8px rgba(255,213,79,0.8); }

    .tables { flex: 1; display: flex; gap: 10px; flex-wrap: wrap; align-content: flex-start; }
    .dtable { flex: 1; min-width: 150px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .dtable.t-x { border-top: 3px solid #4caf50; } .dtable.t-y { border-top: 3px solid #1565c0; } .dtable.t-z { border-top: 3px solid #7b1fa2; }
    .dthead { font-size: 0.8rem; color: var(--text); margin-bottom: 8px; } .dthead b { color: #fff; }
    .dtrow { display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; gap: 4px; align-items: center; margin-bottom: 4px; }
    .dtrow.th .cell { color: #5c6a8e; font-weight: 700; }
    .dest { font-size: 0.66rem; color: #8b95b5; font-family: Consolas, monospace; }
    .cell { text-align: center; font-family: Consolas, monospace; font-weight: 800; font-size: 0.95rem; color: #cfe3ff; background: #1a2132; border: 1px solid #2d3750; border-radius: 6px; padding: 5px 0; transition: background 0.3s, color 0.3s, box-shadow 0.3s; }
    .cell.self { color: #5c6a8e; background: transparent; border-color: transparent; }
    .cell.chg { background: #2b2a1a; color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.35); }

    .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; padding: 8px 10px; background: #10151f; border: 1px solid var(--border); border-radius: 8px; font-size: 0.72rem; color: var(--text-dim); }
    .lg { display: inline-flex; align-items: center; gap: 5px; } .lg b { color: var(--text); }
    .sw { font-family: Consolas, monospace; font-weight: 800; font-size: 0.72rem; padding: 1px 5px; border-radius: 4px; border: 1px solid #2d3750; }
    .dest-sw { color: #8b95b5; background: transparent; } .cost-sw { color: #cfe3ff; background: #1a2132; }
    .zero-sw { color: #5c6a8e; background: transparent; } .inf-sw { color: #cfe3ff; background: #1a2132; }
    .chg-sw { color: #ffd54f; background: #2b2a1a; border-color: #4a4520; }
    .dot-sw { width: 10px; height: 10px; border-radius: 50%; background: #ffd54f; box-shadow: 0 0 6px rgba(255,213,79,0.8); }
    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) { .board { flex-direction: column; } .graph { width: 100%; } }
  `,
})
export class DvconvDetail extends SteppedAnim implements OnDestroy {
  readonly rounds = ROUNDS;
  readonly nodes = NODES;
  readonly pos = POS;

  protected stepCount(): number {
    return ROUNDS.length;
  }
  protected override stepTravel(): number {
    return 500;
  }
  protected override stepDwell(): number {
    return 4200;
  }

  readonly cur = computed(() => {
    const i = this.index();
    if (i < 0) return null;
    return ROUNDS[Math.min(i, ROUNDS.length - 1)];
  });

  cellVal(n: NodeId, d: NodeId): string {
    const c = this.cur();
    if (!c) return fmt(ROUNDS[0].D[n][d]);
    return fmt(c.D[n][d]);
  }
  isChanged(n: NodeId, d: NodeId): boolean {
    const c = this.cur();
    if (!c || this.finished()) return false;
    return c.changed[n].includes(d);
  }
  isSending(n: NodeId): boolean {
    const c = this.cur();
    if (!c || this.finished()) return false;
    return (c.send ?? []).includes(n) && this.progress() >= 0.5;
  }

  /** vectores viajando entre vecinos al final de la ronda */
  readonly beams = computed(() => {
    const c = this.cur();
    if (!c || this.finished() || !(c.send ?? []).length) return [];
    const p = this.progress();
    if (p < 0.5) return [];
    const t = (p - 0.5) / 0.5;
    const edges: [NodeId, NodeId][] = [['x', 'y'], ['y', 'z'], ['x', 'z']];
    const out: { x1: number; y1: number; dx: number; dy: number }[] = [];
    for (const [a, b] of edges) {
      // vector viaja en ambos sentidos
      out.push({ x1: POS[a].x, y1: POS[a].y, dx: POS[a].x + (POS[b].x - POS[a].x) * t, dy: POS[a].y + (POS[b].y - POS[a].y) * t });
      out.push({ x1: POS[b].x, y1: POS[b].y, dx: POS[b].x + (POS[a].x - POS[b].x) * t, dy: POS[b].y + (POS[a].y - POS[b].y) * t });
    }
    return out;
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      const last = ROUNDS[ROUNDS.length - 1];
      return last.msg + ' <strong>Buenas noticias viajan rápido</strong>; las malas (caída de enlace) pueden gatillar el count-to-infinity — ese caso está en el otro diagrama.';
    }
    const c = this.cur();
    if (!c) return 'Presioná ▶ Play: cada nodo empieza sabiendo solo a sus vecinos, y con Bellman-Ford converge al costo mínimo hacia todos.';
    return c.msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
