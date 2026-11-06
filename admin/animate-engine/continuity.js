/* NEXORA ANIMATE — character bible and continuity validation. */
(()=>{"use strict";
const KEY="nexora.animate.characters.v1";
const fields=["name","visualStyle","face","eyes","hair","body","palette","outfit","accessories","voiceId","voiceProfile","signatureTraits"];
const clean=v=>String(v??"").trim();
const normalize=p=>({id:p.id||("char_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)),version:1,name:clean(p.name)||"Personaje nuevo",visualStyle:clean(p.visualStyle)||"anime 2D",face:clean(p.face),eyes:clean(p.eyes),hair:clean(p.hair),body:clean(p.body),palette:clean(p.palette),outfit:clean(p.outfit),accessories:clean(p.accessories),voiceId:clean(p.voiceId),voiceProfile:clean(p.voiceProfile),signatureTraits:clean(p.signatureTraits),referenceAssets:Array.isArray(p.referenceAssets)?p.referenceAssets:[],createdAt:p.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
class ContinuityManager{
 constructor(storage=localStorage){this.storage=storage;this.characters=this.load()}
 load(){try{const x=JSON.parse(this.storage.getItem(KEY)||"[]");return Array.isArray(x)?x.map(normalize):[]}catch{return[]}}
 persist(){this.storage.setItem(KEY,JSON.stringify(this.characters));return this.characters}
 list(){return this.characters.map(x=>({...x}))}
 get(id){const x=this.characters.find(c=>c.id===id);return x?{...x}:null}
 create(data){const p=normalize(data);if(this.characters.some(x=>x.name.toLowerCase()===p.name.toLowerCase()))throw new Error("Ya existe un personaje con ese nombre");this.characters.push(p);this.persist();return p}
 update(id,patch){const i=this.characters.findIndex(x=>x.id===id);if(i<0)throw new Error("Personaje no encontrado");const next=normalize({...this.characters[i],...patch,id,createdAt:this.characters[i].createdAt});this.characters[i]=next;this.persist();return next}
 remove(id){this.characters=this.characters.filter(x=>x.id!==id);this.persist()}
 exportJSON(){return JSON.stringify({format:"nexora-character-bible",version:1,characters:this.characters},null,2)}
 importJSON(raw){const data=typeof raw==="string"?JSON.parse(raw):raw;if(data.format!=="nexora-character-bible"||!Array.isArray(data.characters))throw new Error("Archivo de continuidad no válido");for(const item of data.characters){const p=normalize(item);const i=this.characters.findIndex(x=>x.id===p.id);if(i>=0)this.characters[i]=p;else this.characters.push(p)}this.persist();return this.list()}
 validate(id,shot={}){const base=this.get(id);if(!base)throw new Error("Personaje no encontrado");const checks=[];for(const field of fields){if(shot[field]!==undefined&&clean(shot[field])!==clean(base[field]))checks.push({field,expected:base[field],actual:shot[field],severity:["name","face","eyes","hair","body","palette","outfit"].includes(field)?"high":"medium"})}return{characterId:id,consistent:checks.length===0,issues:checks,score:Math.round(100-checks.reduce((n,x)=>n+(x.severity==="high"?15:5),0))}}
}
window.NexoraContinuity={ContinuityManager,fields,storageKey:KEY};
})();