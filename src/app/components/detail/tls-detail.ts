import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface TlsStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  keys?: number; // cuántas filas del panel de claves quedan visibles al completar el paso
  caCheck?: boolean; // la CA se ilumina (verificación de cadena)
}

const CLI: Pos = { x: 13, y: 62 };
const SRV: Pos = { x: 87, y: 62 };
const CA: Pos = { x: 50, y: 14 };

const STEPS: TlsStep[] = [
  {
    from: CLI, to: CLI, text: '🔐 quiero HTTPS con el server', static: true, keys: 0,
    msg: 'Ya hay conexión TCP. Objetivo: un canal con <strong>confidencialidad + integridad + autenticación</strong>. El plan: autenticar al server con su certificado y acordar claves simétricas de sesión (híbrido: la asimétrica solo para el arranque).',
  },
  {
    from: CLI, to: SRV, text: 'ClientHello · versiones + suites + nonce_C', keys: 1,
    msg: '1. <strong>Client Hello</strong>: versiones TLS soportadas, cipher suites, y un <strong>nonce de cliente</strong> (número de un solo uso — mirá el panel: primera pieza del material criptográfico).',
  },
  {
    from: SRV, to: CLI, text: 'ServerHello · cert 📜 + nonce_S', color: '#80d8ff', keys: 2,
    msg: '2. <strong>Server Hello</strong>: la suite elegida + su <strong>certificado X.509</strong> (identidad + clave pública, firmados por una CA) + el <strong>nonce de server</strong>.',
  },
  {
    from: CLI, to: CLI, text: '🔍 verificando certificado…', static: true, keys: 2, caCheck: true,
    msg: '3. El cliente <strong>valida la cadena de firmas</strong> hasta una CA raíz de su trust store (mirá la CA iluminada). Sin este paso, cualquiera podría meterse en el medio con una clave propia — es lo que frena el <strong>MITM</strong>.',
  },
  {
    from: CLI, to: SRV, text: 'PMS cifrado con K_pública del server 🔒', color: '#ce93d8', keys: 3,
    msg: '4. El cliente genera el <strong>Pre-Master Secret</strong> y lo manda cifrado con la <strong>clave pública del server</strong>: solo él, con su privada, puede descifrarlo. Trudy en el medio solo ve ruido.',
  },
  {
    from: SRV, to: SRV, text: '🔑 derivando claves…', static: true, keys: 8,
    msg: '5. AMBOS derivan el <strong>Master Secret = f(PMS, nonce_C, nonce_S)</strong> — los nonces evitan reusar material de sesiones viejas (anti-replay entre sesiones). Del MS salen <strong>4 claves</strong>: cifrado + MAC, para CADA sentido. Panel completo →',
  },
  {
    from: CLI, to: SRV, text: 'GET / 🔒 + MAC + seq', color: '#7ee787', keys: 8,
    msg: '6. Datos de verdad: cada registro viaja <strong>cifrado</strong> y con <strong>MAC + número de secuencia</strong> implícito (frena reordenamientos y replay DENTRO de la sesión).',
  },
  {
    from: SRV, to: CLI, text: '200 OK 🔒', color: '#7ee787', keys: 8,
    msg: 'La respuesta vuelve por el mismo canal seguro, con SUS claves (las del sentido server→cliente).',
  },
  {
    from: CLI, to: SRV, text: 'close-notify 👋', color: '#ef9a9a', keys: 8,
    msg: '7. El cierre es EXPLÍCITO: <strong>close-notify</strong>. Sin él, un atacante podría cortar la conexión TCP y hacerte creer que el mensaje terminó ahí (<strong>truncation attack</strong>).',
  },
];

interface KeyRow {
  k: string;
  v: string;
  kind: 'nonce' | 'pms' | 'ms' | 'key';
}

const KEY_ROWS: KeyRow[] = [
  { k: 'nonce_C', v: 'a91f…03', kind: 'nonce' },
  { k: 'nonce_S', v: '77c2…5e', kind: 'nonce' },
  { k: 'PMS', v: '🔒 secreto compartido', kind: 'pms' },
  { k: 'Master Secret', v: 'f(PMS + nonces)', kind: 'ms' },
  { k: 'k_cifrado C→S', v: 'derivada del MS', kind: 'key' },
  { k: 'k_MAC C→S', v: 'derivada del MS', kind: 'key' },
  { k: 'k_cifrado S→C', v: 'derivada del MS', kind: 'key' },
  { k: 'k_MAC S→C', v: 'derivada del MS', kind: 'key' },
];

