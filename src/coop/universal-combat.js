import {refundCooldown} from './build-combat.js';
import {segmentCircle} from './collision.js';
import {enemyDef} from './enemies.js';
import {universalAvailable,universalSources} from './universal-data.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const rank=(h,key)=>h.passives?.[key]||0;
const has=(h,key)=>rank(h,key)>0&&universalAvailable(h,key);
const power=h=>Math.max(h.power||1,h.skillPower||1);
function state(h){const u=h.universal??={};u.next??={};u.seen??={};u.shields??=[];u.walk??=0;u.wheelWalk??=0;u.ammo??=0;return u;}
const objects=w=>w.universalObjects??=[];
const pets=w=>w.pets??=[];
const owned=(list,h,kind)=>list.filter(o=>o.owner===h.id&&o.life>0&&(!kind||o.kind===kind));
const live=(w,from,range=Infinity)=>w.enemies.filter(e=>e.hp>0&&dist(from,e)<range&&w.lineClear(from,e));
function once(h,kind,event){const u=state(h),ids=u.seen[kind]??=[];if(ids.includes(event))return false;ids.push(event);if(ids.length>128)ids.shift();return true;}
function ready(w,h,key,delay){const u=state(h);if(w.time<(u.next[key]??-Infinity))return false;u.next[key]=w.time+delay;return true;}
function fx(w,kind,at,r=70,life=.35){w.effects.push({type:'universal',variant:kind,x:at.x,y:at.y,r,life,max:life,layer:'ground'});}
function object(w,h,kind,at,life,extra={}){const o={id:w.nextId++,kind,owner:h.id,x:at.x,y:at.y,life,max:life,...extra};objects(w).push(o);return o;}
function nearest(w,at,h,range=550){const mark=state(h).mark,target=w.enemies.find(e=>e.id===mark?.id&&e.hp>0&&mark.until>w.time&&dist(at,e)<range&&w.lineClear(at,e));return target||live(w,at,range).sort((a,b)=>dist(at,a)-dist(at,b))[0];}
function damage(w,h,e,n,origin=h,knock=35,depth=1){if(h.down||!e||e.hp<=0||depth>2)return;w.damageEnemy(e,n,h,e.boss?0:knock,'proc',0,unit(e.x-origin.x,e.y-origin.y),{depth,eventId:w.nextAttackId++,universal:true});}
function blast(w,h,at,r,n,kind='blast',slow=0){fx(w,kind,at,r);for(const e of live(w,at,r)){damage(w,h,e,n,at,90);if(slow)e.slow=Math.max(e.slow||0,e.boss?Math.min(.5,slow):slow);}}
function fragment(w,h,type,at,value,life,cap){
 if(w.pickups.filter(p=>p.owner===h.id&&p.type===type&&p.life!==0).length>=cap)return null;
 const p={id:w.nextId++,type,x:at.x,y:at.y,owner:h.id,value,life,max:life,universal:true};w.pickups.push(p);return p;
}
function shield(w,h,amount,life=3,gainCap=Infinity,creator=h){
 if(h.down||amount<=0)return;const u=state(h),cap=120*(h.shieldPower||1),gain=Math.max(0,Math.min(cap-(h.shield||0),amount*(creator.shieldPower||1),gainCap));
 h.shield=(h.shield||0)+gain;if(gain)u.shields.push({amount:gain,until:w.time+life});
}
function addPet(w,h,kind){
 const u=state(h),awake=h.awakening;
 if(awake==='hiveHorn'){
  const factor=kind==='crow'?(12+rank(h,'paperCrow')*6)/18:kind==='thorn'?(9+rank(h,'shieldBrood')*5)/14:1;
  const lifeBonus=kind==='dog'?Math.max(0,rank(h,'boneWhistle')-1)*2:0;
  const hive=owned(pets(w),h,'hive')[0];if(hive){if(hive.energy<3){hive.energy++;hive.chargePower=(hive.chargePower||0)+factor;}hive.life=Math.max(hive.life,10+lifeBonus);return hive;}
  pets(w).filter(p=>p.owner===h.id).forEach(p=>{p.life=0;});
  const p={id:w.nextId++,kind:'hive',owner:h.id,x:h.x+35,y:h.y+25,life:14+lifeBonus,max:14+lifeBonus,energy:1,chargePower:factor,cd:0,source:kind==='crow'?'paperCrow':kind==='thorn'?'shieldBrood':'boneWhistle'};pets(w).push(p);return p;
 }
 const all=owned(pets(w),h),type=kind==='thorn'&&awake==='thornFortress'?'turret':kind;
 if(all.length>=3||all.filter(p=>p.kind===type).length>=2)return null;
 const life=type==='dog'?7+rank(h,'boneWhistle')*2:type==='turret'?6:type==='crow'?5:7;
 const p={id:w.nextId++,kind:type,owner:h.id,x:h.x+(all.length%2?32:-32),y:h.y+20,life,max:life,cd:0,age:0,attacks:0,source:kind==='dog'?'boneWhistle':kind==='crow'?'paperCrow':'shieldBrood'};pets(w).push(p);fx(w,'summon',p,30);return p;
}
function retire(w,h,p,normal){
 if(p.retired)return;p.retired=true;p.life=0;
 if(normal&&!h.down&&p.kind!=='hive'&&has(h,'homeGift')&&ready(w,h,'gift',2))fragment(w,h,'wisp',p,3+2*rank(h,'homeGift'),6,3);
}
function needle(w,h,dir,origin=h,extra={}){
 if(owned(objects(w),h,'needle').length>=24)return;
 const branch=has(h,'returnCore')?'return':has(h,'refractLens')?'refract':null;
 return object(w,h,'needle',{x:origin.x+dir.x*35,y:origin.y+dir.y*35},1.8,{dx:dir.x,dy:dir.y,speed:620,travel:0,damage:(6+rank(h,'needleMagazine')*4)*power(h)*(branch==='return'?.6+.1*rank(h,'returnCore'):1),branch,hit:[],returning:false,...extra});
}
function statusList(w,e,h){
 const result=(e.statuses||[]).filter(s=>s.owner===h.id&&s.life>0&&['burn','bleed'].includes(s.type)).map(s=>({type:s.type,life:s.life,damage:s.damage,ref:s,event:s.universalEvent,transferred:s.transferred}));
 const chill=e.chillBy?.[h.id];if(chill?.until>w.time)result.push({type:'chill',life:chill.until-w.time,damage:0,ref:chill,event:chill.universalEvent,transferred:chill.transferred});return result;
}
export function universalStatus(w,e,h,type,life,damageAmount=0,extra={}){
 if(type==='chill'){
  e.chillBy??={};const s=e.chillBy[h.id]??={stacks:0,brittleUntil:0,lockUntil:0};
  if(extra.weak&&s.until>w.time&&!s.weak)return false;
  if(extra.transferred&&s.until>w.time)return false;
  s.until=Math.max(s.until||0,w.time+life);s.weak=!!extra.weak;s.transferred=!!extra.transferred;s.universalEvent=extra.eventId;
  e.slow=Math.max(e.slow||0,e.boss?Math.min(.5,life):life);return true;
 }
 e.statuses??=[];const existing=e.statuses.find(s=>s.owner===h.id&&s.type===type&&s.life>0);
 if(existing&&(extra.transferred||extra.weak&&!existing.weak))return false;
 if(existing){existing.life=Math.max(existing.life,life);existing.damage=Math.max(existing.damage,damageAmount);existing.weak=!!extra.weak;existing.transferred=!!extra.transferred;existing.universalEvent=extra.eventId;}
 else e.statuses.push({owner:h.id,type,life,damage:damageAmount,timer:1,weak:!!extra.weak,transferred:!!extra.transferred,universalEvent:extra.eventId});return true;
}

