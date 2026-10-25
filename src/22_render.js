// ============================================================
//  게임 화면 렌더링: 이펙트, 투사체, HUD
// ============================================================
const FSCALE = 1.15;                      // 인게임 캐릭터 확대 배율
const FX = { parts: [], floats: [], ghosts: [], beams: [], rings: [], shakeT: 0, shakeI: 0, flash: 0, cam: ARENA_W / 2 - VW / 2, ann: null };
const TMP = mkCanvas(220, 190), TMPX = TMP.getContext('2d');

function resetFX() { FX.parts = []; FX.floats = []; FX.ghosts = []; FX.beams = []; FX.rings = []; FX.shakeT = 0; FX.flash = 0; }

// 이벤트 처리 (호스트/게스트 공통)
function handleEvents(G, list) {
  for (const e of list) {
    const [k, a, b, c, d] = e;
    switch (k) {
      case 'sfx': playSfx(a); break;
      case 'shake': FX.shakeT = Math.max(FX.shakeT, a); FX.shakeI = Math.max(FX.shakeI, b); break;
      case 'spark': spawnSpark(a, b, c); break;
      case 'heal': for (let i = 0; i < 10; i++) FX.parts.push({ k: 'plus', x: a + (Math.random() - 0.5) * 24, y: b + Math.random() * 30, vx: 0, vy: 0.6 + Math.random() * 0.5, life: 30 + Math.random() * 15, c: '#6dff8a' }); break;
      case 'poison': for (let i = 0; i < 8; i++) FX.parts.push({ k: 'bub', x: a + (Math.random() - 0.5) * 22, y: b + Math.random() * 30, vx: (Math.random() - 0.5) * 0.4, vy: 0.5 + Math.random() * 0.6, life: 28 + Math.random() * 14, c: Math.random() < 0.5 ? '#7dff4d' : '#3fbf2a', r: 1 + Math.random() * 2 }); break;
      case 'float': FX.floats.push({ x: a, y: b, t: c, c: d, life: 50 }); break;
      case 'ghost': { const F = G.F[a]; FX.ghosts.push({ c: F.c, x: F.x, y: F.y, f: F.f, pose: poseOf(F, 'dash', G), life: 14, col: CHARS[F.c].color }); break; }
      case 'hack': FX.beams.push({ from: a, life: 50 }); break;
      case 'aura': FX.rings.push({ side: a, kind: b, life: 30 }); break;
      case 'explosion': spawnExplosion(a, b, c); break;
      case 'revive': for (let i = 0; i < 40; i++) FX.parts.push({ k: 'spark', x: a + (Math.random() - 0.5) * 30, y: b + Math.random() * 10, vx: (Math.random() - 0.5) * 1, vy: 1 + Math.random() * 3, life: 40 + Math.random() * 30, c: Math.random() < 0.5 ? '#ffe066' : '#fff6c0' }); FX.flash = 8; break;
      case 'land': { const F = G.F[a]; for (let i = 0; i < 6; i++) FX.parts.push({ k: 'dust', x: F.x + (Math.random() - 0.5) * 20, y: 2, vx: (Math.random() - 0.5) * 1.5, vy: 0.3 + Math.random() * 0.4, life: 16, c: '#d9cbb0', r: 2 + Math.random() * 2 }); break; }
      case 'call': {
        const n = FX.floats.filter((f) => f.call && f.side === a && f.life > 30).length;
        FX.floats.push({ x: G.F[a].x, y: G.F[a].y + 118 * lookOf(G.F[a]).H + n * 11, t: b, c: '#ffffff', life: 55, call: true, side: a });
        break;
      }
      case 'announce': onAnnounce(G, a, b); break;
      default: break;
    }
  }
}

function onAnnounce(G, kind, val) {
  if (kind === 'round') { playSfx('round'); announce(G.round === 5 ? 'Final round' : 'Round ' + ['one', 'two', 'three', 'four', 'five'][G.round - 1]); }
  if (kind === 'fight') { playSfx('fight'); announce('Fight!'); }
  if (kind === 'ko') announce('K.O.');
  if (kind === 'time') announce('Time over');
  if (kind === 'match') {
    const me = APP.mySide;
    if (val === -1) { announce('Draw game'); playJingle('lose'); }
    else if (APP.mode === 'cpu' || APP.mode === 'online') {
      const won = val === me;
      announce(won ? 'You win!' : 'You lose');
      playJingle(won ? 'win' : 'lose');
      if (won) addRecord(G.F[me].c);
    }
    stopMusic();
  }
  if (kind === 'winround' && G.perfect) announce('Perfect!');
}

function spawnSpark(x, y, kind) {
  const col = { hit: ['#fff', '#ffe14d', '#ff9a3c'], big: ['#fff', '#ffe14d', '#ff5a36'], guard: ['#bfe8ff', '#7fc4ff', '#fff'], parry: ['#9fe6ff', '#fff', '#5ac8ff'], immune: ['#fff8c8', '#ffe9a8'], poison: ['#7dff4d', '#3fbf2a'], clash: ['#fff', '#ffe14d', '#9fe6ff'], bamboo: ['#7dcea0', '#2f6b2a'], dust: ['#d9cbb0'] }[kind] || ['#fff'];
  const n = kind === 'big' ? 16 : kind === 'dust' ? 6 : 10;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (kind === 'big' ? 2.5 : 1.6) + Math.random() * 2.5;
    FX.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 10 + Math.random() * 8, c: col[i % col.length] });
  }
  FX.parts.push({ k: 'star', x, y, life: kind === 'big' ? 10 : 7, max: kind === 'big' ? 10 : 7, s: kind === 'big' ? 16 : 11, c: kind === 'guard' || kind === 'parry' ? '#a8dcff' : '#fff7c0' });
}
function spawnExplosion(x, y, f) {
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
    FX.parts.push({ k: 'boom', x: x + f * Math.random() * 60, y: y + (Math.random() - 0.5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 1, life: 20 + Math.random() * 25, c: ['#ff3d00', '#ffab00', '#7dff4d', '#2ecc71'][i % 4], r: 2 + Math.random() * 4 });
  }
  for (let d = 0; d <= 80; d += 20) FX.rings.push({ x: x + f * d, y, life: 24, max: 24, boom: true });
  FX.flash = 10;
}

function updateFX() {
  for (const p of FX.parts) {
    p.x += p.vx || 0; p.y += p.vy || 0; p.life--;
    if (p.k === 'spark' || p.k === 'boom') { p.vx *= 0.9; p.vy = p.vy * 0.9 - 0.15; }
    if (p.k === 'dust') p.vx *= 0.9;
  }
  FX.parts = FX.parts.filter((p) => p.life > 0);
  if (FX.parts.length > 500) FX.parts.splice(0, FX.parts.length - 500);
  for (const f of FX.floats) { f.life--; f.y += f.call ? 0.25 : 0.6; }
  FX.floats = FX.floats.filter((f) => f.life > 0);
  for (const g of FX.ghosts) g.life--;
  FX.ghosts = FX.ghosts.filter((g) => g.life > 0);
  for (const b of FX.beams) b.life--;
  FX.beams = FX.beams.filter((b) => b.life > 0);
  for (const r of FX.rings) r.life--;
  FX.rings = FX.rings.filter((r) => r.life > 0);
  if (FX.shakeT > 0) FX.shakeT--; else FX.shakeI = 0;
  if (FX.flash > 0) FX.flash--;
}

