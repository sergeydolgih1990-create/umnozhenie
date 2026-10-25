/* Звуки сигналов и голос телефона */
(function (U) {
  'use strict';

  let ctx = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const on = () => !U.store || U.store.data.settings.sound !== false;

  function tone(freq, dur, opts) {
    const a = audio();
    if (!a) return;
    const o = opts || {}, t0 = a.currentTime + (o.delay || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const S = {
    unlock() { audio(); },                                   // браузер разрешает звук только после нажатия
    next() { if (on()) tone(880, 0.13, { vol: 0.22 }); },    // новый пример
    count() { if (on()) tone(620, 0.12, { vol: 0.2 }); },
    go() { if (on()) tone(990, 0.22, { vol: 0.25 }); },
    ok() { if (on()) { tone(660, 0.09, { vol: 0.16 }); tone(990, 0.12, { vol: 0.16, delay: 0.08 }); } },
    bad() { if (on()) tone(240, 0.18, { type: 'triangle', vol: 0.2 }); },
    fanfare() { if (on()) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.2, delay: i * 0.12 })); },
    combo() { if (on()) [784, 988, 1319].forEach((f, i) => tone(f, 0.1, { vol: 0.15, delay: i * 0.06 })); },     // «Серия ×5!»
    sad() { if (on()) { tone(392, 0.22, { type: 'triangle', vol: 0.18 }); tone(330, 0.22, { type: 'triangle', vol: 0.18, delay: 0.22 }); tone(262, 0.45, { type: 'triangle', vol: 0.18, delay: 0.44, to: 233 }); } },
    // Касание героя: ракета взлетает, яйцо стучит, дракон рычит, корабль гудит и стреляет
    tap(theme, stage) {
      if (!on()) return;
      if (theme === 'dragon' && stage <= 2) { tone(520, 0.07, { vol: 0.2 }); tone(520, 0.07, { vol: 0.2, delay: 0.14 }); return; }
      if (theme === 'dragon') { tone(190, 0.28, { type: 'triangle', vol: 0.22, to: 120 }); tone(700, 0.12, { vol: 0.12, delay: 0.3 }); return; }
      if (theme === 'pirate') { tone(392, 0.16, { vol: 0.18 }); tone(523, 0.3, { vol: 0.18, delay: 0.15 }); tone(130, 0.16, { type: 'triangle', vol: 0.22, delay: 0.45, to: 60 }); return; }
      tone(260, 0.5, { type: 'triangle', vol: 0.18, to: 1040 });
    }
  };

  /* ---------- Голос ---------- */
  const synth = window.speechSynthesis || null;
  let ruVoice = null;
  function pickVoice() {
    if (!synth) return;
    const voices = synth.getVoices() || [];
    ruVoice = voices.find((v) => /^ru/i.test(v.lang) && /google/i.test(v.name)) || voices.find((v) => /^ru/i.test(v.lang)) || null;
  }
  if (synth) { pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); }

  S.canSpeak = () => !!synth;
  S.hasRussian = () => !!ruVoice;
  S.speak = function (text) {
    if (!synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      if (ruVoice) u.voice = ruVoice;
      u.rate = 1.05;
      synth.speak(u);
    } catch (e) { /* голос недоступен */ }
  };
  S.silence = () => { if (synth) synth.cancel(); };

  U.sound = S;
})(window.U = window.U || {});
