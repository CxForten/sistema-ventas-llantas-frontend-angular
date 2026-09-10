import { Router } from '@angular/router';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject (Router);
  const token = auth.token();

  const request = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
  :req.clone({setHeaders: {Accept: 'application/json'}});

  return next(request).pipe (
    catchError((err) => {
      if (err.status === 401) {
        auth.clear();
        router.navigate(['/login']);
      }

      return throwError(() => err);
    })
  )
};
