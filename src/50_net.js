// ============================================================
//  온라인 대전 (PeerJS / WebRTC, 호스트 권한 방식)
//  - 방 코드: 어디서든 접속
//  - 같은 와이파이 자동 매칭: 같은 공인 IP끼리 같은 로비 ID를 사용
// ============================================================
const NET_VER = 6;
const NET = {
  epoch: 0, peer: null, conn: null, role: null, status: '', onMsg: null, ping: 0, lastRecv: 0,
  guestHeld: 0, guestCounts: null, lastCounts: { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0 }, outEv: [], inEv: [], snap: null,
};

function peerOpts() {
  const q = new URLSearchParams(location.search);
  const o = { debug: 0 };
  if (q.get('peerhost')) { o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 9000); o.path = q.get('peerpath') || '/'; o.secure = q.get('peersecure') === '1'; }
  return o;
}
function netStatus(s) { NET.status = s; const el = document.getElementById('netStatus'); if (el) el.innerHTML = s; }

function netReset() {
  const conn = NET.conn, peer = NET.peer;
  NET.epoch++; NET.conn = null; NET.peer = null; NET.role = null;
  clearTimeout(NET._timer); clearInterval(NET._ping);
  try { conn?.close(); } catch (_) {}
  try { peer?.destroy(); } catch (_) {}
  NET.snap = null; NET.oppNick = null; NET.inEv = []; NET.outEv = [];
  NET.lastCounts = { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0 };
  NET.guestCounts = null; NET.guestHeld = 0; NET.lastRecv = performance.now();
  _lastSentIn = '';
}
async function hostOn(id, onOpen, onTaken, onFail) {
  const epoch = NET.epoch;
  if (new URLSearchParams(location.search).has('peerhost')) return hostOnPeer(id,onOpen,onTaken,onFail);
  try {
    const config = await rtcConfig(); if (NET.epoch !== epoch) return;
    if (config.signaling) return rtcHost(id,onOpen,onTaken,onFail);
    hostOnPeer(id,onOpen,onTaken,onFail);
  } catch (e) { if (NET.epoch === epoch) onFail('접속 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'); }
}
async function joinTo(id, onFail, timeoutMs) {
  const epoch = NET.epoch;
  if (new URLSearchParams(location.search).has('peerhost')) return joinToPeer(id,onFail,timeoutMs);
  try {
    const config = await rtcConfig(); if (NET.epoch !== epoch) return;
    if (config.signaling) return rtcJoin(id,onFail);
    joinToPeer(id,onFail,timeoutMs);
  } catch (e) { if (NET.epoch === epoch) onFail('접속 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.'); }
}

function genCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

function wireConn(conn, role) {
  NET.conn = conn; NET.role = role;
  conn.on('data', (m) => { if (NET.conn !== conn) return; NET.lastRecv = performance.now(); onNetMsg(m); });
  const early = conn._pending || []; conn._pending = null;
  conn.on('close', () => { if (NET.conn === conn) onNetClosed(); });
  conn.on('error', () => { if (NET.conn === conn) onNetClosed(); });
  const ready = () => {
    if (NET.conn !== conn || conn._gameReady) return;
    conn._gameReady = true; NET.lastRecv = performance.now();
    clearTimeout(NET._timer);
    conn.send({ t: 'hi', v: NET_VER, nick: (typeof ACC !== 'undefined' && ACC.token) ? ACC.nick : null });
    onNetConnected(role);
    for (const m of early) onNetMsg(m);
  };
  if (conn.open) ready(); else conn.on('open', ready);
}

function hostOnPeer(id, onOpen, onTaken, onFail) {
  if (typeof Peer === 'undefined') { onFail('PeerJS를 불러오지 못했습니다'); return; }
  const peer = new Peer(id, peerOpts());
  NET.peer = peer;
  let opened = false;
  const tm = setTimeout(() => { if (!opened && NET.peer === peer) { try { peer.destroy(); } catch (e) { /* 무시 */ } NET.peer = null; onFail('중계 서버에 연결하지 못했어요 (잠시 후 다시 시도)'); } }, 12000);
  peer.on('open', () => { if (NET.peer !== peer) return; opened = true; clearTimeout(tm); onOpen(peer); });
  peer.on('connection', (c) => {
    if (NET.peer !== peer) { c.close(); return; }
    if (NET.conn && NET.conn.open) { c.on('open', () => { c.send({ t: 'busy' }); setTimeout(() => c.close(), 300); }); return; }
    wireConn(c, 'host');
  });
  peer.on('error', (err) => {
    if (NET.peer !== peer) return; clearTimeout(tm);
    if (err.type === 'unavailable-id' && !opened) { try { peer.destroy(); } catch (e) { /* 무시 */ } NET.peer = null; onTaken(); }
    else if (!opened) onFail(errText(err));
    else if (!NET.conn) netStatus('⚠️ 서버 연결 문제: ' + errText(err));
  });
  peer.on('disconnected', () => { if (!NET.conn) { try { peer.reconnect(); } catch (e) { /* 무시 */ } } });
}

