import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Form } from '../../../../shared/ui/form/form';
import { FormConfig } from '../../../../shared/models/form.model';
import { AppointmentsService } from '../services/appointments.service';
import { PatientsService } from '../../patients/services/patients.service';
import { PhysiosService } from '../../physios/services/physios.service';
import { CreateAppointment } from '../models/appointment.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-new-session',
  standalone: true,
  imports: [CommonModule, Form, MatDialogModule, MatIconModule],
  templateUrl: './new-session.html',
  styleUrl: './new-session.scss',
})
export class NewSession implements OnInit {
  appointmentFormConfig = signal<FormConfig | null>(null);
  patients: any[] = [];
  physios: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<NewSession>,
    private appointmentsService: AppointmentsService,
    private patientsService: PatientsService,
    private physiosService: PhysiosService
  ) {}

  ngOnInit(): void {
    this.loadPatientsAndPhysios();
  }

  private loadPatientsAndPhysios(): void {
    this.patientsService.getAllPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.loadPhysios();
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        this.showErrorNotification('Error al cargar los pacientes');
      },
    });
  }

  private loadPhysios(): void {
    this.physiosService.getAllPhysios().subscribe({
      next: (physios) => {
        this.physios = physios.filter((p) => p.status === 'active');
        this.initializeFormConfig();
      },
      error: (error) => {
        console.error('Error al cargar fisioterapeutas:', error);
        this.showErrorNotification('Error al cargar los fisioterapeutas');
      },
    });
  }

  private initializeFormConfig(): void {
    this.appointmentFormConfig.set({
      sections: [
        {
          title: 'Información de la Cita',
          fields: [
            {
              name: 'patient_id',
              label: 'Paciente',
              type: 'select',
              placeholder: 'Seleccione un paciente',
              required: true,
              options: this.patients.map((patient) => ({
                value: patient.id,
                label: `${patient.name} ${patient.surname} ${patient.second_surname || ''}`.trim(),
              })),
            },
            {
              name: 'physio_id',
              label: 'Fisioterapeuta',
              type: 'select',
              placeholder: 'Seleccione un fisioterapeuta',
              required: true,
              options: this.physios.map((physio) => ({
                value: physio.id_physio,
                label: `${physio.name} ${physio.surname} ${physio.second_surname || ''}`.trim(),
              })),
            },
            {
              name: 'appointment_date',
              label: 'Fecha',
              type: 'date',
              placeholder: 'dd/mm/aaaa',
              required: true,
            },
            {
              name: 'appointment_time',
              label: 'Hora',
              type: 'select',
              placeholder: 'Seleccione una hora',
              required: true,
              options: [
                { value: '09:00', label: '09:00' },
                { value: '10:00', label: '10:00' },
                { value: '11:00', label: '11:00' },
                { value: '12:00', label: '12:00' },
                { value: '13:00', label: '13:00' },
                { value: '14:00', label: '14:00' },
                { value: '15:00', label: '15:00' },
                { value: '16:00', label: '16:00' },
                { value: '17:00', label: '17:00' },
                { value: '18:00', label: '18:00' },
                { value: '19:00', label: '19:00' },
                { value: '20:00', label: '20:00' },
                { value: '21:00', label: '21:00' },
              ],
            },
            {
              name: 'duration',
              label: 'Duración',
              type: 'select',
              placeholder: 'Seleccione duración',
              required: true,
              options: [
                { value: 30, label: '30 minutos' },
                { value: 45, label: '45 minutos' },
                { value: 60, label: '60 minutos' },
              ],
            },
          ],
        },
        {
          title: 'Observaciones',
          subtitle: '(Opcional)',
          fields: [
            {
              name: 'notes',
              label: 'Notas',
              type: 'textarea',
              placeholder: 'Observaciones sobre la cita...',
              rows: 4,
              required: false,
              cssClass: 'form-field--full',
            },
          ],
        },
      ],
    });
  }

  onSubmitAppointment(appointmentData: any): void {
    const dateTime = `${appointmentData.appointment_date}T${appointmentData.appointment_time}:00`;

    const formattedData: CreateAppointment = {
      patient_id: appointmentData.patient_id,
      physio_id: parseInt(appointmentData.physio_id),
      appointment_date: new Date(dateTime).toISOString(),
      duration: parseInt(appointmentData.duration),
      notes: appointmentData.notes?.trim() || undefined,
    };

    this.appointmentsService.createAppointment(formattedData).subscribe({
      next: () => {
        this.showSuccessNotification('Cita creada correctamente');
        this.dialogRef.close({ action: 'created' });
      },
      error: (error) => {
        console.error('Error al crear cita:', error);
        if (error.status === 409) {
          this.showErrorNotification('El fisioterapeuta ya tiene una cita en ese horario');
        } else {
          this.showErrorNotification('Error al crear la cita');
        }
      },
    });
  }

  onCancelForm(): void {
    this.dialogRef.close();
  }

  private showSuccessNotification(message: string): void {
    alert(message);
  }

  private showErrorNotification(message: string): void {
    console.error('ERROR:', message);
    alert(message);
  }
}
