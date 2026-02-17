import { Component, OnInit, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../services/studentservice/student.service';
import { Student, ApiResponse } from '../../../models/Student.model';
import { Class } from '../../../models/Class.model';
import Swal from 'sweetalert2';
import { ClassService } from '../../../services/class.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-studentlist.component',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './studentlist.component.html',
  styleUrl: './studentlist.component.css',
})
export class StudentlistComponent implements OnInit {
  classes: Class[] = [];
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
    class_id: 1,
    address: ''
  };
  Math = Math;

  private destroyRef = inject(DestroyRef);

  constructor(
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute,
    private classService: ClassService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadStudents();
      this.loadClasses();

      this.route.queryParams
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(params => {
          if (params['action'] === 'add') {
            this.openAddModal();
          }
        });
    }
  }

  loadClasses(): void {
    this.classService.getAllClasses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.classes = response.data;
          }
        },
        error: (err: any) => {
          // console.error(err); // Removed for production
          this.error = 'Failed to load classes';
        }
      });
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

    this.studentService.getAllStudents(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<{ students: Student[]; pagination: any }>) => { // Typed response
          if (response.success) {
            // Flexible handling if backend structure varies slightly
            const data = response.data as any; 
            this.students = data.students || data;
            
            if (response.data && response.data.pagination) {
              this.totalStudents = response.data.pagination.total;
              this.totalPages = response.data.pagination.totalPages;
            } else if (data && data.pagination) { // Fallback check
               this.totalStudents = data.pagination.total;
               this.totalPages = data.pagination.totalPages;
            }
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err.message || 'Failed to load students';
          this.loading = false;
          // console.error(err);
        }
      });
  }


  viewStudentDetail(studentId: number): void {
    this.router.navigate(['/students', studentId]);
  }


  importExcel(){ // Fixed typo from importExcell
    this.router.navigateByUrl('students/upload'); 
  }


  openAddModal(): void {
    this.studentForm = {
      student_name_kh: '',
      student_name_eng: '',
      gender: 'M',
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

    this.studentService.createStudent(this.studentForm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<Student>) => {
          if (response.success) {
            this.closeAddModal();
            this.loadStudents();
            Swal.fire({
              title: "Success",
              text: "Student created successfully",
              icon: "success",
              timer: 2000,
              showConfirmButton: false
            });
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to create student';
          this.loading = false;
          // console.error(err);
          Swal.fire({
              title: "Error",
              text: "Failed to create student",
              icon: "error"
            });
        }
      });
  }

  updateStudent(): void {
    if (!this.selectedStudent) return;

    this.loading = true;

    this.studentService.updateStudent(
      this.selectedStudent.student_id,
      this.studentForm
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response: ApiResponse<Student>) => {
        if (response.success) {
          this.closeEditModal();
          this.loadStudents();
          Swal.fire({
              title: "Success",
              text: "Student updated successfully",
              icon: "success",
              timer: 2000,
              showConfirmButton: false
            });
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to update student';
        this.loading = false;
        // console.error(err);
        Swal.fire({
            title: "Error",
            text: "Failed to update student",
            icon: "error"
          });
      }
    });
  }

  deleteStudent(student: Student): void {
    // if (!confirm(`Are you sure you want to delete ${student.student_name_eng}?`)) {
    //   return;
    // }

    
const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-success",
    cancelButton: "btn btn-danger"
  },
  buttonsStyling: false
});
swalWithBootstrapButtons.fire({
  title: "Are you sure you want to delete?",
  text: ` ${student.student_name_eng} will be deleted`,
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, delete it!",
  cancelButtonText: "No, cancel!",
  reverseButtons: true
}).then((result) => {
  if (result.isConfirmed) {
        this.loading = true;
        this.studentService.deleteStudent(student.student_id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadStudents();
              swalWithBootstrapButtons.fire({
                title: "Deleted!",
                text: "The student has been deleted.",
                icon: "success"
              });
            } else {
              this.error = "Failed to delete from server";
            }
          },
          error: (err: any) => {
            this.error = 'Failed to delete student';
            this.loading = false;
          }
        });
  } else if (
    /* Read more about handling dismissals below */
    result.dismiss === Swal.DismissReason.cancel
  ) {
    swalWithBootstrapButtons.fire({
      title: "Cancelled",
      text: "Student is safe :)", // Fixed text
      icon: "error"
    });
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

  // Optimization: TrackBy function for ngFor
  trackByStudentId(index: number, student: Student): number {
    return student.student_id;
  }
}
