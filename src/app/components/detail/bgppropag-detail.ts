import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

type As = 'AS1' | 'AS2' | 'AS3' | 'AS4';

interface Card {
  from: As;
  to: As;
  path: As[]; // AS-PATH que viaja
  reject?: boolean;
}
interface Learn {
  as: As;
  path: As[];
  via: As;
}
interface PStep {
  cards: Card[];
  learn?: Learn[];
  msg: string;
  static?: boolean;
  decideAt?: As; // marca la decisión de ruta
  rejectAt?: As;
}

const POS: Record<As, { x: number; y: number }> = {
  AS1: { x: 12, y: 62 },
  AS2: { x: 34, y: 22 },
  AS3: { x: 56, y: 52 },
  AS4: { x: 86, y: 52 },
};
const LINKS: [As, As][] = [
  ['AS4', 'AS3'],
  ['AS3', 'AS2'],
  ['AS3', 'AS1'],
  ['AS2', 'AS1'],
];

const STEPS: PStep[] = [
  {
    cards: [], static: true,
    msg: '<strong>AS4</strong> es dueño del prefijo <strong>138.16.0.0/16</strong>. BGP corre sobre <strong>TCP puerto 179</strong>: cada AS le anuncia a sus vecinos qué prefijos sabe alcanzar, y en cada salto se le agrega su ASN al <strong>AS-PATH</strong>.',
  },
  {
    cards: [{ from: 'AS4', to: 'AS3', path: ['AS4'] }],
    learn: [{ as: 'AS3', path: ['AS4'], via: 'AS4' }],
    msg: '1. <strong>AS4 → AS3</strong> (eBGP): anuncia 138.16/16 con <strong>AS-PATH = [AS4]</strong>. AS3 lo aprende y lo guarda: para llegar a 138.16/16, sale hacia AS4.',
  },
  {
    cards: [{ from: 'AS3', to: 'AS2', path: ['AS3', 'AS4'] }, { from: 'AS3', to: 'AS1', path: ['AS3', 'AS4'] }],
    learn: [{ as: 'AS2', path: ['AS3', 'AS4'], via: 'AS3' }, { as: 'AS1', path: ['AS3', 'AS4'], via: 'AS3' }],
    msg: '2. AS3 <strong>PREPENDE su ASN</strong> → AS-PATH = <strong>[AS3, AS4]</strong> y lo reanuncia a AS2 y a AS1. El AS-PATH crece un ASN por cada frontera que cruza.',
  },
  {
    cards: [{ from: 'AS2', to: 'AS1', path: ['AS2', 'AS3', 'AS4'] }],
    learn: [{ as: 'AS1', path: ['AS2', 'AS3', 'AS4'], via: 'AS2' }],
    msg: '3. AS2 también reanuncia lo suyo a AS1, ahora con AS-PATH = <strong>[AS2, AS3, AS4]</strong> (más largo). <strong>AS1 tiene ahora DOS rutas</strong> al mismo prefijo.',
  },
  {
    cards: [], static: true, decideAt: 'AS1',
    msg: '4. <strong>AS1 elige</strong>. Con igual local-preference, gana el <strong>AS-PATH más corto</strong>: <strong>[AS3, AS4]</strong> (2 saltos) le gana a [AS2, AS3, AS4] (3 saltos). Instala la ruta vía AS3.',
  },
  {
    cards: [{ from: 'AS1', to: 'AS2', path: ['AS1', 'AS3', 'AS4'] }], static: false, rejectAt: 'AS2',
    msg: '5. <strong>Detección de loops</strong>: si AS1 reanunciara [AS1, AS3, AS4] y esa ruta volviera hacia AS3, AS3 <strong>vería su propio ASN en el AS-PATH → la DESCARTA</strong>. Así el AS-PATH evita bucles de ruteo sin necesidad de TTL.',
  },
];

