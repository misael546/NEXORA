import * as tts from "https://esm.sh/@mintplex-labs/piper-tts-web@1.0.3?bundle";
let activeId = 0;
const originalFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const raw = typeof input === 'string' ? input : input?.url || '';
  const fixed = raw.replace('https://huggingface.co/diffusionstudio/piper-voices/resolve/main/', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/');
  return originalFetch(fixed || input, init);
};

self.addEventListener("message", async (event) => {
  const { id, text, voiceId } = event.data || {};
  if (!id || !text || !voiceId) return;
  activeId = id;
  try {
    self.postMessage({ type: "status", id, message: "Cargando motor neuronal…", percent: 2, hint: "La inferencia se ejecuta en este dispositivo." });
    if (tts.TtsSession) tts.TtsSession._instance = null;
    const wav = await tts.predict(
      { text, voiceId },
      (progress) => {
        if (id !== activeId) return;
        self.postMessage({ type: "progress", id, progress });
      }
    );
    if (id !== activeId) return;
    const buffer = await wav.arrayBuffer();
    self.postMessage({ type: "done", id, audio: buffer }, [buffer]);
  } catch (error) {
    if (id !== activeId) return;
    self.postMessage({ type: "error", id, message: error?.message || "Error desconocido del motor Piper." });
  }
});

