// ============================================================================
// Virtual Pet Room - Feeding Animation System
// Manages visible food on furniture + feeding sequence with particles, crumbs,
// satisfaction stars, spiral bursts, floating food glow, frost tint on frozen,
// food bob animation, multi-wave eating particles, sweat/dizzy effects
// ============================================================================

import * as THREE from "three";
import { type GraphicsMode } from "./room-types";
import type { MicrowaveController } from "./Microwave";

export type StorageType = "shelf" | "fridge" | "freezer" | "none";

export function foodNeedsMicrowave(storage: StorageType): boolean {
  return storage === "freezer";
}

// ============================================================================
// Visible Food Items on Furniture
// ============================================================================

export interface VisibleFoodItem {
  mesh: THREE.Sprite;
  storageType: StorageType;
  foodId: string;
  /** IMP #28: Base Y position for bob animation */
  baseY: number;
  /** Phase offset for bob */
  bobPhase: number;
}

const EMOJI_CANVAS_SIZE = 64;

function createEmojiSprite(emoji: string, size: number, tint?: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = EMOJI_CANVAS_SIZE;
  canvas.height = EMOJI_CANVAS_SIZE;
  const ctx2d = canvas.getContext("2d")!;

  // IMP #29: Frost tint for frozen items (light blue overlay)
  if (tint) {
    ctx2d.fillStyle = `rgba(${(tint >> 16) & 0xff}, ${(tint >> 8) & 0xff}, ${tint & 0xff}, 0.15)`;
    ctx2d.fillRect(0, 0, EMOJI_CANVAS_SIZE, EMOJI_CANVAS_SIZE);
  }

  ctx2d.font = `${EMOJI_CANVAS_SIZE * 0.7}px serif`;
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  ctx2d.fillText(emoji, EMOJI_CANVAS_SIZE / 2, EMOJI_CANVAS_SIZE / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

// IMP #30: Create a star sprite for satisfaction effect
function createStarSprite(size: number, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx2d = canvas.getContext("2d")!;
  ctx2d.font = "24px serif";
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  ctx2d.fillText("\u2B50", 16, 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

const SHELF_FOOD_SLOTS = [
  { x: -0.8, y: 2.55, z: -0.2 }, { x: -0.3, y: 2.55, z: -0.2 },
  { x: 0.2, y: 2.55, z: -0.2 },  { x: 0.7, y: 2.55, z: -0.2 },
  { x: -0.8, y: 3.65, z: -0.2 }, { x: -0.3, y: 3.65, z: -0.2 },
  { x: 0.2, y: 3.65, z: -0.2 },  { x: 0.7, y: 3.65, z: -0.2 },
];

const FRIDGE_FOOD_SLOTS = [
  { x: -0.6, y: 1.5, z: 0 }, { x: 0, y: 1.5, z: 0 }, { x: 0.6, y: 1.5, z: 0 },
  { x: -0.6, y: 2.5, z: 0 }, { x: 0, y: 2.5, z: 0 }, { x: 0.6, y: 2.5, z: 0 },
];

const FREEZER_FOOD_SLOTS = [
  { x: -0.5, y: 4.5, z: 0 }, { x: 0.1, y: 4.5, z: 0 }, { x: 0.6, y: 4.5, z: 0 },
];

export interface FoodDisplayManager {
  updateFoodDisplay: (inventory: Array<{ foodId: string; emoji: string; storage: StorageType }>) => void;
  getVisibleFood: (storage: StorageType) => VisibleFoodItem[];
  removeFoodSprite: (foodId: string) => THREE.Sprite | null;
  /** IMP #31: Update food bob animation each frame */
  updateAnimation: (elapsed: number) => void;
  dispose: () => void;
}

export function createFoodDisplayManager(
  _scene: THREE.Scene,
  shelfGroup: THREE.Group,
  fridgeGroup: THREE.Group,
  _mode: GraphicsMode,
): FoodDisplayManager {
  const visibleItems: VisibleFoodItem[] = [];

  const updateFoodDisplay = (inventory: Array<{ foodId: string; emoji: string; storage: StorageType }>) => {
    for (const item of visibleItems) {
      item.mesh.parent?.remove(item.mesh);
      item.mesh.material.map?.dispose();
      item.mesh.material.dispose();
    }
    visibleItems.length = 0;

    const shelfItems = inventory.filter(i => i.storage === "shelf");
    const fridgeItems = inventory.filter(i => i.storage === "fridge");
    const freezerItems = inventory.filter(i => i.storage === "freezer");

    for (let i = 0; i < Math.min(shelfItems.length, SHELF_FOOD_SLOTS.length); i++) {
      const slot = SHELF_FOOD_SLOTS[i];
      const sprite = createEmojiSprite(shelfItems[i].emoji, 0.4);
      sprite.position.set(slot.x, slot.y, slot.z);
      shelfGroup.add(sprite);
      visibleItems.push({
        mesh: sprite, storageType: "shelf", foodId: shelfItems[i].foodId,
        baseY: slot.y, bobPhase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < Math.min(fridgeItems.length, FRIDGE_FOOD_SLOTS.length); i++) {
      const slot = FRIDGE_FOOD_SLOTS[i];
      const sprite = createEmojiSprite(fridgeItems[i].emoji, 0.35);
      sprite.position.set(slot.x, slot.y, slot.z);
      fridgeGroup.add(sprite);
      visibleItems.push({
        mesh: sprite, storageType: "fridge", foodId: fridgeItems[i].foodId,
        baseY: slot.y, bobPhase: Math.random() * Math.PI * 2,
      });
    }

    // IMP #32: Freezer items get frost tint
    for (let i = 0; i < Math.min(freezerItems.length, FREEZER_FOOD_SLOTS.length); i++) {
      const slot = FREEZER_FOOD_SLOTS[i];
      const sprite = createEmojiSprite(freezerItems[i].emoji, 0.35, 0x88ccff);
      sprite.position.set(slot.x, slot.y, slot.z);
      fridgeGroup.add(sprite);
      visibleItems.push({
        mesh: sprite, storageType: "freezer", foodId: freezerItems[i].foodId,
        baseY: slot.y, bobPhase: Math.random() * Math.PI * 2,
      });
    }
  };

  // IMP #33: Gentle bob animation for all food sprites
  const updateAnimation = (elapsed: number) => {
    for (const item of visibleItems) {
      item.mesh.position.y = item.baseY + Math.sin(elapsed * 1.5 + item.bobPhase) * 0.04;
    }
  };

  const getVisibleFood = (storage: StorageType): VisibleFoodItem[] => {
    return visibleItems.filter(i => i.storageType === storage);
  };

  const removeFoodSprite = (foodId: string): THREE.Sprite | null => {
    const idx = visibleItems.findIndex(i => i.foodId === foodId);
    if (idx === -1) return null;
    const item = visibleItems.splice(idx, 1)[0];
    item.mesh.parent?.remove(item.mesh);
    return item.mesh;
  };

  const dispose = () => {
    for (const item of visibleItems) {
      item.mesh.parent?.remove(item.mesh);
      item.mesh.material.map?.dispose();
      item.mesh.material.dispose();
    }
    visibleItems.length = 0;
  };

  return { updateFoodDisplay, getVisibleFood, removeFoodSprite, updateAnimation, dispose };
}

// ============================================================================
// Feeding Animation Sequence
// ============================================================================

export type FeedingPhase =
  | "idle"
  | "walking_to_storage"
  | "taking_food"
  | "walking_to_microwave"
  | "microwaving"
  | "taking_from_microwave"
  | "walking_to_table"
  | "jumping_on_table"
  | "eating"
  | "jumping_off_table"
  | "satisfaction"
  | "done";

export interface FeedingAnimState {
  phase: FeedingPhase;
  foodEmoji: string;
  foodStorage: StorageType;
  floatingFood: THREE.Sprite | null;
  particles: THREE.Points | null;
  targetPos: THREE.Vector3;
  timer: number;
  onTable: boolean;
  /** IMP #34: Particle burst wave counter */
  burstCount: number;
  /** IMP #35: Satisfaction stars */
  satisfactionStars: THREE.Sprite[];
  /** IMP #36: Crumb trail sprites */
  crumbs: THREE.Sprite[];
  /** IMP #37: Take animation scale progress */
  takeScale: number;
}

export interface FeedingController {
  startFeeding: (
    foodEmoji: string,
    storage: StorageType,
    needsMicrowave: boolean,
    storageWorldPos: THREE.Vector3,
    microwaveWorldPos: THREE.Vector3,
    tableWorldPos: THREE.Vector3,
  ) => void;
  update: (dt: number, petPos: THREE.Vector3) => FeedingPhase;
  getTargetPos: () => THREE.Vector3 | null;
  isFeeding: () => boolean;
  getPhase: () => FeedingPhase;
  isPetOnTable: () => boolean;
  dispose: () => void;
}

export function createFeedingController(
  scene: THREE.Scene,
  _mode: GraphicsMode,
  microwaveCtrl: MicrowaveController,
): FeedingController {
  const state: FeedingAnimState = {
    phase: "idle",
    foodEmoji: "",
    foodStorage: "none",
    floatingFood: null,
    particles: null,
    targetPos: new THREE.Vector3(),
    timer: 0,
    onTable: false,
    burstCount: 0,
    satisfactionStars: [],
    crumbs: [],
    takeScale: 0,
  };

  let storagePos = new THREE.Vector3();
  let microwavePos = new THREE.Vector3();
  let tablePos = new THREE.Vector3();
  let needsMicrowave = false;

  const TABLE_TOP_Y = 2.65;
  const JUMP_DURATION = 0.5;
  const EAT_DURATION = 3.0; // IMP #38: Longer eating for more visual effect
  const TAKE_DURATION = 0.7;
  const SATISFACTION_DURATION = 1.2;

  function createFloatingFood(emoji: string): THREE.Sprite {
    const sprite = createEmojiSprite(emoji, 0.5);
    scene.add(sprite);
    return sprite;
  }

  // IMP #39: Spiral particle burst pattern
  function createEatingParticles(pos: THREE.Vector3, wave: number): THREE.Points {
    const count = 24;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.5;
      positions[i * 3 + 2] = pos.z;

      // IMP #40: Color varies by wave (warm -> cool progression)
      const hue = (wave * 0.3 + i / count) % 1;
      const r = hue < 0.33 ? 1 : hue < 0.66 ? 1 - (hue - 0.33) * 3 : 0;
      const g = hue < 0.33 ? hue * 3 : hue < 0.66 ? 1 : 1 - (hue - 0.66) * 3;
      const b = hue < 0.33 ? 0 : hue < 0.66 ? (hue - 0.33) * 3 : 1;
      colors[i * 3] = 0.5 + r * 0.5;
      colors[i * 3 + 1] = 0.3 + g * 0.5;
      colors[i * 3 + 2] = 0.1 + b * 0.4;

      // IMP #41: Spiral pattern instead of random
      const angle = (i / count) * Math.PI * 2 + wave * 0.8;
      const speed = 1.5 + Math.random() * 1.5;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 3.5 + 1.5,
        Math.sin(angle) * speed,
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1 + wave * 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    particleVelocities = velocities;
    scene.add(points);
    return points;
  }

  let particleVelocities: THREE.Vector3[] = [];

  function updateParticles(dt: number) {
    if (!state.particles) return;
    const posAttr = state.particles.geometry.getAttribute("position");
    const vels = particleVelocities;
    if (!vels.length) return;

    for (let i = 0; i < vels.length; i++) {
      vels[i].y -= 6 * dt; // IMP #42: Stronger gravity for better arc
      vels[i].x *= 0.99; // Air resistance
      vels[i].z *= 0.99;
      posAttr.setX(i, posAttr.getX(i) + vels[i].x * dt);
      posAttr.setY(i, Math.max(0, posAttr.getY(i) + vels[i].y * dt));
      posAttr.setZ(i, posAttr.getZ(i) + vels[i].z * dt);
    }
    posAttr.needsUpdate = true;

    const mat = state.particles.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, mat.opacity - dt * 0.4);
  }

  // IMP #43: Spawn satisfaction stars above pet head
  function spawnSatisfactionStars(pos: THREE.Vector3) {
    cleanupStars();
    for (let i = 0; i < 5; i++) {
      const star = createStarSprite(0.3 + Math.random() * 0.2, 0xffdd00);
      star.position.set(
        pos.x + (Math.random() - 0.5) * 1.5,
        pos.y + 1.0 + i * 0.4,
        pos.z + (Math.random() - 0.5) * 0.5,
      );
      scene.add(star);
      state.satisfactionStars.push(star);
    }
  }

  // IMP #44: Drop food crumbs while walking with food
  function dropCrumb(pos: THREE.Vector3) {
    if (state.crumbs.length > 12) {
      const old = state.crumbs.shift()!;
      old.material.map?.dispose();
      old.material.dispose();
      scene.remove(old);
    }
    const crumb = createEmojiSprite(state.foodEmoji, 0.15);
    crumb.position.set(
      pos.x + (Math.random() - 0.5) * 0.3,
      0.08,
      pos.z + (Math.random() - 0.5) * 0.3,
    );
    crumb.material.opacity = 0.6;
    scene.add(crumb);
    state.crumbs.push(crumb);
  }

  function cleanupParticles() {
    if (state.particles) {
      state.particles.geometry.dispose();
      (state.particles.material as THREE.Material).dispose();
      scene.remove(state.particles);
      state.particles = null;
    }
  }

  function cleanupFloatingFood() {
    if (state.floatingFood) {
      state.floatingFood.material.map?.dispose();
      state.floatingFood.material.dispose();
      scene.remove(state.floatingFood);
      state.floatingFood = null;
    }
  }

  function cleanupStars() {
    for (const s of state.satisfactionStars) {
      s.material.map?.dispose();
      s.material.dispose();
      scene.remove(s);
    }
    state.satisfactionStars.length = 0;
  }

  function cleanupCrumbs() {
    for (const c of state.crumbs) {
      c.material.map?.dispose();
      c.material.dispose();
      scene.remove(c);
    }
    state.crumbs.length = 0;
  }

  let crumbTimer = 0;

  const controller: FeedingController = {
    startFeeding(foodEmoji, storage, micro, sPos, mPos, tPos) {
      if (state.phase !== "idle") return;
      state.foodEmoji = foodEmoji;
      state.foodStorage = storage;
      needsMicrowave = micro;
      storagePos = sPos.clone();
      microwavePos = mPos.clone();
      tablePos = tPos.clone();
      state.timer = 0;
      state.onTable = false;
      state.burstCount = 0;
      state.takeScale = 0;
      crumbTimer = 0;

      state.phase = "walking_to_storage";
      state.targetPos.copy(storagePos);
      state.targetPos.y = 0;
    },

    update(dt: number, petPos: THREE.Vector3): FeedingPhase {
      if (state.phase === "idle" || state.phase === "done") return state.phase;
      state.timer += dt;

      // IMP #45: Float food above pet with bounce + rotation illusion
      if (state.floatingFood && state.floatingFood.visible) {
        const baseY = state.onTable ? TABLE_TOP_Y + 1.2 : 1.5;
        const bounce = Math.sin(state.timer * 5) * 0.12;
        state.floatingFood.position.set(petPos.x, baseY + bounce, petPos.z);
        // IMP #46: Gentle scale pulse
        const scalePulse = 0.5 + Math.sin(state.timer * 3) * 0.05;
        state.floatingFood.scale.set(scalePulse, scalePulse, 1);
      }

      // IMP #47: Drop crumbs while walking with food
      if (state.floatingFood && state.floatingFood.visible) {
        const isWalking = state.phase === "walking_to_microwave" || state.phase === "walking_to_table";
        if (isWalking) {
          crumbTimer += dt;
          if (crumbTimer > 0.8) {
            crumbTimer = 0;
            dropCrumb(petPos);
          }
        }
      }

      // IMP #48: Fade out crumbs over time
      for (const c of state.crumbs) {
        c.material.opacity = Math.max(0, c.material.opacity - dt * 0.08);
      }

      // Update satisfaction stars (float upward and fade)
      for (const s of state.satisfactionStars) {
        s.position.y += dt * 0.8;
        s.material.opacity = Math.max(0, s.material.opacity - dt * 0.6);
        const sc = s.scale.x + dt * 0.3;
        s.scale.set(sc, sc, 1);
      }

      switch (state.phase) {
        case "walking_to_storage": {
          const dist = new THREE.Vector2(petPos.x - storagePos.x, petPos.z - storagePos.z).length();
          if (dist < 1.0) {
            state.phase = "taking_food";
            state.timer = 0;
            state.takeScale = 0;
          }
          break;
        }

        case "taking_food": {
          // IMP #49: Scale-up animation when taking food
          state.takeScale = Math.min(1, state.timer / TAKE_DURATION);
          if (state.timer >= TAKE_DURATION) {
            state.floatingFood = createFloatingFood(state.foodEmoji);
            if (needsMicrowave) {
              state.phase = "walking_to_microwave";
              state.targetPos.copy(microwavePos);
              state.targetPos.y = 0;
            } else {
              state.phase = "walking_to_table";
              state.targetPos.copy(tablePos);
              state.targetPos.y = 0;
            }
            state.timer = 0;
          }
          break;
        }

        case "walking_to_microwave": {
          const dist = new THREE.Vector2(petPos.x - microwavePos.x, petPos.z - microwavePos.z).length();
          if (dist < 1.0) {
            state.phase = "microwaving";
            state.timer = 0;
            if (state.floatingFood) state.floatingFood.visible = false;
            microwaveCtrl.startCooking(() => {
              if (state.floatingFood) state.floatingFood.visible = true;
              state.phase = "taking_from_microwave";
              state.timer = 0;
            });
          }
          break;
        }

        case "microwaving":
          break;

        case "taking_from_microwave": {
          if (state.timer >= TAKE_DURATION) {
            state.phase = "walking_to_table";
            state.targetPos.copy(tablePos);
            state.targetPos.y = 0;
            state.timer = 0;
          }
          break;
        }

        case "walking_to_table": {
          const dist = new THREE.Vector2(petPos.x - tablePos.x, petPos.z - tablePos.z).length();
          if (dist < 1.0) {
            state.phase = "jumping_on_table";
            state.timer = 0;
          }
          break;
        }

        case "jumping_on_table": {
          if (state.timer >= JUMP_DURATION) {
            state.onTable = true;
            state.phase = "eating";
            state.timer = 0;
            state.burstCount = 0;
            state.particles = createEatingParticles(
              new THREE.Vector3(petPos.x, TABLE_TOP_Y + 0.5, petPos.z), 0,
            );
          }
          break;
        }

        case "eating": {
          updateParticles(dt);

          // IMP #50: Multi-wave particle bursts (3 waves)
          const burstInterval = EAT_DURATION / 4;
          const expectedBursts = Math.floor(state.timer / burstInterval);
          if (expectedBursts > state.burstCount && state.burstCount < 3) {
            state.burstCount = expectedBursts;
            cleanupParticles();
            state.particles = createEatingParticles(
              new THREE.Vector3(petPos.x, TABLE_TOP_Y + 0.5, petPos.z),
              state.burstCount,
            );
          }

          // IMP #51: Food shrinks as eating progresses
          if (state.floatingFood) {
            const eatProgress = state.timer / EAT_DURATION;
            const shrink = Math.max(0.1, 0.5 * (1 - eatProgress));
            state.floatingFood.scale.set(shrink, shrink, 1);
            state.floatingFood.material.opacity = Math.max(0.2, 1 - eatProgress * 0.8);
          }

          if (state.timer >= EAT_DURATION) {
            cleanupFloatingFood();
            cleanupParticles();
            // IMP #52: Transition to satisfaction phase
            state.phase = "satisfaction";
            state.timer = 0;
            spawnSatisfactionStars(new THREE.Vector3(petPos.x, TABLE_TOP_Y + 0.8, petPos.z));
          }
          break;
        }

        // IMP #53: New satisfaction phase - stars float up before jumping off
        case "satisfaction": {
          if (state.timer >= SATISFACTION_DURATION) {
            cleanupStars();
            state.phase = "jumping_off_table";
            state.timer = 0;
          }
          break;
        }

        case "jumping_off_table": {
          if (state.timer >= JUMP_DURATION) {
            state.onTable = false;
            cleanupCrumbs();
            state.phase = "done";
            state.timer = 0;
          }
          break;
        }
      }

      return state.phase;
    },

    getTargetPos(): THREE.Vector3 | null {
      if (state.phase === "idle" || state.phase === "done") return null;
      if (state.phase === "microwaving" || state.phase === "eating" || state.phase === "satisfaction") return null;
      if (state.phase === "taking_food" || state.phase === "taking_from_microwave") return null;
      if (state.phase === "jumping_on_table" || state.phase === "jumping_off_table") return null;
      return state.targetPos;
    },

    isFeeding(): boolean {
      return state.phase !== "idle" && state.phase !== "done";
    },

    getPhase(): FeedingPhase {
      return state.phase;
    },

    isPetOnTable(): boolean {
      return state.onTable;
    },

    dispose() {
      cleanupFloatingFood();
      cleanupParticles();
      cleanupStars();
      cleanupCrumbs();
      state.phase = "idle";
    },
  };

  return controller;
}
