const {chromium,project}=require('../scripts/test-env.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
  await page.route('https://www.bilibili.com/**',route=>route.fulfill({contentType:'text/html',body:
   '<style>body{margin:0;background:white}video{display:block;width:800px;height:450px}</style><div><video></video></div>'
  }));
  await page.goto('https://www.bilibili.com/video/BVFixture/');
  await page.evaluate(()=>{
   localStorage.setItem('bili-dual-subtitle-tray-v5',JSON.stringify({
    centered:false,selected:['en','ja'],positions:{multi:{en:{x:42,y:54},ja:{x:55,y:57}}}
   }));
   window.fixtureTime=0;
   Object.defineProperty(document.querySelector('video'),'currentTime',{get:()=>window.fixtureTime});
   document.addEventListener('bili-dual-load-subtitle',event=>{
    const {language}=JSON.parse(event.detail);
    const content=language==='en'?'First subtitle line\nSecond subtitle line':'日本語の字幕テストです';
    document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({
     type:'subtitle-body',page:location.pathname,data:{language,body:[{from:0,to:language==='en'?20:10,content}]}
    })}));
   });
  });
  await page.addScriptTag({path:path.join(project,'extension/native.js')});
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({
   type:'subtitles',page:location.pathname,data:['en','ja'].map(language=>({language,url:'https://fixture.test/'+language}))
  })})));
  const en=page.locator('.cue[data-language=en]'),ja=page.locator('.cue[data-language=ja]');
  await en.waitFor();
  await ja.waitFor();

  async function verifyGeometry(){
   const cues=await page.locator('.cue:not([hidden])').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON()));
   const backgrounds=await page.locator('.cue-backdrop:not([hidden])').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON()));
   assert.deepEqual(backgrounds,cues);
   return cues;
  }
  const [a,b]=await verifyGeometry();
  const overlapY=Math.round((Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2);
  assert(overlapY>a.top+4&&overlapY<b.top+4+Math.min(a.height,b.height));
  assert(a.left+10<b.left&&b.right-10>a.right);
  const points=[[24,24],[Math.round(a.left+8),overlapY],[Math.round(b.left+8),overlapY],[Math.round(b.right-8),overlapY]];
  await page.evaluate(()=>{
   const style=document.createElement('style');
   style.id='sample-background';
   style.textContent='.cue{color:transparent;text-shadow:none}';
   document.getElementById('bili-dual-subtitle-overlay').shadowRoot.append(style);
  });
  const screenshot=await page.screenshot();
  const colors=await page.evaluate(async({png,points})=>{
   const blob=await (await fetch('data:image/png;base64,'+png)).blob();
   const image=await createImageBitmap(blob);
   const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
   ctx.canvas.width=image.width;
   ctx.canvas.height=image.height;
   ctx.drawImage(image,0,0);
   return points.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data));
  },{png:screenshot.toString('base64'),points});
  assert.deepEqual(colors,[[255,255,255,255],[119,119,119,255],[119,119,119,255],[119,119,119,255]]);

  await page.locator('#sample-background').evaluate(el=>el.remove());
  const x=a.left+10,y=a.top+10;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+36,y-45,{steps:5});
  await page.mouse.up();
  const [moved]=await verifyGeometry();
  assert(moved.x>a.x+30&&moved.y<a.y-40);

  await page.evaluate(()=>window.fixtureTime=12);
  await ja.waitFor({state:'hidden'});
  const remaining=await verifyGeometry();
  assert.equal(remaining.length,1);
  assert(await en.isVisible());
  console.log('PASS: screenshot pixels match across both individual backdrops and their overlap; wrapping, dragging and cue expiry keep backgrounds aligned');
 }finally{
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
