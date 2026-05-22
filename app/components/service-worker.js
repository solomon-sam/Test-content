/**
 * Service Worker — Phase 4
 * Provides offline caching for the KPMG Brand Composition Engine.
 * Caches all static assets, engine modules, and component files.
 * Enables full offline usage after first load.
 */

const CACHE_NAME = 'kpmg-bce-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app/styles/styles.css',
  '/app/presets/asset-presets.js',
  '/app/engine/state-manager.js',
  '/app/engine/grid-system.js',
  '/app/engine/ai-analysis.js',
  '/app/engine/composition-engine.js',
  '/app/engine/typography-composition-engine.js',
  '/app/engine/accessibility-engine.js',
  '/app/engine/compliance-engine.js',
  '/app/engine/constraint-engine.js',
  '/app/engine/validation-rules.js',
  '/app/engine/export-system.js',
  '/app/engine/orchestration-engine.js',
  '/app/engine/orchestration-engine-v2.js',
  '/app/engine/performance-monitor.js',
  '/app/engine/object-pool.js',
  '/app/components/canvas-manager.js',
  '/app/components/ui-controls.js',
  '/app/components/layers-panel.js',
  '/app/components/demo-helper.js',
  '/app/components/typography-renderer.js',
  '/app/components/interaction-manager.js',
  '/app/components/edit-mode-controller.js',
  '/app/components/contextual-tooltip.js',
  '/app/components/color-picker.js',
  '/app/components/test-runner.js'
];

// External CDN dependencies (fallback to cache)
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

/**
 * Install — cache all static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    }).then(() => {
      // Cache CDN assets separately (may fail due to CORS)
      return caches.open(CACHE_NAME + '-cdn').then((cdnCache) => {
        return Promise.allSettled(
          CDN_ASSETS.map(url => 
            fetch(url, { mode: 'no-cors' }).then(r => cdnCache.put(url, r))
          )
        );
      });
    }).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate — clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('kpmg-bce-') && name !== CACHE_NAME && name !== CACHE_NAME + '-cdn')
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch — serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Strategy: Cache First for static assets, Network First for API calls
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isCDNAsset(url)) {
    event.respondWith(cdnCacheFirst(request));
  } else {
    // Network first for everything else
    event.respondWith(networkFirst(request));
  }
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname.endsWith(asset)) ||
    url.pathname.match(/\.(js|css|html|json)$/);
}

/**
 * Check if URL is a CDN asset
 */
function isCDNAsset(url) {
  return CDN_ASSETS.some(asset => url.href.includes(asset));
}

/**
 * Cache First strategy
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // Return cached, but refresh in background
    refreshCache(request, cache);
    return cached;
  }

  // Not in cache, fetch and cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    // Return offline fallback if available
    return cache.match('/index.html');
  }
}

/**
 * CDN Cache First strategy
 */
async function cdnCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME + '-cdn');
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request, { mode: 'no-cors' });
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('[SW] CDN fetch failed:', error);
    return new Response('CDN asset unavailable offline', { status: 503 });
  }
}

/**
 * Network First strategy
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Refresh cache in background
 */
async function refreshCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (e) {
    // Silently fail background refresh
  }
}

/**
 * Message handler for cache management
 */
self.addEventListener('message', (event) => {
  const { data } = event;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({
          cached: keys.length,
          total: STATIC_ASSETS.length,
          ready: keys.length >= STATIC_ASSETS.length * 0.8
        });
      });
    });
  }

  if (data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name))).then(() => {
        event.ports[0].postMessage({ cleared: true });
      });
    });
  }
});
