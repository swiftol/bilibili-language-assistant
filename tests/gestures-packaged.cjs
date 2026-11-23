const {project,chromium}=require('../scripts/test-env.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert');
function wav(frequency){const n=8000*8,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*2*Math.PI*frequency/8000)*1000,44+i*2);return b;}
(async()=>{
 const extension=path.resolve(process.env.BILI_TEST_EXTENSION||path.join(project,'extension'));
 const output=path.resolve(process.env.BILI_GESTURE_REPORTS||path.join(project,'artifacts/gestures'));fs.mkdirSync(output,{recursive:true});
 const context=await chromium.launchPersistentContext('',{executablePath:chromium.executablePath(),headless:true,viewport:{width:1400,height:1000},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--autoplay-policy=no-user-gesture-required']});
 const errors=[],posts=[],saved=new Set(),report={packagedExtension:true,scenarios:[]};let failPost=false,loggedIn=true,noDefault=false;
 context.setDefaultTimeout(10000);await context.tracing.start({screenshots:true,snapshots:true});
 try{
  await context.addCookies([{name:'bili_jct',value:'test-only-csrf',url:'https://www.bilibili.com'}]);
  await context.addInitScript(()=>{document.addEventListener('bili-dual-data',e=>{try{const m=JSON.parse(e.detail);if(m.type==='media')window.testMediaKey=m.mediaKey;}catch{}});localStorage.setItem('bili-ja-zh-enabled','false');localStorage.setItem('bili-dual-auto','false');});
  await context.route('https://test.bilivideo.com/**',route=>{
   const url=route.request().url();
   const body=wav(url.includes('en')?440:url.includes('ja')?1320:880);
   const range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
   const headers={'Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes'};
   if(!range)return route.fulfill({contentType:'audio/wav',headers,body});
   const first=Number(range[1]),last=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
   return route.fulfill({status:206,contentType:'audio/wav',headers:{...headers,'Content-Range':'bytes '+first+'-'+last+'/'+body.length},body:body.subarray(first,last+1)});
  });
  await context.route('https://api.bilibili.com/**',async r=>{
   const u=new URL(r.request().url());let body={code:0,data:{}};
   if(u.pathname.endsWith('/nav'))body={code:0,data:{isLogin:loggedIn,mid:101}};
   else if(u.pathname.endsWith('/view'))body.data={bvid:u.searchParams.get('bvid'),aid:111};
   else if(u.pathname.endsWith('/created/list-all'))body.data={list:Array.from({length:30},(_,i)=>({id:201+i,attr:i===0&&!noDefault?0:2,title:['学习','技术','日语','音乐','游戏','稍后看','美食','旅行','其他'][i]||'收藏夹'+(i+1),fav_state:saved.has(u.searchParams.get('rid')+':'+(201+i))?1:0}))};
   else if(u.pathname.endsWith('/resource/deal')){const data=new URLSearchParams(r.request().postData());assert.equal(data.get('csrf'),'test-only-csrf');const add=data.get('add_media_ids'),del=data.get('del_media_ids');assert(!(add&&del));posts.push({aid:data.get('rid'),folder:add,removed:del});if(failPost)body={code:-403,message:'测试：收藏失败'};else{for(const id of add.split(',').filter(Boolean))saved.add(data.get('rid')+':'+id);for(const id of del.split(',').filter(Boolean))saved.delete(data.get('rid')+':'+id);}}
   await r.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'https://www.bilibili.com','Access-Control-Allow-Credentials':'true'},body:JSON.stringify(body)});
  });
  await context.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><style>body{margin:0;background:#191e26;color:white;padding:20px;font:14px system-ui}.bpx-player-container{position:relative;width:1000px;height:600px;background:#253342;overflow:hidden}video{display:block;width:100%;height:550px;object-fit:contain}.bpx-player-control-bottom{position:absolute;bottom:0;height:50px;width:100%;background:#0c141b;display:flex;justify-content:flex-end;z-index:30}.bpx-player-control-bottom-right{height:100%;display:flex;align-items:center}button{cursor:pointer}#arc_toolbar_report{margin-top:25px}.video-fav{display:inline-flex;align-items:center;justify-content:center;margin-left:320px;width:110px;height:45px;border:1px solid #758;color:white;background:#21303d;border-radius:8px}.on{color:#00aeec!important}</style><script>window.__INITIAL_STATE__={videoData:{bvid:location.pathname.split('/').filter(Boolean).pop(),aid:111,cid:111}};<\/script><div class="bpx-player-container" data-screen="normal"><video loop crossorigin="anonymous" src="https://test.bilivideo.com/zh.wav"></video><div class="bpx-player-control-bottom"><div class="bpx-player-control-bottom-right"><span>翻译和字幕</span></div></div></div><div id="arc_toolbar_report"><button class="video-fav video-toolbar-left-item">★ 收藏</button></div>`}));
  const page=context.pages()[0];page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://www.bilibili.com/video/BVTESTA/');await page.waitForSelector('#bili-language-player-button',{timeout:25000});await page.waitForSelector('#bili-gesture-host');
  await page.waitForFunction(()=>window.testMediaKey==='BVTESTA:1:111');await page.evaluate(()=>{window.nativeFavorites=0;document.querySelector('.video-fav').onclick=()=>nativeFavorites++;const route=location.pathname+'?p=1',page=location.pathname,mediaKey='BVTESTA:1:111';for(const language of ['','en','ja'])document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type:'play',route,page,mediaKey,data:{language,audio:[{url:'https://test.bilivideo.com/'+(language||'zh')+'.wav',bandwidth:100}]}})}));});
  // Manifest-loaded code only: no addScriptTag / injected production scripts.
  assert(await page.locator('#bili-dual-native').evaluate(e=>!!e.shadowRoot.querySelector('#bili-mobile-style')));report.scenarios.push('manifest loads all UI scripts');
  const cdp=await context.newCDPSession(page),worlds=[];cdp.on('Runtime.executionContextCreated',event=>worlds.push(event.context));await cdp.send('Runtime.enable');let isolated;
  for(const world of worlds){try{const r=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'typeof BiliDual'});if(r.result.value==='object'){isolated=world.id;break;}}catch{}}
  assert(isolated,'Extension isolated world found');const extensionId=(await cdp.send('Runtime.evaluate',{contextId:isolated,expression:'chrome.runtime.id'})).result.value;
  await cdp.send('Runtime.evaluate',{contextId:isolated,expression:`window.testAudioMeters=[];const Original=window.AudioContext;window.AudioContext=class extends Original{createChannelMerger(count){const merger=super.createChannelMerger(count),split=this.createChannelSplitter(2),sink=this.createGain();sink.gain.value=.000001;sink.connect(this.destination);merger.connect(split);const meters=[0,1].map(side=>{const meter=this.createAnalyser();meter.fftSize=4096;split.connect(meter,side);meter.connect(sink);return meter;});testAudioMeters.push(meters);return merger;}}`});
  async function outputFrequencies(){await page.waitForTimeout(220);const r=await cdp.send('Runtime.evaluate',{contextId:isolated,returnByValue:true,expression:`testAudioMeters.slice(-2).map(pair=>pair.map(meter=>{const data=new Float32Array(meter.frequencyBinCount);meter.getFloatFrequencyData(data);let peak=-Infinity,index=0;for(let i=0;i<data.length;i++)if(data[i]>peak){peak=data[i];index=i;}return peak<-80?0:Math.round(index*meter.context.sampleRate/meter.fftSize);}));`});return r.result.value;}
  const favorite=page.locator('#arc_toolbar_report .video-fav'),language=page.locator('#bili-language-player-button');
  const menu=page.locator('#bili-gesture-host #menu');
  async function begin(source){const r=await source.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await menu.waitFor({state:'visible'});return {x:r.x+r.width/2,y:r.y+r.height/2};}
  async function drop(key){const item=page.locator('#bili-gesture-host .item[data-key="'+key+'"]').first();await item.waitFor({state:'visible'});const r=await item.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:6});await page.mouse.up();await menu.waitFor({state:'hidden'});}
  await favorite.click();assert.equal(await page.evaluate(()=>nativeFavorites),1);assert.equal(posts.length,0);report.scenarios.push('ordinary favorite click preserved');
  await begin(favorite);await page.locator('#bili-gesture-host .item[data-key="202"]').waitFor();await page.screenshot({path:path.join(output,'favorite-wheel.png')});await drop('202');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('已收藏到'));
  assert.deepEqual(posts,[{aid:'111',folder:'202,201',removed:''}]);assert.equal(await page.evaluate(()=>nativeFavorites),1);report.scenarios.push('release adds selected and system-default folders, removes none');
  await begin(favorite);assert.equal(await page.locator('#bili-gesture-host .item[data-key="202"]').getAttribute('data-saved'),'true');assert.equal(await page.locator('#bili-gesture-host .item[data-key="203"]').getAttribute('data-saved'),'false');const colors=await page.locator('#bili-gesture-host .item').evaluateAll(es=>[getComputedStyle(es.find(e=>e.dataset.key==='202')).backgroundColor,getComputedStyle(es.find(e=>e.dataset.key==='203')).backgroundColor]);assert.notEqual(colors[0],colors[1]);await drop('202');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('已取消收藏'));assert.equal(posts.length,2);assert.equal(posts.at(-1).removed,'202');assert(saved.has('111:201'));assert(!saved.has('111:202'));report.scenarios.push('saved colors and removal affects selected folder only');
  await begin(favorite);await page.mouse.up();assert.equal(posts.length,2);assert.equal(await page.evaluate(()=>nativeFavorites),1);report.scenarios.push('dead zone cancels');
  await begin(favorite);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(posts.length,2);assert.equal(await page.evaluate(()=>nativeFavorites),1);report.scenarios.push('Escape cancels without native click');
  await language.click();assert(await page.getByRole('dialog',{name:'字幕与声音',exact:true}).isVisible());await language.click();
  await page.evaluate(()=>{const b=document.getElementById('bili-language-player-button');window.originalLanguageStyle=b.style.cssText;Object.assign(b.style,{position:'fixed',left:'8px',bottom:'8px',height:'40px',width:'44px'});});await page.evaluate(()=>document.querySelector('video').play());await begin(language);const branches=await page.locator('#bili-gesture-host .item').evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right};}));assert(branches[0].right<=branches[1].x&&branches[1].right<=branches[2].x);
  const menuItem=id=>menu.locator('[data-key="'+id+'"]');
  assert.equal(branches.length,5);
  for(const [id,name] of [['ja','中日'],['en','中英']]){
   const base=await menuItem(id).boundingBox(),child=await menuItem(id+'-swap').boundingBox();
   assert.equal(await menuItem(id+'-swap').getAttribute('aria-label'),name+'：切换双耳');
   assert(child.y>base.y+base.height&&Math.abs((child.x+child.width/2)-(base.x+base.width/2))<1);
  }
  assert.equal(await menuItem('original-swap').count(),0);
  report.scenarios.push('audio branches stay separate at screen edge');await page.screenshot({path:path.join(output,'audio-branches.png')});await drop('ja');await page.evaluate(()=>document.getElementById('bili-language-player-button').style.cssText=window.originalLanguageStyle);await page.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.startsWith('双音轨已启用'));
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots'))),{left:'ja',right:'original'});assert(!(await page.getByRole('dialog',{name:'字幕与声音',exact:true}).isVisible()));const japanese=await outputFrequencies();assert(Math.abs(japanese[0][0]-1320)<30&&japanese[0][1]===0&&japanese[1][0]===0&&Math.abs(japanese[1][1]-880)<30,JSON.stringify(japanese));report.japaneseChannelFrequencies=japanese;report.scenarios.push('Japanese branch outputs isolated left/right signals');
  const waitAligned=()=>page.waitForFunction(()=>{
   const video=document.querySelector('video'),audio=[...document.getElementById('bili-dual-native').shadowRoot.querySelectorAll('audio')];
   return audio.length===2&&audio.every(el=>!el.paused&&!el.seeking&&Math.abs(video.currentTime-el.currentTime)<.065)&&Math.abs(audio[0].currentTime-audio[1].currentTime)<.03;
  },null,{timeout:5000});
  await page.evaluate(()=>{const v=document.querySelector('video');v.pause();v.currentTime=2;});
  await page.waitForFunction(()=>[...document.getElementById('bili-dual-native').shadowRoot.querySelectorAll('audio')].every(el=>el.paused));
  await page.evaluate(()=>{const v=document.querySelector('video');v.playbackRate=1.25;return v.play();});
  await waitAligned();
  assert(await page.evaluate(()=>{
   const video=document.querySelector('video');
   const audio=[...document.getElementById('bili-dual-native').shadowRoot.querySelectorAll('audio')];
   video.dispatchEvent(new Event('waiting'));
   return audio.length===2&&audio.every(el=>el.paused);
  }));
  await page.evaluate(()=>{const v=document.querySelector('video');v.playbackRate=1;v.dispatchEvent(new Event('playing'));});
  await waitAligned();
  await page.evaluate(()=>{const audio=document.getElementById('bili-dual-native').shadowRoot.querySelector('audio');audio.currentTime+=.22;});
  await waitAligned();
  report.scenarios.push('both timed tracks stop on pause and buffering, align after seek, resume and recover induced drift');
  const ears=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots')));
  async function shortcut(id){await begin(language);await drop(id);}
  await shortcut('ja');
  assert.deepEqual(await ears(),{left:'ja',right:'original'});
  await shortcut('ja-swap');
  assert.deepEqual(await ears(),{left:'original',right:'ja'});
  let swapped;
  for(let i=0;i<12;i++){
   swapped=await outputFrequencies();
   if(Math.abs(swapped[0][0]-880)<30&&swapped[0][1]===0&&swapped[1][0]===0&&Math.abs(swapped[1][1]-1320)<30)break;
  }
  assert(Math.abs(swapped[0][0]-880)<30&&swapped[0][1]===0&&swapped[1][0]===0&&Math.abs(swapped[1][1]-1320)<30,JSON.stringify(swapped));
  await shortcut('ja');
  assert.deepEqual(await ears(),{left:'original',right:'ja'});
  await shortcut('ja-swap');
  assert.deepEqual(await ears(),{left:'ja',right:'original'});
  report.scenarios.push('Japanese child swaps both channels, main selection preserves either order');

  await shortcut('en-swap');
  await page.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.includes('右耳 English'));
  assert.deepEqual(await ears(),{left:'original',right:'en'});
  await shortcut('en');
  assert.deepEqual(await ears(),{left:'original',right:'en'});
  await shortcut('en-swap');
  const english=await outputFrequencies();
  assert(Math.abs(english[0][0]-440)<30&&english[0][1]===0&&english[1][0]===0&&Math.abs(english[1][1]-880)<30,JSON.stringify(english));
  assert.deepEqual(await ears(),{left:'en',right:'original'});
  await shortcut('en');
  assert.deepEqual(await ears(),{left:'en',right:'original'});
  report.scenarios.push('English child can select the reversed pair directly and physically swap back; main selection is idempotent');
  await page.evaluate(()=>{window.originalSwitches=0;const active=document.createElement('button');active.className='bpx-player-ctrl-translation-language-item bpx-state-active';active.dataset.lan='en';const close=document.createElement('button');close.className='bpx-player-ctrl-translation-close-switch';close.onclick=()=>{originalSwitches++;active.classList.remove('bpx-state-active');};document.body.append(active,close);});await begin(language);await drop('original');await page.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.includes('保留播放器原始立体声'));assert.equal(await page.locator('#bili-dual-native audio').count(),0);assert.equal(await page.evaluate(()=>originalSwitches),1);report.scenarios.push('original branch disables official dubbing and restores stereo');
  const external=page.getByRole('button',{name:'语言助手外部面板',exact:true});await external.click();
  assert.equal(await page.locator('#bili-dual-native').evaluate(e=>e.parentElement===document.documentElement),true);
  const settings=page.locator('#favorite-wheel-settings');
  assert(!(await settings.isVisible()));
  await page.getByRole('tab',{name:'收录仓夹',exact:true}).click();
  await settings.locator('.wheel-slot-list .wheel-folder').first().waitFor();
  assert.equal(await settings.locator('.wheel-slot-list .wheel-folder').count(),30);
  assert(!(await page.getByText('播放设置',{exact:true}).isVisible()));
  await page.getByRole('tab',{name:'设置',exact:true}).click();
  assert(!(await settings.isVisible()));
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('bili-panel-open',{detail:JSON.stringify({location:'external',settings:true})})));
  assert.equal(await page.getByRole('tab',{name:'收录仓夹',exact:true}).getAttribute('aria-selected'),'true');
  assert(await settings.isVisible());
  async function addFolder(editor,id,index){const target=index===undefined?editor.locator('.wheel-preview .slot[data-layer="'+await editor.getByLabel('编辑轮盘层',{exact:true}).inputValue()+'"]').first():editor.locator('.wheel-preview .gap[data-layer="0"]').nth(index);if(await target.count())await editor.locator('.wheel-pool [data-folder="'+id+'"]').dragTo(target);else await editor.locator('.wheel-pool [data-folder="'+id+'"]').dragTo(editor.locator('.wheel-preview .slot').last());}
  async function countIs(editor,n){assert.equal(await editor.getByLabel('当前层格数',{exact:true}).inputValue(),String(n));}
  await countIs(settings,6);await addFolder(settings,207);await countIs(settings,7);
  await settings.locator('.wheel-pool').scrollIntoViewIfNeeded();await settings.locator('.wheel-preview .slot[data-layer="0"][data-slot="0"]').dragTo(settings.locator('.wheel-pool'));await countIs(settings,6);
  await settings.locator('.wheel-pool').scrollIntoViewIfNeeded();await settings.locator('.wheel-preview .slot[data-layer="0"][data-slot="0"]').dragTo(settings.locator('.wheel-pool'));await countIs(settings,5);
  await external.click();await begin(favorite);assert.equal(await page.locator('#bili-gesture-host .item[data-layer-index="0"]').count(),5);await page.keyboard.press('Escape');await page.mouse.up();
  await external.click();await addFolder(settings,201,0);await countIs(settings,6);
  await settings.locator('.wheel-preview .slot[data-layer="0"][data-slot="0"]').dragTo(settings.locator('.wheel-preview .gap[data-layer="0"]').nth(3));await countIs(settings,6);await settings.getByRole('button',{name:'撤销上次修改',exact:true}).click();
  const slot=(layer,index)=>settings.locator('.wheel-preview .slot[data-layer="' + layer + '"][data-slot="' + index + '"]');
  const readSlots=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bili-favorite-wheel:101')).layers.map(l=>l.slots));
  const beforeSwap=await readSlots();
  await slot(0,1).dragTo(slot(0,5));
  const expectedSwap=beforeSwap[0].slice();
  [expectedSwap[1],expectedSwap[5]]=[expectedSwap[5],expectedSwap[1]];
  assert.deepEqual((await readSlots())[0],expectedSwap);
  await settings.getByRole('button',{name:'撤销上次修改',exact:true}).click();
  await slot(0,1).dragTo(slot(1,0));
  const across=await readSlots();
  assert.equal(across[0][1],beforeSwap[1][0]);
  assert.equal(across[1][0],beforeSwap[0][1]);
  assert.equal(across[0][0],beforeSwap[0][0]);
  assert.deepEqual(across.map(l=>l.length),beforeSwap.map(l=>l.length));
  await settings.getByRole('button',{name:'撤销上次修改',exact:true}).click();
  await slot(0,0).dragTo(settings.locator('.wheel-preview .gap[data-layer="1"]').first());await countIs(settings,5);await settings.getByLabel('编辑轮盘层',{exact:true}).selectOption('1');await countIs(settings,17);await settings.getByRole('button',{name:'撤销上次修改',exact:true}).click();await countIs(settings,16);
  report.scenarios.push('drag insertion 6 to 7, extraction to 5, reorder, cross-layer movement and undo');
  await external.click();await begin(favorite);assert.equal(await page.locator('#bili-gesture-host svg path').count(),22);await page.screenshot({path:path.join(output,'multilayer-wheel.png')});await page.keyboard.press('Escape');await page.mouse.up();
  await external.click();await settings.getByRole('button',{name:'增加一层',exact:true}).click();await countIs(settings,0);await addFolder(settings,208);await countIs(settings,1);await settings.getByLabel('同时显示层数',{exact:true}).fill('2');await settings.getByLabel('同时显示层数',{exact:true}).press('Tab');await external.click();await begin(favorite);await page.locator('#bili-gesture-host .item[data-layer-index="0"]').first().waitFor();await page.mouse.wheel(0,300);await page.locator('#bili-gesture-host .item[data-layer-index="2"]').waitFor();await page.keyboard.press('Escape');await page.mouse.up();
  const popup=await context.newPage();await popup.goto('chrome-extension://'+extensionId+'/popup.html');await popup.locator('#settings .wheel-editor').waitFor();const pop=popup.locator('#settings');await pop.getByLabel('同时收藏到默认收藏夹',{exact:true}).uncheck();await addFolder(pop,208,0);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bili-favorite-wheel:101')).autoDefault===false&&JSON.parse(localStorage.getItem('bili-favorite-wheel:101')).layers[0].slots[0]==='208');await popup.screenshot({path:path.join(output,'popup-config.png')});await popup.close();await page.bringToFront();report.scenarios.push('toolbar popup shares drag editor and saves to page');
  saved.delete('111:201');const beforeSingle=posts.length;await begin(favorite);await drop('208');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('已收藏到'));assert.equal(posts.length,beforeSingle+1);assert.equal(posts.at(-1).folder,'208');assert(!saved.has('111:201'));
  await external.click();await settings.getByLabel('同时收藏到默认收藏夹',{exact:true}).check();await settings.getByLabel('同时收藏的默认收藏夹',{exact:true}).selectOption('207');await external.click();const beforeCopy=posts.length;await begin(favorite);await drop('208');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('已取消收藏'));assert.equal(posts.length,beforeCopy+1);assert.equal(posts.at(-1).removed,'208');assert.equal(posts.at(-1).folder,'');assert(!saved.has('111:207'));report.scenarios.push('repeat removal does not add or remove default folder');
  await external.click();await settings.getByLabel('同时收藏的默认收藏夹',{exact:true}).selectOption('');for(const layer of ['2','1']){await settings.getByLabel('编辑轮盘层',{exact:true}).selectOption(layer);await settings.getByRole('button',{name:'删除当前层',exact:true}).click();}
  const folderPool=settings.locator('.wheel-pool');
  await folderPool.scrollIntoViewIfNeeded();
  for(let remaining=6;remaining>=0;remaining--){
   await settings.locator('.wheel-preview .slot[data-layer="0"]').first().dragTo(folderPool);
   await countIs(settings,remaining);
  }
  await addFolder(settings,202);await addFolder(settings,203);await external.click();
  await page.reload();await page.waitForSelector('#bili-language-player-button');await begin(favorite);await page.locator('#bili-gesture-host .item').first().waitFor();assert.equal(await page.locator('#bili-gesture-host .item').count(),2);await page.keyboard.press('Escape');await page.mouse.up();report.scenarios.push('dynamic layout survives reload');
  noDefault=true;const beforeMissing=posts.length;await begin(favorite);await drop('203');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('未找到默认收藏夹'));assert.equal(posts.length,beforeMissing);noDefault=false;report.scenarios.push('unrecognized default stops before any write');
  failPost=true;await begin(favorite);await drop('203');await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('测试：收藏失败'));assert(!saved.has('111:203'));report.scenarios.push('API failure is reported, no optimistic success');failPost=false;
  const count=posts.length;await begin(favorite);await page.evaluate(()=>history.pushState({},'', '/video/BVTESTB/'));await page.waitForTimeout(650);await page.mouse.up();assert.equal(posts.length,count);report.scenarios.push('navigation cancels pending selection');
  loggedIn=false;await page.goto('https://www.bilibili.com/video/BVTESTLOGIN/');await page.waitForSelector('#bili-language-player-button');await page.evaluate(()=>{window.nativeFavorites=0;document.querySelector('.video-fav').onclick=()=>nativeFavorites++;});const f=page.locator('.video-fav');const r=await f.boundingBox();await page.mouse.move(r.x+50,r.y+20);await page.mouse.down();await page.waitForFunction(()=>document.querySelector('#bili-gesture-host').shadowRoot.querySelector('#toast').textContent.includes('请先登录'));await page.mouse.up();assert.equal(await page.evaluate(()=>nativeFavorites),0);assert.equal(posts.length,count);report.scenarios.push('logged-out hold reports login without writing');
  assert.deepEqual(errors,[]);report.pass=true;report.apiWrites='intercepted fixtures only; no real account writes';fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log('PASS: '+report.scenarios.join('; '));
 }catch(error){report.pass=false;report.error=error.stack;report.diagnostic=await context.pages()[0]?.evaluate(()=>({initial:window.__INITIAL_STATE__,audio:document.getElementById('bili-dual-native')?.shadowRoot?.querySelector('#dual-status')?.textContent,tracks:document.getElementById('bili-dual-native')?.shadowRoot?.querySelector('#dual-tracks')?.textContent,ears:localStorage.getItem('bili-dual-ear-slots')})).catch(()=>null);report.pageErrors=errors;report.audioDiagnostic=await context.pages()[0]?.evaluate(()=>({video:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime,muted:v.muted,volume:v.volume})),audio:[...document.getElementById('bili-dual-native').shadowRoot.querySelectorAll('audio')].map(a=>({paused:a.paused,time:a.currentTime,ready:a.readyState}))})).catch(()=>null);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));await context.pages()[0]?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
 finally{await context.tracing.stop({path:path.join(output,'trace.zip')});await context.close();}
})().catch(e=>{console.error(e);process.exit(1)});
