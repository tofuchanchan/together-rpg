// Staged model comparison, not a full-run balance claim. No direct HP/damage buffs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {CORES,applyReward,attributePool,skillPool} from '../src/coop/builds.js';

const option=(name,fallback)=>Number(process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback);
const bossCompare=process.argv.includes('--boss-compare');
const config={seeds:option('seeds',10),ordinarySeconds:option('ordinary-seconds',200),bossSeconds:option('boss-seconds',60),targetWaves:option('waves',3)};
for(const [name,value] of Object.entries(config))assert.ok(Number.isFinite(value)&&value>0&&value<=200,`Invalid ${name}`);
assert.ok(Number.isInteger(config.seeds)&&Number.isInteger(config.targetWaves));
const plans=[
 {role:'warrior',core:'bulwark',slot:0,form:'aegis',passive:'storage',title:'铁壁反击'},
 {role:'warrior',core:'berserker',slot:1,form:'bloodspin',passive:'harvest',title:'血刃旋风'},
 {role:'mage',core:'pyromancer',slot:0,form:null,passive:'ember',title:'连锁炎爆'},
 {role:'mage',core:'frostweaver',slot:0,form:'icelance',passive:'shatter',title:'冰枪碎裂'},
 {role:'archer',core:'sniper',slot:0,form:'markedshot',passive:'focus',title:'猎印狙击'},
 {role:'archer',core:'ranger',slot:1,form:'shadowvolley',passive:'afterimage',title:'影身齐射'},
];
const companionPlan=role=>plans.find(p=>p.role===role);
const bossAttributes=['hp','power','skill','armor','haste','cooldown','crit','hp','power','skill','armor','range','haste','cooldown','critDamage','hp','power','skill','armor','recovery'];
const round=n=>Math.round(n*100)/100;
const mean=values=>round(values.reduce((sum,n)=>sum+n,0)/values.length);

function scoreChoice(h,o,plan){
 if(o.kind==='evolution')return 1000;
 if(o.kind==='form')return o.form===plan.form?900:-10000;
 if(o.kind==='active')return !h.skills[o.slot]?800:o.slot===plan.slot?650:500;
 if(o.kind==='passive'){
  const key=o.key.split(':')[1];
  if(key===plan.passive)return 700;
  if(CORES[h.core]?.tags.includes(key))return 400+(h.passives[key]?10:30);
  return 100+(h.passives[key]?5:0);
 }
 if(o.kind==='core')return o.key===`core:${plan.core}`?950:0;
 if(o.key==='hp'&&h.hp<h.maxHp*.55)return 750;
 return {skill:300,power:280,armor:240,haste:230,cooldown:220,crit:210,hp:200,dot:190,shield:180,recovery:170,critDamage:160,range:150,speed:140,evasion:130}[o.key]||0;
}

function grantLegalSkill(h,key,history){
 assert.ok(skillPool(h).some(o=>o.key===key),`Staged reward is not legal: ${h.role} ${key}`);
 applyReward(h,key);history.push(key);
}

function stageHero(h,plan,fixture){
 const skillHistory=[],attributeHistory=[];
 for(const key of ['active:0','active:1',`core:${plan.core}`,plan.form?`form:${plan.slot}:${plan.form}`:`active:${plan.slot}`,`passive:${plan.passive}`])grantLegalSkill(h,key,skillHistory);
 if(fixture==='boss'){
  while(skillHistory.length<18){const pick=skillPool(h).filter(o=>o.kind!=='attribute'&&!(o.kind==='form'&&o.form!==plan.form)).sort((a,b)=>scoreChoice(h,b,plan)-scoreChoice(h,a,plan))[0];assert.ok(pick,'Insufficient legal staged skills');grantLegalSkill(h,pick.key,skillHistory);}
  for(const key of bossAttributes){assert.ok(attributePool(h).some(o=>o.key===key),`Staged attribute is not legal: ${key}`);applyReward(h,key);attributeHistory.push(key);}
 }
 return {id:h.id,role:h.role,plan:plan.core,skillBudget:skillHistory.length,attributeBudget:attributeHistory.length,skillHistory,attributeHistory,stats:{hp:h.hp,maxHp:h.maxHp,power:h.power,skillPower:h.skillPower,armor:h.armor,haste:h.haste}};
}

