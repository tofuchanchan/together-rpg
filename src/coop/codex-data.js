import {BONUS_RULES,BONUS_CREATURES} from './bonus-events.js';
import {SKILL_PAIRS} from './skill-pairs.js';
import {ACTIVE,ATTRIBUTES,CORES,FORMS,PASSIVES} from './builds.js';
import {CLASS_COMPONENTS,ROUTES,BRANCHES} from './progression-data.js';
import {UNIVERSAL_PASSIVES,AWAKENINGS} from './universal-data.js';
import {EQUIPMENT_APPEARANCES,EQUIPMENT_AFFIXES,EQUIPMENT_RARITIES,equipmentPrice} from './equipment-data.js';
import {ENEMIES,ENEMY_PROGRESS} from './enemies.js';
import {RARITIES,AFFIXES,BOSS_DEF} from './encounters.js';
import {BOSS_SKILLS} from './boss.js';
import {HERO_ROLES} from './recruitment.js';
import {XP_CHANCE,XP_VALUE,GOLD_CHANCE,GOLD_VALUE,POTION_CHANCE} from './loot.js';
import {ENRAGE} from './enemy-tactics.js';

// This catalogue reads the live definitions. It never creates a World, consumes
// seeded randomness, unlocks rewards, or writes into a definition object.
export const CODEX_CATEGORIES=Object.freeze([
 Object.freeze({id:'skills',name:'技能与构筑',description:'职业、主动、形态、流派核心、组件与觉醒。'}),
 Object.freeze({id:'equipment',name:'武器与防具',description:'外观、随机词条与品质；同一外观可以有不同属性。'}),
 Object.freeze({id:'monsters',name:'怪物与首领',description:'攻击方式、应对方法、稀有度与怪物词条。'}),
]);
const roleName=role=>HERO_ROLES[role]?.name||'全职业';
const section=(title,...lines)=>({title,lines:lines.flat().filter(Boolean)});
const icon=key=>({type:'icon',key});
const skillIcon=key=>icon(key);
const passiveId=key=>`passive:${key}`;
const activeId=(role,slot)=>`active:${role}:${slot}`;
const formId=key=>`form:${key}`;
const pct=n=>`${+(n*100).toFixed(2)}%`;
const tagNames={pet:'召唤',attack:'普攻',cast:'施法',dodge:'闪避',mark:'猎印',fire:'燃烧',frost:'寒霜',projectile:'弹道',chain:'连锁',melee:'近战',move:'移动',area:'范围',shield:'护盾',counter:'反击',pickup:'拾取',sustain:'续航',bleed:'流血',shadow:'残影',spell:'法术',pierce:'穿透'};
const tagsFor=tags=>(tags||[]).map(tag=>tagNames[tag]||tag);
const qualityName={common:'普通',uncommon:'精良',rare:'稀有',legendary:'传奇'};
const entries=[];
const add=entry=>entries.push({role:'all',tags:[],sections:[],relatedIds:[],...entry});
const passiveNames=keys=>keys.map(key=>PASSIVES[key].title).join(' + ');

const roleNotes={
 warrior:['近战自动挥斩；盾冲与踩踏组成控制路线，旋风斩与剑气斩组成范围攻击路线。','四个基础技能中装备两个；配对技能 II 解锁独立进阶候选，双进阶 III 与对应组件 II 才能竞争精通。'],
 mage:['远程自动发射法弹；奥术弹幕与星轨法球构成追踪弹群，火球与冰霜环构成冰火场地配合。','四选二；奥术依赖星轨站位，冰火通过本人寒意与灼烧联动。进阶与精通仍需随机奖励。'],
 archer:['远程自动射箭；贯穿箭与钉穿箭封锁直线，散射与箭雨覆盖敌群。','四选二；贯星路线依靠钉住目标后贯穿分裂，箭幕路线通过雨区内命中追加落箭。'],
};
for(const [role,definition] of Object.entries(HERO_ROLES)){
 add({id:`role:${role}`,category:'skills',kind:'role',role,name:definition.name,summary:roleNotes[role][0],tags:[definition.name,'自动普攻','闪避'],art:{type:'hero',role},
  sections:[section('初始能力',`生命 ${definition.hp} · 基础普攻 ${definition.damage} · 普攻间隔 ${definition.interval} 秒`,`移动速度 ${definition.speed} · 普攻索敌范围 ${definition.range}（世界距离）`,role==='warrior'?'战士挥斩实际命中半径为 205，索敌范围与伤害判定范围不同。':null,'普通攻击自动进行；玩家控制移动、主动技能和闪避。','开局没有主动、核心、被动或装备；通过局内奖励逐步构筑。'),section('闪避与成长','闪避距离124，基础冷却0.85秒，起手0.15秒无敌；方向由移动输入决定，仍受墙体阻挡。',roleNotes[role][1],'升级选择属性；清波奖励选择技能。技能与属性成长分开。')],
  relatedIds:[...ACTIVE[role].map((_,slot)=>activeId(role,slot)),...Object.entries(CORES).filter(([,core])=>core.role===role).map(([key])=>`core:${key}`)]});
 for(const [slot,definition] of ACTIVE[role].entries()){
  const routes=Object.values(ROUTES).filter(route=>route.role===role&&route.slot===slot&&!route.form),pair=Object.values(SKILL_PAIRS).find(p=>p.role===role&&p.slots.includes(slot));
  add({id:activeId(role,slot),category:'skills',kind:'active',role,name:definition.title,summary:definition.detail.split('；')[0],tags:[definition.name||roleName(role),'Q 技能','E 技能','主动'],art:skillIcon(definition.icon),
   sections:[section('基础效果',definition.detail.split('；')[0],role==='mage'&&slot===0?'所列为直接命中目标的基础伤害；周围溅射为该次火球基础伤害的 65%，各目标另计算增伤与减伤。':null,`基础冷却 ${HERO_ROLES[role].cd[slot]} 秒；受冷却属性与部分核心影响。`),section('获得与强化','每职业四个基础技能，任意装备两个，按 Q/E 或 X/Y 使用；清波习得，最多强化至 III。','强化等级与改换形态分别选择；改换形态保留等级。',`配对进阶：${pair.slots.map(s=>ACTIVE[role][s].title+' II').join(' + ')}；第8次清波起随机出现，进阶与旧形态互斥。`,'商店技艺卷轴可补充技能等级、被动、进阶或精通；仍需满足对应条件。')],
   relatedIds:[`advance:${role}:${slot}`,...Object.entries(FORMS).filter(([,form])=>form.role===role&&form.slot===slot).map(([key])=>formId(key)),...routes.flatMap(route=>route.branches.map(branch=>`evolution:${branch}`))]});
 }
}

