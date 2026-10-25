// ============================================================
//  CPU 인공지능
// ============================================================
const DIFF = {
  0: { name: '쉬움', block: 0.3, interval: 22, aggr: 0.45, skill: 0.25 },
  1: { name: '보통', block: 0.6, interval: 14, aggr: 0.6, skill: 0.4 },
  2: { name: '어려움', block: 0.85, interval: 8, aggr: 0.75, skill: 0.55 },
};

// 스킬별 AI 사용 조건 (dist = 거리, F = 자신, O = 상대)
const AI_SKILL = {
  0: [(F, O, d) => d > 70 && d < 240, (F, O, d) => d < 120],
  1: [(F, O, d) => d < 140, (F, O, d) => d > 70 && d < 230],
  2: [(F, O, d) => d > 95 && d < 260, () => false],
  3: [(F, O, d) => d > 50 && d < 190, (F, O, d) => d < 90],
  4: [(F, O, d) => F.hp < F.maxHp * 0.9, (F, O, d) => true],
  5: [(F, O, d) => d < 210, (F, O, d) => F.hp < F.maxHp * 0.55 && d > 90],
  6: [(F, O, d) => O.atk && d < 90, (F, O, d) => F.hp < F.maxHp * 0.75 && d < 100],
  7: [(F, O, d) => d < 180, (F, O, d) => O.poisT <= 0 && d < 230],
  8: [(F, O, d) => d > 60 && d < 210, (F, O, d) => !F.board],
  9: [(F, O, d) => d < 170, (F, O, d) => d < 140],
  10: [(F, O, d) => d < 140, (F, O, d) => d < 78],
  11: [(F, O, d) => d < 220, (F, O, d) => d < 140],
  12: [(F, O, d) => (F.copy ? d < 190 : true), (F, O, d) => d < 62],
};

function makeAIMem() { return { t: 10, plan: 'wait', planT: 0, guardT: 0, reacted: false, prevH: 0, atkCad: 0 }; }

function aiInput(G, F, O, mem, diffLv) {
  const D = DIFF[diffLv] || DIFF[1];
  let h = 0, p = 0;
  if (G.phase !== 'fight') { mem.prevH = 0; return { h: 0, p: 0 }; }
  const dx = O.x - F.x, dist = Math.abs(dx);
  const toward = dx > 0 ? B_R : B_L, away = dx > 0 ? B_L : B_R;

  // --- 위협 감지 ---
  const pRange = radius(F) + radius(O) + ATK.pReach * lookOf(F).H - 14;
  const kRange = radius(F) + radius(O) + ATK.kReach * lookOf(F).H - 14;
  const oRange = radius(F) + radius(O) + (O.atk === 'K' ? ATK.kReach : ATK.pReach) * lookOf(O).H;
  const meleeThreat = O.atk && O.atkT < O.atkAct + 1 && dist < oRange + 8;
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
  if (h & B_D) { mem.prevH = h; return { h, p }; }

  // --- 계획 수립 ---
  mem.t--;
  if (mem.t <= 0) {
    mem.t = D.interval + Math.floor(rnd() * D.interval);
    const r = rnd();
    // 스킬 사용 시도
    const slots = [0, 1].filter((s) => {
      const ready = (F.cd[s] <= 0 && F.seal[s] <= 0) || (s === 0 && F.c === HINCHAM && F.copy);
      return ready && AI_SKILL[F.c][s](F, O, dist);
    });
    if (slots.length && r < D.skill) {
      p |= slots[Math.floor(rnd() * slots.length)] === 0 ? B_S1 : B_S2;
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
      if (F.y > 10 && dist < kRange) { p |= B_K; mem.plan = 'attack'; }
      if (F.y <= 0 && F.vy === 0 && mem.planT <= 0) mem.plan = 'wait';
      break;
    case 'attack':
      if (dist > kRange) h |= toward;
      else {
        mem.atkCad--;
        if (mem.atkCad <= 0 && !F.atk) {
          p |= dist > pRange ? B_K : rnd() < 0.7 ? B_P : B_K;
          mem.atkCad = 4 + Math.floor(rnd() * (diffLv === 2 ? 4 : 12));
        }
      }
      if (mem.planT <= 0) mem.plan = 'wait';
      break;
    default: break;
  }
  mem.prevH = h;
  return { h, p };
}
