import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from '../services/session.service';
import { provideTestRouter } from '../../../../testing/providers';

describe('authInterceptor', () => {
  const api = 'http://localhost:3000';
  let http: HttpClient;
  let controller: HttpTestingController;
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // El orden importa: withInterceptors antes del backend de pruebas.
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        ...provideTestRouter(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    sessionStorage.clear();
  });

  afterEach(() => {
    controller.verify();
    sessionStorage.clear();
  });

  function login(): void {
    session.save({ token: 'token-de-prueba', idPhysio: '7', name: 'Ana Ruiz' });
  }

  it('añade Authorization: Bearer cuando hay sesión', () => {
    login();

    http.get(`${api}/patients`).subscribe();

    const req = controller.expectOne(`${api}/patients`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush([]);
  });

  it('no añade la cabecera si no hay sesión', () => {
    http.get(`${api}/patients`).subscribe();

    const req = controller.expectOne(`${api}/patients`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('no añade la cabecera en las rutas /auth/, aunque haya sesión', () => {
    login();

    http.post(`${api}/auth/login`, {}).subscribe();

    const req = controller.expectOne(`${api}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('con un 401 fuera de /auth/ borra la sesión y manda a /login', () => {
    login();
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    let status: number | undefined;

    http.get(`${api}/patients`).subscribe({ error: (error) => (status = error.status) });
    controller.expectOne(`${api}/patients`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.token()).toBeNull();
    expect(navigate).toHaveBeenCalledOnceWith(['/login']);
    expect(status).toBe(401); // el error sigue llegando al componente
  });

  it('un 401 del login no cierra la sesión ni redirige: es "contraseña incorrecta"', () => {
    login();
    const navigate = spyOn(router, 'navigate');

    http.post(`${api}/auth/login`, {}).subscribe({ error: () => undefined });
    controller.expectOne(`${api}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.token()).toBe('token-de-prueba');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('otros errores (500) no tocan la sesión', () => {
    login();

    http.get(`${api}/patients`).subscribe({ error: () => undefined });
    controller.expectOne(`${api}/patients`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(session.token()).toBe('token-de-prueba');
  });
});