for(const [key,pair] of Object.entries(SKILL_PAIRS)){
 for(const [index,slot] of pair.slots.entries())add({id:'advance:'+pair.role+':'+slot,category:'skills',kind:'advance',role:pair.role,name:pair.advances[index],summary:pair.descs[index],tags:['配对进阶',pair.title],art:skillIcon(ACTIVE[pair.role][slot].icon),sections:[section('解锁条件',pair.slots.map(s=>ACTIVE[pair.role][s].title+' II').join(' + '),'两项均装备；对应技能不能已有旧形态或进化。第8次清波起进入随机候选，领取只进阶一项技能，不自动获得另一项。'),section('后续精通',pair.mastery)],relatedIds:[...pair.slots.map(s=>activeId(pair.role,s)),'mastery:'+key]});
 add({id:'mastery:'+key,category:'skills',kind:'mastery',role:pair.role,name:pair.title,summary:pair.mastery,tags:['组合精通','后期构筑'],art:skillIcon(ACTIVE[pair.role][pair.slots[0]].icon),sections:[section('精通条件','两个技能均为进阶 III，'+PASSIVES[pair.component].title+' II；第16次清波起随机出现，仍需单独领取。','满足条件后也可从商店技艺卷轴购买；每人进店刷新 5 份技艺，每买一份其余技艺按基础价加价 35%，刷新保留加价。替换技能或丢失必要组件后精通暂停。'),section('战斗效果',pair.mastery)],relatedIds:[...pair.slots.map(s=>'advance:'+pair.role+':'+s),passiveId(pair.component)]});
}
const coreRequirements={bulwark:'需要已习得 Q 盾冲或其形态。',arcanist:'需要至少一个已习得的主动。',executioner:'需要暴击率大于 0，或持有疾风步。'};
for(const [key,definition] of Object.entries(CORES))add({id:`core:${key}`,category:'skills',kind:'core',role:definition.role,name:definition.title,summary:definition.desc,tags:[roleName(definition.role),'职业核心'],art:icon(definition.icon),
 sections:[section('核心效果',definition.desc),section('获得条件','完成第 3 次清波奖励起进入候选池；每人只有一个核心槽。',coreRequirements[key]||'无额外技能来源要求。','核心只改变战斗规则，不附赠配方组件；有配套也不保证后续抽到组件。')],relatedIds:definition.tags.map(passiveId)});

for(const [key,definition] of Object.entries(FORMS)){
 const route=Object.values(ROUTES).find(route=>route.form===key);
 add({id:formId(key),category:'skills',kind:'form',role:definition.role,name:definition.title,summary:definition.desc,tags:[roleName(definition.role),'技能形态',...tagsFor(definition.tags)],art:icon(key),
  sections:[section('形态效果',definition.desc),section('选择条件',`已习得 ${ACTIVE[definition.role][definition.slot].title} I；对应主动尚未改换形态或进化。`,'替换同槽基础主动，保持当前等级；每个主动只能持有一个形态。',route?'进化需要独立配方与 III 级主动，见相关条目。':'当前版本此形态没有可抽取的后续进化分支。')],
  relatedIds:[activeId(definition.role,definition.slot),...(route?route.branches.map(branch=>`evolution:${branch}`):[])]});
}

