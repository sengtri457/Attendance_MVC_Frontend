import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../env/enviroment';

export interface User {
  user_id: number;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  profile_id?: number;
  profile?: any;
}

interface LoginResponse {
  user_id: number;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  profile_id?: number;
  profile?: any;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    let storedUser = null;
    if (isPlatformBrowser(this.platformId)) {
      const item = localStorage.getItem('currentUser');
      if (item) {
        storedUser = JSON.parse(item);
      }
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(response => response.data),
        tap(user => {
          if (user && user.token) {
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('token', user.token);
              
              localStorage.setItem('currentUser', JSON.stringify(user));
              this.currentUserSubject.next(user);
              
              if (user.role === 'student' && user.profile_id) {
                 this.router.navigate(['/students', user.profile_id]);
              } else {
                 this.router.navigate(['/dashboard']);
              }
            }
          }
        })
      );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUserValue;
    return !!user && roles.includes(user.role);
  }
}
