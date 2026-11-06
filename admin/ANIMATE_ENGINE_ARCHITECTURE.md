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
