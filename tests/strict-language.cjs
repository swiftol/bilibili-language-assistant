const {chromium}=require('playwright');
const assert=require('assert');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const p=await browser.newPage();
  await p.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:`<div style="position:relative;width:800px;height:450px"><video style="width:800px;height:450px"></video></div><div class="bpx-player-subtitle-wrap">不应显示的中文</div><div class="bili-subtitle-x-subtitle-panel">旧版中文</div><div class="bpx-player-ctrl-subtitle-major"><button class="bpx-player-ctrl-subtitle-language-item" data-lan="zh">中文</button></div>`}));
  await p.goto('https://www.bilibili.com/video/fixture');
  await p.evaluate(()=>{
   localStorage.setItem('bili-dual-subtitle-tray-v5',JSON.stringify({selected:['en','ja']}));
   window.nativeClicks=0;window.requested=[];
   document.querySelector('[data-lan=zh]').onclick=()=>nativeClicks++;
   document.addEventListener('bili-dual-load-subtitle',e=>{const r=JSON.parse(e.detail);requested.push(r.language);document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type:r.language==='en'&&window.failEnglish?'subtitle-error':'subtitle-body',page:location.pathname,data:{language:r.language,message:'fixture error',body:[{from:0,to:50,content:'cue-'+r.language}]}})}));});
   window.catalog=langs=>document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type:'subtitles',page:location.pathname,data:langs.map(language=>({language,url:'https://aisubtitle.hdslb.com/'+language+'.json'}))})}));
  });
  await p.addScriptTag({path:path.resolve('extension/native.js')});
  const visible=()=>p.locator('#bili-dual-subtitle-overlay .cue:visible').allTextContents();
  const nativeHidden=()=>p.evaluate(()=>[...document.querySelectorAll('.bpx-player-subtitle-wrap,.bili-subtitle-x-subtitle-panel')].every(e=>getComputedStyle(e).visibility==='hidden'));
  await p.evaluate(()=>catalog(['zh']));await p.waitForTimeout(1400);
  assert(await nativeHidden());assert.deepEqual(await visible(),[]);assert.equal(await p.evaluate(()=>nativeClicks),0);assert.deepEqual(await p.evaluate(()=>requested),[]);
  await p.evaluate(()=>catalog(['zh','ja']));await p.waitForTimeout(250);assert.deepEqual(await visible(),['cue-ja']);assert(await nativeHidden());
  await p.evaluate(()=>{failEnglish=true;catalog(['zh','en','ja']);});await p.waitForTimeout(250);assert(await nativeHidden());assert(!(await p.locator('#tray-status').innerText()).includes('保留 B站字幕'));
  await p.evaluate(()=>{failEnglish=false;});await p.locator('#tray-retry').click();await p.waitForTimeout(250);assert.deepEqual((await visible()).sort(),['cue-en','cue-ja']);
  await p.evaluate(()=>history.pushState({},'', '/video/next'));await p.waitForTimeout(180);await p.evaluate(()=>catalog(['zh']));await p.waitForTimeout(700);assert.deepEqual(await visible(),[]);assert(await nativeHidden());assert.equal(await p.evaluate(()=>nativeClicks),0);
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-subtitle-tray-v5')).selected),['en','ja']);await p.close();
  for(const fixture of ['missing','original-both','same-url']){
   const a=await browser.newPage();await a.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:'<video style="width:640px;height:360px"></video><div id="bili-dual-native"></div>'}));await a.goto('https://www.bilibili.com/video/fixture');
   await a.evaluate(fixture=>{
    document.querySelector('#bili-dual-native').attachShadow({mode:'open'}).innerHTML='<section></section>';
    if(fixture==='original-both')localStorage.setItem('bili-dual-ear-slots',JSON.stringify({left:'original',right:'original'}));
    window.sourceCount=0;window.monoRoutes=0;window.languageClicks=0;
    const C=window.AudioContext;window.AudioContext=class extends C{createMediaElementSource(el){sourceCount++;return super.createMediaElementSource(el);}};
    if(fixture==='same-url'){const el=document.createElement('button');el.className='bpx-player-ctrl-translation-language-item';el.dataset.lan='en';el.onclick=()=>languageClicks++;document.body.append(el);}
   },fixture);
   for(const name of ['core.js','stereo.js'])await a.addScriptTag({path:path.resolve('extension/'+name)});
   await a.evaluate(fixture=>{const route=location.pathname+'?p=1',page=location.pathname,mediaKey='fixture';const emit=(type,data)=>document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type,data,route,page,mediaKey})}));emit('media',{});emit('play',{language:'',audio:[{url:'https://test.bilivideo.com/original.wav',bandwidth:1}]});if(fixture==='same-url')emit('play',{language:'en',audio:[{url:'https://test.bilivideo.com/original.wav',bandwidth:1}]});const routeAudio=BiliDual.route;BiliDual.route=(...args)=>{monoRoutes++;return routeAudio(...args);};},fixture);
   await a.locator('#dual-start').click();await a.waitForFunction(()=>document.querySelector('#dual-status')?.textContent.includes('立体声')||document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.includes('立体声'));
   assert.deepEqual(await a.evaluate(()=>({sources:sourceCount,mono:monoRoutes,clicks:languageClicks})),{sources:0,mono:0,clicks:0},fixture);
   assert.equal(await a.locator('#bili-dual-stereo audio').count(),0);await a.close();
  }
  console.log('PASS: strict subtitle allow-list; no native Chinese while missing/loading/error; legacy selector disabled; single available language; preference retained across videos; absent foreign/original-both/false foreign leave original stereo untouched');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
