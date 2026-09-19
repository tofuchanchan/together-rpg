export const DIRS=['东','东南','南','西南','西','西北','北','东北'];
export const DUR={idle:1.8,run:.72,attack:.72,'run-attack':.72,bash:.68,dodge:.48};
export const ACTIONS={idle:'待机',run:'跑动',attack:'自动普攻','run-attack':'移动普攻',bash:'盾冲',dodge:'闪避'};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const vector=d=>({x:Math.cos(d*Math.PI/4),z:Math.sin(d*Math.PI/4)});
export const direction=(x,z)=>((Math.round(Math.atan2(z,x)*4/Math.PI)%8)+8)%8;
const ease=x=>1-(1-clamp(x,0,1))**3;
export class LabModel{
 constructor(){this.reset();}
 reset(){Object.assign(this,{mode:'preview',clip:'run-attack',clock:0,time:0,paused:false,speed:1,attackSpeed:1,moveSpeed:1,dir:1,moveDir:1,auto:true,x:0,z:0,moving:false,stride:0,action:null,cooldown:0,bashCd:0,dodgeCd:0,hits:0,damage:0,target:{x:95,z:0,hp:1000},lastHit:-10,contacts:[],facingLocked:false});}
 setClip(clip){if(!DUR[clip])return;this.mode='preview';this.clip=clip;this.clock=0;this.action=null;}
 setMode(mode){this.mode=mode;this.clock=0;this.action=null;this.x=0;this.z=0;this.stride=0;this.cooldown=0;this.bashCd=0;this.dodgeCd=0;this.moving=false;}
 setDirection(d){this.dir=((d%8)+8)%8;this.facingLocked=true;}
 previewDuration(){return DUR[this.clip]/(['attack','run-attack'].includes(this.clip)?this.attackSpeed:1);}
 seek(q){this.paused=true;this.clock=clamp(q,0,.999999)*this.previewDuration();this.stride=this.clock*this.moveSpeed/.72;}
 stepFrame(sign=1){this.paused=true;const q=this.clock/this.previewDuration();const f=((Math.floor(q*16+1e-8)+sign)%16+16)%16;this.clock=f/16*this.previewDuration();this.stride=this.clock*this.moveSpeed/.72;}
 trigger(type,input={}){
  if(this.mode==='preview'){this.setClip(type);return true;}
  if(type!=='dodge'&&type!=='bash')return false;
  if(this.action?.type==='dodge'||this.action?.type==='bash')return false;
  if(type==='dodge'?this.dodgeCd>0:this.bashCd>0)return false;
  const d=(input.x||input.z)?direction(input.x||0,input.z||0):this.dir;
  this.dir=d;this.action={type,t:0,duration:DUR[type],dir:d,hit:false,startX:this.x,startZ:this.z};
  if(type==='dodge')this.dodgeCd=1;else this.bashCd=2;
  return true;
 }
 update(realDt,input={},force=false){
  if(this.paused&&!force)return;
  const dt=realDt*this.speed;this.time+=dt;
  if(this.mode==='preview'){this.clock=(this.clock+dt)%this.previewDuration();this.stride+=dt*this.moveSpeed/.72;return;}
  this.cooldown=Math.max(0,this.cooldown-dt);this.bashCd=Math.max(0,this.bashCd-dt);this.dodgeCd=Math.max(0,this.dodgeCd-dt);
  const mag=Math.hypot(input.x||0,input.z||0);this.moving=mag>0;
  if(this.action?.type==='bash'||this.action?.type==='dodge'){
   const a=this.action,old=a.t;a.t=Math.min(a.duration,a.t+dt);const v=vector(a.dir),distance=a.type==='bash'?145:130;
   const delta=(ease(a.t/a.duration)-ease(old/a.duration))*distance;
   this.move(v.x*delta,v.z*delta);
   if(a.type==='bash'&&!a.hit&&a.t>=.16){const dd=Math.hypot(this.target.x-this.x,this.target.z-this.z);if(dd<64){a.hit=true;this.hit(35);}}
   if(a.t>=a.duration)this.action=null;
  }else{
   if(mag){this.moveDir=direction(input.x||0,input.z||0);this.move((input.x||0)/mag*125*this.moveSpeed*dt,(input.z||0)/mag*125*this.moveSpeed*dt);this.stride+=dt*this.moveSpeed/.72;if(!this.action)this.dir=this.moveDir;}
   if(this.action){const a=this.action;a.t+=dt;
    if(!a.hit&&a.t>=a.duration*.46){a.hit=true;const dx=this.target.x-this.x,dz=this.target.z-this.z,v=vector(a.dir),distance=Math.hypot(dx,dz);if(distance<=118&&(dx*v.x+dz*v.z)/Math.max(1,distance)>.35)this.hit(12);}
    if(a.t>=a.duration)this.action=null;
   }
   const dx=this.target.x-this.x,dz=this.target.z-this.z;
   if(this.auto&&!this.action&&this.cooldown===0&&Math.hypot(dx,dz)<=118){this.dir=direction(dx,dz);this.action={type:'attack',t:0,duration:DUR.attack/this.attackSpeed,dir:this.dir,hit:false};this.cooldown=.82/this.attackSpeed;}
  }
 }
 move(dx,dz){this.x=clamp(this.x+dx,-340,340);this.z=clamp(this.z+dz,-210,205);
  for(const o of [{x:-165,z:-60,r:39},{x:180,z:110,r:42},{x:-290,z:-120,r:14},{x:295,z:-170,r:14},{x:320,z:190,r:14},{x:-300,z:200,r:14}]){const x=this.x-o.x,z=this.z-o.z,d=Math.hypot(x,z),r=o.r+15;if(d<r){this.x=o.x+(d?x/d:1)*r;this.z=o.z+(d?z/d:0)*r;}}
 }
 hit(n){this.hits++;this.damage+=n;this.target.hp=Math.max(0,this.target.hp-n);if(!this.target.hp)this.target.hp=1000;this.lastHit=this.time;this.contacts.push({time:+this.time.toFixed(3),damage:n});if(this.contacts.length>6)this.contacts.shift();}
 pose(){
  const preview=this.mode==='preview',clip=preview?this.clip:this.action?.type||(this.moving?'run':'idle');
  const q=preview?clamp(this.clock/this.previewDuration(),0,1):this.action?clamp(this.action.t/this.action.duration,0,1):(this.time/1.8)%1;
  const running=preview?(clip==='run'||clip==='run-attack'):this.moving&&!['bash','dodge'].includes(clip);
  const legsQ=this.stride%1;
  const f=Math.min(15,Math.floor(q*16+1e-8)),dir=preview?this.dir:this.action?.dir??this.dir;
  const upper=['attack','run-attack'].includes(clip)?'upper-attack':clip==='bash'?'upper-bash':'upper-idle';
  const bob=running?Math.cos(legsQ*Math.PI*4)*1.5:0;
  const legDir=!preview&&running?this.moveDir??dir:dir;
  return {clip,q,dir,legDir,upper,upperFrame:dir*16+f,legs:running?'legs-run':'legs-idle',legsFrame:legDir*16+Math.floor((running?legsQ:q)*16)%16,full:clip==='dodge',bob,frame:f,phase:['attack','run-attack'].includes(clip)?q<.32?'蓄势':q<.58?'挥击 · 命中':q<.78?'随挥':'收势':clip==='bash'?q<.23?'架盾':q<.64?'推进':'归位':clip==='dodge'?q<.18?'压低':q<.8?'闪避':'站稳':running?'步伐循环':'呼吸循环'};
 }
 snapshot(){return {mode:this.mode,paused:this.paused,time:+this.time.toFixed(3),clock:+this.clock.toFixed(3),position:{x:+this.x.toFixed(2),z:+this.z.toFixed(2)},pose:this.pose(),speed:this.speed,attackSpeed:this.attackSpeed,moveSpeed:this.moveSpeed,auto:this.auto,cooldowns:{bash:this.bashCd,dodge:this.dodgeCd},hits:this.hits,damage:this.damage,target:{...this.target},coordinates:'ground x right, z down; screen y = z * 0.707; feet anchor',assetStyle:'original low-poly directional atlas prototype'};}
}
