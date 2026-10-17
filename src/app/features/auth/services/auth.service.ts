import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/login.model';
import {
  EmailTokenResponse,
  ForgotPasswordRequest,
  RegisterForm,
  RegisterResponse,
  ResetPasswordRequest,
} from '../models/register.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.baseUrl}/auth`;

  constructor(private http: HttpClient) {}

  verifyEmail(token: string): Observable<EmailTokenResponse> {
    return this.http.get<EmailTokenResponse>(`${this.apiUrl}/verify-email?token=${token}`);
  }

  registerForm(form: RegisterForm): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, form);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<EmailTokenResponse> {
    return this.http.post<EmailTokenResponse>(`${this.apiUrl}/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<EmailTokenResponse> {
    return this.http.post<EmailTokenResponse>(`${this.apiUrl}/reset-password`, request);
  }
}
