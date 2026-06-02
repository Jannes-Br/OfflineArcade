/* ============================================================
   OfflineArcade – main.js  (complete rewrite with multiplayer)
   ============================================================ */

const CACHE_VERSION = 'v85';
const MULTIPLAYER_GAMES = ['tic-tac-toe', '2048'];

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
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ── State ── */
let currentMode    = localStorage.getItem('gameMode') || 'solo';
let playerName     = localStorage.getItem('playerName') || '';
let unreadChat     = 0;
let chatHistory    = {};
let scanStream     = null;
let scanInterval   = null;

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
  const guestPasteHostBtn = document.getElementById('guestPasteHostBtn');
  const guestAnswerStep   = document.getElementById('guestAnswerStep');
  const guestAnswerCodeBox= document.getElementById('guestAnswerCodeBox');
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

  /* ══════════════════ INIT ══════════════════ */

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

  if (!playerName) {
    playerName = randomName();
    localStorage.setItem('playerName', playerName);
  }
  nameDisplay.textContent = playerName;
  nameInput.value = playerName;

  applyTheme();
  setMode(currentMode, false);
  updateOnlineStatus();
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  try { chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}'); } catch {}

  /* ══════════════════ THEME ══════════════════ */
  function applyTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-mode', t === 'dark');
    themeToggleDrawer.textContent = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    applyTheme();
  }
  themeToggleDrawer.addEventListener('click', toggleTheme);

  /* ══════════════════ ONLINE STATUS ══════════════════ */
  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusDot.style.background = '#22c55e';
      statusDot.style.boxShadow  = '0 0 8px #22c55e';
      onlineStatusEl.textContent = 'Online';
      reloadBtn.style.display    = 'flex';
    } else {
      statusDot.style.background = '#ef4444';
      statusDot.style.boxShadow  = '0 0 8px #ef4444';
      onlineStatusEl.textContent = 'Offline';
      reloadBtn.style.display    = 'none';
    }
  }

  /* ══════════════════ MODE TABS ══════════════════ */
  function setMode(mode, save = true) {
    currentMode = mode;
    if (save) localStorage.setItem('gameMode', mode);

    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const isMulti   = mode === 'multi';
    const connected = MP.isConnected();

    lobbyPanel.style.display             = isMulti ? 'block' : 'none';
    chatFab.style.display                = (isMulti &&  connected) ? 'flex'  : 'none';
    settingsDisconnectWrap.style.display = (isMulti &&  connected) ? 'block' : 'none';

    if (isMulti) {
      if (connected) {
        lobbyActions.style.display = 'none';
        lobbyConnectedActions.style.display = 'flex';
        lobbyDisconnectBtn.innerHTML = `<span>✕</span> Verbindung trennen (mit <strong>${MP.opponent || 'Gegner'}</strong> verbunden)`;
        lobbyHint.textContent = `Wähle ein spiel aus, um zu starten.`;
      } else {
        lobbyActions.style.display = 'flex';
        lobbyConnectedActions.style.display = 'none';
        lobbyHint.textContent = 'Erstelle eine Verbindung und tausche den Code aus.';
      }
    }

    updateCardStates(mode, connected);
    localStorage.setItem('gameMode', mode);
  }

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  /* ══════════════════ CARD STATES ══════════════════ */
  function updateCardStates(mode, connected) {
    gameCards.forEach(card => {
      const isMP = card.dataset.multiplayer === 'true';
      const old  = card.querySelector('.solo-badge');
      if (old) old.remove();

      if (mode === 'multi' && connected && !isMP) {
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

  /* ══════════════════ GAME CARD CLICK ══════════════════ */
  gameCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (card.classList.contains('mp-disabled')) { e.preventDefault(); return; }
      const game = card.dataset.game;
      e.preventDefault();

      if (currentMode === 'multi' && MP.isConnected()) {
        if (MP.role === 'guest') {
          MP.send('suggest', { game });
          showToast('Vorschlag gesendet! Warte auf den Host.');
        }
        if (MP.role === 'host') {
          MP.send('start', { game, role: 'O' });
          localStorage.setItem('mpRole', 'X'); // Host is X
          openGameFrame(game);
        }
      } else {
        // Solo or Bot mode
        openGameFrame(game);
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

  lobbyDisconnectBtn.addEventListener('click', doDisconnect);
  settingsDisconnectBtn.addEventListener('click', () => { closeSettings(); doDisconnect(); });

  function doDisconnect() {
    MP.disconnect();
    onDisconnected();
    showToast('Verbindung getrennt.');
  }

  /* ══════════════════ MULTIPLAYER EVENTS ══════════════════ */
  MP.on('connected', ({ opponent }) => {
    chatPartnerName.textContent = opponent || 'Gegner';
    closeAllModals();
    setMode(currentMode, false);
    showToast(`✅ Verbunden mit ${opponent}!`);
  });

  MP.on('disconnected', ({ opponent }) => {
    MP.disconnect(); // Sauberen Reset durchführen
    onDisconnected();
    if (opponent) showToast(`${opponent} hat die Verbindung getrennt.`);
  });

  MP.on('suggest', ({ game }) => {
    gameCards.forEach(c => c.classList.toggle('suggested', c.dataset.game === game));
    suggestText.textContent    = `${MP.opponent} schlägt ${game} vor!`;
    suggestToast.style.display = 'block';
    setTimeout(() => { suggestToast.style.display = 'none'; }, 4000);
  });

  MP.on('start', ({ game }) => {
    localStorage.setItem('mpRole', 'O');
    openGameFrame(game);
  });

  MP.on('chat', ({ text, name }) => {
    addChatMessage(text, name, false);
    if (!chatDrawer.classList.contains('open')) {
      unreadChat++;
      chatBadge.textContent    = unreadChat;
      chatBadge.style.display  = 'flex';
    }
  });

  MP.on('disconnect', () => {
    onDisconnected();
    showToast('Gegner hat die Verbindung getrennt.');
  });

  function onDisconnected() {
    chatFab.style.display                = 'none';
    settingsDisconnectWrap.style.display = 'none';
    gameCards.forEach(c => c.classList.remove('mp-disabled', 'suggested'));
    document.querySelectorAll('.solo-badge').forEach(b => b.remove());
    setMode(currentMode, false);
  }

  /* ══════════════════ HOST FLOW ══════════════════ */
  createLobbyBtn.addEventListener('click', async () => {
    hostCodeBox.innerHTML          = '';
    hostCodeBox.style.display      = 'none';
    hostShareActions.style.display = 'none';
    hostPasteGuestBtn.style.display = 'none';
    hostSpinner.style.display      = 'block';
    hostQrSubtitle.textContent     = 'Code wird erstellt…';
    openModal(hostQrOverlay);

    try {
      const encoded = await MP.createOffer(playerName);
      hostSpinner.style.display  = 'none';
      hostQrSubtitle.textContent = 'Teile diesen Code mit deinem Gast:';
      hostCodeBox.textContent    = encoded;
      hostCodeBox.style.display  = 'block';
      hostShareActions.style.display = 'flex';
      hostPasteGuestBtn.style.display = 'flex';

      hostCopyBtn.onclick = () => {
        navigator.clipboard.writeText(encoded)
          .then(() => showToast('📋 Code kopiert!'))
          .catch(() => showToast('❌ Fehler beim Kopieren.'));
      };

      hostShareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({
            title: 'OfflineArcade Verbindung',
            text: encoded
          }).then(() => showToast('Erfolgreich geteilt!'))
            .catch(() => {});
        } else {
          showToast('Teilen nicht unterstützt. Bitte manuell kopieren.');
        }
      };
    } catch(e) {
      hostQrSubtitle.textContent = '❌ Fehler beim Erstellen. Nochmal versuchen.';
      hostSpinner.style.display  = 'none';
    }
  });

  hostPasteGuestBtn.addEventListener('click', async () => {
    let text = "";
    try { text = await navigator.clipboard.readText(); } catch(e) {}
    if (!text) text = prompt("Füge den Verbindungscode des Gastes hier ein:");
    text = text ? text.trim() : "";
    if (!text) return;
    closeModal(hostQrOverlay);
    try {
      await MP.receiveAnswer(text);
    } catch(e) {
      showToast('❌ Ungültiger Code.');
      openModal(hostQrOverlay);
    }
  });

  hostQrClose.addEventListener('click',  () => { closeModal(hostQrOverlay);  MP.disconnect(); });

  /* ══════════════════ GUEST FLOW ══════════════════ */
  joinLobbyBtn.addEventListener('click', () => {
    guestScanStep.style.display   = 'block';
    guestAnswerStep.style.display = 'none';
    openModal(guestJoinOverlay);
  });

  async function guestProcessOffer(offerText) {
    guestScanStep.style.display   = 'none';
    guestAnswerStep.style.display = 'block';
    guestAnswerCodeBox.innerHTML  = '';
    guestSpinner.style.display    = 'block';
    try {
      const answer = await MP.receiveOffer(offerText, playerName);
      guestSpinner.style.display = 'none';
      guestAnswerCodeBox.textContent = answer;

      guestCopyBtn.onclick = () => {
        navigator.clipboard.writeText(answer)
          .then(() => showToast('📋 Code kopiert!'))
          .catch(() => showToast('❌ Fehler beim Kopieren.'));
      };

      guestShareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({
            title: 'OfflineArcade Verbindung',
            text: answer
          }).then(() => showToast('Erfolgreich geteilt!'))
            .catch(() => {});
        } else {
          showToast('Teilen nicht unterstützt. Bitte manuell kopieren.');
        }
      };
    } catch(e) {
      guestSpinner.textContent = '❌ Fehler. Bitte erneut versuchen.';
    }
  }

  guestPasteHostBtn.addEventListener('click', async () => {
    let text = "";
    try { text = await navigator.clipboard.readText(); } catch(e) {}
    if (!text) text = prompt("Füge den Verbindungscode des Hosts hier ein:");
    text = text ? text.trim() : "";
    if (!text) return;
    guestProcessOffer(text);
  });

  guestJoinClose.addEventListener('click', () => { closeModal(guestJoinOverlay); MP.disconnect(); });

  /* ══════════════════ GAME FRAME OVERLAY CONTROL ══════════════════ */
  function openGameFrame(game) {
    gameFrame.src = `games/${game}/index.html`;
    gameFrameOverlay.style.display = "flex";
  }
  window.openGameFrame = openGameFrame;

  function closeGameFrame() {
    gameFrame.src = "";
    gameFrameOverlay.style.display = "none";
    if (MP.isConnected()) {
      MP.send('menu');
    }
  }
  window.closeGameFrame = closeGameFrame;

  MP.on('menu', () => {
    if (gameFrameOverlay.style.display !== "none") {
      gameFrame.src = "";
      gameFrameOverlay.style.display = "none";
      showToast(`${MP.opponent || 'Gegner'} ist zurück im Menü.`);
    }
  });

  /* ══════════════════ MODAL HELPERS ══════════════════ */
  function openModal(el)  { el.classList.add('open'); }
  function closeModal(el) { el.classList.remove('open'); }
  function closeAllModals() {
    [hostQrOverlay, guestJoinOverlay].forEach(closeModal);
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
    const key = MP.opponent || 'Gegner';
    if (!chatHistory[key]) chatHistory[key] = [];
    chatHistory[key].push({ text, name, mine, ts: Date.now() });
    if (chatHistory[key].length > 100) chatHistory[key].shift(); // keep max 100
    try { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); } catch {}

    if (chatDrawer.classList.contains('open')) {
      appendChatBubble({ text, name, mine });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  window.addChatMessageFromGame = addChatMessage;

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
      n.className   = 'chat-msg-name';
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
    randomBtn.disabled     = true;
    randomBtn.style.opacity = '0.5';
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
              randomBtn.disabled      = false;
              randomBtn.style.opacity = '1';
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

  const installCloseBtn = document.getElementById('installCloseBtn');
  if (installCloseBtn) {
    installCloseBtn.addEventListener('click', () => {
      document.getElementById('install-info').style.display = 'none';
      localStorage.setItem('installBannerDismissed', 'true');
    });
  }

  (function checkInstall() {
    const isIOS      = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInstalled= window.navigator.standalone || window.matchMedia('(display-mode:standalone)').matches;
    const dismissed  = localStorage.getItem('installBannerDismissed') === 'true';
    const info       = document.getElementById('install-info');
    const text       = document.getElementById('install-text');
    if (isInstalled || dismissed) { info.style.display = 'none'; return; }
    info.style.display = 'block';
    if (isIOS) text.innerHTML = `Tippe auf ⎙ in Safari und wähle <strong>„Zum Home-Bildschirm"</strong>.`;
  })();

});

{
  "name": "OfflineArcade",
  "short_name": "OfflineArcade",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#181921",
  "theme_color": "#4cc9f0",
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
