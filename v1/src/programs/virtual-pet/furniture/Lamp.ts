// ============================================================================
// Virtual Pet Room - Lamp (floor lamp with light emission)
// Tall floor lamp with base, pole, and shade that emits actual light
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

export function createLamp(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "lamp";

  const wc = WIREFRAME_COLORS.lamp;
  const lights: THREE.Light[] = [];

  // Base - heavy circular disk (1.2ft diameter)
  const baseGeo = new THREE.CylinderGeometry(0.6, 0.65, 0.12, 24);
  const metalMat = makeMaterial(mode, wc, { color: 0x888888, roughness: 0.3, metalness: 0.7 });
  const base = new THREE.Mesh(baseGeo, metalMat);
  base.position.set(0, 0.06, 0);
  configureShadows(base, mode);
  group.add(base);

  // Pole - thin chrome cylinder (4.5ft tall)
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.5, 12);
  const poleMat = makeMaterial(mode, wc, { color: 0xaaaaaa, roughness: 0.15, metalness: 0.8 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0, 2.37, 0);
  configureShadows(pole, mode);
  group.add(pole);

  // Shade - truncated cone (wider at bottom)
  const shadeGeo = new THREE.CylinderGeometry(0.25, 0.7, 0.8, 24, 1, true);
  const shadeMat = makeMaterial(mode, wc, {
    color: 0xfff8e0,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: mode !== "wireframe",
    opacity: mode === "wireframe" ? 1.0 : 0.85,
  });
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.set(0, 4.8, 0);
  configureShadows(shade, mode, false, false);
  group.add(shade);

  // Light bulb (small glowing sphere inside shade)
  if (mode !== "wireframe") {
    const bulbGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 4.65, 0);
    group.add(bulb);
  }

  // Actual point light from the lamp
  if (mode !== "wireframe") {
    const lampLight = new THREE.PointLight(0xffdd88, 0.8, 12, 1.5);
    lampLight.position.set(0, 4.5, 0);

    if (mode !== "basic") {
      lampLight.castShadow = true;
      lampLight.shadow.mapSize.set(
        mode === "epic" ? 2048 : mode === "great" ? 1024 : 512,
        mode === "epic" ? 2048 : mode === "great" ? 1024 : 512,
      );
      lampLight.shadow.bias = -0.002;
      lampLight.shadow.radius = mode === "epic" || mode === "great" ? 4 : 2;
    }

    group.add(lampLight);
    lights.push(lampLight);

    // Secondary dimmer light below shade for warm floor glow
    const floorGlow = new THREE.PointLight(0xffcc66, 0.3, 6, 2);
    floorGlow.position.set(0, 4.2, 0);
    group.add(floorGlow);
    lights.push(floorGlow);
  }

  // Warm light cone visible volume (Great/Epic only)
  if (mode === "great" || mode === "epic") {
    const coneGeo = new THREE.ConeGeometry(2.5, 4.0, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0, 2.5, 0);
    group.add(cone);
  }

  // Position: right side of room, toward front
  group.position.set(ROOM_W / 2 - 1.5, 0, ROOM_D / 2 - 2.5);

  scene.add(group);

  // Optional flicker update for Great/Epic modes
  let flickerTime = 0;
  const update = (dt: number, _elapsed: number) => {
    if (mode === "great" || mode === "epic") {
      flickerTime += dt;
      // Subtle warm flicker
      const flicker = 0.75 + 0.05 * Math.sin(flickerTime * 3.7) + 0.03 * Math.sin(flickerTime * 7.1);
      for (const l of lights) {
        if (l instanceof THREE.PointLight) {
          l.intensity = l === lights[0] ? flicker : flicker * 0.4;
        }
      }
    }
  };

  return {
    meshes: [group],
    lights,
    update,
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
