// 같은 사이트의 HTTPS에서 접속 정보만 교환하고 게임은 WebRTC로 직접 전송한다.
let RTC_CONFIG = null;
async function rtcRequest(body) {
  const ctl = new AbortController(), timer = setTimeout(()=>ctl.abort(),10000);
  try {
    const r = await fetch('/api/rtc',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:ctl.signal});
    const j = await r.json();
    if(!r.ok){const e=Error(j.error || '접속 서버 응답 오류');e.code=r.status;throw e;}
    return j;
  }finally{clearTimeout(timer);}
}
let RTC_CONFIG_AT = 0;
async function rtcConfig(){if(!RTC_CONFIG||Date.now()-RTC_CONFIG_AT>3600e3){RTC_CONFIG=await rtcRequest();RTC_CONFIG_AT=Date.now();}return RTC_CONFIG;}
function rtcBlockedMsg(){return RTC_CONFIG&&RTC_CONFIG.relay?'기기 간 연결에 실패했어요. 잠시 후 다시 시도해주세요.':'기기 간 직접 연결이 막혀 있어요. (중계 TURN 서버 미설정 — 같은 와이파이에서 다시 시도해보세요)';}
function rtcToken(){const a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,n=>n.toString(16).padStart(2,'0')).join('');}
class RTCLink {
  constructor(pc){this.pc=pc;this.open=false;this.handlers={};this.closed=false;pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))this.close();};}
  on(name,fn){(this.handlers[name] ||= []).push(fn);return this;}
  emit(name,value){for(const fn of this.handlers[name] || [])fn(value);}
  attach(dc){this.dataChannel=dc;dc.onopen=()=>{if(!this.closed){this.open=true;this.emit('open');}};dc.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}this.emit('data',m);};dc.onclose=()=>this.close();dc.onerror=()=>this.close();if(dc.readyState==='open')dc.onopen();}
  send(m){if(this.open&&!this.closed)this.dataChannel.send(JSON.stringify(m));}
  close(){if(this.closed)return;this.closed=true;this.open=false;try{this.dataChannel?.close();this.pc.close();}catch(_){}this.emit('close');}
}
async function rtcDescription(pc,description){
  await pc.setLocalDescription(description);
  if(pc.iceGatheringState!=='complete')await new Promise(resolve=>{
    const done=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();};
    const check=()=>{if(pc.iceGatheringState==='complete'||pc.signalingState==='closed')done();};
    const timer=setTimeout(done,7000);pc.addEventListener('icegatheringstatechange',check);check();
  });
  if(pc.signalingState==='closed')throw Error('접속이 취소되었습니다.');
  return {type:pc.localDescription.type,sdp:pc.localDescription.sdp};
}
function rtcPeer(room,token){return {dead:false,timers:new Set(),link:null,destroy(){if(this.dead)return;this.dead=true;for(const t of this.timers)clearTimeout(t);this.timers.clear();this.link?.close();rtcRequest({op:'close',room,token}).catch(()=>{});}};}
function rtcLater(peer,fn,ms=1200){if(peer.dead)return;const t=setTimeout(()=>{peer.timers.delete(t);if(!peer.dead)fn();},ms);peer.timers.add(t);}
function rtcFailure(e){if(e.code===404)return 'notfound';if(e.code===409)return 'busy';return e.name==='AbortError'?'접속 서버 응답 시간이 초과됐어요. 다시 시도해주세요.':e.message || '접속 정보를 교환하지 못했어요.';}
async function rtcHost(id,onOpen,onTaken,onFail){
  const token=rtcToken(),peer=rtcPeer(id,token);NET.peer=peer;
  const fail=e=>{if(peer.dead||NET.peer!==peer||peer.link?.open)return;if(NET.conn===peer.link){NET.conn=null;NET.role=null;}peer.destroy();if(NET.peer===peer)NET.peer=null;onFail(rtcFailure(e));};
  try{
    await rtcRequest({op:'host',room:id,token});if(peer.dead||NET.peer!==peer)return;onOpen(peer);
    rtcLater(peer,()=>{if(!peer.link?.open)fail(Error('대기 시간이 만료됐어요. 새 방을 만들어주세요.'));},165000);
    const poll=async()=>{try{
      const j=await rtcRequest({op:'poll',room:id,token});if(peer.dead||NET.peer!==peer)return;
      if(!j.offer){rtcLater(peer,poll);return;}
      const pc=new RTCPeerConnection({iceServers:RTC_CONFIG.iceServers}),link=new RTCLink(pc);peer.link=link;wireConn(link,'host');
      pc.ondatachannel=e=>link.attach(e.channel);
      await pc.setRemoteDescription(j.offer.description);
      const description=await rtcDescription(pc,await pc.createAnswer());if(peer.dead||NET.peer!==peer)return;
      await rtcRequest({op:'answer',room:id,token,guest:j.offer.guest,description});
      rtcLater(peer,()=>{if(!link.open)fail(Error(rtcBlockedMsg()));},25000);
    }catch(e){fail(e);}};poll();
  }catch(e){if(peer.dead||NET.peer!==peer)return;if(e.code===409){peer.destroy();NET.peer=null;onTaken();}else fail(e);}
}
async function rtcJoin(id,onFail){
  const token=rtcToken(),peer=rtcPeer(id,token);NET.peer=peer;
  const fail=e=>{if(peer.dead||NET.peer!==peer||peer.link?.open)return;if(NET.conn===peer.link){NET.conn=null;NET.role=null;}peer.destroy();if(NET.peer===peer)NET.peer=null;onFail(rtcFailure(e));};
  try{
    const pc=new RTCPeerConnection({iceServers:RTC_CONFIG.iceServers}),link=new RTCLink(pc);peer.link=link;wireConn(link,'guest');
    link.attach(pc.createDataChannel('game',{ordered:true}));
    const description=await rtcDescription(pc,await pc.createOffer());if(peer.dead||NET.peer!==peer)return;
    await rtcRequest({op:'offer',room:id,token,description});if(peer.dead||NET.peer!==peer)return;
    const start=Date.now();
    const poll=async()=>{try{
      const j=await rtcRequest({op:'poll',room:id,token});if(peer.dead||NET.peer!==peer)return;
      if(j.answer){await pc.setRemoteDescription(j.answer);rtcLater(peer,()=>{if(!link.open)fail(Error(rtcBlockedMsg()));},20000);}
      else if(Date.now()-start>30000)fail(Error('상대의 응답 시간이 초과됐어요. 새 방으로 다시 시도해주세요.'));
      else rtcLater(peer,poll);
    }catch(e){fail(e);}};poll();
  }catch(e){fail(e);}
}
