import {EXTRA_SKILLS} from './skill-pairs.js';
import {CLASS_COMPONENTS} from './progression-data.js';
import {UNIVERSAL_PASSIVES,AWAKENINGS} from './universal-data.js';
// All rolls use the world's seeded RNG. Descriptions state the exact applied effect.
export const ATTRIBUTES = [
 {key:'power',title:'磨砺武器',desc:'基础普攻强度 +18%（同类加算）',icon:'sword'},
 {key:'hp',title:'坚韧之心',desc:'生命上限 +30，回复 30',icon:'heart'},
 {key:'speed',title:'轻盈步伐',desc:'移动速度 +8%（上限 +60%）',icon:'boot'},
 {key:'haste',title:'疾速攻击',desc:'普攻速度 +12%（上限 +100%）',icon:'fan'},
 {key:'crit',title:'精准打击',desc:'暴击率 +8%（上限 65%）',icon:'pierce'},
 {key:'critDamage',title:'致命锋芒',desc:'暴击伤害 +25%（基础 150%）',icon:'sword'},
 {key:'evasion',title:'灵巧直觉',desc:'受击闪避率 +5%（上限 35%）',icon:'dodge'},
 {key:'armor',title:'坚固护甲',desc:'减伤 +5%（上限 40%）',icon:'shield'},
 {key:'skill',title:'奥术专注',desc:'基础技能强度 +20%（同类加算）',icon:'focus'},
 {key:'dot',title:'异常研习',desc:'基础持续伤害强度 +20%（同类加算）',icon:'fire'},
 {key:'shield',title:'护盾增幅',desc:'基础护盾强度 +20%（同类加算）',icon:'shield'},
 {key:'cooldown',title:'快速咏唱',desc:'技能冷却缩短 8%（上限 40%）',icon:'frost'},
 {key:'range',title:'战场掌控',desc:'普攻与技能范围 +10%（上限 +50%）',icon:'spin'},
 {key:'recovery',title:'药草知识',desc:'药瓶回复 +20%，立即回复 25',icon:'heal'},
 {key:'pickup',title:'拾荒直觉',desc:'拾取范围 +20（基础 105，上限 225）',icon:'focus'},
];
export const PASSIVES = {
 ember:{title:'余烬',icon:'fire',desc:'技能命中燃烧 3 秒，每秒 4 / 8 / 12 ×技能强度×持续伤害强度',tag:'燃烧'},
 chill:{title:'寒触',icon:'frost',desc:'命中减速 0.5 / 0.9 / 1.3 秒',tag:'控制'},
 blood:{title:'血刃',icon:'sword',desc:'暴击附加流血，每秒 5 / 10 / 15 ×来源攻击或技能强度×持续伤害强度',tag:'暴击'},
 momentum:{title:'疾风步',icon:'dodge',desc:'闪避后 3 秒内下次命中必暴，增伤 10 / 20 / 30%',tag:'闪避'},
 harvest:{title:'战地汲取',icon:'heart',desc:'参与击杀回复 3 / 6 / 9，每人实际治疗间隔 1 秒；Boss 每 8 轮命中半额回复（2 秒资格），共用治疗间隔',tag:'续航'},
 echo:{title:'协同回响',icon:'focus',desc:'参与击杀返还两个技能冷却 0.3 / 0.6 / 0.9 秒；Boss 每 8 轮命中返还半量，冷却 2 秒',tag:'循环'},
 chain:{title:'电弧',icon:'focus',desc:'每 4 轮直接攻击命中，向附近 1 / 2 / 3 敌人传导 35% 伤害；同轮多目标只计一次',tag:'连锁'},
 detonate:{title:'殉爆',icon:'fire',desc:'有本人燃烧的敌人死亡，爆炸伤害 12 / 24 / 36 ×技能强度×持续伤害强度；无需尾刀',tag:'燃烧'},
 shatter:{title:'碎冰',icon:'frost',desc:'对减速、冻结或脆弱敌人的直接伤害 +10 / 20 / 30%，Boss 脆弱也有效',tag:'控制'},
 thorns:{title:'荆棘甲',icon:'shield',desc:'受伤时向近身敌人反射承受伤害的 30 / 60 / 90%',tag:'反击'},
 guard:{title:'壁垒',icon:'shield',desc:'每次主动获得 8 / 16 / 24 ×护盾效能的护盾，总上限 120 ×护盾效能',tag:'护盾'},
 volley:{title:'分裂弹',icon:'fan',desc:'远程普攻额外 2 枚散射，副弹 18 / 28 / 38%（叠加风行副箭）',tag:'弹幕'},
 focus:{title:'处决',icon:'pierce',desc:'对生命低于 30% 的敌人增伤 20 / 40 / 60%',tag:'收割'},
 arcane:{title:'蓄能',icon:'focus',desc:'每次主动施放，使下一次普攻增伤 25 / 50 / 75%',tag:'交替'},
 storage:{title:'储能盾',icon:'shield',desc:'护盾吸收的 30 / 45 / 60% 存为蓄能；下次普攻消耗最多 15 蓄能，盾震释放可一次兑现',tag:'反击'},
 afterimage:{title:'残影记忆',icon:'dodge',desc:'闪避留 4 秒残影，E 协射为 25 / 40 / 55% 伤害；已有核心／形态残影则额外 +15 / 30 / 45 个百分点',tag:'协射'},
};
export const CORES={
 berserker:{role:'warrior',title:'狂战之血',icon:'sword',desc:'近战普攻积 14 怒（半血再 +6），满怒强化下一次普攻并消耗；追加轮斩需怒刃组件，承伤 +15%',tags:['blood','rageEdge','woundCashout']},
 bulwark:{role:'warrior',title:'不动壁垒',icon:'shield',desc:'Q 起手 0.55 秒正面迎击减伤，实际挡伤强化下一普攻 45%；无赠盾、蓄能与震波，普攻 -15%',tags:['guard','storage','guardRelease']},
 whirlwind:{role:'warrior',title:'刃舞连环',icon:'spin',desc:'每第 3 次普攻追加 70% 圆斩，但普攻 -10%',tags:['momentum','echo','chain']},
 pyromancer:{role:'mage',title:'燎原火种',icon:'fire',desc:'普攻点燃；余火兑现和死亡传播分别需要组件，不附赠引爆循环',tags:['ember','detonate','emberConsume']},
 frostweaver:{role:'mage',title:'极寒契约',icon:'frost',desc:'普攻 3 击冻敌 0.7 秒，Boss 改为脆弱 3 秒；本人脆弱直接伤害 +12%，碎片需独立组件',tags:['chill','shatter','iceFragments']},
 arcanist:{role:'mage',title:'奥术潮汐',icon:'focus',desc:'每第 3 次主动追加 60% 奥术脉冲；主动冷却 +15%',tags:['arcane','chain','echo']},
 sniper:{role:'archer',title:'狙猎誓约',icon:'pierce',desc:'普攻积个人猎印至 5 层，每层仅提高普攻 3%；Q 兑现需猎印兑现；换目标失去旧目标一半印',tags:['markCashout','markTransfer','weakpoint']},
 ranger:{role:'archer',title:'风行箭阵',icon:'fan',desc:'普攻带两支 35% 副箭，主箭 -15%；残影、能量及延迟协射分别取得',tags:['volleyCharge','afterimage','delayedVolley']},
 executioner:{role:'archer',title:'血影猎手',icon:'sword',desc:'暴击必流血；本人流血目标死亡回复 8 生命，实际治疗间隔 1 秒；技能冷却 +15%',tags:['blood','harvest','focus']},
};
export const RUNES={wide:{title:'扩域',desc:'该主动范围 +25%，冷却 +15%'},force:{title:'重击',desc:'该主动伤害 +30%，冷却 +20%'},quick:{title:'速发',desc:'该主动冷却 -25%，伤害 -15%'}};
export const ACTIVE = {
 warrior:[{type:'bash',title:'盾冲',icon:'shield',need:'echo',evolved:'破阵冲锋',detail:'冲锋伤害 36 / 48 / 60；进化：距离 +30%，命中返还冷却'},
          {type:'spin',title:'旋风斩',icon:'spin',need:'momentum',evolved:'疾风龙卷',detail:'圆形斩击 38 / 51 / 64；进化：额外两次旋斩'}],
 mage:[{type:'fireball',title:'火球',icon:'fire',need:'ember',evolved:'烈焰新星',detail:'爆炸伤害 42 / 56 / 70；进化：爆炸范围 +50%，留下火区'},
       {type:'frost',title:'冰霜环',icon:'frost',need:'chill',evolved:'极寒领域',detail:'范围伤害 23 / 31 / 39；进化：冻结 1.5 秒，伤害 +50%'}],
 archer:[{type:'pierce',title:'贯穿箭',icon:'pierce',need:'blood',evolved:'裂魂穿刺',detail:'穿透伤害 45 / 60 / 75；进化：每次命中额外 +25% 暴击率'},
         {type:'fan',title:'散射',icon:'fan',need:'echo',evolved:'回响箭雨',detail:'扇射 5 箭，每箭 20 / 27 / 34；进化：延迟再发一轮'}],
};
for(const role of Object.keys(ACTIVE))ACTIVE[role].push(...EXTRA_SKILLS[role]);
export const FORMS={
 aegis:{key:'aegis',role:'warrior',slot:0,title:'迎击盾阵',icon:'shield',tags:['melee','shield','counter'],desc:'原地正面盾阵持续 0.9 秒，获得 50 护盾；替换盾冲，不再位移',evolution:'盾阵持续 1.2 秒，入阵护盾提高至 75，受护盾效能加成'},
 bloodspin:{key:'bloodspin',role:'warrior',slot:1,title:'血刃旋风',icon:'spin',tags:['melee','bleed','area'],desc:'边移动边连续轮斩 5 次，以多段近战维持伤口；轮斩不提供无敌',evolution:'连续轮斩由 5 次增加至 6 次'},
 icelance:{key:'icelance',role:'mage',slot:0,title:'冰晶长矛',icon:'frost',tags:['spell','frost','pierce'],desc:'火球改为冰系直线穿透并积寒；碎冰弹片需碎晶转换组件',evolution:'碎晶扇射或留下一条可站位的霜轨'},
 coldfield:{key:'coldfield',role:'mage',slot:1,title:'寒潮领域',icon:'frost',tags:['spell','frost','area'],desc:'冰霜环改为持续 3.6 秒的冰场；围绕场地积寒意，敌人可走出范围',evolution:'冰场持续时间由 3.6 秒增加至 5 秒'},
 markedshot:{key:'markedshot',role:'archer',slot:0,title:'穿甲重箭',icon:'pierce',tags:['projectile','mark','pierce'],desc:'较长前摇换高伤贯穿；普攻积 3 层个人猎印，狙猎核心可积 5 层，主动兑现需独立组件',evolution:'原地处刑或击破转印追猎'},
 shadowvolley:{key:'shadowvolley',role:'archer',slot:1,title:'影身齐射',icon:'fan',tags:['projectile','shadow','dodge'],desc:'闪避留下一个 4 秒残影；E 与残影协射，残影基础伤害为本体的 45%',evolution:'残影首次协射 0.2 秒后再射一轮；不能继续复制残影'},
};


Object.assign(PASSIVES, CLASS_COMPONENTS, UNIVERSAL_PASSIVES);
export {formInfo,evolutionText,skillName,shuffle,attributePool,skillPool,rollSkills,rollReshape,applyReward,evolutionStatus,routeFor,buildMaturity,replacementImpacts} from './build-progression.js';
export {AWAKENINGS};
