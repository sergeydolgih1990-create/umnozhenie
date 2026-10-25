/* Проверки логики: генератор, движок раунда, итоги, карта, трудные примеры, задание недели.
   Запуск: tools/run_tests.py (Edge без окна) или открыть tests.html в браузере. */
(function (U) {
  'use strict';
  const out = [];
  let ok = 0, fail = 0;
  function check(name, cond, info) {
    if (cond) ok++; else { fail++; out.push('FAIL ' + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); }
  }
  function seeded(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const G = U.gen, S = U.score;
  const pkg = (id) => U.STD_PACKAGES.find((p) => p.id === id);

  /* --- генератор --- */
  let P = G.pools([2, 3, 4, 5, 6, 7, 8, 9]);
  check('пул по умолчанию: 64 умножения', P.mul.length === 64, P.mul.length);
  check('пул по умолчанию: 64 деления', P.div.length === 64, P.div.length);
  check('деление без остатка', P.div.every((k) => Number.isInteger(G.parse(k).ans)));
  check('ответы деления от 2 до 9', P.div.every((k) => G.parse(k).ans >= 2 && G.parse(k).ans <= 9));
  P = G.pools([7]);
  check('таблица на 7: 15 умножений', P.mul.length === 15, P.mul.length);
  check('таблица на 7: в каждом примере есть 7', P.mul.every((k) => G.parse(k).f.indexOf(7) >= 0));
  P = G.pools([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  check('с ×10: есть 10 × 10', P.mul.indexOf('m10x10') >= 0);
  check('без ×1 нет примеров с единицей', G.pools([2, 3]).mul.every((k) => G.parse(k).f.indexOf(1) < 0));
  check('текст примера', G.text('m7x8') === '7 × 8' && G.text('d56:8') === '56 : 8');
  check('ответ деления', G.parse('d56:8').ans === 7);

  let strictOk = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = seeded(seed), keys = G.round(pkg('school'), rnd);
    const m = keys.filter((k) => k[0] === 'm').length, d = keys.length - m;
    if (keys.length !== 16 || m !== 8 || d !== 8) { check('школьный блиц: 16 = 8 + 8', false, { seed, n: keys.length, m, d }); break; }
    if (new Set(keys).size !== 16) { check('школьный блиц без повторов', false, seed); break; }
    let strict = true, relaxed = true;
    for (let i = 1; i < keys.length; i++) {
      const x = G.parse(keys[i - 1]), y = G.parse(keys[i]);
      if (x.ans === y.ans || (x.f.indexOf(y.f[0]) >= 0 || x.f.indexOf(y.f[1]) >= 0)) strict = false;
      const same = (x.f[0] === y.f[0] && x.f[1] === y.f[1]) || (x.f[0] === y.f[1] && x.f[1] === y.f[0]);
      if (x.ans === y.ans || same) relaxed = false;
      if (i >= 3 && [keys[i - 3], keys[i - 2], keys[i - 1], keys[i]].every((k) => k[0] === keys[i][0])) strict = false;
    }
    check('соседи не 3 × 7 и 7 × 3 и не с одним ответом (seed ' + seed + ')', relaxed);
    if (strict) strictOk++;
  }
  check('строгий порядок почти всегда (' + strictOk + ' из 200)', strictOk >= 190, strictOk);

  const one = G.round(Object.assign({}, pkg('fast'), { tables: [7] }), seeded(5));
  check('одна таблица: 20 примеров собираются', one.length === 20, one.length);
  check('одна таблица: соседи не одинаковые', one.every((k, i) => i === 0 || k !== one[i - 1]));

  const next = G.stream(pkg('minute'), seeded(9)), st = [];
  for (let i = 0; i < 150; i++) st.push(next());
  check('поток: нет повтора подряд', st.every((k, i) => i === 0 || k !== st[i - 1]));
  check('поток: первые 60 без повторов', new Set(st.slice(0, 60)).size === 60);
  check('поток: есть и умножение, и деление', st.some((k) => k[0] === 'm') && st.some((k) => k[0] === 'd'));
  const onlyDiv = G.stream(pkg('divonly'), seeded(3));
  check('поток «только деление»', [0, 1, 2, 3, 4, 5].every(() => onlyDiv()[0] === 'd'));

  /* --- движок --- */
  check('темп мягче на 2 с: школьный блиц 7 с, мастер 5 с', pkg('school').interval === 7 && pkg('master').interval === 5 && pkg('limit').interval === 6);
  const school5 = Object.assign({}, pkg('school'), { interval: 5 });
  const keys16 = G.round(school5, seeded(11));
  let R = new U.Round(school5, { keys: keys16 });
  R.start(1000);
  R.mark(1, 2200);
  check('учитель: отметка не листает', R.items.length === 1 && R.items[0].m === 1 && R.items[0].t === 1200, R.items[0]);
  R.mark(0, 3000);
  check('учитель: отметку можно поменять, время — первой', R.items[0].m === 0 && R.items[0].t === 1200);
  R.tick(6000);
  check('учитель: через 5 с следующий', R.items.length === 2 && R.items[1].shown === 5000, R.items.length);
  R.tick(11000);
  check('учитель: неотмеченный остаётся без отметки', R.items[1].m === null && R.items.length === 3);
  R.pause(12000); R.tick(40000); R.resume(40000); R.tick(40500);
  check('пауза останавливает время', R.items.length === 3 && R.elapsed === 11500, R.elapsed);
  check('пауза запоминается', R.wasPaused === true);
  R.tick(200000);
  check('учитель: раунд заканчивается после 16 × 5 с', R.finished && R.items.length === 16 && R.elapsed === 80000, { n: R.items.length, e: R.elapsed });

  R = new U.Round(pkg('accel'), { keys: G.round(pkg('accel'), seeded(2)) });
  check('ускорение: первый пример 8 с', R.interval(0) === 8000);
  check('ускорение: последний 5 с', R.interval(19) === 5000);

  R = new U.Round(pkg('fast'), { keys: G.round(pkg('fast'), seeded(4)) });
  R.start(0);
  for (let i = 0; i < 20; i++) R.mark(i === 3 ? 0 : 1, (i + 1) * 1500);
  check('быстрый: 20 отметок — конец', R.finished && R.items.length === 20);
  check('быстрый: время — по последней отметке', R.elapsed === 30000, R.elapsed);

  const limit4 = Object.assign({}, pkg('limit'), { interval: 4 });
  R = new U.Round(limit4, { keys: G.round(limit4, seeded(6)) });
  R.start(0); R.tick(4100);
  check('лимит: просрочка = неверно', R.items[0].m === 0 && R.items[0].late === 1 && R.items.length === 2);
  check('лимит: следующий с момента лимита', R.items[1].shown === 4000);

  R = new U.Round(pkg('streak'), { next: G.stream(pkg('streak'), seeded(8)) });
  R.start(0); R.mark(1, 1000); R.mark(0, 2000);
  check('серия: ошибка ждёт отмены', !R.finished && R.pendingEnd === 5000);
  R.undoStreak(2500);
  check('серия: отмена — верно и дальше', R.items[1].m === 1 && R.items.length === 3 && !R.finished);
  R.mark(0, 3000); R.tick(6100);
  check('серия: после ошибки — конец', R.finished);
  const ss = S.summarize({ items: R.items, mode: 'streak', durationMs: R.elapsed });
  check('серия: длина 2', ss.streak === 2 && ss.score === 2, ss);

  R = new U.Round(pkg('minute'), { next: G.stream(pkg('minute'), seeded(12)) });
  R.start(0);
  for (let t = 1000; t < 60000; t += 2000) R.mark(1, t);
  R.tick(61000);
  check('минута: конец через 60 с', R.finished && R.elapsed === 60000);
  check('минута: неотмеченный последний не считается', R.items.every((it) => it.m === 1), R.items.length);

  /* --- ответ ребёнка с клавиатуры --- */
  R = new U.Round(school5, { keys: keys16, selfCheck: true });
  R.start(0);
  const ans0 = G.parse(keys16[0]).ans;
  check('сам: верный ответ засчитан', R.answer(ans0, 1800) === 1 && R.items[0].a === ans0 && R.items[0].t === 1800);
  check('сам: после ответа сразу следующий', R.items.length === 2 && R.items[1].shown === 1800);
  check('сам: неверный ответ — ошибка', R.answer(G.parse(keys16[1]).ans + 1, 2500) === 0 && R.items[1].m === 0);
  R.tick(2500 + 5100);
  check('сам: не успел за 5 с — ошибка «не успел», дальше', R.items[2].m === 0 && R.items[2].late === 1 && R.items.length === 4);
  check('сам: в паузе ответы не принимаются', (R.pause(8000), R.answer(1, 8100) === null));
  R.resume(9000);
  R.draft = G.parse(R.cur().k).ans;
  R.tick(9000 + 5100);
  check('сам: набранный, но не подтверждённый ответ засчитан по времени', R.items[3].m === 1 && !R.items[3].late && R.items.length === 5, R.items[3]);
  const dict = Object.assign({}, pkg('dictation'), { interval: 5 });
  R = new U.Round(dict, { keys: G.round(dict, seeded(14)), selfCheck: true });
  R.start(0);
  check('сам: в диктанте ответы принимаются', R.answer(G.parse(R.items[0].k).ans, 2000) === 1 && R.items.length === 2);
  R = new U.Round(pkg('streak'), { next: G.stream(pkg('streak'), seeded(15)), selfCheck: true });
  R.start(0); R.answer(G.parse(R.items[0].k).ans, 900); R.answer(-1, 1700);
  check('сам: в серии ошибка сразу заканчивает раунд', R.finished && R.items.length === 2);

  /* --- рекорды раздельно: вслух / сам и темп пакета --- */
  const sig = S.recordSig;
  check('рекорды: вслух и сам — разные списки', sig('voice', pkg('school')) !== sig('keys', pkg('school')));
  check('рекорды: старый темп 5 с отдельно от 7 с', sig('voice', school5) !== sig('voice', pkg('school')));
  check('рекорды: без отметки способа — «вслух»', sig(undefined, pkg('school')) === sig('voice', pkg('school')));

  R = new U.Round(pkg('dictation'), { keys: G.round(pkg('dictation'), seeded(13)) });
  R.start(0);
  check('диктант: отметки во время раунда не принимаются', R.mark(1, 1000) === false && R.items[0].m === null);

  /* --- итоги и рекорды --- */
  const mk = (id, mode, marks, extra) => Object.assign({ id, pkg: 'x', mode, player: 'p', startedAt: id, durationMs: 1000,
    items: marks.map((m, i) => ({ k: 'm' + (2 + (i % 8)) + 'x3', m, t: 2000 })) }, extra || {});
  const a = mk(1, 'teacher', [1, 1, 1, 0]), b = mk(2, 'teacher', [1, 1, 1, 1]), c = mk(3, 'teacher', [1, 1, 1, 0]);
  [a, b, c].forEach((r) => { r.s = S.summarize(r); });
  const data = { rounds: [a, b, c], mastery: {}, cups: {} };
  const rec = S.records(data, 'x', 'p');
  check('рекорды: больше верных выше', rec[0] === b);
  check('рекорды: при равенстве выше ранний', rec[1] === a && rec[2] === c);
  const f1 = mk(4, 'fast', [1, 1], { durationMs: 9000 }), f2 = mk(5, 'fast', [1, 1], { durationMs: 7000 });
  f1.s = S.summarize(f1); f2.s = S.summarize(f2);
  check('быстрый: при равных верных выше быстрее', S.better('fast', f2, f1) < 0);
  const paused = mk(6, 'teacher', [1, 1, 1, 1, 1], { paused: true }); paused.s = S.summarize(paused);
  data.rounds.push(paused);
  check('раунд с паузой не в рекордах', S.records(data, 'x', 'p').indexOf(paused) < 0);
  check('итог: без отметки не считается верным', S.summarize(mk(7, 'teacher', [1, null, 0])).correct === 1);

  /* --- карта таблицы --- */
  const dm = { mastery: {}, cups: {}, rounds: [] };
  const fast = (k) => ({ k, m: 1, t: 1500 }), slow = (k) => ({ k, m: 1, t: 5500 }), bad = (k) => ({ k, m: 0, t: 2000 });
  check('золото — до 5 с, медленно — дольше 6 с', S.FAST_MS === 5000 && S.SLOW_MS === 6000);
  S.applyMastery(dm, 'p', [slow('m7x8')]);
  check('карта: первый верный — бронза', dm.mastery.p.m7x8.l === 1);
  S.applyMastery(dm, 'p', [slow('m7x8'), slow('m7x8')]);
  check('карта: три верных — серебро', dm.mastery.p.m7x8.l === 2);
  let g = S.applyMastery(dm, 'p', [fast('m7x8'), fast('m7x8')]);
  check('карта: два быстрых — ещё не золото', dm.mastery.p.m7x8.l === 2 && g.length === 0);
  g = S.applyMastery(dm, 'p', [fast('m7x8')]);
  check('карта: три быстрых подряд — золото', dm.mastery.p.m7x8.l === 3 && g[0] === 'm7x8');
  S.applyMastery(dm, 'p', [bad('m7x8')]);
  check('карта: ошибка — на ступень ниже', dm.mastery.p.m7x8.l === 2);
  g = S.applyMastery(dm, 'p', [fast('m7x8'), fast('m7x8'), fast('m7x8')]);
  check('карта: золото возвращается и снова считается', dm.mastery.p.m7x8.l === 3 && g.length === 1);
  check('карта: диктант без времени — не золото', (S.applyMastery(dm, 'p', [{ k: 'm3x3', m: 1, t: null }, { k: 'm3x3', m: 1, t: null }, { k: 'm3x3', m: 1, t: null }, { k: 'm3x3', m: 1, t: null }]), dm.mastery.p.m3x3.l === 2));
  S.rowKeys('m', 2).forEach((k) => { dm.mastery.p[k] = { l: 3, ok: 3, f: 3 }; });
  const won = S.checkCups(dm, 'p');
  check('кубок за строку ×2', won.length === 1 && won[0].id === 'm2', won);
  check('кубок выдаётся один раз', S.checkCups(dm, 'p').length === 0);

  /* --- трудные примеры --- */
  const wr = (t, items) => ({ player: 'p', startedAt: t, items });
  const wd = { rounds: [wr(1, [bad('m6x7'), slow('m8x9')]), wr(2, [{ k: 'm8x9', m: 1, t: 6500 }])] };
  let wl = S.weakList(wd, 'p');
  check('ошибка — в списке', wl.indexOf('m6x7') >= 0);
  check('медленный ответ — в списке', wl.indexOf('m8x9') >= 0);
  wd.rounds.push(wr(3, [fast('m6x7')]), wr(4, [fast('m6x7')]));
  check('два хороших ответа — ещё в списке', S.weakList(wd, 'p').indexOf('m6x7') >= 0);
  wd.rounds.push(wr(5, [fast('m6x7')]));
  check('три хороших ответа в разных раундах — из списка', S.weakList(wd, 'p').indexOf('m6x7') < 0);
  check('свежие ошибки первыми', S.weakList(wd, 'p')[0] === 'm8x9');

  /* --- задание недели --- */
  const mon = new Date(2026, 9, 19, 10, 0).getTime(); // понедельник 19.10.2026
  check('неделя начинается в понедельник', S.weekStart(new Date(2026, 9, 25, 20, 0).getTime()) === new Date(2026, 9, 19).getTime());
  const player = { id: 'p', quests: [] };
  const qd = { rounds: [0, 1, 2].map((i) => ({ player: 'p', pkg: i ? 'fast' : 'school', startedAt: mon + i * 3600000, s: { correct: 16, total: 16 } })) };
  let q = S.quest(qd, player, mon + 86400000);
  check('задание: 3 тренировки и чистый блиц — выполнено', q.done && q.trainings === 3 && q.clean, q);
  qd.rounds[0].s.correct = 15;
  q = S.quest(qd, player, mon + 86400000);
  check('задание: блиц с ошибкой — не выполнено', !q.done && !q.clean);
  const prevWeek = S.shiftWeek(S.weekStart(mon), -1);
  player.quests = [String(prevWeek), String(S.shiftWeek(prevWeek, -1))];
  check('серия недель считается от прошлой недели', S.quest(qd, player, mon).weeks === 2);

  /* --- награды за раунд --- */
  const cd = { rounds: [], mastery: {}, cups: {} }, pl = { id: 'p', xp: 0, stars: 0, quests: [] };
  const first = { id: 'r1', player: 'p', pkg: 'school', mode: 'teacher', startedAt: mon, durationMs: 80000,
    items: G.round(pkg('school'), seeded(21)).map((k) => ({ k, m: 1, t: 2000 })) };
  let res = S.commit(cd, pl, first, mon);
  check('первый раунд: рекорд без бонуса', res.first && res.record && !res.lines.some((l) => l[0] === 'Новый рекорд'));
  check('звёзды: 16 верных + без ошибок', res.total === 21 && pl.stars === 21 && pl.xp === 21, res.lines);
  const second = JSON.parse(JSON.stringify(first)); second.id = 'r2'; second.startedAt = mon + 1000; second.items[0].m = 0;
  res = S.commit(cd, pl, second, mon);
  check('хуже прошлого — не рекорд', !res.record);
  const tr = { id: 'r3', player: 'p', pkg: 'training', mode: 'training', startedAt: mon + 2000, durationMs: 1000, items: [{ k: 'm6x7', m: 1, t: 1000 }] };
  res = S.commit(cd, pl, tr, mon);
  check('работа над ошибками: звёзды ×2 и без рекорда', res.lines[0][1] === 2 && !res.record, res.lines);
  check('третий раунд недели с чистым блицем — задание выполнено', res.questWon && res.total === 22 && pl.quests.length === 1, res.lines);
  res = S.commit(cd, pl, Object.assign(JSON.parse(JSON.stringify(tr)), { id: 'r4', startedAt: mon + 3000 }), mon);
  check('задание недели награждается один раз', !res.questWon);
  const keysRound = Object.assign(JSON.parse(JSON.stringify(second)), { id: 'r5', input: 'keys', startedAt: mon + 4000 });
  res = S.commit(cd, pl, keysRound, mon);
  check('сам: первый раунд с клавиатуры — свой отдельный рекорд', res.first && res.record && !res.prev);
  check('рекорды «вслух» не смешаны с «сам»', S.records(cd, 'school', 'p', { input: 'keys' }).length === 1 && S.records(cd, 'school', 'p', { input: 'voice' }).length === 2);

  /* --- уровни --- */
  /* --- уровни через испытания --- */
  const Lv = U.levels, E = (id) => Lv.byId(id);
  check('10 уровней, темп от 15 до 4 с, школьные 5 с — на 9-м', Lv.MAX === 10 && Lv.pace(1) === 15 && Lv.pace(9) === 5 && Lv.pace(10) === 4 && Lv.SCHOOL_LEVEL === 9);
  check('темп только убывает', Lv.PACE.every((x, i) => i === 0 || x < Lv.PACE[i - 1]));
  check('7 испытаний', Lv.EXAMS.length === 7);
  check('свой облик героя на каждом уровне', U.stageOf(1) === 1 && U.stageOf(2) === 2 && U.stageOf(10) === 10 && U.stageOf(11) === 10);
  check('у каждой темы 10 обликов и 10 званий', ['space', 'dragon', 'pirate'].every((t) => U.THEMES[t].hero.length === 10 && U.THEMES[t].titles.length === 10));
  const looks = ['space', 'dragon', 'pirate'].map((t) => { const a = []; for (let s = 1; s <= 10; s++) a.push(U.art.hero(t, s).replace(/id="[^"]+"|url\(#[^)]+\)/g, '')); return a; });
  check('все 10 обликов в каждой теме разные', looks.every((a) => new Set(a).size === 10));
  check('блиц 1-го уровня: по 15 с', Lv.terms(E('school'), 1).each === 15);
  check('диктант: темп + 2 с', Lv.terms(E('dictation'), 6).each === 10);
  check('20 примеров на 1-м уровне — 5 минут', Lv.terms(E('mulonly'), 1).totalMs === 300000);
  check('минута: 4 верных на 1-м, 15 на 10-м', Lv.terms(E('minute'), 1).need === 4 && Lv.terms(E('minute'), 10).need === 15);
  check('серия: 10 на 1-м, 50 на 10-м', Lv.terms(E('streak'), 1).series === 10 && Lv.terms(E('streak'), 10).series === 50);
  const pk = Lv.pkgFor(E('school'), 3);
  check('пакет испытания в темпе уровня', pk.mode === 'teacher' && pk.interval === 11 && pk.mul === 8 && pk.div === 8);
  const mkR = (items, extra) => { const r = Object.assign({ id: 'x' + Math.random(), items, mode: 'teacher', durationMs: 1000, startedAt: mon }, extra || {}); r.s = S.summarize(r); return r; };
  const okItems = (n) => Array.from({ length: n }, (_, i) => ({ k: 'm' + (2 + i % 8) + 'x3', m: 1, t: 1000 }));
  check('блиц без ошибок — пройдено', Lv.check(E('school'), 1, mkR(okItems(16))).passed);
  const oneErr = okItems(16); oneErr[3].m = 0;
  const failed = Lv.check(E('school'), 1, mkR(oneErr));
  check('одна ошибка — не пройдено и сказано почему', !failed.passed && /1 ошибка/.test(failed.why.join()), failed.why);
  const slowR = Lv.check(E('mulonly'), 1, mkR(okItems(20), { mode: 'fast', durationMs: 301000 }));
  check('общее время больше лимита — не пройдено', !slowR.passed && /время 5:01 — нужно до 5:00/.test(slowR.why.join()), slowR.why);
  check('пауза — не засчитано', !Lv.check(E('school'), 1, mkR(okItems(16), { paused: true })).passed);
  check('минута: мало верных', !Lv.check(E('minute'), 1, mkR(okItems(3), { mode: 'minute' })).passed && Lv.check(E('minute'), 1, mkR(okItems(4), { mode: 'minute' })).passed);
  check('серия короче нужной — не пройдено', !Lv.check(E('streak'), 1, mkR(okItems(9), { mode: 'streak' })).passed);

  const kid = { id: 'k', stars: 0, xp: 0 };
  check('новый игрок — 1-й уровень', Lv.level(kid) === 1);
  const passSize = (id, lv) => { const tt = Lv.terms(E(id), lv); return Math.max(E(id).mul + E(id).div, tt.need || 0, tt.series || 0); };
  const pass = (id, lv) => Lv.apply(kid, mkR(okItems(passSize(id, lv)), { exam: { id, level: lv }, mode: E(id).mode === 'streak' || E(id).mode === 'minute' ? E(id).mode : 'teacher' }));
  let ap = pass('school', 1);
  check('первое прохождение засчитано', ap.newPass && !ap.levelUp && Lv.progress(kid, 1).passed === 1);
  ap = pass('school', 1);
  check('повтор не засчитывается второй раз', !ap.newPass && Lv.progress(kid, 1).passed === 1);
  ap = pass('fast', 2);
  check('испытание чужого уровня не засчитывается', !ap.newPass && Lv.level(kid) === 1);
  ['fast', 'mulonly', 'divonly', 'minute', 'streak'].forEach((id) => pass(id, 1));
  ap = pass('dictation', 1);
  check('все 7 — открыт уровень 2', ap.levelUp && Lv.level(kid) === 2);
  kid.lvl = 10;
  Lv.EXAMS.slice(0, 6).forEach((e) => pass(e.id, 10));
  ap = pass('dictation', 10);
  check('все 7 на 10-м — мастер', ap.master && kid.master && Lv.level(kid) === 10);

  const ld = { rounds: [], mastery: {}, cups: {} }, lp = { id: 'lp', xp: 0, stars: 0, quests: [] };
  const er = { id: 'e1', player: 'lp', pkg: null, mode: 'teacher', startedAt: mon, durationMs: 80000, exam: { id: 'school', level: 1 }, items: okItems(16) };
  res = S.commit(ld, lp, er, mon);
  check('испытание: +15 звёзд и уровень в итоге', res.exam && res.exam.newPass && res.lines.some((l) => /Испытание/.test(l[0]) && l[1] === 15), res.lines);
  check('испытание не попадает в рекорды', !S.eligible(er));

  out.unshift('ИТОГ: ' + ok + ' ok, ' + fail + ' fail');
  const pre = document.createElement('pre');
  pre.id = 'result';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
  document.title = fail ? 'FAIL ' + fail : 'OK ' + ok;
})(window.U);
