import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHero} from '../src/coop/recruitment.js';
import {applyReward,rollSkills} from '../src/coop/builds.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
import {masteryActive} from '../src/coop/pair-combat.js';
const out='output/verification/skill-pairs',results={};fs.mkdirSync(out,{recursive:true});
const seeds=200,checkpoints=[9,18,28,37];
// Conditional on reaching every reward. No rerolls, purchases, recruits or fabricated cards.
// Target policy protects one chosen recipe, accepts unrelated legal cards when forced,
// and uses the existing full-passive-slot retention option only when it is available.
for(const [key,pair] of Object.entries(SKILL_PAIRS)){
 const counts=Object.fromEntries(checkpoints.map(n=>[n,{bothAdvanced:0,mastery:0}])),first=[],full=[];
 for(let seed=1;seed<=seeds;seed++){
  let state=seed*17041;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const h=createHero(pair.role,0);let firstAt=0,fullAt=0;
  for(let clears=1;clears<=37;clears++){
   const offers=rollSkills(h,rng,{clears,highReward:clears===19});
   const candidates=offers.map(o=>{
    const options={},[kind,value]=o.key.split(':');let score=0;
    if(kind==='active'){
     const slot=+value;score=pair.slots.includes(slot)?80-(h.skills[slot]||0)*5:-40;
     if(!h.skills[slot]&&h.skills.filter(Boolean).length===2){const old=h.loadout.find(s=>!pair.slots.includes(s));options.replaceSkill=old??[...h.loadout].sort((a,b)=>h.skills[a]-h.skills[b])[0];if(old===undefined)score=-45;}
    }else if(kind==='advance')score=110;
    else if(kind==='mastery')score=value===key?150:-50;
    else if(kind==='passive'){
     score=value===pair.component?90:2;
     if(!h.passives[value]&&Object.keys(h.passives).length===4){const old=Object.keys(h.passives).find(k=>k!==pair.component);if(old)options.replaceKey=old;else score=-1000;}
    }else if(['form','evolve','reshape'].includes(kind))score=-100;
    else if(kind==='core')score=1;
    else score=3;
    return {o,options,score};
   }).sort((a,b)=>b.score-a.score);
   if(!(Object.keys(h.passives).length>=4&&candidates[0].score<5)){
    let accepted=false;for(const c of candidates){if(c.score<=-1000)continue;if(applyReward(h,c.o.key,c.options).ok){accepted=true;break;}}
    assert.ok(accepted,'A forced reward must select an actual legal offered card');
   }
   const advanced=pair.slots.every(s=>h.skillAdvances[s]);if(advanced&&!firstAt){firstAt=clears;first.push(clears);}
   if(masteryActive(h,key)&&!fullAt){fullAt=clears;full.push(clears);}
   if(counts[clears]){counts[clears].bothAdvanced+=Number(advanced);counts[clears].mastery+=Number(masteryActive(h,key));}
  }
 }
 const median=a=>a.length?a.sort((a,b)=>a-b)[Math.floor(a.length/2)]:null;
 results[key]={seeds,checkpoints:counts,bothAdvancedMedianAmongSuccess:median(first),masteryMedianAmongSuccess:median(full)};
}
const report={limits:'Reward accessibility conditional on survival; target-aware policy, no rerolls. Not natural win rates or DPS balance.',results};
fs.writeFileSync(out+'/pacing.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
