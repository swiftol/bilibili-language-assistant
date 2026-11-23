const {chromium, project, home} = require('../scripts/test-env.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const extension = path.resolve(process.env.BILI_TEST_EXTENSION || path.join(project, 'extension'));
  const out = path.join(home, 'ui-refresh');
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launchPersistentContext('', {
    executablePath: chromium.executablePath(),
    headless: true,
    viewport: {width: 1440, height: 1000},
    args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension]
  });
  try {
    const page = browser.pages()[0];
    if (!process.env.BILI_UI_LIVE) {
      await page.route('https://www.bilibili.com/**', route => route.fulfill({contentType: 'text/html', body:
        '<meta charset="utf-8"><style>body{background:#14181e}.bpx-player-container{position:relative;width:95vw;max-width:980px;height:520px;background:#252d36}.bpx-player-control-bottom{position:absolute;bottom:0;width:100%;height:48px}</style>'+
        '<div class="bpx-player-container"><video></video><div class="bpx-player-control-bottom"><div class="bpx-player-control-bottom-right"></div></div></div>'
      }));
      await page.route('https://api.bilibili.com/**', route => route.fulfill({json: {code: 0, data: {isLogin: false}}}));
    }
    await page.addInitScript(() => localStorage.setItem('bili-dual-auto', 'false'));
    const video = process.env.BILI_UI_LIVE ? 'https://www.bilibili.com/zh-Hans/video/BV1xAxQ6pERx/' : 'https://www.bilibili.com/video/BVTHEME/';
    await page.goto(video, {waitUntil: 'domcontentloaded'});
    if (process.env.BILI_UI_LIVE) {
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
    }
    await page.getByRole('button', {name: '语言助手外部面板', exact: true}).click();
    const panel = page.getByRole('dialog', {name: '字幕与声音', exact: true});
    const fontTab = panel.getByRole('tab', {name: '字体大小', exact: true});
    await fontTab.click();
    await panel.locator('#bili-page-font-settings .bili-font-value:visible').first().waitFor();
    const dimensions = [];
    for (const [i, name] of ['设置', '字体大小', '声音', '收录仓夹'].entries()) {
      await panel.getByRole('tab', {name, exact: true}).click();
      dimensions.push(await panel.boundingBox());
      await panel.screenshot({path: path.join(out, 'panel-' + i + '.png')});
    }
    assert(dimensions.every(box => box.height === dimensions[0].height && box.width === dimensions[0].width));
    await fontTab.click();
    for (const [selector, count] of [
      ['#bili-subtitle-font-settings', 4], ['#bili-dm-font-settings', 4],
      ['#bili-comment-font-settings', 4], ['#bili-page-font-settings', 4]
    ]) {
      const card = panel.locator(selector);
      const ranges = card.locator('input[type=range]:visible'), numbers = card.locator('input[type=number]:visible');
      assert.equal(await ranges.count(), count, selector);
      assert.equal(await numbers.count(), count, selector);
      const range = ranges.first(), number = numbers.first(), preview = card.locator('.bili-font-preview [lang=zh]');
      const size = () => preview.evaluate(el => getComputedStyle(el).fontSize);
      const initialSize = await size(), original = await range.inputValue(), defaultNumber = await number.inputValue();
      await range.press(Number(original) > Number(await range.getAttribute('min')) ? 'ArrowLeft' : 'ArrowRight');
      const updated = await range.inputValue();
      assert.notEqual(updated, original, selector + ' slider responds to the arrow key');
      assert.notEqual(await size(), initialSize, selector + ' preview after ' + original + ' → ' + updated);
      assert.equal(await number.inputValue(), await range.inputValue(), selector);
      await number.fill(original);
      await number.press('Tab');
      assert.equal(await range.inputValue(), original, selector);
      if (!defaultNumber) {
        await number.fill('');
        await number.press('Tab');
        assert.equal(await range.inputValue(), original, selector);
      }
      const gap=ranges.last(),gapValue=numbers.last();
      assert.equal(await gap.inputValue(),'0',selector);
      await gapValue.fill('12');
      await gapValue.press('Tab');
      assert.equal(await gap.inputValue(),'12',selector);
      assert.equal(await card.locator('.bili-font-preview').evaluate(el=>getComputedStyle(el).rowGap),'12px',selector);
      await gap.press('Home');
      assert.equal(await gapValue.inputValue(),'0',selector);
    }
    const danmaku=panel.locator('#bili-dm-font-settings input[id^=danmaku-font-]');
    for(const range of await danmaku.all()){
      assert.equal(await range.getAttribute('min'),'20');
      assert.equal(await range.getAttribute('max'),'300');
    }
    await panel.evaluate(el => el.scrollTop = el.scrollHeight);
    await panel.screenshot({path: path.join(out, 'font-bottom.png')});
    await page.setViewportSize({width: 390, height: 760});
    assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await panel.screenshot({path: path.join(out, 'font-narrow.png')});
    await fontTab.focus();
    await fontTab.press('ArrowRight');
    assert.equal(await panel.getByRole('tab', {name: '声音'}).getAttribute('aria-selected'), 'true');

    const feed = await browser.newPage();
    await feed.route('https://t.bilibili.com/**', route => route.fulfill({contentType: 'text/html', body: '<meta charset="utf-8"><body style="background:#16181d"></body>'}));
    await feed.goto('https://t.bilibili.com/');
    await feed.getByRole('button', {name: '语言助手', exact: true}).click();
    const feedPanel = feed.getByRole('dialog', {name: '网页语言设置', exact: true});
    await feedPanel.getByRole('tab', {name: '字体大小', exact: true}).click();
    assert.equal(await feedPanel.locator('input[type=range]:visible').count(), 8);
    await feedPanel.screenshot({path: path.join(out, 'feed-font.png')});
    console.log('PASS: four equal-height tabs, matching controls and live previews, keyboard tab navigation, narrow layout and shared feed styling.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
