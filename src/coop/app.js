import {World} from './model.js';
import {loadWorldArt,worldArtState} from './world-assets.js';
import {InputRouter} from './input.js';
import {View} from './render.js';
import {loadCharacterSprites,characterAssetState} from './sprites.js';
const world=new World(),router=new InputRouter();let sceneRef,view,manual=false,testPads=null,audio=null,lastSound=0;
function unlockAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch{}}
function sound(type,heavy=false){if(!audio||!world.options.sound||!world.options.feedback)return;const now=audio.currentTime;if(now-lastSound<.025)return;lastSound=now;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);const f=type==='hurt'?110:type==='dodge'?330:type==='skill'?400:type==='kill'?660:heavy?150:220;osc.type=type==='hit'||type==='hurt'?'triangle':'sine';osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,f*.35),now+.08);gain.gain.setValueAtTime(.06,now);gain.gain.exponentialRampToValueAtTime(.001,now+.11);osc.start(now);osc.stop(now+.12);}
function clearTransition(){router.flush();world.clearBuffers();}
const actions={start(roles){unlockAudio();world.reset(roles);clearTransition();document.querySelector('#status').textContent='双人战斗 · 本地运行';},pause(){if(world.mode==='play'||world.mode==='upgrade')world.pause();else if(world.mode==='paused'&&!router.slots.some(s=>s.type==='disconnected'))world.resume();clearTransition();},confirm(slot){world.confirm(slot);clearTransition();},proceed(){if(world.mode==='complete')world.nextRoom();else world.reset(view.roles);clearTransition();},menu(){world.mode='menu';clearTransition();}};
function fullscreen(){if(document.fullscreenElement)document.exitFullscreen();else document.querySelector('#game').requestFullscreen();}
document.querySelector('#fullscreen').onclick=fullscreen;
const known=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Numpad0','Numpad1','Numpad2']);
addEventListener('keydown',e=>{if(known.has(e.code))e.preventDefault();if(!view)return;unlockAudio();router.key(e.code,true,e.repeat);if(e.repeat)return;if(e.code==='KeyF')fullscreen();if(world.mode==='menu'&&e.code==='Enter')actions.start(view.roles);else if(['complete','defeat'].includes(world.mode)&&e.code==='Enter')actions.proceed();});
addEventListener('keyup',e=>router.key(e.code,false));addEventListener('blur',()=>{router.blur();world.pause('窗口失去焦点，按 P 或手柄 Start 继续');});
function update(seconds){const pads=testPads??Array.from(navigator.getGamepads?.()||[]),input=router.sample(pads);if(router.disconnected.length)world.pause(`P${router.disconnected[0]+1} 设备断开，请重新绑定`);
 if(input.some(i=>i.pause)){actions.pause();return;}if(world.mode==='menu'){if(input.some(i=>i.confirm))actions.start(view.roles);return;}
 if(world.mode==='upgrade'){let confirmed=false;for(let i=0;i<2;i++){if(input[i].up)world.choose(i,(world.selection[i]+2)%3);if(input[i].down)world.choose(i,(world.selection[i]+1)%3);if(input[i].confirm&&!world.ready[i]){world.confirm(i);confirmed=true;}}if(confirmed)router.flush();return;}
 if(['complete','defeat'].includes(world.mode)){if(input.some(i=>i.confirm))actions.proceed();return;}
 const mode=world.mode;world.advance(seconds,input);if(mode!==world.mode)clearTransition();for(const e of world.events.splice(0))sound(e.type,e.heavy);
}
class CoopScene extends Phaser.Scene{
 create(){sceneRef=this;this.surface=this.textures.createCanvas('coop-surface',1440,810);this.add.image(0,0,'coop-surface').setOrigin(0);view=new View(this.surface.canvas,world,router,actions);this.input.on('pointerdown',p=>{unlockAudio();view.click(p.x,p.y);view.draw();});window.assetsReady=true;view.draw();}
 update(t,dt){if(!manual)update(Math.min(.05,dt/1000));view.draw(manual?0:dt/1000);}
}
document.querySelector('#status').textContent='美术资源加载中…';
try{await Promise.all([loadCharacterSprites(),loadWorldArt()]);document.querySelector('#status').textContent='D 画风 · 全资源插画版';}
catch(error){document.querySelector('#status').textContent=`素材加载失败，请刷新：${error.message}`;throw error;}
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1440,height:810,backgroundColor:'#244f3d',scene:CoopScene,audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,preserveDrawingBuffer:true}});
window.render_game_to_text=()=>JSON.stringify({assetsReady:!!window.assetsReady,characterArt:characterAssetState(),worldArt:worldArtState(),...world.snapshot(),devices:router.slots,awaitingPad:router.awaiting});
window.advanceTime=ms=>{manual=true;let remaining=Math.max(0,ms)/1000;while(remaining>1e-8){const dt=Math.min(remaining,1/60);update(dt);remaining-=dt;}view?.draw(ms/1000);};
window.coopTest={world,router,get view(){return view;},start:(roles=['warrior','mage'])=>{manual=true;view.roles=[...roles];actions.start(roles);view.draw();},setPads:p=>testPads=p,resumeRealtime:()=>{manual=false;testPads=null;},render:()=>view.draw(),game};

