(()=>{
 const bars='.bili-header__bar';
 const labels='.trigger-text,.right-entry-text,.right-entry-item__text';
 const creator=/^(创作中心|創作中心|クリエイターセンター|Creator (?:Center|Studio))$/i;
 const vip=/^(大会员|大會員|会员|會員|プレミアム(?:会員)?|VIP|Premium)$/i;
 const style=document.createElement('style');
 style.textContent=`
  [data-bili-compact-bar]{
   box-sizing:border-box!important;width:100%!important;max-width:100vw!important;
   min-width:0!important;gap:clamp(6px,1vw,14px)!important;
   padding-inline:clamp(8px,2vw,24px)!important;
  }
  [data-bili-compact-bar] > :is(.left-entry,.right-entry){flex:0 0 auto!important;width:auto!important;min-width:0!important;margin:0!important;gap:0!important}
  [data-bili-compact-bar] > .center-search-container{flex:1 1 auto!important;min-width:0!important;margin-inline:0!important}
  [data-bili-compact-bar] :is(.center-search__bar,.center-search__bar form,.center-search__bar input){min-width:0!important}
  [data-bili-compact-bar] [data-bili-compact-hide]{display:none!important}
  [data-bili-compact-home] > :is(.trigger-text,.mini-header__title,.left-entry__title-text){display:none!important}
  [data-bili-compact-home] > svg{flex-shrink:0}
  @media (max-width:720px){
   [data-bili-compact-bar] :is(.left-entry-main,.right-entry__main){gap:4px!important}
   [data-bili-compact-bar] [data-bili-compact-right]{min-width:0!important;margin-inline:0!important;padding-inline:2px!important}
  }
  @media (max-width:520px){
   [data-bili-compact-bar] [data-bili-compact-right] :is(.trigger-text,.right-entry-text,.right-entry-item__text){display:none!important}
   [data-bili-compact-bar] [data-bili-compact-right] :is(.right-entry__item-trigger,.right-entry-item__link){min-width:26px!important;padding-inline:0!important}
   [data-bili-compact-home] > svg{max-width:52px}
   [data-bili-compact-bar] .center-search__bar{padding-inline:4px!important}
   [data-bili-compact-bar] .nav-search-btn{margin-inline:0!important}
  }
 `;

 function homeLink(link){
  const url=new URL(link.href,location.href);
  return url.hostname==='www.bilibili.com'&&/^\/(?:zh-Hans|zh-Hant|ja|en)?\/?$/.test(url.pathname)&&link.querySelector('svg,img');
 }

 function label(item){
  return (item.querySelector(labels)?.textContent||item.querySelector(':scope > a[aria-label]')?.getAttribute('aria-label')||
   item.getAttribute('aria-label')||item.firstElementChild?.getAttribute('aria-label')||'').trim();
 }

 function compact(bar){
  const left=bar.querySelector(':scope > .left-entry'),right=bar.querySelector(':scope > .right-entry');
  if(!left||!right)return;
  const leftItems=[...(left.querySelector(':scope > .left-entry-main')||left).children];
  const home=leftItems.flatMap(item=>item.matches('a[href]')?[item]:[...item.querySelectorAll('a[href]')]).find(homeLink);
  if(home){
   home.dataset.biliCompactHome='';
   if(!home.getAttribute('aria-label'))home.setAttribute('aria-label','B站首页');
   for(const item of leftItems)item.toggleAttribute('data-bili-compact-hide',!item.contains(home));
  }
  const rightItems=[...(right.querySelector(':scope > .right-entry__main')||right).children];
  const keepCreator=rightItems.some(item=>item.matches('.right-entry-item--creator,.right-entry-item--creation,.right-entry-item--creator-center')||
   item.querySelector('[data-idx="creation"],a[href*="member.bilibili.com/platform/home"]')||creator.test(label(item)));
  for(const item of rightItems){
   const name=label(item);
   const membership=item.matches('.right-entry-item--vip,.right-entry-item--vip-purchase,.vip-entry')||
    item.querySelector('[data-idx="vip"],[data-idx="vip_purchase"],a[href*="account.bilibili.com/big"],a[href*="big.bilibili.com"]')||vip.test(name);
   const submission=item.matches('.right-entry-item--upload,.right-upload-entry,.upload-entry')||
    item.querySelector('[data-idx="upload"]')||/^(投稿|Upload)$/i.test(name);
   item.toggleAttribute('data-bili-compact-hide',!!membership||(keepCreator&&!!submission));
   item.dataset.biliCompactRight='';
   if(name&&!item.getAttribute('title'))item.title=name;
  }
  bar.dataset.biliCompactBar='';
 }

 let scheduled=false;
 function scan(){
  scheduled=false;
  document.querySelectorAll(bars).forEach(compact);
 }
 function observe(){
  document.documentElement.append(style);
  scan();
  new MutationObserver(records=>{
   if(scheduled)return;
   if(records.some(record=>{
    const target=record.target.nodeType===1?record.target:record.target.parentElement;
    return target?.closest(bars)||[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches(bars)||node.querySelector(bars)));
   })){
    scheduled=true;
    requestAnimationFrame(scan);
   }
  }).observe(document.documentElement,{childList:true,characterData:true,subtree:true});
 }
 if(document.documentElement)observe();
 else document.addEventListener('DOMContentLoaded',observe,{once:true});
})();
