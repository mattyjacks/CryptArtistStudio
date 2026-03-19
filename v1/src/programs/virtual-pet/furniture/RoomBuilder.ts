// ============================================================================
// Virtual Pet Room - Room Builder
// Assembles the room shell (floor, walls, ceiling) and all furniture pieces,
// configures lighting based on graphics mode and day/night cycle.
// ============================================================================

import * as THREE from "three";
import {
  type GraphicsMode,
  type FurnitureContext,
  type FurnitureResult,
  ROOM_W,
  ROOM_D,
  ROOM_H,
  makeMaterial,
  configureShadows,
  disposeMeshTree,
} from "./room-types";
import { GRAPHICS_CONFIGS, applyGraphicsConfig } from "./graphics-modes";
import { calculateDayNightState, applyDayNightToScene } from "./day-night-cycle";

import { createBed } from "./Bed";
import { createShelf } from "./Shelf";
import { createFridge } from "./Fridge";
import { createLamp } from "./Lamp";
import { createPlant } from "./Plant";
import { createScratchingPad } from "./ScratchingPad";
import { createComputer } from "./Computer";
import { createWindow } from "./Window";
import { createRug } from "./Rug";
import { createTable } from "./Table";
import { createLitterBox } from "./LitterBox";
import { createSink } from "./Sink";
import { createBall, BALL_RADIUS } from "./Ball";
import { createMicrowave, type MicrowaveController } from "./Microwave";
import { createPainting, type PaintingController } from "./Painting";
import {
  createFoodDisplayManager,
  createFeedingController,
  type FoodDisplayManager,
  type FeedingController,
} from "./FeedingAnimation";

export { BALL_RADIUS };
export type { MicrowaveController, PaintingController, FoodDisplayManager, FeedingController };

export interface RoomInstance {
  scene: THREE.Scene;
  /** The ball mesh (interactive, moved by VirtualPet.tsx) */
  ballMesh: THREE.Mesh;
  /** All collision bodies for pet physics */
  collisionBodies: THREE.Mesh[];
  /** Main directional (sun) light */
  sunLight: THREE.DirectionalLight;
  /** Ambient light */
  ambientLight: THREE.AmbientLight;
  /** Microwave controller for cooking animations */
  microwaveCtrl: MicrowaveController;
  /** Painting controller for image management */
  paintingCtrl: PaintingController;
  /** Food display manager for visible food on furniture */
  foodDisplay: FoodDisplayManager;
  /** Feeding animation controller */
  feedingCtrl: FeedingController;
  /** Shelf group (for food display positioning) */
  shelfGroup: THREE.Group;
  /** Fridge group (for food display positioning) */
  fridgeGroup: THREE.Group;
  /** Table world position (for feeding destination) */
  tableWorldPos: THREE.Vector3;
  /** Call every frame with dt and total elapsed */
  update: (dt: number, elapsed: number) => void;
  /** Cleanup everything */
  dispose: () => void;
}

