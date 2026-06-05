/* ============================================================
   OfflineArcade – main.js  (complete rewrite with QR P2P, Pre-Caching & English)
   ============================================================ */

const CACHE_VERSION = 'v94';
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

/* ── QR Scanner dummy & Hash helper ── */
function stopCameraScanner() {}

// Handle join hash on page load
const hash = window.location.hash;
if (hash.startsWith('#join=')) {
  const joinCode = hash.substring(6);
  document.addEventListener('DOMContentLoaded', () => {
    const qrHelperOverlay = document.getElementById('qrHelperOverlay');
    const qrHelperCopyBtn = document.getElementById('qrHelperCopyBtn');
    if (qrHelperOverlay) {
      qrHelperOverlay.style.display = 'flex';
      if (qrHelperCopyBtn) {
        qrHelperCopyBtn.onclick = () => {
          navigator.clipboard.writeText(joinCode)
            .then(() => {
              showToast('📋 Code copied! Open OfflineArcade.');
              qrHelperCopyBtn.innerHTML = '<span>✓</span> Code Copied!';
              qrHelperCopyBtn.style.background = '#22c55e';
            })
            .catch(() => {
              const temp = document.createElement('input');
              temp.value = joinCode;
              document.body.appendChild(temp);
              temp.select();
              document.execCommand('copy');
              document.body.removeChild(temp);
              showToast('📋 Code copied! Open OfflineArcade.');
              qrHelperCopyBtn.innerHTML = '<span>✓</span> Code Copied!';
              qrHelperCopyBtn.style.background = '#22c55e';
            });
        };
      }
    }
  });
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
  const hostCodeCopyContainer = document.getElementById('hostCodeCopyContainer');
  const hostCodeInput     = document.getElementById('hostCodeInput');
  const hostCopyBtn       = document.getElementById('hostCopyBtn');
  const hostShareBtn      = document.getElementById('hostShareBtn');
  const hostPasteGuestBtn = document.getElementById('hostPasteGuestBtn');
  const hostInstructions  = document.getElementById('hostInstructions');
  const hostSpinner       = document.getElementById('hostSpinner');

  /* Guest Join Modal */
  const guestJoinOverlay  = document.getElementById('guestJoinOverlay');
  const guestJoinClose    = document.getElementById('guestJoinClose');
  const guestInputStep    = document.getElementById('guestInputStep');
  const guestPasteHostBtn = document.getElementById('guestPasteHostBtn');
  const guestAnswerStep   = document.getElementById('guestAnswerStep');
  const guestQrContainer  = document.getElementById('guestQrContainer');
  const guestCodeCopyContainer = document.getElementById('guestCodeCopyContainer');
  const guestCodeInput    = document.getElementById('guestCodeInput');
  const guestCopyBtn      = document.getElementById('guestCopyBtn');
  const guestShareBtn     = document.getElementById('guestShareBtn');
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
    }, 90000);
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

  /* ══════════════════ SMART CODE EXTRACTOR ══════════════════ */
  function extractCode(text) {
    if (!text) return "";
    text = text.trim();
    if (text.includes('#join=')) {
      return text.split('#join=')[1].trim();
    }
    return text;
  }

  /* ══════════════════ HOST CONNECTIONS (QR Display & Clipboard) ══════════════════ */
  if (createLobbyBtn) {
    createLobbyBtn.addEventListener('click', async () => {
      const hostLinkSection = document.getElementById('hostLinkSection');
      const hostRawSection = document.getElementById('hostRawSection');
      const hostRawCodeInput = document.getElementById('hostRawCodeInput');
      const hostRawCopyBtn = document.getElementById('hostRawCopyBtn');

      if (hostQrContainer) hostQrContainer.innerHTML = '';
      if (hostCodeInput) hostCodeInput.value = '';
      if (hostRawCodeInput) hostRawCodeInput.value = '';
      if (hostLinkSection) hostLinkSection.style.display = 'none';
      if (hostRawSection) hostRawSection.style.display = 'none';
      if (hostShareBtn) hostShareBtn.style.display = 'none';
      if (hostPasteGuestBtn) hostPasteGuestBtn.style.display = 'none';
      if (hostInstructions) hostInstructions.style.display = 'none';
      if (hostSpinner) {
        hostSpinner.textContent = '⏳ Gathering network candidates…';
        hostSpinner.style.display = 'block';
      }
      if (hostQrSubtitle) hostQrSubtitle.textContent = 'Generating connection QR code…';
      
      openModal(hostQrOverlay);

      try {
        const encoded = await MP.createOffer(playerName);
        if (hostSpinner) hostSpinner.style.display = 'none';
        if (hostQrSubtitle) hostQrSubtitle.textContent = 'Share this connection with your guest:';
        
        const joinUrl = window.location.origin + window.location.pathname + '#join=' + encoded;

        // Render QR Code using low correction level for easy scanning (larger size)
        if (hostQrContainer) {
          hostQrContainer.innerHTML = '';
          new QRCode(hostQrContainer, {
            text: joinUrl,
            width: 260,
            height: 260,
            correctLevel: QRCode.CorrectLevel.L
          });
          hostQrContainer.style.display = 'flex';
        }
        
        if (hostCodeInput) hostCodeInput.value = joinUrl;
        if (hostRawCodeInput) hostRawCodeInput.value = encoded;
        
        if (hostLinkSection) hostLinkSection.style.display = 'block';
        if (hostRawSection) hostRawSection.style.display = 'block';
        if (hostShareBtn) hostShareBtn.style.display = 'flex';
        if (hostPasteGuestBtn) hostPasteGuestBtn.style.display = 'block';
        if (hostInstructions) hostInstructions.style.display = 'block';

        // Setup copy buttons
        if (hostCopyBtn) {
          hostCopyBtn.onclick = () => {
            navigator.clipboard.writeText(joinUrl)
              .then(() => showToast('📋 Connection link copied!'))
              .catch(() => showToast('❌ Failed copying link.'));
          };
        }

        if (hostRawCopyBtn) {
          hostRawCopyBtn.onclick = () => {
            navigator.clipboard.writeText(encoded)
              .then(() => showToast('📋 Connection code copied!'))
              .catch(() => showToast('❌ Failed copying code.'));
          };
        }

        if (hostShareBtn) {
          hostShareBtn.onclick = () => {
            if (navigator.share) {
              navigator.share({ title: 'OfflineArcade Connection', text: joinUrl });
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

  async function processGuestAnswer(textCode) {
    const hostLinkSection = document.getElementById('hostLinkSection');
    const hostRawSection = document.getElementById('hostRawSection');

    if (hostQrSubtitle) hostQrSubtitle.textContent = 'Establishing connection...';
    if (hostLinkSection) hostLinkSection.style.display = 'none';
    if (hostRawSection) hostRawSection.style.display = 'none';
    if (hostShareBtn) hostShareBtn.style.display = 'none';
    if (hostPasteGuestBtn) hostPasteGuestBtn.style.display = 'none';
    if (hostInstructions) hostInstructions.style.display = 'none';
    if (hostQrContainer) hostQrContainer.style.display = 'none';
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
      
      if (hostQrSubtitle) hostQrSubtitle.textContent = 'Share this connection with your guest:';
      if (hostQrContainer) hostQrContainer.style.display = 'flex';
      if (hostLinkSection) hostLinkSection.style.display = 'block';
      if (hostRawSection) hostRawSection.style.display = 'block';
      if (hostShareBtn) hostShareBtn.style.display = 'flex';
      if (hostPasteGuestBtn) hostPasteGuestBtn.style.display = 'block';
      if (hostInstructions) hostInstructions.style.display = 'block';
      if (hostSpinner) hostSpinner.style.display = 'none';
    }
  }

  if (hostPasteGuestBtn) {
    hostPasteGuestBtn.addEventListener('click', async () => {
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch(e) {}
      if (!text) text = prompt("Paste the Guest's connection code or link:");
      text = text ? text.trim() : "";
      if (!text) return;
      processGuestAnswer(extractCode(text));
    });
  }

  if (hostQrClose) hostQrClose.addEventListener('click',  () => { clearTimeout(connectionTimeout); closeModal(hostQrOverlay);  MP.disconnect(); });

  /* ══════════════════ GUEST CONNECTIONS (QR Display & Clipboard) ══════════════════ */
  if (joinLobbyBtn) {
    joinLobbyBtn.addEventListener('click', () => {
      if (guestInputStep) guestInputStep.style.display = 'block';
      if (guestAnswerStep) guestAnswerStep.style.display = 'none';
      openModal(guestJoinOverlay);
    });
  }

  async function guestProcessOffer(offerText) {
    if (guestInputStep) guestInputStep.style.display = 'none';
    if (guestAnswerStep) guestAnswerStep.style.display = 'block';
    
    const guestLinkSection = document.getElementById('guestLinkSection');
    const guestRawSection = document.getElementById('guestRawSection');
    const guestRawCodeInput = document.getElementById('guestRawCodeInput');
    const guestRawCopyBtn = document.getElementById('guestRawCopyBtn');

    if (guestQrContainer) guestQrContainer.innerHTML = '';
    if (guestCodeInput) guestCodeInput.value = '';
    if (guestRawCodeInput) guestRawCodeInput.value = '';
    if (guestLinkSection) guestLinkSection.style.display = 'none';
    if (guestRawSection) guestRawSection.style.display = 'none';
    if (guestShareBtn) guestShareBtn.style.display = 'none';
    if (guestSpinner) {
      guestSpinner.textContent = '⏳ Creating response...';
      guestSpinner.style.display = 'block';
    }

    try {
      const answer = await MP.receiveOffer(offerText, playerName);
      if (guestSpinner) {
        guestSpinner.textContent = 'Waiting for Host to scan/paste...';
        guestSpinner.style.display = 'block';
      }

      const answerUrl = window.location.origin + window.location.pathname + '#join=' + answer;

      // Render Guest Answer QR code (larger size)
      if (guestQrContainer) {
        guestQrContainer.innerHTML = '';
        new QRCode(guestQrContainer, {
          text: answerUrl,
          width: 260,
          height: 260,
          correctLevel: QRCode.CorrectLevel.L
        });
        guestQrContainer.style.display = 'flex';
      }

      if (guestCodeInput) guestCodeInput.value = answerUrl;
      if (guestRawCodeInput) guestRawCodeInput.value = answer;
      
      if (guestLinkSection) guestLinkSection.style.display = 'block';
      if (guestRawSection) guestRawSection.style.display = 'block';
      if (guestShareBtn) guestShareBtn.style.display = 'flex';

      startConnectionTimeout();

      if (guestCopyBtn) {
        guestCopyBtn.onclick = () => {
          navigator.clipboard.writeText(answerUrl)
            .then(() => showToast('📋 Connection link copied!'))
            .catch(() => showToast('❌ Failed copying link.'));
        };
      }

      if (guestRawCopyBtn) {
        guestRawCopyBtn.onclick = () => {
          navigator.clipboard.writeText(answer)
            .then(() => showToast('📋 Connection code copied!'))
            .catch(() => showToast('❌ Failed copying code.'));
        };
      }

      if (guestShareBtn) {
        guestShareBtn.onclick = () => {
          if (navigator.share) {
            navigator.share({ title: 'OfflineArcade Connection', text: answerUrl });
          } else {
            showToast('Sharing not supported. Copy code manually.');
          }
        };
      }
    } catch(e) {
      if (guestSpinner) guestSpinner.textContent = '❌ Failed generating connection code. Retry.';
    }
  }

  if (guestPasteHostBtn) {
    guestPasteHostBtn.addEventListener('click', async () => {
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch(e) {}
      if (!text) text = prompt("Paste the Host's connection code or link:");
      text = text ? text.trim() : "";
      if (!text) return;
      guestProcessOffer(extractCode(text));
    });
  }

  if (guestJoinClose) guestJoinClose.addEventListener('click', () => { clearTimeout(connectionTimeout); closeModal(guestJoinOverlay); MP.disconnect(); });

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

  let spinTimeoutId = null;
  let isSpinning = false;
  let activeSpinCards = [];

  function cancelLuckySpin() {
    if (spinTimeoutId) {
      clearTimeout(spinTimeoutId);
      spinTimeoutId = null;
    }
    if (activeSpinCards) {
      activeSpinCards.forEach(c => c.classList.remove('highlighted'));
    }
    if (randomBtn) {
      randomBtn.style.opacity = '1';
    }
    isSpinning = false;
  }

  function startLuckySpin() {
    if (currentMode === 'multi' && !MP.isConnected()) {
      return;
    }

    if (isSpinning) {
      cancelLuckySpin();
      return;
    }

    let cards;
    if (currentMode === 'bot' || currentMode === 'multi') {
      cards = [...document.querySelectorAll('.game-card[data-multiplayer="true"]')];
    } else {
      cards = [...document.querySelectorAll('.game-card')];
    }
    if (!cards.length) return;

    isSpinning = true;
    activeSpinCards = cards;
    if (randomBtn) {
      randomBtn.style.opacity = '0.6';
    }
    cards.forEach(c => c.classList.remove('highlighted'));

    let idx = 0, steps = 14 + Math.floor(Math.random() * 8), delay = 60;

    function spin() {
      if (!isSpinning) return;
      cards.forEach(c => c.classList.remove('highlighted'));
      cards[idx].classList.add('highlighted');
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      idx = (idx + 1) % cards.length;
      steps--;
      if (steps > 0) {
        if (steps < 7) delay += 40;
        if (steps < 3) delay += 90;
        spinTimeoutId = setTimeout(spin, delay);
      } else {
        const winner = cards[(idx - 1 + cards.length) % cards.length];
        let blinks = 4;
        function blink() {
          if (!isSpinning) return;
          winner.classList.toggle('highlighted', blinks % 2 !== 0);
          blinks--;
          if (blinks > 0) {
            spinTimeoutId = setTimeout(blink, 150);
          } else {
            winner.classList.add('highlighted');
            spinTimeoutId = setTimeout(() => {
              if (randomBtn) {
                randomBtn.style.opacity = '1';
              }
              winner.classList.remove('highlighted');
              isSpinning = false;
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
