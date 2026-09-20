# 选人立绘与游戏 UI 清晰度验收

2026-09-20。本地实现完成，未提交、推送或部署。

## 本轮完成

| 项目 | 结果 |
| --- | --- |
| 画布像素密度 | UI 按实际显示尺寸 × DPR 绘制，内部 surface 与最终画布同步；最大 2880×1620。逻辑坐标仍为 1440×810。修正奇数尺寸产生的半像素混色。 |
| 高清角色 | 三职业使用独立的 1254×1254 透明选人立绘；新增头盔、武器、衣物和材质细节，保持原轮廓、比例、配色。初版保留。 |
| 按钮与面板 | 按钮、卡片、面板、技能槽分别校准九宫格，边角等比绘制；薄血条和经验条使用矢量形状。 |
| 字体与字号 | 本地圆体标题；正文主要 14–16px、次级说明 12px；统一测量与实际绘制字体，长说明正确换行或省略。 |

战斗场景沿用 1440×810 的绘制层，名字、血条、数字、HUD、菜单及立绘在高清层绘制。战斗动画精灵、伤害、判定、输入逻辑未因本轮美术工作改变。立绘只在尺寸变化时进行高质量缩小，不在每帧重复处理大图。单张立绘失败时显示原角色，仍可开始战斗；元数据缺失时加载初版高清图。

## 美术交付

使用内置 **image_gen** 编辑生成，保留原生透明像素；三张合计 2,696,877 bytes。仅在游戏绘制时裁去透明边距，原始 PNG 不裁切。

- [战士原图](assets/portraits/warrior-hd-detail.png)：头盔拼缝和铆钉、盾沿、剑刃凹槽、护手包边、握柄缠带。
- [法师原图](assets/portraits/mage-hd-detail.png)：帽檐针脚、袍边刺绣、法杖雕刻、宝石层次。
- [弓手原图](assets/portraits/archer-hd-detail.png)：兜帽接缝、皮革搭扣、箭羽、弓身木纹、握把缠带。
- [完整提示词](assets/portraits/prompts-detail.md)；[接入元数据](assets/portraits/manifest.json)。初版图片和 `manifest-v1.json` 保留。

![细节版立绘](output/verification/hd-ui/portrait-preview.png)

[实际选人画面](output/verification/hd-portraits/selection-final.png) · [弓手双人预览](output/verification/hd-portraits/archer.png) · [升级卡片](output/verification/ui-sharpness/compact-skill-reward.png) · [商店详情](output/verification/ui-sharpness/shop-recruit-details.png)

## 验证结果

16 项相关单测、60 组浏览器检查通过，另外执行一次标准游戏客户端。截图已实际查看。

| 检查 | 通过数 | 范围 |
| --- | ---: | --- |
| 密度、九宫格、字体测量、血条、手柄输入单测 | 16 | 几何、像素预算、换行、按钮隔离 |
| `verify-render-resolution.mjs` | 8 | 1440/1920 × DPR 1/1.5/2；双画布像素抽样一致；点击、走位、resize、全屏、DPR 切换；390px 不撑宽 |
| `verify-hd-portraits.mjs` | 6 | 三职业实际细节版资源、两槽显示、缓存、世界状态不变、单图故障回退、元数据故障、Pages 子路径 |
| `verify-ui-sharpness.mjs` | 7 | HUD、四项技能奖励、暂停、三词条装备、招募详情、购买 |
| `verify-controller-flow.mjs` | 13 | 纯手柄标题→选人→战斗→奖励→商店→结算，含双柄、断连、替换与 LB 闪避隔离 |
| `verify-coop.mjs` | 13 | 双人键盘/模拟手柄、技能、暂停与断连、升级、重新开始；seed17 原数值完整房间 203 杀、Lv.3 |
| `verify-cute-start-screen.mjs` | 13 | 可爱入口、旧版入口、设置、图鉴及响应式布局 |

标准客户端实际进入战斗、移动、闪避；状态为 `play`，没有记录页面错误。正常资源路径无加载故障；故障回归主动阻断图片和元数据。浏览器长流程中的商店/奖励状态使用明确夹具，不代表自然通关或真人胜率。

## 性能

1920×1080、DPR1.5，高清输出 2590×1457。每组预热45帧、采样90帧，冻结模拟，仅在正常 rAF 中测一次绘制提交。

- 软件后端同条件对比：24/128 怪物，原版提交均值 5.71/9.03ms，分层高清 5.52/8.88ms；整场高清为 16.06/24.67ms。因此保留分层。
- 最终细节版复验：本机 Intel Arc 140T / ANGLE D3D11，24/128 怪物提交均值 **0.86/1.47ms**，p95 **1.00/1.80ms**；浏览器帧回调约16.67ms，90样本均没有超过25ms的提交间隔。
- 软件后端高清合成仍有成本；上述是提交耗时与浏览器回调，**不是屏幕真实呈现 FPS、完整战斗帧率或输入延迟**。未覆盖实体双手柄、实体手机、长时间热降频及4K实机。

[详细方法与原始数据索引](output/verification/hd-ui/frame-performance.md)。最终源码哈希见 `frame-performance-gpu-layered-hd.json`；软件对比保留本轮细节增强前的绘制基线。复验最终版：`node tools/measure-hd-frames.mjs --gpu --only=layered-hd --frames=90`。

本地运行：`npm start`，打开 http://127.0.0.1:4173/。
