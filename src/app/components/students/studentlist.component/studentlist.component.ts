import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentService } from '../../../services/studentservice/student.service';
import { Student } from '../../../models/Student.model';

@Component({
  selector: 'app-studentlist.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './studentlist.component.html',
  styleUrl: './studentlist.component.css',
})
export class StudentlistComponent implements OnInit {
students: Student[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalStudents = 0;
  totalPages = 0;

  // Filters
  selectedClassId: number | null = null;
  searchQuery = '';
  selectedGender: string | null = null;

  // Modal state
  showAddModal = false;
  showEditModal = false;
  selectedStudent: Student | null = null;

  // Form data
  studentForm = {
    student_name_kh: '',
    student_name_eng: '',
    gender: 'M',
    date_of_birth: '',
    class_id: 1,
    address: ''
  };
Math: any;

  constructor(
    private studentService: StudentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.loading = true;
    this.error = null;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };

    if (this.selectedClassId) params.class_id = this.selectedClassId;
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.selectedGender) params.gender = this.selectedGender;

    this.studentService.getAllStudents(params).subscribe({
      next: (response:any) => {
        if (response.success) {
          this.students = response.data.students || response.data;
          console.log(this.students)
          if (response.data.pagination) {
            this.totalStudents = response.data.pagination.total;
            this.totalPages = response.data.pagination.totalPages;
          }
        }
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to load students';
        this.loading = false;
        console.error(err);
      }
    });
  }

  viewStudentDetail(studentId: number): void {
    this.router.navigate(['/students', studentId]);
  }

  openAddModal(): void {
    this.studentForm = {
      student_name_kh: '',
      student_name_eng: '',
      gender: 'M',
      date_of_birth: '',
      class_id: 1,
      address: ''
    };
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(student: Student): void {
    this.selectedStudent = student;
    this.studentForm = {
      student_name_kh: student.student_name_kh,
      student_name_eng: student.student_name_eng,
      gender: student.gender,
      date_of_birth: student.date_of_birth || '',
      class_id: student.class_id,
      address: student.address || ''
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedStudent = null;
  }

  saveStudent(): void {
    this.loading = true;

    this.studentService.createStudent(this.studentForm).subscribe({
      next: (response:any) => {
        if (response.success) {
          this.closeAddModal();
          this.loadStudents();
        }
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to create student';
        this.loading = false;
        console.error(err);
      }
    });
  }

  updateStudent(): void {
    if (!this.selectedStudent) return;

    this.loading = true;

    this.studentService.updateStudent(
      this.selectedStudent.student_id,
      this.studentForm
    ).subscribe({
      next: (response:any) => {
        if (response.success) {
          this.closeEditModal();
          this.loadStudents();
        }
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to update student';
        this.loading = false;
        console.error(err);
      }
    });
  }

  deleteStudent(student: Student): void {
    if (!confirm(`Are you sure you want to delete ${student.student_name_eng}?`)) {
      return;
    }

    this.loading = true;

    this.studentService.deleteStudent(student.student_id).subscribe({
      next: (response:any) => {
        if (response.success) {
          this.loadStudents();
        }
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to delete student';
        this.loading = false;
        console.error(err);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadStudents();
  }

  clearFilters(): void {
    this.selectedClassId = null;
    this.searchQuery = '';
    this.selectedGender = null;
    this.currentPage = 1;
    this.loadStudents();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadStudents();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadStudents();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadStudents();
    }
  }

  getGenderDisplay(gender: string): string {
    return gender === 'M' ? 'Male' : 'Female';
  }

  getGenderIcon(gender: string): string {
    return gender === 'M' ? '♂' : '♀';
  }

  getGenderClass(gender: string): string {
    return gender === 'M' ? 'text-primary' : 'text-danger';
  }
}
