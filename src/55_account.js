// ============================================================
//  계정 / 친구 / 대전 신청 (서버: /api/game)
// ============================================================
const ACC = {
  token: safeLS('t2d_token') || null, nick: safeLS('t2d_nick') || null,
  friends: [], requests: [], invites: [], lastPoll: 0, polling: false, offline: false,
  waiting: null,          // 내가 보낸 대전 신청 { to, room, t0 }
  dismissed: new Set(),   // 닫은 초대
  msg: '', msgOk: false, busyBtn: false,
};
const API_URL = '/api/game';
// ---------- 보상 (최종 보스 격파): 칭호 '김천고의 CEO' + 히든 캐릭터 흑요 ----------
const CEO_TITLE = '김천고의 CEO';
const UNLOCK = (() => { try { return Object.assign({ heugyo: false, ceo: false, pending: false }, JSON.parse(safeLS('t2d_unlock') || '{}')); } catch (e) { return { heugyo: false, ceo: false, pending: false }; } })();
ACC.rewards = { ceo: false, heugyo: false };
function saveUnlock() { safeLS('t2d_unlock', JSON.stringify(UNLOCK)); }
function heugyoUnlocked() { return !!(UNLOCK.heugyo || ACC.rewards.heugyo); }
function myCeo() { return !!(ACC.token ? ACC.rewards.ceo || UNLOCK.ceo : UNLOCK.ceo); }
function titleHtml(ceo) { return ceo ? `<span class="ceo">${CEO_TITLE}</span> ` : ''; }
function setRewards(r) { if (r) { ACC.rewards = { ceo: !!r.ceo, heugyo: !!r.heugyo }; if (r.heugyo) { UNLOCK.heugyo = true; saveUnlock(); } } }
// 최종 보스를 이기면 호출 (로그인 안 했으면 기기에 기억해 두었다가 로그인할 때 서버에 등록)
function grantBossClear() {
  const first = !UNLOCK.heugyo || !UNLOCK.ceo;
  UNLOCK.heugyo = true; UNLOCK.ceo = true; UNLOCK.pending = true; saveUnlock();
  toast(first ? '🏆 보상! 칭호 「김천고의 CEO」 + 히든 캐릭터 흑요 획득!' : '🏆 흑요 격파! 「김천고의 CEO」');
  claimBossClear();
}
async function claimBossClear() {
  if (!ACC.token || !UNLOCK.pending) return;
  try { const j = await api('bossClear'); setRewards(j.rewards); UNLOCK.pending = false; saveUnlock(); renderAccount(); } catch (e) { /* 다음 로그인 때 다시 */ }
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(a, data) {
  let r;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
  try {
    r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, cache: 'no-store', body: JSON.stringify(Object.assign({ a, token: ACC.token }, data || {})) });
  } catch (e) { ACC.offline = true; throw new Error(e.name === 'AbortError' ? '계정 서버 응답 시간이 초과됐어요. 다시 시도해주세요' : '계정 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요'); } finally { clearTimeout(timer); }
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!j) { ACC.offline = true; throw new Error(location.protocol === 'file:' ? '파일로 열면 로그인을 쓸 수 없어요. 배포된 사이트에서 접속해 주세요' : '서버 응답 오류 (' + r.status + ')'); }
  ACC.offline = false;
  if (r.status === 401 && a !== 'login') { setSession(null, null); }
  if (!r.ok) throw new Error(j.error || '오류');
  return j;
}
function setSession(token, nick) {
  ACC.token = token; ACC.nick = nick;
  try { if (token) { localStorage.setItem('t2d_token', token); localStorage.setItem('t2d_nick', nick); } else { localStorage.removeItem('t2d_token'); localStorage.removeItem('t2d_nick'); } } catch (e) { /* 무시 */ }
  if (!token) { ACC.friends = []; ACC.requests = []; ACC.invites = []; ACC.waiting = null; ACC.rewards = { ceo: false, heugyo: false }; }
  renderAccount();
}
function accMsg(s, ok) { ACC.msg = s; ACC.msgOk = !!ok; renderAccount(); }

// ---------- 주기적 상태 확인 ----------
function myStatus() { return APP.mode === 'online' && NET.conn ? 'busy' : APP.state === 'fight' ? 'busy' : 'idle'; }
async function pollNow() {
  if (!ACC.token || ACC.polling) return;
  ACC.polling = true; ACC.lastPoll = Date.now();
  try {
    const j = await api('poll', { status: myStatus() });
    ACC.nick = j.nick; ACC.friends = j.friends; ACC.requests = j.requests; ACC.invites = j.invites; setRewards(j.rewards);
    if (UNLOCK.pending) claimBossClear();
    for (const r of j.responses) {
      if (ACC.waiting && ACC.waiting.to === r.to && r.r === 'declined') { cancelWaiting(false); toast(`${r.to}님이 대전 신청을 거절했어요`); }
    }
    renderAccount(); renderInvitePop();
  } catch (e) { /* 다음 주기에 재시도 */ }
  ACC.polling = false;
}
setInterval(() => {
  if (!ACC.token || document.hidden) return;
  const open = APP.state === 'account' || ACC.waiting;
  const iv = ACC.waiting ? 3000 : open ? 4000 : APP.state === 'fight' ? 30000 : 12000;   // 서버(DB) 사용량을 아끼려고 화면별로 간격 조절
  if (Date.now() - ACC.lastPoll > iv) pollNow();
  if (ACC.waiting && Date.now() - ACC.waiting.t0 > 90000) { cancelWaiting(true); toast('응답이 없어서 대전 신청을 취소했어요'); }
  if (ACC.waiting) renderAccount();
}, 1000);

