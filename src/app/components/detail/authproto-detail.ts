import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

/* La escalera de protocolos de autenticación (Kurose cap. 8): ap1.0 → ap5.0.
   Cada versión cae por un ataque distinto; el nonce es lo que frena el replay. */

type Who = 'A' | 'B' | 'T';
interface Line { who: Who; text: string; evil?: boolean; }

interface AStep {
  ver: string;
  idea: string;
  lines: Line[];
  broken: boolean;
  attack?: string;
  msg: string;
}

const STEPS: AStep[] = [
  {
    ver: 'ap1.0', idea: 'Alice simplemente dice quién es',
    lines: [{ who: 'A', text: '"Soy Alice"' }],
    broken: true, attack: 'suplantación directa',
    msg: '<strong>ap1.0</strong>: Alice le dice a Bob "soy Alice". <strong>Cualquiera puede decir lo mismo</strong> — no hay nada que probar la identidad. Trudy manda el mismo mensaje y Bob le cree.',
  },
  {
    ver: 'ap1.0', idea: 'Alice simplemente dice quién es',
    lines: [{ who: 'A', text: '"Soy Alice"' }, { who: 'T', text: '"Soy Alice" 😈', evil: true }],
    broken: true, attack: 'suplantación directa',
    msg: '💥 <strong>Roto</strong>. Trudy dice exactamente lo mismo y Bob no tiene forma de distinguirlas. Necesitamos algo que Trudy <em>no pueda</em> producir.',
  },
  {
    ver: 'ap2.0', idea: 'Agregar la dirección IP de origen',
    lines: [{ who: 'A', text: '"Soy Alice" · desde IP 200.1.1.5' }],
    broken: true, attack: 'IP spoofing',
    msg: '<strong>ap2.0</strong>: agreguemos la <strong>IP de origen</strong> — Bob verifica que venga de la IP conocida de Alice. Suena razonable…',
  },
  {
    ver: 'ap2.0', idea: 'Agregar la dirección IP de origen',
    lines: [{ who: 'A', text: '"Soy Alice" · desde IP 200.1.1.5' }, { who: 'T', text: '"Soy Alice" · IP falsificada 200.1.1.5 😈', evil: true }],
    broken: true, attack: 'IP spoofing',
    msg: '💥 <strong>Roto por IP spoofing</strong>: Trudy arma paquetes <strong>poniendo la IP de Alice en el campo de origen</strong>. Nada en IP impide escribir una IP origen falsa.',
  },
  {
    ver: 'ap3.0', idea: 'Agregar una contraseña secreta',
    lines: [{ who: 'A', text: '"Soy Alice" · password: hunter2' }],
    broken: true, attack: 'sniffing',
    msg: '<strong>ap3.0</strong>: usemos un <strong>secreto</strong> que solo Alice conoce: una <strong>contraseña</strong>. Ahora sí Trudy no debería poder…',
  },
  {
    ver: 'ap3.0', idea: 'Agregar una contraseña secreta',
    lines: [{ who: 'A', text: '"Soy Alice" · password: hunter2' }, { who: 'T', text: '🕵 sniffea la red y LEE la password', evil: true }, { who: 'T', text: '"Soy Alice" · password: hunter2 😈', evil: true }],
    broken: true, attack: 'sniffing',
    msg: '💥 <strong>Roto por sniffing</strong>: la contraseña viaja <strong>en claro</strong>. Trudy escucha el canal una sola vez, la lee, y después la usa cuando quiere.',
  },
  {
    ver: 'ap3.1', idea: 'Cifrar la contraseña',
    lines: [{ who: 'A', text: '"Soy Alice" · K(password) 🔒' }],
    broken: true, attack: 'replay attack',
    msg: '<strong>ap3.1</strong>: obvio, <strong>ciframos la contraseña</strong>. Ahora Trudy la escucha pero no puede leerla. Parece resuelto… <strong>y acá está la trampa del oral</strong>.',
  },
  {
    ver: 'ap3.1', idea: 'Cifrar la contraseña',
    lines: [{ who: 'A', text: '"Soy Alice" · K(password) 🔒' }, { who: 'T', text: '🕵 graba esos bytes cifrados (sin entenderlos)', evil: true }, { who: 'T', text: '"Soy Alice" · K(password) 🔒 — reenvía igual 😈', evil: true }],
    broken: true, attack: 'replay attack',
    msg: '💥 <strong>Roto por REPLAY</strong>: Trudy <strong>no necesita descifrar nada</strong>. Graba los bytes cifrados tal cual y los <strong>reenvía después</strong>. Bob los descifra, dan bien, y la deja pasar. <strong>Cifrar no alcanza si el mensaje es siempre el mismo.</strong>',
  },
  {
    ver: 'ap4.0', idea: 'Nonce: un número que se usa UNA sola vez',
    lines: [
      { who: 'A', text: '"Soy Alice"' },
      { who: 'B', text: 'nonce R = 7f3a91 (distinto cada vez)' },
      { who: 'A', text: 'K(R) 🔒 — cifra ESE nonce' },
    ],
    broken: false,
    msg: '<strong>ap4.0</strong>: Bob manda un <strong>nonce R</strong> — un número aleatorio <strong>que se usa una sola vez</strong>. Alice debe devolver <span class="f">K(R)</span>. Bob descifra y verifica que sea su R.',
  },
  {
    ver: 'ap4.0', idea: 'Nonce: un número que se usa UNA sola vez',
    lines: [
      { who: 'A', text: '"Soy Alice"' },
      { who: 'B', text: 'nonce R = 7f3a91 (distinto cada vez)' },
      { who: 'A', text: 'K(R) 🔒 — cifra ESE nonce' },
      { who: 'T', text: '🕵 grabó K(R viejo)… pero Bob ahora manda OTRO R ✖', evil: true },
    ],
    broken: false,
    msg: '✅ <strong>El replay ya no sirve</strong>: lo que Trudy grabó responde a un R viejo, y Bob <strong>manda un R nuevo cada vez</strong>. El nonce prueba que Alice está <strong>viva y respondiendo AHORA</strong>, no que alguien grabó algo antes.',
  },
  {
    ver: 'ap5.0', idea: 'Lo mismo pero con criptografía asimétrica',
    lines: [
      { who: 'A', text: '"Soy Alice"' },
      { who: 'B', text: 'nonce R' },
      { who: 'A', text: 'priv-A(R) — firma el nonce con su PRIVADA' },
      { who: 'B', text: 'verifica con pub-A ✔' },
    ],
    broken: false,
    msg: '<strong>ap5.0</strong>: la misma idea sin secreto compartido — Alice <strong>firma el nonce con su clave privada</strong> y Bob verifica con la pública. Ventaja: no hace falta acordar una clave de antemano.',
  },
  {
    ver: 'ap5.0', idea: 'Lo mismo pero con criptografía asimétrica',
    lines: [
      { who: 'A', text: '"Soy Alice"' },
      { who: 'B', text: 'nonce R' },
      { who: 'A', text: 'priv-A(R)' },
      { who: 'T', text: '😈 le da a Bob SU pública diciendo que es la de Alice', evil: true },
    ],
    broken: true, attack: 'MITM sobre la clave pública',
    msg: '💥 Pero ap5.0 <strong>cae por MITM</strong> si Bob no puede confirmar de quién es esa clave pública: Trudy le pasa la suya haciéndose pasar por Alice. <strong>La solución son los certificados</strong> — por eso la cripto asimétrica <strong>siempre viene acompañada de PKI</strong>.',
  },
];

