import {actionPhase,reactionPose} from './combat-motion.js';
import {pairMotion} from './pair-motion.js';
// Source rows are separately illustrated views, not mirrored fronts.
export const DIRECTION_ROWS = [6, 7, 0, 1, 2, 3, 4, 5];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const cycle = n => ((n % 1) + 1) % 1;
const smooth = n => {const t=clamp(n,0,1);return t*t*(3-2*t);};
const gait = h => h.gait??Math.min(1,Math.hypot(h.move?.x||0,h.move?.y||0));
function curve(t,keys){for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/Math.max(.00001,b-a));}return keys.at(-1)[1];}

// Continuous rigid cutout motion in source-pixel coordinates. No whole-body morphing.
export function jointPose(h){
 const amount=gait(h),phase=cycle(h.stride||0)*Math.PI*2;
 const move=Math.hypot(h.move?.x||0,h.move?.y||0)>.001?h.move:(h.lastMove||{x:0,y:0}),dx=move.x,dy=move.y,m=Math.hypot(dx,dy)||1;
 const feet=[0,1].map(i=>{const swing=Math.sin(phase+i*Math.PI),lift=Math.max(0,swing);return{x:swing*5*dx/m*amount,y:(swing*3*dy/m-lift*4)*amount,rotation:swing*.13*amount};});
 const arm={x:0,y:Math.sin(phase)*.6*amount,rotation:Math.sin(phase)*.035*amount};
 const a=h.action,row=DIRECTION_ROWS[a?.facing??h.face??0];
 const pair=pairMotion(h);if(pair){arm.x+=pair.armX;arm.y+=pair.armY;arm.rotation+=pair.arm;feet[0].y-=pair.footLift;return{feet,arm};}
 if(a){const start=a.windup??a.duration*.33,end=a.activeEnd??a.duration*.56;
  const pulse=curve(a.t,[[0,0],[start*.62,-.38],[start,1],[end,.8],[a.duration,0]]),angle=(a.facing??h.face??0)*Math.PI/4;
  const swing=h.role==='warrior'?[-1.5,-1.15,-.75,-.9,-.55,.7,1.2,.75][row]:h.role==='mage'?[-.45,-.35,-.3,-.25,.2,.3,.4,.45][row]:[.08,-.09,-.1,-.08,.08,.1,.1,.08][row];
  arm.rotation+=swing*pulse;arm.x+=Math.cos(angle)*pulse*(h.role==='warrior'?3:7);arm.y+=Math.sin(angle)*pulse*4;
 }
 return{feet,arm};
}

// Rendering only: combat timing, movement and damage stay in World.
export function spritePose(h, time = 0) {
  const action = h.action;
  const q = action ? clamp(action.t / action.duration, 0, 1) : 0;
  const moving = gait(h) > .001;
  let direction = ((action?.facing ?? h.face ?? 0) % 8 + 8) % 8;
  let sheet = 'move', column = 0, x = 0, y = 0, rotation = 0, sx = 1, sy = 1;
  const stride = cycle(h.stride || 0);
  if (moving) {
    column = [1, 2, 3, 2][Math.floor(stride * 4)];
    y = -(1-Math.cos(stride*Math.PI*4))*.65*gait(h);
  }
  const pair=pairMotion(h);
  if(pair){column=0;sheet='move';x+=pair.x;y+=pair.y;rotation+=pair.rotation;}
  else if (action) {
    sheet = 'combat';
    const phase=actionPhase(action),start=action.windup??action.duration*.33,end=action.activeEnd??action.duration*.56;
    column = phase==='windup'?0:phase==='active'?1:q<.9?2:0;
    const a = direction * Math.PI / 4;
    const attack=curve(action.t,[[0,0],[start*.62,-2],[start,5],[end,3.5],[action.duration,0]]);
    x = Math.cos(a) * attack;
    y += Math.sin(a) * attack*.707;
    if (q >= .9) { sheet = 'move'; column = moving ? [1, 2, 3, 2][Math.floor(stride * 4)] : 0; }
    if (action.type === 'bash' || action.type === 'dodge') {
      sheet = 'combat'; column = 3;
      const compress = Math.sin(Math.PI * q);
      sx = 1 + compress * .04;
      sy = 1 - compress * .08;
      rotation = Math.cos(a) * compress * .09;
      y = -compress * 2;
      if (q > .87) { sheet = 'move'; column = 0; }
    }
    if (action.type === 'spin') {
      const spin=clamp((action.t-start)/Math.max(.001,action.duration-start),0,1);
      direction = (direction + Math.floor(spin * 16)) % 8;
      sheet = 'combat'; column = phase==='windup'?0:1;
      x = 0; y = -2;
    }
    if (action.type === 'frost'&&q<.9) { column = phase==='windup'?0:phase==='active'?1:2; sheet = 'combat'; }
  }
  if (h.down) { sheet = 'combat'; column = 3; rotation = -1.35; y = -9; sx = sy = 1; }
  const hit=reactionPose(h);if(!h.down){x+=hit.x;y+=hit.y;rotation+=hit.rotation;sx*=hit.sx;sy*=hit.sy;}
  return { sheet, row: DIRECTION_ROWS[direction], column, direction, x, y, rotation, sx, sy,brightness:hit.brightness,cloth:!action&&!moving&&!h.down };
}
