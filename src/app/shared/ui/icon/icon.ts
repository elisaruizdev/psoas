import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Icono del set de Figma (public/icons/ui). Se pinta con `mask-image`,
 * así que hereda `currentColor` del contenedor: el color se controla con
 * tokens desde el CSS del padre, sin filtros ni SVG por color.
 */
@Component({
  selector: 'ui-icon',
  template: '',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.--ui-icon-src]': 'source()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class Icon {
  name = input.required<string>();
  size = input<number>(20);

  protected source = computed(() => `url(/icons/ui/${this.name()}.svg)`);
}
