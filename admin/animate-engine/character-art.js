/* NEXORA ANIMATE — original 2D character artwork rendered as articulated vector layers. */
(()=>{"use strict";
const ease=t=>{const v=Math.max(0,Math.min(1,Number(t)||0));return v*v*(3-2*v)};
const point=(p,w,h)=>({x:p.x*w,y:p.y*h});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const unit=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}};
const gradient=(ctx,a,b,stops)=>{if(typeof ctx.createLinearGradient!=="function")return stops?.[0]?.[1]||"#748b78";const g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);for(const s of stops)g.addColorStop(s[0],s[1]);return g};
function segment(ctx,a,b,width,fill,outline="#17202d",highlight=null){if(!a||!b)return;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=outline;ctx.lineWidth=width+5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(highlight){const n=unit(a,b),off={x:-n.y*width*.22,y:n.x*width*.22};ctx.strokeStyle=highlight;ctx.globalAlpha=.48;ctx.lineWidth=Math.max(2,width*.18);ctx.beginPath();ctx.moveTo(a.x+off.x,a.y+off.y);ctx.lineTo(b.x+off.x,b.y+off.y);ctx.stroke()}ctx.restore()}
function ellipse(ctx,p,rx,ry,fill,stroke="#1a2431",line=3,rotation=0){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rotation);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=line;ctx.strokeStyle=stroke;ctx.stroke()}ctx.restore()}
function polygon(ctx,pts,fill,stroke="#1a2431",line=3){if(pts.length<3)return;ctx.save();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin="round";ctx.stroke()}ctx.restore()}
function limb(ctx,a,b,width,fill,highlight){segment(ctx,a,b,width,fill,"#182231",highlight);ellipse(ctx,b,width*.38,width*.38,fill,"#182231",2)}
function bezierShape(ctx,start,curves,fill,stroke="#182231",line=3){ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);for(const c of curves){if(typeof ctx.bezierCurveTo==="function")ctx.bezierCurveTo(c[0],c[1],c[2],c[3],c[4],c[5]);else ctx.lineTo(c[4],c[5])}ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin="round";ctx.stroke()}ctx.restore()}
function organicLimb(ctx,a,b,widthA,widthB,fill,highlight="#d1e0ad",outline="#182231"){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,v={x:dx/len,y:dy/len},n={x:-dy/len,y:dx/len},ra=widthA/2,rb=widthB/2;
 const off=(p,d,r)=>({x:p.x+d.x*r,y:p.y+d.y*r}),ap=off(a,n,ra),bp=off(b,n,rb),bm=off(b,n,-rb),am=off(a,n,-ra);
 bezierShape(ctx,ap,[
  [a.x+v.x*len*.32+n.x*ra*.92,a.y+v.y*len*.32+n.y*ra*.92,b.x-v.x*len*.3+n.x*rb*.92,b.y-v.y*len*.3+n.y*rb*.92,bp.x,bp.y],
  [b.x+v.x*rb*.42+n.x*rb*.5,b.y+v.y*rb*.42+n.y*rb*.5,b.x+v.x*rb*.42-n.x*rb*.5,b.y+v.y*rb*.42-n.y*rb*.5,bm.x,bm.y],
  [b.x-v.x*len*.3-n.x*rb*.92,b.y-v.y*len*.3-n.y*rb*.92,a.x+v.x*len*.32-n.x*ra*.92,a.y+v.y*len*.32-n.y*ra*.92,am.x,am.y],
  [a.x-v.x*ra*.42-n.x*ra*.5,a.y-v.y*ra*.42-n.y*ra*.5,a.x-v.x*ra*.42+n.x*ra*.5,a.y-v.y*ra*.42+n.y*ra*.5,ap.x,ap.y]
 ],fill,outline,2.4);
 if(highlight){ctx.save();ctx.beginPath();const p1=off(a,n,ra*.42),p2=off(b,n,rb*.42);ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=highlight;ctx.globalAlpha=.55;ctx.lineWidth=Math.max(1.5,Math.min(3.2,widthA*.09));ctx.lineCap="round";ctx.stroke();ctx.restore()}
}
function taperedRibbon(ctx,nodes,widths,fill,stroke="#173b35",line=3){const upper=[],lower=[];nodes.forEach((p,i)=>{const prev=nodes[Math.max(0,i-1)],next=nodes[Math.min(nodes.length-1,i+1)],dir=unit(prev,next),normal={x:-dir.y,y:dir.x},half=(widths[i]||4)/2;upper.push({x:p.x-normal.x*half,y:p.y-normal.y*half});lower.push({x:p.x+normal.x*half,y:p.y+normal.y*half})});polygon(ctx,upper.concat(lower.reverse()),fill,stroke,line)}
function drawWorker(ctx,w,h,rig,options={}){
 const raw=rig?.points||rig||{},p={};for(const[k,v]of Object.entries(raw))p[k]=point(v,w,h);
 const get=(k,x=.5,y=.5)=>p[k]||{x:x*w,y:y*h},head=get("head"),jaw=get("jaw",.5,.153),neck=get("neck"),hip=get("hip"),sl=get("shoulderL"),sr=get("shoulderR"),el=get("elbowL"),er=get("elbowR"),hl=get("handL"),hr=get("handR"),kl=get("kneeL"),kr=get("kneeR"),fl=get("footL"),fr=get("footR");
 const faceAngle=Math.atan2(head.y-neck.y,head.x-neck.x)-Math.PI/2;
 const bodyGrad=gradient(ctx,sl,sr,[[0,"#d96b27"],[.5,"#ff9a42"],[1,"#c94f24"]]);
 const pantGrad=gradient(hip,{x:hip.x,y:h},[[0,"#344258"],[1,"#141f30"]]);
 ctx.save();
 // Ground shadow and ambient bounce.
 ellipse(ctx,{x:(fl.x+fr.x)/2,y:Math.max(fl.y,fr.y)+9},58,9,"rgba(0,0,0,.28)",null);
 // Far leg: start at the right side of the pelvis so the legs never cross unnaturally.
 const farHip={x:hip.x+15,y:hip.y+5};
 organicLimb(ctx,farHip,kr,36,28,pantGrad,"#8796aa");
 organicLimb(ctx,kr,fr,27,21,pantGrad,"#8796aa");
 polygon(ctx,[{x:fr.x-21,y:fr.y-5},{x:fr.x+11,y:fr.y-6},{x:fr.x+26,y:fr.y+4},{x:fr.x+26,y:fr.y+15},{x:fr.x-23,y:fr.y+15}],gradient(ctx,fr,{x:fr.x,y:fr.y+15},[[0,"#718094"],[.48,"#37465b"],[1,"#111a28"]]),"#121c29",2.2);
 segment(ctx,{x:fr.x-22,y:fr.y+14},{x:fr.x+25,y:fr.y+14},3.2,"#0b1420","#263448");
 for(let i=0;i<3;i++)segment(ctx,{x:fr.x-3+i*5,y:fr.y-3+i*.5},{x:fr.x+2+i*5,y:fr.y+3},1.2,"#c2cbd1","#455365");
 // Near leg, with a visible thigh volume and separate knee articulation.
 const nearHip={x:hip.x-15,y:hip.y+5};
 organicLimb(ctx,nearHip,kl,39,29,pantGrad,"#a7b3c1");
 organicLimb(ctx,kl,fl,29,21,pantGrad,"#9eacbd");
 // Subtle knee folds, integrated into the trousers instead of a mechanical joint.
 segment(ctx,{x:kl.x-7,y:kl.y-1},{x:kl.x+7,y:kl.y+2},2.2,"#63758a","#26364a");
 segment(ctx,{x:kl.x-5,y:kl.y+5},{x:kl.x+5,y:kl.y+7},1.2,"#182536",null);
 polygon(ctx,[{x:fl.x-23,y:fl.y-6},{x:fl.x+11,y:fl.y-6},{x:fl.x+27,y:fl.y+4},{x:fl.x+26,y:fl.y+15},{x:fl.x-24,y:fl.y+15}],gradient(ctx,fl,{x:fl.x,y:fl.y+15},[[0,"#7b8a9d"],[.48,"#3b4a60"],[1,"#111a28"]]),"#121c29",2.2);
 segment(ctx,{x:fl.x-23,y:fl.y+14},{x:fl.x+25,y:fl.y+14},3.2,"#0b1420","#263448");
 for(let i=0;i<3;i++)segment(ctx,{x:fl.x-4+i*5,y:fl.y-3+i*.5},{x:fl.x+1+i*5,y:fl.y+3},1.2,"#c2cbd1","#455365");
 // Torso silhouette, collar and high-visibility jacket.
 const top=mix(sl,sr,.5),axis=unit(top,hip),perp={x:-axis.y,y:axis.x};
 const torso=[{x:top.x-perp.x*43,y:top.y-perp.y*43},{x:top.x+perp.x*43,y:top.y+perp.y*43},{x:hip.x+perp.x*42,y:hip.y+perp.y*42},{x:hip.x-perp.x*42,y:hip.y-perp.y*42}];
 bezierShape(ctx,{x:top.x-43,y:top.y+12},[[top.x-38,top.y-7,top.x-18,top.y-14,top.x,top.y-14],[top.x+24,top.y-16,top.x+42,top.y-6,top.x+43,top.y+12],[hip.x+49,hip.y-5,hip.x+47,hip.y+17,hip.x+40,hip.y+21],[hip.x+24,hip.y+30,hip.x-24,hip.y+30,hip.x-40,hip.y+21],[hip.x-49,hip.y+15,top.x-48,top.y+29,top.x-43,top.y+12]],bodyGrad,"#492c24",4);
 polygon(ctx,[mix(top,hip,.08),mix(top,hip,.08),mix(top,hip,.82),mix(top,hip,.82)],"rgba(255,197,100,.08)",null);
 // Worker safety vest panels and reflective bands.
 const vestA= mix(sl,hip,.18),vestB=mix(sr,hip,.18),vestC=mix(sr,hip,.83),vestD=mix(sl,hip,.83);
 polygon(ctx,[vestA,mix(vestA,vestD,.84),mix(vestA,vestD,.95),vestD],gradient(ctx,vestA,vestD,[[0,"#ffc85b"],[1,"#e77d29"]]),"#783b20",2);
 polygon(ctx,[vestB,mix(vestB,vestC,.84),mix(vestB,vestC,.95),vestC],gradient(ctx,vestB,vestC,[[0,"#ffc85b"],[1,"#d96323"]]),"#783b20",2);
 segment(ctx,mix(vestA,vestD,.74),mix(vestB,vestC,.74),7,"#e9f4f2","#596d62");
 segment(ctx,mix(vestA,vestD,.74),mix(vestB,vestC,.74),2.2,"#fff0c4",null);
 // Jacket zipper, stitched seams, chest pockets, radio and tool belt.
 const jacketCenter=mix(top,hip,.49);
 segment(ctx,{x:jacketCenter.x,y:top.y+8},{x:jacketCenter.x,y:hip.y-13},2.5,"#773e29","#ffc37a");
 const chestL=mix(sl,hip,.42),chestR=mix(sr,hip,.42);
 polygon(ctx,[{x:chestL.x-12,y:chestL.y-7},{x:chestL.x+9,y:chestL.y-7},{x:chestL.x+8,y:chestL.y+12},{x:chestL.x-12,y:chestL.y+12}],"#d96b2b","#713a24",2);
 polygon(ctx,[{x:chestL.x-12,y:chestL.y-7},{x:chestL.x+9,y:chestL.y-7},{x:chestL.x+8,y:chestL.y-1},{x:chestL.x-12,y:chestL.y-1}],"#f3b34f","#713a24",1);
 polygon(ctx,[{x:chestR.x-8,y:chestR.y-7},{x:chestR.x+12,y:chestR.y-7},{x:chestR.x+12,y:chestR.y+12},{x:chestR.x-8,y:chestR.y+12}],"#bd5425","#713a24",2);
 ellipse(ctx,{x:chestR.x+2,y:chestR.y-1},2,2,"#ffe2a0",null);
 segment(ctx,mix(sl,hip,.88),mix(sr,hip,.88),8,"#253246","#17202d");
 segment(ctx,mix(sl,hip,.89),mix(sr,hip,.89),2,"#9daab4",null);
 const pocket=mix(mix(sl,sr,.75),hip,.67);polygon(ctx,[{x:pocket.x-9,y:pocket.y-8},{x:pocket.x+9,y:pocket.y-8},{x:pocket.x+8,y:pocket.y+10},{x:pocket.x-8,y:pocket.y+10}],"#b94f25","#73371f",2);
 segment(ctx,{x:pocket.x-5,y:pocket.y-4},{x:pocket.x+5,y:pocket.y-4},2,"#f5b75e",null);
 // Sleeves overlap the torso at the shoulder; cuffs, reflective bands and gloves complete the silhouette.
 organicLimb(ctx,sl,el,33,26,gradient(ctx,sl,el,[[0,"#ffb35e"],[.45,"#f28b3a"],[1,"#b94a25"]]),"#ffd18a");
 organicLimb(ctx,el,hl,25,19,gradient(ctx,el,hl,[[0,"#f7ae59"],[1,"#ad4724"]]),"#ffd08b");
 // Shoulder and elbow folds stay inside the sleeve silhouette.
 segment(ctx,{x:sl.x-7,y:sl.y+8},{x:sl.x+8,y:sl.y+8},2,"#ffd08a","#b85b29");
 segment(ctx,{x:el.x-6,y:el.y+5},{x:el.x+7,y:el.y+4},1.8,"#f9bc76","#b85b29");
 const cuffL=mix(el,hl,.72);segment(ctx,cuffL,{x:cuffL.x+7,y:cuffL.y-5},4,"#e8eee2","#67786e");
 organicLimb(ctx,sr,er,33,26,gradient(ctx,sr,er,[[0,"#ffb35e"],[.45,"#f28b3a"],[1,"#b94a25"]]),"#ffd18a");
 organicLimb(ctx,er,hr,25,19,gradient(ctx,er,hr,[[0,"#f7ae59"],[1,"#ad4724"]]),"#ffd08b");
 segment(ctx,{x:sr.x-8,y:sr.y+8},{x:sr.x+7,y:sr.y+8},2,"#ffd08a","#b85b29");
 segment(ctx,{x:er.x-7,y:er.y+4},{x:er.x+6,y:er.y+5},1.8,"#f9bc76","#b85b29");
 const cuffR=mix(er,hr,.72);segment(ctx,cuffR,{x:cuffR.x-7,y:cuffR.y-5},4,"#e8eee2","#67786e");
 ellipse(ctx,hl,9,8,"#586574","#1c2734",2);ellipse(ctx,hr,9,8,"#586574","#1c2734",2);
 segment(ctx,{x:hl.x-5,y:hl.y+1},{x:hl.x+5,y:hl.y+1},2,"#c5d0ce","#354252");
 segment(ctx,{x:hr.x-5,y:hr.y+1},{x:hr.x+5,y:hr.y+1},2,"#c5d0ce","#354252");
 // Tailored trouser seams and folds follow the knee and ankle pose.
 segment(ctx,{x:hip.x-17,y:hip.y+21},{x:kl.x-9,y:kl.y-8},2.1,"#68788d","#26364a");
 segment(ctx,{x:hip.x+17,y:hip.y+21},{x:kr.x+8,y:kr.y-8},2.1,"#586b82","#26364a");
 segment(ctx,{x:kl.x-8,y:kl.y+10},{x:kl.x+8,y:kl.y+12},1.7,"#718198","#26364a");
 segment(ctx,{x:kr.x-7,y:kr.y+10},{x:kr.x+8,y:kr.y+12},1.7,"#718198","#26364a");
 polygon(ctx,[{x:hip.x-26,y:hip.y+17},{x:hip.x-10,y:hip.y+19},{x:hip.x-12,y:hip.y+36},{x:hip.x-27,y:hip.y+34}],"#29394e","#152235",1.5);
 segment(ctx,{x:hip.x-23,y:hip.y+23},{x:hip.x-14,y:hip.y+24},1.4,"#93a0ad",null);
 // Tools and carried props stay attached to the worker's animated hands.
 const action=options.action||"",time=Number(options.time)||0;
 if(action==="worker-hammer"){
  const duration=Math.max(.1,Number(options.duration)||2),phase=((time/duration)%1+1)%1,strike=phase<.48?0:phase<.63?ease((phase-.48)/.15):phase<.8?1-ease((phase-.63)/.17):0,angle=-1.58+strike*2.05,dir={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-Math.sin(angle),y:Math.cos(angle)},headCenter={x:hr.x+dir.x*39,y:hr.y+dir.y*39};
  segment(ctx,hr,headCenter,5.5,"#87532e","#422d23","#e0b17c");
  const hammerHead=[
   {x:headCenter.x+normal.x*15+dir.x*5,y:headCenter.y+normal.y*15+dir.y*5},
   {x:headCenter.x+normal.x*15-dir.x*8,y:headCenter.y+normal.y*15-dir.y*8},
   {x:headCenter.x-normal.x*15-dir.x*8,y:headCenter.y-normal.y*15-dir.y*8},
   {x:headCenter.x-normal.x*15+dir.x*5,y:headCenter.y-normal.y*15+dir.y*5},
   {x:headCenter.x-normal.x*11+dir.x*11,y:headCenter.y-normal.y*11+dir.y*11},
   {x:headCenter.x+normal.x*11+dir.x*11,y:headCenter.y+normal.y*11+dir.y*11}
  ];
  polygon(ctx,hammerHead,gradient(ctx,headCenter,{x:headCenter.x+normal.x*14,y:headCenter.y+normal.y*14},[[0,"#d7e0e8"],[.55,"#8998a8"],[1,"#445568"]]),"#263746",2.5);
  segment(ctx,{x:headCenter.x+normal.x*11+dir.x*1,y:headCenter.y+normal.y*11+dir.y*1},{x:headCenter.x-normal.x*11+dir.x*1,y:headCenter.y-normal.y*11+dir.y*1},2,"#edf3f6",null);
 }
 if(action==="worker-dig"){
  const grip=mix(hl,hr,.48),shaft={x:hr.x+22,y:hr.y+33},blade={x:shaft.x+10,y:shaft.y+11};
  segment(ctx,grip,shaft,5,"#87532e","#422d23","#d7a16a");
  bezierShape(ctx,{x:blade.x-11,y:blade.y-5},[
   [blade.x-4,blade.y-7,blade.x+6,blade.y-8,blade.x+12,blade.y-5],
   [blade.x+12,blade.y+2,blade.x+8,blade.y+10,blade.x+1,blade.y+17],
   [blade.x-5,blade.y+10,blade.x-11,blade.y+2,blade.x-11,blade.y-5]
  ],gradient(ctx,blade,{x:blade.x+5,y:blade.y+14},[[0,"#dce3e8"],[.5,"#91a3b2"],[1,"#425669"]]),"#2d4051",2.5);
  segment(ctx,{x:blade.x-5,y:blade.y+1},{x:blade.x+5,y:blade.y+1},1.5,"#edf3f6",null);
 }
 if(action==="worker-carry"||action==="worker-lift"){
  const center=mix(hl,hr,.5),boxY=(hl.y+hr.y)/2+7,boxW=action==="worker-lift"?134:124,boxH=action==="worker-lift"?46:42;
  polygon(ctx,[{x:center.x-boxW/2,y:boxY-boxH/2},{x:center.x+boxW/2,y:boxY-boxH/2-4},{x:center.x+boxW/2,y:boxY+boxH/2-4},{x:center.x-boxW/2,y:boxY+boxH/2}],"#9a693c","#4e3527",3);
  polygon(ctx,[{x:center.x-boxW/2,y:boxY-boxH/2},{x:center.x,y:boxY-boxH/2-4},{x:center.x,y:boxY+boxH/2-4},{x:center.x-boxW/2,y:boxY+boxH/2}],"#ba874f","#69462d",1.5);
  segment(ctx,{x:center.x-boxW/2+8,y:boxY-4},{x:center.x+boxW/2-8,y:boxY-8},3,"#d4a36d","#69462d");
 }
 // Neck and face.
 segment(ctx,neck,head,18,"#d99b70","#5c3e33","#f6c59d");
 ellipse(ctx,head,27.5,32,gradient(ctx,{x:head.x-20,y:head.y-24},{x:head.x+21,y:head.y+27},[[0,"#ffe8c8"],[.48,"#e7ad82"],[1,"#a96354"]]),"#57372f",3,faceAngle);
 // Soft jaw shadow gives the face volume under the hard hat.
 ellipse(ctx,{x:head.x+1,y:head.y+16},17,10,"rgba(102,51,43,.12)",null);
 const blinkAt=((Number(options.time)||0)+.2)%3.7,eyeOpen=blinkAt<.13?Math.max(.12,Math.abs(blinkAt-.065)/.065):1;
 ellipse(ctx,{x:head.x-11.5,y:head.y-1},4.8,5.8*eyeOpen,"#fffdf5","#8a604c",.9);
 ellipse(ctx,{x:head.x+8.5,y:head.y-1},4.8,5.8*eyeOpen,"#fffdf5","#8a604c",.9);
 ellipse(ctx,{x:head.x-10.5,y:head.y},2.8,3.8*eyeOpen,"#465c7b",null);
 ellipse(ctx,{x:head.x+9.5,y:head.y},2.8,3.8*eyeOpen,"#465c7b",null);
 ellipse(ctx,{x:head.x-10.5,y:head.y-1.2},1.45,1.7*eyeOpen,"#15243a",null);
 ellipse(ctx,{x:head.x+9.5,y:head.y-1.2},1.45,1.7*eyeOpen,"#15243a",null);
 ellipse(ctx,{x:head.x-12,y:head.y-3},1.35,1.4*eyeOpen,"#ffffff",null);
 ellipse(ctx,{x:head.x+8,y:head.y-3},1.35,1.4*eyeOpen,"#ffffff",null);
 segment(ctx,{x:head.x-16,y:head.y-8},{x:head.x-6,y:head.y-11},3.2,"#573a31");
 segment(ctx,{x:head.x+4,y:head.y-11},{x:head.x+15,y:head.y-8},3.2,"#573a31");
 segment(ctx,{x:head.x-1,y:head.y+1},{x:head.x+1,y:head.y+7},1.8,"#a96955","#70473d");
 ellipse(ctx,{x:head.x+2,y:head.y+7},2.7,1.6,"#b9775f",null);
 const mouthTop=head.y+9.5,mouthGap=Math.max(1.2,jaw.y-mouthTop);
 polygon(ctx,[{x:head.x-7,y:mouthTop},{x:head.x+7,y:mouthTop},{x:jaw.x+6,y:jaw.y},{x:jaw.x-6,y:jaw.y}],"#5d3034","#75433e",1.2);
 if(mouthGap>4)polygon(ctx,[{x:head.x-5,y:mouthTop+1},{x:head.x+5,y:mouthTop+1},{x:head.x+3,y:mouthTop+Math.min(4,mouthGap/2)},{x:head.x-3,y:mouthTop+Math.min(4,mouthGap/2)}],"#f1e7d1",null);
 ellipse(ctx,{x:head.x-24,y:head.y+4},4.3,6.5,"#d18d69","#5b3b32",1.5);
 ellipse(ctx,{x:head.x+22,y:head.y+4},4.3,6.5,"#d18d69","#5b3b32",1.5);
 // Hair, hard hat shell and rim.
 // Helmet crown, reinforced brim, side guards and reflected rim light.
 ellipse(ctx,{x:head.x,y:head.y-22},28,12,"#282d39","#182231",2);
 ellipse(ctx,{x:head.x,y:head.y-29},27,12,gradient(ctx,{x:head.x-15,y:head.y-44},{x:head.x+16,y:head.y-19},[[0,"#fff0ad"],[.52,"#f6a73d"],[1,"#a94b20"]]),"#6b3b1e",2.7);
 segment(ctx,{x:head.x-32,y:head.y-19},{x:head.x+32,y:head.y-19},6.5,"#f4a63e","#6b3b1e");
 segment(ctx,{x:head.x-5,y:head.y-42},{x:head.x-5,y:head.y-25},3,"#fff2c6");
 segment(ctx,{x:head.x-24,y:head.y-27},{x:head.x-27,y:head.y-19},3,"#ffd875","#91501f");
 ellipse(ctx,{x:head.x+16,y:head.y-28},3.5,3.5,"#fff0b5","#87501f",1.2);
 polygon(ctx,[{x:head.x-29,y:head.y-16},{x:head.x-23,y:head.y-14},{x:head.x-24,y:head.y-7},{x:head.x-29,y:head.y-8}],"#d98732","#70401f",1.4);
 polygon(ctx,[{x:head.x+24,y:head.y-16},{x:head.x+29,y:head.y-14},{x:head.x+29,y:head.y-8},{x:head.x+24,y:head.y-7}],"#d98732","#70401f",1.4);
 segment(ctx,{x:head.x-20,y:head.y+10},{x:head.x-15,y:jaw.y+4},1.7,"#80513d","#e7b68b");
 segment(ctx,{x:head.x+20,y:head.y+10},{x:head.x+15,y:jaw.y+4},1.7,"#80513d","#e7b68b");
 // Small work gloves seams and boot seams.
 segment(ctx,{x:hl.x-5,y:hl.y+2},{x:hl.x+5,y:hl.y+2},1.5,"#aeb7bf","#354252");
 segment(ctx,{x:hr.x-5,y:hr.y+2},{x:hr.x+5,y:hr.y+2},1.5,"#aeb7bf","#354252");
 ctx.restore();
}
function drawDinosaur(ctx,w,h,rig,options={}){
 const raw=rig?.points||rig||{},p={};for(const[k,v]of Object.entries(raw))p[k]=point(v,w,h);
 const get=(k,x=.5,y=.5)=>p[k]||{x:x*w,y:y*h};
 const head=get("head"),jaw=get("jaw"),neck=get("neck"),chest=get("chest"),hip=get("hip"),tail1=get("tail1"),tail2=get("tail2"),tail3=get("tail3"),tail4=get("tail4");
 const sl=get("shoulderL"),el=get("elbowL"),hl=get("handL"),sr=get("shoulderR"),er=get("elbowR"),hr=get("handR"),kl=get("kneeL"),fl=get("footL"),kr=get("kneeR"),fr=get("footR");
 const green=gradient(ctx,{x:head.x,y:head.y-35},{x:hip.x,y:hip.y+50},[[0,"#b6d77b"],[.38,"#6eaa55"],[.76,"#397b50"],[1,"#245443"]]);
 const belly=gradient(ctx,chest,hip,[[0,"#e3d39a"],[1,"#a1aa70"]]);
 ctx.save();
 // Ground shadow.
 ellipse(ctx,{x:(head.x+tail4.x+hip.x)/3,y:Math.max(fl.y,fr.y)+7},130,10,"rgba(0,0,0,.3)",null);
 // A single tapered tail silhouette keeps the moving sections joined instead of looking like pipes.
 taperedRibbon(ctx,[hip,tail1,tail2,tail3,tail4],[42,36,27,17,5],green,"#173b35",4);
 // A soft dorsal highlight and patterned bands make the tail read as a flexible, muscular form.
 segment(ctx,{x:hip.x+8,y:hip.y-18},{x:tail1.x+8,y:tail1.y-15},3.2,"#a8d77b","#3e754d");
 segment(ctx,{x:tail1.x+7,y:tail1.y-15},{x:tail2.x+7,y:tail2.y-12},2.5,"#95c86e","#3e754d");
 segment(ctx,{x:tail2.x+6,y:tail2.y-12},{x:tail3.x+5,y:tail3.y-9},2,"#83b95f","#315f43");
 for(let i=1;i<4;i++){const q=mix([hip,tail1,tail2,tail3,tail4][i],[hip,tail1,tail2,tail3,tail4][i+1],.18);ellipse(ctx,q,3.2,5.5,"#b6d77b","#386d49",1.2)}
 for(let i=0;i<5;i++){const a=mix(tail1,tail4,.22+i*.14);segment(ctx,{x:a.x-3,y:a.y-6},{x:a.x+3,y:a.y+5},2.1,"#2f6847","#214b3b")}
 // Far hind leg, then near hind leg.
 organicLimb(ctx,{x:hip.x+9,y:hip.y+4},kr,40,30,green,"#c2e28d");organicLimb(ctx,kr,fr,28,21,green,"#b5d57e");
 polygon(ctx,[{x:fr.x-14,y:fr.y-6},{x:fr.x+12,y:fr.y-4},{x:fr.x+25,y:fr.y+5},{x:fr.x+24,y:fr.y+11},{x:fr.x-17,y:fr.y+10}],"#538c55","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fr.x+9+i*5,y:fr.y+5},{x:fr.x+17+i*5,y:fr.y+7},{x:fr.x+22+i*5,y:fr.y+12}],"#d4d8a0","#5c6848",1);
 organicLimb(ctx,{x:hip.x-9,y:hip.y+4},kl,43,32,green,"#c2e28d");organicLimb(ctx,kl,fl,29,22,green,"#b5d57e");
 polygon(ctx,[{x:fl.x-15,y:fl.y-6},{x:fl.x+12,y:fl.y-5},{x:fl.x+27,y:fl.y+5},{x:fl.x+25,y:fl.y+12},{x:fl.x-19,y:fl.y+11}],"#659b5c","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fl.x+9+i*5,y:fl.y+5},{x:fl.x+17+i*5,y:fl.y+7},{x:fl.x+21+i*5,y:fl.y+12}],"#e4dcad","#5c6848",1);
 // Body mass and belly.
 const center=mix(chest,hip,.5);
 // A broad barrel-shaped torso with a deep chest, tapered waist and layered belly.
 bezierShape(ctx,{x:center.x-69,y:center.y-6},[
  [center.x-66,center.y-50,center.x-23,center.y-65,center.x+17,center.y-51],
  [center.x+65,center.y-39,center.x+91,center.y-10,center.x+78,center.y+24],
  [center.x+68,center.y+58,center.x+6,center.y+66,center.x-38,center.y+43],
  [center.x-72,center.y+31,center.x-84,center.y+7,center.x-69,center.y-6]
 ],green,"#173b35",5);
 ellipse(ctx,mix(chest,hip,.27),45,38,green,"#315d43",2,-.28);
 ellipse(ctx,{x:center.x-8,y:center.y+24},61,24,belly,"#536e4c",2,-.08);
 // Continuous anatomical contour lines follow the flank without creating detached muscle blobs.
 segment(ctx,{x:center.x-55,y:center.y-7},{x:center.x-36,y:center.y-22},2.2,"#b4d982","#47764a");
 segment(ctx,{x:center.x-36,y:center.y-22},{x:center.x-12,y:center.y-20},1.8,"#b4d982","#47764a");
 segment(ctx,{x:center.x+18,y:center.y-22},{x:center.x+42,y:center.y-27},2,"#9cc975","#356b48");
 segment(ctx,{x:center.x+42,y:center.y-27},{x:center.x+60,y:center.y-13},1.8,"#9cc975","#356b48");
 segment(ctx,{x:center.x-46,y:center.y+32},{x:center.x-13,y:center.y+43},2.1,"#a6b978","#4a6a48");
 segment(ctx,{x:center.x+8,y:center.y+43},{x:center.x+43,y:center.y+32},2.1,"#a6b978","#4a6a48");
 // Rib lines and flank markings give the torso a readable organic volume.
 for(let i=0;i<4;i++){const x=center.x-26+i*15;segment(ctx,{x,y:center.y+13+i*.5},{x:x+5,y:center.y+25+i*.5},2.2,"#899b64","#455f46")}
 for(let i=0;i<7;i++){const x=center.x-31+(i%4)*17,y=center.y-14+Math.floor(i/4)*17;ellipse(ctx,{x,y},2.4,3.2,i%2?"#4f8d4f":"#c1dc83",null)}
 // Neck joins head and torso as one readable mass; shoulders and short forearms overlap the chest.
 organicLimb(ctx,chest,neck,42,35,green,"#c4df8a");
 organicLimb(ctx,neck,head,39,34,green,"#c4df8a");
 // Neck and tiny forelimbs are integrated into the chest; no exposed circular joints.
 organicLimb(ctx,sl,el,20,15,green,"#c4df8a");
 organicLimb(ctx,el,hl,15,11,green,"#c4df8a");
 organicLimb(ctx,sr,er,20,15,green,"#c4df8a");
 organicLimb(ctx,er,hr,15,11,green,"#c4df8a");
 segment(ctx,{x:sl.x-6,y:sl.y+5},{x:sl.x+7,y:sl.y+7},2.2,"#c6e58e","#386748");
 segment(ctx,{x:sr.x-6,y:sr.y+5},{x:sr.x+7,y:sr.y+7},2.2,"#c6e58e","#386748");
 for(const hand of [hl,hr])for(let i=0;i<2;i++)segment(ctx,{x:hand.x+i*3,y:hand.y},{x:hand.x+i*3+2,y:hand.y+8},2,"#e2d79f","#526b4a");
 // Dorsal ridge and small plate-like scales.
 const ridgeStart=mix(neck,chest,.25),ridgeEnd=mix(chest,hip,.48);
 for(let i=0;i<10;i++){const t=i/10,a=mix(ridgeStart,ridgeEnd,t),size=9*(1-t*.32);polygon(ctx,[{x:a.x-size,y:a.y-18},{x:a.x-1,y:a.y-19-size},{x:a.x+size,y:a.y-15}],i%2?"#8fc66b":"#c8e68e","#315f43",1.5)}
 // Head and muzzle, slightly three-quarter profile.
 const headAngle=Math.atan2(neck.y-head.y,neck.x-head.x);
 const jawMouth={x:jaw.x,y:Math.min(jaw.y,head.y+h*.17)};
 ellipse(ctx,head,43,28,gradient(ctx,{x:head.x-34,y:head.y-27},{x:head.x+27,y:head.y+25},[[0,"#d9f4a0"],[.48,"#83bd62"],[1,"#3a754b"]]),"#173b35",4,-.12);
 // Broad upper muzzle with a tapered snout, cheek plane and a distinct brow-to-nose silhouette.
 bezierShape(ctx,{x:head.x-34,y:head.y+2},[
  [head.x-27,head.y-7,head.x-7,head.y-4,head.x+9,head.y+3],
  [head.x+16,head.y+9,head.x+10,head.y+17,head.x-7,head.y+18],
  [head.x-23,head.y+17,head.x-31,head.y+12,head.x-34,head.y+2]
 ],gradient(ctx,{x:head.x-28,y:head.y-3},{x:head.x+8,y:head.y+17},[[0,"#c7e98b"],[1,"#4a8751"]]),"#173b35",2.5);
 // Keep the lower jaw hinged beneath the muzzle. Its opening is clamped so a roar never stretches the mouth into a spike.
 polygon(ctx,[{x:head.x-27,y:head.y+7},{x:head.x-9,y:head.y+12},{x:jawMouth.x+12,y:jawMouth.y+2},{x:jawMouth.x+8,y:jawMouth.y+10},{x:head.x-13,y:jawMouth.y+9},{x:head.x-30,y:head.y+14}],gradient(ctx,{x:head.x-8,y:head.y+12},jawMouth,[[0,"#8fbd65"],[1,"#386c48"]]),"#173b35",3);
 polygon(ctx,[
  {x:head.x-34,y:head.y+7},{x:head.x-12,y:head.y+12},
  {x:jawMouth.x+9,y:jawMouth.y+2},{x:jawMouth.x+6,y:jawMouth.y+14},
  {x:head.x-12,y:jawMouth.y+10},{x:head.x-33,y:head.y+15}
 ],"#371d27","#1d2025",1.5);
 // Tongue and gum shading stay inside the moving lower jaw.
 bezierShape(ctx,{x:head.x-25,y:jawMouth.y+3},[
  [head.x-17,jawMouth.y+1,head.x-7,jawMouth.y+3,head.x-4,jawMouth.y+8],
  [head.x-11,jawMouth.y+10,head.x-21,jawMouth.y+9,head.x-25,jawMouth.y+3]
 ],"#b75f69",null);
 segment(ctx,{x:head.x-32,y:head.y+10},{x:jawMouth.x+7,y:jawMouth.y+3},2.8,"#3a2629","#1c2026");
 // Upper and lower teeth follow the hinged jaw.
 for(let i=0;i<4;i++){const x=head.x-17+i*8;polygon(ctx,[{x,y:head.y+9+i*.8},{x:x+4,y:head.y+9+i*.8},{x:x+2,y:head.y+16+i}],"#f1edcf","#b1b28e",.8)}
 for(let i=0;i<4;i++){const x=head.x-12+i*8;polygon(ctx,[{x,y:jawMouth.y+8},{x:x+5,y:jawMouth.y+8},{x:x+2.5,y:jawMouth.y+2}],"#f1edcf","#b1b28e",.8)}
 const blinkAt=((Number(options.time)||0)+.35)%3.45,eyeOpen=blinkAt<.14?Math.max(.1,Math.abs(blinkAt-.07)/.07):1;
 ellipse(ctx,{x:head.x-8,y:head.y-9},10,10*eyeOpen,"#f4d36d","#405239",2.2);
 ellipse(ctx,{x:head.x-10,y:head.y-9},4.6,5.4*eyeOpen,"#243128",null);
 ellipse(ctx,{x:head.x-11.5,y:head.y-11.5},2,2*eyeOpen,"#fff9d9",null);
 // Heavy brow ridge makes the eye read as part of the skull.
 segment(ctx,{x:head.x-22,y:head.y-19},{x:head.x-3,y:head.y-23},4.2,"#315b3f","#243d31");
 segment(ctx,{x:head.x-27,y:head.y-24},{x:head.x-12,y:head.y-27},2,"#d1e79a","#527b4b");
 ellipse(ctx,{x:head.x-29,y:head.y+1},2.5,2,"#315d43",null);
 segment(ctx,{x:head.x-31,y:head.y-16},{x:head.x-14,y:head.y-20},3,"#d1e79a","#527b4b");
 // Nostril, cheek scales and fine skin markings.
 ellipse(ctx,{x:head.x-31,y:head.y-2},2.8,1.8,"#264638",null);
 ellipse(ctx,{x:head.x-25,y:head.y+8},2,1.5,"#8dbd66",null);
 for(let i=0;i<4;i++)ellipse(ctx,{x:head.x+10+i*5,y:head.y+2+i*3.3},2.2,2.2,i%2?"#a5cf75":"#c6dd8c",null);
 // Fine flank scales continue the pattern from the neck across the body.
 for(let row=0;row<3;row++)for(let col=0;col<6;col++){
  const x=center.x-31+col*11+(row%2)*4,y=center.y-8+row*11;
  ellipse(ctx,{x,y},1.5,2.2,(row+col)%2?"#b9d987":"#3c764c",null);
 }
 ctx.restore();
}
function draw(ctx,width,height,rig,type="worker",options={}){if(!ctx||!Number.isFinite(width)||!Number.isFinite(height))return false;ctx.save();if(type==="dinosaur")drawDinosaur(ctx,width,height,rig,options);else drawWorker(ctx,width,height,rig,options);ctx.restore();return true}
window.NexoraCharacterArt={draw,drawWorker,drawDinosaur,version:"1.0.0"};
})();