# NEXORA ANIMATE — motor visual y continuidad v1

## Módulos implementados

- `animate-engine/visual-engine.js`: lienzo por capas con orden Z, opacidad, modos de mezcla, transformaciones, cámara, keyframes interpolados, partículas deterministas y dibujo de imágenes/canvas/vídeo.
- `animate-engine/continuity.js`: biblia local de personajes, fichas canónicas, edición, importación/exportación JSON y validación de diferencias entre una ficha maestra y los datos declarados de un plano.
- `animate-engine/animation-tools.js`: rig 2D normalizado, puntos y huesos, solución IK de dos segmentos, interpolación de poses y conversión de tiempos fonéticos suministrados a visemas.
- `animate-engine/compositor.js`: pistas de escena, orden temporal, audio con punto de entrada/volumen y exportación WebM por MediaRecorder.

## Carga en navegador

Los módulos publican APIs en `window`:
- `NexoraVisualEngine.VisualEngine`
- `NexoraContinuity.ContinuityManager`
- `NexoraAnimationTools.CharacterRig`
- `NexoraCompositor.SceneCompositor`

Cargar los cuatro scripts en el orden visual → continuidad → animación → compositor. No necesitan paquetes ni servicios externos.

## Continuidad

La ficha canónica incluye rostro, ojos, cabello, cuerpo/proporciones, paleta, vestuario, accesorios, rasgos distintivos y voz. Se conserva en el almacenamiento local del navegador y puede exportarse como JSON. La validación detecta contradicciones declaradas; no puede reconocer automáticamente que un rostro generado cambió. Esa comprobación visual requiere un modelo de visión/embeddings que todavía no está conectado.

## Alcance honesto

Este es un motor de composición y animación 2D de navegador, no un generador de fotogramas anime por IA. El rig permite definir articulaciones y resolver posiciones, pero no separa automáticamente un dibujo en capas ni crea píxeles faltantes. La sincronización fonética acepta una pista de fonemas con tiempos; no inventa alineación fonética si el proveedor de voz no la entrega. La exportación WebM depende del navegador.

## Siguiente integración

1. Conectar la biblioteca de personajes al panel de estudio.
2. Adaptar la previsualización existente para que el motor de capas controle cámara y efectos.
3. Guardar proyectos con referencias de activos y timeline.
4. Conectar un backend de generación visual solo después de evaluar modelo, licencia, cómputo y coste.


## Evolución 1.1 — movimiento y escenas

- `animate-engine/motion-system.js`: biblioteca de movimientos reutilizables (reposo, caminar, correr, salto, hablar y recibir impacto), interpolación y línea de tiempo de poses clave. Los rigs se pueden exportar e importar como archivos JSON de movimiento.
- `animate-engine/scene-project.js`: proyectos de escena persistentes, lista de planos consecutivos, duración, personaje vinculado, diálogo, escenario, cámara y reglas de continuidad. Permite validar referencias de personajes, rasgos visuales incompletos, voz contradictoria y solapamientos.
- El estudio incorpora controles para editar movimientos, guardar poses clave, componer planos, previsualizar movimientos de cámara y exportar un WebM de la escena con audio cuando el navegador lo admite.

## Límites de la versión actual

Los movimientos del rig animan la estructura de puntos y huesos como guía visual; no deforman todavía la ilustración original ni reconstruyen las partes ocultas. El compositor exporta el material visual que ya está cargado en sus capas y aplica cámara/tiempo/audio; no genera automáticamente personajes, escenarios o fotogramas anime. La validación de continuidad es estructural y basada en fichas: todavía no compara rostros mediante reconocimiento visual. La voz del personaje se conserva como selección de voz, pero la alineación de fonemas y el lipsync preciso aún necesitan integración de un alineador fonético.

## Siguiente etapa técnica

1. Implementar deformación 2D por malla y pesos de influencia para que los huesos muevan regiones de la ilustración.
2. Separación asistida de personaje/fondo y relleno de zonas ocultas.
3. Comparación visual de referencias por personaje para detectar cambios de rostro, vestuario y proporciones.
4. Alineación fonética con marcas de tiempo para generar visemas y sincronización de boca.
5. Render por lotes de planos y composición multicapa con transiciones, profundidad y audio por pista.


