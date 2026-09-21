import {partyPressure,pressurePlan} from './pressure.js';
import {rollEquipment,applyEquipment,resetEquipment} from './equipment.js';
import {enterShop} from './shop.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const ROUTES=Object.freeze({
 nursery:{key:'nursery',name:'孵化林地',objective:'nest',reward:'xp',risk:'险路',description:'摧毁三个巢穴，切断不同敌人的来源。',danger:'持续孵化 · 90 秒内完成',prize:'经验 +25% · 金币略少',art:'nest'},
 watchpost:{key:'watchpost',name:'遗失灯庭',objective:'defend',reward:'gold',risk:'险路',description:'保护林灯耐久，拦截试图拆毁它的敌人。',danger:'多方向攻城 · 守住 60 秒',prize:'金币 +25% · 经验略少',art:'beacon'},
 relic:{key:'relic',name:'封印根窟',objective:'nest',reward:'equipment',risk:'险路',description:'拆除巢穴，取回被根须包裹的遗物。',danger:'巢穴围攻 · 90 秒内完成',prize:'本职业装备二选一 · 经验与金币减少',art:'nest'},
 clearing:{key:'clearing',name:'林间缓坡',objective:'clear',reward:'rest',risk:'缓路',description:'消灭有限援军，整理队形后继续前进。',danger:'敌军数量减少 15%',prize:'普通掉落 · 完成后回复 10% 生命',art:'beacon'},
});
export const NEST_DEF={name:'孵化巢穴',hp:180,speed:0,range:0,radius:0,windup:1,damage:0,cd:4,behavior:'nest',size:92,xp:0,bodyRadius:40,contactDamage:0};
export const objectiveName=kind=>({nest:'摧毁巢穴',defend:'保护据点',clear:'普通清场'})[kind]||'';
export function openRoute(w){
 const next=w.room+1;if(w.mode!=='complete'||![3,6,8].includes(next)||w.route?.room===next)return false;
 // One safe option always remains available; encounter variety lives in the risky card.
 const risky=next===3?'nursery':next===6?'watchpost':w.random()<.5?'relic':'watchpost';
 const options=w.random()<.5?[risky,'clearing']:['clearing',risky];
 w.routeMenu={room:next,options:options.map(key=>({...ROUTES[key]})),selection:Array(w.humanCount).fill(0),votes:Array(w.humanCount).fill(null),captain:(w.routeTurn||0)%w.humanCount,disputed:false};
 w.mode='route';w.clearBuffers();return true;
}
export function voteRoute(w,slot,index){
 const m=w.routeMenu;if(w.mode!=='route'||!Number.isInteger(slot)||slot<0||slot>=w.humanCount||!Number.isInteger(index)||index<0||index>=m.options.length)return false;
 m.selection[slot]=index;m.votes[slot]=index;
 if(m.votes.every(v=>v!==null)){if(m.votes.every(v=>v===m.votes[0]))return chooseRoute(w,m.votes[0]);m.disputed=true;}
 return true;
}
export function decideRoute(w,slot){const m=w.routeMenu;if(w.mode!=='route'||!m?.disputed||m.captain!==slot)return false;return chooseRoute(w,m.selection[slot]);}
function chooseRoute(w,index){const m=w.routeMenu;w.route={...m.options[index],room:m.room};w.routeTurn=(w.routeTurn||0)+1;w.routeMenu=null;w.mode='complete';w.nextRoom();return true;}
export function startObjective(w){
 w.objective=null;w.routeLoot=null;
 if(w.wave!==2||w.room%10===0||w.route?.room!==w.room)return false;
 const kind=w.route.objective,plan=partyPressure(pressurePlan(w.room,w.wave),w.heroes.length);
 const o=w.objective={kind,phase:'active',success:null,remaining:kind==='nest'?90:kind==='defend'?60:plan.duration,duration:kind==='nest'?90:kind==='defend'?60:plan.duration,spawned:0,budget:Math.round(plan.totalBudget*(w.route.reward==='equipment'?.82:1)),cap:plan.aliveCap,target:plan.targetAlive,nextSpawn:0,lastAlive:0,xp:0,gold:0,fractions:{},nests:[],beacon:null,settled:false};
 if(kind==='clear')return false;
 w.pressure=null;w.pressureState=null;w.pressureClosed=false;w.waveDuration=o.duration;w.enrageAt=o.duration+25;
 if(kind==='nest'){
  [[-245,-100],[245,-100],[0,225]].forEach(([x,y],i)=>{const e=w.createEnemy('nest',x,y);e.objectivePart=true;e.nestIndex=i;e.noLoot=true;e.hp=e.maxHp=Math.round((120+w.room*15)*(1+.55*(w.heroes.length-1)));e.knock={x:0,y:0};w.enemies.push(e);o.nests.push({id:e.id,x,y,index:i,hp:e.hp,maxHp:e.maxHp});});
 }else o.beacon={id:'beacon',x:0,y:15,hp:Math.round(450*(1+.5*(w.heroes.length-1))),maxHp:Math.round(450*(1+.5*(w.heroes.length-1))),hitFlash:0};
 tickObjective(w,0);return true;
}
function spawnObjectiveEnemies(w,o,count){
 const nests=w.enemies.filter(e=>e.objectivePart&&e.hp>0);
 for(let i=0;i<count&&o.spawned<o.budget;i++){
  if(o.kind==='nest'&&!nests.length)break;
  const index=o.spawned,origin=o.kind==='nest'?nests[index%nests.length]:o.beacon,angle=index*2.399963,r=o.kind==='nest'?85:440;
  const kind=o.kind==='nest'?['seedling','dustling','gnat'][origin.nestIndex]:index%11===10?'goblin':['seedling','dustling'][index%2];
  const e=w.createEnemy(kind,origin.x+Math.cos(angle)*r,origin.y+Math.sin(angle)*r);e.originNest=o.kind==='nest'?origin.id:null;e.objectiveMob=true;e.siege=o.kind==='defend'&&index%3===0;e.spawnGrace=.75;e.cd=1;
  w.moveActor(e,0,0,20);w.enemies.push(e);o.spawned++;w.waveSpawned++;w.effects.push({type:'spawn',x:e.x,y:e.y,r:25,life:.75,max:.75});
 }
}
export function tickObjective(w,dt){
 const o=w.objective;if(!o||o.kind==='clear'||w.bonusEvent||w.mode!=='play')return;
 if(o.phase==='collect'){o.remaining=Math.max(0,o.remaining-dt);if(o.remaining===0)o.phase='finished';return;}
 if(o.phase==='cleanup'){if(!w.enemies.some(e=>e.hp>0)){o.phase='collect';o.remaining=4;}return;}
 if(o.phase!=='active')return;
 o.remaining=Math.max(0,o.remaining-dt);if(o.beacon)o.beacon.hitFlash=Math.max(0,o.beacon.hitFlash-dt);
 for(const n of o.nests){const e=w.enemies.find(e=>e.id===n.id);n.hp=e?.hp||0;if(e)e.vulnerable=((o.duration-o.remaining+n.index*.9)%4)>2.8;}
 if(o.kind==='nest'&&o.nests.every(n=>n.hp<=0)){resolveObjective(w,true);return;}
 if(o.kind==='defend'&&o.beacon.hp<=0){resolveObjective(w,false);return;}
 if(o.remaining<=0){resolveObjective(w,o.kind==='defend');return;}
 const alive=w.enemies.filter(e=>e.hp>0&&!e.objectivePart).length,deaths=Math.max(0,o.lastAlive-alive),elapsed=o.duration-o.remaining;
 const sourceFactor=o.kind==='nest'?o.nests.filter(n=>n.hp>0).length/3:1,target=Math.ceil(o.target*sourceFactor);
 let count=Math.min(3,Math.max(0,target-alive,deaths));
 if(elapsed>=o.nextSpawn){count=Math.max(count,Math.ceil(3*sourceFactor));o.nextSpawn=elapsed+3.5;}
 count=Math.min(count,Math.max(0,o.cap-alive),o.budget-o.spawned);spawnObjectiveEnemies(w,o,count);o.lastAlive=alive+count;w.pressureClosed=o.spawned>=o.budget;
}
export function resolveObjective(w,success){
 const o=w.objective;if(!o||o.settled)return false;o.settled=true;o.success=success;w.pressure=null;w.pressureClosed=true;w.projectiles=w.projectiles.filter(p=>!p.hostile);w.hazards=w.hazards.filter(p=>p.type!=='poison');w.waveDuration=0;
 if(success){
  o.phase=o.kind==='clear'?'finished':'collect';o.remaining=4;
  if(o.kind!=='clear')w.enemies=[];
  if(w.route.reward==='xp'||w.route.reward==='gold'){
   const type=w.route.reward,amount=Math.floor(o[type]*.25)*(type==='gold'&&w.heroes.length===1?2:1),center=o.beacon||{x:0,y:0};
   for(let left=amount;left>0;){const value=Math.min(left,type==='xp'?3:1);w.dropPickup({type,value,x:center.x+(w.random()-.5)*140,y:center.y+(w.random()-.5)*100});left-=value;}
   o.bonus={type,amount};
  }else if(w.route.reward==='rest'){for(const h of w.heroes)if(!h.down)h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.1);}
  else if(w.route.reward==='equipment'){
   const offers=w.heroes.slice(0,w.humanCount).map(h=>['weapon','armor'].map(slot=>{let first=true;return rollEquipment(h.role,slot,w.room,()=>{const r=w.random();if(!first)return r;first=false;const floor=w.room<6?.14:.055;return floor+(1-floor)*r;},`route-${w.nextId++}`);}));
   w.routeLoot={offers,ready:Array(w.humanCount).fill(false),selection:Array(w.humanCount).fill(0),room:w.room};
  }
 }else{
  o.phase='cleanup';const survivors=o.nests.filter(n=>n.hp>0);w.enemies=w.enemies.filter(e=>!e.objectivePart);
  // The lamp attack cannot become a player hit when ordinary combat resumes.
  for(const e of w.enemies)if(e.action?.kind==='siege'){e.action=null;e.cd=Math.max(e.cd,.6);}
  for(const n of survivors){const e=w.createEnemy('goblin',n.x,n.y,1);e.objectiveGuard=true;e.noLoot=true;e.spawnGrace=1;w.enemies.push(e);}
 }
 w.emit('objectiveComplete',{kind:o.kind,success});return true;
}
export function routeDrops(w,e,drops){
 if(e.noLoot||e.objectivePart)return [];
 const o=w.objective;if(!o||w.bonusEvent||o.phase!=='active'||e.boss)return drops;
 return drops.flatMap(item=>{
  if(!['xp','gold'].includes(item.type))return [item];o[item.type]+=item.value;
  const factor=w.route.reward==='equipment'?(item.type==='xp'?.75:.25):w.route.reward==='xp'&&item.type==='gold'?.75:w.route.reward==='gold'&&item.type==='xp'?.8:1;
  const exact=item.value*factor+(o.fractions[item.type]||0),value=Math.floor(exact+1e-9);o.fractions[item.type]=exact-value;return value?[{...item,value}]:[];
 });
}
export function claimRouteReward(w,slot,index){
 const loot=w.routeLoot;if(w.mode!=='routeReward'||!loot||!Number.isInteger(slot)||slot<0||slot>=w.humanCount||loot.ready[slot]||![-1,0,1].includes(index))return false;
 if(index>=0){if(!applyEquipment(w.heroes[slot],loot.offers[slot][index]).ok)return false;resetEquipment(w,slot);}
 loot.ready[slot]=true;if(loot.ready.every(Boolean)){w.routeLoot=null;w.mode='complete';w.clearBuffers();enterShop(w);}return true;
}
export function updateSiegeEnemy(w,e,dt){
 const o=w.objective,b=o?.beacon;if(o?.phase!=='active'||o.kind!=='defend'||b.hp<=0||!e.siege)return false;
 const nearby=w.heroes.filter(h=>!h.down).sort((a,c)=>distance(e,a)-distance(e,c))[0];
 if(e.action?.kind!=='siege'&&nearby&&(distance(e,nearby)<135||w.time-(e.lastHit??-9)<1.5&&distance(e,nearby)<300))return false;
 if(e.action&&e.action.kind!=='siege')return false;
 if(e.action){const a=e.action;a.t+=dt;if(!a.hit&&a.t>=a.windup){a.hit=true;if(distance(e,b)<105&&w.lineClear(e,b)){const damage=Math.min(b.maxHp*.04,e.stats.damage*.5+1);b.hp=Math.max(0,b.hp-damage);b.hitFlash=.2;w.effects.push({type:'contact',x:b.x,y:b.y,height:32,dir:{x:0,y:1},size:55,hurt:true,life:.22,max:.22,layer:'depth'});}}if(a.t>a.windup+.35)e.action=null;return true;}
 const d=distance(e,b);
 if(d<80&&e.cd===0){e.action={kind:'siege',x:b.x,y:b.y,r:75,t:0,windup:.9,hit:false,attackId:w.nextAttackId++};e.cd=1.8;return true;}
 if(d>65){const speed=e.stats.speed*(e.slow>0?.38:1);w.moveActor(e,(b.x-e.x)/d*speed*dt,(b.y-e.y)/d*speed*dt,22);e.stride+=speed*dt/60;e.face=(Math.round(Math.atan2(b.y-e.y,b.x-e.x)/(Math.PI/4))+8)%8;}return true;
}
