/* NEXORA ANIMATE — CPU 2D triangle-mesh image deformer. */
(()=>{"use strict";
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function barycentric(p,a,b,c){const v0={x:b.x-a.x,y:b.y-a.y},v1={x:c.x-a.x,y:c.y-a.y},v2={x:p.x-a.x,y:p.y-a.y},d=v0.x*v1.y-v1.x*v0.y;if(Math.abs(d)<1e-8)return null;const v=(v2.x*v1.y-v1.x*v2.y)/d,w=(v0.x*v2.y-v2.x*v0.y)/d;return{u:1-v-w,v,w}}
function affine(ctx,s0,s1,s2,d0,d1,d2){const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(Math.abs(den)<1e-8)return false;const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den,b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den,c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den,d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den,e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den,f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den;ctx.transform(a,b,c,d,e,f);return true}
class MeshDeformer{
 constructor(options={}){this.columns=Math.max(2,Math.min(32,options.columns||8));this.rows=Math.max(2,Math.min(32,options.rows||10));this.strength=clamp(options.strength??1,0,1);this.controls=[];this.source=null}
 setControls(controls){this.controls=(controls||[]).filter(c=>c.source&&c.target).map(c=>({source:{x:clamp(c.source.x),y:clamp(c.source.y)},target:{x:clamp(c.target.x),y:clamp(c.target.y)}}));return this.controls.length}
 capture(points){this.controls=Object.values(points||{}).map(p=>({source:{x:clamp(p.x),y:clamp(p.y)},target:{x:clamp(p.x),y:clamp(p.y)}}));return this.controls.length}
 updateTargets(points){for(const control of this.controls){const p=points[control.name];if(p)control.target={x:clamp(p.x),y:clamp(p.y)}}}
 grid(){const out=[];for(let y=0;y<=this.rows;y++)for(let x=0;x<=this.columns;x++)out.push({x:x/this.columns,y:y/this.rows});return out}
 deformPoint(point){if(!this.controls.length)return{...point};let dx=0,dy=0,total=0;for(const c of this.controls){const d=dist2(point,c.source),w=1/Math.max(0.0004,d*d);dx+=(c.target.x-c.source.x)*w;dy+=(c.target.y-c.source.y)*w;total+=w}if(!total)return{...point};return{x:clamp(point.x+dx/total*this.strength,-.5,1.5),y:clamp(point.y+dy/total*this.strength,-.5,1.5)}}
 draw(ctx,image,bounds={x:0,y:0,width:image.width,height:image.height}){if(!ctx||!image||!bounds.width||!bounds.height)return false;const src=this.grid(),dst=src.map(p=>this.deformPoint(p)),idx=(x,y)=>y*(this.columns+1)+x;let drawn=0;ctx.save();for(let y=0;y<this.rows;y++)for(let x=0;x<this.columns;x++){const triangles=[[idx(x,y),idx(x+1,y),idx(x+1,y+1)],[idx(x,y),idx(x+1,y+1),idx(x,y+1)]];for(const ids of triangles){const s=ids.map(i=>({x:src[i].x*image.width,y:src[i].y*image.height})),d=ids.map(i=>({x:bounds.x+dst[i].x*bounds.width,y:bounds.y+dst[i].y*bounds.height}));ctx.save();ctx.beginPath();ctx.moveTo(d[0].x,d[0].y);ctx.lineTo(d[1].x,d[1].y);ctx.lineTo(d[2].x,d[2].y);ctx.closePath();ctx.clip();if(affine(ctx,s[0],s[1],s[2],d[0],d[1],d[2])){ctx.drawImage(image,0,0);drawn++}ctx.restore()}}ctx.restore();return drawn>0}
 reset(){for(const c of this.controls)c.target={...c.source}}
 exportJSON(){return JSON.stringify({version:1,columns:this.columns,rows:this.rows,strength:this.strength,controls:this.controls},null,2)}
 importJSON(raw){const d=typeof raw==="string"?JSON.parse(raw):raw;if(d.version!==1||!Array.isArray(d.controls))throw new Error("Malla incompatible");this.columns=Math.max(2,Math.min(32,d.columns||8));this.rows=Math.max(2,Math.min(32,d.rows||10));this.strength=clamp(d.strength??1,0,1);this.setControls(d.controls);return this}
}
window.NexoraMeshDeformer={MeshDeformer,barycentric,affine};
})();