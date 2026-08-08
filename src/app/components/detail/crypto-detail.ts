import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Criptografía simétrica vs asimétrica vs híbrida (Kurose cap. 8).
   El esquema híbrido es el que usa TLS: asimétrica para acordar la clave, simétrica para el volumen. */

type Mode = 'sim' | 'asim' | 'hib';

interface CStep {
  msg: string;
  /** carga que viaja por el canal: null = nada viajando */
  wire?: { text: string; kind: 'clear' | 'cipher' | 'key'; dir: 'ab' | 'ba' };
  alice?: string[];   // qué tiene Alice (badges)
  bob?: string[];
  trudy?: string;     // qué ve Trudy
  danger?: boolean;   // resaltar el problema
  bulk?: boolean;     // fase de volumen (híbrido)
}

const SIM: CStep[] = [
  {
    msg: 'En la <strong>criptografía simétrica</strong> Alice y Bob comparten <strong>UNA MISMA clave secreta K</strong>. La misma clave cifra y descifra. El algoritmo estándar hoy es <strong>AES</strong>.',
    alice: ['🔑 K'], bob: ['🔑 K'],
  },
  {
    msg: 'Alice cifra el mensaje con K: <span class="f">c = K(m)</span>. Lo que sale es indistinguible de ruido.',
    alice: ['🔑 K'], bob: ['🔑 K'], wire: { text: '🔒 c = K(m)', kind: 'cipher', dir: 'ab' },
  },
  {
    msg: 'Trudy está escuchando el canal, pero <strong>sin K no puede hacer nada</strong> con lo que capturó. Bob descifra con la misma K: <span class="f">m = K(c)</span>.',
    alice: ['🔑 K'], bob: ['🔑 K', '📄 m'], trudy: '🔒 ruido inútil',
  },
  {
    msg: '✅ <strong>Ventaja: es RÁPIDA</strong> — órdenes de magnitud más que la asimétrica. Es la que se usa para cifrar el <strong>volumen</strong> de datos.',
    alice: ['🔑 K'], bob: ['🔑 K', '📄 m'],
  },
  {
    msg: '❌ <strong>El problema difícil: distribuir la clave.</strong> ¿Cómo le hacés llegar K a Bob si nunca lo viste? Si la mandás por el mismo canal, Trudy la agarra. Y con <strong>N usuarios</strong> hacen falta <strong>N(N−1)/2</strong> claves distintas — no escala.',
    alice: ['🔑 K'], bob: ['🔑 K'], wire: { text: '🔑 K … ¿cómo?', kind: 'key', dir: 'ab' }, trudy: '😈 ¡se roba la clave!', danger: true,
  },
];

const ASIM: CStep[] = [
  {
    msg: 'En la <strong>asimétrica</strong> cada uno tiene un <strong>par de claves</strong>: la <strong>pública</strong> (se publica, la conoce cualquiera) y la <strong>privada</strong> (secreta, nunca sale de su dueño). Lo cifrado con una <strong>solo</strong> se descifra con la otra.',
    bob: ['🔓 pub-B', '🔐 priv-B'],
  },
  {
    msg: 'Bob <strong>publica su clave pública</strong>. Que Trudy la tenga <strong>no importa</strong>: con la pública solo se puede <em>cifrar</em>, no descifrar. Ahí está la magia — no hay que compartir ningún secreto de antemano.',
    alice: ['🔓 pub-B'], bob: ['🔓 pub-B', '🔐 priv-B'], trudy: '🔓 pub-B (inútil)',
  },
  {
    msg: 'Para <strong>confidencialidad</strong>, Alice cifra con la <strong>clave PÚBLICA del receptor</strong>: <span class="f">c = pub-B(m)</span>. <strong>RSA</strong> se apoya en que <strong>factorizar el producto de dos primos grandes es inviable</strong>.',
    alice: ['🔓 pub-B'], bob: ['🔓 pub-B', '🔐 priv-B'], wire: { text: '🔒 c = pub-B(m)', kind: 'cipher', dir: 'ab' },
  },
  {
    msg: 'Solo Bob puede abrirlo, con <strong>su clave privada</strong>: <span class="f">m = priv-B(c)</span>. Trudy tiene la pública y aun así no puede.',
    alice: ['🔓 pub-B'], bob: ['🔐 priv-B', '📄 m'], trudy: '🔒 no puede abrir',
  },
  {
    msg: '✅ <strong>Resuelve la distribución de claves</strong> y con <strong>N usuarios</strong> solo hacen falta <strong>2N</strong> claves. ❌ Pero es <strong>MUY LENTA</strong> (~1000× más que AES): cifrar un video entero con RSA sería inviable.',
    alice: ['🔓 pub-B'], bob: ['🔐 priv-B', '📄 m'], danger: true,
  },
];

