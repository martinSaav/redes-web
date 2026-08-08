import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Redes celulares 4G/LTE: arquitectura all-IP (eNodeB, MME, S-GW, PDN-GW, HSS)
   con separación control/datos; y handover entre estaciones base sin cortar. */

type NId = string;
interface Pkt { from: NId; to: NId; text: string; color?: string; }
interface CStep { pkts: Pkt[]; msg: string; static?: boolean; hi?: NId[]; plane?: 'control' | 'data'; }

/* --- Vista arquitectura --- */
const APOS: Record<NId, { x: number; y: number }> = {
  ue: { x: 12, y: 62 },
  enb: { x: 34, y: 62 },
  mme: { x: 56, y: 25 },
  hss: { x: 80, y: 25 },
  sgw: { x: 56, y: 78 },
  pgw: { x: 78, y: 78 },
  net: { x: 94, y: 62 },
};
const ALINKS: [NId, NId][] = [
  ['ue', 'enb'], ['enb', 'mme'], ['mme', 'hss'], ['enb', 'sgw'], ['sgw', 'pgw'], ['pgw', 'net'],
];
const ARCH: CStep[] = [
  {
    pkts: [{ from: 'ue', to: 'enb', text: '📱 radio' }], hi: ['ue', 'enb'],
    msg: 'El <strong>UE</strong> (tu celular) se conecta por radio a la <strong>eNodeB</strong>: la estación base LTE. Es el único tramo inalámbrico; de ahí en adelante es una red IP cableada.',
  },
  {
    pkts: [{ from: 'enb', to: 'mme', text: 'attach / auth', color: '#c792ea' }, { from: 'mme', to: 'hss', text: 'verifica', color: '#c792ea' }],
    hi: ['mme', 'hss'], plane: 'control',
    msg: '<strong>Plano de control</strong> (morado): la <strong>MME</strong> autentica al UE consultando la <strong>HSS</strong> (base de datos de suscriptores), y arma los <em>bearers</em> (túneles) para la sesión. La MME NO toca los datos del usuario.',
  },
  {
    pkts: [{ from: 'enb', to: 'sgw', text: '📦 datos', color: '#80d8ff' }, { from: 'sgw', to: 'pgw', text: '📦', color: '#80d8ff' }, { from: 'pgw', to: 'net', text: '🌐', color: '#80d8ff' }],
    hi: ['sgw', 'pgw', 'net'], plane: 'data',
    msg: '<strong>Plano de datos</strong> (celeste): los paquetes del usuario van eNodeB → <strong>S-GW</strong> (ancla local, sobrevive los handovers) → <strong>PDN-GW</strong> (borde hacia Internet, asigna IP y hace de gateway) → Internet.',
  },
  {
    pkts: [], static: true,
    msg: '<strong>LTE es all-IP</strong> y separa <strong>control</strong> (MME/HSS) de <strong>datos</strong> (S-GW/PDN-GW) — igual idea que SDN. 5G profundiza esto (núcleo por microservicios, <em>network slicing</em>) para más capacidad y menor latencia.',
  },
];

/* --- Vista handover --- */
interface XY { x: number; y: number; }
const HPOS: { enbA: XY; enbB: XY; sgw: XY; ueStart: XY } = {
  enbA: { x: 26, y: 40 },
  enbB: { x: 74, y: 40 },
  sgw: { x: 50, y: 12 },
  ueStart: { x: 26, y: 78 },
};
const HANDOVER: CStep[] = [
  {
    pkts: [{ from: 'enbA', to: 'ue', text: '📦 datos' }], hi: ['enbA'], static: true,
    msg: 'El <strong>UE</strong> está en la <strong>celda A</strong>, conectado a <strong>eNodeB-A</strong>, recibiendo datos. Y se está <strong>moviendo</strong> hacia la celda B (auto, subte…).',
  },
  {
    pkts: [], static: true, hi: ['enbA', 'enbB'],
    msg: 'A medida que avanza, la señal de <strong>A se debilita</strong> y la de <strong>B se fortalece</strong>. El UE <strong>mide</strong> ambas y le reporta a eNodeB-A: "estoy viendo mejor a B".',
  },
  {
    pkts: [{ from: 'enbA', to: 'enbB', text: 'handover request', color: '#c792ea' }], hi: ['enbA', 'enbB'],
    msg: '<strong>eNodeB-A decide el handover</strong> y coordina con <strong>eNodeB-B</strong> (le pasa el contexto del UE). Se prepara la nueva celda ANTES de soltar la vieja → sin corte.',
  },
  {
    pkts: [{ from: 'sgw', to: 'enbB', text: 'path switch 📦', color: '#80d8ff' }], hi: ['sgw', 'enbB'],
    msg: 'El <strong>S-GW reengancha el camino de datos</strong> hacia eNodeB-B (por eso es el "ancla": no cambia aunque cambie la estación base). El UE ya está en la <strong>celda B</strong>.',
  },
  {
    pkts: [{ from: 'enbB', to: 'ue', text: '📦 datos (sin cortar)', color: '#7ee787' }], hi: ['enbB'],
    msg: '<strong>Handover completo</strong>: la sesión sigue viva, el usuario ni se enteró. Esta continuidad es lo que distingue a la red celular del WiFi (donde re-asociarte a otro AP suele cortar).',
  },
];

