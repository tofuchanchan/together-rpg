// Atlas registration only: source artwork is generated, never drawn by this script.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import {ENEMIES} from '../src/coop/enemies.js';
const require=createRequire(import.meta.url),{PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root='assets/world',source=fs.readFileSync(`${root}/source/bestiary.png`),img=PNG.sync.read(source);
const kinds=Object.keys(ENEMIES).slice(2),frames=[];
if(img.data.filter((v,i)=>i%4===3&&v===0).length<img.width*img.height*.1)throw Error('Source must have transparency');
const labels=new Int32Array(img.width*img.height),components=[];
for(let i=0;i<labels.length;i++){if(labels[i]||img.data[i*4+3]<60)continue;const id=components.length+1,q=[i];labels[i]=id;let l=img.width,r=0,t=img.height,b=0;for(let k=0;k<q.length;k++){const n=q[k],x=n%img.width,y=Math.floor(n/img.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const z of [x?n-1:-1,x<img.width-1?n+1:-1,n-img.width,n+img.width])if(z>=0&&z<labels.length&&!labels[z]&&img.data[z*4+3]>=60){labels[z]=id;q.push(z);}}components.push({id,l,r,t,b,area:q.length});}
const bodies=components.filter(c=>c.area>5000).sort((a,b)=>(a.t+a.b)-(b.t+b.b));if(bodies.length!==32)throw Error('Expected 32 distinct monster silhouettes');
const ordered=[];for(let row=0;row<8;row++)ordered.push(...bodies.slice(row*4,row*4+4).sort((a,b)=>a.l-b.l));
const owner=new Map(components.map(c=>[c.id,ordered.reduce((best,m,i)=>{const distance=Math.hypot((c.l+c.r-m.l-m.r)/2,(c.t+c.b-m.t-m.b)/2);return distance<best.d?{i,d:distance}:best;},{i:0,d:Infinity}).i]));
for(let row=0;row<8;row++){
 const cells=[];for(let col=0;col<4;col++){const index=row*4+col,parts=components.filter(c=>owner.get(c.id)===index),body=ordered[index],l=Math.max(0,Math.min(...parts.map(c=>c.l))-2),r=Math.min(img.width-1,Math.max(...parts.map(c=>c.r))+2),t=Math.max(0,Math.min(...parts.map(c=>c.t))-2),b=Math.min(img.height-1,Math.max(...parts.map(c=>c.b))+2),cut=new PNG({width:r-l+1,height:b-t+1});
  for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const at=y*img.width+x;let own=owner.get(labels[at])===index;if(!labels[at]&&img.data[at*4+3])for(let dy=-2;dy<=2&&!own;dy++)for(let dx=-2;dx<=2&&!own;dx++)own=owner.get(labels[at+dy*img.width+dx])===index;if(own)img.data.copy(cut.data,((y-t)*cut.width+x-l)*4,at*4,at*4+4);}
  cells.push({x:0,y:0,w:cut.width,h:cut.height,url:'data:image/png;base64,'+PNG.sync.write(cut).toString('base64'),pivotX:(body.l+body.r)/2-l,pivotY:body.b-t,bodyHeight:body.b-body.t});
 }
 const bodyHeight=(cells[0].bodyHeight+cells[1].bodyHeight)/2,scale=Math.min(180/bodyHeight,...cells.flatMap(c=>[116/Math.max(c.pivotX,c.w-c.pivotX),206/Math.max(1,c.pivotY),30/Math.max(1,c.h-c.pivotY)]));
 cells.forEach((c,col)=>{const index=row*4+col,cx=index%8*256,cy=Math.floor(index/8)*256;frames.push({...c,key:kinds[row]+'-'+col,cx,cy,dx:cx+128-c.pivotX*scale,dy:cy+218-c.pivotY*scale,dw:c.w*scale,dh:c.h*scale,displayScale:ENEMIES[kinds[row]].size/(bodyHeight*scale)});});
}
const browser=await chromium.launch({headless:true});try{const p=await browser.newPage();const result=await p.evaluate(async({url,frames})=>{const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');for(const f of frames){const image=new Image();image.src=f.url;await image.decode();ctx.drawImage(image,0,0,f.w,f.h,f.dx,f.dy,f.dw,f.dh);}return c.toDataURL('image/png');},{url:`data:image/png;base64,${source.toString('base64')}`,frames});fs.writeFileSync(`${root}/bestiary.png`,Buffer.from(result.split(',')[1],'base64'));}finally{await browser.close();}
const packed=PNG.sync.read(fs.readFileSync(`${root}/bestiary.png`));for(const f of frames){let count=0,border=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(packed.data[((f.cy+y)*packed.width+f.cx+x)*4+3]>40){count++;if(x<2||x>253||y<2||y>253)border++;}if(!count||border)throw Error(`${f.key}: empty or clipped frame`);}
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`));manifest.pages.bestiary={file:'bestiary.png',width:2048,height:1024,count:32};for(const f of frames)manifest.frames[f.key]={page:'bestiary',x:f.cx,y:f.cy,w:256,h:256,content:[f.dx-f.cx,f.dy-f.cy,f.dw,f.dh],anchor:[.5,218/256],displayScale:f.displayScale};fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2));console.log(`Packed ${frames.length} monster poses; non-empty and unclipped. 10 distinct species available.`);
const reportPath='output/art-overhaul/atlas-report.json';if(fs.existsSync(reportPath)){const report=JSON.parse(fs.readFileSync(reportPath));report.sources=report.sources.filter(s=>s.source!=='bestiary');report.sources.push({source:'bestiary',frames:32,transparent:true});report.pages.bestiary=manifest.pages.bestiary;report.frames=Object.keys(manifest.frames).length;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));}
