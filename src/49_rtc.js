// ============================================================
//  WebRTC 연결 (접속 정보는 같은 사이트 /api/rtc 로 교환, 게임은 기기끼리 직접)
//  - 방장은 방을 계속 유지하며 연결 실패 시 자동으로 다음 접속을 다시 받는다
//  - 참가자는 최대 3번까지 자동 재시도, 방장 화면이 잠시 꺼져 있어도 2분까지 기다린다
// ============================================================
let RTC_CONFIG = null, RTC_CONFIG_AT = 0;
async function rtcRequest(body) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('/api/rtc', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = Error(j.error || '접속 서버 응답 오류'); e.code = r.status; throw e; }
    return j;
  } finally { clearTimeout(timer); }
}
async function rtcConfig() { if (!RTC_CONFIG || Date.now() - RTC_CONFIG_AT > 3600e3) { RTC_CONFIG = await rtcRequest(); RTC_CONFIG_AT = Date.now(); } return RTC_CONFIG; }
function rtcToken() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, (n) => n.toString(16).padStart(2, '0')).join(''); }
const rtcSleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 서버(Upstash)를 못 쓰는 상황: 다른 방법(PeerJS 공용 서버)으로 넘어가야 함
function rtcServerDown(e) { return !e.code || e.code >= 500 || e.name === 'AbortError'; }

