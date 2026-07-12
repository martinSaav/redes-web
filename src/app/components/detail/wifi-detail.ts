import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface Card {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
}

interface WifiStep {
  cards: Card[];
  msg: string;
  static?: boolean;
  boom?: boolean; // colisión en el AP
  nav?: boolean; // C en silencio (NAV activo)
}

const A: Pos = { x: 15, y: 55 };
const AP: Pos = { x: 50, y: 55 };
const C: Pos = { x: 85, y: 55 };

const STEPS: WifiStep[] = [
  {
    cards: [{ from: AP, to: AP, text: '📡 beacons…' }], static: true,
    msg: 'Mirá los <strong>círculos de cobertura</strong>: A y C alcanzan al AP, pero <strong>NO se escuchan entre sí</strong> (sus círculos no se tocan). Eso es el <strong>terminal oculto</strong> — y es la receta del desastre.',
  },
  {
    cards: [
      { from: A, to: AP, text: 'DATA de A' },
      { from: C, to: AP, text: 'DATA de C', color: '#ce93d8' },
    ],
    msg: 'A escucha el canal: libre ✔. C escucha el canal: libre ✔ (¡no puede oír a A!). Los dos transmiten <strong>a la vez</strong>…',
  },
  {
    cards: [{ from: AP, to: AP, text: '💥 COLISIÓN' }], static: true, boom: true,
    msg: '💥 <strong>Colisionan EN el AP</strong>: las señales se superponen y ambas tramas se pierden. Peor aún: <strong>ninguno lo detectó</strong> — en wireless tu propia señal (fortísima) tapa la del otro, y al terminal oculto ni lo escuchás. Por eso <strong>NO se puede hacer CSMA/CD</strong>.',
  },
  {
    cards: [
      { from: A, to: A, text: '⏳ sin ACK → reintento' },
    ], static: true,
    msg: '¿Cómo se enteran de que falló? Por la <strong>ausencia del ACK</strong>: en 802.11 cada trama bien recibida se confirma con un ACK explícito de capa 2. No llegó → asumen colisión → <strong>backoff aleatorio</strong> y reintento. Ahora, la solución elegante:',
  },
  {
    cards: [{ from: A, to: AP, text: 'RTS (Request To Send)' }],
    msg: 'A pide el canal con un <strong>RTS</strong>: una trama cortita que dice "quiero transmitir X tiempo". Si el RTS colisiona, se pierde poco.',
  },
  {
    cards: [
      { from: AP, to: A, text: 'CTS ✔', color: '#7ee787' },
      { from: AP, to: C, text: 'CTS (¡C también lo oye!)', color: '#7ee787' },
    ],
    msg: 'El AP responde <strong>CTS</strong> (Clear To Send)… y como el AP SÍ llega a todos, <strong>C también lo escucha</strong>: se entera de que el canal queda reservado aunque jamás haya oído a A.',
  },
  {
    cards: [{ from: A, to: AP, text: 'DATA 📦 (canal reservado)', color: '#80d8ff' }], nav: true,
    msg: 'A transmite tranquilo. C tiene su <strong>NAV</strong> (Network Allocation Vector) activo: "canal ocupado hasta tal momento" → <strong>se calla</strong> aunque su portadora diga "libre".',
  },
  {
    cards: [{ from: AP, to: A, text: 'ACK ✔', color: '#7ee787' }], nav: true,
    msg: 'Trama recibida bien → <strong>ACK explícito</strong>. Ciclo completo sin colisión. El costo del RTS/CTS es overhead: por eso es <strong>opcional</strong> y se usa para tramas grandes.',
  },
];

