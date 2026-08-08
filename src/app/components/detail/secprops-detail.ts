import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Las 5 propiedades de seguridad (Kurose cap. 8): cada una es INDEPENDIENTE
   y se consigue con un mecanismo distinto. Cifrar no resuelve todo. */

interface Prop {
  id: string;
  icon: string;
  name: string;
  short: string;
  garantiza: string;
  ataque: string;
  ataqueEj: string;
  mecanismo: string;
  mecEj: string;
}

const PROPS: Prop[] = [
  {
    id: 'conf', icon: '🔒', name: 'Confidencialidad', short: 'que nadie lo LEA',
    garantiza: 'Solo el emisor y el receptor entienden el contenido del mensaje.',
    ataque: 'Sniffing (escucha pasiva)',
    ataqueEj: 'Trudy captura el tráfico y lee todo lo que pasa por el canal.',
    mecanismo: 'CIFRADO',
    mecEj: 'AES (simétrico) para el volumen · RSA para acordar la clave.',
  },
  {
    id: 'integ', icon: '🧩', name: 'Integridad', short: 'que nadie lo CAMBIE',
    garantiza: 'Cualquier alteración del mensaje en tránsito se detecta.',
    ataque: 'Modificación en tránsito',
    ataqueEj: 'Trudy intercepta el mensaje, le cambia el monto de la transferencia y lo reenvía.',
    mecanismo: 'HASH + MAC / HMAC',
    mecEj: 'Se manda una huella del mensaje mezclada con un secreto compartido.',
  },
  {
    id: 'auth', icon: '🪪', name: 'Autenticación', short: 'saber CON QUIÉN hablás',
    garantiza: 'Confirmar la identidad del otro extremo (y el origen de cada mensaje).',
    ataque: 'Suplantación / MITM / replay',
    ataqueEj: 'Trudy se hace pasar por Alice, o reenvía un mensaje válido que grabó antes.',
    mecanismo: 'NONCE + firma/MAC + CERTIFICADOS',
    mecEj: 'El nonce prueba que estás vivo ahora; el certificado, que la clave pública es tuya.',
  },
  {
    id: 'norep', icon: '✍', name: 'No repudio', short: 'que no pueda NEGARLO',
    garantiza: 'El emisor no puede negar después haber enviado el mensaje.',
    ataque: 'El propio emisor niega el envío',
    ataqueEj: 'Alice firma una orden de pago y después dice "yo nunca mandé eso".',
    mecanismo: 'FIRMA DIGITAL (y solo ella)',
    mecEj: 'Hash cifrado con la clave PRIVADA del emisor: nadie más pudo generarlo.',
  },
  {
    id: 'disp', icon: '⚡', name: 'Disponibilidad', short: 'que el servicio FUNCIONE',
    garantiza: 'El servicio sigue accesible para los usuarios legítimos.',
    ataque: 'DoS / DDoS',
    ataqueEj: 'SYN flood: se abren miles de conexiones a medias hasta agotar los recursos.',
    mecanismo: 'Redundancia, filtrado, rate limiting',
    mecEj: 'SYN cookies, scrubbing centers, CDNs que absorben el tráfico.',
  },
];

interface SStep { prop: number; phase: 'garantiza' | 'ataque' | 'mecanismo' | 'cierre'; msg: string; }

const STEPS: SStep[] = [
  {
    prop: -1, phase: 'cierre',
    msg: 'La seguridad no es <strong>una</strong> cosa: son <strong>cinco propiedades distintas e independientes</strong>. El error clásico de oral es creer que <strong>cifrar</strong> las resuelve todas — cada una necesita <strong>su propio mecanismo</strong>.',
  },
  ...PROPS.flatMap((p, i): SStep[] => [
    { prop: i, phase: 'garantiza', msg: `<strong>${p.name}</strong> — ${p.garantiza}` },
    { prop: i, phase: 'ataque', msg: `❌ <strong>Si falta</strong>: ${p.ataqueEj} <em>(${p.ataque})</em>` },
    { prop: i, phase: 'mecanismo', msg: `✅ <strong>Se consigue con ${p.mecanismo}</strong>. ${p.mecEj}` },
  ]),
  {
    prop: -1, phase: 'cierre',
    msg: '👉 <strong>Las tres confusiones que se preguntan</strong>: <strong>(1)</strong> integridad ≠ confidencialidad — un mensaje puede llegar íntegro pero leído por todos, o cifrado pero alterado; <strong>(2)</strong> <strong>cifrar no autentica</strong> — cifrar el mensaje no prueba quién lo mandó; <strong>(3)</strong> <strong>HMAC no da no repudio</strong>, porque los dos extremos comparten el secreto y ambos pueden generarlo: para eso hace falta la <strong>firma digital</strong>.',
  },
];

