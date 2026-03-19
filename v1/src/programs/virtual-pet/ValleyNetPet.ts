import * as THREE from "three";

// ---- Constants ----
const BODY_SIZE = 0.8;
const BODY_COLOR = 0xffb6c1; // light pink
const EAR_COLOR = 0xff8fa3;
const EAR_INNER_COLOR = 0xff6b8a;
const TAIL_SEGMENTS = 12;
const TAIL_SEG_LEN = 0.15;
const TAIL_WIDTH = 0.12;
const TAIL_HEIGHT = 0.12;
const TAIL_SPRING = 0.08; // Further reduced for stability during turns
const TAIL_DAMPING = 0.91; // Increased damping to prevent oscillation
const TAIL_GRAVITY = 0.002; // Reduced gravity
const RAGDOLL_DAMPING = 0.92;
const TAIL_ANCHOR_DAMPING = 0.95; // Smooth anchor following

export interface ValleyNetController {
  group: THREE.Group;
  tailMeshes: THREE.Mesh[];
  tailPositions: THREE.Vector3[];
  tailVelocities: THREE.Vector3[];
  tailTipMesh: THREE.Mesh;
  isRagdoll: boolean;
  ragdollVelocity: THREE.Vector3;
  idleTimer: number;
  collisionBodies: THREE.Mesh[]; // For collision detection
  tailAnchorSmoothed?: THREE.Vector3; // For smooth tail anchor during turns
  update: (dt: number, time: number) => void;
  getTailTipWorldPos: () => THREE.Vector3;
  setRagdoll: (on: boolean) => void;
  applyRagdollForce: (worldPos: THREE.Vector3) => void;
  setCollisionBodies: (bodies: THREE.Mesh[]) => void;
}

