(() => {
  const legacyKey = 'bili-page-fonts-v1';
  const prefix = 'bili-page-font:';
  const valid = key => /^(home|video|recommend|comments|dynamic|space|history|other):(zh|ja|en|gap)$/.test(key);
  const send = values => document.dispatchEvent(new CustomEvent('bili-page-fonts-state', {detail: JSON.stringify(values)}));
  const keys = ['home','video','recommend','comments','dynamic','space','history','other']
    .flatMap(region => ['zh','ja','en','gap'].map(setting => prefix + region + ':' + setting));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const patch = {};
    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith(prefix) && valid(key.slice(prefix.length))) patch[key.slice(prefix.length)] = change.newValue ?? null;
    }
    if (Object.keys(patch).length || changes[legacyKey]) send({...changes[legacyKey]?.newValue, ...patch});
  });
  chrome.storage.local.get([legacyKey, ...keys]).then(values => {
    const state = {...values[legacyKey]};
    for (const key of keys) state[key.slice(prefix.length)] = values[key] ?? null;
    send(state);
  });

  document.addEventListener('bili-page-fonts-save', event => {
    let values;
    try { values = JSON.parse(event.detail); } catch { return; }
    const patch = {};
    for (const [key, value] of Object.entries(values || {})) {
      const inRange = key.endsWith(':gap') ? Number.isInteger(value) && value >= 0 && value <= 24 :
        Number.isFinite(value) && value >= 9 && value <= 48;
      if (valid(key) && (value === null || inRange)) {
        patch[prefix + key] = value;
      }
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
  });
})();
