const {chromium}=require('../scripts/test-env.cjs'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()});
 try{
  const page=await browser.newPage();
  await page.route('https://t.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:`
   <meta charset="utf-8"><style>.bili-dyn-item{width:420px;font:16px monospace}</style>
   <div class="bili-dyn-item"><div class="bili-dyn-content">
   <div class="bili-dyn-content__forw__desc"><div class="bili-rich-text__content">转发感想</div></div>
   <div class="bili-dyn-content__orig__desc"><div class="bili-rich-text__content">原动态的中文正文</div><button>展开原文</button></div>
   </div></div>`}));
  const row=(id,text)=>({id_str:id,modules:{module_dynamic:{desc:{text}}}});
  const post={zh:{...row('123','转发感想'),orig:row('456','原动态的中文正文')},en:{...row('123','Short comment'),orig:row('456','Some words in a long English translation. '.repeat(6))},ja:{...row('123','短い感想'),orig:row('456','翻訳された日本語の文章が表示されます。'.repeat(9))}};
  await page.route('https://api.bilibili.com/**',r=>{
   const lang=JSON.parse(new URL(r.request().url()).searchParams.get('x-bili-locale-json')).c_locale.language;
   return r.fulfill({headers:{'access-control-allow-origin':'https://t.bilibili.com','access-control-allow-credentials':'true'},json:{code:0,data:{item:post[lang]}}});
  });
  await page.goto('https://t.bilibili.com/');
  await page.locator('.bili-dyn-item').evaluate((el,post)=>{el.__vue__={data:post};},post.zh);
  await page.addScriptTag({path:path.resolve('extension/bilingual.js')});
  const orig=page.locator('.bili-dyn-content__orig__desc'),line=orig.locator('.bili-ja-zh-original');
  const short=page.locator('.bili-dyn-content__forw__desc .bili-ja-zh-original');
  const expand=orig.getByRole('button',{name:/展开翻译/});
  await expand.waitFor({timeout:10000});
  assert(await line.isHidden());
  assert(await short.isVisible());
  assert(await orig.getByText('原动态的中文正文',{exact:true}).isVisible());
  assert(await orig.getByRole('button',{name:'展开原文',exact:true}).isVisible());
  await expand.click();
  assert(await line.isVisible());
  const counts=await line.locator('[lang] > span').evaluateAll(spans=>spans.map(span=>{
   const range=document.createRange();range.selectNodeContents(span);
   return new Set([...range.getClientRects()].map(rect=>Math.round(rect.top))).size;
  }));
  assert(counts.every(n=>n<=10)&&counts.reduce((sum,n)=>sum+n,0)>10,JSON.stringify(counts));
  await orig.getByRole('button',{name:'收起翻译'}).click();
  assert(await line.isHidden());
  await page.locator('#bili-translation-fold-limit').fill('30');
  await page.locator('#bili-translation-fold-limit').press('Tab');
  await line.waitFor();
  assert.equal(await expand.count(),0);
  console.log('PASS: forwarded dynamic folds combined wrapped rows '+counts.join('+')+', original and short text visible, expand/collapse and configurable threshold');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
