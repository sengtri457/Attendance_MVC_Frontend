import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { WeeklyGridData, StudentRow } from '../models/WeeklyAttendance.model';
import { Subject } from '../models/Subject.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceExportService {

  constructor() { }

  async exportSummaryReport(gridData: WeeklyGridData, startDate: string, className: string): Promise<void> {
    if (!gridData) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // --- Header Section ---
    worksheet.mergeCells('B1:G3');
    const titleCell = worksheet.getCell('B1');
    titleCell.value = 'វិទ្យាស្ថានសេតិច (SETEC INSTITUTE)';
    titleCell.font = { name: 'Khmer OS Muol Light', family: 2, size: 20, bold: true, color: { argb: 'FF2E7D32' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Logo Logic
    try {
      // Attempt to load logo from assets (assumes logo.png exists in public/ or src/assets/)
      const logoResponse = await fetch('/assets/image.png');
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png',
        });
        // Place logo in A1:A2 (roughly)
        worksheet.addImage(logoId, {
          tl: { col: 0.2, row: 0.2 } as any, 
          ext: { width: 40, height: 40 }
        });
      }
    } catch (error) {
      console.warn('Could not load logo for export', error);
    }

    worksheet.addRow([]);

    // --- Table Headers ---
    const headerDetails = ['No', 'StudentName', 'Gender', 'TotalA', 'TotalP', 'Status', 'Class'];
    const headerRow = worksheet.addRow(headerDetails);
    
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // --- Data Rows ---
    const students = gridData.students;
    const startDataRow = 5; 

    students.forEach((student, index) => {
      const status = 'RS'; // Placeholder

      const row = worksheet.addRow([
        index + 1,
        student.student_name_kh || student.student_name_eng,
        student.gender,
        student.statistics.absent, 
        student.statistics.present, 
        status,
        gridData?.class.class_name || gridData?.class.class_code || className || 'Unknown Class'
      ]);

      row.eachCell((cell, colNumber) => {
        if (colNumber === 2) { 
             cell.alignment = { vertical: 'middle', horizontal: 'left' };
             cell.font = { name: 'Khmer OS Battambang', size: 11 };
        } else {
             cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // --- Grand Total Row ---
    const totalRowIndex = startDataRow + students.length;
    const totalRow = worksheet.addRow(['', 'Total', '', '', '', '', '']);
    
    const nameCell = totalRow.getCell(2);
    nameCell.font = { color: { argb: 'FF4472C4' }, bold: true, size: 14 };
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (students.length > 0) {
        const lastDataRow = totalRowIndex - 1;
        
        const totalACell = totalRow.getCell(4);
        totalACell.value = { formula: `SUM(D${startDataRow}:D${lastDataRow})` };
        totalACell.font = { color: { argb: 'FF4472C4' }, bold: true, size: 14 };
        totalACell.alignment = { horizontal: 'center', vertical: 'middle' };

        const totalPCell = totalRow.getCell(5);
        totalPCell.value = { formula: `SUM(E${startDataRow}:E${lastDataRow})` };
        totalPCell.font = { color: { argb: 'FF4472C4' }, bold: true, size: 14 };
        totalPCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // --- Column Widths ---
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 25;
    worksheet.getColumn(3).width = 8;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 10;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Attendance_Summary_${gridData.class.class_name}_${startDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  }

  async exportDetailedReport(
    gridData: WeeklyGridData, 
    startDate: string, 
    endDate: string,
    subjectsMap: Map<string, Subject[]>,
    className: string
  ): Promise<void> {
    if (!gridData) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Grid');

    // --- Title Section ---
    worksheet.mergeCells('A1:J2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Weekly Attendance Grid';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.mergeCells('A3:J3');
    const subtitleCell = worksheet.getCell('A3');
    subtitleCell.value = `${gridData.class.class_name || gridData.class.class_code || className || 'Class'} | ${gridData.period.start_date} to ${gridData.period.end_date}`;
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.font = { name: 'Arial', size: 12 };

    // Logo Logic
    try {
        const logoResponse = await fetch('/assets/logo.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const logoId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
            });
            // Place logo near title if possible, or floating
            worksheet.addImage(logoId, {
            tl: { col: 0.2, row: 0.2 } as any,
            ext: { width: 100, height: 100 }
            });
        }
    } catch (error) {
        console.warn('Could not load logo for export', error);
    }

    worksheet.addRow([]);

    const dates = gridData.period.dates;
    const fixedHeaders = ['No', 'Name (Khmer)', 'Name (English)', 'Gender'];
    let colIndex = fixedHeaders.length + 1;

    const headerRow1 = worksheet.getRow(5);
    const headerRow2 = worksheet.getRow(6);

    fixedHeaders.forEach((text, i) => {
        const cell = headerRow1.getCell(i + 1);
        cell.value = text;
        worksheet.mergeCells(5, i + 1, 6, i + 1);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    dates.forEach(date => {
        const subjects = subjectsMap.get(date) || [];
        const colSpan = subjects.length || 1;
        
        const startCol = colIndex;
        const endCol = colIndex + colSpan - 1;
        
        const dateCell = headerRow1.getCell(startCol);
        dateCell.value = this.getFormattedDate(date);
        dateCell.font = { bold: true };
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        for(let c = startCol; c <= endCol; c++) {
            const cell = headerRow1.getCell(c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        if (colSpan > 1) {
            worksheet.mergeCells(5, startCol, 5, endCol);
        }

        if (subjects.length > 0) {
            subjects.forEach((subj, idx) => {
                const subCell = headerRow2.getCell(startCol + idx);
                subCell.value = subj.subject_code || (subj.subject_name.slice(0, 3).toUpperCase());
                subCell.font = { size: 9 };
                subCell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
                 subCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        } else {
             const subCell = headerRow2.getCell(startCol);
             subCell.value = '-';
             subCell.alignment = { horizontal: 'center', vertical: 'middle' };
             subCell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }
        
        colIndex += colSpan;
    });

    const statHeaders = ['P', 'A', 'L', 'E', 'Rate %'];
    statHeaders.forEach((text, i) => {
        const cell = headerRow1.getCell(colIndex + i);
        cell.value = text;
        worksheet.mergeCells(5, colIndex + i, 6, colIndex + i);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    const startDataRow = 7;
    let currentRow = startDataRow;

    gridData.students.forEach((student, sIdx) => {
        const row = worksheet.getRow(currentRow);
        
        row.getCell(1).value = sIdx + 1;
        row.getCell(2).value = student.student_name_kh;
        row.getCell(3).value = student.student_name_eng;
        row.getCell(4).value = student.gender;
        
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'left' };
        row.getCell(2).font = { name: 'Khmer OS Battambang', size: 10 };
        row.getCell(3).alignment = { horizontal: 'left' };
        row.getCell(4).alignment = { horizontal: 'center' };

        let colDataIndex = 5;
        dates.forEach(date => {
            const subjects = subjectsMap.get(date) || [];
            
            if (subjects.length > 0) {
                subjects.forEach(subj => {
                    const status = this.getSubjectStatus(student, date, subj.subject_id);
                    const cell = row.getCell(colDataIndex);
                    cell.value = status ? this.getStatusSymbol(status) : '';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    
                    if (status === 'A') cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                    else if (status === 'P') cell.font = { color: { argb: 'FF008000' } };
                    else if (status === 'L') cell.font = { color: { argb: 'FFFFA500' } };
                    
                    colDataIndex++;
                });
            } else {
                 row.getCell(colDataIndex).value = '-';
                 row.getCell(colDataIndex).alignment = { horizontal: 'center', vertical: 'middle' };
                 colDataIndex++;
            }
        });

        row.getCell(colDataIndex).value = student.statistics.present;
        row.getCell(colDataIndex + 1).value = student.statistics.absent;
        row.getCell(colDataIndex + 2).value = student.statistics.late;
        row.getCell(colDataIndex + 3).value = student.statistics.excused;
        row.getCell(colDataIndex + 4).value = student.statistics.attendance_rate;
        
        const totalCols = colDataIndex + 4;
        for (let c = 1; c <= totalCols; c++) {
            row.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        currentRow++;
    });

    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 8;
    for(let i=5; i < colIndex; i++) {
        worksheet.getColumn(i).width = 5;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Weekly_Detailed_${gridData.class.class_name}_${startDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  }

  // Helpers
  private getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }

  private getSubjectStatus(student: StudentRow, date: string, subjectId: number): string | null {
    const dailyRecords = student.subject_attendance?.[date];
    if (!dailyRecords || !dailyRecords.subjects) return null;
    
    const record = dailyRecords.subjects.find(s => s.subject_id === subjectId);
    return record?.status || null;
  }

  private getStatusSymbol(status: string): string {
    switch (status) {
      case 'P': return '✓';
      case 'A': return 'A';
      case 'L': return 'L';
      case 'E': return 'E';
      default: return status || '';
    }
  }
}