for(const [routeKey,route] of Object.entries(ROUTES))for(const branch of route.branches){
 const definition=BRANCHES[branch],source=route.form?FORMS[route.form]:ACTIVE[route.role][route.slot];
 add({id:`evolution:${branch}`,category:'skills',kind:'evolution',role:route.role,name:definition.title,summary:definition.desc,tags:[roleName(route.role),'进化',source.title],art:icon(route.form||routeKey),
  sections:[section('进化效果',definition.desc),section('必需配方',`${source.title} III，且当前槽未进化。`,...route.recipes.map((keys,index)=>`路线 ${index+1}：${passiveNames(keys)}；两件均持有，至少一件达到 II。`),'满足任意一套配方即可进入随机候选；同槽两条进化分支互斥。',`职业核心「${CORES[route.core].title}」可提供配合，但不是进化门槛。`)],
  relatedIds:[route.form?formId(route.form):activeId(route.role,route.slot),...new Set(route.recipes.flat().map(passiveId)),`core:${route.core}`,...route.branches.filter(key=>key!==branch).map(key=>`evolution:${key}`)]});
}

// Requirements below describe the actual selection gates in build-progression
// and universal-data; references point to playable sources, never legacy runes.
const passiveRequirements={
 ember:['需要至少一个已习得的主动。',[]],guard:['需要至少一个已习得的主动。',[]],arcane:['需要至少一个已习得的主动。',[]],echo:['需要至少一个已习得的主动。',[]],
 blood:['需要暴击率大于 0，或持有疾风步。',['passive:momentum','attribute:crit']],
 detonate:['需要本人的燃烧来源，例如余烬配合主动，或燎原火种。',['passive:ember','core:pyromancer']],
 shatter:['需要本人的寒霜来源，例如寒触、极寒契约、冰霜环或冰晶长矛。',['passive:chill','core:frostweaver','active:mage:1','form:icelance']],
 storage:['需要本人的护盾来源，例如壁垒配合主动、迎击盾阵、血珀收容器，或咏唱护壁装备配合主动。',['passive:guard','form:aegis','passive:bloodAmber','affix:spellWard']],
 afterimage:['仅弓手；需要已习得 E。',['active:archer:1','form:shadowvolley']],
 volley:['仅法师、弓手的远程普攻有效；战士不会抽到。',[]],
 guardRelease:['需要护盾来源，且已习得 E。',['passive:guard','passive:storage','form:aegis','active:warrior:1']],
 rageEdge:['需要已习得 E。',['active:warrior:1','form:bloodspin']],
 woundCashout:['需要本人流血来源，且已习得 E；例如血刃配合暴击，或血刃旋风。',['passive:blood','form:bloodspin']],
 battleRhythm:['需要本人流血来源，且已习得 E。',['passive:blood','form:bloodspin']],
 emberConsume:['需要本人燃烧来源，且 Q 仍为已习得的基础火球。',['passive:ember','core:pyromancer','active:mage:0']],
 iceFragments:['需要 Q 已改为冰晶长矛。',['form:icelance']],
 frostReturn:['需要持有碎晶转换。',['passive:iceFragments']],
 fieldFocus:['需要寒潮领域形态，或已进化的霜轨。',['form:coldfield','evolution:frostrail']],
 markCashout:['需要猎印来源，且已习得 Q；猎印来源为狙猎誓约或穿甲重箭。',['core:sniper','form:markedshot']],
 markTransfer:['需要猎印来源：狙猎誓约或穿甲重箭。',['core:sniper','form:markedshot']],
 weakpoint:['需要持有猎印兑现。',['passive:markCashout']],
 delayedVolley:['需要持有齐射蓄势，且已习得 E。',['passive:volleyCharge','active:archer:1']],
 shadowReturn:['需要残影来源，且已习得 E；来源为残影记忆或影身齐射。',['passive:afterimage','form:shadowvolley']],
 paperCrow:['需要至少一个已习得的主动。',[]],stepCircuit:['需要至少一个已习得的主动。',[]],returnSign:['需要至少一个已习得的主动。',[]],riskEcho:['需要至少一个已习得的主动。',[]],supplyPack:['需要至少一个已习得的主动。',[]],echoPosts:['需要至少一个已习得的主动。',[]],
 homeBell:['需要可用宠物来源；群巢号角后不可选。荆棘堡垒后还需灵骨哨或可施法的纸鸦符。',['passive:boneWhistle','passive:paperCrow','passive:shieldBrood']],
 commandWhistle:['需要可用宠物来源，例如灵骨哨、纸鸦符配合主动，或碎盾荆种配合护盾。',['passive:boneWhistle','passive:paperCrow','passive:shieldBrood']],
 homeGift:['需要可用宠物来源；群巢号角后不可选。',['passive:boneWhistle','passive:paperCrow','passive:shieldBrood']],
 elementFeed:['需要可用宠物来源，且有本人的燃烧或寒霜来源。',['passive:boneWhistle','passive:paperCrow','passive:ember','passive:chill']],
 refractLens:['需要袖珍弹匣；与回旋弹芯互斥。',['passive:needleMagazine','passive:returnCore']],
 returnCore:['需要袖珍弹匣；与折射镜片互斥。',['passive:needleMagazine','passive:refractLens']],
 shieldBrood:['需要可用的本人护盾来源；例如壁垒配合主动、血珀收容器、迎击盾阵，或咏唱护壁装备配合主动。',['passive:guard','passive:bloodAmber','form:aegis','affix:spellWard']],
 healingWave:['需要战地汲取，或血影猎手配合实际可用的流血来源；单靠捡药瓶不会进入候选。',['passive:harvest','core:executioner','passive:blood']],
 transferNeedle:['需要至少一个主动，且有至少一种本人异常来源：燃烧、寒霜或流血。',['passive:ember','passive:chill','passive:blood']],
 mixedFuse:['需要至少一个主动，且有至少两种本人异常来源：燃烧、寒霜、流血三选二。',['passive:ember','passive:chill','passive:blood']],
 duetMeter:['需要 Q、E 都已习得。',[]],
};
for(const [key,definition] of Object.entries(PASSIVES)){
 const roles=key==='volley'?['mage','archer']:[definition.role||(key==='afterimage'?'archer':'all')];
 for(const role of roles){
  const requirement=passiveRequirements[key]||['无额外来源前置。',[]];
  add({id:key==='volley'?`passive:${key}:${role}`:passiveId(key),category:'skills',kind:'passive',role,name:definition.title,summary:definition.desc,tags:[definition.tag,...tagsFor(definition.tags),CLASS_COMPONENTS[key]?'职业组件':UNIVERSAL_PASSIVES[key]?'通用组件':'被动',...(definition.quality?[qualityName[definition.quality]]:[])].filter(Boolean),art:icon(definition.icon),
   sections:[section('效果',definition.desc),section('选择条件',requirement[0],`最高 III 级；与其他被动共用四个槽位。${role==='all'?'所有职业均可在前置满足时选择。':''}`,'满槽可替换一件已有被动，也可保留构筑并放弃本次清波奖励；拆掉来源可能使配套失效。')],relatedIds:requirement[1]});
 }
}

