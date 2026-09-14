import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DemandOverride, SelectedStaffingDay } from '../../staffing.models';

@Component({
  selector: 'app-audit-sidebar',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatListModule, MatProgressSpinnerModule],
  templateUrl: './audit-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditSidebar {
  readonly selectedDay = input<SelectedStaffingDay | null>(null);
  readonly history = input.required<DemandOverride[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
}
