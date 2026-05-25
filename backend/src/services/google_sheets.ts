import axios from 'axios';

export interface BatchMetadata {
  batch: string;
  group: string;
  subject: string;
  totalStudents: number;
}

export class GoogleSheetsService {
  /**
   * Fetches student strengths from a configured Google Sheet.
   * Format of target sheet columns: Batch,Group,Subject,Total Students
   * Uses direct CSV export URL to bypass complex authentication for publicly readable sheets.
   */
  public static async fetchStudentStrengths(spreadsheetId: string): Promise<BatchMetadata[]> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      console.log(`Fetching Google Sheet data from: ${url}`);
      
      const response = await axios.get(url);
      const csvData = response.data;
      
      if (!csvData || typeof csvData !== 'string') {
        throw new Error('Invalid response from Google Sheets');
      }

      return this.parseCsv(csvData);
    } catch (e: any) {
      console.error('Failed to fetch from Google Sheets:', e.message || e);
      return []; // Return empty array to trigger fallback behavior
    }
  }

  private static parseCsv(csvText: string): BatchMetadata[] {
    const list: BatchMetadata[] = [];
    const lines = csvText.split(/\r?\n/);
    
    if (lines.length <= 1) return list;

    // Skip header line (assumed: Batch,Group,Subject,Total Students)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV parsing (no complex quotes support needed for basic numbers)
      const parts = line.split(',');
      if (parts.length >= 4) {
        const batch = parts[0].trim();
        const group = parts[1].trim();
        const subject = parts[2].trim();
        const totalStudents = parseInt(parts[3].trim(), 10);

        if (batch && !isNaN(totalStudents)) {
          list.push({ batch, group, subject, totalStudents });
        }
      }
    }

    return list;
  }
}
