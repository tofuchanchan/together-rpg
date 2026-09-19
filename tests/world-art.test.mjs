import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_SHEETS,ICON_ALIASES,enemyFrame,effectFrame} from '../src/coop/world-art-defs.js';
test('enemy art follows locked telegraph target through anticipation and hit',()=>{
 const e={kind:'goblin',x:0,y:0,face:0,stride:.75,action:{x:-100,y:0,t:.49,windup:.52,hit:false}};
 assert.equal(enemyFrame(e),'goblin-10');
 e.action.hit=true;assert.equal(enemyFrame(e),'goblin-11');
 e.action=null;assert.equal(enemyFrame(e),'goblin-25');
});
test('effect lifetime boundaries never address a missing atlas frame',()=>{
 const keys=new Set(WORLD_SHEETS.flatMap(s=>s.keys));
 for(const effect of ['slash','spin','frost','blast','hit','dust'])for(const q of [-.001,0,.249,.5,.999,1,1.001])assert.ok(keys.has(effectFrame(effect,q)));
 for(const name of Object.values(ICON_ALIASES))assert.ok(keys.has(name));
 assert.equal(keys.size,WORLD_SHEETS.reduce((n,s)=>n+s.keys.length,0));
});
test('negative initial animation delta cannot address a negative monster frame',()=>{
 const keys=new Set(WORLD_SHEETS.flatMap(s=>s.keys));
 for(const stride of [-2,-1,-.001,0,.001])for(let face=0;face<8;face++)assert.ok(keys.has(enemyFrame({kind:'goblin',face,stride})));
});
