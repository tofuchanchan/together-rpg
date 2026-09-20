# Universal sprites — 2026-09-20

Generated with the built-in imagegen tool, one call per character. Reference: `assets/world/bestiary.png`, used only for the existing game's style. Source files preserve generated RGBA. `tools/prepare-universal-art.mjs` only trims/extracts/re-packs alpha cells with a shared scale; it does not redraw characters.

Prompt template:

Use case: stylized-concept. Generate one production GAME SPRITE SHEET for SUBJECT. Reference image is STYLE ONLY, not an edit target. Match its bold dark ink outlines, warm hand painted cel shading, chibi forest fantasy visual style exactly. One character ONLY with FOUR frames arranged in an exact 2 by 2 grid on a square TRANSPARENT RGBA canvas. Each cell contains the same consistent character at the SAME SCALE, centered horizontally with feet on same relative baseline, all facing right in a 45 degree overhead three-quarter game camera. Frame 1 neutral walking pose, frame 2 alternate walk foot/wing pose, frame 3 preparing a small lunge, frame 4 lunge with feet/wing extended. Character fully within central 70% of its cell, ample equal empty padding, no touching cells. No text, no borders, no labels, no ground, no cast shadow, no frame numbers, no particles. Genuine transparent alpha background, not a checkerboard painting. Preserve shape and proportions across frames, only limbs/wings change; no whole body stretching. Output is the sprite atlas image itself.

SUBJECT per call:

- seedling: an ORIGINAL tiny green round seedling monster, two small stubby feet, two leaves sprouting from its head, simple mischievous dark eyes, no equipment
- dustling: an ORIGINAL tiny dark brown charcoal dust creature, round fuzzy body with two stubby feet and two pale golden eyes, no equipment
- gnat: an ORIGINAL tiny violet-red moth monster, two small wings, short sharp proboscis, simple cream eyes, no equipment
- spiritdog: an ORIGINAL friendly small pale cyan spirit hound, four legs, ivory face and turquoise tail, tiny green collar, distinct from grey wolf enemies, no weapons
- paperbird: an ORIGINAL friendly origami raven, folded ivory paper body, teal wing tips and gold folded beak, obviously angular paper silhouette
- thornpet: an ORIGINAL friendly thorn sprout pet, forest green pointed leaves, small ochre seed face, two root feet, short thorns, clearly distinct from round seedling monster
