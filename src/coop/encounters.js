export const RARITIES=[{name:'普通',color:null,mult:1},{name:'精英',color:'#5dc9ff',mult:1.55},{name:'稀有',color:'#ca80ff',mult:2.4},{name:'传奇',color:'#ffd06a',mult:3.8}];
export const AFFIXES={vitality:'巨躯',fury:'凶猛',haste:'迅捷',ward:'坚甲',regen:'再生',vampire:'汲血'};
export const BOSS_DEF={name:'荆冠古王',hp:2600,speed:55,range:220,radius:150,windup:1.05,damage:27,cd:2.7,behavior:'boss',size:190,xp:18};
export const waveNumber=(room,wave)=>(room-1)*2+wave;
export function rareRoll(random,progress){const r=random(),bonus=Math.min(.08,(progress-1)*.002);return r<.015+bonus*.2?3:r<.06+bonus*.5?2:r<.19+bonus?1:0;}
export function scaledEnemy(base,progress,rank,random){
 const n=Math.max(0,progress-1),keys=Object.keys(AFFIXES),affixes=[];
 for(let i=0;i<rank;i++)affixes.push(keys.splice(Math.floor(random()*keys.length),1)[0]);
 const has=k=>affixes.includes(k),stats={...base};
 stats.hp=Math.round(base.hp*(1+n*.065)*RARITIES[rank].mult*(has('vitality')?1+.25*rank:1));
 stats.damage=base.damage*(1+n*.025)*(1+rank*.12)*(has('fury')?1+.18*rank:1);
 stats.speed=base.speed*(1+Math.min(.3,n*.006))*(has('haste')?1+.1*rank:1);
 stats.cd=base.cd/(1+Math.min(.3,n*.004)+(has('haste')?.08*rank:0));
 stats.armor=has('ward')?.08+.06*rank:0;stats.xp=Math.ceil(base.xp*(1+rank*.8));
 return{stats,affixes,rarity:rank,progress};
}
export function wavePlan(room,wave){const duration=48+(wave-1)*8+Math.min(24,Math.floor((room-1)/3)*2),count=6+Math.min(12,Math.floor((room-1)/2))+(wave-1);
 return{duration,batches:Array.from({length:4},(_,i)=>({at:i*(duration-10)/3,count:count+i*2,index:i}))};
}
