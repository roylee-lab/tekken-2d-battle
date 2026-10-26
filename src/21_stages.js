// ============================================================
//  나라별 스테이지 배경 (절차적 도트 일러스트 + 패럴랙스)
// ============================================================
const FT = 212;                                   // 바닥이 시작되는 y
const PAR_FAR = 0.25, PAR_MID = 0.6, PAR_CROWD = 0.85;
const W_FAR = Math.ceil(VW + (ARENA_W - VW) * PAR_FAR), W_MID = Math.ceil(VW + (ARENA_W - VW) * PAR_MID);

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function vgrad(g, x, y, w, h, stops) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function starsG(g, w, h, n, R, col) { for (let i = 0; i < n; i++) { g.fillStyle = col || (R() < 0.3 ? '#fff' : '#9ab'); g.fillRect(Math.floor(R() * w), Math.floor(R() * h), 1, 1); } }
function ridge(g, w, base, amp, col, R, f1, f2) {
  const p1 = R() * 10, p2 = R() * 10;
  g.fillStyle = col; g.beginPath(); g.moveTo(0, FT + 5);
  for (let x = 0; x <= w; x += 2) g.lineTo(x, base - amp * (0.55 * Math.sin(x * f1 + p1) + 0.35 * Math.sin(x * f2 + p2) + 0.4));
  g.lineTo(w, FT + 5); g.closePath(); g.fill();
}
function cloud(g, x, y, s, col) {
  g.fillStyle = col;
  for (const [dx, dy, r] of [[0, 0, 7], [8, -4, 8], [17, 0, 7], [9, 3, 7], [-7, 3, 5], [24, 3, 5]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
}
function windows(g, x, y, w, h, R, lit, dark, step) {
  step = step || 4;
  for (let yy = y + 3; yy < y + h - 3; yy += step + 1) for (let xx = x + 2; xx < x + w - 3; xx += step) {
    g.fillStyle = R() < 0.45 ? lit[Math.floor(R() * lit.length)] : dark;
    g.fillRect(xx, yy, 2, 2);
  }
}
function palm(g, x, y, h, col, leaf) {
  g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - h * 0.5, x + 3, y - h); g.stroke();
  g.strokeStyle = leaf; g.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.beginPath(); g.moveTo(x + 3, y - h);
    g.quadraticCurveTo(x + 3 + Math.cos(a) * 12, y - h + Math.sin(a) * 6 - 4, x + 3 + Math.cos(a) * 20, y - h + 8 + Math.abs(Math.cos(a)) * 4);
    g.stroke();
  }
}
function cypress(g, x, y, h, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y - h / 2, h * 0.14, h / 2, 0, 0, Math.PI * 2); g.fill(); }
function floorBase(g, top, bot) { vgrad(g, 0, FT, ARENA_W, VH - FT, [[0, top], [1, bot]]); }
function perspLines(g, col, n, vy) {
  g.strokeStyle = col; g.lineWidth = 1;
  for (let i = -n; i <= n * 2; i++) {
    const xb = i * (ARENA_W / n);
    const xt = ARENA_W / 2 + (xb - ARENA_W / 2) * 0.55;
    g.beginPath(); g.moveTo(xt, FT); g.lineTo(xb, VH); g.stroke();
  }
  if (vy) for (const y of vy) { g.beginPath(); g.moveTo(0, y); g.lineTo(ARENA_W, y); g.stroke(); }
}

