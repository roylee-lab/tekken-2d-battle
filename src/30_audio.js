// ============================================================
//  오디오: 효과음 신시사이저 + 나라별 오리지널 칩튠 BGM 생성기
// ============================================================
const AUD = {
  ctx: null, master: null, musicBus: null, sfxBus: null, noise: null, waves: {},
  musicOn: true, sfxOn: true, voiceOn: true,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master = c.createGain(); this.master.gain.value = 0.85;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicOn ? 0.3 : 0; this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0; this.sfxBus.connect(this.master);
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const pulse = (duty) => {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return c.createPeriodicWave(re, im);
    };
    this.waves.p25 = pulse(0.25); this.waves.p12 = pulse(0.125);
  },
  resume() {
    this.init();
    if (!this.ctx) return;
    const go = () => { if (MUSIC.want && MUSIC.key !== MUSIC.want) { const k = MUSIC.want; MUSIC.key = null; playMusic(k); } };
    if (this.ctx.state === 'suspended') this.ctx.resume().then(go).catch(() => {}); else go();
  },
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.3 : 0, this.ctx.currentTime, 0.05); },
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05); },
};

function aOsc(type, freq, t0, dur, vol, bus, opt) {
  const c = AUD.ctx; if (!c) return;
  opt = opt || {};
  const o = c.createOscillator(), g = c.createGain();
  if (type === 'p25' || type === 'p12') o.setPeriodicWave(AUD.waves[type]); else o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t0 + (opt.slideT || dur));
  if (opt.vib) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = opt.vib; lg.gain.value = freq * 0.012;
    l.connect(lg); lg.connect(o.frequency); l.start(t0 + 0.08); l.stop(t0 + dur + 0.1);
  }
  const a = opt.a || 0.005, rel = opt.r || 0.05, sus = opt.s === undefined ? 0.7 : opt.s;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sus), t0 + a + (opt.d || 0.08));
  g.gain.setValueAtTime(Math.max(0.0001, vol * sus), t0 + Math.max(dur, a + 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
  let node = o;
  if (opt.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp; f.Q.value = opt.q || 1; o.connect(f); node = f; }
  node.connect(g); g.connect(bus || AUD.sfxBus);
  o.start(t0); o.stop(t0 + dur + rel + 0.02);
}
function aNoise(t0, dur, vol, ftype, freq, bus, opt) {
  const c = AUD.ctx; if (!c) return;
  opt = opt || {};
  const s = c.createBufferSource(); s.buffer = AUD.noise;
  const f = c.createBiquadFilter(); f.type = ftype || 'highpass'; f.frequency.setValueAtTime(freq || 1000, t0); f.Q.value = opt.q || 0.8;
  if (opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(bus || AUD.sfxBus);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 합창 소리: 살짝 어긋난 톱니파 3개 + '아' 모음 포먼트 필터
function aChoir(freq, t0, dur, vol, bus, solo) {
  const c = AUD.ctx; if (!c) return;
  const mix = c.createGain(), out = c.createGain();
  for (const [f, q, gv] of [[730, 7, 1], [1090, 9, 0.55], [2440, 12, 0.22], [300, 3, 0.35]]) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = c.createGain(); g.gain.value = gv; mix.connect(bp); bp.connect(g); g.connect(out);
  }
  const end = t0 + dur + 0.35;
  for (const det of [-9, 0, 8]) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 4.6 + det * 0.05; lg.gain.value = solo ? 7 : 4;
    l.connect(lg); lg.connect(o.detune); o.connect(mix); o.start(t0); o.stop(end); l.start(t0); l.stop(end);
  }
  const a = solo ? 0.06 : 0.18;
  out.gain.setValueAtTime(0.0001, t0); out.gain.linearRampToValueAtTime(vol * 2.4, t0 + a);
  out.gain.setValueAtTime(vol * 2.4, t0 + Math.max(a, dur - 0.05)); out.gain.exponentialRampToValueAtTime(0.0001, end);
  out.connect(bus || AUD.musicBus);
}

// ---------- 효과음 ----------
const SFX = {
  swing(t) { aNoise(t, 0.08, 0.25, 'bandpass', 1500, null, { sweep: 4000, q: 1.5 }); },
  swing2(t) { aNoise(t, 0.13, 0.3, 'bandpass', 900, null, { sweep: 3000, q: 1.2 }); },
  hitP(t) { aNoise(t, 0.1, 0.7, 'lowpass', 2500); aOsc('square', 180, t, 0.06, 0.35, null, { slide: 60 }); },
  hitK(t) { aNoise(t, 0.16, 0.9, 'lowpass', 1800); aOsc('square', 140, t, 0.1, 0.45, null, { slide: 40 }); aOsc('sine', 70, t, 0.15, 0.6, null, { slide: 35 }); },
  block(t) { aOsc('square', 900, t, 0.03, 0.2); aOsc('square', 1300, t + 0.02, 0.04, 0.15); aNoise(t, 0.05, 0.3, 'highpass', 3000); },
  miss() {},
  jump(t) { aOsc('p25', 300, t, 0.08, 0.12, null, { slide: 700 }); },
  land(t) { aNoise(t, 0.05, 0.12, 'lowpass', 500); },
  skill(t) { aOsc('p25', 520, t, 0.07, 0.15, null, { slide: 1040 }); aOsc('p12', 780, t + 0.05, 0.08, 0.1, null, { slide: 1560 }); },
  parry(t) { aOsc('triangle', 1500, t, 0.18, 0.35, null, { slide: 3000, r: 0.2 }); aOsc('square', 2200, t, 0.05, 0.12); },
  immune(t) { aOsc('sine', 1200, t, 0.1, 0.18, null, { slide: 1800 }); },
  chomp(t) { for (let i = 0; i < 3; i++) aNoise(t + i * 0.07, 0.04, 0.25, 'bandpass', 700); },
  powerup(t) { [0, 4, 7, 12].forEach((s, i) => aOsc('p25', mtof(72 + s), t + i * 0.05, 0.06, 0.13)); },
  whoosh(t) { aNoise(t, 0.3, 0.35, 'bandpass', 400, null, { sweep: 2500, q: 2 }); },
  tooth(t) { aOsc('square', 1400, t, 0.03, 0.12, null, { slide: 600 }); },
  stab(t) { aOsc('sawtooth', 300, t, 0.08, 0.25, null, { slide: 900 }); },
  dice(t) { for (let i = 0; i < 4; i++) aNoise(t + i * 0.05, 0.03, 0.25, 'bandpass', 3000); },
  tick(t) { aOsc('square', 1800, t, 0.015, 0.08); },
  jackpot(t) { [0, 4, 7, 12, 16].forEach((s, i) => aOsc('square', mtof(76 + s), t + i * 0.06, 0.08, 0.14)); },
  fart(t) { aOsc('sawtooth', 90, t, 0.35, 0.3, null, { slide: 55, lp: 400, vib: 25 }); aNoise(t, 0.3, 0.15, 'lowpass', 300); },
  explosion(t) { aNoise(t, 0.9, 1.0, 'lowpass', 1200, null, { sweep: 80 }); aOsc('sine', 90, t, 0.6, 0.8, null, { slide: 25 }); },
  hack(t) { for (let i = 0; i < 10; i++) aOsc('square', mtof(84 + ((i * 7) % 12)), t + i * 0.035, 0.025, 0.08); },
  charge(t) { aOsc('sawtooth', 200, t, 0.18, 0.18, null, { slide: 800, lp: 2000 }); },
  roar(t) { aOsc('sawtooth', 110, t, 0.5, 0.35, null, { slide: 70, lp: 900, vib: 18 }); aNoise(t, 0.5, 0.25, 'lowpass', 700); },
  revive(t) { [0, 7, 12, 19, 24].forEach((s, i) => aOsc('triangle', mtof(67 + s), t + i * 0.08, 0.2, 0.18, null, { r: 0.3 })); },
  ko(t) { aOsc('sawtooth', 220, t, 0.6, 0.35, null, { slide: 55, lp: 1500 }); aNoise(t, 0.6, 0.6, 'lowpass', 900, null, { sweep: 100 }); },
  clash(t) { aOsc('square', 600, t, 0.08, 0.2, null, { slide: 200 }); aNoise(t, 0.12, 0.4, 'bandpass', 2000); },
  note1(t) { aOsc('p25', mtof(76), t, 0.1, 0.16); },
  note2(t) { aOsc('p25', mtof(79), t, 0.1, 0.16); },
  note3(t) { aOsc('p25', mtof(83), t, 0.12, 0.16); },
  deny(t) { aOsc('square', 160, t, 0.12, 0.2); aOsc('square', 120, t + 0.1, 0.15, 0.2); },
  cursor(t) { aOsc('square', 990, t, 0.03, 0.1); },
  confirm(t) { aOsc('square', 660, t, 0.06, 0.14); aOsc('square', 990, t + 0.06, 0.1, 0.14); },
  back(t) { aOsc('square', 500, t, 0.05, 0.12, null, { slide: 300 }); },
  round(t) { aOsc('sawtooth', mtof(57), t, 0.25, 0.18, null, { lp: 1800 }); aOsc('sawtooth', mtof(64), t, 0.25, 0.14, null, { lp: 1800 }); },
  fight(t) { aNoise(t, 0.4, 0.6, 'lowpass', 2000, null, { sweep: 200 }); [57, 64, 69].forEach((m) => aOsc('sawtooth', mtof(m), t, 0.35, 0.16, null, { lp: 2500 })); },
};
function playSfx(name) {
  if (!AUD.ctx || !AUD.sfxOn) return;
  const f = SFX[name]; if (f) { try { f(AUD.ctx.currentTime + 0.005); } catch (e) { /* 무시 */ } }
}
// 아나운서 (브라우저 음성합성, 영어)
function announce(text) {
  if (!AUD.voiceOn || !AUD.sfxOn || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 0.55; u.volume = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* 무시 */ }
}

// ---------- BGM 생성기 ----------
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], phrygdom: [0, 1, 4, 5, 7, 8, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
  bhairav: [0, 1, 4, 5, 7, 8, 11], majpent: [0, 2, 4, 7, 9], minpent: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10], gungjung: [0, 2, 5, 7, 9], insen: [0, 1, 5, 7, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
};
// 스타일: 드럼/베이스/리듬 패턴 (spb = 마디당 스텝)
const STYLES = {
  rock: { spb: 16, k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'R.R.R.R.R.R.F.O.', lead: 'sawtooth', leadLp: 2600, arp: 'p12', rh: 0 },
  kpop: { spb: 16, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'R..R..R.O..R..F.', lead: 'p25', arp: 'p12', clap: true, rh: 1 },
  gugak: { spb: 16, k: 'x.........x.....', s: '', h: '', tom: 'x.....x...x.x...', bass: 'R.......F.......', lead: 'triangle', vib: 5.5, arp: null, rh: 2, slow: true },
  musette: { spb: 16, k: 'x.......x.......', s: '....x.......x...', h: '', bass: 'R...F...R...F...', chord: '..x...x...x...x.', lead: 'p25', arp: null, rh: 3, vib: 6 },
  eastern: { spb: 16, k: 'x.....x.x.......', s: '....x.......x...', h: '', block: 'x..x..x.x..x..x.', gong: true, bass: 'R...R...F...R...', lead: 'triangle', vib: 5, arp: 'p12', rh: 2 },
  samba: { spb: 16, k: 'x..x.x..x..x.x..', s: '..x...x...x..x.x', h: 'xxxxxxxxxxxxxxxx', shaker: true, bass: 'R..F.R..R..F.O..', lead: 'p25', arp: 'p12', rh: 4 },
  tarantella: { spb: 12, k: 'x.....x.....', s: '...x.....x..', h: 'xxxxxxxxxxxx', shaker: true, bass: 'R.....F.....', chord: '..x.x...x.x.', lead: 'square', arp: null, rh: 5 },
  arabic: { spb: 16, k: 'x.......x.......', tek: '..x...x.....x...', s: '', h: '', bass: 'R.......R...F...', lead: 'sawtooth', leadLp: 1800, vib: 6, arp: null, rh: 6, drone: true },
  hiphop: { spb: 16, k: 'x......x..x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx', swing: 0.18, bass: 'R......R..R.....', lead: 'triangle', arp: 'p25', arpSlow: true, rh: 7, scratch: true },
  indian: { spb: 16, k: 'x.....x.x.......', tek: '..x.x.....x.x.x.', s: '', h: '', bass: 'R...............', drone: true, lead: 'p25', leadLp: 2200, vib: 6.5, slide: true, arp: null, rh: 6 },
  flamenco: { spb: 12, k: 'x.....x.....', clapP: '..x..x.x.x.x', s: '', h: '', bass: 'R.....R.....', strum: 'x..x..x.x.x.', lead: 'sawtooth', leadLp: 2400, arp: null, rh: 5 },
  techno: { spb: 16, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'RRORRROR RRORRRO', lead: 'square', arp: 'p12', arpFast: true, rh: 0 },
  // ---- 나라별 추가 스타일 ----
  trot: { spb: 16, k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', bass: 'R...F...R...F...', chord: '..x...x...x...x.', lead: 'sawtooth', leadLp: 2000, vib: 7, slide: true, arp: null, rh: 3 },      // 한국 트로트 (뽕짝 2박)
  semachi: { spb: 12, k: 'x.....x.....', s: '', h: '', tom: 'x..x..x.x...', block: '...x.....x..', bass: 'R.....F.....', lead: 'triangle', vib: 5, slide: true, arp: null, rh: 5, slow: true },   // 국악 세마치 장단 (3박)
  waltz: { spb: 12, k: 'x...........', s: '', h: '', bass: 'R...........', chord: '....x...x...', lead: 'p25', vib: 6, arp: null, rh: 5 },     // 프랑스 왈츠 (아코디언)
  manouche: { spb: 16, k: 'x.......x.......', s: '', h: '', swing: 0.2, bass: 'R...F...O...F...', strum: '..x...x...x...x.', lead: 'p25', vib: 5, arp: null, rh: 1 },   // 집시 재즈
  bossa: { spb: 16, k: 'x..x..x.x..x..x.', s: '', h: 'x.x.x.x.x.x.x.x.', shaker: true, block: 'x..x..x...x..x..', bass: 'R..F....R..F....', chord: '..x..x...x..x...', lead: 'triangle', vib: 4, arp: null, rh: 7 },   // 보사노바
  swingjazz: { spb: 12, k: 'x.....x.....', s: '', h: '', ride: 'x..x.xx..x.x', bass: 'R..F..O..F..', chord: '...x.....x..', lead: 'square', leadLp: 2200, arp: null, rh: 5 },   // 뉴욕 스윙 재즈
  funk: { spb: 16, k: 'x..x..x...x.....', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx', bass: 'R..R.O..R.R..F.O', lead: 'sawtooth', leadLp: 2400, arp: 'p12', rh: 4 },
  enka: { spb: 16, k: 'x.......x.......', s: '........x.......', h: '', bass: 'R.......F.......', chord: '....x.......x...', lead: 'triangle', vib: 6.5, slide: true, arp: null, rh: 2, slow: true },   // 일본 엔카
  matsuri: { spb: 16, k: '', s: '', h: '', taiko: 'x.x...x.x.x.....', block: '..x...x...x...x.', bass: 'R...R...F...R...', lead: 'p12', vib: 5, arp: 'p25', rh: 0 },   // 일본 마쓰리 (타이코)
  erhu: { spb: 16, k: 'x.......x.......', s: '', h: '', block: 'x...x...x.x.x...', gong: true, bass: 'R.......F.......', lead: 'sawtooth', leadLp: 1500, vib: 6, slide: true, arp: null, rh: 2, slow: true },   // 중국 얼후
  danbau: { spb: 16, k: 'x.......x...x...', s: '', h: '', block: '..x...x...x...x.', bass: 'R.......R...F...', lead: 'triangle', vib: 7, slide: true, arp: 'p12', arpSlow: true, rh: 2 },   // 베트남 단버우
  bhangra: { spb: 16, k: 'x..x..x.x..x..x.', tek: 'x.xx.x.xx.x.xx.x', s: '', h: '', bass: 'R..R..R.F..F..F.', lead: 'p25', vib: 6, arp: null, rh: 4 },   // 인도 방그라 (돌 북)
  maqsum: { spb: 16, k: 'x.....x...x.....', tek: '...x.x.....x.x..', s: '', h: '', bass: 'R.....R...F.....', lead: 'sawtooth', leadLp: 2000, vib: 6, slide: true, arp: null, rh: 6, drone: true },   // 이집트 막숨 리듬
  pasodoble: { spb: 16, k: 'x.......x.......', s: '....x.......x...', h: '', brass: 'x.......x...x...', bass: 'R...F...R...F...', lead: 'sawtooth', leadLp: 2800, arp: null, rh: 3 },   // 스페인 파소도블레
  mandolin: { spb: 16, k: 'x.......x.......', s: '', h: '', bass: 'R...F...R...F...', chord: '..x...x...x...x.', lead: 'p12', trem: true, arp: null, rh: 2 },   // 이탈리아 만돌린 칸초네
  // 최종 보스: 합창·팀파니·현악 오스티나토로 웅장하게
  epic: { spb: 16, timp: 'x.....x.x.......', osti: 'x.x.x.x.x.x.x.x.', choirPad: true, brass: 'x.........x.....', hit: true, s: '', h: '', bass: 'R.......R.......', lead: 'choir', arp: null, rh: 2 },
};
// 스테이지마다 여러 곡 (매 판 무작위로 고르고, 두 번 반복하면 다음 곡으로 넘어감)
const SONGS = {
  title: { bpm: 132, root: 57, scale: 'minor', prog: [0, 5, 2, 6], style: 'rock', seed: 3 },
  select: { bpm: 140, root: 60, scale: 'major', prog: [0, 4, 5, 3], style: 'kpop', seed: 9 },
  seoul: [
    { bpm: 142, root: 62, scale: 'major', prog: [0, 4, 5, 3], style: 'kpop', seed: 21 },
    { bpm: 126, root: 57, scale: 'minpent', prog: [0, 3, 4, 0], style: 'trot', seed: 121 },
    { bpm: 128, root: 61, scale: 'minor', prog: [5, 3, 0, 4], style: 'kpop', seed: 221 },
  ],
  palace: [
    { bpm: 104, root: 60, scale: 'gungjung', prog: [0, 3, 2, 0], style: 'gugak', seed: 22 },
    { bpm: 96, root: 62, scale: 'gungjung', prog: [0, 2, 3, 0], style: 'semachi', seed: 122 },
    { bpm: 118, root: 57, scale: 'majpent', prog: [0, 3, 4, 0], style: 'semachi', seed: 222 },
  ],
  paris: [
    { bpm: 150, root: 62, scale: 'major', prog: [0, 5, 1, 4], style: 'musette', seed: 23 },
    { bpm: 168, root: 60, scale: 'major', prog: [0, 3, 4, 0], style: 'waltz', seed: 123 },
    { bpm: 176, root: 57, scale: 'harmonic', prog: [0, 3, 4, 0], style: 'manouche', seed: 223 },
  ],
  halong: [
    { bpm: 122, root: 62, scale: 'minpent', prog: [0, 3, 2, 0], style: 'eastern', seed: 24 },
    { bpm: 100, root: 60, scale: 'minpent', prog: [0, 2, 3, 0], style: 'danbau', seed: 124 },
    { bpm: 138, root: 64, scale: 'majpent', prog: [0, 3, 4, 0], style: 'danbau', seed: 224 },
  ],
  greatwall: [
    { bpm: 136, root: 60, scale: 'majpent', prog: [0, 3, 4, 0], style: 'eastern', seed: 25 },
    { bpm: 92, root: 62, scale: 'minpent', prog: [0, 3, 2, 0], style: 'erhu', seed: 125 },
    { bpm: 150, root: 65, scale: 'majpent', prog: [0, 4, 3, 0], style: 'eastern', seed: 225 },
  ],
  rio_dojo: [
    { bpm: 156, root: 57, scale: 'dorian', prog: [0, 3, 0, 4], style: 'samba', seed: 26 },
    { bpm: 132, root: 60, scale: 'major', prog: [1, 4, 0, 5], style: 'bossa', seed: 126 },
    { bpm: 168, root: 62, scale: 'mixo', prog: [0, 6, 3, 4], style: 'samba', seed: 226 },
  ],
  pisa: [
    { bpm: 168, root: 62, scale: 'harmonic', prog: [0, 3, 4, 0], style: 'tarantella', seed: 27 },
    { bpm: 112, root: 60, scale: 'major', prog: [0, 3, 4, 0], style: 'mandolin', seed: 127 },
    { bpm: 184, root: 57, scale: 'harmonic', prog: [0, 5, 4, 0], style: 'tarantella', seed: 227 },
  ],
  pyramid: [
    { bpm: 126, root: 62, scale: 'hijaz', prog: [0, 0, 6, 0], style: 'arabic', seed: 28 },
    { bpm: 140, root: 60, scale: 'hijaz', prog: [0, 6, 5, 0], style: 'maqsum', seed: 128 },
    { bpm: 104, root: 57, scale: 'hijaz', prog: [0, 1, 0, 6], style: 'arabic', seed: 228 },
  ],
  copacabana: [
    { bpm: 92, root: 58, scale: 'dorian', prog: [0, 3, 0, 4], style: 'hiphop', seed: 29 },
    { bpm: 124, root: 62, scale: 'major', prog: [1, 4, 0, 5], style: 'bossa', seed: 129 },
    { bpm: 160, root: 60, scale: 'mixo', prog: [0, 3, 6, 4], style: 'samba', seed: 229 },
  ],
  newyork: [
    { bpm: 152, root: 52, scale: 'mixo', prog: [0, 3, 0, 4], style: 'rock', seed: 30 },
    { bpm: 176, root: 60, scale: 'blues', prog: [0, 3, 0, 4], style: 'swingjazz', seed: 130 },
    { bpm: 108, root: 57, scale: 'dorian', prog: [0, 3, 0, 4], style: 'funk', seed: 230 },
  ],
  tajmahal: [
    { bpm: 120, root: 61, scale: 'bhairav', prog: [0, 0, 3, 4], style: 'indian', seed: 31 },
    { bpm: 158, root: 62, scale: 'mixo', prog: [0, 6, 0, 4], style: 'bhangra', seed: 131 },
    { bpm: 96, root: 60, scale: 'bhairav', prog: [0, 3, 0, 4], style: 'indian', seed: 231 },
  ],
  sagrada: [
    { bpm: 146, root: 64, scale: 'phrygdom', prog: [0, 6, 5, 4], style: 'flamenco', seed: 32 },
    { bpm: 120, root: 60, scale: 'harmonic', prog: [0, 3, 4, 0], style: 'pasodoble', seed: 132 },
    { bpm: 170, root: 62, scale: 'phrygdom', prog: [0, 6, 5, 0], style: 'flamenco', seed: 232 },
  ],
  tokyo: [
    { bpm: 152, root: 57, scale: 'insen', prog: [0, 2, 3, 1], style: 'techno', seed: 33 },
    { bpm: 84, root: 60, scale: 'insen', prog: [0, 3, 2, 0], style: 'enka', seed: 133 },
    { bpm: 140, root: 62, scale: 'majpent', prog: [0, 3, 4, 0], style: 'matsuri', seed: 233 },
  ],
  // 최종 보스 (1페이즈 → 2페이즈에서 더 빠르고 높게)
  boss: [{ bpm: 120, root: 50, scale: 'minor', prog: [0, 0, 5, 6], style: 'epic', seed: 66 }],
  boss2: [{ bpm: 138, root: 52, scale: 'harmonic', prog: [0, 5, 6, 4], style: 'epic', seed: 77 }],
};

// 리듬 템플릿 (마디 단위, [시작 스텝, 길이])
const RHYTHMS = [
  [[[0, 4], [4, 2], [6, 2], [8, 4], [12, 4]], [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 6], [6, 2], [8, 6], [14, 2]], [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2]]],
  [[[0, 2], [3, 3], [6, 2], [8, 2], [11, 3], [14, 2]], [[0, 4], [4, 2], [6, 4], [10, 2], [12, 4]], [[0, 3], [3, 3], [6, 4], [10, 2], [12, 2], [14, 2]]],
  [[[0, 8], [8, 4], [12, 4]], [[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 6], [14, 2]]],
  [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]], [[0, 6], [6, 2], [8, 2], [10, 2], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 8]]],
  [[[0, 2], [3, 1], [4, 2], [6, 2], [8, 2], [11, 1], [12, 2], [14, 2]], [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]], [[0, 2], [2, 2], [4, 4], [10, 2], [12, 4]]],
  [[[0, 2], [2, 1], [3, 2], [5, 1], [6, 3], [9, 3]], [[0, 3], [3, 3], [6, 2], [8, 1], [9, 3]], [[0, 1], [1, 1], [2, 1], [3, 3], [6, 6]]],
  [[[0, 4], [4, 1], [5, 1], [6, 2], [8, 4], [12, 2], [14, 2]], [[0, 6], [6, 1], [7, 1], [8, 8]], [[0, 2], [2, 2], [4, 2], [6, 2], [8, 6], [14, 2]]],
  [[[0, 3], [3, 3], [6, 4], [12, 4]], [[2, 2], [4, 2], [6, 2], [8, 6]], [[0, 4], [6, 2], [8, 2], [10, 6]]],
];

