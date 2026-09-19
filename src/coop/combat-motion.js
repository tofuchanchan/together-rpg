// Seconds, shared by simulation, atlas poses and effects. Haste scales the entire attack.
const ATTACK={warrior:[.12,.09,.22],mage:[.16,.08,.30],archer:[.105,.065,.20]};
const SKILL={bash:[.065,.20,.125],spin:[.12,.25,.16],fireball:[.15,.08,.19],frost:[.14,.08,.18],pierce:[.18,.07,.19],fan:[.14,.10,.18]};
export function actionTiming(role,type,haste=1){
 const [windup,active,recovery]=(type==='attack'?ATTACK[role]:SKILL[type])||[0,.15,.14];
 const speed=type==='attack'?Math.max(.1,haste):1;
 return {windup:windup/speed,activeEnd:(windup+active)/speed,duration:(windup+active+recovery)/speed,cancelAt:(windup+active*.65)/speed};
}
export function actionPhase(a){
 if(!a)return 'idle';if(a.type==='dodge')return 'active';
 const start=a.windup??a.duration*.33,end=a.activeEnd??a.duration*.56;
 return a.t<start?'windup':a.t<end?'active':'recovery';
}
export function reactionPose(actor){
 const r=actor.hitReaction;if(!r||r.life<=0)return{x:0,y:0,sx:1,sy:1,rotation:0,brightness:1};
 const q=Math.max(0,1-r.life/r.max),pulse=Math.sin(Math.min(1,q/.5)*Math.PI)*Math.exp(-q*2.5),power=r.power||1;
 return{x:r.x*pulse*7*power,y:r.y*pulse*5*power,sx:1+pulse*.065,sy:1-pulse*.07,rotation:r.x*pulse*.045,brightness:1+Math.max(0,1-q/.42)*1.2};
}
// Source-pixel cloth band: upper body and feet stay pinned. Small amplitudes preserve line art.
export function clothOffset(role,y,time,id=0){
 const top=role==='mage'?126:119,bottom=role==='mage'?202:198;
 if(y<=top||y>=bottom)return 0;
 const q=(y-top)/(bottom-top),amplitude=role==='warrior'?2.8:role==='mage'?2:2.4;
 return Math.sin(q*Math.PI)**2*Math.sin(time*2.5+id*1.7-q*2.2)*amplitude;
}
