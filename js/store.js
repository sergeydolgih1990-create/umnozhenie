/* Хранилище: всё лежит в памяти браузера этого устройства, резервная копия — файлом */
(function (U) {
  'use strict';

  const KEY = 'umnozhenie.v1';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function blank() {
    return {
      v: 1, players: [], current: null, packages: [], rounds: [], mastery: {}, cups: {},
      prizes: [], purchases: [], school: [], events: [],
      settings: { pin: null, sound: true, family: false, backupAt: 0, backupRounds: 0 }
    };
  }
  function normalize(d) {
    const b = blank(), out = Object.assign(b, d || {});
    out.settings = Object.assign(blank().settings, (d && d.settings) || {});
    return out;
  }

  let data = blank(), memoryOnly = false, available = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      data = normalize(raw ? JSON.parse(raw) : null);
    } catch (e) {
      available = false;
      data = blank();
    }
    return data;
  }
  function save() {
    if (memoryOnly) return true;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      available = false;
      if (U.toast) U.toast('Не получилось сохранить: память браузера закрыта или переполнена. Сделайте резервную копию.');
      return false;
    }
  }
  // Демонстрационные данные для снимков экранов: живут только в памяти
  function useMemory(d) { memoryOnly = true; data = normalize(d); }

  function exportFile() {
    const stamp = new Date();
    const name = 'umnozhenie-kopiya-' + stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0') + '.json';
    const blob = new Blob([JSON.stringify({ app: 'umnozhenie', v: 1, exportedAt: stamp.getTime(), data })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    data.settings.backupAt = stamp.getTime();
    data.settings.backupRounds = data.rounds.length;
    save();
    return name;
  }
  function importText(text) {
    const obj = JSON.parse(text);
    if (!obj || obj.app !== 'umnozhenie' || !obj.data || !Array.isArray(obj.data.rounds)) throw new Error('Это не резервная копия тренажёра');
    data = normalize(obj.data);
    data.settings.backupRounds = data.rounds.length;
    save();
    return data;
  }
  function reset() { data = blank(); save(); }
  function logEvent(text) { data.events.unshift({ at: Date.now(), text }); data.events = data.events.slice(0, 50); }

  // Попросить браузер не стирать данные при нехватке места
  function persist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* не важно */ } }

  U.store = {
    uid, load, save, useMemory, exportFile, importText, reset, logEvent, persist,
    get data() { return data; },
    get available() { return available; },
    get memoryOnly() { return memoryOnly; }
  };
})(window.U = window.U || {});
