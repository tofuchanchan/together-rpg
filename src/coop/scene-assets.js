// These groups are independent of combat rules. Waiting never advances World.
export function requiredSceneAssets(w){
 if(w.mode==='menu')return [];
 const groups=new Set();
 if(w.mode==='shop'||w.mode==='routeReward'){groups.add('shop');groups.add('equipment');}
 if(w.heroes?.some(h=>h.equipment?.armor||h.equipment?.weapon))groups.add('equipment');
 if(w.bonusEvent||w.enemies?.some(e=>e.bonusKind))groups.add('bonus');
 if(w.mode==='route'||w.objective?.kind==='nest'||w.objective?.kind==='defend'||w.enemies?.some(e=>e.kind==='nest'))groups.add('objectives');
 if(w.enemies?.some(e=>e.kind==='mossbell')||w.effects?.some(e=>e.type==='adventure-death'))groups.add('boss');
 return [...groups];
}
export function upcomingSceneAssets(w){
 if(w.mode!=='play'||w.time<2)return [];
 const groups=[];
 if(w.room>=2)groups.push('objectives','bonus');
 if(w.room>=4)groups.push('shop','equipment');
 if(w.room>=8)groups.push('boss');
 return groups;
}
export function createSceneAssets(loaders){
 const states=new Map(Object.keys(loaders).map(key=>[key,{status:'idle',error:null,promise:null}]));
 function load(key){
  const state=states.get(key);if(!state)throw Error(`Unknown asset group: ${key}`);
  if(state.status==='ready')return Promise.resolve();
  if(state.promise)return state.promise;
  state.status='loading';state.error=null;
  state.promise=Promise.resolve().then(()=>loaders[key]()).then(()=>{state.status='ready';},error=>{state.status='error';state.error=error.message||String(error);}).finally(()=>{state.promise=null;});
  return state.promise;
 }
 return {
  ready(keys){for(const key of keys)if(states.get(key).status==='idle')void load(key);return keys.every(key=>states.get(key).status==='ready');},
  // Prefetch only one group at a time. A required group can take priority.
  prefetch(keys){if([...states.values()].some(s=>s.status==='loading'))return;const key=keys.find(k=>states.get(k).status==='idle');if(key)void load(key);},
  retry(keys){return Promise.all(keys.filter(k=>states.get(k).status==='error').map(load));},
  wait(keys){return Promise.all(keys.map(load));},
  snapshot(){return Object.fromEntries([...states].map(([k,s])=>[k,{status:s.status,error:s.error}]));},
 };
}
