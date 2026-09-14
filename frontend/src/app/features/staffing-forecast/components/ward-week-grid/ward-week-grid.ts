import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StaffingDayCell } from '../staffing-day-cell/staffing-day-cell';
import { WardWeek } from '../../staffing.models';
import { formatDayHeading } from '../../week.utils';

@Component({
  selector: 'app-ward-week-grid',
  standalone: true,
  imports: [StaffingDayCell],
  templateUrl: './ward-week-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardWeekGrid {
  readonly wards = input.required<WardWeek[]>();
  readonly dayHeaders = input.required<string[]>();

  protected readonly formatDayHeading = formatDayHeading;

  protected summaryId(wardCode: string): string {
    return `ward-week-summary-${wardCode}`;
  }

  protected formatAverageDeviation(value: number | null): string {
    return value === null ? '—' : String(value);
  }
}
