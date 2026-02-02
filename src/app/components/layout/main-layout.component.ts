import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent {
  isSidebarCollapsed = false;
  currentUser: any = { name: 'Admin', role: 'Administrator' }; // Default/Mock

  navItems: any[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    public languageService: LanguageService
  ) {
    // Optionally load user from auth service
    const user = this.authService.currentUserValue;
    if (user) {
        this.currentUser = user;
    }

    this.navItems = [
      { label: 'DASHBOARD', icon: 'bi-speedometer2', route: '/dashboard', roles: ['admin', 'teacher'] },
      { label: 'STUDENTS', icon: 'bi-people', route: '/students', roles: ['admin', 'teacher'] },
      { label: 'TEACHERS', icon: 'bi-person-video3', route: '/teachers', roles: ['admin'] },
      { label: 'ATTENDANCE', icon: 'bi-calendar-check', route: '/attendance', roles: ['admin', 'teacher'] },
      { label: 'CLASSES', icon: 'bi-journal-bookmark', route: '/classes', roles: ['admin', 'teacher'] },
      { label: 'SUBJECTS', icon: 'bi-book', route: '/subjects', roles: ['admin', 'teacher'] },
    ];

    if (this.currentUser.role === 'student' && this.currentUser.profile_id) {
       this.navItems.push({
          label: 'MY_PROFILE', 
          icon: 'bi-person-badge', 
          route: `/students/${this.currentUser.profile_id}`, 
          roles: ['student']
       });
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    this.authService.logout();
  }

  hasRole(allowedRoles: string[]): boolean {
    return this.authService.hasRole(allowedRoles);
  }
}
