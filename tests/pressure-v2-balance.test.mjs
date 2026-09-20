// Opt-in natural combat audit: PowerShell $env:PRESSURE_BALANCE='1'; node --test tests/pressure-v2-balance.test.mjs
// Only normal input/reward APIs are used. Hooks observe events; no combat values or enemies are altered.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {World} from '../src/coop/model.js';
const candidateHistory=path=>fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):null;

test('production audit accepts a fresh checkout without historical simulation artifacts',()=>{
 assert.equal(candidateHistory(`output/v07/absent-${crypto.randomUUID()}.json`),null);
});

function rewardIndex(w,smart){
 if(!smart)return 0;
 const h=w.heroes[0],offers=w.offers[0];
 const priority=o=>{
  if(o.kind==='active'&&!h.skills[o.slot])return 100;
  if(h.hp/h.maxHp<.6&&['hp','recovery'].includes(o.key))return 95;
  if(o.key==='passive:harvest')return 90;
  if(o.kind==='core')return 80;
  if(o.kind==='active')return 70;
  if(['power','haste','range'].includes(o.key))return 60;
  if(['armor','hp','evasion','pickup'].includes(o.key))return 50;
  return 10;
 };
 return offers.reduce((best,o,i)=>priority(o)>priority(offers[best])?i:best,0);
}

function simulate(role,seed,{waves=1,limit=120,smart=false}={}){
 const w=new World(seed);w.reset([role,role==='warrior'?'mage':'warrior'],1);
 const record={role,seed,damageEvents:0,damage:0,drops:{xp:0,xpValue:0,gold:0,goldValue:0,potion:0},collected:{xp:0,xpValue:0,gold:0,goldValue:0,potion:0},downs:0,revives:0,dodges:0,skillCasts:0,skillByHero:[{},{},{}],harvestAt:{},choices:[],waves:[]};
 const drop=w.dropPickup.bind(w),emit=w.emit.bind(w),damage=w.damageHero.bind(w);
 w.dropPickup=item=>{const result=drop(item);if(result&&['xp','gold','potion'].includes(item.type)){record.drops[item.type]++;if(item.type!=='potion')record.drops[item.type+'Value']+=item.value||1;}return result;};
 w.emit=(type,data={})=>{if(type==='xp'||type==='gold'){record.collected[type]++;record.collected[type+'Value']+=data.value||1;}if(type==='heal')record.collected.potion++;if(type==='down')record.downs++;if(type==='revive')record.revives++;if(type==='dodge')record.dodges++;if(type==='skill'){record.skillCasts++;const casts=record.skillByHero[data.id];casts[data.skill]=(casts[data.skill]||0)+1;}return emit(type,data);};
 w.damageHero=(h,...args)=>{const hp=h.hp;damage(h,...args);if(h.hp<hp){record.damageEvents++;record.damage+=hp-h.hp;}};
 let lastWave=0,lastKills=0;
 for(let frame=0;frame<limit*60+200&&w.time<limit&&w.mode!=='defeat';frame++){
  for(const hero of w.heroes)if(hero.passives.harvest&&record.harvestAt[hero.id]===undefined)record.harvestAt[hero.id]={role:hero.role,time:+w.time.toFixed(1),rank:hero.passives.harvest};
  if(w.mode==='upgrade'){
   if(w.rewardType==='skill'&&w.clears>lastWave){record.waves.push({room:w.room,wave:w.wave,time:+w.waveElapsed.toFixed(1),kills:w.kills-lastKills});lastWave=w.clears;lastKills=w.kills;}
   if(w.clears>=waves)break;
   const index=rewardIndex(w,smart);record.choices.push(w.offers[0][index].key);w.choose(0,index);w.confirm(0);continue;
  }
  if(w.mode==='complete'){w.nextRoom();continue;}
  w.advance(1/60,[w.aiInput(w.heroes[0]),{}]);
 }
 return {...record,mode:w.mode,time:+w.time.toFixed(1),level:w.level,clears:w.clears,kills:w.kills,alive:w.enemies.filter(e=>e.hp>0).length,hp:w.heroes.map(h=>+h.hp.toFixed(1)),builds:w.heroes.map(h=>({role:h.role,skills:h.skills,core:h.core,forms:h.forms,passives:h.passives})),damage:Math.round(record.damage)};
}

