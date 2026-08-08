import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { SteppedAnim } from './stepped';

/* Firewalls (Kurose cap. 8): filtro stateless vs stateful (tabla de conexiones),
   application gateway/proxy, arquitectura DMZ e IDS vs IPS. */

type Mode = 'stateless' | 'stateful' | 'arq';

interface Pkt {
  text: string;
  detail: string;
  dir: 'out' | 'in';          // out = interno→Internet, in = Internet→interno
  verdict: 'allow' | 'drop';
  evil?: boolean;
  rule?: number;              // regla que aplicó
}

interface FStep {
  msg: string;
  pkt?: Pkt;
  conns?: string[];           // tabla de conexiones (stateful)
  hiRule?: number;
  danger?: boolean;
  hiZone?: string[];          // arquitectura: zonas resaltadas
}

const RULES = [
  { act: 'allow', src: 'interna', dst: 'afuera', proto: 'TCP', sp: '>1023', dp: '80', flag: '—' },
  { act: 'allow', src: 'afuera', dst: 'interna', proto: 'TCP', sp: '80', dp: '>1023', flag: 'ACK' },
  { act: 'allow', src: 'interna', dst: 'afuera', proto: 'UDP', sp: '>1023', dp: '53', flag: '—' },
  { act: 'deny', src: 'todo', dst: 'todo', proto: 'todo', sp: 'todo', dp: 'todo', flag: '—' },
];

const STATELESS: FStep[] = [
  {
    msg: 'Un firewall <strong>stateless</strong> (filtro de paquetes) decide mirando <strong>solo los campos del header</strong> de cada paquete: IPs, puertos, protocolo, flags. Cada paquete se evalúa <strong>aislado</strong> — <strong>no tiene memoria</strong> de lo que pasó antes.',
  },
  {
    msg: 'Un host interno navega: sale un paquete TCP hacia el <strong>puerto 80</strong>. Machea la <strong>regla 1</strong> → <strong>ALLOW</strong>.',
    pkt: { text: '📤 TCP → puerto 80', detail: 'origen interno:4512 · destino web:80', dir: 'out', verdict: 'allow', rule: 0 },
    hiRule: 0,
  },
  {
    msg: 'Vuelve la respuesta del servidor web: viene <strong>desde el puerto 80</strong>, hacia un puerto alto, y con el <strong>flag ACK</strong>. Machea la <strong>regla 2</strong> → <strong>ALLOW</strong>. Todo bien hasta acá.',
    pkt: { text: '📥 respuesta HTTP', detail: 'origen web:80 · destino interno:4512 · ACK', dir: 'in', verdict: 'allow', rule: 1 },
    hiRule: 1,
  },
  {
    msg: '👉 <strong>Acá está la falla</strong>: Trudy arma un paquete <strong>a mano</strong> poniendo <strong>puerto origen 80</strong> y el <strong>flag ACK</strong> encendido, aunque <strong>nunca existió ninguna conexión</strong>. Para el firewall es idéntico al paquete anterior.',
    pkt: { text: '😈 paquete forjado', detail: 'origen atacante:80 · destino interno:4512 · ACK', dir: 'in', verdict: 'allow', rule: 1, evil: true },
    hiRule: 1, danger: true,
  },
  {
    msg: '💥 <strong>PASA</strong>. El firewall no puede distinguirlo porque <strong>no recuerda</strong> si alguien de adentro pidió algo. ✅ Ventaja del stateless: es <strong>rapidísimo</strong> y no guarda estado. ❌ Desventaja: <strong>ciego al contexto</strong>.',
    pkt: { text: '😈 entró a la red interna', detail: 'el firewall lo dejó pasar', dir: 'in', verdict: 'allow', evil: true },
    danger: true,
  },
];

