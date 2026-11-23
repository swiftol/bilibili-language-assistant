(()=>{
 function routeKey(){
  const query=new URLSearchParams(location.search),identity=new URLSearchParams();
  for(const key of ['p','bvid','oid','cid'])if(query.has(key))identity.set(key,query.get(key));
  return location.pathname+(identity.size?'?'+identity:'');
 }
 const rawFetch=window.fetch,languages=['en','ja'],segments=new Map(),nativeSegments=new Map(),inflight=new Map(),completed=new Set(),queued=new Map();
 let enabled=false,generation=0,route=routeKey(),video=null,expectedOid='',controller=new AbortController();
 function fields(bytes){let i=0;const out=[];function read(){let x=0n,shift=0n,b;do{if(i>=bytes.length||shift>70n)throw Error('invalid protobuf');b=bytes[i++];x|=BigInt(b&127)<<shift;shift+=7n;}while(b&128);return x;}while(i<bytes.length){const tag=Number(read()),field=tag>>>3,wire=tag&7;if(!field)throw Error('invalid protobuf');if(wire===0)out.push([field,read()]);else if(wire===2){const n=Number(read());if(n<0||i+n>bytes.length)throw Error('invalid protobuf');out.push([field,bytes.subarray(i,i+n)]);i+=n;}else if(wire===1)i+=8;else if(wire===5)i+=4;else throw Error('invalid protobuf');}return out;}
 function decode(buffer){const decoder=new TextDecoder(),result=new Map();for(const [field,data] of fields(new Uint8Array(buffer))){if(field!==1||!(data instanceof Uint8Array))continue;let id='',text='';for(const [key,value] of fields(data)){if(key===1&&typeof value==='bigint'&&!id)id=value.toString();if(key===12&&value instanceof Uint8Array)id=decoder.decode(value);if(key===7&&value instanceof Uint8Array)text=decoder.decode(value);}if(id&&text)result.set(id,text);}return result;}
 function emit(payload){document.dispatchEvent(new CustomEvent('bili-danmaku-official-result',{detail:JSON.stringify(payload)}));}
 function cleanRoute(){
  const next=routeKey();
  if(next===route)return;
  route=next;segments.clear();nativeSegments.clear();video=null;expectedOid='';resetRequests();
 }
 function resetRequests(){
  controller.abort();controller=new AbortController();
  generation++;queued.clear();inflight.clear();completed.clear();
 }
 function segmentKey(url){
  return ['oid','segment_index','ps','pe'].map(name=>url.searchParams.get(name)).join(':');
 }
 function enqueue(url,priority){
  const key=segmentKey(url);
  if(inflight.has(key)||completed.has(key))return;
  queued.set(key,{url,priority:priority||queued.get(key)?.priority});
 }
 function pump(){
  if(!enabled)return;
  while(inflight.size<2&&queued.size){
   const [key,{url}]=[...queued].find(([,entry])=>entry.priority)||queued.entries().next().value;
   queued.delete(key);
   load(key,url);
  }
 }
 function prefetch(){
  if(!enabled||!video?.duration)return;
  const total=Math.min(288,Math.ceil(video.duration/360));
  const template=new URL(video.url);
  template.searchParams.delete('ps');
  template.searchParams.delete('pe');
  template.searchParams.delete('pull_mode');
  template.searchParams.delete('duration');
  template.searchParams.delete('without_subtitle');
  const time=document.querySelector('#bilibili-player video,.bpx-player-container video')?.currentTime||0;
  const current=Math.min(total,Math.floor(time/360)+1);
  // The native player uses two time windows inside the first six-minute segment.
  if(video.splitFirstSegment&&video.duration>120){
   const secondWindow=new URL(template);
   const params=secondWindow.searchParams;
   params.set('segment_index','1');params.set('pull_mode','1');
   params.set('ps','120000');params.set('pe','360000');
   enqueue(secondWindow,time>=120&&time<360);
  }
  for(const index of [current,...Array.from({length:total},(_,i)=>i+1)]){
   const url=new URL(template);
   url.searchParams.set('segment_index',String(index));
   enqueue(url,index===current);
  }
 }
 function remember(url){
  try{
   cleanRoute();
   const u=new URL(url,location.href);
   if(u.hostname!=='api.bilibili.com')return;
   const oid=u.searchParams.get('oid');
   if(!/^\d+$/.test(oid||'')||(expectedOid&&expectedOid!==oid)||(video&&video.oid!==oid))return;
   const view=u.pathname==='/x/v2/dm/web/view';
   const segment=/^\/x\/v2\/dm\/(?:wbi\/)?web\/seg\.so$/.test(u.pathname);
   if(!view&&!segment)return;
   if(!video)video={oid};
   if(view){
    const duration=Number(u.searchParams.get('duration'));
    if(duration>0){video.duration=duration;video.url=u;}
   }else{
    if(u.searchParams.get('pull_mode')==='1'&&u.searchParams.get('ps')==='0'&&u.searchParams.get('pe')==='120000')video.splitFirstSegment=true;
    segments.set(segmentKey(u),u);
    if(segments.size>24)segments.delete(segments.keys().next().value);
    if(enabled)enqueue(u,true);
   }
   prefetch();
   pump();
   return segment?u:null;
  }catch{}
 }
 async function readSegment(url,language,signal){
  const u=new URL(url);
  u.pathname='/x/v2/dm/web/seg.so';
  u.searchParams.delete('w_rid');
  u.searchParams.delete('wts');
  u.searchParams.set('x-bili-locale-json',JSON.stringify({c_locale:{language,...(language==='zh'?{script:'Hans'}:{})},always_translate:language!=='zh'}));
  const res=await rawFetch(u.href,{credentials:'include',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
  if(!res.ok)throw Error('B站弹幕接口 HTTP '+res.status);
  return decode(await res.arrayBuffer());
 }
 function localeOf(url){
  try{
   const language=JSON.parse(url.searchParams.get('x-bili-locale-json')||'{}').c_locale?.language;
   if(languages.includes(language)||language==='zh')return language;
  }catch{}
  return location.pathname.match(/^\/(ja|en)(?=\/)/)?.[1]||'zh';
 }
 function publish(url,language,items,native=false){
  emit({ok:true,route,key:segmentKey(url),native,rows:[...items]
   .filter(([,text])=>text.trim()).map(([id,text])=>({id,[language]:text.trim()}))});
 }
 async function load(key,url){
  if(inflight.has(key)||completed.has(key))return;
  const current=generation;
  inflight.set(key,current);
  const signal=controller.signal;
  try{
   const results=await Promise.all(['zh',...languages].map(async language=>{
    const items=await readSegment(url,language,signal).catch(()=>null);
    cleanRoute();
    if(current!==generation||!enabled||!items)return false;
    publish(url,language,items);
    return true;
   }));
   if(current===generation&&results.every(Boolean))completed.add(key);
  }finally{
   if(inflight.get(key)===current){inflight.delete(key);pump();}
  }
 }
 function readNative(url,buffer,requestRoute){
  cleanRoute();
  if(route!==requestRoute||video?.oid!==url.searchParams.get('oid'))return;
  try{
   const items=decode(buffer),language=localeOf(url);
   nativeSegments.set(segmentKey(url),{url,language,items});
   if(nativeSegments.size>24)nativeSegments.delete(nativeSegments.keys().next().value);
   if(enabled)publish(url,language,items,true);
  }catch{}
 }
 document.addEventListener('bili-dual-data',event=>{
  let message;
  try{message=JSON.parse(event.detail);}catch{return;}
  if(message.type!=='media'||message.page!==location.pathname)return;
  cleanRoute();
  const {cid,aid,duration}=message.data||{};
  if(!/^\d+$/.test(cid||''))return;
  expectedOid=cid;
  if(video&&video.oid!==cid){
   segments.clear();nativeSegments.clear();video=null;resetRequests();
   document.dispatchEvent(new Event('bili-danmaku-official-reset'));
  }
  if(!video?.duration&&duration>0&&/^\d+$/.test(aid||'')){
   const url=new URL('https://api.bilibili.com/x/v2/dm/web/view');
   url.search=new URLSearchParams({type:'1',oid:cid,pid:aid,duration:String(duration),web_location:'1315873'});
   remember(url.href);
  }
 });
 document.addEventListener('bili-danmaku-official-toggle',e=>{
  cleanRoute();
  const next=e.detail==='on';
  if(next!==enabled){enabled=next;resetRequests();}
  if(enabled){
   if(next)for(const {url,language,items} of nativeSegments.values())publish(url,language,items,true);
   for(const url of segments.values())enqueue(url,true);
   prefetch();pump();
  }
 });
 window.fetch=async function(...args){
  const input=args[0],url=remember(typeof input==='string'?input:input?.url||input?.href);
  const requestRoute=route;
  const response=await rawFetch.apply(this,args);
  if(url&&response.ok)response.clone().arrayBuffer().then(buffer=>readNative(url,buffer,requestRoute)).catch(()=>{});
  return response;
 };
 const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send,urls=new WeakMap();
 XMLHttpRequest.prototype.open=function(method,url,...rest){
  urls.set(this,String(url));return open.call(this,method,url,...rest);
 };
 XMLHttpRequest.prototype.send=function(...args){
  const url=remember(urls.get(this)),requestRoute=route;
  if(url)this.addEventListener('load',()=>{
   if(this.status===200&&this.response instanceof ArrayBuffer)readNative(url,this.response,requestRoute);
  },{once:true});
  return send.apply(this,args);
 };
})();
