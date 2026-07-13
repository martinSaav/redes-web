import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';

type Mode = 'tdma' | 'fdma' | 'aloha';
type SlotOutcome = 'idle' | 'success' | 'collision' | 'reserved-idle' | 'reserved-used';

interface Slot {
  n: number;
  outcome: SlotOutcome;
  node: number | null; // nodo que transmitió con éxito
  nodes?: number[]; // en colisión, quiénes chocaron
}

const NODES = 4;
const P_TX = 0.35; // prob. de que un nodo tenga algo para mandar en un slot
const MAX_SLOTS = 40;

@Component({
  selector: 'app-mac-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📡 Protocolos de acceso múltiple: partición vs aleatorio</div>
          <div class="caption">4 nodos, un canal compartido. Mirá cómo cada familia usa (o desperdicia) los slots — y la eficiencia real.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'tdma'" (click)="setMode('tdma')">TDMA</button>
            <button [class.on]="mode() === 'fdma'" (click)="setMode('fdma')">FDMA</button>
            <button [class.on]="mode() === 'aloha'" (click)="setMode('aloha')">Slotted ALOHA</button>
          </div>
          <button class="ctl play" (click)="toggle()">{{ running() ? '⏸ Pausa' : '▶ Correr' }}</button>
          <button class="ctl" (click)="oneStep()">⏭ 1 slot</button>
          <button class="ctl" (click)="reset()">↺</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="speed.set(s)">{{ s }}×</button>
            }
          </div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric big">
          <span class="mlab">eficiencia (slots útiles)</span>
          <span class="mval eff">{{ effPct() }}%</span>
        </div>
        <div class="metric"><span class="mlab">éxitos</span><span class="mval ok">{{ successes() }}</span></div>
        @if (mode() === 'aloha') {
          <div class="metric"><span class="mlab">colisiones</span><span class="mval col">{{ collisions() }}</span></div>
          <div class="metric"><span class="mlab">vacíos</span><span class="mval">{{ empties() }}</span></div>
        } @else {
          <div class="metric"><span class="mlab">slots desperdiciados</span><span class="mval col">{{ empties() }}</span></div>
        }
        <div class="metric"><span class="mlab">slots totales</span><span class="mval">{{ slots().length }}</span></div>
        @if (mode() === 'aloha') {
          <div class="metric wide"><span class="mlab">techo teórico</span><span class="mval formula">máx = 1/e ≈ 37%</span></div>
        } @else {
          <div class="metric wide"><span class="mlab">a carga baja</span><span class="mval formula">justo, pero desperdicia turnos ociosos</span></div>
        }
      </div>

      <div class="board">
        <!-- eje de nodos -->
        <div class="axis">
          <div class="axhead">{{ mode() === 'fdma' ? 'bandas' : 'nodos' }}</div>
          @for (nd of [0,1,2,3]; track nd) {
            <div class="axnode" [style.--nc]="nodeColor(nd)">{{ mode() === 'fdma' ? 'f' : 'n' }}{{ nd }}</div>
          }
        </div>

        <!-- timeline de slots -->
        <div class="timeline">
          <div class="tlhead">
            {{ mode() === 'tdma' ? 'trama TDM: cada nodo tiene su turno fijo' : mode() === 'fdma' ? 'cada nodo tiene su banda de frecuencia fija' : 'todos compiten en cada slot · colisión si ≥2 transmiten' }}
          </div>
          <div class="grid">
            @for (col of slots(); track col.n) {
              <div class="slotcol" [class]="'oc-' + col.outcome">
                @for (nd of [0,1,2,3]; track nd) {
                  <div class="cell"
                       [class.tx]="cellActive(col, nd)"
                       [class.collide]="col.outcome === 'collision' && (col.nodes?.includes(nd))"
                       [style.--nc]="nodeColor(nd)"></div>
                }
                <div class="slotlab">
                  @switch (col.outcome) {
                    @case ('success') { ✔ }
                    @case ('reserved-used') { ✔ }
                    @case ('collision') { 💥 }
                    @default { · }
                  }
                </div>
              </div>
            }
            @if (slots().length === 0) {
              <div class="empty">Presioná ▶ Correr o ⏭ para generar slots.</div>
            }
          </div>
        </div>
      </div>

      <div class="status" [class.done]="false">
        <span [innerHTML]="log()"></span>
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
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.88rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 92px; }
    .speeds { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .metrics { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .metric { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; min-width: 92px; }
    .metric.big { min-width: 130px; } .metric.wide { flex: 1; min-width: 200px; }
    .mlab { font-size: 0.6rem; color: #5c6a8e; text-transform: uppercase; letter-spacing: 0.03em; }
    .mval { font-family: Consolas, monospace; font-size: 1.05rem; font-weight: 800; color: #cfe3ff; }
    .mval.eff { font-size: 1.6rem; color: #7ee787; }
    .mval.ok { color: #7ee787; } .mval.col { color: #ef9a9a; }
    .mval.formula { font-size: 0.82rem; color: #ffd54f; }

    .board { display: flex; gap: 10px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .axis { flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 22px; }
    .axhead { position: absolute; font-size: 0.6rem; color: #5c6a8e; margin-top: -20px; }
    .axnode { width: 40px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-family: Consolas, monospace; font-weight: 800; font-size: 0.72rem; background: color-mix(in srgb, var(--nc) 22%, #10151f); color: var(--nc); border: 1px solid color-mix(in srgb, var(--nc) 50%, transparent); }

    .timeline { flex: 1; min-width: 0; }
    .tlhead { font-size: 0.66rem; color: #8b95b5; margin-bottom: 6px; height: 16px; }
    .grid { display: flex; gap: 3px; overflow-x: auto; padding-bottom: 6px; }
    .slotcol { flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; border-radius: 5px; padding: 2px; }
    .slotcol.oc-collision { background: rgba(239,83,80,0.12); }
    .slotcol.oc-success, .slotcol.oc-reserved-used { background: rgba(46,160,67,0.1); }
    .cell { width: 40px; height: 22px; border-radius: 5px; background: #141a28; border: 1px solid #232b3e; transition: background 0.2s; }
    .cell.tx { background: color-mix(in srgb, var(--nc) 70%, transparent); border-color: var(--nc); }
    .cell.collide { background: #ef5350; border-color: #ff8a80; }
    .slotlab { text-align: center; font-size: 0.7rem; height: 16px; color: #8b95b5; }
    .oc-collision .slotlab { color: #ef5350; } .oc-success .slotlab, .oc-reserved-used .slotlab { color: #7ee787; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.78rem; padding: 20px; }

    .status { margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.93rem; display: flex; align-items: center; line-height: 1.45; }
  `,
})
export class MacDetail implements OnDestroy {
  readonly speedOptions = [0.5, 1, 2];
  readonly speed = signal(1);
  readonly mode = signal<Mode>('aloha');
  readonly running = signal(false);
  readonly slots = signal<Slot[]>([]);

  private tdmaTurn = 0;
  private rafId = 0;
  private lastTs = 0;
  private acc = 0;
  private readonly SLOT_MS = 650;

  readonly successes = computed(() => this.slots().filter((s) => s.outcome === 'success' || s.outcome === 'reserved-used').length);
  readonly collisions = computed(() => this.slots().filter((s) => s.outcome === 'collision').length);
  readonly empties = computed(() => this.slots().filter((s) => s.outcome === 'idle' || s.outcome === 'reserved-idle').length);
  readonly effPct = computed(() => {
    const n = this.slots().length;
    return n === 0 ? 0 : Math.round((this.successes() / n) * 100);
  });

  readonly log = signal(
    'Elegí una familia y corré la simulación. <strong>TDMA/FDMA</strong>: reparto fijo, sin colisiones, pero desperdicia turnos ociosos. <strong>Slotted ALOHA</strong>: todos compiten → colisiones, y la eficiencia se estanca cerca del <strong>37% (1/e)</strong>.',
  );

  nodeColor(n: number): string {
    return ['#4ade80', '#58a6ff', '#f0a83b', '#c084fc'][n] ?? '#8b95b5';
  }

  cellActive(col: Slot, nd: number): boolean {
    if (col.outcome === 'collision') return !!col.nodes?.includes(nd);
    if (col.outcome === 'success' || col.outcome === 'reserved-used') return col.node === nd;
    return false;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
    this.log.set(
      m === 'tdma'
        ? '<strong>TDMA</strong>: el tiempo se divide en <strong>slots fijos</strong>, uno por nodo, rotando. Cero colisiones y perfectamente justo… pero si un nodo no tiene datos, su slot pasa <strong>VACÍO</strong> (desperdicio a carga baja).'
        : m === 'fdma'
          ? '<strong>FDMA</strong>: cada nodo tiene su <strong>banda de frecuencia fija</strong>. Mismo trade-off que TDMA pero en frecuencia: sin colisiones, pero la banda ociosa se desperdicia.'
          : '<strong>Slotted ALOHA</strong>: tiempo ranurado, todos transmiten a tasa completa. Si <strong>≥2 nodos</strong> mandan en el mismo slot → <strong>COLISIÓN</strong> (ambos reintentan). Eficiencia máxima <strong>1/e ≈ 37%</strong>.',
    );
  }

  private genSlot(): Slot {
    const n = this.slots().length;
    if (this.mode() === 'tdma' || this.mode() === 'fdma') {
      // reparto fijo: en TDMA rota el turno; en FDMA cada slot "de tiempo" muestra la banda del nodo del turno
      const node = this.tdmaTurn % NODES;
      this.tdmaTurn++;
      const hasData = Math.random() < 0.6; // el nodo dueño del turno a veces no tiene datos
      return hasData
        ? { n, outcome: 'reserved-used', node, }
        : { n, outcome: 'reserved-idle', node: null };
    }
    // slotted ALOHA: cada nodo transmite con prob P_TX
    const txers: number[] = [];
    for (let i = 0; i < NODES; i++) if (Math.random() < P_TX) txers.push(i);
    if (txers.length === 0) return { n, outcome: 'idle', node: null };
    if (txers.length === 1) return { n, outcome: 'success', node: txers[0] };
    return { n, outcome: 'collision', node: null, nodes: txers };
  }

  private step(): void {
    const s = this.genSlot();
    this.slots.update((arr) => {
      const na = [...arr, s];
      return na.length > MAX_SLOTS ? na.slice(na.length - MAX_SLOTS) : na;
    });
    if (this.mode() === 'aloha') {
      if (s.outcome === 'collision') this.log.set('💥 <strong>Colisión</strong> en el slot ' + s.n + ' (nodos ' + s.nodes!.join(', ') + '): las señales se superponen, ambas tramas se pierden → retransmiten en un slot futuro con probabilidad p.');
      else if (s.outcome === 'success') this.log.set('✔ Slot ' + s.n + ': solo el nodo ' + s.node + ' transmitió → <strong>éxito</strong>. Eficiencia acumulada: ' + this.effPct() + '% (el techo es 37%).');
      else this.log.set('· Slot ' + s.n + ' <strong>vacío</strong>: nadie transmitió. Con muchos nodos, ~63% de los slots se pierden entre vacíos y colisiones.');
    } else {
      if (s.outcome === 'reserved-idle') this.log.set('· Turno del nodo ' + (this.tdmaTurn - 1) % NODES + ' pero <strong>no tenía datos</strong> → slot <strong>desperdiciado</strong>. Nadie más puede usarlo aunque tenga cosas para mandar.');
      else this.log.set('✔ El nodo ' + s.node + ' usó su turno reservado. Sin colisiones nunca — pero mirá cuántos turnos ociosos se pierden.');
    }
  }

  oneStep(): void {
    this.step();
  }

  toggle(): void {
    if (this.running()) { this.running.set(false); cancelAnimationFrame(this.rafId); return; }
    this.running.set(true);
    this.lastTs = performance.now();
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (!this.running()) return;
    this.acc += Math.min(now - this.lastTs, 100) * this.speed();
    this.lastTs = now;
    while (this.acc >= this.SLOT_MS) {
      this.acc -= this.SLOT_MS;
      this.step();
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  reset(): void {
    this.running.set(false);
    cancelAnimationFrame(this.rafId);
    this.slots.set([]);
    this.tdmaTurn = 0;
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
