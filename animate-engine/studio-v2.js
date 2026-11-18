(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const app = document.querySelector(".studio-wrap");
  const oldPanel = document.querySelector(".studio-panel");
  const canvas = $("studioCanvas");
  const editor = window.nexoraStudioEditor;
  const sequence = window.nexoraSequence;
  if (!app || !oldPanel || !canvas || !editor || !sequence) return;
  const uiQuery=editor.ui.querySelector.bind(editor.ui);
  editor.ui.querySelector=function(selector){return uiQuery(selector)||(selector.charAt(0)==="#"?document.getElementById(selector.slice(1)):null);};
  app.classList.add("na-app");
  const heading = document.createElement("div");
  heading.className = "na-heading";
  heading.innerHTML = '<div><div class="eyebrow"><span class="pulse"></span> NEXORA ANIMATE · ESTUDIO VISUAL</div><h1>Tu escena, <span>tu control.</span></h1><p>Compón con imágenes, organiza tus pistas y crea cada fotograma manualmente.</p></div>';
  const shell = document.createElement("div");
  shell.className = "na-shell";
  const assets = document.createElement("aside");
  assets.className = "na-panel na-assets";
  assets.innerHTML = '<h2>Biblioteca de recursos</h2><div class="na-import"><div class="na-field" id="na-bg-slot"><label>Fondo de escena</label></div><div class="na-field" id="na-png-slot"><label>Personaje / objeto PNG</label></div><div class="na-field" id="na-frame-slot"><label>Importar fotogramas</label></div><div class="na-field" id="na-sheet-slot"><label>Hoja de sprites</label></div></div><p class="studio-note">Los PNG transparentes se agregan encima del fondo como capas independientes.</p><div class="na-top-actions" id="na-project-actions"></div>';
  const preview = document.createElement("section");
  preview.className = "na-panel na-preview";
  preview.innerHTML = '<div class="na-timeline-head"><h2>Escenario / previsualización</h2><span class="studio-note">Selecciona y arrastra los elementos directamente en el lienzo.</span></div><div class="na-stage"></div><div class="na-preview-tools" id="na-preview-tools"></div>';
  const inspector = document.createElement("aside");
  inspector.className = "na-panel na-inspector";
  inspector.innerHTML = '<h2>Propiedades y capas</h2><div id="na-layer-slot"></div><div id="na-transform-slot"></div><div id="na-layer-actions"></div><div class="na-audio"><h3>Audio de la escena</h3><div id="na-audio-slot"></div></div>';
  const timeline = document.createElement("section");
  timeline.className = "na-panel na-timeline";
  timeline.innerHTML = '<div class="na-timeline-head"><div><h2 style="margin-bottom:3px">Línea de tiempo del video</h2><span class="studio-note">Un solo reloj compartido por fondo, personajes, objetos y audio.</span></div><div class="na-timeline-tools"><label class="studio-note">Duración (s) <input id="na-duration" type="number" min="1" max="600" value="10"></label><button class="button button-outline" id="na-refresh" type="button">Actualizar pistas</button></div></div><div class="na-timeline-scroll"><div class="na-ruler"><span>PISTA</span><div class="na-ruler-scale" id="na-ruler-scale"></div></div><div id="na-tracks"></div></div><div class="na-frame-strip"><h2>Fotogramas de la secuencia</h2><div id="na-frame-slot-target"></div></div>';
  shell.append(assets,preview,inspector,timeline);
  app.insertBefore(heading,oldPanel);
  app.insertBefore(shell,oldPanel);
  const stage = preview.querySelector(".na-stage");
  stage.appendChild(canvas);
  const studioUi = editor.ui;
  const move = (id,target) => { const el = studioUi.querySelector("#"+id); if(el) target.appendChild(el); };
  move("layerBackground",$("na-bg-slot"));
  move("layerImage",$("na-png-slot"));
  move("frameFiles",$("na-frame-slot"));
  move("sheetFile",$("na-sheet-slot"));
  move("cutSheet",$("na-sheet-slot"));
  move("saveProject",$("na-project-actions"));
  move("openProject",$("na-project-actions"));
  move("projectFile",$("na-project-actions"));
  move("layerSelect",$("na-layer-slot"));
  ["layerX","layerY","layerScale","layerRotation","layerOpacity","layerFlip","backgroundScale","backgroundX","backgroundY"].forEach(id => move(id,$("na-transform-slot")));
  ["layerUp","layerDown","layerDuplicate","layerDelete","captureFrame"].forEach(id => move(id,$("na-layer-actions")));
  ["audioFile","audioKind","audioStart","audioVolume","voiceText","voiceSpeaker","voiceGenerate","audioTrackList"].forEach(id => move(id,$("na-audio-slot")));
  const framePanel = $("sequencePanel");
  if(framePanel) $("na-frame-slot-target").appendChild(framePanel);
  const play = $("play"), exportVideo = $("exportVideo"), exportFrames = $("exportFrames");
  [play,exportVideo,exportFrames].forEach(el => el && $("na-preview-tools").appendChild(el));
  const mode = $("mode");
  if(mode){mode.value="sequence";mode.closest(".studio-controls")?.classList.add("na-hidden-source");}
  ["characterControls","actionControls","durationControls","cameraPanel"].forEach(id => $(id)?.classList.add("na-hidden-source"));
  oldPanel.classList.add("na-hidden-source");
  studioUi.classList.add("na-hidden-source");
  const status = $("status");
  status.classList.add("na-status");
  timeline.appendChild(status);
  const fps = $("seqFps"), loop = $("seqLoop"), onion = $("seqOnion");
  const tracks = $("na-tracks"), ruler = $("na-ruler-scale"), durationInput = $("na-duration");
  let duration = Math.max(10,sequence.duration() || 10);
  let playhead = 0;
  const colors = {bg:"na-clip-bg",layer:"na-clip-layer",audio:"na-clip-audio"};
  function makeTrack(name,type,start,end,details,collapsed){
    const row=document.createElement("div");row.className="na-track-row";
    const label=document.createElement("div");label.className="na-track-name";
    const toggle=document.createElement("button");toggle.type="button";toggle.className="na-collapse";toggle.textContent=collapsed?"▸":"▾";
    label.append(toggle,document.createTextNode(" "+name));row.appendChild(label);
    const lane=document.createElement("div");lane.className="na-track-lane";
    const clip=document.createElement("div");clip.className="na-clip "+colors[type];
    clip.style.left=(Math.max(0,start)/duration*100)+"%";clip.style.width=(Math.max(.1,Math.min(duration,end)-Math.max(0,start))/duration*100)+"%";
    clip.title=name+" · "+start.toFixed(1)+"s a "+end.toFixed(1)+"s";lane.appendChild(clip);row.appendChild(lane);
    tracks.appendChild(row);
    const sub=document.createElement("div");sub.className="na-subtracks";sub.hidden=!!collapsed;
    if(details) details(sub);
    tracks.appendChild(sub);
    toggle.addEventListener("click",()=>{sub.hidden=!sub.hidden;toggle.textContent=sub.hidden?"▸":"▾";});
    lane.addEventListener("click",e=>{const rect=lane.getBoundingClientRect();playhead=Math.max(0,Math.min(duration,(e.clientX-rect.left)/rect.width*duration));updateRulerHead();});
    return {row,sub,clip};
  }
  function updateRulerHead(){
    const marker=$("na-playhead");if(marker)marker.style.left=(playhead/duration*100)+"%";
    if(window.nexoraEngine)window.nexoraEngine.draw(playhead);
  }
  function drawTracks(){
    tracks.innerHTML="";
    duration=Math.max(1,Number(durationInput.value)||10,sequence.duration()||0,editor.getDuration()||0);
    durationInput.value=String(Math.ceil(duration));
    ruler.innerHTML="";
    for(let i=0;i<=10;i++){const tick=document.createElement("span");tick.textContent=(duration*i/10).toFixed(1)+"s";ruler.appendChild(tick);}
    const bg=makeTrack("Fondo de escena","bg",0,duration,sub=>{
      const note=document.createElement("p");note.className="studio-note";note.textContent="El fondo comparte la duración global del video. Puedes cambiarlo desde Biblioteca de recursos.";sub.appendChild(note);
    });
    editor.items.forEach((item,index)=>{
      const start=Number.isFinite(item.startTime)?item.startTime:0,end=Number.isFinite(item.endTime)?item.endTime:duration;
      makeTrack(item.name||("Capa "+(index+1)),"layer",start,end,sub=>{
        const p=document.createElement("p");p.className="studio-note";p.textContent="Guarda poses en distintos momentos. NEXORA interpolará posición, tamaño, giro y opacidad entre ellas.";sub.appendChild(p);
        const range=document.createElement("div");range.className="na-field";range.innerHTML='<label>Visible desde (s)</label><input type="number" min="0" step=".1" value="'+start+'"><label>Visible hasta (s)</label><input type="number" min="0" step=".1" value="'+end+'">';
        const inputs=range.querySelectorAll("input");
        inputs[0].addEventListener("change",()=>{item.startTime=Math.max(0,Number(inputs[0].value)||0);drawTracks();});
        inputs[1].addEventListener("change",()=>{item.endTime=Math.max(item.startTime||0,Number(inputs[1].value)||duration);drawTracks();});
        sub.appendChild(range);
        const keyLane=document.createElement("div");keyLane.className="na-track-lane";keyLane.style.margin="8px 0";
        (item.keyframes||[]).forEach(k=>{const marker=document.createElement("button");marker.type="button";marker.title="Pose en "+k.time.toFixed(2)+" s";marker.style.cssText="position:absolute;top:2px;left:"+Math.max(0,Math.min(100,k.time/duration*100))+"%;height:19px;width:8px;padding:0;border:0;border-radius:2px;background:#f2c36b;transform:translateX(-50%);cursor:pointer";marker.addEventListener("click",()=>{playhead=k.time;updateRulerHead();});keyLane.appendChild(marker);});
        const addPose=document.createElement("button");addPose.type="button";addPose.className="button button-outline";addPose.textContent="＋ Guardar pose en "+playhead.toFixed(2)+" s";addPose.addEventListener("click",()=>{const pose={time:playhead,x:item.x,y:item.y,scale:item.scale,rotation:item.rotation,opacity:item.opacity??1};item.keyframes=item.keyframes||[];const at=item.keyframes.findIndex(k=>Math.abs(k.time-playhead)<.025);if(at>=0)item.keyframes[at]=pose;else item.keyframes.push(pose);item.keyframes.sort((a,b)=>a.time-b.time);drawTracks();window.nexoraEngine.draw(playhead);});sub.append(keyLane,addPose);
      });
    });
    editor.audio.tracks.forEach(track=>{
      const end=track.trimEnd==null?duration:Math.min(duration,track.start+Math.max(0,track.trimEnd-(track.trimStart||0)));
      makeTrack(track.kind+" · "+track.name,"audio",track.start,end,sub=>{
        const p=document.createElement("p");p.className="studio-note";p.textContent="Esta pista usa el mismo reloj global. Ajusta su inicio, volumen y recortes en Audio de la escena.";sub.appendChild(p);
      });
    });
    const playheadRow=document.createElement("div");playheadRow.className="na-track-row";playheadRow.innerHTML='<span class="na-track-name">Cabezal de reproducción</span><div class="na-track-lane" style="background:transparent;border:0;overflow:visible"><input id="na-scrub" type="range" min="0" max="'+duration+'" step=".01" value="'+Math.min(playhead,duration)+'" style="width:100%;accent-color:#6da8ff"></div>';tracks.appendChild(playheadRow);
    $("na-scrub").addEventListener("input",e=>{playhead=Number(e.target.value)||0;updateRulerHead();});
    const marker=document.createElement("div");marker.id="na-playhead";marker.style.cssText="position:relative;height:2px;background:#6da8ff;left:0;width:100%;margin-top:2px";tracks.appendChild(marker);
    updateRulerHead();
  }
  $("na-refresh").addEventListener("click",drawTracks);
  durationInput.addEventListener("change",drawTracks);
  $("na-layer-slot").addEventListener("change",()=>{editor.selected=editor.items.find(x=>x.id===$("layerSelect").value)||null;});
  const originalDraw=editor.draw.bind(editor);
  editor.draw=function(ctx,time){const t=Number(time)||0;for(const item of this.items){if(t<(item.startTime||0)||t>(item.endTime==null?Infinity:item.endTime))continue;let pose={x:item.x,y:item.y,scale:item.scale,rotation:item.rotation,opacity:item.opacity??1};const keys=(item.keyframes||[]).slice().sort((a,b)=>a.time-b.time);if(keys.length){if(t<=keys[0].time)pose={...pose,...keys[0]};else if(t>=keys[keys.length-1].time)pose={...pose,...keys[keys.length-1]};else{let right=keys.findIndex(k=>k.time>=t),a=keys[right-1],b=keys[right],p=(t-a.time)/Math.max(.0001,b.time-a.time);["x","y","scale","rotation","opacity"].forEach(k=>{pose[k]=Number(a[k]??pose[k])+(Number(b[k]??pose[k])-Number(a[k]??pose[k]))*p;});}}const w=item.image.width*pose.scale,h=item.image.height*pose.scale;ctx.save();ctx.globalAlpha=pose.opacity??1;ctx.translate(pose.x,pose.y);ctx.rotate(pose.rotation);ctx.scale(item.flipX?-1:1,1);ctx.drawImage(item.image,-w/2,-h/2,w,h);if(item===this.selected){ctx.strokeStyle="#6da8ff";ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(-w/2,-h/2,w,h);}ctx.restore();}};
  const refresh=editor._refreshLayers.bind(editor);
  editor._refreshLayers=function(){refresh();drawTracks();};
  const originalAdd=editor.audio.add.bind(editor.audio);
  editor.audio.add=function(...args){const result=originalAdd(...args);setTimeout(drawTracks,0);return result;};
  const originalRemove=editor.audio.remove.bind(editor.audio);
  editor.audio.remove=function(...args){const result=originalRemove(...args);setTimeout(drawTracks,0);return result;};
  const originalCapture=editor.captureFrame.bind(editor);
  editor.captureFrame=function(){originalCapture();drawTracks();};
  const originalLoad=editor._loadImage.bind(editor);
  editor._loadImage=function(file,done){originalLoad(file,img=>{done(img);drawTracks();});};
  const originalFrameRender=window.renderFrameList;
  if(fps){fps.addEventListener("change",drawTracks);}
  if(loop){loop.addEventListener("change",drawTracks);}
  if(onion){onion.addEventListener("change",drawTracks);}
  const oldPlayClick=play.onclick;
  if(play){play.addEventListener("click",()=>{if(play.textContent.includes("Detener")){playhead=0;}else{playhead=0;}},true);}
  const statusObserver=new MutationObserver(()=>{if(status.textContent.includes("agregado")||status.textContent.includes("cargado")||status.textContent.includes("guardado"))drawTracks();});
  statusObserver.observe(status,{childList:true,characterData:true,subtree:true});
  drawTracks();
  window.NexoraAnimateVisualEditor={refresh:drawTracks};
})();