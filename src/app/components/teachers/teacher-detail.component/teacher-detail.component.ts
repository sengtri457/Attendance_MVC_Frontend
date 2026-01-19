import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../../services/teacherservice/teacher.service';
import { TeacherDetail, TeacherFormData } from '../../../models/Teacher.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-detail.component.html',
  styleUrl: './teacher-detail.component.css',
})
export class TeacherDetailComponent implements OnInit {
  teacherId!: number;
  teacher: TeacherDetail | null = null;
  loading = false;
  error: string | null = null;

  // Tab state
  activeTab: 'profile' | 'classes' = 'profile';

  // Edit Modal
  showEditModal = false;
  teacherForm: TeacherFormData = {
    teacher_name_eng: '',
    phone: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.teacherId = +params['id'];
      this.loadTeacherDetail();
    });
  }

  loadTeacherDetail(): void {
    this.loading = true;
    this.error = null;

    this.teacherService.getTeacherById(this.teacherId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.teacher = response.data;
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load teacher details';
        this.loading = false;
        console.error(err);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/teachers']);
  }

  setActiveTab(tab: 'profile' | 'classes'): void {
    this.activeTab = tab;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  printProfile(): void {
    window.print();
  }

  openEditModal(): void {
    if (!this.teacher) return;
    
    this.teacherForm = {
      teacher_name_eng: this.teacher.teacher_name_eng,
      phone: this.teacher.phone || '',
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  updateTeacher(): void {
    if (!this.teacher) return;

    this.loading = true;

    this.teacherService
      .updateTeacher(this.teacher.teacher_id, this.teacherForm)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.closeEditModal();
            this.loadTeacherDetail();
            // In a real app we might want to update the local object directly or just reload
            // Reloading is safer for consistency
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to update teacher';
          this.loading = false;
          console.error(err);
        },
      });
  }
}
