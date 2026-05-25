// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { pathToFileURL } from 'url';

// @ts-ignore
const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
// @ts-ignore
if (pdfjsLib.GlobalWorkerOptions) {
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
}


export interface TextBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TextLine {
  text: string;
  bounds: TextBounds;
}

export interface TimetableEntry {
  subject: string;
  room: string;
  batch: string;
  group: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface ParsedTime {
  hour: number;
  minute: number;
}

interface ParsedContent {
  subject: string;
  room: string;
  batch: string;
  group: string;
}

export class PdfParser {
  /**
   * Main entry point for extracting the timetable.
   * @param pdfBuffer The PDF file as a Buffer
   * @param trainerName Name of the trainer/teacher to search for
   */
  public static async extractTimetable(pdfBuffer: Buffer, trainerName: string): Promise<TimetableEntry[]> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;
    const entries: TimetableEntry[] = [];

    try {
      const numPages = document.numPages;
      for (let i = 1; i <= numPages; i++) {
        const page = await document.getPage(i);
        const textContent = await page.getTextContent();
        
        // 1. Check if page contains trainer name (case-insensitive, trimmed)
        const pageText = textContent.items
          .filter((item: any) => item.str !== undefined)
          .map((item: any) => item.str)
          .join(' ');

        if (!pageText.toLowerCase().includes(trainerName.trim().toLowerCase())) {
          continue;
        }

        // 2. Extract Text Lines with text and bounds (Normalized to Y-down)
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        const lines = this.extractTextLines(textContent.items, pageHeight);

        // 3. Identify Grid Headers (Time and Days)
        const timeHeaders: TextLine[] = [];
        const dayHeaders: TextLine[] = [];

        for (const line of lines) {
          const text = line.text.trim();
          if (this.isDay(text)) {
            dayHeaders.push(line);
          } else if (this.isTimeRange(text)) {
            timeHeaders.push(line);
          }
        }

        // Process grid if headers exist
        if (timeHeaders.length > 0 && dayHeaders.length > 0) {
          // Sort headers:
          // X-position left-to-right for times
          timeHeaders.sort((a, b) => a.bounds.left - b.bounds.left);
          // Y-position top-to-bottom (ascending Y-down) for days
          dayHeaders.sort((a, b) => a.bounds.top - b.bounds.top);

          // CONTENT-FIRST APPROACH: Extract content, then match to headers
          const contentLines = lines.filter((line) => {
            const text = line.text.trim();
            // Check if this line is in headers
            const isInTime = timeHeaders.some(h => h.text === line.text);
            const isInDay = dayHeaders.some(h => h.text === line.text);
            
            return !isInTime &&
                   !isInDay &&
                   !text.includes('Teacher') &&
                   !text.includes('Timetable generated') &&
                   !text.includes('School of') &&
                   !/^\d+$/.test(text); // Exclude lecture numbers
          });

          // Group content by cell (same day + overlapping time column)
          const cellGroups: { [key: string]: TextLine[] } = {};
          let lastAssignedKey: string | null = null;

          for (const line of contentLines) {
            // Find nearest day header (by Y distance)
            let nearestDay: TextLine | null = null;
            let minDayDist = Infinity;
            for (const day of dayHeaders) {
              const dist = Math.abs(line.bounds.top - day.bounds.top);
              if (dist < minDayDist) {
                minDayDist = dist;
                nearestDay = day;
              }
            }

            // Find nearest time header (by X distance to line's LEFT edge)
            let nearestTime: TextLine | null = null;
            let minTimeDist = Infinity;
            for (const time of timeHeaders) {
              const dist = Math.abs(line.bounds.left - time.bounds.left);
              if (dist < minTimeDist) {
                minTimeDist = dist;
                nearestTime = time;
              }
            }

            let key: string | null = null;
            if (nearestDay && nearestTime) {
              key = `${nearestDay.text}_${nearestTime.text}`;
            }

            // Fix for "Group" lines: Associate with previous batch/subject if closely following
            if (line.text.trim().startsWith('Group') && lastAssignedKey !== null) {
              key = lastAssignedKey;
            }

            if (key) {
              if (!cellGroups[key]) {
                cellGroups[key] = [];
              }
              cellGroups[key].push(line);
              lastAssignedKey = key;
            }
          }

          // Process each cell group
          for (const [key, cellLines] of Object.entries(cellGroups)) {
            const parts = key.split('_');
            const dayText = parts[0];
            const timeText = parts[1];

            // Sort lines by Y position (top to bottom)
            cellLines.sort((a, b) => a.bounds.top - b.bounds.top);

            // Combine cell text
            const cellText = cellLines.map(l => l.text.trim()).join('\n');

            // Parse cell content
            const parsed = this.parseCellContent(cellText);

            if (parsed.subject || parsed.batch) {
              const timeRange = this.parseTimeRange(timeText);
              if (timeRange) {
                // Detect merged cells by checking content span
                const contentRightEdge = Math.max(...cellLines.map(l => l.bounds.right));

                // Find current time header index
                const currentTimeHeader = timeHeaders.find(h => h.text === timeText)!;
                const currentTimeIdx = timeHeaders.indexOf(currentTimeHeader);

                // Get next column position
                const currentRight = currentTimeHeader.bounds.right;
                const nextColumnLeft = (currentTimeIdx + 1 < timeHeaders.length)
                  ? timeHeaders[currentTimeIdx + 1].bounds.left
                  : currentRight + 100;

                // Merged if content extends significantly into next column
                const columnGap = nextColumnLeft - currentRight;
                const isMergedCell = contentRightEdge > (currentRight + columnGap * 0.5);
                const durationMinutes = isMergedCell ? 100 : 50;

                // Calculate end time
                const end = this.addMinutes(timeRange.start, durationMinutes);

                entries.push({
                  day: this.normalizeDay(dayText),
                  startTime: this.formatTime(timeRange.start),
                  endTime: this.formatTime(end),
                  subject: parsed.subject,
                  room: parsed.room,
                  batch: parsed.batch,
                  group: parsed.group,
                });
              }
            }
          }

          // Stop processing after finding trainer's page
          if (entries.length > 0) {
            break;
          }
        }
      }
    } catch (e) {
      console.error('Parsing Error:', e);
      throw e;
    }

