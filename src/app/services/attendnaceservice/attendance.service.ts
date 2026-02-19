import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../env/enviroment";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  meta?: any;
}

@Injectable({
  providedIn: "root",
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  /**
   * Get weekly attendance grid
   */
  getWeeklyGrid(
    startDate: string,
    endDate: string,
    classId: number,
    page: number = 1,
    limit: number = 20,
    search: string = "",
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set("start_date", startDate)
      .set("end_date", endDate)
      .set("class_id", classId)
      .set("page", page.toString())
      .set("limit", limit.toString());

    if (search) {
      params = params.set("search", search);
    }

    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/reports/weekly-grid`,
      { params },
    );
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(
    date?: string,
    classId?: number,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (date) params = params.set("date", date);
    if (classId) params = params.set("class_id", classId.toString());

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/dashboard`, {
      params,
    });
  }

  /**
   * Get daily report
   */
  getDailyReport(date: string, classId?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams().set("date", date);
    if (classId) params = params.set("class_id", classId.toString());

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/daily`, {
      params,
    });
  }

  /**
   * Get weekly report
   */
  getWeeklyReport(
    startDate: string,
    endDate: string,
    classId?: number,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set("start_date", startDate)
      .set("end_date", endDate);
    if (classId) params = params.set("class_id", classId.toString());

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/weekly`, {
      params,
    });
  }

  /**
   * Get student summary
   */
  getStudentSummary(
    studentId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams().set("student_id", studentId.toString());
    if (startDate) params = params.set("start_date", startDate);
    if (endDate) params = params.set("end_date", endDate);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/student`, {
      params,
    });
  }

  /**
   * Get class summary
   */
  getClassSummary(
    classId: number,
    date?: string,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams().set("class_id", classId.toString());
    if (date) params = params.set("date", date);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/class`, {
      params,
    });
  }

  /**
   * Get monthly calendar
   */
  getMonthlyCalendar(
    year: number,
    month: number,
    classId?: number,
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set("year", year.toString())
      .set("month", month.toString());
    if (classId) params = params.set("class_id", classId.toString());

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reports/monthly`, {
      params,
    });
  }

  /**
   * Create or update attendance
   */
  createOrUpdateAttendance(data: any): Observable<ApiResponse<any>> {
    // Check if attendance exists, then update or create
    return this.http.post<ApiResponse<any>>(this.apiUrl, data);
  }

  /**
   * Submit a batch of attendance records in one request.
   * The backend saves all records (upsert) and fires the Telegram notification.
   *
   * @param updates    - array of attendance records
   * @param className  - displayed in the Telegram message (e.g. "sv13")
   */
  submitBatch(
    updates: {
      student_id: number;
      teacher_id: number;
      subject_id: number;
      attendance_date: string;
      status: string;
      session?: string;
      notes?: string;
    }[],
    className: string = 'Unknown Class'
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/submit-batch`, {
      updates,
      class_name: className,
    });
  }

  /**
   * Create single attendance
   */
  createAttendance(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data);
  }

  /**
   * Bulk create attendance
   */
  bulkCreateAttendance(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bulk`, data);
  }

  /**
   * Update attendance
   */
  updateAttendance(id: number, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete attendance
   */
  deleteAttendance(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all attendance records
   */
  getAllAttendance(params?: any): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<any>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get attendance by ID
   */
  getAttendanceById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }
}
