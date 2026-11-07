/* NEXORA ANIMATE — original 2D character artwork rendered as articulated vector layers. */
(()=>{"use strict";
const point=(p,w,h)=>({x:p.x*w,y:p.y*h});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const unit=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}};
const gradient=(ctx,a,b,stops)=>{if(typeof ctx.createLinearGradient!=="function")return stops?.[0]?.[1]||"#748b78";const g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);for(const s of stops)g.addColorStop(s[0],s[1]);return g};
function segment(ctx,a,b,width,fill,outline="#17202d",highlight=null){if(!a||!b)return;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=outline;ctx.lineWidth=width+5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(highlight){const n=unit(a,b),off={x:-n.y*width*.22,y:n.x*width*.22};ctx.strokeStyle=highlight;ctx.globalAlpha=.48;ctx.lineWidth=Math.max(2,width*.18);ctx.beginPath();ctx.moveTo(a.x+off.x,b.y? a.y+off.y:a.y);ctx.lineTo(b.x+off.x,b.y+off.y);ctx.stroke()}ctx.restore()}
function ellipse(ctx,p,rx,ry,fill,stroke="#1a2431",line=3,rotation=0){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(rotation);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=line;ctx.strokeStyle=stroke;ctx.stroke()}ctx.restore()}
function polygon(ctx,pts,fill,stroke="#1a2431",line=3){if(pts.length<3)return;ctx.save();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin="round";ctx.stroke()}ctx.restore()}
function limb(ctx,a,b,width,fill,highlight){segment(ctx,a,b,width,fill,"#182231",highlight);ellipse(ctx,b,width*.38,width*.38,fill,"#182231",2)}
function drawWorker(ctx,w,h,rig,options={}){
 const raw=rig?.points||rig||{},p={};for(const[k,v]of Object.entries(raw))p[k]=point(v,w,h);
 const get=(k,x=.5,y=.5)=>p[k]||{x:x*w,y:y*h},head=get("head"),neck=get("neck"),hip=get("hip"),sl=get("shoulderL"),sr=get("shoulderR"),el=get("elbowL"),er=get("elbowR"),hl=get("handL"),hr=get("handR"),kl=get("kneeL"),kr=get("kneeR"),fl=get("footL"),fr=get("footR");
 const faceAngle=Math.atan2(head.y-neck.y,head.x-neck.x)-Math.PI/2;
 const bodyGrad=gradient(ctx,sl,sr,[[0,"#d96b27"],[.5,"#ff9a42"],[1,"#c94f24"]]);
 const pantGrad=gradient(hip,{x:hip.x,y:h},[[0,"#344258"],[1,"#141f30"]]);
 ctx.save();
 // Ground shadow and ambient bounce.
 ellipse(ctx,{x:(fl.x+fr.x)/2,y:Math.max(fl.y,fr.y)+9},58,9,"rgba(0,0,0,.28)",null);
 // Far leg and boots.
 limb(ctx,mix(hip, {x:hip.x-.045*w,y:hip.y},1),kr,22,pantGrad,"#8b9aae");
 limb(ctx,kr,fr,16,pantGrad,"#8290a5");
 polygon(ctx,[{x:fr.x-16,y:fr.y-3},{x:fr.x+10,y:fr.y-2},{x:fr.x+22,y:fr.y+8},{x:fr.x+18,y:fr.y+14},{x:fr.x-18,y:fr.y+13}],gradient(ctx,fr,{x:fr.x,y:fr.y+14},[[0,"#596779"],[1,"#161e2c"]]));
 // Near leg.
 limb(ctx,hip,kl,23,pantGrad,"#91a1b4");
 limb(ctx,kl,fl,17,pantGrad,"#91a1b4");
 polygon(ctx,[{x:fl.x-18,y:fl.y-3},{x:fl.x+9,y:fl.y-4},{x:fl.x+23,y:fl.y+8},{x:fl.x+17,y:fl.y+15},{x:fl.x-20,y:fl.y+14}],gradient(ctx,fl,{x:fl.x,y:fl.y+15},[[0,"#68798c"],[1,"#151e2b"]]));
 // Torso silhouette, collar and high-visibility jacket.
 const top=mix(sl,sr,.5),axis=unit(top,hip),perp={x:-axis.y,y:axis.x};
 const torso=[{x:top.x-perp.x*31,y:top.y-perp.y*31},{x:top.x+perp.x*31,y:top.y+perp.y*31},{x:hip.x+perp.x*38,y:hip.y+perp.y*38},{x:hip.x-perp.x*38,y:hip.y-perp.y*38}];
 polygon(ctx,torso,bodyGrad,"#492c24",4);
 polygon(ctx,[mix(top,hip,.08),mix(top,hip,.08),mix(top,hip,.82),mix(top,hip,.82)],"rgba(255,197,100,.08)",null);
 // Worker safety vest panels and reflective bands.
 const vestA= mix(sl,hip,.18),vestB=mix(sr,hip,.18),vestC=mix(sr,hip,.83),vestD=mix(sl,hip,.83);
 polygon(ctx,[vestA,mix(vestA,vestD,.84),mix(vestA,vestD,.95),vestD],gradient(ctx,vestA,vestD,[[0,"#ffc85b"],[1,"#e77d29"]]),"#783b20",2);
 polygon(ctx,[vestB,mix(vestB,vestC,.84),mix(vestB,vestC,.95),vestC],gradient(ctx,vestB,vestC,[[0,"#ffc85b"],[1,"#d96323"]]),"#783b20",2);
 segment(ctx,mix(vestA,vestD,.74),mix(vestA,vestD,.74),4,"#e9f4f2","#596d62");
 segment(ctx,mix(vestB,vestC,.74),mix(vestB,vestC,.74),4,"#e9f4f2","#596d62");
 // Harness/belt and small pockets.
 segment(ctx,mix(sl,hip,.88),mix(sr,hip,.88),7,"#253246","#17202d");
 const pocket=mix(mix(sl,sr,.75),hip,.67);polygon(ctx,[{x:pocket.x-9,y:pocket.y-8},{x:pocket.x+9,y:pocket.y-8},{x:pocket.x+8,y:pocket.y+10},{x:pocket.x-8,y:pocket.y+10}],"#b94f25","#73371f",2);
 // Arms, sleeves, cuffs, gloves.
 limb(ctx,sl,el,20,gradient(ctx,sl,el,[[0,"#ee8c3d"],[1,"#b94d25"]]),"#ffc16d");
 limb(ctx,el,hl,15,gradient(ctx,el,hl,[[0,"#f3a04e"],[1,"#b94f25"]]),"#ffd08b");
 limb(ctx,sr,er,20,gradient(ctx,sr,er,[[0,"#ee8c3d"],[1,"#b94d25"]]),"#ffc16d");
 limb(ctx,er,hr,15,gradient(ctx,er,hr,[[0,"#f3a04e"],[1,"#b94f25"]]),"#ffd08b");
 ellipse(ctx,hl,8,7,"#4c5662","#1c2734",2);ellipse(ctx,hr,8,7,"#4c5662","#1c2734",2);
 // Neck and face.
 segment(ctx,neck,head,18,"#d99b70","#5c3e33","#f6c59d");
 ellipse(ctx,head,22,28,gradient(ctx,{x:head.x-17,y:head.y-18},{x:head.x+18,y:head.y+23},[[0,"#f5c99e"],[.62,"#d99a70"],[1,"#a96552"]]),"#5b3b32",3,faceAngle);
 ellipse(ctx,{x:head.x-11,y:head.y-1},3.1,4.2,"#f8f7ee",null);
 ellipse(ctx,{x:head.x+8,y:head.y-1},3.1,4.2,"#f8f7ee",null);
 ellipse(ctx,{x:head.x-10,y:head.y},1.8,2.6,"#263b54",null);
 ellipse(ctx,{x:head.x+9,y:head.y},1.8,2.6,"#263b54",null);
 segment(ctx,{x:head.x-15,y:head.y-8},{x:head.x-7,y:head.y-10},2.7,"#573a31");
 segment(ctx,{x:head.x+5,y:head.y-10},{x:head.x+14,y:head.y-8},2.7,"#573a31");
 segment(ctx,{x:head.x-3,y:head.y+9},{x:head.x+5,y:head.y+10},2,"#8b4a42");
 ellipse(ctx,{x:head.x-22,y:head.y+5},4,6,"#d18d69","#5b3b32",1.5);
 // Hair, hard hat shell and rim.
 ellipse(ctx,{x:head.x,y:head.y-21},23,10,"#2b2d36","#182231",2);
 ellipse(ctx,{x:head.x,y:head.y-27},23,10,gradient(ctx,{x:head.x-10,y:head.y-39},{x:head.x+12,y:head.y-19},[[0,"#ffd36b"],[.65,"#ee8c29"],[1,"#a94a1f"]]),"#6b3b1e",2);
 segment(ctx,{x:head.x-26,y:head.y-19},{x:head.x+26,y:head.y-19},5,"#f4a63e","#6b3b1e");
 segment(ctx,{x:head.x-3,y:head.y-34},{x:head.x-3,y:head.y-25},2,"#ffe3a0");
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
 // Tail: overlapping tapered joints for a continuous silhouette.
 segment(ctx,hip,tail1,31,green,"#173b35","#c4df8a");
 segment(ctx,tail1,tail2,25,green,"#173b35","#c4df8a");
 segment(ctx,tail2,tail3,18,green,"#173b35","#c4df8a");
 segment(ctx,tail3,tail4,11,green,"#173b35","#c4df8a");
 // Far hind leg, then near hind leg.
 limb(ctx,hip,kr,26,green,"#b5d57e");limb(ctx,kr,fr,19,green,"#b5d57e");
 polygon(ctx,[{x:fr.x-14,y:fr.y-6},{x:fr.x+12,y:fr.y-4},{x:fr.x+25,y:fr.y+5},{x:fr.x+24,y:fr.y+11},{x:fr.x-17,y:fr.y+10}],"#538c55","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fr.x+9+i*5,y:fr.y+5},{x:fr.x+17+i*5,y:fr.y+7},{x:fr.x+22+i*5,y:fr.y+12}],"#d4d8a0","#5c6848",1);
 limb(ctx,hip,kl,29,green,"#b5d57e");limb(ctx,kl,fl,20,green,"#b5d57e");
 polygon(ctx,[{x:fl.x-15,y:fl.y-6},{x:fl.x+12,y:fl.y-5},{x:fl.x+27,y:fl.y+5},{x:fl.x+25,y:fl.y+12},{x:fl.x-19,y:fl.y+11}],"#659b5c","#1e4b3b",3);
 for(let i=0;i<3;i++)polygon(ctx,[{x:fl.x+9+i*5,y:fl.y+5},{x:fl.x+17+i*5,y:fl.y+7},{x:fl.x+21+i*5,y:fl.y+12}],"#e4dcad","#5c6848",1);
 // Body mass and belly.
 const center=mix(chest,hip,.5);ellipse(ctx,center,68,46,green,"#173b35",5,-.12);
 ellipse(ctx,{x:center.x-6,y:center.y+24},49,19,belly,"#536e4c",2,-.08);
 // Chest/neck connection, front arms.
 segment(ctx,chest,neck,34,green,"#173b35","#c4df8a");
 limb(ctx,sl,el,13,green,"#c4df8a");limb(ctx,el,hl,10,green,"#c4df8a");
 limb(ctx,sr,er,12,green,"#c4df8a");limb(ctx,er,hr,9,green,"#c4df8a");
 for(const hand of [hl,hr])for(let i=0;i<2;i++)segment(ctx,{x:hand.x+i*3,y:hand.y},{x:hand.x+i*3+2,y:hand.y+8},2,"#e2d79f","#526b4a");
 // Dorsal ridge and small plate-like scales.
 const ridgeStart=mix(neck,chest,.25),ridgeEnd=mix(chest,hip,.48);
 for(let i=0;i<7;i++){const t=i/7,a=mix(ridgeStart,ridgeEnd,t),size=11*(1-t*.48);polygon(ctx,[{x:a.x-size,y:a.y-22},{x:a.x,y:a.y-22-size},{x:a.x+size,y:a.y-18}],i%2?"#8fc66b":"#b6d77b","#315f43",2)}
 // Head and muzzle, slightly three-quarter profile.
 const headAngle=Math.atan2(neck.y-head.y,neck.x-head.x);
 ellipse(ctx,head,33,27,gradient(ctx,{x:head.x-24,y:head.y-24},{x:head.x+18,y:head.y+25},[[0,"#c2df80"],[.55,"#78b65c"],[1,"#417b4d"]]),"#173b35",4,-.2);
 polygon(ctx,[{x:head.x-28,y:head.y+5},{x:head.x-6,y:head.y+9},{x:jaw.x+10,y:jaw.y+6},{x:jaw.x+3,y:jaw.y+16},{x:head.x-16,y:head.y+19}],gradient(ctx,head,jaw,[[0,"#8fbd65"],[1,"#386c48"]]),"#173b35",3);
 segment(ctx,{x:head.x-24,y:head.y+11},{x:jaw.x+5,y:jaw.y+9},3,"#3a2629","#1c2026");
 // Teeth along open jaw.
 for(let i=0;i<4;i++){const x=head.x-17+i*8;polygon(ctx,[{x,y:head.y+9+i*.8},{x:x+4,y:head.y+9+i*.8},{x:x+2,y:head.y+16+i}], "#f1edcf","#b1b28e",.8)}
 ellipse(ctx,{x:head.x-8,y:head.y-9},8,8,"#f3c95c","#4b5035",2);
 ellipse(ctx,{x:head.x-10,y:head.y-9},3.5,4.5,"#202c25",null);
 ellipse(ctx,{x:head.x-11,y:head.y-11},1.5,1.5,"#fff4cf",null);
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