// 승률 시뮬레이터 (Node.js 필요)
// 사용법: node tools/balance.js [조합당 판수=4] [덮어쓸 수치.json] [matrix]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), vm = require('vm');
const IDS = (process.env.IDS || '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16').split(',').map(Number);
const NAMES = ['일반인','mola','JJjin','죽림','이은뚱','사명감','안거녕','독민재','힙찔','창가오','매미킴','Tiron','힌참휴','영탁','허도개미','차니팍','이유동'];
function runChunk({ pairs, n, ov, diffs, seedOff }) {
  const src = ['00_core','01_data','10_sim','11_ai'].map(f=>fs.readFileSync(require('path').join(__dirname,'..','src',f+'.js'),'utf8')).join('\n');
  const ctx = { console, Math, JSON, Object, Array, Set };
  vm.createContext(ctx);
  vm.runInContext(src + `
  var SEEDOFF = 0; var __run = function(pairs, n, ov, diffs, so){ SEEDOFF = so || 0;
    if (ov) { for (const k in ov) { if (k==='ATK') Object.assign(ATK, ov.ATK); else if (k==='SLOT') {} else Object.assign(BAL[k], ov[k]); } }
    const out = [];
    for (const [a,b] of pairs) for (const diff of diffs) for (let g=0; g<n; g++) {
      rnd = mulberry32(a*1009 + b*917 + g*131 + diff*7 + 1 + SEEDOFF * 7777);
      const G = newMatch(a, b, 'seoul', 'cpu', [false, true]);
      const m = [makeAIMem(), makeAIMem()];
      let f = 0;
      while (G.phase !== 'end' && f < 60*60*10) { G.ev = []; stepGame(G, [aiInput(G,G.F[0],G.F[1],m[0],diff), aiInput(G,G.F[1],G.F[0],m[1],diff)]); f++; }
      out.push([a, b, G.mw, f, G.F[0].wins, G.F[1].wins]);
    }
    return out;
  };`, ctx);
  return ctx.__run(pairs, n, ov, diffs, seedOff);
}
if (!isMainThread) { parentPort.postMessage(runChunk(workerData)); return; }
(async () => {
  const n = +(process.argv[2] || 3);
  const ov = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
  const diffs = (process.env.DIFFS || '2,3').split(',').map(Number);
  const pairs = [];
  for (const a of IDS) for (const b of IDS) if (a !== b) pairs.push([a, b]);
  const W = +(process.env.W || require('os').cpus().length), chunks = Array.from({ length: W }, (_, i) => pairs.filter((_, j) => j % W === i));
  const t0 = Date.now();
  const res = (await Promise.all(chunks.map((c) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { pairs: c, n, ov, diffs, seedOff: +(process.env.SEEDOFF || 0) } }); w.on('message', ok); w.on('error', bad); })))).flat();
  const win = {}, games = {}, mat = {};
  let frames = 0;
  for (const [a, b, mw, f] of res) {
    frames += f;
    for (const c of [a, b]) games[c] = (games[c] || 0) + 1;
    const wa = mw === 0 ? 1 : mw === 1 ? 0 : 0.5;
    win[a] = (win[a] || 0) + wa; win[b] = (win[b] || 0) + 1 - wa;
    const k = a < b ? a + '-' + b : b + '-' + a; mat[k] = mat[k] || [0, 0]; mat[k][1]++; mat[k][0] += a < b ? wa : 1 - wa;
  }
  const rows = IDS.map((c) => [c, win[c] / games[c] * 100]).sort((x, y) => y[1] - x[1]);
  console.log(`games ${res.length}, avg match ${(frames / res.length / 60).toFixed(0)}s, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(rows.map(([c, w]) => `${NAMES[c]}:${w.toFixed(0)}%`).join('  '));
  if (process.argv[4] === 'matrix') {
    for (const a of IDS) console.log(NAMES[a].padEnd(5), IDS.map((b) => a === b ? '  -' : String(Math.round((a < b ? mat[a + '-' + b][0] : mat[b + '-' + a][1] - mat[b + '-' + a][0]) / mat[a < b ? a + '-' + b : b + '-' + a][1] * 100)).padStart(3)).join(' '));
  }
  if (process.env.MATRIX_OUT) fs.writeFileSync(process.env.MATRIX_OUT, JSON.stringify({ ids: IDS, names: IDS.map((c) => NAMES[c]), overall: Object.fromEntries(rows.map(([c, w]) => [c, +w.toFixed(1)])), games: res.length, mat }));
  fs.writeFileSync(require('path').join(__dirname,'last_balance.json'), JSON.stringify(Object.fromEntries(rows.map(([c, w]) => [c, +w.toFixed(1)]))));
})();