    return entries;
  }

  /**
   * Groups character/word fragments into cohesive lines.
   */
  private static extractTextLines(items: any[], pageHeight: number): TextLine[] {
    const linesMap: { yCenter: number; items: any[] }[] = [];
    const tolerance = 5; // Pixels tolerance to group items into the same line

    for (const item of items) {
      if (item.str === undefined || item.str.trim() === '') {
        continue;
      }

      // Convert coordinates to standard Y-down
      const left = item.transform[4];
      const top = pageHeight - (item.transform[5] + item.height);
      const width = item.width;
      const height = item.height;
      const right = left + width;
      const bottom = top + height;
      const yCenter = top + height / 2;

      // Find an existing line close to this Y center
      let foundLine = linesMap.find(line => Math.abs(line.yCenter - yCenter) < tolerance);

      if (foundLine) {
        foundLine.items.push({ item, left, top, right, bottom, width, height });
      } else {
        linesMap.push({
          yCenter,
          items: [{ item, left, top, right, bottom, width, height }],
        });
      }
    }

    // Convert groups to TextLine and sort items left-to-right
    const textLines: TextLine[] = linesMap.map(lineGroup => {
      // Sort items by left coordinate
      lineGroup.items.sort((a, b) => a.left - b.left);

      // Concatenate strings with smart spacing
      const text = lineGroup.items.map(i => i.item.str).join(' ');

      // Compute bounding box of the entire line
      const left = Math.min(...lineGroup.items.map(i => i.left));
      const right = Math.max(...lineGroup.items.map(i => i.right));
      const top = Math.min(...lineGroup.items.map(i => i.top));
      const bottom = Math.max(...lineGroup.items.map(i => i.bottom));

      return {
        text,
        bounds: {
          left,
          top,
          right,
          bottom,
          width: right - left,
          height: bottom - top,
        },
      };
    });

    // Sort lines top-to-bottom
    textLines.sort((a, b) => a.bounds.top - b.bounds.top);
    return textLines;
  }

