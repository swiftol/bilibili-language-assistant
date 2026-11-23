const {chromium}=require('../scripts/test-env.cjs'),path=require('path'),assert=require('assert');(async()=>{const ext=path.resolve('extension'),c=await chromium.launchPersistentContext('',{headless:true,executablePath:chromium.executablePath(),args:['--disable-extensions-except='+ext,'--load-extension='+ext]});try{await c.route(/https:\/\/(www|t|space)\.bilibili\.com\//,r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><div>字体设置测试</div>'}));const p=c.pages()[0];await p.goto('https://www.bilibili.com/');await p.locator('[data-font-page=dynamic][data-font-language=ja]').waitFor({state:'attached'});await p.locator('[data-font-page=dynamic][data-font-language=ja]').evaluate(e=>{e.value='18';e.dispatchEvent(new Event('change'));});
const spacing=page=>page.locator('#bili-page-font-settings-gap');
const selectRegion=(page,region)=>page.locator('#bili-page-font-settings select').evaluate((input,value)=>{
 input.value=value;
 input.dispatchEvent(new Event('change'));
},region);
await selectRegion(p,'dynamic');
assert.equal(await spacing(p).inputValue(),'0');
await spacing(p).evaluate(el=>{
 el.value='14';
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
});
await p.waitForTimeout(400);const q=await c.newPage();await q.goto('https://t.bilibili.com/');await q.locator('[data-font-page=dynamic][data-font-language=ja]').waitFor({state:'attached'});await q.waitForTimeout(500);assert.equal(await q.locator('[data-font-page=dynamic][data-font-language=ja]').inputValue(),'18');await q.locator('[data-font-page=home][data-font-language=en]').evaluate(e=>{e.value='11';e.dispatchEvent(new Event('change'));});await p.waitForTimeout(500);assert.equal(await p.locator('[data-font-page=home][data-font-language=en]').inputValue(),'11');assert.equal(await p.locator('[data-font-page=dynamic][data-font-language=ja]').inputValue(),'18');
await selectRegion(q,'dynamic');assert.equal(await spacing(q).inputValue(),'14');
await selectRegion(q,'home');assert.equal(await spacing(q).inputValue(),'0');
await selectRegion(q,'dynamic');assert.equal(await spacing(q).inputValue(),'14');
console.log('PASS real packaged extension: per-region line spacing and font settings sync www <-> t.bilibili.com independently');}finally{await c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
