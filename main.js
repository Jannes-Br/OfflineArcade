/* ============================================================
   OfflineArcade – main.js  (complete rewrite with QR P2P, Pre-Caching & English)
   ============================================================ */

const CACHE_VERSION = 'v91';
const MULTIPLAYER_GAMES = ['tic-tac-toe', '2048', 'pong'];

/* ── Random name generator ── */
function randomName() {
  const adj  = ['Cool','Swift','Brave','Wild','Neon','Dark','Epic','Turbo','Ultra','Hyper','Mega','Star'];
  const noun = ['Fox','Wolf','Hawk','Panda','Tiger','Eagle','Ninja','Rocket','Pixel','Storm','Blaze','Ghost'];
  const num  = Math.floor(Math.random() * 90) + 10;
  return adj[Math.floor(Math.random()*adj.length)] + noun[Math.floor(Math.random()*noun.length)] + num;
}

/* ── Toast helper ── */
let toastTimer = null;
function showToast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ── State ── */
let currentMode    = localStorage.getItem('gameMode') || 'solo';
let playerName     = localStorage.getItem('playerName') || '';
let playerAvatar   = localStorage.getItem('playerAvatar') || '😎';
let unreadChat     = 0;
let chatHistory    = {};

/* ── QR Scanner state ── */
let activeStream = null;
let activeScanInterval = null;

function stopCameraScanner() {
  if (activeScanInterval) {
    clearInterval(activeScanInterval);
    activeScanInterval = null;
  }
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
  
  const hostScannerView = document.getElementById('hostScannerView');
  const guestScannerView = document.getElementById('guestScannerView');
  if (hostScannerView) hostScannerView.style.display = 'none';
  
  const hostVideo = document.getElementById('hostVideo');
  const guestVideo = document.getElementById('guestVideo');
  if (hostVideo) hostVideo.srcObject = null;
  if (guestVideo) guestVideo.srcObject = null;
}

