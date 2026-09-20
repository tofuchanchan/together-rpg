import {BOSS_DEF} from './encounters.js';
export const ENEMIES={
 seedling:{name:'豆芽小怪',hp:20,speed:132,range:66,radius:38,windup:.44,damage:5,cd:1.45,behavior:'melee',size:50,xp:1,flank:.2,lead:.25,bodyRadius:14,contactDamage:2,swarm:true},
 dustling:{name:'煤球小怪',hp:15,speed:185,range:60,radius:32,windup:.4,damage:4,cd:1.3,behavior:'melee',size:45,xp:1,flank:.48,lead:.35,bodyRadius:13,contactDamage:1.5,swarm:true},
 gnat:{name:'血针飞蛾',hp:12,speed:215,range:180,radius:25,windup:.46,damage:3,cd:1.8,behavior:'dash',size:42,xp:1,lead:.3,flank:.25,chargeSpeed:470,chargeRange:205,bodyRadius:11,contactDamage:1,swarm:true},
 goblin:{name:'哥布林',hp:45,speed:145,range:95,radius:60,windup:.52,damage:12,cd:1.7,behavior:'melee',size:88,xp:1,flank:.34,lead:.2,bodyRadius:21,contactDamage:4},
 mushroom:{name:'重锤菇',hp:97,speed:58,range:108,radius:90,windup:.7,damage:24,cd:2.15,behavior:'melee',size:126,xp:2,bodyRadius:30,contactDamage:7},
 slime:{name:'弹跳史莱姆',hp:60,speed:82,range:290,radius:75,windup:.85,damage:16,cd:2.5,behavior:'leap',size:65,xp:1,lead:.65,scatter:30,bodyRadius:19,contactDamage:4},
 bat:{name:'尖啸蝠',hp:30,speed:208,range:290,radius:42,windup:.55,damage:10,cd:1.8,behavior:'dash',size:76,xp:1,lead:.45,flank:.2,chargeSpeed:650,chargeRange:340,bodyRadius:17,contactDamage:3},
 wolf:{name:'疾奔狼',hp:66,speed:190,range:390,radius:54,windup:.7,damage:19,cd:2.5,behavior:'dash',size:80,xp:2,lead:.65,flank:.35,chargeSpeed:760,chargeRange:480,bodyRadius:20,contactDamage:6},
 skeleton:{name:'骷髅弓手',hp:45,speed:88,range:370,radius:35,windup:.75,damage:14,cd:2.1,behavior:'ranged',size:94,xp:2,lead:.95,flank:.4,bodyRadius:18,contactDamage:3},
 shaman:{name:'林地萨满',hp:70,speed:62,range:270,radius:110,windup:1,damage:10,cd:3.2,behavior:'healer',size:100,xp:3,bodyRadius:23,contactDamage:4},
 spider:{name:'毒囊蛛',hp:54,speed:132,range:340,radius:90,windup:.95,damage:8,cd:3,behavior:'poison',size:66,xp:2,lead:.8,scatter:45,flank:.5,bodyRadius:18,contactDamage:3},
 beetle:{name:'铁甲虫',hp:125,speed:47,range:95,radius:70,windup:.85,damage:22,cd:2.5,behavior:'armored',size:95,xp:3,bodyRadius:25,contactDamage:6},
 wisp:{name:'火灵',hp:48,speed:118,range:360,radius:60,windup:.8,damage:12,cd:2.7,behavior:'burst',size:78,xp:2,lead:.9,scatter:24,flank:.4,bodyRadius:18,contactDamage:3},
};
export const enemyDef=e=>e.stats||(e.boss?BOSS_DEF:ENEMIES[e.kind]||ENEMIES.goblin);
