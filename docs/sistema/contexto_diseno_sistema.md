CONTEXTO DEL SISTEMA

Necesito diseñar la interfaz completa de un Sistema de Comando de Incidentes (SCI/ICS), utilizado principalmente por bomberos y otras unidades de emergencia (rescate, servicios de salud, defensa civil). El sistema tiene dos frentes de uso: una plataforma web tipo dashboard para el Centro de Despacho u Operador Central, y una aplicación móvil para el personal en terreno durante la emergencia. El backend ya está construido sobre NestJS con PostgreSQL, expone endpoints REST, websockets para notificaciones en tiempo real y push notifications FCM. Lo que necesito ahora es el diseño de interfaz, sistema de diseño y experiencia de usuario para ambas plataformas.

El sistema no tiene un logo ni identidad de marca institucional previa, la paleta y el sistema de diseño se construyen completamente desde cero, pensados para adaptarse a n unidades de emergencia distintas, no una institución específica.

DIRECCIÓN VISUAL GENERAL

El diseño debe ser minimalista y profesional, sin elementos decorativos innecesarios, sin ruido visual, con jerarquía clara y espacios en blanco bien utilizados. Minimalista no significa vacío o frío, significa que cada elemento en pantalla tiene un propósito funcional claro, que la interfaz respira, y que el usuario nunca tiene que buscar entre elementos superfluos para encontrar lo que necesita. La estética debe transmitir seriedad institucional y confianza, similar a herramientas profesionales de misión crítica, evitando cualquier estética lúdica, infantil o de consumo masivo. Al mismo tiempo, todo el minimalismo debe estar subordinado a la usabilidad bajo estrés, nunca sacrificar claridad funcional por estética limpia, si un botón necesita ser grande y evidente para poder tocarse rápido con guantes, se prioriza eso por sobre la elegancia visual.

CONTEXTO DE USO Y CONDICIONES REALES DEL USUARIO

Quienes usarán este sistema son bomberos y personal de emergencia trabajando bajo condiciones de estrés físico y mental real, no un usuario de oficina tranquilo. Debes diseñar pensando en lo siguiente:

El usuario puede estar en el lugar del incidente, con adrenalina alta, necesitando registrar información en segundos, no minutos. El usuario puede estar usando guantes, con las manos sucias, mojadas o temblando, por lo que los elementos táctiles deben ser grandes y con área de toque generosa, evitar elementos pequeños o de precisión fina. El usuario puede estar en condiciones de muy poca luz, de noche, dentro de estructuras con humo, o en el extremo opuesto, bajo luz solar directa e intensa donde las pantallas se ven poco por el brillo ambiental. Por eso el diseño debe funcionar bien tanto en modo oscuro como en modo claro, con alto contraste en ambos casos, y evitar depender de matices sutiles de color para transmitir información importante. El usuario puede tener conectividad intermitente o nula, así que la interfaz debe comunicar claramente el estado de sincronización, qué está guardado localmente, qué está pendiente de subir y qué ya se sincronizó con el servidor.

Existen dos momentos de uso completamente distintos que deben reflejarse en el diseño: el momento de captura rápida durante la emergencia activa, donde todo debe ser mínimo número de toques, campos cortos, valores por defecto inteligentes, selección antes que tipeo; y el momento de revisión y edición posterior a la emergencia, donde el mismo usuario o un superior revisa, corrige y completa la información con más calma, en una vista más detallada tipo escritorio, sin la presión de tiempo del terreno. El diseño debe soportar ambos modos sin que se sientan como sistemas distintos.

FUNDAMENTO DE PSICOLOGÍA DEL COLOR APLICADO AL CONTEXTO

Un usuario en fatiga, estrés agudo o nerviosismo tiene la atención y la capacidad de procesamiento reducidas. Los colores muy saturados y cálidos como el rojo puro y el naranja intenso elevan fisiológicamente la sensación de urgencia, útil solo cuando hay una urgencia real que comunicar, como el triage crítico, pero contraproducente si se usan como color de marca o de interfaz general, porque satura al usuario de señales de alarma constantes y genera fatiga de atención. Los tonos azules profundos transmiten estabilidad, orden, autoridad y confianza, y reducen la percepción de estrés, por eso son la base ideal como color primario de este sistema. El verde y el ámbar se reservan para estados de éxito y advertencia respectivamente con tonalidades deliberadamente distintas a los colores fijos del triage, para no generar ambigüedad. Los neutros deben tener temperatura fría, no cálida ni completamente neutra, para que el sistema se perciba coherente, ordenado y descanse la vista en sesiones prolongadas, tanto de día como de noche.

Además del tono, importa la cantidad de color simultánea en pantalla. Se debe aplicar un principio de dominancia neutra: la mayor parte de cada pantalla debe ser neutros de fondo y texto, y el color se reserva casi exclusivamente para estados, acciones principales y alertas, de forma que cuando aparezca un color, el cerebro fatigado lo identifique de inmediato como información relevante, sin ruido visual de color decorativo compitiendo por atención.

