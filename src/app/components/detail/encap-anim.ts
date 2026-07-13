import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

type Wrapper = 'eth' | 'ip' | 'tcp';

type DeviceId = 'a' | 'sw' | 'ra' | 'rb' | 'b';

interface EncapStep {
  fromX: number;
  toX: number;
  msg: string;
  layers: Wrapper[]; // wrappers visibles al FINAL del paso
  appear?: Wrapper; // wrapper que aparece durante el paso
  disappear?: Wrapper; // wrapper que desaparece durante el paso
  ethText?: string;
  ipText?: string;
  highlight?: { device: DeviceId; layers: string[] };
  deliver?: boolean; // el mensaje llega a la app (pulso final)
}

const XA = 8;
const XSW = 26;
const XRA = 44;
const XRB = 63;
const XB = 85;

const IP_SRC = '192.168.1.10';
const IP_DST = '93.184.216.34';
const PORT_SRC = '49152';
const PORT_DST = '80';
const MAC_A = 'aa:aa:aa:aa:aa:aa';
const MAC_RA_LAN = '11:11:11:11:11:11'; // router A, interfaz hacia la red de A
const MAC_RA_WAN = '22:22:22:22:22:22'; // router A, interfaz hacia el enlace entre routers
const MAC_RB_WAN = '33:33:33:33:33:33'; // router B, interfaz hacia el enlace entre routers
const MAC_RB_LAN = '44:44:44:44:44:44'; // router B, interfaz hacia la red de B
const MAC_B = 'bb:bb:bb:bb:bb:bb';

const IP1 = `IP · ${IP_SRC} → ${IP_DST} · TTL 64`;
const IP2 = `IP · ${IP_SRC} → ${IP_DST} · TTL 63`;
const IP3 = `IP · ${IP_SRC} → ${IP_DST} · TTL 62`;
const ETH_A = 'Ethernet · A → router A';
const ETH_WAN = 'Ethernet · router A → router B';
const ETH_B = 'Ethernet · router B → B';