// ---------- 동작 ----------
async function doLogin(register) {
  const nick = document.getElementById('accNick').value.trim(), pw = document.getElementById('accPw').value;
  if (!nick || !pw) { accMsg('닉네임과 비밀번호를 입력해 주세요'); return; }
  accMsg(register ? '가입 중...' : '로그인 중...', true);
  try {
    const j = await api(register ? 'register' : 'login', { nick, pw });
    setSession(j.token, j.nick); setRewards(j.rewards); claimBossClear();
    accMsg(register ? `가입 완료! 환영해요, ${j.nick}님` : `${j.nick}님, 환영해요!`, true);
    pollNow();
  } catch (e) { accMsg(e.message); }
}
async function doLogout() { try { await api('logout'); } catch (e) { /* 무시 */ } setSession(null, null); accMsg('로그아웃했어요', true); }
async function addFriend() {
  const el = document.getElementById('accFriend'), nick = el.value.trim();
  if (!nick) return;
  try {
    const j = await api('friendAdd', { nick });
    el.value = '';
    accMsg(j.result === 'friends' ? `${j.nick}님과 친구가 되었어요!` : `${j.nick}님에게 친구 요청을 보냈어요`, true);
    pollNow();
  } catch (e) { accMsg(e.message); }
}
async function respondFriend(nick, accept) { try { await api('friendRespond', { nick, accept }); accMsg(accept ? `${nick}님과 친구가 되었어요!` : '요청을 거절했어요', true); pollNow(); } catch (e) { accMsg(e.message); } }
async function removeFriend(nick) { if (!confirmBox(`${nick}님을 친구에서 삭제할까요?`)) return; try { await api('friendRemove', { nick }); pollNow(); } catch (e) { accMsg(e.message); } }
function confirmBox(s) { try { return window.confirm(s); } catch (e) { return true; } }

function inviteFriend(nick) {
  if (ACC.waiting || ACC.busyBtn) return;
  ACC.busyBtn = true;
  netReset();
  const code = genCode();
  accMsg(`${nick}님에게 대전 신청 준비 중...`, true);
  hostOn('tk2d-room-' + code, async () => {
    try {
      await api('invite', { nick, room: code });
      ACC.waiting = { to: nick, room: code, t0: Date.now() };
      accMsg('', true);
    } catch (e) { netReset(); accMsg(e.message); }
    ACC.busyBtn = false; renderAccount();
  }, () => { ACC.busyBtn = false; inviteFriend(nick); }, (msg) => { ACC.busyBtn = false; if (ACC.waiting) cancelWaiting(true); accMsg('❌ ' + msg); },
  { onStatus: (t) => { accMsg(t.replace(/<[^>]+>/g, ' '), !/⚠️/.test(t)); if (/⚠️/.test(t)) toast('친구 접속이 실패했어요. 친구가 다시 수락하거나 다시 신청해 주세요'); } });
}
function cancelWaiting(tellServer) {
  const w = ACC.waiting; if (!w) return;
  ACC.waiting = null;
  if (tellServer) api('inviteCancel', { nick: w.to }).catch(() => {});
  if (!NET.conn) netReset();
  renderAccount();
}
async function answerInvite(inv, accept) {
  ACC.dismissed.add(inv.from + inv.ts);
  ACC.invites = ACC.invites.filter((x) => x !== inv);
  renderInvitePop();
  try { await api('inviteRespond', { nick: inv.from, accept }); } catch (e) { ACC.dismissed.delete(inv.from + inv.ts); toast(e.message); pollNow(); return; }
  if (!accept) return;
  if (APP.state === 'fight' && APP.mode === 'cpu') goTitle();
  toast(`${inv.nick}님의 방에 접속하는 중...`);
  netJoinRoom(inv.room, (t) => toast(t.replace(/<[^>]+>/g, ' ')), (t) => toast('❌ ' + t));
}

// ---------- 화면 (HTML 패널) ----------
function showAccount() {
  setState('account');
  document.getElementById('account').classList.remove('hidden');
  ACC.msg = ''; renderAccount(); pollNow();
}
function hideAccount() { const el = document.getElementById('account'); if (el) el.classList.add('hidden'); }

