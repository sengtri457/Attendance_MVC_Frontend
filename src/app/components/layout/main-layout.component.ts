import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  isSidebarCollapsed = false;
  currentUser: any = { name: 'Admin', role: 'Administrator' }; // Default/Mock

  navItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/dashboard', roles: ['admin', 'teacher'] },
    { label: 'Students', icon: 'bi-people', route: '/students', roles: ['admin', 'teacher'] },
    { label: 'Teachers', icon: 'bi-person-video3', route: '/teachers', roles: ['admin'] },
    { label: 'Attendance', icon: 'bi-calendar-check', route: '/attendance', roles: ['admin', 'teacher'] },
    { label: 'Classes', icon: 'bi-journal-bookmark', route: '/classes', roles: ['admin', 'teacher'] },
    { label: 'Subjects', icon: 'bi-book', route: '/subjects', roles: ['admin', 'teacher'] },
  ];

  constructor(private authService: AuthService, private router: Router) {
    // Optionally load user from auth service
    const user = this.authService.currentUserValue;
    if (user) {
        this.currentUser = user;
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    this.authService.logout();
  }

  hasRole(allowedRoles: string[]): boolean {
    return this.authService.hasRole(allowedRoles) || allowedRoles.includes('admin'); // heuristic
  }
}
