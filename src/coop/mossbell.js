export const MOSSBELL_SIZE=350,MOSSBELL_BODY_RADIUS=78,MOSSBELL_SWEEP_RADIUS=275,MOSSBELL_LEAP_RADIUS=175;
export const MOSSBELL_DEF={name:'苔钟守卫',hp:3000,speed:68,range:260,radius:120,windup:1.1,damage:18,cd:2.4,behavior:'boss',size:MOSSBELL_SIZE,xp:24,bodyRadius:MOSSBELL_BODY_RADIUS,contactDamage:7};
export const MOSSBELL_SKILLS={sweep:'石槌横扫',roots:'根径裂地',leap:'跃步落钟',summon:'唤醒侍卫',ultimate:'合围钟鸣',transition:'钟壳崩裂',stagger:'钟芯暴露'};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function warningContains(a,p,padding=0){
 const d=dist(a,p),angle=Math.atan2(p.y-a.y,p.x-a.x);
 if(a.shape==='ring')return d>=a.inner-padding&&d<a.r+padding&&Math.abs(angleDelta(angle,a.gap))>a.gapWidth/2;
 if(a.shape==='cone')return d<a.r+padding&&(d<padding||Math.abs(angleDelta(angle,a.angle))<a.arc/2+padding/Math.max(30,d));
 if(a.shape==='line'){const dx=a.to.x-a.x,dy=a.to.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<a.r+padding;}
 return d<a.r+padding;
}
export function warningEscape(a,p){
 if(a.shape==='ring'){const r=Math.max(a.inner+25,dist(a,p));return{x:a.x+Math.cos(a.gap)*r,y:a.y+Math.sin(a.gap)*r};}
 if(a.shape==='cone'){const angle=a.angle+(angleDelta(Math.atan2(p.y-a.y,p.x-a.x),a.angle)<0?-1:1)*(a.arc/2+.4),r=Math.max(100,dist(a,p));return{x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r};}
 if(a.shape==='line'){const dx=a.to.x-a.x,dy=a.to.y-a.y,l=Math.hypot(dx,dy)||1,side=(p.x-a.x)*(-dy)+(p.y-a.y)*dx<0?-1:1;return{x:p.x-dy/l*side*(a.r+45),y:p.y+dx/l*side*(a.r+45)};}
 const d=dist(a,p)||1;return{x:a.x+(p.x-a.x)/d*(a.r+40),y:a.y+(p.y-a.y)/d*(a.r+40)};
}
export function startMossbellSkill(w,e,key){
 const alive=w.heroes.filter(h=>!h.down).sort((a,b)=>a.id-b.id);if(!alive.length)return;
 let target=alive.reduce((a,b)=>dist(e,a)<=dist(e,b)?a:b);
 // Alternate ranged pressure between living party members. The selected point
 // remains locked for the whole windup; a partner never inherits a live warning.
 if(key==='roots'||key==='leap'){
  const previous=alive.findIndex(h=>h.id===e.lastRangedTargetId);
  target=previous>=0?alive[(previous+1)%alive.length]:alive.reduce((a,b)=>dist(e,a)>=dist(e,b)?a:b);
  e.lastRangedTargetId=target.id;
 }
 const angle=Math.atan2(target.y-e.y,target.x-e.x),windup={sweep:1.1,roots:1.05,leap:1.4,summon:1.3,ultimate:2.2,transition:1.4,stagger:4}[key];
 if(windup===undefined)return;
 const recovery={sweep:1.15,roots:1,leap:1.3,summon:.8,ultimate:4,transition:.1,stagger:0}[key];
 e.action={kind:key,type:'boss',t:0,windup,recovery,duration:windup+recovery+(key==='ultimate'?1.4:0),targetId:target.id,x:target.x,y:target.y,from:{x:e.x,y:e.y},angle,hit:false};
 e.face=target.x<e.x?4:0;
 if(key==='leap'){
  // Lock a legal landing before displaying the warning, never redirect at impact.
  const radius=e.stats.bodyRadius||MOSSBELL_BODY_RADIUS,landing={x:target.x,y:target.y};for(let i=0;i<4;i++)w.moveActor(landing,0,0,radius);
  if(w.obstacles.some(o=>dist(landing,o)<o.r+radius-.01))Object.assign(landing,e.action.from);
  e.action.x=landing.x;e.action.y=landing.y;
 }
 const add=(data)=>w.bossWarnings.push({mossbell:true,attackId:w.nextAttackId++,owner:e.id,skill:key,x:e.x,y:e.y,r:150,t:0,windup,damage:e.stats.damage,hit:false,...data});
 if(key==='sweep')add({shape:'cone',angle,arc:Math.PI*.86,r:MOSSBELL_SWEEP_RADIUS,damage:e.stats.damage*1.1});
 if(key==='roots')for(let i=-1;i<=1;i++){const a=angle+i*.4;add({shape:'line',to:{x:e.x+Math.cos(a)*480,y:e.y+Math.sin(a)*480},r:33,windup:windup+(i+1)*.2,damage:e.stats.damage*.7});}
 if(key==='leap')add({shape:'circle',x:e.action.x,y:e.action.y,r:MOSSBELL_LEAP_RADIUS,damage:e.stats.damage*1.1});
 if(key==='ultimate')for(let i=0;i<3;i++)add({shape:'ring',r:190+i*155,inner:125+i*155,gap:angle,gapWidth:Math.PI*.55,windup:windup+i*.7,damage:e.stats.damage*1.1});
 if(key==='stagger'){e.stagger=0;e.staggerUntil=w.time+4;e.recoverUntil=w.time+10;}
 w.emit('bossSkill',{skill:key,boss:e.kind,phase:e.phase});
}
export function recordMossbellHit(w,e,h,damage,source,ctx){
 if(e.kind!=='mossbell'||e.hp<=0||!['attack','skill'].includes(source)||w.time<(e.recoverUntil||0)||e.action?.kind==='transition')return;
 e.staggerEvents??=[];let record=e.staggerEvents.find(r=>r.id===ctx.eventId);
 if(!record){record={id:ctx.eventId,value:0};e.staggerEvents.push(record);if(e.staggerEvents.length>80)e.staggerEvents.shift();}
 const control=h.action?.type==='bash'||h.role==='warrior'&&h.action?.pairSkill&&h.action.slot===2||h.role==='mage'&&h.action?.type==='frost'||e.slow>0||e.freeze>0;
 const gain=Math.max(0,Math.min(8-record.value,damage/e.maxHp*450+(control&&record.value===0?2:0)));record.value+=gain;e.stagger=Math.min(100,(e.stagger||0)+gain);
}
export function updateMossbell(w,e,dt){
 e.cd=Math.max(0,e.cd-dt);e.ultimateCd=Math.max(0,e.ultimateCd-dt);e.freeze=0;
 if(e.action){const a=e.action;a.t+=dt;
  if(a.kind==='leap'){
   const q=clamp((a.t/a.windup-.45)/.55,0,1),travel=q*q*(3-2*q);
   e.x=a.from.x+(a.x-a.from.x)*travel;e.y=a.from.y+(a.y-a.from.y)*travel;
  }
  if(!a.hit&&a.t>=a.windup){a.hit=true;
   if(a.kind==='leap')e.staggerUntil=w.time+1.3;
   if(a.kind==='summon'){
    const live=w.enemies.filter(m=>m.hp>0&&m.summonedBy===e.id).length,count=Math.min(3,6-live,18-(e.summonTotal||0));
    for(let i=0;i<count;i++){const angle=i*Math.PI*2/3,m=w.createEnemy(i===1?'goblin':'seedling',e.x+Math.cos(angle)*170,e.y+Math.sin(angle)*170);m.summonedBy=e.id;m.spawnGrace=.9;w.moveActor(m,0,0,22);w.enemies.push(m);e.summonTotal=(e.summonTotal||0)+1;}
   }
  }
  if(a.kind==='ultimate'&&a.t>=a.windup+1.4&&!a.exposed){a.exposed=true;e.staggerUntil=w.time+4;e.recoverUntil=w.time+10;e.stagger=0;}
  if(a.t>=a.duration){e.action=null;e.cd=e.phase===3?1.1:1.65;}return;
 }
 const phase=e.hp/e.maxHp<=.35?3:e.hp/e.maxHp<=.7?2:1;
 if(phase>e.phase){e.phase=phase;e.phaseOpening=phase===2?['summon','roots']:[];startMossbellSkill(w,e,'transition');if(phase===3)e.ultimateCd=0;w.emit('bossPhase',{phase,boss:e.kind});return;}
 if(e.stagger>=100&&w.time>=(e.recoverUntil||0)){startMossbellSkill(w,e,'stagger');return;}
 if(e.cd<=0){
  const order=e.phase===1?['sweep','roots','sweep','leap']:['sweep','leap','roots','summon','sweep'];
  let key=e.phaseOpening?.length?e.phaseOpening.shift():order[e.skillCursor++%order.length];if(e.phase===3&&e.ultimateCd<=0){key='ultimate';e.ultimateCd=23;}
  const target=w.heroes.filter(h=>!h.down).sort((a,b)=>dist(e,a)-dist(e,b))[0];
  if(key==='sweep'&&target&&dist(e,target)>MOSSBELL_SWEEP_RADIUS)key=e.skillCursor%2?'leap':'roots';
  startMossbellSkill(w,e,key);return;
 }
 const target=w.heroes.filter(h=>!h.down).sort((a,b)=>dist(e,a)-dist(e,b))[0];
 if(target&&dist(e,target)>190){const d=dist(e,target),speed=e.stats.speed*(e.slow>0?.65:1);w.moveActor(e,(target.x-e.x)/d*speed*dt,(target.y-e.y)/d*speed*dt,e.stats.bodyRadius||MOSSBELL_BODY_RADIUS);e.stride+=dt*speed/85;e.face=target.x<e.x?4:0;}
}
