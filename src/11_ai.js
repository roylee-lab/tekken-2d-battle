// ============================================================
//  CPU 인공지능
// ============================================================
const DIFF = {
  0: { name: '쉬움', block: 0.3, interval: 22, aggr: 0.45, skill: 0.25 },
  1: { name: '보통', block: 0.6, interval: 14, aggr: 0.6, skill: 0.4 },
  2: { name: '어려움', block: 0.85, interval: 8, aggr: 0.75, skill: 0.55 },
};

// 스킬별 AI 사용 조건 (dist = 거리, F = 자신, O = 상대)
const close = (F, O, extra) => Math.abs(O.x - F.x) <= radius(F) + radius(O) + extra;
const helpless = (O) => O.hitT > 0 || O.stunT > 0 || O.rootT > 0 || O.chokeT > 0;
const AI_SKILL = {
  0: [(F, O, d) => d > 70 && d < 240, (F, O, d) => d < 120, (F, O, d) => d < 150, (F, O, d) => d > 60 && d < 240],
  1: [(F, O, d) => d < 140, (F, O, d) => d > 70 && d < 230, (F, O, d) => d < 200, (F, O, d) => true],
  2: [(F, O, d) => d > 95 && d < 260, () => false, (F, O, d) => true, (F, O, d) => d < 200],
  3: [(F, O, d) => d > 50 && d < 190, (F, O, d) => d < 90, (F, O, d) => d > 50 && d < 230, (F, O, d) => d < 220 && (helpless(O) || O.atk || O.castT > 0)],
  4: [(F, O, d) => F.hp < F.maxHp * 0.9, (F, O, d) => true, (F, O, d) => d < 220, (F, O, d) => d < 200],
  5: [(F, O, d) => d < 210, (F, O, d) => F.hp < F.maxHp * 0.55 && d > 90, (F, O, d) => d > 40 && d < 170, (F, O, d) => close(F, O, 18)],
  6: [(F, O, d) => O.atk && d < 90, (F, O, d) => F.hp < F.maxHp * 0.75 && d < 100, (F, O, d) => true, (F, O, d) => F.hp < F.maxHp * 0.6],
  7: [(F, O, d) => d < 180, (F, O, d) => O.poisT <= 0 && d < 230, (F, O, d) => close(F, O, 45), (F, O, d) => F.stk >= 4 && d < 160],
  8: [(F, O, d) => d > 60 && d < 210, (F, O, d) => !F.board, (F, O, d) => close(F, O, 10) && (helpless(O) || rnd() < 0.35), (F, O, d) => true],
  9: [(F, O, d) => d < 170, (F, O, d) => d < 140, (F, O, d) => d < 150, (F, O, d) => true],
  10: [(F, O, d) => d < 140, (F, O, d) => d < 78, (F, O, d) => d < 200, (F, O, d) => d > 60 && d < 260],
  11: [(F, O, d) => d < 220, (F, O, d) => d < 140, (F, O, d) => true, (F, O, d) => close(F, O, 90)],
  12: [(F, O, d) => d < 66, (F, O, d) => (F.copy ? d < 190 : true), (F, O, d) => d < 180, (F, O, d) => true],
  13: [(F, O, d) => close(F, O, 22), (F, O, d) => d > 50 && d < 220, (F, O, d) => d < 150 && F.hp > 20, (F, O, d) => d < 170],
  14: [(F) => F.poisT > 0 || F.shingT > 0 || F.rootT > 0 || F.slowT > 0 || F.drunkT > 0 || F.hbT > 0 || F.ttaT > 0 || F.guardOffT > 0 || F.seal.some((v) => v > 0) || F.mods.some((m) => m.v < 1 && m.k !== 'size'),
    (F, O, d) => d > 50 && d < 240 && O.shingT <= 0, (F, O, d) => d < 170, (F, O, d) => true],
  15: [(F, O, d) => d < 140, (F, O, d) => d > 60 && d < 260, (F, O, d) => d < 200, (F, O, d) => d < 260],
};
const MASH = [5, 7, 9];          // AI 연타 속도 (초당)
const QTE_REACT = [[45, 35], [32, 24], [22, 18]];   // AI 글자 반응 (최소, 랜덤 폭) 프레임

