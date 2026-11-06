const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadEngine() {
  const memory = new Map();
  const localStorage = {
    getItem: key => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key)
  };
  const context = {
    window: {},
    localStorage,
    crypto: { randomUUID: () => "test-" + Math.random().toString(36).slice(2) },
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Error
  };
  vm.createContext(context);
  for (const file of [
    "continuity.js",
    "animation-tools.js",
    "motion-system.js",
    "scene-project.js",
    "mesh-deformer.js"
  ]) {
    const source = fs.readFileSync(path.join(__dirname, "../admin/animate-engine", file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return { api: context.window, localStorage };
}

test("character bible saves a master profile and flags visual drift", () => {
  const { api } = loadEngine();
  const bible = new api.NexoraContinuity.ContinuityManager();
  const person = bible.create({
    name: "Akira",
    face: "oval",
    eyes: "blue",
    hair: "black bob",
    body: "slim",
    palette: "blue and black",
    outfit: "school jacket",
    voiceId: "voice-akira"
  });
  assert.equal(bible.get(person.id).name, "Akira");
  const report = bible.validate(person.id, { hair: "long red hair" });
  assert.equal(report.consistent, false);
  assert.equal(report.issues[0].field, "hair");
  assert.throws(() => bible.create({ name: "Akira" }), /Ya existe/);
});

test("scene projects bind shots to a character and validate voice continuity", () => {
  const { api } = loadEngine();
  const bible = new api.NexoraContinuity.ContinuityManager();
  const person = bible.create({
    name: "Mika", face: "round", eyes: "green", hair: "brown",
    body: "athletic", palette: "green", outfit: "coat", voiceId: "mika-voice"
  });
  const scene = new api.NexoraSceneProject.SceneProject();
  scene.addShot({ name: "Entrada", characterId: person.id, voiceId: "wrong-voice", duration: 2 });
  const report = scene.validate(bible);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(issue => issue.field === "voice"));
  const exported = scene.exportJSON();
  const restored = new api.NexoraSceneProject.SceneProject({ getItem: () => null, setItem() {} });
  restored.importJSON(exported);
  assert.equal(restored.data.shots.length, 1);
});

test("motion timeline interpolates keyframes and exposes reusable presets", () => {
  const { api } = loadEngine();
  const timeline = new api.NexoraMotionSystem.MotionTimeline({ head: { x: 0.5, y: 0.3 } });
  timeline.duration = 2;
  timeline.addKeyframe(2, { head: { x: 0.8, y: 0.6 } });
  const middle = timeline.sample(1).head;
  assert.ok(middle.x > 0.5 && middle.x < 0.8);
  assert.ok(api.NexoraMotionSystem.presets.includes("walk"));
  const serialized = timeline.exportJSON();
  const copy = new api.NexoraMotionSystem.MotionTimeline().importJSON(serialized);
  assert.equal(copy.duration, 2);
});

test("2D rig inverse kinematics and phoneme-to-viseme mapping return usable results", () => {
  const { api } = loadEngine();
  const joint = api.NexoraAnimationTools.solveTwoBoneIK({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.7, 0.7);
  assert.ok(Number.isFinite(joint.x) && Number.isFinite(joint.y));
  const track = api.NexoraAnimationTools.buildVisemeTrack([
    { phoneme: "M", start: 0, end: 0.1 },
    { phoneme: "A", start: 0.1, end: 0.2 }
  ], 1);
  assert.equal(api.NexoraAnimationTools.visemeAt(track, 0.05), "closed");
  assert.equal(api.NexoraAnimationTools.visemeAt(track, 0.15), "open");
});


test("mesh deformer preserves original shape and follows rig landmarks", () => {
  const { api } = loadEngine();
  const mesh = new api.NexoraMeshDeformer.MeshDeformer({ columns: 4, rows: 4 });
  mesh.capture({
    head: { x: 0.5, y: 0.2 },
    hip: { x: 0.5, y: 0.8 },
    hand: { x: 0.2, y: 0.5 }
  });
  assert.equal(mesh.controls.length, 3);
  const original = mesh.deformPoint({ x: 0.5, y: 0.2 });
  assert.ok(Math.abs(original.x - 0.5) < 0.001);
  assert.ok(Math.abs(original.y - 0.2) < 0.001);
  mesh.updateTargets({ head: { x: 0.6, y: 0.25 } });
  const moved = mesh.deformPoint({ x: 0.5, y: 0.2 });
  assert.ok(moved.x > original.x);
  assert.ok(moved.y > original.y);
  const restored = new api.NexoraMeshDeformer.MeshDeformer().importJSON(mesh.exportJSON());
  assert.equal(restored.controls.length, 3);
  assert.equal(restored.columns, 4);
});


test("weighted bone skinning moves its limb region and round-trips configuration", () => {
  const { api } = loadEngine();
  const mesh = new api.NexoraMeshDeformer.MeshDeformer({ strength: 1, influenceRadius: 0.25 });
  const points = { shoulder: {x:0.3,y:0.4}, elbow:{x:0.5,y:0.5}, hand:{x:0.7,y:0.6} };
  mesh.captureBones(points, [{name:"arm",from:"shoulder",to:"elbow",radius:0.3}]);
  const before = mesh.deformPoint({x:0.4,y:0.45});
  mesh.updateBoneTargets({shoulder:{x:0.3,y:0.4},elbow:{x:0.6,y:0.55}},[{name:"arm",from:"shoulder",to:"elbow"}]);
  const after = mesh.deformPoint({x:0.4,y:0.45});
  assert.ok(after.x > before.x);
  assert.ok(after.y > before.y);
  const restored = new api.NexoraMeshDeformer.MeshDeformer().importJSON(mesh.exportJSON());
  assert.equal(restored.bones.length,1);
  assert.equal(restored.bones[0].name,"arm");
});


test("polygon masks constrain bone deformation to a softly feathered body region", () => {
  const { api } = loadEngine();
  const mesh = new api.NexoraMeshDeformer.MeshDeformer({ strength: 1, influenceRadius: 0.5 });
  const points = { shoulder: {x:0.25,y:0.4}, elbow:{x:0.45,y:0.4} };
  mesh.captureBones(points, [{name:"armL1",from:"shoulder",to:"elbow",radius:0.5}]);
  mesh.setRegions([{name:"left-arm",boneNames:["armL1"],points:[
    {x:0.15,y:0.25},{x:0.6,y:0.25},{x:0.6,y:0.58},{x:0.15,y:0.58}
  ],feather:0.03}]);
  mesh.updateBoneTargets({shoulder:{x:0.25,y:0.5},elbow:{x:0.45,y:0.5}},[{name:"armL1",from:"shoulder",to:"elbow"}]);
  const inside=mesh.deformPoint({x:0.35,y:0.4});
  const outside=mesh.deformPoint({x:0.8,y:0.4});
  assert.ok(inside.y>0.4);
  assert.ok(Math.abs(outside.y-0.4)<1e-6);
  const restored=new api.NexoraMeshDeformer.MeshDeformer().importJSON(mesh.exportJSON());
  assert.equal(restored.regions.length,1);
  assert.deepEqual(Array.from(restored.regions[0].boneNames),["armL1"]);
});
