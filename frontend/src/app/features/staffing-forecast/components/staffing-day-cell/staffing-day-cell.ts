import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StaffingDay } from '../../staffing.models';
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

  protected cellId(): string {
    return `day-cell-${this.wardCode()}-${this.day().date}`;
  }
}
