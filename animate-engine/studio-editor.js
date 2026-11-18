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
        visible: true, draw: (ctx) => this._drawBackground(ctx)
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
        <h2 style="margin:0 0 8px">Composición por capas</h2>
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
      const $ = id => section.querySelector("#" + id);
      $("layerBackground").addEventListener("change", e => this._loadImage(e.target.files[0], img => { this.background = img; this.backgroundTransform = { x: 0, y: 0, scale: 1 }; this.engine.draw(0); this.status("Fondo cargado. Ajusta su zoom y posición si lo necesitas."); }));
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
    _drawBackground(ctx) {
      if(!this.background)return;
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
      frame.composition={background:this.background,backgroundTransform:{...this.backgroundTransform},items:this.items.map(item=>({...item}))};
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