const HIB: CStep[] = [
  {
    msg: 'La solución real: el <strong>esquema HÍBRIDO</strong>. Idea: usar <strong>cada una para lo que es buena</strong> — la asimétrica (lenta pero resuelve la distribución) <strong>solo</strong> para poner de acuerdo una clave, y la simétrica (rápida) para todo el resto.',
    bob: ['🔓 pub-B', '🔐 priv-B'],
  },
  {
    msg: '1. Alice genera una <strong>clave de sesión simétrica Ks</strong> — al azar, y <strong>solo para esta conversación</strong>.',
    alice: ['🔑 Ks (nueva)'], bob: ['🔓 pub-B', '🔐 priv-B'],
  },
  {
    msg: '2. Cifra <strong>esa clave chiquita</strong> con la <strong>pública de Bob</strong> y se la manda. Como Ks es corta, el costo de la asimétrica <strong>se paga UNA sola vez</strong>.',
    alice: ['🔑 Ks'], bob: ['🔓 pub-B', '🔐 priv-B'], wire: { text: '🔒 pub-B(Ks)', kind: 'key', dir: 'ab' },
  },
  {
    msg: '3. Bob la abre con su <strong>privada</strong> y recupera Ks. <strong>Ahora los dos comparten una clave simétrica</strong> — y Trudy, que vio todo pasar, <strong>no la tiene</strong>.',
    alice: ['🔑 Ks'], bob: ['🔑 Ks'], trudy: '🔒 vio pasar algo cifrado',
  },
  {
    msg: '4. De acá en más, <strong>todo el tráfico va con AES usando Ks</strong>: rápido y seguro. Los datos van y vienen a máxima velocidad.',
    alice: ['🔑 Ks'], bob: ['🔑 Ks'], wire: { text: '🔒 AES-Ks(datos)', kind: 'cipher', dir: 'ab' }, bulk: true,
  },
  {
    msg: '👉 <strong>Esto es exactamente lo que hace TLS/HTTPS</strong> cada vez que entrás a una web. Y como Ks es distinta por sesión, si alguien rompiera una, las otras siguen a salvo. La <strong>autenticidad</strong> de la pública de Bob la garantiza su <strong>certificado</strong> — sin eso, MITM.',
    alice: ['🔑 Ks'], bob: ['🔑 Ks'], bulk: true,
  },
];

