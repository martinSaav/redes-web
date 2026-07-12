import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface Row {
  ev: string;
  dy: string;
  dyVia: string;
  dz: string;
  dzVia: string;
  loop?: boolean;
  dots?: boolean;
}

interface DvStep {
  card?: { from: Pos; to: Pos; text: string; color?: string };
  static?: boolean;
  msg: string;
  rows: number; // filas de tabla visibles al completar
  costLabel: string; // etiqueta actual del enlace x-y
  costFlash?: boolean;
  loop?: boolean; // loop de ruteo activo entre y↔z
  poison?: boolean;
}

const X: Pos = { x: 12, y: 32 };
const Y: Pos = { x: 50, y: 32 };
const Z: Pos = { x: 88, y: 32 };

const GOOD_ROWS: Row[] = [
  { ev: 'inicio', dy: '4', dyVia: 'x', dz: '5', dzVia: 'y' },
  { ev: 'c(x,y)=1', dy: '1', dyVia: 'x', dz: '5', dzVia: 'y' },
  { ev: 'y→z', dy: '1', dyVia: 'x', dz: '2', dzVia: 'y' },
];

const GOOD_STEPS: DvStep[] = [
  {
    static: true, rows: 1, costLabel: '4',
    msg: 'Estado <strong>convergido</strong>: c(x,y)=4, c(y,z)=1, c(x,z)=50. Entonces D<sub>y</sub>(x)=4 (directo) y D<sub>z</sub>(x)=5 (vía y). Cada nodo solo conoce a sus vecinos y sus vectores.',
  },
  {
    static: true, rows: 1, costLabel: '4 → 1', costFlash: true,
    msg: '📉 <strong>Buena noticia</strong>: el enlace x–y mejora de 4 a <strong>1</strong>. y lo detecta al instante (es SU enlace).',
  },
  {
    static: true, rows: 2, costLabel: '1',
    msg: 'y recalcula con Bellman-Ford: D<sub>y</sub>(x) = min( c(y,x)+0, c(y,z)+D<sub>z</sub>(x) ) = min(<strong>1</strong>, 1+5) = <strong>1</strong>. Cambió → le manda su vector a sus vecinos.',
  },
  {
    card: { from: Y, to: Z, text: 'vector: Dy(x)=1', color: '#7ee787' }, rows: 2, costLabel: '1',
    msg: 'El vector viaja a z…',
  },
  {
    static: true, rows: 3, costLabel: '1',
    msg: 'z recalcula: D<sub>z</sub>(x) = min( c(z,x)=50, c(z,y)+D<sub>y</sub>(x) = 1+1 ) = <strong>2</strong>. Nada más cambia → <strong>convergió en 2 intercambios</strong>.',
  },
];

const BAD_ROWS: Row[] = [
  { ev: 'inicio', dy: '4', dyVia: 'x', dz: '5', dzVia: 'y' },
  { ev: 'c(x,y)=60', dy: '6', dyVia: 'z 🔄', dz: '5', dzVia: 'y', loop: true },
  { ev: 'y→z', dy: '6', dyVia: 'z 🔄', dz: '7', dzVia: 'y', loop: true },
  { ev: 'z→y', dy: '8', dyVia: 'z 🔄', dz: '7', dzVia: 'y', loop: true },
  { ev: '… de a 1 …', dy: '⋮', dyVia: '', dz: '⋮', dzVia: '', dots: true },
  { ev: 'intercambio 44', dy: '51', dyVia: 'z', dz: '50', dzVia: 'x (directo)' },
];

