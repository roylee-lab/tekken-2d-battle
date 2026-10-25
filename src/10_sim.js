// ============================================================
//  게임 시뮬레이션 (호스트 권한 방식: 오프라인/온라인 호스트에서만 실행)
//  모든 시간 단위는 프레임(60fps 고정)
// ============================================================
const B_L = 1, B_R = 2, B_U = 4, B_D = 8, B_P = 16, B_K = 32, B_S1 = 64, B_S2 = 128, B_S3 = 256, B_S4 = 512;
const B_SK = [B_S1, B_S2, B_S3, B_S4];
const PROJ_TYPES = new Set(['VACUUM', 'TOOTH', 'MOLACUT', 'BAMBOO', 'GEOKGI', 'POISON_BULLET', 'GAEGURA', 'NOTE', 'TOXIC_FART', 'CRYSTAL', 'SHUTTLE', 'MAKGEOLLI']);
const MELEE_T = new Set(['PUNCH', 'KICK']);
const QTE_KEYS = 'AFGHJLZXVBNTYUIO';   // 이동·공격·스킬·메뉴 키와 겹치지 않는 글자
let rnd = Math.random; // 시뮬레이션 난수

const _lookVar = {};
function lookOf(F) {
  const base = CHARS[F.c].look;
  const k = (F.slim && F.c === 6 ? 's' : '') + (F.earT > 0 ? 'e' : '') + (F.drunkT > 0 ? 'd' : '');
  if (!k) return base;
  const key = F.c + k;
  if (!_lookVar[key]) {
    const v = Object.assign({}, base, { acc: Object.assign({}, base.acc), b: Object.assign({}, base.b) });
    if (k.includes('s')) { v.b.belly = 0; v.b.waistW = 14; v.b.torsoW = 18; v.acc.roundFace = false; }
    if (k.includes('e')) v.acc.earmuff = true;
    if (k.includes('d')) v.acc.drunk = true;
    _lookVar[key] = v;
  }
  return _lookVar[key];
}
function radius(F) {
  const L = lookOf(F), b = L.b;
  return (b.torsoW * 0.5 + 7 + b.belly * 7 + b.hips * 0.7) * L.H * 1.25 * (F.sz || 1); // 화면 확대(FSCALE)와 두께 반영
}
// ---------- 능력치 배율 (버프/디버프) ----------
const STAT_ALL = new Set(['atk', 'def', 'spd', 'aspd', 'range']);
function stat(F, k) {
  let v = STAT_ALL.has(k) ? (F.pm || 1) : 1;
  for (const m of F.mods) if (m.k === k || (m.k === 'all' && STAT_ALL.has(k))) v *= m.v;
  return v;
}
function addMod(F, id, k, v, t) { F.mods = F.mods.filter((m) => m.id !== id); F.mods.push({ id, k, v, t }); }
function canHeal(F) { return F.hbT <= 0 && F.ttaT <= 0; }
// 상대가 바라볼 대상 (mola 분신이 더 가까우면 분신을 바라봄)
function faceX(F, O) {
  const C = O.clone;
  if (C && C.hp > 0 && Math.abs(C.x - F.x) < Math.abs(O.x - F.x)) return C.x;
  return O.x;
}
function busyOf(F) { return F.laughT > 0 || F.fireT > 0 || F.flyT > 0 || F.rushT2 > 0 || F.kkT > 0 || F.shutT > 0 || F.chokeHold || F.chokeT > 0; }
function charName(c) { return CHARS[c].name; }

function makeFighter(side, c) {
  return {
    side, c, x: 0, y: 0, vx: 0, vy: 0, kb: 0, f: side === 0 ? 1 : -1,
    hp: 100, maxHp: 100, st: 'idle', anim: 0,
    atk: null, atkT: 0, atkDur: 0, atkAct: 0, atkDmg: 0, atkDone: false, combo: 0, comboT: 0, recov: 0,
    guard: false, hitT: 0, blockT: 0, hitFlash: 0,
    cd: [0, 0, 0, 0], seal: [0, 0, 0, 0], copy: null, poisDmg: 1,
    stimT: 0, meokT: 0, manT: 0, jeongP: 0, jeongA: 0, parryT: 0, parryR: 0,
    rootT: 0, slowT: 0, delayT: 0, guardOffT: 0, boostT: 0, poisT: 0, poisTick: 0,
    board: false, djUsed: false,
    rushN: 0, rushT: 0, noteN: 0, noteT: 0, noteSess: 0, noteHits: 0, noteFired: 0,
    ddN: 0, diceN: 0, mul: 1, angerT: 0, awake: false, revived: false, pain: 0,
    maemOwn: false, maemEnemy: false, regenT: 0,
    spikeT: 0, dashT: 0, dashDir: 1, headT: 0, headHit: false, castT: 0,
    momHp: 0, momMax: 0, momT: 0, curseT: 0,
    mods: [], sz: 1, pm: 1, stunT: 0, hbT: 0, ttaT: 0, invisT: 0, drunkT: 0, earT: 0, rageT: 0, kcT: 0,
    laughT: 0, breathN: 0, breathT: 0, breathHit: false, fireT: 0, flyT: 0, flyX: 0, flyFrom: 0, rushT2: 0,
    chokeT: 0, chokeN: 0, chokeTick: 0, chokeHold: false, kkT: 0, shutT: 0, stk: 0, yank: false, slim: false, clone: null, ddFree: false,
    ko: false, wins: 0, combo_recv: 0, comboShowT: 0,
  };
}

function newMatch(c0, c1, stage, mode, late) {
  const G = {
    late: late || [false, false], qte: null, yut: null,
    phase: 'intro', pt: 0, round: 1, timer: ROUND_TIME * SEC, roundF: 0,
    F: [makeFighter(0, c0), makeFighter(1, c1)],
    proj: [], traps: [], freezeT: 0, hitStop: 0, dice: null, notes: [],
    stage, mode, rw: -1, mw: -1, koType: '', perfect: false, flash: 0, ev: [], pid: 0,
  };
  resetRound(G);
  return G;
}

function resetRound(G) {
  G.phase = 'intro'; G.pt = 0; G.timer = ROUND_TIME * SEC; G.roundF = 0;
  G.proj = []; G.traps = []; G.freezeT = 0; G.hitStop = 0; G.dice = null; G.notes = []; G.flash = 0; G.qte = null; G.yut = null;
  G.rw = -1; G.koType = ''; G.perfect = false;
  for (const F of G.F) {
    const wins = F.wins, c = F.c, side = F.side;
    Object.assign(F, makeFighter(side, c));
    F.wins = wins;
    const O = G.F[1 - side];
    // 이은뚱 패시브: 상대가 mola/JJjin이면 최대 체력 +10
    F.maxHp = BAL[c].hp + (c === 4 && (O.c === 1 || O.c === 2) ? Math.round(BAL[4].hp * BAL[4].friend) : 0);
    F.hp = F.maxHp;
    F.cd = SLOT_CD_START.map((s) => s * SEC);   // 라운드 시작 시 첫 쿨타임부터 돈다
    // 힌참휴 오타쿠 / 영탁 니가 왜 거기서 나와: 모든 능력치 배율
    F.pm = 1;
    if (c === HINCHAM) { if (O.c === 4) F.pm *= 1 + BAL[12].otaku; if (G.stage === 'tokyo') F.pm *= 1 + BAL[12].otaku; }
    if (c === YOUNGTAK && G.late && G.late[side]) F.pm *= 1 + BAL[13].late;
    F.x = ARENA_W / 2 + (side === 0 ? -80 : 80);
    F.f = side === 0 ? 1 : -1;
  }
}

// ---------- 이벤트/알림 ----------
function ev(G, ...a) { G.ev.push(a); }
function note(G, text, color, life) { G.notes.push({ t: text, c: color || '#fff', life: life || 100, max: life || 100 }); if (G.notes.length > 4) G.notes.shift(); }

// ---------- 은맘: 피해·방해효과 대신 받기 ----------
function momAlive(F) { return F.momHp > 0 && F.momT > 0; }
function momTake(G, F, dmg, label) {
  F.momHp -= dmg;
  ev(G, 'spark', F.x - F.f * 20, F.y + 45, 'guard');
  ev(G, 'float', F.x - F.f * 20, F.y + 92, label || ('-' + (Math.round(dmg * 10) / 10)), '#ffb3d1');
  if (F.momHp <= 0) { F.momHp = 0; F.momT = 0; note(G, '은맘이 쓰러졌다!', '#ff8fb3', 80); ev(G, 'sfx', 'clash'); }
}
// 구속·감속·봉인 같은 방해효과를 받기 전에 호출 → true면 은맘이 대신 받아서 무효
function disrupt(G, T) {
  if (T.earT > 0) { ev(G, 'float', T.x, T.y + 92, '무시!', '#c38bff'); return true; }   // 창가오 거꾸로 쓴 귀마개
  if (!momAlive(T)) return false;
  momTake(G, T, 0, '방해 무효!');
  return true;
}

