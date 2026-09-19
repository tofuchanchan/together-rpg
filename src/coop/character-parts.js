// Local PNG cutouts. Idle joints move rigidly; body, weapon, face and boots never warp.
export function accessoryMask(role,x,y,r,g,b,a){
 if(a<30)return false;
 if(role==='warrior')return y>95&&y<201&&r>g*1.45&&r>b*1.25&&r>80;
 if(role==='mage')return y<85&&x>48&&x<180&&b>g*1.3&&r>g*1.2;
 return y>155&&y<194&&(x<108||x>148)&&g>r*1.25&&g>b*1.08;
}
const canvas=size=>{const c=document.createElement('canvas');c.width=c.height=size;return c;};
export function splitAccessory(image,frame,size,role){
 const original=canvas(size),ctx=original.getContext('2d');ctx.drawImage(image,frame.x,frame.y,size,size,0,0,size,size);
 const data=ctx.getImageData(0,0,size,size),mask=new Uint8Array(size*size);let count=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;if(accessoryMask(role,x,y,...data.data.slice(i,i+4))){mask[y*size+x]=1;count++;}}
 if(count<15)return{body:original,part:null};
 // Include the ink immediately around the coloured accessory, not the adjacent body.
 const expanded=mask.slice();for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++)if(mask[y*size+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const n=(y+dy)*size+x+dx,i=n*4;if(data.data[i]<65&&data.data[i+1]<65&&data.data[i+2]<65)expanded[n]=1;}
 const part=canvas(size),pc=part.getContext('2d'),pd=pc.createImageData(size,size),body=ctx.createImageData(size,size);
 for(let n=0;n<mask.length;n++){const i=n*4;(expanded[n]?pd:body).data.set(data.data.slice(i,i+4),i);}
 ctx.putImageData(body,0,0);pc.putImageData(pd,0,0);
 return{body:original,part,pivot:role==='mage'?[126,84]:role==='warrior'?[128,128]:[128,155]};
}
// Locate enclosed dark eye/visor pixels, then change only those pixels to a pained squint.
// Back views deliberately have no face expression.
export function hurtFace(image,frame,size,row,role){
 const c=canvas(size),ctx=c.getContext('2d');ctx.drawImage(image,frame.x,frame.y,size,size,0,0,size,size);
 if([3,4,5].includes(row))return c;
 const data=ctx.getImageData(0,0,size,size),seen=new Uint8Array(size*size),eyes=[];
 let bounds={l:62,r:196,t:75,b:150};
 if(role!=='warrior'){
  const visited=new Uint8Array(size*size),faces=[];
  const skin=n=>{const i=n*4;return data.data[i+3]>180&&data.data[i]>165&&data.data[i+1]>125&&data.data[i]>data.data[i+2]*1.1;};
  for(let y=70;y<150;y++)for(let x=55;x<200;x++){const n=y*size+x;if(visited[n]||!skin(n))continue;const q=[n];visited[n]=1;let l=x,r=x,t=y,b=y;for(let k=0;k<q.length;k++){const z=q[k],zx=z%size,zy=Math.floor(z/size);l=Math.min(l,zx);r=Math.max(r,zx);t=Math.min(t,zy);b=Math.max(b,zy);for(const next of [z-1,z+1,z-size,z+size]){const nx=next%size,ny=Math.floor(next/size);if(nx>=55&&nx<200&&ny>=70&&ny<150&&!visited[next]&&skin(next)){visited[next]=1;q.push(next);}}}faces.push({l,r,t,b,area:q.length});}
  const face=faces.sort((a,b)=>b.area-a.area)[0];if(face&&face.area>100)bounds={l:face.l+3,r:face.r-3,t:Math.floor(face.t+(face.b-face.t)*.34),b:Math.ceil(face.t+(face.b-face.t)*.9)};
 }
 const dark=n=>data.data[n*4+3]>180&&data.data[n*4]<60&&data.data[n*4+1]<60&&data.data[n*4+2]<60;
 for(let y=bounds.t;y<=bounds.b;y++)for(let x=bounds.l;x<=bounds.r;x++){const n=y*size+x;if(seen[n]||!dark(n))continue;const q=[n];seen[n]=1;let l=x,r=x,t=y,b=y;
  for(let k=0;k<q.length;k++){const z=q[k],zx=z%size,zy=Math.floor(z/size);l=Math.min(l,zx);r=Math.max(r,zx);t=Math.min(t,zy);b=Math.max(b,zy);for(const next of [z-1,z+1,z-size,z+size])if(next%size>=bounds.l&&next%size<=bounds.r&&Math.floor(next/size)>=bounds.t&&Math.floor(next/size)<=bounds.b&&!seen[next]&&dark(next)){seen[next]=1;q.push(next);}}
  if(q.length>=8&&q.length<400&&b-t>=3&&b-t<29&&r-l<26&&(role==='warrior'||b-t>=(r-l)*.65))eyes.push({l,r,t,b,pixels:q});
 }
 const selected=eyes.sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,role==='warrior'?3:2).sort((a,b)=>a.l-b.l);
 const original=data.data.slice();
 for(const eye of selected){for(let y=eye.t-2;y<=eye.b+2;y++)for(let x=eye.l-2;x<=eye.r+2;x++){const n=y*size+x;if(role!=='warrior'&&(x<bounds.l||x>bounds.r))continue;let best=null,score=Infinity;for(let dy=-12;dy<=12;dy++)for(let dx=-12;dx<=12;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=size||yy<0||yy>=size)continue;const at=(yy*size+xx)*4,r=original[at],g=original[at+1],b=original[at+2],valid=original[at+3]>200&&(role==='warrior'?r>95&&Math.abs(r-g)<25&&Math.abs(g-b)<25:r>165&&g>125&&r>b*1.1);const d=dx*dx+dy*dy;if(valid&&!selected.some(eye=>xx>=eye.l-3&&xx<=eye.r+3&&yy>=eye.t-3&&yy<=eye.b+3)&&d<score){score=d;best=at;}}if(best!==null)for(let k=0;k<3;k++)data.data[n*4+k]=original[best+k];}}
 ctx.putImageData(data,0,0);ctx.strokeStyle='#181b16';ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round';
 for(const [index,{l,r,t,b}] of selected.entries()){const cy=(t+b)/2,cx=(l+r)/2,half=Math.min(5,(r-l)/2),leftEye=index===0,tip=leftEye?cx+half:cx-half,outer=leftEye?cx-half:cx+half;ctx.beginPath();if(role==='warrior'&&selected.length===3&&index===1){ctx.moveTo((l+r)/2,cy-3);ctx.lineTo((l+r)/2,cy+3);}else{ctx.moveTo(outer,cy-3);ctx.lineTo(tip,cy);ctx.lineTo(outer,cy+3);}ctx.stroke();}

 c.expression={bounds,eyes:selected.map(({l,r,t,b})=>({l,r,t,b}))};return c;
}
