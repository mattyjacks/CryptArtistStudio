// ============================================================================
// Virtual Pet Room - Sink (big enough to be a bath for the cat)
// Large utility sink with faucet, basin, and cabinet underneath
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

export function createSink(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "sink";

  const wc = WIREFRAME_COLORS.sink;

  // Cabinet body (2.5ft wide x 2.5ft tall x 1.5ft deep)
  const cabinetGeo = new THREE.BoxGeometry(2.5, 2.5, 1.5);
  const cabinetMat = makeMaterial(mode, wc, { color: 0xf0ead6, roughness: 0.7, metalness: 0.05 });
  const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
  cabinet.position.set(0, 1.25, 0);
  configureShadows(cabinet, mode);
  group.add(cabinet);

  // Cabinet doors (two vertical panels on front)
  if (mode !== "wireframe") {
    const doorGeo = new THREE.BoxGeometry(1.1, 2.0, 0.05);
    const doorMat = makeMaterial(mode, wc, { color: 0xe8e0cc, roughness: 0.65 });
    const leftDoor = new THREE.Mesh(doorGeo, doorMat);
    leftDoor.position.set(-0.6, 1.2, 0.76);
    group.add(leftDoor);
    const rightDoor = new THREE.Mesh(doorGeo, doorMat);
    rightDoor.position.set(0.6, 1.2, 0.76);
    group.add(rightDoor);

    // Door knobs
    const knobGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const knobMat = makeMaterial(mode, wc, { color: 0xcccccc, roughness: 0.2, metalness: 0.8 });
    const leftKnob = new THREE.Mesh(knobGeo, knobMat);
    leftKnob.position.set(-0.15, 1.2, 0.8);
    group.add(leftKnob);
    const rightKnob = new THREE.Mesh(knobGeo, knobMat);
    rightKnob.position.set(0.15, 1.2, 0.8);
    group.add(rightKnob);
  }

  // Sink basin (recessed box on top of cabinet)
  // Outer rim
  const rimGeo = new THREE.BoxGeometry(2.3, 0.15, 1.3);
  const ceramicMat = makeMaterial(mode, wc, { color: 0xffffff, roughness: 0.15, metalness: 0.05 });
  const rim = new THREE.Mesh(rimGeo, ceramicMat);
  rim.position.set(0, 2.58, 0);
  configureShadows(rim, mode);
  group.add(rim);

  // Basin interior (slightly smaller, darker)
  const basinGeo = new THREE.BoxGeometry(2.0, 0.6, 1.0);
  const basinMat = makeMaterial(mode, wc, { color: 0xeeeef5, roughness: 0.1 });
  const basin = new THREE.Mesh(basinGeo, basinMat);
  basin.position.set(0, 2.35, 0);
  configureShadows(basin, mode, false, true);
  group.add(basin);

  // Drain (small dark circle at bottom of basin)
  if (mode !== "wireframe") {
    const drainGeo = new THREE.CircleGeometry(0.06, 12);
    const drainMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const drain = new THREE.Mesh(drainGeo, drainMat);
    drain.rotation.x = -Math.PI / 2;
    drain.position.set(0, 2.06, 0);
    group.add(drain);
  }

  // Faucet - curved pipe
  const pipeMat = makeMaterial(mode, wc, { color: 0xc0c0c0, roughness: 0.15, metalness: 0.85 });

  // Vertical pipe from backsplash
  const vertPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
  const vertPipe = new THREE.Mesh(vertPipeGeo, pipeMat);
  vertPipe.position.set(0, 3.0, -0.5);
  configureShadows(vertPipe, mode);
  group.add(vertPipe);

  // Horizontal pipe extending forward (the spout)
  const horizPipeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8);
  const horizPipe = new THREE.Mesh(horizPipeGeo, pipeMat);
  horizPipe.rotation.z = Math.PI / 2;
  horizPipe.rotation.y = Math.PI / 2;
  horizPipe.position.set(0, 3.45, -0.2);
  configureShadows(horizPipe, mode);
  group.add(horizPipe);

  // Spout tip (downward-pointing nozzle)
  const nozzleGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.15, 8);
  const nozzle = new THREE.Mesh(nozzleGeo, pipeMat);
  nozzle.position.set(0, 3.38, 0.1);
  group.add(nozzle);

  // Faucet handles (two small cylinders on either side)
  const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
  const hotHandle = new THREE.Mesh(handleGeo, makeMaterial(mode, wc, { color: 0xdd4444, roughness: 0.3, metalness: 0.5 }));
  hotHandle.position.set(-0.2, 3.05, -0.5);
  group.add(hotHandle);
  const coldHandle = new THREE.Mesh(handleGeo, makeMaterial(mode, wc, { color: 0x4444dd, roughness: 0.3, metalness: 0.5 }));
  coldHandle.position.set(0.2, 3.05, -0.5);
  group.add(coldHandle);

  // Backsplash
  const splashGeo = new THREE.BoxGeometry(2.5, 1.0, 0.1);
  const splashMat = makeMaterial(mode, wc, { color: 0xe8e8ee, roughness: 0.2 });
  const splash = new THREE.Mesh(splashGeo, splashMat);
  splash.position.set(0, 3.0, -0.7);
  configureShadows(splash, mode);
  group.add(splash);

  // Position: back wall, center-right
  group.position.set(2, 0, -ROOM_D / 2 + 0.8);

  scene.add(group);

  return {
    meshes: [group],
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
