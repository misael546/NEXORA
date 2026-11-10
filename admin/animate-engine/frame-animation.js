/* NEXORA ANIMATE — frame-by-frame project model. Artwork is stored as independent images; no rigs or joint transforms. */
(()=>{"use strict";
const VERSION=1;
const REQUIRED_REVIEW=["silhouette","face","palette","costume","proportions"];
const text=(v,max=500)=>String(v??"").trim().slice(0,max);
const id=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"frame_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9);
const positiveInt=(v,fallback,min,max)=>{const n=Math.floor(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
class FrameProject{
 constructor(data={}){
  this.data={format:"nexora-frame-project",version:VERSION,id:text(data.id,100)||id(),title:text(data.title,120)||"Nuevo proyecto",width:positiveInt(data.width,1920,64,4096),height:positiveInt(data.height,1080,64,4096),fps:positiveInt(data.fps,12,1,60),design:{name:"",description:"",silhouette:"",palette:"",proportions:"",face:"",costume:"",traits:"",referenceAssetIds:[],review:{silhouette:false,face:false,palette:false,costume:false,proportions:false},approved:false,approvedAt:null,revision:1,...(data.design||{})},frames:Array.isArray(data.frames)?data.frames.map(f=>({...f})):[],createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  this.data.design.referenceAssetIds=Array.isArray(this.data.design.referenceAssetIds)?[...new Set(this.data.design.referenceAssetIds.map(x=>text(x,120)).filter(Boolean))]:[];
  this.data.design.review={...Object.fromEntries(REQUIRED_REVIEW.map(k=>[k,false])),...(this.data.design.review||{})};
  this.data.design.approved=Boolean(this.data.design.approved);
  this.data.frames=this.data.frames.filter(f=>f&&typeof f.assetId==="string"&&f.assetId.trim()).map(f=>({id:text(f.id,100)||id(),assetId:text(f.assetId,120),label:text(f.label,100)||"Fotograma",durationFrames:positiveInt(f.durationFrames,1,1,1200),notes:text(f.notes,500)}));
 }
 touch(){this.data.updatedAt=new Date().toISOString();return this}
 updateDesign(patch={}){
  const d=this.data.design;
  for(const key of ["name","description","silhouette","palette","proportions","face","costume","traits"])if(key in patch)d[key]=text(patch[key],key==="description"||key==="traits"?1200:500);
  if("referenceAssetIds" in patch)d.referenceAssetIds=[...new Set((patch.referenceAssetIds||[]).map(x=>text(x,120)).filter(Boolean))];
  if("review" in patch)d.review={...d.review,...Object.fromEntries(REQUIRED_REVIEW.map(k=>[k,Boolean(patch.review?.[k])]))};
  d.approved=false;d.approvedAt=null;d.revision=positiveInt(d.revision,1,1,100000)+1;return this.touch();
 }
 approveDesign(){
  const d=this.data.design,missing=[];
  for(const key of ["name","description","silhouette","palette","proportions","face","costume","traits"])if(!text(d[key]))missing.push(key);
  if(!d.referenceAssetIds.length)missing.push("referenceAssetIds");
  for(const key of REQUIRED_REVIEW)if(!d.review[key])missing.push("review."+key);
  if(missing.length)throw new Error("El diseño todavía no está aprobado. Revisa: "+missing.join(", "));
  d.approved=true;d.approvedAt=new Date().toISOString();return this.touch();
 }
 revokeDesign(){this.data.design.approved=false;this.data.design.approvedAt=null;return this.touch()}
 addFrame({assetId,label,notes="",durationFrames=1}={}){
  if(!this.data.design.approved)throw new Error("Primero aprueba el diseño maestro del personaje.");
  const asset=text(assetId,120);if(!asset)throw new Error("Cada fotograma necesita una imagen.");
  const frame={id:id(),assetId:asset,label:text(label,100)||"Fotograma "+(this.data.frames.length+1),notes:text(notes,500),durationFrames:positiveInt(durationFrames,1,1,1200)};
  this.data.frames.push(frame);this.touch();return {...frame};
 }
 updateFrame(frameId,patch={}){
  const f=this.data.frames.find(x=>x.id===frameId);if(!f)return false;
  if("assetId" in patch){const asset=text(patch.assetId,120);if(!asset)throw new Error("La imagen del fotograma no puede estar vacía.");f.assetId=asset}
  if("label" in patch)f.label=text(patch.label,100)||f.label;
  if("notes" in patch)f.notes=text(patch.notes,500);
  if("durationFrames" in patch)f.durationFrames=positiveInt(patch.durationFrames,1,1,1200);
  this.touch();return {...f};
 }
 moveFrame(frameId,toIndex){
  const from=this.data.frames.findIndex(x=>x.id===frameId);if(from<0)return false;
  const target=positiveInt(toIndex,from,0,Math.max(0,this.data.frames.length-1));
  const [frame]=this.data.frames.splice(from,1);this.data.frames.splice(target,0,frame);this.touch();return true;
 }
 removeFrame(frameId){const n=this.data.frames.length;this.data.frames=this.data.frames.filter(x=>x.id!==frameId);if(n!==this.data.frames.length)this.touch();return n!==this.data.frames.length}
 get totalFrames(){return this.data.frames.reduce((sum,f)=>sum+f.durationFrames,0)}
 get durationSeconds(){return this.totalFrames/this.data.fps}
 frameAt(seconds,{loop=false}={}){
  if(!this.data.frames.length)return null;
  const total=this.totalFrames;if(!total)return null;
  let tick=Math.max(0,Number(seconds)||0)*this.data.fps;
  if(loop)tick=tick%total;else if(tick>=total)return {...this.data.frames[this.data.frames.length-1],index:this.data.frames.length-1,frameOffset:this.data.frames[this.data.frames.length-1].durationFrames-1};
  let cursor=0;
  for(let i=0;i<this.data.frames.length;i++){const f=this.data.frames[i];if(tick<cursor+f.durationFrames)return {...f,index:i,frameOffset:Math.floor(tick-cursor)};cursor+=f.durationFrames}
  return null;
 }
 exportJSON(){return JSON.stringify(this.data,null,2)}
 static importJSON(value){
  const parsed=typeof value==="string"?JSON.parse(value):value;
  if(!parsed||parsed.format!=="nexora-frame-project"||parsed.version!==VERSION)throw new Error("El archivo no es un proyecto fotograma por fotograma compatible.");
  return new FrameProject(parsed);
 }
}
window.NexoraFrameAnimation={FrameProject,VERSION,REQUIRED_REVIEW:[...REQUIRED_REVIEW]};
})();