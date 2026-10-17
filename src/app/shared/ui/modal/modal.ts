import { Component, inject, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Icon } from '../icon/icon';

@Component({
  selector: 'modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Input() title: string = '';
  @Input() subtitle: string = '';

  dialogRef = inject(MatDialogRef<Modal>);

  close(): void {
    this.dialogRef.close();
  }
}
