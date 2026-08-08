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
<ul>
<li><strong>Forwarding (reenvío)</strong>: acción <strong>LOCAL</strong> de un router — llega un paquete, mira la tabla, lo saca por la interfaz correcta. Nanosegundos, hardware, <strong>data plane</strong>.</li>
<li><strong>Routing (enrutamiento)</strong>: proceso <strong>GLOBAL</strong> — determinar el camino end-to-end. Segundos, software, <strong>control plane</strong>.</li>
</ul>
<p>El routing <strong>arma la tabla</strong> que el forwarding después <strong>consulta</strong>.</p>`,
      },
      {
        title: 'Conmutación: paquetes vs circuitos',
        widget: 'switching-detail',
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
        widget: 'playout-detail',
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
<p>El modelo <strong>TCP/IP</strong> tiene <strong>4 capas</strong> — Aplicación, Transporte, Red y Enlace. (La transmisión de <strong>bits</strong> por el medio queda dentro de la de enlace; los modelos <strong>OSI</strong> y el "de 5 capas" de Kurose la separan como capa <strong>Física</strong>, y OSI suma además <strong>Presentación</strong> —cifrado/compresión, hoy la absorbe la app, ej. TLS— y <strong>Sesión</strong>.) La idea de fondo es <strong>modularidad</strong>: cambiás de cable a WiFi sin tocar TCP ni HTTP. Costo: redundancias (checksums repetidos) y violaciones (NAT).</p>
<p><strong>Encapsulamiento</strong> — los nombres se preguntan:</p>
<ul>
<li>Aplicación → <strong>mensaje</strong></li>
<li>Transporte → <strong>segmento</strong> (header con puertos)</li>
<li>Red → <strong>datagrama</strong> (header con IPs)</li>
<li>Enlace → <strong>trama</strong> (header con MACs + trailer CRC) → sale al medio como <strong>bits</strong></li>
</ul>
<span class="tip">Regla de oro: los <strong>hosts</strong> implementan las 4 capas; los <strong>routers</strong> llegan hasta la capa de <strong>red</strong> (necesitan la IP); los <strong>switches</strong> hasta la de <strong>enlace</strong> (solo miran MACs).</span>`,
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
        widget: 'http2-detail',
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
        widget: 'tcp-sim',
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
        widget: 'flowctl-detail',
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
        widget: 'cast-detail',
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
<p><strong>"Las buenas noticias viajan rápido; las malas, lento"</strong>: si un enlace mejora, la novedad se propaga en pocos intercambios. Si un enlace <strong>se cae</strong>, puede arrancar el <strong>count-to-infinity</strong> — un loop donde los costos suben de a 1 "hasta el infinito".</p>
<span class="warn">Mitigación: <strong>poisoned reverse</strong> ("si ruteo hacia x a través tuyo, te digo que mi distancia a x es ∞"). Resuelve loops de 2 nodos, NO los de 3 o más.</span>`,
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
<p><strong>RIP</strong> es el IGP <strong>distance-vector</strong> histórico. Métrica: <strong>saltos (hops)</strong>, con máximo <strong>15</strong> (16 = ∞ = inalcanzable) — lo que a la vez acota el daño del count-to-infinity y limita RIP a redes chicas. Los vecinos intercambian sus vectores cada <strong>~30 s</strong> (y ante cambios).</p>
<p>Simple de configurar, convergencia lenta: hoy es más pieza de museo/didáctica que elección de diseño. Su tabla de ruteo tiene el formato <strong>(subred destino, próximo router, # saltos)</strong>.</p>`,
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
<p>Cómo un prefijo se propaga entre ASes: en cada frontera (eBGP), el AS que reanuncia <strong>prepende su propio ASN</strong> al <strong>AS-PATH</strong>. Ese path sirve para <strong>detectar loops</strong> (si un AS ve su ASN en el path, descarta la ruta) y como métrica de desempate (menos ASes ≈ mejor).</p>
<p>Cuando a un AS le llegan varias rutas al mismo prefijo, decide en orden: <strong>local-preference</strong> (política) → <strong>AS-PATH más corto</strong> → <strong>hot-potato</strong> (NEXT-HOP más cercano por IGP) → menor router-id.</p>`,
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
        widget: 'sdn-detail',
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
        widget: 'crc-detail',
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
<p>El problema que define a WiFi: <strong>A y C alcanzan al AP pero no se escuchan entre sí</strong>. Los dos sensan "canal libre" al mismo tiempo, transmiten, y <strong>colisionan en el AP</strong> sin que ninguno se entere.</p>
<p>Esto, sumado a que <strong>tu propia señal tapa la del otro</strong> mientras transmitís, es la razón de fondo por la que <strong>no se puede hacer CSMA/CD</strong> en el aire: no hay forma confiable de <em>detectar</em> la colisión. Por eso 802.11:</p>
<ul>
<li><strong>Confirma cada trama con un ACK explícito de capa 2</strong>. La <strong>ausencia del ACK</strong> es la única señal de que algo falló.</li>
<li>Ofrece <strong>RTS/CTS</strong> opcional: el emisor pide el canal con un <strong>RTS</strong> cortito, el AP responde <strong>CTS</strong>, y como <strong>el AP sí llega a todos</strong>, el terminal oculto <strong>escucha el CTS</strong> y se calla — activa su <strong>NAV</strong> (Network Allocation Vector: "canal reservado hasta tal momento").</li>
</ul>
<span class="tip">RTS/CTS agrega overhead, por eso es <strong>opcional</strong> y conviene solo para tramas grandes: si el RTS choca, se pierde poquito; si chocara una trama de datos entera, se pierde mucho.</span>`,
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
<p>La red celular divide el territorio en <strong>celdas</strong>, cada una con su <strong>estación base</strong>. <strong>4G/LTE es all-IP</strong> y su núcleo (EPC) separa <strong>control</strong> de <strong>datos</strong> (misma idea que SDN):</p>
<ul>
<li><strong>eNodeB</strong>: la estación base LTE — el único tramo <em>inalámbrico</em>. De ahí en más es IP cableada.</li>
<li><strong>MME</strong> (Mobility Management Entity): el <strong>plano de control</strong>. Autentica al usuario contra la <strong>HSS</strong> (base de datos de suscriptores) y arma los túneles (<em>bearers</em>). No toca los datos.</li>
<li><strong>S-GW</strong> (Serving Gateway): <strong>ancla</strong> del plano de datos — sobrevive a los handovers. <strong>PDN-GW</strong>: el borde hacia Internet (asigna IP, hace de gateway).</li>
</ul>
<p><strong>Handover</strong> (segunda vista del diagrama): mientras te movés, la conexión <strong>pasa de una estación base a otra sin cortarse</strong>. La clave: se <strong>prepara la celda destino antes</strong> de soltar la origen, y el S-GW <strong>reengancha</strong> el camino de datos. <strong>5G</strong> profundiza la separación control/datos (núcleo por microservicios, <em>network slicing</em>) para más capacidad y menor latencia.</p>`,
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
<p>Del Master Secret salen <strong>4 claves</strong>: cifrado + MAC por cada sentido. Los <strong>nonces</strong> frenan el replay entre sesiones; los <strong>números de secuencia</strong>, dentro de la sesión; <strong>close-notify</strong> frena el truncation attack. <strong>TLS 1.3</strong>: 1-RTT (0-RTT en reconexión), cifradores viejos eliminados, forward secrecy por defecto.</p>`,
      },
      {
        title: 'IPsec (red) → VPNs',
        widget: 'ipsec-detail',
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
        widget: 'wpa-detail',
        html: `
<p><strong>WEP</strong> quedó roto por reuso de IV y claves cortas. <strong>802.11i / WPA2</strong>, cuatro fases: descubrimiento → autenticación mutua y clave maestra (EAP contra un servidor AS en empresas, o clave precompartida en Personal) → <strong>four-way handshake</strong> (intercambio de nonces → clave de sesión par-a-par + clave de grupo para broadcast) → tráfico cifrado.</p>
<p><strong>WPA3</strong> (2018): corrige el reuso de nonces explotado por <strong>KRACK</strong>, intercambio de claves más robusto, claves más largas.</p>`,
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
