import { Component } from '@angular/core';
import { StudentService, UploadResponse } from '../../../services/student.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
interface UploadResult {
  type: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}
@Component({
  selector: 'app-student-upload.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './student-upload.component.html',
  styleUrl: './student-upload.component.css',
})
export class StudentUploadComponent {
  selectedFile: File | null = null;
  fileName: string = '';
  uploading: boolean = false;
  uploadMode: 'detailed' | 'bulk' = 'detailed';
  uploadResult: UploadResult | null = null;
  showResults: boolean = false;

  // For displaying results
  successCount: number = 0;
  failedCount: number = 0;
  totalCount: number = 0;
  successRecords: any[] = [];
  failedRecords: any[] = [];

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {}

  /**
   * Handle file selection
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];

    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];

      if (!validTypes.includes(file.type)) {
        this.uploadResult = {
          type: 'error',
          message:
            'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
        };
        this.resetFileInput(event);
        return;
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.uploadResult = {
          type: 'error',
          message: 'File too large. Maximum size is 10MB',
        };
        this.resetFileInput(event);
        return;
      }

      this.selectedFile = file;
      this.fileName = file.name;
      this.uploadResult = null;
      this.showResults = false;
    }
  }

  /**
   * Reset file input
   */
  resetFileInput(event: any): void {
    event.target.value = '';
    this.selectedFile = null;
    this.fileName = '';
  }

  /**
   * Upload file
   */
  uploadFile(): void {
    if (!this.selectedFile) {
      this.uploadResult = {
        type: 'error',
        message: 'Please select a file first',
      };
      return;
    }

    this.uploading = true;
    this.uploadResult = null;
    this.showResults = false;

    const uploadObservable =
      this.uploadMode === 'detailed'
        ? this.studentService.uploadExcel(this.selectedFile)
        : this.studentService.uploadExcelBulk(this.selectedFile);

    uploadObservable.subscribe({
      next: (response: UploadResponse) => {
        this.uploading = false;
        this.handleUploadSuccess(response);

        console.log(response);
        console.log(this.successRecords);
      },
      error: (error:any) => {
        this.uploading = false;
        this.handleUploadError(error);
      },
    });
  }

  /**
   * Handle successful upload
   */
  handleUploadSuccess(response: UploadResponse): void {
    if (this.uploadMode === 'detailed' && response.summary) {
      // Detailed mode with summary
      this.totalCount = response.summary.total;
      this.successCount = response.summary.success;
      this.failedCount = response.summary.failed;
      this.successRecords = response.results?.success || [];
      this.failedRecords = response.results?.failed || [];

      if (this.failedCount === 0) {
        this.uploadResult = {
          type: 'success',
          message: `Successfully uploaded ${this.successCount} student(s)!`,
        };
      } else {
        this.uploadResult = {
          type: 'warning',
          message: `Uploaded ${this.successCount} student(s). ${this.failedCount} failed.`,
        };
      }
      this.showResults = true;
    } else if (response.count !== undefined) {
      // Bulk mode
      this.uploadResult = {
        type: 'success',
        message: `Successfully uploaded ${response.count} student(s)!`,
      };
    }

    // Reset file selection
    this.selectedFile = null;
    this.fileName = '';
  }

  /**
   * Handle upload error
   */
  handleUploadError(error: any): void {
    console.error('Upload error:', error);

    this.uploadResult = {
      type: 'error',
      message: error.message || 'Upload failed. Please try again.',
      details: error,
    };
  }

  /**
   * Download template
   */
  downloadTemplate(): void {
    this.studentService.downloadTemplate().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'student_template.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error:any) => {
        console.error('Download error:', error);
        this.uploadResult = {
          type: 'error',
          message: 'Failed to download template',
        };
      },
    });
  }

  /**
   * Clear file selection
   */
  clearFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.uploadResult = null;
    this.showResults = false;
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.clearFile();
    this.successRecords = [];
    this.failedRecords = [];
    this.successCount = 0;
    this.failedCount = 0;
    this.totalCount = 0;
  }
}
