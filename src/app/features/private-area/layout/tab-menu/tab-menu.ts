import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabItem } from '../models/layout.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';
import { AssistantService } from '../../assistant/services/assistant.service';

@Component({
  selector: 'app-tab-menu',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './tab-menu.html',
  styleUrl: './tab-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabMenu {
  tabs: TabItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'home' },
    { label: 'Pacientes', route: '/patients', icon: 'user' },
    { label: 'Sesiones', route: '/sessions', icon: 'calendar' },
    { label: 'Fisios', route: '/physios', icon: 'hand' },
    // Solo si el entorno tiene asistente de IA (en Docker y en local sí; en Vercel no).
    ...(AssistantService.enabled ? [{ label: 'Asistente', route: '/assistant', icon: 'search' }] : []),
  ];
}
