import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {InputRouter} from '../src/coop/input.js';
import {createCodexSession} from '../src/coop/codex-session.js';

function fixture(mode='play',focus=()=>true){
 const world=new World(41);world.reset(['warrior','mage'],2);const router=new InputRouter();
 if(mode==='upgrade')world.beginReward('skill');
 if(mode==='shop'){world.room=5;world.wave=2;world.clears=10;world.mode='complete';world.enterShop();}
 assert.equal(world.mode,mode);return{world,router,session:createCodexSession(world,router,focus)};
}
for(const mode of ['play','upgrade','shop'])test(`codex pauses ${mode} without advancing combat or changing choices, then restores it`,()=>{
 const {world,router,session}=fixture(mode),before=structuredClone(world.snapshot());
 session.open();assert.equal(world.mode,'paused');assert.equal(world.resumeMode,mode);
 const paused=structuredClone(world.snapshot());world.advance(1,[{x:1,skill1:true,confirm:true},{y:1,dodge:true}]);assert.deepEqual(world.snapshot(),paused);
 session.close();assert.equal(world.mode,mode);assert.deepEqual({...world.snapshot(),reason:before.reason},before);assert.equal(router.suppress,true);
});
test('codex preserves an existing pause and its underlying mode',()=>{
 const {world,session}=fixture('shop');world.pause('玩家已暂停');session.open();session.close();assert.equal(world.mode,'paused');assert.equal(world.resumeMode,'shop');assert.equal(world.reason,'玩家已暂停');
});
test('codex does not resume after explicit focus interruption',()=>{
 const {world,session}=fixture();session.open();session.interrupt('窗口失去焦点');session.close();assert.equal(world.mode,'paused');assert.equal(world.reason,'窗口失去焦点');
});
test('codex does not resume while document focus is absent',()=>{
 let focused=true;const {world,session}=fixture('upgrade',()=>focused);session.open();focused=false;session.close();assert.equal(world.mode,'paused');assert.equal(world.resumeMode,'upgrade');
});
test('codex refuses to resume when a human controller disconnects',()=>{
 const {world,router,session}=fixture();router.bind(1,{type:'gamepad',id:3});session.open();router.sample([]);session.close();assert.equal(router.slots[1].type,'disconnected');assert.equal(world.mode,'paused');
});
test('a disconnected unused slot does not prevent single-player resume',()=>{
 const {world,router,session}=fixture();world.reset(['warrior'],1);router.slots[1]={type:'disconnected',id:3};session.open();session.close();assert.equal(world.mode,'play');
});
test('codex clears held keys, queued input and hero movement at both transitions',()=>{
 const {world,router,session}=fixture();
 for(const transition of [()=>session.open(),()=>session.close()]){
  router.key('KeyD',true);router.key('Space',true);world.pendingEdges=[{dodge:true},{skill1:true}];world.heroes[0].buffer={type:'skill'};world.heroes[0].move={x:1,y:0};transition();
  assert.equal(router.held.size,0);assert.equal(router.edges.size,0);assert.equal(router.blocked.size,0);assert.deepEqual(world.pendingEdges,[{},{}]);assert.equal(world.heroes[0].buffer,null);assert.deepEqual(world.heroes[0].move,{x:0,y:0});
  const input=router.sample([]);assert.equal(input[0].x,0);assert.equal(input[0].dodge,false);
 }
});
test('codex cannot revive a completed or defeated game on close',()=>{
 for(const mode of ['menu','complete','defeat','victory']){const {world,session}=fixture();world.mode=mode;session.open();session.close();assert.equal(world.mode,mode);}
});