@Component({
  selector: 'app-authproto-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🪜 La escalera de autenticación: ap1.0 → ap5.0</div>
          <div class="caption">Cada versión ingenua y el ataque exacto que la rompe.</div>
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

      <div class="panel">
        <div class="phead">
          <span class="ver">{{ cur().ver }}</span>
          <span class="idea">{{ cur().idea }}</span>
          @if (index() >= 0) {
            <span class="badge" [class.bad]="cur().broken">
              {{ cur().broken ? '💥 ROTO — ' + cur().attack : '✅ resiste' }}
            </span>
          }
        </div>

        <div class="conv">
          <div class="heads">
            <span class="hd a">👩 Alice</span>
            <span class="hd b">🧔 Bob</span>
          </div>
          @for (l of cur().lines; track $index) {
            <div class="line" [class]="'w-' + l.who" [class.evil]="l.evil">
              <span class="who">{{ l.who === 'A' ? '👩' : l.who === 'B' ? '🧔' : '🕵' }}</span>
              <span class="txt">{{ l.text }}</span>
              <span class="dir">{{ l.who === 'B' ? '←' : '→' }}</span>
            </div>
          }
          @if (cur().lines.length === 0) {
            <div class="empty">(presioná ▶ Play)</div>
          }
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

      <div class="recap">
        <div class="rhead">📌 Resumen: qué rompe a cada versión</div>
        <div class="rrow" [class.on]="cur().ver === 'ap1.0'"><span class="rv">ap1.0</span><span>"soy Alice"</span><span class="rk">cualquiera lo dice</span></div>
        <div class="rrow" [class.on]="cur().ver === 'ap2.0'"><span class="rv">ap2.0</span><span>+ IP de origen</span><span class="rk">IP spoofing</span></div>
        <div class="rrow" [class.on]="cur().ver === 'ap3.0'"><span class="rv">ap3.0</span><span>+ contraseña</span><span class="rk">sniffing</span></div>
        <div class="rrow" [class.on]="cur().ver === 'ap3.1'"><span class="rv">ap3.1</span><span>+ contraseña cifrada</span><span class="rk">replay (se reenvía sin descifrar)</span></div>
        <div class="rrow ok" [class.on]="cur().ver === 'ap4.0'"><span class="rv">ap4.0</span><span>+ <b>nonce</b> R → K(R)</span><span class="rk g">resiste el replay ✔</span></div>
        <div class="rrow" [class.on]="cur().ver === 'ap5.0'"><span class="rv">ap5.0</span><span>+ nonce con clave pública</span><span class="rk">MITM → hacen falta certificados</span></div>
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

    .panel { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .phead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .ver { font-family: Consolas, monospace; font-weight: 800; font-size: 0.9rem; color: #fff; background: #ef4444; border-radius: 7px; padding: 3px 10px; }
    .idea { font-size: 0.78rem; color: var(--text); }
    .badge { margin-left: auto; font-size: 0.68rem; font-weight: 800; padding: 3px 10px; border-radius: 8px; color: #7ee787; background: rgba(46,160,67,0.12); border: 1px solid #2ea04355; }
    .badge.bad { color: #ff8a80; background: rgba(178,59,59,0.14); border-color: #b23b3b66; }

    .conv { display: flex; flex-direction: column; gap: 5px; }
    .heads { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .hd { font-size: 0.66rem; font-weight: 700; color: var(--text-dim); }
    .line { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: #1b2438; border: 1px solid #2d3750; animation: slide 0.35s ease; }
    @keyframes slide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
    .line.w-B { background: #16283d; border-color: #1f6feb44; flex-direction: row-reverse; }
    .line.evil { background: #3d2a2a; border-color: #b23b3b; }
    .who { font-size: 0.9rem; flex-shrink: 0; }
    .txt { flex: 1; font-family: Consolas, monospace; font-size: 0.7rem; color: #cfe3ff; }
    .line.evil .txt { color: #ff8a80; }
    .dir { color: #5c6a8e; font-weight: 800; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.72rem; padding: 10px; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .status .f { font-family: Consolas, monospace; background: #10151f; border: 1px solid #2d3750; border-radius: 5px; padding: 0 5px; color: #79c0ff; }

    .recap { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .rhead { font-weight: 700; font-size: 0.78rem; color: #fff; margin-bottom: 8px; }
    .rrow { display: grid; grid-template-columns: 0.5fr 1.2fr 1.3fr; gap: 8px; font-size: 0.68rem; padding: 6px 8px; border-radius: 6px; align-items: center; background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; color: var(--text); opacity: 0.55; transition: opacity 0.3s, border-color 0.3s; }
    .rrow.on { opacity: 1; border-color: #ef444488; background: #1f1a24; }
    .rrow.ok.on { border-color: #2ea04388; background: #16251c; }
    .rv { font-family: Consolas, monospace; font-weight: 800; color: #cfe3ff; }
    .rk { color: #ef9a9a; } .rk.g { color: #7ee787; font-weight: 700; }
    .rrow b { color: #ffd54f; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 700px) { .rrow { grid-template-columns: 0.6fr 1fr; } .rrow span:last-child { grid-column: 1 / -1; } }
  `,
})
export class AuthprotoDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 600;
  }
  protected override stepDwell(): number {
    return 4300;
  }

  readonly cur = computed<AStep>(() => {
    const i = this.index();
    if (i < 0) return { ver: 'ap1.0', idea: 'presioná Play para empezar', lines: [], broken: false, msg: '' };
    return STEPS[Math.min(i, STEPS.length - 1)];
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>La moraleja de la escalera</strong>: cada arreglo intuitivo cae por un ataque distinto. Las dos ideas que quedan: <strong>(1) el nonce</strong> — obliga a probar que estás vivo AHORA, y mata el <strong>replay</strong>; <strong>(2) los certificados</strong> — sin ellos, la clave pública se puede sustituir y todo cae por <strong>MITM</strong>. Cifrar, por sí solo, <strong>no autentica</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: vas a ver cinco intentos de autenticar a Alice, y cómo se rompe cada uno.';
    return STEPS[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
