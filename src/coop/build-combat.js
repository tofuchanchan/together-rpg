// Build-specific rules stay beside World; no global event bus or recursive proc graph.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
export function buildFx(w,variant,p,r,life=.45,extra={}){w.effects.push({type:'build',variant,x:p.x,y:p.y,r,life,max:life,...extra});}
export function charge(w,h,amount){const old=h.resource||0;h.resource=Math.min(100,old+amount);if(old<60&&h.resource>=60){w.emit('buildReady',{id:h.id});h.buildReadyFlash=.7;}}
export function rememberEvent(h,id){h.resourceEvents??=new Set();if(h.resourceEvents.has(id))return false;h.resourceEvents.add(id);if(h.resourceEvents.size>128)h.resourceEvents.delete(h.resourceEvents.values().next().value);return true;}
export function addDot(w,e,h,type,damage,life=3){
 e.statuses??=[];const old=e.statuses.find(s=>s.type===type&&s.owner===h.id);
 if(old){old.life=life;old.damage=Math.max(old.damage,damage);}else e.statuses.push({type,damage,life,timer:1,owner:h.id});
}
export function addChill(w,e,h,amount=1){
 e.chillBy??={};const s=e.chillBy[h.id]??={stacks:0,brittleUntil:0,lockUntil:0};e.slow=Math.max(e.slow,.8);
 s.until=Math.max(s.until||0,w.time+.8);
 if(w.time<s.lockUntil)return;s.stacks+=amount;e.frostStacks=s.stacks;
 if(s.stacks>=3){s.stacks=0;e.frostStacks=0;s.brittleUntil=w.time+3;s.lockUntil=w.time+(e.boss?4:1.8);e.brittle=3;if(!e.boss)e.freeze=Math.max(e.freeze||0,.7);buildFx(w,'shatter',e,45,.25);}
}
export function onBuildHit(w,e,h,source,ctx){
 const fresh=rememberEvent(h,ctx.eventId);
 if(source==='attack'&&fresh){
  if(h.core==='berserker')charge(w,h,14+(h.hp<h.maxHp*.5?6:0));
  else if(h.passives.rageEdge)charge(w,h,8);
  if(h.passives.volleyCharge)charge(w,h,12);
 }
 if(source==='attack'&&(h.core==='sniper'||h.forms?.[0]==='markedshot')){
  e.huntMarks??={};const m=e.huntMarks[h.id]??={stacks:0,last:0,event:null};
  if(m.event!==ctx.eventId){if(h.huntTarget&&h.huntTarget!==e.id){const old=w.enemies.find(t=>t.id===h.huntTarget)?.huntMarks?.[h.id];if(old)old.stacks=Math.floor(old.stacks/2);}if(w.time-m.last>4)m.stacks=0;m.stacks=Math.min(h.core==='sniper'?5:3,m.stacks+1);m.last=w.time;m.event=ctx.eventId;h.huntTarget=e.id;h.huntStacks=m.stacks;if(m.stacks===(h.core==='sniper'?5:3))buildFx(w,'markburst',e,40,.25);}
 }
 if(h.core==='frostweaver'&&source==='attack')addChill(w,e,h);
 if(e.boss&&fresh){h.bossSustainHits=(h.bossSustainHits||0)+1;if(h.bossSustainHits%8===0&&w.time>=(h.sustainAt||0)){h.sustainAt=w.time+2;rewardContribution(h,.5,w.time);}}
 if(fresh&&h.passives.battleRhythm&&e.statuses?.some(s=>s.type==='bleed'&&s.owner===h.id)){h.rhythmHits=(h.rhythmHits||0)+1;if(h.rhythmHits%3===0)refundCooldown(h,1,.15+h.passives.battleRhythm*.15);}
 return fresh;
}
export function onBuildAbsorb(w,h,absorbed,guarding=false){
 if(h.core==='bulwark'&&guarding)h.counterReady=true;
 if(!(absorbed>0))return;
 if(h.passives.storage)h.storedGuard=Math.min(100,(h.storedGuard||0)+absorbed*(.15+h.passives.storage*.15));
}
export function buildMoveFactor(h){const a=h.action,b=h.evolutionBranches?.[a?.slot];return b==='anchored'&&a?.form==='bloodspin'?.35:b==='execution'&&a?.form==='markedshot'?0:1;}
export function buildDirectMultiplier(w,h,e,source,ctx){
 let multiplier=1;
 if(source==='attack'){
  if(h.core==='sniper'||h.forms?.[0]==='markedshot')multiplier*=1+(e.huntMarks?.[h.id]?.stacks||0)*.03;
  // One attack event consumes a charge once, but every victim of that attack gets it.
  if(h.buildBonusEvent!==ctx.eventId){h.buildBonusEvent=ctx.eventId;h.buildBonus=1;
   if(h.counterReady){h.counterReady=false;h.buildBonus*=1.45;buildFx(w,'guardburst',h,95,.25);}
   if(h.storedGuard>0&&h.passives.storage&&!h.passives.guardRelease){const spend=Math.min(15,h.storedGuard);h.storedGuard-=spend;h.buildBonus*=1+spend*.01;}
   if(h.core==='berserker'&&h.resource>=100&&!h.passives.rageEdge){h.resource=0;h.buildBonus*=1.5;buildFx(w,'bloodspin',h,95,.25);}
   if(h.weakpointUntil>w.time){h.weakpointUntil=0;h.buildBonus*=1+.15+(h.passives.weakpoint||0)*.15;}
   if(h.passives.volleyCharge&&h.resource>=60&&!h.passives.delayedVolley){h.resource-=60;const angle=Math.atan2(e.y-h.y,e.x-h.x);for(const off of [-.06,.06]){const p=w.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},'arrow',12*h.power*(.15+h.passives.volleyCharge*.1),560,'proc');p.visual='shadow';}}
  }multiplier*=h.buildBonus||1;
 }
 if(source==='skill'&&h.passives.woundCashout&&h.action?.slot===1){const a=h.action;a.woundVictims??=new Set();if(!a.woundVictims.has(e.id)){const bleed=e.statuses?.find(s=>s.type==='bleed'&&s.owner===h.id);if(bleed){a.woundVictims.add(e.id);const fraction=.25+h.passives.woundCashout*.1,remaining=Math.max(0,Math.ceil(bleed.life-bleed.timer+1e-6)),spend=bleed.damage*remaining*fraction;bleed.damage*=1-fraction;ctx.skipBleed=true;if(spend>0)w.delayed.push({type:'woundburst',owner:h.id,target:e.id,x:e.x,y:e.y,delay:.01,damage:spend});}}}
 return multiplier;
}
export function refundCooldown(h,slot,amount){
 h.refundBudget??=[];h.refundBudget[slot]??=h.cd[slot]*.35;
 const refund=Math.min(amount,h.refundBudget[slot],h.cd[slot]);h.refundBudget[slot]-=refund;h.cd[slot]=Math.max(0,h.cd[slot]-refund);
}
export function rewardContribution(h,factor=1,time=0){
 if(h.down)return;
 if(h.passives.harvest&&h.hp<h.maxHp&&time>=(h.harvestAt??-Infinity)){h.hp=Math.min(h.maxHp,h.hp+h.passives.harvest*3*factor);h.harvestAt=time+1;}
 h.cd.forEach((_,slot)=>refundCooldown(h,slot,(h.passives.echo||0)*.3*factor));
}
export function settleBuildDeath(w,e,killer,context,onHeal=()=>{}){
 const eligible=new Set([killer.id,...Object.keys(e.contributors||{}).filter(id=>w.time-e.contributors[id]<=5).map(Number)]);
 for(const id of eligible){const h=w.heroes[id];if(!h||h.down)continue;const before=h.hp;rewardContribution(h,1,w.time);if(h.core==='executioner'&&h.hp<h.maxHp&&w.time>=(h.executionHealAt??-Infinity)&&e.statuses?.some(s=>s.type==='bleed'&&s.owner===id)){h.hp=Math.min(h.maxHp,h.hp+8);h.executionHealAt=w.time+1;}if(h.hp>before)onHeal(h,h.hp-before);}
 w.deathQueue??=[];
 for(const s of e.statuses||[]){const owner=w.heroes[s.owner];if(s.type!=='burn'||!owner||owner.down||!owner.passives.detonate)continue;
  w.deathQueue.push({x:e.x,y:e.y,owner,damage:owner.passives.detonate*12*owner.skillPower*(owner.dotPower||1),depth:(context.depth||0)+1});
 }
 for(const h of w.heroes){if(h.down)continue;let stacks=e.huntMarks?.[h.id]?.stacks||0;
  if(h.passives.markTransfer)stacks=Math.min(stacks,1+h.passives.markTransfer);else stacks=0;
  if(e.pursuitCredit?.owner===h.id&&e.pursuitCredit.until>=w.time)stacks=Math.max(stacks,e.pursuitCredit.stacks);
  if(stacks){const target=w.enemies.filter(t=>t!==e&&t.hp>0&&distance(t,e)<350&&w.lineClear(e,t)).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(target){target.huntMarks??={};target.huntMarks[h.id]={stacks:Math.min(h.core==='sniper'?5:3,stacks),last:w.time,event:null};h.huntTarget=target.id;h.huntStacks=stacks;buildFx(w,'markburst',target,45,.3);}}
 }
 if(w.drainingDeaths)return;w.drainingDeaths=true;
 try{let count=0;while(w.deathQueue.length&&count++<96){const blast=w.deathQueue.shift();if(blast.depth>2)continue;buildFx(w,'inferno',blast,110,.42);for(const other of w.enemies)if(other.hp>0&&distance(blast,other)<110&&w.lineClear(blast,other))w.damageEnemy(other,blast.damage,blast.owner,45,'proc',0,null,{depth:blast.depth});}}finally{w.deathQueue=[];w.drainingDeaths=false;}
}
export function onBuildDodge(w,h){
 h.guardUntil=0;
 if(h.passives.shadowReturn&&h.shadowRefundUntil>w.time){refundCooldown(h,1,.2+h.passives.shadowReturn*.2);h.shadowRefundUntil=0;}
 if(h.forms?.[1]==='shadowvolley'||h.passives.afterimage){const b=h.evolutionBranches?.[1];if(b==='garrison'&&h.shadow?.life>0)return;h.shadow={x:h.x,y:h.y,life:b==='garrison'?8:b==='skirmish'?2.8:4,face:h.face,spent:false};buildFx(w,'shadow',h,55,.4);}
}
export function configureBuildAction(w,h,a){
 a.form=h.forms?.[a.slot]||null;
 a.buildBranch=h.evolutionBranches?.[a.slot]||null;
 if(h.core==='bulwark'&&a.slot===0){h.guardUntil=w.time+.55;h.guardDir={...a.dir};}
 if(a.form==='aegis'){a.windup=.08;a.activeEnd=a.windup+(a.buildBranch==='bastion'?2:a.buildBranch==='breach'?.65:h.evolved[0]?1.2:.9);a.duration=a.activeEnd+.08;a.cancelAt=.17;}
 if(a.form==='bloodspin'){a.windup=.12;a.activeEnd=a.buildBranch==='anchored'?1.62:a.buildBranch==='roving'?.66:h.evolved[1]?1.2:1.02;a.duration=a.activeEnd+.12;a.cancelAt=.26;a.pulses=0;}
 if(a.form==='markedshot'){a.windup=a.buildBranch==='execution'?.5:.24;a.activeEnd=a.windup+.08;a.duration=a.activeEnd+.18;a.cancelAt=a.windup+.07;}
}
export function releaseBuildEnergy(w,h,a){
 if(a.slot!==1)return;const energy=h.resource||0;
 const guardEnergy=h.storedGuard||h.shield*.4||0;
 if(h.passives.guardRelease&&guardEnergy>0){
  if(h.storedGuard>0)h.storedGuard=0;else h.shield=Math.max(0,h.shield-guardEnergy);const r=220*w.skillRange(h,1);buildFx(w,'guardburst',h,r,.5,{dir:a.dir});
  for(const e of w.enemies){const v=unit(e.x-h.x,e.y-h.y);if(e.hp>0&&distance(e,h)<r&&v.x*a.dir.x+v.y*a.dir.y>-.15&&w.lineClear(h,e))w.damageEnemy(e,(18+guardEnergy*(.45+h.passives.guardRelease*.2))*h.skillPower,h,180,'proc');}
  w.emit('buildBurst',{id:h.id});
 }
 if(h.passives.rageEdge&&energy>=30){h.resource=0;for(let i=0;i<Math.min(3,Math.floor(energy/30));i++)w.delayed.push({type:'bloodpulse',owner:h.id,delay:.16+i*.18,damage:(10+h.passives.rageEdge*4)*h.skillPower,r:175*w.skillRange(h,1)});w.emit('buildBurst',{id:h.id});}
 if(h.passives.delayedVolley&&energy>=60){h.resource-=60;w.delayed.push({type:'fan',owner:h.id,delay:.23,dir:{...a.dir},factor:.3+h.passives.delayedVolley*.1,visual:'shadow'});w.emit('buildBurst',{id:h.id});}
}
export function updateBuildAction(w,h,a){
 if(!a.form&&!['wildfire','molten'].includes(a.buildBranch))return false;if(a.t<a.windup)return true;
 if(a.form==='aegis'){
  if(!a.fired){a.fired=true;h.guardUntil=w.time+a.activeEnd-a.t;h.guardDir={...a.dir};h.shield=Math.min(120*(h.shieldPower||1),h.shield+(h.evolved[0]?75:50)*(h.shieldPower||1));if(a.buildBranch==='bastion')for(const ally of w.heroes)if(ally!==h&&!ally.down&&distance(ally,h)<180)ally.shield=Math.min(120*(ally.shieldPower||1),(ally.shield||0)+18*(h.shieldPower||1));}
  if(a.buildBranch==='breach'&&a.t>=a.activeEnd&&!a.breached){a.breached=true;const guard=(h.shield||0)+(h.storedGuard||0);h.shield=0;h.storedGuard=0;h.guardUntil=0;for(let i=0;i<12;i++)w.moveActor(h,a.dir.x*11,a.dir.y*11);buildFx(w,'guardburst',h,240,.5,{dir:a.dir});for(const e of w.enemies)if(e.hp>0&&distance(e,h)<240&&w.lineClear(h,e))w.damageEnemy(e,(30+guard*.65)*h.skillPower,h,210,'proc');}
 }else if(a.form==='bloodspin'){
  const max=a.buildBranch==='anchored'?8:a.buildBranch==='roving'?3:h.evolved[1]?6:5;
  if(a.pulses<max&&a.t>=a.windup+a.pulses*.18){a.pulses++;a.fired=true;const growth=a.buildBranch==='anchored'?1+(a.pulses-1)*.055:1,r=175*w.skillRange(h,1)*growth;buildFx(w,'bloodspin',h,r,.24,{rotation:a.pulses});
   const context={eventId:w.nextAttackId++,universalEvent:a.eventId,form:a.form};for(const e of w.enemies)if(e.hp>0&&distance(h,e)<r&&w.lineClear(h,e)){const existing=e.statuses?.some(s=>s.type==='bleed'&&s.owner===h.id&&s.life>0),consumedBefore=a.woundVictims?.has(e.id);w.damageEnemy(e,w.skillDamage(h,1,15)*growth,h,25,'skill',0,null,context);const consumedNow=!consumedBefore&&a.woundVictims?.has(e.id);if(e.hp>0&&!consumedNow){addDot(w,e,h,'bleed',5*h.skillPower*(h.dotPower||1));if(!existing)e.statuses.find(s=>s.type==='bleed'&&s.owner===h.id).universalEvent=a.eventId;}}
  }
  if(a.buildBranch==='roving'&&a.pulses===3&&!a.pursued){a.pursued=true;const d=unit(h.move?.x||a.dir.x,h.move?.y||a.dir.y),p=w.shoot(h,d,'pierce',w.skillDamage(h,1,35),560,'proc');p.visual='bloodspin';p.life=.8;p.fragment=true;}
 }else if(!a.fired){
  a.fired=true;
  if(a.form==='icelance'){const p=w.shoot(h,a.dir,'pierce',w.skillDamage(h,0,42),720,'skill',false,0);p.visual='icelance';p.form=a.form;p.evolution=h.evolved[0];p.branch=a.buildBranch;if(a.buildBranch==='frostrail'){for(let i=1;i<=3;i++){const point={x:h.x+a.dir.x*i*100,y:h.y+a.dir.y*i*100};if(w.lineClear(h,point))w.hazards.push({type:'coldfield',owner:h.id,...point,r:70,life:2.4,max:2.4,timer:0,damage:w.skillDamage(h,0,3),trail:true});}const owned=w.hazards.filter(f=>f.owner===h.id&&f.trail);for(const old of owned.slice(0,Math.max(0,owned.length-6)))old.life=0;}}
  if(a.form==='coldfield'){const r=200*w.skillRange(h,1),life=h.evolved[1]?5:3.6;w.hazards=w.hazards.filter(f=>!(f.type==='coldfield'&&f.owner===h.id));w.hazards.push({type:'coldfield',owner:h.id,x:h.x,y:h.y,r,life,max:life,timer:0,damage:w.skillDamage(h,1,11)});}
  if(a.form==='markedshot'){const p=w.shoot(h,a.dir,'pierce',w.skillDamage(h,0,58)*(a.buildBranch==='pursuit'?.85:1),850,'skill',false,0);p.visual='markedshot';p.form=a.form;p.evolution=h.evolved[0];p.branch=a.buildBranch;}
  if(a.form==='shadowvolley'){w.fan(h,a.dir);castShadow(w,h,a.dir,h.evolved[1]&&!a.buildBranch);}
  if(['wildfire','molten'].includes(a.buildBranch)){const p=w.shoot(h,a.dir,'fireball',w.skillDamage(h,0,42)*(a.buildBranch==='wildfire'?.8:1.15),390,'skill',false,0);p.branch=a.buildBranch;p.rangeBonus*=a.buildBranch==='molten'?.55:1.2;}
 }
 return true;
}
export function castShadow(w,h,dir,evolved=false){
 if(!h.shadow||h.shadow.spent)return;const branch=h.evolutionBranches?.[1];const factor=(Math.max(h.forms?.[1]==='shadowvolley'?.45:0,h.passives.afterimage?.1:0)+(h.passives.afterimage||0)*.15)*(branch==='skirmish'?.65:1);if(!factor)return;h.shadow.shots=(h.shadow.shots||0)+1;h.shadow.spent=h.shadow.shots>=(branch==='garrison'?2:1);h.shadowRefundUntil=w.time+2;
 const origin={x:h.shadow.x,y:h.shadow.y};w.fan(h,dir,factor,origin,'shadow');buildFx(w,'shadow',origin,70,.45,{dir});
 if(evolved)w.delayed.push({type:'fan',owner:h.id,delay:.2,dir:{...dir},factor,origin,visual:'shadow'});
 if(branch==='skirmish')w.delayed.push({type:'fan',owner:h.id,delay:.32,dir:{...dir},factor:factor*.45,origin,visual:'shadow'});
}
export function buildProjectileHit(w,p,e,h,dir){
 let damage=p.damage;
 if(p.branch==='execution'&&!w.enemies.some(t=>t!==e&&t.hp>0&&distance(t,e)<145))damage*=1.65;
 if(p.source==='skill'&&p.type==='pierce'&&!p.fragment&&h.passives.markCashout&&(h.core==='sniper'||p.form==='markedshot')){
  const mark=e.huntMarks?.[h.id];if(mark&&w.time-mark.last>4)mark.stacks=0;const stacks=mark?.stacks||0;
  if(stacks){damage*=1+stacks*(.12+h.passives.markCashout*.06);mark.stacks=0;h.huntStacks=0;buildFx(w,'markburst',e,70,.4);w.emit('buildBurst',{id:h.id});if(stacks>=3&&h.passives.weakpoint)h.weakpointUntil=w.time+4;
   if(p.branch==='pursuit'&&!p.followed){p.followed=true;e.pursuitCredit={owner:h.id,stacks:Math.max(1,Math.floor(stacks*.6)),until:w.time+.05};}
   if(p.form==='markedshot'&&p.evolution&&!p.branch&&stacks>=3&&!p.followed){p.followed=true;w.delayed.push({type:'markecho',owner:h.id,delay:.15,dir:{...dir},damage:p.damage*.5});}
  }
 }
 if(p.visual==='icelance'&&!p.fragment){
  const chill=e.chillBy?.[h.id];
  if(chill?.brittleUntil>w.time&&h.passives.iceFragments){chill.brittleUntil=0;e.freeze=0;e.brittle=Math.max(0,...Object.values(e.chillBy).map(s=>s.brittleUntil-w.time));damage*=1.15;buildFx(w,'shatter',e,115,.45);w.emit('buildBurst',{id:h.id});
   const count=p.branch==='crystal'?7:p.branch==='frostrail'?1:p.evolution?5:3,angle=Math.atan2(dir.y,dir.x);h.fragmentEvents??={};h.fragmentEvents[p.eventId]??=0;for(let i=0;i<count;i++){const off=(i-(count-1)/2)*.28,shard=w.shoot(h,{x:Math.cos(angle+off),y:Math.sin(angle+off)},'pierce',p.damage*(.16+h.passives.iceFragments*.06)*(p.branch==='crystal'?.75:1),580,'proc');shard.x=e.x;shard.y=e.y;shard.muzzle=0;shard.life=.46;shard.hit.add(e.id);shard.visual='icelance';shard.fragment=true;shard.chillEvent=p.eventId;}
  }else{const previousUntil=e.chillBy?.[h.id]?.until||0;addChill(w,e,h);if(previousUntil<=w.time)e.chillBy[h.id].universalEvent=p.eventId;}
 }
 if(p.fragment&&p.chillEvent!==undefined&&h.passives.frostReturn){h.fragmentEvents??={};const count=h.fragmentEvents[p.chillEvent]||0;if(count<1+h.passives.frostReturn){h.fragmentEvents[p.chillEvent]=count+1;addChill(w,e,h);}}
 if(p.type==='fireball'&&(h.passives.emberConsume||p.branch==='wildfire')){
  const burn=e.statuses?.find(s=>s.type==='burn'&&s.owner===h.id);
  if(burn){const remaining=Math.max(0,1+Math.floor((burn.life-burn.timer)/1+1e-6)),fraction=h.passives.emberConsume?Math.min(.8,.25+h.passives.emberConsume*.1+(p.branch==='molten'?.2:0)):0,spend=burn.damage*remaining*fraction;burn.damage*=1-fraction;damage+=spend;buildFx(w,'inferno',e,120*(p.rangeBonus||1),.55);w.emit('buildBurst',{id:h.id});
   if(p.branch==='wildfire')for(const target of w.enemies)if(target!==e&&target.hp>0&&distance(target,e)<140*(p.rangeBonus||1)&&w.lineClear(e,target))addDot(w,target,h,'burn',3*h.skillPower*(h.dotPower||1),2);
  }
  // This fireball consumes existing embers; do not immediately restore the spent DOT.
  p.skipBurn=!!burn;
 }
 return damage;
}
export function tickBuild(w,h,dt){
 h.buildReadyFlash=Math.max(0,(h.buildReadyFlash||0)-dt);
 if(h.shadow){h.shadow.life-=dt;if(h.shadow.life<=0||h.down)h.shadow=null;}
 if(!['aegis','pairwall'].includes(h.action?.form)&&h.core!=='bulwark')h.guardUntil=0;
 if(h.huntTarget){const e=w.enemies.find(e=>e.id===h.huntTarget&&e.hp>0),mark=e?.huntMarks?.[h.id];if(!e||!mark||w.time-mark.last>4){if(mark)mark.stacks=0;h.huntTarget=null;h.huntStacks=0;}else h.huntStacks=mark.stacks;}
 if(h.down){h.resource=0;h.storedGuard=0;h.guardUntil=0;}
 if(!h.down&&h.passives.fieldFocus&&w.time>=(h.fieldRefundAt||0)&&w.hazards.some(f=>f.type==='coldfield'&&f.owner===h.id&&f.life>0&&distance(f,h)<f.r)){h.fieldRefundAt=w.time+1;refundCooldown(h,0,.12+h.passives.fieldFocus*.06);}
 if(h.fragmentEvents&&Object.keys(h.fragmentEvents).length>64){const keys=Object.keys(h.fragmentEvents);for(const key of keys.slice(0,keys.length-32))delete h.fragmentEvents[key];}
}
