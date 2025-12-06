import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.baseUrl}/auth`;

  constructor(private http: HttpClient) {}

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify-email?token=${token}`);
  }

  registerForm(form: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, form);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, password });
  }
}
