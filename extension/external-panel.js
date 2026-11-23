(()=>{
 if(document.getElementById('bili-language-external'))return;
 const host=document.createElement('div');host.id='bili-language-external';host.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483646';const root=host.attachShadow({mode:'open'});root.innerHTML='<style>button{font:13px system-ui;cursor:pointer;border:1px solid #71e3c377;border-radius:9px;padding:10px 14px;color:#10222a;background:#71e3c3;box-shadow:0 4px 20px #0004}</style><button type="button" id="bili-language-external-button" aria-label="语言助手外部面板">语言助手 ⚙</button>';document.documentElement.append(host);
 const launcher=root.querySelector('button');
 launcher.dataset.biliLauncher='';
 launcher.textContent='语言助手';
 globalThis.BiliPanelTheme?.mount(root);
 launcher.onclick=()=>document.dispatchEvent(new CustomEvent('bili-panel-open',{detail:JSON.stringify({location:'external',toggle:true})}));
 function update(){const full=!!(document.fullscreenElement||document.documentElement.hasAttribute('data-bili-language-fullscreen')||document.querySelector('.bpx-player-container[data-screen=web],.bpx-player-container[data-screen=full]'));host.hidden=full||!document.getElementById('bili-dual-native')?.dataset.playerIntegrated;}
 new MutationObserver(update).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-screen','data-bili-language-fullscreen','data-player-integrated']});document.addEventListener('fullscreenchange',update);update();
})();
