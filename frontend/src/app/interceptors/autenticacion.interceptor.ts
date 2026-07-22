import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const autenticacionInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const reqConCredenciales = req.clone({
    withCredentials: true,
  });

  return next(reqConCredenciales).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && router.url.startsWith('/inicio')) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
