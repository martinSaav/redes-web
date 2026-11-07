import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/* Redes de datacenter (Kurose 8ª ed., §6.6, Figs. 6.30 y 6.31).
   Jerarquía clásica vs topología muy interconectada (Clos), con el cálculo del libro:
   N flujos entre racks que comparten el cuello de botella. */

type Topo = 'hier' | 'clos';

interface N { id: string; x: number; y: number; kind: 'br' | 'ar' | 't1' | 't2' | 'tor' | 'lb'; label: string; }
interface L { a: string; b: string; hot?: boolean; }

const NIC = 10; // Gbps de cada host a su ToR

const HIER_N: N[] = [
  { id: 'br', x: 220, y: 16, kind: 'br', label: 'border router' },
  { id: 'ar', x: 220, y: 48, kind: 'ar', label: 'access router' },
  { id: 'B', x: 220, y: 88, kind: 't1', label: 'B' },
  { id: 'lb', x: 318, y: 88, kind: 'lb', label: 'load balancer' },
  { id: 'A', x: 110, y: 140, kind: 't2', label: 'A' },
  { id: 'C', x: 330, y: 140, kind: 't2', label: 'C' },
  ...[1, 2, 3, 4].map((i) => ({ id: 'tor' + i, x: 50 + (i - 1) * 40, y: 196, kind: 'tor' as const, label: '' + i })),
  ...[5, 6, 7, 8].map((i) => ({ id: 'tor' + i, x: 270 + (i - 5) * 40, y: 196, kind: 'tor' as const, label: '' + i })),
];
const HIER_L: L[] = [
  { a: 'br', b: 'ar' }, { a: 'ar', b: 'B' }, { a: 'B', b: 'lb' },
  { a: 'B', b: 'A', hot: true }, { a: 'B', b: 'C', hot: true },
  ...[1, 2, 3, 4].map((i) => ({ a: 'A', b: 'tor' + i, hot: true })),
  ...[5, 6, 7, 8].map((i) => ({ a: 'C', b: 'tor' + i, hot: true })),
];

const T1X = [95, 175, 265, 345];
const CLOS_N: N[] = [
  ...T1X.map((x, i) => ({ id: 's1' + i, x, y: 40, kind: 't1' as const, label: 'T1' })),
  ...T1X.map((x, i) => ({ id: 's2' + i, x, y: 120, kind: 't2' as const, label: 'T2' })),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: 'tor' + (i + 1), x: 45 + i * 50, y: 196, kind: 'tor' as const, label: '' + (i + 1) })),
];
const CLOS_L: L[] = [
  // cada tier-2 conecta con TODOS los tier-1
  ...[0, 1, 2, 3].flatMap((a) => [0, 1, 2, 3].map((b) => ({ a: 's2' + a, b: 's1' + b, hot: a === 0 || a === 2 }))),
  // cada ToR conecta con DOS tier-2
  ...[1, 2, 3, 4].flatMap((t) => [{ a: 'tor' + t, b: 's20', hot: true }, { a: 'tor' + t, b: 's21' }]),
  ...[5, 6, 7, 8].flatMap((t) => [{ a: 'tor' + t, b: 's22', hot: true }, { a: 'tor' + t, b: 's23' }]),
];

