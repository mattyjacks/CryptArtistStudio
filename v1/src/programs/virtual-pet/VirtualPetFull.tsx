import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { FOOD_DATA, type FoodItem } from "./FoodData";
import valleyNetImage from "../../assets/valley net v23.2 jpg mattyjacks 2023-2026 blonde lady girl red eyes ai generated edited.jpg";

// ---- Types ----
interface InventoryItem {
  id: string;
  foodId: string;
  addedAt: number;
}

interface PetStats {
  health: number;
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  bond: number;
  intoxication: number;
  level: number;
  xp: number;
}

type MiniGame = "none" | "memory" | "quiz";

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

interface QuizQuestion {
  question: string;
  answers: string[];
  correct: number;
}

// ---- Constants ----
const ROOM_W = 16;
const ROOM_D = 12;
const ROOM_H = 6;
const WANDER_SPEED = 0.02;
const BALL_FRICTION = 0.97;
const BALL_RADIUS = 0.25;
const PET_RADIUS = 0.6;

const QUIZ_QUESTIONS: QuizQuestion[] = [
  { question: "What is Valley Net's favorite color?", answers: ["Red", "Blue", "Pink", "Green"], correct: 0 },
  { question: "How many legs does a dog have?", answers: ["2", "4", "6", "8"], correct: 1 },
  { question: "What sound does a cat make?", answers: ["Woof", "Moo", "Meow", "Quack"], correct: 2 },
  { question: "Which food is a fruit?", answers: ["Carrot", "Potato", "Banana", "Broccoli"], correct: 2 },
  { question: "What do pets need every day?", answers: ["TV", "Water", "WiFi", "Homework"], correct: 1 },
  { question: "Which animal can fly?", answers: ["Dog", "Cat", "Eagle", "Fish"], correct: 2 },
  { question: "What is the biggest ocean?", answers: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2 },
  { question: "How many colors in a rainbow?", answers: ["5", "6", "7", "8"], correct: 2 },
];

const MEMORY_EMOJIS = ["🐕", "🐈", "🐟", "🐦", "🐢", "🐰", "🦊", "🐻"];

