const CACHE_VERSION = 'v71';
const GAMES = [
  { id: 'escape-road',  href: 'games/escape-road/index.html',  label: 'Escape Road'  },
  { id: 'drive-mad',    href: 'games/drive-mad/index.html',    label: 'Drive Mad'    },
  { id: 'block-smasher',href: 'games/block-smasher/index.html',label: 'Block Smasher'},
  { id: 'tic-tac-toe',  href: 'games/tic-tac-toe/index.html',  label: 'Tic Tac Toe'  },
  { id: '2048',         href: 'games/2048/index.html',         label: '2048'         },
  { id: 'pong',         href: 'games/pong/index.html',         label: 'Pong'         }
];

// Wartezeit pro Spiel in Millisekunden (12 Sekunden, damit komplexe Spiele vollständig laden)
const LOAD_TIME_PER_GAME_MS = 12000;

document.addEventListener('DOMContentLoaded', () => {

  const versionElement   = document.getElementById('version');
  const statusDot        = document.getElementById('status-dot');
  const onlineStatus     = document.getElementById('online-status');
  const reloadBtn        = document.getElementById('reload-btn');
  const randomBtn        = document.getElementById('random-btn');
  const downloadAllBtn   = document.getElementById('download-all-btn');
  const cacheStatus      = document.getElementById('cache-status');
  const progressContainer= document.getElementById('cache-progress-container');
  const progressBar      = document.getElementById('cache-progress-bar');

  versionElement.textContent = CACHE_VERSION;

  // --- SERVICE WORKER REGISTRIERUNG ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker aktiv, Scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              reloadBtn.classList.add('pulse');
              reloadBtn.title = 'Update verfügbar!';
            }
          });
        });
      })
      .catch(err => console.warn('SW Registrierung fehlgeschlagen:', err));
  }

  // --- ONLINE / OFFLINE STATUS ---
  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusDot.style.background  = '#22c55e';
      statusDot.style.boxShadow   = '0 0 10px #22c55e';
      onlineStatus.textContent    = 'Online';
      reloadBtn.style.display     = 'flex';
      downloadAllBtn.style.display = 'block';
    } else {
      statusDot.style.background  = '#ef4444';
      statusDot.style.boxShadow   = '0 0 10px #ef4444';
      onlineStatus.textContent    = 'Offline';
      reloadBtn.style.display     = 'none';
      downloadAllBtn.style.display = 'none';
    }
  }

  // --- CACHE STATUS PRO KARTE PRÜFEN ---
  async function updateGameCacheStatuses() {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      const activeCacheName = cacheNames.find(n => n.startsWith('offlinearcade'));
      if (!activeCacheName) {
        cacheStatus.textContent = '0 von ' + GAMES.length + ' offline spielbar';
        return;
      }

      const cache = await caches.open(activeCacheName);
      let cachedCount = 0;

      for (const game of GAMES) {
        const badge = document.querySelector(`.game-card[data-game="${game.id}"] .offline-badge`);
        if (!badge) continue;

        const response = await cache.match(game.href);
        if (response) {
          badge.className   = 'offline-badge ready';
          badge.textContent = '✔';
          badge.title       = 'Offline spielbar';
          cachedCount++;
        } else {
          badge.className   = 'offline-badge not-ready';
          badge.textContent = '📥';
          badge.title       = 'Noch nicht geladen';
        }
      }

      cacheStatus.textContent = `${cachedCount} von ${GAMES.length} offline spielbar`;

      if (cachedCount === GAMES.length) {
        downloadAllBtn.textContent       = '✔ Alle bereit';
        downloadAllBtn.style.background  = '#22c55e';
        downloadAllBtn.style.color       = '#fff';
        downloadAllBtn.disabled          = true;
      } else {
        downloadAllBtn.textContent       = 'Alle laden';
        downloadAllBtn.style.background  = '#4cc9f0';
        downloadAllBtn.style.color       = '#0f172a';
        downloadAllBtn.disabled          = false;
      }
    } catch (e) {
      console.warn('Cache-Prüfung fehlgeschlagen:', e);
    }
  }

  // --- ECHTES IFRAME-PRELOADING ---
  // Öffnet jedes Spiel in einem unsichtbaren iframe, wartet bis alles geladen ist,
  // dann cached der Service Worker automatisch alle Requests des Spiels.
  function preloadGameViaIframe(game) {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        border: none;
      `;

      // Badge während des Ladens animieren
      const badge = document.querySelector(`.game-card[data-game="${game.id}"] .offline-badge`);
      if (badge) {
        badge.className   = 'offline-badge downloading';
        badge.textContent = '⟳';
        badge.title       = 'Wird geladen...';
      }

      document.body.appendChild(iframe);
      iframe.src = game.href;

      // Warte LOAD_TIME_PER_GAME_MS ms — damit auch verzögert geladene Ressourcen gespeichert werden
      const timer = setTimeout(() => {
        // Iframe sauber entfernen
        try { document.body.removeChild(iframe); } catch(e) {}

        // Badge aktualisieren
        if (badge) {
          badge.className   = 'offline-badge ready';
          badge.textContent = '✔';
          badge.title       = 'Offline spielbar';
        }

        resolve();
      }, LOAD_TIME_PER_GAME_MS);

      // Falls das iframe schnell fertig ist, trotzdem warten damit Assets wirklich gecacht sind
      iframe.addEventListener('error', () => {
        clearTimeout(timer);
        try { document.body.removeChild(iframe); } catch(e) {}
        if (badge) {
          badge.className   = 'offline-badge not-ready';
          badge.textContent = '⚠';
          badge.title       = 'Fehler beim Laden';
        }
        resolve(); // Trotzdem weitermachen
      });
    });
  }

  // --- DOWNLOAD ALL: Lädt Spiele nacheinander per iframe ---
  async function downloadAllGames() {
    if (!navigator.onLine) {
      cacheStatus.textContent = 'Kein Internet verfügbar!';
      return;
    }

    // Nur Spiele herunterladen, die noch nicht im Cache sind
    const cacheNames = await caches.keys();
    const activeCacheName = cacheNames.find(n => n.startsWith('offlinearcade'));
    const cache = activeCacheName ? await caches.open(activeCacheName) : null;

    const gamesToLoad = [];
    for (const game of GAMES) {
      const cached = cache ? await cache.match(game.href) : null;
      if (!cached) {
        gamesToLoad.push(game);
      }
    }

    if (gamesToLoad.length === 0) {
      cacheStatus.textContent = '✔ Alle Spiele bereits geladen!';
      return;
    }

    downloadAllBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    const totalTime = gamesToLoad.length * LOAD_TIME_PER_GAME_MS;
    const totalGames = gamesToLoad.length;
    let loaded = 0;

    for (const game of gamesToLoad) {
      cacheStatus.textContent = `Lade "${game.label}"… (${loaded + 1}/${totalGames})`;

      await preloadGameViaIframe(game);

      loaded++;
      const pct = (loaded / totalGames) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Abschlussstatus
    await updateGameCacheStatuses();
    cacheStatus.textContent = '✔ Alle Spiele offline gesichert!';
    progressBar.style.width = '100%';

    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 3000);
  }

  // --- LUCKY SPIN (ROULETTE) ---
  function startLuckySpin() {
    const cards = document.querySelectorAll('.game-card');
    if (cards.length === 0) return;

    randomBtn.disabled        = true;
    randomBtn.style.opacity   = '0.5';
    cards.forEach(c => c.classList.remove('highlighted'));

    let currentIndex = 0;
    let steps        = 14 + Math.floor(Math.random() * 8);
    let delay        = 60;

    function spin() {
      cards.forEach(c => c.classList.remove('highlighted'));
      cards[currentIndex].classList.add('highlighted');
      cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      currentIndex = (currentIndex + 1) % cards.length;
      steps--;

      if (steps > 0) {
        if (steps < 7) delay += 40;
        if (steps < 3) delay += 90;
        setTimeout(spin, delay);
      } else {
        const winnerIndex = (currentIndex - 1 + cards.length) % cards.length;
        const winnerCard  = cards[winnerIndex];
        let blinks = 4;

        function blink() {
          if (blinks % 2 === 0) winnerCard.classList.remove('highlighted');
          else winnerCard.classList.add('highlighted');
          blinks--;
          if (blinks > 0) {
            setTimeout(blink, 150);
          } else {
            winnerCard.classList.add('highlighted');
            setTimeout(() => {
              randomBtn.disabled      = false;
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

  // --- SMART INSTALL DIALOG ---
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const installInfo = document.getElementById('install-info');
    const installText = document.getElementById('install-text');
    installInfo.style.display = 'block';
    installText.innerHTML = `
      OfflineArcade installieren:<br>
      <button id="install-app-btn" style="
        margin-top:8px; background:#22c55e; color:white; border:none;
        padding:8px 12px; font-weight:700; border-radius:10px;
        cursor:pointer; font-size:11px; width:100%;
      ">Jetzt installieren</button>
    `;
    document.getElementById('install-app-btn').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choice => {
          if (choice.outcome === 'accepted') installInfo.style.display = 'none';
          deferredPrompt = null;
        });
      }
    });
  });

  function checkInstallState() {
    const isIOS          = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isIOSStandalone= window.navigator.standalone === true;
    const isStandalone   = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled    = isIOSStandalone || isStandalone;
    const installInfo    = document.getElementById('install-info');
    const installText    = document.getElementById('install-text');

    if (isInstalled) {
      installInfo.style.display = 'none';
    } else {
      installInfo.style.display = 'block';
      if (isIOS) {
        installText.innerHTML = `
          Tippe auf <span style="font-size:15px">⎙</span> in Safari
          und wähle <strong>„Zum Home-Bildschirm"</strong>.
        `;
      } else {
        installText.innerHTML = `
          Füge die App zum Startbildschirm hinzu, um offline spielen zu können.
        `;
      }
    }
  }

  // --- EVENT LISTENERS ---
  reloadBtn.addEventListener('click',      () => window.location.reload());
  randomBtn.addEventListener('click',      startLuckySpin);
  downloadAllBtn.addEventListener('click', downloadAllGames);

  // Beim Start
  updateOnlineStatus();
  checkInstallState();
  updateGameCacheStatuses();

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});
