// ============================================================
//  앱 상태 머신 / 화면 (타이틀, 선택, VS, 대전, 도감, 결과)
// ============================================================
const WIN_QUOTES = {
  0: '평범함이 제일 무섭다는 거, 이제 알겠지?',
  1: '교정기는 빼도 어금니는 못 빼지!',
  2: '작다고 얕보면 그게 마지막이야.',
  3: '대나무는 꺾여도 다시 자란다.',
  4: '주사위는 던져졌고, 결과는 내 승리!',
  5: '이것이 有段者의 클래스.',
  6: '난 그렇게 생각 안 한다. 내가 이겼으니까.',
  7: '양치는 내일 할게. 승리는 오늘 하고.',
  8: '네 비트엔 리듬이 없었어. Yeah.',
  9: '가오는 지는 게 아니라 이기는 거다.',
  10: '시한폭탄은 이미 터졌어.',
  11: '괴룡의 고통을 맛보았느냐.',
  12: '너의 패턴은 이미 해킹 완료.',
};

const APP = {
  state: 'title', mode: 'cpu', mySide: 0, diff: 1, t: 0, st: 0,
  menu: 0, sel: { cur: 0, hidden: false, ready: false, opp: { cur: 6, ready: false, c: null }, cpuC: null, roulette: 0 },
  G: null, ai: [makeAIMem(), makeAIMem()], dict: 0, vs: null, paused: false, pauseIdx: 0, toastT: 0, toastS: '', titleStage: 0,
};
function toast(s) { APP.toastS = s; APP.toastT = 220; }
const STAGE_KEYS = Object.keys(STAGE_DEF);

const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
const BUF = mkCanvas(VW, VH), bctx = BUF.getContext('2d');

// 설정 저장
(function loadSettings() {
  try {
    const s = JSON.parse(safeLS('tekken2d_settings') || '{}');
    if (typeof s.diff === 'number') APP.diff = s.diff;
    if (s.music === false) AUD.musicOn = false;
    if (s.sfx === false) AUD.sfxOn = false;
    if (s.voice === false) AUD.voiceOn = false;
  } catch (e) { /* 무시 */ }
})();
function saveSettings() { safeLS('tekken2d_settings', JSON.stringify({ diff: APP.diff, music: AUD.musicOn, sfx: AUD.sfxOn, voice: AUD.voiceOn })); }

// ---------- 화면 전환 ----------
function setState(s) { APP.state = s; APP.st = 0; IN.clear(); if (s !== 'account') hideAccount(); setTimeout(renderInvitePop, 0); }
function goTitle() {
  if (NET.conn && APP.mode === 'online') { netReset(); }
  APP.mode = 'cpu'; APP.mySide = 0; APP.G = null; APP.paused = false;
  setState('title'); playMusic('title'); hideLobby(); resetFX();
}
function goSelect() {
  APP.G = null; APP.paused = false;
  APP.sel.ready = false; APP.sel.hidden = false; APP.sel.cpuC = null; APP.sel.roulette = 0;
  APP.sel.opp = { cur: APP.mySide === 0 ? 6 : 0, ready: false, c: null };
  if (APP.mode === 'online') APP.sel.cur = APP.mySide === 0 ? 0 : 6;
  setState('select'); playMusic('select'); resetFX();
  if (APP.mode === 'online') sendSel();
}
function sendSel() { netSend({ t: 'sel', cur: APP.sel.cur, ready: APP.sel.ready, c: APP.sel.ready ? myChar() : null }); }
function myChar() { return APP.sel.hidden ? TIRON : SELECT_ORDER[APP.sel.cur]; }

function maybeStartOnline() {
  if (NET.role !== 'host' || APP.state !== 'select') return;
  if (APP.sel.ready && APP.sel.opp.ready && APP.sel.opp.c !== null) {
    const c0 = myChar(), c1 = APP.sel.opp.c;
    const seed = (Math.random() * 1e9) | 0;
    const stage = CHARS[[c0, c1][seed % 2]].stage;
    netSend({ t: 'start', c0, c1, stage, seed });
    startVS(c0, c1, stage, seed);
  }
}
function startVS(c0, c1, stage, seed) {
  APP.vs = { c0, c1, stage, seed };
  setState('vs'); stopMusic(); playSfx('confirm');
  announce(`${CHARS[c0].en.toLowerCase()} versus ${CHARS[c1].en.toLowerCase()}`);
}
function startFight() {
  const v = APP.vs;
  rnd = mulberry32(v.seed || 1);
  APP.G = newMatch(v.c0, v.c1, v.stage, APP.mode);
  APP.ai = [makeAIMem(), makeAIMem()];
  HPL[0] = HPL[1] = 1;
  resetFX(); FX.cam = ARENA_W / 2 - VW / 2;
  NET.snap = null; NET.inEv = []; NET.outEv = [];
  NET.lastCounts = { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0 };
  if (NET.guestCounts) NET.lastCounts = Object.assign({}, NET.guestCounts);
  setState('fight');
  playMusic(STAGE_DEF[v.stage].bgm);
}

