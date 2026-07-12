import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface NatStep {
  from: Pos;
  to: Pos;
  msg: string;
  title: string;
  src: string;
  dst: string;
  srcOld?: string;
  dstOld?: string;
  rows: number; // filas de la tabla visibles en este paso
  flashRow?: number; // fila resaltada
  back?: boolean; // paquete de respuesta (color distinto)
}

const HOST1: Pos = { x: 13, y: 25 };
const HOST2: Pos = { x: 13, y: 75 };
const NAT: Pos = { x: 50, y: 50 };
const SRV: Pos = { x: 86, y: 50 };

const STEPS: NatStep[] = [
  {
    from: HOST1, to: HOST1, title: 'datagrama · host 1', src: '192.168.0.10:3345', dst: '128.119.40.186:80', rows: 0,
    msg: 'El host privado arma el datagrama: origen = su IP privada <strong>192.168.0.10</strong> + puerto efímero <strong>3345</strong>. Esa dirección NO rutea en Internet (rango 192.168/16).',
  },
  {
    from: HOST1, to: NAT, title: 'datagrama · host 1', src: '192.168.0.10:3345', dst: '128.119.40.186:80', rows: 0,
    msg: 'Viaja hacia su default gateway: el <strong>router NAT</strong>.',
  },
  {
    from: NAT, to: NAT, title: 'datagrama · host 1', src: '200.1.2.3:5001', srcOld: '192.168.0.10:3345', dst: '128.119.40.186:80', rows: 1, flashRow: 0,
    msg: 'El NAT <strong>reescribe el ORIGEN</strong> → 200.1.2.3:<strong>5001</strong> y anota la fila en su tabla de traducción (mirá la tabla →). También recalcula los checksums de IP y TCP/UDP.',
  },
  {
    from: NAT, to: SRV, title: 'datagrama · host 1', src: '200.1.2.3:5001', dst: '128.119.40.186:80', rows: 1,
    msg: 'Sale a Internet con la IP pública. El servidor <strong>no tiene forma de saber</strong> que atrás hay una red privada entera.',
  },
  {
    from: SRV, to: SRV, title: 'respuesta del server', src: '128.119.40.186:80', dst: '200.1.2.3:5001', rows: 1, back: true,
    msg: 'El servidor responde invirtiendo los pares: destino = <strong>200.1.2.3:5001</strong> (la única cara que conoce).',
  },
  {
    from: SRV, to: NAT, title: 'respuesta del server', src: '128.119.40.186:80', dst: '200.1.2.3:5001', rows: 1, back: true,
    msg: 'La respuesta vuelve y golpea la puerta del router NAT.',
  },
  {
    from: NAT, to: NAT, title: 'respuesta del server', src: '128.119.40.186:80', dst: '192.168.0.10:3345', dstOld: '200.1.2.3:5001', rows: 1, flashRow: 0, back: true,
    msg: 'El NAT busca el puerto <strong>5001</strong> en su tabla (fila resaltada) y <strong>reescribe el DESTINO</strong> de vuelta al par privado.',
  },
  {
    from: NAT, to: HOST1, title: 'respuesta del server', src: '128.119.40.186:80', dst: '192.168.0.10:3345', rows: 1, back: true,
    msg: 'Entrega al host correcto. Para el host 1, el NAT fue <strong>totalmente invisible</strong>.',
  },
  {
    from: HOST2, to: HOST2, title: 'datagrama · host 2', src: '192.168.0.11:3345', dst: '128.119.40.186:80', rows: 1,
    msg: '¡Ahora el <strong>host 2</strong> abre una conexión usando el <strong>MISMO puerto privado 3345</strong>! ¿Cómo hace el NAT para no confundir las respuestas de los dos?',
  },
  {
    from: HOST2, to: NAT, title: 'datagrama · host 2', src: '192.168.0.11:3345', dst: '128.119.40.186:80', rows: 1,
    msg: 'El datagrama del host 2 llega al NAT…',
  },
  {
    from: NAT, to: NAT, title: 'datagrama · host 2', src: '200.1.2.3:5002', srcOld: '192.168.0.11:3345', dst: '128.119.40.186:80', rows: 2, flashRow: 1,
    msg: 'El NAT le asigna un puerto público <strong>DISTINTO: 5002</strong>. El puerto de 16 bits es LA clave para desambiguar: ~64K conexiones simultáneas con UNA sola IP pública.',
  },
  {
    from: NAT, to: SRV, title: 'datagrama · host 2', src: '200.1.2.3:5002', dst: '128.119.40.186:80', rows: 2,
    msg: 'Las dos conexiones comparten la IP pública 200.1.2.3 pero con puertos distintos: la tabla resuelve todo el tráfico de vuelta.',
  },
];

