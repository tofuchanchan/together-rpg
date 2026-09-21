import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {startBonusEvent} from '../src/coop/bonus-events.js';
import {applyReward} from '../src/coop/builds.js';
const results=[];
for(const kind of ['xp','gold'])for(const role of ['warrior','mage','archer'])for(const seed of [17,41,83]){
 const w=new World(seed);w.reset([role],1);w.room=3;w.clears=4;w.wave=1;w.settleWave();
 for(const slot of [0,1])applyReward(w.heroes[0],`active:${slot}`);
 let damage=0,maxAlive=0,xpDropped=0;const hurt=w.damageHero.bind(w),drop=w.dropPickup.bind(w);
 w.damageHero=(h,...args)=>{const before=h.hp;hurt(h,...args);damage+=Math.max(0,before-h.hp);};
 w.dropPickup=item=>{if(item.type==='xp')xpDropped+=item.value||1;return drop(item);};
 startBonusEvent(w,kind);
 for(let frame=0;frame<4000&&w.bonusEvent;frame++){
  if(w.mode==='upgrade'){w.choose(0,0);w.confirm(0);}else w.advance(1/60,[w.aiInput(w.heroes[0])]);
  if(w.bonusEvent)maxAlive=Math.max(maxAlive,w.enemies.length);w.events=[];
 }
 const b=w.lastBonusReport;assert.equal(w.bonusEvent,null);assert.equal(w.clears,4);assert.equal(w.wave,2);assert.equal(damage,0);
 if(kind==='xp')assert.equal(xpDropped,b.killed);else{assert.equal(b.killed,0);assert.ok(b.goldDropped>0);}
 results.push({kind,role,seed,kills:b.killed,spawned:b.spawned,xpDropped,goldDropped:b.goldDropped,goldCollected:w.heroes[0].gold,endLevel:w.level,maxAlive,damage});
}
const out='output/verification/shop-bonus';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/simulation.json`,JSON.stringify({scope:'18 staged single-character intermissions, two granted level-I active skills, normal production AI, seeded randomness and automatic first-option attributes. Not a natural campaign or human balance result.',results},null,2));
console.log(JSON.stringify(['xp','gold'].map(kind=>{const rows=results.filter(r=>r.kind===kind);return{kind,runs:rows.length,spawned:[Math.min(...rows.map(r=>r.spawned)),Math.max(...rows.map(r=>r.spawned))],killed:[Math.min(...rows.map(r=>r.kills)),Math.max(...rows.map(r=>r.kills))],gold:[Math.min(...rows.map(r=>r.goldDropped)),Math.max(...rows.map(r=>r.goldDropped))],damage:rows.reduce((n,r)=>n+r.damage,0)};})));