function joinToPeer(id, onFail, timeoutMs) {
  if (typeof Peer === 'undefined') { onFail('PeerJS를 불러오지 못했습니다'); return; }
  const peer = new Peer(peerOpts());
  NET.peer = peer;
  let done = false;
  NET._timer = setTimeout(() => fail('timeout'), timeoutMs || 15000);
  const fail = (msg) => { if (done || NET.peer !== peer) return; done = true; clearTimeout(NET._timer); try { peer.destroy(); } catch (e) { /* 무시 */ } NET.peer = null; NET.conn = null; onFail(msg); };
  peer.on('open', () => {
    if (done || NET.peer !== peer) return;
    const c = peer.connect(id, { reliable: true, serialization: 'json' });
    c._pending = [];
    c.on('data', (m) => { if (m && m.t === 'busy') fail('busy'); else if (c._pending) c._pending.push(m); });
    c.on('open', () => { if (done) return; done = true; wireConn(c, 'guest'); });
    c.on('error', () => fail('기기 간 연결에 실패했어요. 다른 네트워크나 TURN 중계를 확인해주세요.'));
    c.on('close', () => { if (!c.open) fail('상대가 방을 닫았어요.'); });
  });
  peer.on('error', (err) => fail(err.type === 'peer-unavailable' ? 'notfound' : errText(err)));
}

function errText(err) {
  const m = { network: '네트워크 오류 (인터넷 연결 확인)', 'server-error': '중계 서버 오류', 'browser-incompatible': '이 브라우저는 WebRTC를 지원하지 않아요', 'peer-unavailable': '방을 찾을 수 없어요', 'unavailable-id': '이미 사용 중인 방 코드', 'socket-error': '서버 연결 실패', 'socket-closed': '서버 연결이 끊김' };
  return m[err && err.type] || ('오류: ' + (err && (err.type || err.message)));
}

// --- 방 만들기 ---
function netCreateRoom() {
  netReset();
  const code = genCode();
  netStatus('방을 만드는 중...');
  hostOn('tk2d-room-' + code, () => {
    netStatus(`방 코드 <b class="code">${code}</b><br>친구에게 이 코드를 알려 주세요. 기다리는 중...`);
  }, () => netCreateRoom(), (msg) => netStatus('❌ ' + msg));
}
// --- 코드로 참가 ---
function netJoinRoom(code) {
  netReset();
  code = (code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) { netStatus('방 코드 4자리를 입력해 주세요'); return; }
  netStatus(`<b>${code}</b> 방에 접속하는 중...`);
  joinTo('tk2d-room-' + code, (why) => {
    netStatus(why === 'busy' ? '❌ 이미 대전 중인 방이에요' : why === 'notfound' ? '❌ 방을 찾을 수 없어요. 코드를 확인해 주세요' : why === 'timeout' ? '❌ 응답이 없어요. 다시 시도해 주세요' : '❌ ' + why);
  }, 10000);
}
// --- 같은 와이파이 자동 매칭 ---
async function netAutoLan() {
  netReset();
  netStatus('네트워크 확인 중...');
  const epoch = NET.epoch;
  let config;
  try { config = await rtcConfig(); } catch (_) { if (NET.epoch === epoch) netStatus('❌ 자동 매칭 정보를 받지 못했어요. 방 코드를 이용해주세요.'); return; }
  if (NET.epoch !== epoch) return;
  if (!config.network) { netStatus('❌ 네트워크를 확인할 수 없어요. 방 코드를 이용해주세요.'); return; }
  const base = 'tk2d-lan-' + config.network;
  let slot = 0;
  const trySlot = () => {
    if (NET.epoch !== epoch) return;
    if (slot >= 4) { netStatus('❌ 자동 매칭 실패. 방 코드를 이용해 주세요'); return; }
    const id = base + '-' + slot;
    netStatus(`같은 와이파이에서 상대를 찾는 중... (${slot + 1})`);
    hostOn(id, () => {
      netStatus('📶 같은 와이파이의 상대를 기다리는 중...<br>친구도 <b>같은 와이파이 자동 매칭</b>을 누르면 연결돼요');
    }, () => {
      joinTo(id, () => { slot++; trySlot(); }, 6000);
    }, (msg) => netStatus('❌ ' + msg));
  };
  trySlot();
}

function netSend(m) { if (NET.conn && NET.conn.open) { try { NET.conn.send(m); } catch (e) { /* 무시 */ } } }

