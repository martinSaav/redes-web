import { ChangeDetectionStrategy, Component, OnDestroy, computed } from '@angular/core';
import { SteppedAnim } from './stepped';

/* CSMA/CA con tiempos (Kurose cap. 7): DIFS, backoff aleatorio que se CONGELA
   con el canal ocupado (≠ Ethernet), SIFS más corto que DIFS → el ACK tiene prioridad. */

type SegKind = 'busy' | 'difs' | 'slot' | 'frozen' | 'tx' | 'sifs' | 'ack';
interface Seg { kind: SegKind; label: string; w: number; cnt?: number; }

interface CStep {
  segs: Seg[];
  cnt: number | null;     // valor del contador de backoff
  state: string;          // estado del contador
  stateKind: 'wait' | 'count' | 'frozen' | 'go' | 'done';
  msg: string;
}

const S_BUSY_A: Seg = { kind: 'busy', label: 'A transmitiendo', w: 15 };
const S_DIFS: Seg = { kind: 'difs', label: 'DIFS', w: 5 };
const slot = (n: number): Seg => ({ kind: 'slot', label: '', w: 4, cnt: n });

const STEPS: CStep[] = [
  {
    segs: [S_BUSY_A],
    cnt: null, state: 'canal OCUPADO', stateKind: 'wait',
    msg: 'La estación <strong>A</strong> está transmitiendo. <strong>B</strong> quiere transmitir, escucha el canal (<em>carrier sense</em>) y lo encuentra <strong>ocupado</strong> → <strong>no interrumpe</strong>, espera a que termine.',
  },
  {
    segs: [S_BUSY_A, S_DIFS],
    cnt: null, state: 'esperando DIFS', stateKind: 'wait',
    msg: 'A terminó. Pero B <strong>no transmite de una</strong>: primero espera un <strong>DIFS</strong> (Distributed Inter-Frame Space) con el canal libre. Es el "tiempo de cortesía" antes de que cualquiera pueda pelear por el canal.',
  },
  {
    segs: [S_BUSY_A, S_DIFS, slot(5), slot(4), slot(3)],
    cnt: 3, state: 'contando…', stateKind: 'count',
    msg: 'Pasado el DIFS, B <strong>no transmite todavía</strong>: elige un <strong>backoff aleatorio</strong> (acá 5 slots) y lo va <strong>decrementando de a 1</strong> mientras el canal siga libre. <strong>Este random es el corazón del "CA"</strong>: si dos estaban esperando, van a elegir números distintos y <strong>no chocan</strong>.',
  },
  {
    segs: [S_BUSY_A, S_DIFS, slot(5), slot(4), slot(3), { kind: 'frozen', label: 'C transmite → contador CONGELADO en 2', w: 16 }],
    cnt: 2, state: '❄ CONGELADO en 2', stateKind: 'frozen',
    msg: '👉 <strong>El detalle que más se pregunta</strong>: llega <strong>otra estación (C)</strong> y ocupa el canal. El contador de B <strong>NO se reinicia</strong>: <strong>se CONGELA</strong> en el valor que iba (2). En Ethernet (CSMA/CD) se sortea de nuevo; acá <strong>se guarda lo ya esperado</strong>.',
  },
  {
    segs: [S_BUSY_A, S_DIFS, slot(5), slot(4), slot(3), { kind: 'frozen', label: 'C transmite → congelado', w: 16 }, S_DIFS, slot(2), slot(1)],
    cnt: 1, state: 'retoma desde 2', stateKind: 'count',
    msg: 'C terminó → otra vez <strong>DIFS</strong>, y B <strong>retoma el conteo desde donde quedó</strong> (2 → 1), no desde 5. Esto le da <strong>equidad</strong>: el que ya esperó mucho tiene ventaja sobre el que recién llega.',
  },
  {
    segs: [S_BUSY_A, S_DIFS, slot(5), slot(4), slot(3), { kind: 'frozen', label: 'C transmite → congelado', w: 16 }, S_DIFS, slot(2), slot(1), slot(0), { kind: 'tx', label: 'B TRANSMITE su trama', w: 18 }],
    cnt: 0, state: '¡0! → transmite', stateKind: 'go',
    msg: 'El contador llega a <strong>0</strong> → <strong>B transmite</strong>. Ojo: como no puede detectar colisiones, transmite la trama <strong>entera</strong> sin saber todavía si llegó bien.',
  },
  {
    segs: [S_BUSY_A, S_DIFS, slot(5), slot(4), slot(3), { kind: 'frozen', label: 'C transmite → congelado', w: 16 }, S_DIFS, slot(2), slot(1), slot(0), { kind: 'tx', label: 'B TRANSMITE', w: 18 }, { kind: 'sifs', label: 'SIFS', w: 3 }, { kind: 'ack', label: 'ACK', w: 7 }],
    cnt: null, state: 'ACK recibido ✔', stateKind: 'done',
    msg: 'El receptor espera un <strong>SIFS</strong> —<strong>más corto que el DIFS</strong>— y manda el <strong>ACK</strong>. Ese detalle es intencional: como SIFS &lt; DIFS, <strong>el ACK sale antes de que nadie más pueda arrancar</strong> → el ACK tiene <strong>prioridad</strong> y nadie se lo pisa.',
  },
];

