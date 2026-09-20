// Finite wave pressure: one live cap and one lifetime budget, with no deferred backlog.
export function pressurePlan(room,wave){
 const progress=Math.max(1,(room-1)*2+wave),n=progress-1,targetAlive=32+Math.min(44,Math.floor(n*1.2));
 return {duration:58+(wave-1)*6+Math.min(30,Math.floor((room-1)/3)*2),initial:targetAlive,targetAlive,aliveCap:72+Math.min(56,Math.floor(n*1.5)),totalBudget:n===0?144:n===1?160:180+Math.min(420,n*8),interval:Math.max(3.2,5.2-n*.04),timedBatch:8+Math.min(6,Math.floor(n/8)),refillBurst:8,spawnRadius:[380,530]};
}
// Party membership is sampled at wave start, including temporarily downed allies.
// Monster stats, duration and drops stay unchanged; solo starts have no free AI.
export function partyPressure(plan,partySize){
 // A new companion adds pressure without multiplying the entire existing
 // crowd. Lifetime budgets still grow per member; kills and the timed cadence
 // keep replenishing the wave under its active cap.
 const size=Math.max(1,Math.min(3,Math.floor(partySize)||1)),density=[0,.20,.35,.50][size],budget=[0,1/3,2/3,1][size];
 return {...plan,partySize:size,initial:Math.max(1,Math.round(plan.initial*density)),targetAlive:Math.max(1,Math.round(plan.targetAlive*density)),aliveCap:Math.max(1,Math.round(plan.aliveCap*density)),totalBudget:Math.max(1,Math.round(plan.totalBudget*budget)),timedBatch:Math.max(1,Math.round(plan.timedBatch*density)),refillBurst:Math.max(1,Math.round(plan.refillBurst*density))};
}
export function createPressureState(plan){return {spawned:0,nextAt:0,lastAlive:0,pendingRefill:0};}
export function pressureTick(plan,state,{elapsed,alive}){
 const deaths=Math.max(0,(state.lastAlive||0)-alive),next={spawned:state.spawned,nextAt:state.nextAt,lastAlive:alive,pendingRefill:Math.min(plan.aliveCap,(state.pendingRefill||0)+deaths)};
 if(elapsed>=plan.duration||next.spawned>=plan.totalBudget){next.pendingRefill=0;return {count:0,state:next,reason:'closed',closed:true};}
 const room=Math.max(0,plan.aliveCap-alive),budget=Math.max(0,plan.totalBudget-next.spawned);
 let wanted=0,reason='wait';
 if(!next.spawned){wanted=plan.initial;next.nextAt=elapsed+plan.interval;reason='initial';}
 else{
  if(alive<plan.targetAlive||next.pendingRefill){wanted=Math.min(plan.refillBurst,Math.max(plan.targetAlive-alive,next.pendingRefill));reason='refill';}
  if(elapsed>=next.nextAt){wanted=Math.max(wanted,plan.timedBatch);next.nextAt=elapsed+plan.interval;reason='timed';}
 }
 const count=Math.max(0,Math.min(wanted,room,budget));next.spawned+=count;next.lastAlive=alive+count;next.pendingRefill=Math.max(0,next.pendingRefill-count);
 return {count,state:next,reason:count?reason:room===0?'capped':reason,closed:next.spawned>=plan.totalBudget};
}
const SWARM=['seedling','dustling','gnat'];
const SPECIAL=['goblin','mushroom','slime','bat','wolf','skeleton','spider','wisp','shaman','beetle'];
export function pressureKind(room,wave,index,random){
 // A scheduled specialist every twelfth spawn keeps support and ranged foes present.
 if(index%12===11)return SPECIAL[(Math.floor(index/12)+(room-1)*2+wave-1)%SPECIAL.length];
 const pick=random();if(pick<.87){const weight=pick/.87;return SWARM[weight<.42?0:weight<.79?1:2];}
 const specialist=SPECIAL[Math.min(SPECIAL.length-1,Math.floor((pick-.87)/.13*SPECIAL.length))];
 // Scheduled shamans remain; early random support stacks must not out-heal base kits.
 return specialist==='shaman'&&(room-1)*2+wave<=6?'skeleton':specialist;
}
