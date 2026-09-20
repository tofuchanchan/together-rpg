# 换装图集

素材使用内置 imagegen 生成。原始接受稿保存在 `source/`，最终提示词在 `source/prompts.json`。没有通过滤色生成套装，也没有用几何形状代画角色。

- 9 套身体：职业默认去武器版本各 1 套，新增防具各 2 套。每套 8 个朝向 × 4 张完整身体姿势。
- 6 件独立武器：每件 8 张方向视图。防具和武器可以独立选择；所有身体均无烘焙主武器，战士盾牌属于身体外观。
- `manifest.json` 保存每帧切片与握持点；方向按 S、SW、W、NW、N、NE、E、SE。
- 运行时头与躯干保持一张完整原画；靴子、帽尖/披风边缘使用原像素做连续小幅刚体动作。未使用头身拉伸，也没有整帧交叉重影。4 张全身姿势保留在图集中，步态不靠直接硬切它们。
- 受击表情复用现有 `hurtFace` 检测与眼区缓存；狼装毛领、叶袍围巾只在临时检测图中排除，最终只回贴眼区。前摇至命中至收招使用连续曲线。

机械加工：`node tools/prepare-equipment-art.mjs`。仅按 alpha 连通轮廓裁切、统一等比采样及定位；不改画风/配色。PNG 中 alpha=0 的隐藏 RGB 不参与最终绘制。

检查：`node --test tests/equipment-art.test.mjs`、本地服务器启动后 `node tools/verify-equipment-art.mjs`。接触表、独立槽组合和像素保护记录位于 `output/v08/equipment-art/`。原人物未装备时仍由原角色 renderer 负责。
