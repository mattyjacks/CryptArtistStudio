// ============================================================================
// CryptArtist Studio - Service Worker for Chromebook Offline Support
// Enables offline functionality and caching for Chrome OS
// ============================================================================

const CACHE_NAME = "cryptartist-v1";
const RUNTIME_CACHE = "cryptartist-runtime";
const ASSETS_CACHE = "cryptartist-assets";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== ASSETS_CACHE) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-first strategy for assets
  if (isAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(ASSETS_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // Network-first strategy for API calls
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Fallback to cache on network error
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }

          // Return offline page if available
          return caches.match("/offline.html");
        });
      })
  );
});

// Background sync for Chromebook
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag);

  if (event.tag === "sync-files") {
    event.waitUntil(syncFiles());
  } else if (event.tag === "sync-git") {
    event.waitUntil(syncGit());
  }
});

async function syncFiles() {
  try {
    console.log("[Service Worker] Syncing files...");
    // Sync pending file operations
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_FILES",
        status: "syncing",
      });
    });
  } catch (err) {
    console.error("[Service Worker] File sync error:", err);
  }
}

async function syncGit() {
  try {
    console.log("[Service Worker] Syncing git...");
    // Sync pending git operations
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_GIT",
        status: "syncing",
      });
    });
  } catch (err) {
    console.error("[Service Worker] Git sync error:", err);
  }
}

// Push notifications for Chromebook
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push notification:", event.data);

  const data = event.data?.json() || {};
  const options = {
    body: data.body || "CryptArtist Studio notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "cryptartist-notification",
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "CryptArtist", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked:", event.notification.tag);

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Check if there's already a window open
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].url === "/" && "focus" in clients[i]) {
          return clients[i].focus();
        }
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

// Message handler for client communication
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data.type);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.type === "REQUEST_SYNC") {
    if (self.registration.sync) {
      self.registration.sync.register(event.data.tag);
    }
  }
});

// Helper function to check if URL is an asset
function isAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/.test(pathname);
}

// Periodic background sync for Chromebook (if supported)
if ("periodicSync" in self.registration) {
  self.addEventListener("periodicsync", (event) => {
    console.log("[Service Worker] Periodic sync:", event.tag);

    if (event.tag === "sync-files-periodic") {
      event.waitUntil(syncFiles());
    } else if (event.tag === "sync-git-periodic") {
      event.waitUntil(syncGit());
    }
  });
}
