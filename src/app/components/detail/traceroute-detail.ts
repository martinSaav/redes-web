import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface TrStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  boom?: boolean; // 💥 TTL agotado en este nodo
  line?: number; // línea de terminal que aparece al completar el paso
}

const PC: Pos = { x: 10, y: 50 };
const R1: Pos = { x: 36, y: 50 };
const R2: Pos = { x: 62, y: 50 };
const DST: Pos = { x: 88, y: 50 };

const STEPS: TrStep[] = [
  {
    from: PC, to: PC, text: '$ traceroute www.ejemplo.com', static: true,
    msg: 'Traceroute quiere descubrir <strong>la ruta salto a salto</strong>. Su truco: mandar datagramas UDP (a un puerto improbable, ej. 33434) con <strong>TTL creciente</strong>, y hacer que "mueran a propósito" en cada router del camino.',
  },
  {
    from: PC, to: R1, text: 'UDP :33434 · TTL=1',
    msg: 'Primer datagrama: <strong>TTL=1</strong>. Cada router decrementa el TTL en 1…',
  },
  {
    from: R1, to: R1, text: 'TTL 1→0 💥', static: true, boom: true,
    msg: 'R1 decrementa: <strong>TTL=0 → DESCARTA el datagrama</strong>. Pero no lo descarta en silencio: le avisa al origen…',
  },
  {
    from: R1, to: PC, text: 'ICMP Time Exceeded (tipo 11)', color: '#ef9a9a', line: 0,
    msg: '<strong>ICMP Time Exceeded</strong> — y ese mensaje viene con la <strong>IP de R1</strong>. Traceroute mide el RTT y escribe la línea 1 en la terminal →',
  },
  {
    from: PC, to: R1, text: 'UDP :33435 · TTL=2',
    msg: 'Segundo datagrama, <strong>TTL=2</strong>: este sobrevive a R1…',
  },
  {
    from: R1, to: R2, text: 'TTL=1',
    msg: '…R1 lo decrementa a 1 y lo reenvía…',
  },
  {
    from: R2, to: R2, text: 'TTL 1→0 💥', static: true, boom: true,
    msg: '…y muere en R2. Mismo mecanismo: descarte + aviso ICMP.',
  },
  {
    from: R2, to: PC, text: 'ICMP Time Exceeded (tipo 11)', color: '#ef9a9a', line: 1,
    msg: 'Salto 2 identificado: la IP de R2 y su RTT quedan en la terminal.',
  },
  {
    from: PC, to: R1, text: 'UDP :33436 · TTL=3',
    msg: 'Tercer datagrama, <strong>TTL=3</strong>…',
  },
  {
    from: R1, to: R2, text: 'TTL=2',
    msg: '…pasa R1 (TTL=2)…',
  },
  {
    from: R2, to: DST, text: 'TTL=1 → ¡llega!',
    msg: '…pasa R2 (TTL=1) y <strong>LLEGA al destino</strong>. Pero el puerto UDP 33436 no tiene ningún proceso escuchando…',
  },
  {
    from: DST, to: PC, text: 'ICMP Port Unreachable (tipo 3)', color: '#ffd54f', line: 2,
    msg: 'El destino responde <strong>ICMP Port Unreachable</strong> (tipo 3, código puerto) — una señal <strong>DISTINTA</strong> a Time Exceeded. Así traceroute sabe que llegó al final y corta.',
  },
];

const TERM_LINES = [
  { n: 1, ip: '10.0.0.1      (R1)', rtt: '2.1 ms' },
  { n: 2, ip: '200.51.3.9    (R2)', rtt: '11.4 ms' },
  { n: 3, ip: '198.51.100.10 ✔', rtt: '23.8 ms' },
];

