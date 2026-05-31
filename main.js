const CACHE_VERSION = 'v74';
const GAMES = ['escape-road', 'drive-mad', 'block-smasher', 'tic-tac-toe', '2048', 'pong'];

document.addEventListener('DOMContentLoaded', () => {
  // --- UI ELEMENTE ---
  const versionElement = document.getElementById('version');
  versionElement.textContent = CACHE_VERSION;

  const statusDot = document.getElementById('status-dot');
  const onlineStatus = document.getElementById('online-status');
  const reloadBtn = document.getElementById('reload-btn');
  const randomBtn = document.getElementById('random-btn');
  const themeBtn = document.getElementById('theme-btn');

  // --- SERVICE WORKER REGISTRIERUNG ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registriert mit Scope:', reg.scope);
        
        // Prüfung auf Updates beim Start und während der Ausführung
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Ein neues SW-Update ist installiert und wartet. Zeige Reload-Button an.
              reloadBtn.classList.add('pulse');
              reloadBtn.title = 'Update verfügbar! Aktualisieren...';
            }
          });
        });
      })
      .catch(err => console.log('Service Worker Registrierung fehlgeschlagen:', err));
  }

  // --- ONLINE / OFFLINE STATUS ANZEIGE ---
  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusDot.style.background = '#22c55e';
      statusDot.style.boxShadow = '0 0 10px #22c55e';
      onlineStatus.textContent = 'Online';
      reloadBtn.style.display = 'flex';
    } else {
      statusDot.style.background = '#ef4444';
      statusDot.style.boxShadow = '0 0 10px #ef4444';
      onlineStatus.textContent = 'Offline';
      reloadBtn.style.display = 'none';
    }
  }

  // --- PERSISTENTER THEME UMSCHALTER (LIGHT / DARK MODE) ---
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeBtn.textContent = '🌙'; // Mond-Symbol zeigen, um zum Dark Mode zu wechseln
  } else {
    document.body.classList.add('dark-mode');
    themeBtn.textContent = '☀️'; // Sonnen-Symbol zeigen, um zum Light Mode zu wechseln
  }

  themeBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      themeBtn.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      themeBtn.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }
  });

  // --- LUCKY SPIN (ZUFALLS-ROULETTE) ANIMATION ---
  function startLuckySpin() {
    const cards = document.querySelectorAll('.game-card');
    if (cards.length === 0) return;

    randomBtn.disabled = true;
    randomBtn.style.opacity = '0.5';

    // Bestehende Highlights entfernen
    cards.forEach(c => c.classList.remove('highlighted'));

    let currentIndex = 0;
    let steps = 14 + Math.floor(Math.random() * 8); // Anzahl Schritte der Drehung
    let delay = 60; // Startgeschwindigkeit in ms

    function spin() {
      cards.forEach(c => c.classList.remove('highlighted'));
      cards[currentIndex].classList.add('highlighted');

      // Scrollt die Kachel sanft in Sicht
      cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

      currentIndex = (currentIndex + 1) % cards.length;
      steps--;

      if (steps > 0) {
        // Bremseffekt am Ende
        if (steps < 7) {
          delay += 40;
        } else if (steps < 3) {
          delay += 90;
        }
        setTimeout(spin, delay);
      } else {
        // Gewähltes Spiel steht fest
        const winnerIndex = (currentIndex - 1 + cards.length) % cards.length;
        const winnerCard = cards[winnerIndex];

        // Sieger-Blinkeffekt
        let blinks = 4;
        function blink() {
          if (blinks % 2 === 0) {
            winnerCard.classList.remove('highlighted');
          } else {
            winnerCard.classList.add('highlighted');
          }
          blinks--;
          if (blinks > 0) {
            setTimeout(blink, 150);
          } else {
            winnerCard.classList.add('highlighted');
            // Weiterleitung nach kurzem Moment
            setTimeout(() => {
              randomBtn.disabled = false;
              randomBtn.style.opacity = '1';
              winnerCard.classList.remove('highlighted');
              window.location.href = winnerCard.getAttribute('href');
            }, 900);
          }
        }
        blink();
      }
    }
    spin();
  }

  // --- SMART INSTALL DIALOG (A2HS) ---
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installInfo = document.getElementById('install-info');
    const installText = document.getElementById('install-text');

    installInfo.style.display = 'block';
    installText.innerHTML = `
      OfflineArcade als App auf dem Startbildschirm installieren:<br>
      <button id="install-app-btn" style="
        margin-top: 8px;
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 12px;
        font-weight: 700;
        border-radius: 10px;
        cursor: pointer;
        font-size: 11px;
        width: 100%;
        transition: transform 0.1s;
      ">Jetzt installieren</button>
    `;

    document.getElementById('install-app-btn').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            installInfo.style.display = 'none';
          }
          deferredPrompt = null;
        });
      }
    });
  });

  function checkInstallState() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isIOSStandalone = window.navigator.standalone === true;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = isIOSStandalone || isStandaloneMode;

    const installInfo = document.getElementById('install-info');
    const installText = document.getElementById('install-text');

    if (isInstalled) {
      installInfo.style.display = 'none';
    } else {
      installInfo.style.display = 'block';
      if (isIOS) {
        installText.innerHTML = `
          Tippe auf das Teilen-Symbol <span style="font-size: 15px;">⎙</span> in Safari und wähle <strong>"Zum Home-Bildschirm"</strong> für vollen Offline-Support.
        `;
      } else {
        installText.innerHTML = `
          Füge die App zum Startbildschirm hinzu, um alle Spiele auch ohne Internet zu spielen.
        `;
      }
    }
  }

  // --- EVENT LISTENERS ---
  reloadBtn.addEventListener('click', () => {
    window.location.reload();
  });

  randomBtn.addEventListener('click', startLuckySpin);

  // Statusprüfungen beim Start
  updateOnlineStatus();
  checkInstallState();

  // Listener für Online/Offline-Statuswechsel
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});