function makeAIMem() { return { t: 10, plan: 'wait', planT: 0, guardT: 0, reacted: false, prevH: 0, atkCad: 0, mash: 0, qL: '', qAt: 0, ghostX: 0, ghostT: 0 }; }
function aiMash(mem, diffLv) { mem.mash += MASH[diffLv] / 60; const n = Math.floor(mem.mash); mem.mash -= n; return n; }

function aiInput(G, F, O, mem, diffLv) {
  const D = DIFF[diffLv] || DIFF[1];
  let h = 0, p = 0, keys = '', a = 0;
  if (G.phase !== 'fight') { mem.prevH = 0; return { h: 0, p: 0 }; }
  // 패드립 배틀: 글자 보고 반응
  if (G.qte) {
    const q = G.qte;
    if (q.st === 'show') {
      if (mem.qL !== q.L + q.i) { mem.qL = q.L + q.i; const r = QTE_REACT[diffLv] || QTE_REACT[1]; mem.qAt = r[0] + Math.floor(rnd() * r[1]); }
      if (q.t === mem.qAt) keys = rnd() < 0.06 ? QTE_KEYS[Math.floor(rnd() * QTE_KEYS.length)] : q.L;
    }
    return { h: 0, p: 0, keys, a: 0 };
  }
  // 초크 탈출 연타
  if (F.chokeT > 0) return { h: 0, p: 0, keys: '', a: aiMash(mem, diffLv) };
  // KC 연타
  if (F.kcT > 0) { const n = aiMash(mem, diffLv); keys = n ? (F.kcT % 2 ? 'K' : 'C').repeat(n) : ''; }
  // 보이지 않는 상대(영역 전개)는 대략적인 위치만 추측
  let ox = faceX(F, O);
  if (O.invisT > 0) {
    if (--mem.ghostT <= 0) { mem.ghostT = 30; mem.ghostX = O.x + (rnd() - 0.5) * 140; }
    ox = mem.ghostX;
  }
  const dx = ox - F.x, dist = Math.abs(dx);
  const toward = dx > 0 ? B_R : B_L, away = dx > 0 ? B_L : B_R;

  // --- 위협 감지 ---
  const pRange = radius(F) + radius(O) + reachOf(F, 'P') - 14;
  const kRange = radius(F) + radius(O) + reachOf(F, 'K') - 14;
  const oRange = radius(F) + radius(O) + reachOf(O, O.atk === 'K' ? 'K' : 'P');
  const meleeThreat = O.invisT <= 0 && O.atk && O.atkT < O.atkAct + 1 && dist < oRange + 8;
  // 힙찔 웃음: 알아채면 (난이도별 확률, 한 번만 판정) 뒤로 빠짐
  if (O.laughT > 0) {
    if (mem.laughSeen !== O.anim - (BAL[8].laughWind - O.laughT)) { mem.laughSeen = O.anim - (BAL[8].laughWind - O.laughT); mem.laughDodge = rnd() < D.block * 0.8; }
    if (mem.laughDodge && Math.abs(O.x - F.x) < radius(F) + radius(O) + 40) { h |= (O.x > F.x ? B_L : B_R); return { h, p, keys, a }; }
  }
  // 위험한 스킬 피하기 (플라잉/돌진/스매시/불)
  if (rnd() < D.block + 0.1) {
    const realD = Math.abs(O.x - F.x);

    if (O.flyT > 0 && O.flyT < 30 && Math.abs(O.flyX - F.x) < 70) { h |= (O.flyX > F.x ? B_L : B_R); return { h, p, keys, a }; }
    if ((O.shutT > 0 || O.rushT2 > 0) && F.y <= 0) { h |= B_D; return { h, p, keys, a }; }
    if (O.fireT > 0 && realD < 150) { h |= (O.x > F.x ? B_L : B_R); return { h, p, keys, a }; }
    if (O.bomb && O.bomb.fuse > 0 && Math.abs(O.bomb.x - F.x) < BAL[15].bombR + 40) { h |= (O.bomb.x > F.x ? B_L : B_R); if (F.y <= 0 && rnd() < 0.05) p |= B_U; return { h, p, keys, a }; }
  }
  // 개미가 가까이 오면 펀치로 처치
  if (O.ants && O.ants.length && !F.atk && F.y <= 0) {
    const near = O.ants.some((x) => Math.abs(x - F.x) <= radius(F) + reachOf(F, 'P') && sign(x - F.x) === F.f);
    if (near && rnd() < D.aggr * 0.5) { p |= B_P; mem.prevH = h; return { h, p, keys, a }; }
  }
  const projThreat = G.proj.find((q) => q.o === O.side && sign(F.x - q.x) === sign(q.vx) && Math.abs(F.x - q.x) < 85);
  if (mem.guardT > 0) {
    mem.guardT--; h |= B_D;
  } else if ((meleeThreat || projThreat) && !mem.reacted) {
    mem.reacted = true;
    if (rnd() < D.block) {
      if (F.c === 2 && F.parryR <= 0 && F.cd[1] <= 0 && F.seal[1] <= 0 && meleeThreat && rnd() < 0.7) p |= B_S2;          // JJjin 패링
      else if (F.c === 6 && F.cd[0] <= 0 && F.seal[0] <= 0 && rnd() < 0.5) p |= B_S1;   // 안거녕 먹부림
      else if (projThreat && F.c === 6) { /* 투사체 무적 */ }
      else if (projThreat && rnd() < 0.35 && F.rootT <= 0) { p |= B_U; h |= toward; }
      else { mem.guardT = meleeThreat ? 16 : 22; h |= B_D; }
    }
  }
  if (!meleeThreat && !projThreat) mem.reacted = false;
  if (h & B_D) { mem.prevH = h; return { h, p, keys, a }; }

  // --- 계획 수립 ---
  mem.t--;
  if (mem.t <= 0) {
    mem.t = D.interval + Math.floor(rnd() * D.interval);
    const r = rnd();
    // 스킬 사용 시도
    const slots = [0, 1, 2, 3].filter((s) => {
      if (!skillDef(F.c, s) || !AI_SKILL[F.c][s]) return false;
      const ready = (F.cd[s] <= 0 && F.seal[s] <= 0) || (s === 1 && F.c === HINCHAM && F.copy);
      return ready && AI_SKILL[F.c][s](F, O, dist);
    });
    if (slots.length && r < D.skill) {
      p |= B_SK[slots[Math.floor(rnd() * slots.length)]];
      if (F.c === 2 && (p & B_S1)) h |= toward;
      mem.plan = 'wait'; mem.planT = 6;
    } else if (dist > 150) {
      mem.plan = rnd() < 0.85 ? 'approach' : 'jumpin'; mem.planT = 30;
    } else if (dist > kRange) {
      const q = rnd();
      mem.plan = q < D.aggr ? 'approach' : q < D.aggr + 0.15 ? 'jumpin' : q < 0.92 ? 'retreat' : 'wait';
      mem.planT = 24;
    } else {
      const q = rnd();
      mem.plan = q < D.aggr + 0.15 ? 'attack' : q < 0.9 ? 'retreat' : 'wait';
      mem.planT = 20;
    }
  }
  // --- 계획 실행 ---
  if (mem.planT > 0) mem.planT--;
  switch (mem.plan) {
    case 'approach':
      h |= toward;
      if (dist < kRange) mem.plan = 'attack';
      break;
    case 'retreat': h |= away; break;
    case 'jumpin':
      if (F.y <= 0) { p |= B_U; h |= toward; mem.plan = 'airatk'; }
      break;
    case 'airatk':
      h |= toward;
      if (F.y > 10 && dist < kRange) { p |= O.mallangT > 0 ? B_P : B_K; mem.plan = 'attack'; }
      if (F.y <= 0 && F.vy === 0 && mem.planT <= 0) mem.plan = 'wait';
      break;
    case 'attack':
      if (dist > kRange) h |= toward;
      else {
        mem.atkCad--;
        if (mem.atkCad <= 0 && !F.atk) {
          p |= O.mallangT > 0 ? B_P : dist > pRange ? B_K : rnd() < 0.7 ? B_P : B_K;   // 말랑뱃살에는 킥 금지
          mem.atkCad = 4 + Math.floor(rnd() * (diffLv === 2 ? 4 : 12));
        }
      }
      if (mem.planT <= 0) mem.plan = 'wait';
      break;
    default: break;
  }
  mem.prevH = h;
  return { h, p, keys, a };
}