const awakeningRecipes={
 hiveHorn:{recipes:[['boneWhistle','commandWhistle'],['boneWhistle','elementFeed'],['paperCrow','commandWhistle'],['paperCrow','elementFeed']],extra:'需要至少一个已习得的主动。'},
 starMagazine:{recipes:[['needleMagazine','refractLens'],['needleMagazine','returnCore']]},
 movingMinefield:{recipes:[['mineShoes','returnSign'],['mineShoes','scavengeSigil']]},
 thornFortress:{recipes:[['guard','shieldBrood'],['bloodAmber','shieldBrood']]},
 starDelivery:{recipes:[['magnetAstrolabe','supplyPack']]},
 corrosionEngine:{recipes:[['mixedFuse','ember'],['mixedFuse','chill'],['mixedFuse','blood']],extra:'还需要至少两种本人异常来源。'},
};
for(const [key,definition] of Object.entries(AWAKENINGS)){
 const recipe=awakeningRecipes[key];
 add({id:`awakening:${key}`,category:'skills',kind:'awakening',name:definition.title,summary:definition.desc,tags:['通用','觉醒','规则转换'],art:icon(definition.icon),
  sections:[section('觉醒效果',definition.desc),section('必需配方',...recipe.recipes.map(keys=>passiveNames(keys)), '上述任意一组两件均持有，至少一件达到 II。',recipe.extra),section('获得时机','第 19 次清波奖励起，仅高阶奖励有机会出现，例如第 10 关首领奖励。','每人只有一个觉醒槽；不同觉醒互斥。满足配方不会自动觉醒，也不保证抽中。')],relatedIds:[...new Set(recipe.recipes.flat().map(passiveId))]});
}
const cappedAttributes=new Set(['speed','haste','crit','evasion','armor','cooldown','range','pickup']);
for(const definition of ATTRIBUTES)add({id:`attribute:${definition.key}`,category:'skills',kind:'attribute',name:definition.title,summary:definition.desc,tags:['升级属性','全职业'],art:icon(definition.icon),
 sections:[section('属性效果',definition.desc),section('获得方式','拾取经验达到升级门槛后，从随机属性中选择；不占主动、核心或被动槽。',definition.key==='dot'?'需要已有本人燃烧或流血来源，才会进入属性候选。':definition.key==='shield'?'需要已有本人护盾来源，才会进入属性候选。':cappedAttributes.has(definition.key)?'达到训练上限后，不再进入该属性候选；装备提供的额外属性单独叠加。':'当前没有固定训练次数上限，后续仍可能抽到。')],relatedIds:definition.key==='dot'?['passive:ember','passive:blood']:definition.key==='shield'?['passive:guard','passive:bloodAmber']:[]});

