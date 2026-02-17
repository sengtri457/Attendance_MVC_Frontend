import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HttpClient } from '@angular/common/http';
import { KHMER_FONT_BASE64 } from './khmer-font';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private http: HttpClient) {}

  private async loadFont(doc: jsPDF) {
    const fontName = 'KhmerOSbattambang';
    const fontFile = 'KhmerOSbattambang.ttf';

    try {
      if (KHMER_FONT_BASE64 && KHMER_FONT_BASE64.length > 100) {
          // Add font to VFS using embedded base64
          doc.addFileToVFS(fontFile, KHMER_FONT_BASE64);
          // Add font to PDF
          doc.addFont(fontFile, fontName, 'normal');
          // Set font
          doc.setFont(fontName);
          console.log('Khmer font loaded successfully from embedded source');
      } else {
          console.error('Embedded font data is invalid or empty');
          doc.setFont('helvetica');
      }
    } catch (error) {
      console.warn('Could not load embedded Khmer font.', error);
      // Fallback to standard font
      doc.setFont('helvetica');
    }
  }

  async generateWeeklyAttendancePDF(data: any) {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Load font before drawing anything
    await this.loadFont(doc);

    // Header Info
    const className = data.class?.class_name || data.class?.class_code || 'Unknown Class';
    const startDate = data.period?.start_date || 'N/A';
    const endDate = data.period?.end_date || 'N/A';

    // Title Section
    doc.setFontSize(18);
    doc.text('Weekly Attendance Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Class: ${className}`, 14, 30);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 36);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 200, 36);

    // Prepare table columns
    const dates = data.period?.dates || [];
    const columns = [
      { header: '#', dataKey: 'no' },
      { header: 'Name (KH)', dataKey: 'name_kh' },
      { header: 'Name (EN)', dataKey: 'name_en' },
      { header: 'Sex', dataKey: 'sex' },
      ...dates.map((date: string) => ({ 
        header: this.formatDate(date), 
        dataKey: date 
      })),
      { header: 'Total (P/A/L/E)', dataKey: 'stats' },
      { header: '%', dataKey: 'rate' }
    ];

    // Prepare table body
    const students = data.students || [];
    const body = students.map((student: any, index: number) => {
      const row: any = {
        no: index + 1,
        name_kh: student.student_name_kh || '',
        name_en: student.student_name_eng || '',
        sex: student.gender || '',
        stats: `${student.statistics?.present || 0}/${student.statistics?.absent || 0}/${student.statistics?.late || 0}/${student.statistics?.excused || 0}`,
        rate: student.statistics?.attendance_rate || '0%'
      };

      // Fill attendance data
      dates.forEach((date: string) => {
        const subjects = student.subject_attendance?.[date]?.subjects || [];
        if (subjects.length > 0) {
          // Join status of all subjects for that day
          const statuses = subjects.map((s: any) => s.status).join(', ');
          row[date] = statuses || '-';
        } else {
          row[date] = '-';
        }
      });

      return row;
    });

    // Generate Table
    autoTable(doc, {
      head: [columns.map(c => c.header)],
      body: body.map((row: any) => columns.map(c => row[c.dataKey])),
      startY: 45,
      styles: {
        font: 'helvetica', // Default to standard font for English/Numbers
        fontSize: 9,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // #
        1: { cellWidth: 35, font: 'KhmerOSbattambang' }, // Name KH - USE KHMER FONT
        2: { cellWidth: 35 }, // Name EN
        3: { cellWidth: 15, halign: 'center' }, // Sex
        // Dynamic date columns will auto-size
        [columns.length - 2]: { cellWidth: 25, halign: 'center' }, // Stats
        [columns.length - 1]: { cellWidth: 15, halign: 'center' }  // Rate
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didParseCell: (data) => {
        // Color coding for status cells
        if (data.section === 'body' && data.column.index >= 4 && data.column.index < columns.length - 2) {
          const text = data.cell.text[0];
          if (text && text.includes('A')) {
            data.cell.styles.textColor = [220, 53, 69]; // Red
          } else if (text && text.includes('P')) {
            data.cell.styles.textColor = [25, 135, 84]; // Green
          } else if (text && text.includes('L')) {
            data.cell.styles.textColor = [255, 193, 7]; // Yellow/Orange
          }
        }
      }
    });

    // Summary Statistics
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const stats = data.overall_statistics || {};
    
    doc.setFontSize(14);
    doc.text('Summary', 14, finalY);
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${stats.total_students || 0}`, 14, finalY + 8);
    doc.text(`Total Present: ${stats.present || 0}`, 60, finalY + 8);
    doc.text(`Total Absent: ${stats.absent || 0}`, 100, finalY + 8);
    doc.text(`Overall Attendance Rate: ${stats.attendance_rate || '0%'}`, 140, finalY + 8);

    // Save
    doc.save(`Weekly_Attendance_${className}_${startDate}.pdf`);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
}
