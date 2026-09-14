import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import {
  isLegendAutoOpenDismissed,
  setLegendAutoOpenDismissed,
} from '../../legend-preference';

@Component({
  selector: 'app-legend-dialog',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './legend-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendDialog {
  private readonly dialogRef = inject(MatDialogRef<LegendDialog, void>);

  protected readonly dontShowAgain = signal(isLegendAutoOpenDismissed());

  constructor() {
    this.dialogRef
      .beforeClosed()
      .pipe(take(1))
      .subscribe(() => {
        setLegendAutoOpenDismissed(this.dontShowAgain());
      });
  }

  protected onDontShowAgainChange(event: Event): void {
    this.dontShowAgain.set((event.target as HTMLInputElement).checked);
  }

  protected onClose(): void {
    this.dialogRef.close();
  }
}