const STEPS: EncapStep[] = [
  {
    fromX: XA, toX: XA, layers: [],
    highlight: { device: 'a', layers: ['Aplicación'] },
    msg: '<strong>Capa de aplicación</strong> del Host A: el navegador genera el <strong>MENSAJE</strong> — un GET HTTP. Ahora empieza a bajar por la pila.',
  },
  {
    fromX: XA, toX: XA, layers: ['tcp'], appear: 'tcp',
    highlight: { device: 'a', layers: ['Transporte'] },
    msg: '<strong>Transporte</strong> lo encapsula en un <strong>SEGMENTO</strong>: header TCP con puertos (src 49152 → dst 80). Esto identifica los PROCESOS en cada punta.',
  },
  {
    fromX: XA, toX: XA, layers: ['tcp', 'ip'], appear: 'ip', ipText: IP1,
    highlight: { device: 'a', layers: ['Red'] },
    msg: '<strong>Red</strong> lo mete en un <strong>DATAGRAMA</strong>: IPs origen/destino (esto rutea por el mundo entero) y TTL=64.',
  },
  {
    fromX: XA, toX: XA, layers: ['tcp', 'ip', 'eth'], appear: 'eth', ethText: ETH_A, ipText: IP1,
    highlight: { device: 'a', layers: ['Enlace'] },
    msg: '<strong>Enlace</strong> arma la <strong>TRAMA</strong>: MACs del enlace LOCAL (A → router A, ¡no la MAC del destino final!) y un trailer <strong>CRC</strong>. Ya lista para salir al medio como bits.',
  },
  {
    fromX: XA, toX: XSW, layers: ['tcp', 'ip', 'eth'], ethText: ETH_A, ipText: IP1,
    highlight: { device: 'sw', layers: ['Enlace'] },
    msg: 'La trama viaja por el medio hasta el <strong>switch</strong>, que <strong>procesa solo hasta la capa de enlace</strong>: mira la MAC destino en su tabla y reenvía. <strong>Ni se entera</strong> de que adentro hay un datagrama IP — para él es carga opaca, y <strong>no toca las MACs</strong>.',
  },
  {
    fromX: XSW, toX: XRA, layers: ['tcp', 'ip', 'eth'], ethText: ETH_A, ipText: IP1,
    highlight: { device: 'ra', layers: ['Enlace'] },
    msg: 'La <strong>TRAMA</strong> llega al <strong>router A</strong> (el gateway de la red de A). Su <strong>capa de enlace</strong> verifica el <strong>CRC ✔</strong> y ve que la <strong>MAC destino es la suya</strong>: saca el header de enlace y sube el datagrama.',
  },
  {
    fromX: XRA, toX: XRA, layers: ['tcp', 'ip'], ipText: IP2,
    highlight: { device: 'ra', layers: ['Red'] },
    msg: 'La <strong>capa de red</strong> de router A abre el <strong>DATAGRAMA</strong>: hace el <strong>lookup por LPM</strong> en su tabla de reenvío, <strong>decrementa el TTL (64 → 63)</strong> y recalcula el checksum. La <strong>IP destino NO cambia</strong> — el router es solo un salto.',
  },
  {
    fromX: XRA, toX: XRA, layers: ['tcp', 'ip', 'eth'], appear: 'eth', ethText: ETH_WAN, ipText: IP2,
    highlight: { device: 'ra', layers: ['Enlace'] },
    msg: 'Baja de nuevo a <strong>enlace</strong>, que arma una <strong>TRAMA NUEVA</strong> para el próximo salto: <strong>MACs nuevas</strong> (router A → router B) y un <strong>CRC nuevo</strong>, pero el <strong>MISMO datagrama</strong>. La MAC se reescribe en cada salto; la IP, nunca.',
  },
  {
    fromX: XRA, toX: XRB, layers: ['tcp', 'ip', 'eth'], ethText: ETH_WAN, ipText: IP2,
    highlight: { device: 'rb', layers: ['Enlace'] },
    msg: 'La trama <strong>cruza a la otra red</strong> por el enlace entre routers y llega al <strong>router B</strong> (el gateway de la red de B). Su <strong>capa de enlace</strong> verifica el <strong>CRC ✔</strong>: la MAC destino es la suya, saca el header y sube el datagrama.',
  },
  {
    fromX: XRB, toX: XRB, layers: ['tcp', 'ip'], ipText: IP3,
    highlight: { device: 'rb', layers: ['Red'] },
    msg: 'La <strong>capa de red</strong> de router B abre el <strong>DATAGRAMA</strong>: otro <strong>lookup por LPM</strong> y <strong>decrementa el TTL de nuevo (63 → 62)</strong> — cada router que atraviesa lo baja en 1. La IP destino sigue intacta.',
  },
  {
    fromX: XRB, toX: XRB, layers: ['tcp', 'ip', 'eth'], appear: 'eth', ethText: ETH_B, ipText: IP3,
    highlight: { device: 'rb', layers: ['Enlace'] },
    msg: 'Router B baja a <strong>enlace</strong> y arma la <strong>TRAMA NUEVA</strong> del último tramo: <strong>MACs del enlace local de B</strong> (router B → B) y un <strong>CRC nuevo</strong>. El datagrama, otra vez, no se toca.',
  },
  {
    fromX: XRB, toX: XB, layers: ['tcp', 'ip', 'eth'], ethText: ETH_B, ipText: IP3,
    highlight: { device: 'b', layers: ['Enlace'] },
    msg: 'La trama llega al <strong>Host B</strong>. Su <strong>capa de enlace</strong> verifica el <strong>CRC ✔</strong> (si estuviera mal, la descarta en silencio). Como la MAC destino es la suya, saca el header y sube el datagrama.',
  },
  {
    fromX: XB, toX: XB, layers: ['tcp', 'ip'], ipText: IP3,
    highlight: { device: 'b', layers: ['Red'] },
    msg: '<strong>Red</strong> de B: abre el <strong>DATAGRAMA</strong>, la IP destino <strong>es la mía ✔</strong>. El campo <em>protocol=6</em> le dice que arriba espera TCP → sube el segmento a transporte.',
  },
  {
    fromX: XB, toX: XB, layers: ['tcp'],
    highlight: { device: 'b', layers: ['Transporte'] },
    msg: '<strong>Transporte</strong> de B: recibe el <strong>SEGMENTO</strong>, verifica el checksum ✔ y mira el <strong>puerto destino 80</strong> → sabe a qué proceso (el servidor web) entregarlo.',
  },
  {
    fromX: XB, toX: XB, layers: [], disappear: 'tcp', deliver: true,
    highlight: { device: 'b', layers: ['Aplicación'] },
    msg: '<strong>Aplicación</strong> de B: el servidor web recibe el <strong>MENSAJE</strong> (GET /index.html) en su socket. <strong>Desencapsulado completo</strong>: cada capa quitó exactamente lo que su par había puesto.',
  },
];

