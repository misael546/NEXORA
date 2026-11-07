/* NEXORA ANIMATE — hierarchical 3D skeleton and CPU linear-blend skinning foundation. */
(()=>{"use strict";
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const compose=(t=[0,0,0],q=[0,0,0,1],s=[1,1,1])=>{const[x,y,z,w]=q;return[(1-2*(y*y+z*z))*s[0],2*(x*y+z*w)*s[0],2*(x*z-y*w)*s[0],0,2*(x*y-z*w)*s[1],(1-2*(x*x+z*z))*s[1],2*(y*z+x*w)*s[1],0,2*(x*z+y*w)*s[2],2*(y*z-x*w)*s[2],(1-2*(x*x+y*y))*s[2],0,t[0],t[1],t[2],1]};
const transform=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
class SpatialRig3D{
 constructor(bones=[]){this.bones=[];this.byName=new Map();this.addBones(bones)}
 addBones(bones){for(const b of bones){if(!b.name||this.byName.has(b.name))throw Error("Nombre de hueso inválido o duplicado");const bone={name:b.name,parent:b.parent??null,translation:(b.translation||[0,0,0]).slice(),rotation:(b.rotation||[0,0,0,1]).slice(),scale:(b.scale||[1,1,1]).slice(),world:I()};if(bone.parent!==null&&!this.byName.has(bone.parent))throw Error("El padre debe existir antes que el hijo: "+bone.name);this.bones.push(bone);this.byName.set(bone.name,bone)}this.updateWorld();return this}
 setPose(name,pose={}){const b=this.byName.get(name);if(!b)throw Error("Hueso no encontrado: "+name);if(pose.translation)b.translation=pose.translation.slice();if(pose.rotation)b.rotation=pose.rotation.slice();if(pose.scale)b.scale=pose.scale.slice();this.updateWorld();return this}
 updateWorld(){for(const b of this.bones){const local=compose(b.translation,b.rotation,b.scale),parent=b.parent?this.byName.get(b.parent).world:I();b.world=mul(parent,local)}return this}
 worldPosition(name){const b=this.byName.get(name);if(!b)throw Error("Hueso no encontrado: "+name);return[b.world[12],b.world[13],b.world[14]]}
 skinVertices(positions,joints,weights,inverseBindMatrices,jointBoneIndices){const vertices=positions.length/3,influences=vertices?joints.length/vertices:0;if(positions.length%3||!Number.isInteger(influences)||![4,8].includes(influences)||weights.length!==joints.length)throw Error("Datos de skin incompatibles");const boneIndices=jointBoneIndices||this.bones.map((_,i)=>i),matrices=boneIndices.map((boneIndex,i)=>{const b=this.bones[boneIndex];if(!b)throw Error("Índice de hueso fuera del rig: "+boneIndex);return mul(b.world,inverseBindMatrices?.[i]||I())}),out=[];for(let i=0;i<vertices;i++){const p=positions.slice(i*3,i*3+3);let v=[0,0,0],sum=0;for(let j=0;j<influences;j++){const k=i*influences+j,w=weights[k],bone=matrices[joints[k]];if(w<=0||!bone)continue;const q=transform(bone,p);v[0]+=q[0]*w;v[1]+=q[1]*w;v[2]+=q[2]*w;sum+=w}if(sum<1e-8)v=p;else if(Math.abs(sum-1)>1e-5)v=v.map(x=>x/sum);out.push(...v)}return out}
 exportJSON(){return{format:"nexora-spatial-rig",version:1,bones:this.bones.map(({name,parent,translation,rotation,scale})=>({name,parent,translation,rotation,scale}))}}
 static fromJSON(data){if(data?.format!=="nexora-spatial-rig"||!Array.isArray(data.bones))throw Error("Rig 3D inválido");return new SpatialRig3D(data.bones)}
}
const dinosaur=()=>new SpatialRig3D([
{name:"root",translation:[0,0,0]},
{name:"pelvis",parent:"root",translation:[0,.78,0]},
{name:"spine",parent:"pelvis",translation:[.12,.12,0]},
{name:"chest",parent:"spine",translation:[.34,.12,0]},
{name:"neckBase",parent:"chest",translation:[.28,.16,0]},
{name:"neckMid",parent:"neckBase",translation:[.18,.22,0]},
{name:"head",parent:"neckMid",translation:[.16,.18,0]},
{name:"jaw",parent:"head",translation:[.16,-.12,0]},
{name:"armL",parent:"chest",translation:[.02,-.12,-.25]},
{name:"armR",parent:"chest",translation:[.02,-.12,.25]},
{name:"thighL",parent:"pelvis",translation:[-.12,-.18,-.2]},
{name:"shinL",parent:"thighL",translation:[-.04,-.3,0]},
{name:"footL",parent:"shinL",translation:[.12,-.1,.02]},
{name:"thighR",parent:"pelvis",translation:[-.12,-.18,.2]},
{name:"shinR",parent:"thighR",translation:[-.04,-.3,0]},
{name:"footR",parent:"shinR",translation:[.12,-.1,-.02]},
{name:"tailBase",parent:"pelvis",translation:[-.3,.04,0]},
{name:"tailMid",parent:"tailBase",translation:[-.38,.02,0]},
{name:"tailTip",parent:"tailMid",translation:[-.34,-.02,0]}
]);
const humanoid=()=>new SpatialRig3D([{name:"root",translation:[0,0,0]},{name:"pelvis",parent:"root",translation:[0,1,0]},{name:"spine",parent:"pelvis",translation:[0,.35,0]},{name:"chest",parent:"spine",translation:[0,.35,0]},{name:"neck",parent:"chest",translation:[0,.3,0]},{name:"head",parent:"neck",translation:[0,.2,0]},{name:"shoulderL",parent:"chest",translation:[-.28,.15,0]},{name:"armUpperL",parent:"shoulderL",translation:[-.22,0,0]},{name:"armLowerL",parent:"armUpperL",translation:[-.3,0,0]},{name:"shoulderR",parent:"chest",translation:[.28,.15,0]},{name:"armUpperR",parent:"shoulderR",translation:[.22,0,0]},{name:"armLowerR",parent:"armUpperR",translation:[.3,0,0]},{name:"thighL",parent:"pelvis",translation:[-.14,-.1,0]},{name:"shinL",parent:"thighL",translation:[0,-.42,0]},{name:"thighR",parent:"pelvis",translation:[.14,-.1,0]},{name:"shinR",parent:"thighR",translation:[0,-.42,0]}]);
window.NexoraSpatialRig3D={SpatialRig3D,createHumanoid:humanoid,createDinosaur:dinosaur,math:{identity:I,multiply:mul,compose,transform}};
})();