import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface RipRow {
  dst: string; // subred destino
  next: string; // próximo router
  hops: number; // saltos (métrica RIP)
}

interface RipStep {
  table: RipRow[]; // tabla de ruteo de D al completar el paso
  advFrom?: string; // router que manda el advertisement
  advRows?: { dst: string; hops: number }[]; // vector anunciado
  changed?: string[]; // subredes que cambian (resaltar)
  msg: string;
  static?: boolean;
}

/* Ejemplo estilo Kurose (Fig. 5.7/5.8): router D recibe un advertisement de A y actualiza su tabla RIP.
   La métrica de RIP son SALTOS (hops), máximo 15 (16 = ∞ = inalcanzable). */
const STEPS: RipStep[] = [
  {
    static: true,
    table: [
      { dst: 'w', next: 'A', hops: 2 },
      { dst: 'y', next: 'B', hops: 2 },
      { dst: 'z', next: 'B', hops: 7 },
      { dst: 'x', next: '—', hops: 1 },
    ],
    msg: 'RIP es <strong>distance-vector</strong> y su métrica son <strong>SALTOS</strong> (hops). Cada router tiene una <strong>tabla de ruteo</strong>: por cada subred destino, cuál es el <strong>próximo router</strong> y a cuántos saltos está. Esta es la tabla del router <strong>D</strong>.',
  },
  {
    static: false,
    advFrom: 'A',
    advRows: [
      { dst: 'z', hops: 4 },
      { dst: 'w', hops: 1 },
      { dst: 'x', hops: 1 },
    ],
    table: [
      { dst: 'w', next: 'A', hops: 2 },
      { dst: 'y', next: 'B', hops: 2 },
      { dst: 'z', next: 'B', hops: 7 },
      { dst: 'x', next: '—', hops: 1 },
    ],
    msg: 'Cada <strong>~30 segundos</strong>, los vecinos intercambian su vector de distancias. Llega un <strong>advertisement del vecino A</strong>: "yo llego a z en 4 saltos, a w en 1, a x en 1". D lo va a procesar.',
  },
  {
    static: true,
    table: [
      { dst: 'w', next: 'A', hops: 2 },
      { dst: 'y', next: 'B', hops: 2 },
      { dst: 'z', next: 'A', hops: 5 },
      { dst: 'x', next: '—', hops: 1 },
    ],
    changed: ['z'],
    msg: 'D suma <strong>+1</strong> (el salto hasta A) a cada distancia anunciada. Para <strong>z</strong>: vía A serían 4+1 = <strong>5 saltos</strong>, MEJOR que los 7 que tenía vía B → <strong>actualiza</strong>: z ahora vía A, 5 saltos. (Para w y x no mejora, quedan igual.)',
  },
  {
    static: true,
    table: [
      { dst: 'w', next: 'A', hops: 2 },
      { dst: 'y', next: 'B', hops: 2 },
      { dst: 'z', next: 'A', hops: 5 },
      { dst: 'x', next: '—', hops: 1 },
    ],
    msg: 'Y D reanuncia SU tabla actualizada a sus vecinos. Detalle clave de RIP: el máximo es <strong>15 saltos</strong> — <strong>16 = ∞ = inalcanzable</strong>. Eso limita RIP a redes chicas… pero también <strong>acota el daño</strong> del count-to-infinity.',
  },
];