## Evolución 1.2 — biblioteca de referencias y capas

- `animate-engine/asset-store.js`: biblioteca binaria local basada en IndexedDB para conservar imágenes de referencia sin convertirlas en archivos estáticos del sitio.
- Las fichas de personajes permiten adjuntar varias imágenes de referencia. La exportación de la biblia incluye las imágenes en un paquete JSON y la importación las restaura en la biblioteca local.
- El motor visual permite ajustar posición X/Y, escala, rotación y opacidad de la capa del personaje desde el estudio.
- Se incorporó una suite automatizada con Node.js para validar la biblia de personajes, la continuidad de escenas, las poses clave, la cinemática inversa y la conversión de fonemas a visemas.
- GitHub Actions ejecuta estas pruebas en cambios relevantes. La ejecución inicial terminó con 4 pruebas aprobadas y 0 fallidas.

## Persistencia y límites

Los recursos se guardan en IndexedDB del navegador/dispositivo; no se sincronizan automáticamente entre teléfonos o navegadores. Para transferirlos se debe exportar e importar el paquete de biblia. La biblioteca local no es un servicio de almacenamiento en la nube ni un sistema de respaldo remoto.


## Evolución 1.3 — deformación de ilustración 2D

- `animate-engine/mesh-deformer.js`: deformador por malla triangular que divide una imagen en celdas y vuelve a dibujar cada triángulo con una transformación afín.
- Los puntos del rig funcionan como anclas: se captura la posición original y los cambios de posición generan desplazamientos suaves sobre la malla.
- El estudio incorpora resolución horizontal/vertical, intensidad, activar/desactivar, restablecer, importar y exportar la configuración de malla.
- La malla se integra como una capa personalizada del motor visual y se actualiza durante la previsualización de poses.

## Uso recomendado y limitaciones de la malla

1. Carga una ilustración de cuerpo completo.
2. Activa la edición del esqueleto y coloca puntos sobre cabeza, hombros, codos, manos, cadera, rodillas y pies.
3. Activa la deformación de malla.
4. Mueve los puntos con desplazamientos pequeños para comprobar el resultado.
5. Ajusta resolución e intensidad antes de exportar.

La deformación actual es un prototipo geométrico 2D basado en anclas y no separa automáticamente brazos, piernas, pelo o ropa. Puede estirar o distorsionar zonas que se solapan y no reconstruye píxeles ocultos. Para animación de calidad de producción se necesitarán segmentación por partes, pesos de influencia por hueso, mallas adaptativas, corrección de pliegues y reconstrucción/inpainting de zonas ocultas.


## v1.4 — Deformación ponderada por huesos

El deformador de malla admite ahora *bone skinning* 2D: cada hueso toma los puntos iniciales y finales del rig, calcula una transformación rígida (rotación y escala limitada) y aplica influencia suave según la distancia de cada vértice al segmento. El panel permite ajustar el radio de influencia y la intensidad global.

Flujo: cargar una ilustración → colocar los puntos del rig sobre sus articulaciones → activar la deformación. El estudio captura los huesos disponibles del rig y actualiza sus extremos cuando se mueven los puntos. Las configuraciones de esta etapa se exportaban como versión 2; el formato actual es versión 3 e incluye regiones poligonales.

Limitaciones: es deformación geométrica de píxeles existentes. No separa automáticamente partes del cuerpo, no crea píxeles ocultos y no sustituye un sistema de segmentación, máscaras por capa o reconstrucción generativa. Los resultados dependen de la colocación manual del rig y del radio elegido.


## v1.5 — Máscaras poligonales por región

El deformador acepta regiones poligonales con el método setRegions([{ name, boneNames, points, feather }]). Cada región limita los huesos enumerados en boneNames a una zona de la imagen; feather suaviza la transición en el borde. Las regiones se serializan en el formato de malla versión 3 y el importador mantiene compatibilidad con las versiones 1 y 2.

