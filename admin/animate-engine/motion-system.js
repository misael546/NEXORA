/* NEXORA ANIMATE — 2D character acting, body mechanics and keyframe timeline. */
(() => {
  "use strict";
  const clamp = (v, a = 0, b = 1) =>
    Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easing = ["smooth", "linear", "ease-in", "ease-out", "hold"];
  const ease = (t, kind = "smooth") => {
    t = clamp(t);
    if (kind === "linear") return t;
    if (kind === "ease-in") return t * t;
    if (kind === "ease-out") return 1 - (1 - t) * (1 - t);
    if (kind === "hold") return 0;
    return t * t * (3 - 2 * t);
  };
  const copyPoints = (p) =>
    Object.fromEntries(
      Object.entries(p || {}).map(([k, v]) => {
        if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y))
          throw new Error("Pose inválida en la articulación " + k);
        return [k, { x: clamp(v.x), y: clamp(v.y) }];
      }),
    );
  const blendPose = (pose, transition, time) => {
    if (!transition) return pose;
    const progress = clamp((time - transition.start) / transition.duration);
    if (progress >= 1) return pose;
    const t = ease(progress),
      out = {};
    for (const name of new Set([
      ...Object.keys(transition.from),
      ...Object.keys(pose),
    ])) {
      const a = transition.from[name] || pose[name],
        b = pose[name] || a;
      out[name] = { x: clamp(lerp(a.x, b.x, t)), y: clamp(lerp(a.y, b.y, t)) };
    }
    return out;
  };
  const cyc = (t) => Math.sin(t * Math.PI * 2),
    pulse = (t) => Math.sin(Math.PI * clamp(t));
  const cycles = {
    idle: (p, t) => {
      const s = cyc(t);
      if (/shoulder/.test(p)) return { x: 0, y: -0.008 * s };
      if (p === "head") return { x: 0, y: -0.004 * s };
      if (p === "hip") return { x: 0, y: 0.004 * s };
      return { x: 0, y: 0 };
    },
    walk: (p, t) => {
      const s = cyc(t);
      if (/arm|elbow|hand/.test(p))
        return { x: 0, y: s * (p.includes("L") ? -0.045 : 0.045) };
      if (/knee|foot/.test(p))
        return {
          x: s * (p.includes("L") ? 0.035 : -0.035),
          y: Math.max(0, Math.cos(t * Math.PI * 2)) * 0.025,
        };
      if (p === "hip") return { x: 0, y: Math.abs(s) * -0.012 };
      if (p === "head") return { x: 0, y: -Math.abs(s) * 0.006 };
      return { x: 0, y: 0 };
    },
    run: (p, t) => {
      const s = cyc(t);
      if (/arm|elbow|hand/.test(p))
        return { x: 0, y: s * (p.includes("L") ? -0.09 : 0.09) };
      if (/knee|foot/.test(p))
        return {
          x: s * (p.includes("L") ? 0.07 : -0.07),
          y: Math.max(0, Math.cos(t * Math.PI * 2)) * 0.055,
        };
      if (p === "hip") return { x: 0, y: -Math.abs(s) * 0.035 };
      if (p === "head") return { x: 0, y: -Math.abs(s) * 0.012 };
      return { x: 0, y: 0 };
    },
    jump: (p, t) => {
      const lift = pulse(t);
      if (p === "hip" || p === "neck" || p === "head")
        return { x: 0, y: -0.12 * lift };
      if (/arm|hand|elbow/.test(p)) return { x: 0, y: -0.1 * lift };
      if (/knee|foot/.test(p)) return { x: 0, y: -0.045 * lift };
      return { x: 0, y: 0 };
    },
    talk: (p, t) => {
      const s = cyc(t * 4);
      if (p === "head") return { x: 0, y: -0.006 * Math.abs(s) };
      if (/hand|elbow/.test(p))
        return { x: s * 0.012, y: -0.012 * Math.abs(s) };
      return { x: 0, y: 0 };
    },
    hit: (p, t) => {
      const recoil = pulse(Math.min(1, t * 2));
      if (p === "head" || p === "neck")
        return { x: -0.045 * recoil, y: 0.018 * recoil };
      if (/shoulder|elbow|hand/.test(p))
        return { x: -0.035 * recoil, y: 0.025 * recoil };
      if (p === "hip") return { x: -0.018 * recoil, y: 0.01 * recoil };
      return { x: 0, y: 0 };
    },
    "worker-idle": (p, t) => {
      const s = cyc(t);
      if (p === "head") return { x: 0.002 * s, y: -0.006 * s };
      if (p === "neck" || p === "hip") return { x: 0, y: -0.006 * s };
      if (/shoulder/.test(p)) return { x: 0, y: -0.008 * s };
      if (/hand/.test(p)) return { x: 0, y: 0.004 * s };
      return { x: 0, y: 0 };
    },
    "worker-walk": (p, t) => {
      const phase = t * Math.PI * 2,
        s = Math.sin(phase),
        side = p.endsWith("L") ? 0 : Math.PI,
        legPhase = phase + side,
        stride = Math.sin(legPhase),
        lift = Math.max(0, Math.cos(legPhase));
      if (p === "hip") return { x: 0.006 * s, y: -0.018 * Math.abs(s) };
      if (p === "neck") return { x: -0.006 * s, y: -0.01 * Math.abs(s) };
      if (p === "head") return { x: -0.008 * s, y: -0.012 * Math.abs(s) };
      if (p === "shoulderL") return { x: -0.008 * s, y: -0.006 * Math.abs(s) };
      if (p === "shoulderR") return { x: 0.008 * s, y: -0.006 * Math.abs(s) };
      if (p === "elbowL" || p === "elbowR" || p === "handL" || p === "handR") {
        const armPhase = phase + (p.endsWith("L") ? Math.PI : 0),
          hand = p === "handL" || p === "handR",
          sideSign = p.endsWith("L") ? -1 : 1;
        return {
          x: sideSign * 0.018 * Math.cos(armPhase),
          y: (hand ? 0.064 : 0.042) * Math.sin(armPhase),
        };
      }
      if (/knee/.test(p)) return { x: stride * 0.052, y: -lift * 0.02 };
      if (/foot/.test(p)) return { x: stride * 0.075, y: -lift * 0.085 };
      return { x: 0, y: 0 };
    },
    "worker-run": (p, t) => cycles.run(p, t),
    "worker-work": (p, t) => {
      const s = cyc(t * 1.5),
        lift = Math.max(0, s);
      if (p === "head" || p === "neck")
        return { x: 0.005 * s, y: 0.025 + Math.abs(s) * 0.008 };
      if (p === "hip") return { x: 0, y: 0.018 };
      if (/elbowL/.test(p)) return { x: -0.018 * lift, y: -0.035 * lift };
      if (/handL/.test(p)) return { x: -0.025 * lift, y: -0.075 * lift };
      if (/elbowR/.test(p)) return { x: 0.012 * lift, y: -0.018 * lift };
      if (/handR/.test(p)) return { x: 0.025 * lift, y: -0.05 * lift };
      return { x: 0, y: 0 };
    },
    "worker-lift": (p, t) => {
      const lift =
        t < 0.28 ? ease(t / 0.28) : t < 0.72 ? 1 : 1 - ease((t - 0.72) / 0.28);
      if (p === "jaw") return { x: 0, y: 0.014 * lift };
      if (p === "head" || p === "neck")
        return { x: 0, y: 0.035 - 0.025 * lift };
      if (p === "hip") return { x: 0, y: 0.025 - 0.012 * lift };
      if (p === "shoulderL") return { x: 0.018 * lift, y: -0.035 * lift };
      if (p === "shoulderR") return { x: -0.018 * lift, y: -0.035 * lift };
      if (p === "elbowL") return { x: 0.025 * lift, y: -0.065 * lift };
      if (p === "elbowR") return { x: -0.025 * lift, y: -0.065 * lift };
      if (p === "handL") return { x: 0.015 * lift, y: -0.15 * lift };
      if (p === "handR") return { x: -0.015 * lift, y: -0.15 * lift };
      if (/knee/.test(p)) return { x: 0, y: 0.025 * (1 - lift) };
      return { x: 0, y: 0 };
    },
    "worker-carry": (p, t) => {
      const s = cyc(t);
      if (p === "jaw")
        return { x: 0, y: 0.009 * Math.max(0, Math.sin(t * Math.PI * 2)) };
      if (p === "head") return { x: 0.004 * s, y: -0.004 * Math.abs(s) };
      if (p === "hip") return { x: 0, y: -0.012 * Math.abs(s) };
      if (p === "shoulderL") return { x: 0.015, y: -0.018 };
      if (p === "shoulderR") return { x: -0.015, y: -0.018 };
      if (p === "elbowL") return { x: 0.025, y: -0.035 };
      if (p === "elbowR") return { x: -0.025, y: -0.035 };
      if (p === "handL") return { x: 0.012, y: -0.035 };
      if (p === "handR") return { x: -0.012, y: -0.035 };
      if (/foot/.test(p))
        return { x: s * (p.includes("L") ? 0.018 : -0.018), y: 0 };
      return { x: 0, y: 0 };
    },
    "worker-hammer": (p, t) => {
      const raise =
        t < 0.36
          ? ease(t / 0.36)
          : t < 0.48
            ? 1
            : t < 0.56
              ? 1 - ease((t - 0.48) / 0.08)
              : 0;
      const strike =
        t < 0.48
          ? 0
          : t < 0.6
            ? ease((t - 0.48) / 0.12)
            : t < 0.7
              ? 1
              : t < 0.84
                ? 1 - ease((t - 0.7) / 0.14)
                : 0;
      const brace = strike * (1 - 0.35 * raise);
      if (p === "head")
        return {
          x: 0.004 * raise + 0.014 * strike,
          y: 0.014 * strike - 0.01 * raise,
        };
      if (p === "neck")
        return { x: 0.008 * strike, y: 0.014 * strike - 0.01 * raise };
      if (p === "jaw") return { x: 0, y: 0.012 * raise + 0.024 * strike };
      if (p === "hip")
        return {
          x: -0.008 * raise + 0.018 * strike,
          y: 0.01 * strike + 0.006 * brace,
        };
      if (p === "shoulderR")
        return {
          x: -0.018 * raise + 0.025 * strike,
          y: -0.08 * raise + 0.045 * strike,
        };
      if (p === "elbowR")
        return {
          x: -0.03 * raise + 0.04 * strike,
          y: -0.18 * raise + 0.12 * strike,
        };
      if (p === "handR")
        return {
          x: -0.05 * raise + 0.08 * strike,
          y: -0.32 * raise + 0.13 * strike,
        };
      // The free arm counterbalances the hammer arc instead of hanging at the side.
      if (p === "shoulderL")
        return {
          x: -0.008 * raise - 0.008 * strike,
          y: -0.012 * raise - 0.008 * brace,
        };
      if (p === "elbowL")
        return { x: -0.012 - 0.012 * brace, y: -0.025 - 0.018 * brace };
      if (p === "handL")
        return { x: -0.02 - 0.02 * brace, y: -0.05 - 0.025 * brace };
      // The knees absorb the impact; the feet make a small corrective plant.
      if (p === "kneeL") return { x: -0.008 * brace, y: 0.022 * brace };
      if (p === "kneeR") return { x: 0.014 * brace, y: 0.026 * brace };
      if (p === "footL") return { x: -0.006 * brace, y: 0.004 * brace };
      if (p === "footR") return { x: 0.012 * brace, y: 0.004 * brace };
      return { x: 0, y: 0 };
    },
    "worker-dig": (p, t) => {
      const s = cyc(t * 1.4);
      if (p === "head" || p === "neck")
        return { x: 0.018, y: 0.04 + Math.max(0, s) * 0.012 };
      if (p === "hip") return { x: 0, y: 0.02 };
      if (/shoulder/.test(p)) return { x: 0, y: 0.025 };
      if (p === "elbowL" || p === "elbowR") return { x: s * 0.025, y: -0.045 };
      if (p === "handL" || p === "handR")
        return { x: s * 0.035, y: -0.09 - Math.max(0, s) * 0.025 };
      if (/knee/.test(p)) return { x: 0, y: 0.035 };
      return { x: 0, y: 0 };
    },
    "worker-wave": (p, t) => {
      const s = cyc(t * 2);
      if (p === "shoulderR") return { x: 0.015, y: -0.055 };
      if (p === "elbowR") return { x: 0.025 * s, y: -0.11 };
      if (p === "handR") return { x: 0.07 * s, y: -0.17 };
      if (p === "head") return { x: 0.006 * s, y: 0 };
      return { x: 0, y: 0 };
    },
    "worker-talk": (p, t) => {
      const mouth = Math.max(0, Math.sin(t * Math.PI * 8)),
        gesture = cyc(t * 1.4);
      if (p === "jaw") return { x: 0, y: 0.022 * mouth };
      if (p === "head")
        return { x: 0.003 * gesture, y: -0.004 * Math.abs(mouth) };
      if (p === "handR" || p === "handL")
        return { x: 0.009 * gesture, y: -0.006 * Math.abs(gesture) };
      return { x: 0, y: 0 };
    },
    "worker-push": (p, t) => {
      const a =
        t < 0.18 ? ease(t / 0.18) : t < 0.72 ? 1 : 1 - ease((t - 0.72) / 0.28);
      if (p === "head" || p === "neck") return { x: 0.012 * a, y: 0.022 * a };
      if (p === "hip") return { x: -0.008 * a, y: 0.012 * a };
      if (p === "shoulderL" || p === "shoulderR")
        return { x: 0.006 * a, y: -0.018 * a };
      if (p === "elbowL" || p === "elbowR")
        return { x: p === "elbowL" ? 0.015 * a : -0.015 * a, y: -0.055 * a };
      if (p === "handL" || p === "handR")
        return { x: p === "handL" ? 0.03 * a : -0.03 * a, y: -0.12 * a };
      return { x: 0, y: 0 };
    },
    "worker-pull": (p, t) => {
      const a =
        t < 0.2 ? ease(t / 0.2) : t < 0.68 ? 1 : 1 - ease((t - 0.68) / 0.32);
      if (p === "head" || p === "neck") return { x: -0.012 * a, y: -0.01 * a };
      if (p === "hip") return { x: -0.01 * a, y: 0 };
      if (p === "elbowL" || p === "elbowR")
        return { x: p === "elbowL" ? 0.05 * a : -0.05 * a, y: 0.015 * a };
      if (p === "handL" || p === "handR")
        return { x: p === "handL" ? 0.1 * a : -0.1 * a, y: 0.055 * a };
      return { x: 0, y: 0 };
    },
    "worker-kneel": (p, t) => {
      const a = ease(Math.min(1, t / 0.72));
      if (p === "hip") return { x: 0, y: 0.07 * a };
      if (p === "head" || p === "neck") return { x: 0.008 * a, y: 0.035 * a };
      if (p === "kneeL") return { x: 0.015 * a, y: 0.08 * a };
      if (p === "kneeR") return { x: -0.02 * a, y: 0.06 * a };
      if (p === "footL" || p === "footR") return { x: 0, y: 0.025 * a };
      if (p === "handL") return { x: 0.07 * a, y: 0.015 * a };
      if (p === "handR") return { x: -0.04 * a, y: -0.025 * a };
      return { x: 0, y: 0 };
    },
    "worker-point": (p, t) => {
      const a =
        t < 0.2 ? ease(t / 0.2) : t > 0.88 ? 1 - ease((t - 0.88) / 0.12) : 1;
      if (p === "shoulderR") return { x: 0.015 * a, y: -0.045 * a };
      if (p === "elbowR") return { x: 0.035 * a, y: -0.12 * a };
      if (p === "handR") return { x: 0.12 * a, y: -0.16 * a };
      if (p === "head") return { x: 0.008 * a, y: -0.012 * a };
      return { x: 0, y: 0 };
    },
    "dino-idle": (p, t) => {
      const s = cyc(t);
      if (p === "chest" || p === "spine") return { x: 0, y: -0.012 * s };
      if (p === "head") return { x: -0.004 * s, y: -0.007 * s };
      if (p === "neck") return { x: -0.006 * s, y: -0.01 * s };
      if (/^tail[1-4]$/.test(p))
        return {
          x: 0,
          y:
            Math.sin(t * Math.PI * 2 - Number(p.slice(4)) * 0.42) *
            0.012 *
            Number(p.slice(4)),
        };
      if (/knee|foot/.test(p)) return { x: 0, y: 0.003 * Math.abs(s) };
      return { x: 0, y: 0 };
    },
    "dino-walk": (p, t) => {
      const phase = t * Math.PI * 2,
        s = Math.sin(phase),
        side = p.endsWith("L") ? 0 : Math.PI,
        legPhase = phase + side,
        stride = Math.sin(legPhase),
        lift = Math.max(0, Math.cos(legPhase));
      if (p === "hip") return { x: 0, y: -0.022 * Math.abs(s) };
      if (p === "chest" || p === "neck")
        return { x: 0.004 * s, y: -0.012 * Math.abs(s) };
      if (p === "head") return { x: 0.006 * s, y: -0.014 * Math.abs(s) };
      if (p === "jaw") return { x: 0, y: 0.004 * Math.max(0, s) };
      if (/^tail[1-4]$/.test(p)) {
        const n = Number(p.slice(4));
        return { x: 0, y: Math.sin(phase - n * 0.48) * (0.009 * n) };
      }
      if (/knee/.test(p)) return { x: stride * 0.052, y: -lift * 0.022 };
      if (/foot/.test(p)) return { x: stride * 0.075, y: -lift * 0.09 };
      if (/elbow|hand/.test(p)) return { x: 0.012 * s, y: -0.018 * s };
      if (/shoulder/.test(p)) return { x: 0, y: -0.006 * Math.abs(s) };
      return { x: 0, y: 0 };
    },
    "dino-run": (p, t) => {
      const s = cyc(t * 1.3),
        phase = t * Math.PI * 2 * 1.3;
      if (p === "hip" || p === "chest") return { x: 0, y: -0.04 * Math.abs(s) };
      if (p === "head" || p === "neck")
        return { x: -0.018 * s, y: -0.022 * Math.abs(s) };
      if (p === "jaw")
        return {
          x: -0.018 * s,
          y: -0.022 * Math.abs(s) + 0.004 * Math.max(0, Math.sin(phase)),
        };
      if (p === "kneeL" || p === "footL")
        return { x: 0.055 * s, y: Math.max(0, Math.cos(phase)) * 0.05 };
      if (p === "kneeR" || p === "footR")
        return { x: -0.055 * s, y: Math.max(0, -Math.cos(phase)) * 0.05 };
      if (/hand/.test(p)) return { x: 0, y: -0.025 + 0.02 * s };
      if (/^tail[1-4]$/.test(p)) {
        const n = Number(p.slice(4));
        return {
          x: 0.004 * n,
          y: Math.sin(phase - n * 0.34) * (0.014 + n * 0.006),
        };
      }
      return { x: 0, y: 0 };
    },
    "dino-roar": (p, t) => {
      const a = pulse(t);
      if (p === "head") return { x: -0.012 * a, y: -0.018 * a };
      if (p === "neck") return { x: -0.008 * a, y: -0.012 * a };
      if (p === "jaw") return { x: -0.018 * a, y: 0.065 * a };
      if (p === "chest") return { x: 0, y: -0.022 * a };
      if (/hand/.test(p)) return { x: 0, y: -0.025 * a };
      if (/^tail[1-4]$/.test(p))
        return { x: 0, y: 0.012 * a * Number(p.slice(4)) };
      return { x: 0, y: 0 };
    },
    "dino-bite": (p, t) => {
      const a = Math.sin(Math.PI * clamp(t));
      if (p === "head") return { x: -0.045 * a, y: 0.055 * a };
      if (p === "neck") return { x: -0.03 * a, y: 0.035 * a };
      if (p === "jaw") return { x: -0.02 * a, y: 0.135 * a };
      if (p === "chest") return { x: -0.015 * a, y: 0.012 * a };
      if (p === "hip") return { x: -0.01 * a, y: 0.01 * a };
      if (/^tail[1-4]$/.test(p))
        return { x: 0.012 * a, y: -0.008 * a * Number(p.slice(4)) };
      return { x: 0, y: 0 };
    },
    "dino-tail-swipe": (p, t) => {
      const a = Math.sin(Math.PI * clamp(t));
      if (p === "tail1") return { x: -0.006 * a, y: 0.028 * a };
      if (p === "tail2") return { x: 0.004 * a, y: 0.075 * a };
      if (p === "tail3") return { x: 0.025 * a, y: 0.135 * a };
      if (p === "tail4") return { x: 0.105 * a, y: 0.19 * a };
      if (p === "hip" || p === "spine") return { x: -0.022 * a, y: 0.008 * a };
      if (p === "head" || p === "neck") return { x: 0.018 * a, y: -0.014 * a };
      if (p === "chest") return { x: -0.008 * a, y: 0.006 * a };
      return { x: 0, y: 0 };
    },
    "dino-hit": (p, t) => {
      const a = pulse(t);
      if (p === "head") return { x: 0.04 * a, y: 0.025 * a };
      if (p === "neck" || p === "chest") return { x: 0.025 * a, y: 0.02 * a };
      if (p === "hip") return { x: -0.015 * a, y: 0.018 * a };
      if (/^tail[1-4]$/.test(p))
        return { x: -0.018 * a, y: -0.018 * a * Number(p.slice(4)) };
      return { x: 0, y: 0 };
    },
    "dino-crouch": (p, t) => {
      const a = ease(t);
      if (p === "hip" || p === "chest") return { x: 0, y: 0.055 * a };
      if (p === "head" || p === "neck") return { x: -0.015 * a, y: 0.045 * a };
      if (/knee/.test(p)) return { x: 0, y: 0.065 * a };
      if (/foot/.test(p)) return { x: 0, y: 0.025 * a };
      if (/^tail[1-4]$/.test(p))
        return { x: 0.006 * a, y: 0.025 * a * Number(p.slice(4)) };
      return { x: 0, y: 0 };
    },
    "dino-sniff": (p, t) => {
      const dip =
        t < 0.3
          ? ease(t / 0.3)
          : t < 0.58
            ? 1 - ease((t - 0.3) / 0.28)
            : 0.12 * Math.sin((t - 0.58) * Math.PI * 8);
      if (p === "head") return { x: 0.035 * dip, y: 0.055 * dip };
      if (p === "neck") return { x: 0.018 * dip, y: 0.04 * dip };
      if (p === "jaw")
        return { x: 0, y: 0.008 * Math.max(0, Math.sin(t * Math.PI * 12)) };
      if (p === "chest") return { x: 0, y: -0.008 * Math.sin(t * Math.PI * 6) };
      if (/^tail[1-4]$/.test(p))
        return {
          x: 0,
          y:
            Math.sin(t * Math.PI * 2 - Number(p.slice(4)) * 0.35) *
            0.006 *
            Number(p.slice(4)),
        };
      return { x: 0, y: 0 };
    },
    "dino-stomp": (p, t) => {
      const lift =
          t < 0.24
            ? ease(t / 0.24)
            : t < 0.48
              ? 1
              : t < 0.62
                ? 1 - ease((t - 0.48) / 0.14)
                : 0,
        impact =
          t > 0.48 && t < 0.78 ? Math.sin((Math.PI * (t - 0.48)) / 0.3) : 0;
      if (p === "footL")
        return { x: -0.015 * lift, y: -0.13 * lift + 0.025 * impact };
      if (p === "kneeL") return { x: -0.012 * lift, y: -0.045 * lift };
      if (p === "hip" || p === "chest")
        return { x: 0, y: -0.018 * lift + 0.035 * impact };
      if (p === "head" || p === "neck")
        return { x: 0.008 * impact, y: 0.018 * impact };
      if (/^tail[1-4]$/.test(p))
        return { x: -0.004 * impact, y: -0.012 * impact * Number(p.slice(4)) };
      return { x: 0, y: 0 };
    },
    "dino-pounce": (p, t) => {
      const crouch =
          t < 0.22
            ? ease(t / 0.22)
            : t < 0.38
              ? 1 - ease((t - 0.22) / 0.16)
              : 0,
        flight =
          t < 0.38 ? 0 : t < 0.72 ? Math.sin((Math.PI * (t - 0.38)) / 0.34) : 0,
        land =
          t > 0.72 ? Math.sin(Math.PI * Math.min(1, (t - 0.72) / 0.28)) : 0;
      if (p === "hip" || p === "chest")
        return {
          x: 0.035 * flight,
          y: 0.055 * crouch - 0.14 * flight + 0.025 * land,
        };
      if (p === "head" || p === "neck")
        return {
          x: 0.025 * flight,
          y: 0.035 * crouch - 0.105 * flight + 0.02 * land,
        };
      if (/knee/.test(p)) return { x: 0, y: 0.055 * crouch - 0.065 * flight };
      if (/foot/.test(p))
        return { x: 0, y: 0.025 * crouch - 0.085 * flight + 0.018 * land };
      if (/hand/.test(p)) return { x: 0.012 * flight, y: -0.045 * flight };
      if (/^tail[1-4]$/.test(p)) {
        const n = Number(p.slice(4));
        return {
          x: -0.012 * flight * n,
          y: 0.025 * crouch + 0.018 * flight * n,
        };
      }
      return { x: 0, y: 0 };
    },
    "dino-threat": (p, t) => {
      const a =
        t < 0.22 ? ease(t / 0.22) : t < 0.78 ? 1 : 1 - ease((t - 0.78) / 0.22);
      if (p === "head") return { x: -0.025 * a, y: -0.075 * a };
      if (p === "neck") return { x: -0.018 * a, y: -0.055 * a };
      if (p === "jaw") return { x: -0.008 * a, y: 0.075 * a };
      if (p === "chest") return { x: 0, y: -0.028 * a };
      if (p === "hip") return { x: -0.012 * a, y: 0 };
      if (/hand/.test(p)) return { x: 0, y: -0.035 * a };
      if (/^tail[1-4]$/.test(p)) {
        const n = Number(p.slice(4));
        return {
          x: 0,
          y: Math.sin(t * Math.PI * 4 - n * 0.35) * 0.025 * a * n,
        };
      }
      return { x: 0, y: 0 };
    },
  };
  function chainPoint(root, angle, length) {
    return {
      x: root.x + Math.sin(angle) * length,
      y: root.y + Math.cos(angle) * length,
    };
  }
  function solveTwoBoneIK(root, target, len1, len2, pole = 1) {
    const l1 = Math.max(0.001, Math.abs(Number(len1) || 0)),
      l2 = Math.max(0.001, Math.abs(Number(len2) || 0));
    const dx = target.x - root.x,
      dy = target.y - root.y,
      raw = Math.hypot(dx, dy),
      safe = raw || 0.001;
    const dist = clamp(safe, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001);
    const cosine = clamp(
      (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist),
      -1,
      1,
    );
    const angle = Math.acos(cosine),
      base = Math.atan2(dy || 0, dx || 1) + (pole < 0 ? -angle : angle);
    return { x: root.x + Math.cos(base) * l1, y: root.y + Math.sin(base) * l1 };
  }
  function applyWalkKinematics(out, base, preset, progress) {
    const dinosaur = preset.startsWith("dino-"),
      running = preset.endsWith("-run");
    const phase = progress * Math.PI * 4 * (running ? 1.35 : 1);
    const stride = dinosaur
      ? running
        ? 0.07
        : 0.045
      : running
        ? 0.054
        : 0.032;
    const liftHeight = dinosaur
      ? running
        ? 0.065
        : 0.048
      : running
        ? 0.086
        : 0.064;
    // Sprinting uses a wider counter-swing so the hands visibly oppose the legs.
    const armRange = dinosaur
      ? running
        ? 0.034
        : 0.014
      : running
        ? 0.05
        : 0.018;
    // A small suspension arc moves the torso as one mass instead of leaving it rigid above the legs.
    if (running) {
      const airborne = Math.max(0, Math.cos(phase)),
        bob = airborne * (dinosaur ? 0.024 : 0.021);
      const weights = dinosaur
        ? {
            hip: 1,
            chest: 0.82,
            neck: 0.55,
            head: 0.42,
            jaw: 0.42,
            shoulderL: 0.72,
            shoulderR: 0.72,
          }
        : { hip: 1, neck: 0.55, head: 0.42, shoulderL: 0.72, shoulderR: 0.72 };
      for (const [name, weight] of Object.entries(weights))
        if (out[name]) out[name].y = clamp(out[name].y - bob * weight);
    }
    const solveChain = (
      rootName,
      jointName,
      endName,
      phaseOffset,
      range,
      lift,
      pole,
    ) => {
      const root = out[rootName],
        baseRoot = base[rootName],
        baseJoint = base[jointName],
        baseEnd = base[endName];
      if (!root || !baseRoot || !baseJoint || !baseEnd) return;
      const upper = Math.hypot(
        baseJoint.x - baseRoot.x,
        baseJoint.y - baseRoot.y,
      );
      const lower = Math.hypot(
        baseEnd.x - baseJoint.x,
        baseEnd.y - baseJoint.y,
      );
      if (upper < 0.001 || lower < 0.001) return;
      const p = phase + phaseOffset,
        step = Math.sin(p),
        air = Math.max(0, Math.cos(p));
      let target = {
        x: clamp(baseEnd.x + step * range),
        y: clamp(baseEnd.y - air * lift),
      };
      // Keep the foot target inside the real reach of both segments.
      const dx = target.x - root.x,
        dy = target.y - root.y,
        rawDistance = Math.hypot(dx, dy) || 0.001;
      const minReach = Math.abs(upper - lower) + 0.002,
        maxReach = upper + lower - 0.002;
      const reachable = clamp(rawDistance, minReach, maxReach);
      if (Math.abs(reachable - rawDistance) > 0.000001)
        target = {
          x: clamp(root.x + (dx / rawDistance) * reachable),
          y: clamp(root.y + (dy / rawDistance) * reachable),
        };
      const joint = solveTwoBoneIK(root, target, upper, lower, pole);
      out[jointName] = joint;
      out[endName] = target;
    };
    // Each foot has a planted half-cycle and a lifted return. The knee is solved from fixed bone lengths.
    solveChain("hip", "kneeL", "footL", 0, stride, liftHeight, 1);
    solveChain("hip", "kneeR", "footR", Math.PI, stride, liftHeight, -1);
    // Arms counter-swing against the legs, with smaller travel than the feet.
    const armLift = dinosaur
      ? running
        ? 0.022
        : 0.008
      : running
        ? 0.042
        : 0.012;
    solveChain("shoulderL", "elbowL", "handL", Math.PI, armRange, armLift, 1);
    solveChain("shoulderR", "elbowR", "handR", 0, armRange, armLift, -1);
    if (dinosaur) {
      let root = out.hip;
      const names = ["tail1", "tail2", "tail3", "tail4"],
        parents = ["hip", "tail1", "tail2", "tail3"];
      names.forEach((name, i) => {
        const parent = parents[i],
          a = base[parent],
          b = base[name];
        if (!a || !b) return;
        const length = Math.hypot(b.x - a.x, b.y - a.y),
          baseAngle = Math.atan2(b.x - a.x, b.y - a.y);
        const sway =
          Math.sin(phase - (i + 1) * 0.62) *
          (running ? 0.055 + (i + 1) * 0.016 : 0.035 + (i + 1) * 0.012);
        root = chainPoint(root, baseAngle + sway, length);
        out[name] = root;
      });
    }
  }

  function addSecondaryOffset(out, name, x = 0, y = 0) {
    const point = out[name];
    if (!point) return;
    out[name] = { x: clamp(point.x + x), y: clamp(point.y + y) };
  }
  function applyTailFollowThrough(out, base, t, strength = 1) {
    if (!out.hip) return;
    const activation = ease(clamp((t - 0.34) / 0.66));
    let parent = out.hip;
    for (let i = 1; i <= 4; i++) {
      const name = "tail" + i,
        current = out[name],
        baseParent = i === 1 ? base.hip : base["tail" + (i - 1)],
        basePoint = base[name];
      if (!current || !baseParent || !basePoint) continue;
      const length = Math.hypot(current.x - parent.x, current.y - parent.y);
      const sourceLength = Math.hypot(
        basePoint.x - baseParent.x,
        basePoint.y - baseParent.y,
      );
      const safeLength = length > 0.001 ? length : sourceLength;
      const angle = Math.atan2(current.y - parent.y, current.x - parent.x);
      const lag =
        Math.sin((t * 2.15 - i * 0.105) * Math.PI * 2) *
        (0.0045 * i * strength * activation);
      const nextAngle = angle + lag;
      const next = {
        x: clamp(parent.x + Math.cos(nextAngle) * safeLength),
        y: clamp(parent.y + Math.sin(nextAngle) * safeLength),
      };
      out[name] = next;
      parent = next;
    }
  }
  function applySecondaryActing(out, base, preset, t) {
    if (preset === "worker-hammer") {
      const elapsed = Math.max(0, t - 0.6),
        ring = Math.sin(elapsed * Math.PI * 5) * Math.exp(-elapsed * 8);
      addSecondaryOffset(out, "head", -0.006 * ring, 0.003 * Math.abs(ring));
      addSecondaryOffset(out, "neck", -0.004 * ring, 0.002 * Math.abs(ring));
      addSecondaryOffset(out, "hip", 0.002 * ring, 0.001 * Math.abs(ring));
      addSecondaryOffset(out, "handR", 0.003 * ring, 0.002 * ring);
    }
    if (preset === "worker-dig") {
      const settle = Math.sin(t * Math.PI * 4.2) * Math.sin(Math.PI * clamp(t));
      addSecondaryOffset(
        out,
        "head",
        0.0025 * settle,
        -0.002 * Math.abs(settle),
      );
      addSecondaryOffset(
        out,
        "neck",
        0.002 * settle,
        -0.0015 * Math.abs(settle),
      );
      addSecondaryOffset(
        out,
        "hip",
        -0.0015 * settle,
        0.001 * Math.abs(settle),
      );
    }
    if (preset === "dino-tail-swipe") {
      applyTailFollowThrough(out, base, t, 1);
      const settle = Math.sin(t * Math.PI * 3.2) * Math.sin(Math.PI * clamp(t));
      addSecondaryOffset(
        out,
        "head",
        0.002 * settle,
        -0.0015 * Math.abs(settle),
      );
      addSecondaryOffset(
        out,
        "chest",
        -0.0015 * settle,
        0.001 * Math.abs(settle),
      );
    }
    if (preset === "dino-bite") {
      const recovery = Math.sin(Math.PI * clamp((t - 0.5) / 0.5));
      addSecondaryOffset(out, "head", 0.008 * recovery, -0.003 * recovery);
      addSecondaryOffset(out, "neck", 0.005 * recovery, -0.002 * recovery);
      addSecondaryOffset(out, "chest", -0.002 * recovery, 0.002 * recovery);
      applyTailFollowThrough(out, base, t, 0.55);
    }
    if (preset === "dino-hit") {
      const recovery = Math.sin(Math.PI * clamp((t - 0.28) / 0.72));
      addSecondaryOffset(out, "head", 0.006 * recovery, -0.002 * recovery);
      addSecondaryOffset(out, "neck", 0.004 * recovery, -0.001 * recovery);
      applyTailFollowThrough(out, base, t, 0.72);
    }
    if (preset === "dino-roar") {
      const breath = Math.sin(t * Math.PI * 4);
      addSecondaryOffset(out, "chest", 0, -0.0035 * breath);
      addSecondaryOffset(out, "neck", -0.0015 * breath, -0.001 * breath);
      addSecondaryOffset(out, "head", -0.001 * breath, -0.0012 * breath);
    }
  }

  class MotionTimeline {
    constructor(points = {}) {
      this.base = copyPoints(points);
      this.duration = 2;
      this.preset = "idle";
      this.keyframes = [];
      this.transition = null;
    }
    setBase(points) {
      this.base = copyPoints(points);
      return this.base;
    }
    usePreset(name, duration = this.duration) {
      if (!cycles[name]) throw new Error("Movimiento desconocido");
      const d = Number(duration);
      if (!Number.isFinite(d) || d < 0.1 || d > 3600)
        throw new Error("Duración de movimiento inválida");
      this.preset = name;
      this.duration = d;
      this.keyframes = [];
      this.transition = null;
      return this.sample(0);
    }
    transitionTo(
      name,
      duration = this.duration,
      blendDuration = 0.24,
      fromPoints,
    ) {
      if (!cycles[name]) throw new Error("Movimiento desconocido");
      const d = Number(duration),
        blend = Number(blendDuration);
      if (!Number.isFinite(d) || d < 0.1 || d > 3600)
        throw new Error("Duración de movimiento inválida");
      if (!Number.isFinite(blend) || blend < 0 || blend > 5)
        throw new Error("Duración de transición inválida");
      const from = copyPoints(fromPoints || this.sample(0));
      this.preset = name;
      this.duration = d;
      this.keyframes = [];
      this.transition =
        blend > 0 ? { from, start: 0, duration: Math.min(blend, d) } : null;
      return this.sample(0);
    }
    addKeyframe(time, points, mode = "smooth") {
      const n = Number(time);
      if (!Number.isFinite(n)) throw new Error("Tiempo de pose clave inválido");
      const t = clamp(n, 0, this.duration),
        easeMode = typeof mode === "string" ? mode : mode?.ease || "smooth";
      if (!easing.includes(easeMode))
        throw new Error("Interpolación desconocida");
      const frame = { time: t, points: copyPoints(points), ease: easeMode };
      const i = this.keyframes.findIndex((x) => Math.abs(x.time - t) < 0.001);
      if (i >= 0) this.keyframes[i] = frame;
      else this.keyframes.push(frame);
      this.keyframes.sort((a, b) => a.time - b.time);
      return frame;
    }
    sample(time) {
      const n = Number(time),
        current = clamp(Number.isFinite(n) ? n : 0, 0, this.duration),
        finish = (pose) => blendPose(pose, this.transition, current);
      if (this.keyframes.length) {
        const byTime = new Map();
        byTime.set(0, { time: 0, points: this.base, ease: "smooth" });
        for (const frame of this.keyframes)
          byTime.set(frame.time, {
            time: frame.time,
            points: frame.points,
            ease: frame.ease || "smooth",
          });
        const sorted = [...byTime.values()].sort((a, b) => a.time - b.time);
        if (!byTime.has(this.duration)) {
          const last = sorted[sorted.length - 1];
          sorted.push({
            time: this.duration,
            points: last.points,
            ease: last.ease,
          });
        }
        if (current <= sorted[0].time)
          return finish(copyPoints(sorted[0].points));
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i],
            b = sorted[i + 1];
          if (current <= b.time) {
            if (current >= b.time) return finish(copyPoints(b.points));
            const progress =
                (current - a.time) / Math.max(0.0001, b.time - a.time),
              p = b.ease === "hold" ? 0 : ease(progress, b.ease),
              out = {};
            for (const name of new Set([
              ...Object.keys(a.points),
              ...Object.keys(b.points),
            ])) {
              const x = a.points[name] || b.points[name],
                y = b.points[name] || x;
              out[name] = {
                x: clamp(lerp(x.x, y.x, p)),
                y: clamp(lerp(x.y, y.y, p)),
              };
            }
            return finish(out);
          }
        }
        return finish(copyPoints(sorted[sorted.length - 1].points));
      }
      const t = current / this.duration,
        fn = cycles[this.preset] || cycles.idle,
        single = new Set([
          "worker-lift",
          "worker-push",
          "worker-pull",
          "worker-kneel",
          "worker-point",
          "worker-hammer",
          "dino-roar",
          "dino-bite",
          "dino-tail-swipe",
          "dino-hit",
          "dino-crouch",
          "dino-sniff",
          "dino-stomp",
          "dino-pounce",
          "dino-threat",
        ]),
        phase = single.has(this.preset) ? t : t * 2,
        out = {};
      for (const [name, p] of Object.entries(this.base)) {
        const d = fn(name, phase);
        out[name] = { x: clamp(p.x + d.x), y: clamp(p.y + d.y) };
      }
      if (
        ["worker-walk", "worker-run", "dino-walk", "dino-run"].includes(
          this.preset,
        )
      )
        applyWalkKinematics(out, this.base, this.preset, t);
      else applySecondaryActing(out, this.base, this.preset, t);
      return finish(out);
    }
    apply(rig, time) {
      rig.points = this.sample(time);
      return rig.points;
    }
    exportJSON() {
      return JSON.stringify(
        {
          format: "nexora-motion",
          version: 1,
          preset: this.preset,
          duration: this.duration,
          base: this.base,
          keyframes: this.keyframes,
        },
        null,
        2,
      );
    }
    importJSON(raw) {
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (
        d?.format !== "nexora-motion" ||
        d.version !== 1 ||
        !d.base ||
        !Array.isArray(d.keyframes || [])
      )
        throw new Error("Archivo de movimiento no válido");
      const duration = Number(d.duration);
      if (!Number.isFinite(duration) || duration < 0.1 || duration > 3600)
        throw new Error("Duración de movimiento inválida");
      if ((d.keyframes || []).length > 1000)
        throw new Error("El movimiento supera 1000 poses clave");
      const base = copyPoints(d.base),
        validPreset = cycles[d.preset] ? d.preset : "idle",
        frames = [];
      for (const f of d.keyframes || []) {
        if (!Number.isFinite(Number(f.time)))
          throw new Error("Tiempo de pose clave inválido");
        const mode = f.ease || "smooth";
        if (!easing.includes(mode))
          throw new Error("Interpolación de pose inválida");
        frames.push({
          time: clamp(Number(f.time), 0, duration),
          points: copyPoints(f.points),
          ease: mode,
        });
      }
      this.base = base;
      this.duration = duration;
      this.preset = validPreset;
      this.keyframes = [];
      this.transition = null;
      for (const f of frames) this.addKeyframe(f.time, f.points, f.ease);
      return this;
    }
  }
  window.NexoraMotionSystem = {
    MotionTimeline,
    presets: Object.keys(cycles),
    easings: easing,
    profiles: {
      worker: Object.keys(cycles).filter((x) => x.startsWith("worker-")),
      dinosaur: Object.keys(cycles).filter((x) => x.startsWith("dino-")),
    },
  };
})();