// ---------- 월드 렌더 ----------
function worldToScreen(x, y) { return [x - FX.cam, GROUND - y]; }
// 영역 전개(투명) 중인 캐릭터를 이 화면의 플레이어가 볼 수 있는지 (자기 캐릭터는 반투명으로 보임)
function invisAlpha(F, t) {
  if (!(F.invisT > 0)) return 1;
  if (F.side === APP.mySide && !APP.autoP1) return 0.35;
  return (t % 40) < 2 ? 0.08 : 0;
}

function renderWorld(b, G, t) {
  const [A, Bf] = G.F;
  const target = clamp((A.x + Bf.x) / 2 - VW / 2, 0, ARENA_W - VW);
  FX.cam = lerp(FX.cam, target, 0.18);
  if (Math.abs(FX.cam - target) < 0.2) FX.cam = target;
  const cam = Math.round(FX.cam);
  const hype = G.phase === 'ko' ? 1 : (A.hp < A.maxHp * 0.3 || Bf.hp < Bf.maxHp * 0.3) ? 0.5 : 0;
  drawStage(b, G.stage, cam, t, hype);

  // 죽순
  for (const tr of G.traps) {
    const [sx] = worldToScreen(tr.x, 0);
    const grow = Math.min(1, (tr.age || 0) / 20);
    b.fillStyle = '#145a32'; b.fillRect(sx - 4, GROUND - 2, 8, 3);
    b.fillStyle = tr.o === APP.mySide || APP.mode === 'cpu' && tr.o === 0 ? '#7dcea0' : '#a3e4b8';
    b.beginPath(); b.moveTo(sx - 4, GROUND); b.lineTo(sx, GROUND - 12 * grow); b.lineTo(sx + 4, GROUND); b.fill();
    b.strokeStyle = '#2f6b2a'; b.lineWidth = 1; b.beginPath(); b.moveTo(sx - 2, GROUND - 4 * grow); b.lineTo(sx + 2, GROUND - 4 * grow); b.stroke();
  }
  // 그림자
  for (const F of G.F) {
    if (invisAlpha(F, t) < 0.3) continue;
    const [sx] = worldToScreen(F.x, 0);
    const w = radius(F) * (1.3 - Math.min(0.6, F.y / 120));
    b.fillStyle = 'rgba(0,0,0,0.32)'; b.beginPath(); b.ellipse(sx, GROUND + 1, w, 3, 0, 0, Math.PI * 2); b.fill();
  }
  // 잔상
  for (const g of FX.ghosts) {
    const [sx, sy] = worldToScreen(g.x, g.y);
    b.save(); b.globalAlpha = g.life / 30; b.translate(sx, sy); b.scale(g.f * FSCALE, FSCALE);
    drawCharacter(b, g.c, g.pose, 0, {}); b.restore();
  }
  // 오라 링
  for (const r of FX.rings) {
    if (r.boom) {
      const [sx, sy] = worldToScreen(r.x, r.y), k = 1 - r.life / r.max;
      b.strokeStyle = `rgba(125,255,77,${r.life / r.max})`; b.lineWidth = 3; b.beginPath(); b.arc(sx, sy, 6 + k * 28, 0, Math.PI * 2); b.stroke();
      continue;
    }
    const F = G.F[r.side], [sx, sy] = worldToScreen(F.x, F.y + 50);
    const k = 1 - r.life / 30;
    b.strokeStyle = r.kind === 'force' ? `rgba(255,80,80,${1 - k})` : `rgba(200,120,255,${1 - k})`;
    b.lineWidth = 2; b.beginPath(); b.ellipse(sx, sy, 10 + k * 60, 6 + k * 30, 0, 0, Math.PI * 2); b.stroke();
  }
  // 은맘 (소환물)
  for (const F of G.F) if (F.momHp > 0 && F.momT > 0) drawMom(b, F, t);
  // mola 분신
  for (const F of G.F) if (F.clone) drawClone(b, F, G, t);
  // 캐릭터 (공격 중인 쪽을 위에)
  const order = [...G.F].sort((p, q) => (p.atk ? 1 : 0) - (q.atk ? 1 : 0));
  for (const F of order) drawFighterInGame(b, F, G, t);
  // 해킹 빔
  for (const bm of FX.beams) {
    const S = G.F[bm.from], T = G.F[1 - bm.from];
    const [x0, y0] = worldToScreen(S.x, S.y + 70), [x1, y1] = worldToScreen(T.x, T.y + 70);
    b.font = '6px monospace'; b.fillStyle = '#00ff88';
    for (let i = 0; i < 14; i++) {
      const k = ((i / 14) + (50 - bm.life) * 0.03) % 1;
      b.globalAlpha = Math.min(1, bm.life / 20);
      b.fillText(((i + bm.life) % 3 ? '1' : '0'), lerp(x0, x1, k), lerp(y0, y1, k) + Math.sin(k * 12 + bm.life * 0.3) * 6);
    }
    b.globalAlpha = 1;
    if (bm.life > 25) { b.strokeStyle = 'rgba(0,255,136,0.7)'; b.lineWidth = 1; b.strokeRect(x1 - 14, y1 - 30, 28, 46); }
  }
  // 투사체
  for (const p of G.proj) drawProjectile(b, p, t, G);
  // 파티클
  for (const p of FX.parts) {
    const [sx, sy] = worldToScreen(p.x, p.y);
    switch (p.k) {
      case 'spark': b.fillStyle = p.c; b.fillRect(sx - 1, sy - 1, 2, 2); break;
      case 'boom': b.globalAlpha = Math.min(1, p.life / 20); b.fillStyle = p.c; b.beginPath(); b.arc(sx, sy, p.r, 0, Math.PI * 2); b.fill(); b.globalAlpha = 1; break;
      case 'plus': b.fillStyle = p.c; b.fillRect(sx - 1.5, sy - 0.5, 3, 1); b.fillRect(sx - 0.5, sy - 1.5, 1, 3); break;
      case 'bub': b.strokeStyle = p.c; b.lineWidth = 1; b.beginPath(); b.arc(sx, sy, p.r, 0, Math.PI * 2); b.stroke(); break;
      case 'dust': b.globalAlpha = p.life / 16; b.fillStyle = p.c; b.beginPath(); b.arc(sx, sy, p.r, 0, Math.PI * 2); b.fill(); b.globalAlpha = 1; break;
      case 'flame': b.globalAlpha = Math.min(1, p.life / 12); b.fillStyle = p.c; b.fillRect(sx - p.r / 2, sy - p.r / 2, p.r, p.r); b.globalAlpha = 1; break;
      case 'star': {
        const k = p.life / p.max, s = p.s * (1.2 - k * 0.5);
        b.fillStyle = p.c; b.globalAlpha = k;
        b.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + 0.3, rr = i % 2 ? s * 0.3 : s; b.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
        b.closePath(); b.fill(); b.globalAlpha = 1;
        break;
      }
      default: break;
    }
  }
  // 섬광
  const fl = Math.max(FX.flash, G.flash || 0);
  if (fl > 0) { b.fillStyle = `rgba(255,255,240,${fl / 20})`; b.fillRect(0, 0, VW, VH); }
  // 주사위 연출 중 어둡게
  if (G.dice || G.qte || (G.freezeT > 0 && G.phase === 'fight')) { b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(0, 0, VW, VH); }
}

