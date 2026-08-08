import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Gestión de la movilidad (Kurose cap. 7): indirect routing (triángulo) vs direct routing.
   Corresponsal ↔ Home Agent (red hogar) ↔ Foreign Agent + COA (red visitada) ↔ Móvil. */

type NId = 'corr' | 'ha' | 'fa' | 'mob';

const POS: Record<NId, { x: number; y: number }> = {
  corr: { x: 20, y: 15 },
  ha: { x: 20, y: 80 },
  fa: { x: 82, y: 80 },
  mob: { x: 82, y: 48 },
};
const WIRES: [NId, NId][] = [['corr', 'ha'], ['ha', 'fa'], ['fa', 'mob'], ['corr', 'fa']];
// lados del triángulo (indirect): ida corr→ha→fa, vuelta fa→corr
const TRI: [NId, NId][] = [['corr', 'ha'], ['ha', 'fa'], ['corr', 'fa']];

interface MCard { from: NId; to: NId; text: string; color?: string; tunnel?: boolean; }
interface MStep { cards: MCard[]; msg: string; static?: boolean; triangle?: boolean; }

const INDIRECT: MStep[] = [
  {
    cards: [], static: true,
    msg: 'El <strong>móvil</strong> se fue de su <strong>red hogar</strong> y ahora visita una <strong>red foránea</strong>. Ahí consiguió una <strong>COA</strong> (care-of address: una IP temporal) y la <strong>registró en su Home Agent</strong>. Su <strong>home address</strong> permanente NO cambia.',
  },
  {
    cards: [{ from: 'corr', to: 'ha', text: 'datos → home address' }],
    msg: '1. El <strong>corresponsal</strong> le escribe a la <strong>dirección permanente</strong> del móvil (no sabe que se movió). El ruteo normal de Internet lleva el paquete a la <strong>red hogar</strong>.',
  },
  {
    cards: [{ from: 'ha', to: 'fa', text: '📦 encapsulado', color: '#ffb74d', tunnel: true }],
    msg: '2. El <strong>Home Agent</strong> lo <strong>intercepta</strong>, lo <strong>encapsula</strong> (IP dentro de IP) y lo <strong>tunelea</strong> hacia la <strong>COA</strong> en la red foránea.',
  },
  {
    cards: [{ from: 'fa', to: 'mob', text: 'entrega', color: '#7ee787' }],
    msg: '3. El <strong>Foreign Agent</strong> desencapsula y le entrega el paquete al <strong>móvil</strong>. El corresponsal ni se enteró del desvío.',
  },
  {
    cards: [{ from: 'mob', to: 'corr', text: 'respuesta DIRECTA', color: '#80d8ff' }], triangle: true,
    msg: '4. La <strong>respuesta</strong> del móvil va <strong>directo</strong> al corresponsal. Ida por el hogar, vuelta directa: ruta <strong>asimétrica</strong> = el <strong>problema del triángulo</strong>. Simple, pero ineficiente.',
  },
];

const DIRECT: MStep[] = [
  {
    cards: [], static: true,
    msg: 'Mismo escenario: el móvil está en una red foránea con su <strong>COA</strong> registrada en el Home Agent. La idea ahora: evitar el triángulo.',
  },
  {
    cards: [{ from: 'corr', to: 'ha', text: '¿cuál es la COA?', color: '#c792ea' }],
    msg: '1. En <strong>direct routing</strong>, el corresponsal (o su agente) le pregunta <strong>una sola vez</strong> al Home Agent cuál es la <strong>COA actual</strong> del móvil.',
  },
  {
    cards: [{ from: 'ha', to: 'corr', text: 'COA = 79.x.x.x', color: '#c792ea' }],
    msg: '2. El Home Agent le responde la COA. Ahora el corresponsal <strong>sabe dónde está</strong> el móvil de verdad.',
  },
  {
    cards: [{ from: 'corr', to: 'fa', text: '📦 datos DIRECTO a la COA', color: '#80d8ff' }],
    msg: '3. Manda los datos <strong>directo</strong> a la red foránea, <strong>sin pasar por el hogar</strong>. No hay triángulo → camino óptimo.',
  },
  {
    cards: [{ from: 'fa', to: 'mob', text: 'entrega', color: '#7ee787' }],
    msg: '4. Entrega al móvil. <strong>Eficiente</strong>, pero <strong>más complejo</strong>: hay que resolver qué pasa si el móvil <strong>se muda de nuevo</strong> (handoff) mientras el corresponsal usa una COA vieja.',
  },
];

