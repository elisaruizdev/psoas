import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegisterForm } from '../../models/register.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
  
export class Register {
  registerForm!: FormGroup;

  constructor(private fb: FormBuilder, private register: AuthService) {
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
      const dataRegister : RegisterForm = {
        name: this.registerForm.get('name')?.value,
        surname: this.registerForm.get('surname')?.value,
        second_surname: this.registerForm.get('second_surname')?.value,   
        phone: this.registerForm.get('phone')?.value,
        email: this.registerForm.get('email')?.value,
        password: this.registerForm.get('password')?.value,
      }
      this.register.registerForm(dataRegister).subscribe(response => {
      }, error => {
        console.error('Error en el registro', error);
      });
    } else {
      console.error('Error al enviar el formulario');
    }
  }
}
