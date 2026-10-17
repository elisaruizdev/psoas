import { Component } from '@angular/core';
import { TabItem } from '../models/layout.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-tab-menu',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './tab-menu.html',
  styleUrl: './tab-menu.scss',
})
export class TabMenu {
  tabs: TabItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'home' },
    { label: 'Pacientes', route: '/patients', icon: 'user' },
    { label: 'Sesiones', route: '/sessions', icon: 'calendar' },
    { label: 'Fisios', route: '/physios', icon: 'hand' },
  ];
}
