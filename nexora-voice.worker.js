import * as tts from "https://esm.sh/@mintplex-labs/piper-tts-web@1.0.3?bundle";
let activeId = 0;

self.addEventListener("message", async (event) => {
  const { id, text, voiceId, speed } = event.data || {};
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
    let audioBlob = wav;
    if (Number.isFinite(speed) && speed !== 1) {
      self.postMessage({ type: "status", id, message: "Ajustando velocidad…", percent: 94, hint: "Preparando el audio para la vista previa." });
      audioBlob = await changeSpeed(wav, speed);
    }
    const buffer = await audioBlob.arrayBuffer();
    self.postMessage({ type: "done", id, audio: buffer }, [buffer]);
  } catch (error) {
    if (id !== activeId) return;
    self.postMessage({ type: "error", id, message: error?.message || "Error desconocido del motor Piper." });
  }
});

async function changeSpeed(blob, speed) {
  const context = new OfflineAudioContext(1, 1, 22050);
  const decoded = await context.decodeAudioData(await blob.arrayBuffer());
  const duration = decoded.duration / speed;
  const output = new OfflineAudioContext(1, Math.ceil(duration * decoded.sampleRate), decoded.sampleRate);
  const source = output.createBufferSource();
  source.buffer = decoded;
  source.playbackRate.value = speed;
  source.connect(output.destination);
  source.start(0);
  const rendered = await output.startRendering();
  const wav = encodeWav(rendered.getChannelData(0), rendered.sampleRate);
  return new Blob([wav], { type: "audio/wav" });
}
function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) { const s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true); }
  return buffer;
}
