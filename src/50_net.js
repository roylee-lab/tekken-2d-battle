// ============================================================
//  온라인 대전 (PeerJS / WebRTC, 호스트 권한 방식)
//  - 방 코드: 어디서든 접속
//  - 같은 와이파이: 같은 공유기(공인 IP, IPv6는 앞 64비트)에서 열린 방 목록에서 골라 참가
// ============================================================
const NET_VER = 16;
const NET = {
  epoch: 0, peer: null, conn: null, role: null, status: '', onMsg: null, ping: 0, lastRecv: 0,
  guestHeld: 0, guestCounts: null, guestKs: [], guestAny: 0, lastKeySeq: 0, lastAny: 0, lastCounts: { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0 }, outEv: [], inEv: [], snap: null,
};

function peerOpts() {
  const q = new URLSearchParams(location.search);
  const o = { debug: 0 };
  if (typeof RTC_CONFIG !== 'undefined' && RTC_CONFIG && RTC_CONFIG.iceServers) o.config = { iceServers: RTC_CONFIG.iceServers };
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
  NET.snap = null; NET.oppNick = null; NET.oppCeo = false; NET.inEv = []; NET.outEv = [];
  NET.lastCounts = { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0 };
  NET.guestCounts = null; NET.guestHeld = 0; NET.guestKs = []; NET.guestAny = 0; NET.lastKeySeq = 0; NET.lastAny = 0; NET.lastRecv = performance.now();
  _lastSentIn = '';
}
// 방 열기: 같은 사이트 서버(/api/rtc)로 접속 정보 교환 → 서버(DB)가 안 되면 PeerJS 공용 서버로 자동 전환
async function hostOn(id, onOpen, onTaken, onFail, opts) {
  opts = opts || {};
  const epoch = NET.epoch;
  if (new URLSearchParams(location.search).has('peerhost')) return hostOnPeer(id, onOpen, onTaken, onFail);
  let config = null;
  try { config = await rtcConfig(); } catch (e) { /* 아래에서 PeerJS로 */ }
  if (NET.epoch !== epoch) return;
  if (!config || !config.signaling) { hostOnPeer(id, onOpen, onTaken, onFail); return; }
  rtcHost(id, onOpen, onTaken, (e, serverDown) => {
    if (NET.epoch !== epoch) return;
    if (serverDown) { if (opts.onStatus) opts.onStatus('접속 서버가 바빠서 다른 경로(PeerJS)로 방을 여는 중...'); hostOnPeer(id, onOpen, onTaken, onFail); return; }
    onFail(typeof e === 'string' ? e : e.message);
  }, opts);
}
async function joinTo(id, onFail, timeoutMs, opts) {
  opts = opts || {};
  const epoch = NET.epoch;
  if (new URLSearchParams(location.search).has('peerhost')) return joinToPeer(id, onFail, timeoutMs);
  let config = null;
  try { config = await rtcConfig(); } catch (e) { /* 아래에서 PeerJS로 */ }
  if (NET.epoch !== epoch) return;
  if (!config || !config.signaling) { joinToPeer(id, onFail, timeoutMs); return; }
  rtcJoin(id, (e, serverDown) => {
    if (NET.epoch !== epoch) return;
    // 서버에 방이 없으면 PeerJS로 열린 방일 수 있음 → PeerJS로 한 번 더 찾아봄
    if (serverDown || e === 'notfound') { if (opts.onStatus) opts.onStatus('다른 경로(PeerJS)로 방을 찾는 중...'); joinToPeer(id, onFail, 15000); return; }
    onFail(typeof e === 'string' ? e : e.message);
  }, opts);
}

function genCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

