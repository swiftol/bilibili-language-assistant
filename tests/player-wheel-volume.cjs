const {chromium,project}=require('../scripts/test-env.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
 const ext=path.join(project,'extension');
 const context=await chromium.launchPersistentContext('',{
  headless:true,executablePath:chromium.executablePath(),viewport:{width:1200,height:800},
  args:['--disable-extensions-except='+ext,'--load-extension='+ext]
 });
 try{
  const page=context.pages()[0];
  await page.route('https://www.bilibili.com/**',route=>route.fulfill({contentType:'text/html',body:
   '<meta charset="utf-8"><style>body{height:2400px}.bpx-player-container{position:relative;width:800px;height:450px}.bpx-player-video-area,video{width:100%;height:400px}.bpx-player-control-bottom{height:50px}.bpx-player-container:fullscreen{width:100vw;height:100vh}</style>'+
   '<div class="bpx-player-container" data-screen="normal"><div class="bpx-player-video-area"><video></video></div><div class="bpx-player-control-bottom"><div class="bpx-player-control-bottom-right"><button id="fullscreen">全屏</button></div></div></div>'
  }));
  await page.route('https://api.bilibili.com/**',route=>route.fulfill({json:{code:0,data:{}},headers:{'access-control-allow-origin':'https://www.bilibili.com','access-control-allow-credentials':'true'}}));
  await page.addInitScript(()=>{
   localStorage.setItem('bili-dual-subtitle-tray-v5',JSON.stringify({selected:['en','ja']}));
   document.addEventListener('bili-dual-load-subtitle',event=>{
    const {language}=JSON.parse(event.detail);
    document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({
     type:'subtitle-body',page:location.pathname,data:{language,body:[
      {from:0,to:5,content:language+' line A'},{from:5,to:10,content:language+' line B'}
     ]}
    })}));
   });
  });
  await page.goto('https://www.bilibili.com/video/BVFixture/');
  await page.locator('#bili-language-player-button').waitFor();
  await page.evaluate(()=>{
   const player=document.querySelector('.bpx-player-container'),video=player.querySelector('video');
   video.volume=.5;
   window.nativeWheelEvents=0;
   document.addEventListener('mousewheel',event=>{
    if(event.target!==video)return;
    window.nativeWheelEvents++;
    if(player.dataset.screen!=='web'&&!document.fullscreenElement)return;
    event.preventDefault();
    video.volume=event.wheelDelta>0?.57:.43;
   },{passive:false});
   document.querySelector('#fullscreen').onclick=()=>player.requestFullscreen();
   document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({
    type:'subtitles',page:location.pathname,data:['en','ja'].map(language=>({language,url:'https://fixture.test/'+language}))
   })}));
  });
  const video=page.locator('video');
  async function wheel(x,y,dy){
   await page.mouse.move(x,y);
   await page.mouse.wheel(0,dy);
   await page.waitForTimeout(100);
  }
  const volume=()=>video.evaluate(el=>el.volume);
  const screen=mode=>page.locator('.bpx-player-container').evaluate((el,mode)=>{el.dataset.screen=mode;},mode);
  const nativeCalls=()=>page.evaluate(()=>window.nativeWheelEvents);
  for(const mode of ['normal','wide']){
   await screen(mode);
   await page.evaluate(()=>scrollTo(0,0));
   const calls=await nativeCalls();
   await wheel(100,100,120);
   await page.waitForFunction(()=>scrollY>0);
   assert.equal(await volume(),.5);
   assert.equal(await nativeCalls(),calls+1);
  }
  await screen('web');
  await page.evaluate(()=>scrollTo(0,0));
  const calls=await nativeCalls();
  await wheel(100,100,-120);
  assert.equal(await volume(),.57);
  assert.equal(await nativeCalls(),calls+1);
  assert.equal(await page.evaluate(()=>scrollY),0);
  assert.equal(await page.locator('#bili-wheel-volume-hint').count(),0);
  await screen('normal');

  await page.locator('.cue[data-language=en]').click();
  const review=page.locator('#subtitle-review');
  const bounds=await review.boundingBox();
  assert(bounds);
  await wheel(bounds.x+30,bounds.y+40,120);
  assert((await review.locator('.current').innerText()).includes('en line B'));
  assert.equal(await volume(),.57);
  await review.getByRole('button',{name:'关闭字幕回看'}).click();

  await page.locator('#fullscreen').click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  await wheel(100,100,120);
  assert.equal(await volume(),.43);
  await page.evaluate(()=>document.exitFullscreen());
  await page.waitForFunction(()=>!document.fullscreenElement);
  await wheel(100,100,120);
  await page.waitForFunction(()=>scrollY>0);
  assert.equal(await volume(),.43);
  console.log('PASS: normal/wide player scrolls, web/fullscreen wheel reaches native handler once, subtitle review keeps wheel navigation');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
