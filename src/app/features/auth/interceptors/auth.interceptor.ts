import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const token = session.token();
  const authCall = req.url.includes('/auth/');

  const outgoing =
    !token || authCall
      ? req
      : req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });

  return next(outgoing).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !authCall) {
        session.clear();
        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
