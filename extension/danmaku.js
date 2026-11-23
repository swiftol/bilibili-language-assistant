(()=>{
 function routeKey(){
  const query=new URLSearchParams(location.search),identity=new URLSearchParams();
  for(const key of ['p','bvid','oid','cid'])if(query.has(key))identity.set(key,query.get(key));
  return location.pathname+(identity.size?'?'+identity:'');
 }
 if(window.__biliDanmakuTranslation)return;
 window.__biliDanmakuTranslation=true;

 const key='bili-danmaku-translation-enabled',selector='.bili-danmaku-x-dm';
 const inlineKey='bili-danmaku-short-inline',languages=['zh','en','ja'],cache=new Map(),byLanguage=new Map(languages.map(lang=>[lang,new Map()]));
 let shortInline=localStorage.getItem(inlineKey)==='true',shown=new WeakMap();
 const fixedKey='bili-danmaku-translate-fixed';
 const fixedSelector='.bili-danmaku-x-center,.bili-danmaku-x-high-top';
 const rollingSelector='.bili-danmaku-x-roll,.bili-danmaku-x-bidirection-reverse';
 const isFixed=element=>element.matches(fixedSelector)&&!element.matches(rollingSelector);
 let translateFixed=localStorage.getItem(fixedKey)!=='false';
 const sizeKey='bili-danmaku-font-percent-by-language',minSize=20,maxSize=300;
 const fontOptions=[['zh','中文','这段真精彩'],['ja','日语','この場面、よかったね！'],['en','英语','That was a great scene!']];
 const validSize=value=>Number.isFinite(value)&&value>=minSize&&value<=maxSize;
 const legacySize=Number(localStorage.getItem('bili-danmaku-translated-font-percent'));
 let savedSizes={};
 try{savedSizes=JSON.parse(localStorage.getItem(sizeKey)||'{}')||{};}catch{}
 const fontSizes=Object.fromEntries(fontOptions.map(([lang])=>[
  lang,Math.round(validSize(savedSizes[lang])?savedSizes[lang]:validSize(legacySize)?legacySize:75)
 ]));
 const spacingKey='bili-danmaku-translation-line-gap',maxLineGap=24;
 const storedGap=Number(localStorage.getItem(spacingKey));
 let lineGap=Number.isInteger(storedGap)&&storedGap>=0&&storedGap<=maxLineGap?storedGap:0;
 const stackStyle='display:inline-grid;justify-items:start;row-gap:var(--bili-dm-line-gap, 0px);white-space:normal;line-height:1';
 const description='仅显示 B 站已有的英日译文。点击日语查看假名，再点恢复。';
 const kanaClass='bili-dm-kana',textClass='bili-dm-translated-text',kanji=/[\u3400-\u9fff々]/u;
 let kanaWarmed=false,placed=new WeakMap();
 const layerSelector='.bpx-player-row-dm-wrap';
 const fixedHoldDuration=4000,heldComments=new Map(),heldTriggers=new WeakMap();
 const laneCss=document.createElement('style');
 laneCss.textContent=`
  [data-bili-dm-held]{opacity:0!important}
  [data-bili-dm-held], [data-bili-dm-held] *{pointer-events:none!important}
  [data-bili-dm-lane],[data-bili-dm-center]{translate:var(--bili-dm-center-offset,0px) var(--bili-dm-lane-offset,0px)}
  [data-bili-dm-folded]{line-height:var(--bili-dm-original-line)!important;white-space:var(--bili-dm-original-wrap)!important}
  [data-bili-dm-folded] > .bili-dm-translated-text{display:none!important}
  [data-bili-dm-folded]::after{content:attr(data-bili-dm-original)}
 `;
 document.documentElement.append(laneCss);
 let enabled=localStorage.getItem(key)==='true',route=routeKey();

 function status(text){
  const el=document.getElementById('bili-dual-native')?.shadowRoot?.querySelector('#danmaku-translate-status');
  if(el&&el.textContent!==text)el.textContent=text;
 }
 function toggleBridge(){
  document.dispatchEvent(new CustomEvent('bili-danmaku-official-toggle',{detail:enabled?'on':'off'}));
 }
 function applyFontPercent(){
  for(const [lang] of fontOptions)document.documentElement.style.setProperty('--bili-dm-font-'+lang,String(fontSizes[lang]/100));
 }
 function applyLineGap(){
  document.documentElement.style.setProperty('--bili-dm-line-gap',lineGap+'px');
 }
 function setup(){
  const ui=document.getElementById('bili-dual-native')?.shadowRoot,section=ui?.querySelector('section');
  if(!section||ui.querySelector('#danmaku-translate-toggle'))return;
  const label=document.createElement('label');
  label.style.cssText='display:block;margin:10px 0';
  label.innerHTML='<input type="checkbox" id="danmaku-translate-toggle"> 弹幕中英日对照 <small id="danmaku-translate-status"></small>';
  const layoutLabel=document.createElement('label');
  layoutLabel.style.cssText='display:block;margin:10px 0';
  const layout=document.createElement('input');
  layout.type='checkbox';
  layout.id='danmaku-short-inline';
  layout.checked=shortInline;
  layoutLabel.append(layout,' 短弹幕译文同行');
  const fixedLabel=document.createElement('label');
  fixedLabel.style.cssText='display:block;margin:10px 0';
  const fixedToggle=document.createElement('input');
  fixedToggle.type='checkbox';
  fixedToggle.id='danmaku-translate-fixed';
  fixedToggle.checked=translateFixed;
  fixedLabel.append(fixedToggle,' 翻译固定弹幕（顶部和底部）');
  const sizes=document.createElement('fieldset');
  sizes.className='bili-font-card';
  const legend=document.createElement('legend');
  legend.textContent='弹幕';
  const preview=document.createElement('div');
  preview.className='bili-dm-size-preview bili-font-preview';
  preview.setAttribute('aria-label','翻译弹幕字号预览');
  preview.style.cssText=stackStyle+';display:grid';
  sizes.append(legend,preview);
  for(const [lang,name,sample] of fontOptions){
   const sampleRow=document.createElement('div');
   sampleRow.lang=lang;
   sampleRow.textContent=sample;
   sampleRow.style.fontSize='calc(24px * var(--bili-dm-font-'+lang+'))';
   preview.append(sampleRow);
   const label=document.createElement('label'),input=document.createElement('input'),value=document.createElement('output');
   label.className='bili-font-range';
   input.id='danmaku-font-'+lang;
   input.setAttribute('aria-label',name+'弹幕字号');
   input.type='range';
   input.min=String(minSize);
   input.max=String(maxSize);
   input.value=String(fontSizes[lang]);
   value.htmlFor=input.id;
   const paint=()=>{value.value=fontSizes[lang]+'%';input.setAttribute('aria-valuetext',value.value);};
   input.oninput=()=>{
    fontSizes[lang]=input.valueAsNumber;
    localStorage.setItem(sizeKey,JSON.stringify(fontSizes));
    applyFontPercent();
    paint();
   };
   paint();
   label.append(name,input,value);
   sizes.append(label);
  }
  const hint=document.createElement('small');
  hint.textContent='100% 为播放器普通弹幕字号';
  const spacingLabel=document.createElement('label'),spacing=document.createElement('input'),spacingValue=document.createElement('output');
  spacingLabel.className='bili-font-range bili-font-range-gap';
  spacing.id='danmaku-line-gap';
  spacing.type='range';
  spacing.min='0';
  spacing.max=String(maxLineGap);
  spacing.value=String(lineGap);
  spacing.setAttribute('aria-label','翻译弹幕行间距');
  spacingValue.htmlFor=spacing.id;
  const paintSpacing=()=>{
   spacingValue.value=lineGap+' px';
   spacing.setAttribute('aria-valuetext',spacingValue.value);
  };
  spacing.oninput=()=>{
   lineGap=spacing.valueAsNumber;
   localStorage.setItem(spacingKey,String(lineGap));
   applyLineGap();
   paintSpacing();
  };
  paintSpacing();
  spacingLabel.append('分行间距',spacing,spacingValue);
  sizes.append(hint,spacingLabel);
  const pane=document.createElement('div');
  pane.dataset.playerPane='subtitles';
  pane.hidden=ui.querySelector('[data-player-tab="subtitles"][aria-selected="false"]')!==null;
  sizes.id='bili-dm-font-settings';
  const fonts=ui.getElementById('player-fonts-pane');
  const heading=document.createElement('h4');heading.textContent='弹幕';
  pane.append(heading,label,fixedLabel,layoutLabel);
  (fonts||pane).append(sizes);
  const subtitles=ui.getElementById('language-pool')?.parentElement;
  (subtitles||ui.getElementById('player-language-tabs')||section.querySelector('h3')).after(pane);
  layout.onchange=()=>{
   shortInline=layout.checked;
   localStorage.setItem(inlineKey,String(shortInline));
   restoreLayout();
   if(enabled)scan(document);
  };
  fixedToggle.onchange=()=>{
   translateFixed=fixedToggle.checked;
   if(!translateFixed)clearHeldComments();
   localStorage.setItem(fixedKey,String(translateFixed));
   if(enabled)scan(document);
  };
  const toggle=label.querySelector('input');
  toggle.checked=enabled;
  status(description);
  toggle.onchange=()=>{
   enabled=toggle.checked;
   localStorage.setItem(key,String(enabled));
   reset();
   status(description);
   toggleBridge();
   if(enabled)scan(document);
  };
 }
 function restoreNode(node){
  if(node.dataset.biliDmRendered===node.textContent)node.textContent=node.dataset.biliDmOriginal;
  node.style.fontSize=node.dataset.biliDmSize||'';
  node.style.lineHeight=node.dataset.biliDmLine||'';
  node.style.whiteSpace=node.dataset.biliDmWhite||'';
  delete node.dataset.biliDmFolded;
  node.style.removeProperty('--bili-dm-original-line');
  node.style.removeProperty('--bili-dm-original-wrap');
  for(const name of ['Original','Rendered','Size','Line','White'])delete node.dataset['biliDm'+name];
 }
 function restoreLayout(){
  clearHeldComments();
  shown=new WeakMap();
  placed=new WeakMap();
  document.querySelectorAll('[data-bili-dm-lane],[data-bili-dm-center]').forEach(resetPosition);
  document.querySelectorAll('[data-bili-dm-original]').forEach(restoreNode);
 }
 function reset(){
  cache.clear();
  for(const index of byLanguage.values())index.clear();
  restoreLayout();
 }
 function syncRoute(){
  const next=routeKey();
  if(next===route)return;
  route=next;
  reset();
  status(description);
  toggleBridge();
 }
 function indexRow(incoming,native){
  const id=incoming.id;
  if(typeof id!=='string')return;
  let row=cache.get(id);
  if(!row){row={native:new Set()};cache.set(id,row);}
  for(const lang of languages){
   const value=incoming[lang];
   if(typeof value!=='string'||!value||(!native&&row.native.has(lang)))continue;
   if(native)row.native.add(lang);
   if(row[lang]===value)continue;
   const index=byLanguage.get(lang);
   const old=index.get(row[lang]);
   old?.delete(row);
   if(old&&!old.size)index.delete(row[lang]);
   row[lang]=value;
   if(!index.has(value))index.set(value,new Set());
   index.get(value).add(row);
  }
 }
 function officialLines(text,original){
  const locale=location.pathname.match(/^\/(ja|en)(?=\/)/)?.[1]||'zh';
  const matches=byLanguage.get(locale).get(text)||
   new Set(languages.flatMap(lang=>[...byLanguage.get(lang).get(text)||[]]));
  const lines=[],included=new Set();
  for(const lang of languages){
   const versions=new Set([...matches].map(row=>row[lang]).filter(Boolean));
   const value=lang===locale?original:versions.size===1?[...versions][0]:null;
   if(!value||included.has(value.trim()))continue;
   if(lang!==locale&&value===text)continue;
   lines.push([lang,value]);
   included.add(value.trim());
  }
  return lines;
 }
 function add(element){
  if(!enabled||!element.matches?.(selector)||!element.isConnected)return;
  const held=heldComments.get(element);
  if(held&&!sameHeldSource(held))revealHeldSource(held);
  const richText=element.querySelector(':scope > .bili-danmaku-x-high-text,:scope > .bili-danmaku-x-dm-vip');
  const node=richText||element;
  const fixed=isFixed(element);
  if(placed.has(element)&&placed.get(element)!==fixed){placed.delete(element);resetPosition(element);delete node.dataset.biliDmFolded;}
  if(fixed&&!translateFixed){
   placed.delete(element);resetPosition(element);
   if(node.hasAttribute('data-bili-dm-original'))restoreNode(node);
   shown.delete(node);
   return;
  }
  if([...node.children].some(child=>!child.classList.contains(textClass)))return;
  const rendered=node.dataset.biliDmRendered,existing=rendered===node.textContent;
  if(rendered&&!existing){restoreNode(node);shown.delete(node);placed.delete(element);resetPosition(element);}
  const original=existing?node.dataset.biliDmOriginal:node.textContent,text=original.trim();
  if(!text)return;
  if(element.classList.contains('bili-danmaku-x-show')){
   if(shown.get(node)===original)return;
   shown.set(node,original);
  }else{shown.delete(node);placed.delete(element);resetPosition(element);delete node.dataset.biliDmFolded;}
  const lines=officialLines(text,original);
  if(lines.length<2){
   if(existing)restoreNode(node);
   return;
  }
  if(!existing){
   const sourceLines=text.split(/\r?\n/);
   const verticalText=sourceLines.length>2&&sourceLines.every(line=>Array.from(line.trim()).length===1);
   if(verticalText||getComputedStyle(node).writingMode!=='horizontal-tb')return;
  }
  const inline=lines.map(([,value])=>value).join('　|　');
  const stack=!shortInline||inline.length>42||inline.includes('\n'),separator=stack?'\n':'　|　';
  const layout=lines.map(([,value])=>value).join(separator);
  if(existing&&(rendered===layout||node.querySelector('.'+kanaClass)?.getAttribute('aria-pressed')==='true'))return;
  if(existing)restoreNode(node);
  node.dataset.biliDmOriginal=original;
  node.dataset.biliDmSize=node.style.fontSize;
  node.dataset.biliDmLine=node.style.lineHeight;
  node.dataset.biliDmWhite=node.style.whiteSpace;
  const nativeStyle=getComputedStyle(node),nativeSize=nativeStyle.fontSize;
  node.style.setProperty('--bili-dm-original-line',nativeStyle.lineHeight);
  node.style.setProperty('--bili-dm-original-wrap',nativeStyle.whiteSpace);
  const block=document.createElement('span');
  block.className=textClass;
  block.style.cssText=stack?stackStyle:'display:inline-block;white-space:inherit';
  if(stack&&fixed)block.style.justifyItems='center';
  for(const [lang,value] of lines){
   const row=document.createElement('span');
   row.lang=lang;
   row.textContent=value;
   if(stack)row.style.whiteSpace='pre';
   row.style.fontSize='calc(var(--fontSize, '+nativeSize+') * var(--bili-dm-font-'+lang+'))';
   if(lang==='ja'&&kanji.test(value)&&globalThis.BiliKana){
    row.className=kanaClass;
    row.tabIndex=0;
    row.setAttribute('role','button');
    row.setAttribute('aria-pressed','false');
    row.title='点击显示假名，再点恢复';
    row.style.pointerEvents='auto';
    row.style.cursor='pointer';
   }
   if(block.childNodes.length)block.append(separator);
   block.append(row);
  }
  node.replaceChildren(block);
  if(stack){
   node.style.lineHeight='1';
   node.style.whiteSpace='pre';
  }
  node.dataset.biliDmRendered=node.textContent;
 }
 const snapshotStyles=[
  'display','position','top','right','bottom','left','width','height','margin','padding',
  'box-sizing','gap','justify-items','align-items','vertical-align','flex-direction',
  'color','opacity','font-family','font-size','font-weight','font-style','line-height',
  'text-shadow','-webkit-text-stroke','letter-spacing','text-align','white-space',
  'background','border','border-radius','object-fit','pointer-events','cursor'
 ];
 function copyAppearance(from,to){
  const style=getComputedStyle(from);
  for(const name of snapshotStyles)to.style.setProperty(name,style.getPropertyValue(name));
  if(from.matches('[lang],.'+textClass)){to.style.removeProperty('width');to.style.removeProperty('height');}
  to.removeAttribute('id');
  for(let i=0;i<from.children.length;i++)copyAppearance(from.children[i],to.children[i]);
 }
 function sameHeldSource(held){
  const {source,originalRow,originalText}=held;
  return source.isConnected&&isFixed(source)&&source.classList.contains('bili-danmaku-x-show')&&
   source.contains(originalRow)&&source.textContent===originalText;
 }
 function revealHeldSource(held){
  if(heldComments.get(held.source)!==held)return;
  held.source.removeAttribute('data-bili-dm-held');
  heldComments.delete(held.source);
 }
 const activeHolds=new Set();
 function releaseHeldComment(held){
  clearTimeout(held.timer);held.host.remove();activeHolds.delete(held);
  revealHeldSource(held);
 }
 function clearHeldComments(){for(const held of activeHolds)releaseHeldComment(held);}
 function extendHold(held){
  clearTimeout(held.timer);
  held.timer=setTimeout(()=>releaseHeldComment(held),fixedHoldDuration);
 }
 function holdFixedComment(trigger){
  const existing=heldTriggers.get(trigger);
  if(existing){extendHold(existing);return trigger;}
  const source=trigger.closest(selector);
  const layer=source?.closest(layerSelector);
  if(!layer||!isFixed(source)||!source.classList.contains('bili-danmaku-x-show'))return trigger;
  const bounds=layer.getBoundingClientRect(),rect=source.getBoundingClientRect();
  if(!bounds.width||!bounds.height||!rect.width||!rect.height)return trigger;
  const host=document.createElement('div');
  host.dataset.biliDmHold='';
  host.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:4;';
  const clone=source.cloneNode(true);
  copyAppearance(source,clone);
  const px=(value,factor)=>value*factor+'px';
  clone.style.setProperty('position','absolute');
  const centered=source.hasAttribute('data-bili-dm-center');
  clone.style.setProperty('left',centered?'50%':px(rect.left-bounds.left,layer.clientWidth/bounds.width));
  clone.style.setProperty('top',px(rect.top-bounds.top,layer.clientHeight/bounds.height));
  for(const name of ['right','bottom','height','margin','transform','translate','animation','transition'])clone.style.removeProperty(name);
  if(centered)clone.style.setProperty('translate','-50% 0');
  clone.style.setProperty('width','max-content');
  clone.style.setProperty('pointer-events','none');
  const heldRow=clone.querySelector('.'+kanaClass);
  if(!heldRow)return trigger;
  host.attachShadow({mode:'open'}).append(clone);
  layer.append(host);
  const held={source,originalRow:trigger,originalText:source.textContent,host};
  activeHolds.add(held);heldComments.set(source,held);heldTriggers.set(heldRow,held);
  source.dataset.biliDmHeld='';
  extendHold(held);
  return heldRow;
 }
 function mirrorHeldKana(trigger){
  const held=heldTriggers.get(trigger);
  if(!held||heldComments.get(held.source)!==held||!sameHeldSource(held))return;
  const row=held.originalRow,node=row.closest('[data-bili-dm-original]');
  if(!node)return;
  row.textContent=trigger.textContent;
  row.dataset.originalJapanese=trigger.dataset.originalJapanese;
  row.setAttribute('aria-pressed',trigger.getAttribute('aria-pressed'));
  row.title=trigger.title;
  node.dataset.biliDmRendered=node.textContent;
  held.originalText=held.source.textContent;
 }
 async function toggleKana(trigger){
  const node=trigger.closest('[data-bili-dm-original]');
  if(!enabled||!node||trigger.getAttribute('aria-busy')==='true')return;
  if(trigger.getAttribute('aria-pressed')==='true'){
   trigger.textContent=trigger.dataset.originalJapanese;
   trigger.setAttribute('aria-pressed','false');
   trigger.title='点击显示假名，再点恢复';
   node.dataset.biliDmRendered=node.textContent;
   mirrorHeldKana(trigger);
   return;
  }
  const original=trigger.textContent;
  trigger.dataset.originalJapanese=original;
  trigger.setAttribute('aria-busy','true');
  try{
   const annotated=await BiliKana.annotate(original);
   if(!enabled||!trigger.isConnected||!node.contains(trigger)||trigger.textContent!==original||node.dataset.biliDmRendered!==node.textContent)return;
   if(annotated===original)return;
   trigger.textContent=annotated;
   node.dataset.biliDmRendered=node.textContent;
   trigger.setAttribute('aria-pressed','true');
   trigger.title='点击恢复日语原文';
   mirrorHeldKana(trigger);
   const held=heldTriggers.get(trigger);
   if(held)extendHold(held);
  }catch{
   trigger.title='假名加载失败，点击重试';
  }finally{
   trigger.removeAttribute('aria-busy');
  }
 }
 const kanaOverlaySelector='.bpx-player-top-title,.bpx-player-top-left-title';
 const kanaBackgroundSelector='.bpx-player-top-wrap,.bpx-player-top-left,.bpx-player-top-mask,.bpx-player-video-wrap,.bpx-player-video-perch,.bpx-player-video-area,video';
 function kanaAtPointer(event){
  const target=event.target;
  const transition=target.closest?.('.bilidp-switch-source-transition-canvas');
  if(!transition&&!target.closest?.(kanaOverlaySelector)&&!target.matches?.(kanaBackgroundSelector))return;
  const player=target.closest('.bpx-player-container')||target.closest('#bilibili-player');
  if(!player&&!transition)return;
  // Only route through the player's title or background. Buttons and menus keep their own clicks.
  for(const el of document.elementsFromPoint(event.clientX,event.clientY)){
   if(player&&!player.contains(el))continue;
   if(el.classList.contains(kanaClass))return el;
   if(el.hasAttribute('data-bili-dm-hold')){
    const row=el.shadowRoot.elementsFromPoint(event.clientX,event.clientY).find(node=>node.classList.contains(kanaClass));
    if(row)return row;
   }
  }
 }
 function handleKanaInput(event){
  if(!enabled)return;
  let trigger=event.composedPath().find(el=>el.classList?.contains(kanaClass));
  if(event.type==='keydown'){
   if(event.key!=='Enter'&&event.key!==' ')return;
  }else{
   if(event.button!==0||(event.type.startsWith('pointer')&&event.isPrimary===false))return;
   trigger||=kanaAtPointer(event);
  }
  if(!trigger)return;
  if(event.type==='pointerdown'){
   event.preventDefault();
   try{trigger.setPointerCapture(event.pointerId);}catch{}
  }
  if(event.type==='click'||event.type==='keydown'){
   event.preventDefault();
   if(!event.repeat)toggleKana(holdFixedComment(trigger));
  }
  event.stopImmediatePropagation();
 }
 for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','keydown']){
  window.addEventListener(type,handleKanaInput,true);
 }
 document.addEventListener('seeking',event=>{
  if(event.target.matches?.('.bpx-player-container video,#bilibili-player video'))clearHeldComments();
 },true);
 window.addEventListener('pagehide',clearHeldComments);
 function setLane(element,offset){
  if(Number(element.dataset.biliDmLane||0)===offset)return;
  if(offset){
   element.dataset.biliDmLane=String(offset);
   element.style.setProperty('--bili-dm-lane-offset',offset+'px');
  }else{
   delete element.dataset.biliDmLane;
   element.style.removeProperty('--bili-dm-lane-offset');
  }
 }
 function resetPosition(element){
  setLane(element,0);
  delete element.dataset.biliDmCenter;
  element.style.removeProperty('--bili-dm-center-offset');
 }
 function centerFixed(element,rect,bounds,scale){
  const offset=(bounds.left+bounds.right-rect.left-rect.right)/2;
  const previous=Number(element.dataset.biliDmCenter||0);
  const distance=Math.abs(offset)<.5?previous:previous+offset/scale;
  element.dataset.biliDmCenter=String(distance);
  element.style.setProperty('--bili-dm-center-offset',distance+'px');
  return {...rect,left:rect.left+offset,right:rect.right+offset};
 }
 function measureMotion(element,scale){
  if(!element.matches(rollingSelector))return null;
  const animation=element.getAnimations().find(item=>/^(roll|roll-reverse|bidirection-reverse)$/.test(item.animationName));
  if(animation?.playState!=='running'||!animation.effect)return null;
  const duration=animation.effect.getComputedTiming().duration;
  const distance=parseFloat(getComputedStyle(element).getPropertyValue('--translateX'));
  if(!Number.isFinite(distance)||!Number.isFinite(duration)||duration<=0)return null;
  const direction=animation.animationName==='roll-reverse'?-1:1;
  return {speed:direction*distance*scale*animation.playbackRate/duration,remaining:(duration-Number(animation.currentTime))/(animation.playbackRate||1)};
 }
 function horizontalConflict(a,b,gap){
  const remaining=Math.min(a.motion?.remaining??Infinity,b.motion?.remaining??Infinity);
  const motion=Number.isFinite(remaining)?((a.motion?.speed||0)-(b.motion?.speed||0))*Math.max(0,remaining):0;
  return Math.min(a.left,a.left+motion)<b.right+gap&&Math.max(a.right,a.right+motion)>b.left-gap;
 }
 function arrangeLayer(layer){
  const elements=[...layer.querySelectorAll(selector+'.bili-danmaku-x-show')];
  const pending=[];
  for(const element of elements){
   if(placed.has(element)||element.hasAttribute('data-bili-dm-held'))continue;
   const text=element.hasAttribute('data-bili-dm-original')?element:element.querySelector('[data-bili-dm-original]');
   if(text)pending.push({element,text,fixed:isFixed(element)});
  }
  if(!pending.length)return;
  const bounds=layer.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const scaleY=bounds.height/(layer.offsetHeight||bounds.height),scaleX=bounds.width/(layer.offsetWidth||bounds.width);
  const occupied=new Map(),pendingElements=new Set(pending.map(entry=>entry.element));
  const motionOf=new Map();
  const box=element=>{
   const rect=element.getBoundingClientRect();
   let {left,right,top,bottom}=rect;
   // A native item can keep the original width even when its longer translated rows extend past it.
   for(const row of element.querySelectorAll('.'+textClass+' > [lang]')){
    const line=row.getBoundingClientRect();
    if(!line.width||!line.height)continue;
    left=Math.min(left,line.left);right=Math.max(right,line.right);
    top=Math.min(top,line.top);bottom=Math.max(bottom,line.bottom);
   }
   return {left,right,top,bottom,height:bottom-top,width:right-left,motion:motionOf.get(element),fixed:isFixed(element)};
  };
  for(const {text} of pending)text.dataset.biliDmFolded='';
  for(const element of elements){
   if(element.hasAttribute('data-bili-dm-held'))continue;
   motionOf.set(element,measureMotion(element,scaleX));
   const rect=box(element);
   if(pendingElements.has(element))rect.pending=true;
   occupied.set(element,rect);
  }
  for(const held of activeHolds)if(held.host.parentElement===layer){
   const rect=held.host.shadowRoot.firstElementChild.getBoundingClientRect();
   occupied.set(held.host,{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,fixed:true});
  }
  for(const {text} of pending)delete text.dataset.biliDmFolded;
  const full=pending.map(entry=>({...entry,rect:box(entry.element)}));
  // Reserve fixed slots first, then fill the remaining rows with rolling comments.
  full.sort((a,b)=>Number(b.fixed)-Number(a.fixed));
  const clearance=3;
  for(const {element,text,rect:originalBox,fixed} of full){
   let rect=originalBox;
   if(fixed&&rect.width&&rect.height)rect=centerFixed(element,rect,bounds,scaleX);
   if(!rect.width||!rect.height){occupied.set(element,rect);continue;}
   occupied.delete(element);
   const neighbours=[...occupied.values()].filter(other=>
    fixed&&other.fixed?!other.pending:horizontalConflict(rect,other,10));
   const bottomFixed=fixed&&rect.top>(bounds.top+bounds.bottom)/2;
   function findTop(box){
    const limit=bounds.bottom-box.height;
    const fits=top=>top>=bounds.top-.5&&top<=limit+.5&&neighbours.every(other=>
     top+box.height+clearance<=other.top||top>=other.bottom+clearance);
    if(fits(box.top))return box.top;
    const candidates=[Math.max(bounds.top,Math.min(limit,box.top)),bounds.top,limit];
    for(const other of neighbours)candidates.push(other.bottom+clearance,other.top-box.height-clearance);
    const permitted=top=>!fixed||(bottomFixed?top<=box.top+.5:top>=box.top-.5);
    return candidates.filter(top=>permitted(top)&&fits(top)).sort((a,b)=>Math.abs(a-box.top)-Math.abs(b-box.top))[0];
   }
   let top=findTop(rect);
   if(top===undefined){
    // Commit to native text before the first paint if the whole translation cannot fit.
    restoreNode(text);
    rect=box(element);
    if(fixed)rect=centerFixed(element,rect,bounds,scaleX);
    if(fixed)top=findTop(rect);
   }
   placed.set(element,fixed);
   if(top!==undefined)setLane(element,(top-rect.top)/scaleY);
   occupied.set(element,{...rect,pending:false,top:top??rect.top,bottom:(top??rect.top)+rect.height});
  }

 }
 const queuedLayers=new Set();
 function queuePlacement(element){
  const layer=element.closest?.(layerSelector);
  if(!layer||queuedLayers.has(layer))return;
  queuedLayers.add(layer);
  queueMicrotask(()=>{
   queuedLayers.delete(layer);
   if(enabled&&layer.isConnected)arrangeLayer(layer);
  });
 }
 let lastArrange=0;
 function arrangeFrame(time){
  if(enabled&&time-lastArrange>=50){
   lastArrange=time;
   document.querySelectorAll(layerSelector).forEach(arrangeLayer);
  }
  requestAnimationFrame(arrangeFrame);
 }
 requestAnimationFrame(arrangeFrame);
 function scan(root){
  if(root.matches?.(selector)){add(root);queuePlacement(root);}
  root.querySelectorAll?.(selector).forEach(element=>{add(element);queuePlacement(element);});
 }
 document.addEventListener('bili-danmaku-official-reset',()=>{if(enabled)reset();});
 document.addEventListener('bili-danmaku-official-result',event=>{
  if(!enabled)return;
  syncRoute();
  let data;
  try{data=JSON.parse(event.detail);}catch{return;}
  if(data.route!==route||!data.ok)return;
  for(const incoming of data.rows||[]){
   indexRow(incoming,data.native);
   if(!kanaWarmed&&typeof incoming.ja==='string'&&kanji.test(incoming.ja)&&globalThis.BiliKana){
    kanaWarmed=true;
    BiliKana.annotate(incoming.ja).catch(()=>{kanaWarmed=false;});
   }
  }
  status(description);
  scan(document);
 });
 new MutationObserver(records=>{
  if(!enabled)return;
  syncRoute();
  for(const record of records){
   const target=record.target.nodeType===3?record.target.parentElement:record.target;
   const element=target?.closest?.(selector);
   if(element){add(element);queuePlacement(element);}
   for(const node of record.addedNodes)scan(node);
  }
 }).observe(document.documentElement,{childList:true,characterData:true,attributes:true,attributeFilter:['class'],subtree:true});

 setInterval(()=>{
  setup();
  syncRoute();
  if(enabled)scan(document);
 },500);
 applyFontPercent();
 applyLineGap();
 setup();
 toggleBridge();
})();
