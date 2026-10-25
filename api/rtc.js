import crypto from 'node:crypto';
const STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ROOM = /^tk2d-(?:room-[A-Z0-9]{4}|lan-[a-z0-9]+-[0-3])$/;
const TOKEN = /^[a-f0-9]{48}$/;
const TTL = 180;
async function redis(...cmd) {
  const r = await fetch(STORE_URL, { method:'POST', headers:{Authorization:`Bearer ${STORE_TOKEN}`,'Content-Type':'application/json'}, body:JSON.stringify(cmd), signal:AbortSignal.timeout(6000) });
  const j = await r.json();
  if (!r.ok || j.error) throw Error('signaling storage unavailable');
  return j.result;
}
const FALLBACK_ICE = [
  {urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']},
  {urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}
];
// Cloudflare Realtime TURN: CF_TURN_KEY_ID + CF_TURN_API_TOKEN 환경변수가 있으면 24시간짜리 임시 TURN 자격증명을 발급한다.
let cfCache = null;
async function cloudflareIce() {
  const id = process.env.CF_TURN_KEY_ID, tok = process.env.CF_TURN_API_TOKEN;
  if (!id || !tok) return null;
  if (cfCache && cfCache.until > Date.now()) return cfCache.servers;
  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
    method:'POST', headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'}, body:JSON.stringify({ttl:86400}), signal:AbortSignal.timeout(5000)
  });
  if (!r.ok) throw Error('turn credential '+r.status);
  const j = await r.json();
  const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
  // 브라우저에서 막히는 53번 포트 주소는 빼서 ICE 수집 대기를 줄인다.
  const servers = list.map(s => ({...s, urls:[].concat(s.urls).filter(u => !/:53(\?|$)/.test(u))})).filter(s => s.urls.length);
  if (!servers.length) throw Error('turn credential empty');
  cfCache = {servers, until: Date.now() + 6 * 3600e3};
  return servers;
}
async function iceConfig() {
  if (process.env.WEBRTC_ICE_SERVERS) return JSON.parse(process.env.WEBRTC_ICE_SERVERS);
  try { const cf = await cloudflareIce(); if (cf) return cf; } catch (e) { console.error('TURN credential failed:', e.message); }
  return FALLBACK_ICE;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    if (req.method === 'GET') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
      const iceServers = await iceConfig();
      if (!Array.isArray(iceServers) || !iceServers.length) throw Error('invalid ICE configuration');
      res.status(200).json({signaling:!!(STORE_URL && STORE_TOKEN),relay:!!(process.env.WEBRTC_ICE_SERVERS || process.env.CF_TURN_KEY_ID),network:ip ? crypto.createHash('sha256').update('t2d:'+ip).digest('hex').slice(0,24) : null,iceServers}); return;
    }
    if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }
    if (!STORE_URL || !STORE_TOKEN) { res.status(503).json({error:'온라인 접속 서버 DB 설정을 확인해주세요.'}); return; }
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!ROOM.test(b.room || '') || !TOKEN.test(b.token || '')) { res.status(400).json({error:'잘못된 접속 요청입니다.'}); return; }
    const k = 't2d:rtc:'+b.room;
    if (b.op === 'host') {
      const ok = await redis('SET',k,JSON.stringify({owner:b.token}),'EX',TTL,'NX');
      res.status(ok ? 200 : 409).json({ok:!!ok}); return;
    }
    const raw = await redis('GET',k);
    if (!raw) {res.status(404).json({error:'방이 닫혔거나 유효 시간이 지났습니다.'});return;}
    const room = JSON.parse(raw);
    if (b.op === 'close') {
      const script = "local r=redis.call('GET',KEYS[1]); if r and cjson.decode(r).owner==ARGV[1] then return redis.call('DEL',KEYS[1],KEYS[2],KEYS[3]) end return 0";
      await redis('EVAL',script,3,k,k+':offer',k+':answer',b.token);
      res.status(200).json({ok:true});return;
    }
    if (b.op === 'offer') {
      if (b.description?.type !== 'offer' || typeof b.description.sdp !== 'string' || b.description.sdp.length > 60000) {res.status(400).json({error:'잘못된 접속 정보입니다.'});return;}
      const ok = await redis('SET',k+':offer',JSON.stringify({guest:b.token,description:b.description}),'EX',TTL,'NX');
      res.status(ok ? 200 : 409).json({ok:!!ok});return;
    }
    if (b.op === 'poll' && b.token === room.owner) {
      res.status(200).json({offer:JSON.parse(await redis('GET',k+':offer') || 'null')});return;
    }
    const offer = JSON.parse(await redis('GET',k+':offer') || 'null');
    if (b.op === 'answer' && b.token === room.owner && offer && offer.guest === b.guest) {
      if (b.description?.type !== 'answer' || typeof b.description.sdp !== 'string' || b.description.sdp.length > 60000) {res.status(400).json({error:'잘못된 접속 정보입니다.'});return;}
      await redis('SET',k+':answer',JSON.stringify(b.description),'EX',TTL);
      res.status(200).json({ok:true});return;
    }
    if (b.op === 'poll' && offer && offer.guest === b.token) {
      res.status(200).json({answer:JSON.parse(await redis('GET',k+':answer') || 'null')});return;
    }
    res.status(403).json({error:'접속 권한이 만료되었습니다.'});
  } catch(e) {
    console.error('RTC signaling failed:',e.name);
    res.status(503).json({error:'접속 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.'});
  }
}
