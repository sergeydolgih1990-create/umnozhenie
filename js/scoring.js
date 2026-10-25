/* Итоги раунда, рекорды, звёзды, карта таблицы, трудные примеры, задание недели */
(function (U) {
  'use strict';

  const FAST_MS = 5000;   // быстрый ответ для золотой клетки (Сергей 25.10.2026: темп мягче на 2 с)
  const SLOW_MS = 6000;   // медленный ответ попадает в «Работу над ошибками»
  const DAY = 86400000;
  // Звёзды: за что и сколько. Отсюда же берёт числа экран «Как устроены награды».
  const BONUS = { correct: 1, trainingMult: 2, clean: 5, cleanMin: 5, record: 10, gold: 3, cup: 15, all: 50, quest: 20, exam: 15, level: 50 };

  const hasT = (it) => it.t !== null && it.t !== undefined && !it.late;

  function summarize(r) {
    const s = { total: r.items.length, correct: 0, wrong: 0, none: 0, mulMiss: 0, divMiss: 0, streak: 0,
      timeMs: r.durationMs || 0, avgMs: null, avgMul: null, avgDiv: null, score: 0 };
    let lead = true;
    const sum = { a: [0, 0], m: [0, 0], d: [0, 0] };
    r.items.forEach((it) => {
      const op = it.k[0];
      if (it.m === 1) s.correct++;
      else {
        if (it.m === 0) s.wrong++; else s.none++;
        if (op === 'm') s.mulMiss++; else s.divMiss++;
      }
      if (lead && it.m === 1) s.streak++; else lead = false;
      if (hasT(it)) { sum.a[0] += it.t; sum.a[1]++; sum[op][0] += it.t; sum[op][1]++; }
    });
    const avg = (x) => (x[1] ? Math.round(x[0] / x[1]) : null);
    s.avgMs = avg(sum.a); s.avgMul = avg(sum.m); s.avgDiv = avg(sum.d);
    s.score = r.mode === 'streak' ? s.streak : s.correct;
    return s;
  }

  // < 0 — раунд a лучше раунда b. При равенстве выше более ранний результат.
  function better(mode, a, b) {
    const A = a.s, B = b.s, early = a.startedAt - b.startedAt;
    if (mode === 'streak') return (B.streak - A.streak) || early;
    if (mode === 'minute') return (B.correct - A.correct) || (A.wrong - B.wrong) || early;
    // с клавиатуры следующий пример идёт сразу после ответа, поэтому и в ритме учителя время значимо
    if (mode === 'fast' || mode === 'limit' || a.input === 'keys') return (B.correct - A.correct) || (A.timeMs - B.timeMs) || early;
    return (B.correct - A.correct) || early;
  }

  const eligible = (r) => !!r.pkg && !r.paused && r.mode !== 'training';

  // Рекорды сравнивают только раунды в одинаковых условиях: способ ответа (вслух / сам) и темп пакета
  function recordSig(input, cfg) {
    const c = cfg || {};
    return [input || 'voice', c.mul, c.div, c.interval, c.from, c.to, c.duration, (c.tables || []).join('.')].join('|');
  }
  // like — {input, cfg}: с какими условиями сравнивать; без него — все раунды пакета
  function records(data, pkgId, playerId, like) {
    const want = like ? recordSig(like.input, like.cfg) : null;
    const list = data.rounds.filter((r) => r.pkg === pkgId && eligible(r) && (!playerId || r.player === playerId) &&
      (!want || recordSig(r.input, r.cfg) === want));
    if (!list.length) return [];
    const mode = list[list.length - 1].mode;
    return list.sort((a, b) => better(mode, a, b));
  }

  // Короткая запись результата для списков
  function resultText(r) {
    const s = r.s;
    if (r.mode === 'streak') return 'серия ' + s.streak;
    if (r.mode === 'minute') return s.correct + ' ' + U.plural(s.correct, 'верный', 'верных', 'верных');
    if (r.mode === 'fast' || r.mode === 'limit' || r.mode === 'training') return s.correct + ' из ' + s.total + ' · ' + fmtTime(s.timeMs);
    return s.correct + ' из ' + s.total;
  }
  function fmtTime(ms) {
    const sec = Math.round((ms || 0) / 1000);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  /* ---------- Карта таблицы ---------- */
  function applyMastery(data, playerId, items) {
    const M = data.mastery[playerId] || (data.mastery[playerId] = {});
    const newGold = [];
    items.forEach((it) => {
      if (it.m !== 0 && it.m !== 1) return;
      const c = M[it.k] || (M[it.k] = { l: 0, ok: 0, f: 0 });
      if (it.m === 1) {
        const before = c.l;
        c.ok++;
        c.f = hasT(it) && it.t <= FAST_MS ? c.f + 1 : 0;
        if (c.f >= 3) c.l = 3;
        else if (c.ok >= 3) c.l = Math.max(c.l, 2);
        else c.l = Math.max(c.l, 1);
        if (c.l === 3 && before < 3) newGold.push(it.k);
      } else {
        c.l = Math.max(0, c.l - 1);
        c.ok = c.l >= 2 ? 3 : c.l;   // чтобы вернуть ступень, нужно снова набрать ответы
        c.f = 0;
      }
    });
    return newGold;
  }

  const ROW = { 1: 'единицы', 2: 'двойки', 3: 'тройки', 4: 'четвёрки', 5: 'пятёрки', 6: 'шестёрки', 7: 'семёрки', 8: 'восьмёрки', 9: 'девятки', 10: 'десятки' };
  const RANGE = [2, 3, 4, 5, 6, 7, 8, 9];
  function rowKeys(op, r) { return RANGE.map((x) => (op === 'm' ? U.gen.keyM(r, x) : U.gen.keyD(r * x, r))); }
  function cupDefs() {
    const list = [];
    RANGE.forEach((r) => list.push({ id: 'm' + r, op: 'm', row: r, name: 'Повелитель ' + ROW[r], short: '×' + r, bonus: BONUS.cup }));
    RANGE.forEach((r) => list.push({ id: 'd' + r, op: 'd', row: r, name: 'Деление на ' + r, short: 'на ' + r, bonus: BONUS.cup }));
    list.push({ id: 'all', name: 'Вся таблица', short: 'всё', bonus: BONUS.all });
    return list;
  }
  function cupProgress(data, playerId, cup) {
    const M = data.mastery[playerId] || {}, gold = (k) => M[k] && M[k].l === 3;
    if (cup.id === 'all') {
      const rows = cupDefs().filter((c) => c.id !== 'all');
      return { got: rows.filter((c) => cupProgress(data, playerId, c).done).length, of: rows.length };
    }
    const keys = rowKeys(cup.op, cup.row), got = keys.filter(gold).length;
    return { got, of: keys.length, done: got === keys.length };
  }
  function checkCups(data, playerId) {
    const have = data.cups[playerId] || (data.cups[playerId] = []);
    const won = [];
    cupDefs().forEach((c) => {
      if (have.indexOf(c.id) >= 0) return;
      const p = cupProgress(data, playerId, c);
      if (p.got === p.of) { have.push(c.id); won.push(c); }
    });
    return won;
  }

  /* ---------- Работа над ошибками ---------- */
  function weakList(data, playerId, max) {
    const rounds = data.rounds.filter((r) => r.player === playerId).sort((a, b) => a.startedAt - b.startedAt).slice(-10);
    const st = {};
    rounds.forEach((r) => {
      const seen = {};
      r.items.forEach((it) => {
        if (it.m !== 0 && it.m !== 1) return;
        const s = st[it.k] || (st[it.k] = { flag: false, good: 0, when: 0 });
        const bad = it.m === 0 || (hasT(it) && it.t > SLOW_MS);
        if (bad) { s.flag = true; s.good = 0; s.when = r.startedAt; }
        else if (s.flag && !seen[it.k]) { s.good++; if (s.good >= 3) { s.flag = false; s.good = 0; } }
        seen[it.k] = true;
      });
    });
    return Object.keys(st).filter((k) => st[k].flag).sort((a, b) => st[b].when - st[a].when).slice(0, max || 16);
  }

  /* ---------- Задание недели ---------- */
  function weekStart(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function shiftWeek(ws, n) { const d = new Date(ws); d.setDate(d.getDate() + 7 * n); return d.getTime(); }
  function quest(data, player, now) {
    const ws = weekStart(now), we = shiftWeek(ws, 1);
    const rs = data.rounds.filter((r) => r.player === player.id && r.startedAt >= ws && r.startedAt < we);
    const clean = rs.some((r) => (r.pkg === 'school' || (r.exam && r.exam.id === 'school')) && r.s.correct === r.s.total);
    const done = player.quests || [];
    let w = done.indexOf(String(ws)) >= 0 ? ws : shiftWeek(ws, -1), weeks = 0;
    while (done.indexOf(String(w)) >= 0) { weeks++; w = shiftWeek(w, -1); }
    return { trainings: rs.length, need: 3, clean, done: rs.length >= 3 && clean, awarded: done.indexOf(String(ws)) >= 0, key: String(ws), weeks };
  }

  /* ---------- Сохранение раунда со всеми наградами ---------- */
  function commit(data, player, round, now) {
    round.s = summarize(round);
    const prev = eligible(round) ? records(data, round.pkg, player.id, round)[0] || null : null;
    data.rounds.push(round);
    const record = eligible(round) && (!prev || better(round.mode, round, prev) < 0);
    const newGold = applyMastery(data, player.id, round.items);
    const cups = checkCups(data, player.id);
    const levelBefore = U.levels ? U.levels.level(player) : 1;
    const exam = round.exam && U.levels ? U.levels.apply(player, round) : null;
    const q = quest(data, player, now);
    let questWon = false;
    if (q.done && !q.awarded) { (player.quests = player.quests || []).push(q.key); questWon = true; }

    const mult = round.mode === 'training' ? BONUS.trainingMult : 1, lines = [];
    const s = round.s;
    if (s.correct) lines.push([s.correct + ' ' + U.plural(s.correct, 'верный ответ', 'верных ответа', 'верных ответов') + (mult > 1 ? ' ×' + mult : ''), s.correct * BONUS.correct * mult]);
    if (round.mode !== 'streak' && s.total >= BONUS.cleanMin && s.correct === s.total) lines.push(['Без ошибок', BONUS.clean]);
    if (record && prev) lines.push(['Новый рекорд', BONUS.record]);
    if (newGold.length) lines.push([(newGold.length === 1 ? 'Золотая клетка ' : 'Золотые клетки ') + newGold.map((k) => U.gen.text(k).replace(/ /g, ' ')).join(', '), BONUS.gold * newGold.length]);
    cups.forEach((c) => lines.push(['Кубок «' + c.name + '»', c.bonus]));
    if (questWon) lines.push(['Задание недели', BONUS.quest]);
    if (exam && exam.newPass) lines.push(['Испытание «' + exam.exam.name + '» пройдено', BONUS.exam]);
    if (exam && exam.levelUp) lines.push(['Открыт уровень ' + (exam.level + 1), BONUS.level]);
    if (exam && exam.master) lines.push(['Все уровни пройдены', BONUS.level]);
    const total = lines.reduce((a, l) => a + l[1], 0);

    player.xp = (player.xp || 0) + total;
    player.stars = (player.stars || 0) + total;
    round.stars = total;
    round.record = record;
    return { round, prev, record, first: eligible(round) && !prev, lines, total, newGold, cups, questWon,
      exam, levelBefore, levelAfter: U.levels ? U.levels.level(player) : 1 };
  }

  U.score = { FAST_MS, SLOW_MS, DAY, BONUS, summarize, better, eligible, recordSig, records, resultText, fmtTime, applyMastery,
    cupDefs, cupProgress, checkCups, rowKeys, weakList, weekStart, shiftWeek, quest, commit };
})(window.U = window.U || {});
