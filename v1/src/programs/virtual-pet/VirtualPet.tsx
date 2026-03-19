import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { FOOD_DATA, type FoodItem } from "./FoodData";
import { createValleyNetPet, type ValleyNetController } from "./ValleyNetPet";
import valleyNetImage from "../../assets/valley net v23.2 jpg mattyjacks 2023-2026 blonde lady girl red eyes ai generated edited.jpg";
import {
  buildRoom,
  ROOM_W,
  ROOM_D,
  BALL_RADIUS,
  loadGraphicsMode,
  foodNeedsMicrowave,
  type RoomInstance,
  type FeedingPhase,
} from "./furniture";

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

interface PetSkills {
  painting: number;
}

interface PaintingData {
  imageUrl: string;
  title: string;
  value: number;
  isPrint: boolean;
}

const SKILLS_STORAGE_KEY = "cryptartist_pet_skills";
const PAINTING_STORAGE_KEY = "cryptartist_pet_painting";
const PET_MONEY_KEY = "cryptartist_pet_money";

function loadPetSkills(): PetSkills {
  try {
    const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (!raw) return { painting: 1 };
    const p = JSON.parse(raw);
    return { painting: Math.max(1, Math.min(100, Number(p.painting) || 1)) };
  } catch { return { painting: 1 }; }
}
function savePetSkills(s: PetSkills) { try { localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ } }

function loadPaintingData(defaultUrl: string): PaintingData {
  try {
    const raw = localStorage.getItem(PAINTING_STORAGE_KEY);
    if (!raw) return { imageUrl: defaultUrl, title: "Valley Net", value: 69, isPrint: false };
    const p = JSON.parse(raw);
    return {
      imageUrl: String(p.imageUrl || defaultUrl),
      title: String(p.title || "Valley Net"),
      value: Number(p.value) || 69,
      isPrint: Boolean(p.isPrint),
    };
  } catch { return { imageUrl: defaultUrl, title: "Valley Net", value: 69, isPrint: false }; }
}
function savePaintingData(d: PaintingData) { try { localStorage.setItem(PAINTING_STORAGE_KEY, JSON.stringify(d)); } catch { /* quota */ } }

function loadPetMoney(): number {
  try { return Number(localStorage.getItem(PET_MONEY_KEY)) || 0; } catch { return 0; }
}
function savePetMoney(m: number) { try { localStorage.setItem(PET_MONEY_KEY, String(m)); } catch { /* quota */ } }

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
const WANDER_SPEED = 0.02;
const BALL_FRICTION = 0.93;
const PET_RADIUS = 0.6;
const GRAVITY = 0.025;
const STATS_STORAGE_KEY = "cryptartist_pet_stats"; // Imp 1: Persist stats
const INVENTORY_STORAGE_KEY = "cryptartist_pet_inventory"; // Imp 2: Persist inventory
const PET_META_KEY = "cryptartist_pet_meta"; // Imp 3: Persist play time & daily bonus
const MAX_INVENTORY = 50; // Imp 4: Inventory size limit

// Imp 5: Pet mood calculator
function getPetMood(stats: PetStats): { emoji: string; label: string; color: string } {
  const avg = (stats.hunger + stats.happiness + stats.energy + stats.health) / 4;
  if (stats.intoxication > 50) return { emoji: "\uD83E\uDD22", label: "Drunk", color: "text-amber-400" };
  if (avg >= 80) return { emoji: "\uD83D\uDE0D", label: "Ecstatic", color: "text-pink-400" };
  if (avg >= 60) return { emoji: "\uD83D\uDE0A", label: "Happy", color: "text-green-400" };
  if (avg >= 40) return { emoji: "\uD83D\uDE10", label: "Okay", color: "text-yellow-400" };
  if (avg >= 20) return { emoji: "\uD83D\uDE1F", label: "Sad", color: "text-orange-400" };
  return { emoji: "\uD83D\uDE2D", label: "Miserable", color: "text-red-400" };
}

// Imp 6: Safe localStorage helpers
function loadPetStats(): PetStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { health: 100, hunger: 70, happiness: 80, energy: 90, cleanliness: 85, bond: 30, intoxication: 0, level: 1, xp: 0 };
    const p = JSON.parse(raw);
    return {
      health: Math.max(0, Math.min(100, Number(p.health) || 100)),
      hunger: Math.max(0, Math.min(100, Number(p.hunger) || 70)),
      happiness: Math.max(0, Math.min(100, Number(p.happiness) || 80)),
      energy: Math.max(0, Math.min(100, Number(p.energy) || 90)),
      cleanliness: Math.max(0, Math.min(100, Number(p.cleanliness) || 85)),
      bond: Math.max(0, Math.min(100, Number(p.bond) || 30)),
      intoxication: Math.max(0, Math.min(100, Number(p.intoxication) || 0)),
      level: Math.max(1, Number(p.level) || 1),
      xp: Math.max(0, Number(p.xp) || 0),
    };
  } catch { return { health: 100, hunger: 70, happiness: 80, energy: 90, cleanliness: 85, bond: 30, intoxication: 0, level: 1, xp: 0 }; }
}
function savePetStats(s: PetStats) { try { localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ } }
function loadInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((i: unknown) => typeof i === "object" && i !== null && "id" in (i as Record<string, unknown>)).slice(0, MAX_INVENTORY);
  } catch { return []; }
}
function saveInventory(inv: InventoryItem[]) { try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inv.slice(0, MAX_INVENTORY))); } catch { /* quota */ } }

// Imp 7: Play meta (daily bonus, play time, ball throws, high scores)
interface PetMeta { totalPlayMs: number; lastDailyBonus: string; ballThrows: number; memoryBest: number; quizBest: number; }
function loadPetMeta(): PetMeta {
  try {
    const raw = localStorage.getItem(PET_META_KEY);
    if (!raw) return { totalPlayMs: 0, lastDailyBonus: "", ballThrows: 0, memoryBest: 999, quizBest: 0 };
    const p = JSON.parse(raw);
    return { totalPlayMs: Number(p.totalPlayMs) || 0, lastDailyBonus: String(p.lastDailyBonus || ""), ballThrows: Number(p.ballThrows) || 0, memoryBest: Number(p.memoryBest) || 999, quizBest: Number(p.quizBest) || 0 };
  } catch { return { totalPlayMs: 0, lastDailyBonus: "", ballThrows: 0, memoryBest: 999, quizBest: 0 }; }
}
function savePetMeta(m: PetMeta) { try { localStorage.setItem(PET_META_KEY, JSON.stringify(m)); } catch { /* quota */ } }