// 국기
function drawFlag(g, code, x, y, w, h) {
  g.save(); g.translate(x, y);
  const r = (c, a, b, cc, d) => { g.fillStyle = c; g.fillRect(a, b, cc, d); };
  switch (code) {
    case 'KR': {
      r('#fff', 0, 0, w, h);
      const cx = w / 2, cy = h / 2, rr = h * 0.25;
      g.fillStyle = '#c60c30'; g.beginPath(); g.arc(cx, cy, rr, Math.PI, 0); g.fill();
      g.fillStyle = '#003478'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI); g.fill();
      g.fillStyle = '#c60c30'; g.beginPath(); g.arc(cx - rr / 2, cy, rr / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#003478'; g.beginPath(); g.arc(cx + rr / 2, cy, rr / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000';
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 3; k++) g.fillRect(cx + dx * w * 0.32 - w * 0.06, cy + dy * h * 0.3 - 2 + k * 1.6, w * 0.12, 0.9);
      break;
    }
    case 'FR': r('#0055a4', 0, 0, w / 3, h); r('#fff', w / 3, 0, w / 3, h); r('#ef4135', 2 * w / 3, 0, w / 3 + 0.5, h); break;
    case 'IT': r('#009246', 0, 0, w / 3, h); r('#fff', w / 3, 0, w / 3, h); r('#ce2b37', 2 * w / 3, 0, w / 3 + 0.5, h); break;
    case 'VN': r('#da251d', 0, 0, w, h); star(g, w / 2, h / 2, h * 0.3, '#ffcd00'); break;
    case 'CN': r('#de2910', 0, 0, w, h); star(g, w * 0.17, h * 0.27, h * 0.17, '#ffde00'); for (const [a, b] of [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]]) star(g, w * a, h * b, h * 0.06, '#ffde00'); break;
    case 'BR':
      r('#009c3b', 0, 0, w, h);
      g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w * 0.08, h / 2); g.lineTo(w / 2, h * 0.1); g.lineTo(w * 0.92, h / 2); g.lineTo(w / 2, h * 0.9); g.fill();
      g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(w / 2 - h * 0.24, h / 2 - 0.4, h * 0.48, 0.9);
      break;
    case 'EG':
      r('#ce1126', 0, 0, w, h / 3); r('#fff', 0, h / 3, w, h / 3); r('#000', 0, 2 * h / 3, w, h / 3 + 0.5);
      g.fillStyle = '#c09300'; g.fillRect(w / 2 - 1.5, h / 2 - 1.5, 3, 3);
      break;
    case 'US':
      for (let i = 0; i < 7; i++) r(i % 2 ? '#fff' : '#b22234', 0, (i * h) / 7, w, h / 7 + 0.5);
      r('#3c3b6e', 0, 0, w * 0.42, h * 0.54);
      g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) g.fillRect(2 + j * w * 0.1, 1.5 + i * h * 0.16, 1, 1);
      break;
    case 'IN':
      r('#ff9933', 0, 0, w, h / 3); r('#fff', 0, h / 3, w, h / 3); r('#138808', 0, 2 * h / 3, w, h / 3 + 0.5);
      g.strokeStyle = '#000080'; g.lineWidth = 0.8; g.beginPath(); g.arc(w / 2, h / 2, h * 0.13, 0, Math.PI * 2); g.stroke();
      break;
    case 'ES': r('#aa151b', 0, 0, w, h); r('#f1bf00', 0, h / 4, w, h / 2); g.fillStyle = '#aa151b'; g.fillRect(w * 0.25, h * 0.38, w * 0.1, h * 0.24); break;
    case 'JP': r('#fff', 0, 0, w, h); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); g.fill(); break;
    default: r('#888', 0, 0, w, h);
  }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(0, 0, w, h);
  g.restore();
}
function star(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// 관중 (애니메이션)
function crowdSpec(seed, n, palette, y0) {
  const R = mulberry32(seed), out = [];
  for (let i = 0; i < n; i++) out.push({ x: 10 + R() * (ARENA_W - 20), y: y0 + R() * 6, c: palette[Math.floor(R() * palette.length)], h: 9 + R() * 4, ph: R() * 6, arm: R() < 0.5, sk: R() < 0.5 ? '#d8a878' : '#8d5a3b' });
  return out.sort((a, b) => a.y - b.y);
}
function drawCrowd(ctx, spec, t, cx, hype) {
  for (const p of spec) {
    const x = Math.round(p.x - cx * PAR_CROWD);
    if (x < -10 || x > VW + 10) continue;
    const b = Math.max(0, Math.sin(t * (0.12 + hype * 0.1) + p.ph)) * (1.5 + hype * 2);
    const y = Math.round(p.y - b);
    ctx.fillStyle = p.c; ctx.fillRect(x - 3, y - p.h, 7, p.h);
    ctx.fillStyle = p.sk; ctx.fillRect(x - 2, y - p.h - 5, 5, 5);
    if (p.arm) { ctx.fillStyle = p.c; ctx.fillRect(x + 3, y - p.h - 6 - b, 2, 7); }
  }
}

// ---------- 스테이지 정의 ----------
const STAGE_DEF = {};

STAGE_DEF.seoul = {
  name: '서울 · 한강 야경', country: 'KR', bgm: 'seoul',
  far(g) {
    const R = mulberry32(11);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#070a24'], [0.5, '#1d1550'], [0.8, '#5a2a6e'], [1, '#c4577a']]);
    starsG(g, W_FAR, 110, 90, R);
    g.fillStyle = '#f3f0d8'; g.beginPath(); g.arc(470, 40, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1550'; g.beginPath(); g.arc(476, 36, 11, 0, Math.PI * 2); g.fill();
    // 남산
    g.fillStyle = '#141a3d'; g.beginPath(); g.moveTo(140, FT); g.quadraticCurveTo(270, 70, 400, FT); g.fill();
    // N서울타워
    const tx = 270;
    g.fillStyle = '#d7d6e8'; g.fillRect(tx - 2, 62, 4, 50);
    g.fillRect(tx - 4, 104, 8, 10);
    g.fillStyle = '#b8b6d0'; g.beginPath(); g.ellipse(tx, 66, 9, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8e6ff'; g.beginPath(); g.ellipse(tx, 72, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd56b'; g.fillRect(tx - 7, 71, 14, 1);
    g.fillStyle = '#c9c8dc'; g.fillRect(tx - 0.5, 30, 1, 32);
    // 먼 도시
    for (let x = 0; x < W_FAR; x += 10 + R() * 12) {
      const h = 15 + R() * 45, w = 10 + R() * 14;
      g.fillStyle = '#191c40'; g.fillRect(x, FT - 30 - h, w, h + 30);
      windows(g, x, FT - 30 - h, w, h, R, ['#ffcf6b', '#9fd0ff'], '#191c40', 4);
    }
  },
  mid(g) {
    const R = mulberry32(12);
    for (let x = -5; x < W_MID; x += 22 + R() * 18) {
      const h = 30 + R() * 55, w = 20 + R() * 20;
      g.fillStyle = R() < 0.5 ? '#26234d' : '#2e2a5c'; g.fillRect(x, 175 - h, w, h);
      windows(g, x, 175 - h, w, h, R, ['#ffd36b', '#cfe3ff', '#ff9ecf'], '#1c1a3a', 4);
      if (R() < 0.5) { const nc = ['#ff3d9a', '#3df0ff', '#ffe53d'][Math.floor(R() * 3)]; g.fillStyle = nc; g.fillRect(x + 3, 175 - h + 6, 4, 14); g.fillStyle = '#fff'; g.fillRect(x + 4, 175 - h + 8, 2, 10); }
    }
    // 롯데타워 느낌의 초고층
    g.fillStyle = '#3c4f8a'; g.beginPath(); g.moveTo(560, 175); g.lineTo(568, 22); g.lineTo(572, 22); g.lineTo(582, 175); g.fill();
    g.fillStyle = '#8fb0ff'; for (let y = 30; y < 175; y += 6) g.fillRect(568 - (y - 22) * 0.02, y, 6 + (y - 22) * 0.07, 1);
    // 한강
    vgrad(g, 0, 175, W_MID, 40, [[0, '#121436'], [1, '#2a2350']]);
    for (let i = 0; i < 70; i++) { g.fillStyle = ['#ffd36b', '#ff9ecf', '#9fd0ff'][i % 3]; g.globalAlpha = 0.5; g.fillRect(R() * W_MID, 178 + R() * 30, 4 + R() * 6, 1); }
    g.globalAlpha = 1;
    // 다리
    g.fillStyle = '#4b4670'; g.fillRect(0, 186, W_MID, 4);
    for (let x = 10; x < W_MID; x += 40) g.fillRect(x, 190, 4, 22);
    for (let x = 0; x < W_MID; x += 8) { g.fillStyle = x % 16 ? '#ffe9a8' : '#a8e6ff'; g.fillRect(x, 185, 2, 1); }
  },
  floor(g) {
    floorBase(g, '#3a3d5e', '#22243c');
    perspLines(g, 'rgba(160,170,230,0.25)', 16, [220, 232, 248]);
    g.fillStyle = '#5c5f86'; g.fillRect(0, FT, ARENA_W, 2);
    for (let x = 0; x < ARENA_W; x += 14) g.fillRect(x, FT - 8, 2, 8);
    g.fillRect(0, FT - 9, ARENA_W, 2);
    const R = mulberry32(13);
    for (let i = 0; i < 40; i++) { g.fillStyle = ['rgba(255,61,154,0.25)', 'rgba(61,240,255,0.2)'][i % 2]; g.fillRect(R() * ARENA_W, 222 + R() * 40, 1, 6 + R() * 10); }
  },
  crowd: { seed: 5, n: 34, pal: ['#3a2f6b', '#5b3a7a', '#2e4a7a', '#7a3a5b'], y: 210 },
  anim(ctx, t, cx) {
    const fx = 270 - cx * PAR_FAR;
    if ((t >> 5) % 2) { ctx.fillStyle = '#ff3355'; ctx.fillRect(fx - 1, 29, 2, 2); }
    // 무지개 분수
    const bx = -cx * PAR_MID;
    const cols = ['#ff5a5a', '#ffb35a', '#fff05a', '#5aff7a', '#5ac8ff', '#a05aff'];
    for (let k = 0; k < 6; k++) {
      const x0 = bx + 40 + k * 100, ph = (t * 0.05 + k) % 1;
      ctx.strokeStyle = cols[(k + (t >> 4)) % 6]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, 190); ctx.quadraticCurveTo(x0 + 14, 186 + 10, x0 + 24 + ph * 2, 210); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

STAGE_DEF.palace = {
  name: '서울 · 경복궁', country: 'KR', bgm: 'palace',
  far(g) {
    const R = mulberry32(21);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#3f8fd8'], [1, '#c4e6f8']]);
    cloud(g, 80, 40, 1.2, '#fff'); cloud(g, 330, 28, 1.6, '#f2f8ff'); cloud(g, 480, 55, 1, '#fff');
    ridge(g, W_FAR, 120, 40, '#7d9c8a', R, 0.012, 0.031);
    g.fillStyle = '#5d7d68'; g.beginPath(); g.moveTo(170, FT); g.quadraticCurveTo(275, 40, 380, FT); g.fill();
  },
  mid(g) {
    const R = mulberry32(22);
    const roof = (cx, y, w, h, col) => {
      g.fillStyle = col; g.beginPath();
      g.moveTo(cx - w / 2 - 10, y + h - 4);
      g.quadraticCurveTo(cx - w / 2, y + h, cx - w / 2 + 14, y + h - 2);
      g.lineTo(cx + w / 2 - 14, y + h - 2);
      g.quadraticCurveTo(cx + w / 2, y + h, cx + w / 2 + 10, y + h - 4);
      g.lineTo(cx + w / 2 - 22, y); g.lineTo(cx - w / 2 + 22, y); g.closePath(); g.fill();
      g.fillStyle = '#2a2a30'; g.fillRect(cx - w / 2 + 22, y - 2, w - 44, 3);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let x = cx - w / 2 + 6; x < cx + w / 2 - 4; x += 3) { g.beginPath(); g.moveTo(x, y + h - 3); g.lineTo(cx + (x - cx) * 0.75, y + 1); g.stroke(); }
    };
    // 행각
    g.fillStyle = '#dcd6c6'; g.fillRect(0, 178, W_MID, 30);
    for (let x = 0; x < W_MID; x += 16) { g.fillStyle = '#9b2c2c'; g.fillRect(x + 6, 180, 3, 26); g.fillStyle = '#3f8f6a'; g.fillRect(x, 176, 16, 3); }
    roof(W_MID / 2 - 230, 160, 200, 18, '#4a4a52'); roof(W_MID / 2 + 230, 160, 200, 18, '#4a4a52');
    // 월대
    const cx = W_MID / 2;
    g.fillStyle = '#e9e4d6'; g.fillRect(cx - 130, 182, 260, 30); g.fillStyle = '#c9c2b0'; g.fillRect(cx - 130, 182, 260, 3); g.fillRect(cx - 110, 194, 220, 2);
    // 근정전 본체
    g.fillStyle = '#a52a2a'; for (let x = cx - 76; x <= cx + 72; x += 18) g.fillRect(x, 118, 5, 64);
    g.fillStyle = '#2e1e1e'; g.fillRect(cx - 72, 128, 146, 54);
    g.fillStyle = '#a52a2a'; for (let x = cx - 76; x <= cx + 72; x += 18) g.fillRect(x, 118, 5, 64);
    g.fillStyle = '#c69a5a'; for (let x = cx - 66; x < cx + 66; x += 18) for (let y = 130; y < 178; y += 6) g.fillRect(x, y, 10, 1);
    // 단청
    for (let i = 0; i < 46; i++) { g.fillStyle = ['#2e8b57', '#1e5fa8', '#d94a3a', '#f2d16b'][i % 4]; g.fillRect(cx - 92 + i * 4, 112, 4, 6); }
    roof(cx, 92, 230, 24, '#3d3d46');
    g.fillStyle = '#a52a2a'; g.fillRect(cx - 60, 76, 120, 16);
    for (let i = 0; i < 30; i++) { g.fillStyle = ['#2e8b57', '#1e5fa8', '#d94a3a'][i % 3]; g.fillRect(cx - 60 + i * 4, 72, 4, 4); }
    roof(cx, 52, 170, 24, '#3d3d46');
    g.fillStyle = '#1e3a6e'; g.fillRect(cx - 9, 98, 18, 8); g.fillStyle = '#f2d16b'; g.fillRect(cx - 7, 100, 14, 1); g.fillRect(cx - 7, 103, 14, 1);
  },
  floor(g) {
    floorBase(g, '#cfc8b6', '#a99f88');
    const R = mulberry32(23);
    g.strokeStyle = 'rgba(90,80,60,0.45)'; g.lineWidth = 1;
    for (let y = FT; y < VH; y += 7 + Math.floor((y - FT) / 14)) {
      let x = -R() * 20;
      while (x < ARENA_W) { const w = 14 + R() * 18 + (y - FT) * 0.3; g.strokeRect(x, y, w, 7 + (y - FT) * 0.15); x += w; }
    }
    g.fillStyle = '#e8e1cf';
    for (let x = 30; x < ARENA_W; x += 70) { g.fillRect(x, FT - 1, 5, 6); g.fillStyle = '#8a8270'; g.fillRect(x, FT + 5, 5, 1); g.fillStyle = '#e8e1cf'; }
  },
  crowd: { seed: 6, n: 20, pal: ['#c0392b', '#1e5fa8', '#e0b33b', '#2e8b57'], y: 210 },
  anim(ctx, t, cx) {
    // 수문장 깃발
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 130 - cx * PAR_CROWD;
      if (x < -20 || x > VW + 20) continue;
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, 150, 1.5, 60);
      const col = ['#d94a3a', '#1e5fa8', '#f2d16b', '#2e8b57', '#fff', '#111'][i];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x + 1.5, 152);
      for (let k = 0; k <= 14; k += 2) ctx.lineTo(x + 1.5 + k, 152 + Math.sin(t * 0.15 + k * 0.4 + i) * 1.5);
      for (let k = 14; k >= 0; k -= 2) ctx.lineTo(x + 1.5 + k, 166 + Math.sin(t * 0.15 + k * 0.4 + i) * 1.5);
      ctx.fill();
    }
  },
};

STAGE_DEF.paris = {
  name: '파리 · 에펠탑', country: 'FR', bgm: 'paris',
  far(g) {
    const R = mulberry32(31);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#2b1d4f'], [0.45, '#b8466e'], [0.8, '#f59e52'], [1, '#ffd27a']]);
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(380, 170, 26, 0, Math.PI * 2); g.fill();
    cloud(g, 60, 60, 1.3, 'rgba(255,170,150,0.6)'); cloud(g, 420, 90, 1.1, 'rgba(255,190,140,0.6)');
    // 에펠탑
    const ex = 170, col = '#3a2433';
    g.fillStyle = col;
    g.beginPath(); g.moveTo(ex - 40, FT); g.quadraticCurveTo(ex - 14, 150, ex - 3, 50); g.lineTo(ex + 3, 50); g.quadraticCurveTo(ex + 14, 150, ex + 40, FT);
    g.lineTo(ex + 26, FT); g.quadraticCurveTo(ex, 170, ex - 26, FT); g.closePath(); g.fill();
    g.fillRect(ex - 22, 168, 44, 4); g.fillRect(ex - 12, 128, 24, 3); g.fillRect(ex - 6, 84, 12, 3);
    g.fillRect(ex - 1, 18, 2, 34);
    g.strokeStyle = 'rgba(255,200,120,0.35)'; g.lineWidth = 0.6;
    for (let y = 60; y < FT; y += 6) { const w = (y - 50) * 0.23; g.beginPath(); g.moveTo(ex - w, y); g.lineTo(ex + w, y + 6); g.moveTo(ex + w, y); g.lineTo(ex - w, y + 6); g.stroke(); }
    for (let x = 0; x < W_FAR; x += 14) { const h = 10 + R() * 18; g.fillStyle = '#5a3550'; g.fillRect(x, FT - 18 - h, 14, h + 18); }
  },
  mid(g) {
    const R = mulberry32(32);
    for (let x = -10; x < W_MID; x += 64) {
      const h = 48 + R() * 16;
      g.fillStyle = '#e8d8b8'; g.fillRect(x, 200 - h, 62, h);
      g.fillStyle = '#5b6a80'; g.beginPath(); g.moveTo(x - 2, 200 - h); g.lineTo(x + 6, 200 - h - 16); g.lineTo(x + 56, 200 - h - 16); g.lineTo(x + 64, 200 - h); g.fill();
      for (let k = 0; k < 4; k++) { g.fillStyle = '#3d4658'; g.fillRect(x + 8 + k * 14, 200 - h - 12, 6, 7); }
      for (let yy = 200 - h + 8; yy < 185; yy += 16) for (let k = 0; k < 4; k++) {
        g.fillStyle = R() < 0.5 ? '#ffb85a' : '#4a3a3a'; g.fillRect(x + 6 + k * 14, yy, 7, 10);
        g.fillStyle = '#222'; g.fillRect(x + 4 + k * 14, yy + 10, 11, 1);
      }
      g.fillStyle = '#c9b48f'; g.fillRect(x, 186, 62, 14);
    }
    // 카페 차양
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#fff' : '#c0392b'; g.fillRect(250 + i * 6, 180, 6, 9); }
    g.fillStyle = '#7a1f1f'; g.fillRect(250, 189, 96, 2);
    g.fillStyle = '#2b2b2b'; for (const x of [80, 300, 520]) { g.fillRect(x, 150, 2, 60); g.fillStyle = '#ffe08a'; g.fillRect(x - 3, 146, 8, 5); g.fillStyle = '#2b2b2b'; }
  },
  floor(g) {
    floorBase(g, '#7a6a60', '#4f433d');
    const R = mulberry32(33);
    for (let y = FT; y < VH; y += 5 + Math.floor((y - FT) / 10)) {
      const off = (y % 2) * 4;
      for (let x = -off; x < ARENA_W; x += 8 + (y - FT) * 0.1) {
        g.fillStyle = R() < 0.5 ? '#8b7a6e' : '#6e5f56'; g.fillRect(x + 1, y + 1, 6 + (y - FT) * 0.08, 3 + (y - FT) * 0.06);
      }
    }
  },
  crowd: { seed: 7, n: 26, pal: ['#2c3e50', '#8e44ad', '#c0392b', '#f1c40f', '#16a085'], y: 210 },
  anim(ctx, t, cx) {
    const ex = 170 - cx * PAR_FAR;
    if ((t >> 3) % 3 === 0) { ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 12; i++) ctx.fillRect(ex - 30 + ((i * 37 + t) % 60), 60 + ((i * 53) % 150), 1, 1); }
    // 비둘기
    const px = ((t * 0.6) % (VW + 80)) - 40;
    ctx.fillStyle = '#ddd'; ctx.fillRect(px, 60 + Math.sin(t * 0.1) * 4, 3, 1); ctx.fillRect(px + 1, 59 + Math.sin(t * 0.1) * 4 + ((t >> 2) % 2), 1, 1);
  },
};

