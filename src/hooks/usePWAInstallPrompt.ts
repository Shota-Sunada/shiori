// PWA インストール (beforeinstallprompt) イベントを捕捉して再利用するためのフック。
// iOS Safari など未対応ブラウザでは prompt は提供されないため手動手順を案内。
import { useEffect, useState, useCallback } from 'react';

// Chrome系が提供する beforeinstallprompt イベント型の簡易定義
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>; // platform は非標準
}

export function usePWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [supported, setSupported] = useState(false);
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      // 標準のミニインフォバーを抑止
      e.preventDefault();
      setSupported(true);
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener, { passive: false });
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setOutcome(choice.outcome);
      // 一度使用したら再利用不可
      setDeferred(null);
    } catch {
      // noop
    }
  }, [deferred]);

  return { deferred, supported, promptInstall, outcome } as const;
}
