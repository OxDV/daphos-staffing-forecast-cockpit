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
    expect(compiled.querySelector('[data-testid="correct-demand-button"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Needed');
    expect(compiled.textContent).toContain('demo.ward.manager@daphos.test');
  });

  it('emits correctDemand and hides the button for locked days', () => {
    const correctSpy = jest.fn();
    fixture.componentInstance.correctDemand.subscribe(correctSpy);
    fixture.componentRef.setInput('selectedDay', selected);
    fixture.componentRef.setInput('history', []);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="correct-demand-button"]')
      ?.click();
    expect(correctSpy).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('selectedDay', {
      ...selected,
      day: { ...selected.day, canOverride: false },
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="correct-demand-button"]'),
    ).toBeNull();
  });

  it('emits deleteOverride for editable days and hides delete on locked days', () => {
    const deleteSpy = jest.fn();
    fixture.componentInstance.deleteOverride.subscribe(deleteSpy);
    fixture.componentRef.setInput('selectedDay', selected);
    fixture.componentRef.setInput('history', history);
    fixture.componentRef.setInput('deletingOverrideId', null);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="audit-delete-button-ov-1"]')
      ?.click();
    expect(deleteSpy).toHaveBeenCalledWith('ov-1');

    fixture.componentRef.setInput('deletingOverrideId', 'ov-1');
    fixture.detectChanges();
    deleteSpy.mockClear();
    fixture.componentInstance['onDelete']('ov-1');
    expect(deleteSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('selectedDay', {
      ...selected,
      day: { ...selected.day, canOverride: false },
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="audit-delete-button-ov-1"]',
      ),
    ).toBeNull();
  });

  it('emits closed when the close button is used', () => {
    const closedSpy = jest.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);
    fixture.componentRef.setInput('selectedDay', selected);
    fixture.componentRef.setInput('history', []);
    fixture.componentRef.setInput('closable', true);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="audit-close-button"]')
      ?.click();
    expect(closedSpy).toHaveBeenCalledTimes(1);
  });
});
