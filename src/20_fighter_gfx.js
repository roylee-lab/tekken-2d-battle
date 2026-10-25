// ============================================================
//  캐릭터 그래픽 (스켈레톤 + 도트풍 외곽선)
//  각도 규칙: 0 = 아래, +는 바라보는 방향(앞)으로 회전
// ============================================================
const OUT = '#140c18';
const _shc = {};
function sh(col, a) { const k = col + '|' + a; return _shc[k] || (_shc[k] = shade(col, a)); }

function seg(ctx, x1, y1, x2, y2, w, col, hl) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  if (hl !== false && w >= 3) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
    const o = w * 0.24;
    ctx.strokeStyle = sh(col, 0.3); ctx.lineWidth = Math.max(1, w * 0.28);
    ctx.beginPath(); ctx.moveTo(x1 + nx * o, y1 + ny * o); ctx.lineTo(x2 + nx * o, y2 + ny * o); ctx.stroke();
  }
}
function circ(ctx, x, y, r, col, outline) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (outline !== false) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fillStyle = col; ctx.fill();
}
function ell(ctx, x, y, rx, ry, col, outline, rot) {
  if (outline !== false) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(x, y, rx + 1, ry + 1, rot || 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill();
}
function poly(ctx, pts, col, outline) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (outline !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.fillStyle = col; ctx.fill();
}

// 털 (허도개미): 선분을 따라 짧은 털을 그림
function hairStrokes(ctx, x1, y1, x2, y2, n, w) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1), x = x1 + dx * k, y = y1 + dy * k, o = (i % 2 ? 1 : -1) * w * 0.3;
    ctx.moveTo(x + nx * o, y + ny * o); ctx.lineTo(x + nx * (o + (i % 2 ? 1.6 : -1.6)) + dx / len * 0.8, y + ny * (o + (i % 2 ? 1.6 : -1.6)) + dy / len * 0.8);
  }
  ctx.stroke();
}
// ---------------- 포즈 ----------------
function P(o) {
  return Object.assign({ lean: 0.06, tilt: 0, fa: [0.8, 1.95], ba: [0.5, 2.1], fl: [0.26, 0.34], bl: [-0.22, 0.14], hand: 'fist', bhand: 'fist', eyes: 'n', mouth: 'n', air: false, rot: 0, dy: 0 }, o);
}
function idlePose(c, t) {
  const br = Math.sin(t * 0.09);
  let p;
  switch (c) {
    case 9: // 창가오: 팔짱 + 턱 들기
      p = P({ lean: -0.04, tilt: -0.12, fa: [0.35, 2.55], ba: [0.55, 2.45], fl: [0.14, 0.06], bl: [-0.16, 0.04], hand: 'hide', bhand: 'hide' });
      break;
    case 5: // 使命감: 주짓수 자세 (낮은 자세, 손 펴기)
      p = P({ lean: 0.22, fa: [1.05, 1.05], ba: [0.85, 1.25], fl: [0.55, 0.75], bl: [-0.45, 0.35], hand: 'open', bhand: 'open' });
      break;
    case 4: case 6: // 통통한 캐릭터: 넓은 자세
      p = P({ lean: 0.0, fa: [0.7, 1.7], ba: [0.45, 1.8], fl: [0.32, 0.25], bl: [-0.35, 0.15] });
      break;
    case 8: // 힙찔 강: 리듬 타기
      p = P({ lean: 0.04 + Math.sin(t * 0.2) * 0.04, fa: [0.6, 1.7 + Math.sin(t * 0.2) * 0.3], ba: [0.3, 1.6], fl: [0.25, 0.3 + Math.max(0, Math.sin(t * 0.2)) * 0.3], bl: [-0.28, 0.2] });
      break;
    case 12: // 힌참휴: 해커 자세
      p = P({ lean: 0.1, fa: [1.0, 1.5], ba: [0.8, 1.6], fl: [0.25, 0.25], bl: [-0.25, 0.15], tilt: 0.05 });
      break;
    case 7: // 독민재B: 구부정
      p = P({ lean: 0.14, tilt: 0.1, fa: [0.75, 1.8], ba: [0.45, 1.9] });
      break;
    default:
      p = P({});
  }
  p.fa = [p.fa[0] + br * 0.04, p.fa[1]];
  p.ba = [p.ba[0] + br * 0.04, p.ba[1]];
  p.fl = [p.fl[0] + br * 0.03, p.fl[1] + br * 0.06];
  p.bl = [p.bl[0], p.bl[1] + br * 0.04];
  return p;
}

// 렌더용 상태 판정
function visualState(F, G) {
  if (F.ko) return 'ko';
  if (G) {
    if ((G.phase === 'ko' && G.rw === F.side && G.pt > 70) || (G.phase === 'end' && G.mw === F.side)) return 'win';
    if ((G.phase === 'ko' && G.pt > 70 && G.rw !== F.side && G.rw !== -1) || (G.phase === 'end' && G.mw !== F.side && G.mw !== -1)) return 'lose';
  }
  if (F.chokeT > 0) return 'choked';
  if (F.chokeHold) return 'choke';
  if (F.hitT > 0) return 'hit';
  if (F.stunT > 0) return 'dizzy';
  if (F.flyT > 0) return 'fly';
  if (F.rushT2 > 0) return 'dash';
  if (F.laughT > 0) return 'laugh';
  if (F.fireT > 0 || F.breathN > 0) return 'breathe';
  if (F.kkT > 0) return 'kk';
  if (F.shutT > 0) return 'smash';
  if (F.blockT > 0 || F.guard) return 'guard';
  if (F.headT > 0) return 'head';
  if (F.dashT > 0) return 'dash';
  if (F.atk) return 'atk';
  if (F.y > 0.5) return 'jump';
  if (F.castT > 0) return 'cast';
  if (F.meokT > 0) return 'eat';
  if (F.jeongP > 0) return 'medit';
  if (F.parryT > 0) return 'parry';
  if (F.rootT > 0) return 'dizzy';
  if (Math.abs(F.vx) > 0.1) return 'walk';
  return 'idle';
}

