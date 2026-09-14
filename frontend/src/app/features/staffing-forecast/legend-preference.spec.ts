import { isLegendAutoOpenDismissed, setLegendAutoOpenDismissed } from './legend-preference';

describe('legend preference', () => {
  it('reads and writes the dismissed flag', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };

    expect(isLegendAutoOpenDismissed(storage)).toBe(false);
    setLegendAutoOpenDismissed(true, storage);
    expect(isLegendAutoOpenDismissed(storage)).toBe(true);
    setLegendAutoOpenDismissed(false, storage);
    expect(isLegendAutoOpenDismissed(storage)).toBe(false);
  });
});
