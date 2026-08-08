import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Las tres implementaciones del switching fabric (Kurose 4.2.2):
   por memoria (1ª gen), por bus (2ª gen) y por crossbar / red de interconexión (3ª gen). */

type Mode = 'mem' | 'bus' | 'xbar';

/** un paquete en movimiento: de qué entrada, a qué salida, y en qué tramo va */
interface Moving { id: string; inp: number; out: number; color: string; seg: 0 | 1; }

interface FStep {
  msg: string;
  pkts?: Moving[];
  waiting?: { id: string; inp: number; color: string; why: string }[];
  hi?: string[];
  parallel?: boolean;
  conflict?: boolean;
}

/* posiciones (viewBox 100×100) */
const IN_Y = [26, 50, 74];
const OUT_Y = [26, 50, 74];
const OUT_X = [38, 55, 72];   // columnas del crossbar
const X_IN = 16;
const X_OUT = 86;

const MEM: FStep[] = [
  {
    msg: 'Los routers de <strong>primera generación</strong> eran, literalmente, <strong>computadoras con CPU</strong>. El fabric "es" el <strong>procesador y la memoria del sistema</strong>: no hay hardware dedicado para mover paquetes.',
    hi: ['cpu', 'mem'],
  },
  {
    msg: '<strong>Paso 1</strong>: llega un paquete al puerto de entrada. El <strong>procesador lo copia a la memoria del sistema</strong> — el paquete <strong>cruza el bus del sistema</strong> (primera pasada).',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 0 }], hi: ['cpu', 'mem', 'bus1'],
  },
  {
    msg: '<strong>Paso 2</strong>: el procesador consulta la tabla, decide el puerto de salida y <strong>copia el paquete de la memoria al puerto de salida</strong> — <strong>segunda pasada por el mismo bus</strong>.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 1 }], hi: ['mem', 'bus1'],
  },
  {
    msg: '👉 <strong>El cuello de botella</strong>: cada paquete <strong>cruza el bus del sistema DOS veces</strong>. Si el ancho de banda de memoria es <strong>B</strong>, la tasa de conmutación total no puede pasar de <strong>B/2</strong>.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 1 }], hi: ['mem', 'bus1'],
  },
  {
    msg: 'Y además <strong>no se pueden hacer dos transferencias a la vez</strong>: hay un solo procesador y una sola memoria. El segundo paquete <strong>espera</strong>, aunque su salida esté libre.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 1 }],
    waiting: [{ id: 'p2', inp: 2, color: '#80d8ff', why: 'el procesador está ocupado' }],
    conflict: true,
  },
];

const BUS: FStep[] = [
  {
    msg: '<strong>Segunda generación</strong>: se saca al procesador del camino. Ahora el puerto de entrada transfiere el paquete <strong>DIRECTAMENTE</strong> al de salida por un <strong>bus compartido</strong>, <strong>sin intervención del procesador de ruteo</strong>.',
    hi: ['bus2'],
  },
  {
    msg: 'El paquete sale de la entrada, viaja por el <strong>bus compartido</strong> y llega directo a su puerto de salida. <strong>Una sola pasada</strong> — bastante más rápido que por memoria.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 0 }], hi: ['bus2'],
  },
  {
    msg: '👉 <strong>Pero el bus es UNO SOLO y compartido.</strong> Llega un segundo paquete, de otra entrada y hacia otra salida <em>distinta</em>… y aun así <strong>tiene que esperar</strong>: el bus ya está ocupado.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 0 }],
    waiting: [{ id: 'p2', inp: 2, color: '#80d8ff', why: 'el bus está ocupado' }],
    hi: ['bus2'], conflict: true,
  },
  {
    msg: 'Recién cuando el bus se libera, pasa el segundo. Conclusión: <strong>solo un paquete a la vez</strong> → la <strong>velocidad del router queda limitada por la velocidad del bus</strong>.',
    pkts: [{ id: 'p2', inp: 2, out: 0, color: '#80d8ff', seg: 0 }], hi: ['bus2'],
  },
];