PALETA DE COLORES DEFINIDA

Color primario de marca: azul profundo institucional, hex 1E3A5F, con variante algo más saturada 1B4965 para botones principales y elementos de marca. Comunica autoridad, calma y control, y es completamente distinto en tono y percepción al rojo de triage.

Color secundario de acento: azul petróleo o cian vivo, hex 2E86AB, usado para elementos interactivos secundarios, enlaces, iconografía activa y elementos que necesitan destacar sin generar alarma.

Color de éxito o confirmación: verde esmeralda azulado, hex 2A9D8F, deliberadamente distinto del verde de triage. Se usa para checks, sincronización exitosa y formularios guardados correctamente, nunca para clasificación de víctimas.

Color de advertencia: ámbar dorado, hex E9C46A, con variante más intensa F4A261 si se necesita mayor contraste. Se usa para estados que requieren atención pero no son críticos, como sincronización pendiente, campos incompletos o emergencias en estado pendiente de activar.

Color de error o crítico del sistema: rojo oscuro tipo vino o granate, hex 9D2B2B, con variante más viva C1121F si se necesita mayor notoriedad, siempre notoriamente distinto del rojo puro de triage (tipo E63946 o similar) y siempre reforzado con ícono, nunca solo color, por ejemplo un triángulo de alerta para error de sistema versus una cruz o gota para triage crítico.

Color de información neutra: azul grisáceo suave, hex 6C91BF, para tooltips, mensajes informativos y ayudas contextuales sin acción inmediata requerida.

Neutros para modo claro: fondo principal hex F5F7FA, superficies de tarjetas en blanco puro FFFFFF, texto principal en gris muy oscuro con temperatura fría hex 1A1D23, para máximo contraste bajo luz solar directa.

Neutros para modo oscuro: fondo principal en gris azulado muy oscuro hex 12161C, nunca negro puro, superficies de tarjetas un tono más claro hex 1C2128, texto principal en blanco roto hex E8EAED, para reducir fatiga visual nocturna evitando el contraste extremo de blanco puro sobre negro puro.

Colores de triage, reservados exclusivamente y nunca reutilizables en ningún otro contexto de la interfaz: rojo puro intenso para inmediato o crítico, amarillo puro intenso para diferido, verde puro brillante para leve o ambulatorio, y negro o gris muy oscuro con un ícono distintivo de refuerzo para fallecido, ya que el negro puede confundirse con elementos de interfaz en modo oscuro si no se refuerza visualmente.

TIPOGRAFÍA Y LEGIBILIDAD

La tipografía debe ser sans-serif, muy legible a distancia y en movimiento, con buen soporte de números claros y diferenciables entre sí, por ejemplo el cero y la letra O deben distinguirse bien, igual que el uno y la letra I, dado que se van a escribir muchos códigos como EMG-XXX, F201-XXX, F207-XXX y NN-001. Los tamaños de fuente en el contexto móvil de terreno deben ser más grandes que el estándar habitual de apps, priorizando legibilidad sobre densidad de información. En el contexto web de escritorio para el centro de despacho se puede permitir mayor densidad de información, pero manteniendo jerarquía visual clara y coherente con el minimalismo general del sistema.

PRINCIPIOS DE DISEÑO PARA CARGA RÁPIDA DE DATOS

Prioriza selección sobre tecleo en todo lo posible, usando selectores, chips, botones grandes de opción única o múltiple, y minimiza los campos de texto libre a lo estrictamente necesario. Cuando se necesite texto libre, como en la bitácora de acciones, ofrece siempre la alternativa de nota de voz con un botón de micrófono grande y de fácil acceso con una sola mano. Usa valores por defecto inteligentes, como el rol SCI de equipo de ataque al asignar personal sin especificar cargo, o la fecha y hora actual precargada en los formularios. Diseña formularios largos como flujos por pasos cortos en vez de una sola pantalla larga, especialmente en el formulario 201, el formulario 207 y el registro de víctimas, para que el usuario nunca sienta que debe completar todo de una vez bajo presión, pudiendo guardar avances parciales.

Diseña estados de carga, guardado y error muy visibles y persistentes, no solo un toast que desaparece en dos segundos, porque el usuario puede estar mirando la pantalla de reojo. Confirma visualmente cuando una acción se guardó, ya sea localmente en modo offline o en el servidor, con un indicador claro y distinto para cada caso.

DISEÑO PARA EDICIÓN POSTERIOR

Una vez finalizada la emergencia, el sistema pasa a modo de solo lectura o revisión según el estado, salvo lo que la máquina de estados permita editar antes de finalizar. Diseña una vista de revisión clara tipo expediente o reporte, minimalista y ordenada, donde toda la información capturada en terreno durante la emergencia se pueda repasar de forma clara, corregir donde el estado del sistema lo permita, y donde quede visualmente evidente qué partes ya están finalizadas e inmutables, como el formulario 201 finalizado o una emergencia cerrada, versus lo que aún se puede editar.

