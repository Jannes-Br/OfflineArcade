const CACHE_VERSION = 'v69';
const GAMES = ['escape-road', 'drive-mad', 'block-smasher', 'tic-tac-toe', '2048', 'pong'];

// Spezifische Unterdateien für Spiele mit tiefen Strukturen
const EXTRA_GAME_FILES = {
  'escape-road': [
    'games/escape-road/manifest.json',
    'games/escape-road/script.js',
    'games/escape-road/style.css',
    'games/escape-road/icon-512.png',
    'games/escape-road/icon.png'
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  // --- UI ELEMENTE ---
  const versionElement = document.getElementById('version');
  versionElement.textContent = CACHE_VERSION;

  const statusDot = document.getElementById('status-dot');
  const onlineStatus = document.getElementById('online-status');
  const reloadBtn = document.getElementById('reload-btn');
  const randomBtn = document.getElementById('random-btn');
  const downloadAllBtn = document.getElementById('download-all-btn');

  // --- SERVICE WORKER REGISTRIERUNG ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registriert mit Scope:', reg.scope);
        
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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
      downloadAllBtn.style.display = 'block';
    } else {
      statusDot.style.background = '#ef4444';
      statusDot.style.boxShadow = '0 0 10px #ef4444';
      onlineStatus.textContent = 'Offline';
      reloadBtn.style.display = 'none';
      downloadAllBtn.style.display = 'none';
    }
  }

  // --- CACHE-STATUS PRÜFEN ---
  async function updateGameCacheStatuses() {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      const activeCacheName = cacheNames.find(name => name.startsWith('offlinearcade'));
      if (!activeCacheName) return;

      const cache = await caches.open(activeCacheName);
      const cards = document.querySelectorAll('.game-card');
      let cachedCount = 0;

      for (const card of cards) {
        const gameName = card.getAttribute('data-game');
        const badge = card.querySelector('.offline-badge');
        const entryUrl = `games/${gameName}/index.html`;

        const response = await cache.match(entryUrl);
        if (response) {
          badge.className = 'offline-badge ready';
          badge.textContent = '✔';
          badge.title = 'Offline spielbar';
          cachedCount++;
        } else {
          badge.className = 'offline-badge not-ready';
          badge.textContent = '📥';
          badge.title = 'Noch nicht heruntergeladen';
        }
      }

      const cacheStatus = document.getElementById('cache-status');
      cacheStatus.textContent = `${cachedCount} von ${cards.length} offline spielbar`;

      if (cachedCount === cards.length) {
        downloadAllBtn.textContent = 'Alle bereit';
        downloadAllBtn.style.background = '#22c55e';
        downloadAllBtn.style.color = '#fff';
        downloadAllBtn.disabled = true;
      } else {
        downloadAllBtn.textContent = 'Alle laden';
        downloadAllBtn.style.background = '#4cc9f0';
        downloadAllBtn.style.color = '#0f172a';
        downloadAllBtn.disabled = false;
      }
    } catch (e) {
      console.warn("Fehler beim Prüfen des Caches:", e);
    }
  }

  // --- MASSEN-DOWNLOAD & UPDATE LOGIK ---
  function getGameFiles(gameName) {
    const list = [
      `games/${gameName}/index.html`,
      `assets/thumbnails/${gameName}.png`
    ];
    if (EXTRA_GAME_FILES[gameName]) {
      list.push(...EXTRA_GAME_FILES[gameName]);
    } else {
      list.push(
        `games/${gameName}/style.css`,
        `games/${gameName}/script.js`
      );
    }
    return list;
  }

  async function downloadAllGames() {
    const cacheStatus = document.getElementById('cache-status');
    const progressContainer = document.getElementById('cache-progress-container');
    const progressBar = document.getElementById('cache-progress-bar');

    downloadAllBtn.disabled = true;
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    let allUrls = [];
    GAMES.forEach(game => {
      allUrls = allUrls.concat(getGameFiles(game));
    });
    allUrls = [...new Set(allUrls)];

    const total = allUrls.length;
    let completed = 0;

    cacheStatus.textContent = `Lade: 0%`;

    const cacheNames = await caches.keys();
    const activeCacheName = cacheNames.find(name => name.startsWith('offlinearcade')) || 'offlinearcade-v68';
    const cache = await caches.open(activeCacheName);

    const queue = [...allUrls];
    const CONCURRENCY = 3;

    async function downloadWorker() {
      while (queue.length > 0) {
        const url = queue.shift();
        const badge = getBadgeForUrl(url);
        
        if (badge && !badge.classList.contains('ready')) {
          badge.className = 'offline-badge downloading';
          badge.textContent = '📥';
        }

        try {
          const response = await fetch(url);
          if (response.status === 200) {
            await cache.put(url, response);
            if (badge) {
              badge.className = 'offline-badge ready';
              badge.textContent = '✔';
              badge.title = 'Offline spielbar';
            }
          }
        } catch (err) {
          console.log(`Fehler bei: ${url}`, err);
        } finally {
          completed++;
          const percentage = (completed / total) * 100;
          progressBar.style.width = `${percentage}%`;
          cacheStatus.textContent = `Lade: ${Math.round(percentage)}%`;
        }
      }
    }

    const workers = Array(CONCURRENCY).fill(null).map(() => downloadWorker());
    await Promise.all(workers);

    await updateGameCacheStatuses();
    progressBar.style.width = '100%';
    cacheStatus.textContent = 'Spiele offline gesichert!';
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 2500);
  }

  function getBadgeForUrl(url) {
    const match = url.match(/^games\/([^\/]+)\/index\.html$/);
    if (match) {
      const gameName = match[1];
      const card = document.querySelector(`.game-card[data-game="${gameName}"]`);
      if (card) return card.querySelector('.offline-badge');
    }
    return null;
  }

  // --- LUCKY SPIN (ZUFALLS-ROULETTE) ANIMATION ---
  function startLuckySpin() {
    const cards = document.querySelectorAll('.game-card');
    if (cards.length === 0) return;

    randomBtn.disabled = true;
    randomBtn.style.opacity = '0.5';
    cards.forEach(c => c.classList.remove('highlighted'));

    let currentIndex = 0;
    let steps = 14 + Math.floor(Math.random() * 8);
    let delay = 60;

    function spin() {
      cards.forEach(c => c.classList.remove('highlighted'));
      cards[currentIndex].classList.add('highlighted');
      cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

      currentIndex = (currentIndex + 1) % cards.length;
      steps--;

      if (steps > 0) {
        if (steps < 7) {
          delay += 40;
        } else if (steps < 3) {
          delay += 90;
        }
        setTimeout(spin, delay);
      } else {
        const winnerIndex = (currentIndex - 1 + cards.length) % cards.length;
        const winnerCard = cards[winnerIndex];

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
  downloadAllBtn.addEventListener('click', downloadAllGames);

  updateOnlineStatus();
  checkInstallState();
  updateGameCacheStatuses();

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});
