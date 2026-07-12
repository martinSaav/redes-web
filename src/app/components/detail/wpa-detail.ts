import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface WStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  keys?: number; // filas visibles del panel al completar
  secure?: boolean;
}

const CLI: Pos = { x: 15, y: 52 };
const AP: Pos = { x: 85, y: 52 };

const STEPS: WStep[] = [
  {
    from: CLI, to: CLI, text: '📶 asociado — pero nada cifrado aún', static: true, keys: 1,
    msg: 'El cliente ya se asoció al AP (beacons → probe → associate). Ambos tienen la <strong>PMK</strong> (clave maestra): derivada de la <strong>passphrase</strong> en WPA-Personal, o entregada tras la autenticación <strong>EAP contra un servidor AS</strong> en WPA-Enterprise. La PMK <strong>nunca viaja</strong> — y todavía no hay NADA cifrado.',
  },
  {
    from: AP, to: CLI, text: 'msg 1 · ANonce', keys: 2,
    msg: '<strong>Mensaje 1</strong>: el AP manda su <strong>ANonce</strong> (número de un solo uso), en claro — un nonce no es secreto, es <em>frescura</em>: garantiza que esta sesión no reusa material viejo.',
  },
  {
    from: CLI, to: CLI, text: '🔑 derivando PTK…', static: true, keys: 4,
    msg: 'El cliente genera su <strong>SNonce</strong> y ya puede derivar la <strong>PTK</strong> (Pairwise Transient Key) = f(<strong>PMK</strong>, ANonce, SNonce, MAC<sub>AP</sub>, MAC<sub>cli</sub>). Clave de sesión FRESCA por los dos nonces.',
  },
  {
    from: CLI, to: AP, text: 'msg 2 · SNonce + MIC', color: '#ce93d8', keys: 4,
    msg: '<strong>Mensaje 2</strong>: manda el SNonce + un <strong>MIC</strong> (integridad, calculado con la PTK). El MIC <strong>prueba que tiene la PMK sin mandarla</strong>: solo quien conoce la passphrase pudo calcularlo.',
  },
  {
    from: AP, to: AP, text: '🔍 verifica MIC ✔', static: true, keys: 5,
    msg: 'El AP ya tiene los dos nonces → deriva la <strong>MISMA PTK</strong> y verifica el MIC: ✔ el cliente es auténtico (autenticación MUTUA: el msg 3 le probará al cliente que el AP también tiene la PMK).',
  },
  {
    from: AP, to: CLI, text: 'msg 3 · GTK 🔒 + install', color: '#7ee787', keys: 6,
    msg: '<strong>Mensaje 3</strong>: el AP manda la <strong>GTK</strong> (Group Temporal Key, para el tráfico broadcast/multicast de la celda) <strong>cifrada con la PTK</strong>, y la orden de instalar las claves.',
  },
  {
    from: CLI, to: AP, text: 'msg 4 · ACK ✔', color: '#7ee787', keys: 6,
    msg: '<strong>Mensaje 4</strong>: confirmación. Ambos <strong>instalan</strong> PTK (unicast) y GTK (grupo). Four-way handshake completo.',
  },
  {
    from: CLI, to: AP, text: '📦 datos cifrados (AES-CCMP) 🔒', color: '#80d8ff', keys: 6, secure: true,
    msg: 'Recién AHORA empieza el tráfico cifrado (AES-CCMP). Cada trama lleva su contador de nonce: <strong>nunca se debe reusar un nonce con la misma clave</strong>… guardá esa frase para el final.',
  },
];

interface KeyRow {
  k: string;
  v: string;
  kind: 'pmk' | 'nonce' | 'ptk' | 'gtk';
}

const KEY_ROWS: KeyRow[] = [
  { k: 'PMK', v: 'de la passphrase / EAP', kind: 'pmk' },
  { k: 'ANonce', v: 'del AP · en claro', kind: 'nonce' },
  { k: 'SNonce', v: 'del cliente', kind: 'nonce' },
  { k: 'PTK (cliente)', v: 'f(PMK, nonces, MACs)', kind: 'ptk' },
  { k: 'PTK (AP)', v: 'la misma — MIC ✔', kind: 'ptk' },
  { k: 'GTK', v: 'clave de grupo (broadcast)', kind: 'gtk' },
];

