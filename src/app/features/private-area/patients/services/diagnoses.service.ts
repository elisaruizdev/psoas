import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { CreateDiagnosis, Diagnosis, UpdateDiagnosis } from '../models/patients.model';

@Injectable({
  providedIn: 'root',
})
export class DiagnosesService {
  private apiUrl = `${environment.baseUrl}/diagnoses`;

  constructor(private http: HttpClient) {}

  create(diagnosis: CreateDiagnosis): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(this.apiUrl, diagnosis);
  }

  getAllByPatient(patientId: string): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getOne(id: string): Observable<Diagnosis> {
    return this.http.get<Diagnosis>(`${this.apiUrl}/${id}`);
  }

  update(id: string, diagnosis: UpdateDiagnosis): Observable<Diagnosis> {
    return this.http.patch<Diagnosis>(`${this.apiUrl}/${id}`, diagnosis);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
