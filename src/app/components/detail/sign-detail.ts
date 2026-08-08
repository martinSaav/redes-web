import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Integridad y autenticación (Kurose cap. 8): hash → MAC/HMAC → firma digital → certificados/PKI.
   El punto fino: HMAC NO da no repudio (secreto compartido); la firma SÍ (clave privada). */

type Mode = 'hash' | 'firma' | 'pki';

interface Stage { id: string; label: string; sub?: string; }

interface SStep {
  msg: string;
  active?: string[];          // etapas encendidas
  verdict?: 'ok' | 'bad' | null;
  verdictText?: string;
  attack?: string;            // qué hace Trudy
  note?: string;              // nota destacada
}

const HASH_STAGES: Stage[] = [
  { id: 'm', label: '📄 mensaje', sub: 'm' },
  { id: 'h', label: '🔢 H( )', sub: 'SHA-256' },
  { id: 'd', label: 'huella', sub: 'tamaño fijo' },
  { id: 'send', label: '📤 se envía', sub: 'm + huella' },
  { id: 'ver', label: '🔍 Bob verifica', sub: 'recalcula y compara' },
];
const SIGN_STAGES: Stage[] = [
  { id: 'm', label: '📄 mensaje', sub: 'm' },
  { id: 'h', label: '🔢 H( )', sub: 'hash del mensaje' },
  { id: 'sig', label: '🔐 cifrar con PRIVADA', sub: 'de Alice = firmar' },
  { id: 'send', label: '📤 se envía', sub: 'm + firma' },
  { id: 'ver', label: '🔓 verificar con PÚBLICA', sub: 'de Alice' },
];
const PKI_STAGES: Stage[] = [
  { id: 'id', label: '🪪 identidad', sub: 'quién dice ser' },
  { id: 'pub', label: '🔓 su clave pública', sub: '' },
  { id: 'ca', label: '🏛 la CA firma', sub: 'con su privada' },
  { id: 'cert', label: '📜 certificado X.509', sub: 'id + pub + validez + firma' },
  { id: 'ver', label: '✅ el navegador valida', sub: 'con la pública de la CA' },
];

const HASH: SStep[] = [
  {
    msg: 'Objetivo: que Bob <strong>detecte si alguien alteró el mensaje</strong>. Alice calcula un <strong>hash criptográfico</strong> (SHA-256): una <strong>huella de tamaño fijo</strong>, de <strong>una sola vía</strong> (no se puede volver atrás) y resistente a colisiones.',
    active: ['m', 'h', 'd'],
  },
  {
    msg: 'Manda el mensaje junto con su huella. Bob <strong>recalcula el hash</strong> de lo que recibió y lo <strong>compara</strong>: si coincide, el mensaje llegó íntegro.',
    active: ['m', 'h', 'd', 'send', 'ver'], verdict: 'ok', verdictText: 'coincide → íntegro',
  },
  {
    msg: '❌ <strong>Pero el hash solo NO alcanza</strong>: Trudy puede modificar el mensaje <strong>y recalcular la huella</strong> — el hash es público, cualquiera lo computa. Bob compara, coincide, y se come el mensaje falso.',
    active: ['m', 'h', 'd', 'send', 'ver'], verdict: 'bad', verdictText: '¡coincide igual! 😱',
    attack: 'cambia m y recalcula H(m)',
  },
  {
    msg: '✔ <strong>La solución: MAC / HMAC.</strong> Se mezcla el mensaje con un <strong>secreto compartido s</strong> antes de hashear: <span class="f">HMAC = H(m + s)</span>. Trudy <strong>no tiene s</strong> → no puede generar una huella válida.',
    active: ['m', 'h', 'd', 'send', 'ver'], verdict: 'ok', verdictText: 'integridad + origen ✔',
    note: 'MAC = Message Authentication Code. ¡OJO! no es la dirección MAC de capa 2.',
  },
  {
    msg: '❌ Le queda <strong>un límite importante</strong>: como Alice y Bob <strong>comparten el mismo secreto</strong>, <strong>los dos pueden generar el MAC</strong>. Entonces Bob podría fabricar un mensaje y decir que lo mandó Alice. <strong>No hay NO REPUDIO.</strong>',
    active: ['m', 'h', 'd', 'send', 'ver'], verdict: 'bad', verdictText: 'sin no repudio',
    note: 'Para no repudio hace falta algo que SOLO el emisor pueda hacer → firma digital.',
  },
];

