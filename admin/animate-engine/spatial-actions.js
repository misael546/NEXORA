/* NEXORA ANIMATE — reusable cinematic body acting for imported 3D rigs. */
(()=>{"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const q=(axis,angle)=>{const n=Math.hypot(...axis)||1,s=Math.sin(angle/2)/n;return[axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(angle/2)]};
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qnorm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const clean=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const patterns={
 root:/^(root|armature|skeleton|masterroot)$/,
 pelvis:/(pelvis|hips|hiproot)/,
 spine:/(spine|torso|back)/,
 chest:/(chest|upperbody|ribcage)/,
 neck:/neck/,
 head:/head/,
 jaw:/(jaw|mandible)/,
 tail:/tail/,
 thigh:/(thigh|upleg|upperleg|femur)/,
 shin:/(shin|calf|lowerleg)/,
 foot:/(foot|ankle|toe)/,
 arm:/(upperarm|arm|forearm|hand|wrist)/
};
function findBone(rig,role,side){
 const names=rig.bones.map(b=>b.name);
 if(side){
  const suffix=side==="L"?/(left|l)$/:/(right|r)$/;
  const prefix=side==="L"?/^(left|l)/:/^(right|r)/;
  const candidates=names.filter(n=>{const s=clean(n);return patterns[role]?.test(s)&& (suffix.test(s)||prefix.test(s)||s.includes(role.toLowerCase()+side.toLowerCase()))});
  return candidates[0]||null;
 }
 if(role==="root"){const exact=names.find(n=>patterns.root.test(clean(n)));if(exact)return exact;return rig.bones.find(b=>b.parent===null)?.name||null}
 const candidates=names.filter(n=>patterns[role]?.test(clean(n)));
 if(role==="spine")return candidates.find(n=>!/(chest|neck)/i.test(n))||candidates[0]||null;
 if(role==="arm")return candidates.find(n=>/(upperarm|arm)/i.test(n))||candidates[0]||null;
 if(role==="thigh")return candidates.find(n=>/(thigh|upleg|upperleg|femur)/i.test(n))||candidates[0]||null;
 if(role==="shin")return candidates.find(n=>/(shin|calf|lowerleg)/i.test(n))||candidates[0]||null;
 if(role==="foot")return candidates.find(n=>/(foot|ankle|toe)/i.test(n))||null;
 return candidates[0]||null;
}
function roleMap(rig){
 const map={};for(const role of Object.keys(patterns)){if(["thigh","shin","foot","arm"].includes(role))continue;map[role]=findBone(rig,role)}
 for(const role of ["thigh","shin","foot","arm"]){map[role+"L"]=findBone(rig,role,"L");map[role+"R"]=findBone(rig,role,"R")}
 return map;
}
function makeTrack(rig,bone,frames,axis=[0,0,1]){
 if(!bone)return null;
 const source=rig.byName.get(bone),index=rig.bones.indexOf(source),base=rig.restPose?.[index]||source;
 return{bone,keyframes:frames.map(f=>{const key={time:f[0],rotation:qnorm(qmul(base.rotation||[0,0,0,1],q(f[2]||axis,f[1]||0)))};if(f[3])key.translation=f[3].map((v,i)=>v+(base.translation?.[i]||0));return key})};
}
function createClip(rig,action,options={}){
 const map=roleMap(rig),dino=!!map.tail,duration=({idle:2.4,walk:1.2,run:.72,jump:.95,land:.55,turn:.8,talk:1.4,hit:.68,crouch:.7})[action];
 if(!duration)throw Error("Acción cinematográfica desconocida: "+action);
 const loop=["idle","walk","run","talk"].includes(action),tracks=[];
 const add=(role,frames,axis)=>{const name=map[role];const t=makeTrack(rig,name,frames,axis);if(t)tracks.push(t)};
 const cyc=(angles,axis=[0,0,1],translations=null)=>angles.map((a,i)=>[duration*i/(angles.length-1),a,axis,translations?.[i]]);
 if(action==="idle"){
  add("pelvis",cyc([0,.012,0,-.012,0],[0,0,1],[[0,0,0],[0,.012,0],[0,0,0],[0,.012,0],[0,0,0]]));
  add("chest",cyc([0,.018,0,-.018,0]));
  add("neck",cyc([0,-.025,0,.025,0]));
  add("head",cyc([0,.018,0,-.018,0]));
  add("tail",cyc([-.035,.035,-.035,.035,-.035],[0,1,0]));
  add("jaw",cyc([0,.015,0,.01,0]));
 }else if(action==="walk"||action==="run"){
  const fast=action==="run",s=fast?1.35:1,leg=[0,.62*s,0,-.62*s,0],legR=leg.map(v=>-v),shin=[0,-.32*s,0,.32*s,0],shinR=shin.map(v=>-v),arm=[0,-.28*s,0,.28*s,0],armR=arm.map(v=>-v);
  const bob=fast?[0,.08,0,.08,0]:[0,.035,0,.035,0];
  add("root",cyc([0,0,0,0,0],[0,0,1],bob.map(v=>[0,v,0])));
  add("pelvis",cyc([-.025,.035,-.025,.035,-.025]));
  add("spine",cyc([.02,-.025,.02,-.025,.02]));
  add("thighL",cyc(leg));add("thighR",cyc(legR));
  add("shinL",cyc(shin));add("shinR",cyc(shinR));
  add("footL",cyc(shin.map(v=>-v*.55)));add("footR",cyc(shinR.map(v=>-v*.55)));
  add("armL",cyc(arm));add("armR",cyc(armR));
  add("neck",cyc([.025,-.035,.025,-.035,.025]));
  add("head",cyc([-.018,.025,-.018,.025,-.018]));
  add("tail",cyc([-.13,.13,-.13,.13,-.13],[0,1,0]));
 }else if(action==="jump"){
  add("root",[[0,0,[0,0,1],[0,0,0]],[.16,0,[0,0,1],[0,-.16,0]],[.42,0,[0,0,1],[0,.48,0]],[.58,0,[0,0,1],[0,.52,0]],[.8,0,[0,0,1],[0,.08,0]],[.95,0,[0,0,1],[0,0,0]]]);
  add("pelvis",cyc([-.06,.08,.02,-.04,0]));
  add("thighL",cyc([-.15,.8,.62,.4,0]));add("thighR",cyc([-.15,.8,.62,.4,0]));
  add("shinL",cyc([.05,-.72,-.55,-.2,0]));add("shinR",cyc([.05,-.72,-.55,-.2,0]));
  add("armL",cyc([-.05,-.65,-.55,-.2,0]));add("armR",cyc([.05,.65,.55,.2,0]));
  add("neck",cyc([0,-.12,-.08,.04,0]));add("head",cyc([0,.1,.08,-.03,0]));
  add("tail",cyc([-.1,.28,.18,-.08,0],[0,1,0]));
 }else if(action==="land"){
  add("root",[[0,0,[0,0,1],[0,.12,0]],[.12,0,[0,0,1],[0,-.14,0]],[.28,0,[0,0,1],[0,0,0]],[.55,0,[0,0,1],[0,0,0]]]);
  add("pelvis",cyc([.1,-.18,.06,0,0]));add("spine",cyc([-.1,.08,-.025,0,0]));add("thighL",cyc([.4,-.18,-.08,0,0]));add("thighR",cyc([.4,-.18,-.08,0,0]));add("tail",cyc([.32,-.22,.12,0,0],[0,1,0]));
 }else if(action==="turn"){
  const direction=options.direction==="right"?-1:1;
  add("root",[[0,0,[0,1,0],[0,0,0]],[.2,direction*.15,[0,1,0]],[.55,direction*1.35,[0,1,0]],[.8,direction*Math.PI/2,[0,1,0]]]);
  add("spine",cyc([0,-.04,-.06,0,0]));add("head",cyc([0,-.16,-.08,.02,0]));add("tail",cyc([0,-.12,-.2,-.08,0],[0,1,0]));
 }else if(action==="talk"){
  add("jaw",cyc([.05,.24,.08,.34,.05]));
  add("head",cyc([0,.045,-.025,.035,0]));
  add("neck",cyc([0,.025,-.018,.025,0]));
  add("armL",cyc([0,-.12,-.22,-.08,0]));add("armR",cyc([0,.12,.22,.08,0]));
  add("tail",cyc([0,.025,0,-.025,0],[0,1,0]));
 }else if(action==="hit"){
  add("root",[[0,0,[0,0,1],[0,0,0]],[.12,-.14,[0,0,1],[-.08,-.04,0]],[.28,.12,[0,0,1],[-.16,.02,0]],[.48,.05,[0,0,1],[-.06,0,0]],[.68,0,[0,0,1],[0,0,0]]]);
  add("pelvis",cyc([0,-.16,.1,.035,0]));add("spine",cyc([0,.22,-.1,-.025,0]));add("neck",cyc([0,.28,-.1,-.02,0]));add("head",cyc([0,.24,-.16,-.03,0]));add("armL",cyc([0,.4,.2,.08,0]));add("armR",cyc([0,-.4,-.2,-.08,0]));add("tail",cyc([0,.35,-.25,.1,0],[0,1,0]));
 }else if(action==="crouch"){
  add("pelvis",[[0,0],[.22,-.3],[.7,-.3]]);add("thighL",[[0,0],[.22,.55],[.7,.55]]);add("thighR",[[0,0],[.22,.55],[.7,.55]]);add("shinL",[[0,0],[.22,-.7],[.7,-.7]]);add("shinR",[[0,0],[.22,-.7],[.7,-.7]]);add("spine",[[0,0],[.22,.12],[.7,.12]]);add("head",[[0,0],[.22,-.08],[.7,-.08]]);
 }
 if(!tracks.length)throw Error("El rig no contiene huesos compatibles para "+action);
 const {SpatialAnimationClip}=window.NexoraSpatialMotion;
 return new SpatialAnimationClip({name:action,duration,fps:30,loop,tracks});
}
const slerp=(a,b,t)=>{let end=b.slice(),dot=a.reduce((sum,v,i)=>sum+v*end[i],0);if(dot<0){dot=-dot;end=end.map(v=>-v)}if(dot>.9995)return qnorm(a.map((v,i)=>v+(end[i]-v)*t));const theta=Math.acos(clamp(dot,-1,1)),sin=Math.sin(theta);return qnorm(a.map((v,i)=>(v*Math.sin((1-t)*theta)+end[i]*Math.sin(t*theta))/sin))};
class SpatialActionPlayer{
 constructor(rig,clip,options={}){this.rig=rig;this.clip=clip;this.time=0;this.elapsed=0;this.playing=false;this.loop=clip.loop;this.blendDuration=clamp(Number(options.blendDuration??.22),0,2);this.rest=(rig.restPose||rig.bones.map(b=>({translation:b.translation,rotation:b.rotation,scale:b.scale}))).map(p=>({translation:p.translation.slice(),rotation:p.rotation.slice(),scale:p.scale.slice()}));this.fromPose=rig.bones.map(b=>({translation:b.translation.slice(),rotation:b.rotation.slice(),scale:b.scale.slice()}))}
 restore(){this.rig.bones.forEach((b,i)=>{const p=this.rest[i];b.translation=p.translation.slice();b.rotation=p.rotation.slice();b.scale=p.scale.slice()});this.rig.updateWorld()}
 apply(){this.restore();this.clip.apply(this.rig,this.time);const weight=this.blendDuration>0?clamp(this.elapsed/this.blendDuration,0,1):1;if(weight<1){this.rig.bones.forEach((b,i)=>{const from=this.fromPose[i];b.translation=b.translation.map((v,j)=>from.translation[j]+(v-from.translation[j])*weight);b.scale=b.scale.map((v,j)=>from.scale[j]+(v-from.scale[j])*weight);b.rotation=slerp(from.rotation,b.rotation,weight)});this.rig.updateWorld()}return this}
 play(){this.playing=true;return this.apply()}
 pause(){this.playing=false;return this}
 seek(seconds){this.time=clamp(Number(seconds)||0,0,this.clip.duration);this.elapsed=this.time;return this.apply()}
 advance(delta){if(!this.playing)return this;const step=Math.max(0,Number(delta)||0);this.elapsed+=step;this.time+=step;if(this.loop)this.time%=this.clip.duration;else if(this.time>=this.clip.duration){this.time=this.clip.duration;this.playing=false}return this.apply()}
}
const actions=[{id:"idle",label:"Respirar / reposo"},{id:"walk",label:"Caminar"},{id:"run",label:"Correr"},{id:"jump",label:"Saltar"},{id:"land",label:"Aterrizar"},{id:"turn",label:"Girar"},{id:"talk",label:"Hablar / gesticular"},{id:"hit",label:"Reaccionar a impacto"},{id:"crouch",label:"Agacharse"}];
function createPlayer(rig,action,options={}){return new SpatialActionPlayer(rig,createClip(rig,action,options),options)}
window.NexoraSpatialActions={actions,roleMap,createClip,createPlayer,SpatialActionPlayer};
})();