const STATEFUL: FStep[] = [
  {
    msg: 'Un firewall <strong>stateful</strong> agrega lo que le faltaba al otro: una <strong>tabla de conexiones</strong>. Recuerda <strong>qué conexiones inició la red interna</strong> y solo deja entrar lo que corresponde a ellas.',
    conns: [],
  },
  {
    msg: 'El host interno abre una conexión (<strong>SYN</strong>) hacia el servidor web. El firewall la deja salir <strong>y anota la conexión en su tabla</strong>.',
    pkt: { text: '📤 SYN → web:80', detail: 'se registra la conexión', dir: 'out', verdict: 'allow' },
    conns: ['interno:4512 ↔ web:80 · establecida'],
  },
  {
    msg: 'Vuelve la respuesta. El firewall <strong>la busca en la tabla</strong>: hay una entrada que coincide → es tráfico legítimo de una conexión que <strong>nosotros</strong> iniciamos → <strong>ALLOW</strong>.',
    pkt: { text: '📥 respuesta HTTP', detail: 'coincide con la tabla ✔', dir: 'in', verdict: 'allow' },
    conns: ['interno:4512 ↔ web:80 · establecida'],
  },
  {
    msg: '👉 Ahora <strong>el mismo ataque de antes</strong>: Trudy manda su paquete forjado con puerto origen 80 y ACK…',
    pkt: { text: '😈 paquete forjado', detail: 'origen atacante:80 · ACK', dir: 'in', verdict: 'drop', evil: true },
    conns: ['interno:4512 ↔ web:80 · establecida'],
  },
  {
    msg: '✅ <strong>DROP</strong>. El firewall busca esa conexión en la tabla y <strong>no la encuentra</strong> — nadie de adentro habló nunca con esa IP. El ataque que colaba en el stateless <strong>acá muere</strong>.',
    pkt: { text: '🛑 DESCARTADO', detail: 'no hay entrada en la tabla', dir: 'in', verdict: 'drop', evil: true },
    conns: ['interno:4512 ↔ web:80 · establecida'],
  },
  {
    msg: 'Cuando la conexión se cierra (<strong>FIN</strong>) o vence por <strong>timeout</strong>, la entrada <strong>se borra</strong> de la tabla y ese "agujero" temporal se cierra. Costo: hay que <strong>mantener estado</strong> por cada conexión (memoria y CPU).',
    conns: [],
  },
];

const ARQ: FStep[] = [
  {
    msg: 'Un <strong>filtro de paquetes</strong> (stateless o stateful) solo mira <strong>headers</strong>. El <strong>application gateway / proxy</strong> va más allá: <strong>termina la conexión</strong>, inspecciona el <strong>contenido</strong> de capa de aplicación y abre él mismo la conexión al destino. Permite políticas <strong>por usuario</strong> (ej: "solo estos usuarios pueden salir por telnet").',
    hiZone: ['proxy'],
  },
  {
    msg: 'Los <strong>servidores públicos</strong> (web, mail, DNS) no se ponen ni afuera ni en la red interna: van en una <strong>DMZ</strong> (zona desmilitarizada), <strong>entre dos firewalls</strong>.',
    hiZone: ['dmz'],
  },
  {
    msg: '👉 <strong>La razón de la DMZ</strong>: son las máquinas <strong>más expuestas</strong> (tienen que aceptar conexiones de cualquiera). Si comprometen el servidor web, el atacante queda <strong>atrapado en la DMZ</strong> — todavía tiene el <strong>firewall interno</strong> adelante y no llega a la red privada.',
    hiZone: ['dmz', 'fwi'], danger: true,
  },
  {
    msg: 'El <strong>IDS</strong> (Intrusion Detection System) hace <strong>deep packet inspection</strong>: mira el <strong>contenido</strong> y lo correlaciona entre paquetes. Detecta por <strong>firma</strong> (base de ataques conocidos — <em>Snort</em>) o por <strong>anomalía</strong> (desvíos estadísticos del tráfico normal: pesca ataques nuevos, pero con más falsos positivos).',
    hiZone: ['ids'],
  },
  {
    msg: '<strong>IDS vs IPS</strong> — la diferencia que se pregunta: el <strong>IDS es pasivo</strong> (está al costado, observa una copia del tráfico y <strong>avisa</strong>); el <strong>IPS está EN LÍNEA</strong> en el camino del tráfico y <strong>bloquea</strong>. Más poder, pero también más riesgo: un falso positivo del IPS <strong>corta tráfico legítimo</strong>.',
    hiZone: ['ids', 'ips'],
  },
];

