if ('serviceWorker' in navigator) {

  navigator.serviceWorker.register(
    '/OfflineArcade/sw.js'
  )

  .then(registration => {

    const label =
      document.getElementById(
        'update-label'
      );

    const updateText =
      document.getElementById(
        'last-update'
      );

    function saveUpdateTime() {

      const now =
        new Date().toLocaleString();

      localStorage.setItem(
        'offlinearcade-last-update',
        now
      );

      label.textContent =
        'Last Update:';

      updateText.textContent =
        now;

    }

    registration.addEventListener(
      'updatefound',
      () => {

        label.textContent =
          'Status:';

        updateText.textContent =
          'Downloading...';

        const newWorker =
          registration.installing;

        newWorker.addEventListener(
          'statechange',
          () => {

            // installiert
            if (
              newWorker.state === 'installed'
            ) {

              saveUpdateTime();

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

    // Kein Update gefunden
    if (!registration.installing) {

      const saved =
        localStorage.getItem(
          'offlinearcade-last-update'
        );

      if (saved) {

        label.textContent =
          'Last Update:';

        updateText.textContent =
          saved;

      }

    }

  });

}
