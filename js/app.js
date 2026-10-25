/* Запуск тренажёра */
(function (U) {
  'use strict';

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); U.installPrompt = e; });

  function boot() {
    const q = new URLSearchParams(location.search);
    if (q.has('demo')) {
      U.store.useMemory(U.demoData());
      U.ui.parentUntil = Infinity;
      if (q.get('player')) U.store.data.current = q.get('player');
    } else U.store.load();
    U.store.persist();
    U.uiInit();

    const d = U.store.data;
    if (!U.player() && d.players.length === 1) d.current = d.players[0].id;
    U.ui.screen = U.player() ? 'home' : 'players';
    history.replaceState({}, '');
    U.render();
    if (!U.store.available) U.toast('Браузер не даёт сохранять данные — история не запомнится');

    // Для снимков экранов: ?demo&screen=charts или ?demo&play=school&upto=5&stage=review
    if (q.has('demo')) {
      if (q.get('input') && U.player()) U.player().input = q.get('input');
      const sc = q.get('screen');
      const act = { pkgForm: 'newPkg', playerForm: 'addPlayer', parent: 'parent' }[sc];
      if (act) U.actions[act]({});
      else if (sc) U.go(sc, Object.fromEntries(q.entries()));
      if (q.get('play')) U.play.simulate(q.get('play'), Number(q.get('upto') || 0), q.get('stage'));
      if (q.get('exam')) U.play.simulate(null, Number(q.get('upto') || 0), q.get('stage'), q.get('exam'));
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      // Новая версия тренажёра встала — перезагрузиться, но не посреди раунда
      const hadController = !!navigator.serviceWorker.controller;
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading || U.ui.screen === 'round' || U.ui.screen === 'review') return;
        reloading = true;
        location.reload();
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window.U = window.U || {});
