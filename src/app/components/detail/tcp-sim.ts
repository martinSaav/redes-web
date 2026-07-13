import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';

interface Flight {
  id: number;
  seq: number; // data: nº de segmento · ack: nº esperado (acumulativo)
  kind: 'data' | 'ack';
  p: number; // 0..1
  lost: boolean;
  retx: boolean;
}

interface CwndPoint {
  cwnd: number;
  ss: number;
  ev?: 'fr' | 'to'; // marca de evento (fast retransmit / timeout)
}

const N = 16; // segmentos a transferir (cada uno = 1 MSS)
const RWND = 20; // ventana del receptor (no limita: cwnd es la protagonista)
const SSTHRESH0 = 8;
const TRAVEL = 2400; // ms de viaje one-way
const RTO = 6600; // ms de timeout
const AUTO_GAP = 950; // ms entre envíos automáticos

@Component({
  selector: 'app-tcp-sim',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎮 Simulador TCP: cliente ↔ servidor, en vivo</div>
          <div class="caption">
            Vos manejás la red: <strong>hacé click en un segmento en vuelo para perderlo</strong> y mirá si TCP se recupera con
            <strong>3 ACKs duplicados (fast retransmit)</strong> o por <strong>timeout</strong>.
          </div>
        </div>
        <div class="controls">
          <button class="ctl send" (click)="send()" [disabled]="!canSend()">📤 Enviar</button>
          <button class="ctl" [class.autoOn]="auto()" (click)="toggleAuto()">
            {{ auto() ? '⏸ Auto' : '▶ Auto' }}
          </button>
          <button class="ctl" (click)="reset()">↺</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="speed.set(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </div>

      <!-- panel de congestión -->
      <div class="cpanel">
        <div class="metrics">
          <div class="metric big">
            <span class="mlab">cwnd</span>
            <span class="mval cw">{{ cwndInt() }} <small>MSS</small></span>
          </div>
          <div class="metric">
            <span class="mlab">ssthresh</span>
            <span class="mval">{{ ssthreshInt() }}</span>
          </div>
          <div class="metric">
            <span class="mlab">ventana = min(cwnd, rwnd)</span>
            <span class="mval">{{ windowSize() }} <small>· rwnd {{ rwnd }}</small></span>
          </div>
          <div class="metric">
            <span class="mlab">fase</span>
            <span class="phase" [class]="phase()">{{ phaseLabel() }}</span>
          </div>
          <div class="metric">
            <span class="mlab">ACKs duplicados</span>
            <span class="mval dup" [class.hot]="dupAcks() > 0">{{ dupAcks() }}<small> / 3</small></span>
          </div>
        </div>
        <div class="spark">
          <svg viewBox="0 0 200 62" preserveAspectRatio="none">
            <line x1="0" [attr.y1]="sy(ssLast())" x2="200" [attr.y2]="sy(ssLast())" class="ssline" />
            @if (cwndPath()) {
              <polyline [attr.points]="cwndPath()" class="cwline" />
            }
            @for (m of cwndMarks(); track $index) {
              <circle [attr.cx]="m.x" [attr.cy]="m.y" r="2.4" [class]="m.cls" />
            }
          </svg>
          <div class="sparklab">cwnd en el tiempo · <i class="dot fr"></i> fast retransmit · <i class="dot to"></i> timeout</div>
        </div>
      </div>

      <div class="board">
        <!-- CLIENTE (emisor) -->
        <div class="strip-row">
          <div class="side-label">
            💻 CLIENTE
            <small>sendBase={{ sendBase() }} · nextSeq={{ nextSeq() }}</small>
          </div>
          <div class="strip">
            <div class="window" [style.left.%]="(sendBase() / n) * 100" [style.width.%]="(windowSize() / n) * 100">
              <span class="wlabel">ventana {{ windowSize() }}</span>
            </div>
            @for (sq of senderSquares(); track sq.i) {
              <div class="sq" [class]="sq.cls">
                {{ sq.i }}
                @if (sq.timerPct !== null) {
                  <div class="tbar"><div class="tfill" [style.width.%]="sq.timerPct"></div></div>
                }
              </div>
            }
          </div>
        </div>

        <!-- CANAL -->
        <div class="channel">
          <div class="channel-hint">— el canal · click en un segmento o ACK = 💥 se pierde —</div>
          @for (f of flights(); track f.id) {
            <button
              class="flight"
              [class.ack]="f.kind === 'ack'"
              [class.retx]="f.retx"
              [class.lost]="f.lost"
              [style.left.%]="flightX(f)"
              [style.top.px]="flightY(f)"
              [style.opacity]="flightOpacity(f)"
              (click)="shoot(f.id)"
              title="Click para perder"
            >
              {{ f.kind === 'data' ? 'seq ' + f.seq : 'ack ' + f.seq }}
            </button>
          }
        </div>

        <!-- SERVIDOR (receptor) -->
        <div class="strip-row">
          <div class="side-label">
            🖥 SERVIDOR
            <small>espera seq={{ rcvBase() }}</small>
          </div>
          <div class="strip">
            @for (sq of receiverSquares(); track sq.i) {
              <div class="sq" [class]="sq.cls">
                {{ sq.i }}
                @if (sq.i === rcvBase() && rcvBase() < n) {
                  <div class="pointer">▲</div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="legend">
        <span><i class="lg ok"></i> ACKeado</span>
        <span><i class="lg sent"></i> enviado, sin ACK</span>
        <span><i class="lg ready"></i> usable (en ventana)</span>
        <span><i class="lg buf"></i> recibido fuera de orden (buffer)</span>
        <span><i class="lg del"></i> entregado a la app</span>
        <span><i class="lg tmr"></i> timer RTO corriendo</span>
      </div>

      <div class="status" [class.done]="done()">
        <span [innerHTML]="log()"></span>
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 500px; }
    .caption strong { color: #ffd54f; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.send { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; }
    .ctl.send:hover:not(:disabled) { background: #388bfd; }
    .ctl.autoOn { background: #2ea043; border-color: #2ea043; color: #fff; font-weight: 700; }
    .speeds { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .cpanel { display: flex; gap: 12px; align-items: stretch; margin-bottom: 12px; flex-wrap: wrap; }
    .metrics { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 300px; }
    .metric { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; justify-content: center; min-width: 92px; }
    .metric.big { min-width: 110px; }
    .mlab { font-size: 0.6rem; color: #5c6a8e; text-transform: uppercase; letter-spacing: 0.03em; }
    .mval { font-family: Consolas, monospace; font-size: 1.05rem; font-weight: 800; color: #cfe3ff; }
    .mval small { font-size: 0.6rem; color: #5c6a8e; font-weight: 500; }
    .mval.cw { font-size: 1.5rem; color: #7ee787; }
    .mval.dup { color: #8b95b5; }
    .mval.dup.hot { color: #ffd54f; }
    .phase { font-size: 0.78rem; font-weight: 800; padding: 3px 8px; border-radius: 7px; text-align: center; width: fit-content; }
    .phase.ss { background: #16281c; color: #7ee787; border: 1px solid #2ea043; }
    .phase.ca { background: #14243d; color: #79c0ff; border: 1px solid #1f6feb; }
    .phase.fr { background: #2d1d47; color: #d2b9ff; border: 1px solid #a78bfa; }

    .spark { width: 260px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; }
    .spark svg { width: 100%; height: 62px; }
    .ssline { stroke: #a78bfa; stroke-width: 0.6; stroke-dasharray: 3 2; vector-effect: non-scaling-stroke; }
    .cwline { fill: none; stroke: #7ee787; stroke-width: 1.4; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    circle.fr { fill: #a78bfa; } circle.to { fill: #ef5350; }
    .sparklab { font-size: 0.58rem; color: #5c6a8e; margin-top: 4px; }
    .sparklab .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; vertical-align: 0; margin: 0 1px 0 4px; }
    .sparklab .dot.fr { background: #a78bfa; } .sparklab .dot.to { background: #ef5350; }

    .board { background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
    .strip-row { display: flex; align-items: center; gap: 12px; }
    .side-label { width: 100px; flex-shrink: 0; font-size: 0.74rem; font-weight: 800; color: var(--text-dim); display: flex; flex-direction: column; }
    .side-label small { font-weight: 500; color: #5c6a8e; font-family: Consolas, monospace; font-size: 0.64rem; }
    .strip { position: relative; flex: 1; display: flex; gap: 0; padding: 8px 0; }
    .sq {
      position: relative; flex: 1; margin: 0 2px; height: 40px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.8rem; font-family: Consolas, monospace;
      background: #1a2132; color: #5c6a8e; border: 1.5px solid #2d3750;
      transition: background 0.25s, border-color 0.25s, color 0.25s;
    }
    .sq.ok { background: #1d3b26; border-color: #2ea043; color: #7ee787; }
    .sq.sent { background: #3b3418; border-color: #d29922; color: #ffd54f; }
    .sq.ready { background: #172036; border-color: #1f6feb; border-style: dashed; color: #79c0ff; }
    .sq.buf { background: #2d1d47; border-color: #a78bfa; color: #d2b9ff; }
    .sq.del { background: #14331f; border-color: #2ea043; color: #7ee787; }
    .tbar { position: absolute; left: 3px; right: 3px; bottom: 3px; height: 4px; background: #0b0f19; border-radius: 2px; overflow: hidden; }
    .tfill { height: 100%; background: #ef5350; border-radius: 2px; }
    .pointer { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); color: #ffd54f; font-size: 0.7rem; }
    .window {
      position: absolute; top: 0; bottom: 0; border: 2px solid #ffd54f; border-radius: 10px;
      pointer-events: none; transition: left 0.45s ease, width 0.45s ease; z-index: 2;
    }
    .wlabel { position: absolute; top: -10px; left: 6px; background: #171e2e; color: #ffd54f; font-size: 0.62rem; font-weight: 700; padding: 0 5px; border-radius: 4px; white-space: nowrap; }

    .channel { position: relative; height: 190px; margin: 6px 0 6px 112px; border-top: 1px dashed #2d3750; border-bottom: 1px dashed #2d3750; }
    .channel-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #39445f; font-size: 0.75rem; white-space: nowrap; pointer-events: none; }
    .flight {
      position: absolute; transform: translateX(-50%); z-index: 3;
      background: #ffd54f; color: #1a1a1a; border: none; border-radius: 6px;
      font-family: Consolas, monospace; font-weight: 800; font-size: 0.72rem;
      padding: 4px 7px; cursor: crosshair; box-shadow: 0 0 12px rgba(255, 213, 79, 0.5); white-space: nowrap;
    }
    .flight.ack { background: #7ee787; box-shadow: 0 0 12px rgba(126, 231, 135, 0.5); }
    .flight.retx { background: #ef9a9a; box-shadow: 0 0 12px rgba(239, 154, 154, 0.6); }
    .flight.lost { cursor: default; }
    .flight:hover:not(.lost) { outline: 2px solid #fff; }

    .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; font-size: 0.75rem; color: var(--text-dim); }
    .lg { display: inline-block; width: 13px; height: 13px; border-radius: 4px; vertical-align: -2px; margin-right: 5px; border: 1.5px solid transparent; }
    .lg.ok { background: #1d3b26; border-color: #2ea043; }
    .lg.sent { background: #3b3418; border-color: #d29922; }
    .lg.ready { background: #172036; border-color: #1f6feb; border-style: dashed; }
    .lg.buf { background: #2d1d47; border-color: #a78bfa; }
    .lg.del { background: #14331f; border-color: #2ea043; }
    .lg.tmr { background: #ef5350; }

    .status { margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.93rem; display: flex; align-items: center; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
  `,
})
export class TcpSim implements OnDestroy {
  readonly n = N;
  readonly rwnd = RWND;
  readonly speedOptions = [0.5, 1, 2];

  readonly speed = signal(1);
  readonly auto = signal(false);

  // emisor
  readonly sendBase = signal(0); // primer byte/segmento sin ACK
  readonly nextSeq = signal(0);
  readonly cwnd = signal(1); // en MSS (float)
  readonly ssthresh = signal(SSTHRESH0);
  readonly dupAcks = signal(0);
  readonly phase = signal<'ss' | 'ca' | 'fr'>('ss');

  // receptor
  readonly rcvBase = signal(0); // próximo esperado (ACK acumulativo)
  private buffered: boolean[] = Array(N).fill(false);
  readonly deliveredV = signal<boolean[]>(Array(N).fill(false));
  readonly bufferedV = signal<boolean[]>(Array(N).fill(false));

  readonly flights = signal<Flight[]>([]);
  readonly cwndHist = signal<CwndPoint[]>([{ cwnd: 1, ss: SSTHRESH0 }]);
  readonly log = signal(
    'Arrancá con ▶ Auto (o mandá segmentos con 📤). Cuando haya varios en vuelo, hacé <strong>click en uno</strong> para perderlo y observá el cwnd y los ACKs duplicados.',
  );
  readonly done = signal(false);

  private rtoTimer: number | null = null; // ms del timer del segmento más viejo sin ACK
  readonly timerTick = signal(0);

  private nextId = 1;
  private rafId = 0;
  private lastTs = 0;
  private autoAcc = 0;
  private loopOn = false;

  readonly cwndInt = computed(() => Math.floor(this.cwnd()));
  readonly ssthreshInt = computed(() => Math.floor(this.ssthresh()));
  readonly windowSize = computed(() => Math.min(Math.floor(this.cwnd()), this.rwnd, N));

  phaseLabel(): string {
    return this.phase() === 'ss' ? 'slow start' : this.phase() === 'ca' ? 'congestion avoid.' : 'fast recovery';
  }

  readonly senderSquares = computed(() => {
    this.timerTick();
    const base = this.sendBase();
    const next = this.nextSeq();
    const win = this.windowSize();
    const out: { i: number; cls: string; timerPct: number | null }[] = [];
    for (let i = 0; i < N; i++) {
      let cls = 'off';
      if (i < base) cls = 'ok';
      else if (i < next) cls = 'sent';
      else if (i < base + win) cls = 'ready';
      const timerPct =
        i === base && this.rtoTimer !== null ? Math.min((this.rtoTimer / RTO) * 100, 100) : null;
      out.push({ i, cls: 'sq ' + cls, timerPct });
    }
    return out;
  });

  readonly receiverSquares = computed(() => {
    const del = this.deliveredV();
    const buf = this.bufferedV();
    const out: { i: number; cls: string }[] = [];
    for (let i = 0; i < N; i++) {
      let cls = 'off';
      if (del[i]) cls = 'del';
      else if (buf[i]) cls = 'buf';
      out.push({ i, cls: 'sq ' + cls });
    }
    return out;
  });

  // ---- sparkline ----
  private readonly maxCw = RWND + 2;
  ssLast(): number {
    const h = this.cwndHist();
    return h[h.length - 1]?.ss ?? SSTHRESH0;
  }
  sy(v: number): number {
    return 60 - (Math.min(v, this.maxCw) / this.maxCw) * 56;
  }
  private sx(i: number, len: number): number {
    if (len <= 1) return 0;
    return (i / (len - 1)) * 200;
  }
  readonly cwndPath = computed(() => {
    const h = this.cwndHist();
    if (h.length < 2) return '';
    return h.map((pt, i) => this.sx(i, h.length).toFixed(1) + ',' + this.sy(pt.cwnd).toFixed(1)).join(' ');
  });
  readonly cwndMarks = computed(() => {
    const h = this.cwndHist();
    const out: { x: number; y: number; cls: string }[] = [];
    h.forEach((pt, i) => {
      if (pt.ev) out.push({ x: this.sx(i, h.length), y: this.sy(pt.cwnd), cls: pt.ev });
    });
    return out;
  });

  private pushCwnd(ev?: 'fr' | 'to'): void {
    this.cwndHist.update((h) => {
      const nh = [...h, { cwnd: this.cwnd(), ss: this.ssthresh(), ev }];
      return nh.length > 90 ? nh.slice(nh.length - 90) : nh;
    });
  }

  canSend(): boolean {
    return !this.done() && this.nextSeq() - this.sendBase() < this.windowSize() && this.nextSeq() < N;
  }

  flightX(f: Flight): number {
    const laneOffset = f.kind === 'ack' ? 2.2 : -1.2;
    return ((f.seq + 0.5) / N) * 100 + laneOffset;
  }
  flightY(f: Flight): number {
    const h = 150;
    const p = Math.min(f.lost ? Math.min(f.p, 0.55) : f.p, 1);
    return f.kind === 'data' ? 8 + p * h : 8 + (1 - p) * h;
  }
  flightOpacity(f: Flight): number {
    if (!f.lost) return 1;
    return Math.max(0, 1 - Math.max(0, f.p - 0.55) / 0.25);
  }

  toggleAuto(): void {
    this.auto.update((v) => !v);
    if (this.auto()) {
      this.autoAcc = AUTO_GAP;
      this.ensureLoop();
    }
  }

  send(): void {
    if (!this.canSend()) return;
    const seq = this.nextSeq();
    this.spawnData(seq, false);
    this.nextSeq.set(seq + 1);
    if (this.rtoTimer === null) this.rtoTimer = 0;
    this.log.set('📤 Cliente: sale <strong>seq ' + seq + '</strong>. En vuelo: ' + (seq + 1 - this.sendBase()) + ' (ventana ' + this.windowSize() + ').');
    this.ensureLoop();
  }

  shoot(id: number): void {
    this.flights.update((arr) =>
      arr.map((f) => {
        if (f.id === id && !f.lost && f.p < 0.85) {
          this.log.set(
            '💥 ¡Perdiste <strong>' + (f.kind === 'data' ? 'seq ' : 'ack ') + f.seq + '</strong>! Mirá qué gatilla: 3 ACKs duplicados (fast retransmit) o, si el flujo se corta, un timeout.',
          );
          return { ...f, lost: true };
        }
        return f;
      }),
    );
  }

  private spawnData(seq: number, retx: boolean): void {
    this.flights.update((arr) => [...arr, { id: this.nextId++, seq, kind: 'data', p: 0, lost: false, retx }]);
  }
  private spawnAck(ackNum: number): void {
    this.flights.update((arr) => [...arr, { id: this.nextId++, seq: ackNum, kind: 'ack', p: 0, lost: false, retx: false }]);
  }

  private ensureLoop(): void {
    if (this.loopOn) return;
    this.loopOn = true;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }
  private stopLoop(): void {
    this.loopOn = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.loopOn) return;
    const dt = Math.min(now - this.lastTs, 100) * this.speed();
    this.lastTs = now;

    const arrivedData: number[] = [];
    const arrivedAcks: number[] = [];
    this.flights.update((arr) => {
      const next: Flight[] = [];
      for (const f of arr) {
        const np = f.p + dt / TRAVEL;
        if (f.lost) {
          if (np < 0.85) next.push({ ...f, p: np });
          continue;
        }
        if (np >= 1) {
          (f.kind === 'data' ? arrivedData : arrivedAcks).push(f.seq);
        } else {
          next.push({ ...f, p: np });
        }
      }
      return next;
    });
    for (const seq of arrivedData) this.onDataArrive(seq);
    for (const ack of arrivedAcks) this.onAckArrive(ack);

    // timer RTO
    if (this.rtoTimer !== null) {
      this.rtoTimer += dt;
      if (this.rtoTimer >= RTO) this.onTimeout();
    }
    this.timerTick.update((v) => v + 1);

    if (this.auto()) {
      this.autoAcc += dt;
      if (this.autoAcc >= AUTO_GAP) {
        this.autoAcc = 0;
        if (this.canSend()) this.send();
      }
    }

    this.checkDone();

    const idle = this.flights().length === 0 && this.rtoTimer === null && !this.auto();
    if (idle || this.done()) {
      this.stopLoop();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private onDataArrive(seq: number): void {
    const rb = this.rcvBase();
    if (seq < rb) {
      // ya entregado → re-ACK acumulativo
      this.spawnAck(rb);
      return;
    }
    if (!this.buffered[seq]) {
      this.buffered[seq] = true;
      this.bufferedV.set([...this.buffered]);
    }
    // entregar contiguos desde rcvBase
    let r = rb;
    const del = [...this.deliveredV()];
    while (r < N && this.buffered[r]) {
      del[r] = true;
      r++;
    }
    this.deliveredV.set(del);
    this.rcvBase.set(r);
    if (seq === rb) {
      this.log.set('📥 Servidor: <strong>seq ' + seq + '</strong> en orden → entrego a la app y ACKeo pidiendo <strong>' + r + '</strong> (acumulativo).');
    } else {
      this.log.set('📥 Servidor: seq ' + seq + ' fuera de orden → lo <strong>BUFFEREO</strong> (violeta) y mando <strong>ACK duplicado</strong> pidiendo ' + r + '.');
    }
    this.spawnAck(r); // ACK = próximo esperado
  }

  private onAckArrive(ack: number): void {
    const base = this.sendBase();
    if (ack > base) {
      // ACK NUEVO
      this.sendBase.set(ack);
      this.dupAcks.set(0);
      if (this.phase() === 'fr') {
        // salir de fast recovery: cwnd baja a ssthresh (deflación)
        this.cwnd.set(this.ssthresh());
        this.phase.set('ca');
        this.log.set('✅ Cliente: ACK ' + ack + ' confirma la retransmisión → sale de <strong>fast recovery</strong>, cwnd = ssthresh = ' + this.ssthreshInt() + ' (congestion avoidance).');
      } else {
        if (this.cwnd() < this.ssthresh()) {
          // slow start: +1 MSS por ACK (exponencial por RTT)
          this.cwnd.update((c) => c + 1);
          if (this.cwnd() >= this.ssthresh()) this.phase.set('ca');
          this.log.set('✅ Cliente: ACK ' + ack + ' nuevo → <strong>slow start</strong>: cwnd = ' + this.cwndInt() + ' (se duplica cada RTT).');
        } else {
          // congestion avoidance: +1 MSS por RTT ≈ +1/cwnd por ACK
          this.cwnd.update((c) => c + 1 / c);
          this.phase.set('ca');
          this.log.set('✅ Cliente: ACK ' + ack + ' nuevo → <strong>congestion avoidance</strong>: cwnd sube +1/cwnd (≈ ' + this.cwnd().toFixed(2) + ').');
        }
      }
      this.pushCwnd();
      this.rtoTimer = this.sendBase() < this.nextSeq() ? 0 : null;
    } else if (ack === base) {
      // ACK DUPLICADO
      this.dupAcks.update((d) => d + 1);
      const d = this.dupAcks();
      if (d === 3) {
        // FAST RETRANSMIT (Reno)
        const nss = Math.max(Math.floor(this.cwnd() / 2), 2);
        this.ssthresh.set(nss);
        this.cwnd.set(nss + 3);
        this.phase.set('fr');
        this.spawnData(base, true);
        this.rtoTimer = 0;
        this.pushCwnd('fr');
        this.log.set('⚡ <strong>3 ACKs duplicados</strong> → <strong>FAST RETRANSMIT</strong> de seq ' + base + ' sin esperar timeout. ssthresh = cwnd/2 = ' + nss + ', cwnd = ' + this.cwndInt() + ' (fast recovery). Es la señal LEVE: los ACKs siguen fluyendo.');
      } else if (d > 3) {
        // inflar ventana en fast recovery
        this.cwnd.update((c) => c + 1);
        this.pushCwnd();
        this.log.set('✅ Cliente: ACK dup #' + d + ' → infla cwnd a ' + this.cwndInt() + ' (cada dup extra es un segmento que SÍ llegó).');
      } else {
        this.log.set('✅ Cliente: ACK ' + ack + ' <strong>duplicado</strong> (#' + d + '). Con 3 se dispara fast retransmit — todavía falta.');
      }
    }
    // ack < base: viejo, se ignora
  }

  private onTimeout(): void {
    const base = this.sendBase();
    if (base >= N) {
      this.rtoTimer = null;
      return;
    }
    const nss = Math.max(Math.floor(this.cwnd() / 2), 2);
    this.ssthresh.set(nss);
    this.cwnd.set(1);
    this.phase.set('ss');
    this.dupAcks.set(0);
    this.spawnData(base, true);
    this.rtoTimer = 0;
    this.pushCwnd('to');
    this.log.set('⏰ <strong>TIMEOUT</strong> de seq ' + base + ' → señal GRAVE: <strong>cwnd = 1</strong> y vuelta a slow start (ssthresh = ' + nss + '). No llegaron suficientes ACKs para fast retransmit.');
  }

  private checkDone(): void {
    if (this.done()) return;
    if (this.sendBase() >= N && this.rcvBase() >= N && this.flights().length === 0) {
      this.done.set(true);
      this.auto.set(false);
      this.rtoTimer = null;
      this.log.set('🎉 <strong>Transferencia completa</strong>: los ' + N + ' segmentos entregados en orden. Fijate en la curva de cwnd: el arranque exponencial (slow start) y los "dientes de sierra" que dejó cada pérdida (AIMD).');
    }
  }

  reset(): void {
    this.stopLoop();
    this.auto.set(false);
    this.done.set(false);
    this.sendBase.set(0);
    this.nextSeq.set(0);
    this.cwnd.set(1);
    this.ssthresh.set(SSTHRESH0);
    this.dupAcks.set(0);
    this.phase.set('ss');
    this.rcvBase.set(0);
    this.buffered = Array(N).fill(false);
    this.deliveredV.set(Array(N).fill(false));
    this.bufferedV.set(Array(N).fill(false));
    this.flights.set([]);
    this.cwndHist.set([{ cwnd: 1, ss: SSTHRESH0 }]);
    this.rtoTimer = null;
    this.timerTick.update((v) => v + 1);
    this.log.set('Reiniciado. Arrancá con ▶ Auto y, cuando la ventana crezca, tirá un segmento para ver fast retransmit vs timeout.');
  }

  ngOnDestroy(): void {
    this.stopLoop();
  }
}
