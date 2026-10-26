// 버그 탐지용 무작위 대전: node tools/fuzz.js [판수=1]
// (사명감 초크는 연타로 빠져나오는 설계라 경직 검사에서 제외)
// 무작위 입력·AI를 섞어 모든 조합을 돌리며 예외, NaN, 맵 밖 이탈, 끝나지 않는 공격, 긴 무한 경직 등을 찾음
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), vm = require('vm'), path = require('path');
function run({ jobs, n }) {
  const src = ['00_core', '01_data', '10_sim', '11_ai'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8')).join('\n');
  const ctx = { console, Math, JSON, Object, Array, Set, Number }; vm.createContext(ctx);
  vm.runInContext(src + `
  var __fz = function (jobs, n) {
    const bad = {};
    const flag = (k, s) => { if (!bad[k]) bad[k] = s; };
    for (const [a, b, mode] of jobs) for (let g = 0; g < n; g++) {
      const seed = a * 7919 + b * 131 + g * 17 + mode * 3;
      rnd = mulberry32(seed); const R = mulberry32(seed + 99);
      const G = newMatch(a, b, 'seoul', 'cpu', [false, true]); const m = [makeAIMem(), makeAIMem()];
      const held = [{ h: 0, p: 0, t: 0 }, { h: 0, p: 0, t: 0 }]; let f = 0; const lock = [0, 0];
      try {
        while (G.phase !== 'end' && f < 60 * 60 * 15) {
          G.ev = [];
          const inp = [0, 1].map((s) => {
            const F = G.F[s], O = G.F[1 - s];
            if (mode === 0 || (mode === 1 && s === 0)) {
              const hd = held[s]; if (--hd.t <= 0) { hd.t = 1 + Math.floor(R() * 25); hd.h = [0, B_L, B_R, B_D, B_L | B_U][Math.floor(R() * 5)]; }
              let p = 0; for (const bb of [B_U, B_P, B_K, B_S1, B_S2, B_S3, B_S4, B_S5, B_S6]) if (R() < 0.04) p |= bb;
              const keys = G.qte && R() < 0.05 ? QTE_KEYS[Math.floor(R() * QTE_KEYS.length)] : '';
              return { h: hd.h, p, keys, a: R() < 0.1 ? 1 : 0 };
            }
            return aiInput(G, F, O, m[s], F.boss ? 6 : 3 + (g % 3));
          });
          stepGame(G, inp); f++;
          for (const F of G.F) {
            for (const k of ['x', 'y', 'hp', 'vx', 'vy', 'kb', 'maxHp']) if (!Number.isFinite(F[k])) flag('NaN ' + k, CHARS[a].name + ' vs ' + CHARS[b].name + ' f' + f);
            if (F.x < -5 || F.x > ARENA_W + 5) flag('맵 밖 x=' + Math.round(F.x), CHARS[F.c].name + ' (' + CHARS[a].name + ' vs ' + CHARS[b].name + ')');
            if (F.atk && F.atkT > F.atkDur + 3) flag('공격 안 끝남', CHARS[F.c].name);
            if (F.hp > F.maxHp + BAL[6].bellyHeal + 1) flag('과회복 hp=' + Math.round(F.hp) + '/' + F.maxHp, CHARS[F.c].name);
            if (F.y < -1) flag('땅 아래 y', CHARS[F.c].name);
            const locked = G.phase === 'fight' && !G.freezeT && !G.qte && !G.yut && !G.dice && (F.stunT > 0 || F.hitT > 0 || F.rootT > 0 && F.atk);
            const other = G.F[1 - F.side];
            lock[F.side] = locked && !(other.c === BOSS && other.domT > 0) ? lock[F.side] + 1 : 0;
            if (lock[F.side] > 420) flag('7초 넘게 계속 경직/기절: ' + CHARS[F.c].name, '상대 ' + CHARS[other.c].name + ' stun' + F.stunT + ' hit' + F.hitT + ' choke' + F.chokeT);
          }
          if (G.freezeT > 900) flag('정지 시간 너무 김 ' + G.freezeT, CHARS[a].name + ' vs ' + CHARS[b].name);
          if (G.proj.length > 120) flag('투사체 폭증 ' + G.proj.length, CHARS[a].name + ' vs ' + CHARS[b].name);
        }
        if (G.phase !== 'end') flag('경기가 안 끝남', CHARS[a].name + ' vs ' + CHARS[b].name + ' timer' + G.timer + ' phase ' + G.phase);
      } catch (e) { flag('예외: ' + e.message, CHARS[a].name + ' vs ' + CHARS[b].name + ' f' + f + ' ' + String(e.stack).split('\\n')[1]); }
    }
    return bad;
  };`, ctx);
  return ctx.__fz(jobs, n);
}
if (!isMainThread) { parentPort.postMessage(run(workerData)); return; }
(async () => {
  const n = +(process.argv[2] || 1), ids = [...Array(18).keys()];
  const jobs = []; for (const a of ids) for (const b of ids) if (!(a === 17 && b === 17)) for (const mode of [0, 1, 2]) jobs.push([a, b, mode]);
  const W = require('os').cpus().length, ch = Array.from({ length: W }, (_, i) => jobs.filter((_, j) => j % W === i));
  const res = await Promise.all(ch.map((c) => new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { jobs: c, n } }); w.on('message', ok); w.on('error', bad); })));
  const all = Object.assign({}, ...res);
  const keys = Object.keys(all);
  console.log(keys.length ? keys.map((k) => '- ' + k + ' :: ' + all[k]).join('\n') : '문제 없음');
})();
