import {ROLES} from './model.js';
import {createHero} from './recruitment.js';
import {CORES,PASSIVES,skillName} from './builds.js';
import {shopRerollPrice} from './shop.js';
import {EQUIPMENT_AFFIXES} from './equipment-data.js';
import {hero} from './sprites.js';
import {skin} from './world-assets.js';
import {text,CREAM,CYAN,ORANGE} from './art.js';

export const GEAR_RARITIES=['','普通','精良','稀有','传奇'];
const colors=['','#b6c5ae','#85d6b3','#a2b7ff','#f3c66f'];
const stats={maxHp:'生命',power:'普攻',skillPower:'技能',haste:'攻速',crit:'暴击',critDamage:'暴伤',evasion:'闪避',armor:'减伤',cooldown:'冷却缩减',rangeBonus:'范围',speedBonus:'移速',pickupRadius:'拾取',shieldPower:'护盾',dotPower:'异常',recovery:'治疗'};
const affixes={dodgeLoad:'闪避装填：闪避后下次普攻追加双弹',spellWard:'施法护盾：施法获得短时护盾',capacitor:'蓄能器：普攻蓄能，为下次技能附加推退',piercingEdge:'贯穿刃：每四次普攻追加贯穿针',trailSnare:'迟滞足迹：闪避留下减速圈',panicMagnet:'求生磁石：失血牵引附近经验与金币'};
const sharedOverlay=(v,field,value)=>{v.world.shop[field]=value;v.world.shop.revision++;v.router.flush();};
const label=h=>h.ai?`${h.name} · ${ROLES[h.role].name}`:`P${h.id+1} · ${ROLES[h.role].name}`;
export const equipmentStat=(stat,value)=>`${stats[stat]||stat} +${['maxHp','pickupRadius'].includes(stat)?Math.round(value):Math.round(value*100)+'%'}`;
function equipmentText(item){return equipmentStat(item.main.stat,item.main.value);}
function affixText(a){const n=Number(a.strength)||1,amount=v=>(v*n).toFixed(1).replace(/\.0$/,'');return ({dodgeLoad:`闪步装填：闪避后3秒内下一普攻发射2副弹，各${amount(5)}×较高攻击强度；间隔3秒`,spellWard:`咏唱护壁：施法获得${amount(8)}×护盾强度的盾，最多12%生命，持续3秒；间隔4秒`,capacitor:`脉冲电容：6次普攻命中蓄满，下次施法推退并造成${amount(7)}×较高攻击强度范围伤害`,piercingEdge:`纵贯锋芒：每4次普攻追加贯穿针，${amount(8)}×较高攻击强度，最多穿3敌`,trailSnare:`缓行足迹：闪避起点留下半径${Math.round(65+Math.min(30,n*10))}的迟滞圈，持续2.5秒；间隔5秒`,panicMagnet:`应急牵引：失血时牵引${Math.round(170+Math.min(90,n*25))}内经验金币，仍需拾取；间隔8秒`})[a.key]||EQUIPMENT_AFFIXES[a.key]?.desc||a.key;}
export function handleShopInput(v,slot,input){
 const w=v.world,s=w.shop;if(w.mode!=='shop'||slot>=w.humanCount)return;
 if(s.inspect){if(input.confirm||input.skill1||input.reroll)sharedOverlay(v,'inspect',null);return;}
 if(s.replacing){if(s.replacing.slot!==slot)return;const r=s.replacing;
  if(input.reroll||input.skill1){sharedOverlay(v,'replacing',null);return;}
  if(input.up||input.left)r.selection=(r.selection+r.choices.length-1)%r.choices.length;
  if(input.down||input.right)r.selection=(r.selection+1)%r.choices.length;
  if(input.confirm){w.recruit(slot,r.uid,r.choices[r.selection]);v.router.flush();}return;
 }
 if(input.up)s.cursors[slot]=(s.cursors[slot]+5)%6;
 if(input.down)s.cursors[slot]=(s.cursors[slot]+1)%6;
 if(input.left||input.right)s.targets[slot]=(s.targets[slot]+(input.right?1:w.heroes.length-1))%w.heroes.length;
 if(input.skill1){sharedOverlay(v,'inspect',s.cursors[slot]<3?{type:'item',index:s.cursors[slot]}:{type:'recruit'});return;}
 if(input.reroll){w.rerollShop(slot);v.router.flush();return;}
 if(input.confirm){const at=s.cursors[slot];if(at<3){const item=s.offers[at];w.buyEquipment(slot,at,s.targets[slot],item?.uid);}else if(at===3)w.recruit(slot,s.recruit?.uid);else if(at===4)w.rerollShop(slot);else w.leaveShop(slot);v.router.flush();}
}
export function drawShop(v){
 const c=v.c,w=v.world,s=w.shop;v.veil(.95);text(c,'林间商旅',82,43,32,CREAM);text(c,`第 ${w.room} 关补给 · 每五关停靠`,285,44,15,'#aec7b2');text(c,`共用金币  ${w.gold}`,1355,43,25,'#f5d685','right');
 const humanColors=[CYAN,ORANGE];
 for(let slot=0;slot<w.humanCount;slot++){const x=82+slot*650,target=w.heroes[s.targets[slot]]||w.heroes[slot];
  v.button(`P${slot+1} 穿戴者：${label(target)}  ↔`,x,65,550,37,()=>s.targets[slot]=(s.targets[slot]+1)%w.heroes.length,humanColors[slot]);
  text(c,`${v.router.slots[slot].type==='gamepad'?'上下选择 · 左右换人 · A 确认 · Y 刷新 · X 详情':slot===0?'W/S 选择 · A/D 换人 · E 确认 · R 刷新 · Q 详情':'↑/↓ 选择 · ←/→ 换人 · Enter 确认 · NUM3 刷新 · NUM1 详情'}`,x+4,119,12,'#b5c8b2');
 }
 s.offers.forEach((item,index)=>{
  const x=82+index*426,y=144,width=405;skin(c,'card-neutral',x,y,width,307);
  text(c,`${GEAR_RARITIES[item.rarity]} · ${ROLES[item.role].name} ${item.slot==='weapon'?'武器':'套装'} · 阶 ${item.level}`,x+20,y+22,13,colors[item.rarity]);
  text(c,v.fit(item.name,365,23),x+20,y+51,23,CREAM);
  text(c,`${item.price} 金`,x+381,y+52,18,'#f1d68f','right');
  v.regions.push({x,y,w:width,h:238,action:()=>sharedOverlay(v,'inspect',{type:'item',index})});
  const preview=createHero(item.role,0);preview.equipment[item.slot]=item;
  c.save();c.translate(x+63,y+153);hero(c,preview,v.animTime,.72);c.restore();
  v.wrap(equipmentText(item),x+125,y+91,256,13,3);
  (item.affixes||[]).forEach((a,i)=>v.wrap(affixes[a.key]||a.key,x+20,y+166+i*27,366,11,1));
  text(c,'点卡面查看数值与换装损益',x+20,y+235,10,'#90a58e');
  if(!(item.affixes||[]).length)text(c,'基础装备 · 无特殊词条',x+20,y+185,12,'#a9bca3');
  for(let slot=0;slot<w.humanCount;slot++){const target=w.heroes[s.targets[slot]],matches=target?.role===item.role,bx=x+15+slot*192,selected=s.cursors[slot]===index;
   v.button(item.sold?'已售出':!matches?`P${slot+1} 职业不符`:`${selected?'▶ ':''}P${slot+1} 购买 ${item.price} 金`,bx,y+252,w.humanCount===1?375:183,38,()=>{s.cursors[slot]=index;w.buyEquipment(slot,index,s.targets[slot],item.uid);},selected?humanColors[slot]:'#8d9f84',item.sold||!matches||w.gold<item.price);
  }
 });
 const offer=s.recruit,h=offer.hero;skin(c,'panel-neutral',82,466,831,239);
 text(c,`${offer.hired?'已招募 · ':''}${offer.name}  /  ${ROLES[offer.role].name}`,104,493,23,CREAM);text(c,`${GEAR_RARITIES[offer.rarity]}伙伴 · Lv.${offer.level}`,884,493,15,colors[offer.rarity],'right');
 v.regions.push({x:82,y:466,w:831,h:173,action:()=>sharedOverlay(v,'inspect',{type:'recruit'})});
 c.save();c.translate(147,617);hero(c,{...h,id:2,face:1},v.animTime,.85);c.restore();
 const core=h.core?CORES[h.core]?.title:'未定核心';
 text(c,`构筑 ${offer.buildPoints} 点 · 属性 ${offer.attributePoints} 点 · ${core}`,227,523,13,'#e3d4a3');
 v.wrap(h.skills.map((n,i)=>n?`${skillName(h,i)} ${n}`:'未习得技能').join(' / '),227,549,661,13,2);
 v.wrap(Object.entries(h.passives).map(([key,n])=>`${PASSIVES[key]?.title||key} ${n}`).join(' · ')||'暂未持有被动',227,578,661,12,2);
 text(c,v.fit(`武器：${h.equipment?.weapon?.name||'初始'} · 防具：${h.equipment?.armor?.name||'初始'}`,658,12),227,612,12,'#b7cbb3');
 for(let slot=0;slot<w.humanCount;slot++){v.button(`${s.cursors[slot]===3?'▶ ':''}P${slot+1} ${offer.hired?'已加入':w.heroes.length>=3?'招募并选择替换':'招募'} · ${offer.price} 金`,105+slot*392,648,w.humanCount===1?784:379,38,()=>{s.cursors[slot]=3;w.recruit(slot,offer.uid);},humanColors[slot],offer.hired||w.gold<offer.price);}
 skin(c,'panel-neutral',931,466,426,239);text(c,`队伍 ${w.heroes.length}/3`,954,492,19,CREAM);
 w.heroes.forEach((p,i)=>text(c,v.fit(`${label(p)} · Lv.${p.level}`,379,13),954,518+i*24,13,p.ai?colors[p.rarity]:humanColors[p.id]));
 v.button(`${s.cursors.some(n=>n===4)?'▶ ':''}刷新全店 · ${shopRerollPrice(w)} 金`,952,594,383,37,()=>w.rerollShop(0),'#d3bc79',w.gold<shopRerollPrice(w));
 for(let slot=0;slot<w.humanCount;slot++)v.button(`P${slot+1} ${s.ready[slot]?'已就绪 ✓':'离店'}${s.cursors[slot]===5?' ◀':''}`,952+slot*196,648,w.humanCount===1?383:187,38,()=>w.leaveShop(slot),humanColors[slot]);
 text(c,v.fit(s.message,1260,14),720,734,14,'#edd49a','center');
 text(c,'购买立即换装，旧件消失、不退币。刷新同时更换装备与候选；普通装备价格低，稀有词条需取舍。',720,765,12,'#9eb59c','center');
 if(s.replacing){
  const r=s.replacing;v.veil(.8);v.regions=[];skin(c,'panel-gold',370,245,700,300);text(c,'选择要离队的 AI',720,280,25,CREAM,'center');text(c,'原队员与携带装备一起离队；真人不可替换。',720,315,14,'#d6cfb2','center');
  r.choices.forEach((id,i)=>{const old=w.heroes[id];v.button(`${r.selection===i?'▶ ':''}${label(old)} · Lv.${old.level}`,404,343+i*55,632,44,()=>w.recruit(r.slot,r.uid,id),humanColors[r.slot]);});
  v.button('取消 · R / Y',580,480,280,36,()=>sharedOverlay(v,'replacing',null),'#9db795');
 }
 if(s.inspect){
  v.veil(.88);v.regions=[];skin(c,'panel-gold',270,130,900,574);
  if(s.inspect.type==='item'){
   const item=s.offers[s.inspect.index];text(c,`${GEAR_RARITIES[item.rarity]} · ${item.name} · ${item.price} 金`,310,173,26,colors[item.rarity]);text(c,equipmentText(item),310,215,20,CREAM);
   item.affixes.forEach((a,i)=>v.wrap(affixText(a),310,260+i*48,812,14,2));
   text(c,'换装损益（旧装备会消失）',310,432,19,'#eed5a3');
   w.heroes.filter(p=>p.role===item.role).forEach((p,i)=>{const old=p.equipment[item.slot];text(c,v.fit(`${label(p)}：移除 ${old?old.name+' / '+equipmentText(old):'无旧加成'} → 获得 ${equipmentText(item)}`,810,13),310,468+i*48,13,'#c4d7b9');if(old?.affixes.length)text(c,'失去词条：'+old.affixes.map(a=>EQUIPMENT_AFFIXES[a.key]?.title).join('、'),310,488+i*48,11,'#e1ad99');});
   if(!w.heroes.some(p=>p.role===item.role))text(c,'队伍中没有该职业，当前无法购买。',310,473,15,'#e1ad99');
  }else{
   text(c,`${offer.name} · ${GEAR_RARITIES[offer.rarity]} ${ROLES[offer.role].name} · Lv.${offer.level}`,310,173,26,colors[offer.rarity]);
   text(c,`生命 ${h.maxHp} · 普攻 ×${h.power.toFixed(2)} · 技能 ×${h.skillPower.toFixed(2)} · 暴击 ${Math.round(h.crit*100)}%`,310,210,16,CREAM);
   text(c,`属性 ${offer.attributePointsUsed}/${offer.attributePoints} 点 · 构筑 ${offer.buildPointsUsed}/${offer.buildPoints} 点（只按等级分配）`,310,239,14,'#d7c699');
   Object.values(h.equipment).filter(Boolean).forEach((item,i)=>{const y=282+i*148;text(c,`${GEAR_RARITIES[item.rarity]} · ${item.name} / ${equipmentText(item)}`,310,y,17,colors[item.rarity]);item.affixes.forEach((a,j)=>v.wrap(affixText(a),310,y+28+j*32,810,12,2));});
   text(c,'人才稀有度只增加基础生命和攻击强度，初始构筑点不受稀有度影响。',310,591,13,'#bbcfb0');
  }
  v.button('返回商店 · E / A / Q',525,645,390,36,()=>sharedOverlay(v,'inspect',null),CYAN);
 }
}
