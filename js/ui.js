/* Каркас интерфейса: переходы между экранами, окна, PIN, нажатия, клавиши */
(function (U) {
  'use strict';

  const ui = U.ui = { screen: 'players', params: {}, stack: [], form: {}, modal: null, parentUntil: 0 };
  U.screens = {};
  U.actions = {};
  U.after = {};

  U.nb = (s) => String(s).replace(/ /g, '\u00a0');
  U.esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  U.fmt = {
    time: (ms) => U.score.fmtTime(ms),
    sec: (ms, d) => U.num((ms / 1000).toFixed(d === undefined ? 1 : d)) + ' с',
    date: (ts) => { const d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); },
    dt: (ts) => { const d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    iso: (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    fromIso: (s) => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).getTime(); }
  };
  U.player = () => { const d = U.store.data; return d.players.find((p) => p.id === d.current) || null; };

  let appEl, bgEl, viewEl, modalEl, bgTheme = null, lastScreen = null, enterAt = 0;
  const theme = () => ui.themeOverride || (U.player() && U.player().theme) || 'space';
  // Анимации: выключатель у родителей и системная настройка «уменьшить движение»
  U.animOn = function () {
    const st = U.store && U.store.data && U.store.data.settings;
    if (st && st.anim === false) return false;
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  U.render = function () {
    if (ui.screen !== 'playerForm') ui.themeOverride = null;
    const html = (U.screens[ui.screen] || U.screens.players)(ui.params || {});
    const t = theme();
    appEl.dataset.theme = t;
    appEl.dataset.screen = ui.screen;
    appEl.classList.toggle('no-anim', !U.animOn());
    if (bgTheme !== t) { bgEl.innerHTML = U.art.bg(t); bgTheme = t; }
    const keep = ui.keepScroll ? (viewEl.querySelector('.screen.scroll') || {}).scrollTop : 0;
    viewEl.innerHTML = html;
    // вход нового экрана — только при смене экрана, не при каждой перерисовке
    // вторая перерисовка сразу следом (отсчёт раунда) вход не обрывает
    if (ui.screen !== lastScreen) { enterAt = performance.now(); lastScreen = ui.screen; }
    if (performance.now() - enterAt < 120) { const sc = viewEl.querySelector('.screen'); if (sc) sc.classList.add('enter'); }
    if (keep) { const sc = viewEl.querySelector('.screen.scroll'); if (sc) sc.scrollTop = keep; }
    ui.keepScroll = false;
    renderModal();
    if (U.after[ui.screen]) U.after[ui.screen]();
  };
  // Перерисовать, не сбрасывая прокрутку длинного экрана
  U.refresh = function () { ui.keepScroll = true; U.render(); };

  U.go = function (screen, params, opts) {
    const o = opts || {};
    if (o.reset) ui.stack = [];
    else if (!o.replace) { ui.stack.push({ screen: ui.screen, params: ui.params }); history.pushState({ d: ui.stack.length }, ''); }
    ui.screen = screen;
    ui.params = params || {};
    ui.form = o.form || {};
    ui.modal = null;
    U.render();
  };
  function goBack() {
    if (ui.modal) { closeModal(); history.pushState({}, ''); return; }
    if (ui.screen === 'round' && U.play.active()) { U.play.askAbort(); history.pushState({}, ''); return; }
    if (ui.screen === 'review') { U.play.askDiscard(); history.pushState({}, ''); return; }
    const prev = ui.stack.pop();
    if (!prev) return;
    ui.screen = prev.screen;
    ui.params = prev.params;
    ui.form = {};
    U.render();
  }
  U.back = () => { if (ui.stack.length) history.back(); else U.go('home', {}, { reset: true }); };

  /* ---------- Окна ---------- */
  const MODALS = {};
  U.MODALS = MODALS;
  U.modal = function (m) { ui.modal = m; renderModal(); };
  function closeModal() { ui.modal = null; renderModal(); }
  U.closeModal = closeModal;
  function renderModal() {
    if (!ui.modal) { modalEl.hidden = true; modalEl.innerHTML = ''; return; }
    modalEl.hidden = false;
    modalEl.innerHTML = `<div class="modal-back" data-act="modalBack"></div><div class="modal" role="dialog">${MODALS[ui.modal.type](ui.modal)}</div>`;
    const inp = modalEl.querySelector('input');
    if (inp) inp.focus();
  }
  U.renderModal = renderModal;

  MODALS.confirm = (m) => `<h3>${m.title}</h3>${m.text ? `<p>${m.text}</p>` : ''}
    <div class="btns"><button class="btn btn-light" data-act="modalNo">${m.no || 'Отмена'}</button>
    <button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" data-act="modalYes">${m.yes || 'Да'}</button></div>`;
  U.confirm = (title, text, yes, onYes, opts) => U.modal(Object.assign({ type: 'confirm', title, text, yes, onYes }, opts || {}));
  U.actions.modalYes = () => { const m = ui.modal; closeModal(); if (m && m.onYes) m.onYes(); };
  U.actions.modalNo = () => { const m = ui.modal; closeModal(); if (m && m.onNo) m.onNo(); };
  U.actions.modalBack = () => { if (ui.modal && ui.modal.type !== 'pin') U.actions.modalNo(); else closeModal(); };

  /* ---------- PIN родителя ---------- */
  const hash = (s) => { let h = 2166136261; for (const ch of 'umn:' + s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  U.requirePin = function (why, onOk) {
    const st = U.store.data.settings;
    if (Date.now() < ui.parentUntil) { onOk(); return; }
    if (!st.pin) { U.modal({ type: 'pin', mode: 'new', title: 'Придумайте PIN из 4 цифр', sub: 'Он закрывает раздел для родителей и покупку призов', val: '', onOk }); return; }
    U.modal({ type: 'pin', mode: 'check', title: 'PIN родителя', sub: why, val: '', onOk });
  };
  MODALS.pin = (m) => {
    let dots = '';
    for (let i = 0; i < 4; i++) dots += `<i class="${i < m.val.length ? 'on' : ''}"></i>`;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => k === ''
      ? '<span></span>'
      : `<button data-act="pinKey" data-v="${k}" aria-label="${k === 'del' ? 'Стереть' : k}">${k === 'del' ? '⌫' : k}</button>`).join('');
    return `<h3>${m.title}</h3>${m.sub ? `<p>${m.sub}</p>` : ''}
      <div class="pin-dots${m.error ? ' shake' : ''}">${dots}</div>${m.error ? `<div class="err">${m.error}</div>` : ''}
      <div class="pin-keys">${keys}</div>
      <div class="between">${m.mode === 'check' ? '<button class="link-btn" data-act="pinForgot">Забыли PIN?</button>' : '<span></span>'}<button class="link-btn" data-act="modalBack">Отмена</button></div>`;
  };
  U.actions.pinKey = function (ds) {
    const m = ui.modal;
    if (!m || m.type !== 'pin') return;
    m.error = '';
    if (ds.v === 'del') m.val = m.val.slice(0, -1);
    else if (m.val.length < 4) m.val += ds.v;
    if (m.val.length < 4) { renderModal(); return; }
    const st = U.store.data.settings, val = m.val;
    m.val = '';
    if (m.mode === 'check') {
      if (hash(val) === st.pin) { ui.parentUntil = Date.now() + 10 * 60000; closeModal(); m.onOk(); }
      else { m.error = 'Неверный PIN'; renderModal(); }
    } else if (m.mode === 'new') {
      m.first = val; m.mode = 'repeat'; m.title = 'Повторите PIN'; renderModal();
    } else if (m.mode === 'repeat') {
      if (val === m.first) {
        st.pin = hash(val);
        U.store.save();
        ui.parentUntil = Date.now() + 10 * 60000;
        closeModal();
        U.toast('PIN сохранён');
        m.onOk();
      } else { m.mode = 'new'; m.title = 'Не совпало. Придумайте PIN заново'; m.error = ''; renderModal(); }
    }
  };
  MODALS.resetPin = (m) => `<h3>Сбросить PIN?</h3><p>Чтобы сбросить, напишите слово СБРОС. Сброс запишется в журнал раздела для родителей.</p>
    <input class="inp center" data-f="resetWord" autocomplete="off" placeholder="СБРОС">
    ${m.error ? `<div class="err">${m.error}</div>` : ''}
    <div class="btns"><button class="btn btn-light" data-act="modalBack">Отмена</button><button class="btn btn-danger" data-act="pinResetGo">Сбросить</button></div>`;
  U.actions.pinForgot = () => { const m = ui.modal; ui.form.resetWord = ''; U.modal({ type: 'resetPin', onOk: m.onOk, sub: m.sub }); };
  U.actions.pinResetGo = () => {
    const m = ui.modal;
    if (String(ui.form.resetWord || '').trim().toUpperCase() !== 'СБРОС') { m.error = 'Нужно написать СБРОС'; renderModal(); return; }
    U.store.data.settings.pin = null;
    U.store.logEvent('PIN родителя сброшен');
    U.store.save();
    closeModal();
    U.requirePin(m.sub, m.onOk);
  };

  /* ---------- Всплывающая подсказка ---------- */
  U.toast = function (text) {
    if (!appEl) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    appEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, 2800);
  };

  /* ---------- События ---------- */
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = U.actions[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    U.sound.unlock();
    fn(el.dataset, el, e);
  }
  function onInput(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.f) return;
    ui.form[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
  }
  function onKey(e) {
    if (ui.modal && ui.modal.type === 'pin') {
      if (/^\d$/.test(e.key)) U.actions.pinKey({ v: e.key });
      else if (e.key === 'Backspace') U.actions.pinKey({ v: 'del' });
      else if (e.key === 'Escape') closeModal();
      else return;
      e.preventDefault();
      return;
    }
    if (e.target.matches && e.target.matches('input, textarea, select')) {
      if (e.key === 'Enter' && ui.modal && ui.modal.type === 'resetPin') U.actions.pinResetGo();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.target.click(); e.preventDefault(); return; }
    if (ui.screen === 'round') { U.play.key(e); return; }
    if (e.key === 'Escape') { if (ui.modal) closeModal(); else if (ui.stack.length) U.back(); }
  }

  U.uiInit = function () {
    appEl = document.getElementById('app');
    bgEl = document.getElementById('bg');
    viewEl = document.getElementById('view');
    modalEl = document.getElementById('modal');
    appEl.addEventListener('click', onClick);
    appEl.addEventListener('input', onInput);
    appEl.addEventListener('change', onInput);
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', goBack);
    U.play.bindSwipe(viewEl);
  };
})(window.U = window.U || {});
