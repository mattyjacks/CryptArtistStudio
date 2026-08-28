import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { CryptArtFile, CryptArtProgram } from "../types/cryptart.types";
import { TimelineClip, TimelineTrack, TimelineMarker, ProjectSettings, ColorGradingParams } from "../types/video.types";
import { useStudioCore } from "./StudioCoreContext";

export const DEFAULT_COLOR_GRADING: ColorGradingParams = {
  lift: { r: 0, g: 0, b: 0, y: 0 },
  gamma: { r: 0, g: 0, b: 0, y: 0 },
  gain: { r: 0, g: 0, b: 0, y: 0 },
  offset: { r: 0, g: 0, b: 0, y: 0 },
  saturation: 1.0,
  contrast: 1.0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  chromaKeyEnabled: false,
  chromaColor: "#00ff00",
  chromaSimilarity: 0.4,
  chromaSmoothness: 0.1,
};

export const INITIAL_TRACKS: TimelineTrack[] = [
  {
    id: "v3",
    name: "Video 3 (Overlay & Text)",
    type: "video",
    muted: false,
    locked: false,
    solo: false,
    volume: 100,
    pan: 0,
    clips: [
      {
        id: "clip_v3_title",
        trackId: "v3",
        name: "Welcome Title Card",
        mediaId: "m_title",
        mediaType: "text",
        textContent: "MEDIA MOGUL v2",
        textStyle: {
          fontSize: 52,
          fontFamily: "Inter, sans-serif",
          textColor: "#ffffff",
          strokeColor: "#00d2ff",
          strokeWidth: 2,
          position: "center",
          shadowColor: "rgba(0, 210, 255, 0.6)",
          shadowBlur: 16,
        },
        startFrame: 0,
        endFrame: 60,
        sourceStartFrame: 0,
        sourceEndFrame: 60,
        speed: 1.0,
        color: "#ec4899",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 100,
        pan: 0,
      },
    ],
  },
  {
    id: "v2",
    name: "Video 2 (B-Roll)",
    type: "video",
    muted: false,
    locked: false,
    solo: false,
    volume: 100,
    pan: 0,
    clips: [
      {
        id: "clip_v2_1",
        trackId: "v2",
        name: "Cinematic City B-Roll.mp4",
        mediaId: "m_city",
        mediaType: "video",
        startFrame: 60,
        endFrame: 180,
        sourceStartFrame: 0,
        sourceEndFrame: 120,
        speed: 1.0,
        color: "#00d2ff",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 100,
        pan: 0,
      },
    ],
  },
  {
    id: "v1",
    name: "Video 1 (Main A-Roll)",
    type: "video",
    muted: false,
    locked: false,
    solo: false,
    volume: 100,
    pan: 0,
    clips: [
      {
        id: "clip_v1_1",
        trackId: "v1",
        name: "Studio_Host_A-Roll.mp4",
        mediaId: "m_host",
        mediaType: "video",
        startFrame: 0,
        endFrame: 120,
        sourceStartFrame: 0,
        sourceEndFrame: 120,
        speed: 1.0,
        color: "#e94560",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 100,
        pan: 0,
      },
      {
        id: "clip_v1_2",
        trackId: "v1",
        name: "Product_Demo_Walkthrough.mp4",
        mediaId: "m_demo",
        mediaType: "video",
        startFrame: 140,
        endFrame: 260,
        sourceStartFrame: 0,
        sourceEndFrame: 120,
        speed: 1.0,
        color: "#7b2ff7",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 100,
        pan: 0,
      },
    ],
  },
  {
    id: "a1",
    name: "Audio 1 (Voiceover)",
    type: "audio",
    muted: false,
    locked: false,
    solo: false,
    volume: 85,
    pan: 0,
    clips: [
      {
        id: "clip_a1_1",
        trackId: "a1",
        name: "Host_Voiceover.wav",
        mediaId: "m_voice",
        mediaType: "audio",
        startFrame: 0,
        endFrame: 240,
        sourceStartFrame: 0,
        sourceEndFrame: 240,
        speed: 1.0,
        color: "#4ade80",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 90,
        pan: 0,
      },
    ],
  },
  {
    id: "a2",
    name: "Audio 2 (Music BGM)",
    type: "audio",
    muted: false,
    locked: false,
    solo: false,
    volume: 60,
    pan: 0,
    clips: [
      {
        id: "clip_a2_1",
        trackId: "a2",
        name: "Synthwave_Ambient_Beat.mp3",
        mediaId: "m_bgm",
        mediaType: "audio",
        startFrame: 0,
        endFrame: 300,
        sourceStartFrame: 0,
        sourceEndFrame: 300,
        speed: 1.0,
        color: "#fbbf24",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        volume: 50,
        pan: 0,
      },
    ],
  },
];

