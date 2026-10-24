/* Демонстрационные данные (адрес с ?demo): три игрока и история за три недели. Ничего не сохраняют. */
(function (U) {
  'use strict';

  U.demoData = function () {
    let seed = 20261024;
    const rnd = function () {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const now = Date.now(), DAY = 86400000;
    const iso = (ts) => U.fmt.iso(ts);
    const d = {
      v: 1, current: 'p1', packages: [], rounds: [], mastery: {}, cups: {}, events: [], purchases: [],
      players: [
        { id: 'p1', name: 'Саша', avatar: '🦊', theme: 'space', xp: 0, stars: 0, quests: [], blitzDate: iso(now + 2 * DAY) },
        { id: 'p2', name: 'Женя', avatar: '🐼', theme: 'dragon', xp: 0, stars: 0, quests: [] },
        { id: 'p3', name: 'Валя', avatar: '🐯', theme: 'pirate', xp: 0, stars: 0, quests: [] }
      ],
      prizes: [
        { id: 'z1', emoji: '🎮', name: 'Полчаса игры', price: 60 },
        { id: 'z2', emoji: '🍦', name: 'Мороженое', price: 100 },
        { id: 'z3', emoji: '🎬', name: 'Поход в кино', price: 500 }
      ],
      school: [
        { id: 's1', player: 'p1', date: now - 15 * DAY, correct: 11, total: 16 },
        { id: 's2', player: 'p1', date: now - 8 * DAY, correct: 13, total: 16 },
        { id: 's3', player: 'p1', date: now - 1 * DAY, correct: 15, total: 16 }
      ],
      settings: { pin: null, sound: true, family: false, backupAt: 0, backupRounds: 0 }
    };
    const plan = ['school', 'fast', 'mulonly', 'school', 'divonly', 'limit', 'minute', 'school', 'streak', 'big', 'accel', 'training', 'school', 'fast'];
    const counts = { p1: 30, p2: 12, p3: 48 };
    d.players.forEach((p) => {
      const n = counts[p.id];
      for (let i = 0; i < n; i++) {
        const pkg = U.STD_PACKAGES.find((x) => x.id === plan[i % plan.length]);
        const when = now - 21 * DAY + Math.round((i + 0.5) / n * 20 * DAY) + Math.round(rnd() * 3600000);
        const skill = 0.68 + 0.27 * i / n, speed = 3400 - 1600 * i / n;
        let keys;
        if (pkg.mode === 'training') { keys = U.score.weakList(d, p.id, 16); if (!keys.length) continue; }
        else if (pkg.mode === 'minute') { const nx = U.gen.stream(pkg, rnd); keys = []; for (let j = 0; j < 18 + Math.round(i / 3); j++) keys.push(nx()); }
        else if (pkg.mode === 'streak') { const nx = U.gen.stream(pkg, rnd); keys = []; for (let j = 0; j < 30; j++) keys.push(nx()); }
        else keys = U.gen.round(pkg, rnd);
        let at = 0, stop = false;
        const items = [];
        keys.forEach((k) => {
          if (stop) return;
          const m = rnd() < skill ? 1 : 0, t = Math.round(speed * (0.5 + rnd()) * (k[0] === 'd' ? 1.2 : 1));
          const lim = U.FIXED_MODES[pkg.mode] ? pkg.interval * 1000 - 200 : pkg.mode === 'limit' || pkg.mode === 'streak' ? pkg.interval * 1000 : 99999;
          const tt = Math.min(t, lim);
          at += U.FIXED_MODES[pkg.mode] ? pkg.interval * 1000 : tt;
          items.push({ k, m, t: pkg.mode === 'dictation' ? null : tt, at: U.FIXED_MODES[pkg.mode] ? at - pkg.interval * 1000 + tt : at });
          if (pkg.mode === 'streak' && m === 0) stop = true;
        });
        const round = { id: p.id + 'r' + i, player: p.id, pkg: pkg.id, name: pkg.name, mode: pkg.mode, cfg: U.pkgSnapshot(pkg), startedAt: when,
          durationMs: pkg.mode === 'minute' ? 60000 : at, paused: false, items };
        U.score.commit(d, p, round, when);
      }
    });
    d.purchases.push({ id: 'b1', player: 'p1', prize: 'z1', name: 'Полчаса игры', emoji: '🎮', price: 60, at: now - 4 * DAY });
    d.players[0].stars -= 60;
    d.settings.backupRounds = d.rounds.length - 4;
    return d;
  };
})(window.U = window.U || {});
