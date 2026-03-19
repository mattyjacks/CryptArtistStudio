// ============================================================================
// Virtual Pet Room - Table (human-sized wooden table with 4 legs)
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

export function createTable(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "table";

  const wc = WIREFRAME_COLORS.table;

  // Table top (3ft wide x 2ft deep x 0.15ft thick, at 2.5ft height)
  const topGeo = new THREE.BoxGeometry(3, 0.15, 2);
  const woodMat = makeMaterial(mode, wc, { color: 0x8b6914, roughness: 0.65, metalness: 0.02 });
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.set(0, 2.5, 0);
  configureShadows(top, mode);
  group.add(top);

  // 4 legs (tapered cylinders)
  const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.42, 8);
  const legMat = makeMaterial(mode, wc, { color: 0x6b4914, roughness: 0.7 });
  const legOffsets = [
    [-1.3, 1.21, -0.8],
    [1.3, 1.21, -0.8],
    [-1.3, 1.21, 0.8],
    [1.3, 1.21, 0.8],
  ];
  for (const [lx, ly, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    configureShadows(leg, mode);
    group.add(leg);
  }

  // Cross brace under table (structural detail)
  if (mode !== "wireframe") {
    const braceGeo = new THREE.BoxGeometry(2.4, 0.06, 0.06);
    const braceMat = makeMaterial(mode, wc, { color: 0x5a3a10, roughness: 0.8 });
    const braceF = new THREE.Mesh(braceGeo, braceMat);
    braceF.position.set(0, 0.6, -0.8);
    group.add(braceF);
    const braceB = new THREE.Mesh(braceGeo, braceMat);
    braceB.position.set(0, 0.6, 0.8);
    group.add(braceB);
    const braceSideGeo = new THREE.BoxGeometry(0.06, 0.06, 1.4);
    const braceL = new THREE.Mesh(braceSideGeo, braceMat);
    braceL.position.set(-1.3, 0.6, 0);
    group.add(braceL);
    const braceR = new THREE.Mesh(braceSideGeo, braceMat);
    braceR.position.set(1.3, 0.6, 0);
    group.add(braceR);
  }

  // Position: right side, toward back (computer sits on this table)
  group.position.set(ROOM_W / 2 - 3, 0, -ROOM_D / 2 + 3);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
