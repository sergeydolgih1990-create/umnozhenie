/* Рисунки тренажёра: герои трёх тем, фоны, значки, салют. Всё вектором, без внешних файлов. */
(function (U) {
  'use strict';

  let uid = 0;
  const nid = (p) => p + (++uid);
  const svg = (vb, body, cls) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${body}</svg>`;
  const mirror = (b) => `<g transform="translate(200 0) scale(-1 1)">${b}</g>`;
  const scaled = (k, cx, cy, b) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${b}</g>`;

  // Детерминированный генератор: звёзды и конфетти одинаковые при каждой отрисовке
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function star5(cx, cy, r, fill, stroke) {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return `<path d="M${p.join('L')}Z" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2" stroke-linejoin="round"` : ''}/>`;
  }
  function sparkle(x, y, r, fill) {
    return `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
  }
  function aura(color) {
    const id = nid('aura');
    return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".85"/><stop offset=".55" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="110" r="98" fill="url(#${id})"/>`;
  }
  const sparkles = (c) => sparkle(32, 46, 9, c) + sparkle(168, 56, 11, c) + sparkle(24, 136, 6, c) + sparkle(178, 142, 7, c);

  /* ---------- Космос: ракета ---------- */
  const ROCKET = [null,
    { k: 0.62, body: '#efcd98', nose: '#d39a58', fin: '#d39a58', frame: '#b07c43', glass: '#d3f0ff', line: '#6b4823', tape: true },
    { k: 0.74, body: '#ffffff', nose: '#ff5d5d', fin: '#ff5d5d', frame: '#9aa8d6', glass: '#7fd4ff', line: '#2a2f5a' },
    { k: 0.85, body: '#f3f5ff', nose: '#ffb020', fin: '#4f7cff', frame: '#4f7cff', glass: '#7fd4ff', line: '#2a2f5a', boost: '#dfe5ff', stripe: '#4f7cff', win2: true },
    { k: 0.93, body: '#eef3ff', nose: '#8b5cf6', fin: '#8b5cf6', frame: '#ffb020', glass: '#9be8ff', line: '#2a2f5a', boost: '#e3dbff', stripe: '#ffb020', win2: true, wings: true, antenna: true },
    { k: 1, body: '#fff3c9', nose: '#ff8a1a', fin: '#ff5d5d', frame: '#ffb020', glass: '#b6f0ff', line: '#5a3200', boost: '#ffd36b', stripe: '#ff5d5d', win2: true, wings: true, antenna: true, glow: true, star: true }
  ];

  function rocket(s) {
    const c = ROCKET[s], L = c.line, big = s >= 4;
    const body = 'M100 18C126 40 132 74 128 150L72 150C68 74 74 40 100 18Z';
    const clip = nid('rb');
    let g = `<defs><clipPath id="${clip}"><path d="${body}"/></clipPath></defs>`;
    g += `<g class="h-flame"><path d="M84 160Q100 ${big ? 218 : 204} 116 160Z" fill="#ff8a3d"/><path d="M91 160Q100 ${big ? 200 : 188} 109 160Z" fill="#ffd23f"/></g>`;
    const fin = (c.wings ? '<path d="M74 98C50 112 36 140 36 170L74 150Z"' : '<path d="M74 112C60 120 52 138 50 164L74 148Z"') +
      ` fill="${c.fin}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
    g += fin + mirror(fin);
    if (c.boost) {
      const b = `<path class="h-flame" d="M56 156Q62.5 ${big ? 188 : 178} 69 156Z" fill="#ff8a3d"/>` +
        `<rect x="55" y="100" width="15" height="56" rx="7" fill="${c.boost}" stroke="${L}" stroke-width="3"/>` +
        `<path d="M55 108Q62.5 80 70 108Z" fill="${c.nose}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      g += b + mirror(b);
    }
    g += `<path d="M82 148L118 148L113 162L87 162Z" fill="#5b6178" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
    if (c.antenna) g += `<path d="M100 22V7" stroke="${L}" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="6" r="4.5" fill="#ff5d5d" stroke="${L}" stroke-width="2"/>`;
    g += `<path d="${body}" fill="${c.body}"/>`;
    g += `<g clip-path="url(#${clip})"><rect x="60" y="10" width="80" height="45" fill="${c.nose}"/><path d="M60 55H140" stroke="${L}" stroke-width="3"/>`;
    if (c.stripe) g += `<rect x="60" y="124" width="80" height="10" fill="${c.stripe}"/>`;
    if (c.tape) g += `<rect x="50" y="100" width="100" height="9" fill="#f7e6c4" transform="rotate(-16 100 104)"/><rect x="50" y="128" width="100" height="7" fill="#f7e6c4" transform="rotate(10 100 131)"/>`;
    g += `<path d="M82 64C78 90 77 116 79 144" stroke="#fff" stroke-opacity=".6" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
    g += `<path d="${body}" fill="none" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>`;
    const win = (cy, r, inner) => `<circle cx="100" cy="${cy}" r="${r + 5}" fill="${c.frame}" stroke="${L}" stroke-width="3"/>` +
      `<circle cx="100" cy="${cy}" r="${r}" fill="${c.glass}"/>` + (inner || '') +
      `<path d="M${100 - r * 0.6} ${cy - r * 0.1}A${r * 0.62} ${r * 0.62} 0 0 1 ${100 - r * 0.05} ${cy - r * 0.62}" stroke="#fff" stroke-width="${r > 8 ? 3 : 2}" fill="none" stroke-linecap="round"/>`;
    // с второй ступени в иллюминаторе появляется пилот
    const pilot = s >= 2 ? '<circle cx="100" cy="89" r="7.5" fill="#ffd9b8"/><circle cx="97.3" cy="88" r="1.4" fill="#1b1b2f"/><circle cx="102.7" cy="88" r="1.4" fill="#1b1b2f"/><path d="M97.3 91.6Q100 93.8 102.7 91.6" stroke="#1b1b2f" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="95.6" cy="90.6" r="1.2" fill="#ff9fb2"/><circle cx="104.4" cy="90.6" r="1.2" fill="#ff9fb2"/>' : '';
    g += win(86, 11, pilot);
    if (c.win2) g += win(111, 5.5);
    if (c.star) g += star5(100, 38, 9, '#ffe066', L);
    let out = c.glow ? aura('#ffd34d') + `<g class="h-twinkle">${sparkles('#fff3a6')}</g>` : '';
    // дым при «взлёте» по касанию — обычно невидим
    const sy = Math.round(128 + 76 * c.k);
    out += `<g class="h-fx h-smoke"><circle cx="86" cy="${sy - 2}" r="9"/><circle cx="114" cy="${sy}" r="8"/><circle cx="100" cy="${sy + 5}" r="11"/><circle cx="72" cy="${sy + 3}" r="6"/><circle cx="128" cy="${sy + 3}" r="6"/></g>`;
    out += `<g class="h-float">${scaled(c.k, 100, 128, g)}</g>`;
    return svg('0 0 200 220', out, 'hero st' + s);
  }

  /* ---------- Драконы: дракончик ---------- */
  const D = { body: '#4cc38a', dark: '#2a9c66', belly: '#ffe7a0', snout: '#83dcae', horn: '#fff1c4', wing: '#93e4bb', cheek: '#ff9fb2', line: '#1d5a3d', shell: '#fff4da', shellLine: '#b58a4a' };
  const DRAGON = [null,
    { k: 0.8, egg: true },
    { k: 0.86, hatch: true },
    { k: 0.9, wings: 'small' },
    { k: 0.96, wings: 'big', bigHorns: true },
    { k: 1, wings: 'big', bigHorns: true, crown: true, goldWings: true, glow: true }
  ];

  function dragonHead(cy, bigHorns) {
    const L = D.line, y = (d) => cy + d;
    let s = '';
    const horn = (bigHorns ? `<path d="M76 ${y(-20)}L62 ${y(-56)}L90 ${y(-29)}Z"` : `<path d="M78 ${y(-20)}L70 ${y(-44)}L90 ${y(-28)}Z"`) +
      ` fill="${D.horn}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
    s += horn + mirror(horn);
    s += `<ellipse cx="100" cy="${cy}" rx="34" ry="30" fill="${D.body}" stroke="${L}" stroke-width="3.5"/>`;
    s += `<ellipse cx="100" cy="${y(14)}" rx="20" ry="13" fill="${D.snout}" stroke="${L}" stroke-width="2.5"/>`;
    s += `<ellipse cx="93" cy="${y(11)}" rx="2.6" ry="2" fill="${L}"/><ellipse cx="107" cy="${y(11)}" rx="2.6" ry="2" fill="${L}"/>`;
    s += `<path d="M92 ${y(20)}Q100 ${y(26)} 108 ${y(20)}" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    const eye = `<g class="h-eye"><circle cx="85" cy="${y(-4)}" r="9" fill="#fff" stroke="${L}" stroke-width="2.5"/><circle cx="85" cy="${y(-2.5)}" r="5" fill="#1b1b2f"/><circle cx="83" cy="${y(-5)}" r="1.8" fill="#fff"/></g>`;
    s += eye + mirror(eye);
    const cheek = `<ellipse cx="73" cy="${y(9)}" rx="6" ry="4" fill="${D.cheek}" opacity=".85"/>`;
    s += cheek + mirror(cheek);
    return s;
  }
  // облачко дыма из пасти по касанию
  const puff = (x, y, fire) => fire
    ? `<g class="h-fx h-puff fire"><path d="M${x} ${y}C${x + 10} ${y - 18} ${x + 30} ${y - 22} ${x + 44} ${y - 34}C${x + 40} ${y - 20} ${x + 46} ${y - 12} ${x + 54} ${y - 8}C${x + 40} ${y - 4} ${x + 30} ${y + 6} ${x} ${y}Z" fill="#ff7a2a"/><path d="M${x + 4} ${y - 2}C${x + 14} ${y - 12} ${x + 26} ${y - 16} ${x + 36} ${y - 22}C${x + 34} ${y - 12} ${x + 38} ${y - 8} ${x + 42} ${y - 6}C${x + 30} ${y - 2} ${x + 22} ${y + 2} ${x + 4} ${y - 2}Z" fill="#ffd23f"/></g>`
    : `<g class="h-fx h-puff"><circle cx="${x}" cy="${y}" r="6"/><circle cx="${x + 12}" cy="${y - 8}" r="8"/><circle cx="${x + 26}" cy="${y - 16}" r="10"/></g>`;
  function nest(y) {
    return `<ellipse cx="100" cy="${y}" rx="74" ry="14" fill="#9c6a35"/>` +
      `<path d="M28 ${y - 6}Q100 ${y + 20} 172 ${y - 6}Q164 ${y + 20} 100 ${y + 24}Q36 ${y + 20} 28 ${y - 6}Z" fill="#c88a4a" stroke="#7a4f22" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M44 ${y + 4}L70 ${y + 12}M84 ${y + 16}L118 ${y + 12}M130 ${y + 12}L158 ${y + 2}" stroke="#7a4f22" stroke-width="2.5" stroke-linecap="round"/>`;
  }

  function dragon(s) {
    const c = DRAGON[s], L = D.line;
    if (c.egg) {
      let g = `<ellipse cx="100" cy="190" rx="74" ry="14" fill="#9c6a35"/>`;
      g += `<g class="h-wobble"><path d="M100 38C140 38 156 112 150 142C144 172 124 188 100 188C76 188 56 172 50 142C44 112 60 38 100 38Z" fill="${D.shell}" stroke="${D.shellLine}" stroke-width="3.5"/>`;
      g += `<ellipse cx="82" cy="92" rx="10" ry="8" fill="#a6e6c4"/><ellipse cx="120" cy="122" rx="13" ry="10" fill="#a6e6c4"/><ellipse cx="88" cy="152" rx="9" ry="7" fill="#a6e6c4"/><ellipse cx="122" cy="76" rx="7" ry="6" fill="#a6e6c4"/>`;
      g += `<path d="M70 84C72 68 80 58 88 52" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
      g += '<path class="h-fx h-crack" d="M84 70L95 84L88 96L101 108L94 120" stroke="#8a6a3a" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
      g += `<path d="M30 186Q100 210 170 186Q162 210 100 214Q38 210 30 186Z" fill="#c88a4a" stroke="#7a4f22" stroke-width="3" stroke-linejoin="round"/>`;
      g += `<path d="M46 196L72 204M86 208L118 204M130 204L156 194" stroke="#7a4f22" stroke-width="2.5" stroke-linecap="round"/>`;
      g += sparkle(158, 58, 9, '#ffffff') + sparkle(40, 110, 6, '#ffffff');
      return svg('0 0 200 220', scaled(c.k, 100, 200, g), 'hero st' + s);
    }
    if (c.hatch) {
      let g = nest(196);
      g += `<ellipse cx="100" cy="150" rx="32" ry="30" fill="${D.body}" stroke="${L}" stroke-width="3.5"/>`;
      g += '<g class="h-peek">' + dragonHead(100, false);
      g += `<path d="M70 76C72 50 128 50 130 76L121 68L112 78L100 67L88 78L79 68Z" fill="${D.shell}" stroke="${D.shellLine}" stroke-width="3" stroke-linejoin="round" transform="rotate(-10 100 66)"/>` + puff(116, 120) + '</g>';
      g += `<path d="M46 142C42 174 74 194 100 194C126 194 158 174 154 142L142 130L130 144L116 128L100 144L84 128L70 144L58 130Z" fill="${D.shell}" stroke="${D.shellLine}" stroke-width="3.5" stroke-linejoin="round"/>`;
      g += `<ellipse cx="80" cy="166" rx="9" ry="7" fill="#a6e6c4"/><ellipse cx="124" cy="174" rx="11" ry="8" fill="#a6e6c4"/>`;
      const paw = `<ellipse cx="74" cy="138" rx="10" ry="7" fill="${D.body}" stroke="${L}" stroke-width="3"/>`;
      g += paw + mirror(paw);
      return svg('0 0 200 220', scaled(c.k, 100, 200, g), 'hero st' + s);
    }
    let g = '<g class="h-tail">';
    g += `<path d="M128 172C158 180 174 162 170 138" stroke="${L}" stroke-width="18" fill="none" stroke-linecap="round"/>`;
    g += `<path d="M128 172C158 180 174 162 170 138" stroke="${D.body}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    g += `<path d="M160 130L184 128L172 150Z" fill="${D.dark}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/></g>`;
    const wingFill = c.goldWings ? '#ffd36b' : D.wing, veins = c.goldWings ? '#e08a00' : D.dark;
    const w = '<g class="h-wing">' + (c.wings === 'big'
      ? `<path d="M72 128C46 88 14 92 8 122C24 120 28 134 40 134C38 148 52 152 60 146C62 154 68 154 72 148Z" fill="${wingFill}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M70 130L22 112M68 136L40 134M68 142L60 146" stroke="${veins}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<path d="M72 134C54 112 36 114 32 130C42 128 46 138 54 138C54 146 64 148 72 144Z" fill="${D.wing}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M70 136L42 126M68 141L56 138" stroke="${D.dark}" stroke-width="2.5" stroke-linecap="round"/>`) + '</g>';
    g += w + mirror(w);
    g += `<g class="h-breathe"><ellipse cx="100" cy="154" rx="36" ry="32" fill="${D.body}" stroke="${L}" stroke-width="3.5"/>`;
    g += `<ellipse cx="100" cy="160" rx="22" ry="22" fill="${D.belly}"/>`;
    g += `<path d="M84 150Q100 156 116 150M81 162Q100 168 119 162M85 174Q100 179 115 174" stroke="#e5c56b" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
    const foot = `<ellipse cx="80" cy="184" rx="13" ry="8" fill="${D.body}" stroke="${L}" stroke-width="3"/><path d="M73 187v-3M80 188v-3M87 187v-3" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
    const arm = `<ellipse cx="71" cy="154" rx="9" ry="13" fill="${D.body}" stroke="${L}" stroke-width="3" transform="rotate(25 71 154)"/>`;
    g += foot + mirror(foot) + arm + mirror(arm);
    g += dragonHead(98, c.bigHorns) + puff(116, 118, c.glow);
    if (c.crown) g += `<path d="M82 72L85 50L94 62L100 44L106 62L115 50L118 72Z" fill="#ffc531" stroke="#8a5a00" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="64" r="3.5" fill="#ff5d7a"/><circle cx="88" cy="66" r="2.5" fill="#4f7cff"/><circle cx="112" cy="66" r="2.5" fill="#4f7cff"/>`;
    let out = c.glow ? aura('#ffd34d') + `<g class="h-twinkle">${sparkles('#fffbe0')}</g>` : '';
    out += `<g class="h-float-s">${scaled(c.k, 100, 192, g)}</g>`;
    return svg('0 0 200 220', out, 'hero st' + s);
  }

  /* ---------- Пираты: корабль ---------- */
  const S = { hull: '#b86b34', hullDark: '#8a4a1f', sail: '#fff7e6', mast: '#7a4a24', line: '#3d2410', rope: '#ecd9a8' };
  const SHIP = [null,
    { k: 0.82, raft: true },
    { k: 0.9, boat: true },
    { k: 0.95, masts: 2, gaff: true },
    { k: 1, masts: 2, square: true, ports: 3, roger: true, castle: true },
    { k: 1, masts: 3, square: true, ports: 4, roger: true, castle: true, gold: true, glow: true }
  ];

  function squareSail(x, y1, y2, w, band) {
    const l = x - w / 2, r = x + w / 2, ym = (y1 + y2) / 2;
    let s = `<path d="M${l} ${y1}Q${x} ${y1 - 4} ${r} ${y1}Q${r + 5} ${ym} ${r} ${y2}Q${x} ${y2 + 7} ${l} ${y2}Q${l - 5} ${ym} ${l} ${y1}Z" fill="${S.sail}" stroke="${S.line}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (band) s += `<path d="M${l - 2} ${ym + 2}Q${x} ${ym + 6} ${r + 2} ${ym + 2}" stroke="#ff5d5d" stroke-width="6" fill="none"/>`;
    s += `<path d="M${l - 5} ${y1}H${r + 5}" stroke="${S.mast}" stroke-width="4" stroke-linecap="round"/>`;
    return s;
  }

  function ship(s) {
    const c = SHIP[s], L = S.line;
    // Море — овальным пятном с мягкими краями, чтобы на фоне темы не было прямоугольника
    const sea = nid('sea');
    let out = `<defs><radialGradient id="${sea}g" gradientUnits="userSpaceOnUse" cx="100" cy="186" r="100" gradientTransform="translate(0 186) scale(1 .42) translate(0 -186)"><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${sea}"><rect width="200" height="220" fill="url(#${sea}g)"/></mask></defs>`;
    if (c.glow) out += aura('#ffe27a') + `<g class="h-twinkle">${sparkles('#ffffff')}</g>`;
    out += `<g mask="url(#${sea})"><path class="h-wave1" d="M-50 166Q-25 156 0 166T50 166T100 166T150 166T200 166T250 166V220H-50Z" fill="#8fd3f6"/></g>`;
    let g = '';
    if (c.raft) {
      // палуба из брёвен, видна чуть сверху
      for (let i = 0; i < 5; i++) g += `<rect x="${38 + i * 5}" y="${144 + i * 6}" width="118" height="10" rx="5" fill="${i % 2 ? '#b07a42' : '#c48a4e'}" stroke="${L}" stroke-width="2.5"/>`;
      g += `<path d="M62 144L68 178M132 144L138 178" stroke="${S.rope}" stroke-width="4" stroke-linecap="round"/>`;
      g += `<rect x="97" y="80" width="6" height="80" rx="3" fill="${S.mast}" stroke="${L}" stroke-width="2.5"/>`;
      g += `<path class="h-flag" d="M100 66L120 71L100 77Z" fill="#ff5d5d" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
      g += `<path d="M103 88L142 94Q147 114 140 136L103 132Z" fill="${S.sail}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      g += `<rect x="117" y="104" width="12" height="10" fill="#f2c9a0" stroke="${L}" stroke-width="2" transform="rotate(6 123 109)"/>`;
    }
    if (c.boat) {
      g += `<rect x="97" y="56" width="6" height="94" rx="3" fill="${S.mast}" stroke="${L}" stroke-width="2.5"/>`;
      g += `<path class="h-flag" d="M101 44L124 50L101 56Z" fill="#ff5d5d" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
      g += `<path d="M106 62L106 136L154 136Z" fill="${S.sail}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      g += `<path d="M94 74L94 136L60 136Z" fill="${S.sail}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
      g += `<path d="M40 138L160 138C154 164 132 178 100 178C68 178 46 164 40 138Z" fill="${S.hull}" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>`;
      g += `<path d="M46 150C70 153 130 153 154 150" stroke="${S.hullDark}" stroke-width="5" fill="none"/>`;
    }
    if (c.masts) {
      const xs = c.masts === 2 ? [76, 124] : [56, 100, 144];
      const w1 = c.masts === 2 ? 50 : 40, w2 = c.masts === 2 ? 40 : 32;
      if (c.gold) g += `<circle cx="22" cy="104" r="7" fill="#ffd34d" stroke="${L}" stroke-width="2"/>`;
      g += `<path d="M176 128L198 104" stroke="${S.mast}" stroke-width="5" stroke-linecap="round"/>`;
      xs.forEach((x, i) => {
        const top = c.masts === 3 && i === 1 ? 22 : 34;
        g += `<rect x="${x - 3}" y="${top}" width="6" height="${132 - top}" rx="3" fill="${S.mast}" stroke="${L}" stroke-width="2.5"/>`;
        if (c.gaff) {
          g += `<path d="M${x + 4} 44L${x + 38} 56L${x + 38} 120L${x + 4} 124Z" fill="${S.sail}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>`;
          g += `<path class="h-flag" d="M${x} ${top}L${x + 20} ${top + 6}L${x} ${top + 12}Z" fill="#ff5d5d" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
        } else {
          g += squareSail(x, top + 14, top + 42, w2, false);
          g += squareSail(x, top + 50, 120, w1, c.gold);
          const flagX = x + 3, isRoger = c.roger && i === (c.masts === 3 ? 1 : 0);
          if (isRoger) {
            g += `<g class="h-flag"><rect x="${flagX}" y="${top - 16}" width="26" height="16" fill="#1f1f2e" stroke="${L}" stroke-width="2"/>`;
            g += `<circle cx="${flagX + 13}" cy="${top - 10}" r="3.6" fill="#fff"/><path d="M${flagX + 7} ${top - 4}L${flagX + 19} ${top - 2}M${flagX + 19} ${top - 4}L${flagX + 7} ${top - 2}" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`;
          } else {
            g += `<path class="h-flag" d="M${flagX} ${top - 10}L${flagX + 22} ${top - 5}L${flagX} ${top}Z" fill="${c.gold ? '#ffc531' : '#ff5d5d'}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
          }
        }
      });
      if (c.castle) {
        const trim = c.gold ? '#ffc531' : '#e0a15e';
        g += `<path d="M20 108V100M30 108V100M40 108V100M50 108V100M60 108V100M18 100H62" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/>`;
        g += `<path d="M24 132L22 108L60 108L60 132Z" fill="${c.gold ? '#8a3f1c' : S.hull}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
        g += `<rect x="29" y="114" width="9" height="9" rx="2" fill="#ffe08a" stroke="${trim}" stroke-width="2"/><rect x="44" y="114" width="9" height="9" rx="2" fill="#ffe08a" stroke="${trim}" stroke-width="2"/>`;
      }
      const hull = c.gold ? '#8a3f1c' : S.hull;
      g += `<path d="M22 130L178 130C170 162 144 178 100 178C56 178 30 162 22 130Z" fill="${hull}" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>`;
      g += `<path d="M26 140C60 145 140 145 174 140" stroke="${c.gold ? '#ffc531' : S.hullDark}" stroke-width="5" fill="none"/>`;
      if (c.ports) {
        const step = 84 / (c.ports - 1);
        for (let i = 0; i < c.ports; i++) g += `<circle cx="${58 + step * i}" cy="154" r="5.5" fill="#2b1a0c" stroke="${c.gold ? '#ffc531' : '#e0a15e'}" stroke-width="2.5"/>`;
      }
    }
    out += `<g class="h-rock">${scaled(c.k, 100, 176, g)}</g>`;
    // салют конфетти и чайка по касанию — обычно невидимы
    out += c.ports
      ? '<g class="h-fx h-burst"><rect x="34" y="120" width="6" height="9" fill="#ffc531"/><rect x="22" y="132" width="6" height="9" fill="#ff5c5c"/><rect x="44" y="108" width="6" height="9" fill="#4f7cff"/><circle cx="28" cy="112" r="3.5" fill="#2fbf71"/><circle cx="14" cy="124" r="3.5" fill="#ff7ad9"/></g>'
      : '<g class="h-fx h-burst"><circle cx="30" cy="158" r="5" fill="#bfe8ff"/><circle cx="20" cy="146" r="4" fill="#8fd3f6"/><circle cx="36" cy="140" r="3.5" fill="#d9f4ff"/><circle cx="12" cy="160" r="3" fill="#8fd3f6"/><circle cx="26" cy="132" r="3" fill="#bfe8ff"/></g>';
    out += '<path class="h-fx h-gull" d="M60 40Q68 32 76 40Q84 32 92 40" stroke="#2f5d80" stroke-width="3" fill="none" stroke-linecap="round"/>';
    out += `<g mask="url(#${sea})"><g class="h-wave2"><path d="M-50 178Q-25 170 0 178T50 178T100 178T150 178T200 178T250 178V220H-50Z" fill="#3aa6e6"/>`;
    out += `<path d="M30 190Q40 186 50 190M88 196Q98 192 108 196M144 190Q154 186 164 190" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g></g>`;
    return svg('0 0 200 220', out, 'hero st' + s);
  }

  U.art = U.art || {};
  U.art.hero = function (theme, stage) {
    stage = Math.max(1, Math.min(5, stage | 0));
    if (theme === 'dragon') return dragon(stage);
    if (theme === 'pirate') return ship(stage);
    return rocket(stage);
  };

  /* ---------- Фоны тем: слои, которые не растягивают рисунки на широком экране ---------- */
  function starsPattern() {
    const r = rng(7), id = nid('st');
    let p = '';
    for (let i = 0; i < 26; i++) p += `<circle cx="${(r() * 260).toFixed(1)}" cy="${(r() * 260).toFixed(1)}" r="${(0.6 + r() * 1.5).toFixed(2)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
    p += sparkle(60, 200, 5, '#fff7c2') + sparkle(210, 70, 4, '#c9f1ff');
    return `<svg class="bg-fill" width="100%" height="100%" aria-hidden="true"><defs><pattern id="${id}" width="260" height="260" patternUnits="userSpaceOnUse">${p}</pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
  }
  const cloud = (cls, fill) => svg('0 0 140 60', `<path d="M20 50C6 50 4 32 18 30C18 16 36 10 46 20C52 6 78 4 86 20C98 12 116 18 114 32C130 32 134 50 118 50Z" fill="${fill}"/>`, cls);

  const BG = {
    space: () => starsPattern() +
      svg('0 0 300 300', `<ellipse cx="150" cy="150" rx="146" ry="34" fill="none" stroke="#a594ff" stroke-width="10" opacity=".55" transform="rotate(-18 150 150)"/><circle cx="150" cy="150" r="104" fill="#5b3fd0"/><circle cx="118" cy="112" r="20" fill="#4a32b0"/><circle cx="182" cy="172" r="28" fill="#4a32b0"/><circle cx="140" cy="196" r="12" fill="#4a32b0"/><path d="M60 110A104 104 0 0 1 120 52" stroke="#8f7bff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/><path d="M4 150A146 34 0 0 0 296 150" fill="none" stroke="#c2b6ff" stroke-width="10" opacity=".7" transform="rotate(-18 150 150)"/>`, 'bg-planet-big') +
      svg('0 0 60 60', `<circle cx="30" cy="30" r="24" fill="#ff9ec7"/><path d="M8 24C20 28 40 28 52 22M10 38C22 42 40 40 52 36" stroke="#ff7ab0" stroke-width="5" fill="none" stroke-linecap="round"/>`, 'bg-planet-small') +
      svg('0 0 120 50', `<path d="M8 44L104 10" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>` + sparkle(106, 9, 7, '#fff7c2'), 'bg-comet'),
    dragon: () =>
      svg('0 0 160 160', `<circle cx="80" cy="80" r="76" fill="#fff3d1" opacity=".55"/><circle cx="80" cy="80" r="54" fill="#fff6dc"/>`, 'bg-sun') +
      cloud('bg-cloud1', '#ffffff') + cloud('bg-cloud2', '#fff8ef') +
      `<svg class="bg-hills" viewBox="0 0 390 260" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70C70 30 140 40 210 74C270 104 330 60 390 50V260H0Z" fill="#a8e2b6"/><path d="M0 130C80 96 150 104 220 138C290 170 340 120 390 116V260H0Z" fill="#74cc98"/><path d="M0 190C90 160 190 170 270 196C320 212 360 200 390 190V260H0Z" fill="#4fb57f"/></svg>`,
    pirate: () =>
      svg('0 0 100 100', `<circle cx="50" cy="50" r="46" fill="#fff6c4" opacity=".6"/><circle cx="50" cy="50" r="32" fill="#ffe680"/>`, 'bg-sun') +
      cloud('bg-cloud1', '#ffffff') + cloud('bg-cloud2', '#f2fbff') +
      svg('0 0 80 30', `<path d="M4 16Q12 6 20 16Q28 6 36 16M46 10Q52 2 58 10Q64 2 70 10" stroke="#2f5d80" stroke-width="3" fill="none" stroke-linecap="round"/>`, 'bg-gulls') +
      `<svg class="bg-sea" viewBox="0 0 390 260" preserveAspectRatio="none" aria-hidden="true"><path d="M0 24Q48 8 97 24T195 24T292 24T390 24V260H0Z" fill="#39a9e8"/><path d="M0 70Q48 54 97 70T195 70T292 70T390 70V260H0Z" fill="#2b8fd2"/><path d="M0 130Q48 114 97 130T195 130T292 130T390 130V260H0Z" fill="#1f76b8"/><path d="M30 46Q46 40 62 46M200 90Q216 84 232 90M300 150Q316 144 332 150M90 170Q106 164 122 170" stroke="#d8f2ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/></svg>`
  };
  U.art.bg = (theme) => (BG[theme] || BG.space)() + U.art.motes();

  /* ---------- Цель дорожки героя в раунде ---------- */
  const GOALS = {
    space: '<circle cx="16" cy="16" r="10" fill="#ff9ec7"/><path d="M7 13C12 15 20 15 25 12M7 19C12 21 20 21 25 18" stroke="#ff7ab0" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="16" rx="15" ry="4" fill="none" stroke="#ffd6e8" stroke-width="2" transform="rotate(-18 16 16)"/>',
    dragon: '<path d="M5 28V12L9 9L13 12V8H19V12L23 9L27 12V28Z" fill="#c9a0d8" stroke="#6b4a7a" stroke-width="1.8" stroke-linejoin="round"/><rect x="13.5" y="18" width="5" height="10" rx="2.5" fill="#6b4a7a"/><path d="M16 8V2L22 4L16 6" fill="#ff5d5d"/>',
    pirate: '<ellipse cx="16" cy="25" rx="14" ry="5" fill="#ffe0a3"/><path d="M15 24C14 17 17 11 21 7" stroke="#8a5a2b" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M21 7C15 5 10 7 8 11C13 9 17 9 21 7ZM21 7C24 3 29 3 31 5C27 5 24 6 21 7ZM21 7C26 7 29 10 30 14C26 11 23 9 21 7Z" fill="#3fbf6f"/><rect x="5" y="19" width="7" height="5" rx="1" fill="#b86b34" stroke="#5a3a00" stroke-width="1.2"/>'
  };
  U.art.goal = (theme) => svg('0 0 32 32', GOALS[theme] || GOALS.space, 'goal-ic');

  // Тучка с дождиком — когда раунд не удался
  U.art.rainCloud = () => svg('0 0 120 90', '<g class="rain">' +
    [24, 44, 64, 84, 34, 74].map((x, i) => `<path class="drop" style="animation-delay:${(i * 0.23).toFixed(2)}s" d="M${x} 52Q${x - 3} 60 ${x} 64Q${x + 3} 60 ${x} 52Z" fill="#7fb6e6"/>`).join('') +
    '</g><path d="M22 50C8 50 6 32 20 30C20 16 38 10 48 20C54 6 80 4 88 20C100 12 118 18 116 32C130 34 128 50 114 50Z" fill="#c8d0e0" stroke="#9aa6bd" stroke-width="2.5"/>' +
    '<path d="M48 36Q52 33 56 36M70 36Q74 33 78 36M54 44Q63 40 72 44" stroke="#6b7690" stroke-width="2.5" fill="none" stroke-linecap="round"/>', 'rain-cloud');

  // Падающее конфетти для победы: html-полоски с переменными положения, цвета и задержки
  U.art.confettiFall = function (n) {
    const r = rng(77), colors = ['#ffc531', '#2fbf71', '#ff5c5c', '#4f7cff', '#ff7ad9', '#8b5cf6', '#ffffff', '#14b8a6'];
    let s = '';
    for (let i = 0; i < (n || 46); i++) {
      s += `<i style="--x:${(r() * 100).toFixed(1)}%;--d:${(r() * 1.6).toFixed(2)}s;--s:${(2.4 + r() * 1.8).toFixed(2)}s;--r:${Math.floor(r() * 180)}deg;--c:${colors[Math.floor(r() * colors.length)]};--w:${(6 + r() * 6).toFixed(1)}px"></i>`;
    }
    return `<div class="confetti-fall" aria-hidden="true">${s}</div>`;
  };
  // Всплывающие частицы фона: звёздочки, пыльца, пузырьки — по теме
  U.art.motes = function () {
    const r = rng(5);
    let s = '';
    for (let i = 0; i < 9; i++) s += `<span style="--x:${(4 + r() * 92).toFixed(1)}%;--d:${(11 + r() * 9).toFixed(1)}s;--dl:-${(r() * 18).toFixed(1)}s;--z:${(4 + r() * 5).toFixed(1)}px"></span>`;
    return `<div class="bg-motes" aria-hidden="true">${s}</div>`;
  };

  // Салют победы: вспышки по всему экрану и своё у каждой темы —
  // ракета пролетает, у дракона поднимаются искры, у пиратов сыплются монеты
  U.art.winFx = function (theme) {
    const pal = { space: ['#ffd34d', '#ff7ad9', '#4fd1ff', '#b6a8ff', '#7cf0b0'], dragon: ['#ff8a3d', '#ffd23f', '#ff5d7a', '#8b5cf6', '#2fbf71'], pirate: ['#ffc531', '#2fbf71', '#ff5c5c', '#4f7cff', '#ffffff'] }[theme] || ['#ffc531', '#ff7ad9', '#4fd1ff', '#2fbf71', '#8b5cf6'];
    const burst = (cx, cy, rad, col) => {
      let b = '';
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * 2 * i / 14, c = (k) => (cx + Math.cos(a) * rad * k).toFixed(1) + ' ' + (cy + Math.sin(a) * rad * k).toFixed(1);
        b += `<path d="M${c(0.32)}L${c(0.9)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><circle cx="${(cx + Math.cos(a) * rad).toFixed(1)}" cy="${(cy + Math.sin(a) * rad).toFixed(1)}" r="3.6" fill="${col}"/>`;
      }
      return b;
    };
    const spots = [[70, 92, 48], [322, 74, 42], [300, 236, 32], [52, 258, 30], [196, 44, 36]];
    let s = spots.map((q, i) => `<g class="fw" style="--d:${(i * 0.42).toFixed(2)}s">${burst(q[0], q[1], q[2], pal[i % pal.length])}</g>`).join('');
    const r = rng(11);
    if (theme === 'space') {
      s += '<g class="fly"><path d="M0 -22C9 -14 11 0 10 16H-10C-11 0 -9 -14 0 -22Z" fill="#fff" stroke="#2a2f5a" stroke-width="2.5"/><circle cy="-2" r="4.5" fill="#7fd4ff" stroke="#2a2f5a" stroke-width="2"/><path d="M-10 6L-17 18L-10 16ZM10 6L17 18L10 16Z" fill="#ff5d5d" stroke="#2a2f5a" stroke-width="2" stroke-linejoin="round"/><path d="M-6 17Q0 40 6 17Z" fill="#ffb020"/><path d="M0 44V120" stroke="#fff" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" opacity=".8"/></g>';
    } else if (theme === 'dragon') {
      for (let i = 0; i < 10; i++) {
        const x = (20 + r() * 350).toFixed(0), y = (430 + r() * 100).toFixed(0);
        s += `<g class="rise" style="--d:${(r() * 2).toFixed(2)}s">${sparkle(+x, +y, 7 + r() * 7, pal[i % pal.length])}</g>`;
      }
    } else if (theme === 'pirate') {
      for (let i = 0; i < 14; i++) {
        const x = (14 + r() * 362).toFixed(0);
        s += `<g class="coin" style="--d:${(r() * 2.2).toFixed(2)}s;--s:${(2.4 + r() * 1.6).toFixed(2)}s"><circle cx="${x}" cy="0" r="10" fill="#ffc531" stroke="#b47f00" stroke-width="2.5"/><circle cx="${x}" cy="0" r="5.5" fill="none" stroke="#fff3b0" stroke-width="2"/></g>`;
      }
    }
    return `<svg class="win-fx" viewBox="0 0 390 560" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${s}</svg>`;
  };

  /* ---------- Значки 24×24 ---------- */
  const ICONS = {
    check: '<path d="M5 12.5L10 17.5L19 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
    cross: '<path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    star: star5(12, 12.6, 10.5, 'currentColor'),
    map: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="currentColor" opacity=".55"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill="currentColor" opacity=".55"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" fill="currentColor"/>',
    trophy: '<path d="M7 4H17V9A5 5 0 0 1 7 9Z" fill="currentColor"/><path d="M7 6H4.5A3 3 0 0 0 7.5 11M17 6H19.5A3 3 0 0 1 16.5 11M12 14V18M8 20.5H16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    chart: '<path d="M3.5 17L9 11L13 14.5L20.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 20.5H20.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="20.5" cy="6.5" r="2" fill="currentColor"/>',
    gift: '<rect x="4" y="10" width="16" height="10.5" rx="2" fill="currentColor"/><rect x="2.8" y="6.8" width="18.4" height="4" rx="1.5" fill="currentColor"/><path d="M12 6.8V20.5" stroke="#fff" stroke-width="2"/><path d="M12 6.8C10 3 6 3.5 7 6.3M12 6.8C14 3 18 3.5 17 6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8A4 4 0 0 1 16 8V10.5" fill="none" stroke="currentColor" stroke-width="2.4"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.6" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.6" fill="currentColor"/>',
    play: '<path d="M8 5.2V18.8L19 12Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    home: '<path d="M4 11L12 4.5L20 11V20H14.5V14.5H9.5V20H4Z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    replay: '<path d="M19 12A7 7 0 1 1 16.5 6.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M17.5 2.5V7.5H12.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 9V13L14.8 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M9.5 2.8H14.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    flame: '<path d="M12 2.8C13 6.5 17.5 8.5 17.5 14A5.5 5.5 0 0 1 6.5 14C6.5 11 8.2 9.5 9 8C9.3 10 10.3 11 11.2 11.4C11 8 11.4 5.2 12 2.8Z" fill="currentColor"/>',
    list: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.5" cy="6.5" r="1.6" fill="currentColor"/><circle cx="4.5" cy="12" r="1.6" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1.6" fill="currentColor"/>',
    sound: '<path d="M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4Z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M15.5 9A4 4 0 0 1 15.5 15M18 6.5A7.5 7.5 0 0 1 18 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    back: '<path d="M14.5 5L7.5 12L14.5 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13.5 2.5L5 13.5H11L10 21.5L19 10H13Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    gauge: '<path d="M4 17A8 8 0 1 1 20 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M12 15L16.5 9.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="15" r="2" fill="currentColor"/>',
    hourglass: '<path d="M6.5 3.5H17.5M6.5 20.5H17.5M7.5 3.5C7.5 9 12 9.5 12 12C12 14.5 7.5 15 7.5 20.5M16.5 3.5C16.5 9 12 9.5 12 12C12 14.5 16.5 15 16.5 20.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 18.5C10 16.5 14 16.5 14.5 18.5Z" fill="currentColor"/>',
    target: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    plus: '<path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    edit: '<path d="M4 20L5 15.5L15.5 5L19 8.5L8.5 19Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M13.5 7L17 10.5" stroke="currentColor" stroke-width="2.2"/>',
    trash: '<path d="M4.5 6.5H19.5M9.5 6.5V4H14.5V6.5M6.5 6.5L7.5 20H16.5L17.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 10.5V16M14 10.5V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5V14.5A1.5 1.5 0 0 0 5.5 16H8" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    download: '<path d="M12 4V15M7 10.5L12 15.5L17 10.5M5 20H19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    upload: '<path d="M12 16V5M7 9.5L12 4.5L17 9.5M5 20H19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.8V5.5M12 18.5V21.2M2.8 12H5.5M18.5 12H21.2M5.5 5.5L7.4 7.4M16.6 16.6L18.5 18.5M5.5 18.5L7.4 16.6M16.6 7.4L18.5 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    users: '<circle cx="9" cy="8.5" r="3.5" fill="currentColor"/><path d="M2.5 20C3 15.5 6 14 9 14C12 14 15 15.5 15.5 20Z" fill="currentColor"/><circle cx="17" cy="9.5" r="2.6" fill="currentColor" opacity=".6"/><path d="M15.8 14.2C18.8 14 21 15.8 21.5 19.5H17Z" fill="currentColor" opacity=".6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3.5 10H20.5M8 3V7M16 3V7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10.5 18.5H13.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    question: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9.5 9.5A2.6 2.6 0 1 1 12 12.6V14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="currentColor"/>'
  };
  U.art.icon = (name) => svg('0 0 24 24', ICONS[name] || '', 'ic');
  U.art.star = (cls) => svg('0 0 24 24', star5(12, 12.6, 10.5, '#ffc531', '#d99a00'), cls || 'ic');
  U.art.starAt = (x, y, r) => star5(x, y, r, '#ffc531', '#b47f00');

  /* ---------- Салют для нового рекорда ---------- */
  U.art.confetti = function () {
    const r = rng(42), colors = ['#ffc531', '#2fbf71', '#ff5c5c', '#4f7cff', '#ff7ad9', '#8b5cf6', '#ffffff'];
    let s = '';
    const burst = (cx, cy, rad, col) => {
      let b = '';
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * 2 * i / 12, x1 = cx + Math.cos(a) * rad * 0.35, y1 = cy + Math.sin(a) * rad * 0.35, x2 = cx + Math.cos(a) * rad, y2 = cy + Math.sin(a) * rad;
        b += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3.5" fill="${col}"/>`;
      }
      return b;
    };
    s += burst(56, 70, 44, '#ffc531') + burst(334, 64, 38, '#ff7ad9') + burst(352, 190, 24, '#4fd1ff') + burst(30, 230, 22, '#2fbf71');
    for (let i = 0; i < 40; i++) {
      // ниже шапки конфетти только по краям, чтобы не лезть на цифры результата
      const y = r() * 520, side = r();
      const x = y < 120 ? r() * 390 : (side < 0.5 ? r() * 64 : 326 + r() * 64);
      const c = colors[Math.floor(r() * colors.length)], rot = Math.floor(r() * 180);
      s += r() < 0.6
        ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(6 + r() * 6).toFixed(1)}" height="${(10 + r() * 8).toFixed(1)}" rx="2" fill="${c}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
        : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + r() * 3).toFixed(1)}" fill="${c}"/>`;
    }
    return `<svg class="confetti" viewBox="0 0 390 560" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${s}</svg>`;
  };
})(window.U = window.U || {});
