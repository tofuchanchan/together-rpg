import {createCodexView} from './codex-view.js?v=0.12.0';
function selectedHash(){try{return decodeURIComponent(location.hash.slice(1));}catch{return null;}}
const leave=()=>location.assign('./index.html');
const view=createCodexView(document.querySelector('#codex-page'),{initialId:selectedHash(),onClose:leave,onSelect:entry=>history.replaceState(null,'',`#${encodeURIComponent(entry.id)}`)});
addEventListener('hashchange',()=>{const id=selectedHash();if(id)view.openEntry(id);});
view.focus();
// This page has no game input router. Edges stay local and held buttons from the
// title screen must be released before they can open a record or leave the page.
const controllers=new Map(),button=(pad,index)=>Boolean(pad.buttons[index]?.pressed||pad.buttons[index]?.value>.5);
function controls(pad){const x=pad.axes[0]||0,y=pad.axes[1]||0;return{up:button(pad,12)||y<-.55,down:button(pad,13)||y>.55,left:button(pad,14)||x<-.55,right:button(pad,15)||x>.55,confirm:button(pad,0),cancel:button(pad,1),tabLeft:button(pad,4),tabRight:button(pad,5),exit:button(pad,8)||button(pad,9)};}
function pollControllers(now){
 if(!document.hidden){
  const connected=new Set();
  for(const pad of navigator.getGamepads?.()||[]){
   if(!pad||pad.connected===false)continue;connected.add(pad.index);const current=controls(pad);let previous=controllers.get(pad.index);
   if(!previous){previous={buttons:current,armed:false,repeats:{}};controllers.set(pad.index,previous);}
   if(!previous.armed){if(!Object.values(current).some(Boolean))previous.armed=true;previous.buttons=current;continue;}
   const input={};for(const [key,pressed]of Object.entries(current)){
    const direction=['up','down','left','right'].includes(key),edge=pressed&&!previous.buttons[key];
    if(edge){input[key]=true;if(direction)previous.repeats[key]=now+360;}
    else if(direction&&pressed&&now>=previous.repeats[key]){input[key]=true;previous.repeats[key]=now+130;}
    if(!pressed)delete previous.repeats[key];
   }
   previous.buttons=current;if(input.exit){leave();return;}view.handleInput(input);
  }
  for(const index of controllers.keys())if(!connected.has(index))controllers.delete(index);
 }
 requestAnimationFrame(pollControllers);
}
document.addEventListener('visibilitychange',()=>controllers.clear());
requestAnimationFrame(pollControllers);
window.render_game_to_text=()=>JSON.stringify({page:'codex',...view.snapshot()});
window.advanceTime=()=>{};
window.codexTest=view;
Object.defineProperty(window,'assetsReady',{get:()=>view.snapshot().artReady});
