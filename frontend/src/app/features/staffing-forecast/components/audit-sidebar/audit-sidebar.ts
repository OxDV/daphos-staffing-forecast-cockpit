import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DemandOverride, SelectedStaffingDay } from '../../staffing.models';

@Component({
  selector: 'app-audit-sidebar',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './audit-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditSidebar {
  readonly selectedDay = input<SelectedStaffingDay | null>(null);
  readonly history = input.required<DemandOverride[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly deletingOverrideId = input<string | null>(null);
  readonly closable = input(false);

  readonly correctDemand = output<void>();
  readonly deleteOverride = output<string>();
  readonly closed = output<void>();

  protected readonly canCorrect = computed(() => this.selectedDay()?.day.canOverride === true);

  protected onDelete(overrideId: string): void {
    if (this.deletingOverrideId()) {
      return;
    }
    this.deleteOverride.emit(overrideId);
  }
}
