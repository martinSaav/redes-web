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

interface ArpStep {
  cards: Card[];
  msg: string;
  static?: boolean;
  arpFilled?: boolean; // la tabla ARP de A ya tiene al gateway
  showFrame?: 'gw' | 'srv'; // muestra la tarjeta de trama con sus 2 destinos
}

const A: Pos = { x: 11, y: 38 };
const SW: Pos = { x: 34, y: 38 };
const GW: Pos = { x: 60, y: 38 };
const B: Pos = { x: 34, y: 82 };
const SRV: Pos = { x: 88, y: 38 };

const STEPS: ArpStep[] = [
  {
    cards: [{ from: A, to: A, text: '🎯 IP destino: 93.184.216.34 (remota)' }], static: true,
    msg: 'A quiere mandar a una IP <strong>FUERA de su subred</strong> (93.184.216.34). Para armar la trama necesita una MAC destino… pero <strong>NO la del servidor remoto</strong>: el broadcast ARP no sale de la LAN. Necesita la MAC de su <strong>GATEWAY</strong>. Su tabla ARP está vacía →',
  },
  {
    cards: [{ from: A, to: SW, text: 'ARP query: ¿quién tiene 192.168.1.1?' }],
    msg: '<strong>ARP query en broadcast</strong> (MAC destino FF:FF:FF:FF:FF:FF): "¿quién tiene la IP 192.168.1.1? decime tu MAC".',
  },
  {
    cards: [
      { from: SW, to: GW, text: 'ARP query (flood)' },
      { from: SW, to: B, text: 'copia →', color: '#ef9a9a' },
    ],
    msg: 'El switch <strong>floodea</strong> el broadcast por todos los puertos (y de paso aprende dónde vive A). Le llega al gateway… y también a B.',
  },
  {
    cards: [{ from: B, to: B, text: '🤷 no es mi IP' }], static: true,
    msg: 'B mira la query: "¿192.168.1.1? no soy yo" → la <strong>descarta en silencio</strong>. Solo responde el dueño de la IP.',
  },
  {
    cards: [{ from: GW, to: A, text: '192.168.1.1 está en 5A:CE:2B:10:33:01', color: '#7ee787' }],
    msg: 'El gateway responde por <strong>UNICAST</strong> (ya sabe la MAC de A: venía en la query) con su propia MAC.',
  },
  {
    cards: [{ from: A, to: A, text: '💾 cacheado' }], static: true, arpFilled: true,
    msg: 'A <strong>cachea</strong> el mapeo en su tabla ARP (TTL ~20 min, con aging — mirá la tabla). Las próximas tramas al gateway salen sin preguntar. ARP es <strong>plug-and-play</strong>: la tabla se arma sola.',
  },
  {
    cards: [{ from: A, to: GW, text: '📦 trama → gateway', color: '#80d8ff' }], arpFilled: true, showFrame: 'gw',
    msg: 'Ahora sí viaja la trama — mirá sus <strong>DOS destinos</strong> (tarjeta de abajo): <strong>MAC destino = gateway</strong> (capa 2, este enlace) pero <strong>IP destino = servidor remoto</strong> (capa 3, el viaje completo).',
  },
  {
    cards: [{ from: GW, to: SRV, text: '📦 trama NUEVA', color: '#80d8ff' }], arpFilled: true, showFrame: 'srv',
    msg: 'El router desencapsula, rutea por IP, y <strong>re-resuelve por ARP</strong> en el enlace siguiente: arma una <strong>trama nueva</strong> con MACs nuevas… y las <strong>MISMAS IPs</strong>.',
  },
];

