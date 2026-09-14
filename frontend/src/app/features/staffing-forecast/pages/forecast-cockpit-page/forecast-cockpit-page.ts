import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { StaffingWeekStore } from '../../data-access/staffing-week.store';
import { WeekNavigation } from '../../components/week-navigation/week-navigation';
import { WardWeekGrid } from '../../components/ward-week-grid/ward-week-grid';
import {
  addDays,
  formatWeekRange,
  isoWeekNumber,
  mondayOf,
} from '../../week.utils';

@Component({
  selector: 'app-forecast-cockpit-page',
  standalone: true,
  imports: [WeekNavigation, WardWeekGrid],
  templateUrl: './forecast-cockpit-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastCockpitPage {
  private readonly store = inject(StaffingWeekStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly weekQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('week'))),
    { initialValue: this.route.snapshot.queryParamMap.get('week') },
  );

  protected readonly status = this.store.status;
  protected readonly data = this.store.data;
  protected readonly dayHeaders = this.store.dayHeaders;
  protected readonly error = this.store.error;

  protected readonly weekRangeLabel = computed(() => {
    const week = this.data();
    if (!week) {
      return 'Loading week';
    }
    return formatWeekRange(week.weekStart, week.weekEnd);
  });

  protected readonly weekNumberLabel = computed(() => {
    const week = this.data();
    if (!week) {
      return 'Week';
    }
    return `Week ${isoWeekNumber(week.weekStart)}`;
  });

  protected readonly todayLabel = computed(() => {
    const week = this.data();
    if (!week) {
      return 'Today';
    }
    return `Today · ${week.today}`;
  });

  constructor() {
    effect(() => {
      const queryWeek = this.weekQuery();
      const target = mondayOf(queryWeek ?? new Date().toISOString().slice(0, 10));
      if (queryWeek !== target) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { week: target },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }
      if (this.store.weekStart() !== target || this.store.data()?.weekStart !== target) {
        this.store.loadWeek(target);
      }
    });
  }

  protected onPreviousWeek(): void {
    const next = addDays(this.store.weekStart(), -7);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { week: next },
      queryParamsHandling: 'merge',
    });
  }

  protected onNextWeek(): void {
    const next = addDays(this.store.weekStart(), 7);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { week: next },
      queryParamsHandling: 'merge',
    });
  }

  protected onRetry(): void {
    this.store.retry();
  }
}
