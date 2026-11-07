import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/* Causas y costos de la congestión (Kurose 8ª ed., §3.6.1, Figs. 3.43–3.48).
   Tres escenarios de complejidad creciente; un slider mueve la carga ofrecida
   y se lee el throughput (y la demora) sobre las mismas curvas del libro. */

type Sc = 1 | 2 | 3;
type Sub = 'a' | 'b' | 'c';

const W = 300;
const H = 190;
const PX = 38; // margen izquierdo del gráfico
const PY = 14; // margen superior
const GW = W - PX - 12;
const GH = H - PY - 30;

/** throughput (en unidades de R) para cada curva */
function thr(sc: Sc, sub: Sub, x: number): number {
  if (sc === 1) return Math.min(x, 0.5);
  if (sc === 2) {
    if (sub === 'a') return Math.min(x, 0.5);
    if (sub === 'b') return x - (2 / 3) * x * x; // llega a R/3 en x = R/2
    return x / 2; // cada paquete viaja 2 veces → R/4 en x = R/2
  }
  return 1.6 * x * Math.exp(-Math.pow(x / 0.45, 4)); // sube, pico < R/2, colapsa a 0
}

/** demora relativa del escenario 1 (crece sin cota al acercarse a R/2) */
function delay(x: number): number {
  if (x >= 0.5) return Infinity;
  return (0.05 * x) / (0.5 - x);
}

const COSTS = [
  { id: 1, t: 'Demoras de cola enormes al acercarse a la capacidad del enlace', sc: [1, 2, 3] },
  { id: 2, t: 'Hay que retransmitir para compensar los paquetes descartados por buffer lleno', sc: [2, 3] },
  { id: 3, t: 'Retransmisiones innecesarias (timeout prematuro): el router gasta enlace en copias que no hacían falta', sc: [2, 3] },
  { id: 4, t: 'Un paquete descartado aguas abajo desperdicia la capacidad de TODOS los enlaces anteriores que ya lo transportaron', sc: [3] },
];

