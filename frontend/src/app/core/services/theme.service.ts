import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private dark$ = new BehaviorSubject<boolean>(
    localStorage.getItem('blueprint_theme') !== 'light',
  );

  readonly isDark$ = this.dark$.asObservable();
  get isDark(): boolean { return this.dark$.value; }

  constructor() { this.apply(this.dark$.value); }

  toggle(): void {
    const next = !this.dark$.value;
    this.dark$.next(next);
    localStorage.setItem('blueprint_theme', next ? 'dark' : 'light');
    this.apply(next);
  }

  private apply(dark: boolean): void {
    document.body.classList.toggle('light', !dark);
  }
}