@Component({
  selector: 'app-rip-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📇 RIP: la tabla de ruteo y el intercambio de vectores</div>
          <div class="caption">Métrica = saltos. Un advertisement del vecino, +1 salto, y la tabla se actualiza si mejora.</div>
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
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="18" y1="30" x2="18" y2="72" class="wire" />
            <line x1="18" y1="72" x2="60" y2="72" class="wire" />
            <line x1="60" y1="72" x2="60" y2="30" class="wire" />
          </svg>
          <div class="rt a" [class.sending]="sending()" style="left:18%; top:30%"><strong>A</strong><small>vecino</small></div>
          <div class="rt b" style="left:60%; top:30%"><strong>B</strong><small>vecino</small></div>
          <div class="rt d" style="left:18%; top:72%"><strong>D</strong><small>nuestro router</small></div>
          <div class="net" style="left:60%; top:72%">subredes<br>w · x · y · z</div>

          @if (adv(); as a) {
            <div class="advcard" [style.left.%]="a.x" [style.top.%]="a.y">
              <div class="ah">advertisement de A</div>
              @for (r of a.rows; track r.dst) {
                <div class="ar"><span>{{ r.dst }}</span><span class="ah2">{{ r.hops }} saltos</span></div>
              }
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">📋 Tabla de ruteo de D</div>
            <div class="trow th"><span>subred destino</span><span>próximo router</span><span>saltos</span></div>
            @for (r of tableRows(); track r.dst) {
              <div class="trow" [class.chg]="r.changed">
                <span class="dst">{{ r.dst }}</span>
                <span class="next">{{ r.next }}</span>
                <span class="hops">{{ r.hops }}</span>
              </div>
            }
            <div class="tfoot">
              métrica = <b>saltos</b> · máx <b>15</b> (<b>16 = ∞</b>) · vectores cada <b>~30 s</b> · Bellman-Ford: nueva dist = min(actual, salto+anunciada)
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
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 230px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
    .rt { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; background: #37455f; border: 2px solid #4a5878; border-radius: 10px; padding: 7px 12px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: box-shadow 0.3s, border-color 0.3s; }
    .rt strong { font-size: 0.9rem; color: #fff; } .rt small { font-size: 0.58rem; color: #cfe3ff; }
    .rt.a { background: #2e7d32; } .rt.d { background: #1565c0; }
    .rt.sending { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); }
    .net { position: absolute; transform: translate(-50%,-50%); z-index: 3; text-align: center; font-size: 0.66rem; color: #8b95b5; background: #10151f; border: 1px dashed #3a4560; border-radius: 10px; padding: 8px 12px; }

    .advcard { position: absolute; transform: translate(-50%,-50%); z-index: 4; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 5px 8px; box-shadow: 0 0 14px rgba(255,213,79,0.35); min-width: 96px; }
    .ah { font-size: 0.58rem; color: #8b95b5; font-weight: 700; margin-bottom: 3px; text-align: center; }
    .ar { display: flex; justify-content: space-between; gap: 10px; font-family: Consolas, monospace; font-size: 0.66rem; color: #ffe082; }
    .ah2 { color: #cfe3ff; }

    .side { width: 320px; flex-shrink: 0; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; height: 100%; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.82rem; color: #ffd54f; margin-bottom: 8px; }
    .trow { display: grid; grid-template-columns: 1.2fr 1.3fr 0.6fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.74rem; padding: 7px 8px; border-radius: 6px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 4px; }
    .trow.chg { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.35); background: #2b2a1a; }
    .dst { color: #80d8ff; font-weight: 700; } .next { color: #cfe3ff; } .hops { color: #7ee787; text-align: center; font-weight: 800; }
    .tfoot { margin-top: auto; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.62rem; color: #8b95b5; line-height: 1.55; }
    .tfoot b { color: #cfe3ff; }

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
export class RipDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(): number {
    return 4000;
  }

  sending(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].advFrom;
  }

  readonly adv = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = STEPS[i];
    if (!s.advFrom || !s.advRows) return null;
    const p = this.ease(this.progress());
    // viaja de A (18,30) hacia D (18,72)
    return { rows: s.advRows, x: 18, y: 30 + (72 - 30) * p };
  });

  readonly tableRows = computed(() => {
    const i = this.index();
    if (i < 0) return STEPS[0].table.map((r) => ({ ...r, changed: false }));
    const src = this.finished() ? STEPS[STEPS.length - 1] : STEPS[i];
    // mientras el paso no completa, mostrar la tabla del paso previo (para que el cambio aparezca al final)
    const useCur = this.finished() || this.progress() >= 0.9 || STEPS[i].static;
    const tbl = useCur ? src.table : (i > 0 ? STEPS[i - 1].table : STEPS[0].table);
    const changed = new Set(useCur && !this.finished() ? (STEPS[i].changed ?? []) : []);
    return tbl.map((r) => ({ ...r, changed: changed.has(r.dst) }));
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Así trabaja RIP</strong>: tabla (subred / próximo router / saltos), vectores cada 30 s, Bellman-Ford con +1 por salto. Simple pero converge lento y con tope de 15 → cosa de redes chicas. Su primo link-state, <strong>OSPF</strong>, escala mucho más (está en los otros diagramas).';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: mirá la tabla de ruteo de D y cómo cambia cuando llega el vector del vecino A.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