const equipmentStats={
 warrior:{weapon:'普攻强度、攻击速度、暴击率',armor:'生命上限、减伤、移动速度、拾取范围'},
 mage:{weapon:'技能强度、普攻强度、冷却缩短',armor:'生命上限、减伤、移动速度、拾取范围'},
 archer:{weapon:'普攻强度、攻击速度、暴击率',armor:'生命上限、减伤、移动速度、拾取范围'},
};
const affixIcons={dodgeLoad:'dodge',spellWard:'shield',capacitor:'focus',piercingEdge:'pierce',trailSnare:'frost',panicMagnet:'magnet'};
for(const [role,slots] of Object.entries(EQUIPMENT_APPEARANCES))for(const [slot,appearances] of Object.entries(slots))for(const appearance of appearances){
 add({id:`equipment:${appearance.key}`,category:'equipment',kind:slot,role,name:appearance.name,summary:`${roleName(role)}专属${slot==='weapon'?'武器':'整套防具'}外观；品质、主属性和词条随机。`,tags:[roleName(role),slot==='weapon'?'武器':'全身防具','商店'],art:{type:'equipment',role,slot,style:appearance.key,key:appearance.key},
  sections:[section('外观与装备槽',slot==='weapon'?'替换手持武器外观；同职业不同武器外观不额外改写职业基础技能。':'从头到脚替换防具外观；防具只有一个整体槽位。','每名角色只能装备一件武器、一件防具；购买新装备会替换对应槽。'),section('随机属性',`主属性从 ${equipmentStats[role][slot]} 中随机一项。`,'同一外观可以出现普通、精良、稀有或传奇品质；外观不固定属性或词条。','名称显示品质和主属性词缀，例如「传奇·迅捷·林卫长弓」。关卡和品质影响属性数值、词条强度；同关卡更高品质的词条强度档位更高。'),section('购买规则','每 5 关进入个人商店，各自持有金币，刷新 5 件本职业装备、5 份符合条件的技艺、5 名随机职业佣兵。','可用自己的金币为自己或同职业 AI 购买，不能操作另一位玩家的库存。','可以花金币只刷新自己的商品与招募候选，连续刷新费用递增。')],
  relatedIds:[...Object.entries(EQUIPMENT_AFFIXES).filter(([,affix])=>affix.slot===slot).map(([key])=>`affix:${key}`),...EQUIPMENT_RARITIES.slice(1).map((_,index)=>`equipment-rarity:${index+1}`)]});
}
for(const [key,definition] of Object.entries(EQUIPMENT_AFFIXES))add({id:`affix:${key}`,category:'equipment',kind:'affix',name:definition.title,summary:definition.desc,tags:['随机词条',definition.slot==='weapon'?'武器':'防具','全职业'],art:icon(affixIcons[key]),
 sections:[section('词条效果',definition.desc),section('来源',`只出现在${definition.slot==='weapon'?'武器':'防具'}上，所有职业均有机会获得。`,'精良及以上装备随机携带；同一件装备不重复抽取同词条。','效果强度还受装备等级、品质和随机值影响；换下装备后该词条不再生效。')],relatedIds:[]});
for(const [rank,definition] of EQUIPMENT_RARITIES.entries())if(definition)add({id:`equipment-rarity:${rank}`,category:'equipment',kind:'equipment-rarity',name:`${definition.name}装备`,summary:`${definition.affixes} 条随机词条；品质越高，主属性与词条强度越高。`,tags:['装备品质',definition.name],art:icon(rank===4?'focus':'shield'),
 sections:[section('品质规则',`随机词条数量：${definition.affixes}。`,'武器与防具使用相同品质规则；品质不绑定任何外观。'),section('价格参考',`第 5 关商店基础售价：${equipmentPrice(rank,5)} 金币。`,`第 10 关商店基础售价：${equipmentPrice(rank,10)} 金币。`,`第 15 关商店基础售价：${equipmentPrice(rank,15)} 金币。`,'价格按关卡和品质计算，实际购买还需职业匹配。')],relatedIds:[]});

