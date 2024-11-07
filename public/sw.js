const CACHE_NAME = 'arcadia-cache-v1';
const FALLBACK_IMAGE = '/images/placeholder.jpg';
const IMAGE_PATHS = [
  '/images/Featured_Games/elden-ring.jpg',
  '/images/Featured_Games/wow.jpg',
  '/images/Featured_Games/cyberpunk.jpg',
  '/images/Featured_Games/fortnite.jpg',
  '/images/Featured_Games/witcher.jpg',
  '/images/partners/partner4.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        FALLBACK_IMAGE,
        ...IMAGE_PATHS
      ]);
    })
  )
});

// Fetch event - handle requests with fallback for images
self.addEventListener('fetch', (event) => {
  // Check if the request is for an image
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached response if found
          if (response) {
            return response;
          }
          
          // Try network request
          return fetch(event.request)
            .then((networkResponse) => {
              // Check if we received a valid response
              if (networkResponse && networkResponse.status === 200) {
                // Cache the new image for future use
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, clonedResponse);
                  });
                
                return networkResponse;
              }
              
              // Return fallback image if the request failed
              return caches.match(FALLBACK_IMAGE);
            })
            .catch(() => {
              // Return fallback image on network error
              return caches.match(FALLBACK_IMAGE);
            });
        })
    );
  } else {
    // Handle non-image requests normally
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});