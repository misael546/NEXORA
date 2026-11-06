/* NEXORA ANIMATE — reusable motion presets and keyframe timeline. */
(()=>{"use strict";
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const copyPoints=p=>Object.fromEntries(Object.entries(p||{}).map(([k,v])=>[k,{x:v.x,y:v.y}]));
const cycles={
 idle:(p,t)=>{const s=Math.sin(t*Math.PI*2);if(/shoulder/.test(p))return{x:0,y:-.008*s};if(p==="head")return{x:0,y:-.004*s};if(p==="hip")return{x:0,y:.004*s};return{x:0,y:0}},
 walk:(p,t)=>{const s=Math.sin(t*Math.PI*2);if(/arm|elbow|hand/.test(p))return{x:0,y:s*(p.includes("L")?-.045:.045)};if(/knee|foot/.test(p))return{x:s*(p.includes("L")?.035:-.035),y:Math.max(0,Math.cos(t*Math.PI*2))*.025};if(p==="hip")return{x:0,y:Math.abs(s)*-.012};if(p==="head")return{x:0,y:-Math.abs(s)*.006};return{x:0,y:0}},
 run:(p,t)=>{const s=Math.sin(t*Math.PI*2);if(/arm|elbow|hand/.test(p))return{x:0,y:s*(p.includes("L")?-.09:.09)};if(/knee|foot/.test(p))return{x:s*(p.includes("L")?.07:-.07),y:Math.max(0,Math.cos(t*Math.PI*2))*.055};if(p==="hip")return{x:0,y:-Math.abs(s)*.035};if(p==="head")return{x:0,y:-Math.abs(s)*.012};return{x:0,y:0}},
 jump:(p,t)=>{const lift=Math.sin(Math.PI*t);if(p==="hip"||p==="neck"||p==="head")return{x:0,y:-.12*lift};if(/arm|hand|elbow/.test(p))return{x:0,y:-.1*lift};if(/knee|foot/.test(p))return{x:0,y:-.045*lift};return{x:0,y:0}},
 talk:(p,t)=>{const s=Math.sin(t*Math.PI*8);if(p==="head")return{x:0,y:-.006*Math.abs(s)};if(/hand|elbow/.test(p))return{x:s*.012,y:-.012*Math.abs(s)};return{x:0,y:0}},
 hit:(p,t)=>{const recoil=Math.sin(Math.PI*Math.min(1,t*2));if(p==="head"||p==="neck")return{x:-.045*recoil,y:.018*recoil};if(/shoulder|elbow|hand/.test(p))return{x:-.035*recoil,y:.025*recoil};if(p==="hip")return{x:-.018*recoil,y:.01*recoil};return{x:0,y:0}}
};
class MotionTimeline{
 constructor(points={}){this.base=copyPoints(points);this.duration=2;this.preset="idle";this.keyframes=[]}
 setBase(points){this.base=copyPoints(points)}
 usePreset(name,duration=this.duration){if(!cycles[name])throw new Error("Movimiento desconocido");this.preset=name;this.duration=Math.max(.1,Number(duration)||2);this.keyframes=[];return this.sample(0)}
 addKeyframe(time,points){const t=clamp(Number(time)||0,0,this.duration);const frame={time:t,points:copyPoints(points)};const i=this.keyframes.findIndex(x=>Math.abs(x.time-t)<.001);if(i>=0)this.keyframes[i]=frame;else this.keyframes.push(frame);this.keyframes.sort((a,b)=>a.time-b.time);return frame}
 sample(time){const t=clamp(time/this.duration,0,1);if(this.keyframes.length){const frames=[{time:0,points:this.base},...this.keyframes,{time:this.duration,points:this.keyframes.at(-1).points}].sort((a,b)=>a.time-b.time);let a=frames[0],b=frames.at(-1);for(let i=0;i<frames.length-1;i++){if(time>=frames[i].time&&time<=frames[i+1].time){a=frames[i];b=frames[i+1];break}}const p=ease((time-a.time)/Math.max(.0001,b.time-a.time)),out={};for(const name of new Set([...Object.keys(a.points),...Object.keys(b.points)])){const x=a.points[name]||b.points[name],y=b.points[name]||x;out[name]={x:lerp(x.x,y.x,p),y:lerp(x.y,y.y,p)}}return out}
 const fn=cycles[this.preset]||cycles.idle;const phase=this.preset==="idle"||this.preset==="walk"||this.preset==="run"||this.preset==="talk"?t*2:t;const out={};for(const [name,p]of Object.entries(this.base)){const d=fn(name,phase);out[name]={x:clamp(p.x+d.x),y:clamp(p.y+d.y)}}return out}
 apply(rig,time){rig.points=this.sample(time);return rig.points}
 exportJSON(){return JSON.stringify({format:"nexora-motion",version:1,preset:this.preset,duration:this.duration,base:this.base,keyframes:this.keyframes},null,2)}
 importJSON(raw){const d=typeof raw==="string"?JSON.parse(raw):raw;if(d.format!=="nexora-motion"||d.version!==1||!d.base)throw new Error("Archivo de movimiento no válido");this.base=copyPoints(d.base);this.preset=d.preset||"idle";this.duration=Math.max(.1,Number(d.duration)||2);this.keyframes=Array.isArray(d.keyframes)?d.keyframes:[];return this}
}
window.NexoraMotionSystem={MotionTimeline,presets:Object.keys(cycles)};
})();