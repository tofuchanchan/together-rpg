export const ENEMY_ROWS=[6,7,0,1,2,3,4,5];
export const WORLD_SHEETS=[
 {source:'goblin',page:'enemies',rows:8,cols:4,cell:256,keys:Array.from({length:32},(_,i)=>`goblin-${i}`),displayHeight:88},
 {source:'mushroom',page:'enemies',rows:8,cols:4,cell:256,keys:Array.from({length:32},(_,i)=>`mushroom-${i}`),displayHeight:126},
 {source:'props',page:'props',rows:3,cols:4,cell:384,keys:['rock-large','rock-small','stump','barrel','pillar','banner','bush','fern','mushrooms','arch','tree','canopy']},
 {source:'icons',page:'icons',rows:5,cols:4,cell:192,keys:['shield','spin','fire','frost','pierce','fan','dodge','sword','heart','boot','heal','focus','pause','sound','muted','retry','confirm','gamepad','door','skull']},
 {source:'ui',page:'ui',rows:4,cols:4,cell:320,keys:['panel-neutral','panel-cyan','panel-orange','panel-gold','card-neutral','card-cyan','card-orange','card-ready','button-neutral','button-cyan','button-orange','button-disabled','skill-slot','portrait-frame','health-fill','xp-fill']},
 {source:'effects',page:'effects',rows:6,cols:4,cell:320,keys:['slash','spin','frost','blast','hit','dust'].flatMap(name=>Array.from({length:4},(_,i)=>`${name}-${i}`)),animation:true},
 {source:'projectiles',page:'projectiles',rows:4,cols:4,cell:256,keys:['bolt-0','bolt-1','bolt-2','bolt-3','fireball-0','fireball-1','fireball-2','fireball-3','arrow','pierce-arrow','heal-burst','shield-burst','shadow','ring-cyan','ring-orange','warning-ring']},
];
export const ICON_ALIASES={bash:'shield',fireball:'fire',arrow:'pierce',skill:'focus',speed:'boot',power:'sword',hp:'heart'};
export function enemyFrame(e){
 if(e.boss){const a=e.action;if(!a)return `thornking-${e.phase===3?7:Math.floor((e.stride||0)*2)%2}`;return `thornking-${a.kind==='slam'?(a.hit?3:2):a.kind==='barrage'?4:a.kind==='ultimate'?6:5}`;}
 const a=e.action;let face=e.face??0;
 if(a&&Math.hypot(a.x-e.x,a.y-e.y)>1)face=(Math.round(Math.atan2(a.y-e.y,a.x-e.x)/(Math.PI/4))+8)%8;
 const column=a?(a.hit?3:2):Math.floor((((e.stride||0)%1+1)%1)*2);
 if(!['goblin','mushroom'].includes(e.kind))return `${e.kind}-${column}`;
 return `${e.kind}-${ENEMY_ROWS[face]*4+column}`;
}
export function effectFrame(type,progress){return `${type}-${Math.min(3,Math.max(0,Math.floor(progress*4)))}`;}
