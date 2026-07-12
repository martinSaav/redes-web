import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface CStep {
  aTo: number; // fracción del bus cubierta por la señal de A (desde la izq.)
  bTo: number; // fracción cubierta por la señal de B (desde la der.)
  collision?: boolean;
  jam?: boolean;
  roll?: boolean; // mostrar el sorteo de backoff
  win?: boolean; // B ganó y transmite ok
  msg: string;
}

const STEPS: CStep[] = [
  {
    aTo: 0,
    bTo: 0,
    msg: 'Ethernet clásica: un <strong>bus compartido</strong> (half-duplex). A y B tienen cada uno una trama para enviar. El canal está en silencio.',
  },
  {
    aTo: 0.42,
    bTo: 0,
    msg: '<strong>A escucha</strong> el canal (Carrier Sense): libre → <strong>transmite</strong>. Su señal empieza a propagarse por el cable a velocidad finita.',
  },
  {
    aTo: 0.5,
    bTo: 0.42,
    msg: 'B también quiere enviar. Como está <strong>lejos</strong>, la señal de A <strong>todavía no le llegó</strong> (retardo de propagación) → B escucha “libre” y <strong>también transmite</strong>. Este es el talón de Aquiles.',
  },
  {
    aTo: 0.6,
    bTo: 0.6,
    collision: true,
    msg: 'Las dos señales se <strong>encuentran</strong> en el medio → <strong>COLISIÓN</strong> 💥. Lo que hay en el cable ya no es lo que ninguna transmitió: la energía es anómala.',
  },
  {
    aTo: 0.85,
    bTo: 0.85,
    collision: true,
    jam: true,
    msg: 'Como escuchan MIENTRAS transmiten (Collision <strong>Detection</strong>, solo posible en cable), <strong>ambas detectan</strong> la colisión. Envían una señal de <strong>jam</strong> (refuerzo) para que TODOS se enteren, y <strong>abortan</strong>.',
  },
  {
    aTo: 0,
    bTo: 0,
    roll: true,
    msg: '<strong>Backoff exponencial binario</strong>: tras la colisión n.º <strong>1</strong>, cada estación sortea K uniforme en <strong>{0, 1}</strong> y espera <strong>K × 512</strong> tiempos de bit antes de reintentar. A saca <strong>K=1</strong>, B saca <strong>K=0</strong>.',
  },
  {
    aTo: 0,
    bTo: 1,
    roll: true,
    win: true,
    msg: 'B (K=0) espera <strong>0</strong> → retransmite <strong>ya</strong>. A (K=1) espera 512 tiempos de bit. Ahora el canal está libre para B: <strong>transmite sin colisión</strong> ✔. Cuando A despierte, escuchará ocupado y esperará.',
  },
];

interface RangeRow {
  n: number;
  range: string;
  max: number;
}
const RANGES: RangeRow[] = [
  { n: 1, range: '{0, 1}', max: 1 },
  { n: 2, range: '{0 … 3}', max: 3 },
  { n: 3, range: '{0 … 7}', max: 7 },
  { n: 4, range: '{0 … 15}', max: 15 },
  { n: 5, range: '{0 … 31}', max: 31 },
  { n: 6, range: '{0 … 63}', max: 63 },
  { n: 7, range: '{0 … 127}', max: 127 },
  { n: 8, range: '{0 … 255}', max: 255 },
  { n: 9, range: '{0 … 511}', max: 511 },
  { n: 10, range: '{0 … 1023}', max: 1023 },
];

const BUS_L = 76; // largo del bus en %
const BUS_X0 = 12; // x de A

