import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

type CastId = 'unicast' | 'broadcast' | 'multicast' | 'anycast';

interface Pos {
  x: number;
  y: number;
}

interface Host {
  i: number;
  pos: Pos;
}

interface CastMode {
  id: CastId;
  label: string;
  dst: string;
  recipients: number[]; // hosts que reciben
  members?: number[]; // multicast: suscriptos al grupo
  replicas?: number[]; // anycast: comparten la misma dirección
  nearest?: number; // anycast: el más cercano (recibe)
  intro: string;
  send: string;
}

const SRC: Pos = { x: 8, y: 50 };
const CLOUD: Pos = { x: 34, y: 50 };
const HOSTS: Host[] = [
  { i: 0, pos: { x: 64, y: 16 } },
  { i: 1, pos: { x: 88, y: 22 } },
  { i: 2, pos: { x: 64, y: 50 } },
  { i: 3, pos: { x: 88, y: 52 } },
  { i: 4, pos: { x: 64, y: 84 } },
  { i: 5, pos: { x: 88, y: 80 } },
];

const MODES: Record<CastId, CastMode> = {
  unicast: {
    id: 'unicast', label: 'Unicast', dst: '192.168.1.53',
    recipients: [3],
    intro: '<strong>Unicast (1 → 1)</strong>: la dirección destino identifica a <strong>UN host específico</strong>. Es el 99% del tráfico (una conexión TCP, un request HTTP). Cada paquete tiene un único receptor.',
    send: 'El paquete se rutea hasta <strong>ese único host</strong> (H3). Los demás ni se enteran. Simple y directo.',
  },
  broadcast: {
    id: 'broadcast', label: 'Broadcast', dst: '255.255.255.255',
    recipients: [0, 1, 2, 3, 4, 5],
    intro: '<strong>Broadcast (1 → todos)</strong>: dirección especial que significa "<strong>TODOS los de la subred</strong>". Ej: el DHCP DISCOVER, o un ARP query (MAC FF:FF:FF:FF:FF:FF). No sale del dominio de broadcast local.',
    send: 'El paquete llega a <strong>TODOS</strong> los hosts de la subred — lo quieran o no. Por eso no escala: un router NO reenvía broadcast (los aísla). <strong>IPv6 lo eliminó</strong>: usa multicast bien dirigido en su lugar.',
  },
  multicast: {
    id: 'multicast', label: 'Multicast', dst: '224.1.1.1',
    recipients: [1, 2, 5], members: [1, 2, 5],
    intro: '<strong>Multicast (1 → grupo)</strong>: la dirección identifica un <strong>GRUPO</strong> (224.0.0.0/4 en IPv4, FF00::/8 en IPv6). Solo reciben los hosts que <strong>se suscribieron</strong> al grupo (IGMP). Ideal para streaming/IPTV a muchos a la vez.',
    send: 'El paquete llega <strong>solo a los suscriptos</strong> al grupo (violeta). El emisor manda UNA copia y la red la replica hacia los miembros — mucho más eficiente que N unicasts.',
  },
  anycast: {
    id: 'anycast', label: 'Anycast', dst: '2001:db8::1 (compartida)',
    recipients: [2], replicas: [2, 3, 5], nearest: 2,
    intro: '<strong>Anycast (1 → el más cercano)</strong>: <strong>VARIOS hosts comparten la MISMA dirección</strong>. La red (por BGP) entrega al <strong>más cercano</strong>. Así funcionan los <strong>root servers de DNS</strong> (13 IPs, cientos de réplicas) y las CDNs.',
    send: 'Aunque 3 réplicas tienen la misma IP, el paquete va al <strong>MÁS CERCANO</strong> (H2). Las otras réplicas comparten la dirección pero no reciben ESTE paquete — atienden a los clientes cercanos a ellas.',
  },
};

const ORDER: CastId[] = ['unicast', 'broadcast', 'multicast', 'anycast'];

