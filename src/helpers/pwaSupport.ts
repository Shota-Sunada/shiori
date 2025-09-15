// 環境の PWA Push 対応可否を簡易判定
// 条件: iOS(iPhone/iPad/iPod) 16.4 未満 / Safari (Version/xx) 16.4 未満は未対応扱い
// それ以外は Feature Detection (PushManager, serviceWorker, Notification) の存在で暫定判定

export function detectPWAPushSupport() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { unsupportedPush: false, reason: 'ssr' } as const;
  }
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua);
  const safariMatch = ua.match(/Version\/(\d+)\.(\d+)(?:\.(\d+))?.*Safari/);
  const iosVersionMatch = ua.match(/OS (\d+)_?(\d+)?/); // iOS OS 16_5 like
  let iosVersionOk = false;
  let safariVersionOk = false;

  if (isIOS && iosVersionMatch) {
    const major = parseInt(iosVersionMatch[1], 10);
    const minor = parseInt(iosVersionMatch[2] || '0', 10);
    if (major < 16 || (major === 16 && minor < 4)) {
      return { unsupportedPush: true, reason: `iOS ${major}.${minor} < 16.4` } as const;
    }
    iosVersionOk = true; // 16.4+ なら潜在的に WebPush 対応 (A2HS 後)
  }
  if (safariMatch) {
    const sMajor = parseInt(safariMatch[1], 10);
    const sMinor = parseInt(safariMatch[2] || '0', 10);
    // Safari 16.4 以降で iOS 16.4 の WebPush が解放。macOS Safari も 16.0 以降は基本サポート(標準PushManager)
    if (sMajor < 16 || (sMajor === 16 && sMinor < 4)) {
      return { unsupportedPush: true, reason: `Safari ${sMajor}.${sMinor} < 16.4` } as const;
    }
    safariVersionOk = true;
  }
  // iOS Safari では A2HS (インストール) 後でないと PushManager が露出しないケースがあるため
  // 16.4+ なら PushManager の存在に依らず「サポート対象」とみなす
  if (iosVersionOk || safariVersionOk) {
    return { unsupportedPush: false, reason: 'version-supported' } as const;
  }

  const featureBased = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
  if (!featureBased) {
    return { unsupportedPush: true, reason: 'Missing Push APIs' } as const;
  }
  return { unsupportedPush: false, reason: 'supported' } as const;
}

// ユーザーの OS / ブラウザ種別とバージョンを簡易抽出
export function parseClientEnvironment() {
  if (typeof navigator === 'undefined') {
    return { browser: 'unknown', browserVersion: '0', os: 'unknown', osVersion: '0', ua: '' } as const;
  }
  const ua = navigator.userAgent;
  let browser = 'unknown';
  let browserVersion = '0';
  let os = 'unknown';
  let osVersion = '0';

  // OS 判定
  if (/Windows NT/.test(ua)) {
    os = 'Windows';
    const m = ua.match(/Windows NT ([0-9._]+)/);
    if (m) osVersion = m[1];
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const m = ua.match(/Android ([0-9.]+)/);
    if (m) osVersion = m[1];
  } else if (/iP(hone|ad|od)/.test(ua)) {
    os = 'iOS';
    const m = ua.match(/OS (\d+)_?(\d+)?_?(\d+)?/);
    if (m) osVersion = [m[1], m[2] || '0', m[3]].filter(Boolean).join('.');
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    const m = ua.match(/Mac OS X (\d+)_?(\d+)?_?(\d+)?/);
    if (m) osVersion = [m[1], m[2] || '0', m[3]].filter(Boolean).join('.');
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Browser 判定 (順序注意)
  // Edge はプラットフォームでトークンが Edg/ (Desktop), EdgA/ (Android), EdgiOS/ (iOS) になる
  // まず iOS 固有トークンや Chromium 派生で独自トークンを持つブラウザを優先的に検出する
  if (/FxiOS\//.test(ua)) {
    // Firefox on iOS
    browser = 'Firefox';
    const m = ua.match(/FxiOS\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox';
    const m = ua.match(/Firefox\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/(Edg|EdgA|EdgiOS)\//.test(ua)) {
    browser = 'Edge';
    const m = ua.match(/(Edg|EdgA|EdgiOS)\/(\d+\.?\d*)/);
    if (m) browserVersion = m[2];
  } else if (/Vivaldi\//.test(ua)) {
    browser = 'Vivaldi';
    const m = ua.match(/Vivaldi\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/SamsungBrowser\//.test(ua)) {
    browser = 'Samsung';
    const m = ua.match(/SamsungBrowser\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/UCBrowser\//.test(ua)) {
    browser = 'UCBrowser';
    const m = ua.match(/UCBrowser\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/Brave\//.test(ua) || /\bBrave\b/.test(ua)) {
    // Brave は多くの UA が Chromium ベースを引き継ぐため、Brave トークンを優先的に検出
    browser = 'Brave';
    const m = ua.match(/Brave\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
    else {
      const cm = ua.match(/(?:CriOS|Chrome|Chromium)\/(\d+\.?\d*)/);
      if (cm) browserVersion = cm[1];
    }
  } else if (/Chromium\//.test(ua)) {
    browser = 'Chromium';
    const m = ua.match(/Chromium\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/(?:Chrome|CriOS)\//.test(ua) && /Safari\//.test(ua) && !/(Edg|EdgA|EdgiOS)\//.test(ua) && !/OPR\//.test(ua)) {
    // Chrome on iOS uses the "CriOS/" token rather than "Chrome/". Accept both.
    browser = 'Chrome';
    const m = ua.match(/(?:CriOS|Chrome)\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/Safari\//.test(ua) && /Version\//.test(ua)) {
    browser = 'Safari';
    const m = ua.match(/Version\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  } else if (/OPR\//.test(ua)) {
    browser = 'Opera';
    const m = ua.match(/OPR\/(\d+\.?\d*)/);
    if (m) browserVersion = m[1];
  }

  return { browser, browserVersion, os, osVersion, ua } as const;
}
