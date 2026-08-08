import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

/* El medio inalámbrico es hostil: atenuación con la distancia, SNR→BER,
   modulación adaptativa (más lejos = modulación más robusta y lenta) y multipath. */

const BITS = '101101001011';

interface MedStep {
  rxX: number;      // posición del receptor (%)
  snr: number;      // 0-100 para la barra
  snrDb: string;
  mod: string;
  rate: string;
  ber: string;
  err: number[];    // índices de bits con error
  multipath?: boolean;
  msg: string;
}

const AP = { x: 12, y: 48 };
const WALL = { x: 58, y: 84 };

const STEPS: MedStep[] = [
  {
    rxX: 36, snr: 94, snrDb: '~42 dB', mod: '64-QAM', rate: '54 Mbps', ber: '≈ 10⁻¹⁰', err: [],
    msg: 'Cerca del AP la señal llega <strong>fuerte</strong>: <strong>SNR alta</strong> (señal ≫ ruido). Con tanto margen, el emisor usa una modulación <strong>densa</strong> (64-QAM, muchos bits por símbolo) → <strong>tasa máxima</strong> y casi cero errores.',
  },
  {
    rxX: 55, snr: 64, snrDb: '~24 dB', mod: '16-QAM', rate: '24 Mbps', ber: '≈ 10⁻⁶', err: [],
    msg: 'Nos alejamos: la señal se <strong>atenúa</strong> con la distancia y los obstáculos → <strong>baja la SNR</strong>. WiFi hace <strong>modulación adaptativa</strong>: baja a 16-QAM (menos bits/símbolo) para no llenarse de errores. Menos tasa, pero robusto.',
  },
  {
    rxX: 78, snr: 34, snrDb: '~11 dB', mod: 'BPSK', rate: '6 Mbps', ber: '≈ 10⁻³', err: [4, 9],
    msg: 'Al borde de la cobertura, SNR baja: cae a la modulación <strong>más robusta y lenta</strong> (BPSK, 1 bit/símbolo). Aun así <strong>aparecen errores de bit</strong> (los rojos). Este es el trade-off central: <strong>tasa ↔ distancia/potencia ↔ BER</strong>.',
  },
  {
    rxX: 78, snr: 22, snrDb: '~7 dB', mod: 'BPSK', rate: '6 Mbps', ber: '≈ 10⁻²', err: [1, 4, 7, 9], multipath: true,
    msg: '<strong>Multipath</strong>: la señal rebota en obstáculos y llega por <strong>varios caminos con distinto retardo</strong>. Las copias se <strong>superponen desfasadas</strong> (interferencia entre símbolos) → la BER empeora aunque no te alejes más. Por todo esto en wireless <strong>no se puede CSMA/CD</strong>: el canal es impredecible y tu propia señal tapa la del otro.',
  },
];

