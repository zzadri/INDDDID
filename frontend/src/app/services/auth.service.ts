import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { UserPublic, AuthResponse } from '../models/topology.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'inddid_token';
  private readonly USER_KEY  = 'inddid_user';

  private _user$ = new BehaviorSubject<UserPublic | null>(this.savedUser());
  readonly user$ = this._user$.asObservable();

  constructor(private http: HttpClient) {}

  get token(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
  get user(): UserPublic | null { return this._user$.value; }
  get isLoggedIn(): boolean { return !!this.token; }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(r => this.persist(r))
    );
  }

  register(email: string, password: string, display_name?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password, display_name }).pipe(
      tap(r => this.persist(r))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user$.next(null);
  }

  private persist(r: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, r.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(r.user));
    this._user$.next(r.user);
  }

  private savedUser(): UserPublic | null {
    const s = localStorage.getItem(this.USER_KEY);
    return s ? JSON.parse(s) : null;
  }
}
