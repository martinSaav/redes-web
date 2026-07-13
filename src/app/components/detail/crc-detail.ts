import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface DivRow {
  bits: (0 | 1 | null)[]; // null = celda vacía (antes del alineamiento de G)
  kind: 'dividend' | 'xor' | 'down';
  pos: number; // posición donde se alinea G (para xor)
  hiFrom: number; // rango resaltado
  hiTo: number;
}

@Component({
  selector: 'app-crc-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🧮 CRC: división polinómica módulo 2 (paso a paso)</div>
          <div class="caption">El emisor elige R tal que <code>D·2ʳ XOR R</code> sea divisible por G. En módulo 2, restar = XOR.</div>
        </div>
      </div>

      <div class="ctlbar">
        <label class="fld">
          <span>Datos D</span>
          <input class="bitin" [value]="dInput()" (input)="onD($event)" spellcheck="false" maxlength="14" />
        </label>
        <label class="fld">
          <span>Generador G <small>(r = {{ r() }} bits de CRC)</small></span>
          <input class="bitin g" [value]="gInput()" (input)="onG($event)" spellcheck="false" maxlength="9" />
        </label>
        <div class="presets">
          @for (p of presets; track p.d + p.g) {
            <button class="pbtn" [class.on]="dInput() === p.d && gInput() === p.g" (click)="setPreset(p)">
              {{ p.d }} / {{ p.g }}
            </button>
          }
        </div>
      </div>

      @if (err(); as e) {
        <div class="badge err">⚠️ {{ e }}</div>
      } @else if (calc(); as c) {
        <div class="board">
          <div class="divpanel">
            <div class="dphead">
              División de <b class="d">D·2ʳ = {{ dStr() }}{{ zerosStr() }}</b> por <b class="g">G = {{ gStr() }}</b>
              <span class="revctl">
                <button class="rb" (click)="stepBack()" [disabled]="revealed() <= 0">◀</button>
                <span class="rn">{{ Math.min(revealed(), c.rows.length) }}/{{ c.rows.length }}</span>
                <button class="rb" (click)="stepFwd()" [disabled]="revealed() >= c.rows.length">▶</button>
                <button class="rb all" (click)="showAll(c.rows.length)">todo</button>
              </span>
            </div>

            <div class="grid" [style.--cols]="c.width">
              @for (row of visibleRows(c); track $index) {
                <div class="drow" [class]="row.kind">
                  @for (b of row.bits; track $index; let j = $index) {
                    <span class="bit"
                          [class.empty]="b === null"
                          [class.hi]="j >= row.hiFrom && j <= row.hiTo && row.kind === 'xor'"
                          [class.rem]="row.kind !== 'dividend' && $index >= c.width - r() && lastVisibleRem(c)">
                      {{ b === null ? '' : b }}
                    </span>
                  }
                  @if (row.kind === 'xor') { <span class="rlab">⊕ G en pos {{ row.pos }}</span> }
                  @if (row.kind === 'down') { <span class="rlab dim">bit 0 → bajo</span> }
                </div>
              }
            </div>

            <div class="result">
              <div class="rline">
                <span class="rk">Resto R (CRC):</span>
                <span class="rv crc">{{ revealed() >= c.rows.length ? c.remStr : '…' }}</span>
              </div>
              <div class="rline">
                <span class="rk">Se transmite D·2ʳ XOR R:</span>
                <span class="rv">
                  @for (b of txWord(); track $index; let j = $index) {
                    <button class="txbit" [class.d]="j < dLen()" [class.crc]="j >= dLen()"
                            [class.flip]="j === errorBit()" (click)="flip(j)"
                            title="Click para invertir este bit (meter un error)">{{ b }}</button>
                  }
                </span>
              </div>
            </div>
          </div>

          <div class="rxpanel" [class.ok]="rxOk()" [class.bad]="!rxOk()">
            <div class="rxhead">📥 Receptor: divide lo recibido por G</div>
            @if (errorBit() === null) {
              <div class="rxword">recibido = {{ txStr() }}</div>
              <div class="rxrem">resto = <b>{{ rxRem() }}</b></div>
              <div class="rxverdict ok">✔ resto 0 → sin errores detectados</div>
            } @else {
              <div class="rxword">recibido = <span [innerHTML]="txHtmlWithError()"></span></div>
              <div class="rxrem">resto = <b>{{ rxRem() }}</b></div>
              @if (rxOk()) {
                <div class="rxverdict warn">⚠ resto 0 pese al error → <b>error NO detectado</b> (raro: el error coincide con un múltiplo de G)</div>
              } @else {
                <div class="rxverdict bad">✖ resto ≠ 0 → <b>¡ERROR DETECTADO!</b> El CRC hizo su trabajo.</div>
              }
            }
            <button class="clearerr" (click)="clearError()" [disabled]="errorBit() === null">↺ quitar error</button>
            <div class="rxnote">Un CRC de r bits detecta <b>toda ráfaga de error de longitud ≤ r</b>. Ethernet usa CRC-32.</div>
          </div>
        </div>

        <div class="tip">
          🎯 Para el oral: R es el <b>resto</b> de dividir D·2ʳ por G en módulo 2 (sumas y restas son <b>XOR</b>, sin acarreo).
          El receptor divide lo recibido por G: <b>resto 0 → OK</b>, resto ≠ 0 → error. Se calcula en <b>hardware</b>, por eso es el estándar de la capa de enlace.
        </div>
      }
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }

    .ctlbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld > span { font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.03em; }
    .fld > span small { text-transform: none; color: #5c6a8e; }
    .bitin { background: #0b0f19; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; color: #79c0ff; font-family: Consolas, monospace; font-size: 1.05rem; letter-spacing: 3px; width: 190px; }
    .bitin.g { color: #ffd54f; width: 120px; }
    .bitin:focus { outline: none; border-color: #1f6feb; }
    .presets { display: flex; gap: 4px; flex-wrap: wrap; align-self: flex-end; padding-bottom: 2px; }
    .pbtn { background: #0b0f19; color: var(--text-dim); border: 1px solid var(--border); border-radius: 7px; padding: 6px 9px; cursor: pointer; font-family: Consolas, monospace; font-size: 0.72rem; }
    .pbtn.on, .pbtn:hover { border-color: #1f6feb; color: #fff; }

    .badge { border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; }
    .badge.err { background: rgba(239,83,80,0.12); border: 1px solid #b23b3b; color: #ef9a9a; }

    .board { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
    .divpanel { flex: 1; min-width: 340px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .dphead { font-size: 0.82rem; color: var(--text); margin-bottom: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .dphead b.d { color: #79c0ff; } .dphead b.g { color: #ffd54f; }
    .revctl { margin-left: auto; display: flex; align-items: center; gap: 4px; }
    .rb { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 3px 9px; cursor: pointer; font-size: 0.8rem; }
    .rb:hover:not(:disabled) { background: #2d3750; }
    .rb:disabled { opacity: 0.35; cursor: default; }
    .rb.all { font-size: 0.7rem; }
    .rn { font-family: Consolas, monospace; font-size: 0.75rem; color: #8b95b5; min-width: 34px; text-align: center; }

    .grid { display: flex; flex-direction: column; gap: 2px; font-family: Consolas, monospace; overflow-x: auto; padding-bottom: 4px; }
    .drow { display: flex; align-items: center; gap: 0; }
    .drow.xor, .drow.down { opacity: 0.95; }
    .bit { width: 22px; height: 24px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #cfe3ff; }
    .drow.dividend .bit { color: #79c0ff; }
    .bit.empty { color: transparent; }
    .bit.hi { background: #4a3a12; color: #ffd54f; border-radius: 3px; }
    .bit.rem { background: #1d3b26; color: #7ee787; border-radius: 3px; }
    .rlab { font-size: 0.62rem; color: #8b95b5; margin-left: 8px; white-space: nowrap; }
    .rlab.dim { color: #5c6a8e; }

    .result { margin-top: 12px; border-top: 1px solid #232b3e; padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    .rline { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rk { font-size: 0.78rem; color: var(--text-dim); }
    .rv { font-family: Consolas, monospace; font-size: 1rem; font-weight: 800; color: #cfe3ff; letter-spacing: 2px; }
    .rv.crc { color: #7ee787; }
    .txbit { background: transparent; border: none; font-family: Consolas, monospace; font-size: 1rem; font-weight: 800; cursor: pointer; padding: 2px 3px; border-radius: 4px; }
    .txbit.d { color: #79c0ff; } .txbit.crc { color: #7ee787; }
    .txbit:hover { background: #2d3750; }
    .txbit.flip { background: #b23b3b; color: #fff; }

    .rxpanel { width: 300px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .rxpanel.ok { border-color: #2ea04366; } .rxpanel.bad { border-color: #b23b3b88; }
    .rxhead { font-weight: 700; font-size: 0.84rem; color: #ffd54f; }
    .rxword { font-family: Consolas, monospace; font-size: 0.82rem; color: #cfe3ff; letter-spacing: 1px; word-break: break-all; }
    .rxword b.errbit { color: #ef5350; background: #4a1d1d; border-radius: 3px; padding: 0 2px; }
    .rxrem { font-family: Consolas, monospace; font-size: 0.9rem; color: var(--text); }
    .rxrem b { color: #ffd54f; }
    .rxverdict { font-size: 0.85rem; font-weight: 700; border-radius: 8px; padding: 8px 10px; }
    .rxverdict.ok { background: rgba(46,160,67,0.12); color: #7ee787; border: 1px solid #2ea04355; }
    .rxverdict.bad { background: rgba(239,83,80,0.12); color: #ef9a9a; border: 1px solid #b23b3b55; }
    .rxverdict.warn { background: rgba(210,153,34,0.12); color: #ffd54f; border: 1px solid #d2992255; }
    .clearerr { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 0.8rem; }
    .clearerr:hover:not(:disabled) { background: #2d3750; }
    .clearerr:disabled { opacity: 0.35; cursor: default; }
    .rxnote { font-size: 0.68rem; color: #8b95b5; line-height: 1.5; margin-top: auto; }
    .rxnote b { color: #cfe3ff; }

    .tip { margin-top: 14px; background: rgba(88,166,255,0.08); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 0.85rem; line-height: 1.55; }
    .tip b { color: #fff; }

    @media (max-width: 780px) { .rxpanel { width: 100%; } }
  `,
})
export class CrcDetail {
  readonly Math = Math;
  readonly presets = [
    { d: '101110', g: '1001' },
    { d: '10011010', g: '1101' },
    { d: '110101111', g: '10011' },
  ];

  readonly dInput = signal('101110');
  readonly gInput = signal('1001');
  readonly revealed = signal(99); // por defecto: todo revelado
  readonly errorBit = signal<number | null>(null);

  onD(ev: Event): void {
    this.dInput.set(this.clean((ev.target as HTMLInputElement).value));
    this.revealed.set(99);
    this.errorBit.set(null);
  }
  onG(ev: Event): void {
    this.gInput.set(this.clean((ev.target as HTMLInputElement).value));
    this.revealed.set(99);
    this.errorBit.set(null);
  }
  setPreset(p: { d: string; g: string }): void {
    this.dInput.set(p.d);
    this.gInput.set(p.g);
    this.revealed.set(99);
    this.errorBit.set(null);
  }
  private clean(s: string): string {
    return s.replace(/[^01]/g, '');
  }

  readonly dBits = computed(() => this.dInput().split('').map((c) => (c === '1' ? 1 : 0) as 0 | 1));
  readonly gBits = computed(() => this.gInput().split('').map((c) => (c === '1' ? 1 : 0) as 0 | 1));
  readonly dLen = computed(() => this.dBits().length);
  readonly r = computed(() => Math.max(this.gBits().length - 1, 0));
  readonly dStr = computed(() => this.dInput());
  readonly gStr = computed(() => this.gInput());
  readonly zerosStr = computed(() => '0'.repeat(this.r()));

  readonly err = computed<string | null>(() => {
    if (this.dBits().length < 1) return 'Ingresá los bits de datos D (solo 0 y 1).';
    if (this.gBits().length < 2) return 'El generador G debe tener al menos 2 bits.';
    if (this.gBits()[0] !== 1) return 'G debe empezar en 1 (el bit más significativo).';
    if (this.dBits().length < this.r()) return 'D debería ser al menos tan largo como r (bits de CRC).';
    return null;
  });

  /** división módulo 2 → filas + resto */
  readonly calc = computed(() => {
    if (this.err()) return null;
    const d = this.dBits();
    const g = this.gBits();
    const r = this.r();
    const width = d.length + r;
    const rem: (0 | 1)[] = [...d, ...Array(r).fill(0) as (0 | 1)[]];
    const rows: DivRow[] = [];
    // fila del dividendo
    rows.push({ bits: [...rem], kind: 'dividend', pos: -1, hiFrom: -1, hiTo: -1 });
    for (let i = 0; i < d.length; i++) {
      if (rem[i] === 1) {
        for (let j = 0; j <= r; j++) rem[i + j] = (rem[i + j] ^ g[j]) as 0 | 1;
        rows.push({ bits: [...rem], kind: 'xor', pos: i, hiFrom: i, hiTo: i + r });
      } else {
        rows.push({ bits: [...rem], kind: 'down', pos: i, hiFrom: -1, hiTo: -1 });
      }
    }
    const remBits = rem.slice(d.length); // últimos r bits = resto
    const remStr = remBits.join('');
    return { rows, width, remStr, remBits };
  });

  visibleRows(c: { rows: DivRow[] }): DivRow[] {
    return c.rows.slice(0, Math.min(this.revealed(), c.rows.length));
  }
  lastVisibleRem(c: { rows: DivRow[] }): boolean {
    return this.revealed() >= c.rows.length;
  }

  stepFwd(): void {
    const c = this.calc();
    if (!c) return;
    this.revealed.update((v) => Math.min(v >= 99 ? c.rows.length : v + 1, c.rows.length));
  }
  stepBack(): void {
    const c = this.calc();
    if (!c) return;
    this.revealed.update((v) => Math.max((v >= 99 ? c.rows.length : v) - 1, 0));
  }
  showAll(n: number): void {
    this.revealed.set(n);
  }

  // palabra transmitida = D + R
  readonly txWord = computed<(0 | 1)[]>(() => {
    const c = this.calc();
    if (!c) return [];
    return [...this.dBits(), ...c.remBits];
  });
  readonly txStr = computed(() => this.txWord().join(''));

  flip(j: number): void {
    this.errorBit.update((e) => (e === j ? null : j));
  }
  clearError(): void {
    this.errorBit.set(null);
  }

  /** palabra recibida (con posible bit invertido) */
  private readonly rxWord = computed<(0 | 1)[]>(() => {
    const w = [...this.txWord()];
    const e = this.errorBit();
    if (e !== null && e >= 0 && e < w.length) w[e] = (w[e] ^ 1) as 0 | 1;
    return w;
  });

  /** resto de dividir lo recibido por G */
  readonly rxRem = computed(() => {
    const c = this.calc();
    if (!c) return '';
    const g = this.gBits();
    const r = this.r();
    const rem = [...this.rxWord()];
    for (let i = 0; i < rem.length - r; i++) {
      if (rem[i] === 1) for (let j = 0; j <= r; j++) rem[i + j] = (rem[i + j] ^ g[j]) as 0 | 1;
    }
    return rem.slice(rem.length - r).join('');
  });
  readonly rxOk = computed(() => /^0*$/.test(this.rxRem()));

  txHtmlWithError(): string {
    const w = this.txWord();
    const e = this.errorBit();
    return w
      .map((b, j) => (j === e ? '<b class="errbit">' + (b ^ 1) + '</b>' : String(b)))
      .join('');
  }
}
