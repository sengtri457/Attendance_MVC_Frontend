/** Period summary (today / this_week / this_month) from dashboard API. */
export interface DashboardPeriodSummary {
  P: number;
  A: number;
  L: number;
  E: number;
  total: number;
  attendance_rate: string;
}

export interface DashboardData {
  today: DashboardPeriodSummary;
  this_week: DashboardPeriodSummary;
  this_month: DashboardPeriodSummary;
  students_at_risk: Array<{
    student_name_eng: string;
    student_name_kh: string;
    attendance_rate: string;
    days_present: number;
    total_days: number;
  }>;
  recent_absences: Array<{
    attendance_date: string;
    student: { student_name_eng: string; student_name_kh: string };
    notes?: string;
  }>;
  generated_at: string;
}
