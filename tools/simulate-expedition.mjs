// Normal combat values and actual rewards. Only the human's input/choices are automated.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {CORES} from '../src/coop/builds.js';
const results=[];
for(const seed of [17,41]){
 const w=new World(seed);w.reset(['warrior','mage'],1);
 const phases=new Set();let maxEnemies=0;
 for(let i=0;i<60*2400&&w.mode!=='defeat';i++){
  for(const e of w.enemies)if(e.boss&&e.hp>0)phases.add(e.phase);
  maxEnemies=Math.max(maxEnemies,w.enemies.filter(e=>e.hp>0).length);
  if(w.mode==='complete'){if(w.room===10)break;w.nextRoom();continue;}
  if(w.mode==='upgrade'){
   const h=w.heroes[0],offers=w.offers[0];
   const preferred=offers.find(o=>o.kind==='evolution')||offers.find(o=>o.kind==='core')||offers.find(o=>o.kind==='active'&&!h.skills[o.slot])||offers.find(o=>o.kind==='passive'&&CORES[h.core]?.tags.includes(o.key.split(':')[1]))||offers.find(o=>h.hp<h.maxHp*.5&&o.key==='hp')||offers.find(o=>['power','skill','haste'].includes(o.key))||offers[0];
   w.selection[0]=offers.indexOf(preferred);w.confirm(0);
  }else w.advance(1/60,[w.aiInput(w.heroes[0]),{}]);
 }
 const result={seed,room:w.room,mode:w.mode,level:w.level,kills:w.kills,time:w.time,bossPhases:[...phases],maxEnemies,heroes:w.heroes.map(h=>({role:h.role,hp:h.hp,maxHp:h.maxHp,core:h.core,passives:h.passives}))};
 results.push(result);console.log(JSON.stringify(result));
 assert.equal(w.mode,'complete');assert.equal(w.room,10);assert.deepEqual([...phases],[1,2,3]);
}
fs.mkdirSync('output/coop-verification/expedition',{recursive:true});
fs.writeFileSync('output/coop-verification/expedition/campaign-simulation.json',JSON.stringify(results,null,2));
