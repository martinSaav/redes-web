import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/*
 * Playout buffer interactivo: 20 paquetes de audio, enviados cada 200 ms,
 * llegan con jitter. El receptor reproduce a ritmo fijo arrancando con un
 * "colchón" B (el slider). Paquete que llega después de su instante de
 * reproducción = corte (glitch).
 */

const N = 20;
const PERIOD = 200; // ms entre paquetes
const BASE_DELAY = 150; // retardo mínimo de red

const W = 780;
const H = 300;
const PAD_L = 60;
const PAD_R = 20;
const Y_SEND = 52;
const Y_ARR = 138;
const Y_PLAY = 228;

function makeJitter(): number[] {
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const r = Math.random();
    // mayormente moderado, con algún pico ocasional
    out.push(r < 0.75 ? Math.random() * 130 : 130 + Math.random() * 220);
  }
  return out;
}

@Component({
  selector: 'app-playout-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎧 Playout buffer: planchar el jitter (a costa de latencia)</div>
          <div class="caption">20 paquetes de voz llegan desparejo. Movés el colchón y ves cuántos llegan tarde.</div>
        </div>
        <button class="ctl" (click)="regen()">🔀 Regenerar jitter</button>
      </div>

      <div class="ctlbar">
        <label class="sld">
          <span>Buffer de playout: <b>{{ buffer() }} ms</b></span>
          <input type="range" min="0" max="500" step="20" [value]="buffer()" (input)="onBuf($event)" />
        </label>
        <div class="chips">
          <div class="chip" [class.bad]="glitches() > 0" [class.good]="glitches() === 0">
            {{ glitches() === 0 ? '✔' : '💥' }} cortes: <b>{{ glitches() }}</b> / {{ n }}
          </div>
          <div class="chip lat" [class.warn]="totalLat() > 400">
            ⏱ latencia boca-a-oído: <b>{{ totalLat() }} ms</b>
          </div>
        </div>
      </div>

      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="xMidYMid meet">
        <!-- filas -->
        <text [attr.x]="padL - 8" [attr.y]="ySend + 4" text-anchor="end" class="rowlab">emisión</text>
        <text [attr.x]="padL - 8" [attr.y]="yArr + 4" text-anchor="end" class="rowlab">llegada</text>
        <text [attr.x]="padL - 8" [attr.y]="yPlay + 4" text-anchor="end" class="rowlab">playout</text>
        <line [attr.x1]="padL" [attr.y1]="ySend" [attr.x2]="w - padR" [attr.y2]="ySend" class="rowline" />
        <line [attr.x1]="padL" [attr.y1]="yArr" [attr.x2]="w - padR" [attr.y2]="yArr" class="rowline" />
        <line [attr.x1]="padL" [attr.y1]="yPlay" [attr.x2]="w - padR" [attr.y2]="yPlay" class="rowline" />

        @for (p of packets(); track p.i) {
          <!-- viaje por la red -->
          <line [attr.x1]="p.sendX" [attr.y1]="ySend" [attr.x2]="p.arrX" [attr.y2]="yArr" class="net" />
          <!-- espera en el buffer -->
          @if (!p.late) {
            <line [attr.x1]="p.arrX" [attr.y1]="yArr" [attr.x2]="p.playX" [attr.y2]="yPlay" class="buf" />
          }
          <circle [attr.cx]="p.sendX" [attr.cy]="ySend" r="4" class="send" />
          <circle [attr.cx]="p.arrX" [attr.cy]="yArr" r="5" class="arr" [class.spiky]="p.spike" />
          @if (p.late) {
            <text [attr.x]="p.playX" [attr.y]="yPlay + 5" text-anchor="middle" class="miss">✖</text>
          } @else {
            <circle [attr.cx]="p.playX" [attr.cy]="yPlay" r="5" class="play" />
          }
        }

        <text [attr.x]="(padL + w - padR) / 2" [attr.y]="h - 10" text-anchor="middle" class="axis">tiempo →</text>
      </svg>

      <div class="legend">
        <span><i class="sw send"></i> emitido cada 200 ms (parejo)</span>
        <span><i class="sw arr"></i> llega con jitter (desparejo)</span>
        <span><i class="sw play"></i> se reproduce a ritmo fijo</span>
        <span><i class="sw buf"></i> espera en el buffer</span>
        <span><i class="sw miss"></i> llegó tarde → corte</span>
      </div>

      <div class="status" [class.done]="glitches() === 0">
        <span [innerHTML]="verdict()"></span>
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.88rem; }
    .ctl:hover { background: #2d3750; }

    .ctlbar { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; }
    .sld { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 240px; }
    .sld > span { font-size: 0.78rem; color: var(--text-dim); }
    .sld b { color: #ffd54f; font-family: Consolas, monospace; }
    .sld input { width: 100%; accent-color: #1f6feb; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { background: #10151f; border: 1px solid var(--border); border-radius: 16px; padding: 6px 14px; font-size: 0.82rem; color: var(--text); white-space: nowrap; }
    .chip b { font-family: Consolas, monospace; }
    .chip.bad { border-color: #b23b3b; } .chip.bad b { color: #ef9a9a; }
    .chip.good { border-color: #2ea043; } .chip.good b { color: #7ee787; }
    .chip.lat b { color: #79c0ff; }
    .chip.lat.warn { border-color: #d29922; } .chip.lat.warn b { color: #ffd54f; }

    svg { width: 100%; height: auto; display: block; background: #171e2e; border: 1px solid var(--border); border-radius: 10px; }
    .rowlab { fill: #8b95b5; font-size: 11px; font-weight: 700; }
    .rowline { stroke: #2a3450; stroke-width: 1; }
    .axis { fill: #5c6a8e; font-size: 11px; }
    .net { stroke: #39445f; stroke-width: 1; }
    .buf { stroke: #2ea04366; stroke-width: 1.4; }
    .send { fill: #6b7695; }
    .arr { fill: #58a6ff; }
    .arr.spiky { fill: #ffd54f; }
    .play { fill: #7ee787; }
    .miss { fill: #ef5350; font-size: 15px; font-weight: 900; }

    .legend { display: flex; gap: 8px 16px; flex-wrap: wrap; margin-top: 10px; font-size: 0.72rem; color: var(--text-dim); }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .sw.send { background: #6b7695; } .sw.arr { background: #58a6ff; } .sw.play { background: #7ee787; }
    .sw.buf { width: 14px; height: 3px; border-radius: 2px; background: #2ea04366; }
    .sw.miss { background: #ef5350; border-radius: 2px; }

    .status { display: flex; align-items: center; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 48px; font-size: 0.95rem; line-height: 1.5; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
  `,
})
export class PlayoutDetail {
  readonly n = N;
  readonly w = W;
  readonly h = H;
  readonly padL = PAD_L;
  readonly padR = PAD_R;
  readonly ySend = Y_SEND;
  readonly yArr = Y_ARR;
  readonly yPlay = Y_PLAY;

  readonly buffer = signal(120);
  private readonly jitter = signal(makeJitter());

  onBuf(ev: Event): void {
    this.buffer.set(+(ev.target as HTMLInputElement).value);
  }
  regen(): void {
    this.jitter.set(makeJitter());
  }

  /** escala de tiempo → x */
  private tx(t: number): number {
    const tMax = (N - 1) * PERIOD + BASE_DELAY + 500 + 400;
    return PAD_L + (t / tMax) * (W - PAD_L - PAD_R);
  }

  readonly packets = computed(() => {
    const B = this.buffer();
    const jit = this.jitter();
    return jit.map((j, i) => {
      const sendT = i * PERIOD;
      const arrT = sendT + BASE_DELAY + j;
      const playT = BASE_DELAY + B + i * PERIOD; // agenda fija desde el primer instante posible
      return {
        i,
        sendX: this.tx(sendT),
        arrX: this.tx(arrT),
        playX: this.tx(playT),
        late: arrT > playT,
        spike: j > 130,
      };
    });
  });

  readonly glitches = computed(() => this.packets().filter((p) => p.late).length);
  readonly totalLat = computed(() => BASE_DELAY + this.buffer());

  readonly verdict = computed(() => {
    const g = this.glitches();
    const lat = this.totalLat();
    if (g === 0 && lat <= 400) {
      return '<strong>¡Punto dulce!</strong> Cero cortes con ' + lat + ' ms de latencia total. Ese es exactamente el juego del playout buffer: el colchón más CHICO que absorba el jitter. (En VoIP, arriba de ~400 ms la conversación se vuelve incómoda.)';
    }
    if (g === 0) {
      return 'Cero cortes… pero con <strong>' + lat + ' ms</strong> de latencia la conversación ya se pisa (el umbral incómodo ronda los 400 ms). Probá achicar el buffer: ¿cuánto podés bajar sin que aparezcan cortes?';
    }
    return '<strong>' + g + ' paquete' + (g > 1 ? 's llegan' : ' llega') + ' tarde</strong> (✖): al momento de reproducirlos no habían llegado → glitch/silencio. Subí el buffer para absorber el jitter — el retardo de COLA variable en los routers es quien lo genera. Trade-off puro: <strong>+ buffer = − cortes, + latencia</strong>.';
  });
}
