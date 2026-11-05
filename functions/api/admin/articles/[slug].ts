import {requireAdmin,Env} from "../../../_lib/auth";
import {json,clean} from "../../../_lib/http";
export const onRequest:PagesFunction<Env>=async({request,env,params})=>{
 const denied=await requireAdmin(request,env);if(denied)return denied;
 const slug=String(params.slug||"");
 if(request.method==="PUT"){
  let input:any;try{input=await request.json()}catch{return json({error:"JSON inválido"},400)}
  const title=clean(input.title,140),category=clean(input.category,40),excerpt=clean(input.excerpt,280),content=clean(input.content,30000),status=input.status==="published"?"published":"draft";
  if(!title||!category||!content)return json({error:"Completa título, categoría y contenido."},400);
  const now=new Date().toISOString();
  const result=await env.DB.prepare("UPDATE articles SET title=?,category=?,excerpt=?,content=?,status=?,updated_at=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE NULL END WHERE slug=?").bind(title,category,excerpt,content,status,now,status,now,slug).run();
  return result.meta.changes?json({ok:true}):json({error:"Artículo no encontrado"},404);
 }
 if(request.method==="DELETE"){
  const result=await env.DB.prepare("DELETE FROM articles WHERE slug=?").bind(slug).run();
  return result.meta.changes?json({ok:true}):json({error:"Artículo no encontrado"},404);
 }
 return json({error:"Método no permitido"},405);
};
