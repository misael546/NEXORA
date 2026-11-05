import {requireAdmin,Env} from "../../_lib/auth";
import {json,slugify,clean} from "../../_lib/http";
export const onRequest:PagesFunction<Env>=async({request,env})=>{
 const denied=await requireAdmin(request,env);if(denied)return denied;\n if(!env.DB)return json({error:"La base de datos D1 todavía no está conectada."},503);
 if(request.method==="GET"){
  const {results}=await env.DB.prepare("SELECT id,title,slug,category,excerpt,status,created_at,updated_at,published_at FROM articles ORDER BY updated_at DESC").all();
  return json({articles:results});
 }
 if(request.method==="POST"){
  let input:any;try{input=await request.json()}catch{return json({error:"JSON inválido"},400)}
  const title=clean(input.title,140),category=clean(input.category,40),excerpt=clean(input.excerpt,280),content=clean(input.content,30000);
  const slug=slugify(clean(input.slug,100)||title);
  if(!title||!slug||!category||!content)return json({error:"Completa título, categoría y contenido."},400);
  const status=input.status==="published"?"published":"draft";
  try{
   const id=crypto.randomUUID();
   await env.DB.prepare("INSERT INTO articles(id,title,slug,category,excerpt,content,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,title,slug,category,excerpt,content,status,new Date().toISOString(),new Date().toISOString(),status==="published"?new Date().toISOString():null).run();
   return json({id,slug},201);
  }catch{return json({error:"No se pudo guardar. Comprueba que el slug no esté repetido."},409)}
 }
 return json({error:"Método no permitido"},405);
};
