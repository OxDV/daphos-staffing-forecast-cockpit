import { Builder, logging, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import fs from 'node:fs';
import path from 'node:path';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4200';
export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--window-size=1440,1100',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  );
  options.setLoggingPrefs({ browser: 'ALL' } as unknown as logging.Preferences);

  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

export async function captureFailureArtifacts(driver: WebDriver, label: string): Promise<void> {
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const screenshotDir = path.resolve(__dirname, '../../screenshots');
  const logDir = path.resolve(__dirname, '../../logs');
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  const image = await driver.takeScreenshot();
  fs.writeFileSync(path.join(screenshotDir, `${safeLabel}.png`), image, 'base64');

  try {
    const logs = await driver.manage().logs().get('browser');
    fs.writeFileSync(
      path.join(logDir, `${safeLabel}.json`),
      JSON.stringify(
        logs.map((entry) => ({
          level: entry.level.name,
          message: entry.message,
          timestamp: entry.timestamp,
        })),
        null,
        2,
      ),
    );
  } catch {
    fs.writeFileSync(path.join(logDir, `${safeLabel}.json`), '[]');
  }
}

export async function resetSeed(): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/test/reset-seed`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(
      `Seed reset failed with ${response.status}. Start the backend with DAPHOS_ALLOW_TEST_RESET=true.`,
    );
  }
}
