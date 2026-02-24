// attendance-dashboard.component.ts
import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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

interface ChartDataPoint {
  date: string;
  day: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

interface WeeklyChartData {
  period: { start_date: string; end_date: string; week_offset: number };
  chart_data: ChartDataPoint[];
  week_totals: { present: number; absent: number; late: number; excused: number; total: number; attendance_rate: string };
}

@Component({
  selector: 'app-attendance-dashboard',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './attendance-dashboard.component.html',
  styleUrl: './attendance-dashboard.component.css',
})
export class AttendanceDashboardComponent implements OnInit, AfterViewInit {
  dashboardData: DashboardData | null = null;
  loading = false;
  error: string | null = null;
  selectedClassId: number = 0;
  selectedDate: string = '';
  classes: Class[] = [];
  statusDistribution: { name: string; value: number; color: string }[] = [];

  // Weekly chart properties
  @ViewChild('weeklyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  weeklyChartData: WeeklyChartData | null = null;
  chartLoading = false;
  weekOffset = 0;
  chartTooltip = { visible: false, x: 0, y: 0, day: '', present: 0, absent: 0, late: 0, excused: 0, total: 0, date: '' };
  activeLines: { [key: string]: boolean } = { present: true, absent: true, late: true, excused: true };

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

  ngAfterViewInit(): void {}

  loadClasses(): void {
    this.classService.getAllClasses().subscribe({
      next: (res) => {
        this.classes = res.data;
        if (this.classes.length > 0) {
          if (!this.selectedClassId) {
            this.selectedClassId = this.classes[0].class_id;
          }
          this.loadDashboard();
          this.loadWeeklyChart();
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

  // ==================== WEEKLY CHART ====================

  loadWeeklyChart(): void {
    this.chartLoading = true;
    this.attendanceService
      .getWeeklyChartData(this.weekOffset, this.selectedClassId)
      .subscribe({
        next: (response) => {
          this.weeklyChartData = response.data;
          this.chartLoading = false;
          // Wait for the view to update, then draw
          setTimeout(() => this.drawChart(), 50);
        },
        error: (err) => {
          this.chartLoading = false;
          console.error('Failed to load weekly chart', err);
        },
      });
  }

  prevWeek(): void {
    this.weekOffset--;
    this.loadWeeklyChart();
  }

  nextWeek(): void {
    if (this.weekOffset < 0) {
      this.weekOffset++;
      this.loadWeeklyChart();
    }
  }

  goToCurrentWeek(): void {
    this.weekOffset = 0;
    this.loadWeeklyChart();
  }

  toggleLine(key: string): void {
    this.activeLines[key] = !this.activeLines[key];
    this.drawChart();
  }

  get isCurrentWeek(): boolean {
    return this.weekOffset === 0;
  }

  formatWeekRange(): string {
    if (!this.weeklyChartData) return '';
    const { start_date, end_date } = this.weeklyChartData.period;
    const start = new Date(start_date + 'T00:00:00');
    const end = new Date(end_date + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', {...opts, year: 'numeric'})}`;
  }

  drawChart(): void {
    if (!this.chartCanvas || !this.weeklyChartData) return;

    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 300 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '300px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    const data = this.weeklyChartData.chart_data;

    // Determine max value
    let maxVal = 0;
    data.forEach(d => {
      if (this.activeLines['present'] && d.present > maxVal) maxVal = d.present;
      if (this.activeLines['absent'] && d.absent > maxVal) maxVal = d.absent;
      if (this.activeLines['late'] && d.late > maxVal) maxVal = d.late;
      if (this.activeLines['excused'] && d.excused > maxVal) maxVal = d.excused;
    });
    maxVal = Math.max(maxVal, 5); // Minimum scale
    maxVal = Math.ceil(maxVal * 1.2); // Add 20% headroom

    // Get computed style for theme-awareness
    const cs = getComputedStyle(document.documentElement);
    const textColor = cs.getPropertyValue('--secondary-color').trim() || '#6c757d';
    const gridColor = cs.getPropertyValue('--border-color').trim() || '#e9ecef';

    // Draw grid lines
    const gridLines = 5;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const val = Math.round(maxVal - (maxVal / gridLines) * i);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillText(val.toString(), padding.left - 8, y + 4);
    }

    // Draw day labels
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    const stepX = chartWidth / (data.length - 1 || 1);

    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      ctx.fillText(d.day, x, height - padding.bottom + 20);

      // Draw subtle vertical indicator
      ctx.beginPath();
      ctx.strokeStyle = gridColor;
      ctx.setLineDash([2, 6]);
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Line configs
    const lines: { key: string; color: string; values: number[] }[] = [
      { key: 'present', color: '#22c55e', values: data.map(d => d.present) },
      { key: 'absent', color: '#ef4444', values: data.map(d => d.absent) },
      { key: 'late', color: '#f59e0b', values: data.map(d => d.late) },
      { key: 'excused', color: '#3b82f6', values: data.map(d => d.excused) },
    ];

    // Draw each line
    lines.forEach(line => {
      if (!this.activeLines[line.key]) return;

      const points = line.values.map((val, i) => ({
        x: padding.left + stepX * i,
        y: padding.top + chartHeight - (val / maxVal) * chartHeight,
      }));

      // Draw gradient fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, line.color + '25');
      gradient.addColorStop(1, line.color + '00');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          // Smooth curve
          const prev = points[i - 1];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        }
      });
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          const prev = points[i - 1];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        }
      });
      ctx.stroke();

      // Draw dots
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }

  onChartMouseMove(event: MouseEvent): void {
    if (!this.weeklyChartData || !this.chartCanvas) return;

    const canvas = this.chartCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    const padding = { left: 45, right: 30 };
    const chartWidth = rect.width - padding.left - padding.right;
    const data = this.weeklyChartData.chart_data;
    const stepX = chartWidth / (data.length - 1 || 1);

    // Find closest data point
    const index = Math.round((mouseX - padding.left) / stepX);
    if (index >= 0 && index < data.length) {
      const d = data[index];
      const x = padding.left + stepX * index;
      this.chartTooltip = {
        visible: true,
        x: x,
        y: event.clientY - rect.top - 10,
        day: d.day,
        date: d.date,
        present: d.present,
        absent: d.absent,
        late: d.late,
        excused: d.excused,
        total: d.total,
      };
    }
  }

  onChartMouseLeave(): void {
    this.chartTooltip = { ...this.chartTooltip, visible: false };
  }

  // ==================== NAVIGATION ====================

  onClassChange(): void {
    this.loadDashboard();
    this.loadWeeklyChart();
  }

  refreshDashboard(): void {
    this.loadDashboard();
    this.loadWeeklyChart();
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