// ---------- 업데이트 ----------
function tick() {
  APP.t++; APP.st++;
  if (APP.toastT > 0) APP.toastT--;
  if (IN.take('MUTE')) { AUD.setMusic(!AUD.musicOn); saveSettings(); toast(AUD.musicOn ? 'BGM 켜짐' : 'BGM 꺼짐'); }
  switch (APP.state) {
    case 'title': updTitle(); break;
    case 'select': updSelect(); break;
    case 'vs': if (APP.st > 150 || (APP.st > 40 && IN.take('START') && APP.mode === 'cpu')) startFight(); break;
    case 'fight': updFight(); break;
    case 'dict': updDict(); break;
    case 'lobby': if (IN.take('BACK')) { netReset(); goTitle(); } break;
    case 'account': if (IN.take('BACK')) { if (!ACC.waiting) goTitle(); } break;
    default: break;
  }
  updateFX();
  IN.clear();
}

const TITLE_MENU = () => [
  'CPU 대전', ACC.token ? `친구 대전 (${ACC.nick})` : '친구 대전 (로그인)', '온라인 대전 (방 코드)', '캐릭터 도감',
  '난이도 : ' + DIFF[APP.diff].name,
  'BGM : ' + (AUD.musicOn ? 'ON' : 'OFF'),
  '효과음 : ' + (AUD.sfxOn ? 'ON' : 'OFF'),
  '아나운서 음성 : ' + (AUD.voiceOn ? 'ON' : 'OFF'),
];
function updTitle() {
  const n = TITLE_MENU().length;
  if (IN.take('U')) { APP.menu = (APP.menu + n - 1) % n; playSfx('cursor'); }
  if (IN.take('D')) { APP.menu = (APP.menu + 1) % n; playSfx('cursor'); }
  const lr = IN.take('L') ? -1 : IN.take('R') ? 1 : 0;
  const go = IN.take('START') || IN.take('S1') || IN.take('P');
  if (APP.menu === 4 && (lr || go)) { APP.diff = (APP.diff + (lr || 1) + 3) % 3; playSfx('cursor'); saveSettings(); return; }
  if (APP.menu === 5 && (lr || go)) { AUD.setMusic(!AUD.musicOn); if (AUD.musicOn) { MUSIC.key = null; playMusic('title'); } playSfx('cursor'); saveSettings(); return; }
  if (APP.menu === 6 && (lr || go)) { AUD.setSfx(!AUD.sfxOn); playSfx('cursor'); saveSettings(); return; }
  if (APP.menu === 7 && (lr || go)) { AUD.voiceOn = !AUD.voiceOn; playSfx('cursor'); saveSettings(); return; }
  if (!go) return;
  playSfx('confirm');
  if (APP.menu === 0) { APP.mode = 'cpu'; APP.mySide = 0; APP.sel.cur = APP.sel.cur || 0; goSelect(); }
  else if (APP.menu === 1) { showAccount(); }
  else if (APP.menu === 2) { showLobby(); }
  else if (APP.menu === 3) { APP.dict = 0; setState('dict'); }
}

function updSelect() {
  const S = APP.sel;
  if (S.roulette > 0) {
    S.roulette--;
    if (S.roulette % 4 === 0) { S.opp.cur = Math.floor(Math.random() * 12); playSfx('cursor'); }
    if (S.roulette === 0) { S.opp.cur = SELECT_ORDER.indexOf(S.cpuC); playSfx('confirm'); APP._vsDelay = 30; }
    return;
  }
  if (APP._vsDelay > 0) { if (--APP._vsDelay === 0) startVS(myChar(), S.cpuC, CHARS[S.cpuC].stage, (Math.random() * 1e9) | 0); return; }
  if (IN.take('BACK')) {
    if (S.ready && APP.mode === 'online') { S.ready = false; sendSel(); playSfx('back'); return; }
    playSfx('back'); goTitle(); return;
  }
  if (S.ready) return;
  if (IN.take('DICT')) { APP.dict = SELECT_ORDER[S.cur]; APP._dictFromSelect = true; setState('dict'); return; }
  let moved = false;
  if (IN.take('L')) { S.cur = (S.cur + 11) % 12; moved = true; }
  if (IN.take('R')) { S.cur = (S.cur + 1) % 12; moved = true; }
  if (IN.take('U') || IN.take('D')) { S.cur = (S.cur + 6) % 12; moved = true; }
  if (moved) { S.hidden = false; playSfx('cursor'); if (APP.mode === 'online') sendSel(); }
  const hid = IN.take('HID');
  if (hid || IN.take('START') || IN.take('S1') || IN.take('P')) {
    S.hidden = hid;
    S.ready = true; playSfx('confirm');
    announce(CHARS[myChar()].en.toLowerCase());
    if (APP.mode === 'cpu') {
      S.cpuC = SELECT_ORDER[Math.floor(Math.random() * 12)];
      S.roulette = 50;
    } else { sendSel(); maybeStartOnline(); }
  }
}

