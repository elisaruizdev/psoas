import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegisterForm } from '../../models/register.model';
import { AuthService } from '../../services/auth.service';
import { Icon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './register.html',
})
export class Register {
  registerForm!: FormGroup;
  errorMessage = signal('');
  okMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private register: AuthService,
    private destroyRef: DestroyRef,
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      second_surname: [''],
      phone: ['', Validators.required],
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  sendFormRegister() {
    if (this.registerForm.valid) {
      const dataRegister: RegisterForm = {
        name: this.registerForm.get('name')?.value,
        surname: this.registerForm.get('surname')?.value,
        second_surname: this.registerForm.get('second_surname')?.value,
        phone: this.registerForm.get('phone')?.value,
        email: this.registerForm.get('email')?.value,
        password: this.registerForm.get('password')?.value,
      };
      this.errorMessage.set('');
      this.okMessage.set('');
      this.register.registerForm(dataRegister).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          console.log('Registro exitoso', res);
          this.okMessage.set('Registro exitoso. Espera a que un administrador valide tu cuenta.');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error en el registro', error);
          this.errorMessage.set('Error al registrar el usuario. Inténtalo de nuevo.');
        },
      });
    }
  }
}
