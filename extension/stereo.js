(()=>{
 const host=document.getElementById('bili-dual-native');if(!host)return;const ui=host.shadowRoot,section=ui.querySelector('section'),box=document.createElement('div');box.innerHTML='<hr><b>声音</b><label>左耳语言<select id="dual-language"><option value="en">English</option><option value="ja">日本語</option></select></label><p id="dual-tracks">启用时自动准备所选音轨</p><small>点击启用后自动准备官方音轨，无需手动切语言或刷新。</small><p><button id="dual-start">启用左右耳双语</button> <button id="dual-stop">恢复</button></p><label>左耳音量<input id="dual-left" type="range" min="0" max="2" step="0.05" value="1"></label><label>右耳音量<input id="dual-right" type="range" min="0" max="2" step="0.05" value="1"></label><p id="dual-status">尚未启用</p>';section.append(box);
 const $=s=>box.querySelector(s);const routeKey=()=>location.pathname+'?p='+(new URL(location.href).searchParams.get('p')||'1');const currentVideo=()=>[...document.querySelectorAll('video')].filter(v=>v.offsetWidth>0).sort((a,b)=>b.offsetWidth*b.offsetHeight-a.offsetWidth*a.offsetHeight)[0];const directErrors=new Set();let mediaKey='',busy=false,autoStopped=false,autoAttempts=0,autoNext=0;let page=routeKey(),tracks=new Map(),audioCatalog=null,session=null,generation=0;const originals=new WeakMap();
 const masterInfo=document.createElement('small');masterInfo.id='dual-master';masterInfo.textContent='播放器音量＝双耳总音量；左右滑块调整各耳比例。';$('#dual-status').before(masterInfo);
 function originalGraph(video,preparedContext){let graph=originals.get(video);if(!graph){const ctx=preparedContext||new AudioContext();try{const source=ctx.createMediaElementSource(video),gate=ctx.createGain();gate.gain.value=1;source.connect(gate);gate.connect(ctx.destination);graph={ctx,source,gate};originals.set(video,graph);}catch(e){ctx.close().catch(()=>{});throw Error('无法接管播放器原声，已取消双音轨以避免叠音：'+e.message);}}return graph;}
 function report(s){$('#dual-status').textContent=s;document.dispatchEvent(new CustomEvent('bili-dual-audio-status',{detail:JSON.stringify({message:s})}));}
 function clean(){generation++;const s=session;session=null;if(!s)return;paintGains();s.transport.abort();s.elements.forEach(a=>{a.pause();a.removeAttribute('src');a.load();a.remove();});s.sources?.forEach(n=>n.disconnect());s.gains.forEach(g=>g.disconnect());s.graph.gate.gain.value=1;$('#dual-master').textContent='已恢复播放器音量控制';}
 function syncRoute(){
  const next=routeKey();
  if(page===next)return;
  page=next;clean();tracks.clear();audioCatalog=null;mediaKey='';autoStopped=false;autoAttempts=0;autoNext=0;
  $('#dual-tracks').textContent='视频已切换，等待重新捕获';
 }
 document.addEventListener('bili-dual-data',e=>{try{const m=JSON.parse(e.detail);if(m.page!==location.pathname||m.route!==routeKey())return;syncRoute();if(m.type==='media-reset'){clean();tracks.clear();audioCatalog=null;mediaKey='';return;}if(m.type==='media'){if(mediaKey!==m.mediaKey){clean();tracks.clear();audioCatalog=null;mediaKey=m.mediaKey;autoAttempts=0;autoNext=0;autoStopped=false;}return;}if(m.type==='audio-request-error'&&m.mediaKey===mediaKey){directErrors.add(m.data.language);return;}if(!mediaKey||m.mediaKey!==mediaKey)return;if(m.type==='languages'&&Array.isArray(m.data)){audioCatalog=m.data.map(item=>item.lang).filter(Boolean);return;}if(m.type!=='play')return;const a=m.data.audio.filter(a=>{try{const u=new URL(a.url);return u.protocol==='https:'&&/(^|\.)(bilivideo\.com|akamaized\.net)$/.test(u.hostname);}catch{return false;}}).sort((a,b)=>b.bandwidth-a.bandwidth)[0];if(!a)return;tracks.set(m.data.language||'original',{...a,duration:m.data.duration,mediaKey});$('#dual-tracks').textContent='本片音轨：'+[...tracks.keys()].map(x=>x==='original'?'中文原声':x).join(' / ');}catch{}});
try{$('#dual-language').value=localStorage.getItem('bili-dual-audio-language')||'en';}catch{} $('#dual-language').onchange=()=>{clean();try{localStorage.setItem('bili-dual-audio-language',$('#dual-language').value);}catch{}autoStopped=false;autoAttempts=0;autoNext=0;report('正在按新语言自动准备…');};document.dispatchEvent(new Event('bili-dual-ready'));
 $('#dual-stop').onclick=()=>{autoStopped=true;clean();report('已恢复播放器原声');};
 
 async function waitFor(check,token,timeout=15000){const begin=Date.now();while(Date.now()-begin<timeout){if(token!==generation)throw Error('准备已取消');const result=check();if(result)return result;await new Promise(r=>setTimeout(r,80));}throw Error('官方音轨准备超时，请稍后重试');}
 function freshTrack(language){const a=tracks.get(language);if(!a||a.mediaKey!==mediaKey)return null;try{const deadline=Number(new URL(a.url).searchParams.get('deadline'));if(deadline&&deadline*1000<Date.now()+30000){tracks.delete(language);return null;}}catch{}return a;}
 async function prepare(target,token){if(freshTrack(target||'original')&&freshTrack('original'))return;
 const missing=[...new Set(['original',target||'original'])].filter(l=>!freshTrack(l));missing.forEach(l=>directErrors.delete(l));report('正在直接读取本片音轨…');document.dispatchEvent(new CustomEvent('bili-dual-request-audio',{detail:JSON.stringify({route:routeKey(),mediaKey,languages:missing})}));const fastBegin=Date.now();while(Date.now()-fastBegin<7500){if(token!==generation)return;if(missing.every(l=>freshTrack(l)))return;if(missing.some(l=>directErrors.has(l)))break;await new Promise(r=>setTimeout(r,40));}
 
 const video=currentVideo(),saved=video?{time:video.currentTime,paused:video.paused,rate:video.playbackRate}:null,startRoute=routeKey();if(video)video.pause();
 const switchTo=async lang=>{const selector=lang?'.bpx-player-ctrl-translation-language-item[data-lan="'+lang+'"]':'.bpx-player-ctrl-translation-close-switch';const el=await waitFor(()=>document.querySelector(selector),token,10000);el.click();};
 try{for(const lang of ['',target]){const key=lang||'original';if(freshTrack(key))continue;report('正在自动取得本片'+(lang?(lang==='ja'?'日语':'英语'):'中文')+'音轨…');
 const active=document.querySelector('.bpx-player-ctrl-translation-language-item.bpx-state-active')?.getAttribute('data-lan')||'';
 if(active===lang){const alt=lang?'':(target||document.querySelector('.bpx-player-ctrl-translation-language-item')?.getAttribute('data-lan'));if(!alt&&lang==='')throw Error('本片尚未提供可读取的原声音轨');await switchTo(alt);await waitFor(()=>freshTrack(alt||'original'),token,8000);}
 await switchTo(lang);await waitFor(()=>freshTrack(key),token,8000);
 }}finally{if(token===generation&&routeKey()===startRoute&&saved){const v=currentVideo();if(v){await waitFor(()=>v.readyState>=1,token,10000);v.currentTime=Math.min(saved.time,Math.max(0,(v.duration||Infinity)-.02));v.playbackRate=saved.rate;if(!saved.paused)await v.play();else v.pause();}}}
 }
 async function resumeContext(ctx,token){ctx.resume().catch(()=>{});try{await waitFor(()=>ctx.state==='running',token,2500);}catch(e){if(token!==generation)throw e;throw Error('浏览器尚未允许自动声音，请在视频上点一次播放，插件会继续自动准备');}}
$('#dual-start').onclick=async()=>{if(busy)return;busy=true;autoStopped=false;clean();const token=generation;let unusedContext=null;try{if(!mediaKey)throw Error('正在核对当前视频身份，稍后自动继续');const available=availableAudio(),desired=resolveEars(available);if(desired.every(l=>l==='original')){report('两耳均为原声，保留播放器原始立体声');return;}if(desired.some(l=>l!=='original'&&!available.includes(l))){report('本片缺少所选外语音轨，保留播放器原始立体声');return;}const earlyVideo=currentVideo();if(!earlyVideo)throw Error('当前没有可见视频');const preparedContext=originals.get(earlyVideo)?.ctx||(unusedContext=new AudioContext());await resumeContext(preparedContext,token);for(const language of [...new Set(desired)]){await prepare(language==='original'?'':language,token);if(token!==generation)return;}const en=freshTrack(desired[0]),zh=freshTrack(desired[1]);if(!en||!zh)throw Error('官方未返回所选语言的可用音轨');if(desired.some((language,i)=>language!=='original'&&freshTrack('original')?.url===(i===0?en:zh).url))throw Error('外语音轨与原声相同，保留播放器原始立体声');if(desired[0]!==desired[1]&&en.url===zh.url)throw Error('不同语言返回同一音轨，已取消以避免错误播放');const video=currentVideo();if(!video)throw Error('当前没有可见视频');document.getElementById('bili-dual-host')?.shadowRoot?.querySelector('#stop')?.click();const graph=originalGraph(video,preparedContext),ctx=graph.ctx;if(ctx===unusedContext)unusedContext=null;const selectedTracks=en.url===zh.url?[en]:[en,zh];const elements=selectedTracks.map(()=>new Audio());elements.forEach(a=>{a.hidden=true;box.append(a);});session={ctx,graph,elements,video,gains:[],sources:[],sourceSides:[0,1],languages:[...desired],transport:new AbortController(),aligned:false,audible:false,starting:null};paintGains();video.addEventListener('volumechange',volume,{signal:session.transport.signal});await resumeContext(ctx,token);if(token!==generation)return;
 await Promise.all(elements.map(async(a,i)=>{a.crossOrigin='anonymous';a.preload='auto';a.src=selectedTracks[i].url;const source=ctx.createMediaElementSource(a);session.sources[i]=source;session.gains[i]=BiliDual.route(ctx,source,i);session.gains[i].gain.value=0;if(elements.length===1){session.gains[1]=BiliDual.route(ctx,source,1);session.gains[1].gain.value=0;}await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('音轨加载超时')),15000);a.onloadedmetadata=()=>{clearTimeout(timer);resolve();};a.onerror=()=>{clearTimeout(timer);reject(Error('音轨无法读取，可能是地址过期或跨域限制'));};a.load();});}));if(token!==generation)return;
 if(!session||session.video!==video)return;
 session.ready=true;
 session.graph.gate.gain.value=0;
 bindTransport(session);
 syncTransport(session);
 report('双音轨已启用：左耳 '+earLabel(desired[0])+' / 右耳 '+earLabel(desired[1])+(usingEnglishFallback(desired)?'（本片无日语，使用英语）':''));}catch(e){if(token===generation){clean();report(e.message);autoNext=Date.now()+5000;}}finally{if(unusedContext)unusedContext.close().catch(()=>{});busy=false;}};
 function volume(){const s=session;if(!s)return;const levels=BiliDual.levels(s.video.volume,s.video.muted,$('#dual-left').value,$('#dual-right').value);s.gains.forEach((g,i)=>g.gain.value=s.audible?levels[i]:0);$('#dual-master').textContent=`播放器总音量：${s.video.muted?'静音':Math.round(s.video.volume*100)+'%'} · 左耳 ${Math.round(levels[0]*100)}% / 右耳 ${Math.round(levels[1]*100)}%`; }
 function setAudible(s,value){
  if(s.audible===value)return;
  s.audible=value;volume();
 }
 function pauseTransport(s){
  setAudible(s,false);
  s.aligned=false;s.starting=null;
  for(const audio of s.elements)if(!audio.paused)audio.pause();
 }
 function bindTransport(s){
  const options={signal:s.transport.signal};
  const wake=()=>{if(session===s)syncTransport(s);};
  const hold=()=>{if(session===s)pauseTransport(s);};
  for(const type of ['pause','seeking','waiting','ended','emptied'])s.video.addEventListener(type,hold,options);
  for(const type of ['playing','seeked','canplay','ratechange'])s.video.addEventListener(type,wake,options);
  for(const audio of s.elements){
   audio.addEventListener('waiting',hold,options);
   audio.addEventListener('canplay',wake,options);
   audio.addEventListener('seeked',wake,options);
   audio.addEventListener('error',()=>{
    if(session===s){clean();report('配音读取中断，已恢复播放器声音');}
   },options);
  }
 }
 function syncTransport(s){
  const {video,elements}=s;
  if(video.ended||!video.isConnected){clean();report('播放结束或播放器已更换');return;}
  if(video.paused||video.seeking||video.readyState<3){pauseTransport(s);return;}
  const time=video.currentTime,rate=video.playbackRate;
  const live=elements.filter(audio=>!Number.isFinite(audio.duration)||time<audio.duration-.015);
  for(const audio of elements)if(!live.includes(audio)&&!audio.paused)audio.pause();
  if(!live.length){setAudible(s,false);return;}
  if(!s.aligned){
   for(const audio of live){
    audio.playbackRate=rate;
    if(Math.abs(audio.currentTime-time)>.008)audio.currentTime=time;
   }
   s.aligned=true;
  }
  if(live.some(audio=>audio.seeking||audio.readyState<3)){setAudible(s,false);return;}
  if(s.starting)return;
  if(live.some(audio=>audio.paused)){
   setAudible(s,false);
   const starting=Promise.all(live.map(audio=>audio.play()));
   s.starting=starting;
   starting.then(()=>{
    if(session===s&&s.starting===starting){s.starting=null;syncTransport(s);}
   },error=>{
    if(session===s&&s.starting===starting){clean();report('配音播放中断：'+error.message);}
   });
   return;
  }
  const times=live.map(audio=>audio.currentTime),errors=times.map(t=>time-t);
  const largest=Math.max(...errors.map(Math.abs)),skew=Math.max(...times)-Math.min(...times);
  if(largest>.12||skew>.085){pauseTransport(s);return;}
  // Correct small errors continuously instead of waiting for an audible jump.
  for(const [index,audio] of live.entries()){
   const error=errors[index];
   const correction=Math.abs(error)<.006?0:Math.max(-.06,Math.min(.06,error*2.5));
   const target=rate*(1+correction);
   if(Math.abs(audio.playbackRate-target)>.003)audio.playbackRate=target;
  }
  if(!s.audible&&skew<=.025&&largest<=.065)setAudible(s,true);
 }
 setInterval(()=>{syncRoute();if(session?.ready)syncTransport(session);},40);
 const autoLabel=document.createElement('label');autoLabel.innerHTML='<input id="dual-auto" type="checkbox" checked>进入多语言视频自动开启';box.prepend(autoLabel);try{$('#dual-auto').checked=localStorage.getItem('bili-dual-auto')!=='false';}catch{}$('#dual-auto').onchange=()=>{try{localStorage.setItem('bili-dual-auto',String($('#dual-auto').checked));}catch{}autoStopped=!$('#dual-auto').checked;autoAttempts=0;};
 setInterval(()=>{if(!$('#dual-auto').checked||autoStopped||busy||session?.ready||!mediaKey||Date.now()<autoNext||autoAttempts>=3)return;const v=currentVideo(),available=availableAudio(),foreign=resolveEars(available).filter(l=>l!=='original');if(!foreign.length||!v||v.paused||foreign.some(language=>!available.includes(language)))return;autoAttempts++;autoNext=Date.now()+5000;$('#dual-start').click();},800);
 document.addEventListener('pointerdown',e=>{if(e.isTrusted&&!autoStopped&&!session?.ready){autoAttempts=0;autoNext=0;}},true);
 // Loaded inside stereo.js, where it shares the playback session and track cache.
 const audioNames={original:'原声',en:'English',ja:'日本語'};let ears={left:'en',right:'original'};
 try{const saved=JSON.parse(localStorage.getItem('bili-dual-ear-slots')||'null');if(saved&&typeof saved.left==='string'&&typeof saved.right==='string')ears=saved;else ears.left=localStorage.getItem('bili-dual-audio-language')||'en';}catch{}
 const oldLanguage=$('#dual-language');oldLanguage.closest('label').hidden=true;
 const picker=document.createElement('div');picker.innerHTML='<style>[hidden]{display:none!important}.audio-pool{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.audio-chip{cursor:grab}.ear-layout{display:grid;grid-template-columns:1fr 36px 1fr;gap:8px;align-items:center}.ear-slot{border:1px dashed #71e3c3;border-radius:9px;padding:12px 5px;text-align:center;min-height:60px;background:#091825}.ear-slot:focus{outline:2px solid #71e3c3}.ear-title{display:block;color:#a9bfd2;margin-bottom:7px}.ear-value{display:block;color:#71e3c3}.audio-hint{margin:8px 0}</style><small>将可用音轨拖到左耳或右耳。每耳一条，拖入即替换。</small><div id="audio-pool" class="audio-pool" aria-label="可用声音"></div><div class="ear-layout"><div id="ear-left" class="ear-slot" tabindex="0" role="button" aria-label="左耳音轨"><span class="ear-title">左耳</span><b class="ear-value"></b></div><button id="ear-swap" aria-label="交换左右耳" title="交换左右耳">⇄</button><div id="ear-right" class="ear-slot" tabindex="0" role="button" aria-label="右耳音轨"><span class="ear-title">右耳</span><b class="ear-value"></b></div></div><small id="audio-hint" class="audio-hint">也可先点音轨，再点左耳或右耳。</small>';oldLanguage.closest('label').after(picker);
 let picked=null,poolSignature='',pendingEarStart=false;
 function earLabel(language){return audioNames[language]||language;}
 let audioGains={};
 try{audioGains=JSON.parse(localStorage.getItem('bili-dual-language-gains')||'{}')||{};}catch{}
 const activeLanguages=()=>session?.languages||[ears.left,ears.right];
 const languageAt=side=>activeLanguages()[side==='left'?0:1];
 function gainKey(side){
  const [left,right]=activeLanguages();
  return left===right?left+':'+side:languageAt(side);
 }
 function usingEnglishFallback(languages){
  return [ears.left,ears.right].some((language,i)=>language==='ja'&&languages[i]==='en');
 }
 function resolveEars(available){
  const preferred=[ears.left,ears.right];
  if(preferred.includes('original')&&preferred.includes('ja')&&!available.includes('ja')&&available.includes('en')){
   return preferred.map(language=>language==='ja'?'en':language);
  }
  return preferred;
 }
 for(const side of ['left','right']){
  const slider=$('#dual-'+side);
  const output=document.createElement('output');
  slider.after(output);
  slider.updateLabel=()=>{output.textContent=' '+Math.round(Number(slider.value)*100)+'% · '+earLabel(languageAt(side));};
  slider.oninput=()=>{
   audioGains[gainKey(side)]=Number(slider.value);
   try{localStorage.setItem('bili-dual-language-gains',JSON.stringify(audioGains));}catch{}
   slider.updateLabel();volume();
  };
 }
 function paintGains(){
  for(const side of ['left','right']){
   const slider=$('#dual-'+side);
   slider.value=String(audioGains[gainKey(side)]??audioGains[languageAt(side)]??1);
   slider.updateLabel();
  }
 }
 function paintEars(){
  for(const side of ['left','right'])$('#ear-'+side).querySelector('.ear-value').textContent=earLabel(ears[side]);
  paintGains();
  try{localStorage.setItem('bili-dual-ear-slots',JSON.stringify(ears));}catch{}
 }
 function selectionChanged(){clean();autoStopped=false;autoAttempts=0;autoNext=0;pendingEarStart=true;report('正在应用左右耳选择…');if(!busy){pendingEarStart=false;$('#dual-start').click();}}
 document.addEventListener('bili-dual-audio-profile',event=>{
  let profile,swap;
  try{({profile,swap}=JSON.parse(event.detail));}catch{return;}
  if(!['ja','en','original'].includes(profile))return;
  const pairSelected=profile!=='original'&&
   ((ears.left===profile&&ears.right==='original')||(ears.right===profile&&ears.left==='original'));
  if(pairSelected){
   if(swap===true)$('#ear-swap').click();
   else if(session?.ready){
    const [left,right]=session.languages;
    report('当前耳位：左耳 '+earLabel(left)+' / 右耳 '+earLabel(right)+(usingEnglishFallback(session.languages)?'（本片无日语，使用英语）':''));
   }else if(!busy&&!pendingEarStart)selectionChanged();
   return;
  }
  ears=swap===true&&profile!=='original'?{left:'original',right:profile}:{left:profile,right:'original'};
  paintEars();selectionChanged();
  if(profile==='original'&&document.querySelector('.bpx-player-ctrl-translation-language-item.bpx-state-active'))document.querySelector('.bpx-player-ctrl-translation-close-switch')?.click();
 });
 function assignEar(side,language){if(!language||!availableAudio().includes(language))return;ears[side]=language;paintEars();selectionChanged();}
 function availableAudio(){
  const languages=audioCatalog??Array.from(document.querySelectorAll('.bpx-player-ctrl-translation-language-item[data-lan]'),item=>item.dataset.lan);
  return [...new Set(['original',...languages,...tracks.keys()])];
 }
 for(const side of ['left','right']){const slot=$('#ear-'+side);slot.ondragover=e=>e.preventDefault();slot.ondrop=e=>{e.preventDefault();assignEar(side,e.dataTransfer.getData('application/x-bili-audio')||picked);};slot.onclick=()=>{if(picked)assignEar(side,picked);};slot.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&picked){e.preventDefault();assignEar(side,picked);}};}
 $('#ear-swap').onclick=()=>{[ears.left,ears.right]=[ears.right,ears.left];paintEars();if(session?.ready){if(session.sources.length>1)session.sources.forEach((source,i)=>{source.disconnect();session.sourceSides[i]=1-session.sourceSides[i];source.connect(session.gains[session.sourceSides[i]]);});session.languages.reverse();paintGains();const [left,right]=session.languages;report('已交换：左耳 '+earLabel(left)+' / 右耳 '+earLabel(right)+(usingEnglishFallback(session.languages)?'（本片无日语，使用英语）':''));volume();}else selectionChanged();};
 function paintAudioPool(){const languages=availableAudio(),signature=languages.join('|');if(signature===poolSignature)return;poolSignature=signature;const pool=$('#audio-pool');pool.replaceChildren();for(const language of languages){const chip=document.createElement('button');chip.className='audio-chip';chip.textContent=earLabel(language);chip.dataset.language=language;chip.draggable=true;chip.onclick=()=>{picked=language;$('#audio-hint').textContent='已选 '+earLabel(language)+'，请点左耳或右耳。';};chip.ondragstart=e=>{picked=language;e.dataTransfer.setData('application/x-bili-audio',language);};pool.append(chip);}}
 paintEars();paintAudioPool();setInterval(()=>{paintAudioPool();if(pendingEarStart&&!busy){pendingEarStart=false;if(!autoStopped)$('#dual-start').click();}},700);


 window.addEventListener('pagehide',clean);
})();
