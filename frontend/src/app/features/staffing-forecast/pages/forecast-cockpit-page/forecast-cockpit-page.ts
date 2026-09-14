import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { StaffingWeekStore } from '../../data-access/staffing-week.store';
import { WeekNavigation } from '../../components/week-navigation/week-navigation';
import { WardDaySelection, WardWeekGrid } from '../../components/ward-week-grid/ward-week-grid';
import { OverrideDialog } from '../../components/override-dialog/override-dialog';
import { LegendDialog } from '../../components/legend-dialog/legend-dialog';
import { AuditSidebar } from '../../components/audit-sidebar/audit-sidebar';
import { isLegendAutoOpenDismissed } from '../../legend-preference';
import { addDays, formatWeekRange, isoWeekNumber, mondayOf } from '../../week.utils';
import { filterVisibleWards } from '../../ward-visibility.utils';

@Component({
  selector: 'app-forecast-cockpit-page',
  standalone: true,
  imports: [
    WeekNavigation,
    WardWeekGrid,
    AuditSidebar,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forecast-cockpit-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastCockpitPage {
  private readonly store = inject(StaffingWeekStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);

  private readonly weekQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('week'))),
    { initialValue: this.route.snapshot.queryParamMap.get('week') },
  );

  private readonly hiddenWardIds = signal<ReadonlySet<string>>(new Set());

  protected readonly status = this.store.status;
  protected readonly data = this.store.data;
  protected readonly dayHeaders = this.store.dayHeaders;
  protected readonly error = this.store.error;
  protected readonly selectedDay = this.store.selectedDay;
  protected readonly history = this.store.history;
  protected readonly historyLoading = this.store.historyLoading;
  protected readonly historyError = this.store.historyError;
  protected readonly deletingOverrideId = this.store.deletingOverrideId;

  protected readonly visibleWards = computed(() =>
    filterVisibleWards(this.data()?.wards ?? [], this.hiddenWardIds()),
  );

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

    afterNextRender(
      () => {
        if (!isLegendAutoOpenDismissed()) {
          this.openLegendDialog();
        }
      },
      { injector: this.injector },
    );
  }

  protected isWardVisible(wardId: string): boolean {
    return !this.hiddenWardIds().has(wardId);
  }

  protected onWardVisibilityChange(wardId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.hiddenWardIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.delete(wardId);
      } else {
        next.add(wardId);
      }
      return next;
    });

    const selected = this.selectedDay();
    if (!checked && selected?.wardId === wardId) {
      this.store.clearSelection();
    }
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

  protected onDaySelected(selection: WardDaySelection): void {
    this.store.selectDay({
      wardId: selection.ward.id,
      wardCode: selection.ward.code,
      wardName: selection.ward.name,
      day: selection.day,
    });
  }

  protected onCorrectDemand(): void {
    const selection = this.selectedDay();
    const week = this.data();
    if (!selection || !week || !selection.day.canOverride) {
      return;
    }

    this.dialog.open(OverrideDialog, {
      width: '440px',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
      panelClass: 'glass-dialog',
      backdropClass: 'glass-dialog-backdrop',
      data: {
        wardId: selection.wardId,
        wardName: selection.wardName,
        day: selection.day,
        policy: week.overridePolicy,
      },
    });
  }

  protected onOpenLegend(): void {
    this.openLegendDialog();
  }

  private openLegendDialog(): void {
    this.dialog.open(LegendDialog, {
      width: '640px',
      maxWidth: '94vw',
      autoFocus: 'first-tabbable',
      panelClass: 'glass-dialog',
      backdropClass: 'glass-dialog-backdrop',
    });
  }

  protected onDeleteOverride(overrideId: string): void {
    const selection = this.selectedDay();
    if (!selection || !selection.day.canOverride) {
      return;
    }
    this.store.deleteOverride(selection.wardId, selection.day.date, overrideId);
  }
}
