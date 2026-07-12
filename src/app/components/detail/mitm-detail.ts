import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface MitmStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  evil?: boolean; // Trudy "trabajando" (glow rojo)
  rejected?: boolean; // Alice rechaza (✖ grande)
}

const ALICE: Pos = { x: 12, y: 58 };
const TRUDY: Pos = { x: 50, y: 58 };
const BOB: Pos = { x: 88, y: 58 };
const CA: Pos = { x: 50, y: 13 };

const SIN_STEPS: MitmStep[] = [
  {
    from: ALICE, to: ALICE, text: '🔑 necesito la clave pública de Bob', static: true,
    msg: 'Alice quiere mandarle un secreto a Bob. Para cifrarlo necesita su <strong>clave pública</strong>… y se la pide por la red. Problema: <strong>Trudy está en el medio</strong> (WiFi abierto, ARP spoofing, un router comprometido).',
  },
  {
    from: ALICE, to: TRUDY, text: '¿tu clave pública, Bob?',
    msg: 'La consulta viaja… y pasa por las manos de Trudy.',
  },
  {
    from: TRUDY, to: BOB, text: '¿tu clave pública, Bob?',
    msg: 'Trudy la <strong>deja pasar</strong> tal cual. Nadie sospecha nada — un buen MITM es invisible.',
  },
  {
    from: BOB, to: TRUDY, text: 'K_B (mi clave pública)', color: '#80d8ff',
    msg: 'Bob responde con su clave real… pero la respuesta <strong>muere en Trudy</strong>: la intercepta y la guarda para después.',
  },
  {
    from: TRUDY, to: ALICE, text: 'K_T — "soy Bob" 😈', color: '#ef5350',
    msg: 'Trudy la <strong>REEMPLAZA por SU propia clave</strong>. Alice no tiene forma de distinguirlas: una clave pública es solo un número — <strong>nada la liga a la identidad de Bob</strong>.',
  },
  {
    from: ALICE, to: TRUDY, text: '🔒 secreto cifrado con K_T', color: '#ce93d8',
    msg: 'Alice cifra confiada "con la clave de Bob"… que en realidad es la de Trudy.',
  },
  {
    from: TRUDY, to: TRUDY, text: '😈 descifrando…', static: true, evil: true,
    msg: 'Trudy descifra con SU privada: <strong>LEE todo</strong>, y puede <strong>MODIFICAR</strong> lo que quiera antes de reenviar. Confidencialidad e integridad: rotas.',
  },
  {
    from: TRUDY, to: BOB, text: '🔒 re-cifrado con K_B', color: '#ce93d8',
    msg: 'Re-cifra con la clave REAL de Bob y reenvía. Para Bob, el mensaje llega perfecto. <strong>El canal "funciona": ni Alice ni Bob notan NADA.</strong>',
  },
];

const CON_STEPS: MitmStep[] = [
  {
    from: CA, to: BOB, text: '📜 cert X.509: [Bob, K_B] firmado', color: '#7ee787',
    msg: '<strong>Antes de todo</strong>: Bob fue a una <strong>CA</strong> (Certificate Authority), probó su identidad, y la CA le <strong>firmó un certificado X.509</strong>: la dupla (identidad de Bob + K_B) cifrada-hash con la <strong>clave privada de la CA</strong>.',
  },
  {
    from: ALICE, to: TRUDY, text: '¿tu certificado, Bob?',
    msg: 'Alice vuelve a pedir la clave… pero ahora espera un <strong>certificado</strong>, no una clave suelta.',
  },
  {
    from: TRUDY, to: BOB, text: '¿tu certificado, Bob?',
    msg: 'Trudy deja pasar la consulta, esperando repetir su truco…',
  },
  {
    from: BOB, to: TRUDY, text: '📜 [Bob, K_B] + firma CA', color: '#80d8ff',
    msg: 'Bob manda su certificado. Trudy lo agarra… y acá se le complica: si <strong>cambia K_B por K_T, la firma de la CA deja de verificar</strong> — y no puede re-firmar porque <strong>no tiene la privada de la CA</strong>.',
  },
  {
    from: TRUDY, to: ALICE, text: '📜 [Bob, K_T] firma FALSA 😈', color: '#ef5350',
    msg: 'Supongamos que igual lo intenta: arma un certificado trucho con su clave y una firma inventada…',
  },
  {
    from: ALICE, to: ALICE, text: '🔍 verificando firma…', static: true, rejected: true,
    msg: 'Alice verifica la firma con la <strong>clave pública de la CA</strong> (preinstalada en su trust store): <strong>✖ NO VALIDA → rechaza y corta</strong>. El truco de Trudy quedó al descubierto.',
  },
  {
    from: BOB, to: ALICE, text: '📜 [Bob, K_B] ✔ (el real, verificado)', color: '#7ee787',
    msg: 'A Trudy solo le queda dejar pasar el certificado REAL. Alice verifica la firma: <strong>✔ válida</strong> → ahora sí sabe que K_B es de Bob. La cadena de confianza puede tener CAs intermedias hasta una raíz.',
  },
  {
    from: ALICE, to: BOB, text: '🔒 secreto cifrado con K_B real', color: '#ce93d8',
    msg: 'Alice cifra con la K_B <strong>verificada</strong>. Trudy sigue en el medio y ve pasar el mensaje… pero solo son <strong>bytes indescifrables</strong>: no tiene la privada de Bob.',
  },
];

