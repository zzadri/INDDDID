import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { UserPublic, AuthResponse } from '../../domain/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<UserPublic | null>(null);
  readonly user$ = this._user$.asObservable();

  constructor(private http: HttpClient) {}

  get user():      UserPublic | null { return this._user$.value; }
  get isLoggedIn(): boolean          { return !!this._user$.value; }

  /**
   * Called once at app init (APP_INITIALIZER).
   * Sends the HttpOnly cookie automatically — restores session after page refresh.
   */
  restoreSession(): Observable<UserPublic | null> {
    return this.http.get<UserPublic>('/api/auth/me').pipe(
      tap(u => this._user$.next(u)),
      catchError(() => { this._user$.next(null); return of(null); }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap(r => this._user$.next(r.user)));
  }

  register(email: string, password: string, display_name?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password, display_name })
      .pipe(tap(r => this._user$.next(r.user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      tap(() => this._user$.next(null)),
      catchError(() => { this._user$.next(null); return of(undefined); }),
    );
  }
}