// ---------- 데미지 처리 ----------
function applyDamage(G, A, D, dmg, type, o) {
  o = o || {};
  if (D.ko) return 'immune';
  const proj = PROJ_TYPES.has(type);
  const hy = D.y + 50 * lookOf(D).H;
  // 창가오 거꾸로 쓴 귀마개: 상대 스킬 피해 무시 (일반 공격만 맞음)
  if (D.earT > 0 && A !== D && !MELEE_T.has(type)) { ev(G, 'spark', D.x, hy, 'immune'); ev(G, 'float', D.x, hy + 24, '무시!', '#c38bff'); return 'immune'; }
  if (A && A !== D && A.curseT > 0 && !o.reflect) dmg *= 1 + BAL[4].curseAtk;   // 31.8의 저주: 공격력 증가
  if (A && A !== D && !o.reflect && !o.fixed) { dmg *= stat(A, 'atk') / stat(D, 'def'); if (type === 'KICK') dmg *= stat(A, 'kdmg'); }
  if (A && A !== D && A.yank && !o.reflect && dmg > 0 && rnd() < BAL[11].yankP) { dmg *= 2; ev(G, 'float', D.x, hy + 34, '양크 x2!', '#ff9f43'); }
  // 패드립 배틀 피해는 방어 스킬로 막을 수 없음
  if (o.pure) { /* 은맘만 대신 받을 수 있음 */ }
  // 1. 힙찔 강 보드: 공격 1회 완전 방어 후 파괴
  else if (D.board) {
    D.board = false; if (D.c === 8) D.cd[1] = SLOT_CD[1] * SEC;
    ev(G, 'sfx', 'parry'); ev(G, 'shake', 8, 4); ev(G, 'spark', D.x, hy, 'guard');
    note(G, `${charName(D.c)}의 보드가 공격을 막고 부서졌다!`, '#ff66b3', 80);
    return 'immune';
  }
  // 2. 정의(正義) 발동 중: 모든 공격 무효
  else if (D.jeongA > 0) { ev(G, 'spark', D.x, hy, 'immune'); ev(G, 'sfx', 'immune'); return 'immune'; }
  // 3. 안거녕 패시브: 투사체 무적
  else if (D.c === 6 && proj) { ev(G, 'spark', D.x, hy, 'immune'); ev(G, 'sfx', 'immune'); ev(G, 'float', D.x, hy + 20, '무효!', '#ffd27f'); return 'immune'; }
  // 4. 먹부림: 무적
  else if (D.meokT > 0) { ev(G, 'spark', D.x, hy, 'immune'); ev(G, 'sfx', 'chomp'); return 'immune'; }
  // 5. 만물포용력: 데미지 → 회복
  else if (D.manT > 0) {
    if (dmg > 0 && canHeal(D)) { addHp(D, dmg); ev(G, 'heal', D.x, hy); ev(G, 'float', D.x, hy + 20, '+' + Math.round(dmg), '#7dff9a'); }
    return 'immune';
  }
  // 6. 패링
  else if (D.parryT > 0) {
    ev(G, 'sfx', 'parry'); ev(G, 'shake', 10, 5); ev(G, 'spark', D.x, hy, 'parry');
    if (!proj) { A.kb = -A.f * 7; A.hitT = Math.max(A.hitT, 14); }
    note(G, 'PARRY!', '#7fd4ff', 45);
    return 'parry';
  }
  // 7. Tirón 괴룡 패시브
  if (D.c === TIRON) {
    D.pain++;
    if (D.pain >= BAL[11].painMax) {
      D.pain = 0; if (!disrupt(G, A)) A.rootT = Math.max(A.rootT, BAL[11].painRoot);
      note(G, `⚡ Tirón 괴룡 패시브 발동! 적 ${BAL[11].painRoot / 60}초 구속! ⚡`, '#ff9f43', 90); ev(G, 'shake', 12, 6); ev(G, 'sfx', 'roar');
    }
  }
  // 8. 가드: 70% 경감 (독 폭발/고정 피해는 가드 무시)
  let blocked = false;
  if (D.guard && D.guardOffT <= 0 && type !== 'TOXIC_EXPLOSION' && !o.fixed) {
    dmg *= 0.3; blocked = true;
  }
  // 9. 경감 효과 (고정 피해는 무시)
  // 31.8의 저주: 받은 피해 일부 반사 (고정 피해)
  if (D.curseT > 0 && !o.reflect && A !== D && dmg > 0) {
    const refl = dmg * BAL[4].curseRefl;
    applyDamage(G, D, A, refl, 'REFLECT', { fixed: true, reflect: true });
  }
  if (!o.fixed) {
    if (D.curseT > 0) dmg *= 1 - BAL[4].curseDR;
    if (D.c === 8 && A.c !== 8) dmg *= 1 - BAL[8].dr;      // 힙찔 강 불협화음 (받는 피해 10% 감소)
    if (D.spikeT > 0) dmg *= 1 - BAL[12].spikeDR;                // 힌참휴 뾰족한 머리 (받는 피해 10% 감소)
  }
  // 은맘이 피해와 방해효과를 모두 대신 받음
  if (momAlive(D)) {
    if (dmg > 0) momTake(G, D, dmg); else momTake(G, D, 0, '막음!');
    return 'mom';
  }
  if (dmg > 0) {
    D.hp -= dmg;
    ev(G, 'float', D.x + rnd() * 10 - 5, hy + 22, (Math.round(dmg * 10) / 10).toString(), blocked ? '#bbbbbb' : (o.fixed ? '#ff5edb' : '#ffe14d'));
    if (A !== D && A.stimT > 0 && canHeal(A)) { addHp(A, dmg * BAL[0].stimLS); ev(G, 'heal', A.x, A.y + 50); }
    if (A.c === 3 && A !== D) { const red = Math.round(BAL[3].cdRed * SEC); A.cd = A.cd.map((v) => Math.max(0, v - red)); }
  }
  checkKO(G, D);
  return blocked ? 'block' : 'hit';
}

function checkKO(G, D) {
  if (D.hp > 0 || D.ko) return;
  if (D.c === 2 && !D.revived) {
    D.revived = true; D.hp = D.maxHp * BAL[2].reviveHp; D.hitT = 0;
    G.freezeT = Math.max(G.freezeT, 75);
    note(G, `JJjin 부활! (체력 ${Math.round(BAL[2].reviveHp * 100)}%)`, '#f5c542', 110); ev(G, 'sfx', 'revive'); ev(G, 'revive', D.x, D.y);
    return;
  }
  D.hp = 0; D.ko = true;
}

function addHp(F, amt, over) { F.hp = over ? F.hp + amt : Math.max(F.hp, Math.min(F.maxHp, F.hp + amt)); }
function heal(G, F, amt, over) {
  if (!canHeal(F)) { ev(G, 'float', F.x, F.y + 80, '회복 불가!', '#ff7b7b'); return; }
  addHp(F, amt, over);
  ev(G, 'heal', F.x, F.y + 50 * lookOf(F).H);
  ev(G, 'float', F.x, F.y + 70, '+' + Math.round(amt), '#7dff9a');
}

// ---------- 투사체 ----------
function spawnProj(G, F, t, vx, life, r, extra) {
  const p = Object.assign({ id: ++G.pid, t, x: F.x + F.f * (radius(F) + 6), y: F.y + 50 * lookOf(F).H, vx: F.f * vx, o: F.side, life, r, age: 0 }, extra || {});
  G.proj.push(p);
  return p;
}

const PROJ_HIT = {
  vacuum(G, A, T, p) {
    const res = applyDamage(G, A, T, 0, 'VACUUM');
    if (res === 'hit' || (res === 'block' && T.c !== 0)) { T.kb = sign(p.vx) * BAL[0].vacPush; T.hitT = Math.max(T.hitT, BAL[0].vacStun); ev(G, 'sfx', 'whoosh'); }
    if (res === 'block' && T.c === 0) ev(G, 'float', T.x, T.y + 70, '끈기!', '#7fd4ff');
  },
  tooth(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[1].toothDmg, 'TOOTH');
    if (res === 'hit') { T.kb = sign(p.vx) * 1.5; T.hitT = Math.max(T.hitT, 8); }
  },
  molacut(G, A, T, p) {
    const res = applyDamage(G, A, T, Math.max(0.5, T.hp * BAL[1].cutPct), 'MOLACUT', { fixed: true });
    if (res === 'hit') { T.hitT = Math.max(T.hitT, 12); ev(G, 'shake', 6, 3); }
  },
  bamboo(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[3].bambooDmg, 'BAMBOO');
    if (res === 'hit') { T.kb = sign(p.vx) * 4; T.hitT = Math.max(T.hitT, 14); }
  },
  nunchaku(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[5].nunDmg, 'GEOKGI');
    if (res === 'hit' || res === 'block') { T.rootT = Math.max(T.rootT, BAL[5].nunRoot); ev(G, 'float', T.x, T.y + 80, '고정!', '#48e0c0'); }
    if (res === 'hit') T.hitT = Math.max(T.hitT, 14);
  },
  gaegura(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[7].gaeDmg, 'GAEGURA');
    if (res === 'hit' || res === 'block') { T.rootT = Math.max(T.rootT, BAL[7].gaeRoot); T.kb = sign(p.vx) * 6; }
  },
  poison(G, A, T, p) {
    const res = applyDamage(G, A, T, 0, 'POISON_BULLET');
    if (res === 'hit' || res === 'block') { T.poisT = BAL[7].poisT; T.poisTick = 0; T.poisDmg = BAL[7].poisTick; ev(G, 'poison', T.x, T.y + 50); ev(G, 'float', T.x, T.y + 80, '독!', '#7dff4d'); }
  },
  note(G, A, T, p) {
    const res = applyDamage(G, A, T, p.dmg, 'NOTE');
    if (res === 'hit' || res === 'block') {
      if (A.noteSess === p.sess) {
        A.noteHits++;
        if (A.noteHits === 3) { heal(G, A, BAL[8].noteHeal); A.noteHits = -99; }
      }
    }
  },
  vacuum2(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[0].vac2Dmg, 'VACUUM');
    if (res === 'hit') { T.kb = sign(p.vx) * BAL[0].vacPush; stunTarget(G, T, BAL[0].vac2Stun); ev(G, 'shake', 8, 4); ev(G, 'sfx', 'whoosh'); }
  },
  crystal(G, A, T, p) {
    const res = applyDamage(G, A, T, BAL[3].crystalDmg, 'CRYSTAL', { fixed: true });
    if (res === 'hit') { T.hitT = Math.max(T.hitT, 14); T.kb = sign(p.vx) * 3; ev(G, 'shake', 6, 3); }
  },
  shuttle(G, A, T, p) {
    const guarded = T.guard && T.guardOffT <= 0;
    const res = applyDamage(G, A, T, guarded ? BAL[10].shuttleBlock : BAL[10].shuttleHit, 'SHUTTLE', { fixed: true });
    if (res === 'hit') {
      if (guarded) { T.blockT = 10; ev(G, 'float', T.x, T.y + 96, '가드!', '#9fd0ff'); }
      else { T.hitT = Math.max(T.hitT, 24); T.kb = sign(p.vx) * 6; ev(G, 'shake', 14, 7); G.hitStop = 8; ev(G, 'float', T.x, T.y + 96, 'SMASH!', '#ffe14d'); }
    }
  },
  makgeolli(G, A, T, p) {
    const res = applyDamage(G, A, T, 0, 'MAKGEOLLI');
    if ((res === 'hit' || res === 'block') && !disrupt(G, T)) { T.drunkT = BAL[13].drunkT; ev(G, 'float', T.x, T.y + 90, '취했다~', '#ffd27f'); ev(G, 'sfx', 'chomp'); }
  },
  fart(G, A, T, p) {
    const res = applyDamage(G, A, T, (ATK.pBase + ATK.pStep) * A.mul * BAL[10].fartMul, 'TOXIC_FART');
    if (res === 'hit' || res === 'block') { T.poisT = BAL[10].poisT; T.poisTick = 0; T.poisDmg = BAL[10].poisTick; ev(G, 'poison', T.x, T.y + 50); }
    if (res === 'hit') T.hitT = Math.max(T.hitT, 10);
  },
};

