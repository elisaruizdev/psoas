import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Variantes del componente "Button" de Figma (+ outline/danger de los modales). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';

@Component({
  selector: 'button-ui',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    '[class.btn-host--full]': 'fullWidth()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonUI {
  /** Nombre de un icono de public/icons/ui (p. ej. 'add', 'check'). */
  readonly icon = input<string>();
  readonly title = input.required<string>();
  // booleanAttribute permite escribir <button-ui fullWidth> sin valor, como en HTML.
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');

  clicked = output<void>();

  handleClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
