// The catalogue owns only the pause it creates. Existing pauses, focus loss and
// disconnected controllers must still require the usual explicit resume.
export function createCodexSession(world,router,hasFocus=()=>true){
 let ownsPause=false,interrupted=false;
 return{
  open(){ownsPause=['play','upgrade','shop'].includes(world.mode);interrupted=false;router.blur();world.pause('正在查看冒险图鉴');world.clearBuffers();},
  interrupt(reason){interrupted=true;if(world.mode==='paused')world.reason=reason;},
  close(){router.blur();world.clearBuffers();if(ownsPause&&!interrupted&&hasFocus()&&!router.slots.slice(0,world.humanCount).some(s=>s.type==='disconnected'))world.resume();ownsPause=false;},
 };
}
