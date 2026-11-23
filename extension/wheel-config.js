// Shared ordered-ring model. Sector count always follows item count.
(function(root){
 const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
 const folderId=v=>/^\d+$/.test(String(v))?String(v):'';
 function normalize(value={},folders=[]){if(!value||typeof value!=='object'||Array.isArray(value))value={};let layers;
  if(Array.isArray(value.layers)&&value.layers.length)layers=value.layers;
  else if(Array.isArray(value.pinned))layers=[{slots:value.pinned}];
  else layers=[{slots:folders.slice(0,6).map(f=>f.id)},{slots:folders.slice(6,22).map(f=>f.id)}];
  layers=layers.map(item=>{const layer=item&&typeof item==='object'?item:{},raw=Array.isArray(layer.slots)?layer.slots:[],limit=value.version>=3?64:Math.max(0,Math.min(64,Math.round(finite(layer.count,raw.length))));const slots=raw.slice(0,limit).map(folderId).filter(Boolean);return {count:slots.length,rotation:((finite(layer.rotation,0)%360)+360)%360,slots};});
  return {version:3,layers,visibleLayers:Math.max(1,Math.min(layers.length,Math.round(finite(value.visibleLayers,2)))),autoDefault:value.autoDefault!==false,defaultFolderId:folderId(value.defaultFolderId)};
 }
 function geometry(config,width,height,start=0){const first=Math.max(0,Math.min(config.layers.length-1,start)),layers=config.layers.slice(first,first+config.visibleLayers);let inner=40;const rings=layers.map((layer,i)=>{const radius=Math.max(inner+60,layer.count*80/(2*Math.PI)),outer=radius+48,r={index:first+i,count:layer.count,rotation:layer.rotation,inner,radius,outer};inner=outer+10;return r;});const outer=rings.at(-1)?.outer||150,scale=Math.max(Number.EPSILON,Math.min(1,(Math.min(width,height)-24)/(2*outer)));return {rings:rings.map(r=>({...r,inner:r.inner*scale,radius:r.radius*scale,outer:r.outer*scale})),scale,outer:outer*scale,start:first};}
 function assignments(config,folders){const byId=new Map(folders.map(f=>[String(f.id),f]));return config.layers.flatMap((layer,layerIndex)=>layer.slots.map((id,slotIndex)=>{const f=byId.get(id);return f?{...f,layerIndex,slotIndex,count:layer.count,rotation:layer.rotation}:null;}).filter(Boolean));}
 function insert(config,targetLayer,targetIndex,payload){const copy=normalize(config),target=copy.layers[targetLayer];if(!target)throw Error('目标层已改变，请重试');let at=Math.max(0,Math.min(target.slots.length,Math.round(finite(targetIndex,target.slots.length)))),id;
  if(Array.isArray(payload.from)){const [a,b]=payload.from,source=copy.layers[a];if(!source||!Number.isInteger(b)||!source.slots[b])throw Error('拖动项目已改变，请重试');id=source.slots.splice(b,1)[0];if(a===targetLayer&&b<at)at--;}
  else{id=folderId(payload.folder);if(!id)throw Error('请选择收藏夹');const existing=target.slots.indexOf(id);if(existing>=0){target.slots.splice(existing,1);if(existing<at)at--;}}
  if(target.slots.length>=64)throw Error('本层最多放 64 项，可以增加一层');target.slots.splice(at,0,id);copy.layers.forEach(layer=>layer.count=layer.slots.length);return normalize(copy);
 }
 function swap(config,sourceLayer,sourceIndex,targetLayer,targetIndex){
  const copy=normalize(config);
  const source=copy.layers[sourceLayer]?.slots;
  const target=copy.layers[targetLayer]?.slots;
  if(!Number.isInteger(sourceIndex)||!Number.isInteger(targetIndex)||!source?.[sourceIndex]||!target?.[targetIndex]){
   throw Error('拖动位置已改变，请重试');
  }
  [source[sourceIndex],target[targetIndex]]=[target[targetIndex],source[sourceIndex]];
  return copy;
 }
 function remove(config,layer,index){const copy=normalize(config),ring=copy.layers[layer];if(!ring||!Number.isInteger(index)||!ring.slots[index])throw Error('项目已改变，请重试');ring.slots.splice(index,1);ring.count=ring.slots.length;return normalize(copy);}
 const api={normalize,geometry,assignments,insert,swap,remove};root.BiliWheelConfig=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