@Component({
  selector: 'app-wifi-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📶 Terminal oculto: la colisión invisible y el arreglo RTS/CTS</div>
          <div class="caption">Los círculos de cobertura muestran POR QUÉ A y C no se escuchan — y por qué WiFi evita (CA) en vez de detectar (CD).</div>
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

      <div class="canvas">
        <!-- círculos de cobertura -->
        <svg class="ranges" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse [attr.cx]="a.x" [attr.cy]="a.y" rx="27" ry="42" class="range ra" />
          <ellipse [attr.cx]="c.x" [attr.cy]="c.y" rx="27" ry="42" class="range rc" />
          <ellipse [attr.cx]="ap.x" [attr.cy]="ap.y" rx="30" ry="46" class="range rap" />
        </svg>
        <div class="rlabel la">alcance de A</div>
        <div class="rlabel lc">alcance de C</div>
        <div class="gap">← A y C no se solapan →</div>

        <div class="node an" [class.nav]="false" [class.active]="activeN(a)" [style.left.%]="a.x" [style.top.%]="a.y">
          <strong>📱 Terminal A</strong><small>quiere transmitir</small>
        </div>
        <div class="node apn" [class.boom]="boom()" [class.active]="activeN(ap)" [style.left.%]="ap.x" [style.top.%]="ap.y">
          <strong>📡 Access Point</strong><small>los escucha a AMBOS</small>
        </div>
        <div class="node cn" [class.active]="activeN(c)" [style.left.%]="c.x" [style.top.%]="c.y">
          <strong>📱 Terminal C</strong><small>oculto para A</small>
          @if (nav()) {
            <span class="navbadge">🤫 NAV activo: en silencio</span>
          }
        </div>

        @for (card of cards(); track $index) {
          <div class="qcard" [style.left.%]="card.x" [style.top.%]="card.y"
               [style.border-color]="card.color" [style.box-shadow]="'0 0 14px ' + card.color + '55'">
            {{ card.text }}
          </div>
        }
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .canvas {
      position: relative; min-height: 320px;
      background: radial-gradient(ellipse at 50% 55%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .ranges { position: absolute; inset: 0; width: 100%; height: 100%; }
    .range { fill: none; stroke-width: 0.4; vector-effect: non-scaling-stroke; stroke-dasharray: 3 2; }
    .range.ra { stroke: #4caf50; fill: rgba(76, 175, 80, 0.05); }
    .range.rc { stroke: #ab47bc; fill: rgba(171, 71, 188, 0.05); }
    .range.rap { stroke: #f68c1f66; }
    .rlabel { position: absolute; font-size: 0.62rem; font-weight: 700; }
    .rlabel.la { left: 6%; top: 12%; color: #7ee787; }
    .rlabel.lc { right: 6%; top: 12%; color: #ce93d8; }
    .gap { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); font-size: 0.64rem; color: #5c6a8e; font-style: italic; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 110px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); }
    .node.an { background: #2e7d32; }
    .node.apn { background: #f68c1f; }
    .node.cn { background: #7b1fa2; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.boom { border-color: #ef5350; box-shadow: 0 0 22px rgba(239, 83, 80, 0.8); }
    .navbadge { font-size: 0.58rem; font-weight: 800; margin-top: 3px; padding: 1px 8px; border-radius: 8px; background: #2b2a1a; color: #ffd54f; border: 1px solid #d29922; }

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
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }
  `,
})
export class WifiDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly a = A;
  readonly ap = AP;
  readonly c = C;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3300;
  }

  readonly cards = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [];
    const p = this.ease(this.progress());
    return STEPS[i].cards.map((c) => ({
      text: c.text,
      color: c.color ?? '#ffd54f',
      x: c.from.x + (c.to.x - c.from.x) * p,
      y: c.from.y + (c.to.y - c.from.y) * p,
    }));
  });

  readonly boom = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].boom && this.progress() >= 1;
  });

  readonly nav = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].nav;
  });

  activeN(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return STEPS[i].cards.some(
      (c) => (c.from.x === p.x && c.from.y === p.y) || (c.to.x === p.x && c.to.y === p.y),
    );
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>CSMA/CA completo</strong>: escuchar (DIFS) + backoff aleatorio + ACK explícito + RTS/CTS opcional contra el terminal oculto. Y el detalle de la trama 802.11: lleva <strong>4 direcciones MAC</strong> — necesita identificar también al AP para el relay hacia la LAN cableada.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Primero vas a ver la colisión que nadie detecta; después, cómo RTS/CTS la evita.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
