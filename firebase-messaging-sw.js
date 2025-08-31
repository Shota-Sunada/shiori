// Import the Firebase scripts using the compatible (classic) version
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

// Get Firebase config from URL query parameters
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfigParam = urlParams.get('firebaseConfig');

// Initialize Firebase if the config is present
if (firebaseConfigParam) {
  const firebaseConfig = JSON.parse(firebaseConfigParam);
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Received background message ",
      payload
    );
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: "/icon.png",
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}