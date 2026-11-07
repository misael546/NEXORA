/* NEXORA ANIMATE — morph-driven facial acting and viseme controller. */
(()=>{"use strict";
const aliases={
smile:["smile","happy","grin","mouthsmile"],frown:["frown","sad","unhappy","mouthfrown"],
blink:["blink","eyeclose","eyesclosed","closeeyes"],blinkLeft:["blinkleft","eyecloseleft","lefteyeclose"],blinkRight:["blinkright","eyecloseright","righteyeclose"],
browUp:["browup","eyebrowup","browsup"],browDown:["browdown","eyebrowdown","browsdown"],
jawOpen:["jawopen","mouthopen","openmouth","visemeaa"],mouthClose:["mouthclose","closemouth"],
angry:["angry","anger","scowl"],surprise:["surprise","surprised","wideeyes"],fear:["fear","scared"],
};
const visemes={A:["visemeaa","mouthaa","jawopen","mouthopen"],E:["visimee","visemee","mouthee","mouthwide"],I:["visemei","mouthi"],O:["visemeo","moutho","pucker"],U:["visemeu","mouthu","pucker"],M:["visemem","mouthclosed","lipsclosed"],F:["visemef","teethlip"],L:["visemel","tongue"]};
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
class FacialAnimator{
constructor(meshes=[]){this.meshes=[];this.base=new Map();this.setMeshes(meshes)}
setMeshes(meshes=[]){this.meshes=meshes.filter(m=>m&&Array.isArray(m.morphTargets));for(const m of this.meshes)if(!this.base.has(m))this.base.set(m,(m.morphWeights||m.morphTargets.map(()=>0)).slice());return this}
targets(names){const wanted=names.map(normalize);const found=[];for(const mesh of this.meshes)for(let i=0;i<mesh.morphTargets.length;i++){const name=normalize(mesh.morphTargets[i].name);if(wanted.some(n=>name===n||name.includes(n)))found.push({mesh,index:i})}return found}
apply(state={}){const values=new Map();const add=(names,amount)=>{for(const hit of this.targets(names)){const key=hit.mesh;let row=values.get(key);if(!row)values.set(key,row=new Map());row.set(hit.index,Math.max(row.get(hit.index)||0,amount))}};
const expression=normalize(state.expression||"");if(expression){const group=aliases[expression]||[expression];add(group,state.expressionWeight??1)}
if(state.blink!==undefined){const amount=Math.max(0,Math.min(1,Number(state.blink)||0));if(state.blinkLeft===undefined&&state.blinkRight===undefined)add(aliases.blink,amount);else{if(state.blinkLeft!==undefined)add(aliases.blinkLeft,Math.max(0,Math.min(1,state.blinkLeft)));if(state.blinkRight!==undefined)add(aliases.blinkRight,Math.max(0,Math.min(1,state.blinkRight)))}}
if(state.browUp!==undefined)add(aliases.browUp,Number(state.browUp)||0);if(state.browDown!==undefined)add(aliases.browDown,Number(state.browDown)||0);if(state.jawOpen!==undefined)add(aliases.jawOpen,Number(state.jawOpen)||0);
const viseme=String(state.viseme||"").toUpperCase();if(viseme&&visemes[viseme])add(visemes[viseme],state.mouthOpen??1);
for(const mesh of this.meshes){const next=(this.base.get(mesh)||[]).slice();for(const[index,value]of values.get(mesh)||[])next[index]=Math.max(-1,Math.min(1,value));mesh.morphWeights=next}
return this.meshes}
reset(){for(const mesh of this.meshes)mesh.morphWeights=(this.base.get(mesh)||[]).slice();return this.meshes}
}
window.NexoraFacialAnimation={FacialAnimator,aliases,visemes,normalize};
})();