import fs from 'node:fs';
const root='output/verification/boss-specialist',read=p=>JSON.parse(fs.readFileSync(`${root}/${p}.json`));
const before=read('before/balance'),after=read('after/balance'),campaign=read('after/campaign'),intro=read('after/intro'),video=read('after/video-metrics');
if(campaign.results.length!==24)throw Error('Natural campaign still running');
const names={fortress:'盾墙反击＋冲击波',blades:'剑气龙卷＋一文字斩',rail:'钉住目标＋贯穿分裂',storm:'逐浪箭雨＋回旋散射',stars:'星轨＋密集追踪弹',elements:'冰场控制＋灼烧蒸汽爆裂'};
const routes=Object.entries(names).map(([key,name])=>{const s=stage=>after.summary.find(r=>r.key===`${key}/${stage}/0.18`);return`| ${name} | ${s('basic').seconds} 秒 | ${s('advanced').seconds} 秒 | ${s('formed').seconds} 秒 | ${s('formed').hpPct}% |`;}).join('\n');
const rosterNames={warrior:'战士开局',mage:'法师开局',archer:'弓手开局','warrior+mage':'战士＋法师','warrior+archer':'战士＋弓手','mage+archer':'法师＋弓手'};
const rosterRows=Object.entries(rosterNames).map(([key,name])=>{const rows=campaign.results.filter(r=>r.roles.join('+')===key);return`| ${name} | ${rows.filter(r=>r.room===11).length}/4 | ${rows.filter(r=>r.mode==='defeat').length} | ${rows.filter(r=>r.anomalies.length).length} |`;}).join('\n');
const passed=campaign.results.filter(r=>r.room===11),bossTimes=passed.flatMap(r=>r.bosses).filter(b=>b.killed).map(b=>b.killSeconds);
const beforeFailed=before.rows.filter(r=>!r.won).length;
fs.writeFileSync('BOSS-SPECIALIST-REPORT.md',`# 平衡、难度与 Boss 专项测试

2026-09-21 · 本地工作区 · 重点为第 10 关「苔钟守卫」。本轮未推送、未部署。

**结论：战斗判定与流程通过；整体平衡和 Boss 演出部分通过，尚不建议据此宣布精修验收完成。**

## 测试范围与证据

- 共 **436 场模拟**：Boss 修复前后各 176 场、自然第一章修复前后各 24 局、前 3 关操作对照 36 局。
- **699 项单元回归：696 通过、0 失败、3 项原有长测跳过**。另有 12 组真实浏览器流程检查通过，18 项新增 Boss 专项回归全部通过。
- 原生渲染：修复前后各 28 张动作带/命中画面，7 段连续动作与实际音频管线录制；官方游戏 Playwright 客户端完成三轮操作与截图，未记录页面异常。
- [视频、慢放与前后对照](output/verification/boss-specialist/index.html)；[约 25 秒原生录像](output/verification/boss-specialist/after/boss-native-motion.webm)。

## 已发现并修复

| 问题 | 修复与验证 |
|---|---|
| 跃击原地起跳后瞬移；遇障碍时落点与预警可能不同 | 先锁定合法落点，沿连续曲线飞行，准确落在预警中心；飞行中不造成地面接触伤害 |
| 出招朝向沿用之前的移动方向 | 出招时锁定目标朝向，左右两侧均做动作带检查 |
| 玩家与 Boss 身体重叠并反复受伤 | 接触后分离地面身体，保留闪避穿身；基础盾控战士即时 AI 样本剩余血量 16.82% → 43.67% |
| 裂地、钟鸣沿用圆形小命中特效 | 特效复用扇形、根径、落地圆、缺口圆环的判定数据；安全通道保留绿色，危险释放使用暖色 |
| 远程站在范围外，Boss 反复对空横扫 | 超出横扫距离时改用有完整预警的跃击/根径；减速现在能降低追击速度，保留抗冻结 |
| 落地中心命中没有方向；Boss 命中反馈像普通攻击 | 落地采用跃进方向，方向格挡生效；增加受设置控制的震屏、低频冲击与钟音 |

## Boss 专项结论

| 项目 | 结果 | 证据与限制 |
|---|---|---|
| 动画与判定同步 | 通过 | 连续跃击不再瞬移；蓄力无提前伤害；命中帧产生对应范围特效，单个预警只伤害一次 |
| 碰撞 | 通过 | 53 的 Boss 地面半径、17 的角色半径；落点避障、接触分离、闪避无敌；高速弹道命中/擦边不命中均回归 |
| 伤害 | 通过 | 第 10 关横扫/跃击/钟鸣未减伤约 35.5，单道根径约 22.6；护甲、方向格挡、护盾、0.55 秒受击无敌继续生效；关闭反馈不改伤害 |
| 技能辨识 | 基本通过 | 横扫扇面、三道裂地、跃击落点、召唤侍卫、三段钟鸣有不同机制；圆环缺口不会被命中特效填满 |
| 阶段与击杀 | 通过 | 70% / 35% 阶段，当前招式结束后切换；失衡与大招后存在输出窗口；召唤数量有限；死亡清除预警与召唤物 |
| 演出冲击力 | **部分通过** | 有独立轮廓、跃击位移、释放纹理、震屏及钟声，但横扫释放的原画中间帧仍少，召唤与转阶段存在长时间单帧停留。尚未达到角色动画精修标准 |

录像为实际 World/View 渲染，额外生命只用于不中断展示。音频管线录到非零信号，**不等于完成主观听感验收**。未新增整套逐帧原画；第 20 关旧 Boss 仅执行已有逻辑回归，未做同规格美术验收。

## 六流派强度

同种子、无装备、正常 HP 和伤害。每组 4 个种子；下表采用 180ms 延迟、10Hz 输入采样的自动策略。基础/进阶各 10 次属性选择；成型为 11 次构筑选择＋15 次属性选择。不同阶段投入不同，不能把耗时差直接解释为单张升级卡收益。

| 流派 | 基础形态击杀 | 进阶形态击杀 | 成型击杀 | 成型剩余 HP |
|---|---:|---:|---:|---:|
${routes}

修复前 ${176-beforeFailed}/176、修复后 176/176 击败 Boss。修复后 84 场未损失 HP（其中盾控可能消耗护盾），不是所有攻击都没有命中。成型星轨杀 Boss 最快；盾控生存稳定，但耗时约为星轨的 3.2 倍。首个 Boss 对成型构筑偏宽松，**不能把预设构筑全部通关解读成六流派已平衡**，也不能假定自然第 10 关一定成型。

## 自然成长与难度

真实掉落、拾取、可见升级选项、私人金币、付费买装备/招募；未注入构筑或生命。每种开局 2 种子 × 缓路/险路各一次。单人开局允许商店招募，所以统计是“开局阵容”，不是整局永远单人。本策略以装备/招募为主，未购买精通课程，不能代表最优购物或真人胜率。

| 开局阵容 | 完成第 10 关 | 团灭 | 单波超过 240 秒 |
|---|---:|---:|---:|
${rosterRows}

- 修复前后均为 **11/24 完成第一章、10/24 团灭、3/24 达到单波时限**。未到 Boss 的结果保持一致；本轮没有改普通怪数值来掩盖问题。
- 到达 Boss 的 11 队全部击败它，修复后耗时 **${Math.min(...bossTimes)}—${Math.max(...bossTimes)} 秒**。自然样本表明第 7—9 关比首个 Boss 更容易成为失败点。
- 3 个超时样本都在第 9 关第二波，仍在移动/造成伤害，不是已证实的程序死锁。涉及治疗怪、高稀有怪、倒地救援拉扯，需进一步拆开归因。
- 前 3 关完整策略 **12/12** 通关，结束约 Lv.4；仅保留走位与普攻为战士 **4/4**、法师 **0/4**、弓手 **2/4**；原地不操作 **0/12**。法师更依赖技能与闪避，早期学习成本不一致。走位策略仍使用 AI 感知，不能等同新手。

## 后续优先级

1. **P1 难度曲线**：重点复测第 7—9 关治疗怪＋稀有怪组合、救援状态与新加入队友后的压力；先查具体组合，避免全局削弱所有怪物。
2. **P1 构筑成长差异**：补充会购买精通的购物策略、更多种子及真实手柄试玩，分开比较弓手成型前生存与成型后输出；盾控与奥术的生存/击杀效率不能只用 DPS 拉齐。
3. **P1 Boss 演出**：为横扫释放、召唤、转阶段补同角色原画中间帧，增强落地碎石、钟壳开裂等动作事件。当前素材足够验证机制，还不够作为最终演出。
4. **P2 Boss 压力**：自然样本的 Boss 门槛偏低。先用真人验证闪避窗口和阶段节奏，再考虑二阶段多目标压迫；保留可读预警，避免单纯堆血和缩短前摇。

未覆盖：真实双手柄/移动端性能、主观听感、真人胜率、20 关以后的完整自然通关。以上均未冒充自动化已通过。
`);
const skillNames={sweep:'石槌横扫',roots:'根径裂地',leap:'跃步落钟',summon:'唤醒侍卫',ultimate:'合围钟鸣',stagger:'钟芯暴露',transition:'钟壳崩裂'};
let start=0;const chapters=video.clips.map(c=>{const s=start;start+=c.frames.length/60;return`<button data-seek="${s}">${skillNames[c.skill]}</button>`}).join('');
fs.writeFileSync(`${root}/index.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>苔钟守卫 · 专项验收</title><style>body{margin:0;background:#eff0df;color:#233f36;font:16px/1.65 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:38px 24px}h1{font-size:38px;margin:4px 0 10px}h2{margin-top:32px}.eyebrow{letter-spacing:.16em;color:#7a8464}p{max-width:900px}video,img{width:100%;border-radius:12px;background:#183e34}button,select,a.link{font:inherit;border:1px solid #b8c8a3;border-radius:8px;padding:9px 15px;background:#fffef2;color:#234b3e;cursor:pointer}button:hover{background:#dce9cc}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}a{color:#25604d}.note{padding:18px;border-left:5px solid #c79a50;background:#fff9e6}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:720px){.grid{grid-template-columns:1fr}h1{font-size:28px}}</style><main><div class="eyebrow">TOGETHER RPG / BOSS QA / 2026.09.21</div><h1>苔钟守卫 · 专项验收</h1><p class="note"><b>判定与流程通过，演出部分通过。</b>跃击轨迹、碰撞、技能范围反馈已修复。召唤和转阶段仍有长时间单帧停留，需要补原画；完整结论见报告。</p><div class="controls"><a class="link" href="../../../BOSS-SPECIALIST-REPORT.md">测试报告</a><a class="link" href="../../../?adventureTrial=boss">进入正常伤害 Boss 试玩</a></div><h2>连续动作 · 实际音频</h2><p>7 段原生运行画面。固定镜头、额外生命、关闭普攻，仅用于观察动作。点击技能跳转，支持慢放。</p><video controls preload="metadata" src="after/boss-native-motion.webm" poster="after/impact-leap-right.png"></video><div class="controls">${chapters}<select id="speed" aria-label="播放速度"><option value="1">1× 正常</option><option value="0.5">0.5× 慢放</option><option value="0.25">0.25× 逐帧观察</option></select></div><h2>修复前后 · 同一招式</h2><div class="controls"><select id="skill" aria-label="选择技能">${Object.entries(skillNames).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><select id="side" aria-label="目标方向"><option value="right">目标在右侧</option><option value="left">目标在左侧</option></select></div><div class="grid"><section><b>修复前</b><img id="old" alt="修复前命中画面"></section><section><b>修复后</b><img id="new" alt="修复后命中画面"></section></div><p>动作带（点击可打开原尺寸）</p><a id="stripLink"><img id="strip" alt="十帧连续动作带"></a><h2>原始记录</h2><p><a href="after/balance.json">176 场 Boss 对照</a> · <a href="after/campaign.json">24 局自然第一章</a> · <a href="after/intro.json">36 局前期操作对照</a> · <a href="after/video-metrics.json">连续动作与音频记录</a></p><p>自动策略不是玩家胜率。未部署；本页保留已知未达标项，供下一轮验收使用。</p></main><script>const video=document.querySelector('video');document.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>{video.currentTime=Number(b.dataset.seek);video.play()});document.querySelector('#speed').onchange=e=>video.playbackRate=Number(e.target.value);function refresh(){const skill=document.querySelector('#skill').value,side=document.querySelector('#side').value;document.querySelector('#old').src='before/impact-'+skill+'-'+side+'.png';document.querySelector('#new').src='after/impact-'+skill+'-'+side+'.png';const strip='after/motion-'+skill+'-'+side+'.png';document.querySelector('#strip').src=strip;document.querySelector('#stripLink').href=strip}document.querySelector('#skill').onchange=refresh;document.querySelector('#side').onchange=refresh;refresh();</script></html>`);
console.log('Report and review gallery created');
