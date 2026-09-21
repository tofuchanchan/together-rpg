import {warningContains} from './mossbell.js';
// Deliberate fixed telegraphs: no target tracking after windup begins.
export const BOSS_SKILLS={slam:'裂地重锤',barrage:'荆种齐射',roots:'缠根围猎',summon:'林卫召集',ultimate:'荆冠天罚'};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function bossPhase(e){return e.hp/e.maxHp<=.3?3:e.hp/e.maxHp<=.65?2:1;}
export function startBossSkill(w,e,key){
 const targets=w.heroes.filter(h=>!h.down),target=targets.sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!target)return;
 const damage=e.stats.damage,phase=e.phase||1;
 e.action={attackId:w.nextAttackId++,kind:key,type:'boss',t:0,windup:key==='ultimate'?2.1:key==='summon'?1.35:key==='barrage'?.95:1.1,x:target.x,y:target.y,r:key==='slam'?155:0,hit:false};
 const a=e.action,add=(x,y,r,delay,amount)=>w.bossWarnings.push({attackId:w.nextAttackId++,owner:e.id,skill:key,x,y,r,t:0,windup:delay,damage:amount,hit:false});
 if(key==='slam')add(a.x,a.y,155,1.1,damage*1.2);
 if(key==='roots')for(const h of targets){add(h.x,h.y,82,1.15,damage*.7);if(phase>=2){add(h.x+100,h.y,65,1.5,damage*.65);add(h.x-100,h.y,65,1.8,damage*.65);}}
 if(key==='ultimate'){
  // Expanding ring of bursts with two clearly visible escape lanes; center remains escapable.
  add(e.x,e.y,150,2.1,damage*1.7);
  for(let ring=1;ring<=3;ring++)for(let i=0;i<12;i++){if(i===2||i===8)continue;const angle=i*Math.PI/6+(ring%2?.08:0);add(e.x+Math.cos(angle)*ring*145,e.y+Math.sin(angle)*ring*145,67,2.1+ring*.34,damage*1.15);}
 }
 w.emit('bossSkill',{skill:key,phase});
}
export function updateBoss(w,e,dt){
 const phase=bossPhase(e);if(phase>e.phase){e.phase=phase;e.action=null;e.cd=.65;e.ultimateCd=0;w.emit('bossPhase',{phase});}
 e.cd=Math.max(0,e.cd-dt);e.ultimateCd=Math.max(0,e.ultimateCd-dt);
 if(e.action){const a=e.action;a.t+=dt;if(!a.hit&&a.t>=a.windup){a.hit=true;
   if(a.kind==='barrage'){const center=Math.atan2(a.y-e.y,a.x-e.x),n=5+(e.phase-1)*2;for(let i=0;i<n;i++){const angle=center+(i-(n-1)/2)*.16;w.projectiles.push({id:w.nextId++,hostile:true,bossOwner:e.id,type:'fireball',x:e.x,y:e.y,dx:Math.cos(angle),dy:Math.sin(angle),speed:230+e.phase*20,damage:e.stats.damage*.7,life:3,hit:new Set()});}}
   if(a.kind==='summon')for(let i=0;i<3+e.phase&&w.enemies.filter(m=>m.summonedBy===e.id&&m.hp>0).length<18;i++){const angle=i*Math.PI*2/(3+e.phase),minion=w.createEnemy(i%2?'goblin':'slime',e.x+Math.cos(angle)*150,e.y+Math.sin(angle)*150,0);minion.summonedBy=e.id;w.moveActor(minion,0,0,22);w.enemies.push(minion);}
  }if(a.t>=a.windup+.6){e.action=null;e.cd=e.phase===3?1.25:1.9;}return;
 }
 if(e.cd<=0){let key;if(e.phase>=2&&e.ultimateCd<=0){key='ultimate';e.ultimateCd=e.phase===3?13:20;}else{const order=['slam','barrage','roots','summon','barrage'];key=order[e.skillCursor++%order.length];}startBossSkill(w,e,key);return;}
 const target=w.heroes.filter(h=>!h.down).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(target&&dist(target,e)>210){const d=dist(target,e),speed=e.stats.speed;w.moveActor(e,(target.x-e.x)/d*speed*dt,(target.y-e.y)/d*speed*dt,48);e.stride+=dt*speed/70;}
}
export function updateBossWarnings(w,dt){
 for(const a of w.bossWarnings){a.t+=dt;if(a.hit||a.t<a.windup)continue;a.hit=true;
  const owner=w.enemies.find(e=>e.id===a.owner&&e.hp>0);if(!owner)continue;
  for(const h of w.heroes)if(!h.down&&(a.mossbell?warningContains(a,h):dist(h,a)<a.r)){
   const angle=owner.action?.angle||0,impact=a.mossbell&&a.skill==='leap'?{...a,dx:Math.cos(angle),dy:Math.sin(angle)}:a;
   w.damageHero(h,a.damage,impact,owner);
  }
  if(a.mossbell){
   // Reuse collision geometry: a ring's safe opening and a root corridor stay readable.
   w.effects.push({...a,type:'boss-release',life:.62,max:.62});
   if(w.options.feedback&&w.options.shake)w.shake=Math.max(w.shake,a.skill==='leap'?.24:a.skill==='ultimate'?.18:.09);
   w.emit('bossImpact',{skill:a.skill,heavy:true});
  }else w.effects.push({type:a.skill==='roots'?'frost':'blast',x:a.x,y:a.y,r:a.r,life:.4,max:.4});
 }
 w.bossWarnings=w.bossWarnings.filter(a=>a.t<a.windup+.25&&w.enemies.some(e=>e.id===a.owner&&e.hp>0));
}
