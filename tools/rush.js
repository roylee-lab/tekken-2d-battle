// LUNATIC 검증: 사람처럼 "맞으면서 들이대는" 플레이(러시)로 LUNATIC CPU를 상대해 승률 측정
// 사용법: node tools/rush.js [판수=2] [정책=rush,rushk,ai4] [P1캐릭=all] [CPU난이도=5]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), vm = require('vm'), path = require('path');
const NAMES = ['일반인','mola','JJjin','죽림','이은뚱','사명감','안거녕','독민재','힙찔','창가오','매미킴','Tiron','힌참휴','영탁','허도개미','차니팍','이유동','보스'];
function run({ jobs, n, diff }) {
  const src = ['00_core', '01_data', '10_sim', '11_ai'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
  const ctx = { console, Math, JSON, Object, Array, Set }; vm.createContext(ctx);
  vm.runInContext(src + `
  function rushInput(G, F, O, mem, pol) {
    if (G.phase !== 'fight') return { h: 0, p: 0 };
    if (G.qte) { const q = G.qte; let keys = ''; if (q.st === 'show' && q.t === 14) keys = q.L; return { h: 0, p: 0, keys, a: 0 }; }
    if (F.chokeT > 0) return { h: 0, p: 0, keys: '', a: rnd() < 0.15 ? 1 : 0 };
    const dx = O.x - F.x, d = Math.abs(dx), toward = dx > 0 ? B_R : B_L;
    let h = toward, p = 0;
    if (d <= meleeRange(F, O, 'P') - 2) p |= (pol === 'rushk' && rnd() < 0.4) ? B_K : B_P;
    else if (pol === 'rushk' && d <= meleeRange(F, O, 'K') - 2) p |= B_K;
    for (let s = 0; s < 4; s++) if (skillDef(F.c, s) && F.cd[s] <= 0 && F.seal[s] <= 0 && AI_SKILL[F.c] && AI_SKILL[F.c][s] && AI_SKILL[F.c][s](F, O, d) && rnd() < 0.03) p |= B_SK[s];
    return { h, p, keys: '', a: 0 };
  }
  var __run = function (jobs, n, diff) {
    const out = [];
    for (const [a, b, pol] of jobs) for (let g = 0; g < n; g++) {
      rnd = mulberry32(a * 1009 + b * 917 + g * 131 + pol.length * 7 + 5);
      const G = newMatch(a, b, 'seoul', 'cpu', [false, true]);
      const m = [makeAIMem(), makeAIMem()]; let f = 0;
      while (G.phase !== 'end' && f < 60 * 60 * 10) { G.ev = [];
        const i0 = pol === 'ai4' ? aiInput(G, G.F[0], G.F[1], m[0], 4) : rushInput(G, G.F[0], G.F[1], m[0], pol);
        stepGame(G, [i0, aiInput(G, G.F[1], G.F[0], m[1], diff)]); f++; }
      out.push([a, b, pol, G.mw, G.F[0].hp / G.F[0].maxHp]);
    }
    return out;
  };`, ctx);
  return ctx.__run(jobs, n, diff);
}
if (!isMainThread) { parentPort.postMessage(run(workerData)); return; }
(async () => {
  const n = +(process.argv[2] || 2), pols = (process.argv[3] || 'rush,rushk,ai4').split(',');
  const P1 = process.argv[4] && process.argv[4] !== 'all' ? process.argv[4].split(',').map(Number) : [...Array(17).keys()];
  const diff = +(process.argv[5] || 5);
  const OPP = (process.env.OPP || [...Array(17).keys()].join(',')).split(',').map(Number);
  const jobs = []; for (const a of P1) for (const b of OPP) for (const pol of pols) jobs.push([a, b, pol]);
  const W = require('os').cpus().length, ch = Array.from({ length: W }, (_, i) => jobs.filter((_, j) => j % W === i));
  const res = (await Promise.all(ch.map((c) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { jobs: c, n, diff } }); w.on('message', ok); w.on('error', bad); })))).flat();
  for (const pol of pols) {
    const row = P1.map((a) => { const r = res.filter((x) => x[0] === a && x[2] === pol); return NAMES[a] + ':' + Math.round(r.filter((x) => x[3] === 0).length / r.length * 100); });
    const all = res.filter((x) => x[2] === pol);
    console.log(pol.padEnd(6), 'P1 승률 ' + Math.round(all.filter((x) => x[3] === 0).length / all.length * 100) + '%  |', row.join(' '));
  }
  if (process.env.LOSSES) for (const x of res.filter((x) => x[3] === 0)) console.log('loss', NAMES[x[1]], 'vs', NAMES[x[0]], x[2]);
})();
