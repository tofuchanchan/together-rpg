import {actionPhase,reactionPose} from './combat-motion.js';
// Source rows are separately illustrated views, not mirrored fronts.
export const DIRECTION_ROWS = [6, 7, 0, 1, 2, 3, 4, 5];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const cycle = n => ((n % 1) + 1) % 1;

// Rendering only: combat timing, movement and damage stay in World.
export function spritePose(h, time = 0) {
  const action = h.action;
  const q = action ? clamp(action.t / action.duration, 0, 1) : 0;
  const moving = Math.hypot(h.move?.x || 0, h.move?.y || 0) > .01;
  let direction = ((h.face || 0) % 8 + 8) % 8;
  let sheet = 'move', column = 0, x = 0, y = 0, rotation = 0, sx = 1, sy = 1;
  const stride = cycle(h.stride || 0);
  if (moving) {
    column = [1, 2, 3, 2][Math.floor(stride * 4)];
    y = -Math.abs(Math.sin(stride * Math.PI * 2)) * 1.5;
  } else {
    sy = 1 + Math.sin(time * 3 + (h.id || 0)) * .008;
  }
  if (action) {
    sheet = 'combat';
    const phase=actionPhase(action),start=action.windup??action.duration*.33,end=action.activeEnd??action.duration*.56;
    column = phase==='windup'?0:phase==='active'?1:q<.9?2:0;
    const a = direction * Math.PI / 4;
    const attack = phase==='windup'?-Math.sin(action.t/Math.max(.001,start)*Math.PI/2)*2:phase==='active'?5*(1-(action.t-start)/Math.max(.001,end-start)*.3):3.5*(1-(action.t-end)/Math.max(.001,action.duration-end))**2;
    x = Math.cos(a) * attack;
    y += Math.sin(a) * attack*.707;
    sx=1+(phase==='windup'?-.012:phase==='active'?.025:0);sy=1+(phase==='windup'?.014:phase==='active'?-.025:0);
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
