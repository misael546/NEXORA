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
    Error,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    DataView,
    ArrayBuffer
  };
  vm.createContext(context);
  for (const file of [
    "character-skeleton.js",
    "spatial-engine.js",
    "spatial-rig.js",
    "facial-animation.js",
    "spatial-motion.js",
    "spatial-actions.js",
    "audio-engine.js",
    "continuity.js",
    "animation-tools.js",
    "motion-system.js",
    "character-art.js",
    "character-stage.js",
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

test("motion timeline honors a keyframe at zero, supports hold and linearly interpolates poses", () => {
  const { api } = loadEngine();
  const timeline = new api.NexoraMotionSystem.MotionTimeline({ head: { x: .5, y: .3 } });
  timeline.duration = 2;
  timeline.addKeyframe(0, { head: { x: .2, y: .4 } });
  timeline.addKeyframe(2, { head: { x: .8, y: .6 } }, "linear");
  assert.deepEqual({ ...timeline.sample(0).head }, { x: .2, y: .4 });
  assert.ok(Math.abs(timeline.sample(1).head.x - .5) < 1e-8);
  timeline.addKeyframe(1, { head: { x: .9, y: .7 } }, "hold");
  assert.ok(timeline.sample(.5).head.x < .3);
  assert.equal(timeline.sample(1).head.x, .9);
  assert.throws(() => timeline.addKeyframe(1, { head: { x: NaN, y: .2 } }), /Pose inválida/);
  assert.throws(() => timeline.addKeyframe(1, { head: { x: .2, y: .2 } }, "unknown"), /Interpolación/);
});

test("motion transitions blend from the current pose and return to the target clip", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const source = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  source.usePreset("worker-walk", 2);
  const fromPose = source.sample(.55);
  const target = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  target.usePreset("worker-hammer", 2);
  const expectedMiddle = target.sample(.2);
  const expectedEnd = target.sample(.4);
  source.setBase(rig.points);
  source.transitionTo("worker-hammer", 2, .4, fromPose);
  assert.deepEqual(source.sample(0), fromPose);
  const middle = source.sample(.2);
  assert.notDeepEqual(middle, fromPose);
  assert.notDeepEqual(middle, expectedMiddle);
  assert.deepEqual(source.sample(.4), expectedEnd);
  source.usePreset("worker-idle", 2);
  assert.deepEqual(source.sample(0), rig.points);
  assert.throws(() => source.transitionTo("worker-run", 2, 9, fromPose), /transición/);
});

test("motion import validates keyframe timing and accepts legacy easing defaults", () => {
  const { api } = loadEngine();
  const timeline = new api.NexoraMotionSystem.MotionTimeline();
  const legacy = { format: "nexora-motion", version: 1, preset: "walk", duration: 2,
    base: { handL: { x: .3, y: .4 } }, keyframes: [{ time: 1, points: { handL: { x: .5, y: .4 } } }] };
  timeline.importJSON(legacy);
  assert.equal(timeline.keyframes[0].ease, "smooth");
  assert.ok(Number.isFinite(timeline.sample(.5).handL.x));
  assert.throws(() => timeline.importJSON({ ...legacy, keyframes: [{ time: "bad", points: {} }] }), /Tiempo/);
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

test("scene shots store actor type and the exact 2D action clip", () => {
  const { api } = loadEngine();
  const scene = new api.NexoraSceneProject.SceneProject({getItem:()=>null,setItem(){}});
  const worker = scene.addShot({name:"Trabajo",characterId:"worker-id",duration:2});
  const dino = scene.addShot({name:"Rugido",characterId:"dino-id",actorType:"dinosaur",motionPreset:"dino-roar",secondaryActorType:"worker",secondaryMotionPreset:"worker-wave",duration:3});
  assert.equal(worker.actorType,"worker");
  assert.equal(worker.motionPreset,"worker-idle");
  assert.equal(dino.actorType,"dinosaur");
  assert.equal(dino.motionPreset,"dino-roar");
  assert.equal(worker.secondaryActorType,"none");
  assert.equal(dino.secondaryActorType,"worker");
  assert.equal(dino.secondaryMotionPreset,"worker-wave");
  const restored = new api.NexoraSceneProject.SceneProject({getItem:()=>null,setItem(){}});
  restored.importJSON(scene.exportJSON());
  assert.equal(restored.data.shots[1].motionPreset,"dino-roar");
  assert.equal(restored.data.shots[1].secondaryActorType,"worker");
  assert.equal(restored.data.shots[1].secondaryMotionPreset,"worker-wave");
});

test("saved pre-2D scenes migrate to worker idle without losing shot data", () => {
  const { api } = loadEngine();
  const old = {format:"nexora-scene",version:1,title:"Legacy",fps:24,
    shots:[{id:"old",name:"Plano antiguo",characterId:"c1",duration:2,start:0}]};
  const storage = {getItem:()=>JSON.stringify(old),setItem(){}};
  const scene = new api.NexoraSceneProject.SceneProject(storage);
  assert.equal(scene.data.shots[0].actorType,"worker");
  assert.equal(scene.data.shots[0].motionPreset,"worker-idle");
  assert.equal(scene.data.shots[0].secondaryActorType,"none");
  assert.equal(scene.data.shots[0].secondaryMotionPreset,"");
  assert.equal(scene.data.shots[0].name,"Plano antiguo");
});

test("2D character stage composes worker and dinosaur with independent rigs and timelines", () => {
  const { api } = loadEngine();
  const worker = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const dinosaur = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  const workerMotion = new api.NexoraMotionSystem.MotionTimeline(worker.points);
  workerMotion.usePreset("worker-wave", 2);
  const dinoMotion = new api.NexoraMotionSystem.MotionTimeline(dinosaur.points);
  dinoMotion.usePreset("dino-threat", 2);
  const drawn = [];
  const stage = new api.NexoraCharacterStage.CharacterStage((ctx,w,h,rig,type,options) => drawn.push({type,action:options.action,time:options.time,head:{...rig.points.head}}));
  stage.setActors([
    {id:"worker",type:"worker",rig:worker,motion:workerMotion,action:"worker-wave",time:.5},
    {id:"dino",type:"dinosaur",rig:dinosaur,motion:dinoMotion,action:"dino-threat",time:1}
  ]);
  const transforms = [];
  const ctx = {save(){},restore(){},translate(x,y){transforms.push(["translate",x,y])},scale(x,y){transforms.push(["scale",x,y])}};
  assert.equal(stage.render(ctx,640,360,0),2);
  assert.deepEqual(drawn.map(x=>x.type),["worker","dinosaur"]);
  assert.deepEqual(drawn.map(x=>x.action),["worker-wave","dino-threat"]);
  assert.deepEqual(drawn.map(x=>x.time),[.5,1]);
  assert.equal(transforms.filter(x=>x[0]==="scale").length,2);
  assert.equal(api.NexoraCharacterStage.layoutActors(2).length,2);
  assert.equal(api.NexoraCharacterStage.layoutActors(4).length,4);
  assert.throws(()=>stage.setActors([1,2,3,4,5].map((_,i)=>({rig:worker}))),/cuatro actores/);
});

test("2D scene compositor binds the selected per-shot actor action", () => {
  const bridge = require("node:fs").readFileSync(path.join(__dirname,"../admin/animate-engine/studio-bridge.js"),"utf8");
  assert.match(bridge,/makeShotActor\(shot\.secondaryActorType/);
  assert.match(bridge,/characterStage\.setActors\(cast\)/);
  assert.match(bridge,/motionPreset:\$\("ns2DAction"\)\.value/);
  assert.match(bridge,/const actorType=\$\("ns2DCharacterType"\)\.value/);
  assert.match(bridge,/NexoraCharacterArt\.draw/);
});

test("2D dinosaur rig contains a multi-joint tail and persists its character type", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  assert.equal(rig.kind, "dinosaur");
  assert.ok(rig.points.tail1 && rig.points.tail4 && rig.points.jaw);
  assert.ok(rig.points.jaw.y - rig.points.head.y <= 0.04, "La mandíbula debe quedar casi cerrada en reposo.");
  const idleGap = rig.points.jaw.y - rig.points.head.y;
  const roar = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  roar.usePreset("dino-roar", 2);
  const roarPose = roar.sample(1);
  const roarGap = roarPose.jaw.y - roarPose.head.y;
  assert.ok(roarGap > idleGap + 0.04, "El rugido debe abrir la mandíbula de forma visible.");
  assert.equal(Array.from(rig.bones.filter(b => /^tail/.test(b.name)), b => b.name).join(","), "tail1,tail2,tail3,tail4");
  const copy = new api.NexoraAnimationTools.CharacterRig();
  copy.load(rig.save());
  assert.equal(copy.kind, "dinosaur");
  assert.equal(copy.points.tail4.x, rig.points.tail4.x);
});

test("editing one timeline pose keeps all other keyed poses intact", () => {
  const { api } = loadEngine();
  const timeline = new api.NexoraMotionSystem.MotionTimeline({ hand: { x: .2, y: .4 } });
  timeline.duration = 2;
  timeline.addKeyframe(.5, { hand: { x: .4, y: .4 } });
  timeline.addKeyframe(1.5, { hand: { x: .8, y: .4 } });
  timeline.addKeyframe(.5, { hand: { x: .6, y: .5 } }, "linear");
  assert.equal(timeline.keyframes.length, 2);
  assert.equal(timeline.keyframes[0].points.hand.x, .6);
  assert.equal(timeline.sample(1.5).hand.x, .8);
});

test("worker and dinosaur 2D action libraries animate their dedicated landmarks", () => {
  const { api } = loadEngine();
  const human = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  assert.ok(human.points.footR.x - human.points.footL.x <= 0.13, "La postura de reposo debe mantener los pies bajo las caderas.");
  const worker = new api.NexoraMotionSystem.MotionTimeline(human.points);
  worker.usePreset("worker-hammer", 2);
  assert.ok(worker.sample(.125).handR.y < human.points.handR.y);
  const hammerRaised = worker.sample(.7);
  const hammerImpact = worker.sample(1.2);
  assert.ok(hammerRaised.handR.y < human.points.handR.y - .25, "The hammer must rise above shoulder height before impact.");
  assert.ok(hammerImpact.handR.y > human.points.handR.y + .10, "The hammer arm must travel down into the strike.");
  assert.ok(hammerImpact.hip.x > human.points.hip.x, "El cuerpo debe transferir el peso hacia el golpe.");
  assert.ok(hammerImpact.kneeR.y > human.points.kneeR.y, "La rodilla debe absorber el impacto.");
  assert.ok(hammerImpact.handL.y < human.points.handL.y, "El brazo libre debe estabilizar el movimiento.");
  assert.ok(api.NexoraMotionSystem.profiles.worker.includes("worker-lift"));
  const dino = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  const motion = new api.NexoraMotionSystem.MotionTimeline(dino.points);
  motion.usePreset("dino-roar", 2);
  const roarPose = motion.sample(1);
  assert.ok(roarPose.jaw.y > dino.points.jaw.y);
  assert.ok(roarPose.head.y > dino.points.head.y - 0.021);
  assert.ok(roarPose.jaw.y < dino.points.jaw.y + 0.066);
  motion.usePreset("dino-tail-swipe", 2);
  const tailWhip = motion.sample(1);
  assert.ok(tailWhip.tail4.y > dino.points.tail4.y + .18);
  assert.ok(tailWhip.tail4.x > dino.points.tail4.x + .05);
  motion.usePreset("dino-walk", 2);
  const dinoStep = motion.sample(.74);
  assert.ok(Math.abs(dinoStep.footL.x - dino.points.footL.x) < .06);
  assert.ok(Math.abs(dinoStep.footR.x - dino.points.footR.x) < .06);
  assert.ok(Math.abs(Math.hypot(dinoStep.kneeL.x-dinoStep.hip.x,dinoStep.kneeL.y-dinoStep.hip.y) - Math.hypot(dino.points.kneeL.x-dino.points.hip.x,dino.points.kneeL.y-dino.points.hip.y)) < .004);
  assert.ok(api.NexoraMotionSystem.profiles.dinosaur.includes("dino-bite"));
});

test("expanded worker actions include push pull kneel and point poses", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const timeline = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  timeline.usePreset("worker-push", 2);
  const push = timeline.sample(.8);
  assert.ok(push.handL.y < rig.points.handL.y);
  assert.ok(push.handR.y < rig.points.handR.y);
  timeline.usePreset("worker-pull", 2);
  const pull = timeline.sample(.8);
  assert.ok(pull.handL.x > rig.points.handL.x);
  assert.ok(pull.handR.x < rig.points.handR.x);
  timeline.usePreset("worker-kneel", 2);
  assert.ok(timeline.sample(1).hip.y > rig.points.hip.y);
  timeline.usePreset("worker-point", 2);
  assert.ok(timeline.sample(.8).handR.x > rig.points.handR.x);
  assert.ok(api.NexoraMotionSystem.profiles.worker.includes("worker-kneel"));
});

test("expanded dinosaur acting includes sniff stomp pounce and threat poses", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  const timeline = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  timeline.usePreset("dino-sniff", 2);
  assert.ok(timeline.sample(.5).head.y > rig.points.head.y);
  timeline.usePreset("dino-stomp", 2);
  assert.ok(timeline.sample(1).footL.y < rig.points.footL.y);
  timeline.usePreset("dino-pounce", 2);
  assert.ok(timeline.sample(1.1).hip.y < rig.points.hip.y);
  timeline.usePreset("dino-threat", 2);
  assert.ok(timeline.sample(1).jaw.y > rig.points.jaw.y);
  assert.ok(api.NexoraMotionSystem.profiles.dinosaur.includes("dino-pounce"));
});

test("worker lift action raises and closes both hands around the load", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const timeline = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  timeline.usePreset("worker-lift", 2);
  const pose = timeline.sample(.56);
  assert.ok(pose.handL.x > rig.points.handL.x);
  assert.ok(pose.handR.x < rig.points.handR.x);
  assert.ok(pose.handL.y < rig.points.handL.y);
  assert.ok(pose.handR.y < rig.points.handR.y);
});

