import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useWorkspace } from "../../utils/workspace";
import { useApiKeys } from "../../utils/apiKeys";

interface Furniture {
  id: string;
  name: string;
  emoji: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: number;
  type: "bed" | "chair" | "table" | "shelf" | "lamp" | "rug" | "plant" | "decoration";
}

const FURNITURE_ITEMS: Furniture[] = [
  { id: "bed", name: "Bed", emoji: "🛏️", position: { x: -6, y: 0.5, z: -8 }, scale: { x: 3, y: 1, z: 2 }, color: 0xff69b4, type: "bed" },
  { id: "chair1", name: "Chair", emoji: "🪑", position: { x: 5, y: 0.5, z: -6 }, scale: { x: 0.8, y: 1.2, z: 0.8 }, color: 0x8b4513, type: "chair" },
  { id: "table", name: "Table", emoji: "🪑", position: { x: 0, y: 0.8, z: 0 }, scale: { x: 2, y: 0.3, z: 2 }, color: 0xd2691e, type: "table" },
  { id: "shelf", name: "Shelf", emoji: "📚", position: { x: 7, y: 2, z: 5 }, scale: { x: 2, y: 3, z: 0.5 }, color: 0x654321, type: "shelf" },
  { id: "lamp", name: "Lamp", emoji: "💡", position: { x: -7, y: 3, z: 7 }, scale: { x: 0.3, y: 2, z: 0.3 }, color: 0xffff00, type: "lamp" },
  { id: "rug", name: "Rug", emoji: "🟫", position: { x: 0, y: 0.05, z: 2 }, scale: { x: 4, y: 0.1, z: 3 }, color: 0x8b7355, type: "rug" },
  { id: "plant", name: "Plant", emoji: "🌿", position: { x: 6, y: 1, z: -7 }, scale: { x: 0.5, y: 1.5, z: 0.5 }, color: 0x228b22, type: "plant" },
  { id: "painting", name: "Painting", emoji: "🎨", position: { x: -9.9, y: 3, z: 0 }, scale: { x: 1.5, y: 1.5, z: 0.1 }, color: 0xff6347, type: "decoration" },
];

const ROOM_SIZE = 20;

