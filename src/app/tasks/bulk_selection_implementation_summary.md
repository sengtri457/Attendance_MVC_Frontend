# Task Summary: Implement Weekly Attendance Bulk Selection

## Overview
Implemented a global checkbox selection functionality for the weekly attendance grid. This allows the user to select multiple students across rows and apply attendance status (Present, Absent, etc.) for the current day (or selected date) in bulk.

## Changes

### 1. Component Logic (`weeklyattendance.component.ts`)
- Added `globalSelectedStudents` (Set<number>) to track selected student IDs.
- Added `toggleGlobalStudentSelection` and `toggleGlobalSelectAll` methods.
- Added `applyGlobalBulkAction` method to mark selected students with a specific status.
- Changed `todayDate` to public to fix template access.

### 2. Template (`weeklyattendance.component.html`)
- Added a **new Sticky Checkbox Column** at the beginning of the table.
  - Header: Master checkbox to select all visible students.
  - Rows: Individual checkbox for each student.
- Added a **Global Bulk Actions Toolbar** that appears above the table when students are selected.
  - Shows count of selected students.
  - Quick action buttons (Mark Present, Mark Absent).
  - "More" dropdown for Late/Excused.
  - Clear selection button.
- Adjusted table footer `colspan` to accommodate the new column.

### 3. Styling (`weeklyattendance.component.css`)
- Added `.col-select` class for the new sticky column.
- **Crucial**: Shifted the `left` positions of all subsequent sticky columns (`.col-no`, `.col-name-kh`, `.col-name-eng`, `.col-gender`) by 30px to maintain correct alignment.

## User Experience
- **Discovery**: Users can now clearly see checkboxes for every student, making row selection intuitive.
- **Efficiency**: Users can check specific students and then click "Mark Present" once, instead of clicking individual cells.
- **Safety**: Includes confirmation dialogs and validates that the date is editable (defaults to Today).
- **Consistency**: Retains the existing "Date-first" bulk selection mode (via gear icon) as an alternative/complementary workflow.