function stageBaseline(h,variant){
 const skillHistory=[],attributeHistory=[],count=variant==='baseline-cards'?32:20;
 for(const slot of [0,1])for(let level=0;level<3;level++)grantLegalSkill(h,`active:${slot}`,skillHistory);
 for(let i=0;i<count;i++){
  const desired=bossAttributes[i%bossAttributes.length],pool=attributePool(h),key=pool.some(o=>o.key===desired)?desired:pool[0].key;
  applyReward(h,key);attributeHistory.push(key);
 }
 assert.equal(h.core,null);assert.deepEqual(h.forms,[null,null]);assert.deepEqual(h.passives,{});
 return {id:h.id,role:h.role,plan:variant,skillBudget:6,unspentWaveBudget:variant==='baseline-level'?12:0,attributeBudget:count,skillHistory,attributeHistory,stats:{hp:h.hp,maxHp:h.maxHp,power:h.power,skillPower:h.skillPower,armor:h.armor,haste:h.haste}};
}

function observe(w){
 const heroes=w.heroes.map(h=>({id:h.id,role:h.role,hpLossHits:0,hpLoss:0,absorbed:0,contacts:0,downs:0,revives:0,potions:0,buildBursts:0,casts:[0,0],peakResource:0,resourceReadySeconds:0}));
 const state={heroes,enrageCount:0,bossDefeated:false,suppressedSummons:0,damageFrames:[],bossSkillsStarted:{},bossSkillsReleased:{},bossPhases:[],seenSummons:new Set()};
 const rawDamage=w.damageHero.bind(w),rawEmit=w.emit.bind(w);
 w.damageHero=(h,...args)=>{state.damageFrames.push({id:h.id,hp:h.hp,shield:h.shield});try{return rawDamage(h,...args);}finally{state.damageFrames.pop();}};
 w.emit=(type,data={})=>{
  const stat=heroes[data.id],h=w.heroes[data.id];
  if(type==='hurt'&&stat){const before=state.damageFrames.at(-1);stat.contacts++;if(before?.id===data.id){const loss=Math.max(0,before.hp-h.hp);stat.hpLoss+=loss;stat.hpLossHits+=Number(loss>0);stat.absorbed+=Math.max(0,before.shield-h.shield);}}
  if(type==='skill'&&stat)stat.casts[['bash','fireball','pierce'].includes(data.skill)?0:1]++;
  if(type==='buildBurst'&&stat)stat.buildBursts++;
  if(type==='down'&&stat)stat.downs++;
  if(type==='revive'&&stat)stat.revives++;
  if(type==='heal'&&stat)stat.potions++;
  if(type==='enrage')state.enrageCount++;
  if(type==='bossDefeated')state.bossDefeated=true;
  if(type==='bossSkill')state.bossSkillsStarted[data.skill]=(state.bossSkillsStarted[data.skill]||0)+1;
  if(type==='bossPhase')state.bossPhases.push(data.phase);
  return rawEmit(type,data);
 };
 return state;
}

