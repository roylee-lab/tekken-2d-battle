// ============================================================
//  캐릭터 / 나라 데이터
// ============================================================
const COUNTRIES = {
  KR: { name: '대한민국', en: 'KOREA' },
  FR: { name: '프랑스', en: 'FRANCE' },
  VN: { name: '베트남', en: 'VIETNAM' },
  CN: { name: '중국', en: 'CHINA' },
  BR: { name: '브라질', en: 'BRAZIL' },
  IT: { name: '이탈리아', en: 'ITALY' },
  EG: { name: '이집트', en: 'EGYPT' },
  US: { name: '미국', en: 'USA' },
  IN: { name: '인도', en: 'INDIA' },
  ES: { name: '스페인', en: 'SPAIN' },
  JP: { name: '일본', en: 'JAPAN' },
};

// look 파라미터: H=키 배율, 체형 수치는 기본 키(H=1) 기준 픽셀
const BASE_BUILD = { torsoW: 15, waistW: 12, belly: 0, thigh: 6.5, shin: 5.5, arm: 5, fore: 4.5, headR: 8.5, muscle: 0, hips: 0 };
function build(o) { return Object.assign({}, BASE_BUILD, o); }

// ---------- 스킬 슬롯 / 밸런스 수치 (밸런스 패치는 여기만 고치면 됨) ----------
const SLOT_KEYS = ['Q', 'W', 'E', 'R'];
const SLOT_CD = [5, 10, 30, 60];               // 슬롯별 쿨타임(초)
const SLOT_CD_START = [5, 10, 20, 30];         // 라운드 시작 시 첫 쿨타임(초)
function cdText(k, c) {
  const d = c !== undefined && skillDef(c, k);
  if (d && d.cd) return `${d.cd}초`;   // 보스처럼 자기 쿨타임이 있는 스킬
  return SLOT_CD_START[k] !== SLOT_CD[k] ? `첫 ${SLOT_CD_START[k]}초 · 이후 ${SLOT_CD[k]}초` : `${SLOT_CD[k]}초`;
}
const HITBOX = [   // tools/hitbox.cjs 로 측정 (p 주먹끝, k 발끝, f 몸통 앞면, h 키)
  { p: 59, k: 73, f: 17, h: 107 },   // 0
  { p: 59, k: 73, f: 17, h: 107 },   // 1
  { p: 56, k: 69, f: 16, h: 101 },   // 2
  { p: 59, k: 73, f: 17, h: 113 },   // 3
  { p: 60, k: 74, f: 24, h: 109 },   // 4
  { p: 70, k: 85, f: 24, h: 118 },   // 5
  { p: 61, k: 74, f: 31, h: 112 },   // 6
  { p: 67, k: 83, f: 19, h: 121 },   // 7
  { p: 62, k: 77, f: 16, h: 113 },   // 8
  { p: 68, k: 82, f: 16, h: 120 },   // 9
  { p: 59, k: 75, f: 17, h: 108 },   // 10
  { p: 66, k: 79, f: 18, h: 125 },   // 11
  { p: 60, k: 74, f: 17, h: 123 },   // 12
  { p: 62, k: 77, f: 15, h: 114 },   // 13
  { p: 60, k: 73, f: 17, h: 108 },   // 14
  { p: 65, k: 81, f: 19, h: 119 },   // 15
  { p: 68, k: 87, f: 16, h: 137 },   // 16
  { p: 73, k: 86, f: 16, h: 142 },   // 17
];
const HITBOX_SLIM = { p: 61, k: 74, f: 17, h: 112 };
const ATK = { pBase: 8, pStep: 3, kickMul: 0.5, pReach: 38, kReach: 60, pBonus: 8 };   // pBonus: 주먹 사거리 추가
const BAL = {   // v4 밸런스 패치: 체력 2배 (경기 시간 증가) + AI 대전 시뮬레이션 기반 조정
  0: { hp: 249, vacPush: 8, vacStun: 45, stimT: 445, stimLS: 1.0, focusT: 1200, focus: 1.2, vac2Dmg: 15, vac2Stun: 60 },
  1: { hp: 221, toothN: 4, toothDmg: 3.14, cutPct: 0.047, regen: 10, regenSec: 8, cloneT: 1200, debuffT: 600, debuff: 0.2 },
  2: { hp: 230, judoDmg: 30, judoStun: 60, parryT: 35, tripStun: 45, tripRange: 24, tripImm: 120, qteN: 5, qteDmg: 10, qteHeal: 10, invisT: 300, invisSpd: 1.5, invisGuardOff: 120 },
  3: { hp: 255, bambooDmg: 14.92, shootDmg: 11.64, shootMax: 3, spd: 1.2, cdRed: 0.2, crystalDmg: 20, flyDmg: 50 },
  4: { hp: 210, ddHeal: 0.034, ddEvery: 4, ddMax: 0.1, dicePer: 2.8, angerEvery: 3, angerAdd: 0.05, friend: 0.1, ddTwice: 0.318,
    momPct: 0.318, momSec: 31.8, curseSec: 31.8, curseDR: 0.318, curseAtk: 0.318, curseRefl: 0.318 },
  5: { hp: 244, nunDmg: 4.64, nunRoot: 46, prep: 120, act: 99, atkUp: 0.1, rushDmg: 12, rushStun: 60, chokeDps: 10, chokeNeed: 40, chokeMax: 360 },
  6: { hp: 278, meokT: 28, manT: 42, ttaT: 1200, bellyHeal: 150, bellySpd: 1.3 },
  7: { hp: 180, gaeDmg: 4.85, gaeRoot: 53, poisT: 262, poisTick: 1, footExt: 60, stackMax: 5, breathDmg: 5, breathStun: 60, breathHB: 180, burpAtk: 0.1, burpHeal: 10, burpStun: 60, burpT: 600 },
  8: { hp: 193, noteDiff: 0.498, noteSame: 0.15, noteHeal: 7, boardSpd: 1.2, dr: 0.1, laughDmg: 300, laughWind: 24, laughReach: 12, kcT: 300, kcDmg: 1 },
  9: { hp: 130, pressRoot: 30, pressSlow: 79, forceT: 132, awakeSec: 30, awakeMul: 1.3, awakeCd: 1, rageT: 1200, rage: 1.3, penT: 120, penSlow: 0.25, earT: 1800 },
  10: { hp: 214, fartMul: 0.633, explMul: 2.3, poisT: 300, poisTick: 1, bombRed: 5, legT: 1200, leg: 1.3, shuttleHit: 50, shuttleBlock: 5 },
  11: { hp: 193, painMax: 5, painRoot: 208, majRoot: 70, majBoost: 180, majSpd: 0.1, yankP: 0.5, fireT: 45, fireDmg: 1 },
  12: { hp: 208, sealSec: 8, headDmg: 13, spikeT: 300, spikeDR: 0.1, headInv: 60, otaku: 0.1, growT: 1200, grow: 1.3, growPush: 72, moP: 0.25, yutMin: 1, yutMax: 50 },
  13: { hp: 161, late: 0.1, kkDmg: 5, drunkT: 300, jjinSelf: 10, jjinStun: 150, formT: 600, form: 1.3 },
  14: { hp: 234, furDot: 0.5, sneezeP: 0.15, sneezeT: 30, shingT: 600, shingDmg: 1, chestT: 300, chestDR: 0.5, antN: 100, antWave: 25, antWaveT: 30, antSpd: 12, antHp: 2, antDmg: 1, antBite: 60, antLife: 117 },
  16: { hp: 150, ironAt: 0.2, ironT: 300, ironRange: 2, pimoLife: 420, pimoRoot: 240, pimoMax: 2, mantisT: 240, mantis: 1.5, clockT: 300, clockSpd: 1.75, clockStun: 60, clockSec: 455, phonePct: 0.2, phoneT: 600 },
  15: { hp: 308, eun: 0.1, mallangT: 180, mallangRefl: 0.5, ballMin: 3, ballMax: 30, fifaT: 1200, fifaLS: 0.5, fifaAtk: 0.1, fifaMul: 2, bombDmg: 50, bombFuse: 60, bombR: 85 },
  17: { hp: 200, barrierN: 3, barrierGap: 90, barrierOff: 300, tpCd: 5, pushCd: 10, pushDmg: 10, shotCd: 15, shotDmg: 20, shotSpd: 16, bombCd: 20, bombDmg: 50, bombSpd: 19, domCd: 30, domT: 1800, domDmg: 1, healCd: 60, lives: 2 },   // 히든 보스 (밸런스 대상 아님)
};
function skillDef(c, slot) { return CHARS[c]['s' + (slot + 1)] || null; }
function skillInfo(c, slot) { const d = skillDef(c, slot); return d ? d.info(BAL[c]) : '비어 있는 슬롯 (추후 추가 예정)'; }
function passiveInfo(c) { return CHARS[c].passive.desc(BAL[c]); }

