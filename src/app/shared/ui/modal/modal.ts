import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Icon } from '../icon/icon';

@Component({
  selector: 'modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');

  private readonly dialogRef = inject(MatDialogRef<Modal>);

  close(): void {
    this.dialogRef.close();
  }
}
