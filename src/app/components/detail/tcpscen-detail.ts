import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Los escenarios de retransmisión de TCP, con los mismos números del libro
   (Kurose 8ª ed., §3.5.4, Figs. 3.34–3.37 y Tabla 3.2 / RFC 5681). */

type Mode = 'lost' | 'premature' | 'cumulative' | 'fast';
type Kind = 'data' | 'ack' | 'retx';

interface Msg { from: 'A' | 'B'; y0: number; y1: number; label: string; kind: Kind; lost?: boolean; }
interface Bracket { y0: number; y1: number; label: string; tone: 'run' | 'fired' | 'stop'; }
interface Mark { side: 'A' | 'B'; y: number; text: string; tone?: 'bad' | 'good' | 'info'; }
interface State { sendBase: string; nextSeq: string; timer: string; timeout: string; dup?: number; }

interface Step {
  add?: Msg[];
  brackets?: Bracket[];   // los visibles en este paso (lista completa)
  marks?: Mark[];         // se acumulan
  state: State;
  row?: number;           // fila de la Tabla 3.2 que aplica
  msg: string;
}

const XA = 150;
const XB = 320;

const LOST: Step[] = [
  {
    state: { sendBase: '92', nextSeq: '92', timer: 'apagado', timeout: '0,75 s' },
    msg: '<strong>Fig. 3.34 — ACK perdido.</strong> A tiene 8 bytes para mandar, empezando en el byte 92. Mirá el panel del emisor: <strong>SendBase</strong> es el byte más viejo sin confirmar.',
  },
  {
    add: [{ from: 'A', y0: 40, y1: 92, label: 'Seq=92, 8 bytes', kind: 'data' }],
    brackets: [{ y0: 40, y1: 172, label: 'timeout', tone: 'run' }],
    state: { sendBase: '92', nextSeq: '100', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    msg: 'A manda <strong>Seq=92 con 8 bytes</strong> (bytes 92 a 99) y <strong>arranca el timer</strong>. NextSeqNum pasa a 100.',
  },
  {
    add: [{ from: 'B', y0: 96, y1: 148, label: 'ACK=100', kind: 'ack', lost: true }],
    brackets: [{ y0: 40, y1: 172, label: 'timeout', tone: 'run' }],
    marks: [{ side: 'B', y: 92, text: 'recibe 92–99 ✔', tone: 'good' }],
    state: { sendBase: '92', nextSeq: '100', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    row: 0,
    msg: 'B recibe bien los datos y contesta <strong>ACK=100</strong> ("espero el byte 100")… pero <strong>el ACK se pierde</strong> en la red.',
  },
  {
    add: [{ from: 'A', y0: 172, y1: 224, label: 'Seq=92, 8 bytes', kind: 'retx' }],
    brackets: [
      { y0: 40, y1: 172, label: 'timeout', tone: 'fired' },
      { y0: 172, y1: 320, label: 'timeout ×2', tone: 'run' },
    ],
    marks: [{ side: 'A', y: 172, text: '⏰ venció el timer', tone: 'bad' }],
    state: { sendBase: '92', nextSeq: '100', timer: 'reiniciado (seq 92)', timeout: '1,5 s (×2)' },
    msg: 'A nunca recibió el ACK → <strong>vence el timer y retransmite Seq=92</strong>. Ojo al panel: el <strong>TimeoutInterval se DUPLICA</strong> (0,75 → 1,5 s). Ante un timeout no se recalcula con EstimatedRTT: se duplica, porque probablemente hay congestión.',
  },
  {
    add: [{ from: 'B', y0: 228, y1: 280, label: 'ACK=100', kind: 'ack' }],
    brackets: [
      { y0: 40, y1: 172, label: 'timeout', tone: 'fired' },
      { y0: 172, y1: 320, label: 'timeout ×2', tone: 'run' },
    ],
    marks: [{ side: 'B', y: 224, text: 'duplicado → descarta', tone: 'info' }],
    state: { sendBase: '92', nextSeq: '100', timer: 'reiniciado (seq 92)', timeout: '1,5 s (×2)' },
    msg: 'B ya tenía los bytes 92–99: por el <strong>número de secuencia</strong> se da cuenta de que es un <strong>duplicado</strong>, <strong>descarta los datos</strong>… pero <strong>vuelve a mandar ACK=100</strong>, porque claramente A no se enteró.',
  },
  {
    brackets: [
      { y0: 40, y1: 172, label: 'timeout', tone: 'fired' },
      { y0: 172, y1: 280, label: 'timeout ×2', tone: 'stop' },
    ],
    marks: [{ side: 'A', y: 280, text: 'SendBase = 100 ✔', tone: 'good' }],
    state: { sendBase: '100', nextSeq: '100', timer: 'apagado', timeout: 'vuelve a EstimatedRTT + 4·DevRTT' },
    msg: 'Llega el ACK=100: <strong>SendBase = 100</strong>, no queda nada sin confirmar y <strong>se apaga el timer</strong>. Moraleja: los números de secuencia son los que permiten <strong>retransmitir sin duplicar datos</strong> en el receptor.',
  },
];

const PREMATURE: Step[] = [
  {
    state: { sendBase: '92', nextSeq: '92', timer: 'apagado', timeout: '0,75 s' },
    msg: '<strong>Fig. 3.35 — Timeout prematuro.</strong> Ahora A manda <strong>dos</strong> segmentos seguidos. Nada se va a perder: el problema va a ser <strong>el tiempo</strong>.',
  },
  {
    add: [
      { from: 'A', y0: 36, y1: 92, label: 'Seq=92, 8 bytes', kind: 'data' },
      { from: 'A', y0: 52, y1: 108, label: 'Seq=100, 20 bytes', kind: 'data' },
    ],
    brackets: [{ y0: 36, y1: 150, label: 'timeout seq 92', tone: 'run' }],
    state: { sendBase: '92', nextSeq: '120', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    msg: 'A manda <strong>Seq=92 (8 bytes)</strong> y <strong>Seq=100 (20 bytes)</strong>. Hay <strong>un solo timer</strong>, el del segmento más viejo sin confirmar (el 92).',
  },
  {
    add: [
      { from: 'B', y0: 96, y1: 178, label: 'ACK=100', kind: 'ack' },
      { from: 'B', y0: 112, y1: 194, label: 'ACK=120', kind: 'ack' },
    ],
    brackets: [{ y0: 36, y1: 150, label: 'timeout seq 92', tone: 'run' }],
    marks: [{ side: 'B', y: 108, text: 'recibe los dos ✔', tone: 'good' }],
    state: { sendBase: '92', nextSeq: '120', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    msg: 'B recibe todo bien y manda <strong>ACK=100</strong> y <strong>ACK=120</strong>. Pero los ACKs vienen <strong>demorados</strong> (colas en el camino): fijate que van a llegar <strong>después</strong> de que venza el timer.',
  },
  {
    add: [{ from: 'A', y0: 150, y1: 210, label: 'Seq=92, 8 bytes', kind: 'retx' }],
    brackets: [
      { y0: 36, y1: 150, label: 'timeout seq 92', tone: 'fired' },
      { y0: 150, y1: 300, label: 'timeout ×2', tone: 'run' },
    ],
    marks: [{ side: 'A', y: 150, text: '⏰ timeout prematuro', tone: 'bad' }],
    state: { sendBase: '92', nextSeq: '120', timer: 'reiniciado (seq 92)', timeout: '1,5 s (×2)' },
    msg: 'Vence el timer <strong>antes</strong> de que lleguen los ACKs → A <strong>retransmite SOLO el segmento más viejo</strong> (Seq=92), reinicia el timer y lo <strong>duplica</strong>. Es una retransmisión <strong>innecesaria</strong>: no se había perdido nada.',
  },
  {
    brackets: [
      { y0: 36, y1: 150, label: 'timeout seq 92', tone: 'fired' },
      { y0: 150, y1: 194, label: 'timeout ×2', tone: 'stop' },
    ],
    marks: [{ side: 'A', y: 194, text: 'SendBase = 120 ✔', tone: 'good' }],
    state: { sendBase: '120', nextSeq: '120', timer: 'apagado', timeout: '1,5 s' },
    msg: 'Llegan <strong>ACK=100</strong> y enseguida <strong>ACK=120</strong> → <strong>SendBase = 120</strong>. Como el ACK=120 llegó <strong>antes del nuevo timeout</strong>, el <strong>segmento 100 NO se retransmite</strong> (es justo el título de la figura).',
  },
  {
    add: [{ from: 'B', y0: 214, y1: 266, label: 'ACK=120', kind: 'ack' }],
    marks: [{ side: 'B', y: 210, text: 'duplicado → descarta', tone: 'info' }],
    brackets: [
      { y0: 36, y1: 150, label: 'timeout seq 92', tone: 'fired' },
      { y0: 150, y1: 194, label: 'timeout ×2', tone: 'stop' },
    ],
    state: { sendBase: '120', nextSeq: '120', timer: 'apagado', timeout: '1,5 s' },
    msg: 'A B le llega el 92 duplicado: lo descarta y contesta con el <strong>ACK acumulativo que ya tenía, ACK=120</strong>. A lo ignora: no avanza nada. Costo total del timeout prematuro: <strong>8 bytes retransmitidos de gusto</strong>, no toda la ventana.',
  },
];

const CUMULATIVE: Step[] = [
  {
    state: { sendBase: '92', nextSeq: '92', timer: 'apagado', timeout: '0,75 s' },
    msg: '<strong>Fig. 3.36 — El ACK acumulativo salva la situación.</strong> Mismo arranque que el escenario anterior: dos segmentos seguidos.',
  },
  {
    add: [
      { from: 'A', y0: 36, y1: 88, label: 'Seq=92, 8 bytes', kind: 'data' },
      { from: 'A', y0: 56, y1: 108, label: 'Seq=100, 20 bytes', kind: 'data' },
    ],
    brackets: [{ y0: 36, y1: 230, label: 'timeout seq 92', tone: 'run' }],
    state: { sendBase: '92', nextSeq: '120', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    msg: 'A manda Seq=92 y Seq=100, con el timer del 92 corriendo.',
  },
  {
    add: [
      { from: 'B', y0: 92, y1: 144, label: 'ACK=100', kind: 'ack', lost: true },
      { from: 'B', y0: 112, y1: 164, label: 'ACK=120', kind: 'ack' },
    ],
    brackets: [{ y0: 36, y1: 230, label: 'timeout seq 92', tone: 'run' }],
    marks: [{ side: 'B', y: 108, text: 'recibe los dos ✔', tone: 'good' }],
    state: { sendBase: '92', nextSeq: '120', timer: 'corriendo (seq 92)', timeout: '0,75 s' },
    msg: 'B manda ACK=100 y ACK=120. <strong>El ACK=100 se pierde</strong>… pero el ACK=120 llega <strong>antes del timeout</strong>.',
  },
  {
    brackets: [{ y0: 36, y1: 164, label: 'timeout seq 92', tone: 'stop' }],
    marks: [{ side: 'A', y: 164, text: 'SendBase = 120 ✔', tone: 'good' }],
    state: { sendBase: '120', nextSeq: '120', timer: 'apagado', timeout: '0,75 s' },
    msg: '<strong>ACK=120 significa "recibí TODO hasta el byte 119"</strong> — incluido lo que confirmaba el ACK perdido. A no retransmite <strong>ninguno</strong> de los dos segmentos. Esa es la ventaja del <strong>ACK acumulativo</strong>: un ACK posterior tapa la pérdida de uno anterior.',
  },
];

const FAST: Step[] = [
  {
    state: { sendBase: '92', nextSeq: '92', timer: 'apagado', timeout: '0,75 s', dup: 0 },
    msg: '<strong>Fig. 3.37 — Fast retransmit.</strong> El problema del timeout es que <strong>es largo</strong>: esperar a que venza agrega mucha demora. Veamos cómo TCP detecta la pérdida antes.',
  },
  {
    add: [
      { from: 'A', y0: 30, y1: 78, label: 'seq=92, 8 B', kind: 'data' },
      { from: 'A', y0: 42, y1: 90, label: 'seq=100, 20 B', kind: 'data', lost: true },
      { from: 'A', y0: 54, y1: 102, label: 'seq=120, 15 B', kind: 'data' },
      { from: 'A', y0: 66, y1: 114, label: 'seq=135, 6 B', kind: 'data' },
      { from: 'A', y0: 78, y1: 126, label: 'seq=141, 16 B', kind: 'data' },
    ],
    brackets: [{ y0: 132, y1: 320, label: 'timeout seq 100', tone: 'run' }],
    state: { sendBase: '92', nextSeq: '157', timer: 'corriendo', timeout: '0,75 s', dup: 0 },
    msg: 'A manda <strong>cinco segmentos seguidos</strong> (pipelining). El segundo, <strong>seq=100</strong>, <strong>se pierde</strong>.',
  },
  {
    add: [{ from: 'B', y0: 80, y1: 132, label: 'ack=100', kind: 'ack' }],
    brackets: [{ y0: 132, y1: 320, label: 'timeout seq 100', tone: 'run' }],
    marks: [{ side: 'B', y: 78, text: 'recibe 92 ✔', tone: 'good' }],
    state: { sendBase: '100', nextSeq: '157', timer: 'corriendo (seq 100)', timeout: '0,75 s', dup: 0 },
    row: 0,
    msg: 'B recibe el 92 en orden → <strong>ack=100</strong>. A avanza SendBase a 100 y el timer queda para el segmento 100.',
  },
  {
    add: [
      { from: 'B', y0: 104, y1: 156, label: 'ack=100', kind: 'ack' },
      { from: 'B', y0: 116, y1: 168, label: 'ack=100', kind: 'ack' },
      { from: 'B', y0: 128, y1: 180, label: 'ack=100', kind: 'ack' },
    ],
    brackets: [{ y0: 132, y1: 320, label: 'timeout seq 100', tone: 'run' }],
    marks: [{ side: 'B', y: 114, text: 'hueco: falta el 100', tone: 'bad' }],
    state: { sendBase: '100', nextSeq: '157', timer: 'corriendo (seq 100)', timeout: '0,75 s', dup: 3 },
    row: 2,
    msg: 'Llegan 120, 135 y 141 <strong>fuera de orden</strong>: hay un <strong>hueco</strong>. TCP no tiene NAK, así que B <strong>re-ACKea el último byte en orden</strong>: <strong>ack=100</strong> tres veces más → <strong>3 ACKs duplicados</strong> (fila 3 de la Tabla 3.2). B los guarda en el buffer, no los tira.',
  },
  {
    add: [{ from: 'A', y0: 184, y1: 238, label: 'seq=100, 20 B', kind: 'retx' }],
    brackets: [{ y0: 132, y1: 320, label: 'timeout seq 100', tone: 'run' }],
    marks: [{ side: 'A', y: 184, text: '⚡ fast retransmit', tone: 'bad' }],
    state: { sendBase: '100', nextSeq: '157', timer: 'corriendo (seq 100)', timeout: '0,75 s', dup: 3 },
    msg: 'Con el <strong>tercer ACK duplicado</strong>, A <strong>retransmite seq=100 de inmediato</strong> — mirá el corchete: el timeout todavía está lejísimos. ¿Por qué 3 y no 1? Porque un duplicado suelto puede ser solo un <strong>reordenamiento</strong>.',
  },
  {
    add: [{ from: 'B', y0: 242, y1: 294, label: 'ack=157', kind: 'ack' }],
    brackets: [{ y0: 132, y1: 294, label: 'timeout seq 100', tone: 'stop' }],
    marks: [
      { side: 'B', y: 238, text: 'tapa el hueco', tone: 'good' },
      { side: 'A', y: 294, text: 'SendBase = 157 ✔', tone: 'good' },
    ],
    state: { sendBase: '157', nextSeq: '157', timer: 'apagado', timeout: '0,75 s', dup: 0 },
    row: 3,
    msg: 'El 100 <strong>tapa el hueco</strong> y B ya tenía todo lo demás en el buffer → contesta <strong>ack=157</strong> (141 + 16): un solo ACK acumulativo confirma <strong>los cinco segmentos</strong>. Solo se retransmitieron 20 bytes, y mucho antes del timeout.',
  },
];

const TABLE = [
  ['Llega en orden, todo lo anterior ya ACKeado', 'ACK demorado: espera hasta 500 ms por otro segmento'],
  ['Llega en orden y hay otro esperando su ACK', 'Manda YA un único ACK acumulativo por los dos'],
  ['Llega fuera de orden (seq mayor al esperado): hueco', 'Manda YA un ACK duplicado con el byte esperado'],
  ['Llega un segmento que tapa (parte de) el hueco', 'Manda YA un ACK, si empieza en el borde inferior del hueco'],
];

@Component({
  selector: 'app-tcpscen-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">⏱ TCP: los escenarios de retransmisión (Figs. 3.34–3.37)</div>
          <div class="caption">Los mismos segmentos y números del libro, paso a paso.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'lost'" (click)="setMode('lost')">ACK perdido</button>
            <button [class.on]="mode() === 'premature'" (click)="setMode('premature')">Timeout prematuro</button>
            <button [class.on]="mode() === 'cumulative'" (click)="setMode('cumulative')">ACK acumulativo</button>
            <button [class.on]="mode() === 'fast'" (click)="setMode('fast')">Fast retransmit</button>
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
        <div class="seq">
          <svg viewBox="0 0 460 340" preserveAspectRatio="xMidYMid meet">
            <defs>
              @for (k of kinds; track k) {
                <marker [attr.id]="'ah-' + k + '-' + uid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" [attr.class]="'ah ' + k" />
                </marker>
              }
            </defs>

            <text [attr.x]="xa" y="16" class="host">Host A</text>
            <text [attr.x]="xb" y="16" class="host">Host B</text>
            <line [attr.x1]="xa" y1="24" [attr.x2]="xa" y2="330" class="tl" />
            <line [attr.x1]="xb" y1="24" [attr.x2]="xb" y2="330" class="tl" />
            <text [attr.x]="xa" y="338" class="time">tiempo ↓</text>
            <text [attr.x]="xb" y="338" class="time">tiempo ↓</text>

            @for (b of brackets(); track $index) {
              <g [attr.class]="'br ' + b.tone">
                <line x1="40" [attr.y1]="b.y0" x2="40" [attr.y2]="b.y1" />
                <line x1="40" [attr.y1]="b.y0" x2="48" [attr.y2]="b.y0" />
                <line x1="40" [attr.y1]="b.y1" x2="48" [attr.y2]="b.y1" />
                <text [attr.transform]="'translate(30,' + (b.y0 + b.y1) / 2 + ') rotate(-90)'">{{ b.label }}</text>
              </g>
            }

            @for (l of lines(); track $index) {
              <g [attr.class]="'msg ' + l.kind" [class.lostm]="l.lost">
                <line [attr.x1]="l.x0" [attr.y1]="l.y0" [attr.x2]="l.ex" [attr.y2]="l.ey"
                      [attr.marker-end]="l.lost || !l.done ? null : 'url(#ah-' + l.kind + '-' + uid + ')'" />
                @if (l.showLabel) {
                  <text [attr.transform]="'translate(' + l.lx + ',' + l.ly + ') rotate(' + l.ang + ')'" y="-4">{{ l.label }}</text>
                }
                @if (l.lost && l.done) {
                  <text [attr.x]="l.ex" [attr.y]="l.ey + 4" class="x">✕</text>
                  <text [attr.x]="l.ex" [attr.y]="l.ey + 15" class="xl">(pérdida)</text>
                }
              </g>
            }

            @for (m of marks(); track $index) {
              <text [attr.x]="m.side === 'A' ? xa - 7 : xb + 7" [attr.y]="m.y + 3"
                    [attr.text-anchor]="m.side === 'A' ? 'end' : 'start'" [attr.class]="'mk ' + (m.tone || 'info')">{{ m.text }}</text>
            }
          </svg>
        </div>

        <div class="side">
          <div class="panel">
            <div class="phead">📤 Estado del emisor (A)</div>
            <div class="kv"><span>SendBase</span><b>{{ st().sendBase }}</b></div>
            <div class="kv"><span>NextSeqNum</span><b>{{ st().nextSeq }}</b></div>
            <div class="kv"><span>Timer</span><b>{{ st().timer }}</b></div>
            <div class="kv"><span>TimeoutInterval</span><b [class.hot]="st().timeout.includes('×2')">{{ st().timeout }}</b></div>
            @if (mode() === 'fast') {
              <div class="kv"><span>ACKs duplicados</span><b [class.hot]="(st().dup ?? 0) >= 3">{{ st().dup ?? 0 }} / 3</b></div>
            }
          </div>
          <div class="panel">
            <div class="phead alt">📥 Tabla 3.2 — cuándo ACKea el receptor (RFC 5681)</div>
            @for (r of table; track $index; let i = $index) {
              <div class="tr" [class.on]="row() === i">
                <span class="ev">{{ r[0] }}</span>
                <span class="ac">→ {{ r[1] }}</span>
              </div>
            }
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
        @for (s of steps(); track $index; let i = $index) {
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
    .mode { display: flex; flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 9px; cursor: pointer; font-weight: 700; font-size: 0.74rem; }
    .mode button.on { background: #f59e0b; color: #1a1205; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: flex-start; }
    .seq { flex: 1; min-width: 0; background: radial-gradient(ellipse at 50% 40%, #1d2538 0%, #151b29 80%); border: 1px solid var(--border); border-radius: 10px; padding: 6px; }
    .seq svg { width: 100%; height: auto; display: block; }

    .host { fill: #fff; font-size: 12px; font-weight: 700; text-anchor: middle; }
    .time { fill: #5c6a8e; font-size: 9px; text-anchor: middle; }
    .tl { stroke: #4a5878; stroke-width: 1.2; stroke-dasharray: 2 3; }

    .msg line { stroke-width: 1.8; }
    .msg text { font-family: Consolas, monospace; font-size: 9.5px; text-anchor: middle; }
    .msg.data line { stroke: #79c0ff; } .msg.data text { fill: #9fd0ff; }
    .msg.ack line { stroke: #7ee787; } .msg.ack text { fill: #a6f0ad; }
    .msg.retx line { stroke: #ffd54f; } .msg.retx text { fill: #ffe082; }
    .msg.lostm line { stroke-dasharray: 4 3; opacity: 0.8; }
    .ah.data { fill: #79c0ff; } .ah.ack { fill: #7ee787; } .ah.retx { fill: #ffd54f; }
    .x { fill: #ff6b6b; font-size: 15px; font-weight: 800; text-anchor: middle; font-family: Arial, sans-serif; }
    .xl { fill: #ef9a9a; font-size: 8.5px; text-anchor: middle; font-family: Consolas, monospace; }

    .br line { stroke-width: 1.4; }
    .br text { font-size: 8.5px; text-anchor: middle; font-family: Consolas, monospace; }
    .br.run line { stroke: #ffd54f; } .br.run text { fill: #ffd54f; }
    .br.fired line { stroke: #ff6b6b; } .br.fired text { fill: #ef9a9a; }
    .br.stop line { stroke: #5c6a8e; } .br.stop text { fill: #8b95b5; }

    .mk { font-size: 9px; font-weight: 700; font-family: system-ui, sans-serif; }
    .mk.good { fill: #7ee787; } .mk.bad { fill: #ff8a80; } .mk.info { fill: #9aa4bf; }

    .side { width: 290px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .panel { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .phead { font-weight: 700; font-size: 0.76rem; color: #ffd54f; margin-bottom: 8px; } .phead.alt { color: #7ee787; }
    .kv { display: flex; justify-content: space-between; gap: 8px; font-size: 0.72rem; padding: 4px 0; border-bottom: 1px dashed #232b3e; }
    .kv:last-child { border-bottom: none; }
    .kv span { color: var(--text-dim); } .kv b { color: #cfe3ff; font-family: Consolas, monospace; text-align: right; }
    .kv b.hot { color: #ffd54f; }
    .tr { display: flex; flex-direction: column; gap: 2px; font-size: 0.66rem; line-height: 1.35; padding: 6px 7px; border-radius: 6px; border: 1px solid #232b3e; background: #161d2b; margin-bottom: 4px; opacity: 0.6; transition: opacity 0.3s, border-color 0.3s; }
    .tr.on { opacity: 1; border-color: #7ee787; background: #13241a; }
    .ev { color: var(--text); } .ac { color: #7ee787; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 820px) { .board { flex-direction: column; } .side { width: 100%; } }
  `,
})
export class TcpscenDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('lost');
  readonly steps = computed<Step[]>(() => {
    switch (this.mode()) {
      case 'lost': return LOST;
      case 'premature': return PREMATURE;
      case 'cumulative': return CUMULATIVE;
      default: return FAST;
    }
  });
  readonly kinds: Kind[] = ['data', 'ack', 'retx'];
  readonly table = TABLE;
  readonly xa = XA;
  readonly xb = XB;
  /** ids de markers únicos por instancia */
  readonly uid = Math.random().toString(36).slice(2, 8);

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].add?.length ? 1300 : 500;
  }
  protected override stepDwell(): number {
    return 4500;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  /** paso "vigente" para el estado (al terminar, el último) */
  private cur(): Step {
    const list = this.steps();
    const i = this.index();
    if (i < 0) return list[0];
    return list[Math.min(i, list.length - 1)];
  }

  st(): State {
    return this.cur().state;
  }
  row(): number {
    return this.index() < 0 ? -1 : this.cur().row ?? -1;
  }
  brackets(): Bracket[] {
    return this.index() < 0 ? [] : this.cur().brackets ?? [];
  }
  marks(): Mark[] {
    const list = this.steps();
    const upto = this.finished() ? list.length - 1 : this.index();
    const out: Mark[] = [];
    for (let s = 0; s <= upto; s++) out.push(...(list[s].marks ?? []));
    return out;
  }

  readonly lines = computed(() => {
    const list = this.steps();
    const i = this.index();
    if (i < 0) return [];
    const fin = this.finished();
    const p = this.ease(this.progress());
    const out = [];
    for (let s = 0; s <= Math.min(i, list.length - 1); s++) {
      for (const m of list[s].add ?? []) {
        const t = fin || s < i ? 1 : p;
        const x0 = m.from === 'A' ? XA : XB;
        const x1 = m.from === 'A' ? XB : XA;
        const frac = m.lost ? 0.58 : 1;
        const ex = x0 + (x1 - x0) * frac * t;
        const ey = m.y0 + (m.y1 - m.y0) * frac * t;
        let ang = (Math.atan2(m.y1 - m.y0, x1 - x0) * 180) / Math.PI;
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        const at = m.lost ? 0.3 : 0.42;
        out.push({
          kind: m.kind,
          lost: !!m.lost,
          label: m.label,
          x0, y0: m.y0, ex, ey,
          done: t >= 1,
          ang,
          lx: x0 + (x1 - x0) * at,
          ly: m.y0 + (m.y1 - m.y0) * at,
          showLabel: t > at * frac,
        });
      }
    }
    return out;
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      switch (this.mode()) {
        case 'lost': return '<strong>ACK perdido</strong>: el timeout dispara la retransmisión, el receptor descarta el duplicado gracias al nº de secuencia, y el TimeoutInterval se <strong>duplicó</strong>. Seguí con <strong>Timeout prematuro</strong>.';
        case 'premature': return '<strong>Timeout prematuro</strong>: no se perdió nada, pero se retransmitió el 92 de gusto. TCP retransmite <strong>solo el segmento más viejo</strong> y el ACK acumulativo evitó reenviar el 100. Seguí con <strong>ACK acumulativo</strong>.';
        case 'cumulative': return '<strong>ACK acumulativo</strong>: ACK=n confirma <em>todo</em> hasta n−1, así que un ACK posterior compensa la pérdida de uno anterior y no se retransmite nada. Seguí con <strong>Fast retransmit</strong>.';
        default: return '<strong>Fast retransmit</strong>: 3 ACKs duplicados = "se perdió el segmento siguiente al ACKeado" → se retransmite <strong>antes</strong> del timeout. El receptor guardó los fuera de orden, y un único ACK acumulativo (157) cerró todo.';
      }
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Recorré los cuatro escenarios en orden: son las cuatro figuras del libro.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