@Component({
  selector: 'app-dc-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🏢 Redes de datacenter: jerarquía vs topología interconectada (§6.6)</div>
          <div class="caption">Racks 1–4 le mandan a racks 5–8 (10 hosts por rack). ¿A cuánto le llega a cada flujo?</div>
        </div>
        <div class="mode">
          <button [class.on]="topo() === 'hier'" (click)="topo.set('hier')">Jerárquica (Fig. 6.30)</button>
          <button [class.on]="topo() === 'clos'" (click)="topo.set('clos')">Interconectada / Clos (Fig. 6.31)</button>
        </div>
      </div>

      <div class="board">
        <div class="net">
          <svg viewBox="0 0 440 236" preserveAspectRatio="xMidYMid meet">
            @for (l of links(); track $index) {
              <line [attr.x1]="l.x1" [attr.y1]="l.y1" [attr.x2]="l.x2" [attr.y2]="l.y2" class="lk" [class.hot]="l.hot" />
            }
            @if (topo() === 'hier') {
              <text x="146" y="108" class="neck">100 Gbps · cuello</text>
              <text x="294" y="108" class="neck">100 Gbps</text>
            } @else {
              <text x="220" y="84" class="neck2">4 caminos entre T2 izq. y T2 der. = 400 Gbps</text>
            }
            @for (n of nodes(); track n.id) {
              <g>
                <rect [attr.x]="n.x - w(n) / 2" [attr.y]="n.y - 10" [attr.width]="w(n)" height="20" rx="5" [attr.class]="'nd ' + n.kind" />
                <text [attr.x]="n.x" [attr.y]="n.y + 4" class="nl">{{ n.label }}</text>
              </g>
            }
            @for (n of tors(); track n.id) {
              <rect [attr.x]="n.x - 13" y="212" width="26" height="18" rx="3" class="rack" />
            }
            <text x="220" y="234" class="cap">racks de servidores (ToR arriba de cada uno)</text>
          </svg>
        </div>

        <div class="side">
          <div class="panel">
            <label class="sl">
              <span>flujos simultáneos entre racks: <b>{{ flows() }}</b></span>
              <input type="range" min="1" max="40" step="1" [value]="flows()" (input)="onFlows($event)" />
            </label>
            <div class="calc">
              <div class="kv"><span>capacidad entre las dos mitades</span><b>{{ cap() }} Gbps</b></div>
              <div class="kv"><span>reparto: {{ cap() }} / {{ flows() }}</span><b>{{ share() }} Gbps</b></div>
              <div class="kv"><span>placa de red de cada host</span><b>{{ nic }} Gbps</b></div>
              <div class="kv big"><span>le llega a cada flujo</span><b [class.bad]="rate() < nic">{{ rate() }} Gbps</b></div>
            </div>
            <div class="bar"><div class="fill" [style.width.%]="(rate() / nic) * 100" [class.bad]="rate() < nic"></div></div>
            <div class="note">{{ rate() < nic ? 'El cuello es la red, no la placa: cada flujo usa el ' + pct() + '% de su NIC.' : 'Cada flujo anda a la velocidad completa de su placa (10 Gbps).' }}</div>
          </div>
        </div>
      </div>

      <div class="status" [innerHTML]="explain()"></div>
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .mode { display: flex; flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #a78bfa; color: #160d2b; }

    .board { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
    .net { flex: 1 1 340px; min-width: 0; background: radial-gradient(ellipse at 50% 40%, #1d2538 0%, #151b29 80%); border: 1px solid var(--border); border-radius: 10px; padding: 6px; }
    .net svg { width: 100%; height: auto; display: block; }
    .lk { stroke: #3d4760; stroke-width: 1.2; }
    .lk.hot { stroke: #ffd54f; stroke-width: 2; }
    .nd { stroke-width: 1.2; }
    .nd.br, .nd.ar { fill: #3949ab; stroke: #7986cb; }
    .nd.t1 { fill: #6d28d9; stroke: #c792ea; }
    .nd.t2 { fill: #0e7490; stroke: #67e8f9; }
    .nd.tor { fill: #2e7d32; stroke: #7ee787; }
    .nd.lb { fill: #b45309; stroke: #ffd54f; }
    .nl { fill: #fff; font-size: 9px; font-weight: 700; text-anchor: middle; }
    .rack { fill: #1a2132; stroke: #4a5878; stroke-width: 1; }
    .cap { fill: #5c6a8e; font-size: 8.5px; text-anchor: middle; }
    .neck { fill: #ff8a80; font-size: 8.5px; font-weight: 700; text-anchor: middle; font-family: Consolas, monospace; }
    .neck2 { fill: #7ee787; font-size: 9px; font-weight: 700; text-anchor: middle; font-family: Consolas, monospace; }

    .side { flex: 1 1 240px; min-width: 0; }
    .panel { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; height: 100%; box-sizing: border-box; }
    .sl { display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: var(--text-dim); }
    .sl b { color: #ffd54f; font-family: Consolas, monospace; }
    .sl input { width: 100%; accent-color: #a78bfa; }
    .calc { margin-top: 10px; }
    .kv { display: flex; justify-content: space-between; gap: 8px; font-size: 0.74rem; padding: 4px 0; border-bottom: 1px dashed #232b3e; }
    .kv span { color: var(--text-dim); } .kv b { color: #cfe3ff; font-family: Consolas, monospace; white-space: nowrap; }
    .kv.big { border-bottom: none; font-size: 0.86rem; } .kv.big b { color: #7ee787; } .kv.big b.bad { color: #ff8a80; }
    .bar { height: 10px; background: #1a2132; border: 1px solid #2d3750; border-radius: 5px; overflow: hidden; margin-top: 6px; }
    .fill { height: 100%; background: #2ea043; transition: width 0.25s; } .fill.bad { background: #e5534b; }
    .note { margin-top: 7px; font-size: 0.7rem; color: var(--text-dim); line-height: 1.4; }

    .status { margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; font-size: 0.93rem; line-height: 1.5; }
  `,
})
export class DcDetail {
  readonly topo = signal<Topo>('hier');
  readonly flows = signal(40);
  readonly nic = NIC;

  private byId = computed(() => {
    const m = new Map<string, N>();
    for (const n of this.topo() === 'hier' ? HIER_N : CLOS_N) m.set(n.id, n);
    return m;
  });
  readonly nodes = computed(() => (this.topo() === 'hier' ? HIER_N : CLOS_N));
  readonly tors = computed(() => this.nodes().filter((n) => n.kind === 'tor'));
  readonly links = computed(() => {
    const m = this.byId();
    return (this.topo() === 'hier' ? HIER_L : CLOS_L).map((l) => {
      const a = m.get(l.a)!;
      const b = m.get(l.b)!;
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, hot: !!l.hot };
    });
  });

  w(n: N): number {
    if (n.kind === 'br' || n.kind === 'ar' || n.kind === 'lb') return 86;
    if (n.kind === 'tor') return 24;
    return 34;
  }

  readonly cap = computed(() => (this.topo() === 'hier' ? 100 : 400));
  readonly share = computed(() => +(this.cap() / this.flows()).toFixed(1));
  readonly rate = computed(() => Math.min(NIC, this.share()));
  readonly pct = computed(() => Math.round((this.rate() / NIC) * 100));

  onFlows(e: Event): void {
    this.flows.set(+(e.target as HTMLInputElement).value);
  }

  readonly explain = computed(() => {
    if (this.topo() === 'hier') {
      return '<strong>Jerarquía clásica</strong>: racks → switch ToR → switches tier-2 → tier-1 → access router → border router. Escala a cientos de miles de hosts, pero tiene <strong>poca capacidad de host a host</strong>. El ejemplo del libro: 10 hosts de cada uno de los racks 1–4 le mandan a un host de los racks 5–8. Los <strong>40 flujos cruzan el mismo enlace A→B de 100 Gbps</strong> (y el B→C), así que a cada uno le tocan <strong>100 / 40 = 2,5 Gbps</strong>, cuando la placa de cada host da 10. Mové el slider: hacen falta 10 flujos o menos para que el enlace deje de ser el cuello.';
    }
    return '<strong>Topología muy interconectada (Clos)</strong>: cada ToR se conecta a <strong>dos</strong> switches tier-2, y cada tier-2 a <strong>todos</strong> los tier-1. Entre el primer y el tercer tier-2 hay <strong>4 caminos disjuntos</strong> → <strong>400 Gbps</strong> agregados. Los mismos 40 flujos ahora reciben 400 / 40 = <strong>10 Gbps</strong>: la red dejó de ser el cuello. Además gana <strong>confiabilidad</strong>, porque si se cae un switch quedan otros caminos. Para aprovechar los caminos se usa <strong>ECMP</strong>, que reparte los flujos al azar entre los caminos de igual costo.';
  });
}