function updDict() {
  const order = [...SELECT_ORDER, TIRON];
  let i = order.indexOf(APP.dict);
  if (IN.take('L') || IN.take('U')) { i = (i + order.length - 1) % order.length; playSfx('cursor'); APP.st = 0; }
  if (IN.take('R') || IN.take('D')) { i = (i + 1) % order.length; playSfx('cursor'); APP.st = 0; }
  APP.dict = order[i];
  if (IN.take('BACK') || IN.take('DICT') || IN.take('START')) {
    playSfx('back');
    if (APP._dictFromSelect) { APP._dictFromSelect = false; setState('select'); } else goTitle();
  }
}

function updFight() {
  const G = APP.G;
  if (APP.mode === 'online' && NET.role === 'guest') {
    // 게스트: 입력 전송 + 스냅샷 반영
    sendMyInput(APP.t % 15 === 0);
    if (NET.snap) { APP.G = unpack(NET.snap); NET.snap = null; }
    if (NET.inEv.length) { handleEvents(APP.G || G, NET.inEv); NET.inEv = []; }
    if (APP.G && APP.G.phase === 'end' && APP.G.pt > 90 && IN.take('START')) { netSend({ t: 'menu', to: 'select' }); goSelect(); }
    if (IN.take('BACK') && APP.G && APP.G.phase === 'end') goTitle();
    return;
  }
  if (!G) return;
  // 일시정지 (CPU 모드)
  if (APP.mode === 'cpu' && (IN.take('BACK') || IN.take('PAUSE')) && G.phase !== 'end') { APP.paused = !APP.paused; APP.pauseIdx = 0; playSfx('cursor'); return; }
  if (APP.paused) {
    if (IN.take('U') || IN.take('D')) { APP.pauseIdx = 1 - APP.pauseIdx; playSfx('cursor'); }
    if (IN.take('START') || IN.take('S1')) { if (APP.pauseIdx === 0) APP.paused = false; else goTitle(); playSfx('confirm'); }
    return;
  }
  if (G.phase === 'end') {
    if (G.pt > 90) {
      if (IN.take('START')) { if (APP.mode === 'online') netSend({ t: 'menu', to: 'select' }); goSelect(); return; }
      if (IN.take('BACK')) { goTitle(); return; }
      if (APP.mode === 'cpu' && IN.take('S4')) { startVS(G.F[0].c, G.F[1].c, G.stage, (Math.random() * 1e9) | 0); return; }
    }
  }
  const me = APP.autoP1 ? aiInput(G, G.F[0], G.F[1], APP.ai[0], 2) : { h: IN.heldMask(), p: IN.pressMask() };
  let inputs;
  if (APP.mode === 'online') inputs = [me, guestInput()];
  else inputs = [me, aiInput(G, G.F[1], G.F[0], APP.ai[1], APP.diff)];
  G.ev = [];
  stepGame(G, inputs);
  handleEvents(G, G.ev);
  if (APP.mode === 'online') {
    NET.outEv.push(...G.ev);
    const dc = NET.conn && NET.conn.dataChannel;
    if (!dc || dc.bufferedAmount < 200000) { netSend({ t: 'st', g: snapshot(G), e: NET.outEv }); NET.outEv = []; }
  }
}

