import {createCodexView} from './codex-view.js';
function selectedHash(){try{return decodeURIComponent(location.hash.slice(1));}catch{return null;}}
const view=createCodexView(document.querySelector('#codex-page'),{initialId:selectedHash(),onSelect:entry=>history.replaceState(null,'',`#${encodeURIComponent(entry.id)}`)});
addEventListener('hashchange',()=>{const id=selectedHash();if(id)view.openEntry(id);});
window.render_game_to_text=()=>JSON.stringify({page:'codex',...view.snapshot()});
window.advanceTime=()=>{};
window.codexTest=view;
await view.ready;
window.assetsReady=true;
