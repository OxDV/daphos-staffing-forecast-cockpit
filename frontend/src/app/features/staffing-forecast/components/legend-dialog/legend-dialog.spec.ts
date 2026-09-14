import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { LegendDialog } from './legend-dialog';
import {
  LEGEND_AUTO_OPEN_STORAGE_KEY,
  setLegendAutoOpenDismissed,
} from '../../legend-preference';

describe('LegendDialog', () => {
  let fixture: ComponentFixture<LegendDialog>;
  const close = jest.fn();
  let beforeClosed$: Subject<void>;

  beforeEach(async () => {
    localStorage.removeItem(LEGEND_AUTO_OPEN_STORAGE_KEY);
    beforeClosed$ = new Subject<void>();
    await TestBed.configureTestingModule({
      imports: [LegendDialog],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close,
            beforeClosed: () => beforeClosed$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegendDialog);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(LEGEND_AUTO_OPEN_STORAGE_KEY);
  });

  it('renders the legend sample and closes on Got it', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="legend-dialog"]')).toBeTruthy();
    expect(compiled.textContent).toContain('How to read a day card');
    expect(compiled.textContent).toContain('effective demand');

    compiled.querySelector<HTMLButtonElement>('[data-testid="legend-close-button"]')?.click();
    expect(close).toHaveBeenCalled();
  });

  it('persists don’t-show-again when checked before close', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const checkbox = compiled.querySelector<HTMLInputElement>(
      '[data-testid="legend-dont-show-again-input"]',
    );
    expect(checkbox).toBeTruthy();
    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    beforeClosed$.next();
    beforeClosed$.complete();
    expect(localStorage.getItem(LEGEND_AUTO_OPEN_STORAGE_KEY)).toBe('1');
  });

  it('clears don’t-show-again when unchecked before close', () => {
    setLegendAutoOpenDismissed(true);
    beforeClosed$ = new Subject<void>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LegendDialog],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close,
            beforeClosed: () => beforeClosed$.asObservable(),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(LegendDialog);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const checkbox = compiled.querySelector<HTMLInputElement>(
      '[data-testid="legend-dont-show-again-input"]',
    );
    expect(checkbox?.checked).toBe(true);
    checkbox!.checked = false;
    checkbox!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    beforeClosed$.next();
    beforeClosed$.complete();
    expect(localStorage.getItem(LEGEND_AUTO_OPEN_STORAGE_KEY)).toBeNull();
  });
});
