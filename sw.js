// Офлайн-кэш «Мои приложения» (стартовое приложение).
// ВАЖНО: при каждом обновлении увеличивать VERSION — по этому изменению телефон узнаёт о новой версии.
// Сервис-воркер управляет только /apps/. Запросы к другим приложениям (/razmery/ и т. д.) и к api.github.com
// не перехватываются: их обслуживает сеть или сервис-воркеры самих приложений.
// Удаляются только свои старые кэши (apps-*). Кэш иконок apps-icons не трогается при обновлении.
const VERSION = '1.2';
const CACHE = 'apps-' + VERSION;
const ICON_CACHE = 'apps-icons';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];

const OFFLINE_PAGE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Мои приложения</title>'
  + '<body style="margin:0;font-family:sans-serif;background:#1d2733;color:#e9eef5;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">'
  + '<div style="padding:24px"><h2>Нет сети</h2><p>Сохранённая копия приложения не найдена (код A1).<br>Подключитесь к интернету и нажмите «Повторить».</p>'
  + '<button onclick="location.reload()" style="font-size:18px;padding:12px 24px;border:0;border-radius:10px;background:#1f6feb;color:#fff">Повторить</button></div>';

self.addEventListener('install', e => {
  // Новая версия скачивается целиком и ждёт, пока пользователь нажмёт «Обновить».
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))));
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('apps-') && k !== CACHE && k !== ICON_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // только свои файлы: тот же адрес и путь внутри /apps/
  if (u.origin !== location.origin || !req.url.startsWith(self.registration.scope)) return;
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      let hit = await cache.match(nav ? './index.html' : req, {ignoreSearch: true});
      if (!hit) hit = await caches.match(nav ? new URL('./index.html', self.registration.scope).href : req, {ignoreSearch: true});
      if (hit) return hit;
      return await fetch(req);
    } catch (_) {
      if (!nav) return new Response('', {status: 503});
      return new Response(OFFLINE_PAGE, {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
  })());
});
