import {ACTIVE,applyReward,attributePool,shuffle,rollSkills} from './builds.js';
import {ENEMIES,enemyDef} from './enemies.js';
export const MAP_SCALE=Math.sqrt(1.5),MAP={x:550*MAP_SCALE,y:345*MAP_SCALE};
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
 reset(roles=['warrior','mage'],humanCount=2){if(roles[0]===roles[1]||roles.some(r=>!ROLES[r]))throw Error('Two distinct roles required');this.humanCount=humanCount===1?1:2;this.time=0;this.tick=0;this.accumulator=0;this.pendingEdges=[{},{}];this.mode='play';this.reason='';this.room=1;this.wave=1;this.level=1;this.kills=0;this.xp=0;this.xpNext=5;this.rewardType=null;this.enemies=[];this.projectiles=[];this.effects=[];this.hazards=[];this.pickups=[];this.delayed=[];this.events=[];this.nextId=10;this.waveTimer=0;this.obstacles=OBSTACLES;this.ready=[false,false];this.selection=[0,0];this.offers=[];this.camera={x:0,y:0,zoom:1};this.shake=0;this.options={feedback:true,shake:true,sound:true};
  const all=[...roles,...Object.keys(ROLES).filter(r=>!roles.includes(r))];this.heroes=all.map((role,i)=>({id:i,role,ai:i>=this.humanCount,x:-140+i*120,y:i===2?110:35,hp:ROLES[role].hp,maxHp:ROLES[role].hp,power:1,speedBonus:1,skillPower:1,rangeBonus:1,haste:1,crit:0,critDamage:1.5,evasion:0,armor:0,cooldown:0,recovery:1,skills:[0,0],evolved:[false,false],passives:{},empowered:0,cd:[0,0],dodgeCd:0,attackCd:0,action:null,move:{x:0,y:0},lastMove:{x:1,y:0},face:0,stride:0,hitFlash:0,visualStop:0,invuln:0,down:false,revive:0,buffer:null,damageDone:0}));this.spawnWave();}
 createEnemy(kind,x,y){const d=ENEMIES[kind],hp=d.hp*(1+(this.room-1)*.17);return{id:this.nextId++,kind,x,y,hp,maxHp:hp,action:null,cd:1+this.random()*.5,hitFlash:0,visualStop:0,slow:0,freeze:0,statuses:[],face:4,stride:0,knock:{x:0,y:0}};}
 spawnWave(){this.waveTimer=0;const count=this.wave===1?5:6,keys=Object.keys(ENEMIES);for(let i=0;i<count;i++){const a=i/count*Math.PI*2+.4;const kind=keys[((this.room-1)*11+(this.wave-1)*5+i)%keys.length];this.enemies.push(this.createEnemy(kind,Math.cos(a)*MAP.x*.77,Math.sin(a)*MAP.y*.77));}}
 pause(reason='暂停'){if(this.mode==='play'||this.mode==='upgrade'){this.resumeMode=this.mode;this.mode='paused';this.reason=reason;this.clearBuffers();}}
 resume(){if(this.mode==='paused'){this.mode=this.resumeMode||'play';this.reason='';this.clearBuffers();}}
 clearBuffers(){this.pendingEdges=[{},{}];for(const h of this.heroes){h.buffer=null;h.move={x:0,y:0};}}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>80)this.events.shift();}
 request(h,type,input){if(h.down)return false;const moving=len(input.x,input.y)>.01;const v=moving?norm(input.x,input.y):h.lastMove;h.buffer={type,expires:this.time+.14,dir:{...v}};return this.consume(h);}
 consume(h){const b=h.buffer;if(!b)return false;if(this.time>b.expires){h.buffer=null;return false;}const a=h.action;if(b.type==='dodge'){
   if(h.dodgeCd>0||a?.type==='dodge'||(a&&a.type!=='attack'&&a.t<a.duration*.55))return false;
   h.action={type:'dodge',t:0,duration:.29,dir:b.dir,hit:new Set()};h.invuln=.15;h.dodgeCd=.85;h.empowered=h.passives.momentum?3:0;h.buffer=null;this.emit('dodge',{id:h.id});return true;
  }
  const s=b.type==='skill1'?0:1;if(!h.skills[s]){h.buffer=null;return false;}if(h.cd[s]>0||(a&&a.type!=='attack'))return false;
  const target=this.nearest(h,520);const d=target?norm(target.x-h.x,target.y-h.y):b.dir;
  const type=h.role==='warrior'?(s===0?'bash':'spin'):h.role==='mage'?(s===0?'fireball':'frost'):(s===0?'pierce':'fan');
  h.action={type,slot:s,t:0,duration:type==='bash'?.39:type==='spin'?.53:.38,dir:type==='bash'?b.dir:d,hit:new Set(),fired:false};h.cd[s]=ROLES[h.role].cd[s]*(1-h.cooldown);h.buffer=null;h.face=dir8(h.action.dir.x,h.action.dir.y);this.emit('skill',{id:h.id,skill:type});return true;
 }
 nearest(h,range=Infinity){let best=null,d=range;for(const e of this.enemies){const n=dist(h,e);if(e.hp>0&&n<d&&this.lineClear(h,e)){best=e;d=n;}}return best;}
 lineClear(a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;return !this.obstacles.some(o=>{const t=l?clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/l,0,1):0;return len(a.x+t*dx-o.x,a.y+t*dy-o.y)<o.r;});}
 moveActor(h,dx,dy,r=17){h.x=clamp(h.x+dx,-MAP.x+r,MAP.x-r);h.y=clamp(h.y+dy,-MAP.y+r,MAP.y-r);for(const o of this.obstacles){const d=dist(h,o),rr=r+o.r;if(d<rr){const n=d?norm(h.x-o.x,h.y-o.y):{x:1,y:0};h.x=o.x+n.x*rr;h.y=o.y+n.y*rr;}}}
 damageEnemy(e,n,h,knock=70,source='attack',extraCrit=0){if(e.hp<=0)return;let crit=false;
  if(source!=='dot'){crit=h.empowered>0||this.random()<h.crit+extraCrit;if(crit)n*=h.critDamage;if(h.empowered>0){n*=1+(h.passives.momentum||0)*.1;h.empowered=0;}
   if(e.kind==='beetle'){const facing={x:Math.cos(e.face*Math.PI/4),y:Math.sin(e.face*Math.PI/4)},v=norm(h.x-e.x,h.y-e.y);if(v.x*facing.x+v.y*facing.y>.25)n*=.5;}
   if(h.passives.chill)e.slow=Math.max(e.slow,.1+h.passives.chill*.4);
   e.statuses??=[];const dot=(type,damage)=>{const old=e.statuses.find(s=>s.type===type&&s.owner===h.id);if(old){old.life=3;old.damage=damage;}else e.statuses.push({type,damage,life:3,timer:1,owner:h.id});};
   if(source==='skill'&&h.passives.ember)dot('burn',h.passives.ember*4);if(crit&&h.passives.blood)dot('bleed',h.passives.blood*5);
  }
  e.hp-=n;h.damageDone+=n;e.hitFlash=.13;e.visualStop=.04;h.visualStop=.035;const d=norm(e.x-h.x,e.y-h.y);e.knock={x:d.x*knock,y:d.y*knock};this.effects.push({type:'number',x:e.x,y:e.y,text:`${crit?'暴击 ':''}${Math.round(n)}`,life:.7,max:.7,color:crit?'#ffce71':'#fff0b4'});this.emit('hit',{id:h.id,heavy:n>=28});if(n>=28)this.shake=Math.min(.12,this.shake+.05);
  if(e.hp<=0){this.kills++;this.xp+=enemyDef(e).xp;this.effects.push({type:'poof',x:e.x,y:e.y,life:.35,max:.35});this.emit('kill',{id:h.id});if(this.random()<.28)this.pickups.push({id:this.nextId++,type:'potion',x:e.x,y:e.y});h.hp=Math.min(h.maxHp,h.hp+(h.passives.harvest||0)*3);h.cd=h.cd.map(cd=>Math.max(0,cd-(h.passives.echo||0)*.3));}
 }
 damageHero(h,n,e){if(h.down||h.invuln>0)return;if(h.evasion>0&&this.random()<h.evasion){h.invuln=.22;this.effects.push({type:'number',x:h.x,y:h.y,text:'闪避',life:.6,max:.6,color:'#9bf1d2'});return;}h.hp=Math.max(0,h.hp-n*(1-h.armor));h.invuln=.55;h.hitFlash=.2;this.emit('hurt',{id:h.id});const d=norm(h.x-e.x,h.y-e.y);this.moveActor(h,d.x*18,d.y*18);if(!h.hp){h.down=true;h.action=null;h.buffer=null;this.emit('down',{id:h.id});}}
 shoot(h,dir,type,damage,speed=470,source='attack',evolved=false){this.projectiles.push({id:this.nextId++,owner:h.id,type,x:h.x+dir.x*43,y:h.y+dir.y*43,dx:dir.x,dy:dir.y,damage,speed,life:1.7*h.rangeBonus,hit:new Set(),source,evolved,rangeBonus:h.rangeBonus});}
 skillDamage(h,slot,base){return base*(1+Math.max(0,h.skills[slot]-1)*.34)*h.skillPower;}
 areaHit(h,r,damage,knock=100){for(const e of this.enemies)if(e.hp>0&&dist(h,e)<r&&this.lineClear(h,e))this.damageEnemy(e,damage,h,knock,'skill');}
 advance(seconds,inputs=[{},{}]){if(this.mode!=='play')return;for(let p=0;p<2;p++)for(const k of ['dodge','skill1','skill2'])this.pendingEdges[p][k] ||= !!inputs[p]?.[k];this.accumulator+=Math.max(0,seconds);while(this.mode==='play'&&this.accumulator+1e-9>=1/120){this.accumulator-=1/120;const sample=[0,1].map(p=>({...inputs[p],...this.pendingEdges[p]}));this.pendingEdges=[{dodge:false,skill1:false,skill2:false},{dodge:false,skill1:false,skill2:false}];this.step(1/120,sample);}}
 step(dt,inputs){if(this.mode!=='play')return;this.time+=dt;this.tick++;this.shake=Math.max(0,this.shake-dt);this.effects=this.effects.filter(f=>(f.life-=dt)>0);
  for(const h of this.heroes){let input={...baseInput(),...(inputs[h.id]||{})};if(h.ai)input=this.aiInput(h);h.cd=h.cd.map(t=>Math.max(0,t-dt));h.dodgeCd=Math.max(0,h.dodgeCd-dt);h.attackCd=Math.max(0,h.attackCd-dt);h.invuln=Math.max(0,h.invuln-dt);h.hitFlash=Math.max(0,h.hitFlash-dt);h.visualStop=Math.max(0,h.visualStop-dt);
   if(h.down){const helper=this.heroes.some(p=>!p.down&&p.id!==h.id&&dist(p,h)<82);h.revive=helper?h.revive+dt:Math.max(0,h.revive-dt*.5);if(h.revive>=2){h.down=false;h.hp=h.maxHp*.45;h.revive=0;h.invuln=1;this.emit('revive',{id:h.id});}continue;}
   const m=len(input.x,input.y);if(m>1){input.x/=m;input.y/=m;}h.move={x:input.x,y:input.y};if(m>.01)h.lastMove=norm(input.x,input.y);
   if(input.dodge)this.request(h,'dodge',input);else if(input.skill1)this.request(h,'skill1',input);else if(input.skill2)this.request(h,'skill2',input);this.consume(h);
   h.empowered=Math.max(0,h.empowered-dt);const a=h.action;const speed=ROLES[h.role].speed*h.speedBonus;
   if(a&&(a.type==='dodge'||a.type==='bash')){const old=a.t;a.t=Math.min(a.duration,a.t+dt);const ease=t=>1-(1-t)**2;const travel=a.type==='dodge'?112:145*(h.evolved[0]?1.3:1);const d=(ease(a.t/a.duration)-ease(old/a.duration))*travel;this.moveActor(h,a.dir.x*d,a.dir.y*d);h.face=dir8(a.dir.x,a.dir.y);}
   else{this.moveActor(h,input.x*speed*dt,input.y*speed*dt);if(m>.01){h.stride+=Math.min(1,m)*speed*dt/62;if(!a)this.faceToward(h,input.x,input.y);}if(a)a.t+=dt;}
   // Keep both players inside a shared camera range without teleporting the other player.
   if(!h.ai&&this.humanCount===2){const other=this.heroes[1-h.id],dx=h.x-other.x,dy=h.y-other.y;if(!other.down){const spread=len(dx,dy*.72);if(spread>900){const k=900/spread;h.x=other.x+dx*k;h.y=other.y+dy*k;}}}
   if(a){const t=a.t;
    if(a.type==='attack'&&!a.fired&&t>=a.duration*.33){a.fired=true;if(h.role==='warrior'){for(const e of this.enemies){const n=norm(e.x-h.x,e.y-h.y);if(dist(e,h)<155*h.rangeBonus&&n.x*a.dir.x+n.y*a.dir.y>-.1&&this.lineClear(h,e))this.damageEnemy(e,ROLES[h.role].damage*h.power,h);}}else this.shoot(h,a.dir,h.role==='mage'?'bolt':'arrow',ROLES[h.role].damage*h.power);}
    if(a.type==='bash'&&t>.045){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<80*h.rangeBonus&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,0,36),h,260,'skill');if(h.evolved[0])h.cd[0]=Math.max(0,h.cd[0]-.4);}}
    if(a.type==='spin'&&t>.12){for(const e of this.enemies)if(!a.hit.has(e.id)&&dist(h,e)<170*h.rangeBonus&&this.lineClear(h,e)){a.hit.add(e.id);this.damageEnemy(e,this.skillDamage(h,1,38),h,150,'skill');}if(!a.fired){a.fired=true;if(h.evolved[1])for(const delay of [.24,.48])this.delayed.push({type:'spin',owner:h.id,delay,damage:this.skillDamage(h,1,38)*.55});}}
    if(['fireball','frost','pierce','fan'].includes(a.type)&&!a.fired&&t>=.105){a.fired=true;if(a.type==='frost'){this.effects.push({type:'frost',x:h.x,y:h.y,r:185*h.rangeBonus,life:.48,max:.48});for(const e of this.enemies)if(dist(h,e)<185*h.rangeBonus&&this.lineClear(h,e)){e.slow=2.2;if(h.evolved[1])e.freeze=1.5;this.damageEnemy(e,this.skillDamage(h,1,23)*(h.evolved[1]?1.5:1),h,100,'skill');}}else if(a.type==='fan'){this.fan(h,a.dir);if(h.evolved[1])this.delayed.push({type:'fan',owner:h.id,dir:{...a.dir},delay:.3});}else this.shoot(h,a.dir,a.type,this.skillDamage(h,0,a.type==='fireball'?42:45),a.type==='fireball'?390:650,'skill',h.evolved[0]);}
    if(t>=a.duration)h.action=null;
   }
   if(!h.action&&h.attackCd<=0){const target=this.nearest(h,ROLES[h.role].range*h.rangeBonus);if(target){const d=norm(target.x-h.x,target.y-h.y);h.face=dir8(d.x,d.y);h.action={type:'attack',dir:d,t:0,duration:ROLES[h.role].interval*.85/h.haste,fired:false,hit:new Set()};h.attackCd=ROLES[h.role].interval/h.haste;}}
  }
  this.updateProjectiles(dt);this.updateHazards(dt);this.updatePickups();
  for(const job of this.delayed){job.delay-=dt;if(job.delay<=0){const h=this.heroes[job.owner];if(!h.down){if(job.type==='fan')this.fan(h,job.dir);else{this.areaHit(h,170*h.rangeBonus,job.damage);this.effects.push({type:'spin',x:h.x,y:h.y,r:170*h.rangeBonus,life:.25,max:.25});}}}}
  this.delayed=this.delayed.filter(j=>j.delay>0);
  this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const e of this.enemies)this.updateEnemy(e,dt);
  this.enemies=this.enemies.filter(e=>e.hp>0);
  // Separate foes so telegraphs and silhouettes remain legible.
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j],d=dist(a,b);if(d<47){const v=d?norm(a.x-b.x,a.y-b.y):{x:1,y:0};this.moveActor(a,v.x*(47-d)*.5,v.y*(47-d)*.5,22);this.moveActor(b,-v.x*(47-d)*.5,-v.y*(47-d)*.5,22);}}
  if(this.heroes.every(h=>h.down)){this.mode='defeat';this.clearBuffers();return;}
  if(this.xp>=this.xpNext){this.beginUpgrade();return;}
  if(!this.enemies.length){this.waveTimer+=dt;if(this.waveTimer>1.1){this.beginReward('skill');return;}}
  const ps=this.heroes.slice(0,this.humanCount),cx=ps.reduce((n,h)=>n+h.x,0)/ps.length,cy=ps.reduce((n,h)=>n+h.y,0)/ps.length;const spread=this.humanCount===2?Math.max(Math.abs(ps[0].x-ps[1].x)/1800,Math.abs(ps[0].y-ps[1].y)/1500):0;const z=clamp(1.04-spread,.78,1.02);const k=1-Math.exp(-dt*3);this.camera.x+=(cx*.55-this.camera.x)*k;this.camera.y+=(cy*.5-this.camera.y)*k;if(Math.abs(z-this.camera.zoom)>.025)this.camera.zoom+=(z-this.camera.zoom)*k;
 }
 fan(h,dir){const angle=Math.atan2(dir.y,dir.x);for(const off of [-.34,-.17,0,.17,.34])this.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},'arrow',this.skillDamage(h,1,20),560,'skill');}
 updateProjectiles(dt){
  for(const p of this.projectiles){p.life-=dt;const ox=p.x,oy=p.y;p.x+=p.dx*p.speed*dt;p.y+=p.dy*p.speed*dt;if(!this.lineClear({x:ox,y:oy},p)){p.life=0;continue;}
   const targets=p.hostile?this.heroes:this.enemies;
   for(const e of targets){if(e.hp<=0||p.hit.has(e.id))continue;const dx=p.x-ox,dy=p.y-oy,l=dx*dx+dy*dy,t=l?clamp(((e.x-ox)*dx+(e.y-oy)*dy)/l,0,1):0;
    if(len(ox+t*dx-e.x,oy+t*dy-e.y)>(p.hostile?19:e.kind==='mushroom'?32:23))continue;p.hit.add(e.id);
    if(p.hostile){this.damageHero(e,p.damage,p);p.life=0;break;}
    const h=this.heroes[p.owner];this.damageEnemy(e,p.damage,h,p.type==='pierce'?150:65,p.source,p.evolved&&p.type==='pierce'?.25:0);
    if(p.type==='fireball'){const r=95*(p.rangeBonus||1)*(p.evolved?1.5:1);this.effects.push({type:'blast',x:e.x,y:e.y,r,life:.4,max:.4});for(const other of this.enemies)if(other!==e&&other.hp>0&&dist(e,other)<r&&this.lineClear(e,other))this.damageEnemy(other,p.damage*.65,h,100,'skill');if(p.evolved)this.hazards.push({type:'fire',owner:h.id,x:e.x,y:e.y,r,life:3,timer:.5,damage:p.damage*.12});}
    if(p.type!=='pierce'){p.life=0;break;}
   }
  }this.projectiles=this.projectiles.filter(p=>p.life>0&&Math.abs(p.x)<MAP.x+30&&Math.abs(p.y)<MAP.y+30);
 }
 updatePickups(){this.pickups=this.pickups.filter(p=>{const candidates=this.heroes.filter(h=>!h.down&&h.hp<h.maxHp&&dist(h,p)<38).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);if(!candidates.length)return true;const h=candidates[0],heal=Math.min(h.maxHp-h.hp,35*h.recovery);h.hp+=heal;this.effects.push({type:'number',x:h.x,y:h.y,text:`+${Math.round(heal)}`,life:.8,max:.8,color:'#b7f99d'});this.emit('heal',{id:h.id});return false;});}
 updateHazards(dt){for(const f of this.hazards){f.life-=dt;f.timer-=dt;if(f.timer>0)continue;f.timer+=.65;for(const target of f.type==='poison'?this.heroes:this.enemies){if(dist(target,f)>=f.r)continue;if(f.type==='poison')this.damageHero(target,f.damage,f);else this.damageEnemy(target,f.damage,this.heroes[f.owner],0,'dot');}}this.hazards=this.hazards.filter(f=>f.life>0);}
 updateEnemy(e,dt){
  const d=enemyDef(e);e.hitFlash=Math.max(0,e.hitFlash-dt);e.visualStop=Math.max(0,e.visualStop-dt);e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,(e.freeze||0)-dt);
  for(const s of e.statuses||[]){s.life-=dt;s.timer-=dt;if(s.timer<=0){s.timer+=1;this.damageEnemy(e,s.damage,this.heroes[s.owner],0,'dot');}}e.statuses=(e.statuses||[]).filter(s=>s.life>0);if(e.hp<=0||e.freeze>0)return;
  this.moveActor(e,e.knock.x*dt,e.knock.y*dt,22);e.knock.x*=Math.exp(-dt*10);e.knock.y*=Math.exp(-dt*10);e.cd=Math.max(0,e.cd-dt);
  const target=this.heroes.filter(h=>!h.down).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!target)return;
  if(e.action){const a=e.action;a.t+=dt;
   if(!a.hit&&a.t>=a.windup){a.hit=true;
    if(['dash','leap'].includes(d.behavior))this.moveActor(e,a.x-e.x,a.y-e.y,22);
    if(d.behavior==='healer'){for(const ally of this.enemies)if(ally.hp>0&&dist(ally,e)<220)ally.hp=Math.min(ally.maxHp,ally.hp+22);this.effects.push({type:'heal',x:e.x,y:e.y,r:80,life:.5,max:.5});}
    else if(['ranged','burst'].includes(d.behavior)){const angle=Math.atan2(a.y-e.y,a.x-e.x);for(const off of d.behavior==='burst'?[-.2,0,.2]:[0])this.projectiles.push({id:this.nextId++,hostile:true,type:d.behavior==='burst'?'fireball':'arrow',x:e.x,y:e.y,dx:Math.cos(angle+off),dy:Math.sin(angle+off),damage:d.damage,speed:280,life:2.4,hit:new Set()});}
    else if(d.behavior==='poison')this.hazards.push({type:'poison',x:a.x,y:a.y,r:a.r,life:3.5,timer:0,damage:d.damage});
    else{for(const h of this.heroes)if(!h.down&&dist(h,a)<a.r&&this.lineClear(e,h))this.damageHero(h,d.damage,e);this.effects.push({type:'impact',x:a.x,y:a.y,r:a.r,life:.25,max:.25});}
   }if(a.t>a.windup+.32)e.action=null;return;
  }
  const distance=dist(e,target),heals=d.behavior==='healer'&&this.enemies.some(a=>a.hp<a.maxHp&&dist(a,e)<220);
  if(e.cd===0&&((distance<d.range&&this.lineClear(e,target))||heals)){e.action={t:0,x:heals?e.x:target.x,y:heals?e.y:target.y,r:d.radius,windup:d.windup,hit:false,kind:d.behavior};e.cd=d.cd;e.face=dir8(target.x-e.x,target.y-e.y);return;}
  const ranged=['ranged','burst','poison','healer'].includes(d.behavior),ideal=ranged?d.range*.72:55;
  if(Math.abs(distance-ideal)>20){const v=norm(target.x-e.x,target.y-e.y),sign=ranged&&distance<ideal?-1:1,sp=d.speed*(e.slow>0?.38:1);this.moveActor(e,v.x*sp*dt*sign,v.y*sp*dt*sign,22);e.face=dir8(v.x,v.y);e.stride+=dt*sp/60;}
 }
 faceToward(h,x,y){const a=Math.atan2(y,x),old=h.face*Math.PI/4;const diff=Math.atan2(Math.sin(a-old),Math.cos(a-old));if(Math.abs(diff)>Math.PI/8+.08)h.face=dir8(x,y);}
 aiInput(h){const n=this.heroes.find(p=>p.down),target=this.nearest(h)||this.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,h)-dist(b,h))[0],leader=n||this.heroes.find(p=>!p.ai&&!p.down)||h;let dest=leader;
  if(!n&&target){const d=dist(h,target),ideal=h.role==='warrior'?100:240;if(d>ideal+25)dest=target;else if(d<ideal-60){const v=norm(h.x-target.x,h.y-target.y);dest={x:h.x+v.x*120,y:h.y+v.y*120};}else dest=h;}
  if(h.hp/h.maxHp<.7&&!n){const potion=this.pickups.filter(p=>dist(p,h)<320).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(potion)dest=potion;}
  const dangerZone=this.enemies.map(e=>e.action).find(a=>a&&!a.hit&&dist(h,a)<a.r+25)||this.hazards.find(f=>f.type==='poison'&&dist(h,f)<f.r+25);
  if(dangerZone){const away=norm(h.x-dangerZone.x||h.lastMove.x,h.y-dangerZone.y||h.lastMove.y);dest={x:h.x+away.x*160,y:h.y+away.y*160};}
  const v=dist(h,dest)>(n?48:dest.type==='potion'?15:dest===target?0:90)?norm(dest.x-h.x,dest.y-h.y):{x:0,y:0};for(const ally of this.heroes){const d=dist(h,ally);if(ally!==h&&!ally.down&&d<48){const away=d?norm(h.x-ally.x,h.y-ally.y):{x:1,y:0};v.x+=away.x*.8;v.y+=away.y*.8;}}if(!this.lineClear(h,{x:h.x+v.x*75,y:h.y+v.y*75})){const a=Math.atan2(v.y,v.x);const candidates=[a+1.15,a-1.15].map(t=>({x:Math.cos(t),y:Math.sin(t)})).filter(p=>this.lineClear(h,{x:h.x+p.x*75,y:h.y+p.y*75})).sort((a,b)=>dist({x:h.x+a.x*75,y:h.y+a.y*75},dest)-dist({x:h.x+b.x*75,y:h.y+b.y*75},dest));if(candidates.length){v.x=candidates[0].x;v.y=candidates[0].y;}}const danger=this.enemies.some(e=>e.action&&!e.action.hit&&dist(h,e.action)<e.action.r+8&&e.action.t>e.action.windup*.5);return{x:v.x,y:v.y,dodge:danger&&h.dodgeCd===0,skill1:!!target&&h.skills[0]>0&&h.cd[0]===0,skill2:!!target&&h.skills[1]>0&&dist(h,target)<(h.role==='archer'?380:200)*h.rangeBonus&&h.cd[1]===0};}
 beginUpgrade(){this.xp=Math.max(0,this.xp-this.xpNext);this.level++;this.xpNext=5+(this.level-1)*3;this.beginReward('attribute');}
 beginReward(type){this.mode='upgrade';this.rewardType=type;this.clearBuffers();this.accumulator=0;this.ready=this.heroes.map(h=>h.ai);this.selection=[0,0,0];this.offers=this.heroes.map(h=>type==='skill'?rollSkills(h,()=>this.random()):shuffle(attributePool(h),()=>this.random()).slice(0,3));
  for(const h of this.heroes.filter(h=>h.ai)){const choices=this.offers[h.id];const preferred=type==='skill'?(choices.find(o=>o.kind==='evolution')||choices.find(o=>o.kind==='active'&&!h.skills[o.slot])||choices.find(o=>o.key===`passive:${ACTIVE[h.role][0].need}`)||choices[0]):(choices.find(o=>h.hp<h.maxHp*.5&&['hp','recovery'].includes(o.key))||choices[0]);applyReward(h,preferred.key);}
 }
 choose(slot,index){if(this.mode==='upgrade'&&slot<this.humanCount&&!this.ready[slot])this.selection[slot]=clamp(index,0,this.offers[slot].length-1);}
 confirm(slot){if(this.mode!=='upgrade'||slot>=this.humanCount||this.ready[slot])return;const h=this.heroes[slot],o=this.offers[slot][this.selection[slot]];if(!o)return;applyReward(h,o.key);this.ready[slot]=true;if(!this.ready.every(Boolean))return;
  this.clearBuffers();this.accumulator=0;
  if(this.rewardType==='attribute'){this.mode='play';if(this.xp>=this.xpNext)this.beginUpgrade();return;}
  // Wave rewards cannot carry an old enemy projectile into the next wave.
  this.projectiles=[];this.hazards=[];this.delayed=[];for(const hero of this.heroes){hero.action=null;if(hero.down){hero.down=false;hero.hp=hero.maxHp*.35;}hero.invuln=1;}
  if(this.wave===1){this.wave=2;this.mode='play';this.spawnWave();this.emit('wave');}else{this.mode='complete';this.emit('complete');}
 }
 nextRoom(){if(this.mode!=='complete')return;this.room++;this.wave=1;this.mode='play';this.clearBuffers();for(const h of this.heroes){h.hp=Math.min(h.maxHp,h.hp+25);h.action=null;h.invuln=1;}this.spawnWave();}
 snapshot(){return{mode:this.mode,reason:this.reason,humanCount:this.humanCount,map:MAP,xp:this.xp,xpNext:this.xpNext,rewardType:this.rewardType,pickups:this.pickups,hazards:this.hazards,coordinateSystem:'ground center (0,0), x right, y down, screen y scaled 0.707',time:+this.time.toFixed(3),room:this.room,wave:this.wave,level:this.level,kills:this.kills,heroes:this.heroes.map(h=>({id:h.id,role:h.role,ai:h.ai,x:+h.x.toFixed(2),y:+h.y.toFixed(2),hp:+h.hp.toFixed(1),maxHp:h.maxHp,down:h.down,revive:+h.revive.toFixed(2),face:h.face,action:h.action?.type||'idle',actionTime:h.action?.t,invuln:h.invuln,cooldowns:[...h.cd,h.dodgeCd],power:h.power,skills:h.skills,evolved:h.evolved,passives:h.passives,stats:{crit:h.crit,critDamage:h.critDamage,evasion:h.evasion,armor:h.armor,haste:h.haste,range:h.rangeBonus},damageDone:h.damageDone})),enemies:this.enemies.map(e=>({id:e.id,kind:e.kind,x:+e.x.toFixed(1),y:+e.y.toFixed(1),hp:+e.hp.toFixed(1),attack:e.action?{x:e.action.x,y:e.action.y,r:e.action.r,t:e.action.t,windup:e.action.windup}:null})),projectiles:this.projectiles.length,ready:this.ready,selection:this.selection,offers:this.offers,obstacles:this.obstacles,camera:this.camera};}
}


