const SETTINGS_KEY='threefold-odyssey:settings:v1';
const DEFAULT_SETTINGS={sound:true,feedback:true,shake:true};
function readSettings(){
 try{const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key,value])=>[key,typeof saved?.[key]==='boolean'?saved[key]:value]));}
 catch{return {...DEFAULT_SETTINGS};}
}
export function withTimeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
const padState=pad=>({buttons:pad.buttons.map(button=>!!button.pressed),axis:Math.abs(pad.axes[1]||0)>.55?Math.sign(pad.axes[1]):0,horizontal:Math.abs(pad.axes[0]||0)>.55?Math.sign(pad.axes[0]):0});

export const startScreen={
 phase:'loading',pending:'title',artReady:false,gameReady:false,initialized:false,gameError:null,artError:null,bindings:null,controllerIndex:null,windowFill:false,settings:{...DEFAULT_SETTINGS},padPrevious:new Map(),
 get blocksGame(){return this.initialized&&!['setup','game'].includes(this.phase);},
 init(){
  this.initialized=true;this.settings=readSettings();
  this.title=document.querySelector('#title-screen');this.loading=document.querySelector('#loading-screen');this.errorBox=document.querySelector('#loading-error');this.dialog=document.querySelector('#title-settings');this.shell=document.querySelector('#game-shell');
  const params=new URLSearchParams(location.search);this.pending=params.has('trial')||params.has('shopTrial')?'setup':'title';
  document.querySelector('#title-start').onclick=()=>this.requestSetup();
  document.querySelector('#title-settings-open').onclick=()=>this.openSettings();
  document.querySelector('#settings-close').onclick=()=>this.dialog.close();
  document.querySelector('#settings-fullscreen').onclick=()=>this.fullscreen();
  document.querySelector('#retry-loading').onclick=()=>location.reload();
  document.querySelector('#loading-back').onclick=()=>this.showTitle();
  document.querySelector('#back-title').onclick=()=>this.showTitle();
  this.dialog.addEventListener('close',()=>{if(this.phase==='settings')this.showTitle('title-settings-open');});
  for(const input of this.dialog.querySelectorAll('input')){input.checked=this.settings[input.name];input.onchange=()=>{this.settings[input.name]=input.checked;this.bindings?.settings(this.settings);try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{}};}
  addEventListener('keydown',event=>{delete document.body.dataset.frontendInput;this.key(event);},true);
  addEventListener('pointerdown',()=>{delete document.body.dataset.frontendInput;},true);
  document.addEventListener('fullscreenchange',()=>this.updateFullscreenControls());
  const poll=()=>{this.samplePads(Array.from(navigator.getGamepads?.()||[]));requestAnimationFrame(poll);};requestAnimationFrame(poll);
  this.setPhase('loading');
  const artLoading=document.querySelector('#title-art').decode().then(()=>{this.artReady=true;this.artError=null;if(this.pending==='title'&&['loading','error'].includes(this.phase))this.showTitle();});
  withTimeout(artLoading,30000,'封面加载超时').catch(error=>{this.artError=error;if(this.pending==='title')this.showError('art');});
 },
 setPhase(phase){
  // Phaser and the frontend poll in separate RAF callbacks. Consume every
  // currently held control at the boundary, whichever loop reached it first.
  if(phase!==this.phase&&!['setup','game'].includes(phase))this.padPrevious=new Map(Array.from(navigator.getGamepads?.()||[]).filter(Boolean).map(pad=>[pad.index,padState(pad)]));
  this.phase=phase;document.body.dataset.screen=phase;
  this.title.hidden=!['title','settings'].includes(phase);this.loading.hidden=!['loading','error'].includes(phase);this.errorBox.hidden=phase!=='error';this.loading.setAttribute('aria-busy',String(phase==='loading'));
  this.shell.inert=!['setup','game'].includes(phase);this.shell.setAttribute('aria-hidden',String(this.shell.inert));
 },
 connect(bindings){this.bindings=bindings;this.gameError=null;this.gameReady=true;bindings.settings(this.settings);if(this.pending==='setup'&&this.phase!=='game')this.showSetup();},
 failGame(error){this.gameError=error;this.gameReady=false;if(this.pending==='setup')this.showError('game');},
 showError(source){this.setPhase('error');document.querySelector('#loading-error-text').textContent=source==='art'?'封面未能加载，请检查网络后重试。':'远征资源未能加载，请检查网络后重试。';document.querySelector('#loading-back').hidden=!this.artReady;document.querySelector('#retry-loading').focus();},
 requestSetup(controllerIndex){if(Number.isInteger(controllerIndex))this.controllerIndex=controllerIndex;this.pending='setup';if(this.gameError)this.showError('game');else if(this.gameReady)this.showSetup();else this.setPhase('loading');},
 showSetup(preserveDevices=false){if(!this.gameReady){this.requestSetup();return;}this.pending='setup';this.bindings.flush();this.setPhase('setup');this.bindings.setup({preserveDevices});document.querySelector('#game').focus();},
 showGame(){this.pending='game';this.setPhase('game');if(this.dialog.open)this.dialog.close();},
 showTitle(focus='title-start'){this.pending='title';if(!this.artReady){if(this.artError)this.showError('art');else this.setPhase('loading');return;}this.bindings?.flush();this.setPhase('title');document.getElementById(focus).focus();},
 openSettings(){if(this.phase!=='title')return;this.setPhase('settings');this.dialog.showModal();this.dialog.querySelector('input').focus();},
 setWindowFill(enabled){this.windowFill=enabled;document.body.dataset.windowFill=String(enabled);this.updateFullscreenControls();dispatchEvent(new Event('resize'));},
 updateFullscreenControls(){const button=document.querySelector('#settings-fullscreen');button.textContent=this.windowFill?'退出专注显示':document.fullscreenElement?'退出全屏':'切换全屏';button.title=this.windowFill?'浏览器未允许原生全屏，已铺满游戏可用区域；按 Esc 或再次确认退出':'浏览器允许时进入全屏，否则铺满游戏可用区域';},
 async fullscreen(){
  if(this.windowFill){this.setWindowFill(false);return;}
  if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}return;}
  try{await document.documentElement.requestFullscreen();}catch{this.setWindowFill(true);}
 },
 key(event){
  if(event.code==='Escape'&&this.windowFill){event.preventDefault();event.stopImmediatePropagation();this.setWindowFill(false);return;}
  if(!this.blocksGame)return;
  if(event.code==='KeyF'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();this.fullscreen();return;}
  if(this.phase==='settings'){if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.dialog.close();}return;}
  if(['loading','error'].includes(this.phase)){if(event.code==='Escape'&&this.artReady){event.preventDefault();this.showTitle();}return;}
  if(event.code==='KeyI'&&!event.repeat){event.preventDefault();document.querySelector('#title-codex').click();return;}
  const choices=[...document.querySelectorAll('.title-choice')],index=choices.indexOf(document.activeElement);
  if(['ArrowDown','KeyS','ArrowUp','KeyW','Enter','Space'].includes(event.code)){
   event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
   if(event.code==='Enter'||event.code==='Space')choices[Math.max(0,index)].click();else choices[(Math.max(0,index)+(['ArrowDown','KeyS'].includes(event.code)?1:choices.length-1))%choices.length].focus();
  }
 },
 samplePads(pads){
  const changes=[];const present=new Set();
  for(const pad of pads.filter(Boolean)){present.add(pad.index);const now=padState(pad),previous=this.padPrevious.get(pad.index)||{buttons:[],axis:0,horizontal:0};this.padPrevious.set(pad.index,now);changes.push({id:pad.index,now,previous});}
  for(const id of this.padPrevious.keys())if(!present.has(id))this.padPrevious.delete(id);
  if(!this.blocksGame)return;
  for(const {id,now,previous} of changes){
   const edge=i=>now.buttons[i]&&!previous.buttons[i];
   const direction=edge(12)?-1:edge(13)?1:now.axis!==previous.axis?now.axis:0;
   const horizontal=edge(14)?-1:edge(15)?1:now.horizontal!==previous.horizontal?now.horizontal:0;
   if(!direction&&!horizontal&&!now.buttons.some((pressed,i)=>pressed&&!previous.buttons[i]))continue;
   document.body.dataset.frontendInput='gamepad';
   if(this.phase==='loading'){if((edge(1)||edge(9))&&this.artReady)this.showTitle();return;}
   if(this.phase==='settings'&&(edge(1)||edge(9))){this.dialog.close();return;}
   if(this.phase==='error'&&edge(1)){if(this.artReady)this.showTitle();return;}
   const source=this.phase==='title'?document.querySelectorAll('.title-choice'):this.phase==='settings'?this.dialog.querySelectorAll('button,input'):this.errorBox.querySelectorAll('button');
   const choices=[...source].filter(node=>!node.disabled&&!node.hidden),index=Math.max(0,choices.indexOf(document.activeElement));
   if(!choices.length)return;
   if(this.phase==='settings'&&horizontal&&choices[index].matches('input[type="checkbox"]')){const input=choices[index];input.checked=horizontal>0;input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();return;}
   const movement=direction||(this.phase==='error'?horizontal:0);
   if(movement){choices[(index+movement+choices.length)%choices.length].focus();return;}
   if(edge(0)||edge(9)){if(choices[index].id==='title-start')this.requestSetup(id);else choices[index].click();return;}
   choices[index].focus();
  }
 },
 snapshot(){return {screen:this.phase,pending:this.pending,controllerIndex:this.controllerIndex,displayMode:document.fullscreenElement?'fullscreen':this.windowFill?'window-fill':'window',artReady:this.artReady,gameReady:this.gameReady,settings:{...this.settings},error:this.phase==='error'?(this.pending==='title'?this.artError:this.gameError)?.message:null};}
};
