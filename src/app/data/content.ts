export interface Topic {
  title: string;
  html: string;
  widget?:
    | 'cwnd'
    | 'tcp-seq'
    | 'gbn-sim'
    | 'nat-detail'
    | 'encap'
    | 'switch-detail'
    | 'dns-detail'
    | 'day-detail'
    | 'delays-detail'
    | 'cdn-detail'
    | 'mitm-detail'
    | 'dhcp-detail'
    | 'traceroute-detail'
    | 'arp-detail'
    | 'wifi-detail'
    | 'tls-detail'
    | 'frag-detail'
    | 'dijkstra-detail'
    | 'bgp-detail'
    | 'subnet-detail'
    | 'csmacd-detail'
    | 'quiz-detail'
    | 'router-detail'
    | 'sdn-detail'
    | 'dv-detail'
    | 'http2-detail'
    | 'wpa-detail'
    | 'ipsec-detail'
    | 'playout-detail'
    | 'tcp-sim'
    | 'crc-detail'
    | 'switching-detail'
    | 'flowctl-detail'
    | 'mac-detail'
    | 'cast-detail'
    | 'dvconv-detail'
    | 'mobility-detail'
    | 'medium-detail'
    | 'cellular-detail'
    | 'assoc-detail'
    | 'csmaca-detail'
    | 'frame80211-detail'
    | 'crypto-detail'
    | 'cbc-detail'
    | 'sign-detail'
    | 'authproto-detail'
    | 'firewall-detail'
    | 'secprops-detail'
    | 'fabric-detail'
    | 'bgppropag-detail'
    | 'ospf-detail'
    | 'rip-detail'; // componentes a medida
}

export interface Section {
  slug: string;
  title: string;
  short: string;
  icon: string;
  color: string;
  tagline: string;
  layerTag: string;
  topics: Topic[];
}