function poseOf(F, vs, G) {
  const t = F.anim;
  let p = idlePose(F.c, t);
  switch (vs) {
    case 'walk': {
      const ph = t * 0.2 * (F.vx * F.f >= 0 ? 1 : -1);
      const s = Math.sin(ph), c = Math.cos(ph);
      p.fl = [0.12 + s * 0.45, 0.2 + Math.max(0, c) * 0.55];
      p.bl = [0.12 - s * 0.45, 0.2 + Math.max(0, -c) * 0.55];
      p.dy = Math.abs(s) * -1;
      if (F.c !== 9) { p.fa = [0.8 + s * 0.12, 1.9]; p.ba = [0.5 - s * 0.12, 2.0]; }
      break;
    }
    case 'jump':
      p.air = true;
      if (F.atk === 'K') { p.fl = [1.35, 0.1]; p.flx = 1.3; p.bl = [0.6, 1.7]; p.lean = -0.2; p.fa = [1.0, 1.4]; p.ba = [-0.3, 0.8]; }
      else if (F.atk === 'P') { p.fa = [1.75, 0.15]; p.fax = 1.2; p.lean = 0.2; p.fl = [1.0, 1.8]; p.bl = [0.5, 1.5]; }
      else if (F.vy > 1.5) { p.fl = [1.05, 1.9]; p.bl = [0.6, 1.7]; p.fa = [1.4, 1.5]; p.ba = [1.0, 1.6]; }
      else { p.fl = [0.5, 0.6]; p.bl = [0.1, 0.4]; p.fa = [1.2, 1.2]; p.ba = [0.9, 1.3]; }
      break;
    case 'guard':
      p = P({ lean: 0.02, fa: [1.25, 2.45], ba: [1.05, 2.55], fl: [1.0, 1.65], bl: [0.15, 1.35], eyes: 'n' });
      break;
    case 'atk': {
      const prog = F.atkT / Math.max(1, F.atkAct);
      const k = F.atkT <= F.atkAct ? Math.min(1, prog) : Math.max(0, 1 - (F.atkT - F.atkAct) / Math.max(1, F.atkDur - F.atkAct) * 1.2);
      if (F.atk === 'P') {
        p.mouth = 'shout';
        if (F.atkStep === 2) { p.ba = [lerp(0.5, 1.57, k), lerp(2.1, 0.05, k)]; p.fa = [0.55, 2.25]; p.lean = 0.06 + 0.25 * k; p.bhand = 'fist'; p.bax = 1 + 0.28 * k; }
        else if (F.atkStep === 3) { p.fa = [lerp(0.4, 2.75, k), lerp(2.2, 0.25, k)]; p.lean = -0.18 * k; p.fl = [lerp(0.3, 0.12, k), lerp(0.32, 0.05, k)]; p.bl = [lerp(-0.3, -0.15, k), lerp(0.18, 0.05, k)]; }
        else { p.fa = [lerp(0.8, 1.57, k), lerp(1.95, 0.05, k)]; p.lean = 0.06 + 0.16 * k; p.fax = 1 + 0.25 * k; }
        if (F.atkStep === 3) p.fax = 1 + 0.15 * k;
        if (F.c === 9) { p.ba = [0.5, 2.0]; p.bhand = 'fist'; p.hand = 'fist'; }
      } else {
        p.fl = [lerp(0.3, 1.65, k), lerp(0.32, 0.0, k)]; p.bl = [lerp(-0.3, -0.12, k), 0.05]; p.flx = 1 + 0.38 * k;
        p.lean = -0.38 * k; p.fa = [0.7, 1.6]; p.ba = [-0.35, 0.9]; p.mouth = 'shout';
        p.hand = 'fist'; p.bhand = 'fist';
      }
      break;
    }
    case 'hit':
      p = P({ lean: -0.38, tilt: -0.3, fa: [-0.5, 0.7], ba: [-0.7, 0.4], fl: [0.35, 0.45], bl: [-0.2, 0.3], eyes: 'hurt', mouth: 'open', hand: 'open', bhand: 'open', air: F.y > 0.5 });
      break;
    case 'ko': {
      const prog = G && G.phase !== 'fight' ? Math.min(1, (G.pt || 0) / 25) : 1;
      p = P({ lean: -0.2, tilt: -0.4, fa: [-1.4, 0.3], ba: [-1.8, 0.2], fl: [0.4, 0.3], bl: [0.1, 0.1], eyes: 'ko', mouth: 'open', hand: 'open', bhand: 'open', air: true });
      p.rot = -1.5 * prog; p.dy = 0;
      break;
    }
    case 'win':
      p = winPose(F.c, t);
      break;
    case 'lose':
      p = P({ lean: 0.45, tilt: 0.45, fa: [0.2, 0.3], ba: [0.1, 0.2], fl: [0.6, 1.2], bl: [0.2, 1.4], eyes: 'closed', mouth: 'n', hand: 'open', bhand: 'open' });
      break;
    case 'cast':
      p.fa = [1.5, 0.15]; p.ba = [1.45, 0.3]; p.lean = 0.16; p.hand = 'open'; p.bhand = 'open'; p.mouth = 'shout';
      p.fl = [0.45, 0.35]; p.bl = [-0.45, 0.1];
      break;
    case 'eat':
      p.fa = [0.9, 2.45 + Math.sin(t * 0.6) * 0.12]; p.hand = 'food'; p.mouth = t % 12 < 6 ? 'open' : 'n';
      break;
    case 'medit':
      p = P({ lean: 0, fa: [0.85, 2.15], ba: [0.85, 2.2], fl: [0.2, 0.1], bl: [-0.2, 0.1], eyes: 'closed', hand: 'open', bhand: 'open' });
      break;
    case 'parry':
      p.fa = [1.6, 0.9]; p.hand = 'open'; p.lean = -0.06; p.ba = [0.6, 2.0];
      break;
    case 'dizzy':
      p.fa = [0.3, 0.6]; p.ba = [0.2, 0.5]; p.lean = Math.sin(t * 0.15) * 0.12; p.eyes = 'dizzy'; p.hand = 'open'; p.bhand = 'open';
      break;
    case 'dash':
      p = P({ lean: 0.55, fa: [-0.7, 0.4], ba: [-0.9, 0.3], fl: [0.9, 0.7], bl: [-0.7, 0.3], mouth: 'shout' });
      break;
    case 'head':
      p = P({ lean: 0.95, tilt: 0.25, fa: [-0.6, 0.5], ba: [-0.8, 0.4], fl: [0.7, 0.7], bl: [-0.6, 0.2], mouth: 'shout' });
      break;
    case 'choked':
      p = P({ lean: -0.3, tilt: -0.35 + Math.sin(t * 0.5) * 0.08, fa: [2.2 + Math.sin(t * 0.7) * 0.3, 0.5], ba: [1.9, 0.6], fl: [0.5, 0.6], bl: [-0.1, 0.4], eyes: 'hurt', mouth: 'open', hand: 'open', bhand: 'open' });
      break;
    case 'choke':
      p = P({ lean: 0.3, fa: [1.9, 1.6], ba: [1.7, 1.7], fl: [0.6, 0.8], bl: [-0.5, 0.4], hand: 'open', bhand: 'open', mouth: 'shout' });
      break;
    case 'fly':
      p = P({ lean: 0.5, air: true, fa: [2.6, 0.3], ba: [2.4, 0.4], fl: [1.2, 1.6], bl: [0.4, 1.4], mouth: 'shout' });
      break;
    case 'laugh':
      p = P({ lean: -0.25 + Math.sin(t * 0.9) * 0.08, tilt: -0.3, fa: [0.4, 1.9], ba: [0.3, 2.0], fl: [0.2, 0.1], bl: [-0.2, 0.1], mouth: 'open', eyes: 'closed' });
      break;
    case 'breathe':
      p.lean = 0.25; p.tilt = 0.1; p.mouth = 'shout'; p.fa = [0.6, 1.5]; p.ba = [0.4, 1.6];
      break;
    case 'kk':
      p.tilt = 0.55 * Math.sin(t * 0.8); p.lean = 0.2; p.fa = [1.5, 0.3]; p.hand = 'open'; p.mouth = 'shout';
      break;
    case 'smash':
      p.fa = [2.9, 0.4]; p.lean = -0.2; p.mouth = 'shout'; p.hand = 'fist';
      break;
    default: break;
  }
  if (F.board && vs !== 'ko') p.board = true;
  if (lookOf(F).acc.chinUp && vs !== 'hit' && vs !== 'ko' && vs !== 'lose') p.tilt -= 0.1;
  return p;
}

