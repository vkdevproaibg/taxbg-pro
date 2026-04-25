const CACHE = 'taxbgpro-v1'

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache Supabase — financial data must always be fresh
  if (url.hostname.includes('supabase.co')) return
  // Never cache non-GET
  if (request.method !== 'GET') return
  // Skip browser-extension / chrome-extension requests
  if (!url.protocol.startsWith('http')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
      // Stale-while-revalidate: return cache instantly, update in background
      return cached || network
    })
  )
})
