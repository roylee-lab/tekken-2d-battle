// 스킬 사용 횟수/피해 진단: node tools/diag.js [캐릭터id] [판수]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['00_core', '01_data', '10_sim', '11_ai'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
const ctx = { console, Math, JSON, Object, Array, Set }; vm.createContext(ctx);
vm.runInContext(src + `
var STATS = { use: {}, dmg: {}, res: {} };
const _ad = applyDamage;
applyDamage = function (G, A, D, dmg, type, o) { const hp0 = D.hp, m0 = D.momHp; const r = _ad(G, A, D, dmg, type, o); const k = (A ? CHARS[A.c].name : '?') + ':' + type; STATS.dmg[k] = (STATS.dmg[k] || 0) + Math.max(0, hp0 - D.hp) + Math.max(0, m0 - D.momHp); STATS.res[k + ':' + r] = (STATS.res[k + ':' + r] || 0) + 1; return r; };
const _us = useSkill;
useSkill = function (G, F, O, slot, inp) { const cd = F.cd[slot]; _us(G, F, O, slot, inp); if (F.cd[slot] > cd || (slot === 0 && F.c === 4)) { const k = CHARS[F.c].name + ':' + slot; STATS.use[k] = (STATS.use[k] || 0) + 1; } };
var __run = function (c, n) {
  const ids = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].filter((x) => x !== c);
  let w = 0, g = 0;
  for (const o of ids) for (let i = 0; i < n; i++) {
    rnd = mulberry32(c * 99 + o * 7 + i * 13 + 5);
    const G = newMatch(i % 2 ? o : c, i % 2 ? c : o, 'seoul', 'cpu', [false, true]);
    const m = [makeAIMem(), makeAIMem()]; let f = 0;
    while (G.phase !== 'end' && f < 36000) { G.ev = []; stepGame(G, [aiInput(G, G.F[0], G.F[1], m[0], 2), aiInput(G, G.F[1], G.F[0], m[1], 2)]); f++; }
    g++; if (G.mw === (i % 2 ? 1 : 0)) w++;
  }
  return { w, g, STATS };
};`, ctx);
const c = +(process.argv[2] || 0), n = +(process.argv[3] || 2);
const r = ctx.__run(c, n);
const nm = vm.runInContext('CHARS', ctx)[c].name;
console.log(nm, 'win', r.w + '/' + r.g);
console.log('use', Object.entries(r.STATS.use).filter(([k]) => k.startsWith(nm + ':')));
console.log('dmg', Object.entries(r.STATS.dmg).filter(([k]) => k.startsWith(nm + ':')).map(([k, v]) => k + '=' + Math.round(v)).join(' '));
console.log('res', Object.entries(r.STATS.res).filter(([k]) => k.startsWith(nm + ':')).map(([k, v]) => k.slice(nm.length + 1) + '=' + v).join(' '));
