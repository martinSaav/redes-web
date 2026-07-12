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

interface SStep {
  cards: Card[];
  static?: boolean;
  msg: string;
  appHot?: boolean; // la app de ruteo "pensando"
  table?: 'none' | 'v1' | 'v1flash' | 'v2' | 'v2flash'; // flow table de s1
  linkDown?: boolean; // s2-s4 caído (persiste desde que ocurre)
  path?: 'a' | 'b' | null; // camino iluminado: a = s1-s2-s4 · b = s1-s3-s4
}

const CTRL: Pos = { x: 50, y: 15 };
const S1: Pos = { x: 13, y: 62 };
const S2: Pos = { x: 45, y: 45 };
const S3: Pos = { x: 45, y: 88 };
const S4: Pos = { x: 84, y: 62 };

const STEPS: SStep[] = [
  {
    cards: [], static: true, table: 'none',
    msg: 'La arquitectura SDN en tres pisos: abajo, <strong>switches "tontos"</strong> que solo hacen match+action; en el medio, el <strong>controlador</strong> lógicamente centralizado (replicado físicamente) con la <strong>vista global</strong>; arriba, las <strong>apps de red</strong> (¡Dijkstra como app!) sobre la API northbound. Las líneas punteadas violetas son el canal <strong>OpenFlow (southbound)</strong>.',
  },
  {
    cards: [{ from: { x: -5, y: 62 }, to: S1, text: '📦 dst 10.0.4.7' }], table: 'none',
    msg: 'Llega un paquete a <strong>s1</strong>… y su flow table está <strong>VACÍA</strong>: ninguna entrada matchea. ¿Qué hace un switch que no sabe?',
  },
  {
    cards: [{ from: S1, to: CTRL, text: 'PACKET-IN ⤴', color: '#ce93d8' }], table: 'none',
    msg: '<strong>PACKET-IN</strong>: le manda el paquete al controlador por el canal OpenFlow — "¿qué hago con esto?". (Solo pasa con el PRIMER paquete del flujo.)',
  },
  {
    cards: [], static: true, appHot: true, table: 'none',
    msg: 'El controlador consulta su <strong>vista global de la topología</strong> y la <strong>app de ruteo</strong> (northbound) corre Dijkstra: el mejor camino hacia 10.0.4/24 es <strong>s1 → s2 → s4</strong>.',
  },
  {
    cards: [
      { from: CTRL, to: S1, text: 'FLOW-MOD ⤵', color: '#7ee787' },
      { from: CTRL, to: S2, text: 'FLOW-MOD ⤵', color: '#7ee787' },
      { from: CTRL, to: S4, text: 'FLOW-MOD ⤵', color: '#7ee787' },
    ],
    table: 'v1flash',
    msg: '<strong>FLOW-MOD</strong>: instala la regla <code>match: dst 10.0.4/24 → action: forward</code> en <strong>TODOS los switches del camino</strong> de una sola vez. Mirá la flow table de s1 →',
  },
  {
    cards: [{ from: S1, to: S2, text: '📦 match ✔', color: '#ffd54f' }], table: 'v1', path: 'a',
    msg: 'Ahora el paquete (y TODOS los siguientes del flujo) <strong>matchean en hardware</strong> y vuelan sin molestar al controlador…',
  },
  {
    cards: [{ from: S2, to: S4, text: '📦 → destino', color: '#ffd54f' }], table: 'v1', path: 'a',
    msg: '…s2 → s4 y afuera. Bonus conceptual: con otras reglas, la <strong>misma caja</strong> es router (match IP), switch (match MAC), firewall (action: drop) o NAT (action: modify-field).',
  },
  {
    cards: [], static: true, linkDown: true, table: 'v1',
    msg: '💥 <strong>¡Se cae el enlace s2–s4!</strong> En el mundo clásico, ahora arrancaría la reconvergencia distribuida de OSPF. Acá…',
  },
  {
    cards: [{ from: S2, to: CTRL, text: 'PORT-STATUS ⚠', color: '#ef9a9a' }], linkDown: true, table: 'v1',
    msg: '…el switch avisa con <strong>PORT-STATUS</strong>: "se me murió un puerto". El controlador actualiza su vista de la topología.',
  },
  {
    cards: [], static: true, appHot: true, linkDown: true, table: 'v1',
    msg: 'La app de ruteo <strong>recalcula</strong> con la topología nueva: el camino ahora es <strong>s1 → s3 → s4</strong>. Un programa con la foto completa — sin negociación distribuida.',
  },
  {
    cards: [
      { from: CTRL, to: S1, text: 'FLOW-MOD (update) ⤵', color: '#7ee787' },
      { from: CTRL, to: S3, text: 'FLOW-MOD ⤵', color: '#7ee787' },
    ],
    linkDown: true, table: 'v2flash',
    msg: 'Nuevas <strong>flow-mods</strong>: en s1 la regla <strong>cambia el action</strong> (ahora sale por el puerto hacia s3) y s3 recibe la suya. La tabla de s1 se actualiza →',
  },
  {
    cards: [{ from: S1, to: S3, text: '📦 match ✔', color: '#ffd54f' }], linkDown: true, table: 'v2', path: 'b',
    msg: 'El tráfico sigue fluyendo por el camino nuevo…',
  },
  {
    cards: [{ from: S3, to: S4, text: '📦 → destino', color: '#ffd54f' }], linkDown: true, table: 'v2', path: 'b',
    msg: '…s3 → s4. Falla detectada, ruta recalculada e instalada, <strong>sin que ningún switch haya "hablado" con otro switch</strong>. Lo que antes hacían mil routers negociando, lo hizo un programa.',
  },
];

