// ============================================================================
// Virtual Pet Room - Window (with realistic day/night cycle view)
// Window frame on left wall with a view to outside, sunlight streaming in
// Day/night follows 1-hour cycle tied to real clock minutes
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
import { calculateDayNightState } from "./day-night-cycle";

export function createWindow(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "window";

  const wc = WIREFRAME_COLORS.window;
  const lights: THREE.Light[] = [];

  // Window dimensions: 3ft wide x 4ft tall, placed on left wall at height 3ft from floor
  const windowWidth = 3;
  const windowHeight = 4;

  // Window frame (wooden border)
  const frameMat = makeMaterial(mode, wc, { color: 0xf5f0e0, roughness: 0.6, metalness: 0.05 });

  // Top horizontal frame
  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(windowWidth + 0.4, 0.2, 0.3),
    frameMat,
  );
  topFrame.position.set(0, windowHeight / 2 + 0.1, 0);
  configureShadows(topFrame, mode);
  group.add(topFrame);

  // Bottom horizontal frame (sill)
  const sillGeo = new THREE.BoxGeometry(windowWidth + 0.6, 0.15, 0.5);
  const sill = new THREE.Mesh(sillGeo, frameMat);
  sill.position.set(0, -windowHeight / 2 - 0.075, 0.1);
  configureShadows(sill, mode);
  group.add(sill);

  // Left vertical frame
  const sideFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, windowHeight + 0.2, 0.3),
    frameMat,
  );
  sideFrame.position.set(-windowWidth / 2 - 0.1, 0, 0);
  configureShadows(sideFrame, mode);
  group.add(sideFrame);

  // Right vertical frame
  const rightFrame = sideFrame.clone();
  rightFrame.position.set(windowWidth / 2 + 0.1, 0, 0);
  configureShadows(rightFrame, mode);
  group.add(rightFrame);

  // Center cross divider (vertical)
  const dividerV = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, windowHeight, 0.15),
    frameMat,
  );
  dividerV.position.set(0, 0, 0.05);
  group.add(dividerV);

  // Center cross divider (horizontal)
  const dividerH = new THREE.Mesh(
    new THREE.BoxGeometry(windowWidth, 0.1, 0.15),
    frameMat,
  );
  dividerH.position.set(0, 0, 0.05);
  group.add(dividerH);

  // Sky backdrop (colored plane visible through window, changes with day/night)
  const skyGeo = new THREE.PlaneGeometry(windowWidth - 0.1, windowHeight - 0.1);
  const skyMat = mode === "wireframe"
    ? new THREE.MeshBasicMaterial({ color: wc, wireframe: true })
    : new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 0, -0.2);
  group.add(sky);

  // Ground line outside (green strip at bottom of window)
  if (mode !== "wireframe") {
    const groundGeo = new THREE.PlaneGeometry(windowWidth - 0.1, windowHeight * 0.25);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x4a8c3f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -windowHeight * 0.375, -0.18);
    group.add(ground);

    // Simple tree silhouettes outside
    const treeTrunkGeo = new THREE.BoxGeometry(0.08, 0.6, 0.01);
    const treeTrunkMat = new THREE.MeshBasicMaterial({ color: 0x5a3a1a });
    const treeTopGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const treeTopMat = new THREE.MeshBasicMaterial({ color: 0x2d6b1e });

    const treePositions = [-0.8, 0.2, 1.0];
    for (const tx of treePositions) {
      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.set(tx, -windowHeight * 0.18, -0.16);
      group.add(trunk);
      const top = new THREE.Mesh(treeTopGeo, treeTopMat);
      top.position.set(tx, -windowHeight * 0.18 + 0.5, -0.16);
      group.add(top);
    }

    // Sun/moon disc
    const sunGeo = new THREE.CircleGeometry(0.2, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    const sunDisc = new THREE.Mesh(sunGeo, sunMat);
    sunDisc.position.set(0.5, windowHeight * 0.3, -0.15);
    sunDisc.name = "sunDisc";
    group.add(sunDisc);

    // Stars (tiny dots, visible at night)
    const starGroup = new THREE.Group();
    starGroup.name = "stars";
    const starGeo = new THREE.CircleGeometry(0.02, 4);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    for (let i = 0; i < 20; i++) {
      const star = new THREE.Mesh(starGeo.clone(), starMat.clone());
      star.position.set(
        (Math.random() - 0.5) * (windowWidth - 0.4),
        (Math.random() - 0.3) * (windowHeight * 0.6),
        -0.17,
      );
      starGroup.add(star);
    }
    group.add(starGroup);
  }

  // Sunlight directional light through window
  if (mode !== "wireframe" && mode !== "basic") {
    const windowLight = new THREE.SpotLight(0xffeedd, 0.6, 15, Math.PI / 4, 0.5, 1.5);
    windowLight.position.set(0, 0, 0.5);
    // Light target points into the room
    const target = new THREE.Object3D();
    target.position.set(3, -2, 3);
    group.add(target);
    windowLight.target = target;

    if (mode === "good" || mode === "great" || mode === "epic") {
      windowLight.castShadow = true;
      const mapSize = mode === "epic" ? 2048 : mode === "great" ? 1024 : 512;
      windowLight.shadow.mapSize.set(mapSize, mapSize);
      windowLight.shadow.bias = -0.002;
    }

    group.add(windowLight);
    lights.push(windowLight);
  }

  // Light shaft volumetric effect (Great/Epic only)
  let lightShaft: THREE.Mesh | null = null;
  if (mode === "great" || mode === "epic") {
    // Angled box representing light streaming through
    const shaftGeo = new THREE.BoxGeometry(windowWidth * 0.8, 0.02, 8);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xffeedd,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    lightShaft = new THREE.Mesh(shaftGeo, shaftMat);
    lightShaft.position.set(2, -1, 3);
    lightShaft.rotation.z = -0.3;
    lightShaft.rotation.y = 0.2;
    group.add(lightShaft);
  }

  // Position: center of left wall, 4ft up from floor
  group.position.set(-ROOM_W / 2 + 0.05, 4, 0);
  group.rotation.y = Math.PI / 2;

  scene.add(group);

  // Update function: animate day/night cycle
  const update = (_dt: number, _elapsed: number) => {
    const state = calculateDayNightState();

    // Update sky color
    if (skyMat instanceof THREE.MeshBasicMaterial && mode !== "wireframe") {
      if (state.isDaytime) {
        skyMat.color.copy(state.skyColor).multiplyScalar(2.5);
      } else {
        skyMat.color.setRGB(0.02, 0.02, 0.08);
      }
    }

    // Update sun/moon position and visibility
    const sunDisc = group.getObjectByName("sunDisc");
    if (sunDisc instanceof THREE.Mesh && sunDisc.material instanceof THREE.MeshBasicMaterial) {
      if (state.isDaytime) {
        // Sun arc across the window
        const t = (state.normalizedTime - 0.15) / 0.7;
        sunDisc.position.x = -1.0 + t * 2.0;
        sunDisc.position.y = windowHeight * 0.1 + Math.sin(t * Math.PI) * windowHeight * 0.3;
        sunDisc.material.color.setHex(state.sunIntensity > 0.5 ? 0xffee88 : 0xff8844);
        sunDisc.visible = true;
      } else {
        // Moon
        sunDisc.position.set(0.3, windowHeight * 0.25, -0.15);
        sunDisc.material.color.setHex(0xccccdd);
        sunDisc.visible = true;
        sunDisc.scale.setScalar(0.6);
      }
    }

    // Stars visibility
    const stars = group.getObjectByName("stars");
    if (stars) {
      stars.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = state.isDaytime ? 0 : 0.5 + Math.random() * 0.3;
        }
      });
    }

    // Update window light intensity
    for (const l of lights) {
      if (l instanceof THREE.SpotLight) {
        l.intensity = state.windowLightMultiplier * 0.8;
        l.color.copy(state.sunColor);
      }
    }

    // Light shaft opacity
    if (lightShaft && lightShaft.material instanceof THREE.MeshBasicMaterial) {
      lightShaft.material.opacity = state.windowLightMultiplier * 0.05;
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
