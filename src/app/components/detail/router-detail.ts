import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface Card {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
}

type Hl = 'in' | 'fabric' | 'out' | 'proc' | 'sched';

interface RStep {
  cards: Card[];
  static?: boolean;
  msg: string;
  hl?: Hl[];
  outQ?: number; // paquetes encolados en salida 2 al completar el paso
  inQ?: boolean; // mostrar la cola HOL en la entrada 1
  tableFlash?: boolean;
  drop?: boolean; // ✖ en salida 2
}

const OUTSIDE1: Pos = { x: -6, y: 26 };
const IN1: Pos = { x: 13, y: 26 };
const IN2: Pos = { x: 13, y: 54 };
const IN3: Pos = { x: 13, y: 82 };
const FAB: Pos = { x: 47, y: 54 };
const OUT1: Pos = { x: 83, y: 34 };
const OUT2: Pos = { x: 83, y: 74 };

const PKT = 'dst 138.16.5.9';

const STEPS: RStep[] = [
  {
    cards: [], static: true, hl: ['in', 'fabric', 'out', 'proc'],
    msg: 'La anatomía: <strong>puertos de entrada</strong> (terminan el enlace + lookup), <strong>switching fabric</strong> (la "tela" que cruza paquetes), <strong>puertos de salida</strong> (buffer + scheduling) y el <strong>procesador de ruteo</strong> arriba — el único que corre en software (control plane).',
  },
  {
    cards: [{ from: OUTSIDE1, to: IN1, text: '📦 ' + PKT }], hl: ['in'],
    msg: 'Llega un paquete al <strong>puerto de entrada 1</strong>: termina la señal física, valida la trama de capa 2 (CRC) y extrae el datagrama. Destino: <strong>138.16.5.9</strong>.',
  },
  {
    cards: [{ from: IN1, to: IN1, text: '🔍 lookup LPM…' }], static: true, hl: ['in'], tableFlash: true,
    msg: '<strong>LOOKUP en la entrada</strong>, contra la forwarding table (que el procesador copió ahí): matchean <code>138.16.0.0/16</code> y <code>138.16.5.0/24</code> → gana el <strong>más largo (/24) → salida 2</strong>. En hardware <strong>TCAM</strong>: ~1 ciclo, a <em>line speed</em> — antes de que termine de llegar el siguiente paquete.',
  },
  {
    cards: [{ from: IN1, to: FAB, text: '📦 → salida 2' }], hl: ['fabric'],
    msg: 'Cruza el <strong>fabric</strong>. Tres generaciones: por <strong>memoria</strong> (el paquete sube a RAM y baja — lento), por <strong>bus compartido</strong> (uno por vez) y por <strong>crossbar</strong> (transferencias EN PARALELO… si no compiten por la misma salida).',
  },
  {
    cards: [{ from: FAB, to: OUT2, text: '📦 ' + PKT }], outQ: 1, hl: ['out'],
    msg: 'Llega al <strong>puerto de salida 2</strong> y se encola: el enlace transmite de a un paquete (d_trans = L/R por cada uno).',
  },
  {
    cards: [
      { from: IN2, to: FAB, text: '📦 → salida 2', color: '#ce93d8' },
      { from: IN3, to: FAB, text: '📦 → salida 2', color: '#80d8ff' },
    ],
    outQ: 3, hl: ['fabric', 'out'],
    msg: '<strong>El problema</strong>: dos entradas más quieren la <strong>MISMA salida</strong>. El crossbar los pasa… pero el enlace de salida no acelera → la <strong>cola de salida crece</strong>. Acá es donde vive d_queue.',
  },
  {
    cards: [], static: true, inQ: true, hl: ['in'],
    msg: 'Y si el <strong>fabric</strong> fuera el cuello, las colas se arman en la <strong>ENTRADA</strong> → <strong>HOL blocking</strong>: el paquete del frente (esperando la salida 2, ocupada) <strong>traba al de atrás</strong>… aunque la salida 3 de ese otro esté LIBRE. Mirá la cola de la entrada 1.',
  },
  {
    cards: [{ from: IN2, to: OUT2, text: '📦 uno más…', color: '#ffd54f' }], outQ: 3, drop: true, hl: ['out'],
    msg: 'El buffer es <strong>FINITO</strong>: llega uno más con la cola llena → <strong>DESCARTE (drop-tail) ✖</strong>. Los <strong>AQM</strong> (RED, CoDel) descartan/marcan <em>antes</em> de llenarse (con <strong>ECN</strong> marcan en vez de tirar). ¿Cuánto buffer? <span class="formula">B = RTT·C/√N</span> — y demasiado buffer = <strong>bufferbloat</strong>.',
  },
  {
    cards: [], static: true, outQ: 2, hl: ['sched'],
    msg: '<strong>SCHEDULING</strong>: ¿quién sale primero de la cola? <strong>FIFO</strong> · <strong>prioridad</strong> (riesgo: inanición) · <strong>round robin</strong> · <strong>WFQ</strong> (a la clase i se le garantiza w<sub>i</sub>/Σw<sub>j</sub> del enlace — la base práctica del QoS). El scheduler drena la cola hacia el enlace.',
  },
];

