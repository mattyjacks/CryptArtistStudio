// ============================================================================
// Virtual Pet Room - Computer (90's style desktop computer)
// CRT monitor, chunky keyboard, mouse, and beige tower case
// ============================================================================

import * as THREE from "three";
import {
  type FurnitureContext,
  type FurnitureResult,
  WIREFRAME_COLORS,
  makeMaterial,
  configureShadows,
  disposeMeshTree,
  ROOM_W,
  ROOM_D,
} from "./room-types";

export function createComputer(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "computer";

  const wc = WIREFRAME_COLORS.computer;
  const beige = 0xd2c6a5;

  // CRT Monitor body (1.4ft wide x 1.2ft tall x 1.2ft deep, boxy)
  const monitorGeo = new THREE.BoxGeometry(1.4, 1.2, 1.2);
  const monitorMat = makeMaterial(mode, wc, { color: beige, roughness: 0.7, metalness: 0.05 });
  const monitor = new THREE.Mesh(monitorGeo, monitorMat);
  monitor.position.set(0, 0.6, 0);
  configureShadows(monitor, mode);
  group.add(monitor);

  // Screen (dark inset on front face)
  const screenGeo = new THREE.PlaneGeometry(1.1, 0.85);
  const screenMat = mode === "wireframe"
    ? new THREE.MeshBasicMaterial({ color: wc, wireframe: true })
    : new THREE.MeshBasicMaterial({ color: 0x112244 });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.65, 0.61);
  group.add(screen);

  // Screen glow text (green terminal text effect for non-wireframe)
  if (mode !== "wireframe") {
    const glowGeo = new THREE.PlaneGeometry(0.9, 0.05);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Mesh(glowGeo.clone(), glowMat);
      const lineW = 0.3 + Math.random() * 0.6;
      line.scale.x = lineW;
      line.position.set(-0.1 + (1 - lineW) * 0.2, 0.9 - i * 0.1, 0.615);
      group.add(line);
    }
  }

  // Monitor stand (small box under monitor)
  const standGeo = new THREE.BoxGeometry(0.8, 0.15, 0.6);
  const standMat = makeMaterial(mode, wc, { color: 0xbcb090, roughness: 0.7 });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.set(0, 0.075, 0.1);
  configureShadows(stand, mode);
  group.add(stand);

  // Keyboard (flat box in front of monitor)
  const kbGeo = new THREE.BoxGeometry(1.3, 0.08, 0.5);
  const kbMat = makeMaterial(mode, wc, { color: 0xc8bfa0, roughness: 0.8 });
  const keyboard = new THREE.Mesh(kbGeo, kbMat);
  keyboard.position.set(0, 0.04, 1.0);
  configureShadows(keyboard, mode);
  group.add(keyboard);

  // Keys (tiny bumps on keyboard, non-wireframe only)
  if (mode !== "wireframe") {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        const keyGeo = new THREE.BoxGeometry(0.08, 0.03, 0.08);
        const keyMat = makeMaterial(mode, wc, { color: 0xaaa890, roughness: 0.9 });
        const key = new THREE.Mesh(keyGeo, keyMat);
        key.position.set(-0.5 + col * 0.09, 0.095, 0.82 + row * 0.1);
        group.add(key);
      }
    }
  }

  // Mouse (small rounded box to the right)
  const mouseGeo = new THREE.BoxGeometry(0.25, 0.1, 0.35);
  const mouseMat = makeMaterial(mode, wc, { color: beige, roughness: 0.6 });
  const mouse = new THREE.Mesh(mouseGeo, mouseMat);
  mouse.position.set(0.9, 0.05, 1.0);
  configureShadows(mouse, mode);
  group.add(mouse);

  // Mouse cord (thin curved line)
  if (mode !== "wireframe") {
    const cordGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4);
    const cordMat = makeMaterial(mode, wc, { color: 0x444444, roughness: 0.8 });
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.rotation.z = Math.PI / 2;
    cord.position.set(0.65, 0.05, 0.85);
    group.add(cord);
  }

  // Tower case (1ft wide x 1.5ft tall x 1.2ft deep, sitting beside)
  const towerGeo = new THREE.BoxGeometry(0.7, 1.5, 1.2);
  const towerMat = makeMaterial(mode, wc, { color: beige, roughness: 0.7 });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(-1.2, 0.75, 0);
  configureShadows(tower, mode);
  group.add(tower);

  // Tower floppy drive slot
  if (mode !== "wireframe") {
    const floppyGeo = new THREE.BoxGeometry(0.4, 0.05, 0.02);
    const floppyMat = makeMaterial(mode, wc, { color: 0x666666, roughness: 0.5 });
    const floppy = new THREE.Mesh(floppyGeo, floppyMat);
    floppy.position.set(-1.2, 1.2, 0.61);
    group.add(floppy);

    // Power LED (small green dot)
    const ledGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-1.0, 0.4, 0.61);
    group.add(led);
  }

  // The computer sits on the table, so we position relative to table
  // Table is at (ROOM_W/2 - 3, 0, -ROOM_D/2 + 3)
  // Computer sits on top of the table surface (table top is at y=2.5ft)
  group.position.set(ROOM_W / 2 - 3, 2.5, -ROOM_D / 2 + 3);

  scene.add(group);

  // Screen flicker for Great/Epic
  let flickerTime = 0;
  const update = (dt: number, _elapsed: number) => {
    if (mode === "great" || mode === "epic") {
      flickerTime += dt;
      // Subtle CRT flicker
      if (screenMat instanceof THREE.MeshBasicMaterial) {
        const flicker = 0.9 + 0.1 * Math.sin(flickerTime * 60);
        screenMat.color.setRGB(0.07 * flicker, 0.13 * flicker, 0.27 * flicker);
      }
    }
  };

  return {
    meshes: [group],
    update,
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
