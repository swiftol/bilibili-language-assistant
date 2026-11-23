// Player controls share the existing subtitle/audio state; no second settings panel.
(()=>{
 const host=document.getElementById('bili-dual-native');if(!host)return;
 const root=host.shadowRoot,section=root.querySelector('section'),launcher=root.querySelector('#launcher');
 let player=null,button=null,previousStyle='',active=/\/(?:video|list)\//.test(location.pathname)?'subtitles':'fonts',syncSize=null;
 const css=`
 :host([data-player-integrated]){position:absolute!important;inset:0!important;z-index:100!important;pointer-events:none!important}
 section{box-sizing:border-box;height:var(--bili-panel-height,65vh);scrollbar-gutter:stable}
 :host([data-player-integrated]) section{position:absolute!important;right:12px!important;bottom:var(--bili-player-panel-bottom,58px)!important;left:auto!important;top:auto!important;width:min(365px,calc(100% - 24px))!important;max-width:calc(100% - 24px)!important;--bili-panel-height:calc(100% - var(--bili-player-panel-bottom,58px) - 20px);max-height:var(--bili-panel-height)!important;padding:14px!important;overflow:auto!important;pointer-events:auto!important;transform:none!important;touch-action:pan-y}
 :host([data-panel-dock=external]){position:fixed!important;inset:0!important;z-index:2147483646!important}
 :host([data-panel-dock=external]) section{position:fixed!important;right:16px!important;bottom:64px!important;width:min(432px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;--bili-panel-height:min(720px,calc(100dvh - 96px));max-height:var(--bili-panel-height)!important}
 :host([data-player-integrated]) #launcher,section[hidden],[data-player-pane][hidden],.bili-font-pixel-fields[hidden]{display:none!important}
 .language-bar{min-height:32px;margin:6px 0;padding:8px}.player-subtitle-help{line-height:1.5;color:#a9bfd2;margin:8px 0}
 `;
 function close(){if(!section.hidden)root.querySelector('#collapse')?.click();button?.setAttribute('aria-expanded','false');}
 function panes(){for(const pane of root.querySelectorAll('[data-player-pane]'))pane.hidden=pane.dataset.playerPane!==active;for(const tab of root.querySelectorAll('[data-player-tab]'))tab.setAttribute('aria-selected',String(tab.dataset.playerTab===active));}
 function selectPane(id){
  if(active!==id)section.scrollTop=0;
  active=id;
  panes();
  if(id==='favorites'){
   const settings=root.getElementById('favorite-wheel-settings');
   if(settings)settings.open=true;
  }
 }
 function decorate(){
  if(!root.querySelector('#bili-player-style')){const style=document.createElement('style');style.id='bili-player-style';style.textContent=css;root.append(style);}
  if(!root.querySelector('#player-language-tabs')){
   close();
   section.querySelector('h3').textContent='B站语言助手';
   const tabs=document.createElement('div');tabs.id='player-language-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','字幕与声音');
   for(const [id,label]of [['subtitles','设置'],['fonts','字体大小'],['audio','声音'],['favorites','收录仓夹']]){const tab=document.createElement('button');tab.textContent=label;tab.dataset.playerTab=id;tab.setAttribute('role','tab');tab.onclick=()=>selectPane(id);tabs.append(tab);}section.querySelector('h3').after(tabs);
   const subtitles=root.querySelector('#language-pool')?.parentElement,audio=root.querySelector('#dual-start')?.closest('div');
   if(subtitles)subtitles.dataset.playerPane='subtitles';if(audio){audio.dataset.playerPane='audio';audio.querySelector('hr')?.remove();}
   for(const id of ['enabled','mx','my','sx','sy','font'])root.querySelector('#'+id)?.closest('label')?.setAttribute('hidden','');
   root.querySelector('#profile-label')?.setAttribute('hidden','');section.setAttribute('role','dialog');section.setAttribute('aria-label','字幕与声音');
   for(const el of section.children){if(el.tagName==='SMALL'||el.id==='info')el.hidden=true;}
   const fonts=document.createElement('div');
   fonts.id='player-fonts-pane';
   fonts.dataset.playerPane='fonts';
   tabs.after(fonts);
   const tools=document.createElement('fieldset');
   tools.id='bili-subtitle-font-settings';
   tools.className='bili-font-card';
   const legend=document.createElement('legend');legend.textContent='视频字幕';
   tools.append(legend);
   const preview=document.createElement('div');preview.id='player-subtitle-preview';
   preview.setAttribute('aria-label','视频字幕字号预览');
   preview.className='bili-font-preview';
   tools.append(preview);
   const scale=()=>Number(document.getElementById('bili-dual-subtitle-overlay')?.dataset.fontScale)||1;
   const fields=document.createElement('div');fields.className='bili-font-pixel-fields';tools.append(fields);
   const controls=[];
   for(const [lang,name,sample] of [['zh','中文','这段字幕的大小'],['ja','日语','字幕の大きさ'],['en','英语','Subtitle size']]){
    const row=document.createElement('label'),input=document.createElement('input'),line=document.createElement('div');
    row.textContent=name+' ';
    input.id='player-subtitle-size-'+lang;input.type='number';input.min='1';input.max='200';input.step='1';
    input.setAttribute('aria-label',name+'视频字幕字号');
    line.lang=lang;line.textContent=sample;preview.append(line);row.append(input);fields.append(row);
    controls.push({lang,input,line});
    input.oninput=()=>{const value=input.valueAsNumber;if(value>=1&&value<=200){line.style.fontSize=value+'px';BiliSubtitleFonts.set(lang,value/scale());}};
    input.onblur=()=>syncSize();
   }
   const spacing=document.createElement('label'),gap=document.createElement('input');
   spacing.className='bili-font-range-gap';
   gap.type='range';gap.id='video-subtitle-line-gap';gap.min='0';gap.max='24';gap.step='1';
   gap.setAttribute('aria-label','视频字幕分行间距');
   spacing.title='用于自动排列的视频字幕和字幕回看。手动拖动的位置优先。';
   gap.value=String(BiliSubtitleFonts.gap());
   preview.style.display='grid';preview.style.lineHeight='1.12';
   const paintGap=()=>{preview.style.rowGap=gap.value+'px';};
   gap.oninput=()=>{paintGap();BiliSubtitleFonts.setGap(gap.valueAsNumber);};
   spacing.append('分行间距',gap);tools.append(spacing);paintGap();
   syncSize=()=>{
    for(const {lang,input,line} of controls){
     if(root.activeElement===input)continue;
     const value=Math.max(1,Math.round((globalThis.BiliSubtitleFonts?.size(lang)||26)*scale()));
     input.value=String(value);
     line.style.fontSize=value+'px';
    }
   };
   document.addEventListener('bili-dual-caption-style-changed',()=>{
    syncSize();
    globalThis.BiliPanelTheme?.paint(root);
   });
   fonts.append(tools);
   const reset=root.querySelector('#reset');
   if(reset){reset.textContent='重置字幕位置';reset.onclick=()=>document.dispatchEvent(new Event('bili-dual-reset-subtitle-positions'));subtitles?.querySelector('#subtitle-centered')?.parentElement.after(reset);}
   const hint=document.createElement('p');hint.className='player-subtitle-help';hint.textContent='直接拖动视频中的字幕调整位置，位置会自动保存；字幕随画面缩放。';subtitles?.append(hint);
   const header=document.createElement('div');header.id='bili-panel-header';
   const titleRow=root.getElementById('collapse').parentElement;titleRow.className='bili-panel-title';
   titleRow.prepend(section.querySelector('h3'));
   root.getElementById('collapse').textContent='收起';
   section.prepend(header);
   header.append(titleRow,tabs);
   panes();
  }
  const fonts=root.querySelector('#player-fonts-pane');
  let previous=fonts.firstElementChild;
  for(const id of ['bili-dm-font-settings','bili-comment-font-settings','bili-page-font-settings']){
   const group=root.getElementById(id);
   if(!group)continue;
   if(previous.nextElementSibling!==group)previous.after(group);
   previous=group;
  }
  for(const pane of section.children){
   if(pane.dataset.playerPane&&pane!==fonts)pane.classList.add('bili-panel-card');
  }
  root.querySelector('#language-pool')?.parentElement.querySelector('fieldset')?.classList.add('bili-panel-card');
  launcher.dataset.biliLauncher='';
  globalThis.BiliPanelTheme?.panel(root,section);
  syncSize?.();
  globalThis.BiliPanelTheme?.paint(root);
 }

 function integrate(){
  const next=[...document.querySelectorAll('.bpx-player-container')].find(el=>el.querySelector('video')&&el.getBoundingClientRect().width>0);
  const controls=next?.querySelector('.bpx-player-control-bottom-right')||next?.querySelector('.bpx-player-control-bottom');
  if(!next||!controls){if(player){close();button?.remove();delete host.dataset.playerIntegrated;host.style.cssText=previousStyle;document.documentElement.append(host);player=null;}decorate();return;}
  if(!player){previousStyle=host.style.cssText;close();}player=next;host.dataset.playerIntegrated='true';host.style.removeProperty('display');if(getComputedStyle(player).position==='static')player.style.position='relative';const full=!!(document.fullscreenElement||document.querySelector('.bpx-player-container[data-screen=web],.bpx-player-container[data-screen=full]'));if(full&&host.dataset.panelDock==='external'){close();host.dataset.panelDock='player';}const parent=host.dataset.panelDock==='external'?document.documentElement:player;if(host.parentElement!==parent)parent.append(host);
  if(!button){button=document.createElement('button');button.id='bili-language-player-button';button.type='button';button.className='bpx-player-ctrl-btn';button.textContent='双语';button.title='语言助手：字幕与左右耳';button.setAttribute('aria-label','字幕与声音');button.setAttribute('aria-haspopup','dialog');button.style.cssText='height:100%;min-width:44px;flex-shrink:0;align-self:center;cursor:pointer;border:0;border-radius:4px;background:transparent;color:#fff;font:inherit;white-space:nowrap;padding:0 8px;';button.onclick=e=>{e.stopPropagation();const external=host.dataset.panelDock==='external';host.dataset.panelDock='player';integrate();if(section.hidden||external)launcher.click();else close();button.setAttribute('aria-expanded',String(!section.hidden));};}
  const rect=player.getBoundingClientRect(),bar=(player.querySelector('.bpx-player-control-bottom')||controls).getBoundingClientRect(),scale=rect.height/(player.offsetHeight||rect.height)||1;host.style.setProperty('--bili-player-panel-bottom',Math.max(90,(rect.bottom-bar.top)/scale+8)+'px');
  if(button.parentElement!==controls)controls.prepend(button);button.setAttribute('aria-expanded',String(!section.hidden));decorate();
 }
 document.addEventListener('bili-panel-open',event=>{let value;try{value=JSON.parse(event.detail);}catch{return;}const external=value.location==='external',same=host.dataset.panelDock===(external?'external':'player');host.dataset.panelDock=external?'external':'player';integrate();if(value.toggle&&same&&!section.hidden)close();else if(section.hidden)launcher.click();if(value.settings)selectPane('favorites');});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!section.hidden)close();});
 let pending;const schedule=()=>{if(!pending)pending=setTimeout(()=>{pending=null;integrate();},40);};
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-screen']});document.addEventListener('fullscreenchange',schedule);document.addEventListener('webkitfullscreenchange',schedule);window.addEventListener('resize',schedule);integrate();setInterval(integrate,500);
})();
