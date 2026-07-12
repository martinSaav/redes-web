import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface DnsStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string; // query amarillo · referencia roja/violeta · respuesta celeste
  msg: string;
  cache?: 'insert' | 'hit'; // efecto sobre la caché del Local
  static?: boolean;
  round2?: boolean; // pertenece a la segunda consulta (visual)
}

const PC: Pos = { x: 11, y: 50 };
const LOCAL: Pos = { x: 40, y: 50 };
const ROOT: Pos = { x: 78, y: 14 };
const TLD: Pos = { x: 78, y: 50 };
const AUTH: Pos = { x: 78, y: 86 };

const Q = '¿A de www.ejemplo.com?';
const ANS = 'A: 198.51.100.10';

const ITER_STEPS: DnsStep[] = [
  {
    from: PC, to: PC, text: Q, static: true,
    msg: 'El navegador necesita la IP de <strong>www.ejemplo.com</strong>. Se la pide a su resolver con una consulta <strong>RECURSIVA</strong>: "resolvémelo TODO y traeme la respuesta final". (UDP, puerto 53.)',
  },
  {
    from: PC, to: LOCAL, text: Q + ' (recursiva)',
    msg: 'Del host al <strong>Local DNS</strong> (el resolver del ISP, que DHCP le configuró). El host no sabe nada de la jerarquía: delega.',
  },
  {
    from: LOCAL, to: LOCAL, text: 'cache lookup…', static: true, color: '#ce93d8',
    msg: '<strong>Cache MISS</strong>: la tabla está vacía (mirala a la derecha). El Local va a tener que resolver contra la jerarquía — y con sus pares usa consultas <strong>ITERATIVAS</strong>.',
  },
  {
    from: LOCAL, to: ROOT, text: Q + ' (iterativa)',
    msg: 'Local → <strong>Root</strong> (13 identidades lógicas, cientos de réplicas por IP anycast).',
  },
  {
    from: ROOT, to: LOCAL, text: 'NS: TLD .com →', color: '#ff8a80',
    msg: 'El root <strong>NO resuelve</strong>: devuelve una <strong>REFERENCIA</strong> — "no sé, pero preguntale al TLD de .com" (registros NS + A). <strong>Eso es lo iterativo</strong>: te dan una pista, no la respuesta.',
  },
  {
    from: LOCAL, to: TLD, text: Q + ' (iterativa)',
    msg: 'El Local insiste, ahora contra el <strong>TLD .com</strong>.',
  },
  {
    from: TLD, to: LOCAL, text: 'NS: ns1.ejemplo.com →', color: '#ce93d8',
    msg: 'Otra referencia: "preguntale al <strong>authoritative</strong> ns1.ejemplo.com" — el servidor con los registros DEFINITIVOS del dominio.',
  },
  {
    from: LOCAL, to: AUTH, text: Q + ' (iterativa)',
    msg: 'Tercera y última consulta iterativa, al authoritative.',
  },
  {
    from: AUTH, to: LOCAL, text: ANS + ' · TTL 3600', color: '#80d8ff',
    msg: '¡Respuesta! El registro <strong>A</strong> con la IP… y su <strong>TTL</strong>: cuántos segundos se puede cachear.',
  },
  {
    from: LOCAL, to: LOCAL, text: 'guardando en caché…', static: true, color: '#7ee787', cache: 'insert',
    msg: 'El Local <strong>CACHEA</strong> el registro (fila nueva en la tabla). Mientras el TTL no venza, no vuelve a molestar a nadie. Por esto los cambios de DNS "tardan en propagarse".',
  },
  {
    from: LOCAL, to: PC, text: ANS + ' ✔', color: '#80d8ff',
    msg: 'Y le devuelve la <strong>respuesta final</strong> al host. Para el host fue recursiva: UNA pregunta, UNA respuesta — todo el trabajo lo hizo el Local.',
  },
  {
    from: PC, to: PC, text: 'segunda consulta…', static: true, round2: true,
    msg: '<strong>Minutos después</strong>: otra app (u otro host del mismo ISP) pide el MISMO nombre…',
  },
  {
    from: PC, to: LOCAL, text: Q + ' (recursiva)', round2: true,
    msg: 'La consulta llega de nuevo al Local DNS…',
  },
  {
    from: LOCAL, to: LOCAL, text: 'cache lookup…', static: true, color: '#7ee787', cache: 'hit', round2: true,
    msg: '<strong>¡CACHE HIT!</strong> El registro está y el TTL sigue vigente (fila resaltada) → responde <strong>YA</strong>, sin tocar root, TLD ni authoritative.',
  },
  {
    from: LOCAL, to: PC, text: ANS + ' (de caché) ⚡', color: '#7ee787', round2: true,
    msg: 'Respuesta instantánea. <strong>Por esto la mayoría de las consultas del mundo jamás llega al root</strong> — el caching sostiene a todo el sistema.',
  },
];