function simulate(plan,fixture,seed,options={}){
 const w=new World(seed);w.reset([plan.role,plan.role==='warrior'?'mage':'warrior'],1);
 if(options.formation==='solo')w.heroes=w.heroes.slice(0,1);
 const staged=w.heroes.map(h=>options.variant?.startsWith('baseline')?stageBaseline(h,options.variant):stageHero(h,h.id===0?plan:companionPlan(h.role),fixture));
 // Start at a declared checkpoint. Spawn normal scaled enemies; do not alter their stats.
 w.enemies=[];w.projectiles=[];w.effects=[];w.hazards=[];w.pickups=[];w.delayed=[];w.events=[];
 w.room=fixture==='boss'?10:3;w.wave=fixture==='boss'?1:2;w.clears=fixture==='boss'?18:5;
 if(fixture==='boss'){w.level=staged[0].attributeBudget+1;w.xpNext=5+(w.level-1)*3;}
 w.spawnWave();
 const initialClears=w.clears,observed=observe(w),seconds=fixture==='boss'?config.bossSeconds:config.ordinarySeconds,boss=w.enemies.find(e=>e.boss),bossMaxHp=boss?.maxHp;
 let menuChoices=0;
 while(w.time+1e-6<seconds&&w.mode!=='defeat'&&!observed.bossDefeated&&w.clears-initialClears<config.targetWaves){
  if(w.mode==='upgrade'){
   const offers=w.offers[0];assert.ok(offers?.length,'Upgrade must contain legal options');
   const ranked=offers.map((o,index)=>({index,score:scoreChoice(w.heroes[0],o,plan)})).sort((a,b)=>b.score-a.score);
   w.choose(0,ranked[0].index);w.confirm(0);menuChoices++;assert.ok(menuChoices<500,'Upgrade loop did not resume combat');continue;
  }
  if(w.mode==='complete'){w.nextRoom();continue;}
  assert.equal(w.mode,'play');
  const beforeAction=boss?.action,beforeHit=beforeAction?.hit;
  const dt=Math.min(1/30,seconds-w.time);w.advance(dt,[w.aiInput(w.heroes[0]),{}]);
  if(beforeAction&&!beforeHit&&beforeAction.hit)observed.bossSkillsReleased[beforeAction.kind]=(observed.bossSkillsReleased[beforeAction.kind]||0)+1;
  if(fixture==='boss'){
   const summons=w.enemies.filter(e=>e.summonedBy===boss.id);for(const e of summons)observed.seenSummons.add(e.id);
   // Original contribution fixture only. --boss-compare retains the entire real encounter.
   if(!options.keepSummons){observed.suppressedSummons+=summons.length;w.enemies=w.enemies.filter(e=>e.summonedBy!==boss.id);}
  }
  for(const h of w.heroes){const stat=observed.heroes[h.id];stat.peakResource=Math.max(stat.peakResource,h.resource||0);if((h.resource||0)>=60)stat.resourceReadySeconds+=dt;}
 }
 const clearedWaves=w.clears-initialClears;
 const heroResults=observed.heroes.map((stat,i)=>({...stat,hpLoss:round(stat.hpLoss),absorbed:round(stat.absorbed),effectiveDamage:round(w.heroes[i].damageDone),alive:!w.heroes[i].down,hp:round(w.heroes[i].hp),maxHp:w.heroes[i].maxHp,resourceReadySeconds:round(stat.resourceReadySeconds),finalCore:w.heroes[i].core,finalForms:w.heroes[i].forms}));
 return {fixture,variant:options.variant||'build',formation:options.formation||'team',plan:options.variant?.startsWith('baseline')?`${plan.role}-${options.variant}`:plan.core,title:plan.title,role:plan.role,seed,time:round(w.time),mode:w.mode,clearedWaves,clearedAny:fixture==='boss'?observed.bossDefeated:clearedWaves>0,completedGoal:fixture==='boss'?observed.bossDefeated:clearedWaves>=config.targetWaves,teamSurvived:w.mode!=='defeat',allStanding:heroResults.every(h=>h.alive),bossRemainingFraction:boss?round(Math.max(0,boss.hp)/bossMaxHp):null,bossSkillsStarted:observed.bossSkillsStarted,bossSkillsReleased:observed.bossSkillsReleased,bossPhases:observed.bossPhases,summonedCount:observed.seenSummons.size,kills:w.kills,enrageCount:observed.enrageCount,suppressedSummons:observed.suppressedSummons,menuChoices,heroes:heroResults,staged};
}

