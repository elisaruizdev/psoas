import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { publicGuard } from './public.guard';
import { SessionService } from '../services/session.service';
import { provideTestRouter } from '../../../../testing/providers';

// Los guards funcionales usan inject(), así que se ejecutan dentro del contexto de inyección.
function run(guard: typeof authGuard): MaybeAsync<GuardResult> {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

function urlOf(result: MaybeAsync<GuardResult>): string {
  expect(result).toBeInstanceOf(UrlTree);
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('guards de sesión', () => {
  let session: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestRouter()] });
    session = TestBed.inject(SessionService);
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  describe('authGuard (área privada)', () => {
    it('sin token redirige a /login', () => {
      expect(urlOf(run(authGuard))).toBe('/login');
    });

    it('con token deja pasar', () => {
      session.save({ token: 't', idPhysio: '7', name: 'Ana' });
      expect(run(authGuard)).toBeTrue();
    });
  });

  describe('publicGuard (login, registro, contraseña)', () => {
    it('sin token deja pasar', () => {
      expect(run(publicGuard)).toBeTrue();
    });

    it('con token manda a /dashboard', () => {
      session.save({ token: 't', idPhysio: '7', name: 'Ana' });
      expect(urlOf(run(publicGuard))).toBe('/dashboard');
    });
  });
});