@Component({
  selector: 'app-secprops-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎯 Las 5 propiedades: qué ataca a cada una y con qué se logra</div>
          <div class="caption">Son independientes — cifrar no resuelve todo.</div>
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

      <div class="cards">
        @for (p of props; track p.id; let i = $index) {
          <button class="card" [class.on]="curProp() === i" [class.done]="isSeen(i)" (click)="goTo(i)">
            <span class="ci">{{ p.icon }}</span>
            <span class="cn">{{ p.name }}</span>
            <span class="cs">{{ p.short }}</span>
          </button>
        }
      </div>

      @if (cur(); as p) {
        <div class="detail">
          <div class="dtop"><span class="di">{{ p.icon }}</span><span class="dn">{{ p.name }}</span></div>
          <div class="drow" [class.on]="phaseAt('garantiza')">
            <span class="dl">garantiza</span>
            <span class="dv">{{ p.garantiza }}</span>
          </div>
          <div class="drow bad" [class.on]="phaseAt('ataque')">
            <span class="dl">❌ si falta</span>
            <span class="dv"><b>{{ p.ataque }}</b> — {{ p.ataqueEj }}</span>
          </div>
          <div class="drow good" [class.on]="phaseAt('mecanismo')">
            <span class="dl">✅ mecanismo</span>
            <span class="dv"><b>{{ p.mecanismo }}</b> — {{ p.mecEj }}</span>
          </div>
        </div>
      } @else {
        <div class="matrix">
          <div class="mrow mh"><span>propiedad</span><span>la ataca…</span><span>se logra con…</span></div>
          @for (p of props; track p.id) {
            <div class="mrow">
              <span class="mp">{{ p.icon }} {{ p.name }}</span>
              <span class="ma">{{ p.ataque }}</span>
              <span class="mm">{{ p.mecanismo }}</span>
            </div>
          }
        </div>
      }

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

    .cards { display: flex; gap: 6px; flex-wrap: wrap; }
    .card { flex: 1; min-width: 118px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; padding: 11px 7px; border-radius: 10px; background: #161d2b; border: 1.5px solid #232b3e; cursor: pointer; opacity: 0.5; transition: all 0.3s; font-family: inherit; }
    .card:hover { opacity: 0.85; }
    .card.done { opacity: 0.85; border-color: #2ea04355; }
    .card.on { opacity: 1; background: #241a1a; border-color: #ef4444; box-shadow: 0 0 16px rgba(239,68,68,0.28); transform: translateY(-2px); }
    .ci { font-size: 1.15rem; }
    .cn { font-size: 0.72rem; font-weight: 800; color: #fff; }
    .cs { font-size: 0.56rem; color: var(--text-dim); }

    .detail { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .dtop { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
    .di { font-size: 1.2rem; } .dn { font-size: 0.9rem; font-weight: 800; color: #fff; }
    .drow { display: grid; grid-template-columns: 0.5fr 2.5fr; gap: 10px; align-items: start; padding: 8px 10px; border-radius: 8px; background: #161d2b; border: 1px solid #232b3e; margin-bottom: 5px; opacity: 0.35; transition: opacity 0.35s, border-color 0.35s, background 0.35s; }
    .drow.on { opacity: 1; }
    .drow.bad.on { background: rgba(178,59,59,0.12); border-color: #b23b3b66; }
    .drow.good.on { background: rgba(46,160,67,0.1); border-color: #2ea04366; }
    .dl { font-size: 0.62rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; }
    .dv { font-size: 0.76rem; color: var(--text); line-height: 1.5; }
    .drow.bad .dv b { color: #ff8a80; } .drow.good .dv b { color: #7ee787; }

    .matrix { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .mrow { display: grid; grid-template-columns: 1.1fr 1.2fr 1.3fr; gap: 8px; font-size: 0.7rem; padding: 7px 8px; border-radius: 6px; align-items: center; }
    .mrow.mh { font-size: 0.56rem; text-transform: uppercase; font-weight: 700; color: #5c6a8e; }
    .mrow:not(.mh) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 4px; }
    .mp { font-weight: 700; color: #fff; } .ma { color: #ef9a9a; } .mm { color: #7ee787; font-weight: 600; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 700px) {
      .drow { grid-template-columns: 1fr; gap: 3px; }
      .mrow { grid-template-columns: 1fr; gap: 2px; } .mrow.mh { display: none; }
    }
  `,
})
export class SecpropsDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly props = PROPS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 400;
  }
  protected override stepDwell(): number {
    return 3600;
  }

  private at(): SStep | null {
    const i = this.index();
    if (i < 0) return null;
    if (this.finished()) return STEPS[STEPS.length - 1];
    return STEPS[Math.min(i, STEPS.length - 1)];
  }

  curProp(): number {
    return this.at()?.prop ?? -1;
  }

  cur(): Prop | null {
    const p = this.curProp();
    return p >= 0 ? PROPS[p] : null;
  }

  /** una propiedad ya "vista" si algún paso anterior la mostró */
  isSeen(i: number): boolean {
    if (this.finished()) return true;
    const idx = this.index();
    if (idx < 0) return false;
    for (let s = 0; s <= Math.min(idx, STEPS.length - 1); s++) {
      if (STEPS[s].prop === i) return true;
    }
    return false;
  }

  /** la fase actual habilita las filas de forma acumulativa */
  phaseAt(ph: 'garantiza' | 'ataque' | 'mecanismo'): boolean {
    const st = this.at();
    if (!st || st.prop < 0) return false;
    const order = ['garantiza', 'ataque', 'mecanismo'];
    return order.indexOf(ph) <= order.indexOf(st.phase);
  }

  goTo(i: number): void {
    const s = STEPS.findIndex((st) => st.prop === i);
    if (s >= 0) this.jump(s);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) return STEPS[STEPS.length - 1].msg;
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: una por una, qué garantiza cada propiedad, qué ataque la rompe y con qué mecanismo se consigue.';
    return STEPS[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