const enemyNotes={
 seedling:{summary:'数量多的低血量近战小怪，靠包围形成压力。',behavior:'靠近后短暂蓄力近战，接触也会造成伤害。',counter:'移动时留出退路，用范围攻击清出缺口。'},
 dustling:{summary:'比豆芽更快、更脆，会从侧面挤入阵型。',behavior:'快速近身并侧向走位，靠数量封住移动路线。',counter:'别只看正前方；优先清掉侧面封路的小群。'},
 gnat:{summary:'血量很低的冲刺小怪，以速度补上远程空隙。',behavior:'预判位置后直线冲刺，路径接触造成伤害。',counter:'看见冲刺预警后侧移；沿冲刺方向逃跑更容易被追上。'},
 goblin:{summary:'基础近战敌人，追击时会侧向包抄。',behavior:'接近后蓄力砍击，起手会按玩家移动做轻度预判。',counter:'在攻击预警落定后离开范围，再回身输出。'},
 mushroom:{summary:'行动缓慢、重击范围大的厚血近战怪。',behavior:'近距离蓄力重击；伤害高，攻击前摇也较长。',counter:'别贪最后一下；绕到锤击落点外再进攻。'},
 slime:{summary:'能够跃向远处目标的范围攻击怪。',behavior:'预判并扰动落点，跳到预警处造成范围伤害。',counter:'落点预警出现后改变方向，避免把队友一起带进落点。'},
 bat:{summary:'高速冲锋敌人，能迅速穿过空旷距离。',behavior:'沿锁定路径高速冲刺，障碍物会截停冲锋。',counter:'横向躲开冲刺线，利用障碍物切断路径。'},
 wolf:{summary:'冲撞距离长、速度快的追猎者。',behavior:'提前预测移动方向，长距离冲刺并造成路径伤害。',counter:'看到起手再侧闪，不要持续沿同一直线撤退。'},
 skeleton:{summary:'保持距离并预判射击的远程弓手。',behavior:'锁定预判位置后射出一支箭；贴近时会后退。',counter:'变向躲箭，接近时留心身后的近战怪。'},
 shaman:{summary:'治疗附近受伤怪物，是久战时应优先处理的支援目标。',behavior:'为 220 距离内有视线的最多 3 名受伤怪物各回复 22 生命，不能自疗，也不能治疗其他萨满；狂暴不加快治疗。',counter:'冻结或击晕可以打断施法；首次登场最多 1 只且最高精英，后续同场上限为小队人数。'},
 spider:{summary:'把预判区域变成毒地，迫使玩家离开安全站位。',behavior:'带落点散布的预判毒区持续 3.5 秒，留在区域内会连续受到攻击判定。',counter:'及时换位，避免在多个毒区之间失去退路。'},
 beetle:{summary:'正面硬壳能削减伤害，适合从侧后方处理。',behavior:'正面受击伤害减半；近身时发动重击。',counter:'绕到侧后方输出；不要被它挡住所有弹道。'},
 wisp:{summary:'保持距离的三向弹幕怪，能封住狭窄通路。',behavior:'预判目标后扇形发射三枚火弹。',counter:'从弹道空隙穿过，避免直线后退吃到中间火弹。'},
};
for(const [key,definition] of Object.entries(ENEMIES)){
 const notes=enemyNotes[key];
 add({id:`enemy:${key}`,category:'monsters',kind:'enemy',name:definition.name,summary:notes.summary,tags:[definition.swarm?'基础小怪':'特殊怪',({melee:'近战',dash:'冲刺',leap:'跳跃',ranged:'远程',healer:'治疗',poison:'毒区',armored:'护甲',burst:'弹幕'})[definition.behavior]],art:{type:'enemy',kind:key,key},
  sections:[section('出现进度',`${ENEMY_PROGRESS[key].group} · 第 ${ENEMY_PROGRESS[key].wave} 波起加入刷新池。`),section('攻击方式',notes.behavior),section('应对方式',notes.counter),section('基础数值',`生命 ${definition.hp} · 移动速度 ${definition.speed}${key==='shaman'?' · 主动为范围治疗':` · 主动攻击伤害 ${definition.damage}`}`,`碰撞伤害 ${definition.contactDamage} · 动作前摇 ${definition.windup} 秒 · 基础动作冷却 ${definition.cd} 秒`,'以上为物种原始基础值；前四波群怪有新手减压，实际数值另受波数、稀有度、词条和狂暴影响。',key==='shaman'?'治疗本身不会主动攻击玩家，但身体接触仍造成伤害。':'主攻击伤害是单次判定，范围、弹道、毒区和碰撞各有不同触发方式。'),section('掉落与成长','经验、金币、药瓶均掉在地上，需要拾取；怪物种类不决定固定经验值。','掉落数量与概率主要由稀有度决定；首领召唤物的经验概率降低，不掉金币与药瓶。')],relatedIds:RARITIES.map((_,rank)=>`enemy-rarity:${rank}`)});
}
for(const [key,definition] of Object.entries(BONUS_CREATURES))add({id:`bonus:${key}`,category:'monsters',kind:'bonus',name:definition.name,summary:key==='xp'?'限时大量涌出的无害幼虫，每次击杀必掉经验。':'快速逃跑的钱袋，不会死亡，每次受到有效攻击掉落一枚金币。',tags:['奖励怪','限时事件',key==='xp'?'经验怪':'金币怪'],art:{type:'enemy',kind:key==='xp'?'experienceGrub':'coinRunner',key:key==='xp'?'experienceGrub':'coinRunner'},sections:[section('出现规则','从第二次清波后的间歇开始抽取，经验怪潮、金币怪事件各有 5% 概率；首领波结束不触发。',`事件之间至少相隔 ${BONUS_RULES.cooldown} 次清波；不会计入新的清波，也不会额外发放技能奖励。`),section('行动与掉落',key==='xp'?`持续 ${BONUS_RULES.xp.duration} 秒，不断补充低血量、随机走动的幼虫；不攻击，不造成接触伤害，击杀必掉 1 点地面经验。`:`持续 ${BONUS_RULES.gold.duration} 秒，钱袋主动远离玩家，无法被击杀；普攻、技能、有效持续命中都会产生地面金币，需要真人各自拾取。`),section('计时与拾取',`暂停和升级选择时倒计时停止；结束后奖励怪离场，保留 ${BONUS_RULES.collectSeconds} 秒拾取时间。`,'随后继续下一波或本关结算，商店仍遵守每 5 关开放的规则。')],relatedIds:[]});
const bossSkillNotes={slam:'锁定目标脚下的圆形重锤，较长预警后落下。',barrage:'朝锁定方向扇射荆种，阶段越高弹数越多、弹速越快。',roots:'在所有存活队员脚下布置根刺；第二阶段起再追加侧面的延迟根刺。',summon:'召集哥布林与史莱姆；召唤数量随阶段增加，最多保有 18 名该首领的召唤物。',ultimate:'从中心向外连续引爆三圈，预警保留两条逃生通道；第二阶段起使用，第三阶段间隔缩短。'};
add({id:'boss:thornking',category:'monsters',kind:'boss',name:BOSS_DEF.name,summary:'每 10 关出现的三阶段首领，以重锤、弹幕、根刺、召集和荆冠天罚围猎小队。',tags:['首领','三阶段','大招'],art:{type:'enemy',kind:'thornking',key:'thornking'},
 sections:[section('出现与阶段','第 10、20 关出现；继续无尽后仍每 10 关出现。','生命降至 65% 进入第二阶段，降至 30% 进入第三阶段；后续阶段出招更紧凑。','首领生命按首领关卡单独设定，其他战斗数值仍随波数成长。'),section('五种技能',...Object.entries(BOSS_SKILLS).map(([key,name])=>`${name}：${bossSkillNotes[key]}`)),section('战术要点','技能开始蓄力后，预警位置不再跟随玩家；利用这段时间规划退路。','荆冠天罚从中心向外展开，及时选择留出的通道，避免站在相邻爆圈重叠处。','召唤物可能封路；在输出首领的同时清理撤退方向。'),section('首领掉落','击败首领必掉 24 经验、10 金币和一个基础回复 35 的药瓶；仍需实际拾取。')],relatedIds:['enemy:goblin','enemy:slime']});

