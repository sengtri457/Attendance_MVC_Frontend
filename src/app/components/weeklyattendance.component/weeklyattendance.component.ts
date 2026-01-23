import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AttendanceService } from "../../services/attendnaceservice/attendance.service";
import { forkJoin, Subject as RxSubject, interval } from "rxjs";
import { takeUntil, finalize } from "rxjs/operators";
import { environment } from '../../../env/enviroment';
import {
  SubjectService,
} from "../../services/subjectservice/subject.service";
import Swal from "sweetalert2";
import { Subject } from "../../models/Subject.model";
import { RouterLink } from "@angular/router";

interface AttendanceData {
  subjects?: {
    [subjectId: string]: Array<{
      session: string;
      status: string;
      notes?: string;
    }>;
  };
  summary?: {
    P: number;
    A: number;
    L: number;
    E: number;
    total: number;
  };
}

interface StudentRow {
  row_number: number;
  student_id: number;
  student_name_kh: string;
  student_name_eng: string;
  gender: string;
  attendance: { [date: string]: AttendanceData };
  subject_attendance: {
    [date: string]: {
      subjects: Array<{
        subject_id: number;
        subject_name: string;
        status: string;
        notes?: string;
      }>;
      daily_status: string;
    };
  };
  statistics: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total_days: number;
    recorded_days: number;
    attendance_rate: string;
    subject_absences: number;
    subject_lates: number;
    subject_excused: number;
  };
}

