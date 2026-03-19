// ============================================================================
// Virtual Pet Room - Furniture System Barrel Export
// ============================================================================

// Core types and helpers
export type { GraphicsMode, FurnitureContext, FurnitureResult } from "./room-types";
export {
  ROOM_W,
  ROOM_D,
  ROOM_H,
  PET_SIZE,
  GRAPHICS_MODE_LABELS,
  GRAPHICS_MODE_ORDER,
  WIREFRAME_COLORS,
} from "./room-types";

// Graphics mode system
export {
  GRAPHICS_CONFIGS,
  detectGraphicsMode,
  loadGraphicsMode,
  saveGraphicsMode,
  applyGraphicsConfig,
} from "./graphics-modes";

// Day/night cycle
export {
  calculateDayNightState,
  applyDayNightToScene,
} from "./day-night-cycle";

// Room builder (main entry point)
export { buildRoom, BALL_RADIUS } from "./RoomBuilder";
export type {
  RoomInstance,
  MicrowaveController,
  PaintingController,
  FoodDisplayManager,
  FeedingController,
} from "./RoomBuilder";

// Feeding animation system
export { foodNeedsMicrowave } from "./FeedingAnimation";
export type { FeedingPhase, StorageType as FurnitureStorageType } from "./FeedingAnimation";

// Individual furniture (for direct access if needed)
export { createBed } from "./Bed";
export { createShelf } from "./Shelf";
export { createFridge } from "./Fridge";
export { createLamp } from "./Lamp";
export { createPlant } from "./Plant";
export { createScratchingPad } from "./ScratchingPad";
export { createComputer } from "./Computer";
export { createWindow } from "./Window";
export { createRug } from "./Rug";
export { createTable } from "./Table";
export { createLitterBox } from "./LitterBox";
export { createSink } from "./Sink";
export { createBall } from "./Ball";
export { createMicrowave } from "./Microwave";
export { createPainting } from "./Painting";