const TABLE_ROWS = [
  { priv: '192.168.0.10 : 3345', pub: '200.1.2.3 : 5001' },
  { priv: '192.168.0.11 : 3345', pub: '200.1.2.3 : 5002' },
];

@Component({
  selector: 'app-nat-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔀 NAT en detalle: headers reescritos + tabla de traducción viva</div>
          <div class="caption">Seguí los campos src/dst del datagrama: lo viejo se tacha, lo nuevo aparece en verde.</div>
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
          <!-- zona privada / pública -->
          <div class="zone private">red privada 192.168.0.0/24</div>
          <div class="zone public">Internet</div>
          <div class="divider"></div>

          <!-- nodos -->
          <div class="node host" [class.active]="nodeActive(host1)" [style.left.%]="host1.x" [style.top.%]="host1.y">
            <strong>Host 1</strong><small>192.168.0.10</small>
          </div>
          <div class="node host" [class.active]="nodeActive(host2)" [style.left.%]="host2.x" [style.top.%]="host2.y">
            <strong>Host 2</strong><small>192.168.0.11</small>
          </div>
          <div class="node natbox" [class.active]="nodeActive(natPos)" [style.left.%]="natPos.x" [style.top.%]="natPos.y">
            <strong>Router NAT</strong><small>pública: 200.1.2.3</small>
          </div>
          <div class="node srv" [class.active]="nodeActive(srvPos)" [style.left.%]="srvPos.x" [style.top.%]="srvPos.y">
            <strong>Servidor</strong><small>128.119.40.186</small>
          </div>

          <!-- tarjeta del paquete -->
          @if (card(); as c) {
            <div class="packet" [class.back]="c.back" [style.left.%]="c.x" [style.top.%]="c.y">
              <div class="ptitle">{{ c.title }}</div>
              <div class="pfield">
                <span class="k">src</span>
                @if (c.srcOld && showRewrite()) {
                  <span class="old">{{ c.srcOld }}</span>
                  <span class="new">{{ c.src }}</span>
                } @else {
                  <span class="v">{{ c.src }}</span>
                }
              </div>
              <div class="pfield">
                <span class="k">dst</span>
                @if (c.dstOld && showRewrite()) {
                  <span class="old">{{ c.dstOld }}</span>
                  <span class="new">{{ c.dst }}</span>
                } @else {
                  <span class="v">{{ c.dst }}</span>
                }
              </div>
            </div>
          }
        </div>

        <!-- tabla NAT -->
        <div class="table">
          <div class="thead">📋 Tabla NAT</div>
          <div class="trow th">
            <span>privado</span>
            <span>público</span>
          </div>
          @for (r of tableRows(); track $index) {
            <div class="trow" [class.flash]="r.flash">
              <span>{{ r.priv }}</span>
              <span>{{ r.pub }}</span>
            </div>
          }
          @if (tableRows().length === 0) {
            <div class="tempty">(vacía — todavía no salió nada)</div>
          }
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
      background: radial-gradient(ellipse at 40% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .zone { position: absolute; top: 8px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.4px; padding: 2px 10px; border-radius: 10px; }
    .zone.private { left: 10px; color: #7ee787; background: rgba(46, 160, 67, 0.12); border: 1px solid #2ea04355; }
    .zone.public { right: 10px; color: #79c0ff; background: rgba(31, 111, 235, 0.12); border: 1px solid #1f6feb55; }
    .divider { position: absolute; left: 63%; top: 0; bottom: 0; border-left: 2px dashed #39445f; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 8px 12px; min-width: 96px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s;
    }
    .node strong { font-size: 0.82rem; color: #fff; }
    .node small { font-size: 0.66rem; color: rgba(255, 255, 255, 0.85); font-family: Consolas, monospace; }
    .node.host { background: #2e7d32; }
    .node.natbox { background: #f68c1f; }
    .node.srv { background: #1565c0; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }

    .packet {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 9px;
      padding: 6px 10px; min-width: 190px;
      box-shadow: 0 0 16px rgba(255, 213, 79, 0.35);
      font-family: Consolas, monospace;
      transition: none;
    }
    .packet.back { border-color: #7ee787; box-shadow: 0 0 16px rgba(126, 231, 135, 0.35); }
    .ptitle { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.4px; color: #8b95b5; text-transform: uppercase; margin-bottom: 3px; }
    .pfield { display: flex; gap: 6px; align-items: baseline; font-size: 0.74rem; flex-wrap: wrap; }
    .k { color: #5c6a8e; width: 22px; }
    .v { color: #e6e9f0; }
    .old { color: #ef5350; text-decoration: line-through; }
    .new { color: #7ee787; font-weight: 700; }

    .table { width: 250px; flex-shrink: 0; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; align-self: stretch; }
    .thead { font-weight: 700; font-size: 0.88rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.68rem; padding: 6px 8px; border-radius: 6px; color: var(--text); }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.62rem; padding-bottom: 2px; }
    .trow:not(.th) { background: #1a2132; margin-bottom: 4px; border: 1px solid #2d3750; }
    .trow.flash { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255, 213, 79, 0.3); background: #2b2a1a; }
    .tempty { color: #5c6a8e; font-size: 0.72rem; font-style: italic; padding: 8px; }

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
export class NatDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly host1 = HOST1;
  readonly host2 = HOST2;
  readonly natPos = NAT;
  readonly srvPos = SRV;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    const s = STEPS[i];
    return s.from === s.to ? 500 : 1500;
  }
  protected override stepDwell(i: number): number {
    return STEPS[i].from === STEPS[i].to ? 3100 : 2000;
  }

  readonly card = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = STEPS[i];
    const p = this.ease(this.progress());
    return {
      ...s,
      x: s.from.x + (s.to.x - s.from.x) * p,
      y: s.from.y + (s.to.y - s.from.y) * p,
    };
  });

  /** en pasos de reescritura, el valor nuevo aparece a mitad del dwell */
  readonly showRewrite = computed(() => {
    const i = this.index();
    if (i < 0) return false;
    return this.progress() >= 1;
  });

  readonly tableRows = computed(() => {
    const i = this.index();
    if (i < 0) return [];
    const s = STEPS[i];
    const visible = this.finished() ? 2 : this.progress() >= 1 ? s.rows : Math.min(s.rows, i > 0 ? STEPS[i - 1].rows : 0);
    return TABLE_ROWS.slice(0, visible).map((r, idx) => ({
      ...r,
      flash: !this.finished() && s.flashRow === idx && this.progress() >= 1,
    }));
  });

  nodeActive(p: Pos): boolean {
    const c = this.card();
    if (!c) return false;
    const s = STEPS[this.index()];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Eso es NAT</strong>: toda la red privada multiplexada sobre una IP pública usando puertos. Contras de examen: rompe el modelo <strong>end-to-end</strong> (nadie puede iniciar una conexión hacia adentro sin port forwarding) y <strong>"viola" las capas</strong> (un dispositivo de red manipulando puertos de transporte).';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play — y no pierdas de vista los campos src/dst de la tarjeta y la tabla de la derecha.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
