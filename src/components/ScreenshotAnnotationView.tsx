import React, { useState, useRef, useEffect } from "react";
import { Copy, Plus, Trash2, Undo, Type, MapPin, ArrowRight, Square, HelpCircle, Check, Eye } from "lucide-react";
import { Trade } from "../types";

interface DrawElement {
  id: string;
  type: "LINE" | "ZONE" | "ARROW" | "TEXT";
  points: number[]; // [startX, startY, endX, endY]
  text?: string;
  color: string;
}

interface ScreenshotAnnotationViewProps {
  selectedTrade: Trade | null;
  onSaveAnnotations: (annotationsJson: string, screenshotNotes: string) => void;
}

const CHART_PRESETS = [
  {
    name: "Key Support Zone Bounce",
    url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1000",
    desc: "A classical support level structure on Gold with clear retests.",
    defaultElements: [
      { id: "e1", type: "ZONE", points: [100, 320, 800, 360], color: "#10B981" },
      { id: "e2", type: "TEXT", points: [120, 310, 0, 0], text: "H4 Demands / Support Zone", color: "#10B981" },
      { id: "e arrow", type: "ARROW", points: [600, 330, 720, 180], color: "#3B82F6" }
    ] as DrawElement[]
  },
  {
    name: "Bearish Liquidity Sweep",
    url: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=1000",
    desc: "Price swept the clean relative high before rejecting aggressively.",
    defaultElements: [
      { id: "sw1", type: "LINE", points: [50, 150, 850, 150], color: "#EF4444" },
      { id: "sw2", type: "ZONE", points: [480, 110, 560, 160], color: "#F59E0B" },
      { id: "sw3", type: "TEXT", points: [490, 95, 0, 0], text: "Buy Stops Swept", color: "#F59E0B" }
    ] as DrawElement[]
  },
  {
    name: "Classic H1 Break & Retest",
    url: "https://images.unsplash.com/photo-15902836 central?auto=format&fit=crop&q=80&w=1000",
    desc: "Consolidation break with high-volume follow through.",
    defaultElements: [
      { id: "br1", type: "LINE", points: [100, 240, 800, 240], color: "#3B82F6" },
      { id: "br2", type: "ARROW", points: [450, 280, 520, 245], color: "#10B981" }
    ] as DrawElement[]
  },
  {
    name: "Blank Dark Canvas (Interactive Model)",
    url: "",
    desc: "A clean dark grid board to draft plans and annotations freely.",
    defaultElements: []
  }
];

