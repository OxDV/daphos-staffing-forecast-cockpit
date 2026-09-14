import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { OverridePolicy, StaffingDay } from '../../staffing.models';
import { validateOverrideInput } from '../../staffing.validators';
import { StaffingWeekStore } from '../../data-access/staffing-week.store';

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

  readonly wardId = input.required<string>();
  readonly wardName = input.required<string>();
  readonly day = input.required<StaffingDay>();
  readonly policy = input.required<OverridePolicy>();

  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly clientErrors = signal<{ correctedDemand?: string; justification?: string }>(
    {},
  );
  protected readonly submitting = this.store.overrideSubmitting;
  protected readonly serverError = this.store.overrideError;

  protected readonly form = this.formBuilder.nonNullable.group({
    correctedDemand: this.formBuilder.control<number | null>(null, {
      validators: [Validators.required],
    }),
    justification: this.formBuilder.nonNullable.control(''),
  });

  constructor() {
    let seededDate: string | null = null;
    effect(() => {
      const day = this.day();
      if (seededDate === day.date) {
        return;
      }
      seededDate = day.date;
      this.form.reset({
        correctedDemand: day.effectiveDemand,
        justification: '',
      });
      this.clientErrors.set({});
    });
  }

  protected onCancel(): void {
    this.closed.emit();
  }

  protected onSubmit(): void {
    const day = this.day();
    const correctedDemand = this.form.controls.correctedDemand.value;
    const justification = this.form.controls.justification.value;
    const errors = validateOverrideInput(
      day.forecastDemand,
      correctedDemand,
      justification,
      this.policy(),
    );
    this.clientErrors.set(errors);
    if (Object.keys(errors).length > 0 || correctedDemand === null) {
      return;
    }

    this.form.disable({ emitEvent: false });
    this.store
      .createOverride(this.wardId(), day.date, {
        correctedDemand,
        justification: justification.trim(),
      })
      .subscribe({
        next: () => {
          this.form.enable({ emitEvent: false });
          this.saved.emit();
          this.closed.emit();
        },
        error: () => {
          this.form.enable({ emitEvent: false });
        },
      });
  }
}