// ---------- 렌더 ----------
function render() {
  const t = APP.t;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.imageSmoothingEnabled = false;
  bctx.clearRect(0, 0, VW, VH);
  switch (APP.state) {
    case 'title': case 'lobby': case 'account': rTitleBuf(t); break;
    case 'select': rSelectBuf(t); break;
    case 'vs': rVSBuf(t); break;
    case 'fight': if (APP.G) renderWorld(bctx, APP.G, t); break;
    case 'dict': rDictBuf(t); break;
    default: break;
  }
  // 버퍼 → 화면 (2배, 도트 유지)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  let sx = 0, sy = 0;
  if (FX.shakeT > 0) { sx = (Math.random() - 0.5) * FX.shakeI * 2; sy = (Math.random() - 0.5) * FX.shakeI * 2; }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(BUF, Math.round(sx), Math.round(sy), cv.width, cv.height);
  ctx.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  switch (APP.state) {
    case 'title': case 'lobby': case 'account': rTitleHUD(t); break;
    case 'select': rSelectHUD(t); break;
    case 'vs': rVSHUD(t); break;
    case 'fight': if (APP.G) { renderHUD(ctx, APP.G, t); rFightOverlay(t); } break;
    case 'dict': rDictHUD(t); break;
    default: break;
  }
  if (APP.toastT > 0) {
    ctx.globalAlpha = Math.min(1, APP.toastT / 20);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(140, 238, 200, 18);
    txt(ctx, APP.toastS, 240, 251, 8.5, '#fff', 'center', FONT_KR2, 0);
    ctx.globalAlpha = 1;
  }
  if (APP.mode === 'online' && NET.conn) txt(ctx, `ONLINE ${NET.ping}ms`, 476, 266, 5.5, NET.ping < 80 ? '#7dff9a' : NET.ping < 160 ? '#ffe14d' : '#ff6b6b', 'right', FONT_EN);
}

// --- 타이틀 ---
function rTitleBuf(t) {
  const idx = Math.floor(t / 420) % STAGE_KEYS.length;
  const key = STAGE_KEYS[idx];
  const cam = ((t % 420) / 420) * (ARENA_W - VW);
  drawStage(bctx, key, cam, t, 0.3);
  bctx.fillStyle = 'rgba(5,5,25,0.55)'; bctx.fillRect(0, 0, VW, VH);
  // 두 캐릭터 실루엣
  const a = SELECT_ORDER[idx % 12], b = SELECT_ORDER[(idx + 5) % 12];
  for (const [c, x, f] of [[a, 70, 1], [b, 410, -1]]) {
    bctx.save(); bctx.translate(x, 250); bctx.scale(f * 1.7, 1.7);
    const pose = idlePose(c, t);
    drawCharacter(bctx, c, pose, t, {});
    bctx.restore();
  }
}
function rTitleHUD(t) {
  const y0 = 60 + Math.sin(t * 0.04) * 2;
  bigText(ctx, 'TEKKEN 2D', 240, y0, 30, '#fffbe0', '#ff8c00');
  bigText(ctx, 'BATTLE', 240, y0 + 32, 26, '#ffffff', '#ff3d00');
  txt(ctx, 'GLOBAL CHAMPIONSHIP EDITION', 240, y0 + 46, 7, '#9fe6ff', 'center', FONT_EN, '#000');
  if (APP.state === 'lobby' || APP.state === 'account') return;
  txt(ctx, ACC.token ? '👤 ' + ACC.nick : '로그인하면 친구와 대전할 수 있어요', 474, 12, 7.5, ACC.token ? '#ffe14d' : '#aab', 'right', FONT_KR2);
  const items = TITLE_MENU();
  items.forEach((s, i) => {
    const y = 128 + i * 14, on = i === APP.menu;
    if (on) { ctx.fillStyle = 'rgba(255,200,0,0.25)'; ctx.fillRect(160, y - 11, 160, 14); txt(ctx, '▶', 166, y, 9, '#ffe14d', 'left', FONT_KR2); }
    txt(ctx, s, 240, y, on ? 11 : 9.5, on ? '#ffe14d' : '#dfe6ff', 'center', FONT_KR);
  });
  txt(ctx, '↑↓ 선택   SPACE/ENTER 결정   ←→ 설정 변경   M: BGM', 240, 262, 7, '#aab', 'center', FONT_KR2);
}