@Component({
  selector: 'app-bgppropag-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🌐 BGP: propagación del anuncio y el AS-PATH creciendo</div>
          <div class="caption">Un prefijo viajando entre ASes — cada frontera prepende un ASN, y el AS-PATH corto gana.</div>
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
            @for (l of links; track l[0] + l[1]) {
              <line [attr.x1]="pos[l[0]].x" [attr.y1]="pos[l[0]].y" [attr.x2]="pos[l[1]].x" [attr.y2]="pos[l[1]].y" class="wire" />
            }
          </svg>

          @for (asId of ases; track asId) {
            <div class="asn" [class]="'a-' + asId"
                 [class.origin]="asId === 'AS4'"
                 [class.decide]="decideAt() === asId"
                 [class.reject]="rejectAt() === asId"
                 [style.left.%]="pos[asId].x" [style.top.%]="pos[asId].y">
              <strong>☁ {{ asId }}</strong>
              @if (asId === 'AS4') { <small>138.16.0.0/16</small> }
            </div>
          }

          @for (c of cards(); track $index) {
            <div class="card" [class.reject]="c.reject" [style.left.%]="c.x" [style.top.%]="c.y">
              <span class="cpfx">138.16/16</span>
              <span class="cpath">[{{ c.path.join(' ') }}]</span>
              @if (c.reject) { <span class="cx">✖ loop</span> }
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">📋 Mejor ruta a 138.16/16 por AS</div>
            <div class="trow th"><span>AS</span><span>AS-PATH</span><span>vía</span></div>
            @for (r of routeRows(); track r.as) {
              <div class="trow" [class.win]="r.win">
                <span class="ra">{{ r.as }}</span>
                <span class="rp">[{{ r.path.join(' ') }}]</span>
                <span class="rv">{{ r.via }}</span>
              </div>
            }
            @if (routeRows().length === 0) {
              <div class="empty">(nadie aprendió el prefijo todavía)</div>
            }
          </div>
          <div class="dec" [class.on]="decideAt()">
            <div class="dhead">🧭 Selección de ruta (orden)</div>
            <div class="dline"><b>1.</b> local-preference (política) más alta</div>
            <div class="dline hot"><b>2.</b> AS-PATH más CORTO ← desempata acá</div>
            <div class="dline"><b>3.</b> hot-potato (NEXT-HOP más cercano por IGP)</div>
            <div class="dline"><b>4.</b> menor router-id</div>
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
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 300px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; }

    .asn { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; text-align: center; background: #3949ab; border: 1.5px solid rgba(0,0,0,0.25); border-radius: 10px; padding: 7px 12px; min-width: 74px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); transition: border-color 0.3s, box-shadow 0.3s; }
    .asn strong { font-size: 0.82rem; color: #fff; } .asn small { font-size: 0.6rem; color: #cfe3ff; font-family: Consolas, monospace; }
    .asn.origin { background: #1565c0; }
    .asn.decide { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); }
    .asn.reject { border-color: #ef5350; box-shadow: 0 0 16px rgba(239,83,80,0.6); }

    .card { position: absolute; transform: translate(-50%,-50%); z-index: 4; display: flex; flex-direction: column; align-items: center; gap: 1px; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 4px 9px; box-shadow: 0 0 12px rgba(255,213,79,0.35); }
    .card.reject { border-color: #ef5350; }
    .cpfx { font-family: Consolas, monospace; font-size: 0.6rem; color: #8b95b5; }
    .cpath { font-family: Consolas, monospace; font-size: 0.72rem; font-weight: 800; color: #ffe082; white-space: nowrap; }
    .cx { font-size: 0.6rem; font-weight: 800; color: #ef9a9a; }

    .side { width: 288px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.8rem; color: #ffd54f; margin-bottom: 8px; }
    .trow { display: grid; grid-template-columns: 0.6fr 1.4fr 0.5fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.68rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.54rem; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .trow.win { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.3); background: #2b2a1a; }
    .ra { color: #cfe3ff; font-weight: 700; } .rp { color: #80d8ff; } .rv { color: #7ee787; text-align: center; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.72rem; padding: 6px; }

    .dec { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; transition: border-color 0.3s; }
    .dec.on { border-color: #ffd54f88; }
    .dhead { font-weight: 700; font-size: 0.78rem; color: #79c0ff; margin-bottom: 6px; }
    .dline { font-size: 0.68rem; color: var(--text); line-height: 1.6; } .dline b { color: #8b95b5; }
    .dline.hot { color: #ffd54f; } .dline.hot b { color: #ffd54f; }

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
export class BgppropagDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly ases: As[] = ['AS1', 'AS2', 'AS3', 'AS4'];
  readonly pos = POS;
  readonly links = LINKS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(): number {
    return 3600;
  }

  readonly cards = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [];
    const p = this.ease(this.progress());
    return STEPS[i].cards.map((c) => ({
      path: c.path,
      reject: c.reject,
      x: POS[c.from].x + (POS[c.to].x - POS[c.from].x) * p,
      y: POS[c.from].y + (POS[c.to].y - POS[c.from].y) * p,
    }));
  });

  decideAt(): As | null {
    const i = this.index();
    if (i < 0 || this.finished()) return this.finished() ? 'AS1' : null;
    return STEPS[i].decideAt ?? null;
  }
  rejectAt(): As | null {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    return STEPS[i].rejectAt && this.progress() >= 0.9 ? STEPS[i].rejectAt! : null;
  }

  /** ruta elegida por cada AS, según lo aprendido hasta el paso actual */
  readonly routeRows = computed(() => {
    const i = this.index();
    if (i < 0) return [] as { as: As; path: As[]; via: As; win: boolean }[];
    const upto = this.finished() ? STEPS.length - 1 : i;
    const best: Partial<Record<As, { path: As[]; via: As }>> = {};
    for (let s = 0; s <= upto; s++) {
      const reached = this.finished() || s < i || (s === i && this.progress() >= 0.9);
      if (!reached) continue;
      for (const l of STEPS[s].learn ?? []) {
        const prev = best[l.as];
        // elige el AS-PATH más corto (desempate: el que llega primero)
        if (!prev || l.path.length < prev.path.length) best[l.as] = { path: l.path, via: l.via };
      }
    }
    const decided = this.decideAt() === 'AS1' || this.finished();
    return (['AS3', 'AS2', 'AS1'] as As[])
      .filter((as) => best[as])
      .map((as) => ({ as, path: best[as]!.path, via: best[as]!.via, win: as === 'AS1' && decided }));
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Así se propaga un prefijo por BGP</strong>: el AS-PATH crece un ASN por frontera, sirve para <strong>detectar loops</strong> (¿mi ASN ya está? descarto) y como métrica de desempate (menos ASes ≈ mejor). Recordá: BGP elige por <strong>políticas comerciales</strong>, no por camino físico corto.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: seguí el AS-PATH creciendo salto a salto y mirá la tabla de rutas de cada AS llenarse.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
