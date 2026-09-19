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
    // The impact key starts at the actual one-third hit point.
    column = q < .33 ? 0 : q < .56 ? 1 : q < .82 ? 2 : 0;
    const a = direction * Math.PI / 4;
    const attack = Math.sin(q * Math.PI);
    x = Math.cos(a) * attack * 3;
    y += Math.sin(a) * attack * 2;
    if (q >= .82) { sheet = 'move'; column = moving ? [1, 2, 3, 2][Math.floor(stride * 4)] : 0; }
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
      direction = (direction + Math.floor(q * 16)) % 8;
      sheet = 'combat'; column = 1;
      x = 0; y = -2;
    }
    if (action.type === 'frost') { column = q < .33 ? 0 : 1; sheet = 'combat'; }
  }
  if (h.down) { sheet = 'combat'; column = 3; rotation = -1.35; y = -9; sx = sy = 1; }
  return { sheet, row: DIRECTION_ROWS[direction], column, direction, x, y, rotation, sx, sy };
}
