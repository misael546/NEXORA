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