const XBAR: FStep[] = [
  {
    msg: '<strong>Tercera generación</strong>: la <strong>red de interconexión</strong> o <strong>crossbar</strong>. Es una <strong>matriz de 2N buses</strong> — N horizontales (uno por entrada) y N verticales (uno por salida) — que se cruzan en <strong>puntos de cruce</strong> que el controlador abre y cierra.',
    hi: ['grid'],
  },
  {
    msg: 'Un paquete de la <strong>entrada 1</strong> hacia la <strong>salida 2</strong>: viaja por su bus horizontal hasta la columna 2, ahí se <strong>cierra el punto de cruce (1,2)</strong> y baja por el bus vertical hasta su salida.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 0 }], hi: ['grid'],
  },
  {
    msg: '👉 <strong>Y acá está la ventaja</strong>: <strong>al mismo tiempo</strong>, un paquete de la <strong>entrada 3</strong> puede ir a la <strong>salida 1</strong> usando <strong>otro punto de cruce</strong>. Los dos avanzan <strong>EN PARALELO</strong> sin estorbarse.',
    pkts: [
      { id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 0 },
      { id: 'p2', inp: 2, out: 0, color: '#80d8ff', seg: 0 },
    ],
    hi: ['grid'], parallel: true,
  },
  {
    msg: 'Por eso se dice que el crossbar es <strong>NO BLOQUEANTE</strong>: un paquete <strong>nunca</strong> es bloqueado por otro… <strong>mientras vayan a puertos de salida DISTINTOS</strong>.',
    pkts: [
      { id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 1 },
      { id: 'p2', inp: 2, out: 0, color: '#80d8ff', seg: 1 },
    ],
    hi: ['grid'], parallel: true,
  },
  {
    msg: '⚠ <strong>El matiz que se pregunta</strong>: "no bloqueante" <strong>NO</strong> quiere decir que nunca haya conflictos. Si <strong>dos paquetes van a la MISMA salida</strong>, uno tiene que <strong>esperar igual</strong> — el bus vertical es uno solo.',
    pkts: [{ id: 'p1', inp: 0, out: 1, color: '#ffd54f', seg: 1 }],
    waiting: [{ id: 'p2', inp: 2, color: '#ef5350', why: 'quiere la MISMA salida 2' }],
    hi: ['grid'], conflict: true,
  },
  {
    msg: 'Y cuando ese conflicto hace que las colas se armen <strong>en la entrada</strong>, aparece el <strong>HOL blocking</strong>: el de adelante espera su salida ocupada y <strong>traba a los de atrás</strong>, aunque la salida de ellos esté libre.',
    waiting: [
      { id: 'p2', inp: 2, color: '#ef5350', why: 'bloqueado: salida ocupada' },
      { id: 'p3', inp: 2, color: '#7ee787', why: '¡su salida está LIBRE pero no puede pasar!' },
    ],
    conflict: true,
  },
];

