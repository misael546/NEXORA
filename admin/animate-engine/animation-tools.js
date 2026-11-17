/* NEXORA ANIMATE — reusable animation primitives. */
(() => {
  "use strict";
  const clamp = (v, a = 0, b = 1) =>
    Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
  const lerp = (a, b, t) => a + (b - a) * t;
  function interpolatePose(a, b, t) {
    const out = {};
    for (const k of new Set([
      ...Object.keys(a || {}),
      ...Object.keys(b || {}),
    ])) {
      const av = a?.[k] ?? b?.[k] ?? 0,
        bv = b?.[k] ?? av;
      out[k] =
        typeof av === "number" && typeof bv === "number"
          ? lerp(av, bv, clamp(t))
          : t < 0.5
            ? av
            : bv;
    }
    return out;
  }
  function solveTwoBoneIK(root, target, len1, len2, pole = 1) {
    const l1 = Math.max(0.001, Math.abs(Number(len1) || 0)),
      l2 = Math.max(0.001, Math.abs(Number(len2) || 0)),
      dx = target.x - root.x,
      dy = target.y - root.y,
      d = Math.hypot(dx, dy),
      safe = d || 0.001,
      dist = clamp(safe, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001),
      a = Math.acos(
        clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1),
      ),
      base = Math.atan2(dy || 0, dx || 1) + (pole < 0 ? -a : a);
    return { x: root.x + Math.cos(base) * l1, y: root.y + Math.sin(base) * l1 };
  }
  class CharacterRig {
    constructor(points = {}) {
      this.points = { ...points };
      this.kind = "worker";
      this.bones = [];
      this.poses = {};
      this.selected = null;
      this.createHumanoid();
    }
    createHumanoid() {
      this.kind = "worker";
      this.points = {
        head: { x: 0.5, y: 0.12 },
        jaw: { x: 0.5, y: 0.153 },
        neck: { x: 0.5, y: 0.25 },
        shoulderL: { x: 0.425, y: 0.29 },
        elbowL: { x: 0.385, y: 0.405 },
        handL: { x: 0.405, y: 0.535 },
        shoulderR: { x: 0.575, y: 0.29 },
        elbowR: { x: 0.615, y: 0.405 },
        handR: { x: 0.595, y: 0.535 },
        hip: { x: 0.5, y: 0.57 },
        kneeL: { x: 0.455, y: 0.75 },
        footL: { x: 0.44, y: 0.94 },
        kneeR: { x: 0.545, y: 0.75 },
        footR: { x: 0.56, y: 0.94 },
      };
      this.bones = [
        { name: "neck", from: "head", to: "neck" },
        { name: "jaw", from: "head", to: "jaw" },
        { name: "spine", from: "neck", to: "hip" },
        { name: "armL1", from: "shoulderL", to: "elbowL" },
        { name: "armL2", from: "elbowL", to: "handL" },
        { name: "armR1", from: "shoulderR", to: "elbowR" },
        { name: "armR2", from: "elbowR", to: "handR" },
        { name: "legL1", from: "hip", to: "kneeL" },
        { name: "legL2", from: "kneeL", to: "footL" },
        { name: "legR1", from: "hip", to: "kneeR" },
        { name: "legR2", from: "kneeR", to: "footR" },
      ];
      this.selected = "head";
      return this;
    }
    createDinosaur() {
      this.kind = "dinosaur";
      this.points = {
        head: { x: 0.18, y: 0.25 },
        jaw: { x: 0.225, y: 0.28 },
        neck: { x: 0.28, y: 0.38 },
        chest: { x: 0.36, y: 0.46 },
        shoulderL: { x: 0.32, y: 0.42 },
        elbowL: { x: 0.27, y: 0.49 },
        handL: { x: 0.29, y: 0.55 },
        shoulderR: { x: 0.4, y: 0.44 },
        elbowR: { x: 0.4, y: 0.51 },
        handR: { x: 0.43, y: 0.56 },
        hip: { x: 0.53, y: 0.57 },
        kneeL: { x: 0.48, y: 0.72 },
        footL: { x: 0.41, y: 0.84 },
        kneeR: { x: 0.58, y: 0.71 },
        footR: { x: 0.63, y: 0.83 },
        tail1: { x: 0.64, y: 0.56 },
        tail2: { x: 0.73, y: 0.53 },
        tail3: { x: 0.81, y: 0.5 },
        tail4: { x: 0.86, y: 0.47 },
      };
      this.bones = [
        { name: "jaw", from: "head", to: "jaw" },
        { name: "neck", from: "head", to: "neck" },
        { name: "spine", from: "neck", to: "chest" },
        { name: "body", from: "chest", to: "hip" },
        { name: "armL1", from: "shoulderL", to: "elbowL" },
        { name: "armL2", from: "elbowL", to: "handL" },
        { name: "armR1", from: "shoulderR", to: "elbowR" },
        { name: "armR2", from: "elbowR", to: "handR" },
        { name: "legL1", from: "hip", to: "kneeL" },
        { name: "legL2", from: "kneeL", to: "footL" },
        { name: "legR1", from: "hip", to: "kneeR" },
        { name: "legR2", from: "kneeR", to: "footR" },
        { name: "tail1", from: "hip", to: "tail1" },
        { name: "tail2", from: "tail1", to: "tail2" },
        { name: "tail3", from: "tail2", to: "tail3" },
        { name: "tail4", from: "tail3", to: "tail4" },
      ];
      this.selected = "head";
      return this;
    }
    setPoint(name, x, y) {
      if (typeof name !== "string" || !name.trim())
        throw new Error("La articulación necesita nombre");
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new Error("La posición debe ser numérica");
      this.points[name] = { x: clamp(x), y: clamp(y) };
    }
    mirrorPoint(name, axis = 0.5) {
      const pairs = {
        shoulderL: "shoulderR",
        shoulderR: "shoulderL",
        elbowL: "elbowR",
        elbowR: "elbowL",
        handL: "handR",
        handR: "handL",
        kneeL: "kneeR",
        kneeR: "kneeL",
        footL: "footR",
        footR: "footL",
      };
      const source = this.points[name],
        targetName = pairs[name];
      if (!source || !targetName) return false;
      if (!Number.isFinite(axis))
        throw new Error("El eje de simetría debe ser numérico");
      this.points[targetName] = { x: clamp(axis * 2 - source.x), y: source.y };
      return targetName;
    }
    applyIK(effector, x, y, options = {}) {
      const chains = {
        handL: { root: "shoulderL", joint: "elbowL", end: "handL" },
        handR: { root: "shoulderR", joint: "elbowR", end: "handR" },
        footL: { root: "hip", joint: "kneeL", end: "footL" },
        footR: { root: "hip", joint: "kneeR", end: "footR" },
      };
      const chain = chains[effector];
      if (!chain || ![x, y].every(Number.isFinite)) return false;
      const root = this.points[chain.root],
        joint = this.points[chain.joint],
        end = this.points[chain.end];
      if (!root || !joint || !end) return false;
      const len1 = Math.hypot(joint.x - root.x, joint.y - root.y),
        len2 = Math.hypot(end.x - joint.x, end.y - joint.y);
      if (len1 < 0.002 || len2 < 0.002) return false;
      const tx = clamp(x),
        ty = clamp(y),
        dx = tx - root.x,
        dy = ty - root.y,
        d = Math.hypot(dx, dy),
        endVector = Math.hypot(end.x - root.x, end.y - root.y),
        ux =
          d > 1e-8
            ? dx / d
            : endVector > 1e-8
              ? (end.x - root.x) / endVector
              : 0,
        uy =
          d > 1e-8
            ? dy / d
            : endVector > 1e-8
              ? (end.y - root.y) / endVector
              : -1,
        reach = clamp(d, Math.abs(len1 - len2) + 0.001, len1 + len2 - 0.001),
        target = { x: root.x + ux * reach, y: root.y + uy * reach },
        cross =
          (end.x - root.x) * (joint.y - root.y) -
          (end.y - root.y) * (joint.x - root.x),
        pole = Number.isFinite(options.pole)
          ? options.pole
          : Math.abs(cross) > 0.00001
            ? Math.sign(cross)
            : effector.endsWith("L")
              ? 1
              : -1;
      this.points[chain.joint] = solveTwoBoneIK(root, target, len1, len2, pole);
      this.points[chain.end] = target;
      return {
        joint: this.points[chain.joint],
        effector: target,
        clamped: Math.abs(reach - d) > 0.001,
      };
    }
    removePoint(name) {
      delete this.points[name];
    }
    addBone(name, from, to, length = null) {
      if (!this.points[from] || !this.points[to])
        throw new Error("Faltan puntos para crear el hueso");
      this.bones.push({ name, from, to, length });
      return this.bones.at(-1);
    }
    save() {
      return {
        version: 1,
        kind: this.kind,
        points: this.points,
        bones: this.bones,
        poses: this.poses,
      };
    }
    load(data) {
      if (data.version !== 1 || !data.points || typeof data.points !== "object")
        throw new Error("Rig no compatible");
      for (const [name, p] of Object.entries(data.points))
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
          throw new Error("Posición inválida en " + name);
      this.points = { ...data.points };
      this.bones = [...(data.bones || [])];
      this.poses = { ...(data.poses || {}) };
      this.kind = data.kind === "dinosaur" ? "dinosaur" : "worker";
      return this;
    }
    draw(ctx, w, h, options = {}) {
      ctx.save();
      ctx.lineWidth = options.lineWidth || 3;
      ctx.strokeStyle = options.color || "#72e5e8";
      ctx.fillStyle = options.color || "#72e5e8";
      for (const b of this.bones) {
        const a = this.points[b.from],
          z = this.points[b.to];
        if (!a || !z) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(z.x * w, z.y * h);
        ctx.stroke();
      }
      for (const [name, p] of Object.entries(this.points)) {
        ctx.beginPath();
        ctx.arc(
          p.x * w,
          p.y * h,
          name === this.selected ? 8 : 5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function buildVisemeTrack(phonemes, duration) {
    const map = {
      A: "open",
      E: "wide",
      I: "wide",
      O: "round",
      U: "round",
      M: "closed",
      P: "closed",
      B: "closed",
      F: "teeth",
      V: "teeth",
      S: "narrow",
      T: "narrow",
      L: "tongue",
      R: "round",
    };
    return (phonemes || [])
      .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end))
      .map((p) => ({
        start: clamp(p.start, 0, duration),
        end: clamp(p.end, 0, duration),
        phoneme: String(p.phoneme || "").toUpperCase(),
        viseme: map[String(p.phoneme || "").toUpperCase()] || "neutral",
      }))
      .sort((a, b) => a.start - b.start);
  }
  function visemeAt(track, time) {
    const p = track.find((x) => time >= x.start && time <= x.end);
    return p?.viseme || "neutral";
  }
  window.NexoraAnimationTools = {
    CharacterRig,
    interpolatePose,
    solveTwoBoneIK,
    buildVisemeTrack,
    visemeAt,
  };
})();
