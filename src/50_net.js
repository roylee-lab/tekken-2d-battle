// ============================================================
//  온라인 대전 (PeerJS / WebRTC, 호스트 권한 방식)
//  - 방 코드: 어디서든 접속
//  - 같은 와이파이 자동 매칭: 같은 공인 IP끼리 같은 로비 ID를 사용
// ============================================================
const NET_VER = 4;
const NET = {
  peer: null, conn: null, role: null, status: '', onMsg: null, ping: 0, lastRecv: 0,
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
  try { if (NET.conn) NET.conn.close(); } catch (e) { /* 무시 */ }
  try { if (NET.peer) NET.peer.destroy(); } catch (e) { /* 무시 */ }
  NET.peer = null; NET.conn = null; NET.role = null; NET.snap = null; NET.inEv = []; NET.outEv = [];
  NET.lastCounts = { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0 }; NET.guestCounts = null; NET.guestHeld = 0;
  clearTimeout(NET._timer);
}

function genCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

function wireConn(conn, role) {
  NET.conn = conn; NET.role = role;
  conn.on('data', (m) => { NET.lastRecv = performance.now(); onNetMsg(m); });
  conn.on('close', () => onNetClosed());
  conn.on('error', () => onNetClosed());
  const ready = () => {
    clearTimeout(NET._timer);
    conn.send({ t: 'hi', v: NET_VER });
    onNetConnected(role);
  };
  if (conn.open) ready(); else conn.on('open', ready);
}

function hostOn(id, onOpen, onTaken, onFail) {
  if (typeof Peer === 'undefined') { onFail('PeerJS를 불러오지 못했습니다'); return; }
  const peer = new Peer(id, peerOpts());
  NET.peer = peer;
  let opened = false;
  peer.on('open', () => { opened = true; onOpen(peer); });
  peer.on('connection', (c) => {
    if (NET.conn && NET.conn.open) { c.on('open', () => { c.send({ t: 'busy' }); setTimeout(() => c.close(), 300); }); return; }
    wireConn(c, 'host');
  });
  peer.on('error', (err) => {
    if (err.type === 'unavailable-id' && !opened) { try { peer.destroy(); } catch (e) { /* 무시 */ } NET.peer = null; onTaken(); }
    else if (!opened) onFail(errText(err));
    else if (!NET.conn) netStatus('⚠️ 서버 연결 문제: ' + errText(err));
  });
  peer.on('disconnected', () => { if (!NET.conn) { try { peer.reconnect(); } catch (e) { /* 무시 */ } } });
}

function joinTo(id, onFail, timeoutMs) {
  if (typeof Peer === 'undefined') { onFail('PeerJS를 불러오지 못했습니다'); return; }
  const peer = new Peer(peerOpts());
  NET.peer = peer;
  let done = false;
  const fail = (msg) => { if (done) return; done = true; clearTimeout(NET._timer); try { peer.destroy(); } catch (e) { /* 무시 */ } NET.peer = null; NET.conn = null; onFail(msg); };
  peer.on('open', () => {
    const c = peer.connect(id, { reliable: true, serialization: 'json' });
    c.on('data', (m) => { if (m && m.t === 'busy') fail('busy'); });
    c.on('open', () => { if (done) return; done = true; wireConn(c, 'guest'); });
    NET._timer = setTimeout(() => fail('timeout'), timeoutMs || 8000);
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
  if (code.length < 4) { netStatus('방 코드 4자리를 입력해 주세요'); return; }
  netStatus(`<b>${code}</b> 방에 접속하는 중...`);
  joinTo('tk2d-room-' + code, (why) => {
    netStatus(why === 'busy' ? '❌ 이미 대전 중인 방이에요' : why === 'notfound' ? '❌ 방을 찾을 수 없어요. 코드를 확인해 주세요' : why === 'timeout' ? '❌ 응답이 없어요. 다시 시도해 주세요' : '❌ ' + why);
  }, 10000);
}
// --- 같은 와이파이 자동 매칭 ---
async function netAutoLan() {
  netReset();
  netStatus('네트워크 확인 중...');
  let ip = null;
  for (const url of ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json']) {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(url, { signal: ctl.signal }); clearTimeout(tm);
      const j = await r.json(); if (j && j.ip) { ip = j.ip; break; }
    } catch (e) { /* 다음 시도 */ }
  }
  if (!ip) { netStatus('❌ 네트워크 정보를 확인하지 못했어요.<br>방 만들기 / 코드 참가를 이용해 주세요'); return; }
  const base = 'tk2d-lan-' + hashStr('tk2d|' + ip).toString(36);
  let slot = 0;
  const trySlot = () => {
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
  hideLobby();
  goSelect();
  NET._ping = setInterval(() => netSend({ t: 'ping', ts: performance.now() }), 1000);
}
function onNetClosed() {
  if (!NET.conn && !NET.role) return;
  clearInterval(NET._ping);
  const wasOnline = APP.mode === 'online';
  netReset();
  if (wasOnline) { APP.mode = 'cpu'; APP.mySide = 0; toast('상대와의 연결이 끊어졌습니다'); goTitle(); }
}

function onNetMsg(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.t) {
    case 'hi': if (m.v !== NET_VER) toast('게임 버전이 달라요. 둘 다 새로고침해 주세요'); break;
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
