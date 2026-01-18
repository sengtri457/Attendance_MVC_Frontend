import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeeklyattendanceComponent } from './weeklyattendance.component';

describe('WeeklyattendanceComponent', () => {
  let component: WeeklyattendanceComponent;
  let fixture: ComponentFixture<WeeklyattendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklyattendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeeklyattendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
