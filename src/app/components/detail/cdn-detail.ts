import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

interface Pos {
  x: number;
  y: number;
}

interface CdnStep {
  from: Pos;
  to: Pos;
  text: string;
  color?: string;
  msg: string;
  static?: boolean;
  choose?: boolean; // a partir de acá, el cluster cercano queda "elegido"
}

const PC: Pos = { x: 10, y: 72 };
const LOCAL: Pos = { x: 32, y: 34 };
const AUTH: Pos = { x: 66, y: 12 };
const KING: Pos = { x: 66, y: 48 };
const NEAR: Pos = { x: 44, y: 86 };
const FAR: Pos = { x: 88, y: 82 };

const STEPS: CdnStep[] = [
  {
    from: PC, to: PC, text: '🎬 video.netcinema.com/6Y7B23V', static: true,
    msg: 'Querés ver un video de <strong>NetCinema</strong>. Pero NetCinema no reparte los videos él mismo: <strong>contrató a KingCDN</strong>, que tiene clusters replicados por todo el mundo. ¿Cómo llegás al cluster correcto? Con DNS.',
  },
  {
    from: PC, to: LOCAL, text: '¿A de video.netcinema.com?',
    msg: 'Consulta <strong>recursiva</strong> al Local DNS, como siempre.',
  },
  {
    from: LOCAL, to: AUTH, text: '¿A de video.netcinema.com?',
    msg: 'El Local resuelve iterativamente (root → TLD → …) hasta el <strong>authoritative de NetCinema</strong>.',
  },
  {
    from: AUTH, to: LOCAL, text: 'CNAME: a1105.kingcdn.com', color: '#ce93d8',
    msg: '<strong>Acá está el truco</strong>: el authoritative NO devuelve una IP. Devuelve un <strong>CNAME</strong> — un alias que apunta a un nombre <strong>del dominio de la CDN</strong>. Con eso, NetCinema le "pasa la posta" a KingCDN.',
  },
  {
    from: LOCAL, to: KING, text: '¿A de a1105.kingcdn.com?',
    msg: 'La resolución sigue, pero ahora contra el <strong>DNS de KingCDN</strong> — que es de la CDN y puede decidir qué responder.',
  },
  {
    from: KING, to: KING, text: '🤔 eligiendo cluster…', static: true, choose: true,
    msg: 'El DNS de la CDN mira <strong>la IP del resolver que pregunta</strong> (asume que estás cerca de tu resolver) + <strong>mediciones en tiempo real</strong> de carga y demora… y elige el cluster <strong>PARA VOS</strong>: el cercano ✔, no el del otro continente ✖.',
  },
  {
    from: KING, to: LOCAL, text: 'A: 190.2.14.25 (cluster cercano)', color: '#80d8ff',
    msg: 'Responde con la IP del <strong>cluster elegido</strong>. Es DNS haciendo, de paso, <strong>balanceo de carga global</strong>. (Algunas CDNs usan además IP anycast: la misma IP anunciada por BGP desde muchos puntos.)',
  },
  {
    from: LOCAL, to: PC, text: 'A: 190.2.14.25 ✔', color: '#80d8ff',
    msg: 'El Local cachea (con TTL corto, para poder re-balancear) y entrega. El browser ni se enteró de toda la delegación.',
  },
  {
    from: PC, to: NEAR, text: 'TCP + GET manifest',
    msg: 'Conexión TCP directa con el cluster cercano y pedido del <strong>manifest</strong>: el archivo que describe en qué <strong>tasas de bits</strong> está codificado el video y dónde está cada chunk.',
  },
  {
    from: NEAR, to: PC, text: '🎬 chunks DASH (calidad adaptativa)', color: '#7ee787',
    msg: '<strong>DASH</strong>: el CLIENTE mide su ancho de banda y pide, <strong>chunk a chunk</strong>, la versión que puede bancar en ese momento. La inteligencia está en el cliente → alcanza con servidores HTTP comunes y atraviesa NATs sin drama.',
  },
];

