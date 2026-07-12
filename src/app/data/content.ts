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
    | 'quiz-detail'; // componentes a medida
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
<ul>
<li><strong>Forwarding (reenvío)</strong>: acción <strong>LOCAL</strong> de un router — llega un paquete, mira la tabla, lo saca por la interfaz correcta. Nanosegundos, hardware, <strong>data plane</strong>.</li>
<li><strong>Routing (enrutamiento)</strong>: proceso <strong>GLOBAL</strong> — determinar el camino end-to-end. Segundos, software, <strong>control plane</strong>.</li>
</ul>
<p>El routing <strong>arma la tabla</strong> que el forwarding después <strong>consulta</strong>.</p>`,
      },
      {
        title: 'Conmutación: paquetes vs circuitos',
        html: `
<p><strong>Circuitos</strong> (telefonía clásica): se <strong>reserva</strong> un camino y recursos de punta a punta (FDM por frecuencia o TDM por slots de tiempo). Garantizado… pero <strong>desperdiciado</strong> cuando no se usa.</p>
<p><strong>Paquetes</strong> (Internet): los datos se parten en paquetes independientes. Cada router hace <strong>store-and-forward</strong> (recibe el paquete completo antes de reenviar). Recursos compartidos on-demand con <strong>multiplexación estadística</strong>: eficiente para tráfico a ráfagas, a cambio de <strong>congestión, colas y pérdidas</strong> posibles.</p>
<p><strong>El argumento cuantitativo clásico</strong>: enlace de 1 Mbps, usuarios de 100 kbps activos el 10% del tiempo. Circuitos: entran <strong>10</strong>. Paquetes: <strong>35</strong>, porque P(más de 10 activos a la vez) ≈ 0,0004. Más del triple de usuarios, sin garantías.</p>`,
      },
      {
        title: 'Los 4 retardos nodales',
        widget: 'delays-detail',
        html: `
<p><span class="formula">d_nodal = d_proc + d_queue + d_trans + d_prop</span></p>
<ul>
<li><strong>d_proc</strong>: examinar header y decidir salida (µs).</li>
<li><strong>d_queue</strong>: espera en el buffer. El <strong>único variable</strong> → causa del <strong>jitter</strong>. Se caracteriza con la intensidad de tráfico <span class="formula">La/R</span>: si → 1, la cola explota de forma no lineal.</li>
<li><strong>d_trans = L/R</strong>: empujar los L bits al enlace. Depende del <strong>tamaño</strong> y del <strong>ancho de banda</strong>.</li>
<li><strong>d_prop = d/s</strong>: viaje físico de un bit. Depende de la <strong>distancia</strong> (~2×10⁸ m/s), NO del ancho de banda.</li>
</ul>
<span class="warn">d_trans vs d_prop es LA confusión típica. Un enlace satelital: muchísimos bits/s (d_trans chico) pero cada bit tarda ~250 ms (d_prop enorme). Autopista ancha ≠ autopista corta.</span>
<p><strong>Pérdida</strong>: si el buffer está lleno, el paquete se descarta — y TCP, desde los extremos, lo repone.</p>`,
      },
      {
        title: 'Métricas y herramientas',
        html: `
<ul>
<li><strong>RTT</strong>: ida y vuelta. Se mide con <code>ping</code> (ICMP Echo).</li>
<li><strong>Throughput</strong>: tasa efectiva. En un camino, lo fija el <strong>cuello de botella</strong>: <span class="formula">min(R1, ..., Rn)</span>. Hoy el cuello suele estar en el acceso, no en el core.</li>
<li><strong>Jitter</strong>: variación de latencia (por el retardo de cola). Crítico en tiempo real; se compensa con <strong>playout buffer</strong>.</li>
<li><strong>Packet loss</strong>: fracción descartada por buffers llenos.</li>
</ul>
<p>Herramientas de la materia: <code>ping</code>, <code>traceroute</code> (TTL + ICMP), <code>dig</code>/<code>nslookup</code>, <code>whois</code> y <strong>Wireshark</strong>.</p>`,
      },
      {
        title: 'Modelo de capas y encapsulamiento',
        widget: 'encap',
        html: `
