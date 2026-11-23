(() => {
 const host=document.getElementById('bili-dual-native');
 const section=host?.shadowRoot?.querySelector('section');
 if(!section)return;
 const preference='bili-auto-highest-quality';
 const group=document.createElement('div');
 group.id='player-playback-settings';
 group.dataset.playerPane='subtitles';
 group.hidden=section.querySelector('[data-player-tab="subtitles"][aria-selected="false"]')!==null;
 const heading=document.createElement('h4');heading.textContent='播放设置';group.append(heading);
 const label=document.createElement('label');
 const toggle=document.createElement('input');
 toggle.type='checkbox';
 toggle.id='bili-auto-highest-quality';
 toggle.checked=localStorage.getItem(preference)!=='off';
 label.append(toggle,' 自动选择最高可用画质');
 group.append(label);section.append(group);

 const menuSelector='.bpx-player-ctrl-quality';
 const itemSelector='.bpx-player-ctrl-quality-menu-item[data-value]';
 const currentVideo=()=>location.pathname+'?p='+(new URLSearchParams(location.search).get('p')||'1');
 let route='',manual=false,attempted=new Set(),nextCheck=0,applying=false;
 let account=null,accountRequest=null,accountChecked=0;

 async function checkAccount(){
  const now=Date.now();
  if(accountRequest||now-accountChecked<(account?300000:8000))return;
  accountChecked=now;
  accountRequest=fetch('https://api.bilibili.com/x/web-interface/nav',{credentials:'include',signal:AbortSignal.timeout(5000)})
   .then(r=>r.json()).then(({data})=>{
    if(!data||typeof data.isLogin!=='boolean')return;
    account={login:data.isLogin,vip:data.isLogin&&(data.vipStatus===1||data.vip?.status===1)};
   }).catch(()=>{}).finally(()=>{accountRequest=null;});
 }

 function resetRoute(){
  const next=currentVideo();
  if(next===route)return;
  route=next;
  manual=false;
  attempted.clear();
  nextCheck=Date.now()+900;
 }
 function available(item){
  if(item.matches('[disabled],[aria-disabled="true"],.bpx-state-disabled,.disabled'))return false;
  const badge=item.querySelector('.bpx-player-ctrl-quality-badge');
  if(badge?.matches('.bpx-player-ctrl-quality-badge-bigvip')||badge?.textContent.includes('大会员'))return account?.vip===true;
  if(badge?.matches('.bpx-player-ctrl-quality-badge-needlogin')||badge?.textContent.includes('登录'))return account?.login===true;
  return !badge;
 }
 function tick(){
  resetRoute();
  if(!toggle.checked||manual||Date.now()<nextCheck||!/\/video\//.test(location.pathname))return;
  const menu=[...document.querySelectorAll(menuSelector)].find(el=>el.getClientRects().length);
  const options=[...(menu?.querySelectorAll(itemSelector)||[])].filter(el=>Number(el.dataset.value)>0);
  if(!options.length)return;
  if(options.some(el=>el.querySelector('.bpx-player-ctrl-quality-badge'))){
   checkAccount();
   if(!account&&accountRequest)return;
  }
  const best=options.filter(available).sort((a,b)=>Number(b.dataset.value)-Number(a.dataset.value))[0];
  if(!best||best.classList.contains('bpx-state-active')||attempted.has(best.dataset.value))return;
  attempted.add(best.dataset.value);
  nextCheck=Date.now()+1500;
  applying=true;
  try{best.click();}finally{applying=false;}
 }
 document.addEventListener('click',event=>{
  if(applying||!event.isTrusted||!event.target.closest?.(menuSelector+' '+itemSelector))return;
  resetRoute();
  manual=true;
 },true);
 toggle.onchange=()=>{
  localStorage.setItem(preference,toggle.checked?'on':'off');
  manual=false;
  attempted.clear();
  nextCheck=0;
  tick();
 };
 setInterval(tick,400);
})();
