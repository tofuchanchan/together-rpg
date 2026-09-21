import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';
const root='output/verification/campaign-coherence';
const read=name=>JSON.parse(fs.readFileSync(`${root}/${name}.json`));
const legacy=read('baseline-legacy'),baseline=read('baseline-coherent'),paired=read('after-paired'),holdout=read('after-holdout'),build=read('after-build');
assert.equal(legacy.results.length,24);assert.equal(baseline.results.length,24);
assert.equal(paired.results.length,24);assert.equal(holdout.results.length,12);assert.equal(build.results.length,12);
assert.deepEqual(paired.hashes,holdout.hashes);assert.deepEqual(paired.hashes,build.hashes);
assert.equal(paired.policyHash,holdout.policyHash);assert.equal(paired.policyHash,build.policyHash);
const after=[...paired.results,...holdout.results,...build.results],matched=after.filter(r=>r.routePolicy==='safe'&&[17,41].includes(r.seed));
assert.equal(matched.length,24);
const outcome=rows=>({runs:rows.length,clear:rows.filter(r=>r.room>=11).length,defeat:rows.filter(r=>r.mode==='defeat').length,stalled:rows.filter(r=>r.anomalies.includes('wave-stall')).length,otherAnomalies:rows.flatMap(r=>r.anomalies.filter(x=>x!=='wave-stall'))});
const advancement=rows=>{
 const choices=rows.flatMap(r=>r.choices),lessons=rows.flatMap(r=>r.shops.flatMap(s=>s.actions.filter(a=>a.type==='lesson').map(a=>({...a,room:s.room}))));
 const ofKind=(a,key)=>a.filter(x=>x.key.startsWith(`${key}:`)).length;
 return {replacements:ofKind(choices,'replaceSkill'),lostInvestments:choices.filter(x=>x.key.startsWith('replaceSkill:')&&x.skillsBefore[Number(x.key.split(':')[1])]>1).length,advancesBeforeBoss:ofKind(choices.filter(c=>c.clear<19),'advance'),masteriesBeforeBoss:ofKind(choices.filter(c=>c.clear<19),'mastery'),advancesAfterBoss:ofKind(choices.filter(c=>c.clear>=19),'advance'),masteriesAfterBoss:ofKind(choices.filter(c=>c.clear>=19),'mastery'),lessonsBeforeBoss:lessons.filter(c=>c.room===5).length,lessonsAfterBoss:lessons.filter(c=>c.room===10).length,lessonKindsBeforeBoss:Object.fromEntries(['active','passive','advance','mastery'].map(k=>[k,lessons.filter(c=>c.room===5&&c.kind===k).length])),lessonKindsAfterBoss:Object.fromEntries(['active','passive','advance','mastery'].map(k=>[k,lessons.filter(c=>c.room===10&&c.kind===k).length]))};
};
const rounds=[['原机制／旧测试策略／招募优先',legacy.results.filter(r=>r.policy==='recruit')],['原机制／旧测试策略／装备优先',legacy.results.filter(r=>r.policy==='build')],['原机制／连贯策略／招募优先',baseline.results.filter(r=>r.policy==='recruit')],['原机制／连贯策略／构筑优先',baseline.results.filter(r=>r.policy==='build')],['新机制／连贯策略／招募优先・同种子安全线',matched.filter(r=>r.policy==='recruit')],['新机制／连贯策略／构筑优先・同种子安全线',matched.filter(r=>r.policy==='build')],['新机制／连贯策略／同种子风险线',paired.results.filter(r=>r.routePolicy==='risk')],['新机制／连贯策略／新种子安全线',holdout.results]];
const beforeGrowth=advancement(baseline.results),afterGrowth=advancement(after),oldGrowth=advancement(legacy.results);
const preBossMasteries=after.flatMap(r=>r.choices.filter(c=>c.clear<19&&c.key.startsWith('mastery:')).map(c=>({roles:r.roles,role:r.roles[c.id],seed:r.seed,policy:r.policy,route:r.routePolicy,clear:c.clear,key:c.key})));
const roleName={warrior:'战士',mage:'法师',archer:'弓手'};
const masteryDetails=preBossMasteries.length?`本批 48 局有 ${preBossMasteries.length} 次战前奖励精通：${preBossMasteries.map(c=>`${c.roles.map(r=>roleName[r]).join('＋')}、seed ${c.seed}、${c.policy==='recruit'?'招募':'构筑'}优先／${c.route==='safe'?'安全':'风险'}线、P${c.roles.indexOf(c.role)+1} ${roleName[c.role]}，第 ${c.clear} 次清波取得${SKILL_PAIRS[c.key.split(':')[1]]?.title||c.key}`).join('；')}。`:'本批 48 局没有角色在 Boss 战前从奖励中取得精通。';
const mageRepeat=matched.find(r=>r.policy==='build'&&r.seed===41&&r.roles.join(',')==='mage');
const mageOutcome=mageRepeat.room>=11?'新机制该组合已通过':`新机制该组合在第 ${mageRepeat.room} 关${mageRepeat.mode==='defeat'?'团灭':`停止（${mageRepeat.anomalies.join('、')||mageRepeat.mode}）`}`;
const sourceDrift=Object.entries(paired.hashes).filter(([name,hash])=>!fs.existsSync(`src/coop/${name}`)||crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${name}`)).digest('hex')!==hash).map(([name])=>name);
const normalized=path=>fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
const renderAlphaOnly=sourceDrift.length===1&&sourceDrift[0]==='render.js'&&normalized('src/coop/render.js')===normalized(`${paired.method.snapshot}/render.js`).replace('))c.globalAlpha*=.65;', '))c.globalAlpha*=.48;');
const snapshotStatus=renderAlphaOnly?'报告生成时已逐文件比对：全部战斗源码与最终快照 SHA-256 一致；唯一差异为 render.js 第 82 行被 Boss 遮挡时的绘制透明度由 0.65 改为 0.48，属于纯显示调整，不进入本次逻辑模拟。原快照和哈希保留，未改写为未经模拟的版本。':sourceDrift.length?`报告生成时与当前源码不同的文件：${sourceDrift.join('、')}，必须另行核对这些改动是否影响战斗结果。`:'报告生成时已逐文件比对，最终快照全部 JavaScript 模块与当前源码 SHA-256 一致（包括纯显示代码）。';
const bossRows=after.flatMap(r=>r.bosses.filter(b=>b.killed).map(b=>({...b,roles:r.roles,seed:r.seed,policy:r.policy,route:r.routePolicy}))),times=bossRows.map(b=>b.killSeconds).sort((a,b)=>a-b);
const skills=Object.fromEntries(['sweep','roots','leap','summon','ultimate'].map(key=>[key,bossRows.filter(b=>b.actions.includes(key)).length]));
const median=values=>values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
const summary={phase:paired.method.phase,snapshot:{source:paired.method.snapshot,sourceDrift,renderAlphaOnly,gameplaySourceMatches:!sourceDrift.length||renderAlphaOnly,policyHash:paired.policyHash},rounds:rounds.map(([name,rows])=>({name,...outcome(rows)})),legacy:oldGrowth,coherentBefore:beforeGrowth,coherentAfter:afterGrowth,preBossMasteries,boss:{arrived:after.filter(r=>r.bosses.length).length,cleared:bossRows.length,seconds:{min:times[0],median:+median(times).toFixed(2),max:times.at(-1)},skills},limitations:['Automated production-AI inputs, not human win rates.','New-seed and risk-route arms have no complete prior-mechanic counterpart.','Different shop and reward choices diverge seeded RNG after the first decision.','Chapter-10 purchases/rewards occur after defeating the boss.','No damage/HP/XP/gold/offer injection; real public gameplay methods used.']};
assert.equal(afterGrowth.lostInvestments,0);assert.equal(beforeGrowth.lostInvestments,0);
fs.writeFileSync(`${root}/summary.json`,JSON.stringify(summary,null,2)+'\n');
const table=summary.rounds.map(r=>`| ${r.name} | ${r.clear}/${r.runs} | ${r.defeat} | ${r.stalled} |`).join('\n');
const text=`# 自然成长与构筑策略对照测试

日期：2026-09-21。仅本地验证，未部署。

**结论：上一轮低通关率主要受测试选牌缺陷影响，不能直接认定职业数值不足。** 同一原生产机制、安全路线、同样 24 个阵容与种子组合，旧策略 ${outcome(legacy.results).clear}/24 通关，修正策略 ${outcome(baseline.results).clear}/24；保持修正策略再换新战斗机制为 ${outcome(matched).clear}/24。策略改善与机制修复分开归因。

**范围与结果**

本报告采用 96 局对照：原机制旧策略 24、原机制连贯策略 24、最终 AI 与碰撞逻辑的新机制 48。另有先前 48 局中间版本已归档到 interim/，不混入本报告结果；累计执行自然成长模拟 144 局。6 个开局为单战士、单法师、单弓手、战士＋法师、战士＋弓手、法师＋弓手。每局以完成第 10 关为目标，团灭或超时则停止；最多 1800 秒、单波 240 秒。新种子 83/127、安全/风险路线扩大覆盖；其余配对种子为 17/41。

| 对照组 | 完成第一章 | 团灭 | 单波超时 |
|---|---:|---:|---:|
${table}

原机制连贯策略唯一失败为构筑优先、单法师、seed 41 的第 9 关；${mageOutcome}。新机制总计 ${outcome(after).clear}/48 通关、${outcome(after).stalled} 次单波超时。新种子和风险路线没有完整的旧机制同策略对照，只作为覆盖验证；风险线统计章通关，并不等于每个支线目标都成功。

**测试策略纠偏**

- 不预定种子专属流派；第一次实际取得的主动决定尝试方向，仍只从真实随机选项中选择。
- 保护 II 级以上主动、进阶和形态投资；只有 I 级非方向主动可换为实际出现的缺失搭档。原机制两组的主动替换从 ${oldGrowth.replacements} 次降到 ${beforeGrowth.replacements} 次；新策略前后累计 II 级以上主动被丢弃为 0。
- 进阶、精通获得合理优先级；被动替换保留来源与流派组件。无好选项时可保留构筑，或接受保持等级的旧形态分支；不保证每局成型。
- 招募优先先买佣兵；构筑优先先买实际课程／装备。均使用个人钱包、真实涨价、资格和库存验证；不修改金币、掉落、生命、经验或候选池。

**Boss 前后必须分开统计**

| 选牌或购物事件 | 原机制・连贯策略 24 局 | 新机制・连贯策略 48 局 |
|---|---:|---:|
| Boss 前奖励取得进阶 | ${beforeGrowth.advancesBeforeBoss} | ${afterGrowth.advancesBeforeBoss} |
| Boss 前奖励取得精通 | ${beforeGrowth.masteriesBeforeBoss} | ${afterGrowth.masteriesBeforeBoss} |
| 第 5 关购买课程 | ${beforeGrowth.lessonsBeforeBoss} | ${afterGrowth.lessonsBeforeBoss} |
| 击败 Boss 后奖励取得进阶／精通 | ${beforeGrowth.advancesAfterBoss}／${beforeGrowth.masteriesAfterBoss} | ${afterGrowth.advancesAfterBoss}／${afterGrowth.masteriesAfterBoss} |
| 第 10 关战后商店购买课程 | ${beforeGrowth.lessonsAfterBoss} | ${afterGrowth.lessonsAfterBoss} |

原机制新策略的第 5 关课程为主动 ${beforeGrowth.lessonKindsBeforeBoss.active}、被动 ${beforeGrowth.lessonKindsBeforeBoss.passive}、进阶 ${beforeGrowth.lessonKindsBeforeBoss.advance}、精通 ${beforeGrowth.lessonKindsBeforeBoss.mastery}。新机制对应为 ${afterGrowth.lessonKindsBeforeBoss.active}／${afterGrowth.lessonKindsBeforeBoss.passive}／${afterGrowth.lessonKindsBeforeBoss.advance}／${afterGrowth.lessonKindsBeforeBoss.mastery}。${masteryDetails}第 10 关商店与高阶奖励已经在 Boss 击杀之后，不能把最终角色面板算作战前成型。

**Boss 自然战斗覆盖**

新机制 ${bossRows.length} 场 Boss 击杀，耗时最短／中位／最长为 ${times[0]}／${summary.boss.seconds.median}／${times.at(-1)} 秒。至少进入起手的场次：横扫 ${skills.sweep}、根径 ${skills.roots}、跃击 ${skills.leap}、召唤 ${skills.summon}、大招 ${skills.ultimate}；这项计数不等于实际命中玩家。允许强构筑跳过部分招式；本测试不使用锁血延长演出。

8 项策略回归通过：随机起手、保护等级、条件替换、进阶精通资格、被动依赖、真实课程扣款、差选项保留等级、金币不足不得购买。模拟数据复查全部主动替换前后等级，未发现丢弃高等级投资。

**边界与后续**

这些角色由生产 AI 逐帧提供正常玩家输入；读取预警与闪避的反应优于多数真人。高通过率不等于真人胜率，也不能据此立即加血加伤。相同种子在不同决策后也会发生随机序列分叉，不是逐敌逐掉落完全一致的实验。当前证据支持修复治疗闭环与不可读组合，未显示需要整体削弱普通怪或提高弓手伤害。仍需真人键盘／双手柄、延迟反应和第 11 关后的长局验证。动画表现另见根任务的原生录像与专项报告。

证据：

- [汇总 JSON](D:/project-gamedemo/together-rpg/${root}/summary.json)
- [原机制旧策略](D:/project-gamedemo/together-rpg/${root}/baseline-legacy.json) · [原机制连贯策略](D:/project-gamedemo/together-rpg/${root}/baseline-coherent.json)
- [新机制原种子安全／风险线](D:/project-gamedemo/together-rpg/${root}/after-paired.json) · [新种子](D:/project-gamedemo/together-rpg/${root}/after-holdout.json) · [构筑优先](D:/project-gamedemo/together-rpg/${root}/after-build.json)

基线与新机制均冻结生产模块副本，JSON 保存模块 SHA-256；连贯策略报告同时保存策略文件 SHA-256。${snapshotStatus}原始记录含每次选牌的前后技能等级、商店花费、波次伤害、Boss 技能及终局状态。上一版 48 局与原快照保存在 [中间版本归档](D:/project-gamedemo/together-rpg/${root}/interim/summary.json)。
`;
fs.writeFileSync('CAMPAIGN-COHERENCE-REPORT.md',text);console.log(JSON.stringify(summary,null,2));
