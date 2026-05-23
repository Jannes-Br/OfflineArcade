const CACHE_VERSION = 'v19';

document.addEventListener('DOMContentLoaded', () => {

  // Version
  document.getElementById('version')
    .textContent = CACHE_VERSION;

  // Last update
  const lastUpdateElement =
    document.getElementById('last-update');

  let savedUpdate =
    localStorage.getItem('offlinearcade-last-update');

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

  // Online status
  const statusDot =
    document.getElementById('status-dot');

  const onlineStatus =
    document.getElementById('online-status');

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

  // Service Worker
  if ('serviceWorker' in navigator) {

    navigator.serviceWorker.register(
      '/OfflineArcade/sw.js'
    )

    .then(registration => {

      const progress =
        document.getElementById(
          'update-progress'
        );

      progress.textContent = 'Checking...';

      registration.update();

      registration.addEventListener(
        'updatefound',
        () => {

          const newWorker =
            registration.installing;

          let fakeProgress = 0;

          const interval = setInterval(() => {

            fakeProgress += 10;

            if (fakeProgress > 90) {
              fakeProgress = 90;
            }

            progress.textContent =
              fakeProgress + '%';

          }, 300);

          newWorker.addEventListener(
            'statechange',
            () => {

              if (
                newWorker.state === 'installed'
              ) {

                clearInterval(interval);

                progress.textContent =
                  '100%';

                const now =
                  new Date().toLocaleString();

                localStorage.setItem(
                  'offlinearcade-last-update',
                  now
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
