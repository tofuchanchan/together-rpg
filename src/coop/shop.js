import {rollEquipment,applyEquipment,resetEquipment} from './equipment.js';
import {rollRecruit} from './recruitment.js';
import {rollLesson} from './shop-lessons.js';

const allowed=(w,slot)=>w.mode==='shop'&&Number.isInteger(slot)&&slot>=0&&slot<w.humanCount;
const fail=(w,slot,reason)=>{if(w.shop?.stalls[slot])w.shop.stalls[slot].message=reason;return {ok:false,reason};};
export const shopDue=w=>w.room%5===0&&w.shopVisitedRoom!==w.room;
export const shopRerollPrice=(w,slot=0)=>8+Math.floor(w.room/5)*2+(w.shop?.stalls[slot]?.rerolls||0)*6;
export const shopTargets=(w,slot)=>w.heroes.filter(h=>h.role===w.heroes[slot]?.role&&(h.id===slot||h.ai));
function fillStock(w,slot){
 const s=w.shop.stalls[slot],role=w.heroes[slot].role;s.revision++;
 s.offers=Array.from({length:5},(_,i)=>rollEquipment(role,i===0?'weapon':i===1?'armor':w.random()<.5?'weapon':'armor',w.room,()=>w.random(),`gear-${w.nextId++}`));
 s.recruits=Array.from({length:5},()=>rollRecruit(w,()=>w.random(),`recruit-${w.nextId++}`));
 const excluded=[];s.lessons=Array.from({length:5},()=>{const item=rollLesson(w,slot,excluded);if(item)excluded.push(item.key);return item;});
 s.replacing=null;s.inspect=null;w.shop.ready[slot]=false;
}
export function enterShop(w,returnMode='complete'){
 if(!shopDue(w)||!['complete','victory'].includes(w.mode))return false;
 w.shopVisitedRoom=w.room;w.shop={room:w.room,returnMode,partyRevision:0,ready:Array(w.humanCount).fill(false),stalls:Array.from({length:w.humanCount},(_,slot)=>({owner:slot,rerolls:0,offers:[],recruits:[],lessons:[],lessonPurchases:0,category:'equipment',cursor:0,target:slot,inspect:null,replacing:null,revision:0,message:'个人金币与库存 · 可为自己或同职业 AI 购买'}))};
 for(let slot=0;slot<w.humanCount;slot++)fillStock(w,slot);
 w.mode='shop';w.clearBuffers();w.accumulator=0;w.emit('shop');return true;
}
export function rerollShop(w,slot){
 if(!allowed(w,slot))return fail(w,slot,'当前无法刷新');
 const payer=w.heroes[slot],s=w.shop.stalls[slot],price=shopRerollPrice(w,slot);if(payer.gold<price)return fail(w,slot,`刷新需要 ${price} 金币`);
 payer.gold-=price;s.rerolls++;fillStock(w,slot);s.message='你的三类商品已刷新；技艺连购加价保留。';w.emit('shopReroll',{id:slot});return {ok:true,price};
}
export function buyShopEquipment(w,slot,index,targetId,expectedUid){
 if(!allowed(w,slot))return fail(w,slot,'当前无法购买');
 const s=w.shop.stalls[slot],payer=w.heroes[slot],item=s.offers[index],h=w.heroes[targetId];
 if(!item||item.sold||item.uid!==expectedUid)return fail(w,slot,'这件商品已售出或库存已刷新');
 if(!shopTargets(w,slot).includes(h)||item.role!==payer.role)return fail(w,slot,'只能为自己或同职业 AI 购买');
 if(payer.gold<item.price)return fail(w,slot,`金币不足，还差 ${item.price-payer.gold}`);
 const result=applyEquipment(h,item);if(!result.ok)return fail(w,slot,result.reason||'无法装备');
 resetEquipment(w,h.id);payer.gold-=item.price;item.sold=true;s.revision++;w.shop.ready[slot]=false;
 s.message=`${h.ai?h.name:`P${h.id+1}`} 装备了 ${item.name}${result.old?'，旧装备已替换':''}`;w.emit('purchase',{id:h.id,payer:slot,item:item.uid});return {ok:true,item,old:result.old};
}
function removeOwner(w,id){
 const old=w.heroes[id];w.clearOwnedBuild(old);resetEquipment(w,id);
 w.effects=w.effects.filter(o=>o.owner!==id);w.pickups=w.pickups.filter(o=>o.owner!==id);w.deathQueue=(w.deathQueue||[]).filter(o=>o.owner!==id&&o.owner?.id!==id);
 for(const e of w.enemies){for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners'])if(e[key])delete e[key][id];if(e.pursuitCredit?.owner===id)delete e.pursuitCredit;e.statuses=(e.statuses||[]).filter(s=>s.owner!==id);}
}
export function recruitShop(w,slot,expectedUid,replaceId=null){
 if(!allowed(w,slot))return fail(w,slot,'当前无法招募');
 const s=w.shop.stalls[slot],payer=w.heroes[slot],offer=s.recruits.find(o=>o.uid===expectedUid);if(!offer||offer.hired||offer.uid!==expectedUid)return fail(w,slot,'候选已招募或已刷新');
 if(payer.gold<offer.price)return fail(w,slot,`招募还差 ${offer.price-payer.gold} 金币`);
 let id=w.heroes.length;
 if(id>=3){
  if(replaceId===null){s.replacing={uid:offer.uid,choices:w.heroes.filter(h=>h.ai).map(h=>h.id),selection:0,partyRevision:w.shop.partyRevision};s.revision++;return {ok:false,status:'replace-required'};}
  if(!Number.isInteger(replaceId)||!w.heroes[replaceId]?.ai)return fail(w,slot,'只能替换已有 AI 队员');
  if(s.replacing?.uid!==expectedUid||s.replacing.partyRevision!==w.shop.partyRevision||!s.replacing.choices.includes(replaceId))return fail(w,slot,'队伍已变化，请重新选择要替换的 AI');id=replaceId;
 }else if(replaceId!==null)return fail(w,slot,'队伍有空位，无需替换');
 const h=structuredClone(offer.hero);h.id=id;h.ai=true;h.x=w.heroes[0].x+(id===1?65:-65);h.y=w.heroes[0].y+55;h.invuln=1;h.action=null;h.down=false;h.hp=h.maxHp;h.sentryAnchor={x:h.x,y:h.y};
 if(id<w.heroes.length)removeOwner(w,id);
 w.heroes[id]=h;payer.gold-=offer.price;offer.hired=true;s.revision++;w.shop.partyRevision++;w.shop.ready.fill(false);
 for(const stall of w.shop.stalls){if(stall.replacing&&stall!==s)stall.message='队伍已变化，请重新选择要替换的 AI';stall.replacing=null;if(!shopTargets(w,stall.owner).some(h=>h.id===stall.target))stall.target=stall.owner;}
 s.message=`${h.name} 已加入小队 · ${w.heroes.length}/3 人`;w.emit('recruit',{id,payer:slot,name:h.name});return {ok:true,hero:h};
}
export function leaveShop(w,slot){
 if(!allowed(w,slot))return false;
 w.shop.ready[slot]=!w.shop.ready[slot];w.shop.stalls[slot].replacing=null;w.shop.stalls[slot].inspect=null;
 if(!w.shop.ready.every(Boolean)){w.shop.stalls[slot].message=w.shop.ready[slot]?'已就绪，等待另一位玩家离店':'已取消就绪';return true;}
 w.mode=w.shop.returnMode;w.clearBuffers();w.emit('shopClosed');return true;
}
