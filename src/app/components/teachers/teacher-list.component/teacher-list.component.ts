import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherService } from '../../../services/teacherservice/teacher.service';
import { Teacher, TeacherFormData } from '../../../models/Teacher.model';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.css',
})
export class TeacherListComponent implements OnInit {
  teachers: Teacher[] = [];
  loading = false;
  error: string | null = null;
  Math = Math;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalTeachers = 0;
  totalPages = 0;

  // Filters
  searchQuery = '';

  // Modal state
  showAddModal = false;
  showEditModal = false;
  selectedTeacher: Teacher | null = null;

  // Form data
  teacherForm: TeacherFormData = {
    teacher_name_eng: '',
    phone: '',
  };

  constructor(
    private teacherService: TeacherService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading = true;
    this.error = null;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.searchQuery) params.search = this.searchQuery;

    this.teacherService.getAllTeachers(params).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.teachers = response.data || response.data.teachers;
          if (response.pagination) {
            this.totalTeachers = response.pagination.total;
            this.totalPages = response.pagination.totalPages;
          } else if (response.data.pagination) {
             this.totalTeachers = response.data.pagination.total;
             this.totalPages = response.data.pagination.totalPages;
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load teachers';
        this.loading = false;
        console.error(err);
      },
    });
  }

  viewTeacherDetail(teacherId: number): void {
    this.router.navigate(['/teachers', teacherId]);
  }

  openAddModal(): void {
    this.teacherForm = {
      teacher_name_eng: '',
      phone: '',
    };
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(teacher: Teacher): void {
    this.selectedTeacher = teacher;
    this.teacherForm = {
      teacher_name_eng: teacher.teacher_name_eng,
      phone: teacher.phone || '',
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedTeacher = null;
  }

  saveTeacher(): void {
    this.loading = true;

    this.teacherService.createTeacher(this.teacherForm).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.closeAddModal();
          this.loadTeachers();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to create teacher';
        this.loading = false;
        console.error(err);
      },
    });
  }

  updateTeacher(): void {
    if (!this.selectedTeacher) return;

    this.loading = true;

    this.teacherService
      .updateTeacher(this.selectedTeacher.teacher_id, this.teacherForm)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.closeEditModal();
            this.loadTeachers();
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

  deleteTeacher(teacher: Teacher): void {
    if (
      !confirm(`Are you sure you want to delete ${teacher.teacher_name_eng}?`)
    ) {
      return;
    }

    this.loading = true;

    this.teacherService.deleteTeacher(teacher.teacher_id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadTeachers();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to delete teacher';
        this.loading = false;
        console.error(err);
      },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTeachers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadTeachers();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTeachers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTeachers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTeachers();
    }
  }
}
