import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subjectservice/subject.service';
import { TeacherService } from '../../../services/teacherservice/teacher.service';
import { Class } from '../../../models/Class.model';
import { Subject } from '../../../models/Subject.model';
import { Teacher } from '../../../models/Teacher.model';

@Component({
  selector: 'app-assign-subject',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assign-subject.component.html',
  styleUrls: ['./assign-subject.component.css']
})
export class AssignSubjectComponent implements OnInit {
  assignForm: FormGroup;
  classes: Class[] = [];
  subjects: Subject[] = [];
  teachers: Teacher[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';

  daysOfWeek = [
    { id: 0, name: 'Sunday' },
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' }
  ];

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private subjectService: SubjectService,
    private teacherService: TeacherService
  ) {
    this.assignForm = this.fb.group({
      class_id: ['', Validators.required],
      subject_id: ['', Validators.required],
      teacher_id: [''],
      day_of_week: ['', Validators.required],
      start_time: [''],
      end_time: [''],
      room_number: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.classService.getAllClasses({ limit: 100 }).subscribe({
      next: (res) => this.classes = res.data,
      error: (err) => console.error('Error fetching classes', err)
    });

    this.subjectService.getAllSubjects({ limit: 100 }).subscribe({
      next: (res) => this.subjects = res.data,
      error: (err) => console.error('Error fetching subjects', err)
    });

    this.teacherService.getAllTeachers({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.data && res.data.teachers) {
            this.teachers = res.data.teachers;
        } else if (Array.isArray(res.data)) { // Fallback if API changed
            this.teachers = res.data;
        }
      },
      error: (err) => console.error('Error fetching teachers', err)
    });
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    
    if (this.assignForm.valid) {
      this.loading = true;
      this.subjectService.assignSubjectToClass(this.assignForm.value).subscribe({
        next: (res) => {
           this.successMessage = 'Subject assigned successfully!';
           this.loading = false;
           this.assignForm.reset();
           // Keep the form mostly cleared but maybe user wants to add another for same class?
           // For now, full reset.
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to assign subject';
          this.loading = false;
        }
      });
    } else {
        this.errorMessage = 'Please fill in all required fields.';
    }
  }
}