function onNetConnected(role) {
  netStatus('✅ 연결 완료!');
  APP.mode = 'online';
  APP.mySide = role === 'host' ? 0 : 1;
  hideLobby(); hideAccount();
  ACC.waiting = null;
  goSelect();
  renderInvitePop();
  clearInterval(NET._ping);
  NET.lastRecv = performance.now();
  NET._ping = setInterval(() => {
    if (performance.now() - NET.lastRecv > 20000) { onNetClosed(); return; }
    netSend({ t: 'ping', ts: performance.now() });
  }, 1000);
}
function onNetClosed() {
  if (!NET.conn && !NET.role) return;
  clearInterval(NET._ping);
  const wasOnline = APP.mode === 'online';
  netReset();
  if (!wasOnline) { ACC.waiting = null; ACC.busyBtn = false; accMsg('기기 간 연결을 완료하지 못했어요. 새 방으로 다시 시도해주세요.'); }
  if (wasOnline) { APP.mode = 'cpu'; APP.mySide = 0; toast('상대와의 연결이 끊어졌습니다'); goTitle(); }
}

function onNetMsg(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.t) {
    case 'hi': NET.oppNick = typeof m.nick === 'string' ? m.nick.slice(0, 12) : null; if (m.v !== NET_VER) { onNetClosed(); toast('게임 버전이 달라요. 둘 다 새로고침해 주세요'); } break;
    case 'ping': netSend({ t: 'pong', ts: m.ts }); break;
    case 'pong': NET.ping = Math.round(performance.now() - m.ts); break;
    case 'sel': APP.sel.opp = { cur: m.cur, ready: m.ready, c: m.c }; if (NET.role === 'host') maybeStartOnline(); break;
    case 'start': if (NET.role === 'guest') startVS(m.c0, m.c1, m.stage, m.seed); break;
    case 'in': // 게스트 입력 (호스트 수신)
      NET.guestHeld = m.h; NET.guestCounts = m.c; break;
    case 'st': // 상태 스냅샷 (게스트 수신)
      if (NET.role === 'guest') { NET.snap = m.g; if (m.e && m.e.length) NET.inEv.push(...m.e); }
      break;
    case 'menu': if (m.to === 'select') goSelect(); break;
    default: break;
  }
}

// 호스트: 게스트 입력 해석
function guestInput() {
  let p = 0;
  const c = NET.guestCounts;
  if (c) {
    for (const k of ['U', 'P', 'K', 'S1', 'S2', 'S3', 'S4']) { if ((c[k] || 0) > NET.lastCounts[k]) p |= BTN_BIT[k]; NET.lastCounts[k] = c[k] || 0; }
  }
  return { h: NET.guestHeld | 0, p };
}
// 게스트: 내 입력 보내기
let _lastSentIn = '';
function sendMyInput(force) {
  const h = IN.heldMask(), c = IN.counts;
  const key = h + ':' + c.U + ':' + c.P + ':' + c.K + ':' + c.S1 + ':' + c.S2 + ':' + c.S3 + ':' + c.S4;
  if (key !== _lastSentIn || force) { _lastSentIn = key; netSend({ t: 'in', h, c: { U: c.U, P: c.P, K: c.K, S1: c.S1, S2: c.S2, S3: c.S3, S4: c.S4 } }); }
}

// 스냅샷 (기본값과 같은 필드는 생략 → 용량 절감)
const _FDEF = makeFighter(0, 0);
function packFighter(F) {
  const o = {};
  for (const k in F) {
    const v = F[k];
    if (k === 'cd' || k === 'seal') { if (v.some((x) => x)) o[k] = v; continue; }
    if (v === _FDEF[k] && k !== 'side' && k !== 'c') continue;
    o[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  }
  return o;
}
function snapshot(G) {
  return {
    phase: G.phase, pt: G.pt, round: G.round, timer: G.timer, roundF: G.roundF,
    F: G.F.map(packFighter), proj: G.proj.map((p) => ({ t: p.t, x: Math.round(p.x * 10) / 10, y: Math.round(p.y), vx: p.vx, o: p.o, age: p.age, k: p.k })),
    traps: G.traps, freezeT: G.freezeT, dice: G.dice, notes: G.notes, stage: G.stage, rw: G.rw, mw: G.mw, koType: G.koType, perfect: G.perfect, flash: G.flash,
  };
}
function unpack(s) {
  s.F = s.F.map((f) => { const F = Object.assign(makeFighter(f.side, f.c), f); if (!f.cd) F.cd = [0, 0, 0, 0]; if (!f.seal) F.seal = [0, 0, 0, 0]; return F; });
  s.ev = [];
  return s;
}
