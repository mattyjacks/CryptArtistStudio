// ============================================================================
// Virtual Pet Room - Day/Night Cycle System
// 1-hour cycle: minute 30 = noon (brightest), minute 0/60 = midnight (darkest)
// Realistic dawn/dusk colors based on New Hampshire USA latitude (~43N)
// ============================================================================

import * as THREE from "three";

// NH latitude for sunrise/sunset angle calculations
const NH_LATITUDE = 43.2;

// The cycle maps real minutes (0-59) to a virtual "time of day"
// minute 0 = midnight, minute 15 = dawn, minute 30 = noon, minute 45 = dusk

export interface DayNightState {
  // 0.0 = midnight, 0.5 = noon, 1.0 = back to midnight
  normalizedTime: number;
  // Sun intensity (0 at night, ~1 at noon)
  sunIntensity: number;
  // Ambient intensity (dim at night, brighter during day)
  ambientIntensity: number;
  // Sun color (warm orange at dawn/dusk, white at noon, blue-ish at night)
  sunColor: THREE.Color;
  // Ambient color
  ambientColor: THREE.Color;
  // Sky/fog color
  skyColor: THREE.Color;
  // Sun elevation angle (radians, 0 = horizon, PI/2 = zenith)
  sunElevation: number;
  // Sun azimuth angle (radians)
  sunAzimuth: number;
  // Window light multiplier (how much light comes through the window)
  windowLightMultiplier: number;
  // Is it "daytime" (for window view)
  isDaytime: boolean;
}

// Get the current month (0-11) for seasonal variation
function getCurrentMonth(): number {
  return new Date().getMonth();
}

// NH day length varies from ~9h (Dec) to ~15.5h (June)
// We map this to our 1-hour cycle proportionally
function getDayLengthFraction(): number {
  const month = getCurrentMonth();
  // Approximate day fraction for each month at NH latitude
  const dayFractions = [
    0.375, // Jan - ~9h
    0.400, // Feb - ~9.6h
    0.458, // Mar - ~11h
    0.521, // Apr - ~12.5h
    0.583, // May - ~14h
    0.625, // Jun - ~15h
    0.617, // Jul - ~14.8h
    0.567, // Aug - ~13.6h
    0.500, // Sep - ~12h
    0.438, // Oct - ~10.5h
    0.383, // Nov - ~9.2h
    0.363, // Dec - ~8.7h
  ];
  return dayFractions[month];
}

// Smooth hermite interpolation
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Calculate day/night state from the current real time
export function calculateDayNightState(): DayNightState {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Normalized time: 0 = midnight (min 0), 0.5 = noon (min 30), 1.0 = midnight again
  const minuteFraction = (minutes + seconds / 60) / 60;
  const normalizedTime = minuteFraction;

  // Day length based on season
  const dayFraction = getDayLengthFraction();
  const dawnStart = 0.5 - dayFraction / 2;    // When dawn begins
  const dawnEnd = dawnStart + 0.08;            // Dawn transition
  const duskStart = 0.5 + dayFraction / 2 - 0.08; // When dusk begins
  const duskEnd = 0.5 + dayFraction / 2;      // Full night

  // Sun intensity curve
  let sunIntensity: number;
  if (normalizedTime < dawnStart || normalizedTime > duskEnd) {
    // Night
    sunIntensity = 0.0;
  } else if (normalizedTime < dawnEnd) {
    // Dawn transition
    sunIntensity = smoothstep(dawnStart, dawnEnd, normalizedTime);
  } else if (normalizedTime > duskStart) {
    // Dusk transition
    sunIntensity = 1.0 - smoothstep(duskStart, duskEnd, normalizedTime);
  } else {
    // Daytime - slight curve peaking at noon
    const dayProgress = (normalizedTime - dawnEnd) / (duskStart - dawnEnd);
    sunIntensity = 0.7 + 0.3 * Math.sin(dayProgress * Math.PI);
  }

  // Sun elevation: peaks at noon
  const noonDistance = Math.abs(normalizedTime - 0.5);
  const maxElevation = (90 - NH_LATITUDE + 23.5 * Math.cos((getCurrentMonth() - 5) * Math.PI / 6)) * Math.PI / 180;
  const sunElevation = Math.max(0, maxElevation * (1 - noonDistance * 4));

  // Sun azimuth: east at dawn, south at noon, west at dusk
  const sunAzimuth = (normalizedTime - 0.25) * Math.PI * 2;

  // Color interpolation
  const sunColor = new THREE.Color();
  const ambientColor = new THREE.Color();
  const skyColor = new THREE.Color();

  if (sunIntensity <= 0.01) {
    // Night
    sunColor.setRGB(0.1, 0.1, 0.2);
    ambientColor.setRGB(0.05, 0.05, 0.12);
    skyColor.setRGB(0.02, 0.02, 0.06);
  } else if (sunIntensity < 0.4) {
    // Dawn/dusk - warm oranges and pinks
    const t = sunIntensity / 0.4;
    sunColor.setRGB(
      0.1 + 0.9 * t,
      0.1 + 0.3 * t,
      0.2 + 0.05 * t,
    );
    ambientColor.setRGB(
      0.05 + 0.2 * t,
      0.05 + 0.12 * t,
      0.12 + 0.05 * t,
    );
    skyColor.setRGB(
      0.02 + 0.35 * t,
      0.02 + 0.15 * t,
      0.06 + 0.2 * t,
    );
  } else {
    // Daytime - interpolate from warm to white at noon
    const t = (sunIntensity - 0.4) / 0.6;
    sunColor.setRGB(
      1.0,
      0.4 + 0.55 * t,
      0.25 + 0.7 * t,
    );
    ambientColor.setRGB(
      0.25 + 0.15 * t,
      0.17 + 0.18 * t,
      0.17 + 0.18 * t,
    );
    skyColor.setRGB(
      0.37 + 0.15 * t,
      0.17 + 0.35 * t,
      0.26 + 0.45 * t,
    );
  }

  const ambientIntensity = 0.15 + sunIntensity * 0.5;
  const windowLightMultiplier = sunIntensity;
  const isDaytime = sunIntensity > 0.1;

  return {
    normalizedTime,
    sunIntensity,
    ambientIntensity,
    sunColor,
    ambientColor,
    skyColor,
    sunElevation,
    sunAzimuth,
    windowLightMultiplier,
    isDaytime,
  };
}

// Apply day/night state to scene lights
export function applyDayNightToScene(
  state: DayNightState,
  sunLight: THREE.DirectionalLight,
  ambientLight: THREE.AmbientLight,
  scene: THREE.Scene,
): void {
  // Update sun
  sunLight.color.copy(state.sunColor);
  sunLight.intensity = state.sunIntensity * 1.2;

  // Position sun based on elevation and azimuth
  const dist = 15;
  sunLight.position.set(
    Math.cos(state.sunAzimuth) * Math.cos(state.sunElevation) * dist,
    Math.sin(state.sunElevation) * dist,
    Math.sin(state.sunAzimuth) * Math.cos(state.sunElevation) * dist,
  );
  sunLight.target.position.set(0, 0, 0);

  // Update ambient
  ambientLight.color.copy(state.ambientColor);
  ambientLight.intensity = state.ambientIntensity;

  // Update scene background and fog
  scene.background = state.skyColor.clone().multiplyScalar(0.3);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(state.skyColor).multiplyScalar(0.3);
  }
}