function updateProjectiles(G) {
  const list = G.proj;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx; p.life--; p.age++;
    const A = G.F[p.o], T = G.F[1 - p.o];
    const C = T.clone;
    if (C && C.hp > 0 && Math.abs(p.x - C.x) < p.r + radius(T) * 0.75 && p.y > C.y + 4 && p.y < C.y + 96 * lookOf(T).H) {
      cloneHit(G, T, p.t === 'shuttle' ? 50 : 10); ev(G, 'spark', p.x, p.y, 'hit'); list.splice(i, 1); continue;
    }
    if (!T.ko) {
      const LT = lookOf(T);
      const top = T.y + (T.guard ? 72 : 96) * LT.H;
      if (Math.abs(p.x - T.x) < p.r + radius(T) * 0.75 && p.y > T.y + 4 && p.y < top) {
        PROJ_HIT[p.t](G, A, T, p);
        ev(G, 'spark', p.x, p.y, p.t === 'poison' || p.t === 'fart' ? 'poison' : 'hit');
        list.splice(i, 1);
        continue;
      }
    }
    if (p.life <= 0 || p.x < -20 || p.x > ARENA_W + 20) list.splice(i, 1);
  }
  // 투사체끼리 상쇄
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.o !== b.o && Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r) {
        ev(G, 'spark', (a.x + b.x) / 2, (a.y + b.y) / 2, 'clash'); ev(G, 'sfx', 'clash');
        a.life = 0; b.life = 0; a.x = -999; b.x = -999;
      }
    }
  }
  G.proj = list.filter((p) => p.x > -100);
  // 죽순 함정
  for (let i = G.traps.length - 1; i >= 0; i--) {
    const tr = G.traps[i];
    tr.age = (tr.age || 0) + 1;
    const T = G.F[1 - tr.o];
    if (tr.age > 20 && !T.ko && T.y <= 0 && Math.abs(T.x - tr.x) < 10 + radius(T) * 0.4) {
      const res = applyDamage(G, G.F[tr.o], T, 5, 'SHOOT');
      if (res === 'hit') T.hitT = Math.max(T.hitT, 10);
      ev(G, 'spark', tr.x, 8, 'bamboo'); ev(G, 'sfx', 'stab');
      G.traps.splice(i, 1);
    }
  }
}

// ---------- 스킬 정의 ----------
function clampX(F) { F.x = clamp(F.x, 20, ARENA_W - 20); }
// 기절 (은맘·귀마개가 막을 수 있는 방해 효과)
function stunTarget(G, T, frames) {
  if (frames <= 0 || T.ko || disrupt(G, T)) return false;
  T.stunT = Math.max(T.stunT, Math.round(frames)); T.atk = null; T.laughT = 0; T.fireT = 0; T.kkT = 0; T.shutT = 0;
  ev(G, 'float', T.x, T.y + 100, '기절!', '#ffe14d');
  return true;
}
function inFront(F, O, reach, dy) {
  const dx = O.x - F.x;
  return Math.abs(dx) <= radius(F) + radius(O) + reach && (sign(dx) === F.f || Math.abs(dx) < 6) && Math.abs(O.y - F.y) < (dy || 52);
}
// mola 분신 피격
function cloneHit(G, owner, dmg) {
  const C = owner.clone; if (!C) return;
  C.hp -= dmg; C.hit = 10;
  ev(G, 'float', C.x, C.y + 80, (Math.round(dmg * 10) / 10).toString(), '#ffe14d');
  if (C.hp <= 0) { owner.clone = null; note(G, '분신이 사라졌다!', '#c38bff', 70); ev(G, 'spark', C.x, C.y + 50, 'immune'); ev(G, 'sfx', 'clash'); }
}
// 패드립 배틀 (JJjin E)
function startQTE(G, F) {
  const [a, b] = G.F;
  const mid = clamp((a.x + b.x) / 2, 180, ARENA_W - 180), s = a.x <= b.x ? 1 : -1;
  a.x = mid - s * 150; b.x = mid + s * 150; a.vx = b.vx = 0; a.kb = b.kb = 0;
  for (const X of G.F) { X.atk = null; X.dashT = 0; X.headT = 0; X.rushT2 = 0; X.flyT = 0; X.y = 0; X.vy = 0; }
  G.proj = [];
  G.qte = { o: F.side, n: BAL[2].qteN, i: 0, L: '', st: 'wait', t: 50, lock: [0, 0], wins: [0, 0], last: -1 };
  note(G, '🔥 패드립 배틀! 화면의 글자를 먼저 눌러라! 🔥', '#ff9f43', 140);
  ev(G, 'sfx', 'roar'); ev(G, 'shake', 10, 5);
}
function stepQTE(G, inputs) {
  const q = G.qte;
  for (let s = 0; s < 2; s++) if (q.lock[s] > 0) q.lock[s]--;
  const keysOf = (s) => (inputs[s] && inputs[s].keys) || '';
  if (q.st === 'wait') {
    for (let s = 0; s < 2; s++) if (keysOf(s)) { q.lock[s] = 30; ev(G, 'float', G.F[s].x, G.F[s].y + 100, '성급!', '#ff7b7b'); }
    if (--q.t <= 0) {
      let L; do { L = QTE_KEYS[Math.floor(rnd() * QTE_KEYS.length)]; } while (L === q.L);
      q.L = L; q.st = 'show'; q.t = 0; ev(G, 'sfx', 'tick');
    }
    return;
  }
  if (q.st === 'show') {
    q.t++;
    let winner = -1;
    const order = rnd() < 0.5 ? [0, 1] : [1, 0];
    for (const s of order) {
      const k = keysOf(s);
      if (!k || q.lock[s] > 0) continue;
      if (k.includes(q.L) && new Set(k).size === 1) { winner = s; break; }
      q.lock[s] = 30; ev(G, 'float', G.F[s].x, G.F[s].y + 100, '땡!', '#ff7b7b'); ev(G, 'sfx', 'deny');
    }
    if (winner >= 0) {
      const W = G.F[winner], Lo = G.F[1 - winner];
      q.wins[winner]++; q.last = winner; q.st = 'res'; q.t = 40;
      ev(G, 'sfx', 'hitK'); ev(G, 'shake', 6, 3);
      applyDamage(G, W, Lo, BAL[2].qteDmg, 'QTE', { fixed: true, pure: true });
      heal(G, W, BAL[2].qteHeal);
      if (Lo.hp > 0) Lo.hitFlash = 4;
    } else if (q.t > 180) { q.last = -1; q.st = 'res'; q.t = 30; }
    return;
  }
  if (--q.t <= 0) {
    q.i++;
    if (q.i >= q.n) {
      G.qte = null;
      const w = q.wins[0] === q.wins[1] ? '무승부' : `${charName(G.F[q.wins[0] > q.wins[1] ? 0 : 1].c)} 승리`;
      note(G, `패드립 배틀 종료! ${q.wins[0]} : ${q.wins[1]} (${w})`, '#ff9f43', 110);
    } else { q.st = 'wait'; q.t = 25 + Math.floor(rnd() * 35); }
  }
}

