# 可爱版开始界面

已完成本地实现，尚未推送或部署。线上仍是原二次元版本。

## 预览与改动

- [可爱新版](http://127.0.0.1:4173/)；入口 `index.html`。
- [二次元旧版](http://127.0.0.1:4173/index-anime.html)；入口 `index-anime.html`。
- 新插画沿用游戏的银盔战士、紫帽法师、绿兜帽弓手，使用大头短身、粗描边、简单表情和森林配色。
- 标题与菜单改为圆润字体、厚描边和游戏原有按钮素材；设置窗口同步改为奶油色、森林绿。
- 字体以本地文件加载，来源与授权见 [字体说明](assets/frontend/fonts/README.md)。
- 背景和新样式独立保存；未改战斗数值、角色动画、操作逻辑或极简加载页。

## 插画与提示词

使用内置 `image_gen`，以游戏现有角色与哥布林精灵为参考生成。

- 最终素材：[title-cute.png](assets/frontend/title-cute.png)，1672 × 941。
- 完整提示词及参考文件：[cute-prompts.md](assets/frontend/cute-prompts.md)。
- 实际页面截图：[cute-desktop.png](output/verification/cute-start-screen/cute-desktop.png)。

## 备份与回退

旧入口、原背景、原样式保留。完整备份位于 `backups/start-screen-anime-20260920/`，包含提交 `b32be7ffe8e11f5c145781a2b236352b6a279827` 的全部 541 个已跟踪文件、原入口、SHA256 清单和回退脚本。

[回退说明](backups/start-screen-anime-20260920/README.md)提供预检查和恢复命令。回退脚本会先另存当前入口，再恢复旧入口。完整归档不包含浏览器存档、未跟踪草图或依赖安装目录。备份保存在本机并由 Git 忽略，不会上传大 ZIP。

## 验证

- `node tools/verify-cute-start-screen.mjs`：13 组通过；覆盖新旧入口、设置持久化、选人、战斗、图鉴、返回开始页，以及竖屏、短横屏、超宽屏布局。无页面错误、失败请求或 HTTP 错误。
- `node tools/verify-start-screen.mjs`：16 组通过；包括封面与游戏资源失败/重试/迟到恢复、输入隔离、模拟手柄、试炼入口和 GitHub Pages 子路径。
- 标准游戏客户端实际进入战斗并执行移动和闪避；截图与状态已检查。
- 已实际查看桌面、手机横竖屏、设置和战斗截图。回退脚本已在独立测试目录验证，当前项目只运行预检查，未回退。
- 未验证实体手机、实体手柄或本次新版线上部署；浏览器测试为本地 Chromium。
