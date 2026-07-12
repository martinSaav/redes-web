import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

/*
 * Carrera HTTP/1.1 vs HTTP/2 sobre UNA conexión persistente.
 * Recursos: foto.jpg (8 unidades), style.css (1), app.js (1).
 * H1: en serie → css/js esperan detrás de la foto (HOL de aplicación).
 * H2: frames intercalados → los chicos terminan enseguida.
 */

const T_END = 10.6; // "unidades de tiempo" totales
const SPEED_BASE = 0.9; // unidades por segundo a 1×

interface Bar {
  name: string;
  total: number;
  progress: number; // 0..1
  doneAt: number | null;
}

function h1Progress(t: number): [number, number, number] {
  return [Math.min(t / 8, 1), Math.max(0, Math.min(t - 8, 1)), Math.max(0, Math.min(t - 9, 1))];
}

function h2Progress(t: number): [number, number, number] {
  // 3 streams activos → 1/3 cada uno; css termina en t=3, js en t=3.2; después la foto a tasa completa
  const css = Math.min(t / 3, 1);
  const js = Math.min(t / 3.2, 1);
  let jpgUnits: number;
  if (t <= 3.2) jpgUnits = t / 3;
  else jpgUnits = 3.2 / 3 + (t - 3.2);
  return [Math.min(jpgUnits / 8, 1), css, js];
}

const ANNS: { t: number; text: string }[] = [
  { t: 0, text: 'Misma página, misma conexión TCP, mismo ancho de banda. Arriba <strong>HTTP/1.1</strong> (objetos en serie), abajo <strong>HTTP/2</strong> (frames binarios intercalados). ¡Carrera!' },
  { t: 1.2, text: 'En <strong>HTTP/1.1</strong> la foto grande va PRIMERA y ocupa la conexión entera. En <strong>HTTP/2</strong> los tres streams avanzan a la vez: cada uno recibe frames intercalados.' },
  { t: 3.4, text: '⚡ <strong>HTTP/2: css y js YA TERMINARON</strong> (t≈3) — la página ya puede renderizar y ejecutar. En HTTP/1.1 siguen en CERO, bloqueados detrás de la foto: eso es <strong>head-of-line blocking</strong>.' },
  { t: 8.1, text: 'Recién ahora (t=8) HTTP/1.1 terminó la foto y empieza con css… El workaround histórico era abrir 6 conexiones paralelas por dominio ("hacer trampa" al reparto de congestión de TCP).' },
  { t: 10.2, text: 'La foto tardó ~lo mismo en ambos (el ancho de banda es el que es). La diferencia: los recursos CHICOS y críticos llegaron 3× antes con HTTP/2.' },
];

