const CACHE_VERSION = 'v27';

document.addEventListener('DOMContentLoaded', () => {

  // VERSION
  document.getElementById('version')
    .textContent = CACHE_VERSION;

  // ONLINE / OFFLINE
  const statusDot =
    document.getElementById('status-dot');

  function updateOnlineStatus() {

    if (navigator.onLine) {

      statusDot.style.background =
        '#22c55e';

      statusDot.style.boxShadow =
        '0 0 10px #22c55e';

    } else {

      statusDot.style.background =
        '#ef4444';

      statusDot.style.boxShadow =
        '0 0 10px #ef4444';

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

});
