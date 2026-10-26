// 판정 박스 측정기: 실제 그려지는 스프라이트에서 주먹·발 끝, 몸통 앞면, 키를 재서 HITBOX 표를 출력
// 사용법: python build.py /tmp/g.html && NODE_PATH=$(npm root -g) node tools/hitbox.cjs /tmp/g.html
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + require('path').resolve(process.argv[2] || 'index.html')); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 500; cv.height = 400; const c = cv.getContext('2d', { willReadFrequently: true });
    function rows(F, pose) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 500, 400); c.save(); c.translate(200, 330); c.scale(FSCALE, FSCALE);
      drawCharacter(c, F.c, pose, 0, { look: lookOf(F) }); c.restore();
      const d = c.getImageData(0, 0, 500, 400).data, R = []; let top = 400;
      for (let y = 0; y < 400; y++) { let mx = -999; for (let x = 0; x < 500; x++) if (d[(y * 500 + x) * 4 + 3] > 40) { mx = x; if (y < top) top = y; } R.push(mx - 200); }
      return { R, h: 330 - top };
    }
    const tip = (F, atk, st) => { F.atk = atk; F.atkStep = st; F.atkAct = 6; F.atkT = 6; F.atkDur = 14; const { R } = rows(F, poseOf(F, 'atk', null)); F.atk = null; return Math.max(...R); };
    const out = [];
    const one = (F) => {
      const po = poseOf(F, 'idle', null); po.hand = 'hide'; po.bhand = 'hide';
      const { R, h } = rows(F, po);
      let f = -999; for (let y = Math.round(330 - h * 0.75); y < 330 - h * 0.45; y++) f = Math.max(f, R[y]);
      return { p: Math.max(tip(F, 'P', 1), tip(F, 'P', 2)), k: tip(F, 'K', 1), f, h };
    };
    for (let i = 0; i < CHARS.length; i++) { const F = makeFighter(0, i); F.f = 1; out.push(one(F)); }
    const S = makeFighter(0, 6); S.slim = true; const slim = one(S);
    return { out, slim };
  });
  console.log('const HITBOX = [   // tools/hitbox.cjs 로 측정 (p 주먹끝, k 발끝, f 몸통 앞면, h 키)');
  r.out.forEach((o, i) => console.log(`  { p: ${o.p}, k: ${o.k}, f: ${o.f}, h: ${o.h} },   // ${i}`));
  console.log('];');
  console.log(`const HITBOX_SLIM = { p: ${r.slim.p}, k: ${r.slim.k}, f: ${r.slim.f}, h: ${r.slim.h} };`);
  await b.close();
})();
