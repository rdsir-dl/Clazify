jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => {
  return {
    getDocument: jest.fn(),
  };
});

import { PdfParser, TextBounds } from '../src/parser/pdf_parser';

describe('PdfParser Unit Tests (Proximity & Heuristics)', () => {
  
  // Helper to construct a mock TextItem
  function createMockItem(str: string, x: number, yRaw: number, width: number, height: number): any {
    return {
      str,
      width,
      height,
      transform: [1, 0, 0, 1, x, yRaw], // transform[4] is x, transform[5] is raw y (measured from bottom)
    };
  }

  it('should group fragments into lines and sort top-to-bottom', () => {
    const pageHeight = 800;
    // Y-up: 700 is near the top of the page. Y-down: 800 - (700 + 10) = 90.
    // Y-up: 600 is lower. Y-down: 800 - (600 + 10) = 190.
    const mockItems = [
      createMockItem('World', 150, 700, 50, 10),
      createMockItem('Hello', 80, 700, 50, 10),
      createMockItem('Line 2', 80, 600, 60, 10),
    ];

    const lines = (PdfParser as any).extractTextLines(mockItems, pageHeight);

    expect(lines.length).toBe(2);
    // Hello should be before World due to left-to-right sorting in the same line
    expect(lines[0].text).toBe('Hello World');
    expect(lines[0].bounds.left).toBe(80);
    expect(lines[0].bounds.right).toBe(200); // 150 + 50
    expect(lines[0].bounds.top).toBe(90); // 800 - (700 + 10)

    expect(lines[1].text).toBe('Line 2');
    expect(lines[1].bounds.top).toBe(190); // 800 - (600 + 10)
  });

  it('should correctly identify weekday headers', () => {
    expect((PdfParser as any).isDay('Monday')).toBe(true);
    expect((PdfParser as any).isDay('mon')).toBe(true);
    expect((PdfParser as any).isDay('Mo')).toBe(true);
    expect((PdfParser as any).isDay('Tuesday')).toBe(true);
    expect((PdfParser as any).isDay('NotADay')).toBe(false);
  });

  it('should correctly identify time ranges', () => {
    expect((PdfParser as any).isTimeRange('09:00 - 09:50')).toBe(true);
    expect((PdfParser as any).isTimeRange('10:00-10:50')).toBe(true);
    expect((PdfParser as any).isTimeRange('930-1020')).toBe(true);
    expect((PdfParser as any).isTimeRange('1110-1200')).toBe(true);
    expect((PdfParser as any).isTimeRange('Timetable generated: 05-12-2025')).toBe(false);
  });

  it('should normalize day text correctly', () => {
    expect((PdfParser as any).normalizeDay('mo')).toBe('Monday');
    expect((PdfParser as any).normalizeDay('Tue')).toBe('Tuesday');
    expect((PdfParser as any).normalizeDay('wednesday')).toBe('Wednesday');
    expect((PdfParser as any).normalizeDay('th')).toBe('Thursday');
    expect((PdfParser as any).normalizeDay('Fri')).toBe('Friday');
    expect((PdfParser as any).normalizeDay('sa')).toBe('Saturday');
    expect((PdfParser as any).normalizeDay('su')).toBe('Sunday');
  });

  it('should parse fuzzy time ranges including PM shifts', () => {
    // 09:00 - 09:50 AM
    const range1 = (PdfParser as any).parseTimeRange('900 - 950');
    expect(range1).not.toBeNull();
    expect(range1.start).toEqual({ hour: 9, minute: 0 });
    expect(range1.end).toEqual({ hour: 9, minute: 50 });

    // 2:30 - 3:20 PM (Shifted by 12 hours since hour < 7)
    const range2 = (PdfParser as any).parseTimeRange('230 - 320');
    expect(range2).not.toBeNull();
    expect(range2.start).toEqual({ hour: 14, minute: 30 });
    expect(range2.end).toEqual({ hour: 15, minute: 20 });

    // 12:00 - 12:50 PM (Not shifted since 12 >= 7)
    const range3 = (PdfParser as any).parseTimeRange('1200 - 1250');
    expect(range3).not.toBeNull();
    expect(range3.start).toEqual({ hour: 12, minute: 0 });
    expect(range3.end).toEqual({ hour: 12, minute: 50 });
  });

  it('should parse individual cell contents into subject, room, batch, and group', () => {
    // Standard format: Line 1 = Subject + Room, Line 2 = Batch, Line 3 = Group
    const text1 = 'Java Programming CVR311R\nBE-CSE-5D\nGroup 1';
    const content1 = (PdfParser as any).parseCellContent(text1);
    expect(content1.subject).toBe('Java Programming');
    expect(content1.room).toBe('CVR311R');
    expect(content1.batch).toBe('BE-CSE-5D');
    expect(content1.group).toBe('Group 1');

    // Without group
    const text2 = 'DMS RJ310R\nBCA-3A';
    const content2 = (PdfParser as any).parseCellContent(text2);
    expect(content2.subject).toBe('DMS');
    expect(content2.room).toBe('RJ310R');
    expect(content2.batch).toBe('BCA-3A');
    expect(content2.group).toBe('');
  });
});