@Component({
  selector: 'app-arp-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🏷 ARP en detalle: la tabla que se arma sola + los dos destinos</div>
          <div class="caption">IP → MAC dentro de la subred. La IP nunca cambia; la MAC se reescribe en cada enlace.</div>
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
            <line [attr.x1]="a.x" [attr.y1]="a.y" [attr.x2]="sw.x" [attr.y2]="sw.y" />
            <line [attr.x1]="sw.x" [attr.y1]="sw.y" [attr.x2]="gw.x" [attr.y2]="gw.y" />
            <line [attr.x1]="sw.x" [attr.y1]="sw.y" [attr.x2]="b.x" [attr.y2]="b.y" />
            <line [attr.x1]="gw.x" [attr.y1]="gw.y" [attr.x2]="srv.x" [attr.y2]="srv.y" />
          </svg>

          <div class="zone lan">🏠 subred 192.168.1.0/24</div>
          <div class="zone wan">☁ otra red</div>
          <div class="divider"></div>

          <div class="node an" [class.active]="activeN(a)" [style.left.%]="a.x" [style.top.%]="a.y">
            <strong>💻 Host A</strong><small>192.168.1.10</small>
          </div>
          <div class="node swn" [class.active]="activeN(sw)" [style.left.%]="sw.x" [style.top.%]="sw.y">
            <strong>🔁 Switch</strong><small>capa 2</small>
          </div>
          <div class="node gwn" [class.active]="activeN(gw)" [style.left.%]="gw.x" [style.top.%]="gw.y">
            <strong>📶 Gateway</strong><small>192.168.1.1 · MAC 5A:CE:…</small>
          </div>
          <div class="node bn" [class.active]="activeN(b)" [style.left.%]="b.x" [style.top.%]="b.y">
            <strong>💻 Host B</strong><small>misma LAN</small>
          </div>
          <div class="node srvn" [class.active]="activeN(srv)" [style.left.%]="srv.x" [style.top.%]="srv.y">
            <strong>🖥 Servidor</strong><small>93.184.216.34</small>
          </div>

          @for (c of cards(); track $index) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }

          <!-- tarjeta de la trama con sus dos destinos -->
          @if (frame(); as f) {
            <div class="framecard">
              <div class="fline l2"><span class="tag">capa 2</span> MAC dst: <strong>{{ f.mac }}</strong> <em>{{ f.macNote }}</em></div>
              <div class="fline l3"><span class="tag">capa 3</span> IP dst: <strong>93.184.216.34</strong> <em>(SIEMPRE el destino final)</em></div>
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">🗃 Tabla ARP de A</div>
          <div class="trow th"><span>IP</span><span>MAC</span><span>TTL</span></div>
          @if (arpFilled()) {
            <div class="trow" [class.flash]="arpFlash()">
              <span>192.168.1.1</span><span>5A:CE:2B:…</span><span>20 min</span>
            </div>
          } @else {
            <div class="tempty">(vacía — nunca habló con el gateway)</div>
          }
          <div class="tfoot">
            se llena sola (plug-and-play) y expira por aging ·
            <strong>IP = dirección postal</strong> (jerárquica, rutea) / <strong>MAC = DNI</strong> (plana, local)
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
      position: relative; flex: 1; min-height: 320px;
      background: radial-gradient(ellipse at 40% 45%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .zone { position: absolute; top: 8px; font-size: 0.66rem; font-weight: 700; padding: 2px 10px; border-radius: 10px; }
    .zone.lan { left: 10px; color: #7ee787; background: rgba(46, 160, 67, 0.12); border: 1px solid #2ea04355; }
    .zone.wan { right: 10px; color: #79c0ff; background: rgba(31, 111, 235, 0.12); border: 1px solid #1f6feb55; }
    .divider { position: absolute; left: 73%; top: 0; bottom: 0; border-left: 2px dashed #39445f; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 92px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255, 255, 255, 0.85); font-family: Consolas, monospace; }
    .node.an { background: #2e7d32; }
    .node.swn { background: #546e7a; }
    .node.gwn { background: #f68c1f; }
    .node.bn { background: #455a64; }
    .node.srvn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .framecard {
      position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #80d8ff; border-radius: 9px;
      padding: 7px 12px; font-family: Consolas, monospace; font-size: 0.68rem;
      box-shadow: 0 0 16px rgba(128, 216, 255, 0.3); display: flex; flex-direction: column; gap: 4px;
    }
    .fline { display: flex; gap: 6px; align-items: baseline; white-space: nowrap; }
    .fline strong { color: #fff; }
    .fline em { color: #5c6a8e; font-size: 0.6rem; }
    .fline.l2 { color: #d2b9ff; }
    .fline.l3 { color: #79c0ff; }
    .tag { font-size: 0.56rem; font-weight: 800; padding: 1px 6px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; }

    .table { width: 258px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1fr 1fr 0.5fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 6px 8px; border-radius: 6px; color: var(--text); align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.58rem; padding-bottom: 2px; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; }
    .trow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126, 231, 135, 0.3); background: #16281c; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.62rem; padding-top: 8px; line-height: 1.5; }
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
export class ArpDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly a = A;
  readonly sw = SW;
  readonly gw = GW;
  readonly b = B;
  readonly srv = SRV;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3200;
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

  readonly arpFilled = computed(() => {
    if (this.finished()) return true;
    const i = this.index();
    if (i < 0) return false;
    if (STEPS[i].arpFilled && this.progress() >= 1) return true;
    return i > 0 && !!STEPS[i - 1].arpFilled;
  });

  readonly arpFlash = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].arpFilled && !STEPS[i - 1]?.arpFilled && this.progress() >= 1;
  });

  readonly frame = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const f = STEPS[i].showFrame;
    if (!f) return null;
    return f === 'gw'
      ? { mac: '5A:CE:2B:… (gateway)', macNote: '(solo este enlace)' }
      : { mac: 'BB:07:… (próximo salto)', macNote: '(reescrita por el router)' };
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
      return '<strong>El punto sutil que se pregunta SIEMPRE</strong>: para salir de la subred se resuelve la MAC del <strong>gateway</strong>, no la del destino final. En todo el trayecto la <strong>IP no cambia</strong>; la <strong>MAC se reescribe en cada enlace</strong>. ARP vive justo en la costura entre capa 2 y capa 3.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Atento a dos cosas: la tabla ARP de A (derecha) y la tarjeta de la trama con sus DOS destinos (abajo).';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
