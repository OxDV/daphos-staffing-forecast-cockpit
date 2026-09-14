import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap, throwError } from 'rxjs';

import { StaffingApiService } from './staffing-api.service';
import {
  CreateDemandOverrideRequest,
  CreateDemandOverrideResponse,
  DeleteDemandOverrideResponse,
  DemandOverride,
  SelectedStaffingDay,
  StaffingWeek,
  WardWeek,
} from '../staffing.models';
import { addDays, mondayOf } from '../week.utils';

export type CockpitStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class StaffingWeekStore {
  private readonly api = inject(StaffingApiService);

  private readonly weekStartSignal = signal(mondayOf(new Date().toISOString().slice(0, 10)));
  private readonly dataSignal = signal<StaffingWeek | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly selectedDaySignal = signal<SelectedStaffingDay | null>(null);
  private readonly historySignal = signal<DemandOverride[]>([]);
  private readonly historyLoadingSignal = signal(false);
  private readonly historyErrorSignal = signal<string | null>(null);
  private readonly overrideSubmittingSignal = signal(false);
  private readonly overrideErrorSignal = signal<string | null>(null);
  private readonly deletingOverrideIdSignal = signal<string | null>(null);

  readonly weekStart = this.weekStartSignal.asReadonly();
  readonly data = this.dataSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly selectedDay = this.selectedDaySignal.asReadonly();
  readonly history = this.historySignal.asReadonly();
  readonly historyLoading = this.historyLoadingSignal.asReadonly();
  readonly historyError = this.historyErrorSignal.asReadonly();
  readonly overrideSubmitting = this.overrideSubmittingSignal.asReadonly();
  readonly overrideError = this.overrideErrorSignal.asReadonly();
  readonly deletingOverrideId = this.deletingOverrideIdSignal.asReadonly();

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
    this.clearSelection();

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

  selectDay(selection: SelectedStaffingDay): void {
    this.selectedDaySignal.set(selection);
    this.overrideErrorSignal.set(null);
    this.loadHistory(selection.wardId, selection.day.date);
  }

  clearSelection(): void {
    this.selectedDaySignal.set(null);
    this.historySignal.set([]);
    this.historyErrorSignal.set(null);
    this.overrideErrorSignal.set(null);
  }

  loadHistory(wardId: string, serviceDate: string): void {
    this.historyLoadingSignal.set(true);
    this.historyErrorSignal.set(null);

    this.api
      .getOverrideHistory(wardId, serviceDate)
      .pipe(
        tap((response) => this.historySignal.set(response.items)),
        catchError(() => {
          this.historySignal.set([]);
          this.historyErrorSignal.set('Unable to load audit history');
          return of(null);
        }),
        finalize(() => this.historyLoadingSignal.set(false)),
      )
      .subscribe();
  }

  createOverride(wardId: string, serviceDate: string, payload: CreateDemandOverrideRequest) {
    this.overrideSubmittingSignal.set(true);
    this.overrideErrorSignal.set(null);

    return this.api.createOverride(wardId, serviceDate, payload).pipe(
      tap((response) => {
        this.applyDayUpdate(wardId, response);
        this.historySignal.set([response.override, ...this.historySignal()]);
        this.syncSelectedDay(wardId, serviceDate, response.day);
      }),
      catchError((error: unknown) => {
        this.overrideErrorSignal.set(this.mapOverrideError(error));
        return throwError(() => error);
      }),
      finalize(() => this.overrideSubmittingSignal.set(false)),
    );
  }

  deleteOverride(wardId: string, serviceDate: string, overrideId: string): void {
    if (this.deletingOverrideIdSignal()) {
      return;
    }

    this.deletingOverrideIdSignal.set(overrideId);
    this.historyErrorSignal.set(null);

    this.api
      .deleteOverride(wardId, serviceDate, overrideId)
      .pipe(
        tap((response) => {
          this.applyDayUpdate(wardId, response);
          this.historySignal.set(this.historySignal().filter((item) => item.id !== overrideId));
          this.syncSelectedDay(wardId, serviceDate, response.day);
        }),
        catchError(() => {
          this.historyErrorSignal.set('Unable to delete audit record');
          return of(null);
        }),
        finalize(() => this.deletingOverrideIdSignal.set(null)),
      )
      .subscribe();
  }

  private syncSelectedDay(
    wardId: string,
    serviceDate: string,
    day: CreateDemandOverrideResponse['day'],
  ): void {
    const selected = this.selectedDaySignal();
    if (selected && selected.wardId === wardId && selected.day.date === serviceDate) {
      this.selectedDaySignal.set({
        ...selected,
        day,
      });
    }
  }

  private applyDayUpdate(
    wardId: string,
    response: Pick<CreateDemandOverrideResponse, 'day' | 'summary'> | DeleteDemandOverrideResponse,
  ): void {
    const current = this.dataSignal();
    if (!current) {
      return;
    }

    const wards: WardWeek[] = current.wards.map((ward) => {
      if (ward.id !== wardId) {
        return ward;
      }
      return {
        ...ward,
        days: ward.days.map((day) => (day.date === response.day.date ? response.day : day)),
        summary: response.summary,
      };
    });

    this.dataSignal.set({
      ...current,
      wards,
    });
  }

  private mapOverrideError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string' && detail.length > 0) {
        return detail;
      }
      const fieldErrors = error.error?.fieldErrors as Record<string, string[]> | undefined;
      if (fieldErrors) {
        const first = Object.values(fieldErrors)[0]?.[0];
        if (first) {
          return first;
        }
      }
    }
    return 'Unable to save correction';
  }
}
