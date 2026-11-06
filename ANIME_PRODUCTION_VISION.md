# NEXORA ANIMATE — Dirección de producción anime

## Decisión de producto

NEXORA ANIMATE se enfocará en producir secuencias y episodios de anime 2D con acabado cinematográfico. No será principalmente un editor de filtros para mover una imagen fija. La meta de calidad es competir con producciones de animación profesionales; esa meta deberá demostrarse mediante pruebas visuales, continuidad y revisión, no asumirse por tener una interfaz.

## Reglas creativas obligatorias

1. **Sin narrador por defecto.** La historia se cuenta mediante actuación, diálogos, sonidos, música, composición visual y acciones. No se genera una voz que explique lo que sucede.
2. **Voces por personaje.** Cada personaje tiene una identidad vocal persistente: timbre, tono, ritmo, acento/idioma, edad interpretativa y rasgos de personalidad. Solo habla el personaje al que corresponde el turno de diálogo.
3. **Actuación, no solo movimiento.** Cada línea se interpreta con intención, emoción, pausas, respiración, mirada, postura, gestos, manos y reacción de los demás personajes.
4. **Sincronización labial.** La boca debe seguir fonemas/visemas y tiempos reales del audio, no abrirse y cerrarse al azar.
5. **Continuidad de identidad.** Rostro, proporciones, peinado, vestuario, accesorios, paleta y rasgos distintivos deben mantenerse entre planos y escenas.
6. **Escenarios con vida.** Fondo, clima, iluminación, partículas, vegetación, agua, humo, polvo, cabello, ropa y objetos reaccionan de forma coherente con la escena.
7. **Cinematografía.** Planos generales, medios, primeros planos, ángulos, composición, profundidad, movimientos de cámara, enfoque y transiciones con intención narrativa.
8. **Animación corporal convincente.** Peso, equilibrio, anticipación, aceleración, impacto, seguimiento, contacto con el suelo y recuperación. Las peleas requieren coreografía espacial y continuidad de posiciones.
9. **Audio de escena.** Diálogo por personaje, ambiente, efectos, pasos, impactos y música. Mezcla con niveles y sincronización; nunca sustituir diálogo por una narración explicativa.
10. **Control de calidad.** Revisar continuidad, deformaciones, manos, ojos, dientes, vestuario, sincronía, cortes, audio y fotogramas defectuosos antes de marcar un clip como terminado.

## Flujo de producción

### 1. Biblia de la serie
- Premisa, género, tono, mundo, reglas y referencias visuales.
- Fichas de personajes con modelo visual, proporciones, vestuario, personalidad, voz, gestos y hoja de expresiones.
- Guía de color, iluminación, escenarios, objetos y diseño sonoro.

### 2. Guion de escena sin narrador
- Dividir la historia en escenas y planos.
- Diálogo etiquetado con el ID del personaje que habla.
- Indicar emoción, intención, pausas, acciones, miradas y reacciones.
- Definir sonidos y música por plano.
- No asignar una voz si no existe un personaje que realmente esté hablando.

### 3. Storyboard y animatic
- Diseñar cada plano con composición y duración.
- Revisar ritmo, continuidad espacial y actuación antes de producir los planos finales.
- Permitir aprobar y corregir escenas antes de renderizar el episodio completo.

### 4. Producción visual
- Crear fondos y elementos por capas cuando sea necesario.
- Mantener referencias maestras de los personajes.
- Generar poses clave, intermedias, expresiones y movimientos de cámara.
- Componer efectos ambientales y luz con profundidad.
- Reutilizar modelos, fondos y elementos aprobados para preservar continuidad.

### 5. Voz y actuación
- Asignar una voz fija a cada personaje.
- Generar cada intervención por separado con el servicio de voz disponible y consentimiento/licencia adecuados.
- Guardar duración, pausas, fonemas/visemas y metadatos de emoción.
- Sincronizar boca y actuación corporal con el audio.
- Permitir revisar y sustituir una interpretación sin rehacer toda la escena.

### 6. Composición y sonido
- Montar planos en orden.
- Sincronizar diálogo, efectos, ambiente y música.
- Mantener continuidad de luz, color, posición, mirada y sonido entre cortes.
- Renderizar máster y versiones de previsualización.

### 7. Control y galería
- Ejecutar controles automáticos y revisión visual/sonora.
- No publicar automáticamente un render fallido.
- Guardar proyecto, recursos, audio, metadatos y vídeo final.
- La galería muestra solo producciones terminadas y aprobadas; el motor y las herramientas quedan internos.

## Arquitectura técnica objetivo

- **Orquestador de producción:** convierte una petición creativa en biblia, escenas, planos, tareas y dependencias.
- **Gestor de continuidad:** mantiene referencias y datos canónicos de personajes, escenarios, objetos, vestuario y voces.
- **Motor de imagen/animación:** genera o compone fondos, personajes, poses, movimiento y cámara. Debe admitir modelos intercambiables y procesamiento por lotes.
- **Motor de voz:** voces por personaje, diálogo por turnos, almacenamiento de audio y metadatos de sincronía.
- **Motor de composición:** capas, efectos, color, cámara, montaje y mezcla de sonido.
- **Renderizador:** exportación de vídeo con audio sincronizado en formatos compatibles con navegadores y dispositivos.
- **Biblioteca de activos:** archivos maestros, versiones, referencias y renders; no depender de guardar vídeos grandes en GitHub.
- **Galería privada:** catálogo de obras aprobadas, reproducción y descarga.

## Límites y honestidad técnica

La versión actual del estudio es un prototipo procedural que mueve una imagen y aplica efectos; no alcanza el estándar descrito. La nueva dirección exige reemplazar progresivamente ese enfoque por una cadena de producción real.

GitHub almacena código y archivos de texto; Cloudflare Pages publica la aplicación, pero ninguno de los dos, por sí solo, genera animación anime avanzada. Una producción de calidad profesional requiere modelos de imagen/vídeo/animación, almacenamiento de recursos, renderizado y capacidad de cómputo. Antes de integrar cualquier proveedor o modelo se deben comprobar licencia, derechos de uso, coste, cuotas, privacidad, disponibilidad y posibilidad de ejecución local o gratuita.

No se debe consumir crédito de generación de vídeo de ChatGPT para producir los episodios. Priorizar herramientas abiertas, modelos autoalojables y opciones gratuitas verificadas; no afirmar que son ilimitadas ni que alcanzan calidad profesional hasta comprobarlo con pruebas.

## Etapas de implementación

1. Definir un formato de proyecto con personajes, voces, escenas, planos, diálogo, acciones, audio y activos.
2. Crear la biblia de personajes y el gestor de continuidad.
3. Diseñar el guion técnico, storyboard y animatic.
4. Integrar un motor visual real y comprobar consistencia en una escena corta.
5. Integrar voces por personaje y sincronización labial fonética.
6. Añadir actuación corporal, cámara, fondos animados y composición.
7. Construir renderizado, almacenamiento privado, control de calidad y publicación a la galería.
8. Probar un corto completo antes de prometer producción de episodios largos.

## Criterio de aceptación de una escena

Una escena no se considera terminada solo porque exporta un archivo. Debe conservar la identidad de los personajes; mostrar actuación corporal y facial coherente; tener diálogo asignado al personaje correcto; sincronizar labios y audio; incluir ambiente y composición visual trabajados; mantener continuidad entre planos; y superar revisión de imagen y sonido.
