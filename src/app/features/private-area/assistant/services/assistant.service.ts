import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AssistantHealth, AssistantReply } from '../models/assistant.model';

/**
 * Cliente del servicio de IA (Python, carpeta ai/). El interceptor de auth añade el JWT,
 * y el servicio lo usa para leer del backend solo lo que este usuario puede ver.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.aiUrl;

  /** ¿Hay asistente configurado en este entorno? (en Vercel, no). */
  static get enabled(): boolean {
    return !!environment.aiUrl;
  }

  health(): Observable<AssistantHealth> {
    return this.http.get<AssistantHealth>(`${this.apiUrl}/salud`);
  }

  ask(mensaje: string): Observable<AssistantReply> {
    return this.http.post<AssistantReply>(`${this.apiUrl}/asistente`, { mensaje });
  }
}
