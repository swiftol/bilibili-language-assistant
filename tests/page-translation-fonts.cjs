const {chromium} = require('../scripts/test-env.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: chromium.executablePath()});
  const page = await browser.newPage({viewport: {width: 1000, height: 800}});
  const sizeOf = locator => locator.evaluate(el => getComputedStyle(el).fontSize);
  const fontInput = (area, lang) => page.locator('[data-font-page='+area+'][data-font-language='+lang+']');
  const webpage = page.getByRole('combobox', {name: '字号区域'});
  async function load(url) {
    await page.goto(url);
    await page.evaluate(() => {
      const root = document.querySelector('bili-comments').attachShadow({mode: 'open'});
      const renderer = document.createElement('bili-comment-renderer');
      renderer.data = {rpid_str: '999', oid: 123, root: 0, content: {message: '不能'}};
      const rich = document.createElement('bili-rich-text');
      rich.attachShadow({mode: 'open'}).innerHTML = '<style>#contents{font-size:14px}</style><p id="contents">不能</p>';
      renderer.attachShadow({mode: 'open'}).append(rich);
      root.append(renderer);
    });
    await page.addScriptTag({path: path.resolve('extension/bilingual.js')});
    await page.locator('.bili-video-card .bili-ja-zh-original [lang=en]').waitFor();
  }
  async function changeFont(area, lang, value) {
    if (area!=='comments') await webpage.selectOption(area);
    const input = fontInput(area, lang);
    await input.fill(value);
    if (value) assert.equal(await sizeOf(page.locator((area==='comments'?'#bili-comment-font-preview':'#bili-page-font-preview')+' [lang='+lang+']')), value+'px');
    await input.press('Tab');
  }
  try {
    await page.route('https://www.bilibili.com/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<meta charset="utf-8"><style>.bili-video-card{width:300px}h1{font-size:22px}</style>'+
        '<div class="video-info-container"><div class="video-info-title"><h1 class="video-title">中文标题</h1></div></div>'+
        '<div class="bili-video-card"><a href="/video/BVTEST/"><div class="bili-video-card__info--tit">中文标题</div></a></div>'+
        '<div class="recommend-video-card"><div class="info"><a class="title" href="/video/BVTEST/">中文标题</a></div></div>'+
        '<bili-comments data-params="1,123"></bili-comments>'
    }));
    await page.route('https://api.bilibili.com/**', route => {
      const url = new URL(route.request().url());
      const lang = JSON.parse(url.searchParams.get('x-bili-locale-json') || '{}').c_locale?.language || 'zh';
      const title = {zh: '中文标题', en: 'A long English title that should remain readable and limited to two lines on the home page.', ja: 'これは非常に長い日本語の動画タイトルでありホームページでは二行だけを表示します。'}[lang];
      const data = url.pathname.includes('/reply') ?
        {root: {rpid_str: '999', oid: 123, content: {message: '不能'}, translated_content: {message: lang==='ja'?'できない':"Can't"}}} :
        {bvid: 'BVTEST', title};
      return route.fulfill({headers: {'access-control-allow-origin':'https://www.bilibili.com','access-control-allow-credentials':'true'}, json: {code: 0, data}});
    });

    await load('https://www.bilibili.com/');
    const homeLine = page.locator('.bili-video-card .bili-ja-zh-original');
    const ja = homeLine.locator('[lang=ja] span'), en = homeLine.locator('[lang=en] span');
    const a = await ja.boundingBox(), b = await en.boundingBox();
    assert(a.x < b.x && Math.abs(a.y - b.y) < 2);
    for (const span of [ja, en]) {
      assert.equal(await span.evaluate(el => getComputedStyle(el).webkitLineClamp), '2');
    }
    await en.hover();
    assert.equal(await en.getAttribute('title'), await en.textContent());
    await changeFont('home','en','17');
    await changeFont('home','ja','21');
    await changeFont('home','zh','19');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.bili-video-card__info--tit')).fontSize === '19px');
    assert.equal(await sizeOf(ja), '21px');
    assert.equal(await sizeOf(en), '17px');

    await load('https://www.bilibili.com/video/BVTEST/');
    await changeFont('video','zh','27');
    await changeFont('video','ja','18');
    await changeFont('recommend','en','16');
    await changeFont('comments','zh','24');
    await changeFont('comments','en','20');
    await changeFont('comments','ja','22');
    const title = page.locator('.video-info-container .bili-ja-zh-original');
    const recommendations = page.locator('.recommend-video-card + .bili-ja-zh-original');
    const comments = page.locator('bili-comments');
    await comments.locator('[lang=en]').waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).fontSize === '27px');
    await page.waitForFunction(() => {
      const root=document.querySelector('bili-comments').shadowRoot.querySelector('bili-comment-renderer').shadowRoot.querySelector('bili-rich-text').shadowRoot;
      return getComputedStyle(root.querySelector('#contents')).fontSize === '24px';
    });
    assert.equal(await sizeOf(title.locator('[lang=ja]')), '18px');
    assert.equal(await sizeOf(title.locator('[lang=en]')), '13px');
    assert.equal(await sizeOf(recommendations.locator('[lang=en]')), '16px');
    await page.waitForFunction(el => getComputedStyle(el).fontSize === '20px', await comments.locator('[lang=en]').elementHandle());
    await page.waitForFunction(el => getComputedStyle(el).fontSize === '22px', await comments.locator('[lang=ja]').elementHandle());
    async function changeGap(id,value){
      await page.locator(id).evaluate((input,value)=>{
        input.value=String(value);
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
      },value);
    }
    const readGap=line=>line.evaluate(el=>getComputedStyle(el).rowGap);
    assert.equal(await readGap(title),'0px');
    await webpage.selectOption('video');
    await changeGap('#bili-page-font-settings-gap',16);
    await page.waitForFunction(el=>getComputedStyle(el).rowGap==='16px',await title.elementHandle());
    assert.equal(await readGap(recommendations),'0px');
    await changeGap('#bili-comment-font-settings-gap',9);
    const commentLine=comments.locator('.bili-ja-zh-original');
    await page.waitForFunction(el=>getComputedStyle(el).rowGap==='9px',await commentLine.elementHandle());

    await load('https://www.bilibili.com/');
    assert.equal(await sizeOf(en), '17px');
    assert.equal(await sizeOf(ja), '21px');
    await changeFont('home','zh','');
    await page.waitForFunction(() => document.querySelector('.bili-video-card__info--tit').style.fontSize === '');
    console.log('PASS: independent homepage, video title, recommendations and comment font settings for Chinese, Japanese and English; preview, restore and persistence');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
