import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
  imports: [StaffingDayCell],
  templateUrl: './ward-week-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardWeekGrid {
  readonly wards = input.required<WardWeek[]>();
  readonly dayHeaders = input.required<string[]>();
  readonly selectedWardCode = input<string | null>(null);
  readonly selectedDate = input<string | null>(null);
  readonly daySelected = output<WardDaySelection>();

  protected readonly formatDayHeading = formatDayHeading;

  protected summaryId(wardCode: string): string {
    return `ward-week-summary-${wardCode}`;
  }

  protected formatAverageDeviation(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  protected isSelected(wardCode: string, date: string): boolean {
    return this.selectedWardCode() === wardCode && this.selectedDate() === date;
  }

  protected onDayActivate(ward: WardWeek, day: StaffingDay): void {
    this.daySelected.emit({ ward, day });
  }
}
