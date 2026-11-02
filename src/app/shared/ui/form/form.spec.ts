import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { FormConfig } from '../../models/form.model';
import { dniNieValidator, spanishPhoneValidator } from '../../validators/spanish-id.validators';

import { Form } from './form';

describe('Form (formulario dinámico)', () => {
  let component: Form;
  let fixture: ComponentFixture<Form>;
  let element: HTMLElement;

  const config: FormConfig = {
    sections: [
      {
        title: 'Datos',
        subtitle: 'Obligatorios',
        fields: [
          { name: 'name', label: 'Nombre', type: 'text', required: true, validators: [Validators.minLength(2)] },
          { name: 'dni', label: 'DNI/NIE', type: 'text', required: true, validators: [dniNieValidator()] },
          { name: 'phone', label: 'Teléfono', type: 'tel', required: false, validators: [spanishPhoneValidator()] },
          { name: 'email', label: 'Correo', type: 'email', validators: [Validators.email] },
          { name: 'age', label: 'Edad', type: 'number', value: 30, validators: [Validators.min(18), Validators.max(99)] },
          { name: 'zip', label: 'CP', type: 'text', icon: 'home', validators: [Validators.pattern(/^\d{5}$/), Validators.maxLength(5)] },
          {
            name: 'gender',
            label: 'Género',
            type: 'select',
            options: [{ value: 'f', label: 'Femenino' }],
          },
          { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
          {
            name: 'terms',
            label: 'Acepto',
            type: 'checkbox',
            required: true,
            checkboxLink: { text: 'Acepto', linkText: 'términos', linkUrl: '/terminos' },
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Form] }).compileComponents();

    fixture = TestBed.createComponent(Form);
    component = fixture.componentInstance;
    component.config = config;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  function tocar(nombre: string, valor: unknown): void {
    const control = component.getControl(nombre)!;
    control.setValue(valor as never);
    control.markAsTouched();
  }

  it('crea un control por campo con su valor inicial', () => {
    expect(component.getFormValue()).toEqual({
      name: '',
      dni: '',
      phone: '',
      email: '',
      age: 30,
      zip: '',
      gender: '',
      notes: '',
      terms: false,
    });
    expect(element.querySelector('.f-form__section-subtitle')?.textContent).toContain('Obligatorios');
  });

  it('no enseña errores hasta que el usuario toca el campo', () => {
    expect(component.hasError('name')).toBeFalse();
    expect(component.getFieldError('name')).toBe('');
  });

  it('traduce cada error a un mensaje en español', () => {
    const casos: [string, unknown, string][] = [
      ['name', '', 'Este campo es obligatorio'],
      ['name', 'A', 'Mínimo 2 caracteres'],
      ['dni', '12345678A', 'La letra del DNI/NIE no corresponde al número'],
      ['dni', '123', 'DNI (8 cifras y letra) o NIE (X, Y o Z, 7 cifras y letra)'],
      ['phone', '123', 'Teléfono español de 9 cifras que empiece por 6, 7, 8 o 9'],
      ['email', 'no-es-correo', 'Correo no válido'],
      ['age', 10, 'Valor mínimo: 18'],
      ['age', 120, 'Valor máximo: 99'],
      ['zip', 'abc', 'Formato no válido'],
      ['zip', '123456', 'Máximo 5 caracteres'],
    ];
    for (const [campo, valor, mensaje] of casos) {
      tocar(campo, valor);
      expect(component.getFieldError(campo)).withContext(`${campo}=${valor}`).toBe(mensaje);
    }
  });

  it('pinta el mensaje de error en el DOM', async () => {
    tocar('dni', '12345678A');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('.f-form__error')?.textContent).toContain('La letra del DNI/NIE');
  });

  it('enviar con errores no emite y marca todo como tocado', () => {
    const emitido = spyOn(component.formSubmit, 'emit');
    component.onSubmit();
    expect(emitido).not.toHaveBeenCalled();
    expect(component.hasError('name')).toBeTrue();
  });

  it('enviar válido emite los valores', () => {
    const emitido = spyOn(component.formSubmit, 'emit');
    component.setFormValue({ name: 'Ana', dni: '12345678Z', terms: true });
    expect(component.isValid()).toBeTrue();

    component.onSubmit();
    expect(emitido).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Ana', dni: '12345678Z' }));
  });

  it('cancelar emite; reset y markAllAsTouched funcionan', () => {
    const cancelado = spyOn(component.formCancel, 'emit');
    component.onCancel();
    expect(cancelado).toHaveBeenCalled();

    component.markAllAsTouched();
    expect(component.hasError('dni')).toBeTrue();
    component.resetForm();
    expect(component.getControl('name')?.touched).toBeFalse();
  });

  it('elige el icono por tipo si el campo no trae uno', () => {
    const icono = (nombre: string) =>
      component.getFieldIcon(config.sections[0].fields.find((f) => f.name === nombre)!);
    expect(icono('phone')).toBe('phone');
    expect(icono('email')).toBe('mail');
    expect(icono('zip')).toBe('home');
    expect(icono('name')).toBeUndefined();
  });
});