function wireConn(conn, role) {
  NET.conn = conn; NET.role = role;
  conn.on('data', (m) => { if (NET.conn !== conn) return; NET.lastRecv = performance.now(); onNetMsg(m); });
  const early = conn._pending || []; conn._pending = null;
  // 게임 연결이 완성되기 전의 끊김은 접속 단계(49_rtc)가 재시도/안내를 맡는다 (예전엔 여기서 전부 초기화돼 '로딩만' 되는 상태가 됐음)
  const lost = () => { if (NET.conn !== conn) return; if (conn._gameReady || !conn.pc) onNetClosed(); else { NET.conn = null; NET.role = null; } };
  conn.on('close', lost);
  conn.on('error', lost);
  const ready = () => {
    if (NET.conn !== conn || conn._gameReady) return;
    conn._gameReady = true; NET.lastRecv = performance.now();
    clearTimeout(NET._timer);
    conn.send({ t: 'hi', v: NET_VER, nick: (typeof ACC !== 'undefined' && ACC.token) ? ACC.nick : null, ceo: typeof myCeo === 'function' && !!ACC.token && myCeo() });
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
function netCreateRoom(lan) {
  netReset();
  const code = genCode();
  netStatus('방을 만드는 중...');
  const base = lan ? '📶 같은 와이파이에 방을 열었어요' : `방 코드 <b class="code">${code}</b><br>친구에게 이 코드를 알려 주세요.`;
  hostOn('tk2d-room-' + code, () => {
    netStatus(base + '<br>친구를 기다리는 중... <small>(이 화면을 켜 두세요)</small>' + (lan ? `<br><small>방 코드 ${code}로도 들어올 수 있어요</small>` : ''));
  }, () => netCreateRoom(lan), (msg) => netStatus('❌ ' + msg + '<br><button class="mini" onclick="netCreateRoom(' + (lan ? 'true' : 'false') + ')">새 방 만들기</button>'),
  { lan: !!lan, onStatus: (t) => netStatus(base + '<br>' + t) });
}
// --- 코드로 참가 ---
function joinFailText(why) {
  return why === 'busy' ? '이미 대전 중인 방이에요' : why === 'notfound' ? '방을 찾을 수 없어요. 코드를 확인하거나 방장에게 새 방을 만들어 달라고 해 주세요' : why === 'timeout' ? '응답이 없어요. 다시 시도해 주세요' : why;
}
function netJoinRoom(code, onStatus, onFail) {
  netReset();
  code = (code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) { netStatus('방 코드 4자리를 입력해 주세요'); return; }
  const show = (t) => { netStatus(`<b>${code}</b> 방: ${t}`); if (onStatus) onStatus(t); };
  show('접속하는 중...');
  joinTo('tk2d-room-' + code, (why) => {
    const t = joinFailText(why);
    netStatus('❌ ' + t + `<br><button class="mini" onclick="netJoinRoom('${code}')">다시 시도</button>`);
    if (onFail) onFail(t);
  }, 15000, { onStatus: show });
}
// --- 같은 와이파이: 같은 공인 IP에서 열린 방 목록 ---
async function netAutoLan() {
  netReset();
  netStatus('같은 와이파이에서 열린 방을 찾는 중...');
  const epoch = NET.epoch;
  let rooms;
  try { await rtcConfig(); rooms = (await rtcRequest({ op: 'lanList' })).rooms || []; }
  catch (_) { rooms = []; }   // 목록을 못 받으면 내가 방을 연다 (코드로도 들어올 수 있음)
  if (NET.epoch !== epoch) return;
  if (!rooms.length) { netCreateRoom(true); return; }
  if (rooms.length === 1) { netJoinRoom(rooms[0].code); return; }
  netStatus('📶 같은 와이파이에서 열린 방이 여러 개예요. 들어갈 방을 고르세요:<br>' +
    rooms.map((r) => `<button class="mini ok" onclick="netJoinRoom('${r.code}')">${r.nick ? r.nick.replace(/[<>&"']/g, '') + '의 방' : '방'} ${r.code}</button>`).join(' ') +
    '<br><button class="mini" onclick="netCreateRoom(true)">내가 방 만들기</button>');
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
    case 'hi': NET.oppNick = typeof m.nick === 'string' ? m.nick.slice(0, 12) : null; NET.oppCeo = m.ceo === true; if (m.v !== NET_VER) { onNetClosed(); toast('게임 버전이 달라요. 둘 다 새로고침해 주세요'); } break;
    case 'ping': netSend({ t: 'pong', ts: m.ts }); break;
    case 'pong': NET.ping = Math.round(performance.now() - m.ts); break;
    case 'sel': {
      const was = APP.sel.opp.ready, at = APP.sel.opp.readyAt || 0;
      APP.sel.opp = { cur: m.cur, ready: m.ready, c: m.c, readyAt: m.ready ? (was ? at : performance.now()) : 0 };
      if (NET.role === 'host') maybeStartOnline();
      break;
    }
    case 'start': if (NET.role === 'guest') startVS(m.c0, m.c1, m.stage, m.seed, Array.isArray(m.late) ? [!!m.late[0], !!m.late[1]] : null); break;
    case 'in': // 게스트 입력 (호스트 수신)
      NET.guestHeld = m.h; NET.guestCounts = m.c;
      if (Array.isArray(m.ks)) NET.guestKs = m.ks.slice(-40);
      if (typeof m.a === 'number') NET.guestAny = m.a;
      break;
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
    for (const k of ['U', 'P', 'K', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']) { if ((c[k] || 0) > NET.lastCounts[k]) p |= BTN_BIT[k]; NET.lastCounts[k] = c[k] || 0; }
  }
  let keys = '';
  for (const e of NET.guestKs) {
    if (!Array.isArray(e) || typeof e[0] !== 'number' || e[0] <= NET.lastKeySeq) continue;
    if (typeof e[1] === 'string' && /^[A-Z]$/.test(e[1])) keys += e[1];
    NET.lastKeySeq = e[0];
  }
  const a = Math.max(0, Math.min(20, (NET.guestAny | 0) - NET.lastAny)); NET.lastAny = Math.max(NET.lastAny, NET.guestAny | 0);
  return { h: NET.guestHeld | 0, p, keys: keys.slice(0, 6), a };
}
function syncGuestInputBase() {
  NET.lastKeySeq = NET.guestKs.reduce((m, e) => Math.max(m, (e && e[0]) || 0), 0);
  NET.lastAny = NET.guestAny | 0;
}
// 게스트: 내 입력 보내기
let _lastSentIn = '';
function sendMyInput(force) {
  const h = IN.heldMask(), c = IN.counts;
  const key = h + ':' + c.U + ':' + c.P + ':' + c.K + ':' + c.S1 + ':' + c.S2 + ':' + c.S3 + ':' + c.S4 + ':' + c.S5 + ':' + c.S6 + ':' + IN.keySeq + ':' + IN.anyN;
  if (key !== _lastSentIn || force) { _lastSentIn = key; netSend({ t: 'in', h, c: { U: c.U, P: c.P, K: c.K, S1: c.S1, S2: c.S2, S3: c.S3, S4: c.S4, S5: c.S5, S6: c.S6 }, ks: IN.keyLog.slice(-16), a: IN.anyN }); }
}

// 스냅샷 (기본값과 같은 필드는 생략 → 용량 절감)
const _FDEF = makeFighter(0, 0);
function packFighter(F) {
  const o = {};
  for (const k in F) {
    const v = F[k];
    if (k === 'cd' || k === 'seal') { if (v.some((x) => x)) o[k] = v; continue; }
    if (v === _FDEF[k] && k !== 'side' && k !== 'c' && k !== 'f') continue;   // f는 진영마다 기본값이 달라 항상 보냄
    o[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v;
  }
  return o;
}
function snapshot(G) {
  return {
    phase: G.phase, pt: G.pt, round: G.round, timer: G.timer, roundF: G.roundF,
    F: G.F.map(packFighter), proj: G.proj.map((p) => ({ t: p.t, x: Math.round(p.x * 10) / 10, y: Math.round(p.y), vx: p.vx, o: p.o, age: p.age, k: p.k })),
    traps: G.traps, freezeT: G.freezeT, dice: G.dice, qte: G.qte, yut: G.yut, clock: G.clock, late: G.late, notes: G.notes, stage: G.stage, rw: G.rw, mw: G.mw, koType: G.koType, perfect: G.perfect, flash: G.flash,
  };
}
function unpack(s) {
  s.F = s.F.map((f) => { const F = Object.assign(makeFighter(f.side, f.c), f); if (!f.cd) F.cd = [0, 0, 0, 0]; if (!f.seal) F.seal = [0, 0, 0, 0]; if (!Array.isArray(F.mods)) F.mods = []; return F; });
  s.ev = [];
  return s;
}