@Component({
  selector: 'app-cdn-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎬 CDN: DNS + CNAME eligiendo el servidor por vos</div>
          <div class="caption">Cómo un video de NetCinema termina saliendo del cluster de KingCDN más cercano a tu casa.</div>
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
        <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line [attr.x1]="pc.x" [attr.y1]="pc.y" [attr.x2]="local.x" [attr.y2]="local.y" />
          <line [attr.x1]="local.x" [attr.y1]="local.y" [attr.x2]="auth.x" [attr.y2]="auth.y" />
          <line [attr.x1]="local.x" [attr.y1]="local.y" [attr.x2]="king.x" [attr.y2]="king.y" />
          <line [attr.x1]="pc.x" [attr.y1]="pc.y" [attr.x2]="near.x" [attr.y2]="near.y" />
          <line class="dim" [attr.x1]="king.x" [attr.y1]="king.y" [attr.x2]="near.x" [attr.y2]="near.y" />
          <line class="dim" [attr.x1]="king.x" [attr.y1]="king.y" [attr.x2]="far.x" [attr.y2]="far.y" />
        </svg>

        <div class="node pcn" [class.active]="active(pc)" [style.left.%]="pc.x" [style.top.%]="pc.y">
          <strong>💻 Tu PC</strong><small>browser</small>
        </div>
        <div class="node localn" [class.active]="active(local)" [style.left.%]="local.x" [style.top.%]="local.y">
          <strong>📡 Local DNS</strong><small>resolver del ISP</small>
        </div>
        <div class="node authn" [class.active]="active(auth)" [style.left.%]="auth.x" [style.top.%]="auth.y">
          <strong>🏢 Auth. NetCinema</strong><small>dns.netcinema.com</small>
        </div>
        <div class="node kingn" [class.active]="active(king)" [style.left.%]="king.x" [style.top.%]="king.y">
          <strong>👑 DNS de KingCDN</strong><small>decide el cluster</small>
        </div>
        <div class="node nearn" [class.chosen]="chosen()" [class.active]="active(near)" [style.left.%]="near.x" [style.top.%]="near.y">
          <strong>🗄 Cluster cercano</strong><small>190.2.14.25 · a 8 ms</small>
          @if (chosen()) {
            <span class="pick ok">✔ elegido</span>
          }
        </div>
        <div class="node farn" [class.dimmed]="chosen()" [style.left.%]="far.x" [style.top.%]="far.y">
          <strong>🗄 Cluster lejano</strong><small>otro continente · 180 ms</small>
          @if (chosen()) {
            <span class="pick no">✖ descartado</span>
          }
        </div>

        @if (card(); as c) {
          <div class="qcard" [style.left.%]="c.x" [style.top.%]="c.y"
               [style.border-color]="c.color" [style.box-shadow]="'0 0 14px ' + c.color + '55'">
            {{ c.text }}
          </div>
        }
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
      position: relative; min-height: 360px;
      background: radial-gradient(ellipse at 45% 50%, #202a40 0%, #171e2e 80%);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wires line { stroke: #39445f; stroke-width: 0.5; stroke-dasharray: 1 1.6; vector-effect: non-scaling-stroke; }
    .wires line.dim { stroke: #262f47; }

    .node {
      position: absolute; transform: translate(-50%, -50%); z-index: 2;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      border-radius: 10px; padding: 7px 11px; min-width: 110px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); border: 1.5px solid rgba(0, 0, 0, 0.25);
      transition: box-shadow 0.25s, border-color 0.25s, opacity 0.4s;
    }
    .node strong { font-size: 0.76rem; color: #fff; }
    .node small { font-size: 0.6rem; color: rgba(255, 255, 255, 0.85); }
    .node.pcn { background: #2e7d32; }
    .node.localn { background: #f68c1f; }
    .node.authn { background: #7b1fa2; }
    .node.kingn { background: #c62828; }
    .node.nearn { background: #1565c0; }
    .node.farn { background: #455a64; }
    .node.active { border-color: #fff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.35); }
    .node.chosen { border-color: #2ea043; box-shadow: 0 0 16px rgba(46, 160, 67, 0.5); }
    .node.dimmed { opacity: 0.45; }
    .pick { font-size: 0.6rem; font-weight: 800; margin-top: 3px; padding: 1px 8px; border-radius: 8px; }
    .pick.ok { background: #16281c; color: #7ee787; border: 1px solid #2ea043; }
    .pick.no { background: #2b1618; color: #ef9a9a; border: 1px solid #ef535055; }

    .qcard {
      position: absolute; transform: translate(-50%, -50%); z-index: 3;
      background: rgba(8, 12, 22, 0.96); border: 1.5px solid #ffd54f; border-radius: 8px;
      padding: 5px 9px; font-family: Consolas, monospace; font-size: 0.68rem; color: #e6e9f0;
      white-space: nowrap;
    }

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
  `,
})
export class CdnDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;
  readonly pc = PC;
  readonly local = LOCAL;
  readonly auth = AUTH;
  readonly king = KING;
  readonly near = NEAR;
  readonly far = FAR;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(i: number): number {
    return STEPS[i].static ? 500 : 1400;
  }
  protected override stepDwell(i: number): number {
    return 3100;
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

  readonly chosen = computed(() => {
    const i = this.index();
    if (this.finished()) return true;
    if (i < 0) return false;
    const chooseIdx = STEPS.findIndex((s) => s.choose);
    return i > chooseIdx || (i === chooseIdx && this.progress() >= 1);
  });

  active(p: Pos): boolean {
    const i = this.index();
    if (i < 0 || this.finished()) return false;
    const s = STEPS[i];
    return (s.from.x === p.x && s.from.y === p.y) || (s.to.x === p.x && s.to.y === p.y);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>La cadena completa</strong>: CNAME delega en la CDN → el DNS de la CDN elige el cluster por cercanía y carga → DASH adapta la calidad chunk a chunk. Dos filosofías de despliegue: <strong>enter deep</strong> (miles de clusters chicos dentro de los ISPs — Akamai) vs <strong>bring home</strong> (clusters grandes en IXPs — Limelight).';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play y prestá atención al paso del CNAME: es el momento exacto en que NetCinema le pasa el control a la CDN.';
    return STEPS[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
