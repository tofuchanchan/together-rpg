// Dedicated painted sprites for build identities. All combat visuals are PNG art.
import {drawArt,worldArtState} from './world-assets.js';
const images=new Map(),failed=[];
let pending;
const names=['aegis','bloodspin','inferno','icelance','markedshot','shadow','coldfield'];
const pairArt={stomp:'aegis',blade:'bloodspin',pin:'markedshot',rain:'shadow',barrage:'inferno',orbit:'coldfield','pair-wall':'aegis','pair-wave':'aegis','pair-tornado':'bloodspin','pair-blade':'bloodspin','pair-ichi':'icelance','pair-rail':'markedshot','pair-pin':'markedshot','pair-fan':'shadow','pair-rain':'shadow','pair-arcane':'inferno','pair-orbit':'coldfield','pair-ice':'coldfield','pair-fire':'inferno','pair-steam':'icelance','pair-scar':'bloodspin'};
const aliases={...pairArt,guardburst:'aegis',icefield:'coldfield',shatter:'icelance',markburst:'markedshot',shadowvolley:'shadow',huntmark:'markedshot',brittle:'icelance'};
export function loadBuildArt(){return pending??=Promise.all(names.map(async key=>{
 try{const image=new Image();image.src=new URL(`../../assets/builds/${key}.png`,import.meta.url).href;await image.decode();images.set(key,image);}
 catch(error){failed.push(key);throw error;}
}));}
export function buildArtState(){return{ready:images.size===names.length,loaded:images.size,total:names.length,failed:[...failed]};}
function sprite(c,key,x,y,width,{alpha=1,rotation=0,height,crop}={}){
 const img=images.get(aliases[key]||key);if(!img)return false;
 c.save();c.globalAlpha*=Math.max(0,Math.min(1,alpha));c.translate(x,y);c.rotate(rotation);
 const h=height??width*img.height/img.width;
 if(crop)c.drawImage(img,...crop,-width/2,-h/2,width,h);else c.drawImage(img,-width/2,-h/2,width,h);c.restore();return true;
}
export function drawBuildIcon(c,key,x,y,size=44){
 if(worldArtState().ready&&['stomp','blade','pin','rain','orbit'].includes(key)){
  if(key==='stomp'){drawArt(c,'ring-orange',x,y+size*.2,size,size*.5);drawArt(c,'boot',x,y-size*.12,size*.65,size*.65);}
  if(key==='blade')drawArt(c,'slash-1',x,y,size,size);
  if(key==='pin')for(const off of [-.2,0,.2])drawArt(c,'pierce-arrow',x,y+size*off,size,size*.28,{filter:'hue-rotate(140deg)'});
  if(key==='rain')for(const off of [-.25,0,.25])drawArt(c,'arrow',x+size*off,y,size*.9,size*.28,{rotation:Math.PI/2});
  if(key==='orbit'){c.save();c.filter='hue-rotate(65deg)';sprite(c,'coldfield',x,y,size,{height:size});c.restore();}return true;
 }
 if(key==='barrage'&&worldArtState().ready){for(let i=-1;i<=1;i++)drawArt(c,'bolt-1',x+i*size*.16,y+i*size*.22,size*.75,size*.45,{rotation:-Math.PI/4,filter:'hue-rotate(245deg) saturate(1.4)'});return true;}
 const image=images.get(aliases[key]||key);if(!image)return false;
 if(key==='huntmark')return sprite(c,key,x,y,size,{height:size*.85,crop:[image.width*.765,image.height*.335,image.width*.23,image.height*.36]});
 if(key==='brittle')return sprite(c,key,x,y,size,{height:size*.8,crop:[image.width*.66,image.height*.16,image.width*.33,image.height*.68]});
 return sprite(c,key,x,y,size/Math.max(1,image.height/image.width));
}
export function drawBuildEffect(c,f){
 if(f.type!=='build')return false;
 if(f.variant?.startsWith('pair-')){
  const age=1-f.life/Math.max(.01,f.max),alpha=Math.min(1,f.life*4),r=f.r||80; c.save();c.translate(f.x,f.y*.707);c.scale(1,.707);
  if(f.variant==='pair-rain'&&worldArtState().ready){drawArt(c,'ring-cyan',0,0,r*2,r*2,{alpha:f.isField?.24:alpha*.5,filter:'hue-rotate(45deg)'});const eta=f.untilPulse;if(!f.isField||eta>=0&&eta<.3)for(let i=0;i<7;i++)drawArt(c,'arrow',(i%3-1)*r*.55,(Math.floor(i/3)-1)*r*.5-(f.isField?eta/.3*95:0),r*.7,r*.2,{rotation:Math.PI/2,alpha:f.isField?.7:alpha});}
  else if(f.variant==='pair-orbit'){c.filter='hue-rotate(65deg)';sprite(c,'coldfield',0,0,r*2,{alpha:alpha*.48,height:r*2});for(let i=0;i<3;i++){const a=age*6+i*Math.PI*2/3;if(worldArtState().ready)drawArt(c,'bolt-1',Math.cos(a)*r*.8,Math.sin(a)*r*.8,58,40,{rotation:a+Math.PI/2,alpha,filter:'hue-rotate(245deg) saturate(1.4)'});}}
  else if(f.variant==='pair-wave'&&worldArtState().ready)drawArt(c,'ring-orange',0,0,r*2,r*2,{alpha:alpha*.85});
  else if(f.variant==='pair-scar')sprite(c,'bloodspin',0,0,r*2,{alpha:alpha*.35,height:r*.3});
  else if(f.variant==='pair-wall')sprite(c,'aegis',0,0,r*2,{rotation:Math.atan2(f.dir?.y||0,f.dir?.x||1),alpha,height:r*1.5});
  else sprite(c,aliases[f.variant]||'aegis',0,0,r*2,{alpha:alpha*.72,rotation:f.variant==='pair-tornado'?age*5:0,height:r*2});
  c.restore();return true;
 }
 const key=aliases[f.variant]||f.variant;if(!images.has(key))return false;
 const progress=Math.max(0,Math.min(1,1-f.life/Math.max(.01,f.max))),alpha=Math.min(1,f.life/Math.max(.01,f.max)*3),r=f.r||65,x=f.x,y=f.y*.707;
 const angle=Math.atan2(f.dir?.y||0,f.dir?.x??1);
 if(['aegis','guardburst','bloodspin','icefield','coldfield','shatter','markburst'].includes(f.variant)){
  // Rotate inside the world plane first. One final Y projection keeps circular
  // ground ranges horizontal at every animation time and facing direction.
  c.save();c.translate(x,y);c.scale(1,.707);
  if(['icefield','coldfield'].includes(f.variant)){
   // The independent painted ground field has a clear center and a stable rim.
   sprite(c,'coldfield',0,0,r*2,{alpha:alpha*.78,height:r*2});
  }else if(f.variant==='shatter'){
   for(let i=0;i<5;i++){const a=angle+i*Math.PI*2/5,d=r*(.15+progress*.75);sprite(c,'icelance',Math.cos(a)*d,Math.sin(a)*d,r*.9*(1-progress*.3),{rotation:a,alpha:alpha*.8});}
  }else if(f.variant==='aegis'||f.variant==='guardburst'){
   const diameter=r*2*(f.variant==='guardburst'?.8+progress*.5:1);
   sprite(c,key,0,0,diameter,{rotation:angle-Math.PI/2,alpha:alpha*.76,height:diameter});
  }else if(f.variant==='markburst'){
   const img=images.get('markedshot'),crop=[img.width*.765,img.height*.335,img.width*.23,img.height*.36];
   for(let i=0;i<4;i++){const a=i*Math.PI/2,d=r*(.75-progress*.38);sprite(c,'markedshot',Math.cos(a)*d,Math.sin(a)*d,r*.65,{rotation:a+Math.PI,alpha:alpha*.95,height:r*.58,crop});}
  }else sprite(c,key,0,0,r*2,{rotation:progress*Math.PI*1.2,alpha:alpha*.88,height:r*2});
  c.restore();
 }else if(f.variant==='inferno')sprite(c,key,x,y-12,r*1.9*(.5+Math.sin(progress*Math.PI/2)*.5),{alpha:alpha*.72,height:r*1.38});
 else sprite(c,key,x,y-24,r*1.7,{rotation:Math.atan2((f.dir?.y||0)*.707,f.dir?.x??1),alpha:alpha*.78});
 return true;
}
export function drawBuildProjectile(c,p,time){
 if(worldArtState().ready&&['pair-ichi','pair-pin','pair-fan'].includes(p.visual)){const angle=Math.atan2(p.dy*.707,p.dx),ichi=p.visual==='pair-ichi',pin=p.visual==='pair-pin',width=ichi?154:pin?96:62;drawArt(c,ichi?'slash-1':pin?'pierce-arrow':'arrow',p.x-Math.cos(angle)*width*.35,p.y*.707-31-Math.sin(angle)*width*.35,width,ichi?30:24,{rotation:angle,filter:ichi?undefined:pin?'hue-rotate(140deg)':'hue-rotate(55deg)'});return true;}
 if(p.visual==='pair-arcane'&&worldArtState().ready){const angle=Math.atan2(p.dy*.707,p.dx);drawArt(c,`bolt-${Math.floor(time*14)%4}`,p.x-Math.cos(angle)*15,p.y*.707-31-Math.sin(angle)*15,64,44,{rotation:angle,filter:'hue-rotate(245deg) saturate(1.4)'});return true;}
 if(p.visual==='pair-blade'&&worldArtState().ready){drawArt(c,'slash-1',p.x,p.y*.707-28,100,80,{rotation:Math.atan2(p.dy*.707,p.dx)});return true;}
 if(p.visual?.startsWith('pair-')){const angle=Math.atan2(p.dy*.707,p.dx),arcane=p.visual==='pair-arcane',wide=['pair-blade','pair-ichi'].includes(p.visual),width=arcane?24:wide?95:75;
  c.save();if(arcane)c.filter='hue-rotate(235deg)';const result=sprite(c,aliases[p.visual],p.x-Math.cos(angle)*width*.4,p.y*.707-31-Math.sin(angle)*width*.4,width,{rotation:angle,height:arcane?24:wide?70:20});c.restore();return result;
 }
 if(!['icelance','markedshot','shadow'].includes(p.visual))return false;
 const image=images.get(p.visual);if(!image)return false;
 const width=p.visual==='icelance'?105*(p.fragment?.45:1):p.visual==='shadow'?82:88,angle=Math.atan2(p.dy*.707,p.dx);
 // The right tip is the collision position, matching ordinary arrows.
 return sprite(c,p.visual,p.x-Math.cos(angle)*width*.44,p.y*.707-31-Math.sin(angle)*width*.44,width,{rotation:angle,alpha:p.visual==='shadow'?.85:1});
}
