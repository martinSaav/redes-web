import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

interface SeqMsg {
  from: 'c' | 's';
  t0: number;
  t1: number;
  label: string;
  color: string;
  lost?: boolean;
}
interface SeqState {
  side: 'c' | 's';
  t: number;
  state: string;
}
interface SeqAnn {
  t: number;
  text: string;
}

const MSGS: SeqMsg[] = [
  { from: 'c', t0: 500, t1: 2000, label: 'SYN · seq=100', color: '#ffd54f' },
  { from: 's', t0: 2600, t1: 4100, label: 'SYN-ACK · seq=300, ack=101', color: '#ffd54f' },
  { from: 'c', t0: 4700, t1: 6200, label: 'ACK · ack=301', color: '#ffd54f' },
  { from: 'c', t0: 7000, t1: 8500, label: 'DATA · seq=101 · 500 B', color: '#80d8ff' },
  { from: 'c', t0: 7700, t1: 9200, label: 'DATA · seq=601 · 500 B', color: '#80d8ff' },
  { from: 's', t0: 9100, t1: 10600, label: 'ACK · ack=601', color: '#a5d6a7' },
  { from: 's', t0: 9800, t1: 11300, label: 'ACK · ack=1101', color: '#a5d6a7' },
  { from: 'c', t0: 12200, t1: 13700, label: 'DATA · seq=1101 · 500 B', color: '#80d8ff', lost: true },
  { from: 'c', t0: 17200, t1: 18700, label: 'DATA · seq=1101 ↻ retransmisión', color: '#ef9a9a' },
  { from: 's', t0: 19200, t1: 20700, label: 'ACK · ack=1601', color: '#a5d6a7' },
  { from: 'c', t0: 21600, t1: 23100, label: 'FIN · seq=1601', color: '#ce93d8' },
  { from: 's', t0: 23700, t1: 25200, label: 'ACK · ack=1602', color: '#ce93d8' },
  { from: 's', t0: 25800, t1: 27300, label: 'FIN · seq=801', color: '#ce93d8' },
  { from: 'c', t0: 27900, t1: 29400, label: 'ACK · ack=802', color: '#ce93d8' },
];

const STATES: SeqState[] = [
  { side: 'c', t: 0, state: 'CLOSED' },
  { side: 's', t: 0, state: 'LISTEN' },
  { side: 'c', t: 500, state: 'SYN_SENT' },
  { side: 's', t: 2000, state: 'SYN_RCVD' },
  { side: 'c', t: 4700, state: 'ESTABLISHED' },
  { side: 's', t: 6200, state: 'ESTABLISHED' },
  { side: 'c', t: 21600, state: 'FIN_WAIT_1' },
  { side: 's', t: 23100, state: 'CLOSE_WAIT' },
  { side: 'c', t: 25200, state: 'FIN_WAIT_2' },
  { side: 's', t: 25800, state: 'LAST_ACK' },
  { side: 'c', t: 27900, state: 'TIME_WAIT' },
  { side: 's', t: 29400, state: 'CLOSED' },
];

