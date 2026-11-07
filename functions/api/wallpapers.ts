import {json} from "../_lib/http";

interface Env { DB?: D1Database }

const allowed=new Set([
 "naturaleza","paisajes","animales","espacio","anime","gaming","autos",
 "arquitectura","tecnologia","ciudades","arte","minimalista","abstracto"
]);

const categoryFor=(value:string)=>{
 const t=value.toLowerCase();
 if(/space|galaxy|planet|nebula|universe|astronomy|constellation/.test(t))return"espacio";
 if(/anime|manga|character art|japanese animation/.test(t))return"anime";
 if(/game|gaming|pixel art|video game/.test(t))return"gaming";
 if(/car|automobile|motorcycle|racing|vehicle/.test(t))return"autos";
 if(/computer|technology|circuit|motherboard|cyberpunk|robot/.test(t))return"tecnologia";
 if(/city|skyline|street photography|urban/.test(t))return"ciudades";
 if(/architecture|building|interior design/.test(t))return"arquitectura";
 if(/animal|wildlife|bird|mammal|pet|cat photography|dog photography/.test(t))return"animales";
 if(/minimal|simple|geometric pattern/.test(t))return"minimalista";
 if(/abstract|texture|gradient/.test(t))return"abstracto";
 if(/illustration|fantasy|concept art|digital painting/.test(t))return"arte";
 if(/mountain|landscape|ocean|beach|sunset|lake|waterfall/.test(t))return"paisajes";
 return"naturaleza";
};

async function liveSearch(q:string,category:string,device:string){
 const terms:Record<string,string>={
  naturaleza:"forest nature flowers",paisajes:"mountain ocean landscape",
  animales:"wildlife animal bird photography",espacio:"galaxy space nebula",
  anime:"anime manga illustration",gaming:"video game digital art pixel",
  autos:"cars automotive motorcycle",arquitectura:"architecture buildings interior",
  tecnologia:"technology computer circuit cyberpunk",ciudades:"city skyline urban night",
  arte:"fantasy illustration concept art",minimalista:"minimal geometric pattern",
  abstracto:"abstract art texture gradient"
 };
 const term=(q?(q+" wallpaper"):(terms[category]||"wallpaper")).slice(0,100);
 const url=new URL("https://commons.wikimedia.org/w/api.php");
 url.search=new URLSearchParams({
  action:"query",format:"json",generator:"search",gsrsearch:term,gsrnamespace:"6",
  gsrlimit:"50",prop:"imageinfo",iiprop:"url|size|extmetadata",iiurlwidth:"1200",origin:"*"
 }).toString();
 const res=await fetch(url.toString(),{
  headers:{"User-Agent":"NEXORA-Wallpaper/2.0 (public wallpaper discovery)"}
 });
 if(!res.ok)return{wallpapers:[],total:0,has_more:false};
 const data:any=await res.json();
 const pages=Object.values(data.query?.pages||{}) as any[];
 const wallpapers=pages.map(p=>{
  const info=p.imageinfo?.[0],meta=info?.extmetadata||{};
  if(!info?.thumburl||!info?.url)return null;
  const width=Number(info.width||0),height=Number(info.height||0);
  if(Math.min(width,height)<700||Math.max(width,height)<1000)return null;
  if(device==="desktop"&&height>width)return null;
  if(device==="mobile"&&width>=height)return null;
  const title=String(p.title||"Wallpaper").replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  return{
   id:"commons-"+p.pageid,title,category:categoryFor(title+" "+(meta.ImageDescription?.value||"")),
   thumb_url:info.thumburl,image_url:info.url,source_url:info.descriptionurl,
   source_name:"Wikimedia Commons",
   author:String(meta.Artist?.value||"Comunidad").replace(/<[^>]*>/g,"").slice(0,100),
   license:String(meta.LicenseShortName?.value||"Ver licencia").replace(/<[^>]*>/g,"").slice(0,80),
   width,height
  };
 }).filter(Boolean);
 const filtered=category?wallpapers.filter((w:any)=>w.category===category):wallpapers;
 return{wallpapers:filtered,total:filtered.length,has_more:false,source:"Wikimedia Commons"};
}

export const onRequest:PagesFunction<Env>=async({request,env})=>{
 if(request.method!=="GET")return json({error:"Método no permitido"},405);
 const u=new URL(request.url);
 const q=(u.searchParams.get("q")||"").trim().slice(0,100);
 const category=(u.searchParams.get("category")||"").trim().toLowerCase();
 const device=u.searchParams.get("device")||"all";
 const sort=u.searchParams.get("sort")||"newest";
 const page=Math.max(1,Math.min(10000,Number(u.searchParams.get("page")||1)));
 const limit=Math.max(1,Math.min(48,Number(u.searchParams.get("limit")||24)));
 if(!["all","desktop","mobile"].includes(device))return json({error:"Formato no válido"},400);
 if(!env.DB)return json(await liveSearch(q,category,device));
 try{
  const clauses=["status='published'"],values:any[]=[];
  if(q){
   clauses.push("(title LIKE ? OR tags LIKE ? OR author LIKE ?)");
   const like="%"+q.replace(/[\\%_]/g,"\\$&")+"%";
   values.push(like,like,like);
  }
  if(category&&allowed.has(category)){clauses.push("category=?");values.push(category);}
  if(device==="desktop")clauses.push("width>=height");
  if(device==="mobile")clauses.push("height>width");
  const where=clauses.join(" AND ");
  const countRow:any=await env.DB.prepare("SELECT COUNT(*) AS total FROM wallpapers WHERE "+where).bind(...values).first();
  const order=sort==="title"?"title COLLATE NOCASE ASC":sort==="popular"?"downloads DESC,published_at DESC":"published_at DESC";
  const {results}=await env.DB.prepare(
   "SELECT id,title,category,tags,thumb_url,image_url,source_url,source_name,author,license,width,height,downloads FROM wallpapers WHERE "+where+" ORDER BY "+order+" LIMIT ? OFFSET ?"
  ).bind(...values,limit,(page-1)*limit).all();
  const total=Number(countRow?.total||0);
  return json({wallpapers:results,total,page,limit,has_more:page*limit<total});
 }catch(error){
  console.warn("Wallpaper database unavailable; using live Commons discovery.",error);
  const live=await liveSearch(q,category,device);
  return json({...live,notice:"Catálogo persistente pendiente de inicialización."});
 }
};
