/* NEXORA ANIMATE — scene timeline, multitrack audio mix and WebM compositor. */
(() => {
  "use strict";
  // Límite de seguridad: renderizar más fotogramas de golpe congelaría el
  // navegador. 1800 fotogramas son 60 s a 30 fps o 30 s a 60 fps.
  const MAX_EXPORT_FRAMES = 1800;
  class SceneCompositor {
    constructor(engine) {
      if (!engine) throw new Error("Visual engine requerido");
      this.engine = engine;
      this.tracks = [];
      this.audio = [];
      this.duration = 0;
    }
    addTrack(track) {
      const item = {
        id: track.id || crypto.randomUUID(),
        name: track.name || "Plano",
        start: Math.max(0, track.start || 0),
        duration: Math.max(0.05, track.duration || 1),
        render: track.render,
        enabled: true,
        ...track,
      };
      this.tracks.push(item);
      this.duration = Math.max(this.duration, item.start + item.duration);
      return item.id;
    }
    removeTrack(id) {
      this.tracks = this.tracks.filter((t) => t.id !== id);
      this.duration = this.tracks.reduce(
        (m, t) => Math.max(m, t.start + t.duration),
        0,
      );
    }
    addAudio(audio) {
      if (!audio?.src) throw new Error("Audio sin fuente");
      this.audio.push({
        ...audio,
        start: Math.max(0, audio.start || 0),
        volume: Math.max(0, Math.min(2, audio.volume ?? 1)),
        pan: Math.max(-1, Math.min(1, audio.pan || 0)),
        fadeIn: Math.max(0, audio.fadeIn || 0),
        fadeOut: Math.max(0, audio.fadeOut || 0),
        loop: !!audio.loop,
      });
    }
    frame(time) {
      for (const t of this.tracks) {
        if (!t.enabled || time < t.start || time > t.start + t.duration)
          continue;
        t.render?.(this.engine, time - t.start, time, t);
      }
      return this.engine.draw(time);
    }
    // Exportación por fotogramas (offline, determinista).
    // A diferencia de export(), aquí no intervienen el tiempo real, el
    // requestAnimationFrame ni la pestaña activa: el reloj avanza en pasos
    // fijos de 1/fps y cada fotograma se dibuja y se captura antes de pasar
    // al siguiente. El resultado es una lista de imágenes PNG, una por
    // fotograma, con su tiempo exacto. Sirve para revisar la animación
    // fotograma a fotograma y para montarla después en un editor de vídeo.
    // Se puede cancelar con un AbortSignal; la exportación se detiene y
    // lanza un error de cancelación.
    async exportFrames({
      fps = 30,
      duration,
      format = "image/png",
      onProgress = () => {},
      signal,
    } = {}) {
      const rate = Math.floor(fps);
      if (!Number.isFinite(rate) || rate < 1 || rate > 60)
        throw new Error("Los fps deben estar entre 1 y 60");
      const total = Math.max(0.1, duration ?? this.duration);
      const count = Math.max(1, Math.round(total * rate));
      if (count > MAX_EXPORT_FRAMES)
        throw new Error(
          `Demasiados fotogramas (${count}); el máximo es ${MAX_EXPORT_FRAMES} — baja los fps o la duración`,
        );
      const canvas = this.engine.canvas;
      if (!canvas || typeof canvas.toBlob !== "function")
        throw new Error("Este navegador no admite capturar fotogramas");
      const frames = [];
      for (let i = 0; i < count; i++) {
        if (signal?.aborted)
          throw new Error("Exportación de fotogramas cancelada");
        const time = Math.min(i / rate, total);
        this.frame(time);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("No se pudo capturar el fotograma")),
            format,
          );
        });
        frames.push({ index: i, time, blob, type: blob.type || format });
        onProgress((i + 1) / count, { index: i, time });
        // Ceder el turno cada 10 fotogramas para no congelar la interfaz.
        if (i % 10 === 9) await Promise.resolve();
      }
      return { frames, fps: rate, duration: total, count };
    }
    async export({
      fps = 30,
      mimeType = "video/webm;codecs=vp9,opus",
      filename = "nexora-scene.webm",
      onProgress = () => {},
    } = {}) {
      const canvas = this.engine.canvas;
      if (!canvas.captureStream || !window.MediaRecorder)
        throw new Error("Este navegador no admite exportación de vídeo");
      const stream = canvas.captureStream(fps);
      let ctx = null,
        dest = null,
        media = [];
      try {
        if (this.audio.length && window.AudioContext) {
          ctx = new AudioContext();
          dest = ctx.createMediaStreamDestination();
          for (const a of this.audio) {
            const el = new Audio();
            el.crossOrigin = "anonymous";
            el.src = a.src;
            el.loop = a.loop;
            el.preload = "auto";
            const src = ctx.createMediaElementSource(el),
              gain = ctx.createGain(),
              pan = ctx.createStereoPanner?.();
            src.connect(gain);
            if (pan) {
              gain.connect(pan);
              pan.connect(dest);
              pan.pan.value = a.pan;
            } else gain.connect(dest);
            gain.gain.value = 0;
            media.push({
              el,
              start: a.start,
              source: src,
              gain,
              pan,
              track: a,
            });
          }
          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
          await Promise.all(
            media.map(
              ({ el }) =>
                new Promise((resolve, reject) => {
                  if (el.readyState >= 1) {
                    resolve();
                    return;
                  }
                  el.addEventListener("loadedmetadata", resolve, {
                    once: true,
                  });
                  el.addEventListener(
                    "error",
                    () =>
                      reject(new Error("No se pudo cargar una pista de audio")),
                    { once: true },
                  );
                  el.load();
                }),
            ),
          );
          await ctx.resume();
        }
      } catch (e) {
        throw new Error("No se pudo preparar la mezcla de audio: " + e.message);
      }
      const type = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: type }),
        chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunks.push(e.data);
      };
      const stopped = new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Falló la grabación"));
        recorder.onstop = () => resolve();
      });
      recorder.start(200);
      const start = performance.now(),
        duration = Math.max(0.1, this.duration);
      // Si la pestaña pasa a segundo plano, la grabación se pausa y el
      // reloj de la escena se congela: al volver, la grabación continúa
      // donde se quedó en vez de saltarse el tiempo que estuvo oculta.
      let pausedMs = 0;
      let hiddenAt = null;
      const onVisibility = () => {
        if (typeof document === "undefined") return;
        if (document.hidden) {
          hiddenAt = performance.now();
          media.forEach((x) => x.el.pause());
          if (recorder.state === "recording") recorder.pause();
        } else if (hiddenAt !== null) {
          pausedMs += performance.now() - hiddenAt;
          hiddenAt = null;
          if (recorder.state === "paused") recorder.resume();
        }
      };
      if (typeof document !== "undefined")
        document.addEventListener("visibilitychange", onVisibility);
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = (now - start - pausedMs) / 1000;
          this.frame(Math.min(t, duration));
          for (const item of media) {
            const { el, gain, track } = item,
              local = t - item.start;
            if (local >= 0 && local < duration - item.start) {
              if (el.paused) {
                el.currentTime = track.loop
                  ? local % (el.duration || 1)
                  : Math.min(local, Math.max(0, (el.duration || local) - 0.01));
                el.play().catch(() => {});
              }
              const fadeIn = track.fadeIn
                ? Math.min(1, local / track.fadeIn)
                : 1;
              let fadeOut = 1;
              if (
                !track.loop &&
                track.fadeOut &&
                Number.isFinite(el.duration)
              ) {
                const remaining = el.duration - local;
                fadeOut = Math.max(0, Math.min(1, remaining / track.fadeOut));
              }
              gain.gain.setTargetAtTime(
                track.volume * fadeIn * fadeOut,
                ctx.currentTime,
                0.015,
              );
            } else {
              if (!el.paused) el.pause();
              gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
            }
          }
          onProgress(Math.min(1, t / duration));
          if (t >= duration) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisibility);
      recorder.stop();
      await stopped;
      media.forEach((x) => {
        x.el.pause();
        x.source.disconnect();
        x.gain.disconnect();
        x.pan?.disconnect();
      });
      stream.getTracks().forEach((t) => t.stop());
      await ctx?.close();
      const blob = new Blob(chunks, { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { blob, size: blob.size, type };
    }
  }
  window.NexoraCompositor = { SceneCompositor };
})();
