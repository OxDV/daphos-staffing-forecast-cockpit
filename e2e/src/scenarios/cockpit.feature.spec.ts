import { By, until, WebDriver } from 'selenium-webdriver';

import { captureFailureArtifacts, createDriver, resetSeed } from '../helpers/runtime';
import { CockpitPage } from '../pages/cockpit.page';

describe('Staffing Forecast Cockpit E2E', () => {
  let driver: WebDriver;
  let page: CockpitPage;

  beforeAll(async () => {
    driver = await createDriver();
    page = new CockpitPage(driver);
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    await resetSeed();
  });

  async function withArtifacts(label: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      await captureFailureArtifacts(driver, label);
      throw error;
    }
  }

  it('browses previous and future weeks and updates the URL', async () => {
    await withArtifacts('week-navigation', async () => {
      await page.open();
      const initialWeek = await page.weekQueryParam();
      expect(initialWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const initialLabel = await page.weekRangeLabel();
      await page.goToNextWeek();
      const nextWeek = await page.weekQueryParam();
      expect(nextWeek).not.toBe(initialWeek);
      expect(await page.weekRangeLabel()).not.toBe(initialLabel);

      await page.goToPreviousWeek();
      expect(await page.weekQueryParam()).toBe(initialWeek);
      expect(await page.weekRangeLabel()).toBe(initialLabel);

      const wards = await driver.findElements(By.css('[data-testid^="ward-row-"]'));
      expect(wards.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows understaffing and low confidence as independent indicators', async () => {
    await withArtifacts('risk-indicators', async () => {
      await page.open();

      const shortCell = await driver.findElement(
        By.css(
          'button.staffing-day-cell[data-staffing-status="short"]:not(.staffing-day-cell--locked)',
        ),
      );
      expect(await shortCell.getAttribute('data-staffing-status')).toBe('short');
      const shortStatus = await shortCell.findElement(By.css('[data-testid="staffing-status"]'));
      expect(((await shortStatus.getAttribute('textContent')) ?? '').trim()).toMatch(/Short/);

      const lowConfidence = await driver.findElement(
        By.css(
          'button.staffing-day-cell[data-confidence-band="low"]:not(.staffing-day-cell--locked)',
        ),
      );
      expect(await lowConfidence.getAttribute('data-confidence-band')).toBe('low');
      const confidenceNode = await lowConfidence.findElement(
        By.css('[data-testid="confidence-label"], [data-testid="corrected-marker"]'),
      );
      expect(((await confidenceNode.getAttribute('textContent')) ?? '').trim().length).toBeGreaterThan(
        0,
      );

      expect(await shortCell.getAttribute('data-confidence-band')).toMatch(/low|medium|high/);
      expect(await lowConfidence.getAttribute('data-staffing-status')).toMatch(
        /short|balanced|surplus/,
      );
    });
  });

  it('rejects invalid corrections, saves valid ones, and persists after reload', async () => {
    await withArtifacts('override-flow', async () => {
      await page.open();
      const { testId, wardCode } = await page.openEditableUncorrectedDay();

      await page.submitOverride('20', '');
      expect(await page.justificationErrorVisible()).toBe(true);
      expect(await page.dialogCount()).toBe(1);

      await page.submitOverride('20', 'Two extra high-acuity admissions expected');
      await page.waitForDialogClosed();

      expect(await page.cellClass(testId)).toContain('staffing-day-cell--corrected');
      expect(await page.auditHistoryText()).toMatch(/Two extra high-acuity admissions expected/);
      expect(await page.summaryText(wardCode)).toMatch(/\d/);

      await driver.navigate().refresh();
      await page.waitForReady();
      expect(await page.cellClass(testId)).toContain('staffing-day-cell--corrected');

      await driver.findElement(By.css(`[data-testid="${testId}"]`)).click();
      expect(await page.auditHistoryText()).toMatch(/Two extra high-acuity admissions expected/);

      await page.deleteFirstAuditRecord();
      await page.waitForAuditEmpty();
      expect(await page.cellClass(testId)).not.toContain('staffing-day-cell--corrected');
    });
  });

  it('does not open the correction dialog for a past day', async () => {
    await withArtifacts('past-day', async () => {
      await page.open();
      await page.goToPreviousWeek();

      const locked = await driver.wait(
        until.elementLocated(By.css('button.staffing-day-cell--locked')),
        10000,
      );
      const testId = await locked.getAttribute('data-testid');
      expect(testId).toBeTruthy();
      await locked.click();

      expect(await page.dialogCount()).toBe(0);
      expect(await page.cellClass(testId!)).toContain('staffing-day-cell--locked');
      const correctButtons = await driver.findElements(
        By.css('[data-testid="correct-demand-button"]'),
      );
      expect(correctButtons.length).toBe(0);
      const sidebar = await driver.findElement(By.css('[data-testid="audit-sidebar"]'));
      expect(await sidebar.getText()).toMatch(/locked|No corrections|Audit history/i);
    });
  });
});
