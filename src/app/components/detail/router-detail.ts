import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

type Hl = 'term' | 'lookup' | 'fabric' | 'oqueue' | 'proc' | 'sched';

interface RStep {
  seg: [number, number] | null; // waypoints origen→destino del paquete (null = oculto)
  hl?: Hl[];
  msg: string;
  outQ?: number; // paquetes en la cola de salida 1 al completar el paso
  land?: boolean; // el paquete entra a la cola al final del viaje
  inQueue?: boolean; // el paquete está adentro de la cola (se dibuja como slot)
  leave?: boolean; // el paquete sale de la cola (scheduling)
  inHOL?: boolean;
  contention?: boolean;
  drop?: boolean;
  tableFlash?: boolean;
}

/* Geometría (viewBox 200×130):
   divider y=30 · proc y=4..22 · fabric x=90..116, y=46..118
   filas de puertos: cy 62 (arriba) y 106 (abajo) */
const CY1 = 62;
const CY2 = 106;

// waypoints del paquete: entrada 1 → fabric → salida 1
const WP: { x: number; y: number }[] = [
  { x: 0, y: CY1 }, // 0 entra
  { x: 41, y: CY1 }, // 1 term + enlace
  { x: 67, y: CY1 }, // 2 lookup
  { x: 103, y: 82 }, // 3 fabric (centro)
  { x: 138, y: CY1 }, // 4 cola de salida
  { x: 203, y: CY1 }, // 5 afuera (se recorta al salir)
];

const STEPS: RStep[] = [
  {
    seg: null, hl: ['proc'],
    msg: 'La anatomía del libro (Fig. 4.4): <strong>puertos de entrada</strong> (terminación de línea → enlace → lookup), <strong>switch fabric</strong> en el centro, <strong>puertos de salida</strong> (cola → enlace → terminación) y arriba el <strong>procesador de ruteo</strong>. La línea punteada separa el <strong>control plane (software)</strong> del <strong>data plane (hardware)</strong>.',
  },
  {
    seg: [0, 1], hl: ['term'],
    msg: 'Llega un paquete al <strong>puerto de entrada 1</strong> (Fig. 4.5): la <strong>terminación de línea</strong> recupera los bits del medio físico y el <strong>procesamiento de enlace</strong> valida y <strong>desencapsula</strong> la trama → queda el datagrama. Destino: 138.16.5.9.',
  },
  {
    seg: [1, 2], hl: ['lookup'], tableFlash: true,
    msg: '<strong>Lookup en el propio puerto de entrada</strong>, contra la copia local de la forwarding table: matchean <code>138.16.0.0/16</code> y <code>138.16.5.0/24</code> → gana el más largo (<strong>LPM</strong>) → salida 1. En hardware (<strong>TCAM</strong>): ~1 ciclo, a <em>line speed</em>.',
  },
  {
    seg: [2, 3], hl: ['fabric'],
    msg: 'Cruza el <strong>switch fabric</strong> hacia el puerto elegido. Tres generaciones: por <strong>memoria</strong> (sube a RAM y baja), por <strong>bus</strong> (uno por vez) y por <strong>crossbar</strong> (transferencias en paralelo… si no compiten por la misma salida).',
  },
  {
    seg: [3, 4], hl: ['oqueue'], outQ: 1, land: true,
    msg: 'Llega al <strong>puerto de salida 1</strong> (Fig. 4.7) y entra a la <strong>cola</strong> (buffer management): el enlace transmite de a un paquete (d_trans = L/R por cada uno). Nuestro paquete es el amarillo.',
  },
  {
    seg: null, hl: ['oqueue', 'fabric'], outQ: 3, inQueue: true, contention: true,
    msg: '<strong>El problema típico</strong>: otras entradas mandan a la <strong>MISMA salida</strong> (mirá los paquetes azules cruzando el fabric). El fabric los pasa, pero el enlace no acelera → la <strong>cola de salida crece</strong>. Acá vive el <strong>d_queue</strong>.',
  },
  {
    seg: null, hl: ['lookup'], outQ: 3, inQueue: true, inHOL: true,
    msg: 'Y si el cuello fuera el <strong>fabric</strong>, las colas se arman en la <strong>ENTRADA</strong> → <strong>HOL blocking</strong>: el paquete del frente (rojo, espera una salida ocupada) <strong>traba al de atrás</strong> (verde), aunque la salida de ESE esté libre.',
  },
  {
    seg: null, hl: ['oqueue'], outQ: 3, inQueue: true, drop: true,
    msg: 'El buffer es <strong>finito</strong>: llega uno más con la cola llena → <strong>descarte (drop-tail) ✖</strong>. Los <strong>AQM</strong> (RED, CoDel) descartan/marcan <em>antes</em> de llenarse (con <strong>ECN</strong> marcan en vez de tirar). Buffer: <span class="formula">B = RTT·C/√N</span>; demasiado = <strong>bufferbloat</strong>.',
  },
  {
    seg: [4, 5], hl: ['sched', 'oqueue'], outQ: 0, leave: true,
    msg: '<strong>Scheduling</strong>: ¿quién sale primero? <strong>FIFO</strong> · <strong>prioridad</strong> (riesgo: inanición) · <strong>round robin</strong> · <strong>WFQ</strong> (garantiza a la clase i una fracción w<sub>i</sub>/Σw<sub>j</sub> del enlace — la base del QoS). El paquete pasa por <strong>enlace (encapsula)</strong> y <strong>terminación de línea</strong>, y afuera.',
  },
];

