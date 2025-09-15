// しおりキャッシュ削除用ユーティリティ
// jwt_tokenは保持し、それ以外のlocalStorage/sessionStorageキャッシュを削除
export function clearShioriCache() {
  try {
    const keepKeys = ['jwt_token'];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keepKeys.includes(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

// appFetchCache_で始まるlocalStorageキャッシュのみ削除
export function clearAllAppFetchLocalStorageCache() {
  try {
    const prefix = 'appFetchCache_';
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
