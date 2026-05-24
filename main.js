const CACHE_VERSION = 'v46';

document.addEventListener('DOMContentLoaded', () => {

  // VERSION
  const versionElement =
    document.getElementById(
      'version'
    );

  versionElement.textContent =
    CACHE_VERSION;

  // ONLINE / OFFLINE
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

  // Beim Start prüfen
  updateOnlineStatus();

  // Änderungen erkennen
  window.addEventListener(
    'online',
    updateOnlineStatus
  );

  window.addEventListener(
    'offline',
    updateOnlineStatus
  );

});
