import {drawArt} from './world-assets.js';
import {drawBuildIcon} from './build-art.js';
import {RARITIES} from './encounters.js';
const names=['seedling','dustling','gnat','spiritdog','paperbird','thornpet'],images=new Map(),outlines=new Map();
const ownerColors=['#6beddd','#ffb96a','#d5dda1'];
export async function loadUniversalArt(){await Promise.all(names.map(async key=>{const img=new Image();img.src=new URL(`../../assets/universal/${key}.png`,import.meta.url).href;await img.decode();images.set(key,img);if(names.indexOf(key)<3)for(let rank=1;rank<=3;rank++){const mask=document.createElement('canvas');mask.width=img.width;mask.height=img.height;const mc=mask.getContext('2d');mc.drawImage(img,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle=RARITIES[rank].color;mc.fillRect(0,0,mask.width,mask.height);outlines.set(`${key}:${rank}`,mask);}}));}
export const universalArtState=()=>({ready:images.size===names.length,loaded:images.size,total:names.length});
export function drawUnit(c,key,x,y,size,frame=0,flip=false,filter=null){
 const img=images.get(key);if(!img)return false;const f=Math.max(0,Math.min(3,frame|0));
 c.save();c.translate(x,y);if(flip)c.scale(-1,1);if(filter)c.filter=filter;c.drawImage(img,f%2*256,Math.floor(f/2)*256,256,256,-size*.5,-size*236/256,size,size);c.restore();return true;
}
export function drawSwarm(c,e,time){
 if(!['seedling','dustling','gnat'].includes(e.kind))return false;
 const size=(e.stats?.size||46)*1.15,frame=e.action?(e.action.hit?3:2):Math.floor((e.stride||time)*3)%2,flip=e.face>=3&&e.face<=5;
 if(e.rarity){const outline=outlines.get(`${e.kind}:${e.rarity}`);if(outline){c.save();if(flip)c.scale(-1,1);for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]])c.drawImage(outline,frame%2*256,Math.floor(frame/2)*256,256,256,-size*.5+dx,-size*236/256+dy,size,size);c.restore();}}
 c.save();if(e.spawnGrace>0)c.globalAlpha=.4;drawUnit(c,e.kind,0,0,size,frame,flip,e.hitFlash>0?'brightness(1.65)':e.freeze>0?'sepia(.4) hue-rotate(120deg)':null);c.restore();return true;
}
function ring(c,x,y,r,color,alpha=.5){c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y,r,r*.707,0,0,Math.PI*2);c.stroke();c.restore();}
export function drawPet(c,p,time){
 const key={dog:'spiritdog',crow:'paperbird',thorn:'thornpet',turret:'thornpet',hive:'thornpet'}[p.kind]||'spiritdog',size=p.kind==='hive'?100:p.kind==='turret'?70:52;
 const frame=p.kind==='turret'||p.kind==='hive'?2:p.cd>.5?3:Math.floor((p.age||time)*7)%2;
 ring(c,p.x,p.y*.707,size*.28,ownerColors[p.owner],.7);
 if(p.kind==='turret'||p.kind==='hive')drawArt(c,'stump',p.x,p.y*.707+4,size*.8);
 drawUnit(c,key,p.x,p.y*.707-(p.kind==='crow'?12:0),size,frame,(p.vx||0)<0);
 if(p.kind==='hive'&&p.energy){c.save();c.fillStyle='#ffe799';for(let i=0;i<p.energy;i++){c.beginPath();c.arc(p.x-12+i*12,p.y*.707-size-3,3,0,Math.PI*2);c.fill();}c.restore();}
}
export function drawPickup(c,p,time){
 const x=p.x,y=p.y*.707-5-Math.sin(time*3+p.id)*1.3;
 if(p.type==='potion'){drawArt(c,'heal',x,y-7,33);return;}
 if(p.type==='supply'){drawArt(c,'barrel',x,y-2,34);ring(c,x,y+6,18,ownerColors[p.owner],.6);return;}
 const color={xp:'#70d8f0',gold:'#ffd478',magnet:'#bfc9ff',amber:'#f28b7e',wisp:'#a9f5d9'}[p.type]||'#d8eff2';
 c.save();c.translate(x,y);c.strokeStyle='#273e35';c.lineWidth=1.7;c.fillStyle=color;
 if(p.type==='gold'){c.beginPath();c.ellipse(0,0,7,6,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#b88d3c';c.beginPath();c.moveTo(0,-3);c.lineTo(0,3);c.stroke();}
 else{const size=p.type==='xp'?Math.min(11,5+Math.log2(p.value||1)):8;c.beginPath();c.moveTo(0,-size);c.lineTo(size*.65,0);c.lineTo(0,size*.55);c.lineTo(-size*.65,0);c.closePath();c.fill();c.stroke();c.strokeStyle='#f2fff9';c.beginPath();c.moveTo(-size*.15,-size*.5);c.lineTo(-size*.4,0);c.stroke();}
 c.restore();
}
const iconMap={pet:'spiritdog',crow:'paperbird',bell:'spiritdog',mark:'markedshot',element:'inferno',needle:'markedshot',refract:'icelance',return:'markedshot',blade:'bloodspin',circuit:'coldfield',mine:'thornpet',sign:'aegis',risk:'shadow',wheel:'bloodspin',amber:'inferno',thorn:'thornpet',healingWave:'coldfield',magnet:'icelance',sigil:'aegis',supply:'aegis',posts:'aegis',wisp:'spiritdog',transfer:'icelance',fuse:'inferno',duet:'shadow',hive:'thornpet',magazine:'markedshot',minefield:'thornpet',fortress:'thornpet',delivery:'aegis',corrosion:'inferno'};
const glyphs={bell:'↩',mark:'◎',element:'✦',needle:'↗',refract:'⋈',return:'↶',blade:'◈',circuit:'↻',mine:'✹',sign:'⌖',risk:'!',wheel:'↠',amber:'♥',thorn:'✹',healingWave:'+',magnet:'◇',sigil:'⌖',supply:'+',posts:'Ⅱ',wisp:'✦',transfer:'↗',fuse:'Ⅱ',duet:'⇄',hive:'Ⅲ',magazine:'Ⅵ',minefield:'↗',fortress:'▲',delivery:'↔',corrosion:'◎'};
export function drawUniversalIcon(c,name,x,y,size=44){
 const key=iconMap[name];if(!key)return false;
 if(images.has(key))drawUnit(c,key,x,y+size*.42,size*1.1,0);else drawBuildIcon(c,key,x,y,size);
 if(glyphs[name]){c.save();c.fillStyle='#1b382deb';c.beginPath();c.arc(x+size*.3,y+size*.3,size*.22,0,Math.PI*2);c.fill();c.fillStyle='#fff0bb';c.font=`bold ${Math.round(size*.31)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(glyphs[name],x+size*.3,y+size*.31);c.restore();}return true;
}
export function drawUniversalObject(c,o,time){
 const x=o.x,y=o.y*.707,color=ownerColors[o.owner]||'#a9ede0';
 if(['needle','thornBolt','wheel'].includes(o.kind)){
  const size=o.kind==='wheel'?54:o.kind==='needle'?35:23;c.save();c.translate(x,y-26);c.rotate(o.kind==='wheel'?time*9:Math.atan2(o.dy*.707,o.dx));if(o.kind==='wheel')drawBuildIcon(c,'bloodspin',0,0,size);else drawArt(c,o.kind==='needle'?'pierce-arrow':'arrow',-size*.3,0,size);c.restore();return;
 }
 if(['orbit','magnetStar'].includes(o.kind)){c.save();c.translate(x,y-24);c.rotate(time*4);drawArt(c,o.kind==='orbit'?'sword':'focus',0,0,o.kind==='orbit'?31:23);c.restore();return;}
 if(o.kind==='post'){drawArt(c,'pillar',x,y,43);if(o.link){c.save();c.strokeStyle=color;c.globalAlpha=.6;c.lineWidth=3;c.setLineDash([6,7]);c.beginPath();c.moveTo(x,y-12);c.lineTo(o.link.x,o.link.y*.707-12);c.stroke();c.restore();}return;}
 if(o.kind==='mine'){drawUnit(c,'thornpet',x,y+3,25,2);ring(c,x,y,16,color,o.arm>0?.25:.9);return;}
 if(o.kind==='sign'){drawArt(c,'dodge',x,y,37);return;}
 const r=o.r||65;c.save();c.translate(x,y);c.scale(1,.707);c.globalAlpha=.3;
 if(['sigil','fuse','riskPulse'].includes(o.kind)){drawArt(c,o.kind==='sigil'?'shield-burst':o.kind==='fuse'?'fireball-2':'focus',0,0,r*1.3);}
 else drawArt(c,o.kind==='starBand'?'heal-burst':'frost-2',0,0,r*2,r*2,{filter:o.kind==='corrosion'?'hue-rotate(70deg)':undefined});c.restore();ring(c,x,y,r,color,.4);
}
export function drawUniversalEffect(c,f){
 if(f.type!=='universal')return false;const q=Math.min(1,f.life/(f.max||.4)),r=f.r||38;
 if(f.to){c.save();c.strokeStyle=ownerColors[f.owner]||'#afeccf';c.globalAlpha=q;c.lineWidth=2;c.beginPath();c.moveTo(f.x,f.y*.707-20);c.lineTo(f.to.x,f.to.y*.707-20);c.stroke();c.restore();}
 drawArt(c,f.variant==='healingWave'?'heal-burst':f.variant==='petBite'?'hit-1':f.variant==='block'?'shield-burst':f.variant==='summon'?'dust-1':f.variant==='mine'?'blast-1':'frost-1',f.x,f.y*.707,r*2,r*1.414,{alpha:q*.6});return true;
}
