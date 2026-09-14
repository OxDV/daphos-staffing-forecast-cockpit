import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditSidebar } from './audit-sidebar';
import { DemandOverride, SelectedStaffingDay } from '../../staffing.models';

describe('AuditSidebar', () => {
  let fixture: ComponentFixture<AuditSidebar>;

  const selected: SelectedStaffingDay = {
    wardId: 'ward-1',
    wardCode: 'B3',
    wardName: 'Ward B3',
    day: {
      date: '2026-09-16',
      forecastDemand: 12,
      effectiveDemand: 14,
      plannedStaffing: 11,
      confidence: 0.8,
      isCorrected: true,
      canOverride: true,
      understaffing: 3,
    },
  };

  const history: DemandOverride[] = [
    {
      id: 'ov-1',
      previousDemand: 12,
      correctedDemand: 14,
      justification: 'Needed',
      correctedBy: 'demo.ward.manager@daphos.test',
      correctedAt: '2026-09-14T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditSidebar);
  });

  it('shows placeholder when no day is selected', () => {
    fixture.componentRef.setInput('selectedDay', null);
    fixture.componentRef.setInput('history', []);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="audit-sidebar-placeholder"]',
      ),
    ).toBeTruthy();
  });

  it('renders history items for the selected day', () => {
    fixture.componentRef.setInput('selectedDay', selected);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#audit-history-list')).toBeTruthy();
    expect(compiled.textContent).toContain('Needed');
    expect(compiled.textContent).toContain('demo.ward.manager@daphos.test');
  });
});