// Must run before direct-hit DOT/chill is attached. Each source event may convert once.
export function universalPreHit(w,e,h,source,ctx={}){
 if(h.down||!['attack','skill'].includes(source)||(ctx.depth||0)>0)return;
 const event=ctx.universalEvent??ctx.eventId;
 const before=statusList(w,e,h);ctx.universalBefore=before.map(s=>({type:s.type,life:s.life,damage:s.damage}));
 if(source!=='skill')return;
 const available=before.filter(s=>s.event!==event),u=state(h);
 if(has(h,'transferNeedle')&&available.some(s=>!s.transferred)&&!(u.seen.transfer||[]).includes(event)&&w.time>=(u.next.transfer??0)){
  const target=live(w,e,230).filter(t=>t!==e).sort((a,b)=>dist(e,a)-dist(e,b))[0];
  if(target){const s=available.filter(s=>!s.transferred).sort((a,b)=>b.life-a.life)[0],factor=.3+.1*rank(h,'transferNeedle');
   if(universalStatus(w,target,h,s.type,s.type==='chill'?s.life*factor:s.life,s.damage*factor,{transferred:true,eventId:event})){once(h,'transfer',event);u.next.transfer=w.time+2;fx(w,'transfer',target,40);}
  }
 }
 if(has(h,'mixedFuse')&&available.length>=2&&!(u.seen.fuse||[]).includes(event)&&w.time>=(u.next.fuse??0)){
  once(h,'fuse',event);u.next.fuse=w.time+4;const pair=available.slice(0,2);let stored=0;
  for(const s of pair){const spend=h.awakening==='corrosionEngine'?s.life:Math.min(.4,s.life);stored+=s.damage*spend;if(s.type==='chill')s.ref.until-=spend;else s.ref.life-=spend;}
  if(h.awakening==='corrosionEngine')object(w,h,'corrosion',e,3,{target:e.id,timer:0,damage:((22+rank(h,'mixedFuse')*10)*power(h)+stored*.6)/6,source:'mixedFuse'});
  else object(w,h,'fuse',e,.42,{delay:.3,damage:(22+rank(h,'mixedFuse')*10)*power(h),r:95,source:'mixedFuse'});
 }
}
export function universalPostHit(w,e,h,source,ctx={},dealt=0){
 if(h.down||dealt<=0||!['attack','skill'].includes(source)||(ctx.depth||0)>0)return;
 const event=ctx.universalEvent??ctx.eventId,u=state(h);e.universalContributors??={};e.universalContributors[h.id]=w.time;
 // Remember which action supplied a state so later pulses cannot spend their own new status.
 for(const s of statusList(w,e,h)){const prior=ctx.universalBefore?.find(p=>p.type===s.type);if(!prior||s.life>prior.life+.001||s.damage>prior.damage){s.ref.universalEvent=event;s.ref.weak=false;s.ref.transferred=false;}}
 if(has(h,'commandWhistle')){
  const valid=u.mark&&u.mark.until>w.time&&w.enemies.some(t=>t.id===u.mark.id&&t.hp>0);
  if((source==='skill'||!valid)&&once(h,'command',event))u.mark={id:e.id,until:w.time+3+rank(h,'commandWhistle')};
 }
 if(has(h,'stepCircuit')&&u.stepUntil>w.time){u.stepUntil=0;const slot=h.cd[0]>=h.cd[1]?0:1;if(h.skills[slot]&&h.cd[slot]>0)refundCooldown(h,slot,.25+rank(h,'stepCircuit')*.1);}
 if(source!=='attack')return;
 if(has(h,'boneWhistle')&&e.boss&&once(h,'bossAttack',event)){u.bossHits=(u.bossHits||0)+1;if(u.bossHits%8===0&&w.time>=(u.next.dog??0)&&w.random()<.25){u.next.dog=w.time+1.5;addPet(w,h,'dog');}}
 if(!once(h,'attack',event))return;
 if(has(h,'needleMagazine')&&w.time>=(u.next.needle??0)&&w.random()<.25){u.next.needle=w.time+.35;if(h.awakening==='starMagazine')u.ammo=Math.min(6,(u.ammo||0)+1);else needle(w,h,unit(e.x-h.x,e.y-h.y));}
 if(has(h,'orbitBlades')){u.bladeHits=(u.bladeHits||0)+1;if(u.bladeHits%4===0&&owned(objects(w),h,'orbit').length<3)object(w,h,'orbit',h,4,{angle:w.time*3+owned(objects(w),h,'orbit').length*2.1,damage:(4+rank(h,'orbitBlades')*3)*power(h),hits:{},source:'orbitBlades'});}
 if(has(h,'magnetAstrolabe')&&w.time>=(u.next.magnet??0)&&w.random()<.2){u.next.magnet=w.time+1;fragment(w,h,'magnet',{x:e.x+Math.cos(ctx.eventId)*25,y:e.y+Math.sin(ctx.eventId)*25},1,8,5);}
 if(u.wheelReady&&has(h,'kineticWheel')){u.wheelReady=false;const d=unit(e.x-h.x,e.y-h.y);object(w,h,'wheel',h,.7,{dx:d.x,dy:d.y,speed:400,hit:[],damage:(16+rank(h,'kineticWheel')*8)*power(h),source:'kineticWheel'});}
 if(u.duet&&u.duet.until>w.time&&has(h,'duetMeter')){blast(w,h,u.duet,115,(14+rank(h,'duetMeter')*8)*power(h),'duet');u.duet=null;}
}
export function universalDeath(w,e){
 if(e.universalSettled)return;e.universalSettled=true;
 for(const [id,time] of Object.entries(e.universalContributors||{})){const h=w.heroes.find(p=>p.id===+id);if(!h||h.down||w.time-time>5||!has(h,'boneWhistle'))continue;const u=state(h);if(w.time>=(u.next.dog??0)&&w.random()<.25){u.next.dog=w.time+1.5;addPet(w,h,'dog');}}
}
export function universalDodge(w,h,dir){const u=state(h);u.skipWalkUntil=w.time+.35;if(has(h,'stepCircuit'))u.stepUntil=w.time+2;if(has(h,'returnSign')){owned(objects(w),h,'sign').forEach(o=>{o.life=0;});object(w,h,'sign',h,3,{source:'returnSign'});}u.dodgeDir={...dir};}
export function universalDodgeEnd(w,h,dir=state(h).dodgeDir||{x:1,y:0}){
 const u=state(h);u.skipWalkUntil=w.time+.03;
 if(has(h,'stepCircuit')&&u.stepUntil>w.time)u.stepUntil=w.time+2;
 if(has(h,'homeBell')&&h.awakening!=='hiveHorn'&&ready(w,h,'bell',5))for(const [i,p] of owned(pets(w),h).entries())if(!['hive','turret'].includes(p.kind)){p.x=h.x-dir.y*(i%2?30:-30);p.y=h.y+dir.x*(i%2?30:-30);if(!p.extended){p.life+=1+rank(h,'homeBell');p.extended=true;}if(p.kind==='crow')p.age=Math.max(2,p.age);}
 if(h.awakening==='starMagazine'&&has(h,'needleMagazine')){const ammo=u.ammo||0;u.ammo=0;for(let i=0;i<ammo;i++)needle(w,h,dir,{x:h.x-dir.x*i*15,y:h.y-dir.y*i*15},{delay:i*.055});}
}
export function universalAvoid(w,h,attackId){if(h.down||h.action?.type!=='dodge'||h.invuln<=0||!has(h,'riskEcho'))return;const u=state(h);if(once(h,'avoided',attackId)&&ready(w,h,'risk',6))u.riskUntil=w.time+5;}
export function universalCast(w,h,a){
 if(h.down)return;const u=state(h),dir=a.dir||h.lastMove||{x:1,y:0};
 if(has(h,'paperCrow')&&ready(w,h,'crow',4))addPet(w,h,'crow');
 if(h.awakening==='hiveHorn'){const hive=owned(pets(w),h,'hive')[0];if(hive?.energy){hive.x=h.x;hive.y=h.y+25;const mark=u.mark&&u.mark.until>w.time&&w.enemies.find(e=>e.id===u.mark.id&&e.hp>0&&w.lineClear(h,e)),aim=mark?unit(mark.x-h.x,mark.y-h.y):dir,count=2+hive.energy*2,angle=Math.atan2(aim.y,aim.x),factor=(hive.chargePower||hive.energy)/hive.energy;for(let i=0;i<count;i++){const off=(i-(count-1)/2)*.16;object(w,h,'thornBolt',h,.8,{dx:Math.cos(angle+off),dy:Math.sin(angle+off),speed:490,damage:13*factor*power(h),hit:[],pet:true,petId:hive.id,source:hive.source});}hive.energy=0;hive.chargePower=0;hive.rootedUntil=w.time+3;}}
 if(has(h,'returnSign')){const sign=owned(objects(w),h,'sign')[0];if(sign&&ready(w,h,'sign',6)){sign.life=0;object(w,h,'slowfield',sign,2.4,{r:100,timer:0,damage:(3+rank(h,'returnSign')*2)*power(h),source:'returnSign'});}}
 if(has(h,'riskEcho')&&u.riskUntil>w.time){u.riskUntil=0;const target=nearest(w,h,h,380)||{x:h.x+dir.x*120,y:h.y+dir.y*120};object(w,h,'riskPulse',target,.5,{delay:.35,r:110,damage:(18+rank(h,'riskEcho')*8)*power(h),source:'riskEcho'});}
 if(has(h,'supplyPack')&&u.supplyReady){if(!w.pickups.some(p=>p.type==='supply'&&p.owner===h.id)){u.supplyReady=false;fragment(w,h,'supply',{x:h.x+dir.x*110,y:h.y+dir.y*110},12+rank(h,'supplyPack')*6,7,1);}}
 if(has(h,'echoPosts')){const old=owned(objects(w),h,'post');if(old.length>=2)old.sort((a,b)=>a.id-b.id)[0].life=0;object(w,h,'post',h,12,{hits:{},damage:(3+rank(h,'echoPosts')*3)*power(h),source:'echoPosts'});}
 if(has(h,'duetMeter')){if(u.lastCast&&u.lastCast.slot!==a.slot&&w.time-u.lastCast.time<=8&&ready(w,h,'duet',6))u.duet={x:u.lastCast.x,y:u.lastCast.y,until:w.time+4};u.lastCast={slot:a.slot,x:h.x,y:h.y,time:w.time};}
 if(h.awakening==='movingMinefield')for(const [i,o] of owned(objects(w),h).filter(o=>['mine','sigil'].includes(o.kind)).entries()){o.x=h.x+dir.x*(130+i*18)-dir.y*((i%3)-1)*25;o.y=h.y+dir.y*(130+i*18)+dir.x*((i%3)-1)*25;o.arm=.4;}
}
export function universalHurt(w,h,actual,enemy=true){if(h.down||actual<=0||!enemy||!has(h,'bloodAmber')||!ready(w,h,'amber',4))return;const p=fragment(w,h,'amber',{x:h.x+45,y:h.y+22},actual*(.24+rank(h,'bloodAmber')*.06),6,2);if(p)p.actualLost=actual;}
export function universalShieldAbsorb(w,h,actual){
 if(actual<=0)return;const u=state(h);let remaining=actual;for(const s of u.shields){const used=Math.min(s.amount,remaining);s.amount-=used;remaining-=used;if(remaining<=0)break;}
 if(h.down||!has(h,'shieldBrood'))return;const threshold=h.maxHp*.1;u.absorb=Math.min(threshold*2,(u.absorb||0)+actual);
 if(u.absorb>=threshold&&ready(w,h,'brood',5)){if(addPet(w,h,'thorn'))u.absorb-=threshold;u.absorb=Math.min(threshold,u.absorb);}
}
export function universalHeal(w,h,actual){
 if(h.down||actual<=0||!has(h,'healingWave'))return;const u=state(h),threshold=h.maxHp*.08;u.healed=Math.min(threshold*2,(u.healed||0)+actual);
 if(u.healed>=threshold&&ready(w,h,'healing',4)){u.healed-=threshold;blast(w,h,h,125,(7+rank(h,'healingWave')*5)*power(h),'healingWave');}
}
export function universalPickup(w,h,p,actualHeal=0){
 if(h.down||p.universalConsumed||p.life<=0)return false;if(['magnet','amber','wisp'].includes(p.type)&&p.owner!==h.id)return false;
 p.universalConsumed=true;const u=state(h);
 if(p.type==='amber')shield(w,h,p.value||0,3,p.actualLost??p.value);
 if(p.type==='wisp')shield(w,h,p.value||0,3,h.maxHp*.03);
 if(p.type==='magnet'&&has(h,'magnetAstrolabe')&&h.awakening!=='starDelivery'&&owned(objects(w),h,'magnetStar').length<3)object(w,h,'magnetStar',h,4,{angle:w.time*3,damage:(8+rank(h,'magnetAstrolabe')*6)*power(h),source:'magnetAstrolabe'});
 if(p.type==='supply'){
  const owner=w.heroes.find(hero=>hero.id===p.owner);shield(w,h,(p.value||18)*(p.owner===h.id?.5:1),3,Infinity,owner||h);
  if(owner?.awakening==='starDelivery'&&!owner.down&&has(owner,'magnetAstrolabe')&&has(owner,'supplyPack'))object(w,owner,'starBand',p,3,{r:105,claimed:[],damage:0,source:'supplyPack'});return true;
 }
 const valid=['magnet','amber','wisp','xp','coin','gold'].includes(p.type)||p.type==='potion'&&actualHeal>0;
 if(!valid)return true;
 if(has(h,'scavengeSigil')&&owned(objects(w),h,'sigil').length<3&&ready(w,h,'sigil',1))object(w,h,'sigil',p,5,{arm:.5,r:82,damage:(7+rank(h,'scavengeSigil')*5)*power(h),source:'scavengeSigil'});
 // XP/coins are plentiful now: the pickup cadence, not stack quantity, charges supply.
 if(has(h,'supplyPack')&&!u.supplyReady&&ready(w,h,'supplyPickup',.8)){u.supplies=(u.supplies||0)+1;if(u.supplies>=3){u.supplies=0;u.supplyReady=true;}}
 return true;
}

