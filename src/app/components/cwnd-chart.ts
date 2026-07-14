import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

interface CwndPoint {
  cwnd: number;
  ssthresh: number;
  phase: 'ss' | 'ca' | 'fr';
  event?: string; // se muestra al llegar a este punto
}

const RENO: CwndPoint[] = [
  { cwnd: 1, ssthresh: 16, phase: 'ss', event: 'Slow start: cwnd arranca en 1 MSS y se DUPLICA cada RTT.' },
  { cwnd: 2, ssthresh: 16, phase: 'ss' },
  { cwnd: 4, ssthresh: 16, phase: 'ss' },
  { cwnd: 8, ssthresh: 16, phase: 'ss' },
  { cwnd: 16, ssthresh: 16, phase: 'ca', event: 'Llegó a ssthresh (16): pasa a congestion avoidance → +1 MSS por RTT (lineal).' },
  { cwnd: 17, ssthresh: 16, phase: 'ca' },
  { cwnd: 18, ssthresh: 16, phase: 'ca' },
  { cwnd: 19, ssthresh: 16, phase: 'ca' },
  { cwnd: 20, ssthresh: 16, phase: 'ca' },
  { cwnd: 10, ssthresh: 10, phase: 'fr', event: '💥 3 ACKs duplicados = congestión LEVE (los ACKs siguen fluyendo). Reno: ssthresh = cwnd/2 = 10, cwnd = 10 → FAST RECOVERY, sin pasar por slow start.' },
  { cwnd: 11, ssthresh: 10, phase: 'ca' },
  { cwnd: 12, ssthresh: 10, phase: 'ca' },
  { cwnd: 13, ssthresh: 10, phase: 'ca' },
  { cwnd: 14, ssthresh: 10, phase: 'ca' },
  { cwnd: 1, ssthresh: 7, phase: 'ss', event: '⏰ TIMEOUT = congestión GRAVE (no llega nada). ssthresh = cwnd/2 = 7, cwnd = 1 → slow start desde cero.' },
  { cwnd: 2, ssthresh: 7, phase: 'ss' },
  { cwnd: 4, ssthresh: 7, phase: 'ss' },
  { cwnd: 7, ssthresh: 7, phase: 'ca', event: 'ssthresh (7) alcanzado → lineal de nuevo. Este patrón es el "diente de sierra" AIMD.' },
  { cwnd: 8, ssthresh: 7, phase: 'ca' },
  { cwnd: 9, ssthresh: 7, phase: 'ca' },
];

const TAHOE: CwndPoint[] = [
  { cwnd: 1, ssthresh: 16, phase: 'ss', event: 'Slow start: cwnd arranca en 1 MSS y se DUPLICA cada RTT.' },
  { cwnd: 2, ssthresh: 16, phase: 'ss' },
  { cwnd: 4, ssthresh: 16, phase: 'ss' },
  { cwnd: 8, ssthresh: 16, phase: 'ss' },
  { cwnd: 16, ssthresh: 16, phase: 'ca', event: 'Llegó a ssthresh (16): pasa a congestion avoidance → +1 MSS por RTT (lineal).' },
  { cwnd: 17, ssthresh: 16, phase: 'ca' },
  { cwnd: 18, ssthresh: 16, phase: 'ca' },
  { cwnd: 19, ssthresh: 16, phase: 'ca' },
  { cwnd: 20, ssthresh: 16, phase: 'ca' },
  { cwnd: 1, ssthresh: 10, phase: 'ss', event: '💥 3 ACKs duplicados. Tahoe NO distingue la señal: TODA pérdida → ssthresh = 10, cwnd = 1 MSS y slow start desde cero. Castiga de más el caso leve.' },
  { cwnd: 2, ssthresh: 10, phase: 'ss' },
  { cwnd: 4, ssthresh: 10, phase: 'ss' },
  { cwnd: 8, ssthresh: 10, phase: 'ss' },
  { cwnd: 10, ssthresh: 10, phase: 'ca', event: 'ssthresh (10) alcanzado → crecimiento lineal.' },
  { cwnd: 11, ssthresh: 10, phase: 'ca' },
  { cwnd: 12, ssthresh: 10, phase: 'ca' },
  { cwnd: 13, ssthresh: 10, phase: 'ca' },
  { cwnd: 14, ssthresh: 10, phase: 'ca' },
  { cwnd: 1, ssthresh: 7, phase: 'ss', event: '⏰ Timeout: ssthresh = 7, cwnd = 1 y slow start (acá Tahoe y Reno coinciden).' },
  { cwnd: 2, ssthresh: 7, phase: 'ss' },
];

