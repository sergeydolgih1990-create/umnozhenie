/* Ход раунда без привязки к экрану: часы с паузой, отметки, переходы между примерами.
   Время — в миллисекундах «активного» раунда, без пауз. Экран вызывает tick() каждый кадр. */
(function (U) {
  'use strict';

  const UNDO_MS = 3000; // окно «нажали по ошибке» в режиме «До первой ошибки»

  function Round(pkg, opts) {
    this.pkg = pkg;
    this.mode = pkg.mode;
    this.list = opts.keys || null;   // заранее известный список примеров
    this.next = opts.next || null;   // поток примеров для «Минуты» и серии
    this.total = this.list ? this.list.length : null;
    this.items = [];
    this.elapsed = 0;
    this.lastT = null;
    this.running = false;
    this.paused = false;
    this.wasPaused = false;
    this.finished = false;
    this.pendingEnd = null;
    this.onShow = opts.onShow || null;
    this.onFinish = opts.onFinish || null;
  }
  const P = Round.prototype;

  P.fixed = function () { return !!U.FIXED_MODES[this.mode]; };
  P.cur = function () { return this.items[this.items.length - 1] || null; };

  // Сколько миллисекунд стоит на экране пример номер i
  P.interval = function (i) {
    const p = this.pkg;
    if (this.mode === 'accel') {
      const n = this.total || 1, k = n > 1 ? i / (n - 1) : 0;
      return Math.round((p.from + (p.to - p.from) * k) * 1000);
    }
    return Math.round((p.interval || 5) * 1000);
  };
  P.limitMs = function () { return this.mode === 'limit' || this.mode === 'streak' ? Math.round(this.pkg.interval * 1000) : null; };

  P.show = function (at) {
    const i = this.items.length;
    if (this.list && i >= this.list.length) {
      if (this.fixed() && at !== undefined) this.elapsed = at;
      this.finish();
      return;
    }
    const k = this.list ? this.list[i] : this.next();
    this.items.push({ k, m: null, t: null, at: null, shown: at === undefined ? this.elapsed : at });
    if (this.onShow) this.onShow(this.cur(), i);
  };

  P.start = function (t) { this.running = true; this.lastT = t; this.show(0); };

  P.clock = function (t) {
    if (this.running && !this.paused && this.lastT !== null) this.elapsed += Math.max(0, t - this.lastT);
    this.lastT = t;
  };

  P.tick = function (t) {
    if (!this.running || this.finished) return;
    this.clock(t);
    if (this.paused) return;
    const c = this.cur();
    if (this.pendingEnd !== null) { if (this.elapsed >= this.pendingEnd) this.finish(); return; }
    if (this.mode === 'minute' && this.elapsed >= this.pkg.duration * 1000) {
      if (c && c.m === null) this.items.pop();
      this.elapsed = this.pkg.duration * 1000;
      this.finish();
      return;
    }
    if (this.fixed()) {
      // при долгом кадре может пройти больше одного интервала — догоняем по одному примеру
      let guard = 0;
      while (!this.finished && guard++ < 100) {
        const cc = this.cur(), end = cc.shown + this.interval(this.items.length - 1);
        if (this.elapsed < end) break;
        this.show(end);
      }
      return;
    }
    const lim = this.limitMs();
    if (lim && c && c.m === null && this.elapsed - c.shown >= lim) {
      c.m = 0; c.late = 1; c.t = lim; c.at = c.shown + lim;
      if (this.mode === 'streak') this.finish();
      else this.show(c.at);
    }
  };

  // v: 1 — верно, 0 — неверно
  P.mark = function (v, t) {
    if (!this.running || this.finished || this.paused) return false;
    this.tick(t);
    if (this.finished || this.mode === 'dictation' || this.pendingEnd !== null) return false;
    const c = this.cur();
    if (this.fixed()) {
      if (c.t === null) c.t = this.elapsed - c.shown;
      c.m = v;
      c.at = this.elapsed;
      return true;
    }
    c.m = v; c.t = this.elapsed - c.shown; c.at = this.elapsed;
    if (this.mode === 'streak' && v === 0) { this.pendingEnd = this.elapsed + UNDO_MS; return true; }
    this.show();
    return true;
  };

  // «Нажали по ошибке» в серии: ответ верный, серия продолжается
  P.undoStreak = function (t) {
    if (this.pendingEnd === null) return;
    this.clock(t);
    this.pendingEnd = null;
    this.cur().m = 1;
    this.show();
  };

  P.pause = function (t) {
    if (!this.running || this.finished || this.paused) return;
    this.clock(t);
    this.paused = true;
    this.wasPaused = true;
  };
  P.resume = function (t) {
    if (!this.paused) return;
    this.paused = false;
    this.lastT = t;
  };

  P.finish = function () {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    if (!this.fixed() && this.mode !== 'minute') {
      const marked = this.items.filter((it) => it.at !== null);
      if (marked.length) this.elapsed = marked[marked.length - 1].at;
    }
    if (this.onFinish) this.onFinish();
  };

  // Остаток времени текущего отсчёта и его полная длина — для полоски
  P.countdown = function () {
    const c = this.cur();
    if (!c) return null;
    if (this.fixed()) {
      const full = this.interval(this.items.length - 1);
      return { left: Math.max(0, c.shown + full - this.elapsed), full };
    }
    if (this.mode === 'minute') { const full = this.pkg.duration * 1000; return { left: Math.max(0, full - this.elapsed), full }; }
    const lim = this.limitMs();
    if (lim && c.m === null) return { left: Math.max(0, c.shown + lim - this.elapsed), full: lim };
    return null;
  };

  U.Round = Round;
  U.UNDO_MS = UNDO_MS;
})(window.U = window.U || {});
