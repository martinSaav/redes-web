import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* La trama 802.11 y sus direcciones (Kurose cap. 7): por qué necesita 3 direcciones
   (4 en ad hoc) mientras que Ethernet solo usa 2. Escenario H1 ↔ AP ↔ R1. */

interface Field { name: string; bytes: string; kind: 'ctl' | 'addr' | 'data' | 'crc'; hi?: boolean; }

const FIELDS: Field[] = [
  { name: 'Frame control', bytes: '2', kind: 'ctl' },
  { name: 'Duration', bytes: '2', kind: 'ctl' },
  { name: 'Address 1', bytes: '6', kind: 'addr' },
  { name: 'Address 2', bytes: '6', kind: 'addr' },
  { name: 'Address 3', bytes: '6', kind: 'addr' },
  { name: 'Seq control', bytes: '2', kind: 'ctl' },
  { name: 'Address 4', bytes: '6', kind: 'addr' },
  { name: 'Payload', bytes: '0–2312', kind: 'data' },
  { name: 'CRC', bytes: '4', kind: 'crc' },
];

interface FStep {
  msg: string;
  hi?: string[];         // campos resaltados
  pos?: number;          // 0..1 posición de la trama entre origen y destino (null = sin trama)
  kind?: '80211' | 'eth';
  addrs?: { a1: string; a2: string; a3: string };
  eth?: { dst: string; src: string };
  at?: 'h1' | 'ap' | 'r1';
}

const UP: FStep[] = [
  {
    msg: 'Escenario clásico: <strong>H1</strong> (host WiFi) le manda un paquete a <strong>R1</strong> (la interfaz del router en la LAN cableada), pasando por el <strong>AP</strong>. La pregunta de oral: <strong>¿por qué la trama 802.11 tiene 3 direcciones si Ethernet usa 2?</strong>',
    hi: ['Address 1', 'Address 2', 'Address 3'],
  },
  {
    msg: 'H1 arma la trama <strong>802.11</strong>. <strong>Address 1 = MAC del AP</strong>: es el <strong>receptor inmediato</strong> por el aire, quien tiene que <em>agarrar</em> esta trama ahora.',
    hi: ['Address 1'], kind: '80211', at: 'h1', pos: 0,
    addrs: { a1: 'AP', a2: 'H1', a3: 'R1' },
  },
  {
    msg: '<strong>Address 2 = MAC de H1</strong>: el <strong>transmisor</strong>. El AP la necesita para saber a quién mandarle el <strong>ACK</strong> de capa 2 (acordate: en WiFi cada trama se confirma).',
    hi: ['Address 2'], kind: '80211', at: 'h1', pos: 0,
    addrs: { a1: 'AP', a2: 'H1', a3: 'R1' },
  },
  {
    msg: '👉 <strong>Address 3 = MAC de R1</strong>: el <strong>destino final del otro lado del AP</strong>. <strong>Esta es la que Ethernet no necesita</strong>: sin ella, el AP recibiría la trama y <strong>no sabría a quién reenviarla</strong> en la LAN cableada.',
    hi: ['Address 3'], kind: '80211', at: 'h1', pos: 0,
    addrs: { a1: 'AP', a2: 'H1', a3: 'R1' },
  },
  {
    msg: 'La trama <strong>802.11 viaja por el aire</strong> hacia el AP, con sus tres direcciones a bordo.',
    hi: ['Address 1', 'Address 2', 'Address 3'], kind: '80211', pos: 1,
    addrs: { a1: 'AP', a2: 'H1', a3: 'R1' },
  },
  {
    msg: 'El <strong>AP hace de puente</strong>: saca el payload y arma una trama <strong>Ethernet</strong> con solo <strong>2 direcciones</strong> — destino <strong>R1</strong> (lo sacó del Address 3) y origen <strong>H1</strong> (del Address 2). El AP <strong>desaparece</strong> del encabezado: es transparente en capa 3.',
    kind: 'eth', at: 'ap', pos: 0, eth: { dst: 'R1', src: 'H1' },
  },
  {
    msg: 'La trama Ethernet llega a <strong>R1</strong>. Moraleja: la <strong>3ª dirección es el pegamento</strong> entre la red inalámbrica y la cableada — permite que el AP sea un <strong>puente de capa 2</strong> sin que las puntas se enteren.',
    kind: 'eth', pos: 1, eth: { dst: 'R1', src: 'H1' },
  },
];