if(bossCompare){
 const seeds=option('compare-seeds',3);assert.ok(Number.isInteger(seeds)&&seeds>0&&seeds<=20);
 const rows=[];
 for(const formation of ['team','solo']){
  for(const role of ['warrior','mage','archer'])for(const variant of ['baseline-level','baseline-cards'])for(let i=0;i<seeds;i++)rows.push(simulate(companionPlan(role),'boss',17+i*101,{formation,variant,keepSummons:true}));
  for(const plan of plans)for(let i=0;i<seeds;i++)rows.push(simulate(plan,'boss',17+i*101,{formation,variant:'build',keepSummons:true}));
 }
 const aggregates=[];
 for(const formation of ['team','solo'])for(const plan of [...new Set(rows.filter(r=>r.formation===formation).map(r=>r.plan))]){
  const group=rows.filter(r=>r.formation===formation&&r.plan===plan),won=group.filter(r=>r.completedGoal),players=group.map(r=>r.heroes[0]),skills=group.map(r=>Object.values(r.bossSkillsReleased).reduce((sum,n)=>sum+n,0));
  const result={formation,plan,role:group[0].role,variant:group[0].variant,n:group.length,winRate:mean(group.map(r=>Number(r.completedGoal))),time:mean(group.map(r=>r.time)),winTime:won.length?mean(won.map(r=>r.time)):null,playerHpLoss:mean(players.map(h=>h.hpLoss)),playerAbsorbed:mean(players.map(h=>h.absorbed)),playerHits:mean(players.map(h=>h.hpLossHits)),playerDamage:mean(players.map(h=>h.effectiveDamage)),playerBursts:mean(players.map(h=>h.buildBursts)),bossSkillsReleased:mean(skills),bossSkillsStarted:mean(group.map(r=>Object.values(r.bossSkillsStarted).reduce((sum,n)=>sum+n,0))),summoned:mean(group.map(r=>r.summonedCount)),remainingHp:mean(group.map(r=>r.bossRemainingFraction)),playerCasts:[mean(players.map(h=>h.casts[0])),mean(players.map(h=>h.casts[1]))]};
  aggregates.push(result);console.log(JSON.stringify(result));
 }
 const contrasts=aggregates.filter(a=>a.variant==='build').map(build=>{const level=aggregates.find(a=>a.formation===build.formation&&a.role===build.role&&a.variant==='baseline-level'),cards=aggregates.find(a=>a.formation===build.formation&&a.role===build.role&&a.variant==='baseline-cards');return {formation:build.formation,plan:build.plan,buildWinRate:build.winRate,buildWinTime:build.winTime,levelBaselineWinRate:level.winRate,levelBaselineWinTime:level.winTime,equalCardBaselineWinRate:cards.winRate,equalCardBaselineWinTime:cards.winTime,timeVsLevel:build.winTime&&level.winTime?round(build.winTime/level.winTime):null,timeVsEqualCards:build.winTime&&cards.winTime?round(build.winTime/cards.winTime):null};});
 const result={generatedAt:new Date().toISOString(),seedsPerGroup:seeds,seconds:config.bossSeconds,conditions:{boss:'Unmodified room-10 boss: 2600 HP, all phases, warnings, summons and summoned enemies retained; no enemy stat overrides',formation:'team uses one AI-driven player plus both normal AI companions; solo removes the companions without changing player stats or model rules',build:'Every hero receives 18 legal skill rewards and 20 legal attribute rewards, matching the previous staged contribution fixture',baselineLevel:'Every hero has only both basic actives III (6 legal skill rewards), no evolution/core/form/passive, and the same 20 attributes / level 21; 12 skill rewards deliberately unspent',baselineCards:'Every hero has both basic actives III and 32 legal attributes / level 33: same 38 total cards as the build. This is an explicit staged 12-skill-to-12-attribute budget conversion; the current in-game wave menu cannot offer this route',control:'Same seeds, initial positions, AI movement/avoidance, normal collision and combat; no rerolls, no damage/health overrides. Team baseline companions also have no builds; solo isolates player contribution',interpretation:'Partial 60-second runs are censored, not win times; actual skill releases count action.hit transitions, not telegraph starts. This tests whether raw stats alone trivialize the boss and does not establish human difficulty or campaign balance'},aggregates,contrasts,rows};
 fs.mkdirSync('output/build-verification',{recursive:true});fs.writeFileSync('output/build-verification/boss-comparison.json',JSON.stringify(result,null,2));
 assert.equal(rows.length,24*seeds);assert.ok(rows.every(r=>r.suppressedSummons===0));
 console.log(`Saved ${rows.length} complete-encounter comparisons to output/build-verification/boss-comparison.json`);
}else{
const rows=[];
for(const fixture of ['ordinary','boss'])for(const plan of plans){
 for(let i=0;i<config.seeds;i++)rows.push(simulate(plan,fixture,17+i*101));
 const group=rows.filter(r=>r.fixture===fixture&&r.plan===plan.core),players=group.map(r=>r.heroes[0]);
 console.log(JSON.stringify({fixture,plan:plan.core,n:group.length,time:mean(group.map(r=>r.time)),clearedAnyRate:mean(group.map(r=>Number(r.clearedAny))),meanClearedWaves:mean(group.map(r=>r.clearedWaves)),completedGoalRate:mean(group.map(r=>Number(r.completedGoal))),teamSurvivalRate:mean(group.map(r=>Number(r.teamSurvived))),playerStandingRate:mean(players.map(p=>Number(p.alive))),playerHits:mean(players.map(p=>p.hpLossHits)),playerHpLoss:mean(players.map(p=>p.hpLoss)),playerAbsorbed:mean(players.map(p=>p.absorbed)),playerDamage:mean(players.map(p=>p.effectiveDamage)),teamDamage:mean(group.map(r=>r.heroes.reduce((sum,h)=>sum+h.effectiveDamage,0))),playerBursts:mean(players.map(p=>p.buildBursts)),playerCasts:[mean(players.map(p=>p.casts[0])),mean(players.map(p=>p.casts[1]))],enrageRate:mean(group.map(r=>Number(r.enrageCount>0))),bossRemaining:fixture==='boss'?mean(group.map(r=>r.bossRemainingFraction)):null}));
}
const summary={generatedAt:new Date().toISOString(),config,conditions:{kind:'staged comparison, not an end-to-end campaign',control:'single player plus two AI companions; player input also uses current aiInput; fixed 120 Hz model, sampled player inputs at 30 Hz',ordinary:'room 3 wave 2 after 5 declared clears; each hero 5 legal skill rewards, no staged attributes; normal waves, growth, drops, enrage and upgrades',boss:'room 10, each hero 18 legal skill rewards and identical 20-attribute budget; original boss stats and phases; summoned minions explicitly suppressed',companions:'other classes use fixed bulwark / pyromancer / sniper baseline plans; only player plan changes within same-class comparisons',rewards:'staged cards must be in skillPool or attributePool; during combat player selects actual visible offers, AI companions use normal model choices; no rerolls',limits:'equal reward counts do not imply equal power; no direct health/damage overrides; reported clearAny is at least one ordinary wave or a boss kill, completedGoal means targetWaves or boss kill; survival includes revives; this does not establish human difficulty or long-run balance'},rows};
fs.mkdirSync('output/build-verification',{recursive:true});fs.writeFileSync('output/build-verification/simulations.json',JSON.stringify(summary,null,2));
assert.equal(rows.length,2*plans.length*config.seeds);
assert.ok(rows.every(r=>r.time<=Math.max(config.ordinarySeconds,config.bossSeconds)+.05&&r.heroes.every(h=>Number.isFinite(h.effectiveDamage))));
console.log(`Saved ${rows.length} staged runs to output/build-verification/simulations.json`);
}
