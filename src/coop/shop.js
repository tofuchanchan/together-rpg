import {rollEquipment,applyEquipment,resetEquipment} from './equipment.js';
import {rollRecruit} from './recruitment.js';

const allowed=(w,slot)=>w.mode==='shop'&&Number.isInteger(slot)&&slot>=0&&slot<w.humanCount;
const fail=(w,reason)=>{if(w.shop)w.shop.message=reason;return {ok:false,reason};};
export const shopDue=w=>w.room%5===0&&w.shopVisitedRoom!==w.room;
export const shopRerollPrice=w=>8+Math.floor(w.room/5)*2+(w.shop?.rerolls||0)*6;
function fillStock(w){
 w.shop.revision=(w.shop.revision||0)+1;
 const roles=['warrior','mage','archer'];
 w.shop.offers=Array.from({length:3},()=>rollEquipment(roles[Math.floor(w.random()*3)],w.random()<.5?'weapon':'armor',w.room,()=>w.random(),`gear-${w.nextId++}`));
 w.shop.recruit=rollRecruit(w,()=>w.random(),`recruit-${w.nextId++}`);
 w.shop.replacing=null;w.shop.ready=w.heroes.filter(h=>!h.ai).map(()=>false);
}
export function enterShop(w,returnMode='complete'){
 if(!shopDue(w)||!['complete','victory'].includes(w.mode))return false;
 w.shopVisitedRoom=w.room;w.shop={room:w.room,returnMode,rerolls:0,offers:[],recruit:null,cursors:[0,0],targets:[0,1],ready:[],replacing:null,message:'全队共享金币与库存。选择穿戴者，职业相符才能购买。'};
 fillStock(w);w.mode='shop';w.clearBuffers();w.accumulator=0;w.emit('shop');return true;
}
export function rerollShop(w,slot){
 if(!allowed(w,slot))return fail(w,'当前无法刷新');
 const price=shopRerollPrice(w);if(w.gold<price)return fail(w,`刷新需要 ${price} 金币`);
 w.gold-=price;w.shop.rerolls++;fillStock(w);w.shop.message='三件装备和一名候选已刷新；刷新费用逐次提高。';w.emit('shopReroll');return {ok:true,price};
}
export function buyShopEquipment(w,slot,index,targetId,expectedUid){
 if(!allowed(w,slot))return fail(w,'当前无法购买');
 const item=w.shop.offers[index],h=w.heroes[targetId];
 if(!item||item.sold||item.uid!==expectedUid)return fail(w,'这件商品已售出或库存已刷新');
 if(!h||h.role!==item.role)return fail(w,'职业不符，无法穿戴');
 if(w.gold<item.price)return fail(w,`金币不足，还差 ${item.price-w.gold}`);
 const result=applyEquipment(h,item);if(!result.ok)return fail(w,result.reason||'无法装备');
 resetEquipment(w,h.id);w.gold-=item.price;item.sold=true;w.shop.revision++;w.shop.ready.fill(false);
 w.shop.message=`${h.ai?h.name:`P${h.id+1}`} 装备了 ${item.name}${result.old?'，旧装备已替换':''}`;w.emit('purchase',{id:h.id,item:item.uid});return {ok:true,item,old:result.old};
}
function removeOwner(w,id){
 const old=w.heroes[id];w.clearOwnedBuild(old);resetEquipment(w,id);
 w.effects=w.effects.filter(o=>o.owner!==id);w.pickups=w.pickups.filter(o=>o.owner!==id);w.deathQueue=(w.deathQueue||[]).filter(o=>o.owner!==id&&o.owner?.id!==id);
 for(const e of w.enemies){for(const key of ['contributors','directContributors','universalContributors','huntMarks','chillBy','statusOwners'])if(e[key])delete e[key][id];if(e.pursuitCredit?.owner===id)delete e.pursuitCredit;e.statuses=(e.statuses||[]).filter(s=>s.owner!==id);}
}
export function recruitShop(w,slot,expectedUid,replaceId=null){
 if(!allowed(w,slot))return fail(w,'当前无法招募');
 const offer=w.shop.recruit;if(!offer||offer.hired||offer.uid!==expectedUid)return fail(w,'候选已招募或已刷新');
 if(w.gold<offer.price)return fail(w,`招募还差 ${offer.price-w.gold} 金币`);
 let id=w.heroes.length;
 if(id>=3){
  if(replaceId===null){w.shop.replacing={slot,uid:offer.uid,choices:w.heroes.filter(h=>h.ai).map(h=>h.id),selection:0};w.shop.revision++;return {ok:false,status:'replace-required'};}
  if(!Number.isInteger(replaceId)||!w.heroes[replaceId]?.ai)return fail(w,'只能替换已有 AI 队员');id=replaceId;
 }else if(replaceId!==null)return fail(w,'队伍有空位，无需替换');
 const h=structuredClone(offer.hero);h.id=id;h.ai=true;h.x=w.heroes[0].x+(id===1?65:-65);h.y=w.heroes[0].y+55;h.invuln=1;h.action=null;h.down=false;h.hp=h.maxHp;h.sentryAnchor={x:h.x,y:h.y};
 if(id<w.heroes.length)removeOwner(w,id);
 w.heroes[id]=h;w.gold-=offer.price;offer.hired=true;w.shop.revision++;w.shop.replacing=null;w.shop.ready.fill(false);w.shop.message=`${h.name} 已加入小队 · ${w.heroes.length}/3 人`;w.emit('recruit',{id,name:h.name});return {ok:true,hero:h};
}
export function leaveShop(w,slot){
 if(!allowed(w,slot))return false;
 w.shop.ready[slot]=!w.shop.ready[slot];w.shop.replacing=null;
 if(!w.shop.ready.every(Boolean)){w.shop.message='等待另一位玩家确认离店';return true;}
 w.mode=w.shop.returnMode;w.clearBuffers();w.emit('shopClosed');return true;
}
