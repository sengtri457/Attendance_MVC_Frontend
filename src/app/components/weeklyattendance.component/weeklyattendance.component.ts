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
  // Store all subject-level attendance records for detailed view
  subject_attendance: {
    [date: string]: {
      subjects: Array<{
        subject_id: number;
        subject_name: string;
        status: string;
        notes?: string;
      }>;
      daily_status: string; // Overall status for the day (if ANY subject is A, this is A)
    };
  };
  statistics: {
    present: number; // Days with ALL subjects present
    absent: number; // Days with AT LEAST ONE subject absent
    late: number; // Days with ANY late (but no absent)
    excused: number; // Days with ANY excused (but no absent/late)
    total_days: number;
    recorded_days: number;
    attendance_rate: string;
    // New detailed statistics
    subject_absences: number; // Total subject-level absences
    subject_lates: number; // Total subject-level lates
    subject_excused: number; // Total subject-level excused
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
}

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

@Component({
  selector: "app-weeklyattendance.component",
  imports: [CommonModule, FormsModule],
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
  Math = Math; // for template usage

  // Subject management
  dateSubjects: Map<string, Subject[]> = new Map();
  selectedSubjects: Map<string, number> = new Map();
  loadingSubjects = false;

  // Editing with pending updates
  editMode: Map<string, boolean> = new Map();
  selectedCell: { studentId: number; date: string } | null = null;
  pendingUpdates: Map<string, PendingUpdate> = new Map();
  hasUnsavedChanges = false;

  // Detail view for showing subject-level absences
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

  // Today's date for comparison (YYYY-MM-DD format)
  private todayDate: string;

  constructor(
    private attendanceService: AttendanceService,
    private subjectService: SubjectService,
  ) {
    this.setCurrentWeek();
    // Initialize today's date
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
   * Check if a date is in the past (before today)
   */
  isPastDate(dateString: string): boolean {
    return dateString < this.todayDate;
  }

  /**
   * Check if a date is in the future (after today)
   */
  isFutureDate(dateString: string): boolean {
    return dateString > this.todayDate;
  }

  /**
   * Check if attendance editing is allowed for a specific date
   * Only today's date is editable
   */
  isDateEditable(dateString: string): boolean {
    return this.isToday(dateString);
  }

  /**
   * Calculate time remaining until midnight (start of next day)
   */
  private calculateTimeUntilMidnight(): CountdownTime {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0); // Set to midnight of next day
    
    const diff = tomorrow.getTime() - now.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      hours,
      minutes,
      seconds,
      totalSeconds
    };
  }

  /**
   * Calculate time remaining until a specific future date
   */
  private calculateTimeUntilDate(targetDate: string): CountdownTime {
    const now = new Date();
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0); // Set to start of target day
    
    const diff = target.getTime() - now.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      hours: days * 24 + hours, // Convert days to hours
      minutes,
      seconds,
      totalSeconds
    };
  }

  /**
   * Start countdown timer
   */
  private startCountdown(targetDate?: string): void {
    this.stopCountdown(); // Clear any existing interval
    
    // Update countdown immediately
    this.updateCountdown(targetDate);
    
    // Then update every second
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
      this.stopCountdown(); // No countdown for past dates
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
      // Today - show time until midnight
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

  /**
   * Get filtered students based on search query
   */
  getFilteredStudents(): StudentRow[] {
    if (!this.gridData || !this.gridData.students) {
      return [];
    }
    // Server-side filtering is now used
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

  /**
   * Get search result count
   */
  getSearchResultCount(): number {
    return this.getFilteredStudents().length;
  }

  /**
   * Highlight search query in text
   */
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

  /**
   * Handle class selection change - auto load grid
   */
  onClassChange(): void {
    if (this.hasUnsavedChanges) {
      if (
        !confirm("You have unsaved changes. Discard them and load new data?")
      ) {
        // Revert selection - need to store previous value
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    if (this.startDate && this.endDate) {
      this.currentPage = 1; // Reset to page 1 on class change
      this.loadWeeklyGrid();
    }
  }

  /**
   * Handle date change - auto load grid when both dates are set
   */
  onDateChange(): void {
    if (this.hasUnsavedChanges) {
      if (
        !confirm("You have unsaved changes. Discard them and load new data?")
      ) {
        return;
      }
      this.pendingUpdates.clear();
      this.hasUnsavedChanges = false;
    }

    // Only auto-load if both dates are set
    if (this.startDate && this.endDate) {
      this.currentPage = 1; // Reset to page 1 on date change
      this.loadWeeklyGrid();
    }
  }

  /**
   * Set date range to current week (Monday to Saturday)
   */
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

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Load weekly attendance grid data
   */
  loadWeeklyGrid(): void {
    if (!this.startDate || !this.endDate) {
      this.error = "Please select valid date range";
      return;
    }

    this.loading = true;
    this.error = null;

    this.attendanceService
      .getWeeklyGrid(
        this.startDate, 
        this.endDate, 
        this.selectedClassId, 
        this.currentPage, 
        this.pageSize,
        this.searchQuery // Pass search query
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (response) => {
          this.gridData = response.data;
          
          // Handle pagination
          if (response.data.pagination) {
            this.totalStudents = response.data.pagination.total;
            this.totalPages = response.data.pagination.totalPages;
            this.currentPage = response.data.pagination.page;
          } else {
             // Fallback if backend doesn't return pagination yet
             this.totalStudents = this.gridData?.students?.length || 0;
             this.totalPages = 1;
          }

          // Process the data to calculate daily attendance status
          this.processAttendanceData();
          this.loadSubjectsForDates();
        },
        error: (err) => {
          this.error = err.error?.message || "Failed to load attendance data";
          console.error("Error loading weekly grid:", err);
        },
      });
  }

  /**
   * Process attendance data to implement daily absence logic
   */
  processAttendanceData(): void {
    if (!this.gridData) return;
    if (!this.gridData.students) return;

    // Initialize overall_statistics if not present
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
      // Initialize subject_attendance if not present
      if (!student.subject_attendance) {
        student.subject_attendance = {};
      }

      // Group attendance by date and calculate daily status
      const dateMap = new Map<
        string,
        Array<{
          subject_id: number;
          subject_name: string;
          status: string;
          notes?: string;
        }>
      >();

      // Process attendance data from API
      // Your API returns: attendance[date] = { subjects: {...}, summary: {...} }
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

        // Get all subject attendance for this date
        const dayData = student.attendance[date];
        if (dayData && dayData.subjects) {
          const subjectsObj = dayData.subjects as {
            [key: string]: Array<{
              session: string;
              status: string;
              notes?: string;
            }>;
          };

          // Iterate through subjects object
          Object.keys(subjectsObj).forEach((subjectId: string) => {
            const subjectSessions = subjectsObj[subjectId];

            // Get subject name from the subjects list in gridData
            const subjectInfo = this.gridData?.subjects?.find(
              (s: any) => s.subject_id === parseInt(subjectId),
            );

            // Process each session for this subject
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

        // Calculate daily status based on priority:
        // 1. If ANY subject is Absent (A) -> Day is Absent
        // 2. Else if ANY subject is Late (L) -> Day is Late
        // 3. Else if ANY subject is Excused (E) -> Day is Excused
        // 4. Else if ALL subjects are Present (P) -> Day is Present
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

      // Recalculate statistics based on daily status
      this.recalculateStudentStatistics(student);
    });

    // Calculate daily statistics for footer
    this.calculateDailyStatistics();
  }

  /**
   * Recalculate student statistics based on daily attendance logic
   */
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

      // Count subject-level absences for detailed statistics
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

  /**
   * Calculate daily statistics for the footer
   */
  calculateDailyStatistics(): void {
    if (!this.gridData || !this.gridData.period || !this.gridData.students) {
      return;
    }

    // Initialize daily_statistics if not present
    if (!this.gridData.daily_statistics) {
      this.gridData.daily_statistics = {};
    }

    // Calculate statistics for each date
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

    // Calculate overall statistics
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

  /**
   * Load subjects for all dates in the grid
   */
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

            // Set first subject as default if available
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

  /**
   * Get subjects for a specific date
   */
  getSubjectsForDate(date: string): Subject[] {
    return this.dateSubjects.get(date) || [];
  }

  /**
   * Get selected subject ID for a date
   */
  getSelectedSubjectId(date: string): number | undefined {
    return this.selectedSubjects.get(date);
  }

  /**
   * Handle subject change for a date (NO auto-refresh)
   */
  onSubjectChange(date: string, subjectId: number): void {
    this.selectedSubjects.set(date, subjectId);
    console.log(`Subject changed for ${date}: ${subjectId}`);
  }

  /**
   * Get display symbol for attendance status (daily status)
   */
  getStatusSymbol(status: string | null): string {
    if (!status) return "";
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.symbol || "";
  }

  /**
   * Get daily attendance status for a student on a specific date
   */
  getDailyStatus(student: StudentRow, date: string): string | null {
    // Check if there's a pending update for this cell
    const key = this.getCellKey(student.student_id, date);
    const pendingUpdate = this.pendingUpdates.get(key);

    if (pendingUpdate) {
      return pendingUpdate.status;
    }

    return student.subject_attendance?.[date]?.daily_status || null;
  }

  /**
   * Get CSS class for attendance status
   */
  getStatusClass(status: string | null, date?: string): string {
    if (!status) return "status-empty";
    
    // Add disabled class for non-editable dates
    let baseClass = "";
    const statusMap: Record<string, string> = {
      P: "status-present",
      A: "status-absent",
      L: "status-late",
      E: "status-excused",
    };
    baseClass = statusMap[status] || "status-empty";
    
    // Add disabled class if date is provided and not editable
    if (date && !this.isDateEditable(date)) {
      baseClass += " status-disabled";
    }
    
    return baseClass;
  }

  /**
   * Generate unique key for cell
   */
  getCellKey(studentId: number, date: string): string {
    return `${studentId}-${date}`;
  }

  /**
   * Check if cell is in edit mode
   */
  isEditMode(studentId: number, date: string): boolean {
    return this.editMode.get(this.getCellKey(studentId, date)) || false;
  }

  /**
   * Check if cell has pending changes
   */
  hasPendingChanges(studentId: number, date: string): boolean {
    const key = this.getCellKey(studentId, date);
    return this.pendingUpdates.has(key);
  }

  /**
   * Handle cell click to enable editing
   * UPDATED: Show countdown modal for non-editable dates
   */
  onCellClick(studentId: number, date: string): void {
    // Show countdown modal if date is not editable
    if (!this.isDateEditable(date)) {
      this.showCountdownTimerModal(date);
      return;
    }

    const key = this.getCellKey(studentId, date);

    // Close any other open cells
    this.editMode.clear();

    // Open clicked cell
    this.selectedCell = { studentId, date };
    this.editMode.set(key, true);
  }

  /**
   * Close edit mode for a cell
   */
  closeEditMode(studentId: number, date: string): void {
    const key = this.getCellKey(studentId, date);
    this.editMode.delete(key);
    this.selectedCell = null;
  }

  /**
   * Stage attendance update (doesn't save immediately)
   * UPDATED: Additional check to prevent updates for non-today dates
   */
  stageAttendanceUpdate(
    studentId: number,
    date: string,
    newStatus: string,
  ): void {
    // Double-check date is editable
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

    // Validate status
    if (!newStatus || newStatus === "") {
      this.closeEditMode(studentId, date);
      return;
    }

    if (!["P", "A", "L", "E"].includes(newStatus)) {
      alert("Invalid attendance status");
      return;
    }

    // Get subject ID
    const subjectId = this.selectedSubjects.get(date);
    if (!subjectId) {
      alert("Please select a subject for this date");
      this.closeEditMode(studentId, date);
      return;
    }

    const key = this.getCellKey(studentId, date);

    // Add to pending updates
    this.pendingUpdates.set(key, {
      studentId,
      date,
      status: newStatus,
      subjectId,
    });

    this.hasUnsavedChanges = true;
    this.closeEditMode(studentId, date);
  }

  /**
   * Submit all pending updates
   */
  submitAllChanges(): void {
    if (this.pendingUpdates.size === 0) {
      alert("No changes to submit");
      return;
    }

    // Verify all pending updates are for today
    let hasInvalidDates = false;
    this.pendingUpdates.forEach((update) => {
      if (!this.isDateEditable(update.date)) {
        hasInvalidDates = true;
      }
    });

    if (hasInvalidDates) {
      Swal.fire({
        title: "Invalid Updates",
        text: "Some updates are for dates other than today. Only today's attendance can be updated.",
        icon: "error",
        draggable: true,
      });
      return;
    }

    if (!confirm(`Submit ${this.pendingUpdates.size} attendance update(s)?`)) {
      return;
    }

    this.submitting = true;

    const updates: any[] = [];

    this.pendingUpdates.forEach((update) => {
      updates.push({
        student_id: update.studentId,
        teacher_id: 1, // TODO: Get from auth service
        subject_id: update.subjectId,
        attendance_date: update.date,
        status: update.status,
      });
    });

    // Create array of observables for each update
    const updateObservables = updates.map((data) =>
      this.attendanceService.createOrUpdateAttendance(data),
    );

    // Execute all updates
    forkJoin(updateObservables)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          // Clear pending updates
          this.pendingUpdates.clear();
          this.hasUnsavedChanges = false;

          // Reload grid to show updated data
          this.loadWeeklyGrid();

          Swal.fire({
            title: "Attendance updated successfully!",
            icon: "success",
            draggable: true,
          });
        },
        error: (err) => {
          console.error("Failed to update attendance:", err);
          Swal.fire({
            title: "Failed to update attendance!",
            text:
              err.error?.message ||
              "Failed to update attendance. Please try again.",
            icon: "error",
            draggable: true,
          });
        },
      });
  }

  // Pagination methods
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

  /**
   * Cancel all pending changes
   */
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

  /**
   * Remove a specific pending update
   */
  removePendingUpdate(studentId: number, date: string): void {
    const key = this.getCellKey(studentId, date);
    this.pendingUpdates.delete(key);

    if (this.pendingUpdates.size === 0) {
      this.hasUnsavedChanges = false;
    }
  }

  /**
   * Show detailed subject attendance for a specific day
   */
  showAttendanceDetail(student: StudentRow, date: string): void {
    this.detailModalData = {
      student: student,
      date: date,
      subjects: student.subject_attendance?.[date]?.subjects || [],
    };
    this.showDetailModal = true;
  }

  /**
   * Close detail modal
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailModalData = {};
  }

  /**
   * Check if a date has multiple subjects with absences
   */
  hasMultipleSubjectRecords(student: StudentRow, date: string): boolean {
    const subjects = student.subject_attendance?.[date]?.subjects || [];
    return subjects.length > 1;
  }

  /**
   * Get count of absent subjects for a specific date
   */
  getAbsentSubjectCount(student: StudentRow, date: string): number {
    const subjects = student.subject_attendance?.[date]?.subjects || [];
    return subjects.filter((s) => s.status === "A").length;
  }

  /**
   * Get formatted date display (Day Month/Date)
   */
  getDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}\n${month}/${dateNum}`;
  }

  /**
   * Export attendance data to Excel
   */
  exportToExcel(): void {
    const url = `${environment.apiUrl}/attendance/export/weekly-excel?start_date=${this.startDate}&end_date=${this.endDate}&class_id=${this.selectedClassId}`;
    window.open(url, "_blank");
  }

  /**
   * Legacy support for cached templates
   */
  exportToCSV(): void {
    this.exportToExcel();
  }

  /**
   * Print attendance grid
   */
  print(): void {
    window.print();
  }

  /**
   * Navigate to previous week
   */
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

  /**
   * Navigate to next week
   */
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

  /**
   * Get gender icon class
   */
  getGenderIconClass(gender: string): string {
    return gender === "M"
      ? "bi bi-gender-male text-primary"
      : "bi bi-gender-female text-danger";
  }

  /**
   * Get attendance cell title
   * UPDATED: Show different messages for non-editable dates
   */
  getCellTitle(dateString: string, student: StudentRow): string {
    // Check if date is editable first
    if (!this.isDateEditable(dateString)) {
      if (this.isPastDate(dateString)) {
        return "Past date - Click to see time remaining";
      } else if (this.isFutureDate(dateString)) {
        return "Future date - Click to see countdown";
      }
    }

    const key = this.getCellKey(student.student_id, dateString);

    // Check for pending update first
    if (this.pendingUpdates.has(key)) {
      return "Pending change - click to edit or submit to save";
    }

    const subjectData = student.subject_attendance?.[dateString];
    if (
      !subjectData ||
      !subjectData.subjects ||
      subjectData.subjects.length === 0
    ) {
      return "Click to edit";
    }

    if (subjectData.subjects.length === 1) {
      return subjectData.subjects[0].notes || "Click to edit";
    }

    // Multiple subjects - show count
    const absentCount = subjectData.subjects.filter(
      (s) => s.status === "A",
    ).length;
    if (absentCount > 0) {
      return `Absent in ${absentCount}/${subjectData.subjects.length} subjects. Click for details.`;
    }

    return `${subjectData.subjects.length} subjects recorded. Click for details.`;
  }

  /**
   * Get color class based on attendance rate
   */
  getAttendanceRateColor(rate: string | null | undefined): string {
    if (!rate) return "text-muted";
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum)) return "text-muted";
    if (rateNum >= 90) return "text-success";
    if (rateNum >= 75) return "text-warning";
    return "text-danger";
  }

  /**
   * Refresh current data
   */
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

  /**
   * Reset to current week
   */
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