STAGE_DEF.halong = {
  name: '하롱베이 · 대나무 부두', country: 'VN', bgm: 'halong',
  far(g) {
    const R = mulberry32(41);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#9fd2cc'], [0.7, '#e2f0e0'], [1, '#f2f6e6']]);
    const karst = (x, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2, 172); g.quadraticCurveTo(x - w / 2 - 4, 172 - h, x, 172 - h - 6); g.quadraticCurveTo(x + w / 2 + 4, 172 - h, x + w / 2, 172); g.fill(); };
    for (let i = 0; i < 9; i++) karst(R() * W_FAR, 30 + R() * 40, 50 + R() * 50, '#a9c9bd');
    for (let i = 0; i < 7; i++) karst(R() * W_FAR, 30 + R() * 40, 70 + R() * 70, '#7fa898');
    vgrad(g, 0, 170, W_FAR, 50, [[0, '#7fb8ae'], [1, '#5f9c94']]);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(R() * W_FAR, 172 + R() * 40, 6 + R() * 10, 1); }
  },
  mid(g) {
    const R = mulberry32(42);
    const karst = (x, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2, 180); g.quadraticCurveTo(x - w / 2 - 6, 180 - h, x, 180 - h - 8); g.quadraticCurveTo(x + w / 2 + 6, 180 - h, x + w / 2, 180); g.fill(); g.fillStyle = 'rgba(40,90,60,0.5)'; for (let i = 0; i < 20; i++) g.fillRect(x - w / 2 + R() * w, 180 - h + R() * h, 3, 2); };
    karst(90, 70, 120, '#4e7d68'); karst(560, 90, 140, '#4a7563');
    // 대나무
    for (const x of [8, 22, 34, W_MID - 30, W_MID - 18]) {
      g.fillStyle = '#5aa04a'; g.fillRect(x, 0, 5, 212);
      g.fillStyle = '#2f6b2a'; for (let y = 10; y < 212; y += 22) g.fillRect(x - 1, y, 7, 2);
      g.fillStyle = '#6fbf55'; for (let y = 20; y < 160; y += 34) { g.beginPath(); g.ellipse(x + 10, y, 9, 2.5, 0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x - 6, y + 12, 9, 2.5, -0.4, 0, Math.PI * 2); g.fill(); }
    }
  },
  floor(g) {
    floorBase(g, '#9a6a42', '#6b4426');
    g.strokeStyle = 'rgba(60,30,10,0.6)'; g.lineWidth = 1;
    for (let y = FT; y < VH; y += 6 + Math.floor((y - FT) / 12)) { g.beginPath(); g.moveTo(0, y); g.lineTo(ARENA_W, y); g.stroke(); }
    const R = mulberry32(43);
    for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(60,30,10,0.4)'; g.fillRect(R() * ARENA_W, FT + R() * 58, 1, 3); }
    g.fillStyle = '#5a3a20'; for (let x = 0; x < ARENA_W; x += 60) g.fillRect(x, FT - 12, 4, 14);
    g.fillRect(0, FT - 12, ARENA_W, 2);
  },
  crowd: { seed: 8, n: 16, pal: ['#e8c86b', '#c0392b', '#2e86c1', '#f5f5dc'], y: 211 },
  anim(ctx, t, cx) {
    for (let k = 0; k < 2; k++) {
      const x = (k ? 360 : 120) - cx * PAR_MID + Math.sin(t * 0.005 + k) * 20;
      const y = 186 + Math.sin(t * 0.06 + k * 2) * 1.5;
      ctx.fillStyle = '#5a3218'; ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x + 22, y); ctx.lineTo(x + 16, y + 6); ctx.lineTo(x - 15, y + 6); ctx.fill();
      ctx.fillStyle = '#c94a28';
      for (let s = 0; s < 3; s++) { const sx = x - 10 + s * 11; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y - 26 + s * 3); ctx.lineTo(sx + 9, y - 22 + s * 3); ctx.lineTo(sx + 8, y - 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(90,40,20,0.6)'; for (let s = 0; s < 3; s++) for (let r = 0; r < 4; r++) ctx.fillRect(x - 10 + s * 11, y - 22 + r * 5 + s * 3, 9, 0.6);
    }
  },
};

