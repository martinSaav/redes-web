import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Programación con sockets (Kurose 8ª ed., §2.7, Figs. 2.27–2.29).
   El código es el del libro (la app que pasa una frase a mayúsculas, puerto 12000);
   a la par se ve qué sockets existen y qué viaja entre ellos. */

type Mode = 'udp' | 'tcp';
type Anchor = 'c' | 'c2' | 'srv' | 'w' | 's1' | 's2';

interface Pkt { from: Anchor; to: Anchor; text: string; color: string; }
interface Step {
  c: number[];          // líneas resaltadas del cliente
  s: number[];          // líneas resaltadas del servidor
  pkts?: Pkt[];
  show: Anchor[];       // sockets visibles
  hs?: boolean;         // dibujar el handshake cliente → welcoming
  hs2?: boolean;
  pipe?: boolean;       // "caño" de la conexión 1
  pipe2?: boolean;
  table: string[][];    // sockets del servidor: [socket, local, remoto, estado]
  msg: string;
}

const UDP_C = [
  'clientSocket = socket(AF_INET, SOCK_DGRAM)',
  "message = input('Input lowercase sentence:')",
  'clientSocket.sendto(message.encode(),',
  '                    (serverName, serverPort))',
  'modifiedMessage, serverAddress = clientSocket.recvfrom(2048)',
  'clientSocket.close()',
];
const UDP_S = [
  'serverSocket = socket(AF_INET, SOCK_DGRAM)',
  "serverSocket.bind(('', serverPort))",
  'while True:',
  '    message, clientAddress = serverSocket.recvfrom(2048)',
  '    modifiedMessage = message.decode().upper()',
  '    serverSocket.sendto(modifiedMessage.encode(), clientAddress)',
];
const TCP_C = [
  'clientSocket = socket(AF_INET, SOCK_STREAM)',
  'clientSocket.connect((serverName, serverPort))',
  "sentence = input('Input lowercase sentence:')",
  'clientSocket.send(sentence.encode())',
  'modifiedSentence = clientSocket.recv(1024)',
  'clientSocket.close()',
];
const TCP_S = [
  'serverSocket = socket(AF_INET, SOCK_STREAM)',
  "serverSocket.bind(('', serverPort))",
  'serverSocket.listen(1)',
  'while True:',
  '    connectionSocket, addr = serverSocket.accept()',
  '    sentence = connectionSocket.recv(1024).decode()',
  '    capitalizedSentence = sentence.upper()',
  '    connectionSocket.send(capitalizedSentence.encode())',
  '    connectionSocket.close()',
];