function winPose(c, t) {
  const b = Math.sin(t * 0.12);
  switch (c) {
    case 9: return P({ lean: -0.08, tilt: -0.22, fa: [0.35, 2.55], ba: [0.55, 2.45], fl: [0.12, 0.05], bl: [-0.14, 0.04], hand: 'hide', bhand: 'hide', mouth: 'smirk' });
    case 5: return P({ lean: 0, fa: [1.57, 2.7 + b * 0.1], ba: [1.4, 2.7 + b * 0.1], fl: [0.25, 0.1], bl: [-0.25, 0.1], mouth: 'shout' });
    case 4: case 6: return P({ lean: -0.05, fa: [2.6 + b * 0.2, 0.4], ba: [2.4 - b * 0.2, 0.5], fl: [0.3, 0.2], bl: [-0.3, 0.1], mouth: 'smile', hand: 'open', bhand: 'open', dy: -Math.abs(b) * 3 });
    case 12: return P({ lean: 0.05, fa: [1.3, 1.6], ba: [1.1, 1.7], fl: [0.2, 0.1], bl: [-0.2, 0.1], mouth: 'smirk', hand: 'open', bhand: 'open' });
    case 8: return P({ lean: 0.1, fa: [2.2, 1.0 + b * 0.4], ba: [0.4, 1.5], fl: [0.3, 0.4], bl: [-0.3, 0.2], mouth: 'smile', hand: 'open', dy: -Math.abs(b) * 3 });
    default: return P({ lean: -0.05, fa: [2.9, 0.15], ba: [0.3, 1.9], fl: [0.2, 0.1], bl: [-0.25, 0.1], mouth: 'shout', dy: -Math.abs(b) * 2 });
  }
}

