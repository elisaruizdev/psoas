import { Component, input, Input, output } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../auth/services/session.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ClinicNotification, MenuUser } from '../models/layout.model';


@Component({
  selector: 'app-header',
  imports: [Icon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() isMobile: boolean | null = false;
  @Input() currentPageTitle: string = '';
  notifications = input<ClinicNotification[]>([]);

  userInfo = input<MenuUser | null>(null);
  toggleSidenav = output<void>();

  userName!: string;
  userRole!: string;
  initials!: string;

  constructor(private routes: Router, private session: SessionService) {}

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  ngOnInit(): void {
    this.userName = this.session.name() || 'Usuario';
    // Figma (App Header): dos primeras letras del nombre en minúscula ("el", "ad")
    this.initials = this.userName.trim().slice(0, 2).toLowerCase();
    this.userRole = this.session.idPhysio() ? 'Fisioterapeuta' : 'Desconocido';
  }

  logout() {
    this.clearSessionStorage();
    this.goToLogin();
  }

  clearSessionStorage(): void {
    this.session.clear();
  }

  goToLogin(): void {
    this.routes.navigate(['/login']);
  }
}
