// Paired navigation-only replay against the preserved pre-P1 numeric model.
// The baseline source tree was copied before editing ai.js. Other P1 agents can
// tune live pressure without changing the control in this comparison.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {World,ROLES,MAP} from '../output/p1-fixes/navigation-baseline/src/coop/model.js';
import {applyReward,skillPool,attributePool} from '../output/p1-fixes/navigation-baseline/src/coop/builds.js';
import {simulateCampaign} from '../output/p1-fixes/navigation-baseline/tools/audit-campaign.mjs';
import {companionInput} from '../src/coop/ai.js';
const out='output/p1-fixes',round=n=>Math.round(n*1000)/1000;
const baseline=JSON.parse(fs.readFileSync(`${out}/navigation-natural-before.json`));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [file,expected] of Object.entries(baseline.hashes))assert.equal(hash(`${out}/navigation-baseline/src/coop/${file}`),expected,`frozen baseline drift: ${file}`);
const activate=w=>{w.aiInput=h=>companionInput(w,h,ROLES[h.role],MAP);};
let snapshot;
const before=simulateCampaign(['warrior'],17,{policy:'gear',observe:w=>{
 const h=w.heroes[0];if(!snapshot&&w.room===7&&w.wave===1&&Math.abs(h.x-204.29)<.2&&Math.abs(h.y+756.05)<.2){snapshot=structuredClone(Object.fromEntries(Object.entries(w).filter(([,v])=>typeof v!=='function')));}
}});
assert.equal(before.time,baseline.results[0].time);assert.equal(before.clears,12);assert.ok(before.anomalies.includes('wave-stall'));assert.ok(snapshot,'same natural jammed state exists');
function escape(patched){
 const w=new World(17);Object.assign(w,structuredClone(snapshot));if(patched)activate(w);const h=w.heroes[0],start={x:h.x,y:h.y,time:w.time},path=[];
 for(let i=0;i<15*60&&w.mode==='play';i++){w.advance(1/60,[w.aiInput(h)]);if(i%60===0)path.push({time:round(w.time-start.time),x:round(h.x),y:round(h.y),intent:h.aiIntent});}
 return{patched,start,path,seconds:round(w.time-start.time),distance:round(Math.hypot(h.x-start.x,h.y-start.y)),mode:w.mode,kills:w.kills-snapshot.kills,hp:round(h.hp),x:round(h.x),y:round(h.y)};
}
const exactBefore=escape(false),exactAfter=escape(true);assert.ok(exactBefore.distance<.1);assert.ok(exactAfter.distance>50);
const after=simulateCampaign(['warrior'],17,{policy:'gear',observe:activate});
assert.ok(after.waves.some(w=>w.room===7&&w.wave===1),'the original natural route can clear its previous blocked wave');assert.ok(!after.anomalies.includes('wave-stall'));
fs.writeFileSync(`${out}/navigation-natural-paired.json`,JSON.stringify({method:'Frozen pre-P1 model and numbers; only World.aiInput switches to current companionInput. Natural public input/reward/shop policy preserved.',baselineHashes:baseline.hashes,navigationHash:hash('src/coop/ai.js'),before,after,exactBefore,exactAfter},null,2));
console.log(JSON.stringify({naturalBefore:{room:before.room,clears:before.clears,time:before.time,anomalies:before.anomalies},naturalAfter:{room:after.room,clears:after.clears,time:after.time,anomalies:after.anomalies},exactBefore:exactBefore.distance,exactAfter:exactAfter.distance}));

const old=JSON.parse(fs.readFileSync('output/deep-test/strength-class.json')).rows.filter(r=>r.id==='late-berserker-roving'&&r.scene==='elite');assert.equal(old.length,6);
function elite(row,patched){
 const w=new World(row.seed);w.reset(['warrior'],1);const h=w.heroes[0];
 for(const key of row.loadout.attributeHistory){assert.ok(attributePool(h).some(o=>o.key===key));applyReward(h,key);}h.level=row.loadout.level;
 for(const key of row.loadout.history){assert.ok(skillPool(h,{clears:37,highReward:true}).some(o=>o.key===key));assert.equal(applyReward(h,key).ok,true);}
 Object.assign(w,{enemies:[],projectiles:[],hazards:[],effects:[],pickups:[],spawnQueue:[],pressure:null,pressureState:null,waveDuration:Infinity,enrageAt:Infinity,waveElapsed:0,kills:0,xp:0,xpNext:Infinity,level:h.level,room:10,wave:1,bossRoom:false});h.x=h.y=0;
 for(const [i,kind]of ['wolf','beetle','skeleton','spider','mushroom','wisp'].entries()){const angle=w.random()*Math.PI*2,r=260+w.random()*150;w.enemies.push(w.createEnemy(kind,Math.cos(angle)*r,Math.sin(angle)*r,i%3===0?2:1));}
 if(patched)activate(w);let idle=0,longest=0;for(let i=0;i<60*60&&w.mode==='play'&&!h.down&&w.enemies.length;i++){
  w.advance(1/60,[w.aiInput(h)]);if(!h.action&&!['attack','guard'].includes(h.aiIntent)&&Math.hypot(h.vx||0,h.vy||0)<1){idle+=1/60;longest=Math.max(longest,idle);}else idle=0;
 }
 return{seed:row.seed,patched,clear:w.enemies.length===0,survived:!h.down,kills:w.kills,seconds:round(w.time),damage:round(h.damageDone),hp:round(h.hp),longestIdle:round(longest),ending:{x:round(h.x),y:round(h.y),intent:h.aiIntent}};
}
const pairs=old.map(row=>{const before=elite(row,false),after=elite(row,true);assert.equal(before.seconds,row.seconds);assert.equal(before.damage,row.damage);return{seed:row.seed,before,after};});
const fixed=pairs.find(p=>p.seed===211);assert.ok(fixed.before.longestIdle>20);assert.equal(fixed.after.clear,true);assert.ok(fixed.after.longestIdle<1);
fs.writeFileSync(`${out}/navigation-elite-paired.json`,JSON.stringify({method:'All six original late-roving elite seeds, original legal loadout, frozen enemy stats; only navigation changes.',pairs},null,2));console.log(JSON.stringify({eliteBefore:pairs.filter(p=>p.before.clear).length,eliteAfter:pairs.filter(p=>p.after.clear).length,seed211:fixed}));
