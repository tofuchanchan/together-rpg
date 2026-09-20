// Equal-budget, seeded encounter fixtures. This measures conditional kit strength,
// not natural card availability, a full run, or a human playtest. No source edits.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {CORES,skillPool,attributePool,applyReward} from '../src/coop/builds.js';
import {BRANCHES} from '../src/coop/progression-data.js';
import {rollEquipment,applyEquipment} from '../src/coop/equipment.js';

const OUT='output/deep-test';fs.mkdirSync(OUT,{recursive:true});
const seeds=[17,41,83,127,211,307];
const selected=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];
const smoke=process.argv.includes('--smoke');
const R=(n)=>Math.round(n*1000)/1000;
const mean=a=>R(a.reduce((s,v)=>s+v,0)/Math.max(1,a.length));
const inc=(o,k,n=1)=>{o[k]=(o[k]||0)+n;};
const attributes=['crit','hp','power','skill','armor','haste','hp','skill','power','cooldown','armor','haste','crit','hp'];
const plans=[
 {core:'bulwark',role:'warrior',name:'盾阵反击',slot:0,forms:[[0,'aegis']],parts:['guard','storage','guardRelease','thorns'],early:'storage',branches:['bastion','breach']},
 {core:'berserker',role:'warrior',name:'血刃旋风',slot:1,forms:[[1,'bloodspin']],parts:['rageEdge','battleRhythm','harvest','woundCashout'],early:'harvest',branches:['roving','anchored']},
 {core:'whirlwind',role:'warrior',name:'环斩普攻',slot:1,forms:[],parts:['blood','chain','harvest','momentum'],early:'chain',branches:[]},
 {core:'pyromancer',role:'mage',name:'余烬炎爆',slot:0,forms:[],parts:['ember','emberConsume','detonate','echo'],early:'echo',branches:['wildfire','molten']},
 {core:'frostweaver',role:'mage',name:'冰枪碎裂',slot:0,forms:[[0,'icelance'],[1,'coldfield']],parts:['chill','iceFragments','frostReturn','fieldFocus'],early:'iceFragments',branches:['crystal','frostrail']},
 {core:'arcanist',role:'mage',name:'奥术连施',slot:0,forms:[],parts:['arcane','echo','chain','volley'],early:'echo',branches:[]},
 {core:'sniper',role:'archer',name:'猎印狙击',slot:0,forms:[[0,'markedshot']],parts:['markCashout','markTransfer','weakpoint','focus'],early:'focus',branches:['execution','pursuit']},
 {core:'ranger',role:'archer',name:'影身齐射',slot:1,forms:[[1,'shadowvolley']],parts:['afterimage','volleyCharge','delayedVolley','shadowReturn'],early:'volleyCharge',branches:['garrison','skirmish']},
 {core:'executioner',role:'archer',name:'暴击血猎',slot:0,forms:[],parts:['blood','harvest','focus','momentum'],early:'harvest',branches:[]},
];
assert.deepEqual(new Set(plans.map(p=>p.core)),new Set(Object.keys(CORES)),'Every actual class core is covered');
const context={clears:37,highReward:true};
function grant(h,key,history){assert.ok(skillPool(h,context).some(o=>o.key===key),`${h.role} illegal ${key} after ${history.join(',')}`);assert.equal(applyReward(h,key).ok,true);history.push(key);assert.ok(Object.keys(h.passives).length<=4);}
function stage(h,plan,phase,branch){
 const attributeHistory=attributes.slice(0,phase==='mid'?6:14),history=[];
 for(const key of attributeHistory){assert.ok(attributePool(h).some(o=>o.key===key));assert.equal(applyReward(h,key).ok,true);}
 h.level=attributeHistory.length+1;
 for(const key of ['active:0','active:1',`core:${plan.core}`,...plan.forms.map(([s,f])=>`form:${s}:${f}`)])grant(h,key,history);
 const primary=plan.parts[0];grant(h,`passive:${primary}`,history);grant(h,`passive:${primary}`,history);
 if(history.length<8)grant(h,`passive:${plan.early}`,history);
 for(const slot of [plan.slot,1-plan.slot])if(history.length<8)grant(h,`active:${slot}`,history);
 assert.equal(history.length,8);assert.ok(!h.evolved.some(Boolean));
 if(phase==='late'){
  for(const p of plan.parts)if(!h.passives[p])grant(h,`passive:${p}`,history);
  while(h.skills[plan.slot]<3)grant(h,`active:${plan.slot}`,history);
  if(branch)grant(h,`evolve:${plan.slot}:${branch}`,history);
  while(h.skills[1-plan.slot]<3)grant(h,`active:${1-plan.slot}`,history);
  while(history.length<18){const p=plan.parts.find(k=>(h.passives[k]||0)<Math.min(3,Math.min(...plan.parts.map(k=>h.passives[k]))+1));assert.ok(p);grant(h,`passive:${p}`,history);}
  assert.equal(history.length,18);assert.ok(plan.parts.some(k=>h.passives[k]<3),'Not a fully maxed build');
 }
 return {core:plan.core,name:plan.name,branch,phase,cards:history.length,history,attributeHistory,level:h.level,skills:[...h.skills],forms:[...h.forms],passives:{...h.passives},stats:Object.fromEntries(['maxHp','power','skillPower','haste','crit','armor','cooldown','speedBonus','rangeBonus'].map(k=>[k,h[k]]))};
}
function instrument(w){
 const h=w.heroes[0],m={hpLost:0,absorbed:0,heal:0,casts:0,dodges:0,buildBursts:0,sourceCalls:{},visuals:{},projectileVisuals:{},universalKinds:{},equipmentKinds:{},bossSkills:{},bossPhases:[],peakPets:0,peakObjects:0,peakEquipment:0,peakPickups:0,peakResource:0,peakAmmo:0,ammoReleased:0,mineMigrations:0,enemiesCreated:0,slowEnemySeconds:0,frozenEnemySeconds:0,brittleEnemySeconds:0,attackRangeSeconds:0,nearTargetDistance:0,distanceSamples:0,maxDepth:0};
 const damage=w.damageHero.bind(w),hit=w.damageEnemy.bind(w),emit=w.emit.bind(w),shoot=w.shoot.bind(w),create=w.createEnemy.bind(w),projectiles=[],seen=new WeakSet(),damageFrames=[],positions=new Map();let lastAmmo=0;
 w.damageHero=(who,...args)=>{damageFrames.push({who,hp:who.hp,shield:who.shield});try{return damage(who,...args);}finally{damageFrames.pop();}};
 w.createEnemy=(...args)=>{m.enemiesCreated++;return create(...args);};
 w.damageEnemy=(e,n,owner,knock,source='attack',crit,dir,ctx={})=>{if(owner===h&&e.hp>0){inc(m.sourceCalls,source);m.maxDepth=Math.max(m.maxDepth,ctx.depth||0);}return hit(e,n,owner,knock,source,crit,dir,ctx);};
 w.emit=(type,data={})=>{if(data.id===h.id){if(type==='hurt'){const before=damageFrames.at(-1);if(before?.who===h){m.hpLost+=Math.max(0,before.hp-h.hp);m.absorbed+=Math.max(0,before.shield-h.shield);}}if(type==='skill')m.casts++;if(type==='dodge')m.dodges++;if(type==='buildBurst')m.buildBursts++;}if(type==='bossSkill')inc(m.bossSkills,data.skill);if(type==='bossPhase')m.bossPhases.push(data.phase);return emit(type,data);};
 w.shoot=(...args)=>{const p=shoot(...args);projectiles.push(p);return p;};
 const scan=dt=>{
  for(const e of w.effects)if(!seen.has(e)){seen.add(e);if(e.type==='build'||e.type==='universal'||e.type==='equipment')inc(m.visuals,`${e.type}:${e.variant||e.kind||e.type}`);}
  for(const p of projectiles.splice(0))if(p.owner===h.id)inc(m.projectileVisuals,p.visual||p.type);
  for(const [list,key]of [[w.pets,'universalKinds'],[w.universalObjects,'universalKinds'],[w.equipmentObjects,'equipmentKinds']])for(const o of list||[])if(!seen.has(o)){seen.add(o);inc(m[key],o.kind||o.type);}
  for(const o of w.universalObjects.filter(o=>['mine','sigil'].includes(o.kind))){const old=positions.get(o.id);if(old&&Math.hypot(o.x-old.x,o.y-old.y)>1)m.mineMigrations++;positions.set(o.id,{x:o.x,y:o.y});}
  const ammo=h.universal?.ammo||0;m.peakAmmo=Math.max(m.peakAmmo,ammo);if(ammo<lastAmmo)m.ammoReleased+=lastAmmo-ammo;lastAmmo=ammo;
  m.peakPets=Math.max(m.peakPets,(w.pets||[]).filter(p=>p.owner===h.id).length);m.peakObjects=Math.max(m.peakObjects,w.universalObjects.length);m.peakEquipment=Math.max(m.peakEquipment,w.equipmentObjects.length);m.peakPickups=Math.max(m.peakPickups,w.pickups.length);m.peakResource=Math.max(m.peakResource,h.resource||0,h.storedGuard||0);
  let nearest=Infinity;for(const e of w.enemies)if(e.hp>0){nearest=Math.min(nearest,Math.hypot(e.x-h.x,e.y-h.y));if(e.slow>0)m.slowEnemySeconds+=dt;if(e.freeze>0)m.frozenEnemySeconds+=dt;if(e.brittle>0)m.brittleEnemySeconds+=dt;}
  if(Number.isFinite(nearest)){m.nearTargetDistance+=nearest;m.distanceSamples++;if(nearest<({warrior:145,mage:340,archer:370}[h.role])*h.rangeBonus)m.attackRangeSeconds+=dt;}
 };
 return {m,scan};
}
function benchInput(w,h){
 const ready=!h.action||h.action.type==='attack',target=w.enemies[0],slot=(h.forms[1]==='bloodspin'||h.forms[1]==='shadowvolley')?1:0;
 let first=ready&&h.cd[slot]<=0,second=ready&&h.cd[1-slot]<=0;
 if(slot===0&&h.passives.markCashout)first&&=h.huntStacks>=3;
 if(slot===0&&h.passives.iceFragments)first&&=(target.chillBy?.[h.id]?.brittleUntil>w.time||(target.chillBy?.[h.id]?.stacks||0)>=2);
 if(slot===1&&h.passives.rageEdge)first&&=h.resource>=30;
 const shadow=h.forms[1]==='shadowvolley'||h.passives.afterimage;
 const dodge=ready&&h.dodgeCd<=0&&(shadow?!h.shadow||h.shadow.life<=0:!!h.passives.momentum||!!h.awakening||!!h.equipment?.weapon?.affixes?.length);
 return {x:dodge?0:0,y:dodge?1:0,dodge,skill1:!dodge&&(slot===0?first:!first&&second),skill2:!dodge&&(slot===1?first:!first&&second)};
}
function setupScene(w,phase,scene){
 w.enemies=[];w.projectiles=[];w.hazards=[];w.effects=[];w.pickups=[];w.spawnQueue=[];w.pressure=null;w.pressureState=null;w.waveDuration=Infinity;w.enrageAt=Infinity;w.waveElapsed=0;w.kills=0;w.xp=0;w.xpNext=Infinity;w.level=w.heroes[0].level;w.room=phase==='mid'?5:10;w.wave=1;w.bossRoom=false;
 const h=w.heroes[0];h.x=0;h.y=0;
 if(scene==='bench'){
  w.obstacles=[];const e=w.createEnemy('goblin',110,0);e.hp=e.maxHp=1e7;e.stats={...e.stats,speed:0,range:0,contactDamage:0};e.cd=1e7;w.enemies=[e];return{limit:30,batches:[],initial:1,dummy:e};
 }
 if(scene==='boss'){
  // Production room-10 boss with all normal phases, warnings, damage and summons.
  w.room=10;w.spawnWave();w.waveDuration=Infinity;w.enrageAt=150;h.y=145;return{limit:90,batches:[],initial:1,boss:w.enemies[0]};
 }
 const batches=[],kinds=scene==='crowd'?['seedling','dustling','seedling','gnat','dustling','goblin','seedling','slime','dustling']:['wolf','beetle','skeleton','spider','mushroom','wisp'];
 const count=scene==='crowd'?54:6;
 for(let i=0;i<count;i++){const angle=w.random()*Math.PI*2,r=260+w.random()*150;const kind=scene==='crowd'&&i===45?'shaman':kinds[i%kinds.length];const e=w.createEnemy(kind,Math.cos(angle)*r,Math.sin(angle)*r,scene==='elite'?(i%3===0?2:1):0);batches.push({at:scene==='crowd'?Math.floor(i/18)*10:0,e});}
 return {limit:scene==='crowd'?60:60,batches,initial:count};
}
function simulate(plan,phase,branch,scene,seed,combo=null){
 const w=new World(seed);w.reset([plan.role],1);const h=w.heroes[0],loadout=combo?stageCombo(h,combo):stage(h,plan,phase,branch),fixture=setupScene(w,phase,scene),{m,scan}=instrument(w);
 let pending=fixture.batches.length,noTravel=0,longestNoTravel=0;const initialHp=h.hp;
 for(let frame=0;frame<fixture.limit*60&&w.mode==='play'&&!h.down;frame++){
  for(const b of fixture.batches)if(!b.spawned&&b.at<=w.time){b.spawned=true;pending--;w.enemies.push(b.e);}
  if(fixture.dummy){fixture.dummy.x=110;fixture.dummy.y=0;fixture.dummy.knock={x:0,y:0};if(!h.action||h.action.type==='attack'){h.x=0;h.y=0;}}
  w.advance(1/60,[fixture.dummy?benchInput(w,h):w.aiInput(h)]);scan(1/60);
  if(!fixture.dummy&&w.enemies.length&&!h.action&&!['attack','guard'].includes(h.aiIntent)&&Math.hypot(h.vx||0,h.vy||0)<1){noTravel+=1/60;longestNoTravel=Math.max(longestNoTravel,noTravel);}else noTravel=0;
  assert.ok(Number.isFinite(h.hp)&&Number.isFinite(h.damageDone)&&h.hp>=0&&h.hp<=h.maxHp+1e-6,'Finite bounded HP and damage');assert.ok(m.peakPets<=3&&m.peakEquipment<=12&&m.maxDepth<=2,'Owner and causal caps');
  if(!fixture.dummy&&!w.enemies.length&&pending===0)break;
 }
 m.heal=Math.max(0,h.hp-initialHp+m.hpLost);m.nearTargetDistance=m.distanceSamples?m.nearTargetDistance/m.distanceSamples:0;
 const result={id:combo?combo.key:`${phase}-${plan.core}${branch?'-'+branch:''}`,name:combo?combo.name:plan.name+(branch?'·'+BRANCHES[branch].title:''),role:plan.role,phase,branch,scene,seed,loadout,seconds:R(w.time),damage:R(h.damageDone),dps:R(h.damageDone/Math.max(w.time,.01)),hp:R(h.hp),hpPct:R(h.hp/h.maxHp),survived:!h.down,kills:w.kills,clear:!fixture.dummy&&w.enemies.length===0&&pending===0,bossDamage:fixture.boss?R(fixture.boss.maxHp-fixture.boss.hp):null,bossHp:fixture.boss?R(fixture.boss.hp):null,bossKilled:fixture.boss?fixture.boss.hp<=0:null,scheduledEnemies:fixture.initial,spawned:fixture.initial+m.enemiesCreated,metrics:Object.fromEntries(Object.entries(m).map(([k,v])=>[k,typeof v==='number'?R(v):v])),gold:w.gold,xp:R(w.xp),ending:{x:R(h.x),y:R(h.y),intent:h.aiIntent,longestNoTravel:R(longestNoTravel),remaining:w.enemies.filter(e=>e.hp>0).map(e=>({kind:e.kind,hp:R(e.hp),maxHp:e.maxHp,x:R(e.x),y:R(e.y)}))}};
 return result;
}
const combos=[
 {key:'pets',name:'宠物集火／元素转染',role:'mage',core:'pyromancer',parts:['boneWhistle','commandWhistle','elementFeed','paperCrow'],gear:['capacitor','spellWard'],awakening:'hiveHorn'},
 {key:'magazine',name:'飞针折射／闪步装填',role:'archer',core:'ranger',parts:['needleMagazine','refractLens','stepCircuit','duetMeter'],gear:['dodgeLoad','trailSnare'],awakening:'starMagazine'},
 {key:'mines',name:'移动雷场／折返迟滞',role:'warrior',core:'whirlwind',parts:['mineShoes','returnSign','kineticWheel','stepCircuit'],gear:['piercingEdge','trailSnare'],awakening:'movingMinefield'},
 {key:'fortress',name:'施法盾／碎盾荆种',role:'warrior',core:'bulwark',parts:['guard','shieldBrood','bloodAmber','healingWave'],gear:['capacitor','spellWard'],awakening:'thornFortress'},
 {key:'delivery',name:'经验拾取／星带补给',role:'archer',core:'executioner',parts:['magnetAstrolabe','supplyPack','scavengeSigil','needleMagazine'],gear:['piercingEdge','panicMagnet'],awakening:'starDelivery'},
 {key:'corrosion',name:'火寒异常／单体裂解',role:'mage',core:'pyromancer',parts:['ember','mixedFuse','transferNeedle','echoPosts'],gear:['dodgeLoad','spellWard'],awakening:'corrosionEngine'},
];
function stageCombo(h,c){
 const history=[];for(const key of attributes){assert.ok(attributePool(h).some(o=>o.key===key));applyReward(h,key);}h.level=15;
 for(const key of ['active:0','active:1',`core:${c.core}`])grant(h,key,history);
 // Healing Wave needs real healing; fortress uses harvest instead of an orphan card.
 const parts=c.key==='fortress'?['guard','shieldBrood','bloodAmber','homeGift']:c.parts;
 for(const p of parts)for(let rank=0;rank<2;rank++)grant(h,`passive:${p}`,history);
 for(const s of [0,1])while(h.skills[s]<3)grant(h,`active:${s}`,history);
 // Six awakening versus pre-awakening matched pairs use identical 15-card bases.
 if(c.awakened)grant(h,`awakening:${c.awakening}`,history);
 let rollSeed=71;const rng=()=>{rollSeed=(Math.imul(rollSeed,1664525)+1013904223)>>>0;return rollSeed/4294967296;};
 for(const [i,slot] of ['weapon','armor'].entries()){
  let item;for(let n=0;n<1000;n++){item=rollEquipment(h.role,slot,10,rng,slot);if(item.rarity===2&&item.affixes[0].key===c.gear[i])break;}
  assert.equal(item.rarity,2);assert.equal(item.affixes[0].key,c.gear[i]);if(c.gearOff)item={...item,affixes:[]};assert.equal(applyEquipment(h,item).ok,true);
 }
 return {phase:'late',cards:history.length,history,attributeHistory:attributes,level:h.level,skills:[...h.skills],passives:{...h.passives},equipment:structuredClone(h.equipment),awakening:h.awakening};
}
function aggregate(rows){return Object.values(Object.groupBy(rows,r=>`${r.id}/${r.scene}`)).map(rs=>({id:rs[0].id,name:rs[0].name,role:rs[0].role,phase:rs[0].phase,scene:rs[0].scene,n:rs.length,clear:rs.filter(r=>r.clear).length,survive:rs.filter(r=>r.survived).length,seconds:mean(rs.map(r=>r.seconds)),dps:mean(rs.map(r=>r.dps)),kills:mean(rs.map(r=>r.kills)),hpLost:mean(rs.map(r=>r.metrics.hpLost)),absorbed:mean(rs.map(r=>r.metrics.absorbed)),hpPct:mean(rs.map(r=>r.hpPct)),bossDamage:mean(rs.map(r=>r.bossDamage||0)),slow:mean(rs.map(r=>r.metrics.slowEnemySeconds)),freeze:mean(rs.map(r=>r.metrics.frozenEnemySeconds)),brittle:mean(rs.map(r=>r.metrics.brittleEnemySeconds)),distance:mean(rs.map(r=>r.metrics.nearTargetDistance)),inRange:mean(rs.map(r=>r.metrics.attackRangeSeconds/r.seconds)),casts:mean(rs.map(r=>r.metrics.casts)),bursts:mean(rs.map(r=>r.metrics.buildBursts))}));}
const classRows=[],comboRows=[],usedSeeds=smoke?seeds.slice(0,1):seeds;
const files=fs.readdirSync('src/coop').filter(f=>f.endsWith('.js')).sort();
const hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${f}`)).digest('hex')]));
if(process.argv.includes('--replay-failures')){
 const prior=JSON.parse(fs.readFileSync(`${OUT}/strength-class.json`)).rows.filter(r=>r.scene!=='bench'&&!r.clear&&r.survived),replays=[];
 for(const r of prior){const p=plans.find(p=>p.core===r.loadout.core);const next=simulate(p,r.phase,r.branch,r.scene,r.seed);assert.equal(next.damage,r.damage);assert.equal(next.seconds,r.seconds);replays.push(next);}
 fs.writeFileSync(`${OUT}/strength-failure-replays.json`,JSON.stringify({hashes,rows:replays},null,2));console.log(JSON.stringify({replays:replays.length,longestNoTravel:Math.max(...replays.map(r=>r.ending.longestNoTravel))}));process.exit(0);
}
if(!selected||selected==='class')for(const phase of ['mid','late'])for(const plan of plans)for(const branch of phase==='late'&&plan.branches.length?plan.branches:[null]){
 for(const scene of ['crowd','elite','boss','bench'])for(const seed of usedSeeds)classRows.push(simulate(plan,phase,branch,scene,seed));
 console.log(JSON.stringify({finished:classRows.at(-1).id,runs:classRows.length}));fs.writeFileSync(`${OUT}/strength-class${smoke?'-smoke':''}.json`,JSON.stringify({hashes,seeds:usedSeeds,rows:classRows,summary:aggregate(classRows)},null,2));
}
if(!selected||selected==='combo')for(const c of combos)for(const variant of ['base','gear','awakened']){
 const combo={...c,key:`${c.key}-${variant}`,gearOff:variant==='base',awakened:variant==='awakened'};
 // Keep recipe substitutions independent of the result identifier.
 if(c.key==='fortress')combo.parts=['guard','shieldBrood','bloodAmber','homeGift'];
 for(const scene of ['crowd','boss'])for(const seed of usedSeeds)comboRows.push(simulate({role:c.role},'late',null,scene,seed,combo));
 console.log(JSON.stringify({finished:combo.key,runs:comboRows.length}));fs.writeFileSync(`${OUT}/strength-combo${smoke?'-smoke':''}.json`,JSON.stringify({hashes,seeds:usedSeeds,rows:comboRows,summary:aggregate(comboRows)},null,2));
}
const drift=files.filter(f=>crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${f}`)).digest('hex')!==hashes[f]);
if(drift.length)throw Error(`Production changed during audit: ${drift.join(',')}`);
if(!smoke){const all=[...classRows,...comboRows],summary=aggregate(all);if(summary.length){const keys=Object.keys(summary[0]);fs.writeFileSync(`${OUT}/strength-${selected||'all'}-summary.csv`,'\ufeff'+[keys,...summary.map(r=>keys.map(k=>r[k]))].map(row=>row.map(v=>JSON.stringify(v)).join(',')).join('\n'));}fs.writeFileSync(`${OUT}/strength-run-manifest${selected?'-'+selected:''}.json`,JSON.stringify({finishedAt:new Date().toISOString(),seeds,hashes,classRuns:classRows.length,comboRuns:comboRows.length,sourceDrift:drift,toolHash:crypto.createHash('sha256').update(fs.readFileSync(import.meta.filename)).digest('hex')},null,2));}
console.log(JSON.stringify({complete:true,classRuns:classRows.length,comboRuns:comboRows.length,smoke}));
