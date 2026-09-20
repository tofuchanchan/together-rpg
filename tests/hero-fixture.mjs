import {createHero} from '../src/coop/recruitment.js';
// Combat-isolation fixtures can supply actors without changing no-AI startup.
// Tests of actual recruitment must use the shop transaction instead.
export function addFixtureCompanions(w,roles=['warrior','mage','archer']){
 for(const role of roles)if(!w.heroes.some(h=>h.role===role))w.heroes.push(createHero(role,w.heroes.length,{ai:true}));
 return w;
}
