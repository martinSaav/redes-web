import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface Chip {
  text: string;
  kind: 'ip' | 'esp' | 'enc' | 'data' | 'auth';
}

interface IStep {
  from: Pos;
  to: Pos;
  chips: Chip[];
  msg: string;
  static?: boolean;
  saFlash?: boolean;
}

const A: Pos = { x: 9, y: 30 };
const GW1: Pos = { x: 30, y: 58 };
const GW2: Pos = { x: 70, y: 58 };
const B: Pos = { x: 91, y: 30 };

const CLEAR: Chip[] = [
  { text: 'IP 10.1.0.5 → 10.2.0.9', kind: 'ip' },
  { text: 'TCP + datos', kind: 'data' },
];

const TUNNELED: Chip[] = [
  { text: 'IP 200.1.1.1 → 200.2.2.2', kind: 'ip' },
  { text: 'ESP · SPI 0x1A2B', kind: 'esp' },
  { text: '🔒 IP 10.1.0.5→10.2.0.9 + TCP + datos', kind: 'enc' },
  { text: 'auth', kind: 'auth' },
];

const TRANSPORTED: Chip[] = [
  { text: 'IP 10.1.0.5 → 10.2.0.9', kind: 'ip' },
  { text: 'ESP · SPI 0x77F0', kind: 'esp' },
  { text: '🔒 TCP + datos', kind: 'enc' },
  { text: 'auth', kind: 'auth' },
];

const TUNNEL_STEPS: IStep[] = [
  {
    from: A, to: A, chips: [], static: true,
    msg: 'Dos sedes con rangos <strong>privados</strong> (10.1/16 y 10.2/16) unidas por Internet. Antes de cualquier dato, <strong>IKE</strong> negoció entre los gateways una <strong>SA</strong> (Security Association): un "contrato" <strong>UNIDIRECCIONAL</strong> con claves y algoritmos, identificado por su <strong>SPI</strong> (tabla →).',
  },
  {
    from: A, to: GW1, chips: CLEAR,
    msg: 'El host A manda un datagrama común hacia 10.2.0.9. <strong>Dentro de la sede viaja EN CLARO</strong> — la confianza es interna; A ni sabe que existe IPsec.',
  },
  {
    from: GW1, to: GW1, chips: TUNNELED, static: true, saFlash: true,
    msg: 'El gateway <strong>encapsula (modo TÚNEL)</strong>: el datagrama ORIGINAL <strong>ENTERO</strong> queda cifrado y autenticado, y se le antepone un header <strong>IP NUEVO</strong> (gateway → gateway) + el header <strong>ESP</strong> con el SPI. Las IPs internas <strong>desaparecieron de la vista</strong>.',
  },
  {
    from: GW1, to: GW2, chips: TUNNELED,
    msg: 'Cruza Internet: un sniffer en el medio solo ve <strong>200.1.1.1 → 200.2.2.2</strong> y bytes opacos. Ni quién habla adentro, ni qué dicen. Eso ES la VPN.',
  },
  {
    from: GW2, to: GW2, chips: CLEAR, static: true, saFlash: true,
    msg: 'El gateway destino busca el <strong>SPI 0x1A2B</strong> en su base de SAs → obtiene algoritmos y claves; <strong>verifica la integridad</strong> (ESP la incluye), <strong>descifra</strong> y desencapsula: reaparece el datagrama original.',
  },
  {
    from: GW2, to: B, chips: CLEAR,
    msg: 'Y el original sigue en claro hasta el host B, que tampoco se enteró de nada. IPsec fue <strong>transparente para los extremos</strong>.',
  },
];

const TRANSPORT_STEPS: IStep[] = [
  {
    from: A, to: A, chips: [], static: true,
    msg: 'Modo <strong>TRANSPORTE</strong>: la SA es <strong>host-a-host</strong> (A ↔ B directamente, sin gateways en el medio del juego). Típico para proteger un flujo puntual entre dos máquinas.',
  },
  {
    from: A, to: A, chips: TRANSPORTED, static: true, saFlash: true,
    msg: 'A encapsula: se cifra <strong>SOLO el payload</strong> (TCP + datos) y se inserta el header ESP. El <strong>header IP ORIGINAL queda visible</strong> — hace falta para rutear hasta B.',
  },
  {
    from: A, to: B, chips: TRANSPORTED,
    msg: 'En tránsito, cualquiera puede ver <strong>QUIÉNES hablan</strong> (10.1.0.5 → 10.2.0.9: los extremos reales)… pero no <strong>QUÉ dicen</strong>. Menos privacidad de metadatos que el túnel, menos overhead.',
  },
  {
    from: B, to: B, chips: CLEAR, static: true, saFlash: true,
    msg: 'B busca el SPI, verifica integridad y descifra. Fin: en transporte los <strong>hosts hacen el trabajo</strong>; en túnel lo hacen los <strong>gateways</strong> y los hosts ni se enteran.',
  },
];