export default function ScreenshotAnnotationView({
  selectedTrade,
  onSaveAnnotations
}: ScreenshotAnnotationViewProps) {
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [tool, setTool] = useState<"LINE" | "ZONE" | "ARROW" | "TEXT">("LINE");
  const [color, setColor] = useState("#3B82F6"); // default blue
  const [inputText, setInputText] = useState("");
  const [screenshotNotes, setScreenshotNotes] = useState("");
  const [bgImage, setBgImage] = useState(CHART_PRESETS[0].url);
  const [imageDesc, setImageDesc] = useState(CHART_PRESETS[0].desc);

  // Drawing process tracking refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Load existing annotations if available
  useEffect(() => {
    if (selectedTrade) {
      if (selectedTrade.annotations) {
        try {
          const parsed = JSON.parse(selectedTrade.annotations);
          if (Array.isArray(parsed)) {
            setElements(parsed);
          }
        } catch (e) {
          console.warn("Failed to parse existing annotations");
        }
      } else {
        // Preset default matching trade details if possible
        setElements(CHART_PRESETS[0].defaultElements);
      }
      setScreenshotNotes(selectedTrade.screenshotNotes || "");
    } else {
      setElements(CHART_PRESETS[0].defaultElements);
      setScreenshotNotes("");
    }
  }, [selectedTrade]);

  // Keep canvas synced with updates
  useEffect(() => {
    renderCanvas();
  }, [elements, bgImage, isDrawing, currentPos, tool, color]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background texture or grid if no template image
    if (!bgImage) {
      ctx.fillStyle = "#0c1524"; // dark canvas
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else {
      // Draw standard image template background
      const img = new Image();
      img.src = bgImage;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Cover fill keeping aspect ratio
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawAllStoredElements(ctx);
        if (isDrawing) {
          drawActiveElementPreview(ctx);
        }
      };
      // fallback in case of CORS limits or slow load
      img.onerror = () => {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "14px monospace";
        ctx.fillText("Failed to load overlay - Click to draw anyway", 200, 200);
        drawAllStoredElements(ctx);
        if (isDrawing) {
          drawActiveElementPreview(ctx);
        }
      };
      return;
    }

    drawAllStoredElements(ctx);
    if (isDrawing) {
      drawActiveElementPreview(ctx);
    }
  };

  const drawAllStoredElements = (ctx: CanvasRenderingContext2D) => {
    elements.forEach(el => {
      drawSingleElement(ctx, el);
    });
  };

  const drawSingleElement = (ctx: CanvasRenderingContext2D, el: DrawElement) => {
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = 3;

    if (el.type === "LINE") {
      ctx.beginPath();
      ctx.moveTo(el.points[0], el.points[1]);
      ctx.lineTo(el.points[2], el.points[3]);
      ctx.stroke();
    } else if (el.type === "ZONE") {
      const left = Math.min(el.points[0], el.points[2]);
      const top = Math.min(el.points[1], el.points[3]);
      const width = Math.abs(el.points[2] - el.points[0]);
      const height = Math.abs(el.points[3] - el.points[1]);
      ctx.strokeRect(left, top, width, height);
      ctx.fillStyle = el.color + "20"; // Transparency
      ctx.fillRect(left, top, width, height);
    } else if (el.type === "ARROW") {
      const [x1, y1, x2, y2] = el.points;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw arrow head
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 15 * Math.cos(angle - Math.PI / 6), y2 - 15 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - 15 * Math.cos(angle + Math.PI / 6), y2 - 15 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (el.type === "TEXT" && el.text) {
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillStyle = el.color;
      // Draw text background bubble
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      const metrics = ctx.measureText(el.text);
      ctx.fillRect(el.points[0] - 5, el.points[1] - 16, metrics.width + 10, 22);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(el.points[0] - 5, el.points[1] - 16, metrics.width + 10, 22);

      ctx.fillStyle = el.color;
      ctx.fillText(el.text, el.points[0], el.points[1]);
    }
  };

  const drawActiveElementPreview = (ctx: CanvasRenderingContext2D) => {
    const el: DrawElement = {
      id: "preview",
      type: tool,
      points: [startPos.x, startPos.y, currentPos.x, currentPos.y],
      color,
      text: tool === "TEXT" ? inputText || "Type plan note..." : undefined
    };
    drawSingleElement(ctx, el);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Reject tiny accidental micro clicks
    if (tool !== "TEXT" && Math.abs(x - startPos.x) < 4 && Math.abs(y - startPos.y) < 4) {
      return;
    }

    const newElement: DrawElement = {
      id: "el_" + Math.random().toString(36).substr(2, 9),
      type: tool,
      points: [startPos.x, startPos.y, x, y],
      color,
      text: tool === "TEXT" ? inputText || "Trader Note Level" : undefined
    };

    setElements(prev => [...prev, newElement]);
    renderCanvas();
  };

  const handleClearElements = () => {
    setElements([]);
  };

  const handleUndo = () => {
    setElements(prev => prev.slice(0, -1));
  };

  const handleSelectPreset = (p: typeof CHART_PRESETS[0]) => {
    setBgImage(p.url);
    setImageDesc(p.desc);
    setElements(p.defaultElements);
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBgImage(event.target.result as string);
          setImageDesc("Uploaded manual screenshot payload " + file.name);
          setElements([]); // Clear preset lines
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const stringified = JSON.stringify(elements);
    onSaveAnnotations(stringified, screenshotNotes);
    alert("🎨 Setup Annotations and plan markings updated successfully!");
  };

  // Live Auto Audit of elements & screenshot correctness
  const generateVisualCleannessAudit = () => {
    if (elements.length === 0) {
      return {
        score: "⚠️ N/A",
        status: "Missing Markup data",
        feedback: "Draw some chart plans, support/resistance key zones, or arrows to run instant structure checking diagnostics."
      };
    }

    const hasZone = elements.some(e => e.type === "ZONE");
    const hasLine = elements.some(e => e.type === "LINE");
    const hasArrow = elements.some(e => e.type === "ARROW");
    const hasText = elements.some(e => e.type === "TEXT");

    const activeTradeType = selectedTrade?.type || "BUY";
    const userNotesLower = (screenshotNotes + " " + (selectedTrade?.notes || "")).toLowerCase();
    
    let isPlanFollowed = true;
    let comments = [];

    if (hasZone && hasArrow) {
      comments.push("Excellent confluence markers: Chart clearly overlays high-value zones & structural arrow trajectories.");
    }
    if (!hasZone) {
      comments.push("Audit Suggestion: Draw a rect zone (Block Tool) to represent buy/sell orders liquidity range on critical support levels.");
    }
    if (!hasText) {
      comments.push("Recommendation: Add a plain Text Note overlay explaining your H1/H4 market structural bias reasonings directly.");
    }

    // Heuristics regarding user ignore warnings
    if (userNotesLower.includes("broke") || userNotesLower.includes("missed") || userNotesLower.includes("ignored")) {
      isPlanFollowed = false;
      comments.push("Your notes suggest you frequently ignore the level you marked or didn't follow the planned zone structure cleanly.");
    }

    return {
      score: isPlanFollowed ? "85/100" : "55/100",
      status: isPlanFollowed ? "Highly disciplined structure" : "Plan Deviation Spotted",
      feedback: comments.length > 0 ? comments.join(" ") : "Setup holds strong confluence indicators. Executing plans with high accuracy decreases random revenge outcomes."
    };
  };

  const visualAudit = generateVisualCleannessAudit();

  return (
    <div id="screenshot-markup-surface" className="grid grid-cols-1 xl:grid-cols-4 gap-6 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
      
      {/* Configuration & Preset tool panel */}
      <div id="markup-presets-controls" className="space-y-4 xl:col-span-1 border-r border-slate-800 pr-5">
        <div>
          <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">Interactive Board controls</span>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
            <Copy size={16} className="text-emerald-400" />
            Chart Markup Engine
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Select templates or drop screenshot captures directly, then place plan landmarks.</p>
        </div>

        {/* 1. SELECT PRESENTS / UPLOADS */}
        <div className="space-y-2">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">1. Setup Template Source</label>
          <div className="space-y-1.5">
            {CHART_PRESETS.map((p, idx) => (
              <button
                key={idx}
                id={`btn-preset-chart-${idx}`}
                onClick={() => handleSelectPreset(p)}
                className={`w-full text-left p-2 rounded text-xs border transition-all pointer-events-auto cursor-pointer ${
                  bgImage === p.url 
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" 
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850"
                }`}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-[9px] text-slate-500 truncate">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="pt-1.5">
            <span className="text-[10px] text-slate-500 font-mono block mb-1">... Or Upload custom trade capture:</span>
            <input
              id="file-screenshot-upload"
              type="file"
              accept="image/*"
              onChange={handleLocalImageUpload}
              className="w-full text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded p-1 file:bg-indigo-650 file:border-none file:text-[10px] file:text-white file:px-2 file:py-1 file:rounded file:cursor-pointer"
            />
          </div>
        </div>

        {/* 2. CHOOSE MARKUP DRAWING TOOL */}
        <div className="space-y-2.5">
          <label className="block text-[10px] font-mono text-slate-400 uppercase">2. Select Placement Tool</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { tag: "LINE", label: "S/R Line ─" },
              { tag: "ZONE", label: "Order Block █" },
              { tag: "ARROW", label: "Target Arrow ↗" },
              { tag: "TEXT", label: "Plan Text Note ✎" }
            ].map(t => (
              <button
                key={t.tag}
                id={`btn-tool-${t.tag}`}
                onClick={() => setTool(t.tag as any)}
                className={`p-2 rounded text-xs font-semibold text-center border cursor-pointer ${
                  tool === t.tag 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                    : "bg-slate-950 border-slate-850 text-slate-320 hover:bg-slate-850"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tool === "TEXT" && (
            <div className="bg-slate-950 p-2 rounded border border-slate-850 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 block">Note text content:</span>
              <input
                id="input-markup-text"
                type="text"
                placeholder="Key level rejection..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-xs text-white uppercase focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          )}

          {/* Color pickers */}
          <div className="flex gap-1.5 items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-mono text-[10px]">Select Marker theme color:</span>
            <div className="flex gap-1">
              {["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"].map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 rounded-full border transition-all ${color === c ? "scale-125 border-white ring-2 ring-indigo-500/50" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Save button and clean settings */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            id="btn-save-markup-annotations"
            onClick={handleSave}
            className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer pointer-events-auto"
          >
            <Check size={14} /> Update Setup Markups
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUndo}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Undo size={11} /> Undo Last
            </button>
            <button
              onClick={handleClearElements}
              className="bg-slate-800 hover:bg-slate-750 text-rose-400 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trash2 size={11} /> Clear All
            </button>
          </div>
        </div>

      </div>

      {/* Center columns: Canvas Workspace render */}
      <div className="xl:col-span-3 space-y-4">
        
        {selectedTrade && (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-indigo-950 text-xs flex justify-between items-center text-slate-300">
            <div>
              <span>Editing annotations for trade: <strong>{selectedTrade.symbol} • {selectedTrade.type}</strong> (${selectedTrade.profitLoss})</span>
              <span className="text-[10px] text-slate-500 block">Entered {selectedTrade.entryDate} at {selectedTrade.entryTime}</span>
            </div>
            <span className="bg-indigo-900/40 text-indigo-450 border border-indigo-800 text-[10px] px-2 py-0.5 rounded uppercase font-mono">
              Active Focus Link
            </span>
          </div>
        )}

        {/* Interactive Draw Area */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
          <div className="w-full text-center pb-2 text-[10px] font-mono text-slate-500">
            🖱️ CLICK & DRAG on target spots below to place selected drawing marks
          </div>
          
          <div className="relative border border-slate-850 rounded-lg overflow-hidden max-w-full">
            <canvas
              id="markup-drawing-board"
              ref={canvasRef}
              width={800}
              height={400}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="max-w-full cursor-crosshair bg-slate-950 block"
              style={{ height: "auto", aspectRatio: "2/1" }}
            />
          </div>
          
          <div className="w-full flex justify-between items-center text-[10px] text-slate-600 font-mono mt-2 px-1">
            <span>Markup resolution: {elements.length} markers</span>
            <span>{imageDesc || "Draft board activated"}</span>
          </div>
        </div>

        {/* Grid and comment boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Screenshot written notes */}
          <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl space-y-2">
            <label className="block text-xs font-mono text-emerald-400 font-semibold uppercase">Markup Technical Notes / Retest confirmations</label>
            <textarea
              id="txt-screenshot-markup-notes"
              rows={3}
              placeholder="Confirming candle breakouts... What technical details or confluences (MMA, VWAP or level sweeps) backed this structure?"
              value={screenshotNotes}
              onChange={(e) => setScreenshotNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* AI Setup Markup Checker Diagnostic Feedback */}
          <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">AI Confluence & Markup Auditing</span>
              <div className="flex items-center gap-2 mt-1 border-b border-slate-850 pb-2 mb-2">
                <span className="text-sm font-bold text-slate-205">{visualAudit.status}</span>
                <span className="text-xs bg-slate-900 text-emerald-400 font-mono border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">{visualAudit.score}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                "{visualAudit.feedback}"
              </p>
            </div>
            
            <div className="text-[9px] text-indigo-400 flex items-center gap-1 mt-4 pt-1 border-t border-slate-900 font-mono">
              <Eye size={11} /> 
              <span>Markup rules auto-evaluate entries compared to planned trend sweeps.</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