const SK = {
  0: [
    (G, F, O) => { spawnProj(G, F, 'vacuum', 7, 34, 13); return true; },
    (G, F, O) => { F.stimT = BAL[0].stimT; ev(G, 'sfx', 'powerup'); return true; },
    (G, F, O) => { addMod(F, 'focus', 'aspd', BAL[0].focus, BAL[0].focusT); ev(G, 'sfx', 'powerup'); ev(G, 'aura', F.side, 'press'); return true; },
    (G, F, O) => { spawnProj(G, F, 'vacuum2', 7.5, 40, 18); ev(G, 'sfx', 'whoosh'); ev(G, 'shake', 6, 3); return true; },
  ],
  1: [
    (G, F, O) => { F.rushN = BAL[1].toothN; F.rushT = 8; return true; },
    (G, F, O) => { F.x -= F.f * 30; clampX(F); spawnProj(G, F, 'molacut', 11, 25, 10); return true; },
    (G, F, O) => {
      const side = F.x <= O.x ? 1 : -1;
      F.clone = { x: clamp(O.x + side * (radius(O) + radius(F) + 30), 20, ARENA_W - 20), y: 0, vy: 0, vx: 0, f: -side, hp: F.hp, max: F.hp, t: BAL[1].cloneT, anim: 0, off: 10, hit: 0 };
      note(G, '현란한 드리블! 진짜는 누구?', '#c38bff', 90); ev(G, 'sfx', 'whoosh'); ev(G, 'spark', F.clone.x, 50, 'immune');
      return true;
    },
    (G, F, O) => {
      if (!disrupt(G, O)) { addMod(O, 'debuff', 'all', 1 - BAL[1].debuff, BAL[1].debuffT); note(G, `디버프! 상대 모든 능력치 -${Math.round(BAL[1].debuff * 100)}%`, '#c38bff', 90); }
      ev(G, 'hack', F.side); ev(G, 'sfx', 'hack'); return true;
    },
  ],
  2: [
    (G, F, O, inp) => {
      let dir = F.f;
      if (inp && inp.h & B_R) dir = 1; else if (inp && inp.h & B_L) dir = -1;
      F.dashT = BAL[2].dashT; F.dashDir = dir; return true;
    },
    (G, F, O) => {
      if (F.parryT > 0 || F.parryR > 0) return false;
      F.parryT = BAL[2].parryT; F.parryR = BAL[2].parryT + 16; return true;
    },
    (G, F, O) => { if (G.qte || O.ko) return false; startQTE(G, F); return true; },
    (G, F, O) => { F.invisT = BAL[2].invisT; note(G, '영역 전개!', '#f5c542', 70); ev(G, 'sfx', 'hack'); ev(G, 'flashOnce'); return true; },
  ],
  3: [
    (G, F, O) => { spawnProj(G, F, 'bamboo', 10, 20, 10); return true; },
    (G, F, O) => {
      if (G.traps.filter((t) => t.o === F.side).length >= BAL[3].shootMax) return false;
      G.traps.push({ x: F.x, o: F.side, age: 0 }); return true;
    },
    (G, F, O) => { spawnProj(G, F, 'crystal', 7, 50, 9); ev(G, 'sfx', 'charge'); return true; },
    (G, F, O) => {
      if (F.y > 0) return false;
      F.flyT = 40; F.flyFrom = F.x; F.flyX = clamp(O.x, 20, ARENA_W - 20);
      note(G, '플라잉 바르셀로나 어택!!', '#58d68d', 80); ev(G, 'sfx', 'jump'); return true;
    },
  ],
  4: [
    (G, F, O) => {
      const B4 = BAL[4];
      heal(G, F, F.maxHp * B4.ddHeal);
      F.ddN++;
      if (F.ddN % B4.ddEvery === 0) {
        F.maxHp = Math.round(F.maxHp * (1 + B4.ddMax));
        heal(G, F, F.maxHp * B4.ddMax);
        note(G, `더블다운 ${B4.ddEvery}회! 최대 체력 ${F.maxHp}`, '#ffb36b', 90);
      }
      return true;
    },
    (G, F, O) => {
      if (G.dice) return false;
      G.dice = { o: F.side, t: 45, val: 1, res: 0, pop: 0 };
      G.freezeT = Math.max(G.freezeT, 45 + 45);
      F.diceN++;
      if (F.diceN % BAL[4].angerEvery === 0) { F.mul += BAL[4].angerAdd; F.angerT = 90; note(G, `이은뚱 분노! 공격력 +${Math.round(BAL[4].angerAdd * 100)}%`, '#ff5a36', 90); }
      ev(G, 'sfx', 'dice');
      return true;
    },
    (G, F, O) => {   // E: 은맘 소환
      if (momAlive(F)) return false;
      F.momMax = F.momHp = Math.max(1, Math.round(F.maxHp * BAL[4].momPct * 10) / 10);   // 현재 최대 체력 기준
      F.momT = Math.round(BAL[4].momSec * SEC);
      note(G, `은맘 등장! (체력 ${F.momHp}) 모든 피해와 방해를 대신 받는다`, '#ff8fb3', 110);
      ev(G, 'sfx', 'revive'); ev(G, 'spark', F.x - F.f * 20, F.y + 50, 'immune');
      return true;
    },
    (G, F, O) => {   // R: 31.8의 저주
      F.curseT = Math.round(BAL[4].curseSec * SEC);
      note(G, '☠ 31.8의 저주 ☠ 피해 -31.8% · 공격 +31.8% · 반사 31.8%', '#c06bff', 130);
      ev(G, 'sfx', 'roar'); ev(G, 'shake', 12, 6); ev(G, 'aura', F.side, 'press');
      return true;
    },
  ],
  5: [
    (G, F, O) => { spawnProj(G, F, 'nunchaku', 9, 25, 10); return true; },
    (G, F, O) => {
      if (F.jeongP > 0 || F.jeongA > 0) return false;
      F.jeongP = BAL[5].prep; note(G, '正義 준비... (자기 구속)', '#48e0c0', 80); return true;
    },
    (G, F, O) => { if (F.y > 0) return false; F.rushT2 = 30; ev(G, 'sfx', 'charge'); return true; },
    (G, F, O) => {
      if (F.y > 0) return false;
      if (inFront(F, O, 22) && O.chokeT <= 0 && !O.ko) {
        if (disrupt(G, O)) { note(G, '잡기 실패!', '#48e0c0', 60); return true; }
        O.chokeT = BAL[5].chokeMax; O.chokeN = 0; O.chokeTick = 0; F.chokeHold = true;
        O.atk = null; O.laughT = 0; O.fireT = 0; O.dashT = 0; O.headT = 0; O.rushT2 = 0; O.flyT = 0; O.y = 0; O.vy = 0;
        note(G, `Jiu-jitsu 초크! 아무 키나 ${BAL[5].chokeNeed}번 연타해서 탈출!`, '#48e0c0', 120); ev(G, 'sfx', 'hitK'); ev(G, 'shake', 8, 4);
      } else { ev(G, 'sfx', 'miss'); ev(G, 'float', F.x, F.y + 100, '헛잡기', '#aaa'); }
      return true;
    },
  ],
  6: [
    (G, F, O) => { F.meokT = BAL[6].meokT; ev(G, 'sfx', 'chomp'); return true; },
    (G, F, O) => { F.manT = BAL[6].manT; ev(G, 'sfx', 'powerup'); return true; },
    (G, F, O) => { if (!disrupt(G, O)) { O.ttaT = BAL[6].ttaT; note(G, 'ㄸ방해! 상대 회복 봉쇄', '#ff9f43', 90); } ev(G, 'sfx', 'fart'); return true; },
    (G, F, O) => {
      if (F.slim) return false;
      F.slim = true; heal(G, F, BAL[6].bellyHeal, true); addMod(F, 'belly', 'spd', BAL[6].bellySpd, 1e9);
      note(G, '뱃살이 사라졌다!! 몸이 가볍다!', '#ffd27f', 110); ev(G, 'sfx', 'revive'); ev(G, 'revive', F.x, F.y);
      return true;
    },
  ],
  7: [
    (G, F, O) => { spawnProj(G, F, 'gaegura', 9, 25, 11); return true; },
    (G, F, O) => { spawnProj(G, F, 'poison', 10, 25, 8); return true; },
    (G, F, O) => { F.breathN = 3; F.breathT = 0; F.breathHit = false; ev(G, 'sfx', 'fart'); return true; },
    (G, F, O) => {
      const n = F.stk; F.stk = 0;
      if (n > 0) addMod(F, 'burp', 'atk', 1 + BAL[7].burpAtk * n, BAL[7].burpT);
      heal(G, F, BAL[7].burpHeal * Math.max(1, n));
      if (Math.abs(O.x - F.x) < 170) stunTarget(G, O, BAL[7].burpStun * Math.max(1, n));
      note(G, `초거대 트름!! (불쾌지수 ${n})`, '#7dff4d', 100);
      ev(G, 'sfx', 'roar'); ev(G, 'shake', 16, 7); ev(G, 'explosion', F.x + F.f * 20, F.y + 70, F.f);
      return true;
    },
  ],
  8: [
    (G, F, O) => { F.noteN = 3; F.noteT = 10; F.noteSess++; F.noteHits = 0; return true; },
    (G, F, O) => { if (F.board) return false; F.board = true; F.djUsed = false; ev(G, 'sfx', 'powerup'); return true; },
    (G, F, O) => { if (F.y > 0) return false; F.laughT = BAL[8].laughWind; ev(G, 'sfx', 'note1'); return true; },
    (G, F, O) => { F.kcT = BAL[8].kcT; note(G, 'KC! K 또는 C를 연타하라!', '#ff66b3', 100); ev(G, 'sfx', 'powerup'); return true; },
  ],
  9: [
    (G, F, O) => {
      if (!disrupt(G, O)) { O.rootT = Math.max(O.rootT, BAL[9].pressRoot); O.slowT = BAL[9].pressSlow; O.delayT = BAL[9].pressSlow; }
      ev(G, 'shake', 10, 5); ev(G, 'aura', F.side, 'press'); note(G, '압도!', '#c38bff', 60); return true;
    },
    (G, F, O) => { if (!disrupt(G, O)) O.guardOffT = BAL[9].forceT; ev(G, 'aura', F.side, 'force'); note(G, `포스! ${BAL[9].forceT / 60}초간 가드 불가`, '#c38bff', 80); return true; },
    (G, F, O) => { addMod(F, 'rage', 'range', BAL[9].rage, BAL[9].rageT); F.rageT = BAL[9].rageT; note(G, '반장의 분노! 벌점 부여 시작', '#c38bff', 80); ev(G, 'aura', F.side, 'force'); ev(G, 'sfx', 'roar'); return true; },
    (G, F, O) => { F.earT = BAL[9].earT; note(G, '거꾸로 쓴 귀마개: 아무것도 안 들린다', '#c38bff', 100); ev(G, 'sfx', 'powerup'); return true; },
  ],
  10: [
    (G, F, O) => { spawnProj(G, F, 'fart', 6, 24, 14); ev(G, 'sfx', 'fart'); return true; },
    (G, F, O) => {
      ev(G, 'sfx', 'explosion'); ev(G, 'shake', 22, 10); ev(G, 'explosion', F.x, F.y + 40, F.f);
      G.flash = 12;
      note(G, '☢️ 매미킴 독 폭발! ☢️', '#7dff4d', 100);
      if (Math.abs(O.x - F.x) <= 80 + radius(O) * 0.5 && Math.abs(O.y - F.y) < 60) {
        const res = applyDamage(G, F, O, (ATK.pBase + ATK.pStep) * F.mul * BAL[10].explMul, 'TOXIC_EXPLOSION');
        if (res === 'hit') { O.poisT = BAL[10].poisT; O.poisTick = 0; O.poisDmg = BAL[10].poisTick; O.kb = sign(O.x - F.x) * 6; O.hitT = Math.max(O.hitT, 18); ev(G, 'poison', O.x, O.y + 50); }
      }
      return true;
    },
    (G, F, O) => { const v = BAL[10].leg; addMod(F, 'leg1', 'spd', v, BAL[10].legT); addMod(F, 'leg2', 'kdmg', v, BAL[10].legT); addMod(F, 'leg3', 'krange', v, BAL[10].legT); note(G, '다리 회복 완료!', '#9fc3e6', 80); ev(G, 'sfx', 'powerup'); return true; },
    (G, F, O) => { if (F.y > 0) return false; F.shutT = 16; ev(G, 'sfx', 'swing2'); return true; },
  ],
  11: [
    (G, F, O) => {
      const pool = [];
      for (const c of SELECT_ORDER) for (const s of [0, 1]) pool.push([c, s]);
      const [c, s] = pool[Math.floor(rnd() * pool.length)];
      const nm = skillDef(c, s).name;
      SK[c][s](G, F, O, null);
      note(G, `Tirón ai 딸깍! [${CHARS[c].name}]의 '${nm}' 카피 발동!`, '#ff9f43', 100);
      return true;
    },
    (G, F, O) => { if (!disrupt(G, O)) O.rootT = Math.max(O.rootT, BAL[11].majRoot); F.boostT = BAL[11].majBoost; ev(G, 'shake', 10, 5); ev(G, 'sfx', 'roar'); return true; },
    (G, F, O) => { if (F.yank) return false; F.yank = true; note(G, '양크! 이제 모든 공격이 50% 확률로 2배', '#ff9f43', 100); ev(G, 'sfx', 'roar'); return true; },
    (G, F, O) => { F.fireT = BAL[11].fireT; ev(G, 'sfx', 'explosion'); ev(G, 'shake', 8, 4); return true; },
  ],
  12: [
    (G, F, O) => {
      if (disrupt(G, O)) { note(G, '해킹 실패! 은맘이 막았다', '#ff8fb3', 80); return true; }
      const own = [0, 1, 2, 3].filter((s) => skillDef(O.c, s));
      let avail = own.filter((s) => O.seal[s] <= 0);
      if (!avail.length) avail = own;
      const s = avail[Math.floor(rnd() * avail.length)];
      O.seal[s] = BAL[12].sealSec * SEC;
      F.copy = { c: O.c, s };
      const nm = skillDef(O.c, s).name;
      ev(G, 'hack', F.side); ev(G, 'sfx', 'hack');
      note(G, `해킹 성공! ${CHARS[O.c].name}의 '${nm}' ${BAL[12].sealSec}초 봉인 + 복제 완료`, '#00e676', 120);
      return true;
    },
    (G, F, O) => { F.headT = 14; F.headHit = false; F.spikeT = BAL[12].spikeT; ev(G, 'sfx', 'charge'); return true; },
    (G, F, O) => { const v = BAL[12].grow, T = BAL[12].growT; addMod(F, 'grow1', 'range', v, T); addMod(F, 'grow2', 'size', v, T); note(G, '난쟁이의 희망! 몸이 커진다', '#00e676', 80); ev(G, 'sfx', 'powerup'); return true; },
    (G, F, O) => {
      if (G.dice || G.yut) return false;
      G.yut = { o: F.side, t: 50, res: 0, pop: 0 };
      G.freezeT = Math.max(G.freezeT, 50 + 50);
      ev(G, 'sfx', 'dice'); return true;
    },
  ],
  13: [
    (G, F, O) => { if (F.y > 0) return false; F.kkT = 9; return true; },
    (G, F, O) => { spawnProj(G, F, 'makgeolli', 6.5, 40, 9); ev(G, 'sfx', 'swing'); return true; },
    (G, F, O) => {
      F.hp = Math.max(1, F.hp - BAL[13].jjinSelf); ev(G, 'float', F.x, F.y + 90, '-' + BAL[13].jjinSelf, '#ff7b7b');
      stunTarget(G, O, BAL[13].jjinStun);
      note(G, '찐이야~! 상대 정신 못 차림', '#e84393', 90); ev(G, 'sfx', 'roar'); ev(G, 'shake', 10, 5); ev(G, 'aura', F.side, 'press');
      return true;
    },
    (G, F, O) => { addMod(F, 'form', 'all', BAL[13].form, BAL[13].formT); note(G, '폼 미쳤다!! 모든 능력치 +30%', '#e84393', 100); ev(G, 'sfx', 'powerup'); ev(G, 'aura', F.side, 'force'); return true; },
  ],
};