test("worker carry action brings both hands inward around the load", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const timeline = new api.NexoraMotionSystem.MotionTimeline(rig.points);
  timeline.usePreset("worker-carry", 2);
  const pose = timeline.sample(.06);
  assert.ok(pose.handL.x > rig.points.handL.x);
  assert.ok(pose.handR.x < rig.points.handR.x);
});

test("worker tool actions draw the hammer shovel and carry props", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const drawCount = action => {
    let calls = 0;
    const noop = () => { calls++; };
    const ctx = {createLinearGradient(){return{addColorStop(){}}},save:noop,restore:noop,translate:noop,rotate:noop,beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,fill:noop,stroke:noop,ellipse:noop};
    api.NexoraCharacterArt.draw(ctx,640,360,rig,"worker",{action,time:.35});
    return calls;
  };
  const idle = drawCount("worker-idle");
  assert.ok(drawCount("worker-hammer") > idle);
  assert.ok(drawCount("worker-dig") > idle);
  assert.ok(drawCount("worker-carry") > idle);
  assert.ok(drawCount("worker-lift") > idle);
});

test("worker talk clip animates its jaw and is available in 2D worker actions", () => {
  const { api } = loadEngine();
  const worker = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const timeline = new api.NexoraMotionSystem.MotionTimeline(worker.points);
  timeline.usePreset("worker-talk", 2);
  const talking = timeline.sample(.06);
  assert.ok(talking.jaw.y > worker.points.jaw.y);
  assert.ok(api.NexoraMotionSystem.profiles.worker.includes("worker-talk"));
});

