// 자동 밸런스 튜너: node tools/tune.js [반복=6] [조합당 판수=3] [fresh]
// 캐릭터별 '파워 계수'를 승률에 맞춰 조정 → 기존 Q/W 수치와 체력만 움직이고, 새 E/R 수치는 건드리지 않음
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), vm = require('vm');
const iters = +(process.argv[2] || 6), n = +(process.argv[3] || 3);
const KNOBS = {
  0: [['vacStun', 1, 1], ['stimT', 1, 1]],
  1: [['toothDmg', 1, 0], ['cutPct', 1, 0], ['regen', 1, 1]],
  2: [['judoDmg', 1, 0], ['parryT', 0.5, 1]],
  3: [['bambooDmg', 1, 0], ['shootDmg', 1, 0]],
  4: [['ddHeal', 1, 0], ['dicePer', 1, 0]],
  5: [['nunDmg', 1, 0], ['nunRoot', 1, 1], ['act', 1, 1]],
  6: [['meokT', 1, 1], ['manT', 1, 1]],
  7: [['gaeDmg', 1, 0], ['gaeRoot', 1, 1], ['poisT', 1, 1]],
  8: [['noteDiff', 1, 0], ['noteHeal', 1, 1]],
  9: [['pressSlow', 1, 1], ['forceT', 1, 1]],
  10: [['fartMul', 1, 0], ['explMul', 1, 0]],
  11: [['majRoot', 1, 1], ['painRoot', 1, 1]],
  12: [['sealSec', 1, 1], ['headDmg', 1, 0]],
  13: [['kkDmg', 1, 0], ['drunkT', 1, 1]],
  14: [['shingDmg', 1, 0], ['antLife', 1, 1]],
  15: [['ballMax', 1, 1], ['bombDmg', 1, 0]],
  16: [['pimoRoot', 1, 1], ['mantisT', 1, 1]],
};
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', '00_core.js'), 'utf8').replace("'use strict';", '') + fs.readFileSync(path.join(__dirname, '..', 'src', '01_data.js'), 'utf8').replace(/^const /gm, 'var ') + '; var __B = BAL;', Object.assign(ctx, { safeLS: () => null }));
const BAL0 = JSON.parse(JSON.stringify(ctx.__B));
const IDS = Object.keys(KNOBS).map(Number);
// 체력 위주로 조정할 캐릭터 (사명감: 체력 보완 요청)
const HPX = { 5: 1.0 };
// 사용자가 정한 체력 (튜너가 바꾸지 않음): JJjin 230 고정, 힌참휴는 너프 금지, 이유동은 버프 유지
const HP_FIX = { 2: 230 }, HP_MIN = { 12: 208, 16: 150 };
const SF = path.join(__dirname, 'tune_state.json');
const S = {}; for (const c of IDS) S[c] = 1;
if (fs.existsSync(SF) && process.argv[4] !== 'fresh') Object.assign(S, JSON.parse(fs.readFileSync(SF, 'utf8')));
function build() {
  const ov = {};
  for (const c of IDS) {
    const b = BAL0[c], o = {};
    for (const [k, e, isInt] of (process.env.HPONLY ? [] : KNOBS[c])) { let v = b[k] * Math.pow(S[c], e); v = isInt ? Math.max(1, Math.round(v)) : +v.toFixed(3); o[k] = v; }
    o.hp = Math.round(b.hp * Math.pow(S[c], process.env.HPONLY ? 0.8 : (HPX[c] || 0.35)));
    if (HP_FIX[c]) o.hp = HP_FIX[c];
    if (HP_MIN[c]) o.hp = Math.max(HP_MIN[c], o.hp);
    ov[c] = o;
  }
  return ov;
}
for (let it = 0; it < iters; it++) {
  const ov = build();
  fs.writeFileSync(path.join(__dirname, 'ov_tune.json'), JSON.stringify(ov));
  const out = execFileSync('node', [path.join(__dirname, 'balance.js'), String(n), path.join(__dirname, 'ov_tune.json')], { encoding: 'utf8', env: process.env });
  const wr = JSON.parse(fs.readFileSync(path.join(__dirname, 'last_balance.json'), 'utf8'));
  console.log(`#${it} ` + out.trim().split('\n')[1]);
  const spread = Math.max(...Object.values(wr)) - Math.min(...Object.values(wr));
  for (const c of IDS) { const d = (50 - wr[c]) / 100; S[c] = +(S[c] * (1 + 0.9 * d)).toFixed(4); S[c] = Math.min(3, Math.max(0.3, S[c])); }
  fs.writeFileSync(SF, JSON.stringify(S));
  if (spread < 12) break;
}
fs.writeFileSync(path.join(__dirname, 'ov_final.json'), JSON.stringify(build(), null, 1));
console.log('scalars', JSON.stringify(S));