// ---------------- 캐릭터 그리기 ----------------
// (0,0) = 발 중앙, 오른쪽을 바라보는 기준으로 그림
function drawCharacter(ctx, c, pose, t, opts) {
  opts = opts || {};
  const L = opts.look || CHARS[c].look, H = L.H, b = L.b, A = L.acc;
  const thL = 21 * H, shL = 21 * H, toL = 27 * H, uaL = 16 * H, faL = 15 * H, hr = b.headR * H;
  const skin = L.skin;
  const longSleeve = ['hoodie', 'track', 'jacket', 'coat', 'robe', 'hackerHood', 'dragon'].includes(L.topStyle);
  const giSleeve = L.topStyle === 'gi';
  const shorts = L.topStyle === 'tank';

  const leg = (a, ex) => {
    ex = ex || 1;
    const kx = Math.sin(a[0]) * thL * ex, ky = Math.cos(a[0]) * thL * ex, s = a[0] - a[1];
    return { kx, ky, fx: kx + Math.sin(s) * shL * ex, fy: ky + Math.cos(s) * shL * ex, s };
  };
  const FL = leg(pose.fl, pose.flx), BL = leg(pose.bl);
  let hipY = pose.air || pose.rot ? -(thL + shL) * 0.92 : -(Math.max(FL.fy, BL.fy) + 3 * H);
  if (pose.board) hipY -= 5;
  hipY += pose.dy || 0;
  const hipX = 0;
  const lean = pose.lean;
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const tw = (lx, ly) => [hipX + lx * cl - ly * sl, hipY + lx * sl + ly * cl]; // 몸통 로컬 → 캐릭터 좌표
  const shC = tw(0, -toL);
  const fSh = tw(2.5 * H + b.muscle * 1.5, -toL + 2), bSh = tw(-2.5 * H - b.muscle * 1.5, -toL + 2);
  const headA = lean + pose.tilt;
  const hc = [shC[0] + Math.sin(headA) * (3 * H + hr), shC[1] - Math.cos(headA) * (3 * H + hr)];
  const fHip = tw(2 * H, 0), bHip = tw(-2 * H, 0);

  ctx.save();
  if (pose.rot) { ctx.translate(0, -6); ctx.rotate(pose.rot); }

  const arm = (s, a, xt) => {
    xt = xt || 1;
    const ex = s[0] + Math.sin(a[0]) * uaL * xt, ey = s[1] + Math.cos(a[0]) * uaL * xt;
    const a2 = a[0] + a[1];
    return { ex, ey, hx: ex + Math.sin(a2) * faL * xt, hy: ey + Math.cos(a2) * faL * xt, a2 };
  };
  const FA = arm(fSh, pose.fa, pose.fax), BA = arm(bSh, pose.ba, pose.bax);
  const TK = 1.32; // 도트 격투게임 느낌의 두툼한 팔다리
  const armW = b.arm * H * TK, foreW = b.fore * H * TK, thW = b.thigh * H * TK, shW = b.shin * H * TK;

  const drawArm = (S, AR, isFront, handType) => {
    if (handType === 'hide') return; // 팔짱(앞으로 가림)
    const sleeveCol = giSleeve ? L.top : L.top;
    // 위팔
    if (longSleeve || giSleeve) seg(ctx, S[0], S[1], AR.ex, AR.ey, armW + 1, isFront ? sleeveCol : sh(sleeveCol, -0.18));
    else if (L.topStyle === 'tank') seg(ctx, S[0], S[1], AR.ex, AR.ey, armW, isFront ? skin : sh(skin, -0.15));
    else {
      seg(ctx, S[0], S[1], AR.ex, AR.ey, armW, isFront ? skin : sh(skin, -0.15));
      const mx = lerp(S[0], AR.ex, 0.55), my = lerp(S[1], AR.ey, 0.55);
      seg(ctx, S[0], S[1], mx, my, armW + 1.5, isFront ? L.top : sh(L.top, -0.18));
    }
    // 아래팔
    if (longSleeve) seg(ctx, AR.ex, AR.ey, AR.hx, AR.hy, foreW + 0.5, isFront ? L.top : sh(L.top, -0.18));
    else seg(ctx, AR.ex, AR.ey, AR.hx, AR.hy, foreW, isFront ? skin : sh(skin, -0.15));
    if (A.hairy && !longSleeve) { hairStrokes(ctx, S[0], S[1], AR.ex, AR.ey, 4, armW); hairStrokes(ctx, AR.ex, AR.ey, AR.hx, AR.hy, 4, foreW); }
    if (giSleeve) {
      const mx = lerp(AR.ex, AR.hx, 0.45), my = lerp(AR.ey, AR.hy, 0.45);
      seg(ctx, AR.ex, AR.ey, mx, my, foreW + 1.6, isFront ? L.top : sh(L.top, -0.18));
    }
    if (L.topStyle === 'track') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(S[0], S[1] - 1); ctx.lineTo(AR.ex, AR.ey - 1); ctx.lineTo(AR.hx, AR.hy - 1); ctx.stroke();
    }
    // 손
    const hc2 = isFront ? skin : sh(skin, -0.15);
    if (handType === 'open') ell(ctx, AR.hx, AR.hy, foreW * 0.75, foreW * 0.55, hc2, true, AR.a2);
    else if (handType === 'food') {
      circ(ctx, AR.hx, AR.hy, foreW * 0.75, hc2);
      // 닭다리
      ctx.save(); ctx.translate(AR.hx, AR.hy); ctx.rotate(-0.6);
      ell(ctx, 4, -2, 4, 3, '#b5651d'); seg(ctx, 0, 0, -3, 3, 1.5, '#f5f0e0', false);
      ctx.restore();
    } else circ(ctx, AR.hx, AR.hy, foreW * 0.78, hc2);
    if (isFront && A.mic && handType !== 'open' && handType !== 'food') {
      const mx = AR.hx + Math.sin(AR.a2 + 2.6) * 7, my = AR.hy + Math.cos(AR.a2 + 2.6) * 7;
      seg(ctx, AR.hx, AR.hy, mx, my, 1.6, '#333', false);
      circ(ctx, mx, my, 2, '#bbb');
    }
  };

  const pantsCol = L.pants;
  const drawLeg = (hip, LG, isFront) => {
    const pc = isFront ? pantsCol : sh(pantsCol, -0.2);
    const kx = hip[0] + LG.kx, ky = hip[1] + LG.ky, fx = hip[0] + LG.fx, fy = hip[1] + LG.fy;
    seg(ctx, hip[0], hip[1], kx, ky, thW, pc);
    if (shorts) { seg(ctx, kx, ky, fx, fy, shW, isFront ? skin : sh(skin, -0.15)); if (A.hairy) hairStrokes(ctx, kx, ky, fx, fy, 5, shW); }
    else seg(ctx, kx, ky, fx, fy, shW + (L.topStyle === 'gi' ? 1 : 0), pc);
    if (shorts) { ctx.strokeStyle = OUT; ctx.lineWidth = 1; }
    // 발 / 신발
    const dx = Math.cos(LG.s), dy = -Math.sin(LG.s);
    const shoeCol = L.shoes ? (isFront ? L.shoes : sh(L.shoes, -0.2)) : (isFront ? skin : sh(skin, -0.15));
    seg(ctx, fx - dx * 1.5, fy - dy * 1.5 + 1, fx + dx * 7 * H, fy + dy * 7 * H + 1, 4.2 * H, shoeCol, false);
    if (L.shoes) {
      ctx.strokeStyle = sh(shoeCol, -0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx - dx * 1.5, fy - dy * 1.5 + 2.6 * H); ctx.lineTo(fx + dx * 7 * H, fy + dy * 7 * H + 2.6 * H); ctx.stroke();
    }
  };

  // ---- 뒤쪽 장식 ----
  if (A.tail) {
    const sw = Math.sin(t * 0.1) * 4;
    const p0 = tw(-6 * H, -2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p0[0] - 16, p0[1] + 6 + sw, p0[0] - 24, p0[1] - 4 + sw); ctx.stroke();
    ctx.strokeStyle = L.top; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p0[0] - 16, p0[1] + 6 + sw, p0[0] - 24, p0[1] - 4 + sw); ctx.stroke();
    poly(ctx, [[p0[0] - 24, p0[1] - 9 + sw], [p0[0] - 30, p0[1] - 2 + sw], [p0[0] - 22, p0[1] + sw]], '#ffcc33');
  }
  if (A.bamboo) {
    const a = tw(-8, -toL - 6), z = tw(8, 4);
    seg(ctx, a[0], a[1], z[0], z[1], 3, '#7dcea0');
    ctx.fillStyle = '#145a32';
    for (let i = 1; i < 4; i++) { const q = [lerp(a[0], z[0], i / 4), lerp(a[1], z[1], i / 4)]; ctx.fillRect(q[0] - 1.5, q[1] - 0.5, 3, 1); }
  }
  if (L.topStyle === 'coat') {
    const fl = Math.sin(t * 0.13) * 3;
    const w0 = tw(-b.waistW * 0.5 * H - 1, -2), w1 = tw(b.waistW * 0.3 * H, -2);
    poly(ctx, [w0, w1, [w1[0] - 2 + fl * 0.3, w1[1] + 26 * H], [w0[0] - 9 + fl, w0[1] + 27 * H]], sh(L.top, -0.25));
  }
  // 뒷다리, 뒷팔
  drawLeg(bHip, BL, false);
  drawArm(bSh, BA, false, pose.bhand);

  // ---- 몸통 ----
  const cw = (b.torsoW + b.muscle * 3) * H * 1.18, ww = b.waistW * H * 1.18, belly = b.belly, hips = b.hips * H;
  const torso = [];
  const bez = (p0, c, p1, n) => { for (let i = 0; i <= n; i++) { const u = i / n; torso.push(tw((1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1])); } };
  bez([-ww / 2 - hips * 0.6 + belly * 3, 2], [-ww / 2 - hips - belly * 1, -toL * 0.25], [-cw / 2, -toL + 3], 6);
  torso.push(tw(-cw / 2 + 2, -toL - 1), tw(cw / 2 - 2, -toL - 1));
  bez([cw / 2, -toL + 3], [ww / 2 + belly * 24 * H + b.muscle * 3, -toL * 0.3], [ww / 2 + hips * 0.2 + belly * 4, 2], 10);
  poly(ctx, torso, L.top);
  // 몸통 음영 (뒤쪽)
  ctx.save(); ctx.clip();
  ctx.fillStyle = sh(L.top, -0.2);
  const back = [tw(-cw, -toL - 4), tw(-cw * 0.15, -toL - 4), tw(-ww * 0.25, 4), tw(-ww - 8, 4)];
  ctx.beginPath(); ctx.moveTo(back[0][0], back[0][1]); for (const q of back) ctx.lineTo(q[0], q[1]); ctx.fill();
  // 스타일별 디테일
  drawTorsoDetail(ctx, L, tw, cw, ww, toL, H, t);
  if (belly > 0) {
    const bc = tw(ww * 0.45 + belly * 6, -toL * 0.3);
    ctx.fillStyle = sh(L.top, 0.18); ctx.beginPath(); ctx.ellipse(bc[0], bc[1], 4 + belly * 3, 6 + belly * 3, lean, 0, Math.PI * 2); ctx.fill();
  }
  if (b.muscle > 0.6 && L.topStyle !== 'gi') {
    ctx.strokeStyle = sh(L.top, -0.3); ctx.lineWidth = 1;
    const pc = tw(cw * 0.1, -toL * 0.62), pe = tw(cw * 0.48, -toL * 0.55);
    ctx.beginPath(); ctx.moveTo(...pc); ctx.lineTo(...pe); ctx.stroke();
  }
  ctx.restore();
  // 큰 가슴 (허도개미)
  if (A.chest) {
    const c1 = tw(cw * 0.38, -toL * 0.66);
    ell(ctx, c1[0], c1[1], 5.2 * H, 4.6 * H, L.top, true, lean);
    ctx.fillStyle = sh(L.top, 0.2); ctx.beginPath(); ctx.ellipse(c1[0] - 1, c1[1] - 1.5, 2.2, 1.4, lean, 0, Math.PI * 2); ctx.fill();
    if (A.hairy) { const n0 = tw(cw * 0.15, -toL + 2), n1 = tw(cw * 0.45, -toL * 0.8); hairStrokes(ctx, n0[0], n0[1], n1[0], n1[1], 5, 3); }
  }
  // 축구 유니폼 등번호 (차니팍)
  if (A.jersey) {
    const q = tw(ww * 0.12, -toL * 0.5);
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(lean);
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(A.jersey, 0, 3); ctx.textAlign = 'left';
    ctx.restore();
    const sl = tw(-cw * 0.45, -toL + 1), sr = tw(cw * 0.45, -toL + 1);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sl[0], sl[1]); ctx.lineTo(sr[0], sr[1]); ctx.stroke();
  }

  // 로브 치마 (죽림고수)
  if (L.topStyle === 'robe') {
    const fl = Math.sin(t * 0.1) * 1.5;
    const a0 = tw(-ww / 2 - 1, -1), a1 = tw(ww / 2 + 1, -1);
    poly(ctx, [a0, a1, [a1[0] + 3 + fl, a1[1] + 15 * H], [a0[0] - 4 + fl, a0[1] + 15 * H]], sh(L.top, -0.08));
    if (A.sash) { const s0 = tw(-ww / 2, -3), s1 = tw(ww / 2, -3); seg(ctx, s0[0], s0[1], s1[0], s1[1], 3, A.sash, false); seg(ctx, s0[0], s0[1], s0[0] - 5 + fl, s0[1] + 9, 2, A.sash, false); }
  }
  // 앞다리
  drawLeg(fHip, FL, true);
  if (L.topStyle === 'gi' && A.belt) {
    const s0 = tw(-ww / 2 - 1, -3), s1 = tw(ww / 2 + 1, -3);
    seg(ctx, s0[0], s0[1], s1[0], s1[1], 3, A.belt, false);
    const k = tw(ww / 2 - 1, -3), fl = Math.sin(t * 0.12) * 1.5;
    seg(ctx, k[0], k[1], k[0] + 2 + fl, k[1] + 7, 1.6, A.belt, false);
    seg(ctx, k[0], k[1], k[0] - 1 + fl, k[1] + 8, 1.6, A.belt, false);
  }
  // 목
  const nb = tw(0, -toL + 1);
  seg(ctx, nb[0], nb[1], hc[0] - Math.sin(headA) * hr * 0.6, hc[1] + Math.cos(headA) * hr * 0.6, (4.5 + b.muscle * 2.5) * H, skin, false);
  if (A.phones) {
    const pn = tw(0, -toL + 1);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pn[0], pn[1] - 1, 4.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(pn[0], pn[1] - 1, 4.5, 0.2, Math.PI - 0.2); ctx.stroke();
    circ(ctx, pn[0] + 4.2, pn[1] + 1, 2, '#ff007f'); circ(ctx, pn[0] - 4.2, pn[1] + 1, 2, sh('#ff007f', -0.3));
  }
  if (A.gold || A.chain) {
    const pn = tw(1, -toL + 3);
    ctx.strokeStyle = '#f7d046'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(pn[0], pn[1], 4, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = '#ffe680'; ctx.fillRect(pn[0] - 0.5, pn[1] + 3.5, 1.5, 2);
  }
  if (A.napkin) {
    const n0 = tw(cw / 2 - 1, -toL + 4), n1 = tw(-1, -toL + 3), n2 = tw(cw / 2 + 2, -toL * 0.55);
    poly(ctx, [n0, n1, n2], '#ffffff');
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(n2[0] - 2, n2[1] - 3, 2, 2);
  }

  // ---- 머리 ----
  ctx.save();
  ctx.translate(hc[0], hc[1]);
  ctx.rotate(headA);
  drawHead(ctx, c, hr, pose, t, opts);
  ctx.restore();

  // 팔짱 (창가오)
  if (pose.hand === 'hide') {
    const y0 = tw(0, -toL * 0.62);
    const sl2 = sh(L.top, -0.05);
    seg(ctx, y0[0] - 7, y0[1] - 2, y0[0] + 9, y0[1] + 1, armW + 1.5, sl2);
    seg(ctx, y0[0] - 6, y0[1] + 3, y0[0] + 8, y0[1] - 2, armW + 1.5, L.top);
    circ(ctx, y0[0] + 9, y0[1] - 2, foreW * 0.7, skin);
    // 어깨
    seg(ctx, fSh[0], fSh[1], y0[0] + 6, y0[1] - 1, armW + 1.5, L.top);
  } else {
    drawArm(fSh, FA, true, pose.hand);
  }

  // 보드
  if (pose.board) {
    const by = 0 - 1;
    seg(ctx, -15, by - 2, 16, by - 2, 3, '#ff4fa3', false);
    ctx.fillStyle = OUT; ctx.fillRect(-16, by - 4, 33, 1);
    circ(ctx, -10, by + 1, 2, '#ffe066'); circ(ctx, 11, by + 1, 2, '#ffe066');
  }
  ctx.restore();
  return { hc, hr, top: hc[1] - hr };
}