ARQUITECTURA DE INTERFAZ POR PLATAFORMA

Para la plataforma web de Centro de Despacho, diseña un dashboard principal con mapa general de incidentes activos con pines diferenciados por tipo de coordenada, punto del incidente, puesto de comando y área de espera, listado de emergencias con su estado, y accesos rápidos a gestión de usuarios, cargos SCI y catálogo de equipamiento, todo pensado para pantallas grandes y uso con mouse y teclado, con más densidad de información y tablas, siempre manteniendo el enfoque minimalista y profesional.

Para la aplicación móvil de terreno, diseña una experiencia enfocada en la emergencia activa del usuario, con navegación simple de pocos niveles, accesos directos y grandes a bitácora con nota de voz, registro de víctimas y triage, formulario 207, organigrama SCI de la emergencia, y estado de sincronización siempre visible. Todo pensado para uso con una mano, en movimiento y con conectividad inestable.

INTERFAZ SEGÚN ROL DE USUARIO

El diseño debe contemplar interfaces condicionales según el rol del usuario, admin con acceso total incluyendo gestión de usuarios y cargos SCI, manager con gestión operativa total y activación o desactivación de usuarios pero sin poder crearlos, advanced con gestión operativa sin tocar usuarios, y basic con acceso acotado a la emergencia en la que participa según su rol SCI asignado. Diseña además el caso especial donde un usuario basic asignado como Comandante de Incidente en una emergencia específica debe ver una interfaz elevada equivalente a manager solo dentro de esa emergencia, y debe quedar claro visualmente que ese poder es contextual a esa emergencia y no un cambio de su rol global.

FLUJOS QUE DEBEN DISEÑARSE

Autenticación y perfil de usuario, con login simple y pantalla de perfil editable.

Creación y georreferenciación de emergencias con selección de coordenadas en mapa interactivo para incidente, puesto de comando y área de espera, y control de cambio de estado de la emergencia entre pendiente, activa, finalizada y cancelada, con confirmaciones claras antes de una acción irreversible.

Evaluación inicial de riesgos, formulario reservado al Comandante de Incidente, con campos de evaluación de riesgos, caracterización del incidente, consideraciones especiales y objetivos iniciales.

Organigrama SCI y convocatoria de personal, con una vista de árbol jerárquico visual del organigrama de la emergencia mostrando los niveles desde Comandante de Incidente hasta equipos de ataque, un modal para añadir personal seleccionando usuario y cargo SCI con valor por defecto de equipo de ataque, y una acción diferenciada y con confirmación reforzada para traspasar el mando de Comandante de Incidente.

Formulario 201, con vista de inicio si no existe uno activo, vista de edición mientras está activo mostrando el snapshot congelado del organigrama al momento de creación, y una acción clara de finalización que deje el formulario en modo solo lectura de forma visualmente evidente.

Formulario 207 y triage de víctimas, con creación rápida de planilla, registro de víctima con datos mínimos, selector de clasificación de triage grande y con los cuatro colores estándar más ícono o etiqueta de texto acompañando cada color, datos de traslado, y una línea de tiempo médica que muestre la evolución de clasificación de cada víctima a lo largo del tiempo.

Inventario, despacho y devolución de recursos, con catálogo de equipos, panel de despacho a la emergencia indicando frente asignado, y acción de devolución que reincorpore el stock.

Bitácora operativa con notas de voz, como línea de tiempo cronológica de novedades con opción de texto rápido o grabación de audio con un botón de micrófono grande de fácil acceso, mostrando reproductor integrado cuando la acción tiene audio adjunto.

Notificaciones en tiempo real, con indicador visual y sonoro discreto pero perceptible bajo ruido ambiental, diferenciando notificaciones generales de notificaciones específicas de una emergencia.

Sincronización offline, con indicador persistente y siempre visible del estado de conexión y de la cola de sincronización pendiente, y manejo visual claro de conflictos de sincronización, por ejemplo cuando una emergencia fue cerrada mientras el usuario estaba sin conexión, mostrando qué pasó con esos datos capturados localmente.

ACCESIBILIDAD GENERAL

El sistema debe cumplir buenas prácticas de accesibilidad más allá de lo cosmético, contraste alto verificado, tamaños de toque mínimos generosos, no depender solo de color para transmitir estado, soporte de texto escalable sin romper el diseño, y considerar que el usuario puede estar usando el dispositivo con una sola mano o con guantes.

ENTREGABLES ESPERADOS

Sistema de diseño con la paleta de colores ya definida en modo claro y modo oscuro, incluyendo colores de marca, estados y la reserva especial de los cuatro colores de triage, tipografía y escalas de tamaño, componentes base como botones, inputs, selectores, tarjetas, indicadores de estado y de sincronización, todo bajo una estética minimalista y profesional. Wireframes o mockups de las pantallas principales de los diez flujos descritos, tanto en versión web como en versión móvil donde aplique. Guía de comportamiento de los estados de conectividad y sincronización. Guía de diferencias de interfaz según rol de usuario.