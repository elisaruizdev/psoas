import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientTab, TabId } from '../../models/patients.model';

@Component({
  selector: 'menu-detail-patient',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-detail-patient.html',
  styleUrls: ['./menu-detail-patient.scss'],
})
export class MenuDetailPatientComponent {
  @Output() tabChange = new EventEmitter<TabId>();

  activeTab: TabId = 'clinical';

  tabs: PatientTab[] = [
    {
      label: 'Historial Clínico',
      id: 'clinical',
      icon: 'icons/stethoscope.svg',
    },
    {
      label: 'Tratamientos',
      id: 'treatments',
      icon: 'icons/medication.svg',
    },
    {
      label: 'Historial de Sesiones',
      id: 'sessions',
      icon: 'icons/calendar_purple.svg',
    },
  ];

  selectTab(tabId: TabId): void {
    this.activeTab = tabId;
    this.tabChange.emit(tabId);
  }
}