function drawTorsoDetail(ctx, L, tw, cw, ww, toL, H, t) {
  const A = L.acc;
  const line = (pts, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.beginPath(); ctx.moveTo(...tw(...pts[0])); for (let i = 1; i < pts.length; i++) ctx.lineTo(...tw(...pts[i])); ctx.stroke(); };
  switch (L.topStyle) {
    case 'hoodie':
      ctx.fillStyle = sh(L.top, -0.12);
      { const a = tw(cw * 0.05, -toL * 0.38), bb = tw(ww * 0.55, -toL * 0.38), c2 = tw(ww * 0.55, -4), d = tw(0, -4); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.fill(); }
      line([[cw * 0.25, -toL + 2], [cw * 0.3, -toL * 0.6]], '#fff', 0.8);
      line([[0, -2], [ww * 0.6, -2]], sh(L.top, -0.3), 2);
      break;
    case 'track':
      line([[cw * 0.42, -toL + 1], [ww * 0.45, -2]], '#e0e0e0', 1);
      line([[0, -2], [ww * 0.6, -2]], sh(L.top, -0.35), 2);
      break;
    case 'tank':
      ctx.fillStyle = L.skin;
      { const a = tw(-cw * 0.2, -toL - 2), bb = tw(cw * 0.45, -toL - 2), c2 = tw(cw * 0.3, -toL + 4); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c2); ctx.fill(); }
      line([[-ww, -1], [ww, -1]], sh(L.pants, -0.2), 3);
      break;
    case 'gi':
      line([[-cw * 0.1, -toL], [ww * 0.5, -toL * 0.35]], sh(L.top, -0.3), 1.2);
      line([[cw * 0.45, -toL + 1], [ww * 0.05, -toL * 0.35]], sh(L.top, -0.3), 1.2);
      line([[-cw * 0.1, -toL], [ww * 0.5, -toL * 0.35]], L.acc.giTrim || '#333', 0.6);
      break;
    case 'jacket':
      ctx.fillStyle = '#e8e8d8';
      { const a = tw(cw * 0.3, -toL), bb = tw(cw * 0.55, -toL), c2 = tw(ww * 0.6, -3), d = tw(ww * 0.35, -3); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.fill(); }
      line([[cw * 0.3, -toL], [ww * 0.35, -3]], sh(L.top, -0.35), 1);
      line([[-ww, -1.5], [ww, -1.5]], sh(L.pants, -0.1), 2.5);
      break;
    case 'coat':
      line([[cw * 0.35, -toL + 1], [ww * 0.2, -toL * 0.3], [ww * 0.45, -2]], sh(L.top, -0.4), 1.2);
      ctx.fillStyle = '#1b1b1b';
      { const a = tw(cw * 0.36, -toL + 1), bb = tw(cw * 0.55, -toL + 1), c2 = tw(ww * 0.5, -toL * 0.4); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c2); ctx.fill(); }
      line([[-cw * 0.2, -toL - 1], [-cw * 0.45, -toL - 5]], sh(L.top, 0.15), 2.5);
      break;
    case 'robe':
      line([[cw * 0.45, -toL + 1], [ww * 0.05, -toL * 0.4]], sh(L.top, -0.35), 1.2);
      break;
    case 'hackerHood': {
      const g = '#00e676';
      line([[cw * 0.1, -toL * 0.8], [cw * 0.35, -toL * 0.8], [cw * 0.35, -toL * 0.55]], g, 0.8);
      line([[-cw * 0.2, -toL * 0.4], [ww * 0.1, -toL * 0.4], [ww * 0.3, -toL * 0.25]], g, 0.8);
      line([[ww * 0.2, -toL * 0.65], [ww * 0.45, -toL * 0.65]], g, 0.8);
      ctx.fillStyle = (t >> 3) % 2 ? g : '#0a3';
      { const q = tw(cw * 0.36, -toL * 0.55); ctx.fillRect(q[0] - 0.8, q[1] - 0.8, 1.6, 1.6); }
      line([[0, -2], [ww * 0.6, -2]], '#000', 2);
      break;
    }
    case 'dragon':
      ctx.fillStyle = '#ffcc66';
      { const a = tw(cw * 0.15, -toL * 0.75), bb = tw(cw * 0.5, -toL * 0.75), c2 = tw(ww * 0.55, -4), d = tw(ww * 0.15, -4); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...bb); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.fill(); }
      for (let i = 0; i < 4; i++) line([[ww * 0.2, -toL * (0.65 - i * 0.14)], [ww * 0.55, -toL * (0.65 - i * 0.14)]], '#d49a3a', 0.7);
      break;
    default: // tee
      line([[0, -1.5], [ww * 0.6, -1.5]], sh(L.pants, -0.2), 2.5);
      break;
  }
  if (A.sequin) {
    for (let i = 0; i < 9; i++) {
      const q = tw(((i * 37) % 11 - 5) * 0.09 * cw, -toL * (0.15 + ((i * 53) % 10) * 0.075));
      ctx.fillStyle = (i + (t >> 3)) % 3 === 0 ? '#ffffff' : '#ffd1ec'; ctx.fillRect(q[0] - 0.6, q[1] - 0.6, 1.3, 1.3);
    }
  }
  if (L.topStyle === 'dragon') {
    // 등 가시
    ctx.fillStyle = '#ffcc33';
    for (let i = 0; i < 4; i++) {
      const p0 = tw(-cw * 0.5 - 0.5, -toL + 4 + i * 6), p1 = tw(-cw * 0.5 - 5, -toL + 6 + i * 6), p2 = tw(-cw * 0.5 + 0.5, -toL + 8 + i * 6);
      ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.fill();
    }
  }
}

