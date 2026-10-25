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
function cdText(k) { return SLOT_CD_START[k] !== SLOT_CD[k] ? `첫 ${SLOT_CD_START[k]}초 · 이후 ${SLOT_CD[k]}초` : `${SLOT_CD[k]}초`; }
const ATK = { pBase: 8, pStep: 3, kickMul: 0.5, pReach: 38, kReach: 60 };
const BAL = {   // v2 밸런스 패치 (AI 대전 시뮬레이션 기반)
  0: { hp: 100, vacPush: 8, vacStun: 30, stimT: 300, stimLS: 1.0 },
  1: { hp: 96, toothN: 4, toothDmg: 3, cutPct: 0.045, regen: 10, regenSec: 8 },
  2: { hp: 150, dashT: 6, parryT: 30, reviveHp: 0.5 },
  3: { hp: 108, bambooDmg: 12, shootDmg: 9, shootMax: 3, spd: 1.2, cdRed: 0.2 },
  4: { hp: 95, ddHeal: 0.07, ddEvery: 4, ddMax: 0.1, dicePer: 5, angerEvery: 3, angerAdd: 0.05, friend: 0.1,
    momPct: 0.318, momSec: 31.8, curseSec: 31.8, curseDR: 0.318, curseAtk: 0.318, curseRefl: 0.318 },
  5: { hp: 86, nunDmg: 4, nunRoot: 40, prep: 120, act: 84, atkUp: 0.1 },
  6: { hp: 95, meokT: 36, manT: 54 },
  7: { hp: 96, gaeDmg: 5, gaeRoot: 60, poisT: 300, poisTick: 1, footExt: 60 },
  8: { hp: 90, noteDiff: 0.3, noteSame: 0.15, noteHeal: 4, boardSpd: 1.2, dr: 0.1 },
  9: { hp: 100, pressRoot: 30, pressSlow: 90, forceT: 150, awakeSec: 30, awakeMul: 1.3, awakeCd: 1 },
  10: { hp: 100, fartMul: 0.5, explMul: 2, poisT: 300, poisTick: 1, bombRed: 5 },
  11: { hp: 95, painMax: 5, painRoot: 162, majRoot: 54, majBoost: 180, majSpd: 0.1 },
  12: { hp: 110, sealSec: 8, headDmg: 13, spikeT: 300, spikeDR: 0.1 },
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
    s2: { name: '전투자극제', info: (b) => `${b.stimT / 60}초간 입힌 피해 ${Math.round(b.stimLS * 100)}% 흡혈` },
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
    passive: { name: '확정적 어금니', desc: (b) => `${b.regenSec}초마다 체력 ${b.regen} 회복` },
    look: {
      H: 1.0, b: build({}), skin: '#efc28c', hair: { style: 'parted', color: '#141414' },
      top: '#9b59b6', topStyle: 'track', pants: '#4a235a', shoes: '#222', acc: { glasses: true, braces: true },
    },
  },
  {
    name: 'JJjin', en: 'JJJIN', color: '#8B4513', country: 'FR', stage: 'paris',
    desc: ['기동성과 방어 반사', '순간 대시와 패링'],
    s1: { name: '대시', info: (b) => `입력 방향으로 순간 고속 이동 (${b.dashT * 12}px)` },
    s2: { name: '패링', info: (b) => `${(b.parryT / 60).toFixed(2)}초간 공격 무효화 및 반사 밀어내기` },
    passive: { name: '부활', desc: (b) => `라운드마다 1회, 쓰러지면 체력 ${Math.round(b.reviveHp * 100)}%로 부활` },
    look: {
      H: 0.84, b: build({ torsoW: 14, waistW: 11.5, thigh: 6.2, shin: 5.2, arm: 4.8, fore: 4.3 }), skin: '#5e3a22',
      hair: { style: 'buzz', color: '#0d0d0d' }, top: '#a0522d', topStyle: 'tank', pants: '#3b2412', shoes: '#e8e8e8', acc: { headband: '#f1c40f' },
    },
  },
  {
    name: '죽림고수', en: 'BAMBOO MASTER', color: '#58d68d', country: 'VN', stage: 'halong',
    desc: ['대나무와 죽순 고수', '쿨타임 감소 패시브'],
    s1: { name: '죽림 베기', info: (b) => `대나무 찌르기 ${b.bambooDmg} 데미지 (가드 시 70% 경감)` },
    s2: { name: '죽순', info: (b) => `밟으면 데미지 ${b.shootDmg}를 주는 죽순 설치 (최대 ${b.shootMax}개)` },
    passive: { name: '죽림 고수', desc: (b) => `이동속도 +${Math.round((b.spd - 1) * 100)}% / 공격 적중 시 모든 쿨타임 ${b.cdRed}초 감소` },
    look: {
      H: 1.0, b: build({}), skin: '#e8b98a', hair: { style: 'topknot', color: '#202020' },
      top: '#58d68d', topStyle: 'robe', pants: '#1e5631', shoes: '#3b2a1a', acc: { strawHat: true, bamboo: true, sash: '#145a32' },
    },
  },
  {
    name: '이은뚱', en: 'EUNTTUNG', color: '#e67e22', country: 'CN', stage: 'greatwall',
    desc: ['체력 회복 및 주사위', '운명의 힘을 다룸 (체지방률 31.8%)'],
    s1: { name: '더블다운', info: (b) => `최대 체력 ${Math.round(b.ddHeal * 100)}% 회복 / ${b.ddEvery}회마다 최대 체력 ${Math.round(b.ddMax * 100)}% 증가` },
    s2: { name: '하츠 스테리오', info: (b) => `주사위 눈 x ${b.dicePer} 데미지 / ${b.angerEvery}번마다 공격력 +${Math.round(b.angerAdd * 100)}% & 분노` },
    s3: { name: '은맘', info: (b) => `현재 체력의 ${(b.momPct * 100).toFixed(1)}% 체력을 가진 은맘 소환. 모든 피해·방해효과를 대신 받음 (파괴되거나 ${b.momSec}초 후 사라짐)` },
    s4: { name: '31.8의 저주', info: (b) => `${b.curseSec}초간 받는 피해 ${(b.curseDR * 100).toFixed(1)}% 감소 · 공격력 ${(b.curseAtk * 100).toFixed(1)}% 증가 · 받은 피해의 ${(b.curseRefl * 100).toFixed(1)}% 반사` },
    passive: { name: '우리는 친구', desc: (b) => `상대가 mola나 JJjin일 때 능력 +${Math.round(b.friend * 100)}%` },
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
    s2: { name: '만물포용력', info: (b) => `${(b.manT / 60).toFixed(1)}초간 받는 데미지를 체력 회복으로 전환` },
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
    passive: { name: '개쩌는발냄새', desc: (b) => `발차기 적중 시 상대가 독 상태라면 지속시간 ${b.footExt / 60}초 연장` },
    look: {
      H: 1.13, b: build({ torsoW: 15.5, waistW: 12.5, thigh: 6.4, shin: 5.4, arm: 4.9, fore: 4.4 }), skin: '#e3b48a',
      hair: { style: 'shaggy', color: '#2b2416' }, top: '#27ae60', topStyle: 'jacket', pants: '#1c2833', shoes: '#556b2f', acc: { yellowTeeth: true, stink: true },
    },
  },
  {
    name: '힙찔 강', en: 'HIPJJIL KANG', color: '#ff007f', country: 'BR', stage: 'copacabana',
    desc: ['음악과 불협화음의 파이터', '음파 연사와 보드 기동'],
    s1: { name: '음파', info: (b) => `음표 3연발 (모두 적중 시 체력 ${b.noteHeal} 회복)` },
    s2: { name: '보드', info: (b) => `이속 +${Math.round((b.boardSpd - 1) * 100)}% & 더블 점프 / 공격 1회 방어 후 파괴 (파괴 후 쿨타임 시작)` },
    passive: { name: '불협화음', desc: (b) => `상대와 캐릭터가 다르면 받는 피해 ${Math.round(b.dr * 100)}% 감소 & 음파 데미지 ${+(b.noteDiff / b.noteSame).toFixed(1)}배` },
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
    passive: { name: '괴룡', desc: (b) => `피격 시 고통 1스택 (${b.painMax}스택 시 적 ${b.painRoot / 60}초 구속)` },
    look: {
      H: 1.08, b: build({ torsoW: 17, waistW: 13, thigh: 7, shin: 5.8, arm: 5.6, fore: 5, muscle: 0.4 }), skin: '#eab88a',
      hair: { style: 'short', color: '#3a1d0d' }, top: '#d35400', topStyle: 'dragon', pants: '#4a1c06', shoes: '#111', acc: { horns: true, tail: true },
    },
  },
  {
    name: '힌참휴', en: 'HINCHAMHYU', color: '#00e676', country: 'JP', stage: 'tokyo',
    desc: ['천재 해커 파이터', '해킹과 뾰족한 머리'],
    s1: { name: '해킹', info: (b) => `상대 스킬 1개 ${b.sealSec}초 봉인 + 그 스킬 1회 복제 (복제는 Q 다시 누르기)` },
    s2: { name: '뾰족한 머리', info: (b) => `박치기로 고정 피해 ${b.headDmg} + ${b.spikeT / 60}초간 받는 피해 ${Math.round(b.spikeDR * 100)}% 경감` },
    passive: { name: '없음', desc: () => '스킬 특화형 (패시브 없음)' },
    look: {
      H: 1.02, b: build({ torsoW: 14.5, waistW: 12, thigh: 6, shin: 5.2, arm: 4.6, fore: 4.2 }), skin: '#f2c99e',
      hair: { style: 'spiky', color: '#1a1a1a' }, top: '#111a14', topStyle: 'hackerHood', pants: '#0b0f0c', shoes: '#00e676', acc: { visor: true },
    },
  },
];
const SELECT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]; // 6x2 그리드 (Tirón은 K로)
const TIRON = 11, HINCHAM = 12;

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
