import {applyReward,attributePool,rollSkills,skillPool,replacementImpacts,shuffle} from './builds.js';
import {rollEquipment,applyEquipment} from './equipment.js';
import {aiRewardPriority} from './ai-build.js';

export const HERO_ROLES={
 warrior:{name:'战士',hp:200,speed:175,range:145,damage:19,interval:.57,skills:['盾冲','旋风斩'],cd:[3.2,5]},
 mage:{name:'法师',hp:90,speed:170,range:340,damage:13,interval:.76,skills:['火球','冰霜环'],cd:[2.8,5]},
 archer:{name:'弓手',hp:105,speed:188,range:370,damage:12,interval:.5,skills:['贯穿箭','箭雨扇射'],cd:[3,4.5]},
};
export const RECRUIT_RARITIES=[null,
 {name:'普通',hp:0,power:0,skillPower:0,fee:0},
 {name:'精良',hp:12,power:.03,skillPower:.03,fee:8},
 {name:'稀有',hp:24,power:.06,skillPower:.06,fee:20},
 {name:'传奇',hp:40,power:.10,skillPower:.10,fee:40},
];
const NAMES={warrior:['罗恩','赤松','石卫','凯铎','洛瓦','布兰','灰岩','塔恩'],mage:['露弥','艾琳','流星','菲娜','织雾','希露','雪芽','灯枝'],archer:['林雀','莉卡','青羽','艾洛','苔影','米拉','杉叶','秋弦']};
const integer=(value,fallback=1)=>Number.isFinite(value)?Math.max(1,Math.floor(value)):fallback;
const rarityOf=value=>Math.min(4,integer(value));
const pick=(values,rng)=>values[Math.min(values.length-1,Math.floor(rng()*values.length))];

// A factory creates fresh actor state only. A level here is metadata: growth is
// allocated once by rollRecruit, or by the live game's normal reward flow.
export function createHero(role,id,{ai=false,level=1,name,rarity=1}={}){
 const definition=HERO_ROLES[role];if(!definition)throw Error(`Invalid hero role: ${role}`);
 const rank=rarityOf(rarity),bonus=RECRUIT_RARITIES[rank],hp=definition.hp+bonus.hp;
 return {id,role,ai:!!ai,name:name||definition.name,rarity:rank,level:integer(level),x:-140+id*120,y:id===2?110:35,
  hp,maxHp:hp,power:1+bonus.power,speedBonus:1,skillPower:1+bonus.skillPower,rangeBonus:1,haste:1,crit:0,critDamage:1.5,evasion:0,armor:0,cooldown:0,recovery:1,dotPower:1,shieldPower:1,pickupRadius:75,
  evolutionBranches:[null,null],awakening:null,forms:[null,null],resource:0,storedGuard:0,huntStacks:0,huntTarget:null,shadow:null,rerolls:3,guardUntil:0,
  skills:[0,0],evolved:[false,false],passives:{},core:null,runes:[null,null],shield:0,casts:0,swings:0,directHits:0,charged:0,empowered:0,cd:[0,0],dodgeCd:0,attackCd:0,action:null,
  move:{x:0,y:0},lastMove:{x:1,y:0},face:0,stride:0,gait:0,hitFlash:0,visualStop:0,invuln:0,down:false,revive:0,buffer:null,damageDone:0,equipment:{weapon:null,armor:null}};
}

// Item rarity sets its fee independently of the recruit's talent rarity. Every
// item contributes at least its resale price; stripping gear cannot earn gold.
export function recruitPrice(candidate){
 const gear=Object.values(candidate.hero?.equipment||{}),fees=[0,.25,.35,.6,.8];
 return 12+2*integer(candidate.level)+RECRUIT_RARITIES[rarityOf(candidate.rarity)].fee+gear.reduce((sum,item)=>sum+(item?Math.max(item.sellPrice||0,Math.ceil((item.price||0)*fees[rarityOf(item.rarity)])):0),0);
}

