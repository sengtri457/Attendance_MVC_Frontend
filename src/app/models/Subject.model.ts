export interface Subject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectFormData {
  subject_name: string;
  subject_code: string;
  description?: string;
}
