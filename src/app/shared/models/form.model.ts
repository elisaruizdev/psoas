import { ValidatorFn } from '@angular/forms';

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'textarea'
  | 'number'
  | 'password'
  | 'checkbox';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface CheckboxLink {
  text: string;
  linkText: string;
  linkUrl: string;
}

export type FormFieldValue = string | number | boolean | null;

export type FormValue = Record<string, FormFieldValue>;

export function formText(data: FormValue, key: string): string | undefined {
  const raw = data[key];
  if (raw === null || raw === undefined) {
    return undefined;
  }
  return String(raw);
}

export function formChoice<T extends string>(
  data: FormValue,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const text = formText(data, key);
  if (text === undefined) {
    return undefined;
  }
  return allowed.find((item) => item === text);
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  value?: FormFieldValue;
  required?: boolean;
  validators?: ValidatorFn[];
  options?: SelectOption[]; 
  rows?: number; 
  cssClass?: string; 
  gridColumn?: string; 
  icon?: string; 
  checkboxLink?: CheckboxLink;
}

export interface FormSectionConfig {
  title?: string;
  subtitle?: string;
  fields: FormFieldConfig[];
  cssClass?: string;
}

export interface FormConfig {
  sections: FormSectionConfig[];
}
