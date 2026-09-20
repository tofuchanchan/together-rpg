# 高清选人立绘

- 日期：2026-09-20。
- 用途：选人界面专用高清全身立绘；不替换战斗动画精灵。
- 生成方式：内置 `image_gen`，每个职业独立一次调用，未使用 CLI 或外部图像生成 API。
- 全部成品为内置工具原始输出的逐字节副本，无缩放、裁切、抠图、锐化或二次重绘。
- 透明度：原生 RGBA PNG，alpha 范围 0–255，背景含真正 alpha=0 像素。
- 实际原生尺寸：1254 × 1254（提示词中的目标为约 1024 方图，工具实际输出为 1254 方图）。
- 检查方法：Pillow 只读尺寸、alpha直方图与有效边界；未编辑像素。有效边界按 alpha > 8 统计。
- 集成元数据：[manifest.json](./manifest.json)。调用端可用 bbox 作源矩形绘制并统一脚底，不需要另导出裁切版。
- 人工检查：三职业全身、武器、兜帽/帽子/头盔完整；无场景、文字、地面、假透明棋盘格；保留粗黑描边、简单表情、原职业配色与大头短身比例。

| 职业 | 文件 | 有效边界 x,y,w,h | 有效高度 | 文件字节 |
|---|---|---|---|---|
| warrior | [warrior-hd.png](./warrior-hd.png) | 93, 230, 1049, 847 | 847 px | 656845 |
| mage | [mage-hd.png](./mage-hd.png) | 142, 154, 1041, 965 | 965 px | 726571 |
| archer | [archer-hd.png](./archer-hd.png) | 142, 152, 950, 978 | 978 px | 764671 |

## warrior

- 最终资产：`assets/portraits/warrior-hd.png`。
- 图像1（严格身份参考）：`assets/characters/cel/source/reference-SE.png`。
- 图像2（辅助绘画风格）：`assets/frontend/title-cute.png`。
- 内置工具原始输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bed4-074e-7322-9f53-b48b76a44ddc/exec-5a6878f5-0ceb-46dc-9715-c14256e03c47.png`。

完整提示词：

```text
Use case: stylized-concept.
Asset type: one crisp high-resolution transparent PNG full-body character portrait for a character-selection screen, square 1024x1024.
Input images: Image 1 is the strict character identity/model/color reference (an eight-frame sprite sheet, draw only ONE character). Image 2 is supporting illustration sharpness/style reference only. Match Image 1 identity exactly.
Primary request: Draw the SAME cute tiny warrior as Image 1, naturally standing in a ready idle pose in a three-quarter view facing screen-right and slightly toward the viewer. Huge round silver helmet with a subtle pointed crown, exactly TWO tall black vertical oval eye slots and no visible face or mouth, no horns/plumes/visor lattice; small round silver shoulder armor; teal blue tunic and teal kite shield with a white metal rim and the exact simple pale cream three-lobed plant emblem; bright red cape hanging toward screen-left; very short silver sword with a small brown grip, brown belt with small gold buckle, small dark brown boots. Preserve the original extremely short chibi body and large head proportions, colors, weapon sizes and simplicity. Both boots fully visible, shield and sword anatomically held, do not obscure eye slots.
Style/medium: polished hand-drawn cute 2D game illustration, bold clean nearly black contour, simple flat colors with a few broad cel-shaded highlights, very sharp purposeful edges, no sketchiness, no blur. Strong silhouette readable at 180px.
Composition/framing: ONE isolated full-body warrior centered, head-to-boot extent roughly 760-820 pixels of a 1024 square, enough transparent margin on all sides for cape/sword/shield, no cropping.
Scene/backdrop: genuinely transparent alpha background, only the character and held equipment; no ground, no contact shadow, no panel, no particles.
Constraints: Preserve original character identity. Native transparent PNG with actual alpha channel. Do not render a white background or checkerboard pattern. No text, no extra characters, no stage, no dramatic action, no new decorations, no realistic human face, no anime anatomy. Produce one square image.
```

## mage

- 最终资产：`assets/portraits/mage-hd.png`。
- 图像1（严格身份参考）：`assets/characters/cel/mage/source/reference-SE.png`。
- 图像2（辅助绘画风格）：`assets/frontend/title-cute.png`。
- 内置工具原始输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bed4-074e-7322-9f53-b48b76a44ddc/exec-22150be2-492f-4184-8c23-6b1715f536f0.png`。

完整提示词：

