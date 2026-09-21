import {equippedSkills} from './skill-pairs.js';
import {validEquipment} from './equipment-data.js';
// Shared cards use the same four passive slots as class components.
const card=(title,icon,desc,tag,quality,tags)=>({title,icon,desc,tag,quality,tags});
export const UNIVERSAL_PASSIVES={
 boneWhistle:card('灵骨哨','pet','直接参与击杀有25%召唤灵犬，持续9/11/13秒；最多2只、间隔1.5秒。Boss每8次普攻命中也判定一次','召唤','uncommon',['pet','attack']),
 paperCrow:card('纸鸦符','crow','施法召唤纸鸦，拦一颗普通飞弹后扑击；2秒后自动出击，伤害18/24/30。最多2只、间隔4秒','召唤','uncommon',['pet','cast']),
 homeBell:card('归巢铃','bell','闪避结束召回可移动宠物；每只一生延寿2/3/4秒一次，召回间隔5秒，不重置攻击冷却','调度','uncommon',['pet','dodge']),
 commandWhistle:card('点将哨','mark','直接命中标记集火目标4/5/6秒；普攻不频繁换标，主动可改派。宠物优先围攻','调度','uncommon',['pet','mark']),
 elementFeed:card('元素饲料','element','宠物每2秒附着选定本人元素的40%弱化状态；弱状态持续系数1/1.2/1.4，不能续强状态','异常','rare',['pet','fire','frost']),
 needleMagazine:card('袖珍弹匣','needle','每次普攻有效命中25%追加真实飞针，伤害10/14/18；近战同样有效，间隔0.35秒','弹道','common',['projectile','attack']),
 refractLens:card('折射镜片','refract','通用飞针折射另一近敌一次，折射伤害60/70/80%；与回旋互斥，不改造职业主弹','弹道','uncommon',['projectile','chain']),
 returnCore:card('回旋弹芯','return','通用飞针折返主人，去回各可命中一次；伤害为原弹70/80/90%，与折射互斥','弹道','uncommon',['projectile','dodge']),
 orbitBlades:card('环身飞刃','blade','每4次普攻命中生成4秒环刃，最多3枚；接触伤害7/10/13，每敌间隔0.8秒','环绕','uncommon',['melee','attack']),
 stepCircuit:card('闪步回路','circuit','闪避后2秒内首次直接命中，返还剩余冷却最长主动0.35/0.45/0.55秒；共用35%返还上限','循环','common',['dodge','cast']),
 mineShoes:card('雷荚鞋','mine','近敌时步行180距离留雷荚，0.4秒武装、6秒消失，最多3枚；爆炸伤害18/24/30','布阵','common',['move','area']),
 returnSign:card('折返路标','sign','闪避起点留3秒路标，期间施法展开迟滞区，脉冲伤害5/7/9；展开间隔6秒','布阵','uncommon',['dodge','cast','frost']),
 riskEcho:card('险步回响','risk','闪避无敌帧实际躲过攻击，下一主动追加延迟冲击26/34/42；印记5秒、获得间隔6秒','闪避','rare',['dodge','cast']),
 kineticWheel:card('动能蓄轮','wheel','近敌连续步行420距离蓄轮，下次普攻推出短程滚轮伤害24/32/40，推开小怪；最多储存1次','移动','uncommon',['move','melee']),
 bloodAmber:card('血珀收容器','amber','实际失血生成血珀，拾取把失血30/36/42%化为3秒护盾；间隔4秒、场上最多2枚','血盾','uncommon',['shield','counter','pickup']),
 shieldBrood:card('碎盾荆种','thorn','护盾真实吸收累计最大生命10%孵出荆种，扑击两次，每击14/19/24；最多2只、间隔5秒','血盾','rare',['shield','pet','counter']),
 healingWave:card('疗愈余波','healingWave','实际治疗累计最大生命8%释放短程斥退波，伤害12/17/22；间隔4秒，过量治疗不累计','治疗','uncommon',['sustain','counter']),
 magnetAstrolabe:card('磁屑星盘','magnet','普攻命中20%掉磁屑，拾取获得挡飞弹或碰敌消失的磁星，伤害14/20/26；群星投递后改为星带薄盾8/10/12，掉落间隔1秒','拾取','common',['pickup','attack']),
 scavengeSigil:card('拾荒印','sigil','有效拾取在原地留减速爆印，伤害12/17/22；最多3枚、5秒失效、间隔1秒；补给包不触发','拾取','uncommon',['pickup','area']),
 supplyPack:card('远行背囊','supply','3次有效拾取蓄一包，下次施法抛出补给，领取得18/24/30护盾3秒，自取半额；补给不再充能','支援','uncommon',['pickup','cast','shield']),
 echoPosts:card('回声界桩','posts','施法插界桩，最多2根连绊索；穿越减速并受6/9/12伤害，每敌2秒一次；界桩持续12秒','布阵','uncommon',['cast','frost']),
 homeGift:card('归巢馈赠','wisp','宠物正常退场留本人微光，拾取得5/7/9护盾3秒，最多生命上限3%；每2秒一枚、地面最多3枚，异常退场不奖励','回收','uncommon',['pet','pickup','shield']),
 transferNeedle:card('转染针','transfer','主动把一种本人已有异常传给一个近敌，复制40/50/60%剩余效果；间隔2秒，不再传播、不刷新强状态','异常','rare',['fire','frost','bleed']),
 mixedFuse:card('异质引信','fuse','主动消耗本人已有两种异常各至多0.4秒，延迟爆裂伤害32/42/52；每主动一次、间隔4秒','异常','rare',['fire','frost','bleed','area']),
 duetMeter:card('对拍仪','duet','8秒内交替Q/E使下次普攻在前一次施法点震荡，伤害22/30/38；印记4秒、获得间隔6秒','交替','uncommon',['cast','attack']),
};

