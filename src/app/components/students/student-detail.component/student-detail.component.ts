import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../../services/studentservice/student.service'
import { AttendanceService } from '../../../services/attendnaceservice/attendance.service';
import { AuthService } from '../../../services/auth.service';
import {StudentDetail } from '../../../models/Student.model';
@Component({
  selector: 'app-student-detail.component',
  imports: [CommonModule],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.css',
})
export class StudentDetailComponent implements OnInit{
studentId!: number;
  student: StudentDetail | null = null;
  loading = false;
  error: string | null = null;

  // Date range for attendance
  startDate: string = '';
  endDate: string = '';

// Tab state
  activeTab: 'profile' | 'attendance' | 'performance' = 'profile';

// ... class ...
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private authService: AuthService
  ) {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.endDate = today.toISOString().split('T')[0];
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  get isAdminOrTeacher(): boolean {
    return this.authService.hasRole(['admin', 'teacher']);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.studentId = +params['id'];
      
      const user = this.authService.currentUserValue;
      if (user && user.role === 'student' && user.profile_id !== this.studentId) {
           // Redirect student to their own detail page if trying to view others
           this.router.navigate(['/students', user.profile_id]);
           return;
      }
      
      this.loadStudentDetail();
    });
  }

  loadStudentDetail(): void {
    this.loading = true;
    this.error = null;

    this.studentService.getStudentDetail(
      this.studentId,
      this.startDate,
      this.endDate
    ).subscribe({
      next: (response:any) => {
        if (response.success) {
          this.student = response.data;
        }
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to load student details';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/students']);
  }

  setActiveTab(tab: 'profile' | 'attendance' | 'performance'): void {
    this.activeTab = tab;
  }

  getAge(): number | null {
    if (!this.student || !this.student.date_of_birth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.student.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getGenderDisplay(): string {
    return this.student?.gender === 'M' ? 'Male' : 'Female';
  }

  getGenderIcon(): string {
    return this.student?.gender === 'M' ? '♂' : '♀';
  }

  getAttendanceRateColor(): string {
    if (!this.student?.attendance_summary) return 'text-secondary';
    
    const rate = parseFloat(this.student.attendance_summary.attendance_rate);
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-warning';
    return 'text-danger';
  }

  getAttendanceRateClass(): string {
    if (!this.student?.attendance_summary) return 'bg-secondary';
    
    const rate = parseFloat(this.student.attendance_summary.attendance_rate);
    if (rate >= 90) return 'bg-success';
    if (rate >= 75) return 'bg-warning';
    return 'bg-danger';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'P': return 'badge bg-success';
      case 'A': return 'badge bg-danger';
      case 'L': return 'badge bg-warning';
      case 'E': return 'badge bg-info';
      default: return 'badge bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'P': return 'Present';
      case 'A': return 'Absent';
      case 'L': return 'Late';
      case 'E': return 'Excused';
      default: return 'Unknown';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  printProfile(): void {
    window.print();
  }

  editStudent(): void {
    // Navigate to edit page or open modal
    console.log('Edit student:', this.studentId);
  }

  logout(): void {
    this.authService.logout();
  }
}
