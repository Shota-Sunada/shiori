import { useAuth } from '../auth-context';
import Button from '../components/Button';
import { handleEnableNotifications } from '../helpers/notifications';
import { useState, useEffect } from 'react';

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
      <p className="font-bold text-2xl">通知がブロックされています</p>
      <p className="mt-2">このアプリを最大限に活用するには、通知を許可する必要があります。</p>
      <div className="mt-4 p-4 border rounded-md bg-gray-100 text-left max-w-md">
        <p className="font-semibold">設定をリセットするには:</p>
        {renderInstructions()}
      </div>
    </>
  );
};

const NonNotification = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'default' | 'denied' | 'granted' | 'prompt'>(Notification.permission);

  useEffect(() => {
    const updatePermission = () => {
      setPermission(Notification.permission);
    };

    if ('permissions' in navigator && 'query' in navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        setPermission(status.state);
        status.onchange = () => {
          setPermission(status.state);
        };
      });
    } else {
      const interval = setInterval(updatePermission, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const renderContent = () => {
    switch (permission) {
      case 'granted':
        return (
          <>
            <p className="font-bold text-2xl">{'ありがとうございます！'}</p>
            <p>{'通知が有効になりました！'}</p>
            <Button text="ホームへ" arrow link="/"/>
          </>
        );
      case 'denied':
        return <DeniedInstructions />;
      default: // 'default' or 'prompt'
        return (
          <>
            <p className="font-bold text-2xl">{'通知を有効化してください'}</p>
            <p>{'このしおりでは、通知が重要な役割を果たします。'}</p>
            <p>{'お願いですから、通知を許可してください。'}</p>
            <Button text="通知を許可する" arrow onClick={() => handleEnableNotifications(user)} />
          </>
        );
    }
  };

  return <div className="flex flex-col items-center justify-center m-[10px] text-center">{renderContent()}</div>;
};

export default NonNotification;
