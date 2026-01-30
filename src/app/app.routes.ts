import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { MainLayoutComponent } from './components/layout/main-layout.component';

export const routes: Routes = [
  { 
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
            {
        path: 'dashboard',
        loadComponent: () => import('./components/attendance-dashboard.component/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'students/upload',
        loadComponent: () => import('./components/students/student-upload.component/student-upload.component').then(m => m.StudentUploadComponent),
        data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'students',
        loadComponent: () => import('./components/students/studentlist.component/studentlist.component').then(m => m.StudentlistComponent),
        data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'students/:id',
         loadComponent: () => import('./components/students/student-detail.component/student-detail.component').then(m => m.StudentDetailComponent) ,
         data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'attendance',
        loadComponent: () => import('./components/weeklyattendance.component/weeklyattendance.component').then(m => m.WeeklyattendanceComponent),
        data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'teachers',
        loadComponent: () => import('./components/teachers/teacher-list.component/teacher-list.component').then(m => m.TeacherListComponent),
        data: { roles: ['admin'] }
      },
      {
        path: 'teachers/:id',
        loadComponent: () => import('./components/teachers/teacher-detail.component/teacher-detail.component').then(m => m.TeacherDetailComponent),
        // data: { roles: ['admin', 'teacher'] } 
      },
      {
        path: 'subjects/assign',
        loadComponent: () => import('./components/subjects/assign-subject/assign-subject.component').then(m => m.AssignSubjectComponent),
        data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'subjects',
        loadComponent: () => import('./components/subjects/subject-list.component/subject-list.component').then(m => m.SubjectListComponent),
        data: { roles: ['admin', 'teacher'] }
      },
      {
        path: 'classes',
        loadComponent: () => import('./components/classes/class-list.component/class-list.component').then(m => m.ClassListComponent),
        data: { roles: ['admin', 'teacher'] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