export function buildRoom(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  mode: GraphicsMode,
  rugSeed?: number | null,
  paintingImageUrl?: string,
): RoomInstance {
  const config = GRAPHICS_CONFIGS[mode];
  const ctx: FurnitureContext = { scene, mode, rugSeed };

  // Apply renderer config
  applyGraphicsConfig(renderer, mode);

  // ---- Scene setup ----
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 20, 40);

  // ---- Lighting ----
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Main directional (sun) light
  const sunLight = new THREE.DirectionalLight(0xffeedd, 0.9);
  sunLight.position.set(5, 12, 5);
  if (config.shadowMapEnabled) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
    sunLight.shadow.camera.left = -ROOM_W;
    sunLight.shadow.camera.right = ROOM_W;
    sunLight.shadow.camera.top = ROOM_D;
    sunLight.shadow.camera.bottom = -ROOM_D;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.bias = -0.001;
    if (mode === "great" || mode === "epic") {
      sunLight.shadow.radius = 4;
    }
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Secondary fill light (subtle, from opposite side)
  if (mode !== "wireframe") {
    const fillLight = new THREE.DirectionalLight(0x8899cc, 0.2);
    fillLight.position.set(-5, 6, -3);
    scene.add(fillLight);
  }

  // Hemisphere light for natural ambient (Good+)
  if (mode === "good" || mode === "great" || mode === "epic") {
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a2a1a, 0.15);
    scene.add(hemiLight);
  }

  // ---- Room Shell ----
  const collisionBodies: THREE.Mesh[] = [];

  // Floor (hardwood)
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
  const floorMat = makeMaterial(mode, 0x996633, {
    color: 0xc4956a,
    roughness: 0.75,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  configureShadows(floor, mode, false, true);
  scene.add(floor);

  // Walls
  const wallColor = 0xf5e6d3;
  const sideWallColor = 0xeadbc8;

  // Back wall
  const backWallGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H);
  const backWallMat = makeMaterial(mode, 0xddccbb, {
    color: wallColor,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const backWall = new THREE.Mesh(backWallGeo, backWallMat);
  backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  configureShadows(backWall, mode, false, true);
  scene.add(backWall);
  collisionBodies.push(backWall);

  // Left wall
  const leftWallGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_H);
  const leftWallMat = makeMaterial(mode, 0xddccbb, {
    color: sideWallColor,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  configureShadows(leftWall, mode, false, true);
  scene.add(leftWall);
  collisionBodies.push(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(leftWallGeo.clone(), leftWallMat.clone());
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  configureShadows(rightWall, mode, false, true);
  scene.add(rightWall);
  collisionBodies.push(rightWall);

  // Ceiling (only for Good+ to cast light properly)
  if (mode !== "wireframe" && mode !== "basic") {
    const ceilGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
    const ceilMat = makeMaterial(mode, 0xdddddd, {
      color: 0xf8f4f0,
      roughness: 0.95,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ROOM_H, 0);
    configureShadows(ceiling, mode, false, true);
    scene.add(ceiling);
  }

  // Baseboard trim (subtle detail for Okay+)
  if (mode !== "wireframe" && mode !== "basic") {
    const trimMat = makeMaterial(mode, 0xffffff, { color: 0xf0ead6, roughness: 0.7 });
    const trimH = 0.2;

    // Back baseboard
    const backTrimGeo = new THREE.BoxGeometry(ROOM_W, trimH, 0.05);
    const backTrim = new THREE.Mesh(backTrimGeo, trimMat);
    backTrim.position.set(0, trimH / 2, -ROOM_D / 2 + 0.025);
    scene.add(backTrim);

    // Left baseboard
    const sideTrimGeo = new THREE.BoxGeometry(0.05, trimH, ROOM_D);
    const leftTrim = new THREE.Mesh(sideTrimGeo, trimMat);
    leftTrim.position.set(-ROOM_W / 2 + 0.025, trimH / 2, 0);
    scene.add(leftTrim);

    // Right baseboard
    const rightTrim = new THREE.Mesh(sideTrimGeo.clone(), trimMat);
    rightTrim.position.set(ROOM_W / 2 - 0.025, trimH / 2, 0);
    scene.add(rightTrim);
  }

  // ---- Create all furniture ----
  const furnitureResults: FurnitureResult[] = [];

  furnitureResults.push(createBed(ctx));
  furnitureResults.push(createShelf(ctx));
  furnitureResults.push(createFridge(ctx));
  furnitureResults.push(createLamp(ctx));
  furnitureResults.push(createPlant(ctx));
  furnitureResults.push(createScratchingPad(ctx));
  furnitureResults.push(createTable(ctx));
  furnitureResults.push(createComputer(ctx));
  furnitureResults.push(createWindow(ctx));
  furnitureResults.push(createRug(ctx));
  furnitureResults.push(createLitterBox(ctx));
  furnitureResults.push(createSink(ctx));

  // Microwave (with controller)
  const microwaveResult = createMicrowave(ctx);
  furnitureResults.push(microwaveResult);
  const microwaveCtrl = microwaveResult.controller;

  // Painting (with controller - default Valley Net image)
  const paintingResult = createPainting(ctx, paintingImageUrl || "");
  furnitureResults.push(paintingResult);
  const paintingCtrl = paintingResult.controller;

  const ballResult = createBall(ctx);
  furnitureResults.push(ballResult);
  const ballMesh = ballResult.meshes[0] as THREE.Mesh;

  // Get furniture groups for food display
  const shelfGroup = furnitureResults.find(f => f.meshes[0]?.name === "shelf")?.meshes[0] as THREE.Group;
  const fridgeGroup = furnitureResults.find(f => f.meshes[0]?.name === "fridge")?.meshes[0] as THREE.Group;

  // Table world position (for feeding animation target)
  const tableGroup = furnitureResults.find(f => f.meshes[0]?.name === "table")?.meshes[0];
  const tableWorldPos = tableGroup ? tableGroup.position.clone() : new THREE.Vector3(ROOM_W / 2 - 3, 0, -ROOM_D / 2 + 3);

  // Food display manager
  const foodDisplay = createFoodDisplayManager(scene, shelfGroup, fridgeGroup, mode);

  // Feeding animation controller
  const feedingCtrl = createFeedingController(scene, mode, microwaveCtrl);

  // ---- Update function ----
  let dayNightTimer = 0;
  const DAY_NIGHT_INTERVAL = 1.0; // Update day/night every second

  const update = (dt: number, elapsed: number) => {
    // Update all furniture animations
    for (const f of furnitureResults) {
      f.update?.(dt, elapsed);
    }

    // Update day/night cycle periodically
    dayNightTimer += dt;
    if (dayNightTimer >= DAY_NIGHT_INTERVAL) {
      dayNightTimer = 0;
      const state = calculateDayNightState();
      applyDayNightToScene(state, sunLight, ambientLight, scene);
    }
  };

  // Initial day/night state
  const initialState = calculateDayNightState();
  applyDayNightToScene(initialState, sunLight, ambientLight, scene);

  // ---- Dispose function ----
  const dispose = () => {
    for (const f of furnitureResults) {
      f.dispose();
    }
    // Dispose room shell
    disposeMeshTree(floor);
    disposeMeshTree(backWall);
    disposeMeshTree(leftWall);
    disposeMeshTree(rightWall);
    scene.remove(floor, backWall, leftWall, rightWall);
    // Remove lights
    scene.remove(sunLight, ambientLight);
  };

  return {
    scene,
    ballMesh,
    collisionBodies,
    sunLight,
    ambientLight,
    microwaveCtrl,
    paintingCtrl,
    foodDisplay,
    feedingCtrl,
    shelfGroup,
    fridgeGroup,
    tableWorldPos,
    update,
    dispose,
  };
}
