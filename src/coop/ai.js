import {segmentCircle} from './collision.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:0};};
const point=(h,v,d)=>({x:h.x+v.x*d,y:h.y+v.y*d});

function zoneCenter(p,a){if(!a.from)return a;const dx=a.x-a.from.x,dy=a.y-a.from.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.from.x)*dx+(p.y-a.from.y)*dy)/l)):0;return{x:a.from.x+dx*t,y:a.from.y+dy*t};}
const zoneDistance=(p,a)=>distance(p,zoneCenter(p,a));
export function companionInput(w,h,role,map){
 const foes=w.enemies.filter(e=>e.hp>0),target=w.nearest(h)||foes.slice().sort((a,b)=>distance(a,h)-distance(b,h))[0];
 const ally=w.heroes.find(p=>p.down),leader=w.heroes.find(p=>!p.ai&&!p.down)||h;
 const zones=[...(w.bossWarnings||[]).filter(a=>!a.hit).map(a=>({...a,eta:Math.max(0,a.windup-a.t)})),...foes.map(e=>e.action).filter(a=>a&&(!a.hit||(a.from&&a.t<a.windup+a.travelTime))&&a.kind!=='healer').map(a=>({...a,eta:Math.max(0,a.windup-a.t)})),...w.hazards.filter(f=>f.type==='poison').map(f=>({...f,eta:Math.max(0,f.timer)}))];
 const bullets=w.projectiles.filter(p=>p.hostile&&p.life>0);
 const risk=(p,horizon=.4)=>zones.reduce((n,a)=>n+(a.eta<horizon&&zoneDistance(p,a)<a.r+25?5+(a.r+25-zoneDistance(p,a))/30:0),0)+bullets.reduce((n,b)=>n+(segmentCircle(b,point(b,{x:b.dx,y:b.dy},b.speed*Math.min(horizon,b.life)),p,29)<Infinity?7:0),0);
 const pathClear=(a,b)=>Math.abs(b.x)<map.x-22&&Math.abs(b.y)<map.y-22&&w.obstacles.every(o=>segmentCircle(a,b,o,o.r+21)===Infinity);
 let dest=ally||leader,stop=ally?48:90,intent=ally?'revive':'follow';
 if(!ally&&target){
  const d=distance(h,target),ranged=h.role!=='warrior',low=ranged?Math.min(235,role.range*h.rangeBonus*.65):85,high=ranged?role.range*h.rangeBonus*.84:125;
  // Hysteresis prevents one-step retreat/advance oscillation at the firing boundary.
  h.kiting=ranged&&(d<low||(h.kiting&&d<low+35));
  if(h.kiting){const away=unit(h.x-target.x,h.y-target.y);dest=point(h,Math.hypot(away.x,away.y)?away:h.lastMove,150);intent='kite';stop=0;}
  else if(d>high||!w.lineClear(h,target)){dest=target;stop=0;intent='approach';}
  else{dest=h;stop=0;intent='attack';}
 }
 if(h.hp/h.maxHp<.7&&(!ally||h.hp/h.maxHp<.3)){
  const medicine=w.pickups.filter(p=>risk(p,.9)===0&&distance(p,h)<650).sort((a,b)=>distance(a,h)-distance(b,h)+(a.id===h.potionTarget?-65:0)-(b.id===h.potionTarget?-65:0))[0];
  if(medicine){dest=medicine;stop=20;intent='heal';h.potionTarget=medicine.id;}else h.potionTarget=null;
 }
 const impending=zones.filter(a=>zoneDistance(h,a)<a.r+22).sort((a,b)=>a.eta-b.eta)[0];
 const bullet=bullets.map(b=>({b,t:segmentCircle(b,point(b,{x:b.dx,y:b.dy},b.speed*Math.min(.45,b.life)),h,29)})).filter(v=>v.t<Infinity).sort((a,b)=>a.t-b.t)[0];
 let desired=distance(h,dest)>stop?unit(dest.x-h.x,dest.y-h.y):{x:0,y:0};
 if(impending){const center=zoneCenter(h,impending);desired=unit(h.x-center.x,h.y-center.y);if(!Math.hypot(desired.x,desired.y))desired=h.lastMove;intent='evade';}
 if(bullet){desired={x:-bullet.b.dy,y:bullet.b.dx};if(!pathClear(h,point(h,desired,112)))desired={x:-desired.x,y:-desired.y};intent='evade';}
 const exitDistance=impending?impending.r+22-zoneDistance(h,impending):0;
 // If one roll cannot leave a large circle, align its invulnerability with impact.
 const urgent=(impending&&impending.eta<(exitDistance<105?.24:.13))||!!bullet;
 const dodge=!!urgent&&h.dodgeCd<=0&&(!h.action||h.action.type==='attack'||h.action.t>=(h.action.cancelAt??h.action.duration*.55));
 const travel=dodge?112:64;
 const candidates=[desired,...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))];
 if(!urgent)candidates.push({x:0,y:0});
 const score=v=>{const p=point(h,v,travel);if(!pathClear(h,p))return -1e6;
  let s=(v.x*desired.x+v.y*desired.y)*2-risk(p,dodge?.45:.6)*12;
  // Check the route too: a safe endpoint alone can still cross a poison pool.
  s-=risk(point(h,v,travel*.5),.2)*4;
  if(intent==='heal'||intent==='revive'||intent==='approach'||intent==='follow')s+=(distance(h,dest)-distance(p,dest))/60;
  if(h.role!=='warrior'&&intent!=='heal')for(const e of foes)s-=Math.max(0,135-distance(p,e))/25;
  for(const p2 of w.heroes)if(p2!==h&&!p2.down)s-=Math.max(0,44-distance(p,p2))/22;
  if(!Math.hypot(desired.x,desired.y))s-=Math.hypot(v.x,v.y)*1.5;
  return s;
 };
 const ranked=candidates.map(move=>({move,score:score(move)})).sort((a,b)=>b.score-a.score);let move=ranked[0].move;
 if(ranked[0].score<=-1e6)move={x:0,y:0};
 h.aiIntent=intent;
 const canCast=target&&w.lineClear(h,target)&&intent!=='evade'&&intent!=='heal';
 return {...move,dodge:dodge&&Math.hypot(move.x,move.y)>.5,skill1:!!canCast&&h.skills[0]>0&&h.cd[0]===0&&distance(h,target)<(h.role==='warrior'?210:450)*h.rangeBonus,skill2:!!canCast&&h.skills[1]>0&&h.cd[1]===0&&distance(h,target)<(h.role==='archer'?380:185)*h.rangeBonus};
}
