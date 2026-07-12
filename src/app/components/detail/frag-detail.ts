import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface FragStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  frags?: number; // filas de la tabla de fragmentos visibles
  arrived?: number; // fragmentos ya llegados al destino (✔)
  reassembled?: boolean;
}

const SRC: Pos = { x: 11, y: 50 };
const R1: Pos = { x: 42, y: 50 };
const DST: Pos = { x: 86, y: 50 };

const STEPS: FragStep[] = [
  {
    from: SRC, to: SRC, text: '📦 datagrama · 4.000 B · id=777', static: true, frags: 0, arrived: 0,
    msg: 'El origen arma un datagrama de <strong>4.000 bytes</strong> (20 de header + 3.980 de datos), con <strong>identifier = 777</strong>. El primer enlace lo banca (MTU 4.000)…',
  },
  {
    from: SRC, to: R1, text: '📦 4.000 B', frags: 0, arrived: 0,
    msg: 'Viaja entero hasta R1. Pero el <strong>PRÓXIMO enlace es Ethernet: MTU 1.500</strong> — el datagrama no entra.',
  },
  {
    from: R1, to: R1, text: '✂️ fragmentando…', static: true, frags: 3, arrived: 0,
    msg: 'R1 <strong>FRAGMENTA</strong> en 3 datagramas (tabla →): todos con el <strong>mismo identifier 777</strong>, cada uno con su <strong>offset</strong> (posición de sus datos, en unidades de 8 bytes: 1480/8 = 185) y el flag <strong>MF</strong> (more fragments) en 1 — salvo el último.',
  },
  {
    from: R1, to: DST, text: 'frag 1 · offset 0 · MF=1', frags: 3, arrived: 1,
    msg: 'Fragmento 1: bytes 0–1479, offset 0, MF=1 ("viene más"). Cada fragmento es un <strong>datagrama IP completo</strong> con su propio header.',
  },
  {
    from: R1, to: DST, text: 'frag 2 · offset 185 · MF=1', color: '#ce93d8', frags: 3, arrived: 2,
    msg: 'Fragmento 2: bytes 1480–2959, offset 185 (× 8 = byte 1480), MF=1. Los fragmentos pueden viajar por <strong>caminos distintos</strong> y llegar desordenados.',
  },
  {
    from: R1, to: DST, text: 'frag 3 · offset 370 · MF=0', color: '#80d8ff', frags: 3, arrived: 3,
    msg: 'Fragmento 3 (último): offset 370, <strong>MF=0</strong> ("acá termina"). Con offset + MF + longitud, el destino sabe exactamente cómo rearmar.',
  },
  {
    from: DST, to: DST, text: '🧩 reensamblando…', static: true, frags: 3, arrived: 3, reassembled: true,
    msg: 'El <strong>reensamblado se hace ÚNICAMENTE en el host destino</strong> — nunca en routers intermedios (no cargar al núcleo con estado y trabajo: complejidad a los extremos). Junta los 3 por identifier=777, los ordena por offset… ✔',
  },
];

const FRAG_ROWS = [
  { n: 'frag 1', bytes: '1.500 B', id: '777', off: '0', mf: '1' },
  { n: 'frag 2', bytes: '1.500 B', id: '777', off: '185', mf: '1' },
  { n: 'frag 3', bytes: '1.040 B', id: '777', off: '370', mf: '0' },
];