@Component({
  selector: 'app-fabric-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔀 El switching fabric: memoria, bus y crossbar</div>
          <div class="caption">Las tres generaciones y el cuello de botella de cada una.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'mem'" (click)="setMode('mem')">1· Memoria</button>
            <button [class.on]="mode() === 'bus'" (click)="setMode('bus')">2· Bus</button>
            <button [class.on]="mode() === 'xbar'" (click)="setMode('xbar')">3· Crossbar</button>
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

      <div class="canvas" [class.conflict]="conflictOn()" [class.parallel]="parallelOn()">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          @if (mode() === 'xbar') {
            <!-- buses horizontales (entradas) y verticales (salidas) -->
            @for (y of inY; track $index) {
              <line [attr.x1]="xIn" [attr.y1]="y" [attr.x2]="82" [attr.y2]="y" class="wire grid" />
            }
            @for (x of outX; track $index) {
              <line [attr.x1]="x" [attr.y1]="14" [attr.x2]="x" [attr.y2]="92" class="wire grid" />
            }
            <!-- puntos de cruce -->
            @for (y of inY; track 'r' + $index; let i = $index) {
              @for (x of outX; track 'c' + $index; let j = $index) {
                <circle [attr.cx]="x" [attr.cy]="y" r="1.6" class="xp" [class.on]="crosspointOn(i, j)" />
              }
            }
          } @else if (mode() === 'bus') {
            <line x1="30" y1="50" x2="72" y2="50" class="wire bus" />
            @for (y of inY; track $index) {
              <line [attr.x1]="xIn" [attr.y1]="y" [attr.x2]="30" [attr.y2]="50" class="wire feed" />
              <line x1="72" y1="50" [attr.x2]="xOut" [attr.y2]="y" class="wire feed" />
            }
          } @else {
            <!-- memoria: todo pasa por el bus del sistema hacia arriba -->
            @for (y of inY; track $index) {
              <line [attr.x1]="xIn" [attr.y1]="y" [attr.x2]="51" [attr.y2]="52" class="wire feed" />
              <line x1="51" y1="52" [attr.x2]="xOut" [attr.y2]="y" class="wire feed" />
            }
            <line x1="51" y1="52" x2="51" y2="24" class="wire bus" />
          }
        </svg>

        @if (mode() === 'mem') {
          <div class="box cpu" [class.hi]="isHi('cpu')">🖥 CPU + memoria<small>del sistema</small></div>
          <div class="buslbl" [class.hi]="isHi('bus1')">bus del sistema<br><b>×2 por paquete</b></div>
        }
        @if (mode() === 'bus') {
          <div class="buslbl bus2" [class.hi]="isHi('bus2')">bus compartido<br><b>1 paquete a la vez</b></div>
        }
        @if (mode() === 'xbar') {
          <div class="xlbl">matriz de 2N buses · los puntos son los <b>cruces</b></div>
        }

        @for (y of inY; track 'i' + $index; let i = $index) {
          <div class="port in" [style.top.%]="y" [style.left.%]="xIn">E{{ i + 1 }}</div>
        }
        @for (y of outY; track 'o' + $index; let i = $index) {
          <div class="port out" [style.top.%]="y" [style.left.%]="xOut">S{{ i + 1 }}</div>
        }

        @for (p of moving(); track p.id) {
          <div class="pkt" [style.left.%]="p.x" [style.top.%]="p.y" [style.background]="p.color"></div>
        }

        @for (w of waiting(); track w.id; let k = $index) {
          <div class="wait" [style.top.%]="inY[w.inp] + k * 9" [style.left.%]="xIn + 7">
            <span class="wp" [style.background]="w.color"></span>
            <span class="wt">{{ w.why }}</span>
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

      <div class="cmp">
        <div class="chead">📊 Las tres generaciones</div>
        <div class="crow ch"><span>fabric</span><span>cómo mueve el paquete</span><span>cuello de botella</span></div>
        <div class="crow" [class.on]="mode() === 'mem'">
          <span class="cf">Memoria</span><span>el <b>procesador</b> lo copia a RAM y de RAM a la salida</span>
          <span class="cb">cruza el bus <b>2 veces</b> → tasa ≤ <b>B/2</b>; sin paralelismo</span>
        </div>
        <div class="crow" [class.on]="mode() === 'bus'">
          <span class="cf">Bus</span><span>entrada → salida <b>directo</b>, sin el procesador</span>
          <span class="cb">bus <b>compartido</b>: 1 paquete a la vez</span>
        </div>
        <div class="crow" [class.on]="mode() === 'xbar'">
          <span class="cf">Crossbar</span><span>matriz de <b>2N buses</b> con puntos de cruce</span>
          <span class="cb g">paralelo · <b>no bloqueante</b> salvo misma salida</span>
        </div>
        <div class="hnote">Para escalar más: se <b>parte el paquete en celdas de longitud fija</b> (conmutar celdas fijas es más rápido) o se ponen <b>varios fabrics en paralelo</b>.</div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #22d3ee; color: #0d1117; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .canvas { position: relative; min-height: 290px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; transition: border-color 0.3s; }
    .canvas.conflict { border-color: #b23b3b88; }
    .canvas.parallel { border-color: #2ea04388; }
    .canvas svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.5; vector-effect: non-scaling-stroke; }
    .wire.grid { stroke: #4a5878; stroke-width: 0.7; }
    .wire.bus { stroke: #22d3ee; stroke-width: 2.2; vector-effect: non-scaling-stroke; }
    .wire.feed { stroke: #3d4760; stroke-dasharray: 2 2; }
    .xp { fill: #2d3750; stroke: #4a5878; stroke-width: 0.4; transition: fill 0.25s, r 0.25s; }
    .xp.on { fill: #ffd54f; stroke: #ffd54f; r: 2.6; filter: drop-shadow(0 0 3px rgba(255,213,79,0.9)); }

    .port { position: absolute; transform: translate(-50%,-50%); z-index: 3; width: 26px; height: 22px; display: flex; align-items: center; justify-content: center; font-family: Consolas, monospace; font-size: 0.62rem; font-weight: 800; color: #fff; border-radius: 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
    .port.in { background: #2e7d32; } .port.out { background: #3949ab; }

    .box { position: absolute; transform: translate(-50%,-50%); z-index: 3; left: 51%; top: 14%; display: flex; flex-direction: column; align-items: center; text-align: center; background: #6d28d9; border: 1.5px solid #7c3aed; border-radius: 9px; padding: 7px 12px; font-size: 0.7rem; font-weight: 700; color: #fff; transition: box-shadow 0.3s, border-color 0.3s; }
    .box small { font-size: 0.54rem; font-weight: 400; color: rgba(255,255,255,0.8); }
    .box.hi { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.5); }

    .buslbl { position: absolute; left: 53%; top: 38%; z-index: 2; font-size: 0.58rem; color: #67e8f9; line-height: 1.3; background: rgba(23,30,46,0.9); border: 1px solid #22d3ee55; border-radius: 6px; padding: 3px 7px; transition: border-color 0.3s, box-shadow 0.3s; }
    .buslbl b { color: #22d3ee; }
    .buslbl.bus2 { left: 50%; top: 58%; transform: translateX(-50%); text-align: center; }
    .buslbl.hi { border-color: #22d3ee; box-shadow: 0 0 12px rgba(34,211,238,0.35); }
    .xlbl { position: absolute; left: 50%; bottom: 4%; transform: translateX(-50%); z-index: 2; font-size: 0.58rem; color: var(--text-dim); white-space: nowrap; }
    .xlbl b { color: #ffd54f; }

    .pkt { position: absolute; transform: translate(-50%,-50%); z-index: 5; width: 13px; height: 13px; border-radius: 3px; border: 1.5px solid rgba(0,0,0,0.4); box-shadow: 0 0 10px rgba(255,255,255,0.35); }

    .wait { position: absolute; transform: translateY(-50%); z-index: 4; display: flex; align-items: center; gap: 5px; }
    .wp { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; border: 1.5px solid rgba(0,0,0,0.4); animation: pulse 1.1s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
    .wt { font-size: 0.56rem; color: #ef9a9a; background: rgba(23,30,46,0.92); border: 1px solid #b23b3b55; border-radius: 5px; padding: 1px 6px; white-space: nowrap; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }

    .cmp { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .chead { font-weight: 700; font-size: 0.8rem; color: #fff; margin-bottom: 8px; }
    .crow { display: grid; grid-template-columns: 0.6fr 1.5fr 1.5fr; gap: 8px; font-size: 0.68rem; padding: 6px 8px; border-radius: 6px; align-items: center; color: var(--text); }
    .crow.ch { font-size: 0.56rem; text-transform: uppercase; font-weight: 700; color: #5c6a8e; }
    .crow:not(.ch) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; opacity: 0.6; transition: opacity 0.3s, border-color 0.3s; }
    .crow.on { opacity: 1; border-color: #22d3ee88; background: #14212b; }
    .cf { font-weight: 800; color: #67e8f9; } .cb { color: #ef9a9a; } .cb.g { color: #7ee787; }
    .crow b { color: #fff; }
    .hnote { margin-top: 7px; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.66rem; color: var(--text-dim); line-height: 1.5; } .hnote b { color: #cfe3ff; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) { .crow { grid-template-columns: 1fr; gap: 2px; } .crow.ch { display: none; } }
  `,
})
export class FabricDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('mem');
  readonly steps = computed<FStep[]>(() =>
    this.mode() === 'mem' ? MEM : this.mode() === 'bus' ? BUS : XBAR,
  );

  readonly inY = IN_Y;
  readonly outY = OUT_Y;
  readonly outX = OUT_X;
  readonly xIn = X_IN;
  readonly xOut = X_OUT;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].pkts?.length ? 1300 : 500;
  }
  protected override stepDwell(): number {
    return 4200;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): FStep | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    if (this.finished()) return list[list.length - 1];
    return list[Math.min(i, list.length - 1)];
  }

  isHi(id: string): boolean {
    return (this.at()?.hi ?? []).includes(id);
  }
  conflictOn(): boolean {
    return !!this.at()?.conflict;
  }
  parallelOn(): boolean {
    return !!this.at()?.parallel;
  }
  waiting(): { id: string; inp: number; color: string; why: string }[] {
    return this.at()?.waiting ?? [];
  }

  /** un punto de cruce está cerrado si algún paquete lo está usando */
  crosspointOn(i: number, j: number): boolean {
    if (this.mode() !== 'xbar') return false;
    const st = this.at();
    if (!st?.pkts) return false;
    return st.pkts.some((p) => p.inp === i && p.out === j);
  }

  /** posición de cada paquete en movimiento, según el fabric */
  readonly moving = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { id: string; x: number; y: number; color: string }[];
    const st = this.steps()[i];
    if (!st.pkts?.length) return [];
    const t = this.ease(this.progress());
    const m = this.mode();

    return st.pkts.map((p) => {
      if (m === 'xbar') {
        // tramo 1: por el bus horizontal hasta la columna; tramo 2: baja por el vertical
        const y0 = IN_Y[p.inp];
        const cx = OUT_X[p.out];
        if (p.seg === 0) {
          return { id: p.id, color: p.color, x: X_IN + (cx - X_IN) * t, y: y0 };
        }
        return { id: p.id, color: p.color, x: cx, y: y0 + (OUT_Y[p.out] - y0) * t };
      }
      if (m === 'bus') {
        // entrada → bus → salida, en un solo trayecto
        const y0 = IN_Y[p.inp];
        const y1 = OUT_Y[p.out];
        if (t < 0.5) {
          const u = t * 2;
          return { id: p.id, color: p.color, x: X_IN + (50 - X_IN) * u, y: y0 + (50 - y0) * u };
        }
        const u = (t - 0.5) * 2;
        return { id: p.id, color: p.color, x: 50 + (X_OUT - 50) * u, y: 50 + (y1 - 50) * u };
      }
      // memoria: seg 0 = entrada→memoria (sube), seg 1 = memoria→salida (baja)
      const y0 = IN_Y[p.inp];
      const y1 = OUT_Y[p.out];
      if (p.seg === 0) {
        return { id: p.id, color: p.color, x: X_IN + (51 - X_IN) * t, y: y0 + (24 - y0) * t };
      }
      return { id: p.id, color: p.color, x: 51 + (X_OUT - 51) * t, y: 24 + (y1 - 24) * t };
    });
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      const m = this.mode();
      if (m === 'mem') {
        return '<strong>Por memoria</strong>: el paquete cruza el bus del sistema <strong>dos veces</strong> y todo pasa por un único procesador → tasa limitada a <strong>B/2</strong> y sin paralelismo. Pasá a <strong>2· Bus</strong>.';
      }
      if (m === 'bus') {
        return '<strong>Por bus</strong>: se elimina al procesador del camino (una sola pasada), pero el bus <strong>compartido</strong> deja pasar <strong>un paquete a la vez</strong> → la velocidad del bus es el techo del router. Pasá a <strong>3· Crossbar</strong>.';
      }
      return '<strong>Crossbar</strong>: la matriz de 2N buses permite <strong>transferencias en paralelo</strong> → es <strong>no bloqueante</strong>, con la salvedad clave de que <strong>dos paquetes hacia la MISMA salida siguen compitiendo</strong> — y de ahí sale el <strong>HOL blocking</strong> cuando las colas quedan en la entrada.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Recorré las tres generaciones en orden: cada una arregla el cuello de botella de la anterior.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