function useSkill(G, F, O, slot, inp) {
  // 힌참휴: 복제한 스킬이 있으면 Q로 1회 사용
  if (F.c === HINCHAM && slot === 0 && F.copy) {
    const cp = F.copy; F.copy = null;
    SK[cp.c][cp.s](G, F, O, inp);
    F.castT = 18;
    note(G, `복제 스킬 '${skillDef(cp.c, cp.s).name}' 발동!`, '#00e676', 80);
    ev(G, 'sfx', 'skill');
    return;
  }
  const def = skillDef(F.c, slot);
  if (!def) return;                               // 빈 슬롯
  if (F.seal[slot] > 0) { ev(G, 'sfx', 'deny'); return; }
  if (F.cd[slot] > 0) return;
  if (def.heal && F.ttaT > 0) { ev(G, 'sfx', 'deny'); ev(G, 'float', F.x, F.y + 100, 'ㄸ방해 중!', '#ff9f43'); return; }
  if (SK[F.c][slot](G, F, O, inp)) {
    let cd = SLOT_CD[slot];
    if (F.awake) cd = Math.max(1, cd - BAL[9].awakeCd);
    if (!(F.c === 8 && slot === 1)) F.cd[slot] = cd * SEC;   // 보드는 파괴될 때 쿨타임 시작
    // 이은뚱 패시브 31.8: 더블다운을 한 번 더 쓸 수 있음
    if (F.c === 4 && slot === 0) {
      if (F.ddFree) F.ddFree = false;
      else if (rnd() < BAL[4].ddTwice) { F.ddFree = true; F.cd[0] = 0; note(G, '31.8%! 더블다운 한 번 더!', '#ffb36b', 80); }
    }
    // 독민재B 패시브 불쾌지수
    if (F.c === 7) F.stk = Math.min(BAL[7].stackMax, F.stk + 1);
    F.castT = 18;
    ev(G, 'sfx', 'skill');
    ev(G, 'call', F.side, def.name);
  }
}

// ---------- 근접 공격 ----------
function startAttack(G, F, O, type) {
  let dur = type === 'P' ? 14 : 22, act = type === 'P' ? 3 : 6;
  let mult = 1;
  if (F.delayT > 0) mult *= 1.6;      // 창가오 압도: 딜레이 증가
  if (F.awake) mult /= BAL[9].awakeMul; // 창가오 각성: 공속 증가
  mult /= stat(F, 'aspd');
  dur = Math.round(dur * mult); act = Math.max(2, Math.round(act * mult));
  let dmg;
  if (type === 'P') {
    F.combo = F.comboT > 0 ? (F.combo % 3) + 1 : 1;
    F.comboT = 40;
    dmg = ATK.pBase + F.combo * ATK.pStep;
  } else {
    const step = F.comboT > 0 && F.combo > 0 ? F.combo : 1;
    dmg = (ATK.pBase + step * ATK.pStep) * ATK.kickMul;
    F.combo = 0; F.comboT = 0;
  }
  dmg *= F.mul;
  if (F.c === 4 && (O.c === 1 || O.c === 2)) dmg *= 1 + BAL[4].friend;
  if (F.c === 5) dmg *= 1 + BAL[5].atkUp;
  F.atk = type; F.atkT = 0; F.atkDur = dur; F.atkAct = act; F.atkDmg = dmg; F.atkDone = false; F.atkStep = F.combo;
  ev(G, 'sfx', type === 'P' ? 'swing' : 'swing2');
}

