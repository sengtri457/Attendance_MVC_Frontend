import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../env/enviroment';

export interface UserProfile {
  user_id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'teacher' | 'student';
  profile_id: number | null;
  linkedProfile: any;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  full_name?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/user`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      map(response => response.data)
    );
  }

  updateProfile(data: UpdateProfilePayload): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, data).pipe(
      map(response => response.data)
    );
  }

  changePassword(data: ChangePasswordPayload): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/change-password`, data).pipe(
      map(response => response)
    );
  }
}
