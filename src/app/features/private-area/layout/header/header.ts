import { CommonModule } from '@angular/common';
import { Component, input, Input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';


@Component({
  selector: 'app-header',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() isMobile: boolean | null = false;
  @Input() currentPageTitle: string = '';
  notifications = input<any[]>();

  userInfo = input<any>();
  toggleSidenav = output<void>();

  userName!: string;
  userRole!: string;
  initials!: string;

  constructor(private routes: Router) {}

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  ngOnInit(): void {
    this.userName = sessionStorage.getItem('name') || 'Usuario';
    this.initials = this.userName
      .split(' ')
      .map((n) => n.slice(0, 2))
      .join('')
      .toUpperCase();
    this.userRole = sessionStorage.getItem('id_physio') ? 'Fisioterapeuta' : 'Desconocido';
  }

  logout() {
    this.clearSessionStorage();
    this.goToLogin();
  }

  clearSessionStorage(): void {
    sessionStorage.clear();
  }

  goToLogin(): void {
    this.routes.navigate(['/login']);
  }
}
