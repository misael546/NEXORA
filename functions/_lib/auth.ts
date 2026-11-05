export interface Env { DB: D1Database; AI?: { run(model:string,input:Record<string,unknown>,options?:{returnRawResponse?:boolean}):Promise<Response|ReadableStream<Uint8Array>> }; ACCESS_TEAM_DOMAIN: string; ACCESS_AUD: string; ADMIN_EMAIL: string }
type Claims={iss?:string;aud?:string|string[];exp?:number;email?:string};
const b64=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
export async function requireAdmin(request:Request,env:Env):Promise<Response|null>{
  const token=request.headers.get("CF-Access-Jwt-Assertion");
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.ADMIN_EMAIL)return new Response("No autorizado",{status:401});
  try{
    const parts=token.split(".");if(parts.length!==3)throw new Error("jwt");
    const header=JSON.parse(new TextDecoder().decode(b64(parts[0])));
    if(header.alg!=="RS256")throw new Error("algorithm");
    const claims:Claims=JSON.parse(new TextDecoder().decode(b64(parts[1])));
    const issuer=env.ACCESS_TEAM_DOMAIN.replace(/\/$/,"");
    if(claims.iss!==issuer||!claims.exp||claims.exp*1000<Date.now())throw new Error("claims");
    const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(!aud.includes(env.ACCESS_AUD))throw new Error("audience");
    if((claims.email||"").toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())throw new Error("email");
    const jwks=await fetch(issuer+"/cdn-cgi/access/certs");
    if(!jwks.ok)throw new Error("jwks");
    const keys=(await jwks.json() as {keys:Array<JsonWebKey & {kid?:string}>}).keys;
    const jwk=keys.find(k=>k.kid===header.kid);if(!jwk)throw new Error("key");
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
    if(!valid)throw new Error("signature");
    return null;
  }catch{return new Response("Acceso denegado",{status:403});}
}