export function universalSources(h){
 const p=h.passives||{},skills=h.skills||[0,0],forms=h.forms||[],active=skills.some(Boolean);
 const burn=h.core==='pyromancer'||!!(active&&p.ember)||!!(h.role==='mage'&&h.skills[0]>0&&h.skillAdvances?.[0]);
 const chill=!!(p.chill||h.core==='frostweaver'||h.role==='mage'&&skills[1]||forms.includes('icelance')||forms.includes('coldfield'));
 const bleed=!!(forms.includes('bloodspin')||((h.crit>0||p.momentum)&&(p.blood||h.core==='executioner')));
 const basicPet=!!(p.boneWhistle||active&&p.paperCrow);
 const equippedWard=validEquipment(h.equipment?.armor)&&h.equipment.armor.role===h.role&&h.equipment.armor.affixes.some(a=>a.key==='spellWard');
 const shield=!!(h.role==='warrior'&&h.skillAdvances?.[0]&&skills[0]||p.bloodAmber||active&&p.supplyPack||basicPet&&p.homeGift&&h.awakening!=='hiveHorn'||active&&p.guard||forms.includes('aegis')||active&&equippedWard);
 const pet=!!(basicPet||shield&&p.shieldBrood);
 return{active,burn,chill,bleed,shield,pet,healing:!!(p.harvest||h.core==='executioner'&&bleed),anomalies:[burn&&'burn',chill&&'chill',bleed&&'bleed'].filter(Boolean)};
}
export function universalAvailable(h,key){
 if(!UNIVERSAL_PASSIVES[key])return false;
 const s=universalSources(h),p=h.passives||{};
 if(h.awakening==='hiveHorn'&&['homeBell','homeGift'].includes(key))return false;
 if(h.awakening==='thornFortress'&&key==='homeBell'&&!p.boneWhistle&&!(s.active&&p.paperCrow))return false;
 if(['paperCrow','stepCircuit','returnSign','riskEcho','supplyPack','echoPosts'].includes(key))return s.active;
 if(['homeBell','commandWhistle','homeGift'].includes(key))return s.pet;
 if(key==='elementFeed')return s.pet&&(s.burn||s.chill);
 if(key==='refractLens')return !!p.needleMagazine&&!p.returnCore;
 if(key==='returnCore')return !!p.needleMagazine&&!p.refractLens;
 if(key==='shieldBrood')return s.shield;
 if(key==='healingWave')return s.healing;
 if(key==='transferNeedle')return s.active&&s.anomalies.length>0;
 if(key==='mixedFuse')return s.active&&s.anomalies.length>=2;
 if(key==='duetMeter')return equippedSkills(h).every(slot=>h.skills?.[slot]>0);
 return true;
}
export const AWAKENINGS={
 hiveHorn:{title:'群巢号角',icon:'hive',desc:'宠物生成改为单一大巢灵积能，最多3层；主动命令其扎根扇射。失去游走宠物、纸鸦拦弹、召回和退场微光'},
 starMagazine:{title:'星轨弹仓',icon:'magazine',desc:'飞针改为储存最多6枚，闪避结束沿方向成列射出；失去即时追加，保留折射或回旋'},
 movingMinefield:{title:'雷场迁徙',icon:'minefield',desc:'主动把已有雷荚和符印迁到前方落点并重新武装；不复制、不延寿，失去沿途防线'},
 thornFortress:{title:'荆棘堡垒',icon:'fortress',desc:'荆种变成6秒固定荆棘塔，持续射刺；失去追击和归巢召回，主人撤离过远即失效'},
 starDelivery:{title:'群星投递',icon:'delivery',desc:'磁屑不再生成磁星；补给包附带护送星带，每名队员穿过得一次薄盾，失去磁星防弹碰撞'},
 corrosionEngine:{title:'熔蚀引擎',icon:'corrosion',desc:'异质引信消耗本人两种异常全部余量，转成单目标持续裂解；失去原有清群爆炸与状态覆盖'},
};
export function awakeningAvailable(h,key){
 if(!AWAKENINGS[key]||h.awakening)return false;
 const p=h.passives||{},s=universalSources(h),pair=(as,bs)=>as.some(a=>p[a]&&bs.some(b=>b!==a&&p[b]&&(p[a]>=2||p[b]>=2)));
 if(key==='hiveHorn')return s.active&&pair(['boneWhistle','paperCrow'],['commandWhistle','elementFeed']);
 if(key==='starMagazine')return pair(['needleMagazine'],['refractLens','returnCore']);
 if(key==='movingMinefield')return pair(['mineShoes'],['returnSign','scavengeSigil']);
 if(key==='thornFortress')return pair(['guard','bloodAmber'],['shieldBrood']);
 if(key==='starDelivery')return pair(['magnetAstrolabe'],['supplyPack']);
 if(key==='corrosionEngine')return s.anomalies.length>=2&&pair(['mixedFuse'],['ember','chill','blood']);
 return false;
}