@Component({
  selector: 'app-csmacd-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📡 CSMA/CD: colisión en el bus + backoff exponencial</div>
          <div class="caption">Escuchar antes de hablar, detectar el choque mientras transmitís, y sortear cuánto esperar.</div>
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

      <div class="board">
        <div class="canvas">
          <div class="bus"></div>

          <div class="awave" [style.left.%]="busX0" [style.width.%]="aWidth()"></div>
          <div class="bwave" [style.left.%]="bLeft()" [style.width.%]="bWidth()"></div>
          @if (collisionZone(); as cz) {
            <div class="collision" [style.left.%]="cz.left" [style.width.%]="cz.width">💥</div>
          }

          <div class="stn a" [class.tx]="aTx()" [class.boom]="boom()" [style.left.%]="busX0">
            <strong>A</strong>
            @if (rolling()) { <span class="k">K={{ kA }}</span> }
          </div>
          <div class="stn b" [class.tx]="bTx()" [class.win]="bWon()" [class.boom]="boom()" [style.left.%]="busX0 + busL">
            <strong>B</strong>
            @if (rolling()) { <span class="k win">K={{ kB }}</span> }
          </div>

          @if (jamming()) {
            <div class="jam">⚡ JAM ⚡</div>
          }
        </div>

        <div class="side">
          <div class="roll" [class.on]="rolling()">
            <div class="rhead">🎲 Sorteo de backoff</div>
            @if (rolling()) {
              <div class="rline">Colisión n.º <b>1</b> → rango K ∈ <b class="y">&#123;0, 1&#125;</b></div>
              <div class="dice">
                <div class="die"><span class="dl">A</span><span class="dv">{{ kA }}</span><span class="dw">espera {{ kA }}×512</span></div>
                <div class="die win"><span class="dl">B</span><span class="dv">{{ kB }}</span><span class="dw">espera {{ kB }}×512</span></div>
              </div>
            } @else {
              <div class="rline dim">Se activa cuando hay colisión.</div>
            }
          </div>

          <div class="tbl">
            <div class="thead">Rango de K según la colisión</div>
            <div class="grow th"><span>n</span><span>K ∈</span><span>espera máx.</span></div>
            @for (r of ranges; track r.n) {
              <div class="grow" [class.now]="rolling() && r.n === 1">
                <span class="gn">{{ r.n }}</span>
                <span class="gr">{{ r.range }}</span>
                <span class="gm">{{ r.max }}×512</span>
              </div>
            }
            <div class="tfoot">
              K se toma de <b>&#123;0 … 2<sup>min(n,10)</sup> − 1&#125;</b> · 512 tiempos de bit ≈ <b>51,2 µs</b> a 10 Mbps ·
              tras <b>16</b> intentos, se abandona la trama.
            </div>
          </div>
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

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas {
      position: relative; flex: 1; min-height: 190px;
      background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .bus { position: absolute; left: 12%; right: 12%; top: 50%; height: 6px; transform: translateY(-50%); background: #39445f; border-radius: 3px; }
    .awave, .bwave { position: absolute; top: 50%; height: 12px; transform: translateY(-50%); border-radius: 3px; transition: none; z-index: 1; }
    .awave { background: linear-gradient(90deg, #1f6feb, #58a6ff); box-shadow: 0 0 10px #1f6feb88; }
    .bwave { background: linear-gradient(90deg, #a78bfa, #7c4dff); box-shadow: 0 0 10px #7c4dff88; }
    .collision {
      position: absolute; top: 50%; height: 20px; transform: translateY(-50%); z-index: 2;
      background: repeating-linear-gradient(45deg, #ef5350, #ef5350 4px, #ff8a80 4px, #ff8a80 8px);
      box-shadow: 0 0 16px #ef5350; border-radius: 3px;
      display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
      animation: buzz 0.3s linear infinite;
    }
    @keyframes buzz { 50% { opacity: 0.55; } }

    .stn {
      position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 3;
      width: 44px; min-height: 44px; border-radius: 10px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      background: #546e7a; border: 2px solid #6b7f89; box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
    }
    .stn strong { color: #fff; font-size: 0.95rem; }
    .stn.a.tx { background: #1565c0; border-color: #58a6ff; box-shadow: 0 0 16px rgba(88,166,255,0.6); }
    .stn.b.tx { background: #5e35b1; border-color: #a78bfa; box-shadow: 0 0 16px rgba(167,139,250,0.6); }
    .stn.boom { background: #b23b3b; border-color: #ef5350; box-shadow: 0 0 18px rgba(239,83,80,0.7); }
    .stn.b.win { background: #2e7d32; border-color: #7ee787; box-shadow: 0 0 16px rgba(126,231,135,0.6); }
    .stn .k { font-size: 0.55rem; font-family: Consolas, monospace; color: #ffd54f; background: #0b0f19; border-radius: 4px; padding: 0 4px; }
    .stn .k.win { color: #7ee787; }

    .jam {
      position: absolute; top: 14%; left: 50%; transform: translateX(-50%); z-index: 4;
      color: #ffd54f; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.05em;
      background: rgba(45,40,10,0.9); border: 1px solid #d29922; border-radius: 8px; padding: 3px 12px;
      animation: buzz 0.25s linear infinite;
    }

    .side { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .roll { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; transition: border-color 0.25s; }
    .roll.on { border-color: #d2992288; box-shadow: 0 0 12px rgba(210,153,34,0.15); }
    .rhead { font-weight: 700; font-size: 0.8rem; color: #ffd54f; margin-bottom: 6px; }
    .rline { font-size: 0.72rem; color: var(--text); } .rline b.y { color: #ffd54f; } .rline.dim { color: #5c6a8e; font-style: italic; }
    .dice { display: flex; gap: 8px; margin-top: 8px; }
    .die { flex: 1; background: #1a2132; border: 1px solid #2d3750; border-radius: 8px; padding: 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
    .die.win { border-color: #2ea043; background: #16281c; }
    .dl { font-size: 0.6rem; color: #8b95b5; } .dv { font-size: 1.3rem; font-weight: 800; color: #ffd54f; font-family: Consolas, monospace; }
    .die.win .dv { color: #7ee787; } .dw { font-size: 0.56rem; color: #6b7695; }

    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.8rem; color: #79c0ff; margin-bottom: 6px; }
    .grow { display: grid; grid-template-columns: 0.4fr 1fr 0.9fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.64rem; padding: 3px 6px; border-radius: 5px; align-items: center; }
    .grow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.52rem; }
    .grow.now { background: rgba(210,153,34,0.14); box-shadow: inset 0 0 0 1px #d2992255; }
    .gn { color: #8b95b5; text-align: center; } .gr { color: #ffd54f; } .gm { color: #79c0ff; text-align: right; }
    .tfoot { margin-top: 8px; border-top: 1px solid #232b3e; padding-top: 7px; font-size: 0.6rem; color: #8b95b5; line-height: 1.55; }
    .tfoot b { color: #cfe3ff; } .tfoot sup { font-size: 0.8em; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 48px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class CsmacdDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly ranges = RANGES;
  readonly busX0 = BUS_X0;
  readonly busL = BUS_L;
  readonly kA = 1;
  readonly kB = 0;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 1100;
  }
  protected override stepDwell(): number {
    return 3000;
  }

  private frac(kind: 'a' | 'b'): number {
    const i = this.index();
    if (i < 0) return 0;
    if (this.finished()) return kind === 'a' ? STEPS[STEPS.length - 1].aTo : STEPS[STEPS.length - 1].bTo;
    const cur = kind === 'a' ? STEPS[i].aTo : STEPS[i].bTo;
    const prev = i > 0 ? (kind === 'a' ? STEPS[i - 1].aTo : STEPS[i - 1].bTo) : 0;
    return prev + (cur - prev) * this.progress();
  }

  readonly aFrac = computed(() => this.frac('a'));
  readonly bFrac = computed(() => this.frac('b'));

  aWidth(): number {
    return this.aFrac() * BUS_L;
  }
  bWidth(): number {
    return this.bFrac() * BUS_L;
  }
  bLeft(): number {
    return BUS_X0 + BUS_L - this.bWidth();
  }

  private aFront(): number {
    return BUS_X0 + this.aFrac() * BUS_L;
  }
  private bFront(): number {
    return BUS_X0 + BUS_L - this.bFrac() * BUS_L;
  }

  collisionZone(): { left: number; width: number } | null {
    if (!this.inCollision()) return null;
    const af = this.aFront();
    const bf = this.bFront();
    if (af <= bf) return null;
    return { left: bf, width: af - bf };
  }

  private inCollision(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].collision;
  }
  boom(): boolean {
    return this.inCollision();
  }
  jamming(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].jam && this.progress() > 0.15;
  }
  rolling(): boolean {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return true;
    return !!STEPS[i].roll;
  }

  aTx(): boolean {
    return this.aFrac() > 0.001 && !this.inCollision();
  }
  bTx(): boolean {
    return this.bFrac() > 0.001 && !this.inCollision() && !this.bWon();
  }
  bWon(): boolean {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return true;
    return !!STEPS[i].win;
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Trama de B entregada.</strong> Las 3 patas de CSMA/CD: <strong>escuchar</strong> antes (carrier sense), <strong>detectar</strong> la colisión transmitiendo (solo en cable) y <strong>backoff exponencial</strong> para no volver a chocar. ⚠️ En WiFi NO se puede detectar mientras se transmite (no se escucha a sí mismo / terminal oculto) → por eso usa CSMA/<strong>CA</strong> (avoidance) con RTS/CTS.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: mirá cómo A y B chocan por el retardo de propagación, y cómo el backoff exponencial decide quién reintenta primero.';
    return STEPS[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
