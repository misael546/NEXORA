import {json} from "../../_lib/http";
interface Env { DB?: D1Database; WALLPAPER_INGEST_TOKEN?: string }
export const onRequest:PagesFunction<Env>=async({request,env})=>{
 if(request.method!=="POST")return json({error:"Método no permitido"},405);
 const expected=env.WALLPAPER_INGEST_TOKEN,auth=request.headers.get("Authorization")||"";
 if(!expected||auth!=="Bearer "+expected)return json({error:"No autorizado"},401);
 if(!env.DB)return json({error:"La base D1 no está conectada."},503);
 let body:any;try{body=await request.json()}catch{return json({error:"JSON inválido"},400)}
 if(!Array.isArray(body.wallpapers)||body.wallpapers.length>250)return json({error:"Lote no válido (máximo 250)."},400);
 const allowed=new Set(["naturaleza","paisajes","animales","espacio","anime","gaming","autos","arquitectura","tecnologia","ciudades","arte","minimalista","abstracto"]);
 const statements=[];
 for(const w of body.wallpapers){
  const id=String(w.id||"").slice(0,100),title=String(w.title||"").trim().slice(0,180),image=String(w.image_url||""),thumb=String(w.thumb_url||""),source=String(w.source_url||"");
  if(!id||!title||!image.startsWith("https://upload.wikimedia.org/")||!thumb.startsWith("https://upload.wikimedia.org/")||!source.startsWith("https://commons.wikimedia.org/"))continue;
  const category=allowed.has(w.category)?w.category:"naturaleza";
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO wallpapers(id,title,category,tags,thumb_url,image_url,source_url,source_name,author,license,width,height,downloads,status,created_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,'published',?,?)").bind(id,title,category,String(w.tags||"").slice(0,500),thumb,image,source,"Wikimedia Commons",String(w.author||"Comunidad").slice(0,120),String(w.license||"Ver licencia").slice(0,80),Math.max(0,Number(w.width)||0),Math.max(0,Number(w.height)||0),new Date().toISOString(),new Date().toISOString()));
 }
 if(!statements.length)return json({inserted:0,received:body.wallpapers.length});
 const result=await env.DB.batch(statements);const inserted=result.reduce((n:any,r:any)=>n+Number(r.meta?.changes||0),0);
 return json({inserted,received:body.wallpapers.length});
};