const REC_STEPS: DnsStep[] = [
  {
    from: PC, to: PC, text: Q, static: true,
    msg: 'Mismo objetivo, pero ahora imaginá que <strong>TODA la cadena fuera recursiva</strong>: cada servidor le delega el trabajo COMPLETO al siguiente.',
  },
  {
    from: PC, to: LOCAL, text: Q + ' (recursiva)',
    msg: 'Host → Local: igual que antes, recursiva.',
  },
  {
    from: LOCAL, to: ROOT, text: Q + ' (recursiva)',
    msg: 'Local → Root, pero <strong>recursiva</strong>: "resolvémelo vos". El root acepta el trabajo… y ahora ÉL tiene que perseguir la respuesta.',
  },
  {
    from: ROOT, to: TLD, text: Q + ' (recursiva)',
    msg: 'Root → TLD: la papa caliente sigue bajando. Cada servidor de la cadena queda <strong>esperando y manteniendo estado</strong>.',
  },
  {
    from: TLD, to: AUTH, text: Q + ' (recursiva)',
    msg: 'TLD → Authoritative: por fin alguien que SÍ sabe la respuesta.',
  },
  {
    from: AUTH, to: TLD, text: ANS, color: '#80d8ff',
    msg: 'La respuesta arranca el camino de vuelta… <strong>por toda la cadena</strong>.',
  },
  {
    from: TLD, to: ROOT, text: ANS, color: '#80d8ff',
    msg: 'TLD → Root…',
  },
  {
    from: ROOT, to: LOCAL, text: ANS, color: '#80d8ff',
    msg: 'Root → Local. Recién ahora el root se libera de esta consulta.',
  },
  {
    from: LOCAL, to: LOCAL, text: 'guardando en caché…', static: true, color: '#7ee787', cache: 'insert',
    msg: 'El Local cachea igual que antes…',
  },
  {
    from: LOCAL, to: PC, text: ANS + ' ✔', color: '#80d8ff',
    msg: '…y responde al host. Funciona, pero mirá el costo: <strong>el root cargó con el trabajo</strong> y mantuvo estado por UNA consulta de UN usuario. Multiplicalo por toda Internet: no escala.',
  },
];

const CACHE_ROW = { name: 'www.ejemplo.com', type: 'A', value: '198.51.100.10', ttl: '3600 s' };

interface HierRow {
  n: string;
  t: string;
  v: string;
}
interface HierGroup {
  owner: string;
  rows: HierRow[];
}

const HIER: HierGroup[] = [
  {
    owner: '🏛 El Root sabe:',
    rows: [
      { n: '.com', t: 'NS', v: 'dns.tld-com.net' },
      { n: 'dns.tld-com.net', t: 'A', v: '192.5.6.30' },
    ],
  },
  {
    owner: '🗂 El TLD .com sabe:',
    rows: [
      { n: 'ejemplo.com', t: 'NS', v: 'ns1.ejemplo.com' },
      { n: 'ns1.ejemplo.com', t: 'A', v: '198.51.100.2' },
    ],
  },
  {
    owner: '🎯 El Authoritative sabe:',
    rows: [{ n: 'www.ejemplo.com', t: 'A', v: '198.51.100.10' }],
  },
];

/** paso en el que cada nivel de la jerarquía "muestra" sus registros, por modo */
const HIER_AT: Record<'iter' | 'rec', number[]> = {
  iter: [4, 6, 8],
  rec: [3, 4, 5],
};