STAGE_DEF.greatwall = {
  name: '만리장성', country: 'CN', bgm: 'greatwall',
  far(g) {
    const R = mulberry32(51);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#4f9fe0'], [1, '#dcefff']]);
    cloud(g, 120, 50, 1.4, '#fff'); cloud(g, 400, 35, 1.1, '#fff');
    ridge(g, W_FAR, 130, 40, '#8fb5c9', R, 0.015, 0.04);
    ridge(g, W_FAR, 160, 45, '#6c9c7a', R, 0.012, 0.03);
    // 장성
    const R2 = mulberry32(52); const pts = [];
    for (let x = 0; x <= W_FAR; x += 4) pts.push([x, 140 - 30 * Math.sin(x * 0.012 + 1) - 12 * Math.sin(x * 0.03)]);
    g.strokeStyle = '#b9a98a'; g.lineWidth = 5; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.fillStyle = '#9c8f74'; for (let i = 0; i < pts.length; i += 2) g.fillRect(pts[i][0], pts[i][1] - 4, 2, 2);
    for (let i = 10; i < pts.length; i += 28) { const p = pts[i]; g.fillStyle = '#a89878'; g.fillRect(p[0] - 5, p[1] - 12, 10, 12); g.fillStyle = '#5a4e3a'; g.fillRect(p[0] - 2, p[1] - 9, 4, 4); }
  },
  mid(g) {
    const R = mulberry32(53);
    ridge(g, W_MID, 190, 30, '#4f8a55', R, 0.01, 0.025);
    // 망루
    const tx = 470;
    g.fillStyle = '#a08f70'; g.fillRect(tx, 120, 70, 72);
    g.fillStyle = '#7d6e53'; for (let y = 124; y < 190; y += 5) g.fillRect(tx, y, 70, 1);
    g.fillStyle = '#3e3424'; g.fillRect(tx + 12, 140, 10, 14); g.fillRect(tx + 48, 140, 10, 14); g.fillRect(tx + 28, 165, 14, 27);
    g.fillStyle = '#a08f70'; for (let x = tx; x < tx + 70; x += 10) g.fillRect(x, 112, 6, 8);
    // 깃발
    for (const x of [tx + 10, tx + 60]) { g.fillStyle = '#4a3a2a'; g.fillRect(x, 84, 1.5, 30); g.fillStyle = '#d42a1d'; g.beginPath(); g.moveTo(x + 1.5, 86); g.lineTo(x + 16, 92); g.lineTo(x + 1.5, 98); g.fill(); }
  },
  floor(g) {
    floorBase(g, '#a7997f', '#7d705a');
    g.strokeStyle = 'rgba(70,60,45,0.55)'; g.lineWidth = 1;
    for (let y = FT, r = 0; y < VH; y += 5 + Math.floor((y - FT) / 9), r++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(ARENA_W, y); g.stroke();
      for (let x = (r % 2) * 9; x < ARENA_W; x += 18 + (y - FT) * 0.2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 5 + (y - FT) / 9); g.stroke(); }
    }
    g.fillStyle = '#958668'; g.fillRect(0, FT - 14, ARENA_W, 14);
    g.fillStyle = '#b3a383'; for (let x = 0; x < ARENA_W; x += 16) g.fillRect(x, FT - 22, 10, 9);
  },
  crowd: { seed: 9, n: 12, pal: ['#c0392b', '#f1c40f', '#2c3e50'], y: 196 },
  anim(ctx, t, cx) {
    // 홍등
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 100 - cx * 0.9, sw = Math.sin(t * 0.05 + i) * 3;
      if (x < -20 || x > VW + 20) continue;
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, 18); ctx.stroke();
      ctx.fillStyle = '#d42a1d'; ctx.beginPath(); ctx.ellipse(x + sw, 26, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7c948'; ctx.fillRect(x + sw - 4, 17, 8, 2); ctx.fillRect(x + sw - 4, 33, 8, 2); ctx.fillRect(x + sw - 0.5, 35, 1, 5);
      ctx.fillStyle = 'rgba(255,200,80,0.35)'; ctx.fillRect(x + sw - 1, 20, 2, 12);
    }
  },
};

STAGE_DEF.rio_dojo = {
  name: '리우데자네이루 · 주짓수 도장', country: 'BR', bgm: 'rio_dojo',
  far(g) {
    const R = mulberry32(61);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#1e7fd8'], [1, '#a6dcff']]);
    cloud(g, 70, 40, 1.2, '#fff'); cloud(g, 460, 60, 1.0, '#fff');
    vgrad(g, 0, 165, W_FAR, 50, [[0, '#2f8fc0'], [1, '#1f6f9a']]);
    // 빵산
    g.fillStyle = '#3d6b45'; g.beginPath(); g.moveTo(20, 172); g.quadraticCurveTo(50, 95, 80, 172); g.fill();
    // 코르코바도 + 예수상
    g.fillStyle = '#2e5d3a'; g.beginPath(); g.moveTo(180, 172); g.lineTo(270, 62); g.quadraticCurveTo(290, 58, 300, 80); g.lineTo(420, 172); g.fill();
    g.fillStyle = '#f2f2f2'; g.fillRect(279, 40, 3, 20); g.fillRect(272, 44, 17, 2); g.fillRect(278, 37, 5, 4);
    g.fillStyle = '#d9d9d9'; g.fillRect(278, 60, 5, 4);
  },
  mid(g) {
    const R = mulberry32(62);
    // 파벨라
    for (let i = 0; i < 70; i++) {
      const x = R() * 220, y = 120 + (x / 220) * 60 + R() * 30;
      g.fillStyle = ['#f6c85f', '#ef6f6c', '#6fb7e8', '#9be09b', '#f2a7d0', '#fff'][Math.floor(R() * 6)];
      g.fillRect(x, y, 8 + R() * 6, 7); g.fillStyle = '#333'; g.fillRect(x + 2, y + 2, 2, 2);
    }
    // 도장 벽
    g.fillStyle = '#e8e2d0'; g.fillRect(0, 186, W_MID, 26);
    g.fillStyle = '#c9c1a8'; g.fillRect(0, 186, W_MID, 2);
    for (let x = 20; x < W_MID; x += 110) drawFlag(g, 'BR', x, 190, 24, 16);
    g.fillStyle = '#2a2a2a'; g.font = 'bold 9px sans-serif'; g.fillText('JIU-JITSU', W_MID / 2 - 26, 202);
    palm(g, 250, 190, 60, '#7a5a3a', '#2f8a3a'); palm(g, 600, 190, 70, '#7a5a3a', '#2f8a3a');
  },
  floor(g) {
    floorBase(g, '#2e9e4f', '#1f7a3a');
    for (let x = 0, k = 0; x < ARENA_W; x += 38, k++) {
      g.fillStyle = k % 2 ? '#f2c230' : '#2e9e4f';
      g.beginPath(); g.moveTo(x * 0.55 + ARENA_W * 0.225, FT); g.lineTo((x + 38) * 0.55 + ARENA_W * 0.225, FT); g.lineTo(x + 38, VH); g.lineTo(x, VH); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 238, ARENA_W, 1); g.fillRect(0, 254, ARENA_W, 1);
    perspLines(g, 'rgba(0,40,0,0.35)', 20);
  },
  crowd: { seed: 10, n: 22, pal: ['#f2f2f2', '#16a085', '#f2c230', '#2e5d9a'], y: 209 },
  anim(ctx, t, cx) {
    const x = ((t * 0.3) % (VW + 60)) - 30;
    ctx.fillStyle = '#fff'; ctx.fillRect(x, 30 + Math.sin(t * 0.08) * 3, 4, 1); ctx.fillRect(x + 1, 29 + Math.sin(t * 0.08) * 3 - ((t >> 3) % 2), 2, 1);
  },
};

