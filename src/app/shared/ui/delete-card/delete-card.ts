import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-delete-card',
  imports: [CommonModule],
  templateUrl: './delete-card.html',
  styleUrl: './delete-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCard {
  readonly showDeleteModal = signal(false);

  openDeleteModal(): void {
    this.showDeleteModal.set(true);
  }

  readonly title = input<string>('¿Estás seguro?');
  readonly messagePrefix = input<string>('Esta acción eliminará');
  readonly highlightText = input<string>('permanentemente');
  readonly messageSuffix = input<string>('al paciente y toda su información:');
  readonly items = input<string[]>([
    'Todos los datos personales',
    'Historial clínico completo',
    'Todos los tratamientos',
    'Todas las sesiones registradas',
  ]);
  readonly warningMessage = input<string>('Esta acción NO se puede deshacer.');
  readonly cancelText = input<string>('Cancelar');
  readonly confirmText = input<string>('Sí, Eliminar Definitivamente');

  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  confirmDelete(): void {
    this.showDeleteModal.set(false);
  }
}
