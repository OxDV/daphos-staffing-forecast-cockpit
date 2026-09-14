import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OverrideDialog } from './override-dialog';
import { StaffingWeekStore } from '../../data-access/staffing-week.store';
import { OverridePolicy, StaffingDay } from '../../staffing.models';

type OverrideDialogHarness = OverrideDialog & {
  form: OverrideDialog['form'];
  onSubmit: () => void;
  onCancel: () => void;
};

describe('OverrideDialog', () => {
  let fixture: ComponentFixture<OverrideDialog>;
  let dialog: OverrideDialogHarness;
  let store: {
    overrideSubmitting: () => boolean;
    overrideError: () => string | null;
    createOverride: jest.Mock;
  };

  const day: StaffingDay = {
    date: '2026-09-16',
    forecastDemand: 12,
    effectiveDemand: 12,
    plannedStaffing: 11,
    confidence: 0.8,
    isCorrected: false,
    canOverride: true,
    understaffing: 1,
  };

  const policy: OverridePolicy = {
    absoluteJustificationThreshold: 2,
    relativeJustificationThreshold: 0.2,
  };

  beforeEach(async () => {
    store = {
      overrideSubmitting: () => false,
      overrideError: () => null,
      createOverride: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OverrideDialog],
      providers: [{ provide: StaffingWeekStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(OverrideDialog);
    dialog = fixture.componentInstance as OverrideDialogHarness;
    fixture.componentRef.setInput('wardId', 'ward-1');
    fixture.componentRef.setInput('wardName', 'Ward B3');
    fixture.componentRef.setInput('day', day);
    fixture.componentRef.setInput('policy', policy);
    fixture.detectChanges();
  });

  it('emits closed on cancel', () => {
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);

    dialog.onCancel();

    expect(closed).toHaveBeenCalled();
  });

  it('shows client validation errors and does not submit', () => {
    dialog.form.setValue({ correctedDemand: 15, justification: '' });
    dialog.onSubmit();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#justification-error')?.textContent,
    ).toContain('justification');
    expect(store.createOverride).not.toHaveBeenCalled();
  });

  it('blocks submit when corrected demand is missing', () => {
    dialog.form.setValue({ correctedDemand: null, justification: 'ok' });
    dialog.onSubmit();

    expect(store.createOverride).not.toHaveBeenCalled();
  });

  it('saves a valid correction and closes', () => {
    store.createOverride.mockReturnValue(of({}));
    const closed = jest.fn();
    const saved = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.saved.subscribe(saved);

    dialog.form.setValue({ correctedDemand: 13, justification: '  Needed  ' });
    dialog.onSubmit();

    expect(store.createOverride).toHaveBeenCalledWith('ward-1', '2026-09-16', {
      correctedDemand: 13,
      justification: 'Needed',
    });
    expect(saved).toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
  });

  it('keeps the dialog open when save fails', () => {
    store.createOverride.mockReturnValue(throwError(() => new Error('fail')));
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);

    dialog.form.setValue({ correctedDemand: 12.5, justification: '' });
    dialog.onSubmit();

    expect(store.createOverride).toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
    expect(dialog.form.disabled).toBe(false);
  });
});
