// ============================================================================
// Virtual Pet Room - Plant (potted indoor plant)
// Terracotta pot with a bushy green plant, leaves, and soil
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

export function createPlant(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "plant";

  const wc = WIREFRAME_COLORS.plant;

  // Terracotta pot (tapered cylinder, 1ft diameter, 0.8ft tall)
  const potGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 16);
  const potMat = makeMaterial(mode, wc, { color: 0xb5651d, roughness: 0.85, metalness: 0.0 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(0, 0.4, 0);
  configureShadows(pot, mode);
  group.add(pot);

  // Pot rim (thin torus at the top)
  const rimGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 16);
  const rimMat = makeMaterial(mode, wc, { color: 0xa0501a, roughness: 0.8 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(0, 0.8, 0);
  configureShadows(rim, mode, false, false);
  group.add(rim);

  // Soil (dark disc inside pot top)
  const soilGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.05, 16);
  const soilMat = makeMaterial(mode, wc, { color: 0x3a2a1a, roughness: 1.0 });
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.position.set(0, 0.78, 0);
  group.add(soil);

  // Main bush (large sphere for foliage)
  const bushGeo = new THREE.SphereGeometry(0.7, 16, 12);
  const leafMat = makeMaterial(mode, wc, { color: 0x228b22, roughness: 0.8, metalness: 0.0 });
  const bush = new THREE.Mesh(bushGeo, leafMat);
  bush.position.set(0, 1.5, 0);
  configureShadows(bush, mode);
  group.add(bush);

  // Extra leaf clusters (smaller spheres around main bush)
  if (mode !== "wireframe") {
    const clusterPositions = [
      [0.35, 1.8, 0.2],
      [-0.3, 1.7, -0.25],
      [0.15, 1.9, -0.3],
      [-0.2, 1.4, 0.35],
      [0.3, 1.3, -0.15],
    ];
    for (const [cx, cy, cz] of clusterPositions) {
      const clusterGeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 10, 8);
      const shade = 0.7 + Math.random() * 0.3;
      const clusterMat = makeMaterial(mode, wc, {
        color: new THREE.Color(0.13 * shade, 0.55 * shade, 0.13 * shade),
        roughness: 0.85,
      });
      const cluster = new THREE.Mesh(clusterGeo, clusterMat);
      cluster.position.set(cx, cy, cz);
      configureShadows(cluster, mode);
      group.add(cluster);
    }
  }

  // Position: front-left corner
  group.position.set(-ROOM_W / 2 + 1.2, 0, ROOM_D / 2 - 1.2);

  scene.add(group);

  // Subtle sway animation for great+ modes
  let swayTime = 0;
  const update = (dt: number, _elapsed: number) => {
    if (mode === "great" || mode === "epic") {
      swayTime += dt;
      bush.rotation.z = Math.sin(swayTime * 0.5) * 0.02;
      bush.rotation.x = Math.cos(swayTime * 0.7) * 0.015;
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
