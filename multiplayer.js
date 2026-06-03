/* ============================================================
   OfflineArcade – Multiplayer Core (WebRTC P2P, no server)
   ============================================================
   Flow:
   1. Host calls MP.createOffer()  → base64 string → show as QR
   2. Guest scans QR  → MP.receiveOffer(str) → base64 string → show as QR
   3. Host scans QR   → MP.receiveAnswer(str) → P2P connected
   After that everything goes over the DataChannel (no internet).
   ============================================================ */

const MP = (() => {
  /* ---- state ---- */
  let pc   = null;   // RTCPeerConnection
  let dc   = null;   // RTCDataChannel
  let role = null;   // 'host' | 'guest'
  let opponentName = null;
  let myName       = null;
  const listeners  = {};

  /* Dynamic ICE config (disabled when offline to generate codes instantly) */
  function getIceConfig() {
    if (navigator.onLine === false) {
      return { iceServers: [] };
    }
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /* ---- event bus ---- */
  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }
  function off(event, cb) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== cb);
  }
  function emit(event, data) {
    (listeners[event] || []).forEach(cb => { try { cb(data); } catch(e) {} });
  }

  /* ---- send helper ---- */
  function send(type, data = {}) {
    if (!dc || dc.readyState !== 'open') return false;
    try { dc.send(JSON.stringify({ type, ...data })); return true; }
    catch(e) { return false; }
  }

  function isConnected() {
    return !!(dc && dc.readyState === 'open');
  }

  /* ---- ICE gathering: wait until complete or timeout ---- */
  function waitForICE(peerConn) {
    return new Promise(resolve => {
      if (peerConn.iceGatheringState === 'complete') { resolve(); return; }
      const done = () => { if (peerConn.iceGatheringState === 'complete') resolve(); };
      peerConn.addEventListener('icegatheringstatechange', done);
      /* Fallback: after 1.2s take whatever we have (avoids long wait for STUN when offline) */
      setTimeout(resolve, 1200);
    });
  }

  /* ---- SDP minifier: strip fat, keep only what we need ----
     Removes IPv6 candidates, TCP candidates, and verbose
     attribute lines that are irrelevant for a LAN DataChannel.
     Reduces QR payload from ~2000 chars to ~400-600 chars.  */
  function minifySDP(sdp) {
    return sdp.split('\n').filter(line => {
      // Keep all non-candidate lines
      if (!line.startsWith('a=candidate:')) return true;
      // Drop TCP candidates
      if (line.includes(' tcp ')) return false;
      // Drop relay/srflx candidates (only keep host candidates)
      if (line.includes(' relay ') || line.includes(' srflx ')) return false;
      // Keep host candidates (both IPv4 and IPv6)
      if (line.includes(' typ host ')) return true;
      // Drop anything else that isn't a host candidate
      return false;
    }).join('\n');
  }

  /* ---- encode / decode SDP ---- */
  function encode(obj) {
    // Minify SDP before encoding to shrink QR code
    if (obj.sdp) obj = { ...obj, sdp: minifySDP(obj.sdp) };
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function decode(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }

  /* ---- shared PC setup ---- */
  function setupPC(peerConn) {
    peerConn.onconnectionstatechange = () => {
      const s = peerConn.connectionState;
      if (s === 'connected')                      emit('connected',   { opponent: opponentName, role });
      if (s === 'disconnected' || s === 'failed') handleDisconnect();
    };
  }

  /* ---- shared DC setup ---- */
  function setupDC(chan) {
    dc = chan;
    dc.onopen = () => {
      send('_hello', { name: myName });
      emit('ready', { opponent: opponentName, role });
    };
    dc.onclose  = () => handleDisconnect();
    dc.onerror  = () => handleDisconnect();
    dc.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === '_hello') {
        opponentName = msg.name;
        emit('connected', { opponent: opponentName, role });
        emit('ready',     { opponent: opponentName, role });
      } else {
        emit(msg.type, msg);
        emit('message', msg);
      }
    };
  }

  function handleDisconnect() {
    emit('disconnected', { opponent: opponentName });
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  /**
   * HOST: create WebRTC offer, return base64 string for QR code.
   */
  async function createOffer(name) {
    myName = name;
    role   = 'host';

    pc = new RTCPeerConnection(getIceConfig());
    setupPC(pc);

    const chan = pc.createDataChannel('game', { ordered: true });
    setupDC(chan);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForICE(pc);

    return encode({
      sdp:  pc.localDescription.sdp,
      type: pc.localDescription.type,
      name: myName
    });
  }

  /**
   * GUEST: receive host's base64 offer, return base64 answer for QR code.
   */
  async function receiveOffer(encodedOffer, name) {
    myName = name;
    role   = 'guest';

    const data = decode(encodedOffer);
    opponentName = data.name;

    pc = new RTCPeerConnection(getIceConfig());
    setupPC(pc);

    pc.ondatachannel = (e) => setupDC(e.channel);

    await pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForICE(pc);

    return encode({
      sdp:  pc.localDescription.sdp,
      type: pc.localDescription.type,
      name: myName
    });
  }

  /**
   * HOST: receive guest's base64 answer → connection established.
   */
  async function receiveAnswer(encodedAnswer) {
    const data = decode(encodedAnswer);
    opponentName = data.name;
    await pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
  }

  /**
   * Disconnect and clean up.
   */
  function disconnect() {
    send('disconnect');
    try { if (dc) dc.close(); } catch {}
    try { if (pc) pc.close(); } catch {}
    dc   = null;
    pc   = null;
    role = null;
    opponentName = null;
    emit('disconnected', {});
  }

  const instance = {
    on, off, send, isConnected,
    createOffer, receiveOffer, receiveAnswer, disconnect,
    get role()     { return role; },
    get opponent() { return opponentName; },
    get myName()   { return myName; }
  };
  window.MP = instance;
  return instance;
})();