test("2D character art renders worker and dinosaur figures through the canvas API", () => {
  const { api } = loadEngine();
  const calls = [];
  const noop = name => (...args) => { calls.push(name); };
  const ctx = {
    createLinearGradient() { return { addColorStop() {} }; },
    save: noop("save"), restore: noop("restore"), translate: noop("translate"), rotate: noop("rotate"),
    beginPath: noop("beginPath"), moveTo: noop("moveTo"), lineTo: noop("lineTo"),
    closePath: noop("closePath"), fill: noop("fill"), stroke: noop("stroke"), ellipse: noop("ellipse")
  };
  const worker = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const dinosaur = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  assert.equal(api.NexoraCharacterArt.draw(ctx,640,360,worker,"worker"),true);
  assert.equal(api.NexoraCharacterArt.draw(ctx,640,360,dinosaur,"dinosaur"),true);
  assert.ok(calls.filter(name=>name==="fill"||name==="stroke").length>40);
});

test("2D studio defaults to the worker and hides the preserved 3D controls", () => {
  const fs = require("node:fs");
  const bridge = fs.readFileSync(path.join(__dirname,"../admin/animate-engine/studio-bridge.js"),"utf8");
  const html = fs.readFileSync(path.join(__dirname,"../admin/animate-studio.html"),"utf8");
  assert.match(bridge,/id="n3dHiddenTools" hidden/);
  assert.match(bridge,/const ENABLE_3D_STUDIO=false/);
  assert.match(bridge,/Motor 3D conservado · inactivo para priorizar el estudio 2D/);
  assert.match(bridge,/id="nvCharacterType"/);
  assert.match(bridge,/id="nvRigDino"/);
  assert.match(bridge,/characterStage.setActors\(cast\)/);
  assert.match(bridge,/secondaryMotionPreset:secondaryActorType===/);
  assert.match(bridge,/action:activeAction/);
  assert.match(bridge,/activeAction=primary\.action/);
  assert.match(html,/animate-engine\/character-art\.js/);
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


test("2D humanoid rig creates symmetric landmarks and solves arm and leg IK without stretching", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  assert.equal(Object.keys(rig.points).length, 14);
  assert.ok(rig.points.jaw && rig.bones.some(b => b.name === "jaw"));
  const upper = Math.hypot(rig.points.elbowL.x-rig.points.shoulderL.x, rig.points.elbowL.y-rig.points.shoulderL.y);
  const lower = Math.hypot(rig.points.handL.x-rig.points.elbowL.x, rig.points.handL.y-rig.points.elbowL.y);
  const result = rig.applyIK("handL", 0.08, 0.34);
  assert.ok(result && rig.points.handL.x < 0.2);
  assert.ok(Math.abs(Math.hypot(rig.points.elbowL.x-rig.points.shoulderL.x, rig.points.elbowL.y-rig.points.shoulderL.y)-upper)<1e-8);
  assert.ok(Math.abs(Math.hypot(rig.points.handL.x-rig.points.elbowL.x, rig.points.handL.y-rig.points.elbowL.y)-lower)<1e-8);
  assert.equal(rig.mirrorPoint("handL"), "handR");
  assert.ok(Math.abs(rig.points.handR.x-(1-rig.points.handL.x))<1e-8);
  assert.ok(rig.applyIK("footR", 0.95, 0.95));
  assert.throws(() => rig.setPoint("head", NaN, .2), /numérica/);
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


test("color-assisted mask finds a connected color region and rejects a huge background", () => {
  const { api } = loadEngine();
  const width=12,height=12,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const inside=x>=4&&x<=7&&y>=3&&y<=8;
    data[i]=inside?220:20;data[i+1]=inside?30:20;data[i+2]=inside?40:20;data[i+3]=255;
  }
  const hull=api.NexoraMeshDeformer.colorRegionHull(data,width,height,5,5,8);
  assert.ok(Array.isArray(hull));
  assert.ok(hull.length>=4);
  assert.equal(api.NexoraMeshDeformer.pointInPolygon({x:.5,y:.5},hull),true);
  assert.equal(api.NexoraMeshDeformer.pointInPolygon({x:.05,y:.05},hull),false);
  const background=api.NexoraMeshDeformer.colorRegionHull(data,width,height,0,0,8);
  assert.equal(background,null);
});


test("hierarchical character skeleton propagates a lean through spine neck head and shoulders", () => {
  const { api } = loadEngine();
  const skeleton = api.NexoraCharacterSkeleton.createHumanUpperBodySkeleton();
  const before = skeleton.worldPose();
  skeleton.setPose(api.NexoraCharacterSkeleton.buildLeanPose(1));
  const after = skeleton.worldPose();
  assert.ok(after.head.x > before.head.x);
  assert.ok(after.head.y > before.head.y);
  assert.ok(after.chest.x > before.chest.x);
  assert.ok(after.shoulderL.x > before.shoulderL.x);
  assert.ok(after.shoulderR.y > before.shoulderR.y);
  const copy = api.NexoraCharacterSkeleton.CharacterSkeleton.fromJSON(skeleton.exportJSON());
  assert.equal(copy.worldPose().head.x, after.head.x);
});

test("spatial camera supports front back side top and three-quarter projections", () => {
  const { api } = loadEngine();
  const camera = new api.NexoraSpatialEngine.SpatialCamera({distance:5});
  const point = {x:0,y:0,z:0};
  for (const view of ["front","back","left","right","top","bottom","three-quarter"]) {
    camera.setView(view);
    const projected = camera.project(point,1280,720);
    assert.equal(projected.visible,true);
    assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y));
  }
  camera.projection = "orthographic";
  assert.equal(camera.project(point,1280,720).visible,true);
  camera.orbit(.2,.1).dolly(-.1);
  assert.ok(camera.distance>0);
});


