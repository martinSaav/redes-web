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

  /* ================= AMPLIACIÓN ================= */

  /* ---------- Fundamentos ---------- */
  {
    sec: 'Fundamentos',
    q: 'Un enlace satelital tiene MUCHO ancho de banda pero el RTT es de ~500 ms. ¿Qué retardo domina?',
    options: [
      'd_prop: depende de la distancia (36.000 km), no del ancho de banda.',
      'd_trans: al ser mucha distancia, tarda más en empujar los bits.',
      'd_proc: el satélite procesa lento.',
      'd_queue: los satélites siempre están congestionados.',
    ],
    correct: 0,
    explain: 'La confusión clásica. d_trans = L/R es "cuánto tardás en meter el paquete al caño" (depende de R). d_prop = d/s es "cuánto tarda el caño en llevarlo" (depende de la distancia). Autopista ancha no es lo mismo que autopista corta.',
  },
  {
    sec: 'Fundamentos',
    q: '¿Hasta qué capa procesa un ROUTER, y hasta cuál un SWITCH?',
    options: [
      'Router hasta RED (capa 3); switch hasta ENLACE (capa 2).',
      'Los dos hasta transporte (capa 4).',
      'Router hasta transporte; switch hasta red.',
      'Los dos implementan las 4 capas, como los hosts.',
    ],
    correct: 0,
    explain: 'Los hosts implementan las 4 capas. El router necesita la IP para rutear, así que llega a capa 3. El switch solo mira MACs: capa 2. Corolario: ningún dispositivo intermedio abre la capa de transporte (salvo los middleboxes, que por eso "violan" las capas).',
  },
  {
    sec: 'Fundamentos',
    q: 'Enlace de 1 Mbps, usuarios de 100 kbps activos el 10% del tiempo. ¿Cuántos entran con circuitos y cuántos con paquetes?',
    options: [
      '10 con circuitos; ~35 con paquetes (P de más de 10 activos a la vez es ínfima).',
      '10 con los dos: el enlace es el mismo.',
      '35 con circuitos; 10 con paquetes.',
      'Infinitos con paquetes: no hay límite.',
    ],
    correct: 0,
    explain: 'Con circuitos hay que reservar 100 kbps a cada uno todo el tiempo: entran 10. Con paquetes se aprovecha que casi nunca coinciden todos: ~35 usuarios, con probabilidad ~0,0004 de pasarse. Es EL argumento a favor de la conmutación de paquetes.',
  },

  /* ---------- Aplicación ---------- */
  {
    sec: 'Aplicación',
    q: '¿Por qué HTTP es stateless (sin estado)?',
    options: [
      'Para que cualquier servidor pueda atender cualquier request: es lo que permite escalar con mil máquinas detrás de un balanceador.',
      'Porque TCP ya guarda el estado por él.',
      'Porque los diseñadores se olvidaron de agregarlo.',
      'Para que las cookies sean obligatorias.',
    ],
    correct: 0,
    explain: 'Mantener estado por cliente sería caro y frágil (millones de usuarios, qué pasa si el server se cae). Sin estado, cualquier servidor sirve cualquier request. El costo: si la app necesita recordar algo, hay que agregarlo por afuera (cookies).',
  },
  {
    sec: 'Aplicación',
    q: 'Un web cache manda un GET con If-Modified-Since y el objeto NO cambió. ¿Qué responde el servidor?',
    options: [
      '304 Not Modified, SIN cuerpo: ahí está todo el ahorro.',
      '200 OK con el objeto completo, por las dudas.',
      '404 Not Found.',
      '301 Moved Permanently.',
    ],
    correct: 0,
    explain: 'Es el conditional GET. Se transfieren unos pocos bytes en lugar del objeto entero. Si hubiera cambiado, respondería 200 OK con el contenido nuevo.',
  },
  {
    sec: 'Aplicación',
    q: '¿Por qué se dice que P2P es "autoescalable"?',
    options: [
      'Cada peer nuevo agrega demanda PERO también agrega capacidad de subida: el denominador crece con N.',
      'Porque los peers tienen más ancho de banda que los servidores.',
      'Porque el tracker reparte la carga entre servidores.',
      'Porque no usa TCP.',
    ],
    correct: 0,
    explain: 'En cliente-servidor D_cs crece LINEAL con N (el server sube N copias). En P2P el término es N·F/(u_s + Σu_i): N está arriba pero el denominador también crece con N, así que el tiempo se estabiliza.',
  },
  {
    sec: 'Aplicación',
    q: 'HTTP/2 resolvió el head-of-line blocking de HTTP/1.1. ¿Qué problema le QUEDÓ sin resolver?',
    options: [
      'El HOL de TCP: una sola pérdida frena TODOS los streams, porque comparten una única conexión TCP que entrega en orden.',
      'Ninguno: HTTP/2 eliminó todo tipo de bloqueo.',
      'La compresión de headers.',
      'El cifrado del tráfico.',
    ],
    correct: 0,
    explain: 'HTTP/2 intercala frames de varios streams sobre UNA conexión TCP. Pero TCP entrega en orden: si se pierde un segmento, retiene todo lo posterior. Irónicamente, con pérdidas puede andar peor que 1.1 con conexiones paralelas. Eso lo arregla HTTP/3 sobre QUIC.',
  },

  /* ---------- Transporte ---------- */
  {
    sec: 'Transporte',
    q: 'Un servidor web atiende miles de clientes en el puerto 80. ¿Cómo los distingue?',
    options: [
      'Por la CUÁDRUPLA (IP org, puerto org, IP dst, puerto dst): cada cliente forma una distinta.',
      'Por el puerto destino, que es distinto para cada cliente.',
      'Por la dirección MAC de cada cliente.',
      'Abre un puerto nuevo por cliente y se lo informa.',
    ],
    correct: 0,
    explain: 'TCP demultiplexa por la cuádrupla completa; UDP solo por (IP destino, puerto destino). Por eso en UDP dos clientes distintos al mismo puerto caen en el MISMO socket, y en TCP en sockets distintos (uno por accept()).',
  },
  {
    sec: 'Transporte',
    q: 'En Selective Repeat, ¿por qué la ventana debe ser MENOR O IGUAL a la mitad del espacio de números de secuencia?',
    options: [
      'Porque los números se reciclan: con ventana mayor, el receptor no podría distinguir un paquete nuevo de la retransmisión de uno viejo.',
      'Para ahorrar memoria en el emisor.',
      'Porque el estándar TCP lo exige.',
      'Para que los ACKs entren en el header.',
    ],
    correct: 0,
    explain: 'Emisor y receptor tendrían visiones incompatibles de dónde está la ventana y se aceptaría un duplicado como dato nuevo. Con ventana ≤ mitad del espacio, esa ambigüedad es imposible.',
  },
  {
    sec: 'Transporte',
    q: '¿Por qué TCP espera TRES ACKs duplicados para hacer fast retransmit, y no uno solo?',
    options: [
      'Porque la red puede REORDENAR paquetes: un ACK duplicado suelto puede ser un reordenamiento, no una pérdida.',
      'Porque tres es el mínimo que entra en el header.',
      'Porque con uno solo el emisor no sabría qué segmento retransmitir.',
      'Por compatibilidad con Go-Back-N.',
    ],
    correct: 0,
    explain: 'Es el compromiso entre reaccionar rápido y no retransmitir de gusto. Tres duplicados dan bastante confianza de que hubo pérdida y no un simple reordenamiento.',
  },
  {
    sec: 'Transporte',
    q: '¿Por qué el establecimiento de TCP necesita TRES mensajes y no dos?',
    options: [
      'Porque es full-duplex: hay que sincronizar DOS números de secuencia (uno por sentido) y cada extremo debe saber que el otro recibió el suyo.',
      'Porque el primer mensaje siempre se pierde.',
      'Porque uno es para la IP y otro para el puerto.',
      'Porque el tercero lleva los datos obligatoriamente.',
    ],
    correct: 0,
    explain: 'Con dos mensajes el servidor nunca sabría si su ISN llegó. Además el tercer paso evita que un SYN viejo y demorado abra una conexión fantasma.',
  },
  {
    sec: 'Transporte',
    q: 'La app hace dos send() de 100 bytes por TCP. ¿Qué recibe el receptor?',
    options: [
      'Puede recibir 200 bytes en un solo recv(): TCP es byte-stream y NO preserva los límites de los mensajes.',
      'Exactamente dos recv() de 100 bytes cada uno.',
      'Dos mensajes, porque TCP numera segmentos.',
      'Un error, porque hay que mandar de a un mensaje.',
    ],
    correct: 0,
    explain: 'TCP ve un flujo continuo de bytes. Si la app necesita mensajes, tiene que delimitarlos ella (por longitud o separador). Con UDP no pasa: ahí un datagrama es un mensaje.',
  },

  /* ---------- Red · data ---------- */
  {
    sec: 'Red · data',
    q: 'Una IP matchea 138.16.0.0/16 y 138.16.5.0/24 en la tabla. ¿Cuál gana y por qué existe esa regla?',
    options: [
      'Gana el /24 (prefijo MÁS LARGO). Permite convivir agregación con excepciones, como un cliente que cambió de ISP conservando su bloque.',
      'Gana el /16, que es el más general y seguro.',
      'Gana el que esté primero en la tabla.',
      'Se descarta el paquete por ambigüedad.',
    ],
    correct: 0,
    explain: 'Longest Prefix Match: gana el más específico. El ISP viejo sigue anunciando el /16 agregado, el nuevo anuncia el /24 del cliente, y como es más largo el tráfico va al lugar correcto.',
  },
  {
    sec: 'Red · data',
    q: 'En IPv4, ¿dónde se reensamblan los fragmentos de un datagrama?',
    options: [
      'SOLO en el host destino, nunca en los routers intermedios.',
      'En el primer router que los reciba después de fragmentarlos.',
      'En cada router del camino, para verificar el contenido.',
      'En el router de borde de la red destino.',
    ],
    correct: 0,
    explain: 'Principio de mantener la complejidad en los extremos: si cada router reensamblara, debería esperar y guardar todos los fragmentos (que pueden venir por caminos distintos). Ojo: si falta UN fragmento, el destino descarta el datagrama ENTERO.',
  },
  {
    sec: 'Red · data',
    q: 'Se dice que un switching fabric crossbar es "no bloqueante". ¿Qué significa exactamente?',
    options: [
      'Un paquete nunca es bloqueado por otro MIENTRAS vayan a puertos de salida DISTINTOS. Si dos van a la misma salida, uno espera igual.',
      'Que nunca hay conflictos de ningún tipo.',
      'Que no necesita buffers en ninguna parte.',
      'Que puede reenviar sin consultar la tabla.',
    ],
    correct: 0,
    explain: 'El matiz que se pregunta. La matriz de 2N buses permite transferencias en paralelo, pero el bus vertical de cada salida es uno solo. Cuando ese conflicto arma colas en la entrada, aparece el HOL blocking.',
  },
  {
    sec: 'Red · data',
    q: '¿Qué es el HOL blocking en un router?',
    options: [
      'El paquete del FRENTE de una cola de entrada espera una salida ocupada y traba a los de atrás, aunque la salida de ellos esté libre.',
      'Cuando el buffer de salida se llena y se descartan paquetes.',
      'Cuando el TTL llega a cero.',
      'Cuando dos routers anuncian la misma ruta.',
    ],
    correct: 0,
    explain: 'Head-of-the-line: es un bloqueo "por estar atrás del equivocado". Aparece con colas de ENTRADA, es decir cuando el fabric es más lento que la suma de los puertos de entrada.',
  },
  {
    sec: 'Red · data',
    q: '¿Por qué cada puerto de entrada de un router tiene su PROPIA copia de la tabla de reenvío?',
    options: [
      'Para que cada puerto decida solo y en paralelo: si todos consultaran una tabla central, el procesador sería el cuello de botella.',
      'Por si se corrompe la tabla principal.',
      'Porque cada puerto rutea hacia una red distinta.',
      'Para poder aplicar políticas distintas por puerto.',
    ],
    correct: 0,
    explain: 'Es la shadow copy que el procesador de ruteo le baja y le mantiene actualizada. Permite reenviar a line speed. Y ojo con la distinción: tabla de RUTEO (grande, la arma el control plane) no es lo mismo que tabla de REENVÍO (compacta, la usan los puertos).',
  },

  /* ---------- Red · control ---------- */
  {
    sec: 'Red · control',
    q: '¿Cuál es la RAÍZ del problema de count-to-infinity en distance-vector?',
    options: [
      'Un router sabe el COSTO pero no el CAMINO: cuando su vecino dice "yo llego a z", no puede saber que ese camino pasaba por él mismo.',
      'Que los enlaces tienen costos muy grandes.',
      'Que los routers no se sincronizan con un reloj común.',
      'Que se usan números de secuencia de 1 bit.',
    ],
    correct: 0,
    explain: 'Por eso BGP no lo sufre: es PATH-vector, anuncia el AS-PATH completo, así que un AS que ve su propio ASN sabe al instante que sería un bucle. Y link-state tampoco, porque cada router conoce la topología entera.',
  },
  {
    sec: 'Red · control',
    q: 'El poisoned reverse resuelve los bucles de 2 nodos. ¿Y con 3 o más?',
    options: [
      'NO los resuelve: siempre queda un camino indirecto por el que la información falsa vuelve a circular.',
      'También los resuelve, con más rondas de intercambio.',
      'Los resuelve solo si se combina con split horizon.',
      'Los resuelve porque RIP limita a 15 saltos.',
    ],
    correct: 0,
    explain: 'El count-to-infinity es un problema ESTRUCTURAL de distance-vector, no un bug parcheable. El tope de 15 saltos de RIP no lo evita: solo hace que la cuenta termine rápido.',
  },
  {
    sec: 'Red · control',
    q: 'En la selección de ruta de BGP, ¿qué criterio va PRIMERO y qué implica?',
    options: [
      'La local-preference (política): implica que BGP elige por conveniencia comercial, no por el camino más corto.',
      'El AS-PATH más corto: BGP siempre busca el camino más eficiente.',
      'El hot-potato, para sacar el paquete rápido.',
      'El menor router-id, para desempatar rápido.',
    ],
    correct: 0,
    explain: 'Orden: local-preference → AS-PATH más corto → hot-potato (IGP mínimo) → router-id. Que la política vaya primera es la idea central: el resto solo se ejecuta si la política no alcanzó para decidir.',
  },
  {
    sec: 'Red · control',
    q: 'En OSPF, ¿qué es exactamente lo que se floodea por el área?',
    options: [
      'El LSA de cada router (sus enlaces con sus costos): el MAPA crudo. Todos terminan con la misma LSDB y recién ahí cada uno corre Dijkstra.',
      'La tabla de reenvío ya calculada de cada router.',
      'Las distancias mínimas hacia cada destino.',
      'Solo los cambios de las rutas por defecto.',
    ],
    correct: 0,
    explain: 'La diferencia con RIP: OSPF se pasa el mapa crudo, RIP se pasa distancias ya calculadas. Por eso en OSPF un router mentiroso solo arruina su propia tabla, mientras que en DV el error se PROPAGA por los vectores.',
  },

  /* ---------- Enlace ---------- */
  {
    sec: 'Enlace',
    q: 'A quiere mandarle a B, que está en OTRA subred. ¿Por qué MAC hace ARP?',
    options: [
      'Por la del DEFAULT GATEWAY, no por la de B: el broadcast de ARP no sale de la subred.',
      'Por la de B, que es el destino final del paquete.',
      'Por la del servidor DNS.',
      'No hace ARP: usa directamente la IP de B.',
    ],
    correct: 0,
    explain: 'Error clásico. ARP solo resuelve IPs de la MISMA subred. La trama lleva MAC destino = router, pero el datagrama adentro lleva IP destino = B.',
  },
  {
    sec: 'Enlace',
    q: 'Durante el viaje de A hasta B pasando por routers, ¿qué direcciones cambian?',
    options: [
      'Las MAC cambian en CADA salto; las IP de origen y destino NO cambian nunca (salvo NAT).',
      'Cambian las IP en cada salto y las MAC quedan fijas.',
      'Cambian las dos en cada salto.',
      'No cambia ninguna: por eso funciona el ruteo.',
    ],
    correct: 0,
    explain: 'Por eso enlace es SALTO A SALTO y red es PUNTA A PUNTA. Si preguntan cuántas tramas distintas hubo: una por enlace. ¿Y datagramas? Uno solo, viajando adentro de cada una.',
  },
  {
    sec: 'Enlace',
    q: 'A un switch le llega una trama cuya MAC destino NO está en su tabla. ¿Qué hace?',
    options: [
      'Flooding: la manda por todas las interfaces menos la de entrada, y de la respuesta aprende.',
      'La descarta, porque no sabe a dónde mandarla.',
      'Le pregunta al router.',
      'Hace ARP para averiguar dónde está.',
    ],
    correct: 0,
    explain: 'Los 3 casos: en tabla por OTRA interfaz → reenvía solo por ahí; en tabla por la MISMA interfaz → descarta (filtering); no está → flooding. Y aprende siempre mirando la MAC ORIGEN de lo que le llega.',
  },
  {
    sec: 'Enlace',
    q: '¿Por qué la trama Ethernet tiene un payload MÍNIMO de 46 bytes?',
    options: [
      'Para que la trama dure lo suficiente como para que CSMA/CD pueda detectar una colisión antes de terminar de transmitir.',
      'Porque el header IP mide 46 bytes.',
      'Para que el CRC-32 tenga suficientes datos.',
      'Es un valor arbitrario del estándar.',
    ],
    correct: 0,
    explain: 'Si el datagrama es más chico se rellena (padding). El máximo, 1500, es el MTU de Ethernet y de ahí sale toda la historia de la fragmentación IP.',
  },
  {
    sec: 'Enlace',
    q: 'En un enlace trunk 802.1Q entre switches, ¿quién ve las tramas etiquetadas?',
    options: [
      'Solo los switches: el tag se agrega al entrar al trunk y se quita al salir, es transparente para los hosts.',
      'Todos: los hosts también reciben el tag y lo interpretan.',
      'Solo el router que hace el ruteo entre VLANs.',
      'Nadie: el tag es virtual y no viaja en la trama.',
    ],
    correct: 0,
    explain: 'El tag de 4 bytes lleva el VLAN ID de 12 bits (4094 VLANs posibles). Como agrega 4 bytes, la trama máxima pasa de 1518 a 1522.',
  },

  /* ---------- Inalámbrica ---------- */
  {
    sec: 'Inalámbrica',
    q: '¿Cuáles son las DOS razones por las que no se puede hacer CSMA/CD en el aire?',
    options: [
      'Tu propia señal tapa la del otro mientras transmitís, Y la colisión ocurre en el RECEPTOR (terminal oculto), no donde estás vos.',
      'Que el aire tiene más ruido y que las antenas son caras.',
      'Que WiFi usa frecuencias muy altas y que las tramas son cortas.',
      'Que no hay cable y que los hosts se mueven.',
    ],
    correct: 0,
    explain: 'Son dos razones INDEPENDIENTES y conviene decirlas separadas. Por eso 802.11 evita (CA) en vez de detectar (CD), y confirma cada trama con ACK explícito: la ausencia del ACK es la única señal de que algo falló.',
  },
  {
    sec: 'Inalámbrica',
    q: 'En CSMA/CA, si el canal se ocupa mientras el backoff va contando, ¿qué pasa con el contador?',
    options: [
      'Se CONGELA en el valor que iba y retoma después del siguiente DIFS. NO se reinicia.',
      'Se reinicia con un valor aleatorio nuevo, como en Ethernet.',
      'Se pone en cero y transmite apenas se libere.',
      'Se duplica, por backoff exponencial.',
    ],
    correct: 0,
    explain: 'Es LA diferencia con Ethernet, donde se sortea de nuevo. Congelarlo da EQUIDAD: el que ya esperó mucho no vuelve al fondo de la cola.',
  },
  {
    sec: 'Inalámbrica',
    q: '¿Por qué el SIFS es más corto que el DIFS?',
    options: [
      'Para que el ACK salga ANTES de que nadie más pueda arrancar: es prioridad implementada con tiempos.',
      'Para ahorrar tiempo de canal en general.',
      'Porque el ACK es una trama más corta.',
      'Es al revés: el SIFS es más largo.',
    ],
    correct: 0,
    explain: 'El receptor espera solo un SIFS para mandar el ACK, mientras que cualquier otro que quiera transmitir debe esperar un DIFS (más largo). Así nadie le pisa el ACK.',
  },
  {
    sec: 'Inalámbrica',
    q: 'En modo infraestructura, ¿para qué sirve la TERCERA dirección de la trama 802.11?',
    options: [
      'Para el destino final del otro lado del AP: sin ella el AP no sabría a quién reenviar en la LAN cableada.',
      'Para la MAC de broadcast.',
      'Para identificar la VLAN.',
      'Para el checksum de la trama.',
    ],
    correct: 0,
    explain: 'Addr1 = receptor inmediato por radio, addr2 = transmisor (para el ACK), addr3 = la otra punta. Ethernet usa 2 porque no hay puente; el AP sí lo es. Addr4 solo se usa en ad hoc.',
  },
  {
    sec: 'Inalámbrica',
    q: 'Diferencia entre scanning PASIVO y ACTIVO al asociarse a un AP:',
    options: [
      'Pasivo: el host solo escucha beacons. Activo: el host TRANSMITE probe requests y los APs contestan.',
      'Pasivo usa 2.4 GHz y activo usa 5 GHz.',
      'Pasivo lo hace el AP y activo lo hace el host.',
      'Pasivo es sin contraseña y activo es con contraseña.',
    ],
    correct: 0,
    explain: 'Activo descubre más rápido pero gasta batería y ocupa el canal. La asociación y el DHCP posteriores son idénticos en ambos. Secuencia completa: scanning → (autenticación) → asociación → DHCP.',
  },
  {
    sec: 'Inalámbrica',
    q: '¿Por qué en la red celular el handover no corta la conexión y en WiFi sí?',
    options: [
      'Porque se prepara la celda destino ANTES de soltar la origen, y el S-GW (ancla) reengancha el camino de datos.',
      'Porque las antenas celulares tienen más alcance.',
      'Porque el celular usa dos radios a la vez siempre.',
      'Porque en celular no hay que autenticarse de nuevo.',
    ],
    correct: 0,
    explain: 'La red celular está diseñada alrededor de la movilidad desde el principio. En WiFi, cambiar de AP implica re-asociarse (y a menudo pedir IP de nuevo), lo que corta las conexiones.',
  },
  {
    sec: 'Inalámbrica',
    q: 'Te alejás del AP y la velocidad baja de 54 a 6 Mbps. ¿Qué pasó?',
    options: [
      'Modulación adaptativa: al bajar la SNR se pasa a una modulación más robusta y lenta para no dispararse la BER.',
      'El AP te limitó el ancho de banda a propósito.',
      'Se llenó el buffer del AP.',
      'Cambiaste de canal automáticamente.',
    ],
    correct: 0,
    explain: 'Con SNR alta se meten muchos bits por símbolo (64-QAM); al caer se baja a 16-QAM y luego BPSK. Es el trade-off tasa / distancia / errores.',
  },

  /* ---------- Seguridad ---------- */
  {
    sec: 'Seguridad',
    q: '¿Por qué en la práctica se usa criptografía HÍBRIDA y no solo asimétrica?',
    options: [
      'Porque la asimétrica es ~1000× más lenta: se la usa una vez para acordar una clave de sesión y después todo va con AES.',
      'Porque la asimétrica no es segura para mensajes largos.',
      'Porque la simétrica no necesita claves.',
      'Porque los certificados solo funcionan con AES.',
    ],
    correct: 0,
    explain: 'Cada una para lo que es buena: la asimétrica resuelve la distribución de claves, la simétrica da velocidad. Es exactamente lo que hace TLS. Si preguntan cuál se usa, la respuesta es: las dos, así.',
  },
  {
    sec: 'Seguridad',
    q: 'Con el modo ECB, la imagen del pingüino cifrada se sigue reconociendo. ¿Por qué?',
    options: [
      'Porque cifra cada bloque por separado: bloques de texto plano IGUALES producen bloques cifrados IGUALES, y se filtra la estructura.',
      'Porque la clave es demasiado corta.',
      'Porque el IV es predecible.',
      'Porque no usa AES sino RC4.',
    ],
    correct: 0,
    explain: 'CBC lo arregla encadenando: cada bloque se mezcla (XOR) con el cifrado anterior, y el primero con un IV aleatorio. Así bloques repetidos dan cifrados distintos, y el mismo mensaje cifrado dos veces se ve diferente.',
  },
  {
    sec: 'Seguridad',
    q: 'ap3.1 manda la contraseña CIFRADA. ¿Por qué igual se rompe?',
    options: [
      'Por REPLAY: Trudy graba los bytes cifrados y los reenvía tal cual, sin necesidad de descifrarlos.',
      'Porque el cifrado es débil y se puede romper por fuerza bruta.',
      'Porque la contraseña viaja en claro igual.',
      'Porque el servidor no verifica la contraseña.',
    ],
    correct: 0,
    explain: 'El punto fino del tema: cifrar no alcanza si el mensaje es SIEMPRE EL MISMO. Lo arregla ap4.0 con un nonce: Bob manda un R distinto cada vez, así lo grabado no sirve. Moraleja: cifrar no es autenticar.',
  },
  {
    sec: 'Seguridad',
    q: '¿Cuál es la diferencia clave entre HMAC y firma digital?',
    options: [
      'HMAC usa secreto COMPARTIDO (los dos pueden generarlo → sin no repudio); la firma usa la clave PRIVADA del emisor (solo él pudo → hay no repudio).',
      'HMAC cifra el mensaje y la firma no.',
      'La firma es más rápida que el HMAC.',
      'Son lo mismo con distinto nombre.',
    ],
    correct: 0,
    explain: 'Los dos dan integridad y autenticación de origen. Solo la firma da NO REPUDIO. Y ojo: ninguno de los dos da confidencialidad, no ocultan el mensaje.',
  },
  {
    sec: 'Seguridad',
    q: '¿Qué problema resuelven los certificados que la criptografía asimétrica sola no puede?',
    options: [
      'Garantizan que una clave pública es de quien dice ser: sin eso, Trudy sustituye la clave y hace MITM.',
      'Aceleran el cifrado asimétrico.',
      'Permiten cifrar mensajes más largos.',
      'Evitan que se pierda la clave privada.',
    ],
    correct: 0,
    explain: 'Una CA verifica la identidad y firma un certificado X.509 (identidad + clave pública + validez + firma). El navegador lo valida siguiendo la cadena de confianza hasta una CA raíz de su trust store.',
  },
  {
    sec: 'Seguridad',
    q: 'Un atacante forja un paquete con puerto origen 80 y flag ACK, sin que exista ninguna conexión. ¿Qué firewall lo frena?',
    options: [
      'El STATEFUL: busca la conexión en su tabla, no la encuentra y lo descarta. El stateless lo deja pasar.',
      'El stateless, porque sus reglas son más estrictas.',
      'Los dos por igual.',
      'Ninguno: hace falta un IPS.',
    ],
    correct: 0,
    explain: 'El stateless evalúa cada paquete AISLADO, sin memoria: para él es idéntico a una respuesta web legítima. El stateful mantiene tabla de conexiones y solo deja entrar lo que responde a algo que la red interna inició.',
  },
  {
    sec: 'Seguridad',
    q: '¿Por qué los servidores públicos van en una DMZ y no en la red interna?',
    options: [
      'Porque son los más expuestos: si comprometen el servidor web, el atacante queda atrapado en la DMZ con el firewall interno todavía adelante.',
      'Porque necesitan más ancho de banda.',
      'Porque no pueden tener IP privada.',
      'Para que el IDS pueda verlos.',
    ],
    correct: 0,
    explain: 'La DMZ va entre dos firewalls. Es defensa en capas: se asume que lo expuesto eventualmente cae, y se limita el daño.',
  },
  {
    sec: 'Seguridad',
    q: '¿Qué rompió a WEP, y qué lección general deja?',
    options: [
      'El IV de 24 bits se repetía en horas: reusar (clave, IV) en un cifrador de flujo permite cancelar la clave con un XOR.',
      'Que usaba AES con claves cortas.',
      'Que no tenía contraseña.',
      'Que el four-way handshake era vulnerable.',
    ],
    correct: 0,
    explain: 'La regla de oro: NUNCA reusar un IV con la misma clave. WEP además usaba CRC-32 (lineal, no criptográfico) como integridad, así que se podía modificar el mensaje y ajustar el CRC. Y ojo: WPA protege solo el tramo hasta el AP, no reemplaza a TLS.',
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
  /** cambia en cada restart para re-mezclar las opciones */
  private readonly shuffleTick = signal(0);

  readonly pool = computed(() => {
    this.shuffleTick();
    const base = this.filter() === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.sec === this.filter());
    // mezcla las opciones de cada pregunta (si no, la correcta siempre sería la A)
    return base.map((q) => {
      const order = q.options.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      return {
        ...q,
        options: order.map((i) => q.options[i]),
        correct: order.indexOf(q.correct),
      };
    });
  });

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
    this.shuffleTick.update((n) => n + 1);
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
