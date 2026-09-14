import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { StaffingApiService } from './staffing-api.service';
import { StaffingWeek } from '../staffing.models';
import { addDays, mondayOf } from '../week.utils';

export type CockpitStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class StaffingWeekStore {
  private readonly api = inject(StaffingApiService);

  private readonly weekStartSignal = signal(mondayOf(new Date().toISOString().slice(0, 10)));
  private readonly dataSignal = signal<StaffingWeek | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly weekStart = this.weekStartSignal.asReadonly();
  readonly data = this.dataSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly status = computed<CockpitStatus>(() => {
    if (this.loadingSignal()) {
      return 'loading';
    }
    if (this.errorSignal()) {
      return 'error';
    }
    const data = this.dataSignal();
    if (!data) {
      return 'idle';
    }
    return data.wards.length === 0 ? 'empty' : 'ready';
  });

  readonly dayHeaders = computed(() => {
    const wards = this.dataSignal()?.wards;
    if (!wards || wards.length === 0) {
      return [];
    }
    return wards[0].days.map((day) => day.date);
  });

  loadWeek(weekStart: string): void {
    const normalized = mondayOf(weekStart);
    this.weekStartSignal.set(normalized);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api
      .getStaffingWeek(normalized)
      .pipe(
        tap((week) => this.dataSignal.set(week)),
        catchError(() => {
          this.dataSignal.set(null);
          this.errorSignal.set('Unable to load staffing week');
          return of(null);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe();
  }

  goToPreviousWeek(): void {
    this.loadWeek(addDays(this.weekStartSignal(), -7));
  }

  goToNextWeek(): void {
    this.loadWeek(addDays(this.weekStartSignal(), 7));
  }

  retry(): void {
    this.loadWeek(this.weekStartSignal());
  }
}
