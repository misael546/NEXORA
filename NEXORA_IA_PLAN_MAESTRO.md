# NEXORA IA y NEXORA ANIMATE — Plan maestro

## Identidad del producto

- **NEXORA** es la plataforma.
- **NEXORA IA** es la inteligencia conversacional disponible mediante una burbuja flotante en las páginas autorizadas.
- **NEXORA ANIMATE** es el producto de creación audiovisual y una de las herramientas principales que NEXORA IA puede utilizar.

La experiencia pública debe estar en español (es-MX) de forma predeterminada. Los nombres propios de producto, formatos técnicos y tecnologías pueden conservarse cuando corresponda, pero los textos, instrucciones, estados, errores, botones y mensajes dirigidos al usuario deben estar en español claro.

## Experiencia pública

### NEXORA ANIMATE
La pantalla de creación será deliberadamente sencilla:
1. Un campo donde el usuario describe el vídeo.
2. Una opción para adjuntar imágenes de referencia o personajes.
3. Un botón **Crear vídeo**.
4. Un estado comprensible, por ejemplo **Preparando tu vídeo**, **Creando fotogramas**, **Montando audio y vídeo** y **Vídeo listo**. La interfaz puede resumir estos estados y no revelar herramientas internas.
5. Un reproductor para revisar el resultado y una opción **Descargar vídeo**.

La complejidad del guion, desglose de escenas, generación de fotogramas, continuidad, audio, render y control de calidad permanece en los servicios internos. Los usuarios no deben tener que operar el estudio técnico.

### NEXORA IA
La burbuja de chat debe estar disponible de forma consistente en las páginas públicas que la habiliten. Debe permitir:
- conversación general y ayuda para navegar NEXORA;
- escritura, ideas, guiones y planificación;
- iniciar trabajos de NEXORA ANIMATE cuando el usuario lo solicite;
- explicar el estado de una tarea y enlazar al resultado;
- conservar contexto de conversación con controles claros de privacidad.

NEXORA IA no debe afirmar que generó, guardó o publicó algo hasta recibir confirmación del servicio correspondiente.

## Arquitectura propuesta

1. **Interfaz web en español:** chat, panel simple de creación, historial y reproductor.
2. **API de NEXORA:** autenticación, límites de uso, validación y autorización de herramientas.
3. **Orquestador de NEXORA IA:** interpreta solicitudes, solicita aclaraciones esenciales y decide qué herramienta autorizada usar.
4. **Memoria y conocimiento:** documentación del producto, biblioteca de personajes y contexto de cada usuario con consentimiento y controles de retención.
5. **NEXORA ANIMATE:** planificación de escenas, activos, rig 2D, generación secuencial de fotogramas, continuidad, composición, audio y exportación.
6. **Cola de trabajos y trabajadores:** tareas asíncronas, progreso, reintentos limitados y cancelación.
7. **Evaluación de calidad:** pruebas de continuidad visual, estabilidad de personaje, fotogramas corruptos, sincronización y validez del archivo final.

## Entrenamiento y mejora responsable

No se presupone que un modelo base se entrene solo por guardar conversaciones. La mejora se divide en mecanismos distintos:
- **Conocimiento recuperable (RAG):** documentación y ejemplos revisados, actualizables sin reentrenar el modelo.
- **Memoria:** preferencias y contexto autorizados, separados de los datos de entrenamiento.
- **Evaluaciones:** conjuntos de pruebas en español para medir exactitud, seguimiento de instrucciones, calidad de guiones y consistencia de animación.
- **Datos de mejora:** ejemplos aportados voluntariamente o aprobados, con permisos y eliminación de datos personales.
- **Ajuste fino/adaptadores:** solo cuando exista un conjunto de datos suficiente, legalmente utilizable y una evaluación que demuestre una mejora real.
- **Versionado y reversión:** cada cambio del modelo, prompt, conocimiento o motor debe poder compararse y revertirse.

No se debe entrenar con conversaciones privadas de usuarios por defecto. La memoria individual no equivale a permiso para usar datos en entrenamiento.

## Seguridad y privacidad

- Las claves y credenciales solo se almacenan en secretos del servidor, nunca en HTML o JavaScript público.
- La API valida sesión, tamaño y tipo de archivos, permisos, cuotas y límites de tareas.
- Las herramientas disponibles para NEXORA IA usan una lista permitida y permisos por usuario.
- Los archivos subidos se aíslan por usuario y se eliminan según una política de retención visible.
- Los usuarios pueden borrar conversaciones, activos y memoria cuando se habilite esa función.
- No se promete generación ilimitada ni entrenamiento autónomo sin infraestructura y presupuesto confirmados.

## Orden recomendado de implementación

1. Mantener el idioma español es-MX consistente en todas las páginas, estados y mensajes.
2. Definir API y modelo de datos de tareas de vídeo.
3. Crear el panel público mínimo de NEXORA ANIMATE.
4. Conectar de forma segura la cola de render y el motor existente.
5. Añadir la burbuja de NEXORA IA y un backend conversacional.
6. Dar al asistente herramientas autorizadas para crear vídeos y consultar estados.
7. Construir evaluaciones de calidad y el ciclo de mejora del modelo.

## Criterio de aceptación

Un usuario puede entrar, describir un vídeo en español, opcionalmente adjuntar una referencia, recibir estados honestos, ver el resultado terminado y descargarlo. Desde cualquier página habilitada puede abrir NEXORA IA y conversar en español sin perder su contexto de trabajo.
