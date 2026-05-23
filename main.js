const CACHE_VERSION = 'v23';

document.addEventListener('DOMContentLoaded', () => {

  // VERSION
  document.getElementById('version')
    .textContent = CACHE_VERSION;

  // UPDATE TEXT
  const lastUpdateElement =
    document.getElementById(
      'last-update'
    );

  // LAST UPDATE LADEN
  let savedUpdate =
    localStorage.getItem(
      'offlinearcade-last-update'
    );

  if (!savedUpdate) {

    savedUpdate =
      new Date().toLocaleString();

    localStorage.setItem(
      'offlinearcade-last-update',
      savedUpdate
    );

  }

  lastUpdateElement.textContent =
    'Last Update: ' + savedUpdate;

  // ONLINE STATUS
  const statusDot =
    document.getElementById(
      'status-dot'
    );

  const onlineStatus =
    document.getElementById(
      'online-status'
    );

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

          // Nur bei echter neuer Version
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

                  localStorage.setItem(
                    'offlinearcade-last-update',
                    now
                  );

                  lastUpdateElement.textContent =
                    'Last Update: ' + now;

                  newWorker.postMessage({
                    type: 'SKIP_WAITING'
                  });

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

        window.location.reload();

      }
    );

  }

});
