import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffingDayCell } from './staffing-day-cell';
import { StaffingDay } from '../../staffing.models';

describe('StaffingDayCell', () => {
  let fixture: ComponentFixture<StaffingDayCell>;

  const editableDay: StaffingDay = {
    date: '2026-09-15',
    forecastDemand: 12,
    effectiveDemand: 12,
    plannedStaffing: 11,
    confidence: 0.58,
    isCorrected: false,
    canOverride: true,
    understaffing: 1,
  };

  const lockedDay: StaffingDay = {
    ...editableDay,
    date: '2026-09-13',
    canOverride: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffingDayCell],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffingDayCell);
  });

  it('renders an editable day cell', () => {
    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', editableDay);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('#day-cell-B3-2026-09-15');
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.textContent).toContain('12');
    expect(button?.textContent).toContain('/11');
    expect(button?.textContent).toContain('58%');
  });

  it('renders a locked day cell', () => {
    fixture.componentRef.setInput('wardCode', 'B3');
    fixture.componentRef.setInput('day', lockedDay);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const cell = compiled.querySelector('#day-cell-B3-2026-09-13');
    expect(cell?.className).toContain('staffing-day-cell--locked');
    expect(cell?.textContent).toContain('Locked · past');
  });
});
