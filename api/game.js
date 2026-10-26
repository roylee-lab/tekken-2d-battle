// ============================================================
//  TEKKEN 2D BATTLE 서버 API (Vercel Serverless Function)
//  저장소: Upstash Redis (Vercel Marketplace 연결 시 환경변수 자동 설정)
//  POST /api/game  { a: '동작', ...값 }   (토큰은 body.token)
// ============================================================
import crypto from 'node:crypto';

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const P = 't2d:';                       // 키 접두어
const SESSION_TTL = 60 * 60 * 24 * 30;  // 로그인 유지 30일
const ONLINE_TTL = 45;                  // 이 시간(초) 동안 신호가 없으면 오프라인
const INVITE_TTL = 90;                  // 대전 신청 유효 시간(초)
const NICK_RE = /^[0-9A-Za-z가-힣_]{2,12}$/;
const HEUGYO_GIFT = new Set(['royleejr']);   // 히든 캐릭터 흑요를 처음부터 지급받는 계정 (닉네임 소문자)

// ---------- Redis (Upstash REST) ----------
async function redis(cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('redis: ' + j.error);
  return j.result;
}
async function pipe(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(R_URL.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error('redis pipeline error');
  return j.map((x) => { if (x.error) throw new Error('redis: ' + x.error); return x.result; });
}
const hashToObj = (arr) => { const o = {}; for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = arr[i + 1]; return o; };

// ---------- 유틸 ----------
const key = (nick) => String(nick).normalize('NFC').toLowerCase();
class E extends Error { constructor(msg, code) { super(msg); this.code = code || 400; } }
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex'); }
function safeEq(a, b) { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim(); }

async function rateLimit(name, limit, windowSec) {
  const n = await redis(['INCR', P + 'rl:' + name]);
  if (n === 1) await redis(['EXPIRE', P + 'rl:' + name, windowSec]);
  if (n > limit) throw new E('요청이 너무 많아요. 잠시 후 다시 시도해 주세요', 429);
}
async function newSession(nick) {
  const token = crypto.randomBytes(24).toString('hex');
  await redis(['SET', P + 's:' + token, key(nick) + '|' + nick, 'EX', SESSION_TTL]);   // 닉네임도 함께 저장 → 매 요청 Redis 명령 1개 절약
  return token;
}
async function auth(body) {
  const t = String(body.token || '');
  if (!/^[0-9a-f]{48}$/.test(t)) throw new E('로그인이 필요해요', 401);
  const v = await redis(['GET', P + 's:' + t]);
  if (!v) throw new E('로그인이 만료됐어요. 다시 로그인해 주세요', 401);
  const bar = v.indexOf('|');
  const id = bar >= 0 ? v.slice(0, bar) : v;
  const nick = bar >= 0 ? v.slice(bar + 1) : await redis(['HGET', P + 'u:' + id, 'nick']);
  if (!nick) throw new E('계정을 찾을 수 없어요', 401);
  return { id, nick, token: t };
}
async function displayNick(nick) {
  const n = await redis(['HGET', P + 'u:' + key(nick), 'nick']);
  if (!n) throw new E(`'${nick}' 닉네임을 가진 사용자가 없어요`);
  return n;
}

// ---------- 보상: 최종 보스 격파 → 칭호 '김천고의 CEO' + 흑요 ----------
async function rewards(id) {
  const [ceo, hg] = await redis(['HMGET', P + 'u:' + id, 'ceo', 'heugyo']) || [];
  return { ceo: ceo === '1', heugyo: hg === '1' || ceo === '1' || HEUGYO_GIFT.has(id) };
}

// ---------- 게시판 (캐릭터 추가 요청) ----------
const BOARD_KEY = P + 'board', BOARD_MAX = 300;
// 양식: 캐릭터 이름 + 패시브/Q/W/E/R 각각 [이름, 설명] — 하나라도 비거나 규격에 안 맞으면 거부
const BOARD_FORM = { name: [1, 12], skillName: [1, 20], skillDesc: [5, 200] };
const SLOTS = ['passive', 'q', 'w', 'e', 'r'];
function cleanText(v, [min, max], label) {
  const t = String(v ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < min) throw new E(`${label}: ${min}자 이상 써 주세요`);
  if (t.length > max) throw new E(`${label}: ${max}자까지 쓸 수 있어요`);
  return t;
}
const SLOT_LABEL = { passive: '패시브', q: 'Q 스킬', w: 'W 스킬', e: 'E 스킬', r: 'R 스킬' };
function parsePost(b) {
  const post = { name: cleanText(b.name, BOARD_FORM.name, '캐릭터 이름') };
  for (const s of SLOTS) {
    const v = b[s] || {};
    post[s] = { n: cleanText(v.n, BOARD_FORM.skillName, SLOT_LABEL[s] + ' 이름'), d: cleanText(v.d, BOARD_FORM.skillDesc, SLOT_LABEL[s] + ' 설명') };
  }
  return post;
}

// ---------- 동작 ----------
const actions = {
  async boardList(b) {
    const page = Math.max(0, Math.min(29, Number(b.page) || 0)), per = 10;
    const [rows, total] = await pipe([['LRANGE', BOARD_KEY, page * per, page * per + per - 1], ['LLEN', BOARD_KEY]]);
    const posts = (rows || []).map((r) => { try { return JSON.parse(r); } catch (e) { return null; } }).filter(Boolean);
    return { posts, total: total || 0, page, per };
  },
  // 최종 보스(흑요)를 이긴 기록 → 칭호와 흑요 지급
  async bossClear(b) {
    const me = await auth(b);
    await rateLimit('boss:' + me.id, 10, 3600);
    await redis(['HSET', P + 'u:' + me.id, 'ceo', '1', 'heugyo', '1']);
    return { rewards: { ceo: true, heugyo: true } };
  },
  async boardPost(b, req) {
    const me = await auth(b);
    const post = parsePost(b);
    await rateLimit('bp:' + me.id, 5, 600);
    await rateLimit('bpip:' + clientIp(req), 20, 86400);
    Object.assign(post, { id: crypto.randomBytes(6).toString('hex'), nick: me.nick, ts: Date.now(), ceo: (await redis(['HGET', P + 'u:' + me.id, 'ceo'])) === '1' });
    await pipe([['LPUSH', BOARD_KEY, JSON.stringify(post)], ['LTRIM', BOARD_KEY, 0, BOARD_MAX - 1]]);
    return { ok: true, post };
  },
  async boardDelete(b) {
    const me = await auth(b);
    const id = String(b.id || '');
    if (!/^[0-9a-f]{12}$/.test(id)) throw new E('잘못된 글 번호');
    const rows = (await redis(['LRANGE', BOARD_KEY, 0, BOARD_MAX - 1])) || [];
    const raw = rows.find((r) => r.includes('"id":"' + id + '"'));
    if (!raw) throw new E('글을 찾을 수 없어요', 404);
    if (key(JSON.parse(raw).nick) !== me.id) throw new E('내가 쓴 글만 지울 수 있어요', 403);
    await redis(['LREM', BOARD_KEY, 1, raw]);
    return { ok: true };
  },
  async register(b, req) {
    await rateLimit('reg:' + clientIp(req), 10, 3600);
    const nick = String(b.nick || '').normalize('NFC').trim(), pw = String(b.pw || '');
    if (!NICK_RE.test(nick)) throw new E('닉네임은 2~12자 (한글/영문/숫자/_)로 정해 주세요');
    if (pw.length < 4 || pw.length > 64) throw new E('비밀번호는 4~64자로 정해 주세요');
    const salt = crypto.randomBytes(16).toString('hex');
    const ok = await redis(['HSETNX', P + 'u:' + key(nick), 'nick', nick]);
    if (!ok) throw new E('이미 사용 중인 닉네임이에요');
    await redis(['HSET', P + 'u:' + key(nick), 'salt', salt, 'hash', hashPw(pw, salt), 'created', Date.now()]);
    return { token: await newSession(nick), nick, rewards: await rewards(key(nick)) };
  },
  async login(b, req) {
    const nick = String(b.nick || '').normalize('NFC').trim(), pw = String(b.pw || '');
    await rateLimit('login:' + clientIp(req), 30, 300);
    await rateLimit('loginnick:' + key(nick), 10, 300);
    const u = hashToObj(await redis(['HGETALL', P + 'u:' + key(nick)]));
    if (!u.hash || !safeEq(hashPw(pw, u.salt), u.hash)) throw new E('닉네임 또는 비밀번호가 틀렸어요', 401);
    return { token: await newSession(u.nick), nick: u.nick, rewards: { ceo: u.ceo === '1', heugyo: u.heugyo === '1' || u.ceo === '1' || HEUGYO_GIFT.has(key(nick)) } };
  },
  async logout(b) {
    const me = await auth(b);
    await pipe([['DEL', P + 's:' + me.token], ['DEL', P + 'on:' + me.id]]);
    return { ok: true };
  },
  // 주기적으로 호출: 접속 표시 + 친구/요청/초대 상태 받기
  async poll(b) {
    const me = await auth(b);
    const status = b.status === 'busy' ? 'busy' : 'idle';
    const [, friends, reqs, inv, resp, mine] = await pipe([
      ['SET', P + 'on:' + me.id, status, 'EX', ONLINE_TTL],
      ['SMEMBERS', P + 'f:' + me.id],
      ['SMEMBERS', P + 'rq:' + me.id],
      ['HGETALL', P + 'inv:' + me.id],
      ['HGETALL', P + 'invr:' + me.id],
      ['HMGET', P + 'u:' + me.id, 'ceo', 'heugyo'],
    ]);
    const fl = friends || [];
    const [on, fceo] = fl.length ? await pipe([['MGET', ...fl.map((n) => P + 'on:' + key(n))], ['EVAL', "local r = {} for i, k in ipairs(KEYS) do r[i] = redis.call('HGET', k, 'ceo') or '' end return r", fl.length, ...fl.map((n) => P + 'u:' + key(n))]]) : [[], []];
    const now = Date.now();
    const invites = Object.entries(hashToObj(inv)).map(([from, v]) => { try { return Object.assign({ from }, JSON.parse(v)); } catch (e) { return null; } })
      .filter((x) => x && now - x.ts < INVITE_TTL * 1000);
    const responses = Object.entries(hashToObj(resp)).map(([to, r]) => ({ to, r }));
    if (responses.length) await redis(['DEL', P + 'invr:' + me.id]);
    return {
      nick: me.nick,
      rewards: { ceo: (mine || [])[0] === '1', heugyo: (mine || [])[1] === '1' || (mine || [])[0] === '1' || HEUGYO_GIFT.has(me.id) },
      friends: fl.map((n, i) => ({ nick: n, online: !!on[i], status: on[i] || 'off', ceo: (fceo || [])[i] === '1' })).sort((x, y) => (y.online - x.online) || x.nick.localeCompare(y.nick)),
      requests: reqs || [],
      invites,
      responses,
    };
  },
  async friendAdd(b) {
    const me = await auth(b);
    const other = await displayNick(String(b.nick || '').trim());
    const oid = key(other);
    if (oid === me.id) throw new E('자기 자신은 친구로 추가할 수 없어요');
    if (await redis(['SISMEMBER', P + 'f:' + me.id, other])) throw new E(`${other}님은 이미 친구예요`);
    // 상대가 먼저 요청했으면 바로 친구
    if (await redis(['SISMEMBER', P + 'rq:' + me.id, other])) {
      await pipe([['SADD', P + 'f:' + me.id, other], ['SADD', P + 'f:' + oid, me.nick], ['SREM', P + 'rq:' + me.id, other], ['SREM', P + 'rq:' + oid, me.nick]]);
      return { result: 'friends', nick: other };
    }
    const n = await redis(['SCARD', P + 'rq:' + oid]);
    if (n > 50) throw new E('상대의 친구 요청함이 가득 찼어요');
    await redis(['SADD', P + 'rq:' + oid, me.nick]);
    return { result: 'requested', nick: other };
  },
  async friendRespond(b) {
    const me = await auth(b);
    const other = String(b.nick || '');
    const was = await redis(['SREM', P + 'rq:' + me.id, other]);
    if (!was) throw new E('친구 요청을 찾을 수 없어요');
    if (b.accept) await pipe([['SADD', P + 'f:' + me.id, other], ['SADD', P + 'f:' + key(other), me.nick], ['SREM', P + 'rq:' + key(other), me.nick]]);
    return { ok: true };
  },
  async friendRemove(b) {
    const me = await auth(b);
    const other = String(b.nick || '');
    await pipe([['SREM', P + 'f:' + me.id, other], ['SREM', P + 'f:' + key(other), me.nick]]);
    return { ok: true };
  },
  async invite(b) {
    const me = await auth(b);
    const other = String(b.nick || ''), room = String(b.room || '');
    if (!/^[A-Z0-9]{4}$/.test(room)) throw new E('잘못된 방 코드');
    if (!(await redis(['SISMEMBER', P + 'f:' + me.id, other]))) throw new E('친구에게만 대전을 신청할 수 있어요');
    const st = await redis(['GET', P + 'on:' + key(other)]);
    if (!st) throw new E(`${other}님은 지금 접속해 있지 않아요`);
    if (st === 'busy') throw new E(`${other}님은 지금 대전 중이에요`);
    await pipe([
      ['HSET', P + 'inv:' + key(other), me.nick, JSON.stringify({ nick: me.nick, room, ts: Date.now() })],
      ['EXPIRE', P + 'inv:' + key(other), INVITE_TTL],
    ]);
    return { ok: true };
  },
  async inviteCancel(b) {
    const me = await auth(b);
    await redis(['HDEL', P + 'inv:' + key(String(b.nick || '')), me.nick]);
    return { ok: true };
  },
  async inviteRespond(b) {
    const me = await auth(b);
    const from = String(b.nick || '');
    await redis(['HDEL', P + 'inv:' + me.id, from]);
    if (!b.accept) await pipe([['HSET', P + 'invr:' + key(from), me.nick, 'declined'], ['EXPIRE', P + 'invr:' + key(from), INVITE_TTL]]);
    return { ok: true };
  },
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!R_URL || !R_TOKEN) { res.status(503).json({ error: '서버 DB가 아직 연결되지 않았어요 (Upstash Redis 연결 필요)' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const fn = actions[body.a];
  if (!fn) { res.status(400).json({ error: '알 수 없는 요청' }); return; }
  try {
    res.status(200).json(await fn(body, req));
  } catch (e) {
    if (e instanceof E) res.status(e.code).json({ error: e.message });
    else { console.error(e); res.status(500).json({ error: '서버 오류가 발생했어요' }); }
  }
}