Las coordenadas de los polígonos usan el espacio normalizado de la imagen (0–1). Esta API permite construir máscaras independientes para brazos, piernas, torso u otras piezas, pero todavía requiere que los polígonos sean definidos manualmente. No segmenta automáticamente una ilustración ni crea píxeles ocultos. El editor aún no incluye un trazador visual de polígonos; las máscaras pueden crearse mediante la API o un archivo de malla JSON.


## Evolución 1.8 — jerarquía corporal y base espacial 3D

- `animate-engine/character-skeleton.js`: esqueleto jerárquico 2D con transformaciones locales y mundiales. La inclinación se distribuye entre columna, pecho, cuello, cabeza y hombros; incluye una pose de inclinación coordinada y serialización.
- `animate-engine/spatial-engine.js`: base matemática 3D con cámara perspectiva y ortográfica, órbita, dolly, proyección de puntos y vistas frontal, trasera, izquierda, derecha, superior, inferior y tres cuartos.
- Las APIs se exponen desde `window.NEXORA_ANIMATE_ENGINE.skeleton` y `window.NEXORA_ANIMATE_ENGINE.spatial`.
- La escena de prueba del oficinista ahora rota el conjunto superior alrededor de la cadera para que torso, cuello, cabeza y brazos acompañen el descenso.

### Límite importante de esta etapa 3D

Esta entrega añade jerarquía corporal 2D y matemáticas/cámara de espacio 3D. Todavía no es un renderizador 3D completo: no dibuja mallas 3D con materiales, iluminación física, esqueleto 3D, texturas ni animación de modelos GLB/FBX. Es la base para construir esos subsistemas sin fingir que ya están terminados.


## Evolución 1.9 — mezcla de audio y visor WebGL

- `animate-engine/audio-engine.js`: línea de tiempo multipista para voces de personajes, narración, música, efectos y ambiente. Incluye posición de entrada, volumen, paneo, fundidos, repetición, preescucha y exportación de la configuración de pistas.
- `animate-engine/compositor.js`: mezcla múltiples pistas de audio en la exportación WebM, con volumen, paneo, fundidos y repetición.
- El estudio permite importar varios audios, clasificarlos, ajustar sus parámetros, escuchar la mezcla y añadirlos al render final.
- `animate-engine/spatial-engine.js`: ahora incluye un renderizador WebGL que dibuja geometría triangular 3D con búfer de profundidad, cámara perspectiva/ortográfica y órbita. El visor del estudio muestra una malla cúbica de prueba y permite cambiar de perspectiva.
- El API del estudio expone `audio` y `spatial`; versión 1.9.0.

### Alcance actual del 3D y audio

El visor WebGL ya rasteriza geometría 3D, pero aún no importa modelos GLB/FBX, no tiene esqueleto 3D, materiales PBR, sombras avanzadas ni animación de personajes 3D. La mezcla multipista trabaja con archivos de audio que aporte el usuario y la voz generada disponible en NEXORA VOICE; todavía no es una biblioteca comercial integrada de música y efectos ni genera voces personalizadas por clonación. El lipsync exacto requiere marcas de tiempo fonéticas/alineación por palabra.


## Evolución 2.0 — importación GLB y rig 3D

- `animate-engine/spatial-engine.js`: importa archivos GLB 2.0 con chunks JSON/BIN embebidos, mallas triangulares, índices, colores base de materiales y transformaciones jerárquicas de nodos. El visor encuadra automáticamente el modelo, y permite orbitar con ratón o tacto.
- El importador reporta número de mallas y vértices. En esta etapa las mallas se importan como geometría estática; todavía no se leen skins ni clips de animación GLB.
- `animate-engine/spatial-rig.js`: jerarquía de huesos 3D, transformaciones locales/globales, pose por hueso, plantilla humanoide de 16 articulaciones y deformación CPU por pesos lineales (LBS).
- El rig 3D es una base de animación; aún falta conectar JOINTS/WEIGHTS y inverse-bind matrices de los GLB al rig, así como editor visual, IK 3D, clips y retargeting.
- El estudio expone `NEXORA_ANIMATE_ENGINE.rig3d`; versión 2.0.0.
- Pruebas de regresión para importación GLB, jerarquía 3D y skinning.