STAGE_DEF.pisa = {
  name: '피사 · 피자 광장', country: 'IT', bgm: 'pisa',
  far(g) {
    const R = mulberry32(71);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#76bdf0'], [1, '#fff0d4']]);
    cloud(g, 90, 45, 1.2, '#fff'); cloud(g, 380, 30, 1.5, '#fff');
    ridge(g, W_FAR, 175, 25, '#a7c46b', R, 0.01, 0.03);
    ridge(g, W_FAR, 190, 20, '#8bb35a', R, 0.013, 0.02);
    for (let i = 0; i < 14; i++) cypress(g, R() * W_FAR, 190, 20 + R() * 16, '#3e5e2a');
  },
  mid(g) {
    // 피사의 사탑
    g.save(); g.translate(200, 200); g.rotate(0.07);
    for (let i = 0; i < 8; i++) {
      const y = -i * 16 - 16, w = i === 7 ? 22 : 30;
      g.fillStyle = '#f2ecdc'; g.fillRect(-w / 2, y, w, 16);
      g.fillStyle = '#d6cdb6'; g.fillRect(-w / 2, y, w, 2);
      g.fillStyle = '#9d927a'; for (let k = 0; k < 5; k++) g.fillRect(-w / 2 + 3 + k * (w - 6) / 5, y + 5, 3, 8);
    }
    g.fillStyle = '#c9bfa6'; g.fillRect(-15, 0, 30, 6);
    g.restore();
    // 두오모
    const dx = 300;
    g.fillStyle = '#f2ecdc'; g.fillRect(dx, 140, 110, 60);
    g.fillStyle = '#c9bfa6'; for (let y = 146; y < 200; y += 6) g.fillRect(dx, y, 110, 1);
    g.fillStyle = '#e6dcc4'; g.beginPath(); g.arc(dx + 55, 140, 22, Math.PI, 0); g.fill();
    g.fillStyle = '#9d927a'; for (let k = 0; k < 7; k++) g.fillRect(dx + 10 + k * 14, 160, 6, 14);
    // 피자집
    const px = 470;
    g.fillStyle = '#f0d9b5'; g.fillRect(px, 150, 140, 60);
    for (let i = 0; i < 24; i++) { g.fillStyle = ['#009246', '#fff', '#ce2b37'][i % 3]; g.fillRect(px + i * 6, 160, 6, 10); }
    g.fillStyle = '#7a3b1e'; g.fillRect(px + 30, 140, 80, 14);
    g.fillStyle = '#ffe08a'; g.font = 'bold 11px sans-serif'; g.fillText('PIZZA', px + 52, 151);
    g.fillStyle = '#5a3a2a'; g.fillRect(px + 10, 178, 20, 32); g.fillRect(px + 110, 178, 20, 32);
    g.fillStyle = '#ffb04a'; g.fillRect(px + 50, 180, 40, 18);
  },
  floor(g) {
    floorBase(g, '#c97445', '#9c5530');
    perspLines(g, 'rgba(255,220,180,0.45)', 24, [220, 230, 243, 260]);
  },
  crowd: { seed: 11, n: 24, pal: ['#2e86c1', '#e74c3c', '#f5f5f5', '#27ae60', '#f39c12'], y: 210 },
  anim(ctx, t, cx) {
    // 피자 도우 던지기
    const x = 540 - cx * PAR_MID, y = 175 - Math.abs(Math.sin(t * 0.05)) * 25;
    ctx.fillStyle = '#f7e1a8'; ctx.beginPath(); ctx.ellipse(x, y, 8, 2 + Math.abs(Math.sin(t * 0.2)) * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, 182, 8, 10); ctx.fillStyle = '#f2d2b0'; ctx.fillRect(x - 3, 177, 6, 5); ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, 172, 8, 5);
  },
};

STAGE_DEF.pyramid = {
  name: '기자 · 피라미드', country: 'EG', bgm: 'pyramid',
  far(g) {
    const R = mulberry32(81);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#4aa0d8'], [0.55, '#f7d9a0'], [1, '#ffcf7d']]);
    g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(430, 60, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,240,180,0.3)'; g.beginPath(); g.arc(430, 60, 30, 0, Math.PI * 2); g.fill();
    const pyr = (x, w, h) => {
      g.fillStyle = '#e0b26b'; g.beginPath(); g.moveTo(x - w / 2, 186); g.lineTo(x, 186 - h); g.lineTo(x + w * 0.12, 186); g.fill();
      g.fillStyle = '#b98544'; g.beginPath(); g.moveTo(x + w * 0.12, 186); g.lineTo(x, 186 - h); g.lineTo(x + w / 2, 186); g.fill();
      g.strokeStyle = 'rgba(120,80,30,0.3)'; g.lineWidth = 1; for (let y = 186 - h + 6; y < 186; y += 5) { const k = (y - (186 - h)) / h; g.beginPath(); g.moveTo(x - (w / 2) * k, y); g.lineTo(x + (w / 2) * k, y); g.stroke(); }
    };
    pyr(150, 170, 110); pyr(330, 140, 92); pyr(450, 90, 58);
    vgrad(g, 0, 182, W_FAR, 40, [[0, '#f0c88a'], [1, '#e2b06a']]);
  },
  mid(g) {
    // 스핑크스
    const sx = 60;
    g.fillStyle = '#c99a5b'; g.fillRect(sx, 170, 90, 22); g.fillRect(sx + 70, 162, 40, 30);
    g.fillStyle = '#b5874d'; g.fillRect(sx + 100, 184, 30, 8);
    g.fillStyle = '#d4a868'; g.fillRect(sx + 78, 132, 26, 34);
    g.fillStyle = '#2f5d9a'; for (let y = 134; y < 160; y += 4) g.fillRect(sx + 74, y, 6, 2);
    g.fillStyle = '#8a6236'; g.fillRect(sx + 96, 144, 3, 2); g.fillRect(sx + 98, 154, 4, 1);
    palm(g, 260, 196, 50, '#7a5a3a', '#3f8a3a'); palm(g, 300, 196, 40, '#7a5a3a', '#3f8a3a'); palm(g, 580, 196, 55, '#7a5a3a', '#3f8a3a');
    // 오벨리스크
    for (const x of [420, 520]) { g.fillStyle = '#d9b77a'; g.beginPath(); g.moveTo(x, 200); g.lineTo(x + 3, 120); g.lineTo(x + 7, 112); g.lineTo(x + 11, 120); g.lineTo(x + 14, 200); g.fill(); g.fillStyle = '#8a6236'; for (let y = 130; y < 195; y += 7) g.fillRect(x + 5, y, 4, 3); }
  },
  floor(g) {
    floorBase(g, '#e9c584', '#cfa25c');
    const R = mulberry32(83);
    g.strokeStyle = 'rgba(160,110,50,0.4)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const y = FT + 3 + R() * 55, x = R() * ARENA_W; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 15, y - 2, x + 30, y); g.stroke(); }
    g.fillStyle = '#c99a5b'; for (let x = 0; x < ARENA_W; x += 120) { g.fillRect(x + 10, FT - 30, 12, 32); g.fillStyle = '#8a6236'; for (let y = FT - 26; y < FT; y += 6) g.fillRect(x + 13, y, 6, 2); g.fillStyle = '#c99a5b'; }
  },
  crowd: { seed: 12, n: 18, pal: ['#f5f5f5', '#2f5d9a', '#c0392b', '#d4a017'], y: 210 },
  anim(ctx, t, cx) {
    // 낙타 행렬
    for (let k = 0; k < 3; k++) {
      const x = ((t * 0.15 + k * 26) % (W_MID + 60)) - 30 - cx * PAR_MID;
      const y = 186, b = (t >> 4) % 2;
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(x, y - 8, 12, 5); ctx.fillRect(x + 3, y - 11, 5, 3); ctx.fillRect(x + 11, y - 13, 2, 7); ctx.fillRect(x + 12, y - 14, 4, 3);
      ctx.fillRect(x + 1, y - 3, 1.5, 4 + b); ctx.fillRect(x + 9, y - 3, 1.5, 5 - b);
    }
  },
};

