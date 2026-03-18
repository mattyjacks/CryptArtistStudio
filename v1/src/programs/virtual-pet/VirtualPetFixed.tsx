import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useWorkspace } from "../../utils/workspace";
import { useApiKeys } from "../../utils/apiKeys";
import { FOOD_DATA, type FoodItem } from "./FoodData";

interface InventoryItem {
  id: string;
  foodId: string;
  addedAt: number;
  storage: "shelf" | "fridge" | "freezer" | "none";
}

const ROOM_SIZE = 20;

export default function VirtualPet() {
  const navigate = useNavigate();
  const wsCtx = useWorkspace();
  const apiKeys = useApiKeys();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [petHealth, setPetHealth] = useState(100);
  const [petIntoxication, setPetIntoxication] = useState(0);
  const [lastFoodAdded, setLastFoodAdded] = useState<string>("");
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const getFoodData = (foodId: string): FoodItem | undefined => {
    return FOOD_DATA.find((f) => f.id === foodId);
  };

  const addRandomFood = () => {
    const randomFood = FOOD_DATA[Math.floor(Math.random() * FOOD_DATA.length)];
    const newItem: InventoryItem = {
      id: `${randomFood.id}-${Date.now()}`,
      foodId: randomFood.id,
      addedAt: Date.now(),
      storage: randomFood.storage,
    };
    setInventory((prev) => [...prev, newItem]);
    setLastFoodAdded(randomFood.emoji);
    setTimeout(() => setLastFoodAdded(""), 2000);
  };

  const useFood = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const foodData = getFoodData(item.foodId);
    if (!foodData) return;

    setPetHealth((prev) => Math.max(0, Math.min(100, prev + foodData.stats.health)));
    
    if (foodData.isAlcohol) {
      setPetIntoxication((prev) => {
        const newIntox = prev + foodData.alcoholContent;
        if (newIntox > 50) {
          setPetHealth((h) => Math.max(0, h - 15));
        }
        return newIntox;
      });
    }
    
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -ROOM_SIZE;
    directionalLight.shadow.camera.right = ROOM_SIZE;
    directionalLight.shadow.camera.top = ROOM_SIZE;
    directionalLight.shadow.camera.bottom = -ROOM_SIZE;
    scene.add(directionalLight);

    const roomGeometry = new THREE.BoxGeometry(ROOM_SIZE, ROOM_SIZE, ROOM_SIZE);
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }),
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }),
      new THREE.MeshStandardMaterial({ color: 0xfffacd, side: THREE.BackSide }),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c, side: THREE.BackSide }),
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }),
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }),
    ];
    const room = new THREE.Mesh(roomGeometry, materials);
    scene.add(room);

    const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -ROOM_SIZE / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const furnitureItems = [
      { id: "bed", name: "Bed", emoji: "🛏️", pos: [-6, 0.5, -8], scale: [3, 1, 2], color: 0xff69b4 },
      { id: "chair1", name: "Chair", emoji: "🪑", pos: [5, 0.5, -6], scale: [0.8, 1.2, 0.8], color: 0x8b4513 },
      { id: "table", name: "Table", emoji: "🪑", pos: [0, 0.8, 0], scale: [2, 0.3, 2], color: 0xd2691e },
      { id: "shelf", name: "Shelf", emoji: "📚", pos: [7, 2, 5], scale: [2, 3, 0.5], color: 0x654321 },
      { id: "lamp", name: "Lamp", emoji: "💡", pos: [-7, 3, 7], scale: [0.3, 2, 0.3], color: 0xffff00 },
      { id: "rug", name: "Rug", emoji: "🟫", pos: [0, 0.05, 2], scale: [4, 0.1, 3], color: 0x8b7355 },
      { id: "plant", name: "Plant", emoji: "🌿", pos: [6, 1, -7], scale: [0.5, 1.5, 0.5], color: 0x228b22 },
      { id: "painting", name: "Painting", emoji: "🎨", pos: [-9.9, 3, 0], scale: [1.5, 1.5, 0.1], color: 0xff6347 },
    ];

    furnitureItems.forEach((item) => {
      const geo = new THREE.BoxGeometry(item.scale[0], item.scale[1], item.scale[2]);
      const mat = new THREE.MeshStandardMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: item.id, name: item.name };
      scene.add(mesh);
    });

    const petGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const petMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const petMesh = new THREE.Mesh(petGeo, petMat);
    petMesh.position.set(0, 1, 0);
    petMesh.castShadow = true;
    petMesh.receiveShadow = true;
    scene.add(petMesh);

    let cameraX = 0;
    let cameraZ = 15;
    const keys: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const speed = 0.3;
      if (keys["w"] || keys["arrowup"]) cameraZ -= speed;
      if (keys["s"] || keys["arrowdown"]) cameraZ += speed;
      if (keys["a"] || keys["arrowleft"]) cameraX -= speed;
      if (keys["d"] || keys["arrowright"]) cameraX += speed;

      cameraX = Math.max(-ROOM_SIZE / 2 + 2, Math.min(ROOM_SIZE / 2 - 2, cameraX));
      cameraZ = Math.max(-ROOM_SIZE / 2 + 2, Math.min(ROOM_SIZE / 2 - 2, cameraZ));

      camera.position.set(cameraX, 8, cameraZ);
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };

    animate();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col">
      <div className="bg-black bg-opacity-70 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          <div>
            <h1 className="text-2xl font-bold">Valley Net's 3D Room</h1>
            <p className="text-xs opacity-75">Use WASD/Arrows to move camera</p>
          </div>
        </div>
        <button onClick={() => navigate("/")} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold">
          Exit
        </button>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 bg-black rounded-lg shadow-lg overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        <div className="w-96 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
            <h2 className="text-lg font-bold">🍕 Food & Pet Status</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="font-bold text-purple-600 mb-2">Pet Health</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-bold">Health: {Math.round(petHealth)}/100</p>
                  <div className="w-full bg-gray-300 rounded h-3">
                    <div className="bg-red-500 h-3 rounded transition-all" style={{ width: `${petHealth}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold">Intoxication: {Math.round(petIntoxication)}</p>
                  <div className="w-full bg-gray-300 rounded h-3">
                    <div className="bg-yellow-500 h-3 rounded transition-all" style={{ width: `${Math.min(petIntoxication, 100)}%` }} />
                  </div>
                  {petIntoxication > 50 && <p className="text-xs text-red-600 font-bold mt-1">🤢 Pet is drunk!</p>}
                </div>
              </div>
            </div>

            <button
              onClick={addRandomFood}
              className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold transition"
            >
              🍕 Add Random Food
            </button>

            <div>
              <h3 className="font-bold text-purple-600 mb-2">Inventory ({inventory.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {inventory.length === 0 ? (
                  <p className="text-gray-500 text-sm">No food yet. Click "Add Random Food"!</p>
                ) : (
                  inventory.map((item) => {
                    const foodData = getFoodData(item.foodId);
                    if (!foodData) return null;
                    const isExpired = foodData.expiresIn && Date.now() - item.addedAt > foodData.expiresIn * 24 * 60 * 60 * 1000;
                    return (
                      <div key={item.id} className={`p-2 rounded border text-xs ${isExpired ? "bg-red-100 border-red-400" : "bg-blue-50 border-blue-300"}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">{foodData.emoji} {foodData.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${foodData.rarity === "legendary" ? "bg-yellow-300" : foodData.rarity === "rare" ? "bg-purple-300" : "bg-blue-200"}`}>
                            {foodData.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          Storage: {item.storage} | Cost: ${foodData.cost}
                          {foodData.isAlcohol && ` | 🍷 ${foodData.alcoholContent}%`}
                        </p>
                        {isExpired && <p className="text-red-600 font-bold text-xs mb-1">❌ EXPIRED</p>}
                        <button
                          onClick={() => useFood(item.id)}
                          disabled={isExpired ? true : false}
                          className={`w-full text-xs px-2 py-1 rounded font-bold transition ${
                            isExpired ? "bg-gray-400 cursor-not-allowed text-gray-600" : "bg-green-500 hover:bg-green-600 text-white"
                          }`}
                        >
                          Use
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {lastFoodAdded && (
              <div className="bg-green-100 border-2 border-green-500 p-3 rounded text-center animate-pulse">
                <p className="text-3xl">{lastFoodAdded}</p>
                <p className="text-xs text-green-700 font-bold">Added to inventory!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
