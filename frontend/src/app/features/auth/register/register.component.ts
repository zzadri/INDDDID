import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../auth.scss'],
})
export class RegisterComponent {
  email       = '';
  password    = '';
  displayName = '';
  loading     = false;
  error       = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error = '';
    if (this.password.length < 8) {
      this.error = 'Mot de passe : 8 caractères minimum';
      return;
    }
    this.loading = true;
    this.auth.register(this.email, this.password, this.displayName || undefined).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error = e.error?.error ?? 'Erreur lors de la création du compte'; this.loading = false; },
    });
  }
}
