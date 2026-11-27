// IBeeFree: نسخة محلية للواجهة ليفتح التطبيق بدون إنترنت (حفظ أساسي).
// الواجهة: الشبكة أولاً ثم النسخة المحفوظة. مكتبات Firebase والخطوط: النسخة المحفوظة أولاً (تُحفظ عند أول فتح بالإنترنت).
// طلبات Firestore والمصادقة لا تمر من هنا إطلاقاً.
const CACHE = "chat-shell-v7";
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "logo.png"];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;

self.addEventListener("install", (e) => {
  // ملف ناقص لا يُفشل التثبيت كله
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))));
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
  if (r.method !== "GET") return;
  const url = new URL(r.url);

  // مكتبات Firebase والخطوط: من النسخة المحفوظة أولاً مع تحديث هادئ في الخلفية
  if (CDN.test(r.url)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(r).then((hit) => {
          const net = fetch(r).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;       // أي نطاق آخر (Firestore وغيره): لا نتدخل

  // صفحة التطبيق: الشبكة أولاً، وبدون إنترنت نعرض النسخة المحفوظة
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => { c.put("index.html", copy.clone()); c.put(r, copy); }); } return res; })
        .catch(() => caches.match(r).then((hit) => hit || caches.match("index.html") || caches.match("./")))
    );
    return;
  }

  // بقية ملفات الموقع: الشبكة أولاً، والنسخة المحفوظة عند انقطاعها
  e.respondWith(
    fetch(r)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r))
  );
});

/* ===== جاهزية الدفع في الخلفية (صامت تماماً: لا صوت ولا نغمة) =====
   يعمل عندما يرسل الخادم لاحقاً رسالة Push بصيغة JSON: { title, body, tag, chatId }
   للخصوصية: يُفضَّل ألا يحمل الخادم نص الرسالة، فيظهر العنوان فقط. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "IBeeFree", {
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