## Evolución 2.1 — movimiento 3D e IK

- `animate-engine/spatial-motion.js`: clips 3D por canales de huesos, keyframes temporizados, interpolación lineal de traslación/escala y slerp de cuaterniones, reproducción en bucle y aplicación directa al rig.
- Solver IK 3D de dos huesos basado en longitudes y vector pole; resuelve la articulación intermedia y limita objetivos fuera del alcance.
- El estudio expone `NEXORA_ANIMATE_ENGINE.motion3d`; versión 2.1.0.
- Pruebas para interpolación de poses, aplicación al esqueleto y límites del IK.


## Evolución 2.2 — iluminación por malla y escena de diálogo 3D

- `animate-engine/spatial-engine.js`: el renderizador acepta transformaciones individuales por malla, geometría esférica reutilizable y normales por vértice con iluminación direccional. Esto permite montar personajes 3D por piezas y darles profundidad visual.
- `admin/animate-dino-dialogue.html`: prueba cinematográfica de dos dinosaurios low-poly construidos con mallas 3D, animación de cuerpo, cabeza, cola, brazos y mandíbula, planos generales y primeros planos.
- La escena intenta generar tres líneas de voz en español mediante `/api/admin/voice`; añade ambiente de viento, música tonal original y llamadas de aves sintetizadas. La mezcla se incorpora al WebM mediante MediaRecorder cuando el navegador lo admite.
- El diálogo incluye a Coelo y al dinosaurio mayor. La boca usa pulsos aproximados sincronizados con cada intervención; no es todavía alineación fonética precisa.
- Pruebas de geometría, transformaciones y sintaxis de la escena.
- Versión expuesta del motor: 2.2.0.

### Límites de esta prueba
Los dinosaurios son personajes procedurales de piezas 3D, no modelos escaneados ni personajes GLB con rig importado. La actuación es una animación programada para esta escena. La generación de voz requiere el binding Workers AI y autorización de administración en Cloudflare; si no está disponible, se conservan subtítulos y ambiente.


## Evolución 2.3 — actuación jerárquica en la escena de dinosaurios

- La escena `animate-dino-dialogue.html` carga `spatial-rig.js` y crea un esqueleto 3D por dinosaurio mediante `createDinosaur()`.
- Las piezas visibles se vinculan a huesos de referencia: torso, pelvis, pecho, cuello, cabeza, mandíbula, brazos, piernas y tres segmentos de cola.
- Cada fotograma actualiza las rotaciones locales y recalcula las matrices mundiales del rig. Las piezas heredan el movimiento de sus articulaciones en vez de depender exclusivamente de desplazamientos independientes.
- La suite verifica que la escena cargue el rig y use sus matrices para transformar las piezas.
- La ejecución de GitHub Actions del commit de integración terminó correctamente.

### Auditoría técnica: lo que falta para calidad de producción

1. **Modelos 3D reales:** el demo aún usa esferas low-poly separadas. El importador GLB actual aplana las mallas a geometría estática; no importa skins, pesos JOINTS/WEIGHTS ni clips de animación.
2. **Rig GLB completo:** falta conservar jerarquía, inverse-bind matrices, pesos normalizados, normales transformadas y animaciones del archivo GLB.
3. **Actuación:** falta retargeting de movimiento, ciclos de caminar/correr, equilibrio, contacto de pies/manos, inercia corporal y corrección de penetraciones.
4. **Rostro y lipsync:** la mandíbula se mueve por intensidad aproximada del diálogo. Falta alineación fonética real, visemas temporizados, expresiones faciales y control de ojos/parpadeo.
5. **Render:** faltan materiales PBR, texturas, sombras de contacto, iluminación ambiental, oclusión, profundidad de campo y gestión de recursos de GPU.
6. **Audio:** la línea de tiempo multipista existe y el compositor puede mezclar pistas, pero faltan waveform visible, automatización editable por fotograma, sincronización de eventos y validación de mezcla.
7. **Control de calidad:** las pruebas actuales son de lógica y sintaxis. Falta una batería de pruebas visuales en navegador, exportación de clips de referencia y comparación de fotogramas.
8. **Servicios externos:** las voces dependen de la configuración de Workers AI y de los permisos de administración; no se debe presentar como garantizada si no se valida en el navegador.

