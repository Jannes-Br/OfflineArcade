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
  let pc   = null;
  let dc   = null;
  let role = null;
  let opponentName = null;
  let myName       = null;
  const listeners  = {};

  const ICE_CONFIG = { iceServers: [] };

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

  function send(type, data = {}) {
    if (!dc || dc.readyState !== 'open') return false;
    try { dc.send(JSON.stringify({ type, ...data })); return true; }
    catch(e) { return false; }
  }

  function isConnected() {
    return !!(dc && dc.readyState === 'open');
  }

  function waitForICE(peerConn) {
    return new Promise(resolve => {
      if (peerConn.iceGatheringState === 'complete') { resolve(); return; }
      const done = () => { if (peerConn.iceGatheringState === 'complete') resolve(); };
      peerConn.addEventListener('icegatheringstatechange', done);
      setTimeout(resolve, 6000);
    });
  }

  /* SDP minifier: strips IPv6/TCP/relay candidates → small QR codes */
  function minifySDP(sdp) {
    return sdp.split('\n').filter(line => {
      if (!line.startsWith('a=candidate:')) return true;
      if (line.includes(' :: ') || line.match(/[0-9a-f]{4}:[0-9a-f]/i)) return false;
      if (line.includes(' tcp ')) return false;
      if (line.includes(' relay ') || line.includes(' srflx ')) return false;
      return true;
    }).join('\n');
  }

  function encode(obj) {
    if (obj.sdp) obj = { ...obj, sdp: minifySDP(obj.sdp) };
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function decode(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }

  function setupPC(peerConn) {
    peerConn.onconnectionstatechange = () => {
      const s = peerConn.connectionState;
      if (s === 'connected')                      emit('connected',   { opponent: opponentName, role });
      if (s === 'disconnected' || s === 'failed') handleDisconnect();
    };
  }

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

  async function createOffer(name) {
    myName = name; role = 'host';
    pc = new RTCPeerConnection(ICE_CONFIG);
    setupPC(pc);
    const chan = pc.createDataChannel('game', { ordered: true });
    setupDC(chan);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForICE(pc);
    return encode({ sdp: pc.localDescription.sdp, type: pc.localDescription.type, name: myName });
  }

  async function receiveOffer(encodedOffer, name) {
    myName = name; role = 'guest';
    const data = decode(encodedOffer);
    opponentName = data.name;
    pc = new RTCPeerConnection(ICE_CONFIG);
    setupPC(pc);
    pc.ondatachannel = (e) => setupDC(e.channel);
    await pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForICE(pc);
    return encode({ sdp: pc.localDescription.sdp, type: pc.localDescription.type, name: myName });
  }

  async function receiveAnswer(encodedAnswer) {
    const data = decode(encodedAnswer);
    opponentName = data.name;
    await pc.setRemoteDescription({ type: data.type, sdp: data.sdp });
  }

  function disconnect() {
    send('disconnect');
    try { if (dc) dc.close(); } catch {}
    try { if (pc) pc.close(); } catch {}
    dc = null; pc = null; role = null; opponentName = null;
    emit('disconnected', {});
  }

  return {
    on, off, send, isConnected,
    createOffer, receiveOffer, receiveAnswer, disconnect,
    get role()     { return role; },
    get opponent() { return opponentName; },
    get myName()   { return myName; }
  };
})();
