import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../env/enviroment";
import { Subject, SubjectFormData } from "../../models/Subject.model";

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
  private apiUrl = `${environment.apiUrl}/subject`;

  constructor(private http: HttpClient) {}

  /**
   * Get all subjects with pagination and search
   */
  getAllSubjects(params?: any): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}`, { params: httpParams });
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

  /**
   * Create a new subject
   */
  createSubject(subjectData: SubjectFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, subjectData);
  }

  /**
   * Update a subject
   */
  updateSubject(id: number, subjectData: SubjectFormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, subjectData);
  }

  /**
   * Delete a subject
   */
  deleteSubject(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
