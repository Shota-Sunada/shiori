/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// --- Type Declarations ---
interface FirebaseMessaging {
  onBackgroundMessage(callback: (payload: MessagePayload) => void): void;
}

interface FirebaseNamespace {
  apps: readonly object[];
  initializeApp(config: object): object;
  messaging(): FirebaseMessaging;
}

interface MessagePayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: { [key: string]: string };
}

declare const firebase: FirebaseNamespace;

// --- Workbox (for PWA) ---
// self.__WB_MANIFEST is injected by VitePWA plugin.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

// --- Firebase (for Push Notifications) ---
try {
  // Using compat for broader compatibility and since the original sw used it.
  importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');
} catch (e) {
  console.error('[sw.ts] Failed to import Firebase scripts', e);
}

self.addEventListener('message', (event) => {
  console.log('[sw.ts] Message received:', event.data);
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    const firebaseConfig = event.data.config;
    console.log('[sw.ts] Initializing Firebase with config:', firebaseConfig);

    try {
      if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();
        console.log('[sw.ts] Firebase Messaging initialized.');

        // This handler is for when the app is in the background.
        messaging.onBackgroundMessage((payload: MessagePayload) => {
          console.log('[sw.ts] Received background message:', payload);
          const notificationTitle = payload.notification?.title;
          const notificationOptions = {
            body: payload.notification?.body,
            icon: '/icon.png'
          };
          if (notificationTitle) {
            self.registration.showNotification(notificationTitle, notificationOptions);
          }
        });
      } else {
        console.log('[sw.ts] Firebase already initialized or not loaded.');
      }
    } catch (e) {
      console.error('[sw.ts] Error during Firebase initialization:', e);
    }
  }
});

// Raw push event listener for diagnostics
self.addEventListener('push', (event) => {
  console.log('[sw.ts] Raw push event received:', event);
  if (event.data) {
    console.log('[sw.ts] Push event data:', event.data.text());
  }
  // Note: We are not showing a notification here because onBackgroundMessage should handle it.
  // If onBackgroundMessage fails, this log will still appear, which is useful for debugging.
});