export default function VirtualPet() {
  const navigate = useNavigate();

  // Pet stats
  const [stats, setStats] = useState<PetStats>({
    health: 100, hunger: 70, happiness: 80, energy: 90,
    cleanliness: 85, bond: 30, intoxication: 0, level: 1, xp: 0,
  });

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lastFoodAdded, setLastFoodAdded] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"stats" | "food" | "games">("stats");
  const [miniGame, setMiniGame] = useState<MiniGame>("none");
  const [petMessage, setPetMessage] = useState("");
  const [showPetHeart, setShowPetHeart] = useState(false);
  const [ballVisible, setBallVisible] = useState(true);

  // Memory game
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);

  // Quiz game
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");

  // Three.js refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const petMeshRef = useRef<THREE.Group | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const animIdRef = useRef<number>(0);

  // Pet movement state (refs so animation loop reads latest)
  const petPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const petTargetRef = useRef(new THREE.Vector3(2, 0, 2));
  const petWanderTimer = useRef(0);

  // Ball physics
  const ballPosRef = useRef(new THREE.Vector3(3, BALL_RADIUS, 0));
  const ballVelRef = useRef(new THREE.Vector3(0, 0, 0));
  const ballThrownRef = useRef(false);
  const petChasingBallRef = useRef(false);
  const petHasBallRef = useRef(false);

  // Raycaster for clicking
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // ---- Helpers ----
  const getFoodData = (foodId: string): FoodItem | undefined => FOOD_DATA.find((f) => f.id === foodId);

  const showMessage = useCallback((msg: string, duration = 2500) => {
    setPetMessage(msg);
    setTimeout(() => setPetMessage(""), duration);
  }, []);

  const gainXP = useCallback((amount: number) => {
    setStats((prev) => {
      let newXP = prev.xp + amount;
      let newLevel = prev.level;
      const needed = newLevel * 50;
      if (newXP >= needed) {
        newXP -= needed;
        newLevel++;
      }
      return { ...prev, xp: newXP, level: newLevel };
    });
  }, []);

  // ---- Actions ----
  const petThePet = useCallback(() => {
    setShowPetHeart(true);
    setTimeout(() => setShowPetHeart(false), 1200);
    setStats((s) => ({
      ...s,
      happiness: Math.min(100, s.happiness + 8),
      bond: Math.min(100, s.bond + 3),
    }));
    gainXP(5);
    showMessage("Valley Net loves being petted! +8 Happiness");
  }, [gainXP, showMessage]);

  const addRandomFood = useCallback(() => {
    const f = FOOD_DATA[Math.floor(Math.random() * FOOD_DATA.length)];
    setInventory((prev) => [...prev, { id: `${f.id}-${Date.now()}`, foodId: f.id, addedAt: Date.now() }]);
    setLastFoodAdded(f.emoji);
    setTimeout(() => setLastFoodAdded(""), 1500);
  }, []);

  const feedPet = useCallback((itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const fd = getFoodData(item.foodId);
    if (!fd) return;
    setStats((s) => {
      const ns = { ...s };
      ns.hunger = Math.max(0, Math.min(100, ns.hunger + fd.stats.hunger));
      ns.happiness = Math.max(0, Math.min(100, ns.happiness + fd.stats.happiness));
      ns.health = Math.max(0, Math.min(100, ns.health + fd.stats.health));
      ns.energy = Math.max(0, Math.min(100, ns.energy + fd.stats.energy));
      ns.cleanliness = Math.max(0, Math.min(100, ns.cleanliness + fd.stats.cleanliness));
      if (fd.isAlcohol) {
        ns.intoxication = Math.min(100, ns.intoxication + fd.alcoholContent);
        if (ns.intoxication > 50) ns.health = Math.max(0, ns.health - 10);
      }
      return ns;
    });
    gainXP(8);
    showMessage(`Fed ${fd.emoji} ${fd.name}! ${fd.isAlcohol ? "🍷 Getting tipsy..." : "Yum!"}`);
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  }, [inventory, gainXP, showMessage]);

  const throwBall = useCallback(() => {
    ballPosRef.current.set(0, BALL_RADIUS, -2);
    const angle = (Math.random() - 0.5) * 1.5;
    ballVelRef.current.set(Math.sin(angle) * 0.15, 0, -Math.cos(angle) * 0.15);
    ballThrownRef.current = true;
    petChasingBallRef.current = false;
    petHasBallRef.current = false;
    setBallVisible(true);
    showMessage("Ball thrown! Valley Net is excited!");
  }, [showMessage]);

  const resetBall = useCallback(() => {
    ballPosRef.current.set(3, BALL_RADIUS, 0);
    ballVelRef.current.set(0, 0, 0);
    ballThrownRef.current = false;
    petChasingBallRef.current = false;
    petHasBallRef.current = false;
    setBallVisible(true);
    if (ballMeshRef.current) ballMeshRef.current.visible = true;
  }, []);

  // ---- Mini-games ----
  const startMemory = useCallback(() => {
    const shuffled = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setMemoryCards(shuffled);
    setMemoryFlipped([]);
    setMemoryMoves(0);
    setMemoryLocked(false);
    setMiniGame("memory");
  }, []);

  const flipCard = useCallback((id: number) => {
    if (memoryLocked) return;
    const card = memoryCards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newCards = memoryCards.map((c) => c.id === id ? { ...c, flipped: true } : c);
    const newFlipped = [...memoryFlipped, id];
    setMemoryCards(newCards);
    setMemoryFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      setMemoryLocked(true);
      const [first, second] = newFlipped;
      const c1 = newCards.find((c) => c.id === first)!;
      const c2 = newCards.find((c) => c.id === second)!;
      if (c1.emoji === c2.emoji) {
        const matched = newCards.map((c) =>
          c.id === first || c.id === second ? { ...c, matched: true } : c
        );
        setMemoryCards(matched);
        setMemoryFlipped([]);
        setMemoryLocked(false);
        if (matched.every((c) => c.matched)) {
          showMessage("Memory game complete! +25 XP");
          gainXP(25);
          setStats((s) => ({ ...s, happiness: Math.min(100, s.happiness + 15) }));
        }
      } else {
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === first || c.id === second) && !c.matched ? { ...c, flipped: false } : c)
          );
          setMemoryFlipped([]);
          setMemoryLocked(false);
        }, 800);
      }
    }
  }, [memoryCards, memoryFlipped, memoryLocked, showMessage, gainXP]);

  const startQuiz = useCallback(() => {
    setQuizIdx(0);
    setQuizScore(0);
    setQuizDone(false);
    setQuizFeedback("");
    setMiniGame("quiz");
  }, []);

  const answerQuiz = useCallback((ansIdx: number) => {
    const q = QUIZ_QUESTIONS[quizIdx];
    const correct = ansIdx === q.correct;
    if (correct) {
      setQuizScore((s) => s + 1);
      setQuizFeedback("Correct!");
    } else {
      setQuizFeedback(`Wrong! Answer: ${q.answers[q.correct]}`);
    }
    setTimeout(() => {
      setQuizFeedback("");
      if (quizIdx + 1 >= QUIZ_QUESTIONS.length) {
        setQuizDone(true);
        const bonus = (quizScore + (correct ? 1 : 0)) * 5;
        gainXP(bonus);
        setStats((s) => ({ ...s, happiness: Math.min(100, s.happiness + 10) }));
        showMessage(`Quiz done! Score: ${quizScore + (correct ? 1 : 0)}/${QUIZ_QUESTIONS.length} +${bonus} XP`);
      } else {
        setQuizIdx((i) => i + 1);
      }
    }, 1200);
  }, [quizIdx, quizScore, gainXP, showMessage]);

  // ---- Stat decay ----
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((s) => ({
        ...s,
        hunger: Math.max(0, s.hunger - 0.3),
        energy: Math.max(0, s.energy - 0.15),
        cleanliness: Math.max(0, s.cleanliness - 0.1),
        happiness: Math.max(0, s.happiness - 0.1),
        intoxication: Math.max(0, s.intoxication - 0.5),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ---- Three.js scene ----
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 35);
    sceneRef.current = scene;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -ROOM_W;
    sun.shadow.camera.right = ROOM_W;
    sun.shadow.camera.top = ROOM_D;
    sun.shadow.camera.bottom = -ROOM_D;
    scene.add(sun);

    const pointLight = new THREE.PointLight(0xff88aa, 0.4, 15);
    pointLight.position.set(-4, 4, -3);
    scene.add(pointLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.9, side: THREE.DoubleSide });
    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
    backWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat.clone());
    (leftWall.material as THREE.MeshStandardMaterial).color.set(0xeadbc8);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat.clone());
    (rightWall.material as THREE.MeshStandardMaterial).color.set(0xeadbc8);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Furniture
    const makeFurniture = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    // Bed
    makeFurniture(new THREE.BoxGeometry(3, 0.4, 2), 0xff69b4, -5.5, 0.2, -4);
    makeFurniture(new THREE.BoxGeometry(3, 0.6, 0.3), 0xcc5599, -5.5, 0.5, -4.85);
    // Table
    makeFurniture(new THREE.BoxGeometry(2, 0.15, 1.5), 0x8b6914, 4, 1.2, -4);
    makeFurniture(new THREE.CylinderGeometry(0.1, 0.1, 1.2), 0x6b4914, 3.2, 0.6, -4.5);
    makeFurniture(new THREE.CylinderGeometry(0.1, 0.1, 1.2), 0x6b4914, 4.8, 0.6, -4.5);
    makeFurniture(new THREE.CylinderGeometry(0.1, 0.1, 1.2), 0x6b4914, 3.2, 0.6, -3.5);
    makeFurniture(new THREE.CylinderGeometry(0.1, 0.1, 1.2), 0x6b4914, 4.8, 0.6, -3.5);
    // Shelf
    makeFurniture(new THREE.BoxGeometry(2.5, 3, 0.4), 0x654321, 6.5, 1.5, -5.7);
    // Rug
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x884466, roughness: 1 });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 1);
    rug.receiveShadow = true;
    scene.add(rug);
    // Plant
    makeFurniture(new THREE.CylinderGeometry(0.3, 0.4, 0.8), 0x8b4513, -6, 0.4, 4);
    makeFurniture(new THREE.SphereGeometry(0.6, 16, 16), 0x228b22, -6, 1.2, 4);
    // Lamp
    makeFurniture(new THREE.CylinderGeometry(0.08, 0.08, 2), 0xaaaaaa, 5.5, 1, 4);
    makeFurniture(new THREE.ConeGeometry(0.5, 0.5, 16), 0xffdd55, 5.5, 2.25, 4);
    const lampLight = new THREE.PointLight(0xffdd88, 0.5, 8);
    lampLight.position.set(5.5, 2.5, 4);
    scene.add(lampLight);

    // Pet
    const petGroup = new THREE.Group();
    petMeshRef.current = petGroup;
    scene.add(petGroup);

    // Pet body (sphere)
    const bodyGeo = new THREE.SphereGeometry(PET_RADIUS, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = PET_RADIUS;
    petGroup.add(body);

    // Pet face plane with Valley Net image
    const loader = new THREE.TextureLoader();
    loader.load(valleyNetImage, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const faceGeo = new THREE.PlaneGeometry(0.8, 0.8);
      const faceMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.set(0, PET_RADIUS + 0.1, PET_RADIUS * 0.6);
      petGroup.add(face);
    });

    // Pet ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.3, 8);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.3, PET_RADIUS * 2 + 0.1, 0);
    petGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.3, PET_RADIUS * 2 + 0.1, 0);
    petGroup.add(rightEar);

    // Pet shadow
    const shadowGeo = new THREE.CircleGeometry(0.5, 32);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    petGroup.add(shadow);

    // Ball
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.3, metalness: 0.1 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    ball.position.copy(ballPosRef.current);
    ballMeshRef.current = ball;
    scene.add(ball);

    // Pet name label
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(0, 0, 256, 64, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Valley Net", 128, 42);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelGeo = new THREE.PlaneGeometry(1.5, 0.4);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = PET_RADIUS * 2 + 0.6;
    petGroup.add(label);

    // Click handler
    const onClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !petMeshRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check pet click
      const petIntersects = raycasterRef.current.intersectObjects(petMeshRef.current.children, true);
      if (petIntersects.length > 0) {
        petThePet();
        return;
      }

      // Check ball click - throw it
      if (ballMeshRef.current && ballMeshRef.current.visible) {
        const ballIntersects = raycasterRef.current.intersectObject(ballMeshRef.current);
        if (ballIntersects.length > 0) {
          throwBall();
        }
      }
    };
    canvas.addEventListener("click", onClick);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Pet wandering
      petWanderTimer.current -= dt;
      if (petWanderTimer.current <= 0 && !petChasingBallRef.current && !petHasBallRef.current) {
        petTargetRef.current.set(
          (Math.random() - 0.5) * (ROOM_W - 3),
          0,
          (Math.random() - 0.5) * (ROOM_D - 3)
        );
        petWanderTimer.current = 3 + Math.random() * 4;
      }

      const target = petChasingBallRef.current ? ballPosRef.current : petTargetRef.current;
      const dir = new THREE.Vector3().subVectors(target, petPosRef.current);
      dir.y = 0;
      const dist = dir.length();
      
      const moveSpeed = petChasingBallRef.current ? 0.06 : WANDER_SPEED;
      if (dist > 0.3) {
        dir.normalize().multiplyScalar(moveSpeed);
        petPosRef.current.add(dir);
        // Face direction
        if (petMeshRef.current) {
          petMeshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      // Pet bounce
      if (petMeshRef.current) {
        petMeshRef.current.position.copy(petPosRef.current);
        const bounce = Math.abs(Math.sin(time * 3)) * 0.1;
        petMeshRef.current.position.y = bounce;
      }

      // Ball physics
      if (ballThrownRef.current) {
        ballPosRef.current.add(ballVelRef.current);
        ballVelRef.current.multiplyScalar(BALL_FRICTION);

        // Bounce off walls
        if (ballPosRef.current.x > ROOM_W / 2 - 0.5 || ballPosRef.current.x < -ROOM_W / 2 + 0.5) {
          ballVelRef.current.x *= -0.7;
          ballPosRef.current.x = Math.max(-ROOM_W / 2 + 0.5, Math.min(ROOM_W / 2 - 0.5, ballPosRef.current.x));
        }
        if (ballPosRef.current.z > ROOM_D / 2 - 0.5 || ballPosRef.current.z < -ROOM_D / 2 + 0.5) {
          ballVelRef.current.z *= -0.7;
          ballPosRef.current.z = Math.max(-ROOM_D / 2 + 0.5, Math.min(ROOM_D / 2 - 0.5, ballPosRef.current.z));
        }

        // Ball stopped - pet chases
        if (ballVelRef.current.length() < 0.005 && !petChasingBallRef.current) {
          ballVelRef.current.set(0, 0, 0);
          petChasingBallRef.current = true;
        }
      }

      // Pet catches ball
      if (petChasingBallRef.current && !petHasBallRef.current) {
        const petToBall = petPosRef.current.distanceTo(ballPosRef.current);
        if (petToBall < 0.8) {
          petHasBallRef.current = true;
          petChasingBallRef.current = false;
          ballThrownRef.current = false;
          if (ballMeshRef.current) ballMeshRef.current.visible = false;
          setBallVisible(false);
          // Return to center
          petTargetRef.current.set(0, 0, 2);
        }
      }

      // Pet returns ball
      if (petHasBallRef.current) {
        const distToCenter = petPosRef.current.distanceTo(new THREE.Vector3(0, 0, 2));
        if (distToCenter < 0.5) {
          petHasBallRef.current = false;
          ballPosRef.current.set(petPosRef.current.x + 0.5, BALL_RADIUS, petPosRef.current.z + 0.5);
          if (ballMeshRef.current) {
            ballMeshRef.current.visible = true;
            ballMeshRef.current.position.copy(ballPosRef.current);
          }
          setBallVisible(true);
        }
      }

      // Update ball mesh
      if (ballMeshRef.current && ballMeshRef.current.visible) {
        ballMeshRef.current.position.copy(ballPosRef.current);
        ballMeshRef.current.rotation.x += ballVelRef.current.length() * 2;
      }

      // Clamp pet to room
      petPosRef.current.x = Math.max(-ROOM_W / 2 + 1, Math.min(ROOM_W / 2 - 1, petPosRef.current.x));
      petPosRef.current.z = Math.max(-ROOM_D / 2 + 1, Math.min(ROOM_D / 2 - 1, petPosRef.current.z));

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!canvasRef.current) return;
      const nw = canvasRef.current.clientWidth;
      const nh = canvasRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [petThePet, throwBall]);

  // ---- Stat bar component ----
  const StatBar = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-5 text-center">{icon}</span>
      <span className="text-xs text-gray-300 w-20">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{Math.round(value)}</span>
    </div>
  );

  const xpNeeded = stats.level * 50;

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-red-900 text-white px-4 py-3 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <img src={valleyNetImage} alt="Valley Net" className="w-10 h-10 rounded-full border-2 border-pink-400 object-cover" />
          <div>
            <h1 className="text-lg font-bold leading-tight">Valley Net's Room</h1>
            <p className="text-xs text-pink-300">Level {stats.level} - {stats.xp}/{xpNeeded} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {petMessage && (
            <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm animate-pulse max-w-xs truncate">
              {petMessage}
            </div>
          )}
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition">
            Exit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D View */}
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Pet heart animation */}
          {showPetHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-8xl animate-ping">❤️</span>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs space-y-1">
            <p className="font-bold text-pink-300">Controls</p>
            <p>Click pet to pet her</p>
            <p>Click ball to throw</p>
          </div>

          {/* Ball controls */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <button
              onClick={throwBall}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg transition"
            >
              🎾 Throw Ball
            </button>
            {!ballVisible && (
              <button
                onClick={resetBall}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold shadow-lg transition animate-pulse"
              >
                🔄 Reset Ball
              </button>
            )}
          </div>

          {/* Last food added */}
          {lastFoodAdded && (
            <div className="absolute top-3 right-3 bg-green-500/80 backdrop-blur px-4 py-2 rounded-lg text-center animate-bounce">
              <p className="text-3xl">{lastFoodAdded}</p>
              <p className="text-xs text-white font-bold">Added!</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700 overflow-hidden">
          {/* Tab buttons */}
          <div className="flex bg-gray-900">
            {(["stats", "food", "games"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setMiniGame("none"); }}
                className={`flex-1 py-3 text-sm font-bold transition ${
                  activeTab === tab ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {tab === "stats" ? "📊 Stats" : tab === "food" ? "🍕 Food" : "🎮 Games"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* STATS TAB */}
            {activeTab === "stats" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <img src={valleyNetImage} alt="Valley Net" className="w-16 h-16 rounded-full border-2 border-pink-400 object-cover" />
                  <div>
                    <h2 className="text-white font-bold text-lg">Valley Net</h2>
                    <p className="text-pink-300 text-sm">Level {stats.level}</p>
                    <div className="w-32 bg-gray-700 rounded-full h-2 mt-1">
                      <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(stats.xp / xpNeeded) * 100}%` }} />
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{stats.xp}/{xpNeeded} XP</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <StatBar label="Health" value={stats.health} color="bg-red-500" icon="❤️" />
                  <StatBar label="Hunger" value={stats.hunger} color="bg-orange-500" icon="🍖" />
                  <StatBar label="Happiness" value={stats.happiness} color="bg-pink-500" icon="😊" />
                  <StatBar label="Energy" value={stats.energy} color="bg-yellow-500" icon="⚡" />
                  <StatBar label="Cleanliness" value={stats.cleanliness} color="bg-cyan-500" icon="🧼" />
                  <StatBar label="Bond" value={stats.bond} color="bg-purple-500" icon="💜" />
                  {stats.intoxication > 0 && (
                    <StatBar label="Tipsy" value={stats.intoxication} color="bg-amber-600" icon="🍷" />
                  )}
                </div>

                {stats.intoxication > 50 && (
                  <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-center">
                    <p className="text-red-300 font-bold text-sm">🤢 Valley Net is drunk!</p>
                    <p className="text-red-400 text-xs">Health is decreasing...</p>
                  </div>
                )}

                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <h3 className="text-white font-bold text-sm">Quick Actions</h3>
                  <button
                    onClick={petThePet}
                    className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-bold transition"
                  >
                    🐾 Pet Valley Net
                  </button>
                  <button
                    onClick={() => {
                      setStats((s) => ({ ...s, cleanliness: Math.min(100, s.cleanliness + 25), happiness: Math.min(100, s.happiness + 5) }));
                      gainXP(3);
                      showMessage("Bath time! +25 Cleanliness");
                    }}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-bold transition"
                  >
                    🛁 Give Bath
                  </button>
                  <button
                    onClick={() => {
                      setStats((s) => ({ ...s, energy: Math.min(100, s.energy + 30), health: Math.min(100, s.health + 5) }));
                      gainXP(3);
                      showMessage("Nap time! +30 Energy");
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-bold transition"
                  >
                    😴 Take Nap
                  </button>
                </div>
              </>
            )}

            {/* FOOD TAB */}
            {activeTab === "food" && (
              <>
                <button
                  onClick={addRandomFood}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition text-sm"
                >
                  🎲 Add Random Food
                </button>

                <p className="text-gray-400 text-xs">{inventory.length} items in inventory</p>

                <div className="space-y-2">
                  {inventory.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No food yet!</p>
                  ) : (
                    inventory.map((item) => {
                      const fd = getFoodData(item.foodId);
                      if (!fd) return null;
                      const isExpired = fd.expiresIn ? Date.now() - item.addedAt > fd.expiresIn * 86400000 : false;
                      return (
                        <div key={item.id} className={`p-2 rounded-lg border text-xs ${isExpired ? "bg-red-900/30 border-red-700" : "bg-gray-700/50 border-gray-600"}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white">{fd.emoji} {fd.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${fd.rarity === "legendary" ? "bg-yellow-600" : fd.rarity === "rare" ? "bg-purple-600" : "bg-gray-600"} text-white`}>
                              {fd.rarity}
                            </span>
                          </div>
                          <div className="text-gray-400 mb-1">
                            ${fd.cost} | {fd.storage}
                            {fd.isAlcohol && <span className="text-red-400 ml-1">🍷{fd.alcoholContent}%</span>}
                            {isExpired && <span className="text-red-400 ml-1 font-bold">EXPIRED</span>}
                          </div>
                          <button
                            onClick={() => feedPet(item.id)}
                            disabled={isExpired}
                            className={`w-full py-1 rounded text-xs font-bold transition ${
                              isExpired ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            {isExpired ? "Expired" : "Feed"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* GAMES TAB */}
            {activeTab === "games" && miniGame === "none" && (
              <div className="space-y-3">
                <h3 className="text-white font-bold">Mini-Games</h3>
                <p className="text-gray-400 text-xs">Play games to earn XP and make Valley Net happy!</p>

                <button
                  onClick={throwBall}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition text-sm"
                >
                  🎾 Play Fetch
                </button>
                {!ballVisible && (
                  <button
                    onClick={resetBall}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition text-sm"
                  >
                    🔄 Reset Ball
                  </button>
                )}

                <button
                  onClick={startMemory}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition text-sm"
                >
                  🧠 Memory Match
                </button>

                <button
                  onClick={startQuiz}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition text-sm"
                >
                  ❓ Pet Quiz
                </button>
              </div>
            )}

            {/* MEMORY GAME */}
            {activeTab === "games" && miniGame === "memory" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold">🧠 Memory Match</h3>
                  <button onClick={() => setMiniGame("none")} className="text-gray-400 hover:text-white text-xs">Back</button>
                </div>
                <p className="text-gray-400 text-xs">Moves: {memoryMoves} | {memoryCards.filter((c) => c.matched).length / 2}/{MEMORY_EMOJIS.length} pairs</p>
                {memoryCards.every((c) => c.matched) && memoryCards.length > 0 && (
                  <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 text-center">
                    <p className="text-green-300 font-bold">You did it in {memoryMoves} moves!</p>
                    <button onClick={startMemory} className="mt-2 px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold">Play Again</button>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {memoryCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => flipCard(card.id)}
                      className={`aspect-square rounded-lg text-2xl flex items-center justify-center font-bold transition-all duration-300 ${
                        card.matched
                          ? "bg-green-700/50 border border-green-500"
                          : card.flipped
                          ? "bg-purple-600 border border-purple-400"
                          : "bg-gray-600 hover:bg-gray-500 border border-gray-500"
                      }`}
                    >
                      {card.flipped || card.matched ? card.emoji : "?"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUIZ GAME */}
            {activeTab === "games" && miniGame === "quiz" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold">❓ Pet Quiz</h3>
                  <button onClick={() => setMiniGame("none")} className="text-gray-400 hover:text-white text-xs">Back</button>
                </div>

                {quizDone ? (
                  <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-4 text-center space-y-3">
                    <p className="text-3xl">{quizScore >= QUIZ_QUESTIONS.length * 0.7 ? "🎉" : "😅"}</p>
                    <p className="text-purple-300 font-bold">Score: {quizScore}/{QUIZ_QUESTIONS.length}</p>
                    <button onClick={startQuiz} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-bold">Play Again</button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-400 text-xs">Question {quizIdx + 1}/{QUIZ_QUESTIONS.length} | Score: {quizScore}</p>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <p className="text-white font-bold text-sm mb-3">{QUIZ_QUESTIONS[quizIdx].question}</p>
                      <div className="space-y-2">
                        {QUIZ_QUESTIONS[quizIdx].answers.map((ans, i) => (
                          <button
                            key={i}
                            onClick={() => answerQuiz(i)}
                            disabled={!!quizFeedback}
                            className="w-full py-2 bg-gray-600 hover:bg-purple-600 text-white rounded text-sm font-bold transition disabled:opacity-50"
                          >
                            {ans}
                          </button>
                        ))}
                      </div>
                      {quizFeedback && (
                        <p className={`text-center mt-2 font-bold text-sm ${quizFeedback.startsWith("Correct") ? "text-green-400" : "text-red-400"}`}>
                          {quizFeedback}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom status bar */}
          <div className="bg-gray-900 px-4 py-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span>Lv.{stats.level} | {stats.xp}/{xpNeeded} XP</span>
            <span>{inventory.length} foods</span>
          </div>
        </div>
      </div>
    </div>
  );
}
