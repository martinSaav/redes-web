import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

interface CircStep {
  msg: string;
  slots: (number | null)[]; // qué usuario ocupa cada slot TDM (null = vacío/desperdiciado)
  active: boolean[]; // qué usuarios están transmitiendo
  blockedUser: number | null;
  waste?: boolean;
}

interface PackStep {
  msg: string;
  active: boolean[]; // usuarios con datos ahora
  queue: number; // paquetes en cola en el enlace
  drop?: boolean;
  admitted: number; // usuarios admitidos totales
}

const CIRC_STEPS: CircStep[] = [
  {
    msg: 'Conmutación de <strong>circuitos</strong> (telefonía clásica): el enlace se parte en <strong>slots de tiempo fijos (TDM)</strong> — uno por usuario. Acá hay 4 slots para 4 usuarios. Antes de hablar, cada uno <strong>reserva</strong> su slot.',
    slots: [0, 1, 2, 3], active: [true, true, true, true], blockedUser: null,
  },
  {
    msg: 'Los 4 usuarios transmiten en su slot reservado: <strong>cero colisiones, ancho de banda garantizado</strong>. La trama TDM se repite cíclicamente y cada uno tiene SIEMPRE su turno.',
    slots: [0, 1, 2, 3], active: [true, true, true, true], blockedUser: null,
  },
  {
    msg: 'Pero el usuario 1 y el 3 <strong>se quedan callados</strong> (silencios de la conversación)… y sus slots pasan <strong>VACÍOS igual</strong>. El recurso reservado se <strong>DESPERDICIA</strong>: nadie más puede usarlo.',
    slots: [0, null, 2, null], active: [true, false, true, false], blockedUser: null, waste: true,
  },
  {
    msg: 'Llega un <strong>5º usuario</strong>… pero <strong>no hay slots libres</strong>: los slots 1 y 3 están ociosos ¡pero <strong>reservados</strong>! → 5º usuario <strong>BLOQUEADO</strong>. Con circuitos la capacidad es un techo rígido: 4 slots = 4 usuarios, ni uno más aunque sobre lugar.',
    slots: [0, null, 2, null], active: [true, false, true, false], blockedUser: 4, waste: true,
  },
];

const PACK_STEPS: PackStep[] = [
  {
    msg: 'Conmutación de <strong>paquetes</strong> (Internet): <strong>sin reserva</strong>. Los usuarios parten sus datos en paquetes que <strong>comparten el enlace on-demand</strong> (multiplexación estadística). Cuando pocos transmiten, cada uno usa MÁS que su parte.',
    active: [true, false, false, false, false, false], queue: 1, admitted: 6,
  },
  {
    msg: 'Como el tráfico es <strong>a ráfagas</strong> y rara vez todos transmiten a la vez, se pueden <strong>admitir MUCHOS más usuarios</strong> que slots. Acá ya hay 6 conectados y el enlace los banca porque casi nunca coinciden.',
    active: [true, false, true, false, false, true], queue: 2, admitted: 6,
  },
  {
    msg: 'De vez en cuando <strong>varios coinciden</strong>: los paquetes se <strong>encolan</strong> en el buffer del enlace y esperan su turno (aparece <strong>d_queue</strong>). Es el precio de no reservar: posible congestión y demora variable.',
    active: [true, true, true, true, false, true], queue: 5, admitted: 6,
  },
  {
    msg: 'Si la ráfaga es muy grande y el buffer se llena, algún paquete se <strong>descarta</strong> (lo repone TCP). Pero en promedio, con tráfico a ráfagas, packet switching <strong>soporta más del triple de usuarios</strong> con la misma performance percibida.',
    active: [true, true, true, true, true, true], queue: 6, admitted: 6, drop: true,
  },
];

