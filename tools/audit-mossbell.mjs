import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {applyReward} from '../src/coop/builds.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
import {createHero} from '../src/coop/recruitment.js';
import {preparePair} from './audit-pair-balance.mjs';
const phase=process.argv[2]||'before',out=`output/verification/boss-specialist/${phase}`;
fs.mkdirSync(out,{recursive:true});
const rows=[],seeds=[17,41,83,127],round=n=>+n.toFixed(2);
function run(key,stage,delay,seed,roles=null){
 const roster=roles||[SKILL_PAIRS[key].role],w=new World(seed);w.reset(roster,Math.min(2,roster.length));if(roster.length===3)w.heroes.push(createHero(roster[2],2,{ai:true}));w.enemies=[];w.effects=[];w.projectiles=[];w.room=10;w.wave=1;w.xpNext=1e9;w.lastBonusClear=1e9;w.dropPickup=()=>null;
 if(!roles&&stage==='formed')preparePair(w,key);
 else for(const h of w.heroes){
  const slots=roles?[0,1]:SKILL_PAIRS[key].slots;
  for(const slot of slots)for(let i=0;i<(stage==='basic'?1:2);i++)assert.ok(applyReward(h,`active:${slot}`).ok);
  if(stage==='advanced')for(const slot of slots)assert.ok(applyReward(h,`advance:${slot}`).ok);
  for(const card of ['hp','hp','hp','power','power','haste','skill','skill','armor','cooldown'])applyReward(h,card);
 }
 w.heroes.forEach((h,i)=>{h.x=(i-(w.heroes.length-1)/2)*130;h.y=170;h.hp=h.maxHp;});w.spawnWave();
 const boss=w.enemies[0],m={taken:0,hits:0,contact:0,guarded:0,casts:{},hitsBySkill:{},phaseTimes:{},peakEnemies:0,peakProjectiles:0};
 const hurt=w.damageHero.bind(w),emit=w.emit.bind(w);
 w.damageHero=(h,n,a,source)=>{const hp=h.hp,shield=h.shield;hurt(h,n,a,source);const loss=hp-h.hp;if(loss>0){m.taken+=loss;m.hits++;if(String(a.attackId).startsWith('contact:'))m.contact+=loss;const skill=a.skill||String(a.attackId).split(':')[0]||'other';m.hitsBySkill[skill]=(m.hitsBySkill[skill]||0)+loss;}m.guarded+=Math.max(0,shield-h.shield);};
 w.emit=(type,data={})=>{if(type==='bossSkill')m.casts[data.skill]=(m.casts[data.skill]||0)+1;emit(type,data);};
 const queues=Array.from({length:w.humanCount},()=>[]),held=Array.from({length:w.humanCount},()=>({}));
 for(let frame=0;frame<180*30&&w.mode==='play'&&boss.hp>0;frame++){
  const inputs=w.heroes.slice(0,w.humanCount).map((h,i)=>{if(delay===0)return w.aiInput(h);if(frame%3===0)queues[i].push({at:w.time+delay,input:w.aiInput(h)});while(queues[i][0]?.at<=w.time)held[i]=queues[i].shift().input;return held[i];});
  w.advance(1/30,inputs);m.phaseTimes[boss.phase]??=round(w.time);m.peakEnemies=Math.max(m.peakEnemies,w.enemies.length);m.peakProjectiles=Math.max(m.peakProjectiles,w.projectiles.length);assert.ok(w.heroes.every(h=>Number.isFinite(h.hp)&&Number.isFinite(h.x)));
 }
 return {key:roles?roles.join('+'):key,stage,delay,seed,won:boss.hp<=0,mode:w.mode,seconds:round(w.time),bossPct:round(Math.max(0,boss.hp)/boss.maxHp*100),hpPct:w.heroes.map(h=>round(h.hp/h.maxHp*100)),...m,taken:round(m.taken),contact:round(m.contact),guarded:round(m.guarded)};
}
function summary(){const groups=new Map();for(const r of rows){const key=[r.key,r.stage,r.delay].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups].map(([key,r])=>({key,runs:r.length,wins:r.filter(a=>a.won).length,seconds:round(r.reduce((n,a)=>n+a.seconds,0)/r.length),hpPct:round(r.reduce((n,a)=>n+a.hpPct.reduce((s,h)=>s+h,0)/a.hpPct.length,0)/r.length),damage:round(r.reduce((n,a)=>n+a.taken,0)/r.length),contact:round(r.reduce((n,a)=>n+a.contact,0)/r.length),ultimates:r.reduce((n,a)=>n+(a.casts.ultimate||0),0)}));}
const save=()=>fs.writeFileSync(`${out}/balance.json`,JSON.stringify({method:{seeds,stages:['basic: 2 skills I, 10 attributes','advanced: 2 skills II and their advances, 10 attributes','formed: same 11 build picks + 15 attributes used by previous pair audit'],delays:[0,.18],controller:'Production AI normal inputs. 180ms arm also samples at 10Hz. Human slots delayed, recruited AI native. No gear, drops or XP upgrades; normal damage, obstacles retained; 180 second limit. Presets are conditional encounters, not proof they occur naturally at room 10.'},rows,summary:summary()},null,2));
for(const stage of ['basic','advanced','formed'])for(const key of Object.keys(SKILL_PAIRS))for(const delay of [0,.18]){for(const seed of seeds)rows.push(run(key,stage,delay,seed));save();console.log(JSON.stringify(summary().at(-1)));}
for(const roles of [['warrior','mage'],['warrior','archer'],['mage','archer'],['warrior','mage','archer']])for(const delay of [0,.18]){for(const seed of seeds)rows.push(run(null,'party',delay,seed,roles));save();console.log(JSON.stringify(summary().at(-1)));}
