import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StaffingDay } from '../../staffing.models';
import { confidenceBand, staffingStatus } from '../../staffing-status.utils';
import { formatConfidencePercent } from '../../week.utils';

@Component({
  selector: 'app-staffing-day-cell',
  standalone: true,
  templateUrl: './staffing-day-cell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffingDayCell {
  readonly wardCode = input.required<string>();
  readonly day = input.required<StaffingDay>();

  protected readonly formatConfidencePercent = formatConfidencePercent;

  protected readonly status = computed(() =>
    staffingStatus(this.day().effectiveDemand, this.day().plannedStaffing),
  );

  protected readonly band = computed(() => confidenceBand(this.day().confidence));

  protected readonly cellClass = computed(() => {
    const classes = [
      'staffing-day-cell',
      'tile',
      'glass-soft',
      'min-h-[6.25rem]',
      'w-full',
      'rounded-2xl',
      'px-3',
      'py-3',
      'text-left',
      `staffing-day-cell--${this.status().kind}`,
      `staffing-day-cell--${this.band().kind}-confidence`,
    ];

    if (!this.day().canOverride) {
      classes.push('staffing-day-cell--locked', 'cursor-not-allowed', 'opacity-60');
    } else {
      classes.push('focus:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-accent/70');
    }

    if (this.day().isCorrected) {
      classes.push('staffing-day-cell--corrected');
    }

    return classes.join(' ');
  });

  protected cellId(): string {
    return `day-cell-${this.wardCode()}-${this.day().date}`;
  }
}