@Component({
  selector: 'app-mobility-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🗺 Movilidad: indirect routing (triángulo) vs direct routing</div>
          <div class="caption">Cómo le llegan los paquetes a un dispositivo que se fue de su red hogar.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'indirect'" (click)="setMode('indirect')">Indirect (triángulo)</button>
            <button [class.on]="mode() === 'direct'" (click)="setMode('direct')">Direct</button>
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

      <div class="canvas">
        <div class="netbox home"><span>🏠 red hogar</span></div>
        <div class="netbox foreign"><span>✈ red foránea (visitada)</span></div>

        <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
          @for (l of wires; track l[0] + l[1]) {
            <line [attr.x1]="pos[l[0]].x" [attr.y1]="pos[l[0]].y" [attr.x2]="pos[l[1]].x" [attr.y2]="pos[l[1]].y"
                  class="wire" [class.tri]="isTri(l)" [class.dash]="l[0] === 'corr' && l[1] === 'fa'" />
          }
        </svg>

        @if (triangleOn()) {
          <div class="trilbl" [style.left.%]="41" [style.top.%]="52">△ TRIÁNGULO<br><small>ida ≠ vuelta</small></div>
        }

        <div class="node corr" [class.active]="activeN('corr')" [style.left.%]="pos.corr.x" [style.top.%]="pos.corr.y">
          <strong>💻 Corresponsal</strong><small>te escribe</small>
        </div>
        <div class="node ha" [class.active]="activeN('ha')" [style.left.%]="pos.ha.x" [style.top.%]="pos.ha.y">
          <strong>🏠 Home Agent</strong><small>intercepta + tunelea</small>
        </div>
        <div class="node fa" [class.active]="activeN('fa')" [style.left.%]="pos.fa.x" [style.top.%]="pos.fa.y">
          <strong>📡 Foreign Agent</strong><small>COA · entrega local</small>
        </div>
        <div class="node mob" [class.active]="activeN('mob')" [style.left.%]="pos.mob.x" [style.top.%]="pos.mob.y">
          <strong>📱 Móvil</strong><small>de visita</small>
        </div>

        @for (card of cards(); track $index) {
          <div class="qcard" [class.tunnel]="card.tunnel" [style.left.%]="card.x" [style.top.%]="card.y"
               [style.border-color]="card.color" [style.box-shadow]="'0 0 14px ' + card.color + '55'">
            {{ card.text }}
          </div>
        }
      </div>

      <div class="legend">
        <span class="lg"><b>home address</b> = IP permanente del móvil</span>
        <span class="lg"><b>COA</b> = IP temporal en la red visitada</span>
        <span class="lg"><b>Home Agent</b> intercepta y tunelea</span>
        <span class="lg"><b>Foreign Agent</b> entrega en la red foránea</span>
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
    .mode button.on { background: #ec4899; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .canvas { position: relative; min-height: 340px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .netbox { position: absolute; z-index: 1; border: 1.5px dashed #4a5878; border-radius: 14px; }
    .netbox span { position: absolute; top: 4px; left: 9px; font-size: 0.62rem; font-weight: 700; color: #8b95b5; }
    .netbox.home { left: 4%; top: 58%; width: 30%; height: 38%; border-color: #2ea04355; background: rgba(46,160,67,0.06); }
    .netbox.home span { color: #7ee787; }
    .netbox.foreign { right: 3%; top: 30%; width: 30%; height: 66%; border-color: #ec489955; background: rgba(236,72,153,0.06); }
    .netbox.foreign span { color: #f48fb1; }

    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; transition: stroke 0.3s, stroke-width 0.3s; }
    .wire.dash { stroke-dasharray: 3 2; }
    .wire.tri { stroke: #ffd54f; stroke-width: 1.6; stroke-dasharray: none; }

    .trilbl { position: absolute; transform: translate(-50%,-50%); z-index: 2; text-align: center; font-size: 0.66rem; font-weight: 800; color: #ffd54f; background: rgba(43,42,26,0.92); border: 1px solid #d29922; border-radius: 8px; padding: 3px 8px; line-height: 1.2; }
    .trilbl small { font-weight: 600; color: #cbb26b; font-size: 0.56rem; }

    .node { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; text-align: center; border-radius: 10px; padding: 7px 11px; min-width: 96px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25); transition: box-shadow 0.25s, border-color 0.25s; }
    .node strong { font-size: 0.76rem; color: #fff; } .node small { font-size: 0.58rem; color: rgba(255,255,255,0.85); }
    .node.corr { background: #3949ab; } .node.ha { background: #2e7d32; } .node.fa { background: #b45309; } .node.mob { background: #7b1fa2; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.4); }

    .qcard { position: absolute; transform: translate(-50%,-50%); z-index: 4; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0; white-space: nowrap; }
    .qcard.tunnel { border-style: double; border-width: 3px; }

    .legend { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-top: 10px; padding: 8px 10px; background: #10151f; border: 1px solid var(--border); border-radius: 8px; font-size: 0.68rem; color: var(--text-dim); }
    .lg b { color: #cfe3ff; font-family: Consolas, monospace; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 10px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
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
export class MobilityDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'indirect' | 'direct'>('indirect');
  readonly steps = computed<MStep[]>(() => (this.mode() === 'indirect' ? INDIRECT : DIRECT));
  readonly pos = POS;
  readonly wires = WIRES;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1300;
  }
  protected override stepDwell(): number {
    return 3700;
  }

  setMode(m: 'indirect' | 'direct'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly cards = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { text: string; color: string; tunnel: boolean; x: number; y: number }[];
    const p = this.ease(this.progress());
    return this.steps()[i].cards.map((c) => ({
      text: c.text,
      color: c.color ?? '#ffd54f',
      tunnel: !!c.tunnel,
      x: POS[c.from].x + (POS[c.to].x - POS[c.from].x) * p,
      y: POS[c.from].y + (POS[c.to].y - POS[c.from].y) * p,
    }));
  });

  triangleOn(): boolean {
    if (this.mode() !== 'indirect') return false;
    if (this.finished()) return true;
    const i = this.index();
    return i >= 0 && !!this.steps()[i].triangle;
  }

  isTri(l: [NId, NId]): boolean {
    if (!this.triangleOn()) return false;
    return TRI.some(([a, b]) => (a === l[0] && b === l[1]) || (a === l[1] && b === l[0]));
  }

  activeN(n: NId): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return this.steps()[i].cards.some((c) => c.from === n || c.to === n);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'indirect'
        ? '<strong>Indirect routing</strong>: todo entra por el Home Agent, que tunelea a la COA. Simple y transparente para el corresponsal, pero la ida da la vuelta por el hogar → <strong>triángulo</strong> ineficiente. Probá la vista <strong>Direct</strong>.'
        : '<strong>Direct routing</strong>: el corresponsal pide la COA una vez y manda directo → sin triángulo, camino óptimo. A cambio: más complejo y hay que manejar el <strong>handoff</strong> si el móvil se muda. <strong>Mobile IP</strong> estandariza agentes, registro de la COA y tunneling.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: seguí cómo un paquete llega a un móvil que dejó su red hogar. Comparás las dos estrategias con el toggle.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
