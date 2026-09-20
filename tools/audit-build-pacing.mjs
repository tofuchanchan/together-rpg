import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {applyReward,attributePool,buildMaturity,rollSkills,rollReshape,skillPool,shuffle,replacementImpacts} from '../src/coop/builds.js';
import {ROUTES} from '../src/coop/progression-data.js';
import {AWAKENINGS,awakeningAvailable} from '../src/coop/universal-data.js';
import {createHero,rollRecruit} from '../src/coop/recruitment.js';
import {pressurePlan,partyPressure} from '../src/coop/pressure.js';
import {rareRoll,waveNumber} from '../src/coop/encounters.js';
import {lootRoll,xpRequired} from '../src/coop/loot.js';

// A conditional reward-access audit, not a combat/win-rate simulator. Every
// granted card is offered by the production pool and accepted by applyReward.
const seeds=Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1]||200);
const sharedSeeds=Number(process.argv.find(a=>a.startsWith('--shared-seeds='))?.split('=')[1]||100);
const retentionComparison=process.argv.includes('--preservation-audit');
const outDir=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'output/deep-test';fs.mkdirSync(outDir,{recursive:true});
const randomFor=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const roles=['warrior','mage','archer'],checkpoints=[9,18,19,28,32,37,38,40];
const plans={
 hiveHorn:['boneWhistle','commandWhistle','ember','elementFeed'],
 starMagazine:['needleMagazine','refractLens','stepCircuit'],
 movingMinefield:['mineShoes','scavengeSigil','returnSign'],
 thornFortress:['guard','shieldBrood','bloodAmber','homeGift'],
 starDelivery:['magnetAstrolabe','supplyPack','scavengeSigil'],
 corrosionEngine:['ember','chill','mixedFuse','transferNeedle'],
};
const growths={
 lean:{party:1,killedBudget:.70,pickup:.70},
 standard:{party:2,killedBudget:.80,pickup:.85},
 ceiling:{party:3,killedBudget:1,pickup:1},
};
const schedule=[];let combat=0;
for(let room=1;combat<40;room++)for(let wave=1;wave<=(room%10===0?1:2)&&combat<40;wave++)schedule.push({room,wave,combat:++combat,boss:room%10===0,reward:room!==20});
assert.equal(schedule.filter(e=>e.reward).length,39);assert.equal(schedule.find(e=>e.room===10).combat,19);assert.equal(schedule.find(e=>e.room===20).combat,38);
const percent=(n,d)=>d?+(n/d*100).toFixed(2):null;
const mean=a=>a.length?+(a.reduce((s,n)=>s+n,0)/a.length).toFixed(3):null;
const quantile=(a,p)=>a.length?a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*p)]:null;
const distribution=a=>({n:a.length,p10:quantile(a,.1),median:quantile(a,.5),p90:quantile(a,.9),mean:mean(a)});
const hashes={};for(const path of ['src/coop/build-progression.js','src/coop/progression-data.js','src/coop/builds.js','src/coop/universal-data.js','src/coop/recruitment.js','src/coop/shop.js','src/coop/loot.js','src/coop/pressure.js','src/coop/encounters.js','tools/audit-build-pacing.mjs'])hashes[path]=crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

