import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface Parsed {
  ok: boolean;
  a: number;
  b: number;
  c: number;
  d: number;
  prefix: number;
  netInt: number; // dirección de red base (host bits en 0)
  err?: string;
}

interface SubnetRow {
  idx: number;
  netInt: number;
  bcInt: number;
  cidr: string;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
}

interface Bit {
  v: 0 | 1;
  region: 'net' | 'sub' | 'host';
  gap: boolean; // punto separador tras el bit (fin de octeto)
}

@Component({
  selector: 'app-subnet-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🧮 Subnetting interactivo: pedís N subredes, se pintan los bits</div>
          <div class="caption">Cuántos bits “pedís prestados” a la parte de host, y cómo queda cada subred.</div>
        </div>
      </div>

      <div class="ctlbar">
        <label class="fld">
          <span>Red base (CIDR)</span>
          <input class="ipin" [value]="baseInput()" (input)="onBase($event)" spellcheck="false" />
        </label>
        <div class="presets">
          @for (p of presets; track p) {
            <button class="pbtn" [class.on]="baseInput() === p" (click)="setBase(p)">{{ p }}</button>
          }
        </div>
        <label class="fld">
          <span>Subredes que necesito</span>
          <div class="stepper">
            <button class="sbtn" (click)="bump(-1)">−</button>
            <span class="snum">{{ wanted() }}</span>
            <button class="sbtn" (click)="bump(1)">+</button>
          </div>
        </label>
      </div>

      @if (parsed(); as base) {
        @if (!base.ok) {
          <div class="badge err">⚠️ {{ base.err }}</div>
        } @else if (calc(); as c) {
          @if (!c.valid) {
            <div class="badge err">⚠️ {{ c.msg }}</div>
          } @else {
            <div class="summary">
              <div class="pill">/{{ base.prefix }} → <b>/{{ c.newPrefix }}</b></div>
              <div class="pill">🔑 <b>{{ c.borrowed }}</b> bit{{ c.borrowed === 1 ? '' : 's' }} prestado{{ c.borrowed === 1 ? '' : 's' }}</div>
              <div class="pill">🧩 <b>{{ c.count }}</b> subredes (2<sup>{{ c.borrowed }}</sup>)</div>
              <div class="pill">💻 <b>{{ c.hosts >= 0 ? c.hosts : 0 }}</b> hosts útiles c/u</div>
              <div class="pill dim">bloque de {{ c.block }} direcciones</div>
            </div>

            <div class="board">
              <div class="bitpanel">
                <div class="bphead">Bits de la subred <b>#{{ sel() }}</b> ({{ selRow(c)?.cidr }})</div>
                <div class="bitrow">
                  <span class="blab">red</span>
                  <div class="bits">
                    @for (bit of netBits(base, c); track $index) {
                      <span class="bit" [class]="bit.region" [class.gap]="bit.gap">{{ bit.v }}</span>
                    }
                  </div>
                </div>
                <div class="bitrow">
                  <span class="blab">broadcast</span>
                  <div class="bits">
                    @for (bit of bcBits(base, c); track $index) {
                      <span class="bit" [class]="bit.region" [class.gap]="bit.gap">{{ bit.v }}</span>
                    }
                  </div>
                </div>
                <div class="legend">
                  <span><i class="sw net"></i> red original ({{ base.prefix }} bits)</span>
                  <span><i class="sw sub"></i> subred ({{ c.borrowed }} prestados)</span>
                  <span><i class="sw host"></i> host ({{ 32 - c.newPrefix }} bits)</span>
                </div>
                <div class="note">
                  La <b>dirección de red</b> = host bits todos en <b>0</b>; el <b>broadcast</b> = host bits todos en <b>1</b>.
                  Esos 2 no se asignan a máquinas → por eso “−2” en los hosts útiles.
                </div>
              </div>

              <div class="tblpanel">
                <div class="tphead">Subredes de {{ base.a }}.{{ base.b }}.{{ base.c }}.{{ base.d }}/{{ base.prefix }}</div>
                <div class="srow th"><span>#</span><span>red / CIDR</span><span>rango de hosts</span><span>broadcast</span></div>
                @for (r of visibleRows(c); track r.idx) {
                  <div class="srow" [class.sel]="r.idx === sel()" (click)="sel.set(r.idx)">
                    <span class="si">{{ r.idx }}</span>
                    <span class="sc">{{ r.network }}/{{ c.newPrefix }}</span>
                    <span class="sr">{{ c.hosts > 0 ? r.firstHost + ' – ' + r.lastHost : '—' }}</span>
                    <span class="sb">{{ r.broadcast }}</span>
                  </div>
                }
                @if (c.count > visibleRows(c).length) {
                  <div class="more">… y {{ c.count - visibleRows(c).length }} subredes más (mismo patrón)</div>
                }
              </div>
            </div>

            <div class="tip">
              🎯 Para el oral: subnetting es <b>robar bits al host para crear jerarquía</b>. Cada bit prestado <b>duplica</b> la
              cantidad de subredes y <b>parte a la mitad</b> los hosts. El router usa <b>Longest Prefix Match</b>: gana la ruta
              con la máscara más larga (la más específica).
            </div>
          }
        }
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
    .ipin { background: #0b0f19; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; color: #7ee787; font-family: Consolas, monospace; font-size: 0.95rem; width: 190px; }
    .ipin:focus { outline: none; border-color: #1f6feb; }
    .presets { display: flex; gap: 4px; flex-wrap: wrap; align-self: flex-end; padding-bottom: 2px; }
    .pbtn { background: #0b0f19; color: var(--text-dim); border: 1px solid var(--border); border-radius: 7px; padding: 6px 9px; cursor: pointer; font-family: Consolas, monospace; font-size: 0.72rem; }
    .pbtn.on, .pbtn:hover { border-color: #1f6feb; color: #fff; }
    .stepper { display: flex; align-items: center; gap: 4px; background: #0b0f19; border: 1px solid var(--border); border-radius: 8px; padding: 3px; }
    .sbtn { background: var(--panel-2); color: #fff; border: 1px solid var(--border); border-radius: 6px; width: 30px; height: 30px; cursor: pointer; font-size: 1.1rem; font-weight: 700; }
    .sbtn:hover { background: #2d3750; }
    .snum { min-width: 44px; text-align: center; font-family: Consolas, monospace; font-size: 1.05rem; font-weight: 700; color: #ffd54f; }

    .badge { border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; }
    .badge.err { background: rgba(239,83,80,0.12); border: 1px solid #b23b3b; color: #ef9a9a; }

    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .pill { background: #10151f; border: 1px solid var(--border); border-radius: 20px; padding: 6px 14px; font-size: 0.85rem; color: var(--text); }
    .pill b { color: #ffd54f; } .pill sup { font-size: 0.6em; } .pill.dim { color: var(--text-dim); }

    .board { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
    .bitpanel { flex: 1; min-width: 300px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .bphead { font-size: 0.82rem; color: #ffd54f; font-weight: 700; margin-bottom: 10px; }
    .bphead b { color: #fff; }
    .bitrow { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .blab { width: 74px; flex-shrink: 0; font-size: 0.7rem; color: var(--text-dim); text-align: right; }
    .bits { display: flex; flex-wrap: wrap; gap: 2px; }
    .bit { width: 17px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-family: Consolas, monospace; font-size: 0.72rem; font-weight: 700; border-radius: 3px; }
    .bit.net { background: #14335c; color: #79c0ff; }
    .bit.sub { background: #4a3a12; color: #ffd54f; }
    .bit.host { background: #232b3e; color: #6b7695; }
    .bit.gap { margin-right: 9px; position: relative; }
    .bit.gap::after { content: '.'; position: absolute; right: -7px; bottom: 2px; color: #4a5878; font-weight: 900; }
    .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.68rem; color: var(--text-dim); margin: 10px 0 8px; }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
    .sw.net { background: #14335c; } .sw.sub { background: #4a3a12; } .sw.host { background: #232b3e; }
    .note { font-size: 0.72rem; color: #8b95b5; line-height: 1.55; border-top: 1px solid #232b3e; padding-top: 8px; }
    .note b { color: #cfe3ff; }

    .tblpanel { width: 380px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .tphead { font-size: 0.82rem; color: #7ee787; font-weight: 700; margin-bottom: 8px; }
    .srow { display: grid; grid-template-columns: 0.4fr 1.5fr 2fr 1.3fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 5px 6px; border-radius: 6px; align-items: center; cursor: pointer; }
    .srow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; cursor: default; }
    .srow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .srow:not(.th):hover { border-color: #4a5878; }
    .srow.sel { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.3); background: #2b2a1a; }
    .si { color: #5c6a8e; text-align: center; }
    .sc { color: #ffd54f; font-weight: 700; }
    .sr { color: #cfe3ff; }
    .sb { color: #ef9a9a; }
    .more { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 6px; }

    .tip { margin-top: 14px; background: rgba(88,166,255,0.08); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 0.85rem; line-height: 1.55; }
    .tip b { color: #fff; }

    @media (max-width: 760px) {
      .tblpanel { width: 100%; }
    }
  `,
})
export class SubnetDetail {
  readonly presets = ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/16', '200.5.3.0/26'];

  readonly baseInput = signal('192.168.1.0/24');
  readonly wanted = signal(4);
  readonly sel = signal(0);

  onBase(ev: Event): void {
    this.baseInput.set((ev.target as HTMLInputElement).value.trim());
    this.sel.set(0);
  }
  setBase(p: string): void {
    this.baseInput.set(p);
    this.sel.set(0);
  }
  bump(d: number): void {
    this.wanted.update((w) => Math.min(256, Math.max(1, w + d)));
    this.sel.set(0);
  }

  readonly parsed = computed<Parsed>(() => this.parse(this.baseInput()));

  readonly calc = computed(() => {
    const base = this.parsed();
    if (!base.ok) return null;
    const want = this.wanted();
    const borrowed = want <= 1 ? 0 : Math.ceil(Math.log2(want));
    const newPrefix = base.prefix + borrowed;
    if (newPrefix > 32) {
      return {
        valid: false,
        msg: `No entran ${want} subredes en un /${base.prefix}: harían falta /${newPrefix} (más de 32 bits).`,
      } as const;
    }
    const hostBits = 32 - newPrefix;
    const block = Math.pow(2, hostBits);
    const count = Math.pow(2, borrowed);
    const hosts = hostBits >= 2 ? block - 2 : 0;
    return { valid: true, borrowed, newPrefix, block, count, hosts } as const;
  });

  private rowFor(base: Parsed, newPrefix: number, block: number, idx: number): SubnetRow {
    const netInt = base.netInt + idx * block;
    const bcInt = netInt + block - 1;
    return {
      idx,
      netInt,
      bcInt,
      cidr: `${this.intToIp(netInt)}/${newPrefix}`,
      network: this.intToIp(netInt),
      firstHost: this.intToIp(netInt + 1),
      lastHost: this.intToIp(bcInt - 1),
      broadcast: this.intToIp(bcInt),
    };
  }

  visibleRows(c: { newPrefix: number; block: number; count: number }): SubnetRow[] {
    const base = this.parsed();
    const max = Math.min(c.count, 16);
    const out: SubnetRow[] = [];
    for (let i = 0; i < max; i++) out.push(this.rowFor(base, c.newPrefix, c.block, i));
    return out;
  }

  selRow(c: { newPrefix: number; block: number; count: number }): SubnetRow | null {
    const base = this.parsed();
    const idx = Math.min(this.sel(), c.count - 1);
    return this.rowFor(base, c.newPrefix, c.block, idx);
  }

  netBits(base: Parsed, c: { newPrefix: number; block: number; count: number }): Bit[] {
    const r = this.selRow(c);
    return r ? this.bitsOf(r.netInt, base.prefix, c.newPrefix) : [];
  }
  bcBits(base: Parsed, c: { newPrefix: number; block: number; count: number }): Bit[] {
    const r = this.selRow(c);
    return r ? this.bitsOf(r.bcInt, base.prefix, c.newPrefix) : [];
  }

  private bitsOf(n: number, prefix: number, newPrefix: number): Bit[] {
    const out: Bit[] = [];
    for (let i = 0; i < 32; i++) {
      const v = (Math.floor(n / Math.pow(2, 31 - i)) % 2) as 0 | 1;
      const region = i < prefix ? 'net' : i < newPrefix ? 'sub' : 'host';
      out.push({ v, region, gap: i % 8 === 7 && i !== 31 });
    }
    return out;
  }

  private parse(txt: string): Parsed {
    const bad = (err: string): Parsed => ({ ok: false, a: 0, b: 0, c: 0, d: 0, prefix: 0, netInt: 0, err });
    const m = txt.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
    if (!m) return bad('Formato inválido. Usá algo como 192.168.1.0/24');
    const oct = [+m[1], +m[2], +m[3], +m[4]];
    if (oct.some((o) => o > 255)) return bad('Cada octeto debe estar entre 0 y 255.');
    const prefix = +m[5];
    if (prefix < 1 || prefix > 30) return bad('El prefijo base debe estar entre /1 y /30.');
    const ipInt = ((oct[0] * 256 + oct[1]) * 256 + oct[2]) * 256 + oct[3];
    const hostBits = 32 - prefix;
    const netInt = Math.floor(ipInt / Math.pow(2, hostBits)) * Math.pow(2, hostBits);
    const [a, b, c, d] = this.intToOctets(netInt);
    return { ok: true, a, b, c, d, prefix, netInt };
  }

  private intToOctets(n: number): [number, number, number, number] {
    return [
      Math.floor(n / 16777216) % 256,
      Math.floor(n / 65536) % 256,
      Math.floor(n / 256) % 256,
      n % 256,
    ];
  }
  private intToIp(n: number): string {
    return this.intToOctets(n).join('.');
  }
}
