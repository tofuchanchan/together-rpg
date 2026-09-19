export const ENEMIES={
 goblin:{name:'哥布林',hp:45,speed:85,range:75,radius:57,windup:.52,damage:12,cd:1.7,behavior:'melee',size:88,xp:1},
 mushroom:{name:'重锤菇',hp:97,speed:58,range:108,radius:90,windup:.7,damage:24,cd:2.15,behavior:'melee',size:126,xp:2},
 slime:{name:'弹跳史莱姆',hp:60,speed:57,range:180,radius:65,windup:.85,damage:16,cd:2.5,behavior:'leap',size:65,xp:1},
 bat:{name:'尖啸蝠',hp:30,speed:130,range:125,radius:44,windup:.5,damage:10,cd:1.5,behavior:'dash',size:76,xp:1},
 wolf:{name:'疾奔狼',hp:66,speed:103,range:230,radius:57,windup:.8,damage:19,cd:2.4,behavior:'dash',size:80,xp:2},
 skeleton:{name:'骷髅弓手',hp:45,speed:65,range:340,radius:35,windup:.75,damage:14,cd:2.1,behavior:'ranged',size:94,xp:2},
 shaman:{name:'林地萨满',hp:70,speed:62,range:270,radius:110,windup:1,damage:10,cd:3.2,behavior:'healer',size:100,xp:3},
 spider:{name:'毒囊蛛',hp:54,speed:80,range:260,radius:75,windup:.95,damage:8,cd:3,behavior:'poison',size:66,xp:2},
 beetle:{name:'铁甲虫',hp:125,speed:47,range:95,radius:70,windup:.85,damage:22,cd:2.5,behavior:'armored',size:95,xp:3},
 wisp:{name:'火灵',hp:48,speed:77,range:290,radius:60,windup:.8,damage:12,cd:2.7,behavior:'burst',size:78,xp:2},
};
export const enemyDef=e=>ENEMIES[e.kind]||ENEMIES.goblin;
