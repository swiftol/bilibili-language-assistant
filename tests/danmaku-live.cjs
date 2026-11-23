const {chromium,project}=require('../scripts/test-env.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');

function varint(value){
 const bytes=[];
 do{bytes.push((value&127)|(value>127?128:0));value>>>=7;}while(value);
 return bytes;
}
function field(id,value){
 const bytes=Buffer.from(value);
 return [...varint(id*8+2),...varint(bytes.length),...bytes];
}
function pack(rows){
 return Buffer.from(rows.flatMap(([id,text])=>{
  const bytes=[...field(12,id),...field(7,text)];
  return [10,...varint(bytes.length),...bytes];
 }));
}

(async()=>{
 const extension=path.join(project,'extension');
 const context=await chromium.launchPersistentContext('',{
  executablePath:chromium.executablePath(),headless:true,viewport:{width:1200,height:900},
  args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--autoplay-policy=no-user-gesture-required']
 });
 try{
  const page=context.pages()[0],official=[];
  let unexpectedModelRequests=0,releaseJapanese;
  const japaneseReady=new Promise(resolve=>{releaseJapanese=resolve;});
  const cors={'access-control-allow-origin':'https://www.bilibili.com','access-control-allow-credentials':'true'};
  const original='这是一个比较长的弹幕测试内容，需要翻译成英文和日语';
  const data={
   zh:[['11','正在学日语'],['1','你好'],['2',original],['3','没有日语'],['4','重复'],['5','重复'],['6','完全缺失'],['9','不要跳字']],
   en:[['11','Studying Japanese'],['1','Hello'],['2','This is a long test comment that needs English and Japanese translation'],['3','No Japanese'],['4','Repeat'],['5','Again'],['9','Keep the current line']],
   ja:[['11','日本語を勉強します'],['1','こんにちは'],['2','これは英語と日本語への翻訳が必要な長い弾幕のテスト内容です'],['4','繰り返し'],['5','繰り返し'],['9','途中で変えない']]
  };
  await page.route('https://www.bilibili.com/**',route=>route.fulfill({contentType:'text/html',body:
   '<meta charset="utf-8"><style>.bpx-player-container{position:relative;width:800px;height:450px}video{width:800px;height:140px}.bili-danmaku-x-dm{font-size:24px;margin-bottom:55px;width:max-content}</style>'+
   '<div class="bpx-player-container"><video></video><div class="bpx-player-control-bottom"><div class="bpx-player-control-bottom-right"></div></div></div>'
  }));
  await page.route('https://api.bilibili.com/**',async route=>{
   const url=new URL(route.request().url());
   if(!url.pathname.endsWith('/seg.so'))return route.fulfill({json:{code:0,data:{}},headers:cors});
   const language=JSON.parse(url.searchParams.get('x-bili-locale-json')||'{}').c_locale?.language||'zh';
   const segment=url.searchParams.get('segment_index');
   const oid=url.searchParams.get('oid');
   official.push([segment,language]);
   if(segment==='1'&&language==='ja')await japaneseReady;
   if(segment==='2'&&language==='ja')return route.fulfill({status:503,headers:cors});
   const nextRows={zh:[['98','没那么低']],en:[['98','Not that low']],ja:[['98','そこまで低くない']]};
   const rows=oid==='2'?(language==='ja'&&!url.pathname.includes('/wbi/')?[]:nextRows[language]):segment==='2'?{zh:[['8','接口出错']],en:[['8','Endpoint error']]}[language]:
    segment==='3'?{zh:[['10','片尾']],en:[['10','The end']],ja:[['10','終わり']]}[language]:data[language];
   return route.fulfill({body:pack(rows),headers:cors});
  });
  await page.route('https://index-translate.bilibili.com/**',route=>{
   unexpectedModelRequests++;
   return route.abort();
  });

  await page.goto('https://www.bilibili.com/video/BVTEST/');
  const toggle=page.locator('#danmaku-translate-toggle');
  const fixed=page.locator('#danmaku-translate-fixed');
  const inline=page.locator('#danmaku-short-inline');
  async function setFlag(control,checked){
   await control.evaluate((el,value)=>{el.checked=value;el.dispatchEvent(new Event('change',{bubbles:true}));},checked);
  }
  const size=page.locator('#danmaku-font-zh');
  const gap=page.locator('#danmaku-line-gap');
  await toggle.waitFor({state:'attached'});
  assert.equal(await toggle.isChecked(),false);
  assert.equal(await inline.isChecked(),false);
  assert.equal(await fixed.isChecked(),true);
  assert.equal(await size.inputValue(),'75');
  const segment=index=>page.evaluate(index=>{
   const language=location.pathname.match(/^\/(en|ja)\//)?.[1];
   const url=new URL('https://api.bilibili.com/x/v2/dm/web/seg.so?oid=1&segment_index='+index);
   if(language)url.searchParams.set('x-bili-locale-json',JSON.stringify({c_locale:{language}}));
   return fetch(url,{credentials:'include'}).then(r=>r.arrayBuffer());
  },index);
  async function add(text){
   await page.evaluate(text=>{
    const node=document.createElement('div');
    node.className='bili-danmaku-x-dm';
    node.textContent=text;
    document.querySelector('.bpx-player-container').append(node);
   },text);
   const nodes=page.locator('.bili-danmaku-x-dm');
   return nodes.nth(await nodes.count()-1);
  }
  async function expectText(node,value){
   await page.waitForFunction(([element,text])=>element.textContent===text,[await node.elementHandle(),value],{timeout:8000});
  }
  const full=await add('你好');
  const partial=await add('没有日语');
  const repeated=await add('重复');
  const missing=await add('完全缺失');
  const frozen=await add('不要跳字');
  await frozen.evaluate(el=>el.classList.add('bili-danmaku-x-show'));
  await segment(1);
  await page.evaluate(()=>fetch('https://api.bilibili.com/x/v2/dm/web/view?oid=1&duration=892'));
  assert.deepEqual(official,[['1','zh']]);
  assert.equal(unexpectedModelRequests,0);
  const open=async()=>{
   if(!await toggle.isVisible()){
    const tab=page.getByRole('tab',{name:'设置',exact:true});
    if(!await tab.isVisible())await page.locator('#bili-language-player-button').click();
    await tab.click();
   }
  };
  await open();
  await setFlag(toggle,true);
  await expectText(partial,'没有日语\nNo Japanese');
  await expectText(full,'你好\nHello');
  releaseJapanese();
  await expectText(full,'你好\nHello\nこんにちは');
  await expectText(repeated,'重复\n繰り返し');
  assert.equal(await missing.innerText(),'完全缺失');
  assert.equal(await frozen.innerText(),'不要跳字');
  await frozen.evaluate(el=>el.classList.remove('bili-danmaku-x-show'));
  await expectText(frozen,'不要跳字\nKeep the current line\n途中で変えない');
  await page.evaluate(()=>{
   const player=document.querySelector('.bpx-player-container');
   window.danmakuPlayerInput=0;
   for(const type of ['pointerdown','pointerup','mousedown','mouseup','click']){
    player.addEventListener(type,event=>{if(event.isTrusted)window.danmakuPlayerInput++;},true);
   }
  });
  const kanaFixture=await add('正在学日语');
  await kanaFixture.evaluate(node=>{node.style.display='flex';node.style.setProperty('--fontSize','24px');});
  const kana=kanaFixture.locator('.bili-dm-kana');
  const fontPixels=node=>node.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  async function setSize(value,lang='zh'){
   await page.locator('#danmaku-font-'+lang).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  function rowBoxes(node){
   return node.locator('.bili-dm-translated-text > span').evaluateAll(rows=>rows.map(el=>{
    const {x,y,bottom}=el.getBoundingClientRect();
    return {x,y,bottom};
   }));
  }
  await expectText(kana,'日本語を勉強します');
  await kana.click();
  await kanaFixture.locator('.bili-dm-kana[aria-pressed=true]').waitFor({timeout:15000});
  assert.match(await kana.textContent(),/日本語（にほんご）/);
  assert.match(await kanaFixture.textContent(),/^正在学日语\nStudying Japanese\n/);
  assert.equal(await fontPixels(kanaFixture.locator('[lang=zh]')),18);
  assert.equal(await fontPixels(missing),24);
  await setSize(150);
  assert.equal(await fontPixels(kanaFixture.locator('[lang=zh]')),36);
  assert.equal(await fontPixels(missing),24);
  assert.equal(await kana.getAttribute('aria-pressed'),'true');
  await setSize(125,'en');
  await setSize(90,'ja');
  assert.equal(await fontPixels(kanaFixture.locator('[lang=en]')),30);
  assert(Math.abs(await fontPixels(kana)-21.6)<.01);
  assert.equal(await fontPixels(page.locator('.bili-dm-size-preview [lang=en]')),30);
  await setSize(75,'en');
  await setSize(75,'ja');
  assert.equal(await gap.inputValue(),'0');
  async function setGap(value){
   await gap.evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  const rows=await rowBoxes(kanaFixture);
  assert.equal(rows.length,3);
  assert(rows.every(row=>Math.abs(row.x-rows[0].x)<1));
  assert(rows[0].y<rows[1].y&&rows[1].y<rows[2].y);
  assert.equal(rows[1].y-rows[0].bottom,0);
  await setGap(9);
  const spaced=await rowBoxes(kanaFixture);
  assert.equal(spaced[1].y-spaced[0].bottom,9);
  assert.equal(spaced[2].y-spaced[1].bottom,9);
  assert.equal(await page.locator('.bili-dm-size-preview').evaluate(el=>getComputedStyle(el).rowGap),'9px');
  await setGap(0);
  await setSize(100);
  assert.equal(await fontPixels(kanaFixture.locator('[lang=zh]')),24);
  await setSize(75);
  await kana.click();
  await expectText(kana,'日本語を勉強します');
  assert.equal(await page.evaluate(()=>window.danmakuPlayerInput),0);
  const kanaPoint=await kana.evaluate(el=>{
   const rect=el.getBoundingClientRect(),player=el.closest('.bpx-player-container'),bounds=player.getBoundingClientRect();
   const top=document.createElement('div');
   top.className='bpx-player-top-wrap';
   top.style.cssText='position:absolute;z-index:100;left:'+(rect.left-bounds.left)+'px;top:'+(rect.top-bounds.top)+'px';
   top.innerHTML='<div class="bpx-player-top-left-title">视频名称</div><button class="bpx-player-follow" type="button">关注</button>';
   const title=top.firstElementChild,follow=title.nextElementSibling;
   title.style.cssText='width:'+(rect.width+90)+'px;height:'+rect.height+'px;background:#555';
   follow.style.cssText='position:absolute;top:0;left:0;width:24px;height:'+rect.height+'px';
   window.titleInput=0;
   window.followInput=0;
   title.onclick=()=>window.titleInput++;
   follow.onclick=()=>window.followInput++;
   player.append(top);
   return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,blankX:rect.right+70,followX:rect.left+12};
  });
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y).className,kanaPoint),'bpx-player-top-left-title');
  await page.mouse.click(kanaPoint.x,kanaPoint.y);
  await page.waitForFunction(el=>el.getAttribute('aria-pressed')==='true',await kana.elementHandle());
  assert.equal(await page.evaluate(()=>window.titleInput),0);
  assert.equal(await page.evaluate(()=>window.danmakuPlayerInput),0);
  await page.mouse.click(kanaPoint.x,kanaPoint.y);
  await expectText(kana,'日本語を勉強します');
  await page.mouse.click(kanaPoint.blankX,kanaPoint.y);
  assert.equal(await page.evaluate(()=>window.titleInput),1);
  await page.mouse.click(kanaPoint.followX,kanaPoint.y);
  assert.equal(await page.evaluate(()=>window.followInput),1);
  await expectText(kana,'日本語を勉強します');
  await page.locator('.bpx-player-top-wrap').evaluate(el=>el.remove());
  const long=await add(original);
  await page.waitForFunction(element=>element.hasAttribute('data-bili-dm-rendered'),await long.elementHandle());
  assert.equal((await long.textContent()).split('\n').length,3);
  assert.equal(await fontPixels(long.locator('[lang=zh]')),18);

  const ending=await add('片尾');
  await expectText(ending,'片尾\nThe end\n終わり');
  await page.evaluate(()=>{
   const node=document.createElement('div');
   node.className='bili-danmaku-x-dm';
   node.innerHTML='<span class="bili-danmaku-x-high-icon">+1</span><span class="bili-danmaku-x-high-text">你好</span>';
   node.style.cssText='position:absolute;top:0;left:0';
   const player=document.querySelector('.bpx-player-container');
   player.append(node);
   const other=document.createElement('div');
   other.className='bili-danmaku-x-dm';
   other.textContent='没有对应译文的弹幕';
   other.style.cssText='position:absolute;top:0;left:0';
   player.append(other);
  });
  const highlighted=page.locator('.bili-danmaku-x-high-text');
  await expectText(highlighted,'你好\nHello\nこんにちは');
  assert.equal(await page.locator('.bili-danmaku-x-high-icon').textContent(),'+1');
  assert(official.some(([index,language])=>index==='3'&&language==='ja'));
  const failedLanguage=await add('接口出错');
  await expectText(failedLanguage,'接口出错\nEndpoint error');
  assert.equal(unexpectedModelRequests,0);
  await open();
  await setFlag(inline,true);
  await expectText(full,'你好　|　Hello　|　こんにちは');
  await expectText(partial,'没有日语　|　No Japanese');
  assert.equal((await long.textContent()).split('\n').length,3);
  await setFlag(inline,false);
  await expectText(full,'你好\nHello\nこんにちは');
  for(const lang of ['zh','en','ja'])await setSize(100,lang);
  await page.evaluate(()=>{
   const layer=document.createElement('div');
   layer.id='density-test';
   layer.className='bpx-player-row-dm-wrap';
   layer.style.cssText='position:absolute;top:0;left:10px;width:500px;height:260px;overflow:hidden';
   for(const [text,top] of [['你好',0],['正在学日语',28],['没有对应译文',56]]){
    const el=document.createElement('div');
    el.className='bili-danmaku-x-dm';
    el.style.cssText='position:absolute;margin:0;left:8px;top:'+top+'px;font-size:24px;line-height:1;white-space:nowrap;--fontSize:24px';
    el.textContent=text;
    layer.append(el);
   }
   document.querySelector('.bpx-player-container').append(layer);
  });
  const density=page.locator('#density-test'),densityRows=density.locator('.bili-danmaku-x-dm');
  await expectText(densityRows.nth(0),'你好\nHello\nこんにちは');
  await expectText(densityRows.nth(1),'正在学日语\nStudying Japanese\n日本語を勉強します');
  await densityRows.evaluateAll(rows=>rows.forEach(el=>el.classList.add('bili-danmaku-x-show')));
  async function expectClear(translated){
   await page.waitForFunction(translated=>{
    const container=document.getElementById('density-test'),rows=[...container.children];
    if(container.querySelectorAll('.bili-dm-translated-text').length!==translated)return false;
    const rects=rows.map(el=>el.getBoundingClientRect()).sort((a,b)=>a.top-b.top);
    const bounds=container.getBoundingClientRect();
    return rects.every((rect,index)=>rect.top>=bounds.top-.5&&rect.bottom<=bounds.bottom+.5&&
     (!index||rect.top>=rects[index-1].bottom));
   },translated,{timeout:6000});
  }
  await expectClear(2);
  assert.equal(await densityRows.nth(2).getAttribute('data-bili-dm-lane'),null);
  const lanes=await densityRows.evaluateAll(rows=>rows.map(el=>el.getAttribute('data-bili-dm-lane')));
  await densityRows.nth(2).evaluate(el=>el.style.left='350px');
  await page.waitForTimeout(180);
  assert.deepEqual(await densityRows.evaluateAll(rows=>rows.map(el=>el.getAttribute('data-bili-dm-lane'))),lanes);
  await densityRows.evaluateAll(rows=>rows.forEach(el=>{el.classList.remove('bili-danmaku-x-show');el.style.left='8px';}));
  await density.evaluate(el=>el.style.height='85px');
  await page.waitForTimeout(80);
  await densityRows.evaluateAll(rows=>rows.forEach(el=>el.classList.add('bili-danmaku-x-show')));
  await expectClear(0);
  for(const [index,text] of ['你好','正在学日语'].entries()){
   assert.equal(await densityRows.nth(index).textContent(),text);
   assert.equal(await densityRows.nth(index).evaluate(el=>el.firstChild.nodeType),3);
  }
  await density.evaluate(el=>el.style.height='260px');
  await expectClear(0);
  await density.evaluate(el=>el.remove());
  const vertical=await add('你好');
  await vertical.evaluate(el=>{
   const fresh=el.cloneNode(false);
   fresh.textContent='你好';
   fresh.style.writingMode='vertical-rl';
   el.replaceWith(fresh);
  });
  await page.waitForTimeout(550);
  assert.equal(await vertical.textContent(),'你好');
  assert.equal(await vertical.locator('.bili-dm-translated-text').count(),0);
  await vertical.evaluate(el=>el.remove());
  await page.evaluate(()=>{
   const layer=document.createElement('div');
   layer.id='one-line-overlap-test';layer.className='bpx-player-row-dm-wrap';
   layer.style.cssText='position:absolute;top:0;left:10px;width:500px;height:260px;overflow:hidden';
   const animation=document.createElement('style');
   animation.textContent='@keyframes roll{to{transform:translateX(var(--translateX))}}';
   layer.append(animation);
   const create=(content,top,left,distance)=>{
    const row=document.createElement('div');
    row.className='bili-danmaku-x-dm bili-danmaku-x-roll';
    row.style.cssText='position:absolute;margin:0;font-size:24px;line-height:1;white-space:nowrap;left:'+left+'px;top:'+top+'px;--translateX:'+distance+'px';
    row.textContent=content;
    layer.append(row);
   };
   create('正在学日语',0,8,-12);
   create('你好',48,455,-550);
   document.querySelector('.bpx-player-container').append(layer);
  });
  const oneLine=page.locator('#one-line-overlap-test .bili-danmaku-x-dm');
  await expectText(oneLine.nth(1),'你好\nHello\nこんにちは');
  const startRolling=row=>row.evaluate(el=>{
   el.classList.add('bili-danmaku-x-show');
   el.style.animation='roll 2s linear forwards';
  });
  await startRolling(oneLine.nth(0));
  await page.waitForTimeout(70);
  const firstY=(await oneLine.nth(0).boundingBox()).y;
  await startRolling(oneLine.nth(1));
  await page.waitForFunction(()=>{
   const [a,b]=document.querySelectorAll('#one-line-overlap-test .bili-danmaku-x-dm');
   return b.getBoundingClientRect().top>=a.getBoundingClientRect().bottom;
  });
  assert.equal((await oneLine.nth(0).boundingBox()).y,firstY);
  const lane=await oneLine.nth(1).getAttribute('data-bili-dm-lane');
  await page.waitForTimeout(400);
  assert.equal(await oneLine.nth(1).getAttribute('data-bili-dm-lane'),lane);
  assert.equal(await page.locator('#one-line-overlap-test [data-bili-dm-folded]').count(),0);
  // Even a surprise overlap during playback must not strip rows from a visible comment.
  await oneLine.nth(1).evaluate(el=>{el.style.animation='none';el.style.left='20px';el.style.top='20px';});
  await page.waitForTimeout(200);
  await expectText(oneLine.nth(0),'正在学日语\nStudying Japanese\n日本語を勉強します');
  await expectText(oneLine.nth(1),'你好\nHello\nこんにちは');
  assert.equal(await page.locator('#one-line-overlap-test [data-bili-dm-folded]').count(),0);
  assert.equal(await oneLine.nth(1).getAttribute('data-bili-dm-lane'),lane);
  await page.locator('#one-line-overlap-test').evaluate(el=>el.remove());
  const collapse=page.getByRole('button',{name:'收起字幕与声音面板'});
  if(await collapse.isVisible())await collapse.click();
  assert.equal(await page.locator('[data-bili-dm-hold]').count(),0);
  await page.evaluate(()=>{
   const layer=document.createElement('div');
   layer.id='fixed-kana-hold-test';layer.className='bpx-player-row-dm-wrap';
   layer.style.cssText='position:absolute;top:0;left:10px;width:520px;height:140px';
   const node=document.createElement('div');
   node.id='fixed-kana-source';node.className='bili-danmaku-x-dm bili-danmaku-x-center';
   node.textContent='正在学日语';
   node.style.cssText='position:absolute;top:12px;left:24px;font-size:24px;margin:0';
   layer.append(node);document.querySelector('.bpx-player-container').append(layer);
  });
  const source=page.locator('#fixed-kana-source'),held=page.locator('[data-bili-dm-hold]');
  await source.locator('.bili-dm-kana').waitFor();
  await source.evaluate(el=>el.classList.add('bili-danmaku-x-show'));
  const originalBox=await source.boundingBox();
  await source.locator('.bili-dm-kana').click();
  const heldJapanese=held.locator('.bili-dm-kana');
  await heldJapanese.waitFor();
  assert(await source.getAttribute('data-bili-dm-held')!==null);
  // Simulate the renderer recycling the original node immediately after the click.
  await source.evaluate(el=>{el.textContent='another danmaku';});
  await page.waitForFunction(()=>!document.getElementById('fixed-kana-source').hasAttribute('data-bili-dm-held'));
  await held.locator('.bili-dm-kana[aria-pressed=true]').waitFor();
  assert.match(await heldJapanese.textContent(),/日本語（にほんご）/);
  assert.equal(await held.locator('[lang=zh]').textContent(),'正在学日语');
  assert.equal(await held.locator('[lang=en]').textContent(),'Studying Japanese');
  const heldCopy=held.locator('.bili-danmaku-x-dm');
  const heldBox=await heldCopy.boundingBox();
  assert(Math.abs(heldBox.y-originalBox.y)<1);
  await heldJapanese.click();
  await expectText(heldJapanese,'日本語を勉強します');
  await heldJapanese.click();
  await held.locator('.bili-dm-kana[aria-pressed=true]').waitFor();
  await page.waitForTimeout(3100);
  assert(await heldJapanese.isVisible());
  await held.waitFor({state:'detached',timeout:2200});
  await page.locator('#fixed-kana-hold-test').evaluate(el=>el.remove());
  await page.evaluate(()=>{
   const layer=document.createElement('div');
   layer.id='fixed-stack-test';layer.className='bpx-player-row-dm-wrap';
   layer.style.cssText='position:absolute;top:0;left:10px;width:650px;height:275px';
   for(const [text,left] of [['你好',30],['正在学日语',380]]){
    const dm=document.createElement('div');
    dm.className='bili-danmaku-x-dm bili-danmaku-x-center';
    dm.style.cssText='position:absolute;top:10px;left:'+left+'px;font-size:24px;line-height:1;margin:0';
    dm.textContent=text;layer.append(dm);
   }
   document.querySelector('.bpx-player-container').append(layer);
  });
  const fixedStack=page.locator('#fixed-stack-test'),stackItems=fixedStack.locator('.bili-danmaku-x-dm');
  await expectText(stackItems.first(),'你好\nHello\nこんにちは');
  await stackItems.first().evaluate(el=>el.classList.add('bili-danmaku-x-show'));
  await stackItems.first().locator('[lang=ja]').waitFor();
  const firstTop=(await stackItems.first().boundingBox()).y;
  await stackItems.last().evaluate(el=>el.classList.add('bili-danmaku-x-show'));
  await page.waitForFunction(()=>{
   const [first,second]=document.querySelectorAll('#fixed-stack-test .bili-danmaku-x-dm');
   return first.hasAttribute('data-bili-dm-center')&&second.hasAttribute('data-bili-dm-center')&&second.getBoundingClientRect().top>=first.getBoundingClientRect().bottom;
  },null,{timeout:6000});
  const groups=await stackItems.evaluateAll(elements=>elements.map(el=>[...el.querySelectorAll('[lang]')].map(row=>{
   const b=row.getBoundingClientRect();
   return (b.left+b.right)/2;
  })));
  const bounds=await fixedStack.boundingBox();
  assert(groups.every(group=>group.length===3&&group.every(x=>Math.abs(x-bounds.x-bounds.width/2)<1)));
  assert.equal((await stackItems.first().boundingBox()).y,firstTop);
  await fixedStack.evaluate(layer=>layer.remove());
  await open();
  await setFlag(fixed,false);
  await page.evaluate(()=>{
   const layer=document.createElement('div');
   layer.id='fixed-test';
   layer.className='bpx-player-row-dm-wrap';
   layer.style.cssText='position:absolute;top:0;left:10px;width:500px;height:280px';
   for(const [kind,top] of [['center',0],['high-top',194],['roll',15]]){
    const el=document.createElement('div');
    el.className='bili-danmaku-x-dm bili-danmaku-x-'+kind;
    el.style.cssText='position:absolute;margin:0;left:30px;top:'+top+'px;font-size:24px;line-height:1;white-space:nowrap';
    el.textContent='你好';
    layer.append(el);
   }
   document.querySelector('.bpx-player-container').append(layer);
  });
  const fixedRows=page.locator('#fixed-test > div');
  const stacked='你好\nHello\nこんにちは';
  await expectText(fixedRows.nth(2),stacked);
  await fixedRows.evaluateAll(rows=>rows.forEach(el=>el.classList.add('bili-danmaku-x-show')));
  await page.waitForFunction(()=>document.querySelector('#fixed-test .bili-danmaku-x-roll').hasAttribute('data-bili-dm-lane'));
  const pinnedLayout=()=>fixedRows.evaluateAll(rows=>rows.slice(0,2).map(el=>({
   y:el.getBoundingClientRect().top,offset:el.getAttribute('data-bili-dm-lane')
  })));
  const originalPositions=await pinnedLayout();
  assert(originalPositions.every(row=>row.offset===null));
  assert.deepEqual((await fixedRows.allTextContents()).slice(0,2),['你好','你好']);
  const rollingOffset=await fixedRows.nth(2).getAttribute('data-bili-dm-lane');
  await fixedRows.nth(2).evaluate(el=>el.style.left='365px');
  await open();
  await setFlag(fixed,true);
  await expectText(fixedRows.nth(0),stacked);
  await expectText(fixedRows.nth(1),stacked);
  await page.waitForTimeout(130);
  assert.deepEqual(await pinnedLayout(),originalPositions);
  await setFlag(fixed,false);
  await expectText(fixedRows.nth(0),'你好');
  await expectText(fixedRows.nth(1),'你好');
  await expectText(fixedRows.nth(2),stacked);
  assert.equal(await fixedRows.nth(2).getAttribute('data-bili-dm-lane'),rollingOffset);
  await fixedRows.nth(2).evaluate(el=>el.classList.replace('bili-danmaku-x-roll','bili-danmaku-x-center'));
  await expectText(fixedRows.nth(2),'你好');
  assert.equal(await fixedRows.nth(2).getAttribute('data-bili-dm-lane'),null);
  await page.locator('#fixed-test').evaluate(el=>el.remove());
  await open();
  await setFlag(toggle,false);
  assert.equal(await full.textContent(),'你好');
  assert.equal(await highlighted.textContent(),'你好');
  assert.equal(await kanaFixture.textContent(),'正在学日语');
  assert.equal(await kana.count(),0);
  assert.equal(await long.textContent(),original);
  assert.equal(await failedLanguage.textContent(),'接口出错');
  await setFlag(inline,true);
  await setFlag(fixed,true);
  await setSize(135);
  await setSize(112,'ja');
  await setGap(11);
  await page.reload();
  await inline.waitFor({state:'attached'});
  assert.equal(await inline.isChecked(),true);
  assert.equal(await fixed.isChecked(),true);
  assert.equal(await size.inputValue(),'135');
  assert.equal(await page.locator('#danmaku-font-ja').inputValue(),'112');
  assert.equal(await gap.inputValue(),'11');
  await page.evaluate(()=>localStorage.setItem('bili-danmaku-short-inline','false'));
  for(const [locale,native] of [['ja','日本語を勉強します'],['en','Studying Japanese']]){
   await page.goto('https://www.bilibili.com/'+locale+'/video/BVTEST/');
   await toggle.waitFor({state:'attached'});
   await open();
   await setFlag(toggle,true);
   await segment(1);
   const localized=await add(native);
   await expectText(localized,'正在学日语\nStudying Japanese\n日本語を勉強します');
   await open();
   await setFlag(toggle,false);
   assert.equal(await localized.textContent(),native);
  }
  await page.goto('https://www.bilibili.com/ja/video/BVTEST/');
  await toggle.waitFor({state:'attached'});
  await open();
  await setFlag(toggle,true);
  await segment(1);
  const previous=await add('日本語を勉強します');
  await expectText(previous,'正在学日语\nStudying Japanese\n日本語を勉強します');
  await page.evaluate(async()=>{
   history.pushState({},'','/ja/video/BVNEXT/?vd_source=new');
   const emit=()=>document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({
    type:'media',page:location.pathname,data:{cid:'2',aid:'20',duration:70}
   })}));
   await fetch('https://api.bilibili.com/x/v2/dm/web/seg.so?oid=1&segment_index=1');
   emit();
   const url='https://api.bilibili.com/x/v2/dm/wbi/web/seg.so?oid=2&segment_index=1&x-bili-locale-json='+encodeURIComponent(JSON.stringify({c_locale:{language:'ja'}}));
   await fetch(url).then(response=>response.arrayBuffer());
  });
  await expectText(previous,'日本語を勉強します');
  const next=await add('そこまで低くない');
  await expectText(next,'没那么低\nNot that low\nそこまで低くない');
  await page.evaluate(()=>history.replaceState({},'','?vd_source=another&spm_id_from=tracking'));
  await page.waitForTimeout(550);
  await expectText(next,'没那么低\nNot that low\nそこまで低くない');
  console.log('PASS: fixed danmaku kana click holds all languages for four seconds across native node reuse; fixed danmaku retain native positions, independent translation toggle persists, rolling lanes stay unchanged on toggle; video switch resets stale CID, URL tracking changes preserve data, native response and different official batches join by ID; language-specific native text joins the same official danmaku ID; live row spacing and persisted preview setting, collision-free spacing and native fallback in crowded lanes, adjustable and persisted translated font, true three-row layout inside flex, left click shows and restores Japanese readings through the title overlay while preserving other controls, whole-video prefetch without seeking, stable onscreen text, default stacked layout and persisted inline toggle; official locales render independently, conflicting duplicate falls back to the other official locale, missing translations stay original, no model requests, toggle restores original');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
