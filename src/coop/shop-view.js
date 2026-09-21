import {ROLES} from './model.js';
import {drawEquipmentIcon} from './shop-event-art.js';
import {CORES,PASSIVES,skillName} from './builds.js';
import {shopRerollPrice,shopTargets} from './shop.js';
import {lessonEligibility} from './shop-lessons.js';
import {drawBuildIcon} from './build-art.js';
import {drawUniversalIcon} from './universal-art.js';
import {icon} from './world-art.js';
import {EQUIPMENT_AFFIXES} from './equipment-data.js';
import {hero} from './sprites.js';
import {skin} from './world-assets.js';
import {text,heading,CREAM,CYAN,ORANGE} from './art.js';

export const GEAR_RARITIES=['','普通','精良','稀有','传奇'];
const colors=['','#b6c5ae','#85d6b3','#a2b7ff','#f3c66f'];
const stats={maxHp:'生命',power:'普攻',skillPower:'技能',haste:'攻速',crit:'暴击',critDamage:'暴伤',evasion:'闪避',armor:'减伤',cooldown:'冷却缩减',rangeBonus:'范围',speedBonus:'移速',pickupRadius:'拾取',shieldPower:'护盾',dotPower:'异常',recovery:'治疗'};
const overlay=(s,field,value)=>{s[field]=value;s.revision++;};
const nextTarget=(w,slot,dir=1)=>{const s=w.shop.stalls[slot],targets=shopTargets(w,slot),at=targets.findIndex(h=>h.id===s.target);s.target=targets[(at+dir+targets.length)%targets.length].id;};
const label=h=>h.ai?`${h.name} · ${ROLES[h.role].name}`:`P${h.id+1} · ${ROLES[h.role].name}`;
export const equipmentStat=(stat,value)=>`${stats[stat]||stat} +${['maxHp','pickupRadius'].includes(stat)?Math.round(value):Math.round(value*100)+'%'}`;
function equipmentText(item){return equipmentStat(item.main.stat,item.main.value);}
function affixText(a){const n=Number(a.strength)||1,amount=v=>(v*n).toFixed(1).replace(/\.0$/,'');return ({dodgeLoad:`闪步装填：闪避后3秒内下一普攻发射2副弹，各${amount(5)}×较高攻击强度；间隔3秒`,spellWard:`咏唱护壁：施法获得${amount(8)}×护盾强度的盾，最多12%生命，持续3秒；间隔4秒`,capacitor:`脉冲电容：6次普攻命中蓄满，下次施法推退并造成${amount(7)}×较高攻击强度范围伤害`,piercingEdge:`纵贯锋芒：每4次普攻追加贯穿针，${amount(8)}×较高攻击强度，最多穿3敌`,trailSnare:`缓行足迹：闪避起点留下半径${Math.round(65+Math.min(30,n*10))}的迟滞圈，持续2.5秒；间隔5秒`,panicMagnet:`应急牵引：失血时牵引${Math.round(170+Math.min(90,n*25))}内经验金币，仍需拾取；间隔8秒`})[a.key]||EQUIPMENT_AFFIXES[a.key]?.desc||a.key;}
export function handleShopInput(v,slot,input){
 const w=v.world;if(w.mode!=='shop'||!Number.isInteger(slot)||slot<0||slot>=w.humanCount)return;const s=w.shop.stalls[slot];
 if(s.inspect){if(input.cancel||input.confirm||input.skill1||input.reroll)overlay(s,'inspect',null);return;}
 if(s.replacing){const r=s.replacing;
  if(input.cancel||input.reroll||input.skill1){overlay(s,'replacing',null);return;}
  if(input.up||input.left)r.selection=(r.selection+r.choices.length-1)%r.choices.length;
  if(input.down||input.right)r.selection=(r.selection+1)%r.choices.length;
  if(input.confirm)w.recruit(slot,r.uid,r.choices[r.selection]);return;
 }
 if(input.up)s.cursor=(s.cursor+7)%8;
 if(input.down)s.cursor=(s.cursor+1)%8;
 const categories=['equipment','skills','recruits'];
 if(input.tabLeft||input.tabRight||(s.cursor!==5&&(input.left||input.right))){const dir=input.tabRight||input.right?1:-1;s.category=categories[(categories.indexOf(s.category)+dir+3)%3];s.cursor=Math.min(s.cursor,4);}
 else if(input.left||input.right)nextTarget(w,slot,input.right?1:-1);
 if(input.cancel){s.cursor=7;return;}
 if(input.skill1&&s.cursor<5){const type=s.category==='equipment'?'item':s.category==='skills'?'lesson':'recruit';const item=(type==='item'?s.offers:type==='lesson'?s.lessons:s.recruits)[s.cursor];if(item)overlay(s,'inspect',{type,index:s.cursor});return;}
 if(input.reroll){w.rerollShop(slot);return;}
 if(input.confirm){const at=s.cursor;if(at<5){if(s.category==='equipment')w.buyEquipment(slot,at,s.target,s.offers[at]?.uid);else if(s.category==='skills')w.buyLesson(slot,s.target,s.lessons[at]?.uid);else w.recruit(slot,s.recruits[at]?.uid);}else if(at===5)nextTarget(w,slot);else if(at===6)w.rerollShop(slot);else{w.leaveShop(slot);if(w.mode!=='shop')v.router.flush();}}
}
function drawDetail(v,slot,x){
 const c=v.c,w=v.world,s=w.shop.stalls[slot],left=x+26,width=608,color=slot===0?CYAN:ORANGE;
 skin(c,'panel-gold',x,76,660,706);
 text(c,`P${slot+1} · ${s.replacing?'招募确认':'商品详情'}`,left,111,22,color,'left',700);
 if(s.replacing){const r=s.replacing;heading(c,'选择要离队的 AI',left,174,27,CREAM);v.wrap('原队员与携带装备一起离队；真人不可替换。',left,215,width,16,2);
  r.choices.forEach((id,i)=>{const old=w.heroes[id];v.button(`${r.selection===i?'▶ ':''}${label(old)} · Lv.${old.level}`,left,289+i*70,width,52,()=>w.recruit(slot,r.uid,id),color);});
  v.button('取消 · B / Q',left,709,width,40,()=>overlay(s,'replacing',null),color);return;
 }
 const info=s.inspect;
 if(info.type==='item'){
  const item=s.offers[info.index];text(c,v.fit(`${item.name} · ${item.price} 金`,width,25,700),left,161,25,colors[item.rarity],'left',700);
  text(c,`${GEAR_RARITIES[item.rarity]} · ${ROLES[item.role].name} ${item.slot==='weapon'?'武器':'套装'} · 阶 ${item.level}`,left,196,15,'#c7d8c0');text(c,equipmentText(item),left,231,20,CREAM);
  (item.affixes||[]).forEach((a,i)=>v.wrap(affixText(a),left,280+i*63,width,15,3));
  if(!item.affixes.length)text(c,'基础装备 · 无特殊词条',left,281,16,'#c7d8c0');
  text(c,'换装损益 · 旧装备会消失',left,489,19,'#eed5a3');shopTargets(w,slot).forEach((p,i)=>{const old=p.equipment[item.slot],y=527+i*57;v.wrap(`${label(p)}：${old?old.name+' / '+equipmentText(old):'无旧加成'} → ${equipmentText(item)}`,left,y,width,14,2);if(old?.affixes.length)text(c,v.fit('失去：'+old.affixes.map(a=>EQUIPMENT_AFFIXES[a.key]?.title).join('、'),width,12),left,y+32,12,'#e1ad99');});
 }else if(info.type==='lesson'){
  const item=s.lessons[info.index??0];text(c,v.fit(`${item.title} · ${item.price} 金`,width,25,700),left,161,25,'#f3c66f','left',700);v.wrap(item.desc,left,209,width,18,4);v.wrap(item.detail||'',left,325,width,15,4);
  text(c,'只补一份构筑，不会赠送另一技能或整套配方。',left,435,15,'#d7c699');shopTargets(w,slot).forEach((h,i)=>{const reason=lessonEligibility(w,item,h,slot);v.wrap(`${label(h)}：${reason||'符合条件，可立即学习'}`,left,480+i*50,width,16,2);});
  v.wrap('每次学习后，其余技艺加价基础售价的35%；刷新不清除加价，下次进店重置。',left,655,width,14,2);
 }else{
  const o=s.recruits[info.index??0],h=o.hero;text(c,v.fit(`${o.name} · ${GEAR_RARITIES[o.rarity]} ${ROLES[o.role].name} · Lv.${o.level}`,width,25,700),left,161,25,colors[o.rarity]);
  text(c,`生命 ${h.maxHp} · 普攻 ×${h.power.toFixed(2)} · 技能 ×${h.skillPower.toFixed(2)} · 暴击 ${Math.round(h.crit*100)}%`,left,199,15,CREAM);
  text(c,`构筑 ${o.buildPointsUsed}/${o.buildPoints} 点 · 属性 ${o.attributePointsUsed}/${o.attributePoints} 点`,left,231,15,'#d7c699');
  v.wrap(h.skills.map((n,i)=>n?`${skillName(h,i)} ${n}`:null).filter(Boolean).join(' / ')||'暂无技能',left,264,width,14,2);
  v.wrap(Object.entries(h.passives).map(([key,n])=>`${PASSIVES[key]?.title||key} ${n}`).join(' · ')||'暂无被动',left,306,width,14,2);
  Object.values(h.equipment).filter(Boolean).forEach((item,i)=>{const y=362+i*148;text(c,v.fit(`${item.name} / ${equipmentText(item)}`,width,16),left,y,16,colors[item.rarity]);item.affixes.forEach((a,j)=>v.wrap(affixText(a),left,y+28+j*35,width,13,2));});
  v.wrap('随机职业候选，由你付费招募；小队仍共用三个席位。',left,676,width,14,1);
 }
 v.button('返回商店 · B / A / E',left,720,width,40,()=>overlay(s,'inspect',null),color);
}
const categories=[['equipment','武器 / 防具'],['skills','技能 / 构筑'],['recruits','佣兵 / 伙伴']];
function frame(c,x,y,w,h,fill,stroke){c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=1.5;c.beginPath();c.roundRect(x,y,w,h,12);c.fill();c.stroke();}
export function drawShop(v){
 const c=v.c,w=v.world;v.veil(1);heading(c,'林间商旅',48,40,32,CREAM);text(c,`第 ${w.room} 关补给 · 各自选购，各自付费`,273,42,16,'#c7d8c0');text(c,`小队 ${w.heroes.length}/3 · 全员就绪后离店`,1392,42,16,'#d9d5ac','right');
 for(let slot=0;slot<w.humanCount;slot++){
  const x=w.humanCount===1?390:48+slot*684,s=w.shop.stalls[slot],payer=w.heroes[slot],target=w.heroes[s.target]||payer,color=slot===0?CYAN:ORANGE,regionStart=v.regions.length;
  frame(c,x,76,660,706,'#203e32','#647b55');text(c,`P${slot+1} · ${ROLES[payer.role].name}的商店`,x+24,106,23,color,'left',700);text(c,`${payer.gold} 金币`,x+634,106,23,'#f5d685','right',700);
  const pad=v.router.slots[slot].type==='gamepad';text(c,pad?'上下选购 · 左右/LB/RB 分类 · A 确认 · Y 刷新 · X 详情':slot===0?'W/S 选购 · A/D 分类 · E 确认 · R 刷新 · Q 详情':'↑/↓ 选购 · ←/→ 分类 · Enter 确认 · NUM3 刷新 · NUM1 详情',x+24,137,13,'#c7d8c0');
  categories.forEach(([key,title],index)=>{const active=s.category===key,tx=x+24+index*207;frame(c,tx,157,198,40,active?'#dcc890':'#2c493a',active?'#f3dfac':'#52674b');text(c,title+'  5',tx+99,177,16,active?'#203c30':'#d5dec5','center',700);v.regions.push({x:tx,y:157,w:198,h:40,action:()=>{s.category=key;s.cursor=0;}});});
  const stock=s.category==='equipment'?s.offers:s.category==='skills'?s.lessons:s.recruits;
  for(let index=0;index<5;index++){
   const item=stock[index],y=211+index*84,selected=s.cursor===index,type=s.category==='equipment'?'item':s.category==='skills'?'lesson':'recruit';
   frame(c,x+20,y,620,77,selected?'#365442':'#294436',selected?color:'#49634b');
   if(!item){text(c,'本轮没有更多符合条件的技艺',x+330,y+38,16,'#bdcbb5','center');continue;}
   v.regions.push({x:x+20,y,w:478,h:77,action:()=>{s.cursor=index;overlay(s,'inspect',{type,index});}});
   frame(c,x+29,y+6,65,65,'#172f27',colors[item.rarity]||'#a29564');
   let title,line,detail,sold,blocked,verb;
   if(type==='item'){
    drawEquipmentIcon(c,item,x+61,y+38,60);title=item.name;line=`${item.slot==='weapon'?'武器':'套装'} · 阶 ${item.level} · ${equipmentText(item)}`;detail=item.affixes.map(a=>EQUIPMENT_AFFIXES[a.key]?.title||a.key).join(' · ')||'基础装备 · 无特殊词条';sold=item.sold;verb='购买';
   }else if(type==='lesson'){
    if(!drawUniversalIcon(c,item.icon,x+61,y+38,49)&&!drawBuildIcon(c,item.icon,x+61,y+38,49))icon(c,item.icon,x+61,y+38,20);
    title=item.title;blocked=lessonEligibility(w,item,target,slot);line=blocked||item.desc;detail=item.sold?'已学会 · 其余技艺已加价':`配方需满足 · 本次已购 ${s.lessonPurchases} 项`;sold=item.sold;verb='学习';
   }else{
    c.save();c.translate(x+61,y+65);hero(c,{...item.hero,id:2,face:1},v.animTime,.40);c.restore();title=`${item.name} · ${GEAR_RARITIES[item.rarity]} ${ROLES[item.role].name}`;line=`Lv.${item.level} · 构筑 ${item.buildPoints} 点 · ${item.hero.core?CORES[item.hero.core]?.title:'未定核心'}`;detail=w.heroes.length>=3?'队伍已满 · 需选择替换 AI':'随机职业 · 携带独立构筑与装备';sold=item.hired;verb='招募';
   }
   text(c,v.fit(title,372,18,700),x+108,y+20,18,colors[item.rarity]||CREAM,'left',700);text(c,v.fit(line,372,13),x+108,y+43,13,blocked?'#e4ae90':'#d7dec4');text(c,v.fit(detail,372,12),x+108,y+63,12,'#aec6ae');
   v.button(sold?'已'+(type==='item'?'售出':type==='lesson'?'学习':'招募'):`${selected?'▶ ':''}${item.price} 金`,x+500,y+14,126,32,()=>{s.cursor=index;if(type==='item')w.buyEquipment(slot,index,s.target,item.uid);else if(type==='lesson')w.buyLesson(slot,s.target,item.uid);else w.recruit(slot,item.uid);},selected?color:'#9db795',!!sold||!!blocked||payer.gold<item.price);
   text(c,sold?'':verb,x+563,y+61,12,'#b5c8ad','center');
  }
  v.button(`${s.cursor===5?'▶ ':''}接收者：${label(target)}${shopTargets(w,slot).length>1?'  ↔':' · 自己'}`,x+24,643,612,36,()=>{s.cursor=5;nextTarget(w,slot);},s.cursor===5?color:'#9db795');
  v.button(`${s.cursor===6?'▶ ':''}刷新三类商品 · ${shopRerollPrice(w,slot)} 金`,x+24,697,300,42,()=>{s.cursor=6;w.rerollShop(slot);},s.cursor===6?color:'#d3bc79',payer.gold<shopRerollPrice(w,slot));
  v.button(`${s.cursor===7?'▶ ':''}${w.shop.ready[slot]?'已就绪 ✓ · 取消':'选购完成 · 离店'}`,x+336,697,300,42,()=>{s.cursor=7;w.leaveShop(slot);if(w.mode!=='shop')v.router.flush();},color);
  text(c,v.fit(s.message,610,13),x+330,762,13,'#edd49a','center');
  if(s.replacing||s.inspect){v.regions.splice(regionStart);drawDetail(v,slot,x);}
 }
}
