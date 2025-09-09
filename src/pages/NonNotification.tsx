import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type NavigatorWithPermissions = Navigator & {
  permissions?: {
    query: (descriptor: { name: PermissionName | 'notifications' }) => Promise<PermissionStatus>;
  };
};
import { useAuth } from '../auth-context';
import MDButton from '../components/MDButton';
import { handleEnableNotifications, requestPermissionWithTimeout, ensureRegistrationIfGranted, attemptSilentRegistration } from '../helpers/notifications';
import CenterMessage from '../components/CenterMessage';

const DeniedInstructions = () => {
  const [browser, setBrowser] = useState('unknown');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setBrowser('ios');
      return;
    }
    if (isAndroid) {
      if (ua.includes('fxios') || ua.includes('firefox')) {
        setBrowser('firefox_android');
        return;
      }
      // Most other browsers on Android are Chromium-based
      setBrowser('chrome_android');
      return;
    }
    setBrowser('desktop');
  }, []);

  const renderInstructions = () => {
    switch (browser) {
      case 'ios':
        return (
          <ol className="list-decimal list-inside mt-2 space-y-2">
            <li>
              {'iPhone/iPadの'}
              <span className="font-bold">{'「設定」'}</span>
              {'アプリを開きます。'}
            </li>
            <li>{'一覧からお使いのブラウザ（Safariなど）を選択します。'}</li>
            <li>
              {'「サイトの設定」を探し、'}
              <span className="font-bold">{'「通知」'}</span>
              {'をタップします。'}
            </li>
            <li>{'このサイトの通知を「許可」に変更してください。'}</li>
          </ol>
        );
      case 'chrome_android':
        return (
          <ol className="list-decimal list-inside mt-2 space-y-2">
            <li>
              {'アドレスバーの横にある'}
              <span className="font-mono font-bold">{'🔒鍵アイコン'}</span>
              {'または'}
              <span className="font-mono font-bold">{'︙メニュー'}</span>
              {'をタップします。'}
            </li>
            <li>
              <span className="font-bold">{'「権限」'}</span>
              {'または'}
              <span className="font-bold">{'「サイトの設定」'}</span>
              {'を選択します。'}
            </li>
            <li>
              <span className="font-bold">{'「通知」'}</span>
              {'を見つけて、「許可」に設定してください。'}
            </li>
          </ol>
        );
      case 'firefox_android':
        return (
          <ol className="list-decimal list-inside mt-2 space-y-2">
            <li>
              {'アドレスバーの横にある'}
              <span className="font-mono font-bold">{'🔒鍵アイコン'}</span>
              {'をタップします。'}
            </li>
            <li>
              <span className="font-bold">{'「サイトの権限を編集」'}</span>
              {'を選択します。'}
            </li>
            <li>
              <span className="font-bold">{'「通知」'}</span>
              {'の項目で「許可」を選択してください。'}
            </li>
          </ol>
        );
      default: // desktop or unknown
        return (
          <ol className="list-decimal list-inside mt-2 space-y-2">
            <li>
              {'ブラウザのアドレスバーの横にある'}
              <span className="font-mono font-bold bg-gray-200 px-1 rounded">{'🔒鍵アイコン'}</span>
              {'をクリックします。'}
            </li>
            <li>{'「通知」の権限を見つけて、「許可」に変更します。'}</li>
            <li>{'ページを再読み込みすると、アプリに戻ります。'}</li>
          </ol>
        );
    }
  };

  return (
    <>
      <p className="font-bold text-2xl">{'通知がブロックされています'}</p>
      <p className="mt-2">{'このアプリを最大限に活用するには、通知を許可する必要があります。'}</p>
      <div className="mt-4 p-4 border rounded-md bg-gray-100 text-left max-w-md">
        <p className="font-semibold">{'設定をリセットするには:'}</p>
        {renderInstructions()}
      </div>
    </>
  );
};

