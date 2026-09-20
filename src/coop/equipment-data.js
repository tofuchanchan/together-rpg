export const EQUIPMENT_RARITIES=[null,{name:'普通',color:'#c6c8ce',affixes:0},{name:'精良',color:'#74dca0',affixes:1},{name:'稀有',color:'#85aaff',affixes:2},{name:'传奇',color:'#ffc86f',affixes:3}];
export const EQUIPMENT_APPEARANCES={
 warrior:{weapon:[{key:'warrior_weapon_iron',name:'守卫铁剑'},{key:'warrior_weapon_cleaver',name:'赤刃重剑'}],armor:[{key:'warrior_armor_plate',name:'银钢板甲'},{key:'warrior_armor_raider',name:'赤铜战甲'}]},
 mage:{weapon:[{key:'mage_weapon_crystal',name:'霜晶法杖'},{key:'mage_weapon_ember',name:'余烬法杖'}],armor:[{key:'mage_armor_star',name:'黑星法袍'},{key:'mage_armor_leaf',name:'翠叶法袍'}]},
 archer:{weapon:[{key:'archer_weapon_longbow',name:'林卫长弓'},{key:'archer_weapon_crossbow',name:'猎鹰短弩'}],armor:[{key:'archer_armor_scout',name:'狼首猎装'},{key:'archer_armor_ranger',name:'鸮羽猎装'}]},
};
export const EQUIPMENT_AFFIXES={
 dodgeLoad:{title:'闪步装填',slot:'weapon',desc:'闪避后3秒内的下一次普攻发射两颗副弹；触发间隔3秒'},
 spellWard:{title:'咏唱护壁',slot:'armor',desc:'施法获得3秒薄盾；间隔4秒，进入现有护盾吸收账本'},
 capacitor:{title:'脉冲电容',slot:'weapon',desc:'6次普攻有效命中蓄一格；下次施法向四周推退小怪'},
 piercingEdge:{title:'纵贯锋芒',slot:'weapon',desc:'每4次普攻追加一发定向穿透针，最多命中3名敌人'},
 trailSnare:{title:'缓行足迹',slot:'armor',desc:'闪避起点留下2.5秒迟滞圈；间隔5秒，每人最多一个'},
 panicMagnet:{title:'应急牵引',slot:'armor',desc:'实际失血时牵引附近经验与金币，需要走近拾取；间隔8秒'},
};
export const EQUIPMENT_STAT_NAMES={power:'普攻强度',skillPower:'技能强度',haste:'攻击速度',crit:'暴击率',cooldown:'冷却缩短',maxHp:'生命上限',armor:'减伤',speedBonus:'移动速度',pickupRadius:'拾取范围'};
const weaponStats={warrior:[['power',.10,.16],['haste',.05,.085],['crit',.025,.045]],mage:[['skillPower',.11,.17],['power',.08,.13],['cooldown',.025,.045]],archer:[['power',.10,.15],['haste',.055,.09],['crit',.03,.05]]};
const armorStats={warrior:[['maxHp',20,32],['armor',.015,.03],['speedBonus',.035,.055],['pickupRadius',12,20]],mage:[['maxHp',12,20],['armor',.015,.03],['speedBonus',.035,.055],['pickupRadius',12,20]],archer:[['maxHp',14,23],['armor',.015,.03],['speedBonus',.035,.055],['pickupRadius',12,20]]};
const pick=(list,rng)=>list[Math.min(list.length-1,Math.floor(rng()*list.length))];
const round=(v,places=3)=>Math.round(v*10**places)/10**places;

export function equipmentPrice(rarity,room=1){return Math.round([0,24,43,72,112][rarity]*(1+Math.max(0,Math.floor((room-1)/5))*.26));}
export function rollEquipment(role,slot,room,rng,uid){
 if(!EQUIPMENT_APPEARANCES[role]?.[slot]||typeof rng!=='function'||uid===undefined||uid===null)throw Error('Equipment requires role, slot, seeded RNG and uid');
 const level=Math.max(1,Math.floor(room)||1),tier=Math.min(3,Math.floor((level-1)/5)),r=rng();
 const rarity=r<.015+tier*.018?4:r<.13+tier*.045?3:r<.47+tier*.04?2:1;
 const shape=pick(EQUIPMENT_APPEARANCES[role][slot],rng),[stat,min,max]=pick((slot==='weapon'?weaponStats:armorStats)[role],rng);
 const growth=1+Math.min(59,level-1)*.014,quality=1+(rarity-1)*.23;
 const value=round((min+(max-min)*rng())*growth*quality,['maxHp','pickupRadius'].includes(stat)?0:3);
 const pool=Object.keys(EQUIPMENT_AFFIXES).filter(k=>EQUIPMENT_AFFIXES[k].slot===slot),affixes=[];
 for(let i=0;i<EQUIPMENT_RARITIES[rarity].affixes;i++){const index=Math.min(pool.length-1,Math.floor(rng()*pool.length)),key=pool.splice(index,1)[0];affixes.push({key,strength:round((.9+rng()*.2)*(1+(rarity-2)*.18)*(1+Math.min(59,level-1)*.008))});}
 const price=equipmentPrice(rarity,level);
 return {uid,role,slot,appearance:shape.key,visualKey:shape.key,rarity,level,name:shape.name,main:{stat,value},affixes,price,sellPrice:Math.floor(price*.25)};
}
export function validEquipment(item){
 return !!(item&&item.uid!==undefined&&item.uid!==null&&EQUIPMENT_APPEARANCES[item.role]?.[item.slot]?.some(s=>s.key===item.visualKey)&&item.appearance===item.visualKey&&EQUIPMENT_RARITIES[item.rarity]&&Number.isFinite(item.main?.value)&&item.main.value>0&&(item.slot==='weapon'?weaponStats:armorStats)[item.role].some(s=>s[0]===item.main.stat)&&Array.isArray(item.affixes)&&item.affixes.length<=EQUIPMENT_RARITIES[item.rarity].affixes&&new Set(item.affixes.map(a=>a.key)).size===item.affixes.length&&item.affixes.every(a=>EQUIPMENT_AFFIXES[a.key]?.slot===item.slot&&Number.isFinite(a.strength)&&a.strength>0));
}
