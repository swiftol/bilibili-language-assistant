(()=>{
 if(document.getElementById('bili-language-unified-style'))return;
 const style=document.createElement('style');style.id='bili-language-unified-style';style.textContent='html[data-bili-language-fullscreen] #bili-dual-native:not([data-player-integrated]),html[data-bili-language-fullscreen] #bili-language-host,html[data-bili-language-fullscreen] #bili-ja-zh-toggle,html[data-bili-language-fullscreen] #bili-translation-settings{display:none!important}';document.documentElement.append(style);
 function fullscreen(){const full=!!(document.fullscreenElement||document.webkitFullscreenElement||document.body?.classList.contains('webscreen-fix')||document.querySelector('.bpx-player-container[data-screen="web"],.bpx-player-container[data-screen="full"]'));if(full!==document.documentElement.hasAttribute('data-bili-language-fullscreen'))document.documentElement.toggleAttribute('data-bili-language-fullscreen',full);}
 let ownHost;
 function makeHost(){const host=document.createElement('div');host.id='bili-language-host';const root=host.attachShadow({mode:'open'});root.innerHTML='<style>:host{font:13px system-ui;color:#ecf4ff}button{cursor:pointer;background:#71e3c3;color:#10202a;border:0;border-radius:6px;padding:8px}#launcher{position:fixed;right:18px;bottom:18px;z-index:2147483646}section{position:fixed;right:18px;bottom:60px;width:300px;max-height:65vh;overflow:auto;padding:16px;border:1px solid #456;border-radius:12px;background:#142638;z-index:2147483647}section[hidden]{display:none}</style><button id="launcher">语言助手</button><section hidden><button id="close">收起面板 ▾</button><h3>网页语言对照</h3></section>';document.documentElement.append(host);const section=root.querySelector('section');root.querySelector('#launcher').onclick=()=>section.hidden=!section.hidden;root.querySelector('#close').onclick=()=>section.hidden=true;document.addEventListener('pointerdown',event=>{if(!event.composedPath().includes(host))section.hidden=true;});document.addEventListener('keydown',event=>{if(event.key==='Escape')section.hidden=true;});return host;}
 function integrate(){
  fullscreen();
  const toggle=document.getElementById('bili-ja-zh-toggle');
  const settings=document.getElementById('bili-translation-settings');
  if(!toggle&&!settings)return;
  const host=document.getElementById('bili-dual-native')||(ownHost||=makeHost());
  const root=host.shadowRoot,section=root.querySelector('section');
  if(!host.dataset.unified){
   host.dataset.unified='true';
   if(!root.getElementById('player-language-tabs'))root.querySelector('#collapse')?.click();
  }
  const launcher=root.getElementById('launcher');
  if(launcher&&launcher.textContent!=='语言助手'){launcher.textContent='语言助手';launcher.setAttribute('aria-label','语言助手');}
  if(launcher)launcher.dataset.biliLauncher='';
  const title=section.querySelector('h3');
  if(title.textContent!=='B站语言助手')title.textContent='B站语言助手';
  globalThis.BiliPanelTheme?.panel(root,section);
  let group=root.getElementById('bili-web-language-controls');
  if(!group){
   group=document.createElement('div');
   group.id='bili-web-language-controls';
   group.className='bili-panel-card';
   group.dataset.playerPane='subtitles';
   group.hidden=root.querySelector('[data-player-tab="subtitles"][aria-selected="false"]')!==null;
   const heading=document.createElement('h4');
   heading.textContent='网页对照设置';
   group.append(heading);
   section.append(group);
  }
  if(toggle&&toggle.parentElement!==group){
   toggle.style.cssText='display:block;position:static;margin:6px 0;';
   group.append(toggle);
  }
  if(settings&&settings.parentElement!==group){
   settings.style.cssText='position:static;margin:6px 0;color:inherit;font:inherit;';
   group.append(settings);
  }
  if(host===ownHost){
   let fonts=root.getElementById('player-fonts-pane');
   if(!fonts){
    section.setAttribute('role','dialog');section.setAttribute('aria-label','网页语言设置');
    section.dataset.webOnly='';
    const header=document.createElement('div');header.id='bili-panel-header';
    const titleRow=document.createElement('div');titleRow.className='bili-panel-title';
    const close=root.getElementById('close');close.textContent='收起';titleRow.append(title,close);
    const tabs=document.createElement('div');tabs.id='player-language-tabs';tabs.dataset.webOnly='';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','网页语言设置');
    fonts=document.createElement('div');fonts.id='player-fonts-pane';fonts.hidden=true;
    for(const name of ['设置','字体大小']){
     const tab=document.createElement('button');tab.type='button';tab.textContent=name;tab.setAttribute('role','tab');
     tab.setAttribute('aria-selected',String(name==='设置'));
     tab.onclick=()=>{
      group.hidden=name!=='设置';fonts.hidden=!group.hidden;section.scrollTop=0;
      for(const button of tabs.children)button.setAttribute('aria-selected',String(button===tab));
     };
     tabs.append(tab);
    }
    header.append(titleRow,tabs);section.prepend(header);section.append(fonts);
   }
   for(const id of ['bili-comment-font-settings','bili-page-font-settings']){
    const card=root.getElementById(id);
    if(card&&card.parentElement!==fonts)fonts.append(card);
   }
  }
  globalThis.BiliPanelTheme?.paint(root);
 }
 let timer;const schedule=()=>{if(!timer)timer=setTimeout(()=>{timer=null;integrate();},40);};new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-screen']});document.addEventListener('fullscreenchange',fullscreen);document.addEventListener('webkitfullscreenchange',fullscreen);integrate();setInterval(integrate,1000);
})();
