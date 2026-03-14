/* Wave2: type=button applied */
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface MediaBrowserProps {
  pexelsApiKey?: string;
}

interface MediaItemData {
  id: string;
  name: string;
  type: string;
  duration: string;
  icon: string;
  thumbnail?: string;
  sourceUrl?: string;
}

const INITIAL_MEDIA: MediaItemData[] = [
  { id: "m1", name: "Interview_Main.mp4", type: "video", duration: "0:05:00", icon: "🎬" },
  { id: "m2", name: "B-Roll_City.mp4", type: "video", duration: "0:05:00", icon: "🎬" },
  { id: "m3", name: "Overlay.png", type: "image", duration: "—", icon: "🖼️" },
  { id: "m4", name: "Voiceover.wav", type: "audio", duration: "0:08:20", icon: "🎙️" },
  { id: "m5", name: "BGM_Ambient.mp3", type: "audio", duration: "0:10:00", icon: "🎵" },
  { id: "m6", name: "Title_Card.gif", type: "gif", duration: "0:03:00", icon: "✨" },
  { id: "m7", name: "Lower_Third.png", type: "image", duration: "—", icon: "🖼️" },
  { id: "m8", name: "SFX_Whoosh.wav", type: "audio", duration: "0:00:02", icon: "🔊" },
];

const FILTERS = ["All", "Video", "Audio", "Image", "GIF", "Stock"];

