# Asset provenance

- D player heroes: transparent illustrated PNG sheets generated with the built-in imagegen tool, using this project's approved output/coop-design/D-coop-combat.png as the character/style reference. Source outputs, direction corrections, prompts and runtime atlases are saved in assets/characters. No third-party game sprites were extracted or copied.
- D runtime now loads assets/characters/{warrior,mage,archer}.png and JSON frame metadata. tools/prepare-character-sprites.mjs performs alpha-bound slicing, foot registration and packing; it does not paint replacement characters. src/coop/sprites.js draws the bitmap frames.
- D enemies, forest, props, skill/system icons, VFX, projectiles and UI: original illustrated PNG artwork generated with built-in imagegen using the same approved project references. Source images, correction sheets and actual prompts are in assets/world. The runtime reads six atlases (152 cells) plus the forest background. tools/prepare-world-art.mjs only slices, registers and packs supplied pixels; it does not draw replacement art. Text, live values and exact telegraph geometry remain code-driven.
- Old program-generated hero atlases in assets/beans are retained as historical prototype outputs, not used by the current game. The old low-poly animation lab also remains available separately.
- Combat sounds: short original Web Audio synthesized tones; these remain prototype audio.

- Warrior rig, motion curves and atlas: original procedural prototype authored for this project. No old project character PNG has been modified. This is a low-poly motion sample, not the approved final character artwork.
- Phaser 3.90.0: https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js — MIT.
- Three.js 0.160.0 (offline atlas renderer only): https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js — MIT.
- Licenses stored in assets/vendor. No external network requests at runtime.