const TABLE = [
  { pfx: '138.16.0.0/16', out: '2', match: true, win: false },
  { pfx: '138.16.5.0/24', out: '2', match: true, win: true },
  { pfx: '200.23.16.0/20', out: '1', match: false, win: false },
  { pfx: '0.0.0.0/0 (default)', out: '3', match: false, win: false },
];

@Component({
  selector: 'app-router-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔧 Adentro de un router: entrada → fabric → salida</div>
          <div class="caption">Dónde se hace el lookup, dónde se arman las colas, dónde se pierde un paquete y quién decide quién sale.</div>
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
          <!-- procesador de ruteo -->
          <div class="proc" [class.hot]="hot('proc')">
            🧠 Procesador de ruteo <small>control plane · OSPF/BGP o SDN · escribe la tabla ↓</small>
          </div>
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line class="ctl-line" x1="47" y1="20" x2="47" y2="40" />
            <line [attr.x1]="in1.x + 6" [attr.y1]="in1.y" x2="41" [attr.y2]="fab.y - 8" />
            <line [attr.x1]="in2.x + 6" [attr.y1]="in2.y" x2="41" [attr.y2]="fab.y" />
            <line [attr.x1]="in3.x + 6" [attr.y1]="in3.y" x2="41" [attr.y2]="fab.y + 8" />
            <line x1="53" [attr.y1]="fab.y - 6" [attr.x2]="out1.x - 6" [attr.y2]="out1.y" />
            <line x1="53" [attr.y1]="fab.y + 6" [attr.x2]="out2.x - 6" [attr.y2]="out2.y" />
          </svg>

          <!-- entradas -->
          <div class="port inp" [class.hot]="hot('in')" [style.left.%]="in1.x" [style.top.%]="in1.y">
            <strong>entrada 1</strong>
            @if (showInQ()) {
              <div class="holq">
                <span class="hpkt blocked">→2 ⛔</span>
                <span class="hpkt free">→3 ✔</span>
              </div>
            }
          </div>
          <div class="port inp" [class.hot]="hot('in')" [style.left.%]="in2.x" [style.top.%]="in2.y">
            <strong>entrada 2</strong>
          </div>
          <div class="port inp" [class.hot]="hot('in')" [style.left.%]="in3.x" [style.top.%]="in3.y">
            <strong>entrada 3</strong>
          </div>

          <!-- fabric -->
          <div class="fabric" [class.hot]="hot('fabric')" [style.left.%]="fab.x" [style.top.%]="fab.y">
            <strong>⬒ switching fabric</strong>
            <small>crossbar</small>
          </div>

          <!-- salidas -->
          <div class="port outp" [class.hot]="hot('out') || hot('sched')" [style.left.%]="out1.x" [style.top.%]="out1.y">
            <strong>salida 1</strong>
            <div class="q"><span class="slot"></span><span class="slot"></span><span class="slot"></span></div>
            <small>enlace 1 Gbps</small>
          </div>
          <div class="port outp" [class.hot]="hot('out') || hot('sched')" [style.left.%]="out2.x" [style.top.%]="out2.y">
            <strong>salida 2 @if (hot('sched')) { <em class="schedtag">scheduler: WFQ</em> }</strong>
            <div class="q">
              @for (s of [0, 1, 2]; track s) {
                <span class="slot" [class.full]="s < outQ()"></span>
              }
              @if (showDrop()) {
                <span class="dropmark">✖</span>
              }
            </div>
            <small>enlace 1 Gbps {{ outQ() >= 3 ? '· buffer LLENO' : '' }}</small>
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
            <div class="thead">📋 Forwarding table (FIB)</div>
            <div class="trow th"><span>prefijo</span><span>salida</span><span></span></div>
            @for (r of tableRows(); track r.pfx) {
              <div class="trow" [class.match]="r.showMatch" [class.win]="r.showWin">
                <span class="pf">{{ r.pfx }}</span>
                <span class="po">{{ r.out }}</span>
                <span class="pk">{{ r.showWin ? '✔ LPM' : r.showMatch ? 'match' : '' }}</span>
              </div>
            }
            <div class="tfoot">la escribe el <b>control plane</b> (routing); la consulta el <b>data plane</b> (forwarding) en ns</div>
          </div>

          <div class="notes">
            <div class="nhead">🧭 Dónde duele</div>
            <div class="nline"><b class="y">cola de entrada</b> → HOL blocking (fabric lento)</div>
            <div class="nline"><b class="o">cola de salida</b> → lo común: d_queue, drops</div>
            <div class="nline"><b class="r">buffer lleno</b> → drop-tail / AQM (RED, CoDel)</div>
            <div class="nline"><b class="g">scheduler</b> → FIFO · prioridad · RR · WFQ</div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
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
      position: relative; flex: 1; min-height: 340px;
      background: radial-gradient(ellipse at 45% 55%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
    .wires line.ctl-line { stroke: #7c3aed88; stroke-dasharray: 2 2; }

    .proc {
      position: absolute; left: 50%; top: 5%; transform: translateX(-50%); z-index: 2;
      background: #4a2f7d; border: 1.5px solid rgba(0,0,0,0.25); border-radius: 10px;
      color: #fff; font-size: 0.76rem; font-weight: 700; padding: 6px 14px; text-align: center;
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .proc small { display: block; font-weight: 500; font-size: 0.58rem; color: rgba(255,255,255,0.8); }
    .proc.hot { border-color: #fff; box-shadow: 0 0 14px rgba(167,139,250,0.5); }

    .port {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      border-radius: 10px; padding: 7px 10px; min-width: 92px; text-align: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .port strong { font-size: 0.72rem; color: #fff; }
    .port small { font-size: 0.56rem; color: rgba(255,255,255,0.8); font-family: Consolas, monospace; }
    .port.inp { background: #2e7d32; }
    .port.outp { background: #1565c0; }
    .port.hot { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.35); }
    .schedtag { font-style: normal; font-size: 0.56rem; background: #16281c; color: #7ee787; border: 1px solid #2ea043; border-radius: 6px; padding: 0 5px; margin-left: 4px; }

    .fabric {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      background: #b45309; border: 1.5px solid rgba(0,0,0,0.25); border-radius: 12px;
      padding: 14px 16px; text-align: center; display: flex; flex-direction: column;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: box-shadow 0.25s, border-color 0.25s;
    }
    .fabric strong { font-size: 0.78rem; color: #fff; }
    .fabric small { font-size: 0.58rem; color: rgba(255,255,255,0.85); }
    .fabric.hot { border-color: #fff; box-shadow: 0 0 16px rgba(246,140,31,0.55); }

    .q { display: flex; gap: 3px; align-items: center; }
    .slot { width: 14px; height: 14px; border-radius: 3px; background: #0b0f19; border: 1px solid #2d3750; transition: background 0.3s, border-color 0.3s; }
    .slot.full { background: #d29922; border-color: #ffd54f; box-shadow: 0 0 6px rgba(255,213,79,0.5); }
    .dropmark { color: #ef5350; font-weight: 900; font-size: 1rem; margin-left: 2px; animation: buzz 0.4s linear infinite; }
    @keyframes buzz { 50% { opacity: 0.4; } }

    .holq { display: flex; gap: 3px; }
    .hpkt { font-size: 0.54rem; font-weight: 800; font-family: Consolas, monospace; border-radius: 4px; padding: 1px 5px; }
    .hpkt.blocked { background: #2b1618; color: #ef9a9a; border: 1px solid #ef5350; }
    .hpkt.free { background: #16281c; color: #7ee787; border: 1px solid #2ea043; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 4px 8px; font-family: Consolas, monospace; font-size: 0.64rem; color: #e6e9f0; white-space: nowrap;
    }

    .side { width: 288px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.82rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1.6fr 0.5fr 0.7fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.64rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .trow.match { border-color: #d2992288; }
    .trow.win { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.3); background: #2b2a1a; }
    .pf { color: #80d8ff; } .po { color: #cfe3ff; text-align: center; font-weight: 800; }
    .pk { color: #ffd54f; font-size: 0.56rem; font-weight: 800; text-align: right; }
    .tfoot { margin-top: 6px; border-top: 1px solid #232b3e; padding-top: 6px; font-size: 0.6rem; color: #8b95b5; line-height: 1.5; }
    .tfoot b { color: #cfe3ff; }

    .notes { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .nhead { font-weight: 700; font-size: 0.78rem; color: #79c0ff; margin-bottom: 6px; }
    .nline { font-size: 0.68rem; color: var(--text); line-height: 1.6; }
    .nline b.y { color: #ffd54f; } .nline b.o { color: #ffb74d; } .nline b.r { color: #ef9a9a; } .nline b.g { color: #7ee787; }

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
export class RouterDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly in1 = IN1;
  readonly in2 = IN2;
  readonly in3 = IN3;
  readonly fab = FAB;
  readonly out1 = OUT1;
  readonly out2 = OUT2;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1300;
  }
  protected override stepDwell(): number {
    return 3400;
  }

  readonly cards = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [];
    const p = this.ease(this.progress());
    return STEPS[i].cards.map((c) => ({
      text: c.text,
      color: c.color ?? '#ffd54f',
      x: c.from.x + (c.to.x - c.from.x) * p,
      y: c.from.y + (c.to.y - c.from.y) * p,
    }));
  });

  hot(h: Hl): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return (STEPS[i].hl ?? []).includes(h);
  }

  readonly outQ = computed(() => {
    const i = this.index();
    if (i < 0) return 0;
    if (this.finished()) return 0;
    const cur = STEPS[i].outQ;
    if (cur !== undefined && this.progress() >= 1) return cur;
    for (let s = i - (this.progress() >= 1 ? 0 : 1); s >= 0; s--) {
      const q = STEPS[s].outQ;
      if (q !== undefined) return q;
    }
    return 0;
  });

  readonly showInQ = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].inQ && this.progress() >= 1;
  });

  readonly showDrop = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].drop && this.progress() >= 1;
  });

  readonly tableRows = computed(() => {
    const i = this.index();
    const flash = i >= 0 && !this.finished() && !!STEPS[i].tableFlash && this.progress() >= 1;
    return TABLE.map((r) => ({
      ...r,
      showMatch: flash && r.match && !r.win,
      showWin: flash && r.win,
    }));
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>El router en una frase</strong>: el <strong>data plane</strong> (entrada→fabric→salida) mueve paquetes en <strong>nanosegundos y en hardware</strong>; el <strong>control plane</strong> (procesador de ruteo, arriba) arma las tablas en <strong>segundos y en software</strong> — con OSPF/BGP distribuido… o con un controlador SDN que se las escribe desde afuera.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: un paquete entra, se le hace lookup, cruza el fabric… y en el camino aparecen las colas, el descarte y el scheduling.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
