// オフライン検出: trueならネットワーク不可
export function isOffline(): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return false;
}
