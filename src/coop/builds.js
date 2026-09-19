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
};
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
 ACTIVE[h.role].forEach((s,slot)=>{const level=h.skills[slot];
  if(level<3)result.push({key:`active:${slot}`,slot,kind:'active',icon:s.icon,title:`${level?'强化':'习得'} · ${s.title} Lv.${level+1}`,desc:`主动槽 ${slot+1} · ${s.detail.split('；')[0]}`,detail:s.detail});
  else if(!h.evolved[slot]&&(h.passives[s.need]||0)>=2)result.push({key:`evolve:${slot}`,slot,kind:'evolution',icon:s.icon,title:`进化 · ${s.evolved}`,desc:s.detail.split('进化：')[1],detail:`${s.title} III + ${PASSIVES[s.need].title} II`});
 });
 const occupied=Object.keys(h.passives).length;
 for(const [key,p] of Object.entries(PASSIVES)){const level=h.passives[key]||0;if(level<3&&(level||occupied<4))result.push({key:`passive:${key}`,kind:'passive',icon:p.icon,title:`${level?'强化':'被动'} · ${p.title} Lv.${level+1}`,desc:p.desc,detail:`${p.tag} · 被动槽 ${occupied}/4`});}
 // At a fully capped build, wave rewards remain useful instead of becoming an empty menu.
 if(result.length<3)result.push(...attributePool(h).map(o=>({...o,kind:'attribute'})));
 return result;
}
export function rollSkills(h,random){const all=shuffle(skillPool(h),random),evolution=all.find(o=>o.kind==='evolution'),unlock=all.find(o=>o.kind==='active'&&!h.skills[o.slot]);const first=evolution||unlock;return(first?[first,...all.filter(o=>o!==first)]:all).slice(0,3);}
export function applyReward(h,key){
 const [kind,value]=key.split(':');
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