// --- 캐릭터 선택 ---
function selBg(t) {
  const gr = bctx.createLinearGradient(0, 0, 0, VH);
  gr.addColorStop(0, '#0b0d33'); gr.addColorStop(1, '#2a0b3a');
  bctx.fillStyle = gr; bctx.fillRect(0, 0, VW, VH);
  bctx.strokeStyle = 'rgba(120,140,255,0.12)'; bctx.lineWidth = 1;
  for (let x = -VH; x < VW; x += 16) { const o = (t * 0.3) % 16; bctx.beginPath(); bctx.moveTo(x + o, 0); bctx.lineTo(x + o + VH, VH); bctx.stroke(); }
}
function selTiles() { const out = []; for (let i = 0; i < 12; i++) out.push({ i, c: SELECT_ORDER[i], x: 240 - 3 * 37 + (i % 6) * 37, y: 190 + Math.floor(i / 6) * 38 }); return out; }
function rSelectBuf(t) {
  selBg(t);
  const S = APP.sel;
  const leftC = APP.mySide === 0 ? myChar() : (S.opp.c !== null ? S.opp.c : SELECT_ORDER[S.opp.cur]);
  const rightC = APP.mySide === 0 ? (APP.mode === 'cpu' ? (S.roulette > 0 || S.cpuC !== null ? SELECT_ORDER[S.opp.cur] : null) : (S.opp.c !== null ? S.opp.c : SELECT_ORDER[S.opp.cur])) : myChar();
  for (const [c, x, f, ready] of [[leftC, 78, 1, APP.mySide === 0 ? S.ready : S.opp.ready], [rightC, 402, -1, APP.mySide === 1 ? S.ready : S.opp.ready]]) {
    bctx.fillStyle = 'rgba(0,0,0,0.35)'; bctx.beginPath(); bctx.ellipse(x, 176, 40, 6, 0, 0, Math.PI * 2); bctx.fill();
    if (c === null || c === undefined) {
      bctx.fillStyle = 'rgba(255,255,255,0.15)'; bctx.font = `60px ${FONT_EN}`; bctx.textAlign = 'center'; bctx.fillText('?', x, 150); bctx.textAlign = 'left';
      continue;
    }
    bctx.save(); bctx.translate(x, 176); bctx.scale(f * 1.45, 1.45);
    const F = makeFighter(0, c); F.anim = t;
    drawCharacter(bctx, c, ready ? winPose(c, t) : idlePose(c, t), t, {});
    bctx.restore();
  }
  // 타일
  for (const T of selTiles()) {
    bctx.fillStyle = '#000'; bctx.fillRect(T.x - 1, T.y - 1, 36, 36);
    const gr = bctx.createLinearGradient(0, T.y, 0, T.y + 34);
    gr.addColorStop(0, shade(CHARS[T.c].color, 0.25)); gr.addColorStop(1, shade(CHARS[T.c].color, -0.35));
    bctx.fillStyle = gr; bctx.fillRect(T.x, T.y, 34, 34);
    bctx.save(); bctx.beginPath(); bctx.rect(T.x, T.y, 34, 34); bctx.clip();
    drawPortrait(bctx, T.c, T.x + 16, T.y + 22, 1.45, 1, 'n', t);
    bctx.restore();
  }
}
function rSelectHUD(t) {
  const S = APP.sel;
  bigText(ctx, 'PLAYER SELECT', 240, 20, 12, '#ffffff', '#ffb000');
  // 커서
  const tiles = selTiles();
  const cursors = [];
  cursors.push({ side: APP.mySide, cur: S.cur, ready: S.ready, hidden: S.hidden });
  if (APP.mode === 'online') cursors.push({ side: 1 - APP.mySide, cur: S.opp.cur, ready: S.opp.ready });
  else if (S.roulette > 0 || S.cpuC !== null) cursors.push({ side: 1, cur: S.opp.cur, ready: S.roulette === 0, cpu: true });
  for (const c of cursors) {
    const T = tiles[c.cur]; if (!T) continue;
    const col = c.side === 0 ? '#ff3b3b' : '#3b9bff';
    const blink = c.ready || (t >> 3) % 2;
    ctx.strokeStyle = blink ? col : '#fff'; ctx.lineWidth = 2;
    const off = c.side === 0 ? 0 : 2;
    ctx.strokeRect(T.x - 1 + off, T.y - 1 + off, 36 - off * 2, 36 - off * 2);
    txt(ctx, c.cpu ? 'CPU' : (c.side + 1) + 'P', c.side === 0 ? T.x + 1 : T.x + 33, T.y + 6, 5.5, col, c.side === 0 ? 'left' : 'right', FONT_EN, '#000');
  }
  // 이름/국가
  const S2 = APP.sel;
  const showC = (side) => {
    if (side === APP.mySide) return myChar();
    if (APP.mode === 'online') return S2.opp.c !== null ? S2.opp.c : SELECT_ORDER[S2.opp.cur];
    return S2.roulette > 0 || S2.cpuC !== null ? SELECT_ORDER[S2.opp.cur] : null;
  };
  for (const side of [0, 1]) {
    const c = showC(side), x = side === 0 ? 78 : 402;
    if (c === null || c === undefined) { txt(ctx, APP.mode === 'cpu' ? 'CPU' : '대기 중', x, 190, 10, '#889', 'center'); continue; }
    const C = CHARS[c];
    txt(ctx, C.name, x, 191, 13, '#fff', 'center');
    drawFlag(ctx, C.country, x - 28, 196, 13, 9);
    txt(ctx, COUNTRIES[C.country].name, x - 12, 204, 8, '#dfe6ff', 'left', FONT_KR2);
    const ready = side === APP.mySide ? S2.ready : S2.opp.ready;
    if (APP.mode === 'online') txt(ctx, ready ? 'READY!' : '선택 중...', x, 216, ready ? 7 : 8, ready ? '#7dff9a' : '#aab', 'center', ready ? FONT_EN : FONT_KR2);
  }
  // 정보창 (내 커서 캐릭터)
  const C = CHARS[myChar()];
  ctx.fillStyle = 'rgba(0,0,20,0.7)'; ctx.fillRect(150, 30, 180, 150);
  ctx.strokeStyle = C.color; ctx.lineWidth = 1; ctx.strokeRect(150.5, 30.5, 179, 149);
  txt(ctx, C.name + (C.hidden ? '  (HIDDEN)' : ''), 240, 45, 11, C.color === '#2c3e50' ? '#9fc3e6' : shade(C.color, 0.3), 'center');
  txt(ctx, C.desc.join(' · '), 240, 56, 7, '#cdd', 'center', FONT_KR2, 0);
  let y = 70;
  const mc = myChar();
  for (let k = 0; k < 4; k++) {
    const sk = skillDef(mc, k);
    ctx.fillStyle = sk ? '#ffe14d' : '#555a70'; ctx.fillRect(156, y - 7, 9, 9);
    txt(ctx, SLOT_KEYS[k], 160.5, y + 0.5, 6, '#000', 'center', FONT_EN, 0);
    if (!sk) { txt(ctx, `(비어 있음 · 쿨 ${SLOT_CD[k]}초)`, 169, y, 7.5, '#6b6f86', 'left', FONT_KR2, 0); y += 11; continue; }
    txt(ctx, sk.name + `  (${SLOT_CD[k]}초)`, 169, y, 8.5, '#fff', 'left', FONT_KR, 0);
    y += wrapText(ctx, skillInfo(mc, k), 169, y + 9, 156, 6.5, '#b8c4dd') + 10;
  }
  txt(ctx, '패시브 · ' + C.passive.name, 156, y + 2, 8.5, '#ffb3e6', 'left', FONT_KR, 0);
  wrapText(ctx, passiveInfo(mc), 156, y + 11, 168, 6.5, '#b8c4dd');
  const rec = getRecords()[myChar()] || 0;
  txt(ctx, `🏆 승리 ${rec}`, 324, 175, 7, '#ffe14d', 'right', FONT_KR2, 0);
  const hint = APP.mode === 'online' ? (S.ready ? '상대를 기다리는 중... (ESC 취소)' : '←→↑↓ 이동 · SPACE 결정 · K 히든 · C 도감')
    : '←→↑↓ 이동 · SPACE 결정 · K 히든(Tirón) · C 도감 · ESC 뒤로';
  txt(ctx, hint, 240, 268, 7, '#aab', 'center', FONT_KR2);
}
function wrapText(ctx, s, x, y, maxW, size, col) {
  ctx.font = `${size}px ${FONT_KR2}`;
  const words = s.split(' ');
  let line = '', lines = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { txt(ctx, line, x, y + lines * (size + 2), size, col, 'left', FONT_KR2, 0); lines++; line = w; } else line = test;
  }
  if (line) { txt(ctx, line, x, y + lines * (size + 2), size, col, 'left', FONT_KR2, 0); lines++; }
  return lines * (size + 2);
}

