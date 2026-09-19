// All rolls use the world's seeded RNG. Descriptions state the exact applied effect.
export const ATTRIBUTES = [
 {key:'power',title:'磨砺武器',desc:'普攻伤害 +18%',icon:'sword'},
 {key:'hp',title:'坚韧之心',desc:'生命上限 +30，回复 30',icon:'heart'},
 {key:'speed',title:'轻盈步伐',desc:'移动速度 +8%（上限 +60%）',icon:'boot'},
 {key:'haste',title:'疾速攻击',desc:'普攻速度 +12%（上限 +100%）',icon:'fan'},
 {key:'crit',title:'精准打击',desc:'暴击率 +8%（上限 65%）',icon:'pierce'},
 {key:'critDamage',title:'致命锋芒',desc:'暴击伤害 +25%（基础 150%）',icon:'sword'},
 {key:'evasion',title:'灵巧直觉',desc:'受击闪避率 +5%（上限 35%）',icon:'dodge'},
 {key:'armor',title:'坚固护甲',desc:'减伤 +5%（上限 40%）',icon:'shield'},
 {key:'skill',title:'奥术专注',desc:'主动技能伤害 +20%',icon:'focus'},
 {key:'cooldown',title:'快速咏唱',desc:'技能冷却缩短 8%（上限 40%）',icon:'frost'},
 {key:'range',title:'战场掌控',desc:'普攻与技能范围 +10%（上限 +50%）',icon:'spin'},
 {key:'recovery',title:'药草知识',desc:'药瓶回复 +20%，立即回复 25',icon:'heal'},
];
export const PASSIVES = {
 ember:{title:'余烬',icon:'fire',desc:'技能命中燃烧 3 秒，每秒 4 / 8 / 12 伤害',tag:'燃烧'},
 chill:{title:'寒触',icon:'frost',desc:'命中减速 0.5 / 0.9 / 1.3 秒',tag:'控制'},
 blood:{title:'血刃',icon:'sword',desc:'暴击附加流血，每秒 5 / 10 / 15 伤害',tag:'暴击'},
 momentum:{title:'疾风步',icon:'dodge',desc:'闪避后 3 秒内下次命中必暴，增伤 10 / 20 / 30%',tag:'闪避'},
 harvest:{title:'汲取',icon:'heart',desc:'亲自击杀回复 3 / 6 / 9 生命',tag:'续航'},
 echo:{title:'回响',icon:'focus',desc:'亲自击杀缩短两个技能冷却 0.3 / 0.6 / 0.9 秒',tag:'循环'},
 chain:{title:'电弧',icon:'focus',desc:'每第 4 次直接命中，向附近 1 / 2 / 3 个敌人传导 35% 伤害',tag:'连锁'},
 detonate:{title:'殉爆',icon:'fire',desc:'击杀燃烧目标，爆炸造成 12 / 24 / 36 伤害',tag:'燃烧'},
 shatter:{title:'碎冰',icon:'frost',desc:'对减速/冻结敌人伤害 +10 / 20 / 30%',tag:'控制'},
 thorns:{title:'荆棘甲',icon:'shield',desc:'受伤时向近身敌人反射承受伤害的 30 / 60 / 90%',tag:'反击'},
 guard:{title:'壁垒',icon:'shield',desc:'每次主动释放获得 8 / 16 / 24 护盾，上限 60',tag:'护盾'},
 volley:{title:'分裂弹',icon:'fan',desc:'远程普攻额外 2 枚散射，副弹 18 / 28 / 38%（叠加风行副箭）',tag:'弹幕'},
 focus:{title:'处决',icon:'pierce',desc:'对生命低于 30% 的敌人增伤 20 / 40 / 60%',tag:'收割'},
 arcane:{title:'蓄能',icon:'focus',desc:'每次主动施放，使下一次普攻增伤 25 / 50 / 75%',tag:'交替'},
};
export const CORES={
 berserker:{role:'warrior',title:'狂战之血',icon:'sword',desc:'直接伤害 +35%；半血以下再 +25%，但承伤 +15%',tags:['blood','harvest','focus']},
 bulwark:{role:'warrior',title:'不动壁垒',icon:'shield',desc:'主动获得 25 护盾；受伤近身反伤 50%，但普攻 -15%',tags:['guard','thorns','echo']},
 whirlwind:{role:'warrior',title:'刃舞连环',icon:'spin',desc:'每第 3 次普攻追加 70% 圆斩，但普攻 -10%',tags:['momentum','echo','chain']},
 pyromancer:{role:'mage',title:'燎原火种',icon:'fire',desc:'普攻也点燃，燃烧击杀产生 28 点爆炸；冰霜冷却 +30%',tags:['ember','detonate','echo']},
 frostweaver:{role:'mage',title:'极寒契约',icon:'frost',desc:'每 3 次普攻冻结目标；对冻结目标 +45%，火球伤害 -20%',tags:['chill','shatter','focus']},
 arcanist:{role:'mage',title:'奥术潮汐',icon:'focus',desc:'每第 3 次主动追加 60% 奥术脉冲；主动冷却 +15%',tags:['arcane','chain','echo']},
 sniper:{role:'archer',title:'狙猎誓约',icon:'pierce',desc:'远于 230 的目标伤害 +55%；近于 130 时伤害 -20%',tags:['blood','focus','chill']},
 ranger:{role:'archer',title:'风行箭阵',icon:'fan',desc:'普攻自带两支 35% 副箭；主箭伤害 -15%',tags:['volley','chain','momentum']},
 executioner:{role:'archer',title:'血影猎手',icon:'sword',desc:'暴击必流血；流血击杀回复 8 生命，技能冷却 +15%',tags:['blood','harvest','focus']},
};
export const RUNES={wide:{title:'扩域',desc:'该主动范围 +25%，冷却 +15%'},force:{title:'重击',desc:'该主动伤害 +30%，冷却 +20%'},quick:{title:'速发',desc:'该主动冷却 -25%，伤害 -15%'}};
export const ACTIVE = {
 warrior:[{type:'bash',title:'盾冲',icon:'shield',need:'echo',evolved:'破阵冲锋',detail:'冲锋伤害 36 / 48 / 60；进化：距离 +30%，命中返还冷却'},
          {type:'spin',title:'旋风斩',icon:'spin',need:'momentum',evolved:'疾风龙卷',detail:'圆形斩击 38 / 51 / 64；进化：额外两次旋斩'}],
 mage:[{type:'fireball',title:'火球',icon:'fire',need:'ember',evolved:'烈焰新星',detail:'爆炸伤害 42 / 56 / 70；进化：爆炸范围 +50%，留下火区'},
       {type:'frost',title:'冰霜环',icon:'frost',need:'chill',evolved:'极寒领域',detail:'范围伤害 23 / 31 / 39；进化：冻结 1.5 秒，伤害 +50%'}],
 archer:[{type:'pierce',title:'贯穿箭',icon:'pierce',need:'blood',evolved:'裂魂穿刺',detail:'穿透伤害 45 / 60 / 75；进化：每次命中额外 +25% 暴击率'},
         {type:'fan',title:'箭雨扇射',icon:'fan',need:'echo',evolved:'回响箭雨',detail:'扇射 5 箭，每箭 20 / 27 / 34；进化：延迟再发一轮'}],
};
export function shuffle(pool,random){const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function attributePool(h){return ATTRIBUTES.filter(o=>!({speed:h.speedBonus>=1.6,haste:h.haste>=2,crit:h.crit>=.65,evasion:h.evasion>=.35,armor:h.armor>=.4,cooldown:h.cooldown>=.4,range:h.rangeBonus>=1.5}[o.key]));}
export function skillPool(h){
 const result=[];
 if(!h.core)for(const [key,c] of Object.entries(CORES))if(c.role===h.role)result.push({key:`core:${key}`,kind:'core',icon:c.icon,title:`核心 · ${c.title}`,desc:c.desc,detail:'核心仅选一个 · 改变整局打法'});
 ACTIVE[h.role].forEach((s,slot)=>{const level=h.skills[slot];
  if(level<3)result.push({key:`active:${slot}`,slot,kind:'active',icon:s.icon,title:`${level?'强化':'习得'} · ${s.title} Lv.${level+1}`,desc:`主动槽 ${slot+1} · ${s.detail.split('；')[0]}`,detail:s.detail});
  else if(!h.evolved[slot]&&(h.passives[s.need]||0)>=2)result.push({key:`evolve:${slot}`,slot,kind:'evolution',icon:s.icon,title:`进化 · ${s.evolved}`,desc:s.detail.split('进化：')[1],detail:`${s.title} III + ${PASSIVES[s.need].title} II`});
 });
 ACTIVE[h.role].forEach((s,slot)=>{if(h.skills[slot]>=2&&!h.runes?.[slot])for(const [key,r] of Object.entries(RUNES))result.push({key:`rune:${slot}:${key}`,slot,kind:'rune',icon:s.icon,title:`${s.title} · ${r.title}`,desc:r.desc,detail:'技能分支 · 每个主动只选一项'});});
 const occupied=Object.keys(h.passives).length;
 for(const [key,p] of Object.entries(PASSIVES)){if(key==='volley'&&h.role==='warrior')continue;const level=h.passives[key]||0;if(level<3&&(level||occupied<4))result.push({key:`passive:${key}`,kind:'passive',icon:p.icon,title:`${level?'强化':'被动'} · ${p.title} Lv.${level+1}`,desc:p.desc,detail:`${p.tag} · 被动槽 ${occupied}/4`});}
 // At a fully capped build, wave rewards remain useful instead of becoming an empty menu.
 if(result.length<3)result.push(...attributePool(h).map(o=>({...o,kind:'attribute'})));
 return result;
}
export function rollSkills(h,random){const all=shuffle(skillPool(h),random),selected=[];const add=o=>{if(o&&!selected.includes(o))selected.push(o);};add(all.find(o=>o.kind==='evolution')||all.find(o=>o.kind==='active'&&!h.skills[o.slot]));add(all.find(o=>o.kind==='core'));if(h.core)add(all.find(o=>o.kind==='passive'&&CORES[h.core].tags.includes(o.key.split(':')[1])));for(const o of all)add(o);return selected.slice(0,3);}
export function applyReward(h,key){
 const [kind,value]=key.split(':');
 if(kind==='core'){if(!h.core&&CORES[value]?.role===h.role)h.core=value;return;}
 if(kind==='rune'){const rune=key.split(':')[2];h.runes??=[null,null];if(h.skills[+value]>=2&&!h.runes[+value]&&RUNES[rune])h.runes[+value]=rune;return;}
 if(kind==='active'){h.skills[+value]=Math.min(3,h.skills[+value]+1);return;}
 if(kind==='evolve'){h.evolved[+value]=true;return;}
 if(kind==='passive'){h.passives[value]=Math.min(3,(h.passives[value]||0)+1);return;}
 if(key==='power')h.power*=1.18;
 if(key==='hp'){h.maxHp+=30;h.hp=Math.min(h.maxHp,h.hp+30);}
 if(key==='speed')h.speedBonus=Math.min(1.6,h.speedBonus+.08);
 if(key==='haste')h.haste=Math.min(2,h.haste+.12);
 if(key==='crit')h.crit=Math.min(.65,h.crit+.08);
 if(key==='critDamage')h.critDamage+=.25;
 if(key==='evasion')h.evasion=Math.min(.35,h.evasion+.05);
 if(key==='armor')h.armor=Math.min(.4,h.armor+.05);
 if(key==='skill')h.skillPower*=1.2;
 if(key==='cooldown')h.cooldown=Math.min(.4,h.cooldown+.08);
 if(key==='range')h.rangeBonus=Math.min(1.5,h.rangeBonus+.1);
 if(key==='recovery'){h.recovery+=.2;h.hp=Math.min(h.maxHp,h.hp+25);}
 if(key==='heal')h.hp=Math.min(h.maxHp,h.hp+55);
}
export const skillName=(h,i)=>h.evolved[i]?ACTIVE[h.role][i].evolved:ACTIVE[h.role][i].title;
