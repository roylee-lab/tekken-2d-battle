// ============================================================
//  CPU 인공지능
// ============================================================
// block: 막기/피하기 확률, interval: 판단 주기(프레임), aggr: 공격성, skill: 스킬 사용 확률, cad: 연타 간격,
// punish: 상대 헛손질·착지 반격, react: 위협을 알아채는 데 걸리는 프레임
const DIFF = {
  0: { name: '매우 쉬움', block: 0.1, interval: 34, aggr: 0.3, skill: 0.12, cad: 18, punish: 0, react: 14 },
  1: { name: '쉬움', block: 0.3, interval: 22, aggr: 0.45, skill: 0.25, cad: 12, punish: 0, react: 8 },
  2: { name: '보통', block: 0.6, interval: 14, aggr: 0.6, skill: 0.4, cad: 12, punish: 0.2, react: 4 },
  3: { name: '어려움', block: 0.85, interval: 8, aggr: 0.75, skill: 0.55, cad: 4, punish: 0.5, react: 2 },
  4: { name: '매우 어려움', block: 0.95, interval: 5, aggr: 0.82, skill: 0.7, cad: 3, punish: 0.8, react: 1 },
  5: { name: 'LUNATIC', block: 1.0, interval: 2, aggr: 0.9, skill: 0.85, cad: 2, punish: 1.0, react: 0, lunatic: true },
  6: { name: 'BOSS', block: 1.0, interval: 1, aggr: 1.0, skill: 1.0, cad: 0, punish: 1.0, react: 0, lunatic: true, boss: true },   // 히든 보스 전용 (메뉴에 없음)
};
const DIFF_N = 6;

// 스킬별 AI 사용 조건 (dist = 거리, F = 자신, O = 상대)
const close = (F, O, extra) => Math.abs(O.x - F.x) <= radius(F) + radius(O) + extra;
const helpless = (O) => O.hitT > 0 || O.stunT > 0 || O.rootT > 0 || O.chokeT > 0;
const AI_SKILL = {
  0: [(F, O, d) => d > 70 && d < 240, (F, O, d) => d < 120, (F, O, d) => d < 150, (F, O, d) => d > 60 && d < 240],
  1: [(F, O, d) => d < 140, (F, O, d) => d > 70 && d < 230, (F, O, d) => d < 200, (F, O, d) => true],
  2: [(F, O, d) => close(F, O, 14) && O.y < 10, () => false, (F, O, d) => true, (F, O, d) => d < 200],
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
  16: [(F, O, d) => d < 150, (F, O, d) => d < 120, (F, O, d) => d < 140, (F, O, d) => F.hp < F.maxHp * 0.45],
};
const MASH = [3, 5, 7, 9, 11, 14, 20];          // AI 연타 속도 (초당)
const QTE_REACT = [[60, 40], [45, 35], [32, 24], [22, 18], [16, 12], [9, 6], [4, 2]];   // AI 글자 반응 (최소, 랜덤 폭) 프레임

function makeAIMem() { return { t: 10, plan: 'wait', planT: 0, guardT: 0, reacted: false, prevH: 0, atkCad: 0, mash: 0, qL: '', qAt: 0, ghostX: 0, ghostT: 0 }; }
function aiMash(mem, diffLv) { mem.mash += (MASH[diffLv] || 7) / 60; const n = Math.floor(mem.mash); mem.mash -= n; return n; }

