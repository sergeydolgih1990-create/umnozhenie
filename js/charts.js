/* Графики динамики: линии по датам, отметки школьного блица */
(function (U) {
  'use strict';

  const W = 340, H = 210, L = 38, R = 20, T = 14, B = 28;
  const COLORS = ['#4f7cff', '#ff7a2a'];
  const day = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dm = (ts) => { const d = new Date(ts); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); };

  U.METRICS = {
    // get — точки рядов; total — одно число раунда для «последний / лучший / в среднем»
    pct: { name: '% верных', unit: '%', max: 100, names: ['% верных'], get: (r) => [r.s.total ? Math.round(r.s.correct / r.s.total * 100) : 0], school: true },
    errors: { name: 'Ошибки', unit: '', names: ['в умножении', 'в делении'], get: (r) => [r.s.mulMiss, r.s.divMiss], total: (r) => r.s.mulMiss + r.s.divMiss },
    time: { name: 'Время раунда', unit: ' с', names: ['секунд на раунд'], get: (r) => [Math.round(r.s.timeMs / 100) / 10] },
    avg: { name: 'Сек. на пример', unit: ' с', names: ['умножение', 'деление'], get: (r) => [r.s.avgMul === null ? null : r.s.avgMul / 1000, r.s.avgDiv === null ? null : r.s.avgDiv / 1000],
      total: (r) => (r.s.avgMs === null ? null : Math.round(r.s.avgMs / 100) / 10) },
    score: { name: 'Очки режима', unit: '', names: ['очки'], get: (r) => [r.s.score] }
  };

  // Ряды точек для метрики: по раундам или средним за день
  U.chartSeries = function (rounds, metric, byDay) {
    const M = U.METRICS[metric];
    const series = M.names.map((name, i) => ({ name, color: COLORS[i], pts: [] }));
    if (!byDay) {
      rounds.forEach((r) => M.get(r).forEach((y, i) => { if (y !== null && y !== undefined) series[i].pts.push({ x: r.startedAt, y }); }));
      return series;
    }
    const groups = {};
    rounds.forEach((r) => { const k = day(r.startedAt); (groups[k] = groups[k] || []).push(r); });
    Object.keys(groups).map(Number).sort((a, b) => a - b).forEach((k) => {
      series.forEach((s, i) => {
        const vals = groups[k].map((r) => M.get(r)[i]).filter((y) => y !== null && y !== undefined);
        if (vals.length) s.pts.push({ x: k + 12 * 3600000, y: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 });
      });
    });
    return series;
  };

  // Верх оси — четыре «круглых» шага, чтобы подписи были целыми: 4, 8, 20, 40, 100…
  function niceMax(v) {
    const raw = Math.max(v, 1) / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    return Math.max(4, step * 4);
  }

  // series: [{name, color, pts:[{x,y}]}]; school: [{x, y, label}] — школьные блицы
  U.chartSVG = function (series, opts) {
    const o = opts || {}, pts = [].concat.apply([], series.map((s) => s.pts));
    const school = o.school || [];
    const xs = pts.map((p) => p.x).concat(school.map((s) => s.x));
    if (!xs.length) return '';
    let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (x1 - x0 < 86400000) { x0 -= 43200000; x1 += 43200000; }
    const ys = pts.map((p) => p.y).concat(o.schoolY ? school.map((s) => s.y) : []);
    const yMax = o.max || niceMax(Math.max.apply(null, ys.concat([1])));
    const sx = (x) => L + (x - x0) / (x1 - x0) * (W - L - R);
    const sy = (y) => T + (1 - y / yMax) * (H - T - B);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = yMax * i / 4, y = sy(v);
      g += `<path d="M${L} ${y.toFixed(1)}H${W - R}" stroke="#e6e8f2" stroke-width="1"/>`;
      g += `<text x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a8eaf">${U.num(Math.round(v * 10) / 10)}</text>`;
    }
    const labels = [x0, (x0 + x1) / 2, x1];
    labels.forEach((x, i) => g += `<text x="${sx(x).toFixed(1)}" y="${H - 8}" text-anchor="${['start', 'middle', 'end'][i]}" font-size="11" fill="#8a8eaf">${dm(x)}</text>`);
    school.forEach((s) => {
      const x = sx(s.x).toFixed(1);
      g += `<path d="M${x} ${T}V${H - B}" stroke="#e0a100" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    });
    series.forEach((s) => {
      if (!s.pts.length) return;
      const d = s.pts.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join('');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
      s.pts.forEach((p) => g += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2.5"/>`);
    });
    // звёзды школьных результатов — поверх линий, чуть сдвинуты от края, чтобы не обрезались
    if (o.schoolY) school.forEach((s) => { g += U.art.starAt(Math.min(sx(s.x), W - 10), Math.max(sy(s.y), T + 2), 8); });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
  };
})(window.U = window.U || {});
