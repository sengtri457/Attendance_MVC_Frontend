import { Routes } from '@angular/router';
import { StudentUploadComponent } from './components/students/student-upload.component/student-upload.component'
import { WeeklyattendanceComponent } from './components/weeklyattendance.component/weeklyattendance.component';
import { AttendanceDashboardComponent } from './components/attendance-dashboard.component/attendance-dashboard.component';
import { StudentlistComponent } from './components/students/studentlist.component/studentlist.component';
import { StudentDetailComponent } from './components/students/student-detail.component/student-detail.component';
export const routes: Routes = [
  {
    path: 'upload',
    component: StudentUploadComponent,
  },
  {
    path: 'attendance',
    component: WeeklyattendanceComponent,
  },
  {
    path: '',
    component: AttendanceDashboardComponent,
  },
  {
    path: 'students',
    component: StudentlistComponent
  },
  {
    path: 'students/:id',
    component: StudentDetailComponent
  },
  {
    path: 'teachers',
    loadComponent: () => import('./components/teachers/teacher-list.component/teacher-list.component').then(m => m.TeacherListComponent)
  },
  {
    path: 'teachers/:id',
    loadComponent: () => import('./components/teachers/teacher-detail.component/teacher-detail.component').then(m => m.TeacherDetailComponent)
  },
];
