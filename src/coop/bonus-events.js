// Optional intermissions share combat controls, but never count as a cleared wave.
export const BONUS_RULES={chance:.10,cooldown:3,collectSeconds:6,xp:{name:'蓝晶虫潮',duration:18,cap:80},gold:{name:'金币大逃亡',duration:20}};
export const BONUS_CREATURES={xp:{name:'蓝晶幼虫',size:46,bodyRadius:13,speed:90,hp:8,damage:0,contactDamage:0,behavior:'bonus'},gold:{name:'逃跑钱袋',size:68,bodyRadius:19,speed:245,hp:1,damage:0,contactDamage:0,behavior:'bonus'}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const bounds=w=>w.bonusEvent.bounds;
function spawn(w,kind){
 const party=w.heroes.filter(h=>!h.down),anchor=party[Math.floor(w.random()*party.length)]||w.heroes[0],angle=w.random()*Math.PI*2,r=kind==='xp'?160+w.random()*310:220+w.random()*150,b=bounds(w);
 const e=w.createEnemy('seedling',clamp(anchor.x+Math.cos(angle)*r,-b.x+40,b.x-40),clamp(anchor.y+Math.sin(angle)*r,-b.y+40,b.y-40));
 Object.assign(e,{kind:kind==='xp'?'experienceGrub':'coinRunner',bonusKind:kind,stats:{...BONUS_CREATURES[kind]},rarity:0,affixes:[],hp:kind==='xp'?Math.min(20,8+w.room*.4):1,maxHp:kind==='xp'?Math.min(20,8+w.room*.4):1,spawnGrace:.25,steerTimer:0,knock:{x:0,y:0}});
 w.moveActor(e,0,0,e.stats.bodyRadius);w.enemies.push(e);w.bonusEvent.spawned++;return e;
}
export function tryBonusEvent(w){
 if(w.bonusEvent||w.bossRoom||w.clears<2||w.clears-(w.lastBonusClear??-100)<BONUS_RULES.cooldown)return false;
 const roll=w.random();return roll<BONUS_RULES.chance?startBonusEvent(w,roll<.05?'xp':'gold'):false;
}
export function startBonusEvent(w,kind){
 if(!BONUS_CREATURES[kind]||w.bonusEvent)return false;
 w.lastBonusClear=w.clears;w.bonusEvent={kind,name:BONUS_RULES[kind].name,phase:'active',remaining:BONUS_RULES[kind].duration,duration:BONUS_RULES[kind].duration,spawnIn:0,spawned:0,killed:0,goldDropped:0,bounds:{x:550*Math.sqrt(6),y:345*Math.sqrt(6)}};
 w.enemies=[];w.pressure=null;w.pressureState=null;w.enraged=false;w.mode='play';w.waveTimer=0;w.clearBuffers();
 const count=kind==='xp'?28+w.humanCount*8:3+w.humanCount;for(let i=0;i<count;i++)spawn(w,kind);w.emit('bonusStart',{kind});return true;
}
export function tickBonusEvent(w,dt){
 const b=w.bonusEvent;b.remaining=Math.max(0,b.remaining-dt);
 if(b.phase==='active'&&b.remaining<=0){
  b.phase='collect';b.remaining=BONUS_RULES.collectSeconds;w.enemies=[];
  for(const h of w.heroes)w.clearOwnedBuild(h);w.hazards=[];w.effects=w.effects.filter(e=>e.type==='number');w.emit('bonusCollect',{kind:b.kind});return;
 }
 if(b.phase!=='active'||b.kind!=='xp')return;
 b.spawnIn-=dt;if(b.spawnIn<=0){b.spawnIn+=.4;const count=Math.min(10+w.humanCount*4,BONUS_RULES.xp.cap+w.humanCount*20-w.enemies.filter(e=>e.hp>0).length);for(let i=0;i<count;i++)spawn(w,'xp');}
}
export function updateBonusEnemy(w,e,dt){
 e.action=null;e.hitFlash=Math.max(0,e.hitFlash-dt);e.visualStop=Math.max(0,e.visualStop-dt);e.spawnGrace=Math.max(0,(e.spawnGrace||0)-dt);if(e.hitReaction)e.hitReaction.life=Math.max(0,e.hitReaction.life-dt);
 e.steerTimer-=dt;if(e.steerTimer<=0){e.steerTimer=.5+w.random()*.6;e.wander=w.random()*Math.PI*2;}
 let dx=Math.cos(e.wander),dy=Math.sin(e.wander);const b=bounds(w);
 if(e.bonusKind==='gold'){
  const target=w.heroes.filter(h=>!h.down).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
  if(target){const d=Math.hypot(e.x-target.x,e.y-target.y)||1;dx=(e.x-target.x)/d+dx*.35;dy=(e.y-target.y)/d+dy*.35;}
  // Turn along the edge instead of becoming a stationary money dispenser.
  if(Math.abs(e.x)>b.x-170)dx-=Math.sign(e.x)*2;if(Math.abs(e.y)>b.y-170)dy-=Math.sign(e.y)*2;
 }else{if(Math.abs(e.x)>b.x-50)dx=-Math.sign(e.x);if(Math.abs(e.y)>b.y-50)dy=-Math.sign(e.y);}
 const length=Math.hypot(dx,dy)||1,speed=e.stats.speed*(e.bonusKind==='xp'&&e.freeze>0?0:e.bonusKind==='xp'&&e.slow>0?.5:1);e.freeze=Math.max(0,(e.freeze||0)-dt);e.slow=Math.max(0,e.slow-dt);
 w.moveActor(e,dx/length*speed*dt,dy/length*speed*dt,e.stats.bodyRadius);e.face=dx<0?4:0;e.stride+=dt*(e.bonusKind==='xp'?2.8:5);
 // Experience creatures retain damage-over-time; money creatures are never killed.
 if(e.bonusKind==='xp'){for(const status of e.statuses||[]){status.life-=dt;status.timer-=dt;if(status.timer<=0){status.timer+=1;w.damageEnemy(e,status.damage,w.heroes[status.owner],0,'dot');}}e.statuses=(e.statuses||[]).filter(s=>s.life>0);}
}
export function hitCoinCreature(w,e,h,damage){
 if(!(damage>0)||!Number.isFinite(damage)||w.bonusEvent?.kind!=='gold'||w.bonusEvent.phase!=='active')return;
 w.dropPickup({type:'gold',value:1,x:e.x,y:e.y});w.bonusEvent.goldDropped++;e.hitFlash=.12;e.hitReaction={x:0,y:-1,life:.16,max:.16,power:.5};w.emit('hit',{id:h.id});
 if(w.time-(e.lastCoinText??-1)>.12){e.lastCoinText=w.time;w.effects.push({type:'number',x:e.x,y:e.y,height:90,text:'+1 金',life:.45,max:.45,color:'#ffda75'});}
}