@Component({
  selector: 'app-frag-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">✂️ Fragmentación IP: 4.000 bytes contra un MTU de 1.500</div>
          <div class="caption">Identifier + offset + flag MF — y la regla de oro: reensambla SOLO el destino.</div>
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
            <line [attr.x1]="src.x" [attr.y1]="src.y" [attr.x2]="r1.x" [attr.y2]="r1.y" />
            <line [attr.x1]="r1.x" [attr.y1]="r1.y" [attr.x2]="dst.x" [attr.y2]="dst.y" />
          </svg>

          <div class="linklabel" style="left: 26%; top: 34%">MTU 4.000 ✔</div>
          <div class="linklabel warn" style="left: 64%; top: 34%">MTU 1.500 ⚠</div>

          <div class="node srcn" [class.active]="activeN(src)" [style.left.%]="src.x" [style.top.%]="src.y">
            <strong>💻 Origen</strong><small>datagrama 4.000 B</small>
          </div>
          <div class="node rn" [class.active]="activeN(r1)" [style.left.%]="r1.x" [style.top.%]="r1.y">
            <strong>🧭 R1</strong><small>acá se fragmenta</small>
          </div>
          <div class="node dstn" [class.reok]="reassembled()" [class.active]="activeN(dst)" [style.left.%]="dst.x" [style.top.%]="dst.y">
            <strong>🖥 Destino</strong><small>único que reensambla</small>
            @if (reassembled()) {
              <span class="okbadge">🧩 reensamblado ✔</span>
            }
          </div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">✂️ Fragmentos (en R1)</div>
          <div class="trow th"><span></span><span>bytes</span><span>id</span><span>offset</span><span>MF</span><span></span></div>
          @for (r of fragRows(); track r.n) {
            <div class="trow" [class.flash]="r.flash">
              <span class="fn">{{ r.n }}</span>
              <span>{{ r.bytes }}</span>
              <span class="id">{{ r.id }}</span>
              <span class="off">{{ r.off }}</span>
              <span class="mf">{{ r.mf }}</span>
              <span class="ok">{{ r.done ? '✔' : '' }}</span>
            </div>
          }
          @if (fragRows().length === 0) {
            <div class="tempty">(todavía viaja entero)</div>
          }
          <div class="tfoot">
            offset en unidades de <strong>8 bytes</strong> (1480 ÷ 8 = 185) · si falta UN fragmento, se descarta TODO (y TCP repone) ·
            <strong>IPv6 no fragmenta en routers</strong>: ICMPv6 "Packet Too Big" → el origen ajusta (Path MTU Discovery)
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
    .canvas {
      position: relative; flex: 1; min-height: 260px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .linklabel { position: absolute; transform: translate(-50%, -50%); font-size: 0.62rem; color: #7ee787; background: #171e2e; padding: 1px 8px; border-radius: 8px; border: 1px solid #2d3750; white-space: nowrap; }
    .linklabel.warn { color: #ffd54f; border-color: #d2992255; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 104px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); }
    .node.srcn { background: #2e7d32; }
    .node.rn { background: #f68c1f; }
    .node.dstn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.reok { border-color: #2ea043; box-shadow: 0 0 16px rgba(46, 160, 67, 0.5); }
    .okbadge { font-size: 0.6rem; font-weight: 800; margin-top: 3px; padding: 1px 8px; border-radius: 8px; background: #16281c; color: #7ee787; border: 1px solid #2ea043; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .table { width: 292px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 0.9fr 0.9fr 0.5fr 0.7fr 0.4fr 0.3fr; gap: 3px; font-family: Consolas, monospace; font-size: 0.64rem; padding: 5px 7px; border-radius: 6px; color: var(--text); align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.56rem; padding-bottom: 2px; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .trow.flash { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255, 213, 79, 0.3); background: #2b2a1a; }
    .fn { color: #ffd54f; font-weight: 700; }
    .id { color: #ce93d8; }
    .off { color: #79c0ff; }
    .mf { color: #ef9a9a; text-align: center; }
    .ok { color: #7ee787; font-weight: 900; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.6rem; padding-top: 8px; line-height: 1.55; }
    .tfoot strong { color: #8b95b5; }

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
      .table { width: 100%; }
    }
  `,
})
export class FragDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly src = SRC;
  readonly r1 = R1;
  readonly dst = DST;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1300;
  }
  protected override stepDwell(i: number): number {
    return 3300;
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = STEPS[i];
    const p = this.ease(this.progress());
    return {
      text: s.text,
      color: s.color ?? '#ffd54f',
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p,
    };
  });

  readonly fragRows = computed(() => {
    const i = this.index();
    if (i < 0) return [];
    const p = this.progress();
    const fin = this.finished();
    const cur = STEPS[i];
    const prev = i > 0 ? STEPS[i - 1] : null;
    const frags = fin ? 3 : p >= 1 ? (cur.frags ?? 0) : (prev?.frags ?? 0);
    const arrived = fin ? 3 : p >= 1 ? (cur.arrived ?? 0) : (prev?.arrived ?? 0);
    const justFragmented = !fin && p >= 1 && (cur.frags ?? 0) > (prev?.frags ?? 0);
    return FRAG_ROWS.slice(0, frags).map((r, idx) => ({
      ...r,
      done: idx < arrived,
      flash: justFragmented,
    }));
  });

  readonly reassembled = computed(() => {
    if (this.finished()) return true;
    const i = this.index();
    if (i < 0) return false;
    return !!STEPS[i].reassembled && this.progress() >= 1;
  });

  activeN(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Reensamblado completo en el destino.</strong> Los 3 campos que lo hacen posible: <strong>identifier</strong> (mismo datagrama), <strong>offset</strong> (posición, en unidades de 8 bytes) y <strong>MF</strong> (¿viene más?). Si un fragmento se pierde, se descarta el datagrama ENTERO — y TCP lo repone completo. <strong>IPv6 eliminó la fragmentación en routers</strong>: el origen ajusta con Path MTU Discovery.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: un datagrama de 4.000 bytes se topa con un enlace de MTU 1.500 — mirá la tabla de fragmentos que arma R1.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