@Component({
  selector: 'app-cellular-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📶 Redes celulares 4G/LTE: arquitectura y handover</div>
          <div class="caption">El núcleo all-IP (control vs datos) y cómo la conexión salta de celda sin cortarse.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'arch'" (click)="setMode('arch')">Arquitectura</button>
            <button [class.on]="mode() === 'ho'" (click)="setMode('ho')">Handover</button>
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
        @if (mode() === 'arch') {
          <div class="planelbl ctrl">plano de control</div>
          <div class="planelbl data">plano de datos</div>
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            @for (l of alinks; track l[0] + l[1]) {
              <line [attr.x1]="apos[l[0]].x" [attr.y1]="apos[l[0]].y" [attr.x2]="apos[l[1]].x" [attr.y2]="apos[l[1]].y" class="wire" />
            }
          </svg>
          @for (n of anodes; track n) {
            <div class="node" [class]="'a-' + n" [class.hi]="isHi(n)" [style.left.%]="apos[n].x" [style.top.%]="apos[n].y">
              <strong>{{ label(n) }}</strong><small>{{ sub(n) }}</small>
            </div>
          }
          @for (p of pkts(); track $index) {
            <div class="pkt" [style.left.%]="p.x" [style.top.%]="p.y" [style.border-color]="p.color">{{ p.text }}</div>
          }
        } @else {
          <div class="cell ca" [class.dim]="hoIndex() >= 3"></div>
          <div class="cell cb" [class.on]="hoIndex() >= 3"></div>
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="hpos.sgw.x" [attr.y1]="hpos.sgw.y" [attr.x2]="hpos.enbA.x" [attr.y2]="hpos.enbA.y" class="wire" />
            <line [attr.x1]="hpos.sgw.x" [attr.y1]="hpos.sgw.y" [attr.x2]="hpos.enbB.x" [attr.y2]="hpos.enbB.y" class="wire" [class.hot]="hoIndex() >= 3" />
            <line [attr.x1]="hpos.enbA.x" [attr.y1]="hpos.enbA.y" [attr.x2]="hpos.enbB.x" [attr.y2]="hpos.enbB.y" class="wire dash" />
          </svg>
          <div class="node a-sgw" [class.hi]="isHi('sgw')" [style.left.%]="hpos.sgw.x" [style.top.%]="hpos.sgw.y"><strong>S-GW</strong><small>ancla de datos</small></div>
          <div class="node a-enb" [class.hi]="isHi('enbA')" [style.left.%]="hpos.enbA.x" [style.top.%]="hpos.enbA.y"><strong>📡 eNodeB-A</strong><small>celda A</small></div>
          <div class="node a-enb" [class.hi]="isHi('enbB')" [style.left.%]="hpos.enbB.x" [style.top.%]="hpos.enbB.y"><strong>📡 eNodeB-B</strong><small>celda B</small></div>
          <div class="node a-ue" [style.left.%]="ueX()" [style.top.%]="hpos.ueStart.y"><strong>📱 UE</strong></div>
          @for (p of pkts(); track $index) {
            <div class="pkt" [style.left.%]="p.x" [style.top.%]="p.y" [style.border-color]="p.color">{{ p.text }}</div>
          }
        }
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

    .canvas { position: relative; min-height: 320px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; transition: stroke 0.3s, stroke-width 0.3s; }
    .wire.dash { stroke-dasharray: 3 2; } .wire.hot { stroke: #7ee787; stroke-width: 1.6; }

    .planelbl { position: absolute; z-index: 1; font-size: 0.6rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; }
    .planelbl.ctrl { right: 4%; top: 5%; color: #c792ea; background: rgba(199,146,234,0.1); border: 1px solid #7c3aed55; }
    .planelbl.data { right: 4%; bottom: 30%; color: #80d8ff; background: rgba(128,216,255,0.1); border: 1px solid #1f6feb55; }

    .cell { position: absolute; z-index: 0; border-radius: 50%; border: 1.5px dashed; transition: opacity 0.4s, border-color 0.4s; }
    .cell.ca { left: 6%; top: 22%; width: 40%; height: 66%; border-color: #ec489988; background: rgba(236,72,153,0.06); }
    .cell.cb { right: 6%; top: 22%; width: 40%; height: 66%; border-color: #4a587888; background: rgba(74,88,120,0.05); }
    .cell.ca.dim { opacity: 0.35; }
    .cell.cb.on { border-color: #2ea04388; background: rgba(46,160,67,0.08); }

    .node { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; text-align: center; background: #37455f; border: 1.5px solid #4a5878; border-radius: 10px; padding: 6px 10px; min-width: 60px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: left 0.2s linear, border-color 0.3s, box-shadow 0.3s; }
    .node strong { font-size: 0.72rem; color: #fff; } .node small { font-size: 0.55rem; color: rgba(255,255,255,0.8); }
    .node.a-ue { background: #7b1fa2; } .node.a-enb { background: #b45309; } .node.a-mme { background: #6d28d9; } .node.a-hss { background: #4c1d95; }
    .node.a-sgw { background: #1565c0; } .node.a-pgw { background: #0e7490; } .node.a-net { background: #2e7d32; }
    .node.hi { border-color: #ffd54f; box-shadow: 0 0 15px rgba(255,213,79,0.55); }

    .pkt { position: absolute; transform: translate(-50%,-50%); z-index: 4; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 3px 8px; font-family: Consolas, monospace; font-size: 0.64rem; font-weight: 700; color: #e6e9f0; white-space: nowrap; }

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
export class CellularDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'arch' | 'ho'>('arch');
  readonly steps = computed<CStep[]>(() => (this.mode() === 'arch' ? ARCH : HANDOVER));
  readonly apos = APOS;
  readonly hpos = HPOS;
  readonly alinks = ALINKS;
  readonly anodes: NId[] = ['ue', 'enb', 'mme', 'hss', 'sgw', 'pgw', 'net'];

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 600 : 1300;
  }
  protected override stepDwell(): number {
    return 3900;
  }

  setMode(m: 'arch' | 'ho'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  label(n: NId): string {
    return ({ ue: '📱 UE', enb: '📡 eNodeB', mme: 'MME', hss: 'HSS', sgw: 'S-GW', pgw: 'PDN-GW', net: '🌐 Internet' } as Record<NId, string>)[n] ?? n;
  }
  sub(n: NId): string {
    return ({ ue: 'tu celular', enb: 'estación base', mme: 'control', hss: 'suscriptores', sgw: 'ancla datos', pgw: 'gateway IP', net: '' } as Record<NId, string>)[n] ?? '';
  }

  hoIndex(): number {
    if (this.mode() !== 'ho') return -1;
    return this.finished() ? HANDOVER.length - 1 : this.index();
  }

  ueX(): number {
    // el UE se desplaza de la celda A (eNodeB-A) hacia la B a lo largo de los pasos
    const startX = HPOS.enbA.x, endX = HPOS.enbB.x;
    const n = HANDOVER.length - 1;
    let f: number;
    if (this.mode() !== 'ho' || this.index() < 0) f = 0;
    else if (this.finished()) f = 1;
    else f = Math.min(1, (this.index() + this.progress()) / n);
    return startX + (endX - startX) * f;
  }

  isHi(n: NId): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return (this.steps()[i].hi ?? []).includes(n);
  }

  readonly pkts = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { x: number; y: number; text: string; color: string }[];
    const st = this.steps()[i];
    const p = this.ease(this.progress());
    const POSMAP = this.mode() === 'arch' ? APOS : this.hoPosWithUe();
    return st.pkts.map((k) => {
      const a = POSMAP[k.from]; const b = POSMAP[k.to];
      return { text: k.text, color: k.color ?? '#ffd54f', x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    });
  });

  private hoPosWithUe(): Record<NId, { x: number; y: number }> {
    return { ...HPOS, ue: { x: this.ueX(), y: HPOS.ueStart.y } };
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'arch'
        ? '<strong>Núcleo LTE (EPC)</strong>: eNodeB (radio) + MME/HSS (control) + S-GW/PDN-GW (datos) → todo IP. Separar control de datos es lo que permite escalar y evolucionar a 5G. Probá la vista <strong>Handover</strong>.'
        : '<strong>Handover sin corte</strong>: la clave es preparar la celda destino ANTES de soltar la origen, y que el S-GW (ancla) reenganche el camino de datos. Por eso podés ver un video en el subte cambiando de antena sin que se corte.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. En "Arquitectura" seguí el control (MME/HSS) vs los datos (S-GW/PDN-GW); en "Handover", el celular saltando de celda.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
