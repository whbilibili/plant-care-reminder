// Service Worker — PWA baseline + Web Push notifications.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Placeholder: future offline caching will layer on top.
});

// ─── Web Push ───

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback: treat as plain text
    payload = {
      title: "植物管家",
      body: event.data.text() || "你有养护任务需要处理",
    };
  }

  const title = payload.title || "植物管家";
  const options = {
    body: payload.body || "你有养护任务需要处理",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "plant-care-default",
    // If multiple tasks, show latest and collapse old ones with same tag
    renotify: true,
    data: {
      url: payload.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl);
      }),
  );
});
