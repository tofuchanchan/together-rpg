// Mechanical registration of separately painted PNG parts. No body masks or inpainting.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root='assets/characters/layered';
const sheets={body:['head','helmet-silver','torso','pelvis','leg-right','leg-left'],limbs:['upper-right','fore-right','hand-right','upper-left','fore-left','hand-left'],equipment:['sword','axe','shield-kite','shield-round','cape-red','helmet-bronze']};
const manifest={version:1,source:'imagegen independent painted parts',directions:['S','SW','W','NW','N','NE','E','SE'],pages:{},parts:{}};
for(const [name,rows] of Object.entries(sheets)){
 const image=PNG.sync.read(fs.readFileSync(`${root}/source/warrior-${name}.png`)),{width:w,height:h,data}=image;
 const seen=new Uint8Array(w*h),groups=[];let transparent=0;
 for(let n=0;n<w*h;n++){
  if(!data[n*4+3])transparent++;if(seen[n]||data[n*4+3]<80)continue;
  const q=[n];seen[n]=1;let l=w,r=0,t=h,b=0;
  for(let k=0;k<q.length;k++){const at=q[k],x=at%w,y=Math.floor(at/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,z=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[z]&&data[z*4+3]>=80){seen[z]=1;q.push(z);}}
  }if(q.length>500)groups.push({l,r,t,b,area:q.length});
 }
 if(transparent<w*h*.15||groups.length!==48)throw Error(`${name}: expected transparent 48-part source, got ${groups.length}`);
 groups.sort((a,b)=>(a.t+a.b)-(b.t+b.b));const ordered=[];
 for(let row=0;row<6;row++)ordered.push(...groups.slice(row*8,row*8+8).sort((a,b)=>a.l-b.l));
 const page=new PNG({width:2048,height:1536});
 for(let row=0;row<6;row++)for(let col=0;col<8;col++){
  const g=ordered[row*8+col];
  if(g.l<3||g.t<3||g.r>w-4||g.b>h-4)throw Error(`${name}/${row}/${col}: source touches canvas edge; repaint before packing`);
  const l=g.l-3,t=g.t-3,cw=g.r+4-l,ch=g.b+4-t;
  if(cw>248||ch>248)throw Error(`${name}/${row}/${col}: source part exceeds packing cell`);
  const x=col*256+Math.floor((256-cw)/2),y=row*256+Math.floor((256-ch)/2);
  for(let yy=0;yy<ch;yy++)data.copy(page.data,((y+yy)*2048+x)*4,((t+yy)*w+l)*4,((t+yy)*w+l+cw)*4);
  const key=`${rows[row]}/${manifest.directions[col]}`;
  const part={page:name,x,y,w:cw,h:ch,source:[l,t,cw,ch],pivot:[.5,.5]};
  if(['sword','axe'].includes(rows[row])){
   // Register the actual painted handle, not the bounding-box center of an asymmetric axe.
   const yy=Math.round(ch*.84);let sum=0,weight=0;
   for(let xx=0;xx<cw;xx++){const alpha=data[((t+yy)*w+l+xx)*4+3];if(alpha>100){sum+=xx*alpha;weight+=alpha;}}
   if(!weight)throw Error(`${key}: handle registration is empty`);part.pivot=[sum/weight/cw,yy/ch];
   let tip=[.5,0],farthest=-1;for(let sy=0;sy<ch*.4;sy++)for(let sx=0;sx<cw;sx++)if(data[((t+sy)*w+l+sx)*4+3]>180){const d=(sx-part.pivot[0]*cw)**2+(sy-yy)**2;if(d>farthest){farthest=d;tip=[sx/cw,sy/ch];}}
   part.tip=tip;
  }
  manifest.parts[key]=part;
 }
 fs.writeFileSync(`${root}/${name}.png`,PNG.sync.write(page));manifest.pages[name]={file:`${name}.png`,width:2048,height:1536};
}
fs.writeFileSync(`${root}/warrior.json`,JSON.stringify(manifest,null,2));
console.log(`Registered ${Object.keys(manifest.parts).length} independent PNG parts across eight views.`);