@Component({
  selector: 'app-congcost-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📉 Causas y costos de la congestión (§3.6.1)</div>
          <div class="caption">Movés la carga ofrecida y ves qué le pasa al throughput — las curvas de las Figs. 3.44, 3.46 y 3.48.</div>
        </div>
        <div class="mode">
          <button [class.on]="sc() === 1" (click)="setSc(1)">1 · Buffer infinito</button>
          <button [class.on]="sc() === 2" (click)="setSc(2)">2 · Buffer finito</button>
          <button [class.on]="sc() === 3" (click)="setSc(3)">3 · Multisalto</button>
        </div>
      </div>

      <div class="board">
        <div class="left">
          <!-- topología resumida -->
          <svg class="topo" viewBox="0 0 300 92" preserveAspectRatio="xMidYMid meet">
            @if (sc() !== 3) {
              <text x="20" y="22" class="hn">A</text>
              <text x="20" y="74" class="hn">B</text>
              <line x1="32" y1="18" x2="128" y2="46" class="ln a" />
              <line x1="32" y1="70" x2="128" y2="46" class="ln b" />
              <rect x="128" y="32" width="44" height="28" rx="6" class="rtr" />
              <text x="150" y="44" class="rl">router</text>
              <text x="150" y="55" class="rs">{{ sc() === 1 ? 'buffer ∞' : 'buffer finito' }}</text>
              <line x1="172" y1="46" x2="268" y2="18" class="ln a" />
              <line x1="172" y1="46" x2="268" y2="70" class="ln b" />
              <text x="220" y="40" class="cap">enlace R</text>
              <text x="282" y="22" class="hn">C</text>
              <text x="282" y="74" class="hn">D</text>
            } @else {
              <rect x="20" y="10" width="260" height="72" rx="8" class="ring" />
              @for (r of ring; track r.n) {
                <rect [attr.x]="r.x - 15" [attr.y]="r.y - 10" width="30" height="20" rx="5" class="rtr" [class.hot]="r.n === 'R2'" />
                <text [attr.x]="r.x" [attr.y]="r.y + 4" class="rl">{{ r.n }}</text>
              }
              <path d="M 20 10 L 150 10 L 280 46" class="path ac" />
              <path d="M 20 82 L 150 82 L 280 46" class="path bd" />
              <text x="8" y="14" class="hn">A</text>
              <text x="8" y="88" class="hn">D</text>
              <text x="292" y="40" class="hn">B</text>
              <text x="292" y="60" class="hn">C</text>
              <text x="150" y="52" class="leg"><tspan class="ac">A→C</tspan> y <tspan class="bd">B→D</tspan> compiten en R2</text>
            }
          </svg>

          <div class="ctrl">
            <label>
              <span>{{ sc() === 1 ? 'λ_in' : "λ'_in" }} (carga ofrecida) = <b>{{ fmt(x()) }}</b></span>
              <input type="range" min="0" [attr.max]="maxX()" step="0.005" [value]="x()" (input)="onX($event)" />
            </label>
            @if (sc() === 2) {
              <div class="subs">
                <button [class.on]="sub() === 'a'" (click)="sub.set('a')">a · ideal (sin pérdidas)</button>
                <button [class.on]="sub() === 'b'" (click)="sub.set('b')">b · retransmite solo lo perdido</button>
                <button [class.on]="sub() === 'c'" (click)="sub.set('c')">c · + retransmisiones de más</button>
              </div>
            }
          </div>

          <div class="readout">
            <div class="ro"><span>throughput λ_out</span><b>{{ fmt(y()) }}</b></div>
            @if (sc() === 1) {
              <div class="ro"><span>demora media</span><b [class.bad]="x() >= 0.45">{{ delayTxt() }}</b></div>
            }
            @if (sc() === 2 && sub() !== 'a' && x() > 0.01) {
              <div class="ro"><span>de lo enviado, útil</span><b>{{ pct(y() / x()) }}</b></div>
              <div class="ro"><span>de lo enviado, retransmisión</span><b class="bad">{{ pct(1 - y() / x()) }}</b></div>
            }
            @if (sc() === 3) {
              <div class="ro"><span>zona</span><b [class.bad]="x() > 0.42">{{ x() < 0.3 ? 'crece con la carga' : x() < 0.42 ? 'cerca del pico' : 'COLAPSO: más carga → menos throughput' }}</b></div>
            }
          </div>
        </div>

        <div class="right">
          <svg class="chart" [attr.viewBox]="'0 0 ' + w + ' ' + h" preserveAspectRatio="xMidYMid meet">
            <!-- ejes -->
            <line [attr.x1]="px" [attr.y1]="py" [attr.x2]="px" [attr.y2]="py + gh" class="ax" />
            <line [attr.x1]="px" [attr.y1]="py + gh" [attr.x2]="px + gw" [attr.y2]="py + gh" class="ax" />
            <text [attr.x]="px - 6" [attr.y]="sy(0.5) + 3" class="tk end">R/2</text>
            <line [attr.x1]="px" [attr.y1]="sy(0.5)" [attr.x2]="px + gw" [attr.y2]="sy(0.5)" class="grid" />
            @if (sc() === 2) {
              <text [attr.x]="px - 6" [attr.y]="sy(1 / 3) + 3" class="tk end">R/3</text>
              <text [attr.x]="px - 6" [attr.y]="sy(0.25) + 3" class="tk end">R/4</text>
              <line [attr.x1]="px" [attr.y1]="sy(1 / 3)" [attr.x2]="px + gw" [attr.y2]="sy(1 / 3)" class="grid" />
              <line [attr.x1]="px" [attr.y1]="sy(0.25)" [attr.x2]="px + gw" [attr.y2]="sy(0.25)" class="grid" />
            }
            @if (sc() !== 3) {
              <line [attr.x1]="sx(0.5)" [attr.y1]="py" [attr.x2]="sx(0.5)" [attr.y2]="py + gh" class="grid" />
              <text [attr.x]="sx(0.5)" [attr.y]="py + gh + 12" class="tk">R/2</text>
            }
            <text [attr.x]="px + gw / 2" [attr.y]="h - 4" class="axl">{{ sc() === 1 ? 'λ_in' : "λ'_in" }} (carga ofrecida)</text>
            <text [attr.transform]="'translate(10,' + (py + gh / 2) + ') rotate(-90)'" class="axl">λ_out</text>

            <!-- curvas: en el escenario 2 se ven las tres, resaltada la elegida -->
            @for (c of curves(); track c.id) {
              <path [attr.d]="c.d" class="curve" [class.dim]="!c.on" [class.thr]="c.kind === 'thr'" [class.dly]="c.kind === 'dly'" />
              @if (c.label) {
                <text [attr.x]="c.lx" [attr.y]="c.ly" class="clab" [class.dim]="!c.on">{{ c.label }}</text>
              }
            }

            <!-- punto actual -->
            <line [attr.x1]="sx(x())" [attr.y1]="py" [attr.x2]="sx(x())" [attr.y2]="py + gh" class="cur" />
            <circle [attr.cx]="sx(x())" [attr.cy]="sy(y())" r="4.5" class="dot" />
          </svg>
          @if (sc() === 1) {
            <div class="legend"><span class="lt"></span> throughput <span class="ld"></span> demora (crece sin cota en R/2)</div>
          }
        </div>
      </div>

      <div class="status">
        <span [innerHTML]="explain()"></span>
      </div>

      <div class="costs">
        <div class="chead">💸 Los costos de la congestión — los que aparecen en este escenario se encienden</div>
        @for (c of costs; track c.id) {
          <div class="cost" [class.on]="c.sc.includes(sc())">
            <span class="cn">{{ c.id }}</span><span>{{ c.t }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
    .mode { display: flex; flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #f59e0b; color: #1a1205; }

    .board { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
    .left { flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
    .right { flex: 1 1 300px; min-width: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px; }

    .topo { width: 100%; height: auto; background: radial-gradient(ellipse at 50% 50%, #1d2538 0%, #151b29 80%); border: 1px solid var(--border); border-radius: 10px; }
    .hn { fill: #fff; font-size: 12px; font-weight: 800; text-anchor: middle; }
    .ln { stroke-width: 2.2; } .ln.a { stroke: #79c0ff; } .ln.b { stroke: #c792ea; }
    .rtr { fill: #37455f; stroke: #4a5878; stroke-width: 1.2; } .rtr.hot { stroke: #ff6b6b; stroke-width: 2; fill: #3d2a2a; }
    .rl { fill: #fff; font-size: 9px; font-weight: 700; text-anchor: middle; }
    .rs { fill: #ffd54f; font-size: 7.5px; text-anchor: middle; }
    .cap { fill: #8b95b5; font-size: 8px; text-anchor: middle; }
    .ring { fill: none; stroke: #4a5878; stroke-width: 1.2; }
    .path { fill: none; stroke-width: 2.4; } .path.ac { stroke: #79c0ff; } .path.bd { stroke: #c792ea; stroke-dasharray: 4 3; }
    .leg { fill: #9aa4bf; font-size: 8.5px; text-anchor: middle; }
    .leg .ac { fill: #79c0ff; font-weight: 700; } .leg .bd { fill: #c792ea; font-weight: 700; }

    .ctrl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .ctrl label { display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: var(--text-dim); }
    .ctrl b { color: #ffd54f; font-family: Consolas, monospace; }
    .ctrl input { width: 100%; accent-color: #f59e0b; }
    .subs { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .subs button { text-align: left; background: #161d2b; border: 1px solid #232b3e; color: var(--text-dim); border-radius: 6px; padding: 6px 8px; cursor: pointer; font-size: 0.72rem; }
    .subs button.on { border-color: #f59e0b; color: #fff; background: #2b2412; }

    .readout { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; }
    .ro { display: flex; justify-content: space-between; gap: 8px; font-size: 0.74rem; padding: 3px 0; }
    .ro span { color: var(--text-dim); } .ro b { color: #7ee787; font-family: Consolas, monospace; text-align: right; }
    .ro b.bad { color: #ff8a80; }

    .chart { width: 100%; height: auto; display: block; }
    .ax { stroke: #5c6a8e; stroke-width: 1.2; }
    .grid { stroke: #2d3750; stroke-width: 1; stroke-dasharray: 3 3; }
    .tk { fill: #8b95b5; font-size: 9px; text-anchor: middle; font-family: Consolas, monospace; } .tk.end { text-anchor: end; }
    .axl { fill: #8b95b5; font-size: 9px; text-anchor: middle; }
    .curve { fill: none; stroke-width: 2.4; transition: opacity 0.2s; }
    .curve.thr { stroke: #79c0ff; } .curve.dly { stroke: #ff8a80; }
    .curve.dim { opacity: 0.22; }
    .clab { fill: #cfe3ff; font-size: 9px; font-weight: 700; } .clab.dim { opacity: 0.35; }
    .cur { stroke: #ffd54f; stroke-width: 1; stroke-dasharray: 2 2; }
    .dot { fill: #ffd54f; stroke: #1a1205; stroke-width: 1.5; }
    .legend { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.68rem; color: var(--text-dim); margin-top: 4px; }
    .lt, .ld { display: inline-block; width: 14px; height: 3px; border-radius: 2px; } .lt { background: #79c0ff; } .ld { background: #ff8a80; }

    .status { margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; font-size: 0.93rem; line-height: 1.5; }
    .costs { margin-top: 10px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .chead { font-weight: 700; font-size: 0.78rem; color: #fff; margin-bottom: 7px; }
    .cost { display: flex; gap: 8px; align-items: flex-start; font-size: 0.74rem; line-height: 1.4; padding: 6px 8px; border-radius: 6px; border: 1px solid #232b3e; background: #161d2b; margin-bottom: 4px; opacity: 0.4; transition: opacity 0.3s, border-color 0.3s; color: var(--text); }
    .cost.on { opacity: 1; border-color: #ff8a8088; background: #241a1d; }
    .cn { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: #3d2a2a; color: #ff8a80; font-weight: 800; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
  `,
})
export class CongcostDetail {
  readonly sc = signal<Sc>(1);
  readonly sub = signal<Sub>('b');
  readonly x = signal(0.2);
  readonly costs = COSTS;

  readonly w = W;
  readonly h = H;
  readonly px = PX;
  readonly py = PY;
  readonly gw = GW;
  readonly gh = GH;

  readonly ring = [
    { n: 'R1', x: 150, y: 10 },
    { n: 'R2', x: 280, y: 46 },
    { n: 'R3', x: 150, y: 82 },
    { n: 'R4', x: 20, y: 46 },
  ];

  /** dominio del eje x (en unidades de R) */
  readonly xMax = computed(() => (this.sc() === 3 ? 1 : 0.6));
  maxX(): number {
    return this.sc() === 2 ? 0.5 : this.xMax();
  }

  setSc(s: Sc): void {
    this.sc.set(s);
    this.x.set(s === 3 ? 0.25 : 0.2);
  }

  onX(e: Event): void {
    this.x.set(+(e.target as HTMLInputElement).value);
  }

  sx(v: number): number {
    return PX + (v / this.xMax()) * GW;
  }
  sy(v: number): number {
    return PY + GH - (v / 0.6) * GH; // eje y hasta 0,6R
  }

  readonly y = computed(() => thr(this.sc(), this.sub(), this.x()));

  private path(f: (x: number) => number, x0: number, x1: number): string {
    const pts: string[] = [];
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const xv = x0 + ((x1 - x0) * i) / n;
      const yv = Math.min(f(xv), 0.6);
      pts.push((i ? 'L' : 'M') + this.sx(xv).toFixed(1) + ' ' + this.sy(yv).toFixed(1));
    }
    return pts.join(' ');
  }

  readonly curves = computed(() => {
    const s = this.sc();
    if (s === 1) {
      return [
        { id: 't', kind: 'thr', on: true, d: this.path((v) => thr(1, 'a', v), 0, 0.6), label: '', lx: 0, ly: 0 },
        {
          id: 'd', kind: 'dly', on: true,
          d: this.path((v) => Math.min(delay(v), 0.6), 0, 0.498) + ` L${this.sx(0.5).toFixed(1)} ${PY}`,
          label: 'demora', lx: this.sx(0.36), ly: this.sy(0.16),
        },
      ];
    }
    if (s === 2) {
      const sub = this.sub();
      return (['a', 'b', 'c'] as Sub[]).map((k) => ({
        id: k, kind: 'thr', on: k === sub,
        d: this.path((v) => thr(2, k, v), 0, 0.5),
        label: k, lx: this.sx(0.5) + 4, ly: this.sy(thr(2, k, 0.5)) + 3,
      }));
    }
    return [{ id: 's3', kind: 'thr', on: true, d: this.path((v) => thr(3, 'a', v), 0, 1), label: '', lx: 0, ly: 0 }];
  });

  fmt(v: number): string {
    return (v / 1).toFixed(2) + 'R';
  }
  pct(v: number): string {
    return Math.round(Math.max(0, Math.min(1, v)) * 100) + '%';
  }
  delayTxt(): string {
    const d = delay(this.x());
    if (!isFinite(d)) return '∞ (la cola crece sin límite)';
    if (d < 0.02) return 'baja';
    if (d < 0.1) return 'moderada';
    if (d < 0.4) return 'alta';
    return 'enorme';
  }

  readonly explain = computed(() => {
    const s = this.sc();
    const x = this.x();
    if (s === 1) {
      return x < 0.5
        ? '<strong>Escenario 1</strong> (Figs. 3.43–3.44): A y B comparten un enlace de capacidad <strong>R</strong> a través de un router con <strong>buffer infinito</strong>, sin retransmisiones. Hasta <strong>R/2</strong> todo lo que entra sale: el throughput es igual a la tasa de envío. Pero fijate la curva roja: <strong>a medida que te acercás a R/2 la demora se dispara</strong>. Aun en el caso ideal, operar cerca de la capacidad tiene un costo: <strong>colas enormes</strong>.'
        : 'Pasaste <strong>R/2</strong>: el throughput <strong>se clava en R/2</strong> (el enlace se reparte entre dos conexiones) y la cola <strong>crece sin límite</strong> → demora infinita. Mandar más rápido no sirve para nada: solo agranda la cola.';
    }
    if (s === 2) {
      const sub = this.sub();
      if (sub === 'a') return '<strong>Escenario 2a</strong> (Fig. 3.46a): el buffer ahora es <strong>finito</strong> y los paquetes descartados se retransmiten. En el caso irreal en que A <strong>sabe mágicamente</strong> cuándo hay lugar en el buffer, no hay pérdidas: λ\'<sub>in</sub> = λ<sub>in</sub> y el throughput es ideal.';
      if (sub === 'b') return '<strong>Escenario 2b</strong> (Fig. 3.46b): A retransmite <strong>solo cuando el paquete se perdió de verdad</strong>. Con carga ofrecida R/2, al receptor llegan apenas <strong>R/3</strong> de datos originales: de los 0,5R enviados, <strong>0,333R son originales y 0,166R retransmisiones</strong>. Costo nuevo: <strong>hay que retransmitir para compensar los descartes</strong>.';
      return '<strong>Escenario 2c</strong> (Fig. 3.46c): además hay <strong>timeouts prematuros</strong>, así que se retransmiten paquetes que solo estaban demorados. Si cada paquete viaja en promedio <strong>dos veces</strong>, el throughput útil tiende a <strong>R/4</strong>. Costo nuevo: <strong>el router desperdicia enlace en copias innecesarias</strong>.';
    }
    if (x < 0.3) return '<strong>Escenario 3</strong> (Figs. 3.47–3.48): cuatro emisores, caminos de <strong>dos saltos</strong> que se solapan. Con poca carga casi no hay desbordes: más carga ofrecida = más throughput.';
    if (x < 0.42) return 'Cerca del <strong>pico</strong>: el tráfico A→C llega a R2 como mucho a tasa R (lo limita el enlace R1→R2), mientras que el B→D puede llegar mucho más rápido. En R2 empiezan a <strong>competir por el buffer</strong>.';
    return '<strong>Colapso por congestión</strong>: con carga muy alta, R2 se llena de paquetes B→D y casi todo el tráfico A→C se descarta <strong>ahí, en el segundo salto</strong>. El throughput de A→C <strong>tiende a cero</strong>. Peor: todo el trabajo que hizo R1 para transportar esos paquetes <strong>se desperdició</strong>. Más carga → <strong>menos</strong> throughput. Por esto existe el control de congestión.';
  });
}