export const INITIAL_MARKERS: TimelineMarker[] = [
  { id: "m_1", frame: 0, label: "Intro Hook", color: "#00d2ff" },
  { id: "m_2", frame: 60, label: "B-Roll Cut", color: "#7b2ff7" },
  { id: "m_3", frame: 140, label: "Demo Segment", color: "#4ade80" },
  { id: "m_4", frame: 260, label: "Outro & CTA", color: "#e94560" },
];

export interface ProjectContextValue {
  project: CryptArtFile;
  tracks: TimelineTrack[];
  markers: TimelineMarker[];
  selectedClipId: string | null;
  selectedClip: TimelineClip | null;
  projectSettings: ProjectSettings;
  currentFrame: number;
  isPlaying: boolean;
  isDirty: boolean;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: (p: boolean) => void;
  setSelectedClipId: (id: string | null) => void;
  updateSelectedClipColorGrading: (grading: Partial<ColorGradingParams>) => void;
  updateSelectedClipTransform: (transform: Partial<TimelineClip["transform"]>) => void;
  updateSelectedClipText: (text: string, style?: Partial<TimelineClip["textStyle"]>) => void;
  updateClipTiming: (clipId: string, updates: { startFrame?: number; endFrame?: number; trackId?: string; sourceStartFrame?: number; sourceEndFrame?: number }) => void;
  addClipToTrack: (trackId: string, clip: TimelineClip) => void;
  removeClip: (clipId: string) => void;
  splitClipAtPlayhead: (clipId: string) => void;
  rippleDeleteClip: (clipId: string) => void;
  addTrack: (type: TimelineTrack["type"], name?: string) => void;
  removeTrack: (trackId: string) => void;
  addMarker: (frame?: number, label?: string, color?: string) => void;
  removeMarker: (markerId: string) => void;
  setInPoint: (frame?: number) => void;
  setOutPoint: (frame?: number) => void;
  clearInOutPoints: () => void;
  undo: () => void;
  redo: () => void;
  setTracks: React.Dispatch<React.SetStateAction<TimelineTrack[]>>;
  saveProject: () => Promise<void>;
  loadProject: (file: CryptArtFile) => void;
  exportProjectAsCryptArt: () => Promise<void>;
  importCryptArtFile: (file: File) => Promise<void>;
  createNewProject: (program?: CryptArtProgram, name?: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const MAX_HISTORY = 30;

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cryptart, storage, events } = useStudioCore();

  const [project, setProject] = useState<CryptArtFile>(() =>
    cryptart.createProject("media-mogul", "Media Mogul Master Video", {
      tracks: INITIAL_TRACKS,
      markers: INITIAL_MARKERS,
    })
  );

  const [tracks, setTracksState] = useState<TimelineTrack[]>(INITIAL_TRACKS);
  const [markers, setMarkers] = useState<TimelineMarker[]>(INITIAL_MARKERS);
  const [selectedClipId, setSelectedClipId] = useState<string | null>("clip_v1_1");
  const [currentFrame, setCurrentFrame] = useState<number>(45);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(Date.now());