// --- VS ---
function rVSBuf(t) {
  const v = APP.vs, k = Math.min(1, APP.st / 18);
  bctx.fillStyle = '#7a0d0d'; bctx.beginPath(); bctx.moveTo(0, 0); bctx.lineTo(VW / 2 + 30, 0); bctx.lineTo(VW / 2 - 30, VH); bctx.lineTo(0, VH); bctx.fill();
  bctx.fillStyle = '#0d1f7a'; bctx.beginPath(); bctx.moveTo(VW / 2 + 30, 0); bctx.lineTo(VW, 0); bctx.lineTo(VW, VH); bctx.lineTo(VW / 2 - 30, VH); bctx.fill();
  for (let i = 0; i < 30; i++) { bctx.fillStyle = 'rgba(255,255,255,0.08)'; const y = (i * 37 + t * 4) % VH; bctx.fillRect(0, y, VW, 1); }
  for (const [c, x, f] of [[v.c0, lerp(-80, 120, k), 1], [v.c1, lerp(560, 360, k), -1]]) {
    bctx.save(); bctx.translate(x, 250); bctx.scale(f * 2.15, 2.15);
    drawCharacter(bctx, c, idlePose(c, t), t, {});
    bctx.restore();
  }
}
function rVSHUD(t) {
  const v = APP.vs;
  const pulse = 1 + Math.sin(t * 0.3) * 0.05;
  ctx.save(); ctx.translate(240, 140); ctx.scale(pulse, pulse); bigText(ctx, 'VS', 0, 0, 40, '#fffbe0', '#ff8c00'); ctx.restore();
  txt(ctx, CHARS[v.c0].name, 20, 30, 18, '#fff', 'left');
  txt(ctx, CHARS[v.c1].name, 460, 30, 18, '#fff', 'right');
  drawFlag(ctx, CHARS[v.c0].country, 20, 38, 18, 12); txt(ctx, COUNTRIES[CHARS[v.c0].country].name, 42, 48, 9, '#fdd', 'left', FONT_KR2);
  drawFlag(ctx, CHARS[v.c1].country, 442, 38, 18, 12); txt(ctx, COUNTRIES[CHARS[v.c1].country].name, 438, 48, 9, '#ddf', 'right', FONT_KR2);
  const S = STAGE_DEF[v.stage];
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(140, 246, 200, 16);
  txt(ctx, 'STAGE · ' + S.name, 240, 258, 8.5, '#ffe14d', 'center', FONT_KR2, 0);
  if (APP.mode === 'online') txt(ctx, APP.mySide === 0 ? '◀ YOU' : 'YOU ▶', APP.mySide === 0 ? 20 : 460, 64, 7, '#ffe14d', APP.mySide === 0 ? 'left' : 'right', FONT_EN);
}

