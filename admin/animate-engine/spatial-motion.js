/* NEXORA ANIMATE — 3D keyframe clips, quaternion interpolation and two-bone IK solver. */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    mix = (a, b, t) => a + (b - a) * t,
    vec = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const qnorm = (q) => {
    const n = Math.hypot(...q) || 1;
    return q.map((v) => v / n);
  };
  const slerp = (a, b, t) => {
    a = qnorm(a);
    b = qnorm(b);
    let d = a.reduce((n, v, i) => n + v * b[i], 0);
    if (d < 0) {
      b = b.map((v) => -v);
      d = -d;
    }
    if (d > 0.9995) return qnorm(vec(a, b, t));
    const theta = Math.acos(clamp(d, -1, 1)),
      sin = Math.sin(theta);
    return a.map(
      (v, i) =>
        (v * Math.sin((1 - t) * theta) + b[i] * Math.sin(t * theta)) / sin,
    );
  };
  class SpatialAnimationClip {
    constructor({
      name = "Animación 3D",
      duration = 1,
      fps = 30,
      loop = false,
      tracks = [],
    } = {}) {
      this.name = name;
      this.duration = Math.max(0.001, duration);
      this.fps = fps;
      this.loop = loop;
      this.tracks = tracks.map((t) => ({
        bone: t.bone,
        keyframes: t.keyframes.slice().sort((a, b) => a.time - b.time),
      }));
      for (const t of this.tracks)
        if (!t.bone || !t.keyframes.length)
          throw Error("Canal de animación 3D inválido");
    }
    sample(time) {
      let t = this.loop
        ? ((time % this.duration) + this.duration) % this.duration
        : clamp(time, 0, this.duration);
      const pose = {};
      for (const track of this.tracks) {
        const keys = track.keyframes;
        let a = keys[0],
          b = keys[keys.length - 1];
        if (t <= a.time) b = a;
        else if (t >= b.time) a = b;
        else {
          for (let i = 0; i < keys.length - 1; i++)
            if (t >= keys[i].time && t <= keys[i + 1].time) {
              a = keys[i];
              b = keys[i + 1];
              break;
            }
        }
        const span = b.time - a.time,
          k = span > 0 ? (t - a.time) / span : 0,
          out = {};
        for (const prop of ["translation", "scale"])
          if (a[prop] || b[prop])
            out[prop] = vec(
              a[prop] || (prop === "scale" ? [1, 1, 1] : [0, 0, 0]),
              b[prop] || (prop === "scale" ? [1, 1, 1] : [0, 0, 0]),
              k,
            );
        if (a.rotation || b.rotation)
          out.rotation = slerp(
            a.rotation || [0, 0, 0, 1],
            b.rotation || [0, 0, 0, 1],
            k,
          );
        pose[track.bone] = out;
      }
      return { time: t, pose };
    }
    apply(rig, time) {
      const frame = this.sample(time);
      for (const [name, pose] of Object.entries(frame.pose)) {
        const bone = rig.byName.get(name);
        if (!bone) continue;
        if (pose.translation) bone.translation = pose.translation;
        if (pose.rotation) bone.rotation = pose.rotation;
        if (pose.scale) bone.scale = pose.scale;
      }
      rig.updateWorld();
      return frame;
    }
    exportJSON() {
      return {
        format: "nexora-spatial-animation",
        version: 1,
        name: this.name,
        duration: this.duration,
        fps: this.fps,
        loop: this.loop,
        tracks: this.tracks,
      };
    }
    static fromJSON(data) {
      if (
        data?.format !== "nexora-spatial-animation" ||
        !Array.isArray(data.tracks)
      )
        throw Error("Clip 3D inválido");
      return new SpatialAnimationClip(data);
    }
  }
  function solveTwoBoneIK(root, target, lengthA, lengthB, pole = [0, 0, 1]) {
    const sub = (a, b) => a.map((v, i) => v - b[i]),
      add = (a, b) => a.map((v, i) => v + b[i]),
      mul = (a, s) => a.map((v) => v * s),
      dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0),
      cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ],
      unit = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
    const delta = sub(target, root),
      raw = Math.hypot(...delta),
      d = clamp(
        raw,
        Math.abs(lengthA - lengthB) + 1e-5,
        lengthA + lengthB - 1e-5,
      ),
      dir = unit(delta),
      side = unit(cross(dir, pole)),
      height = Math.sqrt(
        Math.max(
          0,
          lengthA * lengthA -
            Math.pow(
              (lengthA * lengthA - lengthB * lengthB + d * d) / (2 * d),
              2,
            ),
        ),
      ),
      along = (lengthA * lengthA - lengthB * lengthB + d * d) / (2 * d),
      elbow = add(add(root, mul(dir, along)), mul(side, height)),
      end = add(root, mul(dir, d));
    return {
      root: root.slice(),
      elbow,
      end,
      clamped: Math.abs(raw - d) > 1e-5,
    };
  }
  window.NexoraSpatialMotion = {
    SpatialAnimationClip,
    solveTwoBoneIK,
    quaternion: { slerp },
  };
})();