const NonNotification = () => {
  const { user } = useAuth();
  const initialPermission: NotificationPermission | 'prompt' = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  const [permission, setPermission] = useState<NotificationPermission | 'prompt'>(initialPermission);
  const navigate = useNavigate();

  useEffect(() => {
    const updatePermission = () => {
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    };

    if (typeof navigator !== 'undefined' && (navigator as NavigatorWithPermissions).permissions && typeof (navigator as NavigatorWithPermissions).permissions?.query === 'function') {
      try {
        (navigator as NavigatorWithPermissions).permissions!.query({ name: 'notifications' }).then((status: PermissionStatus) => {
          setPermission(status.state);
          status.onchange = () => setPermission(status.state);
        });
      } catch {
        const interval = setInterval(updatePermission, 1200);
        return () => clearInterval(interval);
      }
    } else {
      const interval = setInterval(updatePermission, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const isiOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const onEnable = useCallback(async () => {
    if (!isiOS) {
      try {
        localStorage.setItem('notifyAttemptTs', String(Date.now()));
      } catch {
        /* ignore storage error */
      }
      // 権限取得 + サイレント登録の両方を試みる
      handleEnableNotifications(user);
      attemptSilentRegistration(user);
      return;
    }
    // iOS: requestPermission のハング対策として直接 timeout 付き呼び出し + ポーリング
    console.info('[notifications] iOS enable click');
    try {
      localStorage.setItem('notifyAttemptTs', String(Date.now()));
    } catch {
      /* ignore storage error */
    }
    const result = await requestPermissionWithTimeout(3500);
    // iOSでもサイレント登録を試みて、既に有効なケースでフラグを立てる
    attemptSilentRegistration(user);
    if (result === 'timeout') {
      // タイムアウト後数回ポーリングして granted を拾いに行く
      let attempts = 0;
      const maxAttempts = 7; // 約 7 * 400ms ≒ 2.8s
      const poll = () => {
        attempts++;
        const p = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        setPermission(p as NotificationPermission);
        if (p === 'granted' || p === 'denied' || attempts >= maxAttempts) {
          console.info('[notifications] poll end', { p, attempts });
          return;
        }
        setTimeout(poll, 400);
      };
      poll();
    } else {
      // 正常に permission 取得できた場合は state 更新
      if (result !== Notification.permission) {
        // 取りこぼし防止：現行値を再確認
        const current = Notification.permission;
        setPermission(current);
      } else {
        setPermission(result);
      }
    }
  }, [user, isiOS]);

  // 許可されたら自動でホームへ遷移（iOS PWAで「許可」後画面が変わらない問題への対策）
  useEffect(() => {
    if (permission === 'granted') {
      // 許可直後にFCM登録を確実に実行
      ensureRegistrationIfGranted(user);
      // 少し遅延して ServiceWorker 登録等の非同期処理を進めつつ UX を自然に
      const timer = setTimeout(() => {
        if (user) {
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [permission, user, navigate]);

  let content: React.ReactNode;
  if (permission === 'granted') {
    content = (
      <>
        <p className="font-bold text-2xl mb-2">{'ありがとうございます！'}</p>
        <p className="mb-4">{'通知が有効になりました。'}</p>
        <MDButton text="ホームへ" arrowRight link="/" />
      </>
    );
  } else if (permission === 'denied') {
    content = <DeniedInstructions />;
  } else {
    content = (
      <>
        <p className="font-bold text-2xl mb-2">{'通知を有効化してください'}</p>
        <p className="mb-1">{'このしおりでは通知が重要な役割を果たします。'}</p>
        <p className="mb-4">{'点呼開始などを受け取るため通知を許可してください。'}</p>
        <MDButton text="通知を許可する" arrowRight onClick={onEnable} />
      </>
    );
  }

  return <CenterMessage>{content}</CenterMessage>;
};

export default NonNotification;