@Component({
  selector: 'app-traceroute-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🗺 Traceroute en detalle: TTL + ICMP, con la terminal en vivo</div>
          <div class="caption">Datagramas que mueren a propósito en cada salto — y la salida real que se va imprimiendo.</div>
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
            <line [attr.x1]="pc.x" [attr.y1]="pc.y" [attr.x2]="r1.x" [attr.y2]="r1.y" />
            <line [attr.x1]="r1.x" [attr.y1]="r1.y" [attr.x2]="r2.x" [attr.y2]="r2.y" />
            <line [attr.x1]="r2.x" [attr.y1]="r2.y" [attr.x2]="dst.x" [attr.y2]="dst.y" />
          </svg>

          <div class="node pcn" [class.active]="active(pc)" [style.left.%]="pc.x" [style.top.%]="pc.y">
            <strong>💻 Tu PC</strong><small>traceroute</small>
          </div>
          <div class="node rn" [class.boom]="boomAt(r1)" [class.active]="active(r1)" [style.left.%]="r1.x" [style.top.%]="r1.y">
            <strong>🧭 R1</strong><small>10.0.0.1</small>
          </div>
          <div class="node rn" [class.boom]="boomAt(r2)" [class.active]="active(r2)" [style.left.%]="r2.x" [style.top.%]="r2.y">
            <strong>🧭 R2</strong><small>200.51.3.9</small>
          </div>
          <div class="node dstn" [class.active]="active(dst)" [style.left.%]="dst.x" [style.top.%]="dst.y">
            <strong>🖥 Destino</strong><small>puerto UDP cerrado</small>
          </div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="term">
          <div class="tbar"><span class="dot1"></span><span class="dot2"></span><span class="dot3"></span> terminal</div>
          <div class="tbody">
            <div class="tline cmd">$ traceroute www.ejemplo.com</div>
            <div class="tline dim">traceroute to 198.51.100.10, 30 hops max</div>
            @for (l of termLines(); track l.n) {
              <div class="tline" [class.flash]="l.flash">
                <span class="hop">{{ l.n }}</span> {{ l.ip }} <span class="rtt">{{ l.rtt }}</span>
              </div>
            }
            @if (finished()) {
              <div class="tline done">— traza completa: 3 saltos —</div>
            }
            <div class="cursor">█</div>
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
      position: relative; flex: 1; min-height: 270px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 92px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); font-family: Consolas, monospace; }
    .node.pcn { background: #2e7d32; }
    .node.rn { background: #546e7a; }
    .node.dstn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.boom { border-color: #ef5350; box-shadow: 0 0 20px rgba(239, 83, 80, 0.7); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .term { width: 300px; flex-shrink: 0; background: #0a0e16; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
    .tbar { background: #1a2132; padding: 6px 10px; font-size: 0.7rem; color: #8b95b5; display: flex; align-items: center; gap: 5px; }
    .tbar span { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .dot1 { background: #ef5350; } .dot2 { background: #ffd54f; } .dot3 { background: #2ea043; }
    .tbody { padding: 10px 12px; font-family: Consolas, monospace; font-size: 0.7rem; line-height: 1.7; }
    .tline { color: #c9d1e9; white-space: pre; }
    .tline.cmd { color: #7ee787; }
    .tline.dim { color: #5c6a8e; }
    .tline.done { color: #7ee787; font-style: italic; }
    .tline.flash { background: rgba(126, 231, 135, 0.12); border-radius: 4px; }
    .hop { color: #ffd54f; font-weight: 700; }
    .rtt { color: #79c0ff; }
    .cursor { color: #7ee787; animation: blink 1s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 46px; font-size: 0.95rem; line-height: 1.45; }
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
      .term { width: 100%; }
    }
  `,
})
export class TracerouteDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly pc = PC;
  readonly r1 = R1;
  readonly r2 = R2;
  readonly dst = DST;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1200;
  }
  protected override stepDwell(i: number): number {
    return 2600;
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

  readonly termLines = computed(() => {
    const i = this.index();
    const p = this.progress();
    const fin = this.finished();
    const out: { n: number; ip: string; rtt: string; flash: boolean }[] = [];
    for (let si = 0; si < STEPS.length; si++) {
      const ln = STEPS[si].line;
      if (ln === undefined) continue;
      const reached = fin || si < i || (si === i && p >= 1);
      if (!reached) continue;
      out.push({ ...TERM_LINES[ln], flash: !fin && si === i && p >= 1 });
    }
    return out;
  });

  boomAt(pos: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return !!s.boom && s.from.x === pos.x && s.from.y === pos.y && this.progress() >= 1;
  }

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Ruta mapeada</strong> con TTL creciente + dos tipos de ICMP: <strong>Time Exceeded (11)</strong> en cada salto intermedio y <strong>Port Unreachable (3)</strong> como señal de llegada. El mismo ICMP da vida a <code>ping</code> (Echo request/reply, tipos 8/0). En la vida real se mandan 3 sondas por TTL — por eso ves 3 tiempos por línea.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y mirá la terminal de la derecha: cada ICMP que vuelve imprime una línea, como el traceroute de verdad.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
