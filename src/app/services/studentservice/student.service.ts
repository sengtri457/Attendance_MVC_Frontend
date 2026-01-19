import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../env/enviroment';
import { ApiResponse } from '../attendnaceservice/attendance.service';
import { Student, StudentDetail } from '../../models/Student.model';

@Injectable({
  providedIn: "root",
})
export class StudentService {
   private apiUrl = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  /**
   * Get all students
   */
  getAllStudents(params?: {
    page?: number;
    limit?: number;
    class_id?: number;
    search?: string;
    gender?: string;
  }): Observable<ApiResponse<{ students: Student[]; pagination: any }>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
       async (params:any) => {
         if (params[key] !== undefined && params[key] !== null) {
           httpParams = httpParams.set(key, params[key].toString());
       }
        }
      });
    }
    return this.http.get<ApiResponse<any>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get student by ID
   */
  getStudentById(id: number): Observable<ApiResponse<Student>> {
    return this.http.get<ApiResponse<Student>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get student detail with attendance summary
   */
  getStudentDetail(
    id: number,
    startDate?: string,
    endDate?: string
  ): Observable<ApiResponse<StudentDetail>> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<ApiResponse<StudentDetail>>(
      `${this.apiUrl}/${id}/detail`,
      { params }
    );
  }

  /**
   * Get students by class
   */
  getStudentsByClass(classId: number): Observable<ApiResponse<Student[]>> {
    const params = new HttpParams().set('class_id', classId.toString());
    return this.http.get<ApiResponse<Student[]>>(this.apiUrl, { params });
  }

  /**
   * Create student
   */
  createStudent(data: Partial<Student>): Observable<ApiResponse<Student>> {
    return this.http.post<ApiResponse<Student>>(this.apiUrl, data);
  }

  /**
   * Update student
   */
  updateStudent(
    id: number,
    data: Partial<Student>
  ): Observable<ApiResponse<Student>> {
    return this.http.put<ApiResponse<Student>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete student
   */
  deleteStudent(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Upload student profile picture
   */
  uploadProfilePicture(
    id: number,
    file: File
  ): Observable<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('profile_picture', file);

    return this.http.post<ApiResponse<{ url: string }>>(
      `${this.apiUrl}/${id}/profile-picture`,
      formData
    );
  }
}