test('six ordinary starts retain pressure and clear their first wave',{skip:process.env.PRESSURE_BALANCE!=='1'},t=>{
 const rows=[];for(const role of ['warrior','mage','archer'])for(const seed of [17,41])rows.push(simulate(role,seed));
 for(const row of rows)t.diagnostic(JSON.stringify(row));
 const clear=rows.filter(r=>r.clears===1),mean=clear.reduce((n,r)=>n+r.time,0)/clear.length;
 assert.ok(clear.length>=5);assert.ok(mean>=59&&mean<=85,`first-wave mean ${mean}`);assert.ok(rows.every(r=>r.damageEvents>0&&r.collected.xpValue>0));
});

test('three seeded natural campaigns audit progression and pickup yields',{skip:process.env.PRESSURE_BALANCE!=='1'},t=>{
 for(const [i,role] of ['warrior','mage','archer'].entries()){
  const row=simulate(role,[17,41,83][i],{waves:6,limit:900,smart:true});t.diagnostic(JSON.stringify(row));
  assert.ok(Number.isFinite(row.time)&&row.hp.every(Number.isFinite));assert.ok(row.collected.xpValue<=row.drops.xpValue);assert.ok(row.collected.goldValue<=row.drops.goldValue);assert.ok(row.collected.potion<=row.drops.potion);
 }
});

// Actual-model verification, with no candidate healing hook:
// $env:PRESSURE_PRODUCTION='1'; $env:PRESSURE_RUNS='4'; node --test tests/pressure-v2-balance.test.mjs
// PRESSURE_RUNS accepts 4 (mage), 8 (mage plus two seeds per other role), or 12 (four per role).
test('production wave rest sustains natural combat and optionally compares candidate outcomes',{skip:process.env.PRESSURE_PRODUCTION!=='1'},t=>{
 const runCount=Number(process.env.PRESSURE_RUNS||8);assert.ok([4,8,12].includes(runCount));
 const candidatePath='output/v07/balance-rest-experiment.json',candidate=candidateHistory(candidatePath);
 if(candidate)assert.equal(candidate.complete,true);
 const files=['src/coop/pressure.js','src/coop/encounters.js','src/coop/loot.js','src/coop/ai.js','src/coop/model.js','src/coop/build-combat.js','src/coop/builds.js','src/coop/universal-combat.js','tests/pressure-v2-balance.test.mjs'];
 const report={generatedAt:new Date().toISOString(),complete:false,status:'Actual World rules; no healing, enemy, HP, damage or reward injection',runCount,candidateFile:candidate?candidatePath:null,candidateNote:candidate?'Compare available same-seed historical runs':'No historical candidate artifact; run standalone natural-combat validation',sourceHashes:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),runs:[]};
 const save=()=>{fs.mkdirSync('output/v07',{recursive:true});fs.writeFileSync('output/v07/production-after-rest.json',JSON.stringify(report,null,2));};save();
 for(const role of runCount===4?['mage']:['mage','warrior','archer'])for(const seed of role==='mage'||runCount===12?[17,41,83,127]:[17,41]){
  const actual=simulate(role,seed,{waves:6,limit:900,smart:true}),expected=candidate?.runs.find(r=>r.role===role&&r.seed===seed)?.after;
  const comparedFields=['clears','time','level','kills','damage','downs','revives','hp','collected'];
  const mismatches=expected?comparedFields.filter(key=>JSON.stringify(actual[key])!==JSON.stringify(expected[key])):[];
  report.runs.push({role,seed,actual,candidateCompared:!!expected,candidateMismatches:mismatches});save();
  t.diagnostic(JSON.stringify({role,seed,mode:actual.mode,clears:actual.clears,time:actual.time,level:actual.level,kills:actual.kills,harvestAt:actual.harvestAt,candidateMismatches:mismatches}));
  assert.ok(Number.isFinite(actual.time)&&actual.hp.every(Number.isFinite));
  assert.ok(actual.collected.xpValue>0&&actual.collected.xpValue<=actual.drops.xpValue);
  assert.ok(actual.collected.goldValue<=actual.drops.goldValue&&actual.collected.potion<=actual.drops.potion);
 }
 report.complete=true;report.summary={runs:report.runs.length,successes:report.runs.filter(r=>r.actual.clears===6).length,compared:report.runs.filter(r=>r.candidateCompared).length,mismatching:report.runs.filter(r=>r.candidateMismatches.length).length};
 report.limitation='Seeded robot verification through three rooms; no claim of full 20-room balance or human playtest coverage.';save();
 assert.ok(report.summary.successes>=Math.ceil(runCount/2),'At least half the natural starts should clear three rooms');
 assert.ok(report.runs.filter(r=>r.role==='mage'&&r.actual.clears===6).length>=3,'Mage should clear three rooms in at least three of four seeds');
 assert.equal(report.summary.mismatching,0,'Production should reproduce the explicit candidate-rest rule with unchanged inputs');
});
