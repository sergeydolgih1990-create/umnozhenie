/* Раунд на экране: отсчёт 3-2-1, таймеры, отметки, пауза, свайпы, сверка и итог */
(function (U) {
  'use strict';

  const ui = U.ui, A = U.art, ic = A.icon, esc = U.esc, F = U.fmt, S = U.score;
  const starSm = () => A.star('ic sm');
  const touch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
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
    R = new U.Round(pkg, { keys, next, onShow, onFinish });
    ctx = { pkg, saved: !!(opts && opts.saved), startedAt: null, count: 3, cdPaused: false, swipeAt: 0, ghost: ghostFor(pkg, p) };
    U.go('round', {}, { replace: ui.screen === 'round' || ui.screen === 'result' });
    acquireWake();
    if (opts && opts.instant) { ctx.count = 0; ctx.startedAt = Date.now(); R.start(performance.now()); loop(); return; }
    countdown();
  };

  function ghostFor(pkg, p) {
    if (pkg.id === 'once' || pkg.mode === 'training') return null;
    const best = S.records(U.store.data, pkg.id, p.id)[0];
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
      return o;
    });
    ui.review = { pkg: ctx.pkg, saved: ctx.saved, items, durationMs: Math.round(R.elapsed), paused: R.wasPaused, startedAt: ctx.startedAt };
    if (ctx.pkg.mode === 'dictation') U.sound.go();
    R = null;
    U.go('review', {}, { replace: true });
  }

  function signature() {
    const c = R && R.cur();
    return [R ? R.items.length : -1, c ? c.m : '', R && R.paused, R && R.pendingEnd, ctx.count, ctx.cdPaused].join('|');
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
    if (ctx) clearTimeout(ctx.timer);
    releaseWake();
    U.sound.silence();
    R = null;
  }

  /* ---------- Экран раунда ---------- */
  function okCount() { return R.items.filter((it) => it.m === 1).length; }
  function ghostHTML() {
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

  U.screens.round = function () {
    if (!R || !ctx) return '';
    const pkg = ctx.pkg, mode = pkg.mode, n = R.items.length, cur = R.cur();
    const counting = ctx.count > 0, paused = R.paused || ctx.cdPaused;
    const counter = R.total ? `${Math.max(n, 1)} / ${R.total}` : `№ ${Math.max(n, 1)}`;
    const pauseBtn = counting && !ctx.cdPaused ? '<span class="icon-gap"></span>'
      : `<button class="icon-btn" data-act="pause" aria-label="${paused ? 'Продолжить' : 'Пауза'}">${ic(paused ? 'play' : 'pause')}</button>`;
    let html = `<div class="topbar"><div class="pill">${counter}</div><div class="grow center pkg-name">${esc(pkg.name)}</div>${pauseBtn}</div>`;

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

    if (!pkg.hideTime && !counting) {
      const cd = R.countdown();
      if (cd) html += `<div class="timer-row"><div class="timer${cd.left < 1000 ? ' hot' : ''}" id="cd-box"><i id="cd-bar" style="width:${cd.left / cd.full * 100}%"></i></div><b id="cd-num">${mode === 'minute' ? F.time(cd.left + 999) : Math.ceil(cd.left / 1000) + ' с'}</b></div>`;
      if ((mode === 'fast' && !ctx.ghost) || mode === 'training' || mode === 'limit') html += `<div class="pill ghost">${ic('clock')}<span id="sw">${F.time(R.elapsed)}</span></div>`;
    }
    if (!counting) html += ghostHTML();

    let card;
    if (paused) {
      card = `<div class="example-card pause-card"><div class="eq" style="margin:0 0 18px">Пауза</div>
        <button class="btn btn-primary btn-big" data-act="resume">${ic('play')}Продолжить</button>
        <button class="link-btn" data-act="abort">Прервать раунд</button></div>`;
    } else if (counting) {
      card = `<div class="example-card"><div class="count-big">${ctx.count}</div><div class="eq">Приготовились!</div></div>`;
    } else if (mode === 'dictation') {
      card = `<div class="example-card"><div class="card-num">${ic('sound')}</div><div class="example">№ ${n}</div><div class="listen">Слушай и пиши ответ</div></div>`;
    } else if (R.pendingEnd !== null) {
      card = `<div class="example-card"><div class="card-badge bad">${ic('cross')}Ошибка — серия закончилась</div>
        <div class="example">${U.exHTML(cur.k)}</div>
        <button class="btn btn-light btn-sm undo-btn" data-act="undoStreak">Нажали по ошибке — ответ верный</button></div>`;
    } else {
      const badge = U.FIXED_MODES[mode] && cur.m !== null ? `<div class="card-badge${cur.m ? '' : ' bad'}">${ic(cur.m ? 'check' : 'cross')}Отмечено «${cur.m ? 'верно' : 'неверно'}»</div>` : '';
      card = `<div class="example-card">${badge}<div class="example">${U.exHTML(cur.k)}</div><div class="eq">= ?</div></div>`;
    }
    html += card;

    if (mode === 'dictation') {
      html += `<div class="swipe-hint">Ответы пишем на листке — проверим после диктанта</div>`;
    } else {
      const m = U.FIXED_MODES[mode] && cur && !counting ? cur.m : null, off = counting || paused || R.pendingEnd !== null;
      html += `<div class="answer-btns">
        <button class="answer bad${m === 1 ? ' dim' : ''}" data-act="markBad"${off ? ' disabled' : ''}>${ic('cross')}Неверно</button>
        <button class="answer ok${m === 0 ? ' dim' : ''}" data-act="markOk"${off ? ' disabled' : ''}>${ic('check')}Верно</button></div>
        <div class="swipe-hint">${touch() ? 'или свайп влево / вправо' : '← неверно · → верно · пробел — пауза'}</div>`;
    }
    sig = signature();
    return `<div class="screen">${html}</div>`;
  };

  function updateDynamic() {
    const cd = R.countdown(), bar = document.getElementById('cd-bar');
    if (cd && bar) {
      bar.style.width = (cd.left / cd.full * 100) + '%';
      document.getElementById('cd-num').textContent = R.mode === 'minute' ? F.time(cd.left + 999) : Math.ceil(cd.left / 1000) + ' с';
      document.getElementById('cd-box').classList.toggle('hot', cd.left < 1000);
    }
    const sw = document.getElementById('sw');
    if (sw) sw.textContent = F.time(R.elapsed);
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
    if (!R || ctx.count > 0 || ctx.cdPaused) return;
    if (R.mark(v, performance.now())) {
      if (v) U.sound.ok(); else U.sound.bad();
      if (navigator.vibrate) navigator.vibrate(12);
      if (R && !R.finished && ui.screen === 'round') U.render();
    }
  };
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
    if (R.paused) { R.resume(performance.now()); acquireWake(); } else { R.pause(performance.now()); U.sound.silence(); }
    U.render();
  };
  U.actions.pause = () => P.togglePause();
  U.actions.resume = () => P.togglePause();
  P.askAbort = function () {
    if (!R) return;
    if (ctx.count > 0) { ctx.cdPaused = true; clearTimeout(ctx.timer); } else if (!R.paused) R.pause(performance.now());
    U.render();
    U.confirm('Прервать раунд?', 'Результат не сохранится.', 'Прервать', () => { stop(); U.back(); }, { danger: true, no: 'Играть дальше' });
  };
  U.actions.abort = () => P.askAbort();
  P.key = function (e) {
    if (ui.modal) { if (e.key === 'Escape') U.closeModal(); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { P.mark(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { P.mark(0); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Spacebar') { P.togglePause(); e.preventDefault(); }
    else if (e.key === 'Escape') P.askAbort();
  };
  P.bindSwipe = function (el) {
    let x0 = null, y0 = 0;
    el.addEventListener('pointerdown', (e) => { if (ui.screen === 'round') { x0 = e.clientX; y0 = e.clientY; } });
    el.addEventListener('pointerup', (e) => {
      if (x0 === null || ui.screen !== 'round') return;
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
        if (ctx.count > 0) { ctx.cdPaused = true; clearTimeout(ctx.timer); } else if (!R.paused) R.pause(performance.now());
        U.sound.silence();
        U.render();
      }
    } else if (R && ui.screen === 'round') acquireWake();
  });

  /* ---------- Сверка ---------- */
  U.screens.review = function () {
    const rv = ui.review;
    if (!rv) return '';
    const it = rv.items, ok = it.filter((x) => x.m === 1).length, bad = it.filter((x) => x.m === 0).length, none = it.length - ok - bad;
    const rows = it.map((x, i) => {
      const e = U.gen.parse(x.k), t = x.late ? 'не успел' : x.m === null ? (rv.pkg.mode === 'dictation' ? '' : 'без отметки') : x.t !== null ? F.sec(x.t) : '';
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
  U.actions.rSave = function () {
    const rv = ui.review, p = U.player(), d = U.store.data;
    const round = { id: U.store.uid(), player: p.id, pkg: rv.saved ? rv.pkg.id : null, name: rv.pkg.name, mode: rv.pkg.mode,
      cfg: U.pkgSnapshot(rv.pkg), startedAt: rv.startedAt || Date.now(), durationMs: rv.durationMs, paused: !!rv.paused, items: rv.items };
    const res = S.commit(d, p, round, Date.now());
    U.store.save();
    ui.result = res;
    ui.review = null;
    if ((res.record && res.prev) || res.levelAfter > res.levelBefore || res.cups.length) U.sound.fanfare(); else U.sound.ok();
    U.go('result', {}, { replace: true });
  };

  /* ---------- Итог ---------- */
  U.screens.result = function () {
    const res = ui.result, p = U.player();
    if (!res || !p) return U.screens.home();
    const r = res.round, s = r.s, T = U.THEMES[p.theme], L = U.levelInfo(p.xp);
    const before = U.levelInfo(p.xp - res.total);
    const levelUp = res.levelAfter > res.levelBefore, stageUp = U.stageOf(res.levelAfter) > U.stageOf(res.levelBefore);
    let ribbon = '';
    if (res.record && res.prev) ribbon = 'Новый рекорд!';
    else if (res.first && !r.paused) ribbon = 'Первый результат!';
    else if (levelUp) ribbon = 'Новый уровень!';
    const celebrate = !!ribbon || res.cups.length;
    let score;
    if (r.mode === 'streak') score = `${s.streak}<small> подряд</small>`;
    else if (r.mode === 'minute') score = `${s.correct}<small> ${U.plural(s.correct, 'верный', 'верных', 'верных')}</small>`;
    else score = `${s.correct}<small> из ${s.total}</small>`;
    const subs = [];
    if (r.mode === 'fast' || r.mode === 'limit' || r.mode === 'training') subs.push('Время: ' + F.time(s.timeMs));
    if (res.prev) subs.push((res.record ? 'Прошлый рекорд — ' : 'Рекорд — ') + S.resultText(res.prev));
    if (r.paused) subs.push('Была пауза — в рекорды не идёт');
    if (!r.pkg) subs.push('Разовый раунд — в рекорды не идёт');
    const lines = res.lines.map((l) => `<li><span>${esc(l[0])}</span><b>+${l[1]}</b></li>`).join('');
    const basePct = levelUp ? 0 : before.pct;
    const errs = r.items.filter((x) => x.m !== 1).map((x) => U.gen.text(x.k) + ' = ' + U.gen.parse(x.k).ans);
    const uniq = errs.filter((x, i) => errs.indexOf(x) === i).slice(0, 4);
    return `<div class="screen">
      ${celebrate ? A.confetti() : ''}
      <div class="result">
        ${ribbon ? `<div class="ribbon">${ribbon}</div>` : ''}
        <div class="pkg-name">${esc(r.name)}</div>
        <div class="score">${score}</div>
        ${subs.length ? `<div class="sub">${subs.join(' · ')}</div>` : ''}
        <div class="panel earn"><div class="total">+${res.total} ${A.star()}</div>${lines ? `<ul>${lines}</ul>` : ''}</div>
        <div class="panel hero-mini">${A.hero(p.theme, L.st)}
          <div class="grow"><b style="font-size:17px">Уровень ${L.lv} · ${T.titles[L.st - 1]}</b>
            <div class="soft">${stageUp ? 'Герой вырос: ' + T.hero[L.st - 1] + '!' : levelUp ? 'Новый уровень!' : `<span class="gain">+${res.total}</span>` + (L.next ? ' · до ' + (L.lv + 1) + '-го: ' + L.left + ' ' + starSm() : '')}</div>
            <div class="xp"><i style="width:${Math.max(0, basePct)}%"></i><b style="width:${Math.max(0, L.pct - basePct)}%"></b></div></div>
        </div>
        ${uniq.length ? `<div class="again">Повторить${uniq.map((x) => `<span class="chip-ex">${x}</span>`).join('')}</div>` : ''}
      </div>
      <div class="btn-row"><button class="btn btn-light" data-act="home">${ic('home')}Домой</button><button class="btn btn-primary" data-act="again">${ic('replay')}Ещё раз</button></div>
    </div>`;
  };
  U.actions.again = () => {
    const r = ui.result && ui.result.round;
    if (!r) return;
    const pk = r.pkg ? U.pkgById(r.pkg) : Object.assign({ id: 'once' }, r.cfg);
    if (pk) U.play.start(pk, { saved: !!r.pkg });
  };

  /* ---------- Для проверки: раунд с готовыми отметками без ожидания ---------- */
  P.simulate = function (pkgId, upto, stage) {
    const pkg = U.pkgById(pkgId);
    P.start(pkg, { saved: true, instant: true });
    if (!R) return;
    let t = performance.now();
    for (let i = 0; i < upto && R && !R.finished; i++) {
      const v = i % 6 === 3 ? 0 : 1;
      t += 1700 + (i % 3) * 400;
      if (R.mode !== 'dictation') R.mark(v, t);
      if (R && U.FIXED_MODES[R.mode]) { t = R.cur().shown + R.interval(R.items.length - 1) + 1; R.tick(t); }
      if (R && R.mode === 'streak' && R.pendingEnd !== null) { t += 3100; R.tick(t); }
    }
    let guard = 0;
    while (stage && R && !R.finished && guard++ < 400) {
      t += 6000;
      if (R.mode === 'streak') { R.mark(0, t); if (R) R.tick(t + 3100); }
      else if (R.mode !== 'dictation' && !U.FIXED_MODES[R.mode]) R.mark(1, t);
      else R.tick(t);
    }
    if (R) { R.lastT = performance.now(); U.render(); }
    if (stage === 'result') U.actions.rSave();
  };
})(window.U = window.U || {});