const W = 560;
const H = 320;
const PAD = { l: 44, r: 40, t: 16, b: 38 };
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
          <button class="ctl step" (click)="stepOne()" [disabled]="playing()">⏭</button>
          <button class="ctl play" (click)="toggle()">
            {{ playing() ? '⏸ Pausa' : done() ? '↺ Repetir' : '▶ Play' }}
          </button>
        </div>
      </div>

      <div class="board">
        <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="xMidYMid meet">
          <!-- grilla + ejes -->
          @for (g of yTicks; track g) {
            <line [attr.x1]="padL" [attr.y1]="yPos(g)" [attr.x2]="w - padR" [attr.y2]="yPos(g)"
                  stroke="#2a3450" stroke-width="1" />
            <text [attr.x]="padL - 8" [attr.y]="yPos(g) + 4" text-anchor="end" fill="#8b95b5" font-size="11">{{ g }}</text>
          }
          <line [attr.x1]="padL" [attr.y1]="yPos(0)" [attr.x2]="w - padR" [attr.y2]="yPos(0)" stroke="#4a5578" stroke-width="1.5" />
          <line [attr.x1]="padL" [attr.y1]="padT" [attr.x2]="padL" [attr.y2]="yPos(0)" stroke="#4a5578" stroke-width="1.5" />
          <text [attr.x]="(w - padR + padL) / 2" [attr.y]="h - 6" text-anchor="middle" fill="#8b95b5" font-size="12">
            tiempo (rondas de RTT) →
          </text>
          <text [attr.x]="12" [attr.y]="(padT + yPos(0)) / 2" text-anchor="middle" fill="#8b95b5" font-size="12"
                [attr.transform]="'rotate(-90 12 ' + (padT + yPos(0)) / 2 + ')'">cwnd (MSS)</text>

          <!-- LÍNEA ssthresh (escalonada, punteada) -->
          @if (ssthreshPath()) {
            <polyline [attr.points]="ssthreshPath()" fill="none" stroke="#a78bfa" stroke-width="1.8"
                      stroke-dasharray="6 4" stroke-linejoin="round" opacity="0.9" />
          }
          @if (curPoint(); as c) {
            <text [attr.x]="w - padR + 3" [attr.y]="yPos(c.ssthresh) + 3" fill="#a78bfa" font-size="10.5" font-weight="700">ssth {{ c.ssthresh }}</text>
          }

          <!-- segmentos de cwnd -->
          @for (seg of visibleSegments(); track $index) {
            <line [attr.x1]="seg.x1" [attr.y1]="seg.y1" [attr.x2]="seg.x2" [attr.y2]="seg.y2"
                  [attr.stroke]="seg.color" stroke-width="3" stroke-linecap="round"
                  [attr.stroke-dasharray]="seg.drop ? '6 5' : null" />
          }

          <!-- puntos -->
          @for (pt of visiblePoints(); track $index) {
            <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4.5" [attr.fill]="pt.color"
                    stroke="#0d1117" stroke-width="1.5" />
            @if (pt.isEvent) {
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="9" fill="none" [attr.stroke]="pt.color"
                      stroke-width="1.5" opacity="0.6" />
            }
          }
        </svg>

        <!-- PANEL: fase + crecimiento -->
        <div class="side">
          @if (curPoint(); as c) {
            <div class="phasebadge" [class]="badgeClass()">{{ phaseLabel() }}</div>
            <div class="mrow">
              <div class="m"><span class="ml">cwnd</span><span class="mv cw">{{ c.cwnd }}</span></div>
              <div class="m"><span class="ml">ssthresh</span><span class="mv ss">{{ c.ssthresh }}</span></div>
            </div>

            <div class="growth" [class]="growthKind()">
              <div class="ghead">{{ growthHead() }}</div>
              <div class="grule">{{ growthRule() }}</div>
              <div class="gstep">
                <span class="gfrom">{{ prevCwnd() }}</span>
                <span class="gop" [class]="growthKind()">{{ growthOp() }}</span>
                <span class="gto">{{ c.cwnd }}</span>
              </div>
              <div class="gnote">{{ growthNote() }}</div>
            </div>
          } @else {
            <div class="placeholder">▶ Play o ⏭ para ver, ronda a ronda, cómo crece cwnd y dónde está ssthresh.</div>
          }

          <div class="cheat">
            <div class="ch ss"><b>exponencial</b> = el salto se AGRANDA (×2)</div>
            <div class="ch ca"><b>lineal</b> = saltos IGUALES (+1)</div>
            <div class="ch cut">al chocar ssthresh: deja de duplicar, pasa a sumar de a 1</div>
          </div>
        </div>
      </div>

      <div class="legend">
        <span><i class="sw" style="background:#4ade80"></i> slow start (exponencial, ×2)</span>
        <span><i class="sw" style="background:#58a6ff"></i> congestion avoidance (lineal, +1)</span>
        <span><i class="sw dash purple"></i> ssthresh (umbral)</span>
        <span><i class="sw dash"></i> caída por pérdida</span>
      </div>

      <div class="status" [class.idle]="revealed() === 0">
        <span [innerHTML]="statusMsg()"></span>
      </div>
    </div>
  `,
  styles: `
    .chart { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; }
    .controls { display: flex; gap: 8px; align-items: center; }
    .variant { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .variant button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 0.88rem; font-weight: 600; }
    .variant button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .ctl.play:hover { background: #388bfd; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    svg { flex: 1; min-width: 0; width: 100%; height: auto; display: block; background: #171e2e; border: 1px solid var(--border); border-radius: 10px; }

    .side { width: 232px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .phasebadge { text-align: center; font-weight: 800; font-size: 0.95rem; padding: 8px; border-radius: 9px; }
    .phasebadge.ss { background: #16281c; color: #7ee787; border: 1px solid #2ea043; }
    .phasebadge.ca { background: #14243d; color: #79c0ff; border: 1px solid #1f6feb; }
    .phasebadge.fr { background: #2d1d47; color: #d2b9ff; border: 1px solid #a78bfa; }
    .mrow { display: flex; gap: 8px; }
    .m { flex: 1; background: #10151f; border: 1px solid var(--border); border-radius: 9px; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .ml { font-size: 0.62rem; color: #5c6a8e; text-transform: uppercase; }
    .mv { font-family: Consolas, monospace; font-weight: 800; font-size: 1.5rem; }
    .mv.cw { color: #7ee787; } .mv.ss { color: #a78bfa; }

    .growth { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 5px; }
    .growth.ss { border-color: #2ea04366; } .growth.ca { border-color: #1f6feb66; } .growth.fr, .growth.drop { border-color: #a78bfa66; }
    .ghead { font-weight: 800; font-size: 0.82rem; }
    .growth.ss .ghead { color: #7ee787; } .growth.ca .ghead { color: #79c0ff; } .growth.fr .ghead, .growth.drop .ghead { color: #d2b9ff; }
    .grule { font-size: 0.72rem; color: var(--text); font-family: Consolas, monospace; }
    .gstep { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 3px 0; }
    .gfrom, .gto { font-family: Consolas, monospace; font-weight: 800; font-size: 1.35rem; color: #cfe3ff; }
    .gop { font-family: Consolas, monospace; font-weight: 800; font-size: 1.05rem; padding: 2px 9px; border-radius: 7px; }
    .gop.ss { background: #16281c; color: #7ee787; } .gop.ca { background: #14243d; color: #79c0ff; }
    .gop.fr, .gop.drop { background: #2d1d47; color: #d2b9ff; }
    .gnote { font-size: 0.64rem; color: #8b95b5; line-height: 1.45; }
    .placeholder { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-size: 0.8rem; color: #8b95b5; font-style: italic; flex: 1; }

    .cheat { margin-top: auto; display: flex; flex-direction: column; gap: 4px; }
    .ch { font-size: 0.64rem; color: #8b95b5; line-height: 1.4; padding-left: 8px; border-left: 3px solid #2d3750; }
    .ch b { font-weight: 700; }
    .ch.ss { border-color: #2ea043; } .ch.ss b { color: #7ee787; }
    .ch.ca { border-color: #1f6feb; } .ch.ca b { color: #79c0ff; }
    .ch.cut { border-color: #a78bfa; color: #b8a3e0; }

    .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; font-size: 0.8rem; color: var(--text-dim); }
    .sw { display: inline-block; width: 18px; height: 4px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
    .sw.dash { background: repeating-linear-gradient(90deg, #ef5350 0 5px, transparent 5px 9px); }
    .sw.dash.purple { background: repeating-linear-gradient(90deg, #a78bfa 0 5px, transparent 5px 9px); }
    .status { margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 44px; font-size: 0.95rem; display: flex; align-items: center; line-height: 1.45; }
    .status.idle { color: var(--text-dim); font-style: italic; }

    @media (max-width: 720px) { .board { flex-direction: column; } .side { width: 100%; } .cheat { margin-top: 8px; } }
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
  readonly revealed = signal(0);

  private rafId = 0;
  private lastTs = 0;
  private acc = 0;

  private readonly data = computed(() => (this.variant() === 'reno' ? RENO : TAHOE));
  readonly done = computed(() => this.revealed() >= this.data().length);

  /** punto actual (último revelado) + su previo */
  readonly curPoint = computed(() => {
    const n = this.revealed();
    if (n < 1) return null;
    const data = this.data();
    const i = Math.min(n, data.length) - 1;
    return data[i];
  });
  private readonly curIdx = computed(() => Math.min(this.revealed(), this.data().length) - 1);
  prevCwnd(): number | string {
    const i = this.curIdx();
    return i > 0 ? this.data()[i - 1].cwnd : '·';
  }

  /** clasifica el salto que TERMINA en el punto i según la máquina de estados de TCP.
     Clave: mientras cwnd < ssthresh es SLOW START, aunque 1→2 parezca "+1" (1×2 = 1+1). */
  private segKind(i: number): 'ss' | 'ca' | 'drop' {
    const d = this.data();
    if (i <= 0) return 'ss';
    const from = d[i - 1].cwnd;
    const to = d[i].cwnd;
    if (to < from) return 'drop';
    return d[i - 1].cwnd < d[i - 1].ssthresh ? 'ss' : 'ca';
  }
  private kindColor(k: 'ss' | 'ca' | 'drop'): string {
    return k === 'ss' ? '#4ade80' : k === 'ca' ? '#58a6ff' : '#ef5350';
  }

  phaseLabel(): string {
    const k = this.growthKind();
    const cw = this.curPoint()?.cwnd ?? 0;
    if (k === 'drop') return cw === 1 ? '⏰ TIMEOUT → cwnd = 1' : '💥 3 dup → fast recovery';
    return k === 'ss' ? '📈 SLOW START' : '➕ CONGESTION AVOIDANCE';
  }
  badgeClass(): string {
    const k = this.growthKind();
    return k === 'drop' ? 'fr' : k;
  }

  /** clasificación del último salto para el panel */
  growthKind(): 'ss' | 'ca' | 'drop' {
    const i = this.curIdx();
    if (i < 1) return 'ss';
    return this.segKind(i);
  }
  growthOp(): string {
    if (this.growthKind() === 'drop') return '↓';
    const i = this.curIdx();
    const from = i > 0 ? this.data()[i - 1].cwnd : 0;
    const to = this.curPoint()?.cwnd ?? 0;
    if (to === from * 2) return '×2';
    if (to === from + 1) return '+1';
    return '↗'; // slow start topeado al llegar a ssthresh
  }
  growthHead(): string {
    switch (this.growthKind()) {
      case 'ss': return 'crecimiento EXPONENCIAL';
      case 'ca': return 'crecimiento LINEAL';
      case 'drop': return 'CAÍDA por pérdida';
      default: return 'fast recovery';
    }
  }
  growthRule(): string {
    switch (this.growthKind()) {
      case 'ss': return 'cwnd se DUPLICA cada RTT';
      case 'ca': return 'cwnd suma +1 MSS cada RTT';
      case 'drop': return this.curPoint()!.cwnd === 1 ? 'timeout → cwnd = 1' : 'ssthresh = cwnd/2';
      default: return 'cwnd = ssthresh + 3';
    }
  }
  growthNote(): string {
    switch (this.growthKind()) {
      case 'ss': return 'los saltos se agrandan: +1, +2, +4, +8… hasta chocar ssthresh.';
      case 'ca': return 'saltos siempre iguales de +1 — la subida "aditiva" del AIMD.';
      case 'drop': return this.curPoint()!.cwnd === 1
        ? 'Tahoe y Reno reaccionan igual al timeout: reinician en 1 (slow start).'
        : 'la bajada "multiplicativa" del AIMD: a la mitad.';
      default: return 'Reno no vuelve a slow start ante 3 ACKs duplicados.';
    }
  }

  readonly statusMsg = computed(() => {
    const n = this.revealed();
    if (n === 0) return 'Presioná ▶ Play (o ⏭ paso a paso) para ver cómo evoluciona cwnd ronda a ronda.';
    const data = this.data();
    let lastEvent = '';
    for (let i = 0; i < n && i < data.length; i++) if (data[i].event) lastEvent = data[i].event!;
    if (this.done()) {
      return '<strong>AIMD completo.</strong> Subida aditiva (+1) + bajada multiplicativa (÷2) = el diente de sierra. Dos flujos con este patrón convergen al reparto justo del enlace.';
    }
    const k = this.growthKind();
    const phase = k === 'ss'
      ? '<strong>Slow start</strong>: mientras cwnd &lt; ssthresh, se duplica (×2) cada RTT.'
      : k === 'ca'
        ? '<strong>Congestion avoidance</strong>: alcanzado ssthresh, sube +1 por RTT.'
        : '<strong>Reacción a la pérdida</strong>: baja ssthresh (÷2).';
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

  readonly ssthreshPath = computed(() => {
    const n = this.revealed();
    if (n < 1) return '';
    return this.data()
      .slice(0, n)
      .map((pt, i) => this.xPos(i).toFixed(1) + ',' + this.yPos(pt.ssthresh).toFixed(1))
      .join(' ');
  });

  readonly visiblePoints = computed(() => {
    const n = this.revealed();
    return this.data()
      .slice(0, n)
      .map((pt, i) => ({
        x: this.xPos(i),
        y: this.yPos(pt.cwnd),
        color: i === 0 ? '#4ade80' : this.kindColor(this.segKind(i)),
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
        color: this.kindColor(this.segKind(i)),
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

  stepOne(): void {
    if (this.done()) {
      this.revealed.set(0);
      return;
    }
    this.revealed.update((v) => v + 1);
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
      if (data[cur].event) this.acc -= STEP_MS * 2.2;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
