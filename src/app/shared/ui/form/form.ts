import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormConfig } from '../../models/form.model';
import { ButtonUI } from '../button/button';


@Component({
  selector: 'f-form',
  imports: [CommonModule, ReactiveFormsModule, ButtonUI],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form {
  @Input() config!: FormConfig;
  @Input() submitButtonText: string = 'Enviar';
  @Input() cancelButtonText: string = 'Cancelar';
  @Input() showCancelButton: boolean = true;

  @Output() formSubmit = new EventEmitter<any>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    const formControls: any = {};

    this.config.sections.forEach((section: { fields: any[] }) => {
      section.fields.forEach((field) => {
        const validators = [];

        if (field.required && field.type !== 'checkbox') {
          validators.push(Validators.required);
        }

        if (field.validators) {
          validators.push(...field.validators);
        }

        const defaultValue = field.type === 'checkbox' ? field.value || false : field.value || '';

        formControls[field.name] = [defaultValue, validators];
      });
    });

    this.form = this.fb.group(formControls);
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.value);
    } else {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.controls[key].markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (control.errors['email']) {
        return 'Email no válido';
      }
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['maxlength']) {
        return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      }
      if (control.errors['pattern']) {
        return 'Formato no válido';
      }
      if (control.errors['min']) {
        return `Valor mínimo: ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `Valor máximo: ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  hasError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.touched && control.errors);
  }

  getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      user: 'icons/user.svg',
      email: 'icons/arroba.svg',
      phone: 'icons/phone.svg',
      lock: 'icons/lock.svg',
      calendar: 'icons/calendar.svg',
    };
    return icons[iconName] || '';
  }

  resetForm(): void {
    this.form.reset();
  }

  getFormValue(): any {
    return this.form.value;
  }

  setFormValue(values: any): void {
    this.form.patchValue(values);
  }

  markAllAsTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      this.form.controls[key].markAsTouched();
    });
  }

  isValid(): boolean {
    return this.form.valid;
  }

  getControl(fieldName: string) {
    return this.form.get(fieldName);
  }
}
