import {loadEquipmentArt,equipmentAssetState} from './equipment-art.js';
import {World,ROLES} from './model.js';
import {applyReward} from './builds.js';
import {xpRequired} from './loot.js';
import {loadWorldArt,worldArtState} from './world-assets.js';
import {loadBuildArt,buildArtState} from './build-art.js';
import {loadUniversalArt,universalArtState} from './universal-art.js';
import {BUILD_TRIALS,applyBuildTrial} from './build-presets.js';
import {InputRouter} from './input.js';
import {View} from './render.js';
import {RenderSurface} from './render-resolution.js';
import {loadCharacterSprites,characterAssetState} from './sprites.js';
import {loadHeroPortraits,heroPortraitState} from './portraits.js';
import {createCodexDialog} from './codex-view.js?v=0.12.0';
import {createCodexSession} from './codex-session.js';
import {startScreen} from './start-screen.js?v=0.12.0';
let resolveGameReady;
export const gameReady=new Promise(resolve=>{resolveGameReady=resolve;});
const world=new World(),router=new InputRouter();let sceneRef,view,renderSurface,manual=false,testPads=null,audio=null,lastSound=0;
const codexSession=createCodexSession(world,router,()=>document.hasFocus());
const codex=createCodexDialog({onOpen:()=>codexSession.open(),onClose:()=>{codexSession.close();view?.draw();}});
document.querySelector('#open-codex').onclick=()=>codex.open();
const trialKey=new URLSearchParams(location.search).get('trial'),trial=Object.hasOwn(BUILD_TRIALS,trialKey)?BUILD_TRIALS[trialKey]:null;
const params=new URLSearchParams(location.search),shopTrial=params.get('shopTrial');
function unlockAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch{}}
function sound(type,heavy=false){if(!audio||!world.options.sound||!world.options.feedback)return;const now=audio.currentTime,special=type==='buildReady'||type==='buildBurst';if(!special&&now-lastSound<.025)return;lastSound=now;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);const f=type==='buildReady'?520:type==='buildBurst'?180:type==='hurt'?110:type==='dodge'?330:type==='skill'?400:type==='kill'?660:heavy?150:220,duration=special ? .23 : .11;osc.type=type==='hit'||type==='hurt'||type==='buildBurst'?'triangle':'sine';osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(type==='buildReady'?1040:Math.max(40,f*.35),now+duration*.8);gain.gain.setValueAtTime(special ? .09 : .06,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.start(now);osc.stop(now+duration+.01);}
function clearTransition(){router.flush();world.clearBuffers();}
const actions={start(roles){unlockAudio();world.reset(roles,view?.humanCount||2);Object.assign(world.options,startScreen.settings);startScreen.showGame();const preset=trial&&applyBuildTrial(world,trialKey);clearTransition();document.querySelector('#status').textContent=preset?`构筑试炼 · ${trial.title} · 预设技能开局`:world.humanCount===1?'单人冒险 · 商店招募队友':'双人战斗 · 本地同屏';},pause(){if(['play','upgrade','shop'].includes(world.mode))world.pause();else if(world.mode==='paused'&&!router.slots.slice(0,world.humanCount).some(s=>s.type==='disconnected'))world.resume();clearTransition();},confirm(slot){world.confirm(slot);clearTransition();},proceed(){if(world.mode==='victory')world.startEndless();else if(world.mode==='complete')world.nextRoom();else actions.start(view.roles);clearTransition();},menu(){world.mode='menu';clearTransition();startScreen.showSetup(true);},title(){clearTransition();startScreen.showTitle();},codex(){codex.open();},fullscreen(){fullscreen();}};
function fullscreen(){startScreen.fullscreen();}
document.querySelector('#fullscreen').onclick=fullscreen;
const known=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Numpad0','Numpad1','Numpad2']);
addEventListener('keydown',e=>{if(startScreen.blocksGame||codex.isOpen)return;if(router.awaiting!==null){e.preventDefault();if(e.code==='Escape'){router.awaiting=null;router.flush();}return;}if(e.code==='KeyI'&&!e.repeat){e.preventDefault();codex.open();return;}if(known.has(e.code))e.preventDefault();if(!view)return;unlockAudio();router.key(e.code,true,e.repeat);if(e.repeat)return;if(e.code==='KeyF')fullscreen();if(world.mode==='menu'&&e.code==='Enter')actions.start(view.roles);else if(['complete','defeat','victory'].includes(world.mode)&&e.code==='Enter')actions.proceed();});
addEventListener('keyup',e=>router.key(e.code,false));addEventListener('blur',()=>{router.blur();const reason='窗口失去焦点，按 P 或手柄 Start 继续';if(codex.isOpen)codexSession.interrupt(reason);world.pause(reason);});
function update(seconds){
 const pads=testPads??Array.from(navigator.getGamepads?.()||[]),input=router.sample(pads);if(startScreen.blocksGame)return;
 if(router.claimHandled)return;
 const padInputs=[...(router.padInputs?.entries()||[])];
 // A returning controller explicitly reclaims its own slot; no automatic takeover.
 if(!codex.isOpen&&['menu','paused'].includes(world.mode))for(const [id,control] of padInputs){
  if(!control.confirm&&!control.pause)continue;
  const disconnected=router.slots.findIndex(s=>s.type==='disconnected'&&s.id===id);
  if(disconnected>=0){router.bind(disconnected,{type:'gamepad',id});view.navActive=true;return;}
  if(world.mode==='menu'&&!router.slots.some(s=>s.type==='gamepad'&&s.id===id)){
   const slot=router.slots[0].type==='gamepad'?1:0;
   if(slot===1&&router.slots[1].type==='gamepad')continue;
   router.bind(slot,{type:'gamepad',id});if(slot===1)view.humanCount=2;view.navActive=true;view.draw();view.navFocus=`setup-role-${slot}`;return;
  }
 }
 const activeCount=world.mode==='menu'?view.humanCount:world.humanCount,missing=router.disconnected.filter(i=>i<activeCount);if(missing.length)world.pause(`P${missing[0]+1} 设备断开，请重新绑定`);
 if(padInputs.some(([,i])=>i.archive)){if(codex.isOpen)codex.close();else codex.open();return;}
 if(codex.isOpen){if(missing.length)codexSession.interrupt(`P${missing[0]+1} 设备断开，请重新绑定`);const control=padInputs.map(([,i])=>i).find(i=>i.pause||i.confirm||i.cancel||i.up||i.down||i.left||i.right||i.tabLeft||i.tabRight);if(control?.pause)codex.close();else if(control)codex.handleInput(control);return;}
 if(['menu','paused','complete','defeat','victory'].includes(world.mode)){
  if(world.mode==='paused'&&(input.slice(0,world.humanCount).some(i=>i.pause)||padInputs.some(([,i])=>i.pause))){actions.pause();return;}
  const control=padInputs.map(([,i])=>i).find(i=>i.confirm||i.cancel||i.up||i.down||i.left||i.right);
  if(control){view.menuInput(control);return;}
  return;
 }
 if(input.slice(0,world.humanCount).some(i=>i.pause)||padInputs.some(([,i])=>i.pause)){actions.pause();return;}
 if(world.mode==='shop'){const revision=world.shop.revision;for(let i=0;i<world.humanCount&&world.mode==='shop';i++){view.shopInput(i,input[i]);if(world.shop.revision!==revision)break;}return;}
 // Whole reward-page identity isolates queued XP; local submenus keep P2 independent.
 if(world.mode==='upgrade'){const page=world.offers;let confirmed=false;for(let i=0;i<world.humanCount&&world.mode==='upgrade'&&world.offers===page;i++){
  if(input[i].cancel&&!world.ready[i]){if(world.cancelReplacement(i))router.flush();continue;}
  if(input[i].reroll&&!world.ready[i]){if(['replace','skill-replace'].includes(world.rewardMenus[i]?.type))world.cancelReplacement(i);else world.reroll(i);continue;}
  if(input[i].skill1&&!world.ready[i])world.setFeedElement(i,world.heroes[i].universal?.feedElement==='chill'?'burn':'chill');
  const count=world.rewardChoices(i).length;if(input[i].up)world.choose(i,(world.selection[i]+count-1)%count);if(input[i].down)world.choose(i,(world.selection[i]+1)%count);if(input[i].confirm&&!world.ready[i]){world.confirm(i);confirmed=true;}
 }if(confirmed)router.flush();return;}
 const mode=world.mode;world.advance(seconds,input);if(mode!==world.mode)clearTransition();for(const e of world.events.splice(0))sound(e.type,e.heavy);
}
class CoopScene extends Phaser.Scene{
 create(){sceneRef=this;this.surface=this.textures.createCanvas('coop-surface',1440,810);this.surfaceImage=this.add.image(0,0,'coop-surface').setOrigin(0);view=new View(this.surface.canvas,world,router,actions);renderSurface=new RenderSurface(this,this.surface,this.surfaceImage,view);this.input.on('pointerdown',p=>{if(startScreen.blocksGame||codex.isOpen)return;unlockAudio();view.click(p.x,p.y);view.draw();});if(trial){view.roles=[trial.role,trial.role==='mage'?'warrior':'mage'];view.humanCount=1;actions.start(view.roles);}if(Object.hasOwn(ROLES,shopTrial)){view.roles=[shopTrial,shopTrial==='mage'?'warrior':'mage'];view.humanCount=params.get('players')==='2'?2:1;actions.start(view.roles);world.enemies=[];world.pressure=null;world.level=6;world.xpNext=xpRequired(6);world.clears=10;world.heroes.forEach(h=>{h.level=6;for(const key of ['power','hp','haste','crit','pickup','active:0','active:1'])applyReward(h,key);});world.room=5;world.wave=2;world.gold=120;world.mode='complete';world.enterShop();document.querySelector('#status').textContent='商店试玩 · 120 测试金币 / Lv.6';}startScreen.connect({settings:settings=>Object.assign(world.options,settings),flush:()=>{router.blur();world.clearBuffers();router.awaiting=null;},setup:({preserveDevices=false}={})=>{world.mode='menu';router.blur();world.clearBuffers();router.awaiting=null;const id=startScreen.controllerIndex,pad=(testPads??Array.from(navigator.getGamepads?.()||[])).find(p=>p?.index===id);if(pad&&!preserveDevices){if(router.slots[1].type==='gamepad'&&router.slots[1].id===id)router.slots[1]={type:'keyboard',id:1};router.bind(0,{type:'gamepad',id});view.navActive=true;}this.scale.refresh();view.draw();}});window.assetsReady=startScreen.gameReady;view.draw();resolveGameReady();}
 update(t,dt){if(!manual)update(Math.min(.05,dt/1000));if(!startScreen.blocksGame)view.draw(manual?0:dt/1000);}
}
document.querySelector('#status').textContent='美术资源加载中…';
// Optional selection illustrations load in parallel; combat art remains the fallback.
loadHeroPortraits();
try{await Promise.all([loadCharacterSprites(),loadWorldArt(),loadBuildArt(),loadUniversalArt(),loadEquipmentArt()]);document.querySelector('#status').textContent='林间远征 · 通用构筑 / 连续增援 / 拾取成长';}
catch(error){document.querySelector('#status').textContent=`素材加载失败，请刷新：${error.message}`;throw error;}
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1440,height:810,backgroundColor:'#244f3d',scene:CoopScene,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,preserveDrawingBuffer:true}});
window.render_game_to_text=()=>JSON.stringify({assetsReady:!!window.assetsReady,frontend:startScreen.snapshot(),renderSurface:renderSurface?.snapshot(),heroPortraits:heroPortraitState(),characterArt:characterAssetState(),worldArt:worldArtState(),buildArt:buildArtState(),universalArt:universalArtState(),equipmentArt:equipmentAssetState(),...world.snapshot(),codex:codex.snapshot(),rewardChoices:world.heroes.map((_,i)=>world.rewardChoices(i)),devices:router.slots,awaitingPad:router.awaiting,uiNavigation:view.navigationSnapshot()});
window.advanceTime=ms=>{manual=true;let remaining=Math.max(0,ms)/1000;while(remaining>1e-8){const dt=Math.min(remaining,1/60);update(dt);remaining-=dt;}view?.draw(ms/1000);};
window.coopTest={world,router,codex,get view(){return view;},start:(roles=['warrior','mage'],humanCount=2)=>{manual=true;view.roles=[...roles];view.humanCount=humanCount;actions.start(roles);view.draw();},setPads:p=>testPads=p,resumeRealtime:()=>{manual=false;testPads=null;},render:()=>view.draw(),setRenderScaleForTest:scale=>renderSurface.setTestScale(scale),game};