function drawFighterInGame(b, F, G, t) {
  const vs = visualState(F, G);
  const pose = poseOf(F, vs, G);
  const [sx, sy] = worldToScreen(F.x, F.y);
  const tc = TMPX;
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.clearRect(0, 0, TMP.width, TMP.height);
  tc.save();
  tc.translate(110, 178);
  const sz = F.sz || 1;
  tc.scale(F.f * FSCALE * sz, FSCALE * sz);
  drawCharacter(tc, F.c, pose, F.anim, { look: lookOf(F) });
  tc.restore();
  const alpha = invisAlpha(F, t);
  if (alpha <= 0) { drawSkillFX(b, F, G, t, sx, sy); return; }
  // 색조 효과
  let tint = null;
  if (F.hitFlash > 0) tint = 'rgba(255,255,255,0.85)';
  else if (F.jeongA > 0) tint = `rgba(80,255,220,${0.25 + 0.15 * Math.sin(t * 0.4)})`;
  else if (F.meokT > 0) tint = `rgba(255,240,150,${0.25 + 0.15 * Math.sin(t * 0.5)})`;
  else if (F.manT > 0) tint = `rgba(120,255,150,${0.3 + 0.15 * Math.sin(t * 0.5)})`;
  else if (F.parryT > 0) tint = 'rgba(150,220,255,0.45)';
  else if (F.poisT > 0 && (t >> 3) % 2) tint = 'rgba(80,255,60,0.22)';
  else if (F.angerT > 0 && (t >> 2) % 2) tint = 'rgba(255,60,30,0.35)';
  else if (F.earT > 0 && (t >> 4) % 2) tint = 'rgba(195,139,255,0.18)';
  else if (F.mods.some((m) => m.id === 'form') && (t >> 2) % 2) tint = 'rgba(255,90,180,0.25)';
  else if (F.mods.some((m) => m.id === 'debuff')) tint = 'rgba(60,40,120,0.3)';
  if (tint) { tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = tint; tc.fillRect(0, 0, TMP.width, TMP.height); tc.globalCompositeOperation = 'source-over'; }
  const ox = Math.round(sx - 110), oy = Math.round(sy - 178);
  // 각성/자극제 외곽 광채
  if (F.curseT > 0 && (t % 4) === 0) {
    FX.parts.push({ k: 'flame', x: F.x + (Math.random() - 0.5) * 30, y: F.y + Math.random() * 90, vx: 0, vy: 0.6, life: 18, c: Math.random() < 0.5 ? '#9b30ff' : '#2a0040', r: 2.5 });
    if ((t % 90) === 0) FX.floats.push({ x: F.x + (Math.random() - 0.5) * 30, y: F.y + 110, t: '31.8', c: '#c06bff', life: 50 });
  }
  if (F.awake || F.stimT > 0 || F.spikeT > 0 || F.curseT > 0) {
    b.save(); b.globalAlpha = 0.5 + 0.2 * Math.sin(t * 0.3);
    b.filter = 'none';
    const glow = F.curseT > 0 ? '#7a00ff' : F.awake ? '#c86bff' : F.stimT > 0 ? '#ff3b3b' : '#00e676';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      b.drawImage(silhouette(glow), ox + dx * 1.5, oy + dy * 1.5);
    }
    b.restore();
    if ((t % 3) === 0) FX.parts.push({ k: 'flame', x: F.x + (Math.random() - 0.5) * 24, y: F.y + Math.random() * 80, vx: 0, vy: 0.8, life: 14, c: F.awake ? '#d580ff' : F.stimT > 0 ? '#ff5a3c' : '#5dff9e', r: 2 });
  }
  if (alpha < 1) { b.save(); b.globalAlpha = alpha; b.drawImage(TMP, ox, oy); b.restore(); }
  else b.drawImage(TMP, ox, oy);
  drawSkillFX(b, F, G, t, sx, sy);
  // 상태 아이콘
  const top = sy - 110 * lookOf(F).H * FSCALE * (F.sz || 1);
  if (F.stunT > 0 && !F.ko) {
    for (let i = 0; i < 4; i++) { const a = t * 0.15 + (i * Math.PI) / 2; star(b, sx + Math.cos(a) * 12, top + 2 + Math.sin(a) * 3, 2.5, i % 2 ? '#ffe14d' : '#fff'); }
  }
  if (F.drunkT > 0 && !F.ko && (t % 50) < 25) txt(b, '딸꾹', sx + F.f * 12, top - 2 - (t % 50) * 0.2, 6, '#ffd27f', 'center', FONT_KR2, '#000');
  if ((F.hbT > 0 || F.ttaT > 0) && !F.ko) { b.strokeStyle = '#ff5050'; b.lineWidth = 1.5; b.beginPath(); b.arc(sx - 14, top + 6, 4, 0, Math.PI * 2); b.moveTo(sx - 17, top + 9); b.lineTo(sx - 11, top + 3); b.stroke(); b.fillStyle = '#7dff9a'; b.fillRect(sx - 15, top + 5.5, 2, 1); }
  if (F.rootT > 0 && !F.ko) {
    for (let i = 0; i < 3; i++) { const a = t * 0.12 + (i * Math.PI * 2) / 3; b.fillStyle = '#ffe14d'; star(b, sx + Math.cos(a) * 10, top + 4 + Math.sin(a) * 3, 2.5, '#ffe14d'); }
    b.strokeStyle = '#9aa4b0'; b.lineWidth = 1.5; b.beginPath(); b.ellipse(sx, sy - 2, 14, 4, 0, 0, Math.PI * 2); b.stroke();
  }
  if (F.guardOffT > 0 && !F.ko) { b.fillStyle = '#ff4d4d'; b.fillRect(sx - 5, top - 6, 10, 2); b.save(); b.translate(sx, top - 2); b.rotate(0.6); b.fillRect(-6, -1, 12, 2); b.restore(); }
  if (F.slowT > 0 && !F.ko) { b.fillStyle = '#8fb3ff'; for (let i = 0; i < 3; i++) b.fillRect(sx - 12 - i * 4, sy - 20 - i * 6, 6, 1); }
  if (F.c === 7 && !F.ko && (t % 90) < 40) {
    // 입냄새/발냄새
    b.strokeStyle = 'rgba(160,255,90,0.6)'; b.lineWidth = 1;
    for (let i = 0; i < 2; i++) { const yy = top + 18 + i * 3; b.beginPath(); for (let k = 0; k < 8; k++) b.lineTo(sx + F.f * (10 + k * 2), yy + Math.sin(k + t * 0.2) * 1.5 - (t % 90) * 0.1); b.stroke(); }
  }
  if (F.jeongP > 0) { b.strokeStyle = '#48e0c0'; b.lineWidth = 1; b.beginPath(); b.arc(sx, sy - 50, 30 + Math.sin(t * 0.3) * 2, 0, Math.PI * 2); b.stroke(); }
  if (F.jeongA > 0) { b.strokeStyle = 'rgba(72,224,192,0.8)'; b.lineWidth = 2; b.beginPath(); b.ellipse(sx, sy - 50, 26, 56, 0, 0, Math.PI * 2); b.stroke(); }
  if (F.manT > 0) { b.strokeStyle = 'rgba(120,255,150,0.8)'; b.lineWidth = 1; for (let i = 0; i < 3; i++) { const r = ((t * 2 + i * 15) % 45); b.beginPath(); b.arc(sx, sy - 50, 45 - r, 0, Math.PI * 2); b.stroke(); } }
  // 내 캐릭터 표시 (온라인)
  if (APP.mode === 'online' && F.side === APP.mySide && G.phase !== 'end') {
    b.fillStyle = '#ffe14d'; b.beginPath(); b.moveTo(sx - 4, top - 14); b.lineTo(sx + 4, top - 14); b.lineTo(sx, top - 9); b.fill();
  }
}
// 지속형 스킬 연출 (불, 입냄새, 웃음, KC, 초크 게이지)
function drawSkillFX(b, F, G, t, sx, sy) {
  const H = lookOf(F).H * (F.sz || 1), my = sy - 74 * H * FSCALE, mx = sx + F.f * 16 * H;
  if (F.fireT > 0) {
    for (let i = 0; i < 4; i++) FX.parts.push({ k: 'flame', x: F.x + F.f * (18 + Math.random() * 10), y: F.y + 74 * H, vx: F.f * (3 + Math.random() * 2.5), vy: (Math.random() - 0.4) * 0.8, life: 16 + Math.random() * 10, c: ['#ff3d00', '#ffab00', '#ffe14d', '#ff6d00'][i], r: 3 + Math.random() * 3 });
  }
  if (F.breathN > 0 && (t % 2) === 0) {
    FX.parts.push({ k: 'bub', x: F.x + F.f * 18, y: F.y + 72 * H, vx: F.f * (2 + Math.random() * 1.5), vy: (Math.random() - 0.5) * 0.5, life: 22, c: Math.random() < 0.5 ? '#a8ff60' : '#6dbf2a', r: 2 + Math.random() * 3 });
  }
  if (F.laughT > 0) txt(b, 'ㅋ'.repeat(1 + ((t >> 2) % 4)), mx + F.f * 6, my - 8, 8, '#ff66b3', 'center', FONT_KR, '#000');
  if (F.kcT > 0 && (t % 12) < 8) txt(b, 'K C K C', sx, sy - 120 * H * FSCALE, 6, '#ff66b3', 'center', FONT_EN, '#000');
  if (F.chokeT > 0) {
    const k = clamp(F.chokeN / BAL[5].chokeNeed, 0, 1), w = 40, y0 = sy - 128 * H;
    b.fillStyle = '#000'; b.fillRect(sx - w / 2 - 1, y0 - 1, w + 2, 6);
    b.fillStyle = '#7dff9a'; b.fillRect(sx - w / 2, y0, w * k, 4);
    txt(b, F.side === APP.mySide && APP.mode !== 'cpu' || (APP.mode === 'cpu' && F.side === 0) ? '연타!!' : '탈출 중', sx, y0 - 3, 6, '#fff', 'center', FONT_KR2, '#000');
  }
}
function drawClone(b, F, G, t) {
  const C = F.clone;
  const fake = Object.assign(makeFighter(F.side, F.c), { x: C.x, y: C.y, vx: C.vx, f: C.f, anim: C.anim, hitT: C.hit > 0 ? 1 : 0 });
  const vs = C.hit > 0 ? 'hit' : C.y > 0.5 ? 'jump' : Math.abs(C.vx) > 0.1 ? 'walk' : 'idle';
  const [sx, sy] = worldToScreen(C.x, C.y);
  b.fillStyle = 'rgba(0,0,0,0.32)'; b.beginPath(); b.ellipse(sx, GROUND + 1, radius(F) * 1.2, 3, 0, 0, Math.PI * 2); b.fill();
  b.save(); b.translate(Math.round(sx), Math.round(sy)); b.scale(C.f * FSCALE, FSCALE);
  b.globalAlpha = F.side === APP.mySide && !APP.autoP1 ? 0.55 : (C.t < 90 && (t >> 2) % 2 ? 0.6 : 1);
  drawCharacter(b, F.c, poseOf(fake, vs, G), C.anim, {});
  b.restore();
}
// 은맘: 파마머리 + 앞치마 + 국자를 든 든든한 엄마
function drawMom(b, F, t) {
  const [sx, sy] = worldToScreen(F.x - F.f * 26, 0);
  const f = F.f, bob = Math.sin(t * 0.1) * 1;
  b.save(); b.translate(Math.round(sx), Math.round(sy)); b.scale(f * 1.05, 1.05);
  b.globalAlpha = F.momT < 90 && (t >> 2) % 2 ? 0.5 : 1;
  b.fillStyle = 'rgba(0,0,0,0.3)'; b.beginPath(); b.ellipse(0, 1, 14, 3, 0, 0, Math.PI * 2); b.fill();
  // 다리, 신발
  seg(b, -4, -26, -5, -3, 5, '#e9c09a'); seg(b, 4, -26, 5, -3, 5, '#e9c09a');
  seg(b, -7, -2, -1, -2, 4, '#7a3b5a', false); seg(b, 3, -2, 9, -2, 4, '#7a3b5a', false);
  // 원피스 + 앞치마
  poly(b, [[-12, -27], [12, -27], [9, -58 + bob], [-9, -58 + bob]], '#8e5bb5');
  poly(b, [[-7, -28], [9, -28], [7, -50 + bob], [-5, -50 + bob]], '#ffd1e3');
  b.fillStyle = '#ff7fb0'; b.fillRect(-3, -42 + bob, 6, 5);
  b.strokeStyle = '#ff7fb0'; b.lineWidth = 1; b.beginPath(); b.moveTo(-5, -50 + bob); b.lineTo(-7, -58 + bob); b.moveTo(7, -50 + bob); b.lineTo(8, -58 + bob); b.stroke();
  // 팔 + 국자
  const sw = F.momHp < F.momMax ? Math.sin(t * 0.3) * 0.4 : 0;
  seg(b, -7, -55 + bob, -10, -40 + bob, 4.5, '#8e5bb5');
  seg(b, 7, -55 + bob, 14, -60 + bob - sw * 6, 4.5, '#8e5bb5');
  circ(b, 15, -62 + bob - sw * 6, 2.5, '#e9c09a');
  seg(b, 15, -62 + bob - sw * 6, 20, -76 + bob - sw * 6, 1.5, '#b0b6c0', false);
  ell(b, 21, -78 + bob - sw * 6, 4, 3, '#c9ced6');
  // 얼굴 + 파마머리
  ell(b, 1, -66 + bob, 7, 8, '#f1c8a0');
  b.fillStyle = '#3a2418';
  for (const [x, y, rr] of [[-6, -72], [-3, -76], [2, -77], [6, -74], [-8, -67], [-6, -62], [8, -69]].map((p, i) => [p[0], p[1], 3.2 + (i % 2) * 0.6])) { b.beginPath(); b.arc(x, y + bob, rr, 0, Math.PI * 2); b.fill(); }
  b.fillStyle = '#111'; b.fillRect(3, -67 + bob, 1.5, 1.5);
  b.strokeStyle = '#a0405a'; b.lineWidth = 1; b.beginPath(); b.arc(3.5, -62.5 + bob, 2, 0.2, Math.PI - 0.2); b.stroke();
  b.fillStyle = 'rgba(255,120,150,0.5)'; b.fillRect(5, -64 + bob, 2, 1.5);
  b.restore();
  // 체력바
  const w = 26, k = clamp(F.momHp / F.momMax, 0, 1);
  b.fillStyle = '#000'; b.fillRect(Math.round(sx) - w / 2 - 1, Math.round(sy) - 95, w + 2, 4);
  b.fillStyle = '#ff7fb0'; b.fillRect(Math.round(sx) - w / 2, Math.round(sy) - 94, w * k, 2);
}