const UDP: Step[] = [
  {
    c: [], s: [0, 1], show: ['srv'],
    table: [['serverSocket', ':12000', 'cualquiera', 'esperando']],
    msg: 'El servidor crea un socket <strong>UDP</strong> (<code>SOCK_DGRAM</code>) y lo <strong>asocia al puerto 12000</strong> con <code>bind</code>. Ese número es el que los clientes tienen que conocer de antemano.',
  },
  {
    c: [], s: [2, 3], show: ['srv'],
    table: [['serverSocket', ':12000', 'cualquiera', 'bloqueado en recvfrom']],
    msg: 'Queda <strong>bloqueado en <code>recvfrom</code></strong> esperando un datagrama. No hay conexión, no hay handshake: simplemente espera que llegue algo.',
  },
  {
    c: [0, 1], s: [3], show: ['srv', 'c'],
    table: [['serverSocket', ':12000', 'cualquiera', 'bloqueado en recvfrom']],
    msg: 'El cliente crea su socket. Fijate que <strong>no elige puerto</strong>: el sistema operativo le asigna uno <strong>efímero</strong> (acá, 51515).',
  },
  {
    c: [2, 3], s: [3], show: ['srv', 'c'],
    pkts: [{ from: 'c', to: 'srv', text: '"hola" → 10.0.0.9:12000', color: '#79c0ff' }],
    table: [['serverSocket', ':12000', 'cualquiera', 'bloqueado en recvfrom']],
    msg: '<code>sendto</code> manda el datagrama y — clave de UDP — <strong>adjunta la dirección de destino (IP, puerto) EN CADA envío</strong>. El socket UDP no "recuerda" a nadie.',
  },
  {
    c: [4], s: [3, 4], show: ['srv', 'c'],
    table: [['serverSocket', ':12000', 'cualquiera', 'atendiendo a 192.168.1.5:51515']],
    msg: '<code>recvfrom</code> devuelve <strong>dos cosas</strong>: el mensaje y la <strong>dirección del cliente</strong> (192.168.1.5:51515). La necesita para poder contestar, porque no hay conexión que la guarde.',
  },
  {
    c: [4], s: [5], show: ['srv', 'c'],
    pkts: [{ from: 'srv', to: 'c', text: '"HOLA" → 192.168.1.5:51515', color: '#7ee787' }],
    table: [['serverSocket', ':12000', 'cualquiera', 'esperando']],
    msg: 'Pasa el texto a mayúsculas y lo devuelve con <code>sendto</code>, otra vez <strong>poniendo la dirección destino a mano</strong>.',
  },
  {
    c: [5], s: [2, 3], show: ['srv', 'c', 'c2'],
    pkts: [{ from: 'c2', to: 'srv', text: '"chau" → :12000', color: '#c792ea' }],
    table: [['serverSocket', ':12000', 'cualquiera', 'bloqueado en recvfrom']],
    msg: 'El cliente lee la respuesta y cierra. Si llega <strong>otro cliente</strong>, su datagrama entra por <strong>el MISMO socket</strong>: UDP demultiplexa solo por <strong>(IP destino, puerto destino)</strong>. Un único socket atiende a todo el mundo.',
  },
];

const TCP: Step[] = [
  {
    c: [], s: [0, 1, 2], show: ['w'],
    table: [['serverSocket', ':12000', '—', 'LISTEN']],
    msg: 'El servidor crea un socket <strong>TCP</strong> (<code>SOCK_STREAM</code>), lo asocia al puerto 12000 y llama a <code>listen</code>. Ese es el <strong>welcoming socket</strong> (socket de bienvenida): la "puerta" donde golpean los clientes nuevos.',
  },
  {
    c: [], s: [3, 4], show: ['w'],
    table: [['serverSocket', ':12000', '—', 'LISTEN · bloqueado en accept()']],
    msg: 'Queda <strong>bloqueado en <code>accept()</code></strong>, esperando que algún cliente quiera conectarse.',
  },
  {
    c: [0, 1], s: [4], show: ['w', 'c'], hs: true,
    pkts: [{ from: 'c', to: 'w', text: 'SYN · SYN-ACK · ACK', color: '#ffd54f' }],
    table: [['serverSocket', ':12000', '—', 'LISTEN · handshake en curso']],
    msg: 'El cliente crea su socket y llama a <strong><code>connect</code></strong>: eso dispara el <strong>three-way handshake</strong> contra el <strong>welcoming socket</strong>. Lo hace TCP, en el sistema operativo: la aplicación ni ve los SYN.',
  },
  {
    c: [1], s: [4], show: ['w', 'c', 's1'], hs: true, pipe: true,
    table: [
      ['serverSocket', ':12000', '—', 'LISTEN'],
      ['connectionSocket', ':12000', '192.168.1.5:51515', 'ESTABLISHED'],
    ],
    msg: '👉 <strong>El punto clave</strong>: <code>accept()</code> devuelve un <strong>socket NUEVO, el connectionSocket</strong>, dedicado <strong>solo a este cliente</strong>. El welcoming socket sigue ahí, libre para el próximo. El servidor ahora tiene <strong>dos sockets</strong> (Fig. 2.28).',
  },
  {
    c: [2, 3], s: [5], show: ['w', 'c', 's1'], hs: true, pipe: true,
    pkts: [{ from: 'c', to: 's1', text: '"hola"', color: '#79c0ff' }],
    table: [
      ['serverSocket', ':12000', '—', 'LISTEN'],
      ['connectionSocket', ':12000', '192.168.1.5:51515', 'ESTABLISHED'],
    ],
    msg: 'El cliente hace <code>send</code> — y fijate que <strong>NO pone dirección de destino</strong> (comparalo con el <code>sendto</code> de UDP). La conexión ya está establecida: los bytes simplemente entran al "caño".',
  },
  {
    c: [4], s: [5, 6, 7], show: ['w', 'c', 's1'], hs: true, pipe: true,
    pkts: [{ from: 's1', to: 'c', text: '"HOLA"', color: '#7ee787' }],
    table: [
      ['serverSocket', ':12000', '—', 'LISTEN'],
      ['connectionSocket', ':12000', '192.168.1.5:51515', 'ESTABLISHED'],
    ],
    msg: 'El servidor lee del <strong>connectionSocket</strong> (no del welcoming), lo pasa a mayúsculas y lo devuelve por el mismo socket. Los datos viajan como <strong>flujo de bytes</strong>, confiable y en orden.',
  },
  {
    c: [5], s: [8, 3, 4], show: ['w', 'c', 'c2', 's2'], hs2: true, pipe2: true,
    table: [
      ['serverSocket', ':12000', '—', 'LISTEN'],
      ['connectionSocket', ':12000', '192.168.1.7:60001', 'ESTABLISHED'],
    ],
    msg: 'Cada uno cierra su socket, y el servidor vuelve al <code>accept()</code>. Llega <strong>otro cliente</strong> → otro handshake → <strong>otro connectionSocket</strong>. Todos usan el puerto local 12000, pero TCP los distingue por la <strong>cuádrupla</strong> (IP y puerto de origen y de destino).',
  },
];

