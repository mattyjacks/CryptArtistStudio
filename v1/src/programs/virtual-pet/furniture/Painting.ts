// ============================================================================
// Virtual Pet Room - Painting (wall-mounted painting with interactive features)
// Ornate frame with corner decorations, nameplate, shimmer effect, canvas
// texture overlay, shadow beneath, dust motes, spotlight warm-up, gilding
// ============================================================================

import * as THREE from "three";
import {
  type FurnitureContext,
  type FurnitureResult,
  makeMaterial,
  configureShadows,
  disposeMeshTree,
  ROOM_D,
} from "./room-types";

const PAINT_X = 0;
const PAINT_Y = 4.5;
const PAINT_Z = -ROOM_D / 2 + 0.08;

const FRAME_W = 3.5;
const FRAME_H = 2.8;
const FRAME_DEPTH = 0.15;
const CANVAS_W = FRAME_W - 0.3;
const CANVAS_H = FRAME_H - 0.3;

export interface PaintingController {
  group: THREE.Group;
  setImage: (url: string) => void;
  getImageUrl: () => string;
  canvasMesh: THREE.Mesh;
  worldPosition: THREE.Vector3;
}

export function createPainting(
  ctx: FurnitureContext,
  initialImageUrl: string,
): FurnitureResult & { controller: PaintingController } {
  const { scene, mode } = ctx;
  const group = new THREE.Group();
  group.name = "painting";
  const isDetailed = mode !== "wireframe" && mode !== "basic";
  const isHighEnd = mode === "great" || mode === "epic";

  let currentImageUrl = initialImageUrl;

  // IMP #16: Slight random tilt for character
  const tiltAngle = (Math.random() - 0.5) * 0.03;
  group.rotation.z = tiltAngle;

  // ---- Frame ----
  const frameMat = makeMaterial(mode, 0xccaa44, {
    color: 0xb8860b,
    roughness: 0.45,
    metalness: 0.35,
  });

  // IMP #17: Frame with outer molding profile (two-layer frame for depth)
  // Outer frame
  const topFrameGeo = new THREE.BoxGeometry(FRAME_W, 0.15, FRAME_DEPTH);
  const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
  topFrame.position.set(0, FRAME_H / 2 - 0.075, 0);
  configureShadows(topFrame, mode);
  group.add(topFrame);

  const botFrame = new THREE.Mesh(topFrameGeo, frameMat);
  botFrame.position.set(0, -FRAME_H / 2 + 0.075, 0);
  configureShadows(botFrame, mode);
  group.add(botFrame);

  const sideFrameGeo = new THREE.BoxGeometry(0.15, FRAME_H, FRAME_DEPTH);
  const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
  leftFrame.position.set(-FRAME_W / 2 + 0.075, 0, 0);
  configureShadows(leftFrame, mode);
  group.add(leftFrame);

  const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
  rightFrame.position.set(FRAME_W / 2 - 0.075, 0, 0);
  configureShadows(rightFrame, mode);
  group.add(rightFrame);

  // Outer molding lip (raised ridge on front of frame)
  if (mode !== "wireframe") {
    const lipMat = makeMaterial(mode, 0xddbb55, { color: 0xc8a030, roughness: 0.3, metalness: 0.5 });
    const lipTop = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.06, 0.04, 0.04), lipMat);
    lipTop.position.set(0, FRAME_H / 2 + 0.005, FRAME_DEPTH / 2 + 0.02);
    group.add(lipTop);
    const lipBot = lipTop.clone();
    lipBot.position.y = -FRAME_H / 2 - 0.005;
    group.add(lipBot);
    const lipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, FRAME_H + 0.06, 0.04), lipMat);
    lipLeft.position.set(-FRAME_W / 2 - 0.005, 0, FRAME_DEPTH / 2 + 0.02);
    group.add(lipLeft);
    const lipRight = lipLeft.clone();
    lipRight.position.x = FRAME_W / 2 + 0.005;
    group.add(lipRight);
  }

  // Inner bevel (gold highlight)
  if (mode !== "wireframe") {
    const bevelMat = makeMaterial(mode, 0xddbb55, {
      color: 0xdaa520, roughness: 0.3, metalness: 0.5,
    });
    const bevelW = 0.06;
    const tibGeo = new THREE.BoxGeometry(CANVAS_W + bevelW * 2, bevelW, FRAME_DEPTH + 0.01);
    const tib = new THREE.Mesh(tibGeo, bevelMat);
    tib.position.set(0, CANVAS_H / 2 + bevelW / 2, 0.005);
    group.add(tib);
    const bib = new THREE.Mesh(tibGeo, bevelMat);
    bib.position.set(0, -CANVAS_H / 2 - bevelW / 2, 0.005);
    group.add(bib);
    const libGeo = new THREE.BoxGeometry(bevelW, CANVAS_H, FRAME_DEPTH + 0.01);
    const lib = new THREE.Mesh(libGeo, bevelMat);
    lib.position.set(-CANVAS_W / 2 - bevelW / 2, 0, 0.005);
    group.add(lib);
    const rib = new THREE.Mesh(libGeo, bevelMat);
    rib.position.set(CANVAS_W / 2 + bevelW / 2, 0, 0.005);
    group.add(rib);
  }

  // IMP #18: Ornate corner decorations (4 corner rosettes)
  if (isDetailed) {
    const cornerMat = makeMaterial(mode, 0xeedd66, {
      color: 0xdaa520, roughness: 0.25, metalness: 0.6,
    });
    const cornerGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const cornerPositions = [
      [-FRAME_W / 2 + 0.075, FRAME_H / 2 - 0.075],
      [FRAME_W / 2 - 0.075, FRAME_H / 2 - 0.075],
      [-FRAME_W / 2 + 0.075, -FRAME_H / 2 + 0.075],
      [FRAME_W / 2 - 0.075, -FRAME_H / 2 + 0.075],
    ];
    for (const [cx, cy] of cornerPositions) {
      const corner = new THREE.Mesh(cornerGeo, cornerMat);
      corner.position.set(cx, cy, FRAME_DEPTH / 2 + 0.02);
      corner.scale.set(1, 1, 0.5);
      group.add(corner);
    }

    // IMP #19: Frame gilding highlights (subtle gold streaks on frame)
    const gildGeo = new THREE.PlaneGeometry(0.03, FRAME_H * 0.6);
    const gildMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.3,
    });
    const gildL = new THREE.Mesh(gildGeo, gildMat);
    gildL.position.set(-FRAME_W / 2 + 0.1, 0, FRAME_DEPTH / 2 + 0.008);
    group.add(gildL);
    const gildR = gildL.clone();
    gildR.position.x = FRAME_W / 2 - 0.1;
    group.add(gildR);
  }

  // ---- Canvas with image texture ----
  const canvasGeo = new THREE.PlaneGeometry(CANVAS_W, CANVAS_H);
  let canvasMat: THREE.Material;

  if (mode === "wireframe") {
    canvasMat = new THREE.MeshBasicMaterial({ color: 0xccaa44, wireframe: true });
  } else {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(initialImageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    canvasMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.0,
    });
  }

  const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  canvasMesh.position.set(0, 0, FRAME_DEPTH / 2 + 0.001);
  canvasMesh.name = "painting-canvas";
  group.add(canvasMesh);

  // IMP #20: Canvas texture overlay (fabric weave effect - subtle grid)
  if (isDetailed) {
    const weaveGeo = new THREE.PlaneGeometry(CANVAS_W, CANVAS_H, 32, 24);
    const weaveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      transparent: true,
      opacity: 0.04,
      wireframe: true,
    });
    const weave = new THREE.Mesh(weaveGeo, weaveMat);
    weave.position.set(0, 0, FRAME_DEPTH / 2 + 0.003);
    group.add(weave);
  }

  // Back panel
  const backGeo = new THREE.PlaneGeometry(CANVAS_W, CANVAS_H);
  const backMat = makeMaterial(mode, 0x333333, { color: 0x2a2a2a, roughness: 0.9 });
  const backPanel = new THREE.Mesh(backGeo, backMat);
  backPanel.position.set(0, 0, -FRAME_DEPTH / 2);
  backPanel.rotation.y = Math.PI;
  group.add(backPanel);

  // Hanging wire
  if (isDetailed) {
    const wireGeo = new THREE.TorusGeometry(0.15, 0.01, 8, 12, Math.PI);
    const wireMat = makeMaterial(mode, 0x888888, { color: 0x666666, roughness: 0.4, metalness: 0.8 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(0, FRAME_H / 2 + 0.05, -FRAME_DEPTH / 2);
    wire.rotation.x = Math.PI;
    group.add(wire);

    // IMP #21: Hanging nail (small cylinder above painting)
    const nailGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6);
    const nailMat = makeMaterial(mode, 0x888888, { color: 0x777777, roughness: 0.3, metalness: 0.9 });
    const nail = new THREE.Mesh(nailGeo, nailMat);
    nail.position.set(0, FRAME_H / 2 + 0.2, -FRAME_DEPTH / 2 - 0.03);
    nail.rotation.x = Math.PI / 2;
    group.add(nail);
  }

  // IMP #22: Shadow beneath frame (dark ellipse on wall below painting)
  if (mode !== "wireframe") {
    const shadowGeo = new THREE.PlaneGeometry(FRAME_W * 1.1, 0.15);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.15,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0, -FRAME_H / 2 - 0.12, 0.002);
    group.add(shadow);
  }

  // IMP #23: Nameplate below frame (brass plate with painting title)
  let nameplateMesh: THREE.Mesh | null = null;
  if (mode !== "wireframe") {
    const npGeo = new THREE.BoxGeometry(1.2, 0.18, 0.02);
    const npMat = makeMaterial(mode, 0xccaa44, {
      color: 0xc8a838, roughness: 0.2, metalness: 0.7,
    });
    nameplateMesh = new THREE.Mesh(npGeo, npMat);
    nameplateMesh.position.set(0, -FRAME_H / 2 - 0.25, FRAME_DEPTH / 2);
    group.add(nameplateMesh);

    // Nameplate border (thin dark outline)
    const npBorderGeo = new THREE.BoxGeometry(1.24, 0.22, 0.015);
    const npBorderMat = makeMaterial(mode, 0x886622, {
      color: 0x8b7025, roughness: 0.4, metalness: 0.5,
    });
    const npBorder = new THREE.Mesh(npBorderGeo, npBorderMat);
    npBorder.position.set(0, -FRAME_H / 2 - 0.25, FRAME_DEPTH / 2 - 0.005);
    group.add(npBorder);
  }

  // Museum-style spotlight with warm-up
  let paintingSpot: THREE.SpotLight | null = null;
  let spotWarmup = 0;
  if (isDetailed) {
    paintingSpot = new THREE.SpotLight(0xfff5e0, 0, 6, Math.PI / 6, 0.5, 1);
    paintingSpot.position.set(0, 3, 2);
    paintingSpot.target.position.set(PAINT_X, PAINT_Y, PAINT_Z);
    group.add(paintingSpot);
    group.add(paintingSpot.target);

    // IMP #24: Spotlight fixture (small cylinder above painting)
    const fixtureGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8);
    const fixtureMat = makeMaterial(mode, 0x333333, { color: 0x2a2a2a, roughness: 0.3, metalness: 0.7 });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(0, 3, 2);
    fixture.rotation.x = Math.PI / 4;
    group.add(fixture);
  }

  // IMP #25: Shimmer/sparkle particles (floating near painting, value-dependent)
  let shimmerParticles: THREE.Points | null = null;
  const SHIMMER_COUNT = 12;
  if (isHighEnd) {
    const shimmerGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(SHIMMER_COUNT * 3);
    for (let i = 0; i < SHIMMER_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * FRAME_W * 0.8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * FRAME_H * 0.8;
      pos[i * 3 + 2] = FRAME_DEPTH / 2 + 0.05 + Math.random() * 0.3;
    }
    shimmerGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const shimmerMat = new THREE.PointsMaterial({
      color: 0xffd700, size: 0.04, transparent: true, opacity: 0.6, depthWrite: false,
    });
    shimmerParticles = new THREE.Points(shimmerGeo, shimmerMat);
    group.add(shimmerParticles);
  }

  // IMP #26: Dust motes floating near painting (ambient detail)
  let dustParticles: THREE.Points | null = null;
  const DUST_COUNT = 16;
  if (isHighEnd) {
    const dustGeo = new THREE.BufferGeometry();
    const dPos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * FRAME_W * 1.5;
      dPos[i * 3 + 1] = (Math.random() - 0.5) * FRAME_H * 1.5;
      dPos[i * 3 + 2] = 0.2 + Math.random() * 1.5;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.02, transparent: true, opacity: 0.2, depthWrite: false,
    });
    dustParticles = new THREE.Points(dustGeo, dustMat);
    group.add(dustParticles);
  }

  // Position on back wall
  group.position.set(PAINT_X, PAINT_Y, PAINT_Z);
  scene.add(group);

  // ---- Controller ----
  const controller: PaintingController = {
    group,
    canvasMesh,
    worldPosition: new THREE.Vector3(PAINT_X, PAINT_Y, PAINT_Z),

    setImage(url: string) {
      currentImageUrl = url;
      if (mode === "wireframe") return;
      const loader = new THREE.TextureLoader();
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = canvasMesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = tex;
      mat.needsUpdate = true;
    },

    getImageUrl() {
      return currentImageUrl;
    },
  };

  // ---- Update function ----
  const update = (_dt: number, elapsed: number) => {
    // IMP #27: Spotlight warm-up (fades in over 2 seconds)
    if (paintingSpot && spotWarmup < 1) {
      spotWarmup = Math.min(1, spotWarmup + _dt * 0.5);
      paintingSpot.intensity = spotWarmup * 0.6;
    }

    // Shimmer animation (subtle floating sparkles)
    if (shimmerParticles) {
      const sPos = shimmerParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SHIMMER_COUNT; i++) {
        const baseY = (Math.sin(elapsed * 0.3 + i * 1.7) * 0.5) * FRAME_H * 0.4;
        sPos.setY(i, baseY);
        sPos.setZ(i, FRAME_DEPTH / 2 + 0.05 + Math.sin(elapsed * 0.5 + i) * 0.15);
      }
      sPos.needsUpdate = true;
      const sMat = shimmerParticles.material as THREE.PointsMaterial;
      sMat.opacity = 0.3 + Math.sin(elapsed * 2) * 0.2;
    }

    // Dust mote drift
    if (dustParticles) {
      const dPos = dustParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < DUST_COUNT; i++) {
        const y = dPos.getY(i) + Math.sin(elapsed * 0.2 + i * 0.8) * 0.002;
        const x = dPos.getX(i) + Math.cos(elapsed * 0.15 + i * 1.2) * 0.001;
        dPos.setX(i, x);
        dPos.setY(i, y);
      }
      dPos.needsUpdate = true;
    }
  };

  return {
    meshes: [group],
    lights: paintingSpot ? [paintingSpot] : [],
    update,
    controller,
    dispose: () => {
      if (canvasMesh.material instanceof THREE.MeshStandardMaterial && canvasMesh.material.map) {
        canvasMesh.material.map.dispose();
      }
      disposeMeshTree(group);
      scene.remove(group);
    },
  };
}
