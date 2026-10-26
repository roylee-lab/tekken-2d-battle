// ============================================================
//  게시판: 캐릭터 추가 요청 (양식 강제) + 오픈소스 코드·가이드 다운로드
// ============================================================
const BOARD = { tab: 'list', posts: [], page: 0, total: 0, per: 10, loading: false, msg: '', msgOk: false, draft: null };
const BOARD_SLOTS = [['passive', '패시브'], ['q', 'Q 스킬'], ['w', 'W 스킬'], ['e', 'E 스킬'], ['r', 'R 스킬']];
const BOARD_LIM = { name: [1, 12], sn: [1, 20], sd: [5, 200] };   // 서버(api/game.js)와 같은 규칙
const DL_CODE = 'download/tekken-2d-battle-source.zip', DL_GUIDE = 'download/GUIDE.md';

function showBoard() {
  setState('board');
  document.getElementById('board').classList.remove('hidden');
  BOARD.msg = ''; BOARD.tab = 'list'; renderBoard(); loadBoard(0);
}
function hideBoard() { const el = document.getElementById('board'); if (el) el.classList.add('hidden'); }
function boardMsg(s, ok) { BOARD.msg = s; BOARD.msgOk = !!ok; renderBoard(); }

async function loadBoard(page) {
  BOARD.loading = true; renderBoard();
  try {
    const j = await api('boardList', { page });
    Object.assign(BOARD, { posts: j.posts, total: j.total, page: j.page, per: j.per });
  } catch (e) { BOARD.msg = e.message; BOARD.msgOk = false; }
  BOARD.loading = false; renderBoard();
}

// 양식 검사: 빈칸이나 글자 수가 맞지 않으면 등록 버튼이 잠김
function boardDraft() {
  const v = (id) => (document.getElementById(id)?.value || '').replace(/\s+/g, ' ').trim();
  const d = { name: v('bdName') };
  for (const [s] of BOARD_SLOTS) d[s] = { n: v('bd_' + s + '_n'), d: v('bd_' + s + '_d') };
  return d;
}
function boardProblems(d) {
  const out = [];
  const chk = (t, [mn, mx], label) => { if (t.length < mn) out.push(mn > 1 ? `${label}: ${mn}자 이상` : `${label}: 비어 있음`); else if (t.length > mx) out.push(`${label}: ${mx}자 이하`); };
  chk(d.name, BOARD_LIM.name, '캐릭터 이름');
  for (const [s, label] of BOARD_SLOTS) { chk(d[s].n, BOARD_LIM.sn, label + ' 이름'); chk(d[s].d, BOARD_LIM.sd, label + ' 설명'); }
  return out;
}
function boardCheck() {
  BOARD.draft = boardDraft();
  const p = boardProblems(BOARD.draft), btn = document.getElementById('bdSubmit'), box = document.getElementById('bdProblems');
  if (btn) btn.disabled = p.length > 0 || !ACC.token;
  if (box) box.innerHTML = !ACC.token ? '글을 쓰려면 먼저 로그인해 주세요' : p.length ? '아직 채워야 할 칸: ' + p.map(esc).join(' · ') : '✅ 양식을 모두 채웠어요';
  if (box) box.className = 'bdprob ' + (p.length || !ACC.token ? 'bad' : 'good');
}
async function boardSubmit() {
  const d = boardDraft();
  if (boardProblems(d).length || !ACC.token) { boardCheck(); return; }
  boardMsg('등록 중...', true);
  try {
    await api('boardPost', d);
    BOARD.draft = null; BOARD.tab = 'list'; boardMsg('요청 글을 등록했어요!', true); loadBoard(0);
  } catch (e) { boardMsg(e.message); }
}
async function boardDelete(id) {
  if (!confirmDelete(id)) return;
  try { await api('boardDelete', { id }); boardMsg('글을 지웠어요', true); loadBoard(BOARD.page); } catch (e) { boardMsg(e.message); }
}
function confirmDelete(id) { BOARD.delArm = BOARD.delArm === id ? null : id; if (BOARD.delArm) { renderBoard(); return false; } return true; }

