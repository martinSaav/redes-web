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

interface SwStep {
  cards: Card[];
  msg: string;
  rows: number; // filas de tabla visibles al completar el paso
  flashRows?: number[]; // filas resaltadas (insert o lookup)
  static?: boolean;
}

const A: Pos = { x: 13, y: 20 };
const B: Pos = { x: 13, y: 80 };
const C: Pos = { x: 85, y: 50 };
const SW: Pos = { x: 47, y: 50 };

const FRAME_AC = 'trama · src AA:…:11 → dst CC:…:33';
const FRAME_CA = 'trama · src CC:…:33 → dst AA:…:11';
const FRAME_BC = 'trama · src BB:…:22 → dst CC:…:33';

const STEPS: SwStep[] = [
  {
    cards: [{ from: A, to: A, text: FRAME_AC }], rows: 0, static: true,
    msg: '<strong>Host A</strong> (MAC AA:…:11, puerto 1) quiere mandarle una trama a <strong>C</strong>. La tabla del switch está <strong>VACÍA</strong>: recién enchufado, cero configuración — es <em>plug and play</em>.',
  },
  {
    cards: [{ from: A, to: SW, text: FRAME_AC }], rows: 0,
    msg: 'La trama entra por el <strong>puerto 1</strong>.',
  },
  {
    cards: [{ from: SW, to: SW, text: FRAME_AC }], rows: 1, flashRows: [0], static: true,
    msg: '<strong>SELF-LEARNING</strong>: el switch mira la <strong>MAC ORIGEN</strong> y anota en su tabla: "AA:…:11 vive por el puerto 1" (con timestamp, para el <em>aging</em>). Aprende mirando pasar el tráfico.',
  },
  {
    cards: [
      { from: SW, to: B, text: 'copia →', color: '#ef9a9a' },
      { from: SW, to: C, text: FRAME_AC },
    ],
    rows: 1,
    msg: 'La MAC <strong>DESTINO</strong> (CC:…:33) <strong>NO está</strong> en la tabla → <strong>FLOODING</strong>: reenvía por TODOS los puertos menos el de entrada. Es el precio de no saber.',
  },
  {
    cards: [{ from: C, to: C, text: FRAME_AC }], rows: 1, static: true,
    msg: '<strong>C</strong> reconoce su MAC y procesa la trama. <strong>B</strong> también la recibió, vio que no era para ella y la <strong>descartó</strong> — tráfico desperdiciado, pero el protocolo funciona.',
  },
  {
    cards: [{ from: C, to: C, text: FRAME_CA, color: '#80d8ff' }], rows: 1, static: true,
    msg: 'C le responde a A: arma su propia trama con <strong>src CC:…:33 → dst AA:…:11</strong>.',
  },
  {
    cards: [{ from: C, to: SW, text: FRAME_CA, color: '#80d8ff' }], rows: 1,
    msg: 'La respuesta entra por el <strong>puerto 3</strong>.',
  },
  {
    cards: [{ from: SW, to: SW, text: FRAME_CA, color: '#80d8ff' }], rows: 2, flashRows: [0, 1], static: true,
    msg: 'Doble jugada: <strong>APRENDE</strong> "CC:…:33 → puerto 3" (fila nueva) y <strong>BUSCA</strong> el destino AA:…:11 → ¡está en la tabla! → puerto 1.',
  },
  {
    cards: [{ from: SW, to: A, text: FRAME_CA, color: '#80d8ff' }], rows: 2,
    msg: 'Reenvío <strong>SELECTIVO (filtrado)</strong>: la trama sale SOLO por el puerto 1. B ni se entera. Cada host tiene su enlace full-duplex dedicado: <strong>no hay colisiones</strong>.',
  },
  {
    cards: [{ from: B, to: SW, text: FRAME_BC, color: '#ce93d8' }], rows: 2,
    msg: 'Ahora <strong>B</strong> le habla a C. Su trama entra por el puerto 2…',
  },
  {
    cards: [{ from: SW, to: SW, text: FRAME_BC, color: '#ce93d8' }], rows: 3, flashRows: [2, 1], static: true,
    msg: 'Aprende "BB:…:22 → puerto 2" y encuentra a CC:…:33 → puerto 3. <strong>Tabla completa</strong>: de acá en más, todo el tráfico entre estos hosts va directo, sin flooding.',
  },
  {
    cards: [{ from: SW, to: C, text: FRAME_BC, color: '#ce93d8' }], rows: 3,
    msg: 'Entrega directa a C. El switch quedó "entrenado" solo, mirando pasar tramas.',
  },
];

const TABLE_ROWS = [
  { mac: 'AA:…:11', port: '1', who: 'Host A' },
  { mac: 'CC:…:33', port: '3', who: 'Host C' },
  { mac: 'BB:…:22', port: '2', who: 'Host B' },
];