test("audio timeline exposes separate voice music effects and ambience tracks", () => {
  const { api } = loadEngine();
  const audio = new api.NexoraAudio.AudioTimeline();
  assert.deepEqual(Array.from(api.NexoraAudio.kinds), ["voice","narration","music","sfx","ambience"]);
  assert.equal(audio.tracks.length, 0);
  assert.equal(audio.serialize().format, "nexora-audio-timeline");
});

test("WebGL spatial engine supplies real triangle geometry for 3D objects", () => {
  const { api } = loadEngine();
  const geometry = api.NexoraSpatialEngine.geometry.cube(2);
  assert.equal(geometry.positions.length, 108);
  assert.equal(geometry.colors.length, 144);
  assert.ok(geometry.positions.every(Number.isFinite));
});


test("GLB 2.0 importer reads triangle positions and node transforms", () => {
  const { api } = loadEngine();
  const json = {
    asset:{version:"2.0"},
    buffers:[{byteLength:36}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:"VEC3"}],
    meshes:[{name:"Triangle",primitives:[{attributes:{POSITION:0}}]}],
    nodes:[{mesh:0,translation:[2,1,0]}],
    scenes:[{nodes:[0]}],
    scene:0
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(jsonBytes.length/4)*4;
  const binLength = 36;
  const total = 12+8+jsonLength+8+binLength;
  const buffer = new ArrayBuffer(total), view = new DataView(buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
  view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);
  new Uint8Array(buffer,20,jsonBytes.length).set(jsonBytes);
  for(let i=jsonBytes.length;i<jsonLength;i++)new Uint8Array(buffer)[20+i]=0x20;
  const binStart=20+jsonLength;view.setUint32(binStart,binLength,true);view.setUint32(binStart+4,0x004e4942,true);
  const coords=[0,0,0,1,0,0,0,1,0];coords.forEach((v,i)=>view.setFloat32(binStart+8+i*4,v,true));
  const result=api.NexoraSpatialEngine.parseGLB(buffer);
  assert.equal(result.meshCount,1);
  assert.equal(result.vertexCount,3);
  assert.equal(result.meshes[0].name,"Triangle");
  assert.deepEqual(Array.from(result.meshes[0].positions),[2,1,0,3,1,0,2,2,0]);
});


test("3D skeleton propagates parent rotations through the hierarchy", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createHumanoid();
  const before = rig.worldPosition("head");
  rig.setPose("spine",{rotation:[0,0,Math.sin(Math.PI/8),Math.cos(Math.PI/8)]});
  const after = rig.worldPosition("head");
  assert.notDeepEqual(after,before);
  const restored = api.NexoraSpatialRig3D.SpatialRig3D.fromJSON(rig.exportJSON());
  assert.equal(restored.bones.length,16);
  assert.ok(restored.worldPosition("head").every(Number.isFinite));
});

test("3D linear blend skinning moves a weighted vertex with its bone", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraSpatialRig3D.SpatialRig3D([{name:"root"},{name:"arm",parent:"root",translation:[1,0,0]}]);
  const result = rig.skinVertices([0,0,0],[1,0,0,0],[1,0,0,0]);
  assert.deepEqual(Array.from(result),[1,0,0]);
});


test("3D animation clip interpolates bone transforms and applies the sampled pose", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createHumanoid();
  const clip = new api.NexoraSpatialMotion.SpatialAnimationClip({
    name:"Inclinarse",duration:1,tracks:[{bone:"spine",keyframes:[
      {time:0,rotation:[0,0,0,1],translation:[0,.35,0]},
      {time:1,rotation:[0,0,Math.sin(Math.PI/8),Math.cos(Math.PI/8)],translation:[0,.35,0]}
    ]}]
  });
  clip.apply(rig,.5);
  assert.ok(rig.worldPosition("head").every(Number.isFinite));
  assert.equal(clip.sample(.5).time,.5);
});

test("3D two-bone IK returns a reachable elbow and clamps unreachable targets", () => {
  const { api } = loadEngine();
  const ik=api.NexoraSpatialMotion.solveTwoBoneIK([0,0,0],[1,0,0],1,1,[0,0,1]);
  assert.ok(Math.abs(Math.hypot(...ik.elbow)-1)<1e-5);
  assert.ok(Math.abs(Math.hypot(...ik.end)-1)<1e-5);assert.ok(Math.abs(Math.hypot(ik.end[0]-ik.elbow[0],ik.end[1]-ik.elbow[1],ik.end[2]-ik.elbow[2])-1)<1e-5);
  const far=api.NexoraSpatialMotion.solveTwoBoneIK([0,0,0],[10,0,0],1,1);
  assert.equal(far.clamped,true);
});


test("3D renderer geometry provides normals and reusable model transforms", () => {
  const { api } = loadEngine();
  const sphere=api.NexoraSpatialEngine.geometry.sphere([.2,.4,.6,1],8,6);
  assert.equal(sphere.positions.length,sphere.colors.length/4*3);
  assert.equal(sphere.positions.length%3,0);
  const m=api.NexoraSpatialEngine.transform([2,3,4],[0,0,0,1],[2,3,4]);
  assert.deepEqual(Array.from(m),[2,0,0,0,0,3,0,0,0,0,4,0,2,3,4,1]);
});

test("3D dinosaur dialogue demo contains syntactically valid inline JavaScript", () => {
  const html=fs.readFileSync(path.join(__dirname,"../admin/animate-dino-dialogue.html"),"utf8");
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:"animate-dino-dialogue.html"}));
  assert.match(html,/Exportar vídeo con audio/);
  assert.match(html,/api\/admin\/voice/);
  assert.match(html,/Quiero ser como tú/);
  assert.match(html,/no esculpí estos músculos para pelear/);
  assert.match(html,/NEXORA-Coelo-y-el-musculo-EDICION-MEJORADA\.webm/);
  assert.match(html,/Para proteger a quienes no pueden defenderse solos/);
  assert.match(html,/duration=25/);
  assert.match(html,/function updateEnvironment/);
  assert.match(html,/function blinkAmount/);
  assert.match(html,/animate-engine\/facial-animation\.js/);
});

test("dinosaur 3D rig has articulated jaw, limbs and a three-segment tail", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const tailBefore = rig.worldPosition("tailTip");
  const headBefore = rig.worldPosition("head");
  rig.setPose("tailBase", { rotation: [0, 0, Math.sin(0.35), Math.cos(0.35)] });
  rig.setPose("neckMid", { rotation: [0, 0, Math.sin(-0.12), Math.cos(-0.12)] });
  const tailAfter = rig.worldPosition("tailTip");
  const headAfter = rig.worldPosition("head");
  assert.ok(Math.abs(tailAfter[1] - tailBefore[1]) > 0.01);
  assert.ok(Math.abs(headAfter[0] - headBefore[0]) > 0.01);
  assert.ok(rig.byName.has("jaw"));
  assert.ok(rig.byName.has("footL") && rig.byName.has("footR"));
  assert.ok(rig.byName.has("tailBase") && rig.byName.has("tailMid") && rig.byName.has("tailTip"));
  const restored = api.NexoraSpatialRig3D.SpatialRig3D.fromJSON(rig.exportJSON());
  assert.deepEqual(Array.from(restored.worldPosition("tailTip")), Array.from(tailAfter));
});

