// ============================================================================
// Virtual Pet Room - Scratching Pad (cat scratching post)
// Sisal-wrapped post on a carpeted base with a platform on top
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

export function createScratchingPad(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "scratchingPad";

  const wc = WIREFRAME_COLORS.scratchingPad;

  // Base platform (2ft x 2ft x 0.2ft, carpet-covered)
  const baseGeo = new THREE.BoxGeometry(2, 0.2, 2);
  const carpetMat = makeMaterial(mode, wc, { color: 0xaa8866, roughness: 0.95 });
  const base = new THREE.Mesh(baseGeo, carpetMat);
  base.position.set(0, 0.1, 0);
  configureShadows(base, mode);
  group.add(base);

  // Main post (sisal-wrapped cylinder, 2.5ft tall)
  const postGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.5, 16);
  const sisalMat = makeMaterial(mode, wc, { color: 0xc4a060, roughness: 1.0, metalness: 0.0 });
  const post = new THREE.Mesh(postGeo, sisalMat);
  post.position.set(0, 1.45, 0);
  configureShadows(post, mode);
  group.add(post);

  // Sisal texture rings (visual detail, non-wireframe only)
  if (mode !== "wireframe") {
    for (let i = 0; i < 8; i++) {
      const ringGeo = new THREE.TorusGeometry(0.21, 0.015, 4, 16);
      const shade = 0.85 + Math.random() * 0.15;
      const ringMat = makeMaterial(mode, wc, {
        color: new THREE.Color(shade * 0.77, shade * 0.63, shade * 0.38),
        roughness: 1.0,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.4 + i * 0.3, 0);
      group.add(ring);
    }
  }

  // Top platform (1.5ft x 1.5ft, slightly rounded edges)
  const topGeo = new THREE.BoxGeometry(1.5, 0.15, 1.5);
  const topMat = makeMaterial(mode, wc, { color: 0x9a7a55, roughness: 0.9 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, 2.77, 0);
  configureShadows(top, mode);
  group.add(top);

  // Small dangling toy (sphere on a string from the platform edge)
  if (mode !== "wireframe") {
    const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4);
    const stringMat = makeMaterial(mode, wc, { color: 0x666666, roughness: 0.8 });
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.set(0.6, 2.4, 0);
    group.add(string);

    const toyGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const toyMat = makeMaterial(mode, wc, { color: 0xff4444, roughness: 0.5 });
    const toy = new THREE.Mesh(toyGeo, toyMat);
    toy.position.set(0.6, 2.05, 0);
    configureShadows(toy, mode);
    group.add(toy);
  }

  // Position: center-left area
  group.position.set(-ROOM_W / 2 + 2, 0, 1);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
