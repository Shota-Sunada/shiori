import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import OneSignal from 'react-onesignal';

const runApp = async () => {
  await OneSignal.init({
    appId: '130fb1a3-f9af-4531-a73f-345da5fc6120',
    safari_web_id: 'web.onesignal.auto.212e621b-efc2-4b2a-9d36-9f4cd158ecec',
    allowLocalhostAsSecureOrigin: true
  });
  OneSignal.Slidedown.promptPush();
};

runApp();

createRoot(document.getElementById('root')!).render(<App />);