test("3D linear blend skinning moves weighted vertices with the dinosaur skeleton", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const before = rig.skinVertices([0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]);
  rig.setPose("pelvis", { translation: [0, 1, 0] });
  const after = rig.skinVertices([0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]);
  assert.ok(after[1] > before[1]);
});


test("dinosaur dialogue scene drives its visible parts from the hierarchical 3D skeleton", () => {
  const html=fs.readFileSync(path.join(__dirname,"../admin/animate-dino-dialogue.html"),"utf8");
  assert.ok(html.includes('<script src="animate-engine/spatial-rig.js"></script>'));
  assert.ok(html.includes("NexoraSpatialRig3D.createDinosaur()"));
  assert.ok(html.includes("animateDinoRig(d,t,gesture,jaw)"));
  assert.ok(html.includes("NexoraSpatialRig3D.math.transform"));
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:"animate-dino-dialogue.html"}));
});



test("GLB importer preserves skin joints, normalized weights and animation channels", () => {
  const { api } = loadEngine();
  const json = {
    asset:{version:"2.0"},buffers:[{byteLength:72}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:12},{buffer:0,byteOffset:48,byteLength:12},{buffer:0,byteOffset:60,byteLength:4},{buffer:0,byteOffset:64,byteLength:8}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:"VEC3"},{bufferView:1,componentType:5121,count:3,type:"VEC4"},{bufferView:2,componentType:5121,count:3,type:"VEC4",normalized:true},{bufferView:3,componentType:5126,count:1,type:"SCALAR"},{bufferView:4,componentType:5126,count:1,type:"VEC2"}],
    meshes:[{name:"Skinned",extras:{targetNames:["Smile"]},weights:[0.25],primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},targets:[{POSITION:0}]}]}],
    nodes:[{name:"Mesh",mesh:0,skin:0},{name:"Root"},{name:"Arm"}],
    skins:[{name:"Character",joints:[1,2],skeleton:1}],
    animations:[{name:"Wave",samplers:[{input:3,output:4}],channels:[{sampler:0,target:{node:2,path:"translation"}}]}],
    scenes:[{nodes:[0,1]}],scene:0
  };
  const bytes=new ArrayBuffer(72),dv=new DataView(bytes);
  [0,0,0,1,0,0,0,1,0].forEach((v,i)=>dv.setFloat32(i*4,v,true));
  for(let i=0;i<12;i++)dv.setUint8(36+i,0);
  for(let i=0;i<12;i++)dv.setUint8(48+i,i%4===0?255:0);
  dv.setFloat32(60,0,true);dv.setFloat32(64,0,true);dv.setFloat32(68,1,true);
  const jsonBytes=new TextEncoder().encode(JSON.stringify(json)),jl=Math.ceil(jsonBytes.length/4)*4,total=12+8+jl+8+72;
  const glb=new ArrayBuffer(total),v=new DataView(glb);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,total,true);v.setUint32(12,jl,true);v.setUint32(16,0x4e4f534a,true);new Uint8Array(glb,20,jsonBytes.length).set(jsonBytes);for(let i=jsonBytes.length;i<jl;i++)new Uint8Array(glb)[20+i]=32;const off=20+jl;v.setUint32(off,72,true);v.setUint32(off+4,0x004e4942,true);new Uint8Array(glb,off+8,72).set(new Uint8Array(bytes));
  const parsed=api.NexoraSpatialEngine.parseGLB(glb);
  assert.equal(parsed.skins.length,1);
  assert.deepEqual(parsed.meshes[0].skin.jointNames,["Root","Arm"]);
  assert.deepEqual(Array.from(parsed.meshes[0].skin.weights[0]),[1,0,0,0]);
  assert.equal(parsed.animations[0].channels[0].path,"translation");
  assert.deepEqual(Array.from(parsed.animations[0].channels[0].times),[0]);
  const imported=api.NexoraSpatialRig3D.createFromGLB(parsed,0);
  assert.deepEqual(Array.from(imported.jointBoneIndices),[1,2]);
  assert.equal(imported.rig.bones.length,3);
  assert.equal(imported.skinIndex,0);
});


test("3D skinning supports eight influences and maps skin joints to rig bone indices", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraSpatialRig3D.SpatialRig3D([
    {name:"root"},
    {name:"spare",parent:"root",translation:[10,0,0]},
    {name:"jointA",parent:"root",translation:[1,0,0]},
    {name:"jointB",parent:"root",translation:[3,0,0]}
  ]);
  const joints=[0,0,0,0,1,1,1,1],weights=[.125,.125,.125,.125,.125,.125,.125,.125];
  const out=rig.skinVertices([0,0,0],joints,weights,[[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]],[2,3]);
  assert.ok(Math.abs(out[0]-2)<1e-6);
  assert.throws(()=>rig.skinVertices([0,0,0],[0,0,0,0,0],[1,0,0,0,0]),/Datos de skin/);
});


test("GLB rig skinning applies inverse mesh transform and updates GPU vertex buffers", () => {
  const { api } = loadEngine();
  const rig = new api.NexoraSpatialRig3D.SpatialRig3D([{name:"root",translation:[5,0,0]}]);
  const inverse=api.NexoraSpatialRig3D.math.inverse(rig.bones[0].world);
  const out=rig.skinVertices([1,0,0],[0,0,0,0],[1,0,0,0],[[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]],[0],inverse);
  assert.deepEqual(Array.from(out),[1,0,0]);
  const m=api.NexoraSpatialRig3D.math.inverse(api.NexoraSpatialRig3D.math.compose([2,3,4],[0,0,0,1],[2,2,2]));
  assert.ok(Math.abs(m[12]+1)<1e-6 && Math.abs(m[13]+1.5)<1e-6 && Math.abs(m[14]+2)<1e-6);
});


test("GLB animation player samples translation and quaternion channels", () => {
 const {api}=loadEngine();
 const rig=new api.NexoraSpatialRig3D.SpatialRig3D([{name:"root"}]);
 const parsed={animations:[{name:"Move",channels:[
  {node:0,path:"translation",interpolation:"LINEAR",times:[0,2],values:[[0,0,0],[4,0,0]]},
  {node:0,path:"rotation",interpolation:"LINEAR",times:[0,2],values:[[0,0,0,1],[0,0,1,0]]}
 ]}]};
 const imported={rig,nodeBoneIndices:new Map([[0,0]])};
 const player=api.NexoraSpatialRig3D.createAnimationPlayer(parsed,imported,0);
 player.seek(1);
 assert.ok(Math.abs(rig.bones[0].translation[0]-2)<1e-6);
 assert.ok(Math.abs(Math.hypot(...rig.bones[0].rotation)-1)<1e-6);
 player.play().advance(.5);
 assert.ok(Math.abs(player.time-1.5)<1e-6);
 player.pause();
});