@Component({
  selector: 'app-cast-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎯 Unicast · Broadcast · Multicast · Anycast</div>
          <div class="caption">La misma red, 4 formas de direccionar: a uno, a todos, a un grupo, o al más cercano.</div>
        </div>
        <div class="controls">
          <div class="mode">
            @for (m of order; track m) {
              <button [class.on]="mode() === m" (click)="setMode(m)">{{ modes[m].label }}</button>
            }
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
            <line [attr.x1]="src.x" [attr.y1]="src.y" [attr.x2]="cloud.x" [attr.y2]="cloud.y" class="wire" />
            @for (h of hosts; track h.i) {
              <line [attr.x1]="cloud.x" [attr.y1]="cloud.y" [attr.x2]="h.pos.x" [attr.y2]="h.pos.y"
                    class="wire" [class.lit]="isRecipient(h.i) && (arrived() || sending())" />
            }
            <!-- beams del envío -->
            @for (b of beams(); track b.i) {
              <line [attr.x1]="cloud.x" [attr.y1]="cloud.y" [attr.x2]="b.dotX" [attr.y2]="b.dotY" class="beam" />
            }
          </svg>

          <!-- dirección destino que viaja del source a la nube -->
          @if (dstCard(); as c) {
            <div class="dstcard" [style.left.%]="c.x" [style.top.%]="c.y">dst: {{ modes[mode()].dst }}</div>
          }

          <!-- source -->
          <div class="node src" [style.left.%]="src.x" [style.top.%]="src.y">
            <strong>📤 emisor</strong>
          </div>
          <!-- nube / red -->
          <div class="node cloud" [style.left.%]="cloud.x" [style.top.%]="cloud.y">
            <strong>☁ red</strong><small>routers</small>
          </div>

          <!-- dots de los beams -->
          @for (b of beams(); track b.i) {
            <div class="dot" [style.left.%]="b.dotX" [style.top.%]="b.dotY"></div>
          }

          <!-- hosts -->
          @for (h of hosts; track h.i) {
            <div class="node host"
                 [class.recv]="isRecipient(h.i) && arrived()"
                 [class.member]="isMember(h.i)"
                 [class.replica]="isReplica(h.i) && !isRecipient(h.i)"
                 [class.dim]="isDim(h.i)"
                 [style.left.%]="h.pos.x" [style.top.%]="h.pos.y">
              <strong>H{{ h.i }}</strong>
              @if (tag(h.i); as t) { <span class="htag" [class]="t.cls">{{ t.txt }}</span> }
            </div>
          }
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">📋 Comparación</div>
            @for (r of rows; track r.id) {
              <div class="trow" [class.on]="mode() === r.id">
                <span class="tt">{{ r.label }}</span>
                <span class="td">{{ r.who }}</span>
                <span class="tv">{{ r.ipv6 }}</span>
              </div>
            }
            <div class="tfoot">
              <b>anycast</b> vive en la capa de red (BGP lo lleva al más cercano); <b>broadcast/multicast</b> también tienen su versión de <b>capa 2</b> (MAC).
            </div>
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
          <button class="dot2" [class.past]="i < index() || finished()" [class.now]="i === index() && !finished()" (click)="jump(i)"></button>
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
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; flex-wrap: wrap; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 11px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
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
      position: relative; flex: 1; min-width: 0; min-height: 320px;
      background: radial-gradient(ellipse at 40% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #313c56; stroke-width: 0.5; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wire.lit { stroke: #2ea043; stroke-width: 1.1; }
    .beam { stroke: #ffd54f; stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.6; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 6px 10px; min-width: 52px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: border-color 0.3s, box-shadow 0.3s, opacity 0.3s, background 0.3s;
    }
    .node strong { font-size: 0.76rem; color: #fff; }
    .node small { font-size: 0.58rem; color: rgba(255,255,255,0.85); }
    .node.src { background: #2e7d32; }
    .node.cloud { background: #455a76; }
    .node.host { background: #37455f; }
    .node.host.dim { opacity: 0.4; }
    .node.host.recv { background: #1d3b26; border-color: #2ea043; box-shadow: 0 0 16px rgba(46,160,67,0.6); }
    .node.host.member { border-color: #a78bfa; }
    .node.host.replica { border-color: #a78bfa; border-style: dashed; opacity: 0.75; }
    .htag { font-size: 0.54rem; font-weight: 700; margin-top: 2px; padding: 1px 5px; border-radius: 6px; white-space: nowrap; }
    .htag.grp { background: #2d1d47; color: #d2b9ff; border: 1px solid #a78bfa66; }
    .htag.rep { background: #2d1d47; color: #d2b9ff; border: 1px solid #a78bfa66; }
    .htag.recv { background: #16281c; color: #7ee787; border: 1px solid #2ea043; }

    .dot { position: absolute; transform: translate(-50%, -50%); z-index: 4; width: 12px; height: 12px; border-radius: 50%; background: #ffd54f; box-shadow: 0 0 10px #ffd54f; }

    .dstcard { position: absolute; transform: translate(-50%, -50%); z-index: 4; background: rgba(8,12,22,0.95); border: 1.5px solid #ffd54f; border-radius: 7px; padding: 3px 8px; font-family: Consolas, monospace; font-size: 0.62rem; color: #ffe082; white-space: nowrap; box-shadow: 0 0 12px rgba(255,213,79,0.3); }

    .side { width: 300px; flex-shrink: 0; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; height: 100%; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.82rem; color: #ffd54f; margin-bottom: 8px; }
    .trow { display: grid; grid-template-columns: 0.8fr 1.5fr 0.5fr; gap: 6px; padding: 7px 8px; border-radius: 7px; align-items: center; background: #1a2132; border: 1px solid #2d3750; margin-bottom: 4px; transition: border-color 0.3s, background 0.3s; }
    .trow.on { border-color: #7c3aed; background: #221a3a; }
    .tt { font-weight: 800; font-size: 0.72rem; color: #cfe3ff; }
    .td { font-size: 0.66rem; color: #8b95b5; line-height: 1.3; }
    .tv { font-size: 0.72rem; text-align: center; }
    .tfoot { margin-top: auto; padding-top: 8px; font-size: 0.62rem; color: #8b95b5; line-height: 1.5; }
    .tfoot b { color: #cfe3ff; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot2 { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot2:hover { transform: scale(1.3); }
    .dot2.past { background: #1f6feb; border-color: #1f6feb; }
    .dot2.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) { .board { flex-direction: column; } .side { width: 100%; } }
  `,
})
export class CastDetail extends SteppedAnim implements OnDestroy {
  readonly src = SRC;
  readonly cloud = CLOUD;
  readonly hosts = HOSTS;
  readonly modes = MODES;
  readonly order = ORDER;

  readonly mode = signal<CastId>('unicast');
  readonly steps = computed(() => [0, 1]); // [intro, envío]

  readonly rows = [
    { id: 'unicast' as CastId, label: 'Unicast', who: 'a UN host específico', ipv6: '✔' },
    { id: 'broadcast' as CastId, label: 'Broadcast', who: 'a TODOS los de la subred', ipv6: '✖' },
    { id: 'multicast' as CastId, label: 'Multicast', who: 'a los suscriptos al GRUPO', ipv6: '✔' },
    { id: 'anycast' as CastId, label: 'Anycast', who: 'al MÁS CERCANO con esa IP', ipv6: '✔' },
  ];

  protected stepCount(): number {
    return 2;
  }
  protected override stepTravel(i: number): number {
    return i === 1 ? 1500 : 500;
  }
  protected override stepDwell(): number {
    return 3400;
  }

  setMode(m: CastId): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private cfg(): CastMode {
    return MODES[this.mode()];
  }

  sending(): boolean {
    return this.index() === 1 && !this.finished();
  }
  arrived(): boolean {
    return this.finished() || (this.index() === 1 && this.progress() >= 0.85);
  }

  isRecipient(i: number): boolean {
    return this.cfg().recipients.includes(i);
  }
  isMember(i: number): boolean {
    return (this.cfg().members ?? []).includes(i);
  }
  isReplica(i: number): boolean {
    return (this.cfg().replicas ?? []).includes(i);
  }
  isDim(i: number): boolean {
    if (this.index() < 0) return false;
    // atenuar los que no participan
    const c = this.cfg();
    if (c.id === 'broadcast') return false;
    const relevant = new Set([...c.recipients, ...(c.members ?? []), ...(c.replicas ?? [])]);
    return !relevant.has(i);
  }

  tag(i: number): { txt: string; cls: string } | null {
    const c = this.cfg();
    if (c.id === 'multicast' && this.isMember(i)) return { txt: '∈ grupo', cls: 'grp' };
    if (c.id === 'anycast' && this.isReplica(i)) {
      return i === c.nearest && this.arrived()
        ? { txt: 'más cercano ✔', cls: 'recv' }
        : { txt: 'misma IP', cls: 'rep' };
    }
    if (this.isRecipient(i) && this.arrived()) return { txt: 'recibe ✔', cls: 'recv' };
    return null;
  }

  readonly beams = computed(() => {
    if (!this.sending()) return [];
    const p = this.ease(this.progress());
    return this.cfg().recipients.map((idx) => {
      const h = HOSTS[idx].pos;
      return {
        i: idx,
        dotX: CLOUD.x + (h.x - CLOUD.x) * p,
        dotY: CLOUD.y + (h.y - CLOUD.y) * p,
      };
    });
  });

  readonly dstCard = computed(() => {
    // la dirección destino "sale" del emisor hacia la nube en el paso de intro/envío
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    if (i === 0) {
      return { x: (SRC.x + CLOUD.x) / 2, y: SRC.y - 9 };
    }
    // en el envío, acompaña hasta la nube al principio
    const p = Math.min(this.progress() * 2, 1);
    return { x: SRC.x + (CLOUD.x - SRC.x) * p, y: SRC.y - 9 };
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.cfg().send;
    }
    const i = this.index();
    if (i < 0) return 'Elegí un modo arriba y presioná ▶ Play. Fijate a cuántos hosts (y a cuáles) le llega el paquete en cada caso.';
    return i === 0 ? this.cfg().intro : this.cfg().send;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
