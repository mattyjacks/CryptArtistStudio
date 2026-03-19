// ============================================================================
// Virtual Pet Room - Ball (green tennis ball)
// Fuzzy green tennis ball with characteristic white seam line
// ============================================================================

import * as THREE from "three";
import {
  type FurnitureContext,
  type FurnitureResult,
  WIREFRAME_COLORS,
  makeMaterial,
  configureShadows,
  disposeMeshTree,
} from "./room-types";

// The ball radius matches the existing BALL_RADIUS in VirtualPet.tsx
export const BALL_RADIUS = 0.25;

export function createBall(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;

  const wc = WIREFRAME_COLORS.ball;

  // Main ball sphere
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
  const ballMat = makeMaterial(mode, wc, {
    color: 0x7ec850, // Tennis ball green
    roughness: 0.85, // Fuzzy felt texture
    metalness: 0.0,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.name = "ball";
  ball.position.set(2, BALL_RADIUS, 3); // Starting position in room
  configureShadows(ball, mode);

  // Tennis ball seam (white curved line) - torus ring for non-wireframe
  if (mode !== "wireframe") {
    const seamGeo = new THREE.TorusGeometry(BALL_RADIUS * 0.98, 0.008, 4, 32);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const seam1 = new THREE.Mesh(seamGeo, seamMat);
    seam1.rotation.x = Math.PI / 6;
    ball.add(seam1);

    const seam2 = new THREE.Mesh(seamGeo.clone(), seamMat);
    seam2.rotation.x = -Math.PI / 6;
    seam2.rotation.y = Math.PI / 2;
    ball.add(seam2);
  }

  scene.add(ball);

  return {
    meshes: [ball],
    dispose: () => {
      disposeMeshTree(ball);
      scene.remove(ball);
    },
  };
}