test("GLB morph targets apply weighted position deltas without mutating the base mesh", () => {
 const {api}=loadEngine();
 const base=[0,0,0,1,0,0,0,1,0];
 const target={positions:[0,0,1,0,0,1,0,0,1]};
 const half=api.NexoraSpatialRig3D.applyMorphTargets(base,[target],[.5]);
 assert.deepEqual(half,[0,0,.5,1,0,.5,0,1,.5]);
 assert.deepEqual(base,[0,0,0,1,0,0,0,1,0]);
 assert.deepEqual(api.NexoraSpatialRig3D.applyMorphTargets(base,[target],[0]),base);
});


test("deformed GLB geometry receives recomputed triangle normals", () => {
 const {api}=loadEngine();
 const normals=api.NexoraSpatialEngine.flatNormals([0,0,0,1,0,0,0,1,0]);
 assert.deepEqual(normals,[0,0,1,0,0,1,0,0,1]);
 const degenerate=api.NexoraSpatialEngine.flatNormals([0,0,0,1,0,0,2,0,0]);
 assert.deepEqual(degenerate,[0,0,0,0,0,0,0,0,0]);
});


test("facial animator maps expression, blink and viseme aliases to morph targets", () => {
 const {api}=loadEngine();
 const mesh={morphTargets:[{name:"Smile"},{name:"EyeBlinkLeft"},{name:"Jaw_Open"},{name:"viseme_O"}],morphWeights:[0,0,0,0]};
 const face=new api.NexoraFacialAnimation.FacialAnimator([mesh]);
 face.apply({expression:"smile",expressionWeight:.7,blink:.9,viseme:"O",mouthOpen:.8});
 assert.deepEqual(mesh.morphWeights,[.7,.9,.8,.8]);
 face.reset();
 assert.deepEqual(mesh.morphWeights,[0,0,0,0]);
});
test("facial animator supports independent left and right eye blinks", () => {
 const {api}=loadEngine();
 const mesh={morphTargets:[{name:"BlinkLeft"},{name:"BlinkRight"},{name:"BrowUp"}],morphWeights:[0,0,0]};
 const face=new api.NexoraFacialAnimation.FacialAnimator([mesh]);
 face.apply({blinkLeft:.8,blinkRight:.2,browUp:.5});
 assert.deepEqual(mesh.morphWeights,[.8,.2,.5]);
});

test("3D facial animator resolves camelCase expressions and applies timed viseme states", () => {
  const { api } = loadEngine();
  const mesh = {
    morphTargets: [
      { name: "eyeBlinkLeft" },
      { name: "eyeBlinkRight" },
      { name: "mouthSmile" },
      { name: "jawOpen" }
    ],
    morphWeights: [0, 0, 0, 0]
  };
  const face = new api.NexoraFacialAnimation.FacialAnimator([mesh]);
  face.apply({ expression: "blinkLeft", expressionWeight: 0.8 });
  assert.equal(mesh.morphWeights[0], 0.8);
  face.apply({ expression: "smile", expressionWeight: 0.65, viseme: "A", mouthOpen: 0.9 });
  assert.equal(mesh.morphWeights[2], 0.65);
  assert.equal(mesh.morphWeights[3], 0.9);
  face.reset();
  assert.deepEqual(Array.from(mesh.morphWeights), [0, 0, 0, 0]);
});

test("3D facial acting generates timed blinks and reads phoneme viseme tracks", () => {
  const { api } = loadEngine();
  const faceApi = api.NexoraFacialAnimation;
  assert.ok(faceApi.blinkAt(0.07, { interval: 3.6, duration: 0.14 }) > 0.99);
  assert.equal(faceApi.blinkAt(0.5, { interval: 3.6, duration: 0.14 }), 0);
  const track = [
    { start: 0.1, end: 0.2, phoneme: "M" },
    { start: 0.2, end: 0.35, phoneme: "A" }
  ];
  assert.equal(faceApi.visemeAt(track, 0.15), "M");
  assert.equal(faceApi.visemeAt(track, 0.25), "A");
  const mesh = { morphTargets: [{ name: "eyeBlinkLeft" }, { name: "eyeBlinkRight" }, { name: "jawOpen" }], morphWeights: [0, 0, 0] };
  const animator = new faceApi.FacialAnimator([mesh]);
  animator.applyAt(0.25, { visemeTrack: track, mouthOpen: 0.75, blinkOffset: 3.42 });
  assert.ok(mesh.morphWeights[0] > 0.99);
  assert.ok(mesh.morphWeights[1] > 0.99);
  assert.equal(mesh.morphWeights[2], 0.75);
});

test("3D cinematic action library animates dinosaur gait and full-body reactions", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const beforeLeg = rig.worldPosition("shinL");
  const beforeTail = rig.worldPosition("tailTip");
  const walk = api.NexoraSpatialActions.createPlayer(rig, "walk");
  assert.equal(walk.loop, true);
  walk.play().advance(0.3);
  assert.notDeepEqual(rig.worldPosition("shinL"), beforeLeg);
  assert.notDeepEqual(rig.worldPosition("tailTip"), beforeTail);

  const jump = api.NexoraSpatialActions.createPlayer(rig, "jump");
  jump.play().advance(0.5);
  assert.ok(rig.worldPosition("root")[1] > 0.3);
  jump.advance(1);
  assert.equal(jump.playing, false);
  assert.equal(jump.time, jump.clip.duration);

  const talk = api.NexoraSpatialActions.createClip(rig, "talk");
  assert.ok(talk.tracks.some(track => track.bone === "jaw"));
  assert.equal(api.NexoraSpatialActions.actions.length, 9);
});

test("3D action library adapts to a humanoid rig and serializes reusable clips", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createHumanoid();
  const before = rig.worldPosition("head");
  const player = api.NexoraSpatialActions.createPlayer(rig, "hit");
  player.play().advance(0.25);
  assert.notDeepEqual(rig.worldPosition("head"), before);
  const copy = api.NexoraSpatialMotion.SpatialAnimationClip.fromJSON(player.clip.exportJSON());
  assert.equal(copy.name, "hit");
  assert.ok(copy.tracks.length > 0);
  assert.throws(() => api.NexoraSpatialActions.createClip(rig, "fly"), /desconocida/);
});

test("procedural 3D actions preserve the imported bind pose and do not stack old motion", () => {
  const { api } = loadEngine();
  const angle = 0.22;
  const baseRotation = [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)];
  const rig = new api.NexoraSpatialRig3D.SpatialRig3D([
    { name: "root", translation: [2, 3, 4], rotation: baseRotation },
    { name: "pelvis", parent: "root", translation: [0, 1, 0] },
    { name: "spine", parent: "pelvis", translation: [0, 1, 0] },
    { name: "head", parent: "spine", translation: [0, 1, 0] },
    { name: "jaw", parent: "head", translation: [0, -0.1, 0] },
    { name: "tailBase", parent: "pelvis", translation: [-1, 0, 0] },
    { name: "thighL", parent: "pelvis", translation: [0, -0.2, -0.2] },
    { name: "thighR", parent: "pelvis", translation: [0, -0.2, 0.2] }
  ]);
  const walk = api.NexoraSpatialActions.createPlayer(rig, "walk", { blendDuration: 0 });
  walk.play();
  assert.deepEqual(Array.from(rig.byName.get("root").translation), [2, 3, 4]);
  assert.ok(Math.abs(rig.byName.get("root").rotation[2] - baseRotation[2]) < 1e-8);
  walk.advance(0.3);
  const talk = api.NexoraSpatialActions.createPlayer(rig, "talk", { blendDuration: 0 });
  talk.play();
  assert.deepEqual(Array.from(rig.byName.get("root").translation), [2, 3, 4]);
  assert.ok(Math.abs(rig.byName.get("root").rotation[2] - baseRotation[2]) < 1e-8);
  rig.resetPose();
  assert.deepEqual(Array.from(rig.byName.get("root").translation), [2, 3, 4]);
});