@Component({
  selector: 'app-dns-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🌐 DNS en detalle: jerarquía, caché y recursiva vs iterativa</div>
          <div class="caption">
            Modo <strong>Iterativa</strong> = lo que pasa de verdad (con caché y segunda consulta). Modo <strong>Recursiva</strong> = el contraejemplo: por qué NO se hace así.
          </div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'iter'" (click)="setMode('iter')">Iterativa (real)</button>
            <button [class.on]="mode() === 'rec'" (click)="setMode('rec')">Recursiva</button>
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

      <div class="board">
        <div class="canvas">
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="pc.x" [attr.y1]="pc.y" [attr.x2]="local.x" [attr.y2]="local.y" />
            <line [attr.x1]="local.x" [attr.y1]="local.y" [attr.x2]="root.x" [attr.y2]="root.y" />
            <line [attr.x1]="local.x" [attr.y1]="local.y" [attr.x2]="tld.x" [attr.y2]="tld.y" />
            <line [attr.x1]="local.x" [attr.y1]="local.y" [attr.x2]="auth.x" [attr.y2]="auth.y" />
            @if (mode() === 'rec') {
              <line class="chain" [attr.x1]="root.x" [attr.y1]="root.y" [attr.x2]="tld.x" [attr.y2]="tld.y" />
              <line class="chain" [attr.x1]="tld.x" [attr.y1]="tld.y" [attr.x2]="auth.x" [attr.y2]="auth.y" />
            }
          </svg>

          <div class="zone">jerarquía DNS</div>

          <div class="node pcn" [class.active]="active(pc)" [style.left.%]="pc.x" [style.top.%]="pc.y">
            <strong>💻 Tu PC</strong><small>stub resolver</small>
          </div>
          <div class="node localn" [class.active]="active(local)" [style.left.%]="local.x" [style.top.%]="local.y">
            <strong>📡 Local DNS</strong><small>resolver del ISP</small>
          </div>
          <div class="node rootn" [class.active]="active(root)" [style.left.%]="root.x" [style.top.%]="root.y">
            <strong>🏛 Root (.)</strong><small>13 lógicos · anycast</small>
          </div>
          <div class="node tldn" [class.active]="active(tld)" [style.left.%]="tld.x" [style.top.%]="tld.y">
            <strong>🗂 TLD (.com)</strong><small>conoce los authoritative</small>
          </div>
          <div class="node authn" [class.active]="active(auth)" [style.left.%]="auth.x" [style.top.%]="auth.y">
            <strong>🎯 Authoritative</strong><small>ns1.ejemplo.com</small>
          </div>

          @if (card(); as c) {
            <div class="qcard" [class.round2]="c.round2" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="side">
          <div class="table">
            <div class="thead">🗃 Caché del Local DNS</div>
            <div class="trow th"><span>nombre</span><span>tipo</span><span>valor</span></div>
            @if (cacheVisible()) {
              <div class="trow" [class.flash]="cacheFlash()">
                <span>{{ cacheRow.name }}</span>
                <span class="tp">{{ cacheRow.type }}</span>
                <span>{{ cacheRow.value }}</span>
              </div>
              <div class="ttl" [class.flash]="cacheFlash()">⏳ TTL: {{ cacheRow.ttl }} — al vencer, se borra</div>
            } @else {
              <div class="tempty">(vacía — primera consulta del día)</div>
            }
          </div>

          <div class="table htable">
            <div class="thead h2">📚 Quién sabe qué (registros NS + A)</div>
            @for (g of hierGroups(); track g.owner) {
              <div class="hgroup" [class.lit]="g.lit" [class.flash]="g.flash">
                <div class="howner">{{ g.owner }}</div>
                @for (r of g.rows; track r.n) {
                  <div class="trow hrow">
                    <span>{{ r.n }}</span>
                    <span class="tp">{{ r.t }}</span>
                    <span>{{ r.v }}</span>
                  </div>
                }
              </div>
            }
            <div class="hnote">el NS delega el dominio; el A "glue" te da la IP de ese servidor para poder preguntarle</div>
          </div>

          <div class="tfoot">
            <div class="leg"><i style="background:#ffd54f"></i> consulta</div>
            <div class="leg"><i style="background:#ff8a80"></i> referencia ("preguntale a…")</div>
            <div class="leg"><i style="background:#80d8ff"></i> respuesta</div>
            <div class="leg"><i style="background:#7ee787"></i> caché</div>
          </div>
        </div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 480px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 0.84rem; }
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas {
      position: relative; flex: 1; min-height: 330px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .wires line.chain { stroke: #7c3aed; }
    .zone { position: absolute; right: 10px; top: 8px; font-size: 0.66rem; font-weight: 700; color: #ce93d8; background: rgba(124, 58, 237, 0.12); border: 1px solid #7c3aed55; padding: 2px 10px; border-radius: 10px; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 104px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); }
    .node.pcn { background: #2e7d32; }
    .node.localn { background: #f68c1f; }
    .node.rootn { background: #c62828; }
    .node.tldn { background: #7b1fa2; }
    .node.authn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap;
    }
    .qcard.round2::after { content: '2ª'; position: absolute; top: -9px; right: -9px; background: #7ee787; color: #0d1117; font-size: 0.58rem; font-weight: 900; border-radius: 50%; width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; }

    .side { width: 272px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .table { width: 100%; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #7ee787; }
    .trow { display: grid; grid-template-columns: 1.4fr 0.4fr 1.1fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.64rem; padding: 6px 8px; border-radius: 6px; color: var(--text); align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.58rem; padding-bottom: 2px; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; }
    .trow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126, 231, 135, 0.3); background: #16281c; }
    .tp { text-align: center; font-weight: 800; color: #79c0ff; }
    .ttl { font-size: 0.64rem; color: #8b95b5; padding: 6px 8px 0; }
    .ttl.flash { color: #7ee787; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .thead.h2 { color: #ce93d8; }
    .hgroup { opacity: 0.35; border: 1px solid #2d3750; border-radius: 7px; padding: 5px 6px; margin-bottom: 5px; transition: opacity 0.35s, border-color 0.35s, box-shadow 0.35s; }
    .hgroup.lit { opacity: 1; }
    .hgroup.flash { border-color: #ce93d8; box-shadow: 0 0 10px rgba(206, 147, 216, 0.3); }
    .howner { font-size: 0.64rem; font-weight: 800; color: #ce93d8; margin-bottom: 3px; letter-spacing: 0.3px; }
    .trow.hrow { grid-template-columns: 1.3fr 0.35fr 1.2fr; font-size: 0.6rem; padding: 3px 6px; margin-bottom: 2px; }
    .hnote { font-size: 0.6rem; color: #5c6a8e; font-style: italic; padding-top: 4px; }
    .tfoot { padding-top: 2px; display: flex; flex-direction: column; gap: 3px; }
    .leg { font-size: 0.64rem; color: #8b95b5; }
    .leg i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }

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

    @media (max-width: 720px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class DnsDetail extends SteppedAnim implements OnDestroy {
  readonly pc = PC;
  readonly local = LOCAL;
  readonly root = ROOT;
  readonly tld = TLD;
  readonly auth = AUTH;
  readonly cacheRow = CACHE_ROW;

  readonly mode = signal<'iter' | 'rec'>('iter');
  readonly steps = computed(() => (this.mode() === 'iter' ? ITER_STEPS : REC_STEPS));

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1300;
  }
  protected override stepDwell(i: number): number {
    return this.steps()[i].static ? 3000 : 2300;
  }

  setMode(m: 'iter' | 'rec'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = this.steps()[i];
    const p = this.ease(this.progress());
    return {
      text: s.text,
      color: s.color ?? '#ffd54f',
      round2: !!s.round2,
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p,
    };
  });

  /** índice del paso donde la caché se llena, según el modo */
  private cacheInsertIdx = computed(() => this.steps().findIndex((s) => s.cache === 'insert'));

  readonly cacheVisible = computed(() => {
    if (this.finished()) return true;
    const i = this.index();
    if (i < 0) return false;
    const ins = this.cacheInsertIdx();
    return i > ins || (i === ins && this.progress() >= 1);
  });

  readonly hierGroups = computed(() => {
    const i = this.index();
    const p = this.progress();
    const fin = this.finished();
    const ats = HIER_AT[this.mode()];
    return HIER.map((g, gi) => {
      const at = ats[gi];
      const lit = fin || i > at || (i === at && p >= 1);
      return { ...g, lit, flash: !fin && i === at && p >= 1 };
    });
  });

  readonly cacheFlash = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = this.steps()[i];
    return !!s.cache && this.progress() >= 1;
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = this.steps()[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'iter'
        ? '<strong>El patrón real de Internet</strong>: recursiva del host al Local (delega todo) + iterativas del Local a la jerarquía (referencias) + <strong>caché con TTL</strong> que absorbe casi todo el tráfico. Probá el modo "Recursiva" para ver el contraejemplo.'
        : '<strong>Por eso NO se usa recursión completa</strong>: los servidores de arriba (root, TLD) cargarían con el trabajo y el estado de TODA Internet. La respuesta real: recursiva solo host→Local, iterativa hacia arriba. Volvé al modo "Iterativa (real)".';
    }
    const i = this.index();
    if (i < 0) {
      return 'Presioná ▶ Play. Fijate el TIPO de cada mensaje (colores) y la caché de la derecha — en el modo real hay una segunda consulta que ni sale del Local.';
    }
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
