import "./styles.css";
import { OldTownFpsGame } from "./game/Game.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const uiRoot = document.querySelector<HTMLDivElement>("#ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Missing game canvas or UI root.");
}

const game = new OldTownFpsGame(canvas, uiRoot);
game.start();
