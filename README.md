# 同行 · 林间远征

D「极简豆豆冒险」画风的本地双人可玩样板。三职业、共享镜头、两波敌人、清房各自三选一升级，随后可继续同一房型的下一轮。

## 运行与入口

GitHub 仓库：https://github.com/tofuchanchan/together-rpg

在线试玩：https://tofuchanchan.github.io/together-rpg/ （已部署）

站点是纯静态 HTML / JavaScript / PNG，不需要后端、数据库或线上 Node 服务。GitHub Pages 设置使用 `main` 分支的根目录；`.nojekyll` 禁用 Jekyll 处理。后续推送 `main` 会触发站点更新。浏览器推荐桌面 Chrome / Edge；公开访问仍为本地同屏双人，没有异地联机或手机触屏操作。

在项目目录执行：

    node tools/serve.mjs

- 游戏：http://127.0.0.1:4173/
- D 三职业八方向动作工坊：http://127.0.0.1:4173/bean-lab.html
- 怪物、场景、特效与 UI 美术工坊：http://127.0.0.1:4173/art-lab.html
- 原低多边形工坊：http://127.0.0.1:4173/lab.html
- 概念图：http://127.0.0.1:4173/output/coop-design/index.html

使用本地 HTTP 服务打开，不能直接双击 HTML。运行依赖保存在 assets/vendor，无运行时外网请求。

## 操作

开始界面选择不同职业，第三职业交给 AI。选择“绑定手柄”，在对应手柄上按按钮认领；P1 与 P2 都能绑定手柄。没有手柄时默认使用两套键盘布局。

| 设备 | 移动 | 技能 1 / 2 | 闪避 | 升级选择与确认 |
|---|---|---|---|---|
| P1 键盘 | WASD | Q / E | Space | W / S，E 确认 |
| P2 备用键盘 | 方向键 | 小键盘 1 / 2 | 小键盘 0 | 上 / 下，Enter 确认 |
| 标准布局手柄 | 左摇杆 | X / Y | A | 摇杆或十字键，A 确认 |

P / Escape / 手柄 Start 暂停；F 全屏。窗口失焦和设备断开会暂停。暂停界面可重新绑定设备、切换反馈、震屏与判定显示。升级过程中也可暂停处理设备。

普攻自动，不自动追怪。战士为盾冲 / 旋风斩，法师为火球 / 冰霜环，弓手为贯穿箭 / 扇射。红圈是敌人攻击预警；玩家倒地后，任意存活队友在附近停留 2 秒可救起。

## 当前实现

- 三职业已按 D 示例图重做为透明 PNG 精灵；游戏、选人和头像直接读取图集，不再用几何图形拼角色。移动与战斗使用独立关键姿态，动作时间与命中判定分离。
- 怪物、背景、12 种场景物件、20 个图标、六组特效、弹道和全部游戏 UI 已统一为同画风插画 PNG。新增六张图集、152 个透明单元与一张背景；选人、战斗、升级、暂停、手柄绑定、失败和清房均已接入。资源与提示词见 assets/world。
- 输入独立绑定到玩家槽位，连续角度与模拟推幅、径向死区、短缓存、动作取消；失焦清输入，重连须认领。
- 固定 120Hz 战斗模拟，渲染独立；命中只结算一次，无敌和冷却不受表现顿帧影响。
- 局部命中短停、受击亮色、击退、数字、音效、轻量震屏；不冻结另一位玩家。
- AI 自动移动、普攻、技能、危险区闪避、救援；简单障碍绕行与队友间距，尚非完整寻路。
- 双人独立血量、技能冷却、角色标记；共享经验、镜头和升级暂停；每人独立随机三选一。
- 动作工坊支持三职业、7 动作、8 方向、逐帧、慢放与 PNG 导出。
- 每职业图集 64 单元：8 方向 ×（4 个移动姿态 + 4 个战斗姿态），共 192 单元。每单元 256 × 256，脚点 (128, 210)；位移、呼吸、受击反馈由播放层控制。实际素材在 assets/characters，来源与提示词见该目录 README 和 prompts.md。
- 动作工坊的 16 格时间轴用于观察播放过程，不代表每个动作有 16 张独立绘制帧；技能复用对应的出招或低姿态，弹道和法术特效独立。出招期间使用完整战斗帧，结束后接回持续累积的移动步态。

## 验证命令

    node --test tests/*.test.mjs
    node tools/verify-coop.mjs
    node tools/prepare-character-sprites.mjs
    node tools/verify-character-sprites.mjs
    node tools/prepare-world-art.mjs
    node tools/verify-world-art.mjs
    node tools/web-game-client.mjs --url http://127.0.0.1:4173/ --actions-file tools/coop-smoke.json --iterations 1 --pause-ms 250 --screenshot-dir output/coop-verification/final-smoke

浏览器验证需要运行本地服务。工具使用本机已安装的 Playwright；旧工坊仍可用 node tools/verify.mjs 验证。
战斗报告：output/coop-verification。角色报告：output/character-rework。全资源美术报告、截图与验收页：output/art-overhaul。运行图集：assets/characters 和 assets/world。旧程序图集 assets/beans 留作历史样板。参考与初始设计：output/coop-design/implementation-contract.md。

## 边界

- 双手柄输入通过模拟设备路由测试；没有接入实体手柄做兼容性和延迟验收。不支持未标准化设备的自定义按键校准，未知布局需另外验证。
- 当前游戏美术已统一为参考图生成的插画素材；音效仍为合成占位。角色和怪物采用关键姿态，特效采用四阶段序列，更细的中间帧与各技能专属长动画尚未制作。
- 目前只有一种房型、两类敌人和可循环关卡；没有 Boss、随机地图、完整技能进化、存档或联网。
- 升级池当前是伤害、生命、移速、技能伤害与补给。数值用于样板，未完成长期平衡。
- 未进行真实双人体验验收、实体设备端到端延迟测量、长期性能压力测试或移动端触屏操作验证。
- 原动作工坊资料保存在 README-lab.md。