function renderBoard() {
  const box = document.getElementById('boardBody');
  if (!box || APP.state !== 'board') return;
  const keep = BOARD.tab === 'write' && document.getElementById('bdName') ? boardDraft() : null;
  let h = `<div class="dl">
    <a class="dlbtn" href="${DL_CODE}" download>📦 전체 코드 다운로드 (.zip)</a>
    <a class="dlbtn guide" href="${DL_GUIDE}" download>📘 개발·배포 가이드 다운로드</a>
  </div>
  <div class="sub">이 게임은 오픈소스(MIT 라이선스)예요. 누구나 받아서 고치고, 직접 배포해도 돼요.</div>
  <div class="tabs"><button class="mini ${BOARD.tab === 'list' ? 'on' : ''}" onclick="BOARD.tab='list';renderBoard()">📋 요청 글 목록</button><button class="mini ${BOARD.tab === 'write' ? 'on' : ''}" onclick="BOARD.tab='write';renderBoard()">✏️ 캐릭터 추가 요청 쓰기</button></div>`;
  if (BOARD.tab === 'list') {
    if (BOARD.loading) h += '<div class="empty">불러오는 중...</div>';
    else if (!BOARD.posts.length) h += '<div class="empty">아직 요청 글이 없어요. 첫 번째로 새 캐릭터를 제안해 보세요!</div>';
    for (const p of BOARD.posts) {
      const mine = ACC.nick && p.nick.toLowerCase() === ACC.nick.toLowerCase();
      h += `<div class="post"><div class="ph"><b>${esc(p.name)}</b><small>${titleHtml(p.ceo)}${esc(p.nick)} · ${new Date(p.ts).toLocaleDateString('ko-KR')}</small>
        ${mine ? `<button class="mini x" onclick="boardDelete('${p.id}')">${BOARD.delArm === p.id ? '정말 삭제?' : '삭제'}</button>` : ''}</div>`;
      for (const [s, label] of BOARD_SLOTS) h += `<div class="sk"><span class="tag t_${s}">${label}</span> <b>${esc(p[s].n)}</b> — ${esc(p[s].d)}</div>`;
      h += '</div>';
    }
    const pages = Math.max(1, Math.ceil(BOARD.total / BOARD.per));
    if (pages > 1) h += `<div class="pager"><button class="mini" ${BOARD.page <= 0 ? 'disabled' : ''} onclick="loadBoard(${BOARD.page - 1})">◀</button> ${BOARD.page + 1} / ${pages} <button class="mini" ${BOARD.page >= pages - 1 ? 'disabled' : ''} onclick="loadBoard(${BOARD.page + 1})">▶</button></div>`;
  } else {
    if (!ACC.token) h += `<div class="wait">글을 쓰려면 로그인이 필요해요. <button class="mini ok" onclick="hideBoard();showAccount()">로그인하러 가기</button></div>`;
    const val = (x) => esc(x || '');
    const d = keep || BOARD.draft || { name: '' };
    h += `<div class="form">
      <label>캐릭터 이름 <small>(${BOARD_LIM.name[1]}자 이내)</small></label>
      <input id="bdName" maxlength="${BOARD_LIM.name[1]}" placeholder="예) 김철수" value="${val(d.name)}" oninput="boardCheck()">`;
    for (const [s, label] of BOARD_SLOTS) {
      const sd = d[s] || {};
      h += `<label><span class="tag t_${s}">${label}</span> 이름 + 효과 설명</label>
        <input id="bd_${s}_n" maxlength="${BOARD_LIM.sn[1]}" placeholder="${label} 이름" value="${val(sd.n)}" oninput="boardCheck()">
        <textarea id="bd_${s}_d" maxlength="${BOARD_LIM.sd[1]}" rows="2" placeholder="효과 설명 (${BOARD_LIM.sd[0]}~${BOARD_LIM.sd[1]}자, 예: 3초간 상대 기절)" oninput="boardCheck()">${val(sd.d)}</textarea>`;
    }
    h += `<div id="bdProblems" class="bdprob"></div><button id="bdSubmit" onclick="boardSubmit()" disabled>📨 요청 글 등록</button></div>`;
  }
  if (BOARD.msg) h += `<div class="msg ${BOARD.msgOk ? 'good' : 'bad'}">${esc(BOARD.msg)}</div>`;
  box.innerHTML = h;
  if (BOARD.tab === 'write') boardCheck();
}

function setupBoard() {
  const back = document.getElementById('btnBoardBack');
  if (back) back.addEventListener('click', () => { playSfx('back'); goTitle(); });
}
