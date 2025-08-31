// Import the Firebase scripts using the compatible (classic) version
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

console.log('[FCM SW] Service Worker starting...');

// Get Firebase config from URL query parameters
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfigParam = urlParams.get('firebaseConfig');

if (firebaseConfigParam) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigParam);
    console.log('[FCM SW] Initializing Firebase with config:', firebaseConfig);

    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();
      console.log('[FCM SW] Firebase Messaging initialized.');

      messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload);

  // Check if there are any active client windows
  self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true // Include clients that are not yet controlled by this SW
  }).then(clients => {
    if (clients && clients.length > 0) {
      // App is in foreground/active tab, do not show system notification
      console.log('[FCM SW] App is in foreground, not showing system notification.');
    } else {
      // App is in background or closed, show system notification
      console.log('[FCM SW] App is in background, showing system notification.');
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png'
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    }
  });
});
    }
  } catch (e) {
    console.error('[FCM SW] Error during initialization:', e);
  }
} else {
  console.error('[FCM SW] Firebase config not found in URL.');
}
