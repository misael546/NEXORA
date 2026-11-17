/* NEXORA ANIMATE — multitrack audio timeline, preview mixing and voice/effect library. */
(() => {
  "use strict";
  class AudioTimeline {
    constructor() {
      this.tracks = [];
      this.context = null;
      this.nodes = [];
      this.playing = false;
      this.startedAt = 0;
    }
    add(fileOrUrl, options = {}) {
      const src =
        typeof fileOrUrl === "string"
          ? fileOrUrl
          : URL.createObjectURL(fileOrUrl);
      const item = {
        id: crypto.randomUUID(),
        name: options.name || fileOrUrl.name || "Audio",
        kind: options.kind || "sfx",
        src,
        start: Math.max(0, Number(options.start) || 0),
        volume: Math.max(0, Math.min(2, Number(options.volume ?? 1))),
        pan: Math.max(-1, Math.min(1, Number(options.pan) || 0)),
        fadeIn: Math.max(0, Number(options.fadeIn) || 0),
        fadeOut: Math.max(0, Number(options.fadeOut) || 0),
        loop: !!options.loop,
        mute: false,
        owned: typeof fileOrUrl !== "string",
      };
      this.tracks.push(item);
      return item;
    }
    update(id, patch) {
      const t = this.tracks.find((x) => x.id === id);
      if (!t) return false;
      for (const k of ["start", "volume", "pan", "fadeIn", "fadeOut"])
        if (k in patch) t[k] = Number(patch[k]);
      if ("loop" in patch) t.loop = !!patch.loop;
      if ("mute" in patch) t.mute = !!patch.mute;
      if ("kind" in patch) t.kind = patch.kind;
      return true;
    }
    remove(id) {
      const i = this.tracks.findIndex((x) => x.id === id);
      if (i < 0) return false;
      const [t] = this.tracks.splice(i, 1);
      if (t.owned) URL.revokeObjectURL(t.src);
      return true;
    }
    clear() {
      this.stop();
      for (const t of this.tracks) if (t.owned) URL.revokeObjectURL(t.src);
      this.tracks = [];
    }
    async play() {
      this.stop();
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) throw new Error("AudioContext no disponible");
      this.context = new C();
      await this.context.resume();
      const now = this.context.currentTime;
      this.startedAt = performance.now();
      this.playing = true;
      for (const t of this.tracks) {
        if (t.mute) continue;
        const el = new Audio();
        el.src = t.src;
        el.loop = t.loop;
        el.preload = "auto";
        const source = this.context.createMediaElementSource(el),
          gain = this.context.createGain(),
          pan = this.context.createStereoPanner?.();
        source.connect(gain);
        if (pan) {
          gain.connect(pan);
          pan.connect(this.context.destination);
          pan.pan.value = t.pan;
        } else gain.connect(this.context.destination);
        gain.gain.value = 0;
        const start = now + t.start;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(
          t.volume,
          start + Math.max(0.005, t.fadeIn),
        );
        el.addEventListener(
          "loadedmetadata",
          () => {
            if (!t.loop && t.fadeOut > 0 && Number.isFinite(el.duration)) {
              const end = start + el.duration;
              gain.gain.setValueAtTime(
                t.volume,
                Math.max(start, end - t.fadeOut),
              );
              gain.gain.linearRampToValueAtTime(0, end);
            }
          },
          { once: true },
        );
        const delay = Math.max(0, t.start);
        setTimeout(() => {
          if (this.playing) el.play().catch(() => {});
        }, delay * 1000);
        this.nodes.push({ el, source, gain, pan });
      }
    }
    stop() {
      this.playing = false;
      for (const n of this.nodes) {
        n.el.pause();
        n.source.disconnect();
        n.gain.disconnect();
        n.pan?.disconnect();
      }
      this.nodes = [];
      if (this.context) {
        this.context.close().catch(() => {});
        this.context = null;
      }
    }
    exportTracks() {
      return this.tracks
        .filter((t) => !t.mute)
        .map(
          ({ src, start, volume, pan, fadeIn, fadeOut, loop, name, kind }) => ({
            src,
            start,
            volume,
            pan,
            fadeIn,
            fadeOut,
            loop,
            name,
            kind,
          }),
        );
    }
    serialize() {
      return {
        format: "nexora-audio-timeline",
        version: 1,
        tracks: this.tracks.map(
          ({
            id,
            name,
            kind,
            start,
            volume,
            pan,
            fadeIn,
            fadeOut,
            loop,
            mute,
          }) => ({
            id,
            name,
            kind,
            start,
            volume,
            pan,
            fadeIn,
            fadeOut,
            loop,
            mute,
          }),
        ),
      };
    }
  }
  window.NexoraAudio = {
    AudioTimeline,
    kinds: ["voice", "narration", "music", "sfx", "ambience"],
  };
})();
