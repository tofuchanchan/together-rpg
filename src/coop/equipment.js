import {rollEquipment,validEquipment} from './equipment-data.js';
import {segmentCircle} from './collision.js';
import {enemyDef} from './enemies.js';
export {rollEquipment};
const defaults={power:1,skillPower:1,haste:1,crit:0,cooldown:0,maxHp:1,armor:0,speedBonus:1,pickupRadius:75};
const cappedStats=['speedBonus','haste','crit','armor','cooldown','pickupRadius'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
const state=h=>{const s=h.equipmentState??={};s.next??={};s.seen??=[];return s;};
const copyItem=item=>item?{...item,main:{...item.main},affixes:item.affixes.map(a=>({...a}))}:null;
export function equipmentMods(item){return validEquipment(item)?{[item.main.stat]:item.main.value}:{};}
export function equipmentAffixes(h){const values={};for(const item of Object.values(h.equipment||{}))if(validEquipment(item)&&item.role===h.role)for(const a of item.affixes)values[a.key]=(values[a.key]||0)+a.strength;return values;}
function aggregate(equipment){const mods={};for(const item of Object.values(equipment))for(const [key,value] of Object.entries(equipmentMods(item)))mods[key]=(mods[key]||0)+value;return mods;}
function clearHeroState(h){h.equipmentState={};if(h.universal?.shields){const remaining=h.universal.shields.filter(s=>s.equipment).reduce((n,s)=>n+s.amount,0);h.shield=Math.max(0,(h.shield||0)-remaining);h.universal.shields=h.universal.shields.filter(s=>!s.equipment);}}
function changeEquipment(h,slot,item){
 const next={weapon:null,armor:null,...h.equipment,[slot]:copyItem(item)},previous=h.equipment?.[slot]||null,oldMods=h.equipmentApplied||{},mods=aggregate(next),values={};
 for(const key of new Set([...Object.keys(oldMods),...Object.keys(mods)]))values[key]=(h[key]??defaults[key]??0)-(oldMods[key]||0)+(mods[key]||0);
 if(Object.values(values).some(v=>!Number.isFinite(v)))return{ok:false,reason:'角色属性异常，未换装'};
 Object.assign(h,values);h.equipment=next;h.equipmentApplied=mods;h.hp=Math.min(h.hp,h.maxHp);clearHeroState(h);return {ok:true,old:copyItem(previous),item:copyItem(item),clearOwnedEquipment:true};
}
export function applyEquipment(h,item){if(!validEquipment(item)||item.role!==h.role)return{ok:false,reason:'装备不属于此职业或数据不完整'};if(h.equipment?.[item.slot]?.uid===item.uid)return{ok:true,old:copyItem(item),item:copyItem(item),unchanged:true};return changeEquipment(h,item.slot,item);}
export function unequipEquipment(h,slot){if(!['weapon','armor'].includes(slot))return{ok:false,reason:'无效装备位置'};if(!h.equipment?.[slot])return{ok:false,reason:'该位置没有装备'};return changeEquipment(h,slot,null);}
// Training caps apply to trained stats, with gear added afterward. HP is never
// temporarily reduced: health rewards must still see the real equipped maximum.
export function withEquipmentBase(h,fn){
 const removed={};for(const key of cappedStats){const n=h.equipmentApplied?.[key]||0;if(n){removed[key]=n;h[key]-=n;}}
 try{return fn();}finally{for(const [key,n] of Object.entries(removed))h[key]+=n;}
}
function affixItem(h,key){return Object.values(h.equipment||{}).find(item=>item?.affixes?.some(a=>a.key===key));}
function ready(w,h,key,delay){const s=state(h);if(w.time<(s.next[key]??-Infinity))return false;s.next[key]=w.time+delay;return true;}
function fx(w,h,variant,at,r=70,life=.35){w.effects.push({type:'equipment',variant,owner:h.id,x:at.x,y:at.y,r,life,max:life,layer:['reloadBolt','piercingNeedle'].includes(variant)?'depth':'ground'});}
function object(w,h,kind,at,life,key,extra={}){w.equipmentObjects??=[];if(w.equipmentObjects.filter(o=>o.owner===h.id&&o.life>0).length>=12)return null;const o={id:w.nextId++,kind,owner:h.id,x:at.x,y:at.y,life,max:life,sourceUid:affixItem(h,key)?.uid,affix:key,...extra};w.equipmentObjects.push(o);return o;}
function bolt(w,h,kind,dir,factor,key,pierce=1){const d=unit(dir.x,dir.y);return object(w,h,kind,{x:h.x+d.x*28,y:h.y+d.y*28},.9,key,{dx:d.x,dy:d.y,speed:560,r:5,damage:factor*Math.max(h.power||1,h.skillPower||1),hit:[],pierce,eventId:w.nextAttackId++});}
export function onEquipmentDodge(w,h,dir){
 if(h.down)return;const a=equipmentAffixes(h),s=state(h);
 if(a.dodgeLoad&&ready(w,h,'dodgeLoad',3)){s.loadedUntil=w.time+3;fx(w,h,'dodgeLoad',h,38);}
 if(a.trailSnare&&ready(w,h,'trailSnare',5)){for(const o of w.equipmentObjects||[])if(o.owner===h.id&&o.kind==='snare')o.life=0;object(w,h,'snare',h,2.5,'trailSnare',{r:65+Math.min(30,a.trailSnare*10),timer:0});fx(w,h,'trailSnare',h,75);}
}
export function onEquipmentAttack(w,h,a){
 if(h.down)return;const s=state(h),affixes=equipmentAffixes(h),dir=a?.dir||h.lastMove||{x:1,y:0},event=a?.eventId;
 if(event!==undefined){s.attackEvents??=[];if(s.attackEvents.includes(event))return;s.attackEvents.push(event);if(s.attackEvents.length>64)s.attackEvents.shift();}
 if(affixes.dodgeLoad&&s.loadedUntil>w.time){s.loadedUntil=0;const angle=Math.atan2(dir.y,dir.x);for(const off of [-.13,.13])bolt(w,h,'reloadBolt',{x:Math.cos(angle+off),y:Math.sin(angle+off)},5*affixes.dodgeLoad,'dodgeLoad');}
 if(affixes.piercingEdge){s.pierceAttacks=(s.pierceAttacks||0)+1;if(s.pierceAttacks%4===0)bolt(w,h,'piercingNeedle',dir,8*affixes.piercingEdge,'piercingEdge',3);}
}
export function onEquipmentHit(w,e,h,source,ctx={},dealt=0){
 if(h.down||dealt<=0||source!=='attack'||(ctx.depth||0)>0||!equipmentAffixes(h).capacitor)return;const s=state(h),event=ctx.universalEvent??ctx.eventId;if(event===undefined||s.seen.includes(event))return;s.seen.push(event);if(s.seen.length>64)s.seen.shift();s.charge=Math.min(6,(s.charge||0)+1);if(s.charge===6&&!s.charged){s.charged=true;fx(w,h,'capacitor',h,48);}
}
export function onEquipmentSkill(w,h,a){
 if(h.down)return;const affixes=equipmentAffixes(h),s=state(h);if(a?.eventId!==undefined){s.skillEvents??=[];if(s.skillEvents.includes(a.eventId))return;s.skillEvents.push(a.eventId);if(s.skillEvents.length>64)s.skillEvents.shift();}
 if(affixes.spellWard&&ready(w,h,'spellWard',4)){const gain=Math.max(0,Math.min(120*(h.shieldPower||1)-(h.shield||0),8*affixes.spellWard*(h.shieldPower||1),h.maxHp*.12));if(gain){h.shield=(h.shield||0)+gain;h.universal??={};h.universal.shields??=[];h.universal.shields.push({amount:gain,until:w.time+3,equipment:true});fx(w,h,'spellWard',h,55);}}
 if(affixes.capacitor&&s.charge>=6){s.charge=0;s.charged=false;fx(w,h,'capacitor',h,140,.45);for(const e of w.enemies)if(e.hp>0&&dist(h,e)<140&&w.lineClear(h,e)){w.damageEnemy(e,7*affixes.capacitor*Math.max(h.power||1,h.skillPower||1),h,e.boss?0:220,'proc',0,unit(e.x-h.x,e.y-h.y),{depth:1,eventId:w.nextAttackId++,equipment:true});}}
}
export function onEquipmentHurt(w,h,actualLostHp){
 if(h.down||actualLostHp<=0||!equipmentAffixes(h).panicMagnet||!ready(w,h,'panicMagnet',8))return;const range=170+Math.min(90,equipmentAffixes(h).panicMagnet*25);let count=0;
 for(const p of w.pickups)if(['xp','gold'].includes(p.type)&&p.owner===undefined&&dist(h,p)<range&&w.lineClear(h,p)){const d=dist(h,p),v=unit(h.x-p.x,h.y-p.y),travel=Math.min(90,Math.max(0,d-24));p.x+=v.x*travel;p.y+=v.y*travel;count++;}if(count)fx(w,h,'panicMagnet',h,range);
}
export function resetEquipment(w,ownerId=null){w.equipmentObjects=(w.equipmentObjects||[]).filter(o=>ownerId!==null&&o.owner!==ownerId);w.effects=w.effects.filter(e=>e.type!=='equipment'||ownerId!==null&&e.owner!==ownerId);for(const h of w.heroes)if(ownerId===null||h.id===ownerId)clearHeroState(h);}
export function tickEquipment(w,dt){
 for(const h of w.heroes)if(h.down){clearHeroState(h);for(const o of w.equipmentObjects||[])if(o.owner===h.id)o.life=0;}
 for(const o of w.equipmentObjects||[]){
  const h=w.heroes.find(h=>h.id===o.owner);if(!h||h.down||!Object.values(h.equipment||{}).some(item=>item?.uid===o.sourceUid&&item.affixes?.some(a=>a.key===o.affix))){o.life=0;continue;}
  const liveTime=Math.min(dt,Math.max(0,o.life));o.life-=dt;if(!liveTime)continue;
  if(o.kind==='snare'){o.timer-=dt;if(o.timer<=0){o.timer+=.2;for(const e of w.enemies)if(e.hp>0&&dist(o,e)<o.r&&w.lineClear(o,e))e.slow=Math.max(e.slow||0,e.boss?.15:.35);}continue;}
  const from={x:o.x,y:o.y},to={x:o.x+o.dx*o.speed*liveTime,y:o.y+o.dy*o.speed*liveTime},contacts=w.obstacles.map(b=>({t:segmentCircle(from,to,b,b.r+o.r),wall:true}));
  for(const e of w.enemies)if(e.hp>0&&!o.hit.includes(e.id))contacts.push({t:segmentCircle(from,to,e,(enemyDef(e).bodyRadius||22)+o.r),target:e});contacts.sort((a,b)=>a.t-b.t||(a.wall?-1:1));let stopped=false;
  for(const contact of contacts){if(contact.t===Infinity)break;if(contact.target?.hp<=0)continue;const at={x:from.x+(to.x-from.x)*contact.t,y:from.y+(to.y-from.y)*contact.t};if(contact.wall){Object.assign(o,at);o.life=0;stopped=true;break;}const e=contact.target;o.hit.push(e.id);w.damageEnemy(e,o.damage,h,20,'proc',0,{x:o.dx,y:o.dy},{depth:1,eventId:o.eventId,equipment:true});fx(w,h,o.kind,at,24,.16);if(o.hit.length>=o.pierce){Object.assign(o,at);o.life=0;stopped=true;break;}}
  if(!stopped)Object.assign(o,to);
 }
 w.equipmentObjects=(w.equipmentObjects||[]).filter(o=>o.life>0);
}
