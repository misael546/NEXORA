/* NEXORA ANIMATE — hierarchical 3D skeleton and CPU linear-blend skinning foundation. */
(() => {
  "use strict";
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  const compose = (t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) => {
    const [x, y, z, w] = q;
    return [
      (1 - 2 * (y * y + z * z)) * s[0],
      2 * (x * y + z * w) * s[0],
      2 * (x * z - y * w) * s[0],
      0,
      2 * (x * y - z * w) * s[1],
      (1 - 2 * (x * x + z * z)) * s[1],
      2 * (y * z + x * w) * s[1],
      0,
      2 * (x * z + y * w) * s[2],
      2 * (y * z - x * w) * s[2],
      (1 - 2 * (x * x + y * y)) * s[2],
      0,
      t[0],
      t[1],
      t[2],
      1,
    ];
  };
  const inverse = (m) => {
    const a = m[0],
      b = m[4],
      c = m[8],
      d = m[1],
      e = m[5],
      f = m[9],
      g = m[2],
      h = m[6],
      i = m[10],
      det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (Math.abs(det) < 1e-12)
      throw Error("Matriz de transformación GLB no invertible");
    const k = 1 / det,
      r = [
        (e * i - f * h) * k,
        (f * g - d * i) * k,
        (d * h - e * g) * k,
        0,
        (c * h - b * i) * k,
        (a * i - c * g) * k,
        (b * g - a * h) * k,
        0,
        (b * f - c * e) * k,
        (c * d - a * f) * k,
        (a * e - b * d) * k,
        0,
        0,
        0,
        0,
        1,
      ],
      tx = m[12],
      ty = m[13],
      tz = m[14];
    r[12] = -(r[0] * tx + r[4] * ty + r[8] * tz);
    r[13] = -(r[1] * tx + r[5] * ty + r[9] * tz);
    r[14] = -(r[2] * tx + r[6] * ty + r[10] * tz);
    return r;
  };
  const transform = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
  class SpatialRig3D {
    constructor(bones = []) {
      this.bones = [];
      this.byName = new Map();
      this.addBones(bones);
      this.captureRestPose();
    }
    addBones(bones) {
      for (const b of bones) {
        if (!b.name || this.byName.has(b.name))
          throw Error("Nombre de hueso inválido o duplicado");
        const bone = {
          name: b.name,
          parent: b.parent ?? null,
          translation: (b.translation || [0, 0, 0]).slice(),
          rotation: (b.rotation || [0, 0, 0, 1]).slice(),
          scale: (b.scale || [1, 1, 1]).slice(),
          world: I(),
        };
        if (bone.parent !== null && !this.byName.has(bone.parent))
          throw Error("El padre debe existir antes que el hijo: " + bone.name);
        this.bones.push(bone);
        this.byName.set(bone.name, bone);
      }
      this.updateWorld();
      return this;
    }
    setPose(name, pose = {}) {
      const b = this.byName.get(name);
      if (!b) throw Error("Hueso no encontrado: " + name);
      if (pose.translation) b.translation = pose.translation.slice();
      if (pose.rotation) b.rotation = pose.rotation.slice();
      if (pose.scale) b.scale = pose.scale.slice();
      this.updateWorld();
      return this;
    }
    captureRestPose() {
      this.restPose = this.bones.map((b) => ({
        translation: b.translation.slice(),
        rotation: b.rotation.slice(),
        scale: b.scale.slice(),
      }));
      return this;
    }
    resetPose() {
      if (!this.restPose || this.restPose.length !== this.bones.length)
        throw Error("La pose de reposo del rig no está disponible");
      this.bones.forEach((b, i) => {
        const p = this.restPose[i];
        b.translation = p.translation.slice();
        b.rotation = p.rotation.slice();
        b.scale = p.scale.slice();
      });
      this.updateWorld();
      return this;
    }
    updateWorld() {
      for (const b of this.bones) {
        const local = compose(b.translation, b.rotation, b.scale),
          parent = b.parent ? this.byName.get(b.parent).world : I();
        b.world = mul(parent, local);
      }
      return this;
    }
    worldPosition(name) {
      const b = this.byName.get(name);
      if (!b) throw Error("Hueso no encontrado: " + name);
      return [b.world[12], b.world[13], b.world[14]];
    }
    skinVertices(
      positions,
      joints,
      weights,
      inverseBindMatrices,
      jointBoneIndices,
      meshWorldInverse = I(),
    ) {
      const vertices = positions.length / 3,
        influences = vertices ? joints.length / vertices : 0;
      if (
        positions.length % 3 ||
        !Number.isInteger(influences) ||
        ![4, 8].includes(influences) ||
        weights.length !== joints.length
      )
        throw Error("Datos de skin incompatibles");
      const boneIndices = jointBoneIndices || this.bones.map((_, i) => i),
        matrices = boneIndices.map((boneIndex, i) => {
          const b = this.bones[boneIndex];
          if (!b) throw Error("Índice de hueso fuera del rig: " + boneIndex);
          return mul(
            meshWorldInverse,
            mul(b.world, inverseBindMatrices?.[i] || I()),
          );
        }),
        out = [];
      for (let i = 0; i < vertices; i++) {
        const p = positions.slice(i * 3, i * 3 + 3);
        let v = [0, 0, 0],
          sum = 0;
        for (let j = 0; j < influences; j++) {
          const k = i * influences + j,
            w = weights[k],
            bone = matrices[joints[k]];
          if (w <= 0 || !bone) continue;
          const q = transform(bone, p);
          v[0] += q[0] * w;
          v[1] += q[1] * w;
          v[2] += q[2] * w;
          sum += w;
        }
        if (sum < 1e-8) v = p;
        else if (Math.abs(sum - 1) > 1e-5) v = v.map((x) => x / sum);
        out.push(...v);
      }
      return out;
    }
    exportJSON() {
      return {
        format: "nexora-spatial-rig",
        version: 1,
        bones: this.bones.map(
          ({ name, parent, translation, rotation, scale }) => ({
            name,
            parent,
            translation,
            rotation,
            scale,
          }),
        ),
      };
    }
    static fromJSON(data) {
      if (data?.format !== "nexora-spatial-rig" || !Array.isArray(data.bones))
        throw Error("Rig 3D inválido");
      return new SpatialRig3D(data.bones);
    }
  }
  const applyMorphTargets = (positions, targets = [], weights = []) => {
    const out = Array.from(positions);
    for (let t = 0; t < targets.length; t++) {
      const delta = targets[t].positions,
        weight = Number(weights[t] || 0);
      if (!delta || delta.length !== out.length)
        throw Error("Target morph incompatible con la malla");
      if (!weight) continue;
      for (let i = 0; i < out.length; i++) out[i] += delta[i] * weight;
    }
    return out;
  };
  class GLBAnimationPlayer {
    constructor(rig, parsed, imported, animationIndex = 0) {
      this.rig = rig;
      this.parsed = parsed;
      this.imported = imported;
      this.animationIndex = animationIndex;
      this.time = 0;
      this.loop = true;
      this.playing = false;
      this.clip = null;
      this.rest = rig.bones.map((b) => ({
        translation: b.translation.slice(),
        rotation: b.rotation.slice(),
        scale: b.scale.slice(),
      }));
      this.select(animationIndex);
    }
    select(index) {
      const clip =
        typeof index === "string"
          ? (this.parsed.animations || []).findIndex((a) => a.name === index)
          : index;
      const a = this.parsed.animations?.[clip];
      if (!a) throw Error("Animación GLB no encontrada");
      this.animationIndex = clip;
      this.clip = a;
      this.duration = Math.max(0, ...a.channels.flatMap((c) => c.times));
      this.time = 0;
      this.apply(0);
      return this;
    }
    play() {
      this.playing = true;
      return this;
    }
    pause() {
      this.playing = false;
      return this;
    }
    seek(seconds) {
      this.time = Math.max(0, Math.min(this.duration, Number(seconds) || 0));
      this.apply(this.time);
      return this;
    }
    advance(delta) {
      if (!this.playing) return this;
      if (this.duration > 0) {
        this.time += Math.max(0, delta);
        if (this.loop) this.time %= this.duration;
        else if (this.time >= this.duration) {
          this.time = this.duration;
          this.playing = false;
        }
      }
      this.apply(this.time);
      return this;
    }
    sample(channel, time) {
      const times = channel.times,
        values = channel.values,
        n = times.length;
      if (!n) return null;
      let hi = times.findIndex((t) => t >= time);
      if (hi < 0) hi = n - 1;
      if (hi === 0) {
        const ix = channel.interpolation === "CUBICSPLINE" ? 1 : 0;
        return values[ix];
      }
      const lo = hi - 1,
        dt = times[hi] - times[lo] || 1,
        u = Math.max(0, Math.min(1, (time - times[lo]) / dt)),
        mode = channel.interpolation || "LINEAR",
        path = channel.path;
      if (mode === "STEP")
        return values[
          lo * (mode === "CUBICSPLINE" ? 3 : 1) +
            (mode === "CUBICSPLINE" ? 1 : 0)
        ];
      if (mode === "CUBICSPLINE") {
        const a = values[lo * 3 + 1],
          out = values[lo * 3 + 2],
          b = values[hi * 3 + 1],
          incoming = values[hi * 3],
          u2 = u * u,
          u3 = u2 * u;
        return a.map(
          (v, i) =>
            (2 * u3 - 3 * u2 + 1) * v +
            (u3 - 2 * u2 + u) * dt * out[i] +
            (-2 * u3 + 3 * u2) * b[i] +
            (u3 - u2) * dt * incoming[i],
        );
      }
      const a = values[lo],
        b = values[hi];
      if (path === "rotation") {
        let cos = a.reduce((sum, v, i) => sum + v * b[i], 0),
          end = b;
        if (cos < 0) {
          cos = -cos;
          end = b.map((v) => -v);
        }
        if (cos > 0.9995) {
          const q = a.map((v, i) => v + (end[i] - v) * u),
            len = Math.hypot(...q) || 1;
          return q.map((v) => v / len);
        }
        const theta = Math.acos(Math.max(-1, Math.min(1, cos))),
          sin = Math.sin(theta),
          wa = Math.sin((1 - u) * theta) / sin,
          wb = Math.sin(u * theta) / sin;
        return a.map((v, i) => v * wa + end[i] * wb);
      }
      return a.map((v, i) => v + (b[i] - v) * u);
    }
    apply(time) {
      for (let i = 0; i < this.rig.bones.length; i++) {
        const b = this.rig.bones[i],
          r = this.rest[i];
        b.translation = r.translation.slice();
        b.rotation = r.rotation.slice();
        b.scale = r.scale.slice();
      }
      for (const channel of this.clip.channels) {
        const index = this.imported.nodeBoneIndices.get(channel.node);
        if (index === undefined) continue;
        const value = this.sample(channel, time);
        if (!value) continue;
        const bone = this.rig.bones[index];
        if (channel.path === "translation") bone.translation = value.slice();
        else if (channel.path === "rotation") bone.rotation = value.slice();
        else if (channel.path === "scale") bone.scale = value.slice();
      }
      this.rig.updateWorld();
      return this.rig;
    }
  }
  const createAnimationPlayer = (parsed, imported, animationIndex = 0) =>
    new GLBAnimationPlayer(imported.rig, parsed, imported, animationIndex);
  const createFromGLB = (parsed, skinIndex = 0) => {
    if (!parsed?.nodes?.length || !parsed?.skins?.[skinIndex])
      throw Error("GLB sin nodos o skin válido");
    const nodes = parsed.nodes,
      skin = parsed.skins[skinIndex],
      state = new Map(),
      ordered = [];
    const visit = (index) => {
      if (state.get(index) === 1) throw Error("Jerarquía GLB circular");
      if (state.get(index) === 2) return;
      const node = nodes[index];
      if (!node) throw Error("Nodo GLB inexistente: " + index);
      state.set(index, 1);
      if (node.parent !== -1) visit(node.parent);
      state.set(index, 2);
      if (!ordered.includes(index)) ordered.push(index);
    };
    for (let i = 0; i < nodes.length; i++) visit(i);
    const unique = new Map(),
      nameByIndex = new Map(),
      bones = [];
    for (const index of ordered) {
      const n = nodes[index];
      let name = n.name || "Node " + index;
      if (unique.has(name)) name = name + "#" + index;
      unique.set(name, true);
      nameByIndex.set(index, name);
      let translation = n.translation || [0, 0, 0],
        rotation = n.rotation || [0, 0, 0, 1],
        scale = n.scale || [1, 1, 1];
      if (n.matrix) {
        const m = n.matrix,
          sx = Math.hypot(m[0], m[1], m[2]) || 1,
          sy = Math.hypot(m[4], m[5], m[6]) || 1,
          sz = Math.hypot(m[8], m[9], m[10]) || 1;
        translation = [m[12], m[13], m[14]];
        scale = [sx, sy, sz];
        const a = m[0] / sx,
          b = m[4] / sy,
          c = m[8] / sz,
          d = m[1] / sx,
          e = m[5] / sy,
          f = m[9] / sz,
          g = m[2] / sx,
          h = m[6] / sy,
          i = m[10] / sz,
          tr = a + e + i;
        let x, y, z, w;
        if (tr > 0) {
          const q = Math.sqrt(tr + 1) * 2;
          w = 0.25 * q;
          x = (h - f) / q;
          y = (c - g) / q;
          z = (d - b) / q;
        } else if (a > e && a > i) {
          const q = Math.sqrt(1 + a - e - i) * 2;
          w = (h - f) / q;
          x = 0.25 * q;
          y = (b + d) / q;
          z = (c + g) / q;
        } else if (e > i) {
          const q = Math.sqrt(1 + e - a - i) * 2;
          w = (c - g) / q;
          x = (b + d) / q;
          y = 0.25 * q;
          z = (f + h) / q;
        } else {
          const q = Math.sqrt(1 + i - a - e) * 2;
          w = (d - b) / q;
          x = (c + g) / q;
          y = (f + h) / q;
          z = 0.25 * q;
        }
        rotation = [x, y, z, w];
      }
      bones.push({
        name,
        parent: n.parent === -1 ? null : nameByIndex.get(n.parent),
        translation,
        rotation,
        scale,
      });
    }
    const rig = new SpatialRig3D(bones),
      boneIndex = new Map(rig.bones.map((b, i) => [ordered[i], i])),
      jointBoneIndices = skin.joints.map((j) => {
        const index = boneIndex.get(j.node);
        if (index === undefined)
          throw Error("Articulación GLB no incluida en la jerarquía");
        return index;
      });
    return {
      rig,
      skinIndex,
      jointBoneIndices,
      nodeBoneIndices: new Map(ordered.map((node, index) => [node, index])),
      inverseBindMatrices: skin.inverseBindMatrices.map((m) => m.slice()),
      skin,
    };
  };
  const dinosaur = () =>
    new SpatialRig3D([
      { name: "root", translation: [0, 0, 0] },
      { name: "pelvis", parent: "root", translation: [0, 0.78, 0] },
      { name: "spine", parent: "pelvis", translation: [0.12, 0.12, 0] },
      { name: "chest", parent: "spine", translation: [0.34, 0.12, 0] },
      { name: "neckBase", parent: "chest", translation: [0.28, 0.16, 0] },
      { name: "neckMid", parent: "neckBase", translation: [0.18, 0.22, 0] },
      { name: "head", parent: "neckMid", translation: [0.16, 0.18, 0] },
      { name: "jaw", parent: "head", translation: [0.16, -0.12, 0] },
      { name: "armL", parent: "chest", translation: [0.02, -0.12, -0.25] },
      { name: "armR", parent: "chest", translation: [0.02, -0.12, 0.25] },
      { name: "thighL", parent: "pelvis", translation: [-0.12, -0.18, -0.2] },
      { name: "shinL", parent: "thighL", translation: [-0.04, -0.3, 0] },
      { name: "footL", parent: "shinL", translation: [0.12, -0.1, 0.02] },
      { name: "thighR", parent: "pelvis", translation: [-0.12, -0.18, 0.2] },
      { name: "shinR", parent: "thighR", translation: [-0.04, -0.3, 0] },
      { name: "footR", parent: "shinR", translation: [0.12, -0.1, -0.02] },
      { name: "tailBase", parent: "pelvis", translation: [-0.3, 0.04, 0] },
      { name: "tailMid", parent: "tailBase", translation: [-0.38, 0.02, 0] },
      { name: "tailTip", parent: "tailMid", translation: [-0.34, -0.02, 0] },
    ]);
  const humanoid = () =>
    new SpatialRig3D([
      { name: "root", translation: [0, 0, 0] },
      { name: "pelvis", parent: "root", translation: [0, 1, 0] },
      { name: "spine", parent: "pelvis", translation: [0, 0.35, 0] },
      { name: "chest", parent: "spine", translation: [0, 0.35, 0] },
      { name: "neck", parent: "chest", translation: [0, 0.3, 0] },
      { name: "head", parent: "neck", translation: [0, 0.2, 0] },
      { name: "shoulderL", parent: "chest", translation: [-0.28, 0.15, 0] },
      { name: "armUpperL", parent: "shoulderL", translation: [-0.22, 0, 0] },
      { name: "armLowerL", parent: "armUpperL", translation: [-0.3, 0, 0] },
      { name: "shoulderR", parent: "chest", translation: [0.28, 0.15, 0] },
      { name: "armUpperR", parent: "shoulderR", translation: [0.22, 0, 0] },
      { name: "armLowerR", parent: "armUpperR", translation: [0.3, 0, 0] },
      { name: "thighL", parent: "pelvis", translation: [-0.14, -0.1, 0] },
      { name: "shinL", parent: "thighL", translation: [0, -0.42, 0] },
      { name: "thighR", parent: "pelvis", translation: [0.14, -0.1, 0] },
      { name: "shinR", parent: "thighR", translation: [0, -0.42, 0] },
    ]);
  window.NexoraSpatialRig3D = {
    SpatialRig3D,
    applyMorphTargets,
    GLBAnimationPlayer,
    createAnimationPlayer,
    createHumanoid: humanoid,
    createDinosaur: dinosaur,
    createFromGLB,
    math: { identity: I, multiply: mul, compose, transform, inverse },
  };
})();
