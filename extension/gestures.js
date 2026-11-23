// Hold + drag menus, implemented independently; design references are in README.
(()=>{
 if(document.getElementById('bili-gesture-host'))return;
 const host=document.createElement('div');host.id='bili-gesture-host';host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647';
 const root=host.attachShadow({mode:'open'});root.innerHTML=`<style>:host{font:13px system-ui;color:#eff8ff}#menu{position:fixed;inset:0;pointer-events:none}#menu[hidden],#toast[hidden]{display:none}svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.item{position:fixed;box-sizing:border-box;width:100px;min-height:44px;padding:8px;border:1px solid #73918c;background:#13252df5;color:#eff8ff;border-radius:13px;text-align:center;font:13px system-ui;line-height:1.35;box-shadow:0 5px 18px #0005;pointer-events:none;overflow-wrap:anywhere;transition:background .08s,box-shadow .08s}.item[data-saved=true]{background:#16564af5;border-color:#71e3c3;color:#e9fff8}.item[data-saved=false]{background:#303844f5;border-color:#a5afbf;color:#eef2f7}.item[aria-current=true]{background:#71e3c3;color:#10212a;border-color:#d0fff1;box-shadow:0 0 0 3px #71e3c34d}.item small{display:block;font-size:10px;opacity:.8;margin-top:3px}.hub{position:fixed;width:80px;height:80px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:8px;background:#13252df5;border:1px solid #73918c;border-radius:50%;transform:translate(-50%,-50%);text-align:center;white-space:pre-line;font-size:11px;line-height:1.5;text-shadow:0 1px 4px #000}#toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);max-width:75vw;padding:10px 16px;border-radius:10px;background:#14262ef5;border:1px solid #71e3c3;color:#eff8ff;box-shadow:0 6px 28px #0006;font-size:14px}</style><div id="menu" hidden role="menu" aria-label="拖动快捷菜单"></div><div id="toast" hidden role="status" aria-live="polite"></div>`;
 const menu=root.querySelector('#menu'),notice=root.querySelector('#toast');
 const audioProfiles=[['ja','中日','日'],['en','中英','英']];
 const favoriteSelector='#arc_toolbar_report .video-fav,.video-toolbar-left .video-fav,.video-toolbar .video-fav,.video-fav.video-toolbar-left-item';
 let gesture=null,lastRelease=null,blockedPointer=null,toastTimer,cache=null,loading=null,currentRoute,requestNumber=0,quickAudioUntil=0;
 const requests=new Map(),route=()=>location.pathname+location.search,bvid=()=>location.pathname.match(/\/video\/(BV[\w]+)/)?.[1]||globalThis.BiliWatchLaterRoute?.videoId()||'';
 const contextKey=()=>route()+'|'+bvid();currentRoute=contextKey();
 const stop=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
 function mount(){const parent=document.fullscreenElement||document.documentElement;if(host.parentElement!==parent)parent.append(host);}
 function toast(text){mount();notice.textContent=text;notice.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.hidden=true,3800);}
 function targetFor(source){
  const controls=source.closest('[data-bili-card-actions]');
  return {route:route(),bvid:BiliVideoCardContext.videoId(controls?.closest(BiliVideoCardContext.cardSelector)),cardKey:controls?.id};
 }
 function stillCurrent(target){
  return target.cardKey?target.route===route()&&BiliVideoCardContext.matches(target.cardKey,target.bvid):target.context===contextKey();
 }
 function request(action,extra={},target={route:route(),bvid:bvid(),context:contextKey()}){if(!target.bvid||!stillCurrent(target))return Promise.reject(Error('当前视频尚未就绪'));return new Promise((resolve,reject)=>{const id=Date.now()+'-'+(++requestNumber),r={...extra,id,action,bvid:target.bvid,route:target.route,cardKey:target.cardKey};const timer=setTimeout(()=>{requests.delete(id);reject(Error('请求超时，请重试'));},35000);requests.set(id,{resolve,reject,timer,target});document.dispatchEvent(new CustomEvent('bili-gesture-request',{detail:JSON.stringify(r)}));});}
 document.addEventListener('bili-gesture-result',e=>{let r;try{r=JSON.parse(e.detail);}catch{return;}const job=requests.get(r.id);if(!job)return;clearTimeout(job.timer);requests.delete(r.id);if(!stillCurrent(job.target))job.reject(Error('视频已切换'));else if(r.ok)job.resolve(r.data);else job.reject(Error(r.message||'操作失败'));});
 async function getFolders(force=false,target){if(target?.cardKey){const data=await request('folders',{},target);await rememberAccount(data);return data;}if(!force&&cache?.context===contextKey()&&Date.now()-cache.time<30000)return cache.data;const key=contextKey();if(!force&&loading?.context===key)return loading.task;const task=request('folders').then(async data=>{if(contextKey()!==key)throw Error('视频已切换');cache={context:key,time:Date.now(),data};await rememberAccount(data);if(contextKey()!==key)throw Error('视频已切换');renderSettings(data);return data;});loading={context:key,task};try{return await task;}finally{if(loading?.task===task)loading=null;}}
 function preferences(mid){try{return JSON.parse(localStorage.getItem('bili-favorite-wheel:'+mid)||'{}');}catch{return {};}}
 function configFor(data){return BiliWheelConfig.normalize(preferences(data.mid),data.folders);}
 function favorites(data){return BiliWheelConfig.assignments(configFor(data),data.folders);}
 function selectAt(g,x,y){if(!g.items.length||Math.hypot(x-g.start.x,y-g.start.y)<28)return -1;
  const dx=x-g.center.x,dy=y-g.center.y,distance=Math.hypot(dx,dy);
  if(g.kind==='favorite'){const ring=g.rings?.find(r=>distance>=r.inner&&distance<=r.outer);if(!ring?.count)return -1;const angle=((Math.atan2(dy,dx)+Math.PI/2-ring.rotation*Math.PI/180)%(Math.PI*2)+Math.PI*2)%(Math.PI*2),slot=Math.round(angle/(Math.PI*2/ring.count))%ring.count;return g.items.findIndex(item=>item.layerIndex===ring.index&&item.slotIndex===slot);}
  const hit=g.items.findIndex(item=>{const r=item.node.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});if(hit>=0)return hit;if(dy>-32||distance>240)return -1;return dx<-45?0:dx>45?2:1;
 }
 function highlight(g,x,y){const index=selectAt(g,x,y);g.selected=index;g.items.forEach((item,i)=>{item.node.setAttribute('aria-current',String(i===index));item.path?.setAttribute('stroke',i===index?'#71e3c3':'#78968f');item.path?.setAttribute('fill',g.kind==='favorite'?(i===index?'#58d8ba99':item.saved?'#16564ae8':'#303844e8'):'none');});}
 function audioItems(){
  let ears;
  try{ears=JSON.parse(localStorage.getItem('bili-dual-ear-slots')||'null');}catch{}
  const pairs=audioProfiles.map(([id,title,lang],column)=>({
   id,title,column,profile:id,
   note:ears?.left==='original'&&ears.right===id?'左原声 / 右'+lang:'左'+lang+' / 右原声'
  }));
  return [...pairs,{id:'original',title:'原声',note:'保留原始立体声',column:2,profile:'original'},
   ...pairs.map(pair=>({id:pair.id+'-swap',title:pair.title+'：切换双耳',profile:pair.id,swap:true}))];
 }
 function draw(g,items){
  if(gesture!==g||!g.active)return;mount();menu.replaceChildren();menu.hidden=false;g.items=[];
  let layout;
  if(g.kind==='favorite'&&g.config){layout=BiliWheelConfig.geometry(g.config,innerWidth,innerHeight,g.layerStart||0);g.rings=layout.rings;const margin=layout.outer+12;g.center={x:Math.max(margin,Math.min(innerWidth-margin,g.start.x)),y:Math.max(margin,Math.min(innerHeight-margin,g.start.y))};}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);menu.append(svg);
  const hub=document.createElement('div');hub.className='hub';hub.style.left=(g.kind==='audio'?g.start.x:g.center.x)+'px';hub.style.top=(g.kind==='audio'?g.start.y:g.center.y)+'px';hub.textContent=layout?`第 ${layout.rings[0].index+1}–${layout.rings.at(-1).index+1} 层\n${g.config.layers.length>g.config.visibleLayers?'滚轮翻层':g.pinned?'点击收藏夹':'松手确认'}`:items.length?'拖到目标\n松手确认':'正在读取…';menu.append(hub);
  function wedge(ring,slot,empty){const step=2*Math.PI/ring.count,angle=-Math.PI/2+ring.rotation*Math.PI/180+slot*step,a=angle-step*.48,b=angle+step*.48,point=(radius,t)=>`${g.center.x+radius*Math.cos(t)} ${g.center.y+radius*Math.sin(t)}`,path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${point(ring.inner,a)} L ${point(ring.outer,a)} A ${ring.outer} ${ring.outer} 0 ${step>Math.PI?1:0} 1 ${point(ring.outer,b)} L ${point(ring.inner,b)} A ${ring.inner} ${ring.inner} 0 ${step>Math.PI?1:0} 0 ${point(ring.inner,a)} Z`);path.setAttribute('stroke',empty?'#78968f44':'#78968f');path.setAttribute('fill',empty?'#13252d66':'#13252de8');path.setAttribute('stroke-width','1.5');svg.append(path);return path;}
  if(layout)for(const ring of layout.rings)for(let slot=0;slot<ring.count;slot++)if(!items.some(item=>item.layerIndex===ring.index&&item.slotIndex===slot))wedge(ring,slot,true);
  items.forEach(item=>{
   const ring=layout?.rings.find(r=>r.index===item.layerIndex);if(layout&&!ring)return;
   const angle=g.kind==='favorite'?-Math.PI/2+ring.rotation*Math.PI/180+item.slotIndex*2*Math.PI/ring.count:0;
   const parent=item.swap?g.items.find(entry=>entry.id===item.profile)?.node.getBoundingClientRect():null;
   const audioWidth=Math.min(100,Math.max(44,(innerWidth-32)/3));
   const x=ring?g.center.x+ring.radius*Math.cos(angle):parent?(parent.left+parent.right)/2:g.center.x+(item.column-1)*(audioWidth+8);
   const y=ring?g.center.y+ring.radius*Math.sin(angle):g.center.y-112;
   const node=document.createElement(g.pinned?'button':'div');if(g.pinned)node.type='button';node.className='item';node.setAttribute('role','menuitem');node.dataset.key=item.id;if(g.kind==='favorite')node.dataset.saved=String(!!item.saved);node.title=item.title;if(item.swap){node.classList.add('ear-swap-item');node.setAttribute('aria-label',item.title);}node.dataset.layerIndex=item.layerIndex??'';node.dataset.slotIndex=item.slotIndex??'';
   const width=ring?Math.max(24,Math.min(100,2*ring.radius*Math.sin(Math.PI/Math.max(2,ring.count))-6)):item.swap?34:audioWidth;node.style.width=width+'px';node.style.minHeight=(layout?Math.max(24,40*layout.scale):item.swap?32:44)+'px';node.style.padding=(layout?Math.max(2,6*layout.scale):item.swap?0:8)+'px';node.style.fontSize=(layout?Math.max(8,12*layout.scale):item.swap?18:13)+'px';node.style.left=Math.max(8,Math.min(innerWidth-width-8,x-width/2))+'px';node.style.top=(parent?parent.bottom+6:Math.max(8,Math.min(innerHeight-50,y-20)))+'px';
   const title=document.createElement('span');title.textContent=item.swap?'⇄':item.title;title.style.cssText='display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';node.append(title);const sub=document.createElement('small');sub.textContent=item.note||((g.pinned?'点击':'松手')+(item.saved?'取消收藏':'收藏'));if(!item.swap&&(!layout||layout.scale>.75&&width>55))node.append(sub);menu.append(node);
   let path;if(ring)path=wedge(ring,item.slotIndex,false);else{path=document.createElementNS('http://www.w3.org/2000/svg','path');const r=node.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2;path.setAttribute('d',parent?`M ${tx} ${parent.bottom} V ${r.top}`:`M ${g.start.x} ${g.start.y} C ${g.start.x} ${g.start.y-55} ${tx} ${ty+55} ${tx} ${ty}`);path.setAttribute('fill','none');path.setAttribute('stroke','#78968f');path.setAttribute('stroke-width','2');svg.append(path);}g.items.push({...item,node,path});
  });highlight(g,g.last.x,g.last.y);
 }
 async function activate(g){if(gesture!==g||g.active)return;if(g.kind==='audio')document.getElementById('bili-dual-native')?.shadowRoot?.querySelector('#collapse')?.click();g.active=true;clearTimeout(g.timer);if(!g.pinned)try{g.source.setPointerCapture(g.pointerId);}catch{}
  if(g.kind==='audio'){draw(g,audioItems());return;}
  draw(g,[]);try{const data=await (g.folderTask||getFolders(false,g.target));if(gesture!==g||!stillCurrent(g.target))return;g.data=data;g.mid=data.mid;g.config=configFor(data);g.layerStart=0;
   // A permanent wheel listener suppresses the legacy mousewheel event used by Bilibili.
   if(g.config.layers.length>g.config.visibleLayers)document.addEventListener('wheel',turnWheelLayer,{capture:true,passive:false});
   const list=favorites(data);draw(g,list);if(!list.length){toast('没有可用的常用收藏夹，请在轮盘设置中选择');cancel();}}catch(error){if(gesture===g){toast(error.message);cancel();}}
 }
 function cancel(block=true){if(!gesture)return;document.removeEventListener('wheel',turnWheelLayer,true);if(block&&gesture.active&&!gesture.pinned)blockedPointer=gesture.pointerId;menu.removeAttribute('data-pinned');clearTimeout(gesture.timer);gesture=null;menu.hidden=true;}
 async function choose(g,item){
  if(!stillCurrent(g.target))return;
  if(g.kind==='audio'){quickAudioUntil=performance.now()+20000;toast(item.swap?'正在切换双耳…':'正在切换到'+item.title+'…');document.dispatchEvent(new CustomEvent('bili-dual-audio-profile',{detail:JSON.stringify({profile:item.profile,swap:item.swap===true})}));return;}
  const removing=!!item.saved;toast((removing?'正在取消收藏“':'正在收藏到“')+item.title+'”…');try{const result=await request(removing?'remove':'add',{folderId:item.id,autoDefault:g.config?.autoDefault!==false,defaultFolderId:g.config?.defaultFolderId||''},g.target);if(!stillCurrent(g.target))return;const prefs=preferences(g.mid);prefs.usage={...prefs.usage,[item.id]:(prefs.usage?.[item.id]||0)+1};localStorage.setItem('bili-favorite-wheel:'+g.mid,JSON.stringify(prefs));if(cache&&!g.target.cardKey)for(const f of cache.data.folders)if((result.savedIds||[item.id]).includes(f.id))f.saved=!removing;if(removing){toast((result.already?'已不在':'已取消收藏')+'“'+result.title+'”');}else{g.source.classList.add('on');toast((result.already?'已经在':'已收藏到')+(result.savedTitles||[result.title]).map(title=>'“'+title+'”').join(' 和 '));}}catch(error){if(stillCurrent(g.target))toast(error.message);}
 }
 globalThis.BiliPanelTheme?.mount(root);
 root.querySelector('style').textContent +=
  '.item,.hub,#toast{background:var(--panel,#101923);color:var(--ink,#edf4fb);border-color:#516674}'+
  '.item[data-saved=true]{background:#17413b;border-color:#83ebce}.item[data-saved=false]{background:#233443;border-color:#75899c}'+
  '.item[aria-current=true]{background:var(--accent,#83ebce);color:#10271f;border-color:#adf8e2}'+
  '.ear-swap-item{display:grid;place-items:center;border-radius:50%;line-height:1}'+
  '#menu[data-pinned]{pointer-events:auto}#menu[data-pinned] .item{pointer-events:auto;cursor:pointer}'+
  '#menu[data-pinned] .item:hover{border-color:#83ebce;background:#17413b}';
 function newGesture(source,kind,x,y,card){
  const start={x,y},target=card?targetFor(source):{route:route(),bvid:bvid(),context:contextKey()};
  const edge=Math.min(166,innerWidth/2);
  const center=kind==='audio'?{x:Math.max(edge,Math.min(innerWidth-edge,x)),y}:
   {x:Math.max(174,Math.min(innerWidth-174,x)),y:Math.max(174,Math.min(innerHeight-174,y))};
  return {kind,source,start,last:start,target,center,active:false,items:[],selected:-1};
 }
 let cardPress;
 menu.addEventListener('click',e=>{
  const g=gesture;
  if(!g?.pinned)return;
  stop(e);
  const item=g.items.find(item=>item.node===e.target.closest('.item'))||g.items[selectAt(g,e.clientX,e.clientY)];
  cancel(false);
  if(item)choose(g,item);
 });
 document.addEventListener('click',e=>{
  const source=e.composedPath().find(el=>el?.dataset?.biliCardAction);
  if(!source||!e.isTrusted||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  stop(e);
  if(lastRelease&&performance.now()<lastRelease.until&&e.detail>0)return;
  if(source.dataset.biliCardAction==='block'){
   const target=targetFor(source);
   if(source.disabled||source.dataset.blockedVideo===target.bvid||!stillCurrent(target))return;
   source.disabled=true;
   request('block',{},target).then(result=>{
    if(!stillCurrent(target))return;
    source.replaceChildren('✓');
    source.title='已拉黑 '+result.name;
    source.setAttribute('aria-label',source.title);
    source.dataset.blockedVideo=target.bvid;
    toast(source.title);
   },error=>{if(stillCurrent(target))toast(error.message);}).finally(()=>{source.disabled=false;});
   return;
  }
  if(gesture?.pinned)cancel(false);
  const box=source.getBoundingClientRect(),g=newGesture(source,'favorite',box.left+box.width/2,box.top+box.height/2,true);
  if(cardPress?.source===source){
   if(!stillCurrent(cardPress.target))return;
   g.folderTask=cardPress.folderTask;
  }
  cardPress=null;
  if(!stillCurrent(g.target))return;
  gesture=g;g.pinned=true;menu.setAttribute('data-pinned','');activate(g);
  menu.tabIndex=-1;menu.focus({preventScroll:true});
 },true);
 document.addEventListener('pointerdown',e=>{
  if(gesture?.pinned&&e.composedPath().includes(menu))return;
  cardPress=null;lastRelease=null;blockedPointer=null;if(gesture)cancel(false);if(e.button!==0||e.isPrimary===false)return;
  const path=e.composedPath(),source=path.find(el=>el?.id==='bili-language-player-button')||path.find(el=>el?.matches?.(favoriteSelector)||el?.dataset?.biliCardAction==='favorite');if(!source)return;
  const card=source.dataset.biliCardAction==='favorite';if(!card&&source.id!=='bili-language-player-button'&&!bvid())return;
  const kind=source.id==='bili-language-player-button'?'audio':'favorite';
  const g=newGesture(source,kind,e.clientX,e.clientY,card);
  if(!stillCurrent(g.target))return;
  if(!card)stop(e);
  g.pointerId=e.pointerId;gesture=g;g.timer=setTimeout(()=>activate(g),240);
  if(card){
   cardPress=g;g.folderTask=getFolders(false,g.target);g.folderTask.catch(()=>{});
  }else if(kind==='favorite'){cache=null;getFolders().catch(()=>{});}
 },true);
 document.addEventListener('pointermove',e=>{const g=gesture;if(!g||e.pointerId!==g.pointerId)return;g.last={x:e.clientX,y:e.clientY};if(!g.active&&Math.hypot(e.clientX-g.start.x,e.clientY-g.start.y)>10)activate(g);if(g.active){stop(e);highlight(g,e.clientX,e.clientY);}},true);
 document.addEventListener('pointerup',e=>{if(blockedPointer===e.pointerId){stop(e);lastRelease={id:e.pointerId,x:e.clientX,y:e.clientY,until:performance.now()+600};blockedPointer=null;return;}const g=gesture;if(!g||e.pointerId!==g.pointerId)return;clearTimeout(g.timer);if(!g.active){gesture=null;return;}stop(e);highlight(g,e.clientX,e.clientY);const item=g.items[g.selected];lastRelease={id:e.pointerId,x:e.clientX,y:e.clientY,until:performance.now()+600};cancel(false);if(item)choose(g,item);},true);
 for(const type of ['mousedown','mouseup','click','dblclick','contextmenu'])document.addEventListener(type,e=>{if((gesture?.active&&!gesture.pinned)||blockedPointer!==null){stop(e);return;}const r=lastRelease;if(r&&performance.now()<r.until&&Math.abs(e.clientX-r.x)<5&&Math.abs(e.clientY-r.y)<5&&(e.pointerId==null||e.pointerId===r.id))stop(e);},true);
 document.addEventListener('pointercancel',e=>{if(gesture?.pointerId===e.pointerId){stop(e);cancel();}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){stop(e);cancel();}},true);window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
 document.addEventListener('bili-dual-audio-status',e=>{if(performance.now()<quickAudioUntil)try{toast(JSON.parse(e.detail).message);}catch{}});
 document.addEventListener('fullscreenchange',()=>{cancel();mount();});
 let settings,editor;
 const storageKey=mid=>'bili-wheel-config:'+mid,initializedAccounts=new Set(),configOwner=crypto.randomUUID();let configRevision=0;
 async function rememberAccount(data){if(!globalThis.chrome?.storage?.local)return;const key=storageKey(data.mid);let initial;
  if(!initializedAccounts.has(data.mid)){initializedAccounts.add(data.mid);const before=JSON.stringify(configFor(data)),stored=await chrome.storage.local.get(key);if(stored[key]&&before===JSON.stringify(configFor(data))){const prefs=preferences(data.mid);Object.assign(prefs,BiliWheelConfig.normalize(stored[key],data.folders));localStorage.setItem('bili-favorite-wheel:'+data.mid,JSON.stringify(prefs));}else if(!stored[key])initial=configFor(data);}
  await chrome.storage.local.set({...(initial?{[key]:{...initial,writeOwner:configOwner,writeRevision:++configRevision}}:{}),['bili-wheel-account:'+data.mid]:data,'bili-wheel-last-mid':data.mid});
 }
 async function saveConfig(config,ownerData){const data=cache?.data;if(ownerData&&data?.mid!==ownerData.mid)throw Error('账号已切换，请刷新收藏夹');if(!data)throw Error('请先读取收藏夹');const value=BiliWheelConfig.normalize(config,data.folders),prefs=preferences(data.mid);Object.assign(prefs,value);localStorage.setItem('bili-favorite-wheel:'+data.mid,JSON.stringify(prefs));if(globalThis.chrome?.storage?.local)await chrome.storage.local.set({[storageKey(data.mid)]:{...value,writeOwner:configOwner,writeRevision:++configRevision}});}
 function renderSettings(data){editor?.setData(data);}
 function attachSettings(){
  const section=document.getElementById('bili-dual-native')?.shadowRoot?.querySelector('section');
  if(!section||settings||!globalThis.BiliWheelSettings)return;
  const tab=section.querySelector('[data-player-tab="favorites"]');
  settings=document.createElement('details');
  settings.id='favorite-wheel-settings';
  settings.dataset.playerPane='favorites';
  settings.hidden=tab?.getAttribute('aria-selected')==='false';
  const summary=document.createElement('summary');
  summary.textContent='收藏轮盘设置';
  summary.style.cursor='pointer';
  settings.append(summary);
  section.append(settings);
  editor=BiliWheelSettings.mount(settings,{getFolders,getConfig:configFor,saveConfig,createFolder:values=>request('create-folder',{...values,mid:cache?.data.mid})});
  settings.addEventListener('toggle',()=>{if(settings.open)editor.reload();});
  if(cache)editor.setData(cache.data);
  if(tab&&!settings.hidden)settings.open=true;
 }
 if(globalThis.chrome?.storage?.onChanged)chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;for(const [key,change]of Object.entries(changes)){const match=key.match(/^bili-wheel-config:(\d+)$/),value=change.newValue;if(!match||!value||value.writeOwner===configOwner)continue;const mid=match[1],normalized=BiliWheelConfig.normalize(value,cache?.data.mid===mid?cache.data.folders:[]),prefs=preferences(mid);if(JSON.stringify(BiliWheelConfig.normalize(prefs))===JSON.stringify(normalized))continue;Object.assign(prefs,normalized);localStorage.setItem('bili-favorite-wheel:'+mid,JSON.stringify(prefs));if(cache?.data.mid===mid)editor?.refreshConfig();}});
 if(globalThis.chrome?.runtime?.onMessage)chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(message?.type==='bili-wheel-create-folder'){request('create-folder',{...message.values,mid:message.mid}).then(data=>reply({ok:true,data}),error=>reply({ok:false,error:error.message}));return true;}if(message?.type==='bili-wheel-context'){getFolders(message.refresh===true).then(data=>reply({ok:true,data,config:configFor(data)}),error=>reply({ok:false,error:error.message}));return true;}if(message?.type==='bili-open-external-panel'){document.dispatchEvent(new CustomEvent('bili-panel-open',{detail:JSON.stringify({location:'external',settings:true})}));reply({ok:true});}});
 function turnWheelLayer(e){
  const g=gesture;
  if(!g?.active||!g.data)return;
  stop(e);
  const step=e.deltaY>0?g.config.visibleLayers:-g.config.visibleLayers;
  g.layerStart=Math.max(0,Math.min(g.config.layers.length-1,(g.layerStart||0)+step));
  draw(g,favorites(g.data));
 }
 document.addEventListener('pointerover',e=>{if(bvid()&&e.target.closest?.(favoriteSelector)&&(!cache||Date.now()-cache.time>30000))getFolders().catch(()=>{});},true);
 mount();attachSettings();setInterval(()=>{const next=contextKey();if(currentRoute!==next){currentRoute=next;if(gesture&&!stillCurrent(gesture.target))cancel();if(cache?.context!==next)cache=null;if(loading?.context!==next)loading=null;notice.hidden=true;}if(gesture?.target.cardKey&&!stillCurrent(gesture.target))cancel();attachSettings();},500);
})();
