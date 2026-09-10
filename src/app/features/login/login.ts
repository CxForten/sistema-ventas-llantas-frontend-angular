import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../core/auth/auth';
import { Router } from '@angular/router';

@Component({
  imports: [FormsModule],
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject (Auth);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  error = signal('');
  busy = signal(false);

  async submit(): Promise<void>{
    if (this.busy()) return;

    this.error.set('');
    this.busy.set(false);

    try {
      await this.auth.login(this.email(), this.password());
      this.router.navigate(['/pos']);
    } catch (err: any) {
      const body = err?.error;
      this.error.set(body?.errors?.email?.[0] ?? body?.message ?? 'No se pudo inicar sesión. '
      );
    } finally {
      this.busy.set(false);
    }
  }
}
