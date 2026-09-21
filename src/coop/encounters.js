export const RARITIES=[{name:'普通',color:null,mult:1},{name:'精英',color:'#5dc9ff',mult:1.55},{name:'稀有',color:'#ca80ff',mult:2.4},{name:'传奇',color:'#ffd06a',mult:3.8}];
export const AFFIXES={vitality:'巨躯',fury:'凶猛',haste:'迅捷',ward:'坚甲',regen:'再生',vampire:'汲血'};
export const BOSS_DEF={name:'荆冠古王',hp:2600,speed:55,range:220,radius:150,windup:1.05,damage:27,cd:2.7,behavior:'boss',size:190,xp:18,bodyRadius:45,contactDamage:10};
export const waveNumber=(room,wave)=>(room-1)*2+wave;
export function rareRoll(random,progress){
 const r=random(),bonus=Math.min(.08,(progress-1)*.002);
 if(progress<=3)return 0;
 // Keep early elite pressure, but introduce multi-affix HP/haste combinations gradually.
 const rare=(.06+bonus*.5)*Math.min(1,Math.max(0,(progress-7)/4));
 const legendary=(.015+bonus*.2)*Math.min(1,Math.max(0,(progress-13)/4));
 const elite=(Math.min(.19,.08+Math.max(0,progress-1)*.012)+Math.min(.08,Math.max(0,progress-11)*.002))*Math.min(1,(progress-3)/4);
 return r<legendary?3:r<rare?2:r<elite?1:0;
}
export function scaledEnemy(base,progress,rank,random){
 const n=Math.max(0,progress-1),keys=Object.keys(AFFIXES),affixes=[];
 for(let i=0;i<rank;i++)affixes.push(keys.splice(Math.floor(random()*keys.length),1)[0]);
 const has=k=>affixes.includes(k),stats={...base};
 stats.hp=Math.round(base.hp*(1+n*.095+n*n*.0012)*RARITIES[rank].mult*(has('vitality')?1+.25*rank:1));
 const attackGrowth=(1+n*.035+n*n*.0005)*(1+rank*.12)*(has('fury')?1+.18*rank:1);
 stats.damage=base.damage*attackGrowth;stats.contactDamage=(base.contactDamage||0)*attackGrowth;
 stats.speed=base.speed*(1+Math.min(.36,n*.011))*(has('haste')?1+.1*rank:1);
 stats.cd=base.cd/(1+Math.min(.65,n*.012)+(has('haste')?.08*rank:0));
 if(base.swarm&&n<4){stats.hp=Math.max(1,Math.round(stats.hp*(.6+n*.1)));stats.damage*=.65+n*.0875;stats.contactDamage*=.65+n*.0875;stats.speed*=.78+n*.055;}
 stats.armor=has('ward')?.08+.06*rank:0;stats.xp=Math.ceil(base.xp*(1+rank*.8));
 return{stats,affixes,rarity:rank,progress};
}
export function wavePlan(room,wave){const duration=48+(wave-1)*8+Math.min(24,Math.floor((room-1)/3)*2),count=6+Math.min(12,Math.floor((room-1)/2))+(wave-1);
 return{duration,batches:Array.from({length:4},(_,i)=>({at:i*(duration-10)/3,count:count+i*2,index:i}))};
}