  // History Undo/Redo stacks
  const historyStack = useRef<TimelineTrack[][]>([INITIAL_TRACKS]);
  const historyIndex = useRef<number>(0);

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    name: "Media Mogul Master Video",
    fps: 30,
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    sampleRate: 48000,
  });

  const pushHistory = (newTracks: TimelineTrack[]) => {
    const currentHist = historyStack.current.slice(0, historyIndex.current + 1);
    currentHist.push(newTracks);
    if (currentHist.length > MAX_HISTORY) currentHist.shift();
    historyStack.current = currentHist;
    historyIndex.current = currentHist.length - 1;
  };

  const setTracks = (updater: React.SetStateAction<TimelineTrack[]>) => {
    setTracksState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pushHistory(next);
      return next;
    });
  };

  const undo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      setTracksState(historyStack.current[historyIndex.current]);
    }
  };

  const redo = () => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current++;
      setTracksState(historyStack.current[historyIndex.current]);
    }
  };

  // Load last autosaved project on mount
  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<CryptArtFile | null>("autosave_media-mogul", null);
      if (saved && saved.data && Array.isArray((saved.data as any).tracks)) {
        setProject(saved);
        setTracksState((saved.data as any).tracks);
        if ((saved.data as any).markers) {
          setMarkers((saved.data as any).markers);
        }
        if (saved.name) {
          setProjectSettings((prev) => ({ ...prev, name: saved.name }));
        }
      }
    })();
  }, []);

  // Autosave when tracks change
  useEffect(() => {
    setIsDirty(true);
    const timer = setTimeout(async () => {
      const updatedProject: CryptArtFile = {
        ...project,
        data: {
          ...project.data,
          tracks,
          markers,
          projectSettings,
        },
      };
      await storage.setItem("autosave_media-mogul", updatedProject);
      setLastSavedAt(Date.now());
      setIsDirty(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [tracks, markers, projectSettings]);

  const selectedClip = React.useMemo(() => {
    if (!selectedClipId) return null;
    for (const t of tracks) {
      const found = t.clips.find((c) => c.id === selectedClipId);
      if (found) return found;
    }
    return null;
  }, [tracks, selectedClipId]);

  const updateSelectedClipColorGrading = useCallback(
    (grading: Partial<ColorGradingParams>) => {
      if (!selectedClipId) return;
      setTracks((prev) =>
        prev.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === selectedClipId
              ? {
                  ...clip,
                  colorGrading: { ...clip.colorGrading, ...grading },
                }
              : clip
          ),
        }))
      );
    },
    [selectedClipId]
  );

  const updateSelectedClipTransform = useCallback(
    (transform: Partial<TimelineClip["transform"]>) => {
      if (!selectedClipId) return;
      setTracks((prev) =>
        prev.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === selectedClipId
              ? {
                  ...clip,
                  transform: { ...clip.transform, ...transform },
                }
              : clip
          ),
        }))
      );
    },
    [selectedClipId]
  );

  const updateSelectedClipText = useCallback(
    (text: string, style?: Partial<TimelineClip["textStyle"]>) => {
      if (!selectedClipId) return;
      setTracks((prev) =>
        prev.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === selectedClipId
              ? {
                  ...clip,
                  textContent: text,
                  textStyle: clip.textStyle ? { ...clip.textStyle, ...style } : (style as any),
                }
              : clip
          ),
        }))
      );
    },
    [selectedClipId]
  );

  const updateClipTiming = useCallback(
    (clipId: string, updates: { startFrame?: number; endFrame?: number; trackId?: string; sourceStartFrame?: number; sourceEndFrame?: number }) => {
      setTracks((prev) => {
        let movedClip: TimelineClip | null = null;

        // Extract clip
        const cleaned = prev.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => {
            if (c.id === clipId) {
              movedClip = { ...c, ...updates };
              return false;
            }
            return true;
          }),
        }));

        if (!movedClip) return prev;

        const targetTrackId = updates.trackId || (movedClip as TimelineClip).trackId;
        return cleaned.map((t) =>
          t.id === targetTrackId ? { ...t, clips: [...t.clips, movedClip!] } : t
        );
      });
    },
    []
  );

  const addClipToTrack = useCallback((trackId: string, clip: TimelineClip) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t))
    );
  }, []);

  const removeClip = useCallback((clipId: string) => {
    setTracks((prev) =>
      prev.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }))
    );
  }, []);

  const rippleDeleteClip = useCallback((clipId: string) => {
    setTracks((prev) => {
      let durationToShift = 0;
      let targetStart = 0;

      // Find clip duration
      for (const t of prev) {
        const found = t.clips.find((c) => c.id === clipId);
        if (found) {
          durationToShift = found.endFrame - found.startFrame;
          targetStart = found.startFrame;
          break;
        }
      }

      if (durationToShift === 0) return prev;

      return prev.map((track) => ({
        ...track,
        clips: track.clips
          .filter((c) => c.id !== clipId)
          .map((c) =>
            c.startFrame >= targetStart
              ? {
                  ...c,
                  startFrame: Math.max(0, c.startFrame - durationToShift),
                  endFrame: Math.max(durationToShift, c.endFrame - durationToShift),
                }
              : c
          ),
      }));
    });
  }, []);

  const splitClipAtPlayhead = useCallback(
    (clipId: string) => {
      setTracks((prev) =>
        prev.map((track) => {
          const target = track.clips.find((c) => c.id === clipId);
          if (!target || currentFrame <= target.startFrame || currentFrame >= target.endFrame) {
            return track;
          }

          const firstHalf: TimelineClip = {
            ...target,
            endFrame: currentFrame,
            sourceEndFrame: target.sourceStartFrame + (currentFrame - target.startFrame),
          };

          const secondHalf: TimelineClip = {
            ...target,
            id: `clip_${Date.now()}_split`,
            startFrame: currentFrame,
            sourceStartFrame: firstHalf.sourceEndFrame,
          };

          return {
            ...track,
            clips: track.clips.flatMap((c) => (c.id === clipId ? [firstHalf, secondHalf] : [c])),
          };
        })
      );
    },
    [currentFrame]
  );

  const addTrack = useCallback((type: TimelineTrack["type"], name?: string) => {
    const id = `${type[0]}${Date.now().toString().slice(-3)}`;
    const defaultName = name || `${type.toUpperCase()} Track ${id}`;
    setTracks((prev) => [
      {
        id,
        name: defaultName,
        type,
        muted: false,
        locked: false,
        solo: false,
        volume: 100,
        pan: 0,
        clips: [],
      },
      ...prev,
    ]);
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const addMarker = useCallback((frame?: number, label?: string, color?: string) => {
    const f = frame ?? currentFrame;
    const newMarker: TimelineMarker = {
      id: `m_${Date.now()}`,
      frame: f,
      label: label || `Marker @ ${f}`,
      color: color || "#00d2ff",
    };
    setMarkers((prev) => [...prev, newMarker]);
  }, [currentFrame]);

  const removeMarker = useCallback((markerId: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }, []);

  const setInPoint = useCallback((frame?: number) => {
    const f = frame ?? currentFrame;
    setProjectSettings((prev) => ({ ...prev, inPoint: f }));
  }, [currentFrame]);

  const setOutPoint = useCallback((frame?: number) => {
    const f = frame ?? currentFrame;
    setProjectSettings((prev) => ({ ...prev, outPoint: f }));
  }, [currentFrame]);

  const clearInOutPoints = useCallback(() => {
    setProjectSettings((prev) => ({ ...prev, inPoint: undefined, outPoint: undefined }));
  }, []);

  const saveProject = async () => {
    const updated: CryptArtFile = {
      ...project,
      name: projectSettings.name,
      data: {
        ...project.data,
        tracks,
        markers,
        projectSettings,
      },
    };
    await storage.setItem(`project_${project.id}`, updated);
    await storage.setItem("autosave_media-mogul", updated);
    setProject(updated);
    setIsDirty(false);
    setLastSavedAt(Date.now());
    events.emit("project:saved", updated);
  };

  const loadProject = (file: CryptArtFile) => {
    setProject(file);
    if (file.data && Array.isArray((file.data as any).tracks)) {
      setTracksState((file.data as any).tracks);
      historyStack.current = [(file.data as any).tracks];
      historyIndex.current = 0;
    }
    if (file.data && Array.isArray((file.data as any).markers)) {
      setMarkers((file.data as any).markers);
    }
    if (file.name) {
      setProjectSettings((prev) => ({ ...prev, name: file.name }));
    }
    events.emit("project:loaded", file);
  };

  const exportProjectAsCryptArt = async () => {
    const fileToExport: CryptArtFile = {
      ...project,
      name: projectSettings.name,
      data: {
        tracks,
        markers,
        projectSettings,
      },
    };
    await cryptart.exportProjectFile(fileToExport);
  };

  const importCryptArtFile = async (file: File) => {
    const parsed = await cryptart.importProjectFile(file);
    loadProject(parsed);
  };

  const createNewProject = (program: CryptArtProgram = "media-mogul", name: string = "Untitled Project") => {
    const newProj = cryptart.createProject(program, name, {
      tracks: INITIAL_TRACKS,
      markers: INITIAL_MARKERS,
    });
    setProject(newProj);
    setTracksState(INITIAL_TRACKS);
    setMarkers(INITIAL_MARKERS);
    historyStack.current = [INITIAL_TRACKS];
    historyIndex.current = 0;
    setProjectSettings({
      name,
      fps: 30,
      width: 1920,
      height: 1080,
      aspectRatio: "16:9",
      sampleRate: 48000,
    });
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        tracks,
        markers,
        selectedClipId,
        selectedClip,
        projectSettings,
        currentFrame,
        isPlaying,
        isDirty,
        lastSavedAt,
        canUndo: historyIndex.current > 0,
        canRedo: historyIndex.current < historyStack.current.length - 1,
        setCurrentFrame,
        setIsPlaying,
        setSelectedClipId,
        updateSelectedClipColorGrading,
        updateSelectedClipTransform,
        updateSelectedClipText,
        updateClipTiming,
        addClipToTrack,
        removeClip,
        splitClipAtPlayhead,
        rippleDeleteClip,
        addTrack,
        removeTrack,
        addMarker,
        removeMarker,
        setInPoint,
        setOutPoint,
        clearInOutPoints,
        undo,
        redo,
        setTracks,
        saveProject,
        loadProject,
        exportProjectAsCryptArt,
        importCryptArtFile,
        createNewProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
