import {drawArt,drawContent} from './world-assets.js';
import {drawBuildEffect,drawBuildProjectile} from './build-art.js';
import {drawPickup} from './universal-art.js';

const fade=f=>Math.max(0,Math.min(1,f.life/Math.max(.01,f.max||.35)));
// Renderers place snare fields below actors and projectiles in the depth-sorted
// actor list. These functions never change gameplay timers or collision sizes.
export function drawEquipmentObject(c,o,time=0){
 if(o.kind==='snare'){
  c.save();c.filter='hue-rotate(265deg) saturate(.75)';c.globalAlpha*=Math.min(1,Math.max(0,o.life)*3)*.67;
  drawBuildEffect(c,{type:'build',variant:'coldfield',x:o.x,y:o.y,r:o.r,life:1,max:1});c.restore();
  drawArt(c,'dodge',o.x,o.y*.707,27,19,{alpha:Math.min(.8,Math.max(0,o.life))});return true;
 }
 if(o.kind==='piercingNeedle'){drawBuildProjectile(c,{...o,visual:'icelance',fragment:true},time);return true;}
 if(o.kind==='reloadBolt'){
  const size=34,angle=Math.atan2(o.dy*.707,o.dx);c.save();c.translate(o.x,o.y*.707-31);c.rotate(angle);
  // Right tip is the collision point; the body trails it in projected space.
  c.filter='sepia(.4) saturate(1.7)';drawContent(c,'arrow',-size,-4,size,8);c.restore();return true;
 }
 return false;
}
export function drawEquipmentEffect(c,f){
 if(f.type!=='equipment')return false;const q=fade(f),p=1-q,r=Math.max(1,f.r||40),x=f.x,y=f.y*.707;
 if(f.variant==='capacitor'){
  // Radial crystal spokes communicate a pushing pulse, distinct from a ward.
  drawBuildEffect(c,{...f,type:'build',variant:'shatter',r:r*(.7+p*.3)});return true;
 }
 if(f.variant==='spellWard'){
  c.save();c.globalAlpha*=q*.7;drawContent(c,'shield-burst',x-r*.7,y-r*.4,r*1.4,r*.8);c.restore();return true;
 }
 if(f.variant==='trailSnare'){
  c.save();c.filter='hue-rotate(265deg) saturate(.75)';drawBuildEffect(c,{...f,type:'build',variant:'coldfield',r:r*(.65+p*.35)});c.restore();return true;
 }
 if(f.variant==='panicMagnet'){
  c.save();c.globalAlpha*=q;for(let i=0;i<6;i++){const a=i*Math.PI/3,d=r*(.85-p*.75);c.save();c.translate(x+Math.cos(a)*d,y+Math.sin(a)*d*.707);c.scale(1.5,1.5);drawPickup(c,{type:i%2?'xp':'gold',id:i,x:0,y:0,value:1},0);c.restore();}c.restore();return true;
 }
 if(f.variant==='dodgeLoad'){
  c.save();c.globalAlpha*=q;c.translate(x,y);c.scale(1,.707);for(const side of [-1,1]){c.save();c.translate(side*(35-p*12),0);c.rotate(side<0?0:Math.PI);drawContent(c,'arrow',-15,-5,30,10);c.restore();}c.restore();return true;
 }
 if(f.variant==='reloadBolt'||f.variant==='piercingNeedle'){
  drawArt(c,f.variant==='reloadBolt'?'hit-1':'frost-1',x,y-31,r,r,{alpha:q*.85});return true;
 }
 return true;
}