@Component({
  selector: 'app-mitm-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">😈 Man-in-the-middle: el ataque y por qué la PKI lo frena</div>
          <div class="caption">Primero mirá el ataque funcionar ("Sin PKI"), después cómo el certificado lo rompe ("Con PKI").</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'sin'" (click)="setMode('sin')">Sin PKI 😈</button>
            <button [class.on]="mode() === 'con'" (click)="setMode('con')">Con PKI 🛡</button>
          </div>
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

      <div class="canvas">
        <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line [attr.x1]="alice.x" [attr.y1]="alice.y" [attr.x2]="trudy.x" [attr.y2]="trudy.y" />
          <line [attr.x1]="trudy.x" [attr.y1]="trudy.y" [attr.x2]="bob.x" [attr.y2]="bob.y" />
          @if (mode() === 'con') {
            <line class="calink" [attr.x1]="ca.x" [attr.y1]="ca.y" [attr.x2]="bob.x" [attr.y2]="bob.y" />
            <line class="calink" [attr.x1]="ca.x" [attr.y1]="ca.y" [attr.x2]="alice.x" [attr.y2]="alice.y" />
          }
        </svg>

        @if (mode() === 'con') {
          <div class="node can" [class.active]="active(ca)" [style.left.%]="ca.x" [style.top.%]="ca.y">
            <strong>🏛 CA raíz</strong><small>su clave pública ya está en el trust store de Alice</small>
          </div>
        }

        <div class="node alicen" [class.active]="active(alice)" [style.left.%]="alice.x" [style.top.%]="alice.y">
          <strong>👩 Alice</strong><small>quiere mandar un secreto</small>
          @if (showReject()) {
            <span class="reject">✖ certificado RECHAZADO</span>
          }
        </div>
        <div class="node trudyn" [class.evil]="evil()" [class.active]="active(trudy)" [style.left.%]="trudy.x" [style.top.%]="trudy.y">
          <strong>😈 Trudy</strong><small>en el medio del canal</small>
        </div>
        <div class="node bobn" [class.active]="active(bob)" [style.left.%]="bob.x" [style.top.%]="bob.y">
          <strong>👨 Bob</strong><small>par de claves K_B / privada</small>
        </div>

        @if (card(); as c) {
          <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
               [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
            {{ c.text }}
          </div>
        }
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps().length }}</span>
        }
        @if (finished()) {
          <span class="stepno" [class.ok]="mode() === 'con'" [class.bad]="mode() === 'sin'">
            {{ mode() === 'con' ? '✔' : '💀' }}
          </span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="dots">
        @for (st of steps(); track $index; let i = $index) {
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
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 0.84rem; }
    .mode button.on { background: #b91c1c; color: #fff; }
    .mode button.on:last-child { background: #15803d; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .canvas {
      position: relative; min-height: 300px;
      background: radial-gradient(ellipse at 50% 55%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .wires line.calink { stroke: #2ea04366; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 120px; max-width: 190px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.82rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); }
    .node.alicen { background: #2e7d32; }
    .node.trudyn { background: #7f1d1d; }
    .node.bobn { background: #1565c0; }
    .node.can { background: #b45309; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.evil { border-color: #ef5350; box-shadow: 0 0 20px rgba(239, 83, 80, 0.7); }
    .reject { font-size: 0.6rem; font-weight: 800; margin-top: 3px; padding: 1px 8px; border-radius: 8px; background: #2b1618; color: #ef9a9a; border: 1px solid #ef5350; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .stepno.bad { background: #b91c1c; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }
  `,
})
export class MitmDetail extends SteppedAnim implements OnDestroy {
  readonly alice = ALICE;
  readonly trudy = TRUDY;
  readonly bob = BOB;
  readonly ca = CA;

  readonly mode = signal<'sin' | 'con'>('sin');
  readonly steps = computed(() => (this.mode() === 'sin' ? SIN_STEPS : CON_STEPS));

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3200;
  }

  setMode(m: 'sin' | 'con'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = this.steps()[i];
    const p = this.ease(this.progress());
    return {
      text: s.text,
      color: s.color ?? '#ffd54f',
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p,
    };
  });

  readonly evil = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!this.steps()[i].evil && this.progress() >= 1;
  });

  readonly showReject = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!this.steps()[i].rejected && this.progress() >= 1;
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = this.steps()[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'sin'
        ? '<strong>Ataque exitoso 💀</strong>: Trudy lee y modifica todo, y el canal "funciona" — indetectable. La raíz del problema: <strong>nada liga una clave pública a una identidad</strong>. La solución: que alguien de confianza la firme → probá el modo <strong>"Con PKI 🛡"</strong>.'
        : '<strong>Ataque frustrado 🛡</strong>: la PKI convierte "confiá en esta clave" en "confiá en la CA que la firmó". Esto es EXACTAMENTE el paso de verificación del certificado en el <strong>handshake TLS</strong> — y también por qué Diffie-Hellman a secas (sin autenticación) sigue siendo vulnerable a MITM.';
    }
    const i = this.index();
    if (i < 0) {
      return this.mode() === 'sin'
        ? 'Presioná ▶ Play y mirá cómo Trudy se hace pasar por Bob ante Alice y por Alice ante Bob — sin que nadie lo note.'
        : 'Mismo escenario, pero ahora Bob tiene un certificado firmado por una CA. Mirá dónde se le rompe el truco a Trudy.';
    }
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
