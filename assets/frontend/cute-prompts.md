# 可爱画风开始页

生成方式：内置 image_gen；背景为新绘插画，角色身份与风格参考游戏现有精灵原图。没有覆盖旧版背景 title-background.png。

参考：assets/characters/cel/source/reference-SE.png、assets/characters/cel/mage/source/reference-SE.png、assets/characters/cel/archer/source/reference-SE.png、assets/world/source/goblin.png。

最终素材：assets/frontend/title-cute.png。字体、标题、菜单由真实 HTML/CSS 实现，字体与授权说明见 fonts/README.md。

## 最终生成提示词

```text
Use case: stylized-concept, production game title-screen BACKGROUND illustration.
Create one beautiful 16:9 landscape illustration, no words or UI. All four supplied images are visual STYLE AND CHARACTER IDENTITY REFERENCES, not edit targets and not layouts. They are sprite sheets: draw each protagonist ONLY ONCE, never draw a grid or a sprite sheet.
Art direction MUST match these actual game sprites: charming 2D chunky cartoon, big heads and tiny bodies (about 1.8 heads tall), thick confident near-black ink contours, very simple solid black oval eyes, minimal faces, rounded mittens and boots, clean soft cel shading with subtle painted texture. Comparable in simplification to a cute hand-drawn indie roguelite, NOT realistic anime people, NOT detailed JRPG armor, NOT pixel art, NOT 3D plastic.
The three heroes are center/right in a dynamic triangular party formation charging diagonally toward the viewer. Their designs are EXACTLY those references:
- warrior foremost at x70% y64%: completely closed round silver helmet with TWO BLACK VERTICAL EYE SLITS, no visible human face; red short cape, teal tunic, small steel sword, teal heater shield with simple ivory fleur motif. He joyfully lunges shield-first toward camera, huge cute shield and short sword in strong but readable foreshortening, short legs jumping.
- mage at x78% y40%: pale round face, two black oval eyes, oversized purple pointed hat, purple robe/cape, wooden staff with one golden orb. Raising staff with a small golden-purple swirling spell, lively compact silhouette.
- archer at x51% y46%: pale round face with black oval eyes, deep green hood WORN on head, green short tunic, brown diagonal belt and quiver, small wooden bow and arrow, aim toward upper-left. No realistic lips or nose. Keep silhouette different from mage and warrior.
A playful adventure battle, forest ruins and winding mossy path, broad simplified fern and tree shapes, warm mint/sage/olive greens, cream sunlight, small golden sparkles. Small enemies surround the RIGHT and BOTTOM perimeter: same lime green brown-tunic goblin, angry cute red mushroom creature, little round wolf, two tiny bat silhouettes. One large ancient tree-monster boss looming in the far background upper-right, orange eyes and branch crown, rendered with the SAME chunky rounded cartoon style, imposing but not horror. Keep heroes dominant, enemies smaller and readable.
Composition adapted from our approved title: reserve LEFT x4%-37% top y8%-34% for a future big wordmark and LEFT x5%-32% bottom y56%-91% for three future menu buttons. These two left regions are low-detail softly lit sage/cream forest atmosphere, no characters or hard focal objects there. Keep all hero heads in x45%-90%. Plenty of depth through foreground leaves/rocks along the lower-right edge and a clear diagonal path. Strong lively poses, comic energy and layered overlapping silhouettes while remaining sweet and cheerful. Do not put a foreground mushroom touching the mage's hand. No excessive doodles, no floating UI, no border, absolutely NO LETTERING, NO LOGOS, NO WORDS, NO MENU. Finished illustration edge-to-edge, consistent polished original game art.
```
