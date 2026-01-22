import { Student } from './Student.model';
import { Teacher } from './Teacher.model';
import { Subject } from './Subject.model';

export interface Class {
  class_id: number;
  class_code: string;
  class_year: string;
  schedule?: string;
  created_at?: string;
  updated_at?: string;
  students?: Student[];
  teacher?: Teacher;
  subject?: Subject;
  teacher_id?: number;
  subject_id?: number;
}

export interface ClassFormData {
  class_code: string;
}
