import {MOSSBELL_BODY_RADIUS,warningContains,warningEscape} from './mossbell.js';
import {equippedSkills} from './skill-pairs.js';
import {segmentCircle,constrainSharedMove} from './collision.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:0};};
const point=(h,v,d)=>({x:h.x+v.x*d,y:h.y+v.y*d});

// World bodies use 17px while steering keeps a 21px comfort margin. Being in
// that margin must not reject every path: allow only monotonically outward
// (including tangent) motion, never an inward shortcut through a solid body.
function obstaclePathClear(a,b,o,allowOverlap=false){
 const x=a.x-o.x,y=a.y-o.y,dx=b.x-a.x,dy=b.y-a.y,r=o.r+21,start=x*x+y*y;
 if(start>r*r)return segmentCircle(a,b,o,r)===Infinity;
 return (allowOverlap||start>=(o.r+17)**2-1e-6)&&dx*dx+dy*dy>1e-12&&x*dx+y*dy>=-1e-7&&(x+dx)**2+(y+dy)**2>start+1e-8;
}
// A character already in the map's 5px steering border can travel along it or
// toward the interior; it cannot move farther outward or leave the body bound.
const axisPathClear=(from,to,extent)=>Math.abs(to)<=extent-17&&(Math.abs(to)<extent-22||Math.abs(from)>=extent-22&&Math.abs(to)<=Math.abs(from)+1e-7);

