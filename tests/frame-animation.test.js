const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
function load(){
 const context={window:{},crypto:{randomUUID:(()=>{let n=0;return()=>"test-"+(++n)})()},Date,Math,JSON,Set,Array,Object,String,Number,Error};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(require("node:path").join(__dirname,"../admin/animate-engine/frame-animation.js"),"utf8"),context);
 return context.window.NexoraFrameAnimation;
}
function approvedProject(api){
 const p=new api.FrameProject({title:"Prueba"});
 p.updateDesign({name:"Nara",description:"Personaje de prueba",silhouette:"Cabeza grande y capa corta",palette:"Azul y coral",proportions:"Cabeza 1/3 del cuerpo",face:"Ojos grandes verdes",costume:"Chaqueta azul",traits:"Lunar bajo el ojo",referenceAssetIds:["ref-1"],review:{silhouette:true,face:true,palette:true,costume:true,proportions:true}});
 p.approveDesign();return p;
}
test("bloquea fotogramas hasta aprobar la ficha maestra",()=>{
 const api=load(),p=new api.FrameProject();
 assert.throws(()=>p.addFrame({assetId:"img-1"}),/aprueba el diseño maestro/);
});
test("la aprobación exige ficha completa, referencias y revisión visual",()=>{
 const api=load(),p=new api.FrameProject();
 assert.throws(()=>p.approveDesign(),/diseño todavía no está aprobado/);
 assert.equal(approvedProject(api).data.design.approved,true);
});
test("cada fotograma conserva su imagen y duración sin interpolar articulaciones",()=>{
 const api=load(),p=approvedProject(api);
 const a=p.addFrame({assetId:"img-a",durationFrames:3,label:"Inicio"});
 const b=p.addFrame({assetId:"img-b",durationFrames:2,label:"Paso"});
 assert.equal(p.totalFrames,5);assert.equal(p.durationSeconds,5/12);
 assert.equal(p.frameAt(0).assetId,"img-a");
 assert.equal(p.frameAt(2/12).frameOffset,2);
 assert.equal(p.frameAt(3/12).assetId,"img-b");
 assert.equal(p.frameAt(5/12).assetId,"img-b");
 assert.equal(p.frameAt(5/12,{loop:true}).assetId,"img-a");
 p.updateFrame(a.id,{durationFrames:4});
 assert.equal(p.totalFrames,6);
});
test("permite reordenar y eliminar fotogramas sin perder sus referencias",()=>{
 const api=load(),p=approvedProject(api);
 const a=p.addFrame({assetId:"a"}),b=p.addFrame({assetId:"b"}),c=p.addFrame({assetId:"c"});
 p.moveFrame(c.id,0);
 assert.deepEqual(Array.from(p.data.frames,x=>x.assetId),["c","a","b"]);
 assert.equal(p.removeFrame(a.id),true);
 assert.deepEqual(Array.from(p.data.frames,x=>x.assetId),["c","b"]);
 assert.equal(p.removeFrame("missing"),false);
});
test("editar el diseño revoca aprobación para impedir continuidad sobre una ficha cambiada",()=>{
 const api=load(),p=approvedProject(api);
 p.addFrame({assetId:"a"});
 p.updateDesign({palette:"Rojo y negro"});
 assert.equal(p.data.design.approved,false);
 assert.throws(()=>p.addFrame({assetId:"b"}),/aprueba el diseño maestro/);
});
test("importa y exporta proyectos con referencias y orden de fotogramas",()=>{
 const api=load(),p=approvedProject(api);
 p.addFrame({assetId:"ref-frame-1",durationFrames:4});
 const copy=api.FrameProject.importJSON(p.exportJSON());
 assert.equal(copy.data.design.name,"Nara");
 assert.equal(copy.data.frames[0].assetId,"ref-frame-1");
 assert.equal(copy.totalFrames,4);
 assert.throws(()=>api.FrameProject.importJSON({format:"wrong",version:1}),/no es un proyecto/);
});