interface Device {
  id: DeviceId;
  x: number;
  name: string;
  color: string;
  layers: string[];
}

const DEVICES: Device[] = [
  { id: 'a', x: XA, name: 'Host A', color: '#4caf50', layers: ['Aplicación', 'Transporte', 'Red', 'Enlace'] },
  { id: 'sw', x: XSW, name: 'Switch', color: '#607d8b', layers: ['Enlace'] },
  { id: 'ra', x: XRA, name: 'Router A', color: '#f68c1f', layers: ['Red', 'Enlace'] },
  { id: 'rb', x: XRB, name: 'Router B', color: '#f68c1f', layers: ['Red', 'Enlace'] },
  { id: 'b', x: XB, name: 'Host B', color: '#1976d2', layers: ['Aplicación', 'Transporte', 'Red', 'Enlace'] },
];

@Component({
  selector: 'app-encap-anim',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📦 Encapsulamiento: el viaje completo, capa por capa</div>
          <div class="caption">Mensaje → segmento → datagrama → trama. Cada dispositivo abre SOLO las capas que le tocan.</div>
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

      <div class="canvas">
        <!-- paquete anidado -->
        @if (index() >= 0 && !finished()) {
          <div class="pkt" [style.left.%]="pktX()">
            <div class="wrap eth" [class.on]="wrapOn('eth')">
              <div class="whead">{{ curEthText() }}</div>
              <div class="wrap ip" [class.on]="wrapOn('ip')">
                <div class="whead">{{ curIpText() }}</div>
                <div class="wrap tcp" [class.on]="wrapOn('tcp')">
                  <div class="whead">TCP · src 49152 → dst 80</div>
                  <div class="msgcard" [class.pulse]="delivering()">GET /index.html</div>
                </div>
              </div>
              <div class="wfoot">CRC</div>
            </div>
            <div class="pkt-tag">{{ pktName() }}</div>
          </div>
        }

        <!-- separador entre las dos redes: A + switch + router A | router B + host B -->
        <div class="netdiv"></div>
        <div class="netlabel left">🏠 Red de A · local</div>
        <div class="netlabel right">🌐 Red de B · remota</div>

        <!-- línea de la red (medio físico, a la altura de las pilas) -->
        <div class="wire"></div>

        <!-- dispositivos con sus pilas -->
        @for (d of devices; track d.id) {
          <div class="device" [style.left.%]="d.x">
            <div class="dstack">
              @for (l of d.layers; track l) {
                <div class="dlayer" [class.hot]="layerHot(d.id, l)" [style.--dc]="d.color">{{ l }}</div>
              }
            </div>
            <div class="dname" [style.background]="d.color">{{ d.name }}</div>
          </div>
        }
      </div>

      <!-- panel de direcciones: cómo cambian MAC / IP / puerto en el viaje -->
      <div class="headers">
        <div class="hcap">Direcciones en este tramo</div>
        <div class="hrow eth" [class.dim]="!wrapOn('eth')" [class.flash]="hdr().macChanged && wrapOn('eth')">
          <span class="hlbl">Enlace · MAC</span>
          <span class="hval">{{ hdr().macSrc }} <span class="ar">→</span> {{ hdr().macDst }}</span>
          <span class="htag">{{ hdr().macChanged ? '🔄 reescrita en el router' : 'solo este enlace' }}</span>
        </div>
        <div class="hrow ip" [class.dim]="!wrapOn('ip')">
          <span class="hlbl">Red · IP</span>
          <span class="hval">{{ hdr().ipSrc }} <span class="ar">→</span> {{ hdr().ipDst }}</span>
          <span class="htag">extremo a extremo · TTL {{ hdr().ttl }}</span>
        </div>
        <div class="hrow tcp" [class.dim]="!wrapOn('tcp')">
          <span class="hlbl">Transporte · Puerto</span>
          <span class="hval">{{ hdr().portSrc }} <span class="ar">→</span> {{ hdr().portDst }}</span>
          <span class="htag">extremo a extremo</span>
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

    .canvas {
      position: relative; min-height: 400px;
      background: radial-gradient(ellipse at 50% 60%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
      padding-bottom: 8px;
    }
    .wire { position: absolute; left: 4%; right: 4%; bottom: 135px; border-top: 2px dashed #39445f; z-index: 0; }
    .netdiv { position: absolute; left: 53.5%; top: 24px; bottom: 44px; border-left: 2px dashed #4a5578; z-index: 1; }
    .netlabel { position: absolute; top: 8px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.3px; color: #c3ccea; background: rgba(35, 43, 66, 0.85); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; z-index: 4; }
    .netlabel.left { left: 4%; }
    .netlabel.right { right: 4%; }

    .pkt { position: absolute; top: 18px; transform: translateX(-50%); z-index: 3; width: 252px; }
    .pkt-tag { text-align: center; margin-top: 6px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.6px; color: #8b95b5; text-transform: uppercase; }

    .wrap { border-radius: 9px; transition: padding 0.4s, border-color 0.4s, background 0.4s, margin 0.4s; border: 2px solid transparent; }
    .wrap .whead {
      max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.4s, opacity 0.4s, margin 0.4s;
      font-family: Consolas, monospace; font-size: 0.66rem; font-weight: 700; white-space: nowrap;
    }
    .wrap .wfoot {
      max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.4s, opacity 0.4s;
      font-family: Consolas, monospace; font-size: 0.6rem; font-weight: 700; text-align: right;
    }
    .wrap.on { padding: 5px 7px; }
    .wrap.on > .whead { max-height: 18px; opacity: 1; margin-bottom: 4px; }
    .wrap.on > .wfoot { max-height: 16px; opacity: 1; margin-top: 3px; }

    .wrap.eth.on { border-color: #a78bfa; background: rgba(167, 139, 250, 0.1); }
    .wrap.eth > .whead, .wrap.eth > .wfoot { color: #d2b9ff; }
    .wrap.ip.on { border-color: #58a6ff; background: rgba(88, 166, 255, 0.1); }
    .wrap.ip > .whead { color: #79c0ff; }
    .wrap.tcp.on { border-color: #f0a83b; background: rgba(240, 168, 59, 0.1); }
    .wrap.tcp > .whead { color: #ffd54f; }

    .msgcard {
      background: #1d3b26; border: 2px solid #2ea043; border-radius: 8px;
      color: #7ee787; font-family: Consolas, monospace; font-size: 0.74rem; font-weight: 700;
      padding: 7px 10px; text-align: center;
    }
    .msgcard.pulse { animation: pulse 0.9s ease-in-out infinite; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 4px rgba(126, 231, 135, 0.3); }
      50% { box-shadow: 0 0 22px rgba(126, 231, 135, 0.9); }
    }

    .device { position: absolute; bottom: 12px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 5px; z-index: 2; }
    .dstack { display: flex; flex-direction: column; gap: 2px; width: 110px; }
    .dlayer {
      background: #1a2132; border: 1px solid #2d3750; border-radius: 5px;
      color: #5c6a8e; font-size: 0.64rem; font-weight: 600; text-align: center; padding: 2.5px 0;
      transition: background 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s;
    }
    .dlayer.hot { background: var(--dc); border-color: #fff; color: #fff; font-weight: 800; box-shadow: 0 0 10px var(--dc); }
    .dname { color: #fff; font-size: 0.76rem; font-weight: 700; padding: 4px 14px; border-radius: 7px; }

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

    .headers { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
    .hcap { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #8b95b5; margin-bottom: 2px; }
    .hrow { display: grid; grid-template-columns: 148px 1fr auto; align-items: center; gap: 10px; padding: 5px 9px; border-radius: 7px; border: 1px solid transparent; font-size: 0.8rem; transition: opacity 0.3s, border-color 0.3s, background 0.3s; }
    .hrow.dim { opacity: 0.3; }
    .hlbl { font-weight: 700; font-size: 0.72rem; }
    .hval { font-family: Consolas, monospace; font-weight: 700; color: var(--text); }
    .hval .ar { color: #8b95b5; margin: 0 5px; }
    .htag { font-size: 0.68rem; color: var(--text-dim); white-space: nowrap; }
    .hrow.eth { border-color: #a78bfa33; } .hrow.eth .hlbl { color: #d2b9ff; }
    .hrow.ip { border-color: #58a6ff33; } .hrow.ip .hlbl { color: #79c0ff; }
    .hrow.tcp { border-color: #f0a83b33; } .hrow.tcp .hlbl { color: #ffd54f; }
    .hrow.flash { border-color: #f0a83b; background: rgba(240, 168, 59, 0.15); animation: hflash 0.9s ease-in-out infinite; }
    @keyframes hflash {
      0%, 100% { box-shadow: 0 0 3px rgba(240, 168, 59, 0.3); }
      50% { box-shadow: 0 0 16px rgba(240, 168, 59, 0.85); }
    }
    @media (max-width: 620px) {
      .hrow { grid-template-columns: 1fr; gap: 2px; }
      .htag { white-space: normal; }
    }
  `,
})
export class EncapAnim extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly devices = DEVICES;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    const s = STEPS[i];
    return s.fromX === s.toX ? 500 : 1600;
  }
  protected override stepDwell(i: number): number {
    return STEPS[i].highlight ? 3400 : 1700;
  }

  readonly pktX = computed(() => {
    const i = this.index();
    if (i < 0) return XA;
    const s = STEPS[i];
    const p = this.ease(this.progress());
    return s.fromX + (s.toX - s.fromX) * p;
  });

  /** un wrapper se ve si está en la lista del paso; appear/disappear se animan a mitad del paso */
  wrapOn(w: Wrapper): boolean {
    const i = this.index();
    if (i < 0) return false;
    const s = STEPS[i];
    const mid = this.progress() >= 1;
    if (s.appear === w) return mid;
    if (s.disappear === w) return !mid;
    return s.layers.includes(w);
  }

  curEthText(): string {
    const i = this.index();
    return i >= 0 ? (STEPS[i].ethText ?? ETH_A) : ETH_A;
  }
  curIpText(): string {
    const i = this.index();
    return i >= 0 ? (STEPS[i].ipText ?? IP1) : IP1;
  }

  /** estado de las cabeceras (direcciones) según el tramo del viaje */
  readonly hdr = computed(() => {
    const i = this.index();
    // 3 tramos de enlace: A→routerA, routerA→routerB, routerB→B
    const seg = i >= 10 ? 3 : i >= 7 ? 2 : 1;
    return {
      macSrc: seg === 3 ? MAC_RB_LAN : seg === 2 ? MAC_RA_WAN : MAC_A,
      macDst: seg === 3 ? MAC_B : seg === 2 ? MAC_RB_WAN : MAC_RA_LAN,
      ipSrc: IP_SRC,
      ipDst: IP_DST,
      ttl: i >= 9 ? 62 : i >= 6 ? 63 : 64,
      portSrc: PORT_SRC,
      portDst: PORT_DST,
      macChanged: i === 7 || i === 10,
    };
  });

  readonly delivering = computed(() => {
    const i = this.index();
    return i >= 0 && !!STEPS[i].deliver && this.progress() >= 1;
  });

  pktName(): string {
    if (this.wrapOn('eth')) return 'trama';
    if (this.wrapOn('ip')) return 'datagrama';
    if (this.wrapOn('tcp')) return 'segmento';
    return 'mensaje';
  }

  layerHot(device: string, layer: string): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const h = STEPS[i].highlight;
    if (!h || h.device !== device) return false;
    return h.layers.includes(layer) && this.progress() >= 1;
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>La regla de oro</strong>: los hosts implementan las <strong>4 capas del modelo TCP/IP</strong>; los routers procesan hasta la <strong>capa de red</strong> (necesitan la IP para rutear); los switches hasta la <strong>capa de enlace</strong> (solo miran MACs). Y fijate en el panel: <strong>la IP y los puertos son extremo a extremo</strong> (no cambian nunca), pero <strong>la MAC se reescribe en cada salto</strong>. Los nombres se preguntan: <strong>mensaje → segmento → datagrama → trama</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y mirá cómo el paquete se "viste" al bajar por la pila y se "desviste" al subir — y qué capas prende cada dispositivo.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