const ANNS: SeqAnn[] = [
  { t: 0, text: '<strong>Fase 1 — Three-way handshake</strong>: sincronizar los números de secuencia iniciales (ISN) de ambos lados.' },
  { t: 500, text: '1. <strong>SYN</strong> con ISN aleatorio (seq=100). El cliente pasa a <strong>SYN_SENT</strong>. El ISN aleatorio dificulta que un atacante inyecte segmentos.' },
  { t: 2600, text: '2. <strong>SYN-ACK</strong>: seq=300 (ISN del server), ack=101. El server reserva buffers y variables → <strong>SYN_RCVD</strong> (esto es lo que explota el SYN flood).' },
  { t: 4700, text: '3. <strong>ACK</strong> (ack=301): ambos <strong>ESTABLISHED</strong>. ¿Por qué 3 vías? Cada lado confirma que el otro recibió su ISN, y un SYN viejo duplicado no crea conexiones fantasma.' },
  { t: 6800, text: '<strong>Fase 2 — Datos</strong>: TCP numera <strong>BYTES</strong>, no segmentos. Dos segmentos de 500 bytes salen pipelined: seq=101 y seq=601.' },
  { t: 9100, text: 'ACKs <strong>acumulativos</strong>: ack=601 significa "recibí todo hasta el byte 600, espero el 601". ack=1101 confirma los dos de una.' },
  { t: 11900, text: '<strong>Fase 3 — Pérdida</strong>: sale seq=1101 y el <strong>timer RTO</strong> arranca a correr (barra roja a la izquierda). RTO = EstimatedRTT + 4·DevRTT.' },
  { t: 13800, text: '💥 El segmento <strong>se perdió</strong> en la red. El cliente no lo sabe: solo hay silencio — el ACK que no llega. El timer sigue consumiéndose…' },
  { t: 17000, text: '⏰ <strong>TIMEOUT</strong>: venció el RTO. Retransmite el segmento más viejo sin confirmar y <strong>duplica el RTO</strong> (backoff exponencial — si la red anda mal, no la martilles).' },
  { t: 19300, text: 'ack=1601 confirma la retransmisión. Recuperado sin intervención de nadie: eso es <strong>transferencia confiable</strong> sobre una red que pierde paquetes.' },
  { t: 21500, text: '<strong>Fase 4 — Cierre en 4 vías</strong>: TCP es full-duplex, así que <strong>cada dirección se cierra por separado</strong>. El cliente manda FIN → FIN_WAIT_1.' },
  { t: 23700, text: 'El server ACKea el FIN y queda en <strong>CLOSE_WAIT</strong>: su dirección sigue abierta, puede terminar de mandar lo que le quede.' },
  { t: 25900, text: 'El server manda su propio <strong>FIN</strong> → <strong>LAST_ACK</strong>.' },
  { t: 28000, text: 'ACK final. El cliente espera en <strong>TIME_WAIT</strong> (~2·MSL): puede re-ACKear si el ACK se pierde, y deja morir segmentos rezagados antes de reusar la cuádrupla.' },
];

const T_END = 31200;
const Y_TOP = 100;
const Y_BOT = 770;
const XC = 215;
const XS = 565;

