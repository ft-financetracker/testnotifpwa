const CACHE_NAME = 'pwa-notification-test-v1';
const APP_SHELL = ['./','./index.html','./app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') e.waitUntil(show(e.data.payload || {}));
});
self.addEventListener('push', e => {
  let payload={title:'Pesan Baru',body:'Ada informasi baru untuk Anda',url:'./?page=messages'};
  try { if(e.data) payload={...payload,...e.data.json()}; } catch { if(e.data) payload.body=e.data.text(); }
  e.waitUntil(show(payload));
});
async function show(payload){
  return self.registration.showNotification(payload.title||'Pesan Baru',{
    body:payload.body||'Ini adalah pesan dummy dari aplikasi PWA.',
    icon:'./icons/icon-192.png', badge:'./icons/icon-192.png',
    tag:payload.tag||'pwa-notification-test', renotify:true,
    data:{url:payload.url||'./'}
  });
}
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){ if('focus' in client){ client.navigate?.(target); return client.focus(); } }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
