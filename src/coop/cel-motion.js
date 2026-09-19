import {actionTiming} from './combat-motion.js';
export const CEL_DIRECTIONS=['SE','NE'];
export const WALK_SECONDS=.56;
// Authored poses, with an explicit release at the game's existing windup boundary.
export const ATTACK_FRACTIONS=[0,.32,.7,1,1.28,1.75,2.55,3.15];
export function celFrame(clip,time,{haste=1,loop=true,role="warrior"}={}){
 const timing=actionTiming(role,'attack',haste),duration=clip==='walk'?WALK_SECONDS:clip==='idle'?2.4:timing.duration;
 const t=loop?((time%duration)+duration)%duration:Math.max(0,Math.min(duration,time));
 if(clip==='idle')return{frame:Math.min(7,Math.floor((t+1e-9)/duration*8)),t,duration,phase:'idle'};
 if(clip==='walk')return{frame:Math.min(7,Math.floor((t+1e-9)/duration*8)),t,duration,phase:'walk'};
 const boundaries=ATTACK_FRACTIONS.map(n=>n*timing.windup);
 let frame=0;for(let i=1;i<8;i++)if(t+1e-9>=boundaries[i])frame=i;
 return{frame,t,duration,phase:t+1e-9<timing.windup?'windup':t+1e-9<timing.activeEnd?'active':'recovery'};
}
export function celFrameTime(clip,frame,role="warrior"){return clip==='walk'?frame*WALK_SECONDS/8:clip==='idle'?frame*2.4/8:ATTACK_FRACTIONS[frame]*actionTiming(role,'attack').windup;}
