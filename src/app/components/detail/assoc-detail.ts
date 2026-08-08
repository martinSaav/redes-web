import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Asociación 802.11 (Kurose cap. 7): scanning PASIVO (beacons) vs ACTIVO (probe request/response),
   luego association request/response y DHCP. Dos APs en canales distintos. */

type NId = 'host' | 'ap1' | 'ap6' | 'dhcp';

const POS: Record<NId, { x: number; y: number }> = {
  ap1: { x: 26, y: 24 },
  ap6: { x: 68, y: 24 },
  host: { x: 26, y: 80 },
  dhcp: { x: 90, y: 62 },
};

interface Msg { from: NId; to: NId; text: string; color?: string; }
interface AStep {
  msgs: Msg[];
  msg: string;
  static?: boolean;
  found?: NId[];   // APs descubiertos (aparecen en la lista)
  chosen?: NId;    // AP elegido
  assoc?: boolean; // línea de asociación firme
  ip?: boolean;    // ya tiene IP
}

const PASSIVE: AStep[] = [
  {
    msgs: [], static: true,
    msg: 'Modo <strong>infraestructura</strong>: los hosts se conectan a un <strong>AP</strong> (el AP + sus hosts = <strong>BSS</strong>). Cada AP tiene un <strong>SSID</strong> (el nombre de la red) y opera en un <strong>canal</strong>. Acá hay dos APs, en canales <strong>1</strong> y <strong>6</strong> (no se solapan).',
  },
  {
    msgs: [{ from: 'ap1', to: 'host', text: '📢 beacon (SSID + MAC)', color: '#7ee787' }], found: ['ap1'],
    msg: '<strong>Scanning PASIVO</strong>: los APs emiten <strong>beacons</strong> periódicamente por su canal, anunciando su SSID y su MAC. El host <strong>solo escucha</strong>, sin transmitir nada.',
  },
  {
    msgs: [{ from: 'ap6', to: 'host', text: '📢 beacon (SSID + MAC)', color: '#7ee787' }], found: ['ap1', 'ap6'],
    msg: 'También le llega el beacon del <strong>otro AP</strong>. El host va armando una <strong>lista de APs disponibles</strong> con la potencia con que recibe a cada uno.',
  },
  {
    msgs: [], static: true, found: ['ap1', 'ap6'], chosen: 'ap1',
    msg: 'El host <strong>elige</strong>: normalmente el de <strong>mayor potencia de señal</strong> (RSSI). Acá gana <strong>AP-1</strong>, que está más cerca. (El criterio lo decide el sistema operativo, no el estándar.)',
  },
  {
    msgs: [{ from: 'host', to: 'ap1', text: 'Association Request', color: '#80d8ff' }], found: ['ap1', 'ap6'], chosen: 'ap1',
    msg: 'Le manda un <strong>Association Request</strong> al AP elegido. (Si la red tiene seguridad, antes/después va la <strong>autenticación</strong> — WPA2/WPA3, que está en la sección de Seguridad.)',
  },
  {
    msgs: [{ from: 'ap1', to: 'host', text: 'Association Response ✔', color: '#7ee787' }], found: ['ap1', 'ap6'], chosen: 'ap1', assoc: true,
    msg: 'El AP responde <strong>Association Response</strong>. A partir de acá el host está <strong>asociado</strong>: el AP le va a retransmitir sus tramas hacia/desde la LAN cableada.',
  },
  {
    msgs: [{ from: 'host', to: 'dhcp', text: 'DHCP Discover →', color: '#ffd54f' }], found: ['ap1', 'ap6'], chosen: 'ap1', assoc: true,
    msg: 'Ya asociado (capa 2), le falta <strong>capa 3</strong>: corre <strong>DHCP</strong> a través del AP para conseguir <strong>IP, máscara, gateway y DNS</strong>.',
  },
  {
    msgs: [{ from: 'dhcp', to: 'host', text: 'DHCP Ack: IP ✔', color: '#7ee787' }], found: ['ap1', 'ap6'], chosen: 'ap1', assoc: true, ip: true,
    msg: '<strong>Listo para navegar</strong>: asociado en capa 2 + IP en capa 3. Secuencia completa: <strong>scanning → (autenticación) → asociación → DHCP</strong>.',
  },
];