@Component({
  selector: 'app-medium-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📉 El canal inalámbrico: atenuación, SNR, BER y multipath</div>
          <div class="caption">Por qué más lejos = menos tasa y más errores — y qué es el multipath.</div>
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
          <svg class="rays" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- camino directo -->
            <line [attr.x1]="ap.x" [attr.y1]="ap.y" [attr.x2]="rxX()" [attr.y2]="ap.y" class="direct" />
            @if (multipath()) {
              <!-- camino reflejado AP → pared → rx -->
              <line [attr.x1]="ap.x" [attr.y1]="ap.y" [attr.x2]="wall.x" [attr.y2]="wall.y" class="reflect" />
              <line [attr.x1]="wall.x" [attr.y1]="wall.y" [attr.x2]="rxX()" [attr.y2]="ap.y" class="reflect" />
            }
          </svg>

          @if (multipath()) {
            <div class="wall" [style.left.%]="wall.x" [style.top.%]="wall.y">🧱 obstáculo</div>
          }

          <div class="node ap" [style.left.%]="ap.x" [style.top.%]="ap.y">
            <strong>📡 AP</strong>
          </div>
          <div class="node rx" [style.left.%]="rxX()" [style.top.%]="ap.y">
            <strong>📱</strong>
          </div>

          <!-- señal viajando -->
          @for (s of signals(); track $index) {
            <div class="sig" [class.echo]="s.echo" [style.left.%]="s.x" [style.top.%]="s.y" [style.border-color]="s.color">
              {{ s.text }}
            </div>
          }

          <div class="distlbl" [style.left.%]="(ap.x + rxX()) / 2">← distancia →</div>
        </div>

        <div class="side">
          <div class="meter">
            <div class="mlabel"><span>SNR (señal / ruido)</span><b>{{ cur().snrDb }}</b></div>
            <div class="bar"><div class="fill" [style.width.%]="cur().snr" [style.background]="snrColor()"></div></div>
          </div>
          <div class="kv">
            <div class="k">Modulación</div><div class="v">{{ cur().mod }}</div>
            <div class="k">Tasa</div><div class="v hot">{{ cur().rate }}</div>
            <div class="k">BER (prob. error/bit)</div><div class="v" [class.bad]="cur().err.length > 0">{{ cur().ber }}</div>
          </div>
          <div class="stream">
            <div class="slabel">bits recibidos</div>
            <div class="bits">
              @for (b of bits; track $index; let i = $index) {
                <span class="bit" [class.err]="cur().err.includes(i)">{{ b }}</span>
              }
            </div>
            <div class="snote" [class.bad]="cur().err.length > 0">
              {{ cur().err.length === 0 ? 'sin errores ✔' : cur().err.length + ' bit(s) con error → retransmisión' }}
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
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 240px; background: radial-gradient(ellipse at 20% 45%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .rays { position: absolute; inset: 0; width: 100%; height: 100%; }
    .direct { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
    .reflect { stroke: #ab47bc; stroke-width: 0.7; stroke-dasharray: 3 2; vector-effect: non-scaling-stroke; }

    .wall { position: absolute; transform: translate(-50%,-50%); z-index: 2; font-size: 0.62rem; color: #ce93d8; background: #2a1d33; border: 1px solid #6a3d7a; border-radius: 6px; padding: 2px 6px; white-space: nowrap; }
    .node { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; border-radius: 10px; padding: 7px 10px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: left 0.2s linear; }
    .node strong { font-size: 0.9rem; color: #fff; }
    .node.ap { background: #f68c1f; } .node.rx { background: #3949ab; }
    .sig { position: absolute; transform: translate(-50%,-50%); z-index: 4; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 3px 8px; font-family: Consolas, monospace; font-size: 0.66rem; font-weight: 700; color: #e6e9f0; white-space: nowrap; }
    .sig.echo { opacity: 0.5; border-style: dashed; }
    .distlbl { position: absolute; bottom: 8px; transform: translateX(-50%); font-size: 0.6rem; color: #5c6a8e; font-style: italic; }

    .side { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .meter { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .mlabel { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-dim); margin-bottom: 6px; } .mlabel b { color: #fff; font-family: Consolas, monospace; }
    .bar { height: 12px; background: #1a2132; border: 1px solid #2d3750; border-radius: 6px; overflow: hidden; }
    .fill { height: 100%; border-radius: 6px 0 0 6px; transition: width 0.4s, background 0.4s; }
    .kv { display: grid; grid-template-columns: 1.3fr 1fr; gap: 4px 8px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; align-items: center; }
    .k { font-size: 0.66rem; color: var(--text-dim); } .v { font-family: Consolas, monospace; font-weight: 800; font-size: 0.82rem; color: #cfe3ff; text-align: right; }
    .v.hot { color: #7ee787; } .v.bad { color: #ef9a9a; }
    .stream { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .slabel { font-size: 0.64rem; color: var(--text-dim); margin-bottom: 6px; }
    .bits { display: flex; gap: 3px; flex-wrap: wrap; }
    .bit { width: 17px; height: 22px; display: flex; align-items: center; justify-content: center; font-family: Consolas, monospace; font-weight: 800; font-size: 0.8rem; color: #cfe3ff; background: #1a2132; border: 1px solid #2d3750; border-radius: 4px; transition: background 0.3s, color 0.3s; }
    .bit.err { background: #4a1d1d; color: #ff8a80; border-color: #b23b3b; box-shadow: 0 0 8px rgba(239,83,80,0.5); }
    .snote { margin-top: 7px; font-size: 0.64rem; color: #7ee787; } .snote.bad { color: #ef9a9a; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) { .board { flex-direction: column; } .side { width: 100%; } }
  `,
})
export class MediumDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly ap = AP;
  readonly wall = WALL;
  readonly bits = BITS.split('');

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 1200;
  }
  protected override stepDwell(): number {
    return 4000;
  }

  readonly cur = computed(() => {
    const i = this.index();
    if (i < 0) return STEPS[0];
    return STEPS[Math.min(i, STEPS.length - 1)];
  });

  rxX(): number {
    const i = this.index();
    if (i < 0) return STEPS[0].rxX;
    if (this.finished()) return STEPS[STEPS.length - 1].rxX;
    const prev = i > 0 ? STEPS[i - 1].rxX : STEPS[0].rxX;
    const cur = STEPS[i].rxX;
    return prev + (cur - prev) * this.ease(this.progress());
  }

  multipath(): boolean {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return !!STEPS[STEPS.length - 1].multipath;
    return !!STEPS[i].multipath;
  }

  snrColor(): string {
    const s = this.cur().snr;
    if (s > 70) return '#2ea043';
    if (s > 45) return '#d4a72c';
    return '#e5534b';
  }

  readonly signals = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { x: number; y: number; text: string; color: string; echo: boolean }[];
    const st = STEPS[i];
    const p = this.ease(this.progress());
    const rx = this.rxX();
    const out = [{
      x: AP.x + (rx - AP.x) * p, y: AP.y, text: '📶 ' + st.rate, color: this.snrColor(), echo: false,
    }];
    if (st.multipath) {
      // eco reflejado: recorre AP→pared→rx, llega retrasado
      const pe = Math.max(0, p - 0.18);
      const total = 1;
      // dos tramos de igual "peso"
      let ex: number, ey: number;
      if (pe < 0.5) {
        const t = pe / 0.5;
        ex = AP.x + (WALL.x - AP.x) * t; ey = AP.y + (WALL.y - AP.y) * t;
      } else {
        const t = (pe - 0.5) / 0.5;
        ex = WALL.x + (rx - WALL.x) * t; ey = WALL.y + (AP.y - WALL.y) * t;
      }
      out.push({ x: ex, y: ey, text: 'eco ⟿', color: '#ab47bc', echo: true });
      void total;
    }
    return out;
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Resumen del canal hostil</strong>: la SNR manda. Más distancia/obstáculos → menos SNR → el emisor baja a modulación más robusta (menos tasa) y aun así sube la BER. Sumale <strong>multipath</strong> e <strong>interferencia</strong> de otras fuentes y tenés un medio impredecible: por eso WiFi <strong>evita (CA) + ACK</strong> en vez de detectar colisiones (CD).';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: alejá el receptor del AP y mirá la SNR caer, la modulación bajar y aparecer los errores de bit.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
