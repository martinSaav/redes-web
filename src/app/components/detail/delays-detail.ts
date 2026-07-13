import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

type DelayId = 'proc' | 'queue' | 'trans' | 'prop';

interface Seg {
  id: DelayId;
  name: string;
  ms: number;
  formula: string;
  color: string;
}

/* Valores del ejemplo: L = 12.000 bits, R = 1 Mbps, d = 2.000 km, s = 2×10⁸ m/s.
   2 paquetes adelante en la cola → d_queue = 2 × 12 ms. */
const SEGS: Record<DelayId, Seg> = {
  proc: { id: 'proc', name: 'd_proc', ms: 0.05, formula: 'examinar header + checksum + lookup', color: '#9aa4bf' },
  queue: { id: 'queue', name: 'd_queue', ms: 24, formula: '2 paquetes adelante en el buffer', color: '#ef5350' },
  trans: { id: 'trans', name: 'd_trans', ms: 12, formula: 'L/R = 12.000 bits ÷ 1 Mbps', color: '#ffd54f' },
  prop: { id: 'prop', name: 'd_prop', ms: 10, formula: 'd/s = 2.000 km ÷ 2×10⁸ m/s', color: '#58a6ff' },
};

const ORDER: DelayId[] = ['proc', 'queue', 'trans', 'prop'];

interface DStep {
  active: DelayId | null;
  revealUpTo: number; // cuántos segmentos revelados en el cronómetro
  msg: string;
  queueDrain?: boolean; // los 2 paquetes de adelante van saliendo
  streaming?: boolean; // el paquete se "empuja" al enlace (barra creciente)
  onLink?: boolean; // el paquete viaja por el enlace hacia B
}

const STEPS: DStep[] = [
  {
    active: null, revealUpTo: 0,
    msg: 'Un paquete llega al <strong>router A</strong> desde el host. Vamos a cronometrar los <strong>4 retardos</strong> que sufre en este nodo antes de estar del otro lado, en B. Cada etiqueta de abajo apunta a <strong>dónde</strong> ocurre cada uno.',
  },
  {
    active: 'proc', revealUpTo: 1,
    msg: '<strong>1 · Procesamiento (d_proc)</strong>: el router examina el header, chequea errores de bit y decide por qué interfaz sacarlo (lookup). Del orden de <strong>microsegundos</strong> — casi nada.',
  },
  {
    active: 'queue', revealUpTo: 2, queueDrain: true,
    msg: '<strong>2 · Cola (d_queue)</strong>: el paquete espera en el <strong>buffer de salida</strong> detrás de 2 paquetes que llegaron antes. Es el <strong>ÚNICO retardo variable</strong> — depende de la congestión → causa del <strong>jitter</strong>. Se caracteriza con la intensidad de tráfico <strong>La/R</strong>: si → 1, esta espera explota.',
  },
  {
    active: 'trans', revealUpTo: 3, streaming: true,
    msg: '<strong>3 · Transmisión (d_trans = L/R)</strong>: le toca el turno. El router <strong>empuja los L bits al enlace</strong>, del primero al último. Depende del <strong>tamaño del paquete</strong> y del <strong>ancho de banda R</strong> — NO de la distancia.',
  },
  {
    active: 'prop', revealUpTo: 4, onLink: true,
    msg: '<strong>4 · Propagación (d_prop = d/s)</strong>: ya en el enlace, cada bit <strong>recorre la distancia física</strong> hasta B a ~2×10⁸ m/s. Depende de la <strong>distancia</strong> — NO del ancho de banda. Acá está la trampa clásica: un enlace satelital tiene d_prop enorme aunque R sea gigante.',
  },
];

// coordenadas en el sistema del SVG (0..100), compartidas con los divs (top/left en %)
const HOST_X = 8;
const RA_X = 38; // centro del router A
const RB_X = 92;
const HIWAY_Y = 30;
const LINK_START = 50; // borde derecho del router A (salida)

