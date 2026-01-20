import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../env/enviroment";
import { Class, ClassFormData } from "../models/Class.model";

@Injectable({
  providedIn: "root",
})
export class ClassService {
  private apiUrl = `${environment.apiUrl}/class`;

  constructor(private http: HttpClient) {}

  /**
   * Get all classes with pagination and filters
   */
  getAllClasses(params?: any): Observable<any> {
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
   * Get class by ID
   */
  getClassById(id: number): Observable<{ data: Class }> {
    return this.http.get<{ data: Class }>(
      `${this.apiUrl}/${id}`,
    );
  }

  /**
   * Create a new class
   */
  createClass(classData: ClassFormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, classData);
  }

  /**
   * Update a class
   */
  updateClass(id: number, classData: ClassFormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, classData);
  }

  /**
   * Delete a class
   */
  deleteClass(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