@Component({
  selector: 'app-switch-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔁 Switch self-learning: la tabla se arma sola</div>
          <div class="caption">Los 3 casos en vivo: flooding (no sé), filtrado (sé y es otro puerto) y aprendizaje por MAC origen.</div>
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
          <!-- cables -->
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="a.x" [attr.y1]="a.y" [attr.x2]="sw.x" [attr.y2]="sw.y" />
            <line [attr.x1]="b.x" [attr.y1]="b.y" [attr.x2]="sw.x" [attr.y2]="sw.y" />
            <line [attr.x1]="c.x" [attr.y1]="c.y" [attr.x2]="sw.x" [attr.y2]="sw.y" />
          </svg>

          <!-- etiquetas de puerto -->
          <div class="port" style="left: 33%; top: 33%">puerto 1</div>
          <div class="port" style="left: 33%; top: 67%">puerto 2</div>
          <div class="port" style="left: 63%; top: 44%">puerto 3</div>

          <div class="node host" [class.active]="active(a)" [style.left.%]="a.x" [style.top.%]="a.y">
            <strong>💻 Host A</strong><small>AA:…:11</small>
          </div>
          <div class="node host" [class.active]="active(b)" [style.left.%]="b.x" [style.top.%]="b.y">
            <strong>💻 Host B</strong><small>BB:…:22</small>
          </div>
          <div class="node host hostc" [class.active]="active(c)" [style.left.%]="c.x" [style.top.%]="c.y">
            <strong>💻 Host C</strong><small>CC:…:33</small>
          </div>
          <div class="node swbox" [class.active]="active(sw)" [style.left.%]="sw.x" [style.top.%]="sw.y">
            <strong>🔁 Switch</strong><small>capa 2 · transparente</small>
          </div>

          @for (card of cards(); track $index) {
            <div class="frame" [style.left.%]="card.x" [style.top.%]="card.y" [style.border-color]="card.color" [style.box-shadow]="'0 0 14px ' + card.color + '55'">
              {{ card.text }}
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">📋 Switch table</div>
          <div class="trow th"><span>MAC</span><span>puerto</span><span></span></div>
          @for (r of tableRows(); track $index) {
            <div class="trow" [class.flash]="r.flash">
              <span>{{ r.mac }}</span><span class="pt">{{ r.port }}</span><span class="who">{{ r.who }}</span>
            </div>
          }
          @if (tableRows().length === 0) {
            <div class="tempty">(vacía — el switch acaba de encenderse)</div>
          }
          <div class="tfoot">las entradas expiran solas (aging)</div>
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
      position: relative; flex: 1; min-height: 300px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .port { position: absolute; transform: translate(-50%, -50%); font-size: 0.6rem; color: #5c6a8e; background: #171e2e; padding: 1px 6px; border-radius: 8px; border: 1px solid #2d3750; z-index: 1; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 96px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.66rem; color: rgba(255, 255, 255, 0.85); font-family: Consolas, monospace; }
    .node.host { background: #2e7d32; }
    .node.hostc { background: #1565c0; }
    .node.swbox { background: #f68c1f; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .frame {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap; box-shadow: 0 0 14px rgba(255, 213, 79, 0.35);
    }

    .table { width: 240px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1.2fr 0.6fr 1fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.7rem; padding: 6px 8px; border-radius: 6px; color: var(--text); align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.6rem; padding-bottom: 2px; }
    .trow:not(.th) { background: #1a2132; margin-bottom: 4px; border: 1px solid #2d3750; }
    .trow.flash { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255, 213, 79, 0.3); background: #2b2a1a; }
    .pt { text-align: center; font-weight: 800; color: #79c0ff; }
    .who { color: #5c6a8e; font-size: 0.62rem; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.62rem; font-style: italic; padding-top: 8px; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 720px) {
      .board { flex-direction: column; }
      .table { width: 100%; }
    }
  `,
})
export class SwitchDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly a = A;
  readonly b = B;
  readonly c = C;
  readonly sw = SW;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return STEPS[i].static ? 3100 : 1900;
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

  readonly tableRows = computed(() => {
    const i = this.index();
    if (i < 0) return [];
    const s = STEPS[i];
    const prevRows = i > 0 ? STEPS[i - 1].rows : 0;
    const visible = this.finished() ? 3 : this.progress() >= 1 ? s.rows : prevRows;
    return TABLE_ROWS.slice(0, visible).map((r, idx) => ({
      ...r,
      flash: !this.finished() && this.progress() >= 1 && (s.flashRows ?? []).includes(idx),
    }));
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return STEPS[i].cards.some(
      (c) => (c.from.x === p.x && c.from.y === p.y) || (c.to.x === p.x && c.to.y === p.y),
    );
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Los 3 casos</strong>: destino en tabla por OTRO puerto → reenvía solo por ahí (filtrado) · destino por el MISMO puerto → descarta · no está → floodea. <strong>Seguridad</strong>: si un atacante inunda la tabla con MACs falsas hasta desbordarla, el switch floodea TODO — lo "convierte" en hub y permite sniffear.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y mirá la tabla de la derecha: arranca vacía y se completa sola, mirando la MAC ORIGEN de cada trama.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
