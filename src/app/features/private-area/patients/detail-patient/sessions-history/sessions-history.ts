import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { SessionsService } from '../../services/sessions.service';
import { TreatmentsService } from '../../services/treatments.service';
import { Form } from '../../../../../shared/ui/form/form';
import { FormConfig, FormValue } from '../../../../../shared/models/form.model';
import { ButtonUI } from '../../../../../shared/ui/button/button';
import { forkJoin, finalize } from 'rxjs';
import { Session, Treatment, TreatmentWithSessions } from '../../models/patients.model';

/** Los campos de una sesión que se editan en la propia tarjeta. */
type SessionDraft = Pick<Session, 'techniques_applied' | 'patient_evolution' | 'observations'>;
import { PhysiosService } from '../../../physios/services/physios.service';
import { Physio } from '../../../physios/models/physios.model';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { DisplayDatePipe } from '../../../../../shared/pipes/display-date.pipe';
import { FullNamePipe } from '../../../../../shared/pipes/full-name.pipe';
import { groupSessionsByTreatment, sessionsCountLabel } from './group-sessions';
import { sessionFormConfig, toCreateSession, toUpdateSession } from './session-form';

@Component({
  selector: 'app-sessions-history',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    Form,
    ButtonUI,
    DisplayDatePipe,
    FullNamePipe,
  ],
  templateUrl: './sessions-history.html',
  styleUrl: './sessions-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsHistory implements OnInit {
  private sessionsService = inject(SessionsService);
  private treatmentsService = inject(TreatmentsService);
  private physiosService = inject(PhysiosService);
  private notifications = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  readonly patientId = input.required<string>();

  readonly treatmentsWithSessions = signal<TreatmentWithSessions[]>([]);
  readonly allTreatments = signal<Treatment[]>([]);
  readonly allPhysios = signal<Physio[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showForm = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);
  /** Copia de lo que se edita: cancelar la descarta y la sesión mostrada no cambia hasta guardar. */
  readonly draft = signal<SessionDraft>({ techniques_applied: '', patient_evolution: '' });
  /** true mientras se guarda: el formulario desactiva el botón de enviar. */
  readonly saving = signal(false);

  /** Sin fisios no hay a quién asignar la sesión, así que no se monta el formulario. */
  readonly sessionFormConfig = computed<FormConfig | null>(() => {
    if (!this.showForm() || this.allPhysios().length === 0) return null;
    return sessionFormConfig(this.allTreatments(), this.allPhysios());
  });

  readonly sessionsCountLabel = sessionsCountLabel;

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);

    forkJoin({
      treatments: this.treatmentsService.getAllByPatient(this.patientId()),
      sessions: this.sessionsService.getAllByPatient(this.patientId()),
      physios: this.physiosService.getAllPhysios(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ treatments, sessions, physios }) => {
        this.allTreatments.set(treatments);
        this.allPhysios.set(physios);
        this.treatmentsWithSessions.set(groupSessionsByTreatment(treatments, sessions));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifications.error('No se han podido cargar las sesiones');
      },
    });
  }

  onNewSession(): void {
    this.editingId.set(null);
    this.showForm.set(true);
  }

  onEdit(session: Session): void {
    this.draft.set({
      techniques_applied: session.techniques_applied,
      patient_evolution: session.patient_evolution,
      observations: session.observations,
    });
    this.editingId.set(session.id);
  }

  editDraft(field: keyof SessionDraft, value: string): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  onCancelEdit(): void {
    this.editingId.set(null);
  }

  onSaveEdit(session: Session): void {
    this.sessionsService
      .update(session.id, toUpdateSession({ ...session, ...this.draft() }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.loadAllData();
          this.notifications.success('Sesión actualizada correctamente');
        },
        error: () => {
          this.notifications.error('Error al actualizar la sesión');
        },
      });
  }

  onDelete(session: Session): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      this.sessionsService.delete(session.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadAllData();
          this.notifications.success('Sesión eliminada correctamente');
        },
        error: () => {
          this.notifications.error('Error al eliminar la sesión');
        },
      });
    }
  }

  onSubmitSession(value: FormValue): void {
    this.saving.set(true);
    this.sessionsService.create(toCreateSession(this.patientId(), value)).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.notifications.success('Sesión creada correctamente');
        this.showForm.set(false);
        this.loadAllData();
      },
      error: () => {
        this.notifications.error('Error al crear la sesión');
      },
    });
  }

  onCancelForm(): void {
    this.showForm.set(false);
  }

  isEditing(sessionId: string): boolean {
    return this.editingId() === sessionId;
  }
}
