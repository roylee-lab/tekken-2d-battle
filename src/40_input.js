// ============================================================
//  입력 (키보드: e.code 사용 → 한글 입력 상태에서도 동작 / 터치 버튼)
// ============================================================
const KEYMAP = {
  ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
  KeyS: 'P', KeyD: 'K', KeyQ: 'S1', KeyW: 'S2', KeyE: 'S3', KeyR: 'S4',
  Space: 'START', Enter: 'START', NumpadEnter: 'START', Escape: 'BACK', Backspace: 'BACK',
  KeyK: 'HID', KeyC: 'DICT', KeyM: 'MUTE', KeyP: 'PAUSE',
};
const BTN_BIT = { L: B_L, R: B_R, U: B_U, D: B_D, P: B_P, K: B_K, S1: B_S1, S2: B_S2, S3: B_S3, S4: B_S4 };
const IN = {
  held: new Set(), pressed: new Set(), counts: { U: 0, P: 0, K: 0, S1: 0, S2: 0, S3: 0, S4: 0 },
  down(b) {
    AUD.resume();
    if (!this.held.has(b)) { this.pressed.add(b); if (b in this.counts) this.counts[b]++; }
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
  const b = KEYMAP[e.code];
  if (!b) return;
  e.preventDefault();
  if (e.repeat) return;
  IN.down(b);
});
window.addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (b) IN.up(b); });
window.addEventListener('blur', () => IN.held.clear());

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
