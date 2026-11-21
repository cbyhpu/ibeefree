// يحفظ نسخة من واجهة التطبيق ليفتح بسرعة. يجرّب الشبكة أولاً حتى تصل التحديثات.
const CACHE = "chat-shell-v3";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
        return res;
      })
      .catch(() => caches.match(r))
  );
});

/* ===== جاهزية الدفع في الخلفية (صامت تماماً: لا صوت ولا نغمة) =====
   يعمل عندما يرسل الخادم لاحقاً رسالة Push بصيغة JSON: { title, body, tag, chatId }
   للخصوصية: يُفضَّل ألا يحمل الخادم نص الرسالة، فيظهر العنوان فقط. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "I Bee Free", {
    body: d.body || "",
    tag: d.tag || "ibf",
    icon: "icon-192.png",
    badge: "icon-192.png",
    silent: true,
    data: { chatId: d.chatId || null }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow("./");
    })
  );
});