const BAD_STEPS: DvStep[] = [
  {
    static: true, rows: 1, costLabel: '4',
    msg: 'Mismo estado convergido: D<sub>y</sub>(x)=4 (directo), D<sub>z</sub>(x)=5 (vía y). Ahora la <strong>mala noticia</strong>…',
  },
  {
    static: true, rows: 1, costLabel: '4 → 60', costFlash: true,
    msg: '💥 El enlace x–y <strong>empeora de 4 a 60</strong>. y tiene que recalcular su camino a x.',
  },
  {
    static: true, rows: 2, costLabel: '60', loop: true,
    msg: 'y: D<sub>y</sub>(x) = min( 60, c(y,z)+D<sub>z</sub>(x) = 1+5 = <strong>6</strong> ) → ¡elige <strong>VÍA Z</strong>! El problema: ese "5" de z es información <strong>VIEJA</strong> — el camino de z pasaba POR y. Se armó un <strong>loop de ruteo</strong>: los paquetes hacia x rebotan entre y y z. 🔄',
  },
  {
    card: { from: Y, to: Z, text: 'vector: Dy(x)=6', color: '#ef9a9a' }, rows: 2, costLabel: '60', loop: true,
    msg: 'y anuncia su nuevo vector (6) a z…',
  },
  {
    static: true, rows: 3, costLabel: '60', loop: true,
    msg: 'z recalcula: D<sub>z</sub>(x) = min( 50, 1+6 ) = <strong>7</strong> (sigue vía y). Todavía no le conviene su enlace directo de 50.',
  },
  {
    card: { from: Z, to: Y, text: 'vector: Dz(x)=7', color: '#ef9a9a' }, rows: 4, costLabel: '60', loop: true,
    msg: 'z anuncia; y recalcula: min(60, 1+7) = <strong>8</strong>. ¿Ves el patrón? Suben <strong>de a 1</strong>, intercambio tras intercambio…',
  },
  {
    static: true, rows: 6, costLabel: '60',
    msg: '<strong>Count-to-infinity</strong>: hacen falta <strong>~44 intercambios</strong> hasta que D<sub>z</sub>(x) alcanza 50 y a z por fin le conviene su enlace <strong>directo</strong>. Recién ahí y toma min(60, 1+50)=51 vía z, y se deshace el loop. Por eso <strong>RIP define 16 = ∞</strong>: acota el daño.',
  },
  {
    static: true, rows: 6, costLabel: '60', poison: true,
    msg: '<strong>Poisoned reverse</strong>: como z rutea hacia x A TRAVÉS de y, le miente a y: "D<sub>z</sub>(x) = <strong>∞</strong>". Con eso, en el paso del desastre y habría hecho min(60, 1+∞) = <strong>60 directo</strong>, sin loop. ⚠️ Resuelve loops de <strong>2 nodos</strong> — los de 3 o más siguen siendo posibles.',
  },
];

