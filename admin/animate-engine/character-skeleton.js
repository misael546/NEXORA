/* NEXORA ANIMATE — hierarchical 2D character skeleton and pose propagation. */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rotate = (p, a) => ({
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a),
  });
  class CharacterSkeleton {
    constructor(nodes = []) {
      this.nodes = new Map();
      this.pose = {};
      for (const n of nodes) this.addNode(n);
    }
    addNode(node) {
      if (!node?.name) throw new Error("Cada articulación necesita nombre");
      if (this.nodes.has(node.name))
        throw new Error("Articulación duplicada: " + node.name);
      this.nodes.set(node.name, {
        name: node.name,
        parent: node.parent || null,
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        rotation: Number(node.rotation) || 0,
        limits: node.limits || null,
      });
      return this;
    }
    setLocalPose(name, pose) {
      const n = this.nodes.get(name);
      if (!n) return false;
      const limits = n.limits || {};
      this.pose[name] = {
        x: Number.isFinite(pose.x) ? pose.x : n.x,
        y: Number.isFinite(pose.y) ? pose.y : n.y,
        rotation: clamp(
          Number.isFinite(pose.rotation) ? pose.rotation : n.rotation,
          limits.min ?? -Math.PI * 2,
          limits.max ?? Math.PI * 2,
        ),
      };
      return true;
    }
    setPose(pose = {}) {
      for (const [name, p] of Object.entries(pose)) this.setLocalPose(name, p);
      return this.worldPose();
    }
    resetPose() {
      this.pose = {};
      return this.worldPose();
    }
    worldPose() {
      const out = {},
        visiting = new Set();
      const resolve = (name) => {
        if (out[name]) return out[name];
        const n = this.nodes.get(name);
        if (!n) return null;
        if (visiting.has(name)) throw new Error("Ciclo en jerarquía: " + name);
        visiting.add(name);
        const p = this.pose[name] || n,
          parent = n.parent ? resolve(n.parent) : null,
          local = {
            x: p.x ?? n.x,
            y: p.y ?? n.y,
            rotation: p.rotation ?? n.rotation,
          };
        let result;
        if (parent) {
          const offset = rotate(local, parent.rotation);
          result = {
            x: parent.x + offset.x,
            y: parent.y + offset.y,
            rotation: parent.rotation + local.rotation,
          };
        } else result = local;
        visiting.delete(name);
        out[name] = result;
        return result;
      };
      for (const name of this.nodes.keys()) resolve(name);
      return out;
    }
    exportJSON() {
      return {
        format: "nexora-character-skeleton",
        version: 1,
        nodes: [...this.nodes.values()],
        pose: { ...this.pose },
      };
    }
    static fromJSON(data) {
      if (
        data?.format !== "nexora-character-skeleton" ||
        data.version !== 1 ||
        !Array.isArray(data.nodes)
      )
        throw new Error("Esqueleto incompatible");
      const rig = new CharacterSkeleton(data.nodes);
      if (data.pose) rig.setPose(data.pose);
      return rig;
    }
  }
  function createHumanUpperBodySkeleton() {
    return new CharacterSkeleton([
      { name: "root", x: 0, y: 0 },
      { name: "hip", parent: "root", x: 0, y: 0 },
      {
        name: "spine",
        parent: "hip",
        x: 0,
        y: -0.22,
        limits: { min: -0.8, max: 0.8 },
      },
      {
        name: "chest",
        parent: "spine",
        x: 0,
        y: -0.2,
        limits: { min: -0.9, max: 0.9 },
      },
      {
        name: "neck",
        parent: "chest",
        x: 0,
        y: -0.12,
        limits: { min: -0.7, max: 0.7 },
      },
      {
        name: "head",
        parent: "neck",
        x: 0,
        y: -0.13,
        limits: { min: -0.8, max: 0.8 },
      },
      { name: "shoulderL", parent: "chest", x: -0.14, y: -0.04 },
      { name: "shoulderR", parent: "chest", x: 0.14, y: -0.04 },
      { name: "elbowL", parent: "shoulderL", x: -0.12, y: 0.17 },
      { name: "handL", parent: "elbowL", x: 0, y: 0.16 },
      { name: "elbowR", parent: "shoulderR", x: 0.12, y: 0.17 },
      { name: "handR", parent: "elbowR", x: 0, y: 0.16 },
    ]);
  }
  function buildLeanPose(amount) {
    const t = clamp(amount, 0, 1);
    return {
      spine: { rotation: 0.16 * t },
      chest: { rotation: 0.2 * t },
      neck: { rotation: 0.12 * t },
      head: { rotation: 0.48 * t },
      shoulderL: { rotation: 0.1 * t },
      shoulderR: { rotation: 0.1 * t },
      elbowL: { rotation: 0.12 * t },
      elbowR: { rotation: 0.12 * t },
    };
  }
  window.NexoraCharacterSkeleton = {
    CharacterSkeleton,
    createHumanUpperBodySkeleton,
    buildLeanPose,
  };
})();
