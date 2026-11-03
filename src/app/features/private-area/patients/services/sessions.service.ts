import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CreateSession, Session, UpdateSession } from '../models/patients.model';

@Injectable({
  providedIn: 'root',
})
export class SessionsService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.baseUrl}/sessions`;

  create(session: CreateSession): Observable<Session> {
    return this.http.post<Session>(this.apiUrl, session);
  }

  getAllByPatient(patientId: string): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getOne(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${id}`);
  }

  update(id: string, session: UpdateSession): Observable<Session> {
    return this.http.patch<Session>(`${this.apiUrl}/${id}`, session);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
