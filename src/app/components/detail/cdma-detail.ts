import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/* CDMA (Kurose 8ª ed., §7.2.1, Figs. 7.5 y 7.6, ecuaciones 7.1–7.3).
   Mismos códigos del libro, M = 8. Los bits de datos se pueden cambiar con click
   y todo se recalcula: codificación, suma en el canal y decodificación. */

const M = 8;
const C1 = [1, 1, 1, -1, 1, -1, -1, -1];
const C2 = [1, -1, 1, 1, 1, -1, 1, 1];

@Component({
  selector: 'app-cdma-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎚 CDMA: codificar, sumar en el canal y decodificar (Figs. 7.5–7.6)</div>
          <div class="caption">Click en los bits de datos para cambiarlos. Todo se recalcula con las ecuaciones del libro.</div>
        </div>
        <div class="mode">
          <button [class.on]="two() === false" (click)="two.set(false); rx.set(1)">1 emisor (Fig. 7.5)</button>
          <button [class.on]="two()" (click)="two.set(true)">2 emisores (Fig. 7.6)</button>
        </div>
      </div>

      <div class="grid">
        <!-- EMISOR 1 -->
        <div class="blk">
          <div class="bh s1">📱 Emisor 1 · código c¹ = ({{ c1.join(', ') }})</div>
          <div class="row">
            <span class="rl">datos dᵢ</span>
            @for (slot of [0, 1]; track slot) {
              <button class="data" [class.neg]="b1()[slot] < 0" (click)="flip(1, slot)">
                d{{ slot === 0 ? '₁' : '₀' }} = {{ b1()[slot] }}
              </button>
            }
          </div>
          <div class="row">
            <span class="rl">código c¹</span>
            @for (slot of [0, 1]; track slot) {
              <span class="chips">@for (v of c1; track $index) { <i [class]="cls(v)">{{ v }}</i> }</span>
            }
          </div>
          <div class="row">
            <span class="rl">Z¹ = d·c¹</span>
            @for (slot of [0, 1]; track slot) {
              <span class="chips">@for (v of z1()[slot]; track $index) { <i [class]="cls(v)">{{ v }}</i> }</span>
            }
          </div>
        </div>

        @if (two()) {
          <div class="blk">
            <div class="bh s2">📱 Emisor 2 · código c² = ({{ c2.join(', ') }})</div>
            <div class="row">
              <span class="rl">datos dᵢ</span>
              @for (slot of [0, 1]; track slot) {
                <button class="data" [class.neg]="b2()[slot] < 0" (click)="flip(2, slot)">
                  d{{ slot === 0 ? '₁' : '₀' }} = {{ b2()[slot] }}
                </button>
              }
            </div>
            <div class="row">
              <span class="rl">Z² = d·c²</span>
              @for (slot of [0, 1]; track slot) {
                <span class="chips">@for (v of z2()[slot]; track $index) { <i [class]="cls(v)">{{ v }}</i> }</span>
              }
            </div>
          </div>
        }

        <!-- CANAL -->
        <div class="blk ch">
          <div class="bh">📡 Canal: {{ two() ? 'las señales se SUMAN — Z* = Z¹ + Z²' : 'pasa Z¹ tal cual' }}</div>
          <div class="row">
            <span class="rl">Z*</span>
            @for (slot of [0, 1]; track slot) {
              <span class="chips">@for (v of zs()[slot]; track $index) { <i [class]="cls(v)">{{ v }}</i> }</span>
            }
          </div>
          <div class="slots"><span></span><span>slot 1</span><span>slot 0</span></div>
        </div>

        <!-- RECEPTOR -->
        <div class="blk rx">
          <div class="bh">
            📥 Receptor — decodifica con
            @if (two()) {
              <span class="rxsel">
                <button [class.on]="rx() === 1" (click)="rx.set(1)">c¹</button>
                <button [class.on]="rx() === 2" (click)="rx.set(2)">c²</button>
              </span>
            } @else { <b>c¹</b> }
          </div>
          <div class="row">
            <span class="rl">Z*·c</span>
            @for (slot of [0, 1]; track slot) {
              <span class="chips">@for (v of prod()[slot]; track $index) { <i [class]="cls(v)">{{ v }}</i> }</span>
            }
          </div>
          <div class="row">
            <span class="rl">Σ / M</span>
            @for (slot of [0, 1]; track slot) {
              <span class="res" [class.ok]="dec()[slot] === sent()[slot]">
                {{ sum()[slot] }} / 8 = <b>{{ dec()[slot] }}</b>
                {{ dec()[slot] === sent()[slot] ? '✔' : '✖' }}
              </span>
            }
          </div>
        </div>
      </div>

      <div class="eqs">
        <span class="eq"><b>(7.1)</b> Z<sub>i,m</sub> = d<sub>i</sub> · c<sub>m</sub></span>
        <span class="eq"><b>(7.3)</b> d<sub>i</sub> = (1/M) · Σ<sub>m</sub> Z*<sub>i,m</sub> · c<sub>m</sub></span>
        @if (two()) {
          <span class="eq orth">c¹ · c² = {{ dot }} → códigos <b>ortogonales</b></span>
        }
      </div>

      <div class="status" [innerHTML]="explain()"></div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.78rem; }
    .mode button.on { background: #ec4899; color: #fff; }

    .grid { display: flex; flex-direction: column; gap: 8px; }
    .blk { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 9px 10px; }
    .blk.ch { border-color: #f59e0b66; }
    .blk.rx { border-color: #2ea04366; }
    .bh { font-size: 0.74rem; font-weight: 700; color: #cfe3ff; margin-bottom: 7px; font-family: Consolas, monospace; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .bh.s1 { color: #79c0ff; } .bh.s2 { color: #c792ea; }
    .row { display: grid; grid-template-columns: 74px 1fr 1fr; gap: 8px; align-items: center; margin-bottom: 4px; }
    .rl { font-size: 0.66rem; color: var(--text-dim); font-family: Consolas, monospace; }
    .chips { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
    .chips i { font-style: normal; text-align: center; font-family: Consolas, monospace; font-size: 0.66rem; font-weight: 700; padding: 3px 0; border-radius: 3px; }
    .p { background: #16304a; color: #9fd0ff; }
    .n { background: #3d2228; color: #ff9aa2; }
    .z { background: #1a2132; color: #5c6a8e; }
    .p2 { background: #1c4a2a; color: #a6f0ad; }
    .n2 { background: #4a1f1f; color: #ff8a80; }
    .data { font-family: Consolas, monospace; font-weight: 800; font-size: 0.74rem; padding: 6px 4px; border-radius: 6px; cursor: pointer; background: #16304a; color: #9fd0ff; border: 1px solid #2f5f8f; }
    .data.neg { background: #3d2228; color: #ff9aa2; border-color: #7a3540; }
    .data:hover { filter: brightness(1.25); }
    .slots { display: grid; grid-template-columns: 74px 1fr 1fr; gap: 8px; font-size: 0.62rem; color: #5c6a8e; text-align: center; }
    .rxsel { display: inline-flex; gap: 2px; }
    .rxsel button { background: #161d2b; border: 1px solid #2d3750; color: var(--text-dim); border-radius: 5px; padding: 1px 8px; cursor: pointer; font-family: Consolas, monospace; font-weight: 700; }
    .rxsel button.on { background: #2ea043; color: #fff; border-color: #2ea043; }
    .res { font-family: Consolas, monospace; font-size: 0.74rem; text-align: center; padding: 5px; border-radius: 6px; background: #3d2228; color: #ff8a80; }
    .res.ok { background: #13241a; color: #7ee787; }
    .res b { font-size: 0.86rem; }

    .eqs { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 0.78rem; color: var(--text); }
    .eq { background: #0b0f19; border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; font-family: Consolas, monospace; color: var(--yellow, #ffd54f); }
    .eq b { color: #8b95b5; }
    .eq.orth { color: #7ee787; }
    .status { margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; font-size: 0.93rem; line-height: 1.5; }

    @media (max-width: 640px) {
      .row, .slots { grid-template-columns: 1fr; gap: 4px; }
      .slots { display: none; }
    }
  `,
})
export class CdmaDetail {
  readonly c1 = C1;
  readonly c2 = C2;
  readonly dot = C1.reduce((s, v, i) => s + v * C2[i], 0);

  readonly two = signal(false);
  readonly rx = signal<1 | 2>(1);
  /** [d₁, d₀] (slot 1 primero, como en el libro) */
  readonly b1 = signal<number[]>([-1, 1]);
  readonly b2 = signal<number[]>([1, 1]);

  flip(who: 1 | 2, slot: number): void {
    const s = who === 1 ? this.b1 : this.b2;
    s.update((b) => b.map((v, i) => (i === slot ? -v : v)));
  }

  private enc(bits: number[], code: number[]): number[][] {
    return bits.map((d) => code.map((c) => d * c));
  }

  readonly z1 = computed(() => this.enc(this.b1(), C1));
  readonly z2 = computed(() => this.enc(this.b2(), C2));
  readonly zs = computed(() =>
    this.two() ? this.z1().map((slot, i) => slot.map((v, m) => v + this.z2()[i][m])) : this.z1(),
  );
  private readonly code = computed(() => (this.rx() === 1 ? C1 : C2));
  readonly prod = computed(() => this.zs().map((slot) => slot.map((v, m) => v * this.code()[m])));
  readonly sum = computed(() => this.prod().map((slot) => slot.reduce((a, b) => a + b, 0)));
  readonly dec = computed(() => this.sum().map((s) => s / M));
  /** lo que efectivamente mandó el emisor que estamos decodificando */
  readonly sent = computed(() => (this.rx() === 1 ? this.b1() : this.b2()));

  cls(v: number): string {
    if (v === 0) return 'z';
    if (Math.abs(v) >= 2) return v > 0 ? 'p2' : 'n2';
    return v > 0 ? 'p' : 'n';
  }

  readonly explain = computed(() => {
    if (!this.two()) {
      return '<strong>Un solo emisor</strong>: cada bit de datos (representando el 0 como −1) se multiplica por el código de <strong>M = 8 chips</strong> — por eso se habla de <strong>tasa de chipping</strong>, 8 veces más rápida que la de datos. El receptor multiplica lo que llega por el <strong>mismo código</strong>, suma y divide por M: como c·c = 1 en cada chip, la suma da exactamente ±8 y recupera el bit. Cambiá los bits y pasá a <strong>2 emisores</strong>.';
    }
    const other = this.rx() === 1 ? 2 : 1;
    return `<strong>Dos emisores a la vez, en la misma frecuencia</strong>: en el canal las señales <strong>se suman</strong> (por eso aparecen 0 y ±2). Aun así, el receptor que decodifica con c${this.rx() === 1 ? '¹' : '²'} recupera <strong>solo</strong> los datos de ese emisor: la contribución del emisor ${other} se cancela, porque los códigos son <strong>ortogonales</strong> (c¹·c² = 0). Probá cambiar los bits del emisor ${other}: el resultado no se mueve. Es como la fiesta donde cada pareja habla en otro idioma: entendés solo la conversación en el tuyo.`;
  });
}
