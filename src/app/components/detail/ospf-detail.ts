import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

type RId = string;

interface Beam {
  from: RId;
  to: RId;
}
interface FloodStep {
  has: RId[]; // routers que YA tienen el LSA al completar el paso
  beams: Beam[]; // flooding en curso
  msg: string;
  static?: boolean;
}
interface AreaStep {
  hi: string[]; // ids resaltados
  msg: string;
}

/* --- Vista 1: flooding de LSAs sobre una malla de 6 routers --- */
const FPOS: Record<RId, { x: number; y: number }> = {
  A: { x: 15, y: 30 }, B: { x: 50, y: 15 }, C: { x: 85, y: 30 },
  D: { x: 15, y: 78 }, E: { x: 50, y: 88 }, F: { x: 85, y: 78 },
};
const FLINKS: [RId, RId][] = [['A', 'B'], ['B', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'E'], ['E', 'F']];
// costo de cada enlace (para el LSA de cada router)
const FCOST: Record<string, number> = {
  'A-B': 2, 'B-C': 3, 'A-D': 1, 'B-E': 4, 'C-F': 2, 'D-E': 2, 'E-F': 3,
};
function linkCost(a: RId, b: RId): number {
  return FCOST[a + '-' + b] ?? FCOST[b + '-' + a];
}
// LSDB: el LSA de cada router = sus enlaces (vecino:costo). Idéntica en todos tras el flooding.
interface Lsa { r: RId; links: { n: RId; c: number }[]; }
const LSDB: Lsa[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((r) => ({
  r,
  links: FLINKS.filter(([a, b]) => a === r || b === r).map(([a, b]) => {
    const n = a === r ? b : a;
    return { n, c: linkCost(a, b) };
  }),
}));

const FLOOD: FloodStep[] = [
  {
    has: ['A'], beams: [], static: true,
    msg: 'OSPF es <strong>link-state</strong>: cada router describe SUS enlaces (a quién se conecta y con qué costo) en un <strong>LSA</strong> (Link-State Advertisement). El router <strong>A</strong> detecta un cambio y genera su LSA.',
  },
  {
    has: ['A'], beams: [{ from: 'A', to: 'B' }, { from: 'A', to: 'D' }],
    msg: 'A hace <strong>flooding confiable</strong>: manda su LSA a TODOS sus vecinos (B y D). "Confiable" = con reconocimiento, para que ninguno se lo pierda.',
  },
  {
    has: ['A', 'B', 'D'], beams: [{ from: 'B', to: 'C' }, { from: 'B', to: 'E' }, { from: 'D', to: 'E' }],
    msg: 'B y D reciben el LSA (nuevo para ellos) y lo <strong>re-flooden</strong> por todos sus enlaces MENOS por donde vino. El LSA se propaga como una ola por toda el área.',
  },
  {
    has: ['A', 'B', 'C', 'D', 'E'], beams: [{ from: 'C', to: 'F' }, { from: 'E', to: 'F' }],
    msg: 'C y E lo reciben y siguen floodeando. Si un router recibe un LSA que <strong>ya tiene</strong> (por número de secuencia), lo descarta → no hay bucles infinitos.',
  },
  {
    has: ['A', 'B', 'C', 'D', 'E', 'F'], beams: [], static: true,
    msg: '<strong>TODOS los routers del área tienen ahora el mapa COMPLETO</strong> (misma base de datos link-state). Cada uno corre <strong>Dijkstra</strong> localmente sobre ese mapa → su forwarding table. (El Dijkstra paso a paso está en el otro diagrama.)',
  },
];

/* --- Vista 2: jerarquía de áreas --- */
interface ANode {
  id: string;
  x: number;
  y: number;
  kind: 'backbone' | 'internal' | 'abr';
  area: string;
}
const ANODES: ANode[] = [
  { id: 'BB1', x: 40, y: 30, kind: 'backbone', area: '0' },
  { id: 'BB2', x: 60, y: 30, kind: 'backbone', area: '0' },
  { id: 'ABR1', x: 25, y: 55, kind: 'abr', area: '0/1' },
  { id: 'ABR2', x: 75, y: 55, kind: 'abr', area: '0/2' },
  { id: 'R1a', x: 12, y: 82, kind: 'internal', area: '1' },
  { id: 'R1b', x: 33, y: 85, kind: 'internal', area: '1' },
  { id: 'R2a', x: 67, y: 85, kind: 'internal', area: '2' },
  { id: 'R2b', x: 88, y: 82, kind: 'internal', area: '2' },
];
const ALINKS: [string, string][] = [
  ['BB1', 'BB2'], ['BB1', 'ABR1'], ['BB2', 'ABR2'],
  ['ABR1', 'R1a'], ['ABR1', 'R1b'], ['R1a', 'R1b'],
  ['ABR2', 'R2a'], ['ABR2', 'R2b'], ['R2a', 'R2b'],
];
const AREA_STEPS: AreaStep[] = [
  {
    hi: [],
    msg: 'En un AS grande, floodear TODO a TODOS no escala. OSPF usa <strong>jerarquía de áreas</strong>: se parte el AS en áreas, cada una corre su propio link-state <strong>por separado</strong>.',
  },
  {
    hi: ['BB1', 'BB2'],
    msg: 'El <strong>área 0 (backbone)</strong> es el corazón: todas las demás áreas se conectan a través de ella. El flooding de LSAs de un área <strong>NO sale</strong> de esa área.',
  },
  {
    hi: ['ABR1', 'ABR2'],
    msg: 'Los <strong>ABR (Area Border Routers)</strong> pertenecen a dos áreas: resumen la info de su área hacia el backbone y viceversa. Así un router del área 1 no necesita el mapa detallado del área 2.',
  },
  {
    hi: ['R1a', 'R1b', 'R2a', 'R2b'],
    msg: 'Los routers <strong>internos</strong> solo conocen a fondo su propia área; para salir, mandan hacia su ABR. <strong>El flooding y el Dijkstra quedan contenidos por área</strong> → escala a ASes enormes. Extras de OSPF: autenticación de LSAs y ECMP (repartir por caminos de igual costo).',
  },
];

@Component({
  selector: 'app-ospf-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🗺 OSPF: flooding de LSAs + jerarquía de áreas</div>
          <div class="caption">Cómo todos los routers arman el mismo mapa, y cómo las áreas hacen que eso escale.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'flood'" (click)="setMode('flood')">Flooding de LSAs</button>
            <button [class.on]="mode() === 'areas'" (click)="setMode('areas')">Jerarquía de áreas</button>
          </div>
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
          @if (mode() === 'flood') {
            @for (l of flinks; track l[0] + l[1]) {
              <line [attr.x1]="fpos[l[0]].x" [attr.y1]="fpos[l[0]].y" [attr.x2]="fpos[l[1]].x" [attr.y2]="fpos[l[1]].y" class="wire" />
            }
            @for (b of beams(); track $index) {
              <line [attr.x1]="fpos[b.from].x" [attr.y1]="fpos[b.from].y" [attr.x2]="b.dx" [attr.y2]="b.dy" class="beam" />
            }
          } @else {
            @for (l of alinks; track l[0] + l[1]) {
              <line [attr.x1]="anodeById(l[0]).x" [attr.y1]="anodeById(l[0]).y" [attr.x2]="anodeById(l[1]).x" [attr.y2]="anodeById(l[1]).y" class="wire" />
            }
          }
        </svg>

        @if (mode() === 'areas') {
          <div class="arealbl bb">área 0 · backbone</div>
          <div class="arealbl a1">área 1</div>
          <div class="arealbl a2">área 2</div>
        }

        @if (mode() === 'flood') {
          @for (l of flinks; track 'c' + l[0] + l[1]) {
            <div class="clabel" [style.left.%]="(fpos[l[0]].x + fpos[l[1]].x) / 2" [style.top.%]="(fpos[l[0]].y + fpos[l[1]].y) / 2">{{ costOf(l[0], l[1]) }}</div>
          }
          @for (r of frouters; track r) {
            <div class="rt" [class.has]="hasLsa(r)" [style.left.%]="fpos[r].x" [style.top.%]="fpos[r].y">
              <strong>{{ r }}</strong>
              @if (hasLsa(r)) { <span class="lsatag">LSA ✔</span> }
            </div>
          }
          @for (b of beams(); track 'd' + $index) {
            <div class="pkt" [style.left.%]="b.dx" [style.top.%]="b.dy">📄</div>
          }
        } @else {
          @for (n of anodes; track n.id) {
            <div class="rt" [class]="'k-' + n.kind" [class.hi]="areaHi(n.id)" [style.left.%]="n.x" [style.top.%]="n.y">
              <strong>{{ n.id }}</strong>
              @if (n.kind === 'abr') { <span class="abrtag">ABR</span> }
            </div>
          }
        }
      </div>

      @if (mode() === 'flood') {
        <div class="lsdb">
          <div class="lhead">🗃 Base de datos link-state (LSDB)</div>
          <div class="lsub">El LSA de cada router = sus enlaces con su costo. Es el "mapa" de la red.</div>
          <div class="lrow lh"><span>router</span><span>sus enlaces (vecino:costo)</span></div>
          @for (e of lsdb; track e.r) {
            <div class="lrow" [class.on]="hasLsa(e.r)">
              <span class="lr">{{ e.r }}</span>
              <span class="ll">
                @for (k of e.links; track k.n) { <span class="lk">{{ k.n }}:{{ k.c }}</span> }
              </span>
            </div>
          }
          <div class="lnote" [class.done]="finished()">
            @if (finished()) {
              ✔ Los 6 routers terminan con <b>esta misma base</b> → cada uno corre <b>Dijkstra</b> sobre ella y arma su tabla de forwarding.
            } @else {
              Se va completando a medida que el flooding cubre el área.
            }
          </div>
        </div>
      }
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps().length }}</span>
        }
        @if (finished()) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="dots">
        @for (st of steps(); track $index; let i = $index) {
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
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 11px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 330px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }

    .lsdb { width: 250px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; align-self: flex-start; }
    .lhead { font-weight: 700; font-size: 0.8rem; color: #7ee787; }
    .lsub { font-size: 0.64rem; color: var(--text-dim); margin: 3px 0 8px; line-height: 1.35; }
    .lrow { display: grid; grid-template-columns: 0.5fr 1.5fr; gap: 4px; align-items: center; padding: 4px 6px; border-radius: 6px; margin-bottom: 3px; }
    .lrow.lh { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.52rem; margin-bottom: 5px; }
    .lrow:not(.lh) { background: #161d2b; border: 1px solid #232b3e; opacity: 0.4; transition: opacity 0.3s, background 0.3s, border-color 0.3s; }
    .lrow.on { opacity: 1; background: #1d3b26; border-color: #2ea04366; }
    .lr { font-family: Consolas, monospace; font-weight: 800; font-size: 0.85rem; color: #fff; text-align: center; }
    .ll { display: flex; flex-wrap: wrap; gap: 3px; }
    .lk { font-family: Consolas, monospace; font-size: 0.62rem; font-weight: 700; color: #cfe3ff; background: #1a2132; border: 1px solid #2d3750; border-radius: 4px; padding: 1px 5px; }
    .lnote { margin-top: 8px; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.64rem; color: var(--text-dim); line-height: 1.4; }
    .lnote b { color: #cfe3ff; } .lnote.done { color: #7ee787; } .lnote.done b { color: #7ee787; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
    .beam { stroke: #ffd54f; stroke-width: 1.1; vector-effect: non-scaling-stroke; opacity: 0.6; }

    .rt { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 2px; background: #37455f; border: 2px solid #4a5878; border-radius: 10px; padding: 7px 11px; min-width: 40px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: background 0.3s, border-color 0.3s, box-shadow 0.3s; }
    .rt strong { font-size: 0.85rem; color: #fff; }
    .rt.has { background: #1d3b26; border-color: #2ea043; box-shadow: 0 0 14px rgba(46,160,67,0.5); }
    .lsatag { font-size: 0.54rem; font-weight: 800; color: #7ee787; }
    .rt.k-backbone { background: #1565c0; } .rt.k-abr { background: #b45309; } .rt.k-internal { background: #455a76; }
    .rt.hi { border-color: #ffd54f; box-shadow: 0 0 14px rgba(255,213,79,0.5); }
    .abrtag { font-size: 0.52rem; font-weight: 800; color: #ffe082; }
    .pkt { position: absolute; transform: translate(-50%,-50%); z-index: 4; font-size: 0.9rem; }
    .clabel { position: absolute; transform: translate(-50%,-50%); z-index: 2; font-family: Consolas, monospace; font-size: 0.6rem; font-weight: 700; color: #79c0ff; background: #171e2e; border: 1px solid #2d3750; border-radius: 5px; padding: 0 4px; }

    .arealbl { position: absolute; z-index: 1; font-size: 0.66rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; }
    .arealbl.bb { left: 50%; top: 8%; transform: translateX(-50%); color: #79c0ff; background: rgba(31,111,235,0.12); border: 1px solid #1f6feb55; }
    .arealbl.a1 { left: 6%; bottom: 5%; color: #7ee787; background: rgba(46,160,67,0.1); border: 1px solid #2ea04344; }
    .arealbl.a2 { right: 6%; bottom: 5%; color: #7ee787; background: rgba(46,160,67,0.1); border: 1px solid #2ea04344; }

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

    @media (max-width: 760px) { .board { flex-direction: column; } .lsdb { width: 100%; } }
  `,
})
export class OspfDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'flood' | 'areas'>('flood');
  readonly steps = computed<(FloodStep | AreaStep)[]>(() => (this.mode() === 'flood' ? FLOOD : AREA_STEPS));

  readonly fpos = FPOS;
  readonly flinks = FLINKS;
  readonly frouters: RId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  readonly anodes = ANODES;
  readonly alinks = ALINKS;
  readonly lsdb = LSDB;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    if (this.mode() === 'areas') return 500;
    return (FLOOD[i] as FloodStep).static ? 500 : 1400;
  }
  protected override stepDwell(): number {
    return 3800;
  }

  setMode(m: 'flood' | 'areas'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  anodeById(id: string): ANode {
    return ANODES.find((n) => n.id === id)!;
  }

  costOf(a: RId, b: RId): number {
    return linkCost(a, b);
  }

  hasLsa(r: RId): boolean {
    if (this.mode() !== 'flood') return false;
    const i = this.index();
    if (i < 0) return r === 'A' ? false : false;
    if (this.finished()) return true;
    const cur = FLOOD[i];
    // ya lo tiene si estaba en el "has" del paso anterior; el del paso actual aparece al completar
    const prevHas = i > 0 ? (FLOOD[i - 1] as FloodStep).has : ['A'];
    const has = this.progress() >= 0.9 ? cur.has : prevHas;
    return has.includes(r);
  }

  areaHi(id: string): boolean {
    if (this.mode() !== 'areas') return false;
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return (AREA_STEPS[i].hi ?? []).includes(id);
  }

  readonly beams = computed(() => {
    if (this.mode() !== 'flood') return [];
    const i = this.index();
    if (i < 0 || this.finished()) return [];
    const cur = FLOOD[i];
    if (cur.static || !cur.beams.length) return [];
    const p = this.ease(this.progress());
    return cur.beams.map((b) => ({
      from: b.from,
      dx: FPOS[b.from].x + (FPOS[b.to].x - FPOS[b.from].x) * p,
      dy: FPOS[b.from].y + (FPOS[b.to].y - FPOS[b.from].y) * p,
    }));
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'flood'
        ? '<strong>Todos con el mismo mapa</strong> → cada router corre Dijkstra y arma su tabla. Como cada uno calcula solo, un router "mentiroso" solo daña su propia tabla (a diferencia de DV, donde el error se propaga). Probá la vista <strong>Jerarquía de áreas</strong>.'
        : '<strong>Áreas = OSPF escala</strong>: flooding y Dijkstra contenidos por área, ABRs resumiendo hacia el backbone (área 0). Es link-state con jerarquía — la razón por la que OSPF corre ASes enormes donde RIP (distance-vector, máx 15 saltos) no llega.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. En "Flooding" mirá el LSA propagarse hasta que TODOS lo tienen; en "Áreas", cómo se contiene por región.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
