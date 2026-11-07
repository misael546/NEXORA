/* NEXORA ANIMATE — multi-character 2D stage and automatic screen layout. */
(()=>{"use strict";
function layoutActors(count){
 const n=Math.max(0,Math.min(4,Math.floor(Number(count)||0)));
 if(n===0)return[];
 if(n===1)return[{x:.5,y:.52,scale:.88,flip:false}];
 if(n===2)return[{x:.34,y:.53,scale:.7,flip:false},{x:.68,y:.53,scale:.7,flip:false}];
 if(n===3)return[{x:.2,y:.55,scale:.49,flip:false},{x:.5,y:.55,scale:.49,flip:false},{x:.8,y:.55,scale:.49,flip:false}];
 return[{x:.2,y:.56,scale:.43,flip:false},{x:.4,y:.56,scale:.43,flip:false},{x:.6,y:.56,scale:.43,flip:false},{x:.8,y:.56,scale:.43,flip:false}];
}
class CharacterStage{
 constructor(drawCharacter){if(typeof drawCharacter!=="function")throw new Error("Se necesita un renderizador de personaje");this.drawCharacter=drawCharacter;this.actors=[]}
 setActors(actors=[]){if(!Array.isArray(actors)||actors.length>4)throw new Error("El escenario admite de uno a cuatro actores por toma");this.actors=actors.map((actor,index)=>{if(!actor?.rig||!actor.rig.points)throw new Error("El actor "+(index+1)+" no tiene rig 2D");return{id:String(actor.id||"actor-"+index),type:actor.type==="dinosaur"?"dinosaur":"worker",rig:actor.rig,motion:actor.motion||null,time:Number.isFinite(actor.time)?actor.time:null,action:String(actor.action||"worker-idle")}});return this.actors.length}
 clear(){this.actors=[]}
 render(ctx,width,height,time=0){if(!ctx||!this.actors.length)return 0;const layout=layoutActors(this.actors.length);this.actors.forEach((actor,index)=>{const frame=layout[index],actorTime=actor.time??time,flip=actor.type==="dinosaur"&&frame.x<.5;if(actor.motion)actor.rig.points=actor.motion.sample(actorTime);ctx.save();ctx.translate(frame.x*width,frame.y*height);ctx.scale(flip?-frame.scale:frame.scale,frame.scale);ctx.translate(-width/2,-height/2);this.drawCharacter(ctx,width,height,actor.rig,actor.type,{time:actorTime,duration:actor.motion?.duration||2,action:actor.action});ctx.restore()});return this.actors.length}
}
window.NexoraCharacterStage={CharacterStage,layoutActors};
})();