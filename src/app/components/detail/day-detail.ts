import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface DayStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  layer: string; // badge de capa
  layerColor: string;
  static?: boolean;
}

const NB: Pos = { x: 8, y: 74 };
const SW: Pos = { x: 26, y: 74 };
const GW: Pos = { x: 44, y: 74 };
const DNS: Pos = { x: 44, y: 22 };
const JER: Pos = { x: 78, y: 22 };
const SRV: Pos = { x: 78, y: 74 };

const APP = '#4caf50';
const TRA = '#f59e0b';
const RED = '#38bdf8';
const ENL = '#a78bfa';
const SEG = '#ef4444';
const ALL = '#fbbf24';

const STEPS: DayStep[] = [
  {
    from: NB, to: NB, text: '❓ sin IP · sin gateway · sin DNS', static: true, layer: 'Arranque', layerColor: '#64748b',
    msg: 'La notebook recién enchufada <strong>no sabe NADA</strong>: ni su IP, ni quién es el gateway, ni qué DNS usar. Objetivo: cargar <strong>https://www.google.com</strong>. Mirá el checklist de la derecha: se va a completar solo.',
  },
  {
    from: NB, to: GW, text: 'DHCP DISCOVER (broadcast)', layer: 'Aplicación · DHCP/UDP', layerColor: APP,
    msg: '<strong>DHCP DISCOVER</strong> en broadcast: UDP 68→67, IP origen 0.0.0.0 → destino 255.255.255.255, MAC destino FF:FF:FF:FF:FF:FF. El <strong>switch</strong> del medio floodea el broadcast — y de paso <strong>aprende</strong> por qué puerto vive la notebook.',
  },
  {
    from: GW, to: NB, text: 'OFFER → REQUEST → ACK ✔', color: '#a5d6a7', layer: 'Aplicación · DHCP/UDP', layerColor: APP,
    msg: 'Ciclo <strong>DORA</strong> completo: la notebook recibe <strong>IP 192.168.1.10</strong>, máscara /24, <strong>gateway 192.168.1.1</strong> y la IP del <strong>DNS local</strong> — con un lease renovable. Ya puede hablar.',
  },
  {
    from: NB, to: GW, text: 'ARP: ¿MAC de 192.168.1.1?', layer: 'Enlace · ARP', layerColor: ENL,
    msg: 'Para mandar tramas hacia afuera necesita la <strong>MAC del GATEWAY</strong> — no la del destino final: el broadcast ARP <strong>no sale de la LAN</strong>. Query en broadcast: "¿quién tiene la 192.168.1.1?".',
  },
  {
    from: GW, to: NB, text: 'ARP reply: 5A:CE:2B:…', color: '#a5d6a7', layer: 'Enlace · ARP', layerColor: ENL,
    msg: 'El router responde por unicast con su MAC; la notebook la <strong>cachea</strong> (~20 min). Ya puede encapsular tramas con destino al gateway.',
  },
  {
    from: NB, to: DNS, text: 'UDP/53: ¿A de www.google.com?', layer: 'Aplicación · DNS/UDP', layerColor: APP,
    msg: 'La <strong>query DNS</strong> viaja en una trama con <strong>MAC del gateway</strong> pero <strong>IP del DNS local</strong> (¡dos capas, dos destinos!). Al cruzar el router, <strong>NAT</strong> reescribe el origen privado → público y anota su tabla.',
  },
  {
    from: DNS, to: JER, text: 'iterativas: root → .com → auth', color: '#ce93d8', layer: 'Aplicación · DNS', layerColor: APP,
    msg: '<strong>Cache MISS</strong> en el Local → resolución <strong>ITERATIVA</strong> contra la jerarquía: el root deriva al TLD .com, el TLD al authoritative de Google.',
  },
  {
    from: JER, to: DNS, text: 'A: 142.250.79.36 (CDN) ✔', color: '#80d8ff', layer: 'Aplicación · DNS + CDN', layerColor: APP,
    msg: 'El authoritative responde — y la IP <strong>la eligió la CDN para vos</strong>: el cluster más cercano a tu resolver (a veces con IP anycast). DNS haciendo, de paso, balanceo de carga global.',
  },
  {
    from: DNS, to: NB, text: 'respuesta (queda cacheada)', color: '#80d8ff', layer: 'Aplicación · DNS', layerColor: APP,
    msg: 'El Local <strong>cachea con TTL</strong> y responde. La notebook ya tiene la <strong>IP destino</strong>. Recién ahora puede empezar HTTP… pero antes: conexión y seguridad.',
  },
  {
    from: NB, to: SRV, text: 'TCP SYN (seq=x) → :443', layer: 'Transporte · TCP', layerColor: TRA,
    msg: '<strong>Three-way handshake</strong> contra el puerto 443: SYN con ISN aleatorio. La notebook queda en SYN_SENT.',
  },
  {
    from: SRV, to: NB, text: 'SYN-ACK (seq=y, ack=x+1)', color: '#ffd54f', layer: 'Transporte · TCP', layerColor: TRA,
    msg: 'El server responde SYN-ACK y <strong>reserva buffers y variables</strong> (SYN_RCVD) — el estado que explota un SYN flood, mitigado con SYN cookies.',
  },
  {
    from: NB, to: SRV, text: 'ACK ✔ — ESTABLISHED', color: '#ffd54f', layer: 'Transporte · TCP', layerColor: TRA,
    msg: 'ACK final: conexión <strong>ESTABLISHED</strong> en ambos extremos. La red del medio no guarda NADA: el estado vive solo en los hosts.',
  },
  {
    from: NB, to: SRV, text: 'TLS handshake 🔒', color: '#ef9a9a', layer: 'Seguridad · TLS', layerColor: SEG,
    msg: '<strong>Handshake TLS</strong> sobre la conexión: el server presenta su <strong>certificado</strong> (validado contra una CA raíz del trust store — esto frena el MITM), la notebook manda el <strong>PMS cifrado</strong> con la clave pública del server, y ambos derivan las <strong>4 claves de sesión</strong>.',
  },
  {
    from: NB, to: SRV, text: 'GET / (cifrado) 🔒', color: '#ffd54f', layer: 'Todas las capas juntas', layerColor: ALL,
    msg: 'El <strong>GET</strong> baja por la pila: segmento TCP → datagrama IP → trama Ethernet. En <strong>CADA router</strong>: lookup por <strong>LPM</strong>, <strong>TTL−1</strong> (si llega a 0: ICMP Time Exceeded), <strong>MAC reescrita</strong> por enlace — la IP nunca cambia. La ruta ya estaba armada por el control plane: <strong>OSPF</strong> adentro de cada AS, <strong>BGP</strong> entre ASes.',
  },
  {
    from: SRV, to: NB, text: '200 OK · HTML 🔒', color: '#a5d6a7', layer: 'Todas las capas juntas', layerColor: ALL,
    msg: 'La respuesta vuelve: <strong>TCP</strong> garantiza orden y repone pérdidas (con su control de congestión regulando la tasa), <strong>NAT</strong> deshace la traducción, <strong>TLS</strong> descifra y verifica integridad.',
  },
  {
    from: NB, to: NB, text: '🎨 renderizando…', static: true, layer: 'Aplicación · HTTP', layerColor: APP,
    msg: 'El navegador <strong>renderiza la página</strong>. Pasaron unos ~200 ms — y usaste literalmente <strong>todo el programa de la materia</strong>.',
  },
];

