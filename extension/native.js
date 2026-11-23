(()=>{
 const host=document.createElement('div');host.id='bili-dual-native';document.documentElement.append(host);const ui=host.attachShadow({mode:'open'});
 ui.innerHTML=`<style>:host{font:13px system-ui;color:#ecf4ff}section{position:fixed;right:18px;bottom:18px;width:300px;padding:16px;background:#142638;border:1px solid #71e3c355;border-radius:12px;z-index:2147483647;max-height:65vh;overflow:auto}label{display:block;margin:8px 0}input[type=range]{width:100%}button{background:#71e3c3;color:#10202a;border:0;padding:7px;border-radius:6px;cursor:pointer}small{display:block;color:#a9bfd2;line-height:1.6}h3{margin:0 0 8px}select{width:100%}</style><section><h3>B站原生字幕控制 · 0.2</h3><small>直接调整 B站正在显示的主字幕和副字幕。请先在播放器中打开字幕。</small><label><input id="enabled" type="checkbox">接管原生字幕位置</label><label>主字幕水平<input id="mx" type="range" min="5" max="95" value="50"></label><label>主字幕垂直<input id="my" type="range" min="5" max="95" value="78"></label><label>副字幕水平<input id="sx" type="range" min="5" max="95" value="50"></label><label>副字幕垂直<input id="sy" type="range" min="5" max="95" value="88"></label><label>原生字幕字号<input id="font" type="range" min="0.01" max="10000" step="any" value="26"></label><button id="reset">恢复 B站排版</button><p id="info">等待当前播放器数据</p><small id="audio">尚未检测到带语言标记的配音。码率不同不代表语言不同。</small></section>`;
 const $=s=>ui.querySelector(s);const style=document.createElement('style');document.documentElement.append(style);const key='bili-dual-native-v2';try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const id of ['mx','my','sx','sy','font'])if(saved[id])$('#'+id).value=saved[id];}catch{}
 const apply=()=>{const enabled=$('#enabled').checked;style.textContent=enabled?`.bili-subtitle-x-subtitle-panel-position,.bili-subtitle-x-subtitle-panel-wrap{position:static!important;transform:none!important}.bili-subtitle-x-subtitle-panel-major-group,.bili-subtitle-x-subtitle-panel-minor-group{position:absolute!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:max-content!important;max-width:90%!important;pointer-events:auto!important;cursor:move!important}.bili-subtitle-x-subtitle-panel-major-group{left:${$('#mx').value}%!important;top:${$('#my').value}%!important}.bili-subtitle-x-subtitle-panel-minor-group{left:${$('#sx').value}%!important;top:${$('#sy').value}%!important}.bili-subtitle-x-subtitle-panel-text{font-size:${$('#font').value}px!important}`:'';const values={};for(const id of ['mx','my','sx','sy','font'])values[id]=$('#'+id).value;try{localStorage.setItem(key,JSON.stringify(values));}catch{}};
 ui.addEventListener('input',apply);$('#reset').onclick=()=>{$('#enabled').checked=false;apply();};
 document.addEventListener('pointerdown',e=>{if(!$('#enabled').checked)return;const el=e.target.closest?.('.bili-subtitle-x-subtitle-panel-major-group,.bili-subtitle-x-subtitle-panel-minor-group');if(!el)return;const panel=el.closest('.bili-subtitle-x-subtitle-panel');if(!panel)return;const r=panel.getBoundingClientRect(),prefix=el.classList.contains('bili-subtitle-x-subtitle-panel-major-group')?'m':'s';el.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();const move=e=>{$('#'+prefix+'x').value=Math.max(5,Math.min(95,(e.clientX-r.left)/r.width*100));$('#'+prefix+'y').value=Math.max(5,Math.min(95,(e.clientY-r.top)/r.height*100));apply();};const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);};el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);},true);
 let lastPath=location.pathname;document.addEventListener('bili-dual-data',e=>{try{const m=JSON.parse(e.detail);if(m.page!==location.pathname)return;if(m.type==='languages')$('#audio').textContent='官方可选配音：'+m.data.map(x=>x.title).join('、');if(m.type==='play'){$('#audio').textContent=m.data.language?`检测到配音语言：${m.data.language}；制作类型 ${m.data.production}；${m.data.audio.length} 个音质版本`:`当前响应没有配音语言标记；${m.data.audio.length} 个音质版本不能作为多语言音轨。`;}if(m.type==='subtitles')$('#info').textContent='当前字幕：'+m.data.map(s=>s.label||s.language).join('、');}catch{}});
 document.dispatchEvent(new Event('bili-dual-ready'));
 setInterval(()=>{const items=Array.from(document.querySelectorAll('.bpx-player-ctrl-translation-language-item'));if(items.length){const active=items.find(x=>x.classList.contains('bpx-state-active'));$('#audio').textContent=`官方配音：${items.map(x=>x.textContent.trim()).join(' / ')}；当前：${active?.textContent.trim()||'中文原声'}。左右耳同时播放尚待接通。`;}},1000);
 setInterval(()=>{const v=document.querySelector('video'),major=document.querySelector('.bili-subtitle-x-subtitle-panel-major-group'),minor=document.querySelector('.bili-subtitle-x-subtitle-panel-minor-group');$('#info').textContent=`播放器 ${v?Math.round(v.currentTime)+' / '+Math.round(v.duration||0)+' 秒':'未就绪'} · 原生主/副字幕 ${major?'有':'无'}/${minor?'有':'无'}`;if(location.pathname!==lastPath){lastPath=location.pathname;$('#audio').textContent='视频已切换，等待新的配音数据';}},1000);
 document.addEventListener('fullscreenchange',()=>{if(!host.dataset.playerIntegrated)(document.fullscreenElement||document.documentElement).append(host);});
})();
(()=>{
 const host=document.getElementById('bili-dual-native');if(!host)return;const ui=host.shadowRoot,$=s=>ui.querySelector(s),section=$('section');
 $('h3').textContent='字幕与声音';$('#audio').hidden=true;
 const intro=section.querySelector('small');intro.textContent='字幕位置自动保存，单语和双语分别记忆。拖动字幕也能调整。';
 const header=document.createElement('div');header.innerHTML='<button id="collapse" aria-label="收起字幕与声音面板">收起面板 ▾</button>';section.prepend(header);
 const launcher=document.createElement('button');launcher.id='launcher';launcher.textContent='字幕与声音';launcher.hidden=true;launcher.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483647;box-shadow:0 4px 20px #0005';ui.append(launcher);
 const storageKey='bili-dual-preferences-v4',fields=['mx','my','sx','sy','font'];const standard=()=>({mx:50,my:78,sx:50,sy:88,font:26,enabled:true});let state={mode:'dual',pair:'en',single:'zh',collapsed:false,layouts:{dual:standard(),single:{...standard(),my:88}}};try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){state={...state,...saved,layouts:{dual:{...state.layouts.dual,...saved.layouts?.dual},single:{...state.layouts.single,...saved.layouts?.single}}};}else{const old=JSON.parse(localStorage.getItem('bili-dual-native-v2')||'null');if(old)Object.assign(state.layouts.dual,old);}}catch{}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}};
 function collapse(value){state.collapsed=value;section.hidden=value;launcher.hidden=!value;save();}$('#collapse').onclick=()=>collapse(true);launcher.onclick=()=>collapse(false);collapse(state.collapsed);
 document.addEventListener('pointerdown',e=>{if(section.hidden)return;const path=e.composedPath();if(path.includes(section)||path.includes(launcher)||path.some(el=>el.id==='bili-language-player-button'||el.id==='bili-language-external-button'))return;collapse(true);},true);
 const prefs=document.createElement('div');prefs.innerHTML='<label>默认字幕<select id="subtitle-mode"><option value="dual">优先双语，缺少时自动回退单语</option><option value="single">单语</option></select></label><label>双语字幕组合<select id="subtitle-pair"><option value="en">中文 + English</option><option value="ja">中文 + 日本語</option></select></label><label>单语字幕语言<select id="subtitle-single"><option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option></select></label><small id="profile-label"></small>';intro.after(prefs);
 for(const k of ['mode','pair','single'])$('#subtitle-'+k).value=state[k];
 let profile='dual',loading=false,manual=null,page=location.pathname+location.search,signature='',attempt=0,last=0;
 function load(next){loading=true;profile=next;const p=state.layouts[next];for(const f of fields){$('#'+f).value=p[f];$('#'+f).dispatchEvent(new Event('input',{bubbles:true}));}$('#enabled').checked=p.enabled;$('#enabled').dispatchEvent(new Event('input',{bubbles:true}));$('#profile-label').textContent='当前布局：'+(next==='dual'?'双语（主副字幕独立定位）':'单语');for(const f of ['sx','sy'])$('#'+f).closest('label').hidden=next==='single';loading=false;}
 ui.addEventListener('input',e=>{if(loading||!fields.concat('enabled').includes(e.target.id))return;const p=state.layouts[profile];for(const f of fields)p[f]=$('#'+f).value;p.enabled=$('#enabled').checked;save();});
 for(const k of ['mode','pair','single'])$('#subtitle-'+k).onchange=()=>{state[k]=$('#subtitle-'+k).value;manual=null;signature='';save();tick();};
 $('#reset').textContent='恢复当前布局默认位置';$('#reset').onclick=()=>{state.layouts[profile]={...standard(),my:profile==='single'?88:78};save();load(profile);};
 const language=e=>(e.getAttribute('data-lan')||'').replace(/^ai-/,'');const active=e=>e?.classList.contains('bpx-state-active');
 const pick=(items,l)=>items.find(e=>language(e)===l&&!e.getAttribute('data-lan').startsWith('ai-'))||items.find(e=>language(e)===l);
 function tick(){if(host.dataset.tray)return;const now=location.pathname+location.search;if(now!==page){page=now;manual=null;signature='';}const major=[...document.querySelectorAll('.bpx-player-ctrl-subtitle-major .bpx-player-ctrl-subtitle-language-item')],minor=[...document.querySelectorAll('.bpx-player-ctrl-subtitle-minor .bpx-player-ctrl-subtitle-language-item')];if(!major.length){$('#profile-label').textContent='此片暂无字幕，保留默认组合和布局';return;}const desired=manual||state.mode,first=pick(major,desired==='dual'?'zh':state.single)||pick(major,'zh')||major[0],second=pick(minor,state.pair),dual=desired==='dual'&&language(first)==='zh'&&!!second,next=dual?'dual':'single';if(profile!==next)load(next);const key=now+'|'+major.map(e=>e.dataset.lan).join()+'|'+minor.map(e=>e.dataset.lan).join()+'|'+desired+state.pair+state.single;if(key!==signature){signature=key;attempt=0;last=0;}const switches=[...document.querySelectorAll('[class*="subtitle-bilingual"] input')],toggle=switches.find(e=>getComputedStyle(e.closest('[class*="subtitle-bilingual"]')).display!=='none')||switches[0];$('#profile-label').textContent='当前布局：'+(dual?'双语 中文 + '+(state.pair==='en'?'English':'日本語'):'单语 '+first.textContent.trim())+(state.mode==='dual'&&!dual?'（本片自动回退）':'');if(attempt>=10||Date.now()-last<1000)return;if(active(first)&&(!toggle||toggle.checked===dual)&&(!dual||active(second)))return;attempt++;last=Date.now();if(!active(first)){first.click();return;}if(toggle&&toggle.checked!==dual){toggle.click();return;}if(dual&&!active(second))second.click();}
 document.addEventListener('change',e=>{if(e.isTrusted&&e.target.matches?.('[class*="subtitle-bilingual"] input')){manual=e.target.checked?'dual':'single';signature='';}},true);
 load(state.mode==='single'?'single':'dual');setInterval(tick,650);
})();


