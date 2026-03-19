// ============================================================================
// Virtual Pet Room - Rug (circular, center of room, procedural pattern)
// Random pattern each load, or deterministic via seed
// ============================================================================

import * as THREE from "three";
import {
  type FurnitureContext,
  type FurnitureResult,
  WIREFRAME_COLORS,
  configureShadows,
  disposeMeshTree,
} from "./room-types";

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a procedural rug pattern as a canvas texture
function generateRugTexture(seed: number, size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx2d = canvas.getContext("2d")!;

  const rng = mulberry32(seed);

  // Choose a color palette (5-8 colors)
  const palettes = [
    ["#8B2252", "#C71585", "#FF69B4", "#FFB6C1", "#FFF0F5", "#4A0028"],
    ["#1B4332", "#2D6A4F", "#40916C", "#52B788", "#74C69D", "#D8F3DC"],
    ["#3A0CA3", "#4361EE", "#4CC9F0", "#7209B7", "#F72585", "#560BAD"],
    ["#6B2737", "#C44536", "#E8AE68", "#2E294E", "#772E25", "#8B6B4A"],
    ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51", "#1D3557"],
    ["#582F0E", "#7F4F24", "#936639", "#A68A64", "#B6AD90", "#C2C5AA"],
    ["#03071E", "#370617", "#6A040F", "#9D0208", "#D00000", "#E85D04"],
    ["#240046", "#3C096C", "#5A189A", "#7B2CBF", "#9D4EDD", "#C77DFF"],
  ];
  const palette = palettes[Math.floor(rng() * palettes.length)];

  // Fill background
  ctx2d.fillStyle = palette[0];
  ctx2d.fillRect(0, 0, size, size);

  // Draw concentric ring pattern
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2;
  const ringCount = 6 + Math.floor(rng() * 8);

  for (let i = ringCount; i >= 0; i--) {
    const r = (i / ringCount) * maxR;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
    ctx2d.fillStyle = palette[i % palette.length];
    ctx2d.fill();
  }

  // Add geometric pattern overlay
  const patternType = Math.floor(rng() * 4);

  if (patternType === 0) {
    // Radial lines
    const lineCount = 8 + Math.floor(rng() * 16);
    ctx2d.strokeStyle = palette[Math.floor(rng() * palette.length)];
    ctx2d.lineWidth = 2 + rng() * 4;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      ctx2d.beginPath();
      ctx2d.moveTo(cx, cy);
      ctx2d.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx2d.stroke();
    }
  } else if (patternType === 1) {
    // Diamond/zigzag rings
    for (let ring = 1; ring < ringCount; ring += 2) {
      const r = (ring / ringCount) * maxR;
      const points = 6 + Math.floor(rng() * 6);
      ctx2d.strokeStyle = palette[(ring + 2) % palette.length];
      ctx2d.lineWidth = 2 + rng() * 3;
      ctx2d.beginPath();
      for (let p = 0; p <= points; p++) {
        const angle = (p / points) * Math.PI * 2;
        const pr = r + (p % 2 === 0 ? r * 0.1 : -r * 0.1);
        const px = cx + Math.cos(angle) * pr;
        const py = cy + Math.sin(angle) * pr;
        if (p === 0) ctx2d.moveTo(px, py);
        else ctx2d.lineTo(px, py);
      }
      ctx2d.stroke();
    }
  } else if (patternType === 2) {
    // Dots pattern
    const dotCount = 30 + Math.floor(rng() * 50);
    for (let i = 0; i < dotCount; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * maxR * 0.9;
      const dotR = 3 + rng() * 8;
      ctx2d.beginPath();
      ctx2d.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, dotR, 0, Math.PI * 2);
      ctx2d.fillStyle = palette[Math.floor(rng() * palette.length)];
      ctx2d.fill();
    }
  } else {
    // Flower/petal pattern
    const petalCount = 5 + Math.floor(rng() * 4);
    ctx2d.fillStyle = palette[Math.floor(rng() * palette.length)];
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      ctx2d.beginPath();
      ctx2d.ellipse(
        cx + Math.cos(angle) * maxR * 0.3,
        cy + Math.sin(angle) * maxR * 0.3,
        maxR * 0.25,
        maxR * 0.12,
        angle,
        0,
        Math.PI * 2,
      );
      ctx2d.fill();
    }
    // Center medallion
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2);
    ctx2d.fillStyle = palette[palette.length - 1];
    ctx2d.fill();
  }

  // Border ring
  ctx2d.strokeStyle = palette[palette.length - 1];
  ctx2d.lineWidth = 6;
  ctx2d.beginPath();
  ctx2d.arc(cx, cy, maxR - 4, 0, Math.PI * 2);
  ctx2d.stroke();

  // Clip to circle
  const clipped = document.createElement("canvas");
  clipped.width = size;
  clipped.height = size;
  const cCtx = clipped.getContext("2d")!;
  cCtx.beginPath();
  cCtx.arc(cx, cy, maxR, 0, Math.PI * 2);
  cCtx.clip();
  cCtx.drawImage(canvas, 0, 0);

  const texture = new THREE.CanvasTexture(clipped);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRug(ctx: FurnitureContext): FurnitureResult {
  const { scene, mode } = ctx;

  // Determine seed
  const seed = ctx.rugSeed != null ? ctx.rugSeed : Math.floor(Math.random() * 999999);

  // Rug dimensions: 5ft diameter circle
  const rugRadius = 2.5;

  let rug: THREE.Mesh;
  const rugGeo = new THREE.CircleGeometry(rugRadius, 48);

  if (mode === "wireframe") {
    const rugMat = new THREE.MeshBasicMaterial({
      color: WIREFRAME_COLORS.rug,
      wireframe: true,
    });
    rug = new THREE.Mesh(rugGeo, rugMat);
  } else {
    const texture = generateRugTexture(seed);
    const rugMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.0,
    });
    rug = new THREE.Mesh(rugGeo, rugMat);
  }

  rug.name = "rug";
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.02, 1); // Center of room, slightly above floor
  configureShadows(rug, mode, false, true);

  scene.add(rug);

  return {
    meshes: [rug],
    dispose: () => {
      disposeMeshTree(rug);
      scene.remove(rug);
    },
  };
}
