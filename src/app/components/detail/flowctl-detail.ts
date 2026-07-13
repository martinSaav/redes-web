import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';

interface Flight {
  id: number;
  bytes: number; // tamaño en "celdas"
  kind: 'data' | 'ack';
  ackRwnd?: number; // rwnd anunciado (para acks)
  probe?: boolean;
  p: number;
  seq: number;
}

const RCVBUF = 10; // capacidad del buffer del receptor (celdas)
const SEG = 2; // tamaño de cada segmento
const TRAVEL = 2200;
const AUTO_GAP = 700;
const PROBE_GAP = 2600; // cada cuánto manda una sonda si rwnd=0

@Component({
  selector: 'app-flowctl-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🚰 Control de flujo TCP: rwnd y el buffer del receptor</div>
          <div class="caption">
            Vos sos la app lenta: apretá <strong>📖 leer</strong> para consumir del buffer. Mirá cómo <strong>rwnd</strong> frena al emisor
            (esto NO es congestión — es no desbordar al RECEPTOR).
          </div>
        </div>
        <div class="controls">
          <button class="ctl read" (click)="appRead()" [disabled]="lastByteRead() >= lastByteRcvd()">📖 leer {{ seg }}</button>
          <button class="ctl" [class.autoOn]="autoSend()" (click)="toggleSend()">{{ autoSend() ? '⏸' : '▶' }} emisor</button>
          <button class="ctl" [class.autoOn]="autoRead()" (click)="toggleRead()">{{ autoRead() ? '⏸' : '🐢' }} app lenta</button>
          <button class="ctl" (click)="reset()">↺</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="speed.set(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <span class="mlab">rwnd anunciado</span>
          <span class="mval" [class.zero]="rwnd() === 0">{{ rwnd() }} <small>libre en buffer</small></span>
        </div>
        <div class="metric">
          <span class="mlab">buffer del receptor</span>
          <span class="mval">{{ occupied() }} / {{ rcvbuf }} <small>ocupado</small></span>
        </div>
        <div class="metric">
          <span class="mlab">en vuelo (sin ACK)</span>
          <span class="mval">{{ inFlight() }} <small>≤ rwnd</small></span>
        </div>
        <div class="metric wide">
          <span class="mlab">regla del emisor</span>
          <span class="mval formula">LastByteSent − LastByteAcked ≤ rwnd</span>
        </div>
      </div>

      <div class="board">
        <!-- EMISOR -->
        <div class="endp sender">
          <div class="ehead">💻 Emisor</div>
          <div class="esub">manda mientras enVuelo &lt; rwnd</div>
          <div class="ebadge" [class.blocked]="rwnd() === 0">
            {{ rwnd() === 0 ? '⏸ frenado (rwnd = 0)' : 'enviando…' }}
          </div>
        </div>

        <!-- CANAL -->
        <div class="channel">
          @for (f of flights(); track f.id) {
            <div class="flight" [class.ack]="f.kind === 'ack'" [class.probe]="f.probe"
                 [style.left.%]="flightX(f)" [style.top.px]="flightY(f)">
              {{ f.kind === 'data' ? (f.probe ? 'sonda 1B' : 'datos ' + f.bytes) : 'ACK · rwnd=' + f.ackRwnd }}
            </div>
          }
        </div>

        <!-- RECEPTOR -->
        <div class="endp receiver">
          <div class="ehead">🖥 Receptor</div>
          <div class="buffer">
            @for (c of bufCells(); track c.i) {
              <div class="bcell" [class]="c.cls"></div>
            }
          </div>
          <div class="blegend">
            <span><i class="bc read"></i> leído por la app</span>
            <span><i class="bc data"></i> en buffer (sin leer)</span>
            <span><i class="bc free"></i> libre = rwnd</span>
          </div>
          <div class="apptag">app {{ autoRead() ? 'leyendo lento 🐢' : 'sin leer' }}</div>
        </div>
      </div>

      <div class="status" [class.warn]="rwnd() === 0">
        <span [innerHTML]="log()"></span>
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
    .caption strong { color: #ffd54f; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.88rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.read { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; }
    .ctl.read:hover:not(:disabled) { background: #388bfd; }
    .ctl.autoOn { background: #2ea043; border-color: #2ea043; color: #fff; font-weight: 700; }
    .speeds { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .metrics { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .metric { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; min-width: 130px; }
    .metric.wide { flex: 1; min-width: 240px; }
    .mlab { font-size: 0.6rem; color: #5c6a8e; text-transform: uppercase; letter-spacing: 0.03em; }
    .mval { font-family: Consolas, monospace; font-size: 1.15rem; font-weight: 800; color: #7ee787; }
    .mval small { font-size: 0.58rem; color: #5c6a8e; font-weight: 500; }
    .mval.zero { color: #ef5350; }
    .mval.formula { font-size: 0.82rem; color: #cfe3ff; }

    .board { background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; align-items: stretch; gap: 10px; overflow: hidden; }
    .endp { flex-shrink: 0; width: 150px; display: flex; flex-direction: column; gap: 6px; }
    .endp.sender { align-items: flex-start; }
    .endp.receiver { width: 210px; align-items: stretch; }
    .ehead { font-weight: 800; font-size: 0.9rem; color: #fff; }
    .esub { font-size: 0.66rem; color: #8b95b5; }
    .ebadge { font-size: 0.72rem; font-weight: 700; padding: 5px 10px; border-radius: 8px; background: #16281c; color: #7ee787; border: 1px solid #2ea04355; margin-top: auto; }
    .ebadge.blocked { background: #2b1618; color: #ef9a9a; border-color: #b23b3b55; }

    .channel { position: relative; flex: 1; min-width: 0; height: 150px; align-self: center; border-top: 1px dashed #2d3750; border-bottom: 1px dashed #2d3750; }
    .flight { position: absolute; transform: translate(-50%,-50%); z-index: 3; font-family: Consolas, monospace; font-weight: 800; font-size: 0.68rem; padding: 4px 7px; border-radius: 6px; white-space: nowrap; background: #ffd54f; color: #1a1a1a; box-shadow: 0 0 10px rgba(255,213,79,0.5); }
    .flight.ack { background: #7ee787; box-shadow: 0 0 10px rgba(126,231,135,0.5); }
    .flight.probe { background: #ce93d8; box-shadow: 0 0 10px rgba(206,147,216,0.5); }

    .buffer { display: flex; gap: 3px; flex-wrap: wrap; background: #0b0f19; border: 1.5px solid #2d3750; border-radius: 8px; padding: 6px; }
    .bcell { width: 16px; height: 22px; border-radius: 3px; background: #10151f; border: 1px solid #2d3750; transition: background 0.3s, border-color 0.3s; }
    .bcell.data { background: #d29922; border-color: #ffd54f; }
    .bcell.read { background: #1d3b26; border-color: #2ea043; }
    .bcell.free { background: #10151f; border-color: #2d3750; }
    .blegend { display: flex; flex-direction: column; gap: 2px; font-size: 0.58rem; color: #8b95b5; }
    .bc { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
    .bc.read { background: #1d3b26; border: 1px solid #2ea043; }
    .bc.data { background: #d29922; border: 1px solid #ffd54f; }
    .bc.free { background: #10151f; border: 1px solid #2d3750; }
    .apptag { font-size: 0.66rem; color: #8b95b5; text-align: center; margin-top: auto; }

    .status { margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.93rem; display: flex; align-items: center; line-height: 1.45; }
    .status.warn { border-color: #b23b3b66; background: rgba(239,83,80,0.08); }

    @media (max-width: 720px) { .board { flex-direction: column; align-items: center; } .channel { width: 100%; } }
  `,
})
export class FlowctlDetail implements OnDestroy {
  readonly rcvbuf = RCVBUF;
  readonly seg = SEG;
  readonly speedOptions = [0.5, 1, 2];

  readonly speed = signal(1);
  readonly autoSend = signal(false);
  readonly autoRead = signal(false);

  // receptor
  readonly lastByteRcvd = signal(0); // total recibido y en buffer
  readonly lastByteRead = signal(0); // total consumido por la app
  // emisor
  readonly lastByteSent = signal(0);
  readonly lastByteAcked = signal(0);

  readonly flights = signal<Flight[]>([]);
  readonly log = signal(
    'Prendé el <strong>▶ emisor</strong> y dejá la <strong>🐢 app lenta</strong>: vas a ver el buffer llenarse y rwnd caer a 0. Después apretá <strong>📖 leer</strong> para reabrir la ventana.',
  );

  readonly occupied = computed(() => this.lastByteRcvd() - this.lastByteRead());
  readonly rwnd = computed(() => Math.max(RCVBUF - this.occupied(), 0));
  readonly inFlight = computed(() => this.lastByteSent() - this.lastByteAcked());

  private nextId = 1;
  private nextSeq = 0;
  private rafId = 0;
  private lastTs = 0;
  private sendAcc = 0;
  private readAcc = 0;
  private probeAcc = 0;
  private loopOn = false;

  readonly bufCells = computed(() => {
    const read = this.lastByteRead();
    const rcvd = this.lastByteRcvd();
    // ventana visible de RCVBUF celdas: [read .. read+RCVBUF)
    const out: { i: number; cls: string }[] = [];
    for (let k = 0; k < RCVBUF; k++) {
      const abs = read + k;
      let cls = 'free';
      if (abs < rcvd) cls = 'data';
      out.push({ i: k, cls: 'bcell ' + cls });
    }
    return out;
  });

  flightX(f: Flight): number {
    return f.kind === 'data' ? 5 + this.ease(f.p) * 90 : 95 - this.ease(f.p) * 90;
  }
  flightY(f: Flight): number {
    const h = 110;
    return f.kind === 'data' ? 18 + f.p * h : 18 + (1 - f.p) * h;
  }

  private canSend(): boolean {
    return this.inFlight() + SEG <= this.rwnd() && this.rwnd() > 0;
  }

  private doSend(): void {
    const seq = this.nextSeq;
    this.nextSeq += SEG;
    this.lastByteSent.update((v) => v + SEG);
    this.flights.update((a) => [...a, { id: this.nextId++, bytes: SEG, kind: 'data', p: 0, seq }]);
  }

  private sendProbe(): void {
    this.flights.update((a) => [...a, { id: this.nextId++, bytes: 1, kind: 'data', p: 0, seq: this.nextSeq, probe: true }]);
    this.log.set('🔎 rwnd = 0 → el emisor manda una <strong>sonda de ventana (1 byte)</strong>. Si no lo hiciera, cuando el receptor libere espacio no tendría cómo avisar (no manda ACKs sin datos) → <strong>bloqueo eterno</strong>.');
  }

  appRead(): void {
    if (this.lastByteRead() >= this.lastByteRcvd()) return;
    const before = this.rwnd();
    this.lastByteRead.update((v) => Math.min(v + SEG, this.lastByteRcvd()));
    const after = this.rwnd();
    if (before === 0 && after > 0) {
      this.log.set('📖 La app leyó ' + SEG + ' bytes → se libera espacio → el receptor anunciará <strong>rwnd = ' + after + '</strong> en su próximo ACK y el emisor <strong>vuelve a arrancar</strong>.');
    } else {
      this.log.set('📖 La app consumió ' + SEG + ' bytes del buffer → rwnd sube a ' + after + '.');
    }
    this.ensureLoop();
  }

  toggleSend(): void {
    this.autoSend.update((v) => !v);
    if (this.autoSend()) { this.sendAcc = AUTO_GAP; this.ensureLoop(); }
  }
  toggleRead(): void {
    this.autoRead.update((v) => !v);
    if (this.autoRead()) { this.readAcc = 0; this.ensureLoop(); }
  }

  private ensureLoop(): void {
    if (this.loopOn) return;
    this.loopOn = true;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (!this.loopOn) return;
    const dt = Math.min(now - this.lastTs, 100) * this.speed();
    this.lastTs = now;

    // avanzar vuelos
    const arrData: Flight[] = [];
    const arrAck: Flight[] = [];
    this.flights.update((arr) => {
      const next: Flight[] = [];
      for (const f of arr) {
        const np = f.p + dt / TRAVEL;
        if (np >= 1) (f.kind === 'data' ? arrData : arrAck).push(f);
        else next.push({ ...f, p: np });
      }
      return next;
    });
    for (const f of arrData) this.onData(f);
    if (arrAck.length) this.onAck();

    // emisor automático
    if (this.autoSend()) {
      this.sendAcc += dt;
      if (this.sendAcc >= AUTO_GAP) {
        this.sendAcc = 0;
        if (this.canSend()) this.doSend();
      }
      // sondas de ventana si rwnd=0
      if (this.rwnd() === 0 && this.inFlight() === 0) {
        this.probeAcc += dt;
        if (this.probeAcc >= PROBE_GAP) { this.probeAcc = 0; this.sendProbe(); }
      } else {
        this.probeAcc = 0;
      }
    }
    // app lenta automática
    if (this.autoRead()) {
      this.readAcc += dt;
      if (this.readAcc >= 1900) {
        this.readAcc = 0;
        if (this.lastByteRead() < this.lastByteRcvd()) this.appRead();
      }
    }

    const idle = this.flights().length === 0 && !this.autoSend() && !this.autoRead();
    if (idle) { this.loopOn = false; cancelAnimationFrame(this.rafId); return; }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private onData(f: Flight): void {
    if (f.probe) {
      // la sonda no ocupa buffer real; solo provoca un ACK con el rwnd actual
      this.spawnAck();
      return;
    }
    // el receptor guarda en buffer solo lo que entra (respeta la capacidad)
    const room = RCVBUF - this.occupied();
    const store = Math.min(f.bytes, Math.max(room, 0));
    this.lastByteRcvd.update((v) => v + store);
    if (store < f.bytes) {
      this.log.set('📥 Receptor: el segmento no entra entero (buffer casi lleno). Guarda lo que puede y anuncia <strong>rwnd = ' + this.rwnd() + '</strong>.');
    } else if (this.rwnd() === 0) {
      this.log.set('📥 Receptor: buffer <strong>LLENO</strong> → anuncia <strong>rwnd = 0</strong>. El emisor debe FRENAR (si no, desbordaría al receptor).');
    } else {
      this.log.set('📥 Receptor: guardó ' + store + ' bytes. Espacio libre → anuncia <strong>rwnd = ' + this.rwnd() + '</strong>.');
    }
    this.spawnAck();
  }

  private spawnAck(): void {
    this.flights.update((a) => [...a, { id: this.nextId++, bytes: 0, kind: 'ack', p: 0, seq: 0, ackRwnd: this.rwnd() }]);
  }

  private onAck(): void {
    // el ACK confirma lo recibido y comunica rwnd (que el emisor lee en canSend)
    this.lastByteAcked.set(this.lastByteRcvd());
  }

  reset(): void {
    this.loopOn = false;
    cancelAnimationFrame(this.rafId);
    this.autoSend.set(false);
    this.autoRead.set(false);
    this.lastByteRcvd.set(0);
    this.lastByteRead.set(0);
    this.lastByteSent.set(0);
    this.lastByteAcked.set(0);
    this.flights.set([]);
    this.nextSeq = 0;
    this.log.set('Reiniciado. Prendé ▶ emisor + 🐢 app lenta y mirá cómo rwnd cae a 0; después leé con 📖 para reabrir la ventana.');
  }

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.loopOn = false;
    cancelAnimationFrame(this.rafId);
  }
}
