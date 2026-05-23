const CACHE_VERSION = 'v20';

document.addEventListener('DOMContentLoaded', () => {

  // VERSION
  document.getElementById('version')
    .textContent = CACHE_VERSION;

  // UPDATE ELEMENTE
  const updateLabel =
    document.getElementById(
      'update-label'
    );

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
    savedUpdate;

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

      // Nach Updates suchen
      registration.update();

      registration.addEventListener(
        'updatefound',
        () => {

          updateLabel.textContent =
            'Status:';

          lastUpdateElement.textContent =
            'Downloading...';

          const newWorker =
            registration.installing;

          newWorker.addEventListener(
            'statechange',
            () => {

              // Update fertig
              if (
                newWorker.state === 'installed'
              ) {

                const now =
                  new Date().toLocaleString();

                localStorage.setItem(
                  'offlinearcade-last-update',
                  now
                );

                updateLabel.textContent =
                  'Last Update:';

                lastUpdateElement.textContent =
                  now;

                // Neue Version aktivieren
                if (
                  navigator.serviceWorker.controller
                ) {

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

    // Seite nach Update neu laden
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {

        window.location.reload();

      }
    );

  }

});
