// Each late conversion has a distinct source and cost; the core never supplies a recipe part.
export const CLASS_COMPONENTS={
 guardRelease:{role:'warrior',title:'盾震释放',icon:'shield',quality:'uncommon',tag:'转换',desc:'E 消耗已有蓄能；没有蓄能时消耗当前护盾的 40%，向前释放震波，倍率 0.65 / 0.85 / 1.05'},
 rageEdge:{role:'warrior',title:'怒刃加段',icon:'spin',quality:'uncommon',tag:'转换',desc:'普攻积怒；E 每 30 怒追加一段旋刃，最多 3 段；强化提高每段强度'},
 woundCashout:{role:'warrior',title:'伤口兑现',icon:'sword',quality:'rare',tag:'转换',desc:'E 首次命中兑现本人流血剩余伤害的 35 / 45 / 55%，消耗同等余血，不重复兑现'},
 battleRhythm:{role:'warrior',title:'浴血节律',icon:'focus',quality:'uncommon',tag:'回收',desc:'每 3 轮直接命中本人流血目标，返还 E 冷却 0.3 / 0.45 / 0.6 秒；受统一返还预算限制'},
 emberConsume:{role:'mage',title:'余火兑现',icon:'fire',quality:'uncommon',tag:'转换',desc:'火球命中消耗本人剩余燃烧的 35 / 45 / 55%，转为直接爆发，不附赠传播'},
 iceFragments:{role:'mage',title:'碎晶转换',icon:'frost',quality:'uncommon',tag:'转换',desc:'冰枪击中本人脆弱后消耗脆弱并发出 3 枚终结弹片，弹片倍率 22 / 28 / 34%'},
 frostReturn:{role:'mage',title:'碎霜回路',icon:'frost',quality:'rare',tag:'回收',desc:'本人碎晶每次施法最多为 2 / 3 / 4 个目标补一层寒意；碎晶不再次产生碎晶'},
 fieldFocus:{role:'mage',title:'霜场共鸣',icon:'focus',quality:'uncommon',tag:'站位',desc:'站在自己的寒潮或霜轨里，每秒返还 Q 冷却 0.18 / 0.24 / 0.3 秒；离场失效'},
 markCashout:{role:'archer',title:'猎印兑现',icon:'pierce',quality:'uncommon',tag:'转换',desc:'Q 贯穿命中消耗个人猎印，每层追加 18 / 24 / 30%；不由副箭消耗'},
 markTransfer:{role:'archer',title:'追猎转印',icon:'pierce',quality:'rare',tag:'转移',desc:'本人标记目标死亡，把最多 2 / 3 / 4 层未消耗猎印转给附近敌人；无尾刀要求'},
 weakpoint:{role:'archer',title:'破绽窗口',icon:'focus',quality:'uncommon',tag:'交替',desc:'Q 一次消耗至少 3 印后，下一轮普攻获得 30 / 45 / 60% 强化；4 秒过期'},
 volleyCharge:{role:'archer',title:'齐射蓄势',icon:'fan',quality:'common',tag:'来源',desc:'每轮普攻积 12 齐射能量，满 60 时下一轮普攻追加 25 / 35 / 45% 双箭；延迟协射可用 E 消耗'},
 delayedVolley:{role:'archer',title:'延迟协射',icon:'fan',quality:'uncommon',tag:'转换',desc:'E 消耗 60 齐射能量，0.23 秒后再发 40 / 50 / 60% 齐射；只有一次，不能复制自身'},
 shadowReturn:{role:'archer',title:'移影回收',icon:'dodge',quality:'uncommon',tag:'回收',desc:'残影协射后 2 秒内闪避离开原位，返还 E 冷却 0.4 / 0.6 / 0.8 秒；每次协射只回收一次'},
};
// Every route has two explicit complementary recipes. A recipe needs both pieces,
// at least one at rank II, and active III. A component may not count twice.
export const ROUTES={
 aegis:{role:'warrior',slot:0,form:'aegis',core:'bulwark',recipes:[['storage','guardRelease'],['guard','guardRelease']],support:['guard','storage','thorns'],branches:['bastion','breach']},
 bloodspin:{role:'warrior',slot:1,form:'bloodspin',core:'berserker',recipes:[['rageEdge','battleRhythm'],['blood','woundCashout']],support:['woundCashout','battleRhythm','harvest'],branches:['roving','anchored']},
 inferno:{role:'mage',slot:0,form:null,core:'pyromancer',recipes:[['ember','emberConsume'],['emberConsume','detonate']],support:['ember','detonate','echo'],branches:['wildfire','molten']},
 icelance:{role:'mage',slot:0,form:'icelance',core:'frostweaver',recipes:[['chill','iceFragments'],['iceFragments','frostReturn']],support:['frostReturn','fieldFocus','shatter'],branches:['crystal','frostrail']},
 markedshot:{role:'archer',slot:0,form:'markedshot',core:'sniper',recipes:[['markCashout','markTransfer'],['markCashout','weakpoint']],support:['markTransfer','weakpoint','focus'],branches:['execution','pursuit']},
 shadowvolley:{role:'archer',slot:1,form:'shadowvolley',core:'ranger',recipes:[['volleyCharge','delayedVolley'],['afterimage','shadowReturn']],support:['afterimage','shadowReturn','delayedVolley'],branches:['garrison','skirmish']},
};
export const BRANCHES={
 bastion:{title:'守阵',desc:'盾阵持续 2 秒，守阵时附近队友获得少量盾；保持原地，E 盾震不推进'},
 breach:{title:'破阵',desc:'盾阵缩短至 0.65 秒；结束清空自己的盾与蓄能，向前突进并震荡，失去留守防护'},
 roving:{title:'游击旋刃',desc:'轮斩缩短为 3 段，结束沿移动方向投出追击旋刃，保留机动但降低贴身持续伤害'},
 anchored:{title:'驻留风暴',desc:'轮斩 8 段，后段逐渐扩大并增强；移动速度降为 35%，闪避提前结束不返还'},
 wildfire:{title:'蔓延火种',desc:'火球爆炸传播薄火种到附近敌人，单目标伤害降低 20%；传播不再次自动引爆'},
 molten:{title:'熔核穿心',desc:'火球集中命中目标并加速兑现余火，范围缩为 55%，不生成地面火区'},
 crystal:{title:'碎晶扇阵',desc:'冰枪碎裂发出 7 枚扇形碎晶，每片伤害降低；适合清群，重复碎裂仍受限制'},
 frostrail:{title:'霜轨',desc:'冰枪沿飞行方向留下 3 段持续霜轨积寒，碎片数降为 1；通过站位利用霜场共鸣'},
 execution:{title:'孤立处刑',desc:'重箭蓄力 0.5 秒期间定身；对周围没有同伴的目标获得 65% 额外伤害'},
 pursuit:{title:'追猎',desc:'重箭击破目标把已消耗的部分印转移至附近敌人；单箭伤害降低 15%，每箭只转移一次'},
 garrison:{title:'阵地残影',desc:'残影持续 8 秒，最多协射两次；第一次闪避定下阵位，存在时不随再次闪避重建'},
 skirmish:{title:'游射残影',desc:'残影持续 2.8 秒，可通过闪避替换；协射后留一轮延迟轻箭，单次协射倍率降低'},
};
