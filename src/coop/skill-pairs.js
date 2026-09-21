// Canonical skill indices are independent of the two equipped button positions.
export const EXTRA_SKILLS={
 warrior:[{type:'stomp',title:'踩踏',icon:'stomp',cd:5.8,detail:'震地造成 25 / 34 / 42 伤害，击退并眩晕普通敌人 0.45 秒'}, {type:'blade',title:'剑气斩',icon:'blade',cd:4.8,detail:'释放直线剑气，穿过路径敌人，伤害 34 / 46 / 57'}],
 archer:[{type:'pin',title:'钉穿箭',icon:'pin',cd:5.2,detail:'贯穿重箭造成 33 / 44 / 55 伤害，定身普通敌人 0.7 秒'}, {type:'rain',title:'箭雨',icon:'rain',cd:6.5,detail:'锁定敌群位置，分 3 批落箭，每批 12 / 16 / 20 伤害'}],
 mage:[{type:'barrage',title:'奥术弹幕',icon:'barrage',cd:4.8,detail:'依次发射 6 枚追踪弹，每枚 9 / 12 / 15 伤害'}, {type:'orbit',title:'星轨法球',icon:'orbit',cd:6.4,detail:'布置星轨 3 秒，分 3 次发射双枚追踪弹，每枚 8 / 11 / 13 伤害'}],
};
export const SKILL_PAIRS={
 fortress:{role:'warrior',slots:[0,2],title:'城塞震荡',component:'storage',advances:['城墙反击','断层冲击波'],descs:['立盾迎击 0.8 秒；吸收伤害蓄能，结束向前震荡反击。','震波由脚下向外扩散，逐圈击退；普通敌人眩晕 0.9 秒，Boss 只减速。'],mastery:'盾阵实际吸收伤害后，下次冲击波追加一道震环；不会因空放积蓄。'},
 blades:{role:'warrior',slots:[1,3],title:'剑刃风暴',component:'rageEdge',advances:['剑气龙卷风','一文字斩'],descs:['移动中持续 4 次旋斩，同时向周围释放 4 道穿透剑气。','短暂蓄势后发出窄而长的剑气，逐个贯穿并将普通敌人推向末端。'],mastery:'一文字命中后留下 3 秒剑痕；在附近释放龙卷，从剑痕处爆出一圈剑气，每次施法最多一次。'},
 rail:{role:'archer',slots:[0,2],title:'贯星狩猎',component:'focus',advances:['贯星轨道箭','钉魂连穿'],descs:['高速贯穿；穿过第一个敌人后收束箭身，后续命中获得递增伤害（最多 +45%）。','三支平行贯穿箭钉住敌阵；普通敌人定身 1 秒，Boss 只减速。'],mastery:'轨道箭命中本人钉住的敌人时，向其后方分出两支终结穿透箭；每支主箭最多触发一次。'},
 storm:{role:'archer',slots:[1,3],title:'迁徙箭幕',component:'volleyCharge',advances:['回旋散射','逐浪箭雨'],descs:['7 支扇形箭，命中后各向附近一个未命中敌人折射一次。','沿瞄准方向依次落下三片箭雨，逐步封锁走廊。'],mastery:'散射命中本人箭雨覆盖的敌人时，追加一批覆盖更广的密集落箭，保留原有雨区；每次散射最多一次，不递归。'},
 stars:{role:'mage',slots:[2,3],title:'万星织流',component:'arcane',advances:['万星追猎','星环织机'],descs:['分批发射 14 枚追踪弹，转向追猎敌人；单次弹幕共享触发编号。','星轨持续 4 秒，分 4 批各射 3 弹；站在星轨内，弹幕发射间隔缩短。'],mastery:'星轨中释放弹幕后，星轨追加一批 6 弹；每次施法最多一次，追踪弹不能复制自己。'},
 elements:{role:'mage',slots:[0,1],title:'冰火交织',component:'ember',advances:['燎原火种球','冰川脉冲'],descs:['火球直接命中附带灼烧，并留下持续燃烧区；需要冰区限制走位。','持续冰场分 4 次释放寒潮，叠加寒意；普通敌人可被冻结，Boss 获得脆弱。'],mastery:'火球命中本人寒意目标时消耗寒意，产生蒸汽爆裂；每个火球一次，不能递归。'},
};
export const equippedSkills=h=>h.loadout||[0,1];
export function pairFor(h,slot){return Object.entries(SKILL_PAIRS).find(([,p])=>p.role===h.role&&p.slots.includes(slot));}
export function pairReady(h,slot){const entry=pairFor(h,slot);return !!entry&&entry[1].slots.every(s=>(h.skills[s]||0)>=2&&equippedSkills(h).includes(s)&&!h.forms?.[s]&&!h.evolved?.[s])&&!h.skillAdvances?.[slot];}
export function advanceInfo(h,slot){const entry=pairFor(h,slot);if(!entry||!h.skillAdvances?.[slot])return null;const [key,p]=entry,index=p.slots.indexOf(slot);return {key,title:p.advances[index],desc:p.descs[index],mastery:!!h.pairMastery?.[key]};}
export function masteryReady(h,key){const p=SKILL_PAIRS[key];return !!p&&p.role===h.role&&!h.pairMastery?.[key]&&p.slots.every(s=>equippedSkills(h).includes(s)&&h.skills[s]>=3&&h.skillAdvances?.[s])&&(h.passives[p.component]||0)>=2;}
