/* NEXORA ANIMATE — studio integration for continuity + visual engine. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const aside=document.querySelector(".layout aside");
if(!aside||!window.NexoraVisualEngine||!window.NexoraContinuity||!window.NexoraAnimationTools||!window.NexoraCompositor)return;
const panel=document.createElement("section");panel.className="panel";panel.style.marginTop="14px";panel.innerHTML=`
<h2>Biblioteca de personajes <span class="pill">CONTINUIDAD</span></h2>
<p class="hint">Guarda una ficha maestra. Cada plano debe respetar estos rasgos y la voz asignada.</p>
<div class="field"><label for="ncName">Nombre del personaje</label><input id="ncName" maxlength="60" placeholder="Ej. Akira"></div>
<div class="field"><label for="ncFace">Rostro y rasgos</label><textarea id="ncFace" placeholder="Forma del rostro, nariz, marcas y rasgos únicos"></textarea></div>
<div class="field"><label for="ncEyes">Ojos</label><input id="ncEyes" placeholder="Color, forma y detalles"></div>
<div class="field"><label for="ncHair">Cabello</label><input id="ncHair" placeholder="Color, corte y peinado"></div>
<div class="field"><label for="ncBody">Cuerpo y proporciones</label><input id="ncBody" placeholder="Altura relativa, complexión y proporciones"></div>
<div class="field"><label for="ncPalette">Paleta de colores</label><input id="ncPalette" placeholder="Colores principales y secundarios"></div>
<div class="field"><label for="ncOutfit">Vestuario</label><textarea id="ncOutfit" placeholder="Prendas, materiales y detalles que no cambian"></textarea></div>
<div class="field"><label for="ncAccessories">Accesorios y rasgos distintivos</label><textarea id="ncAccessories" placeholder="Collar, cicatriz, insignia, objeto, etc."></textarea></div>
<div class="field"><label for="ncVoice">Identidad de voz</label><input id="ncVoice" placeholder="ID de voz + timbre, ritmo y acento"></div>
<div class="actions"><button class="btn primary" id="ncSave">Guardar personaje</button><button class="btn" id="ncReset">Limpiar</button></div>
<div class="field"><label for="ncSelect">Personajes guardados</label><select id="ncSelect"><option value="">Selecciona un personaje…</option></select></div>
<div class="actions"><button class="btn" id="ncLoad">Cargar ficha</button><button class="btn" id="ncCheck">Revisar continuidad</button></div>
<div class="actions"><button class="btn" id="ncExport">Exportar biblia JSON</button><button class="btn" id="ncImport">Importar biblia</button><input id="ncFile" type="file" accept="application/json,.json" hidden></div>
<div class="status" id="ncStatus" role="status">Biblioteca local lista.</div>
<div class="divider" style="height:1px;background:var(--line);margin:16px 0"></div>
<h2>Motor visual por capas <span class="pill">PREVIEW</span></h2>
<p class="hint">Previsualizador independiente con capas, cámara, partículas y fotogramas clave. No altera la secuencia antigua hasta que decidas usarlo.</p>
<canvas id="nvCanvas" width="640" height="360" style="width:100%;aspect-ratio:16/9;background:#080c14;border:1px solid var(--line);border-radius:9px;display:block"></canvas>
<div class="upload"><span class="pill" id="nvStatus">MOTOR INICIALIZADO</span></div>
<div class="field"><label for="nvParticles">Ambiente</label><select id="nvParticles"><option value="none">Sin partículas</option><option value="dust">Polvo</option><option value="snow">Nieve</option><option value="embers">Brasas</option><option value="magic">Partículas mágicas</option></select></div>
<div class="field"><label for="nvZoom">Zoom de cámara</label><input id="nvZoom" type="range" min="0.6" max="1.8" step="0.05" value="1"></div>
<div class="actions"><button class="btn" id="nvRender">Renderizar fotograma</button><button class="btn" id="nvAnimate">Vista animada</button></div>
<div class="field"><label for="nvPoint">Punto del esqueleto</label><select id="nvPoint"><option value="head">Cabeza</option><option value="neck">Cuello</option><option value="shoulderL">Hombro izquierdo</option><option value="elbowL">Codo izquierdo</option><option value="handL">Mano izquierda</option><option value="shoulderR">Hombro derecho</option><option value="elbowR">Codo derecho</option><option value="handR">Mano derecha</option><option value="hip">Cadera</option><option value="kneeL">Rodilla izquierda</option><option value="footL">Pie izquierdo</option><option value="kneeR">Rodilla derecha</option><option value="footR">Pie derecho</option></select></div>
<div class="actions"><button class="btn" id="nvRigToggle">Editar esqueleto</button><button class="btn" id="nvRigSave">Guardar rig</button><button class="btn" id="nvRigLoad">Cargar rig</button><input id="nvRigFile" type="file" accept="application/json,.json" hidden></div>
<div class="hint" id="nvHelp">Sube una imagen en el panel principal para añadirla a esta vista por capas.</div>
<div class="divider" style="height:1px;background:var(--line);margin:16px 0"></div>
<h2>Animación del esqueleto <span class="pill">MOTION</span></h2>
<p class="hint">Previsualiza movimientos base sobre el rig. Los marcadores y huesos se animan; deformar automáticamente los píxeles de la imagen todavía requiere un deformador de malla.</p>
<div class="field"><label for="nmPreset">Movimiento</label><select id="nmPreset"><option value="idle">Respirar / reposo</option><option value="walk">Caminar</option><option value="run">Correr</option><option value="jump">Saltar</option><option value="talk">Hablar / gesticular</option><option value="hit">Recibir impacto</option></select></div>
<div class="field"><label for="nmDuration">Duración (segundos)</label><input id="nmDuration" type="number" min="0.5" max="20" step="0.5" value="2"></div>
<div class="field"><label for="nmTime">Línea de tiempo <span id="nmTimeLabel">0.00 s</span></label><input id="nmTime" type="range" min="0" max="2" step="0.01" value="0"></div>
<div class="actions"><button class="btn primary" id="nmPlay">▶ Previsualizar movimiento</button><button class="btn" id="nmKey">＋ Guardar pose clave</button></div>
<div class="actions"><button class="btn" id="nmExport">Exportar movimiento</button><button class="btn" id="nmImport">Importar movimiento</button><input id="nmFile" type="file" accept="application/json,.json" hidden></div>
<div class="status" id="nmStatus" role="status">Coloca puntos del esqueleto y elige un movimiento.</div>
`;
const notice=aside.querySelector(".notice");aside.insertBefore(panel,notice||null);
const continuity=new window.NexoraContinuity.ContinuityManager();
const fields={name:"ncName",face:"ncFace",eyes:"ncEyes",hair:"ncHair",body:"ncBody",palette:"ncPalette",outfit:"ncOutfit",accessories:"ncAccessories",voiceProfile:"ncVoice"};
let editingId=null;
function status(message){$("ncStatus").textContent=message}
function refresh(){const select=$("ncSelect"),current=select.value;select.innerHTML='<option value="">Selecciona un personaje…</option>';continuity.list().forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.name;select.append(o)});if(current&&continuity.get(current))select.value=current}
function formData(){const p={};for(const [k,id]of Object.entries(fields))p[k]=$(id).value;p.voiceId=$("voiceSpeaker")?.value||"";return p}
function fill(p){for(const[k,id]of Object.entries(fields))$(id).value=p[k]||"";if(p.voiceId&&$("voiceSpeaker"))$("voiceSpeaker").value=p.voiceId;editingId=p.id;$("ncSave").textContent="Actualizar personaje"}
function clear(){Object.values(fields).forEach(id=>$(id).value="");editingId=null;$("ncSave").textContent="Guardar personaje"}
$("ncSave").addEventListener("click",()=>{try{const data=formData();if(!data.name.trim())throw new Error("Escribe el nombre del personaje");if(editingId)continuity.update(editingId,data);else continuity.create(data);refresh();status("Ficha maestra guardada en este navegador.");}catch(e){status(e.message)}});
$("ncReset").addEventListener("click",clear);
$("ncLoad").addEventListener("click",()=>{const p=continuity.get($("ncSelect").value);if(!p){status("Selecciona un personaje.");return}fill(p);status("Ficha cargada. Puedes editarla y actualizarla.")});
$("ncCheck").addEventListener("click",()=>{const id=$("ncSelect").value;if(!id){status("Selecciona un personaje para revisar.");return}const report=continuity.validate(id,formData());status(report.consistent?"Continuidad declarada: 100%.":"Se detectaron "+report.issues.length+" diferencias: "+report.issues.map(x=>x.field).join(", ")+".")});
$("ncExport").addEventListener("click",()=>{const blob=new Blob([continuity.exportJSON()],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nexora-biblia-personajes.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});
$("ncImport").addEventListener("click",()=>$("ncFile").click());
$("ncFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{continuity.importJSON(await file.text());refresh();status("Biblia importada correctamente.")}catch(err){status("No se pudo importar: "+err.message)}e.target.value=""});
refresh();
const engine=new window.NexoraVisualEngine.VisualEngine($("nvCanvas"));
const compositor=new window.NexoraCompositor.SceneCompositor(engine);
let engineImage=null,raf=0,motionRaf=0,rigEditing=false,draggingRigPoint=null;const rig=new window.NexoraAnimationTools.CharacterRig();const motion=new window.NexoraMotionSystem.MotionTimeline();let rigBase={};
const mainImage=$("imageFile");
mainImage?.addEventListener("change",()=>{const file=mainImage.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{if(engineImage)engine.removeLayer(engineImage);engineImage=engine.addLayer({name:"Personaje / imagen",type:"image",asset:img,width:img.width*Math.min(1,560/img.width,310/img.height),height:img.height*Math.min(1,560/img.width,310/img.height),z:10});engine.draw(0);$("nvStatus").textContent="IMAGEN CARGADA";$("nvHelp").textContent="La imagen está en una capa independiente. Puedes añadir partículas y mover cámara.";URL.revokeObjectURL(url)};img.onerror=()=>{$("nvStatus").textContent="ERROR DE IMAGEN";URL.revokeObjectURL(url)};img.src=url});
function render(t=0){engine.setCamera({zoom:Number($("nvZoom").value)});engine.draw(t);rig.draw(engine.ctx,engine.width,engine.height)}
function syncMotionBase(){rigBase=Object.fromEntries(Object.entries(rig.points).map(([k,p])=>[k,{x:p.x,y:p.y}]));motion.setBase(rigBase);$("nmTime").value="0";$("nmTimeLabel").textContent="0.00 s"}
function showMotion(t){motion.apply(rig,t);render(t);$("nmTime").value=String(t);$("nmTimeLabel").textContent=t.toFixed(2)+" s"}
function setMotion(){if(motionRaf){cancelAnimationFrame(motionRaf);motionRaf=0}$("nmTime").max=$("nmDuration").value;motion.usePreset($("nmPreset").value,Number($("nmDuration").value));syncMotionBase();showMotion(0);$("nmStatus").textContent="Movimiento "+$("nmPreset").selectedOptions[0].textContent+" preparado."}
$("nvRender").addEventListener("click",()=>{render(0);$("nvStatus").textContent="FOTOGRAMA RENDERIZADO"});
$("nvParticles").addEventListener("change",e=>{const kind=e.target.value;engine.setParticles(kind==="none"?{count:0}:{kind,count:kind==="snow"?60:42,seed:412});render(0)});
$("nvZoom").addEventListener("input",()=>render(0));
$("nvRigToggle").addEventListener("click",()=>{rigEditing=!rigEditing;$("nvRigToggle").textContent=rigEditing?"Terminar edición":"Editar esqueleto";$("nvCanvas").style.cursor=rigEditing?"crosshair":"default";render(0)});
$("nvCanvas").addEventListener("pointerdown",e=>{if(!rigEditing)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;const nearest=Object.entries(rig.points).map(([name,p])=>({name,d:Math.hypot((p.x-x)*r.width,(p.y-y)*r.height)})).sort((a,b)=>a.d-b.d)[0];if(nearest&&nearest.d<22){draggingRigPoint=nearest.name}else{rig.setPoint($("nvPoint").value,x,y);draggingRigPoint=$("nvPoint").value}syncMotionBase();e.currentTarget.setPointerCapture(e.pointerId);render(0)});
$("nvCanvas").addEventListener("pointermove",e=>{if(!rigEditing||!draggingRigPoint)return;const r=e.currentTarget.getBoundingClientRect();rig.setPoint(draggingRigPoint,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);syncMotionBase();render(0)});
$("nvCanvas").addEventListener("pointerup",()=>{draggingRigPoint=null});$("nvCanvas").addEventListener("pointercancel",()=>{draggingRigPoint=null});
$("nmPreset").addEventListener("change",setMotion);$("nmDuration").addEventListener("change",setMotion);
$("nmTime").addEventListener("input",()=>showMotion(Number($("nmTime").value)));
$("nmPlay").addEventListener("click",()=>{if(motionRaf){cancelAnimationFrame(motionRaf);motionRaf=0;$("nmPlay").textContent="▶ Previsualizar movimiento";return}motion.usePreset($("nmPreset").value,Number($("nmDuration").value));syncMotionBase();const start=performance.now(),duration=motion.duration;$("nmPlay").textContent="Ⅱ Detener";const tick=now=>{const elapsed=(now-start)/1000;if(elapsed>=duration){showMotion(duration);motionRaf=0;$("nmPlay").textContent="▶ Previsualizar movimiento";return}showMotion(elapsed);motionRaf=requestAnimationFrame(tick)};motionRaf=requestAnimationFrame(tick)});
$("nmKey").addEventListener("click",()=>{const t=Number($("nmTime").value);motion.addKeyframe(t,rig.points);$("nmStatus").textContent="Pose clave guardada en "+t.toFixed(2)+" s."});
$("nmExport").addEventListener("click",()=>{motion.setBase(rigBase);const blob=new Blob([motion.exportJSON()],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nexora-movimiento.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});
$("nmImport").addEventListener("click",()=>$("nmFile").click());$("nmFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{motion.importJSON(await file.text());rigBase=motion.base;rig.points=motion.sample(0);$("nmPreset").value=motion.preset;$("nmDuration").value=motion.duration;$("nmTime").max=motion.duration;showMotion(0);$("nmStatus").textContent="Movimiento importado."}catch(err){$("nmStatus").textContent="No se pudo importar: "+err.message}e.target.value=""});
$("nvRigSave").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(rig.save(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nexora-character-rig.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});
$("nvRigLoad").addEventListener("click",()=>$("nvRigFile").click());$("nvRigFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{rig.load(JSON.parse(await file.text()));render(0);$("nvStatus").textContent="RIG CARGADO"}catch(err){$("nvStatus").textContent="RIG INVÁLIDO: "+err.message}e.target.value=""});
$("nvAnimate").addEventListener("click",()=>{if(raf){cancelAnimationFrame(raf);raf=0;$("nvAnimate").textContent="Vista animada";return}$("nvAnimate").textContent="Detener vista";const start=performance.now();const tick=now=>{render((now-start)/1000);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)});
window.NEXORA_ANIMATE_ENGINE={visual:engine,continuity,compositor,animation:window.NexoraAnimationTools,version:"1.0.0"};
window.addEventListener("beforeunload",()=>{if(raf)cancelAnimationFrame(raf);if(motionRaf)cancelAnimationFrame(motionRaf)});
})();
