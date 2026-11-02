import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'card-info',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './card-info.html',
  styleUrls: ['./card-info.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardInfo {
  readonly label = input<string>('');
  /** Enlazable con [(value)]: al guardar, el nuevo valor sale por `valueChange`. */
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly editable = input<boolean>(false);

  readonly saved = output<string>();
  readonly cancelled = output<void>();

  readonly isEditing = signal(false);
  readonly editValue = signal('');

  startEdit(): void {
    if (!this.editable()) return;
    this.isEditing.set(true);
    this.editValue.set(this.value());
  }

  save(): void {
    this.value.set(this.editValue());
    this.saved.emit(this.editValue());
    this.isEditing.set(false);
  }

  cancel(): void {
    this.editValue.set(this.value());
    this.isEditing.set(false);
    this.cancelled.emit();
  }
}
