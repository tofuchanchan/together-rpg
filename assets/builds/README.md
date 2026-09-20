# Build identity art

Seven original illustrated PNG sprites generated with the built-in image_gen tool using the existing world effect/projectile art as references. Prompts and rejected alpha attempt are documented in `prompts.md`; the initial and selected source sheets are retained in `source/`.

| Sprite | Runtime use |
| --- | --- |
| aegis.png | Frontal shield array, shield discharge, skill icon |
| bloodspin.png | Moving crimson blade vortex, skill icon |
| inferno.png | Ember detonation |
| icelance.png | Ice lance projectile, shatter fragments, skill icon |
| coldfield.png | Independent frost ground field and field skill icon |
| markedshot.png | Hunter-mark arrow, mark discharge, skill icon |
| shadow.png | Shadow arrow / volley, skill icon |

All shipped sprites have a real alpha channel. The generated color-key source is processed by `node tools/prepare-build-art.mjs`. The script only extracts sprites and removes background chroma; it does not repaint or generate artwork. `src/coop/build-art.js` controls placement, rotation, scale and fade. Projectile tips align with collision coordinates; ground effects render before enemy telegraphs. Persistent shield formations read the active guard state, and cold fields read the live hazard collection; they have no second visual lifetime. All ground rotations happen before the shared 0.707 Y projection so the whirlwind remains a horizontal ellipse at every facing/phase. Its painted diameter is 2r. The hunter mark uses four inward-facing arrowhead crops, visually separate from its flying arrow. Shadows use the existing character PNG rather than a geometric character substitute.

Browser preview evidence: `output/build-art/effects.png`, `cards.png`, `aegis-east.png`, `aegis-south.png`, `bloodspin-{early,middle,late}.png`, `markburst-inward.png` and `projection-check.json` (local verification output, not shipped). The projection check measures the alpha bounds at five rotation phases and tests the horizontal ground projection, as well as capturing skills triggered through the real World request path.
