import Dexie, { type Table } from "dexie";
import { IStorageDriver, StorageUsage } from "../../types/storage.types";

interface StudioKeyValue {
  key: string;
  value: any;
  updatedAt: number;
}

class StudioDatabase extends Dexie {
  keyValues!: Table<StudioKeyValue, string>;

  constructor() {
    super("CryptArtistStudioV2DB");
    this.version(1).stores({
      keyValues: "&key, updatedAt",
    });
  }
}

export class BrowserStorageDriver implements IStorageDriver {
  private db: StudioDatabase | null = null;
  private memoryCache: Map<string, any> = new Map();
  private prefix = "cryptartist_v2_";

  constructor() {
    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        this.db = new StudioDatabase();
      }
    } catch (e) {
      console.warn("[StorageDriver] IndexedDB initialization failed, falling back to localStorage", e);
    }
  }

  async getItem<T>(key: string, fallback: T): Promise<T> {
    const fullKey = this.prefix + key;
    if (this.memoryCache.has(fullKey)) {
      return this.memoryCache.get(fullKey) as T;
    }

    try {
      if (this.db) {
        const entry = await this.db.keyValues.get(fullKey);
        if (entry !== undefined) {
          this.memoryCache.set(fullKey, entry.value);
          return entry.value as T;
        }
      }
    } catch (e) {
      console.warn("[StorageDriver] Dexie read error, falling back to localStorage", e);
    }

    // Fallback to localStorage
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(fullKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          this.memoryCache.set(fullKey, parsed);
          return parsed as T;
        }
      }
    } catch {
      // ignore
    }

    return fallback;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const fullKey = this.prefix + key;
    this.memoryCache.set(fullKey, value);

    try {
      if (this.db) {
        await this.db.keyValues.put({
          key: fullKey,
          value,
          updatedAt: Date.now(),
        });
        return;
      }
    } catch (e) {
      console.warn("[StorageDriver] Dexie write error, falling back to localStorage", e);
    }

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(fullKey, JSON.stringify(value));
      }
    } catch (e) {
      console.warn("[StorageDriver] localStorage write failed", e);
    }
  }

  async removeItem(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    this.memoryCache.delete(fullKey);

    try {
      if (this.db) {
        await this.db.keyValues.delete(fullKey);
      }
    } catch {
      // ignore
    }

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(fullKey);
      }
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      if (this.db) {
        await this.db.keyValues.clear();
      }
    } catch {
      // ignore
    }

    try {
      if (typeof localStorage !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // ignore
    }
  }

  async getAllKeys(prefixFilter?: string): Promise<string[]> {
    const filter = this.prefix + (prefixFilter || "");
    const resultKeys: Set<string> = new Set();

    try {
      if (this.db) {
        const all = await this.db.keyValues.toCollection().primaryKeys();
        all.forEach((k) => {
          if (typeof k === "string" && k.startsWith(filter)) {
            resultKeys.add(k.substring(this.prefix.length));
          }
        });
      }
    } catch {
      // ignore
    }

    try {
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(filter)) {
            resultKeys.add(k.substring(this.prefix.length));
          }
        }
      }
    } catch {
      // ignore
    }

    return Array.from(resultKeys);
  }

  async getStorageUsage(): Promise<StorageUsage> {
    if (typeof navigator !== "undefined" && "storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const percentUsed = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
        return { usedBytes, quotaBytes, percentUsed };
      } catch {
        // ignore
      }
    }

    let rawUsage = 0;
    try {
      if (typeof localStorage !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(this.prefix)) {
            rawUsage += (localStorage.getItem(k) || "").length * 2;
          }
        }
      }
    } catch {
      // ignore
    }

    return { usedBytes: rawUsage, quotaBytes: 50 * 1024 * 1024, percentUsed: (rawUsage / (50 * 1024 * 1024)) * 100 };
  }
}

export const browserStorageDriver = new BrowserStorageDriver();