function songList(key) { const v = SONGS[key] || SONGS.title; return Array.isArray(v) ? v : [v]; }
function composeSong(S) {
  const ST = STYLES[S.style];
  const R = mulberry32(S.seed * 7919);
  const sc = SCALES[S.scale], n = sc.length;
  const deg2semi = (i) => { const o = Math.floor(i / n), d = ((i % n) + n) % n; return o * 12 + sc[d]; };
  const chordIdx = (deg) => (n >= 7 ? [deg, deg + 2, deg + 4] : [deg, deg + 2, deg + 3]);
  const spb = ST.spb;
  const rh = RHYTHMS[ST.rh] || RHYTHMS[0];
  const scaleRh = (pat) => pat.map(([a, l]) => (spb === 16 ? [a, l] : [a, l]));
  const genPhrase = (bars, prog, startBar, lo, hi, seedR) => {
    const notes = [];
    let cur = Math.round((lo + hi) / 2);
    for (let b = 0; b < bars; b++) {
      const deg = prog[(startBar + b) % prog.length];
      const ct = chordIdx(deg);
      const pat = scaleRh(rh[Math.floor(seedR() * rh.length)]).filter(([a]) => a < spb);
      pat.forEach(([a, l], idx) => {
        const strong = a % (spb === 12 ? 6 : 4) === 0;
        if (strong) {
          let best = cur, bd = 99;
          for (const c of ct) for (let o = -2; o <= 3; o++) { const v = c + o * n; if (v >= lo && v <= hi && Math.abs(v - cur) < bd) { bd = Math.abs(v - cur); best = v; } }
          cur = best;
        } else {
          const step = [-2, -1, -1, 1, 1, 2, 0][Math.floor(seedR() * 7)];
          cur = clamp(cur + step, lo, hi);
        }
        const last = b === bars - 1 && idx === pat.length - 1;
        if (last) { let best = cur, bd = 99; for (let o = -2; o <= 3; o++) { const v = ct[0] + o * n; if (v >= lo && v <= hi && Math.abs(v - cur) < bd) { bd = Math.abs(v - cur); best = v; } } cur = best; }
        notes.push({ bar: b, step: a, len: Math.min(l, spb - a), idx: cur });
      });
    }
    return notes;
  };
  const lo = n, hi = n * 2 + Math.floor(n / 2);
  const RA = mulberry32(S.seed * 31), RB = mulberry32(S.seed * 97);
  const A1 = genPhrase(2, S.prog, 0, lo, hi, RA), A2 = genPhrase(2, S.prog, 2, lo, hi, RA);
  const B1 = genPhrase(2, S.prog, 2, lo + 2, hi + 2, RB), B2 = genPhrase(2, S.prog, 0, lo + 1, hi + 2, RB);
  const A2v = genPhrase(2, S.prog, 2, lo, hi, mulberry32(S.seed * 53));
  // 구성: A(4마디) A'(4마디) B(4마디) A(4마디)
  const sections = [[A1, A2], [A1, A2v], [B1, B2], [A1, A2v]];
  const bars = [];
  sections.forEach((sec, si) => sec.forEach((ph, pi) => {
    for (let b = 0; b < 2; b++) {
      const barNo = si * 4 + pi * 2 + b;
      const deg = (si === 2 ? [S.prog[2], S.prog[3], S.prog[0], S.prog[1]] : S.prog)[(pi * 2 + b) % 4];
      bars.push({ deg, lead: ph.filter((x) => x.bar === b) });
    }
  }));
  return { S, ST, bars, deg2semi, chordIdx, spb };
}

