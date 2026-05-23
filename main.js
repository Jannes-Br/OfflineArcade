const CACHE_VERSION = 'v26';

document.addEventListener('DOMContentLoaded', () => {

  // VERSION
  document.getElementById('version')
    .textContent = CACHE_VERSION;

  // ELEMENTE
  const lastUpdateElement =
    document.getElementById(
      'last-update'
    );

  const statusDot =
    document.getElementById(
      'status-dot'
    );

  const onlineStatus =
    document.getElementById(
      'online-status'
    );

  // UPDATE TEXT ANZEIGEN
  function loadLastUpdate() {

    const saved =
      localStorage.getItem(
        'offlinearcade-last-update'
      );

    if (saved) {

      lastUpdateElement.textContent =
        'Last Update: ' + saved;

    } else {

      lastUpdateElement.textContent =
        'No Updates Yet';

    }

  }

  loadLastUpdate();

  // ONLINE STATUS
  function updateOnlineStatus() {

    if (navigator.onLine) {

      statusDot.style.background =
        '#22c55e';

      statusDot.style.boxShadow =
        '0 0 10px #22c55e';

      onlineStatus.textContent =
        'Online';

    } else {

      statusDot.style.background =
        '#ef4444';

      statusDot.style.boxShadow =
        '0 0 10px #ef4444';

      onlineStatus.textContent =
        'Offline';

    }

  }

  updateOnlineStatus();

  window.addEventListener(
    'online',
    updateOnlineStatus
  );

  window.addEventListener(
    'offline',
    updateOnlineStatus
  );

  // SERVICE WORKER
  if ('serviceWorker' in navigator) {

    navigator.serviceWorker.register(
      '/OfflineArcade/sw.js'
    )

    .then(registration => {

      registration.update();

      registration.addEventListener(
        'updatefound',
        () => {

          const newWorker =
            registration.installing;

          // Nur wenn echte alte Version existiert
          if (
            navigator.serviceWorker.controller
          ) {

            lastUpdateElement.textContent =
              'Downloading...';

          }

          newWorker.addEventListener(
            'statechange',
            () => {

              if (
                newWorker.state === 'installed'
              ) {

                if (
                  navigator.serviceWorker.controller
                ) {

                  const now =
                    new Date().toLocaleString();

                  // SPEICHERN
                  localStorage.setItem(
                    'offlinearcade-last-update',
                    now
                  );

                  // DIREKT anzeigen
                  lastUpdateElement.textContent =
                    'Last Update: ' + now;

                  // Warten damit Safari speichert
                  setTimeout(() => {

                    newWorker.postMessage({
                      type: 'SKIP_WAITING'
                    });

                  }, 1000);

                }

              }

            }
          );

        }
      );

    });

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {

        // Nach Reload nochmal laden
        setTimeout(() => {

          window.location.reload();

        }, 300);

      }
    );

  }

});
