import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface GNode {
  id: string;
  x: number;
  y: number;
}
interface GEdge {
  a: string;
  b: string;
  w: number;
}

const NODES: GNode[] = [
  { id: 'u', x: 9, y: 50 },
  { id: 'v', x: 34, y: 15 },
  { id: 'x', x: 34, y: 85 },
  { id: 'w', x: 64, y: 15 },
  { id: 'y', x: 64, y: 85 },
  { id: 'z', x: 92, y: 50 },
];

const EDGES: GEdge[] = [
  { a: 'u', b: 'v', w: 2 },
  { a: 'u', b: 'w', w: 5 },
  { a: 'u', b: 'x', w: 1 },
  { a: 'v', b: 'w', w: 3 },
  { a: 'v', b: 'x', w: 2 },
  { a: 'w', b: 'x', w: 3 },
  { a: 'w', b: 'y', w: 1 },
  { a: 'w', b: 'z', w: 5 },
  { a: 'x', b: 'y', w: 1 },
  { a: 'y', b: 'z', w: 2 },
];

const INF = Infinity;

interface DStep {
  pick: string;
  np: string[];
  dist: Record<string, number>;
  changed: string[];
  tree: [string, string] | null;
  cells: Record<string, string>;
  msg: string;
}

const COLS = ['v', 'w', 'x', 'y', 'z'];

const STEPS: DStep[] = [
  {
    pick: 'u',
    np: ['u'],
    dist: { u: 0, v: 2, w: 5, x: 1, y: INF, z: INF },
    changed: ['v', 'w', 'x'],
    tree: null,
    cells: { v: '2,u', w: '5,u', x: '1,u', y: '∞', z: '∞' },
    msg: 'Inicialización desde el origen <strong>u</strong>: N′ = {u}. Los vecinos directos toman su costo de enlace (D(v)=2, D(w)=5, D(x)=1) y el resto queda en <strong>∞</strong>. p(·) apunta al predecesor en el mejor camino conocido.',
  },
  {
    pick: 'x',
    np: ['u', 'x'],
    dist: { u: 0, v: 2, w: 4, x: 1, y: 2, z: INF },
    changed: ['w', 'y'],
    tree: ['u', 'x'],
    cells: { v: '2,u', w: '4,x', x: '', y: '2,x', z: '∞' },
    msg: 'Se agrega a N′ el nodo NO incluido de <strong>menor D: x (D=1)</strong>. Se “relajan” sus vecinos: D(w)=min(5, 1+3)=<strong>4,x</strong> y D(y)=min(∞, 1+1)=<strong>2,x</strong>. Una vez en N′, el costo de x es <strong>definitivo</strong>.',
  },
  {
    pick: 'y',
    np: ['u', 'x', 'y'],
    dist: { u: 0, v: 2, w: 3, x: 1, y: 2, z: 4 },
    changed: ['w', 'z'],
    tree: ['x', 'y'],
    cells: { v: '2,u', w: '3,y', x: '', y: '', z: '4,y' },
    msg: 'Menor D fuera de N′: empatan v(2) e y(2) → se toma <strong>y</strong>. Relajación: D(w)=min(4, 2+1)=<strong>3,y</strong> y D(z)=min(∞, 2+2)=<strong>4,y</strong>. Fijate que el mejor camino a w ya NO pasa por x directo, sino por y.',
  },
  {
    pick: 'v',
    np: ['u', 'x', 'y', 'v'],
    dist: { u: 0, v: 2, w: 3, x: 1, y: 2, z: 4 },
    changed: [],
    tree: ['u', 'v'],
    cells: { v: '', w: '3,y', x: '', y: '', z: '4,y' },
    msg: 'Entra <strong>v (D=2)</strong>. Se intenta relajar w vía v: min(3, 2+3=5) → sigue 3. <strong>Ningún cambio</strong>: v no mejora ningún camino. Su predecesor definitivo es u.',
  },
  {
    pick: 'w',
    np: ['u', 'x', 'y', 'v', 'w'],
    dist: { u: 0, v: 2, w: 3, x: 1, y: 2, z: 4 },
    changed: [],
    tree: ['y', 'w'],
    cells: { v: '', w: '', x: '', y: '', z: '4,y' },
    msg: 'Entra <strong>w (D=3)</strong>, con predecesor y. Se intenta relajar z: min(4, 3+5=8) → sigue 4. Sin cambios. Solo queda z afuera.',
  },
  {
    pick: 'z',
    np: ['u', 'x', 'y', 'v', 'w', 'z'],
    dist: { u: 0, v: 2, w: 3, x: 1, y: 2, z: 4 },
    changed: [],
    tree: ['y', 'z'],
    cells: { v: '', w: '', x: '', y: '', z: '' },
    msg: 'Último: entra <strong>z (D=4)</strong>. N′ ya contiene <strong>todos</strong> los nodos → el algoritmo termina. Los D(·) son los costos de camino mínimo definitivos.',
  },
];

