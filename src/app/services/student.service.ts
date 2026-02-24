import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../env/enviroment';
export interface UploadResponse {
  success: boolean;
  message: string;
  summary?: {
    total: number;
    success: number;
    failed: number;
  };
  results?: {
    success: any[];
    failed: any[];
  };
  count?: number;
  data?: any[];
}

export interface Student {
  student_id?: number;
  class_id: number;
  student_name_kh: string;
  student_name_eng: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
}
@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private apiUrls = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  /**
   * Upload Excel file with detailed row-by-row feedback
   */
  uploadExcel(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<any>(`${this.apiUrls}/upload-excel`, formData)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message,
          summary: response.data?.summary,
          results: response.data?.results,
        } as UploadResponse)),
        catchError(this.handleError)
      );
  }

  /**
   * Upload Excel file with bulk insert (faster)
   */
  uploadExcelBulk(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<any>(`${this.apiUrls}/upload-excel-bulk`, formData)
      .pipe(
        map(response => ({
          success: response.success,
          message: response.message,
          count: response.meta?.count,
          data: response.data,
        } as UploadResponse)),
        catchError(this.handleError)
      );
  }

  /**
   * Download Excel template
   */
  downloadTemplate(): Observable<Blob> {
    return this.http
      .get(`${this.apiUrls}/download-template`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get all students
   */
  getAllStudents(): Observable<any> {
    return this.http.get(`${this.apiUrls}`).pipe(catchError(this.handleError));
  }

  /**
   * Create single student
   */
  createStudent(student: Student): Observable<any> {
    return this.http
      .post(`${this.apiUrls}`, student)
      .pipe(catchError(this.handleError));
  }

  /**
   * Error handler
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