@Component({
  selector: 'app-switching-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🔀 Conmutación de circuitos vs paquetes</div>
          <div class="caption">Reservar recursos (garantizado pero desperdiciado) vs compartir on-demand (eficiente, sin garantías).</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'circ'" (click)="setMode('circ')">☎ Circuitos</button>
            <button [class.on]="mode() === 'pack'" (click)="setMode('pack')">📦 Paquetes</button>
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
        <div class="stage">
          <!-- usuarios -->
          <div class="users">
            @for (u of users(); track u.i) {
              <div class="user" [class.active]="u.active" [class.blocked]="u.blocked">
                <span class="uico">{{ u.blocked ? '🚫' : u.active ? '🗣' : '💤' }}</span>
                <span class="uname">user {{ u.i }}</span>
              </div>
            }
          </div>

          <!-- enlace -->
          <div class="linkwrap">
            <div class="linkcap">enlace compartido</div>
            @if (mode() === 'circ') {
              <div class="tdm">
                @for (s of circSlots(); track $index) {
                  <div class="tslot" [class.filled]="s !== null" [class.wasted]="s === null && anyWaste()">
                    {{ s === null ? '∅' : 'u' + s }}
                  </div>
                }
                <div class="tdmlab">trama TDM (4 slots fijos)</div>
              </div>
            } @else {
              <div class="pipe">
                <div class="qlabel">cola del enlace</div>
                <div class="qslots">
                  @for (k of [0,1,2,3,4,5,6,7]; track k) {
                    <div class="pslot" [class.full]="k < packQueue()"></div>
                  }
                  @if (packDrop()) { <span class="dropx">✖ drop</span> }
                </div>
                <div class="muxlab">multiplexación estadística (on-demand)</div>
              </div>
            }
          </div>
        </div>

        <div class="side">
          <div class="calc">
            <div class="chead">🧮 El argumento cuantitativo</div>
            <div class="cline">enlace <b>1 Mbps</b> · cada usuario <b>100 kbps</b> pero activo solo el <b>10%</b> del tiempo</div>
            <div class="ccmp">
              <div class="cc" [class.on]="mode() === 'circ'">
                <span class="cct">☎ circuitos</span>
                <span class="ccv">10 <small>usuarios</small></span>
                <span class="ccn">reserva fija 100 kbps c/u</span>
              </div>
              <div class="cc" [class.on]="mode() === 'pack'">
                <span class="cct">📦 paquetes</span>
                <span class="ccv win">35 <small>usuarios</small></span>
                <span class="ccn">P(&gt;10 activos a la vez) ≈ 0,0004</span>
              </div>
            </div>
            <div class="cnote">Con paquetes entran <b>3,5× más usuarios</b> con la misma performance percibida — a cambio de no dar garantías.</div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 700; font-size: 0.82rem; }
    .mode button.on { background: #7c3aed; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .stage { flex: 1; min-width: 0; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
    .users { display: flex; gap: 8px; flex-wrap: wrap; }
    .user { display: flex; flex-direction: column; align-items: center; gap: 2px; background: #1a2132; border: 1.5px solid #2d3750; border-radius: 8px; padding: 6px 10px; min-width: 60px; transition: border-color 0.3s, background 0.3s, opacity 0.3s; }
    .user.active { border-color: #2ea043; background: #16281c; }
    .user.blocked { border-color: #ef5350; background: #2b1618; }
    .user:not(.active):not(.blocked) { opacity: 0.5; }
    .uico { font-size: 1.1rem; }
    .uname { font-size: 0.62rem; font-family: Consolas, monospace; color: #8b95b5; }

    .linkwrap { border: 1px dashed #3a4560; border-radius: 10px; padding: 12px; }
    .linkcap { font-size: 0.66rem; color: #8b95b5; text-align: center; margin-bottom: 8px; }
    .tdm { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: center; }
    .tslot { width: 60px; height: 42px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: Consolas, monospace; font-weight: 800; font-size: 0.95rem; border: 2px solid #2d3750; background: #1a2132; color: #5c6a8e; transition: all 0.3s; }
    .tslot.filled { border-color: #1f6feb; background: #14243d; color: #79c0ff; }
    .tslot.wasted { border-color: #d29922; border-style: dashed; background: #2b2a1a; color: #ffd54f; }
    .tdmlab, .muxlab { width: 100%; text-align: center; font-size: 0.62rem; color: #5c6a8e; margin-top: 6px; }

    .pipe { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .qlabel { font-size: 0.66rem; color: #8b95b5; }
    .qslots { display: flex; gap: 4px; align-items: center; background: #0b0f19; border: 1px solid #2d3750; border-radius: 8px; padding: 8px; position: relative; }
    .pslot { width: 22px; height: 26px; border-radius: 4px; background: #10151f; border: 1px solid #2d3750; transition: background 0.3s, border-color 0.3s; }
    .pslot.full { background: #d29922; border-color: #ffd54f; box-shadow: 0 0 6px rgba(255,213,79,0.4); }
    .dropx { color: #ef5350; font-weight: 800; font-size: 0.72rem; margin-left: 6px; }

    .side { width: 288px; flex-shrink: 0; }
    .calc { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 12px; height: 100%; display: flex; flex-direction: column; }
    .chead { font-weight: 700; font-size: 0.82rem; color: #ffd54f; margin-bottom: 8px; }
    .cline { font-size: 0.76rem; color: var(--text); line-height: 1.5; margin-bottom: 10px; }
    .cline b { color: #79c0ff; }
    .ccmp { display: flex; gap: 8px; }
    .cc { flex: 1; background: #1a2132; border: 1px solid #2d3750; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 3px; text-align: center; opacity: 0.55; transition: opacity 0.3s, border-color 0.3s; }
    .cc.on { opacity: 1; border-color: #7c3aed; }
    .cct { font-size: 0.68rem; color: #8b95b5; }
    .ccv { font-family: Consolas, monospace; font-size: 1.5rem; font-weight: 800; color: #cfe3ff; }
    .ccv.win { color: #7ee787; }
    .ccv small { font-size: 0.5rem; color: #5c6a8e; }
    .ccn { font-size: 0.58rem; color: #5c6a8e; line-height: 1.35; }
    .cnote { margin-top: auto; padding-top: 10px; font-size: 0.68rem; color: #8b95b5; line-height: 1.5; }
    .cnote b { color: #7ee787; }

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

    @media (max-width: 760px) { .board { flex-direction: column; } .side { width: 100%; } }
  `,
})
export class SwitchingDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'circ' | 'pack'>('circ');
  readonly steps = computed(() => (this.mode() === 'circ' ? CIRC_STEPS : PACK_STEPS));

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(): number {
    return 500;
  }
  protected override stepDwell(): number {
    return 3600;
  }

  setMode(m: 'circ' | 'pack'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private curCirc(): CircStep | null {
    const i = this.index();
    if (this.mode() !== 'circ') return null;
    if (this.finished()) return CIRC_STEPS[CIRC_STEPS.length - 1];
    return i >= 0 ? CIRC_STEPS[i] : null;
  }
  private curPack(): PackStep | null {
    const i = this.index();
    if (this.mode() !== 'pack') return null;
    if (this.finished()) return PACK_STEPS[PACK_STEPS.length - 1];
    return i >= 0 ? PACK_STEPS[i] : null;
  }

  readonly users = computed(() => {
    if (this.mode() === 'circ') {
      const s = this.curCirc();
      const active = s?.active ?? [false, false, false, false];
      const arr = [0, 1, 2, 3].map((i) => ({ i, active: active[i], blocked: false }));
      if (s?.blockedUser != null) arr.push({ i: s.blockedUser, active: false, blocked: true });
      return arr;
    }
    const s = this.curPack();
    const active = s?.active ?? Array(6).fill(false);
    return [0, 1, 2, 3, 4, 5].map((i) => ({ i, active: active[i], blocked: false }));
  });

  circSlots(): (number | null)[] {
    return this.curCirc()?.slots ?? [0, 1, 2, 3];
  }
  anyWaste(): boolean {
    return !!this.curCirc()?.waste;
  }
  packQueue(): number {
    return this.curPack()?.queue ?? 0;
  }
  packDrop(): boolean {
    return !!this.curPack()?.drop;
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'circ'
        ? '<strong>Circuitos</strong>: recursos reservados = garantía de ancho de banda, pero <strong>desperdicio</strong> en los silencios y un <strong>techo rígido</strong> de usuarios. Probá el modo <strong>📦 Paquetes</strong> para ver el contraste.'
        : '<strong>Paquetes</strong>: multiplexación estadística = <strong>mucha más gente</strong> con tráfico a ráfagas, a cambio de <strong>congestión, colas y pérdidas</strong> posibles. Sin reserva, sin garantías: la apuesta de Internet.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Mirá el panel de la derecha: el mismo enlace de 1 Mbps banca 10 usuarios con circuitos y 35 con paquetes.';
    return this.steps()[i].msg;
  });

  ngOnDestroy(): void {
    this.destroy();
  }
}
