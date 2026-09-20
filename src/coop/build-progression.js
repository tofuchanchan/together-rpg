import {ACTIVE,ATTRIBUTES,CORES,FORMS,PASSIVES,RUNES} from './builds.js';
import {CLASS_COMPONENTS,ROUTES,BRANCHES} from './progression-data.js';
import {UNIVERSAL_PASSIVES,AWAKENINGS,universalAvailable,awakeningAvailable,universalSources} from './universal-data.js';
const SHARED=new Set(['chain','guard','harvest','ember','chill']);
const RARE=new Set(['detonate','storage','afterimage']);
const COMMON=new Set(['ember','chill','guard','harvest','momentum','blood','thorns','focus','arcane']);
export function formInfo(h,slot){const f=FORMS[h.forms?.[slot]];return f?.role===h.role&&f.slot===slot?f:null;}
export function routeFor(h,slot){return Object.entries(ROUTES).find(([,r])=>r.role===h.role&&r.slot===slot&&(r.form?(h.forms?.[slot]===r.form):!h.forms?.[slot]))?.[0]||null;}
export function evolutionStatus(h,slot){
 const route=routeFor(h,slot),r=ROUTES[route];if(!r)return{ready:false,route:null,recipes:[],branches:[]};
 const recipes=r.recipes.map(keys=>({keys,parts:keys.map(key=>({key,title:PASSIVES[key]?.title||key,level:h.passives?.[key]||0})),ready:keys.every(k=>(h.passives?.[k]||0)>0)&&keys.some(k=>(h.passives?.[k]||0)>=2)}));
 return{route,recipes,branches:r.branches,ready:h.skills[slot]>=3&&!h.evolved[slot]&&recipes.some(r=>r.ready)};
}
export function evolutionText(h,slot){const branch=h.evolutionBranches?.[slot];return BRANCHES[branch]?.desc||formInfo(h,slot)?.evolution||ACTIVE[h.role][slot].detail.split('进化：')[1];}
export function skillName(h,slot){const f=formInfo(h,slot),branch=BRANCHES[h.evolutionBranches?.[slot]];return branch?`${f?.title||ACTIVE[h.role][slot].title}·${branch.title}`:f?`${f.title}${h.evolved[slot]?'·进化':''}`:h.evolved[slot]?ACTIVE[h.role][slot].evolved:ACTIVE[h.role][slot].title;}
function sources(h){
 const active=h.skills.some(n=>n>0),p=h.passives||{},forms=h.forms||[];
 const critical=h.crit>0||p.momentum>0;
 const burn=h.core==='pyromancer'||active&&p.ember>0;
 const bleed=critical&&(p.blood>0||h.core==='executioner')||forms.includes('bloodspin');
 const frost=p.chill>0||h.core==='frostweaver'||h.role==='mage'&&h.skills[1]>0||forms.includes('icelance');
 const shield=p.guard>0&&active||forms.includes('aegis')||p.bloodAmber>0||p.supplyPack>0||universalSources(h).shield;
 const marks=h.core==='sniper'||forms.includes('markedshot');
 const shadow=forms.includes('shadowvolley')||p.afterimage>0;
 return{active,critical,burn,bleed,frost,shield,dot:burn||bleed,marks,shadow};
}
function passiveAvailable(h,key){
 if(UNIVERSAL_PASSIVES[key])return universalAvailable(h,key);
 const s=sources(h),p=h.passives||{},definition=CLASS_COMPONENTS[key];
 if(definition&&definition.role!==h.role)return false;
 if(['ember','guard','arcane','echo'].includes(key))return s.active;
 if(key==='blood')return s.critical;
 if(['detonate','emberConsume'].includes(key))return s.burn&&(key!=='emberConsume'||h.skills[0]>0&&!h.forms?.[0]);
 if(key==='shatter')return s.frost;
 if(['storage','guardRelease'].includes(key))return s.shield&&(key!=='guardRelease'||h.skills[1]>0);
 if(key==='afterimage')return h.role==='archer'&&h.skills[1]>0;
 if(key==='volley')return h.role!=='warrior';
 if(key==='rageEdge')return h.skills[1]>0;
 if(['woundCashout','battleRhythm'].includes(key))return s.bleed&&h.skills[1]>0;
 if(key==='iceFragments')return h.forms?.[0]==='icelance';
 if(key==='frostReturn')return p.iceFragments>0;
 if(key==='fieldFocus')return h.forms?.includes('coldfield')||h.evolutionBranches?.includes('frostrail');
 if(key==='markCashout')return s.marks&&h.skills[0]>0;
 if(key==='markTransfer')return s.marks;
 if(key==='weakpoint')return p.markCashout>0;
 if(key==='delayedVolley')return p.volleyCharge>0&&h.skills[1]>0;
 if(key==='shadowReturn')return s.shadow&&h.skills[1]>0;
 return true;
}
export function shuffle(pool,random){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function attributePool(h){const s=sources(h);return ATTRIBUTES.filter(o=>!({speed:h.speedBonus>=1.6,haste:h.haste>=2,crit:h.crit>=.65,evasion:h.evasion>=.35,armor:h.armor>=.4,cooldown:h.cooldown>=.4,range:h.rangeBonus>=1.5,pickup:(h.pickupRadius||75)>=195,dot:!s.dot,shield:!s.shield}[o.key]));}
function recipeText(status){return status.recipes.map(r=>r.parts.map(p=>`${p.title} ${p.level?'I'.repeat(p.level):'缺失'}`).join(' + ')).join(' / ')+'；任一路两件且一件 II';}
export function skillPool(h,context={}){
 const result=[],clears=context.clears??99;
 if(!h.core&&clears>=3)for(const [key,c] of Object.entries(CORES))if(c.role===h.role&&(key!=='bulwark'||h.skills[0]>0)&&(key!=='arcanist'||h.skills.some(Boolean))&&(key!=='executioner'||sources(h).critical))result.push({key:`core:${key}`,kind:'core',quality:'uncommon',category:'class',icon:c.icon,title:`核心 · ${c.title}`,desc:c.desc,detail:'一个核心槽 · 不保证下次给配套'});
 ACTIVE[h.role].forEach((s,slot)=>{
  const level=h.skills[slot],f=formInfo(h,slot),title=f?.title||s.title;
  if(level<3)result.push({key:`active:${slot}`,slot,form:f?.key||null,kind:'active',quality:'common',category:'class',icon:f?.icon||s.icon,title:`${level?'强化':'习得'} · ${title} Lv.${level+1}`,desc:f?.desc||s.detail.split('；')[0],detail:'只提高技能等级 · 形态另选'});
  const evolution=evolutionStatus(h,slot);
  if(evolution.ready)for(const branch of evolution.branches)result.push({key:`evolve:${slot}:${branch}`,slot,branch,form:f?.key||null,kind:'evolution',quality:'rare',category:'class',icon:f?.icon||s.icon,title:`进化 · ${BRANCHES[branch].title}`,desc:BRANCHES[branch].desc,detail:`${title} III；${recipeText(evolution)}；同槽分支互斥`});
  if(level>=1&&!f&&!h.evolved[slot])for(const [key,shape] of Object.entries(FORMS))if(shape.role===h.role&&shape.slot===slot)result.push({key:`form:${slot}:${key}`,slot,form:key,kind:'form',quality:'uncommon',category:'class',icon:shape.icon,title:`形态 · ${shape.title}`,desc:shape.desc,detail:'保持当前等级 · 每个主动选一个形态'});
 });
 const occupied=Object.keys(h.passives||{}).length;
 for(const [key,p] of Object.entries(PASSIVES)){const level=h.passives?.[key]||0;if(level<3&&passiveAvailable(h,key))result.push({key:`passive:${key}`,kind:'passive',quality:p.quality||(COMMON.has(key)?'common':RARE.has(key)?'rare':'uncommon'),category:UNIVERSAL_PASSIVES[key]||SHARED.has(key)?'universal':'class',icon:p.icon,title:`${level?'强化':'被动'} · ${p.title} Lv.${level+1}`,desc:p.desc,detail:`${p.tag} · ${!level&&occupied>=4?'需替换一件已持有被动':`被动 ${occupied}/4`}`});}
 if(context.highReward&&clears>=19&&!h.awakening)for(const [key,a] of Object.entries(AWAKENINGS))if(awakeningAvailable(h,key))result.push({key:`awakening:${key}`,kind:'awakening',quality:'legendary',category:'universal',icon:a.icon,title:`觉醒 · ${a.title}`,desc:a.desc,detail:'一个觉醒槽 · 与其他觉醒互斥'});
 return result;
}
const tiers=['common','uncommon','rare'];
function weighted(pool,h,random){
 if(!pool.length)return null;const related=CORES[h.core]?.tags||[];
 const weights=pool.map(o=>o.kind==='passive'&&related.includes(o.key.split(':')[1])?1.35:1);let cursor=random()*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<pool.length;i++){cursor-=weights[i];if(cursor<0)return pool[i];}return pool.at(-1);
}
function drawQuality(pool,quality,h,random){
 for(let level=tiers.indexOf(quality);level>=0;level--){const available=pool.filter(o=>o.quality===tiers[level]);if(!available.length)continue;const category=random()<.6?'class':'universal',categoryPool=available.filter(o=>o.category===category);return weighted(categoryPool.length?categoryPool:available,h,random);}
 return null;
}
function drawTier(random,clears){const q=random(),common=clears<=8?.75:clears<19?.6:.45,uncommon=clears<=8?.23:clears<19?.32:.4;return q<common?'common':q<common+uncommon?'uncommon':'rare';}
function normalRoll(h,random,context){
 const clears=context.clears??3,pool=skillPool(h,context),selected=[],remaining=()=>pool.filter(o=>!selected.some(s=>s.key===o.key));
 const add=(o,reason)=>{if(o&&!selected.some(s=>s.key===o.key))selected.push({...o,offerReason:reason});};
 const attributes=()=>attributePool(h).map(o=>({...o,kind:'attribute',category:'universal',quality:'common'}));
 if(context.highReward&&clears>=19){
  add(weighted(pool.filter(o=>o.quality==='rare'),h,random),'高阶奖励·稀有位');
  // A rare attribute is an honest numeric fallback when there is no legal rare recipe.
  if(!selected.length)add({key:'high:hp',kind:'attribute',quality:'rare',category:'universal',icon:'heart',title:'高阶补给 · 生命之种',desc:'生命上限 +60，并回复 60',detail:'没有合法稀有组件时提供双份生命成长',highFallback:true},'高阶奖励·无合法稀有时双份补给');
  for(let i=0;i<2;i++){const awake=random()<.2?weighted(remaining().filter(o=>o.kind==='awakening'),h,random):null;add(awake||drawQuality(remaining(),random()<.5?'rare':'uncommon',h,random)||weighted(attributes().filter(o=>!selected.some(s=>s.key===o.key)),h,random),awake?'高阶奖励·觉醒抽中':'高阶奖励·品质抽取');}
 }else{
  const guarantee=clears===1||clears>=4&&(clears-4)%3===0;
  const basics=pool.filter(o=>o.kind==='active'&&!h.skills[o.slot]);
  const general=pool.filter(o=>o.quality==='common'&&(o.kind==='active'||o.kind==='passive'&&!CLASS_COMPONENTS[o.key.split(':')[1]]));
  add(guarantee&&basics.length?weighted(basics,h,random):weighted(general,h,random)||weighted(attributes(),h,random),guarantee&&basics.length?'基础主动保障':'通用位');
  for(let i=0;i<2;i++){const quality=drawTier(random,clears);add(drawQuality(remaining(),quality,h,random)||weighted(attributes().filter(o=>!selected.some(s=>s.key===o.key)),h,random),`品质位·${quality}`);}
 }
 for(const o of shuffle(attributes(),random)){if(selected.length>=3)break;add(o,'合法池不足·属性补给');}
 return selected.slice(0,3);
}
export function rollSkills(h,random,context={}){
 const previous=(context.previous||[]).map(o=>typeof o==='string'?o:o.key);
 const offers=normalRoll(h,random,context);if(!previous.length||offers.some(o=>!previous.includes(o.key)))return offers;
 // Reroll changes a card inside the same slot class/quality, never promotes quality.
 const legal=skillPool(h,context);
 for(let i=offers.length-1;i>=0;i--){const slot=offers[i],pool=legal.filter(o=>!previous.includes(o.key)&&o.quality===slot.quality&&(i>0||o.kind==='active'||o.kind==='passive'&&(context.highReward||!CLASS_COMPONENTS[o.key.split(':')[1]]))&&(slot.offerReason!=='基础主动保障'||o.kind==='active'&&!h.skills[o.slot]));
  const next=weighted(pool,h,random);if(next){offers[i]={...next,offerReason:'重掷·同品质有效替换'};return offers;}}
 return [];
}
export function rollReshape(h,random,type='core'){
 if(h.reshaped)return[];const choices=[];
 if(type==='core')for(const [key,c] of Object.entries(CORES))if(c.role===h.role&&key!==h.core)choices.push({key:`reshape:core:${key}`,kind:'reshape',quality:'uncommon',icon:c.icon,title:`重塑 · ${c.title}`,desc:c.desc,detail:'放弃本次高阶奖励；保持技能等级，清空旧资源及遗留物'});
 if(type==='form')for(let slot=0;slot<2;slot++)if(h.skills[slot]){
  for(const [key,f] of Object.entries(FORMS))if(f.role===h.role&&f.slot===slot&&h.forms?.[slot]!==key)choices.push({key:`reshape:form:${slot}:${key}`,kind:'reshape',slot,quality:'uncommon',icon:f.icon,title:`重塑 · ${f.title}`,desc:f.desc,detail:'保留主动等级，清除该主动进化与旧遗留物'});
  if(h.forms?.[slot])choices.push({key:`reshape:form:${slot}:base`,kind:'reshape',slot,quality:'uncommon',icon:ACTIVE[h.role][slot].icon,title:`重塑 · ${ACTIVE[h.role][slot].title}`,desc:'返回基础主动形态',detail:'保留主动等级，清除该主动进化与旧遗留物'});
 }
 return shuffle(choices,random).slice(0,2);
}
export function replacementImpacts(h,removeKey){const key=String(removeKey||'').replace(/^passive:/,''),probe={...h,passives:{...h.passives}};delete probe.passives[key];return Object.keys(probe.passives).filter(k=>passiveAvailable(h,k)&&!passiveAvailable(probe,k)).map(k=>({key:k,title:PASSIVES[k]?.title||k}));}
function resetBuildResources(h){h.resource=0;h.storedGuard=0;h.shadow=null;h.huntTarget=null;h.huntStacks=0;h.guardUntil=0;h.counterReady=false;h.weakpointUntil=0;h.shadowRefundUntil=0;h.buildBonusEvent=null;h.buildBonus=1;h.fragmentEvents={};h.resourceEvents=new Set();h.casts=0;h.swings=0;}
export function applyReward(h,key,options={}){
 const [kind,value,detail,fourth]=String(key).split(':'),ok=(extra={})=>({ok:true,status:'applied',...extra}),invalid=()=>({ok:false,status:'invalid'});h.passives??={};h.forms??=[null,null];h.evolutionBranches??=[null,null];
 if(kind==='core'){if(!h.core&&CORES[value]?.role===h.role){h.core=value;h.casts=0;h.swings=0;return ok();}return invalid();}
 if(kind==='form'){const slot=+value,definition=FORMS[detail];if(definition?.role===h.role&&definition.slot===slot&&h.skills[slot]>=1&&!h.forms[slot]&&!h.evolved[slot]){h.forms[slot]=detail;return ok();}return invalid();}
 if(kind==='rune'){h.runes??=[null,null];if(h.skills[+value]>=2&&!h.runes[+value]&&RUNES[detail]){h.runes[+value]=detail;return ok();}return invalid();}
 if(kind==='active'){if(![0,1].includes(+value)||h.skills[+value]>=3)return invalid();h.skills[+value]++;return ok();}
 if(kind==='evolve'){const status=evolutionStatus(h,+value),branch=detail||status.branches[0];if(!status.ready||!status.branches.includes(branch))return invalid();h.evolved[+value]=true;h.evolutionBranches[+value]=branch;return ok();}
 if(kind==='awakening'){if(h.awakening||!AWAKENINGS[value]||!awakeningAvailable(h,value))return invalid();h.awakening=value;return ok();}
 if(kind==='reshape'){
  if(h.reshaped)return invalid();
  if(value==='core'&&CORES[detail]?.role===h.role&&detail!==h.core)h.core=detail;
  else if(value==='form'&&h.skills[+detail]&&((fourth==='base'&&h.forms[+detail])||FORMS[fourth]?.role===h.role&&FORMS[fourth]?.slot===+detail&&h.forms[+detail]!==fourth)){h.forms[+detail]=fourth==='base'?null:fourth;h.evolved[+detail]=false;h.evolutionBranches[+detail]=null;}
  else return invalid();h.reshaped=true;resetBuildResources(h);return ok({clearOwnedObjects:true});
 }
 if(kind==='passive'){
  if(!PASSIVES[value]||!passiveAvailable(h,value)||(h.passives[value]||0)>=3)return invalid();
  if(!h.passives[value]&&Object.keys(h.passives).length>=4){const replace=String(options.replaceKey||'').replace(/^passive:/,'');if(!replace)return{ok:false,status:'replace-required',options:Object.keys(h.passives)};if(!h.passives[replace]||replace===value)return invalid();const probe={...h,passives:{...h.passives}};delete probe.passives[replace];if(!passiveAvailable(probe,value))return{ok:false,status:'invalid',reason:'替换后新组件失去来源'};delete h.passives[replace];}
  h.passives[value]=(h.passives[value]||0)+1;return ok();
 }
 if(kind==='high'&&value==='hp'){h.maxHp+=60;h.hp=Math.min(h.maxHp,h.hp+60);return ok();}
 if(!ATTRIBUTES.some(a=>a.key===key)&&key!=='heal')return invalid();
 if(key==='power')h.power=(h.power??1)+.18;
 if(key==='hp'){h.maxHp+=30;h.hp=Math.min(h.maxHp,h.hp+30);}
 if(key==='speed')h.speedBonus=Math.min(1.6,h.speedBonus+.08);
 if(key==='haste')h.haste=Math.min(2,h.haste+.12);
 if(key==='crit')h.crit=Math.min(.65,h.crit+.08);
 if(key==='critDamage')h.critDamage+=.25;
 if(key==='evasion')h.evasion=Math.min(.35,h.evasion+.05);
 if(key==='armor')h.armor=Math.min(.4,h.armor+.05);
 if(key==='skill')h.skillPower=(h.skillPower??1)+.2;
 if(key==='dot')h.dotPower=(h.dotPower??1)+.2;
 if(key==='shield')h.shieldPower=(h.shieldPower??1)+.2;
 if(key==='cooldown')h.cooldown=Math.min(.4,h.cooldown+.08);
 if(key==='range')h.rangeBonus=Math.min(1.5,h.rangeBonus+.1);
 if(key==='pickup')h.pickupRadius=Math.min(195,(h.pickupRadius??75)+20);
 if(key==='recovery'){h.recovery+=.2;h.hp=Math.min(h.maxHp,h.hp+25);}
 if(key==='heal')h.hp=Math.min(h.maxHp,h.hp+55);
 return ok();
}
// Structural readiness is reported separately from live combat validation.
export function buildMaturity(h){
 return Object.entries(ROUTES).filter(([key,r])=>r.role===h.role&&routeFor(h,r.slot)===key&&h.skills[r.slot]>=3&&h.skills[1-r.slot]>0&&r.recipes.some(keys=>keys.every(k=>h.passives[k]>0)&&keys.some(k=>h.passives[k]>=2))).map(([key,r])=>({key,slot:r.slot,evolved:!!h.evolved[r.slot],complete:!!h.evolved[r.slot]&&h.core===r.core&&r.recipes.some(keys=>keys.every(k=>h.passives[k]>=2)&&r.support.some(k=>!keys.includes(k)&&h.passives[k]>=2))}));
}