const DOWN: FStep[] = [
  {
    msg: 'Ahora al revés: <strong>R1 → H1</strong>. R1 manda una trama <strong>Ethernet</strong> común: destino <strong>H1</strong>, origen <strong>R1</strong>. Solo <strong>2 direcciones</strong>, R1 ni sabe que H1 es inalámbrico.',
    kind: 'eth', at: 'r1', pos: 0, eth: { dst: 'H1', src: 'R1' },
  },
  {
    msg: 'La trama Ethernet llega al <strong>AP</strong> por el cable.',
    kind: 'eth', pos: 1, eth: { dst: 'H1', src: 'R1' },
  },
  {
    msg: 'El AP la convierte a <strong>802.11</strong>: <strong>Address 1 = H1</strong> (el receptor por el aire), <strong>Address 2 = AP</strong> (ahora <em>el AP</em> es quien transmite por radio), <strong>Address 3 = R1</strong> (de dónde vino originalmente).',
    hi: ['Address 1', 'Address 2', 'Address 3'], kind: '80211', at: 'ap', pos: 0,
    addrs: { a1: 'H1', a2: 'AP', a3: 'R1' },
  },
  {
    msg: 'Llega a <strong>H1</strong>. Gracias al <strong>Address 3</strong>, H1 sabe que el paquete <strong>venía de R1</strong> y no del AP. Sin esa tercera dirección, el origen real se perdería en el camino.',
    hi: ['Address 3'], kind: '80211', pos: 1,
    addrs: { a1: 'H1', a2: 'AP', a3: 'R1' },
  },
];

