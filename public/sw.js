self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'New Message', body: event.data ? event.data.text() : 'You have a new update.' };
  }

  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'chat-room-1', // Groups notifications by topic/conversation
    renotify: true, // Only alerts again if tag is the same
    urgency: 'high',
    timestamp: Date.now(),
    requireInteraction: false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Message', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetPath = event.notification?.data?.url || '/messages';
  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // 1. Check if any window client is open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin)) {
          // Send message to client page so React state can react instantly
          if (client.postMessage) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', url: fullTargetUrl, targetPath });
          }
          // Navigate client to full target URL with query params
          if ('navigate' in client) {
            client.navigate(fullTargetUrl);
          }
          if ('focus' in client) {
            return client.focus();
          }
        }
      }

      // 2. If no window client is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
