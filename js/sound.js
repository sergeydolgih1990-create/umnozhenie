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
    fanfare() { if (on()) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.2, delay: i * 0.12 })); }
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
