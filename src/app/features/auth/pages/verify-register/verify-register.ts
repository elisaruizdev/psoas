import { Component, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-register',
  imports: [],
  templateUrl: './verify-register.html',
  styleUrl: './verify-register.scss',
})
export class VerifyRegister {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const token = params['token'];
      if (!token) {
        this.goToLogin();
        return;
      }

      this.authService
        .verifyEmail(token)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
          },
          error: (err) => {
            console.error('Verification failed', err);
            this.router.navigate(['/login'], { queryParams: { verified: 'false' } });
          },
        });
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