### Próxima prioridad

Implementar importación GLB con skins y animaciones conservando los datos del archivo, y después conectar esos modelos al rig y al reproductor de clips 3D. No sustituir modelos reales por más primitivas geométricas ni declarar calidad final sin pruebas visuales y de audio en navegador.


## Evolución 2.4 — importación de datos de skin y rig GLB

- El lector GLB conserva los skins, el orden de articulaciones, las matrices inverse-bind, los nodos y los canales de animación con sus tiempos y valores.
- Las mallas skinned importan `JOINTS_0/WEIGHTS_0` y el segundo conjunto opcional `JOINTS_1/WEIGHTS_1`; los pesos se normalizan y se expanden respetando los índices de triángulos.
- `SpatialRig3D.createFromGLB(parsed, skinIndex)` reconstruye la jerarquía de nodos, conserva transformaciones TRS y descompone matrices de nodos en traslación, rotación y escala cuando es posible. Devuelve el rig, el mapeo de articulaciones y las matrices inverse-bind.
- El skinning CPU admite cuatro u ocho influencias por vértice y un mapeo explícito entre índices del skin e índices del rig.
- La suite cubre lectura de skins, canales de animación, reconstrucción de jerarquía, ocho influencias y mapeo de articulaciones.

### Límite de integración

Esta etapa conserva y prepara los datos del personaje, pero el visor WebGL todavía no reproduce los clips GLB ni actualiza automáticamente los vértices skinned durante cada fotograma. La importación visual actual sigue mostrando la geometría estática. El siguiente paso es conectar el rig reconstruido al búfer dinámico de vértices y al reproductor de clips, y validar modelos reales en navegador.


## Evolución 2.5 — skinning dinámico y reproducción de clips GLB

- El importador conserva posiciones originales de los vértices skinned y las influencias de articulaciones en el mismo orden que la expansión de triángulos.
- El rig calcula matrices de skinning en espacio local de la malla usando la inversa de la transformación mundial del nodo de malla.
- El renderizador puede actualizar dinámicamente el búfer de posiciones de GPU sin recrear toda la malla.
- Se agregó un reproductor de animaciones GLB con selección de clip, pausa, búsqueda temporal, avance por delta, bucle y muestreo de canales de traslación, rotación y escala. Interpolación LINEAR (con slerp para cuaterniones), STEP y CUBICSPLINE.
- El visor 3D del estudio incorpora controles para reproducir y pausar clips de modelos importados.
- La suite valida transformaciones de espacio de malla y muestreo de clips; 26 pruebas automáticas pasan.

### Límite actual

La reproducción está conectada para mallas skinned que tengan datos GLB válidos y un rig compatible. La importación de materiales y texturas PBR, morph targets, animaciones de pesos, varias primitivas con materiales completos y validación visual con archivos GLB reales siguen pendientes. La prueba automática no sustituye una revisión visual en navegador.


### Corrección de compatibilidad GLB — atributos normalizados

- El lector de accessors ahora convierte atributos enteros marcados como `normalized` a sus rangos flotantes definidos por glTF.
- Esto es esencial para pesos de skinning almacenados como bytes o enteros de 16 bits, en lugar de valores float.
- Se añadió cobertura con pesos `WEIGHTS_0` normalizados de tipo unsigned byte; se verifica que el peso máximo se convierta a 1.0.


## Evolución 2.6 — morph targets GLB

- El importador lee targets de posición de primitivas glTF/GLB y expande sus deltas al mismo orden de vértices que la malla renderizada.
- Conserva pesos iniciales definidos en el nodo o en la malla.
- El renderizador combina los deltas ponderados antes del skinning, por lo que las expresiones pueden coexistir con el movimiento de huesos.
- Se añadió un control de intensidad para el primer morph target detectado en el estudio 3D.
- Se añadieron pruebas de deltas ponderados, preservación de la malla base e importación de targets con pesos iniciales.

