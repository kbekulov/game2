import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targetAssets = join(root, "assets");
mkdirSync(targetAssets, { recursive: true });

const files = [
  ["dist/assets/game.js", "assets/game.js"],
  ["dist/assets/game.css", "assets/game.css"]
];

for (const [from, to] of files) {
  const source = join(root, from);
  if (!existsSync(source)) {
    throw new Error(`Missing build artifact: ${from}`);
  }
  copyFileSync(source, join(root, to));
}

console.log("Synced GitHub Pages assets.");
