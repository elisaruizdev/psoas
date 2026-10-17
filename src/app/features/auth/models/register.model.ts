export interface RegisterResponse {
  message?: string;
}

export interface EmailTokenResponse {
  message?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  surname: string;
  second_surname?: string;
  phone: string;
  email: string;
  password: string;
}
