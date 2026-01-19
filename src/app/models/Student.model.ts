export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Student {
  student_id: number;
  student_name_kh: string;
  student_name_eng: string;
  gender: string;
  date_of_birth?: string;
  class_id: number;
  phone_number?: string;
  address?: string;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
  class?: {
    class_id: number;
    class_code: string;
    grade_level?: string;
  };
}

export interface StudentDetail extends Student {
  attendance_summary?: {
    total_days: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendance_rate: string;
  };
  recent_attendance?: Array<{
    attendance_id: number;
    attendance_date: string;
    status: string;
    subject: {
      subject_id: number;
      subject_name: string;
    };
    notes?: string;
  }>;
}