@Component({
  selector: 'app-wpa-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔐 WPA2: el four-way handshake, clave por clave</div>
          <div class="caption">De la PMK compartida a las claves de sesión — sin que la clave maestra viaje jamás.</div>
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
            <line [attr.x1]="cli.x" [attr.y1]="cli.y" [attr.x2]="ap.x" [attr.y2]="ap.y" [class.sec]="secure()" />
          </svg>

          @if (secure()) {
            <div class="secband" [style.left.%]="50" [style.top.%]="cli.y - 12">🔒 canal cifrado AES-CCMP</div>
          }

          <div class="node clin" [class.active]="activeN(cli)" [style.left.%]="cli.x" [style.top.%]="cli.y">
            <strong>📱 Cliente</strong><small>conoce la passphrase → PMK</small>
          </div>
          <div class="node apn" [class.active]="activeN(ap)" [style.left.%]="ap.x" [style.top.%]="ap.y">
            <strong>📡 Access Point</strong><small>PMK + emite la GTK del grupo</small>
          </div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 12px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">🔑 Material de claves</div>
          @for (r of keyRows(); track r.k) {
            <div class="trow" [class.flash]="r.flash" [class]="r.kind">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </div>
          }
          <div class="tfoot">
            la PMK es de LARGO PLAZO; PTK y GTK son <b>temporales</b> y frescas por los nonces —
            por eso reinstalar claves (KRACK) era tan grave
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
      position: relative; flex: 1; min-height: 250px;
      background: radial-gradient(ellipse at 50% 55%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.7; stroke-dasharray: 1.5 1.5; vector-effect: non-scaling-stroke; transition: stroke 0.3s; }
    .wires line.sec { stroke: #2ea043; stroke-dasharray: none; stroke-width: 1.4; }
    .secband {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      font-size: 0.64rem; font-weight: 800; color: #7ee787;
      background: rgba(16,40,22,0.95); border: 1px solid #2ea043; border-radius: 8px; padding: 2px 10px; white-space: nowrap;
    }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 130px; max-width: 190px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.82rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255,255,255,0.85); }
    .node.clin { background: #2e7d32; }
    .node.apn { background: #f68c1f; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.35); }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 4;
      background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0; white-space: nowrap;
    }

    .table { width: 280px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.84rem; margin-bottom: 8px; color: #ce93d8; }
    .trow { display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 5px 8px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; align-items: center; }
    .trow .k { font-weight: 700; }
    .trow .v { color: var(--text); }
    .trow.pmk .k { color: #ffd54f; }
    .trow.nonce .k { color: #79c0ff; }
    .trow.ptk .k { color: #7ee787; }
    .trow.gtk .k { color: #ce93d8; }
    .trow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126,231,135,0.3); }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.6rem; font-style: italic; padding-top: 8px; line-height: 1.55; }
    .tfoot b { color: #8b95b5; }

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
export class WpaDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly cli = CLI;
  readonly ap = AP;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(): number {
    return 3400;
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

  private keysVisible = computed(() => {
    if (this.finished()) return KEY_ROWS.length;
    const i = this.index();
    if (i < 0) return 0;
    if (this.progress() >= 1) return STEPS[i].keys ?? 0;
    return i > 0 ? (STEPS[i - 1].keys ?? 0) : 0;
  });

  readonly keyRows = computed(() => {
    const n = this.keysVisible();
    const i = this.index();
    const prev = i > 0 ? (STEPS[i - 1].keys ?? 0) : 0;
    const justAdded = !this.finished() && i >= 0 && this.progress() >= 1 && (STEPS[i].keys ?? 0) > prev;
    return KEY_ROWS.slice(0, n).map((r, idx) => ({ ...r, flash: justAdded && idx >= prev }));
  });

  readonly secure = computed(() => {
    const i = this.index();
    if (this.finished()) return true;
    if (i < 0) return false;
    return !!STEPS[i].secure;
  });

  activeN(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>KRACK (2017)</strong>: un atacante retransmitía el <strong>msg 3</strong> y forzaba al cliente a <strong>REINSTALAR la clave</strong>, reseteando el contador de nonces → <strong>reuso de nonce con la misma clave</strong> (el pecado que ya había matado a WEP). <strong>WPA3</strong> responde con SAE (handshake resistente a diccionario) y claves más largas.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Las 4 fases de 802.11i: descubrimiento → autenticación/PMK → este four-way handshake → tráfico cifrado.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
