import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { provideTestRouter } from '../../../../../testing/providers';

import { Login } from './login';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { LoginResponse } from '../../models/login.model';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  let auth: jasmine.SpyObj<AuthService>;
  let session: jasmine.SpyObj<SessionService>;
  let router: Router;
  // Subject: el test decide CUÁNDO responde el "servidor". Sirve para ver el estado intermedio.
  let respuesta$: Subject<LoginResponse>;

  const ok: LoginResponse = { access_token: 'jwt-123', user: { id_physio: 7, name: 'Ana Ruiz' } };

  async function crear(queryParams: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        ...provideTestRouter(),
        { provide: AuthService, useValue: auth },
        { provide: SessionService, useValue: session },
        // ActivatedRoute falso con los query params que interesen al test.
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(Login);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  /** Escribe en un input como lo haría un usuario: valor + evento input. */
  function escribir(selector: string, valor: string) {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const boton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const alerta = () => element.querySelector('[role="alert"]')?.textContent?.trim();
  const enviar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    respuesta$ = new Subject<LoginResponse>();
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    auth.login.and.returnValue(respuesta$);
    session = jasmine.createSpyObj<SessionService>('SessionService', ['save']);
  });

  describe('validación del formulario', () => {
    beforeEach(() => crear());

    it('empieza con el botón deshabilitado', () => {
      expect(boton().disabled).toBeTrue();
    });

    it('un email mal formado mantiene el botón deshabilitado', () => {
      escribir('#email', 'no-es-un-email');
      escribir('#password', '12345678');
      expect(boton().disabled).toBeTrue();
    });

    it('una contraseña de menos de 8 caracteres también', () => {
      escribir('#email', 'ana@psoas.es');
      escribir('#password', '1234567');
      expect(boton().disabled).toBeTrue();
    });

    it('con datos válidos se habilita', () => {
      escribir('#email', 'ana@psoas.es');
      escribir('#password', '12345678');
      expect(boton().disabled).toBeFalse();
    });
  });

  describe('envío', () => {
    beforeEach(async () => {
      await crear();
      escribir('#email', 'ana@psoas.es');
      escribir('#password', '12345678');
    });

    it('envía las credenciales al AuthService', () => {
      enviar();
      expect(auth.login).toHaveBeenCalledOnceWith({ email: 'ana@psoas.es', password: '12345678' });
    });

    it('mientras espera, el botón dice "Iniciando sesión..." y está deshabilitado', () => {
      enviar(); // respuesta$ aún no ha emitido: la petición sigue "en vuelo"

      expect(boton().textContent?.trim()).toBe('Iniciando sesión...');
      expect(boton().disabled).toBeTrue();
    });

    it('si va bien, guarda la sesión y navega al dashboard', () => {
      enviar();
      respuesta$.next(ok);
      fixture.detectChanges();

      expect(session.save).toHaveBeenCalledOnceWith({ token: 'jwt-123', idPhysio: '7', name: 'Ana Ruiz' });
      expect(router.navigate).toHaveBeenCalledOnceWith(['/dashboard']);
    });

    it('con un 401 avisa de credenciales incorrectas y no guarda nada', () => {
      spyOn(console, 'error'); // el componente registra el error; se silencia en el test
      auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

      enviar();

      expect(alerta()).toBe('Correo o contraseña incorrectos');
      expect(session.save).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(boton().textContent?.trim()).toBe('Iniciar sesión');
    });

    it('con otro error (500) muestra un mensaje genérico', () => {
      spyOn(console, 'error');
      auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      enviar();

      expect(alerta()).toBe('Error al iniciar sesión. Inténtalo de nuevo.');
    });
  });

  it('si llega de una verificación fallida (?verified=false) lo avisa', async () => {
    await crear({ verified: 'false' });
    expect(alerta()).toBe('No se ha podido verificar el email.');
  });
});