const growthCache=new Map();
function growthTrace(seed,growth,elite){
 const cacheKey=[seed,growth,elite].join(':');if(growthCache.has(cacheKey))return growthCache.get(cacheKey);
 const rng=randomFor(seed*92821+13),g=growths[growth],trace=[];let xp=0,level=1,gold=0,kills=0;
 for(const e of schedule){
  const challenge=elite&&e.room===15&&e.wave===1,plan=partyPressure(pressurePlan(e.room,e.wave),g.party);
  const budget=challenge?Math.ceil(plan.totalBudget*1.2):plan.totalBudget;
  const count=e.boss?1:Math.round(budget*g.killedBudget);let gained=0;
  for(let index=0;index<count;index++){
   let rarity=rareRoll(rng,waveNumber(e.room,e.wave));if(challenge&&index%5===0)rarity=Math.max(1,rarity);
   for(const drop of lootRoll({rarity,boss:e.boss},rng))if(rng()<g.pickup){if(drop.type==='xp'){xp+=drop.value;gained+=drop.value;}if(drop.type==='gold')gold+=drop.value*(g.party===1?2:1);}
  }
  kills+=count;while(xp>=xpRequired(level)){xp-=xpRequired(level);level++;}
  trace.push({...e,level,xp,gold,kills,gained,challenge});
 }
 growthCache.set(cacheKey,trace);return trace;
}
function invalidHeld(h){return Object.keys(h.passives).filter(key=>!skillPool({...h,passives:{...h.passives,[key]:Math.min(2,h.passives[key])}},{clears:40}).some(o=>o.key===`passive:${key}`));}
function routeAffinity(h,key){const r=ROUTES[key];return(h.core===r.core?3:0)+(r.form&&h.forms[r.slot]===r.form?5:!r.form&&!h.forms[r.slot]?1:0)+h.skills[r.slot]+Math.max(...r.recipes.map(parts=>parts.reduce((n,k)=>n+(h.passives[k]||0)*2,0)));}
function chooseRecipe(h,r){return r.recipes.slice().sort((a,b)=>b.reduce((n,k)=>n+(h.passives[k]||0),0)-a.reduce((n,k)=>n+(h.passives[k]||0),0))[0];}
function score(h,o,policy,target){
 const key=o.key.split(':')[1];
 if(policy==='shared'){
  const parts=plans[target],index=parts.indexOf(key);
  if(o.kind==='awakening')return key===target?100:-30;
  if(o.kind==='active')return h.skills[o.slot]?2:17;
  if(['form','core','evolution'].includes(o.kind))return -8;
  if(index>=0)return (h.passives[key]===1?28:h.passives[key]===2?5:24)-index*.2;
  return o.kind==='attribute'?3:o.kind==='passive'&&h.passives[key]?2:0;
 }
 const r=ROUTES[target],recipe=chooseRecipe(h,r),support=r.support.filter(k=>!recipe.includes(k));
 if(o.kind==='awakening')return 35;
 if(o.kind==='evolution')return o.slot===r.slot?40:25;
 if(o.kind==='core')return key===r.core?19:-12;
 if(o.kind==='form')return o.form===r.form?23:-15;
 if(o.kind==='active')return o.slot===r.slot?(!h.skills[o.slot]?20:18):(!h.skills[o.slot]?17:4);
 if(o.kind==='passive'&&recipe.includes(key))return h.passives[key]===1?27:h.passives[key]===2?5:24;
 if(o.kind==='passive'&&support.includes(key))return h.passives[key]===1?14:h.passives[key]===2?3:11;
 // A missing true source is preferred before its dependent card exists.
 if(o.kind==='passive'&&target==='inferno'&&key==='ember')return 16;
 return o.kind==='attribute'?3:h.passives[key]?4:1;
}
function legalActions(h,offers,policy,target){
 const actions=[];
 for(const offer of offers){
  const k=offer.key.split(':')[1],isNew=offer.kind==='passive'&&!h.passives[k];
  const olds=isNew&&Object.keys(h.passives).length>=4?Object.keys(h.passives):[null];
  for(const old of olds){
   const probe=structuredClone(h),result=applyReward(probe,offer.key,old?{replaceKey:old}:{});if(!result.ok)continue;
   let utility=['random','ai'].includes(policy)?0:score(h,offer,policy,target);
   if(old&&!['random','ai'].includes(policy))utility-=Math.max(0,score({...h,passives:{...h.passives,[old]:0}},{key:`passive:${old}`,kind:'passive'},policy,target))+(h.passives[old]-1)*2+replacementImpacts(h,old).length*30;
   actions.push({offer,old,utility});
  }
 }
 return actions.sort((a,b)=>b.utility-a.utility);
}
function sharedReady(h,key){return h.skills.every(Boolean)&&plans[key].every(p=>h.passives[p])&&plans[key].filter(p=>h.passives[p]>=2).length>=2;}
function snapshot(h){const mature=buildMaturity(h);return {level:h.level,core:h.core,forms:h.forms.slice(),skills:h.skills.slice(),branches:h.evolutionBranches.slice(),awakening:h.awakening,passives:{...h.passives},slots:Object.keys(h.passives).length,passiveRanks:Object.values(h.passives).reduce((a,b)=>a+b,0),mature:mature.map(r=>r.key),complete:mature.filter(r=>r.complete).map(r=>r.key),eligible:Object.keys(AWAKENINGS).filter(k=>awakeningAvailable({...h,awakening:null},k)),disabled:invalidHeld(h)};}
const examples={};
function run(role,seed,policy,target,growth='standard',elite=false,keep=false){
 const h=createHero(role,0),random=randomFor(seed*104729+roles.indexOf(role)*913+17),trace=growthTrace(seed,growth,elite);
 const row={role,seed,policy,target,growth,elite,keep,kept:0,first:{},checkpoints:{},lateBehaviorChoices:0,lateSameMechanismMaxStreak:0,lateSameMechanism:0,replacements:0,lostRanks:0,unaccepted:0,emptyOffers:0,rerolls:0,reshape:null,disabledWaves:0,lateOnlyRankOptions:0,forcedSwapMenus:0,forcedTargetLossMenus:0,forcedMatureDestruction:0,forcedCompleteDestruction:0,forcedSharedDestruction:0,everNewPassives:new Set(),seenCards:new Set(),chosenCards:new Set(),high:[],history:[]};
 let streak=0,everComplete=false;
 for(const e of trace){
  while(h.level<e.level){const options=shuffle(attributePool(h),random).slice(0,3);assert(options.length);const choice=options[Math.floor(random()*options.length)];assert(applyReward(h,choice.key).ok);h.level++;}
  if(policy==='adaptive')target=Object.keys(ROUTES).filter(k=>ROUTES[k].role===role).sort((a,b)=>routeAffinity(h,b)-routeAffinity(h,a))[0];
  const context={clears:e.combat,highReward:e.boss||e.challenge};
  if(e.reward){
   let offers;
   // Human chooses a reshape route before seeing either replacement or high cards.
   if(e.room===10&&policy==='fixed'&&h.core&&h.core!==ROUTES[target].core){offers=rollReshape(h,random,'core');row.reshape='core';}
   else if(e.room===10&&policy==='fixed'&&h.forms[ROUTES[target].slot]&&h.forms[ROUTES[target].slot]!==ROUTES[target].form){offers=rollReshape(h,random,'form');row.reshape='form';}
   else offers=rollSkills(h,random,context);
   const eligible=Object.keys(AWAKENINGS).filter(k=>awakeningAvailable(h,k));
   const availableActions=cards=>{const list=legalActions(h,cards,policy,target);if(keep&&Object.keys(h.passives).length>=4&&!(row.reshape&&e.room===10))list.push({offer:{key:'reward:keep',kind:'keep'},old:null,utility:0});return list.sort((a,b)=>b.utility-a.utility);};
   let actions=availableActions(offers);
   // Shared hunters reserve all three rerolls for an eligible high reward.
   // Class policies can spend two after wave 8 and reserve the last for high.
   while(h.rerolls&&policy!=='random'&&policy!=='ai'&&!(row.reshape&&e.room===10)&&e.combat>8&&(
    policy==='shared'?context.highReward&&eligible.includes(target)&&!offers.some(o=>o.key===`awakening:${target}`):
    (context.highReward&&actions[0]?.utility<25)||(h.rerolls>1&&actions[0]?.utility<8))){
    const next=rollSkills(h,random,{...context,previous:offers});if(!next.length)break;offers=next;actions=availableActions(offers);h.rerolls--;row.rerolls++;
   }
   for(const o of offers)row.seenCards.add(o.key);
   if(context.highReward)row.high.push({combat:e.combat,eligible,offered:offers.filter(o=>o.kind==='awakening').map(o=>o.key.split(':')[1]),reshape:row.reshape&&e.room===10?row.reshape:null});
   if(!offers.length)row.emptyOffers++;
   if(e.combat<=37&&actions.length&&actions.every(a=>a.old)){
    row.forcedSwapMenus++;
    const targetParts=policy==='shared'?plans[target]:policy==='ai'?[]:[...new Set([...chooseRecipe(h,ROUTES[target]),...ROUTES[target].support])];
    if(actions.every(a=>targetParts.includes(a.old)))row.forcedTargetLossMenus++;
    if(!examples.forcedSwap&&e.combat>20)examples.forcedSwap={role,seed,combat:e.combat,policy,target,hero:snapshot(h),offers:offers.map(o=>({key:o.key,detail:o.detail})),history:row.history.slice()};
    const before=buildMaturity(h),after=actions.map(a=>{const probe=structuredClone(h);assert(applyReward(probe,a.offer.key,{replaceKey:a.old}).ok);return {key:a.offer.key,remove:a.old,passives:probe.passives,mature:buildMaturity(probe),shared:policy==='shared'&&sharedReady(probe,target)};});
    const lostMature=before.length&&after.every(a=>!a.mature.some(r=>before.some(b=>b.key===r.key)));
    const lostComplete=before.some(r=>r.complete)&&after.every(a=>!a.mature.some(r=>r.complete&&before.some(b=>b.key===r.key&&b.complete)));
    const lostShared=policy==='shared'&&sharedReady(h,target)&&after.every(a=>!a.shared);
    if(lostMature)row.forcedMatureDestruction++;if(lostComplete)row.forcedCompleteDestruction++;if(lostShared)row.forcedSharedDestruction++;
    for(const [name,match]of Object.entries({forcedMatureDestruction:lostMature,forcedCompleteDestruction:lostComplete,forcedSharedDestruction:lostShared}))if(match&&(!examples[name]||examples[name].remainingRerolls>h.rerolls))examples[name]={role,seed,combat:e.combat,policy,target,remainingRerolls:h.rerolls,hero:snapshot(h),offers:offers.map(o=>({key:o.key,detail:o.detail})),allLegalOutcomes:after,history:row.history.slice()};
   }
   let action;
   if(row.reshape&&e.room===10){const desired=row.reshape==='core'?`reshape:core:${ROUTES[target].core}`:`reshape:form:${ROUTES[target].slot}:${ROUTES[target].form||'base'}`;action=actions.find(a=>a.offer.key===desired)||actions[0];}
   else if(policy==='ai'){
    const chosen=offers.find(o=>o.kind==='active'&&!h.skills[o.slot])||offers[Math.floor(random()*offers.length)];
    action=actions.filter(a=>a.offer.key===chosen?.key).sort((a,b)=>(a.old?h.passives[a.old]:0)-(b.old?h.passives[b.old]:0))[0];
   }else if(policy==='random'){
    const chosen=offers[Math.floor(random()*offers.length)];action=actions.filter(a=>a.offer.key===chosen?.key)[Math.floor(random()*actions.filter(a=>a.offer.key===chosen?.key).length)];
   }else action=actions[0];
   const late=e.combat>=20&&e.combat<=37;
   if(late&&!offers.some(o=>['core','form','evolution','awakening','reshape'].includes(o.kind)||o.kind==='active'&&!h.skills[o.slot]||o.kind==='passive'&&!h.passives[o.key.split(':')[1]]))row.lateOnlyRankOptions++;
   let behavioral=false;
   if(action){
    const {offer,old}=action,key=offer.key.split(':')[1];
    behavioral=['core','form','evolution','awakening','reshape'].includes(offer.kind)||offer.kind==='active'&&!h.skills[offer.slot]||offer.kind==='passive'&&!h.passives[key];
    if(old){row.replacements++;row.lostRanks+=h.passives[old];}
    if(offer.kind==='keep')row.kept++;else assert(applyReward(h,offer.key,old?{replaceKey:old}:{}).ok);assert(Object.keys(h.passives).length<=4);assert(h.skills.every(n=>n>=0&&n<=3));
    row.chosenCards.add(offer.key);if(offer.kind==='passive')row.everNewPassives.add(key);
    row.history.push({combat:e.combat,key:offer.key,replace:old||undefined,offered:offers.map(o=>o.key)});
   }else row.unaccepted++;
   if(late){if(behavioral){row.lateBehaviorChoices++;streak=0;}else{row.lateSameMechanism++;streak++;row.lateSameMechanismMaxStreak=Math.max(row.lateSameMechanismMaxStreak,streak);}}
  }
  const s=snapshot(h),targetMature=policy==='fixed'?s.mature.includes(target):s.mature.length>0,targetComplete=policy==='fixed'?s.complete.includes(target):s.complete.length>0;
  const flags={core:!!h.core,form:h.forms.some(Boolean),activeIII:h.skills.some(n=>n===3),mature:targetMature,evolution:h.evolved.some(Boolean),complete:targetComplete,awakening:!!h.awakening,awakeningEligible:s.eligible.length>0,shared:policy==='shared'&&sharedReady(h,target),sharedEligible:policy==='shared'&&s.eligible.includes(target),sharedComplete:policy==='shared'&&sharedReady(h,target)&&h.awakening===target&&plans[target].every(k=>h.passives[k]>=2)};
  for(const [key,value]of Object.entries(flags))if(value&&!row.first[key])row.first[key]=e.combat;
  everComplete||=targetComplete;if(s.disabled.length)row.disabledWaves++;
  if(checkpoints.includes(e.combat))row.checkpoints[e.combat]={...s,flags,gold:e.gold,xp:e.xp,everComplete};
  if(s.disabled.length&&!examples[policy+'Disabled'])examples[policy+'Disabled']={role,seed,combat:e.combat,disabled:s.disabled,hero:s,history:row.history.slice()};
 }
 row.finalTarget=target;row.everNewPassives=row.everNewPassives.size;row.seenCards=[...row.seenCards];row.chosenCards=[...row.chosenCards];
 return row;
}
function aggregate(rows,label){
 const result={label,runs:rows.length,checkpoints:{},first:{},lateBehaviorChoices:distribution(rows.map(r=>r.lateBehaviorChoices)),lateSameMechanismMaxStreak:distribution(rows.map(r=>r.lateSameMechanismMaxStreak)),replacements:distribution(rows.map(r=>r.replacements)),lostRanks:distribution(rows.map(r=>r.lostRanks)),forcedSwapMenus:distribution(rows.map(r=>r.forcedSwapMenus)),forcedTargetLossMenus:distribution(rows.map(r=>r.forcedTargetLossMenus)),forcedTargetLossRunsPercent:percent(rows.filter(r=>r.forcedTargetLossMenus).length,rows.length),uniquePassiveCardsChosen:distribution(rows.map(r=>r.everNewPassives)),unaccepted:rows.reduce((n,r)=>n+r.unaccepted,0),emptyOffers:rows.reduce((n,r)=>n+r.emptyOffers,0),rerolls:mean(rows.map(r=>r.rerolls)),disabledAtAnyPointPercent:percent(rows.filter(r=>r.disabledWaves).length,rows.length),high:[]};
 for(const c of checkpoints){const states=rows.map(r=>r.checkpoints[c]);result.checkpoints[c]={level:distribution(states.map(s=>s.level)),gold:distribution(states.map(s=>s.gold)),slots:distribution(states.map(s=>s.slots)),passiveRanks:distribution(states.map(s=>s.passiveRanks)),fullSlotsPercent:percent(states.filter(s=>s.slots===4).length,states.length),disabledPercent:percent(states.filter(s=>s.disabled.length).length,states.length),twoEvolutionsPercent:percent(states.filter(s=>s.branches.filter(Boolean).length===2).length,states.length),current:{},ever:{}};for(const key of Object.keys(states[0].flags)){result.checkpoints[c].current[key]=percent(states.filter(s=>s.flags[key]).length,states.length);result.checkpoints[c].ever[key]=percent(rows.filter(r=>r.first[key]&&r.first[key]<=c).length,rows.length);}}
 for(const key of ['core','form','mature','evolution','complete','awakening','shared','sharedEligible','sharedComplete'])result.first[key]=distribution(rows.flatMap(r=>r.first[key]?[r.first[key]]:[]));
 for(const key of ['forcedMatureDestruction','forcedCompleteDestruction','forcedSharedDestruction'])result[key]={events:rows.reduce((n,r)=>n+r[key],0),runsPercent:percent(rows.filter(r=>r[key]).length,rows.length)};
 result.kept=distribution(rows.map(r=>r.kept));
 for(const c of [19,28]){const high=rows.map(r=>r.high.find(h=>h.combat===c)).filter(Boolean);if(high.length)result.high.push({combat:c,rewards:high.length,reshape:high.filter(h=>h.reshape).length,anyEligible:high.filter(h=>h.eligible.length).length,targetEligible:high.filter((h,i)=>h.eligible.includes(rows[i].target)).length,awakeningShown:high.filter(h=>h.offered.length).length,targetShown:high.filter((h,i)=>h.offered.includes(rows[i].target)).length});}
 return result;
}
const data={generatedAt:new Date().toISOString(),hashes,method:{seedsPerClassRoute:seeds,seedsPerRoleGenericPolicy:seeds,seedsPerRolePerUniversalFamily:sharedSeeds,combatWaves:40,normalCombatWaves:38,normalSkillRewards:37,totalSkillRewards:39,normalHighRewardCombats:[19],optionalEliteCombat:28,growths,mainGrowth:'standard',rng:'fixed LCG; independent loot and choice streams, not an exact replay of the live world shared RNG',choices:'Production rollSkills, shuffled three legal XP attributes, applyReward; no free core, shape, evolution, gear, level or recipe. Every new passive goes through valid replacement; fixed class plans may sacrifice Boss10 high reward for reshape.',universalPolicy:'Specific family chosen at run start; all three rerolls reserved for eligible high rewards. Four-slot functional plans use 3 or 4 pieces, not an impossible six-slot definition.',growth:'Killed lifetime budget and pickup fractions are explicit conditional assumptions. Rank probabilities, drop rolls, team-shared XP and thresholds are production. XP level-ups occur before that wave skill reward. No summons or Boss adds counted, no combat outcome is simulated.',limits:['All 40-wave runs assume every encounter is cleared. These are access probabilities, never win rates.','No purchased equipment or recruits are injected into the central comparison; party pressure is fixed by scenario. Shop recruitment is audited separately with observed candidate budgets and prices.','Low-HP healing priorities are excluded; the AI policy matches current full-HP reward selection and lowest-rank replacement only.','Passive rank upgrades may enable a later recipe; a run of rank/stat-only selections does not prove combat is boring.','Eligibility is structural. Damage, event chains, AI execution and real clear difficulty are covered by separate combat audits.']},groups:[],examples,recruitment:[],coverage:{chosenPassives:{},chosenBranches:{},chosenAwakenings:{}}};
data.method.preservationComparison=retentionComparison;if(retentionComparison)data.method.keepPolicy='Paired pre-fix mandatory acceptance versus new independent zero-reward keep action. Keep is preferred to negative-value replacement only after four slots fill; no cards, gold or rerolls are granted. Boss route/reshape stays committed. Both treatments use identical current source and growth assumptions.';
const allRows=[];function group(label,configs,count){const rows=[];for(const config of configs)for(let seed=1;seed<=count;seed++)rows.push(run(config.role,seed,config.policy,config.target,config.growth,config.elite,config.keep));data.groups.push(aggregate(rows,label));allRows.push(...rows);console.log(`${label}: ${rows.length} complete`);return rows;}
if(retentionComparison){
 for(const [route,r]of Object.entries(ROUTES))for(const keep of [false,true])group(`class:${route}:${keep?'keep':'forced'}`,[{role:r.role,policy:'fixed',target:route,keep}],seeds);
 for(const family of Object.keys(plans))for(const keep of [false,true])group(`shared:${family}:${keep?'keep':'forced'}`,roles.map(role=>({role,policy:'shared',target:family,keep})),sharedSeeds);
}else{
for(const [route,r]of Object.entries(ROUTES))group(`class:${route}`,[{role:r.role,policy:'fixed',target:route}],seeds);
for(const role of roles)for(const policy of ['adaptive','ai'])group(`${policy}:${role}`,[{role,policy,target:Object.keys(ROUTES).find(k=>ROUTES[k].role===role)}],seeds);
for(const family of Object.keys(plans))for(const elite of [false,true])group(`shared:${family}:${elite?'elite':'boss-only'}`,roles.map(role=>({role,policy:'shared',target:family,elite})),sharedSeeds);
for(const growth of ['lean','ceiling'])group(`growth:${growth}`,roles.map(role=>({role,policy:'adaptive',target:Object.keys(ROUTES).find(k=>ROUTES[k].role===role),growth})),seeds);
}
for(const row of allRows)for(const key of row.chosenCards){const [kind,value,branch]=key.split(':');const category=kind==='passive'?'chosenPassives':kind==='evolve'?'chosenBranches':kind==='awakening'?'chosenAwakenings':null;if(category)data.coverage[category][branch||value]=(data.coverage[category][branch||value]||0)+1;}
// Candidate quality is sampled at XP-derived levels. No artificial max-level
// recruits: each candidate's owner is a legal, naturally levelled reward trace.
for(const room of retentionComparison?[]:[5,10,15,20]){
 const e=schedule.findLast(e=>e.room===room),candidates=[];
 for(let seed=1;seed<=seeds*3;seed++){
  const g=growthTrace(seed,'standard',false)[e.combat-1],owner=createHero(roles[seed%3],0,{level:g.level});
  const candidate=rollRecruit({heroes:[owner],room},randomFor(seed*44371+room),`audit-${room}-${seed}`),h=candidate.hero;
  assert.equal(candidate.buildPoints,candidate.buildPointsUsed);assert.equal(candidate.attributePoints,candidate.attributePointsUsed);assert.equal(invalidHeld(h).length,0);
  candidates.push({role:candidate.role,rarity:candidate.rarity,level:candidate.level,price:candidate.price,buildPoints:candidate.buildPoints,storedBuildRanks:h.skills.reduce((a,b)=>a+b,0)+Object.values(h.passives).reduce((a,b)=>a+b,0)+(h.core?1:0)+h.forms.filter(Boolean).length+h.evolved.filter(Boolean).length,hasActive:h.skills.some(Boolean),bothActive:h.skills.every(Boolean),core:!!h.core,mature:buildMaturity(h).length>0,evolved:h.evolved.some(Boolean),awake:!!h.awakening,priceWithinGrossGold:candidate.price<=g.gold});
 }
 data.recruitment.push({room,combat:e.combat,samples:candidates.length,level:distribution(candidates.map(c=>c.level)),buildPoints:distribution(candidates.map(c=>c.buildPoints)),storedBuildRanks:distribution(candidates.map(c=>c.storedBuildRanks)),price:distribution(candidates.map(c=>c.price)),noActivePercent:percent(candidates.filter(c=>!c.hasActive).length,candidates.length),bothActivePercent:percent(candidates.filter(c=>c.bothActive).length,candidates.length),corePercent:percent(candidates.filter(c=>c.core).length,candidates.length),maturePercent:percent(candidates.filter(c=>c.mature).length,candidates.length),evolutionPercent:percent(candidates.filter(c=>c.evolved).length,candidates.length),awakeningPercent:percent(candidates.filter(c=>c.awake).length,candidates.length),affordableBeforeAnySpendingPercent:percent(candidates.filter(c=>c.priceWithinGrossGold).length,candidates.length)});
}
data.totalRewardRuns=allRows.length;data.totalCandidateSamples=data.recruitment.reduce((n,r)=>n+r.samples,0);
data.rawRuns=allRows.map(({history,checkpoints,seenCards,chosenCards,...r})=>({...r,normalEnd:checkpoints[38],endlessEnd:checkpoints[40]}));
fs.writeFileSync(`${outDir}/pacing-statistics.json`,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(`${outDir}/pacing-examples.json`,JSON.stringify(examples,null,2)+'\n');
console.table(data.groups.map(g=>({group:g.label,runs:g.runs,mature18:g.checkpoints[18].ever.mature,mature37:g.checkpoints[37].ever.mature,evolution37:g.checkpoints[37].ever.evolution,awake37:g.checkpoints[37].ever.awakening,shared37:g.checkpoints[37].ever.shared,lateNew:g.lateBehaviorChoices.mean,dead37:g.checkpoints[37].disabledPercent})));
console.table(data.recruitment);
console.log(`Wrote ${outDir}/pacing-statistics.json: ${data.totalRewardRuns} conditional runs, ${data.totalCandidateSamples} legal candidates.`);
