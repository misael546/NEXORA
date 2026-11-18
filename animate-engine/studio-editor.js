/* NEXORA ANIMATE — editor de capas y audio sincronizado.
 * Composición 2D por imágenes; no utiliza esqueletos ni articulaciones.
 */
(() => {
  "use strict";
  class StudioEditor {
    constructor(engine, canvas, host, status, sequence, onFrameCaptured) {
      this.engine = engine;
      this.canvas = canvas;
      this.host = host;
      this.status = status || (() => {});
      this.sequence = sequence || null;
      this.onFrameCaptured = onFrameCaptured || (() => {});
      this.backgroundTransform = { x: 0, y: 0, scale: 1 };
      this.backgroundStartTime = 0;
      this.backgroundEndTime = null;
      this.background = null;
      this.items = [];
      this.selected = null;
      this.editingFrame = null;
      this.audio = new window.NexoraAudio.AudioTimeline();
      this.audioDuration = 0;
      this.playing = false;
      this._buildUI();
      this.backgroundLayer = engine.addLayer({
        name: "Fondo importado", type: "custom", z: 5,
        visible: true, draw: (ctx, t) => this._drawBackground(ctx, t)
      });
      this.objectLayer = engine.addLayer({
        name: "Capas PNG", type: "custom", z: 40,
        visible: true, draw: (ctx, t) => this.draw(ctx, t)
      });
      this._bindCanvas();
    }
    _buildUI() {
      const section = document.createElement("section");
      section.className = "studio-panel";
      section.style.marginTop = "14px";
      section.innerHTML = `
        <h2 style="margin:0 0 8px">Proyecto</h2>
        <p class="studio-note">Guarda el proyecto completo en un archivo .nexora.json para continuar otro día o abrirlo en otro dispositivo. Incluye imágenes, composiciones y pistas de audio.</p>
        <div class="studio-actions"><button class="button button-primary" id="saveProject" type="button">Guardar proyecto</button><button class="button button-outline" id="openProject" type="button">Abrir proyecto</button><input id="projectFile" type="file" accept=".json,.nexora.json,application/json" hidden></div>
        <h2 style="margin:18px 0 8px">Composición por capas</h2>
        <p class="studio-note">Estudio manual por composición: carga un fondo, coloca personajes y objetos PNG transparentes, edita cada elemento y guarda cada pose como un fotograma independiente. No hay articulaciones ni movimiento automático.</p>
        <div class="studio-controls">
          <div><label>Imagen de fondo</label><input id="layerBackground" type="file" accept="image/*"></div>
          <div><label>Personaje u objeto PNG</label><input id="layerImage" type="file" accept="image/png"></div>
          <div><label>Capa seleccionada</label><select id="layerSelect"><option value="">Ninguna</option></select></div>
          <div><label>Posición X</label><input id="layerX" type="number" value="320"></div>
          <div><label>Posición Y</label><input id="layerY" type="number" value="180"></div>
          <div><label>Tamaño (%)</label><input id="layerScale" type="range" min="5" max="400" value="100"></div>
          <div><label>Rotación (grados)</label><input id="layerRotation" type="range" min="-180" max="180" value="0"></div>
          <div><label>Opacidad (%)</label><input id="layerOpacity" type="range" min="0" max="100" value="100"></div>
          <div><label>Voltear horizontal</label><select id="layerFlip"><option value="no">No</option><option value="yes">Sí</option></select></div>
          <div><label>Zoom del fondo (%)</label><input id="backgroundScale" type="range" min="50" max="250" value="100"></div>
          <div><label>Posición X del fondo</label><input id="backgroundX" type="number" value="0"></div>
          <div><label>Posición Y del fondo</label><input id="backgroundY" type="number" value="0"></div>
        </div>
        <div class="studio-actions"><button class="button button-outline" id="layerUp" type="button">Subir capa</button><button class="button button-outline" id="layerDown" type="button">Bajar capa</button><button class="button button-outline" id="layerDuplicate" type="button">Duplicar PNG</button><button class="button button-outline" id="layerDelete" type="button">Eliminar capa</button><button class="button button-primary" id="captureFrame" type="button">Guardar composición como fotograma</button></div>
        <h2 style="margin:18px 0 8px">Audio de la escena</h2>
        <p class="studio-note">Importa voces, música o efectos MP3/WAV. Las pistas se reproducen junto con la animación durante la previsualización y se incorporan al renderizado compatible.</p>
        <div class="studio-controls">
          <div><label>Agregar voz, música o efecto</label><input id="audioFile" type="file" accept="audio/*"></div>
          <div><label>Tipo de pista</label><select id="audioKind"><option value="voice">Voz / diálogo</option><option value="narration">Narración</option><option value="music">Música</option><option value="sfx">Efecto</option><option value="ambience">Ambiente</option></select></div>
          <div><label>Inicio (segundos)</label><input id="audioStart" type="number" min="0" step=".1" value="0"></div>
          <div><label>Volumen (%)</label><input id="audioVolume" type="range" min="0" max="200" value="100"></div>
        </div>
        <div class="studio-controls">
          <div style="grid-column:1/-1"><label for="voiceText">Texto para generar una voz MP3</label><textarea id="voiceText" rows="3" maxlength="1000" placeholder="Escribe aquí el diálogo del personaje..." style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid rgba(160,180,220,.25);background:#0d1422;color:#f3f6ff;font:inherit"></textarea></div>
          <div><label for="voiceSpeaker">Voz en español</label><select id="voiceSpeaker"><option value="sirio">Sirio</option><option value="nestor">Néstor</option><option value="alvaro">Álvaro</option><option value="javier">Javier</option><option value="aquila">Aquila</option></select></div>
          <div style="display:flex;align-items:end"><button class="button button-primary" id="voiceGenerate" type="button">Generar voz MP3</button></div>
        </div>
        <div id="audioTrackList" class="studio-note">Todavía no hay pistas de audio.</div>
      `;
      this.host.insertBefore(section, this.host.querySelector(".studio-actions"));
      this.ui = section;
      const $ = id => section.querySelector("#" + id) || document.getElementById(id);
      $("saveProject").addEventListener("click", () => this.saveProjectFile());
      $("openProject").addEventListener("click", () => $("projectFile").click());
      $("projectFile").addEventListener("change", async e => {
        const file=e.target.files && e.target.files[0];
        if(!file)return;
        try { await this.openProjectFile(file); }
        catch(err) { this.status("No se pudo abrir el proyecto: "+err.message); }
        finally { e.target.value=""; }
      });
      $("layerBackground").addEventListener("change", e => this._loadImage(e.target.files[0], img => { this.background = img; this.backgroundTransform = { x: 0, y: 0, scale: 1 }; this.backgroundStartTime = 0; this.backgroundEndTime = null; this.engine.draw(0); this.status("Fondo cargado. Ajusta su zoom y posición si lo necesitas."); }));
      $("layerImage").addEventListener("change", e => this._loadImage(e.target.files[0], img => {
        const item = { id: "layer_" + Date.now() + "_" + Math.random().toString(36).slice(2,6), name: e.target.files[0].name, image: img, x: this.engine.width/2, y: this.engine.height/2, scale: 1, rotation: 0, opacity: 1, flipX: false };
        this.items.push(item); this.selected = item; this._refreshLayers(); this.engine.draw(0); this.status("Personaje agregado. Arrástralo sobre el escenario.");
      }));
      $("layerSelect").addEventListener("change", () => { this.selected = this.items.find(x => x.id === $("layerSelect").value) || null; this._syncInputs(); });
      $("layerX").addEventListener("change", e => { if(this.selected){this.selected.x=Number(e.target.value)||0;this.engine.draw(0);} });
      $("layerY").addEventListener("change", e => { if(this.selected){this.selected.y=Number(e.target.value)||0;this.engine.draw(0);} });
      $("layerScale").addEventListener("input", e => { if(this.selected){this.selected.scale=Number(e.target.value)/100;this.engine.draw(0);} });
      $("layerRotation").addEventListener("input", e => { if(this.selected){this.selected.rotation=Number(e.target.value)*Math.PI/180;this.engine.draw(0);} });
      $("layerOpacity").addEventListener("input", e => { if(this.selected){this.selected.opacity=Number(e.target.value)/100;this.engine.draw(0);} });
      $("layerFlip").addEventListener("change", e => { if(this.selected){this.selected.flipX=e.target.value==="yes";this.engine.draw(0);} });
      $("backgroundScale").addEventListener("input", e => { this.backgroundTransform.scale=Number(e.target.value)/100;this.engine.draw(0); });
      $("backgroundX").addEventListener("change", e => { this.backgroundTransform.x=Number(e.target.value)||0;this.engine.draw(0); });
      $("backgroundY").addEventListener("change", e => { this.backgroundTransform.y=Number(e.target.value)||0;this.engine.draw(0); });
      $("captureFrame").addEventListener("click", () => this.captureFrame());
      $("layerUp").addEventListener("click", () => this._moveSelectedLayer(1));
      $("layerDown").addEventListener("click", () => this._moveSelectedLayer(-1));
      $("layerDuplicate").addEventListener("click", () => { if(!this.selected)return; const copy={...this.selected,id:"layer_"+Date.now()+"_"+Math.random().toString(36).slice(2,6),name:this.selected.name+" copia",x:this.selected.x+18,y:this.selected.y+18}; this.items.splice(this.items.indexOf(this.selected)+1,0,copy); this.selected=copy; this._refreshLayers(); this.engine.draw(0); });
      $("layerDelete").addEventListener("click", () => { if(!this.selected)return; this.items=this.items.filter(x=>x!==this.selected); this.selected=null; this._refreshLayers(); this.engine.draw(0); });
      $("audioFile").addEventListener("change", e => { const f=e.target.files && e.target.files[0]; if(!f)return; try { const t=this.audio.add(f,{name:f.name,kind:$("audioKind").value,start:Number($("audioStart").value)||0,volume:Number($("audioVolume").value)/100}); this._renderAudio(); this.status("Pista de audio agregada: "+t.name); } catch(err){this.status("No se pudo agregar el audio: "+err.message);} e.target.value=""; });
      $("voiceGenerate").addEventListener("click", async () => {
        const text=$("voiceText").value.trim(), speaker=$("voiceSpeaker").value, button=$("voiceGenerate");
        if(!text){this.status("Escribe primero el diálogo que quieres convertir en voz.");return;}
        button.disabled=true;button.textContent="Generando MP3…";this.status("NEXORA está generando la voz. Espera un momento.");
        try {
          const response=await fetch("/api/animate/voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,speaker})});
          if(!response.ok){let message="No se pudo generar la voz.";try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
          const blob=await response.blob();
          if(!blob.size)throw new Error("El servicio devolvió un MP3 vacío.");
          const track=this.audio.add(blob,{name:"Diálogo "+speaker,kind:"voice",start:Number($("audioStart").value)||0,volume:Number($("audioVolume").value)/100});
          this._renderAudio();this.status("Voz MP3 generada y agregada a la línea de tiempo: "+track.name);
        } catch(err){this.status(err.message||"Error al generar la voz.");}
        finally{button.disabled=false;button.textContent="Generar voz MP3";}
      });
    }
    _loadImage(file, done) {
      if(!file || !file.type.startsWith("image/")) return;
      const url=URL.createObjectURL(file), img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);done(img);};
      img.onerror=()=>{URL.revokeObjectURL(url);this.status("No se pudo abrir la imagen.");};
      img.src=url;
    }
    _moveSelectedLayer(direction) {
      if(!this.selected)return;
      const index=this.items.indexOf(this.selected), target=index+direction;
      if(target<0||target>=this.items.length)return;
      const [item]=this.items.splice(index,1);this.items.splice(target,0,item);
      this._refreshLayers();this.engine.draw(0);
    }
    _refreshLayers() {
      const select=this.ui.querySelector("#layerSelect"), old=this.selected?.id || "";
      select.innerHTML='<option value="">Ninguna</option>';
      this.items.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.name;select.append(o);});
      select.value=old;
      this._syncInputs();
    }
    _syncInputs() {
      const x=this.selected, $=id=>this.ui.querySelector("#"+id);
      if(!x)return;
      $("layerX").value=Math.round(x.x);
      $("layerY").value=Math.round(x.y);
      $("layerScale").value=Math.round(x.scale*100);
      $("layerRotation").value=Math.round(x.rotation*180/Math.PI);
      $("layerOpacity").value=Math.round((x.opacity ?? 1)*100);
      $("layerFlip").value=x.flipX?"yes":"no";
    }
    _drawBackground(ctx,time) {
      const t=Number.isFinite(time)?time:(window.nexoraVisualEditorTime||0);
      if(!this.background || t<this.backgroundStartTime || (this.backgroundEndTime!=null && t>this.backgroundEndTime))return;
      const w=this.engine.width,h=this.engine.height,scale=Math.max(w/this.background.width,h/this.background.height);
      const transform=this.backgroundTransform || {x:0,y:0,scale:1};
      scale *= transform.scale || 1;
      const dw=this.background.width*scale,dh=this.background.height*scale;
      ctx.drawImage(this.background,(w-dw)/2+(transform.x||0),(h-dh)/2+(transform.y||0),dw,dh);
    }
    draw(ctx,time) {
      for(const item of this.items) {
        const w=item.image.width*item.scale,h=item.image.height*item.scale;
        ctx.save();ctx.globalAlpha=item.opacity ?? 1;ctx.translate(item.x,item.y);ctx.rotate(item.rotation);
        ctx.scale(item.flipX?-1:1,1);
        ctx.drawImage(item.image,-w/2,-h/2,w,h);
        if(item===this.selected){ctx.strokeStyle="#6da8ff";ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(-w/2,-h/2,w,h);}
        ctx.restore();
      }
    }
    captureFrame() {
      if (!this.sequence) { this.status("No se encontró la línea de tiempo de fotogramas."); return; }
      if (!this.background && !this.items.length) { this.status("Agrega un fondo o un personaje antes de guardar el fotograma."); return; }
      const frameCanvas=document.createElement("canvas");
      frameCanvas.width=this.engine.width;frameCanvas.height=this.engine.height;
      const ctx=frameCanvas.getContext("2d");
      ctx.fillStyle="#080c14";ctx.fillRect(0,0,frameCanvas.width,frameCanvas.height);
      this._drawBackground(ctx);
      for(const item of this.items){
        const w=item.image.width*item.scale,h=item.image.height*item.scale;
        ctx.save();ctx.globalAlpha=item.opacity ?? 1;ctx.translate(item.x,item.y);ctx.rotate(item.rotation);ctx.scale(item.flipX?-1:1,1);
        ctx.drawImage(item.image,-w/2,-h/2,w,h);ctx.restore();
      }
      let frame;
      if(this.editingFrame){
        frame=this.editingFrame;frame.image=frameCanvas;frame.width=frameCanvas.width;frame.height=frameCanvas.height;
      }else{
        frame=this.sequence.addImage(frameCanvas,"Composición "+(this.sequence.count+1));
      }
      frame.composition={background:this.background,backgroundTransform:{...this.backgroundTransform},backgroundTiming:{startTime:this.backgroundStartTime,endTime:this.backgroundEndTime},items:this.items.map(item=>({...item}))};
      frame.thumb=frameCanvas.toDataURL("image/jpeg",0.78);
      this.editingFrame=null;
      this.onFrameCaptured();
      this.status("Fotograma actualizado y guardado. Puedes editar otro o continuar con el siguiente.");
    }
    loadComposition(frame) {
      if(!frame)return;
      const composition=frame.composition || {background:frame.image,backgroundTransform:{x:0,y:0,scale:1},items:[]};
      this.background=composition.background || null;
      this.backgroundTransform={x:0,y:0,scale:1,...(composition.backgroundTransform||{})};
      this.backgroundStartTime=composition.backgroundTiming?.startTime??0;
      this.backgroundEndTime=composition.backgroundTiming?.endTime??null;
      this.items=(composition.items||[]).map(item=>({...item}));
      this.selected=this.items[0]||null;
      this.editingFrame=frame;
      this._refreshLayers();
      this.engine.draw(0);
      this.status("Editando "+frame.name+". Pulsa Guardar composición para actualizar este fotograma.");
    }
    setEditingVisible(visible) {
      this.engine.updateLayer(this.backgroundLayer,{visible});
      this.engine.updateLayer(this.objectLayer,{visible});
    }
    _bindCanvas() {
      let dragging=false,last=null;
      const point=e=>{const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*this.engine.width/r.width,y:(e.clientY-r.top)*this.engine.height/r.height};};
      this.canvas.addEventListener("pointerdown",e=>{const p=point(e);for(let i=this.items.length-1;i>=0;i--){const x=this.items[i],w=x.image.width*x.scale,h=x.image.height*x.scale;if(p.x>=x.x-w/2&&p.x<=x.x+w/2&&p.y>=x.y-h/2&&p.y<=x.y+h/2){this.selected=x;this.ui.querySelector("#layerSelect").value=x.id;this._syncInputs();dragging=true;last=p;this.canvas.setPointerCapture(e.pointerId);break;}}});
      this.canvas.addEventListener("pointermove",e=>{if(!dragging||!this.selected)return;const p=point(e);this.selected.x+=p.x-last.x;this.selected.y+=p.y-last.y;last=p;this.ui.querySelector("#layerX").value=Math.round(this.selected.x);this.ui.querySelector("#layerY").value=Math.round(this.selected.y);this.engine.draw(0);});
      const stop=()=>{dragging=false;last=null;};this.canvas.addEventListener("pointerup",stop);this.canvas.addEventListener("pointercancel",stop);
    }
    _imageData(image) {
      if(!image) return null;
      const canvas=document.createElement("canvas");
      canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d");
      ctx.drawImage(image,0,0);
      return canvas.toDataURL("image/png");
    }
    _dataImage(data) {
      return new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error("Una imagen del proyecto está dañada"));
        img.src=data;
      });
    }
    _blobData(blob) {
      return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(reader.error||new Error("No se pudo leer el audio"));
        reader.readAsDataURL(blob);
      });
    }
    async saveProjectFile() {
      if(!this.sequence){this.status("No hay una secuencia disponible para guardar.");return;}
      const button=this.ui.querySelector("#saveProject");
      button.disabled=true;button.textContent="Preparando proyecto…";
      try {
        const frames=this.sequence.frames.map(frame=>({
          name:frame.name,
          durationFrames:frame.durationFrames||1,
          image:this._imageData(frame.image),
          composition:frame.composition?{
            background:this._imageData(frame.composition.background),
            backgroundTransform:{...frame.composition.backgroundTransform},
            backgroundTiming:{...(frame.composition.backgroundTiming||{startTime:0,endTime:null})},
            items:frame.composition.items.map(item=>({
              name:item.name,image:this._imageData(item.image),x:item.x,y:item.y,
              scale:item.scale,rotation:item.rotation,opacity:item.opacity,flipX:!!item.flipX,
              startTime:item.startTime,endTime:item.endTime,keyframes:(item.keyframes||[]).map(k=>({...k}))
            }))
          }:null
        }));
        const audio=[];
        for(const track of this.audio.tracks){
          const blob=await fetch(track.src).then(r=>{if(!r.ok)throw new Error("No se pudo leer "+track.name);return r.blob();});
          audio.push({name:track.name,kind:track.kind,start:track.start,trimStart:track.trimStart,
            trimEnd:track.trimEnd,volume:track.volume,pan:track.pan,fadeIn:track.fadeIn,
            fadeOut:track.fadeOut,loop:track.loop,mute:track.mute,data:await this._blobData(blob)});
        }
        const currentScene={
          background:this._imageData(this.background),
          backgroundTransform:{...this.backgroundTransform},
          backgroundTiming:{startTime:this.backgroundStartTime,endTime:this.backgroundEndTime},
          items:this.items.map(item=>({name:item.name,image:this._imageData(item.image),x:item.x,y:item.y,
            scale:item.scale,rotation:item.rotation,opacity:item.opacity,flipX:!!item.flipX,
            startTime:item.startTime,endTime:item.endTime,keyframes:(item.keyframes||[]).map(k=>({...k}))}))
        };
        const project={format:"nexora-animate-project",version:1,createdAt:new Date().toISOString(),
          sequence:{fps:this.sequence.fps,loop:this.sequence.loop,onionSkin:this.sequence.onionSkin,frames},audio,currentScene};
        const blob=new Blob([JSON.stringify(project)],{type:"application/json"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download=(document.title||"nexora-animate").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".nexora.json";
        a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
        this.status("Proyecto guardado. Conserva el archivo .nexora.json para volver a abrirlo.");
      } catch(err){this.status("No se pudo guardar: "+err.message);}
      finally{button.disabled=false;button.textContent="Guardar proyecto";}
    }
    async openProjectFile(file) {
      const project=JSON.parse(await file.text());
      if(project.format!=="nexora-animate-project"||project.version!==1||!project.sequence||!Array.isArray(project.sequence.frames)||!Array.isArray(project.audio))
        throw new Error("El archivo no es un proyecto NEXORA ANIMATE compatible");
      const frames=[];
      for(const saved of project.sequence.frames){
        const image=await this._dataImage(saved.image);
        let composition=null;
        if(saved.composition){
          const background=saved.composition.background?await this._dataImage(saved.composition.background):null;
          const items=[];
          for(const item of saved.composition.items||[]){
            items.push({...item,image:await this._dataImage(item.image)});
          }
          composition={background,backgroundTransform:{x:0,y:0,scale:1,...saved.composition.backgroundTransform},
            backgroundTiming:{startTime:saved.composition.backgroundTiming?.startTime??0,endTime:saved.composition.backgroundTiming?.endTime??null},items};
        }
        frames.push({image,name:saved.name||"Fotograma",durationFrames:saved.durationFrames||1,composition});
      }
      let currentScene=null;
      if(project.currentScene){
        const background=project.currentScene.background?await this._dataImage(project.currentScene.background):null;
        const items=[];
        for(const item of project.currentScene.items||[]) items.push({...item,image:await this._dataImage(item.image)});
        currentScene={background,backgroundTransform:{x:0,y:0,scale:1,...project.currentScene.backgroundTransform},
          backgroundTiming:{startTime:project.currentScene.backgroundTiming?.startTime??0,endTime:project.currentScene.backgroundTiming?.endTime??null},items};
      }
      const audio=[];
      for(const track of project.audio){
        const blob=await fetch(track.data).then(r=>r.blob());
        audio.push({blob,options:{name:track.name,kind:track.kind,start:track.start,trimStart:track.trimStart,
          trimEnd:track.trimEnd,volume:track.volume,pan:track.pan,fadeIn:track.fadeIn,
          fadeOut:track.fadeOut,loop:track.loop,mute:track.mute}});
      }
      this.stopAudio();this.audio.clear();
      this.sequence.clear();
      this.sequence.setFps(project.sequence.fps||12);
      this.sequence.setLoop(project.sequence.loop||"loop");
      this.sequence.onionSkin=!!project.sequence.onionSkin;
      for(const saved of frames){
        const frame=this.sequence.addImage(saved.image,saved.name);
        frame.composition=saved.composition;
        frame.durationFrames=saved.durationFrames||1;
        frame.thumb=this._imageData(saved.image);
      }
      for(const track of audio)this.audio.add(track.blob,track.options);
      const fps=document.getElementById("seqFps"),fpsValue=document.getElementById("seqFpsValue");
      const loop=document.getElementById("seqLoop"),onion=document.getElementById("seqOnion");
      if(fps)fps.value=this.sequence.fps;
      if(fpsValue)fpsValue.textContent=this.sequence.fps;
      if(loop)loop.value=this.sequence.loop;
      if(onion)onion.value=this.sequence.onionSkin?"on":"off";
      this.background=currentScene?.background||null;
      this.backgroundTransform={x:0,y:0,scale:1,...(currentScene?.backgroundTransform||{})};
      this.backgroundStartTime=currentScene?.backgroundTiming?.startTime??0;
      this.backgroundEndTime=currentScene?.backgroundTiming?.endTime??null;
      this.items=currentScene?.items||[];this.selected=this.items[0]||null;this.editingFrame=null;
      this._refreshLayers();this._renderAudio();this.setEditingVisible(!!currentScene);
      if(window.nexoraSequenceLayer)this.engine.updateLayer(window.nexoraSequenceLayer,{visible:!currentScene});
      this.onFrameCaptured();this.engine.draw(0);
      this.status("Proyecto abierto: "+this.sequence.count+" fotogramas y "+this.audio.tracks.length+" pistas de audio.");
    }
    _renderAudio() {
      const list=this.ui.querySelector("#audioTrackList");list.innerHTML="";
      if(!this.audio.tracks.length){list.textContent="Todavía no hay pistas de audio.";return;}
      this.audio.tracks.forEach(t=>{
        const row=document.createElement("div");
        row.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));align-items:center;gap:8px;padding:9px 0;border-top:1px solid rgba(160,180,220,.12)";
        const label=document.createElement("span");label.textContent=t.kind+" · "+t.name;label.style.cssText="overflow:hidden;text-overflow:ellipsis";
        const makeNumber=(caption,value,step,onChange)=>{const wrap=document.createElement("label");wrap.textContent=caption;const input=document.createElement("input");input.type="number";input.min="0";input.step=step;input.value=value===null?"":String(value);input.placeholder="fin";input.style.width="100%";input.addEventListener("change",()=>onChange(input.value));wrap.append(input);return wrap;};
        const startWrap=makeNumber("Inicio s",t.start,".1",v=>this.audio.update(t.id,{start:Number(v)||0}));
        const trimIn=makeNumber("Corte inicial s",t.trimStart,".1",v=>this.audio.update(t.id,{trimStart:Number(v)||0}));
        const trimOut=makeNumber("Corte final s",t.trimEnd,".1",v=>this.audio.update(t.id,{trimEnd:v===""?null:Number(v)}));
        const volumeWrap=document.createElement("label");volumeWrap.textContent="Volumen";
        const volume=document.createElement("input");volume.type="range";volume.min="0";volume.max="200";volume.value=String(Math.round(t.volume*100));
        volume.addEventListener("input",()=>this.audio.update(t.id,{volume:Number(volume.value)/100}));
        volumeWrap.append(volume);
        const mute=document.createElement("button");mute.className="button button-outline";mute.textContent=t.mute?"Activar":"Silenciar";mute.addEventListener("click",()=>{this.audio.update(t.id,{mute:!t.mute});this._renderAudio();});
        const del=document.createElement("button");del.className="button button-outline";del.textContent="Quitar";del.addEventListener("click",()=>{this.audio.remove(t.id);this._renderAudio();});
        row.append(label,startWrap,trimIn,trimOut,volumeWrap,mute,del);list.append(row);
      });
    }
    async playAudio(){if(this.audio.tracks.length)await this.audio.play();}
    stopAudio(){this.audio.stop();}
    getAudioTracks(){return this.audio.exportTracks();}
    getDuration(){return Math.max(0,...this.audio.tracks.map(t=>t.start+5));}
  }
  window.NexoraStudioEditor={StudioEditor};
})();