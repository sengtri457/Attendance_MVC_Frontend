import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../env/enviroment";
export interface Subject {
  subject_id: number;
  subject_name: string;
  subject_code?: string;
}

export interface DaySchedule {
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  day_name: string;
  subjects: Subject[];
}

export interface ClassSchedule {
  class_id: number;
  class_name: string;
  schedule: DaySchedule[];
}
@Injectable({
  providedIn: "root",
})
export class SubjectService {
  private apiUrl = `${environment.apiUrl}/subject`; // Adjust based on your API

  constructor(private http: HttpClient) {}

  /**
   * Get all subjects
   */
  getAllSubjects(): Observable<{ data: Subject[] }> {
    return this.http.get<{ data: Subject[] }>(`${this.apiUrl}`);
  }

  /**
   * Get subjects for a specific class
   */
  getSubjectsByClass(classId: number): Observable<{ data: Subject[] }> {
    return this.http.get<{ data: Subject[] }>(
      `${this.apiUrl}/class/${classId}`,
    );
  }

  /**
   * Get class schedule (subjects by day of week)
   */
  getClassSchedule(classId: number): Observable<{ data: ClassSchedule }> {
    return this.http.get<{ data: ClassSchedule }>(
      `${this.apiUrl}/schedule/${classId}`,
    );
  }

  /**
   * Get subjects for a specific class and day of week
   */
  getSubjectsByClassAndDay(
    classId: number,
    dayOfWeek: number,
  ): Observable<{ data: Subject[] }> {
    return this.http.get<{ data: Subject[] }>(
      `${this.apiUrl}/class/${classId}/day/${dayOfWeek}`,
    );
  }

  /**
   * Get subjects for a specific date
   */
  getSubjectsByDate(
    classId: number,
    date: string,
  ): Observable<{ data: Subject[] }> {
    return this.http.get<{ data: Subject[] }>(
      `${this.apiUrl}/class/${classId}/date/${date}`,
    );
  }
}
