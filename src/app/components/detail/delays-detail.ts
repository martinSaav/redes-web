import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

type SegType = 'trans' | 'prop' | 'proc' | 'queue';

interface Seg {
  type: SegType;
  name: string;
  ms: number;
  detail: string;
}

interface DelayStep {
  from: Pos;
  to: Pos;
  text: string;
  msg: string;
  seg?: number; // índice del segmento que se agrega al completar el paso
  static?: boolean;
  showQueue?: boolean; // dibuja la cola en R1
}

const HOST: Pos = { x: 10, y: 45 };
const R1: Pos = { x: 36, y: 45 };
const R2: Pos = { x: 63, y: 45 };
const SRV: Pos = { x: 90, y: 45 };

const SEGS: Seg[] = [
  { type: 'trans', name: 'd_trans @ host', ms: 12, detail: '12.000 bits ÷ 1 Mbps' },
  { type: 'prop', name: 'd_prop @ enlace 1', ms: 5, detail: '1.000 km ÷ 2×10⁸ m/s' },
  { type: 'proc', name: 'd_proc @ R1', ms: 0.1, detail: 'header + checksum + LPM (µs)' },
  { type: 'queue', name: 'd_queue @ R1', ms: 24, detail: '2 paquetes adelante en el buffer' },
  { type: 'trans', name: 'd_trans @ R1', ms: 12, detail: 'de nuevo L/R, enlace de 1 Mbps' },
  { type: 'prop', name: 'd_prop @ enlace 2', ms: 10, detail: '2.000 km — el doble de distancia' },
  { type: 'queue', name: 'd_proc + d_queue @ R2', ms: 0.1, detail: '¡cola vacía esta vez!' },
  { type: 'trans', name: 'd_trans @ R2', ms: 12, detail: 'otra vez empujar los 12.000 bits' },
  { type: 'prop', name: 'd_prop @ enlace 3', ms: 3, detail: '600 km hasta el servidor' },
];

const STEPS: DelayStep[] = [
  {
    from: HOST, to: HOST, text: '📦 L = 12.000 bits', static: true,
    msg: 'Vamos a <strong>cronometrar</strong> un paquete de L = 12.000 bits por un camino de 3 enlaces de <strong>R = 1 Mbps</strong>. Mirá el cronómetro de la derecha: va sumando CADA retardo por separado.',
  },
  {
    from: HOST, to: HOST, text: 'empujando bits al enlace…', static: true, seg: 0,
    msg: '<strong>d_trans = L/R</strong> = 12.000 bits ÷ 1 Mbps = <strong>12 ms</strong>: el tiempo de "empujar" TODOS los bits al cable, del primero al último. Depende del <strong>tamaño</strong> y del <strong>ancho de banda</strong> — no de la distancia.',
  },
  {
    from: HOST, to: R1, text: '⚡ bits viajando', seg: 1,
    msg: '<strong>d_prop = d/s</strong> = 1.000 km ÷ 2×10⁸ m/s = <strong>5 ms</strong>: lo que tarda cada bit en RECORRER el cable. Depende de la <strong>distancia</strong>, no del ancho de banda. Son dos cosas distintas — la trampa clásica.',
  },
  {
    from: R1, to: R1, text: '🔍 examinando header', static: true, seg: 2,
    msg: '<strong>Store-and-forward</strong>: R1 esperó el paquete COMPLETO antes de poder reenviarlo. Ahora <strong>d_proc</strong> (~µs): chequear errores de bit y decidir la interfaz de salida con el lookup (LPM en TCAM). Casi gratis.',
  },
  {
    from: R1, to: R1, text: '⏳ esperando en la cola…', static: true, seg: 3, showQueue: true,
    msg: '<strong>d_queue = 24 ms</strong>: hay 2 paquetes ADELANTE en el buffer de salida (12 ms cada uno). Es el <strong>ÚNICO retardo variable</strong> — depende de cuánta gente llegó antes. Se caracteriza con la intensidad de tráfico <strong>La/R</strong>: cuando → 1, esta espera explota.',
  },
  {
    from: R1, to: R1, text: 'empujando bits…', static: true, seg: 4,
    msg: 'Le tocó el turno: otros <strong>12 ms de d_trans</strong> para poner el paquete en el segundo enlace. Fijate que d_trans se paga <strong>en cada salto</strong> — por eso el primer paquete tarda N·L/R en atravesar N enlaces.',
  },
  {
    from: R1, to: R2, text: '⚡ 2.000 km', seg: 5,
    msg: 'Segundo enlace, el doble de largo: <strong>d_prop = 10 ms</strong>. Un enlace satelital serían ~250 ms de d_prop aunque el ancho de banda fuera enorme: <strong>autopista ancha ≠ autopista corta</strong>.',
  },
  {
    from: R2, to: R2, text: '✔ cola vacía', static: true, seg: 6,
    msg: 'En R2, esta vez, <strong>la cola está VACÍA: d_queue ≈ 0</strong>. Mismo camino, otro momento, otro retardo — esa <strong>variación</strong> entre paquetes es exactamente el <strong>JITTER</strong> (lo que arruina una videollamada y se compensa con playout buffer).',
  },
  {
    from: R2, to: R2, text: 'empujando bits…', static: true, seg: 7,
    msg: 'Tercer <strong>d_trans: 12 ms</strong> más. Si el buffer de R2 hubiera estado LLENO, acá el paquete se <strong>descartaba</strong> (packet loss) — y lo repondría TCP desde el origen.',
  },
  {
    from: R2, to: SRV, text: '⚡ último tramo', seg: 8,
    msg: 'Último enlace, cortito: <strong>d_prop = 3 ms</strong>. Llegando…',
  },
];