@Component({
  selector: 'app-http2-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🏁 HTTP/1.1 vs HTTP/2: la carrera del head-of-line blocking</div>
          <div class="caption">Tres objetos (una foto pesada + css + js) por UNA conexión. Mirá quién puede renderizar antes.</div>
        </div>
        <div class="controls">
          <button class="ctl play" (click)="toggle()">
            {{ playing() ? '⏸ Pausa' : finished() ? '↺ Repetir' : '▶ Play' }}
          </button>
          <button class="ctl" (click)="reset()">↺</button>
          <div class="speeds">
            @for (s of speedOptions; track s) {
              <button class="spd" [class.on]="speed() === s" (click)="speed.set(s)">{{ s }}×</button>
            }
          </div>
          <div class="clock">t = {{ clock() }}</div>
        </div>
      </div>

      <div class="lanes">
        @for (lane of lanes(); track lane.title) {
          <div class="lane" [class.winner]="lane.h2">
            <div class="lhead">
              <strong>{{ lane.title }}</strong>
              <small>{{ lane.sub }}</small>
            </div>
            @for (b of lane.bars; track b.name) {
              <div class="brow">
                <span class="bname">{{ b.name }}</span>
                <div class="btrack" [class.striped]="lane.h2 && b.progress > 0 && b.progress < 1">
                  <div class="bfill" [class.img]="b.name.includes('jpg')" [style.width.%]="b.progress * 100"></div>
                </div>
                <span class="bdone" [class.ok]="b.doneAt !== null">
                  {{ b.doneAt !== null ? '✔ t=' + b.doneAt : b.progress > 0 ? '…' : 'esperando' }}
                </span>
              </div>
            }
          </div>
        }
      </div>

      <div class="status" [class.done]="finished()" [class.idle]="tU() === 0 && !playing()">
        <span [innerHTML]="statusMsg()"></span>
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
    .ctl:hover { background: #2d3750; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }
    .clock { font-family: Consolas, monospace; font-size: 0.82rem; color: #ffd54f; background: #0b0f19; border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; min-width: 70px; text-align: center; }

    .lanes { display: flex; flex-direction: column; gap: 12px; }
    .lane { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; transition: border-color 0.3s; }
    .lane.winner { border-color: #2ea04355; }
    .lhead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
    .lhead strong { color: #fff; font-size: 0.92rem; }
    .lhead small { color: var(--text-dim); font-size: 0.72rem; }
    .brow { display: grid; grid-template-columns: 110px 1fr 110px; gap: 10px; align-items: center; margin-bottom: 7px; }
    .bname { font-family: Consolas, monospace; font-size: 0.74rem; color: #cfe3ff; text-align: right; }
    .btrack { height: 18px; background: #0b0f19; border: 1px solid #2d3750; border-radius: 5px; overflow: hidden; position: relative; }
    .btrack.striped::after {
      content: ''; position: absolute; inset: 0;
      background: repeating-linear-gradient(90deg, transparent 0 6px, rgba(13,17,23,0.45) 6px 9px);
      pointer-events: none;
    }
    .bfill { height: 100%; background: linear-gradient(90deg, #1f6feb, #58a6ff); transition: none; }
    .bfill.img { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
    .bdone { font-family: Consolas, monospace; font-size: 0.7rem; color: #5c6a8e; }
    .bdone.ok { color: #7ee787; font-weight: 700; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
  `,
})
export class Http2Detail implements OnDestroy {
  readonly speedOptions = [0.5, 1, 2];
  readonly speed = signal(1);
  readonly playing = signal(false);
  readonly finished = signal(false);
  readonly tU = signal(0); // tiempo en "unidades"

  private rafId = 0;
  private lastTs = 0;

  clock(): string {
    return this.tU().toFixed(1);
  }

  readonly lanes = computed(() => {
    const t = this.tU();
    const [j1, c1, s1] = h1Progress(t);
    const [j2, c2, s2] = h2Progress(t);
    const bar = (name: string, p: number, doneT: number): Bar => ({
      name,
      total: 0,
      progress: p,
      doneAt: p >= 1 ? doneT : null,
    });
    return [
      {
        title: 'HTTP/1.1 · persistente',
        sub: 'un objeto por vez, en orden — el grande al frente bloquea',
        h2: false,
        bars: [bar('🖼 foto.jpg', j1, 8), bar('🎨 style.css', c1, 9), bar('⚙ app.js', s1, 10)],
      },
      {
        title: 'HTTP/2 · multiplexado',
        sub: 'los mensajes se parten en FRAMES que se intercalan (rayitas)',
        h2: true,
        bars: [bar('🖼 foto.jpg', j2, 10.2), bar('🎨 style.css', c2, 3), bar('⚙ app.js', s2, 3.2)],
      },
    ];
  });

  readonly statusMsg = computed(() => {
    const t = this.tU();
    if (this.finished()) {
      return '<strong>Moraleja doble</strong>: HTTP/2 arregla el HOL <em>de aplicación</em> con multiplexación + priorización + server push… pero sigue arriba de TCP: <strong>una pérdida frena TODOS los streams</strong> (TCP entrega en orden). Ese HOL de transporte lo resuelve <strong>HTTP/3 sobre QUIC</strong>: retransmisión por stream.';
    }
    if (t === 0 && !this.playing()) {
      return 'Presioná ▶ Play y mirá los recursos chicos: en HTTP/1.1 esperan detrás de la foto; en HTTP/2 terminan enseguida.';
    }
    let cur = ANNS[0].text;
    for (const a of ANNS) if (a.t <= t) cur = a.text;
    return cur;
  });

  toggle(): void {
    this.playing() ? this.pause() : this.play();
  }
  play(): void {
    if (this.finished()) {
      this.finished.set(false);
      this.tU.set(0);
    }
    this.playing.set(true);
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }
  pause(): void {
    this.playing.set(false);
    cancelAnimationFrame(this.rafId);
  }
  reset(): void {
    this.pause();
    this.finished.set(false);
    this.tU.set(0);
  }

  private readonly tick = (now: number): void => {
    if (!this.playing()) return;
    const dt = Math.min(now - this.lastTs, 100) / 1000;
    this.lastTs = now;
    const nt = this.tU() + dt * SPEED_BASE * this.speed();
    if (nt >= T_END) {
      this.tU.set(T_END);
      this.finished.set(true);
      this.pause();
      return;
    }
    this.tU.set(nt);
    this.rafId = requestAnimationFrame(this.tick);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
