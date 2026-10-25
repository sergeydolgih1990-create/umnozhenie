/* Режимы и стандартные пакеты раундов */
(function (U) {
  'use strict';

  U.MODES = {
    teacher: { name: 'Учитель', icon: 'clock', color: '#4f7cff', hint: 'следующий пример — через заданные секунды, как диктует учитель' },
    fast: { name: 'Быстрый', icon: 'bolt', color: '#ff7a2a', hint: 'следующий пример сразу после отметки, итог — общее время' },
    limit: { name: 'Лимит', icon: 'hourglass', color: '#e0a100', hint: 'следующий сразу после отметки, но время на пример ограничено' },
    accel: { name: 'Ускорение', icon: 'gauge', color: '#8b5cf6', hint: 'ритм учителя, но интервал сокращается к концу' },
    minute: { name: 'Минута', icon: 'clock', color: '#0ea5e9', hint: 'сколько верных успеет за отведённое время' },
    streak: { name: 'До первой ошибки', icon: 'flame', color: '#ff5c5c', hint: 'серия без ошибок; время на пример ограничено' },
    dictation: { name: 'Диктант на слух', icon: 'sound', color: '#14a3b8', hint: 'пример читает голос, ответы на бумаге, проверка в конце' },
    training: { name: 'Работа над ошибками', icon: 'target', color: '#ff5c8a', hint: 'трудные примеры из последних раундов, звёзды двойные' }
  };
  U.FIXED_MODES = { teacher: 1, accel: 1, dictation: 1 };

  // Ответ вслух с кнопками «Верно / Неверно» у взрослого. Сергей, 25.10.2026: пока убран из интерфейса,
  // код оставлен — чтобы вернуть, поставить true. Пока выключено, все раунды идут с клавиатуры ребёнка.
  U.VOICE_MODE = false;
  U.inputOf = (p) => (U.VOICE_MODE && !(p && p.input === 'keys') ? 'voice' : 'keys');
  U.STREAM_MODES = { minute: 1, streak: 1 };

  const BASE = { std: true, tables: [2, 3, 4, 5, 6, 7, 8, 9], voice: false, hideTime: false };
  // Темп мягче школьного на 2 с (Сергей, 25.10.2026); «Блиц-мастер» — как раз школьные 5 с
  U.STD_PACKAGES = [
    { id: 'school', name: 'Школьный блиц', mode: 'teacher', mul: 8, div: 8, interval: 7 },
    { id: 'big', name: 'Большой блиц', mode: 'teacher', mul: 10, div: 10, interval: 7 },
    { id: 'master', name: 'Блиц-мастер', mode: 'teacher', mul: 10, div: 10, interval: 5 },
    { id: 'fast', name: 'Быстрый круг', mode: 'fast', mul: 10, div: 10 },
    { id: 'mulonly', name: 'Только умножение', mode: 'fast', mul: 20, div: 0 },
    { id: 'divonly', name: 'Только деление', mode: 'fast', mul: 0, div: 20 },
    { id: 'limit', name: 'Лимит', mode: 'limit', mul: 10, div: 10, interval: 6 },
    { id: 'accel', name: 'Ускорение', mode: 'accel', mul: 10, div: 10, from: 8, to: 5 },
    { id: 'minute', name: 'Минута', mode: 'minute', mul: 1, div: 1, duration: 60 },
    { id: 'streak', name: 'До первой ошибки', mode: 'streak', mul: 1, div: 1, interval: 7 },
    { id: 'dictation', name: 'Диктант на слух', mode: 'dictation', mul: 8, div: 8, interval: 7, voice: true },
    { id: 'training', name: 'Работа над ошибками', mode: 'training', max: 16 }
  ].map((p) => Object.assign({}, BASE, p));

  U.allPackages = function () { return U.STD_PACKAGES.concat((U.store && U.store.data.packages) || []); };
  U.pkgById = function (id) { return U.allPackages().find((p) => p.id === id) || null; };

  const num = (x) => String(x).replace('.', ',');
  U.num = num;
  U.plural = function (n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  };
  U.pkgCount = function (p) {
    if (U.STREAM_MODES[p.mode]) return null;
    if (p.mode === 'training') return p.max;
    return (p.mul || 0) + (p.div || 0);
  };
  function opsText(p) { return p.mul && p.div ? 'умножение и деление' : p.div ? 'только деление' : 'только умножение'; }
  function tablesText(p) {
    const t = (p.tables || []).slice().sort((a, b) => a - b);
    if (t.join() === BASE.tables.join()) return '';
    return t.length === 1 ? 'таблица на ' + t[0] : 'таблицы ' + t.join(', ');
  }
  U.pkgDesc = function (p) {
    const parts = [];
    if (p.mode === 'minute') parts.push(num(p.duration) + ' с на всё', opsText(p));
    else if (p.mode === 'streak') parts.push('пока без ошибок', opsText(p), 'до ' + num(p.interval) + ' с на пример');
    else if (p.mode === 'training') parts.push('до ' + p.max + ' трудных примеров', 'звёзды ×2');
    else {
      const n = U.pkgCount(p), word = U.plural(n, 'пример', 'примера', 'примеров');
      parts.push(p.mul && p.div ? n + ' ' + word + ': ' + p.mul + ' на умножение и ' + p.div + ' на деление'
        : n + ' ' + word + (p.div ? ' на деление' : ' на умножение'));
      if (p.mode === 'teacher') parts.push('по ' + num(p.interval) + ' с на пример');
      if (p.mode === 'dictation') parts.push('по ' + num(p.interval) + ' с, читает голос');
      if (p.mode === 'fast') parts.push('на скорость');
      if (p.mode === 'limit') parts.push('не больше ' + num(p.interval) + ' с на пример');
      if (p.mode === 'accel') parts.push('от ' + num(p.from) + ' до ' + num(p.to) + ' с на пример');
    }
    const tt = tablesText(p);
    if (tt) parts.push(tt);
    return parts.join(' · ');
  };

  // Снимок условий пакета — хранится в каждом раунде, чтобы история не зависела от правок пакета
  U.pkgSnapshot = function (p) {
    const keys = ['id', 'name', 'mode', 'mul', 'div', 'interval', 'from', 'to', 'duration', 'max', 'tables', 'voice', 'hideTime'];
    const s = {};
    keys.forEach((k) => { if (p[k] !== undefined) s[k] = p[k]; });
    return s;
  };
})(window.U = window.U || {});