@Component({
  selector: 'app-tls-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔐 TLS en detalle: el handshake y las claves derivándose en vivo</div>
          <div class="caption">Certificado → PMS → Master Secret → 4 claves de sesión. El panel de la derecha se completa paso a paso.</div>
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
            <line class="calink" [attr.x1]="ca.x" [attr.y1]="ca.y" [attr.x2]="cli.x" [attr.y2]="cli.y" />
            <line class="calink" [attr.x1]="ca.x" [attr.y1]="ca.y" [attr.x2]="srv.x" [attr.y2]="srv.y" />
          </svg>

          <div class="node can" [class.checking]="caCheck()" [style.left.%]="ca.x" [style.top.%]="ca.y">
            <strong>🏛 CA raíz</strong><small>en el trust store del browser</small>
            @if (caCheck()) {
              <span class="okbadge">✔ cadena válida</span>
            }
          </div>
          <div class="node clin" [class.active]="activeN(cli)" [style.left.%]="cli.x" [style.top.%]="cli.y">
            <strong>💻 Cliente</strong><small>browser</small>
          </div>
          <div class="node srvn" [class.active]="activeN(srv)" [style.left.%]="srv.x" [style.top.%]="srv.y">
            <strong>🖥 Servidor</strong><small>con certificado X.509 · :443</small>
          </div>

          @if (card(); as c) {
            <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
                 [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
              {{ c.text }}
            </div>
          }
        </div>

        <div class="table">
          <div class="thead">🔑 Material criptográfico (ambos lados)</div>
          @for (r of keyRows(); track r.k) {
            <div class="trow" [class.flash]="r.flash" [class.iskey]="r.kind === 'key'" [class.isms]="r.kind === 'ms'">
              <span class="k">{{ r.k }}</span>
              <span class="v">{{ r.v }}</span>
            </div>
          }
          @if (keyRows().length === 0) {
            <div class="tempty">(nada todavía — el canal es texto plano)</div>
          }
          <div class="tfoot">TLS 1.3: handshake en 1-RTT (0-RTT al reconectar) + forward secrecy por defecto</div>
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
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; max-width: 520px; }
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
      position: relative; flex: 1; min-height: 300px;
      background: radial-gradient(ellipse at 50% 60%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .wires line.calink { stroke: #2ea04344; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 116px; max-width: 200px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.8rem; color: #fff; }
    .node small { font-size: 0.62rem; color: rgba(255, 255, 255, 0.85); }
    .node.clin { background: #2e7d32; }
    .node.srvn { background: #1565c0; }
    .node.can { background: #b45309; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.checking { border-color: #7ee787; box-shadow: 0 0 18px rgba(126, 231, 135, 0.6); }
    .okbadge { font-size: 0.6rem; font-weight: 800; margin-top: 3px; padding: 1px 8px; border-radius: 8px; background: #16281c; color: #7ee787; border: 1px solid #2ea043; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.66rem; color: #e6e9f0;
      white-space: nowrap;
    }

    .table { width: 268px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; }
    .thead { font-weight: 700; font-size: 0.84rem; margin-bottom: 8px; color: #ce93d8; }
    .trow { display: grid; grid-template-columns: 1fr 1.2fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 5px 8px; border-radius: 6px; background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; align-items: center; }
    .trow .k { color: #ffd54f; font-weight: 700; }
    .trow .v { color: var(--text); }
    .trow.isms { border-color: #ce93d855; }
    .trow.isms .k { color: #ce93d8; }
    .trow.iskey { border-color: #2ea04333; }
    .trow.iskey .k { color: #7ee787; }
    .trow.flash { border-color: #7ee787; box-shadow: 0 0 10px rgba(126, 231, 135, 0.3); }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }
    .tfoot { margin-top: auto; color: #5c6a8e; font-size: 0.62rem; font-style: italic; padding-top: 8px; }

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
export class TlsDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly cli = CLI;
  readonly srv = SRV;
  readonly ca = CA;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
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
    return KEY_ROWS.slice(0, n).map((r, idx) => ({
      ...r,
      flash: justAdded && idx >= prev,
    }));
  });

  readonly caCheck = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].caCheck && this.progress() >= 1;
  });

  activeN(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Canal seguro completo</strong>: autenticación (certificado + CA), confidencialidad (cifrado simétrico con claves de sesión) e integridad (MAC + secuencia). <strong>QUIC</strong> integra este handshake con el de transporte: conexión + claves en 1 solo RTT. Y PGP hace el mismo combo para mail: firmar y cifrar.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y seguí el panel de la derecha: arranca vacío y termina con las 4 claves de sesión derivadas.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
