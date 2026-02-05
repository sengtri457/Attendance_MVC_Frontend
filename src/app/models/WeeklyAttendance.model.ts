export interface AttendanceData {
  subjects?: {
    [subjectId: string]: Array<{
      session: string;
      status: string;
      notes?: string;
    }>;
  };
  summary?: {
    P: number;
    A: number;
    L: number;
    E: number;
    total: number;
  };
}

export interface StudentRow {
  row_number: number;
  student_id: number;
  student_name_kh: string;
  student_name_eng: string;
  gender: string;
  attendance: { [date: string]: AttendanceData };
  subject_attendance: {
    [date: string]: {
      subjects: Array<{
        subject_id: number;
        subject_name: string;
        subject_code?: string;
        status: string;
        notes?: string;
      }>;
      daily_status: string;
    };
  };
  statistics: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total_days: number;
    recorded_days: number;
    attendance_rate: string;
    subject_absences: number;
    subject_lates: number;
    subject_excused: number;
  };
}

export interface WeeklyGridData {
  class: {
    class_id: number;
    class_name: string;
    class_code?: string;
  };
  period: {
    start_date: string;
    end_date: string;
    dates: string[];
    total_days: number;
  };
  subjects?: Array<{
    subject_id: number;
    subject_name: string;
    subject_code?: string;
  }>;
  students: StudentRow[];
  daily_statistics: Record<string, any>;
  overall_statistics?: {
    total_students?: number;
    present?: number;
    absent?: number;
    late?: number;
    excused?: number;
    attendance_rate?: string;
    recorded_days?: number;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PendingUpdate {
  studentId: number;
  date: string;
  status: string;
  subjectId: number;
  previousStatus?: string;
  isModification: boolean;
}
