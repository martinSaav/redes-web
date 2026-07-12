import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}
interface Hop {
  from: string;
  to: string;
  text: string;
  color?: string;
}
interface BStep {
  hops: Hop[];
  static?: boolean;
  msg: string;
  learn?: 'as2' | 'as3';
  choose?: boolean;
  block?: boolean;
  path?: boolean;
}

const P: Record<string, Pos> = {
  src: { x: 7, y: 50 },
  r1a: { x: 22, y: 27 },
  r1b: { x: 22, y: 73 },
  as2: { x: 54, y: 17 },
  as3: { x: 54, y: 83 },
  as4: { x: 89, y: 50 },
};

interface Link {
  a: string;
  b: string;
  label: string;
  kind: 'peer' | 'cust' | 'igp';
}
const LINKS: Link[] = [
  { a: 'src', b: 'r1a', label: 'IGP 10', kind: 'igp' },
  { a: 'src', b: 'r1b', label: 'IGP 4', kind: 'igp' },
  { a: 'r1a', b: 'as2', label: 'peer =', kind: 'peer' },
  { a: 'r1b', b: 'as3', label: 'peer =', kind: 'peer' },
  { a: 'as2', b: 'as3', label: 'peer =', kind: 'peer' },
  { a: 'as2', b: 'as4', label: '$ cliente', kind: 'cust' },
  { a: 'as3', b: 'as4', label: '$ cliente', kind: 'cust' },
];

const PATH_LINKS: [string, string][] = [
  ['src', 'r1b'],
  ['r1b', 'as3'],
  ['as3', 'as4'],
];

const STEPS: BStep[] = [
  {
    hops: [],
    static: true,
    msg: 'Escenario: <strong>AS4</strong> posee el prefijo <strong>138.16.0.0/16</strong>. Relaciones comerciales: AS4 es <strong>cliente</strong> ($) de AS2 y de AS3; AS1–AS2, AS1–AS3 y AS2–AS3 son <strong>peers</strong> (=). Queremos: ¿por dónde saca AS1 un paquete hacia 138.16.x.x?',
  },
  {
    hops: [
      { from: 'as4', to: 'as2', text: '138.16/16', color: '#7ee787' },
      { from: 'as4', to: 'as3', text: '138.16/16', color: '#7ee787' },
    ],
    msg: 'AS4 <strong>anuncia su prefijo a sus proveedores</strong> AS2 y AS3. Regla base: siempre le contás a tu proveedor las redes que sabés alcanzar (empezando por las tuyas).',
  },
  {
    hops: [{ from: 'as2', to: 'r1a', text: 'AS-PATH: AS2 AS4', color: '#80d8ff' }],
    learn: 'as2',
    msg: 'AS2 aprendió la ruta de un <strong>CLIENTE</strong> (AS4). Regla de oro Gao-Rexford: las rutas de cliente se anuncian a <strong>TODOS</strong> (peers y proveedores) — mandar tráfico hacia un cliente <strong>da plata</strong>. Así AS2 se la anuncia a su peer AS1 (entra por el router 1a). AS-PATH = <code>AS2 AS4</code>.',
  },
  {
    hops: [{ from: 'as3', to: 'r1b', text: 'AS-PATH: AS3 AS4', color: '#80d8ff' }],
    learn: 'as3',
    msg: 'Lo mismo hace AS3: anuncia la ruta de su cliente AS4 a su peer AS1 (entra por 1b). Ahora <strong>AS1 tiene DOS rutas</strong> al mismo prefijo: vía AS2 (por 1a) y vía AS3 (por 1b). AS-PATH = <code>AS3 AS4</code>.',
  },
  {
    hops: [],
    static: true,
    block: true,
    msg: 'El “agujero” comercial: AS2 <strong>NO</strong> le reanuncia a AS1 las rutas que aprende de su <strong>peer</strong> AS3 (ni al revés). Las rutas de peer/proveedor se anuncian <strong>solo a clientes</strong>. Por eso el camino físico AS1→AS2→AS3→AS4 <strong>existe pero comercialmente no</strong>: nadie hace tránsito gratis para un peer.',
  },
  {
    hops: [],
    static: true,
    msg: 'AS1 desempata. Ambas rutas tienen <strong>AS-PATH de largo 2</strong> (empate) y misma preferencia local. Entonces entra la <strong>papa caliente (hot-potato)</strong>: elegir el punto de salida (egress) de <strong>menor costo intradominio (IGP)</strong>. Costos: hacia 1a = <strong>10</strong>, hacia 1b = <strong>4</strong>.',
  },
  {
    hops: [{ from: 'src', to: 'r1b', text: '📦 → 138.16.x.x', color: '#ffd54f' }],
    choose: true,
    path: true,
    msg: 'Gana el egress <strong>1b (IGP 4)</strong>. “Papa caliente”: <strong>sacá el paquete de MI red lo antes posible</strong>, aunque más allá de AS1 el camino total termine siendo más largo. El paquete sale por AS3 → AS4. La decisión mira el <em>costo propio</em>, no el global.',
  },
];

