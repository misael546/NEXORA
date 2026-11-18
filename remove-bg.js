(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const fileInput=$("rb-file"), drop=$("rb-drop"), upload=$("rb-drop"), editor=$("rb-editor");
  const original=$("rb-original"), canvas=$("rb-canvas"), ctx=canvas.getContext("2d",{willReadFrequently:true});
  const removeBtn=$("rb-remove"), downloadBtn=$("rb-download"), status=$("rb-status");
  const progress=$("rb-progress"), progressText=$("rb-progress-text"), progressPercent=$("rb-progress-percent"), progressBar=$("rb-progress-bar");
  const refine=$("rb-refine"), brushInput=$("rb-brush"), brushValue=$("rb-brush-value");
  const featherInput=$("rb-feather"), edgeInput=$("rb-edge");
  let sourceImage=null, sourceURL=null, activeFile=null, maskCanvas=null, maskCtx=null;
  let brushMode="erase", brushSize=34, isDrawing=false, lastPoint=null;
  let undoStack=[],redoStack=[],aiFunction=null,busy=false,hasResult=false;
  let feather=0,edgeShift=0,previewBackground="transparent";
  const MAX_HISTORY=5;

  function say(message,type=""){status.textContent=message;status.className="rb-status "+type}
  function formatSize(bytes){return bytes<1048576?(bytes/1024).toFixed(0)+" KB":(bytes/1048576).toFixed(1)+" MB"}
  function updateHistory(){$("rb-undo").disabled=!undoStack.length;$("rb-redo").disabled=!redoStack.length}
  function resetHistory(){undoStack=[];redoStack=[];updateHistory()}
  function snapshot(){return new Promise(resolve=>maskCanvas.toBlob(resolve,"image/png"))}
  async function saveHistory(){
    const blob=await snapshot();
    if(!blob)return;
    undoStack.push(blob);
    if(undoStack.length>MAX_HISTORY)undoStack.shift();
    redoStack=[];
    updateHistory();
  }
  async function restore(blob){
    const bitmap=await createImageBitmap(blob);
    maskCtx.clearRect(0,0,maskCanvas.width,maskCanvas.height);
    maskCtx.drawImage(bitmap,0,0);
    bitmap.close?.();
    renderResult();
  }
  function setCanvasSize(width,height){
    canvas.width=width;canvas.height=height;
    maskCanvas=document.createElement("canvas");
    maskCanvas.width=width;maskCanvas.height=height;
    maskCtx=maskCanvas.getContext("2d",{willReadFrequently:true});
  }
  function processedMask(){
    const output=document.createElement("canvas");
    output.width=maskCanvas.width;output.height=maskCanvas.height;
    const out=output.getContext("2d",{willReadFrequently:true});
    if(feather>0){out.filter="blur("+feather+"px)";out.drawImage(maskCanvas,0,0);out.filter="none"}
    else out.drawImage(maskCanvas,0,0);
    if(edgeShift!==0){
      const image=out.getImageData(0,0,output.width,output.height);
      const shift=edgeShift*4;
      for(let i=3;i<image.data.length;i+=4){
        const value=image.data[i]+shift;
        image.data[i]=Math.max(0,Math.min(255,value));
      }
      out.putImageData(image,0,0);
    }
    return output;
  }
  function renderResult(){
    if(!sourceImage||!maskCanvas)return;
    const finalMask=processedMask();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(sourceImage,0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation="destination-in";
    ctx.drawImage(finalMask,0,0);
    ctx.globalCompositeOperation="source-over";
  }
  function loadFile(file){
    if(!file)return;
    if(!file.type.startsWith("image/")){say("El archivo no parece ser una imagen compatible.","error");return}
    if(file.size>30*1024*1024){say("La imagen supera 30 MB. Reduce su tamaño e inténtalo de nuevo.","error");return}
    if(sourceURL)URL.revokeObjectURL(sourceURL);
    activeFile=file;sourceURL=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{
      sourceImage=image;
      const scale=Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight));
      const width=Math.max(1,Math.round(image.naturalWidth*scale));
      const height=Math.max(1,Math.round(image.naturalHeight*scale));
      setCanvasSize(width,height);
      ctx.clearRect(0,0,width,height);
      ctx.drawImage(image,0,0,width,height);
      original.src=sourceURL;
      original.alt="Imagen original: "+file.name;
      $("rb-fileinfo").textContent=file.name+" · "+width+" × "+height+" · "+formatSize(file.size);
      editor.hidden=false;upload.hidden=true;refine.hidden=true;
      downloadBtn.disabled=true;removeBtn.disabled=false;$("rb-reset").disabled=false;
      hasResult=false;feather=0;edgeShift=0;
      featherInput.value="0";edgeInput.value="0";
      $("rb-feather-value").textContent="0 px";$("rb-edge-value").textContent="0";
      resetHistory();
      say("Imagen lista. Pulsa «Quitar fondo con IA» para comenzar.");
    };
    image.onerror=()=>say("No se pudo abrir esta imagen. Prueba con JPG, PNG o WEBP.","error");
    image.src=sourceURL;
  }
  fileInput.addEventListener("change",event=>loadFile(event.target.files?.[0]));
  ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add("dragover")}));
  ["dragleave","drop"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove("dragover")}));
  drop.addEventListener("drop",event=>loadFile(event.dataTransfer?.files?.[0]));

  async function getEngine(){
    if(aiFunction)return aiFunction;
    say("Cargando el motor de IA. La primera vez puede tardar…");
    const module=await import("https://esm.sh/@imgly/background-removal@1.7.0?bundle");
    aiFunction=module.default||module.removeBackground||module;
    if(typeof aiFunction!=="function")throw new Error("No se pudo iniciar el motor de eliminación.");
    return aiFunction;
  }
  removeBtn.addEventListener("click",async()=>{
    if(!sourceImage||busy||!activeFile)return;
    busy=true;removeBtn.disabled=true;downloadBtn.disabled=true;progress.hidden=false;
    progressBar.style.width="0%";progressPercent.textContent="0%";progressText.textContent="Preparando IA…";
    say("Procesando en tu dispositivo. No cierres esta pestaña.");
    try{
      const engine=await getEngine();
      const blob=await engine(activeFile,{progress:(key,current,total)=>{
        const percent=total?Math.max(0,Math.min(100,Math.round(current/total*100))):0;
        progressText.textContent=key==="fetch:model"?"Descargando modelo de IA…":key==="compute:inference"?"Analizando y separando el sujeto…":"Preparando recursos…";
        progressPercent.textContent=percent+"%";progressBar.style.width=percent+"%";
      }});
      const resultURL=URL.createObjectURL(blob);
      try{
        const resultImage=new Image();
        await new Promise((resolve,reject)=>{resultImage.onload=resolve;resultImage.onerror=()=>reject(new Error("La IA devolvió una imagen que no se pudo leer."));resultImage.src=resultURL});
        const temp=document.createElement("canvas");temp.width=canvas.width;temp.height=canvas.height;
        const tempCtx=temp.getContext("2d",{willReadFrequently:true});
        tempCtx.drawImage(resultImage,0,0,temp.width,temp.height);
        const rgba=tempCtx.getImageData(0,0,temp.width,temp.height);
        const mask=maskCtx.createImageData(temp.width,temp.height);
        for(let i=0;i<rgba.data.length;i+=4){mask.data[i]=255;mask.data[i+1]=255;mask.data[i+2]=255;mask.data[i+3]=rgba.data[i+3]}
        maskCtx.putImageData(mask,0,0);
      }finally{URL.revokeObjectURL(resultURL)}
      hasResult=true;renderResult();resetHistory();refine.hidden=false;downloadBtn.disabled=false;
      progressPercent.textContent="100%";progressBar.style.width="100%";progressText.textContent="Recorte terminado";
      $("rb-result-label").textContent="Fondo eliminado";
      say("¡Listo! Ajusta los bordes si lo necesitas y descarga tu PNG transparente.","success");
    }catch(error){
      console.error(error);
      say("No se pudo procesar la imagen: "+(error?.message||"error desconocido")+". Comprueba tu conexión e inténtalo de nuevo.","error");
    }finally{busy=false;removeBtn.disabled=false;downloadBtn.disabled=!hasResult}
  });

  document.querySelectorAll("[data-brush]").forEach(button=>button.addEventListener("click",()=>{
    brushMode=button.dataset.brush;
    document.querySelectorAll("[data-brush]").forEach(item=>item.classList.toggle("active",item===button));
  }));
  brushInput.addEventListener("input",()=>{brushSize=Number(brushInput.value);brushValue.textContent=brushSize+" px"});
  function pointerPosition(event){
    const rect=canvas.getBoundingClientRect();
    return{x:(event.clientX-rect.left)*(canvas.width/rect.width),y:(event.clientY-rect.top)*(canvas.height/rect.height)};
  }
  function paintAt(position){
    maskCtx.save();
    maskCtx.globalAlpha=1;
    maskCtx.globalCompositeOperation=brushMode==="erase"?"destination-out":"source-over";
    maskCtx.fillStyle="#fff";maskCtx.strokeStyle="#fff";
    maskCtx.lineWidth=brushSize;maskCtx.lineCap="round";maskCtx.lineJoin="round";
    maskCtx.beginPath();
    if(lastPoint){maskCtx.moveTo(lastPoint.x,lastPoint.y);maskCtx.lineTo(position.x,position.y);maskCtx.stroke()}
    else{maskCtx.arc(position.x,position.y,brushSize/2,0,Math.PI*2);maskCtx.fill()}
    maskCtx.restore();lastPoint=position;
    renderResult();
  }
  canvas.addEventListener("pointerdown",async event=>{
    if(refine.hidden||!maskCanvas||busy)return;
    event.preventDefault();isDrawing=true;lastPoint=null;
    canvas.setPointerCapture(event.pointerId);
    await saveHistory();
    if(isDrawing)paintAt(pointerPosition(event));
  });
  canvas.addEventListener("pointermove",event=>{
    if(!isDrawing)return;
    event.preventDefault();paintAt(pointerPosition(event));
  });
  ["pointerup","pointercancel","lostpointercapture"].forEach(type=>canvas.addEventListener(type,()=>{isDrawing=false;lastPoint=null}));

  $("rb-undo").addEventListener("click",async()=>{
    if(!undoStack.length||busy)return;
    const current=await snapshot();if(current)redoStack.push(current);
    await restore(undoStack.pop());updateHistory();
  });
  $("rb-redo").addEventListener("click",async()=>{
    if(!redoStack.length||busy)return;
    const current=await snapshot();if(current)undoStack.push(current);
    await restore(redoStack.pop());updateHistory();
  });

  function updateEdgeControls(){
    feather=Number(featherInput.value);edgeShift=Number(edgeInput.value);
    $("rb-feather-value").textContent=feather+" px";
    $("rb-edge-value").textContent=edgeShift>0?"+"+edgeShift:String(edgeShift);
    if(hasResult)renderResult();
  }
  featherInput.addEventListener("input",updateEdgeControls);
  edgeInput.addEventListener("input",updateEdgeControls);
  $("rb-edge-reset").addEventListener("click",()=>{
    featherInput.value="0";edgeInput.value="0";updateEdgeControls();
    say("Ajustes de borde restablecidos.");
  });

  function setBackground(value){
    previewBackground=value;
    $("rb-result-stage").style.backgroundColor=value==="transparent"?"#f5f5f5":value;
    document.querySelectorAll(".rb-swatch").forEach(button=>button.classList.toggle("active",button.dataset.bg===value));
  }
  document.querySelectorAll(".rb-swatch").forEach(button=>button.addEventListener("click",()=>setBackground(button.dataset.bg)));
  $("rb-custom-bg").addEventListener("input",event=>{
    setBackground(event.target.value);
    document.querySelectorAll(".rb-swatch").forEach(button=>button.classList.remove("active"));
  });

  downloadBtn.addEventListener("click",()=>{
    if(!hasResult||!maskCanvas||!sourceImage)return;
    renderResult();
    canvas.toBlob(blob=>{
      if(!blob){say("No se pudo generar el PNG.","error");return}
      const url=URL.createObjectURL(blob),anchor=document.createElement("a");
      anchor.href=url;anchor.download="nexora-recorte-transparente.png";
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      say("PNG descargado con canal alfa y transparencia real.","success");
    },"image/png");
  });
  $("rb-reset").addEventListener("click",()=>{
    if(sourceURL)URL.revokeObjectURL(sourceURL);
    sourceURL=null;sourceImage=null;activeFile=null;maskCanvas=null;maskCtx=null;hasResult=false;
    fileInput.value="";editor.hidden=true;upload.hidden=false;refine.hidden=true;progress.hidden=true;
    downloadBtn.disabled=true;removeBtn.disabled=false;$("rb-reset").disabled=true;
    $("rb-fileinfo").textContent="Aún no has cargado ningún archivo";
    resetHistory();say("Carga una imagen para comenzar.");
  });

  window.addEventListener("paste",event=>{
    const item=[...(event.clipboardData?.items||[])].find(entry=>entry.type.startsWith("image/"));
    const file=item?.getAsFile();
    if(file){event.preventDefault();loadFile(new File([file],"imagen-del-portapapeles.png",{type:file.type||"image/png"}))}
  });
  window.addEventListener("keydown",event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
    const tag=event.target?.tagName?.toLowerCase();
    if(tag==="input"||tag==="textarea"||event.target?.isContentEditable)return;
    const key=event.key.toLowerCase();
    if(key==="z"){event.preventDefault();(event.shiftKey?$("rb-redo"):$("rb-undo")).click()}
    else if(key==="y"){event.preventDefault();$("rb-redo").click()}
  });
  setBackground("transparent");
})();