// Shared by the page scripts and the extension's gesture handler.
(()=>{
 function matches(pathname=location.pathname){
  return /^\/(?:zh-Hans\/|ja\/)?list\/watchlater\/?$/.test(pathname);
 }
 function videoId(){
  if(!matches())return '';
  const queryId=new URLSearchParams(location.search).get('bvid')||'';
  const titleLink=document.querySelector('.video-info-container h1.video-title a.video-title-href[href]');
  const titleId=titleLink?.pathname.match(/^\/(?:zh-Hans\/|ja\/)?video\/(BV[A-Za-z0-9]+)(?:\/|$)/)?.[1]||'';
  if(!/^BV[A-Za-z0-9]+$/.test(queryId))return titleId;
  // During a list switch, the address may update before the previous heading is replaced.
  return titleId&&titleId!==queryId?'':queryId;
 }
 globalThis.BiliWatchLaterRoute={matches,videoId};
})();
