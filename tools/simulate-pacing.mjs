import fs from 'node:fs';
import {applyReward,attributePool,buildMaturity,rollSkills} from '../src/coop/builds.js';
import {ROUTES} from '../src/coop/progression-data.js';
import {awakeningAvailable} from '../src/coop/universal-data.js';
const seedCount=Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1]||1000);
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const hero=role=>({role,skills:[0,0],forms:[null,null],evolved:[false,false],evolutionBranches:[null,null],passives:{},core:null,power:1,skillPower:1,dotPower:1,shieldPower:1,hp:100,maxHp:100,speedBonus:1,haste:1,crit:0,critDamage:1.5,evasion:0,armor:0,cooldown:0,rangeBonus:1,recovery:1,cd:[0,0],rerolls:3});
function routeScore(h,r){return(h.core===r.core?2:0)+(r.form&&h.forms[r.slot]===r.form?3:!r.form&&!h.forms[r.slot]?1:0)+h.skills[r.slot]+Math.max(...r.recipes.map(keys=>keys.reduce((n,k)=>n+(h.passives[k]||0)*1.5,0)));}
function score(h,offer,target,policy){
 const r=ROUTES[target],kind=offer.kind,key=offer.key.split(':')[1],pieces=[...new Set(r.recipes.flat())];
 let n=kind==='active'&&!h.skills[offer.slot]?12:kind==='attribute'?1:3;
 if(offer.key===`core:${r.core}`)n=8;
 if(r.form&&offer.key===`form:${r.slot}:${r.form}`)n=10;
 if(kind==='form'&&offer.form!==r.form)n=-4;
 if(kind==='active'&&offer.slot===r.slot)n=8+(h.skills[offer.slot]===2?1:0);
 if(kind==='passive'&&pieces.includes(key))n=9+(h.passives[key]===1?2:0)-(h.passives[key]===2?5:0);
 if(kind==='evolution')n=13;
 if(kind==='awakening')n=12;
 if(kind==='core'&&key!==r.core)n=-3;
 if(policy==='survival'&&['guard','harvest','bloodAmber','paperCrow','homeGift','healingWave','hp','armor','evasion'].includes(key))n+=8;
 return n;
}
const output={method:{seedsPerRolePerPolicy:seedCount,policies:['fixed','adaptive','survival'],encounters:37,finalBossRewardExcluded:true,attributeAssumption:'one random available attribute every second clear; this is a reward-distribution model, not XP or survival simulation',mature:'active III + second active + legal two-component complementary recipe with one component II and matching actual shape; late evolution is separate',complete:'mature + matching core + chosen evolution + both complementary pieces II + a distinct functional support component II; generic awakening is not assumed necessary for a class-specific complete loop',limitations:['All samples assume survival; no victory or clear-time claim.','RNG decisions only inspect current hand and visible offers.','Mature is structural readiness, and is checked separately against combat regression fixtures.','No extra elite reward or respec is granted in this baseline.']},results:[]};
for(const role of ['warrior','mage','archer'])for(const policy of output.method.policies){
 const roleRoutes=Object.keys(ROUTES).filter(k=>ROUTES[k].role===role),stats={role,policy,runs:seedCount,matureBy9:0,matureBy18:0,matureBy37:0,completeBy18:0,completeBy32:0,completeBy37:0,awakeningBy18:0,awakeningBy37:0,unformed:0,emptyOffers:0,rerollsUsed:0,coreBy18:0,lateBehaviorChoices:0,remainingFights:[],firstMature:[]};
 for(let seed=1;seed<=seedCount;seed++){
  const random=rng(seed*104729+role.length*913),h=hero(role);let target=roleRoutes[seed%roleRoutes.length],first=null,complete=false,complete18=false,complete37=false;
  for(let clears=1;clears<=37;clears++){
   if(clears%2===0){const attrs=attributePool(h);applyReward(h,attrs[Math.floor(random()*attrs.length)].key);}
   if(policy!=='fixed')target=roleRoutes.slice().sort((a,b)=>routeScore(h,ROUTES[b])-routeScore(h,ROUTES[a]))[0];
   const context={clears,highReward:clears===19};let offers=rollSkills(h,random,context);
   if(!offers.length){stats.emptyOffers++;continue;}
   if(clears>8&&h.rerolls&&Math.max(...offers.map(o=>score(h,o,target,policy)))<8){const rerolled=rollSkills(h,random,{...context,previous:offers});if(rerolled.length){offers=rerolled;h.rerolls--;stats.rerollsUsed++;}}
   const sorted=offers.map(o=>({...o,score:score(h,o,target,policy)})).sort((a,b)=>b.score-a.score);let result;
   for(const choice of sorted){
    result=applyReward(h,choice.key);
    if(result.status==='replace-required'){
     const weakest=Object.keys(h.passives).map(key=>({key,score:score(h,{key:`passive:${key}`,kind:'passive'},target,policy)+h.passives[key]})).sort((a,b)=>a.score-b.score)[0];
     if(choice.score>weakest.score)result=applyReward(h,choice.key,{replaceKey:weakest.key});
    }
    if(result.ok){if(clears>=20&&['form','evolution','awakening'].includes(choice.kind)||clears>=20&&choice.kind==='passive'&&h.passives[choice.key.split(':')[1]]===1)stats.lateBehaviorChoices++;break;}
   }
   const ready=buildMaturity(h).filter(r=>policy!=='fixed'||r.key===target);
   if(ready.length&&first===null)first=clears;
   if(clears<=32&&ready.some(r=>r.complete))complete=true;
   if(clears<=18&&ready.some(r=>r.complete))complete18=true;
   if(ready.some(r=>r.complete))complete37=true;
   if(clears===18&&h.core)stats.coreBy18++;
   if(clears===18&&h.awakening)stats.awakeningBy18++;
  }
  if(first===null)stats.unformed++;else{stats.firstMature.push(first);stats.remainingFights.push(38-first);if(first<=9)stats.matureBy9++;if(first<=18)stats.matureBy18++;stats.matureBy37++;}
  if(complete)stats.completeBy32++;
  if(complete18)stats.completeBy18++;if(complete37)stats.completeBy37++;if(h.awakening)stats.awakeningBy37++;
 }
 for(const field of ['matureBy9','matureBy18','matureBy37','completeBy18','completeBy32','completeBy37','awakeningBy18','awakeningBy37','coreBy18'])stats[field]=+(100*stats[field]/seedCount).toFixed(2);
 stats.firstMature.sort((a,b)=>a-b);stats.matureMedianClear=stats.firstMature.length?stats.firstMature[Math.floor(stats.firstMature.length/2)]:null;stats.remainingFightsMean=stats.remainingFights.length?+(stats.remainingFights.reduce((a,b)=>a+b,0)/stats.remainingFights.length).toFixed(2):null;
 delete stats.firstMature;delete stats.remainingFights;output.results.push(stats);
}
const sharedPlans=[
 {key:'hiveHorn',parts:['boneWhistle','commandWhistle','ember','elementFeed']},
 {key:'starMagazine',parts:['needleMagazine','refractLens','stepCircuit']},
 {key:'movingMinefield',parts:['mineShoes','scavengeSigil','returnSign']},
 {key:'thornFortress',parts:['guard','shieldBrood','bloodAmber','homeGift']},
 {key:'starDelivery',parts:['magnetAstrolabe','supplyPack','scavengeSigil']},
 {key:'corrosionEngine',parts:['ember','chill','mixedFuse','transferNeedle']},
];
output.sharedMethod={runsPerRole:seedCount,policy:'one predetermined universal plan, rotates equally over six awakening families',highRewards:[19,28],challenge:'assumes surviving an optional elite replacement at clear 28; no extra reward count',mature:'all 3 or 4 functional shared pieces, at least two rank II, two active buttons learned',complete:'shared mature + target awakening + all selected parts II',limitations:'This is a conditional reward simulation, not a claim that taking the elite challenge is safe or always survivable.'};
output.sharedResults=[];
for(const role of ['warrior','mage','archer']){
 const stats={role,runs:seedCount,matureBy9:0,matureBy18:0,matureBy37:0,completeBy18:0,completeBy32:0,completeBy37:0,awakeningEligibleBy18:0,awakeningBy18:0,awakeningBy37:0,unformed:0};
 for(let seed=1;seed<=seedCount;seed++){
  const h=hero(role),random=rng(seed*104729+role.length*913),plan=sharedPlans[seed%sharedPlans.length];let first=null,firstComplete=null;
  const score=o=>{const key=o.key.split(':')[1],index=plan.parts.indexOf(key);if(o.kind==='awakening')return key===plan.key?30:-2;if(o.kind==='active')return !h.skills[o.slot]?13:1;if(o.kind==='core'||o.kind==='form'||o.kind==='evolution')return -1;if(index>=0)return 14-(index*.5)+(h.passives[key]===1?3:0)-(h.passives[key]>=2?7:0);return o.kind==='attribute'?1:2;};
  for(let clears=1;clears<=37;clears++){
   if(clears%2===0){const attrs=attributePool(h);applyReward(h,attrs[Math.floor(random()*attrs.length)].key);}
   const context={clears,highReward:clears===19||clears===28};let offers=rollSkills(h,random,context);
   if(clears>8&&h.rerolls&&Math.max(...offers.map(score))<10){const reroll=rollSkills(h,random,{...context,previous:offers});if(reroll.length){offers=reroll;h.rerolls--;}}
   for(const offer of offers.slice().sort((a,b)=>score(b)-score(a))){let result=applyReward(h,offer.key);if(result.status==='replace-required'){const old=Object.keys(h.passives).map(k=>({key:k,score:score({key:`passive:${k}`,kind:'passive'})+h.passives[k]})).sort((a,b)=>a.score-b.score)[0];if(score(offer)>old.score)result=applyReward(h,offer.key,{replaceKey:old.key});}if(result.ok)break;}
   const mature=h.skills.every(Boolean)&&plan.parts.every(k=>h.passives[k]>0)&&plan.parts.filter(k=>h.passives[k]>=2).length>=2,complete=mature&&h.awakening===plan.key&&plan.parts.every(k=>h.passives[k]>=2);
   if(mature&&first===null)first=clears;if(complete&&firstComplete===null)firstComplete=clears;
   if(clears===18){if(awakeningAvailable({...h,awakening:null},plan.key))stats.awakeningEligibleBy18++;if(h.awakening)stats.awakeningBy18++;}
  }
  if(first===null)stats.unformed++;else{if(first<=9)stats.matureBy9++;if(first<=18)stats.matureBy18++;stats.matureBy37++;}
  if(firstComplete!==null){if(firstComplete<=18)stats.completeBy18++;if(firstComplete<=32)stats.completeBy32++;stats.completeBy37++;}
  if(h.awakening)stats.awakeningBy37++;
 }
 for(const key of ['matureBy9','matureBy18','matureBy37','completeBy18','completeBy32','completeBy37','awakeningEligibleBy18','awakeningBy18','awakeningBy37'])stats[key]=+(100*stats[key]/seedCount).toFixed(2);
 output.sharedResults.push(stats);
}
fs.mkdirSync('output/pacing',{recursive:true});fs.writeFileSync('output/pacing/reward-distribution.json',JSON.stringify(output,null,2)+'\n');
console.table(output.results.map(({role,policy,matureBy9,matureBy18,matureBy37,completeBy32,unformed,matureMedianClear,remainingFightsMean})=>({role,policy,matureBy9,matureBy18,matureBy37,completeBy32,unformed,matureMedianClear,remainingFightsMean})));
console.table(output.sharedResults);
console.log('Report: output/pacing/reward-distribution.json (structural reward simulation; combat is separate)');