// ---- LUNATIC 전용: 프레임 단위로 계산해서 막고, 빈틈에 정확히 반격 ----
// 상대가 다시 막거나 움직일 수 있게 되기까지 남은 프레임
function oppFreeIn(O) {
  if (O.atk) return O.atkDur - O.atkT + 1;
  return Math.max(O.hitT, O.stunT, O.chokeT, busyOf(O) ? 30 : 0, O.jeongP);
}
function aiSkillTry(F, O, d, D, filt) {
  const slots = [0, 1, 2, 3].filter((s) => {
    if (!skillDef(F.c, s) || !AI_SKILL[F.c] || !AI_SKILL[F.c][s]) return false;
    const ready = (F.cd[s] <= 0 && F.seal[s] <= 0) || (s === 1 && F.c === HINCHAM && F.copy);
    return ready && (!filt || filt(s)) && AI_SKILL[F.c][s](F, O, d);
  });
  return slots.length ? B_SK[slots[Math.floor(rnd() * slots.length)]] : 0;
}
function lunaticCore(G, F, O, mem, D, toward, away) {
  if (O.invisT > 0 || F.chokeT > 0 || busyOf(F) || O.ko) return null;
  const d = Math.abs(O.x - F.x), grounded = F.y <= 0;
  const myP = atkTiming(F, 'P'), myK = atkTiming(F, 'K');
  const pR = meleeRange(F, O, 'P') - 2, kR = meleeRange(F, O, 'K') - 2;
  const oPR = meleeRange(O, F, 'P'), oKR = meleeRange(O, F, 'K');
  const oAct = atkTiming(O, 'P').act;
  const canAct = !F.atk && F.recov <= 0 && F.hitT <= 0 && F.stunT <= 0 && F.blockT <= 0 && grounded;
  const guardOk = !F.atk && grounded && F.guardOffT <= 0;
  // 상대 습관 기록: 가까이 있을 때 얼마나 자주 때리는지 / 얼마나 자주 막는지
  if (d < Math.max(oPR, oKR) + 30) {
    mem.cf = (mem.cf || 0) * 0.996 + 1;
    mem.ca = (mem.ca || 0) * 0.996 + (O.atk && O.atkT === 1 ? 1 : 0);
    mem.cg = (mem.cg || 0) * 0.996 + (O.guard ? 1 : 0);
  }
  const oAggr = mem.cf > 30 ? mem.ca / mem.cf : 0.03, oGuard = mem.cf > 30 ? mem.cg / mem.cf : 0.3;
  // 유도(잡기)는 가드로 못 막음 → JJjin 유도가 준비돼 있으면 가드로 버티지 않음
  const grabby = O.c === 2 && O.cd[0] <= 0 && O.seal[0] <= 0 && O.y <= 0;
  // 1) 들어오는 근접 공격: 먼저 때릴 수 있으면 끊고, 아니면 정확히 막음
  if (O.atk && !O.atkDone && Math.abs(O.y - F.y) < 70) {
    const left = O.atkAct - O.atkT;
    if (d <= meleeRange(O, F, O.atk) + 10) {
      if (canAct && myP.act < left && d <= pR) return { h: 0, p: B_P };
      if (canAct && myK.act < left && d <= kR && O.mallangT <= 0) return { h: 0, p: B_K };
      if (guardOk) return { h: B_D, p: 0 };
      return { h: 0, p: 0 };
    }
  }
  // 때려봤자 소용없는 상태 (무적·회복·패링·휴대폰압수 불사): 공격하지 않고 거리를 벌림
  if (O.phoneT > 0 || O.invulT > 0 || O.jeongA > 0 || O.meokT > 0 || O.manT > 0 || O.parryT > 0 || O.board) {
    if (O.board && !O.phoneT && !O.manT) { /* 보드는 한 번 때려서 깨야 함 */ }
    else return { h: grounded && !F.atk && d < 140 ? away : 0, p: 0 };
  }
  // 공격속도가 크게 빨라진 상대(연타 콤보)는 정면으로 맞서지 않음: 붙어 있으면 막고, 아니면 거리를 벌림
  const fastO = stat(O, 'aspd') >= 1.4 || O.awake || O.clockT > 0;
  // 2) 빈틈 반격: 상대가 굳어 있는 동안 확실히 맞는 공격 (잘 안 막는 상대면 다음 공격 전에 끊기)
  const free = oppFreeIn(O);
  const win = free + (oGuard < 0.08 && !fastO && O.clockT <= 0 ? oAct + 1 : 0);
  if (canAct && O.y <= 30 && free > 0) {
    if (win > myP.act && d <= pR) return { h: 0, p: B_P };
    if (win > myP.act + 1 && d <= pR + 2.2 * (win - myP.act - 1)) return { h: toward, p: 0 };   // 걸어 들어가서 주먹
    if (win > myK.act && d <= kR && O.mallangT <= 0) return { h: 0, p: B_K };
    if (d > pR && free + oAct >= 4 && !fastO) return { h: toward, p: 0 };   // 사거리가 밀리면 상대 후딜 동안 파고듦
  }
  // 3) 점프로 들어오는 상대: 공격 중이면 막고, 아니면 착지 전에 대공
  if (O.y > 10 && O.vy < 0 && d <= Math.max(oKR, kR) + 20) {
    if (O.atk && !O.atkDone && guardOk) return { h: B_D, p: 0 };
    if (canAct && d <= kR && O.y < 70) return { h: 0, p: B_K };
    if (canAct && d <= pR && O.y < 50) return { h: 0, p: B_P };
  }
  // 4) 상대 사거리 안 (중립): 스킬 / 기다렸다 반격 / 파고들기
  const threat = Math.max(oPR, oKR) + 12;
  if (fastO && grounded && d <= threat + 24) {   // 연타 콤보 상태: 스킬로 끊거나, 막으면서 버팀 (시계 끝나면 기절 → 반격)
    if (canAct) { const sk = aiSkillTry(F, O, d, D); if (sk) return { h: 0, p: sk }; }
    if (guardOk && d <= threat) return { h: B_D, p: 0 };
    if (grounded && !F.atk) return { h: away, p: 0 };
    return { h: 0, p: 0 };
  }
  if (grounded && d <= threat) {
    if (canAct && rnd() < D.skill * 0.25) { const sk = aiSkillTry(F, O, d, D); if (sk) return { h: 0, p: sk }; }
    if (grabby && d < 90) { if (canAct && d <= pR) return { h: 0, p: B_P }; return { h: away, p: 0 }; }
    // 상대가 먼저 때리면 막고 반격하는 게 이득 (때리는 상대일수록 기다림)
    const patience = oAggr > 0.02 ? 70 : oAggr > 0.008 ? 30 : 8;
    if ((mem.gw || 0) < patience && guardOk && (d <= oPR + 6 || d <= oKR + 6)) { mem.gw = (mem.gw || 0) + 1; return { h: B_D, p: 0 }; }
    if (canAct && d <= pR) { mem.gw = 0; return { h: 0, p: B_P }; }
    if (canAct && d <= kR && oPR < d - 4) { mem.gw = 0; return { h: 0, p: B_K }; }   // 상대 주먹 밖에서 발차기
    if (!F.atk) return { h: toward, p: 0 };
    return { h: 0, p: 0 };
  }
  mem.gw = 0;
  return null;
}