@Component({
  selector: 'app-csmaca-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">⏱ CSMA/CA en el tiempo: DIFS, backoff congelado y SIFS</div>
          <div class="caption">Por qué el backoff NO se reinicia (≠ Ethernet) y por qué el ACK siempre gana la carrera.</div>
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

      <div class="tlwrap">
        <div class="tlhead">
          <span>línea de tiempo del canal →</span>
          <span class="cnt" [class]="'k-' + cur().stateKind">
            backoff de B: <b>{{ cur().cnt === null ? '—' : cur().cnt }}</b> · {{ cur().state }}
          </span>
        </div>
        <div class="timeline">
          @for (s of cur().segs; track $index) {
            <div class="seg" [class]="'s-' + s.kind" [style.flex]="s.w">
              @if (s.kind === 'slot') {
                <span class="slotn">{{ s.cnt }}</span>
              } @else {
                <span class="seglbl">{{ s.label }}</span>
              }
            </div>
          }
          @if (cur().segs.length === 0) { <div class="empty">(presioná Play)</div> }
        </div>
        <div class="tlkey">
          <span class="ky"><i class="sw s-busy"></i> canal ocupado (otro transmite)</span>
          <span class="ky"><i class="sw s-difs"></i> DIFS (espera obligatoria)</span>
          <span class="ky"><i class="sw s-slot"></i> slot de backoff (cuenta atrás)</span>
          <span class="ky"><i class="sw s-frozen"></i> contador congelado</span>
          <span class="ky"><i class="sw s-tx"></i> B transmite</span>
          <span class="ky"><i class="sw s-sifs"></i> SIFS</span>
          <span class="ky"><i class="sw s-ack"></i> ACK</span>
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

      <div class="cmp">
        <div class="chead">⚔ CSMA/<b class="cd">CD</b> (Ethernet) vs CSMA/<b class="ca">CA</b> (WiFi)</div>
        <div class="crow ch"><span></span><span class="cd">CD · cable</span><span class="ca">CA · aire</span></div>
        <div class="crow"><span class="cq">¿detecta la colisión?</span><span>Sí, y <b>aborta</b></span><span>No puede → la <b>evita</b></span></div>
        <div class="crow"><span class="cq">¿ACK de capa 2?</span><span>No hace falta</span><span><b>Sí, obligatorio</b></span></div>
        <div class="crow"><span class="cq">backoff si el canal se ocupa</span><span>se <b>reinicia</b></span><span>se <b>congela</b> y retoma</span></div>
        <div class="crow"><span class="cq">espera antes de transmitir</span><span>transmite apenas libre</span><span><b>DIFS + backoff</b> igual</span></div>
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

    .tlwrap { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .tlhead { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.68rem; color: var(--text-dim); margin-bottom: 8px; }
    .cnt { font-family: Consolas, monospace; font-weight: 700; padding: 3px 10px; border-radius: 8px; border: 1px solid #2d3750; background: #1a2132; transition: color 0.3s, border-color 0.3s, background 0.3s; }
    .cnt b { font-size: 1.05rem; }
    .cnt.k-wait { color: #8b95b5; }
    .cnt.k-count { color: #79c0ff; border-color: #1f6feb66; }
    .cnt.k-frozen { color: #80d8ff; border-color: #80d8ff; background: #10242b; box-shadow: 0 0 12px rgba(128,216,255,0.3); }
    .cnt.k-go { color: #ffd54f; border-color: #d29922; background: #2b2a1a; }
    .cnt.k-done { color: #7ee787; border-color: #2ea043; background: #10251a; }

    .timeline { display: flex; gap: 2px; min-height: 46px; align-items: stretch; overflow-x: auto; padding-bottom: 2px; }
    .seg { display: flex; align-items: center; justify-content: center; border-radius: 5px; min-width: 0; font-size: 0.6rem; font-weight: 700; text-align: center; padding: 0 3px; border: 1px solid transparent; animation: pop 0.35s ease; }
    @keyframes pop { from { opacity: 0; transform: scaleX(0.4); } to { opacity: 1; transform: scaleX(1); } }
    .seglbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slotn { font-family: Consolas, monospace; font-size: 0.86rem; font-weight: 800; }
    .s-busy { background: #3d2a2a; color: #ef9a9a; border-color: #b23b3b66; }
    .s-difs { background: #2a2440; color: #c792ea; border-color: #7c3aed66; }
    .s-slot { background: #16283d; color: #79c0ff; border-color: #1f6feb66; }
    .s-frozen { background: #10242b; color: #80d8ff; border-color: #80d8ff; border-style: dashed; }
    .s-tx { background: #2b2a1a; color: #ffd54f; border-color: #d29922; }
    .s-sifs { background: #2a2440; color: #c792ea; border-color: #7c3aed66; }
    .s-ack { background: #10321a; color: #7ee787; border-color: #2ea043; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.72rem; padding: 12px; }

    .tlkey { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; padding-top: 9px; border-top: 1px solid #232b3e; font-size: 0.6rem; color: var(--text-dim); }
    .ky { display: inline-flex; align-items: center; gap: 4px; }
    .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px solid transparent; }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }

    .cmp { margin-top: 12px; background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 11px; }
    .chead { font-weight: 700; font-size: 0.8rem; color: #fff; margin-bottom: 8px; }
    .chead b.cd { color: #ffb74d; } .chead b.ca { color: #7ee787; }
    .crow { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6px; font-size: 0.68rem; padding: 5px 6px; border-radius: 6px; align-items: center; }
    .crow:not(.ch) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; color: var(--text); }
    .crow.ch { font-weight: 700; font-size: 0.6rem; text-transform: uppercase; }
    .crow .cd { color: #ffb74d; } .crow .ca { color: #7ee787; }
    .cq { color: var(--text-dim); } .crow b { color: #fff; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 700px) { .crow { grid-template-columns: 1fr; gap: 2px; } .crow.ch { display: none; } }
  `,
})
export class CsmacaDetail extends SteppedAnim implements OnDestroy {
  readonly steps = STEPS;

  protected stepCount(): number {
    return STEPS.length;
  }
  protected override stepTravel(): number {
    return 600;
  }
  protected override stepDwell(): number {
    return 4200;
  }

  readonly cur = computed<CStep>(() => {
    const i = this.index();
    if (i < 0) return { segs: [], cnt: null, state: 'sin arrancar', stateKind: 'wait', msg: '' };
    return STEPS[Math.min(i, STEPS.length - 1)];
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return '<strong>Ciclo CSMA/CA completo</strong>: escuchar → DIFS → backoff aleatorio (que <strong>se congela</strong> si el canal se ocupa) → transmitir → SIFS → ACK. Si el <strong>ACK no llega</strong>, se asume colisión: se <strong>duplica la ventana</strong> de backoff (exponencial) y se reintenta. Todo esto existe porque en el aire <strong>no se puede detectar la colisión</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: seguí la línea de tiempo del canal y mirá el contador de backoff de B congelarse cuando otro transmite.';
    return STEPS[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
