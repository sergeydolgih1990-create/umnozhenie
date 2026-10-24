/* Примеры: пулы по таблицам, порядок без похожих соседей, поток для режимов без конца */
(function (U) {
  'use strict';

  const DEFAULT_TABLES = [2, 3, 4, 5, 6, 7, 8, 9];
  const rand = (rnd, n) => Math.floor(rnd() * n);

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(rnd, i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Ключ примера: m7x8 — «7 × 8 = ?», d56:8 — «56 : 8 = ?»
  const cache = new Map();
  function parse(k) {
    let e = cache.get(k);
    if (e) return e;
    if (k[0] === 'm') {
      const [a, b] = k.slice(1).split('x').map(Number);
      e = { op: 'm', a, b, ans: a * b, f: [a, b] };
    } else {
      const [p, d] = k.slice(1).split(':').map(Number);
      e = { op: 'd', p, d, ans: p / d, f: [d, p / d] };
    }
    cache.set(k, e);
    return e;
  }
  const keyM = (a, b) => 'm' + a + 'x' + b;
  const keyD = (p, d) => 'd' + p + ':' + d;
  function text(k) { const e = parse(k); return e.op === 'm' ? e.a + ' × ' + e.b : e.p + ' : ' + e.d; }
  function parts(k) { const e = parse(k); return e.op === 'm' ? [e.a, '×', e.b] : [e.p, ':', e.d]; }
  function speech(k) { const e = parse(k); return e.op === 'm' ? e.a + ' умножить на ' + e.b : e.p + ' разделить на ' + e.d; }

  // Пример входит в пул, если хотя бы один множитель из выбранных таблиц.
  // Второй множитель — от 2 до 9, плюс 1 и 10, если они выбраны.
  function pools(tables) {
    const S = new Set(tables && tables.length ? tables : DEFAULT_TABLES);
    const R = DEFAULT_TABLES.slice();
    if (S.has(1)) R.unshift(1);
    if (S.has(10)) R.push(10);
    const mul = [], div = [];
    R.forEach((a) => R.forEach((b) => {
      if (S.has(a) || S.has(b)) { mul.push(keyM(a, b)); div.push(keyD(a * b, b)); }
    }));
    return { mul, div };
  }

  const sameSet = (x, y) => (x.f[0] === y.f[0] && x.f[1] === y.f[1]) || (x.f[0] === y.f[1] && x.f[1] === y.f[0]);

  // Можно ли поставить k следом за out. Строгость 2 — нет общих чисел, разные ответы, не больше трёх
  // одинаковых действий подряд; 1 — не тот же набор чисел и не тот же ответ; 0 — просто не тот же пример.
  function fits(out, k, level, bothOps) {
    const prev = out[out.length - 1];
    if (prev === undefined) return true;
    if (prev === k) return false;
    if (level === 0) return true;
    const x = parse(prev), y = parse(k);
    if (x.ans === y.ans || sameSet(x, y)) return false;
    if (level === 1) return true;
    if (x.f.indexOf(y.f[0]) >= 0 || x.f.indexOf(y.f[1]) >= 0) return false;
    if (bothOps && out.length >= 3) {
      const op = k[0];
      if (out[out.length - 1][0] === op && out[out.length - 2][0] === op && out[out.length - 3][0] === op) return false;
    }
    return true;
  }

  function order(keys, rnd) {
    const both = keys.some((k) => k[0] === 'm') && keys.some((k) => k[0] === 'd');
    for (let level = 2; level >= 0; level--) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const left = keys.slice(), out = [];
        while (left.length) {
          const cand = left.filter((k) => fits(out, k, level, both));
          if (!cand.length) break;
          const pick = cand[rand(rnd, cand.length)];
          out.push(pick);
          left.splice(left.indexOf(pick), 1);
        }
        if (!left.length) return out;
      }
    }
    return shuffle(keys, rnd);
  }

  // n примеров из пула; если пул меньше n, примеры повторяются
  function sample(pool, n, rnd) {
    const out = [];
    if (n <= 0 || !pool.length) return out;
    while (out.length < n) Array.prototype.push.apply(out, shuffle(pool, rnd).slice(0, n - out.length));
    return out;
  }

  function round(pkg, rnd) {
    const P = pools(pkg.tables);
    return order(sample(P.mul, pkg.mul || 0, rnd).concat(sample(P.div, pkg.div || 0, rnd)), rnd);
  }

  // Бесконечный поток для «Минуты» и «До первой ошибки»: без повторов, пока не кончится пул
  function stream(pkg, rnd) {
    const P = pools(pkg.tables), wm = pkg.mul || 0, wd = pkg.div || 0;
    const both = wm > 0 && wd > 0, bags = { m: [], d: [] }, out = [];
    return function next() {
      const op = !wd ? 'm' : !wm ? 'd' : (rnd() < wm / (wm + wd) ? 'm' : 'd');
      const pool = op === 'm' ? P.mul : P.div;
      if (!bags[op].length) bags[op] = shuffle(pool, rnd);
      for (let level = 2; level >= 0; level--) {
        const i = bags[op].findIndex((k) => fits(out, k, level, both));
        if (i >= 0) { const k = bags[op].splice(i, 1)[0]; out.push(k); return k; }
      }
      const k = bags[op].shift() || pool[0];
      out.push(k);
      return k;
    };
  }

  U.gen = { DEFAULT_TABLES, parse, keyM, keyD, text, parts, speech, pools, fits, order, sample, round, stream, shuffle };
})(window.U = window.U || {});
