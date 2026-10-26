/* Раунд на экране: отсчёт 3-2-1, таймеры, отметки родителя или клавиатура ребёнка, пауза, свайпы, сверка и итог */
(function (U) {
  'use strict';

  const ui = U.ui, A = U.art, ic = A.icon, esc = U.esc, F = U.fmt, S = U.score;
  const starSm = () => A.star('ic sm');
  // Подсказки про клавиши ПК — только на широком экране с мышью; на телефоне и планшете — про пальцы
const touch = () => (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 700;
  let R = null, ctx = null, raf = 0, iv = 0, wake = null, sig = '';

  const P = U.play = {};
  P.active = () => !!R && !R.finished && ui.screen === 'round';
  P.round = () => R;

  P.start = function (pkg, opts) {
    const p = U.player();
    if (!p) return;
    let keys = null, next = null;
    if (pkg.mode === 'training') {
      const weak = S.weakList(U.store.data, p.id, pkg.max);
      if (!weak.length) { U.toast('Трудных примеров нет — проверь себя в «Школьном блице»'); return; }
      keys = U.gen.order(weak, Math.random);
    } else if (U.STREAM_MODES[pkg.mode]) next = U.gen.stream(pkg, Math.random);
    else keys = U.gen.round(pkg, Math.random);
    stop();
    const self = U.inputOf(p) === 'keys';
    R = new U.Round(pkg, { keys, next, onShow, onFinish, selfCheck: self });
    ctx = { pkg, self, typed: '', flash: null, fx: null, fxIdx: -1, trail: 0, pauses: 0, saved: !!(opts && opts.saved), startedAt: null, count: 3, cdPaused: false, swipeAt: 0, ghost: ghostFor(pkg, p, self),
      exam: opts && opts.exam ? Object.assign({}, opts.exam, U.levels.terms(U.levels.byId(opts.exam.id), opts.exam.level)) : null };
    U.go('round', {}, { replace: ui.screen === 'round' || ui.screen === 'result' });
    acquireWake();
    if (opts && opts.instant) { ctx.count = 0; ctx.startedAt = Date.now(); R.start(performance.now()); loop(); return; }
    countdown();
  };

  function ghostFor(pkg, p, self) {
    if (pkg.id === 'once' || pkg.mode === 'training' || /^exam-/.test(pkg.id)) return null;
    const best = S.records(U.store.data, pkg.id, p.id, { input: self ? 'keys' : 'voice', cfg: U.pkgSnapshot(pkg) })[0];
    if (!best) return null;
    return { best, marks: best.items.filter((it) => it.at !== null && it.at !== undefined).map((it) => it.at) };
  }

  function countdown() {
    ctx.count = 3;
    ctx.cdPaused = false;
    U.sound.count();
    U.render();
    clearTimeout(ctx.timer);
    const step = () => {
      if (!R || ui.screen !== 'round' || ctx.cdPaused) return;
      ctx.count--;
      if (ctx.count > 0) { U.sound.count(); U.render(); ctx.timer = setTimeout(step, 1000); return; }
      ctx.startedAt = Date.now();
      R.start(performance.now());
      loop();
    };
    ctx.timer = setTimeout(step, 1000);
  }

  function onShow(item) {
    ctx.typed = '';
    if (R.items.length > 1) react(R.items.length - 2);
    if (ctx.pkg.voice) U.sound.speak(U.gen.speech(item.k)); else U.sound.next();
    if (ui.screen === 'round') U.render();
  }
  function onFinish() {
    cancelAnimationFrame(raf);
    clearInterval(iv);
    releaseWake();
    const items = R.items.map((it) => {
      const o = { k: it.k, m: it.m, t: it.t === null ? null : Math.round(it.t), at: it.at === null ? null : Math.round(it.at) };
      if (it.late) o.late = 1;
      if (it.a !== undefined) o.a = it.a;
      return o;
    });
    ui.review = { pkg: ctx.pkg, saved: ctx.saved, self: ctx.self, exam: ctx.exam ? { id: ctx.exam.id, level: ctx.exam.level } : null, items, durationMs: Math.round(R.elapsed), paused: R.wasPaused, startedAt: ctx.startedAt };
    if (ctx.pkg.mode === 'dictation') U.sound.go();
    R = null;
    // ответы с клавиатуры уже проверены — сразу итог, без экрана проверки
    if (ctx.self) { saveRound(); return; }
    U.go('review', {}, { replace: true });
  }

  // Реакция дорожки на ответ: герой подпрыгивает или трясётся, каждые 5 верных подряд — «Серия ×5!».
  // В диктанте верно или нет не показываем — герой просто идёт вперёд.
  function react(idx) {
    if (!R || idx <= ctx.fxIdx || !R.items[idx]) return;
    ctx.fxIdx = idx;
    if (ctx.pkg.mode === 'dictation') return;
    if (R.items[idx].m === null) return;
    const ok = R.items[idx].m === 1;
    let run = 0;
    for (let i = idx; i >= 0 && R.items[i].m === 1; i--) run++;
    ctx.fx = { ok, at: performance.now(), combo: ok && run >= 5 && run % 5 === 0 ? run : 0 };
    if (ctx.fx.combo) U.sound.combo();
  }
  const fxAge = () => (ctx.fx ? performance.now() - ctx.fx.at : 1e9);

  function signature() {
    const c = R && R.cur();
    return [R ? R.items.length : -1, c ? c.m : '', R && R.paused, R && R.pendingEnd, ctx.count, ctx.cdPaused, ctx.typed, !!ctx.flash].join('|');
  }
  // Один шаг часов. Ходят и по кадрам (плавная полоска), и по таймеру раз в 0,1 с —
  // на случай, если браузер придерживает кадры (экономия энергии, фоновые режимы).
  function frame() {
    if (!R || ui.screen !== 'round') return false;
    R.tick(performance.now());
    if (!R || R.finished) return false;
    const s = signature();
    if (s !== sig) U.render(); else updateDynamic();
    return true;
  }
  function loop() {
    cancelAnimationFrame(raf);
    clearInterval(iv);
    const f = () => { if (frame()) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    iv = setInterval(() => { if (!frame()) clearInterval(iv); }, 100);
  }
  function stop() {
    cancelAnimationFrame(raf);
    clearInterval(iv);
    if (ctx) { clearTimeout(ctx.timer); clearTimeout(ctx.flashTimer); }
    releaseWake();
    U.sound.silence();
    R = null;
  }

  /* ---------- Экран раунда ---------- */
  function okCount() { return R.items.filter((it) => it.m === 1).length; }
  // Цель испытания вместо призрака рекорда
  function goalHTML() {
    const x = ctx.exam, sec = (v) => U.num(v) + ' с';
    let t;
    if (x.series) t = 'Цель: серия ' + x.series + ' · сейчас ' + okCount();
    else if (x.need) t = 'Цель: ' + x.need + ' верных · сейчас ' + okCount();
    else if (x.totalMs) t = 'Цель: без ошибок за ' + F.time(x.totalMs);
    else t = 'Цель: без ошибок, до ' + sec(x.each) + ' на пример';
    const broke = !x.series && ((ctx.pkg.mode !== 'dictation' && R.items.some((it) => it.m === 0)) || (x.totalMs && R.elapsed > x.totalMs) || R.wasPaused);
    if (broke) return `<div class="pill ghost goal broke">${ic('cross')}Испытание уже не засчитается — доиграй для тренировки</div>`;
    return `<div class="pill ghost goal">${ic('target')}${t}</div>`;
  }
  // Полоска времени: отсчёт примера или минуты, а в испытании на общее время — запас до лимита
  function timeBar() {
    const cd = R.countdown();
    if (cd) return cd;
    if (ctx.exam && ctx.exam.totalMs) return { left: Math.max(0, ctx.exam.totalMs - R.elapsed), full: ctx.exam.totalMs, total: true };
    return null;
  }
  const barLabel = (cd) => (R.mode === 'minute' || cd.total ? F.time(cd.left + 999) : Math.ceil(cd.left / 1000) + ' с');
  function ghostHTML() {
    if (ctx.exam) return goalHTML();
    const g = ctx.ghost, mode = ctx.pkg.mode;
    if (!g) return '';
    const b = g.best.s;
    if (mode === 'fast') {
      const done = R.items.filter((it) => it.at !== null).length, total = R.total || 1;
      const rec = g.marks.filter((x) => x <= R.elapsed).length;
      return `<div class="panel race"><div class="race-head">${ic('clock')}<span id="race-t">${F.time(R.elapsed)}</span><span class="soft">отвечено к этой секунде</span></div>
        <div class="lane"><span>Ты</span><div class="track"><i id="race-you" style="width:${done / total * 100}%"></i></div><span class="t" id="race-n1">${done}</span></div>
        <div class="lane rec"><span>Рекорд</span><div class="track"><i id="race-rec" style="width:${rec / total * 100}%"></i></div><span class="t" id="race-n2">${rec}</span></div></div>`;
    }
    if (mode === 'minute') return `<div class="pill ghost">${ic('trophy')}Рекорд: ${b.correct} · сейчас ${okCount()}</div>`;
    if (mode === 'streak') return `<div class="pill ghost">${ic('trophy')}Рекорд: серия ${b.streak} · сейчас ${okCount()}</div>`;
    return `<div class="pill ghost">${ic('trophy')}Рекорд: ${b.correct} из ${b.total}</div>`;
  }

  // Сколько пути пройдено: доля примеров, времени минуты или цели испытания
  function trailProgress() {
    if (!R) return 0;
    const x = ctx.exam, ok = okCount();
    if (x && x.series) return Math.min(1, ok / x.series);
    if (x && x.need) return Math.min(1, ok / x.need);
    if (R.mode === 'minute') return Math.min(1, R.elapsed / ((ctx.pkg.duration || 60) * 1000));
    if (R.mode === 'streak') return Math.min(1, ok / Math.max((ctx.ghost && ctx.ghost.best.s.streak) || 0, 10));
    if (R.total) return Math.min(1, R.items.filter((it, i) => it.m !== null || i < R.items.length - 1).length / R.total);
    return 0;
  }
  const TRAIL_BOX = { space: '40 10 120 210', dragon: '10 30 180 190', pirate: '0 20 200 190' };
  function trailHTML() {
    const p = U.player(), age = fxAge(), at = (ctx.trail * 100).toFixed(1) + '%';
    let cls = '', st = '';
    if (ctx.fx && age < 600) { cls = ctx.fx.ok ? ' hop' : ' oops'; st = 'animation-delay:-' + Math.round(age) + 'ms;'; }
    return `<div class="trail${trailProgress() >= 0.999 ? ' done' : ''}" aria-hidden="true"><div class="trail-line"><i id="trk-line" style="width:${at}"></i></div>
      <div class="trail-run"><span class="trail-hero${cls}" id="trk-hero" style="${st}left:${at}">${A.hero(p.theme, U.levelInfo(p).st).replace('viewBox="0 0 200 220"', 'viewBox="' + (TRAIL_BOX[p.theme] || TRAIL_BOX.space) + '"')}</span></div><span class="trail-goal">${A.goal(p.theme)}</span></div>`;
  }
  // Герой едет к новой точке плавно: после перерисовки и с ходом часов
  function moveTrail(fresh) {
    if (!R || !ctx) return;
    const v = trailProgress(), h = document.getElementById('trk-hero');
    if (!h || Math.abs(v - ctx.trail) < 0.0005) return;
    if (fresh) void h.offsetWidth;
    h.style.left = document.getElementById('trk-line').style.width = (v * 100).toFixed(1) + '%';
    ctx.trail = v;
  }
  U.after.round = () => { moveTrail(true); fitAnswers(); };
  function sparksHTML(age) {
    const cols = ['#ffc531', '#2fbf71', '#ff7ad9', '#4fd1ff'];
    let s = '';
    for (let i = 0; i < 10; i++) s += `<i style="--a:${i * 36 + 8}deg;--c:${cols[i % 4]};animation-delay:-${Math.round(age)}ms"></i>`;
    return `<div class="sparks" aria-hidden="true">${s}</div>`;
  }

  U.screens.round = function () {
    if (!R || !ctx) return '';
    const pkg = ctx.pkg, mode = pkg.mode, n = R.items.length, cur = R.cur();
    const counting = ctx.count > 0, paused = R.paused || ctx.cdPaused;
    const counter = R.total ? `${Math.max(n, 1)} / ${R.total}` : `№ ${Math.max(n, 1)}`;
    const spent = !paused && !counting && !canPause();
    const pauseBtn = counting && !ctx.cdPaused ? '<span class="icon-gap"></span>'
      : `<button class="icon-btn${spent ? ' spent' : ''}" data-act="pause" aria-label="${paused ? 'Продолжить' : spent ? 'Пауза уже была' : 'Пауза'}">${ic(paused ? 'play' : 'pause')}</button>`;
    let html = `<div class="topbar"><div class="pill">${counter}</div><div class="grow center pkg-name">${ctx.exam ? ic('trophy') : ''}${esc(pkg.name)}</div>${pauseBtn}</div>`;

    if (R.total && R.total <= 40) {
      let segs = '';
      for (let i = 0; i < R.total; i++) {
        const it = R.items[i];
        let cls = '';
        if (it && i < n - 1) cls = it.m === 1 ? 'ok' : it.m === 0 ? 'bad' : 'skip';
        else if (it && i === n - 1 && !counting) cls = U.FIXED_MODES[mode] ? 'cur' : (it.m === null ? 'cur' : it.m ? 'ok' : 'bad');
        if (mode === 'dictation' && cls && cls !== 'cur') cls = 'done';
        segs += `<i class="${cls}"></i>`;
      }
      html += `<div class="segs">${segs}</div>`;
    } else if (!counting) {
      const ok = okCount(), bad = R.items.filter((it) => it.m === 0).length;
      html += `<div class="row center-row"><div class="pill">${ic('check')}${ok}</div>${mode === 'minute' ? `<div class="pill">${ic('cross')}${bad}</div>` : ''}</div>`;
    }

    html += trailHTML();
    if (!pkg.hideTime && !counting) {
      const cd = timeBar();
      if (cd) html += `<div class="timer-row"><div class="timer${cd.left < 1000 ? ' hot' : ''}" id="cd-box"><i id="cd-bar" style="width:${cd.left / cd.full * 100}%"></i></div><b id="cd-num">${barLabel(cd)}</b></div>`;
      if (!ctx.exam && ((mode === 'fast' && !ctx.ghost) || mode === 'training' || mode === 'limit')) html += `<div class="pill ghost">${ic('clock')}<span id="sw">${F.time(R.elapsed)}</span></div>`;
    }
    if (!counting) html += ghostHTML();

    let card;
    if (paused) {
      card = `<div class="example-card pause-card"><div class="eq" style="margin:0 0 6px">Пауза</div><div class="listen" style="margin:0 0 14px">${ctx.exam ? 'После паузы испытание не засчитается. ' : ''}Пауза — один раз за раунд</div>
        <button class="btn btn-primary btn-big" data-act="resume">${ic('play')}Продолжить</button>
        <button class="link-btn" data-act="abort">Прервать раунд</button></div>`;
    } else if (counting) {
      card = `<div class="example-card"><div class="count-big">${ctx.count}</div><div class="eq">Приготовились!</div></div>`;
    } else if (mode === 'dictation') {
      const line = ctx.self ? `<div class="answers-line" aria-label="Ответы">${answersLine()}</div>` : '';
      card = `<div class="example-card dict-card"><div class="card-num">${ic('sound')}</div><div class="example">№ ${n}</div><div class="listen">${ctx.self ? 'Слушай и набирай ответ' : 'Слушай и пиши ответ'}</div>${line}</div>`;
    } else if (R.pendingEnd !== null) {
      card = `<div class="example-card"><div class="card-badge bad">${ic('cross')}Ошибка — серия закончилась</div>
        <div class="example">${U.exHTML(cur.k)}</div>
        <button class="btn btn-light btn-sm undo-btn" data-act="undoStreak">Нажали по ошибке — ответ верный</button></div>`;
    } else {
      const badge = !ctx.self && U.FIXED_MODES[mode] && cur.m !== null ? `<div class="card-badge${cur.m ? '' : ' bad'}">${ic(cur.m ? 'check' : 'cross')}Отмечено «${cur.m ? 'верно' : 'неверно'}»</div>` : '';
      // короткая вспышка после ответа с клавиатуры; правильный ответ не показываем
      const flash = ctx.flash ? `<div class="card-badge flash-badge${ctx.flash.ok ? '' : ' bad'}">${ic(ctx.flash.ok ? 'check' : 'cross')}${ctx.flash.ok ? 'Верно!' : 'Ошибка'}</div>` : '';
      const eq = ctx.self ? `<div class="eq">= <span class="typed${ctx.typed ? '' : ' empty'}">${ctx.typed || '?'}</span></div>` : '<div class="eq">= ?</div>';
      const fl = ctx.flash ? (ctx.flash.ok ? ' flash-ok' : ' flash-bad') : '';
      // перерисовка во время вспышки продолжает движение с того же места, а не запускает заново
      const fa = ctx.flash ? performance.now() - ctx.flash.at : 0, cardSt = ctx.flash ? ` style="animation-delay:-${Math.round(fa)}ms"` : '';
      const sparks = ctx.flash && ctx.flash.ok && fa < 650 ? sparksHTML(fa) : '';
      const age = fxAge(), combo = ctx.fx && ctx.fx.combo && age < 1300 ? `<div class="combo" style="animation-delay:-${Math.round(age)}ms">Серия ×${ctx.fx.combo}!</div>` : '';
      card = `<div class="example-card${fl}"${cardSt}>${badge}${flash}<div class="example">${U.exHTML(cur.k)}</div>${eq}${sparks}${combo}</div>`;
    }
    html += card;

    if (ctx.self) {
      html += keypadHTML(counting || paused) + `<div class="swipe-hint">${touch() ? 'Набери ответ — он засчитается сам' : 'цифры — ответ засчитается сам · Backspace — стереть · пробел — пауза'}</div>`;
    } else if (mode === 'dictation') {
      html += `<div class="swipe-hint">Ответы пишем на листке — проверим после диктанта</div>`;
    } else {
      const m = U.FIXED_MODES[mode] && cur && !counting ? cur.m : null, off = counting || paused || R.pendingEnd !== null;
      html += `<div class="answer-btns">
        <button class="answer bad${m === 1 ? ' dim' : ''}" data-act="markBad"${off ? ' disabled' : ''}>${ic('cross')}Неверно</button>
        <button class="answer ok${m === 0 ? ' dim' : ''}" data-act="markOk"${off ? ' disabled' : ''}>${ic('check')}Верно</button></div>
        <div class="swipe-hint">${touch() ? 'или свайп влево / вправо' : '← неверно · → верно · пробел — пауза'}</div>`;
    }
    sig = signature();
    return `<div class="screen${ctx.self ? ' selfmode' : ''}">${html}</div>`;
  };

  // Строка ответов диктанта через запятую, как в тетради: последние 10 и то, что набирается сейчас
  // Строка ответов диктанта — всегда одна строка: новые ответы справа, старые уходят влево за край,
  // чтобы строка не росла вниз и не наезжала на клавиатуру (Сергей, 26.10.2026)
  function answersLine() {
    const done = R.items.slice(0, R.items.length - 1).map((it) => (it.a !== undefined ? it.a : '—'));
    return '<span class="al-track">' + done.slice(-16).concat([`<b class="typed-in">${ctx.typed || '&nbsp;'}</b>`]).join(', ') + '</span>';
  }
  function fitAnswers() {
    const box = document.querySelector('.answers-line'), tr = box && box.firstElementChild;
    if (tr) box.classList.toggle('long', tr.scrollWidth > box.clientWidth + 1);
  }
  function keypadHTML(off) {
    // ноль — широкий, как на калькуляторе; справа «стереть»
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del'];
    return `<div class="keypad">${keys.map((k) => {
      const cls = k === '0' ? ' key-wide' : k === 'del' ? ' key-del' : '';
      const label = k === 'del' ? 'Стереть' : k;
      const face = k === 'del' ? '⌫' : k;
      return `<button class="key${cls}" data-act="key" data-v="${k}" aria-label="${label}"${off ? ' disabled' : ''}>${face}</button>`;
    }).join('')}</div>`;
  }

  function updateDynamic() {
    const cd = timeBar(), bar = document.getElementById('cd-bar');
    if (cd && bar) {
      bar.style.width = (cd.left / cd.full * 100) + '%';
      document.getElementById('cd-num').textContent = barLabel(cd);
      document.getElementById('cd-box').classList.toggle('hot', cd.left < 1000);
    }
    const sw = document.getElementById('sw');
    if (sw) sw.textContent = F.time(R.elapsed);
    if (R.mode === 'minute') moveTrail(false);
    const rt = document.getElementById('race-t');
    if (rt && ctx.ghost) {
      rt.textContent = F.time(R.elapsed);
      const rec = ctx.ghost.marks.filter((x) => x <= R.elapsed).length;
      document.getElementById('race-rec').style.width = (rec / (R.total || 1) * 100) + '%';
      document.getElementById('race-n2').textContent = rec;
    }
  }

  /* ---------- Действия во время раунда ---------- */
  P.mark = function (v) {
    if (!R || ctx.self || ctx.count > 0 || ctx.cdPaused) return;
    const idx = R.items.length - 1;
    if (R.mark(v, performance.now())) {
      react(idx);
      if (v) U.sound.ok(); else U.sound.bad();
      if (navigator.vibrate) navigator.vibrate(12);
      if (R && !R.finished && ui.screen === 'round') U.render();
    }
  };

  // Набор ответа на экранной клавиатуре. Кнопки «Ответить» нет: как только набрано столько цифр,
  // сколько в правильном ответе, ответ засчитан и сразу следующий пример (Сергей, 25.10.2026).
  // Пока цифр меньше — последнюю можно стереть.
  P.type = function (v) {
    if (!R || !ctx || !ctx.self || ctx.count > 0 || ctx.cdPaused || R.paused || R.finished || !R.cur()) return;
    if (v === 'del') ctx.typed = ctx.typed.slice(0, -1);
    else if (/^\d$/.test(v)) {
      ctx.typed = ctx.typed === '0' ? v : ctx.typed + v;          // ответов с нуля впереди не бывает
      if (ctx.typed.length >= String(U.gen.parse(R.cur().k).ans).length) { submit(); return; }
    } else return;
    R.draft = ctx.typed ? Number(ctx.typed) : null;
    const box = document.querySelector('.example-card .typed'), line = document.querySelector('.answers-line .typed-in');
    if (box) { box.textContent = ctx.typed || '?'; box.classList.toggle('empty', !ctx.typed); }
    else if (line) { line.innerHTML = ctx.typed || '&nbsp;'; fitAnswers(); }
    else { U.render(); return; }
    sig = signature();
  };
  function submit() {
    if (!ctx.typed) return;
    const val = Number(ctx.typed), dict = ctx.pkg.mode === 'dictation', c = ctx, idx = R.items.length - 1;
    ctx.typed = '';
    const res = R.answer(val, performance.now());
    if (res === null) return;
    if (navigator.vibrate) navigator.vibrate(10);
    react(idx);
    if (!dict && R) {
      if (res) U.sound.ok(); else U.sound.bad();
      c.flash = { ok: res, at: performance.now() };
      clearTimeout(c.flashTimer);
      c.flashTimer = setTimeout(() => { c.flash = null; if (R && ctx === c && ui.screen === 'round') U.render(); }, 650);
    }
    if (R && !R.finished && ui.screen === 'round') U.render();
  }
  U.actions.key = (ds) => P.type(ds.v);

  const recentSwipe = () => ctx && Date.now() - ctx.swipeAt < 450;
  U.actions.markOk = () => { if (!recentSwipe()) P.mark(1); };
  U.actions.markBad = () => { if (!recentSwipe()) P.mark(0); };
  U.actions.undoStreak = () => { if (R) { R.undoStreak(performance.now()); U.render(); } };
  P.togglePause = function () {
    if (!R || !ctx) return;
    if (ctx.count > 0) {
      if (ctx.cdPaused) countdown(); else { ctx.cdPaused = true; clearTimeout(ctx.timer); U.render(); }
      return;
    }
    if (R.paused) { R.resume(performance.now()); acquireWake(); }
    else if (!canPause()) { U.toast('Пауза — только один раз за раунд'); return; }
    else pauseRound();
    U.render();
  };
  // Пауза — один раз за раунд (Сергей, 26.10.2026). Отсчёт 3-2-1 не считается: часы ещё не идут.
  function canPause() { return !!ctx && ctx.pauses < 1; }
  function pauseRound() { R.pause(performance.now()); ctx.pauses++; U.sound.silence(); }
  U.actions.pause = () => P.togglePause();
  U.actions.resume = () => P.togglePause();
  P.askAbort = function () {
    if (!R) return;
    if (ctx.count > 0) { ctx.cdPaused = true; clearTimeout(ctx.timer); } else if (!R.paused && canPause()) pauseRound();
    U.render();
    U.confirm('Прервать раунд?', 'Результат не сохранится.', 'Прервать', () => { stop(); U.back(); }, { danger: true, no: 'Играть дальше' });
  };
  U.actions.abort = () => P.askAbort();
  P.key = function (e) {
    if (ui.modal) { if (e.key === 'Escape') U.closeModal(); return; }
    if (ctx && ctx.self) {
      if (/^\d$/.test(e.key)) P.type(e.key);
      else if (e.key === 'Backspace') P.type('del');
      else if (e.key === ' ' || e.key === 'Spacebar') P.togglePause();
      else if (e.key === 'Escape') P.askAbort();
      else return;
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { P.mark(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { P.mark(0); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Spacebar') { P.togglePause(); e.preventDefault(); }
    else if (e.key === 'Escape') P.askAbort();
  };
  P.bindSwipe = function (el) {
    let x0 = null, y0 = 0;
    el.addEventListener('pointerdown', (e) => { if (ui.screen === 'round') { x0 = e.clientX; y0 = e.clientY; } });
    el.addEventListener('pointerup', (e) => {
      if (x0 === null || ui.screen !== 'round' || (ctx && ctx.self)) { x0 = null; return; }
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 90 && R && !R.paused) { ctx.swipeAt = Date.now(); P.mark(dx > 0 ? 1 : 0); }
    });
    el.addEventListener('pointercancel', () => { x0 = null; });
  };

  async function acquireWake() {
    try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; }
  }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* уже отпущен */ } wake = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (R && ctx && ui.screen === 'round') {
        if (ctx.count > 0) { ctx.cdPaused = true; clearTimeout(ctx.timer); U.sound.silence(); }
        else if (!R.paused && canPause()) pauseRound();
        U.render();
      }
    } else if (R && ui.screen === 'round') acquireWake();
  });

  /* ---------- Сверка (когда отмечает родитель) ---------- */
  U.screens.review = function () {
    const rv = ui.review;
    if (!rv) return '';
    const it = rv.items, ok = it.filter((x) => x.m === 1).length, bad = it.filter((x) => x.m === 0).length, none = it.length - ok - bad;
    const rows = it.map((x, i) => {
      const e = U.gen.parse(x.k), t = x.late ? 'время вышло' : x.m === null ? (rv.pkg.mode === 'dictation' ? '' : 'без отметки') : x.t !== null ? F.sec(x.t) : '';
      return `<div class="rrow${x.m === null && rv.pkg.mode !== 'dictation' ? ' skip' : ''}"><span class="n">${i + 1}</span>
        <span class="ex">${U.gen.text(x.k)} <span class="res">= ${e.ans}</span></span><span class="t">${t}</span>
        <span class="mark"><button class="${x.m === 0 ? 'on bad' : ''}" data-act="rmark" data-i="${i}" data-v="0" aria-label="Неверно">${ic('cross')}</button><button class="${x.m === 1 ? 'on ok' : ''}" data-act="rmark" data-i="${i}" data-v="1" aria-label="Верно">${ic('check')}</button></span></div>`;
    }).join('');
    const title = rv.pkg.mode === 'dictation' ? 'Проверим листок' : 'Проверка';
    const sub = rv.pkg.mode === 'dictation' ? 'Отметьте, что ребёнок написал верно' : 'Нажали не то — поправьте отметку';
    return `<div class="screen">
      <div class="topbar"><div class="grow who"><div class="name">${title}</div><div class="title">${sub}</div></div>
        <button class="pill" data-act="rDiscard">Не сохранять</button></div>
      <div class="counts"><div class="count ok"><b>${ok}</b><span>верно</span></div><div class="count bad"><b>${bad}</b><span>неверно</span></div><div class="count skip"><b>${none}</b><span>без отметки</span></div></div>
      <div class="review-list" id="rlist">${rows}</div>
      ${none ? `<button class="btn btn-light" data-act="rAllOk">${ic('check')}Остальные — верно</button>` : ''}
      <button class="btn btn-primary btn-big" data-act="rSave">${ic('check')}Сохранить</button>
    </div>`;
  };
  // Затухание внизу списка — только пока ниже есть строки
  U.after.review = function () {
    const l = document.getElementById('rlist');
    if (!l) return;
    const upd = () => l.classList.toggle('fade', l.scrollTop + l.clientHeight < l.scrollHeight - 4);
    l.addEventListener('scroll', upd, { passive: true });
    upd();
  };
  U.actions.rmark = (ds) => {
    const x = ui.review.items[Number(ds.i)], v = Number(ds.v);
    x.m = x.m === v ? null : v;
    if (x.m !== null) delete x.late;
    const list = document.getElementById('rlist'), top = list ? list.scrollTop : 0;
    U.render();
    const l2 = document.getElementById('rlist');
    if (l2) l2.scrollTop = top;
  };
  U.actions.rAllOk = () => { ui.review.items.forEach((x) => { if (x.m === null) x.m = 1; }); U.render(); };
  P.askDiscard = () => U.confirm('Не сохранять раунд?', 'Он не попадёт в историю и рекорды.', 'Не сохранять', () => { ui.review = null; U.go('home', {}, { reset: true }); }, { danger: true, no: 'Вернуться' });
  U.actions.rDiscard = () => P.askDiscard();

  // Настроение итога: победа — без ошибок и в лимит (испытание пройдено, рекорд, кубок);
  // неудача — ошибки или не уложились; спокойно — серия без рекорда и самый первый раунд с ошибками
  function isClean(r) {
    const s = r.s;
    if (r.mode === 'streak') return false;
    return r.mode === 'minute' ? s.correct > 0 && !(s.wrong + s.none) : s.total > 0 && s.correct === s.total;
  }
  function moodOf(res) {
    const r = res.round, ex = res.exam;
    if (ex) return ex.passed ? 'win' : 'lose';
    if ((res.record && res.prev) || res.cups.length || isClean(r)) return 'win';
    if (r.mode === 'streak') return 'calm';
    return res.first ? 'calm' : 'lose';
  }
  P.moodOf = moodOf;
  // Подбадривание после неудачи — по тому, что именно помешало
  function cheerText(res) {
    const r = res.round, s = r.s, ex = res.exam, miss = s.total - s.correct;
    if (ex) {
      const e = ex.exam, t = U.levels.terms(e, ex.level);
      if (r.paused) return 'Пауза не засчитывается — попробуй без неё!';
      if (e.kind === 'series') { const n = t.series - s.streak; return n <= 3 ? 'Почти! До цели всего ' + n + ' ' + U.plural(n, 'верный ответ', 'верных ответа', 'верных ответов') + ' — ещё раз?' : 'Хорошая попытка! Серия растёт — ещё раз?'; }
      if (e.kind === 'minute' && !(s.wrong + s.none)) { const n = t.need - s.correct; return 'Без ошибок! Не хватило ' + n + ' ' + U.plural(n, 'ответа', 'ответов', 'ответов') + ' — ещё раз?'; }
      if (!miss) return t.totalMs && s.timeMs > t.totalMs * 1.25 ? 'Без ошибок — молодец! Теперь чуть быстрее — и получится.' : 'Без ошибок — молодец! Чуть-чуть не хватило скорости.';
    }
    if (miss === 1) return 'Почти! Всего одна ошибка — ещё раз?';
    return 'Не беда: каждая попытка — это тренировка. Ещё раз?';
  }

  function saveRound() {
    const rv = ui.review, p = U.player(), d = U.store.data;
    const round = { id: U.store.uid(), player: p.id, pkg: rv.saved ? rv.pkg.id : null, name: (rv.exam ? 'Испытание: ' : '') + rv.pkg.name, mode: rv.pkg.mode,
      input: rv.self ? 'keys' : 'voice', cfg: U.pkgSnapshot(rv.pkg), startedAt: rv.startedAt || Date.now(), exam: rv.exam || undefined,
      durationMs: rv.durationMs, paused: !!rv.paused, items: rv.items };
    const res = S.commit(d, p, round, Date.now());
    U.store.save();
    ui.result = res;
    ui.review = null;
    const mood = moodOf(res);
    if (mood === 'win') U.sound.fanfare(); else if (mood === 'lose') U.sound.sad(); else U.sound.ok();
    U.go('result', {}, { replace: true });
  }
  U.actions.rSave = saveRound;

  /* ---------- Итог ---------- */
  function errorText(x) {
    const p = U.gen.parts(x.k), head = p[0] + ' ' + p[1] + ' ' + p[2] + ' = <b class="ok">' + U.gen.parse(x.k).ans + '</b>';
    if (x.a !== undefined) return head + ' <span class="no">не ' + x.a + '</span>';
    if (x.late) return head + ' <span class="no">время вышло</span>';
    return head;
  }
  U.screens.result = function () {
    const res = ui.result, p = U.player();
    if (!res || !p) return U.screens.home();
    const r = res.round, s = r.s, T = U.THEMES[p.theme], L = U.levelInfo(p), ex = res.exam;
    const levelUp = res.levelAfter > res.levelBefore || !!(ex && ex.master);
    const stageUp = levelUp && U.stageOf(res.levelAfter) > U.stageOf(res.levelBefore);
    let ribbon = '';
    if (ex && ex.master) ribbon = 'Все уровни пройдены!';
    else if (levelUp) ribbon = 'Новый уровень!';
    else if (ex && ex.passed) ribbon = 'Испытание пройдено!';
    else if (!ex && res.record && res.prev) ribbon = 'Новый рекорд!';
    else if (!ex && res.first && !r.paused) ribbon = 'Первый результат!';
    const mood = moodOf(res), anim = U.animOn(), fresh = !res.shown;
    if (!ribbon && isClean(r)) ribbon = 'Без ошибок!';
    else if (!ribbon && res.cups.length) ribbon = 'Новый кубок!';
    // число набегает от нуля; само число остаётся в тексте страницы
    const num = (n) => `<span class="num-up" style="--n:${n}"><span>${n}</span></span>`;
    let score;
    if (r.mode === 'streak') score = `${num(s.streak)}<small> подряд</small>`;
    else if (r.mode === 'minute') score = `${num(s.correct)}<small> ${U.plural(s.correct, 'верный', 'верных', 'верных')}</small>`;
    else score = `${num(s.correct)}<small> из ${s.total}</small>`;
    const subs = [];
    if (r.mode === 'fast' || r.mode === 'limit' || r.mode === 'training' || r.input === 'keys') subs.push('Время: ' + F.time(s.timeMs));
    if (!ex) {
      if (res.prev) subs.push((res.record ? 'Прошлый рекорд — ' : 'Рекорд — ') + S.resultText(res.prev));
      if (r.paused) subs.push('Была пауза — в рекорды не идёт');
      if (!r.pkg) subs.push('Разовый раунд — в рекорды не идёт');
    }
    let examPanel = '';
    if (ex && ex.passed) {
      const msg = levelUp && !ex.master ? 'Открыт уровень ' + res.levelAfter + ': темп ' + U.num(U.levels.pace(res.levelAfter)) + ' с на пример'
        : ex.newPass ? 'Засчитано на уровне ' + ex.level + ' · испытания ' + L.passed + ' из ' + L.of : 'Пройдено ещё раз';
      examPanel = `<div class="exam-verdict ok">${ic('check')}<span>${msg}</span></div>`;
    } else if (ex) {
      const before = L.done[ex.exam.id] && ex.level === L.lv ? ' · раньше уже пройдено, зачёт остаётся' : '';
      examPanel = `<div class="exam-verdict bad">${ic('cross')}<span>Не пройдено: ${ex.why.join(', ')}${before}</span></div>`;
    }
    const lines = res.lines.map((l) => `<li><span>${esc(l[0])}</span><b>+${l[1]}</b></li>`).join('');
    const errs = r.items.filter((x) => x.m !== 1).map(errorText);
    const uniq = errs.filter((x, i) => errs.indexOf(x) === i).slice(0, 4);
    const status = L.master ? 'все уровни пройдены' : stageUp ? 'Герой вырос: ' + T.hero[L.st - 1] + '!' : 'испытания ' + L.passed + ' из ' + L.of;
    const buttons = ex
      ? `<div class="btn-row">${ex.passed ? `<button class="btn btn-light" data-act="home">${ic('home')}Домой</button>` : `<button class="btn btn-light" data-act="again">${ic('replay')}Ещё раз</button>`}<button class="btn btn-primary" data-act="exams">${ic('trophy')}К испытаниям</button></div>`
      : `<div class="btn-row"><button class="btn btn-light" data-act="home">${ic('home')}Домой</button><button class="btn btn-primary" data-act="again">${ic('replay')}Ещё раз</button></div>`;
    const fx = mood === 'win' ? (anim && fresh ? A.winFx(p.theme) + A.confettiFall() : A.confetti()) : '';
    const heroCls = 'panel hero-mini alive' + (mood === 'win' && fresh ? ' cheer' : mood === 'lose' ? ' sad' : '') + (levelUp ? ' level-up' : '');
    return `<div class="screen mood-${mood}${fresh ? '' : ' replay'}">
      ${fx}
      <div class="result">
        ${ribbon ? `<div class="ribbon">${ribbon}</div>` : ''}
        <div class="pkg-name">${esc(r.name)}${U.VOICE_MODE && r.input === 'keys' ? ' · ответы с клавиатуры' : ''}</div>
        <div class="score">${score}</div>
        ${subs.length ? `<div class="sub">${subs.join(' · ')}</div>` : ''}
        ${mood === 'lose' ? `<div class="cheer-line">${cheerText(res)}</div>` : ''}
        ${examPanel}
        <div class="panel earn"><div class="total"><span>+${num(res.total)}</span>${A.star()}<button class="link-btn help-link" data-act="help">за что звёзды?</button></div>${lines ? `<ul>${lines}</ul>` : ''}</div>
        <div class="${heroCls}">${mood === 'lose' ? `<div class="rain-wrap">${A.rainCloud()}</div>` : ''}${A.hero(p.theme, L.st)}
          <div class="grow"><b style="font-size:17px">Уровень ${L.lv} · ${U.nb(T.titles[L.st - 1])}</b>
            <div class="soft">${status}</div>${U.examSegs(L, ex && ex.newPass && !levelUp ? ex.exam.id : null)}</div>
        </div>
        ${uniq.length ? `<div class="again">Ошибки${uniq.map((x) => `<span class="chip-ex">${x}</span>`).join('')}</div>` : ''}
      </div>
      ${buttons}
    </div>`;
  };
  // Радость героя — три прыжка, потом снова спокойное дыхание
  U.after.result = function () {
    if (ui.result) ui.result.shown = true;
    const h = document.querySelector('.hero-mini.cheer');
    if (h) setTimeout(() => h.classList.remove('cheer'), 7600);
  };
  U.actions.again = () => {
    const r = ui.result && ui.result.round, p = U.player();
    if (!r) return;
    if (r.exam) {
      // испытание — в темпе текущего уровня игрока
      const e = U.levels.byId(r.exam.id), lv = U.levels.level(p);
      U.play.start(U.levels.pkgFor(e, lv), { saved: false, exam: { id: e.id, level: lv } });
      return;
    }
    const pk = r.pkg ? U.pkgById(r.pkg) : Object.assign({ id: 'once' }, r.cfg);
    if (pk) U.play.start(pk, { saved: !!r.pkg });
  };

  /* ---------- Для проверки: раунд с готовыми ответами без ожидания ---------- */
  // Снимок реакции на верный ответ: искорки, прыжок героя и «Серия ×5!»
  P.demoFx = function () {
    if (!R || !ctx) return;
    const now = performance.now();
    ctx.flash = { ok: true, at: now };
    ctx.fx = { ok: true, at: now, combo: 5 };
    U.render();
  };
  P.simulate = function (pkgId, upto, stage, examId, clean) {
    if (examId) {
      const e = U.levels.byId(examId), lv = U.levels.level(U.player());
      P.start(U.levels.pkgFor(e, lv), { saved: false, instant: true, exam: { id: e.id, level: lv } });
    } else P.start(U.pkgById(pkgId), { saved: true, instant: true });
    if (!R) return;
    let t = performance.now();
    const say = (v) => {
      if (!ctx.self) { if (R.mode !== 'dictation') R.mark(v, t); return; }
      const ans = U.gen.parse(R.cur().k).ans;
      R.answer(v ? ans : ans + 1, t);
    };
    for (let i = 0; i < upto && R && !R.finished; i++) {
      t += 1700 + (i % 3) * 400;
      say(!clean && i % 6 === 3 ? 0 : 1);
      if (R && !ctx.self && U.FIXED_MODES[R.mode]) { t = R.cur().shown + R.interval(R.items.length - 1) + 1; R.tick(t); }
      if (R && R.mode === 'streak' && R.pendingEnd !== null) { t += 3100; R.tick(t); }
    }
    let guard = 0;
    while (stage && R && !R.finished && guard++ < 400) {
      t += 6000;
      if (R.mode === 'streak') { if (ctx.self) R.answer(-1, t); else { R.mark(0, t); if (R) R.tick(t + 3100); } }
      else if (ctx.self) say(1);
      else if (R.mode !== 'dictation' && !U.FIXED_MODES[R.mode]) R.mark(1, t);
      else R.tick(t);
    }
    if (R) { R.lastT = performance.now(); U.render(); }
    if (stage === 'result' && ui.review) saveRound();
  };
})(window.U = window.U || {});
