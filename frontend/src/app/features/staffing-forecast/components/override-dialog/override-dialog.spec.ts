import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  let dialogRef: { close: jest.Mock };

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
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [OverrideDialog],
      providers: [
        { provide: StaffingWeekStore, useValue: store },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            wardId: 'ward-1',
            wardName: 'Ward B3',
            day,
            policy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverrideDialog);
    dialog = fixture.componentInstance as OverrideDialogHarness;
    fixture.detectChanges();
  });

  it('closes without saving on cancel', () => {
    dialog.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
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

    dialog.form.setValue({ correctedDemand: 13, justification: '  Needed  ' });
    dialog.onSubmit();

    expect(store.createOverride).toHaveBeenCalledWith('ward-1', '2026-09-16', {
      correctedDemand: 13,
      justification: 'Needed',
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('keeps the dialog open when save fails', () => {
    store.createOverride.mockReturnValue(throwError(() => new Error('fail')));

    dialog.form.setValue({ correctedDemand: 12.5, justification: '' });
    dialog.onSubmit();

    expect(store.createOverride).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(dialog.form.disabled).toBe(false);
  });
});
