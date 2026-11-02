import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RegisterForm } from '../../models/register.model';
import { AuthService } from '../../services/auth.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import {
  normalizePhone,
  spanishPhoneValidator,
} from '../../../../shared/validators/spanish-id.validators';

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
    this.registerForm = this.fb.group(
      {
        name: ['', Validators.required],
        surname: ['', Validators.required],
        second_surname: [''],
        phone: ['', [Validators.required, spanishPhoneValidator()]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        // requiredTrue: una casilla sin marcar vale false, y `required` lo daría por válido.
        acceptTerms: [false, Validators.requiredTrue],
      },
      { validators: Register.passwordMatchValidator },
    );
  }

  /** Validador de grupo: compara dos controles hermanos. */
  static passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /** Muestra el error de un campo solo cuando el usuario ya ha pasado por él. */
  showError(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!control && control.invalid && control.touched;
  }

  sendFormRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const value = this.registerForm.getRawValue();
    const dataRegister: RegisterForm = {
      name: value.name,
      surname: value.surname,
      second_surname: value.second_surname,
      phone: normalizePhone(value.phone),
      email: value.email.trim().toLowerCase(),
      password: value.password,
    };
    this.errorMessage.set('');
    this.okMessage.set('');
    this.register.registerForm(dataRegister).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.okMessage.set('Registro exitoso. Espera a que un administrador valide tu cuenta.');
      },
      error: () => {
        this.errorMessage.set('Error al registrar el usuario. Inténtalo de nuevo.');
      },
    });
  }
}
