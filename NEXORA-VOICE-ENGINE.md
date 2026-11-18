# NEXORA VOICE ENGINE

## Objetivo
Síntesis neuronal de voz ejecutada en el navegador. No se utiliza una API de TTS de pago ni se envían textos a un servidor de NEXORA.

## Arquitectura inicial
- Interfaz estática en Cloudflare Pages.
- Inferencia local con Piper TTS, ONNX Runtime Web y WebAssembly dentro de un Web Worker.
- Modelo inicial: voz es_MX (español de México), descargado desde el repositorio público de modelos Piper.
- Conversión WAV → MP3 en el navegador.
- Vista previa mediante un objeto Blob temporal.
- El texto y el audio generado no se escriben en D1, KV, R2, logs de aplicación ni almacenamiento local.
- Los modelos neuronales pueden quedar en OPFS (caché privada del navegador) para evitar descargas repetidas. Esta caché contiene modelos, no contenido del usuario.
- Al salir de la página se termina el Worker y se revoca la URL temporal del audio. Una descarga que el usuario guarde queda bajo el control de su dispositivo.

## Privacidad
La inferencia no requiere una solicitud de texto al servidor. El navegador descarga los archivos del motor y del modelo desde sus distribuidores. Como con cualquier descarga web, esos proveedores pueden recibir metadatos de conexión; NEXORA no recibe el texto que se sintetiza.

## Modelos y atribución
- Piper TTS Web: https://github.com/Mintplex-Labs/piper-tts-web
- Modelos Piper: https://huggingface.co/rhasspy/piper-voices
- Voz es_MX-ald-medium: https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_MX/ald/medium
- La tarjeta del modelo identifica el conjunto de datos de voz Ald Mexican Spanish como Unlicense: https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_MX/ald/medium/MODEL_CARD
- ONNX Runtime Web: https://onnxruntime.ai/

## Límites de esta primera etapa
- La primera descarga del modelo mexicano ronda los 63 MB.
- La velocidad depende del procesador y memoria del dispositivo.
- La voz mexicana disponible en esta etapa es una sola voz preentrenada; no se presenta como un catálogo de voces originales de NEXORA.
- El motor y el flujo de audio deben validarse en los navegadores móviles y de escritorio antes de publicarse en producción.
- No se incorpora ningún endpoint que almacene textos o audios.
