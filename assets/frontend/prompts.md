# 开始页与 Loading 正式素材

生成方式：内置 image_gen。开始页以用户确认的 V3 为编辑目标，仅去除文字和按钮；Loading 以既有哥布林为身份参考，生成独立 8 帧行走循环。

## 无 UI 背景

```text
Use case: precise-object-edit / background-extraction for a game frontend.
Input image is the approved final THREEFOLD ODYSSEY title screen.
Produce the same full 16:9 illustration as a CLEAN BACKGROUND PLATE. Remove ONLY the title lettering and emblem at top-left, and the complete three menu UI modules at lower-left including all text, cyan selection strip, white and black panels, thin lines and numbers. Seamlessly reconstruct the dark forest, rocks, foliage and peripheral monster shapes behind those UI regions. Keep the top-left dark and visually calm for a future HTML title; lower-left also remains comparatively dark enough for menu overlays.
Every other feature must remain identical: composition E, exact faces, warrior helmet and faceted sword/shield, archer complex recurve bow and green lowered hood, mage short silver-purple hair, pointed hat and staff, the massive correctly drawn five-finger foreshortened spell palm, flying foreground rocks and violet repelling shockwave, edge-cropped monster claws, far-left middle-distance mushroom monster, giant thorn tree boss and forest. No large foreground mushroom. Do not redraw or relocate any face, hand, weapon or monster unnecessarily; do not change proportions, color palette, art style, shading or framing. Preserve fine detail and sharpness. Maintain exact original landscape aspect ratio and full canvas framing.
Output a single finished landscape artwork, not a mockup. ZERO TEXT, ZERO UI, ZERO LOGOS, ZERO WATERMARKS. This is for real HTML buttons and live typography placed over the art.
```

## 行走小怪物

```text
Use case: stylized-concept game animation sprite sheet.
Input image is a REFERENCE SHEET showing our game's established goblin identity. Do not copy the input sheet's poses or grid count. Produce a NEW 8-frame SIDE-VIEW WALK CYCLE of exactly the SAME cute small green goblin: round light olive-green head, large pointed ears, tiny determined black eyes and little white fangs, brown wrapped leather tunic, dark brown boots, small silver knife carried low. Same thick clean dark outlines and illustrated cartoon aesthetic, no realistic humanoid, no anime teenager.

Output ONE transparent RGBA sprite sheet, exactly 4 columns by 2 rows, 8 equally sized square cells. Overall width exactly twice height, e.g. 1536x768, each cell 384x384. Transparent background throughout, no visible cell borders, no text, no labels, no checkerboard baked into pixels, no floor or cast shadow. Goblin entirely inside each cell with at least 12% clear padding. Every frame uses the SAME character scale, consistent head size and fixed ground baseline at 83% of cell height, centered at x50%. Goblin faces RIGHT in every frame, never turns toward viewer.

8 sequential frames reading left to right across row 1 then row 2 form ONE smooth seamless walk cycle IN PLACE:
1 front/right leg reaching forward with heel contacting, back/left leg stretched behind.
2 body slightly down, forward foot bears weight, rear foot lifting.
3 rear leg passes underneath torso, supporting leg nearly straight.
4 passing knee lifts and moves forward, body slightly up.
5 opposite foot reaches forward and contacts, arms opposite frame 1.
6 body slightly down onto that foot, other heel lifts.
7 other leg passing underneath, arms in opposite swing.
8 other knee forward and lifted, smoothly leading back to frame 1.
Real alternating visible leg/boot positions and opposite arm swings, not 8 copies bobbing the whole body. Keep head and torso coherent; head moves only 2% in height, no rubber bending. Knife stays attached to the same hand and points safely downward. Ears have slight follow-through only. Strong readable silhouettes at tiny on-screen size, no excessive detail. All 8 frames visibly distinct but the SAME goblin with the SAME proportions and costume.

This will be shown as a small charming walking monster in the bottom-right corner of an otherwise plain loading screen. High-quality production sprite sheet.
```
