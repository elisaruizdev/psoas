import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonUI } from '../../../shared/ui/button/button';
import { AssistantService } from './services/assistant.service';
import { AssistantHealth, AssistantRoute, ChatMessage } from './models/assistant.model';

const ROUTE_LABELS: Record<AssistantRoute, string> = {
  clinico: 'Historia clínica',
  agenda: 'Agenda',
  fuera_de_ambito: 'Fuera de ámbito',
};

@Component({
  selector: 'app-assistant',
  imports: [ReactiveFormsModule, ButtonUI],
  templateUrl: './assistant.html',
  styleUrl: './assistant.scss',
})
export class Assistant {
  readonly suggestions = [
    '¿Cómo ha evolucionado el dolor lumbar de Ana López?',
    '¿Qué tratamiento sigue Carlos Fernández?',
    '¿Cuándo es la próxima cita de Lucía Navarro?',
    '¿Me recomiendas ibuprofeno para el dolor?',
  ];

  messages = signal<ChatMessage[]>([]);
  pending = signal(false);
  error = signal('');
  health = signal<AssistantHealth | null>(null);

  providerLabel = computed(() => {
    const h = this.health();
    if (!h) return '';
    return h.proveedor === 'fake' ? 'Modo demo, sin modelo de IA' : `Modelo: ${h.proveedor}`;
  });

  question = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(1000)],
  });

  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('questionInput');
  private nextId = 1;

  constructor(
    private assistant: AssistantService,
    private destroyRef: DestroyRef,
  ) {
    // Tras el primer pintado: la comprobación no retrasa que se vea la pantalla.
    afterNextRender(() => this.checkHealth());
  }

  checkHealth(): void {
    this.assistant
      .health()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => this.health.set(health),
        error: () => this.error.set('No se puede conectar con el asistente. ¿Está arrancado?'),
      });
  }

  routeLabel(route: AssistantRoute): string {
    return ROUTE_LABELS[route] ?? route;
  }

  useSuggestion(text: string): void {
    this.question.setValue(text);
    this.send();
  }

  /** Sin preventDefault el navegador haría un envío nativo y recargaría la página. */
  onSubmit(event: Event): void {
    event.preventDefault();
    this.send();
  }

  /** Enter envía; Mayús+Enter hace salto de línea, como en cualquier chat. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.question.value.trim();
    if (this.pending() || text.length < 3) {
      return;
    }
    this.error.set('');
    this.pending.set(true);
    this.messages.update((list) => [...list, { id: this.nextId++, author: 'user', text }]);
    this.question.reset();

    this.assistant
      .ask(text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reply) => {
          this.messages.update((list) => [
            ...list,
            { id: this.nextId++, author: 'assistant', text: reply.respuesta, reply },
          ]);
          this.pending.set(false);
          this.input()?.nativeElement.focus();
        },
        error: (error: HttpErrorResponse) => {
          this.pending.set(false);
          this.error.set(this.errorMessage(error));
          this.question.setValue(text); // no perder lo que escribió
        },
      });
  }

  private errorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'No se puede conectar con el asistente. ¿Está arrancado?';
      case 503:
        return 'El modelo de IA no está disponible ahora mismo. Prueba de nuevo en un minuto.';
      case 502:
        return 'El asistente no ha podido leer los datos de la clínica.';
      default:
        return 'No se ha podido obtener una respuesta. Inténtalo de nuevo.';
    }
  }
}
