import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'en' | 'kh';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangStr = localStorage.getItem('app_lang') as Language || 'en';
  
  // Signal for reactive UI updates (Angular 16+)
  currentLang = signal<Language>(this.currentLangStr);

  private translations: Record<string, Record<Language, string>> = {
    // General / Actions
    'WEEKLY_ATTENDANCE_GRID': {
      en: 'Weekly Attendance Grid',
      kh: 'តារាងវត្តមានប្រចាំសប្តាហ៍'
    },
    'SUBMIT_CHANGES': {
      en: 'Submit Changes',
      kh: 'រក្សាទុកការផ្លាស់ប្តូរ'
    },
    'CANCEL': {
      en: 'Cancel',
      kh: 'បោះបង់'
    },
    'REFRESH': {
      en: 'Refresh',
      kh: 'ផ្ទុកឡើងវិញ'
    },
    'EXPORT_EXCEL': {
      en: 'Export Excel',
      kh: 'ទាញយក Excel'
    },
    'SEARCH_PLACEHOLDER': {
      en: 'Search by name or ID...',
      kh: 'ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ...'
    },
    'FOUND_STUDENTS': {
      en: 'Found',
      kh: 'រកឃើញ' // Context: Found X students
    },
    'MATCHING': {
      en: 'matching',
      kh: 'ដែលត្រូវគ្នា'
    },
    'BACK_TO_DASHBOARD': {
      en: 'Back to Dashboard',
      kh: 'ត្រឡប់ទៅផ្ទាំងដើម'
    },
    
    // Filters
    'CLASS': {
      en: 'Class',
      kh: 'ថ្នាក់'
    },
    'START_DATE': {
      en: 'Start Date',
      kh: 'ថ្ងៃចាប់ផ្តើម'
    },
    'END_DATE': {
      en: 'End Date',
      kh: 'ថ្ងៃបញ្ចប់'
    },
    'RESET_CURRENT': {
      en: 'Reset Current',
      kh: 'សប្តាហ៍បច្ចុប្បន្ន'
    },
    'PREVIOUS_WEEK': {
      en: 'Previous week',
      kh: 'សប្តាហ៍មុន'
    },
    'NEXT_WEEK': {
      en: 'Next week',
      kh: 'សប្តាហ៍បន្ទាប់'
    },

    // Table Headers
    'NAME_KHMER': {
      en: 'Name (Khmer)',
      kh: 'ឈ្មោះ (ខ្មែរ)'
    },
    'NAME_ENGLISH': {
      en: 'Name (English)',
      kh: 'ឈ្មោះ (ឡាតាំង)'
    },
    'SEX': {
      en: 'Sex',
      kh: 'ភេទ'
    },
    'TOTALS': {
      en: 'Totals',
      kh: 'សរុប'
    },

    // Status
    'PRESENT': {
      en: 'Present',
      kh: 'វត្តមាន'
    },
    'ABSENT': {
      en: 'Absent',
      kh: 'អវត្តមាន'
    },
    'LATE': {
      en: 'Late',
      kh: 'យឺត'
    },
    'EXCUSED': {
      en: 'Excused',
      kh: 'ច្បាប់'
    },
    'RATE': {
      en: 'Rate',
      kh: 'អត្រា'
    },

    // Bulk Selection
    'BULK_SELECTION_MODE': {
      en: 'Bulk Selection Mode',
      kh: 'ការជ្រើសរើសជាក្រុម'
    },
    'MARK_AS': {
      en: 'Mark As',
      kh: 'ដាក់ជា'
    },
    'SELECT_ALL': {
      en: 'Select All',
      kh: 'ជ្រើសរើសទាំងអស់'
    },
    'DESELECT_ALL': {
      en: 'Deselect All',
      kh: 'ដោះការជ្រើសរើស'
    },
    'APPLY_TO_SELECTED': {
      en: 'Apply to Selected',
      kh: 'អនុវត្តទៅអ្នកដែលបានជ្រើសរើស'
    },
    'SELECTED': {
      en: 'Selected',
      kh: 'បានជ្រើសរើស'
    },
    'QUICK_ACTION': {
      en: 'Quick Action',
      kh: 'សកម្មភាពរហ័ស'
    },
    'CLEAR_SELECTION': {
      en: 'Clear Selection',
      kh: 'សម្អាតការជ្រើសរើស'
    },
    'APPLIES_TO_TODAY': {
      en: 'Applies to Today',
      kh: 'សម្រាប់ថ្ងៃនេះ'
    },
    
    // Summary Cards
    'TOTAL_STUDENTS': {
      en: 'Total Students',
      kh: 'សិស្សសរុប'
    },
    'TOTAL_PRESENT_DAYS': {
      en: 'Total Present Days',
      kh: 'ថ្ងៃវត្តមានសរុប'
    },
    'TOTAL_ABSENT_DAYS': {
      en: 'Total Absent Days',
      kh: 'ថ្ងៃអវត្តមានសរុប'
    },
    'ATTENDANCE_RATE': {
      en: 'Attendance Rate',
      kh: 'អត្រាវត្តមាន'
    },

    // Messages / Modals
    'ATTENDANCE_EDITING_TIMER': {
      en: 'Attendance Editing Timer',
      kh: 'ពេលវេលាកំណត់វត្តមាន'
    },
    'CLOSE': {
      en: 'Close',
      kh: 'បិទ'
    },
    'GO_TO_TODAY': {
      en: 'Go to Today',
      kh: 'ទៅកាន់ថ្ងៃនេះ'
    },
    'UNSAVED_CHANGES': {
      en: 'You have',
      kh: 'អ្នកមាន'
    },
    'UNSAVED_CHANGES_COUNT': {
      en: 'unsaved change(s)',
      kh: 'ការផ្លាស់ប្តូរដែលមិនទាន់រក្សាទុក'
    },
    'LEGEND': {
        en: 'Legend',
        kh: 'កំណត់សម្គាល់'
    },
    'VIEW_SUBJECT_DETAILS': {
        en: 'View subject details',
        kh: 'មើលព័ត៌មានលម្អិត'
    },
    
    // Alerts / Validations
    'NO_SUBJECTS': {
      en: 'No Subjects',
      kh: 'គ្មានមុខវិជ្ជា'
    },
    'NO_SUBJECTS_MSG': {
      en: 'No subjects found for this date.',
      kh: 'មិនមានមុខវិជ្ជាសម្រាប់កាលបរិច្ឆេទនេះទេ។'
    },
    'NO_STUDENTS_SELECTED': {
      en: 'No Students Selected',
      kh: 'មិនមានសិស្សត្រូវបានជ្រើសរើស'
    },
    'PLEASE_SELECT_ONE_STUDENT': {
      en: 'Please select at least one student.',
      kh: 'សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់។'
    },
    'NO_SUBJECT_SELECTED': {
      en: 'No Subject Selected',
      kh: 'មិនមានមុខវិជ្ជាត្រូវបានជ្រើសរើស'
    },
    'PLEASE_SELECT_SUBJECT': {
      en: 'Please select a subject for this date.',
      kh: 'សូមជ្រើសរើសមុខវិជ្ជាសម្រាប់កាលបរិច្ឆេទនេះ។'
    },
    'CONFIRM_BULK_UPDATE': {
      en: 'Confirm Bulk Update',
      kh: 'បញ្ជាក់ការផ្លាស់ប្តូរជាក្រុម'
    },
    'BULK_UPDATE_STAGED': {
      en: 'Bulk Update Staged',
      kh: 'ការផ្លាស់ប្តូរត្រូវបានត្រៀមទុក'
    },
    'CLICK_SUBMIT_TO_SAVE': {
      en: 'Click "Submit Changes" to save.',
      kh: 'ចុច "រក្សាទុកការផ្លាស់ប្តូរ" ដើម្បីរក្សាទុក។'
    },
    'INVALID_DATE': {
      en: 'Invalid Date',
      kh: 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ'
    },
    'ONLY_TODAY_EDIT': {
      en: 'You can only update attendance for today.',
      kh: 'អ្នកអាចធ្វើបច្ចុប្បន្នភាពវត្តមានសម្រាប់តែថ្ងៃនេះប៉ុណ្ណោះ។'
    },
    'NO_CHANGES': {
      en: 'No Changes',
      kh: 'គ្មានការផ្លាស់ប្តូរ'
    },
    'NO_CHANGES_SUBMIT': {
      en: 'No changes to submit',
      kh: 'គ្មានការផ្លាស់ប្តូរដើម្បីបញ្ជូន'
    },
    'SUCCESS': {
      en: 'Success!',
      kh: 'ជោគជ័យ!'
    },
    'ATTENDANCE_UPDATED': {
      en: 'attendance record(s) updated successfully!',
      kh: 'កំណត់ត្រាវត្តមានត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!'
    },
    'SUBMISSION_FAILED': {
      en: 'Submission Failed',
      kh: 'ការបញ្ជូនបរាជ័យ'
    },
    'FAILED_UPDATE': {
      en: 'Failed to update attendance. Please try again.',
      kh: 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពវត្តមាន. សូមព្យាយាមម្តងទៀត.'
    },
    'ARE_YOU_SURE': {
      en: 'Are you sure?',
      kh: 'តើអ្នកប្រាកដទេ?'
    },

    // --- SIDEBAR & LAYOUT ---
    'DASHBOARD': {
        en: 'Dashboard',
        kh: 'ផ្ទាំងគ្រប់គ្រង'
    },
    'STUDENTS': {
        en: 'Students',
        kh: 'សិស្ស'
    },
    'TEACHERS': {
        en: 'Teachers',
        kh: 'គ្រូបង្រៀន'
    },
    'ATTENDANCE': {
        en: 'Attendance',
        kh: 'វត្តមាន'
    },
    'CLASSES': {
        en: 'Classes',
        kh: 'ថ្នាក់រៀន'
    },
    'SUBJECTS': {
        en: 'Subjects',
        kh: 'មុខវិជ្ជា'
    },
    'LOGOUT': {
        en: 'Logout',
        kh: 'ចាកចេញ'
    },
    'ATTENDANCE_SYSTEM': {
        en: 'Attendance Management System',
        kh: 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន'
    },

    // --- DASHBOARD ---
    'OVERVIEW': {
        en: 'Overview',
        kh: 'ទិដ្ឋភាពទូទៅ'
    },
    'REAL_TIME_MONITORING': {
        en: 'Real-time attendance monitoring and analytics',
        kh: 'ការតាមដានវត្តមាននិងការវិភាគតាមពេលវេលាជាក់ស្តែង'
    },
    'REFRESH_STATUS': {
        en: 'Refresh Status',
        kh: 'ធ្វើឱ្យស្ថានភាពថ្មី'
    },
    'LOADING_DASHBOARD': {
        en: 'Loading dashboard...',
        kh: 'កំពុងផ្ទុកផ្ទាំងគ្រប់គ្រង...'
    },
    'PRESENT_TODAY': {
        en: 'Present Today',
        kh: 'វត្តមានថ្ងៃនេះ'
    },
    'ABSENT_TODAY': {
        en: 'Absent Today',
        kh: 'អវត្តមានថ្ងៃនេះ'
    },
    'LATE_TODAY': {
        en: 'Late Today',
        kh: 'យឺតថ្ងៃនេះ'
    },
    'EXCUSED_TODAY': {
        en: 'Excused Today',
        kh: 'ច្បាប់ថ្ងៃនេះ'
    },
    'TARDY_STUDENTS': {
        en: 'Tardy Students',
        kh: 'សិស្សមកយឺត'
    },
    'WITH_PERMISSION': {
        en: 'With Permission',
        kh: 'មានការអនុញ្ញាត'
    },
    'ATTENDANCE_TRENDS': {
        en: 'Attendance Trends',
        kh: 'និន្នាការវត្តមាន'
    },
    'TODAY': {
        en: 'Today',
        kh: 'ថ្ងៃនេះ'
    },
    'THIS_WEEK': {
        en: 'This Week',
        kh: 'សប្តាហ៍នេះ'
    },
    'THIS_MONTH': {
        en: 'This Month',
        kh: 'ខែនេះ'
    },
    'TODAYS_SUMMARY': {
        en: 'Today\'s Summary',
        kh: 'សង្ខេបថ្ងៃនេះ'
    },
    'STUDENTS_AT_RISK': {
        en: 'Students at Risk',
        kh: 'សិស្សដែលមានហានិភ័យ'
    },
    'NO_RISK_STUDENTS': {
        en: 'No students at risk. Great job!',
        kh: 'គ្មានសិស្សមានហានិភ័យទេ។ ល្អណាស់!'
    },
    'RECENT_ABSENCES': {
        en: 'Recent Absences',
        kh: 'អវត្តមានថ្មីៗ'
    },
    'NO_RECENT_ABSENCES': {
        en: 'No recent absences',
        kh: 'គ្មានអវត្តមានថ្មីៗទេ'
    },
    'DAYS': {
        en: 'days',
        kh: 'ថ្ងៃ'
    },
    'DISCARD_CHANGES_MSG': {
      en: 'Discard unsaved changes?',
      kh: 'បោះបង់ការផ្លាស់ប្តូរដែលមិនទាន់រក្សាទុក?'
    },
    'CANCELLED': {
      en: 'Cancelled!',
      kh: 'បានបោះបង់!'
    },
    'CHANGES_CANCELLED': {
      en: 'Your changes have been cancelled.',
      kh: 'ការផ្លាស់ប្តូររបស់អ្នកត្រូវបានបោះបង់។'
    },
    'NO_SUBJECT_SCHEDULED': {
      en: 'No Subject Scheduled',
      kh: 'គ្មានមុខវិជ្ជាត្រូវបានគ្រោងទុក'
    },
    'NO_SUBJECT_SCHEDULED_MSG': {
      en: 'There are no subjects scheduled for',
      kh: 'មិនមានមុខវិជ្ជាត្រូវបានគ្រោងទុកសម្រាប់'
    },
    // --- NOTIFICATION STORAGE ---
    'NOTIFICATION_STORAGE': {
      en: 'Notification Storage',
      kh: 'ការរក្សាទុកការជូនដំណឹង'
    },
    'WEEKLY_TOTAL': {
      en: 'Weekly Total',
      kh: 'សរុបសប្តាហ៍'
    },
    'WEEKLY_PRESENT': {
      en: 'Weekly Present',
      kh: 'វត្តមានសប្តាហ៍'
    },
    'WEEKLY_ABSENT': {
      en: 'Weekly Absent',
      kh: 'អវត្តមានសប្តាហ៍'
    },
    'WEEKLY_LATE': {
      en: 'Weekly Late',
      kh: 'យឺតសប្តាហ៍'
    },
    'MONTHLY_TOTAL': {
      en: 'Monthly Total',
      kh: 'សរុបខែ'
    },
    'MONTHLY_PRESENT': {
      en: 'Monthly Present',
      kh: 'វត្តមានខែ'
    },
    'MONTHLY_ABSENT': {
      en: 'Monthly Absent',
      kh: 'អវត្តមានខែ'
    },
    'MONTHLY_LATE': {
      en: 'Monthly Late',
      kh: 'យឺតខែ'
    }
  };

  constructor() { }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem('app_lang', lang);
  }

  getTranslation(key: string): string {
    const lang = this.currentLang();
    const translation = this.translations[key];
    if (translation) {
      return translation[lang] || translation['en'] || key;
    }
    return key;
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang() === 'en' ? 'kh' : 'en');
  }
}
