// Measure the generated RGBA frames only. Artwork and its alpha remain untouched.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {PNG}=createRequire(import.meta.url)('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const assets={};
for(const [key,cols,rows] of [['mossbell',4,4],['nest',2,2],['beacon',2,2],['mossbell-sweep-v2',4,3],['mossbell-ritual-v2',4,4],['mossbell-bell-v2',4,3]]){
 const file=`source/${key}.png`,bytes=fs.readFileSync(`assets/adventure/${file}`),im=PNG.sync.read(bytes),frames=[];
 // Generated poses may extend beyond nominal grid boundaries. Identify each
 // complete opaque component before assigning it to its nearest grid cell.
 const seen=new Uint8Array(im.width*im.height),components=[];
 for(let pixel=0;pixel<seen.length;pixel++){
  if(seen[pixel]||im.data[pixel*4+3]<=30)continue;
  const queue=[pixel];seen[pixel]=1;let l=im.width,r=0,t=im.height,b=0;
  for(let at=0;at<queue.length;at++){
   const p=queue[at],x=p%im.width,y=Math.floor(p/im.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*im.width+nx;if(nx<0||nx>=im.width||ny<0||ny>=im.height||seen[n]||im.data[n*4+3]<=30)continue;seen[n]=1;queue.push(n);}
  }
  if(queue.length>800)components.push({x:Math.max(0,l-1),y:Math.max(0,t-1),w:r-l+3,h:b-t+3,area:queue.length,cx:(l+r)/2,cy:(t+b)/2,pixels:queue});
 }
 if(key.startsWith('mossbell')&&components.length!==cols*rows)throw Error(`${key}: expected ${cols*rows} isolated poses, got ${components.length}`);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const matches=components.filter(f=>Math.floor(f.cx/(im.width/cols))===col&&Math.floor(f.cy/(im.height/rows))===row);
  if(!matches.length||key.startsWith('mossbell')&&matches.length!==1)throw Error(`${key}/${frames.length}: ambiguous pose`);
  const x=Math.min(...matches.map(f=>f.x)),y=Math.min(...matches.map(f=>f.y));
  const frame={x,y,w:Math.max(...matches.map(f=>f.x+f.w))-x,h:Math.max(...matches.map(f=>f.y+f.h))-y};
  if(key.startsWith('mossbell')){
   // Some generated poses lean across nominal cells. Their rectangular bounds
   // can contain a neighbour's hand; clip those frames to their own row envelope.
   // This is crop metadata only: the source PNG and original alpha stay intact.
   const own=matches[0],intrudes=components.some(c=>c!==own&&c.pixels.some(p=>{const px=p%im.width,py=Math.floor(p/im.width);return px>=x&&px<x+frame.w&&py>=y&&py<y+frame.h;}));
   if(intrudes){
    const bands=Array.from({length:frame.h},()=>[Infinity,-Infinity]);
    for(const p of own.pixels){const px=p%im.width-x,py=Math.floor(p/im.width)-y;for(let dy=-1;dy<=1;dy++){const b=bands[py+dy];if(b){b[0]=Math.min(b[0],Math.max(0,px-1));b[1]=Math.max(b[1],Math.min(frame.w,px+2));}}}
    frame.clip=[];
    bands.forEach(([left,right],top)=>{if(!Number.isFinite(left))return;const last=frame.clip.at(-1);if(last&&last[0]===left&&last[2]===right-left&&last[1]+last[3]===top)last[3]++;else frame.clip.push([left,top,right-left,1]);});
   }
   // Find the warm lower clapper independently of the moving weapon's bounds.
   let total=0,sx=0,sy=0;
   for(let py=Math.floor(y+frame.h*.64);py<y+frame.h*.94;py++)for(let px=x;px<x+frame.w;px++){
    const at=(py*im.width+px)*4,[r,g,b,a]=im.data.subarray(at,at+4);
    if(a>180&&r>220&&g>115&&g<230&&b<105){const weight=r-b;sx+=px*weight;sy+=py*weight;total+=weight;}
   }
   const core={x:total?sx/total:x+frame.w*.55,y:total?sy/total:y+frame.h*.78};
   // Feet sit below the bell, not at the center of an asymmetric raised mallet.
   let feet=0,fx=0,footY=0;
   for(let py=Math.floor(y+frame.h*.85);py<y+frame.h;py++)for(let px=Math.max(x,Math.floor(core.x-frame.w*.30));px<Math.min(x+frame.w,core.x+frame.w*.28);px++){
    const at=(py*im.width+px)*4,[r,g,b,a]=im.data.subarray(at,at+4);
    if(a>180&&r>45&&r<160&&r>g*1.12&&g>b*1.08){feet++;fx+=px;footY=Math.max(footY,py);}
   }
   frame.anchor={x:Math.round((feet?fx/feet:core.x)-x),y:(feet?footY:y+frame.h)-y};
   frame.core={x:Math.round(core.x-x),y:Math.round(core.y-y)};
  }
  frames.push(frame);
 }
 if(key==='mossbell-ritual-v2'){frames[4].anchor.y=211;frames[5].anchor.y=211;}
 assets[key]={file,width:im.width,height:im.height,frames,referenceHeight:frames[0].h,sha256:createHash('sha256').update(bytes).digest('hex')};
}
fs.writeFileSync('assets/adventure/manifest.json',JSON.stringify({version:2,source:'built-in imagegen; unchanged transparent PNG; measured clapper and foot anchors',assets},null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,{frames:v.frames.length,width:v.width,height:v.height}]))));
