// Explicit opt-in presets for the build trial entry. Normal runs never call this.
export const BUILD_TRIALS={
 bulwark:{role:'warrior',title:'盾阵反击',forms:['aegis',null],passives:{guard:1,storage:1,guardRelease:1}},
 berserker:{role:'warrior',title:'血刃旋风',forms:[null,'bloodspin'],passives:{rageEdge:1,battleRhythm:1,harvest:1}},
 pyromancer:{role:'mage',title:'连锁炎爆',forms:[null,null],passives:{ember:1,emberConsume:1,detonate:1}},
 frostweaver:{role:'mage',title:'冰枪碎裂',forms:['icelance','coldfield'],passives:{chill:1,iceFragments:1,frostReturn:1}},
 sniper:{role:'archer',title:'猎印狙击',forms:['markedshot',null],passives:{markCashout:1,weakpoint:1,markTransfer:1}},
 ranger:{role:'archer',title:'影身齐射',forms:[null,'shadowvolley'],passives:{afterimage:1,volleyCharge:1,delayedVolley:1}},
};

export function applyBuildTrial(world,key){
 const trial=Object.hasOwn(BUILD_TRIALS,key)?BUILD_TRIALS[key]:null,h=world?.heroes?.[0];
 // The caller first resets the party with this role, preserving normal class stats.
 if(!trial||!h||h.role!==trial.role)return false;
 h.core=key;h.skills=[2,2];h.forms=[...trial.forms];h.passives={...trial.passives};
 for(const ally of world.heroes)if(ally!==h&&ally.ai)ally.skills=[1,1];
 return true;
}