export function createValleyNetPet(
  scene: THREE.Scene,
  imageUrl: string,
): ValleyNetController {
  const group = new THREE.Group();
  scene.add(group);

  // ---- Body: light pink cube ----
  const bodyGeo = new THREE.BoxGeometry(BODY_SIZE, BODY_SIZE, BODY_SIZE);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: BODY_COLOR,
    roughness: 0.35,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = BODY_SIZE / 2;
  body.userData = { isPet: true };
  group.add(body);

  // Whiskers (3 per side) - emanate from front face near nose, fan outward ----
  const whiskerMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
  const noseZ = BODY_SIZE / 2 + 0.03;
  const noseY = BODY_SIZE * 0.55;
  const whiskerLength = 0.4;
  const whiskerAngles = [-0.2, 0, 0.2]; // vertical spread (radians)
  const whiskerMeshes: THREE.Line[] = [];
  
  // Left whiskers
  for (let i = 0; i < 3; i++) {
    const angle = whiskerAngles[i];
    const points = [
      new THREE.Vector3(-0.08, noseY, noseZ),
      new THREE.Vector3(-whiskerLength, noseY + Math.sin(angle) * whiskerLength, noseZ + Math.cos(angle) * 0.15),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const whisker = new THREE.Line(geo, whiskerMat);
    whisker.userData = { isPet: true, side: "left", index: i };
    group.add(whisker);
    whiskerMeshes.push(whisker);
  }
  
  // Right whiskers
  for (let i = 0; i < 3; i++) {
    const angle = whiskerAngles[i];
    const points = [
      new THREE.Vector3(0.08, noseY, noseZ),
      new THREE.Vector3(whiskerLength, noseY + Math.sin(angle) * whiskerLength, noseZ + Math.cos(angle) * 0.15),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const whisker = new THREE.Line(geo, whiskerMat);
    whisker.userData = { isPet: true, side: "right", index: i };
    group.add(whisker);
    whiskerMeshes.push(whisker);
  }


  // ---- Cat ears ----
  const earGeo = new THREE.ConeGeometry(0.18, 0.32, 4);
  const earMat = new THREE.MeshStandardMaterial({ color: EAR_COLOR, roughness: 0.3 });
  const earInnerGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
  const earInnerMat = new THREE.MeshStandardMaterial({ color: EAR_INNER_COLOR, roughness: 0.3 });

  // Left ear
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.25, BODY_SIZE + 0.12, 0.05);
  leftEar.rotation.z = 0.15;
  leftEar.castShadow = true;
  leftEar.userData = { isPet: true };
  group.add(leftEar);
  const leftInner = new THREE.Mesh(earInnerGeo, earInnerMat);
  leftInner.position.set(-0.25, BODY_SIZE + 0.14, 0.08);
  leftInner.rotation.z = 0.15;
  leftInner.userData = { isPet: true };
  group.add(leftInner);

  // Right ear
  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.25, BODY_SIZE + 0.12, 0.05);
  rightEar.rotation.z = -0.15;
  rightEar.castShadow = true;
  rightEar.userData = { isPet: true };
  group.add(rightEar);
  const rightInner = new THREE.Mesh(earInnerGeo, earInnerMat);
  rightInner.position.set(0.25, BODY_SIZE + 0.14, 0.08);
  rightInner.rotation.z = -0.15;
  rightInner.userData = { isPet: true };
  group.add(rightInner);

  // ---- Eyes (cute dot eyes with shine highlights) ----
  const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.3 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.02);
  leftEye.userData = { isPet: true };
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.02);
  rightEye.userData = { isPet: true };
  group.add(rightEye);

  // Eye shine highlights (small white spheres)
  const shineGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftShine = new THREE.Mesh(shineGeo, shineMat);
  leftShine.position.set(-0.12, BODY_SIZE * 0.73, BODY_SIZE / 2 + 0.06);
  leftShine.userData = { isPet: true };
  group.add(leftShine);
  const rightShine = new THREE.Mesh(shineGeo, shineMat);
  rightShine.position.set(0.18, BODY_SIZE * 0.73, BODY_SIZE / 2 + 0.06);
  rightShine.userData = { isPet: true };
  group.add(rightShine);

  // Blink eyelids (flat planes that scale Y to cover eyes)
  const lidGeo = new THREE.PlaneGeometry(0.18, 0.18);
  const lidMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.35, side: THREE.DoubleSide });
  const leftLid = new THREE.Mesh(lidGeo, lidMat);
  leftLid.position.set(-0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.07);
  leftLid.scale.y = 0; // hidden by default
  leftLid.userData = { isPet: true };
  group.add(leftLid);
  const rightLid = new THREE.Mesh(lidGeo, lidMat);
  rightLid.position.set(0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.07);
  rightLid.scale.y = 0;
  rightLid.userData = { isPet: true };
  group.add(rightLid);

  // ---- Cute W-shaped mouth (two small arcs) ----
  const mouthCurve1 = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.08, BODY_SIZE * 0.44, BODY_SIZE / 2 + 0.04),
    new THREE.Vector3(-0.04, BODY_SIZE * 0.40, BODY_SIZE / 2 + 0.04),
    new THREE.Vector3(0.0, BODY_SIZE * 0.44, BODY_SIZE / 2 + 0.04),
  );
  const mouthCurve2 = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.0, BODY_SIZE * 0.44, BODY_SIZE / 2 + 0.04),
    new THREE.Vector3(0.04, BODY_SIZE * 0.40, BODY_SIZE / 2 + 0.04),
    new THREE.Vector3(0.08, BODY_SIZE * 0.44, BODY_SIZE / 2 + 0.04),
  );
  const mouthMat = new THREE.LineBasicMaterial({ color: 0x884466, linewidth: 2 });
  const mouth1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mouthCurve1.getPoints(8)), mouthMat);
  const mouth2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mouthCurve2.getPoints(8)), mouthMat);
  mouth1.userData = { isPet: true };
  mouth2.userData = { isPet: true };
  group.add(mouth1);
  group.add(mouth2);

  // ---- Small nose ----
  const noseGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff6b8a, roughness: 0.2 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, BODY_SIZE * 0.55, BODY_SIZE / 2 + 0.03);
  nose.scale.set(1.2, 0.8, 0.6);
  nose.userData = { isPet: true };
  group.add(nose);

  // ---- Eyebrows (tiny expressive lines above eyes) ----
  const browMat = new THREE.LineBasicMaterial({ color: 0x884466, linewidth: 2 });
  const leftBrowPts = [
    new THREE.Vector3(-0.22, BODY_SIZE * 0.82, BODY_SIZE / 2 + 0.05),
    new THREE.Vector3(-0.08, BODY_SIZE * 0.85, BODY_SIZE / 2 + 0.05),
  ];
  const rightBrowPts = [
    new THREE.Vector3(0.08, BODY_SIZE * 0.85, BODY_SIZE / 2 + 0.05),
    new THREE.Vector3(0.22, BODY_SIZE * 0.82, BODY_SIZE / 2 + 0.05),
  ];
  const leftBrow = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftBrowPts), browMat);
  const rightBrow = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightBrowPts), browMat);
  leftBrow.userData = { isPet: true };
  rightBrow.userData = { isPet: true };
  group.add(leftBrow);
  group.add(rightBrow);

  // ---- Tongue (small pink sphere that peeks out occasionally) ----
  const tongueGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff4477, roughness: 0.3 });
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0.02, BODY_SIZE * 0.38, BODY_SIZE / 2 + 0.04);
  tongue.scale.set(1.2, 0.6, 0.5);
  tongue.visible = false; // hidden by default, shows occasionally
  tongue.userData = { isPet: true };
  group.add(tongue);

  // ---- Cheek blush (translucent pink circles) ----
  const blushGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8faa, transparent: true, opacity: 0.25 });
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(-0.24, BODY_SIZE * 0.52, BODY_SIZE / 2 + 0.01);
  leftBlush.scale.set(1, 0.7, 0.3);
  leftBlush.userData = { isPet: true };
  group.add(leftBlush);
  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(0.24, BODY_SIZE * 0.52, BODY_SIZE / 2 + 0.01);
  rightBlush.scale.set(1, 0.7, 0.3);
  rightBlush.userData = { isPet: true };
  group.add(rightBlush);

  // ---- Feet (small cubes at bottom) ----
  const footGeo = new THREE.BoxGeometry(0.2, 0.1, 0.25);
  const footMat = new THREE.MeshStandardMaterial({ color: EAR_COLOR, roughness: 0.4 });
  const footPositions = [
    [-0.22, 0.05, 0.2],
    [0.22, 0.05, 0.2],
    [-0.22, 0.05, -0.2],
    [0.22, 0.05, -0.2],
  ];
  const feetMeshes: THREE.Mesh[] = [];
  for (const [fx, fy, fz] of footPositions) {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, fy, fz);
    foot.castShadow = true;
    foot.userData = { isPet: true, origY: fy, origX: fx };
    group.add(foot);
    feetMeshes.push(foot);

    // Paw pads on front feet only (positive Z = front)
    if (fz > 0) {
      const padGeo = new THREE.CircleGeometry(0.04, 8);
      const padMat = new THREE.MeshStandardMaterial({ color: 0xff6b8a, roughness: 0.2, side: THREE.DoubleSide });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(fx, 0.001, fz + 0.12);
      pad.rotation.x = -Math.PI / 2;
      pad.userData = { isPet: true };
      group.add(pad);
      // Two small toe pads
      for (const tx of [-0.04, 0.04]) {
        const toePad = new THREE.Mesh(new THREE.CircleGeometry(0.02, 6), padMat);
        toePad.position.set(fx + tx, 0.001, fz + 0.14);
        toePad.rotation.x = -Math.PI / 2;
        toePad.userData = { isPet: true };
        group.add(toePad);
      }
    }
  }

  // ---- Sparkle particles near tail tip ----
  const sparkleCount = 5;
  const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const sparkleGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const sparkles: THREE.Mesh[] = [];
  for (let si = 0; si < sparkleCount; si++) {
    const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat.clone());
    sparkle.userData = { isPet: true, sparklePhase: si * (Math.PI * 2 / sparkleCount) };
    sparkle.visible = false;
    scene.add(sparkle);
    sparkles.push(sparkle);
  }

  // ---- Shadow ----
  const shadowGeo = new THREE.CircleGeometry(0.6, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.2,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  // ---- Name label (gradient pill with heart) ----
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 320;
  labelCanvas.height = 80;
  const ctx = labelCanvas.getContext("2d")!;
  // Gradient background pill
  const grad = ctx.createLinearGradient(0, 0, 320, 0);
  grad.addColorStop(0, "rgba(255,182,193,0.75)");
  grad.addColorStop(1, "rgba(255,107,138,0.75)");
  ctx.fillStyle = grad;
  ctx.roundRect(8, 8, 304, 64, 32);
  ctx.fill();
  // Subtle border
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.roundRect(8, 8, 304, 64, 32);
  ctx.stroke();
  // Text with shadow
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Valley Net", 148, 50);
  // Heart emoji
  ctx.shadowBlur = 0;
  ctx.font = "22px Arial";
  ctx.fillText("\u2764", 256, 48);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelGeo = new THREE.PlaneGeometry(1.4, 0.35);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = BODY_SIZE + 0.55;
  group.add(label);

  // ---- Tail: chain of cubes with spring physics ----
  const tailPositions: THREE.Vector3[] = [];
  const tailVelocities: THREE.Vector3[] = [];
  const tailMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const t = i / (TAIL_SEGMENTS - 1);
    // Gradually taper width/height toward tip
    const taper = 1 - t * 0.3;
    const segGeo = new THREE.BoxGeometry(TAIL_WIDTH * taper, TAIL_HEIGHT * taper, TAIL_SEG_LEN);
    const segMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(BODY_COLOR).lerp(new THREE.Color(EAR_COLOR), t * 0.6),
      roughness: 0.35,
    });
    const seg = new THREE.Mesh(segGeo, segMat);
    seg.castShadow = true;
    seg.userData = { isTail: true, tailIndex: i };
    scene.add(seg); // Add to scene, not group - tail moves independently in world space

    const pos = new THREE.Vector3(0, BODY_SIZE * 0.5, -(BODY_SIZE / 2) - i * TAIL_SEG_LEN);
    tailPositions.push(pos);
    tailVelocities.push(new THREE.Vector3());
    tailMeshes.push(seg);
  }

  // Tail tip (bigger cube at end for easier grabbing, with glow)
  const tipGeo = new THREE.BoxGeometry(TAIL_WIDTH * 1.2, TAIL_HEIGHT * 1.2, TAIL_SEG_LEN * 1.1);
  const tipMat = new THREE.MeshStandardMaterial({ color: EAR_INNER_COLOR, roughness: 0.2, emissive: EAR_INNER_COLOR, emissiveIntensity: 0.15 });
  const tailTipMesh = new THREE.Mesh(tipGeo, tipMat);
  tailTipMesh.castShadow = true;
  tailTipMesh.userData = { isTail: true, isTailTip: true, tailIndex: TAIL_SEGMENTS - 1 };
  scene.add(tailTipMesh);

  // ---- Controller ----
  const controller: ValleyNetController = {
    group,
    tailMeshes,
    tailPositions,
    tailVelocities,
    tailTipMesh,
    isRagdoll: false,
    ragdollVelocity: new THREE.Vector3(),
    idleTimer: 0,
    collisionBodies: [],

    update(dt: number, time: number) {
      // ---- Idle animation: gentle bob + ear twitch + blink + breathing + nose wiggle ----
      if (!this.isRagdoll) {
        const bob = Math.sin(time * 2.5) * 0.04;
        body.position.y = BODY_SIZE / 2 + bob;

        // Breathing / purr animation (subtle scale pulse on body)
        const breathe = 1 + Math.sin(time * 1.8) * 0.015;
        body.scale.set(breathe, 1 + Math.sin(time * 1.8 + 0.3) * 0.01, breathe);

        // Ear twitch (asymmetric for charm) + ear perk on cycle
        const earPerkCycle = time % 12.0;
        const earPerk = (earPerkCycle > 9.0 && earPerkCycle < 10.5) ? Math.sin((earPerkCycle - 9.0) / 1.5 * Math.PI) * 0.15 : 0;
        const earTwitchL = Math.sin(time * 3.8) * 0.08 + Math.sin(time * 7.3) * 0.02;
        const earTwitchR = Math.sin(time * 4.2 + 0.5) * 0.08 + Math.sin(time * 6.8) * 0.02;
        leftEar.rotation.z = 0.15 + earTwitchL - earPerk;
        leftInner.rotation.z = 0.15 + earTwitchL - earPerk;
        rightEar.rotation.z = -0.15 - earTwitchR + earPerk;
        rightInner.rotation.z = -0.15 - earTwitchR + earPerk;
        // Ear scale pop during perk
        const earScaleBoost = 1 + earPerk * 0.3;
        leftEar.scale.setScalar(earScaleBoost);
        leftInner.scale.setScalar(earScaleBoost);
        rightEar.scale.setScalar(earScaleBoost);
        rightInner.scale.setScalar(earScaleBoost);

        // Gentle body sway + head tilt
        body.rotation.z = Math.sin(time * 1.5) * 0.03;
        body.rotation.x = Math.sin(time * 0.8) * 0.015; // subtle forward/back head tilt

        // Nose wiggle (tiny side-to-side + forward pulse)
        nose.position.x = Math.sin(time * 5.5) * 0.008;
        nose.position.z = BODY_SIZE / 2 + 0.03 + Math.sin(time * 3.2) * 0.005;

        // Eyebrow micro-expressions (subtle raise/lower)
        const browRaise = Math.sin(time * 2.1) * 0.01;
        leftBrow.position.y = BODY_SIZE * 0.82 + browRaise;
        rightBrow.position.y = BODY_SIZE * 0.82 + browRaise * 0.7; // asymmetric for charm

        // Tongue peek (shows briefly every ~8 seconds)
        const tongueCycle = time % 8.0;
        tongue.visible = tongueCycle > 5.5 && tongueCycle < 6.2;
        if (tongue.visible) {
          const tongueT = (tongueCycle - 5.5) / 0.7;
          tongue.position.y = BODY_SIZE * 0.38 - Math.sin(tongueT * Math.PI) * 0.02;
        }

        // Whisker twitch (subtle rotation oscillation)
        for (let wi = 0; wi < whiskerMeshes.length; wi++) {
          const w = whiskerMeshes[wi];
          const isLeft = wi < 3;
          const freq = 4.0 + wi * 0.7;
          const twitchAmt = Math.sin(time * freq) * 0.04 + Math.sin(time * freq * 2.3) * 0.015;
          w.rotation.z = isLeft ? -twitchAmt : twitchAmt;
          w.rotation.y = Math.sin(time * (freq * 0.5)) * 0.02;
        }

        // Foot tap (front-right foot taps occasionally)
        const tapCycle = time % 6.0;
        if (tapCycle > 4.0 && tapCycle < 5.0 && feetMeshes.length > 1) {
          const tapT = (tapCycle - 4.0) / 1.0;
          const tapY = Math.abs(Math.sin(tapT * Math.PI * 3)) * 0.03;
          feetMeshes[1].position.y = 0.05 + tapY;
        } else if (feetMeshes.length > 1) {
          feetMeshes[1].position.y = 0.05;
        }

        // Cheek blush pulse with intensity cycle (warmth builds up then fades)
        const blushWave = 0.5 + 0.5 * Math.sin(time * 0.3); // slow warmth cycle ~20s
        const blushPulse = (0.15 + Math.sin(time * 1.2) * 0.06) * (0.6 + blushWave * 0.4);
        (leftBlush.material as THREE.MeshBasicMaterial).opacity = blushPulse;
        (rightBlush.material as THREE.MeshBasicMaterial).opacity = blushPulse;

        // Mouth smile animation (W-shape widens/narrows subtly)
        const smileAmt = 1.0 + Math.sin(time * 1.5) * 0.08;
        mouth1.scale.set(smileAmt, 1, 1);
        mouth2.scale.set(smileAmt, 1, 1);
        // Mouth lifts slightly when "happy" (correlated with blush warmth)
        const mouthLift = blushWave * 0.008;
        mouth1.position.y = mouthLift;
        mouth2.position.y = mouthLift;

        // Body color warmth shift (slight hue toward pink when blush is high)
        const warmth = blushWave * 0.15;
        const bodyMat = body.material as THREE.MeshStandardMaterial;
        bodyMat.color.setRGB(
          0.95 + warmth * 0.05,
          0.85 - warmth * 0.02,
          0.78 - warmth * 0.03
        );

        // Blink every ~3-5 seconds (quick close-open)
        const blinkCycle = time % 4.0; // blink period
        let blinkScale = 0;
        if (blinkCycle < 0.12) {
          blinkScale = Math.sin((blinkCycle / 0.12) * Math.PI); // smooth blink
        }
        leftLid.scale.y = blinkScale;
        rightLid.scale.y = blinkScale;
        leftShine.visible = blinkScale < 0.5;
        rightShine.visible = blinkScale < 0.5;

        // Eye shine subtle bounce
        const shineBounce = Math.sin(time * 3) * 0.005;
        leftShine.position.y = BODY_SIZE * 0.73 + shineBounce;
        rightShine.position.y = BODY_SIZE * 0.73 + shineBounce;

        // Dynamic shadow (pulses with bob, slightly larger when higher)
        const shadowScale = 1 + bob * 0.5;
        shadow.scale.set(shadowScale, shadowScale, 1);
        (shadow.material as THREE.MeshBasicMaterial).opacity = 0.18 - bob * 0.3;

        // Tail tip emissive pulse (warm glow)
        (tailTipMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + Math.sin(time * 2.0) * 0.08;

        // Sparkle particles orbit near tail tip (twinkle effect)
        const tailTipWorld = new THREE.Vector3();
        tailTipMesh.getWorldPosition(tailTipWorld);
        const sparkleActive = Math.sin(time * 0.5) > 0.3; // intermittent sparkle bursts
        for (let si = 0; si < sparkles.length; si++) {
          const sp = sparkles[si];
          const phase = sp.userData.sparklePhase + time * 3.0;
          sp.visible = sparkleActive;
          if (sparkleActive) {
            const radius = 0.12 + Math.sin(phase * 0.7) * 0.04;
            sp.position.set(
              tailTipWorld.x + Math.cos(phase) * radius,
              tailTipWorld.y + Math.sin(phase * 1.3) * 0.08,
              tailTipWorld.z + Math.sin(phase) * radius
            );
            const sparkleOpacity = Math.max(0, Math.sin(phase * 2) * 0.8);
            (sp.material as THREE.MeshBasicMaterial).opacity = sparkleOpacity;
            const sparkleScale = 0.5 + sparkleOpacity * 0.7;
            sp.scale.setScalar(sparkleScale);
          }
        }

        // Eye sparkle twinkle (subtle shine pulse)
        const twinkle = 0.8 + Math.sin(time * 4.5) * 0.2;
        leftShine.scale.setScalar(twinkle);
        rightShine.scale.setScalar(twinkle);

        // Purr vibration micro-shake (very subtle high-freq body oscillation)
        const purr = Math.sin(time * 25) * 0.003;
        body.position.x = purr;
      }

      // ---- Tail physics (verlet-style spring chain) ----
      // Anchor: tail base follows body with smooth damping to prevent glitching during turns
      const groupWorld = new THREE.Vector3();
      group.getWorldPosition(groupWorld);
      
      // Smooth anchor position to prevent sudden jumps when body rotates
      const targetAnchor = new THREE.Vector3(
        groupWorld.x,
        groupWorld.y + BODY_SIZE * 0.4,
        groupWorld.z - (BODY_SIZE / 2 + 0.1),
      );
      
      // Store and smooth the anchor position
      if (!this.tailAnchorSmoothed) {
        this.tailAnchorSmoothed = targetAnchor.clone();
      }
      this.tailAnchorSmoothed.lerp(targetAnchor, 1 - TAIL_ANCHOR_DAMPING);
      const tailAnchor = this.tailAnchorSmoothed;

      for (let i = 0; i < TAIL_SEGMENTS; i++) {
        const pos = this.tailPositions[i];
        const vel = this.tailVelocities[i];

        // Target: connected to previous segment (or anchor for first)
        const anchor = i === 0 ? tailAnchor : this.tailPositions[i - 1];
        const toAnchor = new THREE.Vector3().subVectors(anchor, pos);
        const dist = toAnchor.length();
        const stretch = Math.max(0, dist - TAIL_SEG_LEN); // Prevent compression

        // Spring force toward anchor (reduced for stability)
        if (dist > 0.001) {
          toAnchor.normalize();
          vel.add(toAnchor.multiplyScalar(stretch * TAIL_SPRING));
        }

        // Gravity
        vel.y -= TAIL_GRAVITY;

        // Idle wave animation (sine wave along tail) - reduced amplitude
        if (!this.isRagdoll) {
          const wave = Math.sin(time * 2.5 + i * 0.6) * 0.005;
          vel.x += wave;
          // Gentle upward curl
          const curl = Math.sin(time * 1.8 + i * 0.4) * 0.002;
          vel.y += curl;
        }

        // Damping
        vel.multiplyScalar(this.isRagdoll ? RAGDOLL_DAMPING : TAIL_DAMPING);

        // Update position
        pos.add(vel);

        // Floor constraint
        const minHeight = TAIL_HEIGHT * 0.5; // Cube half-height
        if (pos.y < minHeight) {
          pos.y = minHeight;
          vel.y *= -0.3;
          vel.x *= 0.85;
          vel.z *= 0.85;
        }

        // Collision with bodies (simple sphere-based collision)
        for (const body of this.collisionBodies) {
          const bodyPos = new THREE.Vector3();
          body.getWorldPosition(bodyPos);
          const toBody = new THREE.Vector3().subVectors(pos, bodyPos);
          const dist = toBody.length();
          const minDist = 0.5; // Collision radius
          
          if (dist < minDist && dist > 0.001) {
            toBody.normalize().multiplyScalar(minDist - dist);
            pos.add(toBody);
            vel.multiplyScalar(0.5); // Bounce damping
          }
        }

        // Update mesh
        this.tailMeshes[i].position.copy(pos);
      }

      // Tail tip follows last segment
      const lastPos = this.tailPositions[TAIL_SEGMENTS - 1];
      this.tailTipMesh.position.copy(lastPos);

      // ---- Ragdoll: body follows tail drag with loose physics ----
      if (this.isRagdoll) {
        // Body is pulled toward tail anchor position loosely
        const bodyWorldPos = groupWorld;
        const toTail = new THREE.Vector3().subVectors(tailAnchor, bodyWorldPos);
        
        // Apply ragdoll forces
        this.ragdollVelocity.multiplyScalar(0.88);
        group.position.add(this.ragdollVelocity);

        // Wobble
        body.rotation.x = Math.sin(time * 8) * 0.2;
        body.rotation.z = Math.cos(time * 6) * 0.25;
        leftEar.rotation.z = Math.sin(time * 10) * 0.4;
        rightEar.rotation.z = Math.cos(time * 10) * 0.4;
        leftInner.rotation.z = leftEar.rotation.z;
        rightInner.rotation.z = rightEar.rotation.z;
      }
    },

    getTailTipWorldPos() {
      return this.tailPositions[TAIL_SEGMENTS - 1].clone();
    },

    setRagdoll(on: boolean) {
      this.isRagdoll = on;
      if (!on) {
        this.ragdollVelocity.set(0, 0, 0);
        // Reset body rotations
        body.rotation.set(0, 0, 0);
      }
    },

    applyRagdollForce(worldPos: THREE.Vector3) {
      if (!this.isRagdoll) return;
      // Pull body toward the drag point (including vertical movement)
      const groupWorld = new THREE.Vector3();
      group.getWorldPosition(groupWorld);
      const pullDir = new THREE.Vector3().subVectors(worldPos, groupWorld);
      pullDir.multiplyScalar(0.12); // Slightly reduced for smoother movement
      this.ragdollVelocity.add(pullDir);
      
      // Clamp vertical movement to prevent going too high/low
      this.ragdollVelocity.y = Math.max(-0.15, Math.min(0.15, this.ragdollVelocity.y));
    },

    setCollisionBodies(bodies: THREE.Mesh[]) {
      this.collisionBodies = bodies;
    },
  };

  return controller;
}
