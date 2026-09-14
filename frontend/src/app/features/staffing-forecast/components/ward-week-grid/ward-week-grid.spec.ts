import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WardWeekGrid } from './ward-week-grid';
import { WardWeek } from '../../staffing.models';

describe('WardWeekGrid', () => {
  let fixture: ComponentFixture<WardWeekGrid>;

  const wards: WardWeek[] = [
    {
      id: 'ward-1',
      code: 'B3',
      name: 'Ward B3',
      timezone: 'Europe/Berlin',
      days: [
        {
          date: '2026-09-14',
          forecastDemand: 12,
          effectiveDemand: 12,
          plannedStaffing: 11,
          confidence: 0.8,
          isCorrected: false,
          canOverride: true,
          understaffing: 1,
        },
      ],
      summary: {
        totalUnderstaffing: 1.5,
        manualCorrectionCount: 0,
        averageAbsoluteDeviation: null,
      },
    },
    {
      id: 'ward-2',
      code: 'ICU',
      name: 'ICU',
      timezone: 'Europe/Berlin',
      days: [
        {
          date: '2026-09-14',
          forecastDemand: 10,
          effectiveDemand: 12,
          plannedStaffing: 10,
          confidence: 0.7,
          isCorrected: true,
          canOverride: true,
          understaffing: 2,
        },
      ],
      summary: {
        totalUnderstaffing: 2,
        manualCorrectionCount: 1,
        averageAbsoluteDeviation: 2,
      },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WardWeekGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(WardWeekGrid);
    fixture.componentRef.setInput('wards', wards);
    fixture.componentRef.setInput('dayHeaders', ['2026-09-14']);
    fixture.detectChanges();
  });

  it('renders wards, day headers, and summaries', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#ward-row-B3')).toBeTruthy();
    expect(compiled.querySelector('#ward-week-summary-B3')?.textContent).toContain('—');
    expect(compiled.querySelector('#ward-week-summary-ICU')?.textContent).toContain('2');
    expect(compiled.textContent).toContain('Ward B3');
  });

  it('bubbles day selection from a cell click', () => {
    const selected: unknown[] = [];
    fixture.componentInstance.daySelected.subscribe((value) => selected.push(value));

    (fixture.nativeElement as HTMLElement)
      .querySelector('#day-cell-B3-2026-09-14')
      ?.dispatchEvent(new Event('click'));

    expect(selected).toEqual([
      {
        ward: wards[0],
        day: wards[0].days[0],
      },
    ]);
  });

  it('marks only the selected ward/date cell', () => {
    fixture.componentRef.setInput('selectedWardCode', 'B3');
    fixture.componentRef.setInput('selectedDate', '2026-09-14');
    fixture.detectChanges();

    const selected = (fixture.nativeElement as HTMLElement).querySelector(
      '#day-cell-B3-2026-09-14',
    );
    const other = (fixture.nativeElement as HTMLElement).querySelector(
      '#day-cell-ICU-2026-09-14',
    );

    expect(selected?.className).toContain('staffing-day-cell--selected');
    expect(other?.className).not.toContain('staffing-day-cell--selected');
  });
});
