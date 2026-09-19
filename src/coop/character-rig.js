import {hurtFace} from './character-parts.js';
// Authored cutout boundaries in the existing 256px PNG cells, ordered S..SE.
// Every moving piece is a rigid original bitmap. Heads and torsos are never warped.
const ARMS={
 warrior:[
  [[91,147],[[38,78],[74,78],[85,128],[96,137],[96,174],[65,177],[45,146]]],
  [[101,148],[[32,77],[68,77],[83,123],[96,132],[105,173],[65,174],[44,149]]],
  [[107,147],[[41,75],[75,75],[91,128],[108,139],[108,168],[70,178],[52,145]]],
  [[172,138],[[180,110],[187,72],[221,64],[229,129],[194,158],[171,152],[171,137]]],
  [[163,145],[[177,91],[211,79],[226,118],[199,144],[197,177],[165,177],[151,155],[153,138],[173,128]]],
  [[157,146],[[171,91],[210,82],[225,122],[192,146],[189,176],[156,177],[142,158],[145,138],[169,129]]],
  [[164,147],[[179,88],[216,78],[230,120],[202,143],[190,170],[163,173],[156,145],[178,128]]],
  [[103,155],[[72,149],[118,151],[121,165],[152,170],[168,181],[164,194],[123,199],[84,190],[70,177]]],
 ],
 mage:[
  [[92,164],[[27,85],[78,86],[80,147],[93,155],[90,181],[77,196],[57,182],[47,143]]],
  [[91,158],[[20,77],[70,77],[78,144],[92,149],[93,174],[73,190],[55,174],[42,132]]],
  [[90,159],[[23,73],[76,74],[80,138],[94,148],[92,173],[73,191],[55,173],[40,133]]],
  [[89,150],[[19,62],[70,65],[79,126],[91,141],[86,169],[61,176],[51,130]]],
  [[170,157],[[179,75],[225,77],[223,124],[199,145],[193,178],[176,183],[170,154],[176,126]]],
  [[172,159],[[184,75],[230,77],[229,126],[201,147],[195,182],[171,187],[167,157],[181,130]]],
  [[166,163],[[185,77],[230,80],[229,128],[198,146],[190,179],[169,190],[159,168],[174,139]]],
  [[172,163],[[188,84],[236,86],[234,132],[206,147],[193,182],[173,193],[163,173],[177,145]]],
 ],
 archer:[
  [[172,159],[[180,93],[211,93],[209,144],[199,189],[177,205],[164,183],[165,153]]],
  [[94,159],[[43,103],[70,103],[80,144],[102,151],[104,179],[80,197],[59,189],[53,144]]],
  [[95,157],[[42,107],[70,105],[85,145],[106,155],[105,181],[80,198],[58,187],[51,146]]],
  [[91,150],[[40,92],[68,91],[78,133],[94,138],[100,163],[77,181],[57,172],[50,139]]],
  [[88,152],[[40,87],[70,87],[77,132],[95,140],[96,171],[71,184],[49,166],[47,130]]],
  [[171,160],[[175,94],[228,94],[228,154],[204,189],[181,201],[163,183],[161,153]]],
  [[168,159],[[174,94],[226,94],[226,148],[203,188],[179,201],[158,184],[156,158],[168,144]]],
  [[168,160],[[166,90],[225,90],[225,146],[201,192],[177,204],[157,180],[155,157],[164,141]]],
 ],
};
const canvas=size=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;};
function cleanPieces(c,keepBody=false){
 const ctx=c.getContext('2d'),w=c.width,data=ctx.getImageData(0,0,w,w),seen=new Uint8Array(w*w),groups=[];
 for(let n=0;n<w*w;n++){if(seen[n]||data.data[n*4+3]<25)continue;const q=[n];seen[n]=1;for(let k=0;k<q.length;k++){const z=q[k],x=z%w,y=Math.floor(z/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,at=yy*w+xx;if(xx<0||yy<0||xx>=w||yy>=w||seen[at]||data.data[at*4+3]<25)continue;seen[at]=1;q.push(at);}}groups.push(q);}
 groups.sort((a,b)=>b.length-a.length);const mask=new Uint8Array(w*w);for(const group of groups.filter((g,i)=>i===0||(!keepBody&&g.length>Math.max(25,groups[0].length*.05))))for(const n of group){const x=n%w,y=Math.floor(n/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<w)mask[(y+dy)*w+x+dx]=1;}
 for(let n=0;n<mask.length;n++)if(!mask[n])data.data[n*4+3]=0;ctx.putImageData(data,0,0);
}
// Convex helmet outline from its connected metal pixels, preserving the black face details.
function helmetOutline(pixels,size){
 const seen=new Uint8Array(size*size),groups=[];
 const metal=n=>{const i=n*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];return pixels[i+3]>160&&r>65&&g>65&&b>65&&Math.max(r,g,b)-Math.min(r,g,b)<35;};
 for(let y=50;y<146;y++)for(let x=80;x<184;x++){const n=y*size+x;if(seen[n]||!metal(n))continue;const q=[n];seen[n]=1;for(let k=0;k<q.length;k++)for(const next of [q[k]-1,q[k]+1,q[k]-size,q[k]+size]){const xx=next%size,yy=Math.floor(next/size);if(xx>=80&&xx<184&&yy>=50&&yy<146&&!seen[next]&&metal(next)){seen[next]=1;q.push(next);}}groups.push(q);}
 const points=(groups.sort((a,b)=>b.length-a.length)[0]||[]).map(n=>[n%size,Math.floor(n/size)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=pts=>{const h=[];for(const p of pts){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};
 return [...half(points),...half([...points].reverse())];
}
export function makeCharacterRig(image,frame,size,row,role,repairFrame){
 const body=canvas(size),bc=body.getContext('2d');bc.drawImage(image,frame.x,frame.y,size,size,0,0,size,size);const data=bc.getImageData(0,0,size,size),original=data.data.slice();
 const [pivot,poly]=ARMS[role][row],arm=canvas(size),ac=arm.getContext('2d'),ad=ac.createImageData(size,size);
 const feet=[canvas(size),canvas(size)],fd=feet.map(c=>c.getContext('2d').createImageData(size,size)),footStats=[{x:0,n:0},{x:0,n:0}];
 const cut=role==='warrior'?188:191,armMask=new Uint8Array(size*size);
 const helmet=role==='warrior'?helmetOutline(original,size):null;
 let faceBounds=null;
 if(role!=='warrior'){const seen=new Uint8Array(size*size),groups=[];const skin=n=>{const i=n*4;return original[i+3]>180&&original[i]>180&&original[i+1]>135&&original[i+2]>80&&original[i]>original[i+2]*1.05;};for(let y=85;y<160;y++)for(let x=64;x<195;x++){const n=y*size+x;if(seen[n]||!skin(n))continue;const q=[n];seen[n]=1;let l=x,r=x,t=y,b=y;for(let k=0;k<q.length;k++){const at=q[k],xx=at%size,yy=Math.floor(at/size);l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);for(const next of [at-1,at+1,at-size,at+size]){const nx=next%size,ny=Math.floor(next/size);if(nx>=64&&nx<195&&ny>=85&&ny<160&&!seen[next]&&skin(next)){seen[next]=1;q.push(next);}}}groups.push({l:l-4,r:r+4,t:t-4,b:b+4,n:q.length});}faceBounds=groups.sort((a,b)=>b.n-a.n)[0];}
 const protectedPixels=new Uint8Array(size*size);
 const protect=(x,y,i)=>{const r=original[i],g=original[i+1],b=original[i+2];if(role==='warrior')return (g>r+18&&g>b+5)||(r>g+40&&r>b+30)||inside(x,y,helmet);return (role==='mage'?b>g+28&&r>g+18:g>r+20&&g>b+10)||(faceBounds&&x>=faceBounds.l&&x<=faceBounds.r&&y>=faceBounds.t&&y<=faceBounds.b);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=y*size+x,i=n*4;if(original[i+3]>0){if(original[i+3]>100&&protect(x,y,i))protectedPixels[n]=1;}}
 // Keep garment and face outlines with their rigid body, including antialias pixels.
 const protectedCore=protectedPixels.slice();
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++)if(protectedCore[y*size+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)protectedPixels[(y+dy)*size+x+dx]=1;
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++){const n=y*size+x,i=n*4;if(original[i+3]&&!protectedPixels[n]&&inside(x,y,poly))ad.data.set(original.slice(i,i+4),i);}
 ac.putImageData(ad,0,0);cleanPieces(arm,false);const armPixels=ac.getImageData(0,0,size,size).data;
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++){const n=y*size+x,i=n*4;if(!original[i+3])continue;
  if(armPixels[i+3]){armMask[n]=1;data.data[i+3]=0;}
  else if(y>=cut&&x>76&&x<179&&original[i]<95&&original[i+1]<85&&original[i+2]<80){
   // Keep cloak/robe outlines attached to the garment above the feet.
   let cloth=false;for(let dy=-2;dy<=2&&!cloth;dy++)for(let dx=-2;dx<=2;dx++){const j=((y+dy)*size+x+dx)*4;if(original[j+3]>100&&(original[j]>100||original[j+1]>100||original[j+2]>100)){cloth=true;break;}}
   if(!cloth){const side=x<128?0:1;fd[side].data.set(original.slice(i,i+4),i);footStats[side].x+=x*original[i+3];footStats[side].n+=original[i+3];if(y>=cut+3)data.data[i+3]=0;}
  }
 }
 // Restore the tiny shirt area hidden by the original hand, copying nearby shirt pixels.
 // Repair stays under the arm socket and never touches head, face or outer silhouette.
 for(let y=142;y<187;y++)for(let x=94;x<169;x++){const n=y*size+x;if(!armMask[n])continue;let best=-1,score=Infinity;
  for(let dy=-10;dy<=10;dy++)for(let dx=-18;dx<=18;dx++){const xx=x+dx,yy=y+dy;if(xx<97||xx>165||yy<144||yy>185||armMask[yy*size+xx])continue;const j=(yy*size+xx)*4,r=original[j],g=original[j+1],b=original[j+2];const shirt=role==='mage'?b>g*1.3&&r>g*1.2:g>r*1.25&&g>b*.8;if(original[j+3]>200&&shirt&&dx*dx+dy*dy<score){best=j;score=dx*dx+dy*dy;}}
  if(best>=0&&score<150)data.data.set(original.slice(best,best+4),n*4);
 }
 if(repairFrame){const repair=canvas(size),rc=repair.getContext('2d');rc.drawImage(image,repairFrame.x,repairFrame.y,size,size,0,0,size,size);const pixels=rc.getImageData(0,0,size,size).data;for(let y=144;y<194;y++)for(let x=94;x<173;x++){const n=y*size+x,i=n*4;const source=((y+(role==='warrior'&&row===7?8:0))*size+x)*4;const grey=Math.abs(pixels[source]-pixels[source+1])<20&&Math.abs(pixels[source+1]-pixels[source+2])<20&&pixels[source]>85;if(armMask[n]&&((x-132)/38)**2+((y-169)/31)**2<1&&pixels[source+3]>180&&!(role==='warrior'&&grey))data.data.set(pixels.slice(source,source+4),i);}}
 bc.putImageData(data,0,0);cleanPieces(body,true);feet.forEach((c,i)=>c.getContext('2d').putImageData(fd[i],0,0));
 feet.forEach(f=>cleanPieces(f,true));
 return{body,arm,pivot,feet,hips:footStats.map((p,i)=>[p.n?p.x/p.n:(i?148:108),cut]),behind:[3,4,5].includes(row),row,frame,size,role};
}
export function rigHurtBody(rig,image){
 if(rig.hurtBody)return rig.hurtBody;
 const hurt=hurtFace(image,rig.frame,rig.size,rig.row,rig.role),body=canvas(rig.size),c=body.getContext('2d');c.drawImage(rig.body,0,0);
 for(const e of hurt.expression?.eyes||[]){const x=e.l-3,y=e.t-3,w=e.r-e.l+7,h=e.b-e.t+7;c.drawImage(hurt,x,y,w,h,x,y,w,h);}
 return rig.hurtBody=body;
}
export function drawCharacterRig(c,rig,joints,anchor,hurt,image){
 const [ax,ay]=anchor;
 const part=(image,pivot,motion)=>{c.save();c.translate(pivot[0]-ax+motion.x,pivot[1]-ay+motion.y);c.rotate(motion.rotation);c.drawImage(image,-pivot[0],-pivot[1]);c.restore();};
 if(rig.behind)part(rig.arm,rig.pivot,joints.arm);
 rig.feet.forEach((f,i)=>part(f,rig.hips[i],joints.feet[i]));
 c.drawImage(hurt?rigHurtBody(rig,image):rig.body,-ax,-ay);
 if(!rig.behind)part(rig.arm,rig.pivot,joints.arm);
}
