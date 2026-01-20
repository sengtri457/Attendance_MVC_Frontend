import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClassService } from '../../../services/class.service';
import { TeacherService } from '../../../services/teacherservice/teacher.service';
import { SubjectService } from '../../../services/subjectservice/subject.service';
import { Class, ClassFormData } from '../../../models/Class.model';
import { Teacher } from '../../../models/Teacher.model';
import { Subject } from '../../../models/Subject.model';

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './class-list.component.html',
  styleUrls: ['./class-list.component.css']
})
export class ClassListComponent implements OnInit {
  classes: Class[] = [];
  teachers: Teacher[] = [];
  subjects: Subject[] = [];
  loading = false;
  error: string | null = null;

  // Pagination & Filtering
  currentPage = 1;
  pageSize = 10;
  totalClasses = 0;
  totalPages = 0;
  searchYear = '';

  // Modals
  showAddModal = false;
  showEditModal = false;
  selectedClass: Class | null = null;
  classForm: ClassFormData = {
    class_code: '',
    class_year: '',
    schedule: '',
    teacher_id: 0,
    subject_id: 0
  };

  Math = Math;

  constructor(
    private classService: ClassService,
    private teacherService: TeacherService,
    private subjectService: SubjectService
  ) {}

  ngOnInit(): void {
    this.loadClasses();
    this.loadTeachers();
    this.loadSubjects();
  }

  loadClasses(): void {
    this.loading = true;
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    if (this.searchYear) {
      params.class_year = this.searchYear;
    }

    this.classService.getAllClasses(params).subscribe({
      next: (res) => {
        // Backend returns { success: true, data: [...], pagination: {...} }
        this.classes = res.data;
        this.totalClasses = res.pagination.total;
        this.totalPages = res.pagination.totalPages;
        this.loading = false;
        this.error = null;
      },
      error: (err) => {
        console.error('Error loading classes', err);
        this.error = 'Failed to load classes. Please try again.';
        this.loading = false;
      }
    });
  }

  loadTeachers(): void {
    this.teacherService.getAllTeachers({ limit: 100 }).subscribe({
      next: (res: any) => {
        // Assuming uniform response structure
        this.teachers = res.data || res.teachers || [];
      },
      error: (err) => console.error('Error loading teachers', err)
    });
  }

  loadSubjects(): void {
    this.subjectService.getAllSubjects({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.subjects = res.data;
      },
      error: (err) => console.error('Error loading subjects', err)
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadClasses();
  }

  clearFilters(): void {
    this.searchYear = '';
    this.currentPage = 1;
    this.loadClasses();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadClasses();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadClasses();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadClasses();
  }

  openAddModal(): void {
    this.resetForm();
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(classItem: Class): void {
    this.selectedClass = classItem;
    this.classForm = {
      class_code: classItem.class_code,
      class_year: classItem.class_year,
      schedule: classItem.schedule || '',
      // Prioritize explicit IDs if available, else try to get from nested objects
      teacher_id: classItem.teacher_id || classItem.teacher?.teacher_id || 0,
      subject_id: classItem.subject_id || classItem.subject?.subject_id || 0
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedClass = null;
  }

  resetForm(): void {
    this.classForm = {
      class_code: '',
      class_year: '',
      schedule: '',
      teacher_id: 0,
      subject_id: 0
    };
  }

  saveClass(): void {
    if (!this.isValidForm()) {
      alert('Please fill in all required fields');
      return;
    }

    this.classService.createClass(this.classForm).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadClasses();
      },
      error: (err) => {
        console.error('Error creating class', err);
        alert('Failed to create class. ' + (err.error?.message || err.message));
      }
    });
  }

  updateClass(): void {
    if (!this.selectedClass || !this.isValidForm()) return;

    this.classService.updateClass(this.selectedClass.class_id, this.classForm).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadClasses();
      },
      error: (err) => {
        console.error('Error updating class', err);
        alert('Failed to update class. ' + (err.error?.message || err.message));
      }
    });
  }

  deleteClass(classItem: Class): void {
    if (confirm(`Are you sure you want to delete class ${classItem.class_code}?`)) {
      this.classService.deleteClass(classItem.class_id).subscribe({
        next: () => {
          this.loadClasses();
        },
        error: (err) => {
          console.error('Error deleting class', err);
          alert('Failed to delete class');
        }
      });
    }
  }

  isValidForm(): boolean {
    return !!(this.classForm.class_code && this.classForm.class_year && this.classForm.teacher_id && this.classForm.subject_id);
  }
}
