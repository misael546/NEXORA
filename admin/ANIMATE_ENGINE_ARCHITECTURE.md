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