(()=>{
 const host=document.getElementById('bili-dual-native');if(!host||host.dataset.tray)return;host.dataset.tray='1';const ui=host.shadowRoot,section=ui.querySelector('section'),key='bili-dual-subtitle-tray-v5';let config={centered:true,selected:['zh','en'],positions:{single:{},multi:{}}};try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.selected&&Array.isArray(saved.selected))config={...config,...saved,positions:{single:{},multi:{},...saved.positions}};}catch{}
 config.selected=[...new Set(config.selected.filter(x=>typeof x==='string'&&/^[\w-]{1,30}$/.test(x)))];const save=()=>{try{localStorage.setItem(key,JSON.stringify(config));localStorage.setItem('bili-subtitle-author-positions-v1',JSON.stringify(authorPositions));}catch{}};let authorPositions={};try{const saved=JSON.parse(localStorage.getItem('bili-subtitle-author-positions-v1')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))authorPositions=saved;}catch{}let currentAuthor='',authorPage='';const fontControl=ui.querySelector('#font');
 const defaultFont=Number(fontControl.value)||26;
 const authorKey=()=>currentAuthor||'video:'+(location.pathname.match(/\/video\/(BV[\w]+)/)?.[1]||location.pathname);
 const authorStyle=()=>authorPositions[authorKey()]||{};
 const styleFor=()=>({...config.style,...authorStyle()});
 const languageFonts=()=>({...config.style?.fonts,...authorStyle().fonts});
 const subtitleFont=language=>languageFonts()[language.split('-')[0]]||Number(fontControl.value)||defaultFont;
 const gapKey='bili-video-subtitle-line-gap';
 const validGap=value=>Number.isInteger(value)&&value>=0&&value<=24;
 let lineGap=Number(localStorage.getItem(gapKey));
 if(!validGap(lineGap))lineGap=0;
 globalThis.BiliSubtitleFonts={
  size:subtitleFont,
  set(language,value){editAuthor({fonts:{...authorStyle().fonts,[language]:value}});refreshStyle();},
  gap:()=>lineGap,
  setGap(value){
   if(!validGap(value))return;
   lineGap=value;
   overlay.style.setProperty('--bili-subtitle-line-gap',value+'px');
   localStorage.setItem(gapKey,String(value));
  }
 };
 const centered=()=>styleFor().centered??(config.centered!==false);
 const positionFor=(mode,language)=>authorStyle()[mode]?.[language]||config.positions[mode]?.[language];
 function editAuthor(changes){authorPositions[authorKey()]={...authorStyle(),...changes};save();}
 const norm=s=>s.replace(/^ai-/,'');
 const labels={zh:'中文',en:'English',ja:'日本語'};const tray=document.createElement('div');tray.innerHTML='<style>.language-bar{display:flex;flex-wrap:wrap;gap:7px;min-height:42px;margin:8px 0;padding:10px;border:1px dashed #79c9b8;border-radius:9px;background:#091825}.language-chip{display:flex;align-items:center;gap:5px;cursor:grab}.language-chip button{padding:3px 6px}.tray-note{font-size:12px;color:#a9bfd2}</style><h4>字幕语言</h4><small id="tray-count">正在读取本片字幕…</small><div id="language-pool" class="language-bar" aria-label="可用字幕语言"></div><b>已开启字幕（拖入开启，拖动排序）</b><div id="language-selected" class="language-bar" aria-label="已开启字幕"></div><p class="tray-note">拖回上方或点 × 关闭。也可以点击语言添加。组合会自动保存。</p><small id="tray-status"></small><button id="tray-retry" hidden>重试字幕加载</button>';section.querySelector('h3').after(tray);
 const centerLabel=document.createElement('label'),centerSwitch=document.createElement('input');centerSwitch.type='checkbox';centerSwitch.id='subtitle-centered';centerSwitch.checked=centered();centerLabel.append(centerSwitch,' 字幕水平居中（拖动时只调整高度）');tray.append(centerLabel);centerSwitch.onchange=()=>{editAuthor({centered:centerSwitch.checked});};
 const saveDefault=document.createElement('button');
 saveDefault.type='button';saveDefault.textContent='保存为默认字幕样式';
 const scopeLabel=document.createElement('small');scopeLabel.setAttribute('role','status');
 tray.append(saveDefault,scopeLabel);
 function refreshStyle(){
  centerSwitch.checked=centered();
  fontControl.value=String(styleFor().font||defaultFont);
  scopeLabel.textContent=currentAuthor?(authorPositions[currentAuthor]?'当前使用此 UP 主的字幕设置':'当前使用默认字幕样式'):'字幕设置会在识别到 UP 主后关联';
  document.dispatchEvent(new Event('bili-dual-caption-style-changed'));
 }
 fontControl.addEventListener('input',event=>{event.stopPropagation();editAuthor({font:Number(fontControl.value)||defaultFont});refreshStyle();});
 saveDefault.onclick=()=>{
  const style=authorStyle();
  config.style={centered:centered(),font:Number(fontControl.value)||defaultFont,fonts:languageFonts()};
  config.positions={single:{...config.positions.single,...style.single},multi:{...config.positions.multi,...style.multi}};
  save();
  scopeLabel.textContent='默认字幕样式已保存';
 };
 const $=s=>tray.querySelector(s),pool=$('#language-pool'),selected=$('#language-selected');let catalog=[],bodies=new Map(),requested=new Set(),errors=new Map(),page=location.pathname,subtitleRoute=location.pathname+'?p='+(new URL(location.href).searchParams.get('p')||'1'),subtitleMedia='',dragLanguage=null;
 // The tray owns language selection. Hide the old two-language selectors.
 for(const id of ['subtitle-mode','subtitle-pair','subtitle-single'])ui.querySelector('#'+id)?.closest('label')?.setAttribute('hidden','');
 const overlay=document.createElement('div');overlay.id='bili-dual-subtitle-overlay';overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden';const shadow=overlay.attachShadow({mode:'open'});shadow.innerHTML=`
  <style>
   .cue,.cue-backdrop{position:absolute;transform:translate(-50%,-50%);text-align:center;max-width:90%;width:max-content;white-space:pre-line;padding:.15em .38em;border-radius:.2em;line-height:1.12;font-family:system-ui}
   .cue{color:white;text-shadow:0 1px 3px #000;pointer-events:auto;cursor:move;touch-action:none}
   /* Composite the opaque shapes together, then apply the original #0008 alpha once. */
   #cue-backdrops{position:absolute;inset:0;opacity:calc(8 / 15);pointer-events:none;user-select:none}
   .cue-backdrop{background:black;color:transparent}
   .cue-backdrop::before{content:attr(data-text)}
   .cue[hidden],.cue-backdrop[hidden]{display:none}
  </style>
  <div id="cue-backdrops" aria-hidden="true"></div>
 `;
 const backdropLayer=shadow.getElementById('cue-backdrops'),nodes=new Map();const hideNative=document.createElement('style');document.documentElement.append(hideNative);
 overlay.style.setProperty('--bili-subtitle-line-gap',lineGap+'px');
 // A subtitle drag owns its release and generated click, even across Shadow DOM.
 let activeSubtitleDrag=null,subtitleRelease=null;
 const stopSubtitleInput=e=>{if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();};
 document.addEventListener('pointerdown',()=>{subtitleRelease=null;},true);
 for(const type of ['pointermove','pointerup','pointercancel'])document.addEventListener(type,e=>{
  const drag=activeSubtitleDrag;if(!drag||e.pointerId!==drag.pointerId)return;
  stopSubtitleInput(e);if(type==='pointermove')drag.move(e);else drag.up(e);
 },true);
 for(const type of ['mousedown','mouseup','click','dblclick'])document.addEventListener(type,e=>{
  const onSubtitle=e.composedPath().includes(overlay)&&!e.composedPath().includes(review),release=subtitleRelease;
  const releasedHere=release&&performance.now()<release.until&&Math.abs(e.clientX-release.x)<5&&Math.abs(e.clientY-release.y)<5&&(e.pointerId==null||e.pointerId===release.pointerId);
  if(onSubtitle||releasedHere)stopSubtitleInput(e);
 },true);
 let pictureOffset=0,pictureFraction=1;
 function attach(){
  const video=[...document.querySelectorAll('video')].find(v=>v.offsetWidth>0);
  if(!video)return null;
  const portrait=video.videoWidth>0&&video.videoHeight>video.videoWidth;
  const parent=(portrait&&video.closest('.bpx-player-video-area'))||video.parentElement;
  if(getComputedStyle(parent).position==='static')parent.style.position='relative';
  if(overlay.parentElement!==parent)parent.append(overlay);
  const vr=video.getBoundingClientRect(),pr=parent.getBoundingClientRect();
  const scaleX=pr.width/(parent.offsetWidth||pr.width)||1;
  const scaleY=pr.height/(parent.offsetHeight||pr.height)||1;
  let width=vr.width,height=vr.height;
  const fit=getComputedStyle(video).objectFit;
  if(video.videoWidth&&video.videoHeight&&fit!=='fill'&&fit!=='cover'){
   const ratio=Math.min(width/video.videoWidth,height/video.videoHeight);
   width=video.videoWidth*ratio;height=video.videoHeight*ratio;
  }
  const pictureLeft=vr.left+(vr.width-width)/2;
  const expand=portrait&&pr.width>width&&pictureLeft>=pr.left-1&&pictureLeft+width<=pr.right+1;
  const overlayLeft=expand?pr.left:pictureLeft;
  const overlayWidth=expand?pr.width:width;
  pictureOffset=overlayWidth?(pictureLeft-overlayLeft)/overlayWidth:0;
  pictureFraction=overlayWidth?width/overlayWidth:1;
  const rightBar=(overlayWidth-(pictureLeft-overlayLeft)-width)/scaleX;
  const reviewSpace=rightBar-(overlayWidth/scaleX)*.02-12;
  const reviewWidth=expand&&reviewSpace>=220?Math.min(reviewSpace,640)+'px':'min(90%, max(220px, 34%))';
  if(overlay.style.getPropertyValue('--subtitle-review-width')!==reviewWidth){
   overlay.style.setProperty('--subtitle-review-width',reviewWidth);
  }
  const fontScale=portrait?(height/scaleY)/450:(width/scaleX)/800;
  overlay.dataset.fontScale=String(Number.isFinite(fontScale)&&fontScale>0?fontScale:1);
  Object.assign(overlay.style,{
   inset:'auto',
   left:(overlayLeft-pr.left)/scaleX+'px',
   top:(vr.top-pr.top+(vr.height-height)/2)/scaleY+'px',
   width:overlayWidth/scaleX+'px',
   height:height/scaleY+'px'
  });
  return video;
 }
 function pictureRect(){
  const box=overlay.getBoundingClientRect();
  return {left:box.left+box.width*pictureOffset,top:box.top,width:box.width*pictureFraction,height:box.height};
 }
 function placeCue({node,backdrop},pos){
  const x=pictureOffset*100+(centered()?50:pos.x)*pictureFraction;
  const maxWidth=pictureFraction<1?Math.max(10,Math.min(90,2*Math.min(x,100-x)-4))+'%':'';
  for(const el of [node,backdrop]){
   el.style.left=x+'%';
   el.style.top=pos.y+'%';
   el.style.maxWidth=maxWidth;
  }
 }
 let reviewPrefs={opacity:75,seconds:5};try{const v=JSON.parse(localStorage.getItem('bili-subtitle-review-v1')||'{}');if(Number.isFinite(v.opacity))reviewPrefs.opacity=Math.max(10,Math.min(100,v.opacity));if(Number.isFinite(v.seconds))reviewPrefs.seconds=Math.max(1,Math.min(60,v.seconds));}catch{}
 const review=document.createElement('aside');review.id='subtitle-review';review.hidden=true;review.style.cssText='position:absolute;right:2%;top:8%;width:var(--subtitle-review-width,34%);max-height:76%;overflow:auto;overflow-wrap:anywhere;box-sizing:border-box;padding:13px;border:1px solid #486073;border-radius:12px;color:#edf4fb;box-shadow:0 12px 32px #0006;font:clamp(12px,1.25vw,19px)/1.5 Inter,system-ui;pointer-events:auto;touch-action:none;user-select:text;z-index:2';shadow.append(review);
 const reviewStyle=document.createElement('style');reviewStyle.textContent='#subtitle-review[hidden]{display:none}#subtitle-review button{background:#17232f;color:#edf4fb;border:1px solid #405365;border-radius:7px;padding:3px 8px;cursor:pointer;font:inherit}#subtitle-review .near{opacity:.55;margin:8px 0;font-size:.85em}#subtitle-review .current{border-left:2px solid #83ebce;background:#0c141e55;border-radius:0 7px 7px 0;padding:5px 9px;margin:10px 0}#subtitle-review :is(.near,.current){display:grid;row-gap:var(--bili-subtitle-line-gap,0px)}#subtitle-review .review-kana{display:block;background:none;border:0;padding:0;text-align:left;font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;color:inherit}#subtitle-review .review-kana:hover{text-decoration:underline dotted}';shadow.append(reviewStyle);
 const reviewSettings=document.createElement('fieldset');reviewSettings.style.cssText='border:1px solid #ffffff30;border-radius:6px;margin:10px 0;padding:8px';reviewSettings.innerHTML='<legend>字幕回看</legend><small>点击画面字幕打开；滚轮或上下拖动查看前后句。</small><label>面板不透明度 <input id="review-opacity" type="range" min="10" max="100" step="5"><output id="review-opacity-value"></output></label><label>无操作隐藏（秒）<input id="review-seconds" type="number" min="1" max="60" step="1" style="width:55px"></label>';tray.append(reviewSettings);
 let reviewTime=0,reviewTimer=null,reviewHeld=false,reviewStamp=-1,reviewRows;
 const timelines=new Map();
 const trackCues=l=>bodies.get(item(l)?.language);
 function cueSpans(cues,index){
  const first=cues[index],spans=[];
  for(let end=index;end<cues.length&&end<index+3;end++){
   if(end>index&&cues[end].from-cues[end-1].to>.55)break;
   spans.push({from:first.from,to:cues[end].to,count:end-index+1});
  }
  return spans;
 }
 function matchSpans(left,right){
  let best=null;
  for(const a of left)for(const b of right){
   if(a.count>1&&b.count>1)continue;
   const span=Math.max(a.to,b.to)-Math.min(a.from,b.from);
   const shared=Math.min(a.to,b.to)-Math.max(a.from,b.from);
   const startGap=Math.abs(a.from-b.from),endGap=Math.abs(a.to-b.to);
   const tolerance=Math.min(.85,Math.max(.35,span*.25));
   if(shared<=0||shared/span<.55||startGap>tolerance||endGap>tolerance)continue;
   const score=(startGap+endGap)/span+(a.count+b.count-2)*.08;
   if(!best||score<best.score)best={a,b,score};
  }
  return best;
 }
 function mergeCues(groups,cues,language){
  const result=[];
  let i=0,j=0;
  while(i<groups.length&&j<cues.length){
   const a=groups[i],b=cues[j];
   const match=matchSpans(cueSpans(groups,i),cueSpans(cues,j));
   if(!match){
    if(a.from<=b.from){result.push(a);i++;}
    else{result.push({from:b.from,to:b.to,texts:{[language]:b.content}});j++;}
    continue;
   }
   const texts={};
   for(const group of groups.slice(i,i+match.a.count)){
    for(const [lang,content] of Object.entries(group.texts))texts[lang]=texts[lang]?texts[lang]+'\n'+content:content;
   }
   texts[language]=cues.slice(j,j+match.b.count).map(cue=>cue.content).join('\n');
   // Use the reference track's outer boundaries for all matched translations.
   result.push({from:match.a.from,to:match.a.to,texts});
   i+=match.a.count;j+=match.b.count;
  }
  return result.concat(groups.slice(i),cues.slice(j).map(c=>({from:c.from,to:c.to,texts:{[language]:c.content}}))).sort((a,b)=>a.from-b.from);
 }
 function timelineFor(languages){
  const order=['zh','en','ja',...languages.filter(l=>!['zh','en','ja'].includes(l))].filter(l=>languages.includes(l));
  const key=order.join(','),tracks=order.map(trackCues),cached=timelines.get(key);
  if(cached&&tracks.every((track,i)=>track===cached.tracks[i]))return cached;
  let rows=[];
  for(let i=0;i<order.length;i++)if(tracks[i]?.length)rows=mergeCues(rows,tracks[i],order[i]);
  let maxEnd=0;
  for(const row of rows){maxEnd=Math.max(maxEnd,row.to);row.maxEnd=maxEnd;}
  const timeline={tracks,rows};
  timelines.set(key,timeline);
  return timeline;
 }
 const reviewTimeline=()=>timelineFor(['en','ja']);
 function subtitleTexts(rows,time){
  let lo=0,hi=rows.length;
  while(lo<hi){
   const middle=(lo+hi)>>1;
   if(rows[middle].from<=time)lo=middle+1;
   else hi=middle;
  }
  const texts={};
  for(let i=lo-1;i>=0&&rows[i].maxEnd>time;i--){
   if(rows[i].to<=time)continue;
   for(const [language,text] of Object.entries(rows[i].texts))texts[language]=texts[language]?text+'\n'+texts[language]:text;
  }
  return texts;
 }
 function armReview(){clearTimeout(reviewTimer);if(!reviewHeld)reviewTimer=setTimeout(()=>{if(review.querySelector('.review-kana[aria-busy=true]'))armReview();else review.hidden=true;},reviewPrefs.seconds*1000);}
 function reviewIndex(cues){let i=cues.findIndex(c=>c.to>reviewTime);return i<0?Math.max(0,cues.length-1):i;}
 function reviewJapanese(element,text){
  const button=document.createElement('button');
  button.type='button';
  button.className='review-kana';
  button.textContent=text;
  button.title='点击显示假名，再点恢复';
  button.setAttribute('aria-pressed','false');
  let annotated=null,busy=false;
  button.onclick=async event=>{
   if((event.detail&&reviewGestureMoved)||busy)return;
   armReview();
   if(button.getAttribute('aria-pressed')==='true'){
    button.textContent=text;
    button.setAttribute('aria-pressed','false');
    button.title='点击显示假名，再点恢复';
    return;
   }
   busy=true;
   button.setAttribute('aria-busy','true');
   try{
    annotated??=await BiliKana.annotate(text);
    if(!button.isConnected||review.hidden)return;
    button.textContent=annotated;
    button.setAttribute('aria-pressed','true');
    button.title='点击恢复原文';
    armReview();
   }catch{
    button.title='假名加载失败，点击重试';
   }finally{
    busy=false;
    button.removeAttribute('aria-busy');
   }
  };
  element.append(button);
 }
 function paintReview(){review.style.background='rgba(16,25,35,'+reviewPrefs.opacity/100+')';const {rows:cues}=reviewTimeline(),i=reviewIndex(cues);if(cues===reviewRows&&i===reviewStamp)return;reviewRows=cues;reviewStamp=i;review.replaceChildren();const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;align-items:center';const title=document.createElement('span');title.textContent='字幕回看';const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭字幕回看');close.onclick=()=>{review.hidden=true;};head.append(title,close);review.append(head);if(!cues.length){const msg=document.createElement('p');msg.textContent='正在读取本片英日字幕…';review.append(msg);return;}for(const n of [i-1,i,i+1]){if(!cues[n])continue;const row=document.createElement('div');row.className=n===i?'current':'near';row.dataset.index=n;for(const l of ['en','ja']){if(!item(l))continue;const text=cues[n].texts[l],el=document.createElement('div');el.lang=l;if(l==='ja'&&/[\u3400-\u9fff々]/u.test(text))reviewJapanese(el,text);else el.textContent=text||'（此时没有对应字幕）';row.append(el);}review.append(row);}const foot=document.createElement('div');foot.style.cssText='display:flex;justify-content:space-between';for(const [label,delta]of [['上一句',-1],['下一句',1]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>stepReview(delta);foot.append(b);}review.append(foot);}
 function stepReview(delta){const {rows:cues}=reviewTimeline();if(cues.length){const i=Math.max(0,Math.min(cues.length-1,reviewIndex(cues)+delta));reviewTime=cues[i].from+.001;paintReview();}armReview();}
 function openReview(){reviewTime=document.querySelector('video')?.currentTime||0;reviewStamp=-1;review.hidden=false;for(const l of ['en','ja']){const it=item(l);if(it?.url&&!requested.has(it.language)){requested.add(it.language);document.dispatchEvent(new CustomEvent('bili-dual-load-subtitle',{detail:JSON.stringify({page:location.pathname,language:it.language})}));}}paintReview();armReview();}
 for(const [id,key]of [['review-opacity','opacity'],['review-seconds','seconds']]){const input=ui.querySelector('#'+id);input.value=reviewPrefs[key];input.oninput=()=>{const n=Number(input.value);if(!Number.isFinite(n))return;reviewPrefs[key]=Math.max(key==='opacity'?10:1,Math.min(key==='opacity'?100:60,n));ui.querySelector('#review-opacity-value').textContent=reviewPrefs.opacity+'%';try{localStorage.setItem('bili-subtitle-review-v1',JSON.stringify(reviewPrefs));}catch{}paintReview();if(!review.hidden)armReview();};}ui.querySelector('#review-opacity-value').textContent=reviewPrefs.opacity+'%';
 review.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(e.deltaY)stepReview(e.deltaY>0?1:-1);},{passive:false});
 let reviewDrag=null,reviewGestureMoved=false;
 review.addEventListener('pointerdown',e=>{
  e.stopPropagation();
  reviewHeld=true;
  reviewGestureMoved=false;
  clearTimeout(reviewTimer);
  const button=e.target.closest('button');
  if(e.button!==0||(button&&!button.matches('.review-kana')))return;
  reviewDrag={id:e.pointerId,x:e.clientX,startY:e.clientY,y:e.clientY};
  if(!button)review.setPointerCapture(e.pointerId);
 });
 review.addEventListener('pointermove',e=>{
  if(reviewDrag?.id===e.pointerId){
   if(Math.hypot(e.clientX-reviewDrag.x,e.clientY-reviewDrag.startY)>5)reviewGestureMoved=true;
   if(Math.abs(e.clientY-reviewDrag.y)>30){
    if(!review.hasPointerCapture(e.pointerId))review.setPointerCapture(e.pointerId);
    stepReview(e.clientY>reviewDrag.y?1:-1);
    reviewDrag.y=e.clientY;
   }
  }
  armReview();
 });
 function endReviewDrag(){
  reviewDrag=null;
  reviewHeld=false;
  armReview();
 }
 for(const type of ['pointerup','pointercancel','lostpointercapture'])review.addEventListener(type,e=>{
  e.stopPropagation();
  endReviewDrag();
 });
 review.addEventListener('pointerleave',e=>{if(!review.hasPointerCapture(e.pointerId))endReviewDrag();});
 for(const type of ['click','dblclick','contextmenu'])review.addEventListener(type,e=>e.stopPropagation());
 review.addEventListener('pointerenter',armReview);


 const available=()=>config.selected.filter(l=>catalog.some(x=>norm(x.language)===l));
 function item(l){return catalog.find(x=>norm(x.language)===l&&!x.language.startsWith('ai-'))||catalog.find(x=>norm(x.language)===l);}
 function select(l){if(!config.selected.includes(l)){config.selected.push(l);save();draw();}}
 function remove(l){config.selected=config.selected.filter(x=>x!==l);save();draw();}
 function draw(){pool.replaceChildren();selected.replaceChildren();const langs=[...new Set(catalog.map(x=>norm(x.language)))];$('#tray-count').textContent=`本片共 ${langs.length} 种字幕 · 已选 ${available().length} 种`;
 for(const l of langs){const b=document.createElement('button');b.textContent=labels[l]||item(l)?.label||l;b.draggable=true;b.className='language-chip';b.dataset.language=l;b.onclick=()=>select(l);b.ondragstart=e=>{dragLanguage=l;e.dataTransfer.setData('text/plain',l);};pool.append(b);}
 for(const l of config.selected){const chip=document.createElement('span');chip.className='language-chip';chip.draggable=true;chip.dataset.language=l;chip.style.opacity=langs.includes(l)?'1':'.5';const label=document.createElement('span');label.textContent=(labels[l]||l)+(langs.includes(l)?'':'（本片暂无）');const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','移除'+(labels[l]||l));close.onclick=()=>remove(l);chip.append(label,close);chip.ondragstart=e=>{dragLanguage=l;e.dataTransfer.setData('text/plain',l);};chip.ondragover=e=>e.preventDefault();chip.ondrop=e=>{e.preventDefault();e.stopPropagation();const source=e.dataTransfer.getData('text/plain')||dragLanguage;if(!source||source===l)return;config.selected=config.selected.filter(x=>x!==source);config.selected.splice(config.selected.indexOf(l),0,source);save();draw();};selected.append(chip);}
 if(!config.selected.length){const t=document.createElement('small');t.textContent='拖入语言开启字幕';selected.append(t);}request();
 }
 selected.ondragover=pool.ondragover=e=>e.preventDefault();selected.ondrop=e=>{e.preventDefault();const l=e.dataTransfer.getData('text/plain')||dragLanguage;if(l&&catalog.some(x=>norm(x.language)===l))select(l);};pool.ondrop=e=>{e.preventDefault();const l=e.dataTransfer.getData('text/plain')||dragLanguage;if(l)remove(l);};
 function request(){for(const l of available()){const s=item(l);if(!s?.url||requested.has(s.language))continue;requested.add(s.language);document.dispatchEvent(new CustomEvent('bili-dual-load-subtitle',{detail:JSON.stringify({page:location.pathname,language:s.language})}));}}
 $('#tray-retry').onclick=()=>{requested.clear();errors.clear();request();};
 document.addEventListener('bili-dual-reset-subtitle-positions',()=>{const mode=available().length>1?'multi':'single';const entry=authorPositions[authorKey()];if(entry)delete entry[mode];save();});
 function resetSubtitleSession(){page=location.pathname;subtitleRoute=location.pathname+'?p='+(new URL(location.href).searchParams.get('p')||'1');catalog=[];bodies.clear();timelines.clear();requested.clear();errors.clear();review.hidden=true;for(const pair of nodes.values())setCueText(pair,'');draw();}
 document.addEventListener('bili-dual-data',e=>{try{const m=JSON.parse(e.detail);if(m.page!==location.pathname)return;const routeNow=location.pathname+'?p='+(new URL(location.href).searchParams.get('p')||'1');if(m.route&&m.route!==routeNow)return;if(subtitleRoute!==routeNow)resetSubtitleSession();if(m.type==='media-reset'){subtitleMedia='';resetSubtitleSession();}if(m.type==='media'&&m.mediaKey&&subtitleMedia!==m.mediaKey){subtitleMedia=m.mediaKey;resetSubtitleSession();}if(m.type==='media-reset'){currentAuthor='';authorPage='';refreshStyle();}if(m.type==='media'){const id=String(m.data.ownerId||'');const fallback='video:'+(location.pathname.match(/\/video\/(BV[\w]+)/)?.[1]||location.pathname);if(/^\d+$/.test(id)){
 const pending=authorPositions[fallback],previous=authorPositions[id]||{};
 if(pending){authorPositions[id]={...previous,...pending,single:{...previous.single,...pending.single},multi:{...previous.multi,...pending.multi}};delete authorPositions[fallback];save();}
 currentAuthor=id;
 }else if(authorPage!==location.pathname)currentAuthor='';
 authorPage=location.pathname;refreshStyle();}if(m.type==='subtitles'){catalog=m.data.filter(x=>typeof x.language==='string');draw();}if(m.type==='subtitle-body'){const cues=m.data.body.filter(x=>Number.isFinite(x.from)&&Number.isFinite(x.to)&&x.to>x.from&&typeof x.content==='string').sort((a,b)=>a.from-b.from);bodies.set(m.data.language,cues);errors.delete(m.data.language);}if(m.type==='subtitle-error')errors.set(m.data.language,m.data.message);}catch{}});
 function setCueText({node,backdrop},text){
  if(node.textContent!==text){
   node.textContent=text;
   backdrop.dataset.text=text;
  }
  node.hidden=backdrop.hidden=!text;
 }
 function positionNode(l){
  let pair=nodes.get(l);
  if(!pair){
   const node=document.createElement('div'),backdrop=document.createElement('div');
   node.className='cue';
   node.dataset.language=l;
   backdrop.className='cue-backdrop';
   node.hidden=backdrop.hidden=true;
   backdropLayer.append(backdrop);
   shadow.append(node);
   pair={node,backdrop};
   nodes.set(l,pair);
   node.onpointerdown=e=>{if(e.button!==0||e.isPrimary===false)return;const startX=e.clientX,startY=e.clientY;let moved=false;const r=pictureRect(),mode=available().length>1?'multi':'single',ownerAtStart=currentAuthor,routeAtStart=location.pathname+location.search,grabX=e.clientX-node.getBoundingClientRect().left-node.getBoundingClientRect().width/2,grabY=e.clientY-r.top-parseFloat(node.style.top)/100*r.height;node.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();const move=e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>5)moved=true;if(!moved)return;const pos={x:centered()?(positionFor(mode,l)?.x||50):Math.max(5,Math.min(95,(e.clientX-grabX-r.left)/r.width*100)),y:Math.max(5,Math.min(95,(e.clientY-grabY-r.top)/r.height*100))};if(ownerAtStart!==currentAuthor||routeAtStart!==location.pathname+location.search)return;editAuthor({[mode]:{...authorStyle()[mode],[l]:pos}});placeCue(pair,pos);};const up=e=>{if(e.type!=='pointercancel'&&!moved&&Math.hypot(e.clientX-startX,e.clientY-startY)<=5)openReview();subtitleRelease={pointerId:e.pointerId,x:e.clientX,y:e.clientY,until:performance.now()+500};activeSubtitleDrag=null;node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);};activeSubtitleDrag={pointerId:e.pointerId,move,up};node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up);};}
  const fontSize=(subtitleFont(norm(l))*(Number(overlay.dataset.fontScale)||1))+'px';
  pair.node.style.fontSize=pair.backdrop.style.fontSize=fontSize;
  return pair;
 }
 function stackCues(langs){
  const height=overlay.clientHeight;
  if(!height)return;
  const mode=langs.length>1?'multi':'single';
  let center=height*.88;
  let belowHeight=0;
  for(const [offset,language] of [...langs].reverse().entries()){
   const pair=nodes.get(language);
   const size=parseFloat(pair.node.style.fontSize);
   const cueHeight=pair.node.offsetHeight||size*1.42;
   if(offset)center-=lineGap+(cueHeight+belowHeight)/2;
   placeCue(pair,positionFor(mode,language)||{x:50,y:center/height*100});
   belowHeight=cueHeight;
  }
 }
 setInterval(()=>{if(subtitleRoute!==location.pathname+'?p='+(new URL(location.href).searchParams.get('p')||'1')){resetSubtitleSession();page=location.pathname;if(authorPage!==page){currentAuthor='';refreshStyle();}review.hidden=true;catalog=[];bodies.clear();timelines.clear();requested.clear();errors.clear();draw();}const video=attach();if(!review.hidden)paintReview();const langs=available(),ready=langs.length>0&&langs.every(l=>bodies.has(item(l).language));// The tray is an explicit allow-list, including while loading or unavailable.
 hideNative.textContent='.bpx-player-subtitle-wrap,.bili-subtitle-x-subtitle-panel{visibility:hidden!important}';for(const [language,pair] of nodes)if(!video||!ready||!langs.includes(language))setCueText(pair,'');if(video&&ready){
  const texts=subtitleTexts(timelineFor(langs).rows,video.currentTime);
  for(const language of langs)setCueText(positionNode(language),texts[language]||'');
  stackCues(langs);
 }$('#tray-retry').hidden=errors.size===0;$('#tray-status').textContent=errors.size?'所选字幕加载失败，可重试；不会替换为其他语言。':ready?`已开启 ${langs.length} 种字幕；拖动字幕可单独定位。`:!catalog.length?'等待播放器返回字幕列表…':!langs.length?'所选语言在本片不可用，偏好已保留。':'正在读取所选字幕…';},100);
 refreshStyle();document.dispatchEvent(new Event('bili-dual-ready'));draw();
})();

(()=>{
 const host=document.getElementById('bili-dual-native');if(!host)return;
 let hidden=false;
 function update(){if(host.dataset.playerIntegrated){host.style.removeProperty('display');return;}const full=Boolean(document.fullscreenElement||document.webkitFullscreenElement||document.querySelector('.bpx-player-container[data-screen="web"],.bpx-player-container[data-screen="full"]'));if(full===hidden)return;hidden=full;if(full)host.style.setProperty('display','none','important');else host.style.removeProperty('display');}
 new MutationObserver(update).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-screen']});
 document.addEventListener('fullscreenchange',update);document.addEventListener('webkitfullscreenchange',update);setInterval(update,500);update();
})();
