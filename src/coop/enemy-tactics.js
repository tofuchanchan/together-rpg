import {enemyDef} from './enemies.js';
// All random choices are sampled once per decision, never once per rendered frame.
export const ENRAGE={speed:1.35,damage:1.3,attackRate:1.4};
export function rageDeadline(duration,boss=false){return boss?150:duration+20;}
export function combatStats(e,enraged){const d=enemyDef(e);return enraged&&!e.boss?{...d,speed:d.speed*ENRAGE.speed,damage:d.damage*ENRAGE.damage,contactDamage:(d.contactDamage||0)*ENRAGE.damage,cd:d.behavior==='healer'?d.cd:d.cd/ENRAGE.attackRate}:d;}
// A support restores wounded fighters, never itself or another healer. Resolve
// this again on release so moving behind cover really breaks the heal.
export function healingTargets(w,e){return w.enemies.filter(a=>a!==e&&a.hp>0&&a.hp<a.maxHp&&enemyDef(a).behavior!=='healer'&&Math.hypot(a.x-e.x,a.y-e.y)<220&&w.lineClear(e,a)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,3);}
export function aimPoint(target,def,random,map){
 const lead=def.lead||0,speed=Math.hypot(target.vx||0,target.vy||0),cap=210;
 const k=speed>cap?cap/speed:1,angle=random()*Math.PI*2,jitter=(def.scatter||0)*Math.sqrt(random());
 return{x:Math.max(-map.x+30,Math.min(map.x-30,target.x+(target.vx||0)*lead*k+Math.cos(angle)*jitter)),y:Math.max(-map.y+30,Math.min(map.y-30,target.y+(target.vy||0)*lead*k+Math.sin(angle)*jitter))};
}
