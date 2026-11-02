import { ChangeDetectionStrategy, Component, DestroyRef, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SessionService } from '../../services/session.service';
import { LoginRequest } from '../../models/login.model';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, CommonModule, Icon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private session = inject(SessionService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  loginForm: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
  }>;
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    if (this.route.snapshot.queryParamMap.get('verified') === 'false') {
      this.errorMessage.set('No se ha podido verificar el email.');
    }

    this.loginForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  sendFormLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials: LoginRequest = this.loginForm.getRawValue();

    this.authService.login(credentials).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.session.save({
          token: res.access_token,
          idPhysio: res.user.id_physio.toString(),
          name: res.user.name,
        });

        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);

        if (error.status === 401) {
          this.errorMessage.set('Correo o contraseña incorrectos');
        } else {
          this.errorMessage.set('Error al iniciar sesión. Inténtalo de nuevo.');
        }
      },
    });
  }
}
