import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {World} from '../src/coop/model.js';
import {ATTRIBUTES,skillPool} from '../src/coop/builds.js';

// Exercise the shipped app update function, rather than copying its menu loop.
// DOM/Phaser startup is intentionally excluded; browser regression covers it.
const app=readFileSync(new URL('../src/coop/app.js',import.meta.url),'utf8');
const updateSource=app.slice(app.indexOf('function update(seconds)'),app.indexOf('class CoopScene'));
function fixture(type='attribute'){
 const w=new World(2);w.reset(['warrior','mage'],2);w.enemies=[];w.pressure=null;
 const keys=type==='attribute'?['power','armor','hp']:['active:0','active:1','passive:guard'];
 if(type==='skill'){w.heroes.forEach(h=>h.skills=[1,1]);w.heroes[0].passives={guard:1,harvest:1,thorns:1,focus:1};}
 w.beginReward(type);w.offers=w.heroes.map(h=>keys.map(key=>type==='attribute'?{...ATTRIBUTES.find(o=>o.key===key),kind:'attribute'}:skillPool(h).find(o=>o.key===key)));
 const router={input:[{},{}],slots:[{type:'keyboard',id:0},{type:'keyboard',id:1}],disconnected:[],flushes:0,sample(){return this.input;},flush(){this.flushes++;}};
 // Include the app's closed catalogue state while retaining the shipped update
 // function and the original simultaneous-confirmation assertions.
 const update=new Function('world','router','testPads','actions','view','clearTransition','sound',`const startScreen={blocksGame:false},codex={isOpen:false};${updateSource};return update;`)(w,router,[],{},null,()=>router.flush(),()=>{});
 return {w,router,update};
}
test('shipped update stops stale second-player confirmation when queued XP rebuilds the whole reward page',()=>{
 const {w,router,update}=fixture();w.choose(1,1);w.confirm(1);w.choose(0,2);w.xp=w.xpNext;
 router.input=[{confirm:true},{confirm:true}];update(.02);
 assert.equal(w.level,2);assert.equal(w.heroes[0].maxHp,230);assert.equal(w.heroes[1].armor,.05);assert.deepEqual(w.ready,[false,false]);assert.deepEqual(w.selection,[0,0,0]);assert.equal(router.flushes,1);
 const index=2,key=w.offers[1][index].key;router.input=[{},{down:true}];update(.02);update(.02);assert.equal(w.selection[1],index);
 const before={...w.heroes[1]};router.input=[{},{confirm:true}];update(.02);assert.deepEqual(w.ready,[false,true]);assert.equal(w.offers[1][w.selection[1]].key,key);assert.notDeepEqual(w.heroes[1],before);
});
test('a player-local replacement menu still allows the other player to confirm their selected card in the same frame',()=>{
 const {w,router,update}=fixture('skill');w.offers[0][0]=skillPool(w.heroes[0]).find(o=>o.key==='passive:chill');w.choose(1,1);
 router.input=[{confirm:true},{confirm:true}];update(.02);
 assert.equal(w.rewardMenus[0].type,'replace');assert.deepEqual(w.ready,[false,true]);assert.deepEqual(w.heroes[1].skills,[1,2]);assert.equal(w.selection[1],1);assert.equal(router.flushes,1);
});
test('ordinary simultaneous attribute confirmations apply both chosen cards and transition once',()=>{
 const {w,router,update}=fixture();w.choose(0,2);w.choose(1,1);router.input=[{confirm:true},{confirm:true}];update(.02);
 assert.equal(w.mode,'play');assert.equal(w.level,1);assert.equal(w.heroes[0].maxHp,230);assert.equal(w.heroes[1].armor,.05);assert.deepEqual(w.ready,[true,true]);assert.equal(router.flushes,1);
});
