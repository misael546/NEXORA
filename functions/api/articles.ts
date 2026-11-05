import {Env} from "../_lib/auth";
import {json} from "../_lib/http";
export const onRequest:PagesFunction<Env>=async({request,env})=>{
 if(request.method!=="GET")return json({error:"Método no permitido"},405);
 const {results}=await env.DB.prepare("SELECT title,slug,category,excerpt,content,published_at FROM articles WHERE status='published' ORDER BY published_at DESC").all();
 return json({articles:results},{headers:{"cache-control":"public, max-age=60"}} as any);
};
