const $ = (id) => document.getElementById(id);
const textInput = $("nvText");
const voiceInput = $("nvVoice");
const speedInput = $("nvSpeed");
const generateButton = $("nvGenerate");
const progressBox = $("nvProgress");
const worker = new Worker("./nexora-voice.worker.js", { type: "module" });
let currentObjectUrl = null;
let currentJob = 0;
let busy = false;

function clearAudio() {
  $("nvPlayer").pause();
  $("nvPlayer").removeAttribute("src");
  $("nvPlayer").load();
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
  $("nvResult").hidden = true;
  $("nvEmpty").hidden = false;
}
function setProgress(message, percent, hint) {
  progressBox.hidden = false;
  $("nvStatus").textContent = message;
  $("nvPercent").textContent = percent == null ? "…" : Math.round(percent) + "%";
  $("nvProgressBar").style.width = (percent == null ? 8 : Math.max(0, Math.min(100, percent))) + "%";
  if (hint) $("nvProgressHint").textContent = hint;
}
function setBusy(value) {
  busy = value;
  generateButton.disabled = value;
  generateButton.textContent = value ? "Generando voz…" : "✦ Generar voz";
}
textInput.addEventListener("input", () => {
  $("nvCount").textContent = textInput.value.length.toLocaleString("es-MX") + " / 2,500";
});
$("nvClearText").addEventListener("click", () => {
  textInput.value = "";
  textInput.dispatchEvent(new Event("input"));
  textInput.focus();
});
speedInput.addEventListener("input", () => {
  $("nvSpeedValue").textContent = Number(speedInput.value).toFixed(2).replace(/0$/, "") + "×";
});

function loadMp3Encoder() {
  if (window.lamejs?.Mp3Encoder) return Promise.resolve(window.lamejs);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-nv-lame]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.lamejs), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
    script.dataset.nvLame = "1";
    script.onload = () => window.lamejs?.Mp3Encoder ? resolve(window.lamejs) : reject(new Error("No se pudo iniciar el codificador MP3."));
    script.onerror = () => reject(new Error("No se pudo cargar el codificador MP3. Revisa tu conexión e inténtalo otra vez."));
    document.head.appendChild(script);
  });
}
async function wavToMp3(wavBuffer) {
  const lame = await loadMp3Encoder();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const context = new AudioCtx();
  try {
    const decoded = await context.decodeAudioData(wavBuffer.slice(0));
    const samples = decoded.getChannelData(0);
    const encoder = new lame.Mp3Encoder(1, decoded.sampleRate, 128);
    const frameSize = 1152;
    const chunks = [];
    for (let offset = 0; offset < samples.length; offset += frameSize) {
      const slice = samples.subarray(offset, Math.min(offset + frameSize, samples.length));
      const pcm = new Int16Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        const value = Math.max(-1, Math.min(1, slice[i]));
        pcm[i] = value < 0 ? value * 32768 : value * 32767;
      }
      const encoded = encoder.encodeBuffer(pcm);
      if (encoded.length) chunks.push(new Uint8Array(encoded));
    }
    const tail = encoder.flush();
    if (tail.length) chunks.push(new Uint8Array(tail));
    return new Blob(chunks, { type: "audio/mpeg" });
  } finally {
    await context.close();
  }
}
function showError(message) {
  $("nvError").textContent = message;
  $("nvError").hidden = false;
}
generateButton.addEventListener("click", () => {
  if (busy) return;
  const text = textInput.value.trim();
  $("nvError").hidden = true;
  if (!text) return showError("Escribe algo de texto antes de generar el audio.");
  if (text.length > 2500) return showError("El texto supera el máximo de 2,500 caracteres.");
  clearAudio();
  const id = ++currentJob;
  setBusy(true);
  setProgress("Preparando el motor neuronal…", 0, "La primera vez se descargará el modelo de voz. El texto no se envía a ningún servidor.");
  worker.postMessage({ id, text, voiceId: voiceInput.value, speed: Number(speedInput.value) });
});
$("nvDiscard").addEventListener("click", () => {
  clearAudio();
  progressBox.hidden = true;
});
worker.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.id !== currentJob) return;
  if (data.type === "progress") {
    const p = data.progress || {};
    const percent = p.total > 0 ? (p.loaded / p.total) * 100 : null;
    setProgress("Descargando modelo de voz…", percent, "El modelo se guarda en la caché privada del navegador para no descargarlo en cada visita.");
    return;
  }
  if (data.type === "status") {
    setProgress(data.message || "Generando voz…", data.percent ?? 100, data.hint || "");
    return;
  }
  if (data.type === "error") {
    setBusy(false);
    progressBox.hidden = true;
    showError(data.message || "No se pudo generar el audio.");
    return;
  }
  if (data.type === "done") {
    try {
      setProgress("Convirtiendo a MP3…", 100, "La conversión también se realiza dentro de tu navegador.");
      const mp3 = await wavToMp3(data.audio);
      currentObjectUrl = URL.createObjectURL(mp3);
      $("nvPlayer").src = currentObjectUrl;
      $("nvDownload").href = currentObjectUrl;
      $("nvDownload").download = "nexora-voice-" + new Date().toISOString().replace(/[:.]/g, "-") + ".mp3";
      $("nvAudioDetails").textContent = voiceInput.options[voiceInput.selectedIndex].text + " · " + (mp3.size / 1024).toFixed(0) + " KB";
      $("nvEmpty").hidden = true;
      $("nvResult").hidden = false;
      progressBox.hidden = true;
    } catch (error) {
      showError(error?.message || "No se pudo convertir el audio a MP3.");
    } finally {
      setBusy(false);
    }
  }
});
worker.addEventListener("error", () => {
  setBusy(false);
  progressBox.hidden = true;
  showError("El motor de voz no pudo iniciarse. Actualiza la página e inténtalo de nuevo.");
});
window.addEventListener("pagehide", () => {
  worker.terminate();
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
});
