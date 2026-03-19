// ============================================================================
// Virtual Pet Room - Fridge / Freezer Combo (human-sized)
// Standard kitchen fridge with freezer on top, handles, and subtle details
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

export function createFridge(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "fridge";

  const wc = WIREFRAME_COLORS.fridge;

  // Main fridge body (2.5ft wide x 5.5ft tall x 2ft deep)
  const bodyGeo = new THREE.BoxGeometry(2.5, 5.5, 2.0);
  const bodyMat = makeMaterial(mode, wc, { color: 0xd8dce0, roughness: 0.3, metalness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 2.75, 0);
  configureShadows(body, mode);
  group.add(body);

  // Freezer door line (horizontal seam at 4ft high)
  if (mode !== "wireframe") {
    const seamGeo = new THREE.BoxGeometry(2.45, 0.02, 0.05);
    const seamMat = makeMaterial(mode, wc, { color: 0x888888, roughness: 0.5, metalness: 0.3 });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.position.set(0, 4.0, 1.01);
    group.add(seam);
  }

  // Fridge handle (lower section)
  const handleGeo = new THREE.BoxGeometry(0.08, 1.8, 0.12);
  const handleMat = makeMaterial(mode, wc, { color: 0xaaaaaa, roughness: 0.2, metalness: 0.6 });
  const fridgeHandle = new THREE.Mesh(handleGeo, handleMat);
  fridgeHandle.position.set(1.1, 2.5, 1.06);
  configureShadows(fridgeHandle, mode);
  group.add(fridgeHandle);

  // Freezer handle (upper section)
  const freezerHandle = new THREE.Mesh(handleGeo.clone(), handleMat);
  freezerHandle.scale.y = 0.5;
  freezerHandle.position.set(1.1, 4.6, 1.06);
  configureShadows(freezerHandle, mode);
  group.add(freezerHandle);

  // Feet (2 small rectangles at bottom)
  const footGeo = new THREE.BoxGeometry(0.4, 0.1, 1.8);
  const footMat = makeMaterial(mode, wc, { color: 0x333333, roughness: 0.8 });
  const leftFoot = new THREE.Mesh(footGeo, footMat);
  leftFoot.position.set(-0.8, 0.05, 0);
  group.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeo, footMat);
  rightFoot.position.set(0.8, 0.05, 0);
  group.add(rightFoot);

  // Small vent grille at bottom front
  if (mode !== "wireframe") {
    const ventGeo = new THREE.PlaneGeometry(2.0, 0.3);
    const ventMat = makeMaterial(mode, wc, { color: 0x444444, roughness: 0.9 });
    const vent = new THREE.Mesh(ventGeo, ventMat);
    vent.position.set(0, 0.2, 1.01);
    group.add(vent);
  }

  // Position: right wall, near back
  group.position.set(ROOM_W / 2 - 1.5, 0, -ROOM_D / 2 + 1.5);
  group.rotation.y = -Math.PI / 2;

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
