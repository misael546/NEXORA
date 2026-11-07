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
 ["gaming-pixel","pixel art landscape retro game art","gaming"],
 ["gaming-concept","video game concept art game environment","gaming"],
 ["cars","cars automotive motorcycles racing photography","autos"],
 ["cars-classic","classic car automobile photography","autos"],
 ["cars-sports","sports cars supercars motorsport","autos"],
 ["architecture","architecture buildings interior design","arquitectura"],
 ["technology","technology computer circuit cyberpunk","tecnologia"],
 ["technology-hardware","computer hardware motherboard electronics","tecnologia"],
 ["technology-circuits","circuit board electronic components","tecnologia"],
 ["abstract","abstract texture geometric digital art","abstracto"],
 ["minimal","minimal minimalist geometric pattern","minimalista"],
 ["minimal-photo","minimalist photography simple composition","minimalista"],
 ["minimal-shapes","geometric shapes minimal art","minimalista"],
 ["cities","city skyline street night photography","ciudades"],
 ["city-urban","urban city buildings street photography","ciudades"],
 ["illustration","digital illustration fantasy concept art","arte"],
 ["illustration-drawing","illustration digital painting fantasy art","arte"],
 ["anime-art","anime manga art drawing","anime"],
 ["anime-illustration","manga illustration character drawing","anime"],
 ["animals-birds","bird wildlife photography","animales"]
].map(([key,query,category])=>({key,query,category}));

const statePath=".github/data/wallpaper-import-state.json";
let cursors={};
try{cursors=JSON.parse(readFileSync(statePath,"utf8"));}catch{cursors={};}
const pagesPerTopic=Math.max(1,Math.min(12,Number(process.env.WALLPAPER_PAGES_PER_TOPIC||4)));
const pageSize=50;
const clean=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().slice(0,500);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastRequestAt=0;
const seen=new Set();
let totalScanned=0,totalCandidates=0,totalInserted=0,totalReceived=0;

async function fetchCommons(url,topic){
 const minimumWait=Math.max(0,1100-(Date.now()-lastRequestAt));
 if(minimumWait)await pause(minimumWait);
 for(let attempt=1;attempt<=4;attempt++){
  lastRequestAt=Date.now();
  const response=await fetch(url,{headers:{"User-Agent":"NEXORA-WallpaperBot/2.1 (contact: https://nexora-ey8.pages.dev/)"}});
  if(response.ok)return response;
  if(response.status!==429&&response.status!==503)throw new Error("Wikimedia falló en '"+topic+"': HTTP "+response.status+" "+(await response.text()).slice(0,180));
  if(attempt===4)throw new Error("Wikimedia mantiene límite de velocidad para '"+topic+"' después de 4 intentos. Se guardará el progreso anterior.");
  const retryAfter=Number(response.headers.get("retry-after")||0)*1000;
  const wait=Math.max(retryAfter,15000*attempt);
  console.warn("Wikimedia limitó la consulta",topic,"(HTTP",response.status+"). Pausa",Math.round(wait/1000),"s.");
  await pause(wait);
 }
 throw new Error("No se pudo completar la consulta de Wikimedia para "+topic);
}

async function sendBatch(wallpapers){
 let inserted=0,received=0;
 for(let i=0;i<wallpapers.length;i+=200){
  const headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"};
  if(accessClientId&&accessClientSecret){
   headers["CF-Access-Client-Id"]=accessClientId;
   headers["CF-Access-Client-Secret"]=accessClientSecret;
  }
  const response=await fetch(endpoint,{
   method:"POST",headers,body:JSON.stringify({wallpapers:wallpapers.slice(i,i+200)})
  });
  const responseText=await response.text();
  if(!response.ok)throw new Error("NEXORA API HTTP "+response.status+": "+responseText.slice(0,300));
  let result;
  try{result=JSON.parse(responseText);}catch{
   throw new Error("NEXORA respondió contenido no JSON. Comprueba la política Service Auth de Cloudflare Access.");
  }
  inserted+=Number(result.inserted||0);
  received+=Number(result.received||0);
  console.log("Lote guardado:",JSON.stringify(result));
 }
 return{inserted,received};
}

function saveState(){
 mkdirSync(".github/data",{recursive:true});
 writeFileSync(statePath,JSON.stringify(cursors,null,2)+"\n");
}

for(const topic of topics){
 let offset=Math.max(0,Number(cursors[topic.key]||0));
 let accepted=0,scanned=0;
 const topicBatch=[];
 for(let pageNo=0;pageNo<pagesPerTopic;pageNo++){
  const params=new URLSearchParams({
   action:"query",format:"json",generator:"search",gsrsearch:topic.query,gsrnamespace:"6",
   gsrlimit:String(pageSize),gsroffset:String(offset),maxlag:"5",prop:"imageinfo",
   iiprop:"url|size|extmetadata",iiurlwidth:"1600"
  });
  const response=await fetchCommons("https://commons.wikimedia.org/w/api.php?"+params.toString(),topic.key);
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
   topicBatch.push({
    id,title,category:topic.category,tags:clean(meta.ImageDescription?.value||page.title),
    thumb_url:info.thumburl,image_url:info.url,source_url:source,
    author:clean(meta.Artist?.value||"Comunidad").slice(0,120),
    license:license.slice(0,80),width,height
   });
   accepted++;
  }
  const nextOffset=Number(data.continue?.gsroffset);
  if(Number.isFinite(nextOffset)&&nextOffset>offset)offset=nextOffset;
  else{offset=0;break;}
 }
 totalScanned+=scanned;
 totalCandidates+=topicBatch.length;
 if(topicBatch.length){
  const saved=await sendBatch(topicBatch);
  totalInserted+=saved.inserted;
  totalReceived+=saved.received;
 }
 cursors[topic.key]=offset;
 saveState();
 console.log("Wikimedia:",topic.key,"—",scanned,"archivos examinados;",accepted,"fondos aptos;",topicBatch.length,"enviados; offset siguiente:",offset);
}