test("3D action transitions blend from the current acting pose instead of snapping", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const walk = api.NexoraSpatialActions.createPlayer(rig, "walk", { blendDuration: 0 });
  walk.play().advance(0.3);
  const movingPose = rig.byName.get("pelvis").rotation.slice();
  assert.ok(Math.abs(movingPose[2]) > 0.001);

  const talk = api.NexoraSpatialActions.createPlayer(rig, "talk", { blendDuration: 0.4 });
  talk.play();
  const atStart = rig.byName.get("pelvis").rotation.slice();
  assert.ok(Math.abs(atStart[2] - movingPose[2]) < 1e-7);
  talk.advance(0.2);
  const halfway = rig.byName.get("pelvis").rotation.slice();
  assert.ok(Math.abs(halfway[2]) < Math.abs(movingPose[2]));
  assert.ok(Math.abs(halfway[2]) > 0.001);
  talk.advance(0.2);
  assert.ok(Math.abs(rig.byName.get("pelvis").rotation[2]) < 1e-8);
});

test("animation studio loads the 3D action library and parses its bridge script", () => {
  const root = path.join(__dirname, "..");
  const bridgePath = path.join(root, "admin/animate-engine/studio-bridge.js");
  const studioPath = path.join(root, "admin/animate-studio.html");
  const bridge = fs.readFileSync(bridgePath, "utf8");
  const studio = fs.readFileSync(studioPath, "utf8");
  assert.doesNotThrow(() => new vm.Script(bridge, { filename: bridgePath }));
  assert.ok(studio.includes('<script src="animate-engine/spatial-actions.js"></script>'));
  assert.ok(bridge.includes('id="n3dAction"'));
  assert.ok(bridge.includes('id="n3dBlend"'));
  assert.ok(bridge.includes('id="n3dSequenceAction"'));
  assert.ok(bridge.includes('id="n3dSequencePlay"'));
  assert.ok(bridge.includes('id="n3dSequenceExport"'));
  assert.ok(bridge.includes("updateSkinnedMeshes()"));
});

test("looping 3D actions complete their blend once without restarting it each cycle", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const player = api.NexoraSpatialActions.createPlayer(rig, "walk", { blendDuration: 0.2 });
  player.play().advance(0.3);
  player.advance(0.9);
  assert.ok(Math.abs(player.time) < 1e-8);
  assert.ok(player.elapsed >= 1.1);
  assert.ok(rig.byName.get("pelvis").rotation[2] < -0.005);
});

test("3D renderer applies timed facial expressions and visemes through its shared scene clock", () => {
  const { api } = loadEngine();
  const mesh = {
    id: "face",
    morphTargets: [
      { name: "eyeBlinkLeft" },
      { name: "eyeBlinkRight" },
      { name: "jawOpen" },
      { name: "visemeAA" }
    ],
    morphWeights: [0, 0, 0, 0]
  };
  mesh.facialAnimator = new api.NexoraFacialAnimation.FacialAnimator([mesh]);
  const renderer = Object.create(api.NexoraSpatialEngine.SpatialRenderer.prototype);
  renderer.meshes = [mesh];
  let updates = 0, renders = 0;
  renderer.updateSkinnedMesh = current => { assert.equal(current, mesh); updates++; };
  renderer.render = () => { renders++; return renderer; };
  const track = [{ start: 0.1, end: 0.4, phoneme: "A" }];
  const count = renderer.applyFacialAnimation(0.25, track, { mouthOpen: 0.7, blinkOffset: 3.42 });
  assert.equal(count, 1);
  assert.ok(mesh.morphWeights[0] > 0.99);
  assert.ok(mesh.morphWeights[1] > 0.99);
  assert.equal(mesh.morphWeights[2], 0.7);
  assert.equal(mesh.morphWeights[3], 0.7);
  assert.equal(updates, 1);
  assert.equal(renders, 1);
});

test("studio validates facial cue controls and drives face animation beside body motion", () => {
  const root = path.join(__dirname, "..");
  const bridgePath = path.join(root, "admin/animate-engine/studio-bridge.js");
  const bridge = fs.readFileSync(bridgePath, "utf8");
  assert.doesNotThrow(() => new vm.Script(bridge, { filename: bridgePath }));
  assert.ok(bridge.includes('id="n3dVisemeTrack"'));
  assert.ok(bridge.includes('id="n3dFaceValidate"'));
  assert.ok(bridge.includes("applyFacialFrame(facialTime)"));
  assert.ok(bridge.includes("applyFacialAnimation(time,facialTrack"));
});

test("facial visemes coarticulate smoothly across adjacent phoneme cues", () => {
  const { api } = loadEngine();
  const face = api.NexoraFacialAnimation;
  const track = [
    { start: 0, end: 0.2, phoneme: "M" },
    { start: 0.2, end: 0.4, phoneme: "A" }
  ];
  const before = face.visemeWeightsAt(track, 0.17, 0.06);
  const middle = face.visemeWeightsAt(track, 0.2, 0.06);
  const after = face.visemeWeightsAt(track, 0.23, 0.06);
  assert.ok(before.M > before.A);
  assert.ok(Math.abs(middle.M - 0.5) < 1e-8);
  assert.ok(Math.abs(middle.A - 0.5) < 1e-8);
  assert.ok(after.A > after.M);

  const mesh = { morphTargets: [{ name: "mouthClosed" }, { name: "visemeAA" }], morphWeights: [0, 0] };
  const animator = new face.FacialAnimator([mesh]);
  animator.applyAt(0.2, { visemeTrack: track, coarticulation: 0.06 });
  assert.ok(Math.abs(mesh.morphWeights[0] - 0.5) < 1e-8);
  assert.ok(Math.abs(mesh.morphWeights[1] - 0.5) < 1e-8);
});

test("dinosaur cinematic actions animate segmented spine neck and tail chains", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const map = api.NexoraSpatialActions.roleMap(rig);
  assert.deepEqual(Array.from(map.tailBones), ["tailBase", "tailMid", "tailTip"]);
  assert.deepEqual(Array.from(map.neckBones), ["neckBase", "neckMid"]);
  assert.deepEqual(Array.from(map.spineBones), ["spine"]);
  const clip = api.NexoraSpatialActions.createClip(rig, "walk");
  for (const name of [...map.tailBones, ...map.neckBones]) {
    assert.ok(clip.tracks.some(track => track.bone === name), "Missing segmented track for " + name);
  }
  const player = api.NexoraSpatialActions.createPlayer(rig, "walk", { blendDuration: 0 });
  player.play().advance(0.3);
  for (const name of [...map.tailBones, ...map.neckBones]) {
    assert.ok(Math.hypot(...rig.byName.get(name).rotation.slice(0, 3)) > 0.001, "Segment did not articulate: " + name);
  }
});