  private static isDay(text: string): boolean {
    const days = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
      'mo', 'tu', 'we', 'th', 'fr', 'sa', 'su',
    ];
    const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
    return days.includes(cleanText);
  }

  private static isTimeRange(text: string): boolean {
    const timePart = '(\\d{1,2}:\\d{2}|\\d{1,2}|\\d{3,4})';
    const pattern = `^${timePart}\\s*-\\s*${timePart}$`;
    return new RegExp(pattern).test(text.trim());
  }

  private static normalizeDay(raw: string): string {
    const lower = raw.trim().toLowerCase();
    if (lower.startsWith('mo')) return 'Monday';
    if (lower.startsWith('tu')) return 'Tuesday';
    if (lower.startsWith('we')) return 'Wednesday';
    if (lower.startsWith('th')) return 'Thursday';
    if (lower.startsWith('fr')) return 'Friday';
    if (lower.startsWith('sa')) return 'Saturday';
    if (lower.startsWith('su')) return 'Sunday';
    return raw;
  }

  private static parseTimeRange(text: string): { start: ParsedTime; end: ParsedTime } | null {
    const clean = text.replace(/[^0-9\-]/g, '');
    const parts = clean.split('-');
    if (parts.length !== 2) return null;

    const start = this.parseFuzzyTime(parts[0]);
    const end = this.parseFuzzyTime(parts[1]);

    if (start && end) {
      // PM adjustment: If hour is < 7, assume PM (e.g. 2:30 -> 14:30)
      const sH = start.hour + (start.hour < 7 ? 12 : 0);
      const eH = end.hour + (end.hour < 7 ? 12 : 0);

      return {
        start: { hour: sH, minute: start.minute },
        end: { hour: eH, minute: end.minute },
      };
    }
    return null;
  }

  private static parseFuzzyTime(raw: string): ParsedTime | null {
    if (!raw) return null;
    const val = parseInt(raw, 10);
    if (isNaN(val)) return null;

    let hour = 0;
    let minute = 0;

    if (raw.length >= 3) {
      minute = val % 100;
      hour = Math.floor(val / 100);
    } else {
      hour = val;
      minute = 0;
    }

    return { hour, minute };
  }

  private static parseCellContent(text: string): ParsedContent {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    let batch = '';
    let room = '';
    let subject = '';
    let group = '';

    for (const line of lines) {
      if (line.includes('Group')) {
        group = line;
      } else if (line.includes('-') && !line.includes(' ')) {
        batch = line;
      } else {
        // Room regex: matches word character sequence like CL03, CVR311R, RJ310R, etc.
        const roomMatch = /\b([A-Z]{1,4}\d{1,4}R?)\b/.exec(line);
        if (roomMatch) {
          room = roomMatch[0];
          let sub = line.substring(0, roomMatch.index).trim();
          if (!sub && roomMatch.index + room.length < line.length) {
            sub = line.substring(roomMatch.index + room.length).trim();
          }
          subject = (subject + ' ' + sub).trim();
        } else {
          subject = (subject + ' ' + line).trim();
        }
      }
    }

    return { subject, room, batch, group };
  }

  private static addMinutes(time: ParsedTime, mins: number): ParsedTime {
    let m = time.minute + mins;
    let h = time.hour + Math.floor(m / 60);
    m = m % 60;
    h = h % 24;
    return { hour: h, minute: m };
  }

  private static formatTime(time: ParsedTime): string {
    const hh = time.hour.toString().padStart(2, '0');
    const mm = time.minute.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