class RTCLink {
  constructor(pc) { this.pc = pc; this.open = false; this.handlers = {}; this.closed = false; pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.close(); }; }
  on(name, fn) { (this.handlers[name] ||= []).push(fn); return this; }
  emit(name, value) { for (const fn of this.handlers[name] || []) fn(value); }
  attach(dc) { this.dataChannel = dc; dc.onopen = () => { if (!this.closed) { this.open = true; this.emit('open'); } }; dc.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } this.emit('data', m); }; dc.onclose = () => this.close(); dc.onerror = () => this.close(); if (dc.readyState === 'open') dc.onopen(); }
  send(m) { if (this.open && !this.closed) this.dataChannel.send(JSON.stringify(m)); }
  close() { if (this.closed) return; this.closed = true; this.open = false; try { this.dataChannel?.close(); this.pc.close(); } catch (_) {} this.emit('close'); }
}
// ICE 후보 수집 (STUN 응답은 보통 0.3초 안에 옴 → 최대 3.5초만 기다림)
async function rtcDescription(pc, description) {
  await pc.setLocalDescription(description);
  if (pc.iceGatheringState !== 'complete') await new Promise((resolve) => {
    const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete' || pc.signalingState === 'closed') done(); };
    const timer = setTimeout(done, 3500); pc.addEventListener('icegatheringstatechange', check); check();
  });
  if (pc.signalingState === 'closed') throw Error('접속이 취소되었습니다.');
  return { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
}
function rtcCandTypes(sdp) { return [...new Set((String(sdp).match(/ typ (host|srflx|prflx|relay)/g) || []).map((s) => s.slice(5)))]; }
function rtcBlockedMsg(local, remote) {
  if (RTC_CONFIG && RTC_CONFIG.relay) return '기기 간 연결에 실패했어요. 잠시 후 다시 시도해주세요.';
  const noSrflx = !remote.includes('srflx') || !local.includes('srflx');
  return noSrflx
    ? '한쪽 기기가 외부 연결 정보를 얻지 못했어요 (방화벽/보안 와이파이). 다른 와이파이나 데이터로 시도해보세요.'
    : '두 네트워크가 기기끼리 직접 연결을 막고 있어요 (모바일 데이터·학교/회사 와이파이 등). 같은 집 와이파이에서 하거나 TURN 중계를 설정하면 해결돼요.';
}
function rtcPeer(room, token) {
  return {
    rtc: true, dead: false, timers: new Set(), link: null, onVis: null,
    destroy() {
      if (this.dead) return; this.dead = true;
      for (const t of this.timers) clearTimeout(t); this.timers.clear();
      if (this.onVis) document.removeEventListener('visibilitychange', this.onVis);
      this.link?.close();
      if (this.owner) rtcRequest({ op: 'close', room, token }).catch(() => {});
    },
  };
}
function rtcLater(peer, fn, ms) { if (peer.dead) return; const t = setTimeout(() => { peer.timers.delete(t); if (!peer.dead) fn(); }, ms); peer.timers.add(t); }

// ---------- 방장 ----------
async function rtcHost(id, onOpen, onTaken, onFail, opts) {
  opts = opts || {};
  const token = rtcToken(), peer = rtcPeer(id, token); peer.owner = true; NET.peer = peer;
  const alive = () => !peer.dead && NET.peer === peer;
  const status = (s) => { if (alive() && !peer.link?.open && opts.onStatus) opts.onStatus(s); };
  try { await rtcRequest({ op: 'host', room: id, token }); }
  catch (e) {
    if (!alive()) return;
    peer.dead = true; NET.peer = null;
    if (e.code === 409) onTaken(); else onFail(e, true);
    return;
  }
  if (!alive()) return;
  onOpen(peer);
  const keep = () => {
    if (!alive() || peer.link?.open) return;
    rtcRequest({ op: 'keep', room: id, token, lan: !!opts.lan, nick: (typeof ACC !== 'undefined' && ACC.token) ? ACC.nick : null }).catch(() => {});
    rtcLater(peer, keep, opts.lan ? 30000 : 60000);
  };
  keep();
  let handled = null, fails = 0, polling = false;
  const poll = async () => {
    if (!alive() || peer.link?.open || polling) return;
    polling = true;
    try {
      const j = await rtcRequest({ op: 'poll', room: id, token });
      if (!alive()) return;
      if (j.offer && j.offer.guest !== handled) await accept(j.offer);
    } catch (e) {
      if (!alive()) return;
      if (e.code === 404) { onFail(Error('방 유지 시간이 지났어요. 새 방을 만들어주세요.')); peer.destroy(); if (NET.peer === peer) NET.peer = null; return; }
      // 일시적인 오류는 계속 재시도
    } finally { polling = false; }
    if (!peer.link?.open) rtcLater(peer, poll, document.hidden ? 4000 : 1500);
  };
  const accept = async (offer) => {
    handled = offer.guest;
    status('친구가 들어오는 중... 연결하고 있어요');
    const pc = new RTCPeerConnection({ iceServers: RTC_CONFIG.iceServers }), link = new RTCLink(pc);
    peer.link = link;
    pc.ondatachannel = (e) => link.attach(e.channel);
    link.on('open', () => {
      if (!alive()) { link.close(); return; }
      if (opts.lan) rtcRequest({ op: 'lanHide', room: id, token }).catch(() => {});
      wireConn(link, 'host');
    });
    try {
      await pc.setRemoteDescription(offer.description);
      const description = await rtcDescription(pc, await pc.createAnswer());
      if (!alive()) return;
      await rtcRequest({ op: 'answer', room: id, token, guest: offer.guest, description });
    } catch (e) { /* 아래 시간 초과 처리로 넘어감 */ }
    // 20초 안에 연결이 안 되면 이번 시도는 버리고 다음 접속을 다시 받는다
    rtcLater(peer, async () => {
      if (link.open || !alive()) return;
      const why = rtcBlockedMsg(rtcCandTypes(pc.localDescription?.sdp), rtcCandTypes(offer.description.sdp));
      if (NET.conn === link) { NET.conn = null; NET.role = null; }
      link.close(); if (peer.link === link) peer.link = null;
      fails++;
      status(`⚠️ 연결 실패 (${fails}번째): ${why}<br>방은 그대로 열려 있어요. 친구가 다시 참가하면 재시도해요.`);
      try { await rtcRequest({ op: 'reset', room: id, token }); } catch (_) {}
      handled = null; poll();
    }, 20000);
  };
  // 방장이 다른 앱(카톡 등)에 갔다가 돌아오면 바로 확인
  peer.onVis = () => { if (!document.hidden) { poll(); } };
  document.addEventListener('visibilitychange', peer.onVis);
  poll();
}

// ---------- 참가자 ----------
async function rtcJoin(id, onFail, opts) {
  opts = opts || {};
  const peer = rtcPeer(id, null); NET.peer = peer;
  const alive = () => !peer.dead && NET.peer === peer;
  const status = (s) => { if (alive() && opts.onStatus) opts.onStatus(s); };
  const fail = (e, serverDown) => { if (!alive()) return; peer.destroy(); if (NET.peer === peer) NET.peer = null; onFail(e, serverDown); };
  let lastWhy = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (!alive()) return;
    const token = rtcToken();
    const pc = new RTCPeerConnection({ iceServers: RTC_CONFIG.iceServers }), link = new RTCLink(pc);
    peer.link = link;
    let opened = false;
    link.on('open', () => { opened = true; if (alive()) wireConn(link, 'guest'); else link.close(); });
    link.attach(pc.createDataChannel('game', { ordered: true }));
    try {
      const description = await rtcDescription(pc, await pc.createOffer());
      // 접속 요청 올리기 (방장이 이전 시도를 정리하는 중이면 잠시 기다림)
      const t0 = Date.now();
      for (;;) {
        if (!alive()) { link.close(); return; }
        try { await rtcRequest({ op: 'offer', room: id, token, description }); break; }
        catch (e) {
          if (e.code === 404) { link.close(); return fail('notfound'); }
          if (e.code === 409 && Date.now() - t0 < 30000) { status('방장이 이전 연결을 정리하는 중이에요...'); await rtcSleep(1500); continue; }
          if (e.code === 409) { link.close(); return fail('busy'); }
          if (rtcServerDown(e) && attempt === 1) { link.close(); return fail(e, true); }
          throw e;
        }
      }
      // 응답 기다리기 (방장 화면이 꺼져 있으면 늦어질 수 있어 최대 2분)
      const t1 = Date.now(); let answer = null, reset = false;
      while (alive() && !answer) {
        try {
          const j = await rtcRequest({ op: 'poll', room: id, token });
          answer = j.answer;
        } catch (e) {
          if (e.code === 404) { link.close(); return fail('notfound'); }
          if (e.code === 410 || e.code === 403) { reset = true; break; }
        }
        if (answer) break;
        const waited = Date.now() - t1;
        if (waited > 120000) { link.close(); return fail(Error('방장의 응답이 없어요. 방장이 게임 화면을 켜 두었는지 확인해주세요.')); }
        if (waited > 8000) status('방장의 응답을 기다리는 중... (방장이 다른 앱에 가 있으면 게임 화면으로 돌아왔을 때 연결돼요)');
        await rtcSleep(1200);
      }
      if (!alive()) { link.close(); return; }
      if (!reset) {
        status(attempt > 1 ? `기기끼리 연결하는 중... (재시도 ${attempt}/3)` : '기기끼리 연결하는 중...');
        await pc.setRemoteDescription(answer);
        for (let i = 0; i < 150 && alive() && !opened && !link.closed; i++) await rtcSleep(100);
        if (opened) return;
        lastWhy = rtcBlockedMsg(rtcCandTypes(pc.localDescription?.sdp), rtcCandTypes(answer.sdp));
      }
    } catch (e) {
      if (!alive()) { link.close(); return; }
      lastWhy = e.message || lastWhy;
    }
    if (NET.conn === link) { NET.conn = null; NET.role = null; }
    link.close(); if (peer.link === link) peer.link = null;
    if (attempt < 3) { status(`연결 재시도 중... (${attempt + 1}/3)`); await rtcSleep(2500); }
  }
  fail(Error(lastWhy || '기기 간 연결에 실패했어요.'));
}
