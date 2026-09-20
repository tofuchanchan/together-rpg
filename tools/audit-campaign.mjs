// Read-only production simulation. Only inputs and public reward/shop actions are supplied.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {World} from '../src/coop/model.js';
import {buildMaturity} from '../src/coop/builds.js';
import {ROUTES} from '../src/coop/progression-data.js';
import {shopRerollPrice} from '../src/coop/shop.js';

const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)||fallback;
const round=n=>Math.round(n*100)/100;
const median=a=>a.length?[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]:null;
function affinity(h){return Object.entries(ROUTES).filter(([,r])=>r.role===h.role).sort(([,a],[,b])=>routeFit(h,b)-routeFit(h,a))[0]?.[1];}
function routeFit(h,r){return (h.core===r.core?5:0)+(r.form&&h.forms[r.slot]===r.form?6:0)+Math.max(...r.recipes.map(keys=>keys.reduce((n,k)=>n+(h.passives[k]||0),0)));}
function score(h,o){
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
function equipmentUtility(h,item){
 if(!item)return 0;
 const weights={power:180,skillPower:155,haste:200,crit:160,cooldown:200,maxHp:.9,armor:300,speedBonus:100,pickupRadius:.3};
 return item.main.value*(weights[item.main.stat]||1)+item.affixes.reduce((n,a)=>n+({spellWard:12,dodgeLoad:10,piercingEdge:13,capacitor:7,trailSnare:8,panicMagnet:3}[a.key]||0)*a.strength,0);
}
function visitShop(w,policy,rec){
 const s={room:w.room,time:round(w.time),level:w.level,goldIn:w.gold,partyIn:w.heroes.length,stock:w.shop.offers.map(i=>({role:i.role,slot:i.slot,rarity:i.rarity,price:i.price})),recruit:{role:w.shop.recruit.hero.role,level:w.shop.recruit.level,rarity:w.shop.recruit.rarity,price:w.shop.recruit.price,buildPoints:w.shop.recruit.buildPoints},actions:[]};
 s.canEquip=w.shop.offers.some(i=>i.price<=w.gold&&w.heroes.some(h=>h.role===i.role));s.canRecruit=w.shop.recruit.price<=w.gold;
 const hire=()=>{const c=w.shop.recruit;if(w.heroes.length>=3||c.hired||c.price>w.gold)return false;const r=w.recruit(0,c.uid);if(r.ok)s.actions.push({type:'recruit',role:r.hero.role,price:c.price,id:r.hero.id});return r.ok;};
 const buy=()=>{const picks=[];for(let i=0;i<w.shop.offers.length;i++){const item=w.shop.offers[i];if(item.sold||item.price>w.gold)continue;for(const h of w.heroes){if(h.role!==item.role)continue;const gain=equipmentUtility(h,item)-equipmentUtility(h,h.equipment[item.slot]);if(gain>3)picks.push({index:i,id:h.id,item,gain,score:gain/item.price*(h.ai?.7:1)});}}picks.sort((a,b)=>b.score-a.score);const p=picks[0];if(!p)return false;const r=w.buyEquipment(0,p.index,p.id,p.item.uid);if(r.ok)s.actions.push({type:'equipment',id:p.id,role:p.item.role,slot:p.item.slot,rarity:p.item.rarity,price:p.item.price});return r.ok;};
 if(policy==='recruit')hire();
 for(let i=0;i<3&&buy();i++);
 if(policy!=='none')hire();
 if(s.actions.length===0&&w.gold>=shopRerollPrice(w)+24&&w.rerollShop(0).ok){s.actions.push({type:'reroll'});if(policy==='recruit')hire();for(let i=0;i<3&&buy();i++);hire();}
 s.goldOut=w.gold;s.partyOut=w.heroes.length;rec.shops.push(s);
 for(let i=0;i<w.humanCount;i++)w.leaveShop(i);
}
export function simulateCampaign(roles,seed,{policy='recruit',limit=5400,stall=600,observe=null,controller=null,stopAtShop=false,WorldClass=World,resetSeed=null,stopAtRoom=null}={}){
 const w=new WorldClass(seed);if(resetSeed!==null)w.seed=resetSeed;w.reset(roles,roles.length);
 const rec={roles,seed,policy,limit,damage:0,damageEvents:0,downs:0,emptySeconds:0,enragedSeconds:0,maxAlive:0,rewardMenus:0,choices:[],shops:[],waves:[],maturity:[],bosses:[],drops:{xp:0,gold:0,potion:0},collected:{xp:0,gold:0,potion:0},anomalies:[]};
 const emit=w.emit.bind(w),hurt=w.damageHero.bind(w),drop=w.dropPickup.bind(w),spawn=w.spawnWave.bind(w);
 w.emit=(type,data={})=>{if(type==='down')rec.downs++;if(['xp','gold'].includes(type))rec.collected[type]+=data.value||1;if(type==='heal')rec.collected.potion++;return emit(type,data);};
 w.damageHero=(h,...args)=>{const hp=h.hp;hurt(h,...args);if(h.hp<hp){rec.damage+=hp-h.hp;rec.damageEvents++;}};
 w.dropPickup=item=>{if(item.type in rec.drops)rec.drops[item.type]+=item.type==='potion'?1:item.value||1;return drop(item);};
 let waveStart={room:1,wave:1,time:0,level:1,kills:0,damage:0,party:roles.length},bossTrack=null,lastClear=0,lastClearTime=0;
 w.spawnWave=()=>{spawn();waveStart={room:w.room,wave:w.wave,time:w.time,level:w.level,kills:w.kills,damage:rec.damage,party:w.heroes.length};if(w.bossRoom){bossTrack={room:w.room,start:w.time,phases:[],actions:[],killed:false};rec.bosses.push(bossTrack);}};
 const observeClear=()=>{if(w.clears===lastClear)return;rec.waves.push({...waveStart,clear:w.clears,seconds:round(w.time-waveStart.time),levelEnd:w.level,kills:w.kills-waveStart.kills,damage:round(rec.damage-waveStart.damage),gold:w.gold,hp:w.heroes.map(h=>round(h.hp)),core:w.heroes.map(h=>h.core)});lastClear=w.clears;lastClearTime=w.time;};
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
    rec.choices.push({id,clear:w.clears,time:round(w.time),kind:w.rewardType,key:offers[index].key,menu:w.rewardMenus[id]?.type||null});w.choose(id,index);w.confirm(id);
   }
   for(const h of w.heroes)for(const m of buildMaturity(h))if(!rec.maturity.some(old=>old.id===h.id&&old.route===m.key))rec.maturity.push({id:h.id,role:h.role,route:m.key,clear:w.clears,time:round(w.time),complete:m.complete});
  }else if(w.mode==='shop'){if(stopAtShop)break;visitShop(w,policy,rec);}
  else if(w.mode==='complete')w.nextRoom();
  else if(w.mode==='play'){
   menus=0;const alive=w.enemies.filter(e=>e.hp>0).length;rec.maxAlive=Math.max(rec.maxAlive,alive);if(!alive)rec.emptySeconds+=1/60;if(w.enraged)rec.enragedSeconds+=1/60;
   if(bossTrack){const b=w.enemies.find(e=>e.boss&&e.hp>0);if(b){if(!bossTrack.phases.includes(b.phase))bossTrack.phases.push(b.phase);if(b.action?.kind&&!bossTrack.actions.includes(b.action.kind))bossTrack.actions.push(b.action.kind);}else if(!bossTrack.killed){bossTrack.killed=true;bossTrack.killSeconds=round(w.time-bossTrack.start);}}
   w.advance(1/60,w.heroes.slice(0,w.humanCount).map(h=>controller?controller(w,h):w.aiInput(h)));
  }else{rec.anomalies.push(`unexpected-mode:${w.mode}`);break;}
 }
 observeClear();
 return {...rec,mode:w.mode,time:round(w.time),room:w.room,wave:w.wave,clears:w.clears,kills:w.kills,level:w.level,gold:w.gold,damage:round(rec.damage),emptySeconds:round(rec.emptySeconds),enragedSeconds:round(rec.enragedSeconds),finalParty:w.heroes.map(h=>({role:h.role,ai:h.ai,level:h.level,hp:round(h.hp),maxHp:round(h.maxHp),damage:round(h.damageDone),core:h.core,forms:h.forms,skills:h.skills,passives:h.passives,evolved:h.evolved,awakening:h.awakening,equipment:h.equipment})),remaining:w.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,hp:round(e.hp),maxHp:round(e.maxHp),rarity:e.rarity,phase:e.phase,distance:round(Math.hypot(e.x-w.heroes[0].x,e.y-w.heroes[0].y))})).slice(0,25)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const roles=option('rosters','warrior;mage;archer;warrior,warrior;warrior,mage;warrior,archer;mage,mage;mage,archer;archer,archer').split(';').map(s=>s.split(','));
 const seeds=option('seeds','17,41,83,127,211,307,401,509').split(',').map(Number),policy=option('policy','recruit'),out=option('out',`output/deep-test/campaign-${policy}.json`),limit=+option('limit','5400');
 const files=fs.readdirSync('src/coop').filter(f=>f.endsWith('.js')).sort();
 const hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${f}`)).digest('hex')]));
 const report={date:new Date().toISOString(),method:{seeds,rosters:roles,policy,limit,dt:1/60,controller:'production AI issues normal human inputs; no HP/XP/drop/spawn changes; visible offers only; no elite challenge; max one paid shop reroll; no manual companion replacement',limitations:['Bot strategy is not representative human skill.','Failures before a checkpoint censor later comparisons.','Recruit-vs-equipment paired strategies diverge RNG after the first shop.']},hashes,results:[]};
 fs.mkdirSync('output/deep-test',{recursive:true});
 for(const roster of roles)for(const seed of seeds){const start=performance.now();const result=simulateCampaign(roster,seed,{policy,limit});report.results.push(result);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({roles:roster.join('+'),seed,policy,mode:result.mode,room:result.room,clears:result.clears,level:result.level,shop:result.shops.length,party:result.finalParty.length,seconds:result.time,cpuMs:Math.round(performance.now()-start),anomalies:result.anomalies}));}
 console.table(roles.map(r=>{const rows=report.results.filter(s=>s.roles.join()===r.join());return{roles:r.join('+'),runs:rows.length,shop5:rows.filter(s=>s.shops.some(v=>v.room===5)).length,boss10:rows.filter(s=>s.bosses.some(v=>v.room===10&&v.killed)).length,win:rows.filter(s=>s.mode==='victory').length,medianClear:median(rows.map(s=>s.clears)),medianMin:round(median(rows.map(s=>s.time))/60)};}));
}