interface CheckItem {
  name: string;
  at: number; // paso en el que se tilda
  hint: string;
}

const CHECKS: CheckItem[] = [
  { name: 'DHCP (DORA)', at: 2, hint: 'IP + máscara + gateway + DNS' },
  { name: 'Switch self-learning', at: 1, hint: 'floodea broadcast, aprende MACs' },
  { name: 'ARP', at: 4, hint: 'IP → MAC del gateway' },
  { name: 'DNS + caché', at: 8, hint: 'recursiva + iterativas, UDP/53' },
  { name: 'NAT', at: 5, hint: 'privada ↔ pública por puerto' },
  { name: 'CDN / anycast', at: 7, hint: 'el server más cercano a vos' },
  { name: 'TCP handshake', at: 11, hint: 'SYN → SYN-ACK → ACK' },
  { name: 'TLS', at: 12, hint: 'certificado + claves de sesión' },
  { name: 'IP: LPM + TTL', at: 13, hint: 'en cada router del camino' },
  { name: 'Ruteo OSPF + BGP', at: 13, hint: 'la tabla ya estaba lista' },
  { name: 'HTTP', at: 14, hint: 'GET → 200 OK' },
];

@Component({
  selector: 'app-day-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🚀 Un día en la vida de una petición web — versión completa</div>
          <div class="caption">De enchufar la notebook a ver la página: cada paso con su capa y su protocolo. El checklist se completa solo.</div>
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

      <div class="phases">
        @for (ph of phases; track ph.i) {
          <button class="phase" [class.on]="currentPhase() === ph.i" (click)="jump(ph.i)">{{ ph.label }}</button>
        }
      </div>

      <div class="board">
        <div class="canvas">
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="nb.x" [attr.y1]="nb.y" [attr.x2]="sw.x" [attr.y2]="sw.y" />
            <line [attr.x1]="sw.x" [attr.y1]="sw.y" [attr.x2]="gw.x" [attr.y2]="gw.y" />
            <line [attr.x1]="gw.x" [attr.y1]="gw.y" [attr.x2]="dns.x" [attr.y2]="dns.y" />
            <line [attr.x1]="dns.x" [attr.y1]="dns.y" [attr.x2]="jer.x" [attr.y2]="jer.y" />
            <line [attr.x1]="gw.x" [attr.y1]="gw.y" [attr.x2]="srv.x" [attr.y2]="srv.y" />
          </svg>

          <div class="cloud">☁ Internet · routers con OSPF/BGP</div>
          <div class="lan">🏠 tu LAN</div>

          <div class="node nbn" [class.active]="active(nb)" [style.left.%]="nb.x" [style.top.%]="nb.y">
            <strong>💻 Notebook</strong><small>{{ nbSub() }}</small>
          </div>
          <div class="node swn" [class.active]="active(sw)" [style.left.%]="sw.x" [style.top.%]="sw.y">
            <strong>🔁 Switch</strong><small>capa 2</small>
          </div>
          <div class="node gwn" [class.active]="active(gw)" [style.left.%]="gw.x" [style.top.%]="gw.y">
            <strong>📶 Gateway</strong><small>DHCP + NAT</small>
          </div>
          <div class="node dnsn" [class.active]="active(dns)" [style.left.%]="dns.x" [style.top.%]="dns.y">
            <strong>📡 DNS Local</strong><small>resolver del ISP</small>
          </div>
          <div class="node jern" [class.active]="active(jer)" [style.left.%]="jer.x" [style.top.%]="jer.y">
            <strong>🏛 Jerarquía DNS</strong><small>root → TLD → auth</small>
          </div>
          <div class="node srvn" [class.active]="active(srv)" [style.left.%]="srv.x" [style.top.%]="srv.y">
            <strong>🌍 Google</strong><small>cluster CDN · :443</small>
          </div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="checklist">
          <div class="chead">✅ La materia entera, en un click</div>
          @for (c of checkStates(); track c.name) {
            <div class="citem" [class.done]="c.done" [class.just]="c.just">
              <span class="cbox">{{ c.done ? '✔' : '' }}</span>
              <span class="cname">{{ c.name }}</span>
              <span class="chint">{{ c.hint }}</span>
            </div>
          }
        </div>
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="layerbadge" [style.background]="curLayerColor()">{{ curLayer() }}</span>
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
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 480px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }
    .phases { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .phase { background: var(--panel-2); color: var(--text-dim); border: 1px solid var(--border); border-radius: 16px; padding: 5px 14px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
    .phase:hover { color: var(--text); border-color: #58a6ff; }
    .phase.on { background: #1f6feb22; color: #79c0ff; border-color: #1f6feb; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas {
      position: relative; flex: 1; min-height: 340px;
      background: radial-gradient(ellipse at 45% 55%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .cloud { position: absolute; right: 10px; top: 45%; font-size: 0.64rem; color: #79c0ff; background: rgba(31, 111, 235, 0.1); border: 1px solid #1f6feb44; padding: 2px 10px; border-radius: 10px; }
    .lan { position: absolute; left: 10px; bottom: 8px; font-size: 0.64rem; color: #7ee787; background: rgba(46, 160, 67, 0.1); border: 1px solid #2ea04344; padding: 2px 10px; border-radius: 10px; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 10px; min-width: 92px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.76rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255, 255, 255, 0.85); }
    .node.nbn { background: #2e7d32; }
    .node.swn { background: #546e7a; }
    .node.gwn { background: #f68c1f; }
    .node.dnsn { background: #ffb300; }
    .node.jern { background: #7b1fa2; }
    .node.srvn { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .checklist { width: 252px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; overflow-y: auto; }
    .chead { font-weight: 700; font-size: 0.84rem; margin-bottom: 8px; color: #ffd54f; }
    .citem {
      display: grid; grid-template-columns: 20px 1fr; grid-template-rows: auto auto; column-gap: 7px;
      padding: 4px 6px; border-radius: 6px; margin-bottom: 3px; opacity: 0.45;
      transition: opacity 0.3s, background 0.3s;
    }
    .citem.done { opacity: 1; }
    .citem.just { background: rgba(46, 160, 67, 0.15); }
    .cbox {
      grid-row: span 2; align-self: center; width: 17px; height: 17px; border-radius: 5px;
      border: 1.5px solid #2d3750; background: #1a2132; color: #7ee787; font-size: 0.72rem; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }
    .citem.done .cbox { border-color: #2ea043; background: #16281c; }
    .cname { font-size: 0.74rem; font-weight: 700; color: var(--text); }
    .chint { font-size: 0.62rem; color: #5c6a8e; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 54px; font-size: 0.93rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .layerbadge { flex-shrink: 0; color: #0d1117; border-radius: 6px; font-size: 0.68rem; font-weight: 800; padding: 3px 9px; white-space: nowrap; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 720px) {
      .board { flex-direction: column; }
      .checklist { width: 100%; }
    }
  `,
})
export class DayDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly nb = NB;
  readonly sw = SW;
  readonly gw = GW;
  readonly dns = DNS;
  readonly jer = JER;
  readonly srv = SRV;

  readonly phases = [
    { i: 0, label: '🔌 DHCP' },
    { i: 3, label: '🏷 ARP' },
    { i: 5, label: '🌐 DNS' },
    { i: 9, label: '🤝 TCP + TLS' },
    { i: 13, label: '📄 HTTP' },
  ];

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3000;
  }

  readonly currentPhase = computed(() => {
    const i = this.index();
    let cur = 0;
    for (const ph of this.phases) if (i >= ph.i) cur = ph.i;
    return cur;
  });

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

  readonly nbSub = computed(() => {
    const i = this.index();
    if (i < 2) return 'sin configurar';
    return '192.168.1.10';
  });

  readonly checkStates = computed(() => {
    const i = this.index();
    const p = this.progress();
    const fin = this.finished();
    return CHECKS.map((c) => {
      const done = fin || i > c.at || (i === c.at && p >= 1);
      const just = !fin && i === c.at && p >= 1;
      return { ...c, done, just };
    });
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  curLayer(): string {
    const i = this.index();
    return i >= 0 ? STEPS[i].layer : '';
  }
  curLayerColor(): string {
    const i = this.index();
    return i >= 0 ? STEPS[i].layerColor : '#64748b';
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Checklist completo</strong>: DHCP, switch, ARP, DNS con caché, NAT, CDN, TCP, TLS, IP (LPM+TTL), OSPF/BGP y HTTP — en 30 segundos de navegación pasó el programa entero. Si contás este relato de corrido, nombrando en cada paso <strong>la capa y el protocolo</strong>, demostraste que entendés cómo encaja TODO: exactamente lo que busca un oral integrador.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play (o saltá de fase con los botones). Consejo para el oral: en cada paso, decí en voz alta la CAPA y el PROTOCOLO — el badge de colores te marca cuál toca.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
