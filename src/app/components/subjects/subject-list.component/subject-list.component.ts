import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../../services/subjectservice/subject.service';
import { Subject, SubjectFormData } from '../../../models/Subject.model';
import {RouterLink} from '@angular/router';
@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './subject-list.component.html',
  styleUrl: './subject-list.component.css',
})
export class SubjectListComponent implements OnInit {
  subjects: Subject[] = [];
  loading = false;
  error: string | null = null;
  Math = Math;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalSubjects = 0;
  totalPages = 0;

  // Filters
  searchQuery = '';

  // Modal state
  showAddModal = false;
  showEditModal = false;
  selectedSubject: Subject | null = null;

  // Form data
  subjectForm: SubjectFormData = {
    subject_name: '',
    subject_code: '',
    description: ''
  };

  constructor(
    private subjectService: SubjectService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSubjects();
    }
  }

  loadSubjects(): void {
    this.loading = true;
    this.error = null;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.searchQuery) params.search = this.searchQuery;

    this.subjectService.getAllSubjects(params).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.subjects = response.data;
          if (response.pagination) {
            this.totalSubjects = response.pagination.total;
            this.totalPages = response.pagination.totalPages;
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load subjects';
        this.loading = false;
        console.error(err);
      },
    });
  }

  openAddModal(): void {
    this.subjectForm = {
      subject_name: '',
      subject_code: '',
      description: ''
    };
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(subject: Subject): void {
    this.selectedSubject = subject;
    this.subjectForm = {
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      description: subject.description || ''
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedSubject = null;
  }

  saveSubject(): void {
    this.loading = true;

    this.subjectService.createSubject(this.subjectForm).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.closeAddModal();
          this.loadSubjects();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to create subject';
        this.loading = false;
        console.error(err);
      },
    });
  }

  updateSubject(): void {
    if (!this.selectedSubject) return;

    this.loading = true;

    this.subjectService
      .updateSubject(this.selectedSubject.subject_id, this.subjectForm)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.closeEditModal();
            this.loadSubjects();
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to update subject';
          this.loading = false;
          console.error(err);
        },
      });
  }

  deleteSubject(subject: Subject): void {
    if (
      !confirm(`Are you sure you want to delete ${subject.subject_name}?`)
    ) {
      return;
    }

    this.loading = true;

    this.subjectService.deleteSubject(subject.subject_id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadSubjects();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to delete subject';
        this.loading = false;
        console.error(err);
      },
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadSubjects();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadSubjects();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadSubjects();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadSubjects();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadSubjects();
    }
  }
}