// 히든 보스 흑요 (2페이즈): 쓸 수 있는 스킬은 0프레임에 바로 사용
function bossChoose(G, F, O) {
  if (F.c !== BOSS || F.bph < 2 || F.atk || F.hitT > 0 || F.stunT > 0 || O.ko) return -1;
  const ok = (i) => F.bcd[i] <= 0, d = Math.abs(O.x - F.x), open = O.invulT <= 0 && O.earT <= 0;
  if (ok(5) && F.hp < F.maxHp * 0.45) return 5;
  if (ok(4) && open && F.domT <= 0) return 4;
  if (ok(1) && open && d < 150) return 1;
  if (ok(3) && open && O.y < 40) return 3;
  if (ok(2) && open && O.y < 40) return 2;
  if (ok(0) && d > 110) return 0;
  return -1;
}

function aiInput(G, F, O, mem, diffLv) {
  const bs = G.phase === 'fight' && !G.qte ? bossChoose(G, F, O) : -1;
  if (bs >= 0) return { h: 0, p: 0, keys: '', a: 0, bs };
  const D = DIFF[diffLv] || DIFF[2];
  let h = 0, p = 0, keys = '', a = 0;
  if (G.phase !== 'fight') { mem.prevH = 0; return { h: 0, p: 0 }; }
  // 패드립 배틀: 글자 보고 반응
  if (G.qte) {
    const q = G.qte;
    if (q.st === 'show') {
      if (mem.qL !== q.L + q.i) { mem.qL = q.L + q.i; const r = QTE_REACT[diffLv] || QTE_REACT[2]; mem.qAt = r[0] + Math.floor(rnd() * r[1]); }
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
  const pRange = meleeRange(F, O, 'P') - 4;
  const kRange = meleeRange(F, O, 'K') - 4;
  const oRange = meleeRange(O, F, O.atk === 'K' ? 'K' : 'P');
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
  // LUNATIC: 프레임 계산 방어·반격
  if (D.lunatic) {
    const r = lunaticCore(G, F, O, mem, D, toward, away);
    if (r) { mem.prevH = r.h; return { h: r.h, p: r.p, keys, a }; }
  }
  // 몸에 개미가 달라붙으면 펀치로 떼어냄
  if (O.antG && O.antG.length && !F.atk && F.recov <= 0 && rnd() < D.aggr * 0.25) { p |= B_P; mem.prevH = h; return { h, p, keys, a }; }
  // 이유동 피모: 보이면 밟지 않게 점프로 넘거나 멈춤
  const pimo = G.traps.find((t) => t.k === 'pimo' && t.o === O.side && Math.abs(t.x - F.x) < 30);
  if (pimo && F.y <= 0 && rnd() < D.block * 0.3) { p |= B_U; h |= (pimo.x > F.x ? B_R : B_L); }
  const projThreat = G.proj.find((q) => q.o === O.side && sign(F.x - q.x) === sign(q.vx) && Math.abs(F.x - q.x) < 85);
  // 반격: 상대가 헛손질 후 굳어 있거나(후딜) 공중에서 내려오면 바로 때림 (어려움 이상)
  if (!F.atk && F.y <= 0 && D.punish > 0 && mem.guardT <= 0) {
    const realD = Math.abs(O.x - F.x);
    if (O.atk && O.atkT === O.atkAct + 2) mem.pun = rnd() < D.punish;             // 상대 공격마다 한 번 판정
    if (O.atk && O.atkT > O.atkAct + 1 && mem.pun && realD <= pRange + 6) { mem.pun = false; mem.prevH = h; return { h, p: p | B_P, keys, a }; }
    if (O.y > 18 && O.vy < 0 && O.vy > -0.5) mem.aa = rnd() < D.punish * 0.7;           // 점프 정점에서 한 번 판정
    if (O.y > 18 && O.vy < 0 && mem.aa && realD <= kRange) { mem.aa = false; mem.prevH = h; return { h, p: p | B_K, keys, a }; }
  }
  if (mem.guardT > 0) {
    mem.guardT--; h |= B_D;
  } else if ((meleeThreat || projThreat) && !mem.reacted) {
    mem.reacted = true;
    if (rnd() < D.block) {
      if (F.c === 2 && F.parryR <= 0 && F.cd[1] <= 0 && F.seal[1] <= 0 && meleeThreat && rnd() < 0.7) p |= B_S2;          // JJjin 패링
      else if (F.c === 6 && F.cd[0] <= 0 && F.seal[0] <= 0 && rnd() < 0.5) p |= B_S1;   // 안거녕 먹부림
      else if (projThreat && F.c === 6) { /* 투사체 무적 */ }
      else if (projThreat && rnd() < (D.lunatic ? 0.6 : 0.35) && F.rootT <= 0) { p |= B_U; h |= toward; }
      else { mem.guardT = meleeThreat ? (D.lunatic ? 9 : 16) : (D.lunatic ? 14 : 22); h |= B_D; }
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
          mem.atkCad = 2 + Math.floor(rnd() * D.cad);
        }
      }
      if (mem.planT <= 0) mem.plan = 'wait';
      break;
    default: break;
  }
  mem.prevH = h;
  return { h, p, keys, a };
}
