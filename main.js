/* ============================================================
   OfflineArcade – main.js  (complete rewrite with multiplayer)
   ============================================================ */

const CACHE_VERSION = 'v77';
const MULTIPLAYER_GAMES = ['tic-tac-toe'];

/* ── Random name generator ── */
function randomName() {
  const adj = ['Cool','Swift','Brave','Wild','Neon','Dark','Epic','Turbo','Ultra','Hyper','Mega','Star'];
  const noun= ['Fox','Wolf','Hawk','Panda','Tiger','Eagle','Ninja','Rocket','Pixel','Storm','Blaze','Ghost'];
  const num = Math.floor(Math.random() * 90) + 10;
  return adj[Math.floor(Math.random()*adj.length)] + noun[Math.floor(Math.random()*noun.length)] + num;
}

/* ── Toast helper ── */
let toastTimer = null;
function showToast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ── State ── */
let currentMode   = localStorage.getItem('gameMode') || 'solo'; // solo | bot | multi
let playerName    = localStorage.getItem('playerName') || '';
let unreadChat    = 0;
let chatHistory   = {};  // key: opponentName → [{mine, text, ts}]
let scanStream    = null;
let scanInterval  = null;
let hostQrRendered= false;

document.addEventListener('DOMContentLoaded', () => {

  /* ── Element refs ── */
  const versionEl        = document.getElementById('version');
  const statusDot        = document.getElementById('status-dot');
  const onlineStatusEl   = document.getElementById('online-status');
  const reloadBtn        = document.getElementById('reload-btn');
  const randomBtn        = document.getElementById('random-btn');
  const themeBtn         = document.getElementById('theme-btn');
  const settingsBtn      = document.getElementById('settings-btn');
  const nameDisplay      = document.getElementById('playerNameDisplay');
  const modeTabs         = document.querySelectorAll('.mode-tab');
  const gameGrid         = document.getElementById('gameGrid');
  const gameCards        = document.querySelectorAll('.game-card');
  const lobbyPanel       = document.getElementById('lobbyPanel');
  const connectionBar    = document.getElementById('connectionBar');
  const connAvatar       = document.getElementById('connAvatar');
  const connName         = document.getElementById('connName');
  const disconnectBtn    = document.getElementById('disconnectBtn');
  const createLobbyBtn   = document.getElementById('createLobbyBtn');
  const joinLobbyBtn     = document.getElementById('joinLobbyBtn');
  const chatFab          = document.getElementById('chatFab');
  const chatBadge        = document.getElementById('chatBadge');
  const suggestToast     = document.getElementById('suggestToast');
  const suggestText      = document.getElementById('suggestText');
  const instructToggle   = document.getElementById('instructionsToggle');
  const instructBody     = document.getElementById('instructionsBody');

  /* Settings */
  const settingsOverlay       = document.getElementById('settingsOverlay');
  const settingsDrawer        = document.getElementById('settingsDrawer');
  const settingsClose         = document.getElementById('settingsClose');
  const nameInput             = document.getElementById('nameInput');
  const nameSaveBtn           = document.getElementById('nameSaveBtn');
  const themeToggleDrawer     = document.getElementById('themeToggleDrawer');
  const settingsDisconnectWrap= document.getElementById('settingsDisconnectWrap');
  const settingsDisconnectBtn = document.getElementById('settingsDisconnectBtn');

  /* Host QR Modal */
  const hostQrOverlay  = document.getElementById('hostQrOverlay');
  const hostQrClose    = document.getElementById('hostQrClose');
  const hostQrSubtitle = document.getElementById('hostQrSubtitle');
  const hostQrCanvas   = document.getElementById('hostQrCanvas');
  const hostScanGuestBtn= document.getElementById('hostScanGuestBtn');
  const hostSpinner    = document.getElementById('hostSpinner');

  /* Guest Join Modal */
  const guestJoinOverlay = document.getElementById('guestJoinOverlay');
  const guestJoinClose   = document.getElementById('guestJoinClose');
  const guestScanStep    = document.getElementById('guestScanStep');
  const guestAnswerStep  = document.getElementById('guestAnswerStep');
  const guestVideo       = document.getElementById('guestVideo');
  const guestScanCanvas  = document.getElementById('guestScanCanvas');
  const guestAnswerQr    = document.getElementById('guestAnswerQr');
  const guestSpinner     = document.getElementById('guestSpinner');

  /* Host Scan Modal */
  const hostScanOverlay = document.getElementById('hostScanOverlay');
  const hostScanClose   = document.getElementById('hostScanClose');
  const hostVideo       = document.getElementById('hostVideo');
  const hostScanCanvas  = document.getElementById('hostScanCanvas');

  /* Chat */
  const chatOverlay    = document.getElementById('chatOverlay');
  const chatDrawer     = document.getElementById('chatDrawer');
  const chatClose      = document.getElementById('chatClose');
  const chatMessages   = document.getElementById('chatMessages');
  const chatPartnerName= document.getElementById('chatPartnerName');
  const chatInput      = document.getElementById('chatInput');
  const chatSend       = document.getElementById('chatSend');

  /* ══════════════════ INIT ══════════════════ */

  /* Service Worker */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            reloadBtn.classList.add('pulse');
            reloadBtn.title = 'Update verfügbar!';
          }
        });
      });
    });
  }

  versionEl.textContent = CACHE_VERSION;

  /* Player name */
  if (!playerName) {
    playerName = randomName();
    localStorage.setItem('playerName', playerName);
  }
  nameDisplay.textContent = playerName;
  nameInput.value = playerName;

  /* Theme */
  applyTheme();

  /* Mode tabs */
  setMode(currentMode, false);

  /* Online status */
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  /* Load chat history */
  try { chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}'); } catch {}

  /* ══════════════════ THEME ══════════════════ */
  function applyTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-mode', t === 'dark');
    themeBtn.textContent           = t === 'dark' ? '☀️' : '🌙';
    themeToggleDrawer.textContent  = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    applyTheme();
  }
  themeBtn.addEventListener('click', toggleTheme);
  themeToggleDrawer.addEventListener('click', toggleTheme);

  /* ══════════════════ ONLINE STATUS ══════════════════ */
  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusDot.style.background  = '#22c55e';
      statusDot.style.boxShadow   = '0 0 8px #22c55e';
      onlineStatusEl.textContent  = 'Online';
      reloadBtn.style.display     = 'flex';
    } else {
      statusDot.style.background  = '#ef4444';
      statusDot.style.boxShadow   = '0 0 8px #ef4444';
      onlineStatusEl.textContent  = 'Offline';
      reloadBtn.style.display     = 'none';
    }
  }

  /* ══════════════════ MODE TABS ══════════════════ */
  function setMode(mode, save = true) {
    currentMode = mode;
    if (save) localStorage.setItem('gameMode', mode);

    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const isMulti   = mode === 'multi';
    const connected = MP.isConnected();

    /* Lobby panel: only in multi + not connected */
    lobbyPanel.style.display      = (isMulti && !connected) ? 'block' : 'none';
    /* Connection bar: only in multi + connected */
    connectionBar.style.display   = (isMulti && connected) ? 'flex' : 'none';
    /* Chat FAB */
    chatFab.style.display         = (isMulti && connected) ? 'flex' : 'none';
    /* Disconnect in settings */
    settingsDisconnectWrap.style.display = (isMulti && connected) ? 'block' : 'none';

    /* Update card states */
    updateCardStates(mode, connected);

    /* Save mode to localStorage so games can read it */
    localStorage.setItem('gameMode', mode);
  }

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  /* ══════════════════ CARD STATES ══════════════════ */
  function updateCardStates(mode, connected) {
    gameCards.forEach(card => {
      const isMP = card.dataset.multiplayer === 'true';
      /* Remove any existing solo badge */
      const oldBadge = card.querySelector('.solo-badge');
      if (oldBadge) oldBadge.remove();

      if (mode === 'multi' && connected && !isMP) {
        /* Disable non-multiplayer games */
        card.classList.add('mp-disabled');
        const badge = document.createElement('div');
        badge.className = 'solo-badge';
        badge.textContent = 'Solo only';
        card.appendChild(badge);
      } else {
        card.classList.remove('mp-disabled');
      }
    });
  }

  /* ══════════════════ GAME CARD CLICK (Multiplayer) ══════════════════ */
  gameCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (card.classList.contains('mp-disabled')) { e.preventDefault(); return; }
      if (currentMode !== 'multi' || !MP.isConnected()) return; // normal nav

      const game = card.dataset.game;
      if (MP.role === 'guest') {
        /* Guest suggests → host sees glow */
        e.preventDefault();
        MP.send('suggest', { game });
        showToast('Vorschlag gesendet! Warte auf den Host.');
      }
      /* Host clicks → broadcast start to guest, then navigate */
      if (MP.role === 'host') {
        MP.send('start', { game, role: 'O' }); // guest gets 'O'
        /* navigate normally */
      }
    });
  });

  /* ══════════════════ SETTINGS DRAWER ══════════════════ */
  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', closeSettings);

  function openSettings() {
    nameInput.value = playerName;
    settingsOverlay.classList.add('open');
    settingsDrawer.classList.add('open');
  }
  function closeSettings() {
    settingsOverlay.classList.remove('open');
    settingsDrawer.classList.remove('open');
  }

  nameSaveBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
  function saveName() {
    const n = nameInput.value.trim();
    if (!n) return;
    playerName = n;
    localStorage.setItem('playerName', playerName);
    nameDisplay.textContent = playerName;
    showToast('Name gespeichert! 👋');
    closeSettings();
  }

  settingsDisconnectBtn.addEventListener('click', () => {
    closeSettings();
    doDisconnect();
  });
  disconnectBtn.addEventListener('click', doDisconnect);

  function doDisconnect() {
    MP.disconnect();
    onDisconnected();
    showToast('Verbindung getrennt.');
  }

  /* ══════════════════ MULTIPLAYER EVENTS ══════════════════ */
  MP.on('connected', ({ opponent }) => {
    connAvatar.textContent = (opponent || '?')[0].toUpperCase();
    connName.textContent   = opponent || 'Gegner';
    chatPartnerName.textContent = opponent || 'Gegner';
    /* Switch UI to connected state */
    lobbyPanel.style.display    = 'none';
    connectionBar.style.display = 'flex';
    chatFab.style.display       = 'flex';
    settingsDisconnectWrap.style.display = 'block';
    updateCardStates(currentMode, true);
    closeAllModals();
    showToast(`✅ Verbunden mit ${opponent}!`);
  });

  MP.on('disconnected', ({ opponent }) => {
    onDisconnected();
    if (opponent) showToast(`${opponent} hat die Verbindung getrennt.`);
  });

  MP.on('suggest', ({ game }) => {
    /* Highlight the suggested game card */
    gameCards.forEach(c => {
      c.classList.toggle('suggested', c.dataset.game === game);
    });
    suggestText.textContent = `${MP.opponent} schlägt ${game} vor!`;
    suggestToast.style.display = 'block';
    setTimeout(() => { suggestToast.style.display = 'none'; }, 4000);
  });

  MP.on('start', ({ game }) => {
    /* Guest navigates to the game */
    localStorage.setItem('mpRole', 'O');
    window.location.href = `games/${game}/index.html`;
  });

  MP.on('chat', ({ text, name }) => {
    addChatMessage(text, name, false);
    if (!chatDrawer.classList.contains('open')) {
      unreadChat++;
      chatBadge.textContent = unreadChat;
      chatBadge.style.display = 'flex';
    }
  });

  MP.on('disconnect', () => {
    onDisconnected();
    showToast('Gegner hat die Verbindung getrennt.');
  });

  function onDisconnected() {
    connectionBar.style.display = 'none';
    chatFab.style.display       = 'none';
    settingsDisconnectWrap.style.display = 'none';
    gameCards.forEach(c => { c.classList.remove('mp-disabled', 'suggested'); });
    const oldBadges = document.querySelectorAll('.solo-badge');
    oldBadges.forEach(b => b.remove());
    if (currentMode === 'multi') lobbyPanel.style.display = 'block';
  }

  /* ══════════════════ HOST FLOW ══════════════════ */
  createLobbyBtn.addEventListener('click', async () => {
    hostQrCanvas.innerHTML = '';
    hostScanGuestBtn.style.display = 'none';
    hostSpinner.style.display      = 'block';
    hostQrSubtitle.textContent     = 'QR-Code wird erstellt…';
    openModal(hostQrOverlay);

    try {
      const encoded = await MP.createOffer(playerName);
      hostSpinner.style.display = 'none';
      hostQrSubtitle.textContent = 'Lass deinen Freund diesen QR-Code scannen:';
      renderQR(hostQrCanvas, encoded);
      hostScanGuestBtn.style.display = 'flex';
    } catch(e) {
      hostQrSubtitle.textContent = '❌ Fehler beim Erstellen. Nochmal versuchen.';
      hostSpinner.style.display  = 'none';
    }
  });

  hostScanGuestBtn.addEventListener('click', () => {
    closeModal(hostQrOverlay);
    openModal(hostScanOverlay);
    startCamera(hostVideo, hostScanCanvas, async (decoded) => {
      stopCamera(scanStream);
      closeModal(hostScanOverlay);
      try {
        await MP.receiveAnswer(decoded);
        /* 'connected' event will fire automatically */
      } catch(e) {
        showToast('❌ QR-Code konnte nicht gelesen werden.');
        openModal(hostQrOverlay);
      }
    });
  });

  hostQrClose.addEventListener('click', () => {
    closeModal(hostQrOverlay);
    MP.disconnect();
  });
  hostScanClose.addEventListener('click', () => {
    stopCamera(scanStream);
    closeModal(hostScanOverlay);
    MP.disconnect();
  });

  /* ══════════════════ GUEST FLOW ══════════════════ */
  joinLobbyBtn.addEventListener('click', () => {
    guestScanStep.style.display   = 'block';
    guestAnswerStep.style.display = 'none';
    openModal(guestJoinOverlay);
    startCamera(guestVideo, guestScanCanvas, async (decoded) => {
      stopCamera(scanStream);
      guestScanStep.style.display   = 'none';
      guestAnswerStep.style.display = 'block';
      guestAnswerQr.innerHTML       = '';
      guestSpinner.style.display    = 'block';
      try {
        const answer = await MP.receiveOffer(decoded, playerName);
        guestSpinner.style.display = 'none';
        renderQR(guestAnswerQr, answer);
        /* Wait for host to scan — 'connected' event fires on DC open */
      } catch(e) {
        guestSpinner.textContent = '❌ Fehler. Bitte erneut scannen.';
      }
    });
  });

  guestJoinClose.addEventListener('click', () => {
    stopCamera(scanStream);
    closeModal(guestJoinOverlay);
    MP.disconnect();
  });

  /* ══════════════════ QR HELPERS ══════════════════ */
  function renderQR(container, text) {
    container.innerHTML = '';
    new QRCode(container, {
      text,
      width:  220,
      height: 220,
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  /* ─── CAMERA / SCANNER ─── */
  function startCamera(videoEl, canvasEl, onResult) {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
    }).then(stream => {
      scanStream = stream;
      videoEl.srcObject = stream;
      videoEl.play();

      let found = false;
      scanInterval = setInterval(() => {
        if (found || videoEl.readyState < 2) return;
        const ctx = canvasEl.getContext('2d');
        canvasEl.width  = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);
        const img = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code && code.data) {
          found = true;
          clearInterval(scanInterval);
          onResult(code.data);
        }
      }, 200);
    }).catch(() => {
      showToast('❌ Kamera-Zugriff verweigert.');
    });
  }

  function stopCamera(stream) {
    clearInterval(scanInterval);
    if (stream) stream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }

  /* ══════════════════ MODAL HELPERS ══════════════════ */
  function openModal(el)  { el.classList.add('open'); }
  function closeModal(el) { el.classList.remove('open'); }
  function closeAllModals() {
    [hostQrOverlay, guestJoinOverlay, hostScanOverlay].forEach(closeModal);
    stopCamera(scanStream);
  }

  /* ══════════════════ CHAT ══════════════════ */
  chatFab.addEventListener('click', openChat);
  chatClose.addEventListener('click', closeChat);
  chatOverlay.addEventListener('click', closeChat);

  function openChat() {
    chatOverlay.classList.add('open');
    chatDrawer.classList.add('open');
    unreadChat = 0;
    chatBadge.style.display = 'none';
    renderChatHistory();
    setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
  }
  function closeChat() {
    chatOverlay.classList.remove('open');
    chatDrawer.classList.remove('open');
  }

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text || !MP.isConnected()) return;
    MP.send('chat', { text, name: playerName });
    addChatMessage(text, playerName, true);
    chatInput.value = '';
  }

  function addChatMessage(text, name, mine) {
    const opponent = MP.opponent || 'Gegner';
    const key = opponent;
    if (!chatHistory[key]) chatHistory[key] = [];
    const msg = { text, name, mine, ts: Date.now() };
    chatHistory[key].push(msg);
    if (chatHistory[key].length > 100) chatHistory[key].shift();
    try { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); } catch {}

    if (chatDrawer.classList.contains('open')) {
      appendChatBubble(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function renderChatHistory() {
    chatMessages.innerHTML = '';
    const key = MP.opponent || '';
    (chatHistory[key] || []).forEach(msg => appendChatBubble(msg));
  }

  function appendChatBubble({ text, name, mine }) {
    const div = document.createElement('div');
    div.className = `chat-msg ${mine ? 'mine' : 'theirs'}`;
    if (!mine) {
      const n = document.createElement('div');
      n.className = 'chat-msg-name';
      n.textContent = name;
      div.appendChild(n);
    }
    const t = document.createElement('div');
    t.textContent = text;
    div.appendChild(t);
    chatMessages.appendChild(div);
  }

  /* ══════════════════ LUCKY SPIN ══════════════════ */
  randomBtn.addEventListener('click', startLuckySpin);

  function startLuckySpin() {
    const cards = [...document.querySelectorAll('.game-card:not(.mp-disabled)')];
    if (!cards.length) return;
    randomBtn.disabled = true; randomBtn.style.opacity = '0.5';
    cards.forEach(c => c.classList.remove('highlighted'));

    let idx = 0;
    let steps = 14 + Math.floor(Math.random() * 8);
    let delay = 60;

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
              randomBtn.disabled = false; randomBtn.style.opacity = '1';
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

  /* ══════════════════ INSTRUCTIONS ══════════════════ */
  instructToggle.addEventListener('click', () => {
    const open = instructBody.classList.toggle('open');
    instructToggle.classList.toggle('open', open);
  });

  /* ══════════════════ RELOAD / INSTALL ══════════════════ */
  reloadBtn.addEventListener('click', () => window.location.reload());

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    const info = document.getElementById('install-info');
    const text = document.getElementById('install-text');
    info.style.display = 'block';
    text.innerHTML = `OfflineArcade als App installieren:<br>
      <button id="install-app-btn" style="margin-top:8px;background:#22c55e;color:white;border:none;padding:7px 12px;font-weight:700;border-radius:10px;cursor:pointer;font-size:11px;width:100%;">Jetzt installieren</button>`;
    document.getElementById('install-app-btn').addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(r => {
        if (r.outcome === 'accepted') info.style.display = 'none';
        deferredPrompt = null;
      });
    });
  });

  (function checkInstall() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInstalled = window.navigator.standalone || window.matchMedia('(display-mode:standalone)').matches;
    const info = document.getElementById('install-info');
    const text = document.getElementById('install-text');
    if (isInstalled) { info.style.display = 'none'; return; }
    info.style.display = 'block';
    if (isIOS) text.innerHTML = `Tippe auf ⎙ in Safari und wähle <strong>„Zum Home-Bildschirm"</strong>.`;
  })();

});
