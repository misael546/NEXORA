import {mkdirSync,readFileSync,writeFileSync} from "node:fs";

const endpoint=process.env.WALLPAPER_INGEST_URL;
const token=process.env.WALLPAPER_INGEST_TOKEN;
const accessClientId=process.env.WALLPAPER_ACCESS_CLIENT_ID;
const accessClientSecret=process.env.WALLPAPER_ACCESS_CLIENT_SECRET;
if(!endpoint||!token)throw new Error("Faltan los secretos WALLPAPER_INGEST_URL o WALLPAPER_INGEST_TOKEN.");
if(Boolean(accessClientId)!==Boolean(accessClientSecret))throw new Error("Configura ambos secretos de Cloudflare Access.");

const topics=[
 ["nature-forests","forest nature landscape photography","naturaleza"],
 ["flowers-botanical","flowers botanical macro photography","naturaleza"],
 ["mountains","mountain landscape scenery lake","paisajes"],
 ["oceans-waterfalls","ocean beach waterfall coastline","paisajes"],
 ["wildlife","wildlife birds mammals animal photography","animales"],
 ["pets","cats dogs pets animal portrait photography","animales"],
 ["space","galaxy nebula planets astronomy","espacio"],
 ["anime","anime manga character illustration drawing","anime"],
 ["gaming","video game digital art pixel art game scenery","gaming"],
 ["cars","cars automotive motorcycles racing photography","autos"],
 ["architecture","architecture buildings interior design","arquitectura"],
 ["technology","technology computer circuit cyberpunk","tecnologia"],
 ["abstract","abstract texture geometric digital art","abstracto"],
 ["minimal","minimal minimalist geometric pattern","minimalista"],
 ["cities","city skyline street night photography","ciudades"],
 ["illustration","digital illustration fantasy concept art","arte"]
].map(([key,query,category])=>({key,query,category}));

const statePath=".github/data/wallpaper-import-state.json";
let cursors={};
try{cursors=JSON.parse(readFileSync(statePath,"utf8"));}catch{cursors={};}
const pagesPerTopic=Math.max(1,Math.min(20,Number(process.env.WALLPAPER_PAGES_PER_TOPIC||8)));
const pageSize=50;
const clean=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().slice(0,500);
const batch=[];
const seen=new Set();

for(const topic of topics){
 let offset=Math.max(0,Number(cursors[topic.key]||0));
 let accepted=0,scanned=0;
 for(let pageNo=0;pageNo<pagesPerTopic;pageNo++){
  const params=new URLSearchParams({
   action:"query",format:"json",generator:"search",gsrsearch:topic.query,gsrnamespace:"6",
   gsrlimit:String(pageSize),gsroffset:String(offset),prop:"imageinfo",
   iiprop:"url|size|extmetadata",iiurlwidth:"1600"
  });
  const response=await fetch("https://commons.wikimedia.org/w/api.php?"+params.toString(),{
   headers:{"User-Agent":"NEXORA-WallpaperBot/2.0 (open-license wallpaper discovery)"}
  });
  if(!response.ok)throw new Error("Wikimedia falló en '"+topic.key+"': HTTP "+response.status);
  const data=await response.json();
  if(data.errors?.length)throw new Error("Wikimedia API: "+JSON.stringify(data.errors));
  const pages=Object.values(data.query?.pages||{});
  scanned+=pages.length;
  for(const page of pages){
   const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
   if(!info?.url||!info?.thumburl||!String(info.url).startsWith("https://upload.wikimedia.org/"))continue;
   const width=Number(info.width||0),height=Number(info.height||0);
   const minSide=Math.min(width,height),maxSide=Math.max(width,height),ratio=width/height;
   if(minSide<700||maxSide<1000||ratio<0.42||ratio>2.45)continue;
   const license=clean(meta.LicenseShortName?.value||meta.License?.value||"");
   if(!license)continue;
   const id="commons-"+page.pageid;
   if(seen.has(id))continue;
   seen.add(id);
   const title=clean(page.title).replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").slice(0,180);
   const source=String(info.descriptionurl||"");
   if(!source.startsWith("https://commons.wikimedia.org/"))continue;
   batch.push({
    id,title,category:topic.category,tags:clean(meta.ImageDescription?.value||page.title),
    thumb_url:info.thumburl,image_url:info.url,source_url:source,
    author:clean(meta.Artist?.value||"Comunidad").slice(0,120),
    license:license.slice(0,80),width,height
   });
   accepted++;
  }
  const nextOffset=Number(data.continue?.gsroffset);
  if(Number.isFinite(nextOffset)&&nextOffset>offset){offset=nextOffset;}
  else{offset=0;break;}
  await new Promise(resolve=>setTimeout(resolve,120));
 }
 cursors[topic.key]=offset;
 console.log("Wikimedia:",topic.key,"—",scanned,"archivos examinados;",accepted,"fondos aptos; próximo offset:",offset);
}

const unique=batch;
if(!unique.length)throw new Error("No se encontraron nuevos fondos aptos en esta tanda; no se enviará un lote vacío.");
let totalInserted=0,totalReceived=0;
for(let i=0;i<unique.length;i+=200){
 const headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"};
 if(accessClientId&&accessClientSecret){
  headers["CF-Access-Client-Id"]=accessClientId;
  headers["CF-Access-Client-Secret"]=accessClientSecret;
 }
 const response=await fetch(endpoint,{
  method:"POST",headers,body:JSON.stringify({wallpapers:unique.slice(i,i+200)})
 });
 const responseText=await response.text();
 if(!response.ok)throw new Error("NEXORA API HTTP "+response.status+": "+responseText.slice(0,300));
 let result;
 try{result=JSON.parse(responseText);}catch{
  throw new Error("NEXORA respondió contenido no JSON. Comprueba la política Service Auth de Cloudflare Access.");
 }
 totalInserted+=Number(result.inserted||0);
 totalReceived+=Number(result.received||0);
 console.log("Lote guardado:",JSON.stringify(result));
}

mkdirSync(".github/data",{recursive:true});
writeFileSync(statePath,JSON.stringify(cursors,null,2)+"\n");
console.log("Importación completa:",unique.length,"archivos enviados;",totalReceived,"recibidos por NEXORA;",totalInserted,"nuevos registros guardados.");
console.log("Objetivo de catálogo: 100000 wallpapers. Esta ejecución es una tanda incremental.");
