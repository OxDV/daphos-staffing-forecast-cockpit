import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { DemandOverride, SelectedStaffingDay } from '../../staffing.models';

@Component({
  selector: 'app-audit-sidebar',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './audit-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditSidebar {
  readonly selectedDay = input<SelectedStaffingDay | null>(null);
  readonly history = input.required<DemandOverride[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
}
