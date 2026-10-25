/* Уровни через испытания (Сергей, 25.10.2026). У каждого уровня свой темп — секунды на пример.
   Чтобы открыть следующий уровень, нужно пройти все 7 испытаний текущего: без единой ошибки и в лимит времени.
   Звёзды от уровня не зависят — это «деньги» на призы. */
(function (U) {
  'use strict';

  const PACE = [10, 9, 8, 7, 6, 5, 4.5, 4, 3.5, 3];          // секунд на пример на уровнях 1–10
  const SERIES = [10, 12, 15, 18, 20, 25, 30, 35, 40, 50];   // длина серии для «До первой ошибки»
  const MAX = PACE.length;
  const DICT_EXTRA = 2;                                      // голосу нужно время прочитать пример

  // kind: each — на каждый пример не больше темпа; total — общее время на все примеры;
  // minute — не меньше 60 ÷ темп верных за минуту; series — серия нужной длины
  const EXAMS = [
    { id: 'school', name: 'Школьный блиц', mode: 'teacher', mul: 8, div: 8, kind: 'each' },
    { id: 'fast', name: 'Быстрый круг', mode: 'fast', mul: 10, div: 10, kind: 'total' },
    { id: 'mulonly', name: 'Только умножение', mode: 'fast', mul: 20, div: 0, kind: 'total' },
    { id: 'divonly', name: 'Только деление', mode: 'fast', mul: 0, div: 20, kind: 'total' },
    { id: 'minute', name: 'Минута', mode: 'minute', mul: 1, div: 1, kind: 'minute' },
    { id: 'streak', name: 'До первой ошибки', mode: 'streak', mul: 1, div: 1, kind: 'series' },
    { id: 'dictation', name: 'Диктант на слух', mode: 'dictation', mul: 8, div: 8, kind: 'each', voice: true, extra: DICT_EXTRA }
  ];

  const clampLv = (lv) => Math.min(MAX, Math.max(1, lv | 0 || 1));
  const pace = (lv) => PACE[clampLv(lv) - 1];
  const count = (e) => e.mul + e.div;
  const byId = (id) => EXAMS.find((e) => e.id === id) || null;
  const fmt = (ms) => U.score.fmtTime(ms);
  // Время словами для условий: «2 мин 40 с», «3 мин 20 с», «1 мин»
  const fmtLong = (ms) => { const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60; return (m ? m + '\u00a0мин' : '') + (m && r ? ' ' : '') + (r ? r + '\u00a0с' : ''); };
  const errText = (n) => n + ' ' + U.plural(n, 'ошибка', 'ошибки', 'ошибок');

  // Условия испытания на уровне — одни и те же числа для проверки и для текста на экране
  function terms(e, lv) {
    const T = pace(lv), t = { pace: T, each: null, totalMs: null, need: null, series: null };
    if (e.kind === 'each') t.each = T + (e.extra || 0);
    if (e.kind === 'total') t.totalMs = Math.round(count(e) * T * 1000);
    if (e.kind === 'minute') t.need = Math.round(60 / T);
    if (e.kind === 'series') { t.series = SERIES[clampLv(lv) - 1]; t.each = T; }
    return t;
  }
  function describe(e, lv) {
    const t = terms(e, lv), sec = (x) => U.num(x) + ' с';
    if (e.kind === 'each') return count(e) + ' примеров' + (e.voice ? ' на\u00a0слух' : ' вперемешку') + ', на каждый до\u00a0' + sec(t.each) + ', без\u00a0ошибок';
    if (e.kind === 'total') return count(e) + ' примеров ' + (e.mul && e.div ? 'вперемешку' : e.div ? 'на деление' : 'на умножение') + ' за\u00a0' + fmtLong(t.totalMs) + ', без\u00a0ошибок';
    if (e.kind === 'minute') return 'за минуту не меньше ' + t.need + ' верных ответов, без\u00a0ошибок';
    return 'серия из ' + t.series + ' верных подряд, на каждый до ' + sec(t.each);
  }
  // Пакет для движка раунда в темпе уровня
  function pkgFor(e, lv) {
    const t = terms(e, lv);
    const p = { id: 'exam-' + e.id, name: e.name, mode: e.mode, mul: e.mul, div: e.div,
      tables: U.gen.DEFAULT_TABLES.slice(), voice: !!e.voice, hideTime: false };
    if (t.each) p.interval = t.each;
    if (e.kind === 'minute') p.duration = 60;
    return p;
  }
  // Пройдено ли испытание и что помешало
  function check(e, lv, r) {
    const t = terms(e, lv), s = r.s, why = [];
    if (r.paused) why.push('была пауза');
    if (e.kind === 'series') {
      if (s.streak < t.series) why.push('серия ' + s.streak + ' — нужно ' + t.series);
    } else if (e.kind === 'minute') {
      if (s.correct < t.need) why.push('верных ' + s.correct + ' — нужно ' + t.need);
      if (s.wrong + s.none) why.push(errText(s.wrong + s.none));
    } else {
      const miss = s.total - s.correct;
      if (miss) why.push(errText(miss));
      if (e.kind === 'total' && s.timeMs > t.totalMs) why.push('время ' + fmt(s.timeMs) + ' — нужно до ' + fmt(t.totalMs));
    }
    return { passed: !why.length, why };
  }

  const level = (p) => clampLv(p && p.lvl);
  function progress(p, lv) {
    const done = (p && p.exams && p.exams[lv]) || {};
    return { done, passed: EXAMS.filter((e) => done[e.id]).length, of: EXAMS.length };
  }

  // Сыгранное испытание: зачёт на текущем уровне и, если пройдены все 7, — следующий уровень
  function apply(player, round) {
    const e = byId(round.exam.id), lv = round.exam.level, res = check(e, lv, round);
    round.exam.passed = res.passed;
    const out = { exam: e, level: lv, passed: res.passed, why: res.why, newPass: false, levelUp: false, master: false };
    if (!res.passed || lv !== level(player)) return out;
    player.exams = player.exams || {};
    const done = player.exams[lv] = player.exams[lv] || {};
    if (done[e.id]) return out;
    done[e.id] = { at: round.startedAt, round: round.id };
    out.newPass = true;
    if (progress(player, lv).passed === EXAMS.length) {
      if (lv < MAX) { player.lvl = lv + 1; out.levelUp = true; }
      else if (!player.master) { player.master = true; out.master = true; }
    }
    return out;
  }

  U.levels = { PACE, SERIES, MAX, EXAMS, byId, pace, terms, describe, pkgFor, check, level, progress, apply, fmtLong };
})(window.U = window.U || {});
