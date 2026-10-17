import { CommonModule } from '@angular/common';
import { Component, input, Input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SessionService } from '../../../auth/services/session.service';
import { ClinicNotification, MenuUser } from '../models/layout.model';


@Component({
  selector: 'app-header',
  imports: [CommonModule, MatButtonModule, MatIconModule],
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
    this.initials = this.userName
      .split(' ')
      .map((n) => n.slice(0, 2))
      .join('')
      .toUpperCase();
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
