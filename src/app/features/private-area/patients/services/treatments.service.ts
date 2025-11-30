import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { CreateTreatment, Treatment, UpdateTreatment } from '../models/patients.model';

@Injectable({
  providedIn: 'root',
})
export class TreatmentsService {
  private apiUrl = `${environment.baseUrl}/treatments`;

  constructor(private http: HttpClient) {}

  create(treatment: CreateTreatment): Observable<Treatment> {
    return this.http.post<Treatment>(this.apiUrl, treatment);
  }

  getAllByPatient(patientId: string): Observable<Treatment[]> {
    return this.http.get<Treatment[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getOne(id: string): Observable<Treatment> {
    return this.http.get<Treatment>(`${this.apiUrl}/${id}`);
  }

  update(id: string, treatment: UpdateTreatment): Observable<Treatment> {
    return this.http.patch<Treatment>(`${this.apiUrl}/${id}`, treatment);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
