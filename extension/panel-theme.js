(() => {
  const css = `
  :host, body.bili-extension-popup {
    --panel:#101923; --surface:#17232f; --well:#0c141e; --border:#2c3b49;
    --accent:#83ebce; --accent-ink:#10271f; --ink:#edf4fb; --muted:#a8b8c9;
    --ui-font:Inter,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;
    color:var(--ink); font:13px/1.5 var(--ui-font); color-scheme:dark;
  }
  [data-bili-panel], body.bili-extension-popup {
    background:var(--panel)!important; color:var(--ink)!important;
    scrollbar-width:thin; scrollbar-color:#486073 var(--panel); overscroll-behavior:contain;
  }
  [data-bili-panel]{box-sizing:border-box;inline-size:min(420px,calc(100vw - 28px));padding:14px!important;
    border:1px solid var(--border)!important;border-radius:16px!important;
    box-shadow:0 18px 52px #0008;scroll-padding-top:109px}
  [data-bili-panel][data-web-only]{height:min(660px,calc(100dvh - 92px))}
  [data-bili-panel] [hidden],body.bili-extension-popup [hidden]{display:none!important}
  [data-bili-panel] h3,[data-bili-panel] h4{color:var(--ink)}
  [data-bili-panel] small,[data-bili-panel] .wheel-note,body.bili-extension-popup .wheel-note{color:var(--muted)}
  :is([data-bili-panel],.bili-extension-popup) :is(button,input,select,summary),[data-bili-launcher] {font:inherit}
  :is([data-bili-panel],.bili-extension-popup) :is(button,input,select,summary,[tabindex]):focus-visible,[data-bili-launcher]:focus-visible {
    outline:2px solid var(--accent);outline-offset:2px
  }
  :is([data-bili-panel],.bili-extension-popup) button,[data-bili-launcher] {
    background:var(--surface);border:1px solid var(--border);color:var(--ink);border-radius:8px;
    padding:6px 10px;min-height:30px;cursor:pointer;transition:background-color .15s,border-color .15s;
  }
  :is([data-bili-panel],.bili-extension-popup) button:hover:not(:disabled),[data-bili-launcher]:hover {
    background:#223747;border-color:#526a7d
  }
  :is([data-bili-panel],.bili-extension-popup) button:disabled{opacity:.45;cursor:default}
  :is([data-bili-panel],.bili-extension-popup) :is([data-bili-primary],#dual-start,#page-settings),
  [data-bili-launcher]{background:var(--accent);color:var(--accent-ink);border-color:transparent;font-weight:650}
  :is([data-bili-panel],.bili-extension-popup) :is([data-bili-primary],#dual-start,#page-settings):hover,[data-bili-launcher]:hover{
    background:#adf8e2;color:var(--accent-ink);border-color:transparent
  }
  :is([data-bili-panel],.bili-extension-popup) :is(input[type=number],input[type=text],select) {
    color:var(--ink);background:var(--well);border:1px solid var(--border);border-radius:7px;
    min-height:30px;padding:4px 8px;box-sizing:border-box;max-width:100%;
  }
  :is([data-bili-panel],.bili-extension-popup) input[type=checkbox]{accent-color:var(--accent);vertical-align:middle;margin:0 7px 0 0}
  [data-bili-panel] input[type=range]{appearance:none;width:100%;min-width:0;height:20px;margin:0;
    background:transparent;cursor:pointer;accent-color:var(--accent)}
  [data-bili-panel] input[type=range]::-webkit-slider-runnable-track{
    height:4px;border-radius:8px;background:linear-gradient(to right,var(--accent) var(--fill,0%),#364859 var(--fill,0%));
  }
  [data-bili-panel] input[type=range]::-moz-range-track{height:4px;border-radius:8px;background:#364859}
  [data-bili-panel] input[type=range]::-moz-range-progress{height:4px;border-radius:8px;background:var(--accent)}
  [data-bili-panel] input[type=range]::-webkit-slider-thumb{
    appearance:none;width:13px;height:13px;margin-top:-4.5px;border-radius:50%;border:2px solid var(--panel);background:var(--accent)
  }
  [data-bili-panel] input[type=range]::-moz-range-thumb{
    width:11px;height:11px;border-radius:50%;border:2px solid var(--panel);background:var(--accent)
  }
  [data-bili-panel] #bili-panel-header{position:sticky;top:-14px;z-index:3;background:var(--panel);
    margin:-14px -14px 12px;padding:13px 14px 10px;box-shadow:none;border-bottom:1px solid var(--border)}
  [data-bili-panel] .bili-panel-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
  [data-bili-panel] #bili-panel-header h3{margin:0!important;font-size:16px;letter-spacing:.02em;font-weight:720}
  [data-bili-panel] :is(#collapse,#close){float:none;min-height:28px;padding:3px 8px;color:var(--muted)}
  [data-bili-panel] #player-language-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;
    border:1px solid var(--border);background:var(--well);padding:3px;border-radius:9px}
  [data-bili-panel] #player-language-tabs[data-web-only]{grid-template-columns:repeat(2,minmax(0,1fr))}
  [data-bili-panel] #player-language-tabs button{padding:4px 2px;border-color:transparent;white-space:nowrap;font-size:12px!important;min-width:0}
  [data-bili-panel] #player-language-tabs button[aria-selected=false]{background:transparent;color:var(--muted)}
  [data-bili-panel] #player-language-tabs button[aria-selected=true]{background:var(--accent);color:var(--accent-ink);font-weight:700}
  [data-bili-panel] #player-fonts-pane{display:grid;gap:12px}
  [data-bili-panel] #player-fonts-pane .bili-font-card,[data-bili-panel] .bili-panel-card{
    min-width:0;margin:0 0 11px!important;padding:11px!important;background:var(--surface);
    border:1px solid var(--border)!important;border-radius:11px!important;
  }
  [data-bili-panel] #player-fonts-pane .bili-font-card{margin:0!important}
  [data-bili-panel] :is(.bili-font-card,.bili-panel-card) legend{font-weight:700;color:var(--ink);padding:0 6px}
  [data-bili-panel] .bili-font-preview{margin:2px 0 9px;padding:9px 11px;min-height:55px;max-height:125px;
    background:var(--well);border:1px solid var(--border);border-radius:8px;line-height:1.24;overflow:auto;
    text-align:start!important;overflow-wrap:anywhere;color:var(--ink);justify-items:start;
  }
  [data-bili-panel] .bili-dm-size-preview{line-height:1}
  [data-bili-panel] .bili-font-preview [lang=ja]{color:#d8d6fa}
  [data-bili-panel] .bili-font-preview [lang=en]{color:#afd5e9}
  [data-bili-panel] .bili-font-card select{margin:0 0 7px}
  [data-bili-panel] .bili-font-pixel-fields{display:grid;grid-template-columns:minmax(0,1fr);gap:0}
  [data-bili-panel] :is(.bili-font-range,.bili-font-control){display:grid;grid-template-columns:4.6em minmax(0,1fr) 5.7em;
    align-items:center;gap:9px;margin:3px 0;min-height:32px;font-size:12px}
  [data-bili-panel] .bili-font-control > label{margin:0}
  [data-bili-panel] .bili-font-range-gap{border-top:1px solid var(--border);padding-top:5px}
  [data-bili-panel] .bili-font-value{display:flex;align-items:center;gap:4px;padding-right:6px;
    border:1px solid var(--border);border-radius:7px;background:var(--well);color:var(--muted);font-size:11px}
  [data-bili-panel] .bili-font-value input[type=number]{background:transparent;border:none;min-height:26px;
    width:100%;min-width:0;border-radius:6px;padding:3px 4px;text-align:center;font:12px var(--ui-font);font-variant-numeric:tabular-nums}
  [data-bili-panel] .bili-font-value input::placeholder{color:var(--muted);opacity:1}
  [data-bili-panel] .bili-font-card small:not(.bili-font-unit){margin:3px 0;color:var(--muted);font-size:11px}
  [data-bili-panel] .bili-panel-card > h4,[data-bili-panel] .bili-panel-card > b:first-child{margin:0 0 7px;font-size:13px}
  [data-bili-panel] .bili-panel-card p{margin:8px 0}
  [data-bili-panel] .bili-panel-card label:has(input[type=checkbox]){display:flex;align-items:center;gap:4px;min-height:24px}
  [data-bili-panel] .bili-panel-card label:has(input[type=number]):not(.bili-font-control){display:flex;align-items:center;justify-content:space-between;gap:8px}
  [data-bili-panel] .bili-panel-card label:has(input[type=range]):not(.bili-font-range){display:grid;grid-template-columns:max-content minmax(0,1fr) auto;gap:8px;align-items:center}
  [data-bili-panel] .bili-panel-card :is(output,#dual-master){color:var(--muted);font-variant-numeric:tabular-nums}
  [data-bili-panel] :is(.language-bar,.ear-slot){border-color:#4a6b6e;background:var(--well);border-radius:9px}
  [data-bili-panel] #language-selected .language-chip{padding:2px 4px 2px 8px;border:1px solid #45656a;
    background:#1e343e;border-radius:8px;max-width:100%}
  [data-bili-panel] #language-selected .language-chip button{min-height:24px;padding:1px 5px}
  [data-bili-panel] .ear-layout{align-items:stretch}
  [data-bili-panel] #ear-swap{align-self:center}
  [data-bili-panel] #dual-status{border:1px solid var(--border);background:var(--well);padding:8px;border-radius:8px;overflow-wrap:anywhere}
  [data-bili-panel] hr{border:0;border-top:1px solid var(--border);margin:8px 0}
  [data-bili-panel] #bili-ja-zh-toggle[aria-pressed=true]{color:var(--accent);border-color:#527c77}
  [data-bili-panel] #favorite-wheel-settings summary{padding:4px 0 8px;font-weight:700}
  [data-bili-launcher]{box-sizing:border-box;box-shadow:0 6px 20px #0005;padding:8px 13px}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor{font:inherit}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor :is(.wheel-preview,.wheel-pool,.wheel-tray){
    background:var(--well);border-color:var(--border);border-radius:9px;
  }
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-preview{
    border:1px solid var(--border);background:radial-gradient(circle at 50% 50%,#1b353c,var(--well) 72%);
  }
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor :is(.gap,.slot){min-height:0}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .slot{background:#233c4b;border-color:#517783}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-status{color:var(--accent)}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-toolbar label{display:inline-flex;align-items:center;gap:5px;margin:0}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-toolbar input[type=number]{width:48px}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-policy select{width:auto;flex:1 1 160px}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-columns{
    display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:9px;align-items:start
  }
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-preview{
    width:100%;min-width:0;min-height:0;box-sizing:border-box
  }
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-slot-list{max-height:none;overflow:visible}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-pool{max-height:196px;margin:4px 0 0;padding:5px;gap:4px}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor .wheel-folder{max-width:100%;font-size:11px;min-height:25px;padding:3px 6px}
  :is([data-bili-panel],.bili-extension-popup) .wheel-editor [data-empty-layer]{z-index:1}
  `;

  const mounted = new WeakSet();
  function mount(root) {
    if (mounted.has(root)) return;
    const style = document.createElement('style');
    style.textContent = css;
    (root.head || root).append(style);
    mounted.add(root);
  }

  function paintRange(input) {
    const min = Number(input.min || 0), max = Number(input.max || 100);
    const value = Math.max(0, Math.min(100, 100 * (input.valueAsNumber - min) / (max - min)));
    const fill = value + '%';
    if (input.style.getPropertyValue('--fill') !== fill) input.style.setProperty('--fill', fill);
  }

  const controls = new WeakMap();
  function fontControl(source) {
    const existing = controls.get(source);
    if (existing) return existing;
    const label = source.closest('label'), row = document.createElement('div');
    row.className = (label.className + ' bili-font-control').trim();
    label.replaceWith(row);
    row.append(label);
    label.className = '';
    source.id ||= 'bili-font-' + source.dataset.fontPage + '-' + source.dataset.fontLanguage;
    label.htmlFor = source.id;
    const fromRange = source.type === 'range';
    const mirror = document.createElement('input');
    mirror.type = fromRange ? 'number' : 'range';
    for (const property of ['min', 'max', 'step']) mirror[property] = source[property];
    const unit = source.id.startsWith('danmaku-font-') ? '%' : 'px';
    const name = source.getAttribute('aria-label') || '分行间距';
    mirror.setAttribute('aria-label', name + (fromRange ? '数值' : '滑块'));
    const range = fromRange ? source : mirror, number = fromRange ? mirror : source;
    const value = document.createElement('span');
    value.className = 'bili-font-value';
    const suffix = document.createElement('span');
    suffix.textContent = unit;
    suffix.setAttribute('aria-hidden', 'true');
    // Keep the original control and all its existing state and persistence handlers.
    row.append(range, value);
    value.append(number, suffix);
    const output = row.querySelector('output');
    if (output) output.hidden = true;
    const sync = () => {
      if (source.getRootNode().activeElement !== mirror) {
        const target = source.value || source.dataset.defaultSize || source.min;
        if (mirror.value !== target) mirror.value = target;
      }
      paintRange(range);
    };
    function forward(type) {
      if (!Number.isFinite(mirror.valueAsNumber) || !mirror.validity.valid) return;
      source.value = mirror.value;
      source.dispatchEvent(new Event(type, {bubbles:true}));
    }
    mirror.addEventListener('input', () => { forward('input'); paintRange(range); });
    mirror.addEventListener('change', () => forward('change'));
    mirror.addEventListener('blur', sync);
    source.addEventListener('input', sync);
    source.addEventListener('change', sync);
    controls.set(source, sync);
    return sync;
  }

  function paint(root) {
    for (const input of root.querySelectorAll('.bili-font-pixel-fields input[data-font-language], .bili-font-pixel-fields input[id^="player-subtitle-size-"], .bili-font-card input[type=range]:not(.bili-font-value input):not(.bili-font-pixel-fields input)')) {
      fontControl(input)();
    }
    for (const input of root.querySelectorAll('[data-bili-panel] input[type=range]')) paintRange(input);
  }

  function panel(root, section) {
    mount(root);
    if (section.hasAttribute('data-bili-panel')) return;
    section.dataset.biliPanel = '';
    section.addEventListener('input', event => {
      if (event.target.type === 'range') paintRange(event.target);
    });
    section.addEventListener('change', event => {
      if (event.target.matches('.bili-font-card select')) paint(root);
    });
    section.addEventListener('keydown', event => {
      // The player binds arrow keys at window level. Leave them to the focused control.
      if (event.key !== 'Escape') event.stopPropagation();
      if (event.target.getAttribute('role') !== 'tab') return;
      const tabs = [...event.target.parentElement.children];
      const index = tabs.indexOf(event.target);
      const next = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length, ArrowRight: (index + 1) % tabs.length,
        Home: 0, End: tabs.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus();
    });
  }
  if (document.body?.classList.contains('bili-extension-popup')) mount(document);
  globalThis.BiliPanelTheme = {mount, panel, paint};
})();
