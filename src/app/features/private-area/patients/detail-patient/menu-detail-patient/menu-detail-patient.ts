import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientTab, TabId } from '../../models/patients.model';

@Component({
  selector: 'menu-detail-patient',
  imports: [CommonModule],
  templateUrl: './menu-detail-patient.html',
  styleUrls: ['./menu-detail-patient.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDetailPatientComponent {
  readonly tabChange = output<TabId>();

  readonly activeTab = signal<TabId>('clinical');

  readonly tabs: PatientTab[] = [
    {
      label: 'Historial Clínico',
      id: 'clinical',
    },
    {
      label: 'Tratamientos',
      id: 'treatments',
    },
    {
      label: 'Historial de Sesiones',
      id: 'sessions',
    },
  ];

  selectTab(tabId: TabId): void {
    this.activeTab.set(tabId);
    this.tabChange.emit(tabId);
  }
}