function feed(w,h,p,e){
 if(!has(h,'elementFeed')||w.time<(p.feedAt||0))return;p.feedAt=w.time+2;
 const source=universalSources(h),u=state(h);if(!['burn','chill'].includes(u.feedElement)||!source[u.feedElement])u.feedElement=source.burn?'burn':'chill';
 const timeFactor=.8+rank(h,'elementFeed')*.2;
 if(u.feedElement==='burn')universalStatus(w,e,h,'burn',3*timeFactor,((rank(h,'ember')||0)*4+(h.core==='pyromancer'?8:0))*power(h)*(h.dotPower||1)*.4,{weak:true});
 else universalStatus(w,e,h,'chill',(.1+(rank(h,'chill')||1)*.4)*.4*timeFactor,0,{weak:true});
}
function updatePet(w,h,p,dt){
 if(h.down||!has(h,p.source)){retire(w,h,p,false);return;}p.life-=dt;p.age=(p.age||0)+dt;p.cd=Math.max(0,p.cd-dt);
 if(p.life<=0){retire(w,h,p,p.kind==='dog'||p.kind==='turret');return;}
 if(p.kind==='hive'){if(!(p.rootedUntil>w.time)){const d=unit(h.x+35-p.x,h.y+25-p.y);if(dist(p,h)>65)w.moveActor(p,d.x*175*dt,d.y*175*dt,12);}return;}
 if(p.kind==='turret'&&dist(p,h)>480){retire(w,h,p,false);return;}
 if(p.kind==='crow'&&p.age<2){const angle=w.time*3+p.id;p.x=h.x+Math.cos(angle)*45;p.y=h.y+Math.sin(angle)*35;
  const hostile=w.projectiles.find(b=>b.hostile&&b.life>0&&!b.unblockable&&!b.ultimate&&!b.bossUltimate&&dist(b,p)<42);
  if(hostile){hostile.life=0;p.age=2;fx(w,'block',p,35);}else return;
 }
 const target=nearest(w,p,h,p.kind==='turret'?350:650);
 if(!target){if(p.kind!=='turret'&&dist(h,p)>70){const d=unit(h.x-p.x,h.y-p.y);w.moveActor(p,d.x*210*dt,d.y*210*dt,10);}return;}
 const reach=p.kind==='turret'?350:40;
 if(dist(p,target)>reach&&p.kind!=='turret'){const d=unit(target.x-p.x,target.y-p.y);w.moveActor(p,d.x*(p.kind==='crow'?380:245)*dt,d.y*(p.kind==='crow'?380:245)*dt,10);}
 else if(p.cd<=0){p.cd=p.kind==='turret'?.65:.85;p.attacks++;const n=(p.kind==='dog'?9:p.kind==='crow'?12+rank(h,'paperCrow')*6:9+rank(h,'shieldBrood')*5)*power(h);
  if(p.kind==='turret'){const d=unit(target.x-p.x,target.y-p.y);object(w,h,'thornBolt',p,.8,{dx:d.x,dy:d.y,speed:490,damage:n,hit:[],pet:true,petId:p.id,source:p.source});}
  else{damage(w,h,target,n,p,20);feed(w,h,p,target);fx(w,'petBite',target,25);}
  if(p.kind==='crow'||p.kind==='thorn'&&p.attacks>=2)retire(w,h,p,true);
 }
}
function projectile(w,h,o,dt){
 if(o.delay>0){o.delay-=dt;o.life+=dt;return;}
 if(o.returning){const d=unit(h.x-o.x,h.y-o.y);o.dx=d.x;o.dy=d.y;if(dist(h,o)<20){o.life=0;return;}}
 const start={x:o.x,y:o.y},end={x:o.x+o.dx*o.speed*dt,y:o.y+o.dy*o.speed*dt};
 const contacts=(w.obstacles||[]).map(wall=>({t:segmentCircle(start,end,wall,wall.r),wall:true}));
 for(const e of w.enemies)if(e.hp>0&&!o.hit.includes(e.id))contacts.push({t:segmentCircle(start,end,e,enemyDef(e).bodyRadius||23),e});
 contacts.sort((a,b)=>a.t-b.t||(a.wall?-1:1));let stopped=false;
 for(const c of contacts){if(c.t===Infinity)break;o.x=start.x+(end.x-start.x)*c.t;o.y=start.y+(end.y-start.y)*c.t;
  if(c.wall){o.life=0;stopped=true;break;}if(c.e.hp<=0)continue;o.hit.push(c.e.id);damage(w,h,c.e,o.damage,o,o.kind==='wheel'?170:20);if(o.pet){const pet=pets(w).find(p=>p.id===o.petId&&p.owner===h.id&&p.life>0);if(pet)feed(w,h,pet,c.e);}
  if(o.kind==='wheel')continue;
  if(o.kind==='needle'&&o.branch==='return'&&!o.returning){o.returning=true;o.hit=[];o.life=1.3;stopped=true;break;}
  if(o.kind==='needle'&&o.branch==='refract'&&!o.bounced){const target=live(w,c.e,220).filter(e=>!o.hit.includes(e.id)).sort((a,b)=>dist(c.e,a)-dist(c.e,b))[0];if(target){o.bounced=true;o.damage*=.5+.1*rank(h,'refractLens');const d=unit(target.x-o.x,target.y-o.y);o.dx=d.x;o.dy=d.y;o.life=Math.max(o.life,.5);stopped=true;break;}}
  if(o.returning)continue;o.life=0;stopped=true;break;
 }
 if(!stopped){o.x=end.x;o.y=end.y;o.travel=(o.travel||0)+o.speed*dt;}
 if(o.kind==='needle'&&o.branch==='return'&&!o.returning&&o.travel>=400){o.returning=true;o.hit=[];o.life=1.3;}
}
function updateObject(w,h,o,dt){
 if(h.down||o.source&&!has(h,o.source)){o.life=0;return;}o.life-=dt;if(o.life<=0)return;
 if(['needle','wheel','thornBolt'].includes(o.kind)){if(o.kind==='needle'&&!has(h,'needleMagazine')){o.life=0;return;}projectile(w,h,o,dt);return;}
 if(['orbit','magnetStar'].includes(o.kind)){
  o.angle+=dt*3.8;o.x=h.x+Math.cos(o.angle)*82;o.y=h.y+Math.sin(o.angle)*82;
  if(o.kind==='magnetStar'){const bolt=w.projectiles.find(p=>p.hostile&&p.life>0&&!p.unblockable&&!p.ultimate&&!p.bossUltimate&&dist(p,o)<30);if(bolt){bolt.life=0;o.life=0;fx(w,'block',o,35);return;}}
  for(const e of live(w,o,32)){if(o.kind==='orbit'&&w.time<(o.hits[e.id]||0))continue;damage(w,h,e,o.damage,o,25);if(o.kind==='magnetStar'){o.life=0;break;}o.hits[e.id]=w.time+.8;}
 }else if(['mine','sigil'].includes(o.kind)){
  o.arm-=dt;if(o.arm<=0&&live(w,o,40).length){blast(w,h,o,o.r,o.damage,o.kind,o.kind==='sigil'?.8:0);o.life=0;}
 }else if(['fuse','riskPulse'].includes(o.kind)){o.delay-=dt;if(o.delay<=0){blast(w,h,o,o.r,o.damage,o.kind);o.life=0;}}
 else if(o.kind==='slowfield'){o.timer-=dt;if(o.timer<=0){o.timer+=.6;blast(w,h,o,o.r,o.damage,'slowfield',.8);}}
 else if(o.kind==='corrosion'){const target=w.enemies.find(e=>e.id===o.target&&e.hp>0);if(!target){o.life=0;return;}o.x=target.x;o.y=target.y;o.timer-=dt;if(o.timer<=0){o.timer+=.5;damage(w,h,target,o.damage,o,0,2);fx(w,'corrosion',o,40);}}
 else if(o.kind==='starBand'){for(const hero of w.heroes)if(!hero.down&&!o.claimed.includes(hero.id)&&dist(hero,o)<o.r){o.claimed.push(hero.id);shield(w,hero,6+rank(h,'magnetAstrolabe')*2,3,Infinity,h);fx(w,'delivery',hero,40);}}
}
export function tickUniversal(w,dt){
 for(const h of w.heroes){
  const u=state(h);if(u.awakening!==h.awakening){if(h.awakening==='hiveHorn')owned(pets(w),h).filter(p=>p.kind!=='hive').forEach(p=>retire(w,h,p,false));u.awakening=h.awakening;}
  for(const s of u.shields)if(s.until<=w.time){h.shield=Math.max(0,(h.shield||0)-s.amount);s.amount=0;}u.shields=u.shields.filter(s=>s.amount>0);
  const previous=u.lastLocation;u.lastLocation={x:h.x,y:h.y};
  if(h.down){if(!u.clearedDown){resetUniversal(w,h.id);state(h).clearedDown=true;}continue;}u.clearedDown=false;
  if(!has(h,'mineShoes'))u.walk=0;if(!has(h,'kineticWheel')){u.wheelWalk=0;u.wheelReady=false;}
  const distance=previous?dist(h,previous):0,walking=distance>0.03&&distance<dt*500+2&&h.action?.type!=='dodge'&&h.action?.type!=='bash'&&!(u.skipWalkUntil>w.time)&&live(w,h,550).length>0;
  if(walking){
   const direction=unit(h.x-previous.x,h.y-previous.y),forward=!u.walkDirection||direction.x*u.walkDirection.x+direction.y*u.walkDirection.y>.25;u.walkDirection=direction;
   if(forward){if(has(h,'mineShoes'))u.walk+=distance;if(has(h,'kineticWheel'))u.wheelWalk+=distance;}else{u.walk=0;u.wheelWalk=0;}
   if(has(h,'mineShoes')&&u.walk>=180){u.walk%=180;if(owned(objects(w),h,'mine').length<3)object(w,h,'mine',previous,6,{arm:.4,r:86,damage:(12+rank(h,'mineShoes')*6)*power(h),source:'mineShoes'});}
   if(has(h,'kineticWheel')&&u.wheelWalk>=420){u.wheelWalk=0;u.wheelReady=true;}
  }else if(!live(w,h,650).length){u.walk=0;u.wheelWalk=0;u.wheelReady=false;}
 }
 for(const p of [...pets(w)]){const h=w.heroes.find(h=>h.id===p.owner),x=p.x,y=p.y;if(h)updatePet(w,h,p,dt);else p.life=0;p.vx=(p.x-x)/dt;p.vy=(p.y-y)/dt;}
 for(const o of [...objects(w)]){const h=w.heroes.find(h=>h.id===o.owner);if(h)updateObject(w,h,o,dt);else o.life=0;}
 for(const h of w.heroes){const posts=owned(objects(w),h,'post');for(const post of posts)delete post.link;if(posts.length!==2||dist(posts[0],posts[1])<40||dist(posts[0],posts[1])>480||!w.lineClear(posts[0],posts[1]))continue;
  const post=posts[1];post.link={x:posts[0].x,y:posts[0].y};
  for(const e of live(w,post,500))if(w.time>=(post.hits[e.id]||0)&&segmentCircle(post,posts[0],e,18)<Infinity){post.hits[e.id]=w.time+2;e.slow=Math.max(e.slow||0,e.boss?.4:.8);damage(w,h,e,post.damage,post,0);}
 }
 w.pets=pets(w).filter(p=>p.life>0);w.universalObjects=objects(w).filter(o=>o.life>0);
}
export function resetUniversal(w,ownerId=null){
 const affected=o=>ownerId===null||o.owner===ownerId;
 w.pets=pets(w).filter(p=>!affected(p));w.universalObjects=objects(w).filter(o=>!affected(o));w.pickups=w.pickups.filter(p=>!p.universal||!affected(p));
 for(const h of w.heroes)if(ownerId===null||h.id===ownerId){const u=state(h),feedElement=u.feedElement;for(const s of u.shields)h.shield=Math.max(0,(h.shield||0)-s.amount);h.universal={next:{},seen:{},shields:[],walk:0,wheelWalk:0,ammo:0,feedElement,awakening:h.awakening};}
}
