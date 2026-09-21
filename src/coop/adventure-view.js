import {text,heading,CREAM,CYAN,ORANGE} from './art.js';
import {skin} from './world-assets.js';
import {bar} from './world-art.js';
import {drawAdventureSprite} from './adventure-art.js';
import {drawEquipmentIcon} from './shop-event-art.js';
import {EQUIPMENT_STAT_NAMES,EQUIPMENT_AFFIXES} from './equipment-data.js';
import {objectiveName,voteRoute,decideRoute,claimRouteReward} from './adventure.js';
const colors=[CYAN,ORANGE];
export function handleAdventureInput(v,slot,input){
 const w=v.world,m=w.routeMenu,loot=w.routeLoot;if(slot>=w.humanCount)return;
 if(w.mode==='route'){
  if(input.cancel){m.votes[slot]=null;m.disputed=false;return;}
  if(input.left||input.right||input.up||input.down){m.selection[slot]=1-m.selection[slot];m.votes[slot]=null;m.disputed=false;return;}
  if(input.confirm){if(m.disputed&&m.captain===slot)decideRoute(w,slot);else voteRoute(w,slot,m.selection[slot]);v.router.flush();}
 }else if(w.mode==='routeReward'&&!loot.ready[slot]){
  if(input.up||input.left)loot.selection[slot]=(loot.selection[slot]+2)%3;
  if(input.down||input.right)loot.selection[slot]=(loot.selection[slot]+1)%3;
  if(input.confirm){claimRouteReward(w,slot,loot.selection[slot]===2?-1:loot.selection[slot]);v.router.flush();}
 }
}
export function drawRoute(v){
 const c=v.c,w=v.world,m=w.routeMenu;v.veil(.88);
 heading(c,`第 ${m.room} 关 · 林中岔路`,720,106,34,CREAM,'center');
 text(c,'选择下一场冒险 · 第一波遭遇战，第二波执行目标',720,146,17,'#d5dfc1','center');
 m.options.forEach((r,i)=>{
  const x=219+i*518;skin(c,'panel-neutral',x,183,484,407);drawAdventureSprite(c,r.art,0,x+242,363,139);
  heading(c,r.name,x+242,395,27,CREAM,'center');text(c,`${r.risk}  /  ${objectiveName(r.objective)}`,x+242,430,17,r.risk==='险路'?'#ffc183':'#9edcc1','center');
  v.wrap(r.description,x+30,460,424,16,2);text(c,v.fit(r.danger,424,15),x+30,514,15,'#e4b5a0');text(c,v.fit(r.prize,424,15),x+30,548,15,'#f6dc96');
  for(let slot=0;slot<w.humanCount;slot++){
   const bx=x+22+slot*(w.humanCount===2?226:0),bw=w.humanCount===2?214:440,selected=m.selection[slot]===i;
   v.button(`P${slot+1} ${m.votes[slot]===i?'已投票':selected?'选择此路':'投票'}`,bx,606,bw,43,()=>{voteRoute(w,slot,i);v.router.flush();},colors[slot]);
   if(selected){c.strokeStyle=colors[slot];c.lineWidth=3;c.strokeRect(bx-3,603,bw+6,49);}
  }
 });
 if(m.disputed){text(c,`意见不同 · 本次由 P${m.captain+1} 决定，下一处岔路轮换`,720,692,18,'#ffe0a0','center');v.button(`P${m.captain+1} 确认所选路线`,529,716,382,43,()=>{decideRoute(w,m.captain);v.router.flush();},colors[m.captain]);}
 else text(c,w.humanCount===2?'双方同意后出发 · 分歧时轮值队长裁决':'方向键选择 · E / A 确认',720,708,17,'#d5dfc1','center');
 text(c,'P1 WASD / E · P2 方向键 / Enter · 手柄方向键 / A · Start 暂停',720,787,14,'#b8cbb4','center');
}
const statText=item=>`${EQUIPMENT_STAT_NAMES[item.main.stat]} +${['maxHp','pickupRadius'].includes(item.main.stat)?item.main.value:Math.round(item.main.value*100)+'%'}`;
export function drawRouteReward(v){
 const c=v.c,w=v.world,l=w.routeLoot;v.veil(.88);heading(c,'遗物取回 · 各自选择',720,100,32,CREAM,'center');text(c,'选择一件本职业装备，替换当前同部位；也可以保留原装备',720,141,17,'#d5dfc1','center');
 for(let slot=0;slot<w.humanCount;slot++){
  const x=w.humanCount===1?421:slot?751:65;skin(c,slot?'panel-orange':'panel-cyan',x,181,598,550);heading(c,`P${slot+1}${l.ready[slot]?' · 已完成':''}`,x+299,220,24,colors[slot],'center');
  l.offers[slot].forEach((item,i)=>{
   const y=263+i*172;skin(c,'card-neutral',x+22,y,554,157);drawEquipmentIcon(c,item,x+82,y+72,88);text(c,v.fit(item.name,414,18,700),x+140,y+24,18,'#f4dfae','left',700);text(c,statText(item),x+140,y+52,16,CREAM);
   text(c,v.fit(item.affixes.map(a=>EQUIPMENT_AFFIXES[a.key].title).join(' / ')||'无附加词条',414,14),x+140,y+77,14,'#c9dcc0');
   const old=w.heroes[slot].equipment?.[item.slot];text(c,v.fit(`当前：${old?old.name+' · '+statText(old):'未装备'}`,510,13),x+42,y+112,13,'#bacbb1');
   v.button('装备此件',x+388,y+124,174,28,()=>{claimRouteReward(w,slot,i);v.router.flush();},colors[slot],l.ready[slot]);
   if(l.selection[slot]===i&&!l.ready[slot]){c.strokeStyle=colors[slot];c.lineWidth=3;c.strokeRect(x+19,y-3,560,163);}
  });
  v.button('保留原装备 · 放弃领取',x+25,642,548,47,()=>{claimRouteReward(w,slot,-1);v.router.flush();},colors[slot],l.ready[slot]);
  if(l.selection[slot]===2&&!l.ready[slot]){c.strokeStyle=colors[slot];c.lineWidth=3;c.strokeRect(x+22,639,554,53);}
 }
 text(c,'上下选择 · E / Enter / 手柄 A 确认 · 金币各自持有，本次不收费',720,769,15,'#cbd9bd','center');
}
export function drawObjectiveHUD(v){
 const c=v.c,w=v.world,o=w.objective;if(!o||w.bonusEvent||w.mode!=='play'||o.kind==='clear')return false;
 skin(c,'panel-neutral',465,85,510,64);const active=o.phase==='active';
 const label=active?`${objectiveName(o.kind)} · ${Math.ceil(o.remaining)} 秒`:o.phase==='cleanup'?'任务失守 · 清理残敌后继续':o.success?'目标完成 · 拾取战利品':'清场完成 · 拾取战利品';
 text(c,label,720,103,19,o.success?'#a2efcf':o.phase==='cleanup'?'#ffc18b':CREAM,'center',700);
 if(active&&o.kind==='defend'){text(c,`林灯耐久 ${Math.ceil(o.beacon.hp)} / ${o.beacon.maxHp} · 拦截攻城者`,720,128,14,'#cbe8df','center');bar(c,486,142,468,5,o.beacon.hp/o.beacon.maxHp,'#8fe6d4');}
 else if(active){text(c,`剩余巢穴 ${o.nests.filter(n=>n.hp>0).length}/3 · 靠近锁定 / 核心亮起时易伤`,720,128,14,'#e2d6b0','center');bar(c,486,142,468,5,o.remaining/o.duration,'#f1c864');}
 else text(c,o.phase==='cleanup'?'额外路线奖励失去 · 基础技能奖励保留':`${Math.ceil(o.remaining)} 秒后选择技能`,720,130,14,'#d5dfc1','center');return true;
}
