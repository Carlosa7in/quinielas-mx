// Service Worker — Quinielas MX
// Recibe Web Push y muestra notificaciones

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Quinielas MX", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Quinielas MX";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo-tablitas.png",
    badge: "/logo-tablitas.png",
    tag: data.tag || "quinielas-notif",
    renotify: true,
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
