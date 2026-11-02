import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestHttp, provideTestRouter } from '../../../../../testing/providers';
import { environment } from '../../../../../environments/environment';

import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const validos = {
    name: 'Ana',
    surname: 'López',
    second_surname: '',
    phone: '612 34 56 78',
    email: 'Ana@Psoas.es',
    password: 'segura123',
    confirmPassword: 'segura123',
    acceptTerms: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [...provideTestHttp(), ...provideTestRouter()],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  /** Escribe en el input como un usuario: valor + evento input + blur (touched). */
  function escribir(id: string, valor: string): void {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  it('cada input de contraseña está enlazado a su propio control', () => {
    escribir('password', 'primera1');
    escribir('confirm-password', 'segunda2');

    expect(component.registerForm.get('password')?.value).toBe('primera1');
    expect(component.registerForm.get('confirmPassword')?.value).toBe('segunda2');
  });

  it('avisa si el teléfono no es español y lo acepta con espacios', async () => {
    escribir('phone', '12345');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('#phone-error')?.textContent).toContain('9 cifras');

    escribir('phone', '612 34 56 78');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('#phone-error')).toBeNull();
  });

  it('avisa si las contraseñas no coinciden', async () => {
    escribir('password', 'segura123');
    escribir('confirm-password', 'otra1234');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('#confirm-password-error')?.textContent).toContain('no coinciden');
    expect(component.registerForm.valid).toBeFalse();
  });

  it('si el formulario no es válido, no envía nada y marca los errores', () => {
    component.sendFormRegister();

    http.expectNone(`${environment.baseUrl}/auth/register`);
    expect(component.registerForm.get('name')?.touched).toBeTrue();
  });

  it('envía el teléfono y el correo normalizados', () => {
    component.registerForm.setValue(validos);
    component.sendFormRegister();

    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toEqual({
      name: 'Ana',
      surname: 'López',
      second_surname: '',
      phone: '612345678',
      email: 'ana@psoas.es',
      password: 'segura123',
    });
    req.flush({});
    expect(component.okMessage()).toContain('Registro exitoso');
  });

  it('sin aceptar los términos no deja registrarse y lo explica', async () => {
    component.registerForm.setValue({ ...validos, acceptTerms: false });
    component.sendFormRegister();
    fixture.detectChanges();
    await fixture.whenStable();

    http.expectNone((r) => r.method === 'POST');
    expect(element.querySelector('#terms-error')?.textContent).toContain('aceptar los términos');
  });

  it('marcar la casilla la enlaza con el formulario', () => {
    const casilla = element.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    casilla.click();
    expect(component.registerForm.get('acceptTerms')?.value).toBeTrue();
  });

  it('si la API falla, muestra el error', () => {
    component.registerForm.setValue(validos);
    component.sendFormRegister();

    http.expectOne((r) => r.method === 'POST').flush({}, { status: 500, statusText: 'Error' });
    expect(component.errorMessage()).toContain('Error al registrar');
  });
});