const ACTIVE: AStep[] = [
  {
    msgs: [], static: true,
    msg: 'Misma escena, pero ahora el host <strong>no quiere esperar</strong> a que lleguen los beacons (pueden tardar ~100 ms cada uno, y hay que escuchar canal por canal).',
  },
  {
    msgs: [{ from: 'host', to: 'ap1', text: 'Probe Request 📡', color: '#c792ea' }, { from: 'host', to: 'ap6', text: 'Probe Request 📡', color: '#c792ea' }],
    msg: '<strong>Scanning ACTIVO</strong>: el host <strong>transmite él</strong> un <strong>Probe Request</strong> (broadcast) preguntando "¿qué APs hay acá?". Es la diferencia clave con el pasivo: acá el host habla primero.',
  },
  {
    msgs: [{ from: 'ap1', to: 'host', text: 'Probe Response', color: '#7ee787' }, { from: 'ap6', to: 'host', text: 'Probe Response', color: '#7ee787' }], found: ['ap1', 'ap6'],
    msg: 'Los APs que lo escuchan contestan con <strong>Probe Response</strong>. El host arma la lista <strong>mucho más rápido</strong> que esperando beacons. Costo: consume batería y ocupa el canal.',
  },
  {
    msgs: [], static: true, found: ['ap1', 'ap6'], chosen: 'ap1',
    msg: 'Elige igual que antes: el de <strong>mejor señal</strong> → <strong>AP-1</strong>.',
  },
  {
    msgs: [{ from: 'host', to: 'ap1', text: 'Association Request', color: '#80d8ff' }], found: ['ap1', 'ap6'], chosen: 'ap1',
    msg: 'De acá en adelante es <strong>idéntico al pasivo</strong>: <strong>Association Request</strong> al AP elegido.',
  },
  {
    msgs: [{ from: 'ap1', to: 'host', text: 'Association Response ✔', color: '#7ee787' }], found: ['ap1', 'ap6'], chosen: 'ap1', assoc: true,
    msg: '<strong>Association Response</strong> → asociado. Después, <strong>DHCP</strong> para la IP, igual que en el pasivo.',
  },
];

