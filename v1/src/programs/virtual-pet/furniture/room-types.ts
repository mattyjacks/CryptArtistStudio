// ============================================================================
// Virtual Pet Room - Shared Types & Constants
// ============================================================================

import * as THREE from "three";

// Pet is 1ft x 1ft x 1ft cube. Furniture is human-sized.
// 1 Three.js unit = 1 foot
export const PET_SIZE = 1; // 1 foot cube

// Room dimensions (in feet)
export const ROOM_W = 16;
export const ROOM_D = 12;
export const ROOM_H = 8; // raised ceiling for human-sized furniture

// Graphics quality modes
export type GraphicsMode = "wireframe" | "basic" | "okay" | "good" | "great" | "epic";

export const GRAPHICS_MODE_LABELS: Record<GraphicsMode, string> = {
  wireframe: "Wireframe",
  basic: "Basic",
  okay: "Okay",
  good: "Good",
  great: "Great",
  epic: "Epic",
};

export const GRAPHICS_MODE_ORDER: GraphicsMode[] = [
  "wireframe", "basic", "okay", "good", "great", "epic",
];

// Furniture creation context passed to each furniture builder
export interface FurnitureContext {
  scene: THREE.Scene;
  mode: GraphicsMode;
  // Optional rug seed for deterministic pattern
  rugSeed?: number | null;
}

// Each furniture builder returns this so the room can track/update them
export interface FurnitureResult {
  /** All meshes belonging to this furniture piece */
  meshes: THREE.Object3D[];
  /** Optional lights created by this furniture */
  lights?: THREE.Light[];
  /** Optional per-frame update (e.g. lamp flicker, window day/night) */
  update?: (dt: number, elapsed: number) => void;
  /** Cleanup / dispose */
  dispose: () => void;
}

// Color palette per furniture piece for wireframe mode
export const WIREFRAME_COLORS: Record<string, number> = {
  bed: 0xff69b4,
  shelf: 0x8b6914,
  fridge: 0x88ccff,
  lamp: 0xffdd55,
  plant: 0x22cc44,
  scratchingPad: 0xcc8844,
  computer: 0x44aaff,
  window: 0xaaddff,
  rug: 0xcc44aa,
  table: 0xbb8833,
  litterBox: 0x998877,
  sink: 0x66bbcc,
  ball: 0x44cc44,
};

// Helper: create a material respecting graphics mode
export function makeMaterial(
  mode: GraphicsMode,
  wireColor: number,
  opts: THREE.MeshStandardMaterialParameters,
): THREE.Material {
  if (mode === "wireframe") {
    return new THREE.MeshBasicMaterial({
      color: wireColor,
      wireframe: true,
      wireframeLinewidth: 2,
    });
  }
  return new THREE.MeshStandardMaterial(opts);
}

// Helper: configure shadow casting based on graphics mode
export function configureShadows(
  mesh: THREE.Mesh,
  mode: GraphicsMode,
  cast = true,
  receive = true,
): void {
  const hasShadows = mode !== "wireframe" && mode !== "basic";
  mesh.castShadow = hasShadows && cast;
  mesh.receiveShadow = hasShadows && receive;
}

// Helper: add mesh to scene and return it
export function addToScene(
  scene: THREE.Scene,
  mesh: THREE.Object3D,
): THREE.Object3D {
  scene.add(mesh);
  return mesh;
}

// Helper: dispose all geometries and materials in a mesh tree
export function disposeMeshTree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m: THREE.Material) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
}
