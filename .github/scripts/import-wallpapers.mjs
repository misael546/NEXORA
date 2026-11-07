const endpoint=process.env.WALLPAPER_INGEST_URL;
const token=process.env.WALLPAPER_INGEST_TOKEN;
if(!endpoint||!token){console.log("Wallpaper import skipped: configure WALLPAPER_INGEST_URL and WALLPAPER_INGEST_TOKEN.");process.exit(0);}
const topics=[
 ["nature wallpaper","naturaleza"],["mountain landscape wallpaper","paisajes"],["space galaxy wallpaper","espacio"],["anime illustration wallpaper","anime"],["gaming digital art wallpaper","gaming"],["minimal abstract wallpaper","minimalista"],["abstract art wallpaper","abstracto"],["architecture wallpaper","arquitectura"]
];
const clean=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,180);
const batch=[];
for(const [query,category] of topics){
 const api=new URL("https://commons.wikimedia.org/w/api.php");
 api.search=new URLSearchParams({action:"query",format:"json",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"30",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1600"}).toString();
 const response=await fetch(api,{headers:{"User-Agent":"NEXORA-WallpaperBot/1.0 (weekly curated gallery)"}});
 if(!response.ok){console.warn("Commons search failed",query,response.status);continue;}
 const data=await response.json();
 for(const page of Object.values(data.query?.pages||{})){
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
  if(!info?.url||!info?.thumburl||!String(info.url).startsWith("https://upload.wikimedia.org/"))continue;
  const width=Number(info.width||0),height=Number(info.height||0);if(width<1000||height<700)continue;
  const title=clean(page.title).replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
  batch.push({id:"commons-"+page.pageid,title,category,tags:clean(meta.ImageDescription?.value||page.title),thumb_url:info.thumburl,image_url:info.url,source_url:info.descriptionurl,author:clean(meta.Artist?.value||"Comunidad"),license:clean(meta.LicenseShortName?.value||"Ver licencia"),width,height});
 }
}
const unique=[...new Map(batch.map(x=>[x.id,x])).values()];
for(let i=0;i<unique.length;i+=200){
 const response=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({wallpapers:unique.slice(i,i+200)})});
 if(!response.ok)throw new Error("NEXORA import API returned "+response.status+": "+(await response.text()).slice(0,300));
 console.log("Import batch",await response.json());
}
console.log("Weekly Wikimedia Commons import complete:",unique.length,"unique candidates.");