export default function VirtualPet3DRoom() {
  const navigate = useNavigate();
  const wsCtx = useWorkspace();
  const apiKeys = useApiKeys();

  const [cameraPos, setCameraPos] = useState({ x: 0, y: 5, z: 15 });
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 2, z: 0 });
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [petPos, setPetPos] = useState({ x: 0, y: 1, z: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const petGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const furnitureObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create room (cube)
    const roomGeometry = new THREE.BoxGeometry(ROOM_SIZE, ROOM_SIZE, ROOM_SIZE);
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }), // right (pink)
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }), // left (pink)
      new THREE.MeshStandardMaterial({ color: 0xfffacd, side: THREE.BackSide }), // top (light yellow)
      new THREE.MeshStandardMaterial({ color: 0xd2b48c, side: THREE.BackSide }), // bottom (tan)
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }), // front (pink)
      new THREE.MeshStandardMaterial({ color: 0xffe4e1, side: THREE.BackSide }), // back (pink)
    ];
    const room = new THREE.Mesh(roomGeometry, materials);
    room.position.set(0, 0, 0);
    scene.add(room);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -ROOM_SIZE / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create furniture group
    const furnitureGroup = new THREE.Group();
    furnitureGroupRef.current = furnitureGroup;
    scene.add(furnitureGroup);

    // Add furniture
    FURNITURE_ITEMS.forEach((item) => {
      const geometry = new THREE.BoxGeometry(item.scale.x, item.scale.y, item.scale.z);
      const material = new THREE.MeshStandardMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(item.position.x, item.position.y, item.position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { furnitureId: item.id, name: item.name };
      furnitureGroup.add(mesh);
      furnitureObjectsRef.current.set(item.id, mesh);
    });

    // Create pet group
    const petGroup = new THREE.Group();
    petGroupRef.current = petGroup;
    scene.add(petGroup);

    // Create pet (simple sphere representation)
    const petGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const petMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const petMesh = new THREE.Mesh(petGeometry, petMaterial);
    petMesh.castShadow = true;
    petMesh.receiveShadow = true;
    petGroup.add(petMesh);

    // Add Valley Net image as billboard
    const canvas2d = document.createElement("canvas");
    canvas2d.width = 512;
    canvas2d.height = 512;
    const ctx = canvas2d.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#000000";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Valley Net", 256, 256);
    }
    const texture = new THREE.CanvasTexture(canvas2d);
    const planeGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const planeMaterial = new THREE.MeshStandardMaterial({ map: texture });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.y = 0.5;
    petGroup.add(plane);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Update camera
      camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
      camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

      // Pet movement
      petGroup.position.set(petPos.x, petPos.y, petPos.z);

      // Highlight selected furniture
      furnitureObjectsRef.current.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (id === selectedFurniture) {
          material.emissive.setHex(0x444444);
        } else {
          material.emissive.setHex(0x000000);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = -(e.clientY - rect.top) / rect.height * 2 + 1;
      setMousePos({ x, y });
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = -(e.clientY - rect.top) / rect.height * 2 + 1;

      const mouseVector = new THREE.Vector2(x, y);
      raycasterRef.current.setFromCamera(mouseVector, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        furnitureGroupRef.current?.children || []
      );

      if (intersects.length > 0) {
        const clicked = intersects[0].object as THREE.Mesh;
        setSelectedFurniture(clicked.userData.furnitureId);
      } else {
        setSelectedFurniture(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 0.5;
      const key = e.key.toLowerCase();

      if (key === "arrowup" || key === "w") {
        setCameraPos((p) => ({ ...p, z: p.z - speed }));
      } else if (key === "arrowdown" || key === "s") {
        setCameraPos((p) => ({ ...p, z: p.z + speed }));
      } else if (key === "arrowleft" || key === "a") {
        setCameraPos((p) => ({ ...p, x: p.x - speed }));
      } else if (key === "arrowright" || key === "d") {
        setCameraPos((p) => ({ ...p, x: p.x + speed }));
      } else if (key === "q") {
        setCameraPos((p) => ({ ...p, y: p.y + speed }));
      } else if (key === "e") {
        setCameraPos((p) => ({ ...p, y: p.y - speed }));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleMouseClick);
    window.addEventListener("keydown", handleKeyDown);

    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleMouseClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, [cameraPos, cameraTarget, petPos, selectedFurniture]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col">
      <div className="bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          <div>
            <h1 className="text-2xl font-bold">Valley Net's 3D Room</h1>
            <p className="text-xs opacity-75">Explore the room and interact with furniture</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition"
        >
          Exit
        </button>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 bg-black rounded-lg shadow-lg overflow-hidden relative">
          <canvas ref={canvasRef} className="w-full h-full" />

          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs space-y-1">
            <p className="font-bold">🎮 Room Controls:</p>
            <p>W/A/S/D or Arrows = Move Camera</p>
            <p>Q/E = Up/Down</p>
            <p>Click = Select Furniture</p>
          </div>

          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs space-y-1 max-w-xs">
            <p className="font-bold">📍 Furniture Coordinates:</p>
            {FURNITURE_ITEMS.map((item) => (
              <div
                key={item.id}
                className={`cursor-pointer hover:bg-gray-700 p-1 rounded transition ${
                  selectedFurniture === item.id ? "bg-blue-600" : ""
                }`}
                onClick={() => setSelectedFurniture(item.id)}
              >
                <p>
                  {item.emoji} {item.name}: ({item.position.x.toFixed(1)}, {item.position.y.toFixed(1)},
                  {item.position.z.toFixed(1)})
                </p>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs space-y-1">
            <p className="font-bold">📊 Pet Position:</p>
            <p>
              X: {petPos.x.toFixed(1)} | Y: {petPos.y.toFixed(1)} | Z: {petPos.z.toFixed(1)}
            </p>
            <p className="text-yellow-300 mt-2">Camera Position:</p>
            <p>
              X: {cameraPos.x.toFixed(1)} | Y: {cameraPos.y.toFixed(1)} | Z: {cameraPos.z.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="w-80 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
            <h2 className="text-lg font-bold">🏠 Room Info</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="font-bold text-purple-600 mb-2">Selected Furniture:</h3>
              {selectedFurniture ? (
                (() => {
                  const item = FURNITURE_ITEMS.find((f) => f.id === selectedFurniture);
                  return item ? (
                    <div className="bg-gray-100 p-3 rounded">
                      <p className="text-2xl mb-2">{item.emoji}</p>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-gray-600 mt-2">Position:</p>
                      <p className="text-sm font-mono">
                        ({item.position.x}, {item.position.y}, {item.position.z})
                      </p>
                      <p className="text-xs text-gray-600 mt-2">Scale:</p>
                      <p className="text-sm font-mono">
                        ({item.scale.x}, {item.scale.y}, {item.scale.z})
                      </p>
                      <p className="text-xs text-gray-600 mt-2">Type: {item.type}</p>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-gray-500 text-sm">Click on furniture to select it</p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-purple-600 mb-2">Room Dimensions:</h3>
              <div className="bg-gray-100 p-3 rounded text-sm space-y-1">
                <p>Width: {ROOM_SIZE}m</p>
                <p>Height: {ROOM_SIZE}m</p>
                <p>Depth: {ROOM_SIZE}m</p>
                <p className="text-xs text-gray-600 mt-2">Total Furniture: {FURNITURE_ITEMS.length}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-purple-600 mb-2">Quick Actions:</h3>
              <button
                onClick={() => setPetPos({ x: 0, y: 1, z: 0 })}
                className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-bold transition mb-2"
              >
                Center Pet
              </button>
              <button
                onClick={() => setCameraPos({ x: 0, y: 5, z: 15 })}
                className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-bold transition"
              >
                Reset Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
