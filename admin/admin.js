const $=id=>document.getElementById(id);let articles=[],current=null;
function note(message,type=""){const n=$("notice");n.textContent=message;n.className="notice "+type}
function formReset(){current=null;$("articleForm").reset();$("formHeading").textContent="Nueva publicación";$("deleteBtn").hidden=true;$("statusPill").textContent="BORRADOR";document.querySelectorAll(".article-item").forEach(x=>x.classList.remove("active"))}
function fill(a){current=a;$("title").value=a.title;$("category").value=a.category;$("status").value=a.status;$("excerpt").value=a.excerpt||"";$("content").value=a.content;$("formHeading").textContent="Editar publicación";$("deleteBtn").hidden=false;$("statusPill").textContent=a.status==="published"?"PUBLICADO":"BORRADOR";document.querySelectorAll(".article-item").forEach(x=>x.classList.toggle("active",x.dataset.slug===a.slug))}
function renderList(){const box=$("articleList");box.innerHTML="";if(!articles.length){box.innerHTML='<p class="empty">Todavía no hay publicaciones creadas desde el panel.</p>';return}articles.forEach(a=>{const b=document.createElement("button");b.className="article-item";b.dataset.slug=a.slug;const title=document.createElement("strong"),meta=document.createElement("small");title.textContent=a.title;meta.textContent=a.category+" · "+(a.status==="published"?"Publicado":"Borrador");b.append(title,meta);b.addEventListener("click",()=>fill(a));box.append(b)})}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||("Error "+r.status));return data}
async function load(){try{const data=await api("/api/admin/articles");articles=data.articles||[];renderList();note("Panel conectado. Tus publicaciones están listas para administrarse.","ok")}catch(e){note("No se pudo abrir el panel: "+e.message+". Comprueba el acceso protegido y la configuración de Cloudflare.","error")}}
$("newBtn").addEventListener("click",formReset);$("resetBtn").addEventListener("click",formReset);
$("status").addEventListener("change",()=>{$("statusPill").textContent=$("status").value==="published"?"PUBLICADO":"BORRADOR"});
$("articleForm").addEventListener("submit",async e=>{e.preventDefault();const payload={title:$("title").value,category:$("category").value,status:$("status").value,excerpt:$("excerpt").value,content:$("content").value};$("saveBtn").disabled=true;try{if(current){await api("/api/admin/articles/"+encodeURIComponent(current.slug),{method:"PUT",body:JSON.stringify(payload)});note("Artículo actualizado.","ok")}else{await api("/api/admin/articles",{method:"POST",body:JSON.stringify(payload)});note("Artículo guardado.","ok")}await load();formReset()}catch(err){note(err.message,"error")}finally{$("saveBtn").disabled=false}});
$("deleteBtn").addEventListener("click",async()=>{if(!current||!confirm("¿Eliminar este artículo permanentemente?"))return;try{await api("/api/admin/articles/"+encodeURIComponent(current.slug),{method:"DELETE"});note("Artículo eliminado.","ok");formReset();await load()}catch(e){note(e.message,"error")}});
formReset();load();
/* NEXORA VOICE — browser-native speech synthesis */
(()=>{
 const $=id=>document.getElementById(id);
 const text=$("voiceText"),select=$("voiceSelect"),play=$("voicePlay"),pause=$("voicePause"),stop=$("voiceStop"),status=$("voiceStatus");
 if(!text||!select)return;
 const supported="speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
 let voices=[];
 const setStatus=(message,error=false)=>{status.textContent=message;status.classList.toggle("error",error)};
 const refreshVoices=()=>{
  if(!supported){$("voiceSupport").textContent="No compatible en este navegador";select.innerHTML='<option value="">Voz no disponible</option>';play.disabled=true;setStatus("Tu navegador no ofrece síntesis de voz. Prueba con Chrome actualizado.",true);return}
  voices=window.speechSynthesis.getVoices();
  const previous=select.value;
  select.innerHTML="";
  const spanish=voices.filter(v=>/^es([-_]|$)/i.test(v.lang));
  const ordered=[...spanish,...voices.filter(v=>!spanish.includes(v))];
  ordered.forEach((v,i)=>{const option=document.createElement("option");option.value=String(i);option.textContent=v.name+" · "+v.lang;option.dataset.voiceName=v.name;select.append(option)});
  $("voiceSupport").textContent=voices.length?voices.length+" voces en tu dispositivo":"El navegador aún no ha cargado voces";
  const match=ordered.findIndex(v=>v.name===previous);
  if(match>=0)select.selectedIndex=match;
  if(!voices.length)setStatus("No se encontraron voces. Revisa los servicios de voz de tu dispositivo.");
 };
 const orderedVoices=()=>{const spanish=voices.filter(v=>/^es([-_]|$)/i.test(v.lang));return [...spanish,...voices.filter(v=>!spanish.includes(v))]};
 text.addEventListener("input",()=>{$("voiceCount").textContent=text.value.length+" / 5000"});
 $("voiceRate").addEventListener("input",e=>$("voiceRateValue").textContent=Number(e.target.value).toFixed(1)+"×");
 $("voicePitch").addEventListener("input",e=>$("voicePitchValue").textContent=Number(e.target.value).toFixed(1));
 play.addEventListener("click",()=>{
  const value=text.value.trim();
  if(!value){setStatus("Escribe o pega un texto antes de reproducirlo.",true);text.focus();return}
  if(!supported){refreshVoices();return}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(value);
  const list=orderedVoices();
  const chosen=list[Number(select.value)];
  if(chosen)utterance.voice=chosen;
  utterance.rate=Number($("voiceRate").value);
  utterance.pitch=Number($("voicePitch").value);
  utterance.onstart=()=>{setStatus("Reproduciendo…");play.disabled=true;pause.disabled=false;stop.disabled=false};
  utterance.onend=()=>{setStatus("Reproducción terminada.");play.disabled=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pausar"};
  utterance.onerror=e=>{setStatus("No se pudo reproducir: "+(e.error||"error de voz"),true);play.disabled=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pausar"};
  window.speechSynthesis.speak(utterance);
 });
 pause.addEventListener("click",()=>{
  if(window.speechSynthesis.paused){window.speechSynthesis.resume();pause.textContent="Pausar";setStatus("Reproduciendo…")}
  else{window.speechSynthesis.pause();pause.textContent="Continuar";setStatus("Reproducción pausada.")}
 });
 stop.addEventListener("click",()=>{window.speechSynthesis.cancel();play.disabled=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pausar";setStatus("Reproducción detenida.")});
 if(supported){refreshVoices();window.speechSynthesis.addEventListener?.("voiceschanged",refreshVoices);setTimeout(refreshVoices,500)}
 else refreshVoices();
 window.addEventListener("pagehide",()=>{if(supported)window.speechSynthesis.cancel()});
})();
