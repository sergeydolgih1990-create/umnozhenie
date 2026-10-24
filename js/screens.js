/* Экраны вне раунда: игроки, главный, пакеты, карта, рекорды, история, графики, призы, раздел для родителей */
(function (U) {
  'use strict';

  const ui = U.ui, A = U.art, ic = A.icon, esc = U.esc, F = U.fmt, S = U.score;
  const D = () => U.store.data;
  const star = () => A.star(), starSm = () => A.star('ic sm');
  const pl = U.plural;
  const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🐵', '🦁', '🐰', '🐨', '🐶', '🐱', '🦄', '🐲', '🐙', '🦖', '🐧', '🐻'];
  const PRIZE_EMOJI = ['🎁', '🍦', '🎬', '🧸', '🎮', '🍕', '📚', '⚽', '🎨', '🚲'];
  const THEME_IDS = ['space', 'dragon', 'pirate'];

  const topbar = (title, opts) => {
    const o = opts || {};
    return `<div class="topbar"><button class="icon-btn" data-act="back" aria-label="Назад">${ic('back')}</button>
      <div class="grow who"><div class="name">${title}</div>${o.sub ? `<div class="title">${o.sub}</div>` : ''}</div>${o.right || ''}</div>`;
  };
  const starsPill = (p) => `<div class="pill">${star()}${p.stars || 0}</div>`;
  const levelInfo = (xp) => {
    const lv = U.levelOf(xp || 0), cur = U.LEVELS[lv - 1], next = U.LEVELS[lv];
    return { lv, st: U.stageOf(lv), next, left: next ? next - (xp || 0) : 0, pct: next ? Math.round(((xp || 0) - cur) / (next - cur) * 100) : 100 };
  };
  U.levelInfo = levelInfo;
  const exHTML = (k) => { const p = U.gen.parts(k); return `${p[0]} <span class="op">${p[1]}</span> ${p[2]}`; };
  U.exHTML = exHTML;

  U.actions.back = () => U.back();

  /* ---------- Игроки ---------- */
  U.screens.players = function () {
    const d = D(), ps = d.players;
    const cards = ps.map((p) => {
      const L = levelInfo(p.xp);
      return `<button class="player-card" data-theme="${p.theme}" data-act="pickPlayer" data-id="${p.id}">
        ${A.hero(p.theme, L.st)}<span class="pc-name"><span>${p.avatar}</span>${esc(p.name)}</span>
        <span class="pc-sub">Уровень ${L.lv} · ${U.THEMES[p.theme].titles[L.st - 1]}</span></button>`;
    }).join('');
    return `<div class="screen scroll">
      <div class="topbar"><div class="grow who"><div class="name">${ps.length ? 'Кто играет?' : 'Блиц по таблице умножения'}</div>
        <div class="title">${ps.length ? 'Выберите игрока' : 'Добавьте первого игрока — и можно начинать'}</div></div>
        ${ps.length ? `<button class="icon-btn" data-act="parent" aria-label="Для родителей">${ic('lock')}</button>` : ''}</div>
      <div class="players">${cards}<button class="player-card add" data-act="addPlayer">${ic('plus')}Добавить игрока</button></div>
    </div>`;
  };
  U.actions.players = () => U.go('players');
  U.actions.pickPlayer = (ds) => { D().current = ds.id; U.store.save(); U.go('home', {}, { reset: true }); };
  U.actions.addPlayer = () => {
    const used = D().players.map((p) => p.avatar);
    U.go('playerForm', {}, { form: { name: '', avatar: AVATARS.find((a) => used.indexOf(a) < 0) || AVATARS[0], theme: 'space' } });
  };
  U.actions.editPlayer = (ds) => {
    const p = D().players.find((x) => x.id === ds.id);
    if (p) U.go('playerForm', { id: p.id }, { form: { name: p.name, avatar: p.avatar, theme: p.theme } });
  };

  U.screens.playerForm = function (pr) {
    const f = ui.form;
    ui.themeOverride = f.theme;
    const av = AVATARS.map((a) => `<button class="av${a === f.avatar ? ' on' : ''}" data-act="fset" data-k="avatar" data-v="${a}">${a}</button>`).join('');
    const th = THEME_IDS.map((t) => `<button class="theme-card${t === f.theme ? ' on' : ''}" data-theme="${t}" data-act="fset" data-k="theme" data-v="${t}">${A.hero(t, 3)}<b>${U.THEMES[t].name}</b></button>`).join('');
    return `<div class="screen scroll">${topbar(pr.id ? 'Игрок' : 'Новый игрок')}
      <div class="card form">
        <label class="field"><span>Имя</span><input class="inp" data-f="name" maxlength="16" value="${esc(f.name)}" placeholder="Как зовут?" autocomplete="off"></label>
        <div class="field"><span>Картинка</span><div class="avatar-grid">${av}</div></div>
        <div class="field"><span>Тема и герой</span><div class="theme-pick">${th}</div></div>
        ${f.error ? `<div class="err">${f.error}</div>` : ''}
      </div>
      <button class="btn btn-primary btn-big" data-act="savePlayer">${ic('check')}Сохранить</button>
    </div>`;
  };
  U.actions.fset = (ds) => { ui.form[ds.k] = ds.v; U.refresh(); };
  U.actions.savePlayer = () => {
    const f = ui.form, name = String(f.name || '').trim(), d = D();
    if (!name) { f.error = 'Напишите имя'; U.refresh(); return; }
    ui.themeOverride = null;
    if (ui.params.id) {
      const p = d.players.find((x) => x.id === ui.params.id);
      Object.assign(p, { name, avatar: f.avatar, theme: f.theme });
    } else {
      const p = { id: U.store.uid(), name, avatar: f.avatar, theme: f.theme, xp: 0, stars: 0, quests: [], blitzDate: null, createdAt: Date.now() };
      d.players.push(p);
      d.current = p.id;
    }
    U.store.save();
    if (ui.params.id) U.back(); else U.go('home', {}, { reset: true });
  };

  /* ---------- Главный экран ---------- */
  function blitzChip(p) {
    if (!p.blitzDate) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((F.fromIso(p.blitzDate) - today.getTime()) / 86400000);
    if (days < 0) return '';
    const t = days === 0 ? 'Блиц сегодня!' : days === 1 ? 'Блиц завтра' : 'До блица: ' + days + ' ' + pl(days, 'день', 'дня', 'дней');
    return `<div class="pill blitz">${ic('calendar')}${t}</div>`;
  }
  function questPanel(q) {
    const enough = q.trainings >= q.need;
    const head = q.awarded ? `<span class="reward">${ic('check')}выполнено</span>` : `<span class="reward">+20 ${starSm()}</span>`;
    return `<div class="panel"><h3><span style="color:#ff7a2a">${ic('flame')}</span>Задание недели${head}</h3>
      <div class="quest-line"><span class="box${enough ? ' done' : ''}">${enough ? ic('check') : ''}</span>${q.need} ${pl(q.need, 'тренировка', 'тренировки', 'тренировок')}<span class="prog">${Math.min(q.trainings, q.need)} из ${q.need}</span></div>
      <div class="quest-line"><span class="box${q.clean ? ' done' : ''}">${q.clean ? ic('check') : ''}</span>«Школьный блиц» без ошибок</div>
      ${q.weeks ? `<div class="soft">Серия: ${q.weeks} ${pl(q.weeks, 'неделя', 'недели', 'недель')} подряд</div>` : ''}</div>`;
  }
  const needBackup = () => !U.store.memoryOnly && D().rounds.length - (D().settings.backupRounds || 0) >= 10;

  U.screens.home = function () {
    const p = U.player();
    if (!p) return U.screens.players();
    const T = U.THEMES[p.theme], L = levelInfo(p.xp), q = S.quest(D(), p, Date.now());
    const n = D().rounds.length - (D().settings.backupRounds || 0);
    return `<div class="screen">
      <div class="topbar">
        <button class="avatar" data-act="players" aria-label="Сменить игрока">${p.avatar}</button>
        <div class="who grow"><div class="name">${esc(p.name)}</div><div class="title">${T.titles[L.st - 1]}</div></div>
        ${starsPill(p)}
        <button class="icon-btn" data-act="parent" aria-label="Для родителей">${ic('lock')}</button>
      </div>
      ${needBackup() ? `<button class="banner" data-act="backup">${ic('download')}<span>${n} ${pl(n, 'раунд', 'раунда', 'раундов')} без резервной копии. <b>Сохранить копию</b></span></button>` : ''}
      <div class="hero-stage">${blitzChip(p)}${A.hero(p.theme, L.st)}<div class="hero-caption">${T.hero[L.st - 1]} · ступень ${L.st} из 5</div></div>
      <div class="panel">
        <div class="between"><b style="font-size:18px">Уровень ${L.lv}</b><span class="soft">${L.next ? 'до ' + (L.lv + 1) + '-го: ' + L.left + ' ' + starSm() : 'высший уровень!'}</span></div>
        <div class="xp"><i style="width:${L.pct}%"></i></div>
      </div>
      ${questPanel(q)}
      <button class="btn btn-primary btn-big" data-act="packages">${ic('play')}Играть</button>
      <div class="tiles">
        <button class="tile" data-act="map"><span style="color:#4f7cff">${ic('map')}</span>Карта</button>
        <button class="tile" data-act="records"><span style="color:#e0a100">${ic('trophy')}</span>Рекорды</button>
        <button class="tile" data-act="charts"><span style="color:#2fbf71">${ic('chart')}</span>Графики</button>
        <button class="tile" data-act="prizes"><span style="color:#ff5c8a">${ic('gift')}</span>Призы</button>
      </div>
    </div>`;
  };
  U.actions.home = () => U.go('home', {}, { reset: true });
  U.actions.backup = () => { const name = U.store.exportFile(); U.toast('Копия сохранена: ' + name); U.refresh(); };

  /* ---------- Выбор пакета ---------- */
  U.screens.packages = function () {
    const p = U.player(), d = D();
    const card = (pk) => {
      const M = U.MODES[pk.mode];
      const best = pk.mode === 'training' ? null : S.records(d, pk.id, p.id)[0];
      let desc = U.pkgDesc(pk);
      if (pk.mode === 'training') {
        const n = S.weakList(d, p.id, pk.max).length;
        desc = n ? n + ' ' + pl(n, 'трудный пример', 'трудных примера', 'трудных примеров') + ' · звёзды ×2' : 'Трудных примеров пока нет';
      }
      if (pk.voice && !U.sound.canSpeak()) desc += ' · голос в этом браузере недоступен';
      return `<button class="pkg-card" data-act="play" data-id="${pk.id}">
        <span class="pkg-ic" style="background:${M.color}">${ic(M.icon)}</span>
        <span class="pkg-body"><b>${esc(pk.name)}</b><span>${desc}</span>${best ? `<span class="pkg-rec">${ic('trophy')}рекорд: ${S.resultText(best)}</span>` : ''}</span>
        <span class="pkg-go">${ic('play')}</span></button>`;
    };
    return `<div class="screen scroll">${topbar('Во что играем?', { right: starsPill(p) })}
      <div class="pkg-list">${U.STD_PACKAGES.map(card).join('')}</div>
      ${d.packages.length ? `<h2 class="sec">Свои пакеты</h2><div class="pkg-list">${d.packages.map(card).join('')}</div>` : ''}
      <button class="btn btn-light" data-act="newPkg">${ic('plus')}Свой раунд</button>
    </div>`;
  };
  U.actions.packages = () => U.go('packages');
  U.actions.play = (ds) => { const pk = U.pkgById(ds.id); if (pk) U.play.start(pk, { saved: true }); };

  /* ---------- Свой раунд и свой пакет ---------- */
  const FORM_DEFAULT = { name: '', mode: 'teacher', mul: 8, div: 8, interval: 5, from: 6, to: 3, duration: 60, tables: [2, 3, 4, 5, 6, 7, 8, 9], voice: false, hideTime: false };
  const formFrom = (p) => Object.assign({}, FORM_DEFAULT, JSON.parse(JSON.stringify(p || {})), { tables: (p && p.tables ? p.tables.slice() : FORM_DEFAULT.tables.slice()) });
  U.actions.newPkg = () => U.go('pkgForm', {}, { form: formFrom() });
  U.actions.copyPkg = (ds) => { const pk = U.pkgById(ds.id); const f = formFrom(pk); f.name = pk.name + ' (копия)'; delete f.id; delete f.std; U.go('pkgForm', {}, { form: f }); };
  U.actions.editPkg = (ds) => { const pk = U.pkgById(ds.id); U.go('pkgForm', { id: pk.id }, { form: formFrom(pk) }); };

  const stepper = (label, key, min, max, step, unit) => {
    const v = ui.form[key];
    return `<div class="stepper"><span>${label}</span><button data-act="fstep" data-k="${key}" data-d="${-step}" data-min="${min}" data-max="${max}" aria-label="Меньше">−</button><b>${U.num(v)}${unit || ''}</b><button data-act="fstep" data-k="${key}" data-d="${step}" data-min="${min}" data-max="${max}" aria-label="Больше">+</button></div>`;
  };
  const sw = (label, key) => `<div class="switch"><span>${label}</span><button class="${ui.form[key] ? 'on' : ''}" data-act="ftoggle" data-k="${key}" aria-label="${label}"></button></div>`;

  U.screens.pkgForm = function (pr) {
    const f = ui.form, stream = !!U.STREAM_MODES[f.mode];
    const modes = Object.keys(U.MODES).filter((m) => m !== 'training')
      .map((m) => `<button class="chip${f.mode === m ? ' on' : ''}" data-act="fset" data-k="mode" data-v="${m}">${U.MODES[m].name}</button>`).join('');
    const ops = [['both', 'И то и другое'], ['m', 'Только ×'], ['d', 'Только :']].map((o) => {
      const on = o[0] === 'both' ? f.mul > 0 && f.div > 0 : o[0] === 'm' ? f.mul > 0 && !f.div : f.div > 0 && !f.mul;
      return `<button class="chip${on ? ' on' : ''}" data-act="fops" data-v="${o[0]}">${o[1]}</button>`;
    }).join('');
    const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => `<button class="chip${f.tables.indexOf(t) >= 0 ? ' on' : ''}" data-act="ftable" data-v="${t}">×${t}</button>`).join('');
    let timing = '';
    if (f.mode === 'teacher' || f.mode === 'dictation') timing = stepper('Секунд на пример', 'interval', 2, 15, 0.5);
    if (f.mode === 'limit' || f.mode === 'streak') timing = stepper('Не больше секунд на пример', 'interval', 2, 15, 0.5);
    if (f.mode === 'accel') timing = stepper('В начале, секунд', 'from', 2, 15, 0.5) + stepper('В конце, секунд', 'to', 1, 15, 0.5);
    if (f.mode === 'minute') timing = stepper('Секунд на весь раунд', 'duration', 30, 300, 15);
    return `<div class="screen scroll">${topbar(pr.id ? 'Пакет' : 'Свой раунд', { sub: U.MODES[f.mode].hint })}
      <div class="card form">
        <div class="field"><span>Режим</span><div class="choice">${modes}</div></div>
        ${stream ? `<div class="field"><span>Примеры</span><div class="choice">${ops}</div></div>`
          : stepper('Умножение, примеров', 'mul', 0, 40, 1) + stepper('Деление, примеров', 'div', 0, 40, 1)}
        ${timing}
        <div class="field"><span>Таблицы</span><div class="choice">${tables}</div></div>
        ${sw('Голос читает пример', 'voice')}
        ${sw('Скрыть время от ребёнка', 'hideTime')}
        <label class="field"><span>Название пакета</span><input class="inp" data-f="name" maxlength="28" value="${esc(f.name)}" placeholder="Например: Семёрка на скорость" autocomplete="off"></label>
        ${f.error ? `<div class="err">${f.error}</div>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-light" data-act="playForm">${ic('play')}Сыграть</button>
        <button class="btn btn-primary" data-act="savePkg">${ic('check')}Сохранить</button>
      </div>
      <p class="note-line">«Сыграть» — разовый раунд: попадёт в историю, но не в рекорды. Сохранённый пакет ведёт свои рекорды.</p>
    </div>`;
  };
  U.actions.fstep = (ds) => {
    const k = ds.k, v = Math.round((Number(ui.form[k]) + Number(ds.d)) * 10) / 10;
    ui.form[k] = Math.max(Number(ds.min), Math.min(Number(ds.max), v));
    U.refresh();
  };
  U.actions.ftoggle = (ds) => { ui.form[ds.k] = !ui.form[ds.k]; U.refresh(); };
  U.actions.ftable = (ds) => {
    const t = Number(ds.v), a = ui.form.tables, i = a.indexOf(t);
    if (i >= 0) a.splice(i, 1); else a.push(t);
    a.sort((x, y) => x - y);
    U.refresh();
  };
  U.actions.fops = (ds) => { ui.form.mul = ds.v === 'd' ? 0 : 1; ui.form.div = ds.v === 'm' ? 0 : 1; U.refresh(); };
  function formPackage() {
    const f = ui.form;
    const p = { mode: f.mode, mul: Number(f.mul), div: Number(f.div), tables: f.tables.slice(), voice: !!f.voice, hideTime: !!f.hideTime, name: String(f.name || '').trim() };
    if (f.mode === 'teacher' || f.mode === 'dictation' || f.mode === 'limit' || f.mode === 'streak') p.interval = Number(f.interval);
    if (f.mode === 'accel') { p.from = Number(f.from); p.to = Number(f.to); }
    if (f.mode === 'minute') p.duration = Number(f.duration);
    if (f.mode === 'dictation') p.voice = true;
    if (!p.tables.length) return 'Выберите хотя бы одну таблицу';
    if (!p.mul && !p.div) return 'Нужен хотя бы один пример';
    return p;
  }
  U.actions.playForm = () => {
    const p = formPackage();
    if (typeof p === 'string') { ui.form.error = p; U.refresh(); return; }
    p.id = 'once';
    p.name = p.name || 'Разовый раунд';
    U.play.start(p, { saved: false });
  };
  U.actions.savePkg = () => {
    const p = formPackage();
    if (typeof p === 'string') { ui.form.error = p; U.refresh(); return; }
    if (!p.name) { ui.form.error = 'Дайте пакету название'; U.refresh(); return; }
    const d = D();
    if (ui.params.id) {
      const old = d.packages.find((x) => x.id === ui.params.id);
      if (d.rounds.some((r) => r.pkg === old.id)) { ui.form.error = 'У пакета уже есть результаты — сохраните как копию'; U.refresh(); return; }
      Object.assign(old, p);
    } else {
      p.id = 'c' + U.store.uid();
      p.createdAt = Date.now();
      d.packages.push(p);
    }
    U.store.save();
    U.toast('Пакет «' + p.name + '» сохранён');
    U.back();
  };

  /* ---------- Карта таблицы ---------- */
  const LEVEL_NAMES = ['ещё не решали', 'бронза', 'серебро', 'золото'];
  U.screens.map = function (pr) {
    const p = U.player(), d = D(), M = d.mastery[p.id] || {}, op = pr.op || 'm';
    const R = [2, 3, 4, 5, 6, 7, 8, 9];
    let g = `<div class="h">${op === 'm' ? '×' : ':'}</div>` + R.map((c) => `<div class="h">${op === 'm' ? c : '=' + c}</div>`).join('');
    R.forEach((r) => {
      g += `<div class="h">${op === 'm' ? r : ':' + r}</div>`;
      R.forEach((c) => {
        const k = op === 'm' ? U.gen.keyM(r, c) : U.gen.keyD(r * c, r), l = (M[k] && M[k].l) || 0;
        g += `<button class="cell c${l}" data-act="cellInfo" data-k="${k}" aria-label="${U.gen.text(k)}">${r * c}</button>`;
      });
    });
    const have = d.cups[p.id] || [];
    const cups = S.cupDefs().filter((c) => c.op === op || c.id === 'all').map((c) => {
      const pr2 = S.cupProgress(d, p.id, c), won = have.indexOf(c.id) >= 0;
      return won ? `<span class="cup">${ic('trophy')}${c.name}</span>` : `<span class="cup off">${ic('trophy')}${c.id === 'all' ? 'Вся таблица' : c.short}: ${pr2.got} из ${pr2.of}</span>`;
    }).join('');
    return `<div class="screen scroll">${topbar('Карта таблицы', { right: starsPill(p) })}
      <div class="toggle"><button class="${op === 'm' ? 'on' : ''}" data-act="mapOp" data-v="m">Умножение</button><button class="${op === 'd' ? 'on' : ''}" data-act="mapOp" data-v="d">Деление</button></div>
      <div class="panel"><div class="tmap">${g}</div>${op === 'd' ? '<div class="soft" style="margin-top:8px">Строка — на что делим, столбец — ответ, в клетке — делимое.</div>' : ''}</div>
      <div class="panel"><div class="legend"><span><i></i>ещё нет</span><span><i class="c1"></i>бронза — верно</span><span><i class="c2"></i>серебро — 3 раза верно</span><span><i class="c3"></i>золото — 3 раза подряд быстро, до 3 с</span></div></div>
      <div class="cups">${cups}</div>
    </div>`;
  };
  U.actions.map = () => U.go('map', { op: 'm' });
  U.actions.mapOp = (ds) => { ui.params.op = ds.v; U.refresh(); };
  U.actions.cellInfo = (ds) => {
    const p = U.player(), c = (D().mastery[p.id] || {})[ds.k] || { l: 0, ok: 0, f: 0 }, e = U.gen.parse(ds.k);
    U.toast(U.gen.text(ds.k) + ' = ' + e.ans + ' — ' + LEVEL_NAMES[c.l] + (c.ok ? ', верно ' + c.ok + ' ' + pl(c.ok, 'раз', 'раза', 'раз') : '') + (c.f && c.l < 3 ? ', быстро подряд: ' + c.f : ''));
  };

  /* ---------- Рекорды и история ---------- */
  function familyOn() { return !!D().settings.family; }
  U.screens.records = function (pr) {
    const p = U.player(), d = D(), tab = pr.tab || 'rec';
    const toggle = `<div class="toggle"><button class="${tab === 'rec' ? 'on' : ''}" data-act="recTab" data-v="rec">Рекорды</button><button class="${tab === 'hist' ? 'on' : ''}" data-act="recTab" data-v="hist">История</button></div>`;
    let body = '';
    if (tab === 'rec') {
      const who = familyOn() ? null : p.id;
      const rows = U.allPackages().filter((pk) => pk.mode !== 'training').map((pk) => {
        const best = S.records(d, pk.id, who)[0];
        if (!best) return '';
        const owner = familyOn() ? (d.players.find((x) => x.id === best.player) || {}).name : '';
        return `<button class="lrow" data-act="recDetail" data-id="${pk.id}"><span class="medal g1">${ic('trophy')}</span>
          <span class="grow"><b>${esc(pk.name)}</b><span>${S.resultText(best)} · ${F.date(best.startedAt)}${owner ? ' · ' + esc(owner) : ''}</span></span>${ic('play')}</button>`;
      }).join('');
      body = rows ? `<div class="card rows">${rows}</div>` : '<div class="card empty">Рекордов пока нет — сыграйте первый раунд.</div>';
      if (familyOn()) body = '<div class="soft" style="color:var(--on-bg-soft)">Семейный рейтинг: лучшие результаты всех игроков</div>' + body;
    } else {
      const mine = d.rounds.filter((r) => r.player === p.id).sort((a, b) => b.startedAt - a.startedAt);
      const used = [];
      mine.forEach((r) => { const key = r.pkg || 'once'; if (used.indexOf(key) < 0) used.push(key); });
      const filter = pr.filter || 'all';
      const chips = [['all', 'Все']].concat(used.map((k) => [k, k === 'once' ? 'Разовые' : ((U.pkgById(k) || {}).name || 'Пакет удалён')]))
        .map((c) => `<button class="chip${filter === c[0] ? ' on' : ''}" data-act="histFilter" data-v="${c[0]}">${esc(c[1])}</button>`).join('');
      const list = mine.filter((r) => filter === 'all' || (r.pkg || 'once') === filter).slice(0, 200);
      const rows = list.map((r) => `<button class="lrow" data-act="roundDetail" data-id="${r.id}">
          <span class="grow"><b>${esc(r.name)}${r.record ? '<span class="badge rec">рекорд</span>' : ''}${r.paused ? '<span class="badge">пауза</span>' : ''}</b>
          <span>${F.dt(r.startedAt)} · ${S.resultText(r)}</span></span><span class="gain-s">+${r.stars || 0}${starSm()}</span></button>`).join('');
      body = `<div class="chips">${chips}</div>` + (rows ? `<div class="card rows">${rows}</div>` : '<div class="card empty">Раундов ещё не было.</div>');
    }
    return `<div class="screen scroll">${topbar(tab === 'rec' ? 'Рекорды' : 'История', { right: starsPill(p) })}${toggle}${body}</div>`;
  };
  U.actions.records = () => U.go('records', { tab: 'rec' });
  U.actions.recTab = (ds) => { ui.params.tab = ds.v; U.refresh(); };
  U.actions.histFilter = (ds) => { ui.params.filter = ds.v; U.refresh(); };
  U.actions.recDetail = (ds) => U.go('recDetail', { id: ds.id });
  U.screens.recDetail = function (pr) {
    const p = U.player(), d = D(), pk = U.pkgById(pr.id) || { name: 'Пакет' };
    const list = S.records(d, pr.id, familyOn() ? null : p.id).slice(0, 10);
    const rows = list.map((r, i) => {
      const owner = familyOn() ? ' · ' + esc((d.players.find((x) => x.id === r.player) || {}).name || '') : '';
      return `<button class="lrow" data-act="roundDetail" data-id="${r.id}"><span class="medal${i < 3 ? ' g' + (i + 1) : ''}">${i + 1}</span>
        <span class="grow"><b>${S.resultText(r)}</b><span>${F.dt(r.startedAt)}${owner}</span></span></button>`;
    }).join('');
    return `<div class="screen scroll">${topbar(esc(pk.name), { sub: pk.mode ? U.pkgDesc(pk) : '' })}
      <div class="card rows">${rows || '<div class="empty">Результатов пока нет</div>'}</div></div>`;
  };
  U.actions.roundDetail = (ds) => U.go('roundDetail', { id: ds.id });
  U.screens.roundDetail = function (pr) {
    const r = D().rounds.find((x) => x.id === pr.id);
    if (!r) return `<div class="screen">${topbar('Раунд')}<div class="card empty">Раунд удалён</div></div>`;
    const rows = r.items.map((it, i) => {
      const e = U.gen.parse(it.k), t = it.late ? 'не успел' : it.m === null || it.m === undefined ? 'без отметки' : it.t !== null && it.t !== undefined ? F.sec(it.t) : '';
      const mark = it.m === 1 ? `<span class="mk ok">${ic('check')}</span>` : it.m === 0 ? `<span class="mk bad">${ic('cross')}</span>` : '<span class="mk none">?</span>';
      return `<div class="rrow${it.m === 1 ? '' : ' miss'}"><span class="n">${i + 1}</span><span class="ex">${U.gen.text(it.k)} <span class="res">= ${e.ans}</span></span><span class="t">${t}</span>${mark}</div>`;
    }).join('');
    return `<div class="screen scroll">${topbar(esc(r.name), { sub: F.dt(r.startedAt) })}
      <div class="card"><div class="stats3"><div><b>${S.resultText(r).split(' · ')[0]}</b><span>результат</span></div><div><b>${F.time(r.durationMs)}</b><span>время</span></div><div><b>+${r.stars || 0}</b><span>звёзд</span></div></div>
        ${r.paused ? '<div class="soft center" style="margin-top:8px">Была пауза — в рекорды не идёт</div>' : ''}</div>
      <div class="review-list static">${rows}</div>
      <button class="btn btn-light" data-act="delRound" data-id="${r.id}">${ic('trash')}Удалить раунд</button>
    </div>`;
  };
  U.actions.delRound = (ds) => U.requirePin('Удаление раунда из истории', () => U.confirm('Удалить раунд?', 'Звёзды за него снимутся. Карта таблицы не меняется.', 'Удалить', () => {
    const d = D(), r = d.rounds.find((x) => x.id === ds.id);
    if (!r) return;
    const p = d.players.find((x) => x.id === r.player);
    if (p) { p.xp = Math.max(0, (p.xp || 0) - (r.stars || 0)); p.stars = Math.max(0, (p.stars || 0) - (r.stars || 0)); }
    d.rounds.splice(d.rounds.indexOf(r), 1);
    U.store.save();
    U.toast('Раунд удалён');
    U.back();
  }, { danger: true }));

  /* ---------- Графики ---------- */
  const LOWER_BETTER = { errors: 1, time: 1, avg: 1 };
  U.screens.charts = function (pr) {
    const p = U.player(), d = D();
    const pkgSel = pr.pkg || 'all', metric = pr.metric || 'pct', byDay = !!pr.byDay;
    const mine = d.rounds.filter((r) => r.player === p.id).sort((a, b) => a.startedAt - b.startedAt);
    const used = [];
    mine.forEach((r) => { if (r.pkg && used.indexOf(r.pkg) < 0) used.push(r.pkg); });
    const chips = [['all', 'Все пакеты']].concat(used.map((k) => [k, (U.pkgById(k) || {}).name || 'Пакет удалён']))
      .map((c) => `<button class="chip${pkgSel === c[0] ? ' on' : ''}" data-act="chartPkg" data-v="${c[0]}">${esc(c[1])}</button>`).join('');
    const metrics = Object.keys(U.METRICS).map((m) => `<button class="chip${metric === m ? ' on' : ''}" data-act="chartMetric" data-v="${m}">${U.METRICS[m].name}</button>`).join('');
    const rounds = mine.filter((r) => pkgSel === 'all' || r.pkg === pkgSel);
    const series = U.chartSeries(rounds, metric, byDay);
    const school = d.school.filter((s) => s.player === p.id).map((s) => ({ x: s.date, y: Math.round(s.correct / s.total * 100) }));
    const M = U.METRICS[metric], points = series[0].pts;
    let chart = '<div class="empty">Сыграйте ещё пару раундов — появится график.</div>', stats = '';
    if (points.length + (series[1] ? series[1].pts.length : 0) >= 2) {
      chart = U.chartSVG(series, { max: M.max, school, schoolY: !!M.school });
      const ys = M.total ? rounds.map(M.total).filter((y) => y !== null) : points.map((x) => x.y), lower = LOWER_BETTER[metric];
      const best = lower ? Math.min.apply(null, ys) : Math.max.apply(null, ys);
      const avg = Math.round(ys.reduce((a, b) => a + b, 0) / ys.length * 10) / 10;
      stats = `<div class="stats3"><div><b>${U.num(ys[ys.length - 1])}${M.unit}</b><span>последний</span></div><div><b>${U.num(best)}${M.unit}</b><span>лучший</span></div><div><b>${U.num(avg)}${M.unit}</b><span>в среднем</span></div></div>${M.total ? `<div class="muted center" style="margin-top:6px">${metric === 'errors' ? 'всего ошибок за раунд' : 'по всем примерам раунда'}</div>` : ''}`;
    }
    const legend = series.filter((s) => s.pts.length).map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('') +
      (school.length ? `<span><i style="background:var(--gold)"></i>школьный блиц${M.school ? '' : ' (линия)'}</span>` : '');
    return `<div class="screen scroll">${topbar('Графики', { right: starsPill(p) })}
      <div class="chips">${chips}</div>
      <div class="chips">${metrics}</div>
      <div class="card chart-card">${chart}<div class="legend chart-legend">${legend}</div></div>
      ${stats ? `<div class="card">${stats}</div>` : ''}
      <div class="toggle"><button class="${!byDay ? 'on' : ''}" data-act="chartDay" data-v="0">По раундам</button><button class="${byDay ? 'on' : ''}" data-act="chartDay" data-v="1">По дням</button></div>
    </div>`;
  };
  U.actions.charts = () => U.go('charts', { pkg: 'all', metric: 'pct' });
  U.actions.chartPkg = (ds) => { ui.params.pkg = ds.v; U.refresh(); };
  U.actions.chartMetric = (ds) => { ui.params.metric = ds.v; U.refresh(); };
  U.actions.chartDay = (ds) => { ui.params.byDay = ds.v === '1'; U.refresh(); };

  /* ---------- Призы ---------- */
  U.screens.prizes = function () {
    const p = U.player(), d = D();
    const list = d.prizes.slice().sort((a, b) => a.price - b.price).map((z) => {
      const can = (p.stars || 0) >= z.price, pct = Math.min(100, Math.round((p.stars || 0) / z.price * 100));
      return `<div class="card prize"><span class="emo">${z.emoji || '🎁'}</span>
        <div class="grow"><b>${esc(z.name)}</b><div class="muted">${z.price} ${pl(z.price, 'звезда', 'звезды', 'звёзд')}${can ? '' : ' · ещё ' + (z.price - (p.stars || 0))}</div><div class="bar"><i style="width:${pct}%"></i></div></div>
        <button class="btn btn-primary btn-sm" data-act="buyPrize" data-id="${z.id}"${can ? '' : ' disabled'}>Купить</button></div>`;
    }).join('');
    const bought = d.purchases.filter((x) => x.player === p.id).slice(0, 10).map((x) => `<div class="lrow"><span class="grow"><b>${x.emoji || '🎁'} ${esc(x.name)}</b><span>${F.dt(x.at)}</span></span><span class="gain-s">−${x.price}${starSm()}</span></div>`).join('');
    return `<div class="screen scroll">${topbar('Призы', { right: starsPill(p) })}
      ${list || `<div class="card empty">Призов пока нет. Их задаёт родитель — в разделе для родителей.<br><button class="btn btn-light btn-sm" data-act="parent" style="margin:12px auto 0">${ic('lock')}Для родителей</button></div>`}
      ${bought ? `<h2 class="sec">Уже купили</h2><div class="card rows">${bought}</div>` : ''}
    </div>`;
  };
  U.actions.prizes = () => U.go('prizes');
  U.actions.buyPrize = (ds) => {
    const d = D(), p = U.player(), z = d.prizes.find((x) => x.id === ds.id);
    if (!z || (p.stars || 0) < z.price) return;
    U.requirePin('Подтвердите покупку: ' + z.name, () => {
      p.stars -= z.price;
      d.purchases.unshift({ id: U.store.uid(), player: p.id, prize: z.id, name: z.name, emoji: z.emoji, price: z.price, at: Date.now() });
      U.store.save();
      U.sound.fanfare();
      U.toast('Приз «' + z.name + '» куплен!');
      U.refresh();
    });
  };

  /* ---------- Раздел для родителей ---------- */
  U.actions.parent = () => U.requirePin('Раздел для родителей', () => U.go('parent', {}, { form: parentForm() }));
  function parentForm() {
    const p = U.player();
    return { blitzDate: p && p.blitzDate ? p.blitzDate : '', schDate: F.iso(Date.now()), schOk: '', schTotal: '16', prizeEmoji: '🎁', prizeName: '', prizePrice: '', prizeId: null };
  }
  U.screens.parent = function () {
    const d = D(), p = U.player(), f = ui.form;
    const sec = (title, icon, body) => `<div class="card parent-sec"><h3>${ic(icon)}${title}</h3>${body}</div>`;
    let html = '';
    if (p) {
      const school = d.school.filter((s) => s.player === p.id).sort((a, b) => b.date - a.date).map((s) => `<div class="lrow"><span class="grow"><b>${s.correct} из ${s.total}</b><span>${F.date(s.date)}</span></span><button class="mini-btn danger" data-act="delSchool" data-id="${s.id}" aria-label="Удалить">${ic('trash')}</button></div>`).join('');
      html += sec('Школьный блиц: ' + esc(p.name), 'calendar', `
        <label class="field"><span>Дата ближайшего блица</span><div class="form-row"><input class="inp" type="date" data-f="blitzDate" value="${esc(f.blitzDate)}"><button class="btn btn-light btn-sm" data-act="saveBlitz">Сохранить</button>${p.blitzDate ? '<button class="btn btn-light btn-sm" data-act="clearBlitz">Убрать</button>' : ''}</div></label>
        <div class="field"><span>Результат блица в школе</span><input class="inp" type="date" data-f="schDate" value="${esc(f.schDate)}"><div class="form-row">
          <input class="inp" type="number" inputmode="numeric" min="0" max="100" data-f="schOk" value="${esc(f.schOk)}" placeholder="верно">
          <input class="inp" type="number" inputmode="numeric" min="1" max="100" data-f="schTotal" value="${esc(f.schTotal)}" placeholder="из">
          <button class="btn btn-primary btn-sm" data-act="addSchool">Добавить</button></div></div>
        ${school ? `<div class="rows">${school}</div>` : '<div class="muted">Школьных результатов пока нет — они появятся на графиках золотыми отметками.</div>'}`);
    }
    const players = d.players.map((x) => { const L = levelInfo(x.xp); return `<div class="lrow"><span class="avatar sm">${x.avatar}</span><span class="grow"><b>${esc(x.name)}</b><span>Уровень ${L.lv} · ${x.stars || 0} звёзд · ${U.THEMES[x.theme].name}</span></span>
      <button class="mini-btn" data-act="editPlayer" data-id="${x.id}" aria-label="Изменить">${ic('edit')}</button><button class="mini-btn danger" data-act="delPlayer" data-id="${x.id}" aria-label="Удалить">${ic('trash')}</button></div>`; }).join('');
    html += sec('Игроки', 'users', `<div class="rows">${players}</div><button class="btn btn-light btn-sm" data-act="addPlayer">${ic('plus')}Добавить игрока</button>`);

    const emo = PRIZE_EMOJI.map((e) => `<button class="av${f.prizeEmoji === e ? ' on' : ''}" data-act="fset" data-k="prizeEmoji" data-v="${e}">${e}</button>`).join('');
    const prizes = d.prizes.map((z) => `<div class="lrow"><span class="emo-s">${z.emoji}</span><span class="grow"><b>${esc(z.name)}</b><span>${z.price} звёзд</span></span>
      <button class="mini-btn" data-act="editPrize" data-id="${z.id}" aria-label="Изменить">${ic('edit')}</button><button class="mini-btn danger" data-act="delPrize" data-id="${z.id}" aria-label="Удалить">${ic('trash')}</button></div>`).join('');
    html += sec('Призы', 'gift', `${prizes ? `<div class="rows">${prizes}</div>` : '<div class="muted">Ориентир: один «Школьный блиц» даёт 15–25 звёзд. Маленький приз — около 100, большой — около 500.</div>'}
      <div class="field"><span>${f.prizeId ? 'Изменить приз' : 'Новый приз'}</span><div class="avatar-grid prize-emo">${emo}</div>
      <div class="form-row"><input class="inp" data-f="prizeName" maxlength="30" value="${esc(f.prizeName)}" placeholder="Например: мороженое"><input class="inp" type="number" inputmode="numeric" min="1" data-f="prizePrice" value="${esc(f.prizePrice)}" placeholder="звёзд"></div>
      <button class="btn btn-primary btn-sm" data-act="savePrize">${ic('check')}${f.prizeId ? 'Сохранить приз' : 'Добавить приз'}</button></div>`);

    const buys = d.purchases.slice(0, 15).map((x) => `<div class="lrow"><span class="grow"><b>${x.emoji || '🎁'} ${esc(x.name)}</b><span>${F.dt(x.at)} · ${esc((d.players.find((q) => q.id === x.player) || {}).name || '')}</span></span><span class="gain-s">−${x.price}</span></div>`).join('');
    if (buys) html += sec('Покупки', 'list', `<div class="rows">${buys}</div>`);

    const pk = d.packages.map((x) => { const n = d.rounds.filter((r) => r.pkg === x.id).length; return `<div class="lrow"><span class="grow"><b>${esc(x.name)}</b><span>${U.pkgDesc(x)} · ${n} ${pl(n, 'раунд', 'раунда', 'раундов')}</span></span>
      ${n ? '' : `<button class="mini-btn" data-act="editPkg" data-id="${x.id}" aria-label="Изменить">${ic('edit')}</button>`}<button class="mini-btn" data-act="copyPkg" data-id="${x.id}" aria-label="Копия">${ic('copy')}</button><button class="mini-btn danger" data-act="delPkg" data-id="${x.id}" aria-label="Удалить">${ic('trash')}</button></div>`; }).join('');
    html += sec('Свои пакеты', 'list', `${pk ? `<div class="rows">${pk}</div>` : '<div class="muted">Своих пакетов нет. Стандартные — на экране «Играть».</div>'}<button class="btn btn-light btn-sm" data-act="newPkg">${ic('plus')}Создать пакет</button>`);

    const st = d.settings;
    html += sec('Настройки', 'gear', `
      <div class="switch"><span>Звуки</span><button class="${st.sound !== false ? 'on' : ''}" data-act="toggleSet" data-k="sound" aria-label="Звуки"></button></div>
      <div class="switch"><span>Семейный рейтинг — рекорды всех игроков вместе</span><button class="${st.family ? 'on' : ''}" data-act="toggleSet" data-k="family" aria-label="Семейный рейтинг"></button></div>
      <div class="form-row"><button class="btn btn-light btn-sm" data-act="testVoice">${ic('sound')}Проверить голос</button><button class="btn btn-light btn-sm" data-act="changePin">${ic('lock')}Сменить PIN</button></div>`);

    const size = Math.round(JSON.stringify(d).length / 1024);
    html += sec('Данные', 'download', `
      <div class="muted">Всё хранится только в этом браузере: ${d.rounds.length} ${pl(d.rounds.length, 'раунд', 'раунда', 'раундов')}, ${size} КБ. Резервная копия — файл, который можно загрузить на этом или другом устройстве.${st.backupAt ? ' Последняя копия: ' + F.dt(st.backupAt) + '.' : ''}</div>
      <div class="form-row"><button class="btn btn-primary btn-sm" data-act="backup">${ic('download')}Скачать копию</button>
      <label class="btn btn-light btn-sm file-btn">${ic('upload')}Загрузить копию<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>
      <button class="link-btn danger-text" data-act="wipe">Удалить все данные</button>`);

    html += sec('Значок на экран телефона', 'phone', U.installPrompt
      ? `<button class="btn btn-light btn-sm" data-act="install">${ic('phone')}Установить значок</button>`
      : '<div class="muted">Откройте меню браузера (⋮) и выберите «Добавить на главный экран» или «Установить приложение». Тренажёр откроется без адресной строки и будет работать без интернета.</div>');

    if (d.events.length) html += sec('Журнал', 'list', `<div class="rows">${d.events.slice(0, 10).map((e) => `<div class="lrow"><span class="grow"><b>${esc(e.text)}</b><span>${F.dt(e.at)}</span></span></div>`).join('')}</div>`);

    return `<div class="screen scroll">${topbar('Для родителей', { right: `<button class="icon-btn" data-act="lockParent" aria-label="Закрыть раздел">${ic('lock')}</button>` })}${html}
      <button class="btn btn-light" data-act="lockParent">${ic('lock')}Закрыть раздел</button></div>`;
  };
  U.after.parent = function () {
    const inp = document.getElementById('importFile');
    if (!inp) return;
    inp.addEventListener('change', () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => U.confirm('Загрузить копию?', 'Все текущие данные на этом устройстве заменятся данными из файла «' + file.name + '».', 'Загрузить', () => {
        try { U.store.importText(String(reader.result)); U.toast('Копия загружена'); U.go('players', {}, { reset: true }); }
        catch (e) { U.toast('Не получилось: ' + e.message); }
      }, { danger: true });
      reader.readAsText(file);
    });
  };
  U.actions.lockParent = () => { ui.parentUntil = 0; U.back(); };
  U.actions.saveBlitz = () => { const p = U.player(); p.blitzDate = ui.form.blitzDate || null; U.store.save(); U.toast(p.blitzDate ? 'Дата блица сохранена' : 'Дата убрана'); U.refresh(); };
  U.actions.clearBlitz = () => { const p = U.player(); p.blitzDate = null; ui.form.blitzDate = ''; U.store.save(); U.refresh(); };
  U.actions.addSchool = () => {
    const f = ui.form, ok = parseInt(f.schOk, 10), total = parseInt(f.schTotal, 10);
    if (!(total > 0) || !(ok >= 0) || ok > total || !f.schDate) { U.toast('Проверьте: сколько верно и из скольких'); return; }
    D().school.push({ id: U.store.uid(), player: U.player().id, date: F.fromIso(f.schDate) + 12 * 3600000, correct: ok, total });
    f.schOk = '';
    U.store.save();
    U.toast('Школьный результат добавлен');
    U.refresh();
  };
  U.actions.delSchool = (ds) => { const d = D(); d.school = d.school.filter((s) => s.id !== ds.id); U.store.save(); U.refresh(); };
  U.actions.delPlayer = (ds) => {
    const d = D(), p = d.players.find((x) => x.id === ds.id);
    U.confirm('Удалить игрока ' + esc(p.name) + '?', 'Вместе с его историей, рекордами, картой и звёздами.', 'Удалить', () => {
      d.players = d.players.filter((x) => x.id !== p.id);
      d.rounds = d.rounds.filter((r) => r.player !== p.id);
      d.school = d.school.filter((s) => s.player !== p.id);
      delete d.mastery[p.id]; delete d.cups[p.id];
      if (d.current === p.id) d.current = d.players[0] ? d.players[0].id : null;
      U.store.save();
      if (!d.players.length) U.go('players', {}, { reset: true }); else U.refresh();
    }, { danger: true });
  };
  U.actions.savePrize = () => {
    const f = ui.form, name = String(f.prizeName || '').trim(), price = parseInt(f.prizePrice, 10), d = D();
    if (!name || !(price > 0)) { U.toast('Напишите приз и цену в звёздах'); return; }
    if (f.prizeId) Object.assign(d.prizes.find((z) => z.id === f.prizeId) || {}, { name, price, emoji: f.prizeEmoji });
    else d.prizes.push({ id: U.store.uid(), name, price, emoji: f.prizeEmoji });
    Object.assign(f, { prizeId: null, prizeName: '', prizePrice: '', prizeEmoji: '🎁' });
    U.store.save();
    U.refresh();
  };
  U.actions.editPrize = (ds) => { const z = D().prizes.find((x) => x.id === ds.id); Object.assign(ui.form, { prizeId: z.id, prizeName: z.name, prizePrice: String(z.price), prizeEmoji: z.emoji }); U.refresh(); };
  U.actions.delPrize = (ds) => U.confirm('Удалить приз?', '', 'Удалить', () => { const d = D(); d.prizes = d.prizes.filter((z) => z.id !== ds.id); U.store.save(); U.refresh(); }, { danger: true });
  U.actions.delPkg = (ds) => {
    const d = D(), pk = d.packages.find((x) => x.id === ds.id);
    U.confirm('Удалить пакет «' + esc(pk.name) + '»?', 'Сыгранные раунды останутся в истории.', 'Удалить', () => { d.packages = d.packages.filter((x) => x.id !== pk.id); U.store.save(); U.refresh(); }, { danger: true });
  };
  U.actions.toggleSet = (ds) => { const st = D().settings; st[ds.k] = ds.k === 'sound' ? st.sound === false : !st[ds.k]; U.store.save(); U.refresh(); };
  U.actions.testVoice = () => { if (!U.sound.canSpeak()) { U.toast('Этот браузер не умеет читать вслух'); return; } U.sound.speak('Семь умножить на восемь'); if (!U.sound.hasRussian()) U.toast('Русского голоса не нашлось — будет читать голос по умолчанию'); };
  U.actions.changePin = () => U.modal({ type: 'pin', mode: 'new', title: 'Новый PIN из 4 цифр', sub: 'Старый перестанет действовать', val: '', onOk: () => {} });
  U.actions.wipe = () => U.confirm('Удалить все данные?', 'Игроки, история, рекорды и призы удалятся с этого устройства. Сначала лучше скачать копию.', 'Удалить всё', () =>
    U.confirm('Точно удалить?', 'Вернуть можно только из резервной копии.', 'Да, удалить', () => { U.store.reset(); ui.parentUntil = 0; U.go('players', {}, { reset: true }); }, { danger: true }), { danger: true });
  U.actions.install = () => { if (U.installPrompt) { U.installPrompt.prompt(); U.installPrompt = null; U.refresh(); } };
})(window.U = window.U || {});