@Component({
  selector: 'app-tcp-seq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">▶ TCP en detalle: diagrama de secuencia completo</div>
          <div class="caption">Handshake · datos con seq/ack reales · pérdida + timeout · cierre en 4 vías. Los estados cambian en vivo.</div>
        </div>
        <div class="controls">
          <button class="ctl play" (click)="toggle()">
            {{ playing() ? '⏸ Pausa' : finished() ? '↺ Repetir' : '▶ Play' }}
          </button>
          <button class="ctl" (click)="reset()" title="Reiniciar">↺</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="setSpeed(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </div>

      <div class="phases">
        @for (ph of phases; track ph.t) {
          <button class="phase" [class.on]="currentPhase() === ph.t" (click)="jumpTo(ph.t)">
            {{ ph.label }}
          </button>
        }
      </div>

      <svg viewBox="0 0 780 810" preserveAspectRatio="xMidYMid meet">
        <!-- cabeceras -->
        <rect [attr.x]="xc - 70" y="18" width="140" height="40" rx="9" fill="#4caf50" />
        <text [attr.x]="xc" y="43" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Cliente</text>
        <rect [attr.x]="xs - 70" y="18" width="140" height="40" rx="9" fill="#1976d2" />
        <text [attr.x]="xs" y="43" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Servidor</text>

        <!-- badges de estado actual -->
        <rect [attr.x]="xc - 66" y="64" width="132" height="22" rx="11" fill="#0b0f19" stroke="#4caf50" />
        <text [attr.x]="xc" y="79" text-anchor="middle" fill="#7ee787" font-size="11.5" font-weight="700" font-family="Consolas, monospace">{{ stateOf('c') }}</text>
        <rect [attr.x]="xs - 66" y="64" width="132" height="22" rx="11" fill="#0b0f19" stroke="#1976d2" />
        <text [attr.x]="xs" y="79" text-anchor="middle" fill="#79c0ff" font-size="11.5" font-weight="700" font-family="Consolas, monospace">{{ stateOf('s') }}</text>

        <!-- líneas de vida -->
        <line [attr.x1]="xc" [attr.y1]="yTop - 6" [attr.x2]="xc" [attr.y2]="timeY()" stroke="#3d4a6b" stroke-width="2.5" />
        <line [attr.x1]="xs" [attr.y1]="yTop - 6" [attr.x2]="xs" [attr.y2]="timeY()" stroke="#3d4a6b" stroke-width="2.5" />
        <text x="30" y="98" fill="#5c6a8e" font-size="10.5">tiempo ↓</text>

        <!-- cambios de estado sobre las líneas de vida -->
        @for (st of visibleStates(); track st.t + st.side) {
          <g>
            <circle [attr.cx]="st.x" [attr.cy]="st.y" r="3.5" [attr.fill]="st.side === 'c' ? '#4caf50' : '#1976d2'" />
            <text
              [attr.x]="st.side === 'c' ? st.x - 10 : st.x + 10"
              [attr.y]="st.y + 4"
              [attr.text-anchor]="st.side === 'c' ? 'end' : 'start'"
              fill="#8b95b5" font-size="10.5" font-family="Consolas, monospace"
            >{{ st.state }}</text>
          </g>
        }

        <!-- barra de timer RTO -->
        @if (timerVisible()) {
          <g>
            <rect [attr.x]="xc - 96" [attr.y]="timerY0" width="10" [attr.height]="timerH" rx="4"
                  fill="#0b0f19" stroke="#5c3030" />
            <rect [attr.x]="xc - 96" [attr.y]="timerY0" width="10" [attr.height]="timerFillH()" rx="4" fill="#ef5350" />
            <text [attr.x]="xc - 91" [attr.y]="timerY0 - 8" text-anchor="middle" fill="#ef9a9a" font-size="11" font-weight="700">RTO</text>
            @if (timerExpired()) {
              <text [attr.x]="xc - 91" [attr.y]="timerY0 + timerH + 20" text-anchor="middle" font-size="15">⏰</text>
            }
          </g>
        }

        <!-- flechas de segmentos -->
        @for (m of visibleMsgs(); track m.key) {
          <g>
            <line [attr.x1]="m.x0" [attr.y1]="m.y0" [attr.x2]="m.xTip" [attr.y2]="m.yTip"
                  [attr.stroke]="m.color" stroke-width="2.4" [attr.opacity]="m.opacity"
                  [attr.stroke-dasharray]="m.lost ? '7 5' : null" />
            @if (m.showHead) {
              <polygon [attr.points]="m.headPts" [attr.fill]="m.color" [attr.opacity]="m.opacity" />
            }
            @if (m.lostMark) {
              <text [attr.x]="m.xTip" [attr.y]="m.yTip + 8" text-anchor="middle" fill="#ef5350" font-size="24" font-weight="900">✖</text>
            }
            @if (m.labelVisible) {
              <g [attr.opacity]="m.opacity">
                <rect [attr.x]="m.labelX - m.labelW / 2" [attr.y]="m.labelY - 13" [attr.width]="m.labelW" height="19" rx="5"
                      fill="rgba(10,14,24,0.94)" stroke="#3d4a6b" stroke-width="0.8" />
                <text [attr.x]="m.labelX" [attr.y]="m.labelY" text-anchor="middle" [attr.fill]="m.color"
                      font-size="11" font-weight="600" font-family="Consolas, monospace">{{ m.label }}</text>
              </g>
            }
          </g>
        }
      </svg>

      <div class="status" [class.done]="finished()" [class.idle]="tMs() === 0 && !playing()">
        <span class="msg" [innerHTML]="statusMsg()"></span>
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover { background: #2d3750; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .ctl.play:hover { background: #388bfd; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }
    .phases { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .phase { background: var(--panel-2); color: var(--text-dim); border: 1px solid var(--border); border-radius: 16px; padding: 5px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
    .phase:hover { color: var(--text); border-color: #58a6ff; }
    .phase.on { background: #1f6feb22; color: #79c0ff; border-color: #1f6feb; }
    svg { width: 100%; height: auto; display: block; background: radial-gradient(ellipse at 50% 30%, #202a40 0%, #171e2e 75%); border: 1px solid var(--border); border-radius: 10px; }
    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
  `,
})
export class TcpSeq implements OnDestroy {
  readonly xc = XC;
  readonly xs = XS;
  readonly yTop = Y_TOP;
  readonly speedOptions = [0.5, 1, 1.5, 2];

  readonly phases = [
    { t: 0, label: '🤝 Handshake' },
    { t: 6800, label: '📦 Datos' },
    { t: 11900, label: '💥 Pérdida' },
    { t: 21500, label: '👋 Cierre' },
  ];

  readonly tMs = signal(0);
  readonly playing = signal(false);
  readonly finished = signal(false);
  readonly speed = signal(1);

  private rafId = 0;
  private lastTs = 0;

  // ---- timer RTO ----
  private readonly timerT0 = 12200;
  private readonly timerT1 = 17000;
  readonly timerY0 = this.yOf(12200);
  readonly timerH = this.yOf(17000) - this.yOf(12200);

  timerVisible(): boolean {
    return this.tMs() >= this.timerT0;
  }
  timerFillH(): number {
    const p = Math.min(Math.max((this.tMs() - this.timerT0) / (this.timerT1 - this.timerT0), 0), 1);
    return this.timerH * p;
  }
  timerExpired(): boolean {
    return this.tMs() >= this.timerT1;
  }

  private yOf(t: number): number {
    return Y_TOP + ((Y_BOT - Y_TOP) * t) / T_END;
  }

  readonly timeY = computed(() => Math.max(this.yOf(this.tMs()), Y_TOP + 4));

  readonly currentPhase = computed(() => {
    const t = this.tMs();
    let cur = 0;
    for (const ph of this.phases) if (t >= ph.t) cur = ph.t;
    return cur;
  });

  stateOf(side: 'c' | 's'): string {
    const t = this.tMs();
    let st = side === 'c' ? 'CLOSED' : 'LISTEN';
    for (const s of STATES) {
      if (s.side === side && s.t <= t) st = s.state;
    }
    return st;
  }

  readonly visibleStates = computed(() => {
    const t = this.tMs();
    return STATES.filter((s) => s.t > 0 && s.t <= t).map((s) => ({
      ...s,
      x: s.side === 'c' ? XC : XS,
      y: this.yOf(s.t),
    }));
  });

  readonly visibleMsgs = computed(() => {
    const t = this.tMs();
    return MSGS.filter((m) => t >= m.t0).map((m, idx) => {
      const rawP = Math.min((t - m.t0) / (m.t1 - m.t0), 1);
      const p = m.lost ? Math.min(rawP, 0.62) : rawP;
      const x0 = m.from === 'c' ? XC : XS;
      const x1 = m.from === 'c' ? XS : XC;
      const y0 = this.yOf(m.t0);
      const y1 = this.yOf(m.t1);
      const xTip = x0 + (x1 - x0) * p;
      const yTip = y0 + (y1 - y0) * p;
      // punta de flecha
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const hl = 9;
      const headPts = [
        `${xTip},${yTip}`,
        `${xTip - hl * Math.cos(ang - 0.44)},${yTip - hl * Math.sin(ang - 0.44)}`,
        `${xTip - hl * Math.cos(ang + 0.44)},${yTip - hl * Math.sin(ang + 0.44)}`,
      ].join(' ');
      const labelX = (x0 + x1) / 2;
      const labelY = (y0 + y1) / 2 - 9;
      return {
        key: idx,
        color: m.color,
        lost: !!m.lost,
        x0,
        y0,
        xTip,
        yTip,
        headPts,
        showHead: !m.lost && p > 0.05,
        lostMark: !!m.lost && rawP >= 0.62,
        opacity: 1,
        label: m.label,
        labelVisible: p > 0.25,
        labelX,
        labelY,
        labelW: m.label.length * 6.6 + 14,
      };
    });
  });

  readonly statusMsg = computed(() => {
    const t = this.tMs();
    if (this.finished()) {
      return '<strong>Ciclo de vida completo.</strong> Conexión establecida (3 vías), datos numerados por byte con ACKs acumulativos, una pérdida recuperada por timeout, y cierre ordenado en 4 vías con TIME_WAIT. Todo el estado vive SOLO en los extremos: la red nunca se enteró.';
    }
    if (t === 0 && !this.playing()) {
      return 'Presioná ▶ Play — o saltá directo a una fase con los botones de arriba. El diagrama se va acumulando: al final tenés la foto completa para repasar.';
    }
    let cur = ANNS[0].text;
    for (const a of ANNS) if (a.t <= t) cur = a.text;
    return cur;
  });

  toggle(): void {
    this.playing() ? this.pause() : this.play();
  }

  play(): void {
    if (this.finished()) {
      this.finished.set(false);
      this.tMs.set(0);
    }
    this.playing.set(true);
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.playing.set(false);
    cancelAnimationFrame(this.rafId);
  }

  reset(): void {
    this.pause();
    this.finished.set(false);
    this.tMs.set(0);
  }

  jumpTo(t: number): void {
    this.finished.set(false);
    this.tMs.set(t);
    if (!this.playing()) this.play();
  }

  setSpeed(s: number): void {
    this.speed.set(s);
  }

  private readonly tick = (now: number): void => {
    if (!this.playing()) return;
    const dt = Math.min(now - this.lastTs, 100) * this.speed();
    this.lastTs = now;
    const nt = this.tMs() + dt;
    if (nt >= T_END) {
      this.tMs.set(T_END);
      this.finished.set(true);
      this.pause();
      return;
    }
    this.tMs.set(nt);
    this.rafId = requestAnimationFrame(this.tick);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