for(const [rank,definition] of RARITIES.entries())add({id:`enemy-rarity:${rank}`,category:'monsters',kind:'enemy-rarity',name:`${definition.name}怪物`,summary:rank?`${rank} 个不重复随机词条，以${rank===1?'蓝':rank===2?'紫':'金'}色描边辨认。`:'没有稀有描边，不附加随机怪物词条。',tags:['稀有度',definition.name],art:icon(rank?'focus':'skull'),
 sections:[section('稀有加成',`生命基础倍率 ×${definition.mult}；另叠加波数成长与词条效果。`,`随机词条数量 ${rank}。稀有度还提高伤害和词条强度。`),section('普通击杀掉落',`经验：${pct(XP_CHANCE[rank])} 概率，${XP_VALUE[rank]} 点。`,`金币：${pct(GOLD_CHANCE[rank])} 概率，${GOLD_VALUE[rank]} 金币。`,`药瓶：${pct(POTION_CHANCE[rank])} 概率，基础回复 35。`,'三类掉落独立判定；前两波经验掉率至少85%，首领与其召唤物使用特殊规则。'),section('成长与狂暴','后期更容易遇到高稀有度、多词条组合。',`波次超时后，小怪狂暴：移速 ×${ENRAGE.speed}、伤害 ×${ENRAGE.damage}、攻击频率 ×${ENRAGE.attackRate}；首领本体不套用这些狂暴倍率。`)],relatedIds:Object.keys(AFFIXES).map(key=>`trait:${key}`)});
const traitNotes={
 vitality:['额外增加生命上限，稀有度越高增幅越大。','优先判断是否值得集火，避免长时间追逐它而被小怪围住。'],
 fury:['提高主动攻击和碰撞伤害，稀有度越高增幅越大。','保持退路，别用生命交换它的一整套攻击。'],
 haste:['提高移速并缩短攻击冷却，能更快追上移动中的玩家。','更早观察起手，利用横向闪避和控制留出距离。'],
 ward:['额外获得减伤，可与铁甲虫的正面减伤同时存在。','尽量避免被其阻挡全部弹道；铁甲虫仍优先打侧后方。'],
 regen:['超过 1.5 秒未受到攻击后，每秒回复最大生命的 0.3% × 稀有度等级。','持续命中以压住回复，分散攻击容易让它恢复。'],
 vampire:['实际扣除英雄生命时，回复该次失血量的 40% × 稀有度等级；纯护盾吸收不提供汲血。','优先躲开攻击，避免双方互耗使战斗拖长。'],
};
for(const [key,name] of Object.entries(AFFIXES))add({id:`trait:${key}`,category:'monsters',kind:'trait',name,summary:traitNotes[key][0],tags:['怪物词条'],art:icon(({vitality:'heart',fury:'sword',haste:'boot',ward:'shield',regen:'heal',vampire:'heart'})[key]),
 sections:[section('词条效果',traitNotes[key][0]),section('应对方式',traitNotes[key][1]),section('出现规则','精英、稀有、传奇怪物分别携带 1、2、3 个不重复词条；词条随机组合。')],relatedIds:RARITIES.slice(1).map((_,index)=>`enemy-rarity:${index+1}`)});

