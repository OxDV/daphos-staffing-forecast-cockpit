import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { StaffingDayCell } from '../staffing-day-cell/staffing-day-cell';
import { StaffingDay, WardWeek } from '../../staffing.models';
import { formatDayHeading } from '../../week.utils';

export interface WardDaySelection {
  ward: WardWeek;
  day: StaffingDay;
}

@Component({
  selector: 'app-ward-week-grid',
  standalone: true,
  imports: [StaffingDayCell, MatCardModule],
  templateUrl: './ward-week-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardWeekGrid {
  readonly wards = input.required<WardWeek[]>();
  readonly dayHeaders = input.required<string[]>();
  readonly daySelected = output<WardDaySelection>();

  protected readonly formatDayHeading = formatDayHeading;

  protected summaryId(wardCode: string): string {
    return `ward-week-summary-${wardCode}`;
  }

  protected formatAverageDeviation(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  protected onDayActivate(ward: WardWeek, day: StaffingDay): void {
    this.daySelected.emit({ ward, day });
  }
}
