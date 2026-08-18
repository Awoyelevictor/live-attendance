import api from './api';

// Helper to convert VAPID public key string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default', 'granted', 'denied'
}

export async function subscribeToPush(mode = 'always') {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // Request native permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, permission };
  }

  try {
    // 1. Get VAPID public key
    const res = await api.get('/notifications/vapid-public-key');
    const publicVapidKey = res.data.publicKey;

    // 2. Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 3. Subscribe with PushManager
    const convertedKey = urlBase64ToUint8Array(publicVapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // 4. Send subscription to backend
    await api.post('/notifications/subscribe', { subscription });

    // 5. Store user preference
    if (mode === 'always') {
      localStorage.setItem('attendly_notification_pref', 'always');
      sessionStorage.removeItem('attendly_notification_pref');
    } else if (mode === 'once') {
      sessionStorage.setItem('attendly_notification_pref', 'once');
      localStorage.removeItem('attendly_notification_pref');
    }

    return { success: true, permission, subscription };
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

export async function sendTestNotification() {
  // First trigger direct local notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        reg.showNotification('Attendly Test Notification', {
          body: 'Push notifications are working properly on your browser!',
          icon: '/favicon.ico',
          tag: 'test-push-' + Date.now(),
          renotify: true,
          data: { url: '/messages' }
        });
      } else {
        new Notification('Attendly Test Notification', {
          body: 'Push notifications are working properly on your browser!',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {
      console.warn('Local test notification fallback error:', e);
    }
  }

  try {
    const res = await api.post('/notifications/test-push');
    return res.data;
  } catch (error) {
    console.error('Failed to send test push from backend:', error);
    throw error;
  }
}