// Chapter one introduces objectives without adding skill reward settlements.
add({id:'boss:mossbell',category:'monsters',kind:'boss',name:'苔钟守卫',summary:'第10关的独立首领：石槌、树根和铜钟构成三阶段战斗，命中积累失衡，钟芯暴露时受到额外伤害。',tags:['首领','三阶段','失衡'],art:{type:'enemy',kind:'mossbell',key:'mossbell'},sections:[section('形态与阶段','生命降至70%和35%后，在当前动作结束时转阶段。','青铜钟躯、白瓷面具、非对称石槌与藤臂；地面判定对应本体。'),section('五种技能','石槌横扫：扇形锁定，起手后绕向背面。','根径裂地：三条延迟树根，利用缝隙移动。','跃步落钟：锁定落点后跳砸，落地存在恢复窗口。','唤醒侍卫：同时最多6只，整场最多召唤18只。','合围钟鸣：第三阶段释放三道带宽缺口的钟波；绿色缺口安全，大招后钟芯暴露4秒。'),section('失衡与弱点','普攻与技能命中增加失衡，控制带来额外贡献，同一次多段攻击有上限。','失衡蓄满后在当前动作结束时暴露钟芯4秒，受伤增加25%；恢复期间不能连续压入失衡。','单人、双人或带佣兵都可挑战，不要求特定职业。')],relatedIds:['boss:thornking','objective:nest','objective:beacon']});
add({id:'objective:nest',category:'monsters',kind:'objective',name:'孵化巢穴',summary:'路线任务：摧毁三个孵化巢，切断近战、疾行与冲刺小怪的来源。',tags:['路线目标','摧毁','限时'],art:{type:'enemy',kind:'nest',key:'nest'},sections:[section('目标','第3、6、8关前的岔路只影响下一关；第一波遭遇战，第二波执行任务。','90秒内摧毁全部巢穴；核心发亮时受到额外25%伤害。靠近会优先锁定，仍受射程与墙体限制。'),section('超时与奖励','超时停止孵化，残存巢穴转为精英守卫；有限清场后继续，失去额外路线奖励，保留基础技能选择。','经验路线减少部分金币，装备路线减少部分经验与金币；装备奖励为各自本职业二选一，可放弃，不改技能进阶门槛。','总刷怪与掉落预算有限；暂停与升级停表。')],relatedIds:['objective:beacon','boss:mossbell']});
add({id:'objective:beacon',category:'monsters',kind:'objective',name:'林灯据点',summary:'路线任务：保护有独立耐久的林灯，拦截主动攻击据点的敌人。',tags:['路线目标','保护','据点'],art:{type:'enemy',kind:'beacon',key:'beacon'},sections:[section('保护规则','守住60秒，角色不需要站在圈内；可以走出去拦截、控制和清除攻城怪。','敌人靠近队员或受到近处攻击会转而交战。AI会优先处理攻城者，并在空闲时守在据点附近。'),section('失守与收益','据点被摧毁后转为有限清场，保留基础技能奖励，失去路线额外收益。','金币路线降低部分经验掉落，成功时追加本段基础金币预算的25%；金币仍掉在地上，由真人各自拾取。','任务不要求多处同时站人，单人也可完成。')],relatedIds:['objective:nest','boss:mossbell']});
const oldBoss=entries.find(e=>e.id==='boss:thornking');oldBoss.summary='第20关及之后每10关出现的三阶段古王，以重锤、弹幕、根刺和天罚围猎小队。';oldBoss.sections[0].lines[0]='第10关为苔钟守卫；第20关及之后每10关出现荆冠古王。';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export const CODEX_ENTRIES=freeze(entries);
const byId=new Map(CODEX_ENTRIES.map(entry=>[entry.id,entry]));
export function findCodexEntry(id){return byId.get(id)||null;}
const normalize=text=>String(text??'').normalize('NFKC').toLocaleLowerCase().replace(/射手/g,'弓手').replace(/血瓶/g,'药瓶').replace(/宠物/g,'召唤').replace(/([qe])\s*技能/g,'$1技能').trim();
const searchText=new Map(CODEX_ENTRIES.map(entry=>[entry.id,normalize([entry.id,entry.name,entry.summary,roleName(entry.role),...entry.tags,...entry.sections.flatMap(section=>[section.title,...section.lines])].join(' '))]));
export function filterCodexEntries({category,role='all',query='',kind='all'}={}){
 const words=normalize(query).split(/\s+/).filter(Boolean);
 return CODEX_ENTRIES.filter(entry=>(!category||category==='all'||entry.category===category)&&(role==='all'||entry.role==='all'||entry.role===role)&&(kind==='all'||entry.kind===kind)&&words.every(word=>searchText.get(entry.id).includes(word)));
}
