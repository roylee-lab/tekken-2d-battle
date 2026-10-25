'use strict';
// ============================================================
//  TEKKEN 2D BATTLE - GLOBAL CHAMPIONSHIP EDITION
//  단일 HTML 파일 / 외부 의존성 없음 (온라인용 PeerJS 내장)
// ============================================================

// ---------- 기본 상수 ----------
const VW = 480, VH = 270;      // 내부 픽셀 해상도 (도트 느낌을 위해 저해상도로 그린 뒤 확대)
const GROUND = 236;            // 화면상 지면 y 좌표
const ARENA_W = 760;           // 스테이지 전체 폭 (카메라가 따라 움직임)
const SEC = 60;                // 1초 = 60프레임 (고정 타임스텝)
const MAX_SEP = VW - 56;       // 두 캐릭터가 벌어질 수 있는 최대 거리 (한 화면 안)
const ROUND_TIME = 99;
const WIN_ROUNDS = 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sign = (v) => (v < 0 ? -1 : 1);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shade(hex, amt) {
  // amt: -1(검정) ~ +1(흰색)
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function safeLS(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch (e) { return null; }
  return null;
}
