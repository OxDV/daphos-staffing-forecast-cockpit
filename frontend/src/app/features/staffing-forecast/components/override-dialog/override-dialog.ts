import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { validateOverrideInput } from '../../staffing.validators';
import { StaffingWeekStore } from '../../data-access/staffing-week.store';
import { OverrideDialogData } from './override-dialog.model';

@Component({
  selector: 'app-override-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './override-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverrideDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(StaffingWeekStore);
  private readonly dialogRef = inject(MatDialogRef<OverrideDialog, boolean>);
  protected readonly data = inject<OverrideDialogData>(MAT_DIALOG_DATA);

  protected readonly clientErrors = signal<{ correctedDemand?: string; justification?: string }>(
    {},
  );
  protected readonly submitting = this.store.overrideSubmitting;
  protected readonly serverError = this.store.overrideError;

  protected readonly form = this.formBuilder.nonNullable.group({
    correctedDemand: this.formBuilder.control<number | null>(this.data.day.effectiveDemand, {
      validators: [Validators.required],
    }),
    justification: this.formBuilder.nonNullable.control(''),
  });

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onSubmit(): void {
    const day = this.data.day;
    const correctedDemand = this.form.controls.correctedDemand.value;
    const justification = this.form.controls.justification.value;
    const errors = validateOverrideInput(
      day.forecastDemand,
      correctedDemand,
      justification,
      this.data.policy,
    );
    this.clientErrors.set(errors);
    if (Object.keys(errors).length > 0 || correctedDemand === null) {
      return;
    }

    this.form.disable({ emitEvent: false });
    this.store
      .createOverride(this.data.wardId, day.date, {
        correctedDemand,
        justification: justification.trim(),
      })
      .subscribe({
        next: () => {
          this.form.enable({ emitEvent: false });
          this.dialogRef.close(true);
        },
        error: () => {
          this.form.enable({ emitEvent: false });
        },
      });
  }
}
