import fs from 'node:fs';
import {rollEquipment,EQUIPMENT_AFFIXES} from '../src/coop/equipment-data.js';
import {pressurePlan,partyPressure} from '../src/coop/pressure.js';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const roles=['warrior','mage','archer'],rows=[];
// Conditional stock affordability, not a claim players possess the assumed gold.
for(const owned of [['warrior'],['warrior','mage'],roles])for(const gold of [24,43,54,72,100]){
 let matches=0,affordable=0,afterReroll=0;const samples=10000;
 for(let seed=1;seed<=samples;seed++){
  const random=rng(seed*7919),stock=()=>Array.from({length:3},(_,i)=>rollEquipment(roles[Math.floor(random()*3)],random()<.5?'weapon':'armor',5,random,`${seed}-${i}`));
  const offers=stock();if(offers.some(i=>owned.includes(i.role)))matches++;if(offers.some(i=>owned.includes(i.role)&&i.price<=gold))affordable++;
  if(gold>=10&&stock().some(i=>owned.includes(i.role)&&i.price<=gold-10))afterReroll++;
 }
 rows.push({distinctClasses:owned.length,assumedGold:gold,samples,matchingPercent:matches/samples*100,affordablePercent:affordable/samples*100,newStockAffordableAfterPaidRerollPercent:afterReroll/samples*100});
}
let minimumOrdinarySeconds=0;for(let room=1;room<=20;room++)if(room%10)for(const wave of [1,2])minimumOrdinarySeconds+=pressurePlan(room,wave).duration+1.1;
const result={method:'10,000 fixed-seed stock samples per class-coverage / gold combination; no combat, no assumed natural currency income',rows,knownRules:{zeroMatchingChanceByDistinctClasses:[1,2,3].map(n=>({classes:n,probability:((3-n)/3)**3})),affixKeysPerSlot:['weapon','armor'].map(slot=>({slot,keys:Object.keys(EQUIPMENT_AFFIXES).filter(k=>EQUIPMENT_AFFIXES[k].slot===slot),uniqueAffixSetsByRarity:[1,3,3,1]})),minimumOrdinarySeconds,minimumOrdinaryMinutes:minimumOrdinarySeconds/60,bossAndMenusExcluded:true,initialPressure:[1,2,3].map(n=>partyPressure(pressurePlan(1,1),n))}};
fs.mkdirSync('output/deep-test',{recursive:true});fs.writeFileSync('output/deep-test/economy.json',JSON.stringify(result,null,2)+'\n');console.table(rows);console.log('Minimum ordinary-wave time, excluding both bosses and all choices:',result.knownRules.minimumOrdinaryMinutes);
