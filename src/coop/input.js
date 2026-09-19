import {analog,clamp} from './model.js';
const KEYS=[{left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',skill1:'KeyQ',skill2:'KeyE',dodge:'Space',confirm:'KeyE'},{left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',skill1:'Numpad1',skill2:'Numpad2',dodge:'Numpad0',confirm:'Enter'}];
export class InputRouter{
 constructor(){this.slots=[{type:'keyboard',id:0},{type:'keyboard',id:1}];this.held=new Set();this.edges=new Set();this.padPrevious=new Map();this.blocked=new Set();this.awaiting=null;this.disconnected=[];this.suppress=false;}
 key(code,down,repeat=false){if(down){if(!this.held.has(code)&&!repeat)this.edges.add(code);this.held.add(code);}else{this.held.delete(code);this.blocked.delete(code);}}
 bind(slot,device){if(this.slots.some((s,i)=>i!==slot&&s.type===device.type&&s.id===device.id))return false;this.slots[slot]={...device};this.awaiting=null;this.flush();return true;}
 claim(slot){this.awaiting=slot;}
 flush(){for(const k of this.held)this.blocked.add(k);this.edges.clear();this.suppress=true;}
 blur(){this.held.clear();this.edges.clear();this.blocked.clear();this.suppress=true;}
 sample(pads=[]){const byId=new Map(pads.filter(Boolean).map(p=>[p.index,p]));const prev=this.padPrevious,down=new Map();
  for(const p of byId.values()){const old=prev.get(p.index)||[];const buttons=p.buttons.map(b=>!!b.pressed);down.set(p.index,buttons.map((v,i)=>v&&!old[i]));if(this.awaiting!==null&&buttons.some((v,i)=>v&&!old[i]))this.bind(this.awaiting,{type:'gamepad',id:p.index,label:p.mapping==='standard'?'手柄':'手柄 · 未识别布局'});}
  this.disconnected=[];for(let i=0;i<2;i++){const s=this.slots[i];if(s.type==='gamepad'&&!byId.has(s.id)){this.disconnected.push(i);this.slots[i]={type:'disconnected',id:s.id};}else if(s.type==='disconnected')this.disconnected.push(i);}
  const suppress=this.suppress;
  const result=this.slots.map(s=>{let o={x:0,y:0,skill1:false,skill2:false,dodge:false,confirm:false,up:false,down:false,pause:false};if(s.type==='keyboard'){const k=KEYS[s.id],held=c=>this.held.has(c)&&!this.blocked.has(c),edge=c=>!this.blocked.has(c)&&this.edges.has(c);o.x=+held(k.right)-+held(k.left);o.y=+held(k.down)-+held(k.up);const m=Math.hypot(o.x,o.y);if(m>1){o.x/=m;o.y/=m;}for(const a of ['skill1','skill2','dodge','confirm','up','down'])o[a]=edge(k[a]);o.pause=edge('Escape')||edge('KeyP');}else if(s.type==='gamepad'){const p=byId.get(s.id),b=down.get(s.id)||[],v=analog(p.axes[0]||0,p.axes[1]||0);o.x=v.x;o.y=v.y;const edge=i=>!suppress&&!!b[i];o.skill1=edge(2);o.skill2=edge(3);o.dodge=edge(0);o.confirm=edge(0);o.pause=edge(9);o.up=edge(12);o.down=edge(13);const old=prev.get(s.id)?.stick||0,stick=(p.axes[1]||0)>.55?1:(p.axes[1]||0)<-.55?-1:0;o.up||=!suppress&&stick===-1&&old!==-1;o.down||=!suppress&&stick===1&&old!==1;}
   return o;});
  this.padPrevious=new Map([...byId].map(([id,p])=>{const a=p.buttons.map(b=>!!b.pressed);a.stick=(p.axes[1]||0)>.55?1:(p.axes[1]||0)<-.55?-1:0;return[id,a];}));this.edges.clear();this.suppress=false;return result;
 }
 labels(slot){const s=this.slots[slot];return s.type==='gamepad'?['X','Y','A']:s.type==='disconnected'?['—','—','—']:s.id===0?['Q','E','SPACE']:['NUM 1','NUM 2','NUM 0'];}
 describe(slot){const s=this.slots[slot];return s.type==='keyboard'?(s.id===0?'键盘 · WASD':'键盘 · 方向键'):s.type==='gamepad'?`手柄 ${s.id+1}`:'设备已断开';}
}

