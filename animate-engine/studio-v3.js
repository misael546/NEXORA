/* NEXORA ANIMATE V3 — carga unificada y edición táctil directa */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const editor=window.nexoraStudioEditor,app=document.querySelector(".na-app");
  let canvas=$("studioCanvas");
  if(!editor||!canvas||!app)return;
  const status=$("status");
  const say=m=>{if(status)status.textContent=m;};
  // Reemplaza los cargadores separados por una única entrada de archivos.
  const assets=$(".na-assets");
  if(assets){
    assets.innerHTML='<div class="na-upload-head"><div><h2>Archivos del proyecto</h2><p>Sube imágenes, audio o video. Cada archivo pasa directamente a la escena.</p></div><label class="na-upload-button" for="na-unified-files">＋ Añadir archivos</label><input id="na-unified-files" type="file" accept="image/*,audio/*,video/*" multiple></div><div class="na-resource-hint">Los recursos añadidos aparecen en la previsualización y dejan de ocupar espacio aquí.</div>';
  }
  // El inspector antiguo se reduce a acciones de proyecto; las propiedades viven en el lienzo.
  const inspector=$(".na-inspector");
  if(inspector){
    inspector.innerHTML='<h2>Elemento seleccionado</h2><p id="na-selected-name" class="na-selected-name">Toca un elemento de la escena para editarlo.</p><div class="na-touch-help">Arrastra para mover · pellizca para cambiar tamaño · gira con dos dedos.</div><div class="na-selected-actions"><button class="button button-outline" id="na-duplicate">Duplicar</button><button class="button button-outline" id="na-delete">Eliminar</button><button class="button button-outline" id="na-flip">Voltear</button><button class="button button-primary" id="na-keyframe">Guardar movimiento aquí</button></div><div class="na-project-actions"></div>';
    const actions=inspector.querySelector(".na-project-actions");
    ["saveProject","openProject","projectFile"].forEach(id=>{const el=$(id);if(el)actions.append(el);});
  }
  // Quita entradas antiguas duplicadas y paneles técnicos que ya no forman parte del flujo.
  document.querySelectorAll("#na-bg-slot,#na-png-slot,#na-frame-slot,#na-sheet-slot,#na-transform-slot,#na-layer-slot,#na-layer-actions,#na-audio-slot,.na-audio,.na-frame-strip").forEach(el=>el.style.display="none");
  const stage=$(".na-stage");
  if(stage){stage.setAttribute("aria-label","Previsualización interactiva");}
  // Sustituye el canvas para retirar los listeners de arrastre antiguos y evitar movimientos duplicados.
  const cleanCanvas=canvas.cloneNode(false);canvas.replaceWith(cleanCanvas);canvas=cleanCanvas;editor.canvas=canvas;
  const fileInput=$("na-unified-files");
  if(fileInput)fileInput.addEventListener("change",async e=>{
    const files=Array.from(e.target.files||[]);
    for(const file of files){
      try{
        if(file.type.startsWith("image/")){
          await new Promise((resolve,reject)=>editor._loadImage(file,img=>{
            if(!editor.background){editor.background=img;editor.backgroundTransform={x:0,y:0,scale:1};say("Fondo añadido a la escena: "+file.name);}
            else {const item={id:"layer_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),name:file.name,image:img,x:editor.engine.width/2,y:editor.engine.height/2,scale:1,rotation:0,opacity:1,flipX:false,keyframes:[]};editor.items.push(item);editor.selected=item;say("Imagen añadida a la escena: "+file.name);}
            editor._refreshLayers();editor.engine.draw(window.nexoraVisualEditorTime||0);resolve();
          }));
        }else if(file.type.startsWith("audio/")){
          const track=editor.audio.add(file,{name:file.name,kind:"sfx",start:0,volume:1});
          editor._renderAudio();window.NexoraAnimateVisualEditor?.refresh();say("Audio añadido a la línea de tiempo: "+track.name);
        }else if(file.type.startsWith("video/")){
          const url=URL.createObjectURL(file),video=document.createElement("video");
          video.src=url;video.muted=true;video.loop=true;video.playsInline=true;video.preload="auto";
          await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error("No se pudo abrir el video"));});
          video.width=video.videoWidth;video.height=video.videoHeight;
          const item={id:"layer_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),name:file.name,image:video,video,url,x:editor.engine.width/2,y:editor.engine.height/2,scale:Math.min(editor.engine.width/video.width,editor.engine.height/video.height),rotation:0,opacity:1,flipX:false,keyframes:[]};
          editor.items.push(item);editor.selected=item;video.play().catch(()=>{});editor._refreshLayers();editor.engine.draw(window.nexoraVisualEditorTime||0);say("Video añadido a la escena: "+file.name);
        }else say("Formato no compatible: "+file.name);
      }catch(err){say("No se pudo añadir "+file.name+": "+err.message);}
    }
    e.target.value="";
  });
  function syncSelected(){const n=$("na-selected-name");if(n)n.textContent=editor.selected?.name||"Fondo de escena";editor.engine.draw(window.nexoraVisualEditorTime||0);}
  const oldRefresh=editor._refreshLayers.bind(editor);
  editor._refreshLayers=function(){oldRefresh();syncSelected();};
  // Sustituye el arrastre simple por gestos multitáctiles en coordenadas reales del lienzo.
  const active=new Map();let gesture=null;
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*editor.engine.width/r.width,y:(e.clientY-r.top)*editor.engine.height/r.height};};
  const hit=p=>{for(let i=editor.items.length-1;i>=0;i--){const x=editor.items[i],w=x.image.width*x.scale,h=x.image.height*x.scale;if(p.x>=x.x-w/2&&p.x<=x.x+w/2&&p.y>=x.y-h/2&&p.y<=x.y+h/2)return x;}return null;};
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
  canvas.addEventListener("pointerdown",e=>{
    e.preventDefault();canvas.setPointerCapture(e.pointerId);active.set(e.pointerId,point(e));
    if(active.size===1){const p=point(e),item=hit(p);if(item){editor.selected=item;syncSelected();gesture={type:"drag",last:p};}else{editor.selected=null;syncSelected();gesture=null;}}
    if(active.size===2&&editor.selected){const pts=[...active.values()],m=midpoint(pts[0],pts[1]);gesture={type:"pinch",mid:m,dist:Math.max(1,distance(pts[0],pts[1])),angle:angle(pts[0],pts[1]),x:editor.selected.x,y:editor.selected.y,scale:editor.selected.scale,rotation:editor.selected.rotation};}
  });
  canvas.addEventListener("pointermove",e=>{
    if(!active.has(e.pointerId)||!editor.selected)return;
    active.set(e.pointerId,point(e));const pts=[...active.values()],item=editor.selected;
    if(active.size>=2&&gesture?.type==="pinch"){const m=midpoint(pts[0],pts[1]);item.x=gesture.x+(m.x-gesture.mid.x);item.y=gesture.y+(m.y-gesture.mid.y);item.scale=Math.max(.03,Math.min(8,gesture.scale*distance(pts[0],pts[1])/gesture.dist));item.rotation=gesture.rotation+angle(pts[0],pts[1])-gesture.angle;}
    else if(active.size===1&&gesture?.type==="drag"){const p=pts[0];item.x+=p.x-gesture.last.x;item.y+=p.y-gesture.last.y;gesture.last=p;}
    editor._syncInputs();editor.engine.draw(window.nexoraVisualEditorTime||0);
  });
  const stop=e=>{active.delete(e.pointerId);if(active.size===1&&editor.selected){const p=[...active.values()][0];gesture={type:"drag",last:p};}else gesture=null;};
  canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);
  $("na-duplicate")?.addEventListener("click",()=>{if(!editor.selected)return;const x=editor.selected,c={...x,id:"layer_"+Date.now(),name:x.name+" copia",x:x.x+20,y:x.y+20,keyframes:(x.keyframes||[]).map(k=>({...k}))};editor.items.push(c);editor.selected=c;editor._refreshLayers();});
  $("na-delete")?.addEventListener("click",()=>{if(!editor.selected)return;editor.items=editor.items.filter(x=>x!==editor.selected);editor.selected=null;editor._refreshLayers();editor.engine.draw(window.nexoraVisualEditorTime||0);});
  $("na-flip")?.addEventListener("click",()=>{if(!editor.selected)return;editor.selected.flipX=!editor.selected.flipX;editor.engine.draw(window.nexoraVisualEditorTime||0);});
  $("na-keyframe")?.addEventListener("click",()=>{const x=editor.selected;if(!x)return say("Selecciona primero un personaje u objeto.");const time=window.nexoraVisualEditorTime||0;x.keyframes=x.keyframes||[];const pose={time,x:x.x,y:x.y,scale:x.scale,rotation:x.rotation,opacity:x.opacity??1};const at=x.keyframes.findIndex(k=>Math.abs(k.time-time)<.025);if(at>=0)x.keyframes[at]=pose;else x.keyframes.push(pose);x.keyframes.sort((a,b)=>a.time-b.time);window.NexoraAnimateVisualEditor?.refresh();say("Movimiento guardado en "+time.toFixed(2)+" segundos.");});
  syncSelected();
})();
