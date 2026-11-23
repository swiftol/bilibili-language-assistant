(() => {
  const {cardSelector, coverSelector, videoId} = BiliVideoCardContext;
  const style = document.createElement('style');
  style.textContent = `
    [data-bili-card-actions] {
      position:absolute; top:8px; right:42px; display:flex; gap:5px;
      color:white; z-index:3; opacity:0; pointer-events:none;
    }
    .bili-video-card:hover [data-bili-card-actions],
    .bili-video-card:focus-within [data-bili-card-actions] {
      opacity:1; pointer-events:auto;
    }
    [data-bili-card-actions] button {
      box-sizing:border-box; display:grid; place-items:center;
      width:30px; height:30px; padding:0; border:1px solid #486073; border-radius:8px;
      background:#101923e8; color:#edf4fb; cursor:pointer;
    }
    [data-bili-card-actions] button:hover,
    [data-bili-card-actions] button:focus-visible { background:#223747; border-color:#83ebce; }
    [data-bili-card-actions] button:disabled { opacity:.5; cursor:wait; }
    [data-bili-card-actions] svg { width:19px; height:19px; pointer-events:none; }
  `;
  document.head.append(style);

  function button(action, label, path) {
    const control = document.createElement('button');
    control.type = 'button';
    control.dataset.biliCardAction = action;
    control.title = label;
    control.setAttribute('aria-label', label);
    control.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return control;
  }

  function attach(card) {
    const bvid = videoId(card);
    const previous = card.querySelector('[data-bili-card-actions]');
    if (previous?.dataset.biliCardActions === bvid) return;
    previous?.remove();
    if (!bvid) return;
    const cover = card.querySelector(coverSelector);
    const wrapper = cover.parentElement;
    if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
    const controls = document.createElement('div');
    controls.id = 'bili-card-actions-' + crypto.randomUUID();
    controls.dataset.biliCardActions = bvid;
    controls.append(
      button('block', '拉黑此 UP 主', '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'),
      button('favorite', '收藏轮盘（点击打开，或长按拖动）', '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>')
    );
    cover.after(controls);
  }

  function scan(node) {
    if (!(node instanceof Element)) return;
    const card = node.closest(cardSelector);
    if (card) attach(card);
    node.querySelectorAll(cardSelector).forEach(attach);
  }

  scan(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches(coverSelector)) scan(record.target);
      } else {
        for (const node of record.addedNodes) {
          if (node instanceof Element && !node.closest('[data-bili-card-actions]')) scan(node);
        }
      }
    }
  }).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['href']});
})();
