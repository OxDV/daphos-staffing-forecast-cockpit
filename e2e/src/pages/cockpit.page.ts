import { By, until, WebDriver } from 'selenium-webdriver';

import { BASE_URL } from '../helpers/runtime';

export class CockpitPage {
  constructor(private readonly driver: WebDriver) {}

  async open(week?: string): Promise<void> {
    const query = week ? `?week=${week}` : '';
    await this.driver.get(`${BASE_URL}/${query}`);
    await this.waitForReady();
  }

  async waitForReady(): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[data-testid="ward-week-grid"]')), 15000);
  }

  async weekQueryParam(): Promise<string | null> {
    const url = new URL(await this.driver.getCurrentUrl());
    return url.searchParams.get('week');
  }

  async weekRangeLabel(): Promise<string> {
    const el = await this.driver.findElement(By.css('[data-testid="week-range-label"]'));
    return ((await el.getAttribute('textContent')) ?? '').trim();
  }

  async goToPreviousWeek(): Promise<void> {
    const beforeWeek = await this.weekQueryParam();
    const beforeLabel = await this.weekRangeLabel();
    await this.driver.findElement(By.css('[data-testid="week-previous-button"]')).click();
    await this.driver.wait(async () => (await this.weekQueryParam()) !== beforeWeek, 10000);
    await this.driver.wait(async () => (await this.weekRangeLabel()) !== beforeLabel, 10000);
    await this.waitForReady();
  }

  async goToNextWeek(): Promise<void> {
    const beforeWeek = await this.weekQueryParam();
    const beforeLabel = await this.weekRangeLabel();
    await this.driver.findElement(By.css('[data-testid="week-next-button"]')).click();
    await this.driver.wait(async () => (await this.weekQueryParam()) !== beforeWeek, 10000);
    await this.driver.wait(async () => (await this.weekRangeLabel()) !== beforeLabel, 10000);
    await this.waitForReady();
  }

  async openEditableUncorrectedDay(): Promise<{ testId: string; wardCode: string }> {
    const cells = await this.driver.findElements(
      By.css(
        'button.staffing-day-cell:not(.staffing-day-cell--locked):not(.staffing-day-cell--corrected)',
      ),
    );
    if (cells.length === 0) {
      throw new Error('No editable uncorrected day cell found');
    }
    const cell = cells[0];
    const testId = (await cell.getAttribute('data-testid')) ?? '';
    const wardCode = (await cell.getAttribute('data-ward-code')) ?? '';
    if (!testId || !wardCode) {
      throw new Error('Editable day cell is missing required data attributes');
    }
    await cell.click();
    await this.driver.wait(until.elementLocated(By.css('[data-testid="override-dialog"]')), 5000);
    return { testId, wardCode };
  }

  async setInputValue(testId: string, value: string): Promise<void> {
    const input = await this.driver.findElement(By.css(`[data-testid="${testId}"]`));
    await input.click();
    await this.driver.executeScript(
      `
        const el = arguments[0];
        el.focus();
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      `,
      input,
    );
    await input.sendKeys(value);
    await this.driver.wait(async () => (await input.getAttribute('value')) === value, 5000);
  }

  async submitOverride(correctedDemand: string, justification: string): Promise<void> {
    await this.setInputValue('corrected-demand-input', correctedDemand);
    await this.setInputValue('justification-input', justification);
    await this.driver.findElement(By.css('[data-testid="override-save-button"]')).click();
  }

  async waitForDialogClosed(): Promise<void> {
    await this.driver.wait(async () => {
      const dialogs = await this.driver.findElements(By.css('[data-testid="override-dialog"]'));
      return dialogs.length === 0;
    }, 10000);
  }

  async justificationErrorVisible(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.css('[data-testid="justification-error"]')),
        3000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async auditHistoryText(): Promise<string> {
    const list = await this.driver.wait(
      until.elementLocated(By.css('[data-testid="audit-history-list"]')),
      10000,
    );
    return ((await list.getAttribute('textContent')) ?? '').trim();
  }

  async summaryText(wardCode: string): Promise<string> {
    const summary = await this.driver.findElement(
      By.css(`[data-testid="ward-week-summary-${wardCode}"]`),
    );
    return ((await summary.getAttribute('textContent')) ?? '').trim();
  }

  async cellClass(testId: string): Promise<string> {
    const cell = await this.driver.findElement(By.css(`[data-testid="${testId}"]`));
    return (await cell.getAttribute('class')) ?? '';
  }

  async dialogCount(): Promise<number> {
    return (await this.driver.findElements(By.css('[data-testid="override-dialog"]'))).length;
  }

  async textContent(selector: string): Promise<string> {
    const el = await this.driver.findElement(By.css(selector));
    return ((await el.getAttribute('textContent')) ?? '').trim();
  }
}