interface WeeklyGridData {
  class: {
    class_id: number;
    class_name: string;
  };
  period: {
    start_date: string;
    end_date: string;
    dates: string[];
    total_days: number;
  };
  subjects?: Array<{
    subject_id: number;
    subject_name: string;
  }>;
  students: StudentRow[];
  daily_statistics: Record<string, any>;
  overall_statistics?: {
    total_students?: number;
    present?: number;
    absent?: number;
    late?: number;
    excused?: number;
    attendance_rate?: string;
    recorded_days?: number;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PendingUpdate {
  studentId: number;
  date: string;
  status: string;
  subjectId: number;
  previousStatus?: string;
  isModification: boolean;
}

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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./weeklyattendance.component.html",
  styleUrl: "./weeklyattendance.component.css",
})
export class WeeklyattendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new RxSubject<void>();

  gridData: WeeklyGridData | null = null;
  loading = false;
  error: string | null = null;

  // Filters
  selectedClassId: number = 1;
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
    { value: "P", label: "Present", symbol: "✓" },
    { value: "A", label: "Absent", symbol: "A" },
    { value: "L", label: "Late", symbol: "L" },
    { value: "E", label: "Excused", symbol: "E" },
  ];

  // Submission state
  submitting = false;

  // Today's date
  private todayDate: string;

  constructor(
    private attendanceService: AttendanceService,
    private subjectService: SubjectService,
  ) {
    this.setCurrentWeek();
    this.todayDate = this.formatDate(new Date());
  }

  ngOnInit(): void {
    this.loadWeeklyGrid();
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
    return this.isToday(dateString);
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
      console.log('Bulk selection deactivated for', date);
    } else {
      // Clear any other active bulk selections
      this.bulkSelectionMode.clear();
      
      // Activate bulk selection for this date
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
      
      console.log('Bulk selection activated for', date, 'State:', newState);
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
        title: "No Students Selected",
        text: "Please select at least one student.",
        icon: "warning",
        draggable: true,
      });
      return;
    }

    const subjectId = this.selectedSubjects.get(date);
    if (!subjectId) {
      Swal.fire({
        title: "No Subject Selected",
        text: "Please select a subject for this date.",
        icon: "error",
        draggable: true,
      });
      return;
    }

    // Count how many are new vs modifications
    let newRecords = 0;
    let modifications = 0;
    const students = this.getFilteredStudents();
    
    state.selectedStudents.forEach(studentId => {
      const student = students.find(s => s.student_id === studentId);
      if (student) {
        const existingStatus = this.getExistingAttendanceStatus(student, date);
        if (existingStatus) {
          if (existingStatus !== state.selectedStatus) {
            modifications++;
          }
        } else {
          newRecords++;
        }
      }
    });

    console.log('Bulk update breakdown - New:', newRecords, 'Modifications:', modifications);

    // Show confirmation with details
    let confirmMessage = `You are about to update ${state.selectedStudents.size} student(s):\n\n`;
    if (newRecords > 0) confirmMessage += `• ${newRecords} new record(s)\n`;
    if (modifications > 0) confirmMessage += `• ${modifications} existing record(s) will be changed\n`;
    confirmMessage += `\nAll will be marked as: ${this.getStatusLabel(state.selectedStatus)}`;

    const result = await Swal.fire({
      title: 'Confirm Bulk Update',
      text: confirmMessage,
      icon: modifications > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update All',
      cancelButtonText: 'Cancel',
      draggable: true,
    });

    if (!result.isConfirmed) return;

    // Add all selected students to pending updates
    let updatedCount = 0;
    state.selectedStudents.forEach(studentId => {
      const student = students.find(s => s.student_id === studentId);
      const existingStatus = student ? this.getExistingAttendanceStatus(student, date) : null;
      
      const key = this.getCellKey(studentId, date);
      this.pendingUpdates.set(key, {
        studentId,
        date,
        status: state.selectedStatus,
        subjectId,
        previousStatus: existingStatus || undefined,
        isModification: !!existingStatus,
      });
      updatedCount++;
    });

    console.log('Added to pending updates:', updatedCount);
    this.hasUnsavedChanges = true;

    Swal.fire({
      title: "Bulk Update Staged",
      html: `<strong>${state.selectedStudents.size}</strong> student(s) marked as <strong>${this.getStatusLabel(state.selectedStatus)}</strong><br><br>Click "Submit All" to save changes.`,
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
    return option?.label || status;
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

    const students = this.getFilteredStudents();
    
    // Count modifications
    let newRecords = 0;
    let modifications = 0;
    students.forEach(student => {
      const existingStatus = this.getExistingAttendanceStatus(student, date);
      if (existingStatus) {
        if (existingStatus !== 'P') modifications++;
      } else {
        newRecords++;
      }
    });

    let confirmMessage = `Mark all ${students.length} students as Present?\n\n`;
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
      const existingStatus = this.getExistingAttendanceStatus(student, date);
      const key = this.getCellKey(student.student_id, date);
      this.pendingUpdates.set(key, {
        studentId: student.student_id,
        date,
        status: 'P',
        subjectId,
        previousStatus: existingStatus || undefined,
        isModification: !!existingStatus,
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
        },
        error: (err) => {
          this.error = err.error?.message || "Failed to load attendance data";
          console.error("Error loading weekly grid:", err);
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
        },
        error: (err) => {
          console.error("Failed to load subjects:", err);
          this.error = "Failed to load subjects for dates";
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
    const key = this.getCellKey(student.student_id, date);
    const pendingUpdate = this.pendingUpdates.get(key);

    if (pendingUpdate) {
      return pendingUpdate.status;
    }

    return student.subject_attendance?.[date]?.daily_status || null;
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

  getCellKey(studentId: number, date: string): string {
    return `${studentId}-${date}`;
  }

  isEditMode(studentId: number, date: string): boolean {
    return this.editMode.get(this.getCellKey(studentId, date)) || false;
  }

  hasPendingChanges(studentId: number, date: string): boolean {
    const key = this.getCellKey(studentId, date);
    return this.pendingUpdates.has(key);
  }

  /**
   * Handle cell click with modification awareness
   */
  onCellClick(studentId: number, date: string): void {
    // FIXED: Check bulk selection mode first
    if (this.isBulkSelectionActive(date)) {
      console.log('Cell clicked in bulk mode, toggling selection for student:', studentId);
      this.toggleStudentSelection(date, studentId);
      return;
    }

    if (!this.isDateEditable(date)) {
      this.showCountdownTimerModal(date);
      return;
    }

    const key = this.getCellKey(studentId, date);

    this.editMode.clear();

    this.selectedCell = { studentId, date };
    this.editMode.set(key, true);
  }

  closeEditMode(studentId: number, date: string): void {
    const key = this.getCellKey(studentId, date);
    this.editMode.delete(key);
    this.selectedCell = null;
  }

  /**
   * Stage attendance update with modification confirmation
   */
  async stageAttendanceUpdate(
    studentId: number,
    date: string,
    newStatus: string,
  ): Promise<void> {
    if (!this.isDateEditable(date)) {
      Swal.fire({
        title: "Invalid Date",
        text: "You can only update attendance for today.",
        icon: "error",
        draggable: true,
      });
      this.closeEditMode(studentId, date);
      return;
    }

    if (!newStatus || newStatus === "") {
      this.closeEditMode(studentId, date);
      return;
    }

    if (!["P", "A", "L", "E"].includes(newStatus)) {
      alert("Invalid attendance status");
      return;
    }

    const subjectId = this.selectedSubjects.get(date);
    if (!subjectId) {
      alert("Please select a subject for this date");
      this.closeEditMode(studentId, date);
      return;
    }

    const student = this.getFilteredStudents().find(s => s.student_id === studentId);
    const existingStatus = student ? this.getExistingAttendanceStatus(student, date) : null;
    
    if (existingStatus && existingStatus !== newStatus) {
      const result = await Swal.fire({
        title: 'Change Existing Attendance?',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>Student:</strong> ${student?.student_name_eng || 'Unknown'}</p>
            <p><strong>Date:</strong> ${this.getFormattedDate(date)}</p>
            <p><strong>Current Status:</strong> <span class="badge bg-info">${this.getStatusLabel(existingStatus)}</span></p>
            <p><strong>New Status:</strong> <span class="badge bg-warning">${this.getStatusLabel(newStatus)}</span></p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Change It',
        cancelButtonText: 'Cancel',
        draggable: true,
      });

      if (!result.isConfirmed) {
        this.closeEditMode(studentId, date);
        return;
      }
    }

    const key = this.getCellKey(studentId, date);

    this.pendingUpdates.set(key, {
      studentId,
      date,
      status: newStatus,
      subjectId,
      previousStatus: existingStatus || undefined,
      isModification: !!existingStatus,
    });

    this.hasUnsavedChanges = true;
    this.closeEditMode(studentId, date);

    if (existingStatus) {
      Swal.fire({
        title: 'Change Staged',
        html: `${this.getStatusLabel(existingStatus)} → ${this.getStatusLabel(newStatus)}`,
        icon: 'info',
        timer: 1500,
        showConfirmButton: false,
        draggable: true,
      });
    }
  }

  /**
   * Submit all with modification summary
   */
  async submitAllChanges(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      Swal.fire({
        title: "No Changes",
        text: "No changes to submit",
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
          this.pendingUpdates.clear();
          this.hasUnsavedChanges = false;
          this.loadWeeklyGrid();

          Swal.fire({
            title: "Success!",
            html: `<strong>${totalUpdates}</strong> attendance record(s) updated successfully!`,
            icon: "success",
            draggable: true,
            timer: 2500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          console.error("Failed to update attendance:", err);
          Swal.fire({
            title: "Submission Failed",
            text: err.error?.message || "Failed to update attendance. Please try again.",
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

    if (!confirm(`Discard ${this.pendingUpdates.size} unsaved change(s)?`)) {
      return;
    }

    this.pendingUpdates.clear();
    this.hasUnsavedChanges = false;
    this.editMode.clear();
    this.selectedCell = null;
  }

  removePendingUpdate(studentId: number, date: string): void {
    const key = this.getCellKey(studentId, date);
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

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  getDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}\n${month}/${dateNum}`;
  }

  exportToExcel(): void {
    const url = `${environment.apiUrl}/attendance/export/weekly-excel?start_date=${this.startDate}&end_date=${this.endDate}&class_id=${this.selectedClassId}`;
    window.open(url, "_blank");
  }

  exportToCSV(): void {
    this.exportToExcel();
  }

  print(): void {
    window.print();
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

  getCellTitle(dateString: string, student: StudentRow): string {
    if (!this.isDateEditable(dateString)) {
      if (this.isPastDate(dateString)) {
        return "Past date - Click to see time remaining";
      } else if (this.isFutureDate(dateString)) {
        return "Future date - Click to see countdown";
      }
    }

    const key = this.getCellKey(student.student_id, dateString);
    const pendingUpdate = this.pendingUpdates.get(key);

    if (pendingUpdate) {
      if (pendingUpdate.isModification && pendingUpdate.previousStatus) {
        return `Changing: ${this.getStatusLabel(pendingUpdate.previousStatus)} → ${this.getStatusLabel(pendingUpdate.status)} (click to edit or submit to save)`;
      }
      return `New: ${this.getStatusLabel(pendingUpdate.status)} (click to edit or submit to save)`;
    }

    const existingStatus = this.getExistingAttendanceStatus(student, dateString);
    if (existingStatus) {
      return `Current: ${this.getStatusLabel(existingStatus)} - Click to change`;
    }

    const subjectData = student.subject_attendance?.[dateString];
    if (
      !subjectData ||
      !subjectData.subjects ||
      subjectData.subjects.length === 0
    ) {
      return "Click to mark attendance";
    }

    if (subjectData.subjects.length === 1) {
      return subjectData.subjects[0].notes || "Click to edit";
    }

    const absentCount = subjectData.subjects.filter(
      (s) => s.status === "A",
    ).length;
    if (absentCount > 0) {
      return `Absent in ${absentCount}/${subjectData.subjects.length} subjects. Click for details.`;
    }

    return `${subjectData.subjects.length} subjects recorded. Click for details.`;
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
}