import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../../auth/services/session.service';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ClinicNotification, MenuUser } from '../models/layout.model';


@Component({
  selector: 'app-header',
  imports: [Icon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly routes = inject(Router);
  private readonly session = inject(SessionService);

  readonly isMobile = input<boolean | null>(false);
  readonly currentPageTitle = input<string>('');
  readonly notifications = input<ClinicNotification[]>([]);

  readonly userInfo = input<MenuUser | null>(null);
  toggleSidenav = output<void>();

  // La sesión no cambia mientras el área privada está abierta: se lee una vez al crear el header.
  readonly userName = this.session.name() || 'Usuario';
  // Figma (App Header): dos primeras letras del nombre en minúscula ("el", "ad")
  readonly initials = this.userName.trim().slice(0, 2).toLowerCase();
  readonly userRole = this.session.idPhysio() ? 'Fisioterapeuta' : 'Desconocido';

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
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
