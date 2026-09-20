import {analog} from './model.js';
const KEYS=[{left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',skill1:'KeyQ',skill2:'KeyE',dodge:'Space',confirm:'KeyE',reroll:'KeyR'},{left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',skill1:'Numpad1',skill2:'Numpad2',dodge:'Numpad0',confirm:'Enter',reroll:'Numpad3'}];
const emptyInput=()=>({x:0,y:0,skill1:false,skill2:false,dodge:false,confirm:false,cancel:false,reroll:false,up:false,down:false,left:false,right:false,pause:false,archive:false,tabLeft:false,tabRight:false});
export class InputRouter{
 constructor(){this.slots=[{type:'keyboard',id:0},{type:'keyboard',id:1}];this.held=new Set();this.blocked=new Set();this.edges=new Set();this.padPrevious=new Map();this.padInputs=new Map();this.disconnected=[];this.awaiting=null;this.claimHandled=false;this.suppress=false;}
 key(code,down,repeat=false){if(down){if(!this.held.has(code)&&!repeat)this.edges.add(code);this.held.add(code);}else{this.held.delete(code);this.blocked.delete(code);}}
 bind(slot,device){if(this.slots.some((s,i)=>i!==slot&&s.type===device.type&&s.id===device.id))return false;this.slots[slot]={...device};this.awaiting=null;this.flush();return true;}
 claim(slot){this.awaiting=slot;}
 flush(){for(const k of this.held)this.blocked.add(k);this.edges.clear();this.suppress=true;}
 blur(){this.held.clear();this.edges.clear();this.blocked.clear();this.suppress=true;}
 sample(pads=[]){
  const byId=new Map(pads.filter(Boolean).map(p=>[p.index,p])),prev=this.padPrevious,down=new Map();this.claimHandled=this.awaiting!==null;
  for(const p of byId.values()){const old=prev.get(p.index)||[];down.set(p.index,p.buttons.map((b,i)=>!!b.pressed&&!old[i]));}
  if(this.claimHandled){
   if([...down.values()].some(b=>b[1])){this.awaiting=null;this.flush();}
   else for(const p of byId.values()){const b=down.get(p.index);if((b[0]||b[9])&&this.bind(this.awaiting,{type:'gamepad',id:p.index,label:p.mapping==='standard'?'手柄':'手柄 · 未识别布局'}))break;}
  }
  this.disconnected=[];for(let i=0;i<2;i++){const s=this.slots[i];if(s.type==='gamepad'&&!byId.has(s.id)){this.disconnected.push(i);this.slots[i]={type:'disconnected',id:s.id};}else if(s.type==='disconnected')this.disconnected.push(i);}
  const suppress=this.suppress;this.padInputs=new Map();
  for(const p of byId.values()){
   const b=down.get(p.index),edge=i=>!suppress&&!!b[i],v=analog(p.axes[0]||0,p.axes[1]||0),old=prev.get(p.index)||[],stickX=(p.axes[0]||0)>.55?1:(p.axes[0]||0)<-.55?-1:0,stickY=(p.axes[1]||0)>.55?1:(p.axes[1]||0)<-.55?-1:0;
   this.padInputs.set(p.index,{...emptyInput(),x:v.x,y:v.y,skill1:edge(2),skill2:edge(3),dodge:edge(4),confirm:edge(0),cancel:edge(1),reroll:edge(3),pause:edge(9),archive:edge(8),tabLeft:edge(4),tabRight:edge(5),up:edge(12)||(!suppress&&stickY===-1&&old.stick!==-1),down:edge(13)||(!suppress&&stickY===1&&old.stick!==1),left:edge(14)||(!suppress&&stickX===-1&&old.stickX!==-1),right:edge(15)||(!suppress&&stickX===1&&old.stickX!==1)});
  }
  const result=this.slots.map(s=>{
   if(s.type==='gamepad')return this.padInputs.get(s.id)||emptyInput();
   const o=emptyInput();if(s.type!=='keyboard')return o;
   const k=KEYS[s.id],held=c=>this.held.has(c)&&!this.blocked.has(c),edge=c=>!this.blocked.has(c)&&this.edges.has(c);
   o.x=+held(k.right)-+held(k.left);o.y=+held(k.down)-+held(k.up);const m=Math.hypot(o.x,o.y);if(m>1){o.x/=m;o.y/=m;}
   for(const a of ['skill1','skill2','dodge','confirm','reroll','up','down','left','right'])o[a]=edge(k[a]);o.pause=edge('Escape')||edge('KeyP');return o;
  });
  this.padPrevious=new Map([...byId].map(([id,p])=>{const a=p.buttons.map(b=>!!b.pressed);a.stick=(p.axes[1]||0)>.55?1:(p.axes[1]||0)<-.55?-1:0;a.stickX=(p.axes[0]||0)>.55?1:(p.axes[0]||0)<-.55?-1:0;return[id,a];}));this.edges.clear();this.suppress=false;return result;
 }
 labels(slot){const s=this.slots[slot];return s.type==='gamepad'?['X','Y','LB']:s.type==='disconnected'?['—','—','—']:s.id===0?['Q','E','SPACE']:['NUM 1','NUM 2','NUM 0'];}
 describe(slot){const s=this.slots[slot];return s.type==='keyboard'?(s.id===0?'键盘 · WASD':'键盘 · 方向键'):s.type==='gamepad'?`手柄 ${s.id+1}`:'设备已断开';}
}
