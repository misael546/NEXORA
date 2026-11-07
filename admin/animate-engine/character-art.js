/* NEXORA ANIMATE — original 2D character artwork rendered as articulated vector layers. */
(()=>{"use strict";
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
 organicLimb(ctx,farHip,kr,31,23,pantGrad,"#8796aa");
 organicLimb(ctx,kr,fr,23,17,pantGrad,"#8796aa");
 polygon(ctx,[{x:fr.x-16,y:fr.y-3},{x:fr.x+10,y:fr.y-2},{x:fr.x+22,y:fr.y+8},{x:fr.x+18,y:fr.y+14},{x:fr.x-18,y:fr.y+13}],gradient(ctx,fr,{x:fr.x,y:fr.y+14},[[0,"#596779"],[1,"#161e2c"]]));
 // Near leg, with a visible thigh volume and separate knee articulation.
 const nearHip={x:hip.x-15,y:hip.y+5};
 organicLimb(ctx,nearHip,kl,33,23,pantGrad,"#a7b3c1");
 organicLimb(ctx,kl,fl,23,17,pantGrad,"#9eacbd");
 ellipse(ctx,kl,10,11,"#3b4c63","#1c2838",1.5);
 polygon(ctx,[{x:fl.x-18,y:fl.y-3},{x:fl.x+9,y:fl.y-4},{x:fl.x+23,y:fl.y+8},{x:fl.x+17,y:fl.y+15},{x:fl.x-20,y:fl.y+14}],gradient(ctx,fl,{x:fl.x,y:fl.y+15},[[0,"#68798c"],[1,"#151e2b"]]));
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
 organicLimb(ctx,sl,el,29,23,gradient(ctx,sl,el,[[0,"#f6a14c"],[1,"#c45827"]]),"#ffc16d");
 organicLimb(ctx,el,hl,22,17,gradient(ctx,el,hl,[[0,"#f6ae59"],[1,"#b94f25"]]),"#ffd08b");
 ellipse(ctx,sl,13,13,"#e98536",null,0);
 ellipse(ctx,el,9,9,"#e77e34",null,0);
 const cuffL=mix(el,hl,.72);segment(ctx,cuffL,{x:cuffL.x+7,y:cuffL.y-5},4,"#e8eee2","#67786e");
 organicLimb(ctx,sr,er,29,23,gradient(ctx,sr,er,[[0,"#f6a14c"],[1,"#c45827"]]),"#ffc16d");
 organicLimb(ctx,er,hr,22,17,gradient(ctx,er,hr,[[0,"#f6ae59"],[1,"#b94f25"]]),"#ffd08b");
 ellipse(ctx,sr,13,13,"#e98536",null,0);
 ellipse(ctx,er,9,9,"#e77e34",null,0);
 const cuffR=mix(er,hr,.72);segment(ctx,cuffR,{x:cuffR.x-7,y:cuffR.y-5},4,"#e8eee2","#67786e");
 ellipse(ctx,hl,9,8,"#586574","#1c2734",2);ellipse(ctx,hr,9,8,"#586574","#1c2734",2);
 segment(ctx,{x:hl.x-5,y:hl.y+1},{x:hl.x+5,y:hl.y+1},2,"#c5d0ce","#354252");
 segment(ctx,{x:hr.x-5,y:hr.y+1},{x:hr.x+5,y:hr.y+1},2,"#c5d0ce","#354252");
 // Tools and carried props stay attached to the worker's animated hands.
 const action=options.action||"",time=Number(options.time)||0;
 if(action==="worker-hammer"){
  const swing=Math.sin(time*Math.PI*2),angle=-1.9+swing*.28,tip={x:hr.x+Math.cos(angle)*35,y:hr.y+Math.sin(angle)*35};
  segment(ctx,hr,tip,5,"#87532e","#422d23","#d7a16a");
  const headTip={x:tip.x+Math.cos(angle)*4,y:tip.y+Math.sin(angle)*4};
  segment(ctx,{x:headTip.x+Math.sin(angle)*9,y:headTip.y-Math.cos(angle)*9},{x:headTip.x-Math.sin(angle)*9,y:headTip.y+Math.cos(angle)*9},11,"#8796a5","#354252","#e2e9ee");
 }
 if(action==="worker-dig"){
  const grip=mix(hl,hr,.48),shaft={x:hr.x+22,y:hr.y+33},blade={x:shaft.x+10,y:shaft.y+11};
  segment(ctx,grip,shaft,5,"#87532e","#422d23","#d7a16a");
  polygon(ctx,[{x:blade.x-10,y:blade.y-2},{x:blade.x+11,y:blade.y-3},{x:blade.x+5,y:blade.y+13},{x:blade.x-5,y:blade.y+13}],"#9aa8b4","#354252",2);
 }
 if(action==="worker-carry"||action==="worker-lift"){
  const center=mix(hl,hr,.5),boxY=(hl.y+hr.y)/2+7,boxW=action==="worker-lift"?134:124,boxH=action==="worker-lift"?46:42;
  polygon(ctx,[{x:center.x-boxW/2,y:boxY-boxH/2},{x:center.x+boxW/2,y:boxY-boxH/2-4},{x:center.x+boxW/2,y:boxY+boxH/2-4},{x:center.x-boxW/2,y:boxY+boxH/2}],"#9a693c","#4e3527",3);
  polygon(ctx,[{x:center.x-boxW/2,y:boxY-boxH/2},{x:center.x,y:boxY-boxH/2-4},{x:center.x,y:boxY+boxH/2-4},{x:center.x-boxW/2,y:boxY+boxH/2}],"#ba874f","#69462d",1.5);
  segment(ctx,{x:center.x-boxW/2+8,y:boxY-4},{x:center.x+boxW/2-8,y:boxY-8},3,"#d4a36d","#69462d");
 }
 // Neck and face.
 segment(ctx,neck,head,18,"#d99b70","#5c3e33","#f6c59d");
 ellipse(ctx,head,25,30,gradient(ctx,{x:head.x-19,y:head.y-22},{x:head.x+20,y:head.y+25},[[0,"#ffe0b5"],[.55,"#e2a77d"],[1,"#ac6956"]]),"#5b3b32",3,faceAngle);
 const blinkAt=((Number(options.time)||0)+.2)%3.7,eyeOpen=blinkAt<.13?Math.max(.12,Math.abs(blinkAt-.065)/.065):1;
 ellipse(ctx,{x:head.x-11,y:head.y-1},4.2,5.2*eyeOpen,"#fffdf4","#8a604c",.8);
 ellipse(ctx,{x:head.x+8,y:head.y-1},4.2,5.2*eyeOpen,"#fffdf4","#8a604c",.8);
 ellipse(ctx,{x:head.x-10,y:head.y},2.4,3.2*eyeOpen,"#4d5c73",null);
 ellipse(ctx,{x:head.x+9,y:head.y},2.4,3.2*eyeOpen,"#4d5c73",null);
 ellipse(ctx,{x:head.x-10.5,y:head.y-1.4},1.2,1.5*eyeOpen,"#15243a",null);
 ellipse(ctx,{x:head.x+8.5,y:head.y-1.4},1.2,1.5*eyeOpen,"#15243a",null);
 ellipse(ctx,{x:head.x-11.5,y:head.y-2.8},1.1,1.1*eyeOpen,"#ffffff",null);
 ellipse(ctx,{x:head.x+7.5,y:head.y-2.8},1.1,1.1*eyeOpen,"#ffffff",null);
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
 ellipse(ctx,{x:head.x,y:head.y-21},26,11,"#2b2d36","#182231",2);
 ellipse(ctx,{x:head.x,y:head.y-28},25,11,gradient(ctx,{x:head.x-12,y:head.y-41},{x:head.x+14,y:head.y-19},[[0,"#ffe18a"],[.58,"#f39a31"],[1,"#aa4d20"]]),"#6b3b1e",2.5);
 segment(ctx,{x:head.x-29,y:head.y-19},{x:head.x+29,y:head.y-19},6,"#f4a63e","#6b3b1e");
 segment(ctx,{x:head.x-4,y:head.y-37},{x:head.x-4,y:head.y-25},2.5,"#fff0bd");
 ellipse(ctx,{x:head.x+14,y:head.y-27},3.2,3.2,"#fff0b5","#87501f",1.2);
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
 taperedRibbon(ctx,[hip,tail1,tail2,tail3,tail4],[38,34,26,17,5],green,"#173b35",4);
 for(let i=1;i<4;i++){const q=mix([hip,tail1,tail2,tail3,tail4][i],[hip,tail1,tail2,tail3,tail4][i+1],.18);ellipse(ctx,q,3.2,5.5,"#b6d77b","#386d49",1.2)}
 // Far hind leg, then near hind leg.
 organicLimb(ctx,{x:hip.x+9,y:hip.y+4},kr,34,25,green,"#c2e28d");organicLimb(ctx,kr,fr,25,19,green,"#b5d57e");
 polygon(ctx,[{x:fr.x-14,y:fr.y-6},{x:fr.x+12,y:fr.y-4},{x:fr.x+25,y:fr.y+5},{x:fr.x+24,y:fr.y+11},{x:fr.x-17,y:fr.y+10}],"#538c55","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fr.x+9+i*5,y:fr.y+5},{x:fr.x+17+i*5,y:fr.y+7},{x:fr.x+22+i*5,y:fr.y+12}],"#d4d8a0","#5c6848",1);
 organicLimb(ctx,{x:hip.x-9,y:hip.y+4},kl,36,26,green,"#c2e28d");organicLimb(ctx,kl,fl,26,20,green,"#b5d57e");
 polygon(ctx,[{x:fl.x-15,y:fl.y-6},{x:fl.x+12,y:fl.y-5},{x:fl.x+27,y:fl.y+5},{x:fl.x+25,y:fl.y+12},{x:fl.x-19,y:fl.y+11}],"#659b5c","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fl.x+9+i*5,y:fl.y+5},{x:fl.x+17+i*5,y:fl.y+7},{x:fl.x+21+i*5,y:fl.y+12}],"#e4dcad","#5c6848",1);
 // Body mass and belly.
 const center=mix(chest,hip,.5);ellipse(ctx,center,77,51,green,"#173b35",5,-.12);
 ellipse(ctx,mix(chest,hip,.28),39,34,green,"#315d43",2,-.28);
 ellipse(ctx,{x:center.x-7,y:center.y+25},55,22,belly,"#536e4c",2,-.08);
 // Rib lines and flank markings give the torso a readable organic volume.
 for(let i=0;i<4;i++){const x=center.x-26+i*15;segment(ctx,{x,y:center.y+13+i*.5},{x:x+5,y:center.y+25+i*.5},2.2,"#899b64","#455f46")}
 for(let i=0;i<7;i++){const x=center.x-31+(i%4)*17,y=center.y-14+Math.floor(i/4)*17;ellipse(ctx,{x,y},2.4,3.2,i%2?"#4f8d4f":"#c1dc83",null)}
 // Neck joins head and torso as one readable mass; shoulders and short forearms overlap the chest.
 organicLimb(ctx,chest,neck,42,35,green,"#c4df8a");
 organicLimb(ctx,neck,head,39,34,green,"#c4df8a");
 ellipse(ctx,neck,20,21,green,"#315f43",2);
 organicLimb(ctx,sl,el,19,14,green,"#c4df8a");organicLimb(ctx,el,hl,14,10,green,"#c4df8a");
 organicLimb(ctx,sr,er,19,14,green,"#c4df8a");organicLimb(ctx,er,hr,14,10,green,"#c4df8a");
 ellipse(ctx,sl,9,10,"#79b75d","#315f43",2);ellipse(ctx,sr,9,10,"#79b75d","#315f43",2);
 for(const hand of [hl,hr])for(let i=0;i<2;i++)segment(ctx,{x:hand.x+i*3,y:hand.y},{x:hand.x+i*3+2,y:hand.y+8},2,"#e2d79f","#526b4a");
 // Dorsal ridge and small plate-like scales.
 const ridgeStart=mix(neck,chest,.25),ridgeEnd=mix(chest,hip,.48);
 for(let i=0;i<8;i++){const t=i/8,a=mix(ridgeStart,ridgeEnd,t),size=14*(1-t*.43);polygon(ctx,[{x:a.x-size,y:a.y-20},{x:a.x-1,y:a.y-25-size},{x:a.x+size,y:a.y-17}],i%2?"#8fc66b":"#c8e68e","#315f43",2)}
 // Head and muzzle, slightly three-quarter profile.
 const headAngle=Math.atan2(neck.y-head.y,neck.x-head.x);
 ellipse(ctx,head,37,30,gradient(ctx,{x:head.x-27,y:head.y-27},{x:head.x+20,y:head.y+26},[[0,"#d1ed96"],[.52,"#80bc61"],[1,"#3f794d"]]),"#173b35",4,-.2);
 polygon(ctx,[{x:head.x-28,y:head.y+5},{x:head.x-6,y:head.y+9},{x:jaw.x+10,y:jaw.y+6},{x:jaw.x+3,y:jaw.y+16},{x:head.x-16,y:head.y+19}],gradient(ctx,head,jaw,[[0,"#8fbd65"],[1,"#386c48"]]),"#173b35",3);
 polygon(ctx,[{x:head.x-22,y:head.y+12},{x:head.x-7,y:head.y+14},{x:jaw.x+7,y:jaw.y+8},{x:jaw.x+1,y:jaw.y+7}],"#48282d",null);
 segment(ctx,{x:head.x-24,y:head.y+11},{x:jaw.x+5,y:jaw.y+9},3,"#3a2629","#1c2026");
 // Upper and lower teeth follow the moving jaw instead of floating in place.
 for(let i=0;i<4;i++){const x=head.x-17+i*8;polygon(ctx,[{x,y:head.y+9+i*.8},{x:x+4,y:head.y+9+i*.8},{x:x+2,y:head.y+16+i}], "#f1edcf","#b1b28e",.8)}
 for(let i=0;i<4;i++){const x=head.x-12+i*8;polygon(ctx,[{x,y:jaw.y+8},{x:x+5,y:jaw.y+8},{x:x+2.5,y:jaw.y+2}], "#f1edcf","#b1b28e",.8)}
 const blinkAt=((Number(options.time)||0)+.35)%3.45,eyeOpen=blinkAt<.14?Math.max(.1,Math.abs(blinkAt-.07)/.07):1;
 ellipse(ctx,{x:head.x-8,y:head.y-9},9,9*eyeOpen,"#f4d36d","#405239",2);
 ellipse(ctx,{x:head.x-10,y:head.y-9},4,5*eyeOpen,"#243128",null);
 ellipse(ctx,{x:head.x-11,y:head.y-11},1.8,1.8*eyeOpen,"#fff9d9",null);
 segment(ctx,{x:head.x-19,y:head.y-19},{x:head.x-3,y:head.y-21},3.2,"#315b3f","#243d31");
 ellipse(ctx,{x:head.x-29,y:head.y+1},2.5,2,"#315d43",null);
 segment(ctx,{x:head.x-31,y:head.y-16},{x:head.x-14,y:head.y-20},3,"#d1e79a","#527b4b");
 // Nostrils and subtle scales on cheek.
 ellipse(ctx,{x:head.x-28,y:head.y-2},2.2,1.6,"#264638",null);
 for(let i=0;i<3;i++)ellipse(ctx,{x:head.x+9+i*6,y:head.y+2+i*4},2,2,"#c6dd8c",null);
 ctx.restore();
}
function draw(ctx,width,height,rig,type="worker",options={}){if(!ctx||!Number.isFinite(width)||!Number.isFinite(height))return false;ctx.save();if(type==="dinosaur")drawDinosaur(ctx,width,height,rig,options);else drawWorker(ctx,width,height,rig,options);ctx.restore();return true}
window.NexoraCharacterArt={draw,drawWorker,drawDinosaur,version:"1.0.0"};
})();