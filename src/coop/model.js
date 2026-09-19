import {ACTIVE,CORES,applyReward,attributePool,shuffle,rollSkills} from './builds.js';
import {ENEMIES,enemyDef} from './enemies.js';
import {actionTiming,actionPhase} from './combat-motion.js';
import {segmentCircle} from './collision.js';
import {companionInput} from './ai.js';
import {waveNumber,wavePlan,scaledEnemy,rareRoll,BOSS_DEF} from './encounters.js';
import {updateBoss,updateBossWarnings} from './boss.js';
import {rageDeadline,combatStats,aimPoint} from './enemy-tactics.js';
export const MAP_SCALE=Math.sqrt(6),MAP={x:550*MAP_SCALE,y:345*MAP_SCALE};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const len=(x,y)=>Math.hypot(x,y);
export const dist=(a,b)=>len(a.x-b.x,a.y-b.y);
export const norm=(x,y)=>{const l=len(x,y);return l?{x:x/l,y:y/l}:{x:0,y:0};};
export const dir8=(x,y)=>((Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8);
export const ROLES={warrior:{name:'战士',hp:200,speed:175,range:145,damage:19,interval:.57,skills:['盾冲','旋风斩'],cd:[3.2,5]},mage:{name:'法师',hp:90,speed:170,range:340,damage:13,interval:.76,skills:['火球','冰霜环'],cd:[2.8,5]},archer:{name:'弓手',hp:105,speed:188,range:370,damage:12,interval:.5,skills:['贯穿箭','箭雨扇射'],cd:[3,4.5]}};
export function analog(x,y,dead=.18){const m=len(x,y);if(m<=dead)return{x:0,y:0};const n=norm(x,y),s=clamp((m-dead)/(1-dead),0,1);return{x:n.x*s,y:n.y*s};}
const baseInput=()=>({x:0,y:0,dodge:false,skill1:false,skill2:false});
const OBSTACLES=[{x:-415*MAP_SCALE,y:-150*MAP_SCALE,r:35},{x:420*MAP_SCALE,y:150*MAP_SCALE,r:40},{x:100*MAP_SCALE,y:-300*MAP_SCALE,r:26}];
export class World{
 constructor(seed=17){this.seed=seed;this.mode='menu';this.reset(['warrior','mage']);this.mode='menu';}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(roles=['warrior','mage'],humanCount=2){if(roles[0]===roles[1]||roles.some(r=>!ROLES[r]))throw Error('Two distinct roles required');this.humanCount=humanCount===1?1:2;this.time=0;this.tick=0;this.accumulator=0;this.pendingEdges=[{},{}];this.mode='play';this.reason='';this.room=1;this.wave=1;this.level=1;this.kills=0;this.xp=0;this.xpNext=5;this.rewardType=null;this.enemies=[];this.projectiles=[];this.effects=[];this.hazards=[];this.pickups=[];this.delayed=[];this.events=[];this.nextId=10;this.waveTimer=0;this.waveElapsed=0;this.spawnQueue=[];this.bossWarnings=[];this.obstacles=OBSTACLES;this.ready=[false,false];this.selection=[0,0];this.offers=[];this.camera={x:0,y:0,zoom:.8};this.shake=0;this.options={feedback:true,shake:true,sound:true};
  const all=[...roles,...Object.keys(ROLES).filter(r=>!roles.includes(r))];this.heroes=all.map((role,i)=>({id:i,role,ai:i>=this.humanCount,x:-140+i*120,y:i===2?110:35,hp:ROLES[role].hp,maxHp:ROLES[role].hp,power:1,speedBonus:1,skillPower:1,rangeBonus:1,haste:1,crit:0,critDamage:1.5,evasion:0,armor:0,cooldown:0,recovery:1,skills:[0,0],evolved:[false,false],passives:{},core:null,runes:[null,null],shield:0,casts:0,swings:0,directHits:0,charged:0,empowered:0,cd:[0,0],dodgeCd:0,attackCd:0,action:null,move:{x:0,y:0},lastMove:{x:1,y:0},face:0,stride:0,gait:0,hitFlash:0,visualStop:0,invuln:0,down:false,revive:0,buffer:null,damageDone:0}));this.spawnWave();}
 createEnemy(kind,x,y,rank=0){const base=kind==='thornking'?BOSS_DEF:ENEMIES[kind],growth=scaledEnemy(base,waveNumber(this.room,this.wave),rank,()=>this.random()),hp=growth.stats.hp;return{id:this.nextId++,kind,x,y,hp,maxHp:hp,...growth,boss:kind==='thornking',phase:1,skillCursor:0,ultimateCd:8,action:null,cd:1+this.random()*.5,hitFlash:0,visualStop:0,slow:0,freeze:0,statuses:[],face:4,stride:0,knock:{x:0,y:0}};}
 spawnWave(){this.waveTimer=0;this.waveElapsed=0;this.enraged=false;this.bossRoom=this.room%10===0;this.bossWarnings=[];
  const plan=wavePlan(this.room,this.wave);this.waveDuration=this.bossRoom?0:plan.duration;this.batchTotal=this.bossRoom?1:plan.batches.length;this.batchSpawned=0;this.spawnQueue=[];this.enrageAt=rageDeadline(this.waveDuration,this.bossRoom);
  if(this.bossRoom){const boss=this.createEnemy('thornking',0,-80);boss.hp=boss.maxHp=Math.round(2600*(1+(this.room/10-1)*.6));this.enemies.push(boss);this.batchSpawned=1;return;}
  this.spawnQueue=plan.batches;this.spawnBatch(this.spawnQueue.shift());
 }
 spawnBatch(batch){this.batchSpawned++;const keys=Object.keys(ENEMIES),alive=this.heroes.filter(h=>!h.down),center={x:alive.reduce((n,h)=>n+h.x,0)/Math.max(1,alive.length),y:alive.reduce((n,h)=>n+h.y,0)/Math.max(1,alive.length)};
  for(let i=0;i<batch.count;i++){const angle=i/batch.count*Math.PI*2+batch.index*.83,radius=460+this.random()*140,kind=keys[((this.room-1)*7+(this.wave-1)*5+batch.index*3+i)%keys.length],rank=rareRoll(()=>this.random(),waveNumber(this.room,this.wave));const e=this.createEnemy(kind,clamp(center.x+Math.cos(angle)*radius,-MAP.x+45,MAP.x-45),clamp(center.y+Math.sin(angle)*radius,-MAP.y+45,MAP.y-45),rank);this.moveActor(e,0,0,22);e.spawnGrace=1;e.cd=Math.max(1,e.cd);this.enemies.push(e);this.effects.push({type:'spawn',x:e.x,y:e.y,r:32,life:1,max:1});}
  this.emit('reinforcements',{batch:this.batchSpawned,count:batch.count});
 }
 updateSpawns(dt){this.waveElapsed+=dt;if(!this.enraged&&this.waveElapsed>=this.enrageAt){this.enraged=true;this.emit('enrage');}while(this.spawnQueue.length&&this.waveElapsed>=this.spawnQueue[0].at){if(this.enemies.length>100)break;this.spawnBatch(this.spawnQueue.shift());}}
 pause(reason='暂停'){if(this.mode==='play'||this.mode==='upgrade'){this.resumeMode=this.mode;this.mode='paused';this.reason=reason;this.clearBuffers();}}
 resume(){if(this.mode==='paused'){this.mode=this.resumeMode||'play';this.reason='';this.clearBuffers();}}
 clearBuffers(){this.pendingEdges=[{},{}];for(const h of this.heroes){h.buffer=null;h.move={x:0,y:0};}}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>80)this.events.shift();}
 request(h,type,input){if(h.down)return false;const moving=len(input.x,input.y)>.01;const v=moving?norm(input.x,input.y):h.lastMove;h.buffer={type,expires:this.time+.14,dir:{...v}};return this.consume(h);}
 consume(h){const b=h.buffer;if(!b)return false;if(this.time>b.expires){h.buffer=null;return false;}const a=h.action;if(b.type==='dodge'){
   if(h.dodgeCd>0||a?.type==='dodge'||(a&&a.type!=='attack'&&a.t<(a.cancelAt??a.duration*.55)))return false;
   h.visualStop=0;h.hitPose=null;h.action={type:'dodge',t:0,duration:.29,dir:b.dir,hit:new Set()};h.invuln=.15;h.dodgeCd=.85;h.empowered=h.passives.momentum?3:0;h.buffer=null;this.emit('dodge',{id:h.id});return true;
  }
  const s=b.type==='skill1'?0:1;if(!h.skills[s]){h.buffer=null;return false;}if(h.cd[s]>0||(a&&a.type!=='attack'))return false;
  const target=this.nearest(h,520);const d=target?norm(target.x-h.x,target.y-h.y):b.dir;
  const type=h.role==='warrior'?(s===0?'bash':'spin'):h.role==='mage'?(s===0?'fireball':'frost'):(s===0?'pierce':'fan');
  h.visualStop=0;h.hitPose=null;h.action={type,slot:s,t:0,...actionTiming(h.role,type),facing:dir8((type==='bash'?b.dir:d).x,(type==='bash'?b.dir:d).y),dir:type==='bash'?b.dir:d,hit:new Set(),fired:false};h.cd[s]=ROLES[h.role].cd[s]*(1-h.cooldown)*(h.runes[s]==='quick'?.75:h.runes[s]==='force'?1.2:h.runes[s]==='wide'?1.15:1)*(h.core==='arcanist'||h.core==='executioner'?1.15:h.core==='pyromancer'&&s===1?1.3:1);h.shield=Math.min(60,h.shield+(h.passives.guard||0)*8+(h.core==='bulwark'?25:0));h.charged=h.passives.arcane||0;h.casts++;if(h.core==='arcanist'&&h.casts%3===0)this.delayed.push({type:'arcane',owner:h.id,delay:h.action.windup,damage:this.skillDamage(h,s,40)*.6});h.buffer=null;h.face=dir8(h.action.dir.x,h.action.dir.y);this.emit('skill',{id:h.id,skill:type});return true;
 }
 nearest(h,range=Infinity){let best=null,d=range;for(const e of this.enemies){const n=dist(h,e);if(e.hp>0&&n<d&&this.lineClear(h,e)){best=e;d=n;}}return best;}
 lineClear(a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;return !this.obstacles.some(o=>{const t=l?clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/l,0,1):0;return len(a.x+t*dx-o.x,a.y+t*dy-o.y)<o.r;});}
 moveActor(h,dx,dy,r=17){h.x=clamp(h.x+dx,-MAP.x+r,MAP.x-r);h.y=clamp(h.y+dy,-MAP.y+r,MAP.y-r);for(const o of this.obstacles){const d=dist(h,o),rr=r+o.r;if(d<rr){const n=d?norm(h.x-o.x,h.y-o.y):{x:1,y:0};h.x=o.x+n.x*rr;h.y=o.y+n.y*rr;}}}
 damageEnemy(e,n,h,knock=70,source='attack',extraCrit=0,incoming=null){if(e.hp<=0)return;let crit=false;const direct=source==='attack'||source==='skill';if(direct){if(h.core==='berserker')n*=1.35*(h.hp<h.maxHp*.5?1.25:1);if(source==='attack'){if(h.core==='bulwark')n*=.85;if(h.core==='whirlwind')n*=.9;if(h.core==='ranger')n*=.85;if(h.charged){n*=1+h.charged*.25;h.charged=0;}}if(h.core==='sniper')n*=dist(h,e)>230?1.55:dist(h,e)<130?.8:1;if(h.core==='frostweaver'&&e.freeze>0)n*=1.45;if((e.slow>0||e.freeze>0)&&h.passives.shatter)n*=1+h.passives.shatter*.1;if(e.hp<e.maxHp*.3&&h.passives.focus)n*=1+h.passives.focus*.2;}
  if(direct){crit=h.empowered>0||this.random()<h.crit+extraCrit;if(crit)n*=h.critDamage;if(h.empowered>0){n*=1+(h.passives.momentum||0)*.1;h.empowered=0;}
   if(e.kind==='beetle'){const facing={x:Math.cos(e.face*Math.PI/4),y:Math.sin(e.face*Math.PI/4)},v=incoming?{x:-incoming.x,y:-incoming.y}:norm(h.x-e.x,h.y-e.y);if(v.x*facing.x+v.y*facing.y>.25)n*=.5;}
   if(h.passives.chill)e.slow=Math.max(e.slow,.1+h.passives.chill*.4);
   e.statuses??=[];const dot=(type,damage)=>{const old=e.statuses.find(s=>s.type===type&&s.owner===h.id);if(old){old.life=3;old.damage=damage;}else e.statuses.push({type,damage,life:3,timer:1,owner:h.id});};
   if((source==='skill'&&h.passives.ember)||h.core==='pyromancer')dot('burn',(h.passives.ember||0)*4+(h.core==='pyromancer'?8:0));if(crit&&(h.passives.blood||h.core==='executioner'))dot('bleed',(h.passives.blood||1)*5);if(h.core==='frostweaver'&&source==='attack'){e.frostStacks=(e.frostStacks||0)+1;e.slow=Math.max(e.slow,.65);if(e.frostStacks>=3){e.freeze=e.boss?0:.7;e.frostStacks=0;}}
  }
  n*=1-(e.stats?.armor||0);e.lastHit=this.time;e.hp-=n;h.damageDone+=n;const d=incoming||norm(e.x-h.x,e.y-h.y);if(source!=='dot'){e.hitFlash=.16;e.visualStop=n>=28?.055:.035;e.hitPose={stride:e.stride,action:e.action?{...e.action}:null};e.hitReaction={x:d.x,y:d.y,life:.24,max:.24,power:n>=28?1.3:1};if(h.role==='warrior'){h.visualStop=.035;h.hitPose={stride:h.stride,action:h.action?{...h.action}:null};}if(!incoming)this.contact(e,d,n>=28?68:48);}e.knock={x:d.x*knock,y:d.y*knock};this.effects.push({type:'number',x:e.x+12*((e.id%3)-1),y:e.y,height:enemyDef(e).size+36,text:`${crit?'暴击 ':''}${Math.round(n)}`,life:.7,max:.7,color:crit?'#ffce71':'#fff0b4'});this.emit('hit',{id:h.id,heavy:n>=28});if(n>=28)this.shake=Math.min(.12,this.shake+.05);
  if(direct&&h.passives.chain&&++h.directHits%4===0){const targets=this.enemies.filter(o=>o!==e&&o.hp>0&&dist(e,o)<190&&this.lineClear(e,o)).sort((a,b)=>dist(e,a)-dist(e,b)).slice(0,h.passives.chain);for(const other of targets){this.damageEnemy(other,n*.35,h,25,'proc');this.effects.push({type:'chain',x:e.x,y:e.y,to:{x:other.x,y:other.y},life:.16,max:.16,layer:'depth'});}}
  if(e.hp<=0){const burning=e.statuses?.some(s=>s.type==='burn'),bleeding=e.statuses?.some(s=>s.type==='bleed');if(burning&&(h.passives.detonate||h.core==='pyromancer')){const boom=(h.passives.detonate||0)*12+(h.core==='pyromancer'?28:0);this.effects.push({type:'blast',x:e.x,y:e.y,r:110,life:.35,max:.35});for(const other of this.enemies)if(other!==e&&other.hp>0&&dist(e,other)<110&&this.lineClear(e,other))this.damageEnemy(other,boom,h,50,'proc');}if(bleeding&&h.core==='executioner')h.hp=Math.min(h.maxHp,h.hp+8);this.kills++;this.xp+=enemyDef(e).xp;this.effects.push({type:'poof',x:e.x,y:e.y,life:.35,max:.35});this.emit('kill',{id:h.id});if(this.random()<(e.boss?1:e.rarity ? .28+e.rarity*.18 : .28))this.pickups.push({id:this.nextId++,type:'potion',x:e.x,y:e.y});h.hp=Math.min(h.maxHp,h.hp+(h.passives.harvest||0)*3);h.cd=h.cd.map(cd=>Math.max(0,cd-(h.passives.echo||0)*.3));if(e.boss){for(const minion of this.enemies)if(minion.summonedBy===e.id)minion.hp=0;this.bossWarnings=[];this.projectiles=this.projectiles.filter(p=>p.bossOwner!==e.id);this.emit('bossDefeated');}}
 }
 damageHero(h,n,e,source=e){if(h.down||h.invuln>0)return;if(h.evasion>0&&this.random()<h.evasion){h.invuln=.22;this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:'闪避',life:.6,max:.6,color:'#9bf1d2'});return;}n*=h.core==='berserker'?1.15:1;const incoming=n*(1-h.armor),absorbed=Math.min(h.shield||0,incoming);h.shield=Math.max(0,(h.shield||0)-absorbed);const taken=Math.min(h.hp,incoming-absorbed);h.hp=Math.max(0,h.hp-taken);if(source.hp>0&&source.affixes?.includes('vampire'))source.hp=Math.min(source.maxHp,source.hp+taken*.4*source.rarity);h.invuln=.55;h.hitFlash=.22;h.visualStop=.045;h.hitPose={stride:h.stride,action:h.action?{...h.action}:null};this.emit('hurt',{id:h.id});const d=e.dx!==undefined?{x:e.dx,y:e.dy}:norm(h.x-e.x,h.y-e.y);h.hitReaction={x:d.x,y:d.y,life:.3,max:.3,power:1.25};this.contact(h,d,62,true);this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:`−${Math.round(taken)}`,life:.65,max:.65,color:'#ff9b88'});this.moveActor(h,d.x*18,d.y*18);if(taken>0&&(h.passives.thorns||h.core==='bulwark'))for(const foe of this.enemies)if(foe.hp>0&&dist(h,foe)<145)this.damageEnemy(foe,taken*((h.passives.thorns||0)*.3+(h.core==='bulwark'?.5:0)),h,50,'proc');if(!h.hp){h.down=true;h.action=null;h.buffer=null;this.emit('down',{id:h.id});}}
 contact(p,dir,size=48,hurt=false){this.effects.push({type:'contact',x:p.x,y:p.y,height:31,depthY:p.depthY??p.y+.1,dir:{...dir},size,hurt,life:.22,max:.22,layer:'depth'});}
 shoot(h,dir,type,damage,speed=470,source='attack',evolved=false,slot=0){this.projectiles.push({id:this.nextId++,owner:h.id,type,x:h.x,y:h.y,muzzle:43,dx:dir.x,dy:dir.y,damage,speed,life:1.7*(source==='skill'?this.skillRange(h,slot):h.rangeBonus),hit:new Set(),source,evolved,rangeBonus:source==='skill'?this.skillRange(h,slot):h.rangeBonus});}
 skillDamage(h,slot,base){return base*(1+Math.max(0,h.skills[slot]-1)*.34)*h.skillPower*(h.runes[slot]==='force'?1.3:h.runes[slot]==='quick'?.85:1)*(h.core==='frostweaver'&&slot===0?.8:1);}
 skillRange(h,slot){return h.rangeBonus*(h.runes[slot]==='wide'?1.25:1);}
 areaHit(h,r,damage,knock=100){for(const e of this.enemies)if(e.hp>0&&dist(h,e)<r&&this.lineClear(h,e))this.damageEnemy(e,damage,h,knock,'skill');}
 advance(seconds,inputs=[{},{}]){if(this.mode!=='play')return;for(let p=0;p<2;p++)for(const k of ['dodge','skill1','skill2'])this.pendingEdges[p][k] ||= !!inputs[p]?.[k];this.accumulator+=Math.max(0,seconds);while(this.mode==='play'&&this.accumulator+1e-9>=1/120){this.accumulator-=1/120;const sample=[0,1].map(p=>({...inputs[p],...this.pendingEdges[p]}));this.pendingEdges=[{dodge:false,skill1:false,skill2:false},{dodge:false,skill1:false,skill2:false}];this.step(1/120,sample);}}
 step(dt,inputs){if(this.mode!=='play')return;this.time+=dt;this.tick++;this.updateSpawns(dt);this.shake=Math.max(0,this.shake-dt);this.effects=this.effects.filter(f=>(f.life-=dt)>0);
  for(const h of this.heroes){let input={...baseInput(),...(inputs[h.id]||{})};if(h.ai)input=this.aiInput(h);h.cd=h.cd.map(t=>Math.max(0,t-dt));h.dodgeCd=Math.max(0,h.dodgeCd-dt);h.attackCd=Math.max(0,h.attackCd-dt);h.invuln=Math.max(0,h.invuln-dt);h.hitFlash=Math.max(0,h.hitFlash-dt);h.visualStop=Math.max(0,h.visualStop-dt);if(h.hitReaction)h.hitReaction.life=Math.max(0,h.hitReaction.life-dt);
   if(h.down){const helper=this.heroes.some(p=>!p.down&&p.id!==h.id&&dist(p,h)<82);h.revive=helper?h.revive+dt:Math.max(0,h.revive-dt*.5);if(h.revive>=2){h.down=false;h.hp=h.maxHp*.45;h.revive=0;h.invuln=1;this.emit('revive',{id:h.id});}continue;}
   const prior={x:h.x,y:h.y};const m=len(input.x,input.y);if(m>1){input.x/=m;input.y/=m;}h.move={x:input.x,y:input.y};if(m>.01)h.lastMove=norm(input.x,input.y);
   if(input.dodge)this.request(h,'dodge',input);else if(input.skill1)this.request(h,'skill1',input);else if(input.skill2)this.request(h,'skill2',input);this.consume(h);
   h.empowered=Math.max(0,h.empowered-dt);const a=h.action;const speed=ROLES[h.role].speed*h.speedBonus;
   if(a&&(a.type==='dodge'||a.type==='bash')){const old=a.t;a.t=Math.min(a.duration,a.t+dt);const windup=a.type==='bash'?(a.windup??0):0;const ease=t=>{const q=clamp((t*a.duration-windup)/(a.duration-windup),0,1);return 1-(1-q)**2;};const travel=a.type==='dodge'?112:145*(h.evolved[0]?1.3:1);const d=(ease(a.t/a.duration)-ease(old/a.duration))*travel;this.moveActor(h,a.dir.x*d,a.dir.y*d);h.face=dir8(a.dir.x,a.dir.y);}
   else{const previous={x:h.x,y:h.y};this.moveActor(h,input.x*speed*dt,input.y*speed*dt);const travel=Math.min(speed*dt,dist(previous,h));h.stride+=travel/92;const gaitTarget=Math.min(1,travel/Math.max(.001,speed*dt));h.gait+=(gaitTarget-(h.gait||0))*(1-Math.exp(-dt/.055));if(h.gait<.003)h.gait=0;if(m>.01&&!a)this.faceToward(h,input.x,input.y);if(a)a.t+=dt;}
   // Keep both players inside a shared camera range without teleporting the other player.
   if(!h.ai&&this.humanCount===2){const other=this.heroes[1-h.id],dx=h.x-other.x,dy=h.y-other.y;if(!other.down){const spread=len(dx,dy*.72);if(spread>900){const k=900/spread;h.x=other.x+dx*k;h.y=other.y+dy*k;}}}
   h.vx=(h.x-prior.x)/dt;h.vy=(h.y-prior.y)/dt;
   if(a){const t=a.t;
    if(a.type==='attack'&&!a.fired&&t>=(a.windup??a.duration*.33)){a.fired=true;if(h.role!=='warrior'){const target=this.nearest(h,ROLES[h.role].range*h.rangeBonus+45);if(target){const flight=Math.min(.4,Math.max(0,dist(h,target)-43)/470),pred={x:target.x+(target.vx||0)*flight,y:target.y+(target.vy||0)*flight};a.dir=norm((this.lineClear(h,pred)?pred.x:target.x)-h.x,(this.lineClear(h,pred)?pred.y:target.y)-h.y);h.face=dir8(a.dir.x,a.dir.y);}}if(h.role==='warrior'){for(const e of this.enemies){const n=norm(e.x-h.x,e.y-h.y);if(dist(e,h)<205*h.rangeBonus&&n.x*a.dir.x+n.y*a.dir.y>-.1&&this.lineClear(h,e))this.damageEnemy(e,ROLES[h.role].damage*h.power,h);}h.swings++;if(h.core==='whirlwind'&&h.swings%3===0){for(const e of this.enemies)if(e.hp>0&&dist(e,h)<205*h.rangeBonus&&this.lineClear(h,e))this.damageEnemy(e,ROLES[h.role].damage*h.power*.7,h,90,'proc');this.effects.push({type:'spin',x:h.x,y:h.y,r:205*h.rangeBonus,life:.25,max:.25});}}else{this.shoot(h,a.dir,h.role==='mage'?'bolt':'arrow',ROLES[h.role].damage*h.power);const extra=(h.passives.volley?(.08+h.passives.volley*.1):0)+(h.core==='ranger'?.35:0);if(extra){const angle=Math.atan2(a.dir.y,a.dir.x);for(const off of [-.2,.2])this.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},h.role==='mage'?'bolt':'arrow',ROLES[h.role].damage*h.power*extra,470,'proc');}}}
    if(a.type==='bash'&&t>=(a.windup??.045)&&t<=(a.activeEnd??a.duration)){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<80*this.skillRange(h,0)&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,0,36),h,260,'skill');if(h.evolved[0])h.cd[0]=Math.max(0,h.cd[0]-.4);}}
    if(a.type==='spin'&&t>=(a.windup??.12)&&t<=(a.activeEnd??a.duration)){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<170*this.skillRange(h,1)&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,1,38),h,150,'skill');}if(!a.fired){a.fired=true;if(h.evolved[1])for(const delay of [.24,.48])this.delayed.push({type:'spin',owner:h.id,delay,damage:this.skillDamage(h,1,38)*.55});}}
    if(['fireball','frost','pierce','fan'].includes(a.type)&&!a.fired&&t>=(a.windup??.105)){a.fired=true;if(a.type==='frost'){this.effects.push({type:'frost',x:h.x,y:h.y,r:185*this.skillRange(h,1),life:.48,max:.48});for(const e of this.enemies)if(dist(h,e)<185*this.skillRange(h,1)&&this.lineClear(h,e)){e.slow=2.2;if(h.evolved[1])e.freeze=1.5;this.damageEnemy(e,this.skillDamage(h,1,23)*(h.evolved[1]?1.5:1),h,100,'skill');}}else if(a.type==='fan'){this.fan(h,a.dir);if(h.evolved[1])this.delayed.push({type:'fan',owner:h.id,dir:{...a.dir},delay:.3});}else this.shoot(h,a.dir,a.type,this.skillDamage(h,0,a.type==='fireball'?42:45),a.type==='fireball'?390:650,'skill',h.evolved[0]);}
    if(t>=a.duration)h.action=null;
   }
   if(!h.action&&h.attackCd<=0){const target=this.nearest(h,ROLES[h.role].range*h.rangeBonus);if(target){const d=norm(target.x-h.x,target.y-h.y);h.face=dir8(d.x,d.y);h.action={type:'attack',dir:d,facing:h.face,t:0,...actionTiming(h.role,'attack',h.haste),fired:false,hit:new Set()};h.attackCd=ROLES[h.role].interval/h.haste;}}
  }
  this.updateProjectiles(dt);this.updateHazards(dt);updateBossWarnings(this,dt);this.updatePickups();
  for(const job of this.delayed){job.delay-=dt;if(job.delay<=0){const h=this.heroes[job.owner];if(!h.down){if(job.type==='fan')this.fan(h,job.dir);else{this.areaHit(h,job.type==='arcane'?210:170*this.skillRange(h,1),job.damage);this.effects.push({type:job.type==='arcane'?'frost':'spin',x:h.x,y:h.y,r:job.type==='arcane'?210:170*this.skillRange(h,1),life:.25,max:.25});}}}}
  this.delayed=this.delayed.filter(j=>j.delay>0);
  this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const e of this.enemies){const ox=e.x,oy=e.y;this.updateEnemy(e,dt);e.vx=clamp((e.x-ox)/dt,-800,800);e.vy=clamp((e.y-oy)/dt,-800,800);}
  this.enemies=this.enemies.filter(e=>e.hp>0);
  // Separate foes so telegraphs and silhouettes remain legible.
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j],d=dist(a,b);if(d<47){const v=d?norm(a.x-b.x,a.y-b.y):{x:1,y:0};const fixedA=a.action?.kind==='dash',fixedB=b.action?.kind==='dash';if(!fixedA)this.moveActor(a,v.x*(47-d)*(fixedB?1:.5),v.y*(47-d)*(fixedB?1:.5),22);if(!fixedB)this.moveActor(b,-v.x*(47-d)*(fixedA?1:.5),-v.y*(47-d)*(fixedA?1:.5),22);}}
  if(this.heroes.every(h=>h.down)){this.mode='defeat';this.clearBuffers();return;}
  if(this.xp>=this.xpNext){this.beginUpgrade();return;}
  if(!this.enemies.length&&!this.spawnQueue.length&&this.waveElapsed>=this.waveDuration){this.waveTimer+=dt;if(this.waveTimer>1.1){this.beginReward('skill');return;}}
  const ps=this.heroes.slice(0,this.humanCount),cx=ps.reduce((n,h)=>n+h.x,0)/ps.length,cy=ps.reduce((n,h)=>n+h.y,0)/ps.length;const spread=this.humanCount===2?Math.max(Math.abs(ps[0].x-ps[1].x)/1800,Math.abs(ps[0].y-ps[1].y)/1500):0;const z=clamp(1.04-spread,.78,1.02)*.8;const k=1-Math.exp(-dt*3);const boundZoom=Math.min(z,this.camera.zoom),targetX=clamp(cx*.85,-800*MAP_SCALE+720/boundZoom,800*MAP_SCALE-720/boundZoom),targetY=clamp(cy*.8,(-550*MAP_SCALE+369/boundZoom)/.707,(550*MAP_SCALE-441/boundZoom)/.707);this.camera.x+=(targetX-this.camera.x)*k;this.camera.y+=(targetY-this.camera.y)*k;if(Math.abs(z-this.camera.zoom)>.025)this.camera.zoom+=(z-this.camera.zoom)*k;
 }
 fan(h,dir){const angle=Math.atan2(dir.y,dir.x);for(const off of [-.34,-.17,0,.17,.34])this.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},'arrow',this.skillDamage(h,1,20),560,'skill',false,1);}
 updateProjectiles(dt){
  for(const p of this.projectiles){const travel=p.speed*Math.min(dt,Math.max(0,p.life))+(p.muzzle||0);p.muzzle=0;p.life-=dt;const start={x:p.x,y:p.y},end={x:p.x+p.dx*travel,y:p.y+p.dy*travel};
   const contacts=this.obstacles.map(o=>({t:segmentCircle(start,end,o,o.r),wall:true}));
   for(const e of p.hostile?this.heroes:this.enemies)if(e.hp>0&&!p.hit.has(e.id))contacts.push({t:segmentCircle(start,end,e,p.hostile?19:e.boss?52:e.kind==='mushroom'?32:23),target:e});
   contacts.sort((a,b)=>a.t-b.t||(a.wall?-1:1));let stopped=false;
   for(const hit of contacts){if(hit.t===Infinity)break;const pos={x:start.x+(end.x-start.x)*hit.t,y:start.y+(end.y-start.y)*hit.t},dir={x:p.dx,y:p.dy};
    if(hit.wall){this.contact(pos,dir,30);p.x=pos.x;p.y=pos.y;p.life=0;stopped=true;break;}
    const e=hit.target;if(e.hp<=0)continue;p.hit.add(e.id);this.contact({...pos,depthY:e.y+.1},dir,p.type==='fireball'?65:42,!!p.hostile);
    if(p.hostile)this.damageHero(e,p.damage,{...pos,dx:p.dx,dy:p.dy},this.enemies.find(m=>m.id===p.enemyOwner));
    else{const h=this.heroes[p.owner];this.damageEnemy(e,p.damage,h,p.type==='pierce'?150:65,p.source,p.evolved&&p.type==='pierce'?.25:0,dir);
     if(p.type==='fireball'){const r=95*(p.rangeBonus||1)*(p.evolved?1.5:1);this.effects.push({type:'blast',x:pos.x,y:pos.y,r,life:.4,max:.4});for(const other of this.enemies)if(other!==e&&other.hp>0&&dist(pos,other)<r&&this.lineClear(pos,other))this.damageEnemy(other,p.damage*.65,h,100,'skill');if(p.evolved)this.hazards.push({type:'fire',owner:h.id,x:pos.x,y:pos.y,r,life:3,timer:.5,damage:p.damage*.12});}
    }
    if(p.hostile||p.type!=='pierce'){p.x=pos.x;p.y=pos.y;p.life=0;stopped=true;break;}
   }
   if(!stopped){p.x=end.x;p.y=end.y;}
  }this.projectiles=this.projectiles.filter(p=>p.life>0&&Math.abs(p.x)<MAP.x+30&&Math.abs(p.y)<MAP.y+30);
 }
 updatePickups(){this.pickups=this.pickups.filter(p=>{const candidates=this.heroes.filter(h=>!h.down&&h.hp<h.maxHp&&dist(h,p)<38).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);if(!candidates.length)return true;const h=candidates[0],heal=Math.min(h.maxHp-h.hp,35*h.recovery);h.hp+=heal;this.effects.push({type:'number',x:h.x+28,y:h.y,height:162,text:`+${Math.round(heal)}`,life:.8,max:.8,color:'#b7f99d'});this.emit('heal',{id:h.id});return false;});}
 updateHazards(dt){for(const f of this.hazards){f.life-=dt;f.timer-=dt;if(f.timer>0)continue;f.timer+=.65;for(const target of f.type==='poison'?this.heroes:this.enemies){if(dist(target,f)>=f.r)continue;if(f.type==='poison')this.damageHero(target,f.damage,f,this.enemies.find(m=>m.id===f.enemyOwner));else this.damageEnemy(target,f.damage,this.heroes[f.owner],0,'dot');}}this.hazards=this.hazards.filter(f=>f.life>0);}
 updateEnemy(e,dt){
  const d=combatStats(e,this.enraged);if(e.spawnGrace>0){e.spawnGrace=Math.max(0,e.spawnGrace-dt);return;}if(e.affixes?.includes('regen')&&this.time-(e.lastHit??-9)>1.5)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.003*e.rarity*dt);e.hitFlash=Math.max(0,e.hitFlash-dt);e.visualStop=Math.max(0,e.visualStop-dt);if(e.hitReaction)e.hitReaction.life=Math.max(0,e.hitReaction.life-dt);e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,(e.freeze||0)-dt);
  for(const s of e.statuses||[]){s.life-=dt;s.timer-=dt;if(s.timer<=0){s.timer+=1;this.damageEnemy(e,s.damage,this.heroes[s.owner],0,'dot');}}e.statuses=(e.statuses||[]).filter(s=>s.life>0);if(e.hp<=0)return;if(e.boss){e.freeze=0;updateBoss(this,e,dt);return;}if(e.freeze>0)return;
  // Braced charges keep their locked corridor; damage and freeze still apply.
  if(e.action?.kind!=='dash')this.moveActor(e,e.knock.x*dt,e.knock.y*dt,22);e.knock.x*=Math.exp(-dt*10);e.knock.y*=Math.exp(-dt*10);e.cd=Math.max(0,e.cd-dt);
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
    if(d.behavior==='healer'){for(const ally of this.enemies)if(ally.hp>0&&dist(ally,e)<220)ally.hp=Math.min(ally.maxHp,ally.hp+22);this.effects.push({type:'heal',x:e.x,y:e.y,r:80,life:.5,max:.5});}
    else if(['ranged','burst'].includes(d.behavior)){const angle=Math.atan2(a.y-e.y,a.x-e.x);for(const off of d.behavior==='burst'?[-.2,0,.2]:[0])this.projectiles.push({id:this.nextId++,hostile:true,enemyOwner:e.id,type:d.behavior==='burst'?'fireball':'arrow',x:e.x,y:e.y,dx:Math.cos(angle+off),dy:Math.sin(angle+off),damage:d.damage,speed:280,life:2.4,hit:new Set()});}
    else if(d.behavior==='poison')this.hazards.push({type:'poison',enemyOwner:e.id,x:a.x,y:a.y,r:a.r,life:3.5,timer:0,damage:d.damage});
    else if(d.behavior!=='dash'){for(const h of this.heroes)if(!h.down&&dist(h,a)<a.r&&this.lineClear(e,h))this.damageHero(h,d.damage,e);this.effects.push({type:'impact',x:a.x,y:a.y,r:a.r,life:.25,max:.25});}
   }if(a.t>a.windup+(a.travelTime||0)+.32)e.action=null;return;
  }
  const distance=dist(e,target),heals=d.behavior==='healer'&&this.enemies.some(a=>a.hp<a.maxHp&&dist(a,e)<220);
  if(e.cd===0&&((distance<d.range&&this.lineClear(e,target))||heals)){const aim=heals?{x:e.x,y:e.y}:aimPoint(target,d,()=>this.random(),MAP);
   const from={x:e.x,y:e.y};let travelTime=0;
   if(d.behavior==='dash'){const v=norm(aim.x-e.x,aim.y-e.y),travel=Math.min(d.chargeRange,dist(e,aim)+65);aim.x=clamp(e.x+v.x*travel,-MAP.x+22,MAP.x-22);aim.y=clamp(e.y+v.y*travel,-MAP.y+22,MAP.y-22);travelTime=Math.max(.001,dist(e,aim)/d.chargeSpeed);}
   e.action={t:0,...aim,from:d.behavior==='dash'?from:undefined,travelTime,victims:new Set(),r:d.radius,windup:d.windup,hit:false,kind:d.behavior};e.cd=d.cd;e.face=dir8(aim.x-e.x,aim.y-e.y);return;}
  const ranged=['ranged','burst','poison','healer'].includes(d.behavior),ideal=ranged?d.range*.72:55;
  if(Math.abs(distance-ideal)>20){const v=norm(target.x-e.x,target.y-e.y),sign=ranged&&distance<ideal?-1:1,sp=d.speed*(e.slow>0?.38:1);
   e.steerTimer=(e.steerTimer||0)-dt;if(e.steerTimer<=0){e.steerTimer=.8+this.random()*.65;e.steer=(this.random()<.5?-1:1)*(.65+this.random()*.35);}
   const side=(d.flank||.12)*e.steer*Math.min(1,distance/150),lead=d.lead?Math.min(.4,d.lead):0;
   const pursue=norm(v.x*sign-v.y*side+(target.vx||0)*lead/Math.max(150,distance),v.y*sign+v.x*side+(target.vy||0)*lead/Math.max(150,distance));
   this.moveActor(e,pursue.x*sp*dt,pursue.y*sp*dt,22);e.face=dir8(v.x,v.y);e.stride+=dt*sp/60;}
 }
 faceToward(h,x,y){const a=Math.atan2(y,x),old=h.face*Math.PI/4;const diff=Math.atan2(Math.sin(a-old),Math.cos(a-old));if(Math.abs(diff)>Math.PI/8+.08)h.face=dir8(x,y);}
 aiInput(h){return companionInput(this,h,ROLES[h.role],MAP);}
 beginUpgrade(){this.xp=Math.max(0,this.xp-this.xpNext);this.level++;this.xpNext=5+(this.level-1)*3;this.beginReward('attribute');}
 beginReward(type){this.mode='upgrade';this.rewardType=type;this.clearBuffers();this.accumulator=0;this.ready=this.heroes.map(h=>h.ai);this.selection=[0,0,0];this.offers=this.heroes.map(h=>type==='skill'?rollSkills(h,()=>this.random()):shuffle(attributePool(h),()=>this.random()).slice(0,3));
  for(const h of this.heroes.filter(h=>h.ai)){const choices=this.offers[h.id];const preferred=type==='skill'?(choices.find(o=>o.kind==='evolution')||choices.find(o=>o.kind==='core')||choices.find(o=>o.kind==='active'&&!h.skills[o.slot])||choices.find(o=>o.key===`passive:${ACTIVE[h.role][0].need}`)||choices[0]):(choices.find(o=>h.hp<h.maxHp*.5&&['hp','recovery'].includes(o.key))||choices[0]);applyReward(h,preferred.key);}
 }
 choose(slot,index){if(this.mode==='upgrade'&&slot<this.humanCount&&!this.ready[slot])this.selection[slot]=clamp(index,0,this.offers[slot].length-1);}
 confirm(slot){if(this.mode!=='upgrade'||slot>=this.humanCount||this.ready[slot])return;const h=this.heroes[slot],o=this.offers[slot][this.selection[slot]];if(!o)return;applyReward(h,o.key);this.ready[slot]=true;if(!this.ready.every(Boolean))return;
  this.clearBuffers();this.accumulator=0;
  if(this.rewardType==='attribute'){this.mode='play';if(this.xp>=this.xpNext)this.beginUpgrade();return;}
  // Wave rewards cannot carry an old enemy projectile into the next wave.
  this.projectiles=[];this.hazards=[];this.delayed=[];for(const hero of this.heroes){hero.action=null;if(hero.down){hero.down=false;hero.hp=hero.maxHp*.35;}hero.invuln=1;}
  if(this.wave===1&&!this.bossRoom){this.wave=2;this.mode='play';this.spawnWave();this.emit('wave');}else{this.mode='complete';this.emit('complete');}
 }
 nextRoom(){if(this.mode!=='complete')return;this.room++;this.wave=1;this.mode='play';this.clearBuffers();for(const h of this.heroes){h.hp=Math.min(h.maxHp,h.hp+25);h.action=null;h.invuln=1;}this.spawnWave();}
 snapshot(){return{mode:this.mode,reason:this.reason,humanCount:this.humanCount,map:MAP,xp:this.xp,xpNext:this.xpNext,rewardType:this.rewardType,enraged:this.enraged,enrageAt:this.enrageAt,waveElapsed:this.waveElapsed,waveDuration:this.waveDuration,batches:{spawned:this.batchSpawned,total:this.batchTotal,pending:this.spawnQueue.length,nextAt:this.spawnQueue[0]?.at},bossRoom:this.bossRoom,bossWarnings:this.bossWarnings,pickups:this.pickups,hazards:this.hazards,coordinateSystem:'ground center (0,0), x right, y down, screen y scaled 0.707',time:+this.time.toFixed(3),room:this.room,wave:this.wave,level:this.level,kills:this.kills,heroes:this.heroes.map(h=>({id:h.id,role:h.role,ai:h.ai,x:+h.x.toFixed(2),y:+h.y.toFixed(2),hp:+h.hp.toFixed(1),maxHp:h.maxHp,down:h.down,revive:+h.revive.toFixed(2),face:h.face,action:h.action?.type||'idle',actionTime:h.action?.t,phase:actionPhase(h.action),aiIntent:h.aiIntent||null,hitReaction:h.hitReaction?.life||0,invuln:h.invuln,cooldowns:[...h.cd,h.dodgeCd],power:h.power,skills:h.skills,evolved:h.evolved,passives:h.passives,core:h.core,runes:h.runes,shield:h.shield,stats:{crit:h.crit,critDamage:h.critDamage,evasion:h.evasion,armor:h.armor,haste:h.haste,range:h.rangeBonus},damageDone:h.damageDone})),enemies:this.enemies.map(e=>({id:e.id,kind:e.kind,rarity:e.rarity,affixes:e.affixes,progress:e.progress,boss:e.boss,phase:e.phase,combat:{speed:combatStats(e,this.enraged).speed,damage:combatStats(e,this.enraged).damage,cd:combatStats(e,this.enraged).cd},x:+e.x.toFixed(1),y:+e.y.toFixed(1),hp:+e.hp.toFixed(1),attack:e.action?{kind:e.action.kind,from:e.action.from,travelTime:e.action.travelTime,hit:e.action.hit,x:e.action.x,y:e.action.y,r:e.action.r,t:e.action.t,windup:e.action.windup}:null})),projectiles:this.projectiles.length,ready:this.ready,selection:this.selection,offers:this.offers,obstacles:this.obstacles,camera:this.camera};}
}


