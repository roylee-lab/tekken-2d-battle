import assert from 'node:assert/strict';
const url='http://127.0.0.1:8925/api/rtc';
const room='tk2d-room-'+Math.random().toString(36).slice(2,6).toUpperCase();
const host='a'.repeat(48),guest='b'.repeat(48),other='c'.repeat(48);
async function request(op,token,extra={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,room,token,...extra})});return {status:r.status,data:await r.json()};}
assert.equal((await request('host',host)).status,200);
assert.equal((await request('host',other)).status,409);
assert.equal((await request('poll',other)).status,410);   // 접속 요청이 없으면 410 (방장이 이전 시도를 정리한 경우와 같음)
const description={type:'offer',sdp:'test-offer'};
assert.equal((await request('offer',guest,{description})).status,200);
assert.equal((await request('offer',other,{description})).status,409);
assert.equal((await request('poll',host)).data.offer.guest,guest);
assert.equal((await request('answer',other,{guest,description:{type:'answer',sdp:'test-answer'}})).status,403);
assert.equal((await request('answer',host,{guest,description:{type:'answer',sdp:'test-answer'}})).status,200);
assert.equal((await request('poll',guest)).data.answer.sdp,'test-answer');
await request('close',other);
assert.equal((await request('poll',host)).status,200);
await request('close',host);
assert.equal((await request('poll',guest)).status,404);
console.log('Signaling: room collision, guest ownership, offer/answer exchange and owner-only cleanup passed.');