const QUIZ_QUESTIONS: QuizQuestion[] = [
  { question: "What is Valley Net's favorite color?", answers: ["Red", "Blue", "Pink", "Green"], correct: 0 },
  { question: "How many legs does a dog have?", answers: ["2", "4", "6", "8"], correct: 1 },
  { question: "What sound does a cat make?", answers: ["Woof", "Moo", "Meow", "Quack"], correct: 2 },
  { question: "Which food is a fruit?", answers: ["Carrot", "Potato", "Banana", "Broccoli"], correct: 2 },
  { question: "What do pets need every day?", answers: ["TV", "Water", "WiFi", "Homework"], correct: 1 },
  { question: "Which animal can fly?", answers: ["Dog", "Cat", "Eagle", "Fish"], correct: 2 },
  { question: "What is the biggest ocean?", answers: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2 },
  { question: "How many colors in a rainbow?", answers: ["5", "6", "7", "8"], correct: 2 },
  // Imp 8: 12 more quiz questions (doubled the pool)
  { question: "What is the fastest land animal?", answers: ["Lion", "Cheetah", "Horse", "Dog"], correct: 1 },
  { question: "How many continents are there?", answers: ["5", "6", "7", "8"], correct: 2 },
  { question: "What planet is closest to the Sun?", answers: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
  { question: "Which animal is known as 'man's best friend'?", answers: ["Cat", "Dog", "Fish", "Bird"], correct: 1 },
  { question: "What do bees make?", answers: ["Milk", "Honey", "Silk", "Wax"], correct: 1 },
  { question: "How many hearts does an octopus have?", answers: ["1", "2", "3", "4"], correct: 2 },
  { question: "What is the largest mammal?", answers: ["Elephant", "Blue Whale", "Giraffe", "Hippo"], correct: 1 },
  { question: "Which season comes after spring?", answers: ["Winter", "Fall", "Summer", "Monsoon"], correct: 2 },
  { question: "What do cats love to chase?", answers: ["Balls", "Mice", "Cars", "Clouds"], correct: 1 },
  { question: "How many days in a week?", answers: ["5", "6", "7", "8"], correct: 2 },
  { question: "What color is grass?", answers: ["Blue", "Red", "Green", "Yellow"], correct: 2 },
  { question: "Which instrument has keys?", answers: ["Guitar", "Drums", "Piano", "Flute"], correct: 2 },
];

const MEMORY_EMOJIS = ["🐕", "🐈", "🐟", "🐦", "🐢", "🐰", "🦊", "🐻"];

export default function VirtualPet() {
  const navigate = useNavigate();

  // Imp 9: Load persisted stats
  const [stats, setStats] = useState<PetStats>(loadPetStats);

  // Imp 10: Load persisted inventory
  const [inventory, setInventory] = useState<InventoryItem[]>(loadInventory);
  const [lastFoodAdded, setLastFoodAdded] = useState("");
  // Imp 11: Pet meta (play time, high scores, daily bonus)
  const [petMeta, setPetMeta] = useState<PetMeta>(loadPetMeta);
  // Imp 12: Level-up celebration
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Imp 13: Stat change notification
  const [statNotif, setStatNotif] = useState("");
  // Imp 14: Inventory sort mode
  const [inventorySort, setInventorySort] = useState<"newest" | "rarity" | "name">("newest");
  // Imp 15: Play session timer
  const sessionStartRef = useRef(Date.now());
  // Imp 16: Daily bonus claimed flag
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);

  // Skills, painting, money
  const [petSkills, setPetSkills] = useState<PetSkills>(loadPetSkills);
  const [paintingData, setPaintingData] = useState<PaintingData>(() => loadPaintingData(valleyNetImage));
  const [petMoney, setPetMoney] = useState<number>(loadPetMoney);
  const [showPaintingDialog, setShowPaintingDialog] = useState(false);
  const [paintingRenameMode, setPaintingRenameMode] = useState(false);
  const [paintingRenameText, setPaintingRenameText] = useState("");
  const [paintingGenPrompt, setPaintingGenPrompt] = useState("");
  const [paintingGenerating, setPaintingGenerating] = useState(false);
  const [paintingRenameSuggesting, setPaintingRenameSuggesting] = useState(false);

  // Feeding animation state
  const [feedingPhase, setFeedingPhase] = useState<FeedingPhase>("idle");
  const feedingActiveRef = useRef(false);

  // UI state - Imp 17: Add "info" and "skills" tabs
  const [activeTab, setActiveTab] = useState<"stats" | "food" | "games" | "skills" | "info">("stats");
  const [miniGame, setMiniGame] = useState<MiniGame>("none");
  const [petMessage, setPetMessage] = useState("");
  const [showPetHeart, setShowPetHeart] = useState(false);
  const [ballVisible, setBallVisible] = useState(true);
  const [isDraggingBall, setIsDraggingBall] = useState(false);

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
  const petControllerRef = useRef<ValleyNetController | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const animIdRef = useRef<number>(0);
  const tailDraggingRef = useRef(false);
  const roomRef = useRef<RoomInstance | null>(null);

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
  const ballDraggingRef = useRef(false);
  const ballDragStartRef = useRef(new THREE.Vector3());
  const ballDragLastRef = useRef(new THREE.Vector3());

  // Raycaster for clicking
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const mouseWorldRef = useRef(new THREE.Vector3());
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), BALL_RADIUS));

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
        // Imp 18: Level-up celebration
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
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
    // Imp 27: Enforce inventory limit
    if (inventory.length >= MAX_INVENTORY) { showMessage(`Inventory full! Max ${MAX_INVENTORY} items.`); return; }
    const f = FOOD_DATA[Math.floor(Math.random() * FOOD_DATA.length)];
    setInventory((prev) => [...prev, { id: `${f.id}-${Date.now()}`, foodId: f.id, addedAt: Date.now() }]);
    setLastFoodAdded(f.emoji);
    setTimeout(() => setLastFoodAdded(""), 1500);
  }, [inventory.length, showMessage]);

  const applyFoodStats = useCallback((fd: FoodItem) => {
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
  }, [gainXP, showMessage]);

  const pendingFoodRef = useRef<FoodItem | null>(null);

  const feedPet = useCallback((itemId: string) => {
    if (feedingActiveRef.current) { showMessage("Valley Net is still eating!"); return; }
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const fd = getFoodData(item.foodId);
    if (!fd) return;

    // Remove from inventory immediately
    setInventory((prev) => prev.filter((i) => i.id !== itemId));

    // Store food data for when animation completes
    pendingFoodRef.current = fd;

    // Determine storage position
    const room = roomRef.current;
    if (!room) {
      // No room - instant feed (fallback)
      applyFoodStats(fd);
      return;
    }

    // Get positions based on food storage type
    const shelfWorldPos = room.shelfGroup?.position?.clone() || new THREE.Vector3(ROOM_W / 2 - 1.8, 0, -ROOM_D / 2 + 0.5);
    const fridgeWorldPos = room.fridgeGroup?.position?.clone() || new THREE.Vector3(ROOM_W / 2 - 1.5, 0, -ROOM_D / 2 + 1.5);
    const storagePos = fd.storage === "shelf" ? shelfWorldPos
      : fd.storage === "freezer" || fd.storage === "fridge" ? fridgeWorldPos
      : shelfWorldPos; // "none" storage defaults to shelf

    feedingActiveRef.current = true;
    setFeedingPhase("walking_to_storage");

    // Remove the food sprite from display
    room.foodDisplay.removeFoodSprite(item.foodId);

    // Start feeding animation
    room.feedingCtrl.startFeeding(
      fd.emoji,
      fd.storage,
      foodNeedsMicrowave(fd.storage),
      storagePos,
      room.microwaveCtrl.worldPosition,
      room.tableWorldPos,
    );
  }, [inventory, showMessage, applyFoodStats]);

  const throwBall = useCallback(() => {
    ballPosRef.current.set(0, BALL_RADIUS, -2);
    const angle = (Math.random() - 0.5) * 1.5;
    ballVelRef.current.set(Math.sin(angle) * 0.15, 0, -Math.cos(angle) * 0.15);
    ballThrownRef.current = true;
    petChasingBallRef.current = false;
    petHasBallRef.current = false;
    setBallVisible(true);
    // Imp 26: Track ball throws
    setPetMeta((m) => ({ ...m, ballThrows: m.ballThrows + 1 }));
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

  // Imp 19: Auto-save stats whenever they change (debounced)
  useEffect(() => { const t = setTimeout(() => savePetStats(stats), 500); return () => clearTimeout(t); }, [stats]);
  // Imp 20: Auto-save inventory
  useEffect(() => { const t = setTimeout(() => saveInventory(inventory), 500); return () => clearTimeout(t); }, [inventory]);
  // Imp 21: Auto-save meta
  useEffect(() => { const t = setTimeout(() => savePetMeta(petMeta), 500); return () => clearTimeout(t); }, [petMeta]);

  // Auto-save skills, painting, money
  useEffect(() => { const t = setTimeout(() => savePetSkills(petSkills), 500); return () => clearTimeout(t); }, [petSkills]);
  useEffect(() => { const t = setTimeout(() => savePaintingData(paintingData), 500); return () => clearTimeout(t); }, [paintingData]);
  useEffect(() => { const t = setTimeout(() => savePetMoney(petMoney), 500); return () => clearTimeout(t); }, [petMoney]);

  // Sync visible food display with inventory
  useEffect(() => {
    if (!roomRef.current) return;
    const foodItems = inventory.map((item) => {
      const fd = getFoodData(item.foodId);
      return fd ? { foodId: item.foodId, emoji: fd.emoji, storage: fd.storage as "shelf" | "fridge" | "freezer" | "none" } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);
    roomRef.current.foodDisplay.updateFoodDisplay(foodItems);
  }, [inventory]);

  // Imp 22: Play time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setPetMeta((m) => ({ ...m, totalPlayMs: m.totalPlayMs + 5000 }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Imp 23: Daily bonus check
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (petMeta.lastDailyBonus !== today) {
      setDailyBonusClaimed(false);
    } else {
      setDailyBonusClaimed(true);
    }
  }, [petMeta.lastDailyBonus]);

  // Imp 24: Claim daily bonus
  const claimDailyBonus = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (petMeta.lastDailyBonus === today) return;
    setPetMeta((m) => ({ ...m, lastDailyBonus: today }));
    setDailyBonusClaimed(true);
    gainXP(20);
    setStats((s) => ({ ...s, happiness: Math.min(100, s.happiness + 10), hunger: Math.min(100, s.hunger + 10) }));
    showMessage("Daily Bonus! +20 XP, +10 Happiness, +10 Hunger!");
  }, [petMeta.lastDailyBonus, gainXP, showMessage]);

  // Imp 25: Stat warning notifier
  useEffect(() => {
    if (stats.hunger < 15) setStatNotif("Valley Net is starving! Feed her!");
    else if (stats.energy < 15) setStatNotif("Valley Net is exhausted! Let her nap!");
    else if (stats.happiness < 15) setStatNotif("Valley Net is very sad! Pet her!");
    else if (stats.health < 20) setStatNotif("Valley Net's health is critical!");
    else setStatNotif("");
  }, [stats.hunger, stats.energy, stats.happiness, stats.health]);

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

    // ---- Scene, Camera, Renderer ----
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const graphicsMode = loadGraphicsMode();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    rendererRef.current = renderer;

    // ---- Build room with modular furniture system ----
    const rugSeed = (() => {
      try {
        const saved = localStorage.getItem("cryptartist_pet_rug_seed");
        return saved ? parseInt(saved, 10) : null;
      } catch { return null; }
    })();
    const savedPainting = loadPaintingData(valleyNetImage);
    const room = buildRoom(scene, renderer, graphicsMode, rugSeed, savedPainting.imageUrl);
    roomRef.current = room;

    // Get ball mesh from room (interactive, moved by drag logic)
    ballMeshRef.current = room.ballMesh;
    room.ballMesh.position.copy(ballPosRef.current);

    // Pet - created by separate ValleyNetPet module
    const petController = createValleyNetPet(scene, valleyNetImage);
    petControllerRef.current = petController;
    petMeshRef.current = petController.group;

    // Set collision bodies for tail and body collision
    petController.setCollisionBodies(room.collisionBodies);

    // Helper: get mouse world position on drag plane
    const getMouseWorld = (e: MouseEvent): THREE.Vector3 | null => {
      if (!canvasRef.current || !cameraRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const hit = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, hit);
      return hit;
    };

    // Mouse down handler - start ball drag or tail drag
    const onMouseDown = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Check tail click first (tail meshes + tip are in scene, not in group)
      if (petControllerRef.current) {
        const tailObjects = [...petControllerRef.current.tailMeshes, petControllerRef.current.tailTipMesh];
        const tailIntersects = raycasterRef.current.intersectObjects(tailObjects);
        if (tailIntersects.length > 0) {
          tailDraggingRef.current = true;
          petControllerRef.current.setRagdoll(true);
          e.preventDefault();
          return;
        }
      }

      // Check ball click
      if (ballMeshRef.current && ballMeshRef.current.visible) {
        const ballIntersects = raycasterRef.current.intersectObject(ballMeshRef.current);
        if (ballIntersects.length > 0) {
          ballDraggingRef.current = true;
          ballDragStartRef.current.copy(ballPosRef.current);
          ballDragLastRef.current.copy(ballPosRef.current);
          ballThrownRef.current = false;
          petChasingBallRef.current = false;
          setIsDraggingBall(true);
          e.preventDefault();
          return;
        }
      }

      // Check painting click
      if (roomRef.current) {
        const paintingMesh = roomRef.current.paintingCtrl.canvasMesh;
        const paintIntersects = raycasterRef.current.intersectObject(paintingMesh);
        if (paintIntersects.length > 0) {
          setShowPaintingDialog(true);
          return;
        }
      }

      // Check pet body click for petting
      if (petMeshRef.current) {
        const petIntersects = raycasterRef.current.intersectObjects(petMeshRef.current.children, true);
        if (petIntersects.length > 0) {
          petThePet();
        }
      }
    };

    // Mouse move handler - drag ball or drag tail
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;

      // Tail dragging - pull tail tip toward mouse
      if (tailDraggingRef.current && petControllerRef.current) {
        const worldPos = getMouseWorld(e);
        if (worldPos) {
          // Move tail tip toward mouse
          const lastIdx = petControllerRef.current.tailPositions.length - 1;
          const tailTip = petControllerRef.current.tailPositions[lastIdx];
          const toMouse = new THREE.Vector3().subVectors(worldPos, tailTip);
          toMouse.multiplyScalar(0.3);
          petControllerRef.current.tailVelocities[lastIdx].add(toMouse);

          // Pull body toward tail via ragdoll
          petControllerRef.current.applyRagdollForce(worldPos);

          // Decrease bond while dragging
          setStats((s) => ({ ...s, bond: Math.max(0, s.bond - 0.15) }));
        }
        return;
      }

      // Ball dragging
      if (ballDraggingRef.current) {
        const worldPos = getMouseWorld(e);
        if (worldPos) {
          worldPos.x = Math.max(-ROOM_W / 2 + BALL_RADIUS, Math.min(ROOM_W / 2 - BALL_RADIUS, worldPos.x));
          worldPos.z = Math.max(-ROOM_D / 2 + BALL_RADIUS, Math.min(ROOM_D / 2 - BALL_RADIUS, worldPos.z));
          worldPos.y = BALL_RADIUS;
          ballPosRef.current.copy(worldPos);
          ballVelRef.current.set(0, 0, 0);
          ballDragLastRef.current.copy(ballPosRef.current);
        }
      }
    };

    // Mouse up handler - throw ball or release tail
    const onMouseUp = (_e: MouseEvent) => {
      // Release tail drag
      if (tailDraggingRef.current) {
        tailDraggingRef.current = false;
        if (petControllerRef.current) {
          petControllerRef.current.setRagdoll(false);
        }
        showMessage("Valley Net doesn't like that! -Bond");
        return;
      }

      // Release ball drag
      if (ballDraggingRef.current) {
        ballDraggingRef.current = false;
        setIsDraggingBall(false);
        
        // Calculate throw velocity from drag distance
        const throwVel = new THREE.Vector3().subVectors(ballPosRef.current, ballDragStartRef.current);
        const dragDistance = throwVel.length();
        throwVel.multiplyScalar(0.15);
        
        // Add upward velocity for flicks
        throwVel.y = Math.max(0.15, dragDistance * 0.12);
        
        ballVelRef.current.copy(throwVel);
        ballThrownRef.current = true;
        showMessage("Ball thrown! Valley Net is excited!");
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    // Imp 28: Touch support for mobile
    const touchToMouse = (e: TouchEvent, type: string) => {
      if (e.touches.length > 0 || e.changedTouches.length > 0) {
        const t = (e.touches[0] || e.changedTouches[0]);
        const me = new MouseEvent(type, { clientX: t.clientX, clientY: t.clientY });
        canvas.dispatchEvent(me);
        e.preventDefault();
      }
    };
    canvas.addEventListener("touchstart", (e) => touchToMouse(e, "mousedown"), { passive: false });
    canvas.addEventListener("touchmove", (e) => touchToMouse(e, "mousemove"), { passive: false });
    canvas.addEventListener("touchend", (e) => touchToMouse(e, "mouseup"), { passive: false });

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update feeding animation
      let feedingTarget: THREE.Vector3 | null = null;
      let petOnTable = false;
      if (roomRef.current && feedingActiveRef.current) {
        const phase = roomRef.current.feedingCtrl.update(dt, petPosRef.current);
        setFeedingPhase(phase);
        feedingTarget = roomRef.current.feedingCtrl.getTargetPos();
        petOnTable = roomRef.current.feedingCtrl.isPetOnTable();

        // Feeding done - apply stats
        if (phase === "done") {
          feedingActiveRef.current = false;
          if (pendingFoodRef.current) {
            applyFoodStats(pendingFoodRef.current);
            pendingFoodRef.current = null;
          }
        }
      }

      // Pet wandering (skip if ragdoll)
      const isRagdoll = petControllerRef.current?.isRagdoll ?? false;
      if (!isRagdoll) {
        // Cat-looks-at-painting behavior (random chance when idle)
        const isFeeding = feedingActiveRef.current;
        if (!isFeeding && !petChasingBallRef.current && !petHasBallRef.current) {
          petWanderTimer.current -= dt;
          if (petWanderTimer.current <= 0) {
            // 15% chance to look at painting
            if (Math.random() < 0.15 && roomRef.current) {
              const paintPos = roomRef.current.paintingCtrl.worldPosition;
              // Walk near the painting and look up at it
              petTargetRef.current.set(paintPos.x + (Math.random() - 0.5) * 2, 0, paintPos.z + 3);
              petWanderTimer.current = 5 + Math.random() * 3;
              // Small happiness boost from admiring art
              setStats((s) => ({ ...s, happiness: Math.min(100, s.happiness + 0.5) }));
            } else {
              petTargetRef.current.set(
                (Math.random() - 0.5) * (ROOM_W - 3),
                0,
                (Math.random() - 0.5) * (ROOM_D - 3)
              );
              petWanderTimer.current = 3 + Math.random() * 4;
            }
          }
        }

        // Determine movement target
        let target: THREE.Vector3;
        let moveSpeed: number;
        if (feedingTarget) {
          target = feedingTarget;
          moveSpeed = 0.05;
        } else if (petChasingBallRef.current) {
          target = ballPosRef.current;
          moveSpeed = 0.06;
        } else {
          target = petTargetRef.current;
          moveSpeed = WANDER_SPEED;
        }

        const dir = new THREE.Vector3().subVectors(target, petPosRef.current);
        dir.y = 0;
        const dist = dir.length();
        
        if (dist > 0.3) {
          dir.normalize().multiplyScalar(moveSpeed);
          petPosRef.current.add(dir);
          if (petMeshRef.current) {
            petMeshRef.current.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }

        // Apply position - handle jumping on/off table
        if (petMeshRef.current) {
          petMeshRef.current.position.copy(petPosRef.current);
          if (petOnTable) {
            // Pet is on table - elevate to table top height
            petMeshRef.current.position.y = 2.65;
          } else {
            const bounce = Math.abs(Math.sin(time * 3)) * 0.06;
            petMeshRef.current.position.y = bounce;
          }
        }
      } else {
        // During ragdoll, sync petPosRef back from group
        if (petMeshRef.current) {
          petPosRef.current.copy(petMeshRef.current.position);
        }
      }

      // Update Valley Net pet controller (animations, tail physics)
      if (petControllerRef.current) {
        petControllerRef.current.update(dt, time);
      }

      // Update room (day/night cycle, lamp flicker, plant sway, etc.)
      if (roomRef.current) {
        roomRef.current.update(dt, time);
        roomRef.current.foodDisplay.updateAnimation(time);
      }

      // Ball physics with gravity
      if (ballThrownRef.current || (ballVelRef.current.length() > 0.001)) {
        // Apply gravity
        ballVelRef.current.y -= GRAVITY;
        
        // Update position
        ballPosRef.current.add(ballVelRef.current);
        
        // Apply friction (less friction in air, more on ground)
        const isInAir = ballPosRef.current.y > BALL_RADIUS + 0.05;
        const frictionMultiplier = isInAir ? 0.98 : BALL_FRICTION;
        ballVelRef.current.x *= frictionMultiplier;
        ballVelRef.current.z *= frictionMultiplier;
        
        // Floor bounce - satisfying bounce with good energy retention
        if (ballPosRef.current.y < BALL_RADIUS) {
          ballPosRef.current.y = BALL_RADIUS;
          const bounceEnergy = Math.abs(ballVelRef.current.y);
          ballVelRef.current.y *= -0.82; // Good bounce coefficient for satisfying bounces
          
          // Add small horizontal boost on bounce for rolling effect
          if (bounceEnergy > 0.05) {
            ballVelRef.current.x *= 1.05;
            ballVelRef.current.z *= 1.05;
          }
          
          // Stop bouncing if very small
          if (Math.abs(ballVelRef.current.y) < 0.008) ballVelRef.current.y = 0;
        }

        // Bounce off walls with good energy retention
        if (ballPosRef.current.x > ROOM_W / 2 - BALL_RADIUS) {
          ballVelRef.current.x *= -0.85;
          ballPosRef.current.x = ROOM_W / 2 - BALL_RADIUS;
        }
        if (ballPosRef.current.x < -ROOM_W / 2 + BALL_RADIUS) {
          ballVelRef.current.x *= -0.85;
          ballPosRef.current.x = -ROOM_W / 2 + BALL_RADIUS;
        }
        if (ballPosRef.current.z > ROOM_D / 2 - BALL_RADIUS) {
          ballVelRef.current.z *= -0.85;
          ballPosRef.current.z = ROOM_D / 2 - BALL_RADIUS;
        }
        if (ballPosRef.current.z < -ROOM_D / 2 + BALL_RADIUS) {
          ballVelRef.current.z *= -0.85;
          ballPosRef.current.z = -ROOM_D / 2 + BALL_RADIUS;
        }

        // Ball stopped - pet chases
        if (ballVelRef.current.length() < 0.008 && ballPosRef.current.y <= BALL_RADIUS + 0.02 && !petChasingBallRef.current && ballThrownRef.current) {
          ballVelRef.current.set(0, 0, 0);
          ballThrownRef.current = false;
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
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      // Imp 29: Clean up touch listeners (they auto-cleanup with canvas removal)
      if (roomRef.current) {
        roomRef.current.feedingCtrl.dispose();
        roomRef.current.foodDisplay.dispose();
        roomRef.current.dispose();
        roomRef.current = null;
      }
      renderer.dispose();
    };
  }, [petThePet, showMessage, applyFoodStats]);

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
  // Imp 30: Computed mood
  const mood = getPetMood(stats);
  // Imp 31: Sorted inventory
  const sortedInventory = [...inventory].sort((a, b) => {
    if (inventorySort === "rarity") {
      const ra = getFoodData(a.foodId)?.rarity || "common";
      const rb = getFoodData(b.foodId)?.rarity || "common";
      const order: Record<string, number> = { legendary: 0, rare: 1, common: 2 };
      return (order[ra] ?? 2) - (order[rb] ?? 2);
    }
    if (inventorySort === "name") {
      const na = getFoodData(a.foodId)?.name || "";
      const nb = getFoodData(b.foodId)?.name || "";
      return na.localeCompare(nb);
    }
    return b.addedAt - a.addedAt; // newest first
  });
  // Imp 32: Format play time
  const formatPlayTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden" role="main" aria-label="Virtual Pet">
      {/* Imp 33: Level-up celebration overlay */}
      {showLevelUp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <p className="text-6xl mb-2">{"\u2B50"}</p>
            <p className="text-3xl font-bold text-yellow-300">Level Up!</p>
            <p className="text-xl text-yellow-200">Level {stats.level}</p>
          </div>
        </div>
      )}

      {/* Painting Dialog Overlay */}
      {showPaintingDialog && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { if (!paintingRenameMode && !paintingGenerating) setShowPaintingDialog(false); }}>
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Painting Preview */}
            <div className="bg-gradient-to-b from-amber-900/30 to-gray-800 p-4">
              <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-amber-600/50 shadow-lg mb-3">
                <img
                  src={paintingData.imageUrl || valleyNetImage}
                  alt={paintingData.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = valleyNetImage; }}
                />
              </div>
              <h3 className="text-white font-bold text-center text-lg">"{paintingData.title}"</h3>
              <p className="text-center text-xs text-gray-400 mt-1">
                {paintingData.isPrint ? "Print" : "Original Painting"} by Valley Net
              </p>
              <p className="text-center text-2xl font-bold text-green-400 mt-2">
                This painting is worth ${paintingData.value}
              </p>
              <p className="text-center text-xs text-yellow-300 mt-1">
                🎨 Painting Skill: {petSkills.painting} | 💰 Wallet: ${petMoney}
              </p>
            </div>

            {/* Rename Mode */}
            {paintingRenameMode ? (
              <div className="p-4 space-y-3">
                <h4 className="text-white font-bold text-sm">Rename Painting</h4>
                <input
                  type="text"
                  value={paintingRenameText}
                  onChange={(e) => setPaintingRenameText(e.target.value.slice(0, 64))}
                  placeholder="Enter new title..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-gray-500 text-[10px]">{paintingRenameText.length}/64 characters</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setPaintingRenameSuggesting(true);
                      try {
                        const suggestion = await invoke<string>("ai_chat_complete", {
                          messages: [{ role: "user", content: `Suggest a creative 8-32 character painting title. Just respond with the title, nothing else. Be creative and artistic.` }],
                        });
                        setPaintingRenameText(suggestion.trim().replace(/"/g, "").slice(0, 32));
                      } catch {
                        setPaintingRenameText("Starry Whiskers " + Math.floor(Math.random() * 100));
                      }
                      setPaintingRenameSuggesting(false);
                    }}
                    disabled={paintingRenameSuggesting}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-bold transition"
                  >
                    {paintingRenameSuggesting ? "Thinking..." : "✨ Get Suggestion"}
                  </button>
                  <button
                    onClick={() => {
                      if (paintingRenameText.trim()) {
                        const newData = { ...paintingData, title: paintingRenameText.trim() };
                        setPaintingData(newData);
                        if (roomRef.current) roomRef.current.paintingCtrl.setImage(newData.imageUrl);
                        showMessage(`Painting renamed to "${newData.title}"`);
                      }
                      setPaintingRenameMode(false);
                    }}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Save
                  </button>
                </div>
                <button onClick={() => setPaintingRenameMode(false)} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold transition">
                  Cancel
                </button>
              </div>
            ) : paintingGenerating ? (
              <div className="p-4 space-y-3">
                <h4 className="text-white font-bold text-sm">Generating New Painting...</h4>
                <input
                  type="text"
                  value={paintingGenPrompt}
                  onChange={(e) => setPaintingGenPrompt(e.target.value)}
                  placeholder="Enter painting prompt or leave for AI suggestion..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const prompt = paintingGenPrompt.trim() || "A beautiful abstract painting with vibrant colors, artistic style";
                      try {
                        showMessage("Generating painting...");
                        const imageUrl = await invoke<string>("ai_generate_image", { prompt: `${prompt}. Style: oil painting, artistic, gallery quality` });
                        // Calculate new value based on skill
                        const minVal = Math.max(1, Math.floor(petSkills.painting * 0.3));
                        const maxVal = Math.min(100, Math.floor(20 + petSkills.painting * 0.8));
                        const newValue = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
                        const newData: PaintingData = {
                          imageUrl,
                          title: prompt.slice(0, 32) || "New Painting",
                          value: newValue,
                          isPrint: false,
                        };
                        setPaintingData(newData);
                        if (roomRef.current) roomRef.current.paintingCtrl.setImage(imageUrl);
                        // Increase painting skill
                        setPetSkills((s) => ({ ...s, painting: Math.min(100, s.painting + 2) }));
                        showMessage(`New painting created! Worth $${newValue}`);
                      } catch (err) {
                        showMessage("Failed to generate painting. Check API key.");
                        console.error("Painting generation error:", err);
                      }
                      setPaintingGenerating(false);
                    }}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    🎨 Generate
                  </button>
                  <button
                    onClick={() => setPaintingGenerating(false)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div className="p-4 space-y-2">
                {/* Sell & Paint Again */}
                <button
                  onClick={() => {
                    const earned = paintingData.isPrint ? 5 : paintingData.value;
                    setPetMoney((m) => m + earned);
                    showMessage(`Sold "${paintingData.title}" for $${earned}! 💰`);
                    setPaintingGenerating(true);
                    setPaintingGenPrompt("");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  💰 Sell & Paint Again (${paintingData.isPrint ? 5 : paintingData.value})
                </button>

                {/* Download */}
                <button
                  onClick={async () => {
                    try {
                      const year = new Date().getFullYear();
                      const defaultName = `${paintingData.title}-\u{1F480}\u{1F3A8}-PetPainting_${year}.png`;
                      const filePath = await saveDialog({
                        defaultPath: defaultName,
                        filters: [{ name: "PNG Image", extensions: ["png"] }],
                      });
                      if (filePath) {
                        // Fetch the image and save it
                        const response = await fetch(paintingData.imageUrl || valleyNetImage);
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        await invoke("write_file_bytes", { path: filePath, contents: Array.from(uint8Array) });
                        showMessage(`Painting saved to ${String(filePath).split(/[/\\]/).pop()}`);
                      }
                    } catch (err) {
                      // Fallback: browser download
                      try {
                        const a = document.createElement("a");
                        a.href = paintingData.imageUrl || valleyNetImage;
                        const year = new Date().getFullYear();
                        a.download = `${paintingData.title}-\u{1F480}\u{1F3A8}-PetPainting_${year}.png`;
                        a.click();
                        showMessage("Download started!");
                      } catch {
                        showMessage("Download failed.");
                      }
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  📥 Download
                </button>

                {/* Rename */}
                <button
                  onClick={() => {
                    setPaintingRenameText(paintingData.title);
                    setPaintingRenameMode(true);
                  }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  ✏️ Rename
                </button>

                {/* Replace with Print */}
                <button
                  onClick={async () => {
                    try {
                      const earned = paintingData.isPrint ? 5 : paintingData.value;
                      const selected = await openDialog({
                        multiple: false,
                        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }],
                      });
                      if (selected) {
                        const filePath = typeof selected === "string" ? selected : (selected as unknown as string[])[0];
                        if (filePath) {
                          // Sell current painting first
                          setPetMoney((m) => m + earned);
                          showMessage(`Sold old painting for $${earned}. Replaced with print!`);
                          // Use Tauri asset protocol or file:// URL
                          const fileUrl = `asset://localhost/${encodeURIComponent(filePath)}`;
                          const newData: PaintingData = {
                            imageUrl: fileUrl,
                            title: filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "My Print",
                            value: 5,
                            isPrint: true,
                          };
                          setPaintingData(newData);
                          if (roomRef.current) roomRef.current.paintingCtrl.setImage(fileUrl);
                        }
                      }
                    } catch (err) {
                      showMessage("Could not load image file.");
                      console.error("Print replace error:", err);
                    }
                  }}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  🖼️ Replace with Print ($5 value)
                </button>

                {/* Close */}
                <button
                  onClick={() => setShowPaintingDialog(false)}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold transition mt-2"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header - Imp 34: Mood display, Imp 35: ARIA */}
      <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-red-900 text-white px-4 py-3 flex justify-between items-center shadow-lg z-20" role="banner">
        <div className="flex items-center gap-3">
          <img src={valleyNetImage} alt="Valley Net" className="w-10 h-10 rounded-full border-2 border-pink-400 object-cover" />
          <div>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
              Valley Net's Room
              <span className={`text-sm ${mood.color}`} title={mood.label}>{mood.emoji}</span>
            </h1>
            <p className="text-xs text-pink-300">Level {stats.level} - {stats.xp}/{xpNeeded} XP {petMoney > 0 && <span className="text-yellow-300 ml-1">💰${petMoney}</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Imp 36: Stat warning */}
          {statNotif && (
            <div className="bg-red-500/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold animate-pulse max-w-[200px] truncate">
              {statNotif}
            </div>
          )}
          {petMessage && (
            <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm animate-pulse max-w-xs truncate">
              {petMessage}
            </div>
          )}
          {/* Imp 37: Quick link to Alive Speech */}
          <button onClick={() => navigate("/alive-speech")} className="px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 rounded-lg text-xs font-bold transition" title="Talk to Valley Net">
            {"\uD83D\uDE4A"} Talk
          </button>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition" aria-label="Exit to launcher">
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

          {/* Imp 38: Controls overlay with touch hints */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs space-y-1" role="complementary">
            <p className="font-bold text-pink-300">Controls</p>
            <p>Click/tap pet to pet her</p>
            <p>Click/tap ball to throw</p>
            <p>Click/tap painting to interact</p>
            <p>Drag tail to play (she dislikes it!)</p>
          </div>

          {/* Feeding phase indicator */}
          {feedingPhase !== "idle" && feedingPhase !== "done" && (
            <div className="absolute bottom-14 left-3 bg-orange-600/90 backdrop-blur px-3 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-2 animate-pulse">
              {feedingPhase === "walking_to_storage" && "🚶 Walking to food..."}
              {feedingPhase === "taking_food" && "🤲 Taking food..."}
              {feedingPhase === "walking_to_microwave" && "🚶 Going to microwave..."}
              {feedingPhase === "microwaving" && "⏳ Microwaving... (5s)"}
              {feedingPhase === "taking_from_microwave" && "🤲 Taking from microwave..."}
              {feedingPhase === "walking_to_table" && "🚶 Walking to table..."}
              {feedingPhase === "jumping_on_table" && "⬆️ Jumping on table!"}
              {feedingPhase === "eating" && "😋 Eating! Yum!"}
              {feedingPhase === "satisfaction" && "⭐ So satisfied!"}
              {feedingPhase === "jumping_off_table" && "⬇️ Jumping down..."}
            </div>
          )}

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
          {/* Imp 39: Tab buttons with skills tab */}
          <div className="flex bg-gray-900" role="tablist">
            {(["stats", "food", "games", "skills", "info"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setMiniGame("none"); }}
                className={`flex-1 py-2 text-[11px] font-bold transition ${
                  activeTab === tab ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {tab === "stats" ? "📊" : tab === "food" ? "🍕" : tab === "games" ? "🎮" : tab === "skills" ? "🎨" : "ℹ️"}
                <span className="hidden sm:inline"> {tab === "stats" ? "Stats" : tab === "food" ? "Food" : tab === "games" ? "Games" : tab === "skills" ? "Skills" : "Info"}</span>
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

                {/* Imp 40: Daily bonus button */}
                {!dailyBonusClaimed && (
                  <button onClick={claimDailyBonus} className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white rounded-lg font-bold text-sm transition animate-pulse shadow-lg">
                    {"\uD83C\uDF81"} Claim Daily Bonus! (+20 XP)
                  </button>
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

                {/* Imp 41: Inventory count with limit */}
                <p className="text-gray-400 text-xs">{inventory.length}/{MAX_INVENTORY} items in inventory</p>

                {/* Imp 42: Sort controls */}
                {inventory.length > 1 && (
                  <div className="flex gap-1">
                    {(["newest", "rarity", "name"] as const).map((s) => (
                      <button key={s} onClick={() => setInventorySort(s)} className={`flex-1 py-1 text-[10px] font-bold rounded transition ${inventorySort === s ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
                        {s === "newest" ? "Newest" : s === "rarity" ? "Rarity" : "A-Z"}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {sortedInventory.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No food yet!</p>
                  ) : (
                    sortedInventory.map((item) => {
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

            {/* SKILLS TAB */}
            {activeTab === "skills" && (
              <div className="space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2">🎨 Skills</h3>

                {/* Painting Skill */}
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-sm">🖌️ Painting</span>
                    <span className="text-yellow-300 text-xs font-bold">
                      {petSkills.painting < 10 ? "Novice" : petSkills.painting < 25 ? "Apprentice" : petSkills.painting < 50 ? "Journeyman" : petSkills.painting < 75 ? "Expert" : petSkills.painting < 90 ? "Master" : "Grandmaster"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-600 rounded-full h-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${petSkills.painting}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{petSkills.painting}</span>
                  </div>
                  <p className="text-gray-400 text-[10px]">
                    Higher skill increases painting value range. Improves when cat admires paintings.
                  </p>
                </div>

                {/* Skill Milestones */}
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-1">
                  <h4 className="text-white font-bold text-xs mb-2">Milestones</h4>
                  {[
                    { level: 10, title: "First Brushstroke", icon: "🖌️" },
                    { level: 25, title: "Color Theory", icon: "🎨" },
                    { level: 50, title: "Canvas Master", icon: "🖼️" },
                    { level: 75, title: "Art Dealer", icon: "💎" },
                    { level: 90, title: "Grandmaster Painter", icon: "👑" },
                  ].map((m) => (
                    <div key={m.level} className={`flex items-center gap-2 text-xs ${petSkills.painting >= m.level ? "text-yellow-300" : "text-gray-500"}`}>
                      <span>{petSkills.painting >= m.level ? "✅" : "🔒"}</span>
                      <span>{m.icon} {m.title}</span>
                      <span className="ml-auto text-[10px]">Lv.{m.level}</span>
                    </div>
                  ))}
                </div>

                {/* Painting Economy Stats */}
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <h4 className="text-white font-bold text-xs">Painting Economy</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Painting</span>
                      <span className="text-white">"{paintingData.title}"</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Painting Value</span>
                      <span className="text-green-400">${paintingData.value}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className={paintingData.isPrint ? "text-gray-300" : "text-yellow-300"}>
                        {paintingData.isPrint ? "Print ($5)" : "Original"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wallet</span>
                      <span className="text-yellow-300 font-bold">${petMoney}</span>
                    </div>
                  </div>
                </div>

                {/* Value Range Info */}
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3 text-xs text-indigo-300">
                  <p className="font-bold mb-1">Value Range at Skill {petSkills.painting}:</p>
                  <p>${Math.max(1, Math.floor(petSkills.painting * 0.3))} - ${Math.min(100, Math.floor(20 + petSkills.painting * 0.8))}</p>
                  <p className="text-[10px] text-indigo-400 mt-1">Sell paintings to earn money. Higher skill = higher values.</p>
                </div>
              </div>
            )}

            {/* Imp 43: INFO TAB */}
            {activeTab === "info" && (
              <div className="space-y-3">
                <h3 className="text-white font-bold">Pet Info</h3>
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Mood</span><span className={mood.color}>{mood.emoji} {mood.label}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Level</span><span className="text-white">{stats.level}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total XP Needed</span><span className="text-white">{xpNeeded}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Bond Level</span><span className="text-purple-400">{Math.round(stats.bond)}%</span></div>
                </div>
                <h3 className="text-white font-bold">Play Stats</h3>
                <div className="bg-gray-700/50 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Total Play Time</span><span className="text-white">{formatPlayTime(petMeta.totalPlayMs)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Ball Throws</span><span className="text-white">{petMeta.ballThrows}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Memory Best</span><span className="text-white">{petMeta.memoryBest < 999 ? `${petMeta.memoryBest} moves` : "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Quiz Best</span><span className="text-white">{petMeta.quizBest > 0 ? `${petMeta.quizBest}/${QUIZ_QUESTIONS.length}` : "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Foods in Inventory</span><span className="text-white">{inventory.length}/{MAX_INVENTORY}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Daily Bonus</span><span className={dailyBonusClaimed ? "text-green-400" : "text-yellow-400"}>{dailyBonusClaimed ? "Claimed" : "Available!"}</span></div>
                </div>
                {/* Imp 44: Export stats button */}
                <button onClick={() => {
                  const data = JSON.stringify({ stats, petMeta, inventory: inventory.length }, null, 2);
                  navigator.clipboard.writeText(data).then(() => showMessage("Stats copied to clipboard!"));
                }} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold transition">
                  {"\uD83D\uDCCB"} Copy Stats to Clipboard
                </button>
              </div>
            )}
          </div>

          {/* Imp 45: Bottom status bar with mood and play time */}
          <div className="bg-gray-900 px-4 py-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className={mood.color}>{mood.emoji}</span> Lv.{stats.level} | {stats.xp}/{xpNeeded} XP</span>
            <span className="flex items-center gap-2">
              {petMoney > 0 && <span className="text-yellow-400">💰${petMoney}</span>}
              <span>🎨{petSkills.painting}</span>
              <span>{inventory.length} foods</span>
              <span>{formatPlayTime(petMeta.totalPlayMs)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
