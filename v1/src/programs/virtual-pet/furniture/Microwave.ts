// ============================================================================
// Virtual Pet Room - Microwave (countertop microwave on kitchen counter)
// Has openable door, interior light, rotating plate, cooking animation,
// steam particles, countdown display, rubber feet, vent grille, power cable,
// door hinges, counter drawer, improved glass glow, ding flash effect
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

// Microwave sits on a small counter next to the fridge
const MW_X = ROOM_W / 2 - 4.5;
const MW_Z = -ROOM_D / 2 + 0.8;
const COUNTER_H = 2.8;

export interface MicrowaveController {
  group: THREE.Group;
  startCooking: (onDone: () => void) => void;
  openDoor: () => void;
  closeDoor: () => void;
  isCooking: boolean;
  interiorLight: THREE.PointLight | null;
  worldPosition: THREE.Vector3;
  /** Remaining cook time in seconds (0 when not cooking) */
  cookTimeRemaining: number;
}

export function createMicrowave(ctx: FurnitureContext): FurnitureResult & { controller: MicrowaveController } {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "microwave";
  const wc = WIREFRAME_COLORS.fridge;
  const isDetailed = mode !== "wireframe" && mode !== "basic";
  const isHighEnd = mode === "great" || mode === "epic";

  // ---- Counter (small kitchen counter) ----
  const counterGeo = new THREE.BoxGeometry(2.5, COUNTER_H, 1.5);
  const counterMat = makeMaterial(mode, 0x886644, { color: 0xa08060, roughness: 0.7, metalness: 0.05 });
  const counter = new THREE.Mesh(counterGeo, counterMat);
  counter.position.set(0, COUNTER_H / 2, 0);
  configureShadows(counter, mode);
  group.add(counter);

  // Counter top surface (granite-ish with subtle speckle)
  const counterTopGeo = new THREE.BoxGeometry(2.6, 0.1, 1.6);
  const counterTopMat = makeMaterial(mode, 0x555555, { color: 0x3a3a3a, roughness: 0.35, metalness: 0.15 });
  const counterTop = new THREE.Mesh(counterTopGeo, counterTopMat);
  counterTop.position.set(0, COUNTER_H + 0.05, 0);
  configureShadows(counterTop, mode);
  group.add(counterTop);

  // IMP #1: Counter drawer with handle
  if (mode !== "wireframe") {
    const drawerGeo = new THREE.BoxGeometry(1.8, 0.6, 0.04);
    const drawerMat = makeMaterial(mode, 0x886644, { color: 0x9a7050, roughness: 0.65, metalness: 0.05 });
    const drawer = new THREE.Mesh(drawerGeo, drawerMat);
    drawer.position.set(0, COUNTER_H * 0.45, 0.77);
    configureShadows(drawer, mode);
    group.add(drawer);
    // Drawer handle (chrome bar)
    const dhGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
    dhGeo.rotateZ(Math.PI / 2);
    const dhMat = makeMaterial(mode, 0xaaaaaa, { color: 0xcccccc, roughness: 0.15, metalness: 0.8 });
    const dh = new THREE.Mesh(dhGeo, dhMat);
    dh.position.set(0, COUNTER_H * 0.45, 0.81);
    group.add(dh);
    // Second drawer below
    const drawer2 = drawer.clone();
    drawer2.position.y = COUNTER_H * 0.2;
    group.add(drawer2);
    const dh2 = dh.clone();
    dh2.position.y = COUNTER_H * 0.2;
    group.add(dh2);
  }

  // IMP #2: Counter edge trim (chrome strip)
  if (isDetailed) {
    const trimGeo = new THREE.BoxGeometry(2.6, 0.04, 0.02);
    const trimMat = makeMaterial(mode, 0xaaaaaa, { color: 0xbbbbbb, roughness: 0.1, metalness: 0.9 });
    const trimFront = new THREE.Mesh(trimGeo, trimMat);
    trimFront.position.set(0, COUNTER_H + 0.1, 0.8);
    group.add(trimFront);
  }

  // ---- Microwave body ----
  const mwGroup = new THREE.Group();
  mwGroup.name = "microwave-body";
  mwGroup.position.set(0, COUNTER_H + 0.1, 0);

  // Body - dark gray/black with slight bevel feel
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.9, 1.0);
  const bodyMat = makeMaterial(mode, wc, { color: 0x2a2a2a, roughness: 0.45, metalness: 0.35 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.45, 0);
  configureShadows(body, mode);
  mwGroup.add(body);

  // IMP #3: Interior cavity walls (visible when door open)
  if (mode !== "wireframe") {
    const cavityMat = makeMaterial(mode, 0xcccccc, { color: 0xd0d0d0, roughness: 0.6, metalness: 0.3 });
    // Bottom
    const cavBottom = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), cavityMat);
    cavBottom.rotation.x = -Math.PI / 2;
    cavBottom.position.set(-0.05, 0.06, 0);
    mwGroup.add(cavBottom);
    // Back
    const cavBack = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), cavityMat);
    cavBack.position.set(-0.05, 0.42, -0.44);
    mwGroup.add(cavBack);
    // Top (with waveguide cover)
    const cavTop = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), cavityMat);
    cavTop.rotation.x = Math.PI / 2;
    cavTop.position.set(-0.05, 0.78, 0);
    mwGroup.add(cavTop);
    // Sides
    const cavLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.72), cavityMat);
    cavLeft.rotation.y = Math.PI / 2;
    cavLeft.position.set(-0.65, 0.42, 0);
    mwGroup.add(cavLeft);
    const cavRight = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.72), cavityMat);
    cavRight.rotation.y = -Math.PI / 2;
    cavRight.position.set(0.4, 0.42, 0);
    mwGroup.add(cavRight);
  }

  // IMP #4: Rubber feet (4 small dark nubs under microwave)
  if (mode !== "wireframe") {
    const footGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.03, 8);
    const footMat = makeMaterial(mode, 0x222222, { color: 0x1a1a1a, roughness: 0.95 });
    const footPositions = [
      [-0.55, 0.015, -0.35], [-0.55, 0.015, 0.35],
      [0.55, 0.015, -0.35], [0.55, 0.015, 0.35],
    ];
    for (const [fx, fy, fz] of footPositions) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(fx, fy, fz);
      mwGroup.add(foot);
    }
  }

  // IMP #5: Bottom vent grille (exhaust slots)
  if (isDetailed) {
    const ventGroup = new THREE.Group();
    const slotGeo = new THREE.BoxGeometry(0.6, 0.01, 0.015);
    const slotMat = makeMaterial(mode, 0x1a1a1a, { color: 0x111111, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const slot = new THREE.Mesh(slotGeo, slotMat);
      slot.position.set(0, 0, -0.25 + i * 0.1);
      ventGroup.add(slot);
    }
    ventGroup.position.set(-0.05, 0.88, 0);
    ventGroup.rotation.x = Math.PI;
    mwGroup.add(ventGroup);
  }

  // IMP #6: Power cable (thick black cord going to wall)
  if (isDetailed) {
    const cablePts = [
      new THREE.Vector3(0.75, 0.45, -0.2),
      new THREE.Vector3(1.0, 0.45, -0.4),
      new THREE.Vector3(1.1, 0.3, -0.6),
      new THREE.Vector3(1.1, 0.1, -0.75),
    ];
    const cableCurve = new THREE.CatmullRomCurve3(cablePts);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 12, 0.02, 6, false);
    const cableMat = makeMaterial(mode, 0x111111, { color: 0x0a0a0a, roughness: 0.9 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    mwGroup.add(cable);
  }

  // Door assembly
  const doorGroup = new THREE.Group();
  doorGroup.name = "microwave-door";

  const doorGeo = new THREE.BoxGeometry(1.05, 0.75, 0.05);
  const doorMat = makeMaterial(mode, wc, { color: 0x333333, roughness: 0.4, metalness: 0.4 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(-0.05, 0, 0.025);
  configureShadows(door, mode);
  doorGroup.add(door);

  // IMP #7: Door window with improved glass - glows orange during cooking
  let windowMat: THREE.MeshStandardMaterial | null = null;
  if (mode !== "wireframe") {
    const windowGeo = new THREE.PlaneGeometry(0.7, 0.5);
    windowMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.75,
    });
    const windowPane = new THREE.Mesh(windowGeo, windowMat);
    windowPane.position.set(-0.05, 0.05, 0.054);
    doorGroup.add(windowPane);

    // IMP #8: Door window grid pattern (microwave safety mesh)
    if (isDetailed) {
      const gridMat = new THREE.MeshStandardMaterial({
        color: 0x222222, transparent: true, opacity: 0.15, wireframe: true,
      });
      const gridGeo = new THREE.PlaneGeometry(0.68, 0.48, 8, 6);
      const grid = new THREE.Mesh(gridGeo, gridMat);
      grid.position.set(-0.05, 0.05, 0.056);
      doorGroup.add(grid);
    }
  }

  // IMP #9: Door hinges (two small cylinders on left edge)
  if (mode !== "wireframe") {
    const hingeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6);
    const hingeMat = makeMaterial(mode, 0x666666, { color: 0x777777, roughness: 0.3, metalness: 0.7 });
    const hinge1 = new THREE.Mesh(hingeGeo, hingeMat);
    hinge1.position.set(-0.52, 0.25, 0.025);
    doorGroup.add(hinge1);
    const hinge2 = new THREE.Mesh(hingeGeo, hingeMat);
    hinge2.position.set(-0.52, -0.25, 0.025);
    doorGroup.add(hinge2);
  }

  // Door handle
  const handleGeo = new THREE.BoxGeometry(0.04, 0.3, 0.06);
  const handleMat = makeMaterial(mode, wc, { color: 0x999999, roughness: 0.15, metalness: 0.7 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(0.45, 0, 0.06);
  doorGroup.add(handle);

  // IMP #10: Door latch button (small circle on handle area)
  if (mode !== "wireframe") {
    const latchGeo = new THREE.CircleGeometry(0.035, 8);
    const latchMat = makeMaterial(mode, 0x666666, { color: 0x777777, roughness: 0.2, metalness: 0.6 });
    const latch = new THREE.Mesh(latchGeo, latchMat);
    latch.position.set(0.45, 0.17, 0.095);
    doorGroup.add(latch);
  }

  doorGroup.position.set(-0.2, 0.45, 0.48);
  mwGroup.add(doorGroup);

  // Control panel (right side of front)
  let displayMat: THREE.MeshStandardMaterial | null = null;
  if (mode !== "wireframe") {
    const panelGeo = new THREE.PlaneGeometry(0.25, 0.7);
    const panelMat = makeMaterial(mode, wc, { color: 0x1a1a1a, roughness: 0.9 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.58, 0.45, 0.505);
    mwGroup.add(panel);

    // IMP #11: Improved buttons with labels (Start, Stop, +30s, Power)
    const btnGeo = new THREE.CircleGeometry(0.03, 8);
    const btnColors = [0x00ff00, 0xff2222, 0x00aaff, 0xffaa00];
    for (let i = 0; i < 4; i++) {
      const btnMat = new THREE.MeshStandardMaterial({
        color: btnColors[i], emissive: btnColors[i], emissiveIntensity: 0.3,
      });
      const btn = new THREE.Mesh(btnGeo, btnMat);
      btn.position.set(0.58, 0.62 - i * 0.1, 0.506);
      mwGroup.add(btn);
    }

    // IMP #12: Digital countdown display - updates during cooking
    const dGeo = new THREE.PlaneGeometry(0.2, 0.07);
    displayMat = new THREE.MeshStandardMaterial({
      color: 0x002200, emissive: 0x00ff00, emissiveIntensity: 0.4,
    });
    const display = new THREE.Mesh(dGeo, displayMat);
    display.position.set(0.58, 0.78, 0.506);
    mwGroup.add(display);

    // IMP #13: Brand badge (small metallic rectangle)
    const badgeGeo = new THREE.PlaneGeometry(0.15, 0.025);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x888888, roughness: 0.1, metalness: 0.9,
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0.58, 0.2, 0.506);
    mwGroup.add(badge);
  }

  // Interior rotating plate (glass plate with raised ring)
  const plateGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16);
  const plateMat = makeMaterial(mode, 0xdddddd, { color: 0xeeeeee, roughness: 0.2, metalness: 0.1 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(-0.05, 0.08, 0);
  mwGroup.add(plate);

  // IMP #14: Plate roller ring
  if (mode !== "wireframe") {
    const ringGeo = new THREE.TorusGeometry(0.2, 0.01, 6, 16);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = makeMaterial(mode, 0x999999, { color: 0xaaaaaa, roughness: 0.3, metalness: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(-0.05, 0.04, 0);
    mwGroup.add(ring);
  }

  // Interior light
  let interiorLight: THREE.PointLight | null = null;
  if (isDetailed) {
    interiorLight = new THREE.PointLight(0xffcc44, 0, 3, 2);
    interiorLight.position.set(-0.05, 0.65, 0);
    mwGroup.add(interiorLight);
  }

  // IMP #15: Steam particle system (activated after cooking)
  let steamParticles: THREE.Points | null = null;
  let steamVelocities: Float32Array | null = null;
  let steamActive = false;
  let steamTimer = 0;
  const STEAM_COUNT = 24;
  const STEAM_DURATION = 2.5;

  if (isHighEnd) {
    const steamGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(STEAM_COUNT * 3);
    steamVelocities = new Float32Array(STEAM_COUNT * 3);
    for (let i = 0; i < STEAM_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      positions[i * 3 + 2] = 0.5;
      steamVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
      steamVelocities[i * 3 + 1] = 0.5 + Math.random() * 0.8;
      steamVelocities[i * 3 + 2] = 0.1 + Math.random() * 0.2;
    }
    steamGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.4, depthWrite: false,
    });
    steamParticles = new THREE.Points(steamGeo, steamMat);
    steamParticles.visible = false;
    mwGroup.add(steamParticles);
  }

  // Ding flash mesh (bright ring that appears briefly when cooking finishes)
  let dingFlash: THREE.Mesh | null = null;
  let dingTimer = 0;
  if (isDetailed) {
    const dingGeo = new THREE.RingGeometry(0.35, 0.42, 16);
    const dingMat = new THREE.MeshBasicMaterial({
      color: 0xffff00, transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    dingFlash = new THREE.Mesh(dingGeo, dingMat);
    dingFlash.position.set(-0.05, 0.45, 0.52);
    mwGroup.add(dingFlash);
  }

  group.add(mwGroup);
  group.position.set(MW_X, 0, MW_Z);
  scene.add(group);

  // ---- Animation state ----
  let cooking = false;
  let cookTimer = 0;
  let cookCallback: (() => void) | null = null;
  let doorOpen = false;
  let doorAngle = 0;
  const DOOR_OPEN_ANGLE = -Math.PI * 0.4;
  const COOK_DURATION = 5.0;

  const controller: MicrowaveController = {
    group,
    isCooking: false,
    interiorLight,
    worldPosition: new THREE.Vector3(MW_X, COUNTER_H + 0.55, MW_Z),
    cookTimeRemaining: 0,

    startCooking(onDone: () => void) {
      if (cooking) return;
      cooking = true;
      controller.isCooking = true;
      cookTimer = 0;
      cookCallback = onDone;
      doorOpen = false;
      if (interiorLight) interiorLight.intensity = 1.5;
      // Update display to cooking color
      if (displayMat) {
        displayMat.emissive.setHex(0x00ff00);
        displayMat.emissiveIntensity = 0.8;
      }
    },

    openDoor() {
      if (cooking) return;
      doorOpen = true;
    },

    closeDoor() {
      doorOpen = false;
    },
  };

  const update = (dt: number, _elapsed: number) => {
    // Animate door open/close
    const targetAngle = doorOpen ? DOOR_OPEN_ANGLE : 0;
    doorAngle += (targetAngle - doorAngle) * Math.min(1, dt * 8);
    doorGroup.rotation.y = doorAngle;

    // Cooking animation
    if (cooking) {
      cookTimer += dt;
      const remaining = Math.max(0, COOK_DURATION - cookTimer);
      controller.cookTimeRemaining = remaining;

      // Spin plate (accelerating then decelerating)
      const progress = cookTimer / COOK_DURATION;
      const spinSpeed = progress < 0.1 ? progress * 30 : progress > 0.9 ? (1 - progress) * 30 : 3;
      plate.rotation.y += dt * spinSpeed;

      // Pulsing interior light
      if (interiorLight) {
        interiorLight.intensity = 1.2 + Math.sin(cookTimer * 8) * 0.3;
      }

      // Window glow (orange during cooking)
      if (windowMat) {
        const glow = 0.3 + Math.sin(cookTimer * 6) * 0.15;
        windowMat.emissive = windowMat.emissive || new THREE.Color();
        windowMat.emissive.setHex(0xff6600);
        windowMat.emissiveIntensity = glow;
      }

      // Display countdown pulse
      if (displayMat) {
        displayMat.emissiveIntensity = 0.5 + Math.sin(cookTimer * 4) * 0.3;
      }

      // Done cooking
      if (cookTimer >= COOK_DURATION) {
        cooking = false;
        controller.isCooking = false;
        controller.cookTimeRemaining = 0;
        if (interiorLight) interiorLight.intensity = 0;
        if (windowMat) {
          windowMat.emissive?.setHex(0x000000);
          windowMat.emissiveIntensity = 0;
        }
        if (displayMat) {
          displayMat.emissive.setHex(0x00ff00);
          displayMat.emissiveIntensity = 0.4;
        }
        doorOpen = true; // pop open when done

        // Activate steam
        if (steamParticles && steamVelocities) {
          steamActive = true;
          steamTimer = 0;
          steamParticles.visible = true;
          // Reset particle positions
          const pos = steamParticles.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < STEAM_COUNT; i++) {
            pos.setXYZ(i, (Math.random() - 0.5) * 0.4, 0.9, 0.5);
            steamVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
            steamVelocities[i * 3 + 1] = 0.5 + Math.random() * 0.8;
            steamVelocities[i * 3 + 2] = 0.1 + Math.random() * 0.2;
          }
          pos.needsUpdate = true;
        }

        // Trigger ding flash
        if (dingFlash) {
          dingTimer = 0.6;
        }

        cookCallback?.();
        cookCallback = null;
      }
    }

    // Steam particle animation
    if (steamActive && steamParticles && steamVelocities) {
      steamTimer += dt;
      const pos = steamParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < STEAM_COUNT; i++) {
        const x = pos.getX(i) + steamVelocities[i * 3] * dt;
        const y = pos.getY(i) + steamVelocities[i * 3 + 1] * dt;
        const z = pos.getZ(i) + steamVelocities[i * 3 + 2] * dt;
        pos.setXYZ(i, x, y, z);
        // Slow down over time
        steamVelocities[i * 3 + 1] *= 0.98;
      }
      pos.needsUpdate = true;
      // Fade out
      const mat = steamParticles.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 0.4 * (1 - steamTimer / STEAM_DURATION));

      if (steamTimer >= STEAM_DURATION) {
        steamActive = false;
        steamParticles.visible = false;
      }
    }

    // Ding flash animation
    if (dingFlash && dingTimer > 0) {
      dingTimer -= dt;
      const dMat = dingFlash.material as THREE.MeshBasicMaterial;
      dMat.opacity = Math.max(0, dingTimer / 0.6) * 0.9;
      dingFlash.scale.setScalar(1 + (0.6 - dingTimer) * 2);
    }
  };

  return {
    meshes: [group],
    lights: interiorLight ? [interiorLight] : [],
    update,
    controller,
    dispose: () => {
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