```text
Use case: stylized-concept.
Asset type: one crisp high-resolution transparent PNG full-body character portrait for a character-selection screen, square 1024x1024.
Input images: Image 1 is the strict character identity/model/color reference (an eight-frame sprite sheet, draw only ONE character). Image 2 is supporting illustration sharpness/style reference only. Match Image 1 identity exactly.
Primary request: Draw the SAME cute tiny mage as Image 1, naturally standing in a ready idle pose in a three-quarter view facing screen-right and slightly toward the viewer. Very large deep purple witch/wizard hat with simple bent floppy tip toward screen-left and wide purple brim; smooth pale cream oval face with exactly TWO short vertical black bean-shaped eyes and subtle determined simple brows, NO nose/mouth/highlighted anime pupils; dark violet hood around the face; tiny purple robe with a darker purple belt and one small gold round buckle; tiny simple pale round hands; short black-brown boots. Hold the same simple dark brown wooden staff on screen-right, ending in a circular brown setting containing ONE warm golden-yellow orb, crisp contained highlight and no glow spilling into background. Other hand rests forward loosely. Preserve the original very short chibi body, huge head/hat, identity, purple palette and simple details.
Style/medium: polished hand-drawn cute 2D game illustration, bold clean nearly black contour, simple flat colors with a few broad cel-shaded highlights, very sharp purposeful edges, no sketchiness, no blur. Strong silhouette readable at 180px.
Composition/framing: ONE isolated full-body mage centered, hat-to-boot extent roughly 760-820 pixels of a 1024 square, sufficient transparent margin on all sides for hat and staff, boots and full hat completely visible, no cropping.
Scene/backdrop: genuinely transparent alpha background, only the character and held equipment; no ground, no contact shadow, no panel, no particles.
Constraints: Preserve original character identity. Native transparent PNG with actual alpha channel. Do not render a white background or checkerboard pattern. No text, no extra characters, no stage, no dramatic action, no new decorations, no exposed flowing hair, no realistic human face, no anime anatomy. Produce one square image.
```

## archer

- 最终资产：`assets/portraits/archer-hd.png`。
- 图像1（严格身份参考）：`assets/characters/cel/archer/source/reference-SE.png`。
- 图像2（辅助绘画风格）：`assets/frontend/title-cute.png`。
- 内置工具原始输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bed4-074e-7322-9f53-b48b76a44ddc/exec-6360b0d6-69b8-4075-ac6f-63f6d06bf0ab.png`。

完整提示词：

```text
Use case: stylized-concept.
Asset type: one crisp high-resolution transparent PNG full-body character portrait for a character-selection screen, square 1024x1024.
Input images: Image 1 is the strict character identity/model/color reference (an eight-frame sprite sheet, draw only ONE character). Image 2 is supporting illustration sharpness/style reference only. Match Image 1 identity exactly.
Primary request: Draw the SAME cute tiny archer as Image 1, naturally standing in a ready idle pose in a three-quarter view facing screen-right and slightly toward the viewer. Very large forest-green hood WORN over the head with its short floppy pointed end bending screen-left/back, angular open face aperture, pale cream oval face with exactly TWO short vertical black bean-shaped eyes and thick simple diagonal determined eyebrows, NO nose/mouth/highlighted anime pupils; no visible hair. Small green tunic and shoulder cape, dark green shadows, simple diagonal brown leather chest strap, small brown waist belt with modest brass buckle, short dark brown boots, pale round hands. Hold a small simple curved brown wooden bow vertically on screen-right in left hand with one thin dark bowstring; small brown quiver behind the screen-left shoulder with exactly a few pale arrow fletchings. Right hand relaxed close to waist. Preserve original very short chibi body and huge hood/head proportions, green palette, and simple outfit.
Style/medium: polished hand-drawn cute 2D game illustration, bold clean nearly black contour, simple flat colors with a few broad cel-shaded highlights, very sharp purposeful edges, no sketchiness, no blur. Strong silhouette readable at 180px.
Composition/framing: ONE isolated full-body archer centered, hood-to-boot extent roughly 760-820 pixels of a 1024 square, sufficient transparent margin on all sides for quiver and bow, boots and hood completely visible, no cropping.
Scene/backdrop: genuinely transparent alpha background, only the character and held equipment; no ground, no contact shadow, no panel, no particles.
Constraints: Preserve original character identity. Native transparent PNG with actual alpha channel. Do not render a white background or checkerboard pattern. No text, no extra characters, no stage, no dramatic action, no new decorations, no antlers/animal ears, no realistic human face, no anime anatomy. Produce one square image.
```

