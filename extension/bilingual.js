(()=>{
 if(!['www.bilibili.com','t.bilibili.com','space.bilibili.com'].includes(location.hostname)||window.__biliJaZhInstalled)return;window.__biliJaZhInstalled=true;
 const fontPages={home:'首页卡片',video:'视频标题',recommend:'推荐视频',comments:'评论区',dynamic:'动态',space:'UP 主空间',history:'历史',other:'其他页面'};
 const legacyFonts={home:12,video:13,dynamic:13,space:13,history:13,other:13};
 const languageFonts={},lineGaps={},fontStorage='bili-translation-language-fonts',fontInputs=new Map();
 const fontSamples=[['zh','中文','这段视频真有意思。'],['ja','日语','この動画、面白いね。'],['en','英语','This video is really interesting.']];
 const validFont=value=>Number.isFinite(value)&&value>=9&&value<=48;
 const validGap=value=>Number.isInteger(value)&&value>=0&&value<=24;
 const lineGap=region=>lineGaps[region+':gap']??0;
 const validFontKey=value=>/^(home|video|recommend|comments|dynamic|space|history|other):(zh|ja|en|gap)$/.test(value);
 function loadFonts(values){
  for(const [name,value] of Object.entries(values||{})){
   if(validFontKey(name)){
    const gap=name.endsWith(':gap'),settings=gap?lineGaps:languageFonts;
    if(value===null)delete settings[name];
    else if(gap?validGap(value):validFont(value))settings[name]=value;
   }else if(Object.hasOwn(legacyFonts,name)&&validFont(value))legacyFonts[name]=value;
  }
 }
 try{loadFonts(JSON.parse(localStorage.getItem('bili-translation-page-fonts')||'{}'));loadFonts(JSON.parse(localStorage.getItem(fontStorage)||'{}'));}catch{}
 let refreshFontPreview=()=>{};
 document.addEventListener('bili-page-fonts-state',event=>{
  try{loadFonts(JSON.parse(event.detail));}catch{return;}
  for(const [key,input] of fontInputs)if(input.getRootNode().activeElement!==input)input.value=languageFonts[key]??'';
  refreshFontPreview();schedule();
 });
 function fontPage(){
  const p=location.pathname.replace(/^\/(?:zh-Hans|ja|en)(?=\/|$)/,'');
  if(location.hostname==='t.bilibili.com')return 'dynamic';
  if(location.hostname==='space.bilibili.com')return 'space';
  if(/\/video\//.test(p)||globalThis.BiliWatchLaterRoute?.matches(p))return 'video';
  if(/history/.test(p))return 'history';
  return !p||p==='/'?'home':'other';
 }
 function fontLanguage(lang){return /^(ja|en)(?:-|$)/i.exec(lang||'')?.[1].toLowerCase()||'zh';}
 function fontSize(region,lang){
  return languageFonts[region+':'+fontLanguage(lang)]??legacyFonts[region]??legacyFonts[fontPage()];
 }
 function saveFontSetting(key,value){
  try{
   localStorage.setItem(fontStorage,JSON.stringify({...languageFonts,...lineGaps}));
   document.dispatchEvent(new CustomEvent('bili-page-fonts-save',{detail:JSON.stringify({[key]:value})}));
  }catch{}
 }
 function applyTranslationFonts(line){
  const region=line.dataset.fontRegion,gap=lineGap(region);
  line.style.rowGap=gap+'px';
  for(const [index,row] of [...line.children].entries()){
   row.style.fontSize=fontSize(region,row.lang)+'px';
   row.style.lineHeight='1.12';
   if(line.style.display==='block')row.style.marginBlockStart=(index?gap:0)+'px';
  }
 }
 const nativeFonts=new Map();
 const nativeLocale=()=>location.pathname.match(/^\/(ja|en)(?:\/|$)/)?.[1]||'zh';
 function applyNativeFonts(){
  const seen=new Set(),page=fontPage();
  const apply=(node,region)=>{
   const lang=fontLanguage(node.getAttribute('lang')||nativeLocale()),value=languageFonts[region+':'+lang];
   if(!value)return;
   if(!nativeFonts.has(node))nativeFonts.set(node,[node.style.getPropertyValue('font-size'),node.style.getPropertyPriority('font-size')]);
   if(node.style.fontSize!==value+'px')node.style.setProperty('font-size',value+'px');
   seen.add(node);
  };
  const applyAll=(selector,region)=>document.querySelectorAll(selector).forEach(node=>apply(node,region));
  if(Object.keys(languageFonts).length){
   applyAll('h1.video-title','video');
   applyAll('.bili-video-card__info--tit,.bili-video-card__info--title',page);
   applyAll('.video-page-card-small .title,.recommend-video-card .info .title','recommend');
   applyAll('.bili-dyn-card-video__title,.bili-dyn-item .bili-rich-text__content',page);
   if(languageFonts['comments:'+nativeLocale()])for(const renderer of all(document,'bili-comment-renderer,bili-comment-reply-renderer')){
    const content=renderer.shadowRoot?.querySelector('bili-rich-text')?.shadowRoot?.querySelector('#contents');
    if(content)apply(content,'comments');
   }
  }
  for(const [node,[value,priority]] of nativeFonts)if(!seen.has(node)){
   node.style.setProperty('font-size',value,priority);nativeFonts.delete(node);
  }
 }
 function applyPageFonts(){
  for(const root of roots)for(const line of root.querySelectorAll('.bili-ja-zh-original'))applyTranslationFonts(line);
  applyNativeFonts();
 }
 let compactMainComments=false;
 try{compactMainComments=localStorage.getItem('bili-compact-main-comments')==='true';}catch{}
 let commentPair=true;try{commentPair=localStorage.getItem('bili-comment-pair')!=='false';}catch{}let foldLimit=10;try{const saved=Number(localStorage.getItem('bili-translation-fold-lines'));if(Number.isInteger(saved)&&saved>=1&&saved<=100)foldLimit=saved;}catch{}let titleLines=3,titleFull=false,titleLabels=false;try{const saved=JSON.parse(localStorage.getItem('bili-title-display')||'{}');if(Number.isInteger(saved.lines)&&saved.lines>=1&&saved.lines<=20)titleLines=saved.lines;titleFull=saved.full===true;titleLabels=saved.labels===true;}catch{}const commentEmotes=new Map();const commentLayouts=new Map();const placedLines=new WeakMap();const japaneseTexts=new Map();const isJapanese=()=>/^\/ja(?:\/|$)/.test(location.pathname);const feedVersions=new Map(),englishTexts=new Map(),feedRequests=new Set();const nativeFetch=window.fetch,originals=new Map(),videos=new Map(),jobs=new Map(),roots=new Set(),retryAfter=new Map();let uiReady=false,enabled=true,active=0,renderTimer=null;const queue=[];const key='bili-ja-zh-enabled';try{enabled=localStorage.getItem(key)!=='false';}catch{}
 const kanaJobs=new Map();let kanaSequence=0;window.addEventListener('message',event=>{const data=event.data;if(event.source!==window||event.origin!==location.origin||data?.source!=='bili-kana-result')return;const job=kanaJobs.get(data.id);if(!job)return;kanaJobs.delete(data.id);clearTimeout(job.timer);data.error?job.reject(Error('读音词典加载失败')):job.resolve(data.text);});
 function kanaText(text){return new Promise((resolve,reject)=>{const id=String(++kanaSequence),timer=setTimeout(()=>{kanaJobs.delete(id);reject(Error('读音加载超时'));},60000);kanaJobs.set(id,{resolve,reject,timer});window.postMessage({source:'bili-kana-request',id,text},location.origin);});}
 const kanaWarmers=new WeakMap(),kanaWarmQueue=[];let kanaIdlePending=false;
 function warmVisibleKana(){if(kanaIdlePending||!kanaWarmQueue.length)return;kanaIdlePending=true;const run=deadline=>{kanaIdlePending=false;let count=0;while(kanaWarmQueue.length&&count<8){if(count&&deadline?.timeRemaining&&deadline.timeRemaining()<4)break;const span=kanaWarmQueue.shift();if(span.isConnected)kanaWarmers.get(span)?.();count++;}if(kanaWarmQueue.length)warmVisibleKana();};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,100);}
 const kanaVisibility='IntersectionObserver'in window?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){kanaVisibility.unobserve(entry.target);kanaWarmQueue.push(entry.target);}warmVisibleKana();}):null;
 function bindKana(span,text){span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-pressed','false');const setHint=value=>{span.dataset.kanaHint=value;span.title=value;span.dispatchEvent(new Event('bili-kana-hint-change'));};setHint('点击显示汉字读音，再点恢复');span.style.cursor='pointer';let annotated=null,preparing=null,shown=false,busy=false;const prepare=()=>{if(annotated!==null)return Promise.resolve(annotated);if(preparing)return preparing;preparing=(/[\u3400-\u9fff々]/u.test(text)?kanaText(text):Promise.resolve(text)).then(result=>{annotated=result;span.dataset.kanaReady='true';return result;}).finally(()=>{preparing=null;});return preparing;};const warm=()=>{prepare().catch(()=>{});};kanaWarmers.set(span,warm);if(kanaVisibility)kanaVisibility.observe(span);span.addEventListener('pointerenter',warm,{once:true});span.addEventListener('focus',warm,{once:true});let pointerStart=null,dragged=false;span.addEventListener('pointerdown',e=>{pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};dragged=false;});span.addEventListener('pointerup',e=>{if(pointerStart?.id===e.pointerId)dragged=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>4;pointerStart=null;});span.addEventListener('pointercancel',()=>{pointerStart=null;dragged=false;});const toggle=async event=>{if(event.type==='click'){const moved=dragged;dragged=false;const selection=span.getRootNode().getSelection?.()||window.getSelection();let selecting=false;try{selecting=!!selection&&!selection.isCollapsed&&selection.rangeCount>0&&selection.getRangeAt(0).intersectsNode(span);}catch{}if(moved||selecting){event.preventDefault();event.stopPropagation();return;}}event.preventDefault();event.stopPropagation();if(busy)return;if(shown){span.textContent=text;shown=false;}else{busy=true;span.setAttribute('aria-busy','true');setHint('正在准备本地读音…');try{if(annotated===null)await prepare();if(!span.isConnected)return;span.textContent=annotated;shown=true;}catch{setHint('读音加载失败，点击重试');return;}finally{busy=false;span.removeAttribute('aria-busy');}}span.setAttribute('aria-pressed',String(shown));setHint(shown?'点击恢复日语原文':'点击显示汉字读音，再点恢复');};span.onclick=toggle;span.onkeydown=event=>{if(event.key==='Enter'||event.key===' ')toggle(event);};}

 function normalize(s){return String(s||'').replace(/\s+/g,' ').trim();}
 function canonical(text){return normalize(text).replace(/https?:\/\/\S+/g,'').replace(/\[[^\]\n]{1,35}\]/g,'').replace(/[\s\u200b-\u200d\ufeff]/g,'').replace(/[.…]+$/,'');}
 function sameContent(a,b){const x=canonical(a),y=canonical(b);return x===y||(Math.min(x.length,y.length)>=28&&(x.startsWith(y)||y.startsWith(x)));}
 function visibleText(target){if(target.dataset.biliBaseFull)return target.dataset.biliBaseFull;const copy=target.cloneNode(true);for(const img of copy.querySelectorAll('img'))img.replaceWith(img.alt||'');return copy.textContent;}
 function withoutCommentEmotes(text,id){if(!text)return text;let value=text;for(const token of commentEmotes.get(id)||[]){value=value.split(token).join('');if(token.startsWith('[')&&token.endsWith(']'))value=value.split(token.slice(0,-1)).join('');}return value.replace(/[ \t]{2,}/g,' ').trim();}
 function collect(data,depth=0){if(!data||typeof data!=='object'||depth>14)return;if(data.rpid_str||data.rpid){const id=String(data.rpid_str||data.rpid),oid=String(data.oid||'');if(typeof data.content?.message==='string'){originals.set(oid+':'+id,data.content.message);const tokens=new Set(Object.keys(data.content.emote||{}));for(const token of data.content.message.match(/\[[^\]\n]{1,60}\]/g)||[])tokens.add(token);commentEmotes.set(oid+':'+id,tokens);}}for(const value of Object.values(data))if(value&&typeof value==='object')if(Array.isArray(value))value.slice(0,200).forEach(v=>collect(v,depth+1));else collect(value,depth+1);}
 function inspect(url,json){inspectFeed(url,json);try{const u=new URL(url,location.href);if(u.hostname!=='api.bilibili.com'||!/^\/x\/v2\/reply(?:\/|$)/.test(u.pathname)||json.code!==0)return;replayComments(url,true);collect(json.data);try{if(JSON.parse(u.searchParams.get('x-bili-locale-json')||'{}').c_locale?.language==='en')collectEnglish(json.data);}catch{}schedule();}catch{}}
 window.fetch=async function(...args){const url=typeof args[0]==='string'?args[0]:args[0]?.url;const res=await nativeFetch.apply(this,args);if(url&&/\/(?:reply|web-dynamic)(?:\/|\?)/.test(url))res.clone().json().then(j=>inspect(url,j)).catch(()=>{});return res;};
 const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send,urls=new WeakMap();XMLHttpRequest.prototype.open=function(method,url,...rest){urls.set(this,String(url));return open.call(this,method,url,...rest);};XMLHttpRequest.prototype.send=function(...args){const url=urls.get(this)||'';if(/\/(?:reply|web-dynamic)(?:\/|\?)/.test(url))this.addEventListener('load',()=>{try{inspect(url,this.responseType==='json'?this.response:JSON.parse(this.responseText));}catch{}},{once:true});return send.apply(this,args);};
 function drain(){while(active<6&&queue.length){const job=queue.shift();active++;job().finally(()=>{active--;drain();});}}
 function request(id,url,onData,locale='zh'){if(jobs.has(id)||Date.now()<(retryAfter.get(id)||0))return;jobs.set(id,true);queue.push(async()=>{try{const u=new URL(url,location.href);u.searchParams.set('x-bili-locale-json',JSON.stringify({c_locale:{language:locale,script:locale==='zh'?'Hans':undefined},always_translate:locale!=='zh'}));const signed=/^\/x\/v2\/reply\/wbi\/(main|reply)$/.test(u.pathname)&&window.__biliSignCommentUrl?await window.__biliSignCommentUrl(u.href):u.href;if(id.startsWith('comments-')){commentReplayUrls.add(signed);if(commentReplayUrls.size>200)commentReplayUrls.delete(commentReplayUrls.values().next().value);}const res=await nativeFetch(signed,{credentials:'include',signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('HTTP '+res.status);const j=await res.json();if(j.code!==0)throw Error(j.message||'读取失败');onData(j.data);schedule();}catch{jobs.delete(id);retryAfter.set(id,Date.now()+30000);}});drain();}
 function watch(root){if(roots.has(root))return;roots.add(root);new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.bili-ja-zh-original')))schedule();}).observe(root,{childList:true,subtree:true});}
 function all(root,selector){const result=[...root.querySelectorAll(selector)];for(const e of root.querySelectorAll('*'))if(e.shadowRoot){watch(e.shadowRoot);result.push(...all(e.shadowRoot,selector));}return result;}
 function titleDisplay(line){if(!line)return;const full=line.dataset.homeTitle==='1'?false:titleFull,lines=line.dataset.homeTitle==='1'?2:titleLines;for(const span of line.querySelectorAll(':scope > div[lang=ja] > span,:scope > div[lang=en] > span'))if(!span.dataset.titleHover){span.dataset.titleHover='1';let hovered=false,focused=false;const update=()=>{const allowFull=span.closest('.bili-ja-zh-original')?.dataset.homeTitle!=='1'&&titleFull,clipped=(hovered||focused)&&!allowFull&&(span.scrollHeight>span.clientHeight+1||span.scrollWidth>span.clientWidth+1),hint=span.dataset.kanaHint||'';if((hovered||focused)&&clipped)span.title=span.textContent;else if(hint)span.title=hint;else span.removeAttribute('title');};span.addEventListener('mouseenter',()=>{hovered=true;update();});span.addEventListener('mouseleave',()=>{hovered=false;update();});span.addEventListener('focus',()=>{focused=true;update();});span.addEventListener('blur',()=>{focused=false;update();});span.addEventListener('bili-kana-hint-change',update);}for(const caption of line.querySelectorAll('small'))caption.style.display=titleLabels?'block':'none';for(const text of line.querySelectorAll(':scope > div > span')){text.style.display=full?'block':'-webkit-box';text.style.overflow=full?'visible':'hidden';text.style.setProperty('-webkit-box-orient','vertical');text.style.setProperty('-webkit-line-clamp',full?'unset':String(lines));text.dispatchEvent(new Event('bili-kana-hint-change'));}}

 function addBelow(target,original,id,omitOriginal=false){if(!target||!original)return;const rawEnglish=withoutCommentEmotes(englishTexts.get(id),id),english=rawEnglish&&(sameContent(rawEnglish,original)||sameContent(rawEnglish,visibleText(target)))?null:rawEnglish,same=omitOriginal||sameContent(visibleText(target),original),rawJapanese=withoutCommentEmotes(japaneseTexts.get(id),id),japanese=rawJapanese&&!sameContent(rawJapanese,original)&&!sameContent(rawJapanese,visibleText(target))?rawJapanese:null;let line=placedLines.get(target)||target.nextElementSibling;if(!line?.classList.contains('bili-ja-zh-original'))line=null;if(line&&!line.isConnected)line=null;if(!enabled||(same&&!english&&!japanese)){line?.remove();return;}if(!line){line=document.createElement('div');line.className='bili-ja-zh-original';line.style.cssText='display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.92em;line-height:1.6;margin:5px 0 8px;padding:4px 0 4px 10px;border-left:2px solid #00aeec;color:var(--text2,#8293a4);font-weight:400;';target.after(line);placedLines.set(target,line);}const signature=JSON.stringify([id,original,english,japanese,same]);if(line.dataset.signature===signature){if(id.endsWith(':title'))titleDisplay(line);else if(id.startsWith('dyn:')&&id.endsWith(':desc'))for(const caption of line.querySelectorAll('small'))caption.style.display=titleLabels?'block':'none';return;}line.dataset.signature=signature;line.dataset.fontRegion=/^\d+:\d+$/.test(id)?'comments':target.closest('.video-page-card-small,.recommend-video-card')?'recommend':fontPage();line.replaceChildren();for(const [label,text,lang] of [['中文原文',same?'':original,'zh-CN'],['日本語',japanese,'ja'],['English',english,'en']]){if(!text)continue;const row=document.createElement('div');row.lang=lang;row.style.marginTop='3px';const caption=document.createElement('small');caption.textContent=label;caption.style.cssText='display:block;font-size:10px;opacity:.7';const span=document.createElement('span');span.textContent=text;if(lang==='ja')bindKana(span,text);row.append(caption,span);line.append(row);}if(id.endsWith(':title'))titleDisplay(line);else if(id.startsWith('dyn:')&&id.endsWith(':desc'))for(const caption of line.querySelectorAll('small'))caption.style.display=titleLabels?'block':'none';}
 function resetComment(target){
  const state=commentLayouts.get(target);
  if(!state)return;
  state.control?.remove();
  target.style.cssText=state.style;
  commentLayouts.delete(target);
 }
 function layoutComment(target,inlineAuthor=false){
  if(!target)return;
  const line=placedLines.get(target);
  if(!line?.isConnected){resetComment(target);return;}
  let state=commentLayouts.get(target);
  if(!state){
   const savedFont=nativeFonts.get(target);
   const originalStyle=target.cloneNode(false).style;
   if(savedFont)originalStyle.setProperty('font-size',...savedFont);
   state={wrapper:target.parentNode,style:originalStyle.cssText};
   if(!state.wrapper)return;
   commentLayouts.set(target,state);
  }
  const rows=[...line.children],texts=[visibleText(target),...rows.map(row=>row.querySelector('span').textContent)];
  for(const caption of line.querySelectorAll('small'))caption.style.display='none';
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const style=getComputedStyle(target);
  const fits=parts=>parts.every(([text])=>!text.includes('\n'))&&parts.reduce((total,[text,size])=>{
   ctx.font=style.fontWeight+' '+size+'px '+style.fontFamily;
   return total+ctx.measureText(text).width+24;
  },0)<=commentWidth(state.wrapper);
  const original=[texts[0],languageFonts['comments:'+nativeLocale()]??parseFloat(style.fontSize)];
  const measured=rows.map((row,index)=>[texts[index+1],fontSize('comments',row.lang)]);
  const en=rows.find(row=>row.lang==='en'),ja=rows.find(row=>row.lang==='ja');
  const inline=texts.every(t=>t.length<=60)&&fits([original,...measured]);
  const paired=!inline&&!isJapanese()&&commentPair&&en&&ja&&fits([original,measured[rows.indexOf(en)]]);
  if(inlineAuthor)target.style.cssText=state.style+';display:inline;margin:0;vertical-align:baseline;';
  else target.style.cssText=state.style+((inline||paired)?';display:inline-block;width:auto;max-width:100%;margin:0;vertical-align:baseline;':'');
  line.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text2,#8293a4);';
  if(inline||paired)line.style.display='inline';
  else line.style.cssText+='display:flex;flex-direction:column;margin:'+lineGap('comments')+'px 0 8px;padding-left:10px;border-left:2px solid #00aeec;';
  const order=lang=>lang==='zh-CN'?0:lang==='en'?1:2;
  if(inline&&en&&ja&&en.nextElementSibling!==ja)line.insertBefore(en,ja);
  for(const row of rows){
   row.style.cssText='order:'+order(row.lang)+';';
   if(inline||(paired&&row===en))row.style.cssText+='display:inline-block;vertical-align:baseline;margin-left:10px;padding-left:10px;border-left:1px solid var(--text3,#777);';
   if(paired&&row===ja)row.style.cssText+='display:block;margin:'+lineGap('comments')+'px 0 0;padding-left:10px;border-left:2px solid #00aeec;';
  }
  applyTranslationFonts(line);
  foldComment(target,state,line,texts,[original[1],...measured.map(([,size])=>size)]);
 }
 function commentWidth(parent){
  for(let node=parent;node;node=node.parentNode||node.host){
   if(node.nodeType===1&&node.clientWidth&&!getComputedStyle(node).display.startsWith('inline'))return node.clientWidth;
  }
  return document.documentElement.clientWidth;
 }
 function foldComment(target,state,line,texts,sizes){const identity=JSON.stringify([texts[0],line.dataset.signature?.split(',')[0]]);if(state.identity!==identity){state.identity=identity;state.expanded=false;}const width=Math.max(1,commentWidth(state.wrapper)),cs=getComputedStyle(target),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.5,key=JSON.stringify([texts,width,cs.font,lh,sizes]);if(state.measureKey!==key){const probe=document.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;padding:0;margin:0;border:0;box-sizing:border-box;';probe.style.width=width+'px';probe.style.font=cs.font;probe.style.lineHeight=lh+'px';state.wrapper.append(probe);state.lines=Math.max(...texts.map(text=>{probe.textContent=text;return Math.round(probe.getBoundingClientRect().height/lh);}));probe.remove();state.measureKey=key;}if(state.lines<=foldLimit){state.control?.remove();state.control=null;return;}if(!state.control){const control=document.createElement('button');control.type='button';control.className='bili-translation-expand';control.style.cssText='display:block;border:0;background:none;color:#00aeec;padding:4px 0;margin:3px 0;font:inherit;cursor:pointer;';control.onclick=event=>{event.preventDefault();event.stopPropagation();state.expanded=!state.expanded;schedule();};state.control=control;line.after(control);}const label=state.expanded?'收起翻译':'展开翻译（超过 '+foldLimit+' 行）';if(state.control.textContent!==label)state.control.textContent=label;state.control.setAttribute('aria-expanded',String(!!state.expanded));if(!state.expanded)line.style.display='none';}
 function commentScope(el){let root=el.getRootNode();while(root?.host){if(root.host.tagName==='BILI-COMMENTS'){const parts=(root.host.getAttribute('data-params')||'').split(',');return {type:parts[0],oid:parts[1]};}root=root.host.getRootNode();}return null;}
 function compactCommentHeader(renderer){
  const root=renderer.shadowRoot;
  if(!root)return;
  const existing=root.querySelector('#bili-compact-comment-header');
  if(!compactMainComments){existing?.remove();return;}
  if(existing)return;
  const style=document.createElement('style');
  style.id='bili-compact-comment-header';
  style.textContent='#main > #header,#main > #content{display:inline!important;margin-block:0!important}#main > #header{margin-inline-end:8px}';
  root.append(style);
 }
 function comments(){for(const target of commentLayouts.keys())if(!target.isConnected)resetComment(target);const renderers=all(document,'bili-comment-renderer,bili-comment-reply-renderer');for(const el of renderers){const isReply=el.tagName==='BILI-COMMENT-REPLY-RENDERER';if(!isReply)compactCommentHeader(el);const data=el.data,scope=commentScope(el);if(!data||!scope?.oid)continue;const id=String(data.rpid_str||data.rpid||'');if(!id)continue;const cached=originals.get(scope.oid+':'+id)||(!isJapanese()?data.content?.message:null),rich=el.shadowRoot?.querySelector('bili-rich-text'),target=rich?.shadowRoot?.querySelector('#contents');if(cached){if(target&&data.content?.message)target.dataset.biliBaseFull=data.content.message;addBelow(target,cached,scope.oid+':'+id);layoutComment(target,isReply||compactMainComments);if(!nativeCommentScopes.has(scope.oid)&&el.tagName==='BILI-COMMENT-RENDERER'&&!el.closest('bili-comment-reply-renderer')){requestEnglishComment(scope,data,id);if(!isJapanese())requestJapaneseComment(scope,data,id);}continue;}if(!enabled||nativeCommentScopes.has(scope.oid)||el.tagName==='BILI-COMMENT-REPLY-RENDERER')continue;const root=String(data.root_str||data.root||id)==='0'?id:String(data.root_str||data.root||id);request('root:'+scope.oid+':'+root,'https://api.bilibili.com/x/v2/reply/reply?type='+encodeURIComponent(scope.type)+'&oid='+encodeURIComponent(scope.oid)+'&root='+encodeURIComponent(root)+'&pn=1&ps=20',collect);}}
 const titleCacheKey='bili-title-session-cache-v1',titleCache=new Map();let titleCacheTimer;try{const values=JSON.parse(sessionStorage.getItem(titleCacheKey)||'[]');for(const entry of values)if(entry&&/^BV[\w]+$/.test(entry.bv)&&Date.now()-entry.time<21600000&&entry.time<=Date.now()&&entry.zh?.title){titleCache.set(entry.bv,entry);videos.set(entry.bv,entry.zh);if(typeof entry.ja==='string')japaneseTexts.set(entry.bv+':title',entry.ja);if(typeof entry.en==='string')englishTexts.set(entry.bv+':title',entry.en);}}catch{};
 function cacheTitle(bv,locale,value){if(!value||typeof value.title!=='string'||value.title.length>1000)return;let entry=titleCache.get(bv)||{bv,time:Date.now()};entry.time=Date.now();if(locale==='zh')entry.zh={title:value.title,desc:''};else entry[locale]=value.title;titleCache.delete(bv);titleCache.set(bv,entry);while(titleCache.size>200)titleCache.delete(titleCache.keys().next().value);if(!titleCacheTimer)titleCacheTimer=setTimeout(()=>{titleCacheTimer=null;try{sessionStorage.setItem(titleCacheKey,JSON.stringify([...titleCache.values()]));}catch{}},500);}
 function videoData(bv){if(!videos.has(bv)&&enabled)request('video:'+bv,'https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(bv),d=>{if(d.bvid===bv){videos.set(bv,{title:d.title,desc:d.desc});cacheTitle(bv,'zh',d);}});if(enabled&&!isJapanese()&&!japaneseTexts.has(bv+':title'))request('video-ja:'+bv,'https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(bv),d=>{if(d.bvid===bv){japaneseTexts.set(bv+':title',d.title);cacheTitle(bv,'ja',d);}},'ja');if(enabled&&!englishTexts.has(bv+':title'))request('video-en:'+bv,'https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(bv),d=>{if(d.bvid===bv){englishTexts.set(bv+':title',d.title);englishTexts.set(bv+':desc',d.desc);cacheTitle(bv,'en',d);}},'en');return videos.get(bv);}
 const cardTranslations=new Map();
 function cardHidden(card){if(!card.isConnected||card.querySelector('.blockedOverlay'))return true;for(let node=card;node&&node.nodeType===1;node=node.parentElement){const style=getComputedStyle(node);if(node.hidden||style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return true;}return false;}
 function syncCardTranslations(){for(const [card,state] of cardTranslations){if(!card.isConnected){state.observer.disconnect();state.line.remove();cardTranslations.delete(card);continue;}if(!state.line.isConnected){state.observer.disconnect();cardTranslations.delete(card);continue;}const hidden=cardHidden(card);if(hidden){if(state.line.style.display!=='none')state.line.style.display='none';}else if(state.line.style.display==='none'){state.line.style.display='grid';}}}
 function trackCardTranslation(card,line){let state=cardTranslations.get(card);if(!state){const observer=new MutationObserver(()=>{syncCardTranslations();schedule();});observer.observe(card,{attributes:true,attributeFilter:['style','class','hidden','href'],childList:true,subtree:true});state={observer,line};cardTranslations.set(card,state);}else state.line=line;}
 function layoutCard(card,title=card.querySelector('.bili-dyn-card-video__title')){const line=title&&placedLines.get(title);if(!line?.isConnected)return;trackCardTranslation(card,line);if(line.previousElementSibling!==card)card.after(line);if(cardHidden(card)){line.style.display='none';return;}line.style.cssText='display:grid;gap:12px;padding:0;border:0;margin:6px 0 22px;min-width:0;max-width:100%;box-sizing:border-box;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text2,#8293a4);font-weight:400;';line.style.marginTop=(6-(parseFloat(getComputedStyle(card).marginBottom)||0))+'px';const rows=[...line.children];for(const span of line.querySelectorAll(':scope > div > span')){span.style.display='block';span.style.overflow='visible';span.style.setProperty('-webkit-line-clamp','unset');}for(const row of rows){row.style.minWidth='0';row.style.marginTop='0';row.style.borderLeft='';row.style.paddingLeft='';}const ja=rows.find(r=>r.lang==='ja'),en=rows.find(r=>r.lang==='en');if(ja&&en){for(const row of rows.filter(r=>r!==ja&&r!==en))row.style.gridColumn='1 / -1';ja.style.gridColumn='1';en.style.gridColumn='2';if(card.matches('.video-page-card-small,.recommend-video-card')){en.style.borderLeft='1px solid #00aeec';en.style.paddingLeft='6px';}applyTranslationFonts(line);const key=[Math.round(card.clientWidth),line.dataset.signature,ja.style.fontSize,en.style.fontSize].join(':');if(line.dataset.layoutKey!==key){let best=50,score=Infinity;for(let left=30;left<=65;left+=1){line.style.gridTemplateColumns=left+'fr '+(100-left)+'fr';const lh=parseFloat(getComputedStyle(ja).lineHeight)||20;const a=ja.querySelector('span').getBoundingClientRect().height/lh,b=en.querySelector('span').getBoundingClientRect().height/lh;const value=Math.abs(a-b)*100+Math.max(a,b);if(value<score){score=value;best=left;}}line.dataset.columns=best+'fr '+(100-best)+'fr';line.dataset.layoutKey=key;}line.style.gridTemplateColumns=line.dataset.columns;}else line.style.gridTemplateColumns='minmax(0,1fr)';titleDisplay(line);}
 let playlistHeading=null;
 function titles(){
  const playlist=globalThis.BiliWatchLaterRoute?.matches();
  const bv=playlist?BiliWatchLaterRoute.videoId():location.pathname.match(/\/(?:ja\/)?video\/(BV\w+)/)?.[1];
  const target=bv&&document.querySelector(playlist?'h1.video-title':'h1.video-title,h1');
  if(playlistHeading&&(playlistHeading.bv!==bv||playlistHeading.target!==target)){
   placedLines.get(playlistHeading.target)?.remove();
   playlistHeading.target.closest('.video-info-container')?.classList.remove('bili-translated-video-heading');
   playlistHeading=null;
  }
  if(target){
   const data=videoData(bv);
   if(data){
    if(playlist)playlistHeading={bv,target};
    addBelow(target,data.title,bv+':title',!isJapanese());
    const line=placedLines.get(target),container=target.closest('.video-info-container'),heading=target.closest('.video-info-title');
    container?.classList.toggle('bili-translated-video-heading',!!line?.isConnected);
    if(line?.isConnected&&container&&heading){
     if(line.nextElementSibling!==heading)heading.before(line);
     line.style.cssText='display:flex;flex-direction:column;gap:2px;position:relative;width:auto;max-width:100%;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.92em;line-height:1.5;margin:0 0 4px;color:var(--text2,#8293a4);font-weight:400;';
     for(const row of line.children){row.style.order=row.lang==='ja'?'0':row.lang==='en'?'1':'2';row.style.marginTop='0';}
    }
   }
  }
  for(const card of document.querySelectorAll('a.bili-dyn-card-video[href*="/video/"]')){const id=card.href.match(/\/video\/(BV\w+)/)?.[1];if(!id)continue;const rect=card.getBoundingClientRect();if(!videos.has(id)&&(rect.top>innerHeight*2||rect.bottom< -innerHeight))continue;if(cardHidden(card))continue;const data=videoData(id);if(!data)continue;addBelow(card.querySelector('.bili-dyn-card-video__title'),data.title,id+':title');layoutCard(card);}}

 function layoutHomeTitle(line){if(!line)return;line.dataset.homeTitle='1';line.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:8px;min-width:0;max-width:100%;margin:5px 0 7px;padding:0 0 0 7px;border-left:2px solid #00aeec;box-sizing:border-box;font-size:'+legacyFonts.home+'px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;color:var(--text2,#8293a4);';const rows=[...line.children];for(const row of rows){row.style.minWidth='0';row.style.marginTop='0';row.style.gridColumn=row.lang==='ja'?'1':row.lang==='en'?'2':'1 / -1';row.style.gridRow=row.lang==='ja'||row.lang==='en'?'1':'auto';}if(rows.length===1)line.style.gridTemplateColumns='minmax(0,1fr)';if(rows.length===1)rows[0].style.gridColumn='1';titleDisplay(line);}
 function domesticCards(){
  const recommendationSelector='.video-page-card-small,.recommend-video-card';
  const targets=[...document.querySelectorAll('.bili-video-card__info--tit,.bili-video-card__info--title,.video-page-card-small .title,.recommend-video-card .info .title')];
  const ranks=new Map(targets.map(e=>{const r=e.getBoundingClientRect();return [e,r.bottom>=0&&r.top<=innerHeight?0:1];}));
  targets.sort((a,b)=>ranks.get(a)-ranks.get(b));
  for(const target of targets){
   const recommendation=target.closest(recommendationSelector);
   const link=target.closest('a[href*="/video/"]')||target.querySelector('a[href*="/video/"]');
   const bv=link?.pathname.match(/\/video\/(BV\w+)/)?.[1];
   const previous=recommendation&&placedLines.get(target);
   if(previous&&previous.dataset.videoBvid!==bv)previous.remove();
   if(!bv)continue;
   const card=recommendation||target.closest('.bili-video-card');
   if(card&&cardHidden(card))continue;
   const r=target.getBoundingClientRect();
   if(r.top>innerHeight*2||r.bottom< -innerHeight)continue;
   const data=videoData(bv);
   if(!data)continue;
   addBelow(target,data.title,bv+':title',fontPage()==='home'&&!isJapanese());
   if(recommendation){
    const line=placedLines.get(target);
    if(line?.isConnected)line.dataset.videoBvid=bv;
    layoutCard(recommendation,target);
   }else if(fontPage()==='home')layoutHomeTitle(placedLines.get(target));
  }
 }
 const commentPages=new Set(),commentReplayUrls=new Set(),nativeCommentScopes=new Set();
 function replayComments(url,successful=false){if(commentReplayUrls.has(url))return;let u;try{u=new URL(url,location.href);if(u.hostname!=='api.bilibili.com'||!/^\/x\/v2\/reply\/(?:wbi\/)?(?:main|reply)$/.test(u.pathname))return;if(u.pathname.endsWith('/reply')&&!successful)return;const oid=u.searchParams.get('oid');if(oid&&u.pathname.endsWith('/main'))nativeCommentScopes.add(oid);}catch{return;}u.searchParams.delete('x-bili-locale-json');const base=u.href;if(commentPages.has(base)||!enabled)return;commentPages.add(base);for(const lang of (isJapanese()?['zh','en']:['en','ja']))request('comments-'+lang+':'+base,base,d=>{if(lang==='en')collectEnglish(d);else if(lang==='ja')collectJapanese(d);else collect(d);},lang);}
 function collectEnglish(data,depth=0){if(!data||typeof data!=='object'||depth>14)return;if(data.rpid_str||data.rpid){const id=String(data.rpid_str||data.rpid),oid=String(data.oid||''),t=data.translated_content?.message;if(typeof t==='string'&&normalize(t)!==normalize(data.content?.message))englishTexts.set(oid+':'+id,t);}for(const v of Object.values(data))if(v&&typeof v==='object'){if(Array.isArray(v))v.slice(0,200).forEach(x=>collectEnglish(x,depth+1));else collectEnglish(v,depth+1);}}
 function collectJapanese(data,depth=0){if(!data||typeof data!=='object'||depth>14)return;if(data.rpid_str||data.rpid){const id=String(data.rpid_str||data.rpid),oid=String(data.oid||''),t=data.translated_content?.message;if(typeof t==='string'&&normalize(t)!==normalize(data.content?.message))japaneseTexts.set(oid+':'+id,t);}for(const v of Object.values(data))if(v&&typeof v==='object'){if(Array.isArray(v))v.slice(0,200).forEach(x=>collectJapanese(x,depth+1));else collectJapanese(v,depth+1);}}
 function requestEnglishComment(scope,data,id){const root=String(data.root_str||data.root||id)==='0'?id:String(data.root_str||data.root||id);request('root-en:'+scope.oid+':'+root,'https://api.bilibili.com/x/v2/reply/reply?type='+encodeURIComponent(scope.type)+'&oid='+encodeURIComponent(scope.oid)+'&root='+encodeURIComponent(root)+'&pn=1&ps=20',d=>{collectEnglish(d);if(!englishTexts.has(scope.oid+':'+id))englishTexts.set(scope.oid+':'+id,null);},'en');}
 function requestJapaneseComment(scope,data,id){const root=String(data.root_str||data.root||id)==='0'?id:String(data.root_str||data.root||id);request('root-ja:'+scope.oid+':'+root,'https://api.bilibili.com/x/v2/reply/reply?type='+encodeURIComponent(scope.type)+'&oid='+encodeURIComponent(scope.oid)+'&root='+encodeURIComponent(root)+'&pn=1&ps=20',d=>{collectJapanese(d);if(!japaneseTexts.has(scope.oid+':'+id))japaneseTexts.set(scope.oid+':'+id,null);},'ja');}
 function storeFeed(item,locale){if(!item?.id_str||!item.modules)return;const id=item.id_str;let entry=feedVersions.get(id);if(!entry){entry={};feedVersions.set(id,entry);}entry[locale]=item;if(locale==='ja'){const text=item.modules?.module_dynamic?.desc?.text;if(text)japaneseTexts.set('dyn:'+id+':desc',text);}if(locale==='en'){const text=item.modules?.module_dynamic?.desc?.text;if(text)englishTexts.set('dyn:'+id+':desc',text);}const archive=item.modules?.module_dynamic?.major?.archive;if(archive?.bvid){if(locale==='ja')japaneseTexts.set(archive.bvid+':title',archive.title);if(locale==='zh')videos.set(archive.bvid,{title:archive.title,desc:archive.desc});if(locale==='en'){const zh=videos.get(archive.bvid);englishTexts.set(archive.bvid+':title',normalize(archive.title)!==normalize(zh?.title)?archive.title:null);englishTexts.set(archive.bvid+':desc',normalize(archive.desc)!==normalize(zh?.desc)?archive.desc:null);}}if(item.orig)storeFeed(item.orig,locale);}
 function replayFeed(url){let u;try{u=new URL(url,location.href);if(u.hostname!=='api.bilibili.com'||!/^\/x\/polymer\/web-dynamic\/v1\/(feed\/all|feed\/space|detail)$/.test(u.pathname))return;}catch{return;}u.searchParams.delete('x-bili-locale-json');const base=u.href;if(feedRequests.has(base))return;feedRequests.add(base);for(const lang of (isJapanese()?['zh','en']:['zh','ja','en']))request('feed-'+lang+':'+base,base,d=>{for(const item of d.items||[d.item].filter(Boolean))storeFeed(item,lang);},lang);}
 function inspectFeed(url,json){try{const u=new URL(url,location.href);if(!u.pathname.includes('/web-dynamic/')||json.code!==0)return;replayFeed(url);}catch{}}
 const dynamicFolds=new WeakMap();
 function foldDynamicTranslation(target,id){
  const line=placedLines.get(target);
  let state=dynamicFolds.get(target);
  if(state&&(state.line!==line||state.id!==id||!line?.isConnected)){
   state.control?.remove();
   dynamicFolds.delete(target);
   state=null;
  }
  if(!line?.isConnected)return;
  if(!state){state={line,id};dynamicFolds.set(target,state);}
  applyTranslationFonts(line);
  const spans=[...line.querySelectorAll(':scope > div > span')];
  const sizes=spans.map(span=>span.parentElement.style.fontSize);
  const width=commentWidth(line.parentNode);
  const measureKey=JSON.stringify([width,sizes,spans.map(span=>span.textContent)]);
  if(measureKey!==state.measureKey&&width>0){
   // Read each language at the width and font it actually uses in the feed.
   line.style.display='block';
   state.lines=spans.reduce((total,span)=>{
    const range=document.createRange();
    range.selectNodeContents(span);
    const rows=new Set([...range.getClientRects()].filter(rect=>rect.height>0).map(rect=>Math.round(rect.top)));
    return total+rows.size;
   },0);
   if(state.lines)state.measureKey=measureKey;
  }
  if(state.lines<=foldLimit||!state.lines){
   if(line.style.display==='none')line.style.display='block';
   state.control?.remove();
   state.control=null;
   return;
  }
  if(!state.control?.isConnected){
   const control=document.createElement('button');
   control.type='button';
   control.className='bili-dynamic-translation-expand';
   control.style.cssText='display:block;border:0;background:none;color:#00aeec;padding:3px 0;margin:4px 0;font:inherit;cursor:pointer;';
   control.onclick=event=>{
    event.stopPropagation();
    state.expanded=!state.expanded;
    foldDynamicTranslation(target,id);
   };
   line.after(control);
   state.control=control;
  }
  line.style.display=state.expanded?'block':'none';
  const label=state.expanded?'收起翻译':'展开翻译（'+state.lines+' 行）';
  if(state.control.textContent!==label)state.control.textContent=label;
  state.control.setAttribute('aria-expanded',String(!!state.expanded));
 }
 window.addEventListener('resize',schedule);
 function dynamicPosts(){for(const node of document.querySelectorAll('.bili-dyn-item')){const view=node.__vue__?.data||node.__vue__?.$props?.data;if(!view?.id_str)continue;const versions=feedVersions.get(view.id_str);if(!versions?.zh){const rect=node.getBoundingClientRect();if(rect.top<innerHeight*2&&rect.bottom> -innerHeight)replayFeed('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id='+encodeURIComponent(view.id_str));continue;}const pair=(container,zh,en,id)=>{const target=container?.querySelector('.bili-rich-text__content');const original=zh?.modules?.module_dynamic?.desc?.text;const nativeItem=id===view.id_str?view:view.orig;if(target&&nativeItem?.modules?.module_dynamic?.desc?.text)target.dataset.biliBaseFull=nativeItem.modules.module_dynamic.desc.text;const japanese=feedVersions.get(id)?.ja?.modules?.module_dynamic?.desc?.text;if(japanese)japaneseTexts.set('dyn:'+id+':desc',japanese);if(en?.modules?.module_dynamic?.desc?.text)englishTexts.set('dyn:'+id+':desc',en.modules.module_dynamic.desc.text);if(!target)return;addBelow(target,original,'dyn:'+id+':desc');foldDynamicTranslation(target,id);};const zh=versions.zh,en=versions.en;const body=node.querySelector('.bili-dyn-content');if(view.orig){pair(body?.querySelector('.bili-dyn-content__forw__desc'),zh,en,view.id_str);pair(body?.querySelector('.bili-dyn-content__orig__desc'),zh.orig,en?.orig,view.orig.id_str);}else pair(body?.querySelector('.bili-dyn-content__orig__desc'),zh,en,view.id_str);}}

 function render(){renderTimer=null;if(!uiReady||!document.body)return;syncCardTranslations();if(!enabled){document.querySelectorAll('.bili-translated-video-heading').forEach(e=>e.classList.remove('bili-translated-video-heading'));for(const target of [...commentLayouts.keys()])resetComment(target);for(const root of roots)root.querySelectorAll('.bili-ja-zh-original,#bili-compact-comment-header,.bili-dynamic-translation-expand').forEach(e=>e.remove());applyNativeFonts();return;}comments();dynamicPosts();titles();domesticCards();applyPageFonts();}
 function schedule(){if(!renderTimer)renderTimer=setTimeout(render,150);}
 function boot(){if(!document.body)return;const headingStyle=document.createElement('style');headingStyle.textContent='.video-info-container.bili-translated-video-heading{height:auto!important;min-height:104px;box-sizing:border-box}';document.head.append(headingStyle);uiReady=true;watch(document);try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){replayComments(entry.name);replayFeed(entry.name);}}).observe({type:'resource',buffered:true});}catch{}for(const entry of performance.getEntriesByType('resource')){replayFeed(entry.name);replayComments(entry.name);}const toggle=document.createElement('button');toggle.id='bili-ja-zh-toggle';toggle.textContent=enabled?'日中英对照 ✓':'日中英对照';toggle.setAttribute('aria-pressed',String(enabled));toggle.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483645;border:1px solid #00aeec;border-radius:20px;padding:8px 14px;background:#152536;color:#dff5ff;cursor:pointer;font:13px system-ui';toggle.onclick=()=>{enabled=!enabled;try{localStorage.setItem(key,String(enabled));}catch{}toggle.textContent=enabled?'日中英对照 ✓':'日中英对照';toggle.setAttribute('aria-pressed',String(enabled));schedule();};document.body.append(toggle);const settings=document.createElement('div');settings.id='bili-translation-settings';settings.style.cssText='position:fixed;right:18px;bottom:62px;z-index:2147483645;background:#152536;color:#dff5ff;border:1px solid #456;padding:7px 10px;border-radius:8px;font:13px system-ui;max-height:65vh;overflow:auto;';const label=document.createElement('label');label.textContent='超过多少行默认折叠：';label.style.cssText='display:block;margin-top:10px;';const input=document.createElement('input');input.id='bili-translation-fold-limit';input.type='number';input.min='1';input.max='100';input.value=String(foldLimit);input.style.cssText='width:54px;margin-left:6px;';input.onchange=()=>{const value=Number(input.value);if(!Number.isInteger(value)||value<1||value>100){input.value=String(foldLimit);return;}foldLimit=value;try{localStorage.setItem('bili-translation-fold-lines',String(value));}catch{}for(const state of commentLayouts.values())state.expanded=false;schedule();};label.append(input);
 const fontStyle=document.createElement('style');
 fontStyle.textContent=".bili-font-card{min-width:0;border:1px solid #456;border-radius:8px;margin:8px 0;padding:8px}.bili-font-preview{margin:6px 0;padding:6px 8px;border-radius:6px;background:#0b1823;overflow-wrap:anywhere}.bili-font-pixel-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.bili-font-pixel-fields[hidden]{display:none}.bili-font-pixel-fields label{display:grid;gap:4px;margin:0}.bili-font-pixel-fields input{width:100%;min-width:0;box-sizing:border-box}";
 settings.append(fontStyle);
 function buildFontGroup({id,title,previewId,regions,samples}){
  const group=document.createElement('fieldset');
  group.id=id;
  group.className='bili-font-card';
  const legend=document.createElement('legend');
  legend.textContent=title;
  group.append(legend);
  const region=document.createElement('select');
  region.setAttribute('aria-label','字号区域');
  for(const key of regions)region.append(new Option(fontPages[key],key));
  region.value=regions.includes(fontPage())?fontPage():regions[0];
  if(regions.length>1)group.append(region);
  const preview=document.createElement('div');
  preview.id=previewId;preview.className='bili-font-preview';
  preview.setAttribute('aria-label',title+'字号预览');
  preview.style.display='grid';preview.style.lineHeight='1.12';
  group.append(preview);
  const spacing=document.createElement('label'),gap=document.createElement('input');
  spacing.className='bili-font-range-gap';
  gap.id=id+'-gap';gap.type='range';gap.min='0';gap.max='24';gap.step='1';
  gap.setAttribute('aria-label',title+'分行间距');
  spacing.append('分行间距',gap);
  const paintGap=()=>{preview.style.rowGap=lineGap(region.value)+'px';};
  gap.oninput=()=>{
   lineGaps[region.value+':gap']=gap.valueAsNumber;
   paintGap();schedule();
  };
  gap.onchange=()=>saveFontSetting(region.value+':gap',lineGap(region.value));
  const rows=new Map(),previewRows=new Map();
  for(const [index,[lang,,sample]] of fontSamples.entries()){
   const text=document.createElement('div');text.lang=lang;text.textContent=samples?.[index]||sample;
   previewRows.set(lang,text);preview.append(text);
  }
  function paint(){
   const key=region.value;
   gap.value=String(lineGap(key));
   paintGap();
   for(const [page,fields] of rows)fields.hidden=page!==key;
   for(const [lang,text] of previewRows){
    const size=fontSize(key,lang);
    text.style.fontSize=size+'px';
    const input=fontInputs.get(key+':'+lang);
    if(input)input.dataset.defaultSize=String(size);
   }
  }
  for(const key of regions){
   const fields=document.createElement('div');fields.className='bili-font-pixel-fields';rows.set(key,fields);
   for(const [lang,language] of fontSamples){
    const row=document.createElement('label'),input=document.createElement('input'),storageKey=key+':'+lang;
    input.type='number';input.min='9';input.max='48';input.step='1';input.placeholder='默认';
    input.value=languageFonts[storageKey]??'';
    input.dataset.fontPage=key;input.dataset.fontLanguage=lang;
    input.setAttribute('aria-label',fontPages[key]+language+'字号');
    fontInputs.set(storageKey,input);
    input.oninput=()=>{if(validFont(input.valueAsNumber))previewRows.get(lang).style.fontSize=input.valueAsNumber+'px';};
    input.onchange=()=>{
     const value=input.value===''?null:input.valueAsNumber;
     if(value!==null&&!validFont(value)){input.value=languageFonts[storageKey]??'';paint();return;}
     loadFonts({[storageKey]:value});
     saveFontSetting(storageKey,value);
     paint();schedule();
    };
    row.append(language,input);fields.append(row);
   }
   group.append(fields);
  }
  group.append(spacing);
  region.onchange=paint;
  paint();
  return {group,paint};
 }
 const commentFonts=buildFontGroup({id:'bili-comment-font-settings',title:'评论区',previewId:'bili-comment-font-preview',regions:['comments'],samples:['这段解释很清楚。','この説明はわかりやすい。','That explains it well.']});
 const pageFonts=buildFontGroup({id:'bili-page-font-settings',title:'网页文字',previewId:'bili-page-font-preview',regions:Object.keys(fontPages).filter(key=>key!=='comments')});
 refreshFontPreview=()=>{commentFonts.paint();pageFonts.paint();};
 settings.append(commentFonts.group,pageFonts.group,label);const pairLabel=document.createElement('label');pairLabel.style.cssText='display:block;margin-top:8px;';const pair=document.createElement('input');pair.type='checkbox';pair.id='bili-comment-pair';pair.checked=commentPair;pairLabel.append(pair,' 评论中英并排，日语另起一行');pair.onchange=()=>{commentPair=pair.checked;try{localStorage.setItem('bili-comment-pair',String(commentPair));}catch{}schedule();};settings.append(pairLabel);
 const compactLabel=document.createElement('label');
 compactLabel.style.cssText='display:block;margin-top:8px';
 const compact=document.createElement('input');
 compact.id='bili-compact-main-comments';compact.type='checkbox';compact.checked=compactMainComments;
 compactLabel.append(compact,' 主评论用户名与正文同行');
 compact.onchange=()=>{compactMainComments=compact.checked;try{localStorage.setItem('bili-compact-main-comments',String(compactMainComments));}catch{}schedule();};
 settings.append(compactLabel);
 const fullLabel=document.createElement('label');fullLabel.style.cssText='display:block;margin-top:10px;';const full=document.createElement('input');full.id='bili-title-full';full.type='checkbox';full.checked=titleFull;fullLabel.append(full,' 标题译文显示全文');const countLabel=document.createElement('label');countLabel.style.cssText='display:block;margin-top:8px;';countLabel.textContent='省略时保留行数：';const count=document.createElement('input');count.id='bili-title-lines';count.type='number';count.min='1';count.max='20';count.value=String(titleLines);count.disabled=titleFull;count.style.width='54px';countLabel.append(count);const labelsLabel=document.createElement('label');labelsLabel.style.cssText='display:block;margin-top:8px;';const labels=document.createElement('input');labels.id='bili-title-labels';labels.type='checkbox';labels.checked=titleLabels;labelsLabel.append(labels,' 显示标题和动态语言标签');const saveTitle=()=>{try{localStorage.setItem('bili-title-display',JSON.stringify({lines:titleLines,full:titleFull,labels:titleLabels}));}catch{}schedule();};full.onchange=()=>{titleFull=full.checked;count.disabled=titleFull;saveTitle();};count.onchange=()=>{const value=Number(count.value);if(Number.isInteger(value)&&value>=1&&value<=20){titleLines=value;saveTitle();}else count.value=String(titleLines);};labels.onchange=()=>{titleLabels=labels.checked;saveTitle();};settings.append(fullLabel,countLabel,labelsLabel);document.body.append(settings);schedule();setInterval(schedule,1800);}
 // Wait for the native Vue apps to hydrate before adding siblings to server-rendered nodes.
 const start=()=>setTimeout(boot,1800);if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();