export default function MediaBrowser({ pexelsApiKey = "" }: MediaBrowserProps) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mediaItems, setMediaItems] = useState(INITIAL_MEDIA);
  
  // Pexels State
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);

  const filtered = mediaItems.filter((item) => {
    const matchesFilter =
      filter === "All" || item.type.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mov', 'wav', 'mp3', 'png', 'jpg', 'gif']
        }]
      });
      
      if (selected !== null) {
        const files = Array.isArray(selected) ? selected : [selected];
        
        const newItems = files.map(file => {
          const path = file;
          const name = path.split('\\').pop()?.split('/').pop() || "Unknown";
          const ext = name.split('.').pop()?.toLowerCase() || "";
          
          let type = "unknown";
          let icon = "📄";
          if (["mp4", "mov"].includes(ext)) { type = "video"; icon = "🎬"; }
          else if (["wav", "mp3"].includes(ext)) { type = "audio"; icon = "🎵"; }
          else if (["png", "jpg"].includes(ext)) { type = "image"; icon = "🖼️"; }
          else if (ext === "gif") { type = "gif"; icon = "✨"; }

          return {
            id: `m_${Date.now()}_${Math.random()}`,
            name,
            type,
            duration: ["video", "audio"].includes(type) ? "0:00:00" : "—",
            icon
          };
        });

        setMediaItems(prev => [...newItems, ...prev]);
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  };

  const handleStockSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pexelsApiKey) {
      alert("Please configure your Pexels API key in Settings first.");
      return;
    }
    if (!search.trim()) return;

    setIsSearchingStock(true);
    try {
      const isVideo = filter === "Video" || filter === "All" || filter === "Stock";
      // To adhere to request: "multiple file sizes... in a way that makes it better", 
      // we'll fetch Video data which includes varied quality sizes inside `video_files`.
      const jsonStr = await invoke<string>("search_pexels", { 
        query: search, 
        searchType: isVideo ? "video" : "image" 
      });
      const data = JSON.parse(jsonStr);
      setStockResults(isVideo ? data.videos || [] : data.photos || []);
    } catch (err) {
      console.error("Pexels Search Error", err);
      alert("Search failed. Check API key and network.");
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleImportStock = (item: any, type: "video" | "image") => {
    // For requested videos we can parse multiple sizes but we pick HD preferred
    const isVideo = type === "video";
    const src = isVideo
      ? item.video_files.find((v: any) => v.quality === "hd")?.link || item.video_files[0]?.link
      : item.src.large;
      
    const newItem = {
      id: `m_${Date.now()}_${item.id}`,
      name: `Pexels_${item.id}.${isVideo ? "mp4" : "jpg"}`,
      type,
      duration: isVideo ? `${item.duration}s` : "—",
      icon: isVideo ? "🎬" : "🖼️",
      thumbnail: isVideo ? item.image : item.src.small,
      sourceUrl: src,
    };
    setMediaItems((prev) => [newItem, ...prev]);
    alert(`Imported ${newItem.name} from Pexels!`);
  };

  return (
    <div className="panel h-full m-1 mr-0">
      <div className="panel-header">
        <h3>Media Pool</h3>
        <div className="flex gap-1">
          <button type="button"
            onClick={() => setView("grid")}
            className={`btn-icon btn-ghost text-xs ${view === "grid" ? "text-studio-cyan" : ""}`}
            title="Grid view"
          >
            ▦
          </button>
          <button type="button"
            onClick={() => setView("list")}
            className={`btn-icon btn-ghost text-xs ${view === "list" ? "text-studio-cyan" : ""}`}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 pt-2">
        <form onSubmit={filter === "Stock" ? handleStockSearch : (e) => e.preventDefault()}>
          <div className="relative">
            <input
              className="input pr-8"
              placeholder={filter === "Stock" ? "Search Pexels..." : "Search media..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filter === "Stock" && (
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-cyan text-[10px] hover:text-white"
                disabled={isSearchingStock}
              >
                {isSearchingStock ? "⌛" : "🔍"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-2 pt-2 pb-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              if (f !== "Stock") setStockResults([]);
            }}
            className={`text-[10px] px-2 py-[3px] rounded-full font-medium transition-all duration-150 ${
              filter === f
                ? "bg-studio-cyan/20 text-studio-cyan border border-studio-cyan/30"
                : "text-studio-muted hover:text-studio-secondary border border-transparent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="panel-body">
        {filter === "Stock" ? (
          <div className="grid grid-cols-2 gap-2">
            {stockResults.map((res: any) => {
              const isVideo = !!res.video_files;
              const thumb = isVideo ? res.image : res.src.small;
              
              return (
                <div 
                  key={res.id} 
                  className="media-item animate-fade-in group relative overflow-hidden"
                  onClick={() => handleImportStock(res, isVideo ? "video" : "image")}
                >
                  <div className="media-thumbnail bg-cover bg-center" style={{ backgroundImage: `url(${thumb})` }}>
                    {!thumb && <span>{isVideo ? "🎬" : "🖼️"}</span>}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[20px]">
                      ⬇️
                    </div>
                  </div>
                  <div className="media-info bg-studio-surface/90">
                    <h4 className="truncate">{res.user?.name || "Pexels Artist"}</h4>
                    <span>{isVideo ? `${res.duration}s` : "Stock Image"}</span>
                  </div>
                </div>
              );
            })}
            {stockResults.length === 0 && search && !isSearchingStock && (
              <div className="col-span-2 text-center text-[10px] text-studio-muted mt-4">No results found.</div>
            )}
            {stockResults.length === 0 && !search && (
              <div className="col-span-2 text-center text-[10px] text-studio-muted mt-4 text-balance">
                Search Pexels to instantly browse and download free stock media into your project.
              </div>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => (
              <div key={item.id} className="media-item animate-fade-in relative group">
                <div 
                  className="media-thumbnail bg-cover bg-center" 
                  style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : {}}
                >
                  {!item.thumbnail && <span>{item.icon}</span>}
                </div>
                <div className="media-info">
                  <h4 className="truncate">{item.name}</h4>
                  <span>{item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-[2px]">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-[6px] rounded hover:bg-studio-hover transition-colors cursor-pointer animate-fade-in group">
                <div 
                  className="w-5 h-5 rounded overflow-hidden bg-cover bg-center shrink-0"
                  style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : {}}
                >
                  {!item.thumbnail && <span className="text-sm">{item.icon}</span>}
                </div>
                <span className="text-[11px] font-medium flex-1 truncate group-hover:text-studio-cyan transition-colors">
                  {item.name}
                </span>
                <span className="text-[9px] text-studio-muted font-mono">
                  {item.duration}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Import Button */}
        <button type="button" 
          onClick={handleImport}
          className="btn w-full mt-3 text-studio-cyan border-dashed border-studio-cyan/30 hover:bg-studio-cyan/5"
        >
          + Import Media
        </button>
      </div>
    </div>
  );
}
