import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const out=path.join(root,"artifacts","nexora-frame-editor-qa");fs.mkdirSync(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);const target=path.resolve(root,"."+pathname);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{"content-type":mime[path.extname(target)]||"application/octet-stream","cache-control":"no-store"}).end(data)})});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(4174,"127.0.0.1",resolve)});
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:4174/admin/animate-frames.html",{waitUntil:"domcontentloaded"});
 assert.equal(await page.locator("#frameFiles").isDisabled(),true,"La secuencia debe iniciar bloqueada.");
 const dataUrl=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=64;c.height=64;const x=c.getContext("2d");x.fillStyle="#e45f39";x.fillRect(0,0,64,64);x.fillStyle="#f5d06f";x.beginPath();x.arc(32,32,18,0,Math.PI*2);x.fill();return c.toDataURL("image/png")});
 const buffer=Buffer.from(dataUrl.split(",")[1],"base64");
 await page.locator("#characterName").fill("Coelo");
 await page.locator("#description").fill("Pequeño dinosaurio carnívoro de diseño original.");
 await page.locator("#silhouette").fill("Cabeza compacta, torso ligero y cola larga.");
 await page.locator("#palette").fill("Verde oliva, crema y detalles oscuros.");
 await page.locator("#proportions").fill("Cabeza 1/4 de la longitud total.");
 await page.locator("#face").fill("Ojos grandes y hocico corto.");
 await page.locator("#costume").fill("Sin ropa; escamas pequeñas.");
 await page.locator("#traits").fill("Marca clara sobre el ojo izquierdo.");
 await page.locator("#referenceFiles").setInputFiles({name:"coelo-reference.png",mimeType:"image/png",buffer});
 await page.waitForFunction(()=>document.querySelectorAll("#references .thumb").length===1);
 for(const key of ["silhouette","face","palette","costume","proportions"])await page.locator('[data-review="'+key+'"]').check();
 await page.locator("#approveDesign").click();
 await page.waitForFunction(()=>document.querySelector("#frameFiles").disabled===false);
 assert.equal(await page.locator("#designState").textContent(),"APROBADO");
 await page.locator("#frameFiles").setInputFiles([
  {name:"coelo-01.png",mimeType:"image/png",buffer},
  {name:"coelo-02.png",mimeType:"image/png",buffer}
 ]);
 await page.waitForFunction(()=>document.querySelectorAll("#timeline .timeline-card").length===2);
 await page.waitForFunction(()=>document.querySelector("#previewEmpty").classList.contains("hidden"));
 assert.equal(await page.locator("#frameCount").textContent(),"2 FOTOGRAMAS");
 await page.locator("#play").click();await page.waitForTimeout(250);await page.locator("#stop").click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("nexora-frame-project-v1")));
 assert.equal(saved.design.approved,true);assert.equal(saved.frames.length,2);
 assert.deepEqual(errors,[],"Errores de navegador: "+errors.join(" | "));
 await page.screenshot({path:path.join(out,"frame-editor-approved.png"),fullPage:true,animations:"disabled"});
 const designPage=await browser.newPage({viewport:{width:1440,height:1100}});designPage.on("pageerror",e=>errors.push(e.message));
 await designPage.goto("http://127.0.0.1:4174/admin/animate-engine/designs/preview-v2.html",{waitUntil:"domcontentloaded"});
 await designPage.waitForFunction(()=>Array.from(document.querySelectorAll(".art img")).length===2&&Array.from(document.querySelectorAll(".art img")).every(img=>img.complete&&img.naturalWidth>0));
 const designAssets=await designPage.locator(".art img").evaluateAll(imgs=>imgs.map(img=>({alt:img.alt,width:img.naturalWidth,height:img.naturalHeight})));
 assert.equal(designAssets.length,2);await designPage.screenshot({path:path.join(out,"character-design-v2.png"),fullPage:true,animations:"disabled"});
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({status:"passed",approved:saved.design.approved,frameCount:saved.frames.length,designAssets,errors},null,2));
 console.log("NEXORA_FRAME_EDITOR_QA=passed frames="+saved.frames.length);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
