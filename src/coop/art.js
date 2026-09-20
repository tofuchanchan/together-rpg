
export const INK='#182d27',CREAM='#fff0c7',CYAN='#57d5ce',ORANGE='#ffb15b';
export function ellipse(c,x,y,rx,ry,fill,stroke=INK,lw=3){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
export function path(c,pts,fill,stroke=INK,lw=3){c.beginPath();for(let i=0;i<pts.length;i++)i?c.lineTo(...pts[i]):c.moveTo(...pts[i]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.lineJoin='round';c.stroke();}}
export function line(c,pts,color=INK,width=3){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function box(c,x,y,w,h,r=10,fill='#162b26',stroke=INK,lw=3){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
export function uiFont(size=18,weight=500){return `${weight} ${size}px "Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif`;}
export function text(c,s,x,y,size=18,color=CREAM,align='left',weight=500){c.fillStyle=color;c.font=uiFont(size,weight);c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
export function heading(c,s,x,y,size=30,color=CREAM,align='left'){c.fillStyle=color;c.font=`400 ${size}px "Coop Headings","Microsoft YaHei UI",sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
export {hero} from './sprites.js';
export {bar,icon,enemy,rock,makeGround} from './world-art.js';
