// 1:1 상성 원인 분석: node tools/duel.js A B [판수] [덮어쓸.json]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['00_core', '01_data', '10_sim', '11_ai'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
const ctx = { console, Math, JSON, Object, Array, Set }; vm.createContext(ctx);
vm.runInContext(src + `
var ST = { dmg: {}, use: {}, heal: {} };
const _ad = applyDamage;
applyDamage = function (G, A, D, dmg, type, o) { const h = D.hp, m = D.momHp; const r = _ad(G, A, D, dmg, type, o); const k = (A ? CHARS[A.c].name : '?') + ':' + type + ':' + r; ST.dmg[k] = (ST.dmg[k] || 0) + Math.max(0, h - D.hp) + Math.max(0, m - D.momHp); return r; };
const _us = useSkill;
useSkill = function (G, F, O, s, inp) { const cd = F.cd[s]; _us(G, F, O, s, inp); if (F.cd[s] > cd) { const k = CHARS[F.c].name + ':' + s; ST.use[k] = (ST.use[k] || 0) + 1; } };
var __duel = function (a, b, n, ov) {
  if (ov) for (const k in ov) Object.assign(BAL[k], ov[k]);
  let w = 0, g = 0, rounds = 0, frames = 0;
  for (const d of [1, 2]) for (let i = 0; i < n; i++) for (const sw of [0, 1]) {
    rnd = mulberry32(a * 1009 + b * 917 + i * 131 + d * 7 + sw * 3 + 99);
    const G = newMatch(sw ? b : a, sw ? a : b, 'seoul', 'cpu', [false, true]);
    const m = [makeAIMem(), makeAIMem()]; let f = 0;
    while (G.phase !== 'end' && f < 36000) { const hp = G.F.map((F) => F.hp); G.ev = []; stepGame(G, [aiInput(G, G.F[0], G.F[1], m[0], d), aiInput(G, G.F[1], G.F[0], m[1], d)]); f++;
      if (G.phase === 'fight') for (const F of G.F) if (F.hp > hp[F.side]) { const k = CHARS[F.c].name; ST.heal[k] = (ST.heal[k] || 0) + F.hp - hp[F.side]; } }
    g++; frames += f; rounds += G.round; if (G.mw === (sw ? 1 : 0)) w++;
  }
  return { win: Math.round(w / g * 100), avgRoundSec: Math.round(frames / rounds / 60), ST };
};`, ctx);
const a = +process.argv[2], b = +process.argv[3], n = +(process.argv[4] || 8);
const ov = process.argv[5] ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8')) : null;
const r = ctx.__duel(a, b, n, ov);
console.log('win', r.win + '%', 'avg round', r.avgRoundSec + 's');
const top = (o) => Object.entries(o).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + '=' + Math.round(v)).join('  ');
console.log('DMG ', top(r.ST.dmg)); console.log('USE ', top(r.ST.use)); console.log('HEAL', top(r.ST.heal));
