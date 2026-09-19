// Registration and packing only: preserve painted pixels and their aspect ratio.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root='assets/characters/cel',manifest={version:1,source:'original idle + imagegen authored full-body cels',cell:512,directions:['SE','NE'],clips:{},registration:{}};
function bands(image,axis,from=0,to=image.height){
 const list=[],limit=axis==='y'?image.height:image.width;let start=-1,last=-1;
 for(let n=0;n<limit;n++){let count=0;for(let q=axis==='y'?0:from;q<(axis==='y'?image.width:to);q++){const x=axis==='y'?q:n,y=axis==='y'?n:q;if(image.data[(y*image.width+x)*4+3]>100)count++;}
  if(count>2){if(start<0)start=n;last=n;}else if(start>=0&&n-last>10){list.push([start,last]);start=-1;}
 }if(start>=0)list.push([start,last]);return list;
}
function register(im,l,t,r,b){
 const head=[],feet=[];for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){
  const i=(y*im.width+x)*4,[R,G,B,A]=im.data.subarray(i,i+4);if(A<180)continue;
  if(y<t+(b-t)*.59&&R>95&&Math.max(R,G,B)-Math.min(R,G,B)<23)head.push([x,y]);
  if(y>t+(b-t)*.73&&R>23&&R<120&&G>15&&G<R*.92&&B<G*1.1)feet.push([x,y]);
 }
 if(head.length<50||feet.length<15)throw Error('Missing helmet/boots in source frame');
 // Helmet pixels can include a raised blade: retain largest connected silver component.
 const set=new Set(head.map(([x,y])=>y*im.width+x)),groups=[];
 while(set.size){const first=set.values().next().value,q=[first];set.delete(first);for(let k=0;k<q.length;k++)for(const n of [q[k]-1,q[k]+1,q[k]-im.width,q[k]+im.width])if(set.delete(n))q.push(n);groups.push(q);}
 const main=groups.sort((a,b)=>b.length-a.length)[0],xs=main.map(n=>n%im.width),ys=main.map(n=>Math.floor(n/im.width));
 return{headWidth:Math.max(...xs)-Math.min(...xs),headX:(Math.min(...xs)+Math.max(...xs))/2,headTop:Math.min(...ys),ground:Math.max(...feet.map(p=>p[1]))};
}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
for(const dir of manifest.directions){
 const idle=PNG.sync.read(fs.readFileSync(`${root}/source/idle-${dir}.png`));manifest.registration[dir]=register(idle,0,0,255,255);
 for(const clip of ['walk','attack']){
  const im=PNG.sync.read(fs.readFileSync(`${root}/source/${dir}-${clip}.png`)),rows=bands(im,'y');if(rows.length!==2)throw Error(`${dir}-${clip}: expected2 rows got${rows.length}`);
  const frames=[];for(const [t,b] of rows){const cols=bands(im,'x',t,b+1);if(cols.length!==4)throw Error(`${dir}-${clip}: expected4 columns got${cols.length}`);for(const [l,r]of cols){if(l<3||t<3||r>im.width-4||b>im.height-4)throw Error('Clipped source frame');frames.push({l:l-3,t:t-3,r:r+3,b:b+3,...register(im,l,t,r,b)});}}
  const headWidth=median(frames.map(f=>f.headWidth)),reference=manifest.registration[dir],scale=reference.headWidth/headWidth;
  const deviations=frames.map(f=>f.headWidth/headWidth);if(deviations.some(v=>v<.85||v>1.15))throw Error(`${dir}-${clip}: unstable helmet size ${deviations}`);
  // Keep the source scale unchanged in the atlas. Browser applies ONE uniform scale per sheet.
  const cell=manifest.cell,atlas=new PNG({width:cell*4,height:cell*2});
  frames.forEach((f,i)=>{const w=f.r-f.l+1,h=f.b-f.t+1;if(w>cell-8||h>cell-8)throw Error(`Source frame exceeds ${cell}px cell`);const x=(i%4)*cell+Math.floor((cell-w)/2),y=Math.floor(i/4)*cell+Math.floor((cell-h)/2);PNG.bitblt(im,atlas,f.l,f.t,w,h,x,y);f.x=x;f.y=y;f.w=w;f.h=h;f.anchor=[f.headX-f.l,f.ground-f.t];});
  const file=`${dir}-${clip}.png`;fs.writeFileSync(`${root}/${file}`,PNG.sync.write(atlas));manifest.clips[`${dir}/${clip}`]={file,scale,headWidth,frames};
 }
}
fs.writeFileSync(`${root}/warrior.json`,JSON.stringify(manifest,null,2));console.log('Packed32 full-body animation cels, 2 original idle poses; per-sheet uniform scaling only.');