@Component({
  selector: 'app-ipsec-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🛡 IPsec: modo túnel (VPN) vs modo transporte</div>
          <div class="caption">Qué parte del datagrama se cifra, qué queda visible, y quién hace el trabajo.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'tunnel'" (click)="setMode('tunnel')">🚇 Túnel (VPN)</button>
            <button [class.on]="mode() === 'transport'" (click)="setMode('transport')">📦 Transporte</button>
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
          <div class="zone z1">🏢 sede 1 · 10.1.0.0/16</div>
          <div class="zone z2">🏢 sede 2 · 10.2.0.0/16</div>
          <div class="zone net">☁ Internet (hostil)</div>

          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="a.x" [attr.y1]="a.y" [attr.x2]="gw1.x" [attr.y2]="gw1.y" />
            <line class="inet" [attr.x1]="gw1.x" [attr.y1]="gw1.y" [attr.x2]="gw2.x" [attr.y2]="gw2.y" [class.tun]="mode() === 'tunnel'" />
            <line [attr.x1]="gw2.x" [attr.y1]="gw2.y" [attr.x2]="b.x" [attr.y2]="b.y" />
          </svg>

          <div class="node hostn" [class.active]="activeN(a)" [style.left.%]="a.x" [style.top.%]="a.y">
            <strong>💻 Host A</strong><small>10.1.0.5</small>
          </div>
          <div class="node gwn" [class.dim]="mode() === 'transport'" [class.active]="activeN(gw1)" [style.left.%]="gw1.x" [style.top.%]="gw1.y">
            <strong>🛡 GW 1</strong><small>200.1.1.1</small>
          </div>
          <div class="node gwn" [class.dim]="mode() === 'transport'" [class.active]="activeN(gw2)" [style.left.%]="gw2.x" [style.top.%]="gw2.y">
            <strong>🛡 GW 2</strong><small>200.2.2.2</small>
          </div>
          <div class="node hostn" [class.active]="activeN(b)" [style.left.%]="b.x" [style.top.%]="b.y">
            <strong>💻 Host B</strong><small>10.2.0.9</small>
          </div>

          @if (pkt(); as p) {
            <div class="pkt" [style.left.%]="p.x" [style.top.%]="p.y">
              @for (ch of p.chips; track $index) {
                <span class="chip" [class]="ch.kind">{{ ch.text }}</span>
              }
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">📄 SA en el {{ mode() === 'tunnel' ? 'gateway' : 'host' }} (negociada por IKE)</div>
          <div class="sarow" [class.flash]="saFlash()">
            <span class="sk">SPI</span><span class="sv">{{ mode() === 'tunnel' ? '0x1A2B' : '0x77F0' }}</span>
            <span class="sk">destino</span><span class="sv">{{ mode() === 'tunnel' ? '200.2.2.2' : '10.2.0.9' }}</span>
            <span class="sk">protocolo</span><span class="sv">ESP</span>
            <span class="sk">cifrado</span><span class="sv">AES-CBC</span>
            <span class="sk">integridad</span><span class="sv">HMAC-SHA</span>
            <span class="sk">sentido</span><span class="sv">unidireccional →</span>
          </div>
          <div class="notes">
            <div class="nline"><b class="g">ESP</b> = integridad + confidencialidad (lo usual)</div>
            <div class="nline"><b class="o">AH</b> = solo integridad/autenticación, sin cifrar</div>
            <div class="nline"><b class="p">IKE</b> = negocia SAs y claves (el "handshake" de IPsec)</div>
            <div class="nline dim">para el tráfico de vuelta hace falta OTRA SA (son unidireccionales)</div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 0.82rem; }
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
      position: relative; flex: 1; min-height: 300px;
      background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .zone { position: absolute; top: 8px; font-size: 0.64rem; font-weight: 700; padding: 2px 10px; border-radius: 10px; z-index: 1; }
    .zone.z1 { left: 10px; color: #7ee787; background: rgba(46,160,67,0.12); border: 1px solid #2ea04355; }
    .zone.z2 { right: 10px; color: #7ee787; background: rgba(46,160,67,0.12); border: 1px solid #2ea04355; }
    .zone.net { left: 50%; transform: translateX(-50%); top: auto; bottom: 8px; color: #ef9a9a; background: rgba(178,59,59,0.1); border: 1px solid #b23b3b55; }

    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.7; vector-effect: non-scaling-stroke; }
    .wires line.inet.tun { stroke: #7ee787; stroke-width: 2.4; opacity: 0.5; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 84px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: box-shadow 0.25s, border-color 0.25s, opacity 0.3s;
    }
    .node strong { font-size: 0.78rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255,255,255,0.85); font-family: Consolas, monospace; }
    .node.hostn { background: #2e7d32; }
    .node.gwn { background: #b45309; }
    .node.gwn.dim { opacity: 0.4; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.35); }

    .pkt {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      display: flex; gap: 0; border-radius: 8px; overflow: hidden;
      box-shadow: 0 0 16px rgba(0,0,0,0.5); border: 1.5px solid #4a5878;
    }
    .chip { font-family: Consolas, monospace; font-size: 0.6rem; font-weight: 700; padding: 5px 7px; white-space: nowrap; }
    .chip.ip { background: #14335c; color: #79c0ff; }
    .chip.esp { background: #4a2f7d; color: #d2b9ff; }
    .chip.enc { background: repeating-linear-gradient(45deg, #1a2132 0 5px, #232b3e 5px 10px); color: #8b95b5; }
    .chip.data { background: #1d3b26; color: #7ee787; }
    .chip.auth { background: #4a3a12; color: #ffd54f; }

    .table { width: 300px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.8rem; margin-bottom: 8px; color: #7ee787; }
    .sarow { display: grid; grid-template-columns: 0.9fr 1.2fr; gap: 3px 8px; font-family: Consolas, monospace; font-size: 0.66rem; background: #1a2132; border: 1px solid #2d3750; border-radius: 8px; padding: 8px 10px; transition: border-color 0.3s, box-shadow 0.3s; }
    .sarow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126,231,135,0.3); }
    .sk { color: #5c6a8e; text-transform: uppercase; font-size: 0.56rem; align-self: center; }
    .sv { color: #cfe3ff; }
    .notes { margin-top: 10px; }
    .nline { font-size: 0.68rem; color: var(--text); line-height: 1.65; }
    .nline.dim { color: #5c6a8e; font-style: italic; }
    .nline b.g { color: #7ee787; } .nline b.o { color: #ffb74d; } .nline b.p { color: #ce93d8; }

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
export class IpsecDetail extends SteppedAnim implements OnDestroy {
  readonly a = A;
  readonly gw1 = GW1;
  readonly gw2 = GW2;
  readonly b = B;

  readonly mode = signal<'tunnel' | 'transport'>('tunnel');
  readonly steps = computed(() => (this.mode() === 'tunnel' ? TUNNEL_STEPS : TRANSPORT_STEPS));

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1500;
  }
  protected override stepDwell(): number {
    return 3500;
  }

  setMode(m: 'tunnel' | 'transport'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly pkt = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = this.steps()[i];
    if (s.chips.length === 0) return null;
    const p = this.ease(this.progress());
    return {
      chips: s.chips,
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p - 14,
    };
  });

  readonly saFlash = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!this.steps()[i].saFlash && this.progress() >= 1;
  });

  activeN(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = this.steps()[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'tunnel'
        ? '<strong>Modo túnel</strong> = el caso VPN: datagrama ENTERO cifrado + header nuevo gateway→gateway; oculta hasta las IPs internas y los hosts ni se enteran. Compará con "📦 Transporte" para ver la diferencia exacta.'
        : '<strong>Modo transporte</strong>: solo el payload cifrado, header original visible, trabajo en los hosts. Regla mnemotécnica: <strong>túnel = gateways + todo adentro; transporte = hosts + solo el contenido</strong>.';
    }
    const i = this.index();
    if (i < 0)
      return 'Presioná ▶ Play y mirá los "chips" del datagrama: qué headers se agregan y qué parte queda rayada (cifrada).';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
