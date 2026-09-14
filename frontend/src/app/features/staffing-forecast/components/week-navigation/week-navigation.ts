import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-week-navigation',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatChip],
  templateUrl: './week-navigation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekNavigation {
  readonly weekRangeLabel = input.required<string>();
  readonly weekNumberLabel = input.required<string>();
  readonly todayLabel = input.required<string>();

  readonly previousWeek = output<void>();
  readonly nextWeek = output<void>();
}
