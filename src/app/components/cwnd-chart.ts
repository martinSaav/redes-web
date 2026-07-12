import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

interface CwndPoint {
  cwnd: number;
  phase: 'ss' | 'ca' | 'fr';
  event?: string; // se muestra al llegar a este punto
}

const RENO: CwndPoint[] = [
  { cwnd: 1, phase: 'ss', event: 'Slow start: cwnd arranca en 1 MSS y se DUPLICA cada RTT.' },
  { cwnd: 2, phase: 'ss' },
  { cwnd: 4, phase: 'ss' },
  { cwnd: 8, phase: 'ss' },
  { cwnd: 16, phase: 'ca', event: 'Llegó a ssthresh (16): pasa a congestion avoidance → +1 MSS por RTT (lineal).' },
  { cwnd: 17, phase: 'ca' },
  { cwnd: 18, phase: 'ca' },
  { cwnd: 19, phase: 'ca' },
  { cwnd: 20, phase: 'ca' },
  { cwnd: 10, phase: 'fr', event: '💥 3 ACKs duplicados = congestión LEVE (los ACKs siguen fluyendo). Reno: ssthresh = cwnd/2 = 10, cwnd = 10 → FAST RECOVERY, sin pasar por slow start.' },
  { cwnd: 11, phase: 'ca' },
  { cwnd: 12, phase: 'ca' },
  { cwnd: 13, phase: 'ca' },
  { cwnd: 14, phase: 'ca' },
  { cwnd: 1, phase: 'ss', event: '⏰ TIMEOUT = congestión GRAVE (no llega nada). ssthresh = 7, cwnd = 1 → slow start desde cero.' },
  { cwnd: 2, phase: 'ss' },
  { cwnd: 4, phase: 'ss' },
  { cwnd: 7, phase: 'ca', event: 'ssthresh (7) alcanzado → lineal de nuevo. Este patrón es el "diente de sierra" AIMD.' },
  { cwnd: 8, phase: 'ca' },
  { cwnd: 9, phase: 'ca' },
];

const TAHOE: CwndPoint[] = [
  { cwnd: 1, phase: 'ss', event: 'Slow start: cwnd arranca en 1 MSS y se DUPLICA cada RTT.' },
  { cwnd: 2, phase: 'ss' },
  { cwnd: 4, phase: 'ss' },
  { cwnd: 8, phase: 'ss' },
  { cwnd: 16, phase: 'ca', event: 'Llegó a ssthresh (16): pasa a congestion avoidance → +1 MSS por RTT (lineal).' },
  { cwnd: 17, phase: 'ca' },
  { cwnd: 18, phase: 'ca' },
  { cwnd: 19, phase: 'ca' },
  { cwnd: 20, phase: 'ca' },
  { cwnd: 1, phase: 'ss', event: '💥 3 ACKs duplicados. Tahoe NO distingue la señal: TODA pérdida → ssthresh = 10, cwnd = 1 MSS y slow start desde cero. Castiga de más el caso leve.' },
  { cwnd: 2, phase: 'ss' },
  { cwnd: 4, phase: 'ss' },
  { cwnd: 8, phase: 'ss' },
  { cwnd: 10, phase: 'ca', event: 'ssthresh (10) alcanzado → crecimiento lineal.' },
  { cwnd: 11, phase: 'ca' },
  { cwnd: 12, phase: 'ca' },
  { cwnd: 13, phase: 'ca' },
  { cwnd: 14, phase: 'ca' },
  { cwnd: 1, phase: 'ss', event: '⏰ Timeout: de nuevo cwnd = 1 y slow start (acá Tahoe y Reno coinciden).' },
  { cwnd: 2, phase: 'ss' },
];

const W = 760;
const H = 330;
const PAD = { l: 52, r: 16, t: 18, b: 40 };
const MAX_Y = 22;
const STEP_MS = 620;

