// Elige qué pantalla dibujar según el estado.
import { card, home } from "./draw.js";
import { drawGame } from "./drawgames.js";
import { drawClock, drawFocus, drawHub, drawInfo, drawResult, drawShop } from "./drawui.js";
import { H, W, pal } from "./gfx.js";

const SCREENS = { home, hub: drawHub, shop: drawShop, info: drawInfo, game: drawGame, result: drawResult, focus: drawFocus, clock: drawClock };

export function drawScreen(ctx, view) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, W, H);
  if (view.off) {
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  SCREENS[view.screen](ctx, view);
  if (["hub", "shop", "info"].includes(view.screen) && view.pet.alert) card(ctx, pal(false), view.pet.alert);
}