@Component({
  selector: 'app-delays-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">⏱ El retardo nodal en el router A</div>
          <div class="caption">d_nodal = d_proc + d_queue + d_trans + d_prop — cada etiqueta apunta a dónde ocurre.</div>
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
          <svg class="scene" viewBox="0 0 100 62" preserveAspectRatio="none">
            <!-- enlace host → router A -->
            <line [attr.x1]="hostX + 4" [attr.y1]="hiway" x2="27" [attr.y2]="hiway" class="wire" />
            <!-- enlace de salida router A → router B -->
            <line [attr.x1]="linkStart" [attr.y1]="hiway" [attr.x2]="rbX - 4" [attr.y2]="hiway" class="wire out"
                  [class.lit]="active() === 'prop' || active() === 'trans'" />

            <!-- punteros de cada retardo hacia su zona -->
            @for (pt of pointers; track pt.id) {
              <line [attr.x1]="pt.zx" [attr.y1]="pt.zy" [attr.x2]="pt.lx" y2="50" class="ptr" [class.on]="active() === pt.id" />
            }
          </svg>

          <!-- host -->
          <div class="node host" [style.left.%]="hostX" [style.top.%]="pct(hiway)">
            <strong>💻 Host</strong>
          </div>

          <!-- ROUTER A (grande, con procesamiento + buffer) -->
          <div class="routerA" [style.left.%]="raX" [style.top.%]="pct(hiway)">
            <div class="ra-proc" [class.lit]="active() === 'proc'">
              <span class="ra-ico">⚙️</span>
              <span class="ra-lab">router A</span>
            </div>
            <div class="ra-buf" [class.lit]="active() === 'queue'">
              @for (s of [0, 1, 2]; track s) {
                <span class="slot" [class.ahead]="aheadFull(s)" [class.mine]="mineSlot() === s"></span>
              }
            </div>
          </div>

          <!-- router B -->
          <div class="node routerB" [style.left.%]="rbX" [style.top.%]="pct(hiway)">
            <strong>🧭 Router B</strong>
          </div>

          <!-- paquete que viaja -->
          @if (packet(); as p) {
            <div class="packet" [class.stream]="p.stream" [style.left.%]="p.x" [style.top.%]="pct(hiway)"
                 [style.width.px]="p.w">📦</div>
          }

          <!-- etiquetas de los 4 retardos (estilo libro) -->
          @for (pt of pointers; track pt.id) {
            <div class="zlabel" [class.on]="active() === pt.id" [style.left.%]="pt.lx" [style.top.%]="pct(51)">
              <span class="zname" [style.color]="seg(pt.id).color">{{ seg(pt.id).name }}</span>
              <span class="ztxt">{{ pt.short }}</span>
            </div>
          }
        </div>

        <div class="timer">
          <div class="thead">⏱ Cronómetro del retardo nodal</div>
          @for (r of rows(); track r.id) {
            <div class="seg" [class.lit]="active() === r.id" [class.flash]="r.flash">
              <i [style.background]="r.color"></i>
              <div class="sinfo">
                <span class="sname">{{ r.name }}</span>
                <span class="sform">{{ r.formula }}</span>
              </div>
              <span class="sms">{{ fmt(r.ms) }} ms</span>
            </div>
          }
          @if (rows().length === 0) {
            <div class="tempty">(el cronómetro arranca con el primer retardo)</div>
          }
          <div class="stack">
            @for (r of rows(); track r.id) {
              <div class="chunk" [style.width.%]="pctOfTotal(r.ms)" [style.background]="r.color"></div>
            }
          </div>
          <div class="total">
            <span>d_nodal acumulado</span>
            <strong>{{ fmt(runningTotal()) }} ms</strong>
          </div>
          <div class="tnote">La <b style="color:#ef5350">cola</b> es la tajada más grande — y la única que cambia paquete a paquete.</div>
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
      background: radial-gradient(ellipse at 40% 35%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.7; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wire.out.lit { stroke: #58a6ff; stroke-width: 1.4; }
    .ptr { stroke: #2d3750; stroke-width: 0.5; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .ptr.on { stroke: #7d8ab0; stroke-width: 0.9; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: #37455f; border: 1.5px solid #4a5878; border-radius: 10px;
      padding: 8px 11px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); text-align: center;
    }
    .node strong { font-size: 0.78rem; color: #fff; white-space: nowrap; }
    .node.host { background: #2e7d32; border-color: #43a047; }
    .node.routerB { background: #455a76; }

    .routerA {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; align-items: stretch; gap: 0;
      border: 2px solid #f0a83b; border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .ra-proc {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      background: #b4610f; padding: 10px 14px; transition: background 0.3s, box-shadow 0.3s;
    }
    .ra-proc.lit { background: #f0a83b; box-shadow: inset 0 0 14px rgba(255,255,255,0.4); }
    .ra-ico { font-size: 1.1rem; }
    .ra-lab { font-size: 0.62rem; font-weight: 800; color: #fff; }
    .ra-buf {
      display: flex; align-items: center; gap: 5px; padding: 0 12px;
      background: #10151f; border-left: 2px dashed #f0a83b; transition: box-shadow 0.3s;
    }
    .ra-buf.lit { box-shadow: inset 0 0 16px rgba(239,83,80,0.45); }
    .slot { width: 15px; height: 22px; border-radius: 3px; background: #0b0f19; border: 1px solid #2d3750; transition: background 0.35s, border-color 0.35s; }
    .slot.ahead { background: #37455f; border-color: #5a6b8c; }
    .slot.mine { background: #d29922; border-color: #ffd54f; box-shadow: 0 0 8px rgba(255,213,79,0.6); }

    .packet {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      font-size: 1rem; text-align: center; line-height: 1;
      filter: drop-shadow(0 0 6px rgba(255,213,79,0.7));
    }
    .packet.stream {
      background: linear-gradient(90deg, #ffd54f, #ffb300); border-radius: 3px; height: 12px;
      font-size: 0; box-shadow: 0 0 10px rgba(255,213,79,0.7);
      transform: translate(0, -50%); transform-origin: left center;
    }

    .zlabel {
      position: absolute; transform: translate(-50%, 0); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      width: 92px; opacity: 0.5; transition: opacity 0.3s, transform 0.3s;
    }
    .zlabel.on { opacity: 1; transform: translate(-50%, -3px); }
    .zname { font-family: Consolas, monospace; font-size: 0.72rem; font-weight: 800; }
    .ztxt { font-size: 0.58rem; color: #8b95b5; line-height: 1.25; margin-top: 1px; }

    .timer { width: 296px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.86rem; margin-bottom: 8px; color: #ffd54f; }
    .seg { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; margin-bottom: 4px; transition: border-color 0.3s, box-shadow 0.3s; }
    .seg.lit { border-color: #4a5878; }
    .seg.flash { box-shadow: 0 0 10px rgba(255,255,255,0.12); }
    .seg i { flex-shrink: 0; width: 11px; height: 11px; border-radius: 3px; }
    .sinfo { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .sname { font-size: 0.72rem; font-weight: 800; color: var(--text); font-family: Consolas, monospace; }
    .sform { font-size: 0.58rem; color: #5c6a8e; }
    .sms { font-size: 0.74rem; font-weight: 800; color: #cfe3ff; font-family: Consolas, monospace; white-space: nowrap; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .stack { display: flex; height: 16px; border-radius: 6px; overflow: hidden; background: #0b0f19; border: 1px solid #2d3750; margin-top: auto; }
    .chunk { height: 100%; transition: width 0.4s; }
    .total { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 2px 2px; }
    .total span { font-size: 0.7rem; color: #8b95b5; }
    .total strong { font-size: 1.1rem; color: #7ee787; font-family: Consolas, monospace; }
    .tnote { font-size: 0.62rem; color: #8b95b5; line-height: 1.5; }

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
      .timer { width: 100%; }
    }
  `,
})
export class DelaysDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly hostX = HOST_X;
  readonly raX = RA_X;
  readonly rbX = RB_X;
  readonly hiway = HIWAY_Y;
  readonly linkStart = LINK_START;

  // punteros: zona (donde ocurre) → etiqueta (abajo)
  readonly pointers = [
    { id: 'proc' as DelayId, zx: 33, zy: HIWAY_Y + 6, lx: 24, short: 'procesamiento' },
    { id: 'queue' as DelayId, zx: 45, zy: HIWAY_Y + 6, lx: 45, short: 'cola / encolamiento' },
    { id: 'trans' as DelayId, zx: LINK_START + 3, zy: HIWAY_Y + 3, lx: 64, short: 'transmisión (L/R)' },
    { id: 'prop' as DelayId, zx: 72, zy: HIWAY_Y + 3, lx: 84, short: 'propagación (d/s)' },
  ];

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 900;
  }
  protected override stepDwell(): number {
    return 3400;
  }

  seg(id: DelayId): Seg {
    return SEGS[id];
  }
  pct(v: number): number {
    // el SVG usa viewBox 0..62 en alto; los divs top:% usan 0..100 → convertir
    return (v / 62) * 100;
  }
  fmt(v: number): string {
    return (Math.round(v * 100) / 100).toString().replace('.', ',');
  }

  active(): DelayId | null {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    return STEPS[i].active;
  }

  readonly rows = computed(() => {
    const i = this.index();
    if (i < 0) return [] as (Seg & { flash: boolean })[];
    const n = this.finished() ? 4 : this.progress() >= 1 ? STEPS[i].revealUpTo : (i > 0 ? STEPS[i - 1].revealUpTo : 0);
    const justId = this.active();
    return ORDER.slice(0, n).map((id) => ({ ...SEGS[id], flash: id === justId && this.progress() >= 1 }));
  });

  readonly runningTotal = computed(() => this.rows().reduce((a, s) => a + s.ms, 0));

  private readonly TOTAL = ORDER.reduce((a, id) => a + SEGS[id].ms, 0);
  pctOfTotal(ms: number): number {
    return (ms / this.TOTAL) * 100;
  }

  /** los 2 slots de adelante: llenos hasta que la cola drena */
  aheadFull(slot: number): boolean {
    if (slot >= 2) return false;
    const act = this.active();
    if (act === 'proc' || act === null) return true;
    if (act === 'queue') {
      // drenan progresivamente durante el paso de cola
      const p = this.progress();
      if (slot === 0) return p < 0.4;
      if (slot === 1) return p < 0.75;
    }
    return false; // ya salieron
  }

  /** en qué slot está "nuestro" paquete */
  mineSlot(): number {
    const act = this.active();
    if (act === 'queue') {
      const p = this.progress();
      return p < 0.4 ? 2 : p < 0.75 ? 1 : 0;
    }
    return -1;
  }

  readonly packet = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) {
      // en reposo / fin: en el host o llegando a B
      if (this.finished()) return { x: this.rbX, w: 0, stream: false };
      return { x: this.hostX + 4, w: 0, stream: false };
    }
    const st = STEPS[i];
    const p = this.progress();
    if (st.active === null) {
      // viaja del host al router
      return { x: this.hostX + 4 + (33 - this.hostX - 4) * this.ease(p), w: 0, stream: false };
    }
    if (st.active === 'proc') return { x: 33, w: 0, stream: false };
    if (st.active === 'queue') {
      // ocupa el slot de "mine" — lo dibuja el buffer, ocultamos el emoji suelto
      return null;
    }
    if (st.streaming) {
      // se empuja al enlace: barra que crece HACIA LA DERECHA desde la salida del router
      const w = 6 + this.ease(p) * 34;
      return { x: this.linkStart, w, stream: true };
    }
    if (st.onLink) {
      // viaja por el enlace hacia B
      return { x: this.linkStart + 3 + (this.rbX - 5 - this.linkStart - 3) * this.ease(p), w: 0, stream: false };
    }
    return { x: this.linkStart, w: 0, stream: false };
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>d_nodal = ' + this.fmt(this.TOTAL) + ' ms</strong> — mirá la barra: la <b style="color:#ef5350">cola</b> se comió más de la mitad, y es la única que no podés calcular de antemano. La distinción de examen: <strong>d_trans</strong> (ancho de banda + tamaño) vs <strong>d_prop</strong> (distancia). No se mezclan.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: seguí el paquete atravesando el router A mientras el cronómetro suma cada retardo con su fórmula.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
