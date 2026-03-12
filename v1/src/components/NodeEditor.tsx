import { useState } from "react";

const INITIAL_NODES = [
  {
    id: "n1",
    type: "MediaIn",
    title: "Media In",
    color: "#e94560",
    x: 60,
    y: 100,
    inputs: [],
    outputs: [{ name: "Output", color: "#e94560" }],
  },
  {
    id: "n2",
    type: "ColorCorrect",
    title: "Color Correct",
    color: "#7b2ff7",
    x: 300,
    y: 60,
    inputs: [{ name: "Input", color: "#7b2ff7" }],
    outputs: [{ name: "Output", color: "#7b2ff7" }],
  },
  {
    id: "n3",
    type: "Blur",
    title: "Gaussian Blur",
    color: "#00d2ff",
    x: 300,
    y: 200,
    inputs: [{ name: "Input", color: "#00d2ff" }],
    outputs: [{ name: "Output", color: "#00d2ff" }],
  },
  {
    id: "n4",
    type: "Merge",
    title: "Merge",
    color: "#fbbf24",
    x: 540,
    y: 120,
    inputs: [
      { name: "Foreground", color: "#fbbf24" },
      { name: "Background", color: "#fbbf24" },
    ],
    outputs: [{ name: "Output", color: "#fbbf24" }],
  },
  {
    id: "n5",
    type: "MediaOut",
    title: "Media Out",
    color: "#4ade80",
    x: 760,
    y: 120,
    inputs: [{ name: "Input", color: "#4ade80" }],
    outputs: [],
  },
];

const CONNECTIONS = [
  { from: "n1", fromPort: 0, to: "n2", toPort: 0 },
  { from: "n1", fromPort: 0, to: "n3", toPort: 0 },
  { from: "n2", fromPort: 0, to: "n4", toPort: 0 },
  { from: "n3", fromPort: 0, to: "n4", toPort: 1 },
  { from: "n4", fromPort: 0, to: "n5", toPort: 0 },
];

export default function NodeEditor() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  
  const NODE_W = 160;
  const PORT_SPACING = 24;

  function getOutputPos(nodeId: string, portIdx: number) {
    const node = nodes.find((n) => n.id === nodeId)!;
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + NODE_W,
      y: node.y + 36 + portIdx * PORT_SPACING + 12,
    };
  }

  function getInputPos(nodeId: string, portIdx: number) {
    const node = nodes.find((n) => n.id === nodeId)!;
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x,
      y: node.y + 36 + portIdx * PORT_SPACING + 12,
    };
  }

  const handleAddNode = () => {
    const typeNames = ["ColorCorrect", "Blur", "Transform", "Glow", "Mask"];
    const colors = ["#7b2ff7", "#00d2ff", "#f59e0b", "#ec4899", "#8b5cf6"];
    const randIdx = Math.floor(Math.random() * typeNames.length);
    const type = typeNames[randIdx];
    
    const newNode = {
      id: `n_${Date.now()}`,
      type,
      title: type,
      color: colors[randIdx],
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      inputs: [{ name: "Input", color: colors[randIdx] }],
      outputs: [{ name: "Output", color: colors[randIdx] }],
    };
    setNodes(prev => [...prev, newNode]);
  };

  return (
    <div className="panel h-full m-1 flex flex-col">
      <div className="panel-header">
        <h3>Node Editor — Node Mode</h3>
        <div className="flex gap-1">
          <button 
            onClick={handleAddNode}
            className="btn text-[10px] py-1"
          >
            + Add Node
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#08080c]">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {CONNECTIONS.map((conn, i) => {
            const from = getOutputPos(conn.from, conn.fromPort);
            const to = getInputPos(conn.to, conn.toPort);
            const cx1 = from.x + (to.x - from.x) * 0.5;
            const cx2 = to.x - (to.x - from.x) * 0.5;
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} C ${cx1} ${from.y}, ${cx2} ${to.y}, ${to.x} ${to.y}`}
                className="node-connection"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="node animate-fade-in"
            style={{ left: node.x, top: node.y, width: NODE_W }}
          >
            <div className="node-title" style={{ background: node.color }}>
              {node.title}
            </div>
            <div className="node-body">
              {node.inputs.map((inp, i) => (
                <div key={`in-${i}`} className="node-port">
                  <div
                    className="node-port-dot"
                    style={{ borderColor: inp.color, background: inp.color + "33" }}
                  />
                  <span>{inp.name}</span>
                </div>
              ))}
              {node.outputs.map((out, i) => (
                <div key={`out-${i}`} className="node-port justify-end">
                  <span>{out.name}</span>
                  <div
                    className="node-port-dot"
                    style={{ borderColor: out.color, background: out.color + "33" }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
