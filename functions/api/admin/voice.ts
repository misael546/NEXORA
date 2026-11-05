import {requireAdmin,Env} from "../../_lib/auth";
export const onRequest:PagesFunction<Env>=async({request,env})=>{
 const denied=await requireAdmin(request,env);if(denied)return denied;
 if(request.method!=="POST")return new Response("Método no permitido",{status:405});
 if(!env.AI)return Response.json({error:"Falta conectar Workers AI en Cloudflare Pages. Añade el binding AI al proyecto nexora."},{status:503});
 let input:any;try{input=await request.json()}catch{return Response.json({error:"Solicitud JSON inválida."},{status:400})}
 const text=typeof input.text==="string"?input.text.trim():"";
 const allowed=["sirio","nestor","alvaro","javier","aquila"];
 const speaker=allowed.includes(input.speaker)?input.speaker:"sirio";
 if(!text)return Response.json({error:"Escribe un texto para generar el audio."},{status:400});
 if(text.length>3000)return Response.json({error:"El límite es de 3,000 caracteres por MP3 para cuidar la cuota gratuita."},{status:413});
 try{
  const body=await env.AI.run("@cf/deepgram/aura-2-es",{text,speaker,encoding:"mp3"});
  if(!body)return Response.json({error:"El servicio no devolvió audio."},{status:502});
  return new Response(body,{headers:{"Content-Type":"audio/mpeg","Content-Disposition":'inline; filename="nexora-voz.mp3"',"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch(error){
  console.error("NEXORA VOICE generation failed:",error);
  return Response.json({error:"No se pudo generar el MP3. Comprueba la cuota de Workers AI e inténtalo más tarde."},{status:502});
 }
};