### Alcance pendiente

El control actual permite probar el primer target de una malla. Aún falta exponer todos los targets por nombre, animar los pesos mediante canales GLB `weights`, procesar morph targets de normales/tangentes y validar modelos faciales reales en navegador.


### Corrección visual — normales tras deformar

Al actualizar posiciones de una malla deformada, el renderer vuelve a calcular normales por triángulo y actualiza también el búfer de normales de GPU. Esto evita conservar la iluminación radial aproximada de la geometría original después del skinning o de un morph target. El cálculo actual es plano por triángulo; el suavizado de normales y tangentes queda como mejora posterior.


- Los morph targets conservan sus nombres desde `mesh.extras.targetNames` cuando están presentes.
- El panel del estudio genera un control deslizante por cada target encontrado, agrupado por malla, y permite pesos negativos y positivos.


## Evolución 2.7 — actuación facial y cortometraje de Coelo

- Nuevo módulo `facial-animation.js`: resuelve morph targets por alias de expresiones, parpadeos por ojo, cejas, apertura de mandíbula y visemas A/E/I/O/U/M/F/L.
- El visor 3D conecta el controlador facial con mallas GLB que incluyan morph targets mediante `setFacialState`.
- La prueba de Coelo incorpora párpados y cejas animados, mirada dirigida al interlocutor, mandíbula articulada y gestos de brazos.
- El bosque añade vegetación, árboles con balanceo suave y luciérnagas animadas.
- La escena se amplía a 25 segundos con encuadres de apertura, primeros planos alternados y cierre. Conserva los tres diálogos originales y añade una respuesta final del dinosaurio mayor: «Para proteger a quienes no pueden defenderse solos».
- La exportación del navegador usa el nombre `NEXORA-Coelo-y-el-musculo-EDICION-MEJORADA.webm`.

La escena sigue usando dinosaurios procedurales de mallas esféricas, no modelos de dinosaurios realistas importados. Las voces dependen de la configuración de Workers AI y de la sesión de administrador. La exportación real solo se produce al reproducir/exportar desde el navegador.

## Evolución 1.3 — actuación cinematográfica 3D

- `animate-engine/spatial-actions.js` proporciona clips reutilizables para reposo, caminar, correr, saltar, aterrizar, girar, hablar, reaccionar a impactos y agacharse.
- El catálogo adapta sus canales a nombres de huesos habituales de rigs humanoides y de dinosaurios. Las mallas deben incluir esqueleto y pesos de influencia para que las poses se reflejen en la geometría.
- Los clips son editables/exportables con el formato de animación espacial y pueden combinarse con animaciones incluidas en archivos GLB.
- El rig conserva una pose de reposo y permite restaurarla. Las acciones respetan las transformaciones iniciales del modelo y evitan acumular desplazamientos al cambiar de movimiento.
- Las transiciones entre acciones pueden mezclarse con interpolación de posición, escala y cuaterniones; el estudio expone un control de duración del fundido.
- Las pruebas cubren locomoción, salto, respuesta corporal, rigs humanoides, conservación de pose inicial y transición entre acciones.

## Límites de esta etapa

Las actuaciones son clips procedurales de esqueleto, no un sistema de captura de movimiento ni una herramienta de animación generativa. La calidad visible depende de la topología, el peso de piel, el nombre y orientación de los huesos, y la calidad del modelo GLB importado. El sistema no crea por sí solo músculos, pliegues, contactos con el suelo ni deformaciones secundarias.

## Evolución 1.4 — actuación facial y secuencias cinematográficas

- El reloj del escenario 3D puede actualizar morph targets faciales junto con el esqueleto y la geometría deformada.
- La interfaz permite seleccionar expresiones y cargar pistas de fonemas/visemas temporizadas en JSON. Se validan los intervalos y los símbolos admitidos.
- La transición entre visemas incluye coarticulación: las formas de boca próximas se mezclan progresivamente, en vez de cambiar de forma instantánea.
- `spatial-actions.js` ahora permite construir secuencias reutilizables de varias acciones por personaje, con duración individual y fundidos entre segmentos.
- El estudio permite agregar, reordenar, quitar, reproducir, importar y exportar un guion de acciones. La secuencia y las pistas faciales comparten el reloj de reproducción.
- Se añadieron pruebas para sincronización facial, coarticulación, cadenas de cuello/cola, reproducción de secuencias, serialización y validación de límites.

