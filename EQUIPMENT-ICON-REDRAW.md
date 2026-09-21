# 装备图标重绘验收

本地完成：6 件武器 + 15 套防具，共 21 张透明 PNG，已替换商店中的图标。使用内置 imagegen，参考当前游戏实际加载的装备图集，不按装备名称重新设计外形。

## 交付

- 图标：`assets/shop/items/<装备ID>.png`，原始透明背景，总计约 14.2 MiB。
- 映射：`assets/shop/manifest.json`，按 `visualKey` 直接绑定，含裁切框、运行时源图路径和 SHA-256。
- 最终提示词与生成来源：`assets/shop/prompts-runtime-matched.json`。21 个来源文件的哈希与安装后的 PNG 完全一致。
- 对照页：`http://127.0.0.1:4173/output/verification/equipment-icon-redraw/index.html`。包含实际装备、重绘图标、64px 缩略图，可切换职业。
- 商店试玩：`http://127.0.0.1:4173/?shopTrial=warrior&players=2`。

## 对照修正

| 职业 | 已核对的关键特征 |
| --- | --- |
| 战士 | 短宽铁剑、红色内嵌重剑；三竖缝银盔、皮质赤铜战甲、上弯角与鳞甲、蓝色太阳战袍、黑红月牙武铠及对应盾徽 |
| 法师 | 银托蓝晶短杖、木枝橙珠短杖；黑紫星袍、橡果绿帽与米色围巾、蓝星帽与卷轴、紫色符文兜帽、鹿角冠与米绿祭服 |
| 弓手 | 卷梢木弓、黄铜短弩；灰狼粉耳、深青鸮羽、橙狐配深青衣、红羽绿帽配棕皮衣、浅蓝圆耳雪貂装 |

防具图标保留空盔/帽/兜帽、衣甲及配套盾牌或箭袋，不含人物脸、手脚。银钢板甲首稿仍是完整人物，已重新生成并剔除首稿。当前战斗换装、数值、商店经济和奖励怪机制未在本轮修改。

## 验证

- 14 项定向自动化测试通过：资源覆盖、ID 映射、四档品质使用同一外形、透明资源边界、个人商店及购买回归。图片外形一致性由下述人工视觉核对确认，自动化不替代视觉判断。
- 11 组浏览器检查通过：三职业各 7 件对照、双人商店、第五项购买/技能/招募、21 图标绘制、两类奖励怪及图鉴；无页面错误或资源 HTTP 错误。
- 标准游戏客户端完成双人移动、闪避；已查看原生截图和状态。
- 已查看三职业全量对照图及商店缩略效果。证据位于 `output/verification/equipment-icon-redraw/`，商店联动复验位于 `output/verification/shop-bonus/`。
- 本次仅本地完成；未提交、推送或部署，未做实体手柄与手机实机验证。

## 复验命令

```powershell
node tools/export-equipment-icon-references.mjs
node --test tests/equipment-icons.test.mjs tests/shop-expansion.test.mjs tests/personal-shop.test.mjs
node tools/verify-equipment-icons.mjs
node tools/verify-shop-bonus.mjs
```

`tools/register-equipment-icons.mjs` 只登记透明边界与来源校验值，不重画图片；只在新图标已经逐件对照合格后运行。后续装备源图变化会使来源校验测试失败，需重新核对相应图标。
