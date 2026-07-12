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

interface DhcpStep {
  cards: Card[];
  msg: string;
  static?: boolean;
  cfg?: 'none' | 'offered' | 'confirmed'; // estado del panel de config
}

const CLI: Pos = { x: 13, y: 50 };
const SRV: Pos = { x: 74, y: 22 };
const OTRO: Pos = { x: 74, y: 78 };

const STEPS: DhcpStep[] = [
  {
    cards: [{ from: CLI, to: CLI, text: '❓ src 0.0.0.0 — sin identidad' }], static: true, cfg: 'none',
    msg: 'El cliente se acaba de conectar: <strong>no tiene IP</strong> (mirá su panel: todo vacío). Solo puede hablar en <strong>broadcast</strong> — y eso hace.',
  },
  {
    cards: [
      { from: CLI, to: SRV, text: 'DISCOVER · 0.0.0.0 → 255.255.255.255' },
      { from: CLI, to: OTRO, text: 'DISCOVER (broadcast)', color: '#ef9a9a' },
    ],
    cfg: 'none',
    msg: '1. <strong>DISCOVER</strong>: UDP 68→67, IP origen 0.0.0.0, destino 255.255.255.255, MAC FF:FF:FF:FF:FF:FF + un <strong>transaction ID</strong> para aparear respuestas. Le llega a TODOS los de la LAN.',
  },
  {
    cards: [{ from: OTRO, to: OTRO, text: '🤷 no soy servidor DHCP' }], static: true, cfg: 'none',
    msg: 'El otro host lo recibe (era broadcast), ve que no es servidor DHCP y lo <strong>descarta</strong>. El servidor, en cambio, prepara una oferta…',
  },
  {
    cards: [{ from: SRV, to: CLI, text: 'OFFER · 192.168.1.10 · lease 24 h', color: '#ffd54f' }], cfg: 'offered',
    msg: '2. <strong>OFFER</strong>: una IP con su <strong>lease</strong> (préstamo por tiempo limitado) + máscara + gateway + DNS. Mirá el panel: son valores <strong>ofrecidos</strong>, todavía no confirmados. Podría haber VARIOS servidores ofertando.',
  },
  {
    cards: [
      { from: CLI, to: SRV, text: 'REQUEST · "quiero 192.168.1.10"' },
      { from: CLI, to: OTRO, text: 'REQUEST (broadcast)', color: '#ef9a9a' },
    ],
    cfg: 'offered',
    msg: '3. <strong>REQUEST</strong>, también en broadcast: el cliente elige UNA oferta y la pide formalmente — y de paso los otros servidores DHCP se enteran de que no fueron elegidos y liberan sus ofertas.',
  },
  {
    cards: [{ from: SRV, to: CLI, text: 'ACK ✔ — configuración confirmada', color: '#7ee787' }], cfg: 'confirmed',
    msg: '4. <strong>ACK</strong>: ¡confirmado! El panel se completa: <strong>IP + máscara + gateway + DNS local</strong>, todo lo necesario para empezar a hablar. DORA terminado, sin tocar un solo cable.',
  },
];

interface CfgRow {
  k: string;
  v: string;
}

const CFG_ROWS: CfgRow[] = [
  { k: 'IP', v: '192.168.1.10' },
  { k: 'máscara', v: '255.255.255.0 (/24)' },
  { k: 'gateway', v: '192.168.1.1' },
  { k: 'DNS local', v: '192.168.1.1' },
  { k: 'lease', v: '24 h (renovable)' },
];

@Component({
  selector: 'app-dhcp-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔌 DHCP en detalle: DORA + la config que se completa sola</div>
          <div class="caption">Plug and play: de "no sé ni quién soy" a totalmente configurado, en 4 mensajes.</div>
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
            <line [attr.x1]="cli.x" [attr.y1]="cli.y" [attr.x2]="srv.x" [attr.y2]="srv.y" />
            <line [attr.x1]="cli.x" [attr.y1]="cli.y" [attr.x2]="otro.x" [attr.y2]="otro.y" />
          </svg>

          <div class="node clin" [class.active]="active(cli)" [style.left.%]="cli.x" [style.top.%]="cli.y">
            <strong>💻 Cliente</strong><small>{{ cliSub() }}</small>
          </div>
          <div class="node srvn" [class.active]="active(srv)" [style.left.%]="srv.x" [style.top.%]="srv.y">
            <strong>🗄 Servidor DHCP</strong><small>a menudo, el propio router</small>
          </div>
          <div class="node otron" [class.active]="active(otro)" [style.left.%]="otro.x" [style.top.%]="otro.y">
            <strong>💻 Otro host</strong><small>también escucha el broadcast</small>
          </div>

          @for (c of cards(); track $index) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">📝 Config del cliente</div>
          @for (r of cfgRows(); track r.k) {
            <div class="trow" [class.flash]="r.flash" [class.offered]="r.offered">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </div>
          }
          <div class="tfoot">antes de vencer el lease, renueva con un REQUEST directo · en redes grandes: relay agent</div>
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
      position: relative; flex: 1; min-height: 290px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 110px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); font-family: Consolas, monospace; }
    .node.clin { background: #2e7d32; }
    .node.srvn { background: #f68c1f; }
    .node.otron { background: #546e7a; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .table { width: 258px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #7ee787; }
    .trow { display: grid; grid-template-columns: 0.8fr 1.4fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.68rem; padding: 6px 8px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; margin-bottom: 4px; align-items: center; }
    .trow .k { color: #5c6a8e; font-weight: 700; }
    .trow .v { color: var(--text); }
    .trow.offered .v { color: #ffd54f; font-style: italic; }
    .trow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126, 231, 135, 0.3); background: #16281c; }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.62rem; font-style: italic; padding-top: 8px; }

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
      .table { width: 100%; }
    }
  `,
})
export class DhcpDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly cli = CLI;
  readonly srv = SRV;
  readonly otro = OTRO;

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

  /** estado del panel según el paso alcanzado */
  private cfgState = computed<'none' | 'offered' | 'confirmed'>(() => {
    if (this.finished()) return 'confirmed';
    const i = this.index();
    if (i < 0) return 'none';
    const done = this.progress() >= 1;
    const st = STEPS[i].cfg ?? 'none';
    if (done) return st;
    return i > 0 ? (STEPS[i - 1].cfg ?? 'none') : 'none';
  });

  readonly cfgRows = computed(() => {
    const st = this.cfgState();
    const i = this.index();
    const justConfirmed = !this.finished() && i >= 0 && STEPS[i].cfg === 'confirmed' && this.progress() >= 1;
    return CFG_ROWS.map((r) => ({
      k: r.k,
      v: st === 'none' ? '—' : st === 'offered' ? r.v + ' (ofrecido)' : r.v,
      offered: st === 'offered',
      flash: justConfirmed,
    }));
  });

  readonly cliSub = computed(() => (this.cfgState() === 'confirmed' ? '192.168.1.10 ✔' : 'sin IP (0.0.0.0)'));

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return STEPS[i].cards.some(
      (c) => (c.from.x === p.x && c.from.y === p.y) || (c.to.x === p.x && c.to.y === p.y),
    );
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>DORA</strong>: Discover, Offer, Request, Ack — todo sobre UDP 67/68 y casi todo en broadcast (el cliente no tiene IP hasta el final). La contra de la dinámica: tu IP puede cambiar entre sesiones — por eso los servers usan IP fija o DNS dinámico.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y mirá el panel de la derecha: el cliente arranca sin NADA y termina con la configuración completa.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
