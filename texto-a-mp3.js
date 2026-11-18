(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const text = $("tts-text");
  const generate = $("tts-generate");
  const progress = $("tts-progress");
  const result = $("tts-result");
  const player = $("tts-player");
  const download = $("tts-download");
  let audioUrl = null;

  function status(message, type = "") {
    const node = $("tts-status");
    node.textContent = message;
    node.className = "tts-status" + (type ? " " + type : "");
  }
  function updateCount() {
    $("tts-count").textContent = text.value.length.toLocaleString("es-MX") + " / 2,500 caracteres";
  }
  function selectedVoice() {
    return document.querySelector('input[name="tts-voice"]:checked')?.value || "carina";
  }
  document.querySelectorAll('input[name="tts-voice"]').forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelectorAll(".tts-voice").forEach((card) => {
        card.classList.toggle("selected", card.querySelector("input") === input);
      });
    });
  });
  text.addEventListener("input", updateCount);
  $("tts-clear").addEventListener("click", () => {
    text.value = "";
    updateCount();
    text.focus();
  });

  generate.addEventListener("click", async () => {
    const value = text.value.trim();
    if (!value) {
      status("Escribe un texto antes de generar el MP3.", "error");
      text.focus();
      return;
    }
    if (value.length > 2500) {
      status("El texto supera el límite de 2,500 caracteres.", "error");
      return;
    }

    generate.disabled = true;
    progress.hidden = false;
    result.hidden = true;
    status("Enviando texto al motor de voz…");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, speaker: selectedVoice() })
      });
      if (!response.ok) {
        let message = "No se pudo generar el audio.";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {}
        throw new Error(message);
      }
      const blob = await response.blob();
      if (!blob.size || blob.type && !blob.type.includes("audio")) {
        throw new Error("El motor no devolvió un archivo de audio válido.");
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(blob);
      player.src = audioUrl;
      download.href = audioUrl;
      download.download = "nexora-" + selectedVoice() + ".mp3";
      $("tts-result-meta").textContent = "MP3 · Voz " + selectedVoice();
      result.hidden = false;
      status("Tu MP3 está listo. Puedes escucharlo o descargarlo.", "success");
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      status(error?.message || "Ocurrió un error al generar el audio.", "error");
    } finally {
      progress.hidden = true;
      generate.disabled = false;
    }
  });

  window.addEventListener("beforeunload", () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  });
  updateCount();
})();