// 머리 (로컬 좌표: 중심 0,0 / 오른쪽 바라봄)
function drawHead(ctx, c, r, pose, t, opts) {
  const L = (opts && opts.look) || CHARS[c].look, A = L.acc, hair = L.hair;
  const rx = r * (A.roundFace ? 1.1 : 0.96), ry = r;
  // 후드 (머리 뒤)
  if (L.topStyle === 'hoodie' || L.topStyle === 'hackerHood') ell(ctx, -r * 0.7, r * 0.75, r * 0.65, r * 0.45, sh(L.top, -0.15));
  if (L.topStyle === 'dragon') ell(ctx, -r * 0.25, r * 0.1, rx * 1.15, r * 1.15, L.top);
  // 얼굴
  ell(ctx, 0, 0, rx, ry, L.skin);
  if (A.roundFace) ell(ctx, r * 0.45, r * 0.45, r * 0.5, r * 0.42, L.skin, false);
  // 턱 라인(근육질)
  if (L.b.muscle > 0.6) { ctx.fillStyle = L.skin; ctx.fillRect(r * 0.1, r * 0.3, r * 0.75, r * 0.6); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.85, r * 0.3); ctx.lineTo(r * 0.8, r * 0.9); ctx.lineTo(r * 0.1, r * 0.95); ctx.stroke(); }
  // 볼 음영
  ctx.fillStyle = sh(L.skin, -0.12); ctx.beginPath(); ctx.ellipse(-r * 0.35, r * 0.2, r * 0.45, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  // 귀
  ell(ctx, -r * 0.18, r * 0.08, r * 0.2, r * 0.26, sh(L.skin, -0.08));
  // 코
  ctx.fillStyle = L.skin; ctx.strokeStyle = OUT; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx * 0.92, -r * 0.08); ctx.lineTo(rx * 1.12, r * 0.22); ctx.lineTo(rx * 0.9, r * 0.28); ctx.fill(); ctx.stroke();

  // 눈
  const ex = r * 0.5, ey = -r * 0.08;
  if (pose.eyes === 'hurt' || pose.eyes === 'ko') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex - 1.5, ey - 1.5); ctx.lineTo(ex + 1.5, ey + 1.5); ctx.moveTo(ex + 1.5, ey - 1.5); ctx.lineTo(ex - 1.5, ey + 1.5); ctx.stroke();
  } else if (pose.eyes === 'closed') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex - 1.5, ey + 0.5); ctx.lineTo(ex + 1.8, ey + 0.5); ctx.stroke();
  } else if (pose.eyes === 'dizzy') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(ex, ey, 1.6, t * 0.3, t * 0.3 + 5); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; ctx.fillRect(ex - 1.5, ey - 1.2, 3.3, 2.6);
    ctx.fillStyle = '#111'; ctx.fillRect(ex + 0.4, ey - 1, 1.5, 2.4);
  }
  // 눈썹
  ctx.strokeStyle = hair.color; ctx.lineWidth = 1.2;
  const angry = pose.mouth === 'shout' ? 0.9 : 0;
  ctx.beginPath(); ctx.moveTo(ex - 2, ey - 3 - angry * 0.5); ctx.lineTo(ex + 2.4, ey - 2.4 + angry * 0.8); ctx.stroke();

  // 입
  const mx = r * 0.66, my = r * 0.5;
  drawMouth(ctx, L, A, pose, mx, my, r, t);

  // 머리카락
  drawHair(ctx, L, hair, r, rx, t);

  // 악세서리
  if (A.glasses) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(170,220,255,0.35)';
    ctx.fillRect(r * 0.2, -r * 0.36, r * 0.72, r * 0.5); ctx.strokeRect(r * 0.2, -r * 0.36, r * 0.72, r * 0.5);
    ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.2); ctx.lineTo(-r * 0.18, -r * 0.08); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(r * 0.72, -r * 0.3, 1, 1);
  }
  if (A.sunglasses) {
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(r * 0.12, -r * 0.38, r * 0.92, r * 0.5);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 0.25); ctx.lineTo(-r * 0.2, -r * 0.12); ctx.stroke();
    // 반짝
    const g = (t % 90) / 90;
    ctx.fillStyle = '#e8d0ff'; ctx.fillRect(r * 0.15 + g * r * 0.8, -r * 0.34, 1.2, 1.2);
    ctx.fillStyle = 'rgba(200,150,255,0.6)'; ctx.fillRect(r * 0.3, -r * 0.32, r * 0.25, 0.8);
  }
  if (A.visor) {
    ctx.fillStyle = 'rgba(0,255,140,0.55)'; ctx.fillRect(r * 0.05, -r * 0.4, r * 1.05, r * 0.42);
    ctx.fillStyle = '#00ff99'; ctx.fillRect(r * 0.05, -r * 0.42, r * 1.05, 0.8);
    ctx.fillStyle = '#eafff3'; ctx.fillRect(r * 0.2 + ((t >> 2) % 8), -r * 0.3, 1, 1);
  }
  if (A.headband) {
    ctx.fillStyle = A.headband; ctx.fillRect(-r * 0.85, -r * 0.55, r * 1.75, 2.2);
    const w = Math.sin(t * 0.25) * 2;
    seg(ctx, -r * 0.85, -r * 0.45, -r * 1.6, -r * 0.1 + w, 1.6, A.headband, false);
    seg(ctx, -r * 0.85, -r * 0.4, -r * 1.4, r * 0.25 + w, 1.6, A.headband, false);
  }
  if (A.strawHat) {
    poly(ctx, [[-r * 1.6, -r * 0.62], [r * 1.6, -r * 0.62], [r * 0.1, -r * 1.75]], '#e6c26e');
    ctx.strokeStyle = '#b8913a'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.65); ctx.lineTo(r * 0.05, -r * 1.6); ctx.moveTo(r * 0.8, -r * 0.65); ctx.lineTo(r * 0.15, -r * 1.6); ctx.stroke();
  }
  if (A.capBack) {
    ell(ctx, -r * 0.05, -r * 0.55, r * 1.0, r * 0.55, A.capBack);
    ctx.fillStyle = OUT; ctx.fillRect(-r * 1.55, -r * 0.62, r * 0.75, 2.2);
    ctx.fillStyle = A.capBack; ctx.fillRect(-r * 1.5, -r * 0.6, r * 0.65, 1.2);
    ctx.fillStyle = '#ff007f'; ctx.fillRect(-r * 0.2, -r * 0.95, 2, 2);
  }
  if (A.earmuff) {
    // 거꾸로 쓴 귀마개: 띠가 턱 아래로
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.2, r * 1.05, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.strokeStyle = '#c38bff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.2, r * 1.05, 0.15, Math.PI - 0.15); ctx.stroke();
    ell(ctx, -r * 0.18, r * 0.08, r * 0.38, r * 0.42, '#ff9ad5');
  }
  if (A.drunk) {
    ctx.fillStyle = 'rgba(255,60,80,0.55)'; ctx.beginPath(); ctx.ellipse(r * 0.45, r * 0.3, r * 0.3, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,60,80,0.35)'; ctx.fillRect(r * 0.9, -r * 0.05, r * 0.25, r * 0.3);
  }
  if (A.horns || L.topStyle === 'dragon') {
    // 드래곤 후드: 머리 윗부분/뒤를 덮음
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-3 * r, 1.2 * r); ctx.lineTo(-0.7 * r, 1.2 * r); ctx.lineTo(0.15 * r, -0.42 * r); ctx.lineTo(3 * r, -0.5 * r); ctx.lineTo(3 * r, -4 * r); ctx.lineTo(-3 * r, -4 * r); ctx.closePath(); ctx.clip();
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-r * 0.05, -r * 0.05, rx * 1.2, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = L.top; ctx.beginPath(); ctx.ellipse(-r * 0.05, -r * 0.05, rx * 1.12, r * 1.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = sh(L.top, 0.2); ctx.fillRect(-r * 0.4, -r * 0.95, r * 0.6, 1.2);
    poly(ctx, [[-r * 0.5, -r * 0.85], [-r * 1.2, -r * 1.9], [-r * 0.05, -r * 1.0]], '#ffe8b0');
    poly(ctx, [[r * 0.1, -r * 0.95], [r * 0.2, -r * 2.0], [r * 0.6, -r * 0.8]], '#fff2cc');
    ctx.fillStyle = '#ffcc33'; ctx.fillRect(r * 0.6, -r * 0.7, 2, 1.4);
  }
}

