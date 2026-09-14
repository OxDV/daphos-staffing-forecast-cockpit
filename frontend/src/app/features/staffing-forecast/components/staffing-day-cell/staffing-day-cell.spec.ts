import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffingDayCell } from './staffing-day-cell';
import { StaffingDay } from '../../staffing.models';

describe('StaffingDayCell', () => {
  let fixture: ComponentFixture<StaffingDayCell>;

  const editableDay: StaffingDay = {
    date: '2026-09-15',
    forecastDemand: 12,
    effectiveDemand: 14,
    plannedStaffing: 11,
    confidence: 0.58,
    isCorrected: false,
    canOverride: true,
    understaffing: 3,
  };

  const lockedDay: StaffingDay = {
    ...editableDay,
    date: '2026-09-13',
    effectiveDemand: 12,
    plannedStaffing: 12,
    confidence: 0.82,
    understaffing: 0,
    canOverride: false,
  };

  const correctedDay: StaffingDay = {
    ...editableDay,
    isCorrected: true,
    confidence: 0.7,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffingDayCell],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffingDayCell);
  });

  it('renders understaffing and low confidence independently', () => {
    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', editableDay);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('#day-cell-B3-2026-09-15');
    expect(button?.className).toContain('staffing-day-cell--short');
    expect(button?.className).toContain('staffing-day-cell--low-confidence');
    expect(button?.getAttribute('data-staffing-status')).toBe('short');
    expect(button?.getAttribute('data-confidence-band')).toBe('low');
    expect(compiled.querySelector('[data-testid="staffing-status"]')?.textContent).toContain(
      'Short 3',
    );
    expect(compiled.querySelector('[data-testid="confidence-label"]')?.textContent).toContain(
      'Low',
    );
  });

  it('renders a locked day cell', () => {
    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', lockedDay);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cell = compiled.querySelector('#day-cell-B3-2026-09-13');
    expect(cell?.className).toContain('staffing-day-cell--locked');
    expect(cell?.className).toContain('staffing-day-cell--balanced');
    expect(cell?.className).toContain('staffing-day-cell--high-confidence');
    expect(cell?.textContent).toContain('Locked · past');
    expect(cell?.textContent).toContain('High');
  });

  it('renders corrected forecast and marker', () => {
    fixture.componentRef.setInput('wardCode', 'ICU');
    fixture.componentRef.setInput('day', correctedDay);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('#day-cell-ICU-2026-09-15');
    expect(button?.className).toContain('staffing-day-cell--corrected');
    expect(compiled.querySelector('[data-testid="forecast-demand"]')?.textContent).toContain('12');
    expect(compiled.querySelector('[data-testid="corrected-marker"]')?.textContent).toContain(
      'Corrected',
    );
    expect(compiled.querySelector('[data-testid="confidence-label"]')?.textContent).toContain(
      'Medium',
    );
  });

  it('emits dayActivate for editable and locked cells', () => {
    const emitted: StaffingDay[] = [];
    fixture.componentInstance.dayActivate.subscribe((day) => emitted.push(day));

    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', editableDay);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector('button')
      ?.dispatchEvent(new Event('click'));

    fixture.componentRef.setInput('day', lockedDay);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector('button')
      ?.dispatchEvent(new Event('click'));

    expect(emitted).toEqual([editableDay, lockedDay]);
  });

  it('marks the selected day cell', () => {
    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', editableDay);
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button')?.className,
    ).toContain('staffing-day-cell--selected');
  });
});
