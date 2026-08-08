import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Modos de operación de un cifrador de bloque: ECB (inseguro) vs CBC (encadenado con IV).
   El clásico "problema del pingüino": con ECB, bloques iguales → cifrados iguales. */

interface Blk { m: string; c: string; same?: boolean; }

/* m1 y m3 son el MISMO texto plano — ahí está la gracia */
const PLAIN = ['HOLA', 'BOB!', 'HOLA', 'CHAU'];

const ECB_C = ['9F2A', 'C471', '9F2A', 'E08D']; // c1 === c3
const CBC_C = ['3B7E', 'A105', 'D9C4', '62F1']; // todos distintos

interface Step {
  msg: string;
  upto: number;        // cuántos bloques cifrados mostrar
  hi?: number[];       // bloques resaltados
  leak?: boolean;      // marcar la filtración (ECB)
  showImg?: boolean;   // mostrar el panel de la imagen
  ivHi?: boolean;
  chain?: number;      // hasta qué bloque dibujar el encadenamiento
}

const ECB: Step[] = [
  {
    msg: 'Un cifrador de bloque (como <strong>AES</strong>) cifra de a <strong>bloques de tamaño fijo</strong>. El mensaje se parte: acá <strong>m1 y m3 son el MISMO texto</strong> ("HOLA") — fijate qué pasa con ellos.',
    upto: 0, hi: [0, 2],
  },
  {
    msg: '<strong>ECB (Electronic Code Book)</strong> es lo más obvio: cifrar <strong>cada bloque por separado</strong> con la misma clave, sin relación entre ellos. <span class="f">c_i = K(m_i)</span>.',
    upto: 2,
  },
  {
    msg: 'Se cifran todos… y acá está el desastre: como m1 = m3 y la función es la misma, <strong>c1 y c3 salen IDÉNTICOS</strong>.',
    upto: 4, hi: [0, 2], leak: true,
  },
  {
    msg: '👉 <strong>El problema</strong>: el atacante no descifra nada, pero <strong>ve la ESTRUCTURA</strong> del mensaje — qué partes se repiten y dónde. Con una imagen se ve dramático: <strong>el pingüino sigue siendo reconocible</strong> aunque esté "cifrado".',
    upto: 4, hi: [0, 2], leak: true, showImg: true,
  },
];

const CBC: Step[] = [
  {
    msg: '<strong>CBC (Cipher Block Chaining)</strong> arregla esto <strong>encadenando</strong> los bloques. Arranca con un <strong>IV</strong> (vector de inicialización) <strong>aleatorio</strong>, que viaja <strong>en claro</strong> junto al mensaje.',
    upto: 0, ivHi: true,
  },
  {
    msg: 'El primer bloque se mezcla con el IV antes de cifrar: <span class="f">c1 = K(m1 ⊕ IV)</span>. El <strong>⊕ es XOR</strong>.',
    upto: 1, chain: 0, ivHi: true,
  },
  {
    msg: 'Y de ahí en más, <strong>cada bloque se mezcla con el CIFRADO ANTERIOR</strong>: <span class="f">c_i = K(m_i ⊕ c_(i−1))</span>. Por eso se llama "encadenado": cada eslabón depende del previo.',
    upto: 2, chain: 1,
  },
  {
    msg: 'Llegamos a m3, que <strong>sigue siendo "HOLA" igual que m1</strong>… pero ahora se mezcla con c2, que es distinto del IV. Resultado: <strong>c3 ≠ c1</strong>. <strong>La repetición desapareció.</strong>',
    upto: 3, chain: 2, hi: [0, 2],
  },
  {
    msg: 'Todos los bloques cifrados son <strong>distintos entre sí</strong> aunque el texto plano se repita. Ahora la imagen sí parece <strong>ruido puro</strong>.',
    upto: 4, chain: 3, showImg: true,
  },
  {
    msg: 'Un beneficio extra: como el IV es <strong>aleatorio por mensaje</strong>, <strong>cifrar dos veces el mismo texto da resultados distintos</strong>. El atacante no puede ni saber si repetiste el mensaje.',
    upto: 4, chain: 3, showImg: true, ivHi: true,
  },
];