function zoneCenter(p,a){if(!a.from)return a;const dx=a.x-a.from.x,dy=a.y-a.from.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.from.x)*dx+(p.y-a.from.y)*dy)/l)):0;return{x:a.from.x+dx*t,y:a.from.y+dy*t};}
const zoneDistance=(p,a)=>a.mossbell?(warningContains(a,p,25)?0:Infinity):distance(p,zoneCenter(p,a));
export function companionInput(w,h,role,map){
 const foes=w.enemies.filter(e=>e.hp>0),visible=foes.filter(e=>w.lineClear(h,e)),nearest=(visible.length?visible:foes).reduce((best,e)=>!best||distance(h,e)<distance(h,best)?e:best,null),forms=h.forms||[],passives=h.passives||{},shadowReady=h.shadow?.life>0&&!h.shadow.spent;
 const marked=foes.find(e=>e.id===h.huntTarget),keepMark=(h.core==='sniper'||forms[0]==='markedshot')&&marked&&(h.huntStacks||0)>0&&distance(h,marked)<role.range*h.rangeBonus*1.08&&w.lineClear(h,marked)&&(!nearest||distance(h,nearest)>140);
 const healer=visible.filter(e=>e.stats?.behavior==='healer'&&distance(h,e)<500).sort((a,b)=>distance(h,a)-distance(h,b))[0];
 const huntSupport=!keepMark&&!!healer&&(!nearest||distance(h,nearest)>100);
 const objectiveTarget=w.objective?.phase==='active'?(w.objective.kind==='defend'?visible.filter(e=>e.siege&&distance(e,w.objective.beacon)<230).sort((a,b)=>distance(a,w.objective.beacon)-distance(b,w.objective.beacon))[0]:w.objective.kind==='nest'&&nearest&&distance(h,nearest)>100?visible.filter(e=>e.objectivePart).sort((a,b)=>distance(h,a)-distance(h,b))[0]:null):null;
 const target=objectiveTarget||(keepMark?marked:huntSupport?healer:nearest);
 const downedAlly=w.heroes.find(p=>p.down);
 const zones=[...(w.bossWarnings||[]).filter(a=>!a.hit).map(a=>({...a,eta:Math.max(0,a.windup-a.t)})),...foes.filter(e=>e.action&&(!e.action.hit||(e.action.from&&e.action.t<e.action.windup+e.action.travelTime))&&!['healer','siege'].includes(e.action.kind)).map(e=>({...e.action,source:e,eta:Math.max(0,e.action.windup-e.action.t)})),...w.hazards.filter(f=>f.type==='poison').map(f=>({...f,eta:Math.max(0,f.timer)}))];
 const bullets=w.projectiles.filter(p=>p.hostile&&p.life>0);
 const risk=(p,horizon=.4)=>zones.reduce((n,a)=>n+(a.eta<horizon&&zoneDistance(p,a)<a.r+25?5+(a.r+25-zoneDistance(p,a))/30:0),0)+bullets.reduce((n,b)=>n+(segmentCircle(b,point(b,{x:b.dx,y:b.dy},b.speed*Math.min(horizon,b.life)),p,29)<Infinity?7:0),0);
 // A safe cone endpoint can still cut a chord through the bell's large body.
 // Route around grounded bodies; an actor already overlapped may escape outward.
 const bossBodies=foes.filter(e=>e.kind==='mossbell'&&!(e.action?.kind==='leap'&&e.action.t>=e.action.windup*.45&&e.action.t<e.action.windup)).map(e=>({x:e.x,y:e.y,r:e.stats.bodyRadius||MOSSBELL_BODY_RADIUS}));
 const pathClear=(a,b)=>axisPathClear(a.x,b.x,map.x)&&axisPathClear(a.y,b.y,map.y)&&w.obstacles.every(o=>obstaclePathClear(a,b,o))&&bossBodies.every(o=>obstaclePathClear(a,b,o,true));
 const travelPoint=(v,d)=>{const dx=v.x*d,dy=v.y*d,move=constrainSharedMove(h,!h.ai&&w.humanCount===2?w.heroes[1-h.id]:null,dx,dy);return {x:h.x+move.dx,y:h.y+move.dy,limited:move.dx!==dx||move.dy!==dy};};
 let ally=downedAlly;
 if(downedAlly){
  const channeling=distance(h,downedAlly)<82,unguarded=foes.filter(e=>!e.bonusKind&&!e.objectivePart&&!(e.freeze>.8));
  const unsafe=risk(downedAlly,1)>0||unguarded.filter(e=>distance(e,downedAlly)<170).length>=2||!channeling&&unguarded.some(e=>distance(e,downedAlly)<100);
  // Clear threats first and require a short stable window before re-entering.
  // An already safe channel stays committed; actual danger still interrupts it.
  if(unsafe)h.rescueBlockedUntil=w.time+.65;
  if((h.rescueBlockedUntil||0)>w.time)ally=null;
  h.rescueState=ally?(channeling?'channel':'approach'):'clear';
 }else{h.rescueBlockedUntil=0;h.rescueState=null;}
 let dest=ally||h,stop=ally?48:18,intent=ally?'revive':'patrol';
 // Quiet companions watch their own last combat position instead of following P1.
 if(target)h.sentryAnchor={x:h.x,y:h.y};
 if(!ally&&!target&&w.objective?.kind==='defend'&&w.objective.phase==='active'){dest=w.objective.beacon;stop=160;intent='defend';}
 if(!ally&&!target&&intent!=='defend'){
  h.sentryAnchor??={x:h.x,y:h.y};
  const phase=Math.floor(w.time/3.5)+h.id*2.4,anchor=h.sentryAnchor;
  dest={x:Math.max(-map.x+50,Math.min(map.x-50,anchor.x+Math.cos(phase)*56)),y:Math.max(-map.y+50,Math.min(map.y-50,anchor.y+Math.sin(phase)*56))};
 }
 if(!ally&&target){
  const d=distance(h,target),ranged=h.role!=='warrior',sniper=h.core==='sniper'||forms[0]==='markedshot';
  // A ready frost ring needs a brief approach; ordinary ranged spacing otherwise never casts it.
  const frostSetup=h.role==='mage'&&h.skills[1]>0&&h.cd[1]===0&&!forms[1]&&!['ranged','burst','poison','healer'].includes(target.stats?.behavior);
  const low=huntSupport?85:frostSetup?155*h.rangeBonus:ranged?Math.min(sniper?285:235,role.range*h.rangeBonus*(sniper?.72:.65)):85,high=huntSupport?115:frostSetup?175*h.rangeBonus:ranged?role.range*h.rangeBonus*(sniper?.92:.84):125;
  // Hysteresis prevents one-step retreat/advance oscillation at the firing boundary.
  h.kiting=ranged&&(d<low||(h.kiting&&d<low+35));
  if(target.bonusKind||target.objectivePart){h.kiting=false;dest=d>role.range*h.rangeBonus*.7?target:h;stop=0;intent=dest===target?'approach':'attack';}
  else if(!ranged&&target.kind==='mossbell'&&d<(target.stats.bodyRadius||MOSSBELL_BODY_RADIUS)+42){const away=unit(h.x-target.x,h.y-target.y);dest=point(h,away,(target.stats.bodyRadius||MOSSBELL_BODY_RADIUS)+60-d);stop=0;intent='space';}
  else if(h.kiting){const away=unit(h.x-target.x,h.y-target.y);dest=point(h,Math.hypot(away.x,away.y)?away:h.lastMove,150);intent='kite';stop=0;}
  else if(d>high||!w.lineClear(h,target)){dest=target;stop=0;intent='approach';}
  else{dest=h;stop=0;intent='attack';}
  if(ranged&&w.objective?.kind==='defend'&&w.objective.phase==='active'&&target.siege&&d>110&&!foes.some(e=>!e.siege&&distance(h,e)<115)){
   // Siege targets threaten the lamp, so hold a firing lane instead of kiting away from it.
   h.kiting=false;dest=d>role.range*h.rangeBonus*.8?target:h;stop=0;intent=dest===target?'intercept':'attack';
  }
  // Casting consumes E's cooldown before its ring is released. Keep that brief
  // release window in range instead of reverting to ordinary ranged retreat.
  // Loot, healing and danger steering below can still override this position.
  if(h.role==='mage'&&h.action?.type==='frost'&&!h.action.form&&!h.action.fired){dest=h;stop=0;intent='attack';}
  // The arcane station can reach farther than basic attacks. Keep its safe firing
  // position; danger, nearby enemies, healing and rescue still take precedence.
  if(h.role==='mage'&&h.skillAdvances?.[3]&&d>=235&&d<480&&w.lineClear(h,target)&&w.skillFields?.some(f=>f.kind==='orbit'&&f.owner===h.id&&f.life>.6&&distance(h,f)<f.r*.85)){dest=h;stop=0;intent='attack';h.kiting=false;}
 }
 if(!ally&&!(w.objective?.kind==='defend'&&w.objective.phase==='active')){
  const safeGap=h.role==='warrior'?250:175,lootReach=h.role==='warrior'?110:Math.max(185,(h.pickupRadius||75)+50),lootGap=h.role==='warrior'?150:110;
  const collectible=(actor,p)=>(p.type==='xp'||p.type==='gold'&&!actor.ai)||['magnet','amber','wisp'].includes(p.type)&&p.owner===actor.id||p.type==='supply'&&(actor.shield||0)<Math.min(40,actor.maxHp*.2)&&distance(actor,p)<320;
  const loot=w.pickups.filter(p=>collectible(h,p)&&p.life!==0&&distance(p,h)<650&&risk(p,.9)===0&&pathClear(h,p)&&(!target||distance(h,target)>safeGap&&distance(p,h)<lootReach&&foes.every(e=>distance(p,e)>lootGap)))
   .sort((a,b)=>{
    const score=p=>distance(p,h)-(p.id===h.lootTarget?50:0)-(p.type==='gold'?30:0)-(p.type==='supply'?Math.max(0,40-(h.shield||0)):0)+(w.heroes.some(other=>other!==h&&other.ai&&!other.down&&collectible(other,p)&&distance(other,p)+30<distance(h,p))?180:0);
    return score(a)-score(b);
   })[0];
  if(loot){dest=loot;stop=18;intent='loot';h.lootTarget=loot.id;}else h.lootTarget=null;
 }
 if(h.hp/h.maxHp<.7&&(!ally||h.hp/h.maxHp<.3)){
  const medicine=w.pickups.filter(p=>p.type==='potion'&&risk(p,.9)===0&&distance(p,h)<650).sort((a,b)=>distance(a,h)-distance(b,h)+(a.id===h.potionTarget?-65:0)-(b.id===h.potionTarget?-65:0))[0];
  if(medicine){dest=medicine;stop=20;intent='heal';h.potionTarget=medicine.id;}else h.potionTarget=null;
 }
 const impending=zones.filter(a=>zoneDistance(h,a)<a.r+22).sort((a,b)=>a.eta-b.eta)[0];
 const bulletThreats=bullets.map(b=>({b,t:segmentCircle(b,point(b,{x:b.dx,y:b.dy},b.speed*Math.min(.45,b.life)),h,29)})).filter(v=>v.t<Infinity).map(v=>({...v,eta:v.t*Math.min(.45,v.b.life)})).sort((a,b)=>a.eta-b.eta),bullet=bulletThreats[0];
 let desired=distance(h,dest)>stop?unit(dest.x-h.x,dest.y-h.y):{x:0,y:0};
 if(impending){const center=zoneCenter(h,impending),safe=impending.mossbell?warningEscape(impending,h):null;desired=safe?unit(safe.x-h.x,safe.y-h.y):unit(h.x-center.x,h.y-center.y);if(!Math.hypot(desired.x,desired.y))desired=h.lastMove;intent='evade';}
 if(bullet){desired={x:-bullet.b.dy,y:bullet.b.dx};if(!pathClear(h,travelPoint(desired,124)))desired={x:-desired.x,y:-desired.y};intent='evade';}
 const exitDistance=impending?impending.r+22-zoneDistance(h,impending):0;
 // If one roll cannot leave a large circle, align its invulnerability with impact.
 const urgentZone=impending&&impending.eta<(exitDistance<105?.24:.13),urgent=urgentZone||!!bullet;
 const canInterrupt=!h.action||h.action.type==='attack'||h.action.t>=(h.action.cancelAt??h.action.duration*.55);
 // Finish a basic release that lands before the warning. Repeatedly cancelling
 // the final few windup frames leaves a lone ranged hero dodging but not firing.
 const releaseIn=h.action?.type==='attack'&&!h.action.fired?(h.action.windup??0)-h.action.t:Infinity;
 const impactIn=Math.min(impending?.eta??Infinity,bullet?.eta??Infinity),finishShot=releaseIn>=0&&releaseIn<.11&&impactIn>releaseIn+.10&&h.hp/h.maxHp>.18;
 let dodge=!!urgent&&h.dodgeCd<=0&&canInterrupt&&!finishShot;
 // A shield is a timed response to a direct attack, never a reason to stand in poison.
 const guardThreat=bullet&&(!impending||bullet.eta<impending.eta)?{source:bullet.b,eta:bullet.eta}:impending,guardSource=guardThreat?.source;
 const guard=!!((forms[0]==='aegis'||h.role==='warrior'&&h.skillAdvances?.[0])&&h.skills[0]>0&&h.cd[0]===0&&(!h.action||h.action.type==='attack')&&!ally&&h.hp/h.maxHp>=.45&&intent!=='heal'&&!urgentZone&&guardSource&&guardThreat.kind!=='poison'&&guardThreat.eta>=.28&&guardThreat.eta<=.62&&w.lineClear(h,guardSource)&&!zones.some(a=>a.type==='poison'&&zoneDistance(h,a)<a.r+22));
 const heldThreats=[...zones.filter(a=>a.eta<.45&&zoneDistance(h,a)<a.r+22).map(a=>({source:a.source,eta:a.eta,damage:a.source?.stats?.damage??Infinity,poison:a.kind==='poison'||a.type==='poison'})),...bulletThreats.map(v=>({source:v.b,eta:v.eta,damage:v.b.damage??Infinity}))],guardDir=h.guardDir||h.action?.dir||h.lastMove;
 const holdingGuard=['aegis','pairwall'].includes(h.action?.form)&&heldThreats.length>0&&heldThreats.every(a=>{if(!a.source||a.poison||(h.guardUntil||0)-w.time<a.eta+.02)return false;const v=unit(a.source.x-h.x,a.source.y-h.y);return v.x*guardDir.x+v.y*guardDir.y>.35;})&&(h.shield||0)>=heldThreats.reduce((sum,a)=>sum+a.damage,0);
 if(guard||holdingGuard){desired=guard?unit(guardSource.x-h.x,guardSource.y-h.y):{x:0,y:0};intent='guard';dodge=false;}
 // Spend one safe sideways roll to establish a second firing origin, only when E is ready.
 if(!guard&&!urgent&&!ally&&!['heal','evade','loot','patrol'].includes(intent)&&(forms[1]==='shadowvolley'||passives.afterimage)&&h.skills[1]>0&&h.cd[1]===0&&!shadowReady&&!(h.evolutionBranches?.[1]==='garrison'&&h.shadow?.life>0)&&target&&distance(h,target)>170&&distance(h,target)<380*h.rangeBonus&&h.dodgeCd<=0&&canInterrupt){
  const toward=unit(target.x-h.x,target.y-h.y),sides=[{x:-toward.y,y:toward.x},{x:toward.y,y:-toward.x}];
  const side=sides.find(v=>distance(h,travelPoint(v,124))>80&&pathClear(h,travelPoint(v,124))&&risk(travelPoint(v,124),.7)===0&&risk(travelPoint(v,62),.4)===0&&foes.every(e=>distance(travelPoint(v,124),e)>120));
  if(side){desired=side;dodge=true;intent='shadow';}
 }
 const travel=dodge?124:64,projectedGoal=travelPoint(desired,travel),blockedIntent=Math.hypot(desired.x,desired.y)>.5&&(!pathClear(h,projectedGoal)||distance(h,projectedGoal)<travel*.2);
 const candidates=[desired,...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))];
 if(!urgent)candidates.push({x:0,y:0});
 const score=v=>{const p=travelPoint(v,travel);if(!pathClear(h,p))return -1e6;
  let s=(p.limited?((p.x-h.x)*desired.x+(p.y-h.y)*desired.y)/travel:v.x*desired.x+v.y*desired.y)*2-risk(p,dodge?.45:.6)*12;
  // Check the route too: a safe endpoint alone can still cross a poison pool.
  s-=risk(travelPoint(v,travel*.5),.2)*4;
  if(['heal','revive','approach','intercept','defend','space','loot','patrol'].includes(intent))s+=(distance(h,dest)-distance(p,dest))/60;
  if(w.objective?.kind==='defend'&&w.objective.phase==='active'&&!['heal','revive'].includes(intent))s-=Math.max(0,distance(p,w.objective.beacon)-260)/35;
  if(h.role!=='warrior'&&intent!=='heal')for(const e of foes)if(!e.bonusKind&&!(huntSupport&&e===target))s-=Math.max(0,135-distance(p,e))/25;
  for(const p2 of w.heroes)if(p2!==h&&!p2.down)s-=Math.max(0,44-distance(p,p2))/22;
  // A blocked goal needs a short sideways detour. Without this preference a
  // zero vector wins by being microscopically closer to a target behind a rock.
  // Danger penalties remain stronger, so a hazardous detour can still lose.
  if(blockedIntent&&(p.limited?distance(h,p)<.5:!Math.hypot(v.x,v.y)))s-=3;
  if(!Math.hypot(desired.x,desired.y))s-=(p.limited?distance(h,p)/travel:Math.hypot(v.x,v.y))*1.5;
  return s;
 };
 const ranked=candidates.map(move=>({move,score:score(move)})).sort((a,b)=>b.score-a.score);let move=guard||holdingGuard?desired:ranked[0].move;
 if(ranked[0].score<=-1e6)move={x:0,y:0};
 h.aiIntent=intent;
 // Travelling to an ally is not yet a revive channel. Clear a safe route with
 // skills, but keep the actual <82px World revive range focused on rescue.
 const reviving=ally&&distance(h,ally)<82;
 const canCast=target&&w.lineClear(h,target)&&!reviving&&!['evade','heal','guard','shadow'].includes(intent)&&!dodge&&(!h.action||h.action.type==='attack');
 const d=target?distance(h,target):Infinity,near=foes.filter(e=>distance(h,e)<185*h.rangeBonus&&w.lineClear(h,e));
 let skill1=!!canCast&&h.skills[0]>0&&h.cd[0]===0&&d<(h.role==='warrior'?210:450)*h.rangeBonus,skill2=!!canCast&&h.skills[1]>0&&h.cd[1]===0&&d<(h.role==='archer'?380:185)*h.rangeBonus;
 if(forms[0]==='aegis')skill1=guard;
 else if(h.role==='warrior'&&h.skillAdvances?.[0])skill1=guard||skill1;
 const guardEnergy=h.storedGuard||h.shield*.4||0;
 if(passives.guardRelease)skill2=skill2&&(guardEnergy>0||near.length>=3);
 if(passives.rageEdge)skill2=skill2&&((h.resource||0)>=30||near.length>=3);
 if(forms[0]==='icelance'&&skill1&&passives.iceFragments&&(h.core==='frostweaver'||forms[1]==='coldfield')){
  const line=unit(target.x-h.x,target.y-h.y),end=point(h,line,450*h.rangeBonus),aligned=foes.filter(e=>segmentCircle(h,end,e,30)<Infinity&&w.lineClear(h,e)).length;
  const chill=target.chillBy?.[h.id];skill1=target.boss||chill?.brittleUntil>w.time||(chill?.stacks||0)>=2||aligned>=2;
 }
 if(forms[1]==='coldfield'){
  const covered=w.hazards.some(f=>f.type==='coldfield'&&f.owner===h.id&&f.life>.8&&target&&distance(target,f)<f.r);
  const approaching=target&&((target.vx||0)*(h.x-target.x)+(target.vy||0)*(h.y-target.y))>0;
  skill2=!!canCast&&h.skills[1]>0&&h.cd[1]===0&&!covered&&(near.length>0||approaching&&d<225*h.rangeBonus);
 }
 if((forms[0]==='markedshot'||h.core==='sniper')&&passives.markCashout&&skill1)skill1=h.huntTarget===target.id&&(h.huntStacks||0)>=3||target.hp<target.maxHp*.2;
 if(passives.delayedVolley&&skill2)skill2=shadowReady||(h.resource||0)>=60;
 if(skill2&&(shadowReady||passives.guardRelease&&guardEnergy>0||passives.rageEdge&&(h.resource||0)>=30))skill1=false;
 const wanted=[skill1,skill2];
 for(const slot of [2,3]){const range=h.role==='warrior'&&slot===2?190:480;wanted[slot]=!!canCast&&(h.skills[slot]||0)>0&&h.cd[slot]===0&&d<range*h.rangeBonus;}
 // Set up the paired field/pin before spending its finisher, regardless of button order.
 if(h.role==='mage'&&wanted[2]&&wanted[3])wanted[2]=false;
 if(h.role==='mage'&&h.skillAdvances?.[1]&&wanted[0]&&wanted[1])wanted[0]=false;
 if(h.role==='archer'&&wanted[0]&&wanted[2]&&!(target.pinnedBy?.[h.id]>w.time))wanted[0]=false;
 if(h.role==='archer'&&wanted[1]&&wanted[3])wanted[1]=false;
 if(h.role==='warrior'&&h.skillAdvances?.[3]&&wanted[1]&&wanted[3])wanted[1]=false;
 const loadout=equippedSkills(h);
 // Ease into the melee firing pocket instead of using full-speed on/off input
 // across a 5px band. This keeps delayed samples from oscillating into contact.
 if(h.role==='warrior'&&target?.kind==='mossbell'&&!dodge&&!guard&&!holdingGuard&&['space','approach','attack'].includes(intent)){
  const standOff=(target.stats.bodyRadius||MOSSBELL_BODY_RADIUS)+60,toward=((target.x-h.x)*move.x+(target.y-h.y)*move.y)/Math.max(1,d);
  if(d<standOff+64&&Math.abs(toward)>.5){const margin=toward>0?d-standOff:standOff-d,factor=Math.max(0,Math.min(1,margin/64));move={x:move.x*factor,y:move.y*factor};}
 }
 return {...move,dodge:dodge&&Math.hypot(move.x,move.y)>.5,skill1:!!wanted[loadout[0]],skill2:!!wanted[loadout[1]]};
}