@Component({
  selector: 'app-cwnd-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <div class="head">
        <div class="titles">
          <div class="title">📈 Evolución de la ventana de congestión (cwnd)</div>
          <div class="caption">La misma historia de pérdidas, contada por Tahoe y por Reno.</div>
        </div>
        <div class="controls">
          <div class="variant">
            <button [class.on]="variant() === 'tahoe'" (click)="setVariant('tahoe')">Tahoe</button>
            <button [class.on]="variant() === 'reno'" (click)="setVariant('reno')">Reno</button>
          </div>
          <button class="ctl play" (click)="toggle()">
            {{ playing() ? '⏸ Pausa' : done() ? '↺ Repetir' : '▶ Play' }}
          </button>
        </div>
      </div>

      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="xMidYMid meet">
        <!-- grilla + ejes -->
        @for (g of yTicks; track g) {
          <line [attr.x1]="padL" [attr.y1]="yPos(g)" [attr.x2]="w - padR" [attr.y2]="yPos(g)"
                stroke="#2a3450" stroke-width="1" />
          <text [attr.x]="padL - 8" [attr.y]="yPos(g) + 4" text-anchor="end" fill="#8b95b5" font-size="11">{{ g }}</text>
        }
        <line [attr.x1]="padL" [attr.y1]="yPos(0)" [attr.x2]="w - padR" [attr.y2]="yPos(0)" stroke="#4a5578" stroke-width="1.5" />
        <line [attr.x1]="padL" [attr.y1]="padT" [attr.x2]="padL" [attr.y2]="yPos(0)" stroke="#4a5578" stroke-width="1.5" />
        <text [attr.x]="(w - padR + padL) / 2" [attr.y]="h - 8" text-anchor="middle" fill="#8b95b5" font-size="12">
          tiempo (rondas de RTT) →
        </text>
        <text [attr.x]="14" [attr.y]="(padT + yPos(0)) / 2" text-anchor="middle" fill="#8b95b5" font-size="12"
              [attr.transform]="'rotate(-90 14 ' + (padT + yPos(0)) / 2 + ')'">cwnd (MSS)</text>

        <!-- segmentos revelados -->
        @for (seg of visibleSegments(); track $index) {
          <line [attr.x1]="seg.x1" [attr.y1]="seg.y1" [attr.x2]="seg.x2" [attr.y2]="seg.y2"
                [attr.stroke]="seg.color" stroke-width="3" stroke-linecap="round"
                [attr.stroke-dasharray]="seg.drop ? '6 5' : null" />
        }

        <!-- puntos revelados -->
        @for (pt of visiblePoints(); track $index) {
          <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4.5" [attr.fill]="pt.color"
                  stroke="#0d1117" stroke-width="1.5" />
          @if (pt.isEvent) {
            <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="9" fill="none" [attr.stroke]="pt.color"
                    stroke-width="1.5" opacity="0.6" />
          }
        }
      </svg>

      <div class="legend">
        <span><i class="sw" style="background:#4ade80"></i> slow start (exponencial)</span>
        <span><i class="sw" style="background:#58a6ff"></i> congestion avoidance (lineal)</span>
        <span><i class="sw dash"></i> caída por pérdida</span>
      </div>

      <div class="status" [class.idle]="revealed() === 0">
        <span [innerHTML]="statusMsg()"></span>
      </div>
    </div>
  `,
  styles: `
    .chart {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      margin: 18px 0;
    }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; }
    .controls { display: flex; gap: 8px; align-items: center; }
    .variant { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .variant button {
      background: transparent; color: var(--text-dim); border: none; border-radius: 6px;
      padding: 6px 14px; cursor: pointer; font-size: 0.88rem; font-weight: 600;
    }
    .variant button.on { background: #7c3aed; color: #fff; }
    .ctl.play {
      background: #1f6feb; border: 1px solid #1f6feb; color: #fff; font-weight: 700;
      border-radius: 8px; padding: 7px 14px; cursor: pointer; min-width: 96px; font-size: 0.9rem;
    }
    .ctl.play:hover { background: #388bfd; }
    svg { width: 100%; height: auto; display: block; background: #171e2e; border: 1px solid var(--border); border-radius: 10px; }
    .legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; font-size: 0.82rem; color: var(--text-dim); }
    .sw { display: inline-block; width: 18px; height: 4px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
    .sw.dash { background: repeating-linear-gradient(90deg, #ef5350 0 5px, transparent 5px 9px); }
    .status {
      margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px;
      padding: 11px 14px; min-height: 44px; font-size: 0.95rem; display: flex; align-items: center;
    }
    .status.idle { color: var(--text-dim); font-style: italic; }
  `,
})
export class CwndChart implements OnDestroy {
  readonly w = W;
  readonly h = H;
  readonly padL = PAD.l;
  readonly padR = PAD.r;
  readonly padT = PAD.t;
  readonly yTicks = [0, 5, 10, 15, 20];

  readonly variant = signal<'tahoe' | 'reno'>('reno');
  readonly playing = signal(false);
  /** cantidad de puntos revelados (0..N) */
  readonly revealed = signal(0);

  private rafId = 0;
  private lastTs = 0;
  private acc = 0;

  private readonly data = computed(() => (this.variant() === 'reno' ? RENO : TAHOE));
  readonly done = computed(() => this.revealed() >= this.data().length);

  readonly statusMsg = computed(() => {
    const n = this.revealed();
    if (n === 0) return 'Presioná ▶ Play para ver cómo evoluciona cwnd ronda a ronda.';
    const data = this.data();
    let lastEvent = '';
    for (let i = 0; i < n && i < data.length; i++) {
      if (data[i].event) lastEvent = data[i].event!;
    }
    const cur = data[Math.min(n, data.length) - 1];
    const phase =
      cur.phase === 'ss'
        ? '<strong>Slow start</strong>: crecimiento exponencial (×2 por RTT).'
        : '<strong>Congestion avoidance</strong>: +1 MSS por RTT.';
    if (this.done()) {
      return (
        '<strong>AIMD completo.</strong> Subida aditiva + bajada multiplicativa = diente de sierra. Dos flujos con este patrón convergen al reparto justo del enlace.'
      );
    }
    return lastEvent ? lastEvent + ' — ' + phase : phase;
  });

  xPos(i: number): number {
    const n = this.data().length - 1;
    return PAD.l + ((W - PAD.l - PAD.r) * i) / n;
  }
  yPos(v: number): number {
    return H - PAD.b - ((H - PAD.t - PAD.b) * v) / MAX_Y;
  }

  private phaseColor(p: CwndPoint['phase']): string {
    return p === 'ss' ? '#4ade80' : '#58a6ff';
  }

  readonly visiblePoints = computed(() => {
    const n = this.revealed();
    return this.data()
      .slice(0, n)
      .map((pt, i) => ({
        x: this.xPos(i),
        y: this.yPos(pt.cwnd),
        color: pt.event && pt.cwnd < 15 && i > 0 ? '#ef5350' : this.phaseColor(pt.phase),
        isEvent: !!pt.event && i > 0,
      }));
  });

  readonly visibleSegments = computed(() => {
    const n = this.revealed();
    const data = this.data();
    const segs: { x1: number; y1: number; x2: number; y2: number; color: string; drop: boolean }[] = [];
    for (let i = 1; i < n; i++) {
      const drop = data[i].cwnd < data[i - 1].cwnd;
      segs.push({
        x1: this.xPos(i - 1),
        y1: this.yPos(data[i - 1].cwnd),
        x2: this.xPos(i),
        y2: this.yPos(data[i].cwnd),
        color: drop ? '#ef5350' : this.phaseColor(data[i].phase),
        drop,
      });
    }
    return segs;
  });

  setVariant(v: 'tahoe' | 'reno'): void {
    this.pause();
    this.variant.set(v);
    this.revealed.set(0);
  }

  toggle(): void {
    if (this.playing()) {
      this.pause();
      return;
    }
    if (this.done()) this.revealed.set(0);
    this.playing.set(true);
    this.lastTs = performance.now();
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.playing.set(false);
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.playing()) return;
    // cap del delta: si la pestaña estuvo oculta, RAF se congela y no queremos saltos
    this.acc += Math.min(now - this.lastTs, 100);
    this.lastTs = now;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      const data = this.data();
      const cur = this.revealed();
      if (cur >= data.length) {
        this.pause();
        return;
      }
      this.revealed.set(cur + 1);
      // pausa dramática en los eventos
      if (data[cur].event) this.acc -= STEP_MS * 2.2;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
