import {createCodexView} from './codex-view.js?v=0.9.1';
function selectedHash(){try{return decodeURIComponent(location.hash.slice(1));}catch{return null;}}
const view=createCodexView(document.querySelector('#codex-page'),{initialId:selectedHash(),onSelect:entry=>history.replaceState(null,'',`#${encodeURIComponent(entry.id)}`)});
addEventListener('hashchange',()=>{const id=selectedHash();if(id)view.openEntry(id);});
window.render_game_to_text=()=>JSON.stringify({page:'codex',...view.snapshot()});
window.advanceTime=()=>{};
window.codexTest=view;
Object.defineProperty(window,'assetsReady',{get:()=>view.snapshot().artReady});