const COLORS: Record<SegType, string> = {
  trans: '#ffd54f',
  prop: '#58a6ff',
  proc: '#9aa4bf',
  queue: '#ef5350',
};

const TOTAL_MS = SEGS.reduce((a, s) => a + s.ms, 0); // 78.2

@Component({
  selector: 'app-delays-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">⏱ Los 4 retardos, cronometrados</div>
          <div class="caption">Un paquete de 12.000 bits, 3 enlaces de 1 Mbps — y un cronómetro que separa cada componente del retardo.</div>
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
            <line [attr.x1]="host.x" [attr.y1]="host.y" [attr.x2]="r1.x" [attr.y2]="r1.y" />
            <line [attr.x1]="r1.x" [attr.y1]="r1.y" [attr.x2]="r2.x" [attr.y2]="r2.y" />
            <line [attr.x1]="r2.x" [attr.y1]="r2.y" [attr.x2]="srv.x" [attr.y2]="srv.y" />
          </svg>

          <div class="linklabel" style="left: 23%; top: 30%">1 Mbps · 1.000 km</div>
          <div class="linklabel" style="left: 49.5%; top: 30%">1 Mbps · 2.000 km</div>
          <div class="linklabel" style="left: 76.5%; top: 30%">1 Mbps · 600 km</div>

          <div class="node hostn" [class.active]="active(host)" [style.left.%]="host.x" [style.top.%]="host.y">
            <strong>💻 Host</strong><small>origen</small>
          </div>
          <div class="node rn" [class.active]="active(r1)" [style.left.%]="r1.x" [style.top.%]="r1.y">
            <strong>🧭 R1</strong><small>buffer de salida</small>
          </div>
          <div class="node rn" [class.active]="active(r2)" [style.left.%]="r2.x" [style.top.%]="r2.y">
            <strong>🧭 R2</strong><small>buffer de salida</small>
          </div>
          <div class="node srvn" [class.active]="active(srv)" [style.left.%]="srv.x" [style.top.%]="srv.y">
            <strong>🖥 Servidor</strong><small>destino</small>
          </div>

          <!-- cola en R1 -->
          @if (showQueue()) {
            <div class="queue" [style.left.%]="r1.x" [style.top.%]="r1.y + 22">
              <div class="qpkt other">pkt</div>
              <div class="qpkt other">pkt</div>
              <div class="qpkt mine">el nuestro</div>
              <div class="qlabel">cola de salida de R1</div>
            </div>
          }

          @if (card(); as c) {
            <div class="pkt" [style.left.%]="c.x" [style.top.%]="c.y">{{ c.text }}</div>
          }
        </div>

        <div class="timer">
          <div class="thead">⏱ Cronómetro del paquete</div>
          @for (s of visibleSegs(); track $index) {
            <div class="seg" [class.flash]="s.flash">
              <i [style.background]="s.color"></i>
              <div class="seginfo">
                <span class="segname">{{ s.name }}</span>
                <span class="segdetail">{{ s.detail }}</span>
              </div>
              <span class="segms">{{ s.ms }} ms</span>
            </div>
          }
          @if (visibleSegs().length === 0) {
            <div class="tempty">(todavía no arrancó el cronómetro)</div>
          }
          <div class="stack">
            @for (s of visibleSegs(); track $index) {
              <div class="chunk" [style.width.%]="(s.ms / totalMs) * 100" [style.background]="s.color"></div>
            }
          </div>
          <div class="total">
            <span>total acumulado</span>
            <strong>{{ runningTotal() }} ms</strong>
          </div>
          <div class="legend">
            <span><i style="background:#ffd54f"></i>d_trans</span>
            <span><i style="background:#58a6ff"></i>d_prop</span>
            <span><i style="background:#9aa4bf"></i>d_proc</span>
            <span><i style="background:#ef5350"></i>d_queue</span>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 480px; }
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
      background: radial-gradient(ellipse at 45% 45%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .linklabel { position: absolute; transform: translate(-50%, -50%); font-size: 0.6rem; color: #5c6a8e; background: #171e2e; padding: 1px 7px; border-radius: 8px; border: 1px solid #2d3750; white-space: nowrap; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 88px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255, 255, 255, 0.85); }
    .node.hostn { background: #2e7d32; }
    .node.rn { background: #546e7a; }
    .node.srvn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .queue { position: absolute; transform: translateX(-50%); z-index: 2; display: flex; gap: 4px; align-items: center; }
    .qpkt { border-radius: 6px; font-size: 0.6rem; font-weight: 700; padding: 4px 7px; font-family: Consolas, monospace; }
    .qpkt.other { background: #3b3418; border: 1px solid #d29922; color: #ffd54f; }
    .qpkt.mine { background: #16281c; border: 1.5px solid #2ea043; color: #7ee787; }
    .qlabel { font-size: 0.58rem; color: #5c6a8e; margin-left: 4px; white-space: nowrap; }

    .pkt {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap; box-shadow: 0 0 14px rgba(255, 213, 79, 0.35);
    }

    .timer { width: 292px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #ffd54f; }
    .seg {
      display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px;
      background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px;
    }
    .seg.flash { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255, 213, 79, 0.3); }
    .seg i { flex-shrink: 0; width: 11px; height: 11px; border-radius: 3px; }
    .seginfo { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .segname { font-size: 0.7rem; font-weight: 700; color: var(--text); font-family: Consolas, monospace; }
    .segdetail { font-size: 0.6rem; color: #5c6a8e; }
    .segms { font-size: 0.72rem; font-weight: 800; color: #ffd54f; font-family: Consolas, monospace; white-space: nowrap; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .stack { display: flex; height: 14px; border-radius: 6px; overflow: hidden; background: #0b0f19; border: 1px solid #2d3750; margin-top: auto; }
    .chunk { height: 100%; transition: width 0.3s; }
    .total { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 2px 0; }
    .total span { font-size: 0.7rem; color: #8b95b5; }
    .total strong { font-size: 1.05rem; color: #7ee787; font-family: Consolas, monospace; }
    .legend { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 6px; }
    .legend span { font-size: 0.62rem; color: #8b95b5; }
    .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; }

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

    @media (max-width: 720px) {
      .board { flex-direction: column; }
      .timer { width: 100%; }
    }
  `,
})
export class DelaysDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly host = HOST;
  readonly r1 = R1;
  readonly r2 = R2;
  readonly srv = SRV;
  readonly totalMs = TOTAL_MS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3200;
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = STEPS[i];
    const p = this.ease(this.progress());
    return {
      text: s.text,
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p,
    };
  });

  readonly showQueue = computed(() => {
    const i = this.index();
    return i >= 0 && !this.finished() && !!STEPS[i].showQueue;
  });

  readonly visibleSegs = computed(() => {
    const i = this.index();
    const p = this.progress();
    const fin = this.finished();
    const out: { name: string; detail: string; ms: number; color: string; flash: boolean }[] = [];
    for (let si = 0; si < STEPS.length; si++) {
      const seg = STEPS[si].seg;
      if (seg === undefined) continue;
      const reached = fin || si < i || (si === i && p >= 1);
      if (!reached) continue;
      const s = SEGS[seg];
      out.push({
        name: s.name,
        detail: s.detail,
        ms: s.ms,
        color: COLORS[s.type],
        flash: !fin && si === i && p >= 1,
      });
    }
    return out;
  });

  readonly runningTotal = computed(() => {
    const sum = this.visibleSegs().reduce((a, s) => a + s.ms, 0);
    return Math.round(sum * 10) / 10;
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Total: 78,2 ms</strong> — y mirá la barra: la mayor tajada fue la <strong>cola</strong> (roja, 24 ms), el único retardo que NO podés calcular de antemano. <span class="formula">d_nodal = d_proc + d_queue + d_trans + d_prop</span>. La trampa de siempre: <strong>d_trans</strong> = ancho de banda y tamaño · <strong>d_prop</strong> = distancia. No se mezclan.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. El cronómetro de la derecha va desglosando cada retardo con su fórmula — al final tenés la "factura" completa del viaje.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