// --- 도감 ---
function rDictBuf(t) {
  const c = APP.dict, C = CHARS[c];
  drawStage(bctx, C.stage, 120, t, 0);
  bctx.fillStyle = 'rgba(0,0,20,0.55)'; bctx.fillRect(0, 0, VW, VH);
  const cyc = Math.floor(APP.st / 70) % 5;
  const F = makeFighter(0, c); F.anim = t;
  let vs = 'idle';
  if (cyc === 1) { F.atk = 'P'; F.atkStep = 1 + (Math.floor(APP.st / 10) % 3); F.atkAct = 3; F.atkDur = 10; F.atkT = APP.st % 10; vs = 'atk'; }
  if (cyc === 2) { F.atk = 'K'; F.atkAct = 6; F.atkDur = 22; F.atkT = APP.st % 22; vs = 'atk'; }
  if (cyc === 3) vs = 'cast';
  if (cyc === 4) vs = 'win';
  bctx.save(); bctx.translate(105, 240); bctx.scale(2.1, 2.1);
  drawCharacter(bctx, c, poseOf(F, vs, null), t, {});
  bctx.restore();
}
function rDictHUD(t) {
  const c = APP.dict, C = CHARS[c];
  bigText(ctx, 'CHARACTER FILE', 240, 18, 10, '#ffffff', '#ffb000');
  ctx.fillStyle = 'rgba(0,0,20,0.75)'; ctx.fillRect(200, 28, 268, 222);
  ctx.strokeStyle = C.color; ctx.strokeRect(200.5, 28.5, 267, 221);
  txt(ctx, C.name, 210, 50, 18, '#fff', 'left');
  drawFlag(ctx, C.country, 210, 56, 15, 10);
  txt(ctx, COUNTRIES[C.country].name + ' · ' + STAGE_DEF[C.stage].name, 230, 64, 8, '#cdd', 'left', FONT_KR2, 0);
  txt(ctx, C.desc.join(' / '), 210, 80, 8, '#ffe9a8', 'left', FONT_KR2, 0);
  let y = 96;
  for (let k = 0; k < 4; k++) {
    const sk = skillDef(c, k);
    ctx.fillStyle = sk ? '#ffe14d' : '#555a70'; ctx.fillRect(210, y - 8, 10, 10);
    txt(ctx, SLOT_KEYS[k], 215, y + 0.5, 6.5, '#000', 'center', FONT_EN, 0);
    if (!sk) { txt(ctx, `비어 있음 (추후 추가) · 쿨타임 ${SLOT_CD[k]}초`, 224, y, 8, '#6b6f86', 'left', FONT_KR2, 0); y += 13; continue; }
    txt(ctx, sk.name + `   쿨타임 ${SLOT_CD[k]}초`, 224, y, 9.5, '#fff', 'left', FONT_KR, 0);
    y += wrapText(ctx, skillInfo(c, k), 224, y + 11, 236, 7.5, '#b8c4dd') + 14;
  }
  txt(ctx, '패시브 · ' + C.passive.name, 210, y, 9.5, '#ffb3e6', 'left', FONT_KR, 0);
  y += wrapText(ctx, passiveInfo(c), 210, y + 11, 250, 7.5, '#b8c4dd') + 16;
  txt(ctx, '“' + WIN_QUOTES[c] + '”', 210, y, 8, '#9fe6ff', 'left', FONT_KR2, 0);
  const rec = getRecords()[c] || 0;
  txt(ctx, `🏆 내 승리 기록: ${rec}회`, 460, 244, 8, '#ffe14d', 'right', FONT_KR2, 0);
  const order = [...SELECT_ORDER, TIRON];
  txt(ctx, `◀ ${order.indexOf(c) + 1} / ${order.length} ▶`, 334, 244, 8, '#fff', 'center', FONT_EN, 0);
  txt(ctx, '←→ 넘기기 · ESC 닫기', 105, 262, 7.5, '#aab', 'center', FONT_KR2);
}

