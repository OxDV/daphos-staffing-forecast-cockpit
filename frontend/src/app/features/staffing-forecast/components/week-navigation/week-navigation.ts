import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-week-navigation',
  standalone: true,
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
