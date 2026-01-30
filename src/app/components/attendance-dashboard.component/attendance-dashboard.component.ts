// attendance-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AttendanceService } from "../../services/attendnaceservice/attendance.service";
import { AuthService } from "../../services/auth.service";
import { ClassService } from "../../services/class.service";
import { Class } from "../../models/Class.model";
interface DashboardData {
  today: any;
  this_week: any;
  this_month: any;
  students_at_risk: any[];
  recent_absences: any[];
  generated_at: string;
}
@Component({
  selector: "app-attendance-dashboard.component",
  imports: [CommonModule, FormsModule],
  templateUrl: "./attendance-dashboard.component.html",
  styleUrl: "./attendance-dashboard.component.css",
})
export class AttendanceDashboardComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  error: string | null = null;
  selectedClassId: number = 0;
  selectedDate: string = "";
  classes: Class[] = [];
  // Chart data
  weeklyChartData: any[] = [];
  statusDistribution: any[] = [];
  constructor(
    private attendanceService: AttendanceService,
    private router: Router,
    private authService: AuthService,
    private classService: ClassService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.selectedDate = this.formatDate(new Date());
  }
  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user && user.role === 'student' && user.profile_id) {
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
          if (!this.selectedClassId || this.selectedClassId === 1) {
             this.selectedClassId = this.classes[0].class_id;
          }
          this.loadDashboard();
        }
      },
      error: (err) => {
        console.error("Failed to load classes", err);
      }
    });
  }
  formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
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
          this.error = "Failed to load dashboard data";
          this.loading = false;
          console.error(err);
        },
      });
  }
  prepareChartData(): void {
    if (!this.dashboardData) return;
    // Prepare weekly trend data for charts
    this.weeklyChartData = [
      {
        name: "Today",
        present: this.dashboardData.today.P,
        absent: this.dashboardData.today.A,
      },
      {
        name: "This Week",
        present: this.dashboardData.this_week.P,
        absent: this.dashboardData.this_week.A,
      },
      {
        name: "This Month",
        present: this.dashboardData.this_month.P,
        absent: this.dashboardData.this_month.A,
      },
    ];
    // Status distribution for pie chart
    this.statusDistribution = [
      { name: "Present", value: this.dashboardData.today.P, color: "#28a745" },
      { name: "Absent", value: this.dashboardData.today.A, color: "#dc3545" },
      { name: "Late", value: this.dashboardData.today.L, color: "#ffc107" },
      { name: "Excused", value: this.dashboardData.today.E, color: "#17a2b8" },
    ];
  }
  navigateToWeeklyGrid(): void {
    this.router.navigate(["/attendance"], {
      queryParams: { class_id: this.selectedClassId }
    });
  }
  navigateToTeachers(): void {
    this.router.navigate(["/teachers"]);
  }
  navigateToStudents(): void {
    this.router.navigate(["/students"]);
  }
  navigateToSubjects(): void {
    this.router.navigate(["/subjects"]);
  }
  navigateToClasses(): void {
    this.router.navigate(["/classes"]);
  }
  navigateToStudentDetail(studentId: number): void {
    this.router.navigate(["/students", studentId, "attendance"]);
  }
  getStatusColor(rate: string): string {
    const rateNum = parseFloat(rate);
    if (rateNum >= 90) return "success";
    if (rateNum >= 75) return "warning";
    return "danger";
  }
  getRiskLevel(rate: string): string {
    const rateNum = parseFloat(rate);
    if (rateNum < 50) return "Critical";
    if (rateNum < 75) return "At Risk";
    return "Monitor";
  }
  getRiskBadgeClass(rate: string): string {
    const rateNum = parseFloat(rate);
    if (rateNum < 50) return "badge-danger";
    if (rateNum < 75) return "badge-warning";
    return "badge-info";
  }
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  logout(): void {
    this.authService.logout();
  }

  onClassChange(): void {
    this.loadDashboard();
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }
}