import { HttpInterceptorFn } from '@angular/common/http';

/** Attach credentials (HttpOnly cookie) to every API request. No token handling. */
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