function reachOf(F, type) {
  return (type === 'P' ? ATK.pReach : ATK.kReach * stat(F, 'krange')) * lookOf(F).H * stat(F, 'range');
}
function meleeHit(G, F, O) {
  const reach = reachOf(F, F.atk);
  const dx = O.x - F.x;
  if (O.ko) return;
  const inR = (x, y) => Math.abs(x - F.x) <= radius(F) + radius(O) + reach - 10 && sign(x - F.x) === F.f && Math.abs(y - F.y) < 52;
  const C = O.clone;
  if (C && C.hp > 0 && inR(C.x, C.y) && (!inR(O.x, O.y) || Math.abs(C.x - F.x) < Math.abs(dx))) {
    cloneHit(G, O, F.atkDmg * stat(F, 'atk') * (F.atk === 'K' ? stat(F, 'kdmg') : 1));
    G.hitStop = 4; ev(G, 'spark', C.x - F.f * 8, C.y + 55, 'hit'); ev(G, 'sfx', F.atk === 'K' ? 'hitK' : 'hitP');
    return;
  }
  if (inR(O.x, O.y)) {
    const isK = F.atk === 'K';
    const res = applyDamage(G, F, O, F.atkDmg, isK ? 'KICK' : 'PUNCH');
    const hy = O.y + (isK ? 45 : 62) * lookOf(O).H;
    const hx = O.x - F.f * radius(O) * 0.6;
    if (F.c === 7 && isK && O.poisT > 0 && (res === 'hit' || res === 'block')) {
      O.poisT += BAL[7].footExt; ev(G, 'float', O.x, O.y + 90, '발냄새 +' + BAL[7].footExt / 60 + '초', '#a8ff60');
    }
    if (res === 'hit' && F.rageT > 0 && !disrupt(G, O)) { addMod(O, 'pen', 'spd', 1 - BAL[9].penSlow, BAL[9].penT); ev(G, 'float', O.x, O.y + 104, '벌점!', '#c38bff'); }
    if (res === 'hit') {
      O.hitT = isK ? 15 : 11;
      O.kb = F.f * (isK ? 4.2 : 2.2) * (F.atkStep === 3 ? 1.6 : 1);
      if (O.y > 0) { O.vy = 3; O.vx = F.f * 1.5; }
      G.hitStop = isK ? 7 : 5;
      O.combo_recv = O.hitT > 0 && O.comboShowT > 0 ? O.combo_recv + 1 : 1;
      O.comboShowT = 60;
      ev(G, 'spark', hx, hy, isK ? 'big' : 'hit'); ev(G, 'sfx', isK ? 'hitK' : 'hitP');
      ev(G, 'shake', isK ? 6 : 3, isK ? 4 : 2);
      O.hitFlash = 4;
    } else if (res === 'mom') {
      G.hitStop = 3; ev(G, 'sfx', 'block');
    } else if (res === 'block') {
      O.blockT = 8;
      if (O.c !== 0) O.kb = F.f * (isK ? 3.4 : 1.4);
      G.hitStop = 4;
      ev(G, 'spark', hx, hy, 'guard'); ev(G, 'sfx', 'block');
    }
  } else {
    ev(G, 'sfx', 'miss');
  }
}

// ---------- 지속형 스킬 상태 처리 ----------
function stepSkillStates(G, F, O, inp) {
  const H = lookOf(F).H;
  // 사명감 Jiu-jitsu: 잡힌 쪽에서 처리 (연타로 탈출)
  if (F.chokeT > 0) {
    const holder = O;
    F.chokeT--; F.chokeN += (inp && inp.a) || 0; F.chokeTick++;
    F.x = holder.x + holder.f * Math.max(14, radius(holder) + radius(F) - 18); F.y = 0; F.vx = 0; F.kb = 0; clampX(F);
    if (F.chokeTick >= 60) { F.chokeTick = 0; applyDamage(G, holder, F, BAL[5].chokeDps, 'CHOKE', { fixed: true }); ev(G, 'sfx', 'hitP'); ev(G, 'shake', 4, 2); }
    const escaped = F.chokeN >= BAL[5].chokeNeed;
    if (escaped || F.chokeT <= 0 || holder.ko || F.ko) {
      F.chokeT = 0; holder.chokeHold = false;
      if (escaped) { holder.stunT = Math.max(holder.stunT, 30); F.kb = -holder.f * -4; note(G, '초크 탈출!', '#7dff9a', 70); ev(G, 'sfx', 'parry'); }
    }
  }
  if (F.chokeHold && O.chokeT <= 0) F.chokeHold = false;
  // 힙찔 강 KC: K/C 누를 때마다 고정 피해
  if (F.kcT > 0 && inp && inp.keys) {
    let n = 0; for (const ch of inp.keys) if (ch === 'K' || ch === 'C') n++;
    for (let i = 0; i < Math.min(n, 3); i++) {
      applyDamage(G, F, O, BAL[8].kcDmg, 'KC', { fixed: true });
      ev(G, 'float', O.x + (rnd() - 0.5) * 30, O.y + 70 + rnd() * 30, i % 2 ? 'C' : 'K', '#ff66b3');
    }
    if (n) ev(G, 'sfx', 'note' + (1 + (F.kcT % 3)));
  }
  // 힙찔 강 특유의 웃음
  if (F.laughT > 0) {
    if (F.hitT > 0 || F.stunT > 0) { F.laughT = 0; ev(G, 'float', F.x, F.y + 100, '웃음 끊김', '#aaa'); }
    else if (--F.laughT === 0) {
      if (inFront(F, O, BAL[8].laughReach, 40)) {
        const res = applyDamage(G, F, O, BAL[8].laughDmg, 'LAUGH', { fixed: true });
        if (res === 'hit' || res === 'mom') { G.hitStop = 12; ev(G, 'shake', 22, 10); ev(G, 'sfx', 'explosion'); G.flash = 10; note(G, '크하하하핳!!! (300)', '#ff66b3', 100); }
      } else { ev(G, 'sfx', 'miss'); ev(G, 'float', F.x, F.y + 100, '헛웃음..', '#aaa'); }
    }
  }
  // 독민재B 입냄새
  if (F.breathN > 0) {
    if (++F.breathT >= 10) {
      F.breathT = 0; F.breathN--;
      if (inFront(F, O, 55, 60)) {
        const res = applyDamage(G, F, O, BAL[7].breathDmg, 'BREATH');
        if (res === 'hit' || res === 'block') { F.breathHit = true; O.hitT = Math.max(O.hitT, 8); ev(G, 'poison', O.x, O.y + 70); }
      }
      if (F.breathN === 0 && F.breathHit && !disrupt(G, O)) {
        O.stunT = Math.max(O.stunT, BAL[7].breathStun); O.hbT = Math.max(O.hbT, BAL[7].breathHB); O.atk = null;
        ev(G, 'float', O.x, O.y + 100, '기절 + 회복 불가', '#a8ff60');
      }
    }
  }
  // Tirón 파이어 브레스
  if (F.fireT > 0) {
    F.fireT--;
    if (inFront(F, O, 110, 70)) applyDamage(G, F, O, BAL[11].fireDmg, 'FIRE');
  }
  // 죽림고수 플라잉 바르셀로나 어택
  if (F.flyT > 0) {
    F.flyT--;
    const k = 1 - F.flyT / 40;
    F.x = lerp(F.flyFrom, F.flyX, k); F.y = Math.sin(Math.PI * k) * 80; F.vx = 0; F.vy = 0;
    if (F.flyT === 0) {
      F.y = 0; ev(G, 'land', F.side); ev(G, 'shake', 14, 6); ev(G, 'sfx', 'explosion'); ev(G, 'spark', F.x, 6, 'big');
      if (Math.abs(O.x - F.x) <= radius(F) + radius(O) + 8 && O.y < 30) {
        const res = applyDamage(G, F, O, BAL[3].flyDmg, 'FLYING', { fixed: true });
        if (res === 'hit') { O.hitT = Math.max(O.hitT, 26); O.kb = sign(O.x - F.x) * 6; G.hitStop = 10; }
      }
    }
  }
  // 사명감 분노의 질주
  if (F.rushT2 > 0) {
    F.rushT2--; F.x += F.f * 6.5; clampX(F);
    if (F.anim % 2 === 0) ev(G, 'ghost', F.side);
    if (inFront(F, O, 4, 50)) {
      F.rushT2 = 0;
      const res = applyDamage(G, F, O, BAL[5].rushDmg, 'RUSH');
      if (res === 'hit') { O.kb = F.f * 7; stunTarget(G, O, BAL[5].rushStun); G.hitStop = 8; ev(G, 'shake', 10, 5); ev(G, 'sfx', 'hitK'); }
      else if (res === 'block') { O.kb = F.f * 4; ev(G, 'sfx', 'block'); }
    }
  }
  // 영탁 꺾어
  if (F.kkT > 0 && --F.kkT === 3) {
    if (inFront(F, O, 26)) {
      const res = applyDamage(G, F, O, BAL[13].kkDmg, 'KKEOK', { fixed: true });
      if (res === 'hit') { O.hitT = Math.max(O.hitT, 14); ev(G, 'float', O.x, O.y + 100, '꺾어~♪', '#e84393'); ev(G, 'sfx', 'hitP'); }
    } else ev(G, 'sfx', 'miss');
  }
  // 매미킴 배드민턴 스매시
  if (F.shutT > 0 && --F.shutT === 0) { spawnProj(G, F, 'shuttle', 15, 40, 6); ev(G, 'sfx', 'whoosh'); ev(G, 'shake', 5, 3); }
  // mola 분신
  if (F.clone) {
    const C = F.clone;
    C.t--; C.anim++; if (C.hit > 0) C.hit--;
    let side = sign(O.x - F.x); if (F.x === O.x) side = 1;
    if (C.anim % 90 === 0) C.off = rnd() * 30;
    const tx = clamp(O.x + side * (radius(O) + radius(F) + 10 + C.off), 20, ARENA_W - 20);
    const dx = tx - C.x;
    C.vx = Math.abs(dx) > 3 ? sign(dx) * 2.8 : 0; C.x += C.vx;
    if (C.y <= 0 && rnd() < 0.006) C.vy = 7;
    if (C.y > 0 || C.vy > 0) { C.vy -= 0.36; C.y += C.vy; if (C.y <= 0) { C.y = 0; C.vy = 0; } }
    const minD = radius(F) + radius(O) - 4;
    if (Math.abs(C.x - O.x) < minD && Math.abs(C.y - O.y) < 60) C.x = O.x + (C.x >= O.x ? 1 : -1) * minD;
    C.x = clamp(C.x, 20, ARENA_W - 20);
    C.f = O.x > C.x ? 1 : -1;
    if (C.t <= 0) { F.clone = null; ev(G, 'spark', C.x, C.y + 50, 'immune'); }
  }
}

