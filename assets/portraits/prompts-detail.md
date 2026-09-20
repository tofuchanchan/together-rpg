# 高清选人立绘 · 细节增强版

- 日期：2026-09-20。
- 生成方式：内置 `image_gen`，按角色独立编辑；未使用 CLI 或外部图像生成 API。
- 用途：选人专用高清立绘；原 `*-hd.png` 保留，战斗动画精灵不替换。
- 基准：以现有高清立绘作为编辑目标，原战斗参考精灵作为严格身份参考。
- 目标：保持大头短身比例、原剪影、原配色和核心装备，增加可读的材料结构与工艺细节。细节只丰富已有表面。
- 文件为工具原始输出的逐字节副本，未缩放、裁切、锐化或抠图。透明 alpha 直接保留。
- 元数据：[manifest-detail.json](./manifest-detail.json)。Pillow 仅用于读取尺寸、alpha 和 bbox，未编辑像素。
- 全部原生 1254 × 1254 RGBA PNG，具有实际 alpha=0 的透明背景。
- 人工检查：三职业身份、配色和大轮廓一致；头盔、帽子、兜帽、两只脚及武器完整，粗描边和简单脸仍清晰；无文字、场景、地面、假棋盘格或额外角色。实际 UI 小尺寸检查由集成验证执行。

## 细节范围

| 职业 | 加强细节 |
|---|---|
| 战士 | 头盔拼缝与铆钉、金属层次、青盾边沿铆钉与倒角、披风缝边和褶皱、短剑护手铆钉与包边、握柄缠带、刃面凹槽与反光、皮靴拼缝 |
| 法师 | 帽檐缝线、帽带与袖口袍边纹样、袍褶、木杖雕刻与握持缠带、木质镶座和暖金宝石层次 |
| 弓手 | 兜帽接缝、肩披缝边、皮带针脚搭扣、箭羽与箭袋缝边、弓身木纹与握把缠带、皮靴拼缝 |

## warrior

- 最终资产：[warrior-hd-detail.png](./warrior-hd-detail.png)。
- 图像1（编辑目标）：`assets/portraits/warrior-hd.png`。
- 图像2（严格身份参考）：`assets/characters/cel/source/reference-SE.png`。
- 内置输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bee7-4bcf-7c02-a3d0-1bbace5815fc/exec-1c777039-8bda-4e49-91a7-64679a522a0e.png`。

完整提示词：

```text
Use case: identity-preserve.
Asset type: one finished high-resolution transparent PNG selection portrait for a cute 2D co-op roguelike game.
Input image 1 is the EDIT TARGET, the current approved full-body warrior portrait. Image 2 is only the strict original in-game character identity reference sheet; produce one character, never a sheet.
Primary request: refine the CURRENT portrait with a modest but clearly visible layer of exquisitely drawn costume and material detail. Keep its pose, short chibi proportions, large round silver helmet, TWO tall black oval eye slots, teal tunic, red cape, short silver sword, teal shield with pale cream plant emblem, silhouette, angle and dominant palette unchanged. This is the same character and same equipment, not a new costume.
Details: add a narrow engraved seam and a few deliberate tiny rivets along the helmet's lower edge; 2-3 small rivets on the round shoulder plates; a thin inset rim line and a few spaced rivets on the silver shield border, preserve the central cream plant emblem; show broad readable metal bevels and tasteful reflected cool light; add clean double-layer cape folds, restrained stitched red hem, a small gold cape fastening near the shoulder; add leather grain only as 2-3 clear strokes on belt/grip, a little strap stitching, boot panel seam. Give the short sword a clearly polished bevel, but preserve its simple compact shape.
Style: crisp polished hand-drawn cute 2D game art with thick near-black outline, large readable cel-shaded color masses, smooth intentional strokes. Detail hierarchy designed to still read at 158x164 displayed pixels. Keep face simple; no realistic eyes, nose or mouth. Extra detail must enrich existing surfaces, not clutter the image or shrink the dominant color masses. No photographic texture/no grain/no scratches everywhere/no hyperrealistic rendering.
Composition: maintain the original facing screen-right three-quarter idle stance, full body, both boots and all held equipment visible, original framing and ample transparent margins. Keep character footprint approximately as in the edit target.
Background: actual transparent alpha PNG, nothing except the isolated character, no checkerboard graphic, no ground/contact shadow, no glow, no vignette.
Avoid: extra weapons/accessories, horns, feathers, cape color changes, open visor, visible human face, text, watermark, multiple characters.
```

### 战士第二次局部编辑：武器细节

用户进一步强调头盔、武器可增加细节，因此以第一张战士细节版为编辑目标，额外修饰短剑护手、握柄与刃面。最终资产采用此次输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bee7-4bcf-7c02-a3d0-1bbace5815fc/exec-42fa4954-eb38-44d1-bc4f-f5c52fdefbf8.png`。

```text
Use case: precise-object-edit.
The supplied transparent PNG is the edit target. Make one small focused refinement to the WARRIOR'S SHORT SWORD only. Preserve the entire character identity, pose, all proportions, all helmet/cloth/shield/boot details, big silver helmet with two black eye slots, red cape, teal shield and tunic, the thick dark outlines, framing and transparent background exactly.
The current short sword should retain its compact length, width, orientation, silhouette and position. Refine its existing brown oval guard into a warm bronze-brown guard with a narrow beveled metal rim and 2 small visible rivet accents, add a simple shallow steel groove/highlight down the flat blade face, a tiny engraved line near the blade base, and make the small visible handle behind the hand read as dark brown leather wrapped bands. Keep silver blade clean with broad cel-shaded facets. No giant weapon, no jewels, no serrations, no extra blade or new silhouette.
Style stays polished cute hand-drawn 2D cel art with bold near-black outlines, same color family and sparse readable detail intended for a 158x164 game portrait.
Output one full image, native transparent alpha PNG, no white/checkerboard backdrop, no added ground, particles or text. Only refine the existing sword surfaces.
```