const FIRMA: SStep[] = [
  {
    msg: 'La <strong>firma digital</strong> resuelve el no repudio. Primero, Alice calcula el <strong>hash del mensaje</strong>. <strong>Se firma el hash y no el mensaje entero</strong>, por eficiencia (la asimétrica es lenta y el hash es chico).',
    active: ['m', 'h'],
  },
  {
    msg: 'Ahora <strong>cifra ese hash con SU CLAVE PRIVADA</strong>. Eso <strong>es</strong> la firma. Ojo al detalle: acá se usa la <strong>privada del emisor</strong> — al revés que cuando ciframos para confidencialidad (que era la pública del receptor).',
    active: ['m', 'h', 'sig'],
  },
  {
    msg: 'Manda el <strong>mensaje + la firma</strong>. Bob <strong>descifra la firma con la clave PÚBLICA de Alice</strong> y obtiene el hash original.',
    active: ['m', 'h', 'sig', 'send', 'ver'],
  },
  {
    msg: 'Bob recalcula el hash del mensaje recibido y lo compara con el que sacó de la firma. Si coinciden: el mensaje está <strong>íntegro</strong> Y <strong>viene de Alice</strong> (nadie más pudo cifrar con su privada).',
    active: ['m', 'h', 'sig', 'send', 'ver'], verdict: 'ok', verdictText: 'íntegro + auténtico ✔',
  },
  {
    msg: '✅ <strong>Y como SOLO Alice tiene su clave privada, no puede negar haberlo firmado</strong> → <strong>NO REPUDIO</strong>. Esa es exactamente la diferencia con HMAC, y es lo que se pregunta.',
    active: ['m', 'h', 'sig', 'send', 'ver'], verdict: 'ok', verdictText: 'no repudio ✔',
    note: 'Firma = hash cifrado con la privada del emisor. Verificás con su pública.',
  },
];

const PKI: SStep[] = [
  {
    msg: 'Queda un agujero: todo lo anterior asume que Bob tiene la <strong>clave pública REAL de Alice</strong>. ¿Y cómo sabe que esa clave es de Alice y no de un impostor?',
    active: ['id', 'pub'],
  },
  {
    msg: '❌ <strong>Acá entra el MITM</strong>: Trudy le hace llegar a Bob <strong>SU propia clave pública</strong> diciendo que es la de Alice. Después firma mensajes con su privada y <strong>Bob los valida como si fueran de Alice</strong>. Todo el esquema se cae.',
    active: ['id', 'pub'], verdict: 'bad', verdictText: 'Bob confía en el impostor',
    attack: 'sustituye la clave pública',
  },
  {
    msg: '✔ Solución: los <strong>certificados</strong>. Una <strong>CA (autoridad certificante)</strong> verifica por fuera la identidad de Alice y <strong>firma con su propia clave privada</strong> un documento que ata <strong>identidad ↔ clave pública</strong>.',
    active: ['id', 'pub', 'ca'],
  },
  {
    msg: 'Ese documento es el <strong>certificado X.509</strong>: contiene la <strong>identidad</strong>, la <strong>clave pública</strong>, el <strong>período de validez</strong> y la <strong>firma de la CA</strong>.',
    active: ['id', 'pub', 'ca', 'cert'],
  },
  {
    msg: 'Bob (tu navegador) <strong>valida la firma del certificado con la clave pública de la CA</strong>, que ya tiene preinstalada en su <strong>trust store</strong>. Si valida, la clave pública de adentro es confiable.',
    active: ['id', 'pub', 'ca', 'cert', 'ver'], verdict: 'ok', verdictText: 'certificado válido ✔',
  },
  {
    msg: 'En la práctica hay una <strong>cadena de confianza</strong>: el certificado del sitio lo firma una CA intermedia, a esa la firma otra, hasta llegar a una <strong>CA raíz</strong> del trust store. <strong>Esto es lo que frena el MITM</strong> — y es la razón por la que el navegador te grita cuando un certificado no valida.',
    active: ['id', 'pub', 'ca', 'cert', 'ver'], verdict: 'ok', verdictText: 'cadena hasta la raíz ✔',
    note: 'PKI = toda la infraestructura de CAs, certificados y revocación.',
  },
];

