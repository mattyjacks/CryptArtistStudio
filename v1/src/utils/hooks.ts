// ===========================================================================
// Improvement 199: Shared React Hooks Library
// Reusable hooks for all CryptArtist Studio programs
// ===========================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// useLocalStorage - Persist state in localStorage with type safety
// ---------------------------------------------------------------------------

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  return [stored, setValue];
}

// ---------------------------------------------------------------------------
// useDebounce - Debounce a value by a delay in ms
// ---------------------------------------------------------------------------

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ---------------------------------------------------------------------------
// useInterval - setInterval as a hook with dynamic delay
// ---------------------------------------------------------------------------

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ---------------------------------------------------------------------------
// useTimeout - setTimeout as a hook
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// useToggle - Simple boolean toggle
// ---------------------------------------------------------------------------

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}

// ---------------------------------------------------------------------------
// useClickOutside - Detect clicks outside a ref element
// ---------------------------------------------------------------------------

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// ---------------------------------------------------------------------------
// useKeyPress - Listen for a specific key press
// ---------------------------------------------------------------------------

export function useKeyPress(targetKey: string, handler: (e: KeyboardEvent) => void, deps: any[] = []) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === targetKey) handler(e);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [targetKey, handler, ...deps]);
}

// ---------------------------------------------------------------------------
// useMediaQuery - Responsive breakpoint detection
// ---------------------------------------------------------------------------

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ---------------------------------------------------------------------------
// usePrevious - Track the previous value of a variable
// ---------------------------------------------------------------------------

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// ---------------------------------------------------------------------------
// useClipboard - Copy text to clipboard with status
// ---------------------------------------------------------------------------

export function useClipboard(timeout = 2000): { copy: (text: string) => Promise<void>; copied: boolean } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      } catch {
        setCopied(false);
      }
    },
    [timeout]
  );

  return { copy, copied };
}

// ---------------------------------------------------------------------------
// useDocumentTitle - Update the document title
// ---------------------------------------------------------------------------

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

// ---------------------------------------------------------------------------
// useCounter - Numeric counter with increment/decrement/reset
// ---------------------------------------------------------------------------

export function useCounter(initial = 0, { min, max }: { min?: number; max?: number } = {}) {
  const [count, setCount] = useState(initial);

  const increment = useCallback(
    (step = 1) => setCount((c) => (max !== undefined ? Math.min(max, c + step) : c + step)),
    [max]
  );
  const decrement = useCallback(
    (step = 1) => setCount((c) => (min !== undefined ? Math.max(min, c - step) : c - step)),
    [min]
  );
  const reset = useCallback(() => setCount(initial), [initial]);

  return { count, increment, decrement, reset, set: setCount };
}

// ---------------------------------------------------------------------------
// useWindowSize - Track window dimensions
// ---------------------------------------------------------------------------

export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// ---------------------------------------------------------------------------
// useHover - Track hover state on an element
// ---------------------------------------------------------------------------

export function useHover<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    node.addEventListener("mouseenter", enter);
    node.addEventListener("mouseleave", leave);
    return () => {
      node.removeEventListener("mouseenter", enter);
      node.removeEventListener("mouseleave", leave);
    };
  }, []);

  return [ref, hovered];
}

// ---------------------------------------------------------------------------
// useAsync - Track async operation state
// ---------------------------------------------------------------------------

export function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | null;
    error: Error | null;
  }>({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    asyncFn()
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, data: null, error }); });
    return () => { cancelled = true; };
  }, deps);

  return state;
}

// ---------------------------------------------------------------------------
// useThrottle - Throttle a value update
// ---------------------------------------------------------------------------

export function useThrottle<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottled(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottled(value);
      }, interval - (now - lastUpdated.current));
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttled;
}

// ---------------------------------------------------------------------------
// useScrollPosition - Track scroll position of an element
// ---------------------------------------------------------------------------

export function useScrollPosition(ref?: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref?.current || window;
    const handler = () => {
      if (ref?.current) {
        setPosition({ x: ref.current.scrollLeft, y: ref.current.scrollTop });
      } else {
        setPosition({ x: window.scrollX, y: window.scrollY });
      }
    };
    element.addEventListener("scroll", handler, { passive: true });
    return () => element.removeEventListener("scroll", handler);
  }, [ref]);

  return position;
}
