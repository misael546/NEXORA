const endpoint=process.env.WALLPAPER_INGEST_URL;
const token=process.env.WALLPAPER_INGEST_TOKEN;
if(!endpoint||!token){throw new Error("Faltan los secretos WALLPAPER_INGEST_URL o WALLPAPER_INGEST_TOKEN.");}
const topics=[
 ["nature wallpaper","naturaleza"],["mountain landscape wallpaper","paisajes"],["space galaxy wallpaper","espacio"],["anime illustration wallpaper","anime"],["gaming digital art wallpaper","gaming"],["minimal abstract wallpaper","minimalista"],["abstract art wallpaper","abstracto"],["architecture wallpaper","arquitectura"]
];
const clean=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,180);
const batch=[];
for(const [query,category] of topics){
 const api=new URL("https://commons.wikimedia.org/w/api.php");
 api.search=new URLSearchParams({
  action:"query",format:"json",generator:"search",gsrsearch:query,gsrnamespace:"6",
  gsrlimit:"30",prop:"imageinfo",iiprop:"url|size|extmetadata",iiurlwidth:"1600"
 }).toString();
 const response=await fetch(api,{headers:{"User-Agent":"NEXORA-WallpaperBot/1.1 (weekly wallpaper discovery)"}});
 if(!response.ok)throw new Error("Commons search failed for '"+query+"': HTTP "+response.status);
 const data=await response.json();
 if(data.errors?.length)throw new Error("Commons API error for '"+query+"': "+JSON.stringify(data.errors));
 const pages=Object.values(data.query?.pages||{});
 let accepted=0;
 for(const page of pages){
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
  if(!info?.url||!info?.thumburl||!String(info.url).startsWith("https://upload.wikimedia.org/"))continue;
  const width=Number(info.width||0),height=Number(info.height||0);
  if(width<1000||height<700)continue;
  const title=clean(page.title).replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  batch.push({id:"commons-"+page.pageid,title,category,tags:clean(meta.ImageDescription?.value||page.title),thumb_url:info.thumburl,image_url:info.url,source_url:info.descriptionurl,author:clean(meta.Artist?.value||"Comunidad"),license:clean(meta.LicenseShortName?.value||"Ver licencia"),width,height});
  accepted++;
 }
 console.log("Commons:",query,"—",pages.length,"resultados; ",accepted,"fondos aptos.");
}
const unique=[...new Map(batch.map(x=>[x.id,x])).values()];
if(!unique.length)throw new Error("Wikimedia no devolvió fondos aptos. No se enviará un lote vacío.");
let totalInserted=0;
for(let i=0;i<unique.length;i+=200){
 const response=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({wallpapers:unique.slice(i,i+200)})});
 if(!response.ok)throw new Error("NEXORA import API returned "+response.status+": "+(await response.text()).slice(0,300));
 const result=await response.json();
 totalInserted+=Number(result.inserted||0);
 console.log("Lote importado:",JSON.stringify(result));
}
console.log("Importación semanal terminada:",unique.length,"fondos únicos revisados;",totalInserted,"nuevos registros insertados.");
