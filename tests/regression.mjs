import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=['00_core','01_data','10_sim'].map(x=>fs.readFileSync(new URL('../src/'+x+'.js',import.meta.url),'utf8')).join('\n');
const ctx={console,Math};vm.createContext(ctx);
vm.runInContext(code+`;globalThis.sim={newMatch,resolveBodies,stepGame};`,ctx);
for(const air of [false,true])for(const attack of [false,true])for(const side of [0,1]){
 const g=ctx.sim.newMatch(0,1,'seoul','cpu');g.phase='fight';
 const [a,b]=g.F;a.x=side?200:500;b.x=side?500:200;
 a.y=air?100:0;b.y=0;a.atk=attack?'P':null;a.f=1;b.f=-1;
 ctx.sim.resolveBodies(g);
 assert.equal(a.f,b.x>a.x?1:-1);assert.equal(b.f,-a.f);
}
const g=ctx.sim.newMatch(0,1,'seoul','cpu');g.phase='fight';
g.F[0].x=350;g.F[0].y=110;g.F[0].vx=15;g.F[1].x=360;
for(let i=0;i<12;i++){ctx.sim.stepGame(g,[{h:0,p:0},{h:0,p:0}]);assert.equal(g.F[0].f,g.F[1].x>g.F[0].x?1:-1);assert.equal(g.F[1].f,-g.F[0].f);}
assert.match(fs.readFileSync(new URL('../src/50_net.js',import.meta.url),'utf8'),/NET\.conn !== conn/);
console.log('Facing: ground, airborne, attack, side swaps and moving cross-over passed.');