test("cinematic 3D action sequences combine walk jump and landing with blended transitions", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const sequence = new api.NexoraSpatialActions.SpatialActionSequence(rig, { name: "Coelo - salto y aterrizaje" });
  sequence.add("walk", {}, { duration: 0.6, blendDuration: 0.12 });
  sequence.add("jump", {}, { duration: 0.95, blendDuration: 0.16 });
  sequence.add("land", {}, { duration: 0.55, blendDuration: 0.12 });
  assert.ok(Math.abs(sequence.totalDuration - 2.1) < 1e-8);
  assert.deepEqual(Array.from(sequence.timeline().map(x => x.action)), ["walk", "jump", "land"]);

  const player = sequence.createPlayer();
  player.play().advance(0.7);
  assert.equal(player.currentIndex, 1);
  assert.ok(Math.abs(player.time - 0.7) < 1e-8);
  player.advance(1);
  assert.equal(player.currentIndex, 2);
  player.advance(0.5);
  assert.equal(player.playing, false);
  assert.equal(player.time, sequence.totalDuration);

  const restored = api.NexoraSpatialActions.SpatialActionSequence.fromJSON(rig, sequence.exportJSON());
  assert.equal(restored.name, "Coelo - salto y aterrizaje");
  assert.equal(restored.segments.length, 3);
  assert.equal(restored.totalDuration, sequence.totalDuration);
  assert.ok(restored.remove(1));
  assert.equal(restored.segments.length, 2);
  assert.throws(() => restored.add("walk", {}, { duration: Number.NaN }), /duración/);
  assert.throws(() => restored.add("walk", {}, { blendDuration: 3 }), /fundido/);
});

test("cinematic sequence player can seek to an action and resume from that pose", () => {
  const { api } = loadEngine();
  const rig = api.NexoraSpatialRig3D.createDinosaur();
  const sequence = new api.NexoraSpatialActions.SpatialActionSequence(rig);
  sequence.add("walk", {}, { duration: 0.6 });
  sequence.add("talk", {}, { duration: 1.4 });
  const player = sequence.createPlayer();
  player.seek(0.9);
  assert.equal(player.currentIndex, 1);
  assert.equal(player.time, 0.9);
  player.play().advance(0.2);
  assert.ok(Math.abs(player.time - 1.1) < 1e-8);
  player.pause();
  assert.equal(player.playing, false);
});

test("GLB parser preserves embedded base-color images and UV coordinates for textured models", () => {
  const { api } = loadEngine();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j+2QAAAAASUVORK5CYII=", "base64");
  const imageOffset = 60;
  const binLength = Math.ceil((imageOffset + png.length) / 4) * 4;
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: imageOffset, byteLength: png.length }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" }
    ],
    images: [{ name: "skin", bufferView: 2, mimeType: "image/png" }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.6, 0.4, 1], baseColorTexture: { index: 0 } } }],
    meshes: [{ name: "TexturedTriangle", primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const buffer = new ArrayBuffer(total), view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, jsonBytes.length).set(jsonBytes);
  for (let i = jsonBytes.length; i < jsonLength; i++) new Uint8Array(buffer)[20 + i] = 0x20;
  const binStart = 20 + jsonLength;
  view.setUint32(binStart, binLength, true); view.setUint32(binStart + 4, 0x004e4942, true);
  const coordinates = [0,0,0, 1,0,0, 0,1,0];
  coordinates.forEach((value, i) => view.setFloat32(binStart + 8 + i * 4, value, true));
  const uv = [0,0, 1,0, 0,1];
  uv.forEach((value, i) => view.setFloat32(binStart + 8 + 36 + i * 4, value, true));
  new Uint8Array(buffer, binStart + 8 + imageOffset, png.length).set(png);
  const parsed = api.NexoraSpatialEngine.parseGLB(buffer);
  assert.equal(parsed.meshes[0].textureIndex, 0);
  assert.deepEqual(Array.from(parsed.meshes[0].uvs), uv);
  assert.equal(parsed.images.length, 1);
  assert.equal(parsed.images[0].mimeType, "image/png");
  assert.equal(parsed.images[0].data.byteLength, png.length);
  assert.equal(parsed.textures[0].source, 0);
});

test("2D walk cycles preserve bone lengths and articulate legs and dinosaur tail", () => {
  const { api } = loadEngine();
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  for (const type of ["worker", "dinosaur"]) {
    const rig = new api.NexoraAnimationTools.CharacterRig();
    type === "dinosaur" ? rig.createDinosaur() : rig.createHumanoid();
    const preset = type === "dinosaur" ? "dino-walk" : "worker-walk";
    const timeline = new api.NexoraMotionSystem.MotionTimeline(rig.points);
    timeline.usePreset(preset, 2);
    const pose = timeline.sample(0.37);
    for (const [root, joint, end] of [
      ["hip", "kneeL", "footL"],
      ["hip", "kneeR", "footR"],
      ["shoulderL", "elbowL", "handL"],
      ["shoulderR", "elbowR", "handR"]
    ]) {
      assert.ok(Math.abs(distance(rig.points[root], rig.points[joint]) - distance(pose[root], pose[joint])) < 1e-6);
      assert.ok(Math.abs(distance(rig.points[joint], rig.points[end]) - distance(pose[joint], pose[end])) < 1e-6);
    }
    assert.notDeepEqual(pose.footL, rig.points.footL);
    assert.notDeepEqual(pose.footR, rig.points.footR);
    if (type === "dinosaur") {
      const before = ["tail1", "tail2", "tail3", "tail4"];
      const roots = ["hip", "tail1", "tail2", "tail3"];
      before.forEach((name, index) => {
        assert.ok(Math.abs(distance(rig.points[roots[index]], rig.points[name]) - distance(pose[roots[index]], pose[name])) < 1e-6);
      });
    }
  }
});

test("worker walk keeps its stride inside a readable range and dinosaur tail swipe has a clear arc", () => {
  const { api } = loadEngine();
  const worker = new api.NexoraAnimationTools.CharacterRig().createHumanoid();
  const workerMotion = new api.NexoraMotionSystem.MotionTimeline(worker.points);
  workerMotion.usePreset("worker-walk", 2);
  const workerPose = workerMotion.sample(0.37);
  assert.ok(workerPose.footR.x - workerPose.footL.x < 0.29, "Worker stride should not split into an exaggerated side-to-side pose.");
  const dino = new api.NexoraAnimationTools.CharacterRig().createDinosaur();
  const tailMotion = new api.NexoraMotionSystem.MotionTimeline(dino.points);
  tailMotion.usePreset("dino-tail-swipe", 2);
  const tailPose = tailMotion.sample(1.04);
  assert.ok(tailPose.tail4.x > dino.points.tail4.x + 0.08);
  assert.ok(tailPose.tail4.y > dino.points.tail4.y + 0.1);
});
