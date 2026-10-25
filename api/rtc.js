import crypto from 'node:crypto';
// ============================================================
//  WebRTC 접속 정보 교환 (같은 사이트 HTTPS, Upstash Redis 임시 저장)
//  - 방: t2d:rtc:<room> = {owner}, :offer = {guest, description}, :answer = description
//  - 같은 와이파이 방 목록: t2d:lan:<network> (HASH code -> 시각)
//  게임 프레임은 여기를 거치지 않고 기기끼리 직접 주고받는다.
// ============================================================
const STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ROOM = /^tk2d-(?:room-[A-Z0-9]{4}|lan-[a-z0-9]+-[0-3])$/;
const TOKEN = /^[a-f0-9]{48}$/;
const TTL = 600;          // 방 유지 시간(초). 방장이 keep으로 계속 연장
const LAN_TTL = 120;      // 같은 와이파이 목록에 방이 보이는 시간(초)

async function redis(...cmd) {
  const r = await fetch(STORE_URL, { method: 'POST', headers: { Authorization: `Bearer ${STORE_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(6000) });
  const j = await r.json();
  if (!r.ok || j.error) throw Error('signaling storage unavailable: ' + (j.error || r.status));
  return j.result;
}

const FALLBACK_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
];
// Cloudflare Realtime TURN: CF_TURN_KEY_ID + CF_TURN_API_TOKEN 환경변수가 있으면 24시간짜리 임시 TURN 자격증명을 발급한다.
let cfCache = null;
async function cloudflareIce() {
  const id = process.env.CF_TURN_KEY_ID, tok = process.env.CF_TURN_API_TOKEN;
  if (!id || !tok) return null;
  if (cfCache && cfCache.until > Date.now()) return cfCache.servers;
  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
    method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }), signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw Error('turn credential ' + r.status);
  const j = await r.json();
  const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
  // 브라우저에서 막히는 53번 포트 주소는 빼서 ICE 수집 대기를 줄인다.
  const servers = list.map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })).filter((s) => s.urls.length);
  if (!servers.length) throw Error('turn credential empty');
  cfCache = { servers, until: Date.now() + 6 * 3600e3 };
  return servers;
}
async function iceConfig() {
  if (process.env.WEBRTC_ICE_SERVERS) return JSON.parse(process.env.WEBRTC_ICE_SERVERS);
  try { const cf = await cloudflareIce(); if (cf) return cf; } catch (e) { console.error('TURN credential failed:', e.message); }
  return FALLBACK_ICE;
}
// 같은 와이파이 판별용 네트워크 값: IPv4는 공인 IP, IPv6는 기기마다 주소가 달라서 앞 64비트(같은 공유기)만 사용
function networkOf(req) {
  let ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (!ip) return null;
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip.includes(':')) {
    const parts = ip.split('::');
    const head = parts[0].split(':').filter(Boolean), tail = parts.length > 1 ? parts[1].split(':').filter(Boolean) : [];
    const full = head.concat(Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), tail);
    ip = full.slice(0, 4).map((x) => parseInt(x || '0', 16).toString(16)).join(':') + '::/64';
  }
  return crypto.createHash('sha256').update('t2d:' + ip).digest('hex').slice(0, 24);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const iceServers = await iceConfig();
      if (!Array.isArray(iceServers) || !iceServers.length) throw Error('invalid ICE configuration');
      const relay = iceServers.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));
      res.status(200).json({ signaling: !!(STORE_URL && STORE_TOKEN), relay, network: networkOf(req), iceServers }); return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    if (!STORE_URL || !STORE_TOKEN) { res.status(503).json({ error: '온라인 접속 서버 DB 설정을 확인해주세요.' }); return; }
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    // 같은 와이파이 방 목록 (네트워크 값은 서버가 IP로 계산 → 다른 네트워크의 방은 보이지 않음)
    if (b.op === 'lanList') {
      const net = networkOf(req); if (!net) { res.status(200).json({ rooms: [] }); return; }
      const h = await redis('HGETALL', 't2d:lan:' + net) || [];
      const now = Date.now(), rooms = [];
      for (let i = 0; i < h.length; i += 2) { const v = JSON.parse(h[i + 1] || '{}'); if (now - v.t < LAN_TTL * 1000) rooms.push({ code: h[i], nick: v.nick || null, t: v.t }); }
      rooms.sort((x, y) => x.t - y.t);
      res.status(200).json({ rooms }); return;
    }
    if (!ROOM.test(b.room || '') || !TOKEN.test(b.token || '')) { res.status(400).json({ error: '잘못된 접속 요청입니다.' }); return; }
    const k = 't2d:rtc:' + b.room;
    if (b.op === 'host') {
      const ok = await redis('SET', k, JSON.stringify({ owner: b.token }), 'EX', TTL, 'NX');
      res.status(ok ? 200 : 409).json({ ok: !!ok }); return;
    }
    // 방 정보 + 접속 요청 + 응답을 한 번에 읽음 (Redis 명령 1개)
    const [raw, offerRaw, answerRaw] = await redis('MGET', k, k + ':offer', k + ':answer');
    if (!raw) { res.status(404).json({ error: '방이 닫혔거나 유효 시간이 지났습니다.' }); return; }
    const room = JSON.parse(raw), offer = JSON.parse(offerRaw || 'null');
    const owner = b.token === room.owner;
    if (b.op === 'close') {
      if (owner) await redis('DEL', k, k + ':offer', k + ':answer');
      const code = (b.room.match(/^tk2d-room-([A-Z0-9]{4})$/) || [])[1];
      if (owner && code) { const net = networkOf(req); if (net) await redis('HDEL', 't2d:lan:' + net, code); }
      res.status(200).json({ ok: true }); return;
    }
    if (b.op === 'keep' && owner) {   // 방장 생존 신호: 방 유지 시간 연장 (+같은 와이파이 목록 갱신)
      const code = (b.room.match(/^tk2d-room-([A-Z0-9]{4})$/) || [])[1];
      const net = b.lan && code ? networkOf(req) : null;
      if (net) await redis('EVAL', "redis.call('EXPIRE',KEYS[1],ARGV[1]) redis.call('HSET',KEYS[2],ARGV[2],ARGV[3]) redis.call('EXPIRE',KEYS[2],ARGV[4]) return 1", 2, k, 't2d:lan:' + net, TTL, code, JSON.stringify({ t: Date.now(), nick: typeof b.nick === 'string' ? b.nick.slice(0, 12) : null }), LAN_TTL);
      else await redis('EXPIRE', k, TTL);
      res.status(200).json({ ok: true }); return;
    }
    if (b.op === 'lanHide' && owner) {   // 상대가 들어오면 목록에서 숨김
      const code = (b.room.match(/^tk2d-room-([A-Z0-9]{4})$/) || [])[1]; const net = networkOf(req);
      if (code && net) await redis('HDEL', 't2d:lan:' + net, code);
      res.status(200).json({ ok: true }); return;
    }
    if (b.op === 'reset' && owner) {   // 연결 실패 후 방은 유지하고 다음 접속을 다시 받음
      await redis('DEL', k + ':offer', k + ':answer');
      res.status(200).json({ ok: true }); return;
    }
    if (b.op === 'offer') {
      if (b.description?.type !== 'offer' || typeof b.description.sdp !== 'string' || b.description.sdp.length > 60000) { res.status(400).json({ error: '잘못된 접속 정보입니다.' }); return; }
      const ok = await redis('SET', k + ':offer', JSON.stringify({ guest: b.token, description: b.description }), 'EX', TTL, 'NX');
      res.status(ok ? 200 : 409).json({ ok: !!ok }); return;
    }
    if (b.op === 'poll' && owner) { res.status(200).json({ offer }); return; }
    if (b.op === 'answer' && owner && offer && offer.guest === b.guest) {
      if (b.description?.type !== 'answer' || typeof b.description.sdp !== 'string' || b.description.sdp.length > 60000) { res.status(400).json({ error: '잘못된 접속 정보입니다.' }); return; }
      await redis('SET', k + ':answer', JSON.stringify(b.description), 'EX', TTL);
      res.status(200).json({ ok: true }); return;
    }
    if (b.op === 'poll' && offer && offer.guest === b.token) { res.status(200).json({ answer: JSON.parse(answerRaw || 'null') }); return; }
    if (b.op === 'poll' && !offer) { res.status(410).json({ error: '방장이 접속을 다시 받는 중입니다.' }); return; }
    res.status(403).json({ error: '접속 권한이 만료되었습니다.' });
  } catch (e) {
    console.error('RTC signaling failed:', e.message);
    res.status(503).json({ error: '접속 서버에 일시적인 문제가 있습니다.' });
  }
}