<p>Internet: <strong>5 capas</strong> — Aplicación, Transporte, Red, Enlace, Física. OSI agrega <strong>Presentación</strong> (cifrado, compresión — hoy la absorbe la aplicación, ej. TLS) y <strong>Sesión</strong>. La idea de fondo es <strong>modularidad</strong>: cambiás de cable a WiFi sin tocar TCP ni HTTP. Costo: redundancias (checksums repetidos) y violaciones (NAT).</p>
<p><strong>Encapsulamiento</strong> — los nombres se preguntan:</p>
<ul>
<li>Aplicación → <strong>mensaje</strong></li>
<li>Transporte → <strong>segmento</strong> (header con puertos)</li>
<li>Red → <strong>datagrama</strong> (header con IPs)</li>
<li>Enlace → <strong>trama</strong> (header con MACs + trailer CRC)</li>
<li>Física → <strong>bits</strong></li>
</ul>
<span class="tip">Regla de oro: los <strong>hosts</strong> implementan las 5 capas; los <strong>routers</strong> hasta la 3 (necesitan la IP); los <strong>switches</strong> hasta la 2 (solo miran MACs).</span>`,
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
<p><strong>Cliente-servidor</strong>: server siempre encendido, IP fija, en datacenters. Los clientes nunca se hablan entre sí. Limitación: un solo server no escala → datacenters y CDNs.</p>
<p><strong>P2P</strong>: los peers se comunican directamente. Propiedad estrella: <strong>autoescalabilidad</strong> — cada peer aporta demanda pero también capacidad. Contras: gestión, seguridad, ISPs asimétricos. Muchas apps reales son híbridas (tracker central + intercambio P2P).</p>`,
      },
      {
        title: 'Procesos, sockets y puertos',
        html: `
<p>No se comunican "las máquinas": se comunican <strong>procesos</strong>, a través de un <strong>socket</strong> (la puerta entre la app y el transporte). Siempre hay un proceso <strong>cliente</strong> (inicia) y uno <strong>servidor</strong> (espera) — incluso en P2P, por sesión.</p>
<p>Para identificar el destino: <strong>IP</strong> (ubica el host) + <strong>puerto</strong> (identifica el proceso). Well-known que hay que saber: <strong>HTTP 80 · HTTPS 443 · DNS 53 · SMTP 25 · DHCP 67/68 · BGP 179</strong>.</p>
<p><strong>Qué puede pedir una app al transporte</strong>: confiabilidad, throughput, timing, seguridad. Apps <strong>elásticas</strong> (web, mail): confiabilidad total, toleran demora. Apps de <strong>tiempo real</strong> (VoIP, juegos): toleran pérdidas, odian la demora. Internet no garantiza throughput ni timing: TCP da confiabilidad; UDP casi nada (y por eso sirve); la seguridad la agrega <strong>TLS</strong>.</p>`,
      },
      {
        title: 'HTTP: el protocolo de la Web',
        html: `
<p>Una página = conjunto de <strong>objetos</strong> (HTML base + imágenes, CSS, JS), cada uno con su URL. HTTP corre sobre <strong>TCP</strong> (80; HTTPS 443) y es <strong>STATELESS</strong>: el server no recuerda requests anteriores — simple y escalable, pero necesita cookies para tener estado.</p>
<p><strong>No persistente</strong> (HTTP/1.0): una conexión TCP nueva <strong>por objeto</strong> → mínimo <strong>2 RTT por objeto</strong> (handshake + request/response). <strong>Persistente</strong> (HTTP/1.1): una misma conexión para varios objetos; con pipelining, requests seguidos sin esperar.</p>
<p><strong>Request</strong>: método + URL + versión, y headers (<code>Host:</code> imprescindible — un server aloja muchos dominios —, <code>User-agent:</code>, <code>Connection:</code>). Métodos: <strong>GET</strong>, <strong>POST</strong> (datos en el cuerpo), <strong>HEAD</strong> (solo headers), PUT, DELETE.</p>
<p><strong>Códigos</strong>: <strong>200 OK · 301 Moved Permanently · 304 Not Modified · 400 Bad Request · 404 Not Found · 505</strong>.</p>`,
      },
      {
        title: 'Cookies y web caching',
        html: `
<p><strong>Cookies</strong> (estado sobre un protocolo stateless), 4 componentes: header <code>Set-cookie:</code> en la respuesta, header <code>Cookie:</code> en los requests siguientes, archivo en el host del usuario, base de datos backend. Permiten carritos, login persistente… y tracking (privacidad).</p>
<p><strong>Web cache (proxy)</strong>: guarda copias y responde en nombre del origin — es <strong>servidor para el browser y cliente para el origin</strong>. Reduce tiempo de respuesta y tráfico del enlace de acceso (hit rates 0,2–0,7). Con el enlace al 100% de intensidad las demoras explotan; un cache con 40% de hits la baja a ~0,6 → milisegundos, mucho más barato que agrandar el enlace.</p>
<p><strong>Conditional GET</strong>: el cache manda <code>If-Modified-Since:</code>; si no cambió, el server responde <strong>304 Not Modified sin cuerpo</strong>.</p>`,
      },
      {
        title: 'HTTP/2 y HTTP/3',
        html: `
<p><strong>HTTP/2</strong>: mismos métodos y códigos, distinto transporte interno. En 1.1 un objeto grande al frente bloquea a los chicos (<strong>head-of-line blocking</strong>). HTTP/2: <strong>framing binario</strong> — los mensajes se parten en frames que se <strong>intercalan</strong> sobre UNA conexión TCP —, priorización de streams y <strong>server push</strong>. Problema restante: el HOL de TCP (una pérdida frena TODOS los streams, porque TCP entrega en orden).</p>
<p><strong>HTTP/3</strong> = HTTP sobre <strong>QUIC</strong> (UDP): multiplexación sin HOL, seguridad integrada, establecimiento más rápido.</p>`,
      },
      {
        title: 'Mail: SMTP e IMAP',
        html: `
<p>Componentes: user agents, mail servers (cada usuario tiene su buzón) y <strong>SMTP</strong> entre servidores (TCP <strong>25</strong>). El servidor de Alice se conecta DIRECTO al de Bob (sin intermediarios); si está caído, <strong>reintenta</strong> cada ~30 min. Diálogo legible: HELO, MAIL FROM, RCPT TO, DATA, QUIT. Restricción: cuerpo en ASCII 7 bits (adjuntos → base64/MIME).</p>
<span class="tip">Contraste lindo: HTTP es <strong>PULL</strong> (el receptor va a buscar) y SMTP es <strong>PUSH</strong> (el emisor empuja). Para LEER el correo no sirve SMTP: se usa <strong>IMAP</strong> (carpetas y estado en el servidor, multi-dispositivo) o webmail.</span>`,
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
<p><strong>Análisis de distribución de un archivo F a N peers</strong>:</p>
<ul>
<li>Cliente-servidor: <span class="formula">D_cs ≥ max(N·F/u_s, F/d_min)</span> — crece <strong>lineal con N</strong> (el server sube N copias).</li>
<li>P2P: <span class="formula">D_p2p ≥ max(F/u_s, F/d_min, N·F/(u_s + Σu_i))</span> — el denominador <strong>crece con N</strong>: autoescala.</li>
</ul>
<p><strong>BitTorrent</strong>: archivo en <strong>chunks</strong> (~256 KB), un <strong>tracker</strong> lista los peers. Dos políticas inteligentes:</p>
<ul>
<li><strong>Rarest first</strong>: pedir primero los chunks más raros del enjambre → balancea disponibilidad.</li>
<li><strong>Tit-for-tat</strong>: priorizar subida a los 4 peers que más rápido te envían (castiga free-riders), recalculado cada ~10 s + un <strong>optimistic unchoke</strong> cada ~30 s (descubrir socios nuevos y dejar arrancar a los recién llegados).</li>
</ul>`,
      },
      {
        title: 'CDN y streaming (DASH)',
        widget: 'cdn-detail',
        html: `
<p>Servir video a millones desde un datacenter no escala. Solución: <strong>replicar</strong> en servidores distribuidos. Dos filosofías: <strong>enter deep</strong> (miles de clusters chicos dentro de los ISPs — Akamai) vs <strong>bring home</strong> (clusters grandes en IXPs — Limelight).</p>
<p>El usuario llega al servidor correcto <strong>vía DNS</strong>: la cadena de CNAME delega en el DNS de la CDN, que responde la IP del cluster elegido <em>para vos</em> (cercanía al resolver + mediciones en tiempo real). DNS haciendo balanceo de carga global.</p>
<p><strong>DASH</strong>: el video se codifica en <strong>varias tasas</strong>, partido en chunks descriptos en un <strong>manifest</strong>. El <strong>CLIENTE</strong> mide su ancho de banda y pide, chunk a chunk, la versión que puede bancar. La inteligencia está en el cliente → sirven servidores HTTP comunes y atraviesa NATs sin drama.</p>`,
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
<p>La capa de red entrega host-a-host; el transporte la extiende a <strong>proceso-a-proceso</strong>. Vive <strong>en los hosts</strong> (los routers no la miran).</p>
<p><strong>Multiplexing</strong> (emisor): juntar datos de los sockets y pasarlos con header a la red. <strong>Demultiplexing</strong> (receptor): entregar cada segmento al socket correcto.</p>
<span class="tip"><strong>UDP</strong> demultiplexa por el par <strong>(IP destino, puerto destino)</strong>. <strong>TCP</strong> por la <strong>cuádrupla completa</strong> (IP org, pto org, IP dst, pto dst) — por eso un server sostiene miles de conexiones al :80: cada cliente forma una cuádrupla (y un socket de accept()) distinta. Pregunta frecuentísima.</span>`,
      },
      {
        title: 'UDP: transporte sin adornos',
        html: `
<p>Sin conexión, best-effort. Header de <strong>8 bytes</strong>: puertos origen/destino, longitud, checksum. ¿Por qué usarlo?</p>
<ul>
<li>Sin handshake → no gasta un RTT (por eso DNS lo usa).</li>
<li>Sin estado → el server banca más clientes.</li>
<li>Header chico (8 vs 20 de TCP).</li>
<li><strong>Sin control de congestión</strong>: manda a la tasa que la app quiera (tiempo real).</li>
</ul>
<p>Usos: DNS, streaming, VoIP, juegos, DHCP, SNMP — y la base de <strong>QUIC</strong>. Si la app quiere confiabilidad sobre UDP, la implementa ella (exactamente lo que hace QUIC).</p>
<p><strong>Checksum</strong>: suma en complemento a 1 de palabras de 16 bits; <strong>detecta</strong> errores, no los corrige. Existe por el principio <strong>end-to-end</strong>: la verificación final va en los extremos.</p>`,
      },
      {
        title: 'RDT: construyendo la confiabilidad (rdt1.0 → 3.0)',
        html: `
<p>La secuencia incremental del libro (clásico de oral):</p>
<ul>
<li><strong>rdt1.0</strong>: canal perfecto → trivial.</li>
<li><strong>rdt2.0</strong>: errores de bit → <strong>checksum + ACK/NAK</strong> (protocolos ARQ), stop-and-wait.</li>
<li><strong>rdt2.1/2.2</strong>: ¿y si se corrompe el ACK? Retransmitir "por las dudas" genera duplicados → <strong>números de secuencia</strong> (alcanza 1 bit). rdt2.2 elimina el NAK: ACK duplicado = "vino mal" (anticipa a TCP).</li>
<li><strong>rdt3.0</strong>: además pérdidas → <strong>timer</strong>: sin ACK antes del timeout, retransmite. Es el protocolo de bit alternante.</li>
</ul>
<p><strong>El problema</strong>: stop-and-wait desperdicia el enlace. Utilización <span class="formula">U = (L/R) / (RTT + L/R)</span>: con 1 Gbps, RTT 30 ms y 8000 bits → <strong>0,027%</strong>. Solución: <strong>pipelining</strong>.</p>`,
      },
      {
        title: 'Pipelining: Go-Back-N vs Selective Repeat',
        widget: 'gbn-sim',
        html: `
<p><strong>GBN</strong>: hasta N paquetes en vuelo (ventana deslizante). Receptor simplísimo: solo acepta EN ORDEN, descarta el resto y re-ACKea (ACK <strong>acumulativo</strong>). UN timer; si vence → retransmite <strong>toda la ventana</strong>.</p>
<p><strong>SR</strong>: ACK <strong>individual</strong>, receptor <strong>bufferea</strong> fuera de orden, timer <strong>por paquete</strong>, retransmite <strong>solo el perdido</strong>. Más eficiente, más complejo.</p>
<span class="warn">En SR la ventana debe ser <strong>≤ la mitad del espacio de números de secuencia</strong> — si no, el receptor confunde un paquete nuevo con la retransmisión de uno viejo.</span>
<p>TCP es híbrido: ACKs acumulativos (GBN) + receptor que bufferea (SR) + un timer + SACK.</p>`,
      },
      {
        title: 'TCP: conexión, header y byte-stream',
        widget: 'tcp-seq',
        html: `
<p>Orientado a conexión (estado SOLO en los extremos), confiable, <strong>full-duplex</strong>, punto a punto, <strong>byte-stream</strong> (numera BYTES, no segmentos: con MSS 1000, los segmentos llevan seq 0, 1000, 2000…).</p>
<p><strong>Header (20 bytes)</strong>: puertos, <strong>seq</strong> (primer byte del segmento), <strong>ack</strong> (próximo byte esperado — acumulativo), flags (<strong>SYN, ACK, FIN, RST</strong>, + ECE/CWR de ECN), <strong>rwnd</strong> (control de flujo), checksum. Opciones: <strong>MSS</strong> (típico 1460 = MTU 1500 − 40), window scaling, <strong>SACK</strong>, timestamps.</p>
<p><strong>SYN flood</strong>: miles de SYN sin completar el handshake → el server agota memoria en conexiones half-open. Mitigación: <strong>SYN cookies</strong> — el server no guarda NADA: el ISN del SYN-ACK es un hash secreto de la cuádrupla; si llega el ACK, verifica que ack−1 sea la cookie y recién ahí crea la conexión.</p>`,
      },
      {
        title: 'RTT, timeout y retransmisión',
        html: `
<p>Cálculo típico de examen (EWMA):</p>
<ul>
<li><span class="formula">EstimatedRTT = (1−α)·EstimatedRTT + α·SampleRTT</span> (α = 0.125)</li>
<li><span class="formula">DevRTT = (1−β)·DevRTT + β·|SampleRTT − EstimatedRTT|</span> (β = 0.25)</li>
<li><span class="formula">TimeoutInterval = EstimatedRTT + 4·DevRTT</span></li>
</ul>
<p><strong>Karn</strong>: no medir SampleRTT de retransmitidos (ambigüedad); ante timeout, <strong>duplicar</strong> el RTO (backoff exponencial).</p>
<p><strong>Dos disparadores de retransmisión</strong>: (1) timeout; (2) <strong>3 ACKs duplicados → fast retransmit</strong> (sin esperar el timeout). ¿Por qué 3 y no 1? Para no confundir un reordenamiento con una pérdida.</p>`,
      },
      {
        title: 'Control de flujo (rwnd)',
        html: `
<p>Impide desbordar <strong>el buffer del receptor</strong> (≠ congestión, que mira la RED). El receptor anuncia <span class="formula">rwnd = RcvBuffer − (LastByteRcvd − LastByteRead)</span> en cada segmento; el emisor mantiene bytes en vuelo ≤ rwnd.</p>
<span class="tip">Caso borde: si rwnd = 0, el emisor manda <strong>sondas de 1 byte</strong>; si no, cuando el receptor libere espacio no tendría cómo avisar (no manda ACKs sin recibir nada) y quedarían bloqueados para siempre.</span>`,
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
<p><strong>CUBIC</strong> (default en Linux/Windows): en redes de alto ancho de banda × demora, el +1 MSS/RTT de Reno tarda eternidades. CUBIC crece como <strong>función cúbica del tiempo</strong> desde la última pérdida: agresivo lejos de W_max, <strong>se aplana cerca</strong> (sondeo cauteloso justo donde dolió), y después vuelve a acelerar.</p>
<p><strong>Vegas/BBR</strong>: cambian la señal — en vez de la pérdida (que llega tarde, con colas ya desbordadas), miran el <strong>RTT</strong>: si crece sobre el mínimo, se están formando colas → bajar ANTES de perder. Lema: <em>"mantener el caño lleno, pero no más que lleno"</em> (ataca el bufferbloat). <strong>BBR</strong> (Google 2016) corre en el backbone B4 y YouTube.</p>
<span class="tip">Panorama: pérdida como señal → Tahoe/Reno/CUBIC · demora → Vegas/BBR · señal explícita → ECN.</span>`,
      },
      {
        title: 'QUIC: el cierre perfecto del capítulo',
        html: `
<p>Protocolo de <strong>capa de aplicación</strong> sobre <strong>UDP</strong> que reconstruye TCP+TLS. Base de <strong>HTTP/3</strong>.</p>
<ul>
<li>Handshake de transporte + criptográfico (TLS 1.3) <strong>combinados</strong>: conexión + claves en <strong>1 RTT</strong> (vs 2–3 de TCP+TLS).</li>
<li><strong>Streams múltiples</strong> con retransmisión POR STREAM: se pierde un paquete y solo ese stream espera — adiós HOL blocking de TCP.</li>
<li>Control de congestión estilo NewReno/CUBIC pero <strong>en espacio de usuario</strong>: se actualiza con un deploy, sin tocar el kernel — la razón profunda de elegir UDP.</li>
</ul>
<span class="tip">"¿UDP no era no confiable? ¿Cómo corre HTTP/3 sobre UDP?" — Porque QUIC implementa la confiabilidad ENCIMA de UDP: secuencias, ACKs, retransmisión, congestión y cifrado los pone QUIC.</span>`,
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
        title: 'Adentro de un router',
        html: `
<p>Cuatro componentes: <strong>puertos de entrada</strong> (terminan el enlace, lookup por <strong>LPM</strong> a line-speed con memorias <strong>TCAM</strong>), <strong>switching fabric</strong> (por memoria → por bus → por <strong>crossbar</strong> con transferencias en paralelo), <strong>puertos de salida</strong> (buffer + scheduling) y <strong>procesador de ruteo</strong>.</p>
<p><strong>Dónde se pierde</strong>: en colas. En entrada, <strong>HOL blocking</strong> (el del frente, bloqueado, traba a los de atrás). En salida (lo común): buffer lleno → drop-tail, o descarte/marcado temprano con <strong>AQM</strong> (RED, CoDel — contra el bufferbloat).</p>
<p><strong>¿Cuánto buffer?</strong> Regla clásica <span class="formula">B = RTT × C</span>; refinada <span class="formula">B = RTT × C / √N</span> (N flujos desincronizados). <strong>Bufferbloat</strong>: buffers gigantes = colas persistentes = latencia enorme. Más buffer no siempre es mejor.</p>
<p><strong>Scheduling</strong> de salida: FIFO · <strong>prioridad</strong> (riesgo: inanición) · round robin · <strong>WFQ</strong> (garantiza a la clase i al menos w_i/Σw_j del enlace — la base del QoS).</p>`,
      },
      {
        title: 'El datagrama IPv4 y la fragmentación',
        widget: 'frag-detail',
        html: `
<p>Header (20 bytes): version, longitudes, <strong>TOS/DSCP</strong> + 2 bits <strong>ECN</strong>, campos de fragmentación (identifier, flags, offset), <strong>TTL</strong> (−1 por router; en 0 → descarte + ICMP Time Exceeded — la base de traceroute), <strong>protocol</strong> (6=TCP, 17=UDP, 1=ICMP — el pegamento entre capas), <strong>header checksum</strong> (solo el header, recalculado por salto), IPs origen/destino.</p>
<p><strong>Fragmentación</strong>: cada enlace impone un <strong>MTU</strong> (Ethernet: 1500). Si el datagrama no entra, el router lo parte (mismo identifier, offset en unidades de 8 bytes, more-fragments=1 salvo el último). El <strong>reensamblado es SOLO en el host destino</strong> (complejidad a los extremos). Falta un fragmento → se descarta el datagrama entero. <strong>IPv6 no fragmenta en routers</strong>: ICMPv6 "Packet Too Big" y el origen ajusta (Path MTU Discovery).</p>`,
      },
      {
        title: 'Direccionamiento, CIDR, subnetting y LPM',
        widget: 'subnet-detail',
        html: `
<p>IPv4: <strong>32 bits</strong>, identifica una <strong>interfaz</strong> (no un host). Una <strong>subred</strong>: interfaces que se alcanzan sin router. <strong>CIDR</strong> <code>a.b.c.d/x</code>: x bits de red. En un /x hay <span class="formula">2^(32−x)</span> direcciones y <span class="formula">2^(32−x) − 2</span> útiles (se restan red y broadcast). CIDR reemplazó las clases A/B/C y habilita la <strong>agregación</strong>: el ISP anuncia un /20 y adentro reparte /23s.</p>
<p><strong>LPM</strong>: si la IP matchea varios prefijos, gana el <strong>más largo</strong> (más específico) — permite convivir agregación con excepciones (el cliente que se mudó de ISP conservando su bloque).</p>
<p><strong>Ejemplo resuelto</strong>: 192.168.1.0/24 en 4 subredes → /26 (64 direcciones c/u): .0, .64, .128, .192; hosts útiles 62 por subred. Enlaces punto a punto: /30 (2 útiles, justas).</p>
<p>Asignación: <strong>ICANN → RIRs (LACNIC) → ISPs → clientes</strong>. El agotamiento de IPv4 empuja NAT e IPv6.</p>`,
      },
      {
        title: 'NAT',
        widget: 'nat-detail',
        html: `
<p>Toda una red privada detrás de <strong>una</strong> IP pública. Rangos privados no ruteables: <code>10/8</code>, <code>172.16/12</code>, <code>192.168/16</code>. La tabla traduce <strong>(IP:puerto privado ↔ IP:puerto público)</strong>.</p>
<p><strong>Pros</strong>: ahorra IPv4, cambiás de ISP sin renumerar, oculta la topología. <strong>Contras de examen</strong>: rompe el <strong>modelo end-to-end</strong> (nadie inicia conexiones hacia adentro — parche: port forwarding/UPnP), "viola" las capas (capa 3 manipulando puertos de capa 4). NAT fue el parche que resultó permanente; la respuesta de fondo es IPv6.</p>`,
      },
      {
        title: 'DHCP',
        widget: 'dhcp-detail',
        html: `
<p>Configuración automática al conectarse ("plug and play"), sobre <strong>UDP 67/68</strong>. Entrega <strong>IP (con lease) + máscara + gateway + DNS local</strong>. Cuatro mensajes: <strong>DORA</strong> (Discover, Offer, Request, Ack). Renovación con REQUEST directo; en redes grandes, un <strong>relay agent</strong> reenvía los broadcasts al servidor central.</p>`,
      },
      {
        title: 'IPv6 y la transición',
        html: `
<p><strong>128 bits</strong> (≈3,4×10³⁸: "una IP por grano de arena"). Tipos: unicast, multicast y <strong>anycast</strong> — <strong>no hay broadcast</strong>. Header <strong>fijo de 40 bytes</strong>, más simple: sin fragmentación en routers, <strong>sin checksum</strong> (redundante y caro de recalcular por el TTL), sin options (van como extension headers). Agrega <strong>flow label</strong>; TTL se renombra <strong>hop limit</strong>.</p>
<p><strong>Transición</strong> (no hay "flag day"): <strong>tunneling</strong> — el datagrama IPv6 viaja como payload de uno IPv4 entre routers <strong>dual-stack</strong>.</p>
<span class="tip">Moraleja de diseño: cambiar la capa de red tarda décadas (todos los routers del mundo); la aplicación evoluciona en meses — comparar los ~25 años de IPv6 con lo rápido que se desplegó QUIC.</span>`,
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
<p><strong>LS</strong>: cada router difunde el estado de sus enlaces a TODA la red → todos conocen la topología completa y corren <strong>Dijkstra</strong> localmente (agregar el nodo de menor costo tentativo y relajar vecinos; O(n²)). Patología: con costos dependientes de la carga puede <strong>oscilar</strong>.</p>
<p><strong>DV</strong>: cada router conoce SOLO a sus vecinos; intercambia su vector de distancias y actualiza con <strong>Bellman-Ford</strong>: <span class="formula">dx(y) = min_v ( c(x,v) + dv(y) )</span>. Iterativo, asincrónico, distribuido.</p>
<p><strong>"Las buenas noticias viajan rápido; las malas, lento"</strong>: si un enlace cae puede arrancar el <strong>count-to-infinity</strong> (loop donde los costos suben de a 1). Mitigación: <strong>poisoned reverse</strong> ("si ruteo hacia x a través tuyo, te digo que mi distancia a x es ∞") — resuelve loops de 2 nodos, NO de 3+.</p>
<span class="tip">Comparación: LS manda más mensajes pero converge rápido y un router mentiroso solo daña su propia tabla; DV es liviano y local pero converge lento y los errores se PROPAGAN por los vectores.</span>`,
      },
      {
        title: 'Sistemas Autónomos: intra vs inter',
        html: `
<p>Internet no es un grafo plano de un millón de routers: no escalaría, y las organizaciones quieren <strong>autonomía</strong>. Se organiza en <strong>AS</strong> (routers bajo una misma administración, con ASN):</p>
<ul>
<li><strong>Intra-AS (IGP)</strong>: optimiza performance adentro. <strong>OSPF</strong>, RIP, IS-IS.</li>
<li><strong>Inter-AS (EGP)</strong>: entre ASes, gobernado por <strong>políticas y dinero</strong>. <strong>BGP</strong>.</li>
</ul>`,
      },
      {
        title: 'OSPF y RIP',
        html: `
<p><strong>OSPF</strong> (link-state): LSAs por flooding confiable + Dijkstra. Costos configurables (1 en todos = mínimo de saltos; o inversos a la banda). Extras industriales: <strong>autenticación</strong> de mensajes, <strong>ECMP</strong> (caminos de igual costo repartidos) y <strong>jerarquía en áreas</strong> con backbone (área 0) para contener el flooding.</p>
<p><strong>RIP</strong> (distance-vector histórico): métrica = <strong>saltos, máximo 15</strong> (16 = ∞, lo que acota el count-to-infinity y lo limita a redes chicas). Vectores cada ~30 s. Hoy, pieza de museo didáctica.</p>`,
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
<p><strong>Políticas comerciales</strong>: relaciones cliente-proveedor (se paga tránsito) o peers (gratis entre sí). Regla: un AS anuncia a proveedores/peers <strong>solo las rutas de sus clientes</strong> — nunca rutas de un proveedor hacia otro (sería tránsito gratis). Consecuencia: a veces el camino físico corto no se usa porque comercialmente no existe.</p>
<p><strong>IP anycast</strong>: la misma IP anunciada desde muchos puntos; BGP te lleva al "más cercano". Así funcionan los root servers de DNS y las CDNs.</p>`,
      },
      {
        title: 'ICMP y traceroute',
        widget: 'traceroute-detail',
        html: `
<p>El protocolo de <strong>control y reporte de errores</strong> de la capa de red; viaja DENTRO de datagramas IP (protocol=1). Mensajes clave: <strong>Echo request/reply</strong> (8/0 — ping), <strong>Destination Unreachable</strong> (tipo 3; el código "puerto" lo genera el destino ante un UDP sin proceso), <strong>Time Exceeded</strong> (tipo 11 — TTL en 0).</p>
<p><strong>ICMPv6</strong> agrega Neighbor Discovery (<strong>reemplaza a ARP</strong>) y Packet Too Big (Path MTU Discovery).</p>`,
      },
      {
        title: 'SDN: el control plane centralizado',
        html: `
<p>La lógica de control sale de los routers hacia un <strong>controlador</strong> lógicamente centralizado (replicado físicamente) con vista global. Tres pisos:</p>
<ul>
<li><strong>Southbound (OpenFlow)</strong>: del switch al controlador — <strong>packet-in</strong> (no matcheó nada), port-status (se cayó un enlace); del controlador al switch — <strong>flow-mod</strong> (instalá esta regla).</li>
<li><strong>Capa de estado</strong>: topología, tablas, estadísticas.</li>
<li><strong>Northbound</strong>: la API para las <strong>aplicaciones de red</strong> — ¡Dijkstra como app!, firewalling, balanceo.</li>
</ul>
<p><strong>Ejemplo punta a punta</strong>: se cae un enlace → port-status → el controlador actualiza la topología → la app de ruteo recalcula → flow-mods a los switches afectados. Lo que hacían mil routers negociando (OSPF), lo hace un programa con la foto completa.</p>
<p>Controladores: OpenDaylight, ONOS. Tensiones: el controlador como punto crítico y la latencia del lazo switch↔controlador.</p>`,
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
<p>Mueve un datagrama entre nodos <strong>físicamente adyacentes</strong>, encapsulado en una <strong>trama</strong>. Servicios: framing, acceso al enlace (MAC), entrega confiable local (útil en enlaces con errores como los inalámbricos; en fibra casi no se usa) y detección/corrección de errores.</p>
<p>Se implementa mayormente en la <strong>NIC</strong> (hardware + firmware). Distinción conceptual: <strong>enlace = salto a salto; red = end-to-end</strong>. Analogía: tramos en auto/avión/tren (enlace) vs el agente de viajes que armó el itinerario (red).</p>`,
      },
      {
        title: 'Detección y corrección de errores',
        html: `
<ul>
<li><strong>Paridad</strong>: 1 bit → detecta cantidad impar de errores. La <strong>bidimensional</strong> (filas × columnas) detecta Y CORRIGE un error simple (la fila y columna rotas se cruzan en el culpable) — germen de <strong>FEC</strong>.</li>
<li><strong>Checksum</strong> (complemento a 1): barato en software → transporte. Débil ante ráfagas.</li>
<li><strong>CRC</strong>: el estándar de enlace (hardware, potente contra ráfagas). Los datos como polinomio; emisor y receptor acuerdan un generador G (r+1 bits); se transmite D·2^r XOR R tal que sea divisible por G (aritmética módulo 2 = XOR). Receptor divide: <strong>resto ≠ 0 → error</strong>. CRC de r bits detecta toda ráfaga ≤ r (Ethernet: CRC-32).</li>
</ul>
<p><strong>Mini ejemplo</strong>: D = 101110, G = 1001 → R = 011, se transmite 101110<strong>011</strong>; el receptor divide y obtiene resto 0 → OK.</p>`,
      },
      {
        title: 'Acceso múltiple: 3 familias',
        widget: 'csmacd-detail',
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
        title: 'MAC, ARP y el viaje fuera de la subred',
        widget: 'arp-detail',
        html: `
<p><strong>MAC</strong>: 48 bits, plana, grabada en la NIC, unicidad global (IEEE). Entrega tramas en el enlace <strong>local</strong>.</p>
<span class="tip">La analogía clave: <strong>IP = dirección postal</strong> (jerárquica, cambia al mudarte, permite rutear) · <strong>MAC = DNI</strong> (plana, fija, te identifica donde estés). Se necesitan AMBAS.</span>
<p><strong>ARP</strong> traduce IP → MAC <strong>dentro de la misma subred</strong>: query en broadcast (FF:FF:...), respuesta unicast, caché con TTL (~20 min). Plug-and-play, y vive justo en la costura entre capa 2 y 3.</p>`,
      },
      {
        title: 'Ethernet',
        html: `
<p><strong>Trama</strong>: preámbulo (sincroniza relojes) + MAC destino + MAC origen + <strong>tipo</strong> (0x0800 IP, 0x0806 ARP — el "protocol" de capa 2) + payload (46–1500: de ahí el MTU) + CRC.</p>
<p>Servicio <strong>no confiable y sin conexión</strong>: trama con CRC malo → se descarta en silencio (lo repone TCP arriba). Evolución: bus coaxil con CSMA/CD → hub (repetidor, mismo dominio de colisión) → <strong>switch</strong> con enlaces full-duplex dedicados: <strong>no hay colisiones ni hace falta CSMA/CD</strong>. Las velocidades escalaron (10 Mbps → 100 Gbps) manteniendo el formato de trama — la clave de su longevidad.</p>`,
      },
      {
        title: 'Switches de capa 2',
        widget: 'switch-detail',
        html: `
<p><strong>Transparentes, plug-and-play, self-learning</strong>. Tabla (MAC, interfaz, timestamp) con aging. <strong>Reenvío, 3 casos</strong>: destino en tabla por OTRA interfaz → reenvía solo por ahí (filtrado) · misma interfaz → descarta · no está → <strong>flooding</strong>.</p>
<p><strong>Switch vs router</strong> (clásica): switch = capa 2, plano, plug-and-play, <strong>NO aísla dominios de broadcast</strong> (un ARP inunda toda la LAN; en redes grandes, tormentas); router = capa 3, jerárquico, requiere configuración, <strong>SÍ aísla broadcast</strong> y banca topologías con ciclos.</p>`,
      },
      {
        title: 'VLANs',
        html: `
<p>Sin VLANs, toda la organización es UN dominio de broadcast y mover un usuario implica recablear. Una <strong>VLAN</strong> parte el switch físico en LANs lógicas: cada grupo de puertos es su propio dominio de broadcast (aislamiento, seguridad). Para que VLANs distintas se hablen: hay que <strong>rutear</strong>.</p>
<p><strong>Trunking 802.1Q</strong>: varias VLANs por un mismo enlace entre switches, con un <strong>tag de 4 bytes</strong> (VLAN ID de <strong>12 bits</strong> → 4094 VLANs) que se agrega al entrar al trunk y se quita al salir.</p>`,
      },
      {
        title: 'MPLS',
        html: `
<p>Reenvío por <strong>etiqueta de longitud fija</strong> (20 bits) insertada ENTRE enlace y red ("capa 2.5"). Los <strong>LSR</strong> reenvían mirando solo la etiqueta a lo largo de un <strong>LSP</strong> preestablecido, intercambiándola en cada salto.</p>
<p>Nació para acelerar el forwarding; hoy vale por el <strong>control del camino</strong>: <strong>traffic engineering</strong> (rutas distintas del mínimo IP), <strong>VPNs de operador</strong> (pilas de etiquetas) y <strong>fast reroute</strong> (backup precalculado en milisegundos).</p>`,
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
    tagline: 'WiFi, CSMA/CA, terminal oculto, movilidad y celulares.',
    topics: [
      {
        title: 'El medio inalámbrico es hostil',
        html: `
<ul>
<li><strong>Atenuación</strong> con la distancia y los obstáculos; <strong>fading</strong>.</li>
<li><strong>Interferencia</strong> de otras fuentes en la banda (otros WiFi, microondas).</li>
<li><strong>Multipath</strong>: la señal rebota y llega desfasada por varios caminos.</li>
<li>La <strong>SNR</strong> determina la BER: trade-off tasa / potencia / errores.</li>
<li><strong>Terminal oculto</strong>: A y C no se escuchan pero ambos alcanzan a B → colisionan EN B sin enterarse.</li>
</ul>
<span class="warn">Consecuencia central: en wireless <strong>no se puede hacer CSMA/CD</strong>. Tu propia señal (fortísima) tapa la del otro, y por el terminal oculto podés ni enterarte de la colisión. Por eso WiFi EVITA (CA) en vez de DETECTAR (CD).</span>`,
      },
      {
        title: 'WiFi 802.11: asociación y CSMA/CA',
        widget: 'wifi-detail',
        html: `
<p>Modo infraestructura: hosts asociados a un <strong>AP</strong> (el conjunto = <strong>BSS</strong>). El AP emite <strong>beacons</strong>; el host escanea (pasivo o activo con probe requests), elige por señal, se asocia y pide IP por DHCP.</p>
<p><strong>CSMA/CA</strong>: escuchar; si está libre un intervalo <strong>DIFS</strong>, transmitir. Como no se detectan colisiones, cada trama se confirma con <strong>ACK explícito</strong> de capa 2. Ante canal ocupado o reintento: <strong>backoff aleatorio</strong>. <strong>RTS/CTS</strong> opcional contra el terminal oculto. La trama 802.11 lleva <strong>4 direcciones</strong> (incluye la MAC del AP para el relay hacia la LAN cableada).</p>`,
      },
      {
        title: 'Gestión de la movilidad',
        html: `
<p>Conceptos: <strong>home network / home address</strong> (permanentes), <strong>foreign network</strong>, <strong>home/foreign agents</strong>, <strong>COA</strong> (care-of-address temporal en la red visitada).</p>
<ul>
<li><strong>Indirect routing</strong>: todo pasa por el home agent, que <strong>tunelea</strong> al COA. Simple, pero con el problema del <strong>triángulo</strong> (ineficiente).</li>
<li><strong>Direct routing</strong>: el corresponsal averigua el COA y manda directo. Eficiente, más complejo.</li>
</ul>
<p><strong>Mobile IP</strong> estandariza agentes, registro del COA y tunneling.</p>`,
      },
      {
        title: 'Redes celulares 4G/5G',
        html: `
<p>Arquitectura de <strong>celdas</strong> con estaciones base. <strong>4G/LTE es all-IP</strong>: <strong>eNodeB</strong> (estación base), <strong>MME</strong> (control: autenticación con el HSS, gestión de túneles), <strong>S-GW / PDN-GW</strong> (data plane hacia Internet). <strong>Handover</strong>: la conexión pasa de una estación base a otra sin cortarse mientras te movés. 5G suma más capacidad y menor latencia.</p>`,
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
        html: `
<ul>
<li><strong>Confidencialidad</strong>: solo emisor y receptor entienden el contenido → cifrado.</li>
<li><strong>Integridad</strong>: cualquier alteración se detecta. ¡No implica confidencialidad ni al revés!</li>
<li><strong>Autenticación</strong>: confirmar con quién hablás (de entidad y de origen del mensaje).</li>
<li><strong>No repudio</strong>: el emisor no puede negar haber enviado (firma digital).</li>
<li><strong>Disponibilidad</strong>: que el servicio siga en pie (la atacan los DoS).</li>
</ul>`,
      },
      {
        title: 'Amenazas',
        widget: 'mitm-detail',
        html: `
<p><strong>Pasivas</strong> (observan, difíciles de detectar): <strong>sniffing</strong>. <strong>Activas</strong>: <strong>spoofing</strong> (IP origen falsa), <strong>MITM</strong> (se interpone y se hace pasar por cada parte — la amenaza que justifica los certificados), <strong>hijacking</strong> (secuestrar una sesión adivinando secuencias), <strong>replay</strong> (reenviar un mensaje válido grabado — defensa: nonces), <strong>DoS/DDoS</strong> (SYN flood → SYN cookies), <strong>DNS poisoning / pharming</strong>, malware.</p>`,
      },
      {
        title: 'Criptografía simétrica: AES y el modo CBC',
        html: `
<p><strong>Misma clave</strong> para cifrar y descifrar (AES). Rápida — ideal para volumen. Su problema difícil: <strong>distribuir la clave</strong>.</p>
<p><strong>ECB</strong> (cada bloque por separado) tiene una falla grave: bloques iguales → cifrados iguales → se filtra estructura (la imagen del pingüino que "se ve" cifrada). <strong>CBC</strong>: <span class="formula">c_i = K(m_i ⊕ c_(i−1))</span> con un <strong>IV aleatorio</strong> en claro: el mismo texto da cifrados distintos por mensaje.</p>
<span class="warn">NUNCA reusar un IV con la misma clave (es lo que rompió a WEP).</span>`,
      },
      {
        title: 'Criptografía asimétrica: RSA, DH y el esquema híbrido',
        html: `
<p>Par de claves: <strong>pública</strong> (se difunde) y <strong>privada</strong> (secreta); lo cifrado con una solo se descifra con la otra. <strong>RSA</strong> se apoya en que <strong>factorizar el producto de dos primos grandes es inviable</strong> (<span class="formula">c = m^e mod n · m = c^d mod n</span>).</p>
<p><strong>Confidencialidad</strong>: cifrar con la <strong>pública del receptor</strong>. Como es carísima, en la práctica todo es <strong>híbrido</strong>: la asimétrica solo para intercambiar una <strong>clave de sesión simétrica</strong>, y AES para el grueso — exactamente lo que hace TLS.</p>
<p><strong>Diffie-Hellman</strong>: acordar una clave compartida sobre un canal inseguro sin transmitirla nunca (dureza del logaritmo discreto). Vulnerable a <strong>MITM</strong> si no se acompaña de autenticación → se combina con certificados.</p>`,
      },
      {
        title: 'Autenticación: la escalera ap1.0 → ap4.0',
        html: `
<p>Cómo cae cada versión ingenua (relato muy pedido):</p>
<ul>
<li><strong>ap1.0</strong> — "soy Alice": cualquiera lo dice.</li>
<li><strong>ap2.0</strong> — + su IP: cae con <strong>IP spoofing</strong>.</li>
<li><strong>ap3.0</strong> — + contraseña: cae con <strong>sniffing</strong>.</li>
<li><strong>ap3.1</strong> — contraseña cifrada: cae igual con <strong>replay</strong> (se reenvía el cifrado tal cual, sin descifrarlo).</li>
<li><strong>ap4.0</strong> — Bob manda un <strong>nonce R</strong>; Alice responde K(R). Como R cambia en cada intento, lo grabado no sirve.</li>
</ul>
<span class="tip">El nonce prueba que Alice está <em>viva y respondiendo AHORA</em>, no que alguien grabó algo viejo. La versión con clave pública necesita certificados para no caer en MITM.</span>`,
      },
      {
        title: 'Integridad: hash, HMAC, firma digital y PKI',
        html: `
<p><strong>Hash criptográfico</strong> (SHA-256; MD5/SHA-1 ya inseguros): una sola vía + resistente a colisiones → huella de tamaño fijo.</p>
<p><strong>MAC / HMAC</strong>: hash del mensaje mezclado con un <strong>secreto compartido</strong> → integridad + autenticación de origen. <em>Ojo con la sigla: Message Authentication Code ≠ dirección MAC de capa 2.</em></p>
<p><strong>Firma digital</strong>: hash del mensaje <strong>cifrado con la privada del emisor</strong>; cualquiera verifica con la pública → integridad + autenticación + <strong>no repudio</strong>. Se firma el hash (no el mensaje) por eficiencia.</p>
<p><strong>Certificados y PKI</strong>: ¿cómo sé que una clave pública es de quien dice? Una <strong>CA</strong> firma un certificado <strong>X.509</strong> (identidad + clave pública + validez + firma de la CA). Se valida la <strong>cadena de confianza</strong> hasta una CA raíz del trust store. Es <strong>lo que frena el MITM</strong>.</p>`,
      },
      {
        title: 'TLS (transporte) → HTTPS',
        widget: 'tls-detail',
        html: `
<p>Del Master Secret salen <strong>4 claves</strong>: cifrado + MAC por cada sentido. Los <strong>nonces</strong> frenan el replay entre sesiones; los <strong>números de secuencia</strong>, dentro de la sesión; <strong>close-notify</strong> frena el truncation attack. <strong>TLS 1.3</strong>: 1-RTT (0-RTT en reconexión), cifradores viejos eliminados, forward secrecy por defecto.</p>`,
      },
      {
        title: 'IPsec (red) → VPNs',
        html: `
<p>Trabaja sobre <strong>SAs</strong> (contratos <strong>unidireccionales</strong>: claves + algoritmos, identificados por SPI).</p>
<ul>
<li><strong>Modo transporte</strong>: cifra solo el payload (host-a-host) · <strong>Modo túnel</strong>: cifra el datagrama ENTERO y lo encapsula en otro — el caso VPN gateway-a-gateway, oculta las IPs internas.</li>
<li><strong>AH</strong>: integridad + autenticación, sin confidencialidad · <strong>ESP</strong>: + confidencialidad (el que se usa casi siempre).</li>
<li><strong>IKE</strong>: negocia SAs y claves automáticamente (el "handshake" de IPsec).</li>
</ul>`,
      },
      {
        title: 'WiFi seguro: WEP → WPA2 → WPA3',
        html: `
<p><strong>WEP</strong> quedó roto por reuso de IV y claves cortas. <strong>802.11i / WPA2</strong>, cuatro fases: descubrimiento → autenticación mutua y clave maestra (EAP contra un servidor AS en empresas, o clave precompartida en Personal) → <strong>four-way handshake</strong> (intercambio de nonces → clave de sesión par-a-par + clave de grupo para broadcast) → tráfico cifrado.</p>
<p><strong>WPA3</strong> (2018): corrige el reuso de nonces explotado por <strong>KRACK</strong>, intercambio de claves más robusto, claves más largas.</p>`,
      },
      {
        title: 'Firewalls e IDS/IPS',
        html: `
<p><strong>Firewall</strong> — tres objetivos: (1) TODO el tráfico pasa por él, (2) solo pasa lo autorizado por la política, (3) él mismo es resistente. Tipos:</p>
<ul>
<li><strong>Stateless</strong>: reglas fijas sobre campos (IPs, puertos, flags). Veloz, ciego al contexto.</li>
<li><strong>Stateful</strong>: tabla de conexiones — deja entrar solo respuestas a conexiones que la red interna inició.</li>
<li><strong>Application gateway / proxy</strong>: inspecciona contenido, políticas por usuario.</li>
</ul>
<p>Arquitectura: <strong>DMZ</strong> para los servidores expuestos, con firewalls a ambos lados.</p>
<p><strong>IDS vs IPS</strong>: por <strong>firma</strong> (base de ataques conocidos — Snort) o por <strong>anomalía</strong> (desvíos estadísticos: pesca ataques nuevos, más falsos positivos). El IDS <strong>avisa</strong> (pasivo); el IPS está <strong>en línea y bloquea</strong>.</p>
<p><strong>Conclusión del capítulo</strong>: la seguridad es un <strong>proceso continuo</strong> (defense in depth); el sistema es tan seguro como su <strong>eslabón más débil</strong>; siempre hay trade-off seguridad/performance/usabilidad.</p>`,
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
