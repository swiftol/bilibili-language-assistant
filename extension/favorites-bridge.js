// MAIN-world API adapter. Auth tokens remain here and never cross the page event bridge.
(()=>{
 const requestFetch=window.fetch.bind(window),inflight=new Set();
 const route=()=>location.pathname+location.search;
 const video=()=>location.pathname.match(/\/video\/(BV[\w]+)/)?.[1]||globalThis.BiliWatchLaterRoute?.videoId()||'';
 const cookie=name=>{const value=document.cookie.split('; ').find(x=>x.startsWith(name+'='));return value?decodeURIComponent(value.slice(name.length+1)):'';};
 async function json(url,options={}){const response=await requestFetch(url,{credentials:'include',signal:AbortSignal.timeout(8000),...options});if(!response.ok)throw Error('请求失败，请稍后重试');const body=await response.json();if(body.code!==0)throw Error(body.code===-101?'请先登录 B站':String(body.message||'B站暂未完成请求'));return body.data;}
 function valid(r){
  return r.route===route()&&(r.cardKey?globalThis.BiliVideoCardContext?.matches(r.cardKey,r.bvid):r.bvid===video());
 }
 async function videoData(r){
  let state=window.__INITIAL_STATE__?.videoData;
  if(r.cardKey||state?.bvid!==r.bvid||!state.aid)state=await json('https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(r.bvid));
  if(!valid(r)||state?.bvid!==r.bvid||!/^\d+$/.test(String(state.aid)))throw Error('视频已切换，请重新选择');
  return state;
 }
 async function blockUploader(r){
  const state=await videoData(r);
  const fid=String(state.owner?.mid||''),csrf=cookie('bili_jct');
  if(!csrf)throw Error('请先登录 B站');
  if(!/^[1-9]\d*$/.test(fid))throw Error('无法确认这张卡片的 UP 主');
  if(!valid(r))throw Error('视频已切换，请重新选择');
  await json('https://api.bilibili.com/x/relation/modify',{
   method:'POST',
   body:new URLSearchParams({fid,act:'5',re_src:'11',gaia_source:'web_main',extend_content:JSON.stringify({entity:'user',entity_id:fid}),csrf})
  });
  return {name:String(state.owner?.name||'此 UP 主')};
 }
 async function folders(r){
  const account=await json('https://api.bilibili.com/x/web-interface/nav');if(!account?.isLogin||!account.mid)throw Error('请先登录 B站');
  const state=await videoData(r);
  const oid=!r.cardKey&&globalThis.BiliWatchLaterRoute?.matches()?new URLSearchParams(location.search).get('oid'):null;
  if(oid&&oid!==String(state.aid))throw Error('视频尚未切换完成，请重试');
  const query=new URLSearchParams({up_mid:String(account.mid),type:'2',rid:String(state.aid)});
  const data=await json('https://api.bilibili.com/x/v3/fav/folder/created/list-all?'+query);
  if(!valid(r))throw Error('视频已切换，请重新选择');
  return {mid:String(account.mid),aid:String(state.aid),folders:(data?.list||[]).filter(f=>/^\d+$/.test(String(f.id))).map(f=>({id:String(f.id),title:String(f.title||'未命名收藏夹'),saved:f.fav_state===1,isDefault:Number.isFinite(f.attr)?(f.attr&2)===0:f.title==='默认收藏夹',mediaCount:Number(f.media_count)||0}))};
 }
 document.addEventListener('bili-gesture-request',async event=>{
  let r;try{r=JSON.parse(event.detail);}catch{return;}
  if(!r||typeof r.id!=='string'||r.id.length>100||!['folders','add','remove','create-folder','block'].includes(r.action)||(r.action==='block'&&!r.cardKey)||(r.action==='create-folder'&&r.cardKey)||!valid(r)||!r.bvid)return;
  const key=r.action+':'+r.bvid+':'+(r.action==='folders'?r.cardKey||'':'')+':'+(r.folderId||'');
  const reply=(ok,data,message)=>document.dispatchEvent(new CustomEvent('bili-gesture-result',{detail:JSON.stringify({id:r.id,bvid:r.bvid,route:r.route,ok,data,message})}));
  if(inflight.has(key)){reply(false,null,'正在处理，请稍候');return;}inflight.add(key);
  try{
   if(r.action==='block'){reply(true,await blockUploader(r));return;}
   if(r.action==='create-folder'){const title=String(r.title||'').trim();if(!title||title.length>20)throw Error('收藏夹名称需要 1～20 个字符');const csrf=cookie('bili_jct');if(!csrf)throw Error('请先登录 B站');const account=await json('https://api.bilibili.com/x/web-interface/nav');if(!account?.isLogin)throw Error('请先登录 B站');if(r.mid&&String(account.mid)!==String(r.mid))throw Error('账号已切换，请刷新收藏夹');if(!valid(r))throw Error('视频已切换，请重新选择');const created=await json('https://api.bilibili.com/x/v3/fav/folder/add',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({title,intro:'',privacy:r.private===false?'0':'1',csrf})});reply(true,{id:String(created.id),title});return;}
   const data=await folders(r);
   if(r.action==='folders'){reply(true,data);return;}
   const folder=data.folders.find(f=>f.id===r.folderId);if(!folder)throw Error('收藏夹已不可用，请刷新列表');
   if(r.action==='remove'){if(!folder.saved){reply(true,{id:folder.id,title:folder.title,saved:false,already:true});return;}const csrf=cookie('bili_jct');if(!csrf)throw Error('登录状态已失效，请重新登录 B站');if(!valid(r))throw Error('视频已切换，请重新选择');await json('https://api.bilibili.com/x/v3/fav/resource/deal',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({rid:data.aid,type:'2',add_media_ids:'',del_media_ids:folder.id,csrf})});reply(true,{id:folder.id,title:folder.title,saved:false,already:false});return;}
   const targets=[folder];
   if(r.autoDefault!==false){const extra=r.defaultFolderId?data.folders.find(f=>f.id===r.defaultFolderId):data.folders.find(f=>f.isDefault);if(!extra)throw Error('未找到默认收藏夹，请在轮盘设置中选择');if(extra.id!==folder.id)targets.push(extra);}
   const pending=targets.filter(f=>!f.saved),result={id:folder.id,title:folder.title,saved:true,savedIds:targets.map(f=>f.id),savedTitles:targets.map(f=>f.title),already:pending.length===0};
   if(!pending.length){reply(true,result);return;}
   const csrf=cookie('bili_jct');if(!csrf)throw Error('登录状态已失效，请重新登录 B站');
   if(!valid(r))throw Error('视频已切换，请重新选择');
   await json('https://api.bilibili.com/x/v3/fav/resource/deal',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({rid:data.aid,type:'2',add_media_ids:pending.map(f=>f.id).join(','),del_media_ids:'',csrf})});
   reply(true,result);
  }catch(error){reply(false,null,error.message);}finally{inflight.delete(key);}
 });
})();