function humanLevel(w){
 const humans=(w.heroes||[]).filter(h=>!h.ai);if(!humans.length)return 1;
 return Math.max(1,Math.round(humans.reduce((sum,h)=>sum+integer(h.level,integer(w.level)),0)/humans.length));
}
// Re-check maxed cards too. skillPool normally omits III cards, so lower just
// the card being queried to II in a read-only probe while preserving sources.
function heldPassivesLegal(h){
 return Object.entries(h.passives).every(([key,level])=>skillPool({...h,passives:{...h.passives,[key]:Math.min(level,2)}}).some(o=>o.key===`passive:${key}`));
}
function tryBuild(h,card,rng){
 const key=card.key,isNewPassive=key.startsWith('passive:')&&!h.passives[key.slice(8)];
 const replacements=isNewPassive&&Object.keys(h.passives).length>=4?shuffle(Object.keys(h.passives).filter(old=>!replacementImpacts(h,old).length),rng):[null];
 for(const replaceKey of replacements){
  const probe=structuredClone(h),options=replaceKey?{replaceKey}:{};
  if(!applyReward(probe,key,options).ok||!heldPassivesLegal(probe))continue;
  const result=applyReward(h,key,options);if(result.ok)return replaceKey?{key,replaceKey}:{key};
 }
 return null;
}

export function rollRecruit(w,rng,uid){
 if(typeof rng!=='function'||uid===undefined||uid===null)throw Error('Recruitment requires seeded RNG and uid');
 const role=pick(Object.keys(HERO_ROLES),rng),name=pick(NAMES[role],rng),chance=rng(),rarity=chance<.62?1:chance<.87?2:chance<.97?3:4,level=humanLevel(w);
 const hero=createHero(role,-1,{ai:true,level,name,rarity});hero.x=0;hero.y=0;
 const attributePoints=level-1,buildPoints=Math.floor((level-1)*.65),attributeChoices=[],buildChoices=[];
 for(let step=0;step<attributePoints;step++){
  const choice=pick(attributePool(hero),rng);if(!choice)break;
  if(applyReward(hero,choice.key).ok)attributeChoices.push(choice.key);
 }
 for(let step=0;step<buildPoints;step++){
  const clears=step+1,foundation=hero.skills.some(n=>!n);
  // The first two training points buy the basic buttons; these are not free
  // skills. Remaining points still draw random legal build components.
  const offers=foundation?skillPool(hero,{clears}).filter(o=>o.kind==='active'&&!hero.skills[o.slot]):rollSkills(hero,rng,{clears});let chosen=null;
  for(const card of shuffle(offers.filter(o=>o.kind!=='attribute'),rng).sort((a,b)=>aiRewardPriority(hero,b)-aiRewardPriority(hero,a))){
   chosen=tryBuild(hero,card,rng);if(chosen)break;
  }
  if(chosen){buildChoices.push({...chosen,clears,offers:offers.map(o=>o.key),...(foundation?{offerSource:'base-active-training'}:{})});continue;}
  // Three random offers can all need an unsafe replacement. Draw the remaining
  // legal pool, not an extra attribute, so every allocated build point is spent.
  const legal=shuffle(skillPool(hero,{clears}).filter(o=>!offers.some(old=>old.key===o.key)),rng);
  for(const card of legal){chosen=tryBuild(hero,card,rng);if(chosen)break;}
  if(!chosen)throw Error('Recruit has no legal way to spend its build budget');
  buildChoices.push({...chosen,clears,offers:legal.map(o=>o.key),offerSource:'legal-pool-fallback'});
 }
 // Training happens before equipment, so capped attributes retain every point.
 // These are fresh shop candidates, not active owners: no combat hook is called.
 for(const slot of ['weapon','armor']){
  const item=rollEquipment(role,slot,integer(w.room),rng,`${uid}-${slot}`);
  if(!applyEquipment(hero,item).ok)throw Error('Generated recruit equipment is invalid');
 }
 hero.hp=hero.maxHp;
 const candidate={uid,name,role,rarity,level,hero,buildPoints,attributePoints,buildPointsUsed:buildChoices.length,attributePointsUsed:attributeChoices.length,buildChoices,attributeChoices};
 candidate.price=recruitPrice(candidate);return candidate;
}
