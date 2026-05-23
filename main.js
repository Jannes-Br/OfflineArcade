const VERSION = '1.0.0';

document.addEventListener('DOMContentLoaded', () => {

  // Versionsanzeige
  const versionElement = document.getElementById('version');

  if (versionElement) {
    versionElement.textContent = VERSION;
  }

  // Letztes Update anzeigen
  const lastUpdateElement = document.getElementById('last-update');

  const savedUpdate = localStorage.getItem('offlinearcade-last-update');

  if (lastUpdateElement) {

    if (savedUpdate) {
      lastUpdateElement.textContent = savedUpdate;
    } else {
      lastUpdateElement.textContent = 'Erster Start';
    }

  }

  // Service Worker
  if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {

      navigator.serviceWorker.register('/OfflineArcade/sw.js')

        .then(registration => {

          console.log('Service Worker registriert');

          // Automatische Updates
          registration.addEventListener('updatefound', () => {

            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {

              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {

                newWorker.postMessage({
                  type: 'SKIP_WAITING'
                });

              }

            });

          });

          if (registration.waiting) {

            registration.waiting.postMessage({
              type: 'SKIP_WAITING'
            });

          }

        });

    });

    // Nach Update neu laden
    let refreshing = false;

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {

        if (refreshing) return;

        refreshing = true;

        const now = new Date();

        localStorage.setItem(
          'offlinearcade-last-update',
          now.toLocaleString()
        );

        window.location.reload();

      }
    );

  }

});
