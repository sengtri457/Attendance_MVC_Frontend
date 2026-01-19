export interface Teacher {
  teacher_id: number;
  teacher_name_eng: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherDetail extends Teacher {
  classes?: ClassInfo[];
}

export interface ClassInfo {
  class_id: number;
  class_name: string;
  subject?: SubjectInfo;
}

export interface SubjectInfo {
  subject_id: number;
  subject_name: string;
}

export interface TeacherFormData {
  teacher_name_eng: string;
  phone?: string;
}
