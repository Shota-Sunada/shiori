// Import the Firebase scripts using the compatible (classic) version
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

import { precacheAndRoute } from 'workbox-precaching';

// This is the placeholder for the Workbox manifest
precacheAndRoute(self.__WB_MANIFEST);

console.log('[FCM SW] Service Worker starting...');

const firebaseConfig = {
  apiKey: 'AIzaSyANQYjNkd9Ay-ctK_nwhYp6WQK9ufcs-rc',
  authDomain: 'shudo-shiori-79.firebaseapp.com',
  databaseURL: 'https://shudo-shiori-79-default-rtdb.firebaseio.com',
  projectId: 'shudo-shiori-79',
  storageBucket: 'shudo-shiori-79.firebasestorage.app',
  messagingSenderId: '775436195688',
  appId: '1:775436195688:web:d8cd3e6cab31e583b468dd',
  measurementId: 'G-R1J4D68V93'
};

try {
  console.log('[FCM SW] Initializing Firebase with config:', firebaseConfig);

  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    console.log('[FCM SW] Firebase Messaging initialized.');

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Received background message:', payload);

      // Check if there are any active client windows
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true // Include clients that are not yet controlled by this SW
        })
        .then((clients) => {
          if (clients && clients.length > 0) {
            // App is in foreground/active tab, do not show system notification
            console.log('[FCM SW] App is in foreground, not showing system notification.');
          } else {
            // App is in background or closed, show system notification
            console.log('[FCM SW] App is in background, showing system notification.');
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
              body: payload.notification.body,
              icon: '/icon.png',
              data: {
                url: payload.fcmOptions.link
              }
            };
            self.registration.showNotification(notificationTitle, notificationOptions);
          }
        });
    });
  }
} catch (e) {
  console.error('[FCM SW] Error during initialization:', e);
}

self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification click Received.');

  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url));
});