const FWD = [
  { dst: 'v', path: 'u → v', hop: 'v', cost: 2 },
  { dst: 'w', path: 'u → x → y → w', hop: 'x', cost: 3 },
  { dst: 'x', path: 'u → x', hop: 'x', cost: 1 },
  { dst: 'y', path: 'u → x → y', hop: 'x', cost: 2 },
  { dst: 'z', path: 'u → x → y → z', hop: 'x', cost: 4 },
];

@Component({
  selector: 'app-dijkstra-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🗺 Dijkstra (Link-State): el árbol de caminos mínimos desde u</div>
          <div class="caption">Cada iteración mete a N′ el nodo de menor D y relaja a sus vecinos. Mirá la tabla crecer →</div>
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
        <div class="canvas">
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            @for (e of edges; track e.a + e.b) {
              <line
                [attr.x1]="nx(e.a)" [attr.y1]="ny(e.a)"
                [attr.x2]="nx(e.b)" [attr.y2]="ny(e.b)"
                [class.tree]="isTree(e)" />
            }
          </svg>

          @for (e of edges; track 'l' + e.a + e.b) {
            <div class="wlabel" [class.on]="isTree(e)" [style.left.%]="midX(e)" [style.top.%]="midY(e)">{{ e.w }}</div>
          }

          @for (n of nodes; track n.id) {
            <div class="gnode"
                 [class.src]="n.id === 'u'"
                 [class.inn]="inN(n.id) && n.id !== 'u'"
                 [class.pick]="isPick(n.id)"
                 [style.left.%]="n.x" [style.top.%]="n.y">
              <span class="nid">{{ n.id }}</span>
              <span class="nd" [class.inf]="distOf(n.id) === '∞'">{{ distOf(n.id) }}</span>
            </div>
          }
        </div>

        <div class="side">
          <div class="tblwrap">
            <div class="thead">Tabla de Dijkstra · D(·),p(·)</div>
            <div class="trow th">
              <span>Paso</span><span>N′</span>
              @for (c of cols; track c) { <span class="cn">{{ c }}</span> }
            </div>
            @for (r of rows(); track $index; let i = $index) {
              <div class="trow" [class.now]="i === index() && !finished()">
                <span class="pn">{{ i }}</span>
                <span class="np">{{ npStr(r.np) }}</span>
                @for (c of cols; track c) {
                  <span class="cell" [class.chg]="i === index() && r.changed.includes(c)" [class.blank]="r.cells[c] === ''">{{ r.cells[c] || '·' }}</span>
                }
              </div>
            }
          </div>

          @if (finished()) {
            <div class="fwd">
              <div class="thead g">📋 Forwarding table en u (próximo salto)</div>
              <div class="frow fth"><span>destino</span><span>camino mínimo</span><span>salto</span><span>costo</span></div>
              @for (f of fwd; track f.dst) {
                <div class="frow">
                  <span class="fd">{{ f.dst }}</span>
                  <span class="fp">{{ f.path }}</span>
                  <span class="fh">{{ f.hop }}</span>
                  <span class="fc">{{ f.cost }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="legend">
              <span><i class="sw src"></i> origen u</span>
              <span><i class="sw pick"></i> recién agregado</span>
              <span><i class="sw inn"></i> en N′ (definitivo)</span>
              <span><i class="sw tree"></i> arista del árbol</span>
            </div>
          }
        </div>
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps.length }}</span>
        }
        @if (finished()) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="dots">
        @for (st of steps; track $index; let i = $index) {
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
    .canvas {
      position: relative; flex: 1; min-height: 320px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wires line.tree { stroke: #7ee787; stroke-width: 1.6; }
    .wlabel {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      font-size: 0.66rem; font-weight: 700; color: #9aa4bf;
      background: #171e2e; padding: 0 5px; border-radius: 6px; border: 1px solid #2d3750;
    }
    .wlabel.on { color: #7ee787; border-color: #2ea043; }

    .gnode {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      width: 46px; height: 46px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #37455f; border: 2px solid #4a5878; box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      transition: background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.3s;
    }
    .gnode .nid { font-size: 0.95rem; font-weight: 800; color: #fff; line-height: 1; }
    .gnode .nd { font-size: 0.62rem; font-family: Consolas, monospace; color: #cfe3ff; line-height: 1.1; margin-top: 1px; }
    .gnode .nd.inf { color: #6b7695; }
    .gnode.src { background: #1565c0; border-color: #4a90e2; }
    .gnode.inn { background: #2e7d32; border-color: #43a047; }
    .gnode.pick { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); transform: translate(-50%, -50%) scale(1.14); }

    .side { width: 328px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tblwrap { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.82rem; margin-bottom: 8px; color: #ffd54f; }
    .thead.g { color: #7ee787; }
    .trow { display: grid; grid-template-columns: 0.5fr 1fr repeat(5, 0.7fr); gap: 2px; font-family: Consolas, monospace; font-size: 0.63rem; padding: 3px 4px; border-radius: 5px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .trow.th .cn { text-align: center; color: #8b95b5; }
    .trow:not(.th) { color: var(--text); }
    .trow.now { background: rgba(31,111,235,0.16); box-shadow: inset 0 0 0 1px #1f6feb55; }
    .pn { color: #5c6a8e; text-align: center; }
    .np { color: #ce93d8; font-weight: 700; }
    .cell { text-align: center; color: #cfe3ff; }
    .cell.blank { color: #333c52; }
    .cell.chg { background: #2b2a1a; color: #ffd54f; font-weight: 800; border-radius: 4px; box-shadow: 0 0 8px rgba(255,213,79,0.3); }

    .fwd { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .frow { display: grid; grid-template-columns: 0.6fr 1.7fr 0.6fr 0.5fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 4px 5px; align-items: center; }
    .frow.fth { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .frow:not(.fth) { background: #1a2132; border: 1px solid #2d3750; border-radius: 6px; margin-bottom: 3px; }
    .fd { color: #ffd54f; font-weight: 700; }
    .fp { color: #cfe3ff; }
    .fh { color: #7ee787; font-weight: 700; text-align: center; }
    .fc { color: #79c0ff; text-align: center; }

    .legend { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 0.68rem; color: var(--text-dim); padding: 4px 2px; }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
    .sw.src { background: #1565c0; } .sw.inn { background: #2e7d32; }
    .sw.pick { background: #37455f; border: 2px solid #ffd54f; }
    .sw.tree { background: #7ee787; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 48px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class DijkstraDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly nodes = NODES;
  readonly edges = EDGES;
  readonly cols = COLS;
  readonly fwd = FWD;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 500;
  }
  protected override stepDwell(): number {
    return 3200;
  }

  readonly rows = computed(() => {
    const i = this.index();
    if (i < 0) return [] as DStep[];
    return STEPS.slice(0, i + 1);
  });

  nx(id: string): number {
    return NODES.find((n) => n.id === id)!.x;
  }
  ny(id: string): number {
    return NODES.find((n) => n.id === id)!.y;
  }
  midX(e: GEdge): number {
    return (this.nx(e.a) + this.nx(e.b)) / 2;
  }
  midY(e: GEdge): number {
    return (this.ny(e.a) + this.ny(e.b)) / 2;
  }

  isTree(e: GEdge): boolean {
    const i = this.index();
    if (i < 0) return false;
    const last = this.finished() ? STEPS.length - 1 : i;
    for (let s = 1; s <= last; s++) {
      const t = STEPS[s].tree;
      if (t && ((t[0] === e.a && t[1] === e.b) || (t[0] === e.b && t[1] === e.a))) return true;
    }
    return false;
  }

  inN(id: string): boolean {
    const i = this.index();
    if (i < 0) return id === 'u' ? false : false;
    return STEPS[i].np.includes(id);
  }

  isPick(id: string): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return STEPS[i].pick === id && id !== 'u';
  }

  distOf(id: string): string {
    const i = this.index();
    if (i < 0) return '';
    const d = STEPS[i].dist[id];
    return d === INF ? '∞' : String(d);
  }

  npStr(np: string[]): string {
    return '{' + np.join(',') + '}';
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Dijkstra terminó.</strong> El árbol verde son los caminos mínimos desde u; siguiendo los p(·) hacia atrás se arma la <strong>forwarding table</strong> (solo importa el PRÓXIMO salto). Complejidad O(n²) — o O(n·log n) con heap. Es <strong>link-state</strong>: cada nodo conoce el mapa COMPLETO (por flooding) y calcula solo.';
    }
    const i = this.index();
    if (i < 0)
      return 'Presioná ▶ Play: arrancamos en el origen u y en cada paso incorporamos el nodo más cercano, actualizando la tabla de la derecha.';
    return STEPS[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
