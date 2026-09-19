import {spritePose} from './sprite-animation.js';

const atlases = new Map();
let pending;
export function loadCharacterSprites() {
  return pending ??= Promise.all(['warrior', 'mage', 'archer'].map(async role => {
    const url = new URL(`../../assets/characters/${role}.json`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`角色图集加载失败：${role} (${response.status})`);
    const manifest = await response.json();
    const image = new Image();
    image.src = new URL(manifest.image, url).href;
    await image.decode();
    if (image.width !== manifest.width || image.height !== manifest.height) throw new Error(`角色图集尺寸不符：${role}`);
    atlases.set(role, {image, manifest});
  }));
}

export function characterAssetState() {
  return { renderer: 'illustrated-png-atlas', ready: atlases.size === 3,
    roles: [...atlases].map(([role, {manifest}]) => ({role, frames: manifest.frames.length, source: manifest.source})) };
}

// Only draw PNG pixels. This function no longer constructs the character from paths.
export function hero(c, h, time, scale = 1) {
  const atlas = atlases.get(h.role);
  if (!atlas) return;
  const pose = spritePose(h, time);
  const index = (pose.sheet === 'combat' ? 32 : 0) + pose.row * 4 + pose.column;
  const frame = atlas.manifest.frames[index];
  const size = atlas.manifest.cell;
  const unit = atlas.manifest.displayScale * scale;
  c.save();
  c.translate(pose.x * scale, pose.y * scale);
  c.rotate(pose.rotation);
  c.scale(unit * pose.sx, unit * pose.sy);
  if (h.down) c.globalAlpha *= .65;
  // Hit flash is a bitmap color filter, never an opaque ellipse hiding the sprite.
  if (h.hitFlash > 0) c.filter = 'brightness(1.8) saturate(0.65)';
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(atlas.image, frame.x, frame.y, size, size, -atlas.manifest.anchor[0], -atlas.manifest.anchor[1], size, size);
  c.restore();
}
