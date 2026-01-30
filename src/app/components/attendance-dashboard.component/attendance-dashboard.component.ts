// attendance-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceService } from '../../services/attendnaceservice/attendance.service';
import { AuthService } from '../../services/auth.service';
import { ClassService } from '../../services/class.service';
import { Class } from '../../models/Class.model';
import { DashboardData } from '../../models/Dashboard.model';
import { formatDateISO } from '../../utils/date.util';
import {
  getStatusColor,
  getRiskBadgeClass,
} from '../../utils/attendance-display.util';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-attendance-dashboard',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './attendance-dashboard.component.html',
  styleUrl: './attendance-dashboard.component.css',
})
export class AttendanceDashboardComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  error: string | null = null;
  selectedClassId: number = 0;
  selectedDate: string = '';
  classes: Class[] = [];
  statusDistribution: { name: string; value: number; color: string }[] = [];

  /** Expose utils to template (avoids duplicate logic). */
  getStatusColor = getStatusColor;
  getRiskBadgeClass = getRiskBadgeClass;

  constructor(
    private attendanceService: AttendanceService,
    private router: Router,
    private authService: AuthService,
    private classService: ClassService,
    public languageService: LanguageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.selectedDate = formatDateISO(new Date());
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user?.role === 'student' && user.profile_id) {
      this.router.navigate(['/students', user.profile_id]);
      return;
    }
    if (isPlatformBrowser(this.platformId)) {
      this.loadClasses();
    }
  }

  loadClasses(): void {
    this.classService.getAllClasses().subscribe({
      next: (res) => {
        this.classes = res.data;
        if (this.classes.length > 0) {
          if (!this.selectedClassId) {
            this.selectedClassId = this.classes[0].class_id;
          }
          this.loadDashboard();
        }
      },
      error: (err) => console.error('Failed to load classes', err),
    });
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = null;
    this.attendanceService
      .getDashboardSummary(this.selectedDate, this.selectedClassId)
      .subscribe({
        next: (response) => {
          this.dashboardData = response.data;
          this.prepareChartData();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load dashboard data';
          this.loading = false;
          console.error(err);
        },
      });
  }

  prepareChartData(): void {
    if (!this.dashboardData) return;
    const { today } = this.dashboardData;
    this.statusDistribution = [
      { name: 'Present', value: today.P, color: '#28a745' },
      { name: 'Absent', value: today.A, color: '#dc3545' },
      { name: 'Late', value: today.L, color: '#ffc107' },
      { name: 'Excused', value: today.E, color: '#17a2b8' },
    ];
  }

  onClassChange(): void {
    this.loadDashboard();
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  navigateToWeeklyGrid(): void {
    this.router.navigate(['/attendance'], {
      queryParams: { class_id: this.selectedClassId },
    });
  }

  navigateToTeachers(): void {
    this.router.navigate(['/teachers']);
  }

  navigateToStudents(): void {
    this.router.navigate(['/students']);
  }

  navigateToSubjects(): void {
    this.router.navigate(['/subjects']);
  }

  navigateToClasses(): void {
    this.router.navigate(['/classes']);
  }

  navigateToStudentDetail(studentId: number): void {
    this.router.navigate(['/students', studentId, 'attendance']);
  }

  logout(): void {
    this.authService.logout();
  }
}