const _sil = {};
function silhouette(col) {
  let c = _sil[col];
  if (!c) { c = _sil[col] = mkCanvas(TMP.width, TMP.height); }
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height);
  g.drawImage(TMP, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawProjectile(b, p, t, G) {
  const [sx, sy] = worldToScreen(p.x, p.y);
  const d = sign(p.vx);
  b.save(); b.translate(sx, sy);
  switch (p.t) {
    case 'vacuum': {
      const w = 1 + Math.sin(t * 0.6) * 0.15;
      b.fillStyle = 'rgba(120,200,255,0.35)'; b.beginPath(); b.ellipse(-d * 6, 0, 16 * w, 11, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#9fe0ff'; b.beginPath(); b.ellipse(0, 0, 11 * w, 8, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ffffff'; b.beginPath(); b.ellipse(d * 2, 0, 6, 5, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = '#5ab4ff'; b.lineWidth = 1; for (let i = 0; i < 3; i++) { b.beginPath(); b.moveTo(-d * (10 + i * 5), -6 + i * 6); b.lineTo(-d * (20 + i * 5), -6 + i * 6); b.stroke(); }
      break;
    }
    case 'tooth':
      b.rotate(t * 0.4 * d);
      b.fillStyle = OUT; b.fillRect(-5, -5, 10, 9);
      b.fillStyle = '#fbfbf2'; b.fillRect(-4, -4, 8, 6); b.fillRect(-4, 2, 3, 2); b.fillRect(1, 2, 3, 2);
      b.fillStyle = '#9aa4b0'; b.fillRect(-4, -1, 8, 1);
      break;
    case 'molacut':
      b.strokeStyle = '#ffffff'; b.lineWidth = 3; b.beginPath(); b.arc(-d * 6, 0, 12, -1.1, 1.1, d < 0); b.stroke();
      b.strokeStyle = '#c38bff'; b.lineWidth = 1.5; b.beginPath(); b.arc(-d * 8, 0, 14, -1.1, 1.1, d < 0); b.stroke();
      break;
    case 'bamboo':
      b.fillStyle = OUT; b.fillRect(-14, -3, 28, 6);
      b.fillStyle = '#7dcea0'; b.fillRect(-13, -2, 26, 4);
      b.fillStyle = '#2f6b2a'; b.fillRect(-6, -2, 1, 4); b.fillRect(3, -2, 1, 4);
      b.fillStyle = '#e8f5d0'; b.beginPath(); b.moveTo(d * 13, -2); b.lineTo(d * 19, 0); b.lineTo(d * 13, 2); b.fill();
      break;
    case 'nunchaku':
      b.rotate(t * 0.5);
      b.fillStyle = OUT; b.fillRect(-11, -2.5, 9, 5); b.fillRect(2, -2.5, 9, 5);
      b.fillStyle = '#c0392b'; b.fillRect(-10, -1.5, 7, 3); b.fillRect(3, -1.5, 7, 3);
      b.fillStyle = '#ccc'; b.fillRect(-3, -0.5, 6, 1);
      break;
    case 'gaegura':
      b.fillStyle = OUT; b.fillRect(-15, -9, 30, 15);
      b.fillStyle = '#fff'; b.fillRect(-14, -8, 28, 13);
      b.beginPath(); b.moveTo(-d * 6, 5); b.lineTo(-d * 12, 10); b.lineTo(-d * 2, 5); b.fill();
      b.fillStyle = '#27ae60'; b.font = 'bold 9px sans-serif'; b.textAlign = 'center'; b.fillText('구라!', 0, 3); b.textAlign = 'left';
      break;
    case 'poison':
      b.fillStyle = 'rgba(80,255,60,0.35)'; b.beginPath(); b.arc(0, 0, 8, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#3fbf2a'; b.beginPath(); b.arc(0, 0, 5, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#c8ff9a'; b.fillRect(-2, -3, 2, 2);
      break;
    case 'note': {
      const bob = Math.sin((p.age + p.k * 4) * 0.4) * 3;
      b.translate(0, bob);
      b.fillStyle = OUT; b.beginPath(); b.ellipse(0, 3, 4.5, 3.5, -0.4, 0, Math.PI * 2); b.fill(); b.fillRect(2.5, -9, 2.5, 12);
      b.fillStyle = ['#ff007f', '#ffe14d', '#3df0ff'][(p.k || 1) - 1] || '#ff007f';
      b.beginPath(); b.ellipse(0, 3, 3.5, 2.5, -0.4, 0, Math.PI * 2); b.fill(); b.fillRect(3, -8, 1.5, 11);
      b.fillRect(3, -8, 5, 2);
      break;
    }
    case 'vacuum2': {
      const w = 1.4 + Math.sin(t * 0.6) * 0.2;
      b.fillStyle = 'rgba(80,170,255,0.35)'; b.beginPath(); b.ellipse(-d * 8, 0, 20 * w, 15, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#6fc8ff'; b.beginPath(); b.ellipse(0, 0, 15 * w, 11, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ffffff'; b.beginPath(); b.ellipse(d * 3, 0, 8, 7, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = '#ffe14d'; b.lineWidth = 1.2; for (let i = 0; i < 4; i++) { b.beginPath(); b.moveTo(-d * (14 + i * 5), -9 + i * 6); b.lineTo(-d * (28 + i * 5), -9 + i * 6); b.stroke(); }
      break;
    }
    case 'crystal':
      b.rotate(t * 0.35 * d);
      b.fillStyle = OUT; b.beginPath(); b.moveTo(0, -9); b.lineTo(8, 0); b.lineTo(0, 9); b.lineTo(-8, 0); b.closePath(); b.fill();
      b.fillStyle = '#9ff6ff'; b.beginPath(); b.moveTo(0, -7.5); b.lineTo(6.5, 0); b.lineTo(0, 7.5); b.lineTo(-6.5, 0); b.closePath(); b.fill();
      b.fillStyle = '#ffffff'; b.fillRect(-2, -4, 2, 3);
      b.fillStyle = 'rgba(120,255,240,0.25)'; b.beginPath(); b.arc(0, 0, 12, 0, Math.PI * 2); b.fill();
      break;
    case 'shuttle':
      b.strokeStyle = 'rgba(255,255,255,0.6)'; b.lineWidth = 1; for (let i = 1; i < 4; i++) { b.beginPath(); b.moveTo(-d * i * 8, -2); b.lineTo(-d * (i * 8 + 10), -2); b.stroke(); }
      b.fillStyle = OUT; b.beginPath(); b.moveTo(d * 6, -3); b.lineTo(-d * 7, -6); b.lineTo(-d * 7, 5); b.lineTo(d * 6, 2); b.fill();
      b.fillStyle = '#ffffff'; b.beginPath(); b.moveTo(d * 4, -2); b.lineTo(-d * 6, -5); b.lineTo(-d * 6, 4); b.lineTo(d * 4, 1); b.fill();
      b.fillStyle = '#c0392b'; b.beginPath(); b.arc(d * 5, -0.5, 2.5, 0, Math.PI * 2); b.fill();
      break;
    case 'makgeolli':
      b.rotate(t * 0.3 * d);
      b.fillStyle = OUT; b.beginPath(); b.ellipse(0, 1, 8, 5, 0, 0, Math.PI); b.fill(); b.fillRect(-8, -1, 16, 2);
      b.fillStyle = '#d9c9a3'; b.beginPath(); b.ellipse(0, 1, 7, 4, 0, 0, Math.PI); b.fill();
      b.fillStyle = '#f5f0e0'; b.fillRect(-7, -1, 14, 2);
      b.fillStyle = 'rgba(245,240,224,0.7)'; b.fillRect(-d * 9, -3, 2, 2);
      break;
    case 'fart':
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + t * 0.1;
        b.fillStyle = i % 2 ? 'rgba(120,200,60,0.6)' : 'rgba(170,230,80,0.55)';
        b.beginPath(); b.arc(Math.cos(a) * 6, Math.sin(a) * 4, 7 + (p.age % 10) * 0.2, 0, Math.PI * 2); b.fill();
      }
      break;
    default: break;
  }
  b.restore();
}

// ---------- HUD (2배 해상도로 선명하게) ----------
const FONT_EN = '"Press Start 2P", "Courier New", monospace';
const FONT_KR = '"Black Han Sans", "Do Hyeon", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const FONT_KR2 = '"Do Hyeon", "Black Han Sans", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

function txt(ctx, s, x, y, size, col, align, font, outline) {
  ctx.font = `${size}px ${font || FONT_KR}`;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  if (outline !== 0) { ctx.lineJoin = 'round'; ctx.strokeStyle = outline || '#000'; ctx.lineWidth = Math.max(2, size / 4); ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}
function bigText(ctx, s, x, y, size, c1, c2, font) {
  ctx.font = `${size}px ${font || FONT_EN}`;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = size / 3.2; ctx.strokeText(s, x, y);
  ctx.strokeStyle = '#7a1d00'; ctx.lineWidth = size / 6; ctx.strokeText(s, x, y);
  const gr = ctx.createLinearGradient(0, y - size, 0, y);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.fillStyle = gr; ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

const HPL = [0, 0];  // 체력바 지연 표시
function renderHUD(ctx, G, t) {
  const [A, B] = G.F;
  for (const F of G.F) {
    const s = F.side, r = F.hp / F.maxHp;
    if (HPL[s] < r || G.phase === 'intro') HPL[s] = r; else HPL[s] = Math.max(r, HPL[s] - 0.006);
    const bx = s === 0 ? 30 : 270, bw = 180, by = 10, bh = 10;
    // 바 테두리
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#c9a227'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#3a0a0a'; ctx.fillRect(bx, by, bw, bh);
    const fillW = (v) => bw * clamp(v, 0, 1);
    ctx.fillStyle = '#e8261c';
    if (s === 0) ctx.fillRect(bx + bw - fillW(HPL[0]), by, fillW(HPL[0]), bh); else ctx.fillRect(bx, by, fillW(HPL[1]), bh);
    const low = r < 0.25 && (t >> 3) % 2;
    const gr = ctx.createLinearGradient(0, by, 0, by + bh);
    gr.addColorStop(0, low ? '#ffffff' : '#fff27a'); gr.addColorStop(0.5, low ? '#ffd0d0' : '#ffd400'); gr.addColorStop(1, low ? '#ff8080' : '#d49b00');
    ctx.fillStyle = gr;
    if (s === 0) ctx.fillRect(bx + bw - fillW(r), by, fillW(r), bh); else ctx.fillRect(bx, by, fillW(r), bh);
    if (r > 1) { ctx.fillStyle = (t >> 3) % 2 ? '#7dfcff' : '#3fd8ff'; const ow = fillW(r - 1); if (s === 0) ctx.fillRect(bx + bw - ow, by + 2, ow, bh - 4); else ctx.fillRect(bx, by + 2, ow, bh - 4); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by + 1, bw, 1);
    // 체력 숫자
    txt(ctx, `${Math.ceil(F.hp)}/${F.maxHp}`, s === 0 ? bx + bw - 2 : bx + 2, by + 8.5, 7, '#fff', s === 0 ? 'right' : 'left', FONT_EN, '#000');
    // 초상화
    const px = s === 0 ? 14 : 466;
    ctx.fillStyle = '#000'; ctx.fillRect(px - 13, 4, 26, 26);
    ctx.fillStyle = CHARS[F.c].color; ctx.fillRect(px - 12, 5, 24, 24);
    ctx.save(); ctx.beginPath(); ctx.rect(px - 12, 5, 24, 24); ctx.clip();
    drawPortrait(ctx, F.c, px + (s === 0 ? -1 : 1), 20, 1.25, s === 0 ? 1 : -1, F.hitT > 0 ? 'hurt' : 'n', t);
    ctx.restore();
    // 이름 + 국기
    const nx = s === 0 ? 30 : 450;
    txt(ctx, CHARS[F.c].name, nx, 32, 9, '#fff', s === 0 ? 'left' : 'right');
    drawFlag(ctx, CHARS[F.c].country, s === 0 ? 30 + measure(ctx, CHARS[F.c].name, 9) + 4 : 450 - measure(ctx, CHARS[F.c].name, 9) - 16, 25, 12, 8);
    if (APP.mode === 'online') {
      const lab = s === APP.mySide ? (ACC.token ? ACC.nick : 'YOU') : (NET.oppNick || 'RIVAL');
      txt(ctx, (s === APP.mySide ? '▶ ' : '') + lab, s === 0 ? bx + bw - 28 : bx + 28, 32, 7, s === APP.mySide ? '#ffe14d' : '#9fd0ff', s === 0 ? 'right' : 'left', FONT_KR2);
    }
    // 라운드 승리 표시
    for (let i = 0; i < WIN_ROUNDS; i++) {
      const wx = s === 0 ? bx + bw - 8 - i * 10 : bx + 8 + i * 10;
      const won = F.wins > i;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(wx, 27 + 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = won ? '#ffd400' : '#444'; ctx.beginPath(); ctx.arc(wx, 27, 3, 0, Math.PI * 2); ctx.fill();
      if (won) { ctx.fillStyle = '#7a1d00'; ctx.font = `5px ${FONT_EN}`; ctx.textAlign = 'center'; ctx.fillText('V', wx, 29); ctx.textAlign = 'left'; }
    }
    drawSkillBoxes(ctx, F, s, t);
    drawStatus(ctx, F, s, t);
  }
  // 타이머
  const sec = Math.max(0, Math.ceil(G.timer / SEC));
  ctx.fillStyle = '#000'; ctx.fillRect(222, 5, 36, 24);
  ctx.fillStyle = '#1b1b3a'; ctx.fillRect(223, 6, 34, 22);
  txt(ctx, String(Math.min(99, sec)).padStart(2, '0'), 240, 25, 16, sec <= 10 && (t >> 4) % 2 ? '#ff4d4d' : '#ffe14d', 'center', FONT_EN, '#000');
  // 알림
  G.notes.forEach((n, i) => {
    const a = Math.min(1, n.life / 20), y = 84 + i * 12;
    ctx.globalAlpha = a;
    txt(ctx, n.t, 240, y, 8.5, n.c, 'center', FONT_KR2, '#000');
    ctx.globalAlpha = 1;
  });
  // 콤보
  for (const F of G.F) {
    if (G.phase === 'fight' && F.comboShowT > 0 && F.combo_recv >= 2) {
      const left = F.side === 1;
      const x = left ? 12 : 468;
      txt(ctx, `${F.combo_recv} HITS`, x, 96, 12, '#ffe14d', left ? 'left' : 'right', FONT_EN, '#7a1d00');
      txt(ctx, 'COMBO!', x, 108, 7, '#fff', left ? 'left' : 'right', FONT_EN, '#000');
    }
  }
  // 플로팅 텍스트
  for (const f of FX.floats) {
    const [sx, sy] = worldToScreen(f.x, f.y);
    ctx.globalAlpha = Math.min(1, f.life / 15);
    if (f.call) txt(ctx, f.t, sx, sy, 8, CHARS[G.F[f.side].c].color === '#2c3e50' ? '#9fc3e6' : '#fff', 'center', FONT_KR, '#000');
    else txt(ctx, f.t, sx, sy, f.t.length > 3 ? 7 : 9, f.c, 'center', /[가-힣]/.test(f.t) ? FONT_KR : FONT_EN, '#000');
    ctx.globalAlpha = 1;
  }
  // 주사위 / 윷 / 패드립 배틀
  if (G.dice) drawDice(ctx, G.dice, t);
  if (G.yut) drawYut(ctx, G.yut, t);
  if (G.qte) drawQTE(ctx, G, t);
  // 아나운서
  drawAnnouncer(ctx, G, t);
}
function measure(ctx, s, size) { ctx.font = `${size}px ${FONT_KR}`; return ctx.measureText(s).width; }

function drawSkillBoxes(ctx, F, s, t) {
  for (let k = 0; k < 4; k++) {
    const def = skillDef(F.c, k);
    const w = 88, h = 10, col = k % 2, row = k >> 1;
    const x = s === 0 ? 30 + col * (w + 4) : 450 - w - col * (w + 4), y = 37 + row * 12;
    const sealed = F.seal[k] > 0;
    const isCopy = F.c === HINCHAM && k === 0 && F.copy;
    const cd = sealed ? F.seal[k] : F.cd[k];
    const maxCd = Math.max(SLOT_CD[k] * SEC, cd || 0);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    if (!def) {
      ctx.fillStyle = '#15182a'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#6b6f86'; ctx.fillRect(x, y, 9, h);
      txt(ctx, SLOT_KEYS[k], x + 4.5, y + 8, 6.5, '#15182a', 'center', FONT_EN, 0);
      txt(ctx, '비어 있음', x + 12, y + 8, 7, '#6b6f86', 'left', FONT_KR2, 0);
      continue;
    }
    ctx.fillStyle = sealed ? '#4a0e0e' : isCopy ? '#003d22' : '#1c2340'; ctx.fillRect(x, y, w, h);
    if (!sealed && cd > 0) { ctx.fillStyle = '#3a3f60'; ctx.fillRect(x, y, w * clamp(1 - cd / maxCd, 0, 1), h); }
    else if (!sealed) { ctx.fillStyle = isCopy ? '#00a86b' : (t >> 4) % 2 ? '#2b6cb0' : '#2f7fd0'; ctx.fillRect(x, y, w, h); }
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(x, y, 9, h);
    txt(ctx, SLOT_KEYS[k], x + 4.5, y + 8, 6.5, '#000', 'center', FONT_EN, 0);
    let label = isCopy ? '복제:' + skillDef(F.copy.c, F.copy.s).name : def.name;
    if (k === 1 && F.c === 8 && F.board) label = '보드 탑승중';
    const lab = label.length > 9 ? label.slice(0, 8) + '…' : label;
    txt(ctx, lab, x + 12, y + 8, 7.5, sealed ? '#ff8080' : '#fff', 'left', FONT_KR2, 0);
    if (sealed) txt(ctx, '🔒' + Math.ceil(cd / SEC), x + w - 2, y + 8, 6.5, '#ffb0b0', 'right', FONT_EN, 0);
    else if (cd > 0) txt(ctx, Math.ceil(cd / SEC) + '', x + w - 2, y + 8, 6.5, '#ffe14d', 'right', FONT_EN, 0);
  }
}

function drawStatus(ctx, F, s, t) {
  const tags = [];
  if (F.poisT > 0) tags.push(['독', '#7dff4d']);
  if (F.rootT > 0) tags.push(['구속', '#ffe14d']);
  if (F.stimT > 0) tags.push(['흡혈', '#ff6b6b']);
  if (F.meokT > 0) tags.push(['먹부림', '#ffe9a8']);
  if (F.manT > 0) tags.push(['만물포용', '#7dff9a']);
  if (F.jeongP > 0) tags.push(['正義 준비', '#48e0c0']);
  if (F.jeongA > 0) tags.push(['正義', '#48e0c0']);
  if (F.board) tags.push(['보드', '#ff66b3']);
  if (F.awake) tags.push(['가오 각성', '#d580ff']);
  if (F.guardOffT > 0) tags.push(['가드불가', '#ff5050']);
  if (F.slowT > 0) tags.push(['감속', '#8fb3ff']);
  if (F.boostT > 0) tags.push(['이속↑', '#ffb347']);
  if (F.spikeT > 0) tags.push(['피해-10%', '#00e676']);
  if (F.momHp > 0 && F.momT > 0) tags.push([`은맘 ${Math.ceil(F.momHp)}/${Math.ceil(F.momMax)}`, '#ff8fb3']);
  if (F.curseT > 0) tags.push([`31.8의 저주 ${Math.ceil(F.curseT / SEC)}s`, '#c06bff']);
  if (F.c === TIRON) tags.push(['고통 ' + F.pain + '/' + BAL[11].painMax, '#ff9f43']);
  if (F.c === 2 && !F.revived) tags.push(['부활 대기', '#f5c542']);
  if (F.mul > 1.001) tags.push(['공격 +' + Math.round((F.mul - 1) * 100) + '%', '#ff7b3b']);
  if (F.stunT > 0) tags.push(['기절', '#ffe14d']);
  if (F.drunkT > 0) tags.push(['취함 ' + Math.ceil(F.drunkT / SEC) + 's', '#ffd27f']);
  if (F.hbT > 0) tags.push(['회복불가', '#ff6b6b']);
  if (F.ttaT > 0) tags.push(['ㄸ방해 ' + Math.ceil(F.ttaT / SEC) + 's', '#ff9f43']);
  if (F.earT > 0) tags.push(['귀마개 ' + Math.ceil(F.earT / SEC) + 's', '#c38bff']);
  if (F.invisT > 0) tags.push(['영역 전개', '#f5c542']);
  if (F.kcT > 0) tags.push(['KC ' + Math.ceil(F.kcT / SEC) + 's', '#ff66b3']);
  if (F.clone) tags.push(['분신 ' + Math.ceil(F.clone.hp), '#c38bff']);
  if (F.c === 7) tags.push(['불쾌지수 ' + F.stk, '#a8ff60']);
  if (F.yank) tags.push(['양크', '#ff9f43']);
  if (F.c === 4 && F.ddFree) tags.push(['더블다운 1회 더', '#ffb36b']);
  for (const m of F.mods) {
    const lab = { focus: '공속↑', debuff: '능력치-20%', rage: '반장의 분노', pen: '벌점', leg1: '다리 회복', grow1: '거대화', form: '폼 미쳤다', burp: '트름 공격↑' }[m.id];
    if (lab) tags.push([lab + (m.t < 1e8 ? ' ' + Math.ceil(m.t / SEC) + 's' : ''), m.id === 'debuff' || m.id === 'pen' ? '#9f8fff' : '#ffb347']);
  }
  if ((F.pm || 1) > 1.001) tags.push(['패시브 +' + Math.round((F.pm - 1) * 100) + '%', '#ffb3e6']);
  let x = s === 0 ? 30 : 450;
  for (const [label, col] of tags) {
    ctx.font = `7px ${FONT_KR2}`;
    const w = ctx.measureText(label).width + 6;
    const bx = s === 0 ? x : x - w;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx, 62, w, 9);
    txt(ctx, label, bx + 3, 69, 7, col, 'left', FONT_KR2, 0);
    x += s === 0 ? w + 2 : -(w + 2);
  }
}

function drawDice(ctx, d, t) {
  const v = d.val, x = 240, y = 150, s = 34 + (d.t > 0 ? Math.sin(t) * 2 : 0);
  ctx.save(); ctx.translate(x, y); if (d.t > 0) ctx.rotate(Math.sin(t * 0.7) * 0.3);
  ctx.fillStyle = '#000'; ctx.fillRect(-s / 2 - 2, -s / 2 - 2, s + 4, s + 4);
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(-s / 2, -s / 2, s, s);
  const pip = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v] || [];
  ctx.fillStyle = v === 1 ? '#d32f2f' : '#111';
  for (const [a, b2] of pip) { ctx.beginPath(); ctx.arc(a * s * 0.27, b2 * s * 0.27, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  txt(ctx, '하츠 스테리오!', 240, 124, 11, '#ffcc33', 'center');
  if (d.t === 0) txt(ctx, `${d.res} x ${BAL[4].dicePer} = ${d.res * BAL[4].dicePer}`, 240, 185, 12, '#fff', 'center', FONT_EN);
}

function drawYut(ctx, y, t) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(150, 100, 180, 100);
  txt(ctx, '모 아니면 도!', 240, 118, 12, '#00e676', 'center');
  for (let i = 0; i < 4; i++) {
    ctx.save();
    const fly = y.t > 0;
    ctx.translate(198 + i * 28, 152 + (fly ? Math.sin(t * 0.5 + i) * 12 : 0));
    ctx.rotate(fly ? t * 0.3 + i : 0.1 * (i - 1.5));
    const flat = fly ? (t + i * 3) % 8 < 4 : y.res === 5 ? true : i > 0;
    ctx.fillStyle = '#000'; ctx.fillRect(-5, -16, 10, 32);
    ctx.fillStyle = flat ? '#f5deb3' : '#a0522d'; ctx.fillRect(-4, -15, 8, 30);
    if (!flat) { ctx.fillStyle = '#5d2e0f'; for (let k = -10; k <= 10; k += 10) ctx.fillRect(-2, k - 1, 4, 2); }
    ctx.restore();
  }
  if (y.t === 0) {
    if (y.res === 5) bigText(ctx, '모!!!', 240, 196, 18, '#fffbe0', '#ffb000', FONT_KR);
    else bigText(ctx, '도...', 240, 196, 14, '#ffffff', '#888888', FONT_KR);
  }
}
function drawQTE(ctx, G, t) {
  const q = G.qte;
  ctx.fillStyle = 'rgba(30,0,0,0.45)'; ctx.fillRect(0, 98, VW, 96);
  txt(ctx, `🔥 패드립 배틀 ${Math.min(q.i + 1, q.n)} / ${q.n} 🔥`, 240, 112, 11, '#ff9f43', 'center');
  txt(ctx, String(q.wins[0]), 150, 150, 22, G.F[0].side === APP.mySide ? '#ffe14d' : '#fff', 'center', FONT_EN);
  txt(ctx, String(q.wins[1]), 330, 150, 22, G.F[1].side === APP.mySide ? '#ffe14d' : '#fff', 'center', FONT_EN);
  if (q.st === 'wait') txt(ctx, (t >> 3) % 2 ? '준비...' : '', 240, 148, 14, '#fff', 'center');
  else if (q.st === 'show') {
    const k = Math.min(1, q.t / 6), sc = 1 + (1 - k) * 0.8;
    ctx.save(); ctx.translate(240, 152); ctx.scale(sc, sc);
    ctx.fillStyle = '#000'; ctx.fillRect(-26, -34, 52, 48); ctx.fillStyle = '#ffe14d'; ctx.fillRect(-24, -32, 48, 44);
    bigText(ctx, q.L, 0, 2, 30, '#ffffff', '#ff3d00');
    ctx.restore();
    const me = APP.mySide;
    if (q.lock[me] > 0) txt(ctx, '틀렸다! 잠시 입력 불가', 240, 182, 8, '#ff7b7b', 'center', FONT_KR2);
    else txt(ctx, document.body.classList.contains('touch') ? '화면을 터치!' : `키보드 ${q.L} 를 눌러라!`, 240, 182, 8, '#fff', 'center', FONT_KR2);
  } else {
    const w = q.last;
    txt(ctx, w < 0 ? '시간 초과!' : `${CHARS[G.F[w].c].name} 승! (-${BAL[2].qteDmg} / +${BAL[2].qteHeal})`, 240, 150, 12, w < 0 ? '#aaa' : '#7dff9a', 'center');
  }
}

function drawAnnouncer(ctx, G, t) {
  const p = G.phase, pt = G.pt;
  if (p === 'intro') {
    if (pt < 75) {
      const k = Math.min(1, pt / 10);
      ctx.save(); ctx.translate(240, 128); ctx.scale(k, k);
      bigText(ctx, G.round === 5 ? 'FINAL ROUND' : `ROUND ${G.round}`, 0, 0, 24, '#ffffff', '#ffb000');
      ctx.restore();
      txt(ctx, STAGE_DEF[G.stage].name, 240, 150, 9, '#fff', 'center');
    } else {
      const k = 1 + Math.max(0, (85 - pt) / 10);
      ctx.save(); ctx.translate(240, 134); ctx.scale(k, k);
      bigText(ctx, 'FIGHT!', 0, 0, 30, '#fff6a0', '#ff3d00');
      ctx.restore();
    }
  } else if (p === 'ko') {
    if (pt < 90) {
      const k = pt < 8 ? 2 - pt / 8 : 1;
      ctx.save(); ctx.translate(240, 134); ctx.scale(k, k);
      if (G.koType === 'KO') bigText(ctx, 'K.O.', 0, 0, 40, '#ffffff', '#ff2a00');
      else bigText(ctx, 'TIME OVER', 0, 0, 22, '#ffffff', '#ffb000');
      ctx.restore();
    } else if (pt > 100) {
      if (G.rw === -1) bigText(ctx, 'DRAW', 240, 120, 22, '#ffffff', '#aaaaaa');
      else {
        bigText(ctx, `${CHARS[G.F[G.rw].c].en} WINS`, 240, 120, CHARS[G.F[G.rw].c].en.length > 9 ? 14 : 18, '#ffffff', G.rw === APP.mySide ? '#ffd400' : '#9fc3ff');
        txt(ctx, `${CHARS[G.F[G.rw].c].name} 라운드 승리!`, 240, 140, 11, '#fff', 'center');
      }
      if (G.perfect) bigText(ctx, 'PERFECT', 240, 168, 18, '#fffbe0', '#ff8c00');
    }
  }
}