const openverseTopics=[
 ["nature","nature forest flowers photography","naturaleza"],
 ["landscapes","mountain ocean waterfall landscape","paisajes"],
 ["wildlife","wildlife animal bird photography","animales"],
 ["pets","cats dogs pets photography","animales"],
 ["space","galaxy nebula astronomy space","espacio"],
 ["anime","anime manga illustration","anime"],
 ["gaming","video game pixel art game environment","gaming"],
 ["cars","automobile sports car motorcycle","autos"],
 ["architecture","modern architecture interior buildings","arquitectura"],
 ["technology","computer technology circuit electronics","tecnologia"],
 ["cities","city skyline urban night photography","ciudades"],
 ["digital-art","fantasy digital illustration concept art","arte"],
 ["abstract","abstract art texture geometric","abstracto"],
 ["minimal","minimalist geometric simple composition","minimalista"],
 ["flowers","flower botanical macro photography","naturaleza"],
 ["travel","travel scenic road mountains coast","paisajes"],
 ["ocean","ocean sea marine coast photography","paisajes"]
];
const openversePages=Math.max(1,Math.min(8,Number(process.env.OPENVERSE_PAGES_PER_TOPIC||2)));
let openverseScanned=0,openverseCandidates=0,openverseInserted=0,openverseReceived=0;
const acceptedLicenses=new Set(["cc0","pdm","by","by-sa"]);

for(const [key,query,category] of openverseTopics){
 const stateKey="openverse:"+key;
 let page=Math.max(1,Number(cursors[stateKey]||1));
 let accepted=0,scanned=0;
 const topicBatch=[];
 for(let pageNo=0;pageNo<openversePages;pageNo++){
  const params=new URLSearchParams({
   q:query,page:String(page),page_size:"20",
   license:"cc0,pdm,by,by-sa",filter_dead:"true",mature:"false"
  });
  const response=await fetchCommons("https://api.openverse.org/v1/images/?"+params.toString(),"Openverse "+key);
  const data=await response.json();
  if(!Array.isArray(data.results))throw new Error("Openverse devolvió una respuesta inesperada para '"+key+"'.");
  const pageCount=Math.max(1,Number(data.page_count||1));
  scanned+=data.results.length;
  for(const item of data.results){
   const width=Number(item.width||0),height=Number(item.height||0);
   const minSide=Math.min(width,height),maxSide=Math.max(width,height),ratio=width/height;
   if(!item.id||!item.url||!item.thumbnail||!item.foreign_landing_url)continue;
   if(!String(item.url).startsWith("https://")||!String(item.thumbnail).startsWith("https://")||!String(item.foreign_landing_url).startsWith("https://"))continue;
   if(minSide<700||maxSide<1000||ratio<0.42||ratio>2.45)continue;
   const license=String(item.license||"").toLowerCase();
   if(!acceptedLicenses.has(license))continue;
   const id="openverse-"+item.id;
   if(seen.has(id))continue;
   seen.add(id);
   const title=clean(item.title||"Wallpaper Openverse").slice(0,180);
   const tags=Array.isArray(item.tags)?item.tags.map(tag=>tag?.name).filter(Boolean).join(", "):"";
   const provider=clean(item.provider||item.source||"Openverse").slice(0,70);
   topicBatch.push({
    id,title,category,tags:clean(tags||title),thumb_url:item.thumbnail,
    image_url:item.url,source_url:item.foreign_landing_url,
    source_name:"Openverse · "+provider,
    author:clean(item.creator||"Autor no indicado").slice(0,120),
    license:(license.toUpperCase()+(item.license_version?" "+item.license_version:"")).slice(0,80),
    width,height
   });
   accepted++;
  }
  if(page>=pageCount){page=1;break;}
  page++;
 }
 openverseScanned+=scanned;
 openverseCandidates+=topicBatch.length;
 if(topicBatch.length){
  const saved=await sendBatch(topicBatch);
  openverseInserted+=saved.inserted;
  openverseReceived+=saved.received;
 }
 cursors[stateKey]=page;
 saveState();
 console.log("Openverse:",key,"—",scanned,"resultados;",accepted,"fondos aptos;",topicBatch.length,"enviados; página siguiente:",page);
}

console.log("Wikimedia:",totalScanned,"archivos examinados;",totalCandidates,"candidatos;",totalInserted,"nuevos registros.");
console.log("Openverse:",openverseScanned,"resultados examinados;",openverseCandidates,"candidatos;",openverseInserted,"nuevos registros.");
console.log("Total de esta ejecución:",totalInserted+openverseInserted,"nuevos fondos guardados en NEXORA.");
console.log("Objetivo del catálogo: 100000 wallpapers. Esta ejecución es una tanda incremental.");
