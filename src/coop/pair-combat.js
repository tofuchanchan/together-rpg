import {SKILL_PAIRS,equippedSkills} from './skill-pairs.js';
import {addDot,addChill,buildFx} from './build-combat.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const direction=(a,b)=>{const d=distance(a,b)||1;return{x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
const polar=a=>({x:Math.cos(a),y:Math.sin(a)});
function comboFeedback(w,h,key){w.emit('buildBurst',{id:h.id,key});w.shake=Math.max(w.shake,.065);}
export function masteryActive(h,key){const p=SKILL_PAIRS[key];return !!h.pairMastery?.[key]&&p.slots.every(s=>equippedSkills(h).includes(s)&&h.skills[s]>=3&&h.skillAdvances?.[s])&&(h.passives[p.component]||0)>=2;}
export function configurePairAction(w,h,a){
 if(a.slot===undefined||!(a.slot>=2||h.skillAdvances?.[a.slot]))return;
 a.pairSkill=true;a.form=null;a.buildBranch=null;a.windup=.16;a.activeEnd=.24;a.duration=.42;a.cancelAt=.23;
 if(h.role==='warrior'&&a.slot===0){a.type='bash';a.form='pairwall';a.windup=.08;a.activeEnd=.88;a.duration=1.02;a.cancelAt=.25;}
 if(h.role==='warrior'&&a.slot===1){a.windup=.12;a.activeEnd=.9;a.duration=1.05;a.cancelAt=.27;a.pulses=0;}
 if(h.role==='warrior'&&a.slot===3&&h.skillAdvances[3]){a.windup=.3;a.activeEnd=.38;a.duration=.56;a.cancelAt=.36;}
 if(h.role==='warrior'&&a.slot===2){a.windup=.18;a.activeEnd=.26;a.duration=.44;a.cancelAt=.25;}
 if(h.role==='archer'&&a.slot===3){a.windup=.22;a.activeEnd=.3;a.duration=.46;a.cancelAt=.28;}
 if(h.role==='mage'&&a.slot===3){a.windup=.22;a.activeEnd=.32;a.duration=.48;a.cancelAt=.3;}
 if(h.role==='mage'&&a.slot===2){a.activeEnd=.3;a.duration=.45;}
}
function field(w,h,data){
 w.skillFields??=[];
 const f={owner:h.id,origin:{x:h.x,y:h.y},x:h.x,y:h.y,age:0,next:0,eventId:h.action?.eventId??w.nextAttackId++,...data};
 const owned=w.skillFields.filter(o=>o.owner===h.id&&o.kind===f.kind&&!!o.echo===!!f.echo);if(owned.length>=(f.echo?1:3)){const old=owned[0];w.skillFields=w.skillFields.filter(o=>o!==old);}
 w.skillFields.push(f);return f;
}
function shot(w,h,dir,slot,damage,{type='pierce',visual='pair-blade',speed=650,...extra}={}){
 if(w.projectiles.filter(p=>p.owner===h.id&&p.pair).length>=100)return null;
 const p=w.shoot(h,dir,type,w.skillDamage(h,slot,damage),speed,'skill',false,slot);Object.assign(p,{visual,pair:visual,slot,...extra});return p;
}
function missiles(w,h,origin,slot,count,eventId,damage=9,ordinal=0){
 const targets=w.enemies.filter(e=>e.hp>0&&distance(origin,e)<650&&w.lineClear(origin,e)).sort((a,b)=>distance(origin,a)-distance(origin,b));if(!targets.length)return;
 for(let i=0;i<count;i++){const target=targets[(i+ordinal)%targets.length],d=direction(origin,target),angle=Math.atan2(d.y,d.x)+(i%2?1:-1)*(.45+(i+ordinal)%5*.11);
  const p=shot(w,h,polar(angle),slot,damage,{type:'bolt',visual:'pair-arcane',speed:340,homing:true,target:target.id,eventId,life:2.4});if(p){const muzzle={x:origin.x+d.x*32,y:origin.y+d.y*32};p.x=w.lineClear(origin,muzzle)?muzzle.x:origin.x;p.y=w.lineClear(origin,muzzle)?muzzle.y:origin.y;p.muzzle=0;}
 }
}
function stun(w,e,h,duration,eventId){e.slow=Math.max(e.slow||0,duration);if(!e.boss)e.freeze=Math.max(e.freeze||0,duration);e.pinnedBy??={};e.pinnedBy[h.id]=w.time+duration;}
function radial(w,h,center,r,damage,{stunTime=0,knock=140,eventId,front=null}={}){
 for(const e of w.enemies){if(e.hp<=0||distance(center,e)>r||!w.lineClear(center,e))continue;const d=direction(center,e);if(front&&d.x*front.x+d.y*front.y<0)continue;
  w.damageEnemy(e,damage,h,knock,'skill',0,d,{eventId});if(stunTime)stun(w,e,h,stunTime,eventId);
 }
}
export function updatePairAction(w,h,a){
 if(!a.pairSkill)return false;if(a.t<a.windup)return true;const s=a.slot,advanced=!!h.skillAdvances?.[s],range=w.skillRange(h,s);
 if(h.role==='warrior'&&s===0){
  if(!a.fired){a.fired=true;a.absorbed=0;h.guardUntil=w.time+.8;h.guardDir={...a.dir};h.shield=Math.min(120*h.shieldPower,h.shield+35*h.shieldPower);buildFx(w,'pair-wall',h,100,.8,{dir:a.dir});}
  if(a.t>=a.activeEnd&&!a.released){a.released=true;h.guardUntil=0;const r=220*range;radial(w,h,h,r,w.skillDamage(h,s,30)+Math.min(35,a.absorbed)*.8,{stunTime:.45,eventId:a.eventId,front:a.dir});buildFx(w,'pair-wave',h,r,.45,{dir:a.dir});}
  return true;
 }
 if(h.role==='warrior'&&s===1){
  if(a.pulses<4&&a.t>=a.windup+a.pulses*.2){const i=a.pulses++;radial(w,h,h,165*range,w.skillDamage(h,s,13),{eventId:a.eventId,knock:25});buildFx(w,'pair-tornado',h,165*range,.25);shot(w,h,polar(Math.atan2(a.dir.y,a.dir.x)+i*Math.PI/2),s,17,{life:.6});
   const scar=!a.etched&&masteryActive(h,'blades')&&w.skillFields?.find(f=>f.owner===h.id&&f.kind==='scar'&&distance(h,f)<180&&w.lineClear(h,f));
   if(scar){a.etched=true;comboFeedback(w,h,'blades');buildFx(w,'pair-tornado',scar,85,.3);for(let j=0;j<4;j++){const p=shot(w,h,polar(j*Math.PI/2),s,12,{life:.7,source:'proc'});if(p){p.x=scar.x;p.y=scar.y;p.muzzle=0;}}}
  }return true;
 }
 if(a.fired)return true;a.fired=true;const target=w.nearest(h,480),point=target?{x:target.x,y:target.y}:{x:h.x+a.dir.x*180,y:h.y+a.dir.y*180};
 if(h.role==='warrior'){
  if(s===2){field(w,h,{kind:'wave',r:(advanced?255:165)*range,life:advanced?.65:.2,damage:w.skillDamage(h,s,25),stun:advanced?.9:.45,hit:new Set(),eventId:a.eventId});
   if(masteryActive(h,'fortress')&&h.wallCharge){h.wallCharge=false;comboFeedback(w,h,'fortress');field(w,h,{kind:'wave',r:280*range,life:.9,next:.3,damage:w.skillDamage(h,s,14),stun:.3,hit:new Set(),eventId:a.eventId});}
  }
  if(s===3)shot(w,h,a.dir,s,advanced?52:34,{visual:advanced?'pair-ichi':'pair-blade',speed:advanced?900:600,life:advanced?.85:.7,radius:advanced?14:28});
 }else if(h.role==='archer'){
  if(s===0)shot(w,h,a.dir,s,43,{visual:'pair-rail',speed:950,life:1,rail:true});
  if(s===2){for(const off of advanced?[-24,0,24]:[0]){const p=shot(w,h,a.dir,s,advanced?25:33,{visual:'pair-pin',pin:advanced?1:.7,knock:0,speed:720,life:.95});if(p){p.x-=a.dir.y*off;p.y+=a.dir.x*off;}}}
  if(s===1)for(let i=-3;i<=3;i++)shot(w,h,polar(Math.atan2(a.dir.y,a.dir.x)+i*.16),s,16,{type:'arrow',visual:'pair-fan',bounce:true,life:1.1});
  if(s===3){const n=advanced?3:1;for(let i=0;i<n;i++)field(w,h,{kind:'rain',x:point.x+a.dir.x*i*95,y:point.y+a.dir.y*i*95,r:105*range,life:1.8+i*.28,next:.3+i*.28,pulses:0,damage:w.skillDamage(h,s,12),eventId:a.eventId});}
 }else{
  if(s===2){const accelerated=advanced&&w.skillFields?.some(f=>f.kind==='orbit'&&f.owner===h.id&&distance(h,f)<f.r);field(w,h,{kind:'barrage',slot:s,life:1.6,next:0,shots:0,total:advanced?14:6,interval:accelerated?.045:.085,eventId:a.eventId});
   if(masteryActive(h,'stars')&&accelerated){comboFeedback(w,h,'stars');missiles(w,h,h,3,6,a.eventId,9);}
  }
  if(s===3)field(w,h,{kind:'orbit',slot:s,r:130*range,life:advanced?4:3,next:.2,pulses:0,total:advanced?4:3,eventId:a.eventId});
  if(s===0)shot(w,h,a.dir,s,42,{type:'fireball',visual:'pair-fire',speed:390,fireField:true,life:1.7});
  if(s===1){field(w,h,{kind:'ice',r:190*range,life:3.4,next:0,pulses:0,damage:w.skillDamage(h,s,10),eventId:a.eventId});}
 }
 return true;
}
export function absorbPair(h,absorbed){if(h.action?.form==='pairwall'&&absorbed>0){h.action.absorbed=(h.action.absorbed||0)+absorbed;if(masteryActive(h,'fortress'))h.wallCharge=true;}}
export function steerPairProjectile(w,p,dt){if(!p.homing)return;let e=w.enemies.find(e=>e.id===p.target&&e.hp>0);if(!e||!w.lineClear(p,e))e=w.enemies.filter(e=>e.hp>0&&distance(p,e)<550&&w.lineClear(p,e)).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!e)return;p.target=e.id;const d=direction(p,e),k=1-Math.exp(-dt*9),x=p.dx+(d.x-p.dx)*k,y=p.dy+(d.y-p.dy)*k,n=Math.hypot(x,y)||1;p.dx=x/n;p.dy=y/n;}
export function pairProjectileHit(w,p,e,h,damage){
 if(!p.pair)return damage;
 if(p.pair==='pair-ichi'&&!p.etched&&masteryActive(h,'blades')){p.etched=true;field(w,h,{kind:'scar',x:e.x,y:e.y,r:165,life:3,eventId:p.eventId});}
 if(p.pin)stun(w,e,h,p.pin,p.eventId);
 if(p.rail){damage*=1+Math.min(.45,Math.max(0,p.hit.size-1)*.15);
  if(masteryActive(h,'rail')&&!p.split&&e.pinnedBy?.[h.id]>w.time){p.split=true;comboFeedback(w,h,'rail');for(const off of [-.18,.18]){const q=shot(w,h,polar(Math.atan2(p.dy,p.dx)+off),0,20,{visual:'pair-rail',source:'proc',life:.65});if(q){q.x=e.x;q.y=e.y;q.muzzle=0;q.hit.add(e.id);}}}
 }
 if(p.bounce){const target=w.enemies.filter(t=>t.hp>0&&t!==e&&!p.hit.has(t.id)&&distance(t,e)<220&&w.lineClear(e,t)).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(target){const q=shot(w,h,direction(e,target),1,10,{type:'arrow',visual:'pair-fan',source:'proc',life:.6});if(q){q.x=e.x;q.y=e.y;q.muzzle=0;q.hit.add(e.id);}}
  if(masteryActive(h,'storm')&&h.rainEchoEvent!==p.eventId&&w.skillFields?.some(f=>f.kind==='rain'&&!f.echo&&f.owner===h.id&&distance(e,f)<f.r)){h.rainEchoEvent=p.eventId;comboFeedback(w,h,'storm');field(w,h,{kind:'rain',echo:true,x:e.x,y:e.y,r:130,life:.45,next:.2,pulses:2,damage:w.skillDamage(h,3,36),eventId:p.eventId});}
 }
 if(p.fireField){
  if(masteryActive(h,'elements')&&e.chillBy?.[h.id]?.until>w.time){e.chillBy[h.id].until=0;e.chillBy[h.id].stacks=0;comboFeedback(w,h,'elements');radial(w,h,e,125,22*h.skillPower,{eventId:p.eventId,knock:80});buildFx(w,'pair-steam',e,125,.5);}
  addDot(w,e,h,'burn',7*h.skillPower*h.dotPower,3);field(w,h,{kind:'fire',x:e.x,y:e.y,r:100*p.rangeBonus,life:3.1,next:.1,pulses:0,damage:5*h.skillPower*h.dotPower,eventId:p.eventId});
 }
 return damage;
}
export function tickPairFields(w,dt){
 for(const f of w.skillFields||[]){const h=w.heroes[f.owner];if(!h||h.down){f.life=0;continue;}f.life-=dt;f.age+=dt;if(f.life<=0&&f.kind!=='wave')continue;
  if(f.kind==='scar'){continue;}
  if(f.kind==='wave'){if(f.age<f.next)continue;const r=f.r*Math.min(1,(f.age-f.next)/Math.max(.08,Math.min(.4,f.life+f.age-f.next)));for(const e of w.enemies)if(e.hp>0&&!f.hit.has(e.id)&&distance(f,e)<r&&w.lineClear(f,e)){f.hit.add(e.id);w.damageEnemy(e,f.damage,h,210,'skill',0,direction(f,e),{eventId:f.eventId});stun(w,e,h,f.stun,f.eventId);}continue;}
  if(f.age<f.next)continue;
  if(f.kind==='barrage'){missiles(w,h,h,2,Math.min(2,f.total-f.shots),f.eventId,9,f.shots);f.shots+=2;f.next+=f.interval;if(f.shots>=f.total)f.life=0;continue;}
  if(f.kind==='orbit'){missiles(w,h,f,3,h.skillAdvances[3]?3:2,f.eventId,8);f.pulses++;f.next+=1;if(f.pulses>=f.total)f.next=Infinity;continue;}
  if(f.kind==='rain'){radial(w,h,f,f.r,f.damage,{knock:6,eventId:f.eventId});buildFx(w,'pair-rain',f,f.r,.4);f.pulses++;f.next+=.45;if(f.pulses>=3)f.next=Infinity;continue;}
  if(f.kind==='ice'||f.kind==='fire'){for(const e of w.enemies)if(e.hp>0&&distance(f,e)<f.r&&w.lineClear(f,e)){w.damageEnemy(e,f.damage,h,15,'skill',0,null,{eventId:f.eventId});if(f.kind==='ice')addChill(w,e,h);else addDot(w,e,h,'burn',f.damage,2);}buildFx(w,f.kind==='ice'?'pair-ice':'pair-fire',f,f.r,.55);f.next+=.8;f.pulses++;if(f.kind==='ice'&&f.pulses>=4)f.next=Infinity;}
 }
 w.skillFields=(w.skillFields||[]).filter(f=>f.life>0);
}