const MUSIC = { song: null, key: null, step: 0, nextT: 0, timer: null, gen: 0 };
function playMusic(key) {
  MUSIC.want = key;
  if (!AUD.ctx || AUD.ctx.state !== 'running') { MUSIC.pending = key; return; }
  if (MUSIC.key === key) return;
  stopMusic();
  const list = songList(key);
  MUSIC.key = key; MUSIC.list = list; MUSIC.vi = Math.floor(Math.random() * list.length);
  MUSIC.song = composeSong(list[MUSIC.vi]); MUSIC.step = 0;
  MUSIC.nextT = AUD.ctx.currentTime + 0.1;
  const gen = ++MUSIC.gen;
  MUSIC.timer = setInterval(() => { if (gen === MUSIC.gen) scheduleMusic(); }, 25);
}
function stopMusic() {
  MUSIC.want = null; MUSIC.pending = null;
  if (MUSIC.timer) clearInterval(MUSIC.timer);
  MUSIC.timer = null; MUSIC.key = null; MUSIC.gen++;
}
function scheduleMusic() {
  const c = AUD.ctx; if (!c || !MUSIC.song) return;
  const M = MUSIC.song, S = M.S, ST = M.ST, spb = M.spb;
  const stepDur = (60 / S.bpm) * (4 / spb) * (spb === 12 ? 1.0 : 1);
  if (MUSIC.nextT < c.currentTime - 0.3) MUSIC.nextT = c.currentTime + 0.05; // 탭 비활성 후 복귀
  while (MUSIC.nextT < c.currentTime + 0.15) {
    const total = M.bars.length * spb;
    const st = MUSIC.step % total, barI = Math.floor(st / spb), s = st % spb;
    const bar = M.bars[barI];
    let t = MUSIC.nextT;
    if (ST.swing && s % 2 === 1) t += stepDur * ST.swing;
    playStep(M, bar, barI, s, t, stepDur);
    MUSIC.step++; MUSIC.nextT += stepDur;
    // 두 번 반복하면 같은 스테이지의 다음 곡으로
    if (MUSIC.step >= total * 2 && MUSIC.list && MUSIC.list.length > 1) {
      MUSIC.vi = (MUSIC.vi + 1) % MUSIC.list.length; MUSIC.song = composeSong(MUSIC.list[MUSIC.vi]); MUSIC.step = 0;
      return;
    }
  }
}
function playStep(M, bar, barI, s, t, sd) {
  const S = M.S, ST = M.ST, bus = AUD.musicBus, root = S.root;
  const at = (pat) => pat && pat[s] && pat[s] !== '.' && pat[s] !== ' ';
  // 드럼
  if (at(ST.k)) aOsc('sine', 150, t, 0.12, 0.9, bus, { slide: 42, slideT: 0.1, s: 0.3, r: 0.05 });
  if (at(ST.s)) { aNoise(t, 0.12, 0.45, 'bandpass', 1800, bus); aOsc('triangle', 190, t, 0.05, 0.25, bus, { s: 0.2 }); if (ST.clap) aNoise(t + 0.01, 0.08, 0.3, 'bandpass', 1100, bus); }
  if (at(ST.h)) aNoise(t, s % 4 === 2 && !ST.shaker ? 0.09 : 0.035, ST.shaker ? 0.12 : 0.16, 'highpass', ST.shaker ? 5000 : 7500, bus);
  if (at(ST.tom)) aOsc('sine', s === 0 ? 110 : 180, t, 0.18, 0.6, bus, { slide: s === 0 ? 70 : 120, s: 0.3 });
  if (at(ST.block)) aOsc('sine', s % 8 === 0 ? 1200 : 900, t, 0.03, 0.25, bus, { s: 0.1 });
  if (at(ST.tek)) aOsc('sine', 520, t, 0.05, 0.35, bus, { slide: 700, s: 0.2 });
  if (at(ST.clapP)) aNoise(t, 0.07, 0.4, 'bandpass', 1300, bus, { q: 1.3 });
  if (ST.gong && s === 0 && barI % 4 === 0) { aOsc('sine', 98, t, 1.2, 0.35, bus, { vib: 3, s: 0.5, r: 0.8 }); aNoise(t, 1.0, 0.1, 'bandpass', 400, bus); }
  if (at(ST.ride)) aNoise(t, 0.14, 0.11, 'highpass', 6500, bus);
  if (at(ST.taiko)) { aOsc('sine', s === 0 ? 75 : 95, t, 0.3, 0.8, bus, { slide: 45, s: 0.3 }); aNoise(t, 0.08, 0.25, 'lowpass', 600, bus); }
  if (at(ST.timp)) { aOsc('sine', mtof(root - 24), t, 0.45, 0.9, bus, { slide: mtof(root - 25), s: 0.4, r: 0.3 }); aNoise(t, 0.12, 0.3, 'lowpass', 400, bus); }
  if (ST.hit && s === 0 && barI % 4 === 0) {   // 오케스트라 히트
    aNoise(t, 0.5, 0.6, 'lowpass', 2500, bus, { sweep: 200 });
    [0, 7, 12, 15].forEach((m) => aOsc('sawtooth', mtof(root - 12 + m), t, 0.35, 0.07, bus, { lp: 2200, s: 0.3, r: 0.3 }));
  }
  if (ST.scratch && s === 14 && barI % 2 === 1) aNoise(t, 0.12, 0.25, 'bandpass', 1500, bus, { sweep: 300, q: 3 });
  // 베이스
  const ci = M.chordIdx(bar.deg).map((i) => M.deg2semi(i));
  const bc = ST.bass[s];
  if (bc && bc !== '.' && bc !== ' ') {
    const semi = bc === 'F' ? ci[2] : bc === 'O' ? ci[0] + 12 : ci[0];
    let len = 1; while (s + len < M.spb && ST.bass[s + len] === '.') len++;
    aOsc(ST.slow ? 'triangle' : 'triangle', mtof(root - 24 + semi), t, Math.min(len, 4) * sd * 0.9, 0.5, bus, { s: 0.8 });
    if (!ST.slow) aOsc('p25', mtof(root - 24 + semi), t, Math.min(len, 2) * sd * 0.5, 0.08, bus, { s: 0.4, lp: 800 });
  }
  if (ST.drone && s === 0) {
    aOsc('sawtooth', mtof(root - 12), t, sd * M.spb, 0.06, bus, { lp: 600, s: 0.9, r: 0.1 });
    aOsc('sawtooth', mtof(root - 5), t, sd * M.spb, 0.04, bus, { lp: 600, s: 0.9, r: 0.1 });
  }
  // 반주 (아르페지오/화음)
  if (ST.arp) {
    const every = ST.arpFast ? 1 : ST.arpSlow ? 4 : 2;
    if (s % every === 0) {
      const k = (s / every) % 3;
      aOsc(ST.arp, mtof(root + ci[k]), t, sd * every * 0.7, 0.06, bus, { s: 0.5, lp: ST.arpSlow ? 1500 : 5000 });
    }
  }
  if (at(ST.osti)) { const m = s % 4 === 0 ? ci[0] : s % 4 === 2 ? ci[0] + 12 : ci[2]; aOsc('sawtooth', mtof(root - 12 + m), t, sd * 0.45, 0.07, bus, { lp: 1400, s: 0.3, r: 0.03 }); }
  if (at(ST.brass)) ci.forEach((c) => aOsc('sawtooth', mtof(root + c - 12), t, sd * 3, 0.06, bus, { lp: 1700, a: 0.03, s: 0.6, r: 0.2 }));
  if (ST.choirPad && (s === 0 || s === M.spb / 2)) ci.forEach((c) => aChoir(mtof(root + c - 12), t, sd * M.spb / 2 * 0.98, 0.16, bus));
  if (at(ST.chord)) ci.forEach((c) => aOsc('p25', mtof(root + c), t, sd * 1.2, 0.045, bus, { s: 0.4 }));
  if (at(ST.strum)) ci.concat([ci[0] + 12]).forEach((c, i) => aOsc('sawtooth', mtof(root - 12 + c), t + i * 0.012, sd * 1.6, 0.05, bus, { s: 0.2, lp: 1800, r: 0.15 }));
  // 리드
  const lead = S.lead || ST.lead;
  for (const nn of bar.lead) {
    if (nn.step !== s) continue;
    const m = root + M.deg2semi(nn.idx) - (lead === 'triangle' || lead === 'choir' ? 0 : 12);
    const dur = nn.len * sd * 0.92;
    if (lead === 'choir') { aChoir(mtof(m), t, dur, 0.3, bus, true); aChoir(mtof(m - 12), t, dur, 0.18, bus, true); continue; }
    if (ST.trem && nn.len >= 2) { for (let k = 0; k < nn.len * 2; k++) aOsc(lead, mtof(m), t + k * sd / 2, sd * 0.4, 0.1, bus, { s: 0.5, r: 0.02 }); continue; }   // 만돌린 트레몰로
    aOsc(lead, mtof(m), t, dur, lead === 'triangle' ? 0.2 : 0.11, bus, { vib: ST.vib, lp: ST.leadLp, s: 0.65, r: 0.06, slide: ST.slide && nn.len >= 4 ? mtof(m + 1) : 0, slideT: dur });
    if (lead !== 'triangle') aOsc('p12', mtof(m + 12), t + 0.02, dur * 0.8, 0.025, bus, { s: 0.5 });
  }
}
// 짧은 징글
function playJingle(kind) {
  if (!AUD.ctx) return;
  const t = AUD.ctx.currentTime + 0.05, bus = AUD.musicBus;
  const seq = kind === 'win' ? [[72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.36, 0.5], [83, 0.9, 0.12], [84, 1.02, 0.7]]
    : kind === 'lose' ? [[67, 0, 0.3], [63, 0.3, 0.3], [60, 0.6, 0.3], [55, 0.9, 0.8]]
      : [[69, 0, 0.1], [72, 0.1, 0.1], [76, 0.2, 0.3]];
  for (const [m, d, l] of seq) { aOsc('square', mtof(m), t + d, l, 0.12, bus, { s: 0.7 }); aOsc('triangle', mtof(m - 12), t + d, l, 0.25, bus); }
}