// ---------- 캐릭터 한 명 프레임 처리 ----------
const dec = (F, k) => { if (F[k] > 0) F[k]--; };
function stepFighter(G, F, O, inp) {
  const L = lookOf(F), H = L.H;
  F.anim++;
  for (const k of ['stimT', 'meokT', 'manT', 'parryT', 'parryR', 'slowT', 'delayT', 'guardOffT', 'boostT', 'spikeT', 'hitT', 'blockT', 'castT', 'angerT', 'hitFlash', 'recov', 'comboShowT', 'rootT',
    'stunT', 'hbT', 'ttaT', 'invisT', 'drunkT', 'earT', 'rageT', 'kcT']) dec(F, k);
  if (F.mods.length) { for (const m of F.mods) m.t--; F.mods = F.mods.filter((m) => m.t > 0); }
  F.sz = 1; for (const m of F.mods) if (m.k === 'size') F.sz *= m.v;
  // 영탁 막걸리: 방향키 반대 + 가드/점프 반대
  if (F.drunkT > 0 && inp) {
    const sw = (v) => (v & ~(B_L | B_R | B_U | B_D)) | (v & B_L ? B_R : 0) | (v & B_R ? B_L : 0) | (v & B_U ? B_D : 0) | (v & B_D ? B_U : 0);
    inp = { h: sw(inp.h), p: sw(inp.p), keys: inp.keys, a: inp.a };
  }
  stepSkillStates(G, F, O, inp);
  for (let s = 0; s < 4; s++) { if (F.cd[s] > 0) F.cd[s]--; if (F.seal[s] > 0) F.seal[s]--; }
  if (F.comboT > 0) { F.comboT--; if (F.comboT === 0) F.combo = 0; }
  if (F.jeongP > 0) { F.jeongP--; if (F.jeongP === 0) { F.jeongA = BAL[5].act; note(G, `正義 발동! ${(BAL[5].act / 60).toFixed(1)}초간 공격 무효`, '#48e0c0', 80); ev(G, 'sfx', 'powerup'); } }
  dec(F, 'jeongA'); dec(F, 'curseT');
  if (F.momT > 0) { F.momT--; if (F.momT === 0 && F.momHp > 0) { F.momHp = 0; note(G, '은맘이 돌아갔다', '#ff8fb3', 60); } }
  // 독
  if (F.poisT > 0) {
    F.poisT--; F.poisTick++;
    if (F.poisTick >= 60) {
      F.poisTick = 0;
      if (momAlive(F)) { momTake(G, F, F.poisDmg); } else F.hp -= F.poisDmg; ev(G, 'poison', F.x, F.y + 50 * H); ev(G, 'float', F.x, F.y + 80 * H, String(F.poisDmg), '#7dff4d');
      checkKO(G, F);
    }
  }
  // mola008X 패시브: 8초마다 체력 10 회복
  if (F.c === 1) { F.regenT++; if (F.regenT >= BAL[1].regenSec * SEC) { F.regenT = 0; if (F.hp < F.maxHp) heal(G, F, BAL[1].regen); } }
  // 매미킴 패시브: 시한폭탄
  if (F.c === 10) {
    const red = BAL[10].bombRed;
    if (!F.maemOwn && F.hp <= F.maxHp * 0.5) { F.maemOwn = true; F.cd[1] = Math.max(0, F.cd[1] - red * SEC); note(G, `매미킴 시한폭탄! 독 폭발 쿨 -${red}초`, '#ff7b3b', 80); }
    if (!F.maemEnemy && O.hp <= O.maxHp * 0.5) { F.maemEnemy = true; F.cd[1] = Math.max(0, F.cd[1] - red * SEC); note(G, `매미킴 시한폭탄! 독 폭발 쿨 -${red}초`, '#ff7b3b', 80); }
  }
  // 연발 스킬
  if (F.rushN > 0) { F.rushT++; if (F.rushT >= 8) { F.rushT = 0; F.rushN--; spawnProj(G, F, 'tooth', 8.5, 18, 6); ev(G, 'sfx', 'tooth'); } }
  if (F.noteN > 0) {
    F.noteT++;
    if (F.noteT >= 10) {
      F.noteT = 0; F.noteN--;
      const ratio = F.c !== O.c ? BAL[8].noteDiff : BAL[8].noteSame;
      spawnProj(G, F, 'note', 8.5, 25, 7, { dmg: (ATK.pBase + ATK.pStep) * F.mul * ratio, sess: F.noteSess, k: 3 - F.noteN });
      ev(G, 'sfx', 'note' + (3 - F.noteN));
    }
  }

  const grounded = F.y <= 0;
  const fx = faceX(F, O);
  if (fx !== F.x && !F.flyT) F.f = fx > F.x ? 1 : -1;

  const stunned = F.hitT > 0 || F.blockT > 0 || F.stunT > 0 || F.chokeT > 0 || F.chokeHold;
  const busy = busyOf(F);
  const canMove = F.rootT <= 0 && F.jeongP <= 0;
  const h = inp ? inp.h : 0, p = inp ? inp.p : 0;

  // 가드
  F.guard = !stunned && !busy && grounded && !!(h & B_D) && F.guardOffT <= 0 && !F.atk && F.dashT <= 0 && F.headT <= 0;
  if (F.blockT > 0 && F.guardOffT <= 0) F.guard = true;

  let speed = 2.3;
  if (F.c === 3) speed *= BAL[3].spd;
  if (F.boostT > 0) speed *= 1 + BAL[11].majSpd;
  if (F.awake) speed *= BAL[9].awakeMul;
  if (F.board) speed *= BAL[8].boardSpd;
  if (F.slowT > 0) speed *= 0.5;
  speed *= stat(F, 'spd');
  if (F.invisT > 0) speed *= BAL[2].invisSpd;
  const dir = (h & B_R ? 1 : 0) - (h & B_L ? 1 : 0);

  if (!stunned) {
    if (grounded) {
      if (!F.guard && !F.atk && canMove && !busy && F.dashT <= 0 && F.headT <= 0) F.vx = dir * speed * (dir === F.f ? 1 : 0.85);
      else F.vx = 0;
    }
    if (p & B_U) {
      if (grounded && canMove && !busy && !F.atk && !F.guard && F.dashT <= 0 && F.headT <= 0) {
        F.vy = 7.3; F.vx = dir * speed * 1.1; F.djUsed = false; ev(G, 'sfx', 'jump');
      } else if (!grounded && F.board && !F.djUsed) {
        F.vy = 6.6; F.djUsed = true; F.vx = dir * speed * 1.1; ev(G, 'sfx', 'jump'); ev(G, 'spark', F.x, F.y + 4, 'dust');
      }
    }
    const canAtk = !F.atk && F.recov <= 0 && !F.guard && !busy && F.dashT <= 0 && F.headT <= 0;
    if (canAtk && (p & B_P)) startAttack(G, F, O, 'P');
    else if (canAtk && (p & B_K)) startAttack(G, F, O, 'K');
    for (let s = 0; s < 4; s++) if (!F.guard && !busyOf(F) && !G.qte && !G.yut && (p & B_SK[s])) useSkill(G, F, O, s, inp);
  } else if (grounded) F.vx = 0;

  // 공격 진행
  if (F.atk) {
    F.atkT++;
    if (F.atkT === F.atkAct && !F.atkDone) { F.atkDone = true; meleeHit(G, F, O); }
    if (F.atkT >= F.atkDur) { F.atk = null; F.recov = 2; }
    if (stunned && (F.hitT > 0 || F.stunT > 0 || F.chokeT > 0)) F.atk = null;
  }
  // 대시 (JJjin)
  if (F.dashT > 0) { F.dashT--; F.x += F.dashDir * 12; if (F.anim % 2 === 0) ev(G, 'ghost', F.side); }
  // 박치기 (힌참휴)
  if (F.headT > 0) {
    F.headT--;
    if (F.headT > 6) F.x += F.f * 3.2;
    if (F.headT === 7 && !F.headHit) {
      F.headHit = true;
      const dx = O.x - F.x;
      if (Math.abs(dx) <= radius(F) + radius(O) + 18 && sign(dx) === F.f && Math.abs(O.y - F.y) < 50) {
        const res = applyDamage(G, F, O, BAL[12].headDmg, 'HEADBUTT', { fixed: true });
        if (res === 'hit') { O.hitT = 16; O.kb = F.f * 5; G.hitStop = 7; ev(G, 'spark', O.x - F.f * radius(O) * 0.5, O.y + 75 * lookOf(O).H, 'big'); ev(G, 'sfx', 'hitK'); ev(G, 'shake', 8, 5); }
      } else ev(G, 'sfx', 'miss');
    }
  }

  // 물리
  if (F.flyT > 0) { /* 플라잉 어택 중에는 궤적을 직접 계산 */ }
  else if (!grounded || F.vy > 0) {
    F.vy -= 0.36;
    F.y += F.vy;
    if (canMove || F.vy > 0) F.x += F.vx;
    if (F.y <= 0) { F.y = 0; F.vy = 0; F.vx = 0; F.djUsed = false; ev(G, 'land', F.side); }
  } else {
    F.x += F.vx;
  }
  if (F.kb) { F.x += F.kb; F.kb *= 0.8; if (Math.abs(F.kb) < 0.1) F.kb = 0; }
}