export const SECTIONS: Section[] = [
  /* ================================================================ */
  {
    slug: 'fundamentos',
    title: 'Fundamentos de Internet',
    short: 'Fundamentos',
    icon: '🌐',
    color: '#64b5f6',
    layerTag: 'Bloque 0 · Cap. 1',
    tagline: 'Qué es Internet, conmutación, retardos, capas y encapsulamiento.',
    topics: [
      {
        title: '¿Qué es Internet? Dos vistas',
        html: `
<p>La <strong>vista de componentes (nuts and bolts)</strong>: una red de redes. En el borde están los <strong>hosts</strong> (end systems), conectados por <strong>enlaces</strong> (fibra, cobre, radio — caracterizados por su ancho de banda en bits/s) y por <strong>switches de paquetes</strong> (routers en el núcleo, switches en el acceso), todo interconectado por <strong>ISPs</strong> jerárquicos (acceso → regionales → tier-1 que forman el backbone).</p>
<p>La <strong>vista de servicios</strong>: una infraestructura que provee servicios a las aplicaciones distribuidas, ofreciendo una <strong>API de sockets</strong> — el "contrato" con la red, como el servicio postal exige sobre, dirección y estampilla.</p>
<p>El concepto que atraviesa toda la materia: un <strong>protocolo</strong> define el <strong>formato</strong> y el <strong>orden</strong> de los mensajes intercambiados, y las <strong>acciones</strong> al transmitir o recibir. Todo rigurosamente especificado (RFCs, IETF).</p>
<span class="tip">Si te piden "definí Internet", mostrá las DOS caras: componentes y servicios.</span>`,
      },
      {
        title: 'Redes de acceso y medios físicos',
        html: `
<ul>
<li><strong>DSL</strong>: línea telefónica de cobre, módem ↔ DSLAM. Enlace <strong>dedicado</strong> y asimétrico.</li>
<li><strong>Cable (HFC)</strong>: fibra al barrio + coaxil a las casas, CMTS del lado del operador. Medio <strong>compartido</strong> entre vecinos → necesita protocolo de acceso múltiple (DOCSIS).</li>
<li><strong>FTTH</strong>: fibra hasta el hogar, la de mayor capacidad (PON).</li>
<li><strong>Ethernet y WiFi</strong>: el acceso típico en empresas y hogares.</li>
<li><strong>Celular 4G/5G</strong>: radio a la estación base.</li>
</ul>
<p>Medios <strong>guiados</strong> (par trenzado, coaxil, fibra — inmune a interferencia, domina backbones) vs <strong>no guiados</strong> (radio, satélite).</p>`,
      },
      {
        title: 'Core: forwarding vs routing',
        html: `
<p>Dos palabras que en castellano suenan casi igual y que <strong>siempre</strong> se piden diferenciadas. La distinción es de <strong>alcance</strong> y de <strong>escala de tiempo</strong>:</p>
<ul>
<li><strong>Forwarding (reenvío)</strong> — acción <strong>LOCAL</strong> y de <strong>un solo router</strong>: llega un paquete por una interfaz de entrada, se consulta la tabla y se lo saca por la interfaz de salida correcta. Ocurre en <strong>nanosegundos</strong>, en <strong>hardware</strong>, para <em>cada</em> paquete. Es el <strong>data plane</strong>.</li>
<li><strong>Routing (enrutamiento)</strong> — proceso <strong>GLOBAL</strong> y de <strong>toda la red</strong>: determinar qué camino punta a punta van a seguir los paquetes. Ocurre en <strong>segundos</strong>, en <strong>software</strong>, y solo cuando la topología cambia. Es el <strong>control plane</strong>.</li>
</ul>
<p><strong>La relación entre los dos</strong>: el routing <strong>arma la tabla</strong> que el forwarding después <strong>consulta</strong>. Uno decide el plan; el otro lo ejecuta millones de veces por segundo sin pensar.</p>
<span class="tip">La analogía del libro: el <strong>routing</strong> es <em>planificar el viaje completo</em> en el mapa antes de salir; el <strong>forwarding</strong> es <em>pasar por un cruce concreto y doblar</em> según el cartel. Otra forma de decirlo: forwarding responde "¿por dónde sale <strong>este</strong> paquete?", routing responde "¿cuál es <strong>el camino</strong> hacia esa red?".</span>
<p>Por qué importa separarlos: son los <strong>dos planos</strong> sobre los que se organiza toda la capa de red, y es lo que hace posible <strong>SDN</strong> — si el control plane está desacoplado, se lo puede <strong>sacar del router</strong> y centralizar en un controlador, dejando al equipo solo con el forwarding.</p>`,
      },
      {
        title: 'Conmutación: paquetes vs circuitos',
        widget: 'switching-detail',
        html: `
<p>Las dos formas de mover datos por una red compartida, y la decisión de diseño que define a Internet.</p>
<h4>Conmutación de circuitos (la telefonía clásica)</h4>
<p>Antes de mandar nada se <strong>establece un circuito</strong>: se <strong>reservan recursos de punta a punta</strong> (ancho de banda en cada enlace, buffers) <strong>para esa conversación y nadie más</strong>. La reserva se hace de dos maneras:</p>
<ul>
<li><strong>FDM</strong> (por frecuencia): cada circuito se queda con <strong>una banda</strong> del espectro del enlace, todo el tiempo.</li>
<li><strong>TDM</strong> (por tiempo): el tiempo se divide en <strong>slots</strong> y cada circuito usa <strong>siempre el mismo slot</strong> de cada trama.</li>
</ul>
<p><strong>La ventaja</strong>: performance <strong>garantizada y constante</strong> — la tasa está reservada, no hay colas ni sorpresas. <strong>La desventaja</strong>: los recursos quedan <strong>reservados aunque no se usen</strong>. En una conversación telefónica hay silencios; en una sesión de datos, largas pausas mientras leés la pantalla. Todo ese tiempo el circuito está <strong>desperdiciado</strong> y nadie más puede aprovecharlo. Además hay que pagar el <strong>tiempo de establecimiento</strong> antes de mandar el primer bit.</p>
<h4>Conmutación de paquetes (Internet)</h4>
<p>No se reserva nada. Los datos se parten en <strong>paquetes independientes</strong> que compiten por los enlaces, y cada router hace <strong>store-and-forward</strong>: <strong>recibe el paquete COMPLETO antes de empezar a reenviarlo</strong> (necesita tenerlo entero para verificar el CRC y leer el header). Por eso atravesar N enlaces con un paquete de L bits cuesta <span class="formula">N · L/R</span>, y no L/R.</p>
<p>Los recursos se usan <strong>on-demand</strong>, con <strong>multiplexación estadística</strong>: quien tiene datos para mandar, manda. Es <strong>mucho más eficiente para tráfico a ráfagas</strong> (que es como se comporta casi todo el tráfico real). El precio: sin reservas, si coinciden muchos a la vez hay <strong>congestión, colas y pérdidas</strong>, y ninguna garantía de tasa ni de demora.</p>
<h4>El argumento cuantitativo (el cálculo clásico)</h4>
<p>Enlace de <strong>1 Mbps</strong>, usuarios que consumen <strong>100 kbps</strong> cuando están activos, y que están activos solo el <strong>10% del tiempo</strong>:</p>
<ul>
<li><strong>Con circuitos</strong>: hay que reservarle 100 kbps a cada uno <em>todo el tiempo</em> → entran exactamente <strong>10 usuarios</strong>. Punto.</li>
<li><strong>Con paquetes</strong>: se pueden admitir <strong>35 usuarios</strong>, porque la probabilidad de que <strong>más de 10 estén activos simultáneamente</strong> es de apenas <strong>≈ 0,0004</strong>. Es decir: el 99,96% del tiempo alcanza para todos.</li>
</ul>
<p><strong>Más del triple de usuarios sobre el mismo enlace</strong>, a cambio de que en un 0,04% de los casos haya congestión. Ese es <strong>el</strong> argumento a favor de la conmutación de paquetes, y explica por qué Internet se diseñó así.</p>
<span class="tip">La objeción que puede aparecer: "¿y si el tráfico <em>no</em> es a ráfagas?". Para flujos constantes y sensibles a la demora, los circuitos son <strong>mejores</strong> — por eso la telefonía los usó durante un siglo. La apuesta de Internet fue que <strong>la mayoría del tráfico ES a ráfagas</strong> y que la simplicidad y eficiencia compensan la falta de garantías. Ganó esa apuesta; y para lo que necesitaba garantías, se inventaron parches encima (QoS, WFQ, MPLS).</span>`,
      },
      {
        title: 'Los 4 retardos nodales',
        widget: 'delays-detail',
        html: `
<p>El retardo total de un paquete al pasar por <strong>un nodo</strong> se descompone en cuatro sumandos. Es de lo más preguntado, y lo importante es saber <strong>de qué depende cada uno</strong>:</p>
<p><span class="formula">d_nodal = d_proc + d_queue + d_trans + d_prop</span></p>
<h4>1 · Retardo de procesamiento (d_proc)</h4>
<p>Examinar el header, verificar errores de bit y <strong>decidir por qué interfaz sale</strong> el paquete. En routers modernos es del orden de <strong>microsegundos</strong> — suele ser despreciable frente a los demás.</p>
<h4>2 · Retardo de cola (d_queue)</h4>
<p>El tiempo que el paquete <strong>espera en el buffer</strong> a que le toque transmitirse, porque el enlace está ocupado con los que llegaron antes. <strong>Es el ÚNICO que varía paquete a paquete</strong> — depende del nivel de congestión <em>en ese instante</em>. Por eso es <strong>la causa del jitter</strong>, y por eso es el más difícil de predecir.</p>
<p>Se caracteriza con la <strong>intensidad de tráfico</strong> <span class="formula">La/R</span>, donde <em>L</em> es el tamaño del paquete, <em>a</em> la tasa promedio de llegadas y <em>R</em> la del enlace:</p>
<ul>
<li><strong>La/R ≈ 0</strong> → casi no hay cola.</li>
<li><strong>La/R → 1</strong> → la cola crece <strong>de forma NO lineal</strong>: tiende a infinito. Esa curva que se dispara cerca de 1 es la que hay que saber dibujar.</li>
<li><strong>La/R &gt; 1</strong> → llega más de lo que puede salir: la cola crece sin límite y <strong>empieza a haber pérdidas</strong>.</li>
</ul>
<h4>3 · Retardo de transmisión (d_trans = L/R)</h4>
<p>El tiempo de <strong>empujar todos los bits del paquete al enlace</strong>, es decir, desde que sale el primer bit hasta que sale el último. Depende del <strong>tamaño del paquete (L)</strong> y del <strong>ancho de banda del enlace (R)</strong>. <strong>No depende de la distancia.</strong></p>
<h4>4 · Retardo de propagación (d_prop = d/s)</h4>
<p>El tiempo que tarda <strong>un bit</strong> en viajar físicamente por el medio, desde el principio del enlace hasta el final. Depende de la <strong>distancia (d)</strong> y de la <strong>velocidad de propagación del medio (s ≈ 2×10⁸ m/s)</strong>. <strong>No depende del ancho de banda</strong> ni del tamaño del paquete.</p>
<span class="warn"><strong>d_trans vs d_prop es LA confusión clásica</strong>, y hay que poder explicarla en una frase: <strong>d_trans</strong> es <em>cuánto tardás en meter el paquete al caño</em>; <strong>d_prop</strong> es <em>cuánto tarda el caño en llevarlo hasta el otro lado</em>. La analogía: una <strong>autopista ancha</strong> (mucho R, d_trans chico) no es lo mismo que una <strong>autopista corta</strong> (poca distancia, d_prop chico). El ejemplo canónico es el <strong>enlace satelital</strong>: tiene <strong>muchísimos bits por segundo</strong> (d_trans chiquísimo) pero el satélite está a 36.000 km, así que cada bit tarda ~<strong>250 ms</strong> en llegar (d_prop enorme). Podés mandar un archivo gigante rapidísimo, pero un <em>ping</em> tarda medio segundo.</span>
<h4>Pérdida de paquetes</h4>
<p>Los buffers son <strong>finitos</strong>. Si llega un paquete y la cola está llena, <strong>se descarta</strong> — se pierde. Desde el punto de vista del nodo, no hay nada más que hacer: no existe "esperar un poquito más". La recuperación, si la hay, la hacen <strong>los extremos</strong> (TCP retransmite), fiel al principio end-to-end. Y para el usuario, un paquete perdido se traduce en un retardo <em>mucho</em> mayor: hay que esperar a que el emisor lo note y lo mande de nuevo.</p>
<span class="tip">Del retardo <strong>nodal</strong> al <strong>punta a punta</strong>: se suma el d_nodal de cada uno de los N nodos del camino. Si todos los enlaces son iguales y no hay colas: <span class="formula">d_end-to-end = N · (d_proc + d_trans + d_prop)</span>. Y esto es exactamente lo que <code>traceroute</code> te deja medir salto por salto.</span>`,
      },
      {
        title: 'Métricas y herramientas',
        widget: 'playout-detail',
        html: `
<h4>Las cuatro métricas</h4>
<ul>
<li><strong>Latencia / RTT</strong> — el RTT es el tiempo de <strong>ida y vuelta</strong>. Se mide con <code>ping</code> (ICMP Echo request/reply). Ojo: <strong>no es la mitad del RTT necesariamente</strong>, porque los caminos de ida y vuelta pueden ser <strong>asimétricos</strong>. Tiene un piso <strong>físico</strong> insalvable: la velocidad de la luz. Buenos Aires–Madrid son ~10.000 km, así que ni con fibra perfecta bajás de ~100 ms de RTT — <strong>por eso las CDNs acercan el contenido</strong>, no hay optimización de software que gane a la distancia.</li>
<li><strong>Throughput</strong> — la tasa <strong>efectiva</strong> de transferencia (distinta del ancho de banda nominal). En un camino de varios enlaces lo fija el <strong>cuello de botella</strong>: <span class="formula">min(R₁, R₂, …, Rₙ)</span>. Poner un enlace más rápido en cualquier otro lado <strong>no cambia nada</strong>. Hoy el cuello suele estar en el <strong>acceso</strong> (tu conexión de casa), no en el core.</li>
<li><strong>Jitter</strong> — la <strong>variación</strong> de la latencia entre paquetes. Nace del <strong>retardo de cola</strong>, que cambia según la congestión instantánea. Es <strong>crítico en tiempo real</strong>: para una llamada, 100 ms constantes son mejores que un promedio de 50 ms que salta entre 10 y 200. Se compensa con un <strong>playout buffer</strong> (el del diagrama): se acumulan unos milisegundos antes de reproducir, cambiando <em>un poco</em> de latencia por reproducción pareja.</li>
<li><strong>Packet loss</strong> — la fracción de paquetes descartados, casi siempre por <strong>buffers llenos</strong> en los routers. No es una anomalía rara: es la <strong>señal</strong> con la que TCP detecta congestión.</li>
</ul>
<span class="tip">La confusión clásica: <strong>latencia ≠ ancho de banda</strong>. El ancho de banda es <em>cuántos datos por segundo</em>; la latencia es <em>cuánto tarda el primero en llegar</em>. Más ancho de banda no baja la latencia. La analogía: un camión lleno de discos cruzando el país tiene <strong>throughput enorme</strong> y <strong>latencia pésima</strong>.</span>
<h4>Las herramientas</h4>
<ul>
<li><code>ping</code> — RTT y pérdida, con <strong>ICMP Echo</strong>. Si no responde, puede ser que el host esté caído… o que un <strong>firewall bloquee ICMP</strong>.</li>
<li><code>traceroute</code> — el camino salto a salto, mandando paquetes con <strong>TTL creciente</strong> y juntando los <strong>ICMP Time Exceeded</strong> que devuelve cada router.</li>
<li><code>dig</code> / <code>nslookup</code> — consultas DNS: qué responde cada servidor, qué registros hay, cuánto TTL les queda.</li>
<li><code>whois</code> — a quién le pertenece un dominio o un bloque de IPs (útil para ver la asignación RIR → ISP).</li>
<li><strong>Wireshark</strong> — el analizador de paquetes: captura el tráfico real y te deja abrir <strong>capa por capa</strong> el encapsulamiento. Es la herramienta que hace visible todo lo teórico de la materia.</li>
</ul>`,
      },
      {
        title: 'Modelo de capas y encapsulamiento',
        widget: 'encap',
        html: `
<h4>Por qué capas</h4>
<p>Una red es un sistema <strong>enormemente complejo</strong>. Dividirlo en capas da <strong>modularidad</strong>: cada capa ofrece un <strong>servicio</strong> a la de arriba usando el servicio de la de abajo, y <strong>oculta cómo lo hace</strong>. Eso permite <strong>cambiar la implementación de una capa sin tocar las demás</strong> — pasás de cable a WiFi y ni TCP ni HTTP se enteran.</p>
<p><strong>El costo</strong>, que también se pregunta: hay <strong>funcionalidad duplicada</strong> (checksums en enlace, red y transporte) y a veces una capa <strong>necesita información de otra</strong> (el control de congestión de TCP querría saber si la pérdida fue por congestión o por errores de radio — y no puede). Y en la práctica hay <strong>violaciones</strong> deliberadas: <strong>NAT</strong> es capa 3 manipulando puertos de capa 4.</p>
<h4>Los modelos</h4>
<p>El modelo <strong>TCP/IP</strong> tiene <strong>4 capas</strong>: <strong>Aplicación, Transporte, Red y Enlace</strong>. La transmisión de <strong>bits</strong> por el medio queda dentro de la de enlace.</p>
<p>Los otros dos modelos que conviene ubicar:</p>
<ul>
<li><strong>El de 5 capas</strong> (el que usa Kurose): separa la <strong>capa Física</strong> de la de enlace.</li>
<li><strong>OSI</strong> (7 capas): además de la física, suma <strong>Presentación</strong> (cifrado, compresión, formato de los datos — hoy la absorbe la propia aplicación, por ejemplo con TLS) y <strong>Sesión</strong> (sincronización y checkpointing de diálogos). Se lo estudia como referencia conceptual, pero <strong>lo que se implementa realmente es TCP/IP</strong>.</li>
</ul>
<h4>Encapsulamiento (los nombres se preguntan)</h4>
<p>Al bajar por el stack, cada capa <strong>agrega su propio header</strong> a lo que recibió de arriba, que pasa a ser su <em>payload</em>. Y la unidad cambia de nombre en cada nivel:</p>
<ul>
<li>Aplicación → <strong>mensaje</strong></li>
<li>Transporte → <strong>segmento</strong> (header con los <strong>puertos</strong>)</li>
<li>Red → <strong>datagrama</strong> (header con las <strong>IPs</strong>)</li>
<li>Enlace → <strong>trama</strong> (header con las <strong>MACs</strong> + trailer con <strong>CRC</strong>) → sale al medio como <strong>bits</strong></li>
</ul>
<p>En el receptor pasa lo inverso: cada capa <strong>saca su header</strong> y le entrega el resto a la de arriba. Y para saber a quién entregárselo existen los campos "de pegamento": el <strong>tipo</strong> de Ethernet (0x0800 = IP), el <strong>protocol</strong> de IP (6 = TCP) y el <strong>puerto</strong> de TCP.</p>
<span class="tip"><strong>La regla de oro</strong>: los <strong>hosts</strong> implementan las <strong>4 capas</strong>; los <strong>routers</strong> llegan hasta la capa de <strong>RED</strong> (necesitan leer la IP para rutear); los <strong>switches</strong>, solo hasta <strong>ENLACE</strong> (miran MACs y nada más). Consecuencia directa: <strong>ningún dispositivo intermedio "abre" la capa de transporte</strong>, y por eso TCP puede ser un acuerdo puramente entre los dos extremos. (Los <strong>middleboxes</strong> rompen esta regla, y de ahí todos sus problemas.)</span>`,
      },
      {
        title: 'Panorama de amenazas (adelanto)',
        html: `
<p>Internet no fue diseñada con seguridad de base ("usuarios que confiaban entre sí"). Amenazas macro: <strong>malware</strong> (y botnets), <strong>DoS/DDoS</strong> (agotar recursos con tráfico de miles de bots), <strong>sniffing</strong> (interfaces en modo promiscuo — trivial en medios compartidos como WiFi) y <strong>IP spoofing</strong> (dirección origen falsa). Las defensas, en la sección de Seguridad.</p>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'aplicacion',
    title: 'Capa de Aplicación',
    short: 'Aplicación',
    icon: '📱',
    color: '#4caf50',
    layerTag: 'Bloque 1 · Cap. 2',
    tagline: 'HTTP, DNS, mail, P2P, CDN — los protocolos que usan las apps.',
    topics: [
      {
        title: 'Arquitecturas: cliente-servidor vs P2P',
        html: `
<p>Antes de elegir protocolos hay que elegir <strong>cómo se organizan los procesos</strong>. Hay dos modelos puros (y casi todo lo real es una mezcla).</p>
<h4>Cliente-servidor</h4>
<ul>
<li>Un <strong>servidor siempre encendido</strong>, con <strong>dirección IP fija y conocida</strong>, alojado en un datacenter.</li>
<li>Los <strong>clientes</strong> se conectan de a ratos, pueden tener IP dinámica, y <strong>nunca se comunican entre sí</strong>: todo pasa por el servidor.</li>
<li>Ejemplos: la Web, mail, muchas APIs.</li>
</ul>
<p><strong>La limitación</strong>: un solo servidor <strong>no escala</strong>. Si se suman usuarios, todos golpean la misma máquina y el ancho de banda de subida del servidor se vuelve el cuello de botella. La respuesta de la industria fueron los <strong>datacenters</strong> (miles de servidores + balanceo) y las <strong>CDNs</strong> (replicar el contenido cerca del usuario).</p>
<h4>P2P (peer-to-peer)</h4>
<ul>
<li>No hay (o casi no hay) servidor: los <strong>peers</strong> — máquinas de usuarios comunes, intermitentes y con IP cambiante — <strong>se comunican directamente</strong> entre sí.</li>
<li>Ejemplos: BitTorrent, y el corazón de muchas apps de streaming P2P.</li>
</ul>
<p><strong>La propiedad estrella: la autoescalabilidad.</strong> Es lo que hay que saber explicar. En cliente-servidor, cada usuario nuevo <strong>solo agrega demanda</strong>. En P2P, cada peer nuevo agrega demanda <strong>pero también agrega capacidad</strong>: mientras descarga, también <strong>sirve</strong> pedazos a otros. El sistema <strong>crece con sus propios usuarios</strong>, en vez de ahogarse con ellos — por eso el tiempo de distribución de un archivo a N usuarios <strong>no se dispara linealmente</strong> como en cliente-servidor.</p>
<p><strong>Los contras</strong>, que también se preguntan:</p>
<ul>
<li><strong>Gestión compleja</strong>: los peers entran y salen todo el tiempo (<em>churn</em>), no hay nadie a cargo, y hay que resolver cómo se encuentran entre sí.</li>
<li><strong>Seguridad</strong>: estás recibiendo datos de desconocidos; es difícil garantizar integridad y evitar peers maliciosos.</li>
<li><strong>Incentivos</strong>: hay que evitar el <em>free-riding</em> (bajar sin subir). BitTorrent lo resuelve con la estrategia <strong>tit-for-tat</strong>: le doy prioridad a quien más me da.</li>
<li><strong>ISPs asimétricos</strong>: las conexiones hogareñas tienen <strong>mucha menos subida que bajada</strong>, y P2P depende justamente de la subida.</li>
</ul>
<span class="tip">Casi ninguna app real es 100% pura: lo habitual es <strong>híbrido</strong>. BitTorrent usa un <strong>tracker centralizado</strong> (para que los peers se descubran) y después el <strong>intercambio es P2P</strong>. La parte centralizada resuelve el "¿quién está?", la parte distribuida hace el trabajo pesado.</span>`,
      },
      {
        title: 'Procesos, sockets y puertos',
        html: `
<p>Precisión importante: <strong>no se comunican "las máquinas", se comunican PROCESOS</strong>. Un host corre decenas de programas a la vez, y la red tiene que poder entregarle los datos <strong>al correcto</strong>.</p>
<h4>El socket</h4>
<p>Un <strong>socket</strong> es la <strong>puerta</strong> entre la aplicación y la capa de transporte: la app <strong>empuja</strong> mensajes por ahí y los <strong>recibe</strong> por ahí. Es la <strong>interfaz</strong> (la API) entre las dos capas.</p>
<p>Lo interesante es el <strong>reparto de control</strong>: el desarrollador controla <strong>todo lo que pasa del lado de la aplicación</strong>, pero del lado del transporte solo puede elegir <strong>el protocolo (TCP o UDP)</strong> y ajustar algunos parámetros (tamaño de buffers, por ejemplo). El resto —cómo se retransmite, cómo se controla la congestión— <strong>no se toca</strong>: lo decide el sistema operativo.</p>
<p>En toda comunicación hay un proceso <strong>cliente</strong> (el que <strong>inicia</strong> el contacto) y uno <strong>servidor</strong> (el que <strong>espera</strong> a ser contactado). Esa distinción es <strong>por sesión, no por máquina</strong>: en P2P, el mismo programa actúa de cliente en una transferencia y de servidor en otra.</p>
<h4>Cómo se identifica el destino</h4>
<p>Hacen falta <strong>dos cosas</strong>: la <strong>dirección IP</strong> (ubica el <em>host</em>) y el <strong>número de puerto</strong> (identifica el <em>proceso</em> dentro de ese host). Es el mismo razonamiento de siempre: la calle y el departamento.</p>
<p>Los puertos son de <strong>16 bits</strong> (0–65535) y se dividen en:</p>
<ul>
<li><strong>Well-known</strong> (0–1023): reservados para servicios estándar. Están fijos <strong>por convención</strong> — así el cliente sabe a qué puerto conectarse sin preguntar. Los que hay que saber: <strong>HTTP 80 · HTTPS 443 · DNS 53 · SMTP 25 · DHCP 67/68 · BGP 179</strong> (más FTP 20/21, SSH 22, POP3 110, IMAP 143).</li>
<li><strong>Efímeros</strong> (los altos): los que el sistema operativo le asigna <strong>al cliente</strong> automáticamente. Por eso el <em>puerto origen</em> de tu browser es un número raro y distinto en cada conexión.</li>
</ul>
<h4>Qué le puede pedir una app al transporte</h4>
<p>Son <strong>cuatro dimensiones</strong>, y sirven para justificar por qué cada app elige lo que elige:</p>
<ul>
<li><strong>Transferencia confiable</strong> — ¿tolera perder datos o no?</li>
<li><strong>Throughput</strong> — ¿necesita una tasa mínima garantizada?</li>
<li><strong>Timing</strong> — ¿le importa la demora?</li>
<li><strong>Seguridad</strong> — ¿necesita confidencialidad e integridad?</li>
</ul>
<p>Y con eso se separan dos familias:</p>
<ul>
<li><strong>Apps elásticas</strong> (web, mail, transferencia de archivos): necesitan <strong>confiabilidad total</strong> —un archivo al que le faltan bytes no sirve— pero <strong>toleran demora</strong>: si tarda un segundo más, no pasa nada. → <strong>TCP</strong>.</li>
<li><strong>Apps de tiempo real</strong> (VoIP, videollamadas, juegos): <strong>toleran pérdidas</strong> —un audio con algún hueco se entiende igual— pero <strong>odian la demora</strong>, y tienen un <strong>mínimo de throughput</strong> por debajo del cual no funcionan. → <strong>UDP</strong> con control propio.</li>
</ul>
<span class="warn">Lo que Internet <strong>NO</strong> garantiza: <strong>ni throughput ni timing</strong>. No existe un transporte estándar que prometa "te doy 2 Mbps" o "te entrego en menos de 50 ms" — eso requeriría reservas de recursos en la red, y el modelo <strong>best-effort</strong> de IP no las tiene. <strong>TCP</strong> te da confiabilidad y control de congestión; <strong>UDP</strong> casi nada (y precisamente por eso sirve para tiempo real); y la <strong>seguridad</strong> no la da ninguno de los dos: la agrega <strong>TLS</strong> por encima.</span>`,
      },
      {
        title: 'HTTP: el protocolo de la Web',
        html: `
<p>Una página web <strong>no es un archivo</strong>: es un conjunto de <strong>objetos</strong> (el HTML base más imágenes, CSS, JS…), cada uno con su propia <strong>URL</strong>. El HTML base es el que <em>referencia</em> a los demás, así que el browser primero lo pide, lo parsea y recién ahí sabe qué más tiene que buscar.</p>
<p>HTTP corre sobre <strong>TCP</strong> (puerto <strong>80</strong>; HTTPS <strong>443</strong>) — necesita confiabilidad: una página a la que le faltan bytes no sirve.</p>
<h4>Stateless: la decisión de diseño clave</h4>
<p>HTTP es <strong>sin estado</strong>: el servidor <strong>no recuerda nada</strong> de los requests anteriores del mismo cliente. Cada request se atiende como si fuera el primero.</p>
<p><strong>¿Por qué?</strong> Porque mantener estado por cliente es <strong>caro y frágil</strong>: habría que guardar información de millones de usuarios, decidir cuándo descartarla, y resolver qué pasa si el servidor se cae a mitad de una sesión. Sin estado, <strong>cualquier servidor puede atender cualquier request</strong> — que es lo que permite poner mil máquinas detrás de un balanceador. Es simple y <strong>escala</strong>. El costo: si la app necesita recordar algo (un carrito, un login), hay que agregarlo por afuera → <strong>cookies</strong>.</p>
<h4>Conexiones no persistentes vs persistentes</h4>
<ul>
<li><strong>No persistente</strong> (HTTP/1.0): una <strong>conexión TCP nueva por cada objeto</strong>, que se cierra al terminar. Costo: <strong>2 RTT por objeto</strong> — uno para el <em>three-way handshake</em> y otro para el request/response — más el tiempo de transmisión. Y encima cada conexión nueva arranca en <strong>slow start</strong>, así que nunca alcanza velocidad. Con 20 imágenes, son 40 RTT.</li>
<li><strong>Persistente</strong> (HTTP/1.1, el default): la <strong>misma conexión</strong> se reutiliza para varios objetos. El handshake se paga <strong>una sola vez</strong> y TCP puede acelerar. Con <strong>pipelining</strong>, además, el cliente manda los requests seguidos <strong>sin esperar</strong> cada respuesta.</li>
</ul>
<span class="warn">El pipelining de HTTP/1.1 quedó con un problema: las respuestas deben volver <strong>en el mismo orden</strong> que los pedidos, así que un objeto grande adelante <strong>bloquea</strong> a los chicos que están atrás. Es el <strong>head-of-line blocking</strong> a nivel HTTP, y es justamente lo que viene a resolver HTTP/2.</span>
<h4>Anatomía de los mensajes</h4>
<p><strong>Request</strong>: línea de pedido (<strong>método + URL + versión</strong>), headers, línea en blanco y cuerpo opcional. Headers a conocer:</p>
<ul>
<li><code>Host:</code> — <strong>obligatorio en 1.1</strong>. Un mismo servidor (una misma IP) aloja <strong>muchos dominios</strong> (<em>virtual hosting</em>), así que sin este header no sabría qué sitio le están pidiendo.</li>
<li><code>User-agent:</code> — qué browser es (permite servir versiones distintas). <code>Connection: close</code> — pedir que se cierre al terminar.</li>
</ul>
<p><strong>Métodos</strong>: <strong>GET</strong> (pedir un objeto; los parámetros van en la URL), <strong>POST</strong> (mandar datos <strong>en el cuerpo</strong> — para formularios y para cosas que no deberían quedar en la URL), <strong>HEAD</strong> (igual que GET pero <strong>solo los headers</strong>, sin cuerpo: sirve para chequear si algo cambió o existe, sin bajarlo), <strong>PUT</strong> y <strong>DELETE</strong>.</p>
<p><strong>Response</strong>: línea de estado (versión + código + frase), headers y cuerpo. Los códigos por familia — <strong>2xx</strong> éxito, <strong>3xx</strong> redirección, <strong>4xx</strong> error del cliente, <strong>5xx</strong> error del servidor:</p>
<ul>
<li><strong>200 OK</strong> · <strong>301 Moved Permanently</strong> (el objeto se mudó; la nueva URL viene en <code>Location:</code>)</li>
<li><strong>304 Not Modified</strong> — la respuesta al <em>conditional GET</em>: "no cambió, usá tu copia". <strong>Va sin cuerpo</strong>, y ahí está todo el ahorro.</li>
<li><strong>400 Bad Request</strong> · <strong>404 Not Found</strong> · <strong>505 HTTP Version Not Supported</strong></li>
</ul>`,
      },
      {
        title: 'Cookies y web caching',
        html: `
<h4>Cookies: estado sobre un protocolo sin estado</h4>
<p>HTTP es stateless, pero el comercio electrónico necesita recordar quién sos. Las cookies agregan esa memoria <strong>sin tocar HTTP</strong>, con <strong>cuatro componentes</strong>:</p>
<ol>
<li>Un header <code>Set-cookie:</code> en la <strong>respuesta</strong> del servidor (la primera vez, con un ID único).</li>
<li>Un header <code>Cookie:</code> en <strong>todos los requests siguientes</strong> del browser a ese sitio.</li>
<li>Un <strong>archivo de cookies</strong> guardado en el host del usuario y gestionado por el browser.</li>
<li>Una <strong>base de datos en el backend</strong>, donde el ID se asocia con el estado real (el carrito, las preferencias, la sesión).</li>
</ol>
<p>Fijate que <strong>el estado no viaja</strong>: lo que viaja es un <strong>identificador</strong>, y el estado vive en el servidor. Habilitan carritos, login persistente y personalización… y también <strong>tracking</strong>: si el mismo tercero (una red de publicidad) está embebido en muchos sitios, puede correlacionar tu recorrido entre todos ellos. De ahí todo el problema de <strong>privacidad</strong> y las cookies de terceros.</p>
<h4>Web caching (proxy)</h4>
<p>Un <strong>web cache</strong> guarda copias de objetos pedidos recientemente y responde él mismo, sin ir al servidor de origen. Su rasgo distintivo: es <strong>servidor para el browser y cliente para el origin</strong> — actúa de las dos formas según con quién hable.</p>
<p>El flujo: el browser le pide todo al cache; si lo tiene (<strong>hit</strong>), responde al toque; si no (<strong>miss</strong>), lo pide al origen, <strong>guarda una copia</strong> y lo devuelve.</p>
<p><strong>Tres beneficios</strong>: baja el <strong>tiempo de respuesta</strong> (el cache está cerca), baja el <strong>tráfico en el enlace de acceso</strong> de la institución, y —a escala— reduce la carga en los servidores de origen. Los <em>hit rates</em> típicos van de <strong>0,2 a 0,7</strong>.</p>
<span class="tip"><strong>El ejemplo cuantitativo del libro</strong>, que es el que se pide: si el enlace de acceso está al <strong>100% de intensidad de tráfico</strong>, la demora de cola <strong>tiende a infinito</strong> y la red se vuelve inusable. Con un cache que atiende el <strong>40%</strong> de los pedidos, solo el 60% cruza el enlace → la intensidad baja a ~<strong>0,6</strong> y la demora cae a <strong>milisegundos</strong>. La moraleja: <strong>un cache es muchísimo más barato que agrandar el enlace de acceso</strong>, y esa es exactamente la idea que después escala hasta las CDNs.</span>
<h4>Conditional GET: cómo no servir contenido viejo</h4>
<p>El riesgo del caching es entregar una copia <strong>desactualizada</strong>. La solución es barata: el cache manda un GET con el header <code>If-Modified-Since:</code> y la fecha de su copia.</p>
<ul>
<li>Si el objeto <strong>no cambió</strong>: el servidor responde <strong>304 Not Modified</strong> <strong>sin cuerpo</strong> — se transfieren unos pocos bytes en vez del objeto entero.</li>
<li>Si <strong>cambió</strong>: responde <strong>200 OK</strong> con el objeto nuevo, y el cache actualiza su copia.</li>
</ul>`,
      },
      {
        title: 'HTTP/2 y HTTP/3',
        widget: 'http2-detail',
        html: `
<p>Lo primero para no marearse: <strong>HTTP/2 y HTTP/3 no cambian la semántica de HTTP</strong>. Los métodos, los códigos de estado y los headers son <strong>los mismos</strong>. Lo que cambia es <strong>cómo se transportan</strong> los mensajes por debajo.</p>
<h4>El problema de HTTP/1.1</h4>
<p>Con pipelining, las respuestas tienen que volver <strong>en orden</strong>. Si el primer objeto es un video de 10 MB y detrás vienen tres iconos de 2 KB, los iconos <strong>esperan igual</strong>. Es el <strong>head-of-line blocking a nivel HTTP</strong>. El parche de la época era abrir <strong>varias conexiones TCP en paralelo</strong> (típicamente 6 por dominio), lo cual es un desperdicio: más handshakes, más slow starts, más carga en el servidor.</p>
<h4>HTTP/2: multiplexing real</h4>
<ul>
<li><strong>Framing binario</strong>: los mensajes se parten en <strong>frames</strong> chicos, cada uno etiquetado con el <strong>stream</strong> al que pertenece. Los frames de distintos objetos se <strong>intercalan</strong> sobre <strong>UNA sola conexión TCP</strong> — el video y los iconos avanzan <strong>en paralelo</strong>, y ya no hay bloqueo por orden.</li>
<li><strong>Priorización de streams</strong>: el cliente puede decir qué le importa más (el CSS antes que una imagen del pie de página).</li>
<li><strong>Server push</strong>: el servidor manda objetos que <strong>sabe</strong> que van a pedirse (el CSS referenciado por el HTML) sin esperar el request.</li>
<li><strong>Compresión de headers</strong> (HPACK): los headers HTTP son repetitivos y voluminosos; comprimirlos ahorra bastante.</li>
</ul>
<span class="warn"><strong>El problema que HTTP/2 NO resuelve</strong>, y es la pregunta clásica: el <strong>head-of-line blocking de TCP</strong>. Resolvió el HOL de la capa HTTP, pero abajo sigue habiendo <strong>una sola conexión TCP</strong>, y TCP <strong>entrega en orden</strong>. Si se pierde <em>un</em> segmento, TCP retiene <strong>todo</strong> lo que llegó después hasta retransmitirlo — y como ahora <strong>todos los streams comparten esa conexión</strong>, una sola pérdida <strong>frena a todos</strong>. Irónicamente, en redes con pérdidas HTTP/2 puede andar <em>peor</em> que 1.1 con conexiones paralelas.</span>
<h4>HTTP/3 = HTTP sobre QUIC</h4>
<p>La única forma de arreglar el HOL de TCP es <strong>no usar TCP</strong>. HTTP/3 corre sobre <strong>QUIC</strong>, que va sobre <strong>UDP</strong> e implementa en espacio de usuario todo lo que hacía falta:</p>
<ul>
<li><strong>Multiplexación sin HOL</strong>: QUIC conoce los streams, así que una pérdida en uno <strong>solo bloquea a ese</strong>; los demás siguen.</li>
<li><strong>Seguridad integrada</strong>: TLS 1.3 va <em>adentro</em> de QUIC, no como una capa aparte.</li>
<li><strong>Establecimiento más rápido</strong>: el handshake de transporte y el de seguridad se hacen <strong>juntos</strong> → <strong>1-RTT</strong>, y <strong>0-RTT</strong> al reconectar.</li>
<li><strong>Migración de conexión</strong>: la conexión se identifica por un ID propio y no por la cuádrupla, así que <strong>sobrevive un cambio de red</strong> (pasar de WiFi a datos sin cortar).</li>
</ul>
<span class="tip">La moraleja de diseño: QUIC se implementa <strong>en espacio de usuario, sobre UDP</strong>, y eso es deliberado. Cambiar TCP significaría actualizar <strong>kernels y middleboxes de todo el mundo</strong> (tardaría décadas, como IPv6); cambiar una biblioteca del browser tarda <strong>semanas</strong>. Es el mismo argumento de "la aplicación evoluciona rápido, la red no".</span>`,
      },
      {
        title: 'Mail: SMTP e IMAP',
        html: `
<p><strong>Tres componentes</strong>: los <strong>user agents</strong> (el cliente de correo), los <strong>mail servers</strong> (cada usuario tiene ahí su <strong>buzón</strong>, y una <strong>cola de mensajes salientes</strong>) y el protocolo <strong>SMTP</strong>, que mueve el correo <strong>entre servidores</strong> sobre <strong>TCP puerto 25</strong>.</p>
<h4>Cómo viaja un mail</h4>
<p>Alice escribe → su user agent se lo entrega a <strong>su</strong> mail server → el mensaje va a la <strong>cola de salida</strong> → el servidor de Alice abre una conexión SMTP <strong>DIRECTA</strong> con el servidor de Bob → se lo transfiere → queda en el <strong>buzón</strong> de Bob → Bob lo lee cuando quiere.</p>
<p><strong>Dos detalles que se preguntan</strong>: (1) la conexión es <strong>directa entre los dos servidores</strong>, sin intermediarios saltando de servidor en servidor; (2) si el servidor de Bob está caído, el de Alice <strong>no descarta el mensaje</strong>: lo deja en la cola y <strong>reintenta</strong> cada ~30 minutos durante días.</p>
<h4>El diálogo SMTP</h4>
<p>Es un protocolo de <strong>texto legible</strong> (se puede hacer a mano con telnet): <code>HELO</code> (presentarse), <code>MAIL FROM</code> (remitente), <code>RCPT TO</code> (destinatario), <code>DATA</code> (acá va el mensaje, terminado con una línea con un solo punto) y <code>QUIT</code>. El servidor responde con códigos numéricos (250 OK, 354…), igual que HTTP.</p>
<p><strong>Restricción histórica</strong>: el cuerpo debe ser <strong>ASCII de 7 bits</strong> — SMTP es de 1982. Por eso los adjuntos y los caracteres no ASCII se codifican con <strong>MIME / base64</strong>, que empaqueta datos binarios en texto imprimible (a costa de ~33% más de tamaño).</p>
<span class="tip"><strong>El contraste que siempre cae: SMTP es PUSH, HTTP es PULL.</strong> En SMTP el emisor <strong>empuja</strong> el mensaje hacia el servidor destino por iniciativa propia; en HTTP el receptor <strong>va a buscar</strong> lo que quiere. Tiene sentido: querés que el mail llegue aunque el destinatario no esté mirando.</span>
<h4>Para LEER el correo hace falta otro protocolo</h4>
<p>SMTP <strong>no sirve</strong> para que Bob lea su buzón: es un protocolo de <em>envío</em> (push), y Bob necesita <em>traer</em> mensajes que ya están en el servidor (pull). Por eso existe una segunda familia:</p>
<ul>
<li><strong>IMAP</strong> — los mensajes <strong>quedan en el servidor</strong>, organizados en carpetas, y el <strong>estado</strong> (leído, respondido, en qué carpeta está) también. Eso es lo que permite ver el mismo buzón <strong>igual desde el celular y la notebook</strong>. Es el que se usa hoy.</li>
<li><strong>POP3</strong> — el modelo viejo: <strong>descargar y borrar</strong> del servidor. Simple, pero sin estado compartido: cada dispositivo ve algo distinto.</li>
<li><strong>Webmail</strong> — el user agent es el browser, y el transporte entre vos y el servidor es <strong>HTTP</strong>. Pero entre servidores <strong>sigue siendo SMTP</strong>.</li>
</ul>
<p>Comparación fina con HTTP: los dos usan diálogos de texto con códigos, pero HTTP encapsula <strong>cada objeto en su propia respuesta</strong>, mientras que SMTP mete <strong>todos los objetos del mensaje en uno solo</strong> (multipart MIME).</p>`,
      },
      {
        title: 'DNS: nombres → IPs',
        widget: 'dns-detail',
        html: `
<p>Los humanos usamos nombres; las máquinas, IPs. DNS es una <strong>base de datos distribuida y jerárquica</strong> + protocolo de consulta, sobre <strong>UDP/53</strong> (consultas chicas, sin gastar el RTT del handshake). Centralizado sería: punto único de falla, cuello de botella, lejos de todos, inmantenible. No es una app de usuario: es <strong>infraestructura para las demás apps</strong> — HTTP no arranca hasta que DNS respondió.</p>
<p><strong>Jerarquía</strong>: <strong>Root</strong> (13 lógicos, cientos de réplicas por IP anycast) → <strong>TLD</strong> (.com, .ar) → <strong>Authoritative</strong> (registros definitivos de cada organización). El <strong>Local DNS</strong> (resolver del ISP, configurado por DHCP) no pertenece a la jerarquía: es proxy + <strong>caché</strong>.</p>
<p><strong>Recursiva vs iterativa</strong>: el host consulta recursivo al Local ("resolvémelo todo"); el Local resuelve iterativo ("no sé, preguntale a este otro").</p>
<p><strong>Resource Records</strong> (name, value, type, TTL): <strong>A</strong> (nombre→IPv4; AAAA para v6), <strong>NS</strong> (delegación), <strong>CNAME</strong> (alias→canónico), <strong>MX</strong> (mail server). El <strong>caching con TTL</strong> descarga a los roots — y por eso los cambios de DNS "tardan en propagarse".</p>
<p>Además de traducir: aliasing de hosts, aliasing de mail y <strong>distribución de carga</strong> (un nombre → varias IPs rotadas).</p>`,
      },
      {
        title: 'P2P: por qué escala + BitTorrent',
        html: `
<h4>El análisis que demuestra la autoescalabilidad</h4>
<p>Es el <strong>cálculo estrella</strong> del tema: cuánto tarda en distribuirse un archivo de tamaño <strong>F</strong> a <strong>N</strong> peers. Se compara el <strong>tiempo mínimo posible</strong> en cada arquitectura, mirando dónde está el cuello de botella.</p>
<p><strong>Cliente-servidor</strong>: <span class="formula">D_cs ≥ max( N·F/u_s , F/d_min )</span></p>
<ul>
<li><strong>N·F/u_s</strong> — el servidor tiene que subir <strong>N copias</strong> del archivo, una por cliente, con su ancho de banda de subida <em>u_s</em>. Este término <strong>crece linealmente con N</strong>.</li>
<li><strong>F/d_min</strong> — el cliente <strong>más lento</strong> no puede terminar antes de bajarse el archivo a su propia velocidad.</li>
</ul>
<p><strong>P2P</strong>: <span class="formula">D_p2p ≥ max( F/u_s , F/d_min , N·F/(u_s + Σu_i) )</span></p>
<ul>
<li><strong>F/u_s</strong> — el servidor tiene que subir el archivo <strong>al menos una vez</strong> (no N veces: los peers se lo pasan entre ellos).</li>
<li><strong>F/d_min</strong> — igual que antes, el más lento manda.</li>
<li><strong>N·F/(u_s + Σu_i)</strong> — la capacidad total de subida ahora es la del servidor <strong>MÁS la de todos los peers</strong>.</li>
</ul>
<span class="tip"><strong>La comparación que hay que saber decir</strong>: en cliente-servidor, N está en el <strong>numerador</strong> y nada crece abajo → el tiempo se dispara <strong>linealmente</strong> con la cantidad de usuarios. En P2P, N está arriba <strong>pero el denominador también crece con N</strong> (cada peer nuevo aporta su <em>u_i</em>) → el tiempo <strong>tiende a estabilizarse</strong>. Eso es la <strong>autoescalabilidad</strong>, y es la respuesta a "¿por qué P2P escala y cliente-servidor no?".</span>
<h4>BitTorrent</h4>
<p>El archivo se parte en <strong>chunks</strong> de ~256 KB. Un <strong>tracker</strong> centralizado mantiene la lista de peers del <strong>torrent</strong> (el enjambre); cuando entrás, te da un subconjunto al azar para conectarte. De ahí en más, el intercambio es <strong>puramente P2P</strong>.</p>
<p>Los peers se avisan periódicamente <strong>qué chunks tiene cada uno</strong>, y con eso funcionan las dos políticas inteligentes del protocolo:</p>
<ul>
<li><strong>Rarest first</strong> — pedir primero los chunks <strong>más escasos</strong> del enjambre. El objetivo es <strong>igualar la disponibilidad</strong>: si un chunk lo tiene un solo peer y ese se va, <strong>el archivo queda incompleto para todos</strong>. Replicando primero lo raro, el torrent se vuelve robusto y ningún chunk se convierte en cuello de botella.</li>
<li><strong>Tit-for-tat</strong> — la respuesta al <em>free-riding</em>. Cada peer le sube preferentemente a los <strong>4 peers que más rápido le están enviando a él</strong> (sus <em>unchoked</em>), y recalcula ese ranking cada <strong>~10 segundos</strong>. Quien no sube, deja de recibir: la reciprocidad está <strong>incentivada por el protocolo</strong>, no por buena voluntad.</li>
<li><strong>Optimistic unchoke</strong> — cada <strong>~30 segundos</strong> se elige además <strong>un peer al azar</strong> y se le sube sin que haya dado nada todavía. Cumple dos funciones imprescindibles: <strong>descubrir socios mejores</strong> que los actuales, y permitir que los <strong>recién llegados arranquen</strong> — sin esto, un peer que no tiene <em>nada</em> nunca podría dar nada, y jamás recibiría (un problema del huevo y la gallina).</li>
</ul>
<p>Terminología: un peer con el archivo completo que solo sube es un <strong>seed</strong>; el que todavía está bajando, un <strong>leecher</strong>.</p>`,
      },
      {
        title: 'CDN y streaming (DASH)',
        widget: 'cdn-detail',
        html: `
<h4>El problema</h4>
<p>El video es, por lejos, <strong>el grueso del tráfico de Internet</strong>, y tiene dos exigencias molestas: <strong>volumen enorme</strong> y <strong>heterogeneidad</strong> (cada usuario tiene un ancho de banda distinto, y el suyo propio varía minuto a minuto). Servir eso a millones desde <strong>un</strong> datacenter no escala: ni el enlace de salida alcanza, ni tiene sentido mandar los mismos bytes miles de veces a la misma región, ni se puede pelear contra la <strong>distancia física</strong> (la velocidad de la luz no se negocia).</p>
<p>La solución es <strong>replicar el contenido</strong> en servidores distribuidos por el mundo y entregarlo <strong>desde el más cercano</strong>. Dos filosofías opuestas:</p>
<ul>
<li><strong>Enter deep</strong> (Akamai) — <strong>miles de clusters chicos metidos DENTRO de las redes de los ISPs</strong>, lo más cerca posible del usuario. Máxima cercanía y mínimo tráfico de tránsito; a cambio, muchísimos sitios que gestionar.</li>
<li><strong>Bring home</strong> (Limelight) — <strong>menos clusters, pero grandes</strong>, ubicados en los <strong>IXPs</strong> (puntos de intercambio). Más fácil de administrar, un poco más lejos del usuario.</li>
</ul>
<h4>Cómo te mandan al servidor correcto: DNS</h4>
<p>El truco es elegante: la redirección se hace con <strong>DNS</strong>. Cuando pedís <code>video.ejemplo.com</code>, el DNS de ejemplo.com no te da una IP: te devuelve un <strong>CNAME</strong> que delega en el dominio de la CDN. Tu resolver entonces le pregunta al <strong>DNS de la CDN</strong>, que <strong>elige el cluster para vos</strong> y responde <em>esa</em> IP.</p>
<p>¿Con qué criterio elige? Por <strong>cercanía al resolver que preguntó</strong> (asumiendo que estás cerca de tu DNS) y por <strong>mediciones de latencia y carga en tiempo real</strong>. Es, en los hechos, <strong>DNS haciendo balanceo de carga global</strong> — un uso que no estaba en su diseño original.</p>
<span class="warn">El punto débil de ese supuesto: si usás un DNS público (8.8.8.8), la CDN ve <strong>al resolver, no a vos</strong>, y puede mandarte a un cluster lejano. Por eso existe la extensión <strong>EDNS Client Subnet</strong>, que pasa parte de tu subred en la consulta.</span>
<h4>DASH: streaming adaptativo</h4>
<p><strong>DASH</strong> (Dynamic Adaptive Streaming over HTTP) resuelve la heterogeneidad:</p>
<ul>
<li>El video se <strong>codifica en varias calidades</strong> (tasas de bits distintas) y cada versión se parte en <strong>chunks</strong> de pocos segundos.</li>
<li>Un <strong>manifest</strong> le dice al cliente qué versiones existen y dónde está cada chunk.</li>
<li><strong>El CLIENTE mide su ancho de banda</strong> y decide, <strong>chunk a chunk</strong>, qué calidad pedir. Si la conexión mejora, sube de calidad; si empeora, baja — <strong>sin cortar la reproducción</strong>. Es lo que ves cuando YouTube pasa de borroso a nítido solo.</li>
</ul>
<span class="tip">Las dos decisiones de diseño que se preguntan: <strong>(1) la inteligencia está en el CLIENTE</strong>, no en el servidor — el servidor solo sirve archivos por HTTP, así que se puede usar <strong>infraestructura web común y CDNs existentes</strong>, sin servidores de streaming especiales ni estado por usuario; <strong>(2) va sobre HTTP/TCP</strong>, lo que le permite <strong>atravesar NATs y firewalls sin problema</strong> (el puerto 80/443 está abierto en todos lados). Es un caso donde ir "sobre lo que ya funciona" ganó a diseñar un protocolo a medida.</span>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'transporte',
    title: 'Capa de Transporte',
    short: 'Transporte',
    icon: '🚚',
    color: '#f59e0b',
    layerTag: 'Bloque 2 · Cap. 3',
    tagline: 'UDP, RDT, TCP, control de flujo y congestión, QUIC.',
    topics: [
      {
        title: 'Rol: de host-a-host a proceso-a-proceso',
        html: `
<p>La capa de red entrega datagramas <strong>de host a host</strong>: sabe llevar un paquete hasta una máquina, pero no tiene idea de <em>qué programa</em> adentro lo estaba esperando. La capa de transporte <strong>extiende esa entrega hasta el proceso</strong> — es la diferencia entre "llegó a tu edificio" y "llegó a tu departamento".</p>
<p><strong>Dónde vive</strong>: <strong>solo en los hosts</strong>. Los routers intermedios <strong>no miran</strong> la capa de transporte — abren hasta el header IP y nada más. Es la primera capa <strong>punta a punta pura</strong> del stack, y por eso todo lo que TCP hace (confiabilidad, control de flujo, congestión) se implementa <strong>en los extremos</strong>, según el principio end-to-end.</p>
<span class="warn">Cuidado con esto último: los <strong>middleboxes</strong> (NAT, firewalls) <strong>sí</strong> miran y hasta modifican puertos de capa 4 — y justamente por eso se dice que "violan las capas".</span>
<h4>Multiplexing y demultiplexing</h4>
<ul>
<li><strong>Multiplexing</strong> (en el emisor): recolectar los datos de <strong>varios sockets</strong>, ponerle a cada chunk su <strong>header</strong> con los puertos, y entregárselos a la capa de red. Muchos procesos hablando, <strong>un solo canal</strong> hacia abajo.</li>
<li><strong>Demultiplexing</strong> (en el receptor): tomar cada segmento que sube de la capa de red y <strong>entregarlo al socket correcto</strong>. El header dice a quién le corresponde.</li>
</ul>
<h4>Cómo demultiplexa cada uno (pregunta frecuentísima)</h4>
<p>Acá está la diferencia conceptual grande entre los dos protocolos:</p>
<ul>
<li><strong>UDP</strong> demultiplexa por <strong>2 valores</strong>: <strong>(IP destino, puerto destino)</strong>. Es decir: <strong>dos segmentos con distinto origen pero el mismo puerto destino van al MISMO socket</strong>. A UDP no le importa quién los mandó — si la app quiere saberlo, tiene que leer la IP origen que le informa la API.</li>
<li><strong>TCP</strong> demultiplexa por la <strong>cuádrupla completa</strong>: <strong>(IP origen, puerto origen, IP destino, puerto destino)</strong>. Dos clientes distintos que se conectan al mismo <code>:80</code> forman cuádruplas <strong>distintas</strong> → van a <strong>sockets distintos</strong>.</li>
</ul>
<span class="tip">De ahí sale la respuesta a "¿cómo hace un servidor web para atender miles de clientes en el puerto 80?". Tiene <strong>un socket de escucha</strong> (<em>listening socket</em>) en el :80, y cada vez que se completa un handshake, <code>accept()</code> crea un <strong>socket nuevo y dedicado</strong> para esa conexión. El puerto destino es el mismo 80 para todos, pero <strong>la cuádrupla es única</strong> en cada caso, y eso alcanza para no confundirlos. Es la diferencia entre estar "orientado a conexión" (TCP) o no (UDP), vista desde el demultiplexing.</span>`,
      },
      {
        title: 'UDP: transporte sin adornos',
        html: `
<p><strong>UDP</strong> hace lo <em>mínimo</em> que puede hacer una capa de transporte: <strong>multiplexing/demultiplexing</strong> (los puertos) y <strong>detección de errores</strong> (el checksum). Nada más. Es <strong>sin conexión</strong> (no hay handshake) y <strong>best-effort</strong>: los segmentos pueden perderse, llegar desordenados o duplicados, y UDP <strong>no hace nada al respecto</strong>.</p>
<p><strong>Header de 8 bytes</strong>, cuatro campos de 16 bits: <strong>puerto origen</strong>, <strong>puerto destino</strong>, <strong>longitud</strong> (header + datos) y <strong>checksum</strong>.</p>
<h4>¿Por qué alguien elegiría esto?</h4>
<p>La pregunta parece tonta pero tiene cuatro respuestas concretas, y todas son "porque TCP te <em>obliga</em> a cosas que a veces no querés":</p>
<ul>
<li><strong>No gasta un RTT en handshake</strong>. Para una consulta DNS —un mensajito y una respuesta— el <em>three-way handshake</em> de TCP <strong>triplicaría</strong> el tiempo total. Por eso DNS usa UDP.</li>
<li><strong>No mantiene estado</strong>: sin buffers, ni números de secuencia, ni timers por conexión. Un servidor aguanta <strong>muchísimos más clientes</strong> con los mismos recursos.</li>
<li><strong>Header chico</strong>: 8 bytes contra los 20 de TCP.</li>
<li><strong>Sin control de congestión</strong> — y esta es la razón más importante. TCP, ante pérdidas, <strong>baja su tasa</strong> quieras o no. Una app de <strong>tiempo real</strong> (voz, video, juegos) prefiere <strong>mandar a tasa constante y perder algo</strong> antes que frenar: un audio con algún hueco es mejor que un audio que se corta y se atrasa.</li>
</ul>
<span class="warn">El contrapunto que se pregunta: que UDP no tenga control de congestión es una <strong>ventaja para la app y un riesgo para la red</strong>. Si todo el mundo mandara UDP a tasa fija, la red podría entrar en <strong>colapso por congestión</strong> — los flujos TCP se harían a un lado (son "educados") y los UDP se quedarían con todo. Se lo llama el problema de la <strong>equidad (fairness)</strong>, y por eso las apps de streaming serias implementan <strong>su propio</strong> control de tasa por encima de UDP.</span>
<h4>Dónde se usa</h4>
<p>DNS, streaming, VoIP, videojuegos, <strong>DHCP</strong>, SNMP, NFS… y sobre todo: es la base de <strong>QUIC</strong>. Y si una app quiere confiabilidad pero no quiere TCP, <strong>se la implementa ella misma arriba de UDP</strong> — que es exactamente lo que hace QUIC: reconstruye confiabilidad, control de congestión y hasta seguridad, pero <strong>en espacio de usuario</strong>, donde puede evolucionar sin tocar el kernel ni los middleboxes.</p>
<h4>El checksum</h4>
<p>Se suman las palabras de <strong>16 bits</strong> en <strong>complemento a 1</strong> (con el acarreo sumado de vuelta) y se transmite el <strong>complemento</strong> del resultado. El receptor suma todo, incluido el checksum: si da <strong>todo unos</strong>, está bien. <strong>Detecta</strong> errores pero <strong>no los corrige</strong>: si falla, el segmento se descarta (o se pasa a la app con una advertencia, según la implementación).</p>
<span class="tip">¿Por qué UDP tiene checksum si la capa de enlace ya hace CRC? Por el principio <strong>end-to-end</strong>: el CRC protege <strong>cada enlace</strong>, pero <strong>no protege lo que pasa DENTRO de los routers</strong> (un error en la memoria del router mientras el paquete está encolado, por ejemplo). La única verificación que cubre todo el camino es la que hacen <strong>los extremos</strong>. Es el ejemplo canónico del argumento end-to-end.</span>`,
      },
      {
        title: 'RDT: construyendo la confiabilidad (rdt1.0 → 3.0)',
        html: `
<p>Uno de los clásicos de oral. La idea es <strong>construir un canal confiable paso a paso</strong>, arrancando de un canal perfecto y agregando <strong>de a una</strong> las cosas que pueden salir mal. Lo importante no es memorizar los nombres sino <strong>qué problema resuelve cada versión</strong> y <strong>qué mecanismo aparece</strong>.</p>
<h4>rdt1.0 — canal perfecto</h4>
<p>Se asume que <strong>nada se corrompe ni se pierde</strong>. El emisor manda, el receptor recibe. <strong>No hace falta ningún mecanismo</strong>. Sirve como punto de partida.</p>
<h4>rdt2.0 — aparecen errores de bit</h4>
<p>El canal puede <strong>corromper</strong> bits (pero no perder paquetes). Mecanismos nuevos:</p>
<ul>
<li><strong>Checksum</strong> para <em>detectar</em> el error.</li>
<li><strong>ACK</strong> ("llegó bien") y <strong>NAK</strong> ("llegó mal, mandalo de nuevo") para que el receptor <em>avise</em>.</li>
<li><strong>Retransmisión</strong> ante un NAK.</li>
</ul>
<p>Estos protocolos basados en retransmisión se llaman <strong>ARQ</strong> (Automatic Repeat reQuest). El esquema es <strong>stop-and-wait</strong>: el emisor manda uno y <strong>se queda quieto</strong> hasta tener respuesta.</p>
<h4>rdt2.1 y 2.2 — ¿y si se corrompe el ACK?</h4>
<p><strong>La falla fatal de rdt2.0</strong>: si el que se corrompe es el <em>ACK/NAK</em>, el emisor no sabe qué pasó. Si retransmite "por las dudas" y el paquete <strong>sí</strong> había llegado bien, el receptor termina con un <strong>duplicado</strong> y no tiene forma de saber que lo es.</p>
<p>La solución: <strong>números de secuencia</strong>. El receptor mira el número y, si es el que ya recibió, <strong>descarta el duplicado</strong> (pero igual manda ACK, porque el emisor claramente no se enteró). Detalle elegante: en stop-and-wait <strong>alcanza con 1 bit</strong> (0 y 1 alternando), porque solo puede haber un paquete en vuelo.</p>
<p><strong>rdt2.2</strong> elimina el NAK: en vez de mandar un NAK, el receptor manda un <strong>ACK del último paquete que sí recibió bien</strong>. Si al emisor le llega un <strong>ACK duplicado</strong>, entiende que el siguiente vino mal. <strong>Esto anticipa exactamente a TCP</strong>, que tampoco tiene NAK y usa ACKs duplicados como señal.</p>
<h4>rdt3.0 — además hay pérdidas</h4>
<p>Ahora el canal puede <strong>perder</strong> paquetes (y ACKs). Si un paquete se pierde, no llega ningún ACK ni NAK: el emisor <strong>se quedaría esperando para siempre</strong>. Mecanismo nuevo: un <strong>temporizador (timer)</strong>. Si el ACK no llega antes del <strong>timeout</strong>, se retransmite.</p>
<p>Es el <strong>protocolo de bit alternante</strong> (<em>alternating-bit</em>), y ya es correcto: maneja corrupción, pérdida y duplicados. El único costo es que un timeout demasiado corto genera <strong>retransmisiones innecesarias</strong> — pero como hay números de secuencia, los duplicados no rompen nada.</p>
<h4>El problema que queda: la performance</h4>
<p>rdt3.0 <strong>funciona</strong>, pero <strong>desperdicia el enlace</strong>, porque después de mandar un paquete se queda esperando un RTT entero sin hacer nada. La utilización es:</p>
<p><span class="formula">U = (L/R) / (RTT + L/R)</span></p>
<p><strong>El cálculo de examen</strong>: enlace de <strong>1 Gbps</strong>, <strong>RTT 30 ms</strong>, paquetes de <strong>8000 bits</strong>. El tiempo de transmisión es L/R = 8 μs, así que <span class="formula">U = 0,008 / (30 + 0,008) ≈ 0,00027</span> → <strong>0,027%</strong>. Un enlace de mil millones de bits por segundo usado como si fueran <strong>270 kbps</strong>: el protocolo, no el enlace, es el cuello de botella.</p>
<span class="tip">La conclusión que hay que decir: <strong>stop-and-wait es correcto pero inutilizable</strong> en enlaces rápidos o de RTT alto. La solución es dejar de esperar de a uno y tener <strong>varios paquetes en vuelo</strong> a la vez: <strong>pipelining</strong> — y de ahí salen Go-Back-N y Selective Repeat.</span>`,
      },
      {
        title: 'Pipelining: Go-Back-N vs Selective Repeat',
        widget: 'gbn-sim',
        html: `
<p><strong>Pipelining</strong>: permitir <strong>varios paquetes en vuelo</strong> sin esperar el ACK de cada uno. Eso exige tres cosas: un <strong>rango más grande de números de secuencia</strong>, <strong>buffers</strong> en emisor (y quizá receptor), y una política de qué hacer ante pérdidas. Hay dos respuestas clásicas a eso último.</p>
<h4>Go-Back-N (GBN)</h4>
<ul>
<li>El emisor puede tener hasta <strong>N paquetes sin confirmar</strong> — la <strong>ventana deslizante</strong>, que avanza a medida que llegan ACKs.</li>
<li><strong>ACK acumulativo</strong>: "ACK n" significa <strong>"recibí todo hasta n inclusive"</strong>. Un solo ACK puede confirmar varios paquetes.</li>
<li><strong>Receptor simplísimo</strong>: solo acepta paquetes <strong>en orden</strong>. Si llega uno fuera de orden, lo <strong>descarta</strong> (¡aunque esté perfecto!) y re-ACKea el último en orden que tenía. <strong>No necesita buffer</strong> — solo recuerda cuál espera.</li>
<li><strong>UN solo timer</strong>, el del paquete más viejo sin confirmar. Si vence, retransmite <strong>toda la ventana</strong> desde ahí ("volvé N atrás", de ahí el nombre).</li>
</ul>
<p><strong>El costo</strong>: si se pierde un paquete pero los N−1 siguientes llegaron bien, <strong>igual se retransmiten todos</strong>. Con ventanas grandes o mucho ancho de banda, es un desperdicio enorme.</p>
<h4>Selective Repeat (SR)</h4>
<ul>
<li><strong>ACK individual</strong>: se confirma <strong>cada paquete por separado</strong>, esté en orden o no.</li>
<li>El <strong>receptor bufferea</strong> los que llegan fuera de orden y los entrega a la app cuando se completa el hueco.</li>
<li><strong>Un timer por paquete</strong>.</li>
<li>Ante un timeout se retransmite <strong>solo el paquete perdido</strong>.</li>
</ul>
<p><strong>El costo</strong>: mucha más complejidad y estado en ambos extremos (buffers y timers por paquete). Es el clásico intercambio <strong>eficiencia ↔ complejidad</strong>.</p>
<span class="warn"><strong>El detalle que se pregunta siempre</strong>: en SR la ventana debe ser <strong>≤ la mitad del espacio de números de secuencia</strong>. ¿Por qué? Porque los números <strong>se reciclan</strong>. Si la ventana fuera muy grande, el receptor <strong>no podría distinguir</strong> un paquete <em>nuevo</em> de la <strong>retransmisión de uno viejo</strong> con el mismo número — el emisor y el receptor tendrían visiones incompatibles de dónde está la ventana, y se aceptaría un duplicado como si fuera dato nuevo. Con ventana ≤ mitad del espacio, esa ambigüedad es imposible.</span>
<h4>Y TCP, ¿cuál es?</h4>
<p>Ninguno de los dos puros: TCP es <strong>híbrido</strong>, y conviene decirlo así:</p>
<ul>
<li><strong>De GBN</strong>: usa <strong>ACKs acumulativos</strong> y tiene <strong>un solo timer</strong> (el del segmento más viejo sin confirmar).</li>
<li><strong>De SR</strong>: el receptor <strong>sí bufferea</strong> los segmentos fuera de orden (no los tira), y ante un timeout retransmite <strong>solo un segmento</strong>, no toda la ventana.</li>
<li>Y con la opción <strong>SACK</strong> el receptor puede informar <em>exactamente</em> qué bloques recibió, con lo que TCP se parece todavía más a Selective Repeat.</li>
</ul>`,
      },
      {
        title: 'TCP: conexión, header y byte-stream',
        widget: 'tcp-seq',
        html: `
<p>Las cinco características que lo definen: <strong>orientado a conexión</strong> (con <em>handshake</em> previo, y el estado vive <strong>SOLO en los extremos</strong> — los routers no saben que la conexión existe), <strong>confiable</strong> y en orden, <strong>full-duplex</strong> (datos en ambos sentidos por la misma conexión), <strong>punto a punto</strong> (un emisor, un receptor: <strong>no hay multicast en TCP</strong>) y con <strong>control de flujo y de congestión</strong>.</p>
<h4>Byte-stream: por qué numera bytes</h4>
<p>TCP no ve "mensajes": ve un <strong>flujo continuo de bytes</strong>. Por eso los números de secuencia <strong>cuentan BYTES, no segmentos</strong>. Con un <strong>MSS</strong> de 1000, los segmentos llevan seq <strong>0, 1000, 2000…</strong> — cada uno numerado por <strong>el primer byte que transporta</strong>.</p>
<span class="warn">Consecuencia práctica: TCP <strong>no preserva los límites de los mensajes</strong>. Si la app hace dos <code>send()</code> de 100 bytes, el receptor puede recibirlos en <strong>un solo</strong> <code>recv()</code> de 200, o en tres pedazos. Si la aplicación necesita mensajes, <strong>tiene que delimitarlos ella</strong> (por longitud o por separador). Con UDP no pasa: ahí <strong>un datagrama = un mensaje</strong>.</span>
<h4>El header (20 bytes sin opciones)</h4>
<ul>
<li><strong>Puertos</strong> origen y destino (16 bits cada uno) — el demultiplexing.</li>
<li><strong>Número de secuencia</strong> — el del <strong>primer byte</strong> del segmento.</li>
<li><strong>Número de ACK</strong> — <strong>el próximo byte que se espera</strong> (no el último recibido). Es <strong>acumulativo</strong>: "ack = 1000" significa "tengo todo hasta el 999".</li>
<li><strong>Flags</strong>: <strong>SYN</strong> (abrir), <strong>ACK</strong> (el campo ack es válido), <strong>FIN</strong> (cerrar ordenadamente), <strong>RST</strong> (abortar), PSH, URG, más <strong>ECE/CWR</strong> para ECN.</li>
<li><strong>rwnd</strong> (receive window) — el control de flujo.</li>
<li><strong>Checksum</strong>, y el puntero de urgentes (prácticamente sin uso).</li>
</ul>
<p><strong>Opciones</strong> importantes: <strong>MSS</strong> (típicamente <strong>1460</strong> = MTU 1500 − 20 de IP − 20 de TCP), <strong>window scaling</strong> (el rwnd de 16 bits se queda corto en enlaces rápidos: escala hasta 1 GB), <strong>SACK</strong> (informar qué bloques sueltos llegaron) y <strong>timestamps</strong> (mejores muestras de RTT).</p>
<h4>Apertura: three-way handshake</h4>
<ol>
<li>Cliente → <strong>SYN</strong>, con su número de secuencia inicial (<strong>ISN</strong>) elegido al azar.</li>
<li>Servidor → <strong>SYN-ACK</strong>, con <em>su</em> ISN y confirmando el del cliente.</li>
<li>Cliente → <strong>ACK</strong>, confirmando el del servidor. Este ya puede llevar datos.</li>
</ol>
<p><strong>¿Por qué tres y no dos?</strong> Porque la conexión es <strong>full-duplex</strong> y hay que sincronizar <strong>dos</strong> números de secuencia — uno por sentido — y cada extremo necesita saber que <em>el otro recibió el suyo</em>. Con dos mensajes, el servidor nunca sabría si su ISN llegó. Además, el tercer paso evita que un <strong>SYN viejo y demorado</strong> de una conexión anterior abra una conexión fantasma.</p>
<p><strong>¿Y por qué los ISN son aleatorios?</strong> Por seguridad: si fueran predecibles, un atacante podría <strong>inyectar segmentos</strong> en una conexión ajena o hacer <em>spoofing</em> del handshake sin ver el tráfico.</p>
<h4>Cierre: cuatro mensajes</h4>
<p>Como cada sentido se cierra por separado (<strong>half-close</strong>): <strong>FIN → ACK</strong> de un lado, y <strong>FIN → ACK</strong> del otro. El que cierra primero queda en <strong>TIME_WAIT</strong> unos <strong>2×MSL</strong>: espera por si el ACK final se perdió y hay que retransmitirlo, y para que segmentos viejos y demorados no contaminen una conexión nueva con la misma cuádrupla.</p>
<h4>SYN flood</h4>
<p><strong>El ataque</strong>: el atacante manda miles de <strong>SYN</strong> y <strong>nunca completa</strong> el handshake. El servidor reserva memoria por cada conexión <strong>half-open</strong> hasta agotarse → <strong>DoS</strong>.</p>
<p><strong>La mitigación (SYN cookies)</strong>: ante un SYN, el servidor <strong>no guarda NADA</strong>. Calcula el ISN del SYN-ACK como un <strong>hash con clave secreta de la cuádrupla</strong> (más un timestamp) — esa es la "cookie". Si después llega el ACK, verifica que <code>ack − 1</code> sea la cookie que él habría generado, y <strong>recién ahí</strong> crea la conexión y reserva memoria. Elegante: el <strong>estado se guarda en el número de secuencia</strong>, que el propio cliente devuelve.</p>`,
      },
      {
        title: 'RTT, timeout y retransmisión',
        widget: 'tcp-sim',
        html: `
<p><strong>El problema</strong>: TCP retransmite cuando vence un timeout, pero <strong>¿cuánto hay que esperar?</strong> Si el timeout es <strong>muy corto</strong>, se retransmite de gusto y se <em>agrava</em> la congestión. Si es <strong>muy largo</strong>, se reacciona tardísimo a las pérdidas. Y el RTT <strong>cambia todo el tiempo</strong> según la congestión, así que no puede ser un valor fijo: hay que <strong>estimarlo dinámicamente</strong>.</p>
<h4>El cálculo (típico de examen)</h4>
<p>Se mide el <strong>SampleRTT</strong> de algunos segmentos y se lo suaviza con una <strong>media móvil exponencial (EWMA)</strong>, que le da más peso a las muestras recientes:</p>
<ul>
<li><span class="formula">EstimatedRTT = (1−α)·EstimatedRTT + α·SampleRTT</span> &nbsp; con <strong>α = 0,125</strong></li>
<li><span class="formula">DevRTT = (1−β)·DevRTT + β·|SampleRTT − EstimatedRTT|</span> &nbsp; con <strong>β = 0,25</strong></li>
<li><span class="formula">TimeoutInterval = EstimatedRTT + 4·DevRTT</span></li>
</ul>
<p><strong>¿Por qué el DevRTT y ese margen de 4?</strong> Porque no alcanza con el promedio: lo que importa es <strong>cuánto varía</strong>. Si el RTT es muy estable, el margen puede ser chico; si salta mucho, hay que ser generoso para no disparar timeouts falsos. El <strong>DevRTT mide esa variabilidad</strong> (es un desvío promedio), y el "+4·DevRTT" es el <strong>colchón de seguridad</strong>. Por eso al timeout se lo llama <strong>conservador</strong>: siempre queda <em>por encima</em> del RTT esperado.</p>
<h4>El algoritmo de Karn</h4>
<p>Dos reglas, y las dos tienen su porqué:</p>
<ul>
<li><strong>No medir SampleRTT de segmentos retransmitidos.</strong> Si mandaste un segmento dos veces y llega un ACK, <strong>no sabés a cuál de los dos corresponde</strong> — medir desde el primer envío daría un RTT enorme, y desde el segundo, uno diminuto. Ante la <strong>ambigüedad</strong>, mejor no medir.</li>
<li><strong>Ante un timeout, duplicar el RTO</strong> (backoff exponencial). Como un timeout suele ser síntoma de <strong>congestión</strong>, insistir con la misma frecuencia solo empeoraría las cosas. Al llegar un ACK de un segmento no retransmitido, el RTO vuelve a calcularse con la fórmula.</li>
</ul>
<h4>Los dos disparadores de retransmisión</h4>
<ol>
<li><strong>Timeout</strong> — venció el temporizador. Es la señal <strong>lenta</strong>, y TCP la interpreta como congestión seria (por eso Tahoe y Reno bajan cwnd a 1 y vuelven a slow start).</li>
<li><strong>Tres ACKs duplicados → fast retransmit</strong> — el receptor sigue pidiendo el mismo byte porque le falta un segmento del medio. El emisor <strong>retransmite de inmediato</strong>, sin esperar el timeout. Es la señal <strong>rápida</strong>, y como implica que <em>los demás segmentos sí están llegando</em>, la red no está tan mal → Reno hace <strong>fast recovery</strong> en vez de irse a 1.</li>
</ol>
<span class="tip"><strong>¿Por qué 3 ACKs duplicados y no 1?</strong> Porque la red puede <strong>reordenar</strong> paquetes: un ACK duplicado suelto puede significar simplemente que un segmento tomó otro camino y llegó tarde, no que se perdió. Esperar <strong>tres</strong> es el compromiso entre reaccionar rápido y no retransmitir de gusto ante un simple reordenamiento.</span>`,
      },
      {
        title: 'Control de flujo (rwnd)',
        widget: 'flowctl-detail',
        html: `
<p><strong>El problema</strong>: el emisor puede mandar más rápido de lo que la <strong>aplicación receptora</strong> consume. Los datos que llegan se guardan en el <strong>buffer de recepción</strong> mientras la app los lee; si el emisor no frena, ese buffer <strong>se desborda</strong> y los datos se pierden — no por culpa de la red, sino por culpa del receptor.</p>
<span class="warn"><strong>La distinción que SIEMPRE se pregunta: control de flujo ≠ control de congestión.</strong> El <strong>control de flujo</strong> protege <strong>al RECEPTOR</strong> (que no se le llene el buffer) y lo regula el <strong>rwnd</strong>, que el receptor anuncia explícitamente. El <strong>control de congestión</strong> protege <strong>a la RED</strong> (que no se saturen los routers intermedios) y lo regula el <strong>cwnd</strong>, que el emisor <strong>estima solo</strong>, porque la red no le avisa nada. Son mecanismos <strong>independientes</strong> y actúan a la vez.</span>
<h4>Cómo funciona</h4>
<p>El receptor calcula cuánto espacio libre le queda:</p>
<p><span class="formula">rwnd = RcvBuffer − (LastByteRcvd − LastByteRead)</span></p>
<p>donde <code>LastByteRcvd − LastByteRead</code> es lo que ya llegó pero la aplicación <strong>todavía no leyó</strong>. Ese <strong>rwnd</strong> viaja en el campo <em>receive window</em> del header de <strong>cada segmento</strong> que el receptor manda (incluidos los ACKs), así que el emisor tiene el dato siempre fresco. El emisor entonces respeta:</p>
<p><span class="formula">LastByteSent − LastByteAcked ≤ rwnd</span></p>
<p>es decir, mantiene los <strong>bytes en vuelo</strong> (mandados y no confirmados) por debajo del espacio que el receptor declaró. En conjunto con la congestión, la ventana efectiva es <span class="formula">min(rwnd, cwnd)</span>: <strong>manda el más restrictivo de los dos</strong>.</p>
<span class="tip"><strong>El caso borde que se pregunta</strong>: si <code>rwnd = 0</code> el emisor se detiene… y quedaría <strong>bloqueado para siempre</strong>. ¿Por qué? Porque cuando la app finalmente lea y se libere espacio, el receptor <strong>no tendría cómo avisarle</strong>: TCP solo manda ACKs <em>en respuesta</em> a datos recibidos, y no está recibiendo nada. Es un <strong>deadlock</strong>. La solución: con rwnd = 0 el emisor sigue mandando <strong>sondas de 1 byte</strong> cada tanto, y el ACK de esas sondas trae el rwnd actualizado.</span>
<p>Detalle histórico: UDP <strong>no tiene control de flujo</strong> — puede desbordar el buffer del receptor sin enterarse. Es parte del mismo paquete de "UDP no hace nada por vos".</p>`,
      },
      {
        title: 'Control de congestión: slow start, AIMD, Tahoe vs Reno',
        widget: 'cwnd',
        html: `
<p>Acá el problema es <strong>la red</strong> (buffers de routers). El emisor limita: <span class="formula">en vuelo ≤ min(cwnd, rwnd)</span>, banda ≈ cwnd/RTT. Filosofía: <strong>sondear</strong> — subir mientras llegan ACKs, bajar ante pérdidas.</p>
<ul>
<li><strong>Slow start</strong>: cwnd = 1 MSS y se <strong>duplica cada RTT</strong> (exponencial) hasta ssthresh o pérdida.</li>
<li><strong>Congestion avoidance</strong>: +1 MSS por RTT (lineal, additive increase).</li>
<li><strong>Tahoe</strong>: TODA pérdida (timeout o 3 dup ACK) → ssthresh = cwnd/2, <strong>cwnd = 1</strong>, slow start.</li>
<li><strong>Reno</strong>: distingue la señal. <strong>3 dup ACK</strong> = congestión leve (los ACKs fluyen) → cwnd = mitad, <strong>fast recovery</strong>. <strong>Timeout</strong> = grave → cwnd = 1.</li>
</ul>
<p>Resultado: <strong>AIMD</strong> (additive increase, multiplicative decrease) = el diente de sierra. Es <strong>justo</strong>: dos flujos convergen al reparto igualitario (bajada a la mitad conserva proporción, subida en diagonal 45°). Salvedades: RTT chico gana, UDP no participa, y abrir conexiones paralelas "hace trampa".</p>
<p><strong>ECN</strong>: el router MARCA el paquete (2 bits IP) en vez de descartar; el receptor prende ECE en sus ACKs; el emisor reduce como si hubiera perdido (y avisa con CWR). Congestión sin pérdidas ni retransmisiones.</p>`,
      },
      {
        title: 'CUBIC y BBR (8ª edición)',
        html: `
<h4>CUBIC: el problema del AIMD lineal</h4>
<p>El <strong>+1 MSS por RTT</strong> de Reno se pensó para enlaces modestos. En redes de <strong>alto producto ancho de banda × demora</strong> (mucha capacidad y RTT grande) la ventana necesaria para llenar el caño es <strong>enorme</strong>, y crecer de a un segmento por RTT tarda <strong>una eternidad</strong>: después de una sola pérdida, un enlace de 10 Gbps puede necesitar <em>horas</em> para volver a saturarse. El enlace queda desaprovechado casi todo el tiempo.</p>
<p><strong>CUBIC</strong> (el default en <strong>Linux y Windows</strong>) cambia la forma de crecer: en vez de una recta, usa una <strong>función cúbica del tiempo transcurrido desde la última pérdida</strong>, centrada en <strong>W_max</strong> (la ventana que había cuando se perdió). El resultado es una curva con forma de S:</p>
<ul>
<li><strong>Lejos de W_max</strong> (recién después de la pérdida): crece <strong>rápido</strong>, para recuperar el terreno perdido sin demora.</li>
<li><strong>Cerca de W_max</strong>: <strong>se aplana</strong> — sondea con cautela justo en el punto donde <em>ya sabemos</em> que la red se congestionó. Se queda un rato ahí, "tanteando".</li>
<li><strong>Pasado W_max</strong>: si no hubo pérdida, vuelve a <strong>acelerar</strong> para descubrir si ahora hay más capacidad disponible.</li>
</ul>
<p>Y otra ventaja fina: el crecimiento depende del <strong>tiempo</strong>, no de la cantidad de RTTs. Eso lo hace <strong>más justo entre flujos con RTT distinto</strong> — en Reno, el flujo con RTT chico crece más rápido y se queda con más banda solo por estar más cerca.</p>
<h4>Vegas y BBR: cambiar la señal de congestión</h4>
<p>Todos los anteriores usan la <strong>pérdida</strong> como señal. El problema: <strong>la pérdida llega tarde</strong>. Para cuando un router descarta un paquete, sus <strong>colas ya están desbordadas</strong> — es decir, ya venís hace rato agregando latencia a todo el mundo. Es exactamente el mecanismo que produce el <strong>bufferbloat</strong>.</p>
<p><strong>Vegas</strong> y <strong>BBR</strong> miran el <strong>RTT</strong> en su lugar: si el RTT medido empieza a <strong>crecer por encima del mínimo observado</strong>, es que <strong>se están formando colas</strong> → hay que bajar <strong>ANTES</strong> de que se pierda nada. La señal llega <em>antes</em> del daño.</p>
<p><strong>BBR</strong> (Google, 2016) va más allá: estima por separado el <strong>ancho de banda disponible</strong> y el <strong>RTT mínimo</strong> del camino, y apunta a operar exactamente en el punto óptimo — su lema es <em>"mantener el caño lleno, pero no más que lleno"</em>. Corre en el backbone <strong>B4</strong> de Google y en <strong>YouTube</strong>.</p>
<span class="warn">El costo de ser "educado": un algoritmo basado en demora <strong>cede terreno</strong> frente a uno basado en pérdida. Si un flujo Vegas comparte enlace con uno Reno/CUBIC, el Vegas frena al ver crecer el RTT mientras el otro <strong>sigue empujando hasta llenar el buffer</strong> → el prudente sale perdiendo. Es el problema de <strong>equidad entre algoritmos distintos</strong>, y la razón por la que migrar el ecosistema es difícil.</span>
<span class="tip"><strong>El panorama para el oral</strong>, ordenado por señal de congestión: <strong>pérdida</strong> → Tahoe, Reno, CUBIC · <strong>demora (RTT)</strong> → Vegas, BBR · <strong>señal explícita de la red</strong> → <strong>ECN</strong> (el router <em>marca</em> el paquete en vez de tirarlo, y el receptor se lo informa al emisor — la única señal que no requiere ni perder ni adivinar).</span>`,
      },
      {
        title: 'QUIC: el cierre perfecto del capítulo',
        html: `
<p>Se lo llama "el cierre perfecto del capítulo" porque <strong>junta todo</strong>: es un protocolo de <strong>capa de aplicación</strong>, corriendo sobre <strong>UDP</strong>, que <strong>reconstruye TCP + TLS</strong> desde cero. Es la base de <strong>HTTP/3</strong>.</p>
<h4>Qué mejora, punto por punto</h4>
<ul>
<li><strong>Handshake combinado</strong>: el establecimiento de la conexión y el criptográfico (<strong>TLS 1.3</strong>) se hacen <strong>juntos, no uno después del otro</strong> → conexión + claves listas en <strong>1 RTT</strong>, contra los 2–3 de TCP+TLS por separado. Y <strong>0-RTT</strong> al reconectar con un servidor ya conocido.</li>
<li><strong>Streams múltiples con retransmisión POR STREAM</strong>: QUIC <strong>sabe</strong> que hay streams independientes, así que si se pierde un paquete <strong>solo espera ese stream</strong> — los demás siguen entregándose. Es la solución al <strong>HOL blocking de TCP</strong> que HTTP/2 no podía resolver.</li>
<li><strong>Control de congestión en espacio de usuario</strong>: usa algoritmos estilo NewReno/CUBIC/BBR, pero implementados en una <strong>biblioteca</strong>, no en el kernel. Se actualiza <strong>con un deploy de la aplicación</strong>.</li>
<li><strong>Migración de conexión</strong>: la conexión se identifica por un <strong>Connection ID propio</strong> y no por la cuádrupla IP/puerto. Si cambiás de WiFi a datos móviles, <strong>la conexión sobrevive</strong> — con TCP se cortaría, porque cambia la IP y con ella la identidad de la conexión.</li>
<li><strong>Casi todo va cifrado</strong>, incluida la mayor parte del header de transporte. Eso protege la privacidad y, de paso, <strong>impide que los middleboxes se metan</strong>.</li>
</ul>
<h4>Por qué UDP y no un protocolo nuevo</h4>
<p>Esta es <strong>la</strong> pregunta de diseño. Lo lógico habría sido crear un protocolo de transporte nuevo al lado de TCP y UDP… pero sería <strong>indesplegable</strong>:</p>
<ul>
<li>Los <strong>middleboxes</strong> (NATs, firewalls) <strong>descartan</strong> lo que no reconocen: un número de protocolo IP nuevo simplemente <strong>no pasaría</strong> por media Internet. UDP, en cambio, pasa en todos lados.</li>
<li>TCP vive en el <strong>kernel</strong>: cambiarlo implica que <strong>todo el mundo actualice su sistema operativo</strong> — décadas, como pasó con IPv6. Una biblioteca en el browser se actualiza en <strong>semanas</strong>.</li>
</ul>
<p>Es <strong>ossification</strong> (osificación) de la red: el núcleo de Internet está tan cementado que la única forma de innovar en transporte es <strong>hacerlo arriba, disfrazado de UDP</strong>.</p>
<span class="tip"><strong>La pregunta trampa</strong>: "¿UDP no era no confiable? ¿Cómo puede HTTP/3 correr sobre UDP?" — La respuesta: <strong>la confiabilidad la pone QUIC, no UDP</strong>. QUIC implementa <strong>encima</strong> de UDP sus propios números de secuencia, ACKs, retransmisiones, control de flujo, control de congestión y cifrado. Usa UDP <strong>solo como envoltorio</strong> para atravesar la red — le interesan sus puertos y su capacidad de pasar por cualquier lado, no su (inexistente) servicio. Es el ejemplo perfecto de que <strong>si el transporte no te da lo que necesitás, lo construís vos arriba</strong>.</span>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'red-data',
    title: 'Capa de Red: Data Plane',
    short: 'Red · Data',
    icon: '📦',
    color: '#38bdf8',
    layerTag: 'Bloque 3 · Cap. 4',
    tagline: 'Routers por dentro, IP, subnetting, NAT, DHCP, IPv6, SDN (match+action).',
    topics: [
      {
        title: 'Los dos planos y el servicio best-effort',
        html: `
<ul>
<li><strong>Data plane</strong> (por router, local): <strong>forwarding</strong> — mover el paquete de entrada a salida según la tabla. Nanosegundos, hardware.</li>
<li><strong>Control plane</strong> (red completa): <strong>routing</strong> — poblar las tablas. Segundos, software. Tradicional (distribuido) o SDN (controlador central).</li>
</ul>
<p>El servicio de IP es <strong>best-effort</strong>: ni entrega, ni orden, ni demora, ni banda garantizadas. Suena pobre, pero es lo que la hizo simple, barata y universal ("el que quiera más, que lo construya arriba" — TCP).</p>`,
      },
      {
        title: 'Adentro de un router: los cuatro componentes',
        widget: 'router-detail',
        html: `
<p>La arquitectura del libro (<strong>Fig. 4.4</strong>) tiene <strong>cuatro componentes</strong>, y una línea que los parte en dos mundos: <strong>puertos de entrada</strong>, <strong>switching fabric</strong> y <strong>puertos de salida</strong> viven en el <strong>data plane</strong> (hardware, nanosegundos, a <em>line speed</em>); el <strong>procesador de ruteo</strong> vive en el <strong>control plane</strong> (software, milisegundos o segundos).</p>

<h4>1 · Puertos de entrada</h4>
<p>Cada puerto de entrada hace <strong>tres funciones en cadena</strong>:</p>
<ul>
<li><strong>Terminación de línea</strong> (<em>line termination</em>) — la <strong>capa física</strong>: recupera los bits del medio (óptico, cobre, radio). Es el punto donde el enlace "termina" físicamente en el router.</li>
<li><strong>Procesamiento de enlace</strong> (<em>link layer processing</em>) — la <strong>capa 2</strong>: verifica la trama (CRC), la <strong>desencapsula</strong> y extrae el datagrama IP que lleva adentro.</li>
<li><strong>Lookup, forwarding y encolado</strong> — la <strong>capa 3</strong>: se busca la IP destino en la <strong>tabla de reenvío</strong> para decidir <strong>por qué puerto de salida</strong> sale, y se lo manda al fabric.</li>
</ul>
<p><strong>El detalle que más se pregunta: el lookup es DESCENTRALIZADO.</strong> Cada puerto de entrada tiene su <strong>propia copia local</strong> de la tabla de reenvío (una <em>shadow copy</em> que el procesador de ruteo le baja y le mantiene actualizada). ¿Por qué? Porque si cada paquete tuviera que consultar una tabla central en el procesador, <strong>ese procesador sería el cuello de botella</strong> de todo el router. Con la copia local, <strong>cada puerto decide solo y en paralelo</strong> con los demás, y se puede reenviar a <em>line speed</em> (a la velocidad de la línea, sin frenar el flujo de entrada).</p>
<p>La búsqueda usa <strong>LPM</strong> (longest prefix match): si la IP matchea varios prefijos, gana <strong>el más específico</strong>. Para hacerlo en un ciclo de reloj se usan memorias <strong>TCAM</strong> (<em>ternary content-addressable memory</em>): en vez de buscar por dirección, se presenta la IP y la memoria <strong>devuelve el resultado en ~1 ciclo</strong>, comparando contra todas las entradas a la vez (y soportando "comodines" para los prefijos).</p>
<p>Conceptualmente, lo que hace el puerto es un <strong>"match + action"</strong>: matchea campos del paquete y ejecuta una acción. Esa es la idea que después se generaliza en <strong>OpenFlow/SDN</strong> (último tema de la sección).</p>

<h4>2 · Switching fabric (matriz de conmutación)</h4>
<p>Es el <strong>corazón</strong> del router: el que efectivamente <strong>mueve</strong> el paquete del puerto de entrada al de salida. Tiene tres implementaciones históricas (memoria, bus y crossbar) — están en detalle en el diagrama del tema siguiente.</p>

<h4>3 · Puertos de salida</h4>
<p>Hacen el camino inverso, más una función nueva y crítica:</p>
<ul>
<li><strong>Buffer / gestión de cola</strong> — si los paquetes llegan del fabric <strong>más rápido</strong> de lo que el enlace puede transmitirlos, <strong>se encolan</strong>. Acá vive el <strong>retardo de cola</strong> y acá es donde <strong>se pierden</strong> paquetes.</li>
<li><strong>Planificador de paquetes</strong> (<em>packet scheduler</em>) — decide <strong>a cuál de los encolados le toca salir</strong>. Es donde se implementa la <strong>calidad de servicio</strong>.</li>
<li><strong>Procesamiento de enlace</strong> — <strong>encapsula</strong> el datagrama en una trama nueva, con las direcciones MAC del próximo salto.</li>
<li><strong>Terminación de línea</strong> — pone los bits en el medio.</li>
</ul>

<h4>4 · Procesador de ruteo</h4>
<p>Es la "computadora" del router y <strong>el único que está del lado del control plane</strong>. Sus tareas:</p>
<ul>
<li><strong>Ejecuta los protocolos de ruteo</strong> (OSPF, BGP, RIP): mantiene las tablas de ruteo y el estado de los enlaces vecinos.</li>
<li><strong>Calcula la tabla de reenvío</strong> a partir de esa información, y se la <strong>baja a cada puerto de entrada</strong>.</li>
<li><strong>Funciones de gestión</strong>: responder ICMP, SNMP, la consola de administración.</li>
</ul>
<span class="tip">Ojo con la distinción, que se pregunta: la <strong>tabla de RUTEO</strong> (grande, la arma el control plane con los protocolos) no es lo mismo que la <strong>tabla de REENVÍO</strong> (compacta, optimizada para consulta rápida, es la que realmente usan los puertos). En un router <strong>SDN</strong> este procesador desaparece del equipo: las tablas las calcula un <strong>controlador remoto</strong> y se las instala al router.</span>

<h4>Dónde se encola y dónde se pierde</h4>
<p><strong>Colas de entrada</strong>: aparecen si el <strong>fabric es más lento</strong> que la suma de los puertos de entrada. Su patología es el <strong>HOL blocking</strong> (<em>head-of-the-line</em>): el paquete <strong>del frente</strong> de la cola está esperando una salida ocupada, y <strong>traba a los de atrás</strong> aunque la salida de ellos esté libre. Es un bloqueo "por estar atrás del equivocado".</p>
<p><strong>Colas de salida</strong> (el caso normal): el fabric entrega más rápido de lo que el enlace transmite. Si el buffer se llena → <strong>drop-tail</strong> (se descarta el que llega). Los <strong>AQM</strong> (RED, CoDel) descartan o <strong>marcan</strong> <em>antes</em> de llenarse — con <strong>ECN</strong> marcan en vez de tirar, avisándole a TCP que baje sin perder el paquete.</p>
<p><strong>¿Cuánto buffer poner?</strong> Regla clásica <span class="formula">B = RTT × C</span> (para que el enlace no quede ocioso mientras TCP se recupera); refinada para N flujos desincronizados: <span class="formula">B = RTT × C / √N</span>. <strong>Más buffer NO es mejor</strong>: buffers gigantes producen <strong>bufferbloat</strong> — colas persistentemente llenas, latencia enorme, y TCP que tarda una eternidad en enterarse de la congestión.</p>
<p><strong>Scheduling de salida</strong>: <strong>FIFO</strong> (el orden de llegada) · <strong>por prioridad</strong> (siempre sale primero la clase alta — riesgo: <strong>inanición</strong> de las bajas) · <strong>round robin</strong> (turnos cíclicos entre clases) · <strong>WFQ</strong> (<em>weighted fair queueing</em>: garantiza a la clase <em>i</em> al menos <span class="formula">w_i / Σw_j</span> del ancho de banda — es la base del <strong>QoS</strong>).</p>`,
      },
      {
        title: 'El switching fabric: memoria, bus y crossbar',
        widget: 'fabric-detail',
        html: `
<p>El fabric es <strong>el componente que mueve el paquete</strong> de la entrada a la salida, y su velocidad define la del router entero. Se mide con la <strong>tasa de conmutación</strong>: la velocidad a la que puede transferir paquetes. Tres generaciones:</p>
<ul>
<li><strong>Por memoria</strong> (1ª generación) — los routers más viejos eran literalmente <strong>computadoras con CPU</strong>. El paquete lo copia el <strong>procesador</strong> a la <strong>memoria del sistema</strong> y después lo copia de nuevo al puerto de salida. <strong>Cuello de botella</strong>: cada paquete <strong>cruza el bus del sistema DOS veces</strong>, así que la velocidad total está limitada por el <strong>ancho de banda de la memoria</strong>, y <strong>no se pueden hacer dos transferencias a la vez</strong>. (Muchos switches modernos siguen usando esto, pero con el lookup y la copia hechos por el procesador del <em>puerto</em>, no por el central.)</li>
<li><strong>Por bus</strong> (2ª generación) — el puerto de entrada transfiere el paquete <strong>directamente</strong> al de salida por un <strong>bus compartido</strong>, <strong>sin intervención del procesador</strong>. Más rápido, pero como el bus es <strong>uno solo y compartido</strong>, <strong>solo puede pasar un paquete a la vez</strong>: la velocidad del router queda limitada por la <strong>velocidad del bus</strong>.</li>
<li><strong>Por red de interconexión / crossbar</strong> (3ª generación) — una <strong>matriz de 2N buses</strong> (N horizontales para las entradas, N verticales para las salidas) con <strong>puntos de cruce</strong> que se abren y cierran. Permite <strong>varias transferencias EN PARALELO</strong> — es un fabric <strong>no bloqueante</strong>: un paquete nunca es bloqueado por otro <em>mientras vayan a puertos de salida distintos</em>.</li>
</ul>
<span class="warn">El matiz que se pregunta sobre el crossbar: <strong>"no bloqueante" NO significa que nunca haya conflictos.</strong> Si <strong>dos paquetes van a la MISMA salida</strong>, uno tiene que esperar igual — el fabric solo garantiza que no se estorben cuando los destinos son distintos. Cuando el conflicto ocurre y las colas se arman en la entrada, aparece el <strong>HOL blocking</strong>.</span>
<p>Para escalar más, los routers de alta gama <strong>parten el paquete en celdas de longitud fija</strong> y las mandan por el fabric (conmutar celdas fijas es mucho más rápido), o directamente ponen <strong>varios fabrics en paralelo</strong>.</p>`,
      },
      {
        title: 'El datagrama IPv4 y la fragmentación',
        widget: 'frag-detail',
        html: `
<h4>El header (20 bytes sin opciones)</h4>
<ul>
<li><strong>Versión</strong> (4) y <strong>longitud del header</strong> — porque las opciones lo hacen variable.</li>
<li><strong>TOS / DSCP</strong> + <strong>2 bits de ECN</strong> — tipo de servicio y notificación explícita de congestión (los bits con los que un router <em>marca</em> en vez de descartar).</li>
<li><strong>Longitud total</strong> del datagrama.</li>
<li><strong>Campos de fragmentación</strong>: <strong>identifier</strong>, <strong>flags</strong> y <strong>offset</strong>.</li>
<li><strong>TTL</strong> — se <strong>decrementa en 1 por cada router</strong>. Si llega a <strong>0</strong>, el paquete <strong>se descarta</strong> y se manda un <strong>ICMP Time Exceeded</strong>. Existe para que un paquete atrapado en un <strong>bucle de ruteo no circule para siempre</strong>, y de yapa es la base de <strong>traceroute</strong>.</li>
<li><strong>Protocol</strong> — a qué protocolo de arriba entregar el payload: <strong>6 = TCP, 17 = UDP, 1 = ICMP</strong>. Es <strong>el pegamento entre la capa de red y la de transporte</strong>, el análogo del campo <em>tipo</em> de Ethernet.</li>
<li><strong>Header checksum</strong> — cubre <strong>solo el header, no los datos</strong>, y <strong>se recalcula en CADA router</strong> (porque el TTL cambió). Que no cubra los datos es deliberado: verificarlos es tarea de los extremos (TCP/UDP).</li>
<li><strong>IP origen</strong> e <strong>IP destino</strong> (32 bits cada una).</li>
</ul>
<h4>Fragmentación</h4>
<p><strong>El problema</strong>: cada tecnología de enlace impone un <strong>MTU</strong> (Maximum Transmission Unit) distinto — Ethernet, 1500 bytes. Un datagrama que venía por un enlace de MTU grande puede <strong>no entrar</strong> en el siguiente.</p>
<p><strong>La solución en IPv4</strong>: el router lo <strong>parte en fragmentos</strong>, cada uno con su propio header IP:</p>
<ul>
<li>Todos los fragmentos llevan el <strong>MISMO identifier</strong> — así el destino sabe que son del mismo datagrama original.</li>
<li>El <strong>offset</strong> indica en qué posición va cada uno, medido en <strong>unidades de 8 bytes</strong> (por eso los fragmentos, salvo el último, tienen tamaño múltiplo de 8).</li>
<li>El flag <strong>more-fragments</strong> vale 1 en todos <strong>menos en el último</strong>: así el destino sabe cuándo terminó.</li>
</ul>
<span class="tip"><strong>El reensamblado ocurre SOLO en el host destino</strong>, nunca en los routers intermedios. ¿Por qué? Por el principio de <strong>mantener la complejidad en los extremos</strong>: si cada router tuviera que reensamblar, debería <strong>esperar y guardar todos los fragmentos</strong> (que además pueden llegarle por caminos distintos), lo cual sería lentísimo y requeriría estado. Así el router hace lo mínimo y sigue.</span>
<span class="warn">La consecuencia fea: si <strong>falta un solo fragmento</strong>, el destino <strong>descarta el datagrama ENTERO</strong> — los demás fragmentos que sí llegaron se tiran. Y IP no retransmite fragmentos sueltos. Por eso la fragmentación es <strong>cara y frágil</strong>, y se la trata de evitar.</span>
<p><strong>IPv6 la eliminó de los routers</strong>: si un datagrama no entra en el próximo enlace, el router lo <strong>descarta</strong> y manda un <strong>ICMPv6 "Packet Too Big"</strong>; es <strong>el origen</strong> el que debe achicar (<strong>Path MTU Discovery</strong>). Otra vez la misma filosofía: sacarle trabajo al núcleo de la red y dárselo a los extremos.</p>`,
      },
      {
        title: 'Direccionamiento, CIDR, subnetting y LPM',
        widget: 'subnet-detail',
        html: `
<h4>La dirección identifica una INTERFAZ, no un host</h4>
<p>IPv4 usa <strong>32 bits</strong>, y el matiz importa: la dirección identifica <strong>una interfaz</strong>. Un <strong>router tiene varias IPs</strong> —una por interfaz— porque está en varias redes a la vez; y un host con WiFi y cable tiene <strong>dos</strong>. No es "la dirección de la máquina".</p>
<p>Una <strong>subred</strong> es un conjunto de interfaces que <strong>se alcanzan entre sí sin pasar por un router</strong>. Truco para identificarlas en un diagrama: <strong>sacá los routers</strong> y cada "isla" que quede aislada es una subred.</p>
<h4>CIDR</h4>
<p>La notación <code>a.b.c.d/x</code> dice que los <strong>primeros x bits son la parte de red</strong> (el prefijo) y el resto identifica al host dentro de ella. Entonces:</p>
<ul>
<li>Direcciones totales en un /x: <span class="formula">2^(32−x)</span></li>
<li>Hosts útiles: <span class="formula">2^(32−x) − 2</span> — se restan <strong>dos</strong>: la de <strong>red</strong> (todos los bits de host en 0) y la de <strong>broadcast</strong> (todos en 1), que están reservadas.</li>
</ul>
<p><strong>CIDR reemplazó al esquema de clases A/B/C</strong>, que era rígido y derrochón: si necesitabas 300 direcciones, una clase C (254) no alcanzaba y una clase B te daba <strong>65.534</strong> — se desperdiciaban decenas de miles. CIDR permite elegir <strong>el tamaño justo</strong>.</p>
<p>Y habilita lo más importante: la <strong>agregación de rutas</strong>. Un ISP con un bloque <strong>/20</strong> lo reparte internamente en <strong>/23</strong> entre sus clientes, pero <strong>hacia afuera anuncia UN solo /20</strong>. El resto de Internet guarda <strong>una entrada</strong> en lugar de ocho. Sin agregación, las tablas de BGP serían inmanejables.</p>
<h4>Longest Prefix Match</h4>
<p>Si una IP destino matchea <strong>varios</strong> prefijos de la tabla, gana <strong>el más largo</strong> (el más específico). Es lo que permite que <strong>convivan la agregación y las excepciones</strong>: el caso típico es el cliente que <strong>se cambió de ISP conservando su bloque</strong> — el ISP viejo sigue anunciando el /20 agregado, el nuevo anuncia el /23 específico del cliente, y como el /23 es más largo, <strong>gana</strong> y el tráfico va al lugar correcto.</p>
<h4>Ejemplo resuelto de subnetting</h4>
<p>Partir <strong>192.168.1.0/24</strong> en <strong>4 subredes</strong>: hacen falta <strong>2 bits</strong> más de red (2² = 4), así que se pasa de /24 a <strong>/26</strong>. Cada una tiene <strong>2⁶ = 64 direcciones</strong>:</p>
<ul>
<li><code>192.168.1.0/26</code> → .0 red, .1–.62 hosts, .63 broadcast</li>
<li><code>192.168.1.64/26</code> · <code>192.168.1.128/26</code> · <code>192.168.1.192/26</code></li>
</ul>
<p><strong>62 hosts útiles</strong> por subred (64 − 2). Y para <strong>enlaces punto a punto</strong> entre routers se usa un <strong>/30</strong>: 4 direcciones, <strong>2 útiles</strong> — exactamente las dos puntas, sin desperdicio. (Aunque hoy se usa también /31 para ese caso.)</p>
<h4>Cómo se asignan</h4>
<p>La cadena es jerárquica: <strong>ICANN → RIRs</strong> (regionales: <strong>LACNIC</strong> para América Latina, RIPE para Europa, ARIN para Norteamérica) <strong>→ ISPs → clientes</strong>. Esa jerarquía es la que hace posible la agregación geográfica de prefijos.</p>
<p>El <strong>agotamiento de IPv4</strong> (los RIRs ya no tienen bloques libres para repartir) es lo que empujó a <strong>NAT</strong> como parche y a <strong>IPv6</strong> como solución de fondo.</p>`,
      },
      {
        title: 'NAT',
        widget: 'nat-detail',
        html: `
<p><strong>NAT</strong> (Network Address Translation) permite que <strong>toda una red privada</strong> salga a Internet detrás de <strong>una sola IP pública</strong>. Adentro se usan los <strong>rangos privados</strong>, que <strong>no son ruteables</strong> en Internet: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> y <code>192.168.0.0/16</code>.</p>
<h4>Cómo funciona</h4>
<p>El router NAT mantiene una <strong>tabla de traducción</strong> con pares <strong>(IP:puerto privado ↔ IP:puerto público)</strong>:</p>
<ul>
<li><strong>Al salir</strong>: reemplaza la IP origen privada por la <strong>IP pública</strong> del router, y el puerto origen por <strong>un puerto nuevo elegido por él</strong>. Anota la correspondencia en la tabla.</li>
<li><strong>Al volver</strong>: mira el <strong>puerto destino</strong> de la respuesta, lo busca en la tabla y <strong>deshace</strong> la traducción para entregársela al host interno correcto.</li>
</ul>
<p><strong>El puerto es la clave de todo</strong>: es lo que permite distinguir a decenas de hosts internos que comparten la misma IP pública. Por eso el número de puerto de 16 bits alcanza para ~65.000 conexiones simultáneas. (Técnicamente esto es <strong>NAPT</strong> o <em>PAT</em>, que es el NAT que todos usamos.)</p>
<h4>Ventajas</h4>
<ul>
<li><strong>Ahorra direcciones IPv4</strong>: una casa o una empresa entera consume <strong>una sola</strong> IP pública. Es lo que estiró la vida de IPv4 dos décadas.</li>
<li><strong>Cambiás de ISP sin renumerar</strong>: las IPs internas no dependen del proveedor.</li>
<li><strong>Oculta la topología interna</strong>, y de yapa actúa como un firewall rudimentario (de afuera no se ve nada).</li>
</ul>
<h4>Objeciones (esto es lo que se pregunta)</h4>
<ul>
<li><strong>Rompe el modelo end-to-end</strong>: desde afuera <strong>nadie puede iniciar una conexión hacia adentro</strong> — no hay entrada en la tabla todavía, así que el NAT no sabe a quién entregársela. Rompe P2P, videollamadas y servidores caseros. Parches: <strong>port forwarding</strong> (entrada fija a mano), <strong>UPnP</strong> (que la app se autoconfigure el mapeo) y <strong>STUN/TURN</strong> (<em>NAT traversal</em>, lo que usan WebRTC y los juegos).</li>
<li><strong>Viola la separación de capas</strong>: un dispositivo de <strong>capa 3</strong> está leyendo y reescribiendo <strong>puertos, que son de capa 4</strong> (y recalculando checksums de ambas). Es exactamente lo que las capas prometían no hacer.</li>
<li><strong>Los puertos no son "de la red"</strong>: conceptualmente identifican procesos en un host, no son un recurso que un router deba administrar.</li>
</ul>
<span class="tip">La moraleja: <strong>NAT fue un parche que resultó permanente</strong>. Funcionó tan bien para el problema del agotamiento de IPv4 que le quitó urgencia a la solución de fondo — y esa es una de las razones por las que <strong>IPv6 tardó décadas</strong> en desplegarse. Es el ejemplo canónico de <strong>middlebox</strong> que vive en tensión con el diseño original de Internet.</span>`,
      },
      {
        title: 'DHCP',
        widget: 'dhcp-detail',
        html: `
<p><strong>DHCP</strong> (Dynamic Host Configuration Protocol) le da a un host, apenas se conecta, <strong>todo lo que necesita para funcionar en la red</strong>, sin que nadie configure nada. Es el "<strong>plug and play</strong>" de la capa de red. Corre sobre <strong>UDP</strong>, puertos <strong>67 (servidor) y 68 (cliente)</strong>.</p>
<p><strong>Qué entrega</strong> — y son cuatro cosas, no solo la IP:</p>
<ul>
<li>La <strong>dirección IP</strong>, en préstamo por un tiempo determinado (<strong>lease</strong>).</li>
<li>La <strong>máscara de subred</strong> — sin ella el host no sabe qué es local y qué no.</li>
<li>La IP del <strong>default gateway</strong> (el primer salto hacia afuera).</li>
<li>La IP del <strong>servidor DNS local</strong>.</li>
</ul>
<h4>DORA: los cuatro mensajes</h4>
<ol>
<li><strong>DISCOVER</strong> — el cliente, que <strong>todavía no tiene IP</strong>, manda un <strong>broadcast</strong> (origen <code>0.0.0.0</code>, destino <code>255.255.255.255</code>) preguntando si hay algún servidor DHCP. Tiene que ser broadcast justamente porque no sabe ni su IP ni la del servidor.</li>
<li><strong>OFFER</strong> — uno o más servidores responden <strong>ofreciendo</strong> una IP con su lease y demás parámetros. También va en broadcast, porque el cliente aún no tiene dirección.</li>
<li><strong>REQUEST</strong> — el cliente <strong>elige una</strong> de las ofertas y la pide formalmente. Este paso existe porque <strong>puede haber varios servidores</strong>: el request en broadcast le avisa al elegido que sí, y a los otros que liberen la IP que habían reservado.</li>
<li><strong>ACK</strong> — el servidor confirma. Recién ahí el cliente puede usar la dirección.</li>
</ol>
<h4>Lease, renovación y relay</h4>
<p>La IP es un <strong>préstamo con vencimiento</strong>: si el equipo se va sin avisar, el lease vence y la dirección <strong>vuelve al pool</strong> (por eso funciona en redes con equipos que entran y salen). Para renovar, el cliente manda un <strong>REQUEST directo</strong> al servidor que ya conoce — no repite todo DORA.</p>
<p>Y como los mensajes son <strong>broadcast</strong>, no cruzan routers. En redes grandes no se pone un servidor DHCP por subred: se usa un <strong>relay agent</strong> en el router, que <strong>recibe el broadcast local y lo reenvía en unicast</strong> al servidor central.</p>
<span class="tip">Dos observaciones de oral: <strong>(1)</strong> DHCP es de capa de aplicación (usa UDP) pero <strong>configura la capa de red</strong> — otra costura entre capas, como ARP. <strong>(2)</strong> Es el <strong>primer protocolo que corre</strong> cuando enchufás una máquina: sin DHCP no hay IP, sin IP no hay DNS, y sin DNS no hay web. Por eso es el arranque del "día en la vida" del integrador.</span>`,
      },
      {
        title: 'IPv6 y la transición',
        widget: 'cast-detail',
        html: `
<p>La motivación original fue el <strong>agotamiento de IPv4</strong>, pero de paso se aprovechó para <strong>simplificar el header</strong> con 20 años de experiencia encima.</p>
<h4>Direcciones</h4>
<p><strong>128 bits</strong> — unas <strong>3,4×10³⁸</strong> direcciones, el famoso "una IP por cada grano de arena de la Tierra". Tres tipos:</p>
<ul>
<li><strong>Unicast</strong> — una interfaz concreta.</li>
<li><strong>Multicast</strong> — un grupo: todos los miembros reciben.</li>
<li><strong>Anycast</strong> — la misma dirección en <strong>varios lugares</strong>; el ruteo entrega al <strong>más cercano</strong>. Es lo que usan los root servers de DNS y las CDNs.</li>
</ul>
<span class="warn"><strong>No hay broadcast en IPv6.</strong> Es una decisión deliberada: el broadcast <strong>molesta a TODOS</strong> los equipos del segmento, incluso a los que no les interesa (tienen que subir la trama hasta descartarla). Se reemplaza por <strong>multicast a grupos específicos</strong>, que es más eficiente. Por eso <strong>ARP no existe</strong> en IPv6 (era broadcast puro): lo reemplaza <strong>Neighbor Discovery</strong> sobre ICMPv6, usando multicast.</span>
<h4>El header: fijo de 40 bytes</h4>
<p>Es <strong>más largo</strong> que el de IPv4 (por las direcciones de 128 bits) pero <strong>mucho más simple</strong> — y sobre todo <strong>de tamaño FIJO</strong>, lo que permite procesarlo más rápido en hardware. Qué se sacó y por qué:</p>
<ul>
<li><strong>Sin fragmentación en routers</strong> — la hace el origen, avisado por <em>Packet Too Big</em>. Le saca trabajo y estado al núcleo.</li>
<li><strong>Sin checksum</strong> — por dos razones: era <strong>redundante</strong> (enlace ya tiene CRC y transporte tiene su checksum) y era <strong>caro</strong>, porque había que <strong>recalcularlo en CADA router</strong> al cambiar el TTL. Eliminarlo acelera el forwarding.</li>
<li><strong>Sin campo de opciones</strong> en el header base — lo que antes eran <em>options</em> ahora va en <strong>extension headers</strong> encadenados, que los routers intermedios <strong>pueden ignorar</strong>. El header base queda predecible.</li>
</ul>
<p>Lo que se agregó o renombró: <strong>flow label</strong> (etiquetar paquetes de un mismo flujo para tratarlos igual, sin abrir capa 4), y el <strong>TTL</strong> pasó a llamarse <strong>hop limit</strong> — un nombre más honesto, porque siempre contó saltos y no tiempo.</p>
<h4>La transición</h4>
<p><strong>No hay "flag day"</strong>: es imposible apagar Internet un martes y encenderla en IPv6. La convivencia se resuelve con:</p>
<ul>
<li><strong>Dual-stack</strong> — equipos que hablan <strong>los dos protocolos</strong> y eligen según con quién hablen.</li>
<li><strong>Tunneling</strong> — el mecanismo principal: cuando dos islas IPv6 están separadas por una zona que solo entiende IPv4, el datagrama <strong>IPv6 completo viaja como PAYLOAD de un datagrama IPv4</strong> entre los routers dual-stack de los bordes. Los routers IPv4 del medio ven un paquete IPv4 normal y ni se enteran de lo que llevan adentro.</li>
</ul>
<span class="tip"><strong>La moraleja de diseño</strong>, que es la mejor conclusión del capítulo: cambiar la <strong>capa de red</strong> exige actualizar <strong>todos los routers del mundo</strong> → tarda <strong>décadas</strong> (IPv6 lleva ~25 años y todavía no terminó). Cambiar la <strong>capa de aplicación</strong> es actualizar un programa → tarda <strong>meses</strong>. Compará los 25 años de IPv6 con lo rápido que se desplegó <strong>QUIC</strong> — y entendés por qué QUIC eligió construirse sobre UDP en vez de pedir un protocolo nuevo. <strong>Cuanto más abajo en el stack, más difícil de cambiar.</strong></span>`,
      },
      {
        title: 'Generalized forwarding: match + action',
        html: `
<p>El forwarding tradicional mira solo la IP destino. La generalización (<strong>OpenFlow</strong>): flow tables con <strong>match</strong> sobre cualquier campo de L2/L3/L4 (con wildcards) + <strong>contadores</strong> + <strong>acciones</strong>: forward, drop, modify-field, o enviar al controlador.</p>
<p>Lo potente: con la misma tabla implementás dispositivos distintos —</p>
<ul>
<li><strong>Router</strong>: match prefijo IP destino → forward.</li>
<li><strong>Switch</strong>: match MAC destino → forward.</li>
<li><strong>Firewall</strong>: match cuádrupla → forward o <strong>drop</strong>.</li>
<li><strong>NAT</strong>: match + <strong>modify-field</strong> + forward.</li>
</ul>
<p>Dejan de ser cajas distintas: son <strong>la misma caja con distintas reglas</strong>, instaladas por el controlador SDN. La imagen del capítulo: Internet es un <strong>reloj de arena</strong> cuyo cuello angosto es IP — mil apps arriba, mil tecnologías abajo, todos pasan por el medio; los <strong>middleboxes</strong> (NAT, firewalls, caches, balanceadores) viven en tensión con ese cuello.</p>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'red-control',
    title: 'Capa de Red: Control Plane',
    short: 'Red · Control',
    icon: '🧭',
    color: '#818cf8',
    layerTag: 'Bloque 4 · Cap. 5',
    tagline: 'Dijkstra, Bellman-Ford, OSPF, BGP, ICMP y SDN.',
    topics: [
      {
        title: 'Link-State (Dijkstra) vs Distance-Vector (Bellman-Ford)',
        widget: 'dijkstra-detail',
        html: `
<p>Las <strong>dos familias</strong> de algoritmos de ruteo. La diferencia de fondo es <strong>cuánta información tiene cada router</strong>: en link-state, <em>todos saben todo</em>; en distance-vector, <em>cada uno sabe solo lo que le cuentan sus vecinos</em>.</p>
<h4>Link-State (Dijkstra)</h4>
<p>Cada router <strong>difunde el estado de SUS enlaces a TODA la red</strong> (por flooding). Con eso, <strong>todos terminan conociendo la topología completa</strong> — el mismo mapa — y cada uno corre <strong>Dijkstra localmente</strong> para calcular sus caminos mínimos. Es un algoritmo <strong>global pero de cómputo local</strong>: la información se comparte, el cálculo no.</p>
<p><strong>Cómo funciona Dijkstra</strong>, en dos pasos que se repiten: se toma el nodo <strong>de menor costo tentativo</strong> que todavía no fue procesado y se lo da por definitivo; después se <strong>relajan sus vecinos</strong> (si llegar a través suyo es más barato, se actualiza el costo tentativo). Complejidad <strong>O(n²)</strong> con la implementación directa (O(n log n) con cola de prioridad).</p>
<span class="warn"><strong>La patología del link-state: la oscilación de rutas.</strong> Si los costos de los enlaces dependen de la <strong>carga</strong>, aparece un bucle vicioso: todos ven que un enlace está descargado, todos se mudan ahí, ese enlace se satura, todos huyen al siguiente… y las rutas <strong>oscilan indefinidamente</strong>. Es un problema de <strong>realimentación</strong>: el algoritmo reacciona a una métrica que él mismo modifica. Mitigaciones: costos que <strong>no</strong> dependan de la carga, o desincronizar el momento en que cada router recalcula.</span>
<h4>Distance-Vector (Bellman-Ford)</h4>
<p>Cada router conoce <strong>SOLO a sus vecinos directos</strong> y el vector de distancias que ellos le informan. Con eso actualiza sus estimaciones:</p>
<p><span class="formula">d_x(y) = min_v ( c(x,v) + d_v(y) )</span></p>
<p>que se lee: "mi costo hasta <em>y</em> es el mínimo, probando cada vecino <em>v</em>, de <em>(lo que me cuesta llegar a v)</em> + <em>(lo que v dice que le cuesta llegar a y)</em>". Si el resultado mejora, actualiza y <strong>le avisa a sus vecinos</strong>.</p>
<p>Las tres propiedades que lo definen: es <strong>iterativo</strong> (se repite hasta que nadie cambia nada), <strong>asincrónico</strong> (nadie espera a nadie, no hay reloj común) y <strong>distribuido</strong> (ningún nodo tiene la foto completa). <strong>Ningún router sabe la topología</strong> — solo conoce, para cada destino, cuánto le cuesta y por cuál vecino salir.</p>
<h4>"Las buenas noticias viajan rápido; las malas, lento"</h4>
<p>La frase resume el comportamiento asimétrico de DV. Si un enlace <strong>mejora</strong>, la novedad se propaga en pocos intercambios. Si un enlace <strong>se cae</strong>, puede arrancar el <strong>count-to-infinity</strong>: un bucle en el que dos routers se creen mutuamente el camino hacia un destino inalcanzable y los costos suben <strong>de a uno</strong>, muy lentamente, hasta considerarlo infinito.</p>
<p>La mitigación clásica es el <strong>poisoned reverse</strong>: "si yo ruteo hacia <em>x</em> pasando por vos, te digo que mi distancia a <em>x</em> es <strong>∞</strong>" — así el vecino nunca intentará mandarme tráfico de vuelta. <strong>Resuelve los bucles de 2 nodos, pero NO los de 3 o más</strong> (está en el diagrama del tema siguiente).</p>
<h4>La comparación (esto es lo que se pregunta)</h4>
<ul>
<li><strong>Mensajes</strong>: LS manda <strong>más</strong> (un flooding a toda la red por cada cambio de enlace) · DV manda <strong>menos</strong> y <strong>solo a vecinos</strong>, pero puede necesitar muchas rondas.</li>
<li><strong>Velocidad de convergencia</strong>: LS converge <strong>rápido y de forma predecible</strong> · DV puede converger <strong>lentísimo</strong> (count-to-infinity).</li>
<li><strong>Robustez ante fallas</strong> — la diferencia más importante: en <strong>LS</strong>, si un router calcula mal o miente, <strong>solo arruina su propia tabla</strong>, porque cada uno computa por su cuenta sobre el mapa compartido. En <strong>DV</strong>, un error <strong>se PROPAGA</strong>: lo que un router informa mal lo usan sus vecinos para calcular, y esos se lo pasan a los suyos.</li>
<li><strong>Memoria</strong>: LS guarda <strong>toda la topología</strong> · DV solo su vector y el de sus vecinos.</li>
</ul>
<p>En la práctica: <strong>OSPF es link-state</strong> y <strong>RIP es distance-vector</strong>. <strong>BGP</strong> es una variante de DV (path-vector: en vez de una distancia, informa el <strong>camino completo</strong> de ASes — lo que le permite detectar bucles al instante en lugar de sufrir count-to-infinity).</p>`,
      },
      {
        title: 'Distance-Vector: convergencia desde cero (Bellman-Ford)',
        widget: 'dvconv-detail',
        html: `
<p>Este es <strong>el ejemplo clásico del Kurose (Fig. 5.6)</strong>. Hay una red de 3 routers — <strong>x</strong>, <strong>y</strong>, <strong>z</strong> — unidos por enlaces, cada uno con un <strong>costo</strong>: c(x,y)=2, c(y,z)=1, c(x,z)=7. La meta de cada router es descubrir el <strong>camino más barato</strong> hacia todos los demás; pero al arrancar <strong>solo conoce a sus vecinos directos</strong> y estima el resto con esa poca información.</p>

<p><strong>¿Qué es un "vector de distancias"?</strong> Es la fila de costos que un router estima hacia cada destino. El de x se escribe <span class="formula">D<sub>x</sub> = [ D<sub>x</sub>(x), D<sub>x</sub>(y), D<sub>x</sub>(z) ]</span>, donde <strong>D<sub>x</sub>(z)</strong> se lee "el mejor costo que x cree hoy que le sale llegar hasta z". Cada router tiene su propio vector: es su fila en el gráfico.</p>

<p class="reading"><strong>Cómo leer cada tabla del diagrama:</strong></p>
<ul>
<li>Hay <strong>una tabla por router</strong> (x verde, y azul, z violeta): representa lo que <em>ese</em> router cree saber en este momento.</li>
<li>La fila <code>a →</code> son los <strong>destinos</strong> (x, y, z). La fila <code>costo</code> es el costo mínimo que hoy estima hacia cada destino.</li>
<li>El <strong>0</strong> es el costo a sí mismo; un <strong>∞</strong> significa "todavía no sé cómo llegar".</li>
<li>Una celda <strong style="color:#ffd54f">resaltada en amarillo</strong> es un valor que <strong>cambió (mejoró) en esa ronda</strong>. El sobre 🟡 que viaja por los enlaces es un router mandándole su vector a los vecinos.</li>
</ul>

<p><strong>Cómo avanza (Bellman-Ford):</strong> en cada ronda, cada router recibe los vectores de sus vecinos y recalcula cada destino con <span class="formula">D<sub>v</sub>(dest) = min<sub>w</sub> [ c(v,w) + D<sub>w</sub>(dest) ]</span> — es decir, "el mínimo, probando cada vecino <em>w</em>, de <em>(lo que me cuesta llegar a w)</em> + <em>(lo que w dice que le cuesta llegar al destino)</em>". Si el resultado mejora lo que tenía, lo actualiza y vuelve a avisarle a sus vecinos. Es <strong>iterativo, asincrónico y distribuido</strong>, y <strong>converge</strong> cuando una ronda entera no cambia ninguna celda. Es el motor de <strong>RIP</strong>.</p>

<p>Fijate en el caso estrella: x cree que llegar a z le cuesta <strong>7</strong> (su enlace directo). Pero cuando y le cuenta que <em>él</em> llega a z por solo <strong>1</strong>, x descubre el atajo x→y→z = 2+1 = <strong>3</strong>, que es &lt; 7 y por eso pisa el 7. Esa es, en una celda, toda la idea del distance-vector.</p>`,
      },
      {
        title: 'Distance-Vector: cuando cae un enlace (count-to-infinity)',
        widget: 'dv-detail',
        html: `
<p><strong>"Las buenas noticias viajan rápido; las malas, lento."</strong> Si un enlace <strong>mejora</strong>, la novedad se propaga en pocos intercambios: alguien descubre un camino más barato, avisa, y en una o dos rondas se enteró todo el mundo. Pero si un enlace <strong>se cae</strong>, puede arrancar el <strong>count-to-infinity</strong>.</p>
<h4>Por qué pasa</h4>
<p>La raíz del problema es que en distance-vector <strong>un router sabe el COSTO pero no el CAMINO</strong>. Cuando <em>y</em> le dice a <em>x</em> "yo llego a <em>z</em> con costo 5", <em>x</em> <strong>no tiene forma de saber si ese camino pasa por él mismo</strong>.</p>
<p>Entonces, cuando se cae el enlace hacia <em>z</em>:</p>
<ol>
<li><em>x</em> pierde su ruta directa, pero ve que <strong>su vecino <em>y</em> dice tener una ruta a <em>z</em></strong> — sin saber que <strong>esa ruta pasaba por el propio <em>x</em></strong>.</li>
<li><em>x</em> la adopta y anuncia un costo un poco mayor.</li>
<li><em>y</em> ve el anuncio de <em>x</em>, actualiza <strong>su</strong> costo hacia arriba, y se lo informa a <em>x</em>.</li>
<li>Los dos se van pasando la pelota, <strong>subiendo de a uno</strong>, en una especie de bucle de ruteo que se resuelve <strong>lentísimo</strong>.</li>
</ol>
<p>Se lo llama "cuenta hasta el infinito" porque, sin un tope, seguiría incrementando indefinidamente. La solución práctica es <strong>definir un valor que signifique "infinito"</strong>: en <strong>RIP es 16</strong>, y por eso RIP no puede tener caminos de más de 15 saltos — el tope existe para que la cuenta <strong>termine rápido</strong>.</p>
<h4>Las mitigaciones</h4>
<ul>
<li><strong>Split horizon</strong> — no anunciarle una ruta al vecino <strong>por el cual</strong> vas hacia ese destino.</li>
<li><strong>Poisoned reverse</strong> — una versión más fuerte: si ruteo hacia <em>x</em> <strong>a través tuyo</strong>, te anuncio explícitamente que <strong>mi distancia a <em>x</em> es ∞</strong>. Así el vecino <strong>nunca</strong> va a intentar mandarme tráfico de vuelta hacia ese destino.</li>
</ul>
<span class="warn"><strong>El límite que se pregunta</strong>: el poisoned reverse <strong>resuelve los bucles de 2 nodos</strong>, pero <strong>NO los de 3 o más</strong>. Con tres routers, el "envenenamiento" no alcanza para cubrir todas las combinaciones: siempre queda un camino indirecto por el que la información falsa vuelve a circular. <strong>El count-to-infinity es un problema estructural de distance-vector</strong>, no un bug que se pueda parchear del todo.</span>
<p><strong>Cómo lo resuelven los demás</strong>: <strong>link-state</strong> (OSPF) directamente no lo tiene, porque cada router conoce la <strong>topología completa</strong> y ve por dónde pasa cada camino. Y <strong>BGP</strong> lo evita porque es <strong>path-vector</strong>: anuncia el <strong>AS-PATH completo</strong>, así que un AS que ve <strong>su propio ASN</strong> en el camino sabe al instante que sería un bucle y <strong>descarta la ruta</strong>. Es exactamente la información que a DV le falta.</p>`,
      },
      {
        title: 'Sistemas Autónomos: intra vs inter',
        html: `
<p>Todo lo visto hasta acá (Dijkstra, Bellman-Ford) asume una red <strong>plana</strong>: todos los routers corriendo el mismo algoritmo y conociéndose entre sí. En Internet eso <strong>es imposible</strong>, por <strong>dos razones distintas</strong> que conviene nombrar separadas:</p>
<ul>
<li><strong>Escala</strong>: hay <em>cientos de millones</em> de routers. Ningún link-state podría floodear semejante topología, ninguna tabla la guardaría y ningún Dijkstra la calcularía. Además el tráfico de ruteo solo <strong>ahogaría</strong> los enlaces.</li>
<li><strong>Autonomía administrativa</strong>: cada organización quiere <strong>controlar su propia red</strong>, decidir sus métricas, y sobre todo <strong>no publicar su topología interna</strong> ni dejar que un tercero decida cómo se rutea adentro suyo.</li>
</ul>
<p>La solución es <strong>jerarquía</strong>: Internet se organiza en <strong>Sistemas Autónomos (AS)</strong> — conjuntos de routers bajo una <strong>misma administración técnica</strong>, identificados por un número global único (<strong>ASN</strong>) que asigna la IANA. Un ISP, una universidad grande o Google son cada uno uno o varios AS.</p>
<p>Y con eso el problema de ruteo <strong>se parte en dos</strong>, con protocolos de naturaleza completamente distinta:</p>
<ul>
<li><strong>Intra-AS (IGP)</strong> — cómo se rutea <strong>dentro</strong> de un AS. El objetivo es <strong>puramente técnico</strong>: minimizar el costo, optimizar performance. Como hay un solo dueño, se puede confiar en todos y compartir la topología completa. Protocolos: <strong>OSPF</strong>, RIP, IS-IS.</li>
<li><strong>Inter-AS (EGP)</strong> — cómo se rutea <strong>entre</strong> ASes. Acá el objetivo <strong>no es el camino más corto</strong>: manda la <strong>política y el dinero</strong> (quién le paga tránsito a quién, con quién hay acuerdo de peering). Además hay que asumir que el otro AS <strong>no es de confianza</strong> y no te va a mostrar su interior. El protocolo, único y de facto: <strong>BGP</strong>.</li>
</ul>
<span class="tip">La frase que resume todo: <strong>adentro se optimiza performance, afuera se optimiza política</strong>. Por eso OSPF elige por costo y BGP elige por local-preference antes que por longitud del AS-PATH. Y por eso un AS <strong>anuncia rutas, no su topología</strong>: le dice al vecino "por acá se llega", no "así estoy armado adentro".</span>`,
      },
      {
        title: 'OSPF (link-state): LSAs y jerarquía de áreas',
        widget: 'ospf-detail',
        html: `
<p><strong>OSPF</strong> es el IGP <strong>link-state</strong>: cada router difunde sus enlaces en un <strong>LSA</strong> por <strong>flooding confiable</strong> a todo el área, y corre <strong>Dijkstra</strong> sobre el mapa completo. Costos configurables (1 en todos = mínimo de saltos; o inversos a la banda).</p>
<p><strong>La tabla de OSPF es la LSDB (Link-State Database)</strong> — el panel del diagrama. A diferencia de RIP (que se pasa <em>distancias ya calculadas</em>), OSPF se pasa <strong>el mapa crudo</strong>: cada <strong>LSA</strong> es una fila que dice "el router X está conectado a estos vecinos con estos costos". El flooding hace que <strong>los 6 routers terminen con la MISMA LSDB</strong>. Recién ahí cada uno corre <strong>Dijkstra</strong> localmente sobre ese mapa y arma <em>su</em> tabla de forwarding (destino → próximo salto). El pipeline completo es: <span class="formula">LSA → flooding → LSDB idéntica en todos → Dijkstra → tabla de forwarding</span>.</p>
<span class="tip">Por eso un router "mentiroso" en OSPF solo arruina su propia tabla (cada uno calcula solo, con el mapa compartido), mientras que en RIP/DV un error se <strong>propaga</strong> por los vectores. El precio de OSPF: manda más mensajes y guarda más estado (toda la LSDB).</span>
<p>Extras industriales: <strong>autenticación</strong> de LSAs (que un router pirata no inyecte rutas), <strong>ECMP</strong> (caminos de igual costo repartidos) y <strong>jerarquía en áreas</strong>: áreas que corren su propio link-state, interconectadas por un <strong>backbone (área 0)</strong> a través de <em>area border routers</em> — así el flooding y el cálculo quedan contenidos por área y OSPF escala a ASes enormes.</p>`,
      },
      {
        title: 'RIP (distance-vector): la tabla de ruteo',
        widget: 'rip-detail',
        html: `
<p><strong>RIP</strong> es el IGP <strong>distance-vector</strong> histórico — uno de los primeros protocolos de ruteo de Internet, y hoy sobre todo un caso de estudio.</p>
<h4>La métrica: saltos</h4>
<p>RIP mide el costo en <strong>número de saltos (hops)</strong>: cada enlace vale <strong>1</strong>, sin importar su velocidad. Eso lo hace <strong>simplísimo</strong> pero también <strong>tosco</strong>: un camino de 2 saltos por enlaces de 1 Mbps le gana a uno de 3 saltos por fibra de 10 Gbps. No distingue calidad, solo cantidad.</p>
<p>El máximo es <strong>15 saltos</strong>, y <strong>16 significa infinito</strong> (destino inalcanzable). Ese tope cumple <strong>dos funciones a la vez</strong>: le pone un techo al <strong>count-to-infinity</strong> —la cuenta termina en 16 en vez de seguir para siempre— y, como efecto colateral, <strong>limita a RIP a redes chicas</strong>: si tu red tiene caminos de más de 15 saltos, RIP directamente no sirve.</p>
<h4>Cómo funciona</h4>
<ul>
<li>Los vecinos intercambian sus <strong>vectores de distancia</strong> cada <strong>~30 segundos</strong> (los <em>RIP advertisements</em>), y también ante cambios.</li>
<li>Cada anuncio lista hasta 25 subredes destino con su distancia.</li>
<li>Al recibir un vector, el router le <strong>suma 1</strong> (el salto hasta ese vecino) y se queda con la mejor opción para cada destino.</li>
<li>Si un vecino <strong>deja de anunciar durante ~180 s</strong>, se lo considera caído y sus rutas se marcan inalcanzables.</li>
</ul>
<p>Su <strong>tabla de ruteo</strong> tiene el formato que muestra el diagrama: <strong>(subred destino, próximo router, número de saltos)</strong>. Fijate que el router <strong>no guarda el camino completo</strong> — solo <em>a quién entregárselo</em> y <em>cuánto cuesta</em>: eso es exactamente la esencia de distance-vector, y la razón de todos sus problemas de bucles.</p>
<p>Detalle curioso: RIP se implementa como un <strong>proceso de nivel de aplicación</strong> (<em>routed</em>) que corre sobre <strong>UDP puerto 520</strong> — un protocolo de ruteo viajando encima del transporte que él mismo hace posible.</p>
<span class="tip"><strong>RIP vs OSPF</strong>, la comparación que cierra: RIP es <strong>distance-vector</strong>, métrica de <strong>saltos</strong>, converge <strong>lento</strong>, tope de 15 y <strong>configuración trivial</strong>. OSPF es <strong>link-state</strong>, con <strong>costos configurables</strong>, converge <strong>rápido</strong>, escala con <strong>áreas</strong> y trae autenticación y ECMP. Por eso hoy RIP es más <strong>pieza de museo y herramienta didáctica</strong> que una elección de diseño real — pero es el ejemplo más limpio de distance-vector funcionando.</span>`,
      },
      {
        title: 'BGP: el pegamento de Internet',
        widget: 'bgp-detail',
        html: `
<p>El inter-AS de facto, sobre <strong>TCP/179</strong>. <strong>eBGP</strong> (entre ASes) aprende prefijos externos; <strong>iBGP</strong> (dentro del AS) los distribuye. Anuncia <strong>prefijos con atributos</strong>:</p>
<ul>
<li><strong>AS-PATH</strong>: lista de ASes atravesados — detecta loops (¿mi ASN ya figura? descarto) y métrica gruesa.</li>
<li><strong>NEXT-HOP</strong>: la IP de entrada al primer AS del camino — el ancla con el ruteo intra-AS.</li>
</ul>
<p><strong>Selección de ruta (el orden se pregunta)</strong>: 1) <strong>local preference</strong> (política del administrador — pisa todo), 2) <strong>AS-PATH más corto</strong>, 3) <strong>hot-potato</strong> (NEXT-HOP más cercano según MI IGP: "sacate el paquete de encima ya"), 4) desempate por identificadores.</p>
<p class="reading"><strong>Cómo leer la tabla de rutas del diagrama</strong> — son las rutas candidatas que AS1 tiene hacia 138.16/16, una por fila:</p>
<ul>
<li><strong>vía</strong>: por cuál <em>AS vecino</em> se va la ruta (AS2 o AS3). Es el primer ASN del AS-PATH.</li>
<li><strong>AS-PATH</strong>: la secuencia de ASes hasta el destino. Acá las dos rutas miden 2 ASes → <strong>empatan</strong>, y por eso la decisión baja al hot-potato.</li>
<li><strong>egress</strong>: el <em>router de salida de MI propio AS</em> (1a o 1b) — el punto por donde el paquete abandona AS1 rumbo a ese vecino. "Egress" = punto de egreso/salida.</li>
<li><strong>IGP</strong>: el <em>costo intradominio</em> (el que calcula mi propio <strong>IGP</strong>: OSPF/RIP) para llegar desde el host hasta ese router de egreso. Es exactamente lo que mira la papa caliente: <strong>gana el egress con IGP más bajo</strong> (1b, costo 4, contra 1a con 10).</li>
</ul>
<span class="tip"><strong>IGP</strong> = <em>Interior Gateway Protocol</em>, el protocolo de ruteo <em>dentro</em> del AS (OSPF, RIP). Como columna, "IGP" es abreviatura de "costo según el IGP". No confundir con BGP, que es el protocolo <em>entre</em> ASes (EGP).</span>
<p><strong>Políticas comerciales</strong>: relaciones cliente-proveedor (se paga tránsito) o peers (gratis entre sí). Regla: un AS anuncia a proveedores/peers <strong>solo las rutas de sus clientes</strong> — nunca rutas de un proveedor hacia otro (sería tránsito gratis). Consecuencia: a veces el camino físico corto no se usa porque comercialmente no existe.</p>
<p><strong>IP anycast</strong>: la misma IP anunciada desde muchos puntos; BGP te lleva al "más cercano". Así funcionan los root servers de DNS y las CDNs.</p>`,
      },
      {
        title: 'BGP: propagación del prefijo y AS-PATH',
        widget: 'bgppropag-detail',
        html: `
<p>Cómo un prefijo <strong>se propaga</strong> por Internet. La mecánica es simple y todo gira alrededor de un atributo: el <strong>AS-PATH</strong>.</p>
<h4>El AS-PATH crece en cada frontera</h4>
<p>El AS <strong>dueño</strong> del prefijo lo anuncia a sus vecinos. En cada frontera (<strong>eBGP</strong>), el AS que <strong>reanuncia</strong> la ruta <strong>prepende su propio ASN</strong> al AS-PATH. Así el camino va creciendo: <code>[AS4]</code> → <code>[AS3 AS4]</code> → <code>[AS2 AS3 AS4]</code>. Leído de izquierda a derecha, el AS-PATH es <strong>la lista completa de ASes por los que pasó el anuncio</strong>, del más cercano al origen.</p>
<span class="warn">Distinguí bien las dos direcciones, que se confunden: los <strong>anuncios</strong> viajan <em>desde</em> el dueño del prefijo <em>hacia</em> el resto; el <strong>tráfico</strong> después viaja <strong>en sentido contrario</strong>, siguiendo el camino que los anuncios dejaron marcado. Anunciar un prefijo es decir "<strong>por acá se llega hasta mí</strong>".</p>
<h4>Para qué sirve el AS-PATH</h4>
<ul>
<li><strong>Detección de bucles</strong> — es su función principal. Si un AS recibe una ruta y <strong>ve su propio ASN</strong> en el path, sabe que aceptarla crearía un bucle y la <strong>descarta al instante</strong>. Esto es lo que hace a BGP un <strong>path-vector</strong> y no un simple distance-vector: como conoce <em>el camino completo</em> y no solo una distancia, <strong>no sufre count-to-infinity</strong>. Y como bonus, IP no necesita TTL para evitar bucles a nivel de AS.</li>
<li><strong>Métrica de desempate</strong> — menos ASes ≈ mejor, aunque es una medida <strong>gruesa</strong>: un AS puede ser una universidad chica o un operador continental, y en el AS-PATH ambos <strong>cuentan 1</strong>. Por eso el AS-PATH más corto <strong>no significa el camino físicamente más corto ni el más rápido</strong>.</li>
</ul>
<p>De hecho, un AS puede hacer <strong>AS-PATH prepending</strong>: repetir su propio ASN varias veces para que su ruta <strong>parezca más larga</strong> y así <strong>desalentar</strong> el tráfico entrante por ese enlace. Es ingeniería de tráfico hecha "mintiendo" sobre la métrica.</p>
<h4>El orden de selección de ruta</h4>
<p>Cuando a un AS le llegan <strong>varias rutas al mismo prefijo</strong>, decide en este orden (y se pregunta así):</p>
<ol>
<li><strong>Local-preference más alta</strong> — la <strong>política</strong> del administrador. <strong>Pisa todo lo demás</strong>: acá se codifica "prefiero mandar por mi cliente antes que por mi proveedor, porque me cobra".</li>
<li><strong>AS-PATH más corto</strong> — recién si empatan en política.</li>
<li><strong>Hot-potato</strong> — el <strong>NEXT-HOP más cercano según MI propio IGP</strong>: sacar el paquete de mi red lo antes posible.</li>
<li><strong>Desempate por identificadores</strong> (menor router-id).</li>
</ol>
<span class="tip">Que la <strong>local-preference esté PRIMERA</strong> es la idea central de BGP: <strong>la política manda sobre la eficiencia</strong>. BGP no busca el camino más corto — busca el camino que <strong>conviene comercialmente</strong>. Todo el resto del algoritmo solo se ejecuta cuando la política no alcanzó para decidir.</span>`,
      },
      {
        title: 'ICMP y traceroute',
        widget: 'traceroute-detail',
        html: `
<p><strong>ICMP</strong> es el protocolo de <strong>control y reporte de errores</strong> de la capa de red. IP es <em>best-effort</em> y descarta paquetes en silencio; ICMP es el mecanismo para que alguien pueda <strong>avisar que algo salió mal</strong>.</p>
<p><strong>Dónde vive</strong> — la pregunta capciosa: los mensajes ICMP viajan <strong>DENTRO de datagramas IP</strong> (campo <em>protocol</em> = <strong>1</strong>), o sea que <em>arquitectónicamente</em> van encima de IP como si fueran carga útil… pero <strong>funcionalmente son parte de la capa de red</strong>, no de aplicación. Se lo suele describir como que está "justo encima de IP pero pertenece a la capa 3".</p>
<p>Cada mensaje lleva un <strong>tipo</strong> y un <strong>código</strong>, y — clave — <strong>una copia del header IP y los primeros 8 bytes del datagrama que causó el error</strong>, para que el emisor pueda identificar <em>de qué</em> paquete le están hablando.</p>
<h4>Los mensajes que hay que saber</h4>
<ul>
<li><strong>Echo request / reply</strong> (tipos <strong>8 / 0</strong>) — son <code>ping</code>. Es el único par que <strong>no reporta un error</strong>: sirve para probar alcanzabilidad y medir RTT.</li>
<li><strong>Destination Unreachable</strong> (tipo <strong>3</strong>), con distintos <em>códigos</em>: red inalcanzable, host inalcanzable, protocolo inalcanzable y <strong>puerto inalcanzable</strong>. Este último lo genera <strong>el host destino</strong> cuando llega un <strong>UDP a un puerto sin proceso escuchando</strong> — es exactamente lo que aprovecha traceroute para saber que llegó al final.</li>
<li><strong>Time Exceeded</strong> (tipo <strong>11</strong>) — lo manda un <strong>router</strong> cuando el <strong>TTL llega a 0</strong>. Es la base de traceroute.</li>
</ul>
<h4>Cómo funciona traceroute</h4>
<p>Es un truco elegante sobre el TTL: se manda una serie de paquetes con <strong>TTL creciente</strong>. El de <strong>TTL=1</strong> muere en el <strong>primer router</strong>, que devuelve un <strong>Time Exceeded</strong> revelando su IP. El de <strong>TTL=2</strong> muere en el segundo, y así. Cuando el paquete <strong>por fin llega al destino</strong>, ya no hay Time Exceeded: el destino responde <strong>Port Unreachable</strong> (porque el paquete iba a un puerto UDP alto y raro, elegido justamente para que no haya nadie escuchando) — y ahí traceroute sabe que terminó.</p>
<span class="warn">Por qué a veces traceroute muestra <strong>asteriscos</strong>: muchos routers <strong>no responden ICMP</strong> (por política o por rate-limiting), y muchos firewalls lo bloquean. Un <code>* * *</code> <strong>no significa</strong> que el paquete no pasó por ahí — significa que ese salto no quiso contestar. Lo mismo con <code>ping</code>: que no responda no prueba que el host esté caído.</span>
<p><strong>ICMPv6</strong> es bastante más que un reemplazo: además de los mensajes de error, absorbe funciones que en IPv4 estaban afuera — <strong>Neighbor Discovery</strong>, que <strong>reemplaza a ARP</strong>, y <strong>Packet Too Big</strong>, necesario porque <strong>IPv6 no fragmenta en los routers</strong> y el origen tiene que descubrir el MTU del camino (<em>Path MTU Discovery</em>).</p>`,
      },
      {
        title: 'SDN: el control plane centralizado',
        widget: 'sdn-detail',
        html: `
<h4>La idea</h4>
<p>En el ruteo tradicional, cada router <strong>calcula solo</strong> y los routers <strong>negocian entre sí</strong> (OSPF, BGP): el control está <strong>distribuido y embebido</strong> en cada equipo. <strong>SDN</strong> invierte eso: la lógica de control <strong>sale de los routers</strong> y se concentra en un <strong>controlador con vista global</strong>. Los equipos quedan reducidos a <strong>"cajas tontas" que solo hacen forwarding</strong> según las reglas que les instalan.</p>
<p><strong>Ojo con "centralizado"</strong>: es <strong>lógicamente</strong> centralizado pero <strong>físicamente replicado</strong> — si fuera una sola máquina sería un punto único de falla inaceptable.</p>
<p>Las <strong>tres motivaciones</strong>: gestión más simple (configurás <em>la red</em>, no equipo por equipo), poder <strong>programar</strong> el comportamiento con software, y romper con los equipos propietarios y cerrados de cada fabricante.</p>
<h4>Los tres pisos</h4>
<ul>
<li><strong>Southbound (OpenFlow)</strong> — la interfaz entre el controlador y los switches. <em>Del switch al controlador</em>: <strong>packet-in</strong> (llegó algo que <strong>no matcheó ninguna regla</strong> → "¿qué hago con esto?") y <strong>port-status</strong> (se cayó un enlace). <em>Del controlador al switch</em>: <strong>flow-mod</strong> ("instalá esta regla en tu tabla").</li>
<li><strong>Capa de estado</strong> — el controlador mantiene la <strong>foto completa</strong>: topología, estado de los enlaces, tablas instaladas, estadísticas de tráfico. Es la "base de datos" sobre la que razona todo lo demás.</li>
<li><strong>Northbound</strong> — la API que el controlador le ofrece a las <strong>aplicaciones de red</strong>. Y acá está lo conceptualmente fuerte: <strong>el ruteo pasa a ser una APP</strong>. Dijkstra deja de ser "lo que hace el router" y se convierte en <strong>un programa</strong> que corre sobre la API — igual que una app de firewall, de balanceo de carga o de ingeniería de tráfico.</li>
</ul>
<h4>Ejemplo punta a punta</h4>
<ol>
<li>Se <strong>cae un enlace</strong>.</li>
<li>El switch avisa con un <strong>port-status</strong>.</li>
<li>El controlador <strong>actualiza su topología</strong>.</li>
<li>La <strong>app de ruteo recalcula</strong> los caminos con la foto completa.</li>
<li>El controlador manda <strong>flow-mods</strong> a los switches afectados.</li>
</ol>
<p>Lo que en el modelo tradicional requiere que <strong>mil routers floodeen LSAs y negocien</strong> hasta converger, acá lo hace <strong>un programa que ya tiene toda la información</strong>.</p>
<span class="tip">La conexión con el resto del capítulo: SDN es la <strong>separación data plane / control plane llevada al extremo</strong>. El "procesador de ruteo" que veíamos <em>adentro</em> del router se saca <strong>afuera del equipo</strong>. Y el <strong>generalized forwarding</strong> (match + action) es justamente el modelo de datos que hace posible que la misma caja sea router, switch, firewall o NAT según las reglas que le instalen.</span>
<p><strong>Controladores</strong> reales: <strong>OpenDaylight</strong> y <strong>ONOS</strong>. <strong>Las tensiones</strong>, que conviene mencionar: el controlador es un <strong>punto crítico</strong> (hay que replicarlo, y ahí aparecen los problemas de consistencia entre réplicas), la <strong>latencia del lazo</strong> switch↔controlador importa (por eso lo que se puede se resuelve con reglas preinstaladas y no consultando cada vez), y a mayor escala hay que <strong>federar varios controladores</strong> — con lo que reaparece, en otro nivel, el problema distribuido que se quería evitar.</p>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'enlace',
    title: 'Capa de Enlace',
    short: 'Enlace',
    icon: '🔗',
    color: '#a78bfa',
    layerTag: 'Bloque 5 · Cap. 6',
    tagline: 'Errores, acceso múltiple, MAC/ARP, Ethernet, switches, VLANs, MPLS.',
    topics: [
      {
        title: 'Servicios y dónde vive la capa',
        html: `
<p>La capa de enlace mueve un datagrama entre <strong>dos nodos físicamente adyacentes</strong> (unidos por un mismo enlace), encapsulándolo en una <strong>trama</strong>. Su unidad es la trama; su alcance, <strong>un solo salto</strong>.</p>
<p><strong>Los servicios que puede ofrecer</strong> (no todos los protocolos ofrecen todos):</p>
<ul>
<li><strong>Framing</strong>: delimitar dónde empieza y termina cada trama dentro del chorro de bits, y encapsular el datagrama con un header propio.</li>
<li><strong>Acceso al enlace (MAC)</strong>: coordinar quién transmite cuando el medio es <strong>compartido</strong>. En un enlace punto a punto es trivial; en uno broadcast es todo el problema del acceso múltiple.</li>
<li><strong>Entrega confiable</strong> (ACKs y retransmisiones <em>locales</em>): tiene sentido en enlaces con <strong>alta tasa de error</strong> — típicamente los <strong>inalámbricos</strong>, donde conviene corregir ahí mismo en vez de esperar a que TCP se entere punta a punta. En fibra o cobre, donde los errores son rarísimos, <strong>casi no se usa</strong>: agregaría overhead para nada.</li>
<li><strong>Detección y corrección de errores</strong>: por interferencia y atenuación los bits se corrompen; el receptor lo detecta (CRC) y descarta, o directamente lo corrige (FEC).</li>
<li><strong>Control de flujo</strong> entre los dos extremos del enlace, y <strong>full-duplex / half-duplex</strong>.</li>
</ul>
<p><strong>Dónde se implementa</strong>: mayormente en la <strong>NIC</strong> (placa de red) — es una mezcla de <strong>hardware, firmware y software</strong>. La parte sensible al tiempo (framing, CRC, acceso al medio) va en silicio; la parte de gestión, en el driver del sistema operativo. Es la capa donde <strong>hardware y software se tocan</strong>.</p>
<span class="tip">La distinción que se pregunta: <strong>enlace es SALTO A SALTO; red es PUNTA A PUNTA</strong>. La analogía del libro: un viaje con tramos en auto, avión y tren — cada <strong>tramo</strong> es un enlace con su propio protocolo y sus propias reglas, y el <strong>agente de viajes</strong> que armó el itinerario completo es la capa de red. Corolario: <strong>cada enlace del camino puede usar una tecnología distinta</strong> (Ethernet, WiFi, fibra) y el datagrama IP los atraviesa a todos sin cambiar.</span>`,
      },
      {
        title: 'Detección y corrección de errores',
        widget: 'crc-detail',
        html: `
<p>Los bits se corrompen por interferencia, atenuación y ruido. Hay <strong>tres técnicas</strong>, de menor a mayor potencia, y la clave es entender el <strong>compromiso</strong>: más bits de redundancia = más capacidad de detección, pero menos ancho de banda útil.</p>
<span class="warn">Ninguna es infalible: <strong>siempre puede haber errores no detectados</strong> (si el patrón de error transforma una palabra válida en otra válida). Se busca hacer esa probabilidad despreciable, no cero.</span>
<h4>1 · Paridad</h4>
<ul>
<li><strong>Un solo bit</strong>: se agrega un bit para que la cantidad total de unos sea par (o impar). Detecta cualquier cantidad <strong>impar</strong> de errores… pero <strong>se le escapan los pares</strong> (dos bits dados vuelta se cancelan). Muy débil, y las ráfagas suelen afectar varios bits juntos.</li>
<li><strong>Paridad bidimensional</strong>: los datos se acomodan en una matriz y se calcula paridad <strong>por fila y por columna</strong>. Lo interesante es que no solo <strong>detecta</strong> sino que <strong>CORRIGE un error simple</strong>: la fila con paridad mala y la columna con paridad mala <strong>se cruzan exactamente en el bit culpable</strong>, y basta con darlo vuelta. Es el germen de la idea de <strong>FEC</strong> (Forward Error Correction): corregir en el receptor <strong>sin pedir retransmisión</strong> — valiosísimo cuando retransmitir es caro (enlaces satelitales, inalámbricos).</li>
</ul>
<h4>2 · Checksum</h4>
<p>Se suman las palabras de 16 bits en <strong>complemento a 1</strong> y se manda el complemento del resultado. Es <strong>barato de calcular en software</strong>, y por eso se usa en la <strong>capa de transporte</strong> (TCP/UDP), que corre en el host. Su debilidad: es <strong>flojo ante ráfagas</strong> de errores.</p>
<span class="tip">Por qué transporte usa checksum y enlace usa CRC: la capa de enlace vive en <strong>hardware dedicado</strong> (la NIC), donde un CRC sale prácticamente gratis; la de transporte vive en <strong>software</strong>, donde el CRC costaría CPU. Cada capa eligió <strong>lo que le convenía según dónde se implementa</strong>.</span>
<h4>3 · CRC (el estándar de la capa de enlace)</h4>
<p>Es <strong>mucho más potente</strong> y se implementa en hardware con unas pocas compuertas. La idea:</p>
<ul>
<li>Los bits de datos <strong>D</strong> se interpretan como los coeficientes de un <strong>polinomio</strong>.</li>
<li>Emisor y receptor acuerdan de antemano un <strong>generador G</strong> de <strong>r+1 bits</strong>.</li>
<li>El emisor calcula <strong>R</strong> (de r bits) tal que <span class="formula">D·2^r XOR R</span> sea <strong>exactamente divisible por G</strong>, y transmite eso: los datos con R pegado atrás.</li>
<li>Toda la aritmética es <strong>módulo 2</strong>: sumar y restar son lo mismo, y son simplemente <strong>XOR</strong> (sin acarreos). Por eso es tan barato en hardware.</li>
<li>El receptor divide lo recibido por G: si el <strong>resto es 0</strong>, está bien; si <strong>≠ 0</strong>, hubo error.</li>
</ul>
<p><strong>Su potencia</strong>: un CRC de r bits <strong>detecta TODA ráfaga de errores de longitud ≤ r</strong> — y las ráfagas son justamente el modo de falla típico de los enlaces reales. Ethernet usa <strong>CRC-32</strong> (r = 32), que detecta cualquier ráfaga de hasta 32 bits y falla en detectar el resto con probabilidad ínfima.</p>
<p><strong>Mini ejemplo</strong>: con <strong>D = 101110</strong> y <strong>G = 1001</strong> (r = 3) se obtiene <strong>R = 011</strong>, así que se transmite <code>101110<strong>011</strong></code>. El receptor divide por G, le da <strong>resto 0</strong> y acepta la trama.</p>`,
      },
      {
        title: 'Acceso múltiple: 3 familias',
        widget: 'mac-detail',
        html: `
<p>En un canal <strong>broadcast/compartido</strong>, dos transmisiones simultáneas = <strong>colisión</strong>. El protocolo de acceso se coordina por el propio canal. Ideal: con M activos, R/M para cada uno, descentralizado.</p>
<ul>
<li><strong>Particionado</strong>: TDMA (slots) / FDMA (bandas). Justo a carga alta, <strong>desperdicia</strong> a carga baja.</li>
<li><strong>Aleatorio</strong>: <strong>slotted ALOHA</strong> (eficiencia máx <strong>1/e ≈ 37%</strong>; puro ≈ 18%) · <strong>CSMA</strong> (escuchar antes de hablar — pero el d_prop igual causa colisiones) · <strong>CSMA/CD</strong> (Ethernet clásica: escuchar MIENTRAS se habla, abortar al detectar colisión, <strong>backoff exponencial binario</strong>: K ∈ {0…2ⁿ−1} × 512 tiempos de bit. Eficiencia <span class="formula">1/(1 + 5·d_prop/d_trans)</span>) · <strong>CSMA/CA</strong> (WiFi: evitar, no detectar).</li>
<li><strong>Por turnos</strong>: polling (maestro que invita — overhead y punto único de falla) / token passing (testigo que circula).</li>
</ul>
<p><strong>DOCSIS</strong> (cable) mezcla las tres: FDM bajada/subida + minislots asignados por el CMTS (reserva) + pedidos en ventanas de contención (aleatorio).</p>`,
      },
      {
        title: 'CSMA/CD: colisión y backoff en Ethernet',
        widget: 'csmacd-detail',
        html: `
<p><strong>CSMA/CD</strong> (Ethernet clásica de bus): <strong>escuchar antes de hablar</strong> (carrier sense) y <strong>escuchar MIENTRAS se habla</strong> (collision detection). Al detectar una colisión, <strong>abortar</strong> de inmediato (no desperdiciar el resto de la trama), mandar una señal de <strong>jam</strong> y reintentar.</p>
<p>¿Por qué igual hay colisiones si escuchan antes? Por el <strong>retardo de propagación</strong>: B puede empezar a transmitir antes de que le llegue la señal de que A ya estaba. Cuanto mayor el d_prop, peor.</p>
<p><strong>Backoff exponencial binario</strong>: tras la n-ésima colisión de esa trama, se elige K uniforme en <span class="formula">{0, 1, …, 2^min(n,10) − 1}</span> y se espera K·512 tiempos de bit. Más colisiones → esperas potencialmente más largas: el protocolo "siente" la carga. Tras 16 intentos, se abandona la trama.</p>
<p>Eficiencia asintótica: <span class="formula">1 / (1 + 5·d_prop/d_trans)</span> — mejora con tramas grandes (d_trans grande) y redes cortas (d_prop chico). En wireless <strong>no se puede detectar</strong> mientras se transmite → WiFi usa CSMA/<strong>CA</strong> (avoidance).</p>`,
      },
      {
        title: 'MAC, ARP y el viaje fuera de la subred',
        widget: 'arp-detail',
        html: `
<p><strong>Dirección MAC</strong>: <strong>48 bits</strong>, <strong>plana</strong> (sin jerarquía), grabada en la <strong>NIC</strong> de fábrica, con unicidad global administrada por el <strong>IEEE</strong>. Sirve para entregar tramas <strong>dentro de un mismo enlace</strong>. La de broadcast es <code>FF:FF:FF:FF:FF:FF</code>.</p>
<span class="tip">La analogía que cierra el tema: <strong>IP = dirección postal</strong> (jerárquica, cambia si te mudás, es lo que permite <em>rutear</em>) · <strong>MAC = DNI</strong> (plana, fija, te identifica estés donde estés). Se necesitan <strong>las dos</strong>, y por eso hace falta algo que las traduzca: <strong>ARP</strong>.</span>

<h4>¿Por qué hacen falta las dos direcciones?</h4>
<p>Podría preguntarte por qué no alcanza con una sola. Con <strong>solo MAC</strong>: como son planas, un router debería tener una entrada por <em>cada</em> placa de red del mundo — no escala. Con <strong>solo IP</strong>: la NIC necesita un identificador que <strong>no dependa</strong> de en qué red está enchufada (si no, no podrías arrancar una máquina sin IP configurada, ni correr DHCP, ni tener protocolos de capa 2 que no sean IP). Las capas están <strong>desacopladas</strong> a propósito.</p>

<h4>ARP: traducir IP → MAC, solo en la subred local</h4>
<p><strong>ARP</strong> resuelve la MAC correspondiente a una IP <strong>de la misma subred</strong>. Funcionamiento:</p>
<ul>
<li>El host manda una <strong>ARP query en broadcast</strong> (destino <code>FF:FF:FF:FF:FF:FF</code>) preguntando "¿quién tiene la IP tal?". <strong>La reciben todos</strong> los de la subred.</li>
<li>Solo el dueño de esa IP contesta, con una <strong>ARP reply en unicast</strong> que lleva su MAC.</li>
<li>El resultado se guarda en la <strong>tabla ARP</strong> (caché) con un <strong>TTL</strong> de ~20 minutos, para no preguntar cada vez.</li>
</ul>
<p>Es <strong>plug-and-play</strong>: nadie configura nada, las tablas se arman solas y se vencen solas. Y vive justo en la <strong>costura entre capa 2 y capa 3</strong> — por eso a veces se lo llama "capa 2.5".</p>
<span class="warn"><strong>ARP NUNCA se usa para una IP fuera de tu subred.</strong> Si el destino está afuera, no preguntás por la MAC del destino final (nadie te contestaría: el broadcast no sale de la subred). Preguntás por la MAC de <strong>tu default gateway</strong>. Confundir esto es el error clásico.</span>

<h4>El viaje paso a paso: A → B en OTRA subred</h4>
<p>El recorrido completo que se pide en el oral. <strong>A</strong> (111.111.111.111) le manda a <strong>B</strong> (222.222.222.222), y en el medio está el router <strong>R</strong> con dos interfaces: <em>1</em> en la subred de A y <em>2</em> en la de B.</p>
<ol>
<li><strong>A decide si el destino es local</strong>: aplica su <strong>máscara de subred</strong> a la IP destino y la compara con su propia subred. No coinciden → <strong>el destino está afuera</strong> → hay que mandárselo al <strong>default gateway</strong>.</li>
<li><strong>A hace ARP por la IP del gateway</strong> (la interfaz 1 de R), <strong>no</strong> por la de B. Obtiene la MAC de R.</li>
<li><strong>A arma la trama</strong> — y acá está el punto fino: <strong>MAC destino = MAC del router</strong>, pero <strong>IP destino = la de B</strong> (la final). La trama va al router; el datagrama va a B.</li>
<li><strong>R recibe la trama</strong> porque lleva su MAC, la <strong>desencapsula</strong> y se queda con el datagrama IP.</li>
<li><strong>R consulta su tabla de reenvío</strong> con la IP de B → tiene que salir por la <strong>interfaz 2</strong>. Decrementa el <strong>TTL</strong> y recalcula el <strong>checksum del header</strong>.</li>
<li><strong>R hace ARP por la IP de B</strong> en la subred 2 (o ya la tiene cacheada) y obtiene la MAC de B.</li>
<li><strong>R arma una trama NUEVA</strong>: <strong>MAC origen = su interfaz 2</strong>, <strong>MAC destino = MAC de B</strong>. El datagrama IP de adentro <strong>es el mismo</strong>.</li>
<li><strong>B la recibe</strong>, desencapsula y entrega el datagrama a su capa de red.</li>
</ol>
<span class="tip"><strong>La conclusión que buscan escuchar</strong>: las direcciones <strong>MAC cambian en CADA salto</strong> (son de alcance local, identifican los extremos de <em>ese</em> enlace), mientras que las <strong>IP de origen y destino NO cambian nunca</strong> en todo el trayecto (salvo que haya NAT). Por eso se dice que <strong>enlace es salto a salto</strong> y <strong>red es punta a punta</strong>. Si te preguntan "¿cuántas tramas distintas hubo?": <strong>una por enlace</strong>. ¿Y datagramas? <strong>Uno solo</strong>, viajando adentro de cada una.</span>

<h4>Cuando el destino SÍ está en la subred</h4>
<p>Mucho más corto: A verifica con la máscara que B es local, hace <strong>ARP directamente por la IP de B</strong>, y arma <strong>una sola trama</strong> con la MAC de B. <strong>El router no participa</strong>.</p>

<h4>El lado oscuro de ARP</h4>
<p>ARP <strong>no tiene ninguna autenticación</strong>: cualquiera puede responder una query, o mandar respuestas <em>no solicitadas</em> (<strong>gratuitous ARP</strong>) que los demás guardan en su caché. De ahí sale el <strong>ARP spoofing / poisoning</strong>: el atacante envenena la tabla ARP de la víctima diciendo "la MAC del gateway soy yo", y todo el tráfico empieza a pasar por él → <strong>MITM</strong> en la LAN. En <strong>IPv6 no existe ARP</strong>: lo reemplaza <strong>Neighbor Discovery</strong>, que va sobre ICMPv6.</p>`,
      },
      {
        title: 'Ethernet',
        html: `
<p>La tecnología de LAN cableada que <strong>ganó</strong>: barata, simple y con un formato de trama que sobrevivió intacto 40 años mientras la velocidad se multiplicaba por 10.000.</p>
<h4>La trama, campo por campo</h4>
<ul>
<li><strong>Preámbulo</strong> (8 bytes) — 7 bytes de <code>10101010</code> más uno de <code>10101011</code>. Sirve para <strong>sincronizar los relojes</strong> del emisor y el receptor: los relojes nunca son idénticos, y esa secuencia alternada le permite al receptor "engancharse" antes de que empiecen los datos de verdad. Los dos 1 finales avisan que arranca la trama.</li>
<li><strong>MAC destino</strong> (6) y <strong>MAC origen</strong> (6).</li>
<li><strong>Tipo</strong> (2) — qué protocolo de capa superior viaja adentro: <code>0x0800</code> = IPv4, <code>0x0806</code> = ARP, <code>0x86DD</code> = IPv6. Es el equivalente en capa 2 del campo <em>protocol</em> de IP: <strong>el pegamento que permite desmultiplexar hacia arriba</strong>.</li>
<li><strong>Payload</strong> (46–1500) — el máximo, <strong>1500 bytes, es el MTU de Ethernet</strong>, y de ahí sale toda la historia de la fragmentación IP. ¿Y el mínimo de 46? Si el datagrama es más chico, se <strong>rellena (padding)</strong>: el mínimo existe para que la trama dure lo suficiente como para que <strong>CSMA/CD pueda detectar una colisión</strong> antes de que el emisor termine de transmitir.</li>
<li><strong>CRC</strong> (4) — CRC-32. Si no da, la trama <strong>se descarta</strong>.</li>
</ul>
<h4>El servicio que da</h4>
<p><strong>No confiable y sin conexión</strong>: no hay handshake previo y <strong>no hay ACKs</strong>. Si el CRC falla, la trama se descarta <strong>en silencio</strong> — el emisor ni se entera. Recuperar eso es problema de <strong>TCP</strong> más arriba (y si arriba hay UDP, el dato simplemente se perdió). Esa decisión es lo que la hace <strong>simple y barata</strong>.</p>
<h4>La evolución (y por qué desapareció CSMA/CD)</h4>
<ul>
<li><strong>Bus coaxil</strong>: todos colgados del mismo cable, un único <strong>dominio de colisión</strong> → hacía falta <strong>CSMA/CD</strong>.</li>
<li><strong>Hub</strong>: topología de estrella, pero el hub es un simple <strong>repetidor</strong> de capa 1 — retransmite los bits por todos los puertos. Sigue habiendo <strong>un solo dominio de colisión</strong>; solo cambió el cableado.</li>
<li><strong>Switch</strong>: cada puerto es un enlace <strong>dedicado y full-duplex</strong> con un solo host. Emisor y receptor pueden transmitir a la vez y <strong>ya no hay con quién colisionar</strong> → <strong>CSMA/CD dejó de ser necesario</strong>. Cada puerto es su propio dominio de colisión.</li>
</ul>
<span class="tip">Que las velocidades escalaran de <strong>10 Mbps a 100 Gbps manteniendo el mismo formato de trama</strong> es la razón de su longevidad: cambiás la capa física sin tocar nada de lo de arriba. Y ojo con la pregunta capciosa: <strong>en una LAN moderna con switches NO hay colisiones ni se usa CSMA/CD</strong> — está en el estándar por compatibilidad histórica.</span>`,
      },
      {
        title: 'Switches de capa 2',
        widget: 'switch-detail',
        html: `
<p>Tres propiedades que lo definen: es <strong>transparente</strong> (los hosts no saben que existe — no tiene dirección propia ni nadie le manda tramas <em>a él</em>), <strong>plug-and-play</strong> (no se configura nada) y <strong>self-learning</strong> (arma sus tablas solo).</p>
<h4>Cómo aprende</h4>
<p>Mantiene una <strong>tabla de conmutación</strong> con entradas <strong>(MAC, interfaz, timestamp)</strong>. Cada vez que llega una trama, mira la <strong>MAC ORIGEN</strong> y anota "esta MAC está del lado de esta interfaz". Es decir: <strong>aprende de lo que pasa, no de lo que le preguntan</strong>. Las entradas tienen <strong>aging</strong>: si esa MAC no se ve por un tiempo, la entrada se borra (por si el equipo se movió de puerto o se desconectó).</p>
<h4>Cómo reenvía: los 3 casos</h4>
<ul>
<li>La <strong>MAC destino está en la tabla</strong>, asociada a <strong>otra</strong> interfaz → reenvía <strong>solo por esa</strong> (<em>forwarding</em>). Este es el caso bueno: el tráfico no molesta al resto.</li>
<li>La MAC destino está en la tabla asociada a la <strong>MISMA interfaz por la que llegó</strong> → <strong>descarta</strong> (<em>filtering</em>). El destino está del mismo lado que el origen, así que ya se escucharon directamente; reenviarla sería duplicarla.</li>
<li><strong>No está en la tabla</strong> (o es broadcast) → <strong>flooding</strong>: la manda por <strong>todas</strong> las interfaces menos la de entrada. Es la única opción razonable: no sabe dónde está, así que prueba en todos lados. Y de la respuesta, <strong>aprende</strong>.</li>
</ul>
<p>Como cada puerto es un enlace dedicado y full-duplex, los switches además hacen <strong>buffering</strong> (si dos puertos quieren mandar al mismo, se encola) y permiten que <strong>puertos distintos transmitan en paralelo</strong>.</p>
<h4>Switch vs router — la comparación clásica</h4>
<ul>
<li><strong>Capa</strong>: switch = <strong>2</strong> (mira MACs) · router = <strong>3</strong> (mira IPs).</li>
<li><strong>Direccionamiento</strong>: switch = <strong>plano</strong> · router = <strong>jerárquico</strong> (prefijos, agregación).</li>
<li><strong>Configuración</strong>: switch = <strong>plug-and-play</strong>, se autoconfigura · router = requiere configuración y protocolos de ruteo.</li>
<li><strong>Broadcast</strong>: el switch <strong>NO aísla dominios de broadcast</strong> — un ARP inunda <em>toda</em> la LAN, y en redes grandes puede haber <strong>tormentas de broadcast</strong>. El router <strong>SÍ los aísla</strong>: no reenvía broadcasts.</li>
<li><strong>Topología</strong>: el switch necesita un árbol sin ciclos (por eso existe <strong>Spanning Tree</strong>: un ciclo haría que las tramas flooded circulen para siempre, porque <strong>en capa 2 no hay TTL</strong>). El router banca ciclos sin problema.</li>
<li><strong>Velocidad</strong>: el switch es más rápido y barato por puerto (procesamiento más simple).</li>
</ul>
<span class="tip">Por qué se usan <strong>los dos</strong>: switches para armar LANs baratas y rápidas, routers para <strong>partir la red en dominios de broadcast</strong> y conectar tecnologías distintas. La regla práctica: <strong>una subred IP = un dominio de broadcast</strong>, y quien pone el límite es el router (o una VLAN).</span>`,
      },
      {
        title: 'VLANs',
        html: `
<h4>Los tres problemas que resuelven</h4>
<ul>
<li><strong>Un único dominio de broadcast</strong>: sin VLANs, toda la organización comparte los broadcasts. Cada ARP de cualquiera <strong>molesta a todos</strong>, y una tormenta afecta a la empresa entera.</li>
<li><strong>Sin aislamiento</strong>: cualquiera puede escuchar tráfico broadcast de cualquier área. Que Ingeniería y Contaduría estén en el mismo segmento es un problema de <strong>seguridad</strong>.</li>
<li><strong>Rigidez física</strong>: si alguien cambia de sector, hay que <strong>recablear</strong> — la topología lógica está atada a dónde está enchufado el cable.</li>
</ul>
<h4>Qué es una VLAN</h4>
<p>Una <strong>VLAN</strong> parte un switch físico en varias <strong>LANs lógicas</strong>: se define por configuración qué puertos pertenecen a cada una, y <strong>cada VLAN es su propio dominio de broadcast</strong>. Un broadcast en la VLAN de Ingeniería <strong>no sale</strong> hacia los puertos de Contaduría, aunque estén en el mismo aparato. Y mover a alguien de sector es <strong>reconfigurar un puerto</strong>, no tirar cable nuevo.</p>
<p>Como cada VLAN es una red distinta, <strong>para que dos VLANs se hablen hay que RUTEAR</strong> — con un router, o con un switch de capa 3. Es exactamente la misma regla de antes: <strong>cruzar un dominio de broadcast requiere capa 3</strong>.</p>
<h4>Trunking 802.1Q</h4>
<p>¿Y si las VLANs abarcan <strong>varios switches</strong>? No se tira un cable por VLAN: se usa un <strong>enlace trunk</strong> que transporta el tráfico de <strong>todas</strong> las VLANs, etiquetando cada trama para saber a cuál pertenece.</p>
<p>El estándar <strong>802.1Q</strong> inserta un <strong>tag de 4 bytes</strong> en la trama Ethernet, entre la MAC origen y el campo tipo. Adentro lleva el <strong>VLAN ID de 12 bits</strong> → <span class="formula">2¹² − 2 = 4094</span> VLANs posibles (el 0 y el 4095 están reservados), más 3 bits de <strong>prioridad</strong>. El tag lo <strong>agrega el switch al entrar</strong> al trunk y lo <strong>quita al salir</strong>: los hosts nunca ven tramas etiquetadas, para ellos es transparente.</p>
<span class="tip">Como la trama etiquetada mide <strong>4 bytes más</strong>, el máximo pasa de 1518 a <strong>1522 bytes</strong> (por eso los equipos hablan de "baby giant frames"). Y para el examen: <strong>VLAN y subred IP suelen ir 1 a 1</strong> — una VLAN = un dominio de broadcast = una subred.</span>`,
      },
      {
        title: 'MPLS',
        html: `
<p><strong>MPLS</strong> (Multi-Protocol Label Switching) reenvía por una <strong>etiqueta de longitud fija de 20 bits</strong>, en vez de por la IP destino. La etiqueta va en un header propio insertado <strong>entre el de enlace y el de red</strong> — por eso se la llama <strong>"capa 2.5"</strong>.</p>
<h4>Cómo funciona</h4>
<ul>
<li>Al <strong>entrar</strong> al dominio MPLS, el router de borde clasifica el paquete y le <strong>pone una etiqueta</strong>.</li>
<li>Los routers internos (<strong>LSR</strong>, Label Switched Routers) reenvían mirando <strong>solo la etiqueta</strong>: buscan en una tabla chica, mandan por la interfaz que dice y <strong>la intercambian</strong> por la que corresponde al siguiente salto (<em>label swapping</em>). <strong>Nunca miran la IP.</strong></li>
<li>El camino completo se llama <strong>LSP</strong> (Label Switched Path) y está <strong>preestablecido</strong>.</li>
<li>Al <strong>salir</strong>, el router de borde quita la etiqueta y el paquete sigue como IP normal.</li>
</ul>
<p>Se puede apilar <strong>varias etiquetas</strong> (label stack), y ahí es donde se arman las VPNs de operador: la de afuera lleva el paquete por el backbone, la de adentro identifica al cliente.</p>
<h4>Por qué nació y por qué sobrevive</h4>
<p>Nació para <strong>acelerar el forwarding</strong>: buscar una etiqueta exacta de 20 bits es mucho más barato que hacer <strong>LPM</strong> sobre una tabla de cientos de miles de prefijos. Ese argumento <strong>hoy ya no vale</strong> — con TCAM el LPM se hace a line speed igual.</p>
<p>Lo que lo mantiene vivo es el <strong>control explícito del camino</strong>, algo que IP no da:</p>
<ul>
<li><strong>Traffic engineering</strong>: mandar el tráfico por una ruta <strong>distinta del camino mínimo</strong> que elegiría el IGP, para balancear carga o esquivar enlaces saturados. Con IP puro no podés: el ruteo siempre te lleva por el costo mínimo.</li>
<li><strong>VPNs de operador</strong>: separar el tráfico de muchos clientes sobre la misma infraestructura, con pilas de etiquetas.</li>
<li><strong>Fast reroute</strong>: tener el camino de backup <strong>precalculado</strong> y saltar a él en <strong>milisegundos</strong> ante una caída — mucho más rápido que esperar a que OSPF/BGP converjan (segundos).</li>
</ul>
<span class="tip">La idea de fondo: MPLS le devuelve a IP algo de <strong>orientado a conexión</strong> (caminos establecidos de antemano, como los circuitos virtuales) sin perder la flexibilidad de IP. Es el mismo espíritu que después retoma <strong>SDN</strong>: querer decidir el camino, no solo el destino.</span>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'wireless',
    title: 'Inalámbrica y Movilidad',
    short: 'Inalámbrica',
    icon: '📶',
    color: '#ec4899',
    layerTag: 'Bloque 6 · Cap. 7',
    tagline: '802.11 a fondo: asociación, CSMA/CA, tramas, movilidad y celulares.',
    topics: [
      {
        title: 'El medio inalámbrico es hostil',
        widget: 'medium-detail',
        html: `
<p>El cable es un medio dócil; el aire, no. Los enemigos:</p>
<ul>
<li><strong>Atenuación</strong>: la señal se debilita con la <strong>distancia</strong> y los obstáculos (paredes). El <strong>fading</strong> es esa pérdida variable.</li>
<li><strong>Interferencia</strong> de otras fuentes en la misma banda (otros WiFi, Bluetooth, microondas).</li>
<li><strong>Multipath</strong>: la señal <strong>rebota</strong> y llega por varios caminos con <strong>distinto retardo</strong> → las copias se superponen desfasadas y se estorban.</li>
<li>La <strong>SNR</strong> (relación señal/ruido) determina la <strong>BER</strong> (probabilidad de error por bit). Es un trade-off: <strong>tasa ↔ potencia/distancia ↔ errores</strong>.</li>
</ul>
<p><strong>Modulación adaptativa</strong> (lo que muestra el diagrama): con SNR alta el emisor mete <strong>muchos bits por símbolo</strong> (64-QAM, tasa alta); al bajar la SNR cae a modulaciones más <strong>robustas y lentas</strong> (16-QAM, BPSK) para no dispararse la BER. Más lejos ⇒ menos velocidad.</p>
<span class="warn">Consecuencia central: en wireless <strong>no se puede hacer CSMA/CD</strong>. Tu propia señal (fortísima) tapa la del otro, y por el <strong>terminal oculto</strong> podés ni enterarte de la colisión. Por eso WiFi EVITA (CA) + ACK en vez de DETECTAR (CD) — eso se ve en el diagrama de más abajo.</span>`,
      },
      {
        title: '802.11: arquitectura, canales y asociación al AP',
        widget: 'assoc-detail',
        html: `
<p><strong>Modo infraestructura</strong> (el normal): los hosts se asocian a un <strong>AP</strong>, y el conjunto <em>AP + hosts asociados</em> se llama <strong>BSS</strong> (Basic Service Set). El <strong>SSID</strong> es el nombre de la red; varios APs pueden compartir SSID para cubrir un edificio. En <strong>modo ad hoc</strong> no hay AP: los hosts se hablan directo entre sí.</p>
<p><strong>Canales</strong>: la banda de <strong>2.4 GHz</strong> se divide en 11 canales que <strong>se solapan</strong> entre sí; por eso solo <strong>1, 6 y 11</strong> son mutuamente <strong>no solapados</strong> — es la terna que se usa para que APs vecinos no se interfieran. Si dos APs cercanos usan el mismo canal, sus BSS compiten por el mismo medio.</p>
<p><strong>Asociarse tiene dos formas de descubrir APs</strong> (el toggle del diagrama):</p>
<ul>
<li><strong>Scanning pasivo</strong>: el host <strong>solo escucha</strong> los <strong>beacons</strong> que cada AP emite periódicamente (con su SSID y MAC). No transmite nada → ahorra batería, pero es <strong>más lento</strong> (hay que esperar el beacon en cada canal).</li>
<li><strong>Scanning activo</strong>: el host <strong>transmite un Probe Request</strong> en broadcast y los APs contestan con <strong>Probe Response</strong>. Descubre <strong>mucho más rápido</strong>, a costa de batería y de ocupar el canal.</li>
</ul>
<p>Después elige el AP (típicamente el de <strong>mayor potencia de señal</strong> — el criterio lo define el SO, no el estándar), manda <strong>Association Request</strong> y recibe <strong>Association Response</strong>. Recién ahí, ya asociado en capa 2, corre <strong>DHCP</strong> para conseguir IP, máscara, gateway y DNS.</p>
<span class="tip">Secuencia completa para el oral: <strong>scanning → (autenticación WPA2/WPA3) → asociación → DHCP</strong>. Asociarse es capa 2; tener IP es capa 3. Son dos cosas distintas y se preguntan por separado.</span>`,
      },
      {
        title: 'Terminal oculto: la colisión invisible y RTS/CTS',
        widget: 'wifi-detail',
        html: `
<h4>Por qué en el aire no se puede hacer CSMA/CD</h4>
<p>Son <strong>dos razones independientes</strong>, y conviene decirlas separadas porque se preguntan así:</p>
<ol>
<li><strong>No podés escuchar mientras transmitís.</strong> La señal que emite tu propia antena es <strong>órdenes de magnitud más fuerte</strong> que la que te llega de otro (la potencia cae con el cuadrado de la distancia). Tu propia transmisión <strong>tapa</strong> cualquier otra cosa: aunque quisieras detectar la colisión, no la oirías. Un transceptor capaz de eso sería carísimo.</li>
<li><strong>El terminal oculto.</strong> Aunque pudieras escuchar, <strong>la colisión no ocurre donde estás vos</strong>: ocurre <strong>en el receptor</strong>. Y como el alcance de radio es limitado, dos emisores pueden no oírse entre sí y aun así estropearse mutuamente la señal en el AP.</li>
</ol>
<h4>El terminal oculto, en concreto</h4>
<p><strong>A y C alcanzan al AP, pero NO se alcanzan entre sí</strong> (sus círculos de cobertura no se tocan). Los dos escuchan el canal, los dos lo encuentran libre — y tienen razón, <em>desde donde están</em> —, los dos transmiten, y las señales <strong>se superponen en el AP</strong>. Las dos tramas se pierden y <strong>ninguno de los dos se entera</strong>. El <em>carrier sense</em> falla porque cada uno mide el canal <strong>en su propia ubicación</strong>, no en la del receptor.</p>
<span class="warn">Existe también el problema <strong>inverso</strong>, el <strong>terminal expuesto</strong>: una estación escucha una transmisión ajena y <strong>se calla de más</strong>, aunque su propio destino estuviera fuera del alcance de esa interferencia y podría haber transmitido sin molestar. Uno causa <strong>colisiones que no se detectan</strong>; el otro, <strong>capacidad desperdiciada</strong>.</span>
<h4>Las dos respuestas de 802.11</h4>
<ul>
<li><strong>ACK explícito de capa 2 en cada trama.</strong> Como no hay detección de colisión, la <strong>ausencia del ACK</strong> es <em>la única</em> señal de que algo salió mal. Por eso WiFi confirma trama por trama, algo que Ethernet no necesita hacer.</li>
<li><strong>RTS/CTS</strong> (opcional), que resuelve el terminal oculto con una idea elegante: <strong>que la reserva la anuncie el AP</strong>, porque el AP <strong>sí llega a todos</strong>.
<ul>
<li>A manda un <strong>RTS</strong> (Request To Send) chiquito pidiendo el canal por X tiempo.</li>
<li>El AP responde <strong>CTS</strong> (Clear To Send) — y <strong>C también lo escucha</strong>, aunque nunca haya oído a A.</li>
<li>C activa su <strong>NAV</strong> (Network Allocation Vector): un contador que dice "el canal está reservado hasta tal momento". Mientras el NAV corre, C <strong>se calla</strong> aunque su portadora indique que el canal está libre.</li>
</ul>
</li>
</ul>
<p>El NAV se alimenta del campo <strong>Duration</strong> de la trama 802.11 (el que aparece en el tema del formato de trama): ahí viaja cuánto va a durar la transmisión. Se lo llama <strong>virtual carrier sensing</strong>, porque es un "canal ocupado" <strong>deducido de la información</strong>, no medido de la señal.</p>
<span class="tip">RTS/CTS agrega <strong>overhead</strong> (dos tramas de control extra por cada envío), por eso es <strong>opcional</strong> y solo conviene para <strong>tramas grandes</strong>: si colisiona un RTS se pierden unos pocos bytes, mientras que si colisionara una trama de datos entera se perdería muchísimo más tiempo de canal. Con tramas chicas el remedio sale más caro que la enfermedad.</span>`,
      },
      {
        title: 'CSMA/CA en el tiempo: DIFS, backoff congelado y SIFS',
        widget: 'csmaca-detail',
        html: `
<p>El protocolo completo, con los tiempos que se preguntan:</p>
<ol>
<li><strong>Carrier sense</strong>: si el canal está <strong>ocupado</strong>, esperar (no interrumpir).</li>
<li>Cuando se libera, esperar un <strong>DIFS</strong> con el canal libre.</li>
<li>Elegir un <strong>backoff aleatorio</strong> y decrementarlo de a un slot. <strong>Aunque el canal esté libre igual se espera</strong>: ese random es lo que <em>evita</em> que dos estaciones que venían esperando arranquen juntas.</li>
<li>Al llegar a <strong>0</strong>, transmitir la trama <strong>entera</strong> (no puede abortar: no detecta colisiones).</li>
<li>El receptor espera un <strong>SIFS</strong> y manda el <strong>ACK</strong>.</li>
</ol>
<span class="warn">👉 <strong>Los dos detalles que más se preguntan.</strong><br>
<strong>(1) El backoff se CONGELA, no se reinicia.</strong> Si mientras contás alguien ocupa el canal, el contador <strong>se guarda</strong> en el valor que iba y retoma después del siguiente DIFS. En Ethernet (CSMA/CD) se sortea de nuevo. Congelarlo da <strong>equidad</strong>: el que ya esperó mucho no vuelve al fondo de la cola.<br>
<strong>(2) SIFS &lt; DIFS, y eso es a propósito.</strong> Como el ACK espera solo un SIFS y cualquier otro tiene que esperar un DIFS (más largo), <strong>el ACK siempre sale primero</strong>: nadie se lo puede pisar. Es prioridad implementada con tiempos.</span>
<p>Si el <strong>ACK no llega</strong>, se asume colisión: se <strong>duplica la ventana de contención</strong> (backoff exponencial, igual que Ethernet) y se reintenta.</p>`,
      },
      {
        title: 'La trama 802.11: por qué tiene 3 direcciones (y no 2)',
        widget: 'frame80211-detail',
        html: `
<p>Pregunta clásica de oral. Ethernet usa <strong>2 direcciones</strong> (destino y origen); 802.11 usa <strong>3</strong> en modo infraestructura. ¿Por qué la de más?</p>
<p>Porque el <strong>AP es un puente</strong> entre dos medios distintos, y hay que responder <em>dos</em> preguntas a la vez: <strong>quién agarra la trama ahora por el aire</strong> y <strong>a quién va del otro lado del AP</strong>:</p>
<ul>
<li><strong>Address 1</strong> — MAC del <strong>receptor inmediato</strong> por radio (el AP, si sube; el host, si baja).</li>
<li><strong>Address 2</strong> — MAC del <strong>transmisor</strong> por radio. Sirve para saber <strong>a quién mandarle el ACK</strong>.</li>
<li><strong>Address 3</strong> — MAC de la <strong>otra punta</strong> (el router de la LAN, o el origen real). <strong>Es la que hace de pegamento</strong>: sin ella el AP no sabría a quién reenviar en el cable, y en la bajada el host creería que todo viene del AP.</li>
<li><strong>Address 4</strong> — solo en <strong>ad hoc</strong> / entre APs de un sistema de distribución. En infraestructura no se usa.</li>
</ul>
<p>Otros campos: <strong>Duration</strong> (cuánto va a durar la transmisión — es lo que alimenta el <strong>NAV</strong> de los demás), <strong>Seq control</strong> (número de secuencia, para detectar duplicados cuando se retransmite por ACK perdido) y <strong>CRC</strong>.</p>
<span class="tip">Dato para no confundirse: se suele decir "la trama 802.11 tiene 4 direcciones" porque el <em>formato</em> las prevé, pero en el <strong>modo infraestructura que usás todos los días van 3</strong>.</span>`,
      },
      {
        title: 'Gestión de la movilidad',
        widget: 'mobility-detail',
        html: `
<p>El problema: un dispositivo se <strong>va de su red</strong> pero quiere seguir recibiendo paquetes dirigidos a su dirección de siempre. Los actores:</p>
<ul>
<li><strong>Home network / home address</strong>: la red y la <strong>IP permanente</strong> del móvil — la que el mundo conoce y nunca cambia.</li>
<li><strong>Foreign network</strong>: la red que está visitando ahora.</li>
<li><strong>COA (care-of address)</strong>: la <strong>IP temporal</strong> que obtiene en la red visitada — dice "dónde está" en este momento.</li>
<li><strong>Home Agent</strong>: entidad en la red hogar que <strong>intercepta</strong> lo que llega a la home address y lo reenvía. <strong>Foreign Agent</strong>: entidad en la red visitada que recibe y <strong>entrega</strong> al móvil.</li>
</ul>
<p>Dos estrategias para hacer llegar los datos (mirá las dos en el diagrama con el toggle):</p>
<ul>
<li><strong>Indirect routing</strong>: el corresponsal escribe a la home address; el <strong>Home Agent lo intercepta y lo tunelea</strong> (encapsula IP-en-IP) hasta la COA. Transparente para el corresponsal, pero la respuesta vuelve directa → ruta asimétrica: el <strong>problema del triángulo</strong> (ineficiente).</li>
<li><strong>Direct routing</strong>: el corresponsal <strong>pregunta la COA una vez</strong> y manda directo a la red visitada. Óptimo, pero más complejo y hay que resolver el <strong>handoff</strong> si el móvil se muda a otra red foránea.</li>
</ul>
<span class="tip"><strong>Mobile IP</strong> estandariza los agentes, el <strong>registro de la COA</strong> y el <strong>tunneling</strong>. Analogía del libro: te mudás y dejás en el correo viejo una orden de <em>reenvío</em> a tu dirección nueva (indirect); o directamente le pasás tu dirección nueva a quien te escribe (direct).</span>`,
      },
      {
        title: 'Redes celulares 4G/5G',
        widget: 'cellular-detail',
        html: `
<h4>Por qué "celular": la idea de las celdas</h4>
<p>El espectro de radio es un recurso <strong>escaso y caro</strong>: no alcanza para darle una frecuencia propia a cada usuario del país. La solución es <strong>geográfica</strong>: se divide el territorio en <strong>celdas</strong>, cada una cubierta por una <strong>estación base</strong> de alcance limitado, y <strong>las mismas frecuencias se REUTILIZAN</strong> en celdas suficientemente alejadas como para no interferirse (<em>frequency reuse</em>).</p>
<p>De ahí sale una consecuencia contraintuitiva pero central: <strong>celdas más chicas = más capacidad total</strong>, porque se reutiliza el espectro más veces. Por eso en zonas densas las antenas están cada pocas cuadras, y por eso <strong>5G</strong> usa muchísimas celdas pequeñas.</p>
<p>Dentro de cada celda hay que repartir el canal entre los usuarios, con las mismas familias de acceso múltiple del capítulo de enlace: <strong>FDMA/TDMA combinados</strong>, y en 3G <strong>CDMA</strong> (cada usuario transmite con un código distinto sobre la misma banda).</p>
<h4>Arquitectura 4G/LTE: el núcleo EPC</h4>
<p><strong>LTE es all-IP</strong>: desde la estación base hacia adentro <strong>todo es IP</strong>, incluso la voz (VoLTE). Y su núcleo (<strong>EPC</strong>) separa explícitamente <strong>control</strong> de <strong>datos</strong> — la misma idea que SDN:</p>
<ul>
<li><strong>UE</strong> (User Equipment) — tu celular.</li>
<li><strong>eNodeB</strong> — la estación base LTE. Es <strong>el único tramo inalámbrico</strong> de toda la cadena; de ahí en adelante es red IP cableada. Hace la radio, el scheduling de usuarios y coordina los handovers.</li>
<li><strong>MME</strong> (Mobility Management Entity) — el <strong>plano de control</strong>. Autentica al usuario consultando la <strong>HSS</strong>, gestiona la movilidad y arma los túneles (<em>bearers</em>) de la sesión. <strong>No toca los datos del usuario</strong>: es puro señalamiento.</li>
<li><strong>HSS</strong> (Home Subscriber Server) — la base de datos de suscriptores: quién sos, qué plan tenés, tus claves de autenticación.</li>
<li><strong>S-GW</strong> (Serving Gateway) — el <strong>ancla</strong> del plano de datos. Es el punto fijo que <strong>sobrevive a los handovers</strong>: cambia la estación base, pero el S-GW sigue siendo el mismo, y por eso la sesión no se corta.</li>
<li><strong>PDN-GW</strong> (Packet Data Network Gateway) — el borde hacia Internet: asigna la IP al dispositivo, hace de gateway y aplica políticas/facturación.</li>
</ul>
<h4>Handover: el problema que WiFi no resuelve</h4>
<p>Mientras te movés, la conexión <strong>pasa de una estación base a otra sin cortarse</strong>. Cómo:</p>
<ol>
<li>El UE <strong>mide</strong> continuamente la señal de su celda y de las vecinas, y le <strong>reporta</strong> a su eNodeB.</li>
<li>Cuando la vecina se ve mejor, el eNodeB actual <strong>decide el handover</strong> y le pasa el <strong>contexto del UE</strong> al eNodeB destino.</li>
<li>La celda destino <strong>se prepara ANTES</strong> de soltar la origen — esta es la clave del "sin corte".</li>
<li>El <strong>S-GW reengancha</strong> el camino de datos hacia la nueva estación base.</li>
</ol>
<span class="tip">El contraste que vale la pena decir: en <strong>WiFi</strong>, cambiar de AP implica <strong>re-asociarse</strong> (y muchas veces pedir IP de nuevo), lo que <strong>corta</strong> las conexiones. La red celular está <strong>diseñada alrededor de la movilidad</strong> desde el principio, y por eso podés ver un video en el subte pasando de antena en antena sin enterarte. Es la diferencia entre movilidad <em>agregada después</em> y movilidad <em>de fábrica</em>.</span>
<h4>De 4G a 5G</h4>
<ul>
<li><strong>Más capacidad</strong>: bandas nuevas, incluyendo <strong>ondas milimétricas</strong> (mucho ancho de banda pero <strong>alcance corto</strong> y poca penetración en paredes → hacen falta muchísimas <em>small cells</em>).</li>
<li><strong>Menor latencia</strong>, apuntando a aplicaciones que no toleran demora (industria, vehículos).</li>
<li><strong>Núcleo por microservicios</strong>: el EPC monolítico se reemplaza por funciones de red virtualizadas — se profundiza la separación control/datos.</li>
<li><strong>Network slicing</strong>: partir la red física en varias <strong>redes virtuales</strong> con garantías distintas (una "rebanada" de baja latencia para autos, otra de mucho ancho de banda para video), sobre la misma infraestructura.</li>
</ul>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'seguridad',
    title: 'Seguridad en Redes',
    short: 'Seguridad',
    icon: '🔐',
    color: '#ef4444',
    layerTag: 'Bloque 7 · Cap. 8',
    tagline: 'Cripto, autenticación, TLS, IPsec, WPA, firewalls.',
    topics: [
      {
        title: 'Las propiedades deseadas',
        widget: 'secprops-detail',
        html: `
<p>"Seguridad" no es una sola cosa: son <strong>cinco propiedades distintas e independientes</strong>, y <strong>cada una se consigue con un mecanismo diferente</strong>.</p>
<ul>
<li><strong>Confidencialidad</strong> — que nadie más lo <em>lea</em>. La ataca el <strong>sniffing</strong>; se consigue con <strong>cifrado</strong>.</li>
<li><strong>Integridad</strong> — que nadie lo <em>modifique</em> sin que se note. La ataca la <strong>alteración en tránsito</strong>; se consigue con <strong>hash + MAC/HMAC</strong>.</li>
<li><strong>Autenticación</strong> — saber <em>con quién</em> estás hablando (de entidad y de origen del mensaje). La atacan la <strong>suplantación, el MITM y el replay</strong>; se consigue con <strong>nonces + firma/MAC + certificados</strong>.</li>
<li><strong>No repudio</strong> — que el emisor no pueda <em>negar</em> después haber enviado. Se consigue <strong>únicamente con firma digital</strong>.</li>
<li><strong>Disponibilidad</strong> — que el servicio siga en pie. La atacan los <strong>DoS/DDoS</strong>; se defiende con <strong>redundancia, filtrado y rate limiting</strong>.</li>
</ul>
<span class="warn"><strong>Las tres confusiones que se preguntan:</strong> <strong>(1)</strong> integridad ≠ confidencialidad — un mensaje puede llegar íntegro pero leído por todos, o cifrado pero alterado; <strong>(2)</strong> <strong>cifrar no autentica</strong>: que el mensaje esté cifrado no prueba quién lo mandó; <strong>(3)</strong> <strong>el HMAC no da no repudio</strong>, porque los dos extremos comparten el secreto y cualquiera de los dos pudo generarlo.</span>`,
      },
      {
        title: 'Amenazas',
        widget: 'mitm-detail',
        html: `
<p><strong>Pasivas</strong> (observan, difíciles de detectar): <strong>sniffing</strong>. <strong>Activas</strong>: <strong>spoofing</strong> (IP origen falsa), <strong>MITM</strong> (se interpone y se hace pasar por cada parte — la amenaza que justifica los certificados), <strong>hijacking</strong> (secuestrar una sesión adivinando secuencias), <strong>replay</strong> (reenviar un mensaje válido grabado — defensa: nonces), <strong>DoS/DDoS</strong> (SYN flood → SYN cookies), <strong>DNS poisoning / pharming</strong>, malware.</p>`,
      },
      {
        title: 'Simétrica, asimétrica e híbrida: el panorama completo',
        widget: 'crypto-detail',
        html: `
<p>Hay <strong>dos familias</strong> de criptografía, con virtudes opuestas — y la respuesta a "¿cuál se usa?" es <strong>las dos, combinadas</strong>.</p>
<p><strong>1 · Simétrica</strong> (AES, 3DES): <strong>una misma clave</strong> cifra y descifra. Es <strong>rapidísima</strong>, ideal para el volumen de datos. Sus dos problemas: <strong>cómo distribuir la clave</strong> a alguien que nunca viste sin que la intercepten, y que <strong>no escala</strong> — para N usuarios que quieran hablar entre sí hacen falta <strong>N(N−1)/2</strong> claves distintas.</p>
<p><strong>2 · Asimétrica</strong> (RSA, Diffie-Hellman, ECC): cada uno tiene un <strong>par de claves</strong> — la <strong>pública</strong> se difunde libremente, la <strong>privada</strong> nunca sale de su dueño. Lo cifrado con una <strong>solo</strong> se abre con la otra. Para <strong>confidencialidad</strong> se cifra con la <strong>pública del receptor</strong> (solo él puede abrirlo). Resuelve la distribución de claves y baja a <strong>2N</strong> claves… pero es <strong>~1000× más lenta</strong>: cifrar un video entero con RSA sería inviable.</p>
<p><strong>3 · Híbrida</strong> ⭐ — lo que se usa de verdad: se aprovecha <strong>cada una para lo que es buena</strong>. La asimétrica <strong>una sola vez</strong>, para ponerse de acuerdo en una <strong>clave de sesión simétrica</strong>; y de ahí en más <strong>AES para todo el tráfico</strong>. Como la clave de sesión es corta, el costo de la asimétrica se paga una vez y no duele.</p>
<span class="tip"><strong>Esto es exactamente TLS/HTTPS</strong> (y SSH, y las VPNs). Además, como la clave de sesión es <strong>distinta por conexión</strong>, romper una no compromete las demás. La autenticidad de la clave pública la garantiza el <strong>certificado</strong>: sin eso, todo el esquema cae por MITM.</span>
<p><strong>RSA</strong> se apoya en que <strong>factorizar el producto de dos primos grandes es inviable</strong> (<span class="formula">c = m^e mod n · m = c^d mod n</span>). <strong>Diffie-Hellman</strong> resuelve otra cosa: permite <strong>acordar una clave compartida sobre un canal inseguro sin transmitirla nunca</strong> (se apoya en la dureza del logaritmo discreto). También es vulnerable a MITM si no se combina con autenticación.</p>`,
      },
      {
        title: 'Modos de cifrado por bloques: ECB vs CBC',
        widget: 'cbc-detail',
        html: `
<p>Un cifrador simétrico como AES trabaja sobre <strong>bloques de tamaño fijo</strong>. Elegir <em>cómo</em> encadenar esos bloques (el <strong>modo de operación</strong>) es tan importante como el algoritmo.</p>
<p><strong>ECB</strong> (Electronic Code Book) es lo obvio: cifrar <strong>cada bloque por separado</strong>, sin relación entre ellos. Tiene una falla grave: <strong>bloques de texto plano iguales producen bloques cifrados iguales</strong> → se <strong>filtra la estructura</strong> del mensaje. El ejemplo canónico es la imagen del pingüino: cifrada con ECB <strong>se sigue reconociendo el dibujo</strong>. El atacante no descifra nada, pero ve qué se repite y dónde.</p>
<p><strong>CBC</strong> (Cipher Block Chaining) lo arregla <strong>encadenando</strong>: cada bloque se mezcla (XOR) con el <strong>cifrado del bloque anterior</strong> antes de cifrarse — <span class="formula">c_i = K(m_i ⊕ c_(i−1))</span> — y el primero se mezcla con un <strong>IV (vector de inicialización) aleatorio</strong> que viaja en claro. Resultado: bloques repetidos dan cifrados distintos, y <strong>el mismo mensaje cifrado dos veces se ve diferente</strong> (porque el IV cambia).</p>
<span class="warn"><strong>NUNCA reusar un IV con la misma clave.</strong> Si el IV se repite vuelven a aparecer los patrones y el cifrado se vuelve atacable: es exactamente <strong>lo que rompió a WEP</strong> (IV de solo 24 bits, que se repetía a las pocas horas de tráfico).</span>`,
      },
      {
        title: 'Autenticación: la escalera ap1.0 → ap5.0',
        widget: 'authproto-detail',
        html: `
<p>El relato más pedido del capítulo: cómo cada intento "obvio" de autenticar se rompe.</p>
<ul>
<li><strong>ap1.0</strong> — "soy Alice": <strong>cualquiera puede decirlo</strong>.</li>
<li><strong>ap2.0</strong> — + su dirección IP: cae con <strong>IP spoofing</strong> (nada impide poner una IP origen falsa).</li>
<li><strong>ap3.0</strong> — + contraseña: cae con <strong>sniffing</strong> (viaja en claro; se escucha una vez y listo).</li>
<li><strong>ap3.1</strong> — contraseña <em>cifrada</em>: <strong>cae igual, por replay</strong>. Y este es el punto fino: Trudy <strong>no necesita descifrar nada</strong> — graba los bytes cifrados tal cual y los <strong>reenvía</strong>. Bob los descifra, dan bien, y la deja pasar.</li>
<li><strong>ap4.0</strong> ✔ — Bob manda un <strong>nonce R</strong> (número aleatorio de un solo uso) y Alice responde <span class="formula">K(R)</span>. Como R <strong>cambia en cada intento</strong>, lo grabado antes ya no sirve.</li>
<li><strong>ap5.0</strong> — la misma idea con <strong>clave pública</strong>: Alice <strong>firma el nonce con su privada</strong> y Bob verifica con la pública. Ventaja: no hace falta un secreto compartido previo. Pero <strong>cae por MITM</strong> si Trudy logra hacerle creer a Bob que <em>su</em> clave pública es la de Alice.</li>
</ul>
<span class="tip">Las dos moralejas: el <strong>nonce</strong> prueba que Alice está <strong>viva y respondiendo AHORA</strong> (mata el replay), y la criptografía de clave pública <strong>siempre necesita certificados</strong> para no caer en MITM. Y la general: <strong>cifrar no es autenticar</strong>.</span>`,
      },
      {
        title: 'Integridad: hash, HMAC, firma digital y PKI',
        widget: 'sign-detail',
        html: `
<p>Cuatro escalones, cada uno tapando el agujero del anterior.</p>
<p><strong>1 · Hash criptográfico</strong> (SHA-256; MD5 y SHA-1 ya inseguros): huella de <strong>tamaño fijo</strong>, de <strong>una sola vía</strong> y resistente a colisiones. Detecta alteraciones… <strong>pero no frente a un atacante</strong>: como el hash es público, Trudy puede cambiar el mensaje <strong>y recalcular la huella</strong>.</p>
<p><strong>2 · MAC / HMAC</strong>: se mezcla el mensaje con un <strong>secreto compartido</strong> antes de hashear. Ahora Trudy no puede fabricar una huella válida → <strong>integridad + autenticación de origen</strong>. <em>Ojo con la sigla: Message Authentication Code ≠ la dirección MAC de capa 2.</em> Su límite: como <strong>los dos extremos comparten el secreto, los dos pueden generarlo</strong> → <strong>no hay no repudio</strong>.</p>
<p><strong>3 · Firma digital</strong>: se calcula el hash del mensaje y se <strong>cifra con la clave PRIVADA del emisor</strong> (al revés que para confidencialidad, que era la pública del receptor). Cualquiera verifica con la pública. Da integridad + autenticación + <strong>NO REPUDIO</strong>, porque <strong>solo el dueño de la privada pudo generarla</strong>. Se firma el <strong>hash</strong> y no el mensaje entero por eficiencia.</p>
<p><strong>4 · Certificados y PKI</strong>: todo lo anterior asume que tenés la <strong>clave pública correcta</strong>. Si Trudy sustituye la clave pública, firma con la suya y le hace creer a Bob que es Alice → <strong>MITM</strong>. Solución: una <strong>CA</strong> verifica la identidad y <strong>firma un certificado X.509</strong> (identidad + clave pública + validez + firma de la CA). El navegador lo valida con la pública de la CA que ya tiene en su <strong>trust store</strong>, siguiendo la <strong>cadena de confianza</strong> hasta una <strong>CA raíz</strong>.</p>
<span class="warn">Dos confusiones que se preguntan: <strong>(1)</strong> ni el HMAC ni la firma <strong>ocultan</strong> el mensaje — dan integridad/autenticación, <strong>no confidencialidad</strong>; para eso hay que cifrar aparte. <strong>(2)</strong> integridad y confidencialidad son <strong>independientes</strong>: una no implica la otra.</span>`,
      },
      {
        title: 'TLS (transporte) → HTTPS',
        widget: 'tls-detail',
        html: `
<p><strong>TLS</strong> es el esquema <strong>híbrido</strong> de la sección anterior, hecho protocolo. Se ubica <strong>entre la aplicación y TCP</strong>: la app le entrega bytes a TLS, TLS los cifra y se los pasa a TCP. Por eso <strong>HTTPS = HTTP sobre TLS</strong>, sin cambiar HTTP en nada — y por eso también lo usan SMTP, IMAP y cualquier otra app.</p>
<h4>Las tres fases</h4>
<ol>
<li><strong>Handshake</strong> — el cliente y el servidor se ponen de acuerdo. El servidor manda su <strong>certificado</strong> (con su clave pública firmada por una CA); el cliente lo <strong>valida contra su trust store</strong>. Recién ahí sabe que está hablando con quien cree.</li>
<li><strong>Derivación de claves</strong> — se acuerda un secreto compartido y de él sale el <strong>Master Secret</strong>.</li>
<li><strong>Transferencia</strong> — todo el tráfico va cifrado con criptografía <strong>simétrica</strong> (rápida), en <em>records</em> con su MAC.</li>
</ol>
<h4>Por qué salen 4 claves y no 1</h4>
<p>Del Master Secret se derivan <strong>cuatro</strong> claves distintas: <strong>una de cifrado y una de MAC, para CADA sentido</strong> de la comunicación. La razón: usar claves separadas para cifrar y para autenticar, y separadas por dirección, <strong>aísla los riesgos</strong> — si una se ve comprometida no cae todo, y se evitan ataques que mezclan mensajes de un sentido con el otro (reflexión).</p>
<h4>Las tres defensas que se preguntan</h4>
<ul>
<li><strong>Nonces</strong> — cliente y servidor aportan cada uno un número aleatorio al handshake, así que <strong>el Master Secret es distinto en cada sesión</strong>. Eso impide el <strong>replay de una sesión entera</strong>: grabar el handshake de ayer no sirve hoy.</li>
<li><strong>Números de secuencia</strong> — van incluidos en el cálculo del MAC de cada record. Impiden el <strong>replay o el reordenamiento DENTRO</strong> de una misma sesión. Y como van en el MAC y no en claro, no se pueden falsear.</li>
<li><strong>close-notify</strong> — un mensaje explícito de cierre, autenticado. Sin él, un atacante podría <strong>cortar la conexión TCP a mitad</strong> y hacerle creer al receptor que el mensaje terminó ahí (<strong>truncation attack</strong>): peligroso si lo que se corta es, por ejemplo, la parte final de una transacción.</li>
</ul>
<h4>TLS 1.3</h4>
<ul>
<li><strong>Handshake en 1-RTT</strong> (contra 2 de TLS 1.2), y <strong>0-RTT</strong> al reconectarse con un servidor ya conocido — se manda dato útil en el primer mensaje. Esto importa muchísimo para la latencia de la web.</li>
<li><strong>Se eliminaron los cifradores viejos y rotos</strong> (RC4, MD5, SHA-1, RSA para intercambio de claves): en vez de "negociar y ojalá elijan bien", directamente <strong>no están disponibles</strong>.</li>
<li><strong>Forward secrecy por defecto</strong>: el intercambio de claves es siempre <strong>Diffie-Hellman efímero</strong>. Consecuencia clave: si mañana alguien roba la clave privada del servidor, <strong>no puede descifrar el tráfico que grabó ayer</strong>, porque las claves de sesión eran temporales y ya no existen.</li>
</ul>
<span class="tip">Conecta con el resto del capítulo: TLS es <strong>híbrido</strong> (asimétrica para acordar, simétrica para el volumen), usa <strong>certificados</strong> para frenar el MITM, <strong>MACs</strong> para integridad y <strong>nonces</strong> contra replay. Es el ejemplo integrador de todo lo anterior.</span>`,
      },
      {
        title: 'IPsec (red) → VPNs',
        widget: 'ipsec-detail',
        html: `
<p>Si TLS protege <strong>una conexión</strong> desde la capa de transporte, <strong>IPsec protege los datagramas en la capa de RED</strong>. La diferencia de altura tiene una consecuencia grande: es <strong>transparente para las aplicaciones</strong> — protege <em>todo</em> el tráfico IP (incluido UDP, ICMP y lo que sea) <strong>sin que las apps tengan que enterarse ni modificarse</strong>.</p>
<h4>Security Associations (SA)</h4>
<p>Antes de mandar nada, los extremos establecen una <strong>SA</strong>: un "contrato" que fija <strong>qué claves y qué algoritmos</strong> se usan. Dos detalles que se preguntan:</p>
<ul>
<li>Las SAs son <strong>UNIDIRECCIONALES</strong>: para una comunicación en ambos sentidos hacen falta <strong>dos</strong>.</li>
<li>Cada una se identifica con un <strong>SPI</strong> (Security Parameter Index), que viaja en el paquete para que el receptor sepa <strong>qué SA aplicar</strong> al descifrarlo.</li>
</ul>
<h4>Los dos modos</h4>
<ul>
<li><strong>Modo transporte</strong> — se protege <strong>solo el payload</strong>; el header IP original queda <strong>visible</strong>. Es el caso <strong>host-a-host</strong>, entre dos máquinas que hablan IPsec directamente.</li>
<li><strong>Modo túnel</strong> — se cifra el <strong>datagrama IP ENTERO</strong> (header incluido) y se lo <strong>encapsula como payload de un datagrama nuevo</strong>. Es el caso de las <strong>VPN gateway-a-gateway</strong>, y tiene una ventaja clave: como el header original va adentro y cifrado, <strong>se ocultan las IPs internas</strong> de ambas redes. Un observador solo ve tráfico entre los dos gateways, sin saber quién habla con quién adentro.</li>
</ul>
<h4>Los dos protocolos</h4>
<ul>
<li><strong>AH</strong> (Authentication Header) — da <strong>integridad y autenticación de origen</strong>, pero <strong>NO confidencialidad</strong>: los datos viajan <strong>en claro</strong>, solo firmados. Casi no se usa.</li>
<li><strong>ESP</strong> (Encapsulating Security Payload) — agrega <strong>confidencialidad</strong> a lo anterior. Es <strong>el que se usa prácticamente siempre</strong>: si vas a montar todo el aparato criptográfico, no tiene mucho sentido dejar los datos legibles.</li>
</ul>
<h4>IKE</h4>
<p>Configurar SAs a mano en cientos de equipos sería inviable. <strong>IKE</strong> (Internet Key Exchange) es el <strong>"handshake" de IPsec</strong>: autentica a las partes (con certificados o secreto compartido) y <strong>negocia automáticamente</strong> las SAs, los algoritmos y las claves — incluyendo su <strong>renovación periódica</strong>. Es el equivalente funcional del handshake de TLS.</p>
<span class="tip"><strong>TLS vs IPsec</strong>, la comparación que cierra el tema: <strong>TLS</strong> va en <strong>transporte</strong>, protege <strong>una aplicación a la vez</strong> (y la app tiene que usarlo explícitamente), pero se despliega sin tocar el sistema operativo. <strong>IPsec</strong> va en <strong>red</strong>, protege <strong>TODO el tráfico de forma transparente</strong>, y por eso es lo que se usa para <strong>VPNs</strong>: conectar dos sucursales o un empleado remoto como si estuvieran en la misma LAN privada.</span>`,
      },
      {
        title: 'WiFi seguro: WEP → WPA2 → WPA3',
        widget: 'wpa-detail',
        html: `
<p>El caso de estudio perfecto del capítulo: una historia de <strong>tres intentos</strong>, donde cada uno cae por un error de diseño distinto y concreto.</p>
<h4>WEP: cómo NO hacerlo</h4>
<p>WEP usaba el cifrador de flujo <strong>RC4</strong> con una clave compartida más un <strong>IV</strong> que viajaba <strong>en claro</strong> en cada trama. Sus fallas:</p>
<ul>
<li><strong>IV de solo 24 bits.</strong> En una red con tráfico, los IVs <strong>se agotan y se repiten en pocas horas</strong>. Y con un cifrador de flujo, <strong>reusar el par (clave, IV) es fatal</strong>: si dos tramas se cifran con el mismo keystream, haciendo XOR entre los dos textos cifrados <strong>la clave se cancela</strong> y queda el XOR de los dos textos planos. Es exactamente la regla de oro que vimos en el tema de modos de cifrado: <strong>nunca reusar un IV con la misma clave</strong>.</li>
<li><strong>Claves cortas</strong> (40 bits en la versión original) y <strong>estáticas</strong>: la misma para todos los usuarios y sin rotación.</li>
<li><strong>Integridad con CRC-32</strong>, que es un checksum <strong>lineal, no criptográfico</strong>: un atacante puede modificar el mensaje y <strong>ajustar el CRC</strong> para que siga dando bien. No era un MAC.</li>
<li><strong>Sin autenticación mutua</strong>: el cliente no verificaba al AP → <strong>rogue AP</strong> trivial.</li>
</ul>
<p>Resultado: hoy se rompe una red WEP en <strong>minutos</strong> con herramientas públicas.</p>
<h4>802.11i / WPA2: las cuatro fases</h4>
<ol>
<li><strong>Descubrimiento</strong> — el AP anuncia su presencia y qué formas de autenticación y cifrado soporta; el cliente elige.</li>
<li><strong>Autenticación mutua y clave maestra (MSK)</strong> — acá se separan las dos variantes:
<ul>
<li><strong>Enterprise</strong>: se autentica con <strong>EAP</strong> contra un <strong>servidor de autenticación (AS)</strong> externo, típicamente RADIUS. Cada usuario tiene <strong>sus propias credenciales</strong>, y el AP solo hace de intermediario. Es <strong>autenticación mutua</strong>: el cliente también verifica al servidor, así que un rogue AP no cuela.</li>
<li><strong>Personal (PSK)</strong>: una <strong>clave precompartida</strong> — la contraseña del WiFi de tu casa.</li>
</ul>
</li>
<li><strong>Four-way handshake</strong> — cliente y AP intercambian <strong>nonces</strong> y de ahí derivan las claves de sesión. Sale una <strong>clave par-a-par (PTK)</strong>, distinta para cada cliente, más una <strong>clave de grupo (GTK)</strong> compartida para el tráfico <strong>broadcast/multicast</strong>. También sirve para <strong>confirmar que ambos conocen la clave maestra</strong> sin transmitirla.</li>
<li><strong>Tráfico cifrado</strong> — con <strong>AES-CCMP</strong> (AES en un modo que da confidencialidad <em>e</em> integridad con un MAC de verdad, no un CRC).</li>
</ol>
<span class="tip">Los dos puntos finos del four-way handshake: <strong>(1)</strong> las claves de sesión son <strong>por cliente y por sesión</strong> — dos dispositivos con la misma contraseña del WiFi <strong>no pueden</strong> descifrarse mutuamente el tráfico; <strong>(2)</strong> la clave maestra <strong>nunca viaja</strong> por el aire: lo que viajan son nonces, y las claves se <em>derivan</em> a los dos lados. Es la misma idea de los nonces de ap4.0.</span>
<h4>KRACK y WPA3</h4>
<p><strong>KRACK</strong> (2017) atacó justamente el <em>four-way handshake</em>: forzando la <strong>retransmisión</strong> de uno de los mensajes, lograba que el cliente <strong>reinstalara una clave ya usada</strong> y <strong>reiniciara su contador de nonces</strong> → volvía a aparecer el reuso de keystream, el mismo pecado de WEP. Lo grave es que era una falla del <strong>protocolo</strong>, no de una implementación.</p>
<p><strong>WPA3</strong> (2018) responde con:</p>
<ul>
<li><strong>SAE</strong> (<em>Simultaneous Authentication of Equals</em>) en lugar del handshake PSK clásico: un intercambio tipo Diffie-Hellman que <strong>elimina el problema de reinstalación</strong> y, sobre todo, hace <strong>inviables los ataques de diccionario offline</strong> — con WPA2, capturando el handshake se podía probar contraseñas sin límite en una máquina propia; con SAE cada intento requiere <strong>interactuar con la red</strong>.</li>
<li><strong>Forward secrecy</strong>: si alguien descubre la contraseña del WiFi mañana, <strong>no puede descifrar el tráfico que grabó ayer</strong>.</li>
<li><strong>Claves más largas</strong> y cifrado (aunque sin autenticar) en <strong>redes abiertas</strong>, para que en un WiFi público el de al lado no lea tu tráfico en claro.</li>
</ul>
<span class="warn">Ojo con el alcance, que se pregunta: WPA/WPA2/WPA3 protegen <strong>solamente el enlace inalámbrico</strong>, entre tu dispositivo y el AP. <strong>De ahí en adelante el tráfico va como siempre</strong>. Por eso <strong>WPA no reemplaza a TLS</strong>: para protección punta a punta hace falta HTTPS igual, y por eso conectarte a un WiFi abierto es riesgoso aunque tenga contraseña.</span>`,
      },
      {
        title: 'Firewalls e IDS/IPS',
        widget: 'firewall-detail',
        html: `
<p>Un <strong>firewall</strong> tiene <strong>tres objetivos</strong> que se preguntan juntos: <strong>(1)</strong> TODO el tráfico entre adentro y afuera pasa por él, <strong>(2)</strong> solo pasa lo autorizado por la política, <strong>(3)</strong> él mismo es <strong>resistente</strong> a ataques (si lo comprometen, no sirvió de nada).</p>
<p><strong>Filtro stateless (de paquetes)</strong>: decide con <strong>reglas fijas sobre los campos del header</strong> — IPs, puertos, protocolo, flags. Evalúa cada paquete <strong>aislado, sin memoria</strong>. Es <strong>rapidísimo</strong>, pero <strong>ciego al contexto</strong>: como para dejar entrar las respuestas web hay que permitir tráfico entrante desde el puerto 80 hacia puertos altos, un atacante puede <strong>forjar un paquete con puerto origen 80 y el flag ACK</strong> y <strong>colarse</strong> aunque nunca haya existido esa conexión (está animado en el diagrama).</p>
<p><strong>Firewall stateful</strong>: mantiene una <strong>tabla de conexiones</strong> y solo deja entrar tráfico que <strong>machea una conexión que la red interna inició</strong>. El mismo paquete forjado de antes <strong>se descarta</strong>, porque no hay entrada que le corresponda. Al cerrarse la conexión (FIN) o vencer por timeout, la entrada se borra. Costo: hay que <strong>mantener estado</strong> (memoria y CPU por conexión).</p>
<p><strong>Application gateway / proxy</strong>: no mira headers sino que <strong>termina la conexión</strong> e inspecciona el <strong>contenido de capa de aplicación</strong>, abriendo él mismo la conexión al destino. Permite políticas <strong>por usuario</strong> y filtrado por contenido; a cambio es más lento y hace falta uno por aplicación.</p>
<p><strong>Arquitectura DMZ</strong>: los servidores públicos (web, mail, DNS) van en una <strong>zona intermedia entre dos firewalls</strong>, no en la red interna. ¿Por qué? Porque son los <strong>más expuestos</strong> — tienen que aceptar conexiones de cualquiera. Si comprometen el servidor web, el atacante queda <strong>atrapado en la DMZ</strong>, con el firewall interno todavía adelante.</p>
<p><strong>IDS vs IPS</strong>: ambos hacen <strong>deep packet inspection</strong> (miran el contenido, no solo headers) y detectan por <strong>firma</strong> (base de ataques conocidos — <em>Snort</em>) o por <strong>anomalía</strong> (desvíos estadísticos del tráfico normal: pescan ataques nuevos, pero con más <strong>falsos positivos</strong>). La diferencia: el <strong>IDS es pasivo</strong> — está al costado y <strong>avisa</strong>; el <strong>IPS está en línea</strong> en el camino del tráfico y <strong>bloquea</strong>. El IPS es más potente pero más riesgoso: un falso positivo <strong>corta tráfico legítimo</strong>.</p>
<span class="tip"><strong>Conclusión del capítulo</strong>: <strong>defense in depth</strong> — ninguna capa alcanza sola. La seguridad es un <strong>proceso continuo</strong>, no un producto; el sistema es tan seguro como su <strong>eslabón más débil</strong>; y siempre hay <strong>trade-off</strong> seguridad / performance / usabilidad.</span>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'integrador',
    title: 'Un día en la vida de una petición web',
    short: 'Integrador',
    icon: '🚀',
    color: '#fbbf24',
    layerTag: 'Bloque 8 · Cap. 6.7',
    tagline: 'El relato estrella del oral: todas las capas en un solo flujo.',
    topics: [
      {
        title: 'El relato que junta todo',
        widget: 'day-detail',
        html: `
<p>Escenario: enchufás una notebook a una red y escribís <code>www.google.com</code>. En 30 segundos de navegación pasa <strong>el programa entero de la materia</strong>. Dale play y seguí cada paso nombrando la capa y el protocolo — eso es lo que impresiona en el oral.</p>`,
      },
      {
        title: 'El checklist del relato (para repasar sin la animación)',
        html: `
<ul>
<li><strong>1. DHCP</strong> (app/UDP): DORA en broadcast → IP + máscara + gateway + DNS.</li>
<li><strong>2. ARP</strong> (enlace): la MAC del gateway (¡no la del destino final!). El switch floodea y aprende.</li>
<li><strong>3. DNS</strong> (app/UDP 53): query al Local; sin caché → root → TLD → authoritative. La CDN elige el server por vos.</li>
<li><strong>4. NAT</strong> (red): reescritura IP:puerto al salir y al volver.</li>
<li><strong>5. TCP</strong> (transporte): three-way handshake, luego confiabilidad + congestión.</li>
<li><strong>6. TLS</strong> (si es HTTPS): certificado → CA raíz, PMS → claves de sesión.</li>
<li><strong>7. HTTP</strong>: GET → 200 OK, y el browser renderiza.</li>
<li><strong>En cada router</strong>: LPM, TTL−1 (ICMP si muere), MACs reescritas — la IP nunca cambia. Rutas pre-armadas por OSPF (intra) y BGP (inter).</li>
</ul>
<span class="tip">Si contás esto de corrido y con seguridad, demostrás que entendés cómo encaja TODO — exactamente lo que un oral integrador busca.</span>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'machete',
    title: 'Machete de puntos de examen',
    short: 'Machete',
    icon: '📌',
    color: '#10b981',
    layerTag: 'Apéndice',
    tagline: 'Los puntos que caen seguro, listos para repasar antes de entrar.',
    topics: [
      {
        title: 'Fundamentos y retardos',
        html: `
<ul>
<li><span class="formula">d_trans = L/R</span> (empujar bits) vs <span class="formula">d_prop = d/s</span> (viaje físico). Ancho de banda vs distancia. No confundir.</li>
<li>Throughput end-to-end = <strong>bottleneck</strong> = min(Ri).</li>
<li>Retardo de <strong>cola</strong> = el único variable → <strong>jitter</strong>. La/R → 1 = colas explotan.</li>
<li>Paquetes = multiplexación estadística, eficiente, sin garantías; circuitos = reserva fija, garantizado pero desperdiciado.</li>
</ul>`,
      },
      {
        title: 'Aplicación',
        html: `
<ul>
<li>HTTP <strong>stateless</strong>; estado = cookies. Conditional GET → <strong>304</strong>. HTTP/2 multiplexación; HTTP/3 sobre QUIC.</li>
<li>SMTP = <strong>push</strong> (25, envío); IMAP/POP = <strong>pull</strong> (lectura).</li>
<li>DNS: UDP/53, root → TLD → authoritative, caching con TTL. Recursiva (host→local) vs iterativa (local→resto). A/AAAA/NS/CNAME/MX.</li>
<li>P2P autoescala (BitTorrent: rarest first + tit-for-tat). CDN: enter-deep vs bring-home, redirección por DNS, anycast.</li>
</ul>`,
      },
      {
        title: 'Transporte',
        html: `
<ul>
<li>TCP demultiplexa por <strong>cuádrupla</strong>; UDP por (IP, puerto) destino.</li>
<li>GBN (ACK acumulativo, 1 timer, retransmite ventana) vs SR (individual, timer por paquete; ventana ≤ mitad del espacio).</li>
<li><span class="formula">Timeout = EstimatedRTT + 4·DevRTT</span>. Karn: no medir retransmitidos; timeout → RTO ×2.</li>
<li>Fast retransmit = <strong>3 ACKs duplicados</strong>.</li>
<li><strong>Tahoe</strong>: toda pérdida → cwnd = 1. <strong>Reno</strong>: 3 dup ACK → mitad (fast recovery); solo timeout → 1.</li>
<li>CUBIC: función cúbica del tiempo (alto BDP). BBR: señal = delay, no pérdida (YouTube/B4).</li>
<li>Flujo (rwnd, receptor) ≠ congestión (cwnd, red). Se manda min(cwnd, rwnd).</li>
<li>Handshake 3 vías; cierre 4 vías + TIME_WAIT. QUIC: UDP + TLS integrado + streams sin HOL.</li>
</ul>`,
      },
      {
        title: 'Red — data plane',
        html: `
<ul>
<li><strong>LPM</strong>: gana el prefijo más largo. CIDR → agregación. Lookup con TCAM.</li>
<li>/x → <span class="formula">2^(32−x)</span> direcciones, −2 útiles.</li>
<li>Reensamblado: <strong>solo en destino</strong>. IPv6 no fragmenta en routers, sin checksum, header fijo 40 B.</li>
<li>NAT desambigua con el <strong>puerto</strong>; rompe end-to-end, viola capas.</li>
<li>DHCP = <strong>DORA</strong> (UDP 67/68): IP + máscara + gateway + DNS.</li>
<li>Buffers: B = RTT·C (o /√N). Bufferbloat → AQM (RED, CoDel).</li>
<li>Scheduling: FIFO, prioridad, RR, <strong>WFQ</strong>.</li>
<li>Match+action (OpenFlow): la misma caja hace de router/switch/firewall/NAT.</li>
</ul>`,
      },
      {
        title: 'Red — control plane',
        html: `
<ul>
<li><strong>LS</strong> (Dijkstra, mapa completo, converge rápido) vs <strong>DV</strong> (Bellman-Ford, vecinos, count-to-infinity → poisoned reverse parcial).</li>
<li>IGP: OSPF (LS) / RIP (DV, máx 15 hops). EGP: <strong>BGP</strong> (TCP/179, políticas).</li>
<li>Orden BGP: <strong>1) local pref · 2) AS-PATH corto · 3) hot-potato · 4) IDs</strong>.</li>
<li>traceroute = TTL + ICMP Time Exceeded; ping = Echo; UDP a puerto cerrado → Port Unreachable. ICMPv6 → Neighbor Discovery (reemplaza ARP).</li>
<li>SDN: packet-in (switch pregunta) / flow-mod (controlador instala). Southbound = OpenFlow; apps por northbound.</li>
</ul>`,
      },
      {
        title: 'Enlace',
        html: `
<ul>
<li>Errores: paridad 1D/2D, CRC (división polinómica). FEC corrige.</li>
<li>Slotted ALOHA ≈ <strong>37%</strong> (1/e); puro ≈ 18%. CSMA/CD: <span class="formula">1/(1 + 5·d_prop/d_trans)</span>; backoff K ∈ {0…2ⁿ−1}·512 bits.</li>
<li>DOCSIS mezcla FDM + reserva + contención.</li>
<li>MAC 48 bits, plana. <strong>IP = postal / MAC = DNI</strong>.</li>
<li>ARP: IP→MAC en la MISMA subred; para salir → MAC del <strong>gateway</strong>.</li>
<li><strong>La IP no cambia; la MAC se reescribe en cada enlace.</strong></li>
<li>Switch: self-learning, filtra/descarta/floodea, NO aísla broadcast (router sí).</li>
<li>VLAN: 802.1Q, ID 12 bits. MPLS: label 20 bits, "capa 2.5", TE + VPN + fast reroute.</li>
</ul>`,
      },
      {
        title: 'Inalámbrica y movilidad',
        html: `
<ul>
<li>WiFi = CSMA/<strong>CA</strong> + ACK explícito + backoff + RTS/CTS (terminal oculto). Trama con 4 direcciones.</li>
<li>Home address (permanente) vs COA (temporal). Indirect (triángulo) vs direct routing. Mobile IP.</li>
<li>LTE all-IP: eNodeB, MME (+HSS), S-GW/PDN-GW. Handover sin corte.</li>
</ul>`,
      },
      {
        title: 'Seguridad',
        html: `
<ul>
<li>Propiedades: confidencialidad · integridad · autenticación · no repudio · disponibilidad.</li>
<li>AES + CBC (IV aleatorio, nunca reusar). RSA (factorizar) / DH (log discreto, MITM sin autenticación).</li>
<li>Confidencialidad: cifrar con la <strong>pública del receptor</strong>. Firma: hash con la <strong>privada del emisor</strong> (no repudio). Todo híbrido en la práctica.</li>
<li>ap4.0: el <strong>nonce</strong> frena el replay.</li>
<li>HMAC = hash + secreto. "MAC" ambiguo: dirección vs Message Authentication Code.</li>
<li>CA/X.509/cadena de confianza frenan el MITM. PGP = firmar y cifrar (web of trust).</li>
<li>Capas: PGP (app) · TLS (transporte) · IPsec (red) · WPA2/3 (enlace).</li>
<li>TLS: PMS → MS → 4 claves; nonces (entre sesiones) + secuencia (dentro); close-notify. 1.3 = 1-RTT + forward secrecy.</li>
<li>IPsec: SA unidireccional (SPI); transporte vs túnel (VPN); AH vs ESP; IKE.</li>
<li>WPA2: four-way handshake (nonces → clave de sesión + grupo). WPA3 corrige KRACK.</li>
<li>Firewall: 3 objetivos; stateless/stateful/proxy; DMZ. IDS avisa / IPS bloquea (Snort; firma vs anomalía).</li>
</ul>`,
      },
    ],
  },

  /* ================================================================ */
  {
    slug: 'quiz',
    title: 'Modo Quiz',
    short: 'Quiz',
    icon: '🎯',
    color: '#ec4899',
    layerTag: 'Autoevaluación',
    tagline: 'Preguntas tipo oral por sección, con las trampas del machete explicadas.',
    topics: [
      {
        title: 'Autoevaluación antes del final',
        widget: 'quiz-detail',
        html: `
<p>Rendí un mini-oral: elegí una <strong>sección</strong> (o "Todas") y respondé. Cada pregunta te dice si acertaste y explica <strong>la trampa</strong> que suele caer. Repetí hasta que las tres patas de cada tema te salgan de memoria.</p>
<span class="tip">Si fallás una, no pases de largo: leé la explicación, y volvé a esa sección del resumen para reforzar el concepto.</span>`,
      },
    ],
  },
];

export function getSection(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}
