import { Routes } from '@angular/router';
import { StudentUploadComponent } from './components/student-upload.component/student-upload.component';
import { WeeklyattendanceComponent } from './components/weeklyattendance.component/weeklyattendance.component';
import { AttendanceDashboardComponent } from './components/attendance-dashboard.component/attendance-dashboard.component';

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
];
