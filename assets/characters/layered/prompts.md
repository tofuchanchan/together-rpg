# 分层素材生成记录

使用内置 imagegen 编辑模式；原版角色八方向接触表是身份、画风和颜色参照。初稿的头盔、肩甲、过蓝衣服、通用长袍披风均经过修正。以下保存最终编辑指令，不把被弃用初稿当作验收资产。

## Body：身份与配色校正

Identity-preserving precise sprite correction. Image 1 is EDIT TARGET: transparent body part atlas 8 columns x6 rows. Image 2 is original character REFERENCE with views S SW W NW / N NE E SE. Maintain48 separate parts, canvas and grid positions, genuine alpha. Preserve row1 bare heads as is. Row2 SILVER HELMET: keep shape and color; fix second helmet (SW) to exactly TWO black eye vents on left, not three; front first helmet three; E and SE last two two vents on right; W third two left vents; rear three helmet columns4,5,6 no vents. Row3 tunic: match original knight reference richer cyan-teal cloth including brighter soft highlights, same original palette and simple shading; no gray desaturation, no new seams or symbols. Row4 hip: very short dark brown shorts with the SAME thin DARK BROWN belt and tiny brass buckle from original reference, not light tan thick belt; no new buckles or decoration. Rows5 and6 feet: original boots are nearly black dark charcoal-brown squat rounded bean boots, not tan layered boots. Make each one a simple single contiguous round boot with short hidden upper leg overlap, no horizontal ankle seam/strap, no light toe-cap, no panels or laces. Match original dark color and round silhouette exactly. Each limb fully painted behind joints, no body attached. No extra details. Overall same thick soft black cartoon outline and hand painted simplicity as reference. This is separating existing original design into pieces, not a redesign.

## Body：拒绝裁切稿后补全外边距

Fix canvas cropping in this transparent sprite atlas. Keep all current artwork unchanged in style, shape, colors and same 8 columns x6 rows ordering. The entire last column at right is cut off by canvas edge. Expand transparent canvas horizontally as necessary and fully restore clipped right sides of all six objects in last column: head, helmet, tunic, hip, right boot, left boot. Last column helmet must have exactly TWO black vents on right and full silver silhouette. All48 separate objects must be fully visible with at least24 transparent pixels between objects and at outer borders. Keep genuine transparent alpha, no new items, no labels. No visual redesign. Ensure uniform8column placement and no cropped objects anywhere. Choose a wide enough canvas.

最终采用 exec-86138562-3e9a-4c6e-9eb9-4f424aa1d51a.png；裁切稿 exec-a518189b-5015-43f0-ab4f-0b229b0ba6f7.png 未入库。

## Limbs：圆肩甲和短手臂校正

Edit SECOND image limb atlas to match FIRST image original knight exactly in style and colors. Keep true transparent alpha and EXACT 8 columns x 6 rows, individual parts no assembled characters. Columns S SW W NW N NE E SE. IMPORTANT row1 and row4 UPPER ARM: remove all helmet-shaped tops and ear discs. Each is instead one SMALL ROUND SILVER SHOULDER PAULDRON, a simple circular/oval convex metal disk like original reference shoulders, soft gray highlight, thick black contour, attached to a VERY SHORT desaturated dark TEAL sleeve below. No pointed top, no helmet faceplate/ear discs. Row2 and row5 FOREARMS: original knight has very short simple dark brown/charcoal cuff with pale wrist connection, not long ornate bracers, no bright gold/light brown trim. Make each forearm a short capsule with a top elbow overlap and bottom wrist connection, no hand. Row3 and row6 HANDS: small simple PALE BEAN FISTS, mostly one rounded shape with a thumb, match original tiny light hands; remove realistic multiple knuckle wrinkles and detailed fingers. Right and left hand remain anatomically distinct across eight camera views. Keep every part fully filled behind joints and not clipped. Preserve original restrained palette and simple soft cartoon brushwork, not detailed fantasy illustration. Make no new armor design.

最终采用 exec-c57d6c4f-7bc7-478a-97e8-9c119fb1b4f0.png。

## Equipment：盾徽与披风校正

Precise identity-preserving sprite edit. Image 1 is the EDIT TARGET, an 8 columns x 6 rows equipment atlas. Image 2 is the original knight REFERENCE (directions top row S SW W NW, bottom row N NE E SE). Keep target canvas transparent with exactly48 separate objects, same grid positions. Change ONLY row3 shields and row5 capes to match the reference exactly in cartoon style, simple soft brush shading, thick black outlines and colors. Row3: original shield emblem is a simple ivory rounded three-lobed fleur/de-lis, NOT sharp botanical leaves; shield interior muted teal like reference. The shield face is visible in all reference views even rear three-quarter so follow reference view orientation. Row5: replace generic hanging robes with the original small RED FLUTTERING SINGLE PANEL CAPE silhouette for each direction S SW W NW N NE E SE. No hood, no neck collar, no circular sleeve opening, no jacket. S cape mostly hanging panel; SW/W trail right; NW panel trails down-right; N panel hangs down; NE/E trail down-left; SE cape is long horizontal leftward flutter with narrow root at RIGHT EDGE and wavy three-fold hem at left. These capes are drawn already oriented as worn, NO rotation needed. Preserve original flat bean knight simplicity and original bright red midtone. Each cape fully painted separately with no body attached. Keep rows1 swords,2 axes,4 roundshields,6 bronzehelmets unchanged. Do not add accessories. Actual transparent alpha; no labels/grid/shadows.

最终采用 exec-a3a7eb2e-fe74-46f5-bea4-4a3084a65fc3.png。

## 验收边界

生成结果仍需按方向对照原图；提示词并不能保证自动达到完全一致。源图透明边缘、144 部件完整性和运行挂点由脚本检查；轮廓、笔触、相似度由并排图人工检查。保留原版默认渲染，当前仅为可选分层样板。
