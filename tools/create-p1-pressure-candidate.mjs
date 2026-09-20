import fs from 'node:fs';
const out='output/p1-fixes/intro-src';fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync('src/coop').filter(f=>f.endsWith('.js')))fs.copyFileSync(`src/coop/${f}`,`${out}/${f}`);
let p=fs.readFileSync(`${out}/pressure.js`,'utf8').replace('[0,.20,.50,1]','[0,.20,.35,.50]').replace(' if(size===3)return {...plan,partySize:size};','');
p=p.replace(" // A scheduled specialist every twelfth spawn keeps support and ranged foes present."," const roster=room===1?['goblin','slime','bat']:room===2?['goblin','mushroom','slime','bat','wolf','skeleton']:room===3?SPECIAL.filter(k=>!['shaman','beetle','wisp'].includes(k)):room===4?SPECIAL.filter(k=>k!=='shaman'):SPECIAL;\n // Specialist mechanics enter gradually before the first shop.");
p=p.replace('return SPECIAL[(Math.floor(index/12)+(room-1)*2+wave-1)%SPECIAL.length]','return roster[(Math.floor(index/12)+(room-1)*2+wave-1)%roster.length]').replace("SPECIAL[Math.min(SPECIAL.length-1,Math.floor((pick-.87)/.13*SPECIAL.length))]","roster[Math.min(roster.length-1,Math.floor((pick-.87)/.13*roster.length))]");
fs.writeFileSync(`${out}/pressure.js`,p);