STAGE_DEF.copacabana = {
  name: '코파카바나 해변', country: 'BR', bgm: 'copacabana',
  far(g) {
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#5b3c88'], [0.4, '#ff7e5f'], [0.8, '#feb47b'], [1, '#ffe0a8']]);
    g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(150, 150, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3d2f3a'; g.beginPath(); g.moveTo(360, 172); g.quadraticCurveTo(372, 92, 400, 96); g.quadraticCurveTo(420, 120, 430, 172); g.fill();
    g.beginPath(); g.moveTo(420, 172); g.quadraticCurveTo(440, 130, 470, 132); g.quadraticCurveTo(490, 150, 500, 172); g.fill();
    g.strokeStyle = '#2a2028'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(400, 96); g.lineTo(468, 132); g.stroke();
    vgrad(g, 0, 170, W_FAR, 50, [[0, '#f08a6a'], [1, '#2f6d9a']]);
  },
  mid(g) {
    const R = mulberry32(92);
    vgrad(g, 0, 176, W_MID, 20, [[0, '#2a7fb0'], [1, '#56b4d3']]);
    g.fillStyle = '#f3d9a4'; g.fillRect(0, 196, W_MID, 16);
    palm(g, 40, 200, 70, '#6a4a2a', '#2a6a35'); palm(g, 300, 200, 60, '#6a4a2a', '#2a6a35'); palm(g, 610, 200, 75, '#6a4a2a', '#2a6a35');
    // DJ 스피커
    const sx = 470;
    g.fillStyle = '#1b1b1b'; g.fillRect(sx, 150, 26, 50); g.fillRect(sx + 80, 150, 26, 50);
    for (const x of [sx, sx + 80]) { g.fillStyle = '#444'; g.beginPath(); g.arc(x + 13, 165, 8, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + 13, 187, 10, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff007f'; g.fillRect(sx + 30, 176, 46, 24); g.fillStyle = '#222'; g.fillRect(sx + 34, 179, 38, 8);
    g.fillStyle = '#fff'; g.font = 'bold 7px sans-serif'; g.fillText('HIPJJIL', sx + 37, 196);
  },
  floor(g) {
    floorBase(g, '#eeeeee', '#dddddd');
    g.fillStyle = '#1e1e1e';
    for (let y = FT; y < VH; y += 1) {
      const k = (y - FT) / (VH - FT), amp = 4 + k * 6, per = 30 + k * 30;
      for (let x = 0; x < ARENA_W; x += 1) {
        const v = Math.sin((x / per) * Math.PI * 2 + y * 0.05) * amp;
        if (((y + v) / (6 + k * 6)) % 2 < 1) g.fillRect(x, y, 1, 1);
      }
    }
  },
  crowd: { seed: 13, n: 30, pal: ['#ff007f', '#ffd700', '#00c853', '#2979ff', '#ff6d00'], y: 211 },
  anim(ctx, t, cx) {
    const ox = -cx * PAR_MID;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 12; i++) { const x = ox + ((i * 61 + t * 0.4) % W_MID); ctx.fillRect(x, 194 - (Math.sin(t * 0.05 + i) + 1) * 1.5, 14, 1); }
    // 케이블카
    const k = (Math.sin(t * 0.01) + 1) / 2, x = 400 + 68 * k - cx * PAR_FAR, y = 96 + 36 * k;
    ctx.fillStyle = '#ff4b4b'; ctx.fillRect(x - 2, y + 1, 5, 3);
    // 스피커 쿵쿵
    const pulse = (t >> 3) % 2;
    ctx.strokeStyle = 'rgba(255,0,127,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(483 + ox, 187, 11 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
  },
};

STAGE_DEF.newyork = {
  name: '뉴욕 · 브루클린 부두', country: 'US', bgm: 'newyork',
  far(g) {
    const R = mulberry32(101);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#14213d'], [0.55, '#a8466f'], [0.85, '#f4934f'], [1, '#ffc27a']]);
    starsG(g, W_FAR, 60, 30, R);
    // 자유의 여신상
    const lx = 60;
    g.fillStyle = '#4a6a5a'; g.fillRect(lx - 8, 150, 16, 30); g.fillStyle = '#5f9a84'; g.fillRect(lx - 4, 116, 8, 34); g.fillRect(lx + 2, 98, 2, 20); g.fillRect(lx - 3, 110, 6, 6);
    g.beginPath(); g.moveTo(lx - 5, 110); g.lineTo(lx, 104); g.lineTo(lx + 5, 110); g.fill();
    // 스카이라인
    for (let x = 100; x < W_FAR; x += 8 + R() * 10) {
      const h = 30 + R() * 70, w = 8 + R() * 12;
      g.fillStyle = '#23243f'; g.fillRect(x, 180 - h, w, h);
      windows(g, x, 180 - h, w, h, R, ['#ffd97a', '#ffeebd'], '#23243f', 3);
    }
    // 엠파이어 스테이트
    const ex = 300;
    g.fillStyle = '#2a2b4a'; g.fillRect(ex - 14, 100, 28, 80); g.fillRect(ex - 9, 78, 18, 22); g.fillRect(ex - 5, 60, 10, 18); g.fillRect(ex - 2, 40, 4, 20); g.fillRect(ex - 0.5, 22, 1, 18);
    windows(g, ex - 14, 100, 28, 80, R, ['#ffe9a0'], '#2a2b4a', 3);
    // 크라이슬러 느낌
    const cx2 = 400;
    g.fillStyle = '#2d2e50'; g.fillRect(cx2 - 9, 95, 18, 85);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#c9cde0'; g.beginPath(); g.arc(cx2, 95 - i * 6, 9 - i * 2, Math.PI, 0); g.fill(); g.fillStyle = '#2d2e50'; g.beginPath(); g.arc(cx2, 95 - i * 6, 7 - i * 2, Math.PI, 0); g.fill(); }
    g.fillStyle = '#c9cde0'; g.fillRect(cx2 - 0.5, 60, 1, 14);
  },
  mid(g) {
    const R = mulberry32(102);
    vgrad(g, 0, 176, W_MID, 36, [[0, '#2b3561'], [1, '#1a1f3a']]);
    for (let i = 0; i < 90; i++) { g.fillStyle = ['rgba(255,217,122,0.5)', 'rgba(255,150,120,0.4)'][i % 2]; g.fillRect(R() * W_MID, 178 + R() * 30, 3 + R() * 8, 1); }
    // 브루클린 브리지
    g.fillStyle = '#5a4a4a'; g.fillRect(420, 120, 14, 60); g.fillRect(560, 120, 14, 60);
    g.fillStyle = '#3a2a2a'; g.fillRect(423, 130, 3, 14); g.fillRect(428, 130, 3, 14); g.fillRect(563, 130, 3, 14); g.fillRect(568, 130, 3, 14);
    g.fillStyle = '#4a3a3a'; g.fillRect(380, 168, 260, 4);
    g.strokeStyle = 'rgba(200,200,220,0.5)'; g.lineWidth = 0.6;
    for (const [a, b] of [[380, 427], [427, 567], [567, 640]]) { g.beginPath(); g.moveTo(a, a === 380 ? 168 : 122); g.quadraticCurveTo((a + b) / 2, 162, b, b === 640 ? 168 : 122); g.stroke(); }
  },
  floor(g) {
    floorBase(g, '#6d5845', '#4b3b2d');
    g.strokeStyle = 'rgba(30,20,10,0.6)'; g.lineWidth = 1;
    perspLines(g, 'rgba(30,20,10,0.5)', 30);
    g.fillStyle = '#3a2e24'; for (let x = 0; x < ARENA_W; x += 50) g.fillRect(x, FT - 16, 5, 18);
    g.fillRect(0, FT - 16, ARENA_W, 2); g.fillRect(0, FT - 9, ARENA_W, 2);
  },
  crowd: { seed: 14, n: 26, pal: ['#f1c40f', '#2c3e50', '#e74c3c', '#ecf0f1', '#8e44ad'], y: 211 },
  anim(ctx, t, cx) {
    const lx = 60 - cx * PAR_FAR;
    ctx.fillStyle = (t >> 2) % 2 ? '#ffd23f' : '#ff9f1c'; ctx.fillRect(lx + 2, 95, 2, 3);
    // 노란 택시 (다리 위)
    const x = ((t * 0.8) % 300) + 380 - cx * PAR_MID;
    ctx.fillStyle = '#f7c600'; ctx.fillRect(x, 164, 8, 4); ctx.fillStyle = '#222'; ctx.fillRect(x + 1, 168, 1.5, 1); ctx.fillRect(x + 5.5, 168, 1.5, 1);
  },
};

STAGE_DEF.tajmahal = {
  name: '아그라 · 타지마할', country: 'IN', bgm: 'tajmahal',
  far(g) {
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#c9e4f7'], [0.55, '#f6c0cf'], [1, '#f9d29d']]);
    const cx = 275;
    const dome = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - r, y); g.bezierCurveTo(x - r * 1.25, y - r * 1.2, x - r * 0.2, y - r * 1.5, x, y - r * 2); g.bezierCurveTo(x + r * 0.2, y - r * 1.5, x + r * 1.25, y - r * 1.2, x + r, y); g.fill(); };
    g.fillStyle = '#e9e1d4'; g.fillRect(cx - 120, 160, 240, 12);
    g.fillStyle = '#f6f2ea'; g.fillRect(cx - 60, 104, 120, 58);
    g.fillStyle = '#e1d8c8'; g.fillRect(cx - 18, 108, 36, 54);
    g.fillStyle = '#c6b9a2'; g.beginPath(); g.moveTo(cx - 12, 162); g.lineTo(cx - 12, 124); g.quadraticCurveTo(cx, 112, cx + 12, 124); g.lineTo(cx + 12, 162); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#c6b9a2'; g.fillRect(cx + s * 40 - 6, 120, 12, 18); g.fillRect(cx + s * 40 - 6, 142, 12, 16); }
    g.fillStyle = '#f6f2ea'; g.fillRect(cx - 20, 98, 40, 8);
    dome(cx, 100, 26, '#f8f5ef');
    g.fillStyle = '#d8b25a'; g.fillRect(cx - 0.5, 40, 1.5, 12);
    for (const s of [-1, 1]) { dome(cx + s * 44, 104, 8, '#f3eee5'); }
    for (const s of [-1, 1]) { const mx = cx + s * 105; g.fillStyle = '#f3eee5'; g.fillRect(mx - 3, 96, 6, 66); g.fillStyle = '#d9cfbd'; g.fillRect(mx - 4, 110, 8, 2); g.fillRect(mx - 4, 130, 8, 2); dome(mx, 96, 5, '#f8f5ef'); }
  },
  mid(g) {
    const R = mulberry32(112);
    // 반사 연못
    const cx = W_MID / 2;
    g.fillStyle = '#7fb8d6'; g.beginPath(); g.moveTo(cx - 14, 176); g.lineTo(cx + 14, 176); g.lineTo(cx + 60, 212); g.lineTo(cx - 60, 212); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(cx, 190, 10, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a8c98a'; g.beginPath(); g.moveTo(0, 180); g.lineTo(cx - 14, 176); g.lineTo(cx - 60, 212); g.lineTo(0, 212); g.fill();
    g.beginPath(); g.moveTo(W_MID, 180); g.lineTo(cx + 14, 176); g.lineTo(cx + 60, 212); g.lineTo(W_MID, 212); g.fill();
    for (let i = 0; i < 8; i++) { cypress(g, cx - 30 - i * 30, 190 + i * 3, 22 + i * 2, '#2f5a2a'); cypress(g, cx + 30 + i * 30, 190 + i * 3, 22 + i * 2, '#2f5a2a'); }
    // 붉은 사암 문
    for (const x of [10, W_MID - 90]) {
      g.fillStyle = '#a94a32'; g.fillRect(x, 130, 80, 82);
      g.fillStyle = '#7d3322'; g.beginPath(); g.moveTo(x + 24, 212); g.lineTo(x + 24, 160); g.quadraticCurveTo(x + 40, 140, x + 56, 160); g.lineTo(x + 56, 212); g.fill();
      g.fillStyle = '#f3eee5'; for (let k = 0; k < 5; k++) g.fillRect(x + 6 + k * 16, 126, 8, 6);
    }
  },
  floor(g) {
    floorBase(g, '#efe7da', '#d8ccb6');
    g.fillStyle = 'rgba(169,74,50,0.55)';
    for (let x = 0; x < ARENA_W; x += 30) for (let r = 0; r < 4; r++) {
      const y = FT + 6 + r * 14, s = 3 + r;
      g.beginPath(); g.moveTo(x + (r % 2) * 15, y - s); g.lineTo(x + (r % 2) * 15 + s, y); g.lineTo(x + (r % 2) * 15, y + s); g.lineTo(x + (r % 2) * 15 - s, y); g.fill();
    }
  },
  crowd: { seed: 15, n: 24, pal: ['#ff9933', '#e91e63', '#138808', '#ffd700', '#3f51b5'], y: 211 },
  anim(ctx, t, cx) {
    // 새떼
    for (let i = 0; i < 5; i++) {
      const x = ((t * 0.35 + i * 18) % (VW + 100)) - 50, y = 50 + i * 4 + Math.sin(t * 0.05 + i) * 3, w = (t >> 3) % 2 ? 2 : 1;
      ctx.fillStyle = '#5a4a5a'; ctx.fillRect(x - 3, y - w, 3, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - w, 3, 1);
    }
    // 공작
    const px = 360 - cx * PAR_CROWD;
    ctx.fillStyle = '#1565c0'; ctx.fillRect(px, 196, 3, 7);
    ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.ellipse(px - 6, 196, 8, 5 + Math.sin(t * 0.04), 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffd54f'; for (let i = 0; i < 5; i++) ctx.fillRect(px - 12 + i * 3, 193, 1, 1);
  },
};

STAGE_DEF.sagrada = {
  name: '바르셀로나 · 사그라다 파밀리아', country: 'ES', bgm: 'sagrada',
  far(g) {
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#2d1b4e'], [0.6, '#c74b4b'], [0.82, '#ff8a3c'], [1, '#ffc46b']]);
    const cx = 275;
    const spire = (x, h, w) => {
      g.fillStyle = '#9a7f66'; g.beginPath(); g.moveTo(x - w / 2, 180); g.quadraticCurveTo(x - w * 0.45, 180 - h * 0.6, x, 180 - h); g.quadraticCurveTo(x + w * 0.45, 180 - h * 0.6, x + w / 2, 180); g.fill();
      g.fillStyle = '#6b5442'; for (let y = 180 - h + 14; y < 176; y += 7) g.fillRect(x - 1, y, 2, 3);
      g.fillStyle = ['#e8c547', '#d94a3a', '#f2f2f2'][Math.floor(x) % 3]; g.beginPath(); g.arc(x, 180 - h, 2.5, 0, Math.PI * 2); g.fill();
    };
    for (const [dx, h, w] of [[-60, 90, 16], [-42, 105, 17], [-22, 112, 18], [22, 112, 18], [42, 105, 17], [60, 90, 16], [0, 140, 22]]) spire(cx + dx, h, w);
    g.fillStyle = '#8a705a'; g.fillRect(cx - 75, 150, 150, 30);
    g.fillStyle = '#5a4636'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 50 + i * 25, 180); g.lineTo(cx - 50 + i * 25, 162); g.quadraticCurveTo(cx - 44 + i * 25, 154, cx - 38 + i * 25, 162); g.lineTo(cx - 38 + i * 25, 180); g.fill(); }
    // 크레인
    g.strokeStyle = '#e0b030'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 95, 180); g.lineTo(cx + 95, 50); g.lineTo(cx + 40, 50); g.moveTo(cx + 95, 50); g.lineTo(cx + 120, 50); g.stroke();
  },
  mid(g) {
    for (let x = 0; x < W_MID; x += 70) {
      g.fillStyle = ['#e7c9a0', '#d9a77a', '#f0dcc0'][(x / 70) % 3]; g.fillRect(x, 130, 66, 82);
      for (let y = 140; y < 200; y += 18) for (let k = 0; k < 3; k++) {
        g.fillStyle = '#3c2a20'; g.fillRect(x + 8 + k * 19, y, 8, 12);
        g.fillStyle = '#2a2a2a'; g.fillRect(x + 6 + k * 19, y + 12, 12, 1);
        if ((x + y + k) % 3 === 0) drawFlag(g, 'ES', x + 8 + k * 19, y + 13, 9, 6);
      }
    }
    palm(g, 140, 210, 60, '#6a4a2a', '#2a6a35'); palm(g, 480, 210, 66, '#6a4a2a', '#2a6a35');
  },
  floor(g) {
    floorBase(g, '#9a9a9a', '#777');
    for (let y = FT, r = 0; y < VH; y += 9 + r * 2, r++) for (let x = 0; x < ARENA_W; x += 14 + r * 2) {
      g.strokeStyle = 'rgba(60,60,60,0.5)'; g.lineWidth = 1; g.strokeRect(x, y, 14 + r * 2, 9 + r * 2);
      g.fillStyle = 'rgba(70,70,70,0.45)';
      const c = [x + (7 + r), y + (4.5 + r)];
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(c[0] + dx * (2.5 + r * 0.5), c[1] + dy * (1.6 + r * 0.4), 1.1 + r * 0.2, 0, Math.PI * 2); g.fill(); }
    }
  },
  crowd: { seed: 16, n: 26, pal: ['#c0392b', '#f1c40f', '#111', '#e74c3c', '#fff'], y: 211 },
  anim(ctx, t, cx) {
    // 플라멩코 댄서
    for (let i = 0; i < 2; i++) {
      const x = 130 + i * 300 - cx * PAR_CROWD, sw = Math.sin(t * 0.15 + i * 2);
      if (x < -20 || x > VW + 20) continue;
      ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.moveTo(x - 2, 196); ctx.lineTo(x + 2, 196); ctx.lineTo(x + 7 + sw * 2, 210); ctx.lineTo(x - 7 + sw * 2, 210); ctx.fill();
      ctx.fillStyle = '#e0b088'; ctx.fillRect(x - 1.5, 188, 3, 4); ctx.fillStyle = '#111'; ctx.fillRect(x - 2, 186, 4, 2);
      ctx.fillStyle = '#c62828'; ctx.fillRect(x - 2, 192, 4, 5);
      ctx.fillStyle = '#e0b088'; ctx.fillRect(x + 2, 189 - sw * 2, 5, 1); ctx.fillRect(x - 6, 190 + sw * 2, 5, 1);
    }
  },
};