@Component({
  selector: 'app-frame80211-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🏷 La trama 802.11: por qué necesita 3 direcciones (y no 2)</div>
          <div class="caption">El AP como puente entre el aire y el cable — la pregunta clásica de oral.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'up'" (click)="setMode('up')">Subida H1→R1</button>
            <button [class.on]="mode() === 'down'" (click)="setMode('down')">Bajada R1→H1</button>
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

      <div class="framewrap">
        <div class="fwhead">Formato de la trama 802.11 <span>(bytes de cada campo)</span></div>
        <div class="fields">
          @for (f of fields; track f.name) {
            <div class="fld" [class]="'f-' + f.kind" [class.hi]="isHi(f.name)" [class.opt]="f.name === 'Address 4'">
              <span class="fn">{{ f.name }}</span>
              <span class="fb">{{ f.bytes }}</span>
            </div>
          }
        </div>
        <div class="fnote">
          <b>Address 4</b> se usa <b>solo en modo ad hoc</b> (sin AP, entre APs de un sistema de distribución). En modo infraestructura —el normal— van <b>3 direcciones</b>.
        </div>
      </div>

      <div class="canvas">
        <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="16" y1="55" x2="50" y2="55" class="wire air" />
          <line x1="50" y1="55" x2="86" y2="55" class="wire cable" />
        </svg>
        <div class="medlbl air" >📡 aire · 802.11</div>
        <div class="medlbl cable">🔌 cable · Ethernet</div>

        <div class="node h1" [class.at]="atNode('h1')"><strong>💻 H1</strong><small>host WiFi</small></div>
        <div class="node ap" [class.at]="atNode('ap')"><strong>📡 AP</strong><small>puente L2</small></div>
        <div class="node r1" [class.at]="atNode('r1')"><strong>🔀 R1</strong><small>router (LAN)</small></div>

        @if (frame(); as fr) {
          <div class="frame" [class.eth]="fr.kind === 'eth'" [style.left.%]="fr.x">
            <div class="ftag">{{ fr.kind === 'eth' ? 'Ethernet' : '802.11' }}</div>
            @if (fr.kind === 'eth') {
              <div class="fa"><span>dst</span><b>{{ fr.dst }}</b></div>
              <div class="fa"><span>src</span><b>{{ fr.src }}</b></div>
            } @else {
              <div class="fa" [class.glow]="isHi('Address 1')"><span>addr1</span><b>{{ fr.a1 }}</b></div>
              <div class="fa" [class.glow]="isHi('Address 2')"><span>addr2</span><b>{{ fr.a2 }}</b></div>
              <div class="fa" [class.glow]="isHi('Address 3')"><span>addr3</span><b>{{ fr.a3 }}</b></div>
            }
          </div>
        }
      </div>

      <div class="meaning">
        <div class="mrow mh"><span>campo</span><span>qué guarda</span><span>para qué sirve</span></div>
        <div class="mrow" [class.on]="isHi('Address 1')"><span class="mf">Address 1</span><span class="mv">MAC del <b>receptor inmediato</b> por radio</span><span>quién debe agarrar la trama ahora</span></div>
        <div class="mrow" [class.on]="isHi('Address 2')"><span class="mf">Address 2</span><span class="mv">MAC del <b>transmisor</b> por radio</span><span>a quién mandarle el <b>ACK</b></span></div>
        <div class="mrow" [class.on]="isHi('Address 3')"><span class="mf">Address 3</span><span class="mv">MAC de la <b>otra punta</b> (router/host del otro lado)</span><span>el <b>puente</b> aire ↔ cable</span></div>
        <div class="mrow dim"><span class="mf">Address 4</span><span class="mv">solo <b>ad hoc</b> / entre APs</span><span>redes sin infraestructura</span></div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 11px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
    .mode button.on { background: #ec4899; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .framewrap { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; margin-bottom: 12px; }
    .fwhead { font-size: 0.76rem; font-weight: 700; color: #fff; margin-bottom: 8px; } .fwhead span { font-weight: 400; color: var(--text-dim); font-size: 0.66rem; }
    .fields { display: flex; gap: 3px; overflow-x: auto; padding-bottom: 3px; }
    .fld { flex: 1; min-width: 62px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-radius: 6px; padding: 6px 4px; border: 1px solid #2d3750; background: #1a2132; transition: border-color 0.3s, box-shadow 0.3s, background 0.3s; }
    .fn { font-size: 0.58rem; color: var(--text-dim); text-align: center; line-height: 1.2; }
    .fb { font-family: Consolas, monospace; font-size: 0.68rem; font-weight: 800; color: #cfe3ff; }
    .fld.f-addr { background: #1b2438; } .fld.f-data { flex: 2.2; background: #16251c; } .fld.f-crc { background: #2a1d33; }
    .fld.opt { border-style: dashed; opacity: 0.6; }
    .fld.hi { border-color: #ffd54f; box-shadow: 0 0 14px rgba(255,213,79,0.4); background: #2b2a1a; }
    .fld.hi .fn { color: #ffe082; } .fld.hi .fb { color: #ffd54f; }
    .fnote { margin-top: 8px; padding-top: 8px; border-top: 1px solid #232b3e; font-size: 0.64rem; color: var(--text-dim); line-height: 1.45; } .fnote b { color: #cfe3ff; }

    .canvas { position: relative; min-height: 150px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke-width: 0.8; vector-effect: non-scaling-stroke; }
    .wire.air { stroke: #ec489988; stroke-dasharray: 3 2; } .wire.cable { stroke: #2ea04388; }
    .medlbl { position: absolute; top: 12%; font-size: 0.6rem; font-weight: 700; padding: 1px 7px; border-radius: 7px; }
    .medlbl.air { left: 20%; color: #f48fb1; background: rgba(236,72,153,0.1); border: 1px solid #ec489955; }
    .medlbl.cable { left: 60%; color: #7ee787; background: rgba(46,160,67,0.1); border: 1px solid #2ea04355; }

    .node { position: absolute; top: 55%; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; border-radius: 10px; padding: 6px 10px; min-width: 62px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25); transition: border-color 0.3s, box-shadow 0.3s; }
    .node strong { font-size: 0.74rem; color: #fff; } .node small { font-size: 0.54rem; color: rgba(255,255,255,0.8); }
    .node.h1 { left: 16%; background: #2e7d32; } .node.ap { left: 50%; background: #f68c1f; } .node.r1 { left: 86%; background: #3949ab; }
    .node.at { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.55); }

    .frame { position: absolute; top: 88%; transform: translate(-50%,-50%); z-index: 4; display: flex; align-items: center; gap: 5px; background: rgba(8,12,22,0.97); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 4px 8px; box-shadow: 0 0 14px rgba(255,213,79,0.3); }
    .frame.eth { border-color: #7ee787; box-shadow: 0 0 14px rgba(46,160,67,0.3); }
    .ftag { font-size: 0.55rem; font-weight: 800; color: #ffd54f; padding-right: 5px; border-right: 1px solid #2d3750; }
    .frame.eth .ftag { color: #7ee787; }
    .fa { display: flex; flex-direction: column; align-items: center; font-family: Consolas, monospace; line-height: 1.15; padding: 1px 4px; border-radius: 4px; transition: background 0.3s; }
    .fa span { font-size: 0.5rem; color: #8b95b5; } .fa b { font-size: 0.68rem; color: #cfe3ff; }
    .fa.glow { background: #2b2a1a; } .fa.glow b { color: #ffd54f; }

    .meaning { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .mrow { display: grid; grid-template-columns: 0.7fr 1.5fr 1.2fr; gap: 6px; font-size: 0.68rem; padding: 6px; border-radius: 6px; align-items: center; color: var(--text); }
    .mrow.mh { font-size: 0.56rem; text-transform: uppercase; color: #5c6a8e; font-weight: 700; }
    .mrow:not(.mh) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; }
    .mrow.on { border-color: #ffd54f; background: #221f14; }
    .mrow.dim { opacity: 0.55; }
    .mf { font-family: Consolas, monospace; font-weight: 800; color: #cfe3ff; }
    .mrow b { color: #fff; } .mrow .mv { color: var(--text); }

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

    @media (max-width: 700px) { .mrow { grid-template-columns: 1fr; gap: 2px; } .mrow.mh { display: none; } }
  `,
})
export class Frame80211Detail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'up' | 'down'>('up');
  readonly steps = computed<FStep[]>(() => (this.mode() === 'up' ? UP : DOWN));
  readonly fields = FIELDS;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(): number {
    return 1100;
  }
  protected override stepDwell(): number {
    return 4200;
  }

  setMode(m: 'up' | 'down'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): FStep {
    const list = this.steps();
    const i = this.index();
    if (i < 0) return list[0];
    return list[Math.min(i, list.length - 1)];
  }

  isHi(name: string): boolean {
    if (this.index() < 0) return false;
    const st = this.finished() ? this.steps()[this.steps().length - 1] : this.at();
    return (st.hi ?? []).includes(name);
  }

  atNode(n: 'h1' | 'ap' | 'r1'): boolean {
    if (this.index() < 0 || this.finished()) return false;
    return this.at().at === n;
  }

  /** trama posicionada en el trayecto correspondiente */
  readonly frame = computed(() => {
    const i = this.index();
    if (i < 0) return null;
    const st = this.finished() ? this.steps()[this.steps().length - 1] : this.steps()[i];
    if (!st.kind) return null;
    const p = this.finished() ? 1 : this.ease(this.progress());
    const base = st.pos ?? 0;
    // tramo: aire (16→50) para 802.11, cable (50→86) para ethernet; sentido según modo
    const up = this.mode() === 'up';
    let from: number, to: number;
    if (st.kind === '80211') { from = up ? 16 : 50; to = up ? 50 : 16; }
    else { from = up ? 50 : 86; to = up ? 86 : 50; }
    const x = base === 0 ? from : from + (to - from) * p;
    return {
      kind: st.kind, x,
      a1: st.addrs?.a1 ?? '', a2: st.addrs?.a2 ?? '', a3: st.addrs?.a3 ?? '',
      dst: st.eth?.dst ?? '', src: st.eth?.src ?? '',
    };
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'up'
        ? '<strong>La respuesta corta</strong>: Ethernet usa 2 direcciones porque el enlace es punto a punto lógico; 802.11 necesita una <strong>tercera</strong> porque el AP es un <strong>puente</strong> — hay que decir <em>quién agarra la trama por el aire</em> (addr1) y además <em>a quién va del otro lado</em> (addr3). Probá la vista <strong>Bajada</strong>.'
        : '<strong>En la bajada</strong> el addr2 pasa a ser el <strong>AP</strong> (es quien transmite por radio) y el addr3 sigue siendo <strong>R1</strong>, el origen real. Sin addr3, H1 creería que todo viene del AP. Esa es la función del tercer campo: <strong>preservar la punta del otro lado del puente</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: mirá qué MAC va en cada dirección y cómo el AP traduce entre 802.11 (3 direcciones) y Ethernet (2).';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
