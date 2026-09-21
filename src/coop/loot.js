export const XP_CHANCE=[.66,.84,.95,.99],XP_VALUE=[1,2,4,7];
export const GOLD_CHANCE=[.04,.08,.14,.22],GOLD_VALUE=[1,2,4,7];
export const POTION_CHANCE=[.011,.03,.06,.11];
export const xpRequired=level=>([28,62,100,140][Math.max(0,Math.floor(level)-1)]??(32+Math.max(0,Math.floor(level)-1)*38));

export function lootRoll(enemy,random){
 const rank=Math.max(0,Math.min(3,Math.floor(enemy.rarity||0))),boss=!!enemy.boss||enemy.kind==='thornking',summoned=enemy.summonedBy!==undefined&&enemy.summonedBy!==null;
 // Fixed three RNG samples per death keep drop streams deterministic across outcomes.
 const rolls=[random(),random(),random()],drops=[];
 const xpChance=enemy.progress>=1&&enemy.progress<=2?Math.max(.85,XP_CHANCE[rank]):XP_CHANCE[rank];
 if(rolls[0]<(boss?1:xpChance*(summoned?.35:1)))drops.push({type:'xp',value:boss?24:XP_VALUE[rank]});
 if(!summoned&&rolls[1]<(boss?1:GOLD_CHANCE[rank]))drops.push({type:'gold',value:boss?10:GOLD_VALUE[rank]});
 if(!summoned&&rolls[2]<(boss?1:POTION_CHANCE[rank]))drops.push({type:'potion',value:35});
 return drops;
}