@Component({
  selector: 'app-firewall-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🧱 Firewalls: stateless vs stateful, DMZ e IDS/IPS</div>
          <div class="caption">El ataque que pasa el filtro simple y muere en el stateful.</div>
        </div>
        <div class="controls">
          <div class="mode">
            <button [class.on]="mode() === 'stateless'" (click)="setMode('stateless')">Stateless</button>
            <button [class.on]="mode() === 'stateful'" (click)="setMode('stateful')">Stateful</button>
            <button [class.on]="mode() === 'arq'" (click)="setMode('arq')">DMZ · IDS/IPS</button>
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

      @if (mode() !== 'arq') {
        <div class="board">
          <div class="canvas" [class.danger]="dangerOn()">
            <div class="zone out"><span>🌐 Internet</span><small>no confiable</small></div>
            <div class="fw" [class.block]="pkt()?.verdict === 'drop'">
              <span class="fwi">🧱</span>
              <span class="fwl">{{ mode() === 'stateless' ? 'filtro stateless' : 'firewall stateful' }}</span>
            </div>
            <div class="zone in"><span>🏢 Red interna</span><small>confiable</small></div>

            @if (pkt(); as p) {
              <div class="pkt" [class.evil]="p.evil" [class.dropped]="p.verdict === 'drop' && progress() >= 0.99" [style.left.%]="pktX()">
                <span class="pt">{{ p.text }}</span>
                <span class="pd">{{ p.detail }}</span>
                <span class="pv" [class.bad]="p.verdict === 'drop'">
                  {{ p.verdict === 'drop' ? '🛑 DROP' : '✔ ALLOW' }}{{ p.rule !== undefined ? ' · regla ' + (p.rule + 1) : '' }}
                </span>
              </div>
            }
          </div>

          <div class="side">
            @if (mode() === 'stateless') {
              <div class="panel">
                <div class="phead">📋 Tabla de reglas (se evalúa en orden)</div>
                <div class="rrow rh"><span>acción</span><span>origen</span><span>destino</span><span>p.orig</span><span>p.dest</span><span>flag</span></div>
                @for (r of rules; track $index; let i = $index) {
                  <div class="rrow" [class.hi]="hiRule() === i" [class.deny]="r.act === 'deny'">
                    <span class="ra" [class.d]="r.act === 'deny'">{{ r.act }}</span>
                    <span>{{ r.src }}</span><span>{{ r.dst }}</span>
                    <span>{{ r.sp }}</span><span>{{ r.dp }}</span><span>{{ r.flag }}</span>
                  </div>
                }
                <div class="pnote">Sin memoria: cada paquete se juzga <b>solo</b> por estos campos.</div>
              </div>
            } @else {
              <div class="panel">
                <div class="phead alt">🗂 Tabla de conexiones</div>
                @if (conns().length === 0) {
                  <div class="empty">(vacía — ninguna conexión activa)</div>
                }
                @for (c of conns(); track c) {
                  <div class="conn">{{ c }}</div>
                }
                <div class="pnote">Solo entra tráfico que <b>machea una conexión que la red interna inició</b>.</div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="arq">
          <div class="acol">
            <div class="anode net">🌐 Internet</div>
          </div>
          <div class="acol">
            <div class="anode fwx" [class.hi]="hiZone('fwe')">🧱 FW externo</div>
          </div>
          <div class="acol dmzcol" [class.hi]="hiZone('dmz')">
            <div class="dmzlbl">DMZ</div>
            <div class="anode srv" [class.hi]="hiZone('proxy')">🖧 Web / Mail / DNS</div>
            <div class="anode srv small" [class.hi]="hiZone('proxy')">🔀 proxy / app gateway</div>
          </div>
          <div class="acol">
            <div class="anode fwx" [class.hi]="hiZone('fwi')">🧱 FW interno</div>
          </div>
          <div class="acol">
            <div class="anode inner">🏢 Red interna</div>
          </div>
          <div class="sensors">
            <div class="sensor" [class.hi]="hiZone('ids')"><b>IDS</b> pasivo · observa y <b>avisa</b></div>
            <div class="sensor ips" [class.hi]="hiZone('ips')"><b>IPS</b> en línea · <b>bloquea</b></div>
          </div>
        </div>
      }

      <div class="status" [class.done]="finished()" [class.idle]="index() < 0">
        @if (index() >= 0 && !finished()) {
          <span class="stepno">{{ index() + 1 }}/{{ steps().length }}</span>
        }
        @if (finished()) {
          <span class="stepno ok">✔</span>
        }
        <span [innerHTML]="statusMsg()"></span>
      </div>

      <div class="goals">
        <b>🎯 Los 3 objetivos de un firewall:</b>
        <span>1 · <b>TODO</b> el tráfico pasa por él</span>
        <span>2 · solo pasa lo <b>autorizado por la política</b></span>
        <span>3 · él mismo es <b>resistente</b> a ataques</span>
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
    .mode button { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-weight: 700; font-size: 0.76rem; }
    .mode button.on { background: #ef4444; color: #fff; }
    .ctl { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; cursor: pointer; font-size: 0.9rem; }
    .ctl:hover:not(:disabled) { background: #2d3750; }
    .ctl:disabled { opacity: 0.35; cursor: default; }
    .ctl.play { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; min-width: 96px; }
    .speeds { display: flex; gap: 2px; margin-left: 6px; background: var(--panel-2); border-radius: 8px; padding: 2px; border: 1px solid var(--border); }
    .spd { background: transparent; color: var(--text-dim); border: none; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 0.78rem; }
    .spd.on { background: #1f6feb; color: #fff; font-weight: 700; }

    .board { display: flex; gap: 12px; align-items: stretch; }
    .canvas { position: relative; flex: 1; min-width: 0; min-height: 210px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; transition: border-color 0.3s; }
    .canvas.danger { border-color: #b23b3b88; }
    .zone { display: flex; flex-direction: column; align-items: center; gap: 2px; border-radius: 10px; padding: 12px 10px; min-width: 92px; text-align: center; }
    .zone span { font-size: 0.76rem; font-weight: 700; color: #fff; } .zone small { font-size: 0.56rem; color: rgba(255,255,255,0.75); }
    .zone.out { background: #6b2020; border: 1px solid #b23b3b66; }
    .zone.in { background: #1d3b26; border: 1px solid #2ea04366; }
    .fw { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 14px 12px; background: #2a2440; border: 2px solid #7c3aed; border-radius: 10px; transition: border-color 0.3s, box-shadow 0.3s; }
    .fw.block { border-color: #ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.5); }
    .fwi { font-size: 1.3rem; } .fwl { font-size: 0.6rem; font-weight: 700; color: #c792ea; white-space: nowrap; }

    .pkt { position: absolute; top: 14%; transform: translateX(-50%); z-index: 4; display: flex; flex-direction: column; align-items: center; gap: 1px; background: rgba(8,12,22,0.97); border: 1.5px solid #ffd54f; border-radius: 8px; padding: 5px 10px; white-space: nowrap; transition: opacity 0.3s; }
    .pkt.evil { border-color: #ef4444; }
    .pkt.dropped { opacity: 0.35; }
    .pt { font-size: 0.7rem; font-weight: 800; color: #fff; }
    .pd { font-family: Consolas, monospace; font-size: 0.56rem; color: #8b95b5; }
    .pv { font-size: 0.58rem; font-weight: 800; color: #7ee787; margin-top: 2px; } .pv.bad { color: #ff8a80; }

    .side { width: 300px; flex-shrink: 0; }
    .panel { background: #10151f; border: 1px solid var(--border); border-radius: 10px; padding: 10px; height: 100%; }
    .phead { font-weight: 700; font-size: 0.76rem; color: #ffd54f; margin-bottom: 8px; } .phead.alt { color: #7ee787; }
    .rrow { display: grid; grid-template-columns: 0.75fr 0.8fr 0.8fr 0.7fr 0.7fr 0.6fr; gap: 3px; font-family: Consolas, monospace; font-size: 0.55rem; padding: 4px 5px; border-radius: 5px; align-items: center; color: var(--text); }
    .rrow.rh { font-size: 0.48rem; text-transform: uppercase; color: #5c6a8e; font-weight: 700; }
    .rrow:not(.rh) { background: #161d2b; border: 1px solid #232b3e; margin-bottom: 3px; }
    .rrow.hi { border-color: #ffd54f; background: #2b2a1a; box-shadow: 0 0 10px rgba(255,213,79,0.3); }
    .rrow.deny { opacity: 0.75; }
    .ra { color: #7ee787; font-weight: 800; } .ra.d { color: #ff8a80; }
    .conn { font-family: Consolas, monospace; font-size: 0.62rem; color: #7ee787; background: #16251c; border: 1px solid #2ea04355; border-radius: 6px; padding: 6px 8px; margin-bottom: 4px; }
    .empty { color: #5c6a8e; font-style: italic; font-size: 0.68rem; padding: 6px; }
    .pnote { margin-top: 7px; padding-top: 7px; border-top: 1px solid #232b3e; font-size: 0.6rem; color: var(--text-dim); line-height: 1.4; } .pnote b { color: #cfe3ff; }

    .arq { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; background: radial-gradient(ellipse at 50% 50%, #202a40 0%, #171e2e 80%); border: 1px solid var(--border); border-radius: 10px; padding: 14px; position: relative; min-height: 180px; }
    .acol { display: flex; flex-direction: column; justify-content: center; gap: 6px; flex: 1; min-width: 88px; }
    .dmzcol { border: 1.5px dashed #d2992288; border-radius: 10px; padding: 8px 6px; background: rgba(210,153,34,0.06); position: relative; transition: border-color 0.3s, background 0.3s; }
    .dmzcol.hi { border-color: #ffd54f; background: rgba(255,213,79,0.12); }
    .dmzlbl { position: absolute; top: -8px; left: 8px; font-size: 0.55rem; font-weight: 800; color: #ffd54f; background: #171e2e; padding: 0 5px; }
    .anode { text-align: center; font-size: 0.66rem; font-weight: 700; color: #fff; border-radius: 8px; padding: 10px 6px; border: 1.5px solid transparent; transition: border-color 0.3s, box-shadow 0.3s; }
    .anode.net { background: #6b2020; } .anode.fwx { background: #2a2440; border-color: #7c3aed; }
    .anode.srv { background: #1565c0; } .anode.srv.small { font-size: 0.58rem; background: #0e7490; }
    .anode.inner { background: #1d3b26; }
    .anode.hi { border-color: #ffd54f; box-shadow: 0 0 16px rgba(255,213,79,0.5); }
    .sensors { display: flex; gap: 8px; width: 100%; margin-top: 8px; }
    .sensor { flex: 1; font-size: 0.64rem; color: var(--text-dim); background: #10151f; border: 1px solid #232b3e; border-radius: 8px; padding: 7px 9px; transition: border-color 0.3s, box-shadow 0.3s; }
    .sensor b { color: #79c0ff; } .sensor.ips b { color: #ff8a80; }
    .sensor.hi { border-color: #ffd54f; box-shadow: 0 0 12px rgba(255,213,79,0.3); }

    .status { display: flex; align-items: center; gap: 10px; margin-top: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 14px; min-height: 50px; font-size: 0.95rem; line-height: 1.45; }
    .status.done { border-color: #2ea04366; background: rgba(46, 160, 67, 0.1); }
    .status.idle { color: var(--text-dim); font-style: italic; }
    .stepno { flex-shrink: 0; background: #1f6feb; color: #fff; border-radius: 6px; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; }
    .stepno.ok { background: #2ea043; }

    .goals { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; margin-top: 10px; padding: 9px 11px; background: #10151f; border: 1px solid var(--border); border-radius: 8px; font-size: 0.68rem; color: var(--text-dim); }
    .goals > b { color: #fff; } .goals b { color: #cfe3ff; }

    .dots { display: flex; gap: 6px; margin-top: 10px; justify-content: center; flex-wrap: wrap; }
    .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel-2); cursor: pointer; padding: 0; transition: transform 0.15s; }
    .dot:hover { transform: scale(1.3); }
    .dot.past { background: #1f6feb; border-color: #1f6feb; }
    .dot.now { background: #ffd54f; border-color: #ffd54f; }

    @media (max-width: 800px) {
      .board { flex-direction: column; } .side { width: 100%; }
      .rrow { grid-template-columns: 0.8fr 1fr 1fr; } .rrow span:nth-child(n+4) { display: none; }
    }
  `,
})
export class FirewallDetail extends SteppedAnim implements OnDestroy {
  readonly mode = signal<Mode>('stateless');
  readonly steps = computed<FStep[]>(() =>
    this.mode() === 'stateless' ? STATELESS : this.mode() === 'stateful' ? STATEFUL : ARQ,
  );
  readonly rules = RULES;

  protected stepCount(): number {
    return this.steps().length;
  }
  protected override stepTravel(i: number): number {
    return this.steps()[i].pkt ? 1400 : 500;
  }
  protected override stepDwell(): number {
    return 4300;
  }

  setMode(m: Mode): void {
    if (m === this.mode()) return;
    this.mode.set(m);
    this.reset();
  }

  private at(): FStep | null {
    const i = this.index();
    if (i < 0) return null;
    const list = this.steps();
    if (this.finished()) return list[list.length - 1];
    return list[Math.min(i, list.length - 1)];
  }

  pkt(): Pkt | null {
    const i = this.index();
    if (i < 0 || this.finished()) return null;
    return this.steps()[i].pkt ?? null;
  }

  /** el paquete entra desde su lado y se frena en el firewall si lo dropean */
  pktX(): number {
    const p = this.pkt();
    if (!p) return 50;
    const t = this.ease(this.progress());
    const from = p.dir === 'out' ? 82 : 18;
    const to = p.verdict === 'drop' ? 50 : p.dir === 'out' ? 18 : 82;
    return from + (to - from) * t;
  }

  conns(): string[] {
    return this.at()?.conns ?? [];
  }
  hiRule(): number {
    const r = this.at()?.hiRule;
    return r === undefined ? -1 : r;
  }
  dangerOn(): boolean {
    return !!this.at()?.danger;
  }
  hiZone(z: string): boolean {
    return (this.at()?.hiZone ?? []).includes(z);
  }

  readonly statusMsg = computed(() => {
    if (this.finished()) {
      const m = this.mode();
      if (m === 'stateless') {
        return '<strong>Stateless</strong>: rápido y simple, pero <strong>sin memoria</strong> — un paquete forjado con los campos "correctos" pasa aunque no corresponda a ninguna conexión real. Pasá a <strong>Stateful</strong> para ver el arreglo.';
      }
      if (m === 'stateful') {
        return '<strong>Stateful</strong>: la <strong>tabla de conexiones</strong> le da el contexto que faltaba — solo entra lo que responde a algo que la red interna inició. Es el firewall que se usa hoy. Ahora mirá <strong>DMZ · IDS/IPS</strong>.';
      }
      return '<strong>Defensa en capas</strong>: filtro + proxy + <strong>DMZ</strong> (los servidores expuestos aislados entre dos firewalls) + <strong>IDS/IPS</strong> inspeccionando contenido. Ninguna capa alcanza sola: la seguridad es un <strong>proceso continuo</strong> y el sistema es tan fuerte como su <strong>eslabón más débil</strong>.';
    }
    const i = this.index();
    if (i < 0) return 'Presioná ▶ Play. Mirá primero cómo un paquete forjado burla al filtro stateless, y después cómo el stateful lo frena.';
    return this.steps()[i].msg;
  });

  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}
