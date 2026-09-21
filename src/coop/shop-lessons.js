import {skillPool,applyReward} from './builds.js';
import {SKILL_PAIRS} from './skill-pairs.js';
const kinds=new Set(['active','passive','advance','mastery']);
export const lessonPrice=(card,room)=>Math.round(({active:14,passive:card.quality==='rare'?24:18,advance:32,mastery:50}[card.kind]||18)+room*(card.kind==='mastery'?1.5:1));
function available(h,w){return skillPool(h,{clears:w.clears}).filter(o=>kinds.has(o.kind)&&(o.kind!=='active'||h.skills[o.slot]>0||h.skills.filter(Boolean).length<2)&&(o.kind!=='passive'||h.passives[o.key.split(':')[1]]||Object.keys(h.passives).length<4));}
const nextRank=(h,o)=>o.kind==='active'?(h.skills[o.slot]||0)+1:o.kind==='passive'?(h.passives[o.key.split(':')[1]]||0)+1:null;
export function rollLesson(w,slot=0,excluded=[]){
 const pool=[];
 for(const h of w.heroes.filter(h=>h.role===w.heroes[slot]?.role&&(h.id===slot||h.ai)))for(const card of available(h,w)){
  if(excluded.includes(card.key))continue;
  const targetRank=nextRank(h,card);if(pool.some(o=>o.role===h.role&&o.key===card.key&&o.targetRank===targetRank))continue;
  const paired=Object.values(SKILL_PAIRS).find(p=>p.role===h.role&&p.slots.every(s=>h.skills[s]>0));
  const weight=card.kind==='mastery'?12:card.kind==='advance'?6:card.kind==='active'?2:paired&&card.key===`passive:${paired.component}`?5:1;
  pool.push({...card,targetRank,role:h.role,weight});
 }
 if(!pool.length)return null;
 let pick=w.random()*pool.reduce((n,c)=>n+c.weight,0);const card=pool.find(c=>(pick-=c.weight)<0)||pool.at(-1);
 const basePrice=lessonPrice(card,w.room);return {...card,uid:`lesson-${w.nextId++}`,basePrice,price:Math.ceil(basePrice*(1+(w.shop?.stalls[slot]?.lessonPurchases||0)*.35)),sold:false};
}
export function lessonEligibility(w,item,h,slot=0){
 if(!item||item.sold)return '这份技艺已售出或暂无可学内容';
 if(!h||h.role!==item.role||item.role!==w.heroes[slot]?.role||(h.id!==slot&&!h.ai))return '只能为自己或同职业 AI 购买';
 const card=available(h,w).find(o=>o.key===item.key);if(!card)return '条件不满足或已经习得';
 if(nextRank(h,card)!==item.targetRank)return `需要该项当前为 ${item.targetRank-1} 级`;
 return null;
}
export function buyShopLesson(w,slot,targetId,expectedUid){
 const fail=reason=>{if(w.shop?.stalls[slot])w.shop.stalls[slot].message=reason;return{ok:false,reason};};
 if(w.mode!=='shop'||!Number.isInteger(slot)||slot<0||slot>=w.humanCount)return fail('当前无法学习');
 const s=w.shop.stalls[slot],payer=w.heroes[slot],item=s.lessons.find(o=>o?.uid===expectedUid),h=w.heroes[targetId];if(!item||item.uid!==expectedUid)return fail('卷轴已售出或库存已刷新');
 const reason=lessonEligibility(w,item,h,slot);if(reason)return fail(reason);if(payer.gold<item.price)return fail(`金币不足，还差 ${item.price-payer.gold}`);
 // Revalidate and apply before charging; the shelf never replaces a held skill or passive.
 const result=applyReward(h,item.key);if(!result.ok)return fail('构筑条件已变化，请重新选择');
 payer.gold-=item.price;item.sold=true;s.lessonPurchases++;for(const other of s.lessons)if(other&&!other.sold){other.basePrice??=other.price;other.price=Math.ceil(other.basePrice*(1+s.lessonPurchases*.35));}s.revision++;w.shop.ready[slot]=false;
 s.message=`${h.ai?h.name:`P${h.id+1}`} 学会 ${item.title}；其余技艺连购价格提高`;w.emit('lesson',{id:h.id,payer:slot,key:item.key});return{ok:true,item};
}