interface RouteRow {
  via: string;
  path: string;
  egress: string;
  igp: number;
}
const ROUTES: RouteRow[] = [
  { via: 'AS2', path: 'AS2 AS4', egress: '1a', igp: 10 },
  { via: 'AS3', path: 'AS3 AS4', egress: '1b', igp: 4 },
];

@Component({
  selector: 'app-bgp-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🌐 BGP: reglas comerciales + la papa caliente (hot-potato)</div>
          <div class="caption">Por qué el camino físico corto a veces “no existe”, y cómo AS1 elige su salida.</div>
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
          <div class="as1box"><span>AS1 · nuestro AS</span></div>

          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            @for (l of links; track l.a + l.b) {
              <line
                [attr.x1]="px(l.a)" [attr.y1]="py(l.a)"
                [attr.x2]="px(l.b)" [attr.y2]="py(l.b)"
                [class]="l.kind" [class.hot]="isPath(l)" />
            }
          </svg>

          @for (l of links; track 'lb' + l.a + l.b) {
            <div class="llabel" [class]="l.kind" [class.hot]="isPath(l)"
                 [style.left.%]="midX(l)" [style.top.%]="midY(l)">{{ l.label }}</div>
          }

          @if (showBlock()) {
            <div class="block" [style.left.%]="(P['as2'].x + P['as3'].x)/2" [style.top.%]="(P['as2'].y + P['as3'].y)/2">✖ no se anuncia a peers</div>
          }

          <div class="node host" [class.active]="active('src')" [style.left.%]="P['src'].x" [style.top.%]="P['src'].y">
            <strong>💻 host</strong><small>en AS1</small>
          </div>
          <div class="node rtr" [class.chosen]="chosen('r1b')" [class.active]="active('r1a')" [style.left.%]="P['r1a'].x" [style.top.%]="P['r1a'].y">
            <strong>1a</strong>
          </div>
          <div class="node rtr" [class.chosen]="chosen('r1b')" [class.active]="active('r1b')" [style.left.%]="P['r1b'].x" [style.top.%]="P['r1b'].y">
            <strong>1b</strong>
          </div>
          <div class="node as" [class.active]="active('as2')" [style.left.%]="P['as2'].x" [style.top.%]="P['as2'].y">
            <strong>☁ AS2</strong><small>peer de AS1</small>
          </div>
          <div class="node as" [class.active]="active('as3')" [style.left.%]="P['as3'].x" [style.top.%]="P['as3'].y">
            <strong>☁ AS3</strong><small>peer de AS1</small>
          </div>
          <div class="node as dst" [class.active]="active('as4')" [style.left.%]="P['as4'].x" [style.top.%]="P['as4'].y">
            <strong>☁ AS4</strong><small>138.16.0.0/16</small>
          </div>

          @for (c of cards(); track $index) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 12px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">Rutas de AS1 → 138.16/16</div>
            <div class="rrow th"><span>vía</span><span>AS-PATH</span><span>egress</span><span>IGP</span><span></span></div>
            @for (r of routeRows(); track r.via) {
              <div class="rrow" [class.win]="r.chosen">
                <span class="rv">{{ r.via }}</span>
                <span class="rp">{{ r.path }}</span>
                <span class="re">{{ r.egress }}</span>
                <span class="ri" [class.lo]="r.chosen">{{ r.igp }}</span>
                <span class="rk">{{ r.chosen ? '✔' : '' }}</span>
              </div>
            }
            @if (routeRows().length === 0) {
              <div class="empty">(todavía sin rutas aprendidas)</div>
            }
          </div>

          <div class="rules">
            <div class="rhead">🧭 Gao-Rexford (en 2 líneas)</div>
            <div class="rline"><b class="g">ruta de CLIENTE</b> → anunciar a <b>todos</b> ($$$)</div>
            <div class="rline"><b class="o">ruta de PEER/PROVEEDOR</b> → anunciar <b>solo a clientes</b></div>
            <div class="rline dim">Preferencia: cliente &gt; peer &gt; proveedor → AS-PATH corto → <b>hot-potato</b> (IGP mínimo)</div>
          </div>
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
      position: relative; flex: 1; min-height: 330px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .as1box {
      position: absolute; left: 1.5%; top: 11%; width: 29%; height: 78%;
      border: 1.5px dashed #4a5878; border-radius: 14px; background: rgba(74,88,120,0.08);
    }
    .as1box span { position: absolute; top: 4px; left: 8px; font-size: 0.6rem; color: #8b95b5; font-weight: 700; }

    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke-width: 0.6; vector-effect: non-scaling-stroke; transition: stroke 0.3s, stroke-width 0.3s; }
    .wires line.peer { stroke: #6b7695; stroke-dasharray: 2 1.5; }
    .wires line.cust { stroke: #43a047; }
    .wires line.igp { stroke: #4a5878; }
    .wires line.hot { stroke: #ffd54f; stroke-width: 1.8; stroke-dasharray: none; }

    .llabel {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      font-size: 0.58rem; font-weight: 700; padding: 0 5px; border-radius: 6px;
      background: #171e2e; border: 1px solid #2d3750; white-space: nowrap;
    }
    .llabel.peer { color: #9aa4bf; } .llabel.cust { color: #7ee787; } .llabel.igp { color: #79c0ff; }
    .llabel.hot { color: #ffd54f; border-color: #d29922; }

    .block {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      font-size: 0.6rem; font-weight: 800; color: #ef9a9a;
      background: rgba(45,20,20,0.95); border: 1px solid #b23b3b; border-radius: 8px; padding: 2px 7px; white-space: nowrap;
    }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 58px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.58rem; color: rgba(255,255,255,0.85); font-family: Consolas, monospace; }
    .node.host { background: #2e7d32; }
    .node.rtr { background: #546e7a; border-radius: 50%; min-width: 40px; height: 40px; justify-content: center; padding: 0; }
    .node.as { background: #3949ab; }
    .node.as.dst { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.35); }
    .node.chosen { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 5;
      background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 4px 8px; font-family: Consolas, monospace; font-size: 0.64rem; color: #e6e9f0; white-space: nowrap;
    }

    .side { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.82rem; margin-bottom: 8px; color: #ffd54f; }
    .rrow { display: grid; grid-template-columns: 0.6fr 1.1fr 0.6fr 0.5fr 0.3fr; gap: 3px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .rrow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .rrow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .rrow.win { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.3); background: #2b2a1a; }
    .rv { color: #ce93d8; font-weight: 700; } .rp { color: #80d8ff; } .re { color: #cfe3ff; text-align: center; }
    .ri { color: #79c0ff; text-align: center; } .ri.lo { color: #7ee787; font-weight: 800; } .rk { color: #7ee787; font-weight: 900; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.72rem; padding: 6px; }

    .rules { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .rhead { font-weight: 700; font-size: 0.78rem; color: #7ee787; margin-bottom: 6px; }
    .rline { font-size: 0.68rem; color: var(--text); line-height: 1.5; margin-bottom: 3px; }
    .rline.dim { color: #8b95b5; margin-top: 5px; border-top: 1px solid #232b3e; padding-top: 5px; }
    .rline b.g { color: #7ee787; } .rline b.o { color: #ffb74d; }

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
export class BgpDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly links = LINKS;
  readonly P = P;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 450 : 1200;
  }
  protected override stepDwell(): number {
    return 3200;
  }

  px(id: string): number {
    return P[id].x;
  }
  py(id: string): number {
    return P[id].y;
  }
  midX(l: Link): number {
    return (P[l.a].x + P[l.b].x) / 2;
  }
  midY(l: Link): number {
    return (P[l.a].y + P[l.b].y) / 2;
  }

  isPath(l: Link): boolean {
    const i = this.index();
    if (i < 0) return false;
    const on = this.finished() || STEPS[i].path;
    if (!on) return false;
    return PATH_LINKS.some(([a, b]) => (a === l.a && b === l.b) || (a === l.b && b === l.a));
  }

  showBlock(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].block;
  }

  chosen(id: string): boolean {
    const i = this.index();
    if (i < 0) return false;
    const on = this.finished() || STEPS[i].choose;
    return !!on && id === 'r1b';
  }

  readonly cards = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { x: number; y: number; text: string; color: string }[];
    const p = this.ease(this.progress());
    return STEPS[i].hops.map((h) => ({
      text: h.text,
      color: h.color ?? '#ffd54f',
      x: P[h.from].x + (P[h.to].x - P[h.from].x) * p,
      y: P[h.from].y + (P[h.to].y - P[h.from].y) * p,
    }));
  });

  readonly routeRows = computed(() => {
    const i = this.index();
    if (i < 0) return [] as (RouteRow & { chosen: boolean })[];
    const fin = this.finished();
    const p = this.progress();
    const learned = new Set<string>();
    const upto = fin ? STEPS.length - 1 : i;
    for (let s = 0; s <= upto; s++) {
      const l = STEPS[s].learn;
      if (!l) continue;
      const reached = fin || s < i || (s === i && p >= 1);
      if (reached) learned.add(l === 'as2' ? 'AS2' : 'AS3');
    }
    const choosing = fin || (!!STEPS[i].choose && p >= 1);
    return ROUTES.filter((r) => learned.has(r.via)).map((r) => ({
      ...r,
      chosen: choosing && r.via === 'AS3',
    }));
  });

  active(id: string): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return STEPS[i].hops.some((h) => h.from === id || h.to === id);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>El paquete sale por 1b</strong> (hot-potato, IGP 4). Dos ideas que caen SIEMPRE en el oral: (1) BGP no busca el camino más corto sino el que las <strong>políticas comerciales</strong> permiten — por eso el enlace AS2–AS3 “existe” pero no transporta tráfico de AS1; (2) ante empate, <strong>papa caliente</strong>: cada AS se saca el paquete de encima por su salida más barata (IGP), lo que puede dar rutas globalmente asimétricas.';
    }
    const i = this.index();
    if (i < 0)
      return 'Presioná ▶ Play: seguí cómo se propaga el prefijo 138.16/16 según quién es cliente/peer, y cómo AS1 elige por dónde salir.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