// ---------- 공통 정리 ----------
function resolveBodies(G) {
  const [a, b] = G.F;
  const minD = radius(a) + radius(b) - 4;
  const d = b.x - a.x;
  if (Math.abs(d) < minD && Math.abs(a.y - b.y) < 60 && !a.chokeT && !b.chokeT) {
    const ov = (minD - Math.abs(d)) / 2;
    const s = d === 0 ? (a.side === 0 ? 1 : -1) : sign(d);
    a.x -= s * ov; b.x += s * ov;
  }
  for (const F of G.F) clampX(F);
  // 한 화면 안에 머물기
  const sep = Math.abs(b.x - a.x);
  if (sep > MAX_SEP) {
    const ex = (sep - MAX_SEP) / 2, s = sign(b.x - a.x);
    a.x += s * ex; b.x -= s * ex;
  }
  for (const F of G.F) clampX(F);
  // 이동과 충돌이 끝난 동일한 좌표를 기준으로 두 방향을 함께 갱신한다. (mola 분신이 더 가까우면 분신을 바라봄)
  if (a.x !== b.x) {
    for (const [F, O] of [[a, b], [b, a]]) { if (F.flyT > 0) continue; const x = faceX(F, O); if (x !== F.x) F.f = x > F.x ? 1 : -1; }
  }
}

// ---------- 메인 스텝 ----------
function stepGame(G, inputs) {
  G.pt++;
  for (const n of G.notes) n.life--;
  G.notes = G.notes.filter((n) => n.life > 0);
  if (G.flash > 0) G.flash--;

  if (G.phase === 'intro') {
    if (G.pt === 1) ev(G, 'announce', 'round', G.round);
    if (G.pt === 75) ev(G, 'announce', 'fight');
    if (G.pt >= 110) { G.phase = 'fight'; G.pt = 0; }
    for (const F of G.F) { F.anim++; F.f = G.F[1 - F.side].x > F.x ? 1 : -1; }
    return;
  }
  if (G.phase === 'ko') {
    for (const F of G.F) {
      F.anim++;
      if (F.y > 0 || F.vy > 0) { F.vy -= 0.36; F.y += F.vy; F.x += F.vx; if (F.y <= 0) { F.y = 0; F.vy = 0; F.vx = 0; } }
      if (F.kb) { F.x += F.kb; F.kb *= 0.85; if (Math.abs(F.kb) < 0.1) F.kb = 0; }
    }
    resolveBodies(G);
    if (G.pt === 100 && G.rw >= 0) ev(G, 'announce', 'winround', G.rw);
    if (G.pt >= 200) {
      const [a, b] = G.F;
      if (a.wins >= WIN_ROUNDS || b.wins >= WIN_ROUNDS || G.round >= 5) {
        G.phase = 'end'; G.pt = 0;
        G.mw = a.wins === b.wins ? -1 : a.wins > b.wins ? 0 : 1;
        ev(G, 'announce', 'match', G.mw);
      } else {
        G.round++;
        resetRound(G);
      }
    }
    return;
  }
  if (G.phase === 'end') { for (const F of G.F) F.anim++; return; }

  // ---- fight ----
  if (G.qte) {
    stepQTE(G, inputs);
    for (const F of G.F) F.anim++;
    endCheck(G);
    return;
  }
  if (G.freezeT > 0) {
    G.freezeT--;
    if (G.yut) {
      const y = G.yut;
      if (y.t > 0) {
        y.t--;
        if (y.t % 5 === 0) ev(G, 'sfx', 'tick');
        if (y.t === 0) {
          y.res = rnd() < BAL[12].moP ? 5 : 1; y.pop = 50;
          const C = G.F[y.o], T = G.F[1 - y.o];
          const dmg = y.res === 5 ? Math.max(1, T.hp * BAL[12].moPct) : 1;
          y.dmg = Math.round(dmg * 10) / 10;
          const res = applyDamage(G, C, T, dmg, 'YUT', { fixed: true });
          if (res === 'hit' && y.res === 5) { T.hitT = 20; ev(G, 'spark', T.x, T.y + 60, 'big'); ev(G, 'shake', 14, 7); }
          ev(G, 'sfx', y.res === 5 ? 'jackpot' : 'deny');
          note(G, y.res === 5 ? `🥢 모!!! 상대 체력 절반 (${y.dmg})` : '🥢 도... (1 피해)', y.res === 5 ? '#ffcc33' : '#aaa', 100);
        }
      } else if (y.pop > 0) { y.pop--; if (y.pop === 0) G.yut = null; }
    }
    if (G.dice) {
      const d = G.dice;
      if (d.t > 0) {
        d.t--;
        d.val = 1 + Math.floor(rnd() * 6);
        if (d.t % 4 === 0) ev(G, 'sfx', 'tick');
        if (d.t === 0) {
          d.res = 1 + Math.floor(rnd() * 6); d.val = d.res; d.pop = 45;
          const C = G.F[d.o], T = G.F[1 - d.o];
          let dmg = d.res * BAL[4].dicePer * C.mul;
          if (C.c === 4 && (T.c === 1 || T.c === 2)) dmg *= 1 + BAL[4].friend;
          const res = applyDamage(G, C, T, dmg, 'DICE');
          if (res === 'hit') { T.hitT = 18; ev(G, 'spark', T.x, T.y + 60, 'big'); ev(G, 'shake', 10, 6); }
          ev(G, 'sfx', d.res >= 5 ? 'jackpot' : 'hitK');
          note(G, `🎲 하츠 스테리오: ${d.res}! (${Math.round(dmg)} 데미지)`, '#ffcc33', 90);
        }
      } else if (d.pop > 0) { d.pop--; if (d.pop === 0) G.dice = null; }
    }
    for (const F of G.F) F.anim++;
    endCheck(G);
    return;
  }
  if (G.hitStop > 0) { G.hitStop--; return; }

  G.roundF++;
  G.timer--;
  if (G.roundF === BAL[9].awakeSec * SEC) {
    for (const F of G.F) if (F.c === 9) { F.awake = true; }
    if (G.F.some((F) => F.c === 9)) { note(G, '🔥 가오가 온몸을 지배했습니다 🔥', '#d580ff', 150); ev(G, 'sfx', 'roar'); }
  }
  const [a, b] = G.F;
  stepFighter(G, a, b, inputs[0]);
  stepFighter(G, b, a, inputs[1]);
  resolveBodies(G);
  updateProjectiles(G);
  endCheck(G);
}

function endCheck(G) {
  if (G.phase !== 'fight') return;
  const [a, b] = G.F;
  let ended = false;
  if (a.ko || b.ko) {
    ended = true; G.koType = 'KO';
    if (a.ko && b.ko) G.rw = -1; else G.rw = a.ko ? 1 : 0;
  } else if (G.timer <= 0) {
    ended = true; G.koType = 'TIME';
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    G.rw = Math.abs(ra - rb) < 0.001 ? -1 : ra > rb ? 0 : 1;
  }
  if (!ended) return;
  G.phase = 'ko'; G.pt = 0; G.freezeT = 0; G.dice = null; G.hitStop = 0; G.qte = null; G.yut = null;
  G.proj = [];
  if (G.rw === -1) { a.wins++; b.wins++; }
  else {
    const W = G.F[G.rw];
    W.wins++;
    G.perfect = W.hp >= W.maxHp - 0.01;
  }
  for (const F of G.F) {
    F.atk = null; F.guard = false; F.dashT = 0; F.headT = 0;
    for (const k of ['hitFlash', 'stimT', 'meokT', 'manT', 'jeongA', 'jeongP', 'parryT', 'rootT', 'guardOffT', 'slowT', 'poisT', 'hitT', 'blockT', 'castT', 'spikeT', 'angerT', 'rushN', 'noteN', 'momHp', 'momT', 'curseT',
      'stunT', 'hbT', 'ttaT', 'invisT', 'drunkT', 'earT', 'rageT', 'kcT', 'laughT', 'breathN', 'fireT', 'flyT', 'rushT2', 'chokeT', 'kkT', 'shutT']) F[k] = 0;
    F.chokeHold = false; F.clone = null; F.mods = F.mods.filter((m) => m.id === 'belly'); F.sz = 1;
    if (F.ko) { F.vy = 4; F.vx = -F.f * 2.2; F.y = Math.max(F.y, 0.1); }
  }
  ev(G, 'announce', G.koType === 'KO' ? 'ko' : 'time');
  ev(G, 'sfx', 'ko');
}
