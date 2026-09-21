// Run the installed skill client unchanged except for its runtime module import.
// The migrated skills parent package is CommonJS; a data module restores ESM.
import fs from 'node:fs';
const source=fs.readFileSync('C:/Users/fuweicheng/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js','utf8').replace('from "playwright"','from "file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs"');
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
