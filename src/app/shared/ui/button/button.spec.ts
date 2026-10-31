import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonUI, ButtonVariant } from './button';

// Host de prueba: usa el botón igual que lo usan las pantallas de la app.
@Component({
  imports: [ButtonUI],
  template: `
    <button-ui
      [title]="title()"
      [variant]="variant()"
      [disabled]="disabled()"
      fullWidth
      (clicked)="clicks = clicks + 1"
    />
  `,
})
class HostComponent {
  title = signal('Guardar');
  variant = signal<ButtonVariant>('primary');
  disabled = signal(false);
  clicks = 0;
}

describe('ButtonUI', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  function nativeButton(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button')!;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra el título y la variante', () => {
    expect(nativeButton().textContent?.trim()).toBe('Guardar');
    expect(nativeButton().classList).toContain('btn--primary');
  });

  it('reacciona a cambios de los inputs (signals)', () => {
    host.title.set('Eliminar');
    host.variant.set('danger');
    fixture.detectChanges();

    expect(nativeButton().textContent?.trim()).toBe('Eliminar');
    expect(nativeButton().classList).toContain('btn--danger');
  });

  it('acepta fullWidth como atributo sin valor', () => {
    const element = (fixture.nativeElement as HTMLElement).querySelector('button-ui')!;
    expect(element.classList).toContain('btn-host--full');
  });

  it('emite clicked al pulsar', () => {
    nativeButton().click();
    expect(host.clicks).toBe(1);
  });

  it('deshabilitado no emite y el botón nativo queda disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();

    nativeButton().click();

    expect(nativeButton().disabled).toBeTrue();
    expect(host.clicks).toBe(0);
  });
});