@Component({
  selector: 'app-dv-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔄 Distance-Vector: buenas noticias rápidas, malas noticias lentas</div>
          <div class="caption">Bellman-Ford con información de segunda mano — y el famoso count-to-infinity.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'good'" (click)="setMode('good')">📉 Buena noticia</button>
            <button [class.on]="mode() === 'bad'" (click)="setMode('bad')">💥 Mala noticia</button>
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
            <line [attr.x1]="x.x" [attr.y1]="x.y" [attr.x2]="y.x" [attr.y2]="y.y" [class.flash]="costFlash()" />
            <line [attr.x1]="y.x" [attr.y1]="y.y" [attr.x2]="z.x" [attr.y2]="z.y" [class.looping]="loopOn()" />
            <path [attr.d]="arcPath" fill="none" class="arc" />
          </svg>

          <div class="wlabel" [class.flash]="costFlash()" [style.left.%]="(x.x + y.x) / 2" [style.top.%]="x.y - 9">
            c(x,y) = {{ costLabel() }}
          </div>
          <div class="wlabel" [style.left.%]="(y.x + z.x) / 2" [style.top.%]="y.y - 9">c(y,z) = 1</div>
          <div class="wlabel" [style.left.%]="50" [style.top.%]="86">c(x,z) = 50</div>

          @if (loopOn()) {
            <div class="loopbadge" [style.left.%]="(y.x + z.x) / 2" [style.top.%]="y.y + 13">
              🔄 loop: los paquetes a x rebotan y ↔ z
            </div>
          }
          @if (poisonOn()) {
            <div class="poison" [style.left.%]="(y.x + z.x) / 2" [style.top.%]="y.y + 13">
              🧪 z → y: "Dz(x) = ∞" (mentira piadosa)
            </div>
          }

          <div class="gnode nx" [style.left.%]="x.x" [style.top.%]="x.y"><span class="nid">x</span><span class="nsub">destino</span></div>
          <div class="gnode" [style.left.%]="y.x" [style.top.%]="y.y"><span class="nid">y</span><span class="nsub">Dy(x)={{ curDy() }}</span></div>
          <div class="gnode" [style.left.%]="z.x" [style.top.%]="z.y"><span class="nid">z</span><span class="nsub">Dz(x)={{ curDz() }}</span></div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 12px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">Distancias hacia x, intercambio a intercambio</div>
            <div class="trow th"><span>evento</span><span>Dy(x)</span><span>vía</span><span>Dz(x)</span><span>vía</span></div>
            @for (r of visRows(); track $index) {
              <div class="trow" [class.looprow]="r.loop" [class.dotsrow]="r.dots">
                <span class="ev">{{ r.ev }}</span>
                <span class="dv">{{ r.dy }}</span><span class="via">{{ r.dyVia }}</span>
                <span class="dv">{{ r.dz }}</span><span class="via">{{ r.dzVia }}</span>
              </div>
            }
          </div>
          <div class="note">
            <b>La raíz del problema</b>: cada nodo confía en distancias <b>de segunda mano</b> sin saber POR DÓNDE pasan.
            Dijkstra no sufre esto: cada nodo tiene el mapa completo (a cambio de floodear LSAs).
          </div>
        </div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 0.82rem; }
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas {
      position: relative; flex: 1; min-height: 280px;
      background: radial-gradient(ellipse at 50% 40%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.8; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wires line.flash { stroke: #ffd54f; stroke-width: 1.6; }
    .wires line.looping { stroke: #ef5350; stroke-width: 1.4; stroke-dasharray: 3 2; }
    .wires .arc { stroke: #39445f; stroke-width: 0.6; vector-effect: non-scaling-stroke; stroke-dasharray: 2 2; }

    .wlabel {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      font-size: 0.66rem; font-weight: 700; color: #9aa4bf; font-family: Consolas, monospace;
      background: #171e2e; padding: 1px 7px; border-radius: 7px; border: 1px solid #2d3750; white-space: nowrap;
      transition: color 0.3s, border-color 0.3s;
    }
    .wlabel.flash { color: #ffd54f; border-color: #d29922; box-shadow: 0 0 10px rgba(255,213,79,0.3); }

    .loopbadge, .poison {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      font-size: 0.62rem; font-weight: 800; border-radius: 8px; padding: 3px 9px; white-space: nowrap;
    }
    .loopbadge { color: #ef9a9a; background: rgba(45,20,20,0.95); border: 1px solid #b23b3b; animation: buzz 0.5s linear infinite; }
    .poison { color: #7ee787; background: rgba(16,40,22,0.95); border: 1px solid #2ea043; }
    @keyframes buzz { 50% { opacity: 0.55; } }

    .gnode {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #37455f; border: 2px solid #4a5878; box-shadow: 0 3px 8px rgba(0,0,0,0.4);
    }
    .gnode.nx { background: #1565c0; border-color: #4a90e2; }
    .nid { font-size: 1rem; font-weight: 800; color: #fff; line-height: 1; }
    .nsub { font-size: 0.56rem; font-family: Consolas, monospace; color: #cfe3ff; margin-top: 2px; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 5;
      background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 4px 8px; font-family: Consolas, monospace; font-size: 0.64rem; color: #e6e9f0; white-space: nowrap;
    }

    .side { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.8rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1.2fr 0.6fr 0.9fr 0.6fr 1fr; gap: 3px; font-family: Consolas, monospace; font-size: 0.64rem; padding: 4px 6px; border-radius: 6px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .trow.looprow { border-color: #b23b3b66; }
    .trow.dotsrow { opacity: 0.6; text-align: center; }
    .ev { color: #8b95b5; } .dv { color: #ffd54f; font-weight: 800; text-align: center; } .via { color: #80d8ff; }
    .note { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; font-size: 0.7rem; color: #8b95b5; line-height: 1.6; }
    .note b { color: #cfe3ff; }

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

    @media (max-width: 760px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class DvDetail extends SteppedAnim implements OnDestroy {
  readonly x = X;
  readonly y = Y;
  readonly z = Z;
  // arco x—z por abajo
  readonly arcPath = `M ${X.x} ${X.y + 6} Q 50 95 ${Z.x} ${Z.y + 6}`;

  readonly mode = signal<'good' | 'bad'>('bad');
  readonly steps = computed(() => (this.mode() === 'good' ? GOOD_STEPS : BAD_STEPS));
  private rowsData = computed(() => (this.mode() === 'good' ? GOOD_ROWS : BAD_ROWS));

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1200;
  }
  protected override stepDwell(): number {
    return 3400;
  }

  setMode(m: 'good' | 'bad'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const c = this.steps()[i].card;
    if (!c) return null;
    const p = this.ease(this.progress());
    return {
      text: c.text,
      color: c.color ?? '#ffd54f',
      x: c.from.x + (c.to.x - c.from.x) * p,
      y: c.from.y + (c.to.y - c.from.y) * p,
    };
  });

  private rowCount = computed(() => {
    const i = this.index();
    if (i < 0) return 0;
    if (this.finished()) return this.rowsData().length;
    const cur = this.steps()[i].rows;
    const prev = i > 0 ? this.steps()[i - 1].rows : 0;
    return this.progress() >= 1 ? cur : prev;
  });

  readonly visRows = computed(() => this.rowsData().slice(0, this.rowCount()));

  curDy(): string {
    const r = this.visRows();
    for (let i = r.length - 1; i >= 0; i--) if (!r[i].dots) return r[i].dy;
    return '4';
  }
  curDz(): string {
    const r = this.visRows();
    for (let i = r.length - 1; i >= 0; i--) if (!r[i].dots) return r[i].dz;
    return '5';
  }

  costLabel(): string {
    const i = this.index();
    if (i < 0) return this.mode() === 'good' ? '4' : '4';
    if (this.finished()) return this.steps()[this.steps().length - 1].costLabel;
    return this.steps()[i].costLabel;
  }
  costFlash(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!this.steps()[i].costFlash && this.progress() >= 1;
  }
  loopOn(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!this.steps()[i].loop;
  }
  poisonOn(): boolean {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return this.mode() === 'bad';
    return !!this.steps()[i].poison && this.progress() >= 1;
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'good'
        ? '<strong>Buenas noticias, rápido</strong>: la mejora se propagó en 2 intercambios. Probá el modo "💥 Mala noticia" para ver el lado oscuro.'
        : '<strong>La asimetría de DV</strong>: mejoras en pocos intercambios, empeoramientos contando hasta el infinito (44 acá). Mitigación: <strong>poisoned reverse</strong> (loops de 2) y el <strong>16 = ∞</strong> de RIP. La cura de fondo es link-state: mapa completo, sin información de segunda mano.';
    }
    const i = this.index();
    if (i < 0)
      return this.mode() === 'bad'
        ? 'Presioná ▶ Play: el enlace x–y va a empeorar y vas a ver a y y z engañarse mutuamente, contando de a 1.'
        : 'Presioná ▶ Play: el enlace x–y mejora y la noticia vuela.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