interface FlowRow {
  match: string;
  action: string;
  counters: string;
}

const TABLE_V1: FlowRow = { match: 'ip · dst 10.0.4.0/24', action: 'forward → puerto 2 (s2)', counters: '1 pkt' };
const TABLE_V2: FlowRow = { match: 'ip · dst 10.0.4.0/24', action: 'forward → puerto 3 (s3)', counters: '412 pkts' };

@Component({
  selector: 'app-sdn-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎛 SDN: packet-in, flow-mod y la caída de enlace en vivo</div>
          <div class="caption">El control plane sale de los routers y se vuelve un programa con la foto completa de la red.</div>
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
          <!-- app northbound -->
          <div class="app" [class.hot]="appHot()">🧠 app de ruteo (Dijkstra) <small>API northbound</small></div>

          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- enlaces de datos -->
            <line [attr.x1]="s1.x" [attr.y1]="s1.y" [attr.x2]="s2.x" [attr.y2]="s2.y" [class.hp]="pathIs('a')" />
            <line [attr.x1]="s2.x" [attr.y1]="s2.y" [attr.x2]="s4.x" [attr.y2]="s4.y" [class.hp]="pathIs('a')" [class.down]="linkDown()" />
            <line [attr.x1]="s1.x" [attr.y1]="s1.y" [attr.x2]="s3.x" [attr.y2]="s3.y" [class.hp]="pathIs('b')" />
            <line [attr.x1]="s3.x" [attr.y1]="s3.y" [attr.x2]="s4.x" [attr.y2]="s4.y" [class.hp]="pathIs('b')" />
            <!-- southbound OpenFlow -->
            <line class="sb" [attr.x1]="ctrl.x" [attr.y1]="ctrl.y + 6" [attr.x2]="s1.x" [attr.y2]="s1.y - 5" />
            <line class="sb" [attr.x1]="ctrl.x" [attr.y1]="ctrl.y + 6" [attr.x2]="s2.x" [attr.y2]="s2.y - 5" />
            <line class="sb" [attr.x1]="ctrl.x" [attr.y1]="ctrl.y + 6" [attr.x2]="s3.x" [attr.y2]="s3.y - 5" />
            <line class="sb" [attr.x1]="ctrl.x" [attr.y1]="ctrl.y + 6" [attr.x2]="s4.x" [attr.y2]="s4.y - 5" />
          </svg>

          @if (linkDown()) {
            <div class="downmark" [style.left.%]="(s2.x + s4.x) / 2" [style.top.%]="(s2.y + s4.y) / 2">💥 caído</div>
          }

          <div class="node ctrln" [class.active]="activeN(ctrl)" [class.hot]="appHot()" [style.left.%]="ctrl.x" [style.top.%]="ctrl.y">
            <strong>🎛 Controlador SDN</strong><small>vista global · ONOS / OpenDaylight</small>
          </div>
          <div class="node swn" [class.active]="activeN(s1)" [style.left.%]="s1.x" [style.top.%]="s1.y"><strong>s1</strong><small>match+action</small></div>
          <div class="node swn" [class.active]="activeN(s2)" [style.left.%]="s2.x" [style.top.%]="s2.y"><strong>s2</strong><small>match+action</small></div>
          <div class="node swn" [class.active]="activeN(s3)" [style.left.%]="s3.x" [style.top.%]="s3.y"><strong>s3</strong><small>match+action</small></div>
          <div class="node swn dst" [class.active]="activeN(s4)" [style.left.%]="s4.x" [style.top.%]="s4.y"><strong>s4</strong><small>→ 10.0.4/24</small></div>

          @for (c of cards(); track $index) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 12px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">📋 Flow table de s1 (OpenFlow)</div>
            <div class="frow th"><span>match</span><span>action</span><span>cont.</span></div>
            @if (flowRow(); as r) {
              <div class="frow" [class.flash]="tableFlash()">
                <span class="fm">{{ r.match }}</span>
                <span class="fa">{{ r.action }}</span>
                <span class="fc">{{ r.counters }}</span>
              </div>
            } @else {
              <div class="tempty">(vacía — todo paquete nuevo genera packet-in)</div>
            }
            <div class="tfoot">match sobre campos de <b>L2/L3/L4</b> (con wildcards) · actions: <b>forward · drop · modify-field · al controlador</b></div>
          </div>

          <div class="msgs">
            <div class="mhead">✉️ Mensajes OpenFlow</div>
            <div class="mline"><b class="p">packet-in</b> switch → controlador: "no sé qué hacer"</div>
            <div class="mline"><b class="r">port-status</b> switch → controlador: "se cayó un puerto"</div>
            <div class="mline"><b class="g">flow-mod</b> controlador → switch: "instalá esta regla"</div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
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
      position: relative; flex: 1; min-height: 350px;
      background: radial-gradient(ellipse at 48% 60%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .app {
      position: absolute; left: 50%; top: 2.5%; transform: translateX(-50%); z-index: 2;
      font-size: 0.62rem; font-weight: 700; color: #ce93d8;
      background: rgba(124,58,237,0.12); border: 1px dashed #7c3aed; border-radius: 8px; padding: 2px 10px;
      transition: box-shadow 0.25s;
    }
    .app small { color: #8b95b5; font-weight: 500; margin-left: 4px; }
    .app.hot { box-shadow: 0 0 14px rgba(167,139,250,0.55); color: #e2ccff; }

    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.7; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wires line.sb { stroke: #7c3aed77; stroke-width: 0.5; stroke-dasharray: 2 2; }
    .wires line.hp { stroke: #ffd54f; stroke-width: 1.6; }
    .wires line.down { stroke: #b23b3b; stroke-dasharray: 1.5 2.5; stroke-width: 1; }

    .downmark {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      font-size: 0.62rem; font-weight: 800; color: #ef9a9a;
      background: rgba(45,20,20,0.95); border: 1px solid #b23b3b; border-radius: 8px; padding: 2px 8px; white-space: nowrap;
    }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 62px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.56rem; color: rgba(255,255,255,0.85); font-family: Consolas, monospace; }
    .node.ctrln { background: #4a2f7d; min-width: 200px; }
    .node.swn { background: #546e7a; }
    .node.swn.dst { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.35); }
    .node.hot { border-color: #a78bfa; box-shadow: 0 0 18px rgba(167,139,250,0.6); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 5;
      background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 4px 8px; font-family: Consolas, monospace; font-size: 0.64rem; color: #e6e9f0; white-space: nowrap;
    }

    .side { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.82rem; margin-bottom: 8px; color: #ffd54f; }
    .frow { display: grid; grid-template-columns: 1.2fr 1.3fr 0.5fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.62rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .frow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .frow:not(.th) { background: #1a2132; border: 1px solid #2d3750; }
    .frow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126,231,135,0.3); background: #16281c; }
    .fm { color: #80d8ff; } .fa { color: #7ee787; } .fc { color: #8b95b5; text-align: right; }
    .tempty { color: #5c6a8e; font-style: italic; font-size: 0.7rem; padding: 6px; }
    .tfoot { margin-top: 6px; border-top: 1px solid #232b3e; padding-top: 6px; font-size: 0.6rem; color: #8b95b5; line-height: 1.55; }
    .tfoot b { color: #cfe3ff; }

    .msgs { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .mhead { font-weight: 700; font-size: 0.78rem; color: #79c0ff; margin-bottom: 6px; }
    .mline { font-size: 0.66rem; color: var(--text); line-height: 1.65; }
    .mline b { font-family: Consolas, monospace; }
    .mline b.p { color: #ce93d8; } .mline b.r { color: #ef9a9a; } .mline b.g { color: #7ee787; }

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

    @media (max-width: 760px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class SdnDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly ctrl = CTRL;
  readonly s1 = S1;
  readonly s2 = S2;
  readonly s3 = S3;
  readonly s4 = S4;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1300;
  }
  protected override stepDwell(): number {
    return 3400;
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

  readonly appHot = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].appHot && this.progress() >= 1;
  });

  readonly linkDown = computed(() => {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return true;
    const s = STEPS[i];
    if (s.linkDown) {
      // en el paso donde se cae, esperar a que complete
      const firstDown = STEPS.findIndex((x) => x.linkDown);
      return i > firstDown || this.progress() >= 1;
    }
    return false;
  });

  /** camino iluminado según el paso actual */
  pathIs(which: 'a' | 'b'): boolean {
    const i = this.index();
    if (i < 0) return false;
    if (this.finished()) return which === 'b';
    return STEPS[i].path === which;
  }

  private tableState = computed<'none' | 'v1' | 'v1flash' | 'v2' | 'v2flash'>(() => {
    const i = this.index();
    if (i < 0) return 'none';
    if (this.finished()) return 'v2';
    const cur = STEPS[i].table ?? 'none';
    if ((cur === 'v1flash' || cur === 'v2flash') && this.progress() < 1) {
      // mientras viaja el flow-mod, mantener el estado anterior
      return i > 0 ? (STEPS[i - 1].table === 'v1flash' ? 'v1' : (STEPS[i - 1].table ?? 'none')) : 'none';
    }
    return cur;
  });

  readonly flowRow = computed<FlowRow | null>(() => {
    const st = this.tableState();
    if (st === 'none') return null;
    return st === 'v1' || st === 'v1flash' ? TABLE_V1 : TABLE_V2;
  });

  readonly tableFlash = computed(() => {
    const st = this.tableState();
    return st === 'v1flash' || st === 'v2flash';
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
      return '<strong>SDN en una frase</strong>: separar el data plane (switches con flow tables) del control plane (controlador + apps) y comunicarlos por <strong>OpenFlow</strong>. Ventajas: gestión central coherente, <strong>programabilidad</strong>, innovación sin tocar hardware. Tensiones: el controlador como punto crítico (→ se replica) y la latencia del lazo switch↔controlador.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: primer paquete sin regla → packet-in → la app decide → flow-mods… y después rompemos un enlace para ver el recálculo centralizado.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
