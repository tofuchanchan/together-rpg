import {clamp} from './model.js';
import {drawArt,drawContent,frameInfo,skin,makeIllustratedGround} from './world-assets.js';
import {ICON_ALIASES,enemyFrame,effectFrame} from './world-art-defs.js';
import {enemyDef} from './enemies.js';
import {actionLayout} from './effect-layout.js';
export {skin};
export function icon(c,name,x,y,size=24){drawArt(c,ICON_ALIASES[name]||name,x,y,size*2.35);}
export function bar(c,x,y,w,h,q,color='#78cd73'){
 skin(c,'button-neutral',x,y,w,h);const value=clamp(q,0,1);if(!value)return;
 c.save();c.beginPath();c.rect(x+3,y+3,(w-6)*value,Math.max(1,h-6));c.clip();
 const xp=color==='#efd276'||color==='#f1c864';
 if(!xp&&['#e58a6d','#eea467'].includes(color))c.filter='hue-rotate(280deg) saturate(.9)';
 drawContent(c,xp?'xp-fill':'health-fill',x+3,y+3,w-6,Math.max(1,h-6));c.restore();
}
export function enemy(c,e,time){const key=enemyFrame(e),f=frameInfo(key),size=f.w*f.displayScale;
 if(e.slow>0)drawArt(c,'frost-3',0,-3,e.kind==='mushroom'?98:67,e.kind==='mushroom'?42:28,{alpha:.55});
 const bob=e.action?0:-Math.abs(Math.sin(e.stride*Math.PI*2))*2;
 c.save();if(!['goblin','mushroom'].includes(e.kind)&&e.face>=3&&e.face<=5)c.scale(-1,1);drawArt(c,key,0,bob,size,size,{filter:e.freeze>0?'sepia(.7) hue-rotate(130deg)':e.hitFlash>0?'brightness(1.8) saturate(.65)':undefined});c.restore();
}
export function rock(c,x,y,r){drawArt(c,r>32?'rock-large':'rock-small',x,y+8,r*3.1);}
export const makeGround=makeIllustratedGround;
export function actorShadow(c,x,y,r){drawArt(c,'shadow',x,y,r*2.3,r*.82,{alpha:.55});}
export function playerRing(c,x,y,r,id){drawArt(c,id===1?'ring-orange':'ring-cyan',x,y,r*2.2,r*.85,{alpha:id===2?.65:1,filter:id===2?'sepia(.9) saturate(.5)':undefined});}
export function warning(c,a){
 const q=clamp(a.t/a.windup,0,1);drawArt(c,'warning-ring',a.x,a.y*.707,a.r*2.1,a.r*2.1*.707,{alpha:.8});
 // Exact range/progress is functional geometry, kept aligned with the actual collision radius.
 c.save();c.beginPath();c.ellipse(a.x,a.y*.707,a.r*q,a.r*q*.707,0,0,Math.PI*2);c.fillStyle='#e56a4930';c.fill();
 c.beginPath();c.ellipse(a.x,a.y*.707,a.r,a.r*.707,0,0,Math.PI*2);c.lineWidth=2;c.strokeStyle='#e87456';c.stroke();
 c.beginPath();c.ellipse(a.x,a.y*.707,a.r,a.r*.707,0,-Math.PI/2,-Math.PI/2+q*Math.PI*2);c.lineWidth=2.5;c.strokeStyle='#ffe0a5';c.stroke();c.restore();
}
export function effect(c,f){
 if(f.type==='heal'){drawArt(c,'heal-burst',f.x,f.y*.707,130,80,{alpha:f.life/f.max});return;}
 const progress=clamp(1-f.life/f.max,0,.999),alpha=Math.min(1,f.life/f.max*3),type=f.type==='poof'?'dust':f.type==='impact'?'hit':f.type;
 const radius=f.r||35,diameter=type==='dust'?95:radius*2.25;
 drawArt(c,effectFrame(type,progress),f.x,f.y*.707,diameter,diameter*(['frost','spin','blast'].includes(type)?.707:type==='hit'?.75:1),{alpha});
}
export function projectile(c,p,time){
 const key=p.type==='arrow'?'arrow':p.type==='pierce'?'pierce-arrow':`${p.type==='fireball'?'fireball':'bolt'}-${Math.floor(time*14)%4}`;
 const width=p.type==='pierce'?77:p.type==='fireball'?86:p.type==='arrow'?55:48;
 drawArt(c,key,p.x,p.y*.707-31,width,width,{rotation:Math.atan2(p.dy*.707,p.dx),filter:p.hostile?'sepia(.8) saturate(3) hue-rotate(320deg)':undefined});
}
export function heroAction(c,h){const a=h.action,layout=actionLayout(h);if(!a||!layout)return;const q=clamp(a.t/a.duration,0,.999),angle=Math.atan2(a.dir.y*.707,a.dir.x);c.save();c.translate(layout.x,layout.y*.707);
 if(a.type==='attack'&&q>.25&&q<.76)drawArt(c,effectFrame('slash',(q-.25)/.51),0,-28,layout.size,layout.size,{rotation:angle,alpha:.92});
 if(a.type==='spin'){c.scale(1,.707);drawArt(c,effectFrame('spin',q),0,0,layout.size,layout.size,{rotation:q*Math.PI,alpha:.75});}
 if(a.type==='bash')drawArt(c,'shield-burst',0,-28,77,77,{rotation:angle,alpha:Math.sin(q*Math.PI)*.8});
 if(a.type==='dodge')drawArt(c,effectFrame('dust',q),0,0,83,60,{alpha:.65});c.restore();
}
export const SCENE_PROPS=[
 {name:'arch',x:0,y:-380,size:244},{name:'banner',x:-210,y:-385,size:159},{name:'banner',x:235,y:-385,size:159},
 {name:'pillar',x:-565,y:-260,size:143},{name:'pillar',x:570,y:-245,size:135},
 {name:'barrel',x:-588,y:-155,size:73},{name:'barrel',x:580,y:155,size:73},
 {name:'stump',x:-615,y:70,size:106},{name:'bush',x:607,y:55,size:103},{name:'bush',x:-610,y:235,size:96},
 {name:'fern',x:-580,y:350,size:80},{name:'fern',x:570,y:-350,size:80},
 {name:'mushrooms',x:470,y:355,size:68},{name:'mushrooms',x:-480,y:-350,size:62},
 {name:'rock-small',x:-370,y:360,size:75},{name:'rock-small',x:360,y:-365,size:68},
 {name:'tree',x:-725,y:120,size:252},{name:'tree',x:736,y:125,size:255},
 {name:'canopy',x:-560,y:620,size:246},{name:'canopy',x:570,y:620,size:251},
];
export function sceneProp(c,p){drawArt(c,p.name,p.x,p.y*.707,p.size);}