function renderAccount() {
  const box = document.getElementById('accBody');
  if (!box || document.getElementById('account').classList.contains('hidden')) return;
  const focusId = document.activeElement && document.activeElement.id;
  const keep = {};
  for (const id of ['accNick', 'accPw', 'accFriend']) { const el = document.getElementById(id); if (el) keep[id] = el.value; }
  let h = '';
  if (!ACC.token) {
    h += `<p class="sub">닉네임으로 가입하고 친구를 추가해서 대전해요.</p>
      <input id="accNick" maxlength="12" placeholder="닉네임 (2~12자)" autocomplete="username">
      <input id="accPw" type="password" maxlength="64" placeholder="비밀번호 (4자 이상)" autocomplete="current-password">
      <div class="row"><button id="accLogin">로그인</button><button id="accReg" class="lan">회원가입</button></div>`;
  } else {
    h += `<div class="me"><span>👤 ${titleHtml(myCeo())}<b>${esc(ACC.nick)}</b> 님</span><button id="accOut" class="mini">로그아웃</button></div>`;
    h += `<div class="row"><input id="accFriend" maxlength="12" placeholder="친구 닉네임" autocomplete="off"><button id="accAdd">친구 추가</button></div>`;
    if (ACC.waiting) {
      const left = Math.max(0, 90 - Math.floor((Date.now() - ACC.waiting.t0) / 1000));
      h += `<div class="wait">⚔ <b>${esc(ACC.waiting.to)}</b>님의 수락을 기다리는 중... (${left}초) <button id="accCancel" class="mini">취소</button></div>`;
    }
    if (ACC.requests.length) {
      h += '<div class="sec">받은 친구 요청</div>';
      for (const n of ACC.requests) h += `<div class="fr"><span>${esc(n)}</span><span><button class="mini ok" data-req="${esc(n)}" data-acc="1">수락</button><button class="mini" data-req="${esc(n)}" data-acc="0">거절</button></span></div>`;
    }
    h += `<div class="sec">친구 ${ACC.friends.length}명</div><div class="flist">`;
    if (!ACC.friends.length) h += '<div class="empty">아직 친구가 없어요. 친구 닉네임을 추가해 보세요!</div>';
    for (const f of ACC.friends) {
      const st = f.online ? (f.status === 'busy' ? '<i class="dot busy"></i>대전 중' : '<i class="dot on"></i>접속 중') : '<i class="dot"></i>오프라인';
      const can = f.online && f.status !== 'busy' && !ACC.waiting;
      h += `<div class="fr"><span>${titleHtml(f.ceo)}${esc(f.nick)} <small>${st}</small></span><span><button class="mini fight" data-inv="${esc(f.nick)}" ${can ? '' : 'disabled'}>⚔ 대전 신청</button><button class="mini x" data-del="${esc(f.nick)}" title="친구 삭제">✕</button></span></div>`;
    }
    h += '</div>';
  }
  if (ACC.msg) h += `<div class="msg ${ACC.msgOk ? 'good' : 'bad'}">${esc(ACC.msg)}</div>`;
  if (ACC.offline) h += '<div class="msg bad">서버에 연결할 수 없어요</div>';
  box.innerHTML = h;
  for (const id in keep) { const el = document.getElementById(id); if (el) el.value = keep[id]; }
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus(); }
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('accLogin', () => doLogin(false)); on('accReg', () => doLogin(true)); on('accOut', doLogout); on('accAdd', addFriend);
  on('accCancel', () => cancelWaiting(true));
  for (const id of ['accNick', 'accPw']) { const el = document.getElementById(id); if (el) el.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') doLogin(false); }; }
  const fe = document.getElementById('accFriend'); if (fe) fe.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') addFriend(); };
  box.querySelectorAll('[data-req]').forEach((b) => (b.onclick = () => respondFriend(b.dataset.req, b.dataset.acc === '1')));
  box.querySelectorAll('[data-inv]').forEach((b) => (b.onclick = () => inviteFriend(b.dataset.inv)));
  box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => removeFriend(b.dataset.del)));
}

function renderInvitePop() {
  const el = document.getElementById('invitePop'); if (!el) return;
  const busy = (APP.mode === 'online' && NET.conn) || ACC.waiting;
  const inv = ACC.invites.find((x) => !ACC.dismissed.has(x.from + x.ts));
  if (!inv || busy) { el.classList.add('hidden'); ACC.shownInv = null; return; }
  el.classList.remove('hidden');
  const k = inv.from + inv.ts;
  if (ACC.shownInv === k) return;
  ACC.shownInv = k;
  el.innerHTML = `⚔ <b>${esc(inv.nick)}</b>님이 대전을 신청했어요! <button id="invYes" class="mini ok">수락</button><button id="invNo" class="mini">거절</button>`;
  document.getElementById('invYes').onclick = () => answerInvite(inv, true);
  document.getElementById('invNo').onclick = () => answerInvite(inv, false);
  playSfx('confirm');
}
