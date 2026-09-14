export const LEGEND_AUTO_OPEN_STORAGE_KEY = 'daphos.cockpit.legend.dontShowAgain';

export function isLegendAutoOpenDismissed(
  storage: Pick<Storage, 'getItem'> = localStorage,
): boolean {
  try {
    return storage.getItem(LEGEND_AUTO_OPEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLegendAutoOpenDismissed(
  dismissed: boolean,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
): void {
  try {
    if (dismissed) {
      storage.setItem(LEGEND_AUTO_OPEN_STORAGE_KEY, '1');
    } else {
      storage.removeItem(LEGEND_AUTO_OPEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures (private mode / disabled storage).
  }
}
