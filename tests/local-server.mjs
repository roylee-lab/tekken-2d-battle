import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
process.env.KV_REST_API_URL='https://test-redis.invalid';process.env.KV_REST_API_TOKEN='test';
const db=new Map();
function command(c){const [op,k,...args]=c;
 if(op==='GET')return db.get(k)??null;
 if(op==='SET'){if(args.includes('NX')&&db.has(k))return null;db.set(k,args[0]);return 'OK';}
 if(op==='INCR'){const n=Number(db.get(k)||0)+1;db.set(k,n);return n;}
 if(op==='EXPIRE')return 1;
 if(op==='DEL'){let n=0;for(const key of [k,...args])if(db.delete(key))n++;return n;}
 if(op==='HGET')return db.get(k)?.[args[0]]??null;
 if(op==='HGETALL')return Object.entries(db.get(k)||{}).flat();
 if(op==='HSETNX'){const h=db.get(k)||{};if(args[0] in h)return 0;h[args[0]]=args[1];db.set(k,h);return 1;}
 if(op==='HSET'){const h=db.get(k)||{};for(let i=0;i<args.length;i+=2)h[args[i]]=args[i+1];db.set(k,h);return 1;}
 if(op==='HDEL'){const h=db.get(k)||{};const had=args[0] in h;delete h[args[0]];return had?1:0;}
 if(op==='SADD'){const a=db.get(k)||new Set();for(const v of args)a.add(v);db.set(k,a);return 1;}
 if(op==='SREM'){const a=db.get(k)||new Set();return a.delete(args[0])?1:0;}
 if(op==='SISMEMBER')return db.get(k)?.has(args[0])?1:0;
 if(op==='SCARD')return db.get(k)?.size||0;
 if(op==='SMEMBERS')return [...(db.get(k)||[])];
 if(op==='LPUSH'){const a=db.get(k)||[];a.unshift(...args.reverse());db.set(k,a);return a.length;}
 if(op==='LTRIM'){const a=db.get(k)||[];db.set(k,a.slice(+args[0],+args[1]+1));return 'OK';}
 if(op==='LRANGE'){const a=db.get(k)||[];return a.slice(+args[0],+args[1]+1);}
 if(op==='LLEN')return (db.get(k)||[]).length;
 if(op==='LREM'){const a=db.get(k)||[];const i=a.indexOf(args[1]);if(i<0)return 0;a.splice(i,1);return 1;}
 if(op==='MGET')return [k,...args].map(x=>db.get(x)??null);
 if(op==='HMGET')return args.map(f=>db.get(k)?.[f]??null);
 if(op==='EVAL'&&/'HGET'/.test(c[1])){const n=+c[2];return c.slice(3,3+n).map(key=>db.get(key)?.ceo??'');}
 if(op==='EVAL'&&/HSET/.test(c[1])){const h=db.get(c[4])||{};h[c[6]]=c[7];db.set(c[4],h);return 1;}
 if(op==='EVAL'){const owner=JSON.parse(db.get(c[3])||'null');if(owner?.owner!==c[6])return 0;let n=0;for(const key of c.slice(3,6))if(db.delete(key))n++;return n;}
 throw Error('unsupported fake Redis '+op);
}
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://test-redis.invalid'))return new Response(JSON.stringify(String(url).endsWith('/pipeline')?JSON.parse(options.body).map(c=>({result:command(c)})):{result:command(JSON.parse(options.body))}),{headers:{'Content-Type':'application/json'}});
 return realFetch(url,options);
};
const {default:handler}=await import('../api/rtc.js');
const {default:gameHandler}=await import('../api/game.js');
const root=fileURLToPath(new URL('..',import.meta.url));
const server=http.createServer(async(req,res)=>{
 if(req.url.startsWith('/api/rtc')||req.url.startsWith('/api/game')){
  let body='';for await(const chunk of req)body+=chunk;req.body=body?JSON.parse(body):{};
  res.status=function(s){this.statusCode=s;return this};
  res.json=function(obj){if(req.method==='GET'&&req.url.startsWith('/api/rtc'))obj.iceServers=[];this.setHeader('Content-Type','application/json');this.end(JSON.stringify(obj));};
  return req.url.startsWith('/api/rtc')?handler(req,res):gameHandler(req,res);
 }
 try{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/javascript');res.end(await fs.readFile(file));}catch(_){res.writeHead(404);res.end();}
});
server.listen(Number(process.env.PORT||8924),'127.0.0.1',()=>console.log('Local test signaling on 8924 (in-memory storage, no external ICE)'));
