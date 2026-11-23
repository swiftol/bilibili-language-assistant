// Resolve the native cover link in both extension worlds so actions follow the card.
(() => {
  const cardSelector = '.bili-video-card';
  const coverSelector = '.bili-video-card__image--link';
  function videoId(card) {
    const href = card?.querySelector(coverSelector)?.href;
    if (!href) return '';
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return '';
    return url.pathname.match(/\/video\/(BV[\w]+)(?:\/|$)/)?.[1] || '';
  }
  function matches(key, bvid) {
    if (typeof key !== 'string' || !bvid) return false;
    const controls = document.getElementById(key);
    return controls?.matches('[data-bili-card-actions]') &&
      videoId(controls.closest(cardSelector)) === bvid;
  }
  globalThis.BiliVideoCardContext = { cardSelector, coverSelector, videoId, matches };
})();
