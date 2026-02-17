import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

import { ThemeService } from '../../services/theme.service';

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

  showQuickAccess = false;
  
  quickAccessItems = [
    { 
      label: 'ADD_STUDENT', 
      icon: 'bi-person-plus', 
      route: '/students', 
      queryParams: { action: 'add' },
      roles: ['admin'] 
    },
    { 
      label: 'ADD_TEACHER', 
      icon: 'bi-person-video3', 
      route: '/teachers', 
      queryParams: { action: 'add' },
      roles: ['admin'] 
    },
    {
      label: 'ADD_CLASS',
      icon: 'bi-journal-plus',
      route: '/classes',
      queryParams: { action: 'add' },
      roles: ['admin', 'teacher']
    },
    { 
      label: 'MARK_ATTENDANCE', 
      icon: 'bi-calendar-check', 
      route: '/attendance', 
      roles: ['admin', 'teacher'] 
    }
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    public languageService: LanguageService,
    public themeService: ThemeService
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

  toggleQuickAccess() {
    this.showQuickAccess = !this.showQuickAccess;
  }

  closeQuickAccess() {
    this.showQuickAccess = false;
  }

  handleQuickAccess(item: any) {
    this.closeQuickAccess();
    this.router.navigate([item.route], { queryParams: item.queryParams || {} });
  }

  isThemeSwitching = false;
  isOverlayClosing = false;

  switchTheme() {
    this.isThemeSwitching = true;
    this.isOverlayClosing = false;
    
    // Delay the actual theme toggle to let the animation play
    setTimeout(() => {
      this.themeService.toggleTheme();
      
      // Start fade out animation
      this.isOverlayClosing = true;
      
      // Remove overlay after animation completes
      setTimeout(() => {
        this.isThemeSwitching = false;
        this.isOverlayClosing = false;
      }, 500); // 500ms for fade out
    }, 1200); // Keep overlay a bit longer to see the effect
  }

  logout() {
    this.authService.logout();
  }

  hasRole(allowedRoles: string[]): boolean {
    return this.authService.hasRole(allowedRoles);
  }
}
