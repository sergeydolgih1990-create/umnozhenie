/* Макеты экранов: оформление трёх тем до подключения логики */
(function (U) {
  'use strict';
  const A = U.art, ic = A.icon;
  const star = () => A.star();
  const starSm = () => A.star('ic sm');
  const THEMES = ['space', 'dragon', 'pirate'];

  // Состояние игрока до раунда; итог раунда добавляет GAIN звёзд
  const SAMPLE = {
    space: { name: 'Саша', avatar: '🦊', xp: 140, stars: 86 },
    dragon: { name: 'Женя', avatar: '🐼', xp: 450, stars: 214 },
    pirate: { name: 'Валя', avatar: '🐯', xp: 980, stars: 331 }
  };
  const GAIN = 28;
  function lvl(t, plus) {
    const d = SAMPLE[t], xp = d.xp + (plus || 0), lv = U.levelOf(xp), st = U.stageOf(lv);
    const cur = U.LEVELS[lv - 1], next = U.LEVELS[lv] || cur, span = next - cur || 1;
    return { d, lv, st, next, left: next - xp, pct: Math.round((xp - cur) / span * 100), basePct: Math.round((d.xp - cur) / span * 100) };
  }
  const ex = (a, op, b) => `${a} <span class="op">${op}</span> ${b}`;
  function segs(total, marks) {
    let s = '';
    for (let i = 0; i < total; i++) s += `<i class="${i < marks.length ? marks[i] : i === marks.length ? 'cur' : ''}"></i>`;
    return `<div class="segs">${s}</div>`;
  }
  const answerBtns = (dim) => `<div class="answer-btns">
      <button class="answer bad${dim ? ' dim' : ''}">${ic('cross')}Неверно</button>
      <button class="answer ok">${ic('check')}Верно</button>
    </div><div class="swipe-hint">или свайп влево / вправо</div>`;

  /* ---------- Главный экран ---------- */
  function home(t) {
    const T = U.THEMES[t], L = lvl(t);
    return `<div class="screen">
      <div class="topbar">
        <div class="avatar">${L.d.avatar}</div>
        <div class="who grow"><div class="name">${L.d.name}</div><div class="title">${T.titles[L.st - 1]}</div></div>
        <div class="pill">${star()}${L.d.stars}</div>
        <button class="icon-btn" aria-label="Родителям">${ic('lock')}</button>
      </div>
      <div class="hero-stage">
        ${t === 'space' ? `<div class="pill blitz">${ic('clock')}До блица: 2 дня</div>` : ''}
        ${A.hero(t, L.st)}
        <div class="hero-caption">${T.hero[L.st - 1]} · ступень ${L.st} из 5</div>
      </div>
      <div class="panel">
        <div class="between"><b style="font-size:18px">Уровень ${L.lv}</b><span class="soft">до ${L.lv + 1}-го: ${L.left} ${starSm()}</span></div>
        <div class="xp"><i style="width:${L.pct}%"></i></div>
      </div>
      <div class="panel">
        <h3><span style="color:#ff7a2a">${ic('flame')}</span>Задание недели<span class="reward">+20 ${starSm()}</span></h3>
        <div class="quest-line"><span class="box done">${ic('check')}</span>3 тренировки<span class="prog">2 из 3</span></div>
        <div class="quest-line"><span class="box"></span>«Школьный блиц» без ошибок</div>
      </div>
      <button class="btn btn-primary btn-big">${ic('play')}Играть</button>
      <div class="tiles">
        <button class="tile"><span style="color:#4f7cff">${ic('map')}</span>Карта</button>
        <button class="tile"><span style="color:#e0a100">${ic('trophy')}</span>Рекорды</button>
        <button class="tile"><span style="color:#2fbf71">${ic('chart')}</span>Графики</button>
        <button class="tile"><span style="color:#ff5c8a">${ic('gift')}</span>Призы</button>
      </div>
    </div>`;
  }

  /* ---------- Раунд: в каждой теме свой режим, чтобы показать все состояния ---------- */
  function round(t) {
    const top = (count, name) => `<div class="topbar">
        <div class="pill">${count}</div><div class="grow center pkg-name">${name}</div>
        <button class="icon-btn" aria-label="Пауза">${ic('pause')}</button>
      </div>`;
    if (t === 'dragon') {
      return `<div class="screen">
        ${top('8 / 20', 'Быстрый круг')}
        ${segs(20, ['ok', 'ok', 'bad', 'ok', 'ok', 'ok', 'ok'])}
        <div class="panel race">
          <div class="race-head">${ic('clock')}0:19<span class="soft">решено к этой секунде</span></div>
          <div class="lane"><span>Ты</span><div class="track"><i style="width:35%"></i></div><span class="t">7</span></div>
          <div class="lane rec"><span>Рекорд</span><div class="track"><i style="width:45%"></i></div><span class="t">9</span></div>
        </div>
        <div class="example-card"><div class="example">${ex(56, ':', 8)}</div><div class="eq">= ?</div></div>
        ${answerBtns()}
      </div>`;
    }
    if (t === 'pirate') {
      return `<div class="screen">
        ${top('10 / 16', 'Школьный блиц')}
        ${segs(16, ['ok', 'ok', 'ok', 'bad', 'ok', 'ok', 'skip', 'ok', 'ok'])}
        <div class="timer-row"><div class="timer"><i style="width:38%"></i></div><b>2 с</b></div>
        <div class="pill" style="align-self:center">${ic('trophy')}Рекорд: 14 из 16</div>
        <div class="example-card">
          <div class="card-badge">${ic('check')}Отмечено «верно»</div>
          <div class="example">${ex(9, '×', 6)}</div><div class="eq">= ?</div>
        </div>
        ${answerBtns(true)}
      </div>`;
    }
    return `<div class="screen">
      ${top('5 / 16', 'Школьный блиц')}
      ${segs(16, ['ok', 'ok', 'ok', 'ok'])}
      <div class="timer-row"><div class="timer"><i style="width:62%"></i></div><b>3 с</b></div>
      <div class="pill" style="align-self:center">${ic('trophy')}Рекорд: 14 из 16</div>
      <div class="example-card"><div class="example">${ex(7, '×', 8)}</div><div class="eq">= ?</div></div>
      ${answerBtns()}
    </div>`;
  }

  /* ---------- Сверка ---------- */
  const REVIEW = [
    ['7 × 8', 56, 'ok', 2.1], ['54 : 6', 9, 'ok', 3.4], ['3 × 5', 15, 'ok', 1.2], ['72 : 9', 8, 'bad', 5.0],
    ['4 × 7', 28, 'ok', 2.6], ['18 : 3', 6, 'skip', null], ['40 : 8', 5, 'ok', 2.9], ['2 × 7', 14, 'ok', 1.1],
    ['36 : 4', 9, 'ok', 2.4], ['8 × 6', 48, 'ok', 1.9], ['35 : 7', 5, 'ok', 3.0], ['9 × 3', 27, 'ok', 1.6],
    ['48 : 8', 6, 'ok', 2.7], ['5 × 4', 20, 'ok', 1.3], ['63 : 9', 7, 'ok', 3.6], ['2 × 8', 16, 'ok', 1.4]
  ];
  function review() {
    const rows = REVIEW.map((r, i) => `<div class="rrow${r[2] === 'skip' ? ' skip' : ''}">
        <span class="n">${i + 1}</span>
        <span class="ex">${r[0]} <span class="res">= ${r[1]}</span></span>
        <span class="t">${r[3] === null ? 'без отметки' : r[3].toFixed(1).replace('.', ',') + ' с'}</span>
        <span class="mark"><button class="${r[2] === 'bad' ? 'on bad' : ''}" aria-label="Неверно">${ic('cross')}</button><button class="${r[2] === 'ok' ? 'on ok' : ''}" aria-label="Верно">${ic('check')}</button></span>
      </div>`).join('');
    return `<div class="screen">
      <div class="topbar"><div class="grow"><div class="who"><div class="name">Проверка</div><div class="title">Нажали не то — поправьте отметку</div></div></div></div>
      <div class="counts">
        <div class="count ok"><b>14</b><span>верно</span></div>
        <div class="count bad"><b>1</b><span>неверно</span></div>
        <div class="count skip"><b>1</b><span>без отметки</span></div>
      </div>
      <div class="review-list fade">${rows}</div>
      <button class="btn btn-primary btn-big">${ic('check')}Сохранить</button>
    </div>`;
  }

  /* ---------- Итог с салютом ---------- */
  function result(t) {
    const T = U.THEMES[t], L = lvl(t, GAIN);
    return `<div class="screen">
      ${A.confetti()}
      <div class="result">
        <div class="ribbon">Новый рекорд!</div>
        <div class="pkg-name">Школьный блиц</div>
        <div class="score">15<small> из 16</small></div>
        <div class="sub">Прошлый рекорд — 14 из 16</div>
        <div class="panel earn">
          <div class="total">+28 ${star()}</div>
          <ul>
            <li><span>15 верных ответов</span><b>+15</b></li>
            <li><span>Новый рекорд</span><b>+10</b></li>
            <li><span>Золотая клетка 5 × 6</span><b>+3</b></li>
          </ul>
        </div>
        <div class="panel hero-mini">
          ${A.hero(t, L.st)}
          <div class="grow"><b style="font-size:17px">Уровень ${L.lv} · ${T.titles[L.st - 1]}</b>
            <div class="soft"><span class="gain">+${GAIN}</span> · до ${L.lv + 1}-го уровня: ${L.left} ${starSm()}</div>
            <div class="xp"><i style="width:${Math.max(L.basePct, 0)}%"></i><b style="width:${L.pct - Math.max(L.basePct, 0)}%"></b></div></div>
        </div>
        <div class="again">Повторить<span class="chip-ex">72 : 9 = 8</span></div>
      </div>
      <div class="btn-row"><button class="btn btn-light">${ic('home')}Домой</button><button class="btn btn-primary">${ic('replay')}Ещё раз</button></div>
    </div>`;
  }

  /* ---------- Карта таблицы ---------- */
  function mastery(a, b) {
    if (a === 2 || b === 2 || a === 5 || b === 5) return 3;
    if (a === 7 || b === 7) return (a + b) % 3 === 0 ? 1 : 0;
    if (a + b <= 11) return 2;
    return (a * b) % 4 === 0 ? 1 : 0;
  }
  function map(t) {
    let g = '<div class="h">×</div>';
    for (let b = 2; b <= 9; b++) g += `<div class="h">${b}</div>`;
    for (let a = 2; a <= 9; a++) {
      g += `<div class="h">${a}</div>`;
      for (let b = 2; b <= 9; b++) g += `<div class="cell c${mastery(a, b)}">${a * b}</div>`;
    }
    return `<div class="screen">
      <div class="topbar"><button class="icon-btn" aria-label="Назад">${ic('back')}</button><div class="grow who"><div class="name">Карта таблицы</div></div><div class="pill">${star()}${SAMPLE[t].stars}</div></div>
      <div class="toggle"><b class="on">Умножение</b><b>Деление</b></div>
      <div class="panel"><div class="tmap">${g}</div></div>
      <div class="panel">
        <div class="legend"><span><i></i>ещё нет</span><span><i class="c1"></i>бронза — верно</span><span><i class="c2"></i>серебро — 3 раза верно</span><span><i class="c3"></i>золото — 3 раза быстро</span></div>
      </div>
      <div class="cups">
        <span class="cup">${ic('trophy')}Повелитель двойки</span><span class="cup">${ic('trophy')}Повелитель пятёрки</span>
        <span class="cup off">${ic('trophy')}Семёрка: 2 из 8</span><span class="cup off">${ic('trophy')}Вся таблица: 2 из 8</span>
      </div>
    </div>`;
  }

  /* ---------- Сборка страницы макетов ---------- */
  const SCREENS = [
    ['home', 'Главный экран', home, 'Герой растёт с уровнем. Сверху звёзды и вход для родителей, ниже задание недели. Плашка «До блица» появляется, только если родитель указал дату блица (здесь — в космосе).'],
    ['round', 'Раунд', round, 'Космос — «Учитель» с полоской времени. Драконы — «Быстрый» с призраком рекорда. Пираты — пример уже отмечен, следующий появится по окончании 5 секунд; белый сегмент с жёлтой рамкой — пример без отметки.'],
    ['review', 'Проверка после раунда', () => review(), 'Можно исправить отметку. Жёлтым — пример, который не успели отметить: после отметки получится 15 из 16, как на итоге.'],
    ['result', 'Итог с салютом', result, 'Звёзды за раунд, полоска уровня с заработанным (зелёная часть), что повторить.'],
    ['map', 'Карта таблицы', map, 'Клетки загораются бронзой, серебром и золотом; кубки за строки.']
  ];

  function device(t, html, screen) { return `<div class="device"><div class="app" data-theme="${t}" data-screen="${screen}"><div class="bg">${A.bg(t)}</div>${html}</div></div>`; }

  function heroesSheet() {
    return THEMES.map((t) => {
      const T = U.THEMES[t];
      const nb = (x) => x.replace(/ (\S{1,2}) /g, ' $1 ');
      const cards = [1, 2, 3, 4, 5].map((s) => `<div class="hcard app" data-theme="${t}">${A.hero(t, s)}
          <div class="hc-name">${s}. ${nb(T.hero[s - 1])}</div><div class="hc-title">${T.titles[s - 1]} · уровни ${s * 3 - 2}–${s * 3}</div></div>`).join('');
      return `<div class="hrow" data-t="${t}"><h3>${T.name}</h3><div class="hcards">${cards}</div></div>`;
    }).join('');
  }

  function build() {
    const q = new URLSearchParams(location.search);
    const solo = q.get('solo'), soloTheme = q.get('theme') || 'space';
    const root = document.getElementById('root');
    if (solo) {
      document.body.classList.add('solo');
      const sc = SCREENS.find((s) => s[0] === solo);
      root.innerHTML = solo === 'heroes' ? `<div class="sheet">${heroesSheet()}</div>` : device(soloTheme, sc[2](soloTheme), solo);
      return;
    }
    root.innerHTML = SCREENS.map((sc) => `<section><h2>${sc[1]}</h2><p class="note">${sc[3]}</p><div class="frames">${THEMES.map((t) =>
      `<div class="frame" data-t="${t}"><div class="cap">${U.THEMES[t].name}</div><div class="fbox">${device(t, sc[2](t), sc[0])}</div></div>`).join('')}</div></section>`).join('') +
      `<section><h2>Герои: пять ступеней роста</h2><p class="note">Ступень меняется каждые три уровня. Уровни растут от накопленных звёзд.</p><div class="sheet">${heroesSheet()}</div></section>`;
    fit();
  }

  function fit() {
    document.querySelectorAll('.fbox').forEach((box) => {
      const k = Math.min(1, box.clientWidth / 390);
      const dev = box.firstElementChild;
      dev.style.transform = `scale(${k})`;
      box.style.height = (844 * k) + 'px';
    });
  }

  function tabs() {
    const bar = document.getElementById('tabs');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      document.body.dataset.show = b.dataset.t;
      fit();
    });
  }

  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', () => { build(); tabs(); });
})(window.U = window.U || {});
