// ============================================================================
// Virtual Pet Room - Litter Box (cat-sized open-top box with litter)
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

export function createLitterBox(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "litterBox";

  const wc = WIREFRAME_COLORS.litterBox;

  // Box body (open-top container, 1.5ft x 1ft x 0.5ft walls)
  const wallThickness = 0.08;
  const boxW = 1.5;
  const boxD = 1.0;
  const boxH = 0.5;
  const plasticMat = makeMaterial(mode, wc, { color: 0x6688aa, roughness: 0.4, metalness: 0.1 });

  // Bottom
  const bottomGeo = new THREE.BoxGeometry(boxW, wallThickness, boxD);
  const bottom = new THREE.Mesh(bottomGeo, plasticMat);
  bottom.position.set(0, wallThickness / 2, 0);
  configureShadows(bottom, mode);
  group.add(bottom);

  // Front wall
  const frontGeo = new THREE.BoxGeometry(boxW, boxH, wallThickness);
  const front = new THREE.Mesh(frontGeo, plasticMat);
  front.position.set(0, boxH / 2, boxD / 2);
  configureShadows(front, mode);
  group.add(front);

  // Back wall
  const back = new THREE.Mesh(frontGeo, plasticMat);
  back.position.set(0, boxH / 2, -boxD / 2);
  configureShadows(back, mode);
  group.add(back);

  // Left wall
  const sideGeo = new THREE.BoxGeometry(wallThickness, boxH, boxD);
  const left = new THREE.Mesh(sideGeo, plasticMat);
  left.position.set(-boxW / 2, boxH / 2, 0);
  configureShadows(left, mode);
  group.add(left);

  // Right wall
  const right = new THREE.Mesh(sideGeo, plasticMat);
  right.position.set(boxW / 2, boxH / 2, 0);
  configureShadows(right, mode);
  group.add(right);

  // Litter fill (bumpy surface inside)
  if (mode !== "wireframe") {
    const litterGeo = new THREE.BoxGeometry(boxW - wallThickness * 2, 0.2, boxD - wallThickness * 2);
    const litterMat = makeMaterial(mode, wc, { color: 0xc4b08a, roughness: 1.0 });
    const litter = new THREE.Mesh(litterGeo, litterMat);
    litter.position.set(0, 0.18, 0);
    group.add(litter);

    // Small litter mounds for texture
    for (let i = 0; i < 8; i++) {
      const moundGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 6, 4);
      const mound = new THREE.Mesh(moundGeo, litterMat);
      mound.position.set(
        (Math.random() - 0.5) * (boxW - 0.3),
        0.28 + Math.random() * 0.04,
        (Math.random() - 0.5) * (boxD - 0.3),
      );
      group.add(mound);
    }
  }

  // Scoop leaning against the side
  if (mode !== "wireframe") {
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
    const handleMat = makeMaterial(mode, wc, { color: 0x44aa66, roughness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.z = -0.3;
    handle.position.set(boxW / 2 + 0.15, 0.5, 0);
    group.add(handle);
  }

  // Position: back-right corner, near fridge
  group.position.set(ROOM_W / 2 - 2, 0, ROOM_D / 2 - 1.5);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