## mage

- 最终资产：[mage-hd-detail.png](./mage-hd-detail.png)。
- 图像1（编辑目标）：`assets/portraits/mage-hd.png`。
- 图像2（严格身份参考）：`assets/characters/cel/mage/source/reference-SE.png`。
- 内置输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bee7-4bcf-7c02-a3d0-1bbace5815fc/exec-2d82b011-9712-4a03-ae3e-266b1f06df28.png`。

完整提示词：

```text
Use case: identity-preserve.
Asset type: one finished high-resolution transparent PNG selection portrait for a cute 2D co-op roguelike game.
Input image 1 is the EDIT TARGET, the current approved full-body mage portrait. Image 2 is only the strict original in-game character identity reference sheet; produce one character, never a sheet.
Primary request: refine the CURRENT portrait with a modest but clearly visible layer of exquisitely drawn costume and material detail. Keep exactly the current pose, very short chibi proportions, huge floppy purple pointed hat bent to screen-left, TWO black bean-shaped eyes/simple brows on a cream face without mouth/nose/hair, purple robe and cowl, round yellow belt buckle, short brown boots, simple circular wooden staff holding ONE warm golden orb, silhouette, angle and dominant palette. This is the same character in the same outfit and equipment.
Details: neatly stitched purple hat brim with a narrow lilac inset seam, restrained dark-violet curved embroidered flourishes only on the existing hat band (no new symbols or accessories on crown); a narrow gold-and-muted-lilac embroidered edging on robe cuffs and lower robe hem, a few visible fabric folds on cowl/sleeves; refine the round belt buckle rim and leather folds; staff handle with two or three long carved woodgrain strokes and a simple subtle spiral engraving near its circular wooden head, small wrapped grip section. Preserve the single orb shape and warm yellow palette while showing a layered amber interior and one crisp highlight, no external glow. Simple boot seam.
Style: crisp polished hand-drawn cute 2D game art with thick near-black outline, large readable cel-shaded color masses, smooth intentional strokes. Detail hierarchy designed to still read at 158x164 displayed pixels. Keep facial simplicity and original identity. Detail must enrich existing surfaces, not clutter the image or shrink the dominant purple color masses. No photographic texture/no grain/no hyperrealistic rendering.
Composition: maintain original facing screen-right three-quarter idle stance, full body, both boots, full hat and staff visible, original framing and generous transparent margins. Keep the same character footprint approximately.
Background: actual transparent alpha PNG, nothing except isolated character, no checkerboard graphic, no ground/contact shadow, no spell particles, no vignette.
Avoid: extra books/pouches/trinkets, extra weapons, new costume, hat stars or giant gold patterns, realistic human face, anime eyes, mouth, exposed hair, text, watermark, multiple characters.
```

## archer

- 最终资产：[archer-hd-detail.png](./archer-hd-detail.png)。
- 图像1（编辑目标）：`assets/portraits/archer-hd.png`。
- 图像2（严格身份参考）：`assets/characters/cel/archer/source/reference-SE.png`。
- 内置输出：`C:/Users/fuweicheng/.codex/generated_images/01a0bee7-4bcf-7c02-a3d0-1bbace5815fc/exec-22f68509-00b5-41b3-bb80-3bd4451c36b0.png`。

完整提示词：

```text
Use case: identity-preserve.
Asset type: one finished high-resolution transparent PNG selection portrait for a cute 2D co-op roguelike game.
Input image 1 is the EDIT TARGET, the current approved full-body archer portrait. Image 2 is only the strict original in-game character identity reference sheet; produce one character, never a sheet.
Primary request: refine the CURRENT portrait with a modest but clearly visible layer of exquisitely drawn costume and material detail. Keep exactly its current pose, very short chibi proportions, enormous forest-green hood WORN over the head with floppy point to screen-left, cream simple face with TWO black bean eyes and diagonal simple brows, no hair/nose/mouth, green shoulder cape/tunic, brown leather chest strap and belt, short brown boots, simple curved wooden bow and single thin string, small brown quiver with cream feathered arrows, silhouette, angle and dominant palette. The same character wearing the same equipment.
Details: a curved tailored seam on hood crown and a slim green double stitched hem bordering the face opening; broad clean fold where green shoulder cape overlaps chest; leather strap with inset stitch line and a small rectangular brass adjustment buckle while retaining existing strap position; existing waist belt with modest buckle, punched holes and folded leather edges. Give wooden bow 2-3 clear woodgrain lines and a short dark leather wrapped grip, no new spikes or metallic arms; refine each existing pale arrow feather into a few clear broad barbs, a stitched rim on existing quiver; simple boot panel seams. Keep the face area uncluttered and simple.
Style: crisp polished hand-drawn cute 2D game art with thick near-black outline, large readable cel-shaded color masses, smooth intentional strokes. Detail hierarchy designed to still read at 158x164 displayed pixels. Use meaningful larger seams and material accents, avoid tiny noisy detail. Preserve strong green masses and original cute proportions, no photographic texture/grain/hyperrealistic rendering.
Composition: maintain original facing screen-right three-quarter idle stance, full body, both boots and all bow/quiver/hood visible, original framing and transparent margins, same approximate character footprint.
Background: actual transparent alpha PNG, nothing except isolated character, no checkerboard graphic, no ground/contact shadow, no particles, no vignette.
Avoid: animal ears/antlers, new cloaks, bright color changes, extra bags/daggers/trinkets, oversized bow, realistic/anime face, mouth, visible hair, text, watermark, multiple characters.
```


