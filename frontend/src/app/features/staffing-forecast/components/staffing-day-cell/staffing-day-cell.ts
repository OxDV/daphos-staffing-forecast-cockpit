import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { StaffingDay } from '../../staffing.models';
import { confidenceBand, staffingStatus } from '../../staffing-status.utils';
import { formatConfidencePercent } from '../../week.utils';

@Component({
  selector: 'app-staffing-day-cell',
  standalone: true,
  imports: [MatButtonModule, MatChipsModule, MatIconModule],
  templateUrl: './staffing-day-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffingDayCell {
  readonly wardCode = input.required<string>();
  readonly day = input.required<StaffingDay>();
  readonly dayActivate = output<StaffingDay>();

  protected readonly formatConfidencePercent = formatConfidencePercent;

  protected readonly status = computed(() =>
    staffingStatus(this.day().effectiveDemand, this.day().plannedStaffing),
  );

  protected readonly band = computed(() => confidenceBand(this.day().confidence));

  protected readonly cellClass = computed(() => {
    const classes = [
      'staffing-day-cell',
      `staffing-day-cell--${this.status().kind}`,
      `staffing-day-cell--${this.band().kind}-confidence`,
    ];
    if (!this.day().canOverride) {
      classes.push('staffing-day-cell--locked');
    }
    if (this.day().isCorrected) {
      classes.push('staffing-day-cell--corrected');
    }
    return classes.join(' ');
  });

  protected cellId(): string {
    return `day-cell-${this.wardCode()}-${this.day().date}`;
  }

  protected onActivate(): void {
    this.dayActivate.emit(this.day());
  }
}
