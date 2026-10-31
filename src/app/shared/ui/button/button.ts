import { Component, booleanAttribute, input, output } from '@angular/core';
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
})
export class ButtonUI {
  /** Nombre de un icono de public/icons/ui (p. ej. 'add', 'check'). */
  icon = input<string>();
  title = input.required<string>();
  // booleanAttribute permite escribir <button-ui fullWidth> sin valor, como en HTML.
  disabled = input(false, { transform: booleanAttribute });
  fullWidth = input(false, { transform: booleanAttribute });
  variant = input<ButtonVariant>('primary');
  type = input<'button' | 'submit'>('button');

  clicked = output<void>();

  handleClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
