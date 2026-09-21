import {tryBonusEvent,tickBonusEvent,updateBonusEnemy,hitCoinCreature} from './bonus-events.js';
import {NEST_DEF,openRoute,startObjective,tickObjective,resolveObjective,routeDrops,updateSiegeEnemy} from './adventure.js';
import {MOSSBELL_DEF,updateMossbell,recordMossbellHit} from './mossbell.js';
import {frameBossCamera} from './boss-camera.js';
import {equippedSkills} from './skill-pairs.js';
import {configurePairAction,updatePairAction,steerPairProjectile,pairProjectileHit,tickPairFields,absorbPair} from './pair-combat.js';
import {ACTIVE,ATTRIBUTES,CORES,PASSIVES,applyReward,attributePool,shuffle,rollSkills,rollReshape} from './builds.js';
import {selectAiReward} from './ai-build.js';
import {ENEMIES,enemyDef} from './enemies.js';
import {actionTiming,actionPhase} from './combat-motion.js';
import {segmentCircle,constrainSharedMove} from './collision.js';
import {companionInput} from './ai.js';
import {waveNumber,wavePlan,scaledEnemy,rareRoll,BOSS_DEF} from './encounters.js';
import {updateBoss,updateBossWarnings} from './boss.js';
import {rageDeadline,combatStats,aimPoint,healingTargets} from './enemy-tactics.js';
import {buildFx,charge,refundCooldown,addDot,onBuildHit,settleBuildDeath,onBuildDodge,configureBuildAction,releaseBuildEnergy,updateBuildAction,castShadow,buildProjectileHit,tickBuild,addChill,onBuildAbsorb,buildMoveFactor,buildDirectMultiplier} from './build-combat.js';
import {partyPressure,pressurePlan,createPressureState,pressureTick,pressureKind,pressureSpawn} from './pressure.js';
import {replacementImpacts} from './build-progression.js';
import {universalSources} from './universal-data.js';
import {lootRoll,xpRequired} from './loot.js';
import {universalPreHit,universalPostHit,universalCast,universalDodge,universalDodgeEnd,universalAvoid,universalDeath,universalHurt,universalShieldAbsorb,universalHeal,universalPickup,tickUniversal,resetUniversal,universalStatus} from './universal-combat.js';
import {createHero,HERO_ROLES} from './recruitment.js';
import {withEquipmentBase,onEquipmentAttack,onEquipmentSkill,onEquipmentDodge,onEquipmentHit,onEquipmentHurt,tickEquipment,resetEquipment} from './equipment.js';
import {enterShop,shopDue,rerollShop,buyShopEquipment,recruitShop,leaveShop} from './shop.js';
import {buyShopLesson} from './shop-lessons.js';
export const MAP_SCALE=Math.sqrt(6),MAP={x:550*MAP_SCALE,y:345*MAP_SCALE};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const len=(x,y)=>Math.hypot(x,y);
export const dist=(a,b)=>len(a.x-b.x,a.y-b.y);
export const norm=(x,y)=>{const l=len(x,y);return l?{x:x/l,y:y/l}:{x:0,y:0};};
export const dir8=(x,y)=>((Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8);
export const ROLES=HERO_ROLES;
export function analog(x,y,dead=.18){const m=len(x,y);if(m<=dead)return{x:0,y:0};const n=norm(x,y),s=clamp((m-dead)/(1-dead),0,1);return{x:n.x*s,y:n.y*s};}
const baseInput=()=>({x:0,y:0,dodge:false,skill1:false,skill2:false});
const OBSTACLES=[{x:-415*MAP_SCALE,y:-150*MAP_SCALE,r:35},{x:420*MAP_SCALE,y:150*MAP_SCALE,r:40},{x:100*MAP_SCALE,y:-300*MAP_SCALE,r:26}];
export class World{
 constructor(seed=17){this.seed=seed;this.mode='menu';this.reset(['warrior','mage']);this.mode='menu';}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(roles=['warrior','mage'],humanCount=2){this.humanCount=humanCount===1?1:2;if(roles.length<this.humanCount||roles.slice(0,this.humanCount).some(r=>!ROLES[r]))throw Error('Invalid player roles');this.bonusEvent=null;this.lastBonusClear=-100;this.lastBonusReport=null;this.shop=null;this.shopVisitedRoom=0;this.equipmentObjects=[];this.time=0;this.tick=0;this.accumulator=0;this.pendingEdges=[{},{}];this.mode='play';this.reason='';this.room=1;this.wave=1;this.level=1;this.kills=0;this.xp=0;this.xpNext=xpRequired(1);this.endless=false;this.challengeUsed=false;this.challengeNext=false;this.eliteChallenge=false;this.rewardMenus=[null,null,null];this.rewardError=null;this.highReward=false;this.pets=[];this.universalObjects=[];this.rewardType=null;this.enemies=[];this.projectiles=[];this.effects=[];this.hazards=[];this.skillFields=[];this.pickups=[];this.delayed=[];this.events=[];this.nextId=10;this.nextAttackId=1;this.clears=0;this.deathQueue=[];this.waveTimer=0;this.waveElapsed=0;this.spawnQueue=[];this.bossWarnings=[];this.obstacles=OBSTACLES;this.ready=[false,false];this.selection=[0,0];this.offers=[];this.camera={x:0,y:0,zoom:.8};this.shake=0;this.options={feedback:true,shake:true,sound:true};
  this.route=null;this.routeMenu=null;this.routeLoot=null;this.routeTurn=0;this.objective=null;
  this.heroes=roles.slice(0,this.humanCount).map((role,i)=>createHero(role,i));this.spawnWave();}

 createEnemy(kind,x,y,rank=0){const base=kind==='mossbell'?MOSSBELL_DEF:kind==='nest'?NEST_DEF:kind==='thornking'?BOSS_DEF:ENEMIES[kind],growth=scaledEnemy(base,waveNumber(this.room,this.wave),rank,()=>this.random()),hp=growth.stats.hp;return{id:this.nextId++,kind,x,y,hp,maxHp:hp,...growth,boss:['thornking','mossbell'].includes(kind),phase:1,skillCursor:0,ultimateCd:8,action:null,cd:1+this.random()*.5,hitFlash:0,visualStop:0,slow:0,freeze:0,statuses:[],face:4,stride:0,knock:{x:0,y:0}};}
 spawnWave(){
  this.waveTimer=0;this.waveElapsed=0;this.enraged=false;this.bossRoom=this.room%10===0;this.bossWarnings=[];this.spawnQueue=[];this.batchSpawned=0;
  this.pressure=null;this.pressureState=null;this.waveSpawned=0;this.pressureClosed=false;
  if(startObjective(this)){this.batchTotal=this.objective.budget;return;}
  if(this.bossRoom){this.waveDuration=0;this.batchTotal=1;this.enrageAt=rageDeadline(0,true);const boss=this.createEnemy(this.room===10?'mossbell':'thornking',0,-80);boss.hp=boss.maxHp=this.room===10?Math.round(3000*(1+.55*(this.heroes.length-1))):Math.round(3700*(1+(this.room/10-1)*1.05));this.enemies.push(boss);this.batchSpawned=1;return;}
  this.pressure=partyPressure(pressurePlan(this.room,this.wave),this.heroes.length);
  if(this.route?.room===this.room&&this.route.objective==='clear')this.pressure={...this.pressure,totalBudget:Math.round(this.pressure.totalBudget*.85),targetAlive:Math.max(1,Math.round(this.pressure.targetAlive*.85)),initial:Math.max(1,Math.round(this.pressure.initial*.85))};
  if(this.eliteChallenge)this.pressure={...this.pressure,targetAlive:Math.ceil(this.pressure.targetAlive*1.2),aliveCap:Math.ceil(this.pressure.aliveCap*1.15),totalBudget:Math.ceil(this.pressure.totalBudget*1.2)};
  this.pressureState=createPressureState(this.pressure);this.waveDuration=this.pressure.duration;this.batchTotal=this.pressure.totalBudget;this.enrageAt=rageDeadline(this.waveDuration,false)+(this.heroes.length===1?20:0);
  this.refreshPressure();
 }
 refreshPressure(){
  if(!this.pressure||this.bonusEvent)return;
  const result=pressureTick(this.pressure,this.pressureState,{elapsed:this.waveElapsed,alive:this.enemies.filter(e=>e.hp>0).length});this.pressureState=result.state;
  if(result.count>0)this.spawnBatch({count:result.count,index:this.batchSpawned});
  this.pressureClosed=result.closed;
 }
 spawnBatch(batch){
  if(!batch||batch.count<=0)return;this.batchSpawned++;
  const alive=this.heroes.filter(h=>!h.down);if(!alive.length)return;
  for(let i=0;i<batch.count;i++){
   const anchor=alive[Math.floor(this.random()*alive.length)],angle=this.random()*Math.PI*2+batch.index*.83;
   const [near,far]=this.pressure?.spawnRadius||[420,580],radius=near+this.random()*(far-near);
   let pos={x:clamp(anchor.x+Math.cos(angle)*radius,-MAP.x+45,MAP.x-45),y:clamp(anchor.y+Math.sin(angle)*radius,-MAP.y+45,MAP.y-45)};
   for(let attempt=0;attempt<12&&alive.some(h=>dist(pos,h)<240);attempt++){const a=angle+attempt*2.4;pos={x:clamp(anchor.x+Math.cos(a)*radius,-MAP.x+45,MAP.x-45),y:clamp(anchor.y+Math.sin(a)*radius,-MAP.y+45,MAP.y-45)};}
   let kind=pressureKind(this.room,this.wave,this.waveSpawned,()=>this.random());
   let rank=rareRoll(()=>this.random(),waveNumber(this.room,this.wave));
   if(this.eliteChallenge&&this.waveSpawned%5===0)rank=Math.max(1,rank);
   ({kind,rank}=pressureSpawn(this.room,this.wave,kind,rank,this.enemies,this.heroes.length));
   const e=this.createEnemy(kind,pos.x,pos.y,rank);this.moveActor(e,0,0,enemyDef(e).bodyRadius||22);e.spawnGrace=.7;e.cd=Math.max(.75,e.cd);this.enemies.push(e);this.waveSpawned++;
   this.effects.push({type:'spawn',x:e.x,y:e.y,r:enemyDef(e).bodyRadius||20,life:.7,max:.7});
  }
  this.emit('reinforcements',{batch:this.batchSpawned,count:batch.count});
 }
 updateSpawns(dt){this.waveElapsed+=dt;if(!this.enraged&&this.waveElapsed>=this.enrageAt){this.enraged=true;this.emit('enrage');}this.refreshPressure();}
 pause(reason='暂停'){if(['play','upgrade','shop','route','routeReward'].includes(this.mode)){this.resumeMode=this.mode;this.mode='paused';this.reason=reason;this.clearBuffers();}}
 resume(){if(this.mode==='paused'){this.mode=this.resumeMode||'play';this.reason='';this.clearBuffers();}}
 clearBuffers(){this.pendingEdges=[{},{}];for(const h of this.heroes){h.buffer=null;h.move={x:0,y:0};}}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>80)this.events.shift();}
 request(h,type,input){if(h.down)return false;const moving=len(input.x,input.y)>.01;const v=moving?norm(input.x,input.y):h.lastMove;h.buffer={type,expires:this.time+.14,dir:{...v}};return this.consume(h);}
 consume(h){const b=h.buffer;if(!b)return false;if(this.time>b.expires){h.buffer=null;return false;}const a=h.action;if(b.type==='dodge'){
   if(h.dodgeCd>0||a?.type==='dodge'||(a&&a.type!=='attack'&&a.t<(a.cancelAt??a.duration*.55)))return false;
   h.visualStop=0;h.hitPose=null;h.action={type:'dodge',t:0,duration:.29,dir:b.dir,hit:new Set()};h.invuln=.15;h.dodgeCd=.85;h.empowered=h.passives.momentum?3:0;h.buffer=null;onBuildDodge(this,h);universalDodge(this,h,b.dir);onEquipmentDodge(this,h,b.dir);this.emit('dodge',{id:h.id});return true;
  }
  const s=equippedSkills(h)[b.type==='skill1'?0:1];if(!h.skills[s]){h.buffer=null;return false;}if(h.cd[s]>0||(a&&a.type!=='attack'))return false;
  const target=this.nearest(h,520);const d=target?norm(target.x-h.x,target.y-h.y):b.dir;
  const type=s<2?ACTIVE[h.role][s].type:h.role==='warrior'?'spin':h.role==='mage'?'fireball':'pierce';
  h.visualStop=0;h.hitPose=null;h.action={type,slot:s,t:0,...actionTiming(h.role,type),facing:dir8((type==='bash'?b.dir:d).x,(type==='bash'?b.dir:d).y),dir:type==='bash'?b.dir:d,hit:new Set(),fired:false,eventId:this.nextAttackId++};configureBuildAction(this,h,h.action);configurePairAction(this,h,h.action);
  // Basic Q locks a world point at startup; moving the caster must not translate the aim line.
  if(target&&!h.action.pairSkill&&!h.action.form&&!h.action.buildBranch&&['fireball','pierce'].includes(type))h.action.aimPoint={x:target.x,y:target.y};
  h.cd[s]=ROLES[h.role].cd[s]*(1-h.cooldown)*(h.runes[s]==='quick'?.75:h.runes[s]==='force'?1.2:h.runes[s]==='wide'?1.15:1)*(h.core==='arcanist'||h.core==='executioner'?1.15:1);h.refundBudget??=[];h.refundBudget[s]=h.cd[s]*.35;h.shield=Math.min(120*h.shieldPower,h.shield+(h.passives.guard||0)*8*h.shieldPower);h.charged=h.passives.arcane||0;h.casts++;if(h.core==='arcanist'&&h.casts%3===0)this.delayed.push({type:'arcane',owner:h.id,delay:h.action.windup,damage:this.skillDamage(h,s,40)*.6});h.buffer=null;h.face=dir8(h.action.dir.x,h.action.dir.y);universalCast(this,h,h.action);onEquipmentSkill(this,h,h.action);this.emit('skill',{id:h.id,skill:type});return true;
 }
 nearest(h,range=Infinity){
  if(this.objective?.kind==='defend'&&this.objective.phase==='active'&&dist(h,this.objective.beacon)<360){const attacker=this.enemies.filter(e=>e.hp>0&&e.siege&&dist(e,this.objective.beacon)<140&&dist(h,e)<range&&this.lineClear(h,e)).sort((a,b)=>dist(a,this.objective.beacon)-dist(b,this.objective.beacon))[0];if(attacker)return attacker;}
  const objective=this.enemies.filter(e=>e.objectivePart&&e.hp>0&&dist(h,e)<Math.min(range,235)&&this.lineClear(h,e)).sort((a,b)=>dist(h,a)-dist(h,b))[0];if(objective)return objective;
  let best=null,d=range,support=null,supportDistance=range;
  for(const e of this.enemies){if(e.hp<=0)continue;const n=dist(h,e);if(n>=range||!this.lineClear(h,e))continue;if(n<d){best=e;d=n;}if(e.stats?.behavior==='healer'&&n<supportDistance){support=e;supportDistance=n;}}
  if((h.core==='sniper'||h.forms?.[0]==='markedshot')&&d>140){const marked=this.enemies.find(e=>e.id===h.huntTarget&&e.hp>0&&dist(h,e)<range&&this.lineClear(h,e));if(marked)return marked;}
  return support&&d>100?support:best;
 }
 lineClear(a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;return !this.obstacles.some(o=>{const t=l?clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/l,0,1):0;return len(a.x+t*dx-o.x,a.y+t*dy-o.y)<o.r;});}
 moveActor(h,dx,dy,r=17){if(!h.ai&&this.humanCount===2&&this.heroes[h.id]===h)({dx,dy}=constrainSharedMove(h,this.heroes[1-h.id],dx,dy));h.x=clamp(h.x+dx,-MAP.x+r,MAP.x-r);h.y=clamp(h.y+dy,-MAP.y+r,MAP.y-r);for(const o of this.obstacles){const d=dist(h,o),rr=r+o.r;if(d<rr){const n=d?norm(h.x-o.x,h.y-o.y):{x:1,y:0};h.x=o.x+n.x*rr;h.y=o.y+n.y*rr;}}}
 damageEnemy(e,n,h,knock=70,source='attack',extraCrit=0,incoming=null,context={}){
  if(e.hp<=0||!h)return;if(e.bonusKind==='gold'){hitCoinCreature(this,e,h,n);return;}const ctx={...context,eventId:context.eventId??((source==='attack'||source==='skill')?h.action?.eventId:null)??this.nextAttackId++,depth:context.depth||0};if(ctx.depth>2)return;
  const direct=source==='attack'||source==='skill';let crit=false;
  if(direct){
   universalPreHit(this,e,h,source,ctx);n*=buildDirectMultiplier(this,h,e,source,ctx);
   if(source==='attack'){if(h.core==='bulwark')n*=.85;if(h.core==='whirlwind')n*=.9;if(h.core==='ranger')n*=.85;if(h.charged){n*=1+h.charged*.25;h.charged=0;}}
   if(h.core==='frostweaver'&&(e.freeze>0||e.chillBy?.[h.id]?.brittleUntil>this.time))n*=1.12;
   if((e.slow>0||e.freeze>0||e.brittle>0)&&h.passives.shatter)n*=1+h.passives.shatter*.1;
   if(e.hp<e.maxHp*.3&&h.passives.focus)n*=1+h.passives.focus*.2;
   crit=h.empowered>0||this.random()<h.crit+extraCrit;if(crit)n*=h.critDamage;
   if(h.empowered>0){n*=1+(h.passives.momentum||0)*.1;h.empowered=0;}
   if(e.kind==='beetle'){const facing={x:Math.cos(e.face*Math.PI/4),y:Math.sin(e.face*Math.PI/4)},v=incoming?{x:-incoming.x,y:-incoming.y}:norm(h.x-e.x,h.y-e.y);if(v.x*facing.x+v.y*facing.y>.25)n*=.5;}
   if(h.passives.chill){const duration=.1+h.passives.chill*.4;e.slow=Math.max(e.slow,duration);universalStatus(this,e,h,'chill',duration,0,{eventId:ctx.eventId});}
   const strength=(source==='attack'?h.power:h.skillPower)*(h.dotPower||1);
   if(!ctx.skipBurn&&((source==='skill'&&h.passives.ember)||h.core==='pyromancer'&&source==='attack'))addDot(this,e,h,'burn',(source==='attack'?8:(h.passives.ember||0)*4)*strength);
   if(!ctx.skipBleed&&crit&&(h.passives.blood||h.core==='executioner'))addDot(this,e,h,'bleed',(h.passives.blood||1)*5*strength);
  }
  if(e.objectivePart&&e.vulnerable||e.kind==='mossbell'&&e.staggerUntil>this.time)n*=1.25;
  const beforeArmor=n;n*=1-(e.stats?.armor||0);const dealt=Math.min(e.hp,Math.max(0,n));e.lastHit=this.time;e.hp=Math.max(0,e.hp-n);h.damageDone+=dealt;recordMossbellHit(this,e,h,dealt,source,ctx);
  e.contributors??={};if(dealt>0){e.contributors[h.id]=this.time;if(direct){e.directContributors??={};e.directContributors[h.id]=this.time;}}
  const d=incoming||norm(e.x-h.x,e.y-h.y);if(source!=='dot'){e.hitFlash=.16;e.visualStop=n>=28?.055:.035;e.hitPose={stride:e.stride,action:e.action?{...e.action}:null};e.hitReaction={x:d.x,y:d.y,life:.24,max:.24,power:n>=28?1.3:1};if(h.role==='warrior'&&source==='attack'){h.visualStop=.035;h.hitPose={stride:h.stride,action:h.action?{...h.action}:null};}if(!incoming)this.contact(e,d,n>=28?68:48);}
  e.knock={x:d.x*knock,y:d.y*knock};this.effects.push({type:'number',x:e.x+12*((e.id%3)-1),y:e.y,height:enemyDef(e).size+36,text:(crit?'暴击 ':'')+Math.round(n),life:.7,max:.7,color:crit?'#ffce71':'#fff0b4'});this.emit('hit',{id:h.id,heavy:n>=28});if(n>=28)this.shake=Math.min(.12,this.shake+.05);
  if(direct){const hpBefore=h.hp,fresh=onBuildHit(this,e,h,source,ctx);if(h.hp>hpBefore)universalHeal(this,h,h.hp-hpBefore);if(fresh&&h.passives.chain&&++h.directHits%4===0){const targets=this.enemies.filter(o=>o!==e&&o.hp>0&&dist(e,o)<190&&this.lineClear(e,o)).sort((a,b)=>dist(e,a)-dist(e,b)).slice(0,h.passives.chain);for(const other of targets){this.damageEnemy(other,beforeArmor*.35,h,25,'proc',0,null,{depth:ctx.depth+1});this.effects.push({type:'chain',x:e.x,y:e.y,to:{x:other.x,y:other.y},life:.16,max:.16,layer:'depth'});}}}
  universalPostHit(this,e,h,source,ctx,dealt);onEquipmentHit(this,e,h,source,ctx,dealt);
  if(e.hp<=0&&!e.defeated){e.defeated=true;this.kills++;if(e.bonusKind==='xp'&&this.bonusEvent)this.bonusEvent.killed++;for(const item of e.bonusKind==='xp'?[{type:'xp',value:1}]:routeDrops(this,e,lootRoll(e,()=>this.random())))this.dropPickup({...item,value:item.value*(item.type==='gold'&&this.heroes.length===1?2:1),x:e.x,y:e.y});this.effects.push({type:'poof',x:e.x,y:e.y,life:.35,max:.35});this.emit('kill',{id:h.id});universalDeath(this,e,h,ctx);settleBuildDeath(this,e,h,ctx,(owner,actual)=>universalHeal(this,owner,actual));if(e.boss){if(e.kind==='mossbell')this.effects.push({type:'adventure-death',x:e.x,y:e.y,life:1.5,max:1.5,layer:'depth'});for(const minion of this.enemies)if(minion.summonedBy===e.id)minion.hp=0;this.bossWarnings=[];this.projectiles=this.projectiles.filter(p=>p.bossOwner!==e.id);this.emit('bossDefeated');}}
 }
 damageHero(h,n,e,source=e){if(h.down)return;if(h.invuln>0){if(h.action?.type==='dodge')universalAvoid(this,h,e.attackId??source?.action?.attackId??e.action?.attackId??e.id??source?.id);return;}if(h.evasion>0&&this.random()<h.evasion){h.invuln=.22;this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:'闪避',life:.6,max:.6,color:'#9bf1d2'});return;}n*=h.core==='berserker'?1.15:1;const guardVector=e.dx!==undefined?{x:-e.dx,y:-e.dy}:norm(e.x-h.x,e.y-h.y);const guarding=h.guardUntil>this.time&&guardVector.x*h.guardDir.x+guardVector.y*h.guardDir.y>.25;if(guarding)n*=.5;const incoming=n*(1-h.armor),absorbed=Math.min(h.shield||0,incoming);h.shield=Math.max(0,(h.shield||0)-absorbed);onBuildAbsorb(this,h,absorbed,guarding);absorbPair(h,absorbed);if(absorbed>0){universalShieldAbsorb(this,h,absorbed);buildFx(this,'aegis',h,90,.18,{dir:h.guardDir||guardVector});}const taken=Math.min(h.hp,incoming-absorbed);h.hp=Math.max(0,h.hp-taken);if(taken>0){universalHurt(this,h,taken);onEquipmentHurt(this,h,taken);}if(source?.hp>0&&source.affixes?.includes('vampire'))source.hp=Math.min(source.maxHp,source.hp+taken*.4*source.rarity);h.invuln=.55;h.hitFlash=.22;h.visualStop=.045;h.hitPose={stride:h.stride,action:h.action?{...h.action}:null};this.emit('hurt',{id:h.id});const d=e.dx!==undefined?{x:e.dx,y:e.dy}:norm(h.x-e.x,h.y-e.y);h.hitReaction={x:d.x,y:d.y,life:.3,max:.3,power:1.25};this.contact(h,d,62,true);this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:taken>0?`−${Math.max(1,Math.round(taken))}`:'格挡',life:.65,max:.65,color:'#ff9b88'});if(!guarding)this.moveActor(h,d.x*18,d.y*18);if(taken>0&&h.passives.thorns)for(const foe of this.enemies)if(foe.hp>0&&dist(h,foe)<145)this.damageEnemy(foe,taken*(h.passives.thorns||0)*.3,h,50,'proc');if(!h.hp){h.down=true;h.action=null;h.buffer=null;this.emit('down',{id:h.id});}}
 contact(p,dir,size=48,hurt=false){this.effects.push({type:'contact',x:p.x,y:p.y,height:31,depthY:p.depthY??p.y+.1,dir:{...dir},size,hurt,life:.22,max:.22,layer:'depth'});}
 shoot(h,dir,type,damage,speed=470,source='attack',evolved=false,slot=0){const p={id:this.nextId++,owner:h.id,type,x:h.x,y:h.y,muzzle:43,dx:dir.x,dy:dir.y,damage,speed,life:1.7*(source==='skill'?this.skillRange(h,slot):h.rangeBonus),hit:new Set(),source,evolved,rangeBonus:source==='skill'?this.skillRange(h,slot):h.rangeBonus,eventId:h.action?.eventId??this.nextAttackId++};this.projectiles.push(p);return p;}
 skillDamage(h,slot,base){return base*(1+Math.max(0,h.skills[slot]-1)*.34)*h.skillPower*(h.runes[slot]==='force'?1.3:h.runes[slot]==='quick'?.85:1);}
 skillRange(h,slot){return h.rangeBonus*(h.runes[slot]==='wide'?1.25:1);}
 areaHit(h,r,damage,knock=100){const eventId=this.nextAttackId++;for(const e of this.enemies)if(e.hp>0&&dist(h,e)<r&&this.lineClear(h,e))this.damageEnemy(e,damage,h,knock,'skill',0,null,{eventId});}
 advance(seconds,inputs=[{},{}]){if(this.mode!=='play')return;for(let p=0;p<2;p++)for(const k of ['dodge','skill1','skill2'])this.pendingEdges[p][k] ||= !!inputs[p]?.[k];this.accumulator+=Math.max(0,seconds);while(this.mode==='play'&&this.accumulator+1e-9>=1/120){this.accumulator-=1/120;const sample=[0,1].map(p=>({...inputs[p],...this.pendingEdges[p]}));this.pendingEdges=[{dodge:false,skill1:false,skill2:false},{dodge:false,skill1:false,skill2:false}];this.step(1/120,sample);}}
 step(dt,inputs){if(this.mode!=='play')return;this.time+=dt;this.tick++;if(this.bonusEvent)tickBonusEvent(this,dt);else {this.updateSpawns(dt);tickObjective(this,dt);}this.shake=Math.max(0,this.shake-dt);this.effects=this.effects.filter(f=>(f.life-=dt)>0);
  for(const h of this.heroes){let input={...baseInput(),...(inputs[h.id]||{})};if(h.ai)input=this.aiInput(h);h.cd=h.cd.map(t=>Math.max(0,t-dt));h.dodgeCd=Math.max(0,h.dodgeCd-dt);h.attackCd=Math.max(0,h.attackCd-dt);h.invuln=Math.max(0,h.invuln-dt);h.hitFlash=Math.max(0,h.hitFlash-dt);h.visualStop=Math.max(0,h.visualStop-dt);if(h.hitReaction)h.hitReaction.life=Math.max(0,h.hitReaction.life-dt);
   if(h.down){tickBuild(this,h,dt);const helper=this.heroes.some(p=>!p.down&&p.id!==h.id&&dist(p,h)<82);h.revive=helper?h.revive+dt:Math.max(0,h.revive-dt*.5);if(h.revive>=2){h.down=false;h.hp=h.maxHp*.45;h.revive=0;h.invuln=1;this.emit('revive',{id:h.id});}continue;}
   const prior={x:h.x,y:h.y};const m=len(input.x,input.y);if(m>1){input.x/=m;input.y/=m;}h.move={x:input.x,y:input.y};if(m>.01)h.lastMove=norm(input.x,input.y);
   if(input.dodge)this.request(h,'dodge',input);else if(input.skill1)this.request(h,'skill1',input);else if(input.skill2)this.request(h,'skill2',input);this.consume(h);
   h.empowered=Math.max(0,h.empowered-dt);tickBuild(this,h,dt);const a=h.action;const speed=ROLES[h.role].speed*h.speedBonus*buildMoveFactor(h)*(['aegis','pairwall'].includes(a?.form)?0:1);
   if(a&&(a.type==='dodge'||(a.type==='bash'&&!['aegis','pairwall'].includes(a.form)))){const old=a.t;a.t=Math.min(a.duration,a.t+dt);const windup=a.type==='bash'?(a.windup??0):0;const ease=t=>{const q=clamp((t*a.duration-windup)/(a.duration-windup),0,1);return 1-(1-q)**2;};const travel=a.type==='dodge'?124:145*(h.evolved[0]?1.3:1);const d=(ease(a.t/a.duration)-ease(old/a.duration))*travel;this.moveActor(h,a.dir.x*d,a.dir.y*d);h.face=dir8(a.dir.x,a.dir.y);}
   else{const previous={x:h.x,y:h.y};this.moveActor(h,input.x*speed*dt,input.y*speed*dt);const travel=Math.min(speed*dt,dist(previous,h));h.stride+=travel/92;const gaitTarget=Math.min(1,travel/Math.max(.001,speed*dt));h.gait+=(gaitTarget-(h.gait||0))*(1-Math.exp(-dt/.055));if(h.gait<.003)h.gait=0;if(m>.01&&!a)this.faceToward(h,input.x,input.y);if(a)a.t+=dt;}
   h.vx=(h.x-prior.x)/dt;h.vy=(h.y-prior.y)/dt;
   if(a){const t=a.t;if(a.slot!==undefined&&!a.buildReleased&&t>=(a.windup||0)){a.buildReleased=true;releaseBuildEnergy(this,h,a);}
    if(a.type==='attack'&&!a.fired&&t>=(a.windup??a.duration*.33)){a.fired=true;if(h.role!=='warrior'){const target=this.nearest(h,ROLES[h.role].range*h.rangeBonus+45);if(target){const flight=Math.min(.4,Math.max(0,dist(h,target)-43)/470),pred={x:target.x+(target.vx||0)*flight,y:target.y+(target.vy||0)*flight};a.dir=norm((this.lineClear(h,pred)?pred.x:target.x)-h.x,(this.lineClear(h,pred)?pred.y:target.y)-h.y);h.face=dir8(a.dir.x,a.dir.y);}}onEquipmentAttack(this,h,a);if(h.role==='warrior'){for(const e of this.enemies){const n=norm(e.x-h.x,e.y-h.y);if(dist(e,h)<205*h.rangeBonus&&n.x*a.dir.x+n.y*a.dir.y>-.1&&this.lineClear(h,e))this.damageEnemy(e,ROLES[h.role].damage*h.power,h,70,'attack',0,null,{eventId:a.eventId});}h.swings++;if(h.core==='whirlwind'&&h.swings%3===0){for(const e of this.enemies)if(e.hp>0&&dist(e,h)<205*h.rangeBonus&&this.lineClear(h,e))this.damageEnemy(e,ROLES[h.role].damage*h.power*.7,h,90,'proc');this.effects.push({type:'spin',x:h.x,y:h.y,r:205*h.rangeBonus,life:.25,max:.25});}}else{this.shoot(h,a.dir,h.role==='mage'?'bolt':'arrow',ROLES[h.role].damage*h.power);const extra=(h.passives.volley?(.08+h.passives.volley*.1):0)+(h.core==='ranger'?.35:0);if(extra){const angle=Math.atan2(a.dir.y,a.dir.x);for(const off of [-.2,.2])this.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},h.role==='mage'?'bolt':'arrow',ROLES[h.role].damage*h.power*extra,470,'proc');}}}
    const handled=updatePairAction(this,h,a)||updateBuildAction(this,h,a);
    if(!handled&&a.type==='bash'&&t>=(a.windup??.045)&&t<=(a.activeEnd??a.duration)){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<80*this.skillRange(h,0)+(e.boss?Math.max(0,(enemyDef(e).bodyRadius||0)-53):0)&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,0,36),h,260,'skill');if(h.evolved[0]&&!h.evolutionBranches?.[0])refundCooldown(h,0,.4);}}
    if(!handled&&a.type==='spin'&&t>=(a.windup??.12)&&t<=(a.activeEnd??a.duration)){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<170*this.skillRange(h,1)&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,1,38),h,150,'skill');}if(!a.fired){a.fired=true;if(h.evolved[1]&&!h.evolutionBranches?.[1])for(const delay of [.24,.48])this.delayed.push({type:'spin',owner:h.id,delay,damage:this.skillDamage(h,1,38)*.55});}}
    if(!handled&&['fireball','frost','pierce','fan'].includes(a.type)&&!a.fired&&t>=(a.windup??.105)){a.fired=true;if(a.type==='frost'){this.effects.push({type:'frost',x:h.x,y:h.y,r:185*this.skillRange(h,1),life:.48,max:.48});for(const e of this.enemies)if(dist(h,e)<185*this.skillRange(h,1)&&this.lineClear(h,e)){e.slow=2.2;if(h.evolved[1]&&!h.evolutionBranches?.[1])e.freeze=1.5;this.damageEnemy(e,this.skillDamage(h,1,23)*(h.evolved[1]&&!h.evolutionBranches?.[1]?1.5:1),h,100,'skill');universalStatus(this,e,h,'chill',2.2,0,{eventId:a.eventId});}}else if(a.type==='fan'){this.fan(h,a.dir);castShadow(this,h,a.dir);if(h.evolved[1]&&!h.evolutionBranches?.[1])this.delayed.push({type:'fan',owner:h.id,dir:{...a.dir},delay:.3});}else{
     if(a.aimPoint&&dist(h,a.aimPoint)>1e-8){a.dir=norm(a.aimPoint.x-h.x,a.aimPoint.y-h.y);a.facing=h.face=dir8(a.dir.x,a.dir.y);}
     this.shoot(h,a.dir,a.type,this.skillDamage(h,0,a.type==='fireball'?42:45),a.type==='fireball'?390:650,'skill',h.evolved[0]);
    }}
    if(t>=a.duration){if(a.type==='dodge')universalDodgeEnd(this,h,a.dir);h.action=null;}
   }
   if(!h.action&&h.attackCd<=0){const target=this.nearest(h,ROLES[h.role].range*h.rangeBonus);if(target){const d=norm(target.x-h.x,target.y-h.y);h.face=dir8(d.x,d.y);h.action={type:'attack',dir:d,facing:h.face,t:0,...actionTiming(h.role,'attack',h.haste),fired:false,hit:new Set(),eventId:this.nextAttackId++};h.attackCd=ROLES[h.role].interval/h.haste;}}
  }
  this.updateProjectiles(dt);this.updateHazards(dt);tickPairFields(this,dt);updateBossWarnings(this,dt);tickUniversal(this,dt);tickEquipment(this,dt);this.updatePickups(dt);
  for(const job of this.delayed){job.delay-=dt;if(job.delay<=0){const h=this.heroes[job.owner];if(!h.down){if(job.type==='fan')this.fan(h,job.dir,job.factor,job.origin,job.visual);else if(job.type==='markecho'){const p=this.shoot(h,job.dir,'pierce',job.damage,850,'proc');p.visual='markedshot';}else if(job.type==='woundburst'){const target=this.enemies.find(e=>e.id===job.target&&e.hp>0);if(target){this.damageEnemy(target,job.damage,h,0,'proc');buildFx(this,'bloodspin',target,50,.2);}}else if(job.type==='bloodpulse'){for(const e of this.enemies)if(e.hp>0&&dist(h,e)<job.r&&this.lineClear(h,e))this.damageEnemy(e,job.damage,h,25,'proc');buildFx(this,'bloodspin',h,job.r,.25);}else{this.areaHit(h,job.type==='arcane'?210:170*this.skillRange(h,1),job.damage);this.effects.push({type:job.type==='arcane'?'frost':'spin',x:h.x,y:h.y,r:job.type==='arcane'?210:170*this.skillRange(h,1),life:.25,max:.25});}}}}
  this.delayed=this.delayed.filter(j=>j.delay>0);
  this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const e of this.enemies){const ox=e.x,oy=e.y;this.updateEnemy(e,dt);e.vx=clamp((e.x-ox)/dt,-800,800);e.vy=clamp((e.y-oy)/dt,-800,800);}
  this.enemies=this.enemies.filter(e=>e.hp>0);
  this.resolveBodies();this.refreshPressure();
  if(this.heroes.every(h=>h.down)){this.mode='defeat';this.clearBuffers();return;}
  if(this.xp>=this.xpNext){this.beginUpgrade();return;}
  if(this.bonusEvent){if(this.bonusEvent.phase==='collect'&&this.bonusEvent.remaining<=0){this.lastBonusReport={...this.bonusEvent};this.bonusEvent=null;this.resumeAfterWave();return;}}
  else if(!this.enemies.length&&this.waveElapsed>=this.waveDuration&&(!this.objective||this.objective.kind==='clear'||this.objective.phase==='finished')){this.waveTimer+=dt;if(this.waveTimer>1.1){if(this.bossRoom&&this.room>=20&&!this.endless){this.clears++;this.settleWave();this.mode='victory';this.clearBuffers();this.emit('victory');enterShop(this,'victory');}else this.beginReward('skill');return;}}
  if(!frameBossCamera(this,dt,MAP_SCALE)){const ps=this.heroes.slice(0,this.humanCount),cx=ps.reduce((n,h)=>n+h.x,0)/ps.length,cy=ps.reduce((n,h)=>n+h.y,0)/ps.length;const spread=this.humanCount===2?Math.max(Math.abs(ps[0].x-ps[1].x)/1800,Math.abs(ps[0].y-ps[1].y)/1500):0;const z=clamp(1.04-spread,.78,1.02)*.8;const k=1-Math.exp(-dt*3);const boundZoom=Math.min(z,this.camera.zoom),targetX=clamp(cx*.85,-800*MAP_SCALE+720/boundZoom,800*MAP_SCALE-720/boundZoom),targetY=clamp(cy*.8,(-550*MAP_SCALE+369/boundZoom)/.707,(550*MAP_SCALE-441/boundZoom)/.707);this.camera.x+=(targetX-this.camera.x)*k;this.camera.y+=(targetY-this.camera.y)*k;if(Math.abs(z-this.camera.zoom)>.025)this.camera.zoom+=(z-this.camera.zoom)*k;}
 }
 fan(h,dir,factor=1,origin=null,visual=null){const angle=Math.atan2(dir.y,dir.x),eventId=this.nextAttackId++;for(const off of [-.34,-.17,0,.17,.34]){const p=this.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},'arrow',this.skillDamage(h,1,20)*factor,560,origin||visual?'proc':'skill',false,1);p.eventId=eventId;if(origin){p.x=origin.x;p.y=origin.y;}if(visual)p.visual=visual;}}
 updateProjectiles(dt){
  for(const p of [...this.projectiles]){steerPairProjectile(this,p,dt);const travel=p.speed*Math.min(dt,Math.max(0,p.life))+(p.muzzle||0);p.muzzle=0;p.life-=dt;const start={x:p.x,y:p.y},end={x:p.x+p.dx*travel,y:p.y+p.dy*travel};
   const contacts=this.obstacles.map(o=>({t:segmentCircle(start,end,o,o.r),wall:true}));
   for(const e of p.hostile?this.heroes:this.enemies)if(e.hp>0&&!p.hit.has(e.id))contacts.push({t:segmentCircle(start,end,e,p.hostile?17:(enemyDef(e).bodyRadius||23)+(p.radius||0)),target:e});
   contacts.sort((a,b)=>a.t-b.t||(a.wall?-1:1));let stopped=false;
   for(const hit of contacts){if(hit.t===Infinity)break;const pos={x:start.x+(end.x-start.x)*hit.t,y:start.y+(end.y-start.y)*hit.t},dir={x:p.dx,y:p.dy};
    if(hit.wall){this.contact(pos,dir,30);p.x=pos.x;p.y=pos.y;p.life=0;stopped=true;break;}
    const e=hit.target;if(e.hp<=0)continue;p.hit.add(e.id);this.contact({...pos,depthY:e.y+.1},dir,p.type==='fireball'?65:42,!!p.hostile);
    if(p.hostile)this.damageHero(e,p.damage,{...pos,attackId:`projectile:${p.id}`,dx:p.dx,dy:p.dy},this.enemies.find(m=>m.id===p.enemyOwner));
    else{const h=this.heroes[p.owner];const dealt=pairProjectileHit(this,p,e,h,buildProjectileHit(this,p,e,h,dir));this.damageEnemy(e,dealt,h,p.knock??(p.type==='pierce'?150:65),p.source,p.evolved&&p.type==='pierce'?.25:0,dir,{eventId:p.eventId,skipBurn:p.skipBurn});
     if(p.type==='fireball'){const r=95*(p.rangeBonus||1)*(p.evolved?1.5:1);this.effects.push({type:'blast',x:pos.x,y:pos.y,r,life:.4,max:.4});for(const other of this.enemies)if(other!==e&&other.hp>0&&dist(pos,other)<r&&this.lineClear(pos,other))this.damageEnemy(other,p.damage*.65,h,100,'skill',0,null,{eventId:p.eventId,skipBurn:p.skipBurn});if(p.evolved)this.hazards.push({type:'fire',owner:h.id,x:pos.x,y:pos.y,r,life:3,timer:.5,damage:p.damage*.12});}
    }
    if(p.hostile||p.type!=='pierce'){p.x=pos.x;p.y=pos.y;p.life=0;stopped=true;break;}
   }
   if(!stopped){p.x=end.x;p.y=end.y;}
  }this.projectiles=this.projectiles.filter(p=>p.life>0&&Math.abs(p.x)<MAP.x+30&&Math.abs(p.y)<MAP.y+30);
 }
 dropPickup(item){
  const shared=['xp','gold'].includes(item.type),same=shared?this.pickups.filter(p=>p.type===item.type&&p.owner===undefined):[];
  let merge=same.find(p=>dist(p,item)<26);
  if(!merge&&same.length>=240)merge=same.sort((a,b)=>dist(a,item)-dist(b,item))[0];
  if(merge){merge.value=(merge.value||1)+(item.value||1);return merge;}
  if(item.type==='potion'&&this.pickups.filter(p=>p.type==='potion').length>=12)return null;
  const drop={id:this.nextId++,life:shared?Infinity:45,...item};this.pickups.push(drop);return drop;
 }
 updatePickups(dt=1/120){
  const collected=new Set();
  for(const p of [...this.pickups]){
   if(Number.isFinite(p.life)){p.life-=dt;if(p.life<=0){collected.add(p.id);continue;}}
   const potion=p.type==='potion';let candidates=this.heroes.filter(h=>!h.down&&(p.type!=='gold'||!h.ai)&&(p.owner===undefined||p.owner===h.id||p.type==='supply')&&(!potion||h.hp<h.maxHp)&&dist(h,p)<(potion?38:(h.pickupRadius||105))&&this.lineClear(h,p));
   candidates.sort((a,b)=>potion||p.type==='supply'?(a.hp+(a.shield||0))/a.maxHp-(b.hp+(b.shield||0))/b.maxHp:dist(a,p)-dist(b,p));
   let h=this.heroes.find(h=>h.id===p.attractedTo&&!h.down&&(p.type!=='gold'||!h.ai)&&(p.owner===undefined||p.owner===h.id||p.type==='supply'))||candidates[0];
   if(!h)continue;
   if(!potion){p.attractedTo=h.id;const d=dist(h,p),v=norm(h.x-p.x,h.y-p.y),step=Math.min(d,520*dt);if(!this.lineClear(p,h)){delete p.attractedTo;continue;}p.x+=v.x*step;p.y+=v.y*step;if(dist(h,p)>19)continue;}
   let heal=0;
   if(p.type==='xp'){this.xp+=p.value||1;this.emit('xp',{id:h.id,value:p.value||1});}
   else if(p.type==='gold'){h.gold+=p.value||1;this.emit('gold',{id:h.id,value:p.value||1});}
   else if(potion){heal=Math.min(h.maxHp-h.hp,(p.value||35)*h.recovery);if(heal<=0)continue;h.hp+=heal;universalHeal(this,h,heal);this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:`+${Math.round(heal)}`,life:.8,max:.8,color:'#b7f99d'});this.emit('heal',{id:h.id});}
   universalPickup(this,h,p,heal);collected.add(p.id);
  }
  this.pickups=this.pickups.filter(p=>!collected.has(p.id));
 }
 resolveBodies(){
  const grid=new Map(),cell=80,maxRadius=Math.max(22,...this.enemies.map(e=>enemyDef(e).bodyRadius||22));
  for(const e of this.enemies){const key=`${Math.floor(e.x/cell)},${Math.floor(e.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);}
  for(const a of this.enemies){const gx=Math.floor(a.x/cell),gy=Math.floor(a.y/cell),ra=enemyDef(a).bodyRadius||22,reach=Math.ceil((ra+maxRadius)/cell);
   for(let dx=-reach;dx<=reach;dx++)for(let dy=-reach;dy<=reach;dy++)for(const b of grid.get(`${gx+dx},${gy+dy}`)||[]){if(b.id<=a.id)continue;const rb=enemyDef(b).bodyRadius||22,rr=ra+rb,d=dist(a,b);if(d>=rr)continue;const v=d?norm(a.x-b.x,a.y-b.y):norm(Math.cos(a.id),Math.sin(a.id)),fixedA=a.action?.kind==='dash'||a.boss||a.objectivePart,fixedB=b.action?.kind==='dash'||b.boss||b.objectivePart,amount=Math.min(5,rr-d)*.5;if(!fixedA)this.moveActor(a,v.x*amount,v.y*amount,ra);if(!fixedB)this.moveActor(b,-v.x*amount,-v.y*amount,rb);}
   if(a.spawnGrace>0||a.hp<=0||a.bonusKind||a.objectivePart||a.kind==='mossbell'&&a.action?.kind==='leap'&&a.action.t>=a.action.windup*.45&&a.action.t<a.action.windup)continue;
   for(const h of this.heroes){if(h.down||dist(a,h)>=ra+17||!this.lineClear(a,h))continue;const stats=combatStats(a,this.enraged),contact=stats.contactDamage??Math.max(2,stats.damage*.25);this.damageHero(h,contact,{x:a.x,y:a.y,attackId:`contact:${a.id}:${Math.floor(this.time/.8)}`},a);if(h.action?.type!=='dodge'&&!a.boss){const v=norm(a.x-h.x,a.y-h.y),overlap=ra+17-dist(a,h);this.moveActor(a,v.x*Math.min(4,overlap),v.y*Math.min(4,overlap),ra);}else if(a.kind==='mossbell'&&h.action?.type!=='dodge'){const d=dist(a,h),v=d?norm(h.x-a.x,h.y-a.y):{x:1,y:0},overlap=Math.max(0,ra+17-d);this.moveActor(h,v.x*overlap,v.y*overlap);}}
  }
 }
 updateHazards(dt){for(const f of this.hazards){f.life-=dt;f.timer-=dt;const h=this.heroes[f.owner];if(f.type==='coldfield'&&h?.down){f.life=0;continue;}if(f.life<=0||f.timer>0)continue;f.timer+=.65;for(const target of f.type==='poison'?this.heroes:this.enemies){if(target.hp<=0||dist(target,f)>=f.r||!this.lineClear(f,target))continue;if(f.type==='poison')this.damageHero(target,f.damage,{...f,attackId:`hazard:${f.id??f.enemyOwner}:${Math.floor(this.time/.65)}`},this.enemies.find(m=>m.id===f.enemyOwner));else{if(f.type==='coldfield')addChill(this,target,h);this.damageEnemy(target,f.damage,h,0,'dot');}}}this.hazards=this.hazards.filter(f=>f.life>0);}
 updateEnemy(e,dt){
  if(e.bonusKind){updateBonusEnemy(this,e,dt);return;}
  const d=combatStats(e,this.enraged);if(e.spawnGrace>0){e.spawnGrace=Math.max(0,e.spawnGrace-dt);return;}if(d.behavior==='healer'&&e.freeze>0&&e.action&&!e.action.hit){e.action=null;e.cd=Math.max(e.cd||0,.85);}if(e.affixes?.includes('regen')&&this.time-(e.lastHit??-9)>1.5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.003*e.rarity*dt);e.hitFlash=Math.max(0,e.hitFlash-dt);e.visualStop=Math.max(0,e.visualStop-dt);if(e.hitReaction)e.hitReaction.life=Math.max(0,e.hitReaction.life-dt);e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,(e.freeze||0)-dt);
  e.brittle=Math.max(0,...Object.values(e.chillBy||{}).map(s=>s.brittleUntil-this.time));for(const s of e.statuses||[]){s.life-=dt;s.timer-=dt;if(s.timer<=0){s.timer+=1;this.damageEnemy(e,s.damage,this.heroes[s.owner],0,'dot');}}e.statuses=(e.statuses||[]).filter(s=>s.life>0);if(e.hp<=0)return;if(e.boss){e.freeze=0;if(e.kind==='mossbell')updateMossbell(this,e,dt);else updateBoss(this,e,dt);return;}if(e.objectivePart){e.knock={x:0,y:0};e.freeze=0;return;}if(e.freeze>0)return;
  // Braced charges keep their locked corridor; damage and freeze still apply.
  if(e.action?.kind!=='dash')this.moveActor(e,e.knock.x*dt,e.knock.y*dt,22);e.knock.x*=Math.exp(-dt*10);e.knock.y*=Math.exp(-dt*10);e.cd=Math.max(0,e.cd-dt);
  if(updateSiegeEnemy(this,e,dt))return;
  const target=this.heroes.filter(h=>!h.down).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!target)return;
  if(e.action){const a=e.action,previousTime=a.t;a.t+=dt;
   if(d.behavior==='dash'&&a.from&&a.t>=a.windup&&previousTime<a.windup+a.travelTime){
    const delta=clamp((a.t-a.windup)/a.travelTime,0,1)-clamp((previousTime-a.windup)/a.travelTime,0,1),from={x:e.x,y:e.y};
    let end={x:e.x+(a.x-a.from.x)*delta,y:e.y+(a.y-a.from.y)*delta};
    const block=Math.min(1,...this.obstacles.map(o=>segmentCircle(from,end,o,o.r+22)));
    if(block<1){end={x:from.x+(end.x-from.x)*Math.max(0,block-.001),y:from.y+(end.y-from.y)*Math.max(0,block-.001)};a.blocked=true;}
    if(!a.stopped){this.moveActor(e,end.x-e.x,end.y-e.y,22);for(const h of this.heroes)if(!h.down&&!a.victims.has(h.id)&&segmentCircle(from,e,h,a.r)<Infinity&&this.lineClear(e,h)){a.victims.add(h.id);this.damageHero(h,d.damage,e);}e.stride+=dt*6;}
    if(a.blocked)a.stopped=true;
   }
   if(!a.hit&&a.t>=a.windup){a.hit=true;
    if(d.behavior==='leap')this.moveActor(e,a.x-e.x,a.y-e.y,22);
    if(d.behavior==='healer'){for(const ally of healingTargets(this,e)){ally.hp=Math.min(ally.maxHp,ally.hp+22);this.effects.push({type:'heal',x:ally.x,y:ally.y,r:30,life:.5,max:.5});}}
    else if(['ranged','burst'].includes(d.behavior)){const angle=Math.atan2(a.y-e.y,a.x-e.x);for(const off of d.behavior==='burst'?[-.2,0,.2]:[0])this.projectiles.push({id:this.nextId++,hostile:true,enemyOwner:e.id,type:d.behavior==='burst'?'fireball':'arrow',x:e.x,y:e.y,dx:Math.cos(angle+off),dy:Math.sin(angle+off),damage:d.damage,speed:280,life:2.4,hit:new Set()});}
    else if(d.behavior==='poison')this.hazards.push({type:'poison',enemyOwner:e.id,x:a.x,y:a.y,r:a.r,life:3.5,timer:0,damage:d.damage});
    else if(d.behavior!=='dash'){for(const h of this.heroes)if(!h.down&&dist(h,a)<a.r&&this.lineClear(e,h))this.damageHero(h,d.damage,e);this.effects.push({type:'impact',x:a.x,y:a.y,r:a.r,life:.25,max:.25});}
   }if(a.t>a.windup+(a.travelTime||0)+.32)e.action=null;return;
  }
  const distance=dist(e,target),heals=d.behavior==='healer'&&healingTargets(this,e).length>0;
  if(e.cd===0&&(d.behavior==='healer'?heals:distance<d.range&&this.lineClear(e,target))){const aim=heals?{x:e.x,y:e.y}:aimPoint(target,d,()=>this.random(),MAP);
   const from={x:e.x,y:e.y};let travelTime=0;
   if(d.behavior==='dash'){const v=norm(aim.x-e.x,aim.y-e.y),travel=Math.min(d.chargeRange,dist(e,aim)+65);aim.x=clamp(e.x+v.x*travel,-MAP.x+22,MAP.x-22);aim.y=clamp(e.y+v.y*travel,-MAP.y+22,MAP.y-22);travelTime=Math.max(.001,dist(e,aim)/d.chargeSpeed);}
   e.action={t:0,attackId:this.nextAttackId++,...aim,from:d.behavior==='dash'?from:undefined,travelTime,victims:new Set(),r:d.radius,windup:d.windup,hit:false,kind:d.behavior};e.cd=d.cd;e.face=dir8(aim.x-e.x,aim.y-e.y);return;}
  const ranged=['ranged','burst','poison','healer'].includes(d.behavior),ideal=ranged?d.range*.72:55;
  if(Math.abs(distance-ideal)>20){const v=norm(target.x-e.x,target.y-e.y),sign=ranged&&distance<ideal?-1:1,sp=d.speed*(e.slow>0?.38:1);
   e.steerTimer=(e.steerTimer||0)-dt;if(e.steerTimer<=0){e.steerTimer=.8+this.random()*.65;e.steer=(this.random()<.5?-1:1)*(.65+this.random()*.35);}
   const side=(d.flank||.12)*e.steer*Math.min(1,distance/150),lead=d.lead?Math.min(.4,d.lead):0;
   const pursue=norm(v.x*sign-v.y*side+(target.vx||0)*lead/Math.max(150,distance),v.y*sign+v.x*side+(target.vy||0)*lead/Math.max(150,distance));
   this.moveActor(e,pursue.x*sp*dt,pursue.y*sp*dt,22);e.face=dir8(v.x,v.y);e.stride+=dt*sp/60;}
 }
 faceToward(h,x,y){const a=Math.atan2(y,x),old=h.face*Math.PI/4;const diff=Math.atan2(Math.sin(a-old),Math.cos(a-old));if(Math.abs(diff)>Math.PI/8+.08)h.face=dir8(x,y);}
 aiInput(h){return companionInput(this,h,ROLES[h.role],MAP);}
 beginUpgrade(){this.xp=Math.max(0,this.xp-this.xpNext);this.level++;for(const h of this.heroes)h.level=(h.level||this.level-1)+1;this.xpNext=xpRequired(this.level);this.beginReward('attribute');}
 rewardContext(){return {clears:this.clears,highReward:this.highReward};}
 applyHeroReward(h,key,options){return ATTRIBUTES.some(a=>a.key===key)?withEquipmentBase(h,()=>applyReward(h,key,options)):applyReward(h,key,options);}
 beginReward(type){
  if(type==='skill'&&this.objective?.kind==='clear'&&!this.objective.settled)resolveObjective(this,true);
  this.mode='upgrade';this.rewardType=type;this.clearBuffers();this.accumulator=0;this.ready=this.heroes.map(h=>h.ai);this.selection=[0,0,0];this.rewardMenus=[null,null,null];this.rewardError=null;if(type==='skill')this.clears++;
  this.highReward=type==='skill'&&(this.bossRoom||this.eliteChallenge);
  this.offers=this.heroes.map(h=>{
   if(type==='skill'&&this.bossRoom&&this.room===10&&!h.ai&&!h.reshaped){
    this.rewardMenus[h.id]={type:'route'};return [{key:'route:reward',kind:'route',icon:'focus',title:'领取高阶奖励',desc:'随机三选一，至少一张稀有；可能出现觉醒。',detail:'先选领取方式，再揭示候选'},...(h.core?[{key:'route:core',kind:'route',icon:'retry',title:'重塑职业核心',desc:'放弃本次高阶奖励，随机两个不同核心选一个；保留主动等级。',detail:'每人本局一次，选此项后不能改回高阶奖励'}]:[]),...(equippedSkills(h).every(slot=>h.skills[slot]>0)?[{key:'route:form',kind:'route',icon:'retry',title:'重塑技能形态',desc:'放弃本次高阶奖励，随机两种可用形态选一，清除该槽进化。',detail:'每人本局一次，选此项后不能改回高阶奖励'}]:[])];
   }
   return type==='skill'?rollSkills(h,()=>this.random(),this.rewardContext()):shuffle(withEquipmentBase(h,()=>attributePool(h)),()=>this.random()).slice(0,3);
  });
  for(const h of this.heroes.filter(h=>h.ai)){
   const selected=selectAiReward(h,this.offers[h.id]);if(!selected)continue;
   const result=this.applyHeroReward(h,selected.offer.key,selected.options);
   if(result?.ok&&(selected.options?.replaceKey||result.clearOwnedObjects))this.clearOwnedBuild(h);
  }
 }
 clearOwnedBuild(h){this.skillFields=(this.skillFields||[]).filter(f=>f.owner!==h.id);h.wallCharge=false;resetUniversal(this,h.id);resetEquipment(this,h.id);this.projectiles=this.projectiles.filter(p=>p.owner!==h.id);this.hazards=this.hazards.filter(p=>p.owner!==h.id);this.delayed=this.delayed.filter(p=>p.owner!==h.id);h.action=null;h.shadow=null;h.guardUntil=0;h.resource=0;h.storedGuard=0;h.counterReady=false;h.weakpointUntil=0;h.shadowRefundUntil=0;h.huntTarget=null;h.huntStacks=0;h.resourceEvents=new Set();for(const e of this.enemies){if(e.huntMarks)delete e.huntMarks[h.id];}}
 reroll(slot){
  if(this.mode!=='upgrade'||slot>=this.humanCount||this.ready[slot]||this.rewardMenus[slot])return false;const h=this.heroes[slot];if(!h.rerolls)return false;
  const previous=this.offers[slot],next=this.rewardType==='skill'?rollSkills(h,()=>this.random(),{...this.rewardContext(),previous:previous.map(o=>o.key)}):shuffle(withEquipmentBase(h,()=>attributePool(h)),()=>this.random()).slice(0,3);
  if(!next.length||next.every(o=>previous.some(p=>p.key===o.key)))return false;h.rerolls--;this.offers[slot]=next;this.selection[slot]=0;return true;
 }
 canKeepReward(slot){return this.mode==='upgrade'&&this.rewardType==='skill'&&Number.isInteger(slot)&&slot>=0&&slot<this.humanCount&&!this.rewardMenus[slot]&&Object.keys(this.heroes[slot]?.passives||{}).length>=4;}
 rewardChoices(slot){const offers=this.offers[slot]||[];return this.canKeepReward(slot)?[...offers,{key:'reward:keep',kind:'keep',icon:'confirm',title:'保留构筑 · 放弃本次奖励',desc:'保留所有技能和被动；不获得本次技能奖励，不消耗重掷。',detail:'独立操作，不占随机三选一'}]:offers;}
 keepReward(slot){if(!this.canKeepReward(slot)||this.ready[slot])return false;this.selection[slot]=this.offers[slot].length;this.rewardError=null;this.ready[slot]=true;this.emit('rewardKept',{id:slot});if(this.ready.every(Boolean))this.finishReward();return true;}
 choose(slot,index){if(this.mode==='upgrade'&&slot<this.humanCount&&!this.ready[slot]){this.selection[slot]=clamp(index,0,this.rewardChoices(slot).length-1);this.rewardError=null;}}
 cancelReplacement(slot){const menu=this.rewardMenus[slot];if(this.mode!=='upgrade'||this.ready[slot]||!['replace','skill-replace'].includes(menu?.type))return false;this.offers[slot]=menu.original;this.selection[slot]=menu.selection;this.rewardMenus[slot]=null;this.rewardError=null;return true;}
 setFeedElement(slot,element){const h=this.heroes[slot];if(this.mode!=='upgrade'||slot>=this.humanCount||this.ready[slot]||!h?.passives.elementFeed||!['burn','chill'].includes(element)||!universalSources(h)[element])return false;h.universal??={};h.universal.feedElement=element;return true;}
 confirm(slot){
  if(this.mode!=='upgrade'||slot>=this.humanCount||this.ready[slot])return;const h=this.heroes[slot],o=this.rewardChoices(slot)[this.selection[slot]];if(!o)return;if(o.key==='reward:keep'){this.keepReward(slot);return;}if(o.disabled){this.rewardError={slot,text:'此项是新卡的必要来源，请选其他项或取消'};return;}const menu=this.rewardMenus[slot];
  if(menu?.type==='route'){
   const type=o.key.split(':')[1];this.offers[slot]=type==='reward'?rollSkills(h,()=>this.random(),{...this.rewardContext(),highReward:true}):rollReshape(h,()=>this.random(),type);this.selection[slot]=0;this.rewardMenus[slot]=type==='reward'?null:{type:'reshape'};return;
  }
  const key=['replace','skill-replace'].includes(menu?.type)?menu.pendingKey:o.key,result=this.applyHeroReward(h,key,menu?.type==='skill-replace'?{replaceSkill:Number(o.key.split(':')[1])}:menu?.type==='replace'?{replaceKey:o.key.replace('replace:','')}:{});
  if(result?.status==='skill-replace-required'){this.rewardMenus[slot]={type:'skill-replace',pendingKey:key,original:this.offers[slot],selection:this.selection[slot]};this.offers[slot]=result.options.map((old,button)=>({key:'replaceSkill:'+old,kind:'replacement',icon:ACTIVE[h.role][old].icon,title:'替换 '+(button?'E / Y':'Q / X')+' · '+ACTIVE[h.role][old].title,desc:'旧技能等级、形态和进阶清空，新技能从 I 开始；原组合精通可能停用。',detail:'可取消返回原候选'}));this.selection[slot]=0;return;}
  if(result?.status==='replace-required'){
   this.rewardMenus[slot]={type:'replace',pendingKey:key,original:this.offers[slot],selection:this.selection[slot]};
   this.offers[slot]=result.options.map(old=>{const impacts=replacementImpacts(h,old),incoming=key.split(':')[1],probe={...h,passives:{...h.passives}};delete probe.passives[old];const check=applyReward(probe,key),blocked=check.ok===false;return {disabled:blocked,key:'replace:'+old,kind:'replacement',icon:PASSIVES[old]?.icon||'retry',title:`替换 · ${PASSIVES[old]?.title||old} ${h.passives[old]}`,desc:`失去此卡及等级，换入 ${PASSIVES[key.split(':')[1]]?.title||key} I。${blocked?'新卡失去来源，不能替换。':impacts.length?'停用：'+impacts.map(p=>p.title).join('、'):'其余组件来源保留。'}`,detail:'取消返回原候选'};});this.selection[slot]=0;return;
  }
  if(result?.ok===false){this.rewardError={slot,text:result.reason||'当前条件不满足，请更换选择'};this.emit('rewardInvalid',{id:slot,reason:result.reason||'条件不满足'});return;}
  if(['replace','skill-replace'].includes(menu?.type)||result?.clearOwnedObjects)this.clearOwnedBuild(h);if(['replace','skill-replace'].includes(menu?.type)){this.offers[slot]=menu.original;this.selection[slot]=menu.original.findIndex(o=>o.key===key);}this.rewardMenus[slot]=null;this.rewardError=null;this.ready[slot]=true;if(!this.ready.every(Boolean))return;this.finishReward();
 }
 settleWave(){
  this.projectiles=[];this.hazards=[];this.skillFields=[];this.delayed=[];this.effects=[];this.bossWarnings=[];resetUniversal(this);resetEquipment(this);
  for(const hero of this.heroes){hero.action=null;hero.shadow=null;hero.wallCharge=false;hero.guardUntil=0;hero.resource=0;hero.storedGuard=0;hero.counterReady=false;hero.charged=0;hero.empowered=0;hero.revive=0;if(hero.down){hero.down=false;hero.hp=hero.maxHp*.35;}else hero.hp=Math.min(hero.maxHp,hero.hp+hero.maxHp*.15);hero.invuln=1;}
 }
 finishReward(){
  this.clearBuffers();this.accumulator=0;
  if(this.rewardType==='attribute'){this.mode='play';if(this.xp>=this.xpNext)this.beginUpgrade();return;}
  this.settleWave();
  this.eliteChallenge=false;
  if(tryBonusEvent(this))return;this.resumeAfterWave();
 }
 resumeAfterWave(){
  this.clearBuffers();
  if(this.wave===1&&!this.bossRoom){this.wave=2;this.mode='play';this.spawnWave();this.emit('wave');}else{this.mode=this.routeLoot?'routeReward':'complete';this.emit('complete');if(!this.routeLoot)enterShop(this);}
 }
 canChallenge(){return this.mode==='complete'&&!this.challengeUsed&&this.room+1>=14&&this.room+1<=16;}
 toggleChallenge(){if(this.canChallenge())this.challengeNext=!this.challengeNext;}
 nextRoom(){if(this.mode!=='complete')return;if(shopDue(this)){enterShop(this);return;}if(openRoute(this))return;this.room++;this.wave=1;this.mode='play';this.eliteChallenge=!!this.challengeNext;this.challengeNext=false;if(this.eliteChallenge)this.challengeUsed=true;this.clearBuffers();for(const h of this.heroes){h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.12);h.action=null;h.invuln=1;}this.spawnWave();}
 startEndless(){if(this.mode!=='victory')return;this.endless=true;this.mode='complete';this.nextRoom();}
 enterShop(){return enterShop(this,this.mode==='victory'?'victory':'complete');}
 rerollShop(slot){return rerollShop(this,slot);}
 buyLesson(slot,targetId,uid){return buyShopLesson(this,slot,targetId,uid);}
 buyEquipment(slot,index,targetId,uid){return buyShopEquipment(this,slot,index,targetId,uid);}
 recruit(slot,uid,replaceId=null){return recruitShop(this,slot,uid,replaceId);}
 leaveShop(slot){return leaveShop(this,slot);}
 snapshot(){return{objective:this.objective,route:this.route,routeMenu:this.routeMenu,routeLoot:this.routeLoot,bonusEvent:this.bonusEvent,lastBonusReport:this.lastBonusReport,shop:this.shop,equipmentObjects:this.equipmentObjects,mode:this.mode,reason:this.reason,humanCount:this.humanCount,map:MAP,endless:this.endless,eliteChallenge:this.eliteChallenge,pressure:this.pressure?{...this.pressure,spawned:this.pressureState?.spawned,closed:this.pressureClosed}:null,pets:this.pets,universalObjects:this.universalObjects,rewardMenus:this.rewardMenus.map(m=>m?{type:m.type,pendingKey:m.pendingKey}:null),xp:this.xp,xpNext:this.xpNext,rewardType:this.rewardType,clears:this.clears,enraged:this.enraged,enrageAt:this.enrageAt,waveElapsed:this.waveElapsed,waveDuration:this.waveDuration,batches:{spawned:this.batchSpawned,total:this.batchTotal,pending:this.spawnQueue.length,nextAt:this.spawnQueue[0]?.at},bossRoom:this.bossRoom,bossWarnings:this.bossWarnings,pickups:this.pickups,hazards:this.hazards,skillFields:(this.skillFields||[]).map(f=>({kind:f.kind,owner:f.owner,x:f.x,y:f.y,r:f.r,life:f.life})),coordinateSystem:'ground center (0,0), x right, y down, screen y scaled 0.707',time:+this.time.toFixed(3),room:this.room,wave:this.wave,level:this.level,kills:this.kills,heroes:this.heroes.map(h=>({id:h.id,role:h.role,ai:h.ai,gold:h.gold,name:h.name,rarity:h.rarity,level:h.level,equipment:h.equipment,x:+h.x.toFixed(2),y:+h.y.toFixed(2),hp:+h.hp.toFixed(1),maxHp:h.maxHp,down:h.down,revive:+h.revive.toFixed(2),face:h.face,action:h.action?.type||'idle',actionTime:h.action?.t,phase:actionPhase(h.action),aiIntent:h.aiIntent||null,hitReaction:h.hitReaction?.life||0,invuln:h.invuln,cooldowns:[...h.cd,h.dodgeCd],power:h.power,skills:h.skills,loadout:equippedSkills(h),skillAdvances:h.skillAdvances,pairMastery:h.pairMastery,evolved:h.evolved,passives:h.passives,core:h.core,runes:h.runes,forms:h.forms,evolutionBranches:h.evolutionBranches,awakening:h.awakening,pickupRadius:h.pickupRadius,universal:h.universal?{feedElement:h.universal.feedElement,ammo:h.universal.ammo,stepUntil:h.universal.stepUntil}:null,resource:h.resource,storedGuard:h.storedGuard,huntStacks:h.huntStacks,huntTarget:h.huntTarget,shadow:h.shadow,rerolls:h.rerolls,shield:h.shield,stats:{crit:h.crit,critDamage:h.critDamage,evasion:h.evasion,armor:h.armor,haste:h.haste,range:h.rangeBonus,dotPower:h.dotPower,shieldPower:h.shieldPower},damageDone:h.damageDone})),enemies:this.enemies.map(e=>({id:e.id,kind:e.kind,bonusKind:e.bonusKind,rarity:e.rarity,affixes:e.affixes,progress:e.progress,boss:e.boss,phase:e.phase,stagger:e.stagger||0,exposed:e.staggerUntil>this.time,objectivePart:!!e.objectivePart,siege:!!e.siege,combat:{speed:combatStats(e,this.enraged).speed,damage:combatStats(e,this.enraged).damage,cd:combatStats(e,this.enraged).cd},x:+e.x.toFixed(1),y:+e.y.toFixed(1),hp:+e.hp.toFixed(1),brittle:e.brittle||0,huntMarks:e.huntMarks,statuses:e.statuses,attack:e.action?{kind:e.action.kind,from:e.action.from,travelTime:e.action.travelTime,hit:e.action.hit,x:e.action.x,y:e.action.y,r:e.action.r,t:e.action.t,windup:e.action.windup}:null})),projectiles:this.projectiles.length,ready:this.ready,selection:this.selection,offers:this.offers,obstacles:this.obstacles,camera:this.camera};}
}
