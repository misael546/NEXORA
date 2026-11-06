/* NEXORA ANIMATE — reusable animation primitives. */
(()=>{"use strict";
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function interpolatePose(a,b,t){const out={};for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const av=a?.[k]??b?.[k]??0,bv=b?.[k]??av;out[k]=typeof av==="number"&&typeof bv==="number"?lerp(av,bv,clamp(t)):t<.5?av:bv}return out}
function solveTwoBoneIK(root,target,len1,len2,pole=1){const dx=target.x-root.x,dy=target.y-root.y,d=Math.max(.001,Math.hypot(dx,dy)),dist=Math.min(len1+len2-.001,Math.max(Math.abs(len1-len2)+.001,d)),a=Math.acos(clamp((len1*len1+dist*dist-len2*len2)/(2*len1*dist),-1,1)),base=Math.atan2(dy,dx)+pole*a;return{x:root.x+Math.cos(base)*len1,y:root.y+Math.sin(base)*len1}}
class CharacterRig{
 constructor(points={}){this.points={...points};this.bones=[];this.poses={};this.selected=null}
 setPoint(name,x,y){this.points[name]={x:clamp(x),y:clamp(y)}}
 removePoint(name){delete this.points[name]}
 addBone(name,from,to,length=null){if(!this.points[from]||!this.points[to])throw new Error("Faltan puntos para crear el hueso");this.bones.push({name,from,to,length});return this.bones.at(-1)}
 save(){return{version:1,points:this.points,bones:this.bones,poses:this.poses}}
 load(data){if(data.version!==1||!data.points)throw new Error("Rig no compatible");this.points={...data.points};this.bones=[...(data.bones||[])];this.poses={...(data.poses||{})}}
 draw(ctx,w,h,options={}){ctx.save();ctx.lineWidth=options.lineWidth||3;ctx.strokeStyle=options.color||"#72e5e8";ctx.fillStyle=options.color||"#72e5e8";for(const b of this.bones){const a=this.points[b.from],z=this.points[b.to];if(!a||!z)continue;ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(z.x*w,z.y*h);ctx.stroke()}for(const [name,p] of Object.entries(this.points)){ctx.beginPath();ctx.arc(p.x*w,p.y*h,name===this.selected?8:5,0,Math.PI*2);ctx.fill()}ctx.restore()}
}
function buildVisemeTrack(phonemes,duration){const map={A:"open",E:"wide",I:"wide",O:"round",U:"round",M:"closed",P:"closed",B:"closed",F:"teeth",V:"teeth",S:"narrow",T:"narrow",L:"tongue",R:"round"};return(phonemes||[]).filter(p=>Number.isFinite(p.start)&&Number.isFinite(p.end)).map(p=>({start:clamp(p.start,0,duration),end:clamp(p.end,0,duration),phoneme:String(p.phoneme||"").toUpperCase(),viseme:map[String(p.phoneme||"").toUpperCase()]||"neutral"})).sort((a,b)=>a.start-b.start)}
function visemeAt(track,time){const p=track.find(x=>time>=x.start&&time<=x.end);return p?.viseme||"neutral"}
window.NexoraAnimationTools={CharacterRig,interpolatePose,solveTwoBoneIK,buildVisemeTrack,visemeAt};
})();