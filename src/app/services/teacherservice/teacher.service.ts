import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../env/enviroment';
import { ApiResponse } from '../attendnaceservice/attendance.service';
import { Teacher, TeacherDetail, TeacherFormData } from '../../models/Teacher.model';

@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  private apiUrl = `${environment.apiUrl}/teacher`;

  constructor(private http: HttpClient) {}

  /**
   * Get all teachers with pagination and search
   */
  getAllTeachers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<ApiResponse<{ teachers: Teacher[]; pagination: any }>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<any>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get teacher by ID with classes
   */
  getTeacherById(id: number): Observable<ApiResponse<TeacherDetail>> {
    return this.http.get<ApiResponse<TeacherDetail>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create teacher
   */
  createTeacher(data: TeacherFormData): Observable<ApiResponse<Teacher>> {
    return this.http.post<ApiResponse<Teacher>>(this.apiUrl, data);
  }

  /**
   * Update teacher
   */
  updateTeacher(
    id: number,
    data: TeacherFormData
  ): Observable<ApiResponse<Teacher>> {
    return this.http.put<ApiResponse<Teacher>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete teacher
   */
  deleteTeacher(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
