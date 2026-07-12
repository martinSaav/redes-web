import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface Question {
  sec: string;
  q: string;
  options: string[];
  correct: number;
  explain: string;
}

const QUESTIONS: Question[] = [
  /* ---------- Fundamentos ---------- */
  {
    sec: 'Fundamentos',
    q: '¿Cuál es la diferencia entre forwarding y routing?',
    options: [
      'Forwarding es LOCAL (mirar la tabla y sacar por la interfaz); routing es GLOBAL (armar esa tabla).',
      'Son sinónimos.',
      'Forwarding es global y routing es local.',
      'Forwarding pasa en el host y routing en el switch.',
    ],
    correct: 0,
    explain: 'Forwarding = acción local en nanosegundos (data plane). Routing = proceso global que arma la tabla (control plane). El routing arma lo que el forwarding consulta.',
  },
  {
    sec: 'Fundamentos',
    q: 'De los 4 retardos nodales, ¿cuál es el ÚNICO variable y causa del jitter?',
    options: [
      'd_queue (encolamiento).',
      'd_trans (transmisión, L/R).',
      'd_prop (propagación).',
      'd_proc (procesamiento).',
    ],
    correct: 0,
    explain: 'd_queue depende de la intensidad de tráfico La/R: cuando tiende a 1, la cola explota de forma no lineal. Trampa: d_trans=L/R depende de la banda (no de la distancia) y d_prop de la distancia.',
  },
  {
    sec: 'Fundamentos',
    q: 'En conmutación de paquetes, "store-and-forward" significa que el router…',
    options: [
      'Recibe el paquete COMPLETO antes de empezar a reenviarlo.',
      'Reserva un circuito de punta a punta.',
      'Guarda una copia permanente de cada paquete.',
      'Descarta paquetes apenas hay congestión.',
    ],
    correct: 0,
    explain: 'Cada salto suma un retardo L/R por esperar el paquete entero. Es lo opuesto a circuitos, que reservan recursos con FDM/TDM.',
  },
  /* ---------- Aplicación ---------- */
  {
    sec: 'Aplicación',
    q: '¿Qué protocolo de transporte usa DNS habitualmente y por qué?',
    options: [
      'UDP, por rapidez y bajo overhead (consultas cortas).',
      'TCP, por confiabilidad de conexión.',
      'ICMP, porque es de control.',
      'Ninguno, va directo sobre IP.',
    ],
    correct: 0,
    explain: 'DNS usa UDP/53 (pasa a TCP para respuestas grandes o transferencias de zona). Es la pregunta trampa clásica del oral.',
  },
  {
    sec: 'Aplicación',
    q: 'HTTP es un protocolo…',
    options: [
      'Sin estado (stateless); el estado se simula con cookies.',
      'Con estado guardado siempre en el servidor.',
      'Con estado gracias a TCP.',
      'Con estado solo en HTTP/2.',
    ],
    correct: 0,
    explain: 'HTTP es stateless: el servidor no recuerda pedidos previos por sí mismo. Las cookies aportan el estado del lado de la aplicación.',
  },
  {
    sec: 'Aplicación',
    q: 'En DNS, la diferencia entre consulta recursiva e iterativa es…',
    options: [
      'Recursiva: delegás la resolución completa; iterativa: te devuelven referrals para seguir vos.',
      'Recursiva usa TCP e iterativa UDP.',
      'Son exactamente lo mismo.',
      'La iterativa la resuelve siempre el root.',
    ],
    correct: 0,
    explain: 'El host suele pedir de forma recursiva a su DNS local; ese local hace consultas iterativas hacia root → TLD → authoritative.',
  },
  /* ---------- Transporte ---------- */
  {
    sec: 'Transporte',
    q: '¿Para qué sirve el número de puerto?',
    options: [
      'Multiplexar/demultiplexar: identificar el proceso (socket) destino.',
      'Identificar el host dentro de la red.',
      'Cifrar la conexión.',
      'Detectar errores de bits.',
    ],
    correct: 0,
    explain: 'La IP identifica el host; el puerto, el proceso. UDP demultiplexa por (IP,puerto) destino; TCP por la 4-tupla completa.',
  },
  {
    sec: 'Transporte',
    q: 'En TCP, el número de ACK indica…',
    options: [
      'El PRÓXIMO byte que el receptor espera (ACK acumulativo).',
      'El último byte que recibió.',
      'La cantidad de bytes perdidos.',
      'El tamaño de la ventana de congestión.',
    ],
    correct: 0,
    explain: 'ACK acumulativo = próximo byte esperado. Trampa frecuente: NO es "el último byte recibido".',
  },
  {
    sec: 'Transporte',
    q: '¿Qué controla rwnd y qué controla cwnd?',
    options: [
      'rwnd = control de FLUJO (no saturar al receptor); cwnd = control de CONGESTIÓN (no saturar la red).',
      'Ambos controlan la congestión de la red.',
      'rwnd mira la red y cwnd al receptor.',
      'Ninguno afecta la tasa de envío.',
    ],
    correct: 0,
    explain: 'La tasa se limita por min(rwnd, cwnd). No confundir flujo (problema del receptor) con congestión (problema de la red).',
  },
  {
    sec: 'Transporte',
    q: 'Durante slow start, cwnd crece…',
    options: [
      'Exponencialmente (se duplica cada RTT) hasta ssthresh.',
      'Linealmente, +1 MSS por RTT.',
      'Se mantiene constante.',
      'Se reduce a la mitad cada RTT.',
    ],
    correct: 0,
    explain: 'Slow start = crecimiento exponencial; superado ssthresh pasa a congestion avoidance (lineal, AIMD).',
  },
  /* ---------- Red · data ---------- */
  {
    sec: 'Red · data',
    q: '¿Quién reensambla un datagrama IP fragmentado?',
    options: [
      'Únicamente el host destino final.',
      'Cada router intermedio del camino.',
      'El primer router que lo fragmentó.',
      'El switch de capa 2.',
    ],
    correct: 0,
    explain: 'Reensambla SOLO el destino (complejidad a los extremos). Si falta un fragmento se descarta todo el datagrama. IPv6 ni fragmenta en routers.',
  },
  {
    sec: 'Red · data',
    q: 'Si en la tabla matchean 200.23.16.0/20 y 200.23.16.0/23, ¿cuál usa el router?',
    options: [
      'La más específica: /23 (Longest Prefix Match).',
      'La menos específica: /20.',
      'La primera que aparece en la tabla.',
      'Ninguna: hay empate.',
    ],
    correct: 0,
    explain: 'Longest Prefix Match: gana el prefijo más largo (la ruta más específica).',
  },
  {
    sec: 'Red · data',
    q: 'En NAT, ¿qué reescribe el router de borde?',
    options: [
      'La IP y el puerto de origen, manteniendo una tabla de traducción.',
      'Solo la MAC de destino.',
      'Únicamente el TTL.',
      'Nada: NAT es transparente a IP.',
    ],
    correct: 0,
    explain: 'NAT mapea (IP privada, puerto) ↔ (IP pública, puerto). Trampa: rompe el principio end-to-end y complica las conexiones entrantes.',
  },
  /* ---------- Red · control ---------- */
  {
    sec: 'Red · control',
    q: 'En Dijkstra, cuando un nodo entra a N′, su costo D…',
    options: [
      'Queda definitivo: es el costo de camino mínimo.',
      'Todavía puede bajar en pasos siguientes.',
      'Se reinicia a infinito.',
      'Se duplica.',
    ],
    correct: 0,
    explain: 'Se agrega siempre el de menor D fuera de N′, y ese valor ya es óptimo; después solo se relajan los que quedan afuera.',
  },
  {
    sec: 'Red · control',
    q: 'BGP selecciona rutas principalmente según…',
    options: [
      'Políticas comerciales (local-pref) y luego AS-PATH; NO el costo físico.',
      'El camino más corto en kilómetros.',
      'El menor número de saltos IP, siempre.',
      'Un sorteo aleatorio.',
    ],
    correct: 0,
    explain: 'Orden: local-pref → AS-PATH más corto → hot-potato → desempate. Por eso el camino físico corto a veces "no existe" comercialmente.',
  },
  {
    sec: 'Red · control',
    q: '"Hot-potato routing" (papa caliente) significa…',
    options: [
      'Sacar el paquete de MI AS por el egress de menor costo IGP.',
      'Elegir siempre el camino global más corto.',
      'Retener el paquete hasta que baje la congestión.',
      'Descartar el paquete más viejo de la cola.',
    ],
    correct: 0,
    explain: 'Papa caliente: minimizar mi costo interno, aunque el camino total termine siendo más largo.',
  },
  {
    sec: 'Red · control',
    q: 'El "count-to-infinity" es un problema propio de…',
    options: [
      'Distance-Vector (Bellman-Ford) cuando cae un enlace.',
      'Link-State (Dijkstra).',
      'BGP exclusivamente.',
      'CSMA/CD.',
    ],
    correct: 0,
    explain: '"Las malas noticias viajan lento". Poisoned reverse lo mitiga para loops de 2 nodos, pero no de 3 o más.',
  },
  /* ---------- Enlace ---------- */
  {
    sec: 'Enlace',
    q: '¿Para qué sirve ARP?',
    options: [
      'Traducir una IP a su MAC dentro de la MISMA subred.',
      'Traducir nombres a IPs.',
      'Rutear entre subredes distintas.',
      'Asignar direcciones IP dinámicamente.',
    ],
    correct: 0,
    explain: 'ARP resuelve IP→MAC en el enlace local. Trampa: la MAC destino cambia salto a salto; la IP destino final NO.',
  },
  {
    sec: 'Enlace',
    q: 'Un switch de capa 2 arma su tabla aprendiendo…',
    options: [
      'Las MAC de ORIGEN de las tramas que ve (self-learning).',
      'Las IPs de destino.',
      'Las rutas que le pasa BGP.',
      'Los puertos TCP abiertos.',
    ],
    correct: 0,
    explain: 'Aprende por MAC origen y el puerto por el que llegó; si no conoce la MAC destino, inunda (flooding) por todos los puertos menos el de entrada.',
  },
  {
    sec: 'Enlace',
    q: 'En CSMA/CD, tras la n-ésima colisión, K se sortea en…',
    options: [
      '{0, 1, …, 2^min(n,10) − 1}.',
      '{1, 2, …, n}.',
      'Siempre {0, 1}.',
      '{0, 1, …, n²}.',
    ],
    correct: 0,
    explain: 'Backoff exponencial binario: se espera K×512 tiempos de bit. Tras 16 intentos se abandona la trama.',
  },
  /* ---------- Inalámbrica ---------- */
  {
    sec: 'Inalámbrica',
    q: 'WiFi usa CSMA/CA (avoidance) en vez de CD porque…',
    options: [
      'No puede detectar colisiones mientras transmite (y existe el terminal oculto).',
      'Detectar es más rápido que evitar.',
      'El cable coaxil no lo permite.',
      'La detección está prohibida por norma.',
    ],
    correct: 0,
    explain: 'En radio una estación no se escucha a sí misma y hay terminales ocultos → conviene EVITAR (ACKs y RTS/CTS opcional) en vez de detectar.',
  },
  {
    sec: 'Inalámbrica',
    q: 'El problema del "terminal oculto" ocurre cuando…',
    options: [
      'Dos estaciones no se escuchan entre sí, pero ambas llegan al AP y colisionan ahí.',
      'Una estación apaga su antena.',
      'El AP oculta su SSID.',
      'Un atacante espía la red.',
    ],
    correct: 0,
    explain: 'A y C están fuera de alcance mutuo y colisionan EN el AP. RTS/CTS con el vector NAV reserva el medio y lo mitiga.',
  },
  /* ---------- Seguridad ---------- */
  {
    sec: 'Seguridad',
    q: 'En el esquema híbrido (ej. TLS), ¿para qué se usa la criptografía asimétrica?',
    options: [
      'Para intercambiar/autenticar la clave de sesión; los datos van con simétrica.',
      'Para cifrar TODOS los datos, porque es más rápida.',
      'No se usa asimétrica en TLS.',
      'Para calcular el checksum del paquete.',
    ],
    correct: 0,
    explain: 'Asimétrica (lenta) para el handshake y la clave; simétrica (rápida) para el grueso de los datos. Lo mejor de los dos mundos.',
  },
  {
    sec: 'Seguridad',
    q: 'Un certificado digital vincula…',
    options: [
      'Una identidad con su clave pública, firmado por una CA.',
      'Una IP con una MAC.',
      'Un usuario con su contraseña.',
      'Un puerto con un proceso.',
    ],
    correct: 0,
    explain: 'La CA firma el certificado; el cliente valida la cadena hasta una raíz de confianza. Es lo que frena el man-in-the-middle.',
  },
  {
    sec: 'Seguridad',
    q: '¿Qué propiedades aporta HMAC?',
    options: [
      'Integridad + autenticación del origen (con clave compartida).',
      'Confidencialidad (cifra los datos).',
      'No repudio.',
      'Disponibilidad.',
    ],
    correct: 0,
    explain: 'HMAC = hash con clave: detecta modificaciones y autentica al emisor. Trampa: NO cifra (sin confidencialidad) ni da no-repudio (eso lo da la firma con clave privada).',
  },
];

