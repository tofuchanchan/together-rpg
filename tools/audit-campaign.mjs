// Read-only production simulation. Only inputs and public reward/shop actions are supplied.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {World} from '../src/coop/model.js';
import {buildMaturity} from '../src/coop/builds.js';
import {ROUTES} from '../src/coop/progression-data.js';
import {shopRerollPrice} from '../src/coop/shop.js';
import {voteRoute,claimRouteReward} from '../src/coop/adventure.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
import {replacementImpacts} from '../src/coop/build-progression.js';
import {lessonEligibility} from '../src/coop/shop-lessons.js';

const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)||fallback;
const round=n=>Math.round(n*100)/100;
const median=a=>a.length?[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]:null;
function affinity(h){return Object.entries(ROUTES).filter(([,r])=>r.role===h.role).sort(([,a],[,b])=>routeFit(h,b)-routeFit(h,a))[0]?.[1];}
function routeFit(h,r){return (h.core===r.core?5:0)+(r.form&&h.forms[r.slot]===r.form?6:0)+Math.max(...r.recipes.map(keys=>keys.reduce((n,k)=>n+(h.passives[k]||0),0)));}
export function legacyScore(h,o){
 if(o.disabled)return -10000;
 const key=o.key.split(':')[1]||o.key,r=affinity(h),related=[...r.recipes.flat(),...r.support];
 if(o.key==='route:reward')return 200;
 if(o.key==='reward:keep')return 55;
 if(o.kind==='replacement')return -(h.passives[key]||0)*10-(related.includes(key)?40:0)-(['harvest','guard'].includes(key)?30:0);
 if(o.kind==='active'&&!h.skills[o.slot])return 130;
 if(h.hp/h.maxHp<.65&&['hp','heal','high:hp','passive:harvest','passive:guard'].includes(o.key))return 120;
 if(o.kind==='awakening')return 108;
 if(o.kind==='evolution')return 105;
 if(o.key==='passive:harvest')return h.passives.harvest?64:100;
 if(o.kind==='core')return key===r.core?95:52;
 if(o.kind==='form')return o.form===r.form?89:5;
 if(o.kind==='passive')return (related.includes(key)?84:36)+(h.passives[key]?8:0);
 if(o.kind==='active')return 75;
 return ({power:70,haste:69,skill:65,hp:63,armor:62,evasion:61,crit:60,cooldown:59,pickup:58,range:56,speed:50,recovery:48})[o.key]||20;
}
// Test policy only: commit to the first actually acquired skill, never a seed-specific recipe.
// Reward RNG, offer pools, prices, and companion progression remain production-owned.
export function createCampaignStrategy(name='coherent'){
 const plans=new Map();
 const plan=h=>{
  if(!plans.has(h.id)){
   const owned=h.skills.map((level,slot)=>({level,slot})).filter(s=>s.level>0).sort((a,b)=>b.level-a.level);
   if(owned.length)plans.set(h.id,Object.entries(SKILL_PAIRS).find(([,p])=>p.role===h.role&&p.slots.includes(owned[0].slot))?.[0]);
  }
  const p=SKILL_PAIRS[plans.get(h.id)];
  return p?.slots.some(slot=>h.forms?.[slot]||h.evolved?.[slot])?null:p;
 };
 const passiveValue=(h,key)=>{
  const p=plan(h),level=h.passives[key]||0;
  if(key===p?.component)return 103+(level?4:0);
  if(key==='harvest')return h.hp/h.maxHp<.65?119:94;
  if(key==='guard')return p?.role==='warrior'&&p.slots.includes(0)?95:78;
  const support={fortress:['echo','thorns'],blades:['echo','blood','momentum'],rail:['echo','volley','chill'],storm:['echo','volley','afterimage'],stars:['echo','chain','ember'],elements:['chill','shatter','detonate']}[plans.get(h.id)]||[];
  return (support.includes(key)?78:48)+(level?7:0);
 };
 const removableSkill=(h,pending)=>{
  const p=plan(h),incoming=Number(pending?.split(':')[1]);
  if(!p?.slots.includes(incoming))return -1;
  return (h.loadout||[0,1]).find(slot=>!p.slots.includes(slot)&&h.skills[slot]===1&&!h.forms?.[slot]&&!h.evolved?.[slot]&&!h.skillAdvances?.[slot])??-1;
 };
 const removablePassive=(h,incoming)=>{
  const candidates=Object.keys(h.passives).filter(key=>key!==plan(h)?.component&&h.passives[key]<3&&!replacementImpacts(h,key).length).map(key=>({key,cost:passiveValue(h,key)+(h.passives[key]-1)*12})).sort((a,b)=>a.cost-b.cost);
  return candidates[0]&&passiveValue(h,incoming)-candidates[0].cost>=20?candidates[0].key:null;
 };
 const score=(h,o,{pendingKey=null}={})=>{
  if(name==='legacy')return legacyScore(h,o);
  if(o.disabled)return -10000;
  const [type,key]=o.key.split(':'),p=plan(h);
  if(o.key==='route:reward')return 200;
  if(o.key==='reward:keep')return 25;
  if(type==='replaceSkill')return Number(key)===removableSkill(h,pendingKey)?150:-1000;
  if(type==='replace')return key===removablePassive(h,pendingKey?.split(':')[1])?150:-1000;
  if(o.kind==='active'){
   const slot=o.slot??Number(key),rank=h.skills[slot]||0;
   if(rank)return (p?.slots.includes(slot)?105:70)+(rank===1?4:0);
   if(h.skills.filter(Boolean).length>=2)return removableSkill(h,o.key)>=0?113:-1000;
   return !p?130:p.slots.includes(slot)?135:82;
  }
  if(o.kind==='mastery')return 160;
  if(o.kind==='advance')return 145;
  if(h.hp/h.maxHp<.65&&['hp','heal','high:hp'].includes(o.key))return 128;
  if(o.kind==='passive'){
   const value=passiveValue(h,key);
   if(!h.passives[key]&&Object.keys(h.passives).length>=4&&!removablePassive(h,key))return -1000;
   return value;
  }
  // Forms/evolutions remain useful to existing transformed builds; do not invalidate a pair plan.
  if(o.kind==='form')return p?.slots.includes(o.slot)?8:45;
  if(o.kind==='evolution')return p?.slots.includes(o.slot)?8:112;
  if(o.kind==='awakening')return 125;
  if(o.kind==='core'){
   const preferred={fortress:'bulwark',blades:'whirlwind',rail:'sniper',storm:'ranger',stars:'arcanist',elements:'pyromancer'}[plans.get(h.id)];
   return key===preferred?91:44;
  }
  const score=({power:70,haste:69,skill:68,hp:63,armor:62,evasion:61,crit:60,cooldown:67,pickup:58,range:56,speed:50,recovery:48})[o.key]||20;
  return score;
 };
 return {name,score,plan:h=>plan(h)?plans.get(h.id):h.forms?.some(Boolean)?`legacy:${Object.entries(ROUTES).find(([,r])=>r===affinity(h))?.[0]||'mixed'}`:null};
}
function equipmentUtility(h,item){
 if(!item)return 0;
 const weights={power:180,skillPower:155,haste:200,crit:160,cooldown:200,maxHp:.9,armor:300,speedBonus:100,pickupRadius:.3};
 return item.main.value*(weights[item.main.stat]||1)+item.affixes.reduce((n,a)=>n+({spellWard:12,dodgeLoad:10,piercingEdge:13,capacitor:7,trailSnare:8,panicMagnet:3}[a.key]||0)*a.strength,0);
}
// Gold totals below are reporting aggregates only; purchases always use one wallet.
const totalGold=w=>w.heroes.filter(h=>!h.ai).reduce((n,h)=>n+h.gold,0);
export function visitCampaignShop(w,policy,rec,strategy=createCampaignStrategy('legacy')){
 const s={room:w.room,time:round(w.time),level:w.level,goldIn:totalGold(w),walletsIn:w.heroes.filter(h=>!h.ai).map(h=>h.gold),partyIn:w.heroes.length,stock:w.shop.stalls.flatMap((s,owner)=>s.offers.map(i=>({owner,role:i.role,slot:i.slot,rarity:i.rarity,price:i.price}))),recruits:w.shop.stalls.map((s,owner)=>({owner,role:s.recruits[0].hero.role,level:s.recruits[0].level,rarity:s.recruits[0].rarity,price:s.recruits[0].price,buildPoints:s.recruits[0].buildPoints})),actions:[]};
 s.canEquip=w.shop.stalls.some((s,owner)=>s.offers.some(i=>i.price<=w.heroes[owner].gold));s.canRecruit=w.shop.stalls.some((s,owner)=>s.recruits.some(o=>o.price<=w.heroes[owner].gold));
 for(let owner=0;owner<w.humanCount;owner++){
  const shelf=w.shop.stalls[owner],payer=w.heroes[owner],start=s.actions.length;
  const hire=()=>{const c=shelf.recruits.find(o=>!o.hired&&o.price<=payer.gold);if(!c)return false;if(w.heroes.length>=3||c.hired||c.price>payer.gold)return false;const r=w.recruit(owner,c.uid);if(r.ok)s.actions.push({type:'recruit',owner,role:r.hero.role,price:c.price,id:r.hero.id});return r.ok;};
  const buy=()=>{const picks=[];for(let i=0;i<shelf.offers.length;i++){const item=shelf.offers[i];if(item.sold||item.price>payer.gold)continue;for(const h of w.heroes){if(h.role!==item.role||(!h.ai&&h.id!==owner))continue;const gain=equipmentUtility(h,item)-equipmentUtility(h,h.equipment[item.slot]);if(gain>3)picks.push({index:i,id:h.id,item,gain,score:gain/item.price*(h.ai?.7:1)});}}picks.sort((a,b)=>b.score-a.score);const p=picks[0];if(!p)return false;const r=w.buyEquipment(owner,p.index,p.id,p.item.uid);if(r.ok)s.actions.push({type:'equipment',owner,id:p.id,role:p.item.role,slot:p.item.slot,rarity:p.item.rarity,price:p.item.price});return r.ok;};
  const learn=()=>{
   const picks=[];
   for(const item of shelf.lessons||[])for(const h of w.heroes){
    if(!item||item.sold||item.price>payer.gold||lessonEligibility(w,item,h,owner))continue;
    const value=strategy.score(h,item);if(value<85)continue;
    picks.push({item,h,value,score:value/item.price*(h.ai?.7:1)});
   }
   const p=picks.sort((a,b)=>b.score-a.score)[0];if(!p)return false;
   const price=p.item.price,rankBefore=p.h.skills[Number(p.item.key.split(':')[1])]??null;
   const result=w.buyLesson(owner,p.h.id,p.item.uid);
   if(result.ok)s.actions.push({type:'lesson',owner,id:p.h.id,key:p.item.key,kind:p.item.kind,price,rankBefore,plan:strategy.plan(p.h)});
   return result.ok;
  };
  const purchases=()=>{if(strategy.name!=='legacy')for(let i=0;i<3&&learn();i++);for(let i=0;i<3&&buy();i++);};
  if(policy==='recruit')hire();
  purchases();
  if(policy!=='none')hire();
  if(s.actions.length===start&&payer.gold>=shopRerollPrice(w,owner)+24&&w.rerollShop(owner).ok){s.actions.push({type:'reroll',owner});if(policy==='recruit')hire();purchases();if(policy!=='none')hire();}
 }
 s.goldOut=totalGold(w);s.walletsOut=w.heroes.filter(h=>!h.ai).map(h=>h.gold);s.partyOut=w.heroes.length;rec.shops.push(s);
 for(let i=0;i<w.humanCount;i++)w.leaveShop(i);
}
export function simulateCampaign(roles,seed,{policy='recruit',strategy='coherent',limit=5400,stall=600,observe=null,controller=null,stopAtShop=false,WorldClass=World,resetSeed=null,stopAtRoom=null,routePolicy='safe'}={}){
 const w=new WorldClass(seed);if(resetSeed!==null)w.seed=resetSeed;w.reset(roles,roles.length);
 const selector=createCampaignStrategy(strategy),score=(h,o)=>selector.score(h,o,{pendingKey:w.rewardMenus[h.id]?.pendingKey});
 const rec={roles,seed,policy,strategy,limit,damage:0,damageEvents:0,downs:0,emptySeconds:0,enragedSeconds:0,maxAlive:0,rewardMenus:0,choices:[],shops:[],waves:[],maturity:[],bosses:[],drops:{xp:0,gold:0,potion:0},collected:{xp:0,gold:0,potion:0},anomalies:[]};
 const emit=w.emit.bind(w),hurt=w.damageHero.bind(w),drop=w.dropPickup.bind(w),spawn=w.spawnWave.bind(w);
 w.emit=(type,data={})=>{if(type==='down')rec.downs++;if(['xp','gold'].includes(type))rec.collected[type]+=data.value||1;if(type==='heal')rec.collected.potion++;return emit(type,data);};
 w.damageHero=(h,...args)=>{const hp=h.hp;hurt(h,...args);if(h.hp<hp){rec.damage+=hp-h.hp;rec.damageEvents++;}};
 w.dropPickup=item=>{if(item.type in rec.drops)rec.drops[item.type]+=item.type==='potion'?1:item.value||1;return drop(item);};
 let waveStart={room:1,wave:1,time:0,level:1,kills:0,damage:0,party:roles.length},bossTrack=null,lastClear=0,lastClearTime=0;
 w.spawnWave=()=>{spawn();waveStart={room:w.room,wave:w.wave,time:w.time,level:w.level,kills:w.kills,damage:rec.damage,party:w.heroes.length};if(w.bossRoom){bossTrack={room:w.room,start:w.time,phases:[],actions:[],killed:false};rec.bosses.push(bossTrack);}};
 const observeClear=()=>{if(w.clears===lastClear)return;rec.waves.push({...waveStart,clear:w.clears,seconds:round(w.time-waveStart.time),levelEnd:w.level,kills:w.kills-waveStart.kills,damage:round(rec.damage-waveStart.damage),gold:totalGold(w),hp:w.heroes.map(h=>round(h.hp)),core:w.heroes.map(h=>h.core)});lastClear=w.clears;lastClearTime=w.time;};
 let menus=0;const activity=[];
 for(let frame=0;frame<limit*60+10000;frame++){
  if(frame%60===0&&w.mode==='play'){activity.push({time:round(w.time),kills:w.kills,heroes:w.heroes.map(h=>({id:h.id,x:round(h.x),y:round(h.y),hp:round(h.hp),damage:round(h.damageDone),intent:h.aiIntent,action:h.action?.type||null}))});if(activity.length>31)activity.shift();}
  if(observe&&frame%60===0)observe(w);
  observeClear();
  if(stopAtRoom&&w.room>=stopAtRoom)break;
  if(['defeat','victory'].includes(w.mode))break;
  if(w.time>=limit){rec.anomalies.push('total-timeout');break;}
  if(w.time-lastClearTime>=stall){rec.anomalies.push('wave-stall');rec.stallActivity=activity;break;}
  if(w.mode==='upgrade'){
   if(++menus>2000){rec.anomalies.push('menu-loop');break;}
   rec.rewardMenus++;
   for(let id=0;id<w.humanCount&&w.mode==='upgrade';id++){
    if(w.ready[id])continue;const h=w.heroes[id];let offers=w.rewardChoices?.(id)||w.offers[id];
    if(w.rewardType==='skill'&&!w.rewardMenus[id]&&h.rerolls>0&&w.clears>6&&Math.max(...offers.map(o=>score(h,o)))<65){w.reroll(id);offers=w.rewardChoices?.(id)||w.offers[id];}
    const index=offers.reduce((best,o,i)=>score(h,o)>score(h,offers[best])?i:best,0);
    if(!offers[index]||offers[index].disabled){rec.anomalies.push('no-valid-choice');break;}
    const menu=w.rewardMenus[id],choice={id,clear:w.clears,time:round(w.time),kind:w.rewardType,key:offers[index].key,cardKind:offers[index].kind||'attribute',menu:menu?.type||null,pendingKey:menu?.pendingKey||null,skillsBefore:[...h.skills],plan:selector.plan(h)};
    w.choose(id,index);w.confirm(id);choice.accepted=!w.rewardError;choice.skillsAfter=[...h.skills];rec.choices.push(choice);selector.plan(h);
   }
   for(const h of w.heroes)for(const m of buildMaturity(h))if(!rec.maturity.some(old=>old.id===h.id&&old.route===m.key))rec.maturity.push({id:h.id,role:h.role,route:m.key,clear:w.clears,time:round(w.time),complete:m.complete});
  }else if(w.mode==='shop'){if(stopAtShop)break;visitCampaignShop(w,policy,rec,selector);}
  else if(w.mode==='route'){
   const index=w.routeMenu.options.findIndex(o=>routePolicy==='safe'?o.objective==='clear':o.objective!=='clear');
   for(let id=0;id<w.humanCount&&w.mode==='route';id++)voteRoute(w,id,index);
  }else if(w.mode==='routeReward'){
   for(let id=0;id<w.humanCount&&w.mode==='routeReward';id++){if(w.routeLoot.ready[id])continue;const h=w.heroes[id],choices=w.routeLoot.offers[id],gains=choices.map(item=>equipmentUtility(h,item)-equipmentUtility(h,h.equipment[item.slot]));claimRouteReward(w,id,Math.max(...gains)>0?gains.indexOf(Math.max(...gains)):-1);}
  }else if(w.mode==='complete')w.nextRoom();
  else if(w.mode==='play'){
   menus=0;const alive=w.enemies.filter(e=>e.hp>0).length;rec.maxAlive=Math.max(rec.maxAlive,alive);if(!alive)rec.emptySeconds+=1/60;if(w.enraged)rec.enragedSeconds+=1/60;
   if(bossTrack){const b=w.enemies.find(e=>e.boss&&e.hp>0);if(b){if(!bossTrack.phases.includes(b.phase))bossTrack.phases.push(b.phase);if(b.action?.kind&&!bossTrack.actions.includes(b.action.kind))bossTrack.actions.push(b.action.kind);}else if(!bossTrack.killed){bossTrack.killed=true;bossTrack.killSeconds=round(w.time-bossTrack.start);}}
   w.advance(1/60,w.heroes.slice(0,w.humanCount).map(h=>controller?controller(w,h):w.aiInput(h)));
  }else{rec.anomalies.push(`unexpected-mode:${w.mode}`);break;}
 }
 observeClear();
 return {...rec,mode:w.mode,time:round(w.time),room:w.room,wave:w.wave,clears:w.clears,kills:w.kills,level:w.level,gold:totalGold(w),damage:round(rec.damage),emptySeconds:round(rec.emptySeconds),enragedSeconds:round(rec.enragedSeconds),finalParty:w.heroes.map(h=>({role:h.role,ai:h.ai,level:h.level,hp:round(h.hp),maxHp:round(h.maxHp),damage:round(h.damageDone),core:h.core,forms:h.forms,skills:h.skills,skillAdvances:h.skillAdvances,pairMastery:h.pairMastery,plan:selector.plan(h),passives:h.passives,evolved:h.evolved,awakening:h.awakening,equipment:h.equipment})),remaining:w.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,hp:round(e.hp),maxHp:round(e.maxHp),rarity:e.rarity,phase:e.phase,distance:round(Math.hypot(e.x-w.heroes[0].x,e.y-w.heroes[0].y))})).slice(0,25)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const roles=option('rosters','warrior;mage;archer;warrior,warrior;warrior,mage;warrior,archer;mage,mage;mage,archer;archer,archer').split(';').map(s=>s.split(','));
 const seeds=option('seeds','17,41,83,127,211,307,401,509').split(',').map(Number),policy=option('policy','recruit'),strategy=option('strategy','coherent'),out=option('out',`output/deep-test/campaign-${policy}.json`),limit=+option('limit','5400');
 const files=fs.readdirSync('src/coop').filter(f=>f.endsWith('.js')).sort();
 const hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${f}`)).digest('hex')]));
 const report={date:new Date().toISOString(),method:{seeds,rosters:roles,policy,strategy,limit,dt:1/60,controller:'production AI issues normal human inputs; no HP/XP/drop/spawn changes; visible offers only; no elite challenge; max one paid shop reroll per human; no manual companion replacement',limitations:['Bot strategy is not representative human skill.','Failures before a checkpoint censor later comparisons.','Recruit-vs-build paired strategies diverge RNG after the first shop.']},hashes,results:[]};
 fs.mkdirSync('output/deep-test',{recursive:true});
 for(const roster of roles)for(const seed of seeds){const start=performance.now();const result=simulateCampaign(roster,seed,{policy,strategy,limit});report.results.push(result);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({roles:roster.join('+'),seed,policy,strategy,mode:result.mode,room:result.room,clears:result.clears,level:result.level,shop:result.shops.length,party:result.finalParty.length,seconds:result.time,cpuMs:Math.round(performance.now()-start),anomalies:result.anomalies}));}
 console.table(roles.map(r=>{const rows=report.results.filter(s=>s.roles.join()===r.join());return{roles:r.join('+'),runs:rows.length,shop5:rows.filter(s=>s.shops.some(v=>v.room===5)).length,boss10:rows.filter(s=>s.bosses.some(v=>v.room===10&&v.killed)).length,win:rows.filter(s=>s.mode==='victory').length,medianClear:median(rows.map(s=>s.clears)),medianMin:round(median(rows.map(s=>s.time))/60)};}));
}
