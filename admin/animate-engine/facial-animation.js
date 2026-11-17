/* NEXORA ANIMATE — morph-driven facial acting and viseme controller. */
(() => {
  "use strict";
  const aliases = {
    smile: ["smile", "happy", "grin", "mouthsmile"],
    frown: ["frown", "sad", "unhappy", "mouthfrown"],
    blink: ["blink", "eyeclose", "eyesclosed", "closeeyes"],
    blinkLeft: ["blinkleft", "eyecloseleft", "lefteyeclose"],
    blinkRight: ["blinkright", "eyecloseright", "righteyeclose"],
    browUp: ["browup", "eyebrowup", "browsup"],
    browDown: ["browdown", "eyebrowdown", "browsdown"],
    jawOpen: ["jawopen", "mouthopen", "openmouth", "visemeaa"],
    mouthClose: ["mouthclose", "closemouth"],
    angry: ["angry", "anger", "scowl"],
    surprise: ["surprise", "surprised", "wideeyes"],
    fear: ["fear", "scared"],
  };
  const visemes = {
    A: ["visemeaa", "mouthaa", "jawopen", "mouthopen"],
    E: ["visimee", "visemee", "mouthee", "mouthwide"],
    I: ["visemei", "mouthi"],
    O: ["visemeo", "moutho", "pucker", "jawopen"],
    U: ["visemeu", "mouthu", "pucker"],
    M: ["visemem", "mouthclosed", "lipsclosed"],
    F: ["visemef", "teethlip"],
    L: ["visemel", "tongue"],
  };
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const phonemeVisemes = {
    A: "A",
    E: "E",
    I: "I",
    O: "O",
    U: "U",
    M: "M",
    P: "M",
    B: "M",
    F: "F",
    V: "F",
    L: "L",
    R: "O",
  };
  function blinkAt(time, { interval = 3.6, duration = 0.14, offset = 0 } = {}) {
    const t = Math.max(0, Number(time) || 0) + offset;
    if (!(interval > duration && duration > 0)) return 0;
    const phase = ((t % interval) + interval) % interval;
    if (phase >= duration) return 0;
    const x = phase / duration;
    return Math.pow(Math.sin(Math.PI * x), 2);
  }
  function visemeAt(track, time) {
    if (!Array.isArray(track)) return null;
    const t = Math.max(0, Number(time) || 0);
    const item = track.find((p) => t >= p.start && t <= p.end);
    return item
      ? item.viseme ||
          phonemeVisemes[String(item.phoneme || "").toUpperCase()] ||
          null
      : null;
  }
  function visemeWeightsAt(track, time, transition = 0.06) {
    if (!Array.isArray(track) || !track.length) return {};
    const cues = track
      .slice()
      .filter(
        (p) =>
          Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start,
      )
      .sort((a, b) => a.start - b.start);
    const t = Math.max(0, Number(time) || 0),
      window = Math.max(0, Math.min(0.25, Number(transition) || 0));
    const key = (p) =>
      String(
        p.viseme || phonemeVisemes[String(p.phoneme || "").toUpperCase()] || "",
      ).toUpperCase();
    if (window > 0)
      for (let i = 0; i < cues.length - 1; i++) {
        const a = cues[i],
          b = cues[i + 1],
          ka = key(a),
          kb = key(b),
          gap = b.start - a.end;
        if (!ka || !kb || ka === kb || Math.abs(gap) > window) continue;
        const boundary = (a.end + b.start) / 2,
          start = boundary - window / 2,
          end = boundary + window / 2;
        if (t < start || t > end) continue;
        const x = Math.max(0, Math.min(1, (t - start) / window)),
          u = x * x * (3 - 2 * x);
        return { [ka]: 1 - u, [kb]: u };
      }
    const active = cues.find((p) => t >= p.start && t <= p.end),
      activeKey = active && key(active);
    return activeKey ? { [activeKey]: 1 } : {};
  }
  class FacialAnimator {
    constructor(meshes = []) {
      this.meshes = [];
      this.base = new Map();
      this.setMeshes(meshes);
    }
    setMeshes(meshes = []) {
      this.meshes = meshes.filter((m) => m && Array.isArray(m.morphTargets));
      for (const m of this.meshes)
        if (!this.base.has(m))
          this.base.set(
            m,
            (m.morphWeights || m.morphTargets.map(() => 0)).slice(),
          );
      return this;
    }
    targets(names) {
      const wanted = names.map(normalize);
      const found = [];
      for (const mesh of this.meshes)
        for (let i = 0; i < mesh.morphTargets.length; i++) {
          const name = normalize(mesh.morphTargets[i].name);
          if (wanted.some((n) => name === n || name.includes(n)))
            found.push({ mesh, index: i });
        }
      return found;
    }
    apply(state = {}) {
      const values = new Map();
      const add = (names, amount) => {
        for (const hit of this.targets(names)) {
          const key = hit.mesh;
          let row = values.get(key);
          if (!row) values.set(key, (row = new Map()));
          row.set(hit.index, Math.max(row.get(hit.index) || 0, amount));
        }
      };
      const expression = normalize(state.expression || "");
      if (expression) {
        const match = Object.entries(aliases).find(
          ([key]) => normalize(key) === expression,
        );
        const group = match ? match[1] : [expression];
        add(group, state.expressionWeight ?? 1);
      }
      if (
        state.blink !== undefined &&
        state.blinkLeft === undefined &&
        state.blinkRight === undefined
      )
        add(aliases.blink, Math.max(0, Math.min(1, Number(state.blink) || 0)));
      if (state.blinkLeft !== undefined)
        add(
          aliases.blinkLeft,
          Math.max(0, Math.min(1, Number(state.blinkLeft) || 0)),
        );
      if (state.blinkRight !== undefined)
        add(
          aliases.blinkRight,
          Math.max(0, Math.min(1, Number(state.blinkRight) || 0)),
        );
      if (state.browUp !== undefined)
        add(aliases.browUp, Number(state.browUp) || 0);
      if (state.browDown !== undefined)
        add(aliases.browDown, Number(state.browDown) || 0);
      if (state.jawOpen !== undefined)
        add(aliases.jawOpen, Number(state.jawOpen) || 0);
      const weights =
        state.visemeWeights && typeof state.visemeWeights === "object"
          ? state.visemeWeights
          : null;
      if (weights) {
        for (const [key, amount] of Object.entries(weights)) {
          const viseme = String(key).toUpperCase();
          if (visemes[viseme])
            add(
              visemes[viseme],
              Math.max(0, Math.min(1, Number(amount) || 0)) *
                (state.mouthOpen ?? 1),
            );
        }
      } else {
        const viseme = String(state.viseme || "").toUpperCase();
        if (viseme && visemes[viseme])
          add(visemes[viseme], state.mouthOpen ?? 1);
      }
      for (const mesh of this.meshes) {
        const next = (this.base.get(mesh) || []).slice();
        for (const [index, value] of values.get(mesh) || [])
          next[index] = Math.max(-1, Math.min(1, value));
        mesh.morphWeights = next;
      }
      return this.meshes;
    }
    applyAt(time, state = {}) {
      const next = { ...state };
      if (
        next.autoBlink !== false &&
        next.blink === undefined &&
        next.blinkLeft === undefined &&
        next.blinkRight === undefined
      ) {
        const t = Math.max(0, Number(time) || 0);
        next.blink = blinkAt(t, {
          interval: next.blinkInterval ?? 3.6,
          duration: next.blinkDuration ?? 0.14,
          offset: next.blinkOffset ?? 0,
        });
      }
      if (next.visemeTrack && !next.viseme && !next.visemeWeights)
        next.visemeWeights = visemeWeightsAt(
          next.visemeTrack,
          time,
          next.coarticulation ?? 0.06,
        );
      return this.apply(next);
    }
    reset() {
      for (const mesh of this.meshes)
        mesh.morphWeights = (this.base.get(mesh) || []).slice();
      return this.meshes;
    }
  }
  window.NexoraFacialAnimation = {
    FacialAnimator,
    aliases,
    visemes,
    normalize,
    blinkAt,
    visemeAt,
    visemeWeightsAt,
    phonemeVisemes,
  };
})();
