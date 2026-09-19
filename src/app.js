import {LabModel,DIRS,ACTIONS,vector,clamp} from './model.js';
const $=s=>document.querySelector(s),model=new LabModel();
window.lab=model;
const notes={idle:'观察呼吸、脚下基点和剑盾持握。',run:'步频随移速变化；切换方向保留步伐进度。',attack:'自动挥剑：蓄势 → 命中 → 随挥 → 收势。','run-attack':'腿部保持步伐，上半身完成挥剑。',bash:'架盾后推进，盾面在身体前方；右手持续持剑。',dodge:'压低重心快速侧步；完整动作覆盖上下身。'};
const icons={idle:'◇',run:'↗',attack:'╱','run-attack':'⇢',bash:'⬡',dodge:'〰'};
for(const [key,label]of Object.entries(ACTIONS)){
 const b=document.createElement('button');b.dataset.clip=key;b.innerHTML=`<i>${icons[key]}</i><span>${label}<small>${key.toUpperCase()}</small></span>`;b.onclick=()=>{model.setClip(key);syncControls();};$('#actions').append(b);
}
const thumbs=[];
for(let d=0;d<8;d++){
 const b=document.createElement('button');b.className='direction-card';b.title=`朝向${DIRS[d]}`;b.dataset.dir=d;b.innerHTML=`<canvas width="112" height="110"></canvas><span>${DIRS[d]}</span>`;b.onclick=()=>{model.setDirection(d);syncControls();};$('#directions').append(b);thumbs.push(b.querySelector('canvas'));
}
function syncControls(){
 $('#preview-mode').classList.toggle('active',model.mode==='preview');$('#play-mode').classList.toggle('active',model.mode==='play');
 document.querySelectorAll('[data-clip]').forEach(b=>b.classList.toggle('active',model.mode==='preview'&&b.dataset.clip===model.clip));
 document.querySelectorAll('[data-dir]').forEach(b=>b.classList.toggle('active',+b.dataset.dir===model.dir));
 document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===model.speed));
 $('#pause').textContent=model.paused?'▶ 播放':'Ⅱ 暂停';$('#pause').setAttribute('aria-label',model.paused?'播放':'暂停');
 $('#action-note').textContent=model.mode==='preview'?notes[model.clip]:'WASD 移动，靠近木桩自动攻击。Q 盾冲，空格闪避。点击地面移动木桩。';
 $('#stage-hint').textContent=model.mode==='preview'?'预览模式 · 选择动作，检查方向与节奏':'自由试跑 · WASD 移动 / Q 盾冲 / Space 闪避 / 点击放置木桩';
 $('#timeline').disabled=model.mode!=='preview';$('#prev').disabled=model.mode!=='preview';$('#next').disabled=model.mode!=='preview';
 $('#attack-speed').value=model.attackSpeed;$('#attack-value').value=model.attackSpeed.toFixed(2)+'×';$('#move-speed').value=model.moveSpeed;$('#move-value').value=model.moveSpeed.toFixed(2)+'×';$('#auto').checked=model.auto;
}
$('#preview-mode').onclick=()=>{model.setMode('preview');syncControls();};$('#play-mode').onclick=()=>{model.setMode('play');syncControls();};
$('#pause').onclick=()=>{model.paused=!model.paused;syncControls();};
$('#prev').onclick=()=>{model.stepFrame(-1);syncControls();};$('#next').onclick=()=>{model.stepFrame();syncControls();};
$('#timeline').oninput=e=>{model.seek(+e.target.value/1000);syncControls();};
$('#attack-speed').oninput=e=>{const q=model.pose().q;model.attackSpeed=+e.target.value;if(model.mode==='preview')model.clock=q*model.previewDuration();syncControls();};
$('#move-speed').oninput=e=>{model.moveSpeed=+e.target.value;syncControls();};
$('#auto').onchange=e=>model.auto=e.target.checked;
$('#speed-buttons').onclick=e=>{if(e.target.dataset.speed){model.speed=+e.target.dataset.speed;syncControls();}};
$('#reset').onclick=()=>{model.reset();syncControls();};
const full=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('#game').requestFullscreen();};$('#fullscreen').onclick=full;
const input={x:0,z:0},held=new Set();let manual=false,sceneRef=null;
function readInput(){input.x=(held.has('KeyD')||held.has('ArrowRight')?1:0)-(held.has('KeyA')||held.has('ArrowLeft')?1:0);input.z=(held.has('KeyS')||held.has('ArrowDown')?1:0)-(held.has('KeyW')||held.has('ArrowUp')?1:0);}
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 held.add(e.code);readInput();if(e.repeat)return;
 if(e.code==='KeyQ')model.trigger('bash',input);
 if(e.code==='Space')model.trigger('dodge',input);
 if(e.code==='KeyP')model.paused=!model.paused;
 if(e.code==='KeyF')full();syncControls();
});
window.addEventListener('keyup',e=>{held.delete(e.code);readInput();});window.addEventListener('blur',()=>{held.clear();readInput();});
const project=(x,z)=>({x:440+x,y:316+z*.707});
function poly(g,points,color,alpha=1){g.fillStyle(color,alpha);g.fillPoints(points.map(p=>({x:p[0],y:p[1]})),true);}
function stone(g,x,y,w,h){g.fillStyle(0x152522,.22);g.fillEllipse(x+7,y+7,w*1.5,h*.8);poly(g,[[x-w/2,y-h*.5],[x-w*.25,y-h],[x+w*.28,y-h*.9],[x+w/2,y-h*.25],[x+w*.25,y+5],[x-w*.25,y+7]],0x58655b);poly(g,[[x-w/2,y-h*.5],[x-w*.25,y-h],[x+w*.28,y-h*.9],[x+w*.13,y-h*.43]],0x87917a);poly(g,[[x+w*.13,y-h*.43],[x+w*.28,y-h*.9],[x+w/2,y-h*.25],[x+w*.25,y+5]],0x69775f);}
class LabScene extends Phaser.Scene{
 preload(){this.load.json('manifest','assets/warrior/manifest.json');for(const clip of ['legs-idle','legs-run','upper-idle','upper-attack','upper-bash','dodge'])this.load.spritesheet(clip,`assets/warrior/${clip}.png`,{frameWidth:192,frameHeight:224});this.load.on('loaderror',()=>{$('#loading').textContent='图集加载失败，请使用本地服务打开并刷新。';});}
 create(){sceneRef=this;this.meta=this.cache.json.get('manifest');this.cameras.main.setBackgroundColor('#34463b');
  this.floor=this.add.graphics();this.makeFloor();this.fx=this.add.graphics().setDepth(900);this.debug=this.add.graphics().setDepth(1000);
  for(const o of [{x:-165,z:-60,r:39},{x:180,z:110,r:42}]){const p=project(o.x,o.z),g=this.add.graphics().setDepth(p.y);stone(g,p.x,p.y,o.r*1.9,55);}
  for(const o of [{x:-290,z:-120},{x:295,z:-170},{x:320,z:190},{x:-300,z:200}]){const p=project(o.x,o.z),g=this.add.graphics().setDepth(p.y);g.fillStyle(0x152721,.24);g.fillEllipse(p.x+8,p.y+9,90,36);poly(g,[[p.x-10,p.y],[p.x-5,p.y-104],[p.x+9,p.y-103],[p.x+12,p.y]],0x56483a);for(let i=0;i<3;i++){poly(g,[[p.x-53+i*8,p.y-40-i*25],[p.x,p.y-118-i*22],[p.x+49-i*7,p.y-45-i*25],[p.x+3,p.y-26-i*23]],i===2?0x64816a:i===1?0x4c6b59:0x3e5c4d);}}
  this.shadow=this.add.ellipse(0,0,56,19,0x14211e,.38);
  const [ox,oy]=this.meta.origin;this.legs=this.add.sprite(0,0,'legs-idle').setOrigin(ox,oy).setScale(1.8667);this.upper=this.add.sprite(0,0,'upper-idle').setOrigin(ox,oy).setScale(1.8667);this.full=this.add.sprite(0,0,'dodge').setOrigin(ox,oy).setScale(1.8667);
  this.dummy=this.add.graphics();this.tag=this.add.text(0,0,'训练木桩',{fontFamily:'Microsoft YaHei',fontSize:'11px',color:'#e0d6ac',backgroundColor:'#283d33',padding:{x:7,y:3}}).setOrigin(.5,1).setDepth(1200);
  this.add.text(28,24,'THE TRAINING GROVE',{fontFamily:'Georgia',fontSize:'12px',color:'#bac5a4',letterSpacing:2});
  this.add.text(28,45,'林间演武场',{fontFamily:'Microsoft YaHei',fontSize:'10px',color:'#9caf96'});
  this.add.text(850,25,'01 / WARRIOR',{fontFamily:'monospace',fontSize:'10px',color:'#aaba9b'}).setOrigin(1,0);
  this.label=this.add.text(440,485,'',{fontFamily:'Microsoft YaHei',fontSize:'11px',color:'#ddd6b3'}).setOrigin(.5,1).setDepth(1500);
  this.input.on('pointerdown',p=>{if(model.mode==='play'){model.target.x=clamp(p.x-440,-315,315);model.target.z=clamp((p.y-316)/.707,-185,175);}});
  $('#loading').remove();window.assetsReady=true;syncControls();this.draw();
 }
 makeFloor(){const g=this.floor;g.fillStyle(0x3c5143);g.fillRect(0,0,880,510);g.fillStyle(0x405746);g.fillEllipse(430,320,950,510);
  poly(g,[[75,240],[385,90],[805,267],[507,462]],0x6d7660);poly(g,[[75,240],[507,462],[507,475],[75,253]],0x515d4d);poly(g,[[507,462],[805,267],[805,278],[507,475]],0x57644f);
  for(let i=0;i<8;i++){const x=83+i*46;g.lineStyle(1,0x495c49,.4);g.lineBetween(x,241-i*21,507+i*37,452-i*24);}
  for(let i=0;i<9;i++){g.lineStyle(1,0x495c49,.3);g.lineBetween(82+i*48,243+i*24,388+i*45,96+i*19);}
  const rand=i=>{const v=Math.sin(i*73.91+13.4)*13758;return v-Math.floor(v);};
  for(let i=0;i<150;i++){const x=rand(i)*880,y=rand(i+400)*510;if(x>160&&x<720&&y>150&&y<410)continue;g.lineStyle(1,i%2?0x748467:0x293f32,.7);g.lineBetween(x,y,x-2,y-5-rand(i+80)*8);g.lineBetween(x,y,x+4,y-5);}
  for(const [x,y] of [[110,390],[760,130],[690,445],[174,122],[53,307]])stone(g,x,y,22,12);
 }
 draw(){if(!this.meta)return;const p=model.pose(),v=vector(p.dir),preview=model.mode==='preview';let x=model.x,z=model.z;
  if(preview&&['bash','dodge'].includes(p.clip)){const travel=p.clip==='bash'?125:130,off=(-.5+(1-(1-p.q)**3))*travel;x=v.x*off;z=v.z*off;}
  const pos=project(x,z),scale=1.4;this.shadow.setPosition(pos.x,pos.y+1).setDepth(pos.y-.3);
  this.legs.setTexture(p.legs,p.legsFrame).setPosition(pos.x,pos.y).setDepth(pos.y).setVisible(!p.full);
  this.upper.setTexture(p.upper,p.upperFrame).setPosition(pos.x,pos.y-p.bob).setDepth(pos.y+.01).setVisible(!p.full);
  this.full.setFrame(p.dir*16+p.frame).setPosition(pos.x,pos.y).setDepth(pos.y).setVisible(p.full);
  const target=preview?{x:v.x*112,z:v.z*112}:model.target,t=project(target.x,target.z),hit=preview?(['attack','run-attack'].includes(p.clip)&&p.q>.46&&p.q<.57)||(p.clip==='bash'&&p.q>.5&&p.q<.65):model.time-model.lastHit<.12;
  const g=this.dummy;g.clear().setDepth(t.y);g.fillStyle(0x192a23,.28);g.fillEllipse(t.x,t.y,55,18);g.fillStyle(0x5a4331);g.fillRect(t.x-5,t.y-70,10,70);g.fillStyle(hit?0xffdc8f:0xae8560);g.fillRoundedRect(t.x-22,t.y-72,44,49,10);g.lineStyle(3,0x6b553b);g.strokeEllipse(t.x,t.y-48,28,26);g.lineStyle(2,0xd1b78a);g.strokeEllipse(t.x,t.y-48,13,13);g.fillStyle(0x745a3c);g.fillRect(t.x-33,t.y-58,66,6);g.fillStyle(0xbaa377);g.fillEllipse(t.x,t.y-78,23,15);this.tag.setPosition(t.x,t.y-91);
  this.fx.clear();const fx=this.fx;
  if(['attack','run-attack'].includes(p.clip)&&p.q>.32&&p.q<.62){const a=p.dir*Math.PI/4,progress=(p.q-.32)/.30;fx.lineStyle(4,0xffe2a1,.85);const pts=[];for(let i=0;i<18;i++){const a2=a-1.1+progress*1.7-i*.045;pts.push(project(x+Math.cos(a2)*86,z+Math.sin(a2)*86));}fx.beginPath();pts.forEach((pt,i)=>i?fx.lineTo(pt.x,pt.y-36):fx.moveTo(pt.x,pt.y-36));fx.strokePath();}
  if(['bash','dodge'].includes(p.clip)&&p.q>.1&&p.q<.85){for(let i=1;i<5;i++){const a=project(x-v.x*i*15,z-v.z*i*15);fx.fillStyle(0xd6cbaa,.15*(1-i/5));fx.fillEllipse(a.x,a.y,25-i*3,10-i);}}
  if(hit){fx.lineStyle(2,0xffe0a1);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;fx.lineBetween(t.x+Math.cos(a)*15,t.y-46+Math.sin(a)*15,t.x+Math.cos(a)*29,t.y-46+Math.sin(a)*29);}}
  const dbg=this.debug;dbg.clear();if($('#debug').checked){dbg.lineStyle(1,0x93d3b0,.85);dbg.strokeEllipse(pos.x,pos.y,32,23);dbg.lineBetween(pos.x-6,pos.y,pos.x+6,pos.y);dbg.lineBetween(pos.x,pos.y-6,pos.x,pos.y+6);dbg.lineStyle(1,0xe5c983,.6);dbg.strokeEllipse(pos.x,pos.y,236,236*.707);const a=project(x+v.x*60,z+v.z*60);dbg.lineBetween(pos.x,pos.y,a.x,a.y);dbg.strokeEllipse(t.x,t.y,32,23*.707);}
  this.label.setText(preview?`${ACTIONS[p.clip]}  /  ${DIRS[p.dir]}  /  ${p.phase}`:`Q 盾冲 ${model.bashCd>0?model.bashCd.toFixed(1)+'s':'就绪'}     SPACE 闪避 ${model.dodgeCd>0?model.dodgeCd.toFixed(1)+'s':'就绪'}`);
  $('#current-action').textContent=ACTIONS[p.clip];$('#current-dir').textContent=DIRS[p.dir];$('#phase').textContent=p.phase;$('#frame-count').textContent=`${String(p.frame+1).padStart(2,'0')} / 16`;$('#timeline').value=Math.floor(p.q*999);$('#hits').textContent=model.hits;$('#damage').textContent=model.damage;
  $('#event').textContent=model.hits?`最近命中 ${model.contacts.at(-1)?.time.toFixed(2)}s · ${model.contacts.at(-1)?.damage} 伤害`:'进入自由试跑，靠近木桩验证命中。';
  for(let d=0;d<8;d++)this.drawThumb(thumbs[d],p,d);
 }
 drawThumb(canvas,p,d){const c=canvas.getContext('2d');c.clearRect(0,0,112,110);c.fillStyle='rgba(8,18,16,.25)';c.beginPath();c.ellipse(56,99,20,6,0,0,Math.PI*2);c.fill();const scale=.9067,w=192*scale,h=224*scale,ox=this.meta.origin[0],oy=this.meta.origin[1];const draw=(key,f,dy=0)=>c.drawImage(this.textures.get(key).getSourceImage(),(f%16)*192,d*224,192,224,56-w*ox,99-h*oy+dy,w,h);if(p.full)draw('dodge',p.frame);else{draw(p.legs,p.legsFrame%16);draw(p.upper,p.frame,-p.bob*.48);}}
 update(t,dt){if(!manual){let left=Math.min(dt/1000,.1);while(left>0){const s=Math.min(left,1/120);model.update(s,input);left-=s;}}this.draw();}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:880,height:510,backgroundColor:'#34463b',transparent:false,antialias:true,render:{preserveDrawingBuffer:true},scene:LabScene,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
window.render_game_to_text=()=>JSON.stringify({assetsReady:!!window.assetsReady,...model.snapshot()});
window.advanceTime=ms=>{manual=true;let left=Math.max(0,ms)/1000;while(left>0){const s=Math.min(left,1/120);model.update(s,input);left-=s;}sceneRef?.draw();};
window.labTest={reset:()=>{model.reset();manual=true;syncControls();sceneRef?.draw();},resumeRealtime:()=>manual=false,render:()=>{syncControls();sceneRef?.draw();},setInput:(x,z)=>{input.x=x;input.z=z;},game};
syncControls();
