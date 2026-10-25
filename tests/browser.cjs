const {createRequire}=require('node:module');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium}=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'))('playwright');
(async()=>{console.log('Launching browser');const browser=await chromium.launch({headless:true,args:['--disable-features=WebRtcHideLocalIpsWithMdns'],executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{console.log('Browser ready');
 const host=await browser.newPage(),guest=await browser.newPage();const errors=[];
 for(const p of [host,guest]){p.on('pageerror',e=>errors.push(e.message));console.log('Opening local game');await p.goto('http://127.0.0.1:8925/',{waitUntil:'domcontentloaded',timeout:10000});console.log('Game loaded');}
 console.log('Creating room');await host.evaluate(()=>netCreateRoom());
 await host.waitForFunction(()=>/방 코드/.test(NET.status),{timeout:15000});
 console.log('Room ready');const code=await host.evaluate(()=>NET.status.match(/class="code">([A-Z0-9]+)/)[1]);
 await guest.evaluate(code=>netJoinRoom(code),code);

 await host.waitForFunction(()=>NET.conn?.open&&APP.mode==='online',null,{timeout:30000});
 await guest.waitForFunction(()=>NET.conn?.open&&APP.mode==='online',null,{timeout:30000});
 assert.equal(await host.evaluate(()=>NET.role),'host');assert.equal(await guest.evaluate(()=>NET.role),'guest');
 await host.evaluate(()=>netSend({t:'sel',cur:3,ready:false,c:3}));
 await guest.waitForFunction(()=>APP.sel.opp?.cur===3);
 // 이전 연결을 닫고 새 방으로 재접속해도 이전 close 이벤트가 새 연결을 파괴하지 않는다.
 await host.evaluate(()=>netCreateRoom());await guest.evaluate(()=>netReset());
 await host.waitForFunction(()=>/방 코드/.test(NET.status)&&NET.peer&&!NET.peer.dead);
 const code2=await host.evaluate(()=>NET.status.match(/class="code">([A-Z0-9]+)/)[1]);
 await guest.evaluate(code=>netJoinRoom(code),code2);
 await guest.waitForFunction(()=>NET.conn?.open,null,{timeout:30000});
 await host.evaluate(()=>{netReset();goTitle();}); await guest.evaluate(()=>{netReset();goTitle();});
 for(const [p,nick] of [[host,'HostTest'],[guest,'GuestTest']]){
   await p.evaluate(()=>showAccount());
   await p.locator('#accNick').fill(nick);await p.locator('#accPw').fill('test1234');await p.locator('#accReg').click();
   await p.waitForFunction(()=>!!ACC.token);
 }
 await host.evaluate(()=>api('friendAdd',{nick:'GuestTest'}));
 await guest.evaluate(()=>api('friendRespond',{nick:'HostTest',accept:true}));
 await Promise.all([host.evaluate(()=>pollNow()),guest.evaluate(()=>pollNow())]);
 await host.evaluate(()=>inviteFriend('GuestTest'));
 await host.waitForFunction(()=>!!ACC.waiting);
 await guest.evaluate(()=>pollNow());await guest.waitForFunction(()=>ACC.invites.length>0);
 await guest.evaluate(()=>answerInvite(ACC.invites[0],true));
 await host.waitForFunction(()=>NET.conn?.open&&APP.state==='select',null,{timeout:30000});
 await guest.waitForFunction(()=>NET.conn?.open&&APP.state==='select',null,{timeout:30000});
 console.log('Account registration, friend request, invitation and acceptance reached character select in both browsers.');
 assert.deepEqual(errors,[]);
 console.log('Two browsers: room create, join, WebRTC data exchange and reconnect passed.');
}catch(e){console.error(e.message);for(const p of browser.contexts().flatMap(c=>c.pages()))console.error(await p.evaluate(()=>({status:NET.status,role:NET.role,open:NET.conn?.open,pc:NET.conn?.pc?.connectionState})).catch(()=>''));process.exitCode=1;}finally{await browser.close();}})();
