const CACHE_VERSION = 'v67';

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

  const reloadBtn =
    document.getElementById(
      'reload-btn'
    );

  // INSTALL INFO
  const installInfo =
    document.getElementById(
      'install-info'
    );

  function updateOnlineStatus() {

    if (navigator.onLine) {

      statusDot.style.background =
        '#22c55e';

      statusDot.style.boxShadow =
        '0 0 10px #22c55e';

      onlineStatus.textContent =
        'Online';

      reloadBtn.style.display =
        'flex';

    } else {

      statusDot.style.background =
        '#ef4444';

      statusDot.style.boxShadow =
        '0 0 10px #ef4444';

      onlineStatus.textContent =
        'Offline';

      reloadBtn.style.display =
        'none';

    }

  }

  function checkInstallState() {

    const isIOSStandalone =
      window.navigator.standalone === true;

    const isStandaloneMode =
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches;

    const isInstalled =
      isIOSStandalone || isStandaloneMode;

    if (isInstalled) {

      installInfo.style.display =
        'none';

    } else {

      installInfo.style.display =
        'block';

    }

  }

  reloadBtn.addEventListener(
    'click',
    () => {

      window.location.reload();

    }
  );

  // Beim Start prüfen
  updateOnlineStatus();

  checkInstallState();

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
