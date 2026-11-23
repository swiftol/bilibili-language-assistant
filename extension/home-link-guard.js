// Homepage cards must not navigate from hover-triggered or delayed synthetic clicks.
(()=>{
 const home=()=>location.hostname==='www.bilibili.com'&&/^\/(?:zh-Hans\/?|ja\/?)?$/.test(location.pathname);
 const linkFor=e=>{for(const n of e.composedPath()){if(n?.nodeType!==1)continue;const a=n.closest?.('a[href]');if(!a||!a.closest('.bili-video-card,.feed-card'))continue;try{const u=new URL(a.href,location.href);if(u.hostname==='www.bilibili.com'&&/\/video\/BV\w+/.test(u.pathname))return a;}catch{}}return null;};
 let press=null,key=null;
 document.addEventListener('pointerdown',e=>{press=home()&&e.isTrusted&&e.button<=1?{link:linkFor(e),button:e.button,time:performance.now()}:null;},true);
 document.addEventListener('pointercancel',()=>{press=null;},true);
 document.addEventListener('keydown',e=>{key=home()&&e.isTrusted&&e.key==='Enter'?{link:linkFor(e),time:performance.now()}:null;},true);
 for(const type of ['click','auxclick'])document.addEventListener(type,e=>{if(!home())return;const link=linkFor(e);if(!link)return;const now=performance.now(),pointer=e.isTrusted&&press?.link===link&&now-press.time<1500&&e.button===press.button,keyboard=e.isTrusted&&e.detail===0&&key?.link===link&&now-key.time<1000;if(!pointer&&!keyboard){e.preventDefault();e.stopImmediatePropagation();}press=null;key=null;},true);
 window.addEventListener('pagehide',()=>{press=null;key=null;});
})();
