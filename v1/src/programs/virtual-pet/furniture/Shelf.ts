// ============================================================================
// Virtual Pet Room - Shelf (tall bookshelf against back wall)
// Wooden bookshelf with multiple shelves and some decorative items
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

export function createShelf(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "shelf";

  const wc = WIREFRAME_COLORS.shelf;

  // Main back panel (5ft tall x 3ft wide x 0.3ft deep)
  const backGeo = new THREE.BoxGeometry(3, 5, 0.15);
  const woodMat = makeMaterial(mode, wc, { color: 0x654321, roughness: 0.75, metalness: 0.02 });
  const back = new THREE.Mesh(backGeo, woodMat);
  back.position.set(0, 2.5, -0.075);
  configureShadows(back, mode);
  group.add(back);

  // Side panels
  const sideGeo = new THREE.BoxGeometry(0.15, 5, 1.0);
  const sideMat = makeMaterial(mode, wc, { color: 0x5a3a1a, roughness: 0.7 });
  const leftSide = new THREE.Mesh(sideGeo, sideMat);
  leftSide.position.set(-1.425, 2.5, -0.5);
  configureShadows(leftSide, mode);
  group.add(leftSide);

  const rightSide = new THREE.Mesh(sideGeo, sideMat);
  rightSide.position.set(1.425, 2.5, -0.5);
  configureShadows(rightSide, mode);
  group.add(rightSide);

  // 5 shelf planks
  const shelfGeo = new THREE.BoxGeometry(2.85, 0.12, 0.95);
  const shelfMat = makeMaterial(mode, wc, { color: 0x6b4a2a, roughness: 0.7 });
  const shelfHeights = [0.06, 1.1, 2.2, 3.3, 4.4];
  for (const sy of shelfHeights) {
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(0, sy, -0.5);
    configureShadows(shelf, mode);
    group.add(shelf);
  }

  // Top cap
  const topGeo = new THREE.BoxGeometry(3, 0.12, 1.0);
  const top = new THREE.Mesh(topGeo, shelfMat);
  top.position.set(0, 5.0, -0.5);
  configureShadows(top, mode);
  group.add(top);

  // Decorative books on shelf 2 (different colored boxes)
  if (mode !== "wireframe") {
    const bookColors = [0xcc3333, 0x3355cc, 0x33aa33, 0xddaa22, 0x8833aa];
    for (let i = 0; i < bookColors.length; i++) {
      const bw = 0.15 + Math.random() * 0.1;
      const bh = 0.6 + Math.random() * 0.3;
      const bookGeo = new THREE.BoxGeometry(bw, bh, 0.7);
      const bookMat = makeMaterial(mode, wc, { color: bookColors[i], roughness: 0.85 });
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(-1.0 + i * 0.45, 1.1 + bh / 2 + 0.06, -0.5);
      configureShadows(book, mode);
      group.add(book);
    }
  }

  // Position: back-right area
  group.position.set(ROOM_W / 2 - 1.8, 0, -ROOM_D / 2 + 0.5);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
