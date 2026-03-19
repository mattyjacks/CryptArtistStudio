// ============================================================================
// Virtual Pet Room - Bed (human-sized, against back wall)
// A cozy bed with frame, mattress, pillow, and blanket
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

export function createBed(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "bed";

  const wc = WIREFRAME_COLORS.bed;

  // Bed frame - wooden base (6ft long x 3.5ft wide x 1.2ft tall)
  const frameGeo = new THREE.BoxGeometry(3.5, 0.3, 6);
  const frameMat = makeMaterial(mode, wc, { color: 0x6b3a2a, roughness: 0.7, metalness: 0.05 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 0.6, 0);
  configureShadows(frame, mode);
  group.add(frame);

  // Legs (4 corners)
  const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
  const legMat = makeMaterial(mode, wc, { color: 0x5a2d1a, roughness: 0.8 });
  const legPositions = [
    [-1.5, 0.225, -2.7],
    [1.5, 0.225, -2.7],
    [-1.5, 0.225, 2.7],
    [1.5, 0.225, 2.7],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    configureShadows(leg, mode);
    group.add(leg);
  }

  // Headboard (at the back)
  const headboardGeo = new THREE.BoxGeometry(3.5, 2.0, 0.2);
  const headboardMat = makeMaterial(mode, wc, { color: 0x5a2d1a, roughness: 0.7 });
  const headboard = new THREE.Mesh(headboardGeo, headboardMat);
  headboard.position.set(0, 1.5, -2.9);
  configureShadows(headboard, mode);
  group.add(headboard);

  // Mattress (slightly smaller than frame, puffy)
  const mattressGeo = new THREE.BoxGeometry(3.2, 0.5, 5.6);
  const mattressMat = makeMaterial(mode, wc, { color: 0xffffff, roughness: 0.9 });
  const mattress = new THREE.Mesh(mattressGeo, mattressMat);
  mattress.position.set(0, 1.0, 0.1);
  configureShadows(mattress, mode);
  group.add(mattress);

  // Pillow
  const pillowGeo = new THREE.BoxGeometry(2.0, 0.35, 1.2);
  const pillowMat = makeMaterial(mode, wc, { color: 0xeee8e0, roughness: 0.95 });
  const pillow = new THREE.Mesh(pillowGeo, pillowMat);
  pillow.position.set(0, 1.42, -2.0);
  configureShadows(pillow, mode);
  group.add(pillow);

  // Blanket (draped over the bottom 2/3)
  const blanketGeo = new THREE.BoxGeometry(3.3, 0.15, 3.8);
  const blanketMat = makeMaterial(mode, wc, { color: 0xff69b4, roughness: 0.95 });
  const blanket = new THREE.Mesh(blanketGeo, blanketMat);
  blanket.position.set(0, 1.33, 1.0);
  configureShadows(blanket, mode);
  group.add(blanket);

  // Position bed in the room: back-left corner
  group.position.set(-ROOM_W / 2 + 2.5, 0, -ROOM_D / 2 + 3.5);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