// id 11 = Tirón(히든), 12 = 힌참휴. 승리 기록 호환을 위해 기존 번호 유지
const CHARS = [
  {
    name: '일반인', en: 'ILBANIN', color: '#3498db', country: 'KR', stage: 'seoul',
    desc: ['유연한 표준형 파이터', '흡혈 자극제 보유'],
    s1: { name: '진공파', info: (b) => `데미지 0 / 상대를 크게 밀어내고 ${(b.vacStun / 60).toFixed(1)}초 경직` },
    s2: { name: '전투자극제', heal: true, info: (b) => `${b.stimT / 60}초간 입힌 피해 ${Math.round(b.stimLS * 100)}% 흡혈` },
    s3: { name: '정신 집중', info: (b) => `${b.focusT / 60}초간 공격 속도 +${Math.round((b.focus - 1) * 100)}%` },
    s4: { name: '강화 진공파', info: (b) => `거대 진공파 ${b.vac2Dmg} 데미지 + 맞으면 ${(b.vac2Stun / 60).toFixed(1)}초 기절` },
    passive: { name: '끈기', desc: () => '가드 중 밀려나지 않음 + 진공파 막기' },
    look: {
      H: 1.0, b: build({}), skin: '#f2c793', hair: { style: 'short', color: '#1b1b1f' },
      top: '#3498db', topStyle: 'hoodie', pants: '#2c3e66', shoes: '#f4f4f4', acc: {},
    },
  },
  {
    name: 'mola008X', en: 'MOLA008X', color: '#9b59b6', country: 'KR', stage: 'palace',
    desc: ['어금니 특수 파이터', '체력 5% 확정 일격'],
    s1: { name: '어금니 러쉬', info: (b) => `어금니 ${b.toothN}연발 (발당 ${b.toothDmg}) / 가드 시 70% 경감` },
    s2: { name: '몰라컷', info: (b) => `후퇴 후 적 현재 체력 ${Math.round(b.cutPct * 100)}% 확정 피해` },
    s3: { name: '현란한 드리블', info: (b) => `${b.cloneT / 60}초간 상대 반대편에 움직이는 분신 (mola와 같은 체력, 공격 안 함)` },
    s4: { name: '디버프', info: (b) => `${b.debuffT / 60}초간 상대 모든 능력치 -${Math.round(b.debuff * 100)}%` },
    passive: { name: '확정적 어금니', desc: (b) => `${b.regenSec}초마다 체력 ${b.regen} 회복` },
    look: {
      H: 1.0, b: build({}), skin: '#efc28c', hair: { style: 'parted', color: '#141414' },
      top: '#9b59b6', topStyle: 'track', pants: '#4a235a', shoes: '#222', acc: { glasses: true, braces: true },
    },
  },
  {
    name: 'JJjin', en: 'JJJIN', color: '#8B4513', country: 'FR', stage: 'paris',
    desc: ['유도와 패링의 파이터', '발을 걸어 넘어뜨린다'],
    s1: { name: '유도', info: (b) => `근접 업어치기: 고정 ${b.judoDmg} 피해 (가드 불가) + 상대를 반대편으로 메쳐 ${(b.judoStun / 60).toFixed(1)}초 넘어뜨림` },
    s2: { name: '패링', info: (b) => `${(b.parryT / 60).toFixed(2)}초간 공격 무효화 및 반사 밀어내기` },
    s3: { name: '패드립 배틀', heal: true, info: (b) => `화면의 글자를 먼저 누른 쪽이 고정 ${b.qteDmg} 피해 + ${b.qteHeal} 회복 (${b.qteN}글자)` },
    s4: { name: '영역 전개', info: (b) => `${b.invisT / 60}초간 무적 + 투명 + 이동속도 +${Math.round((b.invisSpd - 1) * 100)}%, 상대 ${b.invisGuardOff / 60}초 가드 불가` },
    passive: { name: '와사바리', desc: (b) => `가까이 붙어서 킥을 맞히면 발을 걸어 넘어뜨림 (${(b.tripStun / 60).toFixed(2)}초 다운)` },
    look: {
      H: 0.95, b: build({ torsoW: 14, waistW: 11.5, thigh: 6.2, shin: 5.2, arm: 4.8, fore: 4.3 }), skin: '#5e3a22',
      hair: { style: 'buzz', color: '#0d0d0d' }, top: '#a0522d', topStyle: 'tank', pants: '#3b2412', shoes: '#e8e8e8', acc: { headband: '#f1c40f' },
    },
  },
  {
    name: '죽림고수', en: 'BAMBOO MASTER', color: '#58d68d', country: 'VN', stage: 'halong',
    desc: ['대나무와 죽순 고수', '쿨타임 감소 패시브'],
    s1: { name: '죽림 베기', info: (b) => `대나무 찌르기 ${b.bambooDmg} 데미지 (가드 시 70% 경감)` },
    s2: { name: '죽순', info: (b) => `밟으면 데미지 ${b.shootDmg}를 주는 죽순 설치 (최대 ${b.shootMax}개)` },
    s3: { name: '롤링 크리스탈 플래시', info: (b) => `굴러가는 크리스탈, 맞으면 고정 ${b.crystalDmg} 피해 (가드 무시)` },
    s4: { name: '플라잉 바르셀로나 어택', info: (b) => `날아올라 내리꽂기, 착지 지점에 있으면 고정 ${b.flyDmg} 피해` },
    passive: { name: '죽림 고수', desc: (b) => `이동속도 +${Math.round((b.spd - 1) * 100)}% / 공격 적중 시 모든 쿨타임 ${b.cdRed}초 감소` },
    look: {
      H: 1.0, b: build({}), skin: '#e8b98a', hair: { style: 'topknot', color: '#202020' },
      top: '#58d68d', topStyle: 'robe', pants: '#1e5631', shoes: '#3b2a1a', acc: { strawHat: true, bamboo: true, sash: '#145a32' },
    },
  },
  {
    name: '이은뚱', en: 'EUNTTUNG', color: '#e67e22', country: 'CN', stage: 'greatwall',
    desc: ['체력 회복 및 주사위', '운명의 힘을 다룸 (체지방률 31.8%)'],
    s1: { name: '더블다운', heal: true, info: (b) => `최대 체력 ${Math.round(b.ddHeal * 100)}% 회복 / ${b.ddEvery}회마다 최대 체력 ${Math.round(b.ddMax * 100)}% 증가` },
    s2: { name: '하츠 스테리오', info: (b) => `주사위 눈 x ${b.dicePer} 데미지 / ${b.angerEvery}번마다 공격력 +${Math.round(b.angerAdd * 100)}% & 분노` },
    s3: { name: '은맘', info: (b) => `최대 체력 ${(b.momPct * 100).toFixed(1)}%의 은맘 소환, 모든 피해·방해를 대신 받음 (${b.momSec}초)` },
    s4: { name: '31.8의 저주', info: (b) => `${b.curseSec}초간 받는 피해 -${(b.curseDR * 100).toFixed(1)}% · 공격 +${(b.curseAtk * 100).toFixed(1)}% · 피해 ${(b.curseRefl * 100).toFixed(1)}% 반사` },
    passive: { name: '우리는 친구 · 31.8', desc: (b) => `상대가 mola·JJjin이면 능력 +${Math.round(b.friend * 100)}% / 더블다운 ${(b.ddTwice * 100).toFixed(1)}% 확률로 연속 2회` },
    look: {
      H: 1.0, b: build({ torsoW: 18, waistW: 19, belly: 0.75, thigh: 8, shin: 6.5, arm: 6, fore: 5.5, headR: 9.6 }), skin: '#f0c49a',
      hair: { style: 'short', color: '#18181a' }, top: '#e67e22', topStyle: 'tee', pants: '#5d4037', shoes: '#ddd', acc: { glasses: true, lips: true, roundFace: true },
    },
  },
  {
    name: '使命감', en: 'SAMYEONGGAM', color: '#16a085', country: 'BR', stage: 'rio_dojo',
    desc: ['유술(주짓수) 마스터', '쌍절곤 제압과 공격 무효화'],
    s1: { name: '客氣', info: (b) => `쌍절곤 투척 ${b.nunDmg} 데미지, 맞은 적 ${(b.nunRoot / 60).toFixed(1)}초 고정` },
    s2: { name: '正義', info: (b) => `${(b.prep / 60).toFixed(1)}초 자기 구속 후 ${(b.act / 60).toFixed(1)}초간 모든 공격 무효` },
    s3: { name: '분노의 질주', info: (b) => `전력 돌진, 부딪히면 ${b.rushDmg} 피해 + ${(b.rushStun / 60).toFixed(1)}초 넘어뜨림` },
    s4: { name: 'Jiu-jitsu', info: (b) => `근접 초크: 초당 고정 ${b.chokeDps} 피해, 아무 키 ${b.chokeNeed}번 연타 시 탈출` },
    passive: { name: '有段者', desc: (b) => `일반 공격 및 발차기 데미지 +${Math.round(b.atkUp * 100)}%` },
    look: {
      H: 1.15, b: build({ torsoW: 19, waistW: 13, thigh: 7.5, shin: 6, arm: 6.8, fore: 6, muscle: 1, headR: 8.6 }), skin: '#e9b98c',
      hair: { style: 'crew', color: '#111' }, top: '#f2f2f2', topStyle: 'gi', pants: '#f2f2f2', shoes: null, acc: { belt: '#111', giTrim: '#16a085' },
    },
  },
  {
    name: '안거녕', en: 'ANGEONYEONG', color: '#d35400', country: 'IT', stage: 'pisa',
    desc: ['원거리 무적 및 방어', '만물포용력 체력 흡수'],
    s1: { name: '먹부림', info: (b) => `${(b.meokT / 60).toFixed(1)}초간 무적 (체력 안 닳음)` },
    s2: { name: '만물포용력', heal: true, info: (b) => `${(b.manT / 60).toFixed(1)}초간 받는 데미지를 체력 회복으로 전환` },
    s3: { name: 'ㄸ방해', info: (b) => `${b.ttaT / 60}초간 상대의 회복 스킬 사용 불가 + 모든 회복 차단` },
    s4: { name: '줄어든 뱃살', heal: true, info: (b) => `뱃살 제거! 체력 ${b.bellyHeal} 회복(최대 초과) + 이속 +${Math.round((b.bellySpd - 1) * 100)}% (라운드당 1회)` },
    passive: { name: '난 그렇게 생각 안 한다', desc: () => '어금니, 진공파 등 모든 원거리 투사체 완전 무적' },
    look: {
      H: 1.0, b: build({ torsoW: 21, waistW: 23, belly: 1.0, thigh: 9.2, shin: 7.2, arm: 6.8, fore: 6.2, headR: 10.2 }), skin: '#f1c8a0',
      hair: { style: 'messy', color: '#1d1d1d' }, top: '#d35400', topStyle: 'tee', pants: '#34495e', shoes: '#8e5a2b', acc: { roundFace: true, napkin: true },
    },
  },
  {
    name: '독민재B', en: 'DOKMINJAE B', color: '#27ae60', country: 'EG', stage: 'pyramid',
    desc: ['독과 구속의 특수 요원', '양치 안 한 입냄새의 위력'],
    s1: { name: '개구라', info: (b) => `${b.gaeDmg} 데미지 + ${(b.gaeRoot / 60).toFixed(1)}초 구속 및 밀어내기` },
    s2: { name: '독 탄환', info: (b) => `데미지 없는 독(${b.poisT / 60}초, 초당 ${b.poisTick}) 부여 탄환` },
    s3: { name: '입냄새 공격', info: (b) => `입냄새 ${b.breathDmg} 피해 x3 → ${(b.breathStun / 60).toFixed(0)}초 기절 + ${b.breathHB / 60}초 회복 불가` },
    s4: { name: '초거대 트름', heal: true, info: (b) => `불쾌지수 스택당 공격력 +${Math.round(b.burpAtk * 100)}%(${b.burpT / 60}초) · 체력 +${b.burpHeal} · 근처 상대 기절 ${(b.burpStun / 60).toFixed(1)}초` },
    passive: { name: '개쩌는발냄새 · 불쾌지수', desc: (b) => `독 상태 상대 발차기 시 독 ${b.footExt / 60}초 연장 / 스킬마다 불쾌지수 +1 (최대 ${b.stackMax})` },
    look: {
      H: 1.13, b: build({ torsoW: 15.5, waistW: 12.5, thigh: 6.4, shin: 5.4, arm: 4.9, fore: 4.4 }), skin: '#e3b48a',
      hair: { style: 'shaggy', color: '#2b2416' }, top: '#27ae60', topStyle: 'jacket', pants: '#1c2833', shoes: '#556b2f', acc: { yellowTeeth: true, stink: true },
    },
  },
  {
    name: '힙찔 강', en: 'HIPJJIL KANG', color: '#ff007f', country: 'BR', stage: 'copacabana',
    desc: ['음악과 불협화음의 파이터', '음파 연사와 보드 기동'],
    s1: { name: '음파', info: (b) => `음표 3연발 (모두 적중 시 체력 ${b.noteHeal} 회복)` },
    s2: { name: '보드', info: (b) => `이속 +${Math.round((b.boardSpd - 1) * 100)}% & 더블 점프 / 공격 1회 방어 후 파괴` },
    s3: { name: '특유의 웃음', info: (b) => `${(b.laughWind / 60).toFixed(1)}초 웃은 뒤 초근접 상대에게 고정 ${b.laughDmg} 피해 (맞으면 취소)` },
    s4: { name: 'KC', info: (b) => `${b.kcT / 60}초간 K·C 누를 때마다 고정 ${b.kcDmg} 피해 (모바일: 화면 터치)` },
    passive: { name: '불협화음', desc: (b) => `상대와 캐릭터가 다르면 받는 피해 -${Math.round(b.dr * 100)}% & 음파 ${+(b.noteDiff / b.noteSame).toFixed(1)}배` },
    look: {
      H: 1.06, b: build({ torsoW: 13, waistW: 10.5, thigh: 5.2, shin: 4.5, arm: 4, fore: 3.6, headR: 8.2 }), skin: '#f3c9a0',
      hair: { style: 'short', color: '#151515' }, top: '#ff007f', topStyle: 'hoodie', pants: '#222', shoes: '#fff', acc: { glasses: true, capBack: '#111', phones: true, chain: true },
    },
  },
  {
    name: '창가오', en: 'CHANGGAO', color: '#8e44ad', country: 'US', stage: 'newyork',
    desc: ['가오가 지배하는 파이터', '압도와 포스 발산'],
    s1: { name: '압도', info: (b) => `적 ${(b.pressRoot / 60).toFixed(1)}초 구속, ${b.pressSlow / 60}초간 이속 50% 감소 & 공격 딜레이 증가` },
    s2: { name: '포스', info: (b) => `${b.forceT / 60}초간 상대 가드 불가` },
    s3: { name: '반장의 분노', info: (b) => `${b.rageT / 60}초간 사거리 +${Math.round((b.rage - 1) * 100)}%, 적중 시 벌점(${b.penT / 60}초 이속 -${Math.round(b.penSlow * 100)}%)` },
    s4: { name: '거꾸로 쓴 귀마개', info: (b) => `${b.earT / 60}초간 모든 방해 효과·상대 스킬 피해 무시` },
    passive: { name: '범접불가', desc: (b) => `라운드 ${b.awakeSec}초 후 가오 각성: 이속/공속 +${Math.round((b.awakeMul - 1) * 100)}%, 쿨타임 ${b.awakeCd}초 감소` },
    look: {
      H: 1.12, b: build({ torsoW: 17, waistW: 12.5, thigh: 6.8, shin: 5.6, arm: 5.6, fore: 5, muscle: 0.5 }), skin: '#eec39a',
      hair: { style: 'slick', color: '#0f0f12' }, top: '#8e44ad', topStyle: 'coat', pants: '#1a1a2e', shoes: '#111', acc: { sunglasses: true, chinUp: true, gold: true },
    },
  },
  {
    name: '매미킴', en: 'MAEMI KIM', color: '#2c3e50', country: 'IN', stage: 'tajmahal',
    desc: ['독과 폭발의 마스터', '시한폭탄 패시브 보유'],
    s1: { name: '독방구', info: (b) => `발차기 2배 사거리 독구름 / ${Math.round(b.fartMul * 100)}% 데미지 + 독` },
    s2: { name: '독 폭발', info: (b) => `발차기 사거리 폭발 / ${b.explMul}배 데미지(가드 무시) + 독` },
    s3: { name: '다리 회복', info: (b) => `${b.legT / 60}초간 이동속도·발차기 데미지·발차기 사거리 +${Math.round((b.leg - 1) * 100)}%` },
    s4: { name: '배드민턴 스매시', info: (b) => `엄청 빠른 셔틀콕 1개! 맞으면 ${b.shuttleHit} 피해, 가드하면 ${b.shuttleBlock} 피해` },
    passive: { name: '시한폭탄', desc: (b) => `자신/적 체력 50% 이하가 될 때마다 W 쿨타임 ${b.bombRed}초 감소` },
    look: {
      H: 1.0, b: build({ torsoW: 15, waistW: 15, thigh: 10.5, shin: 8, hips: 6 }), skin: '#f0c697',
      hair: { style: 'bowl', color: '#1a1a1a' }, top: '#34495e', topStyle: 'tee', pants: '#2c3e50', shoes: '#c0392b', acc: { glasses: true },
    },
  },
  {
    name: 'Tirón', en: 'TIRON', color: '#d35400', country: 'ES', stage: 'sagrada', hidden: true,
    desc: ['비밀의 히든 파이터', 'AI 딸깍과 괴룡의 힘'],
    s1: { name: 'ai 딸깍', info: () => '모든 캐릭터의 Q/W 스킬 중 무작위 1개 카피 발동' },
    s2: { name: '압도적위엄', info: (b) => `적 ${(b.majRoot / 60).toFixed(1)}초 고정 & ${b.majBoost / 60}초간 이동속도 ${Math.round(b.majSpd * 100)}% 증가` },
    s3: { name: '양크', info: (b) => `이번 라운드 동안 모든 공격이 ${Math.round(b.yankP * 100)}% 확률로 2배 피해` },
    s4: { name: '파이어 브레스', info: (b) => `${(b.fireT / 60).toFixed(2)}초간 불을 뿜음, 닿는 매 프레임 ${b.fireDmg} 피해 (가드 시 경감)` },
    passive: { name: '괴룡', desc: (b) => `피격 시 고통 1스택 (${b.painMax}스택 시 적 ${b.painRoot / 60}초 구속)` },
    look: {
      H: 1.08, b: build({ torsoW: 17, waistW: 13, thigh: 7, shin: 5.8, arm: 5.6, fore: 5, muscle: 0.4 }), skin: '#eab88a',
      hair: { style: 'short', color: '#3a1d0d' }, top: '#d35400', topStyle: 'dragon', pants: '#4a1c06', shoes: '#111', acc: { horns: true, tail: true },
    },
  },
  {
    name: '힌참휴', en: 'HINCHAMHYU', color: '#00e676', country: 'JP', stage: 'tokyo',
    desc: ['천재 해커 파이터', '뾰족한 머리와 해킹'],
    s1: { name: '뾰족한 머리', info: (b) => `박치기 고정 ${b.headDmg} 피해 + ${b.headInv / 60}초 무적 + ${b.spikeT / 60}초간 받는 피해 -${Math.round(b.spikeDR * 100)}%` },
    s2: { name: '해킹', info: (b) => `상대 스킬 1개 ${b.sealSec}초 사용 불가 + 1회 복제 (W 다시 누르기)` },
    s3: { name: '난쟁이의 희망', info: (b) => `${b.growT / 60}초간 사거리·몸집 +${Math.round((b.grow - 1) * 100)}% + 상대 ${b.growPush}px 밀어냄` },
    s4: { name: '모 아니면 도', info: (b) => `윷! ${Math.round(b.moP * 100)}% 확률로 모: 상대 즉사 / 나머지: ${b.yutMin}~${b.yutMax} 랜덤 피해` },
    passive: { name: '오타쿠', desc: (b) => `상대가 이은뚱이면 모든 능력치 +${Math.round(b.otaku * 100)}%, 일본 스테이지에서 +${Math.round(b.otaku * 100)}% (중첩)` },
    look: {
      H: 1.02, b: build({ torsoW: 14.5, waistW: 12, thigh: 6, shin: 5.2, arm: 4.6, fore: 4.2 }), skin: '#f2c99e',
      hair: { style: 'spiky', color: '#1a1a1a' }, top: '#111a14', topStyle: 'hackerHood', pants: '#0b0f0c', shoes: '#00e676', acc: { visor: true },
    },
  },
  {
    name: '영탁', en: 'YOUNGTAK', color: '#e84393', country: 'KR', stage: 'seoul',
    desc: ['트로트 파이터', '키만 크고 몸은 약하다'],
    s1: { name: '꺾어', info: (b) => `목을 꺾는 근접 일격, 고정 ${b.kkDmg} 피해 (가드 무시)` },
    s2: { name: '막걸리 한잔', info: (b) => `막걸리 투척, 맞으면 ${b.drunkT / 60}초 취함 (←→ 반대, 가드↔점프 반대)` },
    s3: { name: '찐이야', info: (b) => `자신이 ${b.jjinSelf} 피해를 입고 상대 ${(b.jjinStun / 60).toFixed(1)}초 기절` },
    s4: { name: '폼 미쳤다', info: (b) => `${b.formT / 60}초간 모든 능력치 +${Math.round((b.form - 1) * 100)}%` },
    passive: { name: '니가 왜 거기서 나와', desc: (b) => `상대가 먼저 고른 뒤에 영탁을 고르면 모든 능력치 +${Math.round(b.late * 100)}%` },
    look: {
      H: 1.08, b: build({ torsoW: 10.5, waistW: 8, thigh: 4, shin: 3.6, arm: 3.1, fore: 2.8, headR: 8.1 }), skin: '#f1c9a0',
      hair: { style: 'slick', color: '#2a1a12' }, top: '#e84393', topStyle: 'coat', pants: '#1c1c28', shoes: '#f5f5f5', acc: { sequin: true, mic: true },
    },
  },
  {
    name: '허도개미', en: 'HEODOGAEMI', color: '#8d6e63', country: 'BR', stage: 'rio_dojo',
    desc: ['털이 엄청 많은 파이터', '전염·대상포진·개미 군단'],
    s1: { name: '전염', info: () => '내 상태이상(독·구속·감속·봉인 등)을 모두 상대에게 옮기고 나는 깨끗해짐' },
    s2: { name: '대상포진', info: (b) => `맞으면 ${b.shingT / 60}초간 초당 ${b.shingDmg} 지속 피해` },
    s3: { name: '옵빠이', info: (b) => `${b.chestT / 60}초간 받는 피해 -${Math.round(b.chestDR * 100)}%, 투사체·독은 상대에게 튕겨냄` },
    s4: { name: '개미군단', info: (b) => `개미 ${b.antN}마리가 ${b.antWave}마리씩 쏟아져 달라붙음 (체력 ${b.antHp}, 초당 ${b.antDmg} 피해, 가드 불가)` },
    passive: { name: '털복숭이', desc: (b) => `독·지속 피해 -${Math.round(b.furDot * 100)}% / 나를 때린 상대가 ${Math.round(b.sneezeP * 100)}% 확률로 재채기 (${(b.sneezeT / 60).toFixed(1)}초 경직)` },
    look: {
      H: 1.0, b: build({ torsoW: 17, waistW: 14, belly: 0.25, thigh: 6.8, shin: 5.8, arm: 5.4, fore: 4.9 }), skin: '#e6b088',
      hair: { style: 'messy', color: '#1c1410' }, top: '#6d8b3a', topStyle: 'tank', pants: '#4e342e', shoes: '#3e2723', acc: { glasses: true, chest: true, hairy: true },
    },
  },
  {
    name: '차니팍', en: 'CHANI PARK', color: '#d32f2f', country: 'ES', stage: 'sagrada',
    desc: ['축구에 진심인 파이터', '마른 비만 · 센터백 본능'],
    s1: { name: '말랑뱃살', info: (b) => `${b.mallangT / 60}초간 킥을 튕겨냄 (킥 무효 + ${Math.round(b.mallangRefl * 100)}% 반사)` },
    s2: { name: '센백본능', info: (b) => `축구공 슛! ${b.ballMin}~${b.ballMax} 랜덤 피해` },
    s3: { name: '피파ㅈ밥', info: (b) => `다음 피격 1회 ${b.fifaMul * 100}% 피해, 대신 ${b.fifaT / 60}초간 흡혈 ${Math.round(b.fifaLS * 100)}% + 공격력 +${Math.round(b.fifaAtk * 100)}%` },
    s4: { name: '은뚱폭발', info: (b) => `이은뚱을 던짐! 떨어진 자리에서 ${b.bombFuse / 60}초 뒤 폭발, ${b.bombDmg} 피해` },
    passive: { name: '은뚱 전문가', desc: (b) => `상대가 이은뚱이면 모든 능력치 +${Math.round(b.eun * 100)}%` },
    look: {
      H: 1.12, b: build({ torsoW: 14, waistW: 15.5, belly: 0.4, thigh: 5.6, shin: 4.8, arm: 4.0, fore: 3.6, headR: 8.4 }), skin: '#f0c8a0',
      hair: { style: 'short', color: '#222' }, top: '#d32f2f', topStyle: 'tee', pants: '#1a237e', shoes: '#ffffff', acc: { jersey: '7' },
    },
  },
  {
    name: '이유동', en: 'LEE YUDONG', color: '#c62828', country: 'KR', stage: 'seoul',
    desc: ['다리가 엄청 긴 기숙사생', '가슴에 아크 리액터'],
    s1: { name: '피모 지웠다 깔기', info: (b) => `피모를 또 설치! 밟은 상대는 현혹되어 ${b.pimoRoot / 60}초 구속` },
    s2: { name: '맨티스컷', info: (b) => `${b.mantisT / 60}초간 펀치·킥 속도 +${Math.round((b.mantis - 1) * 100)}%` },
    s3: { name: '4시 55분', info: (b) => `시간 ${b.clockSec}초로! ${b.clockT / 60}초간 안 밀려남·공속 +${Math.round((b.clockSpd - 1) * 100)}%, 후 ${b.clockStun / 60}초 기절` },
    s4: { name: '휴대폰압수', info: (b) => `체력 ${Math.round(b.phonePct * 100)}%로, ${b.phoneT / 60}초간 아이언맨 + 불사 + 안 밀려남, 끝나면 받은 피해 회복` },
    passive: { name: '아이언맨', desc: (b) => `체력 ${Math.round(b.ironAt * 100)}% 이하 시 ${b.ironT / 60}초간 아이언맨 (레이저 펀치 사거리 ${b.ironRange}배)` },
    look: {
      H: 1.18, b: build({ torsoW: 11.5, waistW: 9, thigh: 4.3, shin: 3.8, arm: 3.4, fore: 3.0, headR: 8.2, leg: 1.22 }), skin: '#efc49a',
      hair: { style: 'parted', color: '#151515' }, top: '#37474f', topStyle: 'tee', pants: '#263238', shoes: '#eeeeee', acc: { arc: true },
    },
  },
  {   // 17: 히든 보스 — LUNATIC 선택 후 CPU 대전 선택 화면에서 B
    name: '흑요', en: 'HEUGYO', color: '#c9a227', country: 'KR', stage: 'school', hidden: true, boss: true,
    desc: ['정체를 알 수 없는 히든 보스', '키 190cm 이상 · 2페이즈'],
    // 보스 전용 스킬 6개 (쿨타임 초) — 2페이즈부터 사용
    bossSk: [
      { name: '순간 이동', cd: 5, info: () => '즉시 상대의 등 뒤로 이동' },
      { name: '척력 파동', cd: 10, info: (b) => `상대를 맵의 가장 먼 끝으로 날려 보내고 ${b.pushDmg} 피해` },
      { name: '금강탄', cd: 15, info: (b) => `거대한 탄을 아주 빠르게 발사, ${b.shotDmg} 피해` },
      { name: '흑점탄', cd: 20, info: (b) => `검은 탄을 아주 빠르게 발사, ${b.bombDmg} 피해` },
      { name: '절대 영역', cd: 30, info: (b) => `${b.domT / 60}초간 상대를 계속 기절시키고 1프레임마다 ${b.domDmg} 피해` },
      { name: '완전 재생', cd: 60, info: () => '체력을 즉시 최대로 회복' },
    ],
    passive: { name: '절대 결계', desc: (b) => `펀치·킥 등 물리 공격을 전부 무시. ${b.barrierN}번 연속으로 공격받거나, 흑요가 ${b.barrierN}번 연속으로 때리면 ${b.barrierOff / 60}초간 해제. 해제 중 상태이상을 맞으면 그 시간만큼 해제 연장` },
    look: {
      H: 1.27, b: build({ torsoW: 11.5, waistW: 9.5, thigh: 4.4, shin: 3.8, arm: 3.4, fore: 3.0, headR: 8.2, leg: 1.12 }), skin: '#e6c3a0',
      hair: { style: 'slick', color: '#16161d' }, top: '#2f3542', topStyle: 'hoodie', pants: '#1e2029', shoes: '#111111', acc: {},
    },
    look2: {   // 2페이즈: 후드를 벗고 금빛 코트
      H: 1.27, b: build({ torsoW: 11.5, waistW: 9.5, thigh: 4.4, shin: 3.8, arm: 3.4, fore: 3.0, headR: 8.2, leg: 1.12 }), skin: '#e6c3a0',
      hair: { style: 'slick', color: '#16161d' }, top: '#141a2e', topStyle: 'coat', pants: '#141a2e', shoes: '#111111', acc: { gold: true },
    },
  },
];
const SELECT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16]; // 8+8 그리드 (Tirón은 K로)
const SEL_COLS = 8;
const TIRON = 11, HINCHAM = 12, YOUNGTAK = 13, GAEMI = 14, CHANI = 15, YUDONG = 16, BOSS = 17;


// 승리 기록
function getRecords() {
  try {
    const r = JSON.parse(safeLS('tekken_win_records') || '{}');
    return r && typeof r === 'object' ? r : {};
  } catch (e) { return {}; }
}
function addRecord(c) {
  const r = getRecords();
  r[c] = (r[c] || 0) + 1;
  safeLS('tekken_win_records', JSON.stringify(r));
}
