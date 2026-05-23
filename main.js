const CACHE_VERSION = 'v18';

document.addEventListener('DOMContentLoaded', () => {

  // Version anzeigen
  document.getElementById('version').textContent = CACHE_VERSION;

  // Letztes Update
  const lastUpdate =
    localStorage.getItem('offlinearcade-last-update');

  const updateElement =
    document.getElementById('last-update');

  if (lastUpdate) {

    updateElement.textContent = lastUpdate;

  } else {

    const now = new Date();

    const formatted =
      now.toLocaleDateString() +
      ' ' +
      now.toLocaleTimeString();

    localStorage.setItem(
      'offlinearcade-last-update',
      formatted
    );

    updateElement.textContent = formatted;

  }

  // Service Worker
  if ('serviceWorker' in navigator) {

    navigator.serviceWorker.register(
      '/OfflineArcade/sw.js'
    )

    .then(registration => {

      registration.addEventListener(
        'updatefound',
        () => {

          const newWorker =
            registration.installing;

          newWorker.addEventListener(
            'statechange',
            () => {

              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {

                const now = new Date();

                const formatted =
                  now.toLocaleDateString() +
                  ' ' +
                  now.toLocaleTimeString();

                localStorage.setItem(
                  'offlinearcade-last-update',
                  formatted
                );

                newWorker.postMessage({
                  type: 'SKIP_WAITING'
                });

              }

            }
          );

        }
      );

    });

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {

        window.location.reload();

      }
    );

  }

});