@Component({
  selector: 'app-assoc-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">📶 Asociación 802.11: cómo tu host entra a la red</div>
          <div class="caption">Scanning pasivo (escuchar beacons) vs activo (preguntar) → asociación → DHCP.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'passive'" (click)="setMode('passive')">Pasivo (beacons)</button>
            <button [class.on]="mode() === 'active'" (click)="setMode('active')">Activo (probe)</button>
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
        <div class="canvas">
          <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line [attr.x1]="pos.host.x" [attr.y1]="pos.host.y" [attr.x2]="pos.ap1.x" [attr.y2]="pos.ap1.y"
                  class="wire" [class.assoc]="assocOn() && chosen() === 'ap1'" />
            <line [attr.x1]="pos.host.x" [attr.y1]="pos.host.y" [attr.x2]="pos.ap6.x" [attr.y2]="pos.ap6.y" class="wire dash" />
            <line [attr.x1]="pos.ap1.x" [attr.y1]="pos.ap1.y" [attr.x2]="pos.dhcp.x" [attr.y2]="pos.dhcp.y" class="wire lan" />
          </svg>

          <div class="node ap" [class.chosen]="chosen() === 'ap1'" [style.left.%]="pos.ap1.x" [style.top.%]="pos.ap1.y">
            <strong>📡 AP-1</strong><small>SSID: FIUBA · canal 1</small>
            @if (chosen() === 'ap1' && assocOn()) { <span class="badge">asociado ✔</span> }
          </div>
          <div class="node ap alt" [class.chosen]="chosen() === 'ap6'" [style.left.%]="pos.ap6.x" [style.top.%]="pos.ap6.y">
            <strong>📡 AP-6</strong><small>SSID: FIUBA · canal 6</small>
          </div>
          <div class="node host" [style.left.%]="pos.host.x" [style.top.%]="pos.host.y">
            <strong>💻 Host</strong>
            @if (ipOn()) { <span class="badge ip">IP ✔</span> } @else { <small>sin IP</small> }
          </div>
          <div class="node srv" [style.left.%]="pos.dhcp.x" [style.top.%]="pos.dhcp.y">
            <strong>🖧 DHCP</strong><small>en la LAN</small>
          </div>

          @for (m of msgs(); track $index) {
            <div class="qcard" [style.left.%]="m.x" [style.top.%]="m.y" [style.border-color]="m.color">{{ m.text }}</div>
          }
        </div>

        <div class="side">
          <div class="panel">
            <div class="phead">📋 APs detectados por el host</div>
            @if (found().length === 0) {
              <div class="empty">(escaneando…)</div>
            }
            @for (a of found(); track a) {
              <div class="aprow" [class.win]="chosen() === a">
                <span class="an">{{ a === 'ap1' ? 'AP-1' : 'AP-6' }}</span>
                <span class="ach">canal {{ a === 'ap1' ? 1 : 6 }}</span>
                <span class="asig">{{ a === 'ap1' ? '▮▮▮▮ fuerte' : '▮▮ débil' }}</span>
              </div>
            }
            <div class="pnote">Elige por <b>potencia de señal</b>; el criterio lo define el SO, no el estándar.</div>
          </div>
          <div class="panel">
            <div class="phead alt">🔑 Términos</div>
            <div class="tline"><b>SSID</b> nombre de la red</div>
            <div class="tline"><b>BSS</b> el AP + sus hosts asociados</div>
            <div class="tline"><b>beacon</b> anuncio periódico del AP</div>
            <div class="tline"><b>canal</b> 1/6/11 no se solapan en 2.4 GHz</div>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 11px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
    .mode button.on { background: #ec4899; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 290px; background: radial-gradient(ellipse at 40% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .wires { position: absolute; inset: 0; width: 100%; height: 100%; }
    .wire { stroke: #4a5878; stroke-width: 0.6; vector-effect: non-scaling-stroke; transition: stroke 0.3s, stroke-width 0.3s; }
    .wire.dash { stroke-dasharray: 3 2; opacity: 0.6; }
    .wire.lan { stroke: #2ea04366; }
    .wire.assoc { stroke: #2ea043; stroke-width: 1.8; }

    .node { position: absolute; transform: translate(-50%,-50%); z-index: 3; display: flex; flex-direction: column; align-items: center; text-align: center; border-radius: 10px; padding: 7px 11px; min-width: 84px; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 1.5px solid rgba(0,0,0,0.25); transition: border-color 0.3s, box-shadow 0.3s; }
    .node strong { font-size: 0.76rem; color: #fff; } .node small { font-size: 0.56rem; color: rgba(255,255,255,0.82); }
    .node.ap { background: #f68c1f; } .node.ap.alt { background: #8d6e3a; }
    .node.host { background: #2e7d32; } .node.srv { background: #3949ab; }
    .node.chosen { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.6); }
    .badge { font-size: 0.54rem; font-weight: 800; margin-top: 3px; padding: 1px 7px; border-radius: 8px; background: #10321a; color: #7ee787; border: 1px solid #2ea043; }
    .badge.ip { background: #10251f; }

    .qcard { position: absolute; transform: translate(-50%,-50%); z-index: 4; background: rgba(8,12,22,0.96); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 4px 9px; font-family: Consolas, monospace; font-size: 0.64rem; font-weight: 700; color: #e6e9f0; white-space: nowrap; }

    .side { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
    .panel { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .phead { font-weight: 700; font-size: 0.78rem; color: #ffd54f; margin-bottom: 7px; } .phead.alt { color: #79c0ff; }
    .aprow { display: grid; grid-template-columns: 0.7fr 0.8fr 1fr; gap: 4px; align-items: center; font-family: Consolas, monospace; font-size: 0.62rem; background: #1a2132; border: 1px solid #2d3750; border-radius: 6px; padding: 5px 6px; margin-bottom: 4px; }
    .aprow.win { border-color: #ffd54f; background: #2b2a1a; box-shadow: 0 0 8px rgba(255,213,79,0.25); }
    .an { color: #fff; font-weight: 800; } .ach { color: #8b95b5; } .asig { color: #7ee787; text-align: right; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.7rem; padding: 4px; }
    .pnote { margin-top: 6px; padding-top: 6px; border-top: 1px solid #232b3e; font-size: 0.6rem; color: var(--text-dim); line-height: 1.4; } .pnote b { color: #cfe3ff; }
    .tline { font-size: 0.64rem; color: var(--text-dim); line-height: 1.6; } .tline b { color: #cfe3ff; font-family: Consolas, monospace; }

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
export class AssocDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<'passive' | 'active'>('passive');
  readonly steps = computed<AStep[]>(() => (this.mode() === 'passive' ? PASSIVE : ACTIVE));
  readonly pos = POS;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].static ? 500 : 1300;
  }
  protected override stepDwell(): number {
    return 3800;
  }

  setMode(m: 'passive' | 'active'): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): AStep | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    return list[Math.min(i, list.length - 1)];
  }
  private last(): AStep {
    const list = this.steps();
    return list[list.length - 1];
  }

  found(): NId[] {
    if (this.finished()) return this.last().found ?? [];
    return this.at()?.found ?? [];
  }
  chosen(): NId | null {
    if (this.finished()) return this.last().chosen ?? null;
    return this.at()?.chosen ?? null;
  }
  assocOn(): boolean {
    if (this.finished()) return !!this.last().assoc;
    return !!this.at()?.assoc;
  }
  ipOn(): boolean {
    if (this.finished()) return !!this.last().ip;
    return !!this.at()?.ip;
  }

  readonly msgs = computed(() => {
    const i = this.index();
    if (i < 0 || this.finished()) return [] as { x: number; y: number; text: string; color: string }[];
    const st = this.steps()[i];
    const p = this.ease(this.progress());
    return st.msgs.map((m) => ({
      text: m.text,
      color: m.color ?? '#ffd54f',
      x: POS[m.from].x + (POS[m.to].x - POS[m.from].x) * p,
      y: POS[m.from].y + (POS[m.to].y - POS[m.from].y) * p,
    }));
  });

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      return this.mode() === 'passive'
        ? '<strong>Pasivo</strong>: el host solo escucha beacons — no gasta transmisión, pero <strong>tarda más</strong> (hay que esperar el beacon de cada canal). Probá el <strong>Activo</strong> para ver la diferencia.'
        : '<strong>Activo vs pasivo</strong>: activo = el host <strong>manda probe requests</strong> y los APs contestan → descubrimiento <strong>rápido</strong>, a costa de batería y de ocupar el canal. Pasivo = solo escucha beacons → <strong>lento pero silencioso</strong>. La asociación y el DHCP son iguales en ambos.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play: mirá cómo el host descubre los APs, elige uno, se asocia y recién ahí pide IP por DHCP.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
