// React Hooks for 100 Improvements Implementation

import { useEffect, useRef, useCallback, useState } from "react";
import { UndoRedoStack, createAutoSaver, KeyboardShortcutManager, CommandPalette } from "../utils/improvements";

/**
 * Improvement 3: Micro-interactions - Add subtle animations
 */
export function useMicroInteraction(duration = 300) {
  const [isAnimating, setIsAnimating] = useState(false);

  const trigger = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), duration);
  }, [duration]);

  return { isAnimating, trigger };
}

/**
 * Improvement 4: Loading States - Skeleton screens
 */
export function useLoadingState(isLoading: boolean, delay = 200) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      const timer = setTimeout(() => setShowSkeleton(false), delay);
      return () => clearTimeout(timer);
    }
  }, [isLoading, delay]);

  return showSkeleton;
}

/**
 * Improvement 6: Breadcrumb Navigation - Show current location
 */
export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .reduce<BreadcrumbItem[]>((acc, segment, index) => {
      const path = "/" + acc.map(b => b.path.split("/")[1]).join("/") + "/" + segment;
      acc.push({ label: segment, path });
      return acc;
    }, []);
}

/**
 * Improvement 7: Sticky Headers - Keep navigation visible
 */
export function useStickyHeader(ref: React.RefObject<HTMLElement>) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [ref]);

  return isSticky;
}

/**
 * Improvement 11: ARIA Labels - Screen reader support
 */
export function useAccessibility(role: string, ariaLabel: string) {
  return {
    role,
    "aria-label": ariaLabel,
    tabIndex: 0,
  };
}

/**
 * Improvement 16: Toast Notifications - Consistent notification system
 */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    setToasts(prev => [...prev, toast]);

    if (duration) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

/**
 * Improvement 19: Confirmation Dialogs - Confirm destructive actions
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = useCallback((msg: string): Promise<boolean> => {
    setMessage(msg);
    setIsOpen(true);
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setIsOpen(false);
  }, []);

  return { isOpen, message, confirm, handleConfirm, handleCancel };
}

/**
 * Improvement 20: Undo/Redo - Support undo/redo
 */
export function useUndoRedo<T>(initialState: T) {
  const stackRef = useRef(new UndoRedoStack(initialState));
  const [state, setState] = useState(initialState);

  const push = useCallback((newState: T) => {
    stackRef.current.push(newState);
    setState(newState);
  }, []);

  const undo = useCallback(() => {
    const newState = stackRef.current.undo();
    if (newState !== null) {
      setState(newState);
    }
  }, []);

  const redo = useCallback(() => {
    const newState = stackRef.current.redo();
    if (newState !== null) {
      setState(newState);
    }
  }, []);

  return {
    state,
    push,
    undo,
    redo,
    canUndo: stackRef.current.canUndo(),
    canRedo: stackRef.current.canRedo(),
  };
}

/**
 * Improvement 62: Auto-save - Auto-save projects
 */
export function useAutoSave<T>(data: T, saveFn: (data: T) => Promise<void>, interval = 30000) {
  const saverRef = useRef(createAutoSaver(saveFn, interval));

  useEffect(() => {
    saverRef.current.start(data);
    return () => saverRef.current.stop();
  }, [data, interval]);

  return {
    save: () => saverRef.current.save(data),
  };
}

/**
 * Improvement 66: Keyboard Shortcuts - Comprehensive shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Array<{
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
}>) {
  const managerRef = useRef(new KeyboardShortcutManager());

  useEffect(() => {
    shortcuts.forEach(shortcut => managerRef.current.register(shortcut));

    const handleKeyDown = (event: KeyboardEvent) => {
      managerRef.current.handleKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Improvement 67: Command Palette - Quick command access
 */
export function useCommandPalette() {
  const paletteRef = useRef(new CommandPalette());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    return paletteRef.current.search(query);
  }, []);

  const execute = useCallback((id: string) => {
    paletteRef.current.execute(id);
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    search,
    execute,
    register: (command: Parameters<typeof paletteRef.current.register>[0]) => {
      paletteRef.current.register(command);
    },
  };
}

/**
 * Improvement 73: Filtering - Advanced filtering
 */
export function useAdvancedFilter<T>(items: T[], filters: Record<string, (item: T) => boolean>) {
  return items.filter(item =>
    Object.values(filters).every(filter => filter(item))
  );
}

/**
 * Improvement 74: Sorting - Multi-column sorting
 */
export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export function useSorting<T extends Record<string, unknown>>(
  items: T[],
  sortConfigs: SortConfig[]
) {
  return [...items].sort((a, b) => {
    for (const config of sortConfigs) {
      const aVal = a[config.key] as unknown;
      const bVal = b[config.key] as unknown;

      if (aVal !== null && bVal !== null && aVal !== undefined && bVal !== undefined) {
        if (aVal < bVal) return config.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return config.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  });
}

/**
 * Improvement 89: Timeout Handling - Handle timeouts
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Improvement 93: Boundary Conditions - Handle edge cases
 */
export function useClampedValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Improvement 99: Debug Mode - Debug utilities
 */
export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("debug-mode") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("debug-mode", debugMode.toString());
  }, [debugMode]);

  const log = useCallback((message: string, data?: unknown) => {
    if (debugMode) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }, [debugMode]);

  return { debugMode, setDebugMode, log };
}