const POS: Record<Anchor, { x: number; y: number }> = {
  c: { x: 100, y: 128 },
  c2: { x: 100, y: 196 },
  srv: { x: 322, y: 110 },
  w: { x: 322, y: 62 },
  s1: { x: 322, y: 128 },
  s2: { x: 322, y: 196 },
};

@Component({
  selector: 'app-socket-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔌 Sockets: UDP vs TCP con el código del libro (§2.7)</div>
          <div class="caption">La línea de código que se ejecuta, y qué pasa con los sockets en ese momento.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'udp'" (click)="setMode('udp')">UDP (Fig. 2.27)</button>
            <button [class.on]="mode() === 'tcp'" (click)="setMode('tcp')">TCP (Figs. 2.28–2.29)</button>
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

      <div class="viz">
        <svg viewBox="0 0 420 232" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="100" cy="132" rx="70" ry="96" class="proc" />
          <ellipse cx="322" cy="132" rx="78" ry="96" class="proc" />
          <text x="100" y="22" class="pname">proceso cliente</text>
          <text x="322" y="22" class="pname">proceso servidor</text>

          @if (on('hs')) {
            <line [attr.x1]="pos.c.x + 14" [attr.y1]="pos.c.y" [attr.x2]="pos.w.x - 14" [attr.y2]="pos.w.y" class="hs" />
            <text x="208" y="86" class="hsl" transform="rotate(-15 208 86)">three-way handshake</text>
          }
          @if (on('hs2')) {
            <line [attr.x1]="pos.c2.x + 14" [attr.y1]="pos.c2.y" [attr.x2]="pos.w.x - 14" [attr.y2]="pos.w.y" class="hs" />
          }
          @if (on('pipe')) {
            <rect [attr.x]="pos.c.x + 14" [attr.y]="pos.c.y - 7" [attr.width]="pos.s1.x - pos.c.x - 28" height="14" rx="7" class="pipe" />
          }
          @if (on('pipe2')) {
            <rect [attr.x]="pos.c2.x + 14" [attr.y]="pos.c2.y - 7" [attr.width]="pos.s2.x - pos.c2.x - 28" height="14" rx="7" class="pipe" />
          }

          @for (a of anchors(); track a.id) {
            <g class="sock" [class]="'sock k-' + a.id">
              <rect [attr.x]="a.x - 13" [attr.y]="a.y - 11" width="26" height="22" rx="4" />
              <text [attr.x]="a.lx" [attr.y]="a.y - 1" [attr.text-anchor]="a.anchor" class="sl">{{ a.label }}</text>
              <text [attr.x]="a.lx" [attr.y]="a.y + 10" [attr.text-anchor]="a.anchor" class="ss">{{ a.sub }}</text>
            </g>
          }

          @for (p of pkts(); track $index) {
            <g [attr.transform]="'translate(' + p.x + ',' + p.y + ')'">
              <rect x="-62" y="-9" width="124" height="18" rx="5" class="pk" [attr.stroke]="p.color" />
              <text y="4" class="pkt" [attr.fill]="p.color">{{ p.text }}</text>
            </g>
          }
        </svg>
      </div>

      <div class="code">
        <div class="col">
          <div class="chead">💻 {{ mode() === 'udp' ? 'UDPClient.py' : 'TCPClient.py' }}</div>
          @for (l of cCode(); track $index; let i = $index) {
            <pre class="ln" [class.hi]="cur().c.includes(i)">{{ l }}</pre>
          }
        </div>
        <div class="col">
          <div class="chead">🖥 {{ mode() === 'udp' ? 'UDPServer.py' : 'TCPServer.py' }}</div>
          @for (l of sCode(); track $index; let i = $index) {
            <pre class="ln" [class.hi]="cur().s.includes(i)">{{ l }}</pre>
          }
        </div>
      </div>

      <div class="tbl">
        <div class="thead">🗂 Sockets abiertos en el servidor</div>
        <div class="tr th"><span>socket</span><span>local</span><span>remoto</span><span>estado</span></div>
        @for (r of cur().table; track $index) {
          <div class="tr"><span class="tn">{{ r[0] }}</span><span>{{ r[1] }}</span><span>{{ r[2] }}</span><span class="ts">{{ r[3] }}</span></div>
        }
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
    .mode { display: flex; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; }
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #4caf50; color: #0d1a0e; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .viz { background: radial-gradient(ellipse at 50% 50%, #1d2538 0%, #151b29 80%); border: 1px solid var(--border); border-radius: 10px; padding: 6px; }
    .viz svg { width: 100%; max-height: 330px; display: block; }
    .proc { fill: rgba(255,255,255,0.025); stroke: #4a5878; stroke-width: 1.2; }
    .pname { fill: #cfe3ff; font-size: 11px; font-weight: 700; text-anchor: middle; }
    .hs { stroke: #ffd54f; stroke-width: 1.6; stroke-dasharray: 5 3; }
    .hsl { fill: #ffd54f; font-size: 9px; text-anchor: middle; font-family: Consolas, monospace; }
    .pipe { fill: rgba(121,192,255,0.12); stroke: #79c0ff; stroke-width: 1; }
    .sock rect { fill: #1f6feb; stroke: #9fd0ff; stroke-width: 1.2; }
    .sock.k-w rect { fill: #b45309; stroke: #ffd54f; }
    .sock.k-srv rect { fill: #2e7d32; stroke: #7ee787; }
    .sock.k-s1 rect, .sock.k-s2 rect { fill: #6d28d9; stroke: #c792ea; }
    .sl { fill: #fff; font-size: 9.5px; font-weight: 700; font-family: Consolas, monospace; }
    .ss { fill: #8b95b5; font-size: 8px; font-family: Consolas, monospace; }
    .pk { fill: rgba(8,12,22,0.95); stroke-width: 1.3; }
    .pkt { font-size: 8.5px; text-anchor: middle; font-family: Consolas, monospace; font-weight: 700; }

    .code { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .col { background: #0b0f19; border: 1px solid var(--border); border-radius: 10px; padding: 8px; min-width: 0; overflow-x: auto; }
    .chead { font-size: 0.72rem; font-weight: 700; color: #7ee787; margin-bottom: 6px; }
    .ln { margin: 0; padding: 2px 6px; font-family: Consolas, monospace; font-size: 0.68rem; color: #8b95b5; white-space: pre; border-left: 3px solid transparent; border-radius: 3px; transition: background 0.25s, color 0.25s; }
    .ln.hi { background: #2b2a1a; color: #ffe082; border-left-color: #ffd54f; }

    .tbl { margin-top: 10px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 9px; }
    .thead { font-size: 0.74rem; font-weight: 700; color: #ffd54f; margin-bottom: 6px; }
    .tr { display: grid; grid-template-columns: 1.2fr 0.6fr 1.2fr 1.4fr; gap: 6px; font-family: Consolas, monospace; font-size: 0.66rem; padding: 4px 6px; border-radius: 5px; color: var(--text); }
    .tr:not(.th) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; }
    .tr.th { color: #5c6a8e; font-size: 0.58rem; text-transform: uppercase; font-weight: 700; }
    .tn { color: #c792ea; font-weight: 700; } .ts { color: #7ee787; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }
    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 760px) {
      .code { grid-template-columns: 1fr; }
      .tr { grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class SocketDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('tcp');
  readonly steps = computed<Step[]>(() => (this.mode() === 'udp' ? UDP : TCP));
  readonly cCode = computed(() => (this.mode() === 'udp' ? UDP_C : TCP_C));
  readonly sCode = computed(() => (this.mode() === 'udp' ? UDP_S : TCP_S));
  readonly pos = POS;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].pkts?.length ? 1300 : 500;
  }
  protected override stepDwell(): number {
    return 4300;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  readonly cur = computed<Step>(() => {
    const list = this.steps();
    const i = this.index();
    if (i < 0) return { c: [], s: [], show: [], table: [], msg: '' };
    return list[Math.min(i, list.length - 1)];
  });

  on(k: 'hs' | 'hs2' | 'pipe' | 'pipe2'): boolean {
    return !!this.cur()[k];
  }

  readonly anchors = computed(() => {
    const labels: Record<Anchor, [string, string]> = {
      c: ['clientSocket', ':51515'],
      c2: ['otro cliente', ':60001'],
      srv: ['serverSocket', ':12000'],
      w: ['welcoming', ':12000 LISTEN'],
      s1: ['connection', '↔ :51515'],
      s2: ['connection', '↔ :60001'],
    };
    return this.cur().show.map((id) => {
      const p = POS[id];
      const left = id === 'c' || id === 'c2';
      return {
        id, x: p.x, y: p.y,
        label: labels[id][0], sub: labels[id][1],
        lx: left ? p.x - 17 : p.x + 17,
        anchor: left ? 'end' : 'start',
      };
    });
  });

  readonly pkts = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [];
    const st = this.steps()[i];
    const t = this.ease(this.progress());
    return (st.pkts ?? []).map((k) => {
      const a = POS[k.from];
      const b = POS[k.to];
      return { text: k.text, color: k.color, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - 16 };
    });
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'udp'
        ? '<strong>UDP</strong>: un solo socket en el servidor para todos, sin conexión. Cada <code>sendto</code> lleva la dirección destino y <code>recvfrom</code> devuelve la del remitente. Mirá ahora <strong>TCP</strong> para ver la diferencia.'
        : '<strong>TCP</strong>: el servidor tiene un <strong>welcoming socket</strong> (para aceptar clientes nuevos) y un <strong>connectionSocket por cliente</strong>, creado por <code>accept()</code>. <code>connect</code> dispara el handshake, y después <code>send</code>/<code>recv</code> no llevan dirección: la conexión ya la tiene.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Recorré TCP y después UDP: las diferencias están en qué sockets existen y en si cada envío lleva o no la dirección destino.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