function drawMouth(ctx, L, A, pose, mx, my, r, t) {
  const m = pose.mouth;
  if (A.lips) {
    ell(ctx, mx, my - 0.6, r * 0.32, r * 0.14, '#d9707a', true);
    ell(ctx, mx, my + 1.2, r * 0.34, r * 0.17, '#c95c68', false);
    if (m === 'shout' || m === 'open') { ctx.fillStyle = '#3a0d12'; ctx.fillRect(mx - r * 0.18, my - 0.2, r * 0.36, 1.6); }
    return;
  }
  if (m === 'shout' || m === 'open' || A.braces || A.yellowTeeth) {
    const open = m === 'shout' || m === 'open';
    const w = r * 0.42, h = open ? r * 0.32 : r * 0.16;
    ctx.fillStyle = OUT; ctx.fillRect(mx - w / 2 - 0.5, my - h / 2 - 0.5, w + 1, h + 1);
    ctx.fillStyle = open ? '#4a1018' : '#000'; ctx.fillRect(mx - w / 2, my - h / 2, w, h);
    if (A.braces) {
      ctx.fillStyle = '#fff'; ctx.fillRect(mx - w / 2, my - h / 2, w, Math.min(h, 1.8));
      ctx.fillStyle = '#9aa4b0'; ctx.fillRect(mx - w / 2, my - h / 2 + 0.6, w, 0.7);
      ctx.fillStyle = '#d6dde6'; for (let i = 0; i < 3; i++) ctx.fillRect(mx - w / 2 + 0.3 + i * (w / 3), my - h / 2 + 0.3, 0.9, 0.9);
    } else if (A.yellowTeeth) {
      ctx.fillStyle = '#d8c34a'; ctx.fillRect(mx - w / 2, my - h / 2, w, Math.min(h, 1.8));
      ctx.fillStyle = '#7a6a1a'; ctx.fillRect(mx - w / 2 + 1, my - h / 2, 0.8, 1.6);
    } else if (open) {
      ctx.fillStyle = '#fff'; ctx.fillRect(mx - w / 2, my - h / 2, w, 1);
    }
  } else if (m === 'smirk') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx - 2, my + 0.5); ctx.lineTo(mx + 1, my + 0.5); ctx.lineTo(mx + 2.5, my - 1); ctx.stroke();
  } else if (m === 'smile') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my - 1, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx - 1.8, my); ctx.lineTo(mx + 1.8, my); ctx.stroke();
  }
}

