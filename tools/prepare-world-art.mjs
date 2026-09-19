// Cropping, registration and packing only; all artwork is generated PNG imagery.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import {WORLD_SHEETS} from '../src/coop/world-art-defs.js';
const require=createRequire(import.meta.url),{PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root='assets/world',out='output/art-overhaul';fs.mkdirSync(out,{recursive:true});fs.mkdirSync(`${root}/ui`,{recursive:true});
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function intervals(counts,gap){let start=-1,last=-1;const result=[];for(let i=0;i<counts.length;i++){if(counts[i]>2){if(start<0)start=i;last=i;}else if(start>=0&&i-last>gap){result.push([start,last]);start=-1;}}if(start>=0)result.push([start,last]);return result;}
function bands(img,axis,lo,hi,expected){
 const size=axis==='y'?img.height:img.width,counts=[];
 for(let i=0;i<size;i++){let n=0;for(let j=lo;j<hi;j++){const x=axis==='y'?j:i,y=axis==='y'?i:j;if(img.data[(y*img.width+x)*4+3]>80)n++;}counts.push(n);}
 for(const gap of [0,1,2,3,5,10,16,24,32]){const runs=intervals(counts,gap);if(runs.length===expected)return runs;}
 // Disconnected sparks can make extra bands. Cut only in clear gutters near the expected grid.
 const edges=[0];for(let i=1;i<expected;i++){
  const center=size*i/expected,range=size/expected*.3;let best=-1,score=Infinity;
  for(let p=Math.floor(center-range);p<=center+range;p++){const value=counts.slice(p-3,p+4).reduce((a,b)=>a+(b||0),0)+Math.abs(p-center)*.001;if(value<score){score=value;best=p;}}
  if(score>1)throw new Error(`Cannot safely split ${axis} ${i}: foreground crosses gutter`);edges.push(best);
 }edges.push(size-1);return edges.slice(0,-1).map((a,i)=>[a,edges[i+1]]);
}
function bounds(img,x0,y0,x1,y1){let l=x1,r=x0,t=y1,b=y0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(img.data[(y*img.width+x)*4+3]>60){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}if(r<=l||b<=t)throw new Error('Empty art cell');return{x:Math.max(0,l-2),y:Math.max(0,t-2),w:r-l+5,h:b-t+5};}
function headCenter(img,b,kind){
 const values=[];for(let y=b.y;y<b.y+b.h*.65;y++)for(let x=b.x;x<b.x+b.w;x++){const i=(y*img.width+x)*4,[r,g,bl,a]=img.data.subarray(i,i+4);if(a>150&&(kind==='goblin'?g>r*1.15&&g>bl*1.1&&g>70:r>g*1.4&&r>bl*1.4&&r>110))values.push(x);}
 return values.length?median(values):b.x+b.w/2;
}
function headArea(img,kind){
 const mask=new Uint8Array(img.width*img.height);for(let p=0;p<mask.length;p++){const [r,g,b,a]=img.data.subarray(p*4,p*4+4);mask[p]=a>100&&(kind==='goblin'?g>r+4&&g>b*1.3&&g>55:r>g*1.4&&r>b*1.4&&r>80)?1:0;}
 let largest=0;for(let i=0;i<mask.length;i++){if(!mask[i])continue;const queue=[i];mask[i]=0;for(let k=0;k<queue.length;k++){const at=queue[k],x=at%img.width;for(const next of [x?at-1:-1,x<img.width-1?at+1:-1,at-img.width,at+img.width])if(next>=0&&next<mask.length&&mask[next]){mask[next]=0;queue.push(next);}}largest=Math.max(largest,queue.length);}return largest;
}
function splitSheet(img,sheet){
 const items=[];
 // Connected outlines separate overlapping row extents without cutting weapons.
 if(sheet.displayHeight){
  const labels=new Int32Array(img.width*img.height),components=[];let id=0;
  for(let i=0;i<labels.length;i++){
   if(labels[i]||img.data[i*4+3]<80)continue;const queue=[i];labels[i]=++id;let l=img.width,t=img.height,r=0,b=0;
   for(let k=0;k<queue.length;k++){
    const at=queue[k],x=at%img.width,y=Math.floor(at/img.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
    for(const next of [x?at-1:-1,x<img.width-1?at+1:-1,at-img.width,at+img.width])if(next>=0&&next<labels.length&&!labels[next]&&img.data[next*4+3]>=80){labels[next]=id;queue.push(next);}
   }
   if(queue.length>300)components.push({id,l,t,r,b});
  }
  if(components.length!==sheet.rows*sheet.cols)throw new Error(`${sheet.source}: expected ${sheet.rows*sheet.cols} isolated sprites, got ${components.length}`);
  components.sort((a,b)=>(a.t+a.b)-(b.t+b.b));fs.mkdirSync(`${root}/source/cuts`,{recursive:true});
  for(let row=0;row<sheet.rows;row++){
   const group=components.slice(row*sheet.cols,(row+1)*sheet.cols).sort((a,b)=>a.l-b.l);
   for(let col=0;col<sheet.cols;col++){
    const f=group[col],key=sheet.keys[row*sheet.cols+col],l=Math.max(0,f.l-2),t=Math.max(0,f.t-2),w=Math.min(img.width-l,f.r-l+3),h=Math.min(img.height-t,f.b-t+3),cut=new PNG({width:w,height:h});
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const src=(t+y)*img.width+l+x,other=labels[src];let own=other===f.id;
     if(!other&&img.data[src*4+3])for(let oy=-2;oy<=2&&!own;oy++)for(let ox=-2;ox<=2&&!own;ox++){const n=src+oy*img.width+ox;if(n>=0&&n<labels.length&&labels[n]===f.id)own=true;}
     if(own)img.data.copy(cut.data,(y*w+x)*4,src*4,src*4+4);
    }
    fs.writeFileSync(`${root}/source/cuts/${key}.png`,PNG.sync.write(cut));items.push({x:0,y:0,w,h,row,col,source:`cuts/${key}`,key,bitmap:cut});
   }
  }
 }else{
  const ys=bands(img,'y',0,img.width,sheet.rows);
  for(let row=0;row<sheet.rows;row++){
   const xs=bands(img,'x',ys[row][0],ys[row][1]+1,sheet.cols);
   for(let col=0;col<sheet.cols;col++)items.push({...bounds(img,xs[col][0],ys[row][0],xs[col][1],ys[row][1]),row,col,source:sheet.source,key:sheet.keys[row*sheet.cols+col]});
  }
 }
 return items.sort((a,b)=>a.row-b.row||a.col-b.col);
}
const pages={},frames={},report=[];
for(const sheet of WORLD_SHEETS){
 console.log(`Packing source: ${sheet.source}`);
 const img=PNG.sync.read(fs.readFileSync(`${root}/source/${sheet.source}.png`));
 const transparent=img.data.filter((_,i)=>i%4===3&&img.data[i]===0).length;
 if(transparent<img.width*img.height*.08)throw new Error(`${sheet.source} lacks transparent background`);
 const items=splitSheet(img,sheet);
 const correction=sheet.source==='goblin'?{source:'goblin-strikes',targets:[7,11,15]}:sheet.source==='mushroom'?{source:'mushroom-nw',targets:[12,13,14,15]}:null;
 if(correction){
  const fixImage=PNG.sync.read(fs.readFileSync(`${root}/source/${correction.source}.png`));
  if(fixImage.data.filter((_,i)=>i%4===3&&fixImage.data[i]===0).length<fixImage.width*fixImage.height*.08)throw new Error(`${correction.source} lacks transparent background`);
  const fixed=splitSheet(fixImage,{...sheet,source:correction.source,rows:1,cols:correction.targets.length,keys:correction.targets.map(i=>`${sheet.source}-fix-${i}`)});
  correction.targets.forEach((index,j)=>{const original=items[index],replacement=fixed[j],sourceScale=Math.sqrt(headArea(original.bitmap,sheet.source)/headArea(replacement.bitmap,sheet.source));items[index]={...replacement,row:original.row,col:original.col,key:original.key,sourceScale};});
  report.push({source:correction.source,frames:fixed.length,transparent:true,replaces:correction.targets.map(i=>sheet.keys[i])});
 }
 const page=pages[sheet.page]??={cell:sheet.cell,cols:sheet.page==='enemies'?8:4,items:[]};
 const bodyHeight=median(items.filter(f=>f.col<2).map(f=>f.h*(f.sourceScale||1)));let enemyScale=1;
 if(sheet.displayHeight){enemyScale=180/bodyHeight;for(const f of items){f.pivotX=headCenter(f.bitmap||img,f,sheet.source);f.pivotY=f.y+f.h-3;delete f.bitmap;}
  const safe=Math.min(1,...items.flatMap(f=>[118/Math.max(1,(f.pivotX-f.x)*enemyScale*(f.sourceScale||1)),118/Math.max(1,(f.x+f.w-f.pivotX)*enemyScale*(f.sourceScale||1)),208/Math.max(1,(f.pivotY-f.y)*enemyScale*(f.sourceScale||1))]));enemyScale*=safe;
 }
 for(const f of items){
  const i=page.items.length,c=sheet.cell,pad=10;
  const group=sheet.animation?items.filter(k=>k.row===f.row):[f];
  const factor=sheet.displayHeight?enemyScale*(f.sourceScale||1):(c-pad*2)/Math.max(...group.flatMap(k=>[k.w,k.h]));
  const width=f.w*factor,height=f.h*factor;
  const dx=sheet.displayHeight?c/2+(f.x-f.pivotX)*factor:(c-width)/2;
  const dy=sheet.displayHeight?c-38+(f.y-f.pivotY)*factor:(c-height)/2;
  const cellX=(i%page.cols)*c,cellY=Math.floor(i/page.cols)*c;
  page.items.push({...f,factor,dx:cellX+dx,dy:cellY+dy,dw:width,dh:height});
  frames[f.key]={page:sheet.page,x:cellX,y:cellY,w:c,h:c,content:[dx,dy,width,height],anchor:sheet.displayHeight?[.5,(c-38)/c]:sheet.page==='props'?[.5,(dy+height)/c]:[.5,.5],
   ...(sheet.displayHeight?{displayScale:sheet.displayHeight/(bodyHeight*enemyScale)}:{})};
 }
 report.push({source:sheet.source,frames:items.length,transparent:true});
}
const browser=await chromium.launch({headless:true});const p=await browser.newPage();
try{await p.goto('http://127.0.0.1:4173/');
 for(const [name,page] of Object.entries(pages)){
  const width=page.cols*page.cell,height=Math.ceil(page.items.length/page.cols)*page.cell;
  const data=await p.evaluate(async({page,width,height})=>{const images={};for(const key of new Set(page.items.map(f=>f.source))){const image=new Image();image.src=`/assets/world/source/${key}.png`;await image.decode();images[key]=image;}const cv=document.createElement('canvas');cv.width=width;cv.height=height;const c=cv.getContext('2d');c.imageSmoothingQuality='high';for(const f of page.items)c.drawImage(images[f.source],f.x,f.y,f.w,f.h,f.dx,f.dy,f.dw,f.dh);return cv.toDataURL('image/png').split(',')[1];},{page,width,height});
  const buffer=Buffer.from(data,'base64'),png=PNG.sync.read(buffer);let empty=0,clipped=0;
  for(let i=0;i<page.items.length;i++){const ox=i%page.cols*page.cell,oy=Math.floor(i/page.cols)*page.cell;let count=0,border=0;for(let y=0;y<page.cell;y++)for(let x=0;x<page.cell;x++){if(png.data[((oy+y)*width+ox+x)*4+3]>40){count++;if(x<2||y<2||x>page.cell-3||y>page.cell-3)border++;}}if(!count)empty++;if(border)clipped++;}
  if(empty||clipped)throw new Error(`${name}: empty ${empty}, clipped ${clipped}`);
  fs.writeFileSync(`${root}/${name}.png`,buffer);pages[name]={file:`${name}.png`,width,height,count:page.items.length};
 }
 // Export the same nine-slice source cells for the HTML shell's border-image.
 const ui=PNG.sync.read(fs.readFileSync(`${root}/ui.png`));
 for(const [key,f] of Object.entries(frames).filter(([,f])=>f.page==='ui')){const [cx,cy,cw,ch]=f.content,x=Math.floor(f.x+cx),y=Math.floor(f.y+cy),w=Math.ceil(cw),h=Math.ceil(ch),dest=new PNG({width:w,height:h});PNG.bitblt(ui,dest,x,y,w,h,0,0);fs.writeFileSync(`${root}/ui/${key}.png`,PNG.sync.write(dest));}
 fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({version:1,background:'forest.png',pages,frames},null,2));
 fs.writeFileSync(`${out}/atlas-report.json`,JSON.stringify({sources:report,pages,frames:Object.keys(frames).length,empty:0,clipped:0},null,2));
 console.log(`Packed ${Object.keys(frames).length} art cells; all non-empty with safe margins.`);
}finally{await browser.close();}
await import('./prepare-bestiary.mjs');