@Component({
  selector: 'app-crypto-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔐 Simétrica vs asimétrica vs híbrida</div>
          <div class="caption">Por qué ninguna alcanza sola — y por qué TLS usa las dos juntas.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'sim'" (click)="setMode('sim')">Simétrica</button>
            <button [class.on]="mode() === 'asim'" (click)="setMode('asim')">Asimétrica</button>
            <button [class.on]="mode() === 'hib'" (click)="setMode('hib')">Híbrida ⭐</button>
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

      <div class="canvas" [class.danger]="dangerOn()">
        <div class="party alice">
          <div class="pav">👩 Alice</div>
          <div class="bag">
            @for (b of aliceBag(); track b) { <span class="kb" [class.sym]="b.includes('🔑')">{{ b }}</span> }
            @if (aliceBag().length === 0) { <span class="kb empty">—</span> }
          </div>
        </div>

        <div class="channel">
          <div class="chline"></div>
          @if (wire(); as w) {
            <div class="wire" [class]="'w-' + w.kind" [style.left.%]="w.x">{{ w.text }}</div>
          }
          @if (bulkOn()) {
            <div class="bulk">⇄ tráfico masivo cifrado con AES</div>
          }
          <div class="trudy" [class.danger]="dangerOn()">
            <div class="tav">🕵 Trudy</div>
            <div class="tsees">{{ trudySees() || '(escuchando…)' }}</div>
          </div>
        </div>

        <div class="party bob">
          <div class="pav">🧔 Bob</div>
          <div class="bag">
            @for (b of bobBag(); track b) { <span class="kb" [class.sym]="b.includes('🔑')" [class.priv]="b.includes('🔐')">{{ b }}</span> }
            @if (bobBag().length === 0) { <span class="kb empty">—</span> }
          </div>
        </div>
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps().length }}</span>
        }
        @if (finished()) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="cmp">
        <div class="chead">📊 Comparación (esto se pregunta seguro)</div>
        <div class="crow ch"><span></span><span class="c1">Simétrica</span><span class="c2">Asimétrica</span></div>
        <div class="crow"><span class="cq">claves</span><span>1 compartida</span><span>par pública / privada</span></div>
        <div class="crow"><span class="cq">velocidad</span><span><b class="g">rápida</b> (AES)</span><span><b class="r">~1000× más lenta</b></span></div>
        <div class="crow"><span class="cq">claves para N usuarios</span><span><b class="r">N(N−1)/2</b></span><span><b class="g">2N</b></span></div>
        <div class="crow"><span class="cq">problema principal</span><span><b>distribuir la clave</b></span><span><b>costo de cómputo</b></span></div>
        <div class="crow"><span class="cq">algoritmos</span><span>AES, 3DES</span><span>RSA, Diffie-Hellman, ECC</span></div>
        <div class="crow"><span class="cq">se usa para…</span><span>el <b>volumen</b> de datos</span><span><b>acordar la clave</b> + firmar</span></div>
        <div class="hnote">⭐ <b>Híbrido</b> = asimétrica para intercambiar una <b>clave de sesión</b> + simétrica para el resto. Es lo que hace <b>TLS</b>, y la respuesta correcta a "¿cuál se usa en la práctica?": <b>las dos</b>.</div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.78rem; }
    .mode button.on { background: #ef4444; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .canvas { display: flex; align-items: stretch; gap: 10px; min-height: 190px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 12px; transition: border-color 0.3s; }
    .canvas.danger { border-color: #b23b3b88; }
    .party { width: 132px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; }
    .pav { font-size: 0.86rem; font-weight: 800; color: #fff; background: #2e7d32; border-radius: 9px; padding: 7px 12px; width: 100%; text-align: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4); }
    .party.bob .pav { background: #3949ab; }
    .bag { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .kb { font-family: Consolas, monospace; font-size: 0.66rem; font-weight: 700; text-align: center; padding: 4px 6px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; color: #cfe3ff; }
    .kb.sym { background: #2b2a1a; border-color: #d29922; color: #ffd54f; }
    .kb.priv { background: #2a1d33; border-color: #7c3aed; color: #c792ea; }
    .kb.empty { opacity: 0.4; }

    .channel { flex: 1; min-width: 0; position: relative; display: flex; flex-direction: column; justify-content: center; }
    .chline { position: absolute; left: 0; right: 0; top: 38%; height: 2px; background: repeating-linear-gradient(90deg, #4a5878 0 6px, transparent 6px 12px); }
    .wire { position: absolute; top: 38%; transform: translate(-50%,-50%); z-index: 3; font-family: Consolas, monospace; font-size: 0.68rem; font-weight: 800; padding: 5px 10px; border-radius: 8px; background: rgba(8,12,22,0.97); border: 1.5px solid #ffd54f; color: #e6e9f0; white-space: nowrap; }
    .wire.w-cipher { border-color: #2ea043; box-shadow: 0 0 14px rgba(46,160,67,0.35); color: #7ee787; }
    .wire.w-key { border-color: #d29922; box-shadow: 0 0 14px rgba(255,213,79,0.4); color: #ffd54f; }
    .wire.w-clear { border-color: #e5534b; color: #ff8a80; }
    .bulk { position: absolute; top: 38%; left: 50%; transform: translate(-50%,-50%); z-index: 2; font-size: 0.66rem; font-weight: 700; color: #7ee787; background: rgba(16,50,26,0.9); border: 1px solid #2ea043; border-radius: 8px; padding: 4px 10px; white-space: nowrap; }

    .trudy { position: absolute; left: 50%; top: 72%; transform: translateX(-50%); text-align: center; z-index: 2; transition: transform 0.3s; }
    .trudy.danger { transform: translateX(-50%) scale(1.08); }
    .tav { font-size: 0.72rem; font-weight: 800; color: #fff; background: #6b2020; border: 1px solid #b23b3b; border-radius: 8px; padding: 4px 10px; }
    .trudy.danger .tav { background: #b23b3b; box-shadow: 0 0 16px rgba(239,83,80,0.6); }
    .tsees { margin-top: 4px; font-family: Consolas, monospace; font-size: 0.6rem; color: #ef9a9a; white-space: nowrap; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .status .f { font-family: Consolas, monospace; background: #10151f; border: 1px solid #2d3750; border-radius: 5px; padding: 0 5px; color: #79c0ff; }

    .cmp { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .chead { font-weight: 700; font-size: 0.8rem; color: #fff; margin-bottom: 8px; }
    .crow { display: grid; grid-template-columns: 1.1fr 1fr 1.2fr; gap: 6px; font-size: 0.68rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .crow:not(.ch) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; color: var(--text); }
    .crow.ch { font-size: 0.58rem; text-transform: uppercase; font-weight: 700; color: #5c6a8e; }
    .crow .c1 { color: #ffd54f; } .crow .c2 { color: #c792ea; }
    .cq { color: var(--text-dim); } .crow b { color: #fff; } .crow b.g { color: #7ee787; } .crow b.r { color: #ef9a9a; }
    .hnote { margin-top: 7px; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.7rem; color: var(--text-dim); line-height: 1.5; } .hnote b { color: #ffd54f; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) {
      .canvas { flex-direction: column; } .party { width: 100%; }
      .channel { min-height: 120px; }
      .crow { grid-template-columns: 1fr; gap: 2px; } .crow.ch { display: none; }
    }
  `,
})
export class CryptoDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('sim');
  readonly steps = computed<CStep[]>(() =>
    this.mode() === 'sim' ? SIM : this.mode() === 'asim' ? ASIM : HIB,
  );

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].wire ? 1300 : 500;
  }
  protected override stepDwell(): number {
    return 4300;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): CStep | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    if (this.finished()) return list[list.length - 1];
    return list[Math.min(i, list.length - 1)];
  }

  aliceBag(): string[] {
    return this.at()?.alice ?? [];
  }
  bobBag(): string[] {
    return this.at()?.bob ?? [];
  }
  trudySees(): string {
    return this.at()?.trudy ?? '';
  }
  dangerOn(): boolean {
    return !!this.at()?.danger;
  }
  bulkOn(): boolean {
    return !!this.at()?.bulk && !this.wire();
  }

  readonly wire = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const st = this.steps()[i];
    if (!st.wire) return null;
    const p = this.ease(this.progress());
    const x = st.wire.dir === 'ab' ? p * 100 : 100 - p * 100;
    return { text: st.wire.text, kind: st.wire.kind, x };
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      const m = this.mode();
      if (m === 'sim') {
        return '<strong>Simétrica</strong>: rápida y perfecta para el volumen, pero choca con <strong>cómo distribuir la clave</strong> y no escala a muchos usuarios. Mirá la <strong>Asimétrica</strong> para ver cómo se resuelve eso.';
      }
      if (m === 'asim') {
        return '<strong>Asimétrica</strong>: resuelve la distribución de claves (nadie comparte secretos), pero es <strong>demasiado lenta</strong> para cifrar todo. Ahora mirá la <strong>Híbrida ⭐</strong>: la combinación que se usa de verdad.';
      }
      return '<strong>Híbrido = lo mejor de los dos mundos.</strong> Asimétrica <em>una vez</em> para acordar la clave de sesión; simétrica (AES) para todo el tráfico. Es el esquema de <strong>TLS/HTTPS, SSH y VPNs</strong>. Si te preguntan "¿cuál se usa?", la respuesta es <strong>las dos, así</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Recorré los tres modos en orden: simétrica → asimétrica → híbrida, y vas a ver por qué se llegó a la combinación.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