@Component({
  selector: 'app-sign-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">✍ Integridad y autenticación: hash → HMAC → firma → certificados</div>
          <div class="caption">Por qué el hash solo no alcanza, y qué agrega cada escalón.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'hash'" (click)="setMode('hash')">Hash y HMAC</button>
            <button [class.on]="mode() === 'firma'" (click)="setMode('firma')">Firma digital</button>
            <button [class.on]="mode() === 'pki'" (click)="setMode('pki')">Certificados / PKI</button>
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

      <div class="pipe">
        @for (s of stages(); track s.id; let last = $last) {
          <div class="stage" [class.on]="isOn(s.id)">
            <span class="sl">{{ s.label }}</span>
            @if (s.sub) { <span class="ss">{{ s.sub }}</span> }
          </div>
          @if (!last) { <span class="sep" [class.on]="isOn(s.id)">→</span> }
        }
      </div>

      @if (attack()) {
        <div class="attack">🕵 <b>Trudy</b>: {{ attack() }}</div>
      }

      @if (verdict()) {
        <div class="verdict" [class.bad]="verdict() === 'bad'">
          <span class="vi">{{ verdict() === 'ok' ? '✔' : '✖' }}</span>
          <span>{{ verdictText() }}</span>
        </div>
      }

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps().length }}</span>
        }
        @if (finished()) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      @if (note()) {
        <div class="note">💡 {{ note() }}</div>
      }

      <div class="cmp">
        <div class="chead">⚖ HMAC vs Firma digital — la comparación que se pregunta</div>
        <div class="crow ch"><span></span><span class="c1">HMAC</span><span class="c2">Firma digital</span></div>
        <div class="crow"><span class="cq">qué usa</span><span><b>secreto compartido</b></span><span><b>clave privada</b> del emisor</span></div>
        <div class="crow"><span class="cq">integridad</span><span class="g">✔</span><span class="g">✔</span></div>
        <div class="crow"><span class="cq">autenticación de origen</span><span class="g">✔</span><span class="g">✔</span></div>
        <div class="crow"><span class="cq">no repudio</span><span class="r">✖ (los dos pueden generarlo)</span><span class="g">✔ (solo el dueño de la privada)</span></div>
        <div class="crow"><span class="cq">velocidad</span><span class="g">rápida</span><span class="r">lenta (asimétrica)</span></div>
        <div class="crow"><span class="cq">confidencialidad</span><span class="r">✖ no cifra</span><span class="r">✖ no cifra</span></div>
        <div class="hnote">⚠ Ni el HMAC ni la firma <b>ocultan</b> el mensaje: dan integridad/autenticación, <b>no confidencialidad</b>. Para eso hay que cifrar aparte. Integridad y confidencialidad son <b>independientes</b> — una no implica la otra.</div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #ef4444; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .pipe { display: flex; align-items: stretch; gap: 4px; flex-wrap: wrap; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .stage { flex: 1; min-width: 96px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; padding: 9px 6px; border-radius: 8px; background: #161d2b; border: 1px solid #232b3e; opacity: 0.4; transition: opacity 0.35s, border-color 0.35s, background 0.35s, box-shadow 0.35s; }
    .stage.on { opacity: 1; background: #1b2438; border-color: #ef444488; box-shadow: 0 0 12px rgba(239,68,68,0.18); }
    .sl { font-size: 0.7rem; font-weight: 700; color: #fff; }
    .ss { font-size: 0.56rem; color: var(--text-dim); font-family: Consolas, monospace; }
    .sep { display: flex; align-items: center; color: #3d4760; font-weight: 800; transition: color 0.35s; } .sep.on { color: #ef4444; }

    .attack { margin-top: 9px; font-size: 0.72rem; color: #ef9a9a; background: rgba(178,59,59,0.12); border: 1px solid #b23b3b55; border-radius: 8px; padding: 7px 11px; } .attack b { color: #ff8a80; }

    .verdict { margin-top: 9px; display: flex; align-items: center; gap: 8px; font-size: 0.78rem; font-weight: 700; color: #7ee787; background: rgba(46,160,67,0.1); border: 1px solid #2ea04355; border-radius: 8px; padding: 8px 11px; }
    .verdict.bad { color: #ef9a9a; background: rgba(178,59,59,0.12); border-color: #b23b3b55; }
    .vi { font-size: 1rem; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .status .f { font-family: Consolas, monospace; background: #10151f; border: 1px solid #2d3750; border-radius: 5px; padding: 0 5px; color: #79c0ff; }

    .note { margin-top: 9px; font-size: 0.72rem; line-height: 1.5; color: var(--text); background: rgba(31,111,235,0.08); border: 1px solid #1f6feb44; border-radius: 8px; padding: 8px 11px; }

    .cmp { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .chead { font-weight: 700; font-size: 0.8rem; color: #fff; margin-bottom: 8px; }
    .crow { display: grid; grid-template-columns: 1.1fr 1.1fr 1.4fr; gap: 6px; font-size: 0.68rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .crow:not(.ch) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; color: var(--text); }
    .crow.ch { font-size: 0.58rem; text-transform: uppercase; font-weight: 700; color: #5c6a8e; }
    .crow .c1 { color: #ffd54f; } .crow .c2 { color: #c792ea; }
    .cq { color: var(--text-dim); } .crow b { color: #fff; }
    .crow .g { color: #7ee787; font-weight: 700; } .crow .r { color: #ef9a9a; font-weight: 700; }
    .hnote { margin-top: 7px; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.7rem; color: var(--text-dim); line-height: 1.5; } .hnote b { color: #ffd54f; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) {
      .sep { display: none; } .stage { min-width: 84px; }
      .crow { grid-template-columns: 1fr; gap: 2px; } .crow.ch { display: none; }
    }
  `,
})
export class SignDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('hash');
  readonly steps = computed<SStep[]>(() =>
    this.mode() === 'hash' ? HASH : this.mode() === 'firma' ? FIRMA : PKI,
  );
  readonly stages = computed<Stage[]>(() =>
    this.mode() === 'hash' ? HASH_STAGES : this.mode() === 'firma' ? SIGN_STAGES : PKI_STAGES,
  );

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(): number {
    return 600;
  }
  protected override stepDwell(): number {
    return 4400;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): SStep | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    if (this.finished()) return list[list.length - 1];
    return list[Math.min(i, list.length - 1)];
  }

  isOn(id: string): boolean {
    return (this.at()?.active ?? []).includes(id);
  }
  verdict(): 'ok' | 'bad' | null {
    return this.at()?.verdict ?? null;
  }
  verdictText(): string {
    return this.at()?.verdictText ?? '';
  }
  attack(): string {
    return this.at()?.attack ?? '';
  }
  note(): string {
    return this.at()?.note ?? '';
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      const m = this.mode();
      if (m === 'hash') {
        return '<strong>Escalón 1</strong>: hash = integridad frente a errores, pero <strong>no frente a un atacante</strong>. HMAC (hash + secreto compartido) sí autentica el origen, pero <strong>no da no repudio</strong>. Pasá a <strong>Firma digital</strong>.';
      }
      if (m === 'firma') {
        return '<strong>Escalón 2</strong>: la firma da integridad + autenticación + <strong>no repudio</strong>, porque solo el dueño de la privada pudo generarla. Pero todo esto depende de <strong>tener la clave pública correcta</strong> → mirá <strong>Certificados / PKI</strong>.';
      }
      return '<strong>Escalón 3</strong>: el certificado ata <strong>identidad ↔ clave pública</strong> con la firma de una <strong>CA</strong> en la que ya confiás. Sin PKI, toda la criptografía asimétrica es vulnerable a <strong>MITM</strong>: es el cierre del capítulo.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Recorré los tres modos en orden: cada uno arregla el agujero que deja el anterior.';
    return this.steps()[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
