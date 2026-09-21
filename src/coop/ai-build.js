import {SKILL_PAIRS} from './skill-pairs.js';
import {ATTRIBUTES,CORES,applyReward,skillPool,buildMaturity} from './builds.js';
import {ROUTES} from './progression-data.js';
import {withEquipmentBase} from './equipment.js';

function related(h){
 const keys=new Set(CORES[h.core]?.tags||[]);
 for(const route of Object.values(ROUTES))if(route.role===h.role&&(h.core===route.core||route.form&&h.forms?.[route.slot]===route.form))for(const key of [...route.recipes.flat(),...route.support])keys.add(key);
 return keys;
}
function usable(h,key){return skillPool({...h,passives:{...h.passives,[key]:Math.min(h.passives[key],2)}}).some(o=>o.key===`passive:${key}`);}
function buildValue(h){const keys=related(h);return Object.entries(h.passives).reduce((n,[key,level])=>n+(usable(h,key)?level*(keys.has(key)?8:5):0),0)+buildMaturity(h).reduce((n,m)=>n+(m.complete?30:15),0);}
export function aiRewardPriority(h,o){
 const key=o.key.split(':')[1],keys=related(h);
 if(o.kind==='active'&&!h.skills[o.slot])return 120+(Object.values(SKILL_PAIRS).some(p=>p.role===h.role&&p.slots.includes(o.slot)&&p.slots.some(s=>s!==o.slot&&h.skills[s]))?20:0);
 if(h.hp/h.maxHp<.55&&['hp','recovery','high:hp','passive:harvest','passive:guard'].includes(o.key))return 115;
 if(o.kind==='mastery')return 108;if(o.kind==='advance')return 100;
 if(o.kind==='awakening')return 105;
 if(o.kind==='evolution')return 100;
 if(o.kind==='core')return 70+(CORES[key]?.tags||[]).reduce((n,p)=>n+(h.passives[p]||0)*8,0);
 if(o.kind==='form')return 55+(Object.values(ROUTES).some(r=>r.role===h.role&&r.core===h.core&&r.form===o.form)?35:0);
 if(o.kind==='passive')return 45+(keys.has(key)?35:0)+(h.passives[key]?10:0);
 if(o.kind==='active')return 68;
 return ({power:55,skill:55,haste:54,hp:53,armor:50,crit:48,cooldown:48,pickup:45,range:45,critDamage:h.crit>0?40:0})[o.key]??35;
}
// Probe real rewards before spending them. Losing a currently working trigger
// source or swapping a coherent full loadout for a weaker card is never automatic.
export function selectAiReward(h,offers){
 const current=Object.keys(h.passives).filter(key=>usable(h,key)),value=buildValue(h),candidates=[];
 for(const offer of offers){
  if(offer.disabled)continue;
  const incoming=offer.key.startsWith('passive:')?offer.key.slice(8):null;
  const replacements=incoming&&!h.passives[incoming]&&Object.keys(h.passives).length>=4?Object.keys(h.passives):[null];
  for(const replaceKey of replacements){
   const probe=structuredClone(h),options=replaceKey?{replaceKey}:{};
   const result=ATTRIBUTES.some(a=>a.key===offer.key)?withEquipmentBase(probe,()=>applyReward(probe,offer.key,options)):applyReward(probe,offer.key,options);
   if(!result.ok||current.some(key=>key!==replaceKey&&!usable(probe,key)))continue;
   const delta=buildValue(probe)-value;
   if(replaceKey&&delta<=0)continue;
   candidates.push({offer,options,score:aiRewardPriority(h,offer)+(replaceKey?Math.min(20,delta):0)});
  }
 }
 return candidates.sort((a,b)=>b.score-a.score)[0]||null;
}
