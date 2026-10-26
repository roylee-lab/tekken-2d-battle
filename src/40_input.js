// ============================================================
//  입력 (키보드: e.code 사용 → 한글 입력 상태에서도 동작 / 터치 버튼)
// ============================================================
const KEYMAP = {
  ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
  KeyS: 'P', KeyD: 'K', KeyQ: 'S1', KeyW: 'S2', KeyE: 'S3', KeyR: 'S4', KeyT: 'S5', KeyY: 'S6',
  Space: 'START', Enter: 'START', NumpadEnter: 'START', Escape: 'BACK', Backspace: 'BACK',
  KeyK: 'HID', KeyC: 'DICT', KeyM: 'MUTE', KeyP: 'PAUSE', KeyB: 'BOSS',
};
const BTN_BIT = { L: B_L, R: B_R, U: B_U, D: B_D, P: B_P, K: B_K, S1: B_S1, S2: B_S2, S3: B_S3, S4: B_S4, S5: B_S5, S6: B_S6 };
const IN = {
  held: new Set(), pressed: new Set(), counts: { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0 },
  // 글자 입력(패드립 배틀/KC)과 연타 횟수(초크 탈출)
  keyLog: [], keySeq: 0, keyTaken: 0, anyN: 0, anyTaken: 0,
  letter(L) { this.keySeq++; this.keyLog.push([this.keySeq, L]); if (this.keyLog.length > 40) this.keyLog.shift(); },
  takeKeys() { let s = ''; for (const [q, L] of this.keyLog) if (q > this.keyTaken) s += L; this.keyTaken = this.keySeq; return s; },
  takeAny() { const n = this.anyN - this.anyTaken; this.anyTaken = this.anyN; return n; },
  syncTaken() { this.keyTaken = this.keySeq; this.anyTaken = this.anyN; },
  down(b) {
    AUD.resume();
    if (!this.held.has(b)) { this.pressed.add(b); if (b in this.counts) this.counts[b]++; this.anyN++; }
    this.held.add(b);
  },
  up(b) { this.held.delete(b); },
  take(b) { if (this.pressed.has(b)) { this.pressed.delete(b); return true; } return false; },
  clear() { this.pressed.clear(); },
  heldMask() { let m = 0; for (const b of this.held) if (BTN_BIT[b]) m |= BTN_BIT[b]; return m; },
  pressMask() { let m = 0; for (const b of this.pressed) if (BTN_BIT[b]) m |= BTN_BIT[b]; return m; },
};

function inTextField(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'); }
window.addEventListener('keydown', (e) => {
  if (inTextField(e)) return;
  const m = /^Key([A-Z])$/.exec(e.code);
  if (m && !e.repeat) IN.letter(m[1]);
  const b = KEYMAP[e.code];
  if (!b) { if (!e.repeat && (m || /^(Digit|Numpad)/.test(e.code))) IN.anyN++; return; }
  e.preventDefault();
  if (e.repeat) return;
  IN.down(b);
});
window.addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (b) IN.up(b); });
window.addEventListener('blur', () => IN.held.clear());

// 모바일: 화면 터치 = 패드립 배틀 글자 / KC 연타 / 초크 탈출 연타
function setupCanvasTap() {
  const cvs = document.getElementById('screen');
  cvs.addEventListener('pointerdown', () => {
    if (typeof APP === 'undefined' || APP.state !== 'fight' || !APP.G) return;
    const G = APP.G, me = G.F[APP.mySide];
    IN.anyN++;
    if (G.qte && G.qte.st === 'show') IN.letter(G.qte.L);
    else if (me && me.kcT > 0) IN.letter(IN.keySeq % 2 ? 'K' : 'C');
  });
}
function setupTouch() {
  document.querySelectorAll('[data-btn]').forEach((el) => {
    const b = el.dataset.btn;
    const on = (e) => { e.preventDefault(); el.classList.add('on'); IN.down(b); };
    const off = (e) => { e.preventDefault(); el.classList.remove('on'); IN.up(b); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