async function startCameraScanner(videoEl, callback) {
  stopCameraScanner();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" } 
    });
    activeStream = stream;
    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", true);
    videoEl.muted = true;
    
    // Explicitly play video to support all platforms (especially Safari/iOS)
    videoEl.play().catch(err => console.warn("Video play started automatically or failed:", err));
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    activeScanInterval = setInterval(() => {
      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        // Downscale scanner image to a maximum of 480px width/height for high performance on mobile devices
        let width = videoEl.videoWidth;
        let height = videoEl.videoHeight;
        const maxDim = 480;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(videoEl, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        try {
          const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: "attemptBoth"
          });
          if (decoded && decoded.data) {
            const scannedText = decoded.data.trim();
            if (scannedText) {
              stopCameraScanner();
              callback(scannedText);
            }
          }
        } catch (e) {
          console.warn("jsQR decoding error:", e);
        }
      }
    }, 250);
  } catch (err) {
    console.error("Camera access failed:", err);
    showToast("Camera access failed. Please use Text Code fallback.");
    stopCameraScanner();
    
    const hostToggleTextBtn = document.getElementById('hostToggleTextBtn');
    const guestToggleTextBtn = document.getElementById('guestToggleTextBtn');
    if (videoEl.id === 'hostVideo' && hostToggleTextBtn) hostToggleTextBtn.click();
    if (videoEl.id === 'guestVideo' && guestToggleTextBtn) guestToggleTextBtn.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── Element refs ── */
  const versionEl         = document.getElementById('version');
  const statusDot         = document.getElementById('status-dot');
  const onlineStatusEl    = document.getElementById('online-status');
  const reloadBtn         = document.getElementById('reload-btn');
  const randomBtn         = document.getElementById('random-btn');
  const settingsBtn       = document.getElementById('settings-btn');
  const nameDisplay       = document.getElementById('playerNameDisplay');
  const modeTabs          = document.querySelectorAll('.mode-tab');
  const gameCards         = document.querySelectorAll('.game-card');
  const lobbyPanel        = document.getElementById('lobbyPanel');
  const lobbyActions      = document.getElementById('lobbyActions');
  const lobbyConnectedActions = document.getElementById('lobbyConnectedActions');
  const lobbyDisconnectBtn = document.getElementById('lobbyDisconnectBtn');
  const lobbyHint         = document.getElementById('lobbyHint');
  const createLobbyBtn    = document.getElementById('createLobbyBtn');
  const joinLobbyBtn      = document.getElementById('joinLobbyBtn');
  const chatFab           = document.getElementById('chat-header-btn');
  const chatBadge         = document.getElementById('chatBadgeHeader');
  const suggestToast      = document.getElementById('suggestToast');
  const suggestText       = document.getElementById('suggestText');
  const instructToggle    = document.getElementById('instructionsToggle');
  const instructBody      = document.getElementById('instructionsBody');
  const gameFrameOverlay  = document.getElementById('gameFrameOverlay');
  const gameFrame         = document.getElementById('gameFrame');

  /* Settings */
  const settingsOverlay        = document.getElementById('settingsOverlay');
  const settingsDrawer         = document.getElementById('settingsDrawer');
  const settingsClose          = document.getElementById('settingsClose');
  const nameInput              = document.getElementById('nameInput');
  const nameSaveBtn            = document.getElementById('nameSaveBtn');
  const themeToggleDrawer      = document.getElementById('themeToggleDrawer');
  const settingsDisconnectWrap = document.getElementById('settingsDisconnectWrap');
  const settingsDisconnectBtn  = document.getElementById('settingsDisconnectBtn');

  /* Host Lobby Modal */
  const hostQrOverlay     = document.getElementById('hostQrOverlay');
  const hostQrClose       = document.getElementById('hostQrClose');
  const hostQrSubtitle    = document.getElementById('hostQrSubtitle');
  const hostQrContainer   = document.getElementById('hostQrContainer');
  const hostScannerView   = document.getElementById('hostScannerView');
  const hostVideo         = document.getElementById('hostVideo');
  const hostScanGuestBtn  = document.getElementById('hostScanGuestBtn');
  const hostToggleTextBtn = document.getElementById('hostToggleTextBtn');
  const hostScanActionArea = document.getElementById('hostScanActionArea');
  const hostCodeBox       = document.getElementById('hostCodeBox');
  const hostShareActions  = document.getElementById('hostShareActions');
  const hostCopyBtn       = document.getElementById('hostCopyBtn');
  const hostShareBtn      = document.getElementById('hostShareBtn');
  const hostPasteGuestBtn = document.getElementById('hostPasteGuestBtn');
  const hostSpinner       = document.getElementById('hostSpinner');

  /* Guest Join Modal */
  const guestJoinOverlay  = document.getElementById('guestJoinOverlay');
  const guestJoinClose    = document.getElementById('guestJoinClose');
  const guestScanStep     = document.getElementById('guestScanStep');
  const guestVideo        = document.getElementById('guestVideo');
  const guestPasteHostBtn = document.getElementById('guestPasteHostBtn');
  const guestToggleTextBtn = document.getElementById('guestToggleTextBtn');
  const guestTextPasteArea = document.getElementById('guestTextPasteArea');
  const guestAnswerStep   = document.getElementById('guestAnswerStep');
  const guestQrContainer  = document.getElementById('guestQrContainer');
  const guestAnswerCodeBox= document.getElementById('guestAnswerCodeBox');
  const guestShareActions = document.getElementById('guestShareActions');
  const guestCopyBtn      = document.getElementById('guestCopyBtn');
  const guestShareBtn     = document.getElementById('guestShareBtn');
  const guestToggleAnswerTextBtn = document.getElementById('guestToggleAnswerTextBtn');
  const guestSpinner      = document.getElementById('guestSpinner');

  /* Chat */
  const chatOverlay     = document.getElementById('chatOverlay');
  const chatDrawer      = document.getElementById('chatDrawer');
  const chatClose       = document.getElementById('chatClose');
  const chatMessages    = document.getElementById('chatMessages');
  const chatPartnerName = document.getElementById('chatPartnerName');
  const chatInput       = document.getElementById('chatInput');
  const chatSend        = document.getElementById('chatSend');
  const chatDeleteBtn   = document.getElementById('chatDeleteBtn');
  const chatConfirmDelete = document.getElementById('chatConfirmDelete');
  const confirmDeleteYes = document.getElementById('confirmDeleteYes');
  const confirmDeleteNo = document.getElementById('confirmDeleteNo');

  /* ══════════════════ PRE-CACHING LOADING SCREEN ══════════════════ */
  
  const isLoadedThisSession = sessionStorage.getItem('appLoadedThisSession') === 'true';
  const loadingOverlay = document.getElementById('loadingOverlay');

  if (!isLoadedThisSession && loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    preCacheAppFiles();
  } else {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  async function preCacheAppFiles() {
    const statusText = document.getElementById('loadingStatus');
    const fileText = document.getElementById('loadingFile');
    const bar = document.getElementById('loadingBar');

    const assets = [
      './',
      'index.html',
      'style.css',
      'main.js',
      'manifest.json',
      'multiplayer.js',
      'assets/qrcode.min.js',
      'assets/jsqr.min.js',
      'games/escape-road/index.html',
      'games/escape-road/manifest.json',
      'games/escape-road/script.js',
      'games/escape-road/style.css',
      'games/escape-road/icon-512.png',
      'games/escape-road/icon.png',
      'assets/thumbnails/escape-road.png',
      'games/drive-mad/index.html',
      'assets/thumbnails/drive-mad.png',
      'games/block-smasher/index.html',
      'assets/thumbnails/block-smasher.png',
      'games/tic-tac-toe/index.html',
      'assets/thumbnails/tic-tac-toe.png',
      'games/2048/index.html',
      'assets/thumbnails/2048.png',
      'games/pong/index.html',
      'assets/thumbnails/pong.png'
    ];

    try {
      const cache = await caches.open('offlinearcade-' + CACHE_VERSION);
      let loaded = 0;
      
      for (const url of assets) {
        if (statusText) statusText.textContent = `Downloading offline assets... (${loaded + 1}/${assets.length})`;
        if (fileText) fileText.textContent = url;
        
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (e) {
          console.warn(`Optional pre-cache skipped for: ${url}`, e);
        }
        
        loaded++;
        if (bar) bar.style.width = `${(loaded / assets.length) * 100}%`;
      }
      
      if (statusText) statusText.textContent = 'Pre-caching complete! Loading...';
      sessionStorage.setItem('appLoadedThisSession', 'true');
      
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            loadingOverlay.style.display = 'none';
          }, 300);
        }
      }, 500);
    } catch (e) {
      console.error('Pre-caching failed:', e);
      sessionStorage.setItem('appLoadedThisSession', 'true');
      if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
  }

  /* ══════════════════ SERVICE WORKER INIT ══════════════════ */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) {
          w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              if (reloadBtn) {
                reloadBtn.classList.add('pulse');
                reloadBtn.title = 'Update available!';
              }
            }
          });
        }
      });
    });
  }

  if (versionEl) versionEl.textContent = CACHE_VERSION;

  if (!playerName) {
    playerName = randomName();
    localStorage.setItem('playerName', playerName);
  }

  /* Avatar */
  const profileAvatarEl = document.getElementById('profileAvatar');
  if (profileAvatarEl) profileAvatarEl.textContent = playerAvatar;

  if (nameDisplay) nameDisplay.textContent = playerName;
  if (nameInput) nameInput.value = playerName;

  /* Avatar grid selection styling */
  function refreshAvatarGrid() {
    document.querySelectorAll('.avatar-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.emoji === playerAvatar);
    });
  }
  refreshAvatarGrid();

  /* Avatar grid click */
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      playerAvatar = btn.dataset.emoji;
      localStorage.setItem('playerAvatar', playerAvatar);
      if (profileAvatarEl) profileAvatarEl.textContent = playerAvatar;
      refreshAvatarGrid();
      showToast('Avatar saved! ' + playerAvatar);
    });
  });

  /* Profile pill opens settings */
  const profilePill = document.getElementById('profilePill');
  if (profilePill) profilePill.addEventListener('click', openSettings);

  applyTheme();
  setMode(currentMode, false);
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  try { chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}'); } catch {}

  /* ── Themes ── */
  function applyTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-mode', t === 'dark');
    if (themeToggleDrawer) {
      themeToggleDrawer.textContent = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }
  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    applyTheme();
  }
  if (themeToggleDrawer) themeToggleDrawer.addEventListener('click', toggleTheme);

  /* ── Online check ── */
  function updateOnlineStatus() {
    if (navigator.onLine) {
      if (statusDot) {
        statusDot.style.background = '#22c55e';
        statusDot.style.boxShadow  = '0 0 8px #22c55e';
      }
      if (onlineStatusEl) onlineStatusEl.textContent = 'Online';
      if (reloadBtn) reloadBtn.style.display    = 'flex';
    } else {
      if (statusDot) {
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow  = '0 0 8px #ef4444';
      }
      if (onlineStatusEl) onlineStatusEl.textContent = 'Offline';
      if (reloadBtn) reloadBtn.style.display    = 'none';
    }
  }

  /* ── Tab switches ── */
  function setMode(mode, save = true) {
    currentMode = mode;
    if (save) localStorage.setItem('gameMode', mode);

    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const isMulti   = mode === 'multi';
    const connected = MP.isConnected();

    if (lobbyPanel) lobbyPanel.style.display             = isMulti ? 'block' : 'none';
    if (chatFab) chatFab.style.display                = (isMulti && connected) ? 'flex'  : 'none';
    if (settingsDisconnectWrap) settingsDisconnectWrap.style.display = (isMulti && connected) ? 'block' : 'none';

    if (isMulti) {
      if (connected) {
        if (lobbyActions) lobbyActions.style.display = 'none';
        if (lobbyConnectedActions) lobbyConnectedActions.style.display = 'flex';
        if (lobbyDisconnectBtn) lobbyDisconnectBtn.innerHTML = `<span>✕</span> Disconnect (connected with <strong>${MP.opponent || 'Opponent'}</strong>)`;
        if (lobbyHint) lobbyHint.textContent = `Select a game to play.`;
      } else {
        if (lobbyActions) lobbyActions.style.display = 'flex';
        if (lobbyConnectedActions) lobbyConnectedActions.style.display = 'none';
        if (lobbyHint) lobbyHint.textContent = 'Establish a connection and exchange codes via Scanning or Text.';
      }
    }

    updateCardStates(mode, connected);
    localStorage.setItem('gameMode', mode);
  }

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  function updateCardStates(mode, connected) {
    gameCards.forEach(card => {
      const isMP = card.dataset.multiplayer === 'true';
      const old  = card.querySelector('.solo-badge');
      if (old) old.remove();

      const shouldDisable = (mode === 'bot' || mode === 'multi') && !isMP;
      if (shouldDisable) {
        card.classList.add('mp-disabled');
        const badge = document.createElement('div');
        badge.className   = 'solo-badge';
        badge.textContent = 'Solo only';
        card.appendChild(badge);
      } else {
        card.classList.remove('mp-disabled');
      }
    });
  }

  /* ── Card Click block if not connected ── */
  gameCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (card.classList.contains('mp-disabled')) { e.preventDefault(); return; }
      const game = card.dataset.game;
      e.preventDefault();

      if (currentMode === 'multi') {
        if (MP.isConnected()) {
          if (MP.role === 'guest') {
            MP.send('suggest', { game });
            showToast('Suggestion sent! Waiting for host.');
          }
          if (MP.role === 'host') {
            MP.send('start', { game, role: 'O' });
            localStorage.setItem('mpRole', 'X');
            openGameFrame(game);
          }
        } else {
          showToast('Please establish a connection first to play multiplayer.');
        }
      } else {
        openGameFrame(game);
      }
    });
  });

  /* ── Settings controls ── */
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettings);

  function openSettings() {
    if (nameInput) nameInput.value = playerName;
    if (settingsOverlay) settingsOverlay.classList.add('open');
    if (settingsDrawer) settingsDrawer.classList.add('open');
  }
  function closeSettings() {
    if (settingsOverlay) settingsOverlay.classList.remove('open');
    if (settingsDrawer) settingsDrawer.classList.remove('open');
  }

  if (nameSaveBtn) nameSaveBtn.addEventListener('click', saveName);
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
  function saveName() {
    if (!nameInput) return;
    const n = nameInput.value.trim();
    if (!n) return;
    playerName = n;
    localStorage.setItem('playerName', playerName);
    if (nameDisplay) nameDisplay.textContent = playerName;
    showToast('Name saved! 👋');
    closeSettings();
  }

  if (lobbyDisconnectBtn) lobbyDisconnectBtn.addEventListener('click', doDisconnect);
  if (settingsDisconnectBtn) settingsDisconnectBtn.addEventListener('click', () => { closeSettings(); doDisconnect(); });

  function doDisconnect() {
    clearTimeout(connectionTimeout);
    MP.disconnect();
    onDisconnected();
    showToast('Connection disconnected.');
  }

  /* ══════════════════ MULTIPLAYER EVENTS ══════════════════ */
  let connectionTimeout = null;

  function startConnectionTimeout() {
    clearTimeout(connectionTimeout);
    connectionTimeout = setTimeout(() => {
      if (!MP.isConnected()) {
        stopCameraScanner();
        MP.disconnect();
        showToast('❌ Connection attempt failed (Timeout).');
        closeAllModals();
      }
    }, 15000);
  }

  MP.on('connected', ({ opponent }) => {
    clearTimeout(connectionTimeout);
    stopCameraScanner();
    if (chatPartnerName) chatPartnerName.textContent = opponent || 'Opponent';
    closeAllModals();
    setMode(currentMode, false);
    showToast(`Connected with ${opponent}! ✅`);
  });

  MP.on('disconnected', ({ opponent }) => {
    clearTimeout(connectionTimeout);
    stopCameraScanner();
    MP.disconnect();
    onDisconnected();
    if (opponent) showToast(`${opponent} disconnected.`);
  });

  MP.on('suggest', ({ game }) => {
    gameCards.forEach(c => c.classList.toggle('suggested', c.dataset.game === game));
    if (suggestText) suggestText.textContent = `${MP.opponent} suggests playing ${game}!`;
    if (suggestToast) suggestToast.style.display = 'block';
    setTimeout(() => { if (suggestToast) suggestToast.style.display = 'none'; }, 4000);
  });

  MP.on('start', ({ game }) => {
    localStorage.setItem('mpRole', 'O');
    openGameFrame(game);
  });

  MP.on('chat', ({ text, name }) => {
    addChatMessage(text, name, false);
    if (chatDrawer && !chatDrawer.classList.contains('open')) {
      unreadChat++;
      if (chatBadge) {
        chatBadge.textContent   = unreadChat;
        chatBadge.style.display = 'flex';
      }
    }
  });

  MP.on('disconnect', () => {
    clearTimeout(connectionTimeout);
    stopCameraScanner();
    onDisconnected();
    showToast('Opponent disconnected.');
  });

  function onDisconnected() {
    clearTimeout(connectionTimeout);
    stopCameraScanner();
    if (chatFab) chatFab.style.display = 'none';
    if (settingsDisconnectWrap) settingsDisconnectWrap.style.display = 'none';
    gameCards.forEach(c => c.classList.remove('mp-disabled', 'suggested'));
    document.querySelectorAll('.solo-badge').forEach(b => b.remove());
    setMode(currentMode, false);
  }

  /* ══════════════════ HOST CONNECTIONS (QR Display & Scan) ══════════════════ */
  if (createLobbyBtn) {
    createLobbyBtn.addEventListener('click', async () => {
      stopCameraScanner();
      
      if (hostQrContainer) hostQrContainer.innerHTML = '';
      if (hostCodeBox) {
        hostCodeBox.innerHTML = '';
        hostCodeBox.style.display = 'none';
      }
      if (hostShareActions) hostShareActions.style.display = 'none';
      if (hostScanActionArea) hostScanActionArea.style.display = 'none';
      if (hostScannerView) hostScannerView.style.display = 'none';
      if (hostSpinner) hostSpinner.style.display = 'block';
      if (hostQrSubtitle) hostQrSubtitle.textContent = 'Generating connection QR code…';
      
      openModal(hostQrOverlay);

      try {
        const encoded = await MP.createOffer(playerName);
        if (hostSpinner) hostSpinner.style.display = 'none';
        if (hostQrSubtitle) hostQrSubtitle.textContent = 'Let your guest scan this QR code:';
        
        // Render QR Code using low correction level for easy scanning
        if (hostQrContainer) {
          hostQrContainer.innerHTML = '';
          new QRCode(hostQrContainer, {
            text: encoded,
            width: 180,
            height: 180,
            correctLevel: QRCode.CorrectLevel.L
          });
          hostQrContainer.style.display = 'flex';
        }
        
        if (hostCodeBox) hostCodeBox.textContent = encoded;
        if (hostScanActionArea) hostScanActionArea.style.display = 'flex';

        // Setup copy buttons
        if (hostCopyBtn) {
          hostCopyBtn.onclick = () => {
            navigator.clipboard.writeText(encoded)
              .then(() => showToast('📋 Code copied!'))
              .catch(() => showToast('❌ Failed copying code.'));
          };
        }

        if (hostShareBtn) {
          hostShareBtn.onclick = () => {
            if (navigator.share) {
              navigator.share({ title: 'OfflineArcade Code', text: encoded });
            } else {
              showToast('Sharing not supported. Copy code manually.');
            }
          };
        }
      } catch(e) {
        if (hostQrSubtitle) hostQrSubtitle.textContent = '❌ Failed generating connection. Retry.';
        if (hostSpinner) hostSpinner.style.display  = 'none';
      }
    });
  }

  // Toggle fallback text displays in Host modal
  if (hostToggleTextBtn) {
    hostToggleTextBtn.addEventListener('click', () => {
      stopCameraScanner();
      const visible = hostCodeBox.style.display === 'block';
      hostCodeBox.style.display = visible ? 'none' : 'block';
      hostShareActions.style.display = visible ? 'none' : 'flex';
      hostPasteGuestBtn.style.display = visible ? 'none' : 'flex';
      
      if (hostQrContainer) hostQrContainer.style.display = visible ? 'flex' : 'none';
      hostToggleTextBtn.textContent = visible ? '📋 Show Text Code fallback' : '📸 Show QR Code';
      if (hostQrSubtitle) {
        hostQrSubtitle.textContent = visible ? 'Let your guest scan this QR code:' : 'Share this text code with your guest:';
      }
    });
  }

  // Host scans guest response
  if (hostScanGuestBtn) {
    hostScanGuestBtn.addEventListener('click', () => {
      if (hostQrContainer) hostQrContainer.style.display = 'none';
      if (hostScannerView) hostScannerView.style.display = 'block';
      if (hostQrSubtitle) hostQrSubtitle.textContent = 'Point camera at Guest\'s QR code:';
      
      startCameraScanner(hostVideo, async (scannedCode) => {
        stopCameraScanner();
        processGuestAnswer(scannedCode);
      });
    });
  }

  async function processGuestAnswer(textCode) {
    if (hostQrSubtitle) hostQrSubtitle.textContent = 'Establishing connection...';
    if (hostScanActionArea) hostScanActionArea.style.display = 'none';
    if (hostSpinner) {
      hostSpinner.textContent = 'Connecting to guest...';
      hostSpinner.style.display = 'block';
    }

    startConnectionTimeout();

    try {
      await MP.receiveAnswer(textCode);
    } catch(e) {
      clearTimeout(connectionTimeout);
      showToast('❌ Invalid code.');
      
      if (hostQrSubtitle) hostQrSubtitle.textContent = 'Let your guest scan this QR code:';
      if (hostQrContainer) hostQrContainer.style.display = 'flex';
      if (hostScanActionArea) hostScanActionArea.style.display = 'flex';
      if (hostSpinner) hostSpinner.style.display = 'none';
    }
  }

  if (hostPasteGuestBtn) {
    hostPasteGuestBtn.addEventListener('click', async () => {
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch(e) {}
      if (!text) text = prompt("Paste the Guest's connection code:");
      text = text ? text.trim() : "";
      if (!text) return;
      processGuestAnswer(text);
    });
  }

  if (hostQrClose) hostQrClose.addEventListener('click',  () => { stopCameraScanner(); clearTimeout(connectionTimeout); closeModal(hostQrOverlay);  MP.disconnect(); });

  /* ══════════════════ GUEST CONNECTIONS (Scan Host & QR Display) ══════════════════ */
  if (joinLobbyBtn) {
    joinLobbyBtn.addEventListener('click', () => {
      stopCameraScanner();
      if (guestScanStep) guestScanStep.style.display = 'block';
      if (guestAnswerStep) guestAnswerStep.style.display = 'none';
      
      openModal(guestJoinOverlay);
      
      // Start scanning immediately
      startCameraScanner(guestVideo, (scannedHostCode) => {
        stopCameraScanner();
        guestProcessOffer(scannedHostCode);
      });
    });
  }

  // Toggle Guest Scan input fallbacks
  if (guestToggleTextBtn) {
    guestToggleTextBtn.addEventListener('click', () => {
      const visible = guestTextPasteArea.style.display === 'block';
      guestTextPasteArea.style.display = visible ? 'none' : 'block';
      if (guestScannerView) guestScannerView.style.display = visible ? 'block' : 'none';
      guestToggleTextBtn.textContent = visible ? '📋 Use Text Code Instead' : '📸 Scan QR Code';
      
      if (visible) {
        startCameraScanner(guestVideo, (scannedHostCode) => {
          stopCameraScanner();
          guestProcessOffer(scannedHostCode);
        });
      } else {
        stopCameraScanner();
      }
    });
  }

  async function guestProcessOffer(offerText) {
    stopCameraScanner();
    if (guestScanStep) guestScanStep.style.display = 'none';
    if (guestAnswerStep) guestAnswerStep.style.display = 'block';
    
    if (guestQrContainer) guestQrContainer.innerHTML = '';
    if (guestAnswerCodeBox) {
      guestAnswerCodeBox.innerHTML = '';
      guestAnswerCodeBox.style.display = 'none';
    }
    if (guestShareActions) guestShareActions.style.display = 'none';
    if (guestSpinner) guestSpinner.style.display = 'block';

    try {
      const answer = await MP.receiveOffer(offerText, playerName);
      if (guestSpinner) {
        guestSpinner.textContent = 'Waiting for direct connection...';
        guestSpinner.style.display = 'block';
      }

      // Render Guest Answer QR code
      if (guestQrContainer) {
        guestQrContainer.innerHTML = '';
        new QRCode(guestQrContainer, {
          text: answer,
          width: 180,
          height: 180,
          correctLevel: QRCode.CorrectLevel.L
        });
        guestQrContainer.style.display = 'flex';
      }

      if (guestAnswerCodeBox) guestAnswerCodeBox.textContent = answer;

      startConnectionTimeout();

      if (guestCopyBtn) {
        guestCopyBtn.onclick = () => {
          navigator.clipboard.writeText(answer)
            .then(() => showToast('📋 Code copied!'))
            .catch(() => showToast('❌ Failed copying code.'));
        };
      }

      if (guestShareBtn) {
        guestShareBtn.onclick = () => {
          if (navigator.share) {
            navigator.share({ title: 'OfflineArcade Code', text: answer });
          } else {
            showToast('Sharing not supported. Copy code manually.');
          }
        };
      }
    } catch(e) {
      if (guestSpinner) guestSpinner.textContent = '❌ Failed generating connection code. Retry.';
    }
  }

  // Toggle Guest Answer Code text display
  if (guestToggleAnswerTextBtn) {
    guestToggleAnswerTextBtn.addEventListener('click', () => {
      const visible = guestAnswerCodeBox.style.display === 'block';
      guestAnswerCodeBox.style.display = visible ? 'none' : 'block';
      guestShareActions.style.display = visible ? 'none' : 'flex';
      
      if (guestQrContainer) guestQrContainer.style.display = visible ? 'flex' : 'none';
      guestToggleAnswerTextBtn.textContent = visible ? '📋 Show Text Code fallback' : '📸 Show QR Code';
    });
  }

  if (guestPasteHostBtn) {
    guestPasteHostBtn.addEventListener('click', async () => {
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch(e) {}
      if (!text) text = prompt("Paste the Host's connection code:");
      text = text ? text.trim() : "";
      if (!text) return;
      guestProcessOffer(text);
    });
  }

  if (guestJoinClose) guestJoinClose.addEventListener('click', () => { stopCameraScanner(); clearTimeout(connectionTimeout); closeModal(guestJoinOverlay); MP.disconnect(); });

  /* ══════════════════ GAME FRAME OVERLAY CONTROL ══════════════════ */
  function openGameFrame(game) {
    if (gameFrame) {
      gameFrame.src = `games/${game}/index.html`;
      gameFrame.onload = () => {
        try {
          gameFrame.contentWindow.focus();
        } catch (e) {
          console.warn("Could not focus gameFrame window:", e);
        }
      };
    }
    if (gameFrameOverlay) gameFrameOverlay.style.display = "flex";
  }
  window.openGameFrame = openGameFrame;

  function closeGameFrame() {
    if (gameFrame) gameFrame.src = "";
    if (gameFrameOverlay) gameFrameOverlay.style.display = "none";
    
    // Clear card suggestions when going back
    gameCards.forEach(c => c.classList.remove('suggested'));
    
    if (MP.isConnected()) {
      MP.send('menu');
    }
  }
  window.closeGameFrame = closeGameFrame;

  MP.on('menu', () => {
    if (gameFrameOverlay && gameFrameOverlay.style.display !== "none") {
      if (gameFrame) gameFrame.src = "";
      gameFrameOverlay.style.display = "none";
      
      // Clear suggestions on menu return
      gameCards.forEach(c => c.classList.remove('suggested'));
      showToast(`${MP.opponent || 'Opponent'} went back to menu.`);
    }
  });

  /* ══════════════════ MODAL HELPERS ══════════════════ */
  function openModal(el)  { if (el) el.classList.add('open'); }
  function closeModal(el) { if (el) el.classList.remove('open'); }
  function closeAllModals() {
    [hostQrOverlay, guestJoinOverlay].forEach(closeModal);
  }

  /* ══════════════════ CHAT ══════════════════ */
  if (chatFab) chatFab.addEventListener('click', openChat);
  if (chatClose) chatClose.addEventListener('click', closeChat);
  if (chatOverlay) chatOverlay.addEventListener('click', closeChat);

  function openChat() {
    if (chatOverlay) chatOverlay.classList.add('open');
    if (chatDrawer) chatDrawer.classList.add('open');
    unreadChat = 0;
    if (chatBadge) chatBadge.style.display = 'none';
    renderChatHistory();
    setTimeout(() => { if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
  }
  function closeChat() {
    if (chatOverlay) chatOverlay.classList.remove('open');
    if (chatDrawer) chatDrawer.classList.remove('open');
    if (chatConfirmDelete) chatConfirmDelete.style.display = 'none';
  }

  if (chatSend) chatSend.addEventListener('click', sendChat);
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

  function sendChat() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text || !MP.isConnected()) return;
    MP.send('chat', { text, name: playerName });
    addChatMessage(text, playerName, true);
    chatInput.value = '';
  }

  function addChatMessage(text, name, mine) {
    const key = MP.opponentDeviceId || 'unknown_peer';
    if (!chatHistory[key]) chatHistory[key] = [];
    chatHistory[key].push({ text, name, mine, ts: Date.now() });
    if (chatHistory[key].length > 100) chatHistory[key].shift();
    try { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); } catch {}

    if (chatDrawer && chatDrawer.classList.contains('open')) {
      appendChatBubble({ text, name, mine });
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  window.addChatMessageFromGame = addChatMessage;

  function renderChatHistory() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    const key = MP.opponentDeviceId || 'unknown_peer';
    (chatHistory[key] || []).forEach(msg => appendChatBubble(msg));
  }

  function appendChatBubble({ text, name, mine }) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${mine ? 'mine' : 'theirs'}`;
    if (!mine) {
      const n = document.createElement('div');
      n.className   = 'chat-msg-name';
      n.textContent = name;
      div.appendChild(n);
    }
    const t = document.createElement('div');
    t.textContent = text;
    div.appendChild(t);
    chatMessages.appendChild(div);
  }

  /* Chat delete confirmation triggers */
  if (chatDeleteBtn) {
    chatDeleteBtn.addEventListener('click', () => {
      if (chatConfirmDelete) chatConfirmDelete.style.display = 'flex';
    });
  }

  if (confirmDeleteNo) {
    confirmDeleteNo.addEventListener('click', () => {
      if (chatConfirmDelete) chatConfirmDelete.style.display = 'none';
    });
  }

  if (confirmDeleteYes) {
    confirmDeleteYes.addEventListener('click', () => {
      const key = MP.opponentDeviceId || 'unknown_peer';
      delete chatHistory[key];
      try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
      } catch (e) {}
      
      if (chatMessages) chatMessages.innerHTML = '';
      if (chatConfirmDelete) chatConfirmDelete.style.display = 'none';
      showToast('Chat history cleared.');
    });
  }

  /* ── LUCKY SPIN ── */
  if (randomBtn) randomBtn.addEventListener('click', startLuckySpin);

  function startLuckySpin() {
    let cards;
    if (currentMode === 'bot' || currentMode === 'multi') {
      cards = [...document.querySelectorAll('.game-card[data-multiplayer="true"]')];
    } else {
      cards = [...document.querySelectorAll('.game-card')];
    }
    if (!cards.length) { if (randomBtn) { randomBtn.disabled = false; randomBtn.style.opacity = '1'; } return; }
    if (randomBtn) {
      randomBtn.disabled     = true;
      randomBtn.style.opacity = '0.5';
    }
    cards.forEach(c => c.classList.remove('highlighted'));

    let idx = 0, steps = 14 + Math.floor(Math.random() * 8), delay = 60;

    function spin() {
      cards.forEach(c => c.classList.remove('highlighted'));
      cards[idx].classList.add('highlighted');
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      idx = (idx + 1) % cards.length;
      steps--;
      if (steps > 0) {
        if (steps < 7) delay += 40;
        if (steps < 3) delay += 90;
        setTimeout(spin, delay);
      } else {
        const winner = cards[(idx - 1 + cards.length) % cards.length];
        let blinks = 4;
        function blink() {
          winner.classList.toggle('highlighted', blinks % 2 !== 0);
          blinks--;
          if (blinks > 0) { setTimeout(blink, 150); }
          else {
            winner.classList.add('highlighted');
            setTimeout(() => {
              if (randomBtn) {
                randomBtn.disabled      = false;
                randomBtn.style.opacity = '1';
              }
              winner.classList.remove('highlighted');
              winner.click();
            }, 900);
          }
        }
        blink();
      }
    }
    spin();
  }

  /* ── INSTRUCTIONS ── */
  if (instructToggle) {
    instructToggle.addEventListener('click', () => {
      if (instructBody) {
        const open = instructBody.classList.toggle('open');
        instructToggle.classList.toggle('open', open);
      }
    });
  }

  /* ── RELOAD / INSTALL ── */
  if (reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload());

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    const info = document.getElementById('install-info');
    const text = document.getElementById('install-text');
    if (!info) return;
    info.style.display = 'block';
    if (text) {
      text.innerHTML = `Install OfflineArcade as an App:<br>
        <button id="install-app-btn" style="margin-top:8px;background:#22c55e;color:white;border:none;padding:7px 12px;font-weight:700;border-radius:10px;cursor:pointer;font-size:11px;width:100%;">Install Now</button>`;
      const appBtn = document.getElementById('install-app-btn');
      if (appBtn) {
        appBtn.addEventListener('click', () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(r => {
              if (r.outcome === 'accepted') info.style.display = 'none';
              deferredPrompt = null;
            });
          }
        });
      }
    }
  });

  const installCloseBtn = document.getElementById('installCloseBtn');
  if (installCloseBtn) {
    installCloseBtn.addEventListener('click', () => {
      const info = document.getElementById('install-info');
      if (info) info.style.display = 'none';
      localStorage.setItem('installBannerDismissed', 'true');
    });
  }

  (function checkInstall() {
    const isIOS      = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInstalled= window.navigator.standalone || window.matchMedia('(display-mode:standalone)').matches;
    const dismissed  = localStorage.getItem('installBannerDismissed') === 'true';
    const info       = document.getElementById('install-info');
    const text       = document.getElementById('install-text');
    if (!info) return;
    if (isInstalled || dismissed) { info.style.display = 'none'; return; }
    info.style.display = 'block';
    if (isIOS && text) text.innerHTML = `Tap ⎙ in Safari and select <strong>"Add to Home Screen"</strong>.`;
  })();

});
