import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AttendanceService } from "../../services/attendnaceservice/attendance.service";
import { forkJoin, Subject as RxSubject, interval } from "rxjs";
import { takeUntil, finalize } from "rxjs/operators";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../env/enviroment';
import {
  SubjectService,
} from "../../services/subjectservice/subject.service";
import Swal from "sweetalert2";
import { Subject } from "../../models/Subject.model";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { ClassService } from "../../services/class.service";
import { Class } from "../../models/Class.model";
import { HttpClient } from "@angular/common/http";
import { TelegramserviceService } from "../../services/telegramservice/telegramservice.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { LanguageService } from "../../services/language.service";
import { WeeklyGridData, StudentRow, PendingUpdate } from '../../models/WeeklyAttendance.model';
import { AttendanceExportService } from '../../services/attendance-export.service';
import { ReportsService } from '../../services/reports.service';

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

// FIXED: Better bulk selection state management
interface BulkSelectionState {
  date: string;
  selectedStatus: string;
  selectedStudents: Set<number>;
  isActive: boolean;
}

@Component({
  selector: "app-weeklyattendance.component",
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./weeklyattendance.component.html",
  styleUrl: "./weeklyattendance.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class WeeklyattendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new RxSubject<void>();
  private http = inject(HttpClient);

  gridData: WeeklyGridData | null = null;
  loading = false;
  error: string | null = null;

  // Filters
  classes: Class[] = [];
  selectedClassId: number = 0;
  startDate: string = "";
  endDate: string = "";
  searchQuery: string = "";
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalStudents = 0;
  totalPages = 0;
  Math = Math;
  Array = Array; // For template usage

  // Subject management
  dateSubjects: Map<string, Subject[]> = new Map();
  selectedSubjects: Map<string, number> = new Map();
  loadingSubjects = false;

  // Editing with pending updates
  editMode: Map<string, boolean> = new Map();
  selectedCell: { studentId: number; date: string } | null = null;
  pendingUpdates: Map<string, PendingUpdate> = new Map();
  hasUnsavedChanges = false;

  // FIXED: Bulk selection with proper state management
  bulkSelectionMode: Map<string, BulkSelectionState> = new Map();
  showBulkSelectionPanel = false;
  currentBulkDate: string | null = null;
  
  // NEW: Global Student Selection (Row-based)
  globalSelectedStudents: Set<number> = new Set();
  showGlobalBulkPanel = false;


  // Detail view
  showDetailModal = false;
  detailModalData: {
    student?: StudentRow;
    date?: string;
    subjects?: Array<{
      subject_id: number;
      subject_name: string;
      status: string;
      notes?: string;
    }>;
  } = {};

  // Countdown timer modal
  showCountdownModal = false;
  countdown: CountdownTime = {
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0
  };
  countdownMessage: string = "";
  private countdownInterval: any;

  // Attendance status options
  readonly statusOptions = [
    { value: "P", label: "PRESENT", symbol: "✓" },
    { value: "A", label: "ABSENT", symbol: "A" },
    { value: "L", label: "LATE", symbol: "L" },
    { value: "E", label: "EXCUSED", symbol: "E" },
  ];

  // Submission state
  submitting = false;

  // Today's date
  public todayDate: string;

  private destroyRef = inject(DestroyRef);

  // Export dropdown state
  showExportMenu = false;

  toggleExportMenu(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showExportMenu = !this.showExportMenu;
  }
  
  closeExportMenu() {
    this.showExportMenu = false;
  }

  constructor(
    private attendanceService: AttendanceService,
    private subjectService: SubjectService,
    private classService: ClassService,
    private route: ActivatedRoute,
    private cdRef: ChangeDetectorRef,
    private telegramService: TelegramserviceService,
    public languageService: LanguageService,
    private exportService: AttendanceExportService,
    protected reportsService: ReportsService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {

    this.setCurrentWeek();
    this.todayDate = this.formatDate(new Date());
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.selectClass();
    }
  }

  selectClass(): void {
    this.classService.getAllClasses().subscribe({
      next: (res) => {
        this.classes = res.data;
        const queryClassId = this.route.snapshot.queryParamMap.get('class_id');
        if (queryClassId) {
           const foundClass = this.classes.find(c => c.class_id.toString() === queryClassId);
           if (foundClass) {
              this.selectedClassId = foundClass.class_id;
           } else if (this.classes.length > 0) {
              this.selectedClassId = this.classes[0].class_id;
           }
        } else if (this.classes.length > 0) {
           this.selectedClassId = this.classes[0].class_id;
        }

        if (this.selectedClassId) {
           this.loadWeeklyGrid();
        }
        this.cdRef.markForCheck();
      },
      error: (err) => {
        // console.error(err);
        this.error = 'Failed to load classes';
        this.cdRef.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCountdown();
  }

  /**
   * Check if a date is today
   */
  isToday(dateString: string): boolean {
    return dateString === this.todayDate;
  }

  /**
   * Check if a date is in the past
   */
  isPastDate(dateString: string): boolean {
    return dateString < this.todayDate;
  }

  /**
   * Check if a date is in the future
   */
  isFutureDate(dateString: string): boolean {
    return dateString > this.todayDate;
  }

  /**
   * Check if attendance editing is allowed for a specific date
   */
  isDateEditable(dateString: string): boolean {
    // Only allow editing for today
    return dateString === this.todayDate;
  }

  /**
   * Check if attendance already exists for a student on a date
   */
  hasExistingAttendance(student: StudentRow, date: string): boolean {
    const subjectData = student.subject_attendance?.[date];
    if (!subjectData || !subjectData.subjects || subjectData.subjects.length === 0) {
      return false;
    }
    
    const selectedSubjectId = this.selectedSubjects.get(date);
    if (!selectedSubjectId) return false;
    
    return subjectData.subjects.some(s => s.subject_id === selectedSubjectId);
  }

  /**
   * Get existing attendance status for a student
   */
  getExistingAttendanceStatus(student: StudentRow, date: string): string | null {
    const subjectData = student.subject_attendance?.[date];
    if (!subjectData || !subjectData.subjects) return null;
    
    const selectedSubjectId = this.selectedSubjects.get(date);
    if (!selectedSubjectId) return null;
    
    const subjectRecord = subjectData.subjects.find(s => s.subject_id === selectedSubjectId);
    return subjectRecord?.status || null;
  }

  /**
   * Calculate time remaining until midnight
   */
  private calculateTimeUntilMidnight(): CountdownTime {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds, totalSeconds };
  }

  /**
   * Calculate time remaining until a specific future date
   */
  private calculateTimeUntilDate(targetDate: string): CountdownTime {
    const now = new Date();
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    
    const diff = target.getTime() - now.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      hours: days * 24 + hours,
      minutes,
      seconds,
      totalSeconds
    };
  }

  /**
   * Start countdown timer
   */
  private startCountdown(targetDate?: string): void {
    this.stopCountdown();
    this.updateCountdown(targetDate);
    
    this.countdownInterval = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateCountdown(targetDate);
        this.cdRef.markForCheck();
      });
  }

  /**
   * Update countdown values
   */
  private updateCountdown(targetDate?: string): void {
    if (targetDate) {
      this.countdown = this.calculateTimeUntilDate(targetDate);
    } else {
      this.countdown = this.calculateTimeUntilMidnight();
    }
  }

  /**
   * Stop countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownInterval) {
      this.countdownInterval.unsubscribe();
      this.countdownInterval = null;
    }
  }

  /**
   * Show countdown modal with appropriate message
   */
  showCountdownTimerModal(date: string): void {
    if (this.isPastDate(date)) {
      this.countdownMessage = "This date has passed. You cannot edit past attendance records.";
      this.showCountdownModal = true;
      this.stopCountdown();
    } else if (this.isFutureDate(date)) {
      const targetDate = new Date(date);
      const formattedDate = targetDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      this.countdownMessage = `You can edit attendance for ${formattedDate} in:`;
      this.startCountdown(date);
      this.showCountdownModal = true;
    } else {
      this.countdownMessage = "Today's attendance can be edited until midnight. Time remaining:";
      this.startCountdown();
      this.showCountdownModal = true;
    }
  }

  /**
   * Close countdown modal
   */
  closeCountdownModal(): void {
    this.showCountdownModal = false;
    this.stopCountdown();
  }

  /**
   * Format countdown time for display
   */
  getCountdownDisplay(): string {
    const { hours, minutes, seconds } = this.countdown;
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m ${seconds}s`;
    }
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // ============================================================
  // GLOBAL SELECTION METHODS (Checkbox Column)
  // ============================================================

  /**
   * Toggle globally selected student
   */
  toggleGlobalStudentSelection(studentId: number): void {
    if (this.globalSelectedStudents.has(studentId)) {
      this.globalSelectedStudents.delete(studentId);
    } else {
      this.globalSelectedStudents.add(studentId);
    }
    this.showGlobalBulkPanel = this.globalSelectedStudents.size > 0;
  }

  /**
   * Check if student is globally selected
   */
  isStudentGloballySelected(studentId: number): boolean {
    return this.globalSelectedStudents.has(studentId);
  }

  /**
   * Select/Deselect all visible students
   */
  toggleGlobalSelectAll(event: any): void {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.getFilteredStudents().forEach(s => this.globalSelectedStudents.add(s.student_id));
    } else {
      this.globalSelectedStudents.clear();
    }
    this.showGlobalBulkPanel = this.globalSelectedStudents.size > 0;
  }
  
  /**
   * Get global selection count
   */
  getGlobalSelectionCount(): number {
    return this.globalSelectedStudents.size;
  }
  
  /**
   * Clear global selection
   */
  clearGlobalSelection(): void {
    this.globalSelectedStudents.clear();
    this.showGlobalBulkPanel = false;
  }

  /**
   * Apply status to globally selected students for a specific date
   */
  async applyGlobalBulkAction(status: string, date: string = this.todayDate): Promise<void> {
    if (this.globalSelectedStudents.size === 0) return;
    
    // Validate Date
    if (!this.isDateEditable(date)) {
       this.showCountdownTimerModal(date);
       return;
    }

      // Validate Subjects
    const subjects = this.getSubjectsForDate(date);
    if (subjects.length === 0) {
      Swal.fire({
        title: this.languageService.getTranslation('NO_SUBJECTS'),
        text: this.languageService.getTranslation('NO_SUBJECTS_MSG'),
        icon: "warning"
      });
      return;
    }

    // Confirm
    const result = await Swal.fire({
      title: this.languageService.getTranslation('CONFIRM_BULK_UPDATE'),
      text: `Mark ${this.globalSelectedStudents.size} student(s) as ${this.getStatusLabel(status)} for ${this.getFormattedDate(date)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.languageService.getTranslation('SUBMIT_CHANGES'), // Reusing submit/confirm
      cancelButtonText: this.languageService.getTranslation('CANCEL')
    });

    if (!result.isConfirmed) return;

    // Apply
    let updatedCount = 0;
    const students = this.gridData?.students || [];
    
    this.globalSelectedStudents.forEach(studentId => {
      const student = students.find(s => s.student_id === studentId);
      if (student) {
        subjects.forEach(subj => {
          const existingStatus = this.getSubjectStatus(student, date, subj.subject_id);
          // Only update if changed or new
          if (existingStatus !== status) {
             const key = this.getCellKey(studentId, date, subj.subject_id);
             this.pendingUpdates.set(key, {
                studentId,
                date,
                status: status,
                subjectId: subj.subject_id,
                previousStatus: existingStatus || undefined,
                isModification: !!existingStatus
             });
             updatedCount++;
          }
        });
      }
    });

    if (updatedCount > 0) {
      this.hasUnsavedChanges = true;
      Swal.fire({
        title: this.languageService.getTranslation('BULK_UPDATE_STAGED'),
        text: `${updatedCount} records staged for update. Click Submit to save.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      this.clearGlobalSelection();
    } else {
      Swal.fire(this.languageService.getTranslation('NO_CHANGES'), "All selected students already have this status.", "info");
    }
  }


  // ============================================================
  // FIXED: BULK SELECTION METHODS WITH PROPER COUNTING
  // ============================================================

  /**
   * FIXED: Toggle bulk selection mode for a specific date
   */
  toggleBulkSelection(date: string): void {
    if (!this.isDateEditable(date)) {
      this.showCountdownTimerModal(date);
      return;
    }

    const existingState = this.bulkSelectionMode.get(date);
    
    if (existingState?.isActive) {
      // Deactivate bulk selection
      this.bulkSelectionMode.delete(date);
      this.currentBulkDate = null;
      this.showBulkSelectionPanel = false;
      // console.log('Bulk selection deactivated for', date);
    } else {
      // Clear any other active bulk selections
      this.bulkSelectionMode.clear();
      
      // Activate bulk selection for this date
      const subjects = this.getSubjectsForDate(date);
      if (subjects.length === 0) {
        Swal.fire({
          title: this.languageService.getTranslation('NO_SUBJECTS'),
          text: this.languageService.getTranslation('NO_SUBJECTS_MSG'),
          icon: "warning",
          draggable: true,
        });
        return;
      }

      // FIXED: Create new Set to ensure reactivity
      const newState: BulkSelectionState = {
        date: date,
        selectedStatus: 'P', // Default to Present
        selectedStudents: new Set<number>(),
        isActive: true,
      };
      
      this.bulkSelectionMode.set(date, newState);
      this.currentBulkDate = date;
      this.showBulkSelectionPanel = true;
      
      // console.log('Bulk selection activated for', date, 'State:', newState);
    }
  }

  /**
   * Check if bulk selection is active for a date
   */
  isBulkSelectionActive(date: string): boolean {
    const isActive = this.bulkSelectionMode.get(date)?.isActive || false;
    // DEBUG: Uncomment to see which dates are active
    // if (isActive) console.log('Bulk selection is active for', date);
    return isActive;
  }

  /**
   * Get bulk selection state for a date
   */
  getBulkSelectionState(date: string): BulkSelectionState | undefined {
    return this.bulkSelectionMode.get(date);
  }

  /**
   * FIXED: Select all students for bulk attendance
   */
  selectAllStudents(date: string): void {
    const state = this.bulkSelectionMode.get(date);
    if (!state) {
      console.error('No bulk selection state found for date:', date);
      return;
    }

    const students = this.getFilteredStudents();
    console.log('Selecting all students:', students.length);
    
    // Clear and repopulate to ensure Set is updated
    state.selectedStudents.clear();
    students.forEach(student => {
      state.selectedStudents.add(student.student_id);
    });
    
    // Force update
    this.bulkSelectionMode.set(date, { ...state });
    
    console.log('Selected students count:', state.selectedStudents.size);
    console.log('Selected student IDs:', Array.from(state.selectedStudents));
  }

  /**
   * FIXED: Deselect all students
   */
  deselectAllStudents(date: string): void {
    const state = this.bulkSelectionMode.get(date);
    if (!state) {
      console.error('No bulk selection state found for date:', date);
      return;
    }
    
    console.log('Deselecting all students');
    state.selectedStudents.clear();
    
    // Force update
    this.bulkSelectionMode.set(date, { ...state });
    
    console.log('Selected students count after deselect:', state.selectedStudents.size);
  }

  /**
   * FIXED: Toggle individual student selection in bulk mode
   */
  toggleStudentSelection(date: string, studentId: number): void {
    const state = this.bulkSelectionMode.get(date);
    if (!state) {
      console.error('No bulk selection state found for date:', date);
      return;
    }

    console.log('Toggling student:', studentId);
    
    if (state.selectedStudents.has(studentId)) {
      state.selectedStudents.delete(studentId);
      console.log('Student removed:', studentId);
    } else {
      state.selectedStudents.add(studentId);
      console.log('Student added:', studentId);
    }
    
    // IMPORTANT: Force update to trigger change detection
    this.bulkSelectionMode.set(date, { ...state });
    
    console.log('Current selection count:', state.selectedStudents.size);
    console.log('Currently selected:', Array.from(state.selectedStudents));
  }

  /**
   * FIXED: Check if a student is selected in bulk mode
   */
  isStudentSelected(date: string, studentId: number): boolean {
    const state = this.bulkSelectionMode.get(date);
    const isSelected = state?.selectedStudents.has(studentId) || false;
    // DEBUG: Uncomment to trace selection
    // console.log('isStudentSelected:', studentId, '=', isSelected);
    return isSelected;
  }

  /**
   * FIXED: Get count of selected students with proper tracking
   */
  getSelectedStudentCount(date: string): number {
    const state = this.bulkSelectionMode.get(date);
    const count = state?.selectedStudents.size || 0;
    console.log('getSelectedStudentCount for', date, ':', count);
    return count;
  }

  /**
   * Apply bulk attendance update
   */
  async applyBulkAttendance(date: string): Promise<void> {
    const state = this.bulkSelectionMode.get(date);
    if (!state) {
      console.error('No bulk selection state found');
      return;
    }

    console.log('Applying bulk attendance. Selected count:', state.selectedStudents.size);

    if (state.selectedStudents.size === 0) {
      Swal.fire({
        title: this.languageService.getTranslation('NO_STUDENTS_SELECTED'),
        text: this.languageService.getTranslation('PLEASE_SELECT_ONE_STUDENT'),
        icon: "warning",
        draggable: true,
      });
      return;
    }

    const subjectId = this.selectedSubjects.get(date);
    if (!subjectId) {
      Swal.fire({
        title: this.languageService.getTranslation('NO_SUBJECT_SELECTED'),
        text: this.languageService.getTranslation('PLEASE_SELECT_SUBJECT'),
        icon: "error",
        draggable: true,
      });
      return;
    }

    // Iterate over all subjects for that date
    const subjects = this.getSubjectsForDate(date);
    if (subjects.length === 0) {
        Swal.fire({ title: "No subjects found", icon: "warning"});
        return;
    }

    // Count how many are new vs modifications
    let newRecords = 0;
    let modifications = 0;
    const students = this.getFilteredStudents();
    
    // Calculate stats
    state.selectedStudents.forEach(studentId => {
      const student = students.find(s => s.student_id === studentId);
      if (student) {
        subjects.forEach(subject => {
             const existingStatus = this.getSubjectStatus(student, date, subject.subject_id);
             if (existingStatus) {
                if (existingStatus !== state.selectedStatus) modifications++;
             } else {
                newRecords++;
             }
        });
      }
    });

    console.log('Bulk update breakdown - New:', newRecords, 'Modifications:', modifications);

    // Show confirmation with details
    let confirmMessage = `You are about to update ${state.selectedStudents.size} student(s) for ${subjects.length} subject(s):\n\n`;
    if (newRecords > 0) confirmMessage += `• ${newRecords} new record(s)\n`;
    if (modifications > 0) confirmMessage += `• ${modifications} existing record(s) will be changed\n`;
    confirmMessage += `\nAll will be marked as: ${this.getStatusLabel(state.selectedStatus)}`;

    const result = await Swal.fire({
      title: this.languageService.getTranslation('CONFIRM_BULK_UPDATE'),
      text: confirmMessage,
      icon: modifications > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update All',
      cancelButtonText: this.languageService.getTranslation('CANCEL'),
      draggable: true,
    });

    if (!result.isConfirmed) return;

    // Add all selected students to pending updates
    let updatedCount = 0;
    state.selectedStudents.forEach(studentId => {
      const student = students.find(s => s.student_id === studentId);
      if(student) {
          subjects.forEach(subject => {
             const existingStatus = this.getSubjectStatus(student, date, subject.subject_id);
             const key = this.getCellKey(studentId, date, subject.subject_id);
             this.pendingUpdates.set(key, {
                studentId,
                date,
                status: state.selectedStatus,
                subjectId: subject.subject_id,
                previousStatus: existingStatus || undefined,
                isModification: !!existingStatus,
             });
             updatedCount++;
          });
      }
    });

    console.log('Added to pending updates:', updatedCount);
    this.hasUnsavedChanges = true;

    Swal.fire({
      title: this.languageService.getTranslation('BULK_UPDATE_STAGED'),
      html: `<strong>${state.selectedStudents.size}</strong> student(s) marked as <strong>${this.getStatusLabel(state.selectedStatus)}</strong><br><br>${this.languageService.getTranslation('CLICK_SUBMIT_TO_SAVE')}`,
      icon: "success",
      draggable: true,
      timer: 2500,
      showConfirmButton: false,
    });

    // Clear bulk selection
    this.bulkSelectionMode.delete(date);
    this.currentBulkDate = null;
    this.showBulkSelectionPanel = false;
  }

  cancelBulkSelection(date: string): void {
    console.log('Cancelling bulk selection for', date);
    this.bulkSelectionMode.delete(date);
    this.currentBulkDate = null;
    this.showBulkSelectionPanel = false;
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? this.languageService.getTranslation(option.label) : status;
  }

  /**
   * Quick select all as Present
   */
  async quickSelectAllPresent(date: string): Promise<void> {
    if (!this.isDateEditable(date)) {
      this.showCountdownTimerModal(date);
      return;
    }

    const subjectId = this.selectedSubjects.get(date);
    if (!subjectId) {
      Swal.fire({
        title: "No Subject Selected",
        text: "Please select a subject for this date first.",
        icon: "warning",
        draggable: true,
      });
      return;
    }

    const subjects = this.getSubjectsForDate(date);
    if (subjects.length === 0) {
        Swal.fire({ title: "No subjects", icon: "warning"});
        return;
    }
    
    const students = this.getFilteredStudents();
    
    // Count modifications
    let newRecords = 0;
    let modifications = 0;
    
    students.forEach(student => {
       subjects.forEach(subject => {
          const existingStatus = this.getSubjectStatus(student, date, subject.subject_id);
          if (existingStatus) {
             if (existingStatus !== 'P') modifications++;
          } else {
             newRecords++;
          }
       });
    });

    let confirmMessage = `Mark all ${students.length} students as Present for ALL subjects?\n\n`;
    if (newRecords > 0) confirmMessage += `• ${newRecords} new record(s)\n`;
    if (modifications > 0) confirmMessage += `• ${modifications} existing record(s) will be changed`;

    const result = await Swal.fire({
      title: 'Mark All as Present?',
      text: confirmMessage,
      icon: modifications > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Mark All',
      cancelButtonText: 'Cancel',
      draggable: true,
    });

    if (!result.isConfirmed) return;

    students.forEach(student => {
      subjects.forEach(subject => {
          const existingStatus = this.getSubjectStatus(student, date, subject.subject_id);
          const key = this.getCellKey(student.student_id, date, subject.subject_id);
          this.pendingUpdates.set(key, {
            studentId: student.student_id,
            date,
            status: 'P',
            subjectId: subject.subject_id,
            previousStatus: existingStatus || undefined,
            isModification: !!existingStatus,
          });
      });
    });

    this.hasUnsavedChanges = true;

    Swal.fire({
      title: 'All Students Marked',
      html: `<strong>${students.length}</strong> students marked as Present<br><br>Click "Submit All" to save.`,
      icon: 'success',
      draggable: true,
      timer: 2000,
      showConfirmButton: false,
    });
  }

  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // ============================================================
  // STUDENT FILTERING AND SEARCH
  // ============================================================

  getFilteredStudents(): StudentRow[] {
    if (!this.gridData || !this.gridData.students) {
      return [];
    }
    return this.gridData.students;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadWeeklyGrid();
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.onSearch();
  }

  getSearchResultCount(): number {
    return this.getFilteredStudents().length;
  }

  highlightSearch(text: string): string {
    if (!this.searchQuery || !text) {
      return text;
    }

    const query = this.searchQuery.trim();
    if (!query) {
      return text;
    }

    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ============================================================
  // DATA LOADING AND MANAGEMENT
  // ============================================================

  onClassChange(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and load new data?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    if (this.startDate && this.endDate) {
      this.currentPage = 1;
      this.loadWeeklyGrid();
    }
  }

  onDateChange(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and load new data?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    if (this.startDate && this.endDate) {
      this.currentPage = 1;
      this.loadWeeklyGrid();
    }
  }

  setCurrentWeek(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    this.startDate = this.formatDate(monday);
    this.endDate = this.formatDate(saturday);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  loadWeeklyGrid(): void {
    if (!this.startDate || !this.endDate) {
      this.error = "Please select valid date range";
      return;
    }

    this.loading = true;
    this.error = null;
    
    this.clearInvalidPendingUpdates();

    this.attendanceService
      .getWeeklyGrid(
        this.startDate, 
        this.endDate, 
        this.selectedClassId, 
        this.currentPage, 
        this.pageSize,
        this.searchQuery
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (response) => {
          this.gridData = response.data;
          
          if (response.data.pagination) {
            this.totalStudents = response.data.pagination.total;
            this.totalPages = response.data.pagination.totalPages;
            this.currentPage = response.data.pagination.page;
          } else {
             this.totalStudents = this.gridData?.students?.length || 0;
             this.totalPages = 1;
          }

          this.processAttendanceData();
          this.loadSubjectsForDates();
          this.cdRef.markForCheck();
        },
        error: (err) => {
          this.error = err.error?.message || "Failed to load attendance data";
          // console.error("Error loading weekly grid:", err);
          this.cdRef.markForCheck();
        },
      });
  }

  processAttendanceData(): void {
    if (!this.gridData) return;
    if (!this.gridData.students) return;

    if (!this.gridData.overall_statistics) {
      this.gridData.overall_statistics = {
        total_students: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendance_rate: "0.0",
        recorded_days: 0,
      };
    }

    this.gridData.students.forEach((student) => {
      if (!student.subject_attendance) {
        student.subject_attendance = {};
      }

      if (!this.gridData?.period || !this.gridData.period.dates) {
        return;
      }

      this.gridData.period.dates.forEach((date) => {
        const subjectRecords: Array<{
          subject_id: number;
          subject_name: string;
          status: string;
          notes?: string;
        }> = [];

        const dayData = student.attendance[date];
        if (dayData && dayData.subjects) {
          const subjectsObj = dayData.subjects as {
            [key: string]: Array<{
              session: string;
              status: string;
              notes?: string;
            }>;
          };

          Object.keys(subjectsObj).forEach((subjectId: string) => {
            const subjectSessions = subjectsObj[subjectId];

            const subjectInfo = this.gridData?.subjects?.find(
              (s: any) => s.subject_id === parseInt(subjectId),
            );

            if (subjectSessions && Array.isArray(subjectSessions)) {
              subjectSessions.forEach(
                (session: {
                  session: string;
                  status: string;
                  notes?: string;
                }) => {
                  subjectRecords.push({
                    subject_id: parseInt(subjectId),
                    subject_name:
                      subjectInfo?.subject_name || `Subject ${subjectId}`,
                    status: session.status,
                    notes: session.notes || "",
                  });
                },
              );
            }
          });
        }

        let dailyStatus = "";

        if (subjectRecords.length > 0) {
          const hasAbsent = subjectRecords.some((r) => r.status === "A");
          const hasLate = subjectRecords.some((r) => r.status === "L");
          const hasExcused = subjectRecords.some((r) => r.status === "E");
          const allPresent = subjectRecords.every((r) => r.status === "P");

          if (hasAbsent) {
            dailyStatus = "A";
          } else if (hasLate) {
            dailyStatus = "L";
          } else if (hasExcused) {
            dailyStatus = "E";
          } else if (allPresent) {
            dailyStatus = "P";
          }
        }

        student.subject_attendance[date] = {
          subjects: subjectRecords,
          daily_status: dailyStatus,
        };
      });

      this.recalculateStudentStatistics(student);
    });

    this.calculateDailyStatistics();
  }

  recalculateStudentStatistics(student: StudentRow): void {
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let excusedDays = 0;
    let recordedDays = 0;

    let subjectAbsences = 0;
    let subjectLates = 0;
    let subjectExcused = 0;

    Object.values(student.subject_attendance).forEach((dayData) => {
      if (dayData.daily_status) {
        recordedDays++;

        switch (dayData.daily_status) {
          case "P":
            presentDays++;
            break;
          case "A":
            absentDays++;
            break;
          case "L":
            lateDays++;
            break;
          case "E":
            excusedDays++;
            break;
        }
      }

      dayData.subjects.forEach((subject) => {
        if (subject.status === "A") subjectAbsences++;
        if (subject.status === "L") subjectLates++;
        if (subject.status === "E") subjectExcused++;
      });
    });

    const totalDays = this.gridData?.period?.total_days || 0;
    const attendanceRate =
      recordedDays > 0
        ? ((presentDays / recordedDays) * 100).toFixed(1)
        : "0.0";

    student.statistics = {
      present: presentDays,
      absent: absentDays,
      late: lateDays,
      excused: excusedDays,
      total_days: totalDays,
      recorded_days: recordedDays,
      attendance_rate: attendanceRate,
      subject_absences: subjectAbsences,
      subject_lates: subjectLates,
      subject_excused: subjectExcused,
    };
  }

  calculateDailyStatistics(): void {
    if (!this.gridData || !this.gridData.period || !this.gridData.students) {
      return;
    }

    if (!this.gridData.daily_statistics) {
      this.gridData.daily_statistics = {};
    }

    this.gridData.period.dates.forEach((date) => {
      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;
      let total = 0;

      this.gridData!.students.forEach((student) => {
        const dailyStatus = student.subject_attendance?.[date]?.daily_status;
        if (dailyStatus) {
          total++;
          switch (dailyStatus) {
            case "P":
              present++;
              break;
            case "A":
              absent++;
              break;
            case "L":
              late++;
              break;
            case "E":
              excused++;
              break;
          }
        }
      });

      this.gridData!.daily_statistics[date] = {
        present,
        absent,
        late,
        excused,
        total,
        attendance_rate:
          total > 0 ? ((present / total) * 100).toFixed(1) + "%" : "0.0%",
      };
    });

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalRecorded = 0;

    this.gridData.students.forEach((student) => {
      totalPresent += student.statistics.present;
      totalAbsent += student.statistics.absent;
      totalLate += student.statistics.late;
      totalExcused += student.statistics.excused;
      totalRecorded += student.statistics.recorded_days;
    });

    this.gridData.overall_statistics = {
      total_students: this.gridData.students.length,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      excused: totalExcused,
      recorded_days: totalRecorded,
      attendance_rate:
        totalRecorded > 0
          ? ((totalPresent / totalRecorded) * 100).toFixed(1) + "%"
          : "0.0%",
    };
  }

  loadSubjectsForDates(): void {
    if (
      !this.gridData?.period?.dates ||
      this.gridData.period.dates.length === 0
    ) {
      return;
    }

    this.loadingSubjects = true;
    this.dateSubjects.clear();
    this.selectedSubjects.clear();

    const subjectRequests = this.gridData.period.dates.map((dateString) => {
      return this.subjectService.getSubjectsByDate(
        this.selectedClassId,
        dateString,
      );
    });

    forkJoin(subjectRequests)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingSubjects = false)),
      )
      .subscribe({
        next: (responses) => {
          responses.forEach((response, index) => {
            const date = this.gridData!.period.dates[index];
            const subjects = response.data || [];
            this.dateSubjects.set(date, subjects);

            if (subjects.length > 0) {
              this.selectedSubjects.set(date, subjects[0].subject_id);
            }
          });
          this.cdRef.markForCheck();
        },
        error: (err) => {
          // console.error("Failed to load subjects:", err);
          this.error = "Failed to load subjects for dates";
          this.cdRef.markForCheck();
        },
      });
  }

  getSubjectsForDate(date: string): Subject[] {
    return this.dateSubjects.get(date) || [];
  }

  getSelectedSubjectId(date: string): number | undefined {
    return this.selectedSubjects.get(date);
  }

  onSubjectChange(date: string, subjectId: number): void {
    this.selectedSubjects.set(date, subjectId);
    console.log(`Subject changed for ${date}: ${subjectId}`);
  }

  // ============================================================
  // ATTENDANCE CELL MANAGEMENT
  // ============================================================

  getStatusSymbol(status: string | null): string {
    if (!status) return "";
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.symbol || "";
  }

  getDailyStatus(student: StudentRow, date: string): string | null {
    // This method might be deprecated or used for summary.
    // If we need the single Subject status, we should use getSubjectStatus
    return student.subject_attendance?.[date]?.daily_status || null;
  }

  getSubjectStatus(student: StudentRow, date: string, subjectId: number): string | null {
      const key = this.getCellKey(student.student_id, date, subjectId);
      const pendingUpdate = this.pendingUpdates.get(key);
  
      if (pendingUpdate) {
        return pendingUpdate.status;
      }

      const subjects = student.subject_attendance?.[date]?.subjects || [];
      const subjectRecord = subjects.find(s => s.subject_id === subjectId);
      return subjectRecord?.status || null;
  }

  getStatusClass(status: string | null, date?: string): string {
    if (!status) return "status-empty";
    
    let baseClass = "";
    const statusMap: Record<string, string> = {
      P: "status-present",
      A: "status-absent",
      L: "status-late",
      E: "status-excused",
    };
    baseClass = statusMap[status] || "status-empty";
    
    if (date && !this.isDateEditable(date)) {
      baseClass += " status-disabled";
    }
    
    return baseClass;
  }

  getCellKey(studentId: number, date: string, subjectId: number): string {
    return `${studentId}-${date}-${subjectId}`;
  }

  isEditMode(studentId: number, date: string, subjectId: number): boolean {
    return this.editMode.get(this.getCellKey(studentId, date, subjectId)) || false;
  }

  hasPendingChanges(studentId: number, date: string, subjectId: number): boolean {
    const key = this.getCellKey(studentId, date, subjectId);
    return this.pendingUpdates.has(key);
  }

  /**
   * Handle cell click with modification awareness
   */
  onCellClick(studentId: number, date: string, subjectId: number): void {
    console.log('Cell clicked:', studentId, date, subjectId);

    // FIXED: Check bulk selection mode first
    if (this.isBulkSelectionActive(date)) {
      console.log('Cell clicked in bulk mode, toggling selection for student:', studentId);
      this.toggleStudentSelection(date, studentId);
      return;
    }

    if (!this.isDateEditable(date)) {
      console.log('Date not editable:', date);
      this.showCountdownTimerModal(date);
      return;
    }

    const key = this.getCellKey(studentId, date, subjectId);
    console.log('Setting edit mode for key:', key);

    // Clear other edit modes if needed, or allow multiple
    this.editMode.clear();

    this.selectedCell = { studentId, date }; 
    this.editMode.set(key, true);
  }

  showNoSubjectAlert(date: string): void {
      Swal.fire({
          title: this.languageService.getTranslation('NO_SUBJECT_SCHEDULED'),
          text: `${this.languageService.getTranslation('NO_SUBJECT_SCHEDULED_MSG')} ${this.getFormattedDate(date)}.`,
          icon: 'info'
      });
  }

  closeEditMode(studentId: number, date: string, subjectId: number): void {
    const key = this.getCellKey(studentId, date, subjectId);
    this.editMode.delete(key);
    // this.selectedCell = null; // Careful clearing this if we switch to multi-cell edit
  }

  /**
   * Stage attendance update with modification confirmation
   */
  async stageAttendanceUpdate(
    studentId: number,
    date: string,
    newStatus: string,
    subjectId: number
  ): Promise<void> {
    if (!this.isDateEditable(date)) {
      Swal.fire({
        title: this.languageService.getTranslation('INVALID_DATE'),
        text: this.languageService.getTranslation('ONLY_TODAY_EDIT'),
        icon: "error",
        draggable: true,
      });
      this.closeEditMode(studentId, date, subjectId);
      return;
    }

    if (!newStatus || newStatus === "") {
      this.closeEditMode(studentId, date, subjectId);
      return;
    }

    if (!["P", "A", "L", "E"].includes(newStatus)) {
      alert("Invalid attendance status");
      return;
    }

    const student = this.getFilteredStudents().find(s => s.student_id === studentId);
    if (!student) return;

    // Get specific subject status
    const existingStatus = this.getSubjectStatus(student, date, subjectId);
    
    // We can skip the confirmation dialog for individual cell clicks to make it faster
    // Or keep it if critical. For now, assuming speed is better as per "premium design" goals of flow.
    // But modification safety is good. Let's disable modification warning for single clicks for better UX?
    // User complaint "hard for user exp", so let's make it snappy.
    
    // However, logic requests keeping existing behavior.
    if (existingStatus && existingStatus !== newStatus) {
       // Optional: Add simple confirmation or just allow override
    }

    const key = this.getCellKey(studentId, date, subjectId);

    this.pendingUpdates.set(key, {
      studentId,
      date,
      status: newStatus,
      subjectId,
      previousStatus: existingStatus || undefined,
      isModification: !!existingStatus,
    });

    this.hasUnsavedChanges = true;
    this.closeEditMode(studentId, date, subjectId);
  }

  /**
   * Submit all with modification summary
   */
  async submitAllChanges(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      Swal.fire({
        title: this.languageService.getTranslation('NO_CHANGES'),
        text: this.languageService.getTranslation('NO_CHANGES_SUBMIT'),
        icon: "info",
        draggable: true,
      });
      return;
    }

    let hasInvalidDates = false;
    const invalidDates: string[] = [];
    
    this.pendingUpdates.forEach((update) => {
      if (!this.isDateEditable(update.date)) {
        hasInvalidDates = true;
        if (!invalidDates.includes(update.date)) {
          invalidDates.push(update.date);
        }
      }
    });

    if (hasInvalidDates) {
      Swal.fire({
        title: "Invalid Updates Detected",
        html: `You can only submit attendance for <strong>today (${this.getFormattedDate(this.todayDate)})</strong>.<br><br>Found updates for: ${invalidDates.map(d => this.getFormattedDate(d)).join(', ')}`,
        icon: "error",
        draggable: true,
      });
      return;
    }

    let newRecords = 0;
    let modifications = 0;
    this.pendingUpdates.forEach(update => {
      if (update.isModification) {
        modifications++;
      } else {
        newRecords++;
      }
    });

    let summaryHTML = '<div style="text-align: left; padding: 10px;">';
    summaryHTML += `<p><strong>Total Changes:</strong> ${this.pendingUpdates.size}</p>`;
    if (newRecords > 0) {
      summaryHTML += `<p>📝 <strong>${newRecords}</strong> new record(s)</p>`;
    }
    if (modifications > 0) {
      summaryHTML += `<p>✏️ <strong>${modifications}</strong> existing record(s) will be changed</p>`;
    }
    summaryHTML += '</div>';

    const result = await Swal.fire({
      title: 'Confirm Submission',
      html: summaryHTML,
      icon: modifications > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit All',
      cancelButtonText: 'Cancel',
      draggable: true,
    });

    if (result.isConfirmed) {
      this.performSubmission();
    }
  }

  private performSubmission(): void {
    this.submitting = true;

    const updates: any[] = [];

    this.pendingUpdates.forEach((update) => {
      updates.push({
        student_id: update.studentId,
        teacher_id: 1,
        subject_id: update.subjectId,
        attendance_date: update.date,
        status: update.status,
        force_update: true,
      });
    });

    const updateObservables = updates.map((data) =>
      this.attendanceService.createOrUpdateAttendance(data),
    );

    forkJoin(updateObservables)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          const totalUpdates = this.pendingUpdates.size;
          
          // Helper to format date for message
          const formatDate = (d: string) => {
             const dateObj = new Date(d);
             return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          };

          // Helper to get student name
          const getStudentName = (id: number) => {
            return this.gridData?.students?.find(s => s.student_id === id)?.student_name_eng || 'Unknown Student';
          };

          // Helper to get subject name
          const getSubjectName = (date: string, subjectId: number) => {
              const subjects = this.getSubjectsForDate(date);
              const subject = subjects.find(s => s.subject_id === subjectId);
              if (subject) return subject.subject_name;
              
              // Fallback to global subject list if available
              return this.gridData?.subjects?.find(s => s.subject_id === subjectId)?.subject_name || 'General';
          };

          // Group updates by date, subject, and status
          // Map<Date, Map<SubjectName, Map<Status, StudentName[]>>>
          const details = new Map<string, Map<string, Map<string, string[]>>>();
          
          this.pendingUpdates.forEach(u => {
              if (!details.has(u.date)) {
                  details.set(u.date, new Map<string, Map<string, string[]>>());
              }
              const subjectMap = details.get(u.date)!;
              const subjectName = getSubjectName(u.date, u.subjectId);

              if (!subjectMap.has(subjectName)) {
                  subjectMap.set(subjectName, new Map<string, string[]>());
              }
              const statusMap = subjectMap.get(subjectName)!;

              if (!statusMap.has(u.status)) {
                  statusMap.set(u.status, []);
              }
              statusMap.get(u.status)!.push(getStudentName(u.studentId));
          });

          // Use gridData for class name if available, otherwise fallback
          const className = this.gridData?.class?.class_name || 
                            this.classes.find(c => c.class_id === this.selectedClassId)?.class_code || 
                            'Unknown Class';

          let message = `📢 *Attendance Submitted*\n\n🏫 Class: *${className}*\n👥 Total Attendance: *${totalUpdates}*`;
          
          details.forEach((subjectMap, date) => {
              message += `\n\n📅 *${formatDate(date)}*`;
              
              subjectMap.forEach((statusMap, subjectName) => {
                 message += `\n\n📚 *${subjectName}*`;
                 
                 const appendStatusList = (status: string, emoji: string, label: string) => {
                    const students = statusMap.get(status);
                    if (students && students.length > 0) {
                        message += `\n${emoji} *${label} (${students.length}):*\n`;
                        students.forEach(name => message += `  - ${name}\n`);
                    }
                 };

                 appendStatusList('P', '✅', 'Present');
                 appendStatusList('A', '❌', 'Absent');
                 appendStatusList('L', '⏰', 'Late');
                 appendStatusList('E', '📝', 'Excused');
              });
          });

          this.telegramService.sendMessage(message).subscribe({
              error: err => console.error('Telegram notification failed', err)
          });

          this.pendingUpdates.clear();
          this.hasUnsavedChanges = false;
          
          // ... telegram logic ...

          this.loadWeeklyGrid();
 
           Swal.fire({
             title: this.languageService.getTranslation('SUCCESS'),
             html: `<strong>${totalUpdates}</strong> ${this.languageService.getTranslation('ATTENDANCE_UPDATED')}`,
             icon: "success",
             draggable: true,
             timer: 2500,
             showConfirmButton: false,
           });
         },
         error: (err) => {
           console.error("Failed to update attendance:", err);
           Swal.fire({
             title: this.languageService.getTranslation('SUBMISSION_FAILED'),
             text: err.error?.message || this.languageService.getTranslation('FAILED_UPDATE'),
             icon: "error",
             draggable: true,
           });
         },
      });
  }

  clearInvalidPendingUpdates(): void {
    const keysToDelete: string[] = [];
    
    this.pendingUpdates.forEach((update, key) => {
      if (!this.isDateEditable(update.date)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.pendingUpdates.delete(key));
    
    if (this.pendingUpdates.size === 0) {
      this.hasUnsavedChanges = false;
    }
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadWeeklyGrid();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadWeeklyGrid();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadWeeklyGrid();
  }
  
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadWeeklyGrid();
  }

  cancelAllChanges(): void {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    Swal.fire({
  title: this.languageService.getTranslation('ARE_YOU_SURE'),
  text: this.languageService.getTranslation('DISCARD_CHANGES_MSG'), 
  icon: "warning",
  showCancelButton: true,
  confirmButtonColor: "#3085d6",
  cancelButtonColor: "#d33",
  confirmButtonText: "Yes, Cancel it!"
}).then((result) => {
  if (result.isConfirmed) {
    Swal.fire({
      title: this.languageService.getTranslation('CANCELLED'),
      text: this.languageService.getTranslation('CHANGES_CANCELLED'),
      icon: "success"
    });
     this.pendingUpdates.clear();
  }
});

   
    this.hasUnsavedChanges = false;
    this.editMode.clear();
    this.selectedCell = null;
  }

  removePendingUpdate(studentId: number, date: string, subjectId: number): void {
    const key = this.getCellKey(studentId, date, subjectId);
    this.pendingUpdates.delete(key);

    if (this.pendingUpdates.size === 0) {
      this.hasUnsavedChanges = false;
    }
  }

  // ============================================================
  // DETAIL MODAL
  // ============================================================

  showAttendanceDetail(student: StudentRow, date: string): void {
    this.detailModalData = {
      student: student,
      date: date,
      subjects: student.subject_attendance?.[date]?.subjects || [],
    };
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailModalData = {};
  }

  hasMultipleSubjectRecords(student: StudentRow, date: string): boolean {
    const subjects = student.subject_attendance?.[date]?.subjects || [];
    return subjects.length > 1;
  }

  getAbsentSubjectCount(student: StudentRow, date: string): number {
    const subjects = student.subject_attendance?.[date]?.subjects || [];
    return subjects.filter((s) => s.status === "A").length;
  }

  getDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}\n${month}/${dateNum}`;
  }

  async exportSummaryReport(): Promise<void> {
    if (!this.gridData) return;
    const selectedClass = this.classes.find(c => c.class_id == this.selectedClassId);
    const className = selectedClass ? selectedClass.class_code : 'Unknown Class';
    await this.exportService.exportSummaryReport(this.gridData, this.startDate, className);
  }

  async exportDetailedReport(): Promise<void> {
    if (!this.gridData) return;
    const selectedClass = this.classes.find(c => c.class_id == this.selectedClassId);
    const className = selectedClass ? selectedClass.class_code : 'Unknown Class';
    await this.exportService.exportDetailedReport(this.gridData, this.startDate, this.endDate, this.dateSubjects, className);
  }

  exportToCSV(): void {
    this.exportDetailedReport();
  }

  print(): void {
    window.print();
  }

  downloadPDF(): void {
    if (this.gridData) {
      this.reportsService.generateWeeklyAttendancePDF(this.gridData);
    }
  }

  previousWeek(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and continue?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.loadWeeklyGrid();
  }

  nextWeek(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and continue?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.loadWeeklyGrid();
  }

  getGenderIconClass(gender: string): string {
    return gender === "M"
      ? "bi bi-gender-male text-primary"
      : "bi bi-gender-female text-danger";
  }

  getCellTitle(dateString: string, student: StudentRow, subjectId: number): string {
    if (!this.isDateEditable(dateString)) {
      if (this.isPastDate(dateString)) {
        return "Past date - Read Only";
      } else if (this.isFutureDate(dateString)) {
        return "Future date - Locked";
      }
    }

    const key = this.getCellKey(student.student_id, dateString, subjectId);
    const pendingUpdate = this.pendingUpdates.get(key);

    if (pendingUpdate) {
      if (pendingUpdate.isModification && pendingUpdate.previousStatus) {
        return `Changing: ${this.getStatusLabel(pendingUpdate.previousStatus)} → ${this.getStatusLabel(pendingUpdate.status)}`;
      }
      return `New: ${this.getStatusLabel(pendingUpdate.status)}`;
    }
    
    // Let's get "committed" status from data model directly for the "Current" part
    const subjects = student.subject_attendance?.[dateString]?.subjects || [];
    const subjectRecord = subjects.find(s => s.subject_id === subjectId);
    if (subjectRecord) {
        return `Current: ${this.getStatusLabel(subjectRecord.status)}${subjectRecord.notes ? ' (' + subjectRecord.notes + ')' : ''}`;
    }

    return "Click to mark attendance";
  }

  getAttendanceRateColor(rate: string | null | undefined): string {
    if (!rate) return "text-muted";
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum)) return "text-muted";
    if (rateNum >= 90) return "text-success";
    if (rateNum >= 75) return "text-warning";
    return "text-danger";
  }

  refresh(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and refresh?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    this.loadWeeklyGrid();
  }

  resetToCurrentWeek(): void {
    if (this.hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them and reset?")) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    this.setCurrentWeek();
    this.loadWeeklyGrid();
  }
  trackByStudent(index: number, student: StudentRow): number {
    return student.student_id;
  }

  trackByDate(index: number, date: string): string {
    return date;
  }

  trackBySubject(index: number, subject: Subject): number {
    return subject.subject_id;
  }
}