@Component({
  selector: 'app-quiz-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="anim">
      <div class="head">
        <div class="titles">
          <div class="title">🎯 Modo Quiz: autoevaluación tipo oral</div>
          <div class="caption">Filtrá por sección o rendí todas. Cada pregunta trae la trampa explicada.</div>
        </div>
        <div class="score">Aciertos: <b>{{ score() }}</b> / {{ answeredCount() }}</div>
      </div>

      <div class="filters">
        <button class="fchip" [class.on]="filter() === 'all'" (click)="setFilter('all')">Todas ({{ total }})</button>
        @for (s of sections; track s) {
          <button class="fchip" [class.on]="filter() === s" (click)="setFilter(s)">{{ s }}</button>
        }
      </div>

      @if (pool().length === 0) {
        <div class="empty">No hay preguntas para esa sección.</div>
      } @else if (finished()) {
        <div class="result">
          <div class="rbig">{{ resultEmoji() }}</div>
          <div class="rscore">{{ score() }} / {{ pool().length }}</div>
          <div class="rmsg">{{ resultMsg() }}</div>
          <button class="restart" (click)="restart()">↺ Reintentar</button>
        </div>
      } @else {
        <div class="progress">
          <div class="pbar"><div class="pfill" [style.width.%]="((idx()) / pool().length) * 100"></div></div>
          <span class="pnum">Pregunta {{ idx() + 1 }} de {{ pool().length }}</span>
          <span class="psec">{{ current().sec }}</span>
        </div>

        <div class="qcard">
          <div class="qtext">{{ current().q }}</div>
          <div class="opts">
            @for (o of current().options; track $index; let i = $index) {
              <button class="opt"
                      [class.correct]="answered() && i === current().correct"
                      [class.wrong]="answered() && i === selected() && i !== current().correct"
                      [class.locked]="answered()"
                      [disabled]="answered()"
                      (click)="answer(i)">
                <span class="oletter">{{ letters[i] }}</span>
                <span class="otext">{{ o }}</span>
                @if (answered() && i === current().correct) { <span class="omark ok">✔</span> }
                @if (answered() && i === selected() && i !== current().correct) { <span class="omark no">✗</span> }
              </button>
            }
          </div>

          @if (answered()) {
            <div class="explain" [class.good]="selected() === current().correct">
              <b>{{ selected() === current().correct ? '¡Correcto!' : 'Casi…' }}</b>
              {{ current().explain }}
            </div>
            <div class="qactions">
              <button class="nextb" (click)="next()">
                {{ idx() === pool().length - 1 ? 'Ver resultado →' : 'Siguiente →' }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .anim { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin: 18px 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .title { font-weight: 700; font-size: 1.02rem; color: #fff; }
    .caption { color: var(--text-dim); font-size: 0.85rem; margin-top: 2px; }
    .score { background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 7px 12px; font-size: 0.85rem; color: var(--text-dim); white-space: nowrap; }
    .score b { color: #7ee787; font-size: 1.05rem; }

    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .fchip { background: var(--panel-2); color: var(--text-dim); border: 1px solid var(--border); border-radius: 16px; padding: 5px 12px; cursor: pointer; font-size: 0.78rem; transition: all 0.15s; }
    .fchip:hover { color: var(--text); border-color: #4a5878; }
    .fchip.on { background: #1f6feb; border-color: #1f6feb; color: #fff; font-weight: 700; }

    .empty { color: var(--text-dim); font-style: italic; padding: 20px; text-align: center; }

    .progress { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .pbar { flex: 1; height: 8px; background: #10151f; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
    .pfill { height: 100%; background: linear-gradient(90deg, #1f6feb, #58a6ff); transition: width 0.3s; }
    .pnum { font-size: 0.78rem; color: var(--text-dim); white-space: nowrap; }
    .psec { font-size: 0.72rem; color: #ffd54f; border: 1px solid #d2992244; border-radius: 12px; padding: 2px 10px; white-space: nowrap; }

    .qcard { background: #10151f; border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .qtext { font-size: 1.05rem; font-weight: 600; color: #fff; margin-bottom: 16px; line-height: 1.4; }
    .opts { display: flex; flex-direction: column; gap: 8px; }
    .opt {
      display: flex; align-items: center; gap: 12px; text-align: left;
      background: var(--panel-2); border: 1.5px solid var(--border); border-radius: 10px;
      padding: 12px 14px; cursor: pointer; color: var(--text); font-size: 0.92rem; transition: all 0.15s; width: 100%;
    }
    .opt:hover:not(.locked) { border-color: #1f6feb; background: #232b3e; }
    .opt.locked { cursor: default; }
    .opt.correct { border-color: #2ea043; background: rgba(46,160,67,0.12); }
    .opt.wrong { border-color: #ef5350; background: rgba(239,83,80,0.12); }
    .oletter { flex-shrink: 0; width: 26px; height: 26px; border-radius: 7px; background: #0b0f19; border: 1px solid var(--border); display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; color: var(--text-dim); }
    .opt.correct .oletter { background: #2ea043; color: #fff; border-color: #2ea043; }
    .opt.wrong .oletter { background: #ef5350; color: #fff; border-color: #ef5350; }
    .otext { flex: 1; line-height: 1.4; }
    .omark { flex-shrink: 0; font-weight: 900; font-size: 1.1rem; }
    .omark.ok { color: #7ee787; } .omark.no { color: #ef9a9a; }

    .explain { margin-top: 14px; background: rgba(239,83,80,0.08); border-left: 3px solid #ef5350; border-radius: 0 8px 8px 0; padding: 11px 14px; font-size: 0.88rem; line-height: 1.55; color: var(--text); }
    .explain.good { background: rgba(46,160,67,0.1); border-left-color: #2ea043; }
    .explain b { color: #fff; margin-right: 4px; }
    .qactions { display: flex; justify-content: flex-end; margin-top: 14px; }
    .nextb { background: #1f6feb; border: none; color: #fff; font-weight: 700; border-radius: 10px; padding: 10px 20px; cursor: pointer; font-size: 0.92rem; }
    .nextb:hover { background: #388bfd; }

    .result { text-align: center; padding: 30px 16px; }
    .rbig { font-size: 3.4rem; line-height: 1; }
    .rscore { font-size: 2rem; font-weight: 800; color: #ffd54f; margin: 8px 0 4px; font-family: Consolas, monospace; }
    .rmsg { color: var(--text-dim); font-size: 0.95rem; margin-bottom: 20px; }
    .restart { background: var(--panel-2); border: 1px solid var(--border); color: var(--text); font-weight: 700; border-radius: 10px; padding: 10px 22px; cursor: pointer; font-size: 0.92rem; }
    .restart:hover { border-color: #1f6feb; background: #232b3e; }
  `,
})
export class QuizDetail {
  readonly total = QUESTIONS.length;
  readonly letters = ['A', 'B', 'C', 'D', 'E'];
  readonly sections = [...new Set(QUESTIONS.map((q) => q.sec))];

  readonly filter = signal<string>('all');
  readonly idx = signal(0);
  readonly selected = signal<number | null>(null);
  readonly score = signal(0);
  readonly answeredCount = signal(0);

  readonly pool = computed(() =>
    this.filter() === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.sec === this.filter()),
  );

  readonly current = computed(() => this.pool()[this.idx()]);
  readonly answered = computed(() => this.selected() !== null);
  readonly finished = computed(() => this.pool().length > 0 && this.idx() >= this.pool().length);

  setFilter(s: string): void {
    if (this.filter() === s) return;
    this.filter.set(s);
    this.restart();
  }

  answer(i: number): void {
    if (this.selected() !== null) return;
    this.selected.set(i);
    this.answeredCount.update((n) => n + 1);
    if (i === this.current().correct) this.score.update((n) => n + 1);
  }

  next(): void {
    this.idx.update((n) => n + 1);
    this.selected.set(null);
  }

  restart(): void {
    this.idx.set(0);
    this.selected.set(null);
    this.score.set(0);
    this.answeredCount.set(0);
  }

  resultEmoji(): string {
    const r = this.score() / this.pool().length;
    return r >= 0.9 ? '🏆' : r >= 0.7 ? '🎉' : r >= 0.5 ? '👍' : '📚';
  }
  resultMsg(): string {
    const r = this.score() / this.pool().length;
    if (r >= 0.9) return '¡Listo para el oral! Dominás las trampas.';
    if (r >= 0.7) return 'Muy bien. Repasá las que fallaste y vas de una.';
    if (r >= 0.5) return 'Vas por buen camino: reforzá los conceptos flojos.';
    return 'A repasar el machete y volvé a intentarlo. ¡Se puede!';
  }
}