STAGE_DEF.tokyo = {
  name: '도쿄 · 네온 신사', country: 'JP', bgm: 'tokyo',
  far(g) {
    const R = mulberry32(131);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#090418'], [0.6, '#2a0f4a'], [1, '#5c1f6e']]);
    starsG(g, W_FAR, 90, 60, R);
    g.fillStyle = '#ffe9f3'; g.beginPath(); g.arc(120, 44, 16, 0, Math.PI * 2); g.fill();
    // 후지산
    g.fillStyle = '#2b2950'; g.beginPath(); g.moveTo(140, 180); g.lineTo(250, 78); g.lineTo(290, 78); g.lineTo(410, 180); g.fill();
    g.fillStyle = '#e8e8f8'; g.beginPath(); g.moveTo(232, 95); g.lineTo(250, 78); g.lineTo(290, 78); g.lineTo(308, 95); g.lineTo(296, 92); g.lineTo(285, 100); g.lineTo(272, 92); g.lineTo(260, 100); g.lineTo(246, 92); g.fill();
  },
  mid(g) {
    const R = mulberry32(132);
    for (let x = -5; x < W_MID; x += 18 + R() * 14) {
      const h = 40 + R() * 70, w = 16 + R() * 18;
      g.fillStyle = '#16122a'; g.fillRect(x, 200 - h, w, h);
      windows(g, x, 200 - h, w, h, R, ['#ff4fd8', '#3df0ff', '#b8ff3d'], '#16122a', 4);
      if (R() < 0.6) {
        const col = ['#ff2e88', '#00e5ff', '#00e676', '#ffea00'][Math.floor(R() * 4)];
        g.fillStyle = col; g.fillRect(x + w - 6, 200 - h + 8, 5, 30);
        g.fillStyle = '#111'; for (let k = 0; k < 4; k++) g.fillRect(x + w - 5, 200 - h + 11 + k * 7, 3, 4);
      }
    }
    // 도쿄타워 느낌
    const tx = 520;
    g.fillStyle = '#ff4a2e'; g.beginPath(); g.moveTo(tx - 22, 200); g.lineTo(tx - 2, 50); g.lineTo(tx + 2, 50); g.lineTo(tx + 22, 200); g.lineTo(tx + 14, 200); g.lineTo(tx, 90); g.lineTo(tx - 14, 200); g.fill();
    g.fillStyle = '#fff'; g.fillRect(tx - 10, 120, 20, 3); g.fillRect(tx - 6, 84, 12, 3);
    g.fillStyle = '#ff4a2e'; g.fillRect(tx - 0.5, 30, 1, 20);
    // 도리이
    const gx = W_MID / 2 - 20;
    g.fillStyle = '#d7261e'; g.fillRect(gx - 40, 120, 6, 92); g.fillRect(gx + 34, 120, 6, 92);
    g.fillRect(gx - 50, 112, 100, 7); g.fillRect(gx - 44, 128, 88, 5);
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(gx - 56, 112); g.quadraticCurveTo(gx, 104, gx + 56, 112); g.lineTo(gx + 52, 106); g.quadraticCurveTo(gx, 98, gx - 52, 106); g.fill();
  },
  floor(g) {
    floorBase(g, '#2c2440', '#15111f');
    perspLines(g, 'rgba(120,100,180,0.3)', 18, [222, 236, 254]);
    const R = mulberry32(133);
    for (let i = 0; i < 50; i++) { g.fillStyle = ['rgba(255,46,136,0.35)', 'rgba(0,229,255,0.3)', 'rgba(0,230,118,0.3)'][i % 3]; g.fillRect(R() * ARENA_W, 218 + R() * 45, 1 + R() * 2, 6 + R() * 14); }
    g.fillStyle = '#3d3360'; for (let x = 40; x < ARENA_W; x += 140) { g.fillRect(x, FT - 22, 10, 22); g.fillStyle = '#ffd27a'; g.fillRect(x + 2, FT - 18, 6, 6); g.fillStyle = '#3d3360'; }
  },
  crowd: { seed: 17, n: 24, pal: ['#2b1d4f', '#ff2e88', '#00b8d4', '#111'], y: 211 },
  anim(ctx, t, cx) {
    // 코드 비
    const ox = 60 - cx * PAR_MID;
    ctx.fillStyle = 'rgba(0,255,120,0.75)';
    for (let i = 0; i < 6; i++) { const y = ((t * (1 + i * 0.3)) % 90) + 100; ctx.fillRect(ox + i * 4, y, 1, 3); ctx.fillRect(ox + i * 4, y - 8, 1, 2); }
    // 벚꽃잎
    for (let i = 0; i < 26; i++) {
      const x = (i * 47 + t * (0.3 + (i % 3) * 0.1) + Math.sin(t * 0.03 + i) * 10) % (VW + 20) - 10;
      const y = (i * 31 + t * (0.4 + (i % 4) * 0.08)) % (VH + 10) - 5;
      ctx.fillStyle = i % 2 ? '#ffb7d5' : '#ffd6e8'; ctx.fillRect(x, y, 2, 1);
    }
    // 벚꽃 가지
    for (const [bx, dir] of [[0, 1], [VW, -1]]) {
      ctx.strokeStyle = '#3a2028'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, 6); ctx.quadraticCurveTo(bx + dir * 30, 20, bx + dir * 55, 14); ctx.stroke();
      ctx.fillStyle = '#ffb7d5'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(bx + dir * (8 + k * 6), 12 + Math.sin(k * 1.7) * 6, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  },
};

// 히든 보스 스테이지: 한밤중의 학교 운동장
STAGE_DEF.school = {
  name: '??? · 한밤중의 학교', country: 'KR', bgm: 'boss',
  far(g) {
    const R = mulberry32(171);
    vgrad(g, 0, 0, W_FAR, FT, [[0, '#0a0000'], [0.55, '#2a0505'], [0.85, '#5a0d0d'], [1, '#8a1f12']]);
    starsG(g, W_FAR, 90, 50, R, '#ffb3a0');
    // 붉은 달
    g.fillStyle = 'rgba(255,60,40,0.18)'; g.beginPath(); g.arc(150, 52, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff4d3a'; g.beginPath(); g.arc(150, 52, 19, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d93a2b'; g.beginPath(); g.arc(144, 48, 4, 0, Math.PI * 2); g.arc(157, 58, 3, 0, Math.PI * 2); g.fill();
    // 먼 산과 아파트
    ridge(g, W_FAR, FT - 40, 18, '#1a0303', R, 0.02, 0.05);
    for (let x = 0; x < W_FAR; x += 26 + R() * 20) { const h = 30 + R() * 30; g.fillStyle = '#140202'; g.fillRect(x, FT - 40 - h, 18, h + 40); windows(g, x, FT - 40 - h, 18, h, R, ['#5a1a10'], '#140202', 5); }
  },
  mid(g) {
    const R = mulberry32(172);
    // 학교 본관
    const bx = 70, bw = W_MID - 140, by = 70;
    g.fillStyle = '#2b1414'; g.fillRect(bx, by, bw, 142);
    g.fillStyle = '#3a1b1b'; g.fillRect(bx, by, bw, 6);
    for (let fl = 0; fl < 4; fl++) for (let x = bx + 10; x < bx + bw - 16; x += 24) {
      const lit = R() < 0.12;
      g.fillStyle = lit ? '#ffcf70' : '#160909'; g.fillRect(x, by + 14 + fl * 32, 14, 18);
      g.fillStyle = '#2b1414'; g.fillRect(x + 6, by + 14 + fl * 32, 2, 18);
    }
    // 시계탑 (4시 55분)
    const cx = bx + bw / 2;
    g.fillStyle = '#331919'; g.fillRect(cx - 22, by - 40, 44, 46);
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(cx, by - 18, 15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a1010'; g.lineWidth = 2; g.beginPath();
    g.moveTo(cx, by - 18); g.lineTo(cx + Math.sin(4.9 / 12 * Math.PI * 2) * 8, by - 18 - Math.cos(4.9 / 12 * Math.PI * 2) * 8);
    g.moveTo(cx, by - 18); g.lineTo(cx + Math.sin(55 / 60 * Math.PI * 2) * 12, by - 18 - Math.cos(55 / 60 * Math.PI * 2) * 12); g.stroke();
    // 현판
    g.fillStyle = '#1a0a0a'; g.fillRect(cx - 40, by + 140 - 22, 80, 12);
    g.fillStyle = '#d4af37'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText('교 무 실', cx, by + 140 - 13); g.textAlign = 'left';
    // 국기 게양대
    g.fillStyle = '#777'; g.fillRect(40, 60, 2, 152);
    g.fillStyle = '#ddd'; g.fillRect(42, 62, 18, 12);
  },
  floor(g) {
    floorBase(g, '#5a3a2a', '#2a1a12');
    const R = mulberry32(173);
    for (let i = 0; i < 260; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,220,180,0.08)'; g.fillRect(R() * ARENA_W, FT + R() * (VH - FT), 2, 1); }
    // 운동장 흰 선
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 236, ARENA_W, 2);
    g.fillStyle = '#3a2a22'; g.fillRect(0, FT, ARENA_W, 3);
  },
  crowd: { seed: 18, n: 20, pal: ['#1c2a48', '#202020', '#2b2b4a', '#3b1f1f'], y: 210 },
  anim(ctx, t, cx) {
    // 가끔 번개
    const k = t % 420;
    if (k < 6 && k % 2 === 0) { ctx.fillStyle = 'rgba(255,230,230,0.18)'; ctx.fillRect(0, 0, VW, FT); }
    // 날리는 낙엽
    for (let i = 0; i < 14; i++) {
      const x = (i * 61 + t * (0.5 + (i % 3) * 0.2)) % (VW + 20) - 10;
      const y = (i * 37 + t * (0.25 + (i % 4) * 0.06) + Math.sin(t * 0.05 + i) * 6) % (FT + 10);
      ctx.fillStyle = i % 2 ? '#8a3a1a' : '#5a2a10'; ctx.fillRect(x, y, 2, 1);
    }
  },
};

// 스테이지 캐시 빌드
const _stageCache = {};
function getStage(key) {
  if (_stageCache[key]) return _stageCache[key];
  const d = STAGE_DEF[key] || STAGE_DEF.seoul;
  const far = mkCanvas(W_FAR, FT + 6), mid = mkCanvas(W_MID, FT + 6), floor = mkCanvas(ARENA_W, VH);
  d.far(far.getContext('2d'));
  d.mid(mid.getContext('2d'));
  d.floor(floor.getContext('2d'));
  const crowd = d.crowd ? crowdSpec(d.crowd.seed, d.crowd.n, d.crowd.pal, d.crowd.y) : [];
  return (_stageCache[key] = { def: d, far, mid, floor, crowd });
}

function drawStage(ctx, key, camX, t, hype) {
  const S = getStage(key);
  ctx.drawImage(S.far, Math.round(-camX * PAR_FAR), 0);
  ctx.drawImage(S.mid, Math.round(-camX * PAR_MID), 0);
  if (S.def.anim) S.def.anim(ctx, t, camX);
  ctx.drawImage(S.floor, Math.round(-camX), 0);
  drawCrowd(ctx, S.crowd, t, camX, hype || 0);
}
