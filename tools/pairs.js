// 특정 상성 승률: node tools/pairs.js "4-2,12-4" [판수=20] [덮어쓸.json] [diffs=1,2]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['00_core', '01_data', '10_sim', '11_ai'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
const ctx = { console, Math, JSON, Object, Array, Set }; vm.createContext(ctx);
vm.runInContext(src + `
var __pair = function (a, b, n, ov, diffs) {
  if (ov) for (const k in ov) Object.assign(BAL[k], ov[k]);
  let w = 0, g = 0;
  for (const d of diffs) for (let i = 0; i < n; i++) for (const sw of [0, 1]) {
    rnd = mulberry32(a * 1009 + b * 917 + i * 131 + d * 7 + sw * 3 + 99);
    const G = newMatch(sw ? b : a, sw ? a : b, 'seoul', 'cpu', [false, true]);
    const m = [makeAIMem(), makeAIMem()]; let f = 0;
    while (G.phase !== 'end' && f < 36000) { G.ev = []; stepGame(G, [aiInput(G, G.F[0], G.F[1], m[0], d), aiInput(G, G.F[1], G.F[0], m[1], d)]); f++; }
    g++; if (G.mw === (sw ? 1 : 0)) w++; else if (G.mw === -1) w += 0.5;
  }
  return Math.round(w / g * 100);
};`, ctx);
const pairs = process.argv[2].split(',').map((s) => s.split('-').map(Number));
const n = +(process.argv[3] || 20), ov = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null;
const diffs = (process.argv[5] || '2,3').split(',').map(Number);
const N = vm.runInContext('CHARS', ctx).map((c) => c.name);
console.log(pairs.map(([a, b]) => `${N[a]}>${N[b]} ${ctx.__pair(a, b, n, ov, diffs)}%`).join('  '));