@Component({
  selector: 'app-cbc-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🧊 Modos de cifrado: ECB (roto) vs CBC (encadenado)</div>
          <div class="caption">Por qué cifrar bloque por bloque filtra información — el problema del pingüino.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'ecb'" (click)="setMode('ecb')">ECB ⚠</button>
            <button [class.on]="mode() === 'cbc'" (click)="setMode('cbc')">CBC ✔</button>
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

      <div class="board">
        <div class="diagram">
          @if (mode() === 'cbc') {
            <div class="ivrow">
              <span class="iv" [class.hi]="ivHi()">IV aleatorio (viaja en claro)</span>
            </div>
          }

          <div class="row lbl"><span class="rl">texto plano</span></div>
          <div class="row">
            @for (b of blocks; track $index; let i = $index) {
              <div class="blk plain" [class.hi]="isHi(i)">{{ b }}</div>
            }
          </div>

          <div class="row arrows">
            @for (b of blocks; track $index; let i = $index) {
              <div class="arrow">
                @if (mode() === 'cbc' && i <= chain()) { <span class="xor">⊕</span> }
                <span class="ar">↓</span>
                <span class="kk">K</span>
              </div>
            }
          </div>

          <div class="row lbl"><span class="rl">cifrado</span></div>
          <div class="row">
            @for (b of blocks; track $index; let i = $index) {
              <div class="blk cipher" [class.on]="i < upto()" [class.hi]="isHi(i)" [class.leak]="leakOn() && (i === 0 || i === 2)">
                {{ i < upto() ? cipherOf(i) : '····' }}
              </div>
            }
          </div>

          @if (mode() === 'cbc' && chain() >= 0) {
            <div class="chainnote">↩ cada bloque se mezcla (XOR) con el <b>cifrado anterior</b> — o con el <b>IV</b> el primero</div>
          }
          @if (leakOn()) {
            <div class="leakmsg">⚠ <b>c1 = c3</b> → bloques iguales producen cifrados iguales → <b>se filtra la estructura</b></div>
          }
        </div>

        @if (showImg()) {
          <div class="imgpanel">
            <div class="ihead">🐧 La imagen "cifrada"</div>
            <div class="grid" [class.noise]="mode() === 'cbc'">
              @for (p of pixels; track $index) {
                <i [class.on]="mode() === 'ecb' ? p : noiseAt($index)"></i>
              }
            </div>
            <div class="inote" [class.bad]="mode() === 'ecb'">
              {{ mode() === 'ecb'
                ? '⚠ ECB: el dibujo se sigue viendo. No cifra la estructura.'
                : '✔ CBC: ruido. No se distingue nada del original.' }}
            </div>
          </div>
        }
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

      <div class="warn">
        <b>⚠ Regla de oro:</b> <b>NUNCA reusar un IV con la misma clave.</b> Si el IV se repite, vuelven a aparecer los patrones y el cifrado se vuelve atacable. Es exactamente <b>lo que rompió a WEP</b> (IV de 24 bits que se repetía a las pocas horas).
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 11px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
    .mode button.on { background: #ef4444; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: flex-start; }
    .diagram { flex: 1; min-width: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .ivrow { margin-bottom: 8px; }
    .iv { display: inline-block; font-family: Consolas, monospace; font-size: 0.66rem; font-weight: 700; color: #79c0ff; background: #16283d; border: 1px solid #1f6feb66; border-radius: 6px; padding: 4px 10px; transition: box-shadow 0.3s, border-color 0.3s; }
    .iv.hi { border-color: #ffd54f; color: #ffd54f; background: #2b2a1a; box-shadow: 0 0 12px rgba(255,213,79,0.35); }

    .row { display: flex; gap: 6px; }
    .row.lbl { margin: 6px 0 3px; } .rl { font-size: 0.58rem; text-transform: uppercase; color: #5c6a8e; font-weight: 700; }
    .blk { flex: 1; text-align: center; font-family: Consolas, monospace; font-weight: 800; font-size: 0.8rem; padding: 8px 4px; border-radius: 6px; border: 1px solid #2d3750; transition: all 0.3s; }
    .blk.plain { background: #1b2438; color: #cfe3ff; }
    .blk.cipher { background: #141a26; color: #3d4760; }
    .blk.cipher.on { background: #16251c; color: #7ee787; border-color: #2ea04355; }
    .blk.hi { border-color: #ffd54f; box-shadow: 0 0 12px rgba(255,213,79,0.3); }
    .blk.cipher.leak { background: #3d2a2a; color: #ff8a80; border-color: #b23b3b; box-shadow: 0 0 14px rgba(239,83,80,0.45); }

    .row.arrows { margin: 4px 0; }
    .arrow { flex: 1; display: flex; align-items: center; justify-content: center; gap: 3px; font-size: 0.7rem; color: #5c6a8e; }
    .xor { color: #ffd54f; font-weight: 800; font-size: 0.8rem; }
    .ar { color: #4a5878; }
    .kk { font-family: Consolas, monospace; font-size: 0.6rem; font-weight: 800; color: #c792ea; background: #2a1d33; border: 1px solid #7c3aed55; border-radius: 4px; padding: 0 4px; }

    .chainnote { margin-top: 9px; font-size: 0.64rem; color: var(--text-dim); } .chainnote b { color: #ffd54f; }
    .leakmsg { margin-top: 9px; font-size: 0.68rem; color: #ef9a9a; background: rgba(178,59,59,0.12); border: 1px solid #b23b3b55; border-radius: 7px; padding: 6px 9px; } .leakmsg b { color: #ff8a80; }

    .imgpanel { width: 168px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .ihead { font-size: 0.72rem; font-weight: 700; color: #fff; margin-bottom: 7px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1px; }
    .grid i { aspect-ratio: 1; background: #1a2132; border-radius: 1px; }
    .grid i.on { background: #7ee787; }
    .grid.noise i.on { background: #4a5878; }
    .inote { margin-top: 8px; font-size: 0.6rem; line-height: 1.35; color: #7ee787; } .inote.bad { color: #ef9a9a; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .status .f { font-family: Consolas, monospace; background: #10151f; border: 1px solid #2d3750; border-radius: 5px; padding: 0 5px; color: #79c0ff; }

    .warn { margin-top: 10px; font-size: 0.72rem; line-height: 1.5; color: var(--text); background: rgba(178,59,59,0.1); border: 1px solid #b23b3b55; border-radius: 8px; padding: 9px 11px; }
    .warn b { color: #ff8a80; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) { .board { flex-direction: column; } .imgpanel { width: 100%; } }
  `,
})
export class CbcDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'ecb' | 'cbc'>('ecb');
  readonly steps = computed<Step[]>(() => (this.mode() === 'ecb' ? ECB : CBC));
  readonly blocks = PLAIN;

  /** patrón tipo "pingüino": 12x10, un dibujo simple reconocible */
  readonly pixels: boolean[] = (() => {
    const art = [
      '000011110000',
      '000111111000',
      '001101101100',
      '001111111100',
      '001111111100',
      '011111111110',
      '011100001110',
      '001111111100',
      '000110011000',
      '001100001100',
    ].join('');
    return art.split('').map((c) => c === '1');
  })();

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(): number {
    return 700;
  }
  protected override stepDwell(): number {
    return 4200;
  }

  setMode(m: 'ecb' | 'cbc'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): Step | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    if (this.finished()) return list[list.length - 1];
    return list[Math.min(i, list.length - 1)];
  }

  upto(): number {
    return this.at()?.upto ?? 0;
  }
  chain(): number {
    const c = this.at()?.chain;
    return c === undefined ? -1 : c;
  }
  isHi(i: number): boolean {
    return (this.at()?.hi ?? []).includes(i);
  }
  leakOn(): boolean {
    return !!this.at()?.leak;
  }
  showImg(): boolean {
    return !!this.at()?.showImg;
  }
  ivHi(): boolean {
    return !!this.at()?.ivHi;
  }

  cipherOf(i: number): string {
    return this.mode() === 'ecb' ? ECB_C[i] : CBC_C[i];
  }

  /** pseudo-ruido determinístico para la vista CBC */
  noiseAt(i: number): boolean {
    return ((i * 2654435761) >>> 0) % 100 < 47;
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'ecb'
        ? '<strong>ECB no se usa nunca en serio.</strong> Cifra cada bloque aislado, así que <strong>patrones del texto plano sobreviven al cifrado</strong>. Pasá a <strong>CBC ✔</strong> para ver el arreglo.'
        : '<strong>CBC</strong>: encadenar cada bloque con el cifrado anterior (y arrancar con un <strong>IV aleatorio</strong>) hace que bloques repetidos den cifrados distintos, y que el mismo mensaje cifrado dos veces se vea diferente. Es el modo que vas a nombrar si te preguntan por AES en la práctica.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Mirá primero ECB (y su falla), después CBC.';
    return this.steps()[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