## Límites de las secuencias

Los clips son animaciones procedurales de articulaciones, y las pistas fonéticas mueven morph targets nombrados. Para una actuación de calidad profesional se necesita que cada modelo tenga rigging bien orientado, morph targets faciales compatibles y pistas fonéticas reales o alineación de voz. Las pruebas automatizadas verifican la lógica y no sustituyen la revisión visual de cada personaje.


## Evolución 2D — rig humano e interpolación de animación

- El panel 2D puede crear una pose base humana con 13 articulaciones para acelerar el montaje inicial.
- El arrastre de manos y pies resuelve codo o rodilla mediante cinemática inversa de dos segmentos; limita el alcance para conservar las longitudes del brazo o la pierna.
- Las articulaciones laterales pueden espejarse respecto al eje central del personaje.
- Las poses clave admiten interpolación suave, lineal, entrada, salida y mantenimiento. Las claves en el segundo cero se respetan y los archivos antiguos sin tipo de interpolación siguen cargándose.
- Las pruebas verifican IK, simetría, interpolación en el inicio, compatibilidad de movimientos anteriores y rechazo de datos numéricos inválidos.


## Ruta principal 2D — actuación de trabajador y dinosaurio

- El estudio visible queda orientado a 2D. El panel 3D y sus controles se conservan en el código, pero se mantienen ocultos para no interferir con el trabajo actual.
- `animate-engine/character-art.js` dibuja dos personajes vectoriales originales por capas: trabajador con casco, chaleco reflectante, ropa de trabajo y botas; dinosaurio terópodo de perfil con mandíbula, brazos, piernas, placas dorsales y cola segmentada.
- `animation-tools.js` incorpora rigs base reutilizables. El trabajador usa un rig humano; el dinosaurio usa articulaciones separadas en cabeza, mandíbula, cuello, torso, extremidades y cuatro segmentos de cola. Ambos admiten cinemática inversa de dos segmentos en manos y pies.
- `motion-system.js` incorpora clips específicos del trabajador (reposo, caminar, correr, trabajo, levantar, cargar, martillar, excavar y saludar) y del dinosaurio (reposo, caminar, correr, rugir, morder, barrido de cola, impacto y agacharse).
- Cada plano de escena guarda `actorType` y `motionPreset`. `syncSceneCompositor` evalúa la actuación según el tiempo local del plano, por lo que la exportación de escena ya no se limita a mover la cámara sobre una pose fija.
- Los proyectos antiguos migran a trabajador en reposo sin perder sus datos. El estudio carga fichas base de ambos personajes para permitir crear planos sin empezar por una ficha vacía.

## Alcance visual 2D actual

El arte incluido es una ilustración vectorial procedimental original, no una secuencia de dibujos anime pintados fotograma a fotograma. Los clips mueven articulaciones y deforman las siluetas vectoriales; todavía hacen falta trabajo adicional de acting, manos y dedos, anatomía secundaria, expresiones más ricas, contacto con objetos, sombras proyectadas, perspectiva de cámara y revisión visual en navegador para alcanzar calidad de producción. No se presenta este prototipo vectorial como un anime terminado.


## Actuación facial 2D — boca y parpadeo

- El rig del trabajador incluye una mandíbula independiente conectada a la cabeza. El clip `worker-talk` abre y cierra la boca con gestos pequeños de cabeza y manos.
- El trabajador y el dinosaurio ejecutan parpadeos temporizados en el dibujo vectorial, usando el mismo reloj de reproducción que la actuación corporal.
- El rugido y la mordida del dinosaurio ya mueven su mandíbula articulada; los clips de cola y locomoción continúan usando el rig segmentado.
- Las pruebas cubren la nueva articulación mandibular del trabajador, el clip de habla y la conservación de la actuación dinosaurio.
