import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {pressurePlan,partyPressure,createPressureState} from '../src/coop/pressure.js';

class AuditWorld extends World{
 spawnWave(){
  const seed=this.seed,id=this.nextId,events=this.events?.length||0,effects=this.effects?.length||0;super.spawnWave();
  if(!this.auditVariant||this.bossRoom)return;
  // At the wave's creation boundary only, replace the pressure plan and replay
  // its initial spawn from the same RNG state. No live combat or HP is altered.
  this.seed=seed;this.nextId=id;this.events.length=events;this.effects.length=effects;this.enemies=[];this.batchSpawned=0;this.waveSpawned=0;
  this.pressure=this.auditVariant==='baseline'?pressurePlan(this.room,this.wave):partyPressure(pressurePlan(this.room,this.wave),this.heroes.length);
  this.pressureState=createPressureState(this.pressure);this.batchTotal=this.pressure.totalBudget;this.refreshPressure();
 }
}
function priority(h,o){
 if(o.disabled)return -10000;if(o.kind==='active'&&!h.skills[o.slot])return 100;
 if(h.hp/h.maxHp<.6&&['hp','recovery','heal'].includes(o.key))return 95;
 if(o.key==='passive:harvest')return 90;if(o.kind==='core')return 80;if(o.kind==='active')return 70;
 if(['power','haste','range'].includes(o.key))return 60;if(['armor','hp','evasion','pickup'].includes(o.key))return 50;
 if(o.kind==='replacement')return 10;return 20;
}
export function simulateShopParty(role,seed,size=1,{variant='scaled',goal='shop',limit=1200,partner=null,third=null}={}){
 const others=['warrior','mage','archer'].filter(r=>r!==role);if(partner&&others.includes(partner))others.sort((a,b)=>Number(b===partner)-Number(a===partner));const w=variant==='production'?new World(seed):new AuditWorld(seed);w.auditVariant=variant==='production'?null:variant;w.reset([role,others[0]],Math.min(2,size));
 // A three-person comparison explicitly stages one unequipped level-1 AI.
 // One/two-person starts are the production roster. No starter skills or loot.
 if(size===3)w.heroes.push(createHero(third||others[1],2,{ai:true}));
 if(variant!=='production'||size===3){w.seed=seed;w.nextId=10;w.enemies=[];w.effects=[];w.events=[];w.spawnWave();}
 const record={role,partner:size>1?others[0]:null,rosterRoles:w.heroes.map(h=>h.role),seed,size,variant,goal,damageEvents:0,damage:0,downs:0,drops:{xp:0,gold:0,potion:0},collected:{xp:0,gold:0,potion:0},choices:[],waves:[]},drop=w.dropPickup.bind(w),emit=w.emit.bind(w),hurt=w.damageHero.bind(w);
 w.dropPickup=item=>{if(item.type in record.drops)record.drops[item.type]+=item.value||1;return drop(item);};
 w.emit=(type,data={})=>{if(type==='xp'||type==='gold')record.collected[type]+=data.value||1;if(type==='heal')record.collected.potion++;if(type==='down')record.downs++;return emit(type,data);};
 w.damageHero=(h,...args)=>{const before=h.hp;hurt(h,...args);if(h.hp<before){record.damage+=before-h.hp;record.damageEvents++;}};
 let lastClear=0;
 for(let frame=0;frame<limit*60+3000&&w.time<limit&&!['defeat','shop'].includes(w.mode);frame++){
  if(w.clears>lastClear){record.waves.push({clear:w.clears,time:+w.time.toFixed(2),gold:w.gold,level:w.level});lastClear=w.clears;if(goal==='wave')break;}
  if(w.mode==='upgrade'){
   for(let id=0;id<w.humanCount;id++)if(!w.ready[id]){const h=w.heroes[id],offers=w.offers[id],index=offers.reduce((best,o,i)=>priority(h,o)>priority(h,offers[best])?i:best,0);w.choose(id,index);record.choices.push({id,key:offers[index]?.key});w.confirm(id);}
  }else if(w.mode==='complete')w.nextRoom();else w.advance(1/60,w.heroes.slice(0,w.humanCount).map(h=>w.aiInput(h)));
 }
 record.remainingEnemies=w.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,hp:+e.hp.toFixed(1),maxHp:+e.maxHp.toFixed(1),rank:e.rarity,distance:Math.round(Math.hypot(e.x-w.heroes[0].x,e.y-w.heroes[0].y))}));
 const available=w.shop?.offers.filter(o=>w.heroes.some(h=>h.role===o.role))||[],common=available.filter(o=>o.rarity===1);
 return {...record,mode:w.mode,time:+w.time.toFixed(1),level:w.level,clears:w.clears,kills:w.kills,room:w.room,wave:w.wave,alive:w.enemies.filter(e=>e.hp>0).length,hp:w.heroes.map(h=>+h.hp.toFixed(1)),gold:w.gold,damage:Math.round(record.damage),reachedShop:w.mode==='shop',affordOrdinary:w.mode==='shop'&&w.gold>=24,affordOfferedCommon:common.some(i=>i.price<=w.gold),affordAnyOffered:available.some(i=>i.price<=w.gold),affordRecruit:!!w.shop?.recruit&&w.shop.recruit.price<=w.gold,offers:available.map(i=>({role:i.role,rarity:i.rarity,price:i.price})),recruit:w.shop?.recruit?{price:w.shop.recruit.price,rarity:w.shop.recruit.rarity,role:w.shop.recruit.hero.role}:null,builds:w.heroes.map(h=>({role:h.role,skills:h.skills,core:h.core,forms:h.forms,passives:h.passives}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const option=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.split('=')[1]||fallback;
 const seeds=option('seeds','17,41').split(',').map(Number),sizes=option('sizes','1,2,3').split(',').map(Number),roles=option('roles','warrior,mage,archer').split(','),goal=option('goal','shop'),variant=option('variant','scaled'),file=option('out',`output/v07/shop-party-${variant}-${goal}.json`),limit=Number(option('limit',goal==='wave'?'160':'1200'));
 const files=['src/coop/model.js','src/coop/pressure.js','src/coop/ai.js','src/coop/loot.js','src/coop/recruitment.js','tools/simulate-shop-party.mjs'];
 const report={generatedAt:new Date().toISOString(),complete:false,scope:'Seeded input bots choose normal rewards and pick up actual drops. No HP/damage/skills/loot grants. Three-person comparisons stage one plain level-1 AI before the clock starts; solo/duo are real starts. Baseline only substitutes unscaled pressure at wave creation.',hashes:Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),runs:[]};
 fs.mkdirSync('output/v07',{recursive:true});const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2));save();
 for(const size of sizes)for(const role of roles)for(const seed of seeds){const row=simulateShopParty(role,seed,size,{variant,goal,limit,partner:option('partner',null),third:option('third',null)});report.runs.push(row);save();console.log(JSON.stringify({size,role,partner:row.partner,seed,mode:row.mode,clears:row.clears,kills:row.kills,time:row.time,gold:row.gold,affordOrdinary:row.affordOrdinary,affordRecruit:row.affordRecruit}));}
 report.complete=true;report.summary=sizes.map(size=>{const rows=report.runs.filter(r=>r.size===size),shops=rows.filter(r=>r.reachedShop);return{size,runs:rows.length,firstWave:rows.filter(r=>r.clears>0).length,shops:shops.length,ordinary:shops.filter(r=>r.affordOrdinary).length,offeredCommon:shops.filter(r=>r.affordOfferedCommon).length,anyOffered:shops.filter(r=>r.affordAnyOffered).length,recruit:shops.filter(r=>r.affordRecruit).length};});save();console.log(JSON.stringify(report.summary));
}
