/* NEXORA ANIMATE — 3D camera math, orbit controls and perspective projection foundation. */
(()=>{"use strict";
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),scale=(a,s)=>V(a.x*s,a.y*s,a.z*s),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x),length=a=>Math.hypot(a.x,a.y,a.z),norm=a=>{const n=length(a)||1;return scale(a,1/n)};
const presets={front:{yaw:0,pitch:0},back:{yaw:Math.PI,pitch:0},left:{yaw:-Math.PI/2,pitch:0},right:{yaw:Math.PI/2,pitch:0},top:{yaw:0,pitch:-Math.PI/2+.001},bottom:{yaw:0,pitch:Math.PI/2-.001},"three-quarter":{yaw:Math.PI/4,pitch:-.12}};
class SpatialCamera{
 constructor(options={}){this.target=options.target||V();this.yaw=options.yaw??Math.PI/4;this.pitch=options.pitch??-.12;this.distance=options.distance??5;this.fov=options.fov??50;this.projection=options.projection||"perspective";this.orthoScale=options.orthoScale??4;this.near=options.near??.01;this.far=options.far??10000}
 setView(name){const p=presets[name];if(!p)throw new Error("Perspectiva desconocida: "+name);this.yaw=p.yaw;this.pitch=p.pitch;return this}
 orbit(deltaYaw,deltaPitch){this.yaw+=deltaYaw;this.pitch=Math.max(-Math.PI/2+.001,Math.min(Math.PI/2-.001,this.pitch+deltaPitch));return this}
 dolly(amount){this.distance=Math.max(.05,Math.min(1e5,this.distance*Math.exp(amount)));return this}
 getBasis(){const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);const offset=V(this.distance*cp*sy,-this.distance*sp,this.distance*cp*cy),position=add(this.target,offset),forward=norm(sub(this.target,position)),right=norm(cross(forward,V(0,1,0))),up=norm(cross(right,forward));return{position,forward,right,up}}
 project(point,width,height){const b=this.getBasis(),rel=sub(point,b.position),x=dot(rel,b.right),y=dot(rel,b.up),z=dot(rel,b.forward);if(z<this.near||z>this.far)return{visible:false,x:NaN,y:NaN,depth:z};if(this.projection==="orthographic"){const s=height/this.orthoScale;return{visible:true,x:width/2+x*s,y:height/2-y*s,depth:z}}const f=height/(2*Math.tan(this.fov*Math.PI/360));return{visible:true,x:width/2+x*f/z,y:height/2-y*f/z,depth:z}}
 exportJSON(){return{format:"nexora-spatial-camera",version:1,target:this.target,yaw:this.yaw,pitch:this.pitch,distance:this.distance,fov:this.fov,projection:this.projection,orthoScale:this.orthoScale,near:this.near,far:this.far}}
}
class SpatialScene{
 constructor(){this.nodes=new Map();this.camera=new SpatialCamera()}
 addNode(node){if(!node?.id)throw new Error("Nodo 3D necesita id");this.nodes.set(node.id,{id:node.id,position:node.position||V(),rotation:node.rotation||V(),scale:node.scale||V(1,1,1),geometry:node.geometry||"point"});return this.nodes.get(node.id)}
 project(width,height){return[...this.nodes.values()].map(n=>({id:n.id,geometry:n.geometry,...this.camera.project(n.position,width,height)}))}
}
window.NexoraSpatialEngine={SpatialCamera,SpatialScene,vector:{create:V,add,subtract:sub,scale,dot,cross,normalize:norm},views:Object.keys(presets)};
})();