import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root=new URL('../assets/equipment/',import.meta.url);
const BODY_KEYS=['warrior_body_default','warrior_armor_plate','warrior_armor_raider','mage_body_default','mage_armor_star','mage_armor_leaf','archer_body_default','archer_armor_scout','archer_armor_ranger'];
const WEAPON_KEYS=['warrior_weapon_iron','warrior_weapon_cleaver','mage_weapon_crystal','mage_weapon_ember','archer_weapon_longbow','archer_weapon_crossbow'];
const ROWS=['S','SW','W','NW','N','NE','E','SE'];
const read=key=>PNG.sync.read(fs.readFileSync(new URL('source/'+key+'.png',root)));
function components(im){
 const seen=new Uint8Array(im.width*im.height),out=[];
 for(let p=0;p<seen.length;p++){if(seen[p]||im.data[p*4+3]<100)continue;const stack=[p];seen[p]=1;let x0=im.width,y0=im.height,x1=0,y1=0,n=0;
  while(stack.length){const v=stack.pop(),x=v%im.width,y=Math.floor(v/im.width);n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const next of [x>0?v-1:-1,x<im.width-1?v+1:-1,y>0?v-im.width:-1,y<im.height-1?v+im.width:-1])if(next>=0&&!seen[next]&&im.data[next*4+3]>=100){seen[next]=1;stack.push(next);}}
  if(n>150)out.push({x0,y0,x1,y1,n,w:x1-x0+1,h:y1-y0+1});
 }return out;
}
function boxes(im,rows){
 // Use alpha connected components to preserve uneven generated sheet spacing.
 const parts=components(im).sort((a,b)=>b.n-a.n).slice(0,rows*4);
 if(parts.length!==rows*4)throw Error('Expected '+rows*4+' full sprites, found '+parts.length);
 parts.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));
 const ordered=[];for(let y=0;y<rows;y++)ordered.push(...parts.slice(y*4,y*4+4).sort((a,b)=>a.x0-b.x0));
 return ordered;
}
function sample(im,x,y){const x0=Math.floor(x),y0=Math.floor(y),out=[0,0,0,0];let total=0;
 for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const sx=x0+xx,sy=y0+yy;if(sx<0||sy<0||sx>=im.width||sy>=im.height)continue;const weight=(xx?x-x0:1-x+x0)*(yy?y-y0:1-y+y0),i=(sy*im.width+sx)*4,a=im.data[i+3]/255;for(let c=0;c<3;c++)out[c]+=im.data[i+c]*weight*a;out[3]+=im.data[i+3]*weight;total+=weight*a;}
 if(total>0)for(let c=0;c<3;c++)out[c]/=total;return out;
}
function copyScaled(im,box,atlas,cellX,cellY,scale,originX,originY){
 const x0=Math.max(0,Math.floor(originX+box.x0*scale)-1),x1=Math.min(255,Math.ceil(originX+(box.x1+1)*scale)+1),y0=Math.max(0,Math.floor(originY+box.y0*scale)-1),y1=Math.min(255,Math.ceil(originY+(box.y1+1)*scale)+1);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const sourceX=(x-originX)/scale,sourceY=(y-originY)/scale;if(sourceX<box.x0-1||sourceX>box.x1+1||sourceY<box.y0-1||sourceY>box.y1+1)continue;const rgba=sample(im,sourceX,sourceY),i=((cellY+y)*atlas.width+cellX+x)*4;for(let c=0;c<4;c++)atlas.data[i+c]=Math.round(rgba[c]);}
}
function headCenter(im,b){
 let x0=im.width,x1=0;const yEnd=b.y0+b.h*.46;
 for(let y=b.y0;y<yEnd;y++)for(let x=b.x0;x<=b.x1;x++)if(im.data[(y*im.width+x)*4+3]>160){x0=Math.min(x0,x);x1=Math.max(x1,x);}
 return (x0+x1)/2;
}
function handGuess(im,b,key,row){
 const role=key.split('_')[0],right=(role==='warrior'?row>=3&&row<=6:role==='mage'?row>=5:row===0||row===1||row>=5),targetX=right?b.x1:b.x0,targetY=b.y0+b.h*(role==='mage'?.73:.67);
 if(role==='warrior'&&!key.includes('default'))return[right?b.x1-b.w*.09:b.x0+b.w*.10,b.y0+b.h*[.60,.57,.52,.55,.55,.56,.55,.59][row]];
 // Skin clusters isolate actual painted mitten, not a generated or patched hand.
 const list=componentsSkin(im,b).filter(p=>p.n>8&&p.n<900&&p.cy>b.y0+b.h*(role==='archer'?.65:.49)&&p.cy<b.y0+b.h*.88);
 list.sort((a,c)=>Math.hypot((a.cx-targetX)*.9,a.cy-targetY)-Math.hypot((c.cx-targetX)*.9,c.cy-targetY));
 const p=list[0];return p?[p.cx,p.cy]:[right?b.x1-b.w*.09:b.x0+b.w*.1,targetY];
}
function componentsSkin(im,b){
 const seen=new Set(),out=[],skin=i=>im.data[i+3]>160&&im.data[i]>175&&im.data[i+1]>125&&im.data[i+2]>70&&im.data[i]>im.data[i+1]*1.025&&im.data[i+1]>im.data[i+2]*1.03;
 for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++){const p=y*im.width+x;if(seen.has(p)||!skin(p*4))continue;let stack=[p],n=0,sx=0,sy=0;seen.add(p);while(stack.length){const v=stack.pop(),xx=v%im.width,yy=Math.floor(v/im.width);n++;sx+=xx;sy+=yy;for(const k of [v-1,v+1,v-im.width,v+im.width]){const nx=k%im.width,ny=Math.floor(k/im.width);if(nx>=b.x0&&nx<=b.x1&&ny>=b.y0&&ny<=b.y1&&!seen.has(k)&&skin(k*4)){seen.add(k);stack.push(k);}}}out.push({n,cx:sx/n,cy:sy/n});}return out;
}
const manifest={version:1,method:'built-in imagegen; mechanical alpha crop, uniform resample and registration only',cell:256,anchor:[128,210],displayScale:.6705927599634632,directionRows:ROWS,bodies:{},weapons:{}};
for(const key of BODY_KEYS){if(!fs.existsSync(new URL('source/'+key+'.png',root)))continue;const im=read(key),bs=boxes(im,8),height=key.startsWith('mage')?174:160,scale=height/Math.max(...bs.map(b=>b.h)),atlas=new PNG({width:1024,height:2048}),frames=[];
 for(let i=0;i<32;i++){const b=bs[i],row=Math.floor(i/4),column=i%4,ox=128-headCenter(im,b)*scale,oy=210-height-b.y0*scale;copyScaled(im,b,atlas,column*256,row*256,scale,ox,oy);const grip=handGuess(im,b,key,row).map((v,k)=>Math.round((v*scale+(k?oy:ox))*10)/10);frames.push({row,column,x:column*256,y:row*256,w:256,h:256,grip,source:[b.x0,b.y0,b.w,b.h]});}
 fs.writeFileSync(new URL(key+'.png',root),PNG.sync.write(atlas));manifest.bodies[key]={role:key.split('_')[0],image:key+'.png',frames};console.log(key,bs.length,'frames');
}
for(const key of WEAPON_KEYS){if(!fs.existsSync(new URL('source/'+key+'.png',root)))continue;const im=read(key),bs=boxes(im,2),atlas=new PNG({width:1024,height:512}),frames=[];for(let i=0;i<8;i++){const b=bs[i],scale=210/b.h,ox=128-(b.x0+b.x1)*.5*scale,oy=20-b.y0*scale;copyScaled(im,b,atlas,(i%4)*256,Math.floor(i/4)*256,scale,ox,oy);const fraction=key.includes('longbow')?.5:key.includes('crossbow')?.72:key.endsWith('ember')?.79:key.startsWith('mage')?.64:.81;const ys=b.y0+b.h*fraction,xs=[];for(let y=Math.floor(ys-b.h*.016);y<=ys+b.h*.016;y++)for(let x=b.x0;x<=b.x1;x++)if(im.data[(y*im.width+x)*4+3]>160)xs.push(x);xs.sort((a,b)=>a-b);const gx=xs.length?xs[Math.floor(xs.length*.5)]:(b.x0+b.x1)*.5;frames.push({row:i,x:(i%4)*256,y:Math.floor(i/4)*256,w:256,h:256,grip:[gx*scale+ox,20+210*fraction]});}fs.writeFileSync(new URL(key+'.png',root),PNG.sync.write(atlas));manifest.weapons[key]={role:key.split('_')[0],image:key+'.png',frames};console.log(key,bs.length,'views');}
fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
