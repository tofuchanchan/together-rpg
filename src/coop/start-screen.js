const SETTINGS_KEY='threefold-odyssey:settings:v1';
const DEFAULT_SETTINGS={sound:true,feedback:true,shake:true};
function readSettings(){
 try{const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key,value])=>[key,typeof saved?.[key]==='boolean'?saved[key]:value]));}
 catch{return {...DEFAULT_SETTINGS};}
}
export function withTimeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));}

export const startScreen={
 phase:'loading',pending:'title',artReady:false,gameReady:false,initialized:false,gameError:null,artError:null,bindings:null,settings:{...DEFAULT_SETTINGS},padPrevious:new Map(),
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
  addEventListener('keydown',event=>this.key(event),true);
  const poll=()=>{this.samplePads(Array.from(navigator.getGamepads?.()||[]));requestAnimationFrame(poll);};requestAnimationFrame(poll);
  this.setPhase('loading');
  const artLoading=document.querySelector('#title-art').decode().then(()=>{this.artReady=true;this.artError=null;if(this.pending==='title'&&['loading','error'].includes(this.phase))this.showTitle();});
  withTimeout(artLoading,30000,'封面加载超时').catch(error=>{this.artError=error;if(this.pending==='title')this.showError('art');});
 },
 setPhase(phase){
  this.phase=phase;document.body.dataset.screen=phase;
  this.title.hidden=!['title','settings'].includes(phase);this.loading.hidden=!['loading','error'].includes(phase);this.errorBox.hidden=phase!=='error';this.loading.setAttribute('aria-busy',String(phase==='loading'));
  this.shell.inert=!['setup','game'].includes(phase);this.shell.setAttribute('aria-hidden',String(this.shell.inert));
 },
 connect(bindings){this.bindings=bindings;this.gameError=null;this.gameReady=true;bindings.settings(this.settings);if(this.pending==='setup'&&this.phase!=='game')this.showSetup();},
 failGame(error){this.gameError=error;this.gameReady=false;if(this.pending==='setup')this.showError('game');},
 showError(source){this.setPhase('error');document.querySelector('#loading-error-text').textContent=source==='art'?'封面未能加载，请检查网络后重试。':'远征资源未能加载，请检查网络后重试。';document.querySelector('#loading-back').hidden=!this.artReady;document.querySelector('#retry-loading').focus();},
 requestSetup(){this.pending='setup';if(this.gameError)this.showError('game');else if(this.gameReady)this.showSetup();else this.setPhase('loading');},
 showSetup(){if(!this.gameReady){this.requestSetup();return;}this.pending='setup';this.setPhase('setup');this.bindings.setup();document.querySelector('#game').focus();},
 showGame(){this.pending='game';this.setPhase('game');if(this.dialog.open)this.dialog.close();},
 showTitle(focus='title-start'){this.pending='title';if(!this.artReady){if(this.artError)this.showError('art');else this.setPhase('loading');return;}this.bindings?.flush();this.setPhase('title');document.getElementById(focus).focus();},
 openSettings(){if(this.phase!=='title')return;this.setPhase('settings');this.dialog.showModal();},
 fullscreen(){const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();action?.catch(()=>{});},
 key(event){
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
  for(const pad of pads.filter(Boolean)){present.add(pad.index);const now={buttons:pad.buttons.map(b=>b.pressed),axis:Math.abs(pad.axes[1]||0)>.55?Math.sign(pad.axes[1]):0},previous=this.padPrevious.get(pad.index)||{buttons:[],axis:0};this.padPrevious.set(pad.index,now);changes.push({now,previous});}
  for(const id of this.padPrevious.keys())if(!present.has(id))this.padPrevious.delete(id);
  if(!['title','settings'].includes(this.phase))return;
  for(const {now,previous} of changes){
   const edge=i=>now.buttons[i]&&!previous.buttons[i];
   if(this.phase==='settings'&&(edge(1)||edge(9))){this.dialog.close();return;}
   const choices=[...(this.phase==='title'?document.querySelectorAll('.title-choice'):this.dialog.querySelectorAll('button,input'))],index=Math.max(0,choices.indexOf(document.activeElement));
   const direction=edge(12)?-1:edge(13)?1:now.axis!==previous.axis?now.axis:0;
   if(direction){choices[(index+direction+choices.length)%choices.length].focus();return;}
   if(edge(0)||edge(9)){choices[index].click();return;}
  }
 },
 snapshot(){return {screen:this.phase,pending:this.pending,artReady:this.artReady,gameReady:this.gameReady,settings:{...this.settings},error:this.phase==='error'?(this.pending==='title'?this.artError:this.gameError)?.message:null};}
};
