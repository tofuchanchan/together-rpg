import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {partyPressure,pressurePlan,createPressureState} from '../src/coop/pressure.js';

function arena(size){
 const w=new World(401);w.reset(['warrior','archer'],Math.min(2,size));
 if(size===3)w.heroes.push(createHero('mage',2,{ai:true}));
 Object.assign(w,{room:13,wave:1,enemies:[],obstacles:[],pressure:null,pressureState:null,waveSpawned:0,batchSpawned:0,waveElapsed:0});
 w.random=()=>.981;return w;
}
const liveShamans=w=>w.enemies.filter(e=>e.kind==='shaman'&&e.hp>0);

for(const size of [1,2,3])test(`${size}-member party caps live shamans and keeps the full batch via skeleton substitutions`,()=>{
 const w=arena(size);w.spawnBatch({count:10,index:0});
 assert.equal(w.enemies.length,10);assert.equal(w.waveSpawned,10);assert.equal(liveShamans(w).length,size);
 assert.equal(w.enemies.filter(e=>e.kind==='skeleton').length,10-size);
});
for(const size of [1,2,3])test(`${size}-member party releases only dead shaman slots on the next real spawn batch`,()=>{
 const w=arena(size);w.spawnBatch({count:size,index:0});liveShamans(w)[0].hp=0;
 w.spawnBatch({count:1,index:1});assert.equal(liveShamans(w).length,size);assert.equal(w.enemies.at(-1).kind,'shaman');
 w.spawnBatch({count:1,index:2});assert.equal(liveShamans(w).length,size);assert.equal(w.enemies.at(-1).kind,'skeleton');
 assert.equal(w.enemies.filter(e=>e.kind==='shaman').length,size+1,'the dead body was retained, so the cap really checks HP');
});
for(const size of [2,3])test(`${size}-member party keeps its membership cap when only one hero remains standing`,()=>{
 const w=arena(size);for(const h of w.heroes.slice(1)){h.down=true;h.hp=0;}
 w.spawnBatch({count:10,index:0});assert.equal(liveShamans(w).length,size);assert.equal(w.enemies.length,10);
});
test('a scheduled shaman is also replaced at the three-member cap',()=>{
 const w=arena(3);w.spawnBatch({count:3,index:0});w.waveSpawned=59;w.random=()=>0;
 w.spawnBatch({count:1,index:1});assert.equal(w.enemies.at(-1).kind,'skeleton');assert.equal(liveShamans(w).length,3);
});
for(const size of [1,2,3])test(`${size}-member real pressure refills cannot accumulate shamans across repeated batches`,()=>{
 const w=arena(size);w.pressure=partyPressure(pressurePlan(w.room,w.wave),size);w.pressureState=createPressureState(w.pressure);
 w.refreshPressure();assert.equal(liveShamans(w).length,size);assert.equal(w.enemies.length,w.pressure.initial);
 for(let i=0;i<20;i++){
  const casualty=w.enemies.find(e=>e.hp>0&&e.kind!=='shaman');assert.ok(casualty);casualty.hp=0;
  const before=w.waveSpawned;w.waveElapsed+=.01;w.refreshPressure();assert.ok(w.waveSpawned>before,'a death really requests another spawnBatch');
  assert.equal(liveShamans(w).length,size);assert.ok(w.enemies.filter(e=>e.hp>0).length<=w.pressure.aliveCap);
 }
});