const TABLE = [
  { pfx: '138.16.0.0/16', out: '1', match: true, win: false },
  { pfx: '138.16.5.0/24', out: '1', match: true, win: true },
  { pfx: '200.23.16.0/20', out: '2', match: false, win: false },
  { pfx: '0.0.0.0/0 (def)', out: '2', match: false, win: false },
];

const PORT_ROWS = [
  { n: 1, cy: CY1 },
  { n: 2, cy: CY2 },
];

@Component({
  selector: 'app-router-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔧 Adentro de un router (arquitectura del Kurose, Fig. 4.4)</div>
          <div class="caption">Puertos de entrada → switch fabric → puertos de salida, con el procesador de ruteo en el control plane.</div>
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
          <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="rarrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="#6b7f9c" />
              </marker>
            </defs>

            <!-- separador control plane / data plane -->
            <line x1="0" y1="30" x2="200" y2="30" class="divider" />
            <text x="197" y="27" text-anchor="end" class="plane">control plane · software ↑</text>
            <text x="197" y="37" text-anchor="end" class="plane">data plane · hardware ↓</text>

            <!-- procesador de ruteo -->
            <g [class.hot]="hot('proc')">
              <rect x="72" y="4" width="56" height="18" rx="4" class="proc" />
              <text x="100" y="12" text-anchor="middle" class="proc-t">🧠 procesador de ruteo</text>
              <text x="100" y="19" text-anchor="middle" class="proc-s">OSPF/BGP · o controlador SDN</text>
            </g>
            @for (p of portRows; track 'c' + p.n) {
              <line x1="94" y1="22" x2="70" [attr.y2]="p.cy - 12" class="ctrlarrow" />
              <line x1="106" y1="22" x2="138" [attr.y2]="p.cy - 12" class="ctrlarrow" />
            }

            <!-- SWITCH FABRIC -->
            <rect x="90" y="46" width="26" height="72" rx="5" class="fabric" [class.hot]="hot('fabric')" />
            <text x="103" y="76" text-anchor="middle" class="fab-t">switch</text>
            <text x="103" y="84" text-anchor="middle" class="fab-t">fabric</text>
            <text x="103" y="92" text-anchor="middle" class="fab-s">crossbar</text>

            <!-- PUERTOS DE ENTRADA (Fig. 4.5) -->
            @for (p of portRows; track 'in' + p.n) {
              <g>
                <rect x="6" [attr.y]="p.cy - 11" width="78" height="22" rx="5" class="portframe" />
                <text x="10" [attr.y]="p.cy - 14" class="portlab">puerto de entrada {{ p.n }}</text>
                <line x1="0" [attr.y1]="p.cy" x2="5" [attr.y2]="p.cy" class="flow" marker-end="url(#rarrow)" />
                <rect x="9" [attr.y]="p.cy - 8" width="20" height="16" rx="2" class="cell" [class.hot]="hot('term') && p.n === 1" />
                <text x="19" [attr.y]="p.cy - 1" text-anchor="middle" class="cell-t">term. de</text>
                <text x="19" [attr.y]="p.cy + 5" text-anchor="middle" class="cell-t">línea</text>
                <rect x="31" [attr.y]="p.cy - 8" width="20" height="16" rx="2" class="cell" [class.hot]="hot('term') && p.n === 1" />
                <text x="41" [attr.y]="p.cy - 1" text-anchor="middle" class="cell-t">enlace</text>
                <text x="41" [attr.y]="p.cy + 5" text-anchor="middle" class="cell-t">(desenc.)</text>
                <rect x="53" [attr.y]="p.cy - 8" width="28" height="16" rx="2" class="cell" [class.hot]="hot('lookup') && p.n === 1" />
                <text x="67" [attr.y]="p.cy - 1" text-anchor="middle" class="cell-t">lookup +</text>
                <text x="67" [attr.y]="p.cy + 5" text-anchor="middle" class="cell-t">reenvío</text>
                <line x1="84" [attr.y1]="p.cy" x2="89" [attr.y2]="fabY(p.cy)" class="flow" marker-end="url(#rarrow)" />
              </g>
            }

            <!-- PUERTOS DE SALIDA (Fig. 4.7) -->
            @for (p of portRows; track 'out' + p.n) {
              <g>
                <rect x="122" [attr.y]="p.cy - 11" width="74" height="22" rx="5" class="portframe" />
                <text x="126" [attr.y]="p.cy - 14" class="portlab">puerto de salida {{ p.n }}</text>
                <line x1="116" [attr.y1]="fabY(p.cy)" x2="121" [attr.y2]="p.cy" class="flow" marker-end="url(#rarrow)" />
                <rect x="125" [attr.y]="p.cy - 8" width="26" height="16" rx="2" class="cell" [class.hot]="(hot('oqueue') || hot('sched')) && p.n === 1" />
                <text x="138" [attr.y]="p.cy - 3.5" text-anchor="middle" class="cell-t">cola</text>
                @if (p.n === 1) {
                  @for (s of [0, 1, 2]; track s) {
                    <rect [attr.x]="128 + s * 7" [attr.y]="p.cy - 0.5" width="5" height="6.5" rx="1"
                          class="qslot"
                          [class.full]="s < queueView().filled"
                          [class.mine]="s === queueView().mine" />
                  }
                  @if (showDrop()) {
                    <text x="149" [attr.y]="p.cy + 5.5" text-anchor="middle" class="dropx">✖</text>
                  }
                } @else {
                  <rect x="128" [attr.y]="p.cy - 0.5" width="5" height="6.5" rx="1" class="qslot" />
                  <rect x="135" [attr.y]="p.cy - 0.5" width="5" height="6.5" rx="1" class="qslot" />
                  <rect x="142" [attr.y]="p.cy - 0.5" width="5" height="6.5" rx="1" class="qslot" />
                }
                <rect x="153" [attr.y]="p.cy - 8" width="19" height="16" rx="2" class="cell" />
                <text x="162.5" [attr.y]="p.cy - 1" text-anchor="middle" class="cell-t">enlace</text>
                <text x="162.5" [attr.y]="p.cy + 5" text-anchor="middle" class="cell-t">(encap.)</text>
                <rect x="174" [attr.y]="p.cy - 8" width="19" height="16" rx="2" class="cell" />
                <text x="183.5" [attr.y]="p.cy - 1" text-anchor="middle" class="cell-t">term. de</text>
                <text x="183.5" [attr.y]="p.cy + 5" text-anchor="middle" class="cell-t">línea</text>
                <line x1="196" [attr.y1]="p.cy" x2="200" [attr.y2]="p.cy" class="flow" marker-end="url(#rarrow)" />
              </g>
            }

            <!-- HOL blocking: cola dentro del puerto de entrada 1 (entre las dos filas) -->
            @if (showHOL()) {
              <g>
                <rect x="70" y="75" width="8" height="6" rx="1.5" class="holpkt blocked" />
                <text x="74" y="79.6" text-anchor="middle" class="holnum">1</text>
                <rect x="59" y="75" width="8" height="6" rx="1.5" class="holpkt waiting" />
                <text x="63" y="79.6" text-anchor="middle" class="holnum">2</text>
                <line x1="78" y1="78" x2="84" y2="78" class="flow" marker-end="url(#rarrow)" />
                <text x="45" y="87.5" text-anchor="middle" class="holtxt">⛔ HOL: el 1 espera una salida ocupada y traba al 2</text>
              </g>
            }

            <!-- paquetes de contención cruzando el fabric hacia la salida 1 -->
            @if (contendPkts(); as cps) {
              @for (c of cps; track $index) {
                <rect [attr.x]="c.x - 4" [attr.y]="c.y - 3" width="8" height="6" rx="1.5" class="cpkt" />
              }
            }

            <!-- paquete principal -->
            @if (pkt(); as p) {
              <g [attr.transform]="'translate(' + p.x + ',' + p.y + ')'">
                <rect x="-5" y="-4" width="10" height="8" rx="1.5" class="pkt" />
              </g>
            }
          </svg>
        </div>

        <div class="side">
          <div class="tbl">
            <div class="thead">📋 Forwarding table (copiada en el puerto)</div>
            <div class="trow th"><span>prefijo</span><span>salida</span><span></span></div>
            @for (r of tableRows(); track r.pfx) {
              <div class="trow" [class.match]="r.showMatch" [class.win]="r.showWin">
                <span class="pf">{{ r.pfx }}</span>
                <span class="po">{{ r.out }}</span>
                <span class="pk">{{ r.showWin ? '✔ LPM' : r.showMatch ? 'match' : '' }}</span>
              </div>
            }
            <div class="tfoot">la escribe el <b>control plane</b>; la consulta el <b>data plane</b> en ns</div>
          </div>
          <div class="notes">
            <div class="nhead">🧭 Dónde se arman las colas</div>
            <div class="nline"><b class="y">entrada</b> → HOL blocking (si el fabric es lento)</div>
            <div class="nline"><b class="o">salida</b> → lo común: d_queue, drops</div>
            <div class="nline"><b class="r">buffer lleno</b> → drop-tail / AQM (RED, CoDel)</div>
            <div class="nline"><b class="g">scheduler</b> → FIFO · prioridad · RR · WFQ</div>
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
      position: relative; flex: 1; min-width: 0;
      background: radial-gradient(ellipse at 50% 50%, #1c2436 0%, #141a28 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden; padding: 6px;
    }
    svg { width: 100%; height: auto; display: block; }

    .divider { stroke: #3a4560; stroke-width: 0.6; stroke-dasharray: 3 2; vector-effect: non-scaling-stroke; }
    .plane { fill: #5c6a8e; font-size: 3.6px; font-style: italic; }

    .proc { fill: #4a2f7d; stroke: #7c3aed; stroke-width: 0.7; vector-effect: non-scaling-stroke; transition: filter 0.3s; }
    .proc-t { fill: #fff; font-size: 4.6px; font-weight: 700; }
    .proc-s { fill: #cbb8f0; font-size: 3.2px; }
    g.hot .proc { filter: drop-shadow(0 0 4px rgba(167,139,250,0.9)); }
    .ctrlarrow { stroke: #7c3aed77; stroke-width: 0.4; stroke-dasharray: 1.5 1.5; vector-effect: non-scaling-stroke; }

    .fabric { fill: #7a3d0a; stroke: #f0a83b; stroke-width: 0.8; vector-effect: non-scaling-stroke; transition: fill 0.3s, filter 0.3s; }
    .fabric.hot { fill: #b4610f; filter: drop-shadow(0 0 5px rgba(240,168,59,0.8)); }
    .fab-t { fill: #fff; font-size: 5px; font-weight: 800; }
    .fab-s { fill: #f7c98a; font-size: 3.4px; }

    .portframe { fill: rgba(88,166,255,0.05); stroke: #3f4c6b; stroke-width: 0.6; vector-effect: non-scaling-stroke; }
    .portlab { fill: #8b95b5; font-size: 3.6px; font-weight: 700; }
    .cell { fill: #212b40; stroke: #3d4a68; stroke-width: 0.5; vector-effect: non-scaling-stroke; transition: fill 0.3s, stroke 0.3s, filter 0.3s; }
    .cell.hot { fill: #14406b; stroke: #58a6ff; filter: drop-shadow(0 0 4px rgba(88,166,255,0.7)); }
    .cell-t { fill: #aeb9d4; font-size: 3.4px; }

    .flow { stroke: #6b7f9c; stroke-width: 0.6; vector-effect: non-scaling-stroke; }

    .qslot { fill: #0b0f19; stroke: #2d3750; stroke-width: 0.4; vector-effect: non-scaling-stroke; transition: fill 0.35s, stroke 0.35s; }
    .qslot.full { fill: #3949ab; stroke: #7986cb; }
    .qslot.mine { fill: #ffd54f; stroke: #b8860b; }
    .dropx { fill: #ef5350; font-size: 6px; font-weight: 900; }

    .holpkt { stroke-width: 0.4; vector-effect: non-scaling-stroke; }
    .holpkt.blocked { fill: #4a1d1d; stroke: #ef5350; }
    .holpkt.waiting { fill: #16281c; stroke: #2ea043; }
    .holnum { font-size: 4px; font-weight: 900; fill: #e6e9f0; }
    .holtxt { fill: #ef9a9a; font-size: 3.4px; font-weight: 700; }
    .cpkt { fill: #3949ab; stroke: #7986cb; stroke-width: 0.4; vector-effect: non-scaling-stroke; }

    .pkt { fill: #ffd54f; stroke: #b8860b; stroke-width: 0.5; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 3px rgba(255,213,79,0.8)); }

    .side { width: 270px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .tbl { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .thead { font-weight: 700; font-size: 0.8rem; margin-bottom: 8px; color: #ffd54f; }
    .trow { display: grid; grid-template-columns: 1.6fr 0.5fr 0.7fr; gap: 4px; font-family: Consolas, monospace; font-size: 0.63rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .trow.th { color: #5c6a8e; font-weight: 700; text-transform: uppercase; font-size: 0.52rem; }
    .trow:not(.th) { background: #1a2132; border: 1px solid #2d3750; margin-bottom: 3px; }
    .trow.match { border-color: #d2992288; }
    .trow.win { border-color: #ffd54f; box-shadow: 0 0 10px rgba(255,213,79,0.3); background: #2b2a1a; }
    .pf { color: #80d8ff; } .po { color: #cfe3ff; text-align: center; font-weight: 800; }
    .pk { color: #ffd54f; font-size: 0.55rem; font-weight: 800; text-align: right; }
    .tfoot { margin-top: 6px; border-top: 1px solid #232b3e; padding-top: 6px; font-size: 0.6rem; color: #8b95b5; line-height: 1.5; }
    .tfoot b { color: #cfe3ff; }

    .notes { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .nhead { font-weight: 700; font-size: 0.76rem; color: #79c0ff; margin-bottom: 6px; }
    .nline { font-size: 0.68rem; color: var(--text); line-height: 1.6; }
    .nline b.y { color: #ffd54f; } .nline b.o { color: #ffb74d; } .nline b.r { color: #ef9a9a; } .nline b.g { color: #7ee787; }

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

    @media (max-width: 780px) {
      .board { flex-direction: column; }
      .side { width: 100%; }
    }
  `,
})
export class RouterDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly portRows = PORT_ROWS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    const s = STEPS[i];
    if (s.contention) return 1300; // los paquetes azules cruzan el fabric
    return !s.seg || s.seg[0] === s.seg[1] ? 500 : 1300;
  }
  protected override stepDwell(): number {
    return 3400;
  }

  fabY(cy: number): number {
    // punto de conexión con el fabric, hacia su centro vertical (82)
    return cy < 82 ? cy + 8 : cy - 8;
  }

  hot(h: Hl): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return (STEPS[i].hl ?? []).includes(h);
  }

  /** herencia de outQ del último paso completado */
  private inheritQ(i: number): number {
    for (let s = i; s >= 0; s--) {
      if (STEPS[s].outQ !== undefined) return STEPS[s].outQ!;
    }
    return 0;
  }

  /** cuántos slots llenos y cuál es "nuestro" paquete (amarillo) */
  readonly queueView = computed<{ filled: number; mine: number }>(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return { filled: 0, mine: -1 };
    const s = STEPS[i];
    const done = this.progress() >= 1;
    if (s.leave) {
      // nuestro paquete salió primero; los 2 de atrás drenan al completar
      return { filled: done ? 0 : 2, mine: -1 };
    }
    const filled = done ? (s.outQ ?? this.inheritQ(i - 1)) : this.inheritQ(i - 1);
    const mine = filled > 0 && (s.inQueue || (s.land && done)) ? 0 : -1;
    return { filled, mine };
  });

  showHOL(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].inHOL && this.progress() >= 1;
  }
  showDrop(): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    return !!STEPS[i].drop && this.progress() >= 1;
  }

  /** paquetes azules que cruzan del puerto de entrada 2 a la cola de salida 1 */
  readonly contendPkts = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished() || !STEPS[i].contention) return null;
    const raw = this.progress();
    if (raw >= 1) return null; // al llegar se vuelven slots llenos
    const from = { x: 67, y: CY2 };
    const to = { x: 136, y: CY1 + 2 };
    const mk = (p: number) => ({
      x: from.x + (to.x - from.x) * this.ease(p),
      y: from.y + (to.y - from.y) * this.ease(p),
    });
    const p2 = Math.max(0, raw - 0.25) / 0.75;
    return [mk(raw), mk(p2)];
  });

  readonly tableRows = computed(() => {
    const i = this.index();
    const flash = i >= 0 && !this.finished() && !!STEPS[i].tableFlash && this.progress() >= 1;
    return TABLE.map((r) => ({
      ...r,
      showMatch: flash && r.match && !r.win,
      showWin: flash && r.win,
    }));
  });

  readonly pkt = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    const s = STEPS[i];
    if (!s.seg) return null;
    const p = this.ease(this.progress());
    if (s.land && this.progress() >= 1) return null; // ya está adentro de la cola (slot amarillo)
    const a = WP[s.seg[0]];
    const b = WP[s.seg[1]];
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>El router en una frase</strong>: el <strong>data plane</strong> (entrada → fabric → salida) mueve paquetes en <strong>nanosegundos y en hardware</strong>; el <strong>control plane</strong> (procesador de ruteo, arriba de la línea) arma las tablas en <strong>segundos y en software</strong> — con OSPF/BGP distribuido, o con un controlador SDN que se las escribe desde afuera.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: un paquete entra por un puerto, se le hace lookup, cruza el fabric… y en el camino aparecen las colas, el descarte y el scheduling.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
