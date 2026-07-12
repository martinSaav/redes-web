import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

interface Flight {
  id: number;
  seq: number;
  kind: 'data' | 'ack';
  p: number; // 0..1
  lost: boolean;
  retx: boolean;
}

const TOTAL = 8;
const N = 4;
const TRAVEL = 2600; // ms de viaje
const RTO = 6800; // ms de timeout
const AUTO_GAP = 1150; // ms entre envíos automáticos

@Component({
  selector: 'app-gbn-sim',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎮 Simulador: Go-Back-N vs Selective Repeat</div>
          <div class="caption">
            Vos manejás la red: <strong>hacé click en un paquete en vuelo para perderlo</strong> y mirá cómo reacciona cada protocolo.
          </div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'gbn'" (click)="setMode('gbn')">GBN</button>
            <button [class.on]="mode() === 'sr'" (click)="setMode('sr')">SR</button>
          </div>
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

      <div class="board">
        <!-- EMISOR -->
        <div class="strip-row">
          <div class="side-label">
            EMISOR
            <small>base={{ base() }} · nextseq={{ nextSeq() }}</small>
          </div>
          <div class="strip">
            <div
              class="window"
              [style.left.%]="(base() / totalCount) * 100"
              [style.width.%]="(windowSize() / totalCount) * 100"
            >
              <span class="wlabel">ventana N={{ n }}</span>
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
          <div class="channel-hint">— el canal · click en un paquete = 💥 se pierde —</div>
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
              title="Click para perder este paquete"
            >
              {{ f.kind === 'data' ? 'pkt' + f.seq : 'ACK' + f.seq }}
            </button>
          }
        </div>

        <!-- RECEPTOR -->
        <div class="strip-row">
          <div class="side-label">
            RECEPTOR
            <small>
              @if (mode() === 'gbn') { espero pkt{{ expected() }} } @else { rcv_base={{ rcvBase() }} }
            </small>
          </div>
          <div class="strip">
            @if (mode() === 'sr') {
              <div
                class="window rwin"
                [style.left.%]="(rcvBase() / totalCount) * 100"
                [style.width.%]="(rcvWindowSize() / totalCount) * 100"
              ></div>
            }
            @for (sq of receiverSquares(); track sq.i) {
              <div class="sq" [class]="sq.cls">
                {{ sq.i }}
                @if (mode() === 'gbn' && sq.i === expected() && expected() < totalCount) {
                  <div class="pointer">▲</div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="legend">
        <span><i class="lg ok"></i> confirmado / entregado</span>
        <span><i class="lg sent"></i> enviado, sin ACK</span>
        <span><i class="lg ready"></i> usable (en ventana)</span>
        @if (mode() === 'sr') {
          <span><i class="lg buf"></i> buffereado fuera de orden</span>
        }
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 460px; }
    .caption strong { color: #ffd54f; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-weight: 700; font-size: 0.88rem; }
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.send { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; }
    .ctl.send:hover:not(:disabled) { background: #388bfd; }
    .ctl.autoOn { background: #2ea043; border-color: #2ea043; color: #fff; font-weight: 700; }
    .speeds { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
    .strip-row { display: flex; align-items: center; gap: 12px; }
    .side-label { width: 92px; flex-shrink: 0; font-size: 0.72rem; font-weight: 800; color: var(--text-dim); letter-spacing: 0.5px; display: flex; flex-direction: column; }
    .side-label small { font-weight: 500; color: #5c6a8e; font-family: Consolas, monospace; font-size: 0.68rem; }
    .strip { position: relative; flex: 1; display: flex; gap: 0; padding: 8px 0; }
    .sq {
      position: relative; flex: 1; margin: 0 3px; height: 44px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1rem; font-family: Consolas, monospace;
      background: #1a2132; color: #5c6a8e; border: 1.5px solid #2d3750;
      transition: background 0.25s, border-color 0.25s, color 0.25s;
    }
    .sq.ok { background: #1d3b26; border-color: #2ea043; color: #7ee787; }
    .sq.sent { background: #3b3418; border-color: #d29922; color: #ffd54f; }
    .sq.ready { background: #172036; border-color: #1f6feb; border-style: dashed; color: #79c0ff; }
    .sq.buf { background: #2d1d47; border-color: #a78bfa; color: #d2b9ff; }
    .tbar { position: absolute; left: 4px; right: 4px; bottom: 3px; height: 4px; background: #0b0f19; border-radius: 2px; overflow: hidden; }
    .tfill { height: 100%; background: #ef5350; border-radius: 2px; }
    .pointer { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); color: #ffd54f; font-size: 0.75rem; }
    .window {
      position: absolute; top: 0; bottom: 0; border: 2px solid #ffd54f; border-radius: 11px;
      pointer-events: none; transition: left 0.45s ease, width 0.45s ease; z-index: 2;
    }
    .window.rwin { border-color: #a78bfa; }
    .wlabel { position: absolute; top: -10px; left: 8px; background: #171e2e; color: #ffd54f; font-size: 0.66rem; font-weight: 700; padding: 0 6px; border-radius: 4px; }

    .channel { position: relative; height: 190px; margin: 6px 0 6px 104px; border-top: 1px dashed #2d3750; border-bottom: 1px dashed #2d3750; }
    .channel-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #39445f; font-size: 0.75rem; white-space: nowrap; pointer-events: none; }
    .flight {
      position: absolute; transform: translateX(-50%); z-index: 3;
      background: #ffd54f; color: #1a1a1a; border: none; border-radius: 7px;
      font-family: Consolas, monospace; font-weight: 800; font-size: 0.78rem;
      padding: 5px 8px; cursor: crosshair; box-shadow: 0 0 12px rgba(255, 213, 79, 0.5);
    }
    .flight.ack { background: #7ee787; box-shadow: 0 0 12px rgba(126, 231, 135, 0.5); }
    .flight.retx { background: #ef9a9a; box-shadow: 0 0 12px rgba(239, 154, 154, 0.6); }
    .flight.lost { cursor: default; }
    .flight:hover:not(.lost) { outline: 2px solid #fff; }

    .legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; font-size: 0.78rem; color: var(--text-dim); }
    .lg { display: inline-block; width: 13px; height: 13px; border-radius: 4px; vertical-align: -2px; margin-right: 5px; border: 1.5px solid transparent; }
    .lg.ok { background: #1d3b26; border-color: #2ea043; }
    .lg.sent { background: #3b3418; border-color: #d29922; }
    .lg.ready { background: #172036; border-color: #1f6feb; border-style: dashed; }
    .lg.buf { background: #2d1d47; border-color: #a78bfa; }
    .lg.tmr { background: #ef5350; }

    .status { margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.93rem; display: flex; align-items: center; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
  `,
})
export class GbnSim implements OnDestroy {
  readonly totalCount = TOTAL;
  readonly n = N;
  readonly speedOptions = [0.5, 1, 2];

  readonly mode = signal<'gbn' | 'sr'>('gbn');
  readonly speed = signal(1);
  readonly auto = signal(false);

  // emisor
  readonly base = signal(0);
  readonly nextSeq = signal(0);
  private acked: boolean[] = Array(TOTAL).fill(false); // SR

  // receptor
  readonly expected = signal(0); // GBN
  readonly rcvBase = signal(0); // SR
  private buffered: boolean[] = Array(TOTAL).fill(false);
  readonly deliveredV = signal<boolean[]>(Array(TOTAL).fill(false));
  readonly ackedV = signal<boolean[]>(Array(TOTAL).fill(false));
  readonly bufferedV = signal<boolean[]>(Array(TOTAL).fill(false));

  readonly flights = signal<Flight[]>([]);
  readonly log = signal(
    'Elegí el modo, mandá paquetes con 📤 (o activá ▶ Auto) y rompé la red haciendo click en los paquetes en vuelo. Compará después con el otro modo.',
  );
  readonly done = signal(false);

  // timers
  private gbnTimer: number | null = null; // ms transcurridos
  private srTimers = new Map<number, number>();
  readonly timerTick = signal(0); // fuerza refresco visual de barras

  private nextId = 1;
  private rafId = 0;
  private lastTs = 0;
  private autoAcc = 0;
  private loopOn = false;

  readonly windowSize = computed(() => Math.min(N, TOTAL - this.base()));
  readonly rcvWindowSize = computed(() => Math.min(N, TOTAL - this.rcvBase()));

  readonly senderSquares = computed(() => {
    this.timerTick();
    const base = this.base();
    const next = this.nextSeq();
    const acked = this.ackedV();
    const out: { i: number; cls: string; timerPct: number | null }[] = [];
    for (let i = 0; i < TOTAL; i++) {
      let cls = 'off';
      if (i < base || (this.mode() === 'sr' && acked[i])) cls = 'ok';
      else if (i < next) cls = 'sent';
      else if (i < base + N) cls = 'ready';
      let timerPct: number | null = null;
      if (this.mode() === 'gbn') {
        if (i === base && this.gbnTimer !== null) timerPct = Math.min((this.gbnTimer / RTO) * 100, 100);
      } else {
        const t = this.srTimers.get(i);
        if (t !== undefined) timerPct = Math.min((t / RTO) * 100, 100);
      }
      out.push({ i, cls: 'sq ' + cls, timerPct });
    }
    return out;
  });

  readonly receiverSquares = computed(() => {
    const del = this.deliveredV();
    const buf = this.bufferedV();
    const out: { i: number; cls: string }[] = [];
    for (let i = 0; i < TOTAL; i++) {
      let cls = 'off';
      if (del[i]) cls = 'ok';
      else if (buf[i]) cls = 'buf';
      out.push({ i, cls: 'sq ' + cls });
    }
    return out;
  });

  canSend(): boolean {
    return !this.done() && this.nextSeq() < this.base() + N && this.nextSeq() < TOTAL;
  }

  flightX(f: Flight): number {
    const laneOffset = f.kind === 'ack' ? 2.2 : -1.2;
    return ((f.seq + 0.5) / TOTAL) * 100 + laneOffset;
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

  setMode(m: 'gbn' | 'sr'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
    this.log.set(
      m === 'gbn'
        ? '<strong>Go-Back-N</strong>: receptor simple (solo acepta EN ORDEN), UN timer, ACKs acumulativos. Ante timeout retransmite TODA la ventana.'
        : '<strong>Selective Repeat</strong>: el receptor BUFFEREA fuera de orden, ACKs individuales, un timer POR paquete. Retransmite solo lo perdido.',
    );
  }

  reset(): void {
    this.stopLoop();
    this.auto.set(false);
    this.done.set(false);
    this.base.set(0);
    this.nextSeq.set(0);
    this.expected.set(0);
    this.rcvBase.set(0);
    this.acked = Array(TOTAL).fill(false);
    this.buffered = Array(TOTAL).fill(false);
    this.ackedV.set(Array(TOTAL).fill(false));
    this.bufferedV.set(Array(TOTAL).fill(false));
    this.deliveredV.set(Array(TOTAL).fill(false));
    this.flights.set([]);
    this.gbnTimer = null;
    this.srTimers.clear();
    this.timerTick.update((v) => v + 1);
    this.log.set('Simulación reiniciada. Mandá paquetes con 📤 o activá ▶ Auto.');
  }

  toggleAuto(): void {
    this.auto.update((v) => !v);
    if (this.auto()) {
      this.autoAcc = AUTO_GAP; // dispara uno ya
      this.ensureLoop();
    }
  }

  send(): void {
    if (!this.canSend()) return;
    const seq = this.nextSeq();
    this.spawnData(seq, false);
    this.nextSeq.set(seq + 1);
    if (this.mode() === 'gbn') {
      if (this.gbnTimer === null) this.gbnTimer = 0;
    } else {
      this.srTimers.set(seq, 0);
    }
    this.log.set('📤 Emisor: sale <strong>pkt' + seq + '</strong>. En vuelo sin confirmar: ' + (seq + 1 - this.base()) + ' (máx ' + N + ').');
    this.ensureLoop();
  }

  shoot(id: number): void {
    this.flights.update((arr) =>
      arr.map((f) => {
        if (f.id === id && !f.lost && f.p < 0.85) {
          this.log.set('💥 ¡Perdiste <strong>' + (f.kind === 'data' ? 'pkt' : 'ACK') + f.seq + '</strong>! Ahora mirá cómo se recupera el protocolo…');
          return { ...f, lost: true };
        }
        return f;
      }),
    );
  }

  private spawnData(seq: number, retx: boolean): void {
    this.flights.update((arr) => [...arr, { id: this.nextId++, seq, kind: 'data', p: 0, lost: false, retx }]);
  }
  private spawnAck(seq: number): void {
    this.flights.update((arr) => [...arr, { id: this.nextId++, seq, kind: 'ack', p: 0, lost: false, retx: false }]);
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

    // avanzar vuelos
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
          if (f.kind === 'data') arrivedData.push(f.seq);
          else arrivedAcks.push(f.seq);
        } else {
          next.push({ ...f, p: np });
        }
      }
      return next;
    });
    for (const seq of arrivedData) this.onDataArrive(seq);
    for (const seq of arrivedAcks) this.onAckArrive(seq);

    // timers
    if (this.mode() === 'gbn') {
      if (this.gbnTimer !== null) {
        this.gbnTimer += dt;
        if (this.gbnTimer >= RTO) this.gbnTimeout();
      }
    } else {
      const expired: number[] = [];
      for (const [seq, t] of this.srTimers) {
        const nt = t + dt;
        this.srTimers.set(seq, nt);
        if (nt >= RTO) expired.push(seq);
      }
      for (const seq of expired) {
        this.srTimers.set(seq, 0);
        this.spawnData(seq, true);
        this.log.set('⏰ Timeout de <strong>pkt' + seq + '</strong> → SR retransmite <strong>SOLO ese</strong> (timer individual).');
      }
    }
    this.timerTick.update((v) => v + 1);

    // auto-envío
    if (this.auto()) {
      this.autoAcc += dt;
      if (this.autoAcc >= AUTO_GAP) {
        this.autoAcc = 0;
        if (this.canSend()) this.send();
      }
    }

    // ¿terminó todo?
    this.checkDone();

    const idle =
      this.flights().length === 0 && this.gbnTimer === null && this.srTimers.size === 0 && !this.auto();
    if (idle || this.done()) {
      this.stopLoop();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private gbnTimeout(): void {
    const from = this.base();
    const to = this.nextSeq();
    this.gbnTimer = 0;
    for (let s = from; s < to; s++) this.spawnData(s, true);
    this.log.set(
      '⏰ <strong>TIMEOUT</strong> → GBN retransmite <strong>TODA la ventana</strong>: pkt' + from + '…pkt' + (to - 1) + ' ("volvé N atrás"), aunque algunos hayan llegado bien.',
    );
  }

  private onDataArrive(seq: number): void {
    if (this.mode() === 'gbn') {
      const exp = this.expected();
      if (seq === exp) {
        this.deliveredV.update((d) => d.map((v, i) => (i === seq ? true : v)));
        this.expected.set(exp + 1);
        this.log.set('📥 Receptor: <strong>pkt' + seq + '</strong> EN ORDEN → entregado a la app. Mando <strong>ACK' + seq + '</strong> (acumulativo).');
        this.spawnAck(seq);
      } else if (seq < exp) {
        this.log.set('📥 Receptor: pkt' + seq + ' duplicado (ya lo tenía) → re-ACK' + (exp - 1) + '.');
        this.spawnAck(exp - 1);
      } else {
        if (exp > 0) {
          this.log.set('📥 Receptor GBN: <strong>pkt' + seq + ' FUERA de orden</strong> (esperaba pkt' + exp + ') → <strong>DESCARTADO</strong> (no bufferea) + re-ACK' + (exp - 1) + ' duplicado.');
          this.spawnAck(exp - 1);
        } else {
          this.log.set('📥 Receptor GBN: pkt' + seq + ' fuera de orden (esperaba pkt0) → descartado. No hay nada en orden que re-ACKear.');
        }
      }
    } else {
      // SR
      const rb = this.rcvBase();
      if (seq >= rb + N) return; // fuera de ventana
      if (!this.buffered[seq]) {
        this.buffered[seq] = true;
        this.bufferedV.set([...this.buffered]);
        if (seq === rb) {
          this.log.set('📥 Receptor SR: <strong>pkt' + seq + '</strong> en orden → ACK' + seq + ' individual. Entrego todo lo contiguo.');
        } else {
          this.log.set('📥 Receptor SR: pkt' + seq + ' fuera de orden → <strong>lo BUFFEREO</strong> (violeta) y mando ACK' + seq + ' individual.');
        }
      } else {
        this.log.set('📥 Receptor SR: pkt' + seq + ' duplicado → re-ACK' + seq + ' igual (el ACK anterior pudo perderse).');
      }
      this.spawnAck(seq);
      // entregar contiguos
      let r = this.rcvBase();
      const del = [...this.deliveredV()];
      while (r < TOTAL && this.buffered[r]) {
        del[r] = true;
        r++;
      }
      this.deliveredV.set(del);
      this.rcvBase.set(r);
    }
  }

  private onAckArrive(seq: number): void {
    if (this.mode() === 'gbn') {
      if (seq >= this.base()) {
        this.base.set(seq + 1);
        this.log.set('✅ Emisor: llega <strong>ACK' + seq + '</strong> acumulativo → la ventana desliza: base=' + (seq + 1) + '.');
        if (this.base() < this.nextSeq()) this.gbnTimer = 0;
        else this.gbnTimer = null;
      } else {
        this.log.set('✅ Emisor: ACK' + seq + ' duplicado/viejo — no mueve la ventana (en TCP, 3 de estos disparan fast retransmit).');
      }
    } else {
      this.acked[seq] = true;
      this.ackedV.set([...this.acked]);
      this.srTimers.delete(seq);
      let b = this.base();
      while (b < TOTAL && this.acked[b]) b++;
      if (b !== this.base()) {
        this.base.set(b);
        this.log.set('✅ Emisor SR: ACK' + seq + ' individual → base desliza hasta ' + b + '.');
      } else {
        this.log.set('✅ Emisor SR: ACK' + seq + ' individual → marcado, pero la base espera a pkt' + this.base() + '.');
      }
    }
  }

  private checkDone(): void {
    if (this.done()) return;
    const senderDone = this.base() >= TOTAL;
    const rcvDone = this.mode() === 'gbn' ? this.expected() >= TOTAL : this.rcvBase() >= TOTAL;
    if (senderDone && rcvDone && this.flights().length === 0) {
      this.done.set(true);
      this.auto.set(false);
      this.gbnTimer = null;
      this.srTimers.clear();
      this.log.set(
        '🎉 <strong>Transferencia completa</strong>: los ' + TOTAL + ' paquetes entregados EN ORDEN a la aplicación. Probá el mismo caos en el otro modo (' + (this.mode() === 'gbn' ? 'SR' : 'GBN') + ') y compará cuántas retransmisiones hubo.',
      );
    }
  }

  ngOnDestroy(): void {
    this.stopLoop();
  }
}
