/* NEXORA ANIMATE — persistent binary asset store using IndexedDB. */
(()=>{"use strict";
const DB="nexora-animate-assets",STORE="assets",VERSION=1;
function open(){return new Promise((resolve,reject)=>{if(!indexedDB){reject(new Error("IndexedDB no está disponible"));return}const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("No se pudo abrir la biblioteca de recursos"))})}
class AssetStore{
 async put(blob,meta={}){if(!(blob instanceof Blob))throw new Error("El recurso debe ser un archivo");const db=await open(),id="asset_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8),record={id,blob,name:String(meta.name||"recurso"),type:blob.type||meta.type||"application/octet-stream",size:blob.size,createdAt:new Date().toISOString()};await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return{id,name:record.name,type:record.type,size:record.size}}
 async get(id){const db=await open(),result=await new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readonly").objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});db.close();return result}
 async remove(id){const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
 async list(){const db=await open(),items=await new Promise((resolve,reject)=>{const req=db.transaction(STORE,"readonly").objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)});db.close();return items.map(({id,name,type,size,createdAt})=>({id,name,type,size,createdAt}))}
}
window.NexoraAssetStore={AssetStore};
})();