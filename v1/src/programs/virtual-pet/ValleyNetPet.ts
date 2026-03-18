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

  // Whiskers (3 per side) ----
  const whiskerGeo = new THREE.BufferGeometry();
  const whiskerMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
  
  // Left whiskers
  for (let i = 0; i < 3; i++) {
    const yOffset = (i - 1) * 0.15;
    const points = [
      new THREE.Vector3(-BODY_SIZE / 2 - 0.01, BODY_SIZE / 2 + yOffset, 0),
      new THREE.Vector3(-BODY_SIZE / 2 - 0.35, BODY_SIZE / 2 + yOffset, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const whisker = new THREE.Line(geo, whiskerMat);
    whisker.userData = { isPet: true };
    group.add(whisker);
  }
  
  // Right whiskers
  for (let i = 0; i < 3; i++) {
    const yOffset = (i - 1) * 0.15;
    const points = [
      new THREE.Vector3(BODY_SIZE / 2 + 0.01, BODY_SIZE / 2 + yOffset, 0),
      new THREE.Vector3(BODY_SIZE / 2 + 0.35, BODY_SIZE / 2 + yOffset, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const whisker = new THREE.Line(geo, whiskerMat);
    whisker.userData = { isPet: true };
    group.add(whisker);
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

  // ---- Eyes (cute dot eyes) ----
  const eyeGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.02);
  leftEye.userData = { isPet: true };
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, BODY_SIZE * 0.7, BODY_SIZE / 2 + 0.02);
  rightEye.userData = { isPet: true };
  group.add(rightEye);

  // ---- Small nose ----
  const noseGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff6b8a, roughness: 0.2 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, BODY_SIZE * 0.55, BODY_SIZE / 2 + 0.03);
  nose.scale.set(1.2, 0.8, 0.6);
  nose.userData = { isPet: true };
  group.add(nose);

  // ---- Feet (small cubes at bottom) ----
  const footGeo = new THREE.BoxGeometry(0.2, 0.1, 0.25);
  const footMat = new THREE.MeshStandardMaterial({ color: EAR_COLOR, roughness: 0.4 });
  const footPositions = [
    [-0.22, 0.05, 0.2],
    [0.22, 0.05, 0.2],
    [-0.22, 0.05, -0.2],
    [0.22, 0.05, -0.2],
  ];
  for (const [fx, fy, fz] of footPositions) {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, fy, fz);
    foot.castShadow = true;
    foot.userData = { isPet: true };
    group.add(foot);
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

  // ---- Name label ----
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const ctx = labelCanvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(0, 0, 256, 64, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Valley Net", 128, 42);
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

  // Tail tip (bigger cube at end for easier grabbing)
  const tipGeo = new THREE.BoxGeometry(TAIL_WIDTH * 1.2, TAIL_HEIGHT * 1.2, TAIL_SEG_LEN * 1.1);
  const tipMat = new THREE.MeshStandardMaterial({ color: EAR_INNER_COLOR, roughness: 0.3 });
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
      // ---- Idle animation: gentle bob + ear twitch ----
      if (!this.isRagdoll) {
        const bob = Math.sin(time * 2.5) * 0.04;
        body.position.y = BODY_SIZE / 2 + bob;

        // Ear twitch
        const earTwitch = Math.sin(time * 4) * 0.08;
        leftEar.rotation.z = 0.15 + earTwitch;
        leftInner.rotation.z = 0.15 + earTwitch;
        rightEar.rotation.z = -0.15 - earTwitch;
        rightInner.rotation.z = -0.15 - earTwitch;

        // Gentle body sway
        body.rotation.z = Math.sin(time * 1.5) * 0.03;
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