// --- 대전 오버레이 (일시정지/결과) ---
function rFightOverlay(t) {
  const G = APP.G;
  if (APP.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
    bigText(ctx, 'PAUSE', 240, 110, 20, '#fff', '#ffb000');
    ['계속하기', '타이틀로'].forEach((s, i) => txt(ctx, (i === APP.pauseIdx ? '▶ ' : '') + s, 240, 140 + i * 16, 10, i === APP.pauseIdx ? '#ffe14d' : '#ddd', 'center'));
    return;
  }
  if (G.phase === 'end' && G.pt > 40) {
    const a = Math.min(1, (G.pt - 40) / 30);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,10,0.72)'; ctx.fillRect(0, 0, VW, VH);
    if (G.mw >= 0) {
      const W = G.F[G.mw];
      const mine = G.mw === APP.mySide;
      bigText(ctx, mine ? 'YOU WIN!' : 'YOU LOSE', 240, 50, 22, '#ffffff', mine ? '#ffd400' : '#6fa8ff');
      ctx.fillStyle = CHARS[W.c].color; ctx.fillRect(40, 70, 90, 90);
      ctx.save(); ctx.beginPath(); ctx.rect(40, 70, 90, 90); ctx.clip();
      drawPortrait(ctx, W.c, 85, 128, 3.3, 1, 'win', t);
      ctx.restore();
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.strokeRect(40, 70, 90, 90);
      txt(ctx, CHARS[W.c].name, 145, 92, 16, '#fff', 'left');
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(145, 102, 300, 40);
      wrapText(ctx, '“' + WIN_QUOTES[W.c] + '”', 152, 118, 286, 10, '#ffe9a8');
    } else bigText(ctx, 'DRAW GAME', 240, 90, 22, '#ffffff', '#aaaaaa');
    if (G.pt > 90 && (t >> 4) % 2) {
      const opts = APP.mode === 'cpu' ? 'SPACE: 캐릭터 선택   R: 같은 대진 재대전   ESC: 타이틀' : 'SPACE: 캐릭터 다시 선택   ESC: 나가기';
      txt(ctx, opts, 240, 200, 9, '#fff', 'center', FONT_KR2);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- 로비 (HTML 오버레이) ----------
function showLobby() {
  setState('lobby');
  document.getElementById('lobby').classList.remove('hidden');
  netStatus('같은 와이파이라면 <b>자동 매칭</b>, 멀리 있는 친구라면 <b>방 만들기</b> 후 코드를 알려 주세요.');
}
function hideLobby() { const el = document.getElementById('lobby'); if (el) el.classList.add('hidden'); }
function setupLobby() {
  document.getElementById('btnLan').onclick = () => { AUD.resume(); netAutoLan(); };
  document.getElementById('btnHost').onclick = () => { AUD.resume(); netCreateRoom(); };
  document.getElementById('btnJoin').onclick = () => { AUD.resume(); netJoinRoom(document.getElementById('roomInput').value); };
  document.getElementById('roomInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') netJoinRoom(e.target.value); e.stopPropagation(); });
  document.getElementById('btnLobbyBack').onclick = () => { netReset(); goTitle(); };
}

// ---------- 메인 루프 (고정 60fps) ----------
let _acc = 0, _last = performance.now();
function frame(now) {
  _acc += Math.min(100, now - _last); _last = now;
  let n = 0;
  while (_acc >= 1000 / 60 && n < 5) { tick(); _acc -= 1000 / 60; n++; }
  if (n >= 5) _acc = 0;
  render();
  requestAnimationFrame(frame);
}

function boot() {
  setupTouch();
  setupLobby();
  document.getElementById('btnAccBack').onclick = () => { if (ACC.waiting) cancelWaiting(true); goTitle(); };
  if (ACC.token) setTimeout(pollNow, 500);
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('touch', touch);
  goTitle();
  requestAnimationFrame(frame);
  // 첫 입력 전에는 오디오가 막혀 있으므로 클릭 시 재개
  const unlock = () => AUD.resume();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  // 테스트용 훅
  window.__T2D = { APP, NET, IN, stepGame, startVS, goSelect, CHARS, tick, render, FX };
}
boot();
