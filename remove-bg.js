(() => {
  const $ = (id) => document.getElementById(id);
  const fileInput=$("rb-file"), drop=$("rb-drop"), editor=$("rb-editor"), upload=$("rb-drop");
  const original=$("rb-original"), canvas=$("rb-canvas"), ctx=canvas.getContext("2d",{willReadFrequently:true});
  const removeBtn=$("rb-remove"), downloadBtn=$("rb-download"), status=$("rb-status");
  const progress=$("rb-progress"), progressText=$("rb-progress-text"), progressPercent=$("rb-progress-percent"), progressBar=$("rb-progress-bar");
  const refine=$("rb-refine"), brushInput=$("rb-brush"), brushValue=$("rb-brush-value");
  let sourceImage=null, sourceURL=null, activeFile=null, resultBlob=null, maskCanvas=null, maskCtx=null, brushMode="erase", brushSize=34, isDrawing=false, lastPoint=null, undoStack=[], redoStack=[], background="transparent", aiFunction=null, busy=false;

  function say(message,type=""){status.textContent=message;status.className="rb-status "+type}
  function formatSize(bytes){return bytes<1048576?(bytes/1024).toFixed(0)+" KB":(bytes/1048576).toFixed(1)+" MB"}
  function resetHistory(){undoStack=[];redoStack=[];updateHistory()}
  function updateHistory(){$("rb-undo").disabled=!undoStack.length;$("rb-redo").disabled=!redoStack.length}
  async function saveHistory(){if(!maskCanvas)return;const snapshot=await new Promise(resolve=>maskCanvas.toBlob(resolve,"image/png"));if(!snapshot)return;undoStack.push(snapshot);if(undoStack.length>6)undoStack.shift();redoStack=[];updateHistory()}\n  async function restoreSnapshot(blob){const bitmap=await createImageBitmap(blob);maskCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);maskCtx.drawImage(bitmap,0,0);bitmap.close?.();drawResult()}
  function setCanvasSize(w,h){canvas.width=w;canvas.height=h;maskCanvas=document.createElement("canvas");maskCanvas.width=w;maskCanvas.height=h;maskCtx=maskCanvas.getContext("2d",{willReadFrequently:true})}
  function drawResult(){
    if(!sourceImage||!maskCanvas)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(sourceImage,0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation="destination-in";ctx.drawImage(maskCanvas,0,0);ctx.globalCompositeOperation="source-over";
  }
  function loadFile(file){
    if(!file||!file.type.startsWith("image/")){say("Selecciona un archivo de imagen válido.","error");return}
    if(file.size>30*1024*1024){say("La imagen supera 30 MB. Reduce su tamaño e inténtalo de nuevo.","error");return}
    if(sourceURL)URL.revokeObjectURL(sourceURL);
    activeFile=file;sourceURL=URL.createObjectURL(file);sourceImage=new Image();
    sourceImage.onload=()=>{
      const scale=Math.min(1,4096/Math.max(sourceImage.naturalWidth,sourceImage.naturalHeight));
      const w=Math.max(1,Math.round(sourceImage.naturalWidth*scale)),h=Math.max(1,Math.round(sourceImage.naturalHeight*scale));
      setCanvasSize(w,h);ctx.drawImage(sourceImage,0,0,w,h);
      original.src=sourceURL;original.alt="Original: "+file.name;
      $("rb-fileinfo").textContent=file.name+" · "+w+" × "+h+" · "+formatSize(file.size);
      $("rb-editor").hidden=false;upload.hidden=true;refine.hidden=true;downloadBtn.disabled=true;removeBtn.disabled=false;
      $("rb-reset").disabled=false;resultBlob=null;resetHistory();
      say("Imagen lista. Pulsa «Quitar fondo con IA» para comenzar.");
    };
    sourceImage.onerror=()=>say("No se pudo abrir esta imagen. Prueba con JPG, PNG o WEBP.","error");
    sourceImage.src=sourceURL;
  }
  fileInput.addEventListener("change",e=>loadFile(e.target.files[0]));
  ["dragenter","dragover"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add("dragover")}));
  ["dragleave","drop"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove("dragover")}));
  drop.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));

  async function getEngine(){
    if(aiFunction)return aiFunction;
    say("Cargando el motor de IA. La primera vez puede tardar…");
    const module=await import("https://esm.sh/@imgly/background-removal@1.7.0?bundle");
    aiFunction=module.default||module.removeBackground||module;
    if(typeof aiFunction!=="function")throw new Error("No se pudo iniciar el motor de eliminación.");
    return aiFunction;
  }
  removeBtn.addEventListener("click",async()=>{
    if(!sourceImage||busy)return;
    busy=true;removeBtn.disabled=true;downloadBtn.disabled=true;progress.hidden=false;
    progressBar.style.width="0%";progressPercent.textContent="0%";progressText.textContent="Preparando IA…";
    say("Procesando en tu dispositivo. No cierres esta pestaña.");
    try{
      const engine=await getEngine();
      const file=activeFile;
      if(!file)throw new Error("No se encontró el archivo seleccionado.");
      const blob=await engine(file,{
        progress:(key,current,total)=>{
          const pct=total?Math.max(0,Math.min(100,Math.round(current/total*100))):0;
          progressText.textContent=key==="fetch:model"?"Descargando modelo de IA…":key==="compute:inference"?"Analizando y separando el sujeto…":"Preparando recursos…";
          progressPercent.textContent=pct+"%";progressBar.style.width=pct+"%";
        }
      });
      const resultURL=URL.createObjectURL(blob),resultImage=new Image();
      await new Promise((resolve,reject)=>{resultImage.onload=resolve;resultImage.onerror=reject;resultImage.src=resultURL});
      maskCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);
      const temp=document.createElement("canvas");temp.width=canvas.width;temp.height=canvas.height;
      const tctx=temp.getContext("2d",{willReadFrequently:true});tctx.drawImage(resultImage,0,0,canvas.width,canvas.height);
      const rgba=tctx.getImageData(0,0,temp.width,temp.height),mask=maskCtx.createImageData(temp.width,temp.height);
      for(let i=0;i<rgba.data.length;i+=4){mask.data[i]=255;mask.data[i+1]=255;mask.data[i+2]=255;mask.data[i+3]=rgba.data[i+3]}
      maskCtx.putImageData(mask,0,0);URL.revokeObjectURL(resultURL);
      resultBlob=blob;drawResult();resetHistory();refine.hidden=false;downloadBtn.disabled=false;
      progressPercent.textContent="100%";progressBar.style.width="100%";progressText.textContent="Recorte terminado";
      $("rb-result-label").textContent="Fondo eliminado";
      say("¡Listo! El fondo se eliminó. Puedes retocar los bordes y descargar tu PNG transparente.","success");
    }catch(error){console.error(error);say("No se pudo procesar la imagen: "+(error.message||"error desconocido")+". Comprueba tu conexión e inténtalo de nuevo.","error")}
    finally{busy=false;removeBtn.disabled=false;downloadBtn.disabled=!refine.hidden?false:true}
  });

  document.querySelectorAll("[data-brush]").forEach(button=>button.addEventListener("click",()=>{
    brushMode=button.dataset.brush;document.querySelectorAll("[data-brush]").forEach(b=>b.classList.toggle("active",b===button));
  }));
  brushInput.addEventListener("input",()=>{brushSize=Number(brushInput.value);brushValue.textContent=brushSize+" px"});
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}}
  function paint(e){const p=point(e);maskCtx.save();maskCtx.globalCompositeOperation="source-over";maskCtx.globalAlpha=1;maskCtx.fillStyle=brushMode==="erase"?"rgba(255,255,255,0)":"rgba(255,255,255,1)";maskCtx.globalCompositeOperation=brushMode==="erase"?"destination-out":"source-over";maskCtx.beginPath();maskCtx.arc(p.x,p.y,brushSize/2,0,Math.PI*2);maskCtx.fill();maskCtx.restore();drawResult()}
  canvas.addEventListener("pointerdown",e=>{if(refine.hidden||!maskCanvas)return;isDrawing=true;saveHistory();canvas.setPointerCapture(e.pointerId);paint(e)});
  canvas.addEventListener("pointermove",e=>{if(isDrawing)paint(e)});
  ["pointerup","pointercancel","lostpointercapture"].forEach(n=>canvas.addEventListener(n,()=>{isDrawing=false}));
  $("rb-undo").addEventListener("click",()=>{if(!undoStack.length)return;redoStack.push(maskCtx.getImageData(0,0,maskCanvas.width,maskCanvas.height));maskCtx.putImageData(undoStack.pop(),0,0);drawResult();updateHistory()});
  $("rb-redo").addEventListener("click",()=>{if(!redoStack.length)return;undoStack.push(maskCtx.getImageData(0,0,maskCanvas.width,maskCanvas.height));maskCtx.putImageData(redoStack.pop(),0,0);drawResult();updateHistory()});

  function setBackground(value){background=value;$("rb-result-stage").style.backgroundColor=value==="transparent"?"#f5f5f5":value;document.querySelectorAll(".rb-swatch").forEach(b=>b.classList.toggle("active",b.dataset.bg===value))}
  document.querySelectorAll(".rb-swatch").forEach(b=>b.addEventListener("click",()=>setBackground(b.dataset.bg)));
  $("rb-custom-bg").addEventListener("input",e=>{setBackground(e.target.value);document.querySelectorAll(".rb-swatch").forEach(b=>b.classList.remove("active"))});
  downloadBtn.addEventListener("click",()=>{
    if(!maskCanvas||!sourceImage)return;
    drawResult();canvas.toBlob(blob=>{if(!blob){say("No se pudo generar el PNG.","error");return}const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nexora-recorte-transparente.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);say("PNG descargado con transparencia real.","success")},"image/png");
  });
  $("rb-reset").addEventListener("click",()=>{
    if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=null;sourceImage=null;activeFile=null;resultBlob=null;fileInput.value="";editor.hidden=true;upload.hidden=false;refine.hidden=true;progress.hidden=true;downloadBtn.disabled=true;removeBtn.disabled=false;$("rb-reset").disabled=true;$("rb-fileinfo").textContent="Aún no has cargado ningún archivo";say("Carga una imagen para comenzar.");resetHistory();
  });

  window.addEventListener("paste",event=>{
    const item=[...(event.clipboardData?.items||[])].find(entry=>entry.type.startsWith("image/"));
    if(item){const file=item.getAsFile();if(file){event.preventDefault();loadFile(new File([file],"imagen-del-portapapeles.png",{type:file.type||"image/png"}));}}
  });
  window.addEventListener("keydown",event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
    const tag=event.target?.tagName?.toLowerCase();
    if(tag==="input"||tag==="textarea"||event.target?.isContentEditable)return;
    if(event.key.toLowerCase()==="z"){event.preventDefault();(event.shiftKey?$("rb-redo"):$("rb-undo")).click();}
    else if(event.key.toLowerCase()==="y"){event.preventDefault();$("rb-redo").click();}
  });
  setBackground("transparent");
})();