function drawHair(ctx, L, hair, r, rx, t) {
  const col = hair.color, hl = sh(col, 0.25);
  // 얼굴을 가리지 않도록 (앞 이마선 frontY ~ 뒤 목덜미 backY) 위쪽만 칠함
  const capFill = (scale, frontY, backY, color, dx, dy) => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-3 * r, backY * r); ctx.lineTo(-0.9 * r, backY * r); ctx.lineTo(0.05 * r, frontY * r); ctx.lineTo(3 * r, frontY * r); ctx.lineTo(3 * r, -4 * r); ctx.lineTo(-3 * r, -4 * r); ctx.closePath(); ctx.clip();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(dx || 0, dy || 0, rx * scale, r * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const cap = (scale, fy, by, dx, dy) => { capFill(scale + 0.1, fy - 0.08, by + 0.05, OUT, dx, dy); capFill(scale, fy, by, col, dx, dy); };
  switch (hair.style) {
    case 'spiky': {
      // 뾰족한 머리 (힌참휴)
      const spikes = [[-1.0, 0.1, -2.1, -0.4], [-0.75, -0.55, -1.75, -1.6], [-0.3, -0.85, -0.85, -2.4], [0.15, -0.95, 0.15, -2.6], [0.55, -0.8, 1.2, -2.05], [0.85, -0.45, 1.7, -1.1]];
      ctx.fillStyle = OUT;
      for (const s of spikes) { ctx.beginPath(); ctx.moveTo(s[0] * r - 3.2, s[1] * r + 1.5); ctx.lineTo(s[2] * r, s[3] * r - 0.8); ctx.lineTo(s[0] * r + 3.2, s[1] * r + 1.5); ctx.fill(); }
      cap(1.06, -0.5, 0.45);
      ctx.fillStyle = col;
      for (const s of spikes) { ctx.beginPath(); ctx.moveTo(s[0] * r - 2.2, s[1] * r + 1.5); ctx.lineTo(s[2] * r * 0.96, s[3] * r * 0.96); ctx.lineTo(s[0] * r + 2.2, s[1] * r + 1.5); ctx.fill(); }
      ctx.fillStyle = '#00e676';
      ctx.fillRect(spikes[3][2] * r - 0.5, spikes[3][3] * r + 1.5, 1, 2);
      ctx.fillRect(spikes[2][2] * r, spikes[2][3] * r + 1.5, 1, 2);
      break;
    }
    case 'buzz': capFill(1.03, -0.55, 0.3, col); break;
    case 'crew': cap(1.05, -0.6, 0.35); break;
    case 'slick':
      cap(1.07, -0.55, 0.65, -1);
      ctx.strokeStyle = hl; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-1, 0, r * 0.85, Math.PI * 1.25, Math.PI * 1.7); ctx.stroke();
      break;
    case 'bowl':
      cap(1.1, -0.32, 0.55, 0, -0.3);
      ctx.strokeStyle = hl; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, Math.PI * 1.3, Math.PI * 1.7); ctx.stroke();
      break;
    case 'topknot':
      cap(1.05, -0.55, 0.4);
      circ(ctx, -r * 0.35, -r * 1.15, r * 0.35, col);
      break;
    case 'messy':
    case 'shaggy': {
      cap(1.1, hair.style === 'shaggy' ? -0.38 : -0.5, hair.style === 'shaggy' ? 0.95 : 0.5);
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (1.05 + i * 0.16);
        const x = Math.cos(a) * rx * 1.05, y = Math.sin(a) * r * 1.05;
        ctx.beginPath(); ctx.moveTo(x - 2, y + 1); ctx.lineTo(x + Math.cos(a) * 3 + (i % 2), y + Math.sin(a) * 3); ctx.lineTo(x + 2, y + 1); ctx.fill();
      }
      break;
    }
    case 'parted':
      cap(1.06, -0.5, 0.45);
      ctx.strokeStyle = hl; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 1.0); ctx.lineTo(r * 0.55, -r * 0.6); ctx.stroke();
      break;
    default: // short
      cap(1.06, -0.52, 0.45);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.95); ctx.lineTo(r * 0.95, -r * 0.5); ctx.lineTo(r * 0.3, -r * 0.55); ctx.fill();
      ctx.strokeStyle = hl; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, Math.PI * 1.3, Math.PI * 1.65); ctx.stroke();
      break;
  }
}

// ---------- 초상화 (머리만) ----------
function drawPortrait(ctx, c, x, y, scale, facing, mood, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (facing || 1), scale);
  const pose = P({ eyes: mood === 'hurt' ? 'hurt' : 'n', mouth: mood === 'hurt' ? 'open' : mood === 'win' ? 'smile' : 'n' });
  const L = CHARS[c].look;
  if (L.acc.chinUp) pose.tilt = -0.1;
  drawHead(ctx, c, CHARS[c].look.b.headR, pose, t || 0, {});
  ctx.restore();
}
