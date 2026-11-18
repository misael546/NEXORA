/* NEXORA ANIMATE — editor de capas y audio sincronizado.
 * Composición 2D por imágenes; no utiliza esqueletos ni articulaciones.
 */
(() => {
  "use strict";
  class StudioEditor {
    constructor(engine, canvas, host, status) {
      this.engine = engine;
      this.canvas = canvas;
      this.host = host;
      this.status = status || (() => {});
      this.background = null;
      this.items = [];
      this.selected = null;
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
        <p class="studio-note">Carga un escenario y coloca personajes PNG transparentes encima. Selecciona una capa y arrástrala directamente en el lienzo. Puedes definir un desplazamiento automático para cada elemento.</p>
        <div class="studio-controls">
          <div><label>Imagen de fondo</label><input id="layerBackground" type="file" accept="image/*"></div>
          <div><label>Personaje u objeto PNG</label><input id="layerImage" type="file" accept="image/*"></div>
          <div><label>Capa seleccionada</label><select id="layerSelect"><option value="">Ninguna</option></select></div>
          <div><label>Tamaño (%)</label><input id="layerScale" type="range" min="10" max="250" value="100"></div>
          <div><label>Rotación (grados)</label><input id="layerRotation" type="range" min="-180" max="180" value="0"></div>
          <div><label>Duración de escena (s)</label><input id="layerDuration" type="number" min="1" max="120" value="5"></div>
          <div><label>Desplazamiento horizontal final (px)</label><input id="layerMoveX" type="number" value="120"></div>
          <div><label>Desplazamiento vertical final (px)</label><input id="layerMoveY" type="number" value="0"></div>
        </div>
        <div class="studio-actions"><button class="button button-outline" id="layerAnimate" type="button">Aplicar movimiento</button><button class="button button-outline" id="layerDelete" type="button">Eliminar capa</button></div>
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
      $("layerBackground").addEventListener("change", e => this._loadImage(e.target.files[0], img => { this.background = img; this.engine.draw(0); this.status("Fondo cargado."); }));
      $("layerImage").addEventListener("change", e => this._loadImage(e.target.files[0], img => {
        const item = { id: "layer_" + Date.now() + "_" + Math.random().toString(36).slice(2,6), name: e.target.files[0].name, image: img, x: this.engine.width/2, y: this.engine.height/2, scale: 1, rotation: 0, moveX: 0, moveY: 0, duration: 5 };
        this.items.push(item); this.selected = item; this._refreshLayers(); this.engine.draw(0); this.status("Personaje agregado. Arrástralo sobre el escenario.");
      }));
      $("layerSelect").addEventListener("change", () => { this.selected = this.items.find(x => x.id === $("layerSelect").value) || null; this._syncInputs(); });
      $("layerScale").addEventListener("input", e => { if(this.selected){this.selected.scale=Number(e.target.value)/100;this.engine.draw(0);} });
      $("layerRotation").addEventListener("input", e => { if(this.selected){this.selected.rotation=Number(e.target.value)*Math.PI/180;this.engine.draw(0);} });
      $("layerAnimate").addEventListener("click", () => { if(!this.selected)return; this.selected.moveX=Number($("layerMoveX").value)||0; this.selected.moveY=Number($("layerMoveY").value)||0; this.selected.duration=Math.max(1,Number($("layerDuration").value)||5); this.engine.draw(0); this.status("Movimiento aplicado a la capa seleccionada."); });
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
      $("layerScale").value=Math.round(x.scale*100);
      $("layerRotation").value=Math.round(x.rotation*180/Math.PI);
      $("layerMoveX").value=x.moveX;
      $("layerMoveY").value=x.moveY;
      $("layerDuration").value=x.duration;
    }
    _drawBackground(ctx) {
      if(!this.background)return;
      const w=this.engine.width,h=this.engine.height,scale=Math.max(w/this.background.width,h/this.background.height);
      const dw=this.background.width*scale,dh=this.background.height*scale;
      ctx.drawImage(this.background,(w-dw)/2,(h-dh)/2,dw,dh);
    }
    draw(ctx,time) {
      for(const item of this.items) {
        const p=Math.max(0,Math.min(1,time/Math.max(.1,item.duration)));
        const x=item.x+item.moveX*p,y=item.y+item.moveY*p;
        const w=item.image.width*item.scale,h=item.image.height*item.scale;
        ctx.save();ctx.translate(x,y);ctx.rotate(item.rotation);
        ctx.drawImage(item.image,-w/2,-h/2,w,h);
        if(item===this.selected){ctx.strokeStyle="#6da8ff";ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(-w/2,-h/2,w,h);}
        ctx.restore();
      }
    }
    _bindCanvas() {
      let dragging=false,last=null;
      const point=e=>{const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*this.engine.width/r.width,y:(e.clientY-r.top)*this.engine.height/r.height};};
      this.canvas.addEventListener("pointerdown",e=>{const p=point(e);for(let i=this.items.length-1;i>=0;i--){const x=this.items[i],w=x.image.width*x.scale,h=x.image.height*x.scale;if(p.x>=x.x-w/2&&p.x<=x.x+w/2&&p.y>=x.y-h/2&&p.y<=x.y+h/2){this.selected=x;this.ui.querySelector("#layerSelect").value=x.id;this._syncInputs();dragging=true;last=p;this.canvas.setPointerCapture(e.pointerId);break;}}});
      this.canvas.addEventListener("pointermove",e=>{if(!dragging||!this.selected)return;const p=point(e);this.selected.x+=p.x-last.x;this.selected.y+=p.y-last.y;last=p;this.engine.draw(0);});
      const stop=()=>{dragging=false;last=null;};this.canvas.addEventListener("pointerup",stop);this.canvas.addEventListener("pointercancel",stop);
    }
    _renderAudio() {
      const list=this.ui.querySelector("#audioTrackList");list.innerHTML="";
      if(!this.audio.tracks.length){list.textContent="Todavía no hay pistas de audio.";return;}
      this.audio.tracks.forEach(t=>{const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(160,180,220,.12)";
        const label=document.createElement("span");label.style.flex="1";label.textContent=t.kind+" · "+t.name+" · inicio "+t.start.toFixed(1)+" s";
        const mute=document.createElement("button");mute.className="button button-outline";mute.textContent=t.mute?"Activar":"Silenciar";mute.addEventListener("click",()=>{this.audio.update(t.id,{mute:!t.mute});this._renderAudio();});
        const del=document.createElement("button");del.className="button button-outline";del.textContent="Quitar";del.addEventListener("click",()=>{this.audio.remove(t.id);this._renderAudio();});
        row.append(label,mute,del);list.append(row);
      });
    }
    async playAudio(){if(this.audio.tracks.length)await this.audio.play();}
    stopAudio(){this.audio.stop();}
    getAudioTracks(){return this.audio.exportTracks();}
    getDuration(){return Math.max(0,...this.audio.tracks.map(t=>t.start+5));}
  }
  window.NexoraStudioEditor={StudioEditor};
})();