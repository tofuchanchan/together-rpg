import fs from 'node:fs';import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {applyReward} from '../src/coop/builds.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
const orders={fortress:[0,2],blades:[3,1],rail:[2,0],storm:[3,1],stars:[3,2],elements:[1,0]},rows=[];
for(const [key,pair] of Object.entries(SKILL_PAIRS))for(const advanced of [false,true]){
 const w=new World(84);w.reset([pair.role],1);w.enemies=[];w.pressure=null;w.obstacles=[];w.waveDuration=999;w.xpNext=1e9;
 const h=w.heroes[0];h.x=h.y=0;h.attackCd=999;
 for(const s of pair.slots)for(let i=0;i<3;i++)applyReward(h,`active:${s}`);h.passives[pair.component]=2;
 if(advanced){for(const s of pair.slots)applyReward(h,`advance:${s}`);applyReward(h,`mastery:${key}`);}
 const hits=new Set();let shots=0,bursts=0,peak=0,peakFields=0;
 const shoot=w.shoot.bind(w),damage=w.damageEnemy.bind(w),emit=w.emit.bind(w);
 w.shoot=(...args)=>{shots++;return shoot(...args);};w.damageEnemy=(e,...args)=>{const before=e.hp;const r=damage(e,...args);if(e.hp<before)hits.add(e.id);return r;};w.emit=(type,data)=>{if(type==='buildBurst')bursts++;return emit(type,data);};
 for(let i=0;i<16;i++){const e=w.createEnemy('goblin',100+(i%4)*55,(Math.floor(i/4)-1.5)*36);e.hp=e.maxHp=90;e.cd=999;e.stats.speed=0;w.enemies.push(e);}
 const advance=t=>{for(let i=0;i<Math.ceil(t*120);i++){w.advance(1/120);peak=Math.max(peak,w.projectiles.length);peakFields=Math.max(peakFields,w.skillFields.length);}};
 for(const s of orders[key]){assert.equal(w.request(h,h.loadout.indexOf(s)?'skill2':'skill1',{x:1,y:0}),true);const duration=h.action.duration;if(key==='fortress'&&s===0&&advanced){advance(.12);w.damageHero(h,12,{x:50,y:0});advance(duration-.12+.02);}else advance(duration+.02);}
 advance(5);
 assert.ok(h.damageDone>0);assert.ok(w.enemies.every(e=>Number.isFinite(e.hp)));assert.ok(peak<=100&&peakFields<16);if(advanced)assert.ok(bursts>=1,`${key} must trigger its real combo`);
 rows.push({key,advanced,damage:Math.round(h.damageDone),hits:hits.size,kills:w.kills,shots,peak,peakFields,bursts});
}
fs.writeFileSync('output/verification/skill-quality/combos.json',JSON.stringify({scope:'Fixed 16 stationary 90-HP targets; same skill III and component II, then advanced+mastery added. Real ordered casts; fortress absorbs one real hit. Isolated mechanical feedback, not equal-investment DPS, natural play or subjective enjoyment.',rows},null,2));console.